import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT_V2, STAGE_FORMAT_RULES, DEFIANT_SPIRIT_RAG_CONTEXT } from '@/lib/system-prompt-v2';
import { validateAssessmentResponse, sanitizeThinkingDisplay } from '@/lib/response-validator';
import { compressHistory } from '@/lib/history-compressor';
import { getSession, setSession } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';
import { parseAIResponse, getResponseParts, looksLikeReasoningLeak, stripReasoningTags } from '@/lib/parse-response';
import { queryKnowledgeBase } from '@/lib/rag';
import { getQuestionBank, updateQuestionYield, type Question } from '@/lib/question-bank';
import { supervisorCheck } from '@/lib/supervisor';
import { runPostAssessmentEvaluation } from '@/lib/evaluator';
import { selectTritype, CENTER_MAP } from '@/lib/enneagram-lines';
import { findPairForTypes, getTopTwoTypes } from '@/lib/differentiation-pairs';
import { scoreResponse, hasTypeSignatures } from '@/lib/vector-scorer';
import { scoreV2, flattenToTypeScores, type QuestionContext as V2QuestionContext, type VectorV2Result } from '@/lib/vector-scorer-v2';
import { detectTiebreakerNeeded } from '@/lib/tiebreakers';
import { getCenterCoverage, allCentersProbed } from '@/lib/center-coverage';
import { evaluatePhaseTransition } from '@/lib/phase-manager';
import { selectNextQuestion, selectTier2Question, formatQuestionResponse, getTransitionText } from '@/lib/decision-tree';
import type { SessionData } from '@/lib/session-store';

