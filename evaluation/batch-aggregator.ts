// ─────────────────────────────────────────────────────────────────────────────
// evaluation/batch-aggregator.ts
// Aggregates per-run EvaluationResults into a BatchSummary with statistical
// measures including Wilson CIs, confusion matrices, and ECE calibration.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EvaluationResult,
  BatchSummary,
  PerTypeAccuracy,
  MistypePair,
  ImprovementAction,
} from './types';

// ─── Wilson Score Confidence Interval ────────────────

function wilsonCI(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];

  const pHat = successes / n;
  const denominator = 1 + (z * z) / n;
  const center = (pHat + (z * z) / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((pHat * (1 - pHat) + (z * z) / (4 * n)) / n)) / denominator;

  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin),
  ];
}

// ─── Confusion Matrix Builder ────────────────────────

function buildConfusionMatrix(results: EvaluationResult[]): number[][] {
  // 9x9 matrix, rows = actual (1-9), cols = predicted (1-9)
  const matrix: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  for (const r of results) {
    const actual = r.ground_truth.core_type;
    const predicted = r.system_output.final_type;
    if (actual >= 1 && actual <= 9 && predicted >= 1 && predicted <= 9) {
      matrix[actual - 1][predicted - 1]++;
    }
  }

  return matrix;
}

// ─── Top Mistype Pairs ──────────────────────────────

function findTopMistypePairs(
  confusionMatrix: number[][],
  topN = 5
): MistypePair[] {
  const pairs: MistypePair[] = [];

  // Harm severity lookup (mirrors evaluation-engine.ts)
  const HARM_LOOKUP: Record<string, string> = {
    '1->7': 'critical', '8->5': 'high', '9->6': 'high',
    '2->8': 'high', '4->9': 'high', '4->6': 'high', '6->4': 'high',
    '8->6': 'high', '6->8': 'high', '2->9': 'high',
    '1->9': 'medium', '9->1': 'medium', '3->4': 'medium', '4->3': 'medium',
    '6->7': 'medium', '7->6': 'medium', '5->9': 'medium',
    '1->6': 'medium', '6->1': 'medium', '4->1': 'medium',
    '3->7': 'medium', '7->3': 'medium', '8->3': 'medium', '3->8': 'medium',
  };

  for (let actual = 0; actual < 9; actual++) {
    for (let predicted = 0; predicted < 9; predicted++) {
      if (actual === predicted) continue;
      const count = confusionMatrix[actual][predicted];
      if (count === 0) continue;

      const key = `${actual + 1}->${predicted + 1}`;
      const severity = HARM_LOOKUP[key] ?? 'low';

      pairs.push({
        true_type: actual + 1,
        mistyped_as: predicted + 1,
        count,
        harm_severity: severity,
      });
    }
  }

  return pairs
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

// ─── Per-Type Accuracy ──────────────────────────────

function computePerTypeAccuracy(
  results: EvaluationResult[]
): Record<number, PerTypeAccuracy> {
  const perType: Record<number, PerTypeAccuracy> = {};

  for (let type = 1; type <= 9; type++) {
    const typeResults = results.filter(r => r.ground_truth.core_type === type);
    const n = typeResults.length;

    if (n === 0) {
      perType[type] = {
        accuracy: 0,
        n: 0,
        ci_95: [0, 0],
        wing_accuracy: 0,
        instinctual_variant_accuracy: 0,
        countertype_accuracy: null,
        commandment_fidelity_avg: 0,
      };
      continue;
    }

    const correct = typeResults.filter(r => r.accuracy.core_type_correct).length;
    const accuracy = correct / n;
    const ci = wilsonCI(correct, n);

    // Wing accuracy: only among those assessed
    const wingAssessed = typeResults.filter(r => r.accuracy.wing_correct !== null);
    const wingCorrect = wingAssessed.filter(r => r.accuracy.wing_correct === true).length;
    const wingAcc = wingAssessed.length > 0 ? wingCorrect / wingAssessed.length : 0;

    // Variant accuracy: only among those assessed
    const varAssessed = typeResults.filter(r => r.accuracy.instinctual_variant_correct !== null);
    const varCorrect = varAssessed.filter(r => r.accuracy.instinctual_variant_correct === true).length;
    const varAcc = varAssessed.length > 0 ? varCorrect / varAssessed.length : 0;

    // Countertype accuracy: check if persona is countertype
    const countertypeResults = typeResults.filter(r => r.ground_truth.countertype);
    let countertypeAcc: number | null = null;
    if (countertypeResults.length > 0) {
      const ctCorrect = countertypeResults.filter(r => r.accuracy.core_type_correct).length;
      countertypeAcc = ctCorrect / countertypeResults.length;
    }

    // Commandment fidelity average
    const cfsSum = typeResults.reduce((acc, r) => acc + r.commandment_fidelity.score, 0);

    perType[type] = {
      accuracy,
      n,
      ci_95: ci,
      wing_accuracy: wingAcc,
      instinctual_variant_accuracy: varAcc,
      countertype_accuracy: countertypeAcc,
      commandment_fidelity_avg: cfsSum / n,
    };
  }

  return perType;
}

// ─── Commandment Fidelity Aggregation ────────────────

function aggregateCommandmentFidelity(results: EvaluationResult[]): {
  average_cfs: number;
  per_commandment_pass_rates: Record<string, number>;
  weakest_commandments: string[];
  critical_violation_details: Array<{ run_id: string; violation: string }>;
} {
  if (results.length === 0) {
    return {
      average_cfs: 0,
      per_commandment_pass_rates: {},
      weakest_commandments: [],
      critical_violation_details: [],
    };
  }

  // Average CFS
  const totalCfs = results.reduce((s, r) => s + r.commandment_fidelity.score, 0);
  const averageCfs = totalCfs / results.length;

  // Per-commandment pass rates
  const commandmentCounts: Record<string, { pass: number; total: number }> = {};
  for (const r of results) {
    if (!r.commandment_fidelity.per_commandment) continue;
    for (const [cmd, status] of Object.entries(r.commandment_fidelity.per_commandment)) {
      if (!commandmentCounts[cmd]) {
        commandmentCounts[cmd] = { pass: 0, total: 0 };
      }
      commandmentCounts[cmd].total++;
      if (status === 'pass') {
        commandmentCounts[cmd].pass++;
      }
    }
  }

  const passRates: Record<string, number> = {};
  for (const [cmd, counts] of Object.entries(commandmentCounts)) {
    passRates[cmd] = counts.total > 0 ? counts.pass / counts.total : 0;
  }

  // Weakest 3 commandments
  const weakest = Object.entries(passRates)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([cmd]) => cmd);

  // Critical violations
  const criticalDetails: Array<{ run_id: string; violation: string }> = [];
  for (const r of results) {
    for (const v of r.commandment_fidelity.critical_violations) {
      criticalDetails.push({ run_id: r.run_id, violation: v });
    }
  }

  return {
    average_cfs: averageCfs,
    per_commandment_pass_rates: passRates,
    weakest_commandments: weakest,
    critical_violation_details: criticalDetails,
  };
}

