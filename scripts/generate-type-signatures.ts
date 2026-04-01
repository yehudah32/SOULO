/**
 * Generate Type Signatures — One-time batch script
 *
 * For each question in the question bank × each of the 9 Enneagram types,
 * generates synthetic responses using Claude, embeds them, and stores the
 * mean embedding as a "type signature" in Supabase.
 *
 * Usage: npx tsx scripts/generate-type-signatures.ts
 *
 * Cost estimate: ~$5-10 for full run (100 questions × 9 types × 5 responses)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CENTER_MAP: Record<number, string> = {
  8: 'body', 9: 'body', 1: 'body',
  2: 'heart', 3: 'heart', 4: 'heart',
  5: 'head', 6: 'head', 7: 'head',
};

const TYPE_DESCRIPTIONS: Record<number, string> = {
  1: 'The Reformer — principled, purposeful, self-controlled, perfectionistic. Core fear: being corrupt/defective. Core desire: to be good and have integrity.',
  2: 'The Helper — generous, people-pleasing, possessive. Core fear: being unwanted/unloved. Core desire: to be loved and needed.',
  3: 'The Achiever — adaptable, driven, image-conscious. Core fear: being worthless. Core desire: to be valuable and admired.',
  4: 'The Individualist — expressive, dramatic, self-absorbed, temperamental. Core fear: having no identity. Core desire: to be uniquely themselves.',
  5: 'The Investigator — perceptive, innovative, secretive, isolated. Core fear: being useless/incapable. Core desire: to be competent and self-sufficient.',
  6: 'The Loyalist — committed, security-oriented, anxious, suspicious. Core fear: being without support/guidance. Core desire: to have security and support.',
  7: 'The Enthusiast — spontaneous, versatile, acquisitive, scattered. Core fear: being deprived/in pain. Core desire: to be satisfied and content.',
  8: 'The Challenger — self-confident, decisive, confrontational, dominating. Core fear: being controlled/harmed. Core desire: to protect themselves and be in control.',
  9: 'The Peacemaker — receptive, reassuring, complacent, resigned. Core fear: loss/separation. Core desire: to have inner peace and harmony.',
};

async function generateResponses(
  question: { id: string; question_text: string; format: string; answer_options: string[] },
  typeId: number
): Promise<string[]> {
  const typeDesc = TYPE_DESCRIPTIONS[typeId];
  const formatContext = question.answer_options?.length > 0
    ? `The question format is "${question.format}" with options: ${question.answer_options.join(', ')}.`
    : `The question format is "${question.format}" (open-ended response).`;

  const prompt = `You are generating synthetic test data for an Enneagram personality assessment system.

Generate exactly 5 different realistic responses that a healthy-to-average Enneagram Type ${typeId} (${typeDesc}) would give to this question. Each response should reflect the core motivations, fears, and behavioral patterns of Type ${typeId}.

Question: "${question.question_text}"
${formatContext}

Rules:
- Vary the responses: include different personality expressions within Type ${typeId}
- Keep responses natural and conversational (how a real person would talk)
- If it's a multiple choice question, select from the given options but add brief explanation
- If it's open-ended, write 1-3 sentences
- Don't mention "Type ${typeId}" or Enneagram terminology — respond as a real person would
- Include both typical and slightly less obvious Type ${typeId} responses

Output ONLY a JSON array of 5 strings. No other text.`;

  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = result.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  try {
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');
    return JSON.parse(match[0]) as string[];
  } catch {
    console.warn(`  ⚠ Failed to parse responses for Type ${typeId}, Q${question.id}. Retrying...`);
    // Simple retry with more explicit instruction
    const retry = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt + '\n\nIMPORTANT: Output ONLY a valid JSON array like ["response 1", "response 2", "response 3", "response 4", "response 5"]. Nothing else.' }],
    });
    const retryText = retry.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
    const retryMatch = retryText.match(/\[[\s\S]*\]/);
    if (!retryMatch) throw new Error(`Failed to parse responses even after retry: ${retryText.substring(0, 200)}`);
    return JSON.parse(retryMatch[0]) as string[];
  }
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

function computeMeanEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const mean = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      mean[i] += emb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= embeddings.length;
  }
  return mean;
}

async function main() {
  console.log('🔄 Generate Type Signatures');
  console.log('================================\n');

  // Fetch all questions from the database
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, format, answer_options')
    .order('id');

  if (error || !questions || questions.length === 0) {
    console.error('❌ Failed to fetch questions:', error?.message ?? 'No questions found');
    console.log('Run `npm run seed-questions` first to populate the question bank.');
    process.exit(1);
  }

  console.log(`Found ${questions.length} questions in the database.\n`);

  // Check for existing signatures
  const { count: existingCount } = await supabase
    .from('type_signatures')
    .select('*', { count: 'exact', head: true });

  if (existingCount && existingCount > 0) {
    console.log(`⚠ Found ${existingCount} existing type signatures.`);
    console.log('  Will skip (question, type) pairs that already have signatures.\n');
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const centroidEmbeddings: Record<number, number[][]> = {};

  for (const question of questions) {
    console.log(`\n📋 Question ${question.id}: "${(question.question_text as string).substring(0, 60)}..."`);

    for (let typeId = 1; typeId <= 9; typeId++) {
      // Check if signature already exists
      const { data: existing } = await supabase
        .from('type_signatures')
        .select('id')
        .eq('type_id', typeId)
        .eq('question_id', String(question.id))
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      try {
        // Generate synthetic responses for this (type, question) pair
        const responses = await generateResponses(
          {
            id: String(question.id),
            question_text: question.question_text as string,
            format: question.format as string,
            answer_options: (question.answer_options as string[]) ?? [],
          },
          typeId
        );

        // Embed all responses
        const embeddings = await embedTexts(responses);

        // Compute mean embedding
        const meanEmbedding = computeMeanEmbedding(embeddings);

        // Store in Supabase
        const { error: insertError } = await supabase
          .from('type_signatures')
          .upsert({
            type_id: typeId,
            question_id: String(question.id),
            exemplar_responses: responses,
            mean_embedding: meanEmbedding,
            sample_count: responses.length,
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`  ❌ Type ${typeId}: Insert failed — ${insertError.message}`);
          failed++;
        } else {
          console.log(`  ✅ Type ${typeId}: ${responses.length} responses embedded`);
          generated++;
        }

        // Collect for centroid calculation
        if (!centroidEmbeddings[typeId]) centroidEmbeddings[typeId] = [];
        centroidEmbeddings[typeId].push(meanEmbedding);

        // Rate limit: small delay between calls
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`  ❌ Type ${typeId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        failed++;
      }
    }
  }

  // ── Compute and store type centroids ──
  console.log('\n\n🎯 Computing type centroids...');
  for (let typeId = 1; typeId <= 9; typeId++) {
    const embeddings = centroidEmbeddings[typeId];
    if (!embeddings || embeddings.length === 0) {
      // Load from database if we skipped generation
      const { data: sigs } = await supabase
        .from('type_signatures')
        .select('mean_embedding')
        .eq('type_id', typeId);

      if (sigs && sigs.length > 0) {
        const loadedEmbeddings = sigs
          .map((s) => s.mean_embedding as number[])
          .filter((e) => e && e.length > 0);
        if (loadedEmbeddings.length > 0) {
          const centroid = computeMeanEmbedding(loadedEmbeddings);
          await supabase.from('type_centroids').upsert({
            type_id: typeId,
            center: CENTER_MAP[typeId],
            centroid_vector: centroid,
            sample_count: loadedEmbeddings.length,
            updated_at: new Date().toISOString(),
          });
          console.log(`  ✅ Type ${typeId} centroid: ${loadedEmbeddings.length} signatures averaged`);
        }
      }
      continue;
    }

    const centroid = computeMeanEmbedding(embeddings);
    await supabase.from('type_centroids').upsert({
      type_id: typeId,
      center: CENTER_MAP[typeId],
      centroid_vector: centroid,
      sample_count: embeddings.length,
      updated_at: new Date().toISOString(),
    });
    console.log(`  ✅ Type ${typeId} centroid: ${embeddings.length} signatures averaged`);
  }

  console.log('\n================================');
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭  Skipped (already exists): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total signatures: ${generated + skipped}`);
  console.log('\nType signatures are ready for the vector scorer.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
