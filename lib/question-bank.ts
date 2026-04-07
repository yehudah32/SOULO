import { adminClient } from './supabase';
import { FALLBACK_QUESTIONS, Question } from './fallback-questions';

export type { Question };

export async function getQuestionBank(
  leadingType: number,
  needsDifferentiation: string | null,
  stage: number,
  lastFormat: string,
  limit = 8,
  tier?: number
): Promise<Question[]> {
  try {
    const { data, error } = await adminClient.rpc('get_candidate_questions', {
      p_leading_type: leadingType,
      p_needs_differentiation: needsDifferentiation,
      p_stage: stage,
      p_last_format: lastFormat,
      p_limit: tier ? limit * 2 : limit, // Fetch more if filtering by tier
    });

    if (error || !data || (data as Question[]).length === 0) {
      if (error) {
        console.warn('[question-bank] RPC error, using fallbacks:', error.message);
      } else {
        console.log('[question-bank] No DB questions found, using fallbacks for stage', stage);
      }
      let fallbacks = FALLBACK_QUESTIONS.filter((q) => q.stage === stage);
      if (tier) {
        const tierFiltered = fallbacks.filter((q) => (q.tier ?? 1) === tier);
        if (tierFiltered.length === 0) {
          // No tier-specific fallback exists. Returning a different tier here
          // would silently corrupt the assessment (e.g. Tier 2 instinct probing
          // would get Tier 1 center-id questions). Return empty so the caller
          // escalates to Claude instead.
          console.error(`[question-bank] No Tier ${tier} fallbacks for stage ${stage} — returning empty so caller escalates`);
          return [];
        }
        fallbacks = tierFiltered;
      }
      // Rotate format in fallback selection
      if (lastFormat && fallbacks.length > 1) {
        const rotated = fallbacks.filter((q) => q.format !== lastFormat);
        if (rotated.length > 0) fallbacks = rotated;
      }
      return fallbacks.slice(0, limit);
    }

    let results = data as Question[];
    // Post-filter by tier if specified (until RPC supports tier parameter)
    if (tier) {
      results = results.filter((q: Question & { tier?: number }) => (q.tier ?? 1) === tier);
    }
    return results.slice(0, limit);
  } catch (err) {
    console.warn('[question-bank] Unexpected error, using fallbacks:', err);
    return FALLBACK_QUESTIONS.filter((q) => q.stage === stage);
  }
}

export async function updateQuestionYield(
  questionId: number,
  contributionScore: number,
  sessionId: string,
  reason: string
): Promise<void> {
  // Skip fallback questions (negative IDs)
  if (questionId < 0) return;

  try {
    const { data: existing, error: fetchError } = await adminClient
      .from('questions')
      .select('times_used, avg_information_yield, is_baruch_sourced')
      .eq('id', questionId)
      .single();

    if (fetchError || !existing) return;

    const timesUsed: number = existing.times_used ?? 0;
    const currentYield: number = existing.avg_information_yield ?? 0.5;
    const isBaruch: boolean = existing.is_baruch_sourced ?? false;
    const newTimesUsed = timesUsed + 1;

    // Minimum data threshold: no yield adjustment until 10+ uses
    if (newTimesUsed < 10) {
      // Still increment times_used, but don't adjust yield
      await adminClient
        .from('questions')
        .update({ times_used: newTimesUsed })
        .eq('id', questionId);

      // Log as skipped
      adminClient.from('question_yield_log').insert({
        question_id: questionId,
        session_id: sessionId,
        direction: 'skipped',
        old_yield: currentYield,
        new_yield: currentYield,
        contribution_score: contributionScore,
        reason: `${reason} (skipped: only ${newTimesUsed} uses, need 10)`,
      }).then(() => {}, () => {});

      return;
    }

    // Conservative EMA: alpha=0.05 (takes 30+ data points to meaningfully shift)
    const alpha = 0.05;
    let newYield = currentYield * (1 - alpha) + contributionScore * alpha;

    // Floors: Baruch-sourced questions never drop below 0.5, general never below 0.3
    const floor = isBaruch ? 0.5 : 0.3;
    newYield = Math.max(newYield, floor);

    // Cap at 1.0
    newYield = Math.min(newYield, 1.0);

    const direction = newYield > currentYield + 0.001 ? 'up' : newYield < currentYield - 0.001 ? 'down' : 'neutral';

    await adminClient
      .from('questions')
      .update({ times_used: newTimesUsed, avg_information_yield: newYield })
      .eq('id', questionId);

    // Log the adjustment
    adminClient.from('question_yield_log').insert({
      question_id: questionId,
      session_id: sessionId,
      direction,
      old_yield: currentYield,
      new_yield: newYield,
      contribution_score: contributionScore,
      reason,
    }).then(() => {}, () => {});

    console.log(`[yield] Q${questionId}: ${currentYield.toFixed(3)} → ${newYield.toFixed(3)} (${direction}, score=${contributionScore.toFixed(2)}, ${reason})`);
  } catch (err) {
    // Never propagate — yield tracking is best-effort
    console.warn('[question-bank] updateQuestionYield error (non-fatal):', err);
  }
}
