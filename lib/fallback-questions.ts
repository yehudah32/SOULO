// Fallback questions used when the DB question bank returns empty results.
// IDs are negative (-1 to -7) so updateQuestionYield can skip DB calls for them.

/** Phase 9 — center this question primarily probes. */
export type TargetCenter = 'Body' | 'Heart' | 'Head' | 'Cross';

export interface Question {
  id: number;
  question_text: string;
  answer_options: string[];
  format: string;
  stage: number;
  oyn_dim: string;
  react_respond_lens: string;
  target_types: number[];
  times_used: number;
  avg_information_yield: number;
  is_baruch_sourced?: boolean;
  tier?: number; // 1=Core/Whole, 2=Instinct/Subtype, 3=Wings/Lines
  // Layer 4 of vector v2 scoring: maps each answer_options index to a
  // {type → weight} map. When the user picks option N, we add those weights
  // directly to the running per-center scores. This is the highest-reliability
  // signal in vector v2 because it's a structured input — no embedding noise.
  // Optional because open-text and scenario questions don't have it.
  type_weights?: Record<number, Record<number, number>>;
  // Phase 9 — which center this question primarily probes. Used by the
  // selection rerank in lib/decision-tree.ts to balance per-center coverage.
  // Optional because (a) the DB column may not be migrated yet and (b)
  // questions returned without this field are treated as 'Cross' (no
  // steering effect either way).
  target_center?: TargetCenter;
}

