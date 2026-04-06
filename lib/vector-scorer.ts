import OpenAI from 'openai';
import { adminClient } from './supabase';
import { CENTER_MAP } from './enneagram-lines';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Counter-types: types that don't look like their center
// Per DYN_SYSTEM_ARCHITECTURE.md
const COUNTER_TYPES: Record<number, string> = {
  9: 'Body',  // Type 9 doesn't look like an action type
  3: 'Heart', // Type 3 doesn't look like a feeling type
  7: 'Head',  // Type 7 doesn't look like a thinking type
};

export interface VectorScorerResult {
  typeScores: Record<number, number>;
  centerScores: Record<string, number>;
  confidence: number;
  topTypes: number[];
  phase: 'center_id' | 'type_narrowing' | 'instinct_probing' | 'differentiation';
}

/**
 * Embed a text string using OpenAI's text-embedding-3-small model.
 * This is the only external API call the vector scorer makes.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  // Clamp to [-1, 1] to handle floating-point precision issues
  return Math.max(-1, Math.min(1, dot / (Math.sqrt(magA) * Math.sqrt(magB))));
}

/**
 * Score a user's response against type signatures for a specific question.
 * Uses the Supabase RPC to find similarity scores, falling back to
 * type centroids if no question-specific signatures exist.
 */
async function getTypeSimilarities(
  embedding: number[],
  questionId: string
): Promise<Record<number, number>> {
  const scores: Record<number, number> = {};

  // Try question-specific signatures first
  const { data: sigData } = await adminClient.rpc('match_type_signatures', {
    query_embedding: embedding,
    p_question_id: questionId,
  });

  if (sigData && (sigData as Array<{ type_id: number; similarity: number }>).length >= 9) {
    for (const row of sigData as Array<{ type_id: number; similarity: number }>) {
      scores[row.type_id] = Math.max(0, row.similarity); // Clamp negative similarities
    }
    return scores;
  }

  // Fall back to type centroids (question-agnostic)
  const { data: centroidData } = await adminClient.rpc('match_type_centroids', {
    query_embedding: embedding,
  });

  if (centroidData) {
    for (const row of centroidData as Array<{ type_id: number; similarity: number }>) {
      scores[row.type_id] = Math.max(0, row.similarity);
    }
  }

  // Ensure all 9 types have a score (uniform fallback if missing)
  for (let type = 1; type <= 9; type++) {
    if (scores[type] === undefined) scores[type] = 0;
  }

  return scores;
}

/**
 * Aggregate center scores from individual type scores.
 * Each center's score is the max of its three constituent types.
 */
function computeCenterScores(typeScores: Record<number, number>): Record<string, number> {
  const centers: Record<string, number> = { Body: 0, Heart: 0, Head: 0 };
  for (const [typeStr, score] of Object.entries(typeScores)) {
    const type = Number(typeStr);
    const center = CENTER_MAP[type];
    if (center && score > centers[center]) {
      centers[center] = score;
    }
  }
  return centers;
}

/**
 * Apply counter-type awareness to center scores.
 * Types 9, 3, 7 don't look like their centers — if they're the highest-scoring
 * type in their center, apply a 15% confidence discount to prevent false positives.
 */
function applyCounterTypeAwareness(
  typeScores: Record<number, number>,
  centerScores: Record<string, number>
): Record<string, number> {
  const adjusted = { ...centerScores };

  for (const [typeStr, center] of Object.entries(COUNTER_TYPES)) {
    const type = Number(typeStr);
    const typeScore = typeScores[type] ?? 0;

    // Check if this counter-type is the highest-scoring type in its center
    const centerTypes = Object.entries(typeScores)
      .filter(([t]) => CENTER_MAP[Number(t)] === center)
      .sort(([, a], [, b]) => b - a);

    if (centerTypes.length > 0 && Number(centerTypes[0][0]) === type && typeScore > 0) {
      adjusted[center] *= 0.85; // 15% discount
      console.log(`[vector-scorer] Counter-type awareness: Type ${type} is highest in ${center} center — applying 15% confidence discount`);
    }
  }

  return adjusted;
}

/**
 * Compute confidence as the normalized gap between the top type and the runner-up.
 * Higher gap = higher confidence that we've identified the right type.
 */
function computeConfidence(typeScores: Record<number, number>): number {
  const sorted = Object.values(typeScores).sort((a, b) => b - a);
  if (sorted.length < 2) return 0;
  // Gap between #1 and #2, normalized to 0-1 range
  const gap = sorted[0] - sorted[1];
  // Clamp: a gap of 0.15+ similarity is very high confidence
  return Math.min(gap / 0.15, 1.0);
}