// ─── Confidence Calibration ECE ─────────────────────

function computeCalibrationECE(
  results: EvaluationResult[]
): {
  ece: number;
  bins: Array<{
    bin_lower: number;
    bin_upper: number;
    mean_confidence: number;
    actual_accuracy: number;
    count: number;
  }>;
} {
  // Bin final confidence scores into 10% buckets
  const bins: Array<{
    bin_lower: number;
    bin_upper: number;
    confidences: number[];
    correct: number;
    total: number;
  }> = [];

  for (let i = 0; i < 10; i++) {
    bins.push({
      bin_lower: i * 0.1,
      bin_upper: (i + 1) * 0.1,
      confidences: [],
      correct: 0,
      total: 0,
    });
  }

  for (const r of results) {
    const finalConf = r.system_output.final_confidence;
    const binIdx = Math.min(9, Math.floor(finalConf * 10));
    bins[binIdx].confidences.push(finalConf);
    bins[binIdx].total++;
    if (r.accuracy.core_type_correct) {
      bins[binIdx].correct++;
    }
  }

  // ECE = sum over bins of (count/total) * |mean_confidence - actual_accuracy|
  const totalSamples = results.length;
  let ece = 0;

  const outputBins = bins.map(bin => {
    const meanConf = bin.confidences.length > 0
      ? bin.confidences.reduce((a, b) => a + b, 0) / bin.confidences.length
      : (bin.bin_lower + bin.bin_upper) / 2;
    const actualAcc = bin.total > 0 ? bin.correct / bin.total : 0;

    if (bin.total > 0 && totalSamples > 0) {
      ece += (bin.total / totalSamples) * Math.abs(meanConf - actualAcc);
    }

    return {
      bin_lower: bin.bin_lower,
      bin_upper: bin.bin_upper,
      mean_confidence: meanConf,
      actual_accuracy: actualAcc,
      count: bin.total,
    };
  });

  return { ece, bins: outputBins };
}

// ─── Question Quality Aggregation ────────────────────

function aggregateQuestionQuality(results: EvaluationResult[]): {
  avg_disconfirmatory_ratio: number;
  avg_motivational_ratio: number;
  avg_liberatory_ratio: number;
  leading_question_incidents: number;
} {
  if (results.length === 0) {
    return {
      avg_disconfirmatory_ratio: 0,
      avg_motivational_ratio: 0,
      avg_liberatory_ratio: 0,
      leading_question_incidents: 0,
    };
  }

  let totalDisRatio = 0;
  let totalMotRatio = 0;
  let totalLibRatio = 0;
  let totalLeading = 0;

  for (const r of results) {
    const total = r.question_quality.total_questions;
    if (total > 0) {
      totalDisRatio += r.question_quality.disconfirmatory / total;
      totalMotRatio += r.question_quality.motivational / total;
      totalLibRatio += r.question_quality.liberatory / total;
    }
    totalLeading += r.question_quality.leading;
  }

  return {
    avg_disconfirmatory_ratio: totalDisRatio / results.length,
    avg_motivational_ratio: totalMotRatio / results.length,
    avg_liberatory_ratio: totalLibRatio / results.length,
    leading_question_incidents: totalLeading,
  };
}

