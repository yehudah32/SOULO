// Fallback questions used when the DB question bank returns empty results.
// IDs are negative (-1 to -7) so updateQuestionYield can skip DB calls for them.

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
  },
];
