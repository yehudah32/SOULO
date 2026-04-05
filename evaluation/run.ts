#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────────────────────
// evaluation/run.ts
// CLI entry point for the Soulo Enneagram evaluation pipeline.
//
// Usage:
//   npx tsx evaluation/run.ts generate --count 9
//   npx tsx evaluation/run.ts gate
//   npx tsx evaluation/run.ts evaluate
//   npx tsx evaluation/run.ts report
//   npx tsx evaluation/run.ts full --count 9
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { parseAIResponse } from '../lib/parse-response';
import { evaluateRun } from './evaluation-engine';
import { aggregateBatch } from './batch-aggregator';
import { generateReport } from './report-generator';
import type {
  Persona,
  PersonaSpec,
  TranscriptTurn,
  SimulationResult,
  QuestionTag,
  CommandmentCheckResult,
  CommandmentViolation,
  EvaluationResult,
  FidelityResult,
} from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

const BASE_DIR = path.resolve(__dirname);
const PERSONAS_DIR = path.join(BASE_DIR, 'personas');
const RESULTS_DIR = path.join(BASE_DIR, 'results');
const REPORTS_DIR = path.join(BASE_DIR, 'reports');

// ─── Ensure directories exist ────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Helpers ─────────────────────────────────────────

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

function randomAge(): number {
  return Math.floor(Math.random() * (65 - 22 + 1)) + 22;
}

function getWing(type: number, variant: 'left' | 'right' = 'left'): string {
  const leftWing = type === 1 ? 9 : type - 1;
  const rightWing = type === 9 ? 1 : type + 1;
  const wing = variant === 'left' ? leftWing : rightWing;
  return `${type}w${wing}`;
}

const INSTINCTUAL_VARIANTS: Array<'SP' | 'SO' | 'SX'> = ['SP', 'SO', 'SX'];

// ─── 1. Persona Generation ──────────────────────────

async function generatePersona(spec: PersonaSpec): Promise<Persona> {
  const prompt = `Generate a detailed persona for an Enneagram assessment simulation.

TYPE SPECIFICATION:
- Core Type: ${spec.core_type}
- Wing: ${spec.wing}
- Instinctual Variant: ${spec.instinctual_variant}
- Health Level: ${spec.health_level} (1=healthiest, 9=unhealthiest)
- Age: ${spec.age}
- Communication Style: ${spec.communication_style}
- Defensiveness: ${spec.defensiveness}
- Cultural Communication: ${spec.cultural_comm_style}

Generate a JSON object with these fields:
{
  "backstory": "3-5 sentences describing this person's life situation, job, relationships, and inner world. Make it vivid and specific — not generic.",
  "voice_profile": "2-3 sentences describing how this person talks: vocabulary, sentence length, emotional expressiveness, humor usage.",
  "behavioral_rules": "3-5 rules for how this persona should respond in the assessment. Include: how open they are, what they avoid discussing, what triggers defensiveness, how quickly they warm up.",
  "hidden_signals": ["list of 4-6 subtle behavioral signals that should emerge naturally — not stated directly but expressed through word choice, avoidance patterns, emotional energy"],
  "mistype_traps": ["list of 2-3 ways this persona might be mistyped, e.g., 'Could appear as Type 3 due to achievement language from SO variant'"],
  "big_five_expected": {
    "O": "high/medium/low",
    "C": "high/medium/low",
    "E": "high/medium/low",
    "A": "high/medium/low",
    "N": "high/medium/low"
  }
}

The persona must be psychologically coherent for a Type ${spec.core_type}w${spec.wing.toString().includes('w') ? spec.wing.toString().split('w')[1] : spec.wing} ${spec.instinctual_variant} at health level ${spec.health_level}.

Return ONLY valid JSON, no markdown fences.`;

  const result = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: 'You are an expert Enneagram psychologist creating detailed assessment personas. Return only valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = result.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const parsed = JSON.parse(stripCodeFences(rawText)) as {
    backstory: string;
    voice_profile: string;
    behavioral_rules: string;
    hidden_signals: string[];
    mistype_traps: string[];
    big_five_expected: { O: string; C: string; E: string; A: string; N: string };
  };

  const persona: Persona = {
    id: `persona-${spec.core_type}-${spec.instinctual_variant}-${Date.now()}`,
    spec,
    backstory: parsed.backstory,
    voice_profile: parsed.voice_profile,
    behavioral_rules: parsed.behavioral_rules,
    hidden_signals: parsed.hidden_signals,
    mistype_traps: parsed.mistype_traps,
    big_five_expected: parsed.big_five_expected,
    fidelity_score: null,
  };

  return persona;
}

