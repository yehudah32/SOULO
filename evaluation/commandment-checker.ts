// Soulo Evaluation System — Commandment Checker
// Scans system utterances for violations of the 10 Defiant Spirit Commandments

import { COMMANDMENT_RULES, checkTextForViolations, checkTextForApprovedLanguage, calculateCFS } from './data/commandment-rules';
import type { TranscriptTurn, CommandmentCheckResult, CommandmentViolation } from './types';

/**
 * Check all system utterances in a transcript against the Defiant Spirit Commandments.
 * Combines automated pattern matching with content presence checks.
 */
export function checkCommandments(transcript: TranscriptTurn[]): CommandmentCheckResult {
  const violations: CommandmentViolation[] = [];
  const approvedUsed = new Set<string>();
  let hasCriticalViolation = false;

  const systemTurns = transcript.filter(t => t.role === 'system');

  // ── STEP 1: Check each system turn for violations and approved language ──
  for (const turn of systemTurns) {
    const turnViolations = checkTextForViolations(turn.content);
    for (const v of turnViolations) {
      violations.push({
        pattern: v.description,
        severity: v.severity,
        commandment: 'I', // Most violations are Commandment I
        turn: turn.turn,
      });
      if (v.severity === 'critical') hasCriticalViolation = true;
    }

    const approved = checkTextForApprovedLanguage(turn.content);
    for (const a of approved) approvedUsed.add(a);
  }

  // ── STEP 2: Per-commandment assessment ──
  const allContent = systemTurns.map(t => t.content).join('\n\n');
  const perCommandment: Record<string, 'pass' | 'partial' | 'fail'> = {};

  for (const rule of COMMANDMENT_RULES) {
    // Check violations for this commandment
    const ruleViolations = rule.violation_patterns.filter(p => p.pattern.test(allContent));
    const ruleApproved = rule.approved_patterns.filter(p => p.pattern.test(allContent));

    if (ruleViolations.some(v => v.severity === 'critical')) {
      perCommandment[rule.id] = 'fail';
    } else if (ruleViolations.length > 0 && ruleApproved.length === 0) {
      perCommandment[rule.id] = 'fail';
    } else if (ruleViolations.length > 0) {
      perCommandment[rule.id] = 'partial';
    } else if (ruleApproved.length > 0) {
      perCommandment[rule.id] = 'pass';
    } else {
      // No violations, no approved language found — partial if results exist
      perCommandment[rule.id] = 'partial';
    }
  }

  // Special handling: Commandment I is automatic fail if any critical violation
  if (hasCriticalViolation) {
    perCommandment['I'] = 'fail';
  }

  // ── STEP 3: Calculate CFS ──
  const score = calculateCFS(perCommandment, hasCriticalViolation);

  // ── STEP 4: Holistic arc assessment ──
  const liberatorySignals = [
    /choice/i, /choose/i, /freedom/i, /liberat/i, /transcend/i,
    /space between/i, /response.?ability/i, /defiant spirit/i,
    /survival strategy/i, /you built/i, /not who you are/i,
  ].filter(r => r.test(allContent)).length;

  const labelingSignals = [
    /you are a type/i, /your type is/i, /as a \d/i, /you will always/i,
    /you're wired/i, /can't help/i, /personality type/i,
  ].filter(r => r.test(allContent)).length;

  let labeledOrLiberated: 'liberated' | 'mixed' | 'labeled';
  if (hasCriticalViolation || labelingSignals > liberatorySignals) {
    labeledOrLiberated = 'labeled';
  } else if (liberatorySignals > 3 && labelingSignals === 0) {
    labeledOrLiberated = 'liberated';
  } else {
    labeledOrLiberated = 'mixed';
  }

  return {
    violations,
    approved_language_used: Array.from(approvedUsed),
    per_commandment: perCommandment,
    score,
    labeled_or_liberated: labeledOrLiberated,
  };
}
