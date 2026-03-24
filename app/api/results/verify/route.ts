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

    const prompt = `You are analyzing someone's Enneagram assessment responses. Extract 4-6 key themes that authentically emerged from what THIS SPECIFIC PERSON said — use their own words and concepts where possible.

Their responses:
${userMessages}

Return ONLY a JSON array of 4-6 short theme strings (5-10 words each). No explanation, no code fences.
Example: ["Values deep one-on-one connection over group settings", "Tends to plan before acting"]`;

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
