/**
 * Soulo Enneagram AI Evaluation System - Big Five Mappings
 *
 * Per-type Big Five personality profiles with confidence levels.
 * Used as a cross-validation check: if the system's Enneagram typing
 * doesn't align with observed Big Five traits, it may indicate a mistype.
 */

import type { EnneagramType, BigFiveLevel, BigFiveRange } from '../types';

// ── Types ───────────────────────────────────────────────────────────

export interface BigFiveDimension {
  expected: BigFiveRange;
  confidence: 'high' | 'moderate' | 'low';
  notes: string;
}

export interface BigFiveProfile {
  type_id: EnneagramType;
  openness: BigFiveDimension;
  conscientiousness: BigFiveDimension;
  extraversion: BigFiveDimension;
  agreeableness: BigFiveDimension;
  neuroticism: BigFiveDimension;
  strong_signals: string[];
  misalignment_flags: MisalignmentFlag[];
}

export interface MisalignmentFlag {
  dimension: 'O' | 'C' | 'E' | 'A' | 'N';
  if_observed: BigFiveLevel;
  severity: 'strong' | 'moderate';
  message: string;
}

export interface BigFiveAlignmentResult {
  alignment_score: number; // 0-1
  aligned_dimensions: string[];
  misaligned_dimensions: string[];
  flags: MisalignmentFlag[];
  overall: 'aligned' | 'partial' | 'misaligned';
}

// ── Big Five Profiles by Enneagram Type ─────────────────────────────

