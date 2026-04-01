// ─────────────────────────────────────────────────────────────────────────────
// evaluation/evaluation-engine.ts
// Scores a completed simulation across 8 dimensions using Claude + automated
// checks. Produces an EvaluationResult for a single run.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import {
  TYPE_BOUNDARIES,
} from '../lib/personality-correlations';
import type {
  Persona,
  SimulationResult,
  QuestionTag,
  CommandmentCheckResult,
  EvaluationResult,
  ImprovementAction,
  TypeConsidered,
  TranscriptTurn,
} from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

// ─── Harm Matrix ─────────────────────────────────────
// Harm severity for mistyping: actual -> predicted -> severity (0-10)
// Higher values indicate more psychologically harmful mistypes.
const HARM_MATRIX: Record<string, number> = {
  // Body center confused with Head center — high harm
  '1->7': 8, '8->5': 7, '9->6': 6,
  // Heart center confused with Body center — moderate-high harm
  '2->8': 7, '3->1': 5, '4->9': 7,
  // Within-center confusions — moderate harm
  '1->9': 5, '9->1': 5, '8->9': 4, '9->8': 4,
  '2->3': 4, '3->2': 4, '3->4': 5, '4->3': 5,
  '5->6': 4, '6->5': 4, '6->7': 5, '7->6': 5,
  // Cross-center common mistypes
  '4->6': 6, '6->4': 6, '1->6': 5, '6->1': 5,
  '2->9': 6, '9->2': 5, '3->7': 5, '7->3': 5,
  '5->9': 6, '9->5': 5, '8->3': 5, '3->8': 5,
  '4->1': 6, '1->4': 5, '7->2': 4, '2->7': 4,
  '8->6': 6, '6->8': 6,
};

function getHarmSeverity(actual: number, predicted: number): number {
  if (actual === predicted) return 0;
  const key = `${actual}->${predicted}`;
  return HARM_MATRIX[key] ?? 3; // default moderate harm for unlisted pairs
}

// ─── Helpers ─────────────────────────────────────────

function extractConfidenceCurve(transcript: TranscriptTurn[]): Array<{
  exchange_number: number;
  top_type: number;
  confidence: number;
}> {
  const curve: Array<{ exchange_number: number; top_type: number; confidence: number }> = [];
  for (const turn of transcript) {
    if (turn.role === 'system' && turn.internal_block) {
      const hypothesis = turn.internal_block.hypothesis as Record<string, unknown> | undefined;
      if (hypothesis) {
        curve.push({
          exchange_number: turn.turn,
          top_type: (hypothesis.leading_type as number) ?? 0,
          confidence: (hypothesis.confidence as number) ?? 0,
        });
      }
    }
  }
  return curve;
}