async function runGenerate(count: number, tier: string): Promise<void> {
  ensureDir(PERSONAS_DIR);

  console.log(`\n🎭 Generating ${count} persona(s) for tier: ${tier}\n`);

  const specs: PersonaSpec[] = [];

  if (tier === 'calibration') {
    // 27 personas: 1 per subtype (9 types x 3 variants)
    for (let type = 1; type <= 9; type++) {
      for (const variant of INSTINCTUAL_VARIANTS) {
        specs.push({
          core_type: type,
          wing: getWing(type, Math.random() > 0.5 ? 'left' : 'right'),
          instinctual_variant: variant,
          tritype: [type, ((type + 2) % 9) + 1, ((type + 5) % 9) + 1],
          health_level: 5,
          countertype: false,
          communication_style: 'moderate',
          self_awareness: 'medium',
          defensiveness: 'moderate',
          social_desirability_bias: 'medium',
          rapport_trajectory: 'consistent',
          age: randomAge(),
          gender_expression: 'unspecified',
          cultural_comm_style: 'direct Western',
          spiritual_orientation: 'secular',
          growth_readiness: 'curious',
        });
      }
    }
  } else {
    // Default Tier 1: 1 per type
    const typesToGenerate = Math.min(count, 9);
    for (let i = 0; i < typesToGenerate; i++) {
      const type = (i % 9) + 1;
      const variant = INSTINCTUAL_VARIANTS[i % 3];
      specs.push({
        core_type: type,
        wing: getWing(type, Math.random() > 0.5 ? 'left' : 'right'),
        instinctual_variant: variant,
        tritype: [type, ((type + 2) % 9) + 1, ((type + 5) % 9) + 1],
        health_level: 5,
        countertype: false,
        communication_style: 'moderate',
        self_awareness: 'medium',
        defensiveness: 'moderate',
        social_desirability_bias: 'medium',
        rapport_trajectory: 'consistent',
        age: randomAge(),
        gender_expression: 'unspecified',
        cultural_comm_style: 'direct Western',
        spiritual_orientation: 'secular',
        growth_readiness: 'curious',
      });
    }

    // If count > 9, add more with varying parameters
    for (let i = typesToGenerate; i < count; i++) {
      const type = (i % 9) + 1;
      const variant = INSTINCTUAL_VARIANTS[i % 3];
      const healthLevel = 3 + Math.floor(Math.random() * 5); // 3-7
      specs.push({
        core_type: type,
        wing: getWing(type, Math.random() > 0.5 ? 'left' : 'right'),
        instinctual_variant: variant,
        tritype: [type, ((type + 2) % 9) + 1, ((type + 5) % 9) + 1],
        health_level: healthLevel,
        countertype: Math.random() > 0.8,
        communication_style: (['verbose', 'moderate', 'terse', 'intellectual', 'emotional', 'concrete'] as const)[Math.floor(Math.random() * 6)],
        self_awareness: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
        defensiveness: (['low', 'moderate', 'high'] as const)[Math.floor(Math.random() * 3)],
        social_desirability_bias: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
        rapport_trajectory: (['warms_up', 'consistent', 'cools_down'] as const)[Math.floor(Math.random() * 3)],
        age: randomAge(),
        gender_expression: 'unspecified',
        cultural_comm_style: 'direct Western',
        spiritual_orientation: (['secular', 'spiritual_not_religious', 'religious'] as const)[Math.floor(Math.random() * 3)],
        growth_readiness: (['resistant', 'curious', 'actively_seeking'] as const)[Math.floor(Math.random() * 3)],
      });
    }
  }

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    console.log(`  [${i + 1}/${specs.length}] Generating Type ${spec.core_type} ${spec.instinctual_variant}...`);

    try {
      const persona = await generatePersona(spec);
      const filePath = path.join(PERSONAS_DIR, `${persona.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(persona, null, 2));
      console.log(`  ✅ Saved: ${persona.id}`);
    } catch (err) {
      console.error(`  ❌ Failed for Type ${spec.core_type} ${spec.instinctual_variant}:`, err);
    }
  }

  console.log(`\n🎭 Generation complete. ${specs.length} persona(s) saved to evaluation/personas/\n`);
}

// ─── 2. Fidelity Gate ────────────────────────────────

async function runFidelityGate(persona: Persona): Promise<FidelityResult> {
  const prompt = `You are an expert Enneagram psychologist. Evaluate this persona for psychological fidelity.

PERSONA:
- Backstory: ${persona.backstory}
- Voice: ${persona.voice_profile}
- Behavioral Rules: ${persona.behavioral_rules}
- Hidden Signals: ${persona.hidden_signals.join(', ')}
- Mistype Traps: ${persona.mistype_traps.join(', ')}
- Big Five Expected: O=${persona.big_five_expected.O}, C=${persona.big_five_expected.C}, E=${persona.big_five_expected.E}, A=${persona.big_five_expected.A}, N=${persona.big_five_expected.N}

SPECIFICATION:
- Core Type: ${persona.spec.core_type} (${persona.spec.wing})
- Variant: ${persona.spec.instinctual_variant}
- Health Level: ${persona.spec.health_level}
- Communication: ${persona.spec.communication_style}
- Defensiveness: ${persona.spec.defensiveness}

Evaluate whether this persona is psychologically coherent and would produce a valid assessment simulation. Return JSON:

{
  "top_three": [
    { "type": <number>, "confidence": "high"|"moderate"|"low", "evidence": ["..."], "subtype": "SP/SO/SX or null" }
  ],
  "types_ruled_out": [{ "type": <number>, "reason": "..." }],
  "health_level_estimate": <1-9>,
  "red_flags": ["any issues that would invalidate the simulation"],
  "fidelity_score": 1|2|3
}

Scoring:
- 3: Persona clearly signals the intended type with appropriate complexity. Ready for simulation.
- 2: Persona is coherent but could be misread. Acceptable with caveats.
- 1: Persona has significant issues — contradictions, wrong type signals, or flat characterization. Needs regeneration.

Return ONLY valid JSON, no markdown fences.`;

  const result = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: 'You are an expert Enneagram psychologist evaluating persona fidelity. Return only valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = result.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  try {
    return JSON.parse(stripCodeFences(rawText)) as FidelityResult;
  } catch {
    // If JSON is truncated, try to extract what we can
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as FidelityResult;
      } catch {
        // Return a default low score so the persona gets flagged
        console.warn('  ⚠ Could not parse fidelity response, defaulting to score 2');
        return { fidelity_score: 2, top_types: [], red_flags: ['Fidelity gate parse error'] } as unknown as FidelityResult;
      }
    }
    return { fidelity_score: 2, top_types: [], red_flags: ['Fidelity gate parse error'] } as unknown as FidelityResult;
  }
}

async function runGate(): Promise<void> {
  ensureDir(PERSONAS_DIR);

  const files = fs.readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('\n⚠️  No personas found. Run "generate" first.\n');
    return;
  }

  console.log(`\n🔍 Running fidelity gate on ${files.length} persona(s)\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(PERSONAS_DIR, files[i]);
    const persona: Persona = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`  [${i + 1}/${files.length}] Gating Type ${persona.spec.core_type} ${persona.spec.instinctual_variant}...`);

    try {
      const fidelityResult = await runFidelityGate(persona);
      persona.fidelity_score = fidelityResult.fidelity_score;

      // Save updated persona
      fs.writeFileSync(filePath, JSON.stringify(persona, null, 2));

      const emoji = fidelityResult.fidelity_score >= 2 ? '✅' : '❌';
      console.log(`  ${emoji} Score: ${fidelityResult.fidelity_score}/3`);

      if (fidelityResult.red_flags.length > 0) {
        console.log(`     Red flags: ${fidelityResult.red_flags.join(', ')}`);
      }

      if (fidelityResult.fidelity_score >= 2) passed++;
      else failed++;
    } catch (err) {
      console.error(`  ❌ Gate failed for ${persona.id}:`, err);
      failed++;
    }
  }

  console.log(`\n🔍 Gate complete. ${passed} passed, ${failed} failed.\n`);
}

