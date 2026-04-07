import type { VectorScorerResult } from './vector-scorer';
import { CENTER_MAP } from './enneagram-lines';

// Phases map to DYN tiers:
// center_id + type_narrowing = Tier 1 (Core Type + Whole Type)
// instinct_probing = Tier 2 (Instinct + Subtype) — uses Tier 1 cascade
// differentiation = Tier 3+ (Wings/Lines, final refinement via Claude)
export type AssessmentPhase = 'center_id' | 'type_narrowing' | 'instinct_probing' | 'differentiation';

export interface PhaseTransitionResult {
  currentPhase: AssessmentPhase;
  shouldEscalateToClaude: boolean;
  reason: string;
}

// ── Thresholds ──
const THRESHOLDS = {
  centerIdToNarrowing: {
    minCenterConfidence: 0.70,  // top center score / total center scores
    minQuestions: 2,
    maxQuestions: 3,
  },
  narrowingToDifferentiation: {
    minTypeConfidence: 0.45,    // top type score / total
    topTwoGap: 0.15,           // minimum gap between #1 and #2
    minQuestions: 2,
    maxQuestions: 4,
  },
  escapeHatch: {
    lowConfidenceThreshold: 0.15, // if top type score is below this, escalate to Claude
  },
  differentiationMax: {
    maxQuestions: 5, // Hard cap on differentiation questions before close
  },
  close: {
    minConfidence: 0.85,
    minTotalQuestions: 6,
    maxTotalQuestions: 12,
  },
};

/**
 * Determine the dominant center from type scores.
 */
function getDominantCenter(typeScores: Record<number, number>): {
  center: string;
  confidence: number;
} {
  const centerTotals: Record<string, number> = { Body: 0, Heart: 0, Head: 0 };

  for (const [typeStr, score] of Object.entries(typeScores)) {
    const type = Number(typeStr);
    const center = CENTER_MAP[type];
    if (center) {
      centerTotals[center] += score;
    }
  }

  const total = Object.values(centerTotals).reduce((s, v) => s + v, 0);
  if (total === 0) return { center: '', confidence: 0 };

  const sorted = Object.entries(centerTotals).sort(([, a], [, b]) => b - a);
  return {
    center: sorted[0][0],
    confidence: sorted[0][1] / total,
  };
}

/**
 * Determine the current assessment phase and whether to escalate to Claude.
 *
 * Logic:
 * - Start in center_id (identifying Head/Heart/Body)
 * - Move to type_narrowing once center is identified with sufficient confidence
 * - Move to differentiation when top type candidates are clear
 * - Escalate to Claude immediately if confidence is abnormally low (escape hatch)
 */
