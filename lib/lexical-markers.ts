// ─────────────────────────────────────────────────────────────────────────
// LEXICAL MARKERS — Layer 3 of vector v2 scoring
// ─────────────────────────────────────────────────────────────────────────
//
// Curated marker phrases per type. Run as a regex pass over the user's
// response and used as an orthogonal signal to the embedding scorer.
//
// These are NOT a complete linguistic profile of each type — they're high-
// signal phrases that, when present, are strong evidence for that type. The
// scorer adds these to the embedding signal rather than replacing it.
//
// Markers are written from the DYN architecture and IEQ9-style lexicons.
// Each phrase should be:
//   - High-precision (rarely used by other types)
//   - Frequently produced by this type when describing themselves
//   - Phrased the way real people talk, not jargon
//
// Use \b word boundaries when matching to avoid substring false positives.

export interface LexicalMatch {
  type: number;
  matched: string[];
  score: number; // 0-1, normalized within this scorer
}

// Type → list of marker patterns. Patterns are case-insensitive.
// Weight is implicit: each match contributes equally; the type with the most
// matches wins (with ties broken by absolute score).
export const TYPE_MARKERS: Record<number, string[]> = {
  // Type 1 — Reformer / Perfectionist / inner critic, "right way"
  1: [
    'should have',
    'should be',
    'right way',
    'wrong way',
    'supposed to',
    'could have done better',
    'bothers me when',
    'can\'t stand when',
    'principle',
    'principles',
    'standards',
    'critical of myself',
    'critical of others',
    'inner critic',
    'mistake',
    'mistakes',
    'imperfect',
    'flaws',
    'high standards',
    'doing it right',
    'the correct way',
    'how it\'s supposed to',
    'should know better',
    'unfair',
    'integrity',
    'discipline',
    'self-discipline',
    'frustrated when',
    'irritated by',
    'attention to detail',
  ],

  // Type 2 — Helper / supportive / others-focused
  2: [
    'help others',
    'help them',
    'be there for',
    'needed by',
    'they need me',
    'taking care of',
    'caring for',
    'putting others first',
    'their feelings',
    'how they feel',
    'support them',
    'give to others',
    'love language',
    'love them',
    'cherished',
    'appreciated',
    'unappreciated',
    'taken for granted',
    'do for them',
    'sacrifice for',
    'people-pleasing',
    'people pleaser',
  ],

  // Type 3 — Achiever / image / success / efficient
  3: [
    'accomplish',
    'achievement',
    'achievements',
    'goals',
    'goal-oriented',
    'productive',
    'efficient',
    'efficiency',
    'success',
    'successful',
    'image',
    'how i come across',
    'how i appear',
    'best version',
    'winning',
    'failure is',
    'fear of failing',
    'performance',
    'perform',
    'results',
    'optimize',
    'compete',
    'competitive',
    'impressive',
    'impress',
    'admired',
    'admirable',
  ],

  // Type 4 — Individualist / depth / what's missing / unique
  4: [
    'what\'s missing',
    'whats missing',
    'something missing',
    'depth',
    'deep feelings',
    'no one understands',
    'nobody understands',
    'misunderstood',
    'carry the gap',
    'carry it with me',
    'unique',
    'authentic',
    'authentically',
    'longing',
    'longing for',
    'envy',
    'envious',
    'melancholy',
    'beautiful',
    'beauty',
    'meaningful',
    'meaning',
    'ordinary',
    'special',
    'don\'t fit',
    'don\'t belong',
    'feel things deeply',
    'inner world',
    'true self',
    'who i really am',
  ],

  // Type 5 — Investigator / observer / step back / process
  5: [
    'step back',
    'observe',
    'analyze',
    'process it',
    'process my',
    'alone with my thoughts',
    'need space',
    'private',
    'privacy',
    'understand it',
    'figure it out',
    'know enough',
    'don\'t know enough',
    'research',
    'study',
    'expertise',
    'expert',
    'detached',
    'detach',
    'withdraw',
    'energy reserves',
    'drain',
    'drained',
    'minimal',
    'simple life',
    'observe from',
  ],

  // Type 6 — Loyalist / safety / what could go wrong / authority
  6: [
    'safe',
    'safety',
    'unsafe',
    'might go wrong',
    'what could go wrong',
    'worst case',
    'prepared',
    'preparation',
    'doubt',
    'doubts',
    'second guess',
    'second-guess',
    'authority',
    'trust them',
    'don\'t trust',
    'loyal',
    'loyalty',
    'commitment',
    'committed',
    'betrayed',
    'betrayal',
    'anxiety',
    'anxious',
    'worry',
    'worries',
    'vigilant',
    'on guard',
    'fall back on',
    'group',
    'tradition',
  ],

  // Type 7 — Enthusiast / options / next thing / fun
  7: [
    'options',
    'possibilities',
    'opportunities',
    'next',
    'next thing',
    'next adventure',
    'fun',
    'exciting',
    'excitement',
    'adventure',
    'plans',
    'plan something',
    'travel',
    'experience',
    'experiences',
    'optimistic',
    'silver lining',
    'reframe',
    'positive spin',
    'bored',
    'boredom',
    'trapped',
    'restless',
    'spontaneous',
    'variety',
  ],

  // Type 8 — Challenger / control / fight / power
  8: [
    'control',
    'in control',
    'lose control',
    'fight',
    'fight for',
    'protect',
    'protector',
    'protective',
    'strength',
    'strong',
    'power',
    'powerful',
    'powerless',
    'directly',
    'direct',
    'confrontation',
    'confront',
    'push back',
    'stand up',
    'stand my ground',
    'won\'t back down',
    'in charge',
    'take charge',
    'authority over',
    'weakness',
    'weak',
    'vulnerable',
    'fairness',
    'injustice',
  ],

  // Type 9 — Peacemaker / comfort / merge / avoid
  9: [
    'peace',
    'peaceful',
    'comfortable',
    'uncomfortable',
    'go along',
    'go with the flow',
    'avoid conflict',
    'don\'t want to',
    'don\'t mind',
    'whatever',
    'doesn\'t matter',
    'doesn\'t really matter',
    'merge',
    'blend in',
    'easy going',
    'easygoing',
    'lazy',
    'numb',
    'check out',
    'zone out',
    'distract myself',
    'put off',
    'procrastinate',
    'inertia',
    'forget myself',
    'lose myself in',
  ],
};

