// ─────────────────────────────────────────────────────────────────────────
// VECTOR SCORER v2 — multi-signal, whole-type-aware
// ─────────────────────────────────────────────────────────────────────────
//
// The original vector-scorer.ts maintained ONE running hypothesis (top type)
// and used Bayesian normalization across all 9 types. That architecture
// fails for users whose Whole Type spans multiple centers (e.g. a 1-4-5
// reads as "type 4" because their heart fix lights up the embeddings).
//
// v2 fixes this with a fundamentally different design:
//
//   1. Three INDEPENDENT per-center races (8/9/1, 2/3/4, 5/6/7).
//      Each race is scored separately. The whole type is the winner of
//      each race; the core type is derived from comparing winners across
//      centers, not from a single global "top type" leaderboard.
//
//   2. Multiple signal layers, combined via weighted average:
//        - Layer 4: answer-option type weights  (reliability: 0.50)
//        - Layer 3: lexical marker matches      (reliability: 0.25)
//        - Layer 2: question-targeted embeddings (reliability: 0.25)
//      Reliability weights reflect how trustworthy each signal is. Layer 4
//      is highest because it's a direct mapping from a structured answer
//      to a type. Layer 3 is lower because phrases can be mimicked by
//      adjacent types. Layer 2 is the noisiest signal but generalizes to
//      open-text answers.
//
//   3. Counter-type penalty (Layer 5): types 9, 3, 7 don't look like their
//      centers. When one of them wins its center race, require a higher
//      gap before promoting it as the winner.
//
// This file is INDEPENDENT of vector-scorer.ts (the original). The chat
// route runs v2 in shadow mode and logs its prediction next to Claude's.
// Once v2 reaches >95% agreement with Claude on real assessments, we
// promote it to the front position.

import OpenAI from 'openai';
import { adminClient } from './supabase';
import { CENTER_MAP } from './enneagram-lines';
import { scoreLexicalMarkers } from './lexical-markers';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Reliability weights for each signal layer ──
// These determine how much each layer's score contributes to the combined
// per-type score. They sum to 1.0.
const LAYER_WEIGHTS = {
  answer_weights: 0.5, // Layer 4 — direct answer→type mapping (most reliable)
  lexical: 0.25,       // Layer 3 — curated marker phrases
  embedding: 0.25,     // Layer 2 — question-targeted similarity
} as const;

// Counter-types: types that don't look like their center.
// Per DYN_SYSTEM_ARCHITECTURE.md.
const COUNTER_TYPES = new Set<number>([9, 3, 7]);
const COUNTER_TYPE_GAP_THRESHOLD = 0.10; // counter-type winner needs this much gap over runner-up

// ── Types ──

export type CenterName = 'Body' | 'Heart' | 'Head';

export interface CenterRace {
  Body: { 8: number; 9: number; 1: number };
  Heart: { 2: number; 3: number; 4: number };
  Head: { 5: number; 6: number; 7: number };
}

export interface QuestionContext {
  /** The question the user just answered. May be a bank question or Claude-generated. */
  questionId: string | number;
  questionText: string;
  format: string; // 'forced_choice' | 'agree_disagree' | etc.
  answerOptions: string[] | null;
  /** type_weights[optionIndex][typeNum] = weight contribution to that type. */
  typeWeights?: Record<number, Record<number, number>> | null;
}

export interface VectorV2Result {
  /** Per-center race state. */
  centers: CenterRace;
  /** Winning type per center after normalization. */
  centerWinners: { Body: number; Heart: number; Head: number };
  /** Whole type as a "core-by-other-by-other" string, e.g. "1-4-5". */
  wholeType: string;
  /** Core type — highest-confidence center winner. */
  coreType: number;
  /** Confidence in the core type [0-1]. */
  confidence: number;
  /** Per-layer signal contributions for this turn (for debugging). */
  signalContributions: {
    answer_weights: number;
    lexical: number;
    embedding: number;
  };
  /** Total exchanges scored so far. */
  exchangeCount: number;
}

// ── Helpers ──

function emptyCenters(): CenterRace {
  return {
    Body: { 8: 0, 9: 0, 1: 0 },
    Heart: { 2: 0, 3: 0, 4: 0 },
    Head: { 5: 0, 6: 0, 7: 0 },
  };
}

function cloneCenters(c: CenterRace): CenterRace {
  return {
    Body: { ...c.Body },
    Heart: { ...c.Heart },
    Head: { ...c.Head },
  };
}

function centerOfType(t: number): CenterName | null {
  return (CENTER_MAP[t] as CenterName | undefined) ?? null;
}

function addToCenter(centers: CenterRace, type: number, delta: number): void {
  const center = centerOfType(type);
  if (!center) return;
  // Type-safe assignment via the per-center records
  if (center === 'Body' && (type === 8 || type === 9 || type === 1)) {
    centers.Body[type] += delta;
  } else if (center === 'Heart' && (type === 2 || type === 3 || type === 4)) {
    centers.Heart[type] += delta;
  } else if (center === 'Head' && (type === 5 || type === 6 || type === 7)) {
    centers.Head[type] += delta;
  }
}