export function evaluatePhaseTransition(
  scores: VectorScorerResult,
  exchangeCount: number,
  currentPhase: AssessmentPhase
): PhaseTransitionResult {
  const { typeScores, confidence } = scores;

  // ── Escape Hatch ──
  // If after 3+ questions we still can't establish any signal, escalate to Claude
  if (exchangeCount >= 3) {
    const topScore = Math.max(...Object.values(typeScores));
    if (topScore < THRESHOLDS.escapeHatch.lowConfidenceThreshold) {
      return {
        currentPhase: 'differentiation',
        shouldEscalateToClaude: true,
        reason: `Low signal after ${exchangeCount} questions (top score: ${topScore.toFixed(3)}). Escalating to Claude.`,
      };
    }
  }

  // ── Phase: center_id → type_narrowing ──
  if (currentPhase === 'center_id') {
    const { center, confidence: centerConf } = getDominantCenter(typeScores);

    if (
      exchangeCount >= THRESHOLDS.centerIdToNarrowing.minQuestions &&
      centerConf >= THRESHOLDS.centerIdToNarrowing.minCenterConfidence
    ) {
      return {
        currentPhase: 'type_narrowing',
        shouldEscalateToClaude: false,
        reason: `Center identified: ${center} (${Math.round(centerConf * 100)}% confidence)`,
      };
    }

    // Force transition after max questions even with lower confidence
    if (exchangeCount >= THRESHOLDS.centerIdToNarrowing.maxQuestions) {
      return {
        currentPhase: 'type_narrowing',
        shouldEscalateToClaude: false,
        reason: `Max center_id questions reached (${exchangeCount}). Moving to narrowing with ${center} at ${Math.round(centerConf * 100)}%.`,
      };
    }

    return {
      currentPhase: 'center_id',
      shouldEscalateToClaude: false,
      reason: `Still identifying center (${exchangeCount} questions, ${center} at ${Math.round(centerConf * 100)}%)`,
    };
  }

  // ── Phase: type_narrowing → differentiation ──
  if (currentPhase === 'type_narrowing') {
    const sortedTypes = Object.entries(typeScores)
      .sort(([, a], [, b]) => b - a);

    if (sortedTypes.length >= 2) {
      const topScore = sortedTypes[0][1];
      const secondScore = sortedTypes[1][1];
      const gap = topScore - secondScore;
      const total = Object.values(typeScores).reduce((s, v) => s + v, 0);
      const topRatio = total > 0 ? topScore / total : 0;

      // Check narrowing-to-differentiation conditions
      // Clamp to 0 — exchangeCount can briefly be below minQuestions on early turns
      // and we don't want a negative number tripping the threshold checks below.
      const narrowingQuestionsAsked = Math.max(0, exchangeCount - THRESHOLDS.centerIdToNarrowing.minQuestions);

      if (
        narrowingQuestionsAsked >= THRESHOLDS.narrowingToDifferentiation.minQuestions &&
        (topRatio >= THRESHOLDS.narrowingToDifferentiation.minTypeConfidence ||
         gap >= THRESHOLDS.narrowingToDifferentiation.topTwoGap)
      ) {
        // Tier cascade: go to instinct probing (Tier 2) before differentiation
        return {
          currentPhase: 'instinct_probing',
          shouldEscalateToClaude: false, // Tier 2 can use vector + question bank
          reason: `Type narrowed: Type ${sortedTypes[0][0]} leads (ratio: ${topRatio.toFixed(2)}, gap: ${gap.toFixed(3)}). Moving to Tier 2 instinct probing.`,
        };
      }

      // Force transition after max narrowing questions
      if (narrowingQuestionsAsked >= THRESHOLDS.narrowingToDifferentiation.maxQuestions) {
        return {
          currentPhase: 'differentiation',
          shouldEscalateToClaude: true,
          reason: `Max narrowing questions reached. Top candidates: Type ${sortedTypes[0][0]} and Type ${sortedTypes[1][0]}. Switching to Claude.`,
        };
      }
    }

    return {
      currentPhase: 'type_narrowing',
      shouldEscalateToClaude: false,
      reason: `Still narrowing type (${exchangeCount} total questions, confidence: ${confidence.toFixed(2)})`,
    };
  }

  // ── Phase: instinct_probing (Tier 2 — uses question bank + vector) ──
  if (currentPhase === 'instinct_probing') {
    // Ask 2-3 instinct questions, then move to differentiation
    const instinctQuestionsAsked = Math.max(0, exchangeCount -
      (THRESHOLDS.centerIdToNarrowing.maxQuestions + THRESHOLDS.narrowingToDifferentiation.maxQuestions));

    if (instinctQuestionsAsked >= 3) {
      return {
        currentPhase: 'differentiation',
        shouldEscalateToClaude: true,
        reason: `Instinct probing complete (${instinctQuestionsAsked} questions). Moving to Claude for differentiation.`,
      };
    }

    return {
      currentPhase: 'instinct_probing',
      shouldEscalateToClaude: false,
      reason: `Probing instinct stack (${instinctQuestionsAsked} of 3 questions). Tier 1 data informing Tier 2 selection.`,
    };
  }

  // ── Phase: differentiation (always uses Claude) ──
  // Enforce a max questions limit to prevent infinite loops
  const diffQuestionsAsked = Math.max(0, exchangeCount - (THRESHOLDS.centerIdToNarrowing.maxQuestions + THRESHOLDS.narrowingToDifferentiation.maxQuestions + 3));
  if (diffQuestionsAsked >= THRESHOLDS.differentiationMax.maxQuestions) {
    return {
      currentPhase: 'differentiation',
      shouldEscalateToClaude: true,
      reason: `Max differentiation questions reached (${diffQuestionsAsked}). Assessment should close.`,
    };
  }

  return {
    currentPhase: 'differentiation',
    shouldEscalateToClaude: true,
    reason: 'In differentiation phase — Claude handles nuanced type distinction.',
  };
}

/**
 * Check if the assessment should close based on vector scores.
 * Only used as an early signal — final close decision is still made by Claude in differentiation phase.
 */
export function shouldCloseEarly(
  scores: VectorScorerResult,
  exchangeCount: number
): boolean {
  return (
    scores.confidence >= THRESHOLDS.close.minConfidence &&
    exchangeCount >= THRESHOLDS.close.minTotalQuestions
  );
}

/**
 * Get the types within the identified center for targeted narrowing questions.
 */
export function getTypesInCenter(center: string): number[] {
  const centerTypes: Record<string, number[]> = {
    Body: [8, 9, 1],
    Heart: [2, 3, 4],
    Head: [5, 6, 7],
  };
  return centerTypes[center] ?? [];
}

/**
 * Select the top N candidate types from current scores.
 */
export function getTopCandidates(
  typeScores: Record<number, number>,
  n: number = 3
): number[] {
  return Object.entries(typeScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([type]) => Number(type));
}