function extractTypesConsidered(
  transcript: TranscriptTurn[],
  groundTruthType: number
): TypeConsidered[] {
  const typeMap = new Map<number, { peak_confidence: number; first_at_q: number }>();

  for (const turn of transcript) {
    if (turn.role === 'system' && turn.internal_block) {
      const hypothesis = turn.internal_block.hypothesis as Record<string, unknown> | undefined;
      if (!hypothesis) continue;

      const typeScores = hypothesis.type_scores as Record<string, number> | undefined;
      if (!typeScores) continue;

      for (const [typeStr, score] of Object.entries(typeScores)) {
        const typeNum = Number(typeStr);
        if (score <= 0) continue;
        const existing = typeMap.get(typeNum);
        if (!existing) {
          typeMap.set(typeNum, { peak_confidence: score, first_at_q: turn.turn });
        } else {
          if (score > existing.peak_confidence) {
            existing.peak_confidence = score;
          }
        }
      }

      // Track leading type specifically
      const leadingType = (hypothesis.leading_type as number) ?? 0;
      const confidence = (hypothesis.confidence as number) ?? 0;
      if (leadingType > 0) {
        const existing = typeMap.get(leadingType);
        if (!existing) {
          typeMap.set(leadingType, { peak_confidence: confidence, first_at_q: turn.turn });
        } else if (confidence > existing.peak_confidence) {
          existing.peak_confidence = confidence;
        }
      }
    }
  }

  const result: TypeConsidered[] = [];
  for (const [type, data] of typeMap) {
    result.push({
      type,
      peak_confidence: data.peak_confidence,
      first_at_q: data.first_at_q,
    });
  }
  return result.sort((a, b) => b.peak_confidence - a.peak_confidence);
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

// ─── Dimension 1: Core Type Accuracy ─────────────────

function scoreCoreTypeAccuracy(
  persona: Persona,
  simResult: SimulationResult,
  typesConsidered: TypeConsidered[]
): { score: number; details: Record<string, unknown> } {
  const groundTruth = persona.spec.core_type;
  const predicted = simResult.final_internal
    ? ((simResult.final_internal.hypothesis as Record<string, unknown>)?.leading_type as number) ?? 0
    : 0;
  const isCorrect = predicted === groundTruth;

  const correctTypeEntry = typesConsidered.find(t => t.type === groundTruth);
  const incorrectTypeEntry = typesConsidered.find(t => t.type === predicted && predicted !== groundTruth);

  let score = isCorrect ? 10 : 0;
  // Partial credit: correct type was considered
  if (!isCorrect && correctTypeEntry) {
    score = 3; // Was on the radar but not chosen
    if (correctTypeEntry.peak_confidence > 0.5) score = 5;
  }

  return {
    score,
    details: {
      ground_truth: groundTruth,
      predicted,
      is_correct: isCorrect,
      correct_type_ever_considered: !!correctTypeEntry,
      correct_type_first_at_q: correctTypeEntry?.first_at_q ?? null,
      correct_type_peak_confidence: correctTypeEntry?.peak_confidence ?? 0,
      incorrect_type_peak_confidence: incorrectTypeEntry?.peak_confidence ?? 0,
    },
  };
}

// ─── Dimension 2: Subtype Accuracy ───────────────────

function scoreSubtypeAccuracy(
  persona: Persona,
  simResult: SimulationResult
): { score: number; details: Record<string, unknown> } {
  const gtWing = persona.spec.wing;
  const gtVariant = persona.spec.instinctual_variant;

  // Extract from final internal block
  const finalInternal = simResult.final_internal;
  const hypothesis = finalInternal?.hypothesis as Record<string, unknown> | undefined;

  // Wing check - the spec stores wing as "6w7" format
  const predictedWing = hypothesis?.wing as string | undefined;
  let wingResult: 'correct' | 'incorrect' | 'not_assessed' = 'not_assessed';
  if (predictedWing && gtWing) {
    wingResult = predictedWing === gtWing ? 'correct' : 'incorrect';
  }

  // Variant check
  const variantSignals = finalInternal?.variant_signals as Record<string, number> | undefined;
  let predictedVariant: string | null = null;
  if (variantSignals) {
    const sorted = Object.entries(variantSignals).sort(([, a], [, b]) => b - a);
    if (sorted.length > 0 && sorted[0][1] > 0) {
      predictedVariant = sorted[0][0];
    }
  }
  let variantResult: 'correct' | 'incorrect' | 'not_assessed' = 'not_assessed';
  if (predictedVariant && gtVariant) {
    variantResult = predictedVariant === gtVariant ? 'correct' : 'incorrect';
  }

  let score = 5; // baseline
  if (wingResult === 'correct') score += 2.5;
  if (wingResult === 'incorrect') score -= 2;
  if (variantResult === 'correct') score += 2.5;
  if (variantResult === 'incorrect') score -= 2;
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    details: {
      wing_ground_truth: gtWing,
      wing_predicted: predictedWing ?? null,
      wing_result: wingResult,
      variant_ground_truth: gtVariant,
      variant_predicted: predictedVariant,
      variant_result: variantResult,
    },
  };
}

// ─── Dimension 3: Convergent Validity ────────────────