// Feature flag: hybrid vector+LLM assessment with reverse shadow mode
// When true: early phases use vector scoring, Claude checkpoint at handoff,
// then Claude handles differentiation. Logs agreement/disagreement for review.
// When false: Claude handles 100% of the assessment.
//
// VECTOR_MODE controls deployment posture for the embedding scorer:
//   'off'    — pure Claude, no vector at all
//   'shadow' — Claude is primary; vector v2 runs after each turn for logging
//              and validation only. SAFE DEFAULT.
//   'hybrid' — vector in front of Claude (the original HYBRID_MODE_ENABLED
//              behavior). Requires vector v2 to have been validated against
//              shadow logs first.
// Must match the flag in chat/init/route.ts.
type VectorMode = 'off' | 'shadow' | 'hybrid';
const VECTOR_MODE = 'shadow' as VectorMode;
const HYBRID_MODE_ENABLED: boolean = VECTOR_MODE === 'hybrid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Variant Signal Normalization ──
// DYN Architecture requires instinct stack to sum to 100% (shared-resource model)
function normalizeVariantSignals(
  signals: { SP: number; SO: number; SX: number } | Record<string, number>
): { SP: number; SO: number; SX: number } {
  const sp = (signals as Record<string, number>).SP ?? 0;
  const so = (signals as Record<string, number>).SO ?? 0;
  const sx = (signals as Record<string, number>).SX ?? 0;
  const total = sp + so + sx;
  if (total === 0) return { SP: 0.33, SO: 0.33, SX: 0.34 }; // Uniform if no data
  return {
    SP: sp / total,
    SO: so / total,
    SX: sx / total,
  };
}

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
  supervisorResult: { score: number; approved: boolean; issues: string[]; correction: string },
  matchedBankQuestion?: Question | null,
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

  // Track question asked this turn for yield optimization AND for Phase 9
  // per-center coverage tracking. The matched bank question (if any) carries
  // target_center; otherwise this is a Claude-generated question and we
  // record null (which the coverage helper treats as 'Cross').
  const allQuestionsAsked = [...(session.allQuestionsAsked || [])];
  if (selectedQuestionId && selectedQuestionId > 0) {
    allQuestionsAsked.push({
      exchange: session.exchangeCount + 1,
      questionId: selectedQuestionId,
      questionText: ((finalInternal as Record<string, unknown>)?.response_parts as Record<string, unknown>)?.question_text as string || '',
      targetCenter: matchedBankQuestion?.target_center ?? null,
    });
  }

  // ── Disconfirmatory gate — detect and track disconfirmatory questions ──
  let disconfirmatoryAsked = session.disconfirmatoryAsked || false;

  if (!disconfirmatoryAsked) {
    const questionFormat = ((finalInternal as Record<string, unknown>)?.response_parts as Record<string, unknown>)?.question_format as string || '';
    const typeScores = finalInternal?.hypothesis?.type_scores ?? {};
    const { first, second, gap } = getTopTwoTypes(typeScores);

    // Wide-gap escape: when the top type is clearly separated from runner-up
    // (gap >= 0.40), no disconfirmatory question is needed — the assessment
    // has already proven the difference. Without this, a clean-winner case
    // can get stuck in the gate forever because no "close race" ever exists
    // for a binary question to qualify against.
    if (gap >= 0.40 && first > 0 && second > 0) {
      disconfirmatoryAsked = true;
      console.log(`[chat] Disconfirmatory gate: AUTO-CLEARED on wide gap ${gap.toFixed(3)} (${first}v${second})`);
    } else {
      // Structural heuristic: any forced_choice or paragraph_select question
      // from exchange 3+ where the top two types are within 0.40 of each other
      // counts as disconfirmatory.
      const isActiveStage = session.exchangeCount >= 3;
      const isBinaryFormat = questionFormat === 'forced_choice' || questionFormat === 'paragraph_select';
      const isCloseRace = gap < 0.40 && first > 0 && second > 0;

      if (isActiveStage && isBinaryFormat && isCloseRace) {
        disconfirmatoryAsked = true;
        console.log(`[chat] Disconfirmatory detected: stage ${stage}, format ${questionFormat}, gap ${gap.toFixed(3)} (${first}v${second})`);
      }
    }
  }

  // ── Disconfirmatory gate enforcement ──
  // If Claude wants to close but no disconfirmatory question was asked, block it
  if (finalInternal?.conversation?.close_next === true && !disconfirmatoryAsked && session.exchangeCount >= 5) {
    finalInternal.conversation.close_next = false;
    console.log(`[chat] Disconfirmatory gate: BLOCKING close — no disconfirmatory question asked yet (exchange ${session.exchangeCount + 1})`);
  }

  // Calculate Whole Type from type_scores using center-based algorithm (one per center)
  // Do NOT trust the AI's tritype field — it may use top-3 overall instead of top-per-center (whole type)
  // Only accept keys that map to a real type 1-9 with a numeric value. This
  // prevents malformed responses (e.g. {"1":x, "2":y, "note":"..."}) from
  // passing the >=3 length check while actually only carrying 2 type scores.
  const rawScores = finalInternal?.hypothesis?.type_scores ?? {};
  const numericScores: Record<number, number> = {};
  for (const [k, v] of Object.entries(rawScores)) {
    const t = Number(k);
    if (Number.isInteger(t) && t >= 1 && t <= 9 && typeof v === 'number' && Number.isFinite(v)) {
      numericScores[t] = v;
    }
  }
  const computedWholeType = Object.keys(numericScores).length >= 3
    ? selectTritype(numericScores)
    : null;
  // Do NOT fall back to session.wholeType — that may be a value from a prior
  // session and would silently deliver the wrong result. If we couldn't compute
  // it from this turn's scores, leave it empty and let the caller decide.
  const wholeType: string = computedWholeType?.tritype || finalInternal?.hypothesis?.tritype || '';
  const wholeTypeConfidence: number = finalInternal?.hypothesis?.tritype_confidence ?? session.wholeTypeConfidence ?? 0;
  const wholeTypeArchetypeFauvre: string = finalInternal?.hypothesis?.tritype_archetype_fauvre ?? session.wholeTypeArchetypeFauvre ?? '';
  const wholeTypeArchetypeDS: string = finalInternal?.hypothesis?.tritype_archetype_ds ?? session.wholeTypeArchetypeDS ?? '';
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
      variantSignals: normalizeVariantSignals(finalInternal?.variant_signals ?? {}),
      wingSignals: finalInternal?.wing_signals ?? {},
      wholeType,
      wholeTypeConfidence,
      wholeTypeArchetypeFauvre,
      wholeTypeArchetypeDS,
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
      variant_signals: normalizeVariantSignals(finalInternal?.variant_signals ?? {}),
      wing_signals: finalInternal?.wing_signals ?? {},
      tritype: wholeType, // Supabase column is 'tritype', TS variable is 'wholeType'
      tritype_confidence: wholeTypeConfidence,
      tritype_archetype_fauvre: wholeTypeArchetypeFauvre,
      tritype_archetype_ds: wholeTypeArchetypeDS,
      defiant_spirit_type_name: defiantSpiritTypeName,
      whole_type_signals: wholeTypeSignals,
      oyn_dimensions: finalInternal?.oyn_dimensions ?? {},
      defiant_spirit: finalInternal?.defiant_spirit ?? {},
      domain_signals: updatedDomainSignals,
      supervisor_scores: supervisorScores,
      exchange_count: session.exchangeCount + 1,
      current_stage: stage,
    }).then(
      ({ error }) => {
        if (error) console.error('[chat] Supabase persist error:', error.message);
        else console.log('[chat] Results persisted to Supabase:', sessionId);
      },
      (err: unknown) => console.error('[chat] Supabase persist threw:', err),
    );

    // Removed: unconditional updateQuestionYield(selectedQuestionId, true)
    // Yield updates now happen in the evaluator with per-question contribution measurement

    console.log('[evaluator] Post-assessment evaluation triggered for session:', sessionId);
    runPostAssessmentEvaluation(sessionId).catch(err => {
      console.error('[evaluator] Post-assessment evaluation failed for session', sessionId, ':', err);
    });
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
    wholeType,
    wholeTypeConfidence,
    wholeTypeArchetypeFauvre,
    wholeTypeArchetypeDS,
    wholeTypeSignals,
    lexiconSignals,
    lexiconContext,
    resultsData,
    clarificationState: updatedClarificationState,
    allQuestionsAsked,
    disconfirmatoryAsked,
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
    }).then(
      ({ error }) => {
        if (error) console.error('[chat] Progress persist FAILED:', error.message);
        else console.log('[chat] Progress saved | session:', sessionId);
      },
      (err: unknown) => console.error('[chat] Progress persist threw:', err),
    );
    return { progressSaved: true };
  }
  return { progressSaved: false };
}

