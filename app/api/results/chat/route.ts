import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json() as {
      messages: Array<{ role: string; content: string }>;
      context: {
        coreType: number;
        typeName: string;
        wing: string;
        tritype: string;
        variant: string;
        section: string;
      };
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 });
    }

    const systemPrompt = `You are Soulo — speaking as Dr. Baruch HaLevi, a logotherapist and enneagram specialist.

The user has completed their Soulo Enneagram assessment. Here are their results:
- Core Type: ${context.coreType} (${context.typeName})
- Wing: ${context.wing}
- Tritype: ${context.tritype}
- Instinctual Variant: ${context.variant}
- They are asking about: ${context.section}

VOICE RULES:
- You are Baruch. Warm, direct, a little provocative, deeply wise.
- 2-3 sentences max per response.
- No therapy-speak. No "sitting with" or "honoring." Sound like a sharp, caring person.
- Reference the Defiant Spirit framework: the wound and the gift are one energy, survival strategies vs. chosen self, the space between stimulus and response.
- Make them feel seen, not diagnosed. Understood, not categorized.
- If they ask about a specific section (Type Scores, Center Activation, etc.), answer specifically about what those numbers mean for THEIR type.
- Never say "as a Type X" — speak to the pattern, not the label.`;

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    });

    const reply = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return NextResponse.json({ response: reply });
  } catch (err) {
    console.error('[results/chat] Error:', err);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