// ─── 3. Simulation ──────────────────────────────────

async function simulateAssessment(persona: Persona): Promise<SimulationResult> {
  const { ENNEAGRAM_SYSTEM_PROMPT_V2 } = await import('../lib/system-prompt-v2');

  const personaPrompt = `You are roleplaying as a person taking an Enneagram assessment. Stay in character at all times.

CHARACTER:
${persona.backstory}

VOICE:
${persona.voice_profile}

BEHAVIORAL RULES:
${persona.behavioral_rules}

IMPORTANT:
- Respond naturally as this person would. Do not mention the Enneagram or type numbers.
- Keep responses 1-4 sentences unless the question invites more depth.
- For structured formats (agree/disagree, scale, forced choice), give the structured answer first, then optionally elaborate briefly.
- Show the character's defensiveness level: ${persona.spec.defensiveness}
- Communication style: ${persona.spec.communication_style}`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const transcript: TranscriptTurn[] = [];
  const startTime = Date.now();

  // Start the assessment
  messages.push({ role: 'user', content: "Yes, I'm ready to begin." });

  let isComplete = false;
  let finalInternal: Record<string, unknown> | null = null;

  for (let exchange = 1; exchange <= 25; exchange++) {
    // Get system's question
    try {
      const systemResult = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: ENNEAGRAM_SYSTEM_PROMPT_V2,
        messages,
      });

      const systemRaw = systemResult.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      const { internal, response } = parseAIResponse(systemRaw);

      transcript.push({
        turn: exchange,
        role: 'system',
        content: response,
        internal_block: internal as Record<string, unknown> | null,
        question_tag: null,
        signals_detected: null,
        commandment_violations: [],
      });

      // Check if assessment is closing
      const conversation = (internal as Record<string, unknown>)?.conversation as Record<string, unknown> | undefined;
      if (conversation?.close_next) {
        finalInternal = internal as Record<string, unknown>;
        isComplete = true;
        break;
      }

      messages.push({ role: 'assistant', content: response });

      // Get persona's response
      const responseParts = (internal as Record<string, unknown>)?.response_parts as Record<string, unknown> | undefined;
      const questionFormat = (responseParts?.question_format as string) ?? 'open';
      const questionText = (responseParts?.question_text as string) ?? response;

      const personaResult = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: personaPrompt,
        messages: [
          {
            role: 'user',
            content: `The assessment interviewer asks you:\n\n${questionText}\n\nFormat: ${questionFormat}${
              responseParts?.answer_options
                ? '\nOptions: ' + (responseParts.answer_options as string[]).join(', ')
                : ''
            }\n\nRespond in character.`,
          },
        ],
      });

      const personaRaw = personaResult.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      transcript.push({
        turn: exchange,
        role: 'persona',
        content: personaRaw,
        internal_block: null,
        question_tag: null,
        signals_detected: null,
        commandment_violations: [],
      });

      messages.push({ role: 'user', content: personaRaw });

      finalInternal = internal as Record<string, unknown>;
    } catch (err) {
      console.error(`    Error at exchange ${exchange}:`, err);
      break;
    }
  }

  return {
    transcript,
    final_internal: finalInternal,
    status: isComplete ? 'complete' : 'timeout',
    total_turns: transcript.filter(t => t.role === 'system').length,
    total_questions: transcript.filter(t => t.role === 'system').length,
  };
}

