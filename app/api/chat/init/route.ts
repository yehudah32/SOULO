import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { initSession, setSession, getSession } from '@/lib/session-store';
import { parseAIResponse } from '@/lib/parse-response';
import { hasTypeSignatures } from '@/lib/vector-scorer';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Vector mode controls whether the embedding scorer runs in front of Claude
// or behind. Must match the flag in chat/route.ts.
//
//   'off'    — pure Claude, no vector scoring at all
//   'shadow' — Claude is the primary scorer; vector v2 runs after each turn
//              and logs its prediction next to Claude's for validation. This
//              is the safe default until vector v2 reaches >95% agreement
//              with Claude on real assessments.
//   'hybrid' — vector v2 in front for early phases, Claude for differentiation
//              (future state — only after shadow validation passes)
const VECTOR_MODE: 'off' | 'shadow' | 'hybrid' = 'shadow';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      email?: string;
      userId?: string;
      demographics?: {
        ageRange?: string;
        gender?: string;
        ethnicity?: string;
        country?: string;
        religion?: string;
      };
    };
    const sessionId = crypto.randomUUID();
    initSession(sessionId);

    // useVectorScoring is the legacy "vector in front" flag. Only set it true
    // when VECTOR_MODE === 'hybrid' AND signatures exist. Shadow mode does not
    // touch this flag — it lets Claude run normally and logs vector
    // predictions afterwards.
    if (VECTOR_MODE === 'hybrid') {
      try {
        const signaturesReady = await hasTypeSignatures();
        if (signaturesReady) {
          setSession(sessionId, { useVectorScoring: true });
          console.log(`[init] Hybrid mode enabled for session ${sessionId}`);
        }
      } catch (err) {
        console.warn('[init] Could not check type signatures, continuing Claude-only:', err);
      }
    }

    // Store email if provided
    if (body.email && typeof body.email === 'string' && body.email.trim()) {
      setSession(sessionId, { email: body.email.trim() });
    }

    // Store userId if provided (from user auth)
    if (body.userId && typeof body.userId === 'string') {
      setSession(sessionId, { userId: body.userId });
    }

    // Store demographics if provided
    if (body.demographics && typeof body.demographics === 'object') {
      setSession(sessionId, {
        demographics: {
          ageRange: body.demographics.ageRange || '',
          gender: body.demographics.gender || '',
          ethnicity: body.demographics.ethnicity || '',
          country: body.demographics.country || '',
          religion: body.demographics.religion || '',
        },
      });
    }

    // HYBRID MODE: Skip Claude init call — use pre-written opening
    const session = getSession(sessionId);
    if (session?.useVectorScoring) {
      const openingMessage = `This is a structured adaptive assessment — not a quiz. There are no right or wrong answers, and it takes about 15 minutes.\n\n- You'll be asked different types of questions — some yes/no, some scales, some short reflections\n- The experience adapts as it learns more about you\n\nAre you ready to begin?`;

      setSession(sessionId, {
        conversationHistory: [{ role: 'assistant', content: openingMessage }],
      });

      console.log('[init] Hybrid mode — pre-written opening (no Claude call)');
      return NextResponse.json({
        sessionId,
        message: openingMessage,
        response: openingMessage,
        internal: null,
        currentSection: 'Who You Are',
      });
    }

    // CLAUDE MODE: Standard init with Claude call
    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: ENNEAGRAM_SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content:
            'Begin the Soulo Enneagram assessment now. You are the assessor. You lead this process from start to finish. The user does not direct this conversation — you do.\n\nOutput your INTERNAL block first, then your RESPONSE block.\n\nYour RESPONSE is the opening message. It must do exactly these things in this exact order — no more, no less:\n\n1. Name what this is in one sentence: a structured adaptive assessment, not a quiz, no right or wrong answers, takes 15-20 minutes.\n2. Outline exactly what to expect using a bulleted list (start each line with a "- " prefix):\n  - You will be asked different types of questions (yes/no, scales, short answer reflections)\n  - The experience adapts as it learns more about you\n3. End with one distinct sentence asking a direct question to confirm they are ready to begin.\n\nAfter they confirm, your very next message is your first real assessment question. From that point forward every single message follows this format without exception:\n- Maximum 2-3 sentences total\n- One brief acknowledgment of their answer (optional, skip if it adds nothing)\n- One question in a specific format: forced choice, agree/disagree, yes/no, numeric scale, frequency scale, or behavioral anchor\n- Never open-ended therapy questions\n- Never more than one question\n- Never following the user into tangents\n- You decide where this goes. Always.',
        },
      ],
    });

    // Handle multi-block response (may include web_search tool_use blocks)
    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    const { internal, response } = parseAIResponse(rawText);

    const currentSection: string =
      internal?.current_section ?? 'Who You Are';

    console.log('[init] INTERNAL parsed:', internal !== null);
    console.log('[init] Leading type:', internal?.hypothesis?.leading_type ?? 'n/a');
    console.log('[init] Section:', currentSection);

    setSession(sessionId, {
      internalState: internal,
      conversationHistory: [{ role: 'assistant', content: response }],
    });

    // Return both message (backward compat) and response+internal (new UI)
    return NextResponse.json({ sessionId, message: response, response, internal, currentSection });
  } catch (err) {
    console.error('[init] Error:', err);
    return NextResponse.json(
      { error: 'Unable to start assessment. Please try again.' },
      { status: 500 }
    );
  }
}
