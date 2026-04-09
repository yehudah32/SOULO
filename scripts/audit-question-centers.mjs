// Phase 9 Step 0 — one-shot audit of how the existing question bank
// distributes across the three centers (Body / Heart / Head).
// Uses a keyword-based heuristic since target_center doesn't exist yet.
// Outputs counts + a recommended penalty weight per the plan's decision matrix.

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key);

// Keyword sets — drawn from lib/lexical-markers.ts but condensed and
// targeted at the question text (the assessor's prompt), not the user's
// answer. A question PROBES a center if its prompt invites that center's
// language.
const BODY_MARKERS = [
  'powerless', 'control', 'powerful', 'in charge', 'authority', 'push back',
  'directly', 'standing up', 'fight', 'protect', 'fairness', 'injustice',
  'should have', 'right way', 'wrong way', 'mistake', 'standards', 'principle',
  'inner critic', 'fix it', 'looking inward', 'looking outward', 'go along',
  'avoid conflict', 'peace', 'merge', 'easy going', 'whatever', 'anger',
];
const HEART_MARKERS = [
  'others', 'help', 'feelings', 'emotions', 'how you feel', 'taking care',
  'people-pleasing', 'putting others first', 'unappreciated',
  'image', 'achievement', 'success', 'productive', 'best version', 'win',
  'admired', 'how you come across', 'performance',
  'missing', 'depth', 'longing', 'unique', 'authentic', 'misunderstood',
  'envy', 'inner world', 'true self', 'special', 'don\'t fit',
  'love', 'cared for', 'relationship', 'connection', 'closer',
];
const HEAD_MARKERS = [
  'might go wrong', 'what could go wrong', 'worst case', 'prepared', 'doubt',
  'second guess', 'safety', 'safe', 'unsafe', 'trust', 'authority',
  'commitment', 'loyal', 'anxiety', 'worry', 'vigilant', 'on guard',
  'step back', 'observe', 'analyze', 'process it', 'alone with',
  'private', 'understand it', 'figure it out', 'research', 'detached',
  'withdraw', 'energy reserves', 'drained',
  'options', 'possibilities', 'next thing', 'fun', 'exciting', 'plans',
  'travel', 'experience', 'optimistic', 'reframe', 'bored', 'restless',
];

function classifyQuestion(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  let bodyHits = 0, heartHits = 0, headHits = 0;
  for (const m of BODY_MARKERS) if (lower.includes(m)) bodyHits++;
  for (const m of HEART_MARKERS) if (lower.includes(m)) heartHits++;
  for (const m of HEAD_MARKERS) if (lower.includes(m)) headHits++;

  const total = bodyHits + heartHits + headHits;
  if (total === 0) return 'Cross'; // default — probably a generic / cross-center question
  const max = Math.max(bodyHits, heartHits, headHits);
  // Cross if no center has clear dominance (within 1 hit of another)
  const winners = [
    { c: 'Body', n: bodyHits },
    { c: 'Heart', n: heartHits },
    { c: 'Head', n: headHits },
  ].filter((x) => x.n === max);
  if (winners.length > 1) return 'Cross';
  return winners[0].c;
}

const { data, error } = await db
  .from('questions')
  .select('id, question_text, stage, format, tier, target_types');

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}

console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`PHASE 9 STEP 0 — QUESTION BANK CENTER DISTRIBUTION AUDIT`);
console.log(`═══════════════════════════════════════════════════════════\n`);
console.log(`Total questions in bank: ${data?.length ?? 0}`);

if (!data || data.length === 0) {
  console.log('\n(no rows — bank is empty, only fallbacks will be used)');
  process.exit(0);
}

const counts = { Body: 0, Heart: 0, Head: 0, Cross: 0 };
const byStage = {};
const byCenter = { Body: [], Heart: [], Head: [], Cross: [] };

for (const q of data) {
  const center = classifyQuestion(q.question_text);
  counts[center]++;
  byCenter[center].push({ id: q.id, stage: q.stage, text: q.question_text.slice(0, 80) });
  const key = `stage_${q.stage}`;
  byStage[key] = byStage[key] || { Body: 0, Heart: 0, Head: 0, Cross: 0 };
  byStage[key][center]++;
}

const total = data.length;
const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

console.log(`\n--- DISTRIBUTION BY CENTER ---`);
console.log(`  Body  : ${counts.Body.toString().padStart(3)} (${pct(counts.Body)})`);
console.log(`  Heart : ${counts.Heart.toString().padStart(3)} (${pct(counts.Heart)})`);
console.log(`  Head  : ${counts.Head.toString().padStart(3)} (${pct(counts.Head)})`);
console.log(`  Cross : ${counts.Cross.toString().padStart(3)} (${pct(counts.Cross)})`);

console.log(`\n--- DISTRIBUTION BY STAGE ---`);
for (const [stage, c] of Object.entries(byStage).sort()) {
  const stTotal = c.Body + c.Heart + c.Head + c.Cross;
  console.log(`  ${stage} (n=${stTotal}): Body ${c.Body} | Heart ${c.Heart} | Head ${c.Head} | Cross ${c.Cross}`);
}

// Decision matrix from plan
const targeted = counts.Body + counts.Heart + counts.Head;
const minTargetedPct = targeted > 0 ? Math.min(counts.Body, counts.Heart, counts.Head) / targeted : 0;
const maxTargetedPct = targeted > 0 ? Math.max(counts.Body, counts.Heart, counts.Head) / targeted : 0;

console.log(`\n--- DECISION MATRIX ---`);
console.log(`Excluding Cross: targeted total = ${targeted}`);
console.log(`Most-covered center share: ${(maxTargetedPct * 100).toFixed(1)}%`);
console.log(`Least-covered center share: ${(minTargetedPct * 100).toFixed(1)}%`);

let recommendation;
if (maxTargetedPct <= 0.40) {
  recommendation = 'BALANCED — use penalty weight -0.10 (gentle nudge). Proceed with Step 4 as written.';
} else if (maxTargetedPct <= 0.65) {
  recommendation = 'MILDLY SKEWED — use penalty weight -0.25 + 2-consecutive-from-same-center hard cap.';
} else {
  recommendation = 'HEAVILY SKEWED — STOP. Write more questions for under-represented center(s) BEFORE shipping rerank logic.';
}
console.log(`\nRECOMMENDATION: ${recommendation}`);

// Show sample under-represented questions to aid manual review
console.log(`\n--- SAMPLE QUESTIONS (5 per center) ---`);
for (const c of ['Body', 'Heart', 'Head', 'Cross']) {
  console.log(`\n${c}:`);
  for (const q of byCenter[c].slice(0, 5)) {
    console.log(`  [${q.id}] s${q.stage}: ${q.text}`);
  }
  if (byCenter[c].length > 5) console.log(`  ... and ${byCenter[c].length - 5} more`);
}
