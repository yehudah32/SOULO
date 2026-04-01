export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/session-store';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ themes: [] });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ themes: [] });
    }

    // Extract user messages from conversation history
    const userMessages = session.conversationHistory
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n---\n\n');

    if (!userMessages.trim()) {
      return NextResponse.json({ themes: [] });
    }

    const prompt = `You are summarizing someone's Enneagram assessment for a verification screen. Extract 4-6 themes from what this person shared. Each theme must name a PATTERN and the STRENGTH or VALUE it reveals — never just the wound.

CRITICAL RULES:
- Every theme must feel like being SEEN, not diagnosed
- Pair every shadow with the gift driving it — they are the same energy
- Use the person's own language where possible
- Frame patterns as survival strategies, not flaws
- The person should read these and think "yes, that's me" with recognition, not shame

WRONG (deficit-only):
- "Seeks external validation before trusting own judgment"
- "Avoids conflict by pleasing others"
- "Fears rejection"

RIGHT (balanced — pattern + strength):
- "Deeply attuned to what others need — sometimes at the cost of your own voice"
- "Holds yourself to a standard most people don't even see — and it drives excellence, but it also never lets you rest"
- "Loyalty runs deep — you'd rather carry doubt silently than risk the relationship"
- "Plans three steps ahead because you've learned that preparation is how you stay safe"

Their responses:
${userMessages}

Return ONLY a JSON array of 4-6 theme strings (8-15 words each). No explanation, no code fences.`;

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    const themes = JSON.parse(cleaned);

    if (!Array.isArray(themes)) {
      return NextResponse.json({ themes: [] });
    }

    return NextResponse.json({ themes: themes.slice(0, 6) });
  } catch (err) {
    console.error('[results/verify] Error:', err);
    // Never crash — always return empty themes
    return NextResponse.json({ themes: [] });
  }
}
