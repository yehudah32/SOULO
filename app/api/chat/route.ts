import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT_V2, STAGE_FORMAT_RULES, DEFIANT_SPIRIT_RAG_CONTEXT } from '@/lib/system-prompt-v2';
import { validateAssessmentResponse } from '@/lib/response-validator';
import { compressHistory } from '@/lib/history-compressor';
import { getSession, setSession } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';
import { parseAIResponse } from '@/lib/parse-response';
import { queryKnowledgeBase } from '@/lib/rag';
import { getQuestionBank, updateQuestionYield, type Question } from '@/lib/question-bank';
import { supervisorCheck } from '@/lib/supervisor';
import { runPostAssessmentEvaluation } from '@/lib/evaluator';
import { selectTritype, CENTER_MAP } from '@/lib/enneagram-lines';
import { findPairForTypes, getTopTwoTypes } from '@/lib/differentiation-pairs';
import { scoreResponse, hasTypeSignatures } from '@/lib/vector-scorer';
import type { SessionData } from '@/lib/session-store';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Confidence Gate ──
// Enforces 0.85 confidence threshold for close type pairs before allowing completion.
function evaluateConfidenceGate(
  session: SessionData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finalInternal: any
): { isComplete: boolean; clarificationState: SessionData['clarificationState'] } {
  if (session.isComplete) {
    return { isComplete: true, clarificationState: session.clarificationState };
  }

  const closeNext = finalInternal?.conversation?.close_next === true;
  const confidence = finalInternal?.hypothesis?.confidence ?? 0;
  const typeScores = finalInternal?.hypothesis?.type_scores ?? {};

  // Not closing yet — check if active clarification should end
  if (!closeNext) {
    if (session.clarificationState?.active) {
      if (confidence >= 0.85) {
        console.log('[confidence-gate] Confidence reached 0.85 during clarification — releasing gate');
        return {
          isComplete: false,
          clarificationState: { ...session.clarificationState, active: false },
        };
      }
      if (session.clarificationState.questionsAsked >= session.clarificationState.maxQuestions) {
        console.log('[confidence-gate] Max clarification questions reached — releasing gate with low-confidence flag');
        return {
          isComplete: false,
          clarificationState: {
            ...session.clarificationState,
            active: false,
            completedWithLowConfidence: true,
          },
        };
      }
    }
    return { isComplete: false, clarificationState: session.clarificationState };
  }

  // AI says close_next = true — evaluate the gate
  if (confidence >= 0.85) {
    return { isComplete: true, clarificationState: session.clarificationState };
  }

  // Low confidence — check if types are close
  const { first, second, gap } = getTopTwoTypes(typeScores);

  // Clear leader (gap > 15 points) — allow completion
  if (gap > 15) {
    console.log(`[confidence-gate] Gap ${gap} > 15 — allowing completion despite ${Math.round(confidence * 100)}% confidence`);
    return { isComplete: true, clarificationState: session.clarificationState };
  }

  // Already in clarification and maxed out? Allow completion.
  if (session.clarificationState?.active &&
      session.clarificationState.questionsAsked >= session.clarificationState.maxQuestions) {
    console.log('[confidence-gate] Clarification maxed out — allowing completion with low-confidence flag');
    return {
      isComplete: true,
      clarificationState: {
        ...session.clarificationState,
        active: false,
        completedWithLowConfidence: true,
      },
    };
  }

  // BLOCK completion — enter clarification mode
  const pair = findPairForTypes(first, second);
  const maxQ = pair ? Math.min(pair.questions.length, 4) : 3;
  console.log(`[confidence-gate] BLOCKING completion — confidence ${Math.round(confidence * 100)}%, gap ${gap}, pair ${first}v${second}, entering clarification (max ${maxQ} questions)`);

  return {
    isComplete: false,
    clarificationState: {
      active: true,
      pair: [first, second],
      pairKey: pair?.key ?? `${first}v${second}`,
      questionsAsked: session.clarificationState?.questionsAsked ?? 0,
      maxQuestions: maxQ,
      confidenceAtEntry: confidence,
      completedWithLowConfidence: false,
    },
  };
}

