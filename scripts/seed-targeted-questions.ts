/**
 * Seeds targeted differentiation questions for Type 8 and Type 9 accuracy.
 * These target the specific confusion pairs causing 0% accuracy: 9v1, 8v3, 8v6, 8v5.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-targeted-questions.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const QUESTIONS = [
  // ── 9v1: The critical mistype (0% accuracy on Type 9) ──────────────
  {
    question_text: 'When you notice something isn\'t being done right, is the pull to fix it because the wrongness itself bothers you — or because leaving it will create tension or conflict that disrupts the peace?',
    answer_options: JSON.stringify(['The wrongness itself bothers me — it should be done right', 'Leaving it will create tension that disrupts the peace']),
    format: 'forced_choice', stage: 5, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]), avg_information_yield: 0.95, is_baruch_sourced: false,
  },
  {
    question_text: 'When you hold yourself to a high standard, is it because you genuinely believe in the standard — or because meeting the standard keeps things running smoothly and avoids problems?',
    answer_options: JSON.stringify(['I genuinely believe in the standard — it matters on principle', 'Meeting it keeps things smooth and avoids problems']),
    format: 'forced_choice', stage: 5, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]), avg_information_yield: 0.95, is_baruch_sourced: false,
  },
  {
    question_text: 'Think of a time you bit your tongue instead of saying what you really thought. Were you holding back because you were afraid of being wrong or unfair — or because you were afraid of the disruption it would cause?',
    answer_options: JSON.stringify(['Afraid of being wrong or unfair', 'Afraid of the disruption it would cause']),
    format: 'forced_choice', stage: 6, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },
  {
    question_text: 'When someone asks for your opinion on something you disagree with, what happens first — a clear internal judgment forms and you decide whether to voice it, or you feel yourself scanning for the answer that will create the least friction?',
    answer_options: JSON.stringify(['A clear judgment forms — then I decide whether to share it', 'I scan for the answer that creates the least friction']),
    format: 'forced_choice', stage: 6, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([1, 9]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },

  // ── 8v3: Both assertive, both commanding ───────────────────────────
  {
    question_text: 'When you take charge in a group, is it because you see no one else will protect what matters — or because leading well is how you prove your value?',
    answer_options: JSON.stringify(['No one else will protect what matters — someone has to step up', 'Leading well is how I prove my value — I want to be seen as capable']),
    format: 'forced_choice', stage: 5, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([8, 3]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },
  {
    question_text: 'When you fail publicly, what hits harder — the feeling that you lost control of the situation, or the feeling that people saw you fail?',
    answer_options: JSON.stringify(['Losing control — I hate feeling powerless', 'Being seen failing — I hate looking incompetent']),
    format: 'forced_choice', stage: 6, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([8, 3]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },
  {
    question_text: 'When someone challenges your authority, is your instinct to confront them directly and establish who is in charge — or to outperform them so the results speak for themselves?',
    answer_options: JSON.stringify(['Confront directly — establish who is in charge', 'Outperform them — let results speak']),
    format: 'forced_choice', stage: 6, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([8, 3]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },

  // ── 8v6: Both confrontational ──────────────────────────────────────
  {
    question_text: 'When you push back on authority, is it because authority itself shouldn\'t go unchallenged — or because you need to test whether this particular authority can be trusted?',
    answer_options: JSON.stringify(['Authority shouldn\'t go unchallenged — power needs to be checked', 'I need to test whether this authority can be trusted']),
    format: 'forced_choice', stage: 5, oyn_dim: 'why', react_respond_lens: 'react',
    target_types: JSON.stringify([8, 6]), avg_information_yield: 0.9, is_baruch_sourced: false,
  },
  {
    question_text: 'When you sense danger in a situation, does your body move toward it or does your mind start calculating escape routes — even if you ultimately stand your ground either way?',
    answer_options: JSON.stringify(['My body moves toward it — I run at the problem', 'My mind calculates — I stand my ground but I\'ve mapped the exits']),
    format: 'forced_choice', stage: 6, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([8, 6]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },

  // ── 8v5: Both withdrawn under stress ───────────────────────────────
  {
    question_text: 'When you pull back from people, is it because you need to recharge your energy and protect your resources — or because you are strategizing your next move and don\'t want interference?',
    answer_options: JSON.stringify(['Recharge and protect my resources — I feel depleted', 'Strategize my next move — I don\'t want interference']),
    format: 'forced_choice', stage: 6, oyn_dim: 'how', react_respond_lens: 'react',
    target_types: JSON.stringify([5, 8]), avg_information_yield: 0.85, is_baruch_sourced: false,
  },
];

async function main() {
  console.log('Seeding targeted differentiation questions...\n');
  let inserted = 0;
  for (const q of QUESTIONS) {
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .ilike('question_text', `%${q.question_text.substring(0, 40)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  Skipped (exists): "${q.question_text.substring(0, 55)}..."`);
      continue;
    }

    const { error } = await supabase.from('questions').insert(q);
    if (error) {
      console.error(`  Error: ${error.message}`);
    } else {
      console.log(`  ✅ ${q.target_types}: "${q.question_text.substring(0, 55)}..."`);
      inserted++;
    }
  }
  console.log(`\nDone. Inserted: ${inserted}/${QUESTIONS.length}`);
}

main().catch(console.error);
