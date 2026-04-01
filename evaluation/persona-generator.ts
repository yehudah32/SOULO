// Soulo Evaluation System — Persona Generator
// Theoretical lens: Naranjo's character fixations + Chestnut's 27 subtypes + Ichazo's passions
// Anti-circularity: uses DIFFERENT lens than the Fidelity Gate (Palmer/Riso-Hudson)

import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config';
import type { PersonaSpec, Persona } from './types';
import { TYPE_PROFILES } from './data/type-profiles';
import { SUBTYPE_SIGNATURES } from './data/subtype-signatures';
import { BIG_FIVE_PROFILES } from './data/big-five-mappings';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PERSONA_GENERATOR_PROMPT = `PERSONA GENERATOR — SYSTEM PROMPT v1.0

You are a clinical psychologist specializing in Enneagram-based personality assessment. Your task is to create a psychologically realistic synthetic human being based on the specification provided. This persona will be used to test an AI-based Enneagram assessment system.

YOUR THEORETICAL FOUNDATION:
You draw from Claudio Naranjo's character fixation model, Beatrice Chestnut's 27 subtype descriptions, and Oscar Ichazo's passion/fixation framework. You understand each Enneagram type as a character structure organized around a core emotional pattern (the passion), a cognitive fixation, and an instinctual survival strategy that interacts with one of three biological drives (self-preservation, social, sexual/one-to-one).

YOUR TASK:
Given a persona specification, produce a detailed persona document in valid JSON format with these fields:

1. "backstory" (string, 3-5 paragraphs): A realistic life narrative for this person. Include family of origin dynamics, key formative experiences, current life circumstances, recent events that brought them to this assessment, and specific details that make them feel real (a hobby, a recent argument, a guilty pleasure). The backstory should SHOW the type pattern without NAMING it.

2. "voice_profile" (string): How this person communicates — vocabulary level, sentence structure, emotional register, characteristic phrases, how they handle difficult questions.

3. "behavioral_rules" (string): Explicit instructions for how this persona responds during the assessment — what topics trigger openness vs defensiveness, relationship to vulnerability, how they handle being "figured out", how communication shifts over the conversation.

4. "hidden_signals" (string array, 5-8 items): Specific behavioral signals that an expert Enneagram assessor would recognize but the persona wouldn't self-report. These are breadcrumbs — embedded naturally in conversation, not announced.

5. "mistype_traps" (string array, 2-3 items): Ways this persona could be mistyped, and what signals might lead an assessor astray.

6. "big_five_expected" (object with O, C, E, A, N as "low", "moderate", or "high"): Expected Big Five personality profile based on this type/subtype.

CRITICAL RULES:
- NEVER create a textbook persona. Real people are messy, contradictory, and unaware of their own patterns.
- The persona must NEVER reference Enneagram terminology, type numbers, or psychological jargon.
- The survival strategy should be EMBEDDED in the backstory and behavior, not described analytically.
- Include at least one detail that seems to contradict the type pattern — real humans are not perfectly consistent.
- Countertypes require EXTRA care — their behavior goes against the grain of their type.
- The persona should feel like someone you could meet at a dinner party, not a case study.

Output ONLY valid JSON. No other text before or after.`;

function buildSpecContext(spec: PersonaSpec): string {
  const profile = TYPE_PROFILES[spec.core_type];
  const subtypeKey = `${spec.core_type}_${spec.instinctual_variant}`;
  const subtype = SUBTYPE_SIGNATURES.find(
    s => s.type_id === spec.core_type && s.variant === spec.instinctual_variant
  );
  const bigFive = BIG_FIVE_PROFILES[spec.core_type as 1|2|3|4|5|6|7|8|9];

  let context = `PERSONA SPECIFICATION:
${JSON.stringify(spec, null, 2)}

TYPE REFERENCE (for your internal use — do NOT expose in persona):
- Core Fear: ${profile?.core_fear}
- Core Desire: ${profile?.core_desire}
- Passion: ${profile?.passion}
- Defense Mechanism: ${profile?.defense_mechanism}
- Behavioral Signatures: ${profile?.behavioral_signatures.join('; ')}
- Integration → Type ${profile?.integration}, Disintegration → Type ${profile?.disintegration}`;

  if (subtype) {
    context += `\n\nSUBTYPE (${spec.instinctual_variant}${spec.core_type}):
- Keyword: ${subtype.keyword}
- Countertype: ${subtype.countertype ? 'YES — goes against the grain of the type' : 'No'}
- Description: ${subtype.description}
- Key Patterns: ${subtype.key_patterns.join('; ')}
- Can be confused with: Types ${subtype.looks_like.join(', ')}
- Discriminators: ${subtype.discriminators.join('; ')}`;
  }

  if (bigFive) {
    context += `\n\nEXPECTED BIG FIVE: O=${bigFive.openness.expected}, C=${bigFive.conscientiousness.expected}, E=${bigFive.extraversion.expected}, A=${bigFive.agreeableness.expected}, N=${bigFive.neuroticism.expected}`;
  }

  return context;
}

