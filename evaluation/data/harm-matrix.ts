/**
 * Soulo Enneagram AI Evaluation System - Harm Matrix
 *
 * Mistype severity lookup for all type pairs. Quantifies the psychological
 * harm potential of mistyping someone, accounting for motivational confusion,
 * growth path misdirection, and identity disruption.
 */

import type { EnneagramType, HarmSeverity, HarmEntry } from '../types';

/**
 * Base harm severity for each mistype pair.
 *
 * Severity factors:
 * - Motivational confusion: How different are the core fears/desires?
 * - Growth misdirection: Does the wrong type point to wrong integration/disintegration?
 * - Identity disruption: Could the mistype reinforce unhealthy patterns?
 * - Triad crossing: Cross-triad mistypes are generally more harmful.
 * - Common confusion: Very commonly confused pairs may have lower harm
 *   because the person may partially relate to both.
 *
 * Scale: 1 (minimal) to 10 (severe)
 */
const HARM_MATRIX: HarmEntry[] = [
  // ── Type 1 mistypes ───────────────────────────────────────────────
  { true_type: 1, mistyped_as: 2, severity: 'high', base_score: 7, rationale: 'Redirects from self-reform to other-focus; hides anger behind helpfulness' },
  { true_type: 1, mistyped_as: 3, severity: 'moderate', base_score: 5, rationale: 'Both are competency-oriented but differ on internal vs external validation' },
  { true_type: 1, mistyped_as: 4, severity: 'high', base_score: 7, rationale: 'Disintegration confusion; may normalize resentment as emotional depth' },
  { true_type: 1, mistyped_as: 5, severity: 'moderate', base_score: 5, rationale: 'Both can be cerebral and detached; misses body-center anger work' },
  { true_type: 1, mistyped_as: 6, severity: 'moderate', base_score: 4, rationale: 'Common confusion; both follow rules but from different motivations' },
  { true_type: 1, mistyped_as: 7, severity: 'high', base_score: 7, rationale: 'Integration confusion; may bypass anger work prematurely' },
  { true_type: 1, mistyped_as: 8, severity: 'moderate', base_score: 5, rationale: 'Same triad; differ on anger expression vs suppression' },
  { true_type: 1, mistyped_as: 9, severity: 'high', base_score: 6, rationale: 'Same triad but opposite relationship to anger; may encourage suppression' },

  // ── Type 2 mistypes ───────────────────────────────────────────────
  { true_type: 2, mistyped_as: 1, severity: 'moderate', base_score: 5, rationale: 'Shifts focus from relational needs to perfectionism' },
  { true_type: 2, mistyped_as: 3, severity: 'moderate', base_score: 4, rationale: 'Same triad; both image-oriented but differ on love vs achievement' },
  { true_type: 2, mistyped_as: 4, severity: 'moderate', base_score: 5, rationale: 'Integration path; may prematurely focus on self vs others' },
  { true_type: 2, mistyped_as: 5, severity: 'critical', base_score: 8, rationale: 'Opposite orientations to people; could reinforce withdrawal from connection' },
  { true_type: 2, mistyped_as: 6, severity: 'moderate', base_score: 4, rationale: 'Both can be loyal and other-oriented but from different core fears' },
  { true_type: 2, mistyped_as: 7, severity: 'moderate', base_score: 5, rationale: 'Both socially engaging but differ on self vs other orientation' },
  { true_type: 2, mistyped_as: 8, severity: 'high', base_score: 7, rationale: 'Disintegration confusion; may normalize aggression rather than owning needs' },
  { true_type: 2, mistyped_as: 9, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both accommodating but differ on active giving vs passive merging' },

  // ── Type 3 mistypes ───────────────────────────────────────────────
  { true_type: 3, mistyped_as: 1, severity: 'moderate', base_score: 5, rationale: 'Both are competency types; misses self-deceit pattern' },
  { true_type: 3, mistyped_as: 2, severity: 'moderate', base_score: 5, rationale: 'Same triad; shifts focus from achievement to relationships' },
  { true_type: 3, mistyped_as: 4, severity: 'high', base_score: 7, rationale: 'Same triad but opposite relationship to image; could destabilize identity' },
  { true_type: 3, mistyped_as: 5, severity: 'high', base_score: 7, rationale: 'Different triads; opposite orientations to action vs observation' },
  { true_type: 3, mistyped_as: 6, severity: 'moderate', base_score: 5, rationale: 'Integration path; may prematurely emphasize loyalty over authenticity' },
  { true_type: 3, mistyped_as: 7, severity: 'moderate', base_score: 4, rationale: 'Common confusion; both high-energy, differ on achievement vs experience' },
  { true_type: 3, mistyped_as: 8, severity: 'moderate', base_score: 5, rationale: 'Both assertive; differ on image management vs direct confrontation' },
  { true_type: 3, mistyped_as: 9, severity: 'high', base_score: 7, rationale: 'Disintegration confusion; may normalize disengagement instead of addressing deceit' },

  // ── Type 4 mistypes ───────────────────────────────────────────────
  { true_type: 4, mistyped_as: 1, severity: 'high', base_score: 6, rationale: 'Integration path; may bypass emotional work prematurely' },
  { true_type: 4, mistyped_as: 2, severity: 'high', base_score: 6, rationale: 'Disintegration confusion; may encourage over-giving vs self-discovery' },
  { true_type: 4, mistyped_as: 3, severity: 'high', base_score: 7, rationale: 'Same triad but opposite; could reinforce inauthenticity they most fear' },
  { true_type: 4, mistyped_as: 5, severity: 'moderate', base_score: 4, rationale: 'Common confusion; both withdrawn but differ on feeling vs thinking' },
  { true_type: 4, mistyped_as: 6, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both can be reactive and anxious' },
  { true_type: 4, mistyped_as: 7, severity: 'critical', base_score: 8, rationale: 'Opposite relationship to pain; could encourage emotional bypassing' },
  { true_type: 4, mistyped_as: 8, severity: 'high', base_score: 7, rationale: 'Different triads; misses emotional depth work entirely' },
  { true_type: 4, mistyped_as: 9, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both withdrawn but differ on emotional amplification vs dampening' },

  // ── Type 5 mistypes ───────────────────────────────────────────────
  { true_type: 5, mistyped_as: 1, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both cerebral but differ on observation vs reform' },
  { true_type: 5, mistyped_as: 2, severity: 'critical', base_score: 9, rationale: 'Opposite orientations; could force engagement that drains/overwhelms' },
  { true_type: 5, mistyped_as: 3, severity: 'high', base_score: 7, rationale: 'Different triads; could force image focus that feels inauthentic' },
  { true_type: 5, mistyped_as: 4, severity: 'moderate', base_score: 4, rationale: 'Common confusion; both withdrawn, differ on emotional stance' },
  { true_type: 5, mistyped_as: 6, severity: 'moderate', base_score: 4, rationale: 'Same triad; both head types but differ on knowledge vs security' },
  { true_type: 5, mistyped_as: 7, severity: 'high', base_score: 6, rationale: 'Disintegration confusion; may encourage scattering vs depth' },
  { true_type: 5, mistyped_as: 8, severity: 'high', base_score: 6, rationale: 'Integration path; may push intensity before readiness' },
  { true_type: 5, mistyped_as: 9, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both withdrawn and low-energy' },

  // ── Type 6 mistypes ───────────────────────────────────────────────
  { true_type: 6, mistyped_as: 1, severity: 'moderate', base_score: 4, rationale: 'Common confusion; both rule-followers but from anxiety vs principle' },
  { true_type: 6, mistyped_as: 2, severity: 'moderate', base_score: 5, rationale: 'Both loyal but differ on security vs love-seeking' },
  { true_type: 6, mistyped_as: 3, severity: 'high', base_score: 6, rationale: 'Disintegration confusion; may push performance over addressing anxiety' },
  { true_type: 6, mistyped_as: 4, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both reactive but differ on anxiety vs identity' },
  { true_type: 6, mistyped_as: 5, severity: 'moderate', base_score: 4, rationale: 'Same triad; both head types, differ on fear management strategies' },
  { true_type: 6, mistyped_as: 7, severity: 'high', base_score: 6, rationale: 'Same triad; differ on confronting vs avoiding fear' },
  { true_type: 6, mistyped_as: 8, severity: 'high', base_score: 7, rationale: 'CP6/8 confusion; misses underlying anxiety and projects false strength' },
  { true_type: 6, mistyped_as: 9, severity: 'moderate', base_score: 5, rationale: 'Integration confusion; may encourage passivity over addressing fear' },

  // ── Type 7 mistypes ───────────────────────────────────────────────
  { true_type: 7, mistyped_as: 1, severity: 'high', base_score: 6, rationale: 'Disintegration confusion; may impose rigidity on freedom-seeking' },
  { true_type: 7, mistyped_as: 2, severity: 'moderate', base_score: 5, rationale: 'Both socially engaging; differ on self vs other focus' },
  { true_type: 7, mistyped_as: 3, severity: 'moderate', base_score: 4, rationale: 'Common confusion; both high-energy achievers but differ on motivation' },
  { true_type: 7, mistyped_as: 4, severity: 'critical', base_score: 8, rationale: 'Opposite relationship to pain; could pathologize natural reframing' },
  { true_type: 7, mistyped_as: 5, severity: 'high', base_score: 6, rationale: 'Integration path; may push premature depth-focus' },
  { true_type: 7, mistyped_as: 6, severity: 'moderate', base_score: 5, rationale: 'Same triad; differ on optimism vs anxiety' },
  { true_type: 7, mistyped_as: 8, severity: 'moderate', base_score: 5, rationale: 'Both assertive and intense; differ on engagement vs avoidance of pain' },
  { true_type: 7, mistyped_as: 9, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both positive outlook but differ on energy levels' },

  // ── Type 8 mistypes ───────────────────────────────────────────────
  { true_type: 8, mistyped_as: 1, severity: 'moderate', base_score: 5, rationale: 'Same triad; both justice-oriented but differ on anger expression' },
  { true_type: 8, mistyped_as: 2, severity: 'high', base_score: 6, rationale: 'Integration path; may prematurely soften before trust is built' },
  { true_type: 8, mistyped_as: 3, severity: 'moderate', base_score: 5, rationale: 'Both assertive; differ on power vs image' },
  { true_type: 8, mistyped_as: 4, severity: 'critical', base_score: 8, rationale: 'Different triads; could pathologize strength and force vulnerability' },
  { true_type: 8, mistyped_as: 5, severity: 'high', base_score: 7, rationale: 'Disintegration confusion; may encourage withdrawal in someone who needs engagement' },
  { true_type: 8, mistyped_as: 6, severity: 'high', base_score: 7, rationale: 'CP6/8 confusion from the other side; undermines natural authority with doubt' },
  { true_type: 8, mistyped_as: 7, severity: 'moderate', base_score: 5, rationale: 'Both intense and assertive; differ on intensity vs avoidance' },
  { true_type: 8, mistyped_as: 9, severity: 'high', base_score: 7, rationale: 'Same triad; opposite anger orientations; could suppress natural power' },

  // ── Type 9 mistypes ───────────────────────────────────────────────
  { true_type: 9, mistyped_as: 1, severity: 'high', base_score: 6, rationale: 'Same triad; could impose inner critic on someone who needs self-assertion' },
  { true_type: 9, mistyped_as: 2, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both accommodating but differ on active vs passive' },
  { true_type: 9, mistyped_as: 3, severity: 'high', base_score: 6, rationale: 'Integration path; may push achievement before building self-awareness' },
  { true_type: 9, mistyped_as: 4, severity: 'high', base_score: 7, rationale: 'Could amplify emotions in someone who needs grounding' },
  { true_type: 9, mistyped_as: 5, severity: 'moderate', base_score: 5, rationale: 'Common confusion; both withdrawn but differ on intentional vs passive withdrawal' },
  { true_type: 9, mistyped_as: 6, severity: 'moderate', base_score: 5, rationale: 'Disintegration confusion; may introduce anxiety in someone seeking peace' },
  { true_type: 9, mistyped_as: 7, severity: 'moderate', base_score: 5, rationale: 'Both numbing strategies; differ on comfort vs stimulation' },
  { true_type: 9, mistyped_as: 8, severity: 'critical', base_score: 8, rationale: 'Same triad but opposite; could push aggression on someone who needs gentle self-assertion' },
];

// ── Build lookup map ────────────────────────────────────────────────

const harmLookup = new Map<string, HarmEntry>();
for (const entry of HARM_MATRIX) {
  harmLookup.set(`${entry.true_type}->${entry.mistyped_as}`, entry);
}

/**
 * Get the harm severity of a mistype, optionally amplified by health level.
 *
 * Health level amplification:
 * - Levels 1-3 (healthy): base score * 0.8 (more resilience, less harm)
 * - Levels 4-6 (average): base score * 1.0 (standard harm)
 * - Levels 7-9 (unhealthy): base score * 1.3 (less resilience, more harm)
 *
 * @param trueType - The person's actual Enneagram type
 * @param mistypedAs - The type they were incorrectly assigned
 * @param healthLevel - Optional health level (1-9) for harm amplification
 * @returns Harm entry with adjusted score, or null if same type
 */
export function getHarmSeverity(
  trueType: EnneagramType,
  mistypedAs: EnneagramType,
  healthLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
): (HarmEntry & { adjusted_score: number }) | null {
  if (trueType === mistypedAs) return null;

  const entry = harmLookup.get(`${trueType}->${mistypedAs}`);
  if (!entry) {
    // Fallback for any missing pairs
    return {
      true_type: trueType,
      mistyped_as: mistypedAs,
      severity: 'moderate',
      base_score: 5,
      rationale: 'No specific harm assessment available for this pair',
      adjusted_score: 5,
    };
  }

  let amplifier = 1.0;
  if (healthLevel !== undefined) {
    if (healthLevel <= 3) {
      amplifier = 0.8;
    } else if (healthLevel >= 7) {
      amplifier = 1.3;
    }
  }

  const adjustedScore = Math.min(10, Math.round(entry.base_score * amplifier * 10) / 10);

  return {
    ...entry,
    adjusted_score: adjustedScore,
  };
}

/**
 * Get all mistype pairs sorted by severity (most harmful first).
 */
export function getMostHarmfulMistypes(): HarmEntry[] {
  return [...HARM_MATRIX].sort((a, b) => b.base_score - a.base_score);
}

/**
 * Get the harm severity classification for a numeric score.
 */
export function classifyHarmScore(score: number): HarmSeverity {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'moderate';
  return 'low';
}

/**
 * Get all mistypes for a given true type, sorted by severity.
 */
export function getMistypesForType(trueType: EnneagramType): HarmEntry[] {
  return HARM_MATRIX
    .filter(e => e.true_type === trueType)
    .sort((a, b) => b.base_score - a.base_score);
}

/**
 * Get all cases where a given type is the mistype target, sorted by severity.
 */
export function getMistypedAsType(targetType: EnneagramType): HarmEntry[] {
  return HARM_MATRIX
    .filter(e => e.mistyped_as === targetType)
    .sort((a, b) => b.base_score - a.base_score);
}

export { HARM_MATRIX };