function scoreConvergentValidity(
  persona: Persona,
  predictedType: number
): { score: number; details: Record<string, unknown> } {
  const expectedBigFive = persona.big_five_expected;
  if (!expectedBigFive || predictedType < 1 || predictedType > 9) {
    return { score: 5, details: { note: 'No Big Five data available for comparison' } };
  }

  const typeBoundaries = TYPE_BOUNDARIES[predictedType];
  if (!typeBoundaries) {
    return { score: 5, details: { note: `No boundary data for type ${predictedType}` } };
  }

  const bf = typeBoundaries.bigFive;
  const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
  const traitMap: Record<string, string> = { openness: 'O', conscientiousness: 'C', extraversion: 'E', agreeableness: 'A', neuroticism: 'N' };

  let alignedCount = 0;
  let misalignedCount = 0;
  const details: Record<string, unknown>[] = [];

  for (const trait of traits) {
    const boundary = bf[trait];
    const personaLevel = expectedBigFive[traitMap[trait] as keyof typeof expectedBigFive];

    // Convert persona level descriptors to numeric approximations
    let numericLevel: number;
    if (typeof personaLevel === 'number') {
      numericLevel = personaLevel;
    } else {
      const levelStr = String(personaLevel).toLowerCase();
      if (levelStr.includes('very high') || levelStr === 'vh') numericLevel = 9;
      else if (levelStr.includes('high') || levelStr === 'h') numericLevel = 8;
      else if (levelStr.includes('moderate') || levelStr === 'm' || levelStr.includes('medium')) numericLevel = 5;
      else if (levelStr.includes('low') && !levelStr.includes('very')) numericLevel = 3;
      else if (levelStr.includes('very low') || levelStr === 'vl') numericLevel = 1;
      else numericLevel = 5;
    }

    const inRange = numericLevel >= boundary.min && numericLevel <= boundary.max;
    const strongMisalign = numericLevel < boundary.min - 2 || numericLevel > boundary.max + 2;

    if (inRange) alignedCount++;
    if (strongMisalign) misalignedCount++;

    details.push({
      trait,
      persona_level: numericLevel,
      boundary_min: boundary.min,
      boundary_max: boundary.max,
      aligned: inRange,
      strong_misalignment: strongMisalign,
    });
  }

  // Score: 10 if all aligned, -2 per misalignment, -3 per strong misalignment
  let score = (alignedCount / traits.length) * 10;
  score -= misalignedCount * 3;
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    details: {
      aligned_traits: alignedCount,
      misaligned_traits: misalignedCount,
      total_traits: traits.length,
      per_trait: details,
    },
  };
}

// ─── Dimension 4: Question Quality ───────────────────

function scoreQuestionQuality(
  questionTags: QuestionTag[]
): { score: number; details: Record<string, unknown> } {
  const total = questionTags.filter(q => q.is_question).length;
  if (total === 0) return { score: 0, details: { note: 'No questions found' } };

  const counts: Record<string, number> = {
    exploratory: 0, confirmatory: 0, disconfirmatory: 0,
    motivational: 0, behavioral: 0, liberatory: 0,
    redundant: 0, leading: 0,
  };

  for (const tag of questionTags) {
    if (tag.is_question && counts[tag.question_type] !== undefined) {
      counts[tag.question_type]++;
    }
  }

  const disconfirmatoryRatio = counts.disconfirmatory / total;
  const motivationalRatio = counts.motivational / total;
  const liberatoryRatio = counts.liberatory / total;
  const leadingCount = counts.leading;

  // Targets: disconfirmatory >= 20%, motivational >= 30%, liberatory >= 10%
  let score = 5;
  if (disconfirmatoryRatio >= 0.2) score += 1.5;
  else if (disconfirmatoryRatio >= 0.1) score += 0.5;
  if (motivationalRatio >= 0.3) score += 1.5;
  else if (motivationalRatio >= 0.2) score += 0.5;
  if (liberatoryRatio >= 0.1) score += 1;
  if (leadingCount > 0) score -= leadingCount * 2; // Leading questions are critical
  if (counts.redundant > 2) score -= 1;
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    details: {
      total_questions: total,
      counts,
      disconfirmatory_ratio: disconfirmatoryRatio,
      motivational_ratio: motivationalRatio,
      liberatory_ratio: liberatoryRatio,
      leading_count: leadingCount,
    },
  };
}

// ─── Dimension 5: Confidence Calibration ─────────────

function scoreConfidenceCalibration(
  confidenceCurve: Array<{ exchange_number: number; top_type: number; confidence: number }>,
  wasCorrect: boolean
): { score: number; details: Record<string, unknown> } {
  if (confidenceCurve.length === 0) {
    return { score: 0, details: { note: 'No confidence data' } };
  }

  const finalConfidence = confidenceCurve[confidenceCurve.length - 1]?.confidence ?? 0;

  // Good calibration: high confidence when correct, low when incorrect
  let score: number;
  if (wasCorrect) {
    // Correct: reward high final confidence, penalize overconfidence early
    score = finalConfidence >= 0.75 ? 8 : finalConfidence >= 0.5 ? 6 : 4;

    // Check for premature high confidence (> 0.8 before exchange 4)
    const earlyHighConf = confidenceCurve.find(
      p => p.exchange_number <= 4 && p.confidence > 0.8
    );
    if (earlyHighConf) score -= 1;
  } else {
    // Incorrect: penalize high confidence, reward low confidence (shows awareness)
    if (finalConfidence >= 0.8) score = 1; // Very overconfident and wrong
    else if (finalConfidence >= 0.6) score = 3;
    else score = 5; // At least knew it was uncertain
  }

  // Check monotonicity — confidence should generally increase
  let monotonicViolations = 0;
  for (let i = 1; i < confidenceCurve.length; i++) {
    if (confidenceCurve[i].confidence < confidenceCurve[i - 1].confidence - 0.15) {
      monotonicViolations++;
    }
  }
  // Some non-monotonicity is fine (hypothesis revision), but frequent is bad
  if (monotonicViolations > 3) score -= 1;

  score = Math.max(0, Math.min(10, score));

  return {
    score,
    details: {
      final_confidence: finalConfidence,
      was_correct: wasCorrect,
      curve_length: confidenceCurve.length,
      monotonic_violations: monotonicViolations,
      confidence_curve: confidenceCurve,
    },
  };
}

