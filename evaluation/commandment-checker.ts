// Soulo Evaluation System — Commandment Checker
// Scans system utterances for violations of the 10 Defiant Spirit Commandments

import { COMMANDMENT_RULES, checkTextForViolations, checkTextForApprovedLanguage, calculateCFS } from './data/commandment-rules';
import type { TranscriptTurn, CommandmentCheckResult, CommandmentViolation } from './types';

export function checkCommandments(transcript: TranscriptTurn[]): CommandmentCheckResult {
  const violations: CommandmentViolation[] = [];
  const approvedUsed = new Set<string>();
  let hasCriticalViolation = false;
  let criticalCount = 0;
  let warningCount = 0;

  const systemTurns = transcript.filter(t => t.role === 'system');

  // ── STEP 1: Check each system turn for violations and approved language ──
  for (const turn of systemTurns) {
    const turnViolations = checkTextForViolations(turn.content, turn.turn);
    for (const v of turnViolations) {
      violations.push({
        pattern: v.pattern,
        severity: v.severity,
        commandment: v.commandment,
        turn: v.turn,
      });
      if (v.severity === 'critical') {
        hasCriticalViolation = true;
        criticalCount++;
      } else {
        warningCount++;
      }
    }

    const approved = checkTextForApprovedLanguage(turn.content);
    for (const a of approved) approvedUsed.add(a);
  }

  // ── STEP 2: Per-commandment assessment ──
  const allContent = systemTurns.map(t => t.content).join('\n\n');
  const perCommandment: Record<string, 'pass' | 'partial' | 'fail'> = {};

  for (const rule of COMMANDMENT_RULES) {
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
      // No pattern violations AND no approved language found.
      // For commandments that require PRESENCE of certain language (not just absence
      // of violations), this is 'partial' — the commandment isn't violated but
      // also isn't actively fulfilled.
      perCommandment[rule.id] = 'partial';
    }
  }

  if (hasCriticalViolation) {
    perCommandment['I'] = 'fail'; // Commandment I: You Are Not a Number
  }

  // ── STEP 2B: Content quality checks ──
  // The closing is designed to be human and emotional (mirror, tension, forward),
  // NOT a philosophical keyword checklist. These checks look for the SPIRIT of
  // each commandment, not specific phrases.

  // V: Points toward more than just the dominant pattern (wholeness/possibility)
  // Check for forward-facing language about possibility, growth, or "more"
  const hasForwardDirection = /\bmore\b.*\bavailable|available\b.*\bmore\b/i.test(allContent) ||
    /\bnot (?:all|everything|the whole)\b/i.test(allContent) ||
    /\bbeyond|bigger than|more than\b/i.test(allContent) ||
    /\ball nine\b/i.test(allContent) || /\bwholeness\b/i.test(allContent);
  if (!hasForwardDirection) {
    if (perCommandment['V'] === 'pass') perCommandment['V'] = 'partial';
  }

  // VII: Uses the reaction/response frame at least once (during assessment, not just closing)
  // Check for any pairing of automatic/chosen, unconscious/conscious, or reaction/response
  const hasReactResponseLens = /\breact(?:ion)?\b/i.test(allContent) ||
    /\bautomatic\b/i.test(allContent) ||
    /\bunconscious/i.test(allContent) ||
    /\bkicks in before you choose\b/i.test(allContent) ||
    /\bthe (?:version|thing) that runs on\b/i.test(allContent);
  if (!hasReactResponseLens) {
    if (perCommandment['VII'] === 'pass') perCommandment['VII'] = 'partial';
  }

  // VIII: Shows tension between two sides of the same energy (wound/gift unity)
  // Check for "same thing" / "same energy" / tension language, not just the words wound/gift
  const hasTension = /\bsame (?:thing|energy|force)\b/i.test(allContent) ||
    /\bwon't let you\b/i.test(allContent) ||
    /\bboth (?:the|a)\b/i.test(allContent) ||
    /\bwound.{0,20}gift|gift.{0,20}wound/i.test(allContent) ||
    /\bsuperpower.{0,20}kryptonite|kryptonite.{0,20}superpower/i.test(allContent) ||
    /\bshadow.{0,20}(?:gift|light|strength)/i.test(allContent);
  if (!hasTension) {
    if (perCommandment['VIII'] !== 'fail') perCommandment['VIII'] = 'partial';
  }

  // IX: Points toward something aspirational (not just diagnostic)
  // Check for forward-looking or possibility language, not just "calling" keyword
  const hasAspirational = /\bcalling\b/i.test(allContent) ||
    /\byour why\b/i.test(allContent) ||
    /\bpointing (?:you )?toward/i.test(allContent) ||
    /\bmore available\b/i.test(allContent) ||
    /\bchoose|chosen\b/i.test(allContent) ||
    /\bfreedom\b/i.test(allContent);
  if (!hasAspirational) {
    if (perCommandment['IX'] === 'pass') perCommandment['IX'] = 'partial';
  }

  // X: Frames the experience as liberating, not classifying
  // Check for language about possibility, choice, discovery — not just "liberation" keyword
  const hasLiberatoryFrame = /\bliberat/i.test(allContent) ||
    /\bnot a label\b/i.test(allContent) ||
    /\bmore (?:than|available)\b/i.test(allContent) ||
    /\bpattern.{0,20}running the show\b/i.test(allContent) ||
    /\bchoose\b/i.test(allContent) ||
    /\bdiscover/i.test(allContent);
  if (!hasLiberatoryFrame) {
    if (perCommandment['X'] === 'pass') perCommandment['X'] = 'partial';
  }

  // ── STEP 3: Calculate CFS ──
  const score = calculateCFS(systemTurns.length, criticalCount, warningCount, approvedUsed.size);

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