/**
 * Bayesian update: combine prior type scores with new evidence.
 * Uses a weighted average that gives more weight to new evidence as exchanges accumulate.
 */
function bayesianUpdate(
  prior: Record<number, number> | null,
  newEvidence: Record<number, number>,
  exchangeCount: number
): Record<number, number> {
  if (!prior || Object.keys(prior).length === 0) {
    return { ...newEvidence };
  }

  // Weight of new evidence increases with exchange count
  // First exchange: 50/50. By exchange 5: new evidence gets 70% weight
  const newWeight = Math.min(0.5 + exchangeCount * 0.04, 0.7);
  const priorWeight = 1 - newWeight;

  const combined: Record<number, number> = {};
  for (let type = 1; type <= 9; type++) {
    const priorScore = prior[type] ?? 0;
    const evidenceScore = newEvidence[type] ?? 0;
    combined[type] = priorWeight * priorScore + newWeight * evidenceScore;
  }

  // Normalize so scores sum to 1
  const total = Object.values(combined).reduce((sum, v) => sum + v, 0);
  if (total > 0) {
    for (const type of Object.keys(combined)) {
      combined[Number(type)] /= total;
    }
  } else {
    // Zero total — return uniform distribution rather than silent failure
    for (let type = 1; type <= 9; type++) {
      combined[type] = 1 / 9;
    }
  }

  return combined;
}

/**
 * Main scoring function. Given a user's response text and the question they answered,
 * computes updated type scores using vector similarity — no LLM call needed.
 *
 * @param responseText - The user's answer text
 * @param questionId - The ID of the question they answered (for question-specific signatures)
 * @param priorScores - Running scores from previous exchanges (null for first exchange)
 * @param exchangeCount - How many exchanges have occurred (for Bayesian weighting)
 * @returns Updated scoring result with type scores, center scores, and confidence
 */
export async function scoreResponse(
  responseText: string,
  questionId: string,
  priorScores: VectorScorerResult | null,
  exchangeCount: number
): Promise<VectorScorerResult> {
  // 1. Embed the user's response (single OpenAI call)
  const embedding = await embedText(responseText);

  // 2. Get similarity scores against all 9 type signatures
  const rawSimilarities = await getTypeSimilarities(embedding, questionId);

  // 3. Bayesian update with prior scores
  const updatedScores = bayesianUpdate(
    priorScores?.typeScores ?? null,
    rawSimilarities,
    exchangeCount
  );

  // 4. Compute derived metrics
  const rawCenterScores = computeCenterScores(updatedScores);
  const centerScores = applyCounterTypeAwareness(updatedScores, rawCenterScores);
  const confidence = computeConfidence(updatedScores);

  // 5. Sort types by score for easy access
  const topTypes = Object.entries(updatedScores)
    .sort(([, a], [, b]) => b - a)
    .map(([type]) => Number(type));

  // 6. Determine current phase — sequential, non-overlapping
  let phase: VectorScorerResult['phase'] = 'center_id';

  // Check differentiation first (highest priority)
  if (confidence > 0.5 || exchangeCount >= 6) {
    phase = 'differentiation';
  }
  // Then narrowing
  else if (exchangeCount >= 2) {
    const centerValues = Object.values(centerScores);
    const topCenter = Math.max(...centerValues);
    const totalCenter = centerValues.reduce((s, v) => s + v, 0);
    if (totalCenter > 0 && topCenter / totalCenter > 0.45) {
      phase = 'type_narrowing';
    }
  }

  // 7. No-ties flag: if top 2 types are within 0.02, needs pressure testing
  const needsPressureTest = topTypes.length >= 2 &&
    Math.abs((updatedScores[topTypes[0]] ?? 0) - (updatedScores[topTypes[1]] ?? 0)) < 0.02;

  if (needsPressureTest) {
    console.log(`[vector-scorer] NO-TIES WARNING: Types ${topTypes[0]} and ${topTypes[1]} are within 0.02 — needs pressure testing`);
  }

  return {
    typeScores: updatedScores,
    centerScores,
    confidence,
    topTypes,
    phase,
  };
}

/**
 * Check if type signatures exist in the database.
 * Returns false if the system hasn't been initialized yet.
 */
export async function hasTypeSignatures(): Promise<boolean> {
  const { count } = await adminClient
    .from('type_signatures')
    .select('*', { count: 'exact', head: true });
  return (count ?? 0) > 0;
}