export const FALLBACK_QUESTIONS: Question[] = [
  {
    id: -1,
    question_text:
      'When something goes wrong in your life, which is more automatic for you — looking inward to see what you could have done differently, or looking outward at the circumstances or other people involved?',
    answer_options: ['Looking inward first', 'Looking outward first'],
    format: 'forced_choice',
    stage: 1,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: [],
    times_used: 0,
    avg_information_yield: 0.8,
    // "Looking inward" is the superego/inner-critic move — strongest for 1, 4, 6.
    // "Looking outward" is the externalizing move — strongest for 8, 7, 3.
    type_weights: {
      0: { 1: 0.4, 4: 0.25, 6: 0.25, 5: 0.1 },
      1: { 8: 0.4, 7: 0.25, 3: 0.25, 9: 0.1 },
    },
    // Cross — picks up signal from all three centers (1=Body, 4=Heart, 6=Head).
    target_center: 'Cross',
  },
  {
    id: -2,
    question_text:
      'I find it easy to put my own needs on hold when someone I care about needs something. Agree, disagree, or somewhere in the middle?',
    answer_options: ['Agree', 'Somewhere in the middle', 'Disagree'],
    format: 'agree_disagree',
    stage: 2,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: [2, 9],
    times_used: 0,
    avg_information_yield: 0.75,
    // Self-effacement under another's needs is core 2 and 9. Disagreeing
    // strongly is 8-coded (no one rolls over me). Middle = mild signal.
    type_weights: {
      0: { 2: 0.4, 9: 0.3, 6: 0.1 },
      1: { 1: 0.05, 4: 0.05 },
      2: { 8: 0.4, 5: 0.2, 3: 0.1 },
    },
    // Heart — "putting needs on hold for someone you care about" probes 2/9
    // primarily, with weak signal into Body (8 disagrees) and Head (6).
    target_center: 'Heart',
  },
  {
    id: -3,
    question_text:
      'On a scale of 1 to 5 — 1 being rarely, 5 being almost always — how often do you find yourself mentally preparing for things that might go wrong before they happen?',
    answer_options: ['1 — Rarely', '2', '3 — Sometimes', '4', '5 — Almost always'],
    format: 'scale',
    stage: 3,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: [6, 5, 1],
    times_used: 0,
    avg_information_yield: 0.75,
    // Anticipating-what-could-go-wrong is core 6, with 1 (preventing the
    // mistake) and 5 (knowing all variables) close behind. High end = strong
    // 6 evidence. Low end = 7 (don't dwell), 9 (don't worry).
    type_weights: {
      0: { 7: 0.3, 9: 0.2 },
      1: { 7: 0.15, 9: 0.1 },
      2: { 6: 0.1 },
      3: { 6: 0.3, 1: 0.15, 5: 0.15 },
      4: { 6: 0.5, 1: 0.2, 5: 0.2 },
    },
    // Head — "mentally preparing for what could go wrong" is core 6 with
    // 5 (knowing variables) close behind.
    target_center: 'Head',
  },
  {
    id: -4,
    question_text:
      'When you are in a disagreement with someone close to you, how often do you bring it up directly — always, sometimes, rarely, or never?',
    answer_options: ['Always', 'Sometimes', 'Rarely', 'Never'],
    format: 'frequency',
    stage: 4,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: [8, 2, 9],
    times_used: 0,
    avg_information_yield: 0.8,
    // Always direct = 8 (and 1 with the "fairness" justification).
    // Never direct = 9 (avoid conflict), 2 (preserve the relationship), 5 (withdraw).
    // Sometimes/rarely = the middle ground; weakly distinguishing.
    type_weights: {
      0: { 8: 0.45, 1: 0.2, 3: 0.1 },
      1: { 1: 0.1, 3: 0.1, 6: 0.1 },
      2: { 9: 0.2, 4: 0.15, 5: 0.15 },
      3: { 9: 0.45, 2: 0.25, 5: 0.15 },
    },
    // Body — "bringing up disagreement directly" is core 8 (Body action),
    // with 9 (Body avoidance) and 1 (Body justification) at the other ends.
    target_center: 'Body',
  },
  {
    id: -5,
    question_text:
      'Tell me about the last time you felt genuinely proud of yourself — not because of what someone else said, but because of how you handled something.',
    answer_options: [],
    format: 'behavioral_anchor',
    stage: 5,
    oyn_dim: 'who',
    react_respond_lens: 'respond',
    target_types: [],
    times_used: 0,
    avg_information_yield: 0.85,
    // Heart — pride / self-image / "how you handled something" probes 2/3/4.
    target_center: 'Heart',
  },
  {
    id: -6,
    question_text:
      'Which of these feels most true for you: (A) I work hardest to avoid making mistakes, (B) I work hardest to avoid being left out or overlooked, or (C) I work hardest to avoid losing my sense of safety or control?',
    answer_options: [
      'A — Avoiding mistakes',
      'B — Avoiding being overlooked',
      'C — Avoiding loss of safety or control',
    ],
    format: 'paragraph_select',
    stage: 6,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: [1, 3, 4, 6, 7],
    times_used: 0,
    avg_information_yield: 0.85,
    // (A) Mistakes = 1's superego, with 3 and 6 secondary
    // (B) Overlooked = 3 (image), 4 (specialness), 7 (FOMO)
    // (C) Safety/control = 6 (safety), 8 (control), 5 (knowing enough)
    type_weights: {
      0: { 1: 0.5, 3: 0.15, 6: 0.15 },
      1: { 3: 0.35, 4: 0.3, 7: 0.2 },
      2: { 6: 0.35, 8: 0.3, 5: 0.2 },
    },
    // Cross — three options span all three centers (1=Body, 4=Heart, 6=Head).
    target_center: 'Cross',
  },
  {
    id: -7,
    question_text:
      'If you had to name the one thing that, when threatened, brings out the worst version of you — what would it be?',
    answer_options: [],
    format: 'open',
    stage: 7,
    oyn_dim: 'where',
    react_respond_lens: 'react',
    target_types: [],
    times_used: 0,
    avg_information_yield: 0.9,
    // Cross — final-stage open question that any type could answer in
    // their own center's language (1: standards, 4: identity, 8: control,
    // etc.). Tagged Cross so it doesn't bias the rerank.
    target_center: 'Cross',
  },
];
