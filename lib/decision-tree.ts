import { adminClient } from './supabase';
import { CENTER_MAP } from './enneagram-lines';
import type { Question } from './fallback-questions';
import type { VectorScorerResult } from './vector-scorer';

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
