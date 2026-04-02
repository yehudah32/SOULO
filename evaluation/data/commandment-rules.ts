/**
 * Soulo Enneagram AI Evaluation System — Commandment Rules
 *
 * The 10 Commandments of the Defy Your Number system from DYN_COMMANDMENTS.md.
 * These are the AUTHORITATIVE philosophical guardrails. Every piece of
 * AI-generated content must comply. If it violates any commandment, it fails.
 *
 * Source: DYN_COMMANDMENTS.md (project root)
 */

import type { CommandmentId } from '../config';

// ── Types ──────────────────────────────────────────────────────────────

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
  full_text: string;
  rule: string;
  violation_patterns: ViolationPattern[];
  approved_patterns: ApprovedPattern[];
}

export interface ApprovedPattern {
  id: string;
  pattern: RegExp;
  description: string;
  example: string;
}

// ═══════════════════════════════════════════════════════════════════════
// THE 10 COMMANDMENTS — From DYN_COMMANDMENTS.md
// ═══════════════════════════════════════════════════════════════════════

export const COMMANDMENT_RULES: CommandmentRule[] = [

  // ── I. You Are Not a Number ──────────────────────────────────────────
  {
    id: 'I',
    name: 'You Are Not a Number',
    full_text: 'The Enneagram is not an identity. It is not who you are. It is who you are NOT. It is a map of where you go when fear runs the show.',
    rule: 'Never say "you are a Type X." Never frame type as identity. Always frame it as a survival strategy the person built.',
    violation_patterns: [
      // Direct identity assignment
      { id: 'I_001', pattern: /\byou are a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i, severity: 'critical', description: 'Direct type identity assignment', example: 'You are a Type 4' },
      { id: 'I_002', pattern: /\byou(?:'re| are) (?:definitely |clearly |obviously )?a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9])\b/i, severity: 'critical', description: 'Contraction form of type labeling', example: "You're a 4" },
      { id: 'I_003', pattern: /\byour type is\b/i, severity: 'critical', description: 'Possessive type assignment', example: 'Your type is Seven' },
      { id: 'I_004', pattern: /\byour (?:enneagram )?number is\b/i, severity: 'critical', description: 'Number assignment', example: 'Your number is 6' },
      { id: 'I_005', pattern: /\bi(?:'ve| have) (?:determined|decided|concluded) (?:that )?you(?:'re| are)\b/i, severity: 'critical', description: 'Authoritative type determination', example: "I've determined you're a Five" },
      // Identity noun usage
      { id: 'I_006', pattern: /\bas a(?:n)? (?:type )?(?:one|two|three|four|five|six|seven|eight|nine|[1-9]),? you\b/i, severity: 'critical', description: 'Prefacing with type identity', example: 'As a Type 2, you tend to...' },
      { id: 'I_007', pattern: /\b(?:ones|twos|threes|fours|fives|sixes|sevens|eights|nines) like you\b/i, severity: 'critical', description: 'Grouping person with type', example: 'Fours like you often feel...' },
      // Soft identity fusion (warnings)
      { id: 'I_008', pattern: /\bpeople with your type\b/i, severity: 'warning', description: 'Indirect type grouping', example: 'People with your type often...' },
      { id: 'I_009', pattern: /\byour type tends to\b/i, severity: 'warning', description: 'Type-tendency language', example: 'Your type tends to avoid confrontation' },
    ],
    approved_patterns: [
      { id: 'I_AP_001', pattern: /\bsurvival strategy\b/i, description: 'Survival strategy framing', example: 'The survival strategy you built...' },
      { id: 'I_AP_002', pattern: /\bpattern.{0,20}(?:built|developed|learned|constructed)\b/i, description: 'Built/learned pattern language', example: 'The pattern you built to survive...' },
      { id: 'I_AP_003', pattern: /\bwho you are not\b/i, description: 'The Enneagram shows who you are NOT', example: 'This shows who you are not — where fear runs the show' },
    ],
  },

  // ── II. You Are the Defiant Power of the Human Spirit ────────────────
  {
    id: 'II',
    name: 'You Are the Defiant Power of the Human Spirit',
    full_text: 'Drawn from Viktor Frankl: the defiant power of the human spirit is the capacity to resist and brave whatever conditioning, circumstances, or suffering one may face. That power is unquantifiable.',
    rule: 'The system must always position the person as greater than their results. The defiant spirit is the constant; the type is the variable.',
    violation_patterns: [
      { id: 'II_001', pattern: /\byou(?:'re| are) (?:just|only|merely|nothing more than) (?:a )?(?:type|number|pattern)\b/i, severity: 'critical', description: 'Making person smaller than results', example: "You're just a number" },
      { id: 'II_002', pattern: /\bthis (?:defines|determines|limits|constrains) (?:who )?you\b/i, severity: 'critical', description: 'Results defining the person', example: 'This defines who you are' },
    ],
    approved_patterns: [
      { id: 'II_AP_001', pattern: /\bdefiant (?:spirit|power)\b/i, description: 'Defiant spirit reference', example: 'You are a defiant spirit' },
      { id: 'II_AP_002', pattern: /\bgreater than\b.*(?:results|number|type|pattern|system)\b/i, description: 'Person greater than results', example: 'You are greater than any system can contain' },
      { id: 'II_AP_003', pattern: /\bmore than (?:any )?(?:type|number|system|pattern)\b/i, description: 'More-than framing', example: 'You are more than any type can capture' },
    ],
  },

  // ── III. You Built the Box. You Can Walk Out of It. ──────────────────
  {
    id: 'III',
    name: 'You Built the Box. You Can Walk Out of It.',
    full_text: 'No assessment has put you in a box. You put yourself there. Every survival strategy is something you built. Which means it is something you can choose to dismantle. Frankl called this the inner concentration camp.',
    rule: 'Require ownership language in results. "The pattern you built" — not "the pattern that defines you." The person is always the author, never the prisoner.',
    violation_patterns: [
      { id: 'III_001', pattern: /\byou were (?:given|born with|assigned|dealt)\b.*(?:type|pattern|trait)\b/i, severity: 'critical', description: 'Passive language removing ownership', example: 'You were given this pattern' },
      { id: 'III_002', pattern: /\b(?:the|this) (?:pattern|type|number) (?:that )?(?:defines|controls|determines|governs) you\b/i, severity: 'warning', description: 'Pattern as external controller', example: 'The pattern that defines you' },
    ],
    approved_patterns: [
      { id: 'III_AP_001', pattern: /\byou (?:built|constructed|created|developed)\b/i, description: 'Ownership/authorship language', example: 'The survival strategy you built...' },
      { id: 'III_AP_002', pattern: /\bwalk out\b/i, description: 'Walking out of the box', example: 'You can walk out of it' },
      { id: 'III_AP_003', pattern: /\bchoose to (?:dismantle|change|release|let go|transcend)\b/i, description: 'Choosing to dismantle', example: 'You can choose to dismantle this pattern' },
    ],
  },

  // ── IV. These Are Not Personalities. They Are Survival Strategies. ───
  {
    id: 'IV',
    name: 'These Are Survival Strategies, Not Personalities',
    full_text: 'A personality is a persona — a mask. What the Enneagram maps are the ways you learned to survive, not who you actually are. To treat these as permanent identities is idolatry.',
    rule: 'Never use language that makes a type sound permanent, innate, or biological. Always frame it as learned, built, and therefore changeable.',
    violation_patterns: [
      { id: 'IV_001', pattern: /\byou(?:'re| are) wired to\b/i, severity: 'critical', description: 'Biological determinism', example: "You're wired to seek approval" },
      { id: 'IV_002', pattern: /\b(?:innate|inborn|hardwired|genetic|biological)\b.*(?:type|pattern|trait)\b/i, severity: 'critical', description: 'Biological/innate framing', example: 'This is an innate trait of your type' },
      { id: 'IV_003', pattern: /\byou(?:'ll| will) always\b.*(?:type|pattern|because)\b/i, severity: 'critical', description: 'Permanent/deterministic framing', example: "You'll always struggle with this" },
      { id: 'IV_004', pattern: /\byou can(?:'t| not) (?:help|avoid|change|stop)\b.*(?:type|number|pattern)\b/i, severity: 'critical', description: 'Removing agency via type determinism', example: "You can't help being controlling" },
      { id: 'IV_005', pattern: /\bpersonality type\b/i, severity: 'warning', description: 'Using "personality type" instead of "survival strategy"', example: 'Your personality type is...' },
    ],
    approved_patterns: [
      { id: 'IV_AP_001', pattern: /\bsurvival strateg/i, description: 'Survival strategy language', example: 'These are survival strategies, not personalities' },
      { id: 'IV_AP_002', pattern: /\blearned|built|developed|constructed|adopted\b/i, description: 'Learned/changeable framing', example: 'This is a pattern you learned early' },
    ],
  },

  // ── V. You Contain All Nine Energies. The Circle Is Wholeness. ───────
  {
    id: 'V',
    name: 'You Contain All Nine Energies',
    full_text: 'No single type defines you. All nine energies live in you. The question is which one runs you, which ones you have lost access to, and which ones you need to reclaim. The circle of the Enneagram is the symbol of return to the whole.',
    rule: 'Results should always point toward reclaiming lost energies, not just understanding the dominant one. The aspirational direction is always toward the circle.',
    violation_patterns: [
      { id: 'V_001', pattern: /\byou(?:'re| are) (?:only|just|purely|exclusively) (?:a )?(?:type|number)\b/i, severity: 'warning', description: 'Focusing only on dominant type', example: "You're only a body type" },
    ],
    approved_patterns: [
      { id: 'V_AP_001', pattern: /\ball nine\b/i, description: 'All nine energies reference', example: 'You contain all nine energies' },
      { id: 'V_AP_002', pattern: /\bwholeness|whole|circle\b/i, description: 'Wholeness/circle framing', example: 'The circle is wholeness' },
      { id: 'V_AP_003', pattern: /\breclaim/i, description: 'Reclaiming lost energies', example: 'Reclaim the energies you have lost access to' },
      { id: 'V_AP_004', pattern: /\brepressed (?:type|energy|instinct)\b/i, description: 'Naming repressed type', example: 'Your repressed type is the energy you need most' },
    ],
  },

  // ── VI. Your Type Is Not Your Fate. ──────────────────────────────────
  {
    id: 'VI',
    name: 'Your Type Is Not Your Fate',
    full_text: 'Two people with the same number can be kings or tyrants. The variable is not the number. The variable is you. This is Frankl\'s principle of freedom towards — not merely freedom from your conditioning, but freedom towards the life you choose.',
    rule: 'Never present results as deterministic or fatalistic. Always include the ladder of integration — same type, radically different expressions. Always convey agency and freedom.',
    violation_patterns: [
      { id: 'VI_001', pattern: /\byou(?:'re| are) (?:destined|doomed|fated|condemned|stuck)\b/i, severity: 'critical', description: 'Deterministic/fatalistic language', example: "You're destined to struggle with this" },
      { id: 'VI_002', pattern: /\b(?:types?|numbers?) (?:like (?:yours|this)|such as) (?:always|never|can't)\b/i, severity: 'critical', description: 'Fixed-fate type language', example: 'Types like yours always struggle' },
    ],
    approved_patterns: [
      { id: 'VI_AP_001', pattern: /\bking.{0,5}tyrant|tyrant.{0,5}king/i, description: 'Kings or tyrants framing', example: 'Same number — king or tyrant' },
      { id: 'VI_AP_002', pattern: /\bfreedom (?:from|towards|to choose)\b/i, description: 'Freedom framing', example: 'Freedom towards the life you choose' },
      { id: 'VI_AP_003', pattern: /\bladder (?:of )?integration\b/i, description: 'Ladder of integration', example: 'Where you stand on the ladder of integration' },
      { id: 'VI_AP_004', pattern: /\bchoose (?:who you|how you|your)\b/i, description: 'Choice/agency framing', example: 'You get to choose who you are' },
    ],
  },

  // ── VII. This Is a Response-Ability Roadmap. ─────────────────────────
  {
    id: 'VII',
    name: 'This Is a Response-Ability Roadmap',
    full_text: 'Between stimulus and response, there is a space. Reaction is automatic, unconscious, and fear-driven. Response is chosen, conscious, and rooted in who you actually are.',
    rule: 'The reaction/response framework is the primary lens for all behavioral descriptions. Every type description should include both the reaction expression and the response expression. "Response-Ability" is branded IP.',
    violation_patterns: [
      { id: 'VII_001', pattern: /\byou (?:always |automatically |naturally )react\b(?!.*\brespond)/i, severity: 'warning', description: 'Describing behavior without response alternative', example: 'You automatically react with anger' },
    ],
    approved_patterns: [
      { id: 'VII_AP_001', pattern: /\breact(?:ion)?\b.*\brespond?\b/i, description: 'Reaction/response pairing', example: 'In reaction you..., in response you...' },
      { id: 'VII_AP_002', pattern: /\bresponse.?ability\b/i, description: 'Response-Ability branded term', example: 'This is a Response-Ability roadmap' },
      { id: 'VII_AP_003', pattern: /\bstimulus.{0,20}response\b/i, description: 'Stimulus-response space reference', example: 'Between stimulus and response there is a space' },
      { id: 'VII_AP_004', pattern: /\bspace\b.*\bchoose\b/i, description: 'Space to choose framing', example: 'In that space lies your power to choose' },
    ],
  },

  // ── VIII. Your Greatest Wound and Your Greatest Gift Are the Same Energy. ─
  {
    id: 'VIII',
    name: 'Wound and Gift Are the Same Energy',
    full_text: 'Your superpower and your kryptonite are not two different things — they are one force. The work is to choose which expression governs.',
    rule: 'Never present wound and gift as separate things to manage. They are the same energy at different levels of consciousness. Results must always show both sides of the same coin, not a strengths list and a weaknesses list.',
    violation_patterns: [
      { id: 'VIII_001', pattern: /\byour (?:strengths|gifts) (?:are|include)\b[\s\S]{0,200}\byour (?:weaknesses|flaws|shadows) (?:are|include)\b/i, severity: 'warning', description: 'Separating strengths and weaknesses into distinct lists', example: 'Your strengths are... Your weaknesses are...' },
      { id: 'VIII_002', pattern: /\bthe (?:problem|trouble|downside|flaw) with (?:your|being|this)\b/i, severity: 'warning', description: 'Pathologizing without gift', example: 'The problem with being a Four is...' },
    ],
    approved_patterns: [
      { id: 'VIII_AP_001', pattern: /\bsame energy\b/i, description: 'Same energy framing', example: 'Your wound and gift are the same energy' },
      { id: 'VIII_AP_002', pattern: /\bsuperpower.{0,30}kryptonite|kryptonite.{0,30}superpower/i, description: 'Superpower/kryptonite pairing', example: 'Your superpower and kryptonite are one force' },
      { id: 'VIII_AP_003', pattern: /\bshadow.{0,20}(?:gift|light|strength)|(?:gift|light|strength).{0,20}shadow\b/i, description: 'Shadow-gift unity', example: 'The shadow cast by your gift' },
      { id: 'VIII_AP_004', pattern: /\bconscious(?:ness|ly)?\b.*\bunconscious/i, description: 'Conscious/unconscious expression framing', example: 'The same force, conscious or unconscious' },
    ],
  },

  // ── IX. You Came In With a Calling. ──────────────────────────────────
  {
    id: 'IX',
    name: 'You Came In With a Calling',
    full_text: 'The Holy Idea is the essential spiritual energy that guided you into this world. It is not something you need to build. It is something you need to remember. In Frankl\'s language, your superpower is your why.',
    rule: 'Results must be aspirational, not just diagnostic. The Holy Idea / calling / why must be surfaced as the destination, not just the type as the starting point.',
    violation_patterns: [
      { id: 'IX_001', pattern: /\byou (?:need|have) to (?:build|create|develop|find) (?:your |a )?(?:purpose|calling|meaning)\b/i, severity: 'warning', description: 'Framing calling as something to build (should be remembered)', example: 'You need to find your purpose' },
    ],
    approved_patterns: [
      { id: 'IX_AP_001', pattern: /\bcalling\b/i, description: 'Calling reference', example: 'You came in with a calling' },
      { id: 'IX_AP_002', pattern: /\bholy idea\b/i, description: 'Holy Idea reference', example: 'Your Holy Idea has always been there' },
      { id: 'IX_AP_003', pattern: /\bremember\b.*(?:calling|purpose|essence|who you (?:really )?are)/i, description: 'Remembering (not building) essence', example: 'The work is to remember what was always there' },
      { id: 'IX_AP_004', pattern: /\byour why\b/i, description: 'Your WHY (Frankl framing)', example: 'Your superpower is your why' },
    ],
  },

  // ── X. The Enneagram Points You to Your Why. ─────────────────────────
  {
    id: 'X',
    name: 'The Enneagram Points You to Your Why',
    full_text: 'Every other personality typing system deals with what you do and how you do it. The Enneagram is the only system that deals with WHY you do what you do. It exists not to explain you, but to liberate you.',
    rule: 'When comparing to other systems (MBTI, Big Five, DISC, etc.), always position the Enneagram as the "why" system. Other systems map behavior and preference; the Enneagram maps motivation and survival architecture.',
    violation_patterns: [
      { id: 'X_001', pattern: /\b(?:personality (?:test|quiz|assessment)|like (?:mbti|myers.?briggs|big five|disc))\b/i, severity: 'warning', description: 'Equating Enneagram with personality tests (should position as deeper "why" system)', example: 'This personality test shows...' },
    ],
    approved_patterns: [
      { id: 'X_AP_001', pattern: /\bwhy you do\b/i, description: 'WHY framing', example: 'The Enneagram deals with why you do what you do' },
      { id: 'X_AP_002', pattern: /\bliberat/i, description: 'Liberation framing', example: 'It exists to liberate you' },
      { id: 'X_AP_003', pattern: /\bmotivation\b.*\bsurvival\b|\bsurvival\b.*\bmotivation\b/i, description: 'Motivation and survival architecture', example: 'The Enneagram maps motivation and survival architecture' },
      { id: 'X_AP_004', pattern: /\bdefy your number\b/i, description: 'Defy Your Number branded phrase', example: 'Defy Your Number and Live Your Spirit' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// VIOLATION CHECKLIST (from DYN_COMMANDMENTS.md Summary Table)
// ═══════════════════════════════════════════════════════════════════════
//
// Any content that does ANY of the following violates the commandments:
// 1. Says "you are a Type X" or frames type as identity → I, IV
// 2. Makes the person smaller than their results → II
// 3. Uses passive language removing ownership ("given this pattern") → III
// 4. Treats type as permanent, innate, or biological → IV
// 5. Focuses only on dominant type without pointing toward wholeness → V
// 6. Presents results as deterministic or fatalistic → VI
// 7. Describes behavior without the reaction/response lens → VII
// 8. Separates wound and gift into distinct categories → VIII
// 9. Delivers only diagnostic results with no aspirational direction → IX
// 10. Fails to position the Enneagram as a "why" system → X
// 11. Uses generic enneagram language instead of Defiant Spirit / Frankl → ALL

// ── Utility Functions ──────────────────────────────────────────────────

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

export function calculateCFS(
  totalTurns: number,
  criticalViolations: number,
  warningViolations: number,
  approvedUses: number,
): number {
  // Any critical violation = automatic 0
  if (criticalViolations > 0) return 0;

  // Start at 10
  let score = 10.0;

  // Warning violations: -0.5 each (capped at -5)
  score -= Math.min(warningViolations * 0.5, 5.0);

  // Approved language bonus: +0.2 per unique use (capped at +2)
  const approvedBonus = Math.min(approvedUses * 0.2, 2.0);
  score += approvedBonus;

  // Clamp to 0-10
  return Math.max(0, Math.min(10, score));
}

export function getAllViolationPatterns(): ViolationPattern[] {
  return COMMANDMENT_RULES.flatMap(rule => rule.violation_patterns);
}

export function getAllApprovedPatterns(): ApprovedPattern[] {
  return COMMANDMENT_RULES.flatMap(rule => rule.approved_patterns);
}