export const BIG_FIVE_PROFILES: Record<EnneagramType, BigFiveProfile> = {
  1: {
    type_id: 1,
    openness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '1s appreciate structure and established methods but can be open to better ways of doing things',
    },
    conscientiousness: {
      expected: 'high',
      confidence: 'high',
      notes: '1s are consistently high in conscientiousness - organized, disciplined, principled. This is one of the strongest Big Five signals for type 1.',
    },
    extraversion: {
      expected: 'low-moderate',
      confidence: 'moderate',
      notes: '1s tend toward introversion, preferring measured engagement over spontaneous socializing',
    },
    agreeableness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '1s can be agreeable when standards are met but critical when they are not',
    },
    neuroticism: {
      expected: 'moderate-high',
      confidence: 'moderate',
      notes: '1s experience chronic internal tension from the inner critic, manifesting as resentment and frustration',
    },
    strong_signals: [
      'Very high conscientiousness is the strongest Big Five indicator of type 1',
      'Moderate-high neuroticism with an anger/resentment quality (not anxiety)',
    ],
    misalignment_flags: [
      { dimension: 'C', if_observed: 'low', severity: 'strong', message: 'Low conscientiousness strongly contradicts type 1 - consider 4, 7, or 9' },
      { dimension: 'N', if_observed: 'low', severity: 'moderate', message: 'Low neuroticism is unusual for 1s who typically carry inner tension' },
    ],
  },

  2: {
    type_id: 2,
    openness: {
      expected: 'moderate',
      confidence: 'low',
      notes: '2s vary in openness - some are conventional, others are open to diverse relationships and perspectives',
    },
    conscientiousness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '2s are organized around relationships but may not be systematically orderly in other domains',
    },
    extraversion: {
      expected: 'high',
      confidence: 'high',
      notes: '2s are consistently high in extraversion - they seek connection, are warm, and engage readily with others',
    },
    agreeableness: {
      expected: 'high',
      confidence: 'high',
      notes: '2s are consistently high in agreeableness - warm, empathic, accommodating. This is the strongest Big Five signal for type 2.',
    },
    neuroticism: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '2s experience moderate emotional reactivity, especially around rejection or feeling unappreciated',
    },
    strong_signals: [
      'High agreeableness combined with high extraversion is the strongest Big Five pattern for type 2',
      'Warmth facet of extraversion is especially high',
    ],
    misalignment_flags: [
      { dimension: 'A', if_observed: 'low', severity: 'strong', message: 'Low agreeableness strongly contradicts type 2 - consider 3, 5, or 8' },
      { dimension: 'E', if_observed: 'low', severity: 'strong', message: 'Low extraversion strongly contradicts type 2 - consider 4, 5, or 9' },
    ],
  },

  3: {
    type_id: 3,
    openness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '3s are pragmatically open - they adopt whatever approach leads to success',
    },
    conscientiousness: {
      expected: 'high',
      confidence: 'high',
      notes: '3s are driven, organized, and goal-oriented. High conscientiousness in the achievement-striving facet.',
    },
    extraversion: {
      expected: 'high',
      confidence: 'high',
      notes: '3s are socially assertive, energetic, and comfortable in the spotlight',
    },
    agreeableness: {
      expected: 'low-moderate',
      confidence: 'moderate',
      notes: '3s can appear agreeable strategically but are competitive and may cut corners for results',
    },
    neuroticism: {
      expected: 'low-moderate',
      confidence: 'moderate',
      notes: '3s suppress emotions for efficiency; may score low on surface neuroticism while having hidden anxiety about failure',
    },
    strong_signals: [
      'High conscientiousness + high extraversion + low-moderate agreeableness is the classic 3 pattern',
      'Achievement-striving facet of conscientiousness is especially high',
    ],
    misalignment_flags: [
      { dimension: 'C', if_observed: 'low', severity: 'strong', message: 'Low conscientiousness strongly contradicts type 3 - consider 4, 7, or 9' },
      { dimension: 'E', if_observed: 'low', severity: 'moderate', message: 'Low extraversion is unusual for type 3 unless SP subtype' },
    ],
  },

  4: {
    type_id: 4,
    openness: {
      expected: 'high',
      confidence: 'high',
      notes: '4s are consistently high in openness - aesthetically sensitive, imaginative, and drawn to depth. This is the strongest Big Five signal for type 4.',
    },
    conscientiousness: {
      expected: 'low',
      confidence: 'moderate',
      notes: '4s tend toward lower conscientiousness - they prioritize authenticity and feeling over structure and routine',
    },
    extraversion: {
      expected: 'low',
      confidence: 'moderate',
      notes: '4s are typically introverted, preferring depth over breadth in social connections',
    },
    agreeableness: {
      expected: 'moderate',
      confidence: 'low',
      notes: '4s vary - they can be empathic and sensitive to others, but also self-absorbed and contrarian',
    },
    neuroticism: {
      expected: 'high',
      confidence: 'high',
      notes: '4s are consistently high in neuroticism - emotionally reactive, prone to melancholy, and deeply affected by experiences',
    },
    strong_signals: [
      'High openness + high neuroticism is the strongest Big Five combination for type 4',
      'Low conscientiousness combined with high openness distinguishes from 1',
    ],
    misalignment_flags: [
      { dimension: 'O', if_observed: 'low', severity: 'strong', message: 'Low openness strongly contradicts type 4 - consider 1, 6, or 9' },
      { dimension: 'N', if_observed: 'low', severity: 'strong', message: 'Low neuroticism strongly contradicts type 4 - consider 3, 7, or 9' },
      { dimension: 'C', if_observed: 'high', severity: 'moderate', message: 'High conscientiousness is unusual for type 4 - consider 1 or 3' },
    ],
  },

  5: {
    type_id: 5,
    openness: {
      expected: 'high',
      confidence: 'high',
      notes: '5s are consistently high in openness - intellectually curious, interested in ideas, and drawn to complexity',
    },
    conscientiousness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '5s are methodical in their areas of interest but may neglect practical matters outside their focus',
    },
    extraversion: {
      expected: 'low',
      confidence: 'high',
      notes: '5s are consistently introverted - they need solitude, conserve social energy, and prefer small groups',
    },
    agreeableness: {
      expected: 'low',
      confidence: 'moderate',
      notes: '5s are emotionally detached and can appear cold, unconcerned with social harmony',
    },
    neuroticism: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '5s experience moderate internal anxiety but compartmentalize it effectively; may score lower than felt experience',
    },
    strong_signals: [
      'Low extraversion + high openness is the strongest Big Five combination for type 5',
      'The combination of intellectual openness with social introversion is distinctive',
    ],
    misalignment_flags: [
      { dimension: 'E', if_observed: 'high', severity: 'strong', message: 'High extraversion strongly contradicts type 5 - consider 2, 3, 7, or 8' },
      { dimension: 'O', if_observed: 'low', severity: 'moderate', message: 'Low openness is unusual for type 5 - consider 6 or 9' },
    ],
  },

  6: {
    type_id: 6,
    openness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '6s are moderate in openness - curious but cautious about new ideas until they have been vetted',
    },
    conscientiousness: {
      expected: 'moderate-high',
      confidence: 'moderate',
      notes: '6s are dutiful and responsible, especially in following established procedures and commitments',
    },
    extraversion: {
      expected: 'low-moderate',
      confidence: 'low',
      notes: '6s vary widely - phobic 6s can be quite introverted, counterphobic 6s can be assertive and socially bold',
    },
    agreeableness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '6s can be loyal and warm within trusted circles but skeptical and testing with others',
    },
    neuroticism: {
      expected: 'high',
      confidence: 'high',
      notes: '6s are consistently high in neuroticism - anxious, vigilant, and prone to worry. This is the strongest Big Five signal for type 6.',
    },
    strong_signals: [
      'High neuroticism with an anxiety quality (not anger like 1 or melancholy like 4) is the strongest signal',
      'Moderate-high conscientiousness with a duty/rule-following quality distinguishes from anxious 4s',
    ],
    misalignment_flags: [
      { dimension: 'N', if_observed: 'low', severity: 'strong', message: 'Low neuroticism strongly contradicts type 6 - consider 3, 7, 8, or 9' },
      { dimension: 'C', if_observed: 'low', severity: 'moderate', message: 'Low conscientiousness is unusual for 6s who typically are dutiful and responsible' },
    ],
  },

  7: {
    type_id: 7,
    openness: {
      expected: 'high',
      confidence: 'high',
      notes: '7s are consistently high in openness - enthusiastic about new experiences, ideas, and possibilities',
    },
    conscientiousness: {
      expected: 'low',
      confidence: 'moderate',
      notes: '7s tend toward lower conscientiousness - they resist structure, routine, and constraint, preferring spontaneity',
    },
    extraversion: {
      expected: 'high',
      confidence: 'high',
      notes: '7s are consistently high in extraversion - energetic, gregarious, and stimulation-seeking',
    },
    agreeableness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '7s are generally pleasant and charming but can be self-focused and entitled',
    },
    neuroticism: {
      expected: 'low',
      confidence: 'high',
      notes: '7s consistently score low in neuroticism on self-report measures due to their reframing defense mechanism. They avoid negative emotions effectively.',
    },
    strong_signals: [
      'High extraversion + high openness + low neuroticism is the classic 7 pattern',
      'Low conscientiousness + high openness distinguishes from 3 (who are high C)',
      'Low neuroticism distinguishes from 4 (who shares high openness)',
    ],
    misalignment_flags: [
      { dimension: 'E', if_observed: 'low', severity: 'strong', message: 'Low extraversion strongly contradicts type 7 - consider 4, 5, or 9' },
      { dimension: 'N', if_observed: 'high', severity: 'strong', message: 'High neuroticism strongly contradicts type 7 - consider 4, 6, or 1' },
      { dimension: 'O', if_observed: 'low', severity: 'moderate', message: 'Low openness is unusual for type 7' },
    ],
  },

  8: {
    type_id: 8,
    openness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '8s are pragmatically open - they are open to what works but not necessarily intellectually curious',
    },
    conscientiousness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '8s are decisive and action-oriented but may ignore details and procedures they find constraining',
    },
    extraversion: {
      expected: 'high',
      confidence: 'high',
      notes: '8s are consistently high in extraversion - assertive, dominant, and energetically large',
    },
    agreeableness: {
      expected: 'low',
      confidence: 'high',
      notes: '8s are consistently low in agreeableness - direct, confrontational, and uninterested in social niceties. This is the strongest Big Five signal for type 8.',
    },
    neuroticism: {
      expected: 'low-moderate',
      confidence: 'moderate',
      notes: '8s typically score low on neuroticism - they externalize rather than internalize stress. Anger is accessible but not anxious.',
    },
    strong_signals: [
      'Low agreeableness + high extraversion is the strongest Big Five combination for type 8',
      'Low neuroticism distinguishes from counterphobic 6 (who shares assertiveness but has high N)',
    ],
    misalignment_flags: [
      { dimension: 'A', if_observed: 'high', severity: 'strong', message: 'High agreeableness strongly contradicts type 8 - consider 2, 6, or 9' },
      { dimension: 'E', if_observed: 'low', severity: 'strong', message: 'Low extraversion strongly contradicts type 8 - consider 5 or 9' },
      { dimension: 'N', if_observed: 'high', severity: 'moderate', message: 'High neuroticism is unusual for type 8 - consider counterphobic 6' },
    ],
  },

  9: {
    type_id: 9,
    openness: {
      expected: 'moderate',
      confidence: 'moderate',
      notes: '9s are receptive and open to others\' perspectives but may not actively seek novelty',
    },
    conscientiousness: {
      expected: 'low-moderate',
      confidence: 'moderate',
      notes: '9s can be conscientious about others\' priorities but neglect their own agenda; procrastination is common',
    },
    extraversion: {
      expected: 'moderate',
      confidence: 'low',
      notes: '9s vary widely - they can be social (SO subtype) or withdrawn (SP/SX). Generally moderate and even-keeled.',
    },
    agreeableness: {
      expected: 'high',
      confidence: 'high',
      notes: '9s are consistently high in agreeableness - accommodating, gentle, accepting, and conflict-avoidant',
    },
    neuroticism: {
      expected: 'variable',
      confidence: 'low',
      notes: '9s often score low on self-report neuroticism because they narcotize against negative emotions, but underlying anxiety may be present (especially at disintegration to 6)',
    },
    strong_signals: [
      'High agreeableness with moderate-to-low energy/assertiveness is the strongest Big Five pattern for 9',
      'High agreeableness distinguishes 9 from 5 (who shares withdrawal but has low A)',
    ],
    misalignment_flags: [
      { dimension: 'A', if_observed: 'low', severity: 'strong', message: 'Low agreeableness strongly contradicts type 9 - consider 3, 5, or 8' },
      { dimension: 'E', if_observed: 'high', severity: 'moderate', message: 'High extraversion is unusual for type 9 unless SO subtype' },
    ],
  },
};