export async function generatePersona(spec: PersonaSpec): Promise<Persona> {
  const specContext = buildSpecContext(spec);
  const id = `persona_${spec.wing}_${spec.instinctual_variant.toLowerCase()}_${Date.now().toString(36)}`;

  console.log(`  Generating persona: ${id} (Type ${spec.core_type}, ${spec.wing}, ${spec.instinctual_variant})`);

  const result = await client.messages.create({
    model: CONFIG.MODEL,
    max_tokens: 4096,
    system: PERSONA_GENERATOR_PROMPT,
    messages: [{ role: 'user', content: specContext }],
  });

  const text = result.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  // Parse JSON from response
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`  Failed to parse persona JSON: ${err}`);
    throw new Error(`Failed to generate persona ${id}: ${err}`);
  }

  // Quality pre-screen
  const backstory = (parsed.backstory as string) ?? '';
  const enneagramTerms = /\b(enneagram|type [1-9]|wing|instinct|subtype|countertype|fixation|passion)\b/i;
  if (enneagramTerms.test(backstory)) {
    console.warn(`  WARNING: Backstory contains Enneagram terminology — should be regenerated`);
  }

  const persona: Persona = {
    id,
    spec,
    backstory,
    voice_profile: (parsed.voice_profile as string) ?? '',
    behavioral_rules: (parsed.behavioral_rules as string) ?? '',
    hidden_signals: (parsed.hidden_signals as string[]) ?? [],
    mistype_traps: (parsed.mistype_traps as string[]) ?? [],
    big_five_expected: (parsed.big_five_expected as Persona['big_five_expected']) ?? {
      O: 'moderate', C: 'moderate', E: 'moderate', A: 'moderate', N: 'moderate',
    },
    fidelity_score: null,
  };

  console.log(`  ✅ Persona generated: ${id} (${persona.hidden_signals.length} signals, ${persona.mistype_traps.length} traps)`);
  return persona;
}

/**
 * Generate persona specs for a batch run.
 */
export function generateSpecs(count: number): PersonaSpec[] {
  const specs: PersonaSpec[] = [];
  const variants: Array<'SP' | 'SO' | 'SX'> = ['SP', 'SO', 'SX'];
  const wings: Record<number, string[]> = {
    1: ['1w9', '1w2'], 2: ['2w1', '2w3'], 3: ['3w2', '3w4'],
    4: ['4w3', '4w5'], 5: ['5w4', '5w6'], 6: ['6w5', '6w7'],
    7: ['7w6', '7w8'], 8: ['8w7', '8w9'], 9: ['9w8', '9w1'],
  };

  if (count <= 9) {
    // Quick test: 1 per type
    for (let type = 1; type <= 9; type++) {
      const wing = wings[type][Math.floor(Math.random() * 2)];
      const variant = variants[Math.floor(Math.random() * 3)];
      specs.push(makeSpec(type, wing, variant));
    }
  } else if (count <= 27) {
    // Calibration: 1 per subtype (9 types × 3 variants)
    for (let type = 1; type <= 9; type++) {
      for (const variant of variants) {
        const wing = wings[type][Math.floor(Math.random() * 2)];
        specs.push(makeSpec(type, wing, variant));
      }
    }
  } else {
    // Tier 1: 35 per type
    for (let type = 1; type <= 9; type++) {
      for (let i = 0; i < Math.ceil(count / 9); i++) {
        const wing = wings[type][i % 2];
        const variant = variants[i % 3];
        specs.push(makeSpec(type, wing, variant));
      }
    }
    specs.length = count; // trim to exact count
  }

  return specs;
}

function makeSpec(type: number, wing: string, variant: 'SP' | 'SO' | 'SX'): PersonaSpec {
  const subtype = SUBTYPE_SIGNATURES.find(
    s => s.type_id === type && s.variant === variant
  );
  // Tritype: core type + one from each other center
  const centers: Record<string, number[]> = {
    body: [8, 9, 1], heart: [2, 3, 4], head: [5, 6, 7],
  };
  const coreCenter = type <= 1 || type >= 8 ? 'body' : type <= 4 ? 'heart' : 'head';
  const otherCenters = Object.entries(centers).filter(([c]) => c !== coreCenter);
  const tritype = [
    type,
    otherCenters[0][1][Math.floor(Math.random() * 3)],
    otherCenters[1][1][Math.floor(Math.random() * 3)],
  ];

  const ages = [22, 25, 28, 31, 34, 38, 42, 47, 52, 58, 63];
  const genders = ['male', 'female', 'non-binary'];
  const commStyles: PersonaSpec['communication_style'][] = ['verbose', 'moderate', 'terse', 'intellectual', 'emotional', 'concrete'];
  const selfAwareness: PersonaSpec['self_awareness'][] = ['high', 'medium', 'low'];
  const rapportTrajs: PersonaSpec['rapport_trajectory'][] = ['warms_up', 'consistent', 'cools_down'];

  return {
    core_type: type,
    wing,
    instinctual_variant: variant,
    tritype,
    health_level: CONFIG.DEFAULT_PERSONA.health_level,
    countertype: subtype?.countertype ?? false,
    communication_style: commStyles[Math.floor(Math.random() * commStyles.length)],
    self_awareness: selfAwareness[Math.floor(Math.random() * selfAwareness.length)],
    defensiveness: CONFIG.DEFAULT_PERSONA.defensiveness,
    social_desirability_bias: CONFIG.DEFAULT_PERSONA.social_desirability_bias,
    rapport_trajectory: rapportTrajs[Math.floor(Math.random() * rapportTrajs.length)],
    age: ages[Math.floor(Math.random() * ages.length)],
    gender_expression: genders[Math.floor(Math.random() * genders.length)],
    cultural_comm_style: CONFIG.DEFAULT_PERSONA.cultural_comm_style,
    spiritual_orientation: CONFIG.DEFAULT_PERSONA.spiritual_orientation,
    growth_readiness: CONFIG.DEFAULT_PERSONA.growth_readiness,
  };
}
