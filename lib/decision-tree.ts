import { adminClient } from './supabase';
import { CENTER_MAP } from './enneagram-lines';
import type { Question } from './fallback-questions';
import type { VectorScorerResult } from './vector-scorer';
import { getQuestionBank } from './question-bank';

/**
 * Decision tree for selecting the next question during vector-scored phases.
 * Uses question effectiveness data and current scores to pick the question
 * that will maximally discriminate between remaining candidate types.
 */

// Pre-written response text for vector-scored phases (no LLM generation needed)
const PHASE_TRANSITIONS: Record<string, string[]> = {
  opening: [
    "Let's start with something simple.",
    "I'd like to understand how you naturally move through the world.",
    "Let's begin — I want to get a feel for how you operate.",
  ],
  center_to_narrowing: [
    "Interesting. Let me dig a little deeper.",
    "That tells me something. Let's sharpen the picture.",
    "Good — I'm starting to see a pattern. Let me ask something more specific.",
  ],
  narrowing_to_differentiation: [
    "I'm getting a clearer read on you. Now I want to really zero in.",
    "We're getting somewhere. Let me ask you something that requires a bit more reflection.",
    "I have a working theory. Let me test it with a more nuanced question.",
  ],
};

/**
 * Get a random transition phrase for the current phase change.
 */
