// ─────────────────────────────────────────────────────────────────────────────
// evaluation/report-generator.ts
// Produces a human-readable Markdown report from a BatchSummary and
// individual EvaluationResults.
// ─────────────────────────────────────────────────────────────────────────────

import type { BatchSummary, EvaluationResult } from './types';

// ─── Helpers ─────────────────────────────────────────

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

function padLeft(str: string, len: number): string {
  return str.padStart(len);
}

const TYPE_NAMES: Record<number, string> = {
  1: 'Reformer',
  2: 'Helper',
  3: 'Achiever',
  4: 'Individualist',
  5: 'Investigator',
  6: 'Loyalist',
  7: 'Enthusiast',
  8: 'Challenger',
  9: 'Peacemaker',
};

// ─── Section Generators ──────────────────────────────

function generateHeadline(batch: BatchSummary): string {
  const h = batch.headline_metrics;
  const threshold = h.meets_75_threshold ? 'MEETS' : 'DOES NOT MEET';
  const lines = [
    `## Headline`,
    ``,
    `- **Overall accuracy:** ${pct(h.overall_accuracy)} — ${threshold} 75% threshold`,
    `- **Commandment Fidelity:** ${h.commandment_fidelity_avg.toFixed(1)}/10 average — ${h.commandment_critical_violations} critical violation(s)`,
    `- **Harm-weighted accuracy:** ${pct(h.harm_weighted_accuracy)}`,
    `- **Convergent validity alignment:** ${pct(h.convergent_validity_alignment)}`,
    `- **Confidence calibration ECE:** ${h.confidence_calibration_ece.toFixed(3)}`,
    `- **Liberated (not labeled) rate:** ${pct(h.labeled_or_liberated_rate)}`,
    ``,
  ];
  return lines.join('\n');
}

function generatePerTypeTable(batch: BatchSummary): string {
  const lines = [
    `## Per-Type Performance`,
    ``,
    `| Type | Name | Accuracy | N | 95% CI | Wing Acc | Variant Acc | CFS |`,
    `|------|------|----------|---|--------|----------|-------------|-----|`,
  ];

  for (let type = 1; type <= 9; type++) {
    const data = batch.per_type_accuracy[type];
    if (!data) continue;

    const ci = `[${pct(data.ci_95[0])}, ${pct(data.ci_95[1])}]`;
    lines.push(
      `| ${type} | ${pad(TYPE_NAMES[type] ?? '', 13)} | ${padLeft(pct(data.accuracy), 7)} | ${padLeft(String(data.n), 2)} | ${ci} | ${padLeft(pct(data.wing_accuracy), 7)} | ${padLeft(pct(data.instinctual_variant_accuracy), 7)} | ${data.commandment_fidelity_avg.toFixed(1)} |`
    );
  }

  lines.push('');
  return lines.join('\n');
}

function generateConfusionMatrix(batch: BatchSummary): string {
  const lines = [
    `## Confusion Matrix`,
    ``,
    `Rows = actual type, columns = predicted type.`,
    ``,
  ];

  // Header
  const header = `| Actual \\ Pred | ${Array.from({ length: 9 }, (_, i) => padLeft(String(i + 1), 3)).join(' | ')} |`;
  const separator = `|${'-'.repeat(15)}|${Array.from({ length: 9 }, () => '----').join('|')}|`;
  lines.push(header, separator);

  for (let actual = 0; actual < 9; actual++) {
    const row = batch.confusion_matrix[actual] ?? Array(9).fill(0);
    const cells = row.map((count: number, pred: number) => {
      const str = String(count);
      // Highlight diagonal (correct) and off-diagonal (errors)
      if (actual === pred && count > 0) return padLeft(`**${str}**`, 5);
      return padLeft(str, 3);
    });
    lines.push(`| Type ${actual + 1}        | ${cells.join(' | ')} |`);
  }

  lines.push('');
  return lines.join('\n');
}

function generateMistypes(batch: BatchSummary): string {
  if (batch.top_mistype_pairs.length === 0) {
    return `## Most Common Mistypes\n\nNo mistypes recorded.\n`;
  }

  const lines = [
    `## Most Common Mistypes`,
    ``,
    `| Rank | Actual | Predicted As | Count | Harm Severity |`,
    `|------|--------|-------------|-------|---------------|`,
  ];

  batch.top_mistype_pairs.forEach((pair, i) => {
    const actualName = TYPE_NAMES[pair.true_type] ?? String(pair.true_type);
    const predName = TYPE_NAMES[pair.mistyped_as] ?? String(pair.mistyped_as);
    lines.push(
      `| ${i + 1} | ${pair.true_type} (${actualName}) | ${pair.mistyped_as} (${predName}) | ${pair.count} | ${pair.harm_severity} |`
    );
  });

  lines.push('');
  return lines.join('\n');
}

function generateQuestionQuality(batch: BatchSummary): string {
  const q = batch.question_quality_aggregate;
  const lines = [
    `## Question Quality`,
    ``,
    `| Metric | Value | Target | Status |`,
    `|--------|-------|--------|--------|`,
    `| Disconfirmatory ratio | ${pct(q.avg_disconfirmatory_ratio)} | >= 20% | ${q.avg_disconfirmatory_ratio >= 0.2 ? 'PASS' : 'FAIL'} |`,
    `| Motivational ratio | ${pct(q.avg_motivational_ratio)} | >= 30% | ${q.avg_motivational_ratio >= 0.3 ? 'PASS' : 'FAIL'} |`,
    `| Liberatory ratio | ${pct(q.avg_liberatory_ratio)} | >= 10% | ${q.avg_liberatory_ratio >= 0.1 ? 'PASS' : 'FAIL'} |`,
    `| Leading questions | ${q.leading_question_incidents} | 0 | ${q.leading_question_incidents === 0 ? 'PASS' : 'FAIL'} |`,
    ``,
  ];
  return lines.join('\n');
}