// ── Reverse Shadow Mode: Claude Checkpoint at Vector→LLM Handoff ──
// Runs ONE Claude call to validate the vector system's hypothesis before
// Claude takes over for differentiation. If Claude disagrees, silently
// corrects the hypothesis. Logs everything for manual review.
//
// NOTE: when the checkpoint cannot complete (Claude returns malformed JSON,
// the API errors, etc.) we record the failure to shadow_mode_log with
// phase='checkpoint_failed' so the admin dashboard can surface stuck or
// degraded sessions. We do NOT inject an extra differentiation question
// inline — that path was considered but rejected as too invasive for the
// current request lifecycle. Tracked as a follow-up.
function logCheckpointFailure(
  sessionId: string,
  exchangeNumber: number,
  reason: string,
  vectorTopType: number,
  vectorConfidence: number,
  vectorTypeScores: Record<number, number>,
): void {
  adminClient.from('shadow_mode_log').insert({
    session_id: sessionId,
    exchange_number: exchangeNumber,
    claude_top_type: 0,
    claude_confidence: 0,
    vector_top_type: vectorTopType,
    vector_confidence: vectorConfidence,
    vector_type_scores: vectorTypeScores,
    agreement: false,
    center_agreement: false,
    phase: `checkpoint_failed:${reason}`,
  }).then(
    ({ error }) => {
      if (error) console.error('[reverse-shadow] Failure log error:', error.message);
    },
    (err: unknown) => console.error('[reverse-shadow] Failure log threw:', err),
  );
}