/**
 * Score a user response against the lexicon. Returns the per-type score
 * (number of matches normalized) and which marker phrases were hit.
 *
 * Normalization: each type's raw match count is divided by the sum of all
 * type match counts so the result sums to 1 across types. If no markers
 * matched at all, returns null (no signal).
 */
export function scoreLexicalMarkers(text: string): {
  scores: Record<number, number>;
  matches: Record<number, string[]>;
  totalHits: number;
} | null {
  if (!text || text.length < 3) return null;
  const lower = text.toLowerCase();

  const matches: Record<number, string[]> = {};
  const rawCounts: Record<number, number> = {};
  let totalHits = 0;

  for (let type = 1; type <= 9; type++) {
    const typeMatches: string[] = [];
    for (const marker of TYPE_MARKERS[type] ?? []) {
      // Use word-boundary regex when the marker doesn't contain punctuation,
      // otherwise just substring (for phrases with apostrophes etc.)
      const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = /^[a-z\s-]+$/.test(marker)
        ? new RegExp(`\\b${escaped}\\b`, 'i')
        : new RegExp(escaped, 'i');
      if (pattern.test(lower)) {
        typeMatches.push(marker);
      }
    }
    if (typeMatches.length > 0) {
      matches[type] = typeMatches;
      rawCounts[type] = typeMatches.length;
      totalHits += typeMatches.length;
    }
  }

  if (totalHits === 0) return null;

  // Normalize so scores sum to 1 across types that hit
  const scores: Record<number, number> = {};
  for (let type = 1; type <= 9; type++) {
    scores[type] = (rawCounts[type] ?? 0) / totalHits;
  }

  return { scores, matches, totalHits };
}
