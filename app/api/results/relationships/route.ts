export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';
import { queryKnowledgeBase } from '@/lib/rag';
import {
  buildRelationshipPrompt,
  getCacheKey,
  type RelationshipContext,
  type RelationshipDescription,
} from '@/lib/relationship-contexts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const VALID_CONTEXTS: RelationshipContext[] = ['friends', 'family', 'romantic', 'professional'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userType, otherType, context } = body;

    // Validate
    if (!sessionId || !userType || !otherType || !context) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (userType < 1 || userType > 9 || otherType < 1 || otherType > 9) {
      return NextResponse.json({ error: 'Type must be 1-9' }, { status: 400 });
    }
    if (!VALID_CONTEXTS.includes(context)) {
      return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
    }

    const cacheKey = getCacheKey(userType, otherType, context);

    // Check Supabase cache
    try {
      const { data } = await adminClient
        .from('assessment_results')
        .select('generated_results')
        .eq('session_id', sessionId)
        .single();

      const cached = (data?.generated_results as Record<string, unknown>)?.relationship_cache as Record<string, RelationshipDescription> | undefined;
      if (cached?.[cacheKey]) {
        console.log(`[relationships] cache hit: ${cacheKey}`);
        return NextResponse.json({ result: cached[cacheKey] });
      }
    } catch {
      // Cache miss or no Supabase row — proceed to generate
    }

    // Also check in-memory session cache
    const session = getSession(sessionId);
    const memCached = (session?.generatedResults as Record<string, unknown>)?.relationship_cache as Record<string, RelationshipDescription> | undefined;
    if (memCached?.[cacheKey]) {
      console.log(`[relationships] memory cache hit: ${cacheKey}`);
      return NextResponse.json({ result: memCached[cacheKey] });
    }

    // RAG query for this specific pairing
    let ragContext = '';
    try {
      const ragQuery = `Type ${userType} relationship dynamic with Type ${otherType} enneagram ${context} Defiant Spirit`;
      ragContext = await queryKnowledgeBase(ragQuery);
    } catch {
      // RAG failure is non-blocking — prompt has enough type knowledge
    }

    // Generate via Claude
    const { system, user } = buildRelationshipPrompt(userType, otherType, context, ragContext);

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as RelationshipDescription;

    // Validate all 5 fields
    const fields: (keyof RelationshipDescription)[] = ['title', 'how_you_show_up', 'the_dynamic', 'growth_edge', 'watch_out_for'];
    for (const f of fields) {
      if (!parsed[f]?.trim()) {
        console.warn(`[relationships] empty field: ${f}`);
      }
    }

    console.log(`[relationships] generated: ${cacheKey} — "${parsed.title}"`);

    // Cache in Supabase (fire-and-forget)
    (async () => {
      try {
        const { data } = await adminClient
          .from('assessment_results')
          .select('generated_results')
          .eq('session_id', sessionId)
          .single();
        if (data) {
          const existing = (data.generated_results as Record<string, unknown>) || {};
          const existingCache = (existing.relationship_cache as Record<string, unknown>) || {};
          await adminClient
            .from('assessment_results')
            .update({
              generated_results: {
                ...existing,
                relationship_cache: { ...existingCache, [cacheKey]: parsed },
              },
            })
            .eq('session_id', sessionId);
        }
      } catch { /* fire-and-forget */ }
    })();

    return NextResponse.json({ result: parsed });
  } catch (err) {
    console.error('[relationships] error:', err);
    return NextResponse.json({ error: 'Failed to generate relationship description' }, { status: 500 });
  }
}
