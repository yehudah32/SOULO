export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession, setSession, initSession } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';
import { queryKnowledgeBase } from '@/lib/rag';
import {
  RELEASE_LINES,
  STRESS_LINES,
  CENTER_MAP,
  TYPE_NAMES,
  selectTritype,
  getLowestType,
  getSecondaryInfluences,
  getWingTypes,
} from '@/lib/enneagram-lines';
import { analyzePersonalitySystems, buildAnalyzerInput } from '@/lib/personality-analyzer';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Multi-turn helper for web search tool use
async function generateWithTools(
  apiClient: Anthropic,
  params: {
    system: string;
    messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>;
    maxTokens: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: any[];
  }
): Promise<string> {
  let messages = [...params.messages] as Anthropic.MessageParam[];

  for (let round = 0; round < 4; round++) {
    const result = await apiClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: params.maxTokens,
      system: params.system,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: params.tools as any,
    });

    const textContent = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    if (result.stop_reason === 'end_turn') {
      return textContent;
    }

    if (result.stop_reason === 'tool_use') {
      const toolResults = result.content
        .filter((b) => b.type === 'tool_use')
        .map((block) => ({
          type: 'tool_result' as const,
          tool_use_id: (block as { id: string }).id,
          content: '',
        }));

      messages = [
        ...messages,
        { role: 'assistant', content: result.content } as Anthropic.MessageParam,
        { role: 'user', content: toolResults } as Anthropic.MessageParam,
      ];
      continue;
    }

    return textContent;
  }

  throw new Error('[generate] tool loop exceeded max rounds');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, forceRegenerate } = body as { sessionId: string; forceRegenerate?: boolean };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    let session = getSession(sessionId);

    // If session not in memory (server restart), reconstruct from Supabase
    if (!session) {
      const { data: progress } = await adminClient
        .from('assessment_progress')
        .select('user_id, conversation_history, internal_state, exchange_count, current_stage')
        .eq('session_id', sessionId)
        .maybeSingle();

      const { data: existingResult } = await adminClient
        .from('assessment_results')
        .select('leading_type, type_scores, wing_signals, variant_signals, whole_type_signals, oyn_dimensions, defiant_spirit, domain_signals, generated_results, user_id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!progress && !existingResult) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Reconstruct minimal session from DB
      initSession(sessionId);
      const reconstructed: Partial<Parameters<typeof setSession>[1]> = {
        userId: progress?.user_id || existingResult?.user_id || '',
        conversationHistory: progress?.conversation_history || [],
        internalState: progress?.internal_state || null,
        exchangeCount: progress?.exchange_count || existingResult?.leading_type ? 15 : 0,
        currentStage: progress?.current_stage || 7,
        isComplete: true,
      };
      if (existingResult) {
        reconstructed.generatedResults = forceRegenerate ? null : (existingResult.generated_results as Record<string, unknown> | null);
      }
      setSession(sessionId, reconstructed as Parameters<typeof setSession>[1]);
      session = getSession(sessionId);

      if (!session) {
        return NextResponse.json({ error: 'Failed to reconstruct session' }, { status: 500 });
      }

      console.log('[results/generate] Session reconstructed from Supabase for:', sessionId);
    }

    // If forceRegenerate, clear cached results so we start fresh
    if (forceRegenerate && session.generatedResults) {
      console.log('[results/generate] Force regenerating — clearing cached results');
      setSession(sessionId, { generatedResults: null });
      // Also clear in Supabase
      adminClient.from('assessment_results')
        .update({ generated_results: null })
        .eq('session_id', sessionId)
        .then(() => {});
    }

    // Cache check — skip if forceRegenerate
    if (session.generatedResults && !forceRegenerate) {
      const cached = { ...session.generatedResults };
      // Override tritype with correct center-based calculation
      const cachedTypeScores: Record<number, number> = {};
      const rawCachedScores = session.internalState?.hypothesis?.type_scores || {};
      for (const [k, v] of Object.entries(rawCachedScores)) {
        cachedTypeScores[Number(k)] = v;
      }
      if (Object.keys(cachedTypeScores).length >= 3) {
        const correctedTritype = selectTritype(cachedTypeScores);
        cached.tritype = correctedTritype.tritype;
      }
      // Override wing with correct wrapping
      const cachedLeading = session.internalState?.hypothesis?.leading_type ?? 0;
      if (cachedLeading > 0) {
        const cachedWingAdj = getWingTypes(cachedLeading);
        const ws = session.internalState?.wing_signals ?? { left: 0, right: 0 };
        const cachedWingDom = (ws as Record<string, number>).left > (ws as Record<string, number>).right
          ? cachedWingAdj[0] : cachedWingAdj[1];
        cached.wing = `${cachedLeading}w${cachedWingDom}`;
      }
      // Merge raw assessment data from session
      if (session.internalState?.hypothesis?.type_scores) {
        cached.type_scores = session.internalState.hypothesis.type_scores;
      }
      if (session.wholeTypeSignals) cached.whole_type_signals = session.wholeTypeSignals;
      if (session.internalState?.variant_signals) cached.variant_signals = session.internalState.variant_signals;
      if (session.internalState?.wing_signals) cached.wing_signals = session.internalState.wing_signals;
      if (session.internalState?.oyn_dimensions) cached.oyn_dimensions = session.internalState.oyn_dimensions;
      if (session.internalState?.defiant_spirit) cached.defiant_spirit = session.internalState.defiant_spirit;
      if (session.domainSignals) cached.domain_signals = session.domainSignals;

      // Patch missing domain insights with a fast, targeted LLM call
      const cachedDI = cached.domain_insights as Record<string, { react?: string; respond?: string }> | undefined;
      const diEmpty = !cachedDI || (typeof cachedDI === 'object' && !Array.isArray(cachedDI) &&
        Object.values(cachedDI).every(
          v => typeof v === 'object' && !((v?.react ?? '').trim() || (v?.respond ?? '').trim())
        ));
      if (diEmpty && (cached.leading_type || cached.core_type)) {
        console.log('[results/generate] Domain insights empty — running fast patch for session:', sessionId);
        try {
          const patchType = (cached.leading_type || cached.core_type) as number;
          const patchWing = (cached.wing as string) || '';
          const patchVariant = (cached.instinctual_variant as string) || '';
          const patchTritype = (cached.tritype as string) || '';
          const patchRes = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: `You generate Enneagram domain insights in Dr. Baruch HaLevi's Defiant Spirit voice. Return ONLY valid JSON. No markdown.`,
            messages: [{
              role: 'user',
              content: `Generate domain insights for Enneagram Type ${patchType}, wing ${patchWing}, variant ${patchVariant}, tritype ${patchTritype}.

For each of the 4 life domains, write how this type's pattern shows up as an automatic "react" pattern and a conscious "respond" pathway. 1-2 sentences each, grounded and specific.

Return this exact JSON:
{
  "relationships": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},
  "wealth": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},
  "leadership": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},
  "transformation": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"}
}`
            }],
          });
          const patchText = patchRes.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('')
            .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const patchedDI = JSON.parse(patchText);
          cached.domain_insights = patchedDI;

          // Persist the patch to cached results
          const updatedGenerated = { ...(session.generatedResults as Record<string, unknown>), domain_insights: patchedDI };
          setSession(sessionId, { generatedResults: updatedGenerated });
          adminClient.from('assessment_results')
            .update({ generated_results: updatedGenerated })
            .eq('session_id', sessionId)
            .then(() => console.log('[results/generate] Domain insights patch persisted'));
        } catch (patchErr) {
          console.warn('[results/generate] Domain insights patch failed:', patchErr);
        }
      }

      return NextResponse.json({ results: cached });
    }

    const { internalState, conversationHistory } = session;
    const leadingType = internalState?.hypothesis?.leading_type ?? 0;
    const confidence = internalState?.hypothesis?.confidence ?? 0;
    const variantSignals = internalState?.variant_signals ?? {};
    const wingSignals = internalState?.wing_signals ?? {};
    const defiantSpiritTypeName = session.defiantSpiritTypeName ?? '';
    const oynDimensions = internalState?.oyn_dimensions ?? {};
    const defiantSpirit = internalState?.defiant_spirit ?? {} as { react_pattern_observed?: string; respond_glimpsed?: string };
    const domainSignals = session.domainSignals ?? [];

    // Last 10 conversation turns for context
    const recentHistory = conversationHistory.slice(-10);
    const historyText = recentHistory
      .map((m) => `${m.role === 'user' ? 'Person' : 'Soulo'}: ${m.content}`)
      .join('\n');

    const dominantVariantEntry = Object.entries(variantSignals as Record<string, number>)
      .sort(([, a], [, b]) => b - a)[0];
    const dominantVariant = dominantVariantEntry?.[0] ?? '';

    // Wing calculation with proper circular wrapping (9→1, 1→9)
    const wingAdj = getWingTypes(leadingType); // [prev, next] with correct modulo
    const wingDominant =
      (wingSignals as Record<string, number>).left > (wingSignals as Record<string, number>).right
        ? wingAdj[0]   // prev (left wing)
        : wingAdj[1];  // next (right wing)

    // Compute tritype correctly (one type per center)
    const rawTypeScores = internalState?.hypothesis?.type_scores || {};
    const typeScores: Record<number, number> = {};
    for (const [k, v] of Object.entries(rawTypeScores)) {
      typeScores[Number(k)] = v;
    }

    const tritypeResult = Object.keys(typeScores).length
      ? selectTritype(typeScores)
      : { tritype: session.tritype || '', body: 0, heart: 0, head: 0 };

    const lowestType = Object.keys(typeScores).length
      ? getLowestType(typeScores)
      : null;

    const secondaryInfluences = Object.keys(typeScores).length
      ? getSecondaryInfluences(typeScores, tritypeResult)
      : [];

    const stressType = RELEASE_LINES[leadingType] ? STRESS_LINES[leadingType] : null;
    const releaseType = RELEASE_LINES[leadingType] || null;

    const wingTypes = getWingTypes(leadingType);

    // Store computed values in session
    setSession(sessionId, {
      tritypeTypes: { body: tritypeResult.body, heart: tritypeResult.heart, head: tritypeResult.head },
      lowestScoringType: lowestType,
      secondaryInfluences,
      stressLineType: stressType,
      releaseLineType: releaseType,
    });

    // Build RAG queries — run all in parallel
    const relationshipTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(t => t !== leadingType);

    const ragQueries = [
      `Type ${leadingType} Defiant Spirit enneagram ${dominantVariant} core pattern`,
      `Type ${leadingType} stress line release line integration disintegration enneagram`,
      `Type ${leadingType} superpower kryptonite wound gift enneagram`,
      `Type ${leadingType} react respond pattern survival strategy`,
      `Type ${leadingType} relationships wealth leadership domain enneagram`,
      `tritype ${tritypeResult.tritype} archetype enneagram`,
      ...relationshipTypes.map(t => `Type ${leadingType} relationship dynamic with Type ${t} enneagram`),
    ];

    const allRagResults = await Promise.all(
      ragQueries.map(q => queryKnowledgeBase(q).catch(() => ''))
    );

    const ragContext = allRagResults.filter(Boolean).join('\n\n---\n\n');

    // Build demographic context string
    const demo = session.demographics;
    const demoContext = demo
      ? `
User demographics (for cultural relevance only):
  Age range: ${demo.ageRange || 'not specified'}
  Gender: ${demo.gender || 'not specified'}
  Background: ${demo.ethnicity || 'not specified'}
  Country: ${demo.country || 'not specified'}
  Spirituality: ${demo.religion || 'not specified'}

When selecting famous examples, prefer people who
feel culturally relevant to this person.
Do not make assumptions about their beliefs.
Do not filter by religion — use it as broad cultural
context only. Prefer diverse, international examples.
A person from Brazil should see examples from Latin
American artists and leaders, not only American ones.`
      : '';

    // Build celebrity search queries
    const celebrityQueries: string[] = [
      `enneagram type ${leadingType} famous examples`,
      `enneagram ${TYPE_NAMES[leadingType]} well known people`,
    ];
    if (demo?.gender && demo.gender !== 'Prefer not to say') {
      celebrityQueries.push(`enneagram type ${leadingType} famous ${demo.gender.toLowerCase()}s`);
    }
    if (demo?.country) {
      celebrityQueries.push(`enneagram type ${leadingType} ${demo.country} celebrities`);
    }

    const contextBlock = `
Type: ${leadingType} (${defiantSpiritTypeName || 'Type ' + leadingType})
Confidence: ${Math.round(confidence * 100)}%
Wing: ${leadingType}w${wingDominant}
Instinctual Variant: ${dominantVariant}
Tritype: ${tritypeResult.tritype}
  Body center type: ${tritypeResult.body}
  Heart center type: ${tritypeResult.heart}
  Head center type: ${tritypeResult.head}
Stress line: Type ${stressType} (${TYPE_NAMES[stressType || 1]})
Release line: Type ${releaseType} (${TYPE_NAMES[releaseType || 7]})
Lowest scoring type: ${lowestType}
Secondary influences: ${secondaryInfluences.join(', ')}
Life Domains (generate insights for ALL four): Relationships, Wealth, Leadership, Transformation
${domainSignals.length > 0 ? `Domains directly explored in conversation: ${domainSignals.join(', ')}` : 'No domain-specific questions were asked — deduce domain patterns from type data, conversation context, and Enneagram knowledge.'}
React Pattern: ${defiantSpirit.react_pattern_observed ?? ''}
Respond Pattern: ${defiantSpirit.respond_glimpsed ?? ''}
OYN Dimensions: ${JSON.stringify(oynDimensions)}

Recent conversation (last 10 turns):
${historyText}
`;

    const systemPrompt = `You are generating Defiant Spirit assessment results for a person who completed the Soulo Enneagram assessment. Write in Dr. Baruch HaLevi's Defiant Spirit voice throughout. Never use generic Enneagram language.

RESULTS LANGUAGE PHILOSOPHY:
Every section of these results must move the person toward liberation, not classification.

The primary type reveal must follow this arc:
1. Open with what it feels like to live inside this pattern — in plain human language, not psychological terminology. Speak from inside their experience. Make them feel seen before anything else.
2. Name what the survival strategy has cost them. Be honest. Do not soften it.
3. Reveal that their kryptonite and their superpower are the same energy. The passion (wound) and the virtue (gift) are not opposites. They are one force — unconscious or chosen.
4. Point toward what was always there — their Holy Idea, their calling, the thing the survival strategy buried. This is not something to build. It is something to remember.

LANGUAGE RULES:
- Never write "you are a Type X" or "as a [type name]"
- Never write in a way that makes the number feel like a fixed identity
- Always write toward choice, consciousness, and the respond pathway
- Use plain language that lands in the body, not the head

SUPERPOWER vs KRYPTONITE vs REACT vs RESPOND — CRITICAL DISTINCTION:
These are TWO DIFFERENT PAIRS. Do NOT conflate them. Do NOT leave any empty.

SUPERPOWER & KRYPTONITE (the wound and the gift):
- SUPERPOWER = the GIFT of this type at its best. The conscious, chosen
  expression of their core energy. What makes them extraordinary when
  they're awake to it. Write about the positive force — integrity,
  warmth, drive, depth, insight, loyalty, joy, power, peace — whatever
  this type brings when it's chosen consciously. Be specific to THIS
  person based on their assessment responses.
- KRYPTONITE = the WOUND — the same energy as the superpower, but
  unconscious, compulsive, fear-driven. What happens when the gift
  runs on autopilot. The inner critic, the people-pleasing, the
  image management, the withdrawal — the shadow side. Be specific
  and honest. The wound and the gift are ONE FORCE.

REACT & RESPOND (the behavioral patterns):
- REACT = what this person does automatically under stress. The
  survival strategy in action. Specific behaviors, not abstractions.
  "You go quiet and start internally auditing every decision" not
  "you become stressed."
- RESPOND = what becomes possible when they catch the reaction and
  choose differently. The conscious alternative. The space between
  stimulus and response. "You notice the inner critic firing and
  choose to stay present instead of retreating into self-correction."

These four fields MUST ALL be substantive, specific to this person,
and clearly distinct from each other. Never use generic fallback text.

DOMAIN INSIGHTS — MANDATORY:
You MUST generate meaningful, non-empty "react" and "respond" content for ALL four life domains: relationships, wealth, leadership, and transformation.
- Use the person's core type, wing, instinctual variant, tritype, stress/release lines, and conversation responses to infer how their pattern plays out in each domain.
- If the conversation touched on a domain directly, incorporate that. If not, deduce from the type profile — every type has predictable patterns across all four domains.
- "react" = the automatic, unconscious pattern in that domain.
- "respond" = the conscious, liberated alternative.
- Never return empty strings for any domain insight field.

KNOWLEDGE BASE CONTEXT (prioritize this):
${ragContext}

${demoContext}

Return ONLY valid JSON with double quotes. No markdown. No backticks. No explanation.`;

    const userPrompt = `Generate complete results for:
${contextBlock}

Celebrity search context:
${celebrityQueries.map(q => `Search for: "${q}"`).join('\n')}

Return this exact JSON structure:
{
  "leading_type": ${leadingType},
  "core_type": ${leadingType},
  "type_name": "<standard Enneagram type name>",
  "core_type_name": "<standard Enneagram type name>",
  "core_type_description": "<2-3 sentences following the four-beat arc>",
  "defiant_spirit_type_name": "<Defiant Spirit name>",
  "confidence_pct": ${Math.round(confidence * 100)},
  "confidence": ${confidence},
  "wing": "${leadingType}w${wingDominant}",
  "wing_name": "<wing description name>",
  "wing_description": "<1-2 sentences>",
  "instinctual_variant": "${dominantVariant}",
  "subtype_name": "<subtype name>",
  "subtype_description": "<1-2 sentences>",
  "tritype": "${tritypeResult.tritype}",
  "tritype_archetype": "<archetype name if known>",
  "tritype_archetype_fauvre": "<Fauvre archetype name>",
  "tritype_archetype_ds": "<Defiant Spirit archetype name>",
  "tritype_life_purpose": "<1-2 sentences>",
  "tritype_blind_spot": "<1-2 sentences>",
  "tritype_growing_edge": "<1-2 sentences>",
  "tritype_core_triggers": "<1-2 sentences>",
  "headline": "<one powerful sentence about this person's core gift>",
  "superpower": "<2-3 sentences — the GIFT: the positive, conscious expression of this type's core energy. What makes them powerful, trustworthy, effective. The thing people admire about them. This is the LIGHT side.>",
  "superpower_description": "<expanded 2-3 sentences of the superpower>",
  "kryptonite": "<2-3 sentences — the WOUND: the unconscious, fear-driven shadow of the same energy. What happens when the superpower runs on autopilot. The inner critic, the compulsion, the thing that exhausts them. This is the SHADOW side.>",
  "kryptonite_description": "<expanded 2-3 sentences of the kryptonite>",
  "react_pattern": "<2-3 sentences — BEHAVIORAL: what they DO automatically under stress. Specific actions and habits, not the wound itself. Different from kryptonite.>",
  "respond_pathway": "<2-3 sentences — BEHAVIORAL: what becomes possible when they catch the reaction. The conscious choice. Different from superpower.>",
  "defiant_spirit_message": "<2-3 sentences — the closing truth for this person>",
  "oyn_summary": {
    "who": "<1-2 sentences>",
    "what": "<1-2 sentences>",
    "why": "<1-2 sentences>",
    "how": "<1-2 sentences>",
    "when": "<1-2 sentences>",
    "where": "<1-2 sentences>"
  },
  "oyn_dimensions": {
    "who": "<1-2 sentences>",
    "what": "<1-2 sentences>",
    "why": "<1-2 sentences>",
    "how": "<1-2 sentences>",
    "when": "<1-2 sentences>",
    "where": "<1-2 sentences>"
  },
  "center_insights": {
    "body": "<1-2 sentences>",
    "heart": "<1-2 sentences>",
    "head": "<1-2 sentences>"
  },
  "domain_insights": {
    "relationships": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},
    "wealth": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},
    "leadership": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},
    "transformation": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"}
  },
  "real_world_scenarios": [
    {"situation": "<scenario>", "react": "<automatic response>", "respond": "<conscious choice>"},
    {"situation": "<scenario>", "react": "<automatic response>", "respond": "<conscious choice>"},
    {"situation": "<scenario>", "react": "<automatic response>", "respond": "<conscious choice>"}
  ],
  "stress_line_type": ${stressType},
  "stress_line_name": "<name>",
  "stress_line_description": "<2-3 sentences>",
  "stress_line_triggers": "<1-2 sentences>",
  "release_line_type": ${releaseType},
  "release_line_name": "<name>",
  "release_line_description": "<2-3 sentences>",
  "release_line_access": "<1-2 sentences — how to access this consciously>",
  "lowest_type": ${lowestType},
  "lowest_type_significance": "<1-2 sentences>",
  "defy_your_number": "<2-3 sentences>",
  "closing_charge": "<one powerful closing sentence>",
  "famous_examples": [
    {
      "name": "<real person>",
      "profession": "<their field>",
      "type_evidence": "<why they exemplify this pattern — frame through Defiant Spirit lens: wound/gift dynamic, how they defy their type's limitations>",
      "what_you_share": "<what the person shares with this example>",
      "photo_url": "<Wikipedia Commons image URL for this person — MUST be a real, working Wikimedia URL. If you cannot find one, leave empty string.>",
      "source_note": "Community observation — not an official assessment."
    }
  ],
  "_famous_examples_rules": "MANDATORY: Generate EXACTLY 6 famous examples. If the user provided demographics, you MUST include at least one figure matching EACH demographic they submitted. For example: if religion=Jewish, include at least one Jewish figure. If country=Brazil, include at least one Brazilian. If ethnicity=South Asian, include one South Asian figure. The remaining slots should be filled with universally recognized figures of this type from established Enneagram sources (Riso-Hudson, Palmer, Enneagram Institute). Diverse fields: athletes, musicians, historical figures, entrepreneurs, activists, authors — not just Hollywood actors.",
  "relationship_descriptions": {
    "1": {"label": "<relationship label>", "description": "<2-3 sentences: how this energy relates to the person analytically>", "embodiment": "<1-2 sentences: what this energy CONCRETELY looks like showing up in this person's life — specific behaviors, moments, situations>", "own_it": "<1 sentence in Baruch's Defiant Spirit voice: how to defy the pattern and access this type's energy as a gift. Frame as: 'To own this energy means...' or 'The gift here is...' — practical, direct, no jargon>"},
    "2": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "3": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "4": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "5": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "6": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "7": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "8": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"},
    "9": {"label": "<label>", "description": "<2-3 sentences>", "embodiment": "<1-2 sentences>", "own_it": "<1 sentence>"}
  },
  "famous_examples_disclaimer": "Enneagram typing of public figures is interpretive — community observations only.",
  "variant_signals": ${JSON.stringify(variantSignals)},
  "wing_signals": ${JSON.stringify(wingSignals)}
}

Make the content deeply personal, specific, and grounded in the actual conversation. Use the person's own language and examples where possible. This is their mirror — make it accurate and transformative. Every section should leave the person feeling more free, not more labeled.`;

    // Call with web search tools — fall back to no-tools on failure
    let rawText: string;

    try {
      rawText = await generateWithTools(client, {
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 4000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      });
    } catch (err) {
      console.warn('[generate] web search failed — RAG only:', err);
      const fallback = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawText = fallback.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');
    }

    // Parse response
    const cleaned = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let results: Record<string, unknown>;

    // Attempt JSON repair if truncated (missing closing braces)
    let jsonToParse = cleaned;
    if (jsonToParse.length > 0 && !jsonToParse.endsWith('}')) {
      console.warn('[results/generate] JSON appears truncated, attempting repair...');
      // Count open vs close braces
      let openBraces = 0;
      for (const ch of jsonToParse) {
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
      }
      // Remove trailing partial values (truncated strings, etc.)
      jsonToParse = jsonToParse.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
      // Close all open braces
      while (openBraces > 0) {
        jsonToParse += '}';
        openBraces--;
      }
      console.log('[results/generate] Repaired JSON, added', openBraces, 'closing braces');
    }

    try {
      results = JSON.parse(jsonToParse);
    } catch (parseErr) {
      console.error('[results/generate] JSON parse failed even after repair:', jsonToParse.slice(0, 300));
      results = {
        leading_type: leadingType,
        core_type: leadingType,
        type_name: `Type ${leadingType}`,
        core_type_name: TYPE_NAMES[leadingType] || '',
        core_type_description: '',
        defiant_spirit_type_name: defiantSpiritTypeName,
        confidence_pct: Math.round(confidence * 100),
        confidence,
        wing: `${leadingType}w${wingDominant}`,
        instinctual_variant: dominantVariant,
        tritype: tritypeResult.tritype,
        headline: 'Your assessment is complete.',
        superpower: '',
        kryptonite: '',
        react_pattern: defiantSpirit.react_pattern_observed ?? '',
        respond_pathway: defiantSpirit.respond_glimpsed ?? '',
        defiant_spirit_message: '',
        oyn_summary: oynDimensions,
        oyn_dimensions: { who: '', what: '', why: '', how: '', when: '', where: '' },
        center_insights: {},
        domain_insights: {
          relationships: { react: '', respond: '' },
          wealth: { react: '', respond: '' },
          leadership: { react: '', respond: '' },
          transformation: { react: '', respond: '' },
        },
        real_world_scenarios: [],
        stress_line_type: stressType,
        release_line_type: releaseType,
        lowest_type: lowestType,
        defy_your_number: '',
        closing_charge: 'Defy Your Number. Live Your Spirit.',
        famous_examples: [],
        relationship_descriptions: {},
        famous_examples_disclaimer: 'Community observations only.',
        variant_signals: variantSignals,
        wing_signals: wingSignals,
      };
    }

    // Ensure critical fields are populated — fill from session data if AI left them empty
    if (!results.leading_type) results.leading_type = leadingType;
    if (!results.core_type) results.core_type = leadingType;
    if (!results.type_name) results.type_name = TYPE_NAMES[leadingType] || `Type ${leadingType}`;
    if (!results.core_type_name) results.core_type_name = TYPE_NAMES[leadingType] || '';
    if (!results.confidence && confidence) results.confidence = confidence;
    if (!results.type_scores && typeScores && Object.keys(typeScores).length > 0) results.type_scores = typeScores;
    if (!results.variant_signals) results.variant_signals = variantSignals;
    if (!results.wing_signals) results.wing_signals = wingSignals;
    if (!results.tritype && tritypeResult.tritype) results.tritype = tritypeResult.tritype;
    if (!results.defiant_spirit_type_name && defiantSpiritTypeName) results.defiant_spirit_type_name = defiantSpiritTypeName;

    // Fill react/respond from defiant_spirit session data if missing
    const ds = session.internalState?.defiant_spirit;
    if (!(results.react_pattern as string)?.trim() && ds?.react_pattern_observed) {
      results.react_pattern = ds.react_pattern_observed;
    }
    if (!(results.respond_pathway as string)?.trim() && ds?.respond_glimpsed) {
      results.respond_pathway = ds.respond_glimpsed;
    }

    // Fill OYN from session if missing
    if (!results.oyn_dimensions && session.internalState?.oyn_dimensions) {
      results.oyn_dimensions = session.internalState.oyn_dimensions;
    }

    console.log('[results/generate] Critical field check — superpower:', !!(results.superpower as string)?.trim(), '| core_type_description:', !!(results.core_type_description as string)?.trim());

    // ── Personality Systems Analysis (sequential, after main results) ──
    const existingPS = (session.generatedResults as Record<string, unknown>)?.personality_systems;
    if (existingPS) {
      console.log('[results/generate] personality systems cache hit — skipping analysis');
      results.personality_systems = existingPS;
    } else {
      try {
        const analyzerInput = buildAnalyzerInput(session, results);
        if (analyzerInput) {
          const personalitySystemsResult = await analyzePersonalitySystems(analyzerInput, client);
          results.personality_systems = personalitySystemsResult;
        }
      } catch (psErr) {
        console.warn('[results/generate] Personality systems analysis failed:', psErr);
        results.personality_systems = null;
      }
    }

    // Cache the results in memory and persist to Supabase
    setSession(sessionId, { generatedResults: results });

    // Persist generated results to Supabase for cross-restart retrieval
    adminClient.from('assessment_results')
      .update({ generated_results: results })
      .eq('session_id', sessionId)
      .then(({ error }) => {
        if (error) console.warn('[results/generate] Supabase persist error:', error.message);
      });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[results/generate] Error:', err);
    return NextResponse.json({ error: 'Failed to generate results.' }, { status: 500 });
  }
}
