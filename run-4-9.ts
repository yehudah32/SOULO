import fs from 'fs';
import path from 'path';
import { runSimulation } from './evaluation/simulation-runner';
import { tagQuestions } from './evaluation/question-tagger';
import { checkCommandments } from './evaluation/commandment-checker';
import { evaluateRun } from './evaluation/evaluation-engine';
import { aggregateBatch } from './evaluation/batch-aggregator';
import { generateReport } from './evaluation/report-generator';
import type { Persona, EvaluationResult } from './evaluation/types';

const PERSONAS_DIR = 'evaluation/personas';
const RESULTS_DIR = 'evaluation/results';
const REPORTS_DIR = 'evaluation/reports';

const targetFiles = [
  'persona-4-SP-1775495370224.json',
  'persona-5-SO-1775495394788.json',
  'persona-6-SX-1775495424496.json',
  'persona-7-SP-1775495449606.json',
  'persona-8-SO-1775495474480.json',
  'persona-9-SX-1775495506212.json',
];

async function main() {
  console.log('Running evaluation for Types 4-9 only\n');
  const results: EvaluationResult[] = [];

  for (let i = 0; i < targetFiles.length; i++) {
    const filePath = path.join(PERSONAS_DIR, targetFiles[i]);
    const persona: Persona = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[${i+1}/${targetFiles.length}] Type ${persona.spec.core_type} ${persona.spec.instinctual_variant}`);

    console.log('  📝 Running simulation...');
    const simResult = await runSimulation(persona);
    console.log(`  ✅ Simulation: ${simResult.total_turns} turns, status: ${simResult.status}`);

    console.log('  🏷️  Tagging questions...');
    const tags = await tagQuestions(simResult.transcript);

    console.log('  📜 Checking commandments...');
    const cmdCheck = checkCommandments(simResult.transcript);
    console.log(`  ✅ CFS: ${cmdCheck.score}/10`);

    console.log('  📊 Evaluating...');
    const evalResult = await evaluateRun(persona, simResult, tags, cmdCheck);

    const correct = evalResult.accuracy.core_type_correct ? '✅' : '❌';
    console.log(`  ${correct} Type ${persona.spec.core_type} -> predicted ${evalResult.system_output.final_type}`);

    const resultFile = `eval-${persona.id}-${Date.now()}.json`;
    fs.writeFileSync(path.join(RESULTS_DIR, resultFile), JSON.stringify(evalResult, null, 2));
    console.log(`  💾 Saved: ${resultFile}\n`);
    results.push(evalResult);
  }

  // Also load the Types 1-3 results from earlier in this batch
  console.log('Loading Types 1-3 results from earlier...');
  const batchStart = 1775495291522;
  const allFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
  for (const file of allFiles) {
    const r: EvaluationResult = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8'));
    const ts = new Date(r.timestamp).getTime();
    if (ts >= batchStart && !results.some(x => x.run_id === r.run_id)) {
      results.push(r);
    }
  }

  console.log(`\n📊 Generating report from ${results.length} results (this batch only)\n`);
  const batch = aggregateBatch(results);
  const report = generateReport(batch, results);

  const reportPath = path.join(REPORTS_DIR, `report-batch7-${Date.now()}.md`);
  const summaryPath = path.join(REPORTS_DIR, `summary-batch7-${Date.now()}.json`);
  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(summaryPath, JSON.stringify(batch, null, 2));
  console.log(`✅ Report: ${reportPath}`);

  console.log('\n--- HEADLINE ---');
  console.log(`Overall accuracy: ${(batch.headline_metrics.overall_accuracy * 100).toFixed(1)}%`);
  console.log(`CFS: ${batch.headline_metrics.commandment_fidelity_avg.toFixed(1)}/10`);
  console.log(`Harm-weighted: ${(batch.headline_metrics.harm_weighted_accuracy * 100).toFixed(1)}%`);
}

main().catch(console.error);
