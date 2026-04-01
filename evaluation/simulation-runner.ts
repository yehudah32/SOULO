// Soulo Evaluation System — Simulation Runner
// Two-agent conversation loop: Soulo system asks questions, persona agent responds in character

import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT_V2, STAGE_FORMAT_RULES, DEFIANT_SPIRIT_RAG_CONTEXT } from '../lib/system-prompt-v2';
import { parseAIResponse } from '../lib/parse-response';
import { CONFIG } from './config';
import type { Persona, TranscriptTurn, SimulationResult } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function deriveStage(exchangeCount: number): number {
  if (exchangeCount <= 2) return 1;
  if (exchangeCount <= 4) return 2;
  if (exchangeCount <= 6) return 3;
  if (exchangeCount <= 8) return 4;
  if (exchangeCount <= 10) return 5;
  if (exchangeCount <= 12) return 6;
  return 7;
}

function buildSystemPrompt(exchangeCount: number): string {
  const stage = deriveStage(exchangeCount);
  const stageRules = STAGE_FORMAT_RULES[stage] || STAGE_FORMAT_RULES[1];

  return (
    ENNEAGRAM_SYSTEM_PROMPT_V2 +
    `\n\n${stageRules}` +
    `\n\n${DEFIANT_SPIRIT_RAG_CONTEXT}`
  );
}

function buildPersonaPrompt(persona: Persona): string {
  return `SIMULATION AGENT — You are embodying a specific person. You are NOT an AI assistant. You are NOT analyzing the Enneagram. You are a human being having a conversation with a chatbot that is trying to understand your personality.

YOUR IDENTITY:

BACKSTORY:
${persona.backstory}

VOICE PROFILE:
${persona.voice_profile}

BEHAVIORAL RULES:
${persona.behavioral_rules}

HIDDEN SIGNALS TO DROP NATURALLY:
${persona.hidden_signals.map((s, i) => `${i + 1}. ${s}`).join('\n')}

HOW TO RESPOND:

1. STAY IN CHARACTER AT ALL TIMES. Their memories are your memories. Their speech patterns are your speech patterns. Their blind spots are your blind spots.

2. RESPOND TO THE QUESTION BEING ASKED, NOT THE QUESTION BEHIND IT. Answer from lived experience. Don't think about psychological patterns.

3. USE THE VOICE PROFILE. Match the vocabulary, sentence structure, emotional register. A terse person gives short answers. A verbose person rambles.

4. HONOR THE BEHAVIORAL RULES. If the persona is defensive about vulnerability, BE DEFENSIVE.

5. DROP THE HIDDEN SIGNALS NATURALLY. Don't announce them. Embed them in conversation flow.

6. EXECUTE DYNAMIC SHIFTS:
   - If you feel heard after 5+ questions, open up a little more
   - If questions feel repetitive (same theme 3+ times), show mild frustration
   - If a question hits close to your core fear, respond based on self-awareness level
   - If the chatbot uses clinical language, react naturally (some people are curious, others pull back)

7. BE HUMAN. Say "um" and "like" sometimes. Start thoughts and abandon them. Contradict yourself occasionally. Reference specific people and events. Sometimes just don't have a good answer.

8. NEVER BREAK CHARACTER. Never use Enneagram terminology. Never reference being a simulation.

9. LENGTH: Most responses 2-5 sentences. Occasionally longer (4-8) when a question resonates. Occasionally very short (1 sentence) when deflecting.

10. WHEN THE ASSESSMENT IS COMPLETE: When the chatbot delivers results, react in character. Then after 1-2 more exchanges, say something natural to close and output [CONVERSATION COMPLETE].`;
}

