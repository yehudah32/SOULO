// Relationship context types, prompt builder, and cache utilities
// Used by the on-demand relationship generation API

export type RelationshipContext = 'friends' | 'family' | 'romantic' | 'professional';

export interface RelationshipDescription {
  title: string;
  how_you_show_up: string;
  the_dynamic: string;
  growth_edge: string;
  watch_out_for: string;
}

export const CONTEXT_META: Record<RelationshipContext, { label: string; color: string; icon: string }> = {
  friends: { label: 'Friends', color: '#2563EB', icon: '👥' },
  family: { label: 'Family', color: '#7C3AED', icon: '🏠' },
  romantic: { label: 'Romantic', color: '#E11D48', icon: '💕' },
  professional: { label: 'Professional', color: '#D97706', icon: '💼' },
};

export const TYPE_NAMES: Record<number, string> = {
  1: 'The Reformer', 2: 'The Helper', 3: 'The Achiever',
  4: 'The Individualist', 5: 'The Investigator', 6: 'The Loyalist',
  7: 'The Enthusiast', 8: 'The Challenger', 9: 'The Peacemaker',
};

const CONTEXT_FRAMING: Record<RelationshipContext, string> = {
  friends: 'as close friends — how they hang out, what they bond over, where friction lives in the friendship, and what makes this friendship worth fighting for.',
  family: 'as family members — how family roles and obligations shape their dynamic, where family patterns trigger old wounds, and what healing looks like between them.',
  romantic: 'as romantic partners — what draws them together, how intimacy and vulnerability play out, where the relationship gets stuck, and what deep love looks like between these two types.',
  professional: 'as professional colleagues or collaborators — how they work together, where their work styles clash, what they build when aligned, and how power and responsibility flow between them.',
};

export function getCacheKey(userType: number, otherType: number, context: RelationshipContext): string {
  const min = Math.min(userType, otherType);
  const max = Math.max(userType, otherType);
  return `${min}-${max}-${context}-from${userType}`;
}

export function buildRelationshipPrompt(
  userType: number,
  otherType: number,
  context: RelationshipContext,
  ragContext: string,
): { system: string; user: string } {
  const userName = TYPE_NAMES[userType] || `Type ${userType}`;
  const otherName = TYPE_NAMES[otherType] || `Type ${otherType}`;
  const framing = CONTEXT_FRAMING[context];

  const system = `You are Dr. Baruch HaLevi generating relationship insights in the Defiant Spirit voice.

RULES:
- Return ONLY valid JSON. No markdown. No backticks.
- Frame every pairing as having GIFTS and GROWTH EDGES — no pairing is "bad" or "incompatible" in any context.
- The person reading this is Type ${userType}. Write from THEIR perspective — "you" means Type ${userType}.
- Be specific to THIS context (${context}). A romantic dynamic is fundamentally different from a professional one. Do not write generic compatibility.
- Keep each field to 2-3 punchy sentences. The user is exploring, not reading an essay.
- Use plain language that lands in the body, not the head. No jargon.
- The wound and the gift are the same energy — unconscious or chosen.

${ragContext ? `KNOWLEDGE BASE CONTEXT (use if relevant):\n${ragContext}` : ''}`;

  const user = `Generate the relationship dynamic between Type ${userType} (${userName}) and Type ${otherType} (${otherName}) ${framing}

The person reading this IS Type ${userType}. Address them as "you."

Return this exact JSON:
{
  "title": "<engaging title for this pairing in this context, e.g., 'The ${userType} and ${otherType} ${context === 'romantic' ? 'in Love' : context === 'professional' ? 'at Work' : context === 'family' ? 'in the Family' : 'as Friends'}: [vivid 2-4 word descriptor]'>",
  "how_you_show_up": "<2-3 sentences — what YOU (Type ${userType}) bring to this ${context} relationship. Your strengths, your default patterns, your blind spots in THIS context.>",
  "the_dynamic": "<2-3 sentences — what draws these types together AND what creates tension in THIS specific context. Be concrete — name the specific push-pull.>",
  "growth_edge": "<2-3 sentences — what each type can learn from the other in THIS context. Frame as gifts, not corrections.>",
  "watch_out_for": "<2-3 sentences — the most common friction point in THIS context, framed constructively. Not 'this is bad' but 'here's where to pay attention.'>",
}`;

  return { system, user };
}