// ── Alignment Check Functions ───────────────────────────────────────

/**
 * Convert a BigFiveRange to a numeric value for comparison.
 */
function rangeToNumeric(range: BigFiveRange): number {
  switch (range) {
    case 'low': return 1;
    case 'low-moderate': return 2;
    case 'moderate': return 3;
    case 'moderate-high': return 4;
    case 'high': return 5;
    case 'variable': return 3; // treat as moderate for comparison
  }
}

/**
 * Convert a BigFiveLevel to a numeric value for comparison.
 */
function levelToNumeric(level: BigFiveLevel): number {
  switch (level) {
    case 'low': return 1;
    case 'moderate': return 3;
    case 'high': return 5;
  }
}

/**
 * Check alignment between observed Big Five traits and expected profile for a type.
 *
 * @param typeId - The Enneagram type to check against
 * @param observed - Observed Big Five levels { O, C, E, A, N }
 * @returns Alignment result with score, details, and flags
 */
export function checkBigFiveAlignment(
  typeId: EnneagramType,
  observed: { O: BigFiveLevel; C: BigFiveLevel; E: BigFiveLevel; A: BigFiveLevel; N: BigFiveLevel },
): BigFiveAlignmentResult {
  const profile = BIG_FIVE_PROFILES[typeId];
  const dimensions: { key: 'O' | 'C' | 'E' | 'A' | 'N'; field: keyof BigFiveProfile }[] = [
    { key: 'O', field: 'openness' },
    { key: 'C', field: 'conscientiousness' },
    { key: 'E', field: 'extraversion' },
    { key: 'A', field: 'agreeableness' },
    { key: 'N', field: 'neuroticism' },
  ];

  const aligned: string[] = [];
  const misaligned: string[] = [];
  const flags: MisalignmentFlag[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const dim of dimensions) {
    const expected = profile[dim.field] as BigFiveDimension;
    const observedLevel = observed[dim.key];
    const expectedNumeric = rangeToNumeric(expected.expected);
    const observedNumeric = levelToNumeric(observedLevel);
    const distance = Math.abs(expectedNumeric - observedNumeric);

    // Weight by confidence
    const confidenceWeight = expected.confidence === 'high' ? 1.0
      : expected.confidence === 'moderate' ? 0.7
      : 0.4;

    // Variable expected range always counts as aligned
    if (expected.expected === 'variable') {
      aligned.push(dim.key);
      totalScore += 1.0 * confidenceWeight;
      totalWeight += confidenceWeight;
      continue;
    }

    // Score: 1.0 for exact match, 0.5 for 1 step away, 0.0 for 2+ steps
    const dimScore = distance === 0 ? 1.0
      : distance <= 1 ? 0.75
      : distance <= 2 ? 0.25
      : 0.0;

    totalScore += dimScore * confidenceWeight;
    totalWeight += confidenceWeight;

    if (dimScore >= 0.5) {
      aligned.push(dim.key);
    } else {
      misaligned.push(dim.key);
    }

    // Check misalignment flags
    for (const flag of profile.misalignment_flags) {
      if (flag.dimension === dim.key && flag.if_observed === observedLevel) {
        flags.push(flag);
      }
    }
  }

  const alignmentScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  const overall: 'aligned' | 'partial' | 'misaligned' =
    alignmentScore >= 0.7 ? 'aligned'
    : alignmentScore >= 0.4 ? 'partial'
    : 'misaligned';

  return {
    alignment_score: Math.round(alignmentScore * 100) / 100,
    aligned_dimensions: aligned,
    misaligned_dimensions: misaligned,
    flags,
    overall,
  };
}