// ─── Dimension 6: Harm Severity ──────────────────────

function scoreHarmSeverity(
  actualType: number,
  predictedType: number,
  healthLevel: number
): { score: number; details: Record<string, unknown> } {
  if (actualType === predictedType) {
    return { score: 10, details: { harm: 0, note: 'Correctly typed — no harm' } };
  }

  const rawHarm = getHarmSeverity(actualType, predictedType);

  // Health level amplifier: unhealthy personas (level >= 7) are more vulnerable
  let amplifier = 1.0;
  if (healthLevel >= 7) amplifier = 1.5;
  else if (healthLevel >= 5) amplifier = 1.2;

  const adjustedHarm = Math.min(10, rawHarm * amplifier);

  // Score is inverse of harm: high harm = low score
  const score = Math.max(0, 10 - adjustedHarm);

  return {
    score,
    details: {
      actual_type: actualType,
      predicted_type: predictedType,
      raw_harm: rawHarm,
      health_level: healthLevel,
      amplifier,
      adjusted_harm: adjustedHarm,
    },
  };
}

// ─── Dimension 7: Meta-Awareness ─────────────────────

function scoreMetaAwareness(
  transcript: TranscriptTurn[],
  confidenceCurve: Array<{ exchange_number: number; top_type: number; confidence: number }>
): { score: number; details: Record<string, unknown> } {
  let acknowledgesUncertainty = false;
  let presentsAlternatives = false;
  let forcedSingleAnswer = false;

  // Scan for low-confidence periods (< 0.5) and check if system acknowledges it
  const lowConfPoints = confidenceCurve.filter(p => p.confidence < 0.5);
  const highConfPoints = confidenceCurve.filter(p => p.confidence >= 0.75);

  for (const turn of transcript) {
    if (turn.role !== 'system') continue;
    const internal = turn.internal_block;
    if (!internal) continue;

    const hypothesis = internal.hypothesis as Record<string, unknown> | undefined;
    if (!hypothesis) continue;

    const confidence = (hypothesis.confidence as number) ?? 0;
    const needsDiff = hypothesis.needs_differentiation as number[] | undefined;

    // Check if system acknowledges uncertainty when confidence is low
    if (confidence < 0.5 && needsDiff && needsDiff.length > 0) {
      acknowledgesUncertainty = true;
    }

    // Check for alternatives being considered
    const typeScores = hypothesis.type_scores as Record<string, number> | undefined;
    if (typeScores) {
      const sorted = Object.entries(typeScores)
        .map(([t, s]) => ({ type: Number(t), score: s }))
        .sort((a, b) => b.score - a.score);
      if (sorted.length >= 2 && sorted[1].score > 0.3) {
        presentsAlternatives = true;
      }
    }

    // Check for forced single answer with low confidence
    const closeNext = (internal.conversation as Record<string, unknown>)?.close_next as boolean;
    if (closeNext && confidence < 0.6) {
      forcedSingleAnswer = true;
    }
  }

  let score = 5;
  if (acknowledgesUncertainty) score += 2;
  if (presentsAlternatives) score += 2;
  if (forcedSingleAnswer) score -= 3;
  if (lowConfPoints.length > 0 && !acknowledgesUncertainty) score -= 1;
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    details: {
      acknowledges_uncertainty: acknowledgesUncertainty,
      presents_alternatives: presentsAlternatives,
      forced_single_answer: forcedSingleAnswer,
      low_confidence_points: lowConfPoints.length,
      high_confidence_points: highConfPoints.length,
    },
  };
}

// ─── Dimension 8: Commandment Fidelity ───────────────