// ─── Priority Fixes Aggregation ─────────────────────

function aggregatePriorityFixes(
  results: EvaluationResult[],
  topN = 10
): ImprovementAction[] {
  // Collect all improvement actions and deduplicate by category+action similarity
  const actionBuckets = new Map<string, {
    action: ImprovementAction;
    frequency: number;
    evidenceSamples: string[];
  }>();

  for (const r of results) {
    for (const action of r.improvement_actions) {
      // Use category as the bucket key for deduplication
      const key = `${action.category}::${action.action.substring(0, 60)}`;

      const existing = actionBuckets.get(key);
      if (existing) {
        existing.frequency++;
        if (existing.evidenceSamples.length < 3) {
          existing.evidenceSamples.push(action.evidence);
        }
      } else {
        actionBuckets.set(key, {
          action,
          frequency: 1,
          evidenceSamples: [action.evidence],
        });
      }
    }
  }

  // Rank by frequency x severity
  const severityMultiplier: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const ranked = Array.from(actionBuckets.values())
    .map(bucket => ({
      ...bucket.action,
      evidence: bucket.evidenceSamples.join(' | '),
      estimated_impact: `Frequency: ${bucket.frequency}/${results.length} runs. ${bucket.action.estimated_impact}`,
      _sortScore: bucket.frequency * (severityMultiplier[bucket.action.priority] ?? 1),
    }))
    .sort((a, b) => b._sortScore - a._sortScore)
    .slice(0, topN);

  // Strip internal sort score
  return ranked.map(({ _sortScore, ...rest }) => rest);
}

// ─── Harm-Weighted Accuracy ─────────────────────────

function computeHarmWeightedAccuracy(results: EvaluationResult[]): number {
  if (results.length === 0) return 0;

  // Weight each run: correct = 1, incorrect = 1 - (harm_severity_fraction)
  const harmWeights: Record<string, number> = {
    none: 1.0,
    low: 0.8,
    medium: 0.5,
    high: 0.2,
    critical: 0.0,
  };

  let totalWeight = 0;
  for (const r of results) {
    const severity = r.accuracy.mistype_harm_severity;
    totalWeight += harmWeights[severity] ?? 0.5;
  }

  return totalWeight / results.length;
}

// ─── Main Aggregation Function ──────────────────────

export function aggregateBatch(results: EvaluationResult[]): BatchSummary {
  const totalRuns = results.length;

  // Overall accuracy
  const correct = results.filter(r => r.accuracy.core_type_correct).length;
  const overallAccuracy = totalRuns > 0 ? correct / totalRuns : 0;
  const [ciLower, ciUpper] = wilsonCI(correct, totalRuns);

  // Per-type accuracy
  const perTypeAcc = computePerTypeAccuracy(results);

  // Confusion matrix
  const confusionMatrix = buildConfusionMatrix(results);

  // Top mistype pairs
  const topMistypePairs = findTopMistypePairs(confusionMatrix);

  // Question quality
  const questionQuality = aggregateQuestionQuality(results);

  // Commandment fidelity
  const commandmentFidelity = aggregateCommandmentFidelity(results);

  // Calibration
  const { ece: calibrationEce } = computeCalibrationECE(results);

  // Harm-weighted accuracy
  const harmWeightedAccuracy = computeHarmWeightedAccuracy(results);

  // Priority fixes
  const priorityFixes = aggregatePriorityFixes(results);

  // Labeled or liberated rate
  const liberatedCount = results.filter(
    r => r.commandment_fidelity.labeled_or_liberated === 'liberated'
  ).length;

  const batchSummary: BatchSummary = {
    batch_id: `batch-${Date.now()}`,
    tier: results[0]?.tier ?? 'tier1',
    total_runs: totalRuns,
    timestamp: new Date().toISOString(),

    headline_metrics: {
      overall_accuracy: overallAccuracy,
      meets_75_threshold: overallAccuracy >= 0.75,
      convergent_validity_alignment: results.length > 0
        ? results.filter(r => r.accuracy.big_five_aligned).length / results.length
        : 0,
      harm_weighted_accuracy: harmWeightedAccuracy,
      confidence_calibration_ece: calibrationEce,
      commandment_fidelity_avg: commandmentFidelity.average_cfs,
      commandment_critical_violations: commandmentFidelity.critical_violation_details.length,
      labeled_or_liberated_rate: totalRuns > 0 ? liberatedCount / totalRuns : 0,
    },

    per_type_accuracy: perTypeAcc,
    confusion_matrix: confusionMatrix,
    top_mistype_pairs: topMistypePairs,

    question_quality_aggregate: questionQuality,

    commandment_fidelity_aggregate: commandmentFidelity,

    priority_fixes: priorityFixes,
  };

  return batchSummary;
}
