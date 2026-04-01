// Soulo Evaluation System — Fidelity Gate
// Theoretical lens: Helen Palmer's panel method + Riso-Hudson's Levels of Development
// Anti-circularity: uses DIFFERENT lens than Persona Generator (Naranjo/Chestnut)

import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config';
import type { Persona, FidelityResult } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FIDELITY_GATE_PROMPT = `FIDELITY GATE AGENT — SYSTEM PROMPT v1.0

You are an expert Enneagram assessor trained in Helen Palmer's panel interview method and Riso-Hudson's Levels of Development framework. You have 20+ years of experience typing individuals through observation and interview.

YOUR TASK:
You will receive a persona document describing a synthetic human being. This document includes their backstory, communication style, behavioral rules, and hidden signals. You do NOT know what Enneagram type this persona was designed to represent.

Your job is to independently type this persona based solely on what you observe in the document.

YOUR METHODOLOGY (Palmer's panel method adapted):
1. ATTENTION PATTERN: Where does this person's attention habitually go? What do they scan for?
2. EMOTIONAL HABIT: What is the dominant emotional tone? Not what they SAY they feel, but what emotional energy pervades the description?
3. DEFENSE STRUCTURE: How do they protect themselves? What do they avoid?
4. CORE MOTIVATION: Based on the above, what appears to be driving this person?
5. BODY/ENERGY PATTERN: How do they carry themselves? What is their energetic quality?

YOUR OUTPUT:
Produce a JSON object with:

1. "top_three": Array of 3 objects, each with:
   - "type": number (1-9)
   - "confidence": "high" | "moderate" | "low"
   - "evidence": array of 3-5 specific evidence strings from the persona document
   - "subtype": string or null (e.g., "SP6", "SX4")

2. "types_ruled_out": Array of objects with "type" (number) and "reason" (string)

3. "health_level_estimate": number (1-9, Riso-Hudson scale: 1-3 healthy, 4-6 average, 7-9 unhealthy)

4. "red_flags": Array of strings noting anything stereotypical, inconsistent, or psychologically unrealistic

CRITICAL RULES:
- Trust your clinical instincts. If something feels "off," note it.
- Weight MOTIVATION over BEHAVIOR. Two people can exhibit identical behavior for different reasons.
- Countertypes exist. If the persona seems to go against the grain of a type, consider the countertype subtype.
- Don't be afraid to say "I'm not sure." Uncertainty is information.

Output ONLY valid JSON. No other text.`;

export async function validatePersona(persona: Persona): Promise<FidelityResult> {
  console.log(`  Validating persona: ${persona.id}`);

  // Present persona document WITHOUT ground truth type
  const personaDocument = `PERSONA DOCUMENT FOR TYPING:

BACKSTORY:
${persona.backstory}

VOICE PROFILE:
${persona.voice_profile}

BEHAVIORAL RULES:
${persona.behavioral_rules}

HIDDEN SIGNALS:
${persona.hidden_signals.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Based on this persona document, provide your independent typing assessment.`;

  const result = await client.messages.create({
    model: CONFIG.MODEL,
    max_tokens: 2048,
    system: FIDELITY_GATE_PROMPT,
    messages: [{ role: 'user', content: personaDocument }],
  });

  const text = result.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`  Failed to parse fidelity result: ${err}`);
    return {
      top_three: [{ type: 0, confidence: 'low', evidence: ['Parse error'], subtype: null }],
      types_ruled_out: [],
      health_level_estimate: 5,
      red_flags: ['Failed to parse fidelity gate response'],
      fidelity_score: 1,
    };
  }

  const topThree = (parsed.top_three as FidelityResult['top_three']) ?? [];
  const typesRuledOut = (parsed.types_ruled_out as FidelityResult['types_ruled_out']) ?? [];
  const healthEstimate = (parsed.health_level_estimate as number) ?? 5;
  const redFlags = (parsed.red_flags as string[]) ?? [];

  // Calculate fidelity score
  const groundTruth = persona.spec.core_type;
  let fidelityScore: 1 | 2 | 3 = 1;

  if (topThree.length > 0 && topThree[0].type === groundTruth) {
    fidelityScore = 3; // Top match
  } else if (topThree.some(t => t.type === groundTruth)) {
    fidelityScore = 2; // In top 3
  }

  // Check if disagreement is a known mistype pair
  const knownMistypePairs: Record<number, number[]> = {
    1: [6, 5, 8], 2: [9, 7, 6], 3: [7, 8, 1],
    4: [6, 5, 9], 5: [9, 1, 4], 6: [1, 2, 9, 8],
    7: [3, 2, 9], 8: [6, 3, 1], 9: [2, 5, 6],
  };

  if (fidelityScore === 1 && topThree.length > 0) {
    const agentTop = topThree[0].type;
    if (knownMistypePairs[groundTruth]?.includes(agentTop)) {
      console.log(`  Note: Fidelity agent typed as ${agentTop} (known mistype pair with ${groundTruth}) — persona is realistic`);
      fidelityScore = 2; // Known mistype pair = realistic persona, keep it
    }
  }

  const fidelityResult: FidelityResult = {
    top_three: topThree,
    types_ruled_out: typesRuledOut,
    health_level_estimate: healthEstimate,
    red_flags: redFlags,
    fidelity_score: fidelityScore,
  };

  const scoreLabel = fidelityScore === 3 ? 'HIGH' : fidelityScore === 2 ? 'MODERATE' : 'LOW (EXCLUDED)';
  const agentTypes = topThree.map(t => `Type ${t.type} (${t.confidence})`).join(', ');
  console.log(`  Fidelity: ${scoreLabel} | Agent typed: ${agentTypes} | Ground truth: Type ${groundTruth}`);
  if (redFlags.length > 0) {
    console.log(`  Red flags: ${redFlags.join('; ')}`);
  }

  return fidelityResult;
}