function scoreCommandmentFidelity(
  commandmentCheck: CommandmentCheckResult
): { score: number; details: Record<string, unknown> } {
  // Automatic 0 for any critical violation
  if (commandmentCheck.violations.some(v => v.severity === 'critical')) {
    return {
      score: 0,
      details: {
        auto_zero: true,
        reason: 'Critical commandment violation detected',
        violations: commandmentCheck.violations.filter(v => v.severity === 'critical'),
        original_score: commandmentCheck.score,
      },
    };
  }

  return {
    score: commandmentCheck.score,
    details: {
      auto_zero: false,
      score: commandmentCheck.score,
      total_checked: commandmentCheck.per_commandment
        ? Object.keys(commandmentCheck.per_commandment).length
        : 0,
      passed: commandmentCheck.approved_language_used?.length ?? 0,
      violations: commandmentCheck.violations,
      per_commandment: commandmentCheck.per_commandment,
      labeled_or_liberated: commandmentCheck.labeled_or_liberated,
    },
  };
}

// ─── Improvement Actions via Claude ──────────────────

async function generateImprovementActions(
  persona: Persona,
  simResult: SimulationResult,
  dimensionScores: Record<string, { score: number; details: Record<string, unknown> }>
): Promise<ImprovementAction[]> {
  const transcriptText = simResult.transcript
    .map(t => `[${t.turn}] ${t.role.toUpperCase()}: ${t.content}`)
    .join('\n\n');

  const scoresText = Object.entries(dimensionScores)
    .map(([name, d]) => `${name}: ${d.score}/10`)
    .join('\n');

  const prompt = `Analyze this Enneagram assessment transcript and generate 3-5 specific, actionable improvement actions.

PERSONA GROUND TRUTH: Type ${persona.spec.core_type}, Wing ${persona.spec.wing}, ${persona.spec.instinctual_variant}, Health Level ${persona.spec.health_level}

DIMENSION SCORES:
${scoresText}

TRANSCRIPT:
${transcriptText}

Return ONLY valid JSON (no markdown fences). Each action must include:
- priority: "critical" | "high" | "medium" | "low"
- category: e.g., "question_strategy", "type_differentiation", "confidence_calibration", "commandment_fidelity", "harm_reduction"
- action: specific enough to implement (2-3 sentences)
- evidence: cite specific exchange numbers and quotes from the transcript
- source_level: "L1" (prompt fix), "L2" (algorithm change), or "L3" (architecture change)
- commandment_alignment: which Defiant Spirit commandment this addresses, or null
- estimated_impact: brief description of expected improvement

Return format: [{ ...action }, ...]`;

  try {
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: 'You are an expert evaluation analyst for an Enneagram AI assessment system. Return only valid JSON arrays.',
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = result.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const actions: ImprovementAction[] = JSON.parse(stripCodeFences(rawText));
    return actions.slice(0, 5);
  } catch (err) {
    console.error('[evaluation-engine] Failed to generate improvement actions:', err);
    return [{
      priority: 'medium',
      category: 'meta',
      action: 'Improvement action generation failed — review transcript manually.',
      evidence: 'N/A',
      source_level: 'L1',
      commandment_alignment: null,
      estimated_impact: 'Unknown',
    }];
  }
}

// ─── Main Evaluation Function ────────────────────────

