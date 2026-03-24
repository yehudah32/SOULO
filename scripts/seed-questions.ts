import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SYSTEM_CONTEXT = `You are an expert Enneagram assessment designer working within the Defiant Spirit methodology by Dr. Baruch HaLevi.

Your task is to generate high-quality assessment questions for a seeded question bank.

Each question must be a valid JSON object with these exact fields:
{
  "question_text": string,           // The question text
  "answer_options": string[],        // Array of options (empty [] for open/behavioral_anchor)
  "format": string,                  // One of: forced_choice | agree_disagree | scale | frequency | behavioral_anchor | paragraph_select | scenario | open
  "stage": number,                   // 1-7
  "oyn_dim": string,                 // One of: who | what | why | how | when | where
  "react_respond_lens": string,      // One of: react | respond | both
  "target_types": number[],          // Array of type numbers this question discriminates ([] for all types)
  "avg_information_yield": number    // Initial estimate 0.0-1.0
}

STAGE DEFINITIONS:
Stage 1 (exchanges 1-2): Only forced_choice and agree_disagree. Warm-up, general.
Stage 2 (exchanges 3-5): agree_disagree, scale, frequency. Building engagement.
Stage 3 (exchanges 3-8): behavioral_anchor, frequency, scale. Probing patterns.
Stage 4 (exchanges 6-11): behavioral_anchor, paragraph_select, scenario. Motivation depth.
Stage 5 (exchanges 9-13): behavioral_anchor, scenario. Core fear/desire.
Stage 6 (exchanges 12-15): paragraph_select, scenario, open. Differentiation.
Stage 7 (exchanges 15+): open. Convergence and closing.

QUALITY RULES:
- Questions probe motivation (WHY), not just behavior (WHAT)
- Forced choice options must be genuinely binary — not two versions of the same thing
- Agree/disagree statements surface patterns people wouldn't volunteer
- Behavioral anchor questions ask about specific past situations
- Questions avoid Enneagram jargon completely
- All questions work for any demographic`;

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

interface Question {
  question_text: string;
  answer_options: string[];
  format: string;
  stage: number;
  oyn_dim: string;
  react_respond_lens: string;
  target_types: number[];
  avg_information_yield: number;
}

function validateQuestion(q: unknown): q is Question {
  if (!q || typeof q !== 'object') return false;
  const obj = q as Record<string, unknown>;
  return (
    typeof obj.question_text === 'string' && obj.question_text.length > 0 &&
    Array.isArray(obj.answer_options) &&
    typeof obj.format === 'string' && obj.format.length > 0 &&
    typeof obj.stage === 'number' &&
    typeof obj.oyn_dim === 'string' &&
    typeof obj.react_respond_lens === 'string' &&
    Array.isArray(obj.target_types) &&
    typeof obj.avg_information_yield === 'number'
  );
}

async function generateBatch(callNum: number, instructions: string, continueOnError = false): Promise<Question[]> {
  console.log(`\nGenerating batch ${callNum}...`);

  const result = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_CONTEXT,
    messages: [{ role: 'user', content: instructions }],
  });

  const rawText = result.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  const cleaned = stripCodeFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(`Batch ${callNum}: Failed to parse JSON. Raw response (first 500 chars):`);
    console.error(cleaned.slice(0, 500));
    if (continueOnError) {
      console.error(`Batch ${callNum}: Continuing despite parse failure (continueOnError=true)`);
      return [];
    }
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error(`Batch ${callNum}: Expected array, got:`, typeof parsed);
    if (continueOnError) {
      console.error(`Batch ${callNum}: Continuing despite invalid response (continueOnError=true)`);
      return [];
    }
    process.exit(1);
  }

  const valid: Question[] = [];
  for (const q of parsed) {
    if (validateQuestion(q)) {
      valid.push(q);
    } else {
      console.warn(`Batch ${callNum}: Skipping invalid question:`, JSON.stringify(q).slice(0, 100));
    }
  }

  console.log(`Batch ${callNum}: ${valid.length} valid questions parsed.`);
  return valid;
}

