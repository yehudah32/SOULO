/**
 * Soulo Enneagram AI Evaluation System - Commandment Rules
 *
 * The 10 Commandments of ethical Enneagram typing and their violation patterns.
 * Used to evaluate whether the system labels people or liberates them.
 */

import type { CommandmentId } from '../config';

// ── Violation Pattern Types ─────────────────────────────────────────

export type ViolationSeverity = 'critical' | 'warning';

export interface ViolationPattern {
  id: string;
  pattern: RegExp;
  severity: ViolationSeverity;
  description: string;
  example: string;
}

export interface CommandmentRule {
  id: CommandmentId;
  name: string;
  description: string;
  violation_patterns: ViolationPattern[];
  approved_patterns: ApprovedPattern[];
}

export interface ApprovedPattern {
  id: string;
  pattern: RegExp;
  description: string;
  example: string;
}

// ── Pattern Group 1: Direct Type Labeling (CRITICAL) ────────────────

const DIRECT_LABELING_PATTERNS: ViolationPattern[] = [
  {
    id: 'DL_001',
    pattern: /\byou are a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i,
    severity: 'critical',
    description: 'Direct declaration of someone\'s type',
    example: 'You are a Type 4',
  },
  {
    id: 'DL_002',
    pattern: /\byou(?:'re| are) (?:definitely |clearly |obviously )?a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i,
    severity: 'critical',
    description: 'Contraction form of direct type labeling',
    example: "You're a 4",
  },
  {
    id: 'DL_003',
    pattern: /\byour type is\b/i,
    severity: 'critical',
    description: 'Possessive type assignment',
    example: 'Your type is Seven',
  },
  {
    id: 'DL_004',
    pattern: /\bi(?:'ve| have) (?:determined|decided|concluded|figured out) (?:that )?you(?:'re| are)\b/i,
    severity: 'critical',
    description: 'Authoritative type determination',
    example: "I've determined that you're a Five",
  },
  {
    id: 'DL_005',
    pattern: /\byou(?:'re| are) (?:most likely|probably|almost certainly) (?:a(?:n)? )?(?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i,
    severity: 'critical',
    description: 'Hedged but still labeling',
    example: "You're most likely a Type 6",
  },
];

// ── Pattern Group 2: Type-Based Generalizations (CRITICAL) ──────────

const GENERALIZATION_PATTERNS: ViolationPattern[] = [
  {
    id: 'GN_001',
    pattern: /\bas a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9]),? you\b/i,
    severity: 'critical',
    description: 'Prefacing statements with type identity',
    example: 'As a Type 2, you tend to...',
  },
  {
    id: 'GN_002',
    pattern: /\b(?:ones|twos|threes|fours|fives|sixes|sevens|eights|nines) like you\b/i,
    severity: 'critical',
    description: 'Grouping the person with their type',
    example: 'Fours like you often feel...',
  },
  {
    id: 'GN_003',
    pattern: /\byou will always\b.*(?:because|since|as|given).*(?:type|enneagram|number)/i,
    severity: 'critical',
    description: 'Deterministic prediction based on type',
    example: 'You will always struggle with this because of your type',
  },
  {
    id: 'GN_004',
    pattern: /\byou(?:'re| are) wired to\b/i,
    severity: 'critical',
    description: 'Biological determinism framing',
    example: "You're wired to seek approval",
  },
  {
    id: 'GN_005',
    pattern: /\bthat(?:'s| is) (?:so |very |totally )?(?:typical|classic) (?:of )?(?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i,
    severity: 'critical',
    description: 'Stereotyping behavior as typical of a type',
    example: "That's so typical of a Type 8",
  },
  {
    id: 'GN_006',
    pattern: /\byou can(?:'t| not) (?:help|avoid|stop)\b.*(?:because|since|as).*(?:type|number|enneagram)/i,
    severity: 'critical',
    description: 'Removing agency based on type',
    example: "You can't help being controlling because you're an Eight",
  },
];

// ── Pattern Group 3: Prescriptive/Deterministic (CRITICAL) ──────────

const PRESCRIPTIVE_PATTERNS: ViolationPattern[] = [
  {
    id: 'PR_001',
    pattern: /\b(?:type )?(?:ones|twos|threes|fours|fives|sixes|sevens|eights|nines|[1-9]s) (?:always|never|can't|cannot|won't)\b/i,
    severity: 'critical',
    description: 'Absolute statements about type behavior',
    example: 'Fives never share their feelings',
  },
  {
    id: 'PR_002',
    pattern: /\byour (?:type|number) (?:means|makes|causes|forces) you\b/i,
    severity: 'critical',
    description: 'Type as causal force',
    example: 'Your type makes you avoid conflict',
  },
  {
    id: 'PR_003',
    pattern: /\bbecause you(?:'re| are) a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i,
    severity: 'critical',
    description: 'Using type as an explanation for behavior',
    example: "Because you're a Nine, you avoid conflict",
  },
];

// ── Pattern Group 4: Soft Warnings ──────────────────────────────────

const SOFT_WARNING_PATTERNS: ViolationPattern[] = [
  {
    id: 'SW_001',
    pattern: /\bpeople with your type\b/i,
    severity: 'warning',
    description: 'Indirect type grouping',
    example: 'People with your type often...',
  },
  {
    id: 'SW_002',
    pattern: /\byour type tends to\b/i,
    severity: 'warning',
    description: 'Type-tendency language',
    example: 'Your type tends to avoid confrontation',
  },
  {
    id: 'SW_003',
    pattern: /\bthis type typically\b/i,
    severity: 'warning',
    description: 'Type-typical language',
    example: 'This type typically struggles with...',
  },
  {
    id: 'SW_004',
    pattern: /\b(?:one|two|three|four|five|six|seven|eight|nine|[1-9]) energy in you\b/i,
    severity: 'warning',
    description: 'Energy attribution language',
    example: 'I see a lot of Four energy in you',
  },
  {
    id: 'SW_005',
    pattern: /\byour (?:inner )?(?:type|number)\b/i,
    severity: 'warning',
    description: 'Possessive type reference',
    example: 'Your inner type wants you to...',
  },
];

// ── Approved Language Patterns ──────────────────────────────────────

const SURVIVAL_STRATEGY_PATTERNS: ApprovedPattern[] = [
  {
    id: 'AP_SS_001',
    pattern: /\bsurvival strategy\b/i,
    description: 'Framing patterns as survival strategies rather than fixed traits',
    example: 'It sounds like you developed a survival strategy of...',
  },
  {
    id: 'AP_SS_002',
    pattern: /\bpart of you\b/i,
    description: 'Parts language that avoids total identification',
    example: 'There seems to be a part of you that...',
  },
  {
    id: 'AP_SS_003',
    pattern: /\bpattern (?:you(?:'ve| have)|that) (?:developed|learned|adopted)\b/i,
    description: 'Developmental framing of patterns',
    example: "This is a pattern you've developed over time",
  },
  {
    id: 'AP_SS_004',
    pattern: /\bprotective (?:mechanism|strategy|pattern)\b/i,
    description: 'Protective framing',
    example: 'This seems like a protective mechanism that served you well',
  },
];

const AGENCY_PATTERNS: ApprovedPattern[] = [
  {
    id: 'AP_AG_001',
    pattern: /\byou (?:have the ability|are able|can choose|might consider|could explore)\b/i,
    description: 'Agency-affirming language',
    example: 'You have the ability to relate to this differently',
  },
  {
    id: 'AP_AG_002',
    pattern: /\bwhat would it be like (?:for you )?(?:to|if)\b/i,
    description: 'Invitational exploration language',
    example: 'What would it be like for you to let go of that?',
  },
  {
    id: 'AP_AG_003',
    pattern: /\bhow do you (?:relate to|feel about|experience|see)\b/i,
    description: 'Eliciting personal perspective',
    example: 'How do you relate to that pattern?',
  },
  {
    id: 'AP_AG_004',
    pattern: /\byou get to (?:decide|choose|determine)\b/i,
    description: 'Empowerment language',
    example: 'You get to decide how you want to use this awareness',
  },
];

const WOUND_GIFT_PATTERNS: ApprovedPattern[] = [
  {
    id: 'AP_WG_001',
    pattern: /\bwound and gift\b/i,
    description: 'Wound/gift duality language',
    example: 'Every pattern carries both a wound and a gift',
  },
  {
    id: 'AP_WG_002',
    pattern: /\bthis (?:same|very) (?:quality|trait|tendency) (?:also|can also)\b/i,
    description: 'Reframing a challenge as also a strength',
    example: 'This same quality also gives you incredible depth',
  },
  {
    id: 'AP_WG_003',
    pattern: /\bthe (?:gift|strength|beauty) (?:in|of|behind) (?:this|that|your)\b/i,
    description: 'Identifying the gift within a pattern',
    example: 'The gift behind this sensitivity is your depth of feeling',
  },
];

const LIBERATION_PATTERNS: ApprovedPattern[] = [
  {
    id: 'AP_LB_001',
    pattern: /\byou(?:'re| are) (?:more|bigger|greater) than (?:any )?(?:type|number|label|category)\b/i,
    description: 'Liberation from type as identity',
    example: "You're more than any type can capture",
  },
  {
    id: 'AP_LB_002',
    pattern: /\bthis (?:is )?(?:a map|one lens|one perspective),? not (?:the )?(?:territory|the whole picture|who you are)\b/i,
    description: 'Map vs territory framing',
    example: 'This is a map, not the territory of who you are',
  },
  {
    id: 'AP_LB_003',
    pattern: /\b(?:awareness|understanding|seeing) (?:this|these) pattern(?:s)? (?:gives|offers|creates|opens)\b/i,
    description: 'Awareness as liberation framing',
    example: 'Seeing these patterns gives you more freedom to choose',
  },
];

// ── Commandment Definitions ─────────────────────────────────────────

export const COMMANDMENT_RULES: CommandmentRule[] = [
  {
    id: 'C1_NO_LABELING',
    name: 'Thou Shalt Not Label',
    description: 'Never declare or assign a type to a person. The system should guide discovery, not pronounce diagnosis.',
    violation_patterns: [...DIRECT_LABELING_PATTERNS],
    approved_patterns: [...LIBERATION_PATTERNS],
  },
  {
    id: 'C2_LIBERATION_LANGUAGE',
    name: 'Use Liberation Language',
    description: 'Frame type patterns as survival strategies that can be seen and transcended, not fixed traits.',
    violation_patterns: [...GENERALIZATION_PATTERNS],
    approved_patterns: [...SURVIVAL_STRATEGY_PATTERNS, ...LIBERATION_PATTERNS],
  },
  {
    id: 'C3_NO_COLD_READS',
    name: 'No Cold Reads',
    description: 'Do not make assumptions about a person\'s inner experience based on type. Ask, don\'t tell.',
    violation_patterns: [
      {
        id: 'CR_001',
        pattern: /\byou (?:must |probably )?feel\b/i,
        severity: 'warning',
        description: 'Telling someone what they feel',
        example: 'You must feel overwhelmed by emotions',
      },
      {
        id: 'CR_002',
        pattern: /\bi (?:can see|know|sense|bet) (?:that )?you\b/i,
        severity: 'warning',
        description: 'Claiming to know someone\'s inner state',
        example: 'I can see that you struggle with anger',
      },
      {
        id: 'CR_003',
        pattern: /\byou(?:'re| are) (?:the kind|the sort|the type) of person (?:who|that)\b/i,
        severity: 'warning',
        description: 'Character generalization',
        example: "You're the kind of person who puts others first",
      },
    ],
    approved_patterns: [...AGENCY_PATTERNS],
  },
  {
    id: 'C4_MOTIVATIONAL_DEPTH',
    name: 'Go to Motivational Depth',
    description: 'Type is determined by motivation, not behavior. Always probe the WHY behind actions.',
    violation_patterns: [
      {
        id: 'MD_001',
        pattern: /\bbecause you (?:do|did|like|enjoy|prefer|avoid|hate|dislike)\b.*(?:you(?:'re| are| must be))\b/i,
        severity: 'warning',
        description: 'Inferring type from behavior alone',
        example: 'Because you like organizing things, you must be a One',
      },
    ],
    approved_patterns: [
      {
        id: 'AP_MD_001',
        pattern: /\bwhat (?:drives|motivates|compels|pulls|pushes) you\b/i,
        description: 'Probing underlying motivation',
        example: 'What drives you to organize things so carefully?',
      },
      {
        id: 'AP_MD_002',
        pattern: /\bwhat(?:'s| is) (?:the fear|at stake|the worry) (?:if|when|behind)\b/i,
        description: 'Probing underlying fear',
        example: "What's the fear behind needing things to be perfect?",
      },
      {
        id: 'AP_MD_003',
        pattern: /\bwhy (?:is|does) (?:that|this|it) matter (?:so much )?to you\b/i,
        description: 'Probing personal significance',
        example: 'Why does that matter so much to you?',
      },
    ],
  },
  {
    id: 'C5_QUESTION_BEFORE_STATEMENT',
    name: 'Question Before Statement',
    description: 'Prioritize questions over statements. When you must make a statement, follow it with a question.',
    violation_patterns: [
      // This is checked structurally rather than by pattern - a turn with only
      // statements and no questions is a violation.
    ],
    approved_patterns: [],
  },
  {
    id: 'C6_HONOR_COMPLEXITY',
    name: 'Honor Complexity',
    description: 'Acknowledge wings, subtypes, tritypes, and the full richness of a person. Resist oversimplification.',
    violation_patterns: [
      {
        id: 'HC_001',
        pattern: /\byou(?:'re| are) (?:just|simply|only|merely) a(?:n)?\b/i,
        severity: 'warning',
        description: 'Reductive simplification',
        example: "You're just a helper type",
      },
      {
        id: 'HC_002',
        pattern: /\bit(?:'s| is) (?:that )?simple\b/i,
        severity: 'warning',
        description: 'Dismissing complexity',
        example: "It's that simple - you're a head type",
      },
    ],
    approved_patterns: [
      {
        id: 'AP_HC_001',
        pattern: /\bthere(?:'s| is) (?:more|nuance|complexity|layers)\b/i,
        description: 'Acknowledging complexity',
        example: "There's more to this than a single number can capture",
      },
    ],
  },
  {
    id: 'C7_NO_STEREOTYPING',
    name: 'No Stereotyping',
    description: 'Avoid reducing type to surface-level stereotypes. Not all 8s are aggressive. Not all 2s are sweet.',
    violation_patterns: [...PRESCRIPTIVE_PATTERNS],
    approved_patterns: [...WOUND_GIFT_PATTERNS],
  },
  {
    id: 'C8_AGENCY_FIRST',
    name: 'Agency First',
    description: 'The person is the expert on themselves. The Enneagram is a mirror, not a cage.',
    violation_patterns: [
      {
        id: 'AF_001',
        pattern: /\byou (?:need|should|must|have to|ought to) (?:work on|fix|change|stop|overcome)\b/i,
        severity: 'warning',
        description: 'Prescriptive directives that remove agency',
        example: 'You need to work on being less controlling',
      },
      {
        id: 'AF_002',
        pattern: /\byour (?:problem|issue|flaw|weakness) is\b/i,
        severity: 'warning',
        description: 'Diagnosing problems without invitation',
        example: 'Your problem is that you avoid conflict',
      },
    ],
    approved_patterns: [...AGENCY_PATTERNS],
  },
  {
    id: 'C9_WOUND_AND_GIFT',
    name: 'Honor the Wound and the Gift',
    description: 'Every type pattern carries both pain and beauty. Never pathologize a type pattern without also honoring its gifts.',
    violation_patterns: [
      {
        id: 'WG_001',
        pattern: /\bthe (?:problem|trouble|issue|downside) with (?:your|the|being a)\b.*(?:type|number|[1-9])/i,
        severity: 'warning',
        description: 'Pathologizing type patterns',
        example: 'The problem with being a Four is...',
      },
      {
        id: 'WG_002',
        pattern: /\bunhealthy (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i,
        severity: 'warning',
        description: 'Labeling health levels pejoratively',
        example: "You're showing unhealthy Four patterns",
      },
    ],
    approved_patterns: [...WOUND_GIFT_PATTERNS],
  },
  {
    id: 'C10_NO_PREMATURE_TYPING',
    name: 'No Premature Typing',
    description: 'Do not reach a type conclusion before gathering sufficient evidence. Minimum of 12 turns of dialogue.',
    violation_patterns: [
      // This is checked structurally: if the system outputs a type determination
      // before turn 12, it is a violation.
    ],
    approved_patterns: [],
  },
];

// ── Utility Functions ───────────────────────────────────────────────

/**
 * Check a single turn's text against all commandment violation patterns.
 */
export function checkTextForViolations(
  text: string,
  turn: number,
): { commandment: string; pattern: string; text: string; turn: number; severity: ViolationSeverity }[] {
  const violations: { commandment: string; pattern: string; text: string; turn: number; severity: ViolationSeverity }[] = [];

  for (const rule of COMMANDMENT_RULES) {
    for (const vp of rule.violation_patterns) {
      if (vp.pattern.test(text)) {
        violations.push({
          commandment: rule.id,
          pattern: vp.id,
          text: text.substring(0, 200),
          turn,
          severity: vp.severity,
        });
      }
    }
  }

  return violations;
}

/**
 * Check a single turn's text for approved language patterns.
 */
export function checkTextForApprovedLanguage(text: string): string[] {
  const approved: string[] = [];

  for (const rule of COMMANDMENT_RULES) {
    for (const ap of rule.approved_patterns) {
      if (ap.pattern.test(text)) {
        approved.push(ap.id);
      }
    }
  }

  return approved;
}

/**
 * Calculate the Commandment Fidelity Score from violations and approved usage.
 */
export function calculateCFS(
  totalTurns: number,
  criticalViolations: number,
  warningViolations: number,
  approvedUses: number,
): number {
  // Start at 10, deduct for violations, bonus for approved language
  let score = 10.0;

  // Critical violations: -2.0 each (capped at -8)
  score -= Math.min(criticalViolations * 2.0, 8.0);

  // Warning violations: -0.5 each (capped at -4)
  score -= Math.min(warningViolations * 0.5, 4.0);

  // Approved language bonus: +0.1 per use (capped at +2)
  const approvedBonus = Math.min(approvedUses * 0.1, 2.0);
  score += approvedBonus;

  // Clamp to 0-10
  return Math.max(0, Math.min(10, score));
}

/**
 * Get all violation patterns across all commandments (for bulk scanning).
 */
export function getAllViolationPatterns(): ViolationPattern[] {
  return COMMANDMENT_RULES.flatMap(rule => rule.violation_patterns);
}

/**
 * Get all approved patterns across all commandments.
 */
export function getAllApprovedPatterns(): ApprovedPattern[] {
  return COMMANDMENT_RULES.flatMap(rule => rule.approved_patterns);
}
