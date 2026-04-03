/**
 * Seeds disconfirmatory questions into the question bank.
 * These target known confusion pairs from evaluation data.
 * Each question is designed so the two confused types would give DIFFERENT answers.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-disconfirmatory-questions.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DISCONFIRMATORY_QUESTIONS = [
  // ── 9v1: Both Body center, both duty-oriented ──────────────────────
  // Discriminator: 1s have internal standard of correctness; 9s adopt others' standards for peace
  {
    question_text: 'When you take on extra responsibility at work or at home, is it more because you genuinely believe there is a right way it should be done — or because it is easier than the friction of saying no?',
    answer_options: JSON.stringify(['Because there is a right way and someone needs to hold that standard', 'Because saying no feels harder than just doing it myself']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]),
    avg_information_yield: 0.9,
    is_baruch_sourced: false,
  },
  {
    question_text: 'When you notice you are irritated, what does it feel like underneath — a sense that something is wrong and needs correcting, or a sense that your peace has been disrupted and you want it back?',
    answer_options: JSON.stringify(['Something is wrong and needs to be corrected', 'My peace has been disrupted and I want it back']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]),
    avg_information_yield: 0.9,
    is_baruch_sourced: false,
  },
  {
    question_text: 'Think of the last time you went along with a decision you disagreed with. What stayed with you longer — frustration that the decision was wrong, or relief that the conflict was over?',
    answer_options: JSON.stringify(['Frustration that the decision was wrong', 'Relief that the conflict was over']),
    format: 'forced_choice',
    stage: 6,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },

  // ── 1v6: Both rule-following, both dutiful ─────────────────────────
  // Discriminator: 1s act from internal principles; 6s act from anxiety about consequences
  {
    question_text: 'When you follow a rule that most people ignore, is the driving force your own conviction that the rule is correct — or a concern about what might happen if you break it?',
    answer_options: JSON.stringify(['My own conviction — the rule exists for a good reason', 'Concern about consequences — better safe than sorry']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: JSON.stringify([1, 6]),
    avg_information_yield: 0.9,
    is_baruch_sourced: false,
  },

  // ── 5v7: Both Head center ──────────────────────────────────────────
  // Discriminator: 5s conserve energy and withdraw; 7s generate energy and expand
  {
    question_text: 'After a long social event, do you feel drained and need to recover alone — or energized and already thinking about what to do next?',
    answer_options: JSON.stringify(['Drained — I need time alone to recharge', 'Energized — already planning the next thing']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: JSON.stringify([5, 7]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },
  {
    question_text: 'When something painful happens, is your first instinct to retreat into your mind and analyze it from a distance — or to move toward something pleasurable to take the edge off?',
    answer_options: JSON.stringify(['Retreat and analyze from a distance', 'Move toward something pleasurable']),
    format: 'forced_choice',
    stage: 6,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: JSON.stringify([5, 7]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },

  // ── 2v4: Both Heart center, both emotionally intense ───────────────
  // Discriminator: 2s orient outward (what do you need?); 4s orient inward (what am I feeling?)
  {
    question_text: 'When someone you care about is struggling, does your attention go first to what they need from you — or to your own emotional reaction to their pain?',
    answer_options: JSON.stringify(['What they need from me — how can I help?', 'My own emotional reaction — I feel it deeply too']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: JSON.stringify([2, 4]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },

  // ── 3v7: Both high-energy, both optimistic ─────────────────────────
  // Discriminator: 3s are goal-focused (achievement); 7s are experience-focused (freedom)
  {
    question_text: 'When you are at your best, are you focused on achieving a specific goal and being recognized for it — or on having the freedom to explore whatever excites you most?',
    answer_options: JSON.stringify(['Achieving a goal and earning recognition', 'Having freedom to explore what excites me']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'what',
    react_respond_lens: 'respond',
    target_types: JSON.stringify([3, 7]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },

  // ── 6v1: Already covered above, add behavioral anchor ─────────────
  {
    question_text: 'Describe a recent time you double-checked something you had already done. What was driving the double-check — a standard you hold yourself to, or a worry about what might go wrong if you missed something?',
    answer_options: JSON.stringify([]),
    format: 'behavioral_anchor',
    stage: 6,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: JSON.stringify([1, 6]),
    avg_information_yield: 0.9,
    is_baruch_sourced: false,
  },

  // ── 8v6cp: Both confrontational ───────────────────────────────────
  // Discriminator: 8s confront from genuine power; CP6s confront to manage fear
  {
    question_text: 'After you win a confrontation, what is the feeling — energized satisfaction that you claimed your space, or relief that the threat has been handled?',
    answer_options: JSON.stringify(['Energized — I thrive in that intensity', 'Relieved — the danger has passed']),
    format: 'forced_choice',
    stage: 6,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: JSON.stringify([8, 6]),
    avg_information_yield: 0.9,
    is_baruch_sourced: false,
  },

  // ── 2v9: Both accommodating ────────────────────────────────────────
  // Discriminator: 2s give to be needed; 9s accommodate to keep peace
  {
    question_text: 'When you go along with what someone else wants, is it because you are investing in the relationship and they will appreciate it — or because disagreeing feels like too much friction?',
    answer_options: JSON.stringify(['Investing in the relationship — they will appreciate it', 'Disagreeing feels like too much friction']),
    format: 'forced_choice',
    stage: 5,
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: JSON.stringify([2, 9]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },

  // ── 4v5: Both withdrawn, both intense ──────────────────────────────
  // Discriminator: 4s withdraw into feelings; 5s withdraw into mind
  {
    question_text: 'When you pull away from the world, what happens inside — do your emotions get louder and more vivid, or does your mind get sharper and more analytical?',
    answer_options: JSON.stringify(['Emotions get louder — I feel everything more intensely', 'Mind gets sharper — I think more clearly alone']),
    format: 'forced_choice',
    stage: 6,
    oyn_dim: 'how',
    react_respond_lens: 'react',
    target_types: JSON.stringify([4, 5]),
    avg_information_yield: 0.85,
    is_baruch_sourced: false,
  },
];

async function main() {
  console.log('Seeding disconfirmatory questions...\n');

  let inserted = 0;
  let skipped = 0;

  for (const q of DISCONFIRMATORY_QUESTIONS) {
    // Check if a similar question already exists (by text similarity)
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .ilike('question_text', `%${q.question_text.substring(0, 50)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  Skipped (exists): "${q.question_text.substring(0, 60)}..."`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('questions')
      .insert(q);

    if (error) {
      console.error(`  Error inserting: ${error.message}`);
    } else {
      console.log(`  ✅ Inserted: "${q.question_text.substring(0, 60)}..." [${q.target_types}]`);
      inserted++;
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch(console.error);
