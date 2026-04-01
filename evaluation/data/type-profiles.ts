/**
 * Soulo Enneagram AI Evaluation System - Type Profiles
 *
 * Comprehensive reference data for all 9 Enneagram types.
 * Used as ground-truth for evaluation scoring and persona generation.
 */

import type { TypeProfile, EnneagramType } from '../types';

export const TYPE_PROFILES: Record<EnneagramType, TypeProfile> = {
  // ── Type 1: The Reformer / Perfectionist ──────────────────────────
  1: {
    type_id: 1,
    core_fear: 'Being corrupt, evil, or defective',
    core_desire: 'To be good, to have integrity, to be balanced',
    core_motivation: 'To be right, to strive higher and improve everything, to be consistent with ideals, to justify self, to be beyond criticism',
    passion: 'Anger (Resentment)',
    virtue: 'Serenity',
    holy_idea: 'Holy Perfection',
    defense_mechanism: 'Reaction Formation',
    triad: 'body',
    behavioral_signatures: [
      'Internal critical voice that constantly evaluates self and others',
      'Suppressed anger that leaks out as resentment, irritation, or rigidity',
      'Strong sense of right and wrong with difficulty accepting gray areas',
      'Self-controlled, orderly, detail-oriented behavior',
      'Tendency to correct others or hold them to high standards',
      'Difficulty relaxing or allowing themselves pleasure without guilt',
      'Procrastination driven by fear of doing things imperfectly',
      'Uses "should" and "ought" language frequently',
    ],
    integration: 7,
    disintegration: 4,
    common_mistypes: [
      {
        confused_with: 6,
        discriminators: [
          '1s act from internal principles and standards; 6s act from anxiety about external threats and authority',
          '1s have a rigid inner critic; 6s have a vigilant inner doubter',
          '1s suppress anger; 6s suppress or project fear',
          '1s are certain they are right; 6s question whether they are right',
        ],
      },
      {
        confused_with: 5,
        discriminators: [
          '1s are action-oriented reformers; 5s are observation-oriented investigators',
          '1s engage to improve the world; 5s withdraw to conserve energy',
          '1s are driven by moral imperative; 5s are driven by intellectual curiosity',
          '1s judge; 5s analyze',
        ],
      },
      {
        confused_with: 8,
        discriminators: [
          '1s repress anger and express it as controlled resentment; 8s express anger directly and forcefully',
          '1s want to be right; 8s want to be strong',
          '1s follow rules (their own); 8s break rules they see as unjust',
          '1s moralize; 8s confront',
        ],
      },
    ],
    defiant_spirit_framing: 'The 1 developed a survival strategy of becoming their own harshest critic before the world could criticize them. Their inner reformer emerged as a way to feel safe in a world that felt chaotic or morally inconsistent.',
    big_five_expected: { O: 'moderate', C: 'high', E: 'low-moderate', A: 'moderate', N: 'moderate-high' },
  },

  // ── Type 2: The Helper / Giver ────────────────────────────────────
  2: {
    type_id: 2,
    core_fear: 'Being unwanted, unworthy of love, or unloved',
    core_desire: 'To be loved, needed, and appreciated',
    core_motivation: 'To be loved, to express feelings for others, to be needed and appreciated, to get others to respond, to vindicate claims about self',
    passion: 'Pride',
    virtue: 'Humility',
    holy_idea: 'Holy Will / Holy Freedom',
    defense_mechanism: 'Repression (of own needs)',
    triad: 'heart',
    behavioral_signatures: [
      'Intuitive awareness of others\' emotional needs',
      'Difficulty identifying and expressing own needs directly',
      'Gives to get - unconscious expectation of reciprocity',
      'Adapts self-presentation to what others need or want',
      'Pride in being indispensable or uniquely helpful',
      'Resentment when help is not acknowledged or reciprocated',
      'Boundary difficulties - over-involvement in others\' lives',
      'Multiple selves for different relationships',
    ],
    integration: 4,
    disintegration: 8,
    common_mistypes: [
      {
        confused_with: 9,
        discriminators: [
          '2s actively pursue connection and merge with others\' needs; 9s passively merge to avoid conflict',
          '2s know what they want (to be loved) but deny their own needs; 9s lose touch with what they want entirely',
          '2s are emotionally expressive; 9s are emotionally muted',
          '2s give to get; 9s accommodate to keep peace',
        ],
      },
      {
        confused_with: 7,
        discriminators: [
          '2s focus on others\' emotions; 7s focus on their own experiences',
          '2s seek love through giving; 7s seek stimulation through variety',
          '2s are interpersonally oriented; 7s are experience-oriented',
          '2s repress own needs; 7s reframe pain into positive',
        ],
      },
      {
        confused_with: 6,
        discriminators: [
          '2s help from a position of pride (I know what you need); 6s help from loyalty and duty',
          '2s are confident in relationships; 6s are anxious in relationships',
          '2s move toward people to be needed; 6s move toward people for security',
          '2s repress own needs; 6s project own fears',
        ],
      },
    ],
    defiant_spirit_framing: 'The 2 developed a survival strategy of becoming indispensable to others, reading and meeting their needs. Their inner helper emerged as a way to earn love in a world where they felt love was conditional on what they could give.',
    big_five_expected: { O: 'moderate', C: 'moderate', E: 'high', A: 'high', N: 'moderate' },
  },

  // ── Type 3: The Achiever / Performer ──────────────────────────────
  3: {
    type_id: 3,
    core_fear: 'Being worthless, without inherent value apart from achievements',
    core_desire: 'To be valuable, admired, and worthwhile',
    core_motivation: 'To be affirmed, to distinguish self from others, to have attention, to be admired, to impress others',
    passion: 'Vanity / Deceit (self-deceit)',
    virtue: 'Truthfulness / Authenticity',
    holy_idea: 'Holy Hope / Holy Law',
    defense_mechanism: 'Identification (with persona/role)',
    triad: 'heart',
    behavioral_signatures: [
      'Shape-shifts to match what is valued in the current context',
      'Confuses self-image with true self - may not know who they are underneath roles',
      'Highly efficient, goal-oriented, and results-driven',
      'Difficulty sitting with feelings - prefers action',
      'Competitive, even when they deny it',
      'Impatient with process, focused on outcomes',
      'Image-conscious - manages how others perceive them',
      'Can cut off emotions to "get things done"',
    ],
    integration: 6,
    disintegration: 9,
    common_mistypes: [
      {
        confused_with: 7,
        discriminators: [
          '3s are driven by achievement and image; 7s are driven by experience and stimulation',
          '3s adapt to external standards of success; 7s follow their own desires',
          '3s suppress emotions for efficiency; 7s reframe negative emotions into positive ones',
          '3s need to win; 7s need to enjoy',
        ],
      },
      {
        confused_with: 8,
        discriminators: [
          '3s want admiration; 8s want respect through strength',
          '3s adapt their image; 8s are unapologetically themselves',
          '3s avoid failure; 8s avoid vulnerability',
          '3s are diplomatic; 8s are direct',
        ],
      },
      {
        confused_with: 1,
        discriminators: [
          '3s pursue excellence for recognition; 1s pursue excellence for its own sake',
          '3s adapt standards to context; 1s hold fixed internal standards',
          '3s cut corners if it gets results; 1s never cut corners on principle',
          '3s image-manage; 1s integrity-manage',
        ],
      },
    ],
    defiant_spirit_framing: 'The 3 developed a survival strategy of becoming whatever the environment rewarded. Their inner achiever emerged as a way to secure worth in a world that seemed to value doing over being.',
    big_five_expected: { O: 'moderate', C: 'high', E: 'high', A: 'low-moderate', N: 'low-moderate' },
  },

  // ── Type 4: The Individualist / Romantic ──────────────────────────
  4: {
    type_id: 4,
    core_fear: 'Having no identity or personal significance',
    core_desire: 'To be uniquely themselves, to find their identity and significance',
    core_motivation: 'To express themselves and their individuality, to create and surround themselves with beauty, to maintain moods and feelings, to withdraw to protect self-image, to attend to emotional needs before anything else',
    passion: 'Envy',
    virtue: 'Equanimity',
    holy_idea: 'Holy Origin',
    defense_mechanism: 'Introjection',
    triad: 'heart',
    behavioral_signatures: [
      'Deep, rich inner emotional life that feels more real than external reality',
      'Sense of being fundamentally different or defective compared to others',
      'Longing for what is missing or unavailable - the "push-pull" dynamic',
      'Aesthetic sensitivity and need for beauty/authenticity',
      'Tendency to amplify and sustain emotional states, especially melancholy',
      'Envy of others\' perceived wholeness or normalcy',
      'Rejection of the ordinary - craving uniqueness',
      'Difficulty with the mundane and practical aspects of life',
    ],
    integration: 1,
    disintegration: 2,
    common_mistypes: [
      {
        confused_with: 6,
        discriminators: [
          '4s focus on identity and emotional authenticity; 6s focus on security and loyalty',
          '4s withdraw to protect their uniqueness; 6s seek support and belonging',
          '4s are self-referencing; 6s are group-referencing',
          '4s romanticize suffering; 6s are anxious about suffering',
        ],
      },
      {
        confused_with: 5,
        discriminators: [
          '4s withdraw to feel; 5s withdraw to think',
          '4s are emotionally intense and expressive; 5s are emotionally contained and private',
          '4s want to be understood; 5s want to understand',
          '4s fear being ordinary; 5s fear being incompetent',
        ],
      },
      {
        confused_with: 9,
        discriminators: [
          '4s amplify emotions; 9s dampen emotions',
          '4s focus on what is missing; 9s focus on what is harmonious',
          '4s assert their uniqueness; 9s merge with others',
          '4s are emotionally volatile; 9s are emotionally steady',
        ],
      },
    ],
    defiant_spirit_framing: 'The 4 developed a survival strategy of cultivating depth and uniqueness as their source of identity. Their inner romantic emerged as a way to find significance in a world where they felt fundamentally different or abandoned.',
    big_five_expected: { O: 'high', C: 'low', E: 'low', A: 'moderate', N: 'high' },
  },

  // ── Type 5: The Investigator / Observer ───────────────────────────
  5: {
    type_id: 5,
    core_fear: 'Being useless, helpless, incapable, or depleted',
    core_desire: 'To be capable, competent, and self-sufficient',
    core_motivation: 'To possess knowledge, to understand the environment, to have everything figured out as a way of defending the self from threats',
    passion: 'Avarice (hoarding of resources, energy, knowledge)',
    virtue: 'Non-Attachment',
    holy_idea: 'Holy Omniscience',
    defense_mechanism: 'Isolation (compartmentalization of emotion)',
    triad: 'head',
    behavioral_signatures: [
      'Minimizes needs and contact with the external world',
      'Compartmentalizes emotions - processes feelings later, in private',
      'Intense inner life and rich mental world',
      'Guards time, energy, and personal space fiercely',
      'Observes before participating - the "fly on the wall"',
      'Prefers depth over breadth in knowledge and relationships',
      'Can seem detached, cold, or cerebral to others',
      'Drains energy in social situations, needs solitude to recharge',
    ],
    integration: 8,
    disintegration: 7,
    common_mistypes: [
      {
        confused_with: 9,
        discriminators: [
          '5s withdraw deliberately to conserve energy; 9s withdraw to avoid conflict',
          '5s are mentally intense and focused; 9s are mentally diffuse and accommodating',
          '5s are emotionally detached; 9s are emotionally merged',
          '5s minimize needs consciously; 9s forget their needs unconsciously',
        ],
      },
      {
        confused_with: 1,
        discriminators: [
          '5s seek knowledge for competence; 1s seek correctness for integrity',
          '5s are detached observers; 1s are engaged reformers',
          '5s isolate emotion; 1s use reaction formation',
          '5s are driven by curiosity; 1s are driven by duty',
        ],
      },
      {
        confused_with: 4,
        discriminators: [
          '5s withdraw to think; 4s withdraw to feel',
          '5s fear depletion; 4s fear ordinariness',
          '5s contain emotions; 4s amplify emotions',
          '5s seek understanding; 4s seek identity',
        ],
      },
    ],
    defiant_spirit_framing: 'The 5 developed a survival strategy of retreating into the mind and minimizing needs. Their inner investigator emerged as a way to feel safe in a world that felt intrusive, demanding, and overwhelming.',
    big_five_expected: { O: 'high', C: 'moderate', E: 'low', A: 'low', N: 'moderate' },
  },

  // ── Type 6: The Loyalist / Questioner ─────────────────────────────
  6: {
    type_id: 6,
    core_fear: 'Being without support, guidance, or security',
    core_desire: 'To have security, support, and certainty',
    core_motivation: 'To have security, to feel supported by others, to have certitude and reassurance, to test the attitudes of others toward them, to fight against anxiety and insecurity',
    passion: 'Fear / Anxiety',
    virtue: 'Courage',
    holy_idea: 'Holy Faith',
    defense_mechanism: 'Projection',
    triad: 'head',
    behavioral_signatures: [
      'Vigilant scanning for potential threats and worst-case scenarios',
      'Questioning authority while simultaneously seeking it',
      'Loyalty as a core value - devotion to people and systems they trust',
      'Doubt and second-guessing - difficulty trusting own judgment',
      'Phobic presentation: cautious, compliant, seeks reassurance',
      'Counterphobic presentation: confrontational, provocative, moves toward fear',
      'Tests others\' trustworthiness and commitment',
      'Difficulty distinguishing internal anxiety from actual external threats',
    ],
    integration: 9,
    disintegration: 3,
    common_mistypes: [
      {
        confused_with: 1,
        discriminators: [
          '6s follow rules from anxiety about consequences; 1s follow rules from internal moral standards',
          '6s doubt themselves; 1s are certain of themselves',
          '6s project fear; 1s use reaction formation against anger',
          '6s question authority; 1s become their own authority',
        ],
      },
      {
        confused_with: 2,
        discriminators: [
          '6s help from duty and loyalty; 2s help from pride and need to be needed',
          '6s are anxious in relationships; 2s are confident in relationships',
          '6s seek security through belonging; 2s seek love through giving',
          '6s test others; 2s seduce others',
        ],
      },
      {
        confused_with: 9,
        discriminators: [
          '6s are mentally active and vigilant; 9s are mentally diffuse and complacent',
          '6s actively worry; 9s actively numb',
          '6s question everything; 9s accept most things',
          '6s project danger; 9s narcotize against discomfort',
        ],
      },
      {
        confused_with: 8,
        discriminators: [
          'Counterphobic 6s challenge authority to test it; 8s challenge authority to overthrow it',
          '6s are motivated by anxiety (even when counterphobic); 8s are motivated by intensity',
          'CP6s are reactive; 8s are proactive',
          '6s doubt underneath aggression; 8s have certainty underneath aggression',
        ],
      },
    ],
    defiant_spirit_framing: 'The 6 developed a survival strategy of anticipating danger and questioning everything. Their inner loyalist emerged as a way to find solid ground in a world that felt unpredictable and untrustworthy.',
    big_five_expected: { O: 'moderate', C: 'moderate-high', E: 'low-moderate', A: 'moderate', N: 'high' },
  },

  // ── Type 7: The Enthusiast / Epicure ──────────────────────────────
  7: {
    type_id: 7,
    core_fear: 'Being trapped in pain, deprivation, or limitation',
    core_desire: 'To be satisfied, fulfilled, and content',
    core_motivation: 'To maintain freedom and happiness, to avoid missing out on worthwhile experiences, to keep themselves excited and occupied, to avoid and discharge pain',
    passion: 'Gluttony (for experience, stimulation, options)',
    virtue: 'Sobriety',
    holy_idea: 'Holy Wisdom / Holy Plan',
    defense_mechanism: 'Rationalization (reframing negatives into positives)',
    triad: 'head',
    behavioral_signatures: [
      'Rapid mental planning and generation of possibilities',
      'Difficulty staying with painful emotions - reframes to positive quickly',
      'Fear of missing out - keeps options open, avoids commitment',
      'Charming, enthusiastic, and energizing presence',
      'Rationalizes away problems rather than sitting with discomfort',
      'Scattered attention - many projects started, fewer finished',
      'Subtle entitlement - believes they deserve good experiences',
      'Avoids limitation, constraint, or anything that feels like a cage',
    ],
    integration: 5,
    disintegration: 1,
    common_mistypes: [
      {
        confused_with: 3,
        discriminators: [
          '7s seek experience for its own sake; 3s seek achievement for image',
          '7s are process-oriented (the journey); 3s are outcome-oriented (the result)',
          '7s avoid pain; 3s avoid failure',
          '7s rationalize; 3s identify with roles',
        ],
      },
      {
        confused_with: 2,
        discriminators: [
          '7s are self-referencing (what do I want?); 2s are other-referencing (what do you need?)',
          '7s help because it\'s fun or interesting; 2s help because they need to be needed',
          '7s have difficulty with commitment; 2s over-commit',
          '7s avoid emotional pain; 2s repress their own needs',
        ],
      },
      {
        confused_with: 9,
        discriminators: [
          '7s are energetically high and fast; 9s are energetically even and slow',
          '7s numb pain through excitement; 9s numb pain through merging and routine',
          '7s are mentally active and generative; 9s are mentally diffuse and receptive',
          '7s fear limitation; 9s fear disruption',
        ],
      },
    ],
    defiant_spirit_framing: 'The 7 developed a survival strategy of keeping life stimulating and reframing pain into possibility. Their inner enthusiast emerged as a way to stay free in a world that threatened to trap them in suffering or deprivation.',
    big_five_expected: { O: 'high', C: 'low', E: 'high', A: 'moderate', N: 'low' },
  },

  // ── Type 8: The Challenger / Protector ────────────────────────────
  8: {
    type_id: 8,
    core_fear: 'Being harmed, controlled, or violated by others',
    core_desire: 'To protect themselves, to be in control of their own life and destiny',
    core_motivation: 'To be self-reliant, to prove their strength, to resist weakness, to be important in their world, to dominate the environment, to stay in control',
    passion: 'Lust / Excess (intensity in all things)',
    virtue: 'Innocence',
    holy_idea: 'Holy Truth',
    defense_mechanism: 'Denial (of vulnerability)',
    triad: 'body',
    behavioral_signatures: [
      'Takes up space - physically, verbally, energetically',
      'Direct, blunt communication style - values truth over diplomacy',
      'Protects the vulnerable while denying own vulnerability',
      'All-or-nothing intensity in engagement',
      'Tests others\' strength and honesty before trusting them',
      'Difficulty with tenderness, gentleness, or showing weakness',
      'Anger is accessible and expressed freely - used as a tool',
      'Control-seeking: needs to be in charge or at least not controlled',
    ],
    integration: 2,
    disintegration: 5,
    common_mistypes: [
      {
        confused_with: 6,
        discriminators: [
          'Counterphobic 6s look like 8s but are driven by anxiety, not intensity',
          '8s are proactively assertive; CP6s are reactively aggressive',
          '8s trust their gut instinctively; 6s doubt their instincts',
          '8s deny vulnerability; CP6s deny fear',
        ],
      },
      {
        confused_with: 3,
        discriminators: [
          '8s seek power and control; 3s seek admiration and status',
          '8s are direct and unpolished; 3s are diplomatic and image-conscious',
          '8s confront; 3s perform',
          '8s deny vulnerability; 3s deny inadequacy',
        ],
      },
      {
        confused_with: 1,
        discriminators: [
          '8s express anger openly; 1s suppress anger into resentment',
          '8s want justice on their terms; 1s want justice on moral terms',
          '8s are instinctual; 1s are principled',
          '8s break rules; 1s follow rules (their own)',
        ],
      },
    ],
    defiant_spirit_framing: 'The 8 developed a survival strategy of becoming strong and taking control. Their inner challenger emerged as a way to never be vulnerable in a world that felt like it punished weakness and rewarded power.',
    big_five_expected: { O: 'moderate', C: 'moderate', E: 'high', A: 'low', N: 'low-moderate' },
  },

  // ── Type 9: The Peacemaker / Mediator ─────────────────────────────
  9: {
    type_id: 9,
    core_fear: 'Loss, fragmentation, separation, and disconnection',
    core_desire: 'Inner peace, harmony, and wholeness',
    core_motivation: 'To create harmony in their environment, to avoid conflicts and tension, to preserve things as they are, to resist whatever would upset or disturb them',
    passion: 'Sloth / Acedia (self-forgetting, inertia toward own agenda)',
    virtue: 'Right Action',
    holy_idea: 'Holy Love',
    defense_mechanism: 'Narcotization (numbing out through routine, comfort, merging)',
    triad: 'body',
    behavioral_signatures: [
      'Goes along to get along - difficulty asserting own preferences',
      'Merges with others\' agendas, losing track of own priorities',
      'Stubborn passive resistance when pushed - immovable inertia',
      'Sees all perspectives equally, making decisions difficult',
      'Numbs out through comfort activities (TV, food, routines)',
      'Self-forgetting - genuinely loses awareness of own needs and desires',
      'Anger is the most repressed emotion - emerges as passive aggression',
      'Can seem agreeable and easy-going while harboring unexpressed resentment',
    ],
    integration: 3,
    disintegration: 6,
    common_mistypes: [
      {
        confused_with: 2,
        discriminators: [
          '9s accommodate to avoid conflict; 2s give to earn love',
          '9s forget their own needs; 2s repress their own needs',
          '9s merge passively; 2s merge actively',
          '9s are emotionally muted; 2s are emotionally expressive',
        ],
      },
      {
        confused_with: 5,
        discriminators: [
          '9s withdraw to avoid discomfort; 5s withdraw to conserve energy',
          '9s are diffuse and unfocused; 5s are intense and focused',
          '9s merge with their environment; 5s detach from their environment',
          '9s numb through comfort; 5s conserve through minimalism',
        ],
      },
      {
        confused_with: 6,
        discriminators: [
          '9s are complacent and trusting; 6s are vigilant and questioning',
          '9s avoid conflict by going along; 6s avoid danger by preparing',
          '9s narcotize against discomfort; 6s project danger outward',
          '9s are internally peaceful (on surface); 6s are internally anxious',
        ],
      },
    ],
    defiant_spirit_framing: 'The 9 developed a survival strategy of dissolving their own agenda to maintain connection and peace. Their inner peacemaker emerged as a way to stay whole in a world that felt like it would fragment them if they asserted themselves.',
    big_five_expected: { O: 'moderate', C: 'low-moderate', E: 'moderate', A: 'high', N: 'variable' },
  },
};

