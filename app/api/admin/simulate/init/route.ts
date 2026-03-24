import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { initSession, setSession, getSession } from '@/lib/session-store';
import { parseAIResponse } from '@/lib/parse-response';
import { isAdminAuthed } from '@/lib/admin-auth';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessionId = `admin-${crypto.randomUUID()}`;
    initSession(sessionId);

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: ENNEAGRAM_SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content:
            'Begin the Soulo Enneagram assessment now. You are the assessor. You lead this process from start to finish. The user does not direct this conversation — you do.\n\nOutput your INTERNAL block first, then your RESPONSE block.\n\nYour RESPONSE is the opening message. It must do exactly these things in this exact order — no more, no less:\n\n1. Name what this is in one sentence: a structured adaptive assessment, not a quiz, no right or wrong answers, takes 15-20 minutes.\n2. Tell them exactly what to expect: they will be asked different types of questions — some yes/no, some agree/disagree, some scales, some more open — and the experience adapts as it learns more about them.\n3. Ask them one direct question to confirm they are ready to begin.\n\nAfter they confirm, your very next message is your first real assessment question. From that point forward every single message follows this format without exception:\n- Maximum 2-3 sentences total\n- One brief acknowledgment of their answer (optional, skip if it adds nothing)\n- One question in a specific format: forced choice, agree/disagree, yes/no, numeric scale, frequency scale, or behavioral anchor\n- Never open-ended therapy questions\n- Never more than one question\n- Never following the user into tangents\n- You decide where this goes. Always.',
        },
      ],
    });

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    const { internal, response } = parseAIResponse(rawText);

    setSession(sessionId, {
      internalState: internal,
      conversationHistory: [{ role: 'assistant', content: response }],
    });

    const session = getSession(sessionId);

    return NextResponse.json({
      sessionId,
      response,
      internal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_parts: (internal as any)?.response_parts ?? null,
      sessionState: session,
    });
  } catch (err) {
    console.error('[admin/simulate/init] Error:', err);
    return NextResponse.json({ error: 'Failed to init simulation session' }, { status: 500 });
  }
}