function normalizeCenter(scores: Record<number, number>): Record<number, number> {
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  if (total <= 0) {
    // No signal yet — uniform priors
    const out: Record<number, number> = {};
    for (const k of Object.keys(scores)) out[Number(k)] = 1 / 3;
    return out;
  }
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(scores)) out[Number(k)] = v / total;
  return out;
}

/**
 * Pick the winner of a 3-way center race, applying the counter-type penalty:
 * if the highest score is a counter-type (9, 3, or 7), it must beat the
 * runner-up by at least COUNTER_TYPE_GAP_THRESHOLD; otherwise the runner-up
 * wins. This is the "counter-types must prove themselves" rule from the
 * DYN architecture.
 */
function pickCenterWinner(scores: Record<number, number>): { type: number; confidence: number } {
  const entries = Object.entries(scores)
    .map(([t, s]) => ({ type: Number(t), score: s }))
    .sort((a, b) => b.score - a.score);
  if (entries.length === 0) return { type: 0, confidence: 0 };

  const [first, second] = entries;
  if (!second) return { type: first.type, confidence: first.score };

  const gap = first.score - second.score;
  if (COUNTER_TYPES.has(first.type) && gap < COUNTER_TYPE_GAP_THRESHOLD) {
    // Counter-type didn't earn its win. Promote the runner-up.
    return { type: second.type, confidence: second.score };
  }
  return { type: first.type, confidence: first.score };
}

function deriveWholeType(centers: CenterRace): {
  centerWinners: { Body: number; Heart: number; Head: number };
  wholeType: string;
  coreType: number;
  confidence: number;
} {
  const bodyNorm = normalizeCenter(centers.Body);
  const heartNorm = normalizeCenter(centers.Heart);
  const headNorm = normalizeCenter(centers.Head);

  const bodyWin = pickCenterWinner(bodyNorm);
  const heartWin = pickCenterWinner(heartNorm);
  const headWin = pickCenterWinner(headNorm);

  // Core type = the center winner with the highest absolute confidence,
  // weighted by raw center signal strength (so a center with no evidence
  // can't accidentally win because uniform-prior 33% beats a noisy 31%).
  const bodyAbs = Object.values(centers.Body).reduce((s, v) => s + v, 0);
  const heartAbs = Object.values(centers.Heart).reduce((s, v) => s + v, 0);
  const headAbs = Object.values(centers.Head).reduce((s, v) => s + v, 0);

  const candidates: Array<{ type: number; conf: number; absSignal: number; raw: number }> = [
    { type: bodyWin.type, conf: bodyWin.confidence, absSignal: bodyAbs, raw: bodyWin.confidence * bodyAbs },
    { type: heartWin.type, conf: heartWin.confidence, absSignal: heartAbs, raw: heartWin.confidence * heartAbs },
    { type: headWin.type, conf: headWin.confidence, absSignal: headAbs, raw: headWin.confidence * headAbs },
  ];
  candidates.sort((a, b) => b.raw - a.raw);
  const core = candidates[0];

  // Build whole-type string: core first, then the other two ordered by raw signal
  const ordered = [
    core.type,
    ...candidates.slice(1).sort((a, b) => b.raw - a.raw).map((c) => c.type),
  ];

  return {
    centerWinners: { Body: bodyWin.type, Heart: heartWin.type, Head: headWin.type },
    wholeType: ordered.filter((t) => t > 0).join('-'),
    coreType: core.type,
    confidence: core.conf,
  };
}

// ── Layer 4: Answer-option type weights ──
//
// For multiple-choice questions, the answer the user picks maps directly
// to type weights. This is the most reliable signal because it's a
// structured input — no embedding ambiguity, no lexical noise.

function applyAnswerWeights(
  centers: CenterRace,
  question: QuestionContext,
  userResponse: string,
): number {
  if (!question.typeWeights || !question.answerOptions || question.answerOptions.length === 0) {
    return 0;
  }
  // Find the option index the user picked. Match on text equality first,
  // then on case-insensitive substring as a fallback.
  const trimmed = userResponse.trim();
  let pickedIdx = question.answerOptions.findIndex((opt) => opt === trimmed);
  if (pickedIdx === -1) {
    pickedIdx = question.answerOptions.findIndex((opt) =>
      trimmed.toLowerCase().includes(opt.toLowerCase()) ||
      opt.toLowerCase().includes(trimmed.toLowerCase()),
    );
  }
  if (pickedIdx === -1) return 0;

  const weights = question.typeWeights[pickedIdx];
  if (!weights) return 0;

  let totalDelta = 0;
  for (const [typeStr, weight] of Object.entries(weights)) {
    const t = Number(typeStr);
    if (t >= 1 && t <= 9 && typeof weight === 'number' && Number.isFinite(weight)) {
      addToCenter(centers, t, weight);
      totalDelta += Math.abs(weight);
    }
  }
  return totalDelta;
}