export async function evaluateRun(
  persona: Persona,
  simulationResult: SimulationResult,
  questionTags: QuestionTag[],
  commandmentCheck: CommandmentCheckResult
): Promise<EvaluationResult> {
  const confidenceCurve = extractConfidenceCurve(simulationResult.transcript);
  const typesConsidered = extractTypesConsidered(
    simulationResult.transcript,
    persona.spec.core_type
  );

  const finalInternal = simulationResult.final_internal;
  const hypothesis = finalInternal?.hypothesis as Record<string, unknown> | undefined;
  const predictedType = (hypothesis?.leading_type as number) ?? 0;
  const finalConfidence = (hypothesis?.confidence as number) ?? 0;
  const predictedWing = (hypothesis?.wing as string) ?? null;
  const isCorrect = predictedType === persona.spec.core_type;

  // Score all 8 dimensions
  const coreTypeAcc = scoreCoreTypeAccuracy(persona, simulationResult, typesConsidered);
  const subtypeAcc = scoreSubtypeAccuracy(persona, simulationResult);
  const convergentVal = scoreConvergentValidity(persona, predictedType);
  const questionQual = scoreQuestionQuality(questionTags);
  const confCalibration = scoreConfidenceCalibration(
    confidenceCurve.map(c => ({
      exchange_number: c.exchange_number,
      top_type: c.top_type,
      confidence: c.confidence,
    })),
    isCorrect
  );
  const harmSev = scoreHarmSeverity(
    persona.spec.core_type,
    predictedType,
    persona.spec.health_level
  );
  const metaAware = scoreMetaAwareness(simulationResult.transcript, confidenceCurve);
  const cmdFidelity = scoreCommandmentFidelity(commandmentCheck);

  // Generate improvement actions
  const dimensionScores: Record<string, { score: number; details: Record<string, unknown> }> = {
    core_type_accuracy: coreTypeAcc,
    subtype_accuracy: subtypeAcc,
    convergent_validity: convergentVal,
    question_quality: questionQual,
    confidence_calibration: confCalibration,
    harm_severity: harmSev,
    meta_awareness: metaAware,
    commandment_fidelity: cmdFidelity,
  };

  const improvementActions = await generateImprovementActions(
    persona,
    simulationResult,
    dimensionScores
  );

  // Calculate question quality counts for the result
  const qCounts: Record<string, number> = {
    exploratory: 0, confirmatory: 0, disconfirmatory: 0,
    motivational: 0, behavioral: 0, liberatory: 0,
    redundant: 0, leading: 0,
  };
  for (const tag of questionTags) {
    if (tag.is_question && qCounts[tag.question_type] !== undefined) {
      qCounts[tag.question_type]++;
    }
  }
  const totalQuestions = questionTags.filter(q => q.is_question).length;

  // Overall score: weighted average of dimensions
  const weights = {
    core_type_accuracy: 0.25,
    subtype_accuracy: 0.10,
    convergent_validity: 0.10,
    question_quality: 0.15,
    confidence_calibration: 0.10,
    harm_severity: 0.10,
    meta_awareness: 0.05,
    commandment_fidelity: 0.15,
  };

  let overallScore = 0;
  for (const [dim, weight] of Object.entries(weights)) {
    overallScore += (dimensionScores[dim]?.score ?? 0) * weight;
  }

  // Determine mistype severity
  let mistypeHarmSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
  if (!isCorrect) {
    const harm = getHarmSeverity(persona.spec.core_type, predictedType);
    if (harm >= 8) mistypeHarmSeverity = 'critical';
    else if (harm >= 6) mistypeHarmSeverity = 'high';
    else if (harm >= 4) mistypeHarmSeverity = 'medium';
    else mistypeHarmSeverity = 'low';
  }

  const result: EvaluationResult = {
    run_id: `eval-${persona.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tier: 'tier1',
    persona_id: persona.id,
    ground_truth: persona.spec,

    system_output: {
      final_type: predictedType,
      final_wing: predictedWing,
      final_confidence: finalConfidence,
      types_considered: typesConsidered,
    },

    accuracy: {
      core_type_correct: isCorrect,
      wing_correct: subtypeAcc.details.wing_result === 'not_assessed'
        ? null
        : subtypeAcc.details.wing_result === 'correct',
      instinctual_variant_correct: subtypeAcc.details.variant_result === 'not_assessed'
        ? null
        : subtypeAcc.details.variant_result === 'correct',
      mistype_as: isCorrect ? null : predictedType,
      mistype_harm_severity: mistypeHarmSeverity,
      big_five_aligned: convergentVal.score >= 6,
    },

    commandment_fidelity: {
      score: cmdFidelity.score,
      critical_violations: commandmentCheck.violations
        .filter(v => v.severity === 'critical')
        .map(v => v.commandment),
      per_commandment: commandmentCheck.per_commandment,
      labeled_or_liberated: commandmentCheck.labeled_or_liberated,
    },

    question_quality: {
      total_questions: totalQuestions,
      exploratory: qCounts.exploratory,
      confirmatory: qCounts.confirmatory,
      disconfirmatory: qCounts.disconfirmatory,
      motivational: qCounts.motivational,
      behavioral: qCounts.behavioral,
      liberatory: qCounts.liberatory,
      redundant: qCounts.redundant,
      leading: qCounts.leading,
    },

    efficiency: {
      total_exchanges: simulationResult.total_turns,
      correct_type_first_considered_at: typesConsidered.find(
        t => t.type === persona.spec.core_type
      )?.first_at_q ?? null,
      confidence_curve: confidenceCurve.map(c => ({
        exchange: c.exchange_number,
        top_type: c.top_type,
        confidence: c.confidence,
      })),
    },

    improvement_actions: improvementActions,
    transcript: simulationResult.transcript,
  };

  return result;
}