function getMaxTokens(stage: number, format?: string): number {
  // INTERNAL block alone can be 1500+ tokens — minimum must accommodate it + RESPONSE
  if (format === 'paragraph_select') return 2048;
  if (stage <= 2) return 2048;
  if (stage <= 4) return 2048;
  if (stage <= 6) return 2048;
  return 2048;
}

function deriveStage(exchangeCount: number): number {
  if (exchangeCount <= 2) return 1;
  if (exchangeCount <= 4) return 2;
  if (exchangeCount <= 6) return 3;
  if (exchangeCount <= 8) return 4;
  if (exchangeCount <= 10) return 5;
  if (exchangeCount <= 12) return 6;
  return 7;
}

function getAllowedFormats(stage: number): string {
  if (stage <= 2) return 'forced_choice, agree_disagree';
  if (stage <= 4) return 'agree_disagree, scale, frequency';
  if (stage <= 6) return 'behavioral_anchor, paragraph_select, scenario';
  return 'open';
}

// Extracted helper — performs all session update + Supabase persist + evaluator logic
// Called from both streaming and non-streaming paths
async function updateSessionFromParsed(
  session: ReturnType<typeof getSession>,
  sessionId: string,
  parsed: { internal: ReturnType<typeof parseAIResponse>['internal']; response: string },
  stage: number,
  lastFormat: string,
  latestUserMessage: { role: string; content: string },
  supervisorResult: { score: number; approved: boolean; issues: string[]; correction: string }
): Promise<{ progressSaved: boolean }> {
  if (!session) return { progressSaved: false };

  const { internal: finalInternal, response: finalResponse } = parsed;

  const updatedDomainSignals: string[] =
    finalInternal?.defiant_spirit?.domain_signals?.length
      ? finalInternal.defiant_spirit.domain_signals
      : session.domainSignals;

  // Confidence gate — may block completion and enter clarification mode
  const gateResult = evaluateConfidenceGate(session, finalInternal);
  const isComplete = gateResult.isComplete;

  const newLastFormat: string =
    finalInternal?.conversation?.last_question_format ??
    finalInternal?.strategy?.question_format_last_used ??
    lastFormat;
  const supervisorScores = [...(session.supervisorScores ?? []), supervisorResult.score];
  const selectedQuestionId: number | null = finalInternal?.selected_question_id ?? null;

  // Track question asked this turn for yield optimization
  const allQuestionsAsked = [...(session.allQuestionsAsked || [])];
  if (selectedQuestionId && selectedQuestionId > 0) {
    allQuestionsAsked.push({
      exchange: session.exchangeCount + 1,
      questionId: selectedQuestionId,
      questionText: ((finalInternal as Record<string, unknown>)?.response_parts as Record<string, unknown>)?.question_text as string || '',
    });
  }

  // Calculate tritype from type_scores using center-based algorithm (one per center)
  // Do NOT trust the AI's tritype — it may use top-3 overall instead of top-per-center
  const rawScores = finalInternal?.hypothesis?.type_scores ?? {};
  const numericScores: Record<number, number> = {};
  for (const [k, v] of Object.entries(rawScores)) {
    numericScores[Number(k)] = v as number;
  }
  const computedTritype = Object.keys(numericScores).length >= 3
    ? selectTritype(numericScores)
    : null;
  const tritype: string = computedTritype?.tritype || finalInternal?.hypothesis?.tritype || session.tritype || '';
  const tritypeConfidence: number = finalInternal?.hypothesis?.tritype_confidence ?? session.tritypeConfidence ?? 0;
  const tritypeArchetypeFauvre: string = finalInternal?.hypothesis?.tritype_archetype_fauvre ?? session.tritypeArchetypeFauvre ?? '';
  const tritypeArchetypeDS: string = finalInternal?.hypothesis?.tritype_archetype_ds ?? session.tritypeArchetypeDS ?? '';
  const defiantSpiritTypeName: string = finalInternal?.hypothesis?.defiant_spirit_type_name ?? session.defiantSpiritTypeName ?? '';
  const wholeTypeSignals = finalInternal?.hypothesis?.whole_type_signals ?? session.wholeTypeSignals;
  const rawLexicon = finalInternal?.hypothesis?.lexicon_signals ?? session.lexiconSignals ?? [];
  // Support both legacy flat number[] and enriched object[] formats
  const lexiconSignals: number[] = Array.isArray(rawLexicon)
    ? rawLexicon.map((s: unknown) => typeof s === 'object' && s !== null ? (s as { type: number }).type : s as number)
    : [];

  // Build enriched lexiconContext from structured signals
  let lexiconContext = session.lexiconContext || [];
  if (Array.isArray(rawLexicon) && rawLexicon.length > 0 && typeof rawLexicon[0] === 'object') {
    const newSignals = rawLexicon as Array<{ type: number; words?: string[]; context?: string }>;
    const stage = session.currentStage || 1;
    newSignals.forEach((signal) => {
      lexiconContext.push({
        type: signal.type,
        words: signal.words || [],
        questionContext: signal.context || '',
        stage,
      });
    });
  } else if (Array.isArray(rawLexicon)) {
    const numbers = rawLexicon.filter((n: unknown) => typeof n === 'number') as number[];
    numbers.forEach((typeNum) => {
      const exists = lexiconContext.some((lc) => lc.type === typeNum);
      if (!exists) {
        lexiconContext.push({
          type: typeNum,
          words: [],
          questionContext: 'detected during assessment',
          stage: session.currentStage || 1,
        });
      }
    });
  }

  let resultsData = session.resultsData;
  if (isComplete && !session.isComplete) {
    resultsData = {
      leadingType: finalInternal?.hypothesis?.leading_type ?? 0,
      confidence: finalInternal?.hypothesis?.confidence ?? 0,
      typeScores: finalInternal?.hypothesis?.type_scores ?? {},
      variantSignals: finalInternal?.variant_signals ?? {},
      wingSignals: finalInternal?.wing_signals ?? {},
      tritype,
      tritypeConfidence,
      tritypeArchetypeFauvre,
      tritypeArchetypeDS,
      defiantSpiritTypeName,
      wholeTypeSignals,
      oynDimensions: finalInternal?.oyn_dimensions ?? {},
      defiantSpirit: finalInternal?.defiant_spirit ?? {},
      domainSignals: updatedDomainSignals,
      exchangeCount: session.exchangeCount + 1,
    };
    console.log('[chat] resultsData populated for session:', sessionId);

    adminClient.from('assessment_results').upsert({
      session_id: sessionId,
      user_id: session.userId || null,
      leading_type: finalInternal?.hypothesis?.leading_type ?? 0,
      confidence: finalInternal?.hypothesis?.confidence ?? 0,
      type_scores: finalInternal?.hypothesis?.type_scores ?? {},
      variant_signals: finalInternal?.variant_signals ?? {},
      wing_signals: finalInternal?.wing_signals ?? {},
      tritype,
      tritype_confidence: tritypeConfidence,
      tritype_archetype_fauvre: tritypeArchetypeFauvre,
      tritype_archetype_ds: tritypeArchetypeDS,
      defiant_spirit_type_name: defiantSpiritTypeName,
      whole_type_signals: wholeTypeSignals,
      oyn_dimensions: finalInternal?.oyn_dimensions ?? {},
      defiant_spirit: finalInternal?.defiant_spirit ?? {},
      domain_signals: updatedDomainSignals,
      supervisor_scores: supervisorScores,
      exchange_count: session.exchangeCount + 1,
      current_stage: stage,
    }).then(({ error }) => {
      if (error) console.error('[chat] Supabase persist error:', error.message);
      else console.log('[chat] Results persisted to Supabase:', sessionId);
    });

    // Removed: unconditional updateQuestionYield(selectedQuestionId, true)
    // Yield updates now happen in the evaluator with per-question contribution measurement

    console.log('[evaluator] Post-assessment evaluation triggered for session:', sessionId);
    runPostAssessmentEvaluation(sessionId).catch(() => {});
  }

  // Increment clarification questionsAsked if we were in active clarification this turn
  const updatedClarificationState = gateResult.clarificationState
    ? (session.clarificationState?.active && gateResult.clarificationState.active
        ? { ...gateResult.clarificationState, questionsAsked: gateResult.clarificationState.questionsAsked + 1 }
        : gateResult.clarificationState)
    : null;

  setSession(sessionId, {
    internalState: finalInternal,
    exchangeCount: session.exchangeCount + 1,
    domainSignals: updatedDomainSignals,
    isComplete,
    conversationHistory: [
      ...session.conversationHistory,
      { role: latestUserMessage.role, content: latestUserMessage.content },
      { role: 'assistant', content: finalResponse },
    ],
    lastQuestionFormat: newLastFormat,
    lastScaleRange: finalInternal?.response_parts?.scale_range ?? null,
    supervisorScores,
    currentStage: stage,
    defiantSpiritTypeName,
    tritype,
    tritypeConfidence,
    tritypeArchetypeFauvre,
    tritypeArchetypeDS,
    wholeTypeSignals,
    lexiconSignals,
    lexiconContext,
    resultsData,
    clarificationState: updatedClarificationState,
    allQuestionsAsked,
  });

  // Persist progress to Supabase — fire-and-forget (non-blocking for speed)
  if (session.userId && session.userId.length > 0) {
    const updatedHistory = [
      ...session.conversationHistory,
      { role: latestUserMessage.role, content: latestUserMessage.content },
      { role: 'assistant', content: finalResponse },
    ];
    adminClient.from('assessment_progress').upsert({
      session_id: sessionId,
      user_id: session.userId,
      conversation_history: updatedHistory,
      internal_state: finalInternal,
      exchange_count: session.exchangeCount + 1,
      current_stage: stage,
      last_question_format: newLastFormat,
      is_complete: isComplete,
      updated_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('[chat] Progress persist FAILED:', error.message);
      else console.log('[chat] Progress saved | session:', sessionId);
    });
    return { progressSaved: true };
  }
  return { progressSaved: false };
}