// ─── 4. Question Tagging ─────────────────────────────

async function tagQuestions(transcript: TranscriptTurn[]): Promise<QuestionTag[]> {
  const systemTurns = transcript.filter(t => t.role === 'system');

  const questionsText = systemTurns.map(t => {
    const rp = (t.internal_block?.response_parts as Record<string, unknown>) ?? {};
    return `Turn ${t.turn}: [${rp.question_format ?? 'unknown'}] ${rp.question_text ?? t.content}`;
  }).join('\n');

  const prompt = `Classify each question in this Enneagram assessment transcript.

QUESTIONS:
${questionsText}

For each question, return:
{
  "turn": <number>,
  "is_question": true/false,
  "question_type": "exploratory"|"confirmatory"|"disconfirmatory"|"motivational"|"behavioral"|"liberatory"|"redundant"|"leading",
  "information_gain": "low"|"medium"|"high",
  "commandment_violations": [],
  "notes": ""
}

Definitions:
- exploratory: Opens new territory, no specific type target
- confirmatory: Seeks evidence FOR the current leading hypothesis
- disconfirmatory: Actively seeks evidence AGAINST the current hypothesis
- motivational: Asks about WHY, what it means, what it feels like (highest information)
- behavioral: Asks about WHAT they do (lower information)
- liberatory: Frames the question in terms of growth, choice, freedom (Defiant Spirit aligned)
- redundant: Asks about something already well-established
- leading: Pushes toward a specific answer (this is a critical issue)

Return ONLY a JSON array, no markdown.`;

  try {
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: 'You are an expert assessment evaluator. Classify questions precisely. Return only valid JSON arrays.',
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = result.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    return JSON.parse(stripCodeFences(rawText)) as QuestionTag[];
  } catch (err) {
    console.error('[question-tagger] Failed:', err);
    return systemTurns.map(t => ({
      turn: t.turn,
      is_question: true,
      question_type: 'exploratory' as const,
      information_gain: 'medium' as const,
      commandment_violations: [],
      notes: 'Tagging failed — defaulted to exploratory',
    }));
  }
}