/**
 * Find the best-fitting Enneagram types for a given Big Five profile.
 * Returns types sorted by alignment score (best fit first).
 */
export function findBestFitTypes(
  observed: { O: BigFiveLevel; C: BigFiveLevel; E: BigFiveLevel; A: BigFiveLevel; N: BigFiveLevel },
): { type_id: EnneagramType; alignment_score: number; overall: string }[] {
  const results: { type_id: EnneagramType; alignment_score: number; overall: string }[] = [];

  for (let t = 1; t <= 9; t++) {
    const typeId = t as EnneagramType;
    const result = checkBigFiveAlignment(typeId, observed);
    results.push({
      type_id: typeId,
      alignment_score: result.alignment_score,
      overall: result.overall,
    });
  }

  return results.sort((a, b) => b.alignment_score - a.alignment_score);
}

/**
 * Get the strong misalignment flags for a given type and observed profile.
 * Only returns 'strong' severity flags.
 */
export function getStrongMisalignments(
  typeId: EnneagramType,
  observed: { O: BigFiveLevel; C: BigFiveLevel; E: BigFiveLevel; A: BigFiveLevel; N: BigFiveLevel },
): MisalignmentFlag[] {
  const result = checkBigFiveAlignment(typeId, observed);
  return result.flags.filter(f => f.severity === 'strong');
}
