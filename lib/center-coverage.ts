// ─────────────────────────────────────────────────────────────────────────
// CENTER COVERAGE — Phase 9
// ─────────────────────────────────────────────────────────────────────────
//
// Tracks how many questions have been asked from each center in the current
// assessment session. Distinct from vector v2's per-center *score race*
// (which tracks evidence accumulation): coverage is about question
// distribution, scores are about user response signal.
//
// Used by:
//   - The selection rerank in lib/decision-tree.ts to penalize the
//     most-covered center on the next turn (steers toward balance)
//   - The simulator's "Center Coverage" inspector panel
//   - The closing criteria's all_centers_probed gate (which was
//     previously a ghost field — never written by anything)

import type { TargetCenter } from './fallback-questions';

export interface CenterCoverage {
  Body: number;
  Heart: number;
  Head: number;
  Cross: number;
  /** Total NON-cross questions (the denominator for rerank decisions). */
  totalTargeted: number;
  /** Total questions asked, including cross. */
  total: number;
}

export interface AskedEntry {
  targetCenter?: TargetCenter | null;
}

/** Compute the per-center coverage from the session's allQuestionsAsked. */
export function getCenterCoverage(asked: AskedEntry[] | undefined | null): CenterCoverage {
  const cov: CenterCoverage = { Body: 0, Heart: 0, Head: 0, Cross: 0, totalTargeted: 0, total: 0 };
  if (!asked) return cov;
  for (const q of asked) {
    cov.total++;
    const c = q.targetCenter ?? 'Cross';
    if (c === 'Body') { cov.Body++; cov.totalTargeted++; }
    else if (c === 'Heart') { cov.Heart++; cov.totalTargeted++; }
    else if (c === 'Head') { cov.Head++; cov.totalTargeted++; }
    else cov.Cross++;
  }
  return cov;
}

/**
 * Returns which center has been MOST covered so far (excluding Cross).
 * Used by the selection rerank to penalize that center on the next turn.
 * Returns null if there's a tie or no targeted questions yet.
 */
export function getMostCoveredCenter(cov: CenterCoverage): 'Body' | 'Heart' | 'Head' | null {
  if (cov.totalTargeted === 0) return null;
  const entries = [
    { c: 'Body' as const, n: cov.Body },
    { c: 'Heart' as const, n: cov.Heart },
    { c: 'Head' as const, n: cov.Head },
  ].sort((a, b) => b.n - a.n);
  // No clear leader → don't steer
  if (entries[0].n === entries[1].n) return null;
  return entries[0].c;
}

/**
 * Returns which center has been LEAST covered so far (excluding Cross).
 * Used by the cache key so caching is center-aware: when we steer toward
 * a different least-covered center, the cache should miss correctly.
 */
export function getLeastCoveredCenter(cov: CenterCoverage): 'Body' | 'Heart' | 'Head' {
  const entries = [
    { c: 'Body' as const, n: cov.Body },
    { c: 'Heart' as const, n: cov.Heart },
    { c: 'Head' as const, n: cov.Head },
  ].sort((a, b) => a.n - b.n);
  return entries[0].c;
}

/**
 * Are all three centers probed at least once? Used to populate the
 * `all_centers_probed` closing criterion that was previously never set.
 */
export function allCentersProbed(cov: CenterCoverage): boolean {
  return cov.Body >= 1 && cov.Heart >= 1 && cov.Head >= 1;
}

/**
 * Returns true if the LAST `n` questions all targeted the same center.
 * Used by the selection rerank's "no more than 2 consecutive from the
 * same center" hard cap (the mildly-skewed treatment from Step 0).
 */
export function lastNFromSameCenter(asked: AskedEntry[] | undefined | null, n: number): TargetCenter | null {
  if (!asked || asked.length < n) return null;
  const tail = asked.slice(-n);
  const first = tail[0].targetCenter ?? 'Cross';
  if (first === 'Cross') return null; // Cross runs don't count for the cap
  for (const q of tail) {
    if ((q.targetCenter ?? 'Cross') !== first) return null;
  }
  return first;
}
