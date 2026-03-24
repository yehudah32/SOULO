// ─────────────────────────────────────────────────────────────────────────────
// personality-correlations.ts
// Research-backed boundary data for cross-system personality correlations.
// Pure data module — no side effects.
// ─────────────────────────────────────────────────────────────────────────────

// ─── TYPES ────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type InstinctualVariant = 'SP' | 'SO' | 'SX'
export type AttachmentStyle =
  'secure' | 'anxious' | 'avoidant' | 'fearful_avoidant'

export interface MBTIBoundary {
  plausible: string[]
  implausible: string[]
  cognitiveNote: string
  confidence: ConfidenceLevel
  subtypeShift: Record<InstinctualVariant, string>
  wingShift: Record<string, string>
  tritypeShift: {
    heartTypes: Record<number, string>
    headTypes: Record<number, string>
  }
}

export interface BigFiveBoundary {
  openness: { min: number; max: number; note: string }
  conscientiousness: { min: number; max: number; note: string }
  extraversion: { min: number; max: number; note: string }
  agreeableness: { min: number; max: number; note: string }
  neuroticism: { min: number; max: number; note: string }
  citations: string[]
  confidence: ConfidenceLevel
  subtypeShift: Record<InstinctualVariant, Array<{
    trait: string
    direction: 'up' | 'down'
    magnitude: 'slight' | 'moderate' | 'significant'
    note: string
  }>>
  wingShift: Record<string, Array<{
    trait: string
    direction: 'up' | 'down'
    magnitude: 'slight' | 'moderate' | 'significant'
    note: string
  }>>
  lexiconShift: Record<number, Array<{
    trait: string
    direction: 'up' | 'down'
    note: string
  }>>
}

export interface AttachmentBoundary {
  primary: AttachmentStyle
  secondary?: AttachmentStyle
  mechanismNote: string
  healthNote: string
  citations: string[]
  confidence: ConfidenceLevel
  subtypeShift: Record<InstinctualVariant, string>
  wingShift: Record<string, string>
  lexiconShift: Record<number, string>
}

export interface DISCBoundary {
  primary: ('D' | 'I' | 'S' | 'C')[]
  secondary: ('D' | 'I' | 'S' | 'C')[]
  mechanismNote: string
  confidence: ConfidenceLevel
  subtypeShift: Record<InstinctualVariant, string>
  wingShift: Record<string, string>
}

export interface JungianBoundary {
  active: string[]
  shadow: string
  mechanismNote: string
  confidence: ConfidenceLevel
  subtypeShift: Record<InstinctualVariant, string>
  tritypeShift: Record<number, string>
}

export interface HumanDesignBoundary {
  likelyEnergyTypes: string[]
  likelyCenters: string[]
  communityNote: string
  confidence: 'low'
  disclaimer: string
  subtypeNote: Record<InstinctualVariant, string>
}

export interface TypeBoundaries {
  mbti: MBTIBoundary
  bigFive: BigFiveBoundary
  attachment: AttachmentBoundary
  disc: DISCBoundary
  jungian: JungianBoundary
  humanDesign: HumanDesignBoundary
}

// ─── TYPE BOUNDARIES ──────────────────────────────