async function runCheckpoint(
  session: SessionData,
  sessionId: string,
  vectorScores: NonNullable<SessionData['vectorScores']>
): Promise<void> {
  const vectorTopType = vectorScores.topTypes[0] ?? 0;
  const vectorConfidence = vectorScores.confidence;
  const history = session.conversationHistory;
  const exchangeNumber = session.exchangeCount + 1;

  if (history.length === 0) return;

  try {
    // Build a minimal prompt — just ask Claude to evaluate the conversation
    const checkpointPrompt = `You are an expert Enneagram assessor. You have observed the following conversation between an assessment system and a person. Based ONLY on what the person has shared, provide your hypothesis.

CONVERSATION:
${history.map(m => `${m.role === 'user' ? 'PERSON' : 'ASSESSOR'}: ${m.content}`).join('\n\n')}

Respond with ONLY a JSON object (no other text):
{"leading_type": <1-9>, "confidence": <0.0-1.0>, "type_scores": {"1":N,"2":N,...,"9":N}}

The type_scores must sum to 1.0. Be honest about your confidence.`;

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: checkpointPrompt }],
    });

    const rawText = result.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[reverse-shadow] Could not parse checkpoint response');
      logCheckpointFailure(sessionId, exchangeNumber, 'no_json_match', vectorTopType, vectorConfidence, vectorScores.typeScores);
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[reverse-shadow] JSON parse failed:', parseErr);
      logCheckpointFailure(sessionId, exchangeNumber, 'json_parse_failed', vectorTopType, vectorConfidence, vectorScores.typeScores);
      return;
    }

    // Validate fields with fallbacks to vector values
    const claudeHypothesis = {
      leading_type: typeof parsed.leading_type === 'number' && parsed.leading_type >= 1 && parsed.leading_type <= 9
        ? parsed.leading_type : vectorTopType,
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence)) : vectorConfidence,
      type_scores: (typeof parsed.type_scores === 'object' && parsed.type_scores !== null)
        ? parsed.type_scores as Record<string, number> : {},
    };

    // Validate type_scores sum AND that we actually have enough numeric type
    // entries to safely build a topTypes list. Fewer than 3 numeric scores
    // would let a "correction" later produce an empty topTypes array, which
    // hands Claude `leading_type: undefined` on the next turn.
    const numericEntries = Object.entries(claudeHypothesis.type_scores)
      .filter(([k, v]) => typeof v === 'number' && !Number.isNaN(Number(k)));
    if (numericEntries.length < 3) {
      console.warn(`[reverse-shadow] Claude returned only ${numericEntries.length} numeric type_scores — keeping vector hypothesis`);
      logCheckpointFailure(sessionId, exchangeNumber, `too_few_scores_${numericEntries.length}`, vectorTopType, vectorConfidence, vectorScores.typeScores);
      return;
    }
    const scoreValues = numericEntries.map(([, v]) => v as number);
    const scoreTotal = scoreValues.reduce((s, v) => s + v, 0);
    if (scoreTotal < 0.5 || scoreTotal > 1.5) {
      console.warn(`[reverse-shadow] Claude type_scores invalid (total: ${scoreTotal}) — keeping vector hypothesis`);
      logCheckpointFailure(sessionId, exchangeNumber, `bad_sum_${scoreTotal.toFixed(2)}`, vectorTopType, vectorConfidence, vectorScores.typeScores);
      return;
    }

    const claudeTopType = claudeHypothesis.leading_type;
    const agreement = claudeTopType === vectorTopType;

    if (agreement) {
      console.log(`[reverse-shadow] AGREEMENT: both say Type ${vectorTopType} (vector: ${(vectorConfidence * 100).toFixed(0)}%, claude: ${(claudeHypothesis.confidence * 100).toFixed(0)}%)`);
    } else {
      console.log(`[reverse-shadow] DISAGREEMENT — correcting vector hypothesis (vector: Type ${vectorTopType}, claude: Type ${claudeTopType})`);

      // Silently correct the hypothesis to match Claude
      const correctedScores = { ...vectorScores };
      const numericScores: Record<number, number> = {};
      for (const [k, v] of Object.entries(claudeHypothesis.type_scores)) {
        numericScores[Number(k)] = v;
      }
      correctedScores.typeScores = numericScores;
      correctedScores.topTypes = Object.entries(numericScores)
        .sort(([, a], [, b]) => b - a)
        .map(([t]) => Number(t));
      correctedScores.confidence = claudeHypothesis.confidence;

      setSession(sessionId, { vectorScores: correctedScores });
    }

    // Log to shadow_mode_log table
    adminClient.from('shadow_mode_log').insert({
      session_id: sessionId,
      exchange_number: session.exchangeCount + 1,
      claude_top_type: claudeTopType,
      claude_confidence: claudeHypothesis.confidence,
      vector_top_type: vectorTopType,
      vector_confidence: vectorConfidence,
      vector_type_scores: vectorScores.typeScores,
      agreement,
      center_agreement: agreement, // simplified for checkpoint
      phase: 'checkpoint',
    }).then(
      ({ error }) => {
        if (error) console.error('[reverse-shadow] Log error:', error.message);
      },
      (err: unknown) => console.error('[reverse-shadow] Log threw:', err),
    );

  } catch (err) {
    console.error('[reverse-shadow] Checkpoint failed:', err);
    // If checkpoint fails, continue without correction — vector hypothesis stands
    logCheckpointFailure(sessionId, exchangeNumber, 'exception', vectorTopType, vectorConfidence, vectorScores.typeScores);
  }
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

    let session = getSession(sessionId);
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

    // ── HYBRID MODE: Vector-scored early phases ──
    if (HYBRID_MODE_ENABLED && session.useVectorScoring && session.vectorScores) {
      const phaseResult = evaluatePhaseTransition(
        session.vectorScores,
        session.exchangeCount,
        session.vectorScores.phase
      );

      // If still in vector-scorable phases, handle without Claude
      if (!phaseResult.shouldEscalateToClaude) {
        try {
          console.log(`[chat/hybrid] Vector phase: ${phaseResult.currentPhase} — ${phaseResult.reason}`);

          // Score the user's response with vector system
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const questionId = String((session.internalState as any)?.selected_question_id ?? session.exchangeCount);
          const vectorResult = await scoreResponse(
            latestUserMessage.content,
            questionId,
            session.vectorScores,
            session.exchangeCount
          );

          // Select next question based on phase
          // Phase 9: pass session.allQuestionsAsked so the selector can apply
          // per-center coverage rerank.
          let nextQuestion;
          if (phaseResult.currentPhase === 'instinct_probing') {
            nextQuestion = await selectTier2Question(
              vectorResult.typeScores,
              vectorResult.topTypes[0] ?? 0,
              (session.allQuestionsAsked ?? []).map(q => String(q.questionId)),
              lastFormat,
              session.allQuestionsAsked ?? [],
            );
          } else {
            nextQuestion = await selectNextQuestion(
              vectorResult,
              phaseResult.currentPhase as 'center_id' | 'type_narrowing',
              (session.allQuestionsAsked ?? []).map(q => String(q.questionId)),
              lastFormat,
              session.allQuestionsAsked ?? [],
            );
          }

          if (nextQuestion) {
            const guideText = session.exchangeCount === 0
              ? getTransitionText('opening')
              : phaseResult.currentPhase === 'instinct_probing'
                ? ''
                : getTransitionText('center_to_narrowing');

            const response = formatQuestionResponse(
              nextQuestion, guideText, vectorResult, session.exchangeCount + 1
            );

            // Track disconfirmatory in vector phase
            const isDisconfirmatory = session.exchangeCount >= 3 &&
              (nextQuestion.format === 'forced_choice' || nextQuestion.format === 'paragraph_select');

            // Update session
            setSession(sessionId, {
              vectorScores: vectorResult,
              exchangeCount: session.exchangeCount + 1,
              lastQuestionFormat: nextQuestion.format,
              currentStage: stage,
              disconfirmatoryAsked: session.disconfirmatoryAsked || isDisconfirmatory,
              conversationHistory: [
                ...session.conversationHistory,
                { role: 'user', content: latestUserMessage.content },
                { role: 'assistant', content: response.response },
              ],
              allQuestionsAsked: [
                ...(session.allQuestionsAsked ?? []),
                {
                  exchange: session.exchangeCount + 1,
                  questionId: nextQuestion.id,
                  questionText: nextQuestion.question_text,
                  format: nextQuestion.format,
                  answerOptions: nextQuestion.answer_options ?? null,
                  typeWeights: nextQuestion.type_weights ?? null,
                  targetCenter: nextQuestion.target_center ?? null,
                },
              ],
            });

            console.log(`[chat/hybrid] Vector response: "${nextQuestion.question_text.substring(0, 60)}..." | Type ${vectorResult.topTypes[0]} @ ${(vectorResult.confidence * 100).toFixed(0)}%`);
            return NextResponse.json(response);
          }
          // If no question found, fall through to Claude
          console.log('[chat/hybrid] No vector question available, falling through to Claude');
        } catch (err) {
          console.error('[chat/hybrid] Vector scoring failed, falling through to Claude:', err);
          // Graceful degradation — continue to Claude path below
        }
      } else {
        // Escalating to Claude — run checkpoint first, then initialize state
        console.log(`[chat/hybrid] Escalating to Claude: ${phaseResult.reason}`);

        // REVERSE SHADOW MODE: Claude validates vector hypothesis at handoff
        await runCheckpoint(session, sessionId, session.vectorScores!);

        // Initialize internal state from vector scores for Claude handoff
        const vs = getSession(sessionId)?.vectorScores ?? session.vectorScores!;
        setSession(sessionId, {
          useVectorScoring: false,
          internalState: {
            hypothesis: {
              leading_type: vs.topTypes[0] ?? 0,
              confidence: vs.confidence,
              type_scores: Object.fromEntries(Object.entries(vs.typeScores).map(([k, v]) => [k, v])) as Record<string, number>,
              ruling_out: [],
              needs_differentiation: vs.topTypes.slice(0, 2).map(Number),
            },
            variant_signals: { SP: 0.33, SO: 0.33, SX: 0.34 },
            wing_signals: { left: 0, right: 0 },
            centers: {
              body_probed: vs.centerScores.Body > 0.1,
              heart_probed: vs.centerScores.Heart > 0.1,
              head_probed: vs.centerScores.Head > 0.1,
              last_probed: '',
              next_target: '',
            },
            defiant_spirit: {
              react_pattern_observed: '',
              respond_glimpsed: '',
              domain_signals: [],
            },
            oyn_dimensions: { who: '', what: '', why: '', how: '', when: '', where: '' },
            conversation: {
              phase: 'differentiation',
              exchange_count: session.exchangeCount,
              current_stage: deriveStage(session.exchangeCount),
              close_next: false,
              closing_criteria: {
                min_exchanges_met: session.exchangeCount >= 8,
                confidence_met: vs.confidence >= 0.75,
                // Phase 9 — was hardcoded to true. Now reads from real
                // per-session coverage data so Claude can see whether the
                // body/heart/head centers have all been probed at least
                // once before allowing the close.
                all_centers_probed: allCentersProbed(getCenterCoverage(session.allQuestionsAsked)),
                differentiation_asked: false,
                react_respond_identified: false,
                disconfirmatory_asked: session.disconfirmatoryAsked || false,
              },
              ready_to_close: false,
            },
            current_section: 'Your Core Pattern',
            strategy: { what_was_learned: '', next_question_rationale: '', question_format_last_used: '' },
          },
        });
      }
    }

    // ── Conversation history compression ──
    // Re-fetch session: hybrid escalation / checkpoint may have called setSession,
    // which replaces the stored object — our local `session` reference would be stale.
    session = getSession(sessionId) ?? session;
    const compressed = compressHistory(messages, session.internalState);
    const anthropicMessages: Anthropic.MessageParam[] = compressed.messages as Anthropic.MessageParam[];
    if (compressed.summaryInjected) {
      console.log(`[chat] History compressed: ${messages.length} messages → ${compressed.messages.length} (summary injected)`);
    }

    // ── Parallel RAG + Question Bank ──
    const t1 = performance.now();
    const currentConfidence = session.internalState?.hypothesis?.confidence ?? 0;
    const ragCacheKey = `rag-${leadingType}-${stage}-${Math.floor(currentConfidence * 10)}`;
    // Phase 9: include the least-covered center in the question bank cache
    // key. Without this, the cache returns the same set of candidates even
    // after the rerank steers toward a different center — silent corruption.
    // Computed inline because importing center-coverage here would create a
    // circular dep with the existing helpers; the same shape is used.
    const _coverage = (session.allQuestionsAsked ?? []).reduce(
      (acc, q) => {
        if (q.targetCenter === 'Body') acc.Body++;
        else if (q.targetCenter === 'Heart') acc.Heart++;
        else if (q.targetCenter === 'Head') acc.Head++;
        return acc;
      },
      { Body: 0, Heart: 0, Head: 0 },
    );
    const _leastCovered = (['Body', 'Heart', 'Head'] as const)
      .map((c) => ({ c, n: _coverage[c] }))
      .sort((a, b) => a.n - b.n)[0].c;
    const qbCacheKey = `qb-${leadingType}-${stage}-${_leastCovered}`;
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

      // ── Apply sanitization & guide_text fallback in place (mirrors getResponseParts) ──
      const cleaned = getResponseParts(internal);
      if (cleaned) {
        rp.guide_text = cleaned.guide_text;        // ensures non-empty Soulo bridge
        rp.context_note = cleaned.context_note;    // strips internal-reasoning leaks
        // Forced-choice rescue + grammar rescue + degree-question rescue all
        // mutate format / answer_options / scale_range. Propagate everything
        // so the client receives the corrected payload.
        rp.question_format = cleaned.question_format;
        rp.answer_options = cleaned.answer_options;
        if (cleaned.scale_range) rp.scale_range = cleaned.scale_range;
      }
    }

    const finalInternal = internal;
    const finalResponse = response;
    const currentSection: string = internal?.current_section ?? session.internalState?.current_section ?? 'Who You Are';

    // ── Store thinking display (sanitized — strip AI tropes & meta-quoting) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawThinkingDisplay = (finalInternal as any)?.thinking_display ?? '';
    const cleanedThinkingDisplay = sanitizeThinkingDisplay(rawThinkingDisplay);
    session.thinkingDisplay = cleanedThinkingDisplay;

    // ── Session update (in-memory — fast) ──
    const supervisorDefault = { score: 10, approved: true, issues: [] as string[], correction: '' };
    // Look up the matched bank question once so we can pass it both to the
    // session updater (for allQuestionsAsked.targetCenter) and the
    // lastQuestionContext write below.
    const matchedBankQuestionForUpdate = candidateQuestions.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q: Question) => q.id === (finalInternal as any)?.selected_question_id,
    ) ?? null;
    await updateSessionFromParsed(
      session, sessionId,
      { internal: finalInternal, response: finalResponse },
      stage, lastFormat, latestUserMessage, supervisorDefault,
      matchedBankQuestionForUpdate,
    );

    const updatedSession = getSession(sessionId);
    const isComplete = updatedSession?.isComplete ?? false;
    const updatedDomainSignals = updatedSession?.domainSignals ?? [];
    const resultsData = updatedSession?.resultsData ?? null;

    // Capture the structured question metadata Claude just produced so the
    // NEXT user response can be shadow-scored against it. Vector v2's Layer 4
    // (answer-option type weights) needs to know which answer option the user
    // picked — so it needs the answer_options list and the type_weights map.
    // type_weights for Claude-generated questions is null today; bank questions
    // carry it via the Question type. The shadow scorer falls back gracefully.
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rp = (finalInternal as any)?.response_parts;
      // Reuse the lookup from above instead of doing it twice.
      const matchedBankQuestion = matchedBankQuestionForUpdate;
      if (rp?.question_text) {
        setSession(sessionId, {
          lastQuestionContext: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            questionId: (finalInternal as any)?.selected_question_id ?? (session.exchangeCount + 1),
            questionText: rp.question_text,
            format: rp.question_format || 'open',
            answerOptions: Array.isArray(rp.answer_options) ? rp.answer_options : null,
            typeWeights: matchedBankQuestion?.type_weights ?? null,
            targetCenter: matchedBankQuestion?.target_center ?? null,
          },
        });
      }
    }

    const t5 = performance.now();

    // ── SEND RESPONSE IMMEDIATELY — everything below is non-blocking ──
    console.log(
      `[chat/timing] Total: ${Math.round(t5 - t0)}ms | RAG+QB: ${Math.round(t2 - t1)}ms | Claude: ${Math.round(t4 - t3)}ms | Session: ${Math.round(t5 - t4)}ms | Messages: ${anthropicMessages.length} | Exchange: ${session.exchangeCount + 1}`
    );

    // ── Fire-and-forget: Shadow mode vector scoring (non-blocking) ──
    // Runs both v1 (legacy) and v2 (multi-signal whole-type-aware) in parallel
    // and logs each prediction next to Claude's. v2 is the system we're
    // actually validating; v1 stays for backwards comparability.
    Promise.resolve().then(async () => {
      try {
        const currentExchange = session.exchangeCount + 1; // Use updated count, not stale
        const claudeTopType = finalInternal?.hypothesis?.leading_type ?? 0;
        const claudeCenter = claudeTopType > 0 ? (CENTER_MAP[claudeTopType] ?? '') : '';

        // ── v1: legacy single-hypothesis scorer (only when signatures exist) ──
        let v1Promise: PromiseLike<unknown> = Promise.resolve();
        try {
          const signaturesExist = await hasTypeSignatures();
          if (signaturesExist) {
            const questionId = String(finalInternal?.selected_question_id ?? currentExchange);
            const v1Result = await scoreResponse(
              latestUserMessage.content,
              questionId,
              session.vectorScores ?? null,
              currentExchange
            );
            // Persist v1 vector scores so the legacy hybrid path (when re-enabled)
            // has continuity. Does not affect Claude's behaviour in shadow mode.
            setSession(sessionId, { vectorScores: v1Result });
            const v1Top = v1Result.topTypes[0] ?? 0;
            const v1Agree = claudeTopType === v1Top;
            const v1CenterAgree = claudeCenter === (v1Top > 0 ? (CENTER_MAP[v1Top] ?? '') : '');
            v1Promise = adminClient.from('shadow_mode_log').insert({
              session_id: sessionId,
              exchange_number: currentExchange,
              claude_top_type: claudeTopType,
              claude_confidence: finalInternal?.hypothesis?.confidence ?? 0,
              vector_top_type: v1Top,
              vector_confidence: v1Result.confidence,
              vector_center_scores: v1Result.centerScores,
              vector_type_scores: v1Result.typeScores,
              agreement: v1Agree,
              center_agreement: v1CenterAgree,
              phase: `v1:${v1Result.phase}`,
            }).then(
              ({ error: logErr }) => {
                if (logErr) console.error('[shadow-v1] Log error:', logErr.message);
                else console.log(`[shadow-v1] Ex${currentExchange}: Claude=T${claudeTopType} v1=T${v1Top} | type=${v1Agree?'✓':'✗'} center=${v1CenterAgree?'✓':'✗'}`);
              },
              (err: unknown) => console.error('[shadow-v1] Log threw:', err),
            );
          }
        } catch (err) {
          console.warn('[shadow-v1] Skipping v1:', err);
        }

        // ── v2: multi-signal whole-type-aware scorer ──
        // Pull the structured question metadata for the question the user
        // just answered. This was captured into session.lastQuestionContext
        // BEFORE this turn (when Claude wrote the previous question). Without
        // it, Layer 4 (answer-weights) can't fire and v2 only has lexical +
        // embedding to work with.
        try {
          const lqc = session.lastQuestionContext;
          const priorAssistant = [...messages]
            .reverse()
            .find((m) => m.role === 'assistant');
          const v2Question: V2QuestionContext = lqc
            ? {
                questionId: lqc.questionId,
                questionText: lqc.questionText,
                format: lqc.format,
                answerOptions: lqc.answerOptions,
                typeWeights: lqc.typeWeights,
              }
            : {
                // Fallback: no captured context (first exchange or migration).
                // v2 will run lexical + embedding only.
                questionId: String(finalInternal?.selected_question_id ?? currentExchange),
                questionText: priorAssistant?.content ?? '',
                format: lastFormat || 'open',
                answerOptions: null,
                typeWeights: null,
              };
          const v2Result = await scoreV2(
            latestUserMessage.content,
            v2Question,
            (session.vectorScoresV2 as VectorV2Result | null) ?? null,
          );
          setSession(sessionId, { vectorScoresV2: v2Result });
          const v2CoreAgree = claudeTopType === v2Result.coreType;
          const v2CenterAgree = claudeCenter === (v2Result.coreType > 0 ? (CENTER_MAP[v2Result.coreType] ?? '') : '');

          // Tiebreaker detection: when two centers have comparable confidence,
          // passive scoring can't resolve the core type. Log when this fires
          // so we can see how often it'd help on real assessments.
          const tiebreakerCandidates = detectTiebreakerNeeded(
            v2Result.centerWinners,
            v2Result.centerConfidences,
            v2Result.exchangeCount,
          );
          if (tiebreakerCandidates) {
            console.log(`[shadow-v2] ⚠️ Tiebreaker recommended at ex${currentExchange}: competing types ${tiebreakerCandidates.join(', ')}`);
          }
          const phaseTag = tiebreakerCandidates
            ? `v2:wholeType=${v2Result.wholeType}:tiebreaker=${tiebreakerCandidates.join('-')}`
            : `v2:wholeType=${v2Result.wholeType}`;
          await adminClient.from('shadow_mode_log').insert({
            session_id: sessionId,
            exchange_number: currentExchange,
            claude_top_type: claudeTopType,
            claude_confidence: finalInternal?.hypothesis?.confidence ?? 0,
            vector_top_type: v2Result.coreType,
            vector_confidence: v2Result.confidence,
            vector_center_scores: v2Result.centers as unknown as Record<string, unknown>,
            vector_type_scores: flattenToTypeScores(v2Result.centers),
            agreement: v2CoreAgree,
            center_agreement: v2CenterAgree,
            phase: phaseTag,
          }).then(
            ({ error: logErr }) => {
              if (logErr) console.error('[shadow-v2] Log error:', logErr.message);
              else console.log(`[shadow-v2] Ex${currentExchange}: Claude=T${claudeTopType} v2=T${v2Result.coreType} (whole=${v2Result.wholeType}) | core=${v2CoreAgree?'✓':'✗'} center=${v2CenterAgree?'✓':'✗'}`);
            },
            (err: unknown) => console.error('[shadow-v2] Log threw:', err),
          );
        } catch (err) {
          console.warn('[shadow-v2] v2 scoring failed:', err);
        }

        await v1Promise;
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

    // ── FINAL SAFETY GATE ──
    // No matter what happened upstream, the server must NEVER ship raw
    // Claude reasoning to the client. This block is the last chance to
    // catch leaked thinking/analysis content before it reaches the user.
    let safeMessage = stripReasoningTags(finalResponse || '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeRp = (finalInternal as any)?.response_parts ?? null;
    if (safeRp) {
      if (looksLikeReasoningLeak(safeRp.question_text) || looksLikeReasoningLeak(safeRp.guide_text)) {
        console.error('[chat] FINAL GATE: reasoning leak detected in response_parts; clearing');
        safeRp.question_text = '';
        safeRp.guide_text = '';
      }
      if (typeof safeRp.question_text === 'string' && safeRp.question_text.length > 600) {
        console.error(`[chat] FINAL GATE: question_text too long (${safeRp.question_text.length}); clearing`);
        safeRp.question_text = '';
      }
    }
    if (looksLikeReasoningLeak(safeMessage) || safeMessage.length > 2000) {
      console.error('[chat] FINAL GATE: reasoning leak in finalResponse; clearing');
      safeMessage = '';
    }

    return NextResponse.json({
      message: safeMessage,
      response: safeMessage,
      internal: finalInternal,
      response_parts: safeRp,
      isComplete,
      domainSignals: updatedDomainSignals,
      currentSection,
      currentStage: stage,
      thinking_display: cleanedThinkingDisplay,
      progressSaved: !!(session.userId && session.userId.length > 0),
      clarificationActive: updatedSession?.clarificationState?.active ?? false,
      ...(isComplete && resultsData ? { resultsData } : {}),
    });
  } catch (err) {
    console.error('[chat] Error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
