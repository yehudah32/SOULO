import { adminClient } from './supabase';
import { FALLBACK_QUESTIONS, Question } from './fallback-questions';

export type { Question };

export async function getQuestionBank(
  leadingType: number,
  needsDifferentiation: string | null,
  stage: number,
  lastFormat: string,
  limit = 8
): Promise<Question[]> {
  try {
    const { data, error } = await adminClient.rpc('get_candidate_questions', {
      p_leading_type: leadingType,
      p_needs_differentiation: needsDifferentiation,
      p_stage: stage,
      p_last_format: lastFormat,
      p_limit: limit,
    });

    if (error || !data || (data as Question[]).length === 0) {
      if (error) {
        console.warn('[question-bank] RPC error, using fallbacks:', error.message);
      } else {
        console.log('[question-bank] No DB questions found, using fallbacks for stage', stage);
      }
      return FALLBACK_QUESTIONS.filter((q) => q.stage === stage);
    }

    return data as Question[];
  } catch (err) {
    console.warn('[question-bank] Unexpected error, using fallbacks:', err);
    return FALLBACK_QUESTIONS.filter((q) => q.stage === stage);
  }
}

export async function updateQuestionYield(
  questionId: number,
  wasUseful: boolean
): Promise<void> {
  // Skip fallback questions (negative IDs)
  if (questionId < 0) return;

  try {
    const { data: existing, error: fetchError } = await adminClient
      .from('questions')
      .select('times_used, avg_information_yield')
      .eq('id', questionId)
      .single();

    if (fetchError || !existing) return;

    const timesUsed: number = existing.times_used ?? 0;
    const currentYield: number = existing.avg_information_yield ?? 0.5;
    const newTimesUsed = timesUsed + 1;
    // Exponential moving average with alpha=0.2
    const alpha = 0.2;
    const newYield = currentYield * (1 - alpha) + (wasUseful ? 1.0 : 0.0) * alpha;

    await adminClient
      .from('questions')
      .update({ times_used: newTimesUsed, avg_information_yield: newYield })
      .eq('id', questionId);
  } catch (err) {
    // Never propagate — yield tracking is best-effort
    console.warn('[question-bank] updateQuestionYield error (non-fatal):', err);
  }
}