export const TYPE_BOUNDARIES: Record<number, TypeBoundaries> = {

  // ═══════════════════════════════════════════════════
  // TYPE 1 — The Reformer
  // ═══════════════════════════════════════════════════
  1: {
    mbti: {
      plausible: ['ISTJ', 'ESTJ', 'INTJ', 'ISFJ', 'INFJ', 'ENTJ', 'ISFP'],
      implausible: ['ENFP', 'ESFP', 'ESTP', 'ENTP'],
      cognitiveNote:
        'J preference dominant — need for closure, order, standards. Te or Fe drive the external reform impulse. Si grounds reference to what is correct. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Strongly ISTJ — private, self-contained perfectionism. Standards internal, rarely voiced.',
        SO: 'Shifts ESTJ or ENTJ — reform through teaching and systems. Standards institutional.',
        SX: 'Shifts INFJ or INTJ — idealism as crusade for specific person or cause.',
      },
      wingShift: {
        '1w9':
          'Pulls strongly INTJ — withdrawal, philosophical perfectionism, internal world prioritized over active reform.',
        '1w2':
          'Pulls ISFJ or ESFJ — standards expressed through caring and duty in relationship.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward ISFJ or ESFJ. Agreeableness rises.',
          3: 'Heart 3 adds performance — shifts toward ESTJ or ENTJ. Extraversion rises.',
          4: 'Heart 4 adds depth — shifts toward INFJ or INTJ. Openness rises significantly.',
        },
        headTypes: {
          5: 'Head 5 adds analytical withdrawal — shifts toward INTJ. Most introverted 1.',
          6: 'Head 6 adds anxiety — shifts toward ISTJ. Neuroticism rises above typical 1.',
          7: 'Head 7 adds energy — shifts toward ENTJ or ESTJ. Conscientiousness slightly lower.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 4,
        max: 7,
        note: 'Moderate. Appreciates depth and tradition. Engages with ideas that serve principles. Less novelty-seeking.',
      },
      conscientiousness: {
        min: 8,
        max: 10,
        note: 'Highest of all nine types. The defining Big Five trait for Type 1. (Furnham 2013, Mooradian 1996, Gurven 2013)',
      },
      extraversion: {
        min: 3,
        max: 7,
        note: 'Wide range — SP1 at 3-4, SO1 at 6-7. Subtype is the primary driver.',
      },
      agreeableness: {
        min: 4,
        max: 7,
        note: 'Moderate — principled over pleasant. 1w2 raises toward 7-8.',
      },
      neuroticism: {
        min: 6,
        max: 9,
        note: 'High — inner critic produces chronic low-level anxiety. Rarely externalized. (Gurven 2013)',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Mooradian T. & Nezlek J. (1996). Comparing NEO-FFI and Enneagram. Psych Reports.',
        'Gurven M. et al. (2013). Human Nature.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SP maximizes — private self-discipline',
          },
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'significant',
            note: 'SP minimizes — standards internal',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO raises — reform requires public engagement',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — reform through persuasion',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — idealism opens new paradigms for the cause',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — standards applied to relationship create anxiety',
          },
        ],
      },
      wingShift: {
        '1w9': [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'significant',
            note: 'w9 creates significant introversion',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w9 softens confrontational edge',
          },
        ],
        '1w2': [
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w2 raises warmth',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'slight',
            note: 'w2 increases social engagement',
          },
        ],
      },
      lexiconShift: {
        4: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals aesthetic sensitivity — Openness rises above typical Type 1 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional intensity — Neuroticism near upper bound',
          },
        ],
        5: [
          {
            trait: 'extraversion',
            direction: 'down',
            note: 'Type 5 vocabulary signals withdrawal tendency — Extraversion at lower bound',
          },
        ],
        6: [
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 6 vocabulary signals anxiety — Neuroticism rises above typical 1 range',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            note: 'Type 6 vocabulary signals compliance and warmth — Agreeableness rises',
          },
        ],
        2: [
          {
            trait: 'agreeableness',
            direction: 'up',
            note: 'Type 2 vocabulary signals helping — Agreeableness near upper bound',
          },
        ],
      },
    },

    attachment: {
      primary: 'avoidant',
      secondary: 'anxious',
      mechanismNote:
        'Inner critic creates self-sufficiency imperative — needing others feels like weakness. Vulnerability unconsciously equated with moral failure. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security. Inner critic quiets. At stress: avoidant rigidity, resentment, withdrawal behind standards.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Caligor E. et al. (2018). Psychodynamic Therapy.',
      ],
      confidence: 'medium',
      subtypeShift: {
        SP: 'SP1 most avoidant — self-reliance is core identity. Dependency feels shameful.',
        SO: 'SO1 uses principle and role as emotional distance — engaged but relationally unavailable.',
        SX: 'SX1 shifts toward anxious — intense standards applied to relationship create chronic low-level anxiety.',
      },
      wingShift: {
        '1w9':
          'w9 deepens avoidant — withdrawal and self-containment reinforce each other.',
        '1w2':
          'w2 introduces anxious elements — need to be needed conflicts with self-sufficiency imperative.',
      },
      lexiconShift: {
        6: 'Type 6 vocabulary signals anxious undercurrent — shifts from pure avoidant toward anxious-avoidant blend. Trust issues more prominent.',
        2: 'Type 2 vocabulary signals need to be needed — introduces anxious elements into avoidant base.',
        4: 'Type 4 vocabulary signals fearful-avoidant elements — longing for connection while pushing it away.',
        9: 'Type 9 vocabulary signals dismissive avoidant — merger through disappearance rather than distance.',
      },
    },

    disc: {
      primary: ['C'],
      secondary: ['D'],
      mechanismNote:
        'Conscientiousness dominant — accuracy, quality, standards adherence. D rises with SO and SX where reform requires force. SP1 is the purest C profile in the Enneagram. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure C — private precision. Possibly the most extreme C profile of all 81 types.',
        SO: 'CD blend — standards enforced through systemic change.',
        SX: 'CI blend possible — conviction through personal intensity and influence.',
      },
      wingShift: {
        '1w9': 'Pure C or CS blend — Steadiness from 9 wing.',
        '1w2': 'CS blend — Conscientiousness with Steadiness and care orientation.',
      },
    },

    jungian: {
      active: ['The Ruler', 'The Hero', 'The Sage'],
      shadow: 'The Rebel',
      mechanismNote:
        'Ruler establishes order and rightness. Hero in the reform impulse. Sage in the deep knowledge of what is correct. Shadow Rebel is what the 1 most suppresses — the part that wants to break every rule. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Sage dominant — private cultivation of inner standards.',
        SO: 'Ruler dominant — reform as social vocation.',
        SX: 'Hero dominant — idealism as personal crusade.',
      },
      tritypeShift: {
        4: 'Heart 4 activates The Creator alongside The Ruler — shadow becomes The Orphan rather than pure Rebel.',
        2: 'Heart 2 activates The Caregiver — Ruler softened by Caregiver energy.',
        5: 'Head 5 deepens The Sage — most intellectual and withdrawn 1.',
        6: 'Head 6 activates The Orphan as shadow — safety-seeking underlies the reform impulse.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Generator', 'Manifesting Generator'],
      likelyCenters: ['Head defined', 'Ajna defined', 'Spleen defined'],
      communityNote:
        'Community observations correlate 1s with defined mental centers and Spleen (instinct-based decision-making).',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Projector or Generator',
        SO: 'Community suggests: Manifestor',
        SX: 'Community suggests: Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 2 — The Helper
  // ═══════════════════════════════════════════════════
  2: {
    mbti: {
      plausible: ['ENFJ', 'ESFJ', 'INFJ', 'ISFJ', 'ENFP', 'ESFP'],
      implausible: ['INTJ', 'INTP', 'ISTP', 'ENTJ'],
      cognitiveNote:
        'Fe dominance — external feeling, attunement to others\' emotional states. Interpersonal harmony and connection are the primary cognitive drivers. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Shifts ISFJ — quiet, behind-the-scenes nurturing. Least obvious 2. Warmth expressed through practical acts.',
        SO: 'Strongly ENFJ or ESFJ — the classic public helper. Visible, warm, community-oriented.',
        SX: 'Shifts ENFP or ESFP — seductive, intense, emotionally compelling. Most assertive 2.',
      },
      wingShift: {
        '2w1':
          'Pulls ISFJ or INFJ — duty-driven helping. More reserved, principled, self-critical.',
        '2w3':
          'Pulls ENFJ or ESFJ — performance-oriented helping. Charismatic, visible, achievement-flavored warmth.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Core heart type — no shift.',
          3: 'Heart 3 adds performance — shifts toward ENFJ or ENTJ. Extraversion and achievement focus rise.',
          4: 'Heart 4 adds depth — shifts toward INFJ. Emotional intensity and introspection increase.',
        },
        headTypes: {
          5: 'Head 5 adds analytical reserve — shifts toward INFJ. Most introverted 2.',
          6: 'Head 6 adds loyalty and anxiety — shifts toward ISFJ or ESFJ. Duty orientation strengthens.',
          7: 'Head 7 adds enthusiasm — shifts toward ENFP or ESFP. Lightest, most playful 2.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 5,
        max: 8,
        note: 'Moderate to high. Open to people, emotions, and experiences that deepen connection.',
      },
      conscientiousness: {
        min: 4,
        max: 7,
        note: 'Moderate. Conscientious about relationships, less about systems. 2w1 raises significantly.',
      },
      extraversion: {
        min: 6,
        max: 9,
        note: 'High — among highest of all types. Social engagement is energizing. SP2 drops to 5-6.',
      },
      agreeableness: {
        min: 8,
        max: 10,
        note: 'Highest of all nine types. The defining Big Five trait for Type 2. (Furnham 2013, Mooradian 1996)',
      },
      neuroticism: {
        min: 4,
        max: 7,
        note: 'Moderate — hidden anxiety about being needed. Rises at stress when help is rejected.',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Mooradian T. & Nezlek J. (1996). Comparing NEO-FFI and Enneagram. Psych Reports.',
        'Wagner J. (2010). Nine Lenses on the World.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'significant',
            note: 'SP minimizes — helping is private, behind-the-scenes',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SP raises — nurturing expressed through practical care',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO maximizes — public helping requires social engagement',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — community service requires organization',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — emotional intensity opens to new experiences',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — fear of abandonment intensifies',
          },
        ],
      },
      wingShift: {
        '2w1': [
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w1 adds principle and discipline',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'slight',
            note: 'w1 adds inner critic anxiety',
          },
        ],
        '2w3': [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w3 adds performance energy',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w3 adds achievement drive',
          },
        ],
      },
      lexiconShift: {
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals principled helping — Conscientiousness rises above typical Type 2 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 1 vocabulary signals inner critic — Neuroticism near upper bound',
          },
        ],
        4: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Openness rises above typical Type 2 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals intensity — Neuroticism at upper bound',
          },
        ],
        6: [
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 6 vocabulary signals anxiety — Neuroticism rises above typical 2 range',
          },
        ],
        8: [
          {
            trait: 'agreeableness',
            direction: 'down',
            note: 'Type 8 vocabulary signals assertion — Agreeableness drops below typical 2 range',
          },
        ],
      },
    },

    attachment: {
      primary: 'anxious',
      secondary: 'secure',
      mechanismNote:
        'Deep need for relational confirmation drives anxious attachment. Self-worth tied to being needed. Proximity-seeking through giving. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, genuine generosity without strings. At stress: anxious preoccupation, giving to get, resentment when unreciprocated.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Johnson S. (2008). Hold Me Tight.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: 'SP2 most secure-presenting — practical care feels less clingy. Anxiety hidden behind service.',
        SO: 'SO2 expresses anxious attachment through community — belongs by being indispensable.',
        SX: 'SX2 most intensely anxious — needs deep reciprocation from specific person. Fear of abandonment highest.',
      },
      wingShift: {
        '2w1':
          'w1 adds avoidant overlay — principled self-sufficiency conflicts with need to be needed.',
        '2w3':
          'w3 adds performance mask — anxious attachment hidden behind competent exterior.',
      },
      lexiconShift: {
        1: 'Type 1 vocabulary signals principled self-sufficiency — introduces avoidant elements into anxious base.',
        4: 'Type 4 vocabulary signals push-pull dynamics — shifts toward fearful-avoidant blend.',
        8: 'Type 8 vocabulary signals assertion of needs — paradoxically more secure expression of anxious core.',
        5: 'Type 5 vocabulary signals withdrawal — introduces avoidant elements that conflict with anxious base.',
      },
    },

    disc: {
      primary: ['I', 'S'],
      secondary: ['C'],
      mechanismNote:
        'Influence and Steadiness dominant — warmth, persuasion, supportive relationships. I rises with SX/SO, S rises with SP. The classic IS or SI blend. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure S — steady, reliable, practical support. Least flashy 2.',
        SO: 'IS blend — influence through warmth and community engagement.',
        SX: 'Pure I or ID blend — charismatic, persuasive, emotionally intense.',
      },
      wingShift: {
        '2w1': 'SC blend — Steadiness with Conscientiousness. Duty-driven helping.',
        '2w3': 'ID blend — Influence with Dominance. Achievement-oriented helping.',
      },
    },

    jungian: {
      active: ['The Caregiver', 'The Lover', 'The Magician'],
      shadow: 'The Destroyer',
      mechanismNote:
        'Caregiver is the primary — nurturing, self-sacrificing, finding identity through service. Lover in the deep relational attunement. Magician in the intuitive ability to know what others need. Shadow Destroyer is what the 2 most suppresses — the part that wants to take, to rage, to burn it all down. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Caregiver dominant — quiet, practical, behind-the-scenes nurturing.',
        SO: 'Magician dominant — transforming communities through relational insight.',
        SX: 'Lover dominant — deep, intense, one-on-one relational fusion.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler alongside The Caregiver — structured, principled helping.',
        8: 'Body 8 activates The Warrior — fiercest, most protective Caregiver.',
        9: 'Body 9 activates The Innocent — gentlest, most self-effacing 2.',
        5: 'Head 5 activates The Sage — most analytical and reserved 2.',
        6: 'Head 6 activates The Orphan — loyalty and anxiety drive the helping.',
        7: 'Head 7 activates The Jester — lightest, most playful 2.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Projector', 'Generator'],
      likelyCenters: ['Emotional Solar Plexus defined', 'Heart/Will defined', 'G Center defined'],
      communityNote:
        'Community observations correlate 2s with defined Emotional Solar Plexus and Heart Center (will-based giving and emotional attunement).',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Generator',
        SO: 'Community suggests: Projector',
        SX: 'Community suggests: Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 3 — The Achiever
  // ═══════════════════════════════════════════════════
  3: {
    mbti: {
      plausible: ['ENTJ', 'ESTJ', 'ENTP', 'ENFJ', 'ESTP', 'ESFJ'],
      implausible: ['INFP', 'ISFP', 'INTP', 'ISFJ'],
      cognitiveNote:
        'Te/Se dominance — external results orientation, pragmatic action, image-awareness. Judging or perceiving depends on subtype — SP3 can appear P. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Shifts ESTP or ISTP — efficiency-focused, least image-conscious 3. Action over presentation.',
        SO: 'Strongly ENTJ or ESTJ — classic corporate achiever. Status and social recognition drive.',
        SX: 'Shifts ENFJ or ESTP — charismatic, magnetic, achievement through personal allure.',
      },
      wingShift: {
        '3w2':
          'Pulls ENFJ or ESFJ — warmth in achievement. Builds success through relational skill.',
        '3w4':
          'Pulls ENTJ or INTJ — depth in achievement. More introspective, creative, emotionally complex.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward ENFJ or ESFJ. Agreeableness rises.',
          3: 'Core heart type — no shift.',
          4: 'Heart 4 adds introspection — shifts toward INTJ or INFJ. Openness rises.',
        },
        headTypes: {
          5: 'Head 5 adds analytical depth — shifts toward INTJ or ENTJ. Most strategic 3.',
          6: 'Head 6 adds loyalty and caution — shifts toward ESTJ. More conservative achievement.',
          7: 'Head 7 adds enthusiasm — shifts toward ENTP or ESTP. Most versatile, restless 3.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 4,
        max: 7,
        note: 'Moderate. Pragmatic rather than philosophical. 3w4 raises significantly toward 7-8.',
      },
      conscientiousness: {
        min: 7,
        max: 9,
        note: 'Very high. Achievement-driven discipline and goal pursuit. Second only to Type 1. (Furnham 2013)',
      },
      extraversion: {
        min: 6,
        max: 9,
        note: 'High — energized by social performance and recognition. SP3 drops to 5-6.',
      },
      agreeableness: {
        min: 3,
        max: 6,
        note: 'Low to moderate — competitive, image-managed. Warm when it serves goals. 3w2 raises toward 7.',
      },
      neuroticism: {
        min: 3,
        max: 6,
        note: 'Low to moderate externally — suppressed emotions. Rises under identity threat.',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Mooradian T. & Nezlek J. (1996). Comparing NEO-FFI and Enneagram. Psych Reports.',
        'Riso D. & Hudson R. (1999). The Wisdom of the Enneagram.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'moderate',
            note: 'SP lowers — efficiency over performance',
          },
          {
            trait: 'agreeableness',
            direction: 'down',
            magnitude: 'slight',
            note: 'SP lowers — least people-pleasing 3',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO maximizes — status requires visibility',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — institutional achievement demands discipline',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SX raises — allure requires emotional range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — identity tied to being desired',
          },
        ],
      },
      wingShift: {
        '3w2': [
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w2 adds warmth and relational skill',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'slight',
            note: 'w2 increases social engagement',
          },
        ],
        '3w4': [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w4 adds depth and introspection',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w4 adds emotional complexity',
          },
        ],
      },
      lexiconShift: {
        7: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 7 vocabulary signals enthusiasm — Openness rises above typical Type 3 range',
          },
          {
            trait: 'conscientiousness',
            direction: 'down',
            note: 'Type 7 vocabulary signals scattered energy — Conscientiousness drops slightly',
          },
        ],
        8: [
          {
            trait: 'agreeableness',
            direction: 'down',
            note: 'Type 8 vocabulary signals dominance — Agreeableness at lower bound',
          },
        ],
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals perfectionism — Conscientiousness at upper bound',
          },
        ],
        4: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Openness rises significantly',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional intensity — Neuroticism at upper bound',
          },
        ],
      },
    },

    attachment: {
      primary: 'avoidant',
      secondary: 'secure',
      mechanismNote:
        'Identity built around competence creates emotional avoidance — feelings slow you down. Vulnerability equals failure. Image management replaces genuine intimacy. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, authentic connection beyond performance. At stress: avoidant workaholism, emotional shutdown, identity crisis.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'medium',
      subtypeShift: {
        SP: 'SP3 most avoidant — efficiency replaces vulnerability. The workhorse who never stops.',
        SO: 'SO3 avoidant behind social performance — connected to role, disconnected from self.',
        SX: 'SX3 shifts toward anxious — identity tied to being desired creates dependency on partner.',
      },
      wingShift: {
        '3w2':
          'w2 introduces anxious elements — needs relational confirmation of success.',
        '3w4':
          'w4 introduces fearful-avoidant elements — wants depth but fears exposure.',
      },
      lexiconShift: {
        7: 'Type 7 vocabulary signals avoidance of pain — reinforces avoidant attachment through reframing.',
        2: 'Type 2 vocabulary signals need for relational validation — introduces anxious elements.',
        8: 'Type 8 vocabulary signals control orientation — reinforces avoidant through dominance.',
        4: 'Type 4 vocabulary signals longing — shifts toward fearful-avoidant, wanting closeness but fearing inauthenticity.',
      },
    },

    disc: {
      primary: ['D', 'I'],
      secondary: ['C'],
      mechanismNote:
        'Dominance and Influence blend — results-orientation with social adaptability. D rises with SP/SO, I rises with SX/SO. The classic high-performance DI profile. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure D — direct, efficient, results-focused. Least socially performing 3.',
        SO: 'DI blend — achieves through both force and influence. Classic executive profile.',
        SX: 'ID blend — influence through personal magnetism. Achievement through allure.',
      },
      wingShift: {
        '3w2': 'IS blend possible — influence with steadiness. Relational achiever.',
        '3w4': 'DC blend — dominance with conscientiousness. Strategic, depth-oriented achiever.',
      },
    },

    jungian: {
      active: ['The Hero', 'The Ruler', 'The Magician'],
      shadow: 'The Orphan',
      mechanismNote:
        'Hero in the achievement drive. Ruler in the need for status and control. Magician in the ability to shape-shift and transform image. Shadow Orphan is what the 3 most suppresses — the abandoned child who fears being worthless without achievement. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Hero dominant — relentless, efficient, action-oriented.',
        SO: 'Ruler dominant — achievement through institutional power and status.',
        SX: 'Magician dominant — transformation of self to captivate others.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler more strongly — principled achievement, structured success.',
        8: 'Body 8 activates The Warrior — the most forceful, dominating 3.',
        9: 'Body 9 activates The Innocent — achievement with least ego attachment (or most hidden ego).',
        2: 'Heart 2 activates The Caregiver — achievement through helping and relational power.',
        4: 'Heart 4 activates The Creator — achievement through unique creative expression.',
        5: 'Head 5 activates The Sage — most strategic, intellectual 3.',
        6: 'Head 6 activates The Orphan as secondary — loyalty and security concerns enter achievement.',
        7: 'Head 7 activates The Jester — lightest, most versatile 3.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Manifestor', 'Manifesting Generator'],
      likelyCenters: ['Heart/Will defined', 'Sacral defined', 'Throat defined'],
      communityNote:
        'Community observations correlate 3s with defined Heart/Will Center (willpower and material ambition) and Throat Center (manifestation).',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Generator or Manifesting Generator',
        SO: 'Community suggests: Manifestor',
        SX: 'Community suggests: Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 4 — The Individualist
  // ═══════════════════════════════════════════════════
  4: {
    mbti: {
      plausible: ['INFP', 'INFJ', 'ISFP', 'ENFP', 'INTJ', 'ENFJ'],
      implausible: ['ESTJ', 'ESTP', 'ESFJ', 'ISTJ'],
      cognitiveNote:
        'Fi dominance — internal feeling, personal values, identity formation through emotional depth. N preference typical — drawn to meaning, metaphor, abstraction. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Shifts ISFP — creative through physical, sensory, practical expression. Least dramatic 4. Stoic suffering.',
        SO: 'Shifts INFJ or ENFJ — suffering shared socially. Identity through being the compassionate outsider.',
        SX: 'Strongly INFP or ENFP — intensity, emotional volatility, the classic romantic 4.',
      },
      wingShift: {
        '4w3':
          'Pulls ENFP or ENFJ — more extraverted, performance-oriented, achievement through uniqueness.',
        '4w5':
          'Pulls INTJ or INFJ — more withdrawn, intellectual, abstract. Most introverted 4.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward ENFJ or INFJ. Agreeableness and extraversion rise.',
          3: 'Heart 3 adds performance — shifts toward ENFP or ENFJ. Achievement-oriented uniqueness.',
          4: 'Core heart type — no shift.',
        },
        headTypes: {
          5: 'Head 5 adds analytical withdrawal — shifts toward INTJ. Most reclusive, intellectual 4.',
          6: 'Head 6 adds anxiety and loyalty — shifts toward INFJ. More dutiful, less rebellious.',
          7: 'Head 7 adds enthusiasm — shifts toward ENFP. Most extraverted, optimistic 4.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 8,
        max: 10,
        note: 'Highest of all nine types alongside Type 7. The defining Big Five trait for Type 4. Aesthetic sensitivity, emotional depth, imagination. (Furnham 2013, Gurven 2013)',
      },
      conscientiousness: {
        min: 2,
        max: 5,
        note: 'Low. Structure feels constraining. Internal rhythm supersedes external standards.',
      },
      extraversion: {
        min: 3,
        max: 6,
        note: 'Low to moderate. Rich inner world. 4w3 and SX4 raise significantly.',
      },
      agreeableness: {
        min: 3,
        max: 7,
        note: 'Wide range — authenticity over harmony. Can be gentle or cutting depending on health.',
      },
      neuroticism: {
        min: 7,
        max: 10,
        note: 'Highest of all nine types alongside Type 6. Emotional intensity, melancholy, sensitivity to loss. (Gurven 2013)',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Gurven M. et al. (2013). Human Nature.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'neuroticism',
            direction: 'down',
            magnitude: 'moderate',
            note: 'SP lowers — suffering is endured stoically, not displayed',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SP raises — practical demands impose some structure',
          },
        ],
        SO: [
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO raises — identity through compassionate connection',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — suffering shared socially',
          },
        ],
        SX: [
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'significant',
            note: 'SX maximizes — emotional intensity is the core',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — intensity requires engagement',
          },
        ],
      },
      wingShift: {
        '4w3': [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w3 adds social performance energy',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w3 adds achievement drive',
          },
        ],
        '4w5': [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'significant',
            note: 'w5 deepens introversion significantly',
          },
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w5 adds intellectual depth to aesthetic sensitivity',
          },
        ],
      },
      lexiconShift: {
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals standards — Conscientiousness rises above typical Type 4 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 1 vocabulary signals inner critic — Neuroticism at upper bound',
          },
        ],
        2: [
          {
            trait: 'agreeableness',
            direction: 'up',
            note: 'Type 2 vocabulary signals warmth — Agreeableness rises above typical Type 4 range',
          },
        ],
        5: [
          {
            trait: 'extraversion',
            direction: 'down',
            note: 'Type 5 vocabulary signals withdrawal — Extraversion at lower bound',
          },
        ],
        7: [
          {
            trait: 'extraversion',
            direction: 'up',
            note: 'Type 7 vocabulary signals enthusiasm — Extraversion rises above typical 4 range',
          },
          {
            trait: 'neuroticism',
            direction: 'down',
            note: 'Type 7 vocabulary signals reframing — Neuroticism may drop slightly',
          },
        ],
      },
    },

    attachment: {
      primary: 'fearful_avoidant',
      secondary: 'anxious',
      mechanismNote:
        'The classic push-pull pattern — deep longing for connection paired with fear of being truly seen. "If you knew the real me, you\'d leave." Idealization and devaluation cycle. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, equanimity with emotional flow. At stress: fearful-avoidant cycling, self-sabotage in relationships, chronic abandonment fear.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Naranjo C. (1994). Character and Neurosis.',
        'Johnson S. (2008). Hold Me Tight.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: 'SP4 most avoidant-presenting — suffers internally, doesn\'t reach out. Masochistic endurance.',
        SO: 'SO4 shifts toward anxious — identity through being the compassionate outsider in groups.',
        SX: 'SX4 most intensely fearful-avoidant — the classic push-pull. Passionate and then withdrawing.',
      },
      wingShift: {
        '4w3':
          'w3 adds avoidant overlay — performance mask hides vulnerability. Fears being seen as ordinary.',
        '4w5':
          'w5 deepens avoidant — withdrawal into inner world. Least relationally available 4.',
      },
      lexiconShift: {
        2: 'Type 2 vocabulary signals need for connection — shifts toward anxious, less avoidant component.',
        1: 'Type 1 vocabulary signals self-criticism — reinforces fearful-avoidant through unworthiness beliefs.',
        7: 'Type 7 vocabulary signals avoidance of pain — may mask fearful-avoidant with optimistic veneer.',
        8: 'Type 8 vocabulary signals assertion — may shift toward dismissive avoidant rather than fearful.',
      },
    },

    disc: {
      primary: ['C', 'I'],
      secondary: ['S'],
      mechanismNote:
        'Conscientiousness (analytical depth, quality focus) with Influence (emotional expressiveness). Not typical organizational C — this is artistic, emotional C. S rises with SP4. (Riso & Hudson 1999)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'CS blend — quiet, precise, enduring. Most grounded 4.',
        SO: 'IS blend — influence through emotional sharing in groups.',
        SX: 'Pure I or IC blend — intense emotional expression, dramatic influence.',
      },
      wingShift: {
        '4w3': 'DI blend possible — driven creativity with interpersonal magnetism.',
        '4w5': 'Pure C — analytical, withdrawn, the hermit artist.',
      },
    },

    jungian: {
      active: ['The Lover', 'The Creator', 'The Outlaw'],
      shadow: 'The Innocent',
      mechanismNote:
        'Lover in the emotional depth and relational longing. Creator in the unique self-expression. Outlaw in the rejection of conventional identity. Shadow Innocent is what the 4 most suppresses — the part that longs for simple happiness, uncomplicated belonging. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Creator dominant — expression through craft, physical medium, endurance.',
        SO: 'Outlaw dominant — identity through being the outsider who names suffering.',
        SX: 'Lover dominant — intensity, passion, the romantic quest for the beloved.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler — principled creativity, standards applied to art.',
        8: 'Body 8 activates The Warrior — fierce emotional assertion, the most confrontational 4.',
        9: 'Body 9 activates The Innocent — gentlest 4, creative through dreaming rather than doing.',
        2: 'Heart 2 activates The Caregiver — creativity in service of others\' healing.',
        3: 'Heart 3 activates The Hero — achievement through unique creative expression.',
        5: 'Head 5 activates The Sage — intellectual depth in creative vision.',
        6: 'Head 6 activates The Orphan — anxiety and loyalty enter creative expression.',
        7: 'Head 7 activates The Jester — lightest 4, creativity through play and reframing.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Projector', 'Reflector'],
      likelyCenters: ['Emotional Solar Plexus defined', 'G Center defined', 'Throat defined'],
      communityNote:
        'Community observations correlate 4s with defined Emotional Solar Plexus (emotional depth) and G Center (identity and direction). Projector energy matches the 4\'s waiting to be recognized.',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Projector',
        SO: 'Community suggests: Projector or Reflector',
        SX: 'Community suggests: Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 5 — The Investigator
  // ═══════════════════════════════════════════════════
  5: {
    mbti: {
      plausible: ['INTJ', 'INTP', 'ISTJ', 'INFJ', 'ISTP', 'ENTJ'],
      implausible: ['ESFP', 'ESFJ', 'ENFP', 'ESTP'],
      cognitiveNote:
        'Ti/Ni dominance — internal thinking, pattern recognition, systemic analysis. Introversion near-universal. Thinking preference dominant. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Strongly ISTP or ISTJ — concrete, practical, sensory-engaged withdrawal. The most embodied 5.',
        SO: 'Shifts INTJ or ENTJ — knowledge as social currency. Most externally engaged 5.',
        SX: 'Shifts INFJ or INTP — intense one-on-one intellectual/emotional fusion. Most emotionally available 5.',
      },
      wingShift: {
        '5w4':
          'Pulls INFJ or INTP — emotional depth, aesthetic sensibility, creative intellectual.',
        '5w6':
          'Pulls ISTJ or INTJ — more cautious, systematic, loyal to frameworks. Most practical 5.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward INFJ. Most relational 5.',
          3: 'Heart 3 adds performance — shifts toward INTJ or ENTJ. Most externally competent 5.',
          4: 'Heart 4 adds depth — shifts toward INFP or INFJ. Emotional-intellectual fusion.',
        },
        headTypes: {
          5: 'Core head type — no shift.',
          6: 'Head 6 adds anxiety and loyalty — shifts toward ISTJ. More security-oriented.',
          7: 'Head 7 adds enthusiasm — shifts toward INTP or ENTP. Most exploratory, playful 5.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 7,
        max: 10,
        note: 'Very high. Intellectual curiosity, love of ideas, unconventional thinking. Less aesthetic than Type 4 openness. (Furnham 2013)',
      },
      conscientiousness: {
        min: 3,
        max: 7,
        note: 'Moderate. Disciplined in areas of interest, neglectful elsewhere. 5w6 raises significantly.',
      },
      extraversion: {
        min: 1,
        max: 4,
        note: 'Lowest of all nine types. The defining Big Five trait for Type 5. Social energy is scarce. (Gurven 2013)',
      },
      agreeableness: {
        min: 2,
        max: 5,
        note: 'Low. Detachment, emotional reserve, intellectual honesty over social harmony.',
      },
      neuroticism: {
        min: 3,
        max: 7,
        note: 'Moderate — anxiety exists but is managed through withdrawal and intellectualization.',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Gurven M. et al. (2013). Human Nature.',
        'Duckworth A. (2016). Grit.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'moderate',
            note: 'SP minimizes — most reclusive 5',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SP raises — practical demands impose structure',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO raises — knowledge shared in groups',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — social knowledge exchange requires some warmth',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — intensity opens to emotional and intellectual extremes',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — emotional fusion creates vulnerability anxiety',
          },
        ],
      },
      wingShift: {
        '5w4': [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w4 adds aesthetic and emotional depth',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w4 adds emotional intensity',
          },
        ],
        '5w6': [
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w6 adds systematic discipline',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'slight',
            note: 'w6 adds security anxiety',
          },
        ],
      },
      lexiconShift: {
        4: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Openness at upper bound with aesthetic component',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional intensity — Neuroticism rises above typical 5 range',
          },
        ],
        8: [
          {
            trait: 'agreeableness',
            direction: 'down',
            note: 'Type 8 vocabulary signals assertion — Agreeableness at lower bound',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            note: 'Type 8 vocabulary signals force — Extraversion rises slightly',
          },
        ],
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals standards — Conscientiousness rises above typical 5 range',
          },
        ],
        7: [
          {
            trait: 'extraversion',
            direction: 'up',
            note: 'Type 7 vocabulary signals enthusiasm — Extraversion rises above typical 5 range',
          },
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 7 vocabulary signals exploratory drive — Openness at upper bound',
          },
        ],
      },
    },

    attachment: {
      primary: 'avoidant',
      secondary: 'fearful_avoidant',
      mechanismNote:
        'Most consistently avoidant type across research. Resources (time, energy, emotional bandwidth) are finite — closeness depletes them. Self-sufficiency is survival. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, able to share resources and emotional presence. At stress: extreme avoidant withdrawal, emotional numbness, fortress mentality.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: 'SP5 most avoidant — withdrawal into physical space. Castle and moat. Most extreme isolation.',
        SO: 'SO5 avoidant with intellectual engagement — connected through ideas, disconnected emotionally.',
        SX: 'SX5 shifts toward fearful-avoidant — wants intense fusion but fears engulfment. Most conflicted attachment.',
      },
      wingShift: {
        '5w4':
          'w4 introduces fearful-avoidant elements — longing for depth conflicts with withdrawal imperative.',
        '5w6':
          'w6 introduces anxious elements — loyalty needs conflict with detachment needs.',
      },
      lexiconShift: {
        4: 'Type 4 vocabulary signals longing — shifts from pure avoidant toward fearful-avoidant. Wants connection while fearing it.',
        2: 'Type 2 vocabulary signals relational need — introduces anxious elements into avoidant base. Unusual and destabilizing.',
        8: 'Type 8 vocabulary signals control — reinforces avoidant through dominance and boundary enforcement.',
        7: 'Type 7 vocabulary signals avoidance of pain — reinforces avoidant through intellectualized escape.',
      },
    },

    disc: {
      primary: ['C'],
      secondary: ['S'],
      mechanismNote:
        'Conscientiousness dominant — analytical precision, depth over breadth, quality over speed. The purest C alongside Type 1, but Type 5 C is curiosity-driven while Type 1 C is standards-driven. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure C — reclusive analyst. The most extreme C-without-D in the Enneagram.',
        SO: 'CD blend possible — knowledge as power in social systems.',
        SX: 'CS blend — depth with relational steadiness in one-on-one.',
      },
      wingShift: {
        '5w4': 'CI blend possible — conscientiousness with influence through creative expression.',
        '5w6': 'CS blend — conscientiousness with steadiness. Most reliable, systematic 5.',
      },
    },

    jungian: {
      active: ['The Sage', 'The Hermit', 'The Magician'],
      shadow: 'The Innocent',
      mechanismNote:
        'Sage as the primary — knowledge, understanding, wisdom through observation. Hermit in the withdrawal and contemplation. Magician in the transformation of knowledge into power. Shadow Innocent is what the 5 most suppresses — the trusting, open child who engages without calculation. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Hermit dominant — withdrawal into private space and practical mastery.',
        SO: 'Sage dominant — knowledge shared as social contribution.',
        SX: 'Magician dominant — transformative one-on-one intellectual fusion.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler — knowledge applied to standards and reform.',
        8: 'Body 8 activates The Warrior — knowledge as power. Most assertive 5.',
        9: 'Body 9 activates The Innocent — gentlest 5, knowledge through peaceful contemplation.',
        2: 'Heart 2 activates The Caregiver — knowledge in service of others. Most relational 5.',
        3: 'Heart 3 activates The Hero — knowledge applied to achievement.',
        4: 'Heart 4 activates The Creator — knowledge fused with aesthetic expression.',
        6: 'Head 6 activates The Orphan — security-seeking underlies the knowledge quest.',
        7: 'Head 7 activates The Jester — playful exploration, most versatile intellectual.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Projector', 'Reflector'],
      likelyCenters: ['Head defined', 'Ajna defined', 'Root undefined'],
      communityNote:
        'Community observations correlate 5s with defined Head and Ajna centers (mental processing) and undefined Root (susceptibility to pressure that drives withdrawal). Projector energy matches the 5\'s need to be invited.',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Projector',
        SO: 'Community suggests: Projector or Generator',
        SX: 'Community suggests: Projector or Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 6 — The Loyalist
  // ═══════════════════════════════════════════════════
  6: {
    mbti: {
      plausible: ['ISFJ', 'ISTJ', 'INFJ', 'ESTJ', 'ENFJ', 'ENTJ', 'ESTP'],
      implausible: ['ENFP', 'INFP', 'INTP', 'ISFP'],
      cognitiveNote:
        'Si/Ni dominant — reference to established frameworks, anticipation of threats, loyalty to known structures. J preference common but counterphobic 6 can appear P. ESTP for counterphobic. (Berens & Nardi 2004)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Shifts ISTJ or ISFJ — phobic expression. Cautious, dutiful, risk-averse. Warmth through loyalty.',
        SO: 'Shifts ESTJ or ENFJ — duty expressed through group alignment. Institutional loyalty.',
        SX: 'Shifts ESTP or ENTJ — counterphobic expression. Confronts fear through action. Most assertive 6.',
      },
      wingShift: {
        '6w5':
          'Pulls ISTJ or INTJ — more analytical, withdrawn, systematic. Knowledge as security.',
        '6w7':
          'Pulls ESFJ or ENFJ — more engaging, optimistic, anxiety managed through social connection.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward ISFJ or ESFJ. Agreeableness rises. Loyalty through care.',
          3: 'Heart 3 adds performance — shifts toward ESTJ or ENTJ. Achievement manages anxiety.',
          4: 'Heart 4 adds depth — shifts toward INFJ. Emotional intensity enters the loyalty framework.',
        },
        headTypes: {
          5: 'Head 5 adds analytical withdrawal — shifts toward ISTJ or INTJ. Most introverted 6.',
          6: 'Core head type — no shift.',
          7: 'Head 7 adds enthusiasm — shifts toward ENFJ or ESFJ. Lightest, most optimistic 6.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 3,
        max: 6,
        note: 'Low to moderate. Prefers known frameworks. Novelty feels threatening. Counterphobic 6 slightly higher.',
      },
      conscientiousness: {
        min: 6,
        max: 9,
        note: 'High. Duty, preparation, vigilance, contingency planning. Among highest after Types 1 and 3. (Furnham 2013)',
      },
      extraversion: {
        min: 3,
        max: 7,
        note: 'Wide range — phobic 6 at 3-5, counterphobic at 5-7. SX6 can appear extraverted.',
      },
      agreeableness: {
        min: 3,
        max: 8,
        note: 'Widest range of all types — phobic 6 highly agreeable (7-8), counterphobic 6 low (3-4). Subtype is key.',
      },
      neuroticism: {
        min: 7,
        max: 10,
        note: 'Highest alongside Type 4. Vigilance, anticipatory anxiety, worst-case thinking. The defining Big Five trait for Type 6. (Gurven 2013)',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Gurven M. et al. (2013). Human Nature.',
        'Riso D. & Hudson R. (1999). The Wisdom of the Enneagram.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SP maximizes — personal safety is paramount',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SP raises — phobic warmth through caution and care',
          },
        ],
        SO: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO raises — duty to group demands discipline',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — group engagement required',
          },
        ],
        SX: [
          {
            trait: 'agreeableness',
            direction: 'down',
            magnitude: 'significant',
            note: 'SX lowers — counterphobic assertion replaces compliance',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — confronting fear requires action',
          },
        ],
      },
      wingShift: {
        '6w5': [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'moderate',
            note: 'w5 deepens introversion and analytical withdrawal',
          },
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w5 adds intellectual curiosity',
          },
        ],
        '6w7': [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w7 adds social energy and optimism',
          },
          {
            trait: 'neuroticism',
            direction: 'down',
            magnitude: 'slight',
            note: 'w7 manages anxiety through positivity',
          },
        ],
      },
      lexiconShift: {
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals standards — Conscientiousness at upper bound',
          },
        ],
        4: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Openness rises above typical 6 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals intensity — Neuroticism at upper bound',
          },
        ],
        8: [
          {
            trait: 'agreeableness',
            direction: 'down',
            note: 'Type 8 vocabulary signals dominance — Agreeableness drops significantly (counterphobic)',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            note: 'Type 8 vocabulary signals assertion — Extraversion rises',
          },
        ],
        9: [
          {
            trait: 'agreeableness',
            direction: 'up',
            note: 'Type 9 vocabulary signals accommodation — Agreeableness at upper bound (phobic)',
          },
          {
            trait: 'neuroticism',
            direction: 'down',
            note: 'Type 9 vocabulary signals numbing — Neuroticism may appear lower',
          },
        ],
      },
    },

    attachment: {
      primary: 'anxious',
      secondary: 'fearful_avoidant',
      mechanismNote:
        'Core anxiety creates hypervigilance in relationships. Trust is earned slowly and tested often. Loyalty is the response to attachment insecurity. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, trust in self and others. At stress: anxious preoccupation, testing loyalty, projection of worst-case scenarios onto partner.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Chestnut B. (2013). The Complete Enneagram.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: 'SP6 most anxious — personal safety and security dominate. Most phobic expression.',
        SO: 'SO6 anxious expressed through group loyalty — belonging manages anxiety.',
        SX: 'SX6 shifts toward fearful-avoidant — counterphobic confrontation of fear looks like avoidant assertion.',
      },
      wingShift: {
        '6w5':
          'w5 adds avoidant elements — withdrawal when trust is broken. Analytical distance.',
        '6w7':
          'w7 adds secure-presenting overlay — anxiety masked by optimism and social engagement.',
      },
      lexiconShift: {
        8: 'Type 8 vocabulary signals counterphobic energy — shifts from anxious toward fearful-avoidant with dominant exterior.',
        2: 'Type 2 vocabulary signals helping — anxious attachment expressed through caretaking.',
        9: 'Type 9 vocabulary signals numbing — may mask anxious attachment with apparent calm.',
        4: 'Type 4 vocabulary signals push-pull — intensifies fearful-avoidant component.',
      },
    },

    disc: {
      primary: ['S', 'C'],
      secondary: ['D'],
      mechanismNote:
        'Steadiness and Conscientiousness dominant — loyalty, caution, systematic preparation. D rises in counterphobic 6 (SX6). The SC or CS blend captures phobic 6; SD or DC captures counterphobic 6. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure S or SC blend — cautious, loyal, protective. Most phobic expression.',
        SO: 'SC blend — steadiness in group context. Duty and loyalty to institution.',
        SX: 'DS or DC blend — counterphobic assertion. Most assertive 6 DISC profile.',
      },
      wingShift: {
        '6w5': 'CS blend — conscientiousness with analytical depth. Systematic, withdrawn.',
        '6w7': 'SI blend — steadiness with influence. Warm, engaging, optimistic exterior.',
      },
    },

    jungian: {
      active: ['The Orphan', 'The Warrior', 'The Caregiver'],
      shadow: 'The Destroyer',
      mechanismNote:
        'Orphan as the primary — seeking safety, belonging, protection from a dangerous world. Warrior in the loyalty and courage to face fear. Caregiver in the protective devotion to loved ones. Shadow Destroyer is what the 6 most suppresses — the part that could betray, destroy trust, act without loyalty. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Orphan dominant — safety-seeking, cautious, the most phobic expression.',
        SO: 'Caregiver dominant — loyalty expressed through group protection and duty.',
        SX: 'Warrior dominant — counterphobic. Faces fear through direct confrontation.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler — principled loyalty, reform through duty.',
        8: 'Body 8 activates The Warrior strongly — most assertive, counterphobic 6.',
        9: 'Body 9 activates The Innocent — gentlest 6, loyalty through peaceful belonging.',
        2: 'Heart 2 activates The Caregiver strongly — loyalty expressed through helping.',
        3: 'Heart 3 activates The Hero — anxiety managed through achievement.',
        4: 'Heart 4 activates The Lover — emotional depth enters the loyalty framework.',
        5: 'Head 5 activates The Sage — analytical approach to managing anxiety.',
        7: 'Head 7 activates The Jester — lightest 6, anxiety managed through humor.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Generator', 'Projector'],
      likelyCenters: ['Spleen defined', 'Root defined', 'Emotional Solar Plexus defined'],
      communityNote:
        'Community observations correlate 6s with defined Spleen (instinctual awareness/fear) and Root Center (adrenal pressure driving vigilance).',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Generator',
        SO: 'Community suggests: Projector or Generator',
        SX: 'Community suggests: Manifestor or Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 7 — The Enthusiast
  // ═══════════════════════════════════════════════════
  7: {
    mbti: {
      plausible: ['ENFP', 'ENTP', 'ESFP', 'ESTP', 'ENTJ', 'ENFJ'],
      implausible: ['ISTJ', 'ISFJ', 'INFJ', 'INTJ'],
      cognitiveNote:
        'Ne/Se dominant — external perceiving, possibility-generation, sensory engagement. P preference common but organized 7s can appear J. Extraversion near-universal. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Shifts ESFP or ESTP — sensory pleasure, practical adventure. Most grounded 7.',
        SO: 'Shifts ENFP or ENTP — ideas and connections in groups. Social butterflies.',
        SX: 'Shifts ENFP or ENFJ — intense, focused enthusiasm on specific person or passion. Most focused 7.',
      },
      wingShift: {
        '7w6':
          'Pulls ENFP or ESFP — warmer, more loyal, anxiety adds depth. The "buddy" 7.',
        '7w8':
          'Pulls ENTP or ESTP — more assertive, driven, takes what they want. The "realist" 7.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward ENFJ or ESFJ. Most relational 7.',
          3: 'Heart 3 adds performance — shifts toward ENTJ or ENTP. Achievement-oriented enthusiasm.',
          4: 'Heart 4 adds depth — shifts toward ENFP. Most emotionally complex 7.',
        },
        headTypes: {
          5: 'Head 5 adds analytical depth — shifts toward ENTP or INTP. Most intellectual 7.',
          6: 'Head 6 adds loyalty and caution — shifts toward ENFP. More grounded, loyal.',
          7: 'Core head type — no shift.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 8,
        max: 10,
        note: 'Highest alongside Type 4. The defining Big Five trait for Type 7. Novelty-seeking, imagination, breadth of interests. (Furnham 2013, Gurven 2013)',
      },
      conscientiousness: {
        min: 2,
        max: 6,
        note: 'Low to moderate. Structure feels constraining. Focus is broad rather than deep. 7w6 raises somewhat.',
      },
      extraversion: {
        min: 7,
        max: 10,
        note: 'Highest of all nine types alongside Type 2. Energized by stimulation, people, experiences. (Gurven 2013)',
      },
      agreeableness: {
        min: 5,
        max: 8,
        note: 'Moderate to high. Generally positive and enthusiastic but can be self-serving. 7w6 highest.',
      },
      neuroticism: {
        min: 2,
        max: 5,
        note: 'Low — anxiety managed through reframing and avoidance of pain. Hidden anxiety may be higher than expressed.',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Gurven M. et al. (2013). Human Nature.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'slight',
            note: 'SP slightly lowers — pleasure through direct sensory experience',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SP slightly raises — practical needs impose some structure',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO maximizes — social engagement is the primary mode',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — group harmony through enthusiasm',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — intensity opens to extreme experiences',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — focused passion creates vulnerability',
          },
        ],
      },
      wingShift: {
        '7w6': [
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w6 adds loyalty and warmth',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w6 adds anxiety and caution',
          },
        ],
        '7w8': [
          {
            trait: 'agreeableness',
            direction: 'down',
            magnitude: 'moderate',
            note: 'w8 adds assertiveness over accommodation',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w8 adds strategic focus',
          },
        ],
      },
      lexiconShift: {
        4: [
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Neuroticism rises above typical 7 range',
          },
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals aesthetic sensitivity — Openness at upper bound',
          },
        ],
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals standards — Conscientiousness rises above typical 7 range',
          },
        ],
        5: [
          {
            trait: 'extraversion',
            direction: 'down',
            note: 'Type 5 vocabulary signals withdrawal — Extraversion drops below typical 7 range',
          },
        ],
        8: [
          {
            trait: 'agreeableness',
            direction: 'down',
            note: 'Type 8 vocabulary signals dominance — Agreeableness drops below typical 7 range',
          },
        ],
      },
    },

    attachment: {
      primary: 'avoidant',
      secondary: 'secure',
      mechanismNote:
        'Avoidance of pain, limitation, and dependency through cognitive reframing. Freedom is paramount. Commitment feels like a cage. Positive reframing replaces emotional processing. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, depth through commitment, joy that includes sorrow. At stress: avoidant flight, addiction to stimulation, emotional bypassing.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'medium',
      subtypeShift: {
        SP: 'SP7 most avoidant — freedom through practical independence. Least emotionally available.',
        SO: 'SO7 avoidant behind social engagement — connected to fun, disconnected from depth.',
        SX: 'SX7 shifts toward anxious — focused passion on one person creates dependency anxiety.',
      },
      wingShift: {
        '7w6':
          'w6 introduces anxious elements — loyalty needs conflict with freedom needs.',
        '7w8':
          'w8 deepens avoidant — assertion of independence, less tolerance for constraint.',
      },
      lexiconShift: {
        4: 'Type 4 vocabulary signals emotional depth — challenges avoidant reframing. May shift toward fearful-avoidant.',
        1: 'Type 1 vocabulary signals duty — introduces structured engagement that conflicts with freedom.',
        5: 'Type 5 vocabulary signals withdrawal — reinforces avoidant through intellectual detachment.',
        6: 'Type 6 vocabulary signals anxiety — surfaces hidden anxiety beneath optimism.',
      },
    },

    disc: {
      primary: ['I', 'D'],
      secondary: ['S'],
      mechanismNote:
        'Influence dominant — enthusiasm, optimism, persuasion, social energy. D rises with 7w8 and SX7 where assertiveness increases. The classic high-I profile. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'IS blend — influence through sensory enjoyment and practical enthusiasm.',
        SO: 'Pure I — the most influence-dominant profile in the Enneagram.',
        SX: 'ID blend — influence focused through intense personal passion.',
      },
      wingShift: {
        '7w6': 'IS blend — influence with steadiness. Loyal, warm, the "buddy" profile.',
        '7w8': 'DI blend — dominance with influence. Assertive, driven, takes what they want.',
      },
    },

    jungian: {
      active: ['The Jester', 'The Explorer', 'The Hero'],
      shadow: 'The Orphan',
      mechanismNote:
        'Jester as the primary — joy, play, reframing pain as possibility. Explorer in the endless quest for new experiences. Hero in the optimistic belief they can overcome anything. Shadow Orphan is what the 7 most suppresses — the wounded, limited, dependent child who cannot escape pain. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Explorer dominant — sensory adventure, practical pleasure-seeking.',
        SO: 'Jester dominant — social joy, the entertainer and connector.',
        SX: 'Hero dominant — intense passion, focused quest for the ultimate experience.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler — structured enthusiasm, principled adventure.',
        8: 'Body 8 activates The Warrior — assertive pleasure-seeking, most forceful 7.',
        9: 'Body 9 activates The Innocent — gentlest 7, joy through peaceful contentment.',
        2: 'Heart 2 activates The Caregiver — enthusiasm in service of others\' joy.',
        3: 'Heart 3 activates The Hero more strongly — achievement through versatile excellence.',
        4: 'Heart 4 activates The Lover — emotional depth enters the joy framework. Most complex 7.',
        5: 'Head 5 activates The Sage — intellectual depth in exploration. Most analytical 7.',
        6: 'Head 6 activates The Orphan as secondary — loyalty and anxiety ground the enthusiasm.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Manifesting Generator', 'Manifestor'],
      likelyCenters: ['Sacral defined', 'Throat defined', 'G Center defined'],
      communityNote:
        'Community observations correlate 7s with defined Sacral (life force energy) and Throat (manifestation and expression). Manifesting Generator energy matches the 7\'s multi-passionate nature.',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Generator or Manifesting Generator',
        SO: 'Community suggests: Manifesting Generator',
        SX: 'Community suggests: Manifestor',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 8 — The Challenger
  // ═══════════════════════════════════════════════════
  8: {
    mbti: {
      plausible: ['ENTJ', 'ESTP', 'INTJ', 'ESTJ', 'ENTP', 'ISTP'],
      implausible: ['INFP', 'ISFJ', 'ISFP', 'ENFP'],
      cognitiveNote:
        'Te/Se dominant — external action, pragmatic force, immediate impact. T preference near-universal. Assertive and direct cognitive style. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Shifts ISTP or ESTP — survival-focused, practical, least verbal 8. Power through material security.',
        SO: 'Strongly ENTJ or ESTJ — power through institutional leadership and social influence.',
        SX: 'Shifts ESTP or ENTP — charismatic, provocative, power through personal magnetism and challenge.',
      },
      wingShift: {
        '8w7':
          'Pulls ESTP or ENTP — expansive, energetic, the most extraverted and impulsive 8.',
        '8w9':
          'Pulls INTJ or ISTJ — quieter, more contained, strategic power. The "bear" — calm until provoked.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds protectiveness — shifts toward ENFJ or ESTJ. Most relational 8.',
          3: 'Heart 3 adds achievement — shifts toward ENTJ. Power through accomplishment.',
          4: 'Heart 4 adds emotional depth — shifts toward INTJ or ENTP. Most introspective 8.',
        },
        headTypes: {
          5: 'Head 5 adds analytical depth — shifts toward INTJ. Most strategic, cerebral 8.',
          6: 'Head 6 adds loyalty — shifts toward ESTJ. Most dutiful, protective 8.',
          7: 'Head 7 adds enthusiasm — shifts toward ESTP or ENTP. Most expansive, energetic 8.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 4,
        max: 7,
        note: 'Moderate. Pragmatic over theoretical. Open to direct experience, less to abstraction. 8w7 raises.',
      },
      conscientiousness: {
        min: 5,
        max: 8,
        note: 'Moderate to high. Disciplined in pursuit of goals but less about perfectionism. Rules followed only when useful.',
      },
      extraversion: {
        min: 5,
        max: 9,
        note: 'High. Assertive, dominant, energetic. SP8 drops to 5-6. Among most extraverted types.',
      },
      agreeableness: {
        min: 1,
        max: 4,
        note: 'Lowest of all nine types. The defining Big Five trait for Type 8. Direct, confrontational, unyielding. (Furnham 2013, Gurven 2013)',
      },
      neuroticism: {
        min: 1,
        max: 4,
        note: 'Lowest alongside Type 9. Vulnerability denied, anger externalized rather than internalized. (Gurven 2013)',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Gurven M. et al. (2013). Human Nature.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'moderate',
            note: 'SP lowers — power through material security, not social dominance',
          },
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SP raises — survival demands discipline',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO raises — institutional power requires visibility',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises slightly — leading requires some social skill',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — provocative, boundary-pushing intensity',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — vulnerability in intimate domain creates rare anxiety',
          },
        ],
      },
      wingShift: {
        '8w7': [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w7 adds expansive social energy',
          },
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'slight',
            note: 'w7 adds adventurous openness',
          },
        ],
        '8w9': [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'moderate',
            note: 'w9 creates quieter, more contained presence',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w9 softens confrontational edge significantly',
          },
        ],
      },
      lexiconShift: {
        5: [
          {
            trait: 'extraversion',
            direction: 'down',
            note: 'Type 5 vocabulary signals withdrawal — Extraversion drops below typical 8 range',
          },
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 5 vocabulary signals intellectual depth — Openness rises',
          },
        ],
        2: [
          {
            trait: 'agreeableness',
            direction: 'up',
            note: 'Type 2 vocabulary signals care — Agreeableness rises above typical 8 range',
          },
        ],
        4: [
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Neuroticism rises above typical 8 range',
          },
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals aesthetic sensitivity — Openness rises',
          },
        ],
        7: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 7 vocabulary signals enthusiasm — Openness at upper bound',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            note: 'Type 7 vocabulary signals positivity — Agreeableness rises slightly',
          },
        ],
      },
    },

    attachment: {
      primary: 'avoidant',
      secondary: 'secure',
      mechanismNote:
        'Vulnerability is weakness. Control replaces trust. Self-reliance is non-negotiable. Will not ask for help until absolutely necessary. (Levine & Heller 2010)',
      healthNote:
        'At high health: earned security, protective tenderness, vulnerability as strength. At stress: avoidant domination, emotional bulldozing, control as substitute for intimacy.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Naranjo C. (1994). Character and Neurosis.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: 'SP8 most avoidant — self-reliance through material independence. Fortress mentality.',
        SO: 'SO8 avoidant behind leadership — connected through power, disconnected from vulnerability.',
        SX: 'SX8 shifts toward anxious in intimate domain — intensity of connection creates uncharacteristic dependency.',
      },
      wingShift: {
        '8w7':
          'w7 reinforces avoidant — freedom and expansion prevent vulnerability.',
        '8w9':
          'w9 adds dismissive overlay — withdrawal behind calm exterior. Most contained avoidant.',
      },
      lexiconShift: {
        2: 'Type 2 vocabulary signals protective care — introduces secure elements. The protective 8.',
        5: 'Type 5 vocabulary signals intellectual withdrawal — reinforces avoidant through detachment.',
        4: 'Type 4 vocabulary signals emotional vulnerability — challenges avoidant armor. May shift toward fearful-avoidant.',
        9: 'Type 9 vocabulary signals accommodation — introduces dismissive avoidant numbing.',
      },
    },

    disc: {
      primary: ['D'],
      secondary: ['I'],
      mechanismNote:
        'Dominance is the defining trait — direct, decisive, results-oriented, confrontational. The purest D profile in the Enneagram. I rises with 8w7 and SX8. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure D — the most extreme D profile. Direct, forceful, survival-focused.',
        SO: 'DI blend — dominance through institutional leadership. Most strategic.',
        SX: 'DI blend — dominance through personal intensity and charismatic challenge.',
      },
      wingShift: {
        '8w7': 'DI blend — dominance with influence. Expansive, charismatic force.',
        '8w9': 'DS blend — dominance with steadiness. Calm, contained, immovable force.',
      },
    },

    jungian: {
      active: ['The Ruler', 'The Warrior', 'The Outlaw'],
      shadow: 'The Innocent',
      mechanismNote:
        'Ruler in the commanding presence and territorial control. Warrior in the direct confrontation and protection. Outlaw in the rejection of external authority. Shadow Innocent is what the 8 most suppresses — the trusting, vulnerable child who cannot protect themselves. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Warrior dominant — survival, protection, material security through force.',
        SO: 'Ruler dominant — institutional power, social leadership, strategic control.',
        SX: 'Outlaw dominant — provocative intensity, boundary-breaking, passionate rebellion.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler more strongly — principled power, righteous force.',
        8: 'Core body type — no shift.',
        9: 'Body 9 activates The Innocent as secondary — power held in reserve, calm exterior.',
        2: 'Heart 2 activates The Caregiver — fierce protector, power in service of loved ones.',
        3: 'Heart 3 activates The Hero — power through achievement and accomplishment.',
        4: 'Heart 4 activates The Lover — emotional depth enters the power framework. Most complex 8.',
        5: 'Head 5 activates The Sage — strategic, intellectual power. Most cerebral 8.',
        6: 'Head 6 activates The Warrior more strongly — loyalty and protective duty drive the power.',
        7: 'Head 7 activates The Jester — lightest 8, power through expansive enthusiasm.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Manifestor', 'Manifesting Generator'],
      likelyCenters: ['Heart/Will defined', 'Throat defined', 'Root defined'],
      communityNote:
        'Community observations correlate 8s with Manifestor energy (initiating, impacting, informing) and defined Heart/Will Center (willpower and material force). Root defined adds sustained pressure to act.',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Manifestor',
        SO: 'Community suggests: Manifestor or Manifesting Generator',
        SX: 'Community suggests: Manifesting Generator',
      },
    },
  },

  // ═══════════════════════════════════════════════════
  // TYPE 9 — The Peacemaker
  // ═══════════════════════════════════════════════════
  9: {
    mbti: {
      plausible: ['ISFP', 'INFP', 'ISTP', 'ISFJ', 'INFJ', 'ESFP'],
      implausible: ['ENTJ', 'ESTJ', 'ENTP', 'INTJ'],
      cognitiveNote:
        'Fi/Si dominant — internal feeling, personal values, harmony through accommodation. P preference common. Introversion typical but SO9 can appear extraverted. (Berens & Nardi 2004)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Shifts ISTP or ISFP — most withdrawn 9. Comfort through routine and physical habit.',
        SO: 'Shifts ESFP or ESFJ — most extraverted 9. Merging through group belonging.',
        SX: 'Shifts INFP or ISFP — merging through idealized one-on-one fusion. Most emotionally present 9.',
      },
      wingShift: {
        '9w8':
          'Pulls ISTP or ESTP — more assertive, stubborn, embodied. The "bear" when provoked.',
        '9w1':
          'Pulls ISFJ or INFJ — more principled, dutiful, inner standards. The "idealist" 9.',
      },
      tritypeShift: {
        heartTypes: {
          2: 'Heart 2 adds warmth — shifts toward ISFJ or ESFJ. Most relational 9.',
          3: 'Heart 3 adds performance — shifts toward ESFP or ESFJ. Most externally active 9.',
          4: 'Heart 4 adds depth — shifts toward INFP. Most introspective, emotionally aware 9.',
        },
        headTypes: {
          5: 'Head 5 adds analytical withdrawal — shifts toward ISTP or INTP. Most introverted 9.',
          6: 'Head 6 adds loyalty and duty — shifts toward ISFJ. Most cautious, dutiful 9.',
          7: 'Head 7 adds enthusiasm — shifts toward ESFP or ENFP. Most extraverted, energetic 9.',
        },
      },
    },

    bigFive: {
      openness: {
        min: 4,
        max: 7,
        note: 'Moderate. Open to experience through merging but not aggressively seeking novelty.',
      },
      conscientiousness: {
        min: 2,
        max: 6,
        note: 'Low to moderate. Inertia, procrastination, difficulty prioritizing own agenda. 9w1 raises significantly.',
      },
      extraversion: {
        min: 3,
        max: 7,
        note: 'Wide range — SP9 at 3-4, SO9 at 6-7. Subtype is the primary driver.',
      },
      agreeableness: {
        min: 7,
        max: 10,
        note: 'Second highest after Type 2. The defining Big Five trait for Type 9. Accommodating, harmonious, non-confrontational. (Furnham 2013, Gurven 2013)',
      },
      neuroticism: {
        min: 2,
        max: 5,
        note: 'Low — anxiety managed through numbing and merging. Hidden anger may be higher than expressed. (Gurven 2013)',
      },
      citations: [
        'Furnham A. (2013). Personality, intelligence, and work. Psych Press.',
        'Gurven M. et al. (2013). Human Nature.',
        'Riso D. & Hudson R. (1999). The Wisdom of the Enneagram.',
      ],
      confidence: 'high',
      subtypeShift: {
        SP: [
          {
            trait: 'extraversion',
            direction: 'down',
            magnitude: 'significant',
            note: 'SP minimizes — comfort through solitary routine',
          },
          {
            trait: 'conscientiousness',
            direction: 'down',
            magnitude: 'moderate',
            note: 'SP lowers — inertia maximizes in private space',
          },
        ],
        SO: [
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SO raises — merging through group belonging',
          },
          {
            trait: 'agreeableness',
            direction: 'up',
            magnitude: 'slight',
            note: 'SO raises — harmony in social context',
          },
        ],
        SX: [
          {
            trait: 'openness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — merging through idealized fusion opens new experiences',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'moderate',
            note: 'SX raises — emotional fusion creates vulnerability',
          },
        ],
      },
      wingShift: {
        '9w8': [
          {
            trait: 'agreeableness',
            direction: 'down',
            magnitude: 'moderate',
            note: 'w8 adds assertion and stubbornness',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            magnitude: 'slight',
            note: 'w8 adds embodied presence',
          },
        ],
        '9w1': [
          {
            trait: 'conscientiousness',
            direction: 'up',
            magnitude: 'moderate',
            note: 'w1 adds principled discipline',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            magnitude: 'slight',
            note: 'w1 adds inner critic tension',
          },
        ],
      },
      lexiconShift: {
        1: [
          {
            trait: 'conscientiousness',
            direction: 'up',
            note: 'Type 1 vocabulary signals standards — Conscientiousness rises above typical 9 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 1 vocabulary signals inner critic — Neuroticism rises above typical 9 range',
          },
        ],
        4: [
          {
            trait: 'openness',
            direction: 'up',
            note: 'Type 4 vocabulary signals emotional depth — Openness rises above typical 9 range',
          },
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 4 vocabulary signals intensity — Neuroticism rises',
          },
        ],
        6: [
          {
            trait: 'neuroticism',
            direction: 'up',
            note: 'Type 6 vocabulary signals anxiety — Neuroticism rises above typical 9 range',
          },
        ],
        8: [
          {
            trait: 'agreeableness',
            direction: 'down',
            note: 'Type 8 vocabulary signals assertion — Agreeableness drops below typical 9 range',
          },
          {
            trait: 'extraversion',
            direction: 'up',
            note: 'Type 8 vocabulary signals force — Extraversion rises',
          },
        ],
      },
    },

    attachment: {
      primary: 'secure',
      secondary: 'avoidant',
      mechanismNote:
        'Most secure-presenting type — but security through merging rather than differentiated self. Conflict avoidance maintains the illusion of harmony. "Go along to get along." (Levine & Heller 2010)',
      healthNote:
        'At high health: genuine security, differentiated presence, engaged peace. At stress: dismissive avoidant numbness, passive-aggressive withdrawal, loss of self in merger.',
      citations: [
        'Levine A. & Heller R. (2010). Attached.',
        'Riso D. & Hudson R. (1999). The Wisdom of the Enneagram.',
      ],
      confidence: 'medium',
      subtypeShift: {
        SP: 'SP9 most avoidant — withdrawal into physical comfort. Least relationally engaged.',
        SO: 'SO9 most secure-presenting — belongs through accommodation. Harmony through group merger.',
        SX: 'SX9 shifts toward anxious — idealized fusion creates dependency on partner.',
      },
      wingShift: {
        '9w8':
          'w8 adds dismissive avoidant elements — stubbornness as emotional boundary.',
        '9w1':
          'w1 adds anxious-avoidant elements — inner critic creates self-doubt about worthiness.',
      },
      lexiconShift: {
        6: 'Type 6 vocabulary signals anxiety — challenges secure presentation. Hidden anxiety surfaces.',
        4: 'Type 4 vocabulary signals emotional depth — challenges numbing. May shift toward fearful-avoidant.',
        8: 'Type 8 vocabulary signals assertion — challenges accommodating pattern. May shift toward dismissive avoidant.',
        3: 'Type 3 vocabulary signals performance — challenges merger through achievement differentiation.',
      },
    },

    disc: {
      primary: ['S'],
      secondary: ['I'],
      mechanismNote:
        'Steadiness dominant — accommodating, patient, supportive, conflict-avoidant. The purest S profile in the Enneagram. I rises with SO9 and 9w8 adds some D. (Riso & Hudson 1999)',
      confidence: 'high',
      subtypeShift: {
        SP: 'Pure S — the most extreme S profile of all 81 types. Steady, routine, unchanging.',
        SO: 'SI blend — steadiness with influence through group belonging.',
        SX: 'SI blend — steadiness with influence through personal merging.',
      },
      wingShift: {
        '9w8': 'SD blend — steadiness with hidden dominance. The "bear" when finally provoked.',
        '9w1': 'SC blend — steadiness with conscientiousness. Dutiful, principled peace.',
      },
    },

    jungian: {
      active: ['The Innocent', 'The Caregiver', 'The Everyman'],
      shadow: 'The Warrior',
      mechanismNote:
        'Innocent as the primary — trust, optimism, desire for paradise and harmony. Caregiver in the accommodating selflessness. Everyman in the desire to belong without standing out. Shadow Warrior is what the 9 most suppresses — the part that fights, asserts, draws boundaries. (Pearson 1991)',
      confidence: 'medium',
      subtypeShift: {
        SP: 'Innocent dominant — peace through comfortable routine and withdrawal.',
        SO: 'Everyman dominant — belonging through accommodation and group merger.',
        SX: 'Caregiver dominant — peace through merging with and caring for the beloved.',
      },
      tritypeShift: {
        1: 'Body 1 activates The Ruler — principled peace, most dutiful 9.',
        8: 'Body 8 activates The Warrior as secondary — the most assertive 9. Bear energy.',
        9: 'Core body type — no shift.',
        2: 'Heart 2 activates The Caregiver strongly — peace through selfless nurturing.',
        3: 'Heart 3 activates The Hero — most externally active 9, peace through accomplishment.',
        4: 'Heart 4 activates The Creator — most introspective 9, peace through creative expression.',
        5: 'Head 5 activates The Sage — most withdrawn, analytical 9.',
        6: 'Head 6 activates The Orphan — loyalty and caution enter the peace framework.',
        7: 'Head 7 activates The Jester — lightest 9, peace through playful engagement.',
      },
    },

    humanDesign: {
      likelyEnergyTypes: ['Generator', 'Reflector'],
      likelyCenters: ['Sacral defined', 'G Center undefined', 'Root undefined'],
      communityNote:
        'Community observations correlate 9s with Generator energy (responsive, sustainable) and undefined G Center (chameleon-like identity merging). Reflector energy matches the 9\'s sensitivity to environment.',
      confidence: 'low',
      disclaimer:
        'Human Design has no peer-reviewed research base. Treat as speculative only.',
      subtypeNote: {
        SP: 'Community suggests: Generator',
        SO: 'Community suggests: Generator or Reflector',
        SX: 'Community suggests: Manifesting Generator',
      },
    },
  },
}