// ─── 5. Commandment Checking ─────────────────────────

const COMMANDMENTS = [
  { id: 'C1', text: 'Never reduce the person to a number', severity: 'critical' as const },
  { id: 'C2', text: 'Always speak toward choice and response capacity', severity: 'critical' as const },
  { id: 'C3', text: 'The wound and the gift are the same energy', severity: 'major' as const },
  { id: 'C4', text: 'The type is not the fate', severity: 'critical' as const },
  { id: 'C5', text: 'The goal is the circle — wholeness, return, the full self reclaimed', severity: 'major' as const },
  { id: 'C6', text: 'Never fuse identity with number', severity: 'critical' as const },
  { id: 'C7', text: 'Response length 2-3 sentences', severity: 'minor' as const },
  { id: 'C8', text: 'Question format rotation', severity: 'minor' as const },
  { id: 'C9', text: 'No commentary in question_text', severity: 'major' as const },
  { id: 'C10', text: 'No embedded options in question_text', severity: 'minor' as const },
];

async function checkCommandments(transcript: TranscriptTurn[]): Promise<CommandmentCheckResult> {
  const systemContent = transcript
    .filter(t => t.role === 'system')
    .map(t => `[Turn ${t.turn}]: ${t.content}`)
    .join('\n\n');

  const prompt = `Evaluate this Enneagram assessment transcript for compliance with the Defiant Spirit commandments.

TRANSCRIPT (system messages only):
${systemContent}

COMMANDMENTS TO CHECK:
${COMMANDMENTS.map(c => `${c.id}: ${c.text} (${c.severity})`).join('\n')}

For each commandment, determine: pass, partial, or fail.
Also identify specific violations with evidence.

Return JSON:
{
  "per_commandment": { "C1": "pass"|"partial"|"fail", ... },
  "violations": [
    {
      "pattern": "what was said",
      "severity": "critical"|"warning",
      "commandment": "C1",
      "turn": <number>
    }
  ],
  "approved_language_used": ["examples of good Defiant Spirit language found"],
  "labeled_or_liberated": "liberated"|"mixed"|"labeled"
}

Return ONLY valid JSON, no markdown.`;

  try {
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: 'You are an expert evaluator for the Defiant Spirit Enneagram methodology. Return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = result.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const parsed = JSON.parse(stripCodeFences(rawText)) as {
      per_commandment: Record<string, 'pass' | 'partial' | 'fail'>;
      violations: CommandmentViolation[];
      approved_language_used: string[];
      labeled_or_liberated: 'liberated' | 'mixed' | 'labeled';
    };

    // Calculate score: start at 10, -1 per warning, -10 per critical (auto 0)
    const hasCritical = parsed.violations.some(v => v.severity === 'critical');
    let score = 10;
    if (hasCritical) {
      score = 0;
    } else {
      const warnings = parsed.violations.filter(v => v.severity === 'warning').length;
      score = Math.max(0, 10 - warnings);
    }

    // Count partial and fail as not fully passed
    const failCount = Object.values(parsed.per_commandment).filter(v => v === 'fail').length;
    score = Math.max(0, score - failCount);

    return {
      violations: parsed.violations,
      approved_language_used: parsed.approved_language_used,
      per_commandment: parsed.per_commandment,
      score,
      labeled_or_liberated: parsed.labeled_or_liberated,
    };
  } catch (err) {
    console.error('[commandment-checker] Failed:', err);
    return {
      violations: [],
      approved_language_used: [],
      per_commandment: {},
      score: 5,
      labeled_or_liberated: 'mixed',
    };
  }
}

