import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ENNEAGRAM_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { getSession, setSession } from '@/lib/session-store';
import { parseAIResponse } from '@/lib/parse-response';
import { queryKnowledgeBase } from '@/lib/rag';
import { getQuestionBank } from '@/lib/question-bank';
import { isAdminAuthed } from '@/lib/admin-auth';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function deriveStage(exchangeCount: number): number {
  if (exchangeCount <= 2) return 1;
  if (exchangeCount <= 5) return 2;
  if (exchangeCount <= 8) return 3;
  if (exchangeCount <= 11) return 4;
  if (exchangeCount <= 13) return 5;
  if (exchangeCount <= 15) return 6;
  return 7;
}

function getAllowedFormats(stage: number): string {
  if (stage <= 2) return 'forced_choice, agree_disagree';
  if (stage <= 4) return 'agree_disagree, scale, frequency';
  if (stage <= 6) return 'behavioral_anchor, paragraph_select, scenario';
  return 'open';
}

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId, message } = await request.json() as { sessionId: string; message: string };

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing sessionId or message' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Build conversation from session history
    const messages: Anthropic.MessageParam[] = [
      ...session.conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Get RAG context and question bank
    const stage = deriveStage(session.exchangeCount);
    const leadingType = session.internalState?.hypothesis?.leading_type ?? 0;
    const lastFormat = session.lastQuestionFormat ?? '';
    const needsDiff = session.internalState?.hypothesis?.needs_differentiation?.[0]
      ? String(session.internalState.hypothesis.needs_differentiation[0])
      : null;
    const allowedFormats = getAllowedFormats(stage);

    let ragResults = '';
    try {
      ragResults = await queryKnowledgeBase(message);
    } catch {
      // RAG is optional
    }

    const candidateQuestions = await getQuestionBank(leadingType, needsDiff, stage, lastFormat, 8);

    const candidateQsBlock = candidateQuestions.length > 0
      ? `\n\nCANDIDATE QUESTIONS FOR THIS TURN (stage ${stage}, allowed formats: ${allowedFormats}):\n` +
        candidateQuestions
          .map((q, i) =>
            `${i + 1}. [ID:${q.id}] [format:${q.format}] [oyn:${q.oyn_dim}] [lens:${q.react_respond_lens}]\n   "${q.question_text}"`
          )
          .join('\n') +
        `\n\nIf one of these fits your current hypothesis and information needs, use it (rephrase freely to match your voice) and report its ID in selected_question_id. If none fit, generate your own and set selected_question_id to null. REMEMBER: only ${allowedFormats} formats are allowed at stage ${stage}.`
      : '';

    const systemPrompt =
      ENNEAGRAM_SYSTEM_PROMPT +
      (ragResults
        ? `\n\nRELEVANT DEFIANT SPIRIT KNOWLEDGE BASE CONTEXT:\n${ragResults}\n\nThis is proprietary material by Dr. Baruch HaLevi. Prioritize it.`
        : '') +
      candidateQsBlock;

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages,
    });

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');

    const { internal, response } = parseAIResponse(rawText);

    // Update session
    const isComplete = internal?.conversation?.close_next === true;
    setSession(sessionId, {
      internalState: internal,
      exchangeCount: session.exchangeCount + 1,
      conversationHistory: [
        ...session.conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: response },
      ],
      lastQuestionFormat: internal?.conversation?.last_question_format ?? lastFormat,
      currentStage: stage,
      isComplete,
    });

    const updatedSession = getSession(sessionId);

    return NextResponse.json({
      response,
      internal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_parts: (internal as any)?.response_parts ?? null,
      isComplete,
      stage,
      exchangeCount: (updatedSession?.exchangeCount ?? 0),
      sessionState: updatedSession,
    });
  } catch (err) {
    console.error('[admin/simulate/send] Error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