// ─── HELPERS ──────────────────────────────────────

export function getBoundaries(coreType: number): TypeBoundaries | null {
  return TYPE_BOUNDARIES[coreType as keyof typeof TYPE_BOUNDARIES] || null
}

export function getImplausibleMBTI(coreType: number): string[] {
  return TYPE_BOUNDARIES[coreType as keyof typeof TYPE_BOUNDARIES]?.mbti.implausible || []
}

export function buildCorrelationContext(
  coreType: number,
  instinctualVariant: InstinctualVariant,
  wing: string,
  tritypeBody: number,
  tritypeHeart: number,
  tritypeHead: number,
  lexiconContext: Array<{ type: number; words: string[]; questionContext: string; stage: number }>
): string {
  const b = TYPE_BOUNDARIES[coreType as keyof typeof TYPE_BOUNDARIES]
  if (!b) return ''

  const wingKey = wing.includes('w') ? wing : ''
  const mbtiSubNote = b.mbti.subtypeShift[instinctualVariant] || ''
  const mbtiWingNote = wingKey ? (b.mbti.wingShift[wingKey] || '') : ''
  const heartShift = b.mbti.tritypeShift.heartTypes[tritypeHeart] || ''
  const headShift = b.mbti.tritypeShift.headTypes[tritypeHead] || ''

  const lexiconNotes: string[] = []
  const detectedTypes = [...new Set(lexiconContext.map(lc => lc.type))].filter(t => t !== coreType)
  detectedTypes.forEach(typeNum => {
    const bigFiveShifts = b.bigFive.lexiconShift[typeNum]
    const attachShift = b.attachment.lexiconShift[typeNum]
    if (bigFiveShifts) {
      bigFiveShifts.forEach(shift => {
        lexiconNotes.push(`Type ${typeNum} vocabulary → ${shift.trait} ${shift.direction}: ${shift.note}`)
      })
    }
    if (attachShift) {
      lexiconNotes.push(`Type ${typeNum} vocabulary → attachment: ${attachShift}`)
    }
  })

  const richLexiconDesc = lexiconContext.length > 0
    ? lexiconContext.map(lc =>
        `Type ${lc.type} vocabulary detected (Stage ${lc.stage}, context: "${lc.questionContext}"): ${lc.words.length > 0 ? lc.words.join(', ') : 'type-consistent patterns'}`
      ).join('\n')
    : 'No secondary lexicon signals detected'

  const jungianTritypeShifts = [tritypeHeart, tritypeHead]
    .filter(t => t !== coreType && t !== 0)
    .map(t => b.jungian.tritypeShift[t] || '')
    .filter(Boolean)
    .join(' | ')

  return `
RESEARCH BOUNDARY DATA
(Use as knowledge guardrail — reason FROM this, do not copy FROM this.)

TYPE ${coreType} | ${instinctualVariant} | ${wing}
TRITYPE: ${[tritypeBody, tritypeHeart, tritypeHead].join('-')}

MBTI BOUNDARIES:
Plausible: ${b.mbti.plausible.join(', ')}
Implausible: ${b.mbti.implausible.join(', ')}
Cognitive foundation: ${b.mbti.cognitiveNote}
${instinctualVariant} subtype: ${mbtiSubNote}
${wing} wing: ${mbtiWingNote}
Heart center (${tritypeHeart}): ${heartShift}
Head center (${tritypeHead}): ${headShift}
Confidence: ${b.mbti.confidence}

BIG FIVE RANGES (1-10):
O: ${b.bigFive.openness.min}–${b.bigFive.openness.max} ${b.bigFive.openness.note}
C: ${b.bigFive.conscientiousness.min}–${b.bigFive.conscientiousness.max} ${b.bigFive.conscientiousness.note}
E: ${b.bigFive.extraversion.min}–${b.bigFive.extraversion.max} ${b.bigFive.extraversion.note}
A: ${b.bigFive.agreeableness.min}–${b.bigFive.agreeableness.max} ${b.bigFive.agreeableness.note}
N: ${b.bigFive.neuroticism.min}–${b.bigFive.neuroticism.max} ${b.bigFive.neuroticism.note}
${instinctualVariant} adjustments: ${b.bigFive.subtypeShift[instinctualVariant]?.map(s => `${s.trait} ${s.direction} (${s.magnitude}): ${s.note}`).join('; ') || 'none'}
${wing} adjustments: ${(b.bigFive.wingShift[wingKey] || []).map(s => `${s.trait} ${s.direction} (${s.magnitude}): ${s.note}`).join('; ') || 'none'}
Citations: ${b.bigFive.citations.join(' | ')}

ATTACHMENT: ${b.attachment.primary}${b.attachment.secondary ? ' / ' + b.attachment.secondary : ''}
${b.attachment.mechanismNote}
${instinctualVariant}: ${b.attachment.subtypeShift[instinctualVariant]}
${wing}: ${b.attachment.wingShift[wingKey] || 'no shift data'}

DISC: ${b.disc.primary.join('')} (${b.disc.mechanismNote})
${instinctualVariant}: ${b.disc.subtypeShift[instinctualVariant]}

JUNGIAN: ${b.jungian.active.join(', ')} | Shadow: ${b.jungian.shadow}
${b.jungian.mechanismNote}
Tritype shifts: ${jungianTritypeShifts || 'none'}

HUMAN DESIGN (exploratory only):
${b.humanDesign.likelyEnergyTypes.join(', ')}
DISCLAIMER: ${b.humanDesign.disclaimer}

LEXICON SIGNALS:
${richLexiconDesc}

LEXICON SHIFT EFFECTS:
${lexiconNotes.length > 0 ? lexiconNotes.join('\n') : 'No secondary signals to apply'}
`
}
