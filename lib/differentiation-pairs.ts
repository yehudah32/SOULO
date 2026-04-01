// Differentiation pairs for commonly confused Enneagram types
// Each pair includes targeted questions designed to distinguish between the two types

export interface DifferentiationQuestion {
  text: string;
  format: string;
  answerOptions: string[] | null;
  ragQuery: string;
}

export interface DifferentiationPair {
  key: string;
  types: [number, number];
  name: string;
  coreDifference: string;
  questions: DifferentiationQuestion[];
}

export const DIFFERENTIATION_PAIRS: DifferentiationPair[] = [
  {
    key: '1v6',
    types: [1, 6],
    name: 'Type 1 vs Type 6',
    coreDifference: 'Ones critique from an internal standard of rightness they carry inside. Sixes critique from scanning for what external authority or consequence demands. The One says "this is wrong." The Six says "this could go wrong."',
    questions: [
      {
        text: 'When you feel something is wrong, is the loudest voice your own inner standard — or a sense that others will judge the outcome?',
        format: 'forced_choice',
        answerOptions: ['My own inner standard — I know what\'s right', 'A sense of what others expect or what could go wrong'],
        ragQuery: 'Type 1 vs Type 6 inner critic authority differentiation enneagram',
      },
      {
        text: 'Think about a recent time you corrected someone. Were you driven by principle — "this is objectively right" — or by concern — "this could cause problems if left unchecked"?',
        format: 'forced_choice',
        answerOptions: ['By principle — it was the right thing to do', 'By concern about what would happen if I didn\'t'],
        ragQuery: 'Type 1 perfectionism vs Type 6 anxiety scanning consequences',
      },
      {
        text: 'When you lie awake at night, is it more often replaying what you did wrong today — or imagining what could go wrong tomorrow?',
        format: 'forced_choice',
        answerOptions: ['Replaying what I did wrong — I should have done better', 'Imagining what could go wrong — I need to be prepared'],
        ragQuery: 'Type 1 self-criticism vs Type 6 anticipatory anxiety Defiant Spirit',
      },
    ],
  },
  {
    key: '8v6',
    types: [8, 6],
    name: 'Type 8 vs Counterphobic Type 6',
    coreDifference: 'Eights move toward confrontation to establish dominance and protect their territory — they want impact. Counterphobic Sixes move toward confrontation to neutralize a perceived threat before it can hurt them — they want safety. The Eight advances. The Six preemptively defends.',
    questions: [
      {
        text: 'When you push back on someone, what is the feeling underneath — a drive to claim your space, or a drive to make sure they can\'t hurt you?',
        format: 'forced_choice',
        answerOptions: ['Claiming my space — I won\'t be pushed around', 'Making sure they can\'t hurt me — I strike first'],
        ragQuery: 'Type 8 vs counterphobic Type 6 confrontation power fear differentiation',
      },
      {
        text: 'After a conflict where you came out on top, do you feel energized and satisfied — or relieved that the threat is handled?',
        format: 'forced_choice',
        answerOptions: ['Energized — I thrive in intensity', 'Relieved — the danger has passed'],
        ragQuery: 'Type 8 lust intensity vs Type 6 fear courage counterphobic enneagram',
      },
      {
        text: 'When you walk into an unfamiliar room full of people, what is your first instinct — to assess who has power, or to assess who might be a threat?',
        format: 'forced_choice',
        answerOptions: ['Who has power — and whether I respect it', 'Who might be a threat — and how to handle them'],
        ragQuery: 'Type 8 authority power vs Type 6 threat scanning vigilance',
      },
    ],
  },
  {
    key: '4v9',
    types: [4, 9],
    name: 'Type 4 vs Type 9',
    coreDifference: 'Fours withdraw toward intensity — they pull inward to feel more deeply, seeking what is authentic and uniquely theirs even if it hurts. Nines withdraw toward numbing — they disengage to avoid disturbance, merging with comfort and routine to keep the peace.',
    questions: [
      {
        text: 'When you pull away from the world, what happens inside — do your emotions get louder and more vivid, or do they get quieter and more muted?',
        format: 'forced_choice',
        answerOptions: ['Louder — I feel everything more intensely', 'Quieter — things settle into a kind of haze'],
        ragQuery: 'Type 4 withdrawal intensity vs Type 9 withdrawal numbing merging',
      },
      {
        text: 'What bothers you more — the fear that you\'re fundamentally different from everyone else, or the fear that you don\'t really matter to anyone?',
        format: 'forced_choice',
        answerOptions: ['That I\'m fundamentally different — nobody truly gets me', 'That I don\'t really matter — I could disappear and nobody would notice'],
        ragQuery: 'Type 4 identity uniqueness vs Type 9 self-forgetting merging enneagram',
      },
      {
        text: 'When someone asks "what do you want?" — is the hard part knowing but fearing it\'s too much, or genuinely not being sure what you want?',
        format: 'forced_choice',
        answerOptions: ['I know what I want — I just fear it\'s too much to ask', 'I genuinely struggle to know what I want'],
        ragQuery: 'Type 4 longing desire vs Type 9 sloth self-forgetting wants needs',
      },
    ],
  },
  {
    key: '2v3',
    types: [2, 3],
    name: 'Type 2 vs Type 3',
    coreDifference: 'Twos orient toward being needed — they give to create indispensability, and their self-worth comes from being essential to others. Threes orient toward being admired — they perform to create a successful image, and their self-worth comes from achievement and recognition.',
    questions: [
      {
        text: 'What feels more devastating — someone saying "I don\'t need your help" or someone saying "that wasn\'t impressive"?',
        format: 'forced_choice',
        answerOptions: ['"I don\'t need your help" — that cuts deepest', '"That wasn\'t impressive" — that cuts deepest'],
        ragQuery: 'Type 2 need to be needed vs Type 3 need for admiration image enneagram',
      },
      {
        text: 'When you do something generous for someone, which quiet thought is louder — "now they need me" or "now they see how capable I am"?',
        format: 'forced_choice',
        answerOptions: ['"Now they need me" — connection through dependence', '"Now they see how capable I am" — connection through respect'],
        ragQuery: 'Type 2 pride giving vs Type 3 deceit vanity performance',
      },
      {
        text: 'In a group, are you more likely to notice who needs support, or who the audience is watching?',
        format: 'forced_choice',
        answerOptions: ['Who needs support — I\'m drawn to people who are struggling', 'Who the audience is watching — I\'m aware of the spotlight'],
        ragQuery: 'Type 2 helper empathy vs Type 3 performer image audience Defiant Spirit',
      },
    ],
  },
  {
    key: '5v9',
    types: [5, 9],
    name: 'Type 5 vs Type 9',
    coreDifference: 'Fives actively withdraw to conserve and hoard mental energy — they build walls deliberately, retreating into the mind to understand the world from a safe distance. Nines passively disengage — they go on autopilot, merging with routine and environment to avoid the discomfort of asserting themselves.',
    questions: [
      {
        text: 'When you zone out, is it because you\'ve gone deep into a thought or problem — or because you\'ve drifted into a comfortable fog where nothing demands your attention?',
        format: 'forced_choice',
        answerOptions: ['Deep into a thought — my mind is very active', 'A comfortable fog — my mind goes quiet'],
        ragQuery: 'Type 5 mental withdrawal avarice vs Type 9 sloth disengagement merging',
      },
      {
        text: 'Do people more often tell you that you\'re too detached and in your head, or that you\'re too agreeable and don\'t speak up?',
        format: 'forced_choice',
        answerOptions: ['Too detached and in my head', 'Too agreeable and don\'t speak up'],
        ragQuery: 'Type 5 detachment observation vs Type 9 accommodation conflict avoidance',
      },
      {
        text: 'What drains you faster — being around people who want emotional connection, or being around people who want you to take a strong position?',
        format: 'forced_choice',
        answerOptions: ['Emotional connection — I find that exhausting', 'Taking a strong position — I find that exhausting'],
        ragQuery: 'Type 5 emotional boundary vs Type 9 assertion avoidance energy',
      },
    ],
  },
  {
    key: '3v7',
    types: [3, 7],
    name: 'Type 3 vs Type 7',
    coreDifference: 'Threes avoid failure through achievement and curated image — they work harder, adapt their presentation, and measure worth by results. Sevens avoid pain through stimulation and reframing — they move faster, generate options, and outrun discomfort with enthusiasm.',
    questions: [
      {
        text: 'When something goes wrong, is your first instinct to fix it and restore your track record, or to pivot to something better and leave it behind?',
        format: 'forced_choice',
        answerOptions: ['Fix it — my track record matters', 'Pivot — there\'s always something better ahead'],
        ragQuery: 'Type 3 achievement failure avoidance vs Type 7 pain avoidance reframing',
      },
      {
        text: 'Are you more afraid of being seen as a failure, or being trapped in something boring and painful?',
        format: 'forced_choice',
        answerOptions: ['Being seen as a failure', 'Being trapped in something boring or painful'],
        ragQuery: 'Type 3 image deceit vs Type 7 gluttony stimulation freedom',
      },
    ],
  },
  {
    key: '2v9',
    types: [2, 9],
    name: 'Type 2 vs Type 9',
    coreDifference: 'Twos give to feel needed — their accommodation is strategic, creating bonds of dependency. Nines accommodate to avoid conflict — their giving is passive, merging with others\' agendas to maintain peace. The Two moves toward; the Nine dissolves into.',
    questions: [
      {
        text: 'When you go along with what someone else wants, is it because you\'re investing in the relationship, or because it\'s easier than the friction of disagreeing?',
        format: 'forced_choice',
        answerOptions: ['Investing in the relationship — they\'ll appreciate it', 'Easier than friction — disagreeing feels like too much'],
        ragQuery: 'Type 2 giving pride vs Type 9 accommodating sloth peace avoidance',
      },
      {
        text: 'Do people come to you because you actively offer help, or because you\'re the calm, easy person who never pushes back?',
        format: 'forced_choice',
        answerOptions: ['I actively offer — I see what people need before they ask', 'I\'m easy to be around — I don\'t create waves'],
        ragQuery: 'Type 2 helper anticipating needs vs Type 9 peacemaker merging compliance',
      },
    ],
  },
  {
    key: '1v4',
    types: [1, 4],
    name: 'Type 1 vs Type 4',
    coreDifference: 'Ones suppress emotion to maintain composure and correctness — they channel frustration into improvement. Fours amplify emotion to access authenticity — they lean into intensity as proof of depth. The One says "I shouldn\'t feel this way." The Four says "I must feel this fully."',
    questions: [
      {
        text: 'When a strong emotion hits you, is your first move to contain it and channel it productively, or to sit with it and let it reveal something about you?',
        format: 'forced_choice',
        answerOptions: ['Contain it — emotions shouldn\'t run the show', 'Sit with it — emotions are how I know what\'s real'],
        ragQuery: 'Type 1 anger suppression vs Type 4 emotional amplification authenticity',
      },
      {
        text: 'What feels more like home — a sense of "I know what\'s right and I\'ll make it so," or a sense of "I know what\'s missing and I feel it deeply"?',
        format: 'forced_choice',
        answerOptions: ['Knowing what\'s right — and working to make it so', 'Knowing what\'s missing — and feeling it deeply'],
        ragQuery: 'Type 1 reformer integrity vs Type 4 individualist longing depth enneagram',
      },
    ],
  },
];

/**
 * Find the differentiation pair definition for two competing types.
 * Returns null if no known pair exists for these types.
 */
export function findPairForTypes(typeA: number, typeB: number): DifferentiationPair | null {
  return DIFFERENTIATION_PAIRS.find(
    p => (p.types[0] === typeA && p.types[1] === typeB) ||
         (p.types[0] === typeB && p.types[1] === typeA)
  ) ?? null;
}

/**
 * Extract the top two types and their score gap from a type_scores object.
 */
export function getTopTwoTypes(typeScores: Record<string, number>): {
  first: number;
  second: number;
  gap: number;
} {
  const sorted = Object.entries(typeScores)
    .map(([k, v]) => ({ type: Number(k), score: v }))
    .filter(e => e.type >= 1 && e.type <= 9)
    .sort((a, b) => b.score - a.score);

  if (sorted.length < 2) {
    return { first: sorted[0]?.type ?? 0, second: 0, gap: 100 };
  }

  return {
    first: sorted[0].type,
    second: sorted[1].type,
    gap: sorted[0].score - sorted[1].score,
  };
}
