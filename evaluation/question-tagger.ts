// Soulo Evaluation System — Question Tagger
// Tags each system question by type using Claude analysis

import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config';
import type { TranscriptTurn, QuestionTag } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const QUESTION_TAGGER_PROMPT = `QUESTION TAGGER — SYSTEM PROMPT v1.0

You are analyzing questions asked by an AI-based Enneagram assessment system. For each system utterance, determine:

1. IS THIS A QUESTION? (true/false)
   Some utterances are statements, reflections, or results delivery — not questions.

2. QUESTION TYPE (select ONE primary tag):
   - EXPLORATORY: Open-ended, could point to multiple types. Typically early in conversation.
   - CONFIRMATORY: Tests FOR the system's current leading hypothesis. Seeks supporting evidence.
   - DISCONFIRMATORY: Tests AGAINST the leading hypothesis. Seeks evidence that would RULE OUT the theory. THIS IS THE MOST IMPORTANT TAG.
   - MOTIVATIONAL: Probes WHY the person does what they do, not just WHAT.
   - BEHAVIORAL: Asks about observable behavior/habits without probing motivation.
   - LIBERATORY: Invites self-awareness, consciousness, or choice — aligns with Defiant Spirit philosophy.
   - REDUNDANT: Same thing as a previous question using different words.
   - LEADING: Suggests or implies the "right" answer. Should NEVER occur.

3. INFORMATION GAIN (low/medium/high):
   - HIGH: Probes unexplored dimension, distinguishes between top hypotheses
   - MEDIUM: Confirms/deepens existing understanding
   - LOW: Covers already-explored ground

For each system utterance in the transcript, output a JSON array of tag objects.

Output ONLY valid JSON array. No other text.`;

/**
 * Tag all system questions in a transcript.
 * Sends the full transcript to Claude for batch analysis.
 */
export async function tagQuestions(transcript: TranscriptTurn[]): Promise<QuestionTag[]> {
  const systemTurns = transcript.filter(t => t.role === 'system');

  if (systemTurns.length === 0) return [];

  // Build context for tagger
  const turnDescriptions = transcript.map(t => {
    if (t.role === 'system') {
      const hypothesis = t.internal_block
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? `[Hypothesis: Type ${(t.internal_block as any)?.hypothesis?.leading_type ?? '?'} @ ${Math.round(((t.internal_block as any)?.hypothesis?.confidence ?? 0) * 100)}%]`
        : '';
      return `TURN ${t.turn} [SYSTEM] ${hypothesis}:\n${t.content}`;
    }
    return `TURN ${t.turn} [USER]:\n${t.content}`;
  }).join('\n\n---\n\n');

  const prompt = `Analyze each SYSTEM utterance in this Enneagram assessment conversation. Tag each one.

TRANSCRIPT:
${turnDescriptions}

For each SYSTEM turn, output a JSON object with:
- "turn": the turn number
- "is_question": true/false
- "question_type": one of the 8 types listed above
- "information_gain": "low", "medium", or "high"
- "commandment_violations": array of strings (empty if none)
- "notes": optional observation about question quality

Output a JSON array of these objects, one per system turn. Output ONLY valid JSON.`;

  try {
    const result = await client.messages.create({
      model: CONFIG.MODEL,
      max_tokens: 4096,
      system: QUESTION_TAGGER_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = result.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');

    const tags = JSON.parse(jsonMatch[0]) as QuestionTag[];
    return tags;
  } catch (err) {
    console.warn(`  Question tagger failed: ${err}. Falling back to basic tagging.`);
    return basicTagging(systemTurns);
  }
}

/**
 * Fallback: basic rule-based tagging when Claude tagger fails.
 */
function basicTagging(systemTurns: TranscriptTurn[]): QuestionTag[] {
  return systemTurns.map(turn => {
    const content = turn.content;
    const isQuestion = content.includes('?');

    let questionType: QuestionTag['question_type'] = 'exploratory';
    if (!isQuestion) {
      questionType = 'behavioral'; // Not a question, just a statement
    } else if (/which.*more|what.*drive|why.*do|what.*underneath|what.*motivation/i.test(content)) {
      questionType = 'motivational';
    } else if (/how.*often|what.*do.*when|tell.*about.*time|describe/i.test(content)) {
      questionType = 'behavioral';
    } else if (/or.*is\s+it|would\s+you\s+say.*or/i.test(content)) {
      questionType = 'disconfirmatory';
    } else if (/notice.*yourself|what\s+happens\s+if\s+you\s+pause|part\s+of\s+you/i.test(content)) {
      questionType = 'liberatory';
    }

    return {
      turn: turn.turn,
      is_question: isQuestion,
      question_type: questionType,
      information_gain: 'medium' as const,
      commandment_violations: [],
      notes: '',
    };
  });
}