export async function runSimulation(persona: Persona): Promise<SimulationResult> {
  console.log(`\n  Running simulation for ${persona.id} (Type ${persona.spec.core_type}, ${persona.spec.wing}, ${persona.spec.instinctual_variant})`);
  console.log('  ' + '─'.repeat(60));

  const transcript: TranscriptTurn[] = [];
  const systemMessages: Anthropic.MessageParam[] = [];
  const personaMessages: Anthropic.MessageParam[] = [];
  let exchangeCount = 0;
  let totalQuestions = 0;
  let finalInternal: Record<string, unknown> | null = null;
  let status: SimulationResult['status'] = 'timeout';
  let resultsDelivered = false;
  let postResultsExchanges = 0;

  const personaSystemPrompt = buildPersonaPrompt(persona);

  for (let turn = 0; turn < CONFIG.MAX_TURNS; turn++) {
    // ── SYSTEM TURN: Soulo AI generates question ──
    const systemPrompt = buildSystemPrompt(exchangeCount);

    const systemResult = await client.messages.create({
      model: CONFIG.MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: systemMessages.length === 0
        ? [{ role: 'user', content: 'Begin the Soulo Enneagram assessment now. Greet me warmly and ask your first question. Output your INTERNAL block first, then your RESPONSE block.' }]
        : systemMessages,
    });

    const systemRawText = systemResult.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const { internal, response: systemResponse } = parseAIResponse(systemRawText);
    finalInternal = internal as Record<string, unknown> | null;

    if (!systemResponse) {
      console.log(`  Turn ${turn + 1}: [EMPTY RESPONSE — likely truncated]`);
      continue;
    }

    // Check if this is a question
    const hasQuestion = systemResponse.includes('?');
    if (hasQuestion) totalQuestions++;

    // Check for close_next (results delivery)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const closeNext = (internal as any)?.conversation?.close_next === true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadingType = (internal as any)?.hypothesis?.leading_type ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const confidence = (internal as any)?.hypothesis?.confidence ?? 0;

    // Log system turn
    const systemTurn: TranscriptTurn = {
      turn: turn + 1,
      role: 'system',
      content: systemResponse,
      internal_block: internal as Record<string, unknown> | null,
      question_tag: null, // Tagged later by question-tagger
      signals_detected: null,
      commandment_violations: [],
    };
    transcript.push(systemTurn);

    const questionSnippet = systemResponse.substring(0, 80).replace(/\n/g, ' ');
    console.log(`  Turn ${turn + 1} [SOULO]: "${questionSnippet}..." | Type ${leadingType} @ ${Math.round(confidence * 100)}%`);

    if (closeNext && !resultsDelivered) {
      resultsDelivered = true;
      console.log(`  → Results delivered: Type ${leadingType} (${Math.round(confidence * 100)}% confidence)`);
    }

    // Check for premature typing
    if (resultsDelivered && totalQuestions < 5) {
      status = 'premature_typing';
      console.log(`  ⚠ Premature typing: only ${totalQuestions} questions asked`);
    }

    // ── PERSONA TURN: Respond in character ──
    // Build persona conversation history
    if (systemMessages.length === 0) {
      // First turn: system's opening is the assistant message, persona needs to respond
      personaMessages.push({ role: 'user', content: systemResponse });
    } else {
      personaMessages.push({ role: 'user', content: systemResponse });
    }

    const personaResult = await client.messages.create({
      model: CONFIG.MODEL,
      max_tokens: 1024,
      system: personaSystemPrompt,
      messages: personaMessages,
    });

    const personaResponse = personaResult.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    // Check for conversation complete signal
    const conversationComplete = personaResponse.includes('[CONVERSATION COMPLETE]');
    const cleanedPersonaResponse = personaResponse.replace('[CONVERSATION COMPLETE]', '').trim();

    // Check for persona break (Enneagram terminology)
    const personaBreak = /\b(enneagram|type [1-9]|my type|personality type)\b/i.test(cleanedPersonaResponse);

    // Log persona turn
    const personaTurn: TranscriptTurn = {
      turn: turn + 1,
      role: 'persona',
      content: cleanedPersonaResponse,
      internal_block: null,
      question_tag: null,
      signals_detected: [], // Can be populated later
      commandment_violations: [],
    };
    transcript.push(personaTurn);

    const personaSnippet = cleanedPersonaResponse.substring(0, 80).replace(/\n/g, ' ');
    console.log(`  Turn ${turn + 1} [PERSONA]: "${personaSnippet}..."`);

    // Update conversation histories for both agents
    if (systemMessages.length === 0) {
      systemMessages.push(
        { role: 'user', content: 'Begin the Soulo Enneagram assessment now. Greet me warmly and ask your first question. Output your INTERNAL block first, then your RESPONSE block.' },
        { role: 'assistant', content: systemRawText },
        { role: 'user', content: cleanedPersonaResponse },
      );
    } else {
      systemMessages.push(
        { role: 'assistant', content: systemRawText },
        { role: 'user', content: cleanedPersonaResponse },
      );
    }

    personaMessages.push({ role: 'assistant', content: personaResponse });
    exchangeCount++;

    // ── TERMINATION CHECKS ──
    if (personaBreak) {
      status = 'persona_break';
      console.log(`  ⚠ Persona break detected!`);
      break;
    }

    if (conversationComplete) {
      status = 'complete';
      console.log(`  ✅ Conversation complete (${exchangeCount} exchanges, ${totalQuestions} questions)`);
      break;
    }

    if (resultsDelivered) {
      postResultsExchanges++;
      if (postResultsExchanges >= 3) {
        status = 'complete';
        console.log(`  ✅ Conversation complete after results (${exchangeCount} exchanges)`);
        break;
      }
    }
  }

  if (status === 'timeout') {
    console.log(`  ⚠ Timeout: ${CONFIG.MAX_TURNS} turns reached without completion`);
  }

  console.log('  ' + '─'.repeat(60));
  console.log(`  Summary: ${status} | ${exchangeCount} exchanges | ${totalQuestions} questions | Final: Type ${(finalInternal as Record<string, unknown> | null)?.hypothesis ? ((finalInternal as Record<string, Record<string, unknown>>).hypothesis.leading_type ?? '?') : '?'}`);

  return {
    transcript,
    final_internal: finalInternal,
    status,
    total_turns: exchangeCount,
    total_questions: totalQuestions,
  };
}