// ── Layer 3: Lexical markers ──
//
// Curated phrase matching against the user's response. Orthogonal to
// embeddings — catches signals embeddings smooth out.

function applyLexicalSignal(centers: CenterRace, userResponse: string): number {
  const result = scoreLexicalMarkers(userResponse);
  if (!result) return 0;
  // Each marker hit contributes a small boost (0.05 each) to the matched type
  for (const [typeStr, normalizedScore] of Object.entries(result.scores)) {
    const t = Number(typeStr);
    if (t >= 1 && t <= 9 && normalizedScore > 0) {
      addToCenter(centers, t, normalizedScore * LAYER_WEIGHTS.lexical);
    }
  }
  return result.totalHits * LAYER_WEIGHTS.lexical;
}

// ── Layer 2: Embedding similarity ──
//
// Reuses the existing question-targeted RPCs from vector-scorer.ts.
// The embedding signal is the noisiest, but works for open-text answers
// where the other layers can't help.

async function embedText(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0]?.embedding ?? null;
  } catch (err) {
    console.warn('[vector-v2] embedding failed:', err);
    return null;
  }
}

async function applyEmbeddingSignal(
  centers: CenterRace,
  userResponse: string,
  question: QuestionContext,
): Promise<number> {
  const embedding = await embedText(userResponse);
  if (!embedding) return 0;

  // Try question-specific signatures first, fall back to type centroids
  let typeScores: Record<number, number> = {};
  try {
    const { data: sigData } = await adminClient.rpc('match_type_signatures', {
      query_embedding: embedding,
      p_question_id: String(question.questionId),
    });
    const sigs = sigData as Array<{ type_id: number; similarity: number }> | null;
    if (sigs && sigs.length >= 9) {
      for (const row of sigs) typeScores[row.type_id] = Math.max(0, row.similarity);
    } else {
      const { data: centroidData } = await adminClient.rpc('match_type_centroids', {
        query_embedding: embedding,
      });
      const cents = centroidData as Array<{ type_id: number; similarity: number }> | null;
      if (cents) {
        for (const row of cents) typeScores[row.type_id] = Math.max(0, row.similarity);
      }
    }
  } catch (err) {
    console.warn('[vector-v2] embedding RPC failed:', err);
    return 0;
  }

  // Normalize across types so the embedding signal has comparable scale to
  // the other layers
  const total = Object.values(typeScores).reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  const normalized: Record<number, number> = {};
  for (const [k, v] of Object.entries(typeScores)) normalized[Number(k)] = v / total;

  let totalDelta = 0;
  for (const [typeStr, score] of Object.entries(normalized)) {
    const t = Number(typeStr);
    if (t >= 1 && t <= 9) {
      const weighted = score * LAYER_WEIGHTS.embedding;
      addToCenter(centers, t, weighted);
      totalDelta += weighted;
    }
  }
  return totalDelta;
}

// ── Main entry point ──

/**
 * Score one user response and update the running per-center state.
 *
 * @param userResponse - The user's answer text
 * @param question     - Metadata about the question they answered
 * @param prior        - Previous v2 result for this session, or null on first turn
 * @returns Updated v2 result with new center scores, winners, and core type
 */
export async function scoreV2(
  userResponse: string,
  question: QuestionContext,
  prior: VectorV2Result | null,
): Promise<VectorV2Result> {
  const centers: CenterRace = prior ? cloneCenters(prior.centers) : emptyCenters();

  const answerDelta = applyAnswerWeights(centers, question, userResponse);
  const lexicalDelta = applyLexicalSignal(centers, userResponse);
  const embedDelta = await applyEmbeddingSignal(centers, userResponse, question);

  const derived = deriveWholeType(centers);

  return {
    centers,
    centerWinners: derived.centerWinners,
    wholeType: derived.wholeType,
    coreType: derived.coreType,
    confidence: derived.confidence,
    signalContributions: {
      answer_weights: answerDelta,
      lexical: lexicalDelta,
      embedding: embedDelta,
    },
    exchangeCount: (prior?.exchangeCount ?? 0) + 1,
  };
}

/**
 * Flatten v2 center scores into a flat 9-type score map for compatibility
 * with shadow_mode_log and other consumers expecting Record<number, number>.
 */
export function flattenToTypeScores(centers: CenterRace): Record<number, number> {
  return {
    1: centers.Body[1],
    2: centers.Heart[2],
    3: centers.Heart[3],
    4: centers.Heart[4],
    5: centers.Head[5],
    6: centers.Head[6],
    7: centers.Head[7],
    8: centers.Body[8],
    9: centers.Body[9],
  };
}
