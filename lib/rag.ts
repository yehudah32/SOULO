import OpenAI from 'openai';
import { adminClient } from './supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function queryKnowledgeBase(query: string): Promise<string> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data, error } = await adminClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.40,
      match_count: 10,
    });

    if (error || !data || data.length === 0) {
      return '';
    }

    // Filter out boilerplate/header chunks (copyright, TOC, short fragments)
    const filtered = (data as Array<{ content: string; metadata: Record<string, unknown>; similarity: number }>)
      .filter((doc) => {
        const c = doc.content.trim();
        if (c.length < 80) return false; // Too short to be useful
        if (c.includes('ALL RIGHTS RESERVED')) return false;
        if (c.includes('WWW.DEFIANTSPIRIT')) return false;
        if (c.includes('© SOUL CENTERED')) return false;
        if (c.includes('Table of Contents')) return false;
        return true;
      })
      .slice(0, 5); // Keep top 5 after filtering

    if (filtered.length === 0) return '';

    const formatted = filtered
      .map((doc, index) => {
        const source = (doc.metadata?.filename as string) ?? `Source ${index + 1}`;
        return `[${source}]\n${doc.content}`;
      })
      .join('\n\n---\n\n');

    return formatted;
  } catch {
    return '';
  }
}
