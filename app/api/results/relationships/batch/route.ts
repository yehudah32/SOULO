export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminClient } from '@/lib/supabase';
import { TYPE_NAMES } from '@/lib/relationship-contexts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userType } = await req.json();
    if (!sessionId || !userType || userType < 1 || userType > 9) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Check if already cached in Supabase
    let existingResults: Record<string, unknown> = {};
    try {
      const { data: existing } = await adminClient
        .from('assessment_results')
        .select('generated_results')
        .eq('session_id', sessionId)
        .single();
      existingResults = (existing?.generated_results || {}) as Record<string, unknown>;
    } catch {
      // No row found — proceed to generate
    }
    const existingRelCtx = existingResults.relationship_context_descriptions as Record<string, unknown> | undefined;

    if (existingRelCtx && Object.keys(existingRelCtx).length >= 28) {
      console.log('[rel/batch] cache hit — returning existing');
      return NextResponse.json({ descriptions: existingRelCtx });
    }

    // Generate all 32 descriptions in one call
    const otherTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(t => t !== userType);
    const contexts = ['friends', 'family', 'romantic', 'professional'];
    const keys = otherTypes.flatMap(t => contexts.map(c => `${t}-${c}`));
    const typeName = TYPE_NAMES[userType] || `Type ${userType}`;

    console.log(`[rel/batch] generating 32 descriptions for Type ${userType}...`);

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      system: `You generate Enneagram relationship insights in Dr. Baruch HaLevi's Defiant Spirit voice. Every pairing has gifts and growth edges — no pairing is "bad." Address the reader as "you" (they are Type ${userType}). Return ONLY valid JSON. No markdown. No backticks.`,
      messages: [{
        role: 'user',
        content: `Generate relationship descriptions for Type ${userType} (${typeName}) paired with each of the other 8 types across 4 contexts (friends, family, romantic, professional).

For EACH of these 32 combinations, write concise content (2-3 sentences per field):

Key format: "{otherType}-{context}" — e.g., "7-friends", "3-romantic"

Each context MUST describe a genuinely different dynamic. A romantic relationship between Types 1 and 7 is fundamentally different from a professional one.

Return this JSON structure:
{
${keys.slice(0, 2).map(k => `  "${k}": {"title":"<engaging title for this pairing in this context>","how_you_show_up":"<2-3 sentences>","the_dynamic":"<2-3 sentences>","growth_edge":"<2-3 sentences>","watch_out_for":"<2-3 sentences>"}`).join(',\n')},
  ... (all 32 keys: ${keys.join(', ')})
}`,
      }],
    });

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');

    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    console.log(`[rel/batch] generated ${Object.keys(parsed).length} descriptions`);

    // Cache in Supabase
    try {
      await adminClient
        .from('assessment_results')
        .update({
          generated_results: {
            ...existingResults,
            relationship_context_descriptions: parsed,
          },
        })
        .eq('session_id', sessionId);
      console.log('[rel/batch] cached in Supabase');
    } catch { /* non-blocking */ }

    return NextResponse.json({ descriptions: parsed });
  } catch (err) {
    console.error('[rel/batch] error:', err);
    return NextResponse.json({ error: 'Failed to generate batch descriptions' }, { status: 500 });
  }
}
