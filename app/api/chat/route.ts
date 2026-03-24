import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { getSession, setSession } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';
import { parseAIResponse } from '@/lib/parse-response';
import { queryKnowledgeBase } from '@/lib/rag';
import { getQuestionBank, updateQuestionYield, type Question } from '@/lib/question-bank';
import { supervisorCheck } from '@/lib/supervisor';
import { runPostAssessmentEvaluation } from '@/lib/evaluator';
import { selectTritype } from '@/lib/enneagram-lines';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  if (exchangeCount <= 5) return 2;
  if (exchangeCount <= 8) return 3;
  if (exchangeCount <= 11) return 4;
  if (exchangeCount <= 13) return 5;
  if (exchangeCount <= 15) return 6;
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

  const isComplete =
    session.isComplete || (finalInternal?.conversation?.close_next === true);

  const newLastFormat: string =
    finalInternal?.conversation?.last_question_format ??
    finalInternal?.strategy?.question_format_last_used ??
    lastFormat;
  const supervisorScores = [...(session.supervisorScores ?? []), supervisorResult.score];
  const selectedQuestionId: number | null = finalInternal?.selected_question_id ?? null;
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

    if (selectedQuestionId !== null) {
      updateQuestionYield(selectedQuestionId, true).catch(() => {});
    }

    console.log('[evaluator] Post-assessment evaluation triggered for session:', sessionId);
    runPostAssessmentEvaluation(sessionId).catch(() => {});
  }

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

    // ── Conversation history windowing ──
    // Send last 10 messages to keep token count flat, plus a summary of earlier context
    const MAX_HISTORY_MESSAGES = 10;
    let anthropicMessages: Anthropic.MessageParam[];
    if (messages.length <= MAX_HISTORY_MESSAGES) {
      anthropicMessages = messages as Anthropic.MessageParam[];
    } else {
      const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
      // Ensure first message is from user (Anthropic requirement)
      if (recentMessages[0].role === 'assistant') {
        recentMessages.shift();
      }
      anthropicMessages = recentMessages as Anthropic.MessageParam[];
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

    let systemPrompt =
      ENNEAGRAM_SYSTEM_PROMPT +
      (ragResults ? `\n\nRELEVANT DEFIANT SPIRIT KNOWLEDGE BASE CONTEXT:\n${ragResults}\n\nThis is Dr. Baruch HaLevi's proprietary work. USE THIS CONTENT AS YOUR PRIMARY SOURCE. When this content covers the topic at hand, use Baruch's exact language, his specific metaphors, his frameworks, his terminology. Do not paraphrase into generic enneagram language. Speak AS Baruch would — his voice, his framing, his logotherapeutic lens. If the retrieved content describes a type pattern, use THAT description, not a generic one.` : '') +
      candidateQsBlock;

    if (stage > lastStage && stage > 1) {
      systemPrompt += `\n\nCRITICAL TRANSITION OVERRIDE: The user has just completed a major stage (moving to stage ${stage}). For this ONE turn, output a "Mirror Moment" — a beautifully crafted short reflection on the patterns you are sensing. Put the ENTIRE reflection in guide_text. Set question_text to an empty string. Set question_format to "open". Leave answer_options as null. The mirror moment lives in the guide zone ABOVE the question card — the question card will be empty/hidden for this turn. Do not end with a question mark. Just reflect.`;
    }

    if ((body as { clarifying?: boolean }).clarifying === true) {
      systemPrompt += `\n\nCLARIFYING MODE: The user has reviewed the themes identified from their responses and indicated they feel inaccurate. Your task is to gently probe one more time, asking a short open-ended question that invites correction. Acknowledge their feedback without being defensive. Update your hypothesis accordingly.`;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
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

    // ── ABSOLUTE RULE: No reflections in question_text, no questions in guide_text ──
    // This is a multi-pass enforcer that guarantees separation before sending to client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rp = (internal as any)?.response_parts;
    if (rp?.question_text) {
      const qt = rp.question_text.trim();

      // Pass 1: No question mark → entire text is commentary
      if (!qt.includes('?')) {
        console.warn('[chat/enforcer] question_text has no question mark — moving ALL to guide_text');
        rp.guide_text = ((rp.guide_text || '') + ' ' + qt).trim();
        rp.question_text = '';
      } else {
        // Pass 2: Split sentences — move non-question sentences to guide_text
        // Split on sentence boundaries (period followed by space/newline)
        const sentences = qt.split(/(?<=[.!])\s+/);
        if (sentences.length > 1) {
          const firstQuestionIdx = sentences.findIndex((s: string) => s.includes('?'));
          if (firstQuestionIdx > 0) {
            const bridgePart = sentences.slice(0, firstQuestionIdx).join(' ');
            const questionPart = sentences.slice(firstQuestionIdx).join(' ');
            console.log('[chat/enforcer] Pass 2: Split bridge from question_text:', bridgePart.substring(0, 60));
            rp.guide_text = ((rp.guide_text || '') + ' ' + bridgePart).trim();
            rp.question_text = questionPart;
          }
        }

        // Pass 3: Pattern-based detection — catch reflection phrases even within question sentences
        // These phrases are NEVER part of a question — they are always commentary/bridge
        const REFLECTION_PATTERNS = [
          /^that('s| is) (interesting|telling|revealing|significant|notable|important)/i,
          /^i notice/i,
          /^i can (see|hear|feel|sense|tell)/i,
          /^(interesting|notable|telling|revealing)\b/i,
          /^(the way|what) you (described|said|shared|mentioned|expressed)/i,
          /^you (said|mentioned|described|shared|noted|expressed)/i,
          /^that (impulse|pull|drive|instinct|pattern|tension|gap|space|hesitation|resistance)/i,
          /^(something|there's something) (in|about) (you|that|what|the way)/i,
          /^(building|based) on (what|that)/i,
          /^that tells me/i,
          /^(owning|carrying|holding|bearing) .{3,30} — that/i,
          /^the fact that you/i,
          /^(so|and|but) you/i,
          /^it (sounds|seems|feels|looks) like/i,
        ];

        const currentQt = (rp.question_text || '').trim();
        if (currentQt) {
          // Check if question_text STARTS with a reflection pattern
          const startsWithReflection = REFLECTION_PATTERNS.some(p => p.test(currentQt));
          if (startsWithReflection) {
            // Find where the actual question starts (first sentence with ?)
            const reSentences = currentQt.split(/(?<=[.!])\s+/);
            const qIdx = reSentences.findIndex((s: string) => s.includes('?'));
            if (qIdx > 0) {
              const reflPart = reSentences.slice(0, qIdx).join(' ');
              const cleanQ = reSentences.slice(qIdx).join(' ');
              console.log('[chat/enforcer] Pass 3: Reflection pattern detected at start:', reflPart.substring(0, 60));
              rp.guide_text = ((rp.guide_text || '') + ' ' + reflPart).trim();
              rp.question_text = cleanQ;
            } else if (qIdx === 0 && reSentences.length === 1) {
              // Single sentence that starts with reflection but contains '?'
              // e.g. "That gap is interesting — when you go out of your way, which is more true?"
              // Split on the em dash or " — " or " – "
              const dashSplit = currentQt.split(/\s*[—–]\s*/);
              if (dashSplit.length >= 2) {
                const lastPart = dashSplit[dashSplit.length - 1];
                if (lastPart.includes('?')) {
                  const reflDash = dashSplit.slice(0, -1).join(' — ');
                  console.log('[chat/enforcer] Pass 3: Dash-split reflection:', reflDash.substring(0, 60));
                  rp.guide_text = ((rp.guide_text || '') + ' ' + reflDash).trim();
                  rp.question_text = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
                }
              }
            }
          }
        }
      }

      // Final log
      if (rp.question_text) {
        console.log('[chat/enforcer] Final question_text:', rp.question_text.substring(0, 80));
        console.log('[chat/enforcer] Final guide_text:', (rp.guide_text || '').substring(0, 80));
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
      ...(isComplete && resultsData ? { resultsData } : {}),
    });
  } catch (err) {
    console.error('[chat] Error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