function generateCommandmentFidelity(batch: BatchSummary): string {
  const c = batch.commandment_fidelity_aggregate;
  const lines = [
    `## Commandment Fidelity Detail`,
    ``,
    `**Average CFS:** ${c.average_cfs.toFixed(1)}/10`,
    ``,
  ];

  if (Object.keys(c.per_commandment_pass_rates).length > 0) {
    lines.push(`### Per-Commandment Pass Rates`, ``);
    lines.push(`| Commandment | Pass Rate |`);
    lines.push(`|-------------|-----------|`);

    const sorted = Object.entries(c.per_commandment_pass_rates)
      .sort(([, a], [, b]) => a - b);
    for (const [cmd, rate] of sorted) {
      lines.push(`| ${cmd} | ${pct(rate)} |`);
    }
    lines.push('');
  }

  if (c.weakest_commandments.length > 0) {
    lines.push(`### Weakest Commandments`);
    lines.push('');
    c.weakest_commandments.forEach((cmd, i) => {
      const rate = c.per_commandment_pass_rates[cmd];
      lines.push(`${i + 1}. **${cmd}** (${rate !== undefined ? pct(rate) : 'N/A'} pass rate)`);
    });
    lines.push('');
  }

  if (c.critical_violation_details.length > 0) {
    lines.push(`### Critical Violations`, ``);
    for (const detail of c.critical_violation_details) {
      lines.push(`- **Run ${detail.run_id}:** ${detail.violation}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generatePriorityFixes(batch: BatchSummary): string {
  if (batch.priority_fixes.length === 0) {
    return `## Top Priority Fixes\n\nNo fixes identified.\n`;
  }

  const lines = [
    `## Top Priority Fixes`,
    ``,
  ];

  batch.priority_fixes.forEach((fix, i) => {
    lines.push(`### ${i + 1}. [${fix.priority.toUpperCase()}] ${fix.category}`);
    lines.push('');
    lines.push(`**Action:** ${fix.action}`);
    lines.push('');
    lines.push(`**Evidence:** ${fix.evidence}`);
    lines.push('');
    lines.push(`**Level:** ${fix.source_level} | **Impact:** ${fix.estimated_impact}`);
    if (fix.commandment_alignment) {
      lines.push(`**Commandment:** ${fix.commandment_alignment}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

function generateReadinessAssessment(batch: BatchSummary): string {
  const h = batch.headline_metrics;

  const criteria: Array<{ name: string; pass: boolean; detail: string }> = [
    {
      name: 'Core accuracy >= 75%',
      pass: h.overall_accuracy >= 0.75,
      detail: pct(h.overall_accuracy),
    },
    {
      name: 'Harm-weighted accuracy >= 80%',
      pass: h.harm_weighted_accuracy >= 0.80,
      detail: pct(h.harm_weighted_accuracy),
    },
    {
      name: 'Commandment Fidelity >= 7/10',
      pass: h.commandment_fidelity_avg >= 7,
      detail: `${h.commandment_fidelity_avg.toFixed(1)}/10`,
    },
    {
      name: 'Zero critical violations',
      pass: h.commandment_critical_violations === 0,
      detail: `${h.commandment_critical_violations} violation(s)`,
    },
    {
      name: 'Calibration ECE <= 0.10',
      pass: h.confidence_calibration_ece <= 0.10,
      detail: h.confidence_calibration_ece.toFixed(3),
    },
    {
      name: 'Liberated rate >= 80%',
      pass: h.labeled_or_liberated_rate >= 0.80,
      detail: pct(h.labeled_or_liberated_rate),
    },
  ];

  const allPass = criteria.every(c => c.pass);

  const lines = [
    `## Readiness Assessment`,
    ``,
    `**Overall:** ${allPass ? 'GO' : 'NO-GO'}`,
    ``,
    `| Criterion | Status | Value |`,
    `|-----------|--------|-------|`,
  ];

  for (const c of criteria) {
    const status = c.pass ? 'PASS' : 'FAIL';
    lines.push(`| ${c.name} | ${status} | ${c.detail} |`);
  }

  lines.push('');

  if (!allPass) {
    const failing = criteria.filter(c => !c.pass);
    lines.push(`**Blocking issues (${failing.length}):**`);
    lines.push('');
    for (const f of failing) {
      lines.push(`- ${f.name}: currently ${f.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Main Report Generator ──────────────────────────

export function generateReport(
  batch: BatchSummary,
  results: EvaluationResult[]
): string {
  const dateStr = batch.timestamp
    ? new Date(batch.timestamp).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const sections = [
    `# Soulo Evaluation Report — ${batch.tier} — ${dateStr}`,
    ``,
    `> ${batch.total_runs} evaluation runs`,
    ``,
    generateHeadline(batch),
    generatePerTypeTable(batch),
    generateConfusionMatrix(batch),
    generateMistypes(batch),
    generateQuestionQuality(batch),
    generateCommandmentFidelity(batch),
    generatePriorityFixes(batch),
    generateReadinessAssessment(batch),
    `---`,
    ``,
    `*Generated by Soulo Evaluation System*`,
  ];

  return sections.join('\n');
}