export function getTransitionText(transition: keyof typeof PHASE_TRANSITIONS): string {
  const options = PHASE_TRANSITIONS[transition];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Select the best next question for the current assessment phase.
 *
 * Strategy:
 * - center_id: Pick questions that maximally separate Body/Heart/Head centers
 * - type_narrowing: Pick questions that discriminate between types within the identified center
 *
 * Avoids repeating questions already asked and rotates question formats.
 */
export async function selectNextQuestion(
  scores: VectorScorerResult,
  phase: 'center_id' | 'type_narrowing',
  questionsAsked: string[],
  lastFormat: string
): Promise<Question | null> {
  // Determine which types we need to discriminate between
  let targetTypes: number[] = [];

  if (phase === 'center_id') {
    // For center ID, we want broad questions — no specific type targeting
    targetTypes = [];
  } else {
    // For narrowing, target the top 3 types
    targetTypes = scores.topTypes.slice(0, 3);
  }

  // Determine which stage to query from the question bank
  const stage = phase === 'center_id' ? 1 : 3;

  // Validate inputs
  if (!scores || !scores.topTypes) {
    return null;
  }

  // Query the question bank for candidates, excluding already-asked questions
  let query = adminClient
    .from('questions')
    .select('*')
    .eq('stage', stage)
    .order('avg_information_yield', { ascending: false })
    .limit(10);

  // Exclude already-asked questions
  if (questionsAsked.length > 0) {
    query = query.not('id', 'in', `(${questionsAsked.join(',')})`);
  }

  // Rotate format if possible
  if (lastFormat) {
    query = query.neq('format', lastFormat);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    // Try without format rotation, same stage
    let fallbackQuery = adminClient
      .from('questions')
      .select('*')
      .eq('stage', stage)
      .order('avg_information_yield', { ascending: false })
      .limit(5);

    if (questionsAsked.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${questionsAsked.join(',')})`);
    }

    const { data: fallbackData } = await fallbackQuery;

    if (!fallbackData || fallbackData.length === 0) return null;
    return fallbackData[0] as Question;
  }

  // If we have target types, prefer questions that target those types
  if (targetTypes.length > 0) {
    const targeted = data.filter((q: { target_types: number[] }) => {
      if (!q.target_types || (q.target_types as number[]).length === 0) return false;
      return (q.target_types as number[]).some((t: number) => targetTypes.includes(t));
    });
    if (targeted.length > 0) return targeted[0] as Question;
  }

  // Otherwise return the highest-yield question
  return data[0] as Question;
}

/**
 * Select a question specifically for center identification.
 * These questions should broadly distinguish Body (action/instinct),
 * Heart (feeling/image), and Head (thinking/planning) centers.
 */
export async function selectCenterIdQuestion(
  questionsAsked: string[],
  lastFormat: string
): Promise<Question | null> {
  // For center ID, we want stage 1-2 questions with broad targeting
  const { data } = await adminClient
    .from('questions')
    .select('*')
    .lte('stage', 2)
    .not('id', 'in', `(${questionsAsked.length > 0 ? questionsAsked.join(',') : '0'})`)
    .order('avg_information_yield', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return null;

  // Prefer format rotation
  const rotated = data.filter((q: { format: string }) => q.format !== lastFormat);
  return (rotated.length > 0 ? rotated[0] : data[0]) as Question;
}

// ═══════════════════════════════════════════════════════════════
// TIER CASCADE — Tier 1 data informs Tier 2 question selection
// Per DYN_SYSTEM_ARCHITECTURE.md: "The prior tier always lightens
// the load in determination for the next tier."
// ═══════════════════════════════════════════════════════════════

/**
 * Infer likely instinct leanings from Tier 1 (Core Type) data.
 * This is a SECONDARY input — not definitive, but narrows the search space.
 *
 * Patterns per DYN_SYSTEM_ARCHITECTURE.md:
 * - Counterphobic 6 (high 8/4 energy in top scores) → likely SX or SO dominant
 * - Phobic 6 (high 9/1 energy) → likely SP dominant
 * - Type with high adjacent scores → wing energy hints at instinct
 * - Reactive triad (4, 6, 8) with high intensity → SX lean
 * - Withdrawn triad (4, 5, 9) with low social scores → SP or SX lean
 * - Assertive triad (3, 7, 8) with high social engagement → SO lean
 */
export function inferInstinctFromTier1(
  typeScores: Record<number, number>,
  leadingType: number
): { likelySP: number; likelySX: number; likelySO: number } {
  // Start with uniform priors
  let sp = 0.33, sx = 0.33, so = 0.34;

  if (leadingType === 0) return { likelySP: sp, likelySX: sx, likelySO: so };

  // Reactive triad types (4, 6, 8) with high intensity scores → SX lean
  const reactiveTypes = [4, 6, 8];
  const reactiveEnergy = reactiveTypes.reduce((sum, t) => sum + (typeScores[t] ?? 0), 0);
  if (reactiveEnergy > 0.4) {
    sx += 0.1;
    sp -= 0.05;
    so -= 0.05;
  }

  // Withdrawn triad (4, 5, 9) dominant → SP or SX lean (less social)
  const withdrawnTypes = [4, 5, 9];
  const withdrawnEnergy = withdrawnTypes.reduce((sum, t) => sum + (typeScores[t] ?? 0), 0);
  if (withdrawnEnergy > 0.4) {
    so -= 0.1;
    sp += 0.05;
    sx += 0.05;
  }

  // Assertive triad (3, 7, 8) dominant → SO lean
  const assertiveTypes = [3, 7, 8];
  const assertiveEnergy = assertiveTypes.reduce((sum, t) => sum + (typeScores[t] ?? 0), 0);
  if (assertiveEnergy > 0.4) {
    so += 0.1;
    sp -= 0.05;
    sx -= 0.05;
  }

  // Type 6 specific: counterphobic (high 8 energy) → SX/SO; phobic (high 9 energy) → SP
  if (leadingType === 6) {
    const eightScore = typeScores[8] ?? 0;
    const nineScore = typeScores[9] ?? 0;
    if (eightScore > nineScore) {
      sx += 0.1;
      sp -= 0.1;
    } else {
      sp += 0.1;
      sx -= 0.1;
    }
  }

  // Normalize to sum to 1
  const total = sp + sx + so;
  if (total <= 0) {
    return { likelySP: 0.33, likelySX: 0.33, likelySO: 0.34 };
  }
  return {
    likelySP: Math.max(0, sp / total),
    likelySX: Math.max(0, sx / total),
    likelySO: Math.max(0, so / total),
  };
}

/**
 * Select a Tier 2 (instinct) question, using Tier 1 cascade data to
 * prioritize which instinct pair to differentiate first.
 *
 * Strategy: if Tier 1 data suggests two instincts are close, ask a
 * question that distinguishes between them. If one instinct is clearly
 * dominant, ask a question that confirms it.
 */
export async function selectTier2Question(
  typeScores: Record<number, number>,
  leadingType: number,
  questionsAsked: string[],
  lastFormat: string
): Promise<Question | null> {
  const inferred = inferInstinctFromTier1(typeScores, leadingType);
  console.log(`[tier-cascade] Inferred instinct leanings from Tier 1: SP=${inferred.likelySP.toFixed(2)} SX=${inferred.likelySX.toFixed(2)} SO=${inferred.likelySO.toFixed(2)}`);

  // Get Tier 2 questions from the bank
  // Use tier parameter if available, otherwise get stage 5-6 questions
  const candidates = await getQuestionBank(leadingType, null, 5, lastFormat, 8, 2);

  if (candidates.length > 0) {
    // Filter out already-asked questions
    const available = candidates.filter(q =>
      !questionsAsked.includes(String(q.id))
    );
    if (available.length > 0) return available[0];
  }

  // Fallback: get any stage 5-6 question not yet asked
  const fallback = await getQuestionBank(leadingType, null, 6, lastFormat, 5);
  const availableFallback = fallback.filter(q =>
    !questionsAsked.includes(String(q.id))
  );
  return availableFallback.length > 0 ? availableFallback[0] : null;
}

/**
 * Format a question for presentation to the user during vector-scored phases.
 * Returns the response object matching the existing API format.
 */
export function formatQuestionResponse(
  question: Question,
  guideText: string,
  scores: VectorScorerResult,
  exchangeCount: number
) {
  return {
    message: `${guideText} ${question.question_text}`,
    response: `${guideText} ${question.question_text}`,
    response_parts: {
      guide_text: guideText,
      question_text: question.question_text,
      question_format: question.format,
      answer_options: question.answer_options,
      scale_range: question.format === 'scale' ? { min: 1, max: 5 } : null,
    },
    internal: {
      hypothesis: {
        leading_type: scores.topTypes[0] ?? 0,
        confidence: scores.confidence,
        type_scores: scores.typeScores,
        needs_differentiation: [],
      },
      variant_signals: { SP: 0, SO: 0, SX: 0 },
      wing_signals: { left: 0, right: 0 },
      centers: {
        body_probed: scores.centerScores.Body > 0.1,
        heart_probed: scores.centerScores.Heart > 0.1,
        head_probed: scores.centerScores.Head > 0.1,
      },
      conversation: {
        phase: scores.phase,
        exchange_count: exchangeCount,
        close_next: false,
        current_stage: exchangeCount <= 2 ? 1 : exchangeCount <= 4 ? 2 : 3,
      },
      response_parts: {
        guide_text: guideText,
        question_text: question.question_text,
        question_format: question.format,
        answer_options: question.answer_options,
        scale_range: question.format === 'scale' ? { min: 1, max: 5 } : null,
      },
      selected_question_id: question.id,
    },
    isComplete: false,
    currentStage: exchangeCount <= 2 ? 1 : exchangeCount <= 4 ? 2 : 3,
    currentSection: 'Who You Are',
    thinking_display: '',
    clarificationActive: false,
    progressSaved: false,
  };
}