/**
 * Look up a type profile by type number.
 */
export function getTypeProfile(typeId: EnneagramType): TypeProfile {
  return TYPE_PROFILES[typeId];
}

/**
 * Get discriminators between two commonly confused types.
 */
export function getDiscriminators(typeA: EnneagramType, typeB: EnneagramType): string[] {
  const profileA = TYPE_PROFILES[typeA];
  const mistypeEntry = profileA.common_mistypes.find(m => m.confused_with === typeB);
  if (mistypeEntry) return mistypeEntry.discriminators;

  // Check reverse direction
  const profileB = TYPE_PROFILES[typeB];
  const reverseEntry = profileB.common_mistypes.find(m => m.confused_with === typeA);
  if (reverseEntry) return reverseEntry.discriminators;

  return [];
}

/**
 * Get the integration and disintegration paths for a type.
 */
export function getGrowthPaths(typeId: EnneagramType): { integration: EnneagramType; disintegration: EnneagramType } {
  const profile = TYPE_PROFILES[typeId];
  return { integration: profile.integration, disintegration: profile.disintegration };
}

/**
 * Get all types in a given triad.
 */
export function getTriadTypes(triad: 'body' | 'heart' | 'head'): EnneagramType[] {
  return (Object.values(TYPE_PROFILES)
    .filter(p => p.triad === triad)
    .map(p => p.type_id));
}