export async function POST(req: NextRequest) {
  const t0 = performance.now();
  try {
    const body = await req.json();
    const { messages, sessionId } = body as {
      messages: Array<{ role: string; content: string }>;
      sessionId: string;
    };

    if (!sessionId || !messages || messages.length === 0) {
      return NextResponse.json({ error: 'Missing sessionId or messages.' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found. Please refresh and start again.' }, { status: 404 });
    }

    const latestUserMessage = messages[messages.length - 1];

    // ── Stage + variables ──
    // Prefer AI's current_stage from INTERNAL, fall back to deriveStage
    const aiStage = session.internalState?.conversation?.current_stage;
    const fallbackStage = deriveStage(session.exchangeCount);
    const prevStage = session.currentStage ?? fallbackStage;
    // AI stage must be valid (1-7), can't go backwards, can't skip more than 1 ahead
    const stage = (typeof aiStage === 'number' && aiStage >= 1 && aiStage <= 7 && aiStage >= prevStage && aiStage <= prevStage + 1)
      ? aiStage
      : fallbackStage;
    const lastStage = prevStage;
    const lastFormat = session.lastQuestionFormat ?? '';
    const leadingType = session.internalState?.hypothesis?.leading_type ?? 0;
    const needsDiff = session.internalState?.hypothesis?.needs_differentiation?.[0]
      ? String(session.internalState.hypothesis.needs_differentiation[0])
      : null;
    const allowedFormats = getAllowedFormats(stage);

    // ── Conversation history compression ──
    const compressed = compressHistory(messages, session.internalState);
    const anthropicMessages: Anthropic.MessageParam[] = compressed.messages as Anthropic.MessageParam[];
    if (compressed.summaryInjected) {
      console.log(`[chat] History compressed: ${messages.length} messages → ${compressed.messages.length} (summary injected)`);
    }

    // ── Parallel RAG + Question Bank ──
    const t1 = performance.now();
    const currentConfidence = session.internalState?.hypothesis?.confidence ?? 0;
    const ragCacheKey = `rag-${leadingType}-${stage}-${Math.floor(currentConfidence * 10)}`;
    const qbCacheKey = `qb-${leadingType}-${stage}`;
    if (!session.ragCache) session.ragCache = {};

    const [ragResults, candidateQuestions] = await Promise.all([
      session.ragCache[ragCacheKey]
        ? Promise.resolve(session.ragCache[ragCacheKey])
        : queryKnowledgeBase(
            leadingType > 0
              ? `Type ${leadingType} ${latestUserMessage.content} Defiant Spirit enneagram`
              : latestUserMessage.content
          )
            .then((result: string) => { session.ragCache[ragCacheKey] = result; return result; })
            .catch(() => ''),
      session.ragCache[qbCacheKey]
        ? Promise.resolve(JSON.parse(session.ragCache[qbCacheKey]) as Question[])
        : getQuestionBank(leadingType, needsDiff, stage, lastFormat, 8)
            .then((result: Question[]) => { session.ragCache[qbCacheKey] = JSON.stringify(result); return result; }),
    ]);
    const t2 = performance.now();

    // ── Build system prompt ──
    const candidateQsBlock = candidateQuestions.length > 0
      ? `\n\nCANDIDATE QUESTIONS FOR THIS TURN (stage ${stage}, allowed formats: ${allowedFormats}):\n` +
        candidateQuestions
          .map((q, i) => `${i + 1}. [ID:${q.id}] [format:${q.format}] [oyn:${q.oyn_dim}] [lens:${q.react_respond_lens}]\n   "${q.question_text}"`)
          .join('\n') +
        `\n\nIf one of these fits your current hypothesis and information needs, use it (rephrase freely to match your voice) and report its ID in selected_question_id. CRITICAL: If you select a candidate question, you MUST use the format specified in its [format:] tag. An agree_disagree question MUST use agree_disagree format. A forced_choice question MUST use forced_choice format. Do NOT change the format of a selected question. If none fit, generate your own and set selected_question_id to null. REMEMBER: only ${allowedFormats} formats are allowed at stage ${stage}.`
      : '';

    // ── Build V2 system prompt: core + stage rules + RAG ──
    const stageRules = STAGE_FORMAT_RULES[stage] || STAGE_FORMAT_RULES[1];
    const ragBlock = ragResults
      ? `\n\nRELEVANT DEFIANT SPIRIT KNOWLEDGE BASE CONTEXT:\n${ragResults}\n\nUse Baruch's voice and framing from this content.`
      : `\n\n${DEFIANT_SPIRIT_RAG_CONTEXT}`;

    let systemPrompt =
      ENNEAGRAM_SYSTEM_PROMPT_V2 +
      `\n\n${stageRules}` +
      ragBlock +
      candidateQsBlock;


    if ((body as { clarifying?: boolean }).clarifying === true) {
      systemPrompt += `\n\nCLARIFYING MODE: The user has reviewed the themes identified from their responses and indicated they feel inaccurate. Your task is to gently probe one more time, asking a short open-ended question that invites correction. Acknowledge their feedback without being defensive. Update your hypothesis accordingly.`;
    }

    // ── Confidence gate: differentiation prompt injection ──
    if (session.clarificationState?.active && session.clarificationState.pair) {
      const diffPair = findPairForTypes(session.clarificationState.pair[0], session.clarificationState.pair[1]);
      const qIdx = session.clarificationState.questionsAsked;
      const remaining = session.clarificationState.maxQuestions - qIdx;

      let diffBlock = `\n\nCONFIDENCE GATE — DIFFERENTIATION MODE ACTIVE:
Your top two type hypotheses (Types ${session.clarificationState.pair[0]} and ${session.clarificationState.pair[1]}) are too close to call with confidence below 85%.
You have ${remaining} question(s) remaining to differentiate between these types.
DO NOT set close_next to true. Focus entirely on distinguishing between these two types.`;

      if (diffPair) {
        diffBlock += `\n\nCORE DISTINCTION: ${diffPair.coreDifference}`;
        if (diffPair.questions[qIdx]) {
          diffBlock += `\n\nSUGGESTED DIFFERENTIATION QUESTION (rephrase naturally in your voice):
"${diffPair.questions[qIdx].text}"
Format: ${diffPair.questions[qIdx].format}`;
          if (diffPair.questions[qIdx].answerOptions) {
            diffBlock += `\nOptions: ${diffPair.questions[qIdx].answerOptions!.join(' | ')}`;
          }
        }
      } else {
        diffBlock += `\n\nNo pre-defined pair data exists for Types ${session.clarificationState.pair[0]} and ${session.clarificationState.pair[1]}. Use your Enneagram expertise to ask a question that targets the specific behavioral or motivational difference between these two types.`;
      }

      systemPrompt += diffBlock;

      // Fire targeted RAG query for this pair
      if (diffPair?.questions[qIdx]?.ragQuery) {
        try {
          const diffRag = await queryKnowledgeBase(diffPair.questions[qIdx].ragQuery);
          if (diffRag) {
            systemPrompt += `\n\nDIFFERENTIATION KNOWLEDGE BASE CONTEXT:\n${diffRag}`;
          }
        } catch { /* non-blocking */ }
      }
    }

    // ── Previous question context — so AI knows what format/scale it used ──
    const prevScaleRange = session.lastScaleRange;
    const prevFormat = session.lastQuestionFormat || 'none';
    systemPrompt += `\n\nPREVIOUS QUESTION CONTEXT:\n- Format used: ${prevFormat}\n- Scale range: ${prevScaleRange ? `${prevScaleRange.min}–${prevScaleRange.max}` : 'N/A'}\n- User answered: "${latestUserMessage.content}"\nWhen commenting on this answer, reference the correct format and range. If the previous format was 'scale' and the range was 1–5, a response of 4 is HIGH. Do not reference values outside the declared range.`;

    // ── Main Claude API call (primary bottleneck) ──
    const t3 = performance.now();
    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: getMaxTokens(stage, session.lastQuestionFormat ?? undefined),
      system: systemPrompt,
      messages: anthropicMessages,
    });
    const t4 = performance.now();

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    const { internal, response } = parseAIResponse(rawText);

    if (!response) {
      console.error('[chat] Empty response after parsing — likely truncated. Raw length:', rawText.length);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    // ── Response Validator — runs BEFORE sending to client ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rp = (internal as any)?.response_parts;
    const isClosing = (internal as any)?.conversation?.close_next === true;
    if (rp) {
      const validation = validateAssessmentResponse(
        rp, response, stage, lastFormat, session.exchangeCount, isClosing
      );
      console.log(`[validator] Score: ${validation.score}/10 | Valid: ${validation.valid} | AutoFixed: ${validation.autoFixed} | Issues: ${validation.issues.map(i => i.rule).join(', ') || 'none'}`);
      if (validation.autoFixed && validation.fixedParts) {
        if (validation.fixedParts.guide_text !== undefined) rp.guide_text = validation.fixedParts.guide_text;
        if (validation.fixedParts.question_text !== undefined) rp.question_text = validation.fixedParts.question_text;
        console.log('[validator] Auto-fix applied — question_text:', (rp.question_text || '').substring(0, 60));
      }
    }

    const finalInternal = internal;
    const finalResponse = response;
    const currentSection: string = internal?.current_section ?? session.internalState?.current_section ?? 'Who You Are';

    // ── Store thinking display ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session.thinkingDisplay = (finalInternal as any)?.thinking_display ?? '';

    // ── Session update (in-memory — fast) ──
    const supervisorDefault = { score: 10, approved: true, issues: [] as string[], correction: '' };
    await updateSessionFromParsed(
      session, sessionId,
      { internal: finalInternal, response: finalResponse },
      stage, lastFormat, latestUserMessage, supervisorDefault
    );

    const updatedSession = getSession(sessionId);
    const isComplete = updatedSession?.isComplete ?? false;
    const updatedDomainSignals = updatedSession?.domainSignals ?? [];
    const resultsData = updatedSession?.resultsData ?? null;

    const t5 = performance.now();

    // ── SEND RESPONSE IMMEDIATELY — everything below is non-blocking ──
    console.log(
      `[chat/timing] Total: ${Math.round(t5 - t0)}ms | RAG+QB: ${Math.round(t2 - t1)}ms | Claude: ${Math.round(t4 - t3)}ms | Session: ${Math.round(t5 - t4)}ms | Messages: ${anthropicMessages.length} | Exchange: ${session.exchangeCount + 1}`
    );

    // ── Fire-and-forget: Shadow mode vector scoring (non-blocking) ──
    Promise.resolve().then(async () => {
      try {
        const signaturesExist = await hasTypeSignatures();
        if (!signaturesExist) return; // Skip if signatures haven't been generated yet

        const currentExchange = session.exchangeCount + 1; // Use updated count, not stale
        const questionId = String(finalInternal?.selected_question_id ?? currentExchange);
        const vectorResult = await scoreResponse(
          latestUserMessage.content,
          questionId,
          session.vectorScores ?? null,
          currentExchange
        );

        // Update session with vector scores for next turn
        setSession(sessionId, {
          vectorScores: vectorResult,
        });

        // Determine agreement
        const claudeTopType = finalInternal?.hypothesis?.leading_type ?? 0;
        const vectorTopType = vectorResult.topTypes[0] ?? 0;
        const claudeCenter = claudeTopType > 0 ? (CENTER_MAP[claudeTopType] ?? '') : '';
        const vectorCenter = vectorTopType > 0 ? (CENTER_MAP[vectorTopType] ?? '') : '';

        const agreement = claudeTopType === vectorTopType;
        const centerAgreement = claudeCenter === vectorCenter;

        // Log to shadow_mode_log table
        adminClient.from('shadow_mode_log').insert({
          session_id: sessionId,
          exchange_number: session.exchangeCount + 1,
          claude_top_type: claudeTopType,
          claude_confidence: finalInternal?.hypothesis?.confidence ?? 0,
          vector_top_type: vectorTopType,
          vector_confidence: vectorResult.confidence,
          vector_center_scores: vectorResult.centerScores,
          vector_type_scores: vectorResult.typeScores,
          agreement,
          center_agreement: centerAgreement,
          phase: vectorResult.phase,
        }).then(({ error: logErr }) => {
          if (logErr) console.error('[shadow-mode] Log error:', logErr.message);
          else console.log(`[shadow-mode] Exchange ${session.exchangeCount + 1}: Claude=Type${claudeTopType} Vector=Type${vectorTopType} | Type agree: ${agreement} | Center agree: ${centerAgreement}`);
        });
      } catch (err) {
        console.error('[shadow-mode] Error:', err);
      }
    });

    // ── Fire-and-forget: Supervisor check (non-blocking) ──
    Promise.resolve().then(async () => {
      try {
        const supervisorResult = await Promise.race([
          supervisorCheck(response, {
            exchangeCount: session.exchangeCount + 1,
            currentStage: stage,
            lastFormat,
            leadingType,
            proposedFormat: internal?.conversation?.last_question_format ?? internal?.strategy?.question_format_last_used ?? '',
          }),
          new Promise<typeof supervisorDefault>((resolve) =>
            setTimeout(() => resolve(supervisorDefault), 3000)
          ),
        ]);
        console.log('[supervisor] Score:', supervisorResult.score, '| Approved:', supervisorResult.approved);
        if (supervisorResult.score < 5) {
          session.supervisorCriticalFailCount = (session.supervisorCriticalFailCount || 0) + 1;
        }
        if (!session.supervisorScores) session.supervisorScores = [];
        session.supervisorScores.push(supervisorResult.score);
      } catch (err) {
        console.error('[supervisor] Background error:', err);
      }
    });

    return NextResponse.json({
      message: finalResponse,
      response: finalResponse,
      internal: finalInternal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_parts: (finalInternal as any)?.response_parts ?? null,
      isComplete,
      domainSignals: updatedDomainSignals,
      currentSection,
      currentStage: stage,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thinking_display: (finalInternal as any)?.thinking_display ?? '',
      progressSaved: !!(session.userId && session.userId.length > 0),
      clarificationActive: updatedSession?.clarificationState?.active ?? false,
      ...(isComplete && resultsData ? { resultsData } : {}),
    });
  } catch (err) {
    console.error('[chat] Error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
