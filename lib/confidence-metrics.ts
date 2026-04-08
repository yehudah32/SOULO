// ─────────────────────────────────────────────────────────────────────────
// CONFIDENCE METRICS
// ─────────────────────────────────────────────────────────────────────────
//
// Computes how many questions an assessment took to reach "free-tier
// confidence" — the minimum certainty threshold for serving the core type
// alone (the free version).
//
// We use Claude's per-turn confidence logged in shadow_mode_log as the
// source of truth. The free-tier threshold is intentionally lower than
// the full-assessment closing threshold (which is ~0.85) because the
// free version only commits to the core type, not the full whole type
// or instinct stack.
//
// Threshold: 0.75 — Claude expresses "this is probably the right core
// type" without yet having ruled out close-confusables. Empirically this
// is the point where the leading type stops jumping turn-to-turn.

export const FREE_TIER_CONFIDENCE_THRESHOLD = 0.75;

export interface ShadowLogRow {
  exchange_number: number;
  claude_top_type: number;
  claude_confidence: number;
  phase?: string | null;
}

/**
 * Given an array of shadow_mode_log rows for a single session, return the
 * exchange number at which Claude FIRST hit the free-tier confidence
 * threshold. Returns null if it never crossed.
 *
 * Only counts exchanges where claude_top_type is non-zero (i.e. Claude has
 * actually formed a hypothesis — exchange 1 is usually still the opening).
 */
export function questionsToFreeTierConfidence(
  rows: ShadowLogRow[],
  threshold = FREE_TIER_CONFIDENCE_THRESHOLD,
): number | null {
  if (!rows || rows.length === 0) return null;

  // Deduplicate per exchange — we may have both v1 and v2 entries per turn,
  // and they share the same claude_top_type / claude_confidence values.
  const byExchange = new Map<number, ShadowLogRow>();
  for (const r of rows) {
    if (!byExchange.has(r.exchange_number)) {
      byExchange.set(r.exchange_number, r);
    }
  }
  const sorted = [...byExchange.values()].sort((a, b) => a.exchange_number - b.exchange_number);

  for (const row of sorted) {
    if (row.claude_top_type > 0 && row.claude_confidence >= threshold) {
      return row.exchange_number;
    }
  }
  return null;
}

/**
 * Aggregate stats across many sessions. Used by the admin dashboard to
 * show overall benchmarks for how quickly the assessment converges.
 */
export interface FreeTierStats {
  /** Sessions where the threshold was crossed at all */
  reached: number;
  /** Sessions where the threshold was never crossed */
  notReached: number;
  /** Average exchange number to crossing (only over reached sessions) */
  avgQuestions: number | null;
  /** Median exchange number to crossing */
  medianQuestions: number | null;
  /** Fastest crossing observed */
  minQuestions: number | null;
  /** Slowest crossing observed */
  maxQuestions: number | null;
}

export function aggregateFreeTierStats(
  perSessionMetrics: Array<number | null>,
): FreeTierStats {
  const reached = perSessionMetrics.filter((n): n is number => n !== null);
  const notReached = perSessionMetrics.length - reached.length;

  if (reached.length === 0) {
    return {
      reached: 0,
      notReached,
      avgQuestions: null,
      medianQuestions: null,
      minQuestions: null,
      maxQuestions: null,
    };
  }

  const sorted = [...reached].sort((a, b) => a - b);
  const sum = reached.reduce((s, n) => s + n, 0);
  const avg = sum / reached.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  return {
    reached: reached.length,
    notReached,
    avgQuestions: Math.round(avg * 10) / 10, // 1 decimal
    medianQuestions: median,
    minQuestions: sorted[0],
    maxQuestions: sorted[sorted.length - 1],
  };
}