async function main() {
  console.log('Seeding question bank...\n');

  // ── Call 1: Stages 1-4 (early and mid assessment) ─────────────────────────
  const call1Instructions = `Generate exactly 25 Enneagram assessment questions for stages 1-4.

Distribution:
- 6 questions for stage 1 (forced_choice and agree_disagree only)
- 7 questions for stage 2 (agree_disagree, scale, frequency)
- 7 questions for stage 3 (behavioral_anchor, frequency, scale)
- 5 questions for stage 4 (behavioral_anchor, paragraph_select, scenario)

Cover all 9 types across the set. Mix oyn_dim across who/what/why/how/when/where.
Mix react_respond_lens across react/respond/both.
Include 5-8 questions that discriminate specific type pairs (put those type numbers in target_types).

Return a JSON array of exactly 25 question objects. No markdown, no explanation — pure JSON array only.`;

  const batch1 = await generateBatch(1, call1Instructions);

  // ── Call 2: Stages 5-7 + differentiation (later assessment) ──────────────
  const call2Instructions = `Generate exactly 25 Enneagram assessment questions for stages 5-7, focused on motivation depth and type differentiation.

Distribution:
- 8 questions for stage 5 (behavioral_anchor, scenario)
- 8 questions for stage 6 (paragraph_select, scenario, open)
- 4 questions for stage 7 (open format only)
- 5 differentiation questions targeting the trickiest type pairs:
  * 4 vs 9 (longing vs merging)
  * 1 vs 6 (inner critic vs outer authority)
  * 3 vs 8 (image vs power)
  * 2 vs 9 (giving vs accommodating)
  * 5 vs 9 (active withdrawal vs passive disengagement)

Each differentiation question: set stage to 6, put both type numbers in target_types.

Include questions probing:
- Core fear under pressure
- Relationship to control/vulnerability
- Response to failure or criticism
- Instinctual variant signals (SP/SO/SX)

Return a JSON array of exactly 25 question objects. No markdown, no explanation — pure JSON array only.`;

  const batch2 = await generateBatch(2, call2Instructions);

  // ── Batch A: 25 scenario-based questions (stages 3-7) ─────────────────────
  const batchAInstructions = `Generate exactly 25 scenario-based Enneagram assessment questions for stages 3-7.

These should present brief realistic situations and ask how the person would respond.
Format: behavioral_anchor or scenario only.
Stage distribution: 5 for stage 3, 5 for stage 4, 5 for stage 5, 5 for stage 6, 5 for stage 7.

Each scenario should:
- Be concrete and relatable (work, relationships, decision-making)
- Probe motivation behind behavior, not just behavior
- Be 2-4 sentences for the setup, then one direct question

Set answer_options to [] (open response).
Mix target_types — some general (target_types: []), some type-specific.

Return a JSON array of exactly 25 question objects. No markdown, no explanation — pure JSON array only.`;

  let batchA: Question[] = [];
  try {
    batchA = await generateBatch('A' as unknown as number, batchAInstructions, true);
  } catch (err) {
    console.error('Batch A failed:', err);
  }
  console.log(`Batch A: ${batchA.length} questions generated.`);

  // ── Batch B: 25 anecdotal "tell me about a time" (stages 5-7) ─────────────
  const batchBInstructions = `Generate exactly 25 anecdotal "tell me about a time" Enneagram assessment questions for stages 5-7.

These use "open" format — ask the person to describe a specific past situation.
Examples: "Tell me about a time you had to..." or "Describe a situation where..."

Stage distribution: 8 for stage 5, 10 for stage 6, 7 for stage 7.
All format fields must be "open".
Set answer_options to [].
Mix oyn_dim and react_respond_lens.
Focus on emotional patterns, relationship dynamics, decision under pressure.

Return a JSON array of exactly 25 question objects. No markdown, no explanation — pure JSON array only.`;

  let batchB: Question[] = [];
  try {
    batchB = await generateBatch('B' as unknown as number, batchBInstructions, true);
  } catch (err) {
    console.error('Batch B failed:', err);
  }
  console.log(`Batch B: ${batchB.length} questions generated.`);

  // ── Batch C: 25 type-specific reaction questions (stages 4-6) ─────────────
  const batchCInstructions = `Generate exactly 25 type-specific reaction questions targeting specific Enneagram types for stages 4-6.

These should use behavioral_anchor or forced_choice format.
Generate 2-3 questions per type (covering all 9 types, some may have 3).
Set target_types to the specific type number(s) each question is designed to discriminate.

Examples of type-specific probes:
- Type 1: perfectionism vs flexibility
- Type 2: helping vs being helped
- Type 3: image vs authenticity
- Type 4: uniqueness vs belonging
- Type 5: knowledge vs connection
- Type 6: safety vs risk
- Type 7: options vs commitment
- Type 8: control vs vulnerability
- Type 9: harmony vs conflict

Stage distribution: 8 for stage 4, 10 for stage 5, 7 for stage 6.
Include a mix of formats: behavioral_anchor, forced_choice.
Set answer_options to [] unless it's forced_choice — then provide 2 options as strings.

Return a JSON array of exactly 25 question objects. No markdown, no explanation — pure JSON array only.`;

  let batchC: Question[] = [];
  try {
    batchC = await generateBatch('C' as unknown as number, batchCInstructions, true);
  } catch (err) {
    console.error('Batch C failed:', err);
  }
  console.log(`Batch C: ${batchC.length} questions generated.`);

  // ── Batch D: 25 wing differentiation questions (stages 5-6) ───────────────
  const batchDInstructions = `Generate exactly 25 wing differentiation questions for stages 5-6.

These help determine which wing (adjacent type) is dominant for each Enneagram type.
Use forced_choice or paragraph_select format.

For each question:
- Present two contrasting options that reflect wing differences
- Store answer_options as JSON objects with this structure:
  [{"label": "A", "text": "..."}, {"label": "B", "text": "..."}]
- Set target_types to both the main type and its wings (e.g., [4, 3, 5] for a 4w3 vs 4w5 question)
- Add metadata context in the question_text to indicate which wings are being differentiated
- Stage: either 5 or 6 (split evenly)
- Format: forced_choice or paragraph_select

Cover all 9 types with their two wing options (9 types × ~2-3 questions each ≈ 25 total).

Return a JSON array of exactly 25 question objects. No markdown, no explanation — pure JSON array only.`;

  let batchD: Question[] = [];
  try {
    batchD = await generateBatch('D' as unknown as number, batchDInstructions, true);
  } catch (err) {
    console.error('Batch D failed:', err);
  }
  console.log(`Batch D: ${batchD.length} questions generated.`);

  const allQuestions = [...batch1, ...batch2, ...batchA, ...batchB, ...batchC, ...batchD];
  console.log(`\nBatch counts: batch1=${batch1.length}, batch2=${batch2.length}, A=${batchA.length}, B=${batchB.length}, C=${batchC.length}, D=${batchD.length}`);
  console.log(`Total questions to insert: ${allQuestions.length}`);

  const { error } = await adminClient.from('questions').insert(allQuestions);

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  // Query actual count in DB
  const { count, error: countErr } = await adminClient
    .from('questions')
    .select('*', { count: 'exact', head: true });

  if (!countErr) {
    console.log(`\nTotal questions now in DB: ${count}`);
  }

  console.log(`\n✓ Successfully inserted ${allQuestions.length} questions into the database.`);
  console.log('Run npm run test-rag to verify the knowledge base.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
