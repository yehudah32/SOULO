/**
 * Seeds Tier 2 instinct-specific questions into the question bank.
 * These target SP/SX/SO differentiation per DYN_SYSTEM_ARCHITECTURE.md.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-instinct-questions.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const INSTINCT_QUESTIONS = [
  // ── SP vs SX: Security vs Intensity ────────────────────
  {
    question_text: 'When you have a free evening with no obligations, does your energy go first toward making your space comfortable and secure — or toward finding something or someone that feels intense and alive?',
    answer_options: JSON.stringify(['Making my space comfortable and secure', 'Finding something intense and alive']),
    format: 'forced_choice', stage: 5, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },
  {
    question_text: 'In your closest relationship, what matters more — knowing you can count on this person to be steady and reliable, or feeling a deep, almost electric connection that makes everything else fade?',
    answer_options: JSON.stringify(['Steady and reliable — I need to know they will be there', 'Deep electric connection — I need to feel something real']),
    format: 'forced_choice', stage: 5, oyn_dim: 'what', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },

  // ── SP vs SO: Self vs Group ────────────────────────────
  {
    question_text: 'When resources are scarce — money, time, energy — does your instinct go first toward protecting what you have, or toward making sure the group you belong to is taken care of?',
    answer_options: JSON.stringify(['Protecting what I have — I need to be okay first', 'Making sure the group is taken care of — we need to be okay together']),
    format: 'forced_choice', stage: 5, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },
  {
    question_text: 'At a gathering where you don\'t know many people, what runs through your mind first — whether the food and environment are comfortable, or where you fit in the social dynamics of the room?',
    answer_options: JSON.stringify(['The food, environment, whether I am physically comfortable', 'Where I fit in the room — who is connected to whom, where I belong']),
    format: 'forced_choice', stage: 5, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },

  // ── SX vs SO: One-to-One vs Group ──────────────────────
  {
    question_text: 'If you had to choose between one deeply transformative relationship and being well-connected in a thriving community, which pull is stronger?',
    answer_options: JSON.stringify(['One deep, transformative relationship', 'Being well-connected in a thriving community']),
    format: 'forced_choice', stage: 6, oyn_dim: 'what', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },
  {
    question_text: 'When you feel most energized, is it because you just had a deeply intimate conversation with one person — or because you played a meaningful role in a group that matters to you?',
    answer_options: JSON.stringify(['A deeply intimate conversation with one person', 'Playing a meaningful role in a group that matters']),
    format: 'forced_choice', stage: 6, oyn_dim: 'how', react_respond_lens: 'respond',
    target_types: JSON.stringify([]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },

  // ── SP: Self-Preservation depth ────────────────────────
  {
    question_text: 'How much of your mental bandwidth on an average day goes toward thinking about physical security — money, health, food, shelter, whether your body is okay?',
    answer_options: JSON.stringify(['1 — Rarely think about it', '2', '3 — Sometimes', '4', '5 — A lot of my bandwidth']),
    format: 'scale', stage: 5, oyn_dim: 'where', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.8, is_baruch_sourced: false,
  },

  // ── SX [One-to-One]: Intensity depth ───────────────────
  {
    question_text: 'When you meet someone new who truly fascinates you, does the rest of the room essentially disappear — or do you stay aware of the broader social context?',
    answer_options: JSON.stringify(['The rest of the room disappears — I am fully locked in', 'I stay aware of the broader context while engaging them']),
    format: 'forced_choice', stage: 6, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.8, is_baruch_sourced: false,
  },

  // ── SO: Social depth ───────────────────────────────────
  {
    question_text: 'When you hear that a friend spoke highly of you to others when you weren\'t there, what is the feeling — warm validation that you belong, or mild discomfort that you were being talked about?',
    answer_options: JSON.stringify(['Warm validation — I belong and am valued', 'Mild discomfort — I prefer to manage my own social presence']),
    format: 'forced_choice', stage: 6, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.8, is_baruch_sourced: false,
  },

  // ── Three-way instinct stack ordering ──────────────────
  {
    question_text: 'Rank these three in order of what you instinctively prioritize most, even if you value all of them: (A) Physical safety, resources, and bodily comfort. (B) Deep one-to-one bonds and magnetic connections. (C) Belonging, social role, and community standing.',
    answer_options: JSON.stringify(['A first, then B, then C', 'A first, then C, then B', 'B first, then A, then C', 'B first, then C, then A', 'C first, then A, then B', 'C first, then B, then A']),
    format: 'paragraph_select', stage: 6, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },

  // ── Repressed instinct detection ───────────────────────
  {
    question_text: 'Which of these three areas do you most consistently neglect or forget about until it becomes a problem? (A) Physical health, finances, basic self-care. (B) Deep intimate connection — you have acquaintances but few bonds that truly transform you. (C) Social belonging — you drift from groups and don\'t track your role in communities.',
    answer_options: JSON.stringify(['A — I neglect the physical/practical', 'B — I neglect deep one-to-one connection', 'C — I neglect social belonging and community']),
    format: 'forced_choice', stage: 6, oyn_dim: 'where', react_respond_lens: 'react',
    target_types: JSON.stringify([]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },
];

async function main() {
  console.log('Seeding Tier 2 instinct questions...\n');
  let inserted = 0;
  for (const q of INSTINCT_QUESTIONS) {
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .ilike('question_text', `%${q.question_text.substring(0, 40)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  Skipped: "${q.question_text.substring(0, 50)}..."`);
      continue;
    }

    const { error } = await supabase.from('questions').insert(q);
    if (error) {
      console.error(`  Error: ${error.message}`);
    } else {
      console.log(`  ✅ Tier 2: "${q.question_text.substring(0, 50)}..."`);
      inserted++;
    }
  }
  console.log(`\nDone. Inserted: ${inserted}/${INSTINCT_QUESTIONS.length}`);
}

main().catch(console.error);