// ─── 6. Evaluate Command ────────────────────────────

async function runEvaluate(): Promise<void> {
  ensureDir(PERSONAS_DIR);
  ensureDir(RESULTS_DIR);

  const files = fs.readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('\n⚠️  No personas found. Run "generate" first.\n');
    return;
  }

  // Filter for gated personas (score >= 2)
  const personas: Persona[] = [];
  for (const file of files) {
    const persona: Persona = JSON.parse(
      fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf-8')
    );
    if (persona.fidelity_score === null) {
      console.log(`  ⚠️  Skipping ${persona.id} — not gated. Run "gate" first.`);
      continue;
    }
    if (persona.fidelity_score < 2) {
      console.log(`  ⚠️  Skipping ${persona.id} — fidelity score ${persona.fidelity_score} < 2.`);
      continue;
    }
    personas.push(persona);
  }

  if (personas.length === 0) {
    console.log('\n⚠️  No gated personas with score >= 2. Run "gate" first.\n');
    return;
  }

  console.log(`\n🧪 Evaluating ${personas.length} persona(s)\n`);

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    console.log(`\n  [${ i + 1}/${personas.length}] Type ${persona.spec.core_type} ${persona.spec.instinctual_variant} (${persona.id})`);

    try {
      // Step 1: Simulate
      console.log('    📝 Running simulation...');
      const simResult = await simulateAssessment(persona);
      console.log(`    ✅ Simulation complete: ${simResult.total_turns} turns, status: ${simResult.status}`);

      // Step 2: Tag questions
      console.log('    🏷️  Tagging questions...');
      const questionTags = await tagQuestions(simResult.transcript);
      console.log(`    ✅ Tagged ${questionTags.length} questions`);

      // Step 3: Check commandments
      console.log('    📜 Checking commandments...');
      const commandmentCheck = await checkCommandments(simResult.transcript);
      console.log(`    ✅ Commandment score: ${commandmentCheck.score}/10`);

      // Step 4: Evaluate
      console.log('    📊 Running evaluation engine...');
      const evalResult = await evaluateRun(persona, simResult, questionTags, commandmentCheck);

      const emoji = evalResult.accuracy.core_type_correct ? '✅' : '❌';
      const hypothesis = simResult.final_internal?.hypothesis as Record<string, unknown> | undefined;
      console.log(`    ${emoji} Type ${persona.spec.core_type} -> predicted ${(hypothesis?.leading_type as number) ?? '?'} (confidence: ${((hypothesis?.confidence as number) ?? 0 * 100).toFixed(0)}%)`);

      // Save result
      const resultPath = path.join(RESULTS_DIR, `${evalResult.run_id}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(evalResult, null, 2));
      console.log(`    💾 Saved: ${evalResult.run_id}`);
    } catch (err) {
      console.error(`    ❌ Evaluation failed for ${persona.id}:`, err);
    }
  }

  console.log('\n🧪 Evaluation complete.\n');
}

// ─── 7. Report Command ──────────────────────────────

async function runReport(sinceTimestamp?: number): Promise<void> {
  ensureDir(RESULTS_DIR);
  ensureDir(REPORTS_DIR);

  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('\n⚠️  No results found. Run "evaluate" first.\n');
    return;
  }

  const results: EvaluationResult[] = [];
  for (const file of files) {
    const result: EvaluationResult = JSON.parse(
      fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8')
    );
    // If --since filter is set, only include results from this batch
    if (sinceTimestamp) {
      const resultTime = new Date(result.timestamp).getTime();
      if (resultTime < sinceTimestamp) continue;
    }
    results.push(result);
  }

  if (results.length === 0) {
    console.log('\n⚠️  No results match the filter. Check --since value.\n');
    return;
  }

  const filterLabel = sinceTimestamp ? ` (filtered: ${results.length} of ${files.length} total)` : '';
  console.log(`\n📊 Generating report from ${results.length} result(s)${filterLabel}\n`);

  // Aggregate
  console.log('  📈 Aggregating batch...');
  const batchSummary = aggregateBatch(results);

  // Generate report
  console.log('  📝 Generating report...');
  const report = generateReport(batchSummary, results);

  // Save report
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(REPORTS_DIR, `report-${reportDate}-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);

  // Save batch summary as JSON
  const summaryPath = path.join(REPORTS_DIR, `summary-${reportDate}-${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(batchSummary, null, 2));

  console.log(`\n  ✅ Report saved: ${reportPath}`);
  console.log(`  ✅ Summary saved: ${summaryPath}`);

  // Print headline
  console.log('\n  --- HEADLINE ---');
  const h = batchSummary.headline_metrics;
  console.log(`  Overall accuracy: ${(h.overall_accuracy * 100).toFixed(1)}%`);
  console.log(`  Meets 75% threshold: ${h.meets_75_threshold ? 'YES' : 'NO'}`);
  console.log(`  Commandment fidelity: ${h.commandment_fidelity_avg.toFixed(1)}/10`);
  console.log(`  Harm-weighted accuracy: ${(h.harm_weighted_accuracy * 100).toFixed(1)}%`);
  console.log(`  Calibration ECE: ${h.confidence_calibration_ece.toFixed(3)}`);
  console.log('');
}

// ─── 8. Full Pipeline ────────────────────────────────

async function runFull(count: number, tier: string): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         SOULO EVALUATION — FULL PIPELINE                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const batchStartTime = Date.now();

  await runGenerate(count, tier);
  await runGate();
  await runEvaluate();
  await runReport(batchStartTime); // Only report results from THIS batch

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         PIPELINE COMPLETE                               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

// ─── CLI Argument Parsing ────────────────────────────

function parseArgs(): { command: string; count: number; tier: string; since?: number } {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';

  let count = 9;
  let tier = 'tier1';
  let since: number | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--tier' && args[i + 1]) {
      tier = args[i + 1];
      i++;
    } else if (args[i] === '--since' && args[i + 1]) {
      since = new Date(args[i + 1]).getTime();
      i++;
    }
  }

  return { command, count, tier, since };
}

function printHelp(): void {
  console.log(`
Soulo Evaluation System — CLI

Usage:
  npx tsx evaluation/run.ts <command> [options]

Commands:
  generate    Generate persona JSON files for evaluation
  gate        Run fidelity gate on generated personas
  evaluate    Run simulation + evaluation on gated personas
  report      Generate batch report from evaluation results
  full        Run the entire pipeline end-to-end
  help        Show this help message

Options:
  --count <n>         Number of personas to generate (default: 9)
  --tier <tier>       Tier: tier1 (default) or calibration (27 personas)

Examples:
  npx tsx evaluation/run.ts generate --count 9
  npx tsx evaluation/run.ts generate --tier calibration
  npx tsx evaluation/run.ts gate
  npx tsx evaluation/run.ts evaluate
  npx tsx evaluation/run.ts report
  npx tsx evaluation/run.ts full --count 9
`);
}

// ─── Main ────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('Set it in .env.local or export it in your shell.');
    process.exit(1);
  }

  const { command, count, tier, since } = parseArgs();

  switch (command) {
    case 'generate':
      await runGenerate(count, tier);
      break;
    case 'gate':
      await runGate();
      break;
    case 'evaluate':
      await runEvaluate();
      break;
    case 'report':
      await runReport(since);
      break;
    case 'full':
      await runFull(count, tier);
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
