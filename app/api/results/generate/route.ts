export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSession, setSession, initSession } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';
import { queryKnowledgeBase } from '@/lib/rag';
import {
  RESOLUTION_POINTS,
  ENERGIZING_POINTS,
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
      // Override whole type with correct center-based calculation
      const cachedTypeScores: Record<number, number> = {};
      const rawCachedScores = session.internalState?.hypothesis?.type_scores || {};
      for (const [k, v] of Object.entries(rawCachedScores)) {
        cachedTypeScores[Number(k)] = v;
      }
      if (Object.keys(cachedTypeScores).length >= 3) {
        const correctedWholeType = selectTritype(cachedTypeScores);
        cached.wholeType = correctedWholeType.wholeType;
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

      // Patch missing domain insights — fire-and-forget (non-blocking, don't delay results)
      const cachedDI = cached.domain_insights as Record<string, { react?: string; respond?: string }> | undefined;
      const diEmpty = !cachedDI || (typeof cachedDI === 'object' && !Array.isArray(cachedDI) &&
        Object.values(cachedDI).every(
          v => typeof v === 'object' && !((v?.react ?? '').trim() || (v?.respond ?? '').trim())
        ));

      // Return results IMMEDIATELY — patch domain insights in background
      if (diEmpty && (cached.leading_type || cached.core_type)) {
        console.log('[results/generate] Domain insights empty — will patch in background for:', sessionId);
        // Fire-and-forget background patch — does NOT block the response
        const bgPatchType = (cached.leading_type || cached.core_type) as number;
        const bgPatchWing = (cached.wing as string) || '';
        const bgPatchVariant = (cached.instinctual_variant as string) || '';
        const bgPatchWholeType = (cached.wholeType as string) || '';
        Promise.resolve().then(async () => {
          try {
            const patchRes = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1500,
              system: `You generate Enneagram domain insights in Dr. Baruch HaLevi's Defiant Spirit voice. Return ONLY valid JSON. No markdown.`,
              messages: [{
                role: 'user',
                content: `Generate domain insights for Enneagram Type ${bgPatchType}, wing ${bgPatchWing}, variant ${bgPatchVariant}, Whole Type ${bgPatchWholeType}.\n\nReturn this exact JSON:\n{\n  "relationships": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},\n  "wealth": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},\n  "leadership": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"},\n  "transformation": {"react": "<1-2 sentences>", "respond": "<1-2 sentences>"}\n}`
              }],
            });
            const patchText = patchRes.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const patchedDI = JSON.parse(patchText);
            const updatedGenerated = { ...(session.generatedResults as Record<string, unknown>), domain_insights: patchedDI };
            setSession(sessionId, { generatedResults: updatedGenerated });
            await adminClient.from('assessment_results').update({ generated_results: updatedGenerated }).eq('session_id', sessionId);
            console.log('[results/generate] Domain insights background patch completed');
          } catch (err) {
            console.warn('[results/generate] Domain insights background patch failed:', err);
          }
        });
      }

      // Return cached results IMMEDIATELY — no waiting for patches
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

    // Compute whole type correctly (one type per center)
    const rawTypeScores = internalState?.hypothesis?.type_scores || {};
    const typeScores: Record<number, number> = {};
    for (const [k, v] of Object.entries(rawTypeScores)) {
      typeScores[Number(k)] = v;
    }

    const wholeTypeResult = Object.keys(typeScores).length
      ? selectTritype(typeScores)
      : {
          wholeType: session.wholeType || '',
          tritype: session.wholeType || '',
          body: 0, heart: 0, head: 0,
          depth_scores: { body: 0, heart: 0, head: 0 },
          depth_ranks: { body: 0, heart: 0, head: 0 },
        };

    const lowestType = Object.keys(typeScores).length
      ? getLowestType(typeScores)
      : null;

    const secondaryInfluences = Object.keys(typeScores).length
      ? getSecondaryInfluences(typeScores, wholeTypeResult)
      : [];

    const energizingPointType = RESOLUTION_POINTS[leadingType] ? ENERGIZING_POINTS[leadingType] : null;
    const resolutionPointType = RESOLUTION_POINTS[leadingType] || null;

    const wingTypes = getWingTypes(leadingType);

    // Store computed values in session
    setSession(sessionId, {
      wholeTypeTypes: { body: wholeTypeResult.body, heart: wholeTypeResult.heart, head: wholeTypeResult.head },
      lowestScoringType: lowestType,
      secondaryInfluences,
      energizingPointType,
      resolutionPointType,
    });

    // Build RAG queries — run all in parallel
    const relationshipTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(t => t !== leadingType);

    const ragQueries = [
      `Type ${leadingType} Defiant Spirit enneagram ${dominantVariant} core pattern`,
      `Type ${leadingType} energizing point resolution point integration disintegration enneagram`,
      `Type ${leadingType} superpower kryptonite wound gift enneagram`,
      `Type ${leadingType} react respond pattern survival strategy`,
      `Type ${leadingType} relationships wealth leadership domain enneagram`,
      `whole type ${wholeTypeResult.wholeType} archetype enneagram`,
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
Whole Type: ${wholeTypeResult.wholeType}
  Body center type: ${wholeTypeResult.body} (rank #${wholeTypeResult.depth_ranks?.body ?? '?'} of 9, depth score ${wholeTypeResult.depth_scores?.body?.toFixed(2) ?? '?'})
  Heart center type: ${wholeTypeResult.heart} (rank #${wholeTypeResult.depth_ranks?.heart ?? '?'} of 9, depth score ${wholeTypeResult.depth_scores?.heart?.toFixed(2) ?? '?'})
  Head center type: ${wholeTypeResult.head} (rank #${wholeTypeResult.depth_ranks?.head ?? '?'} of 9, depth score ${wholeTypeResult.depth_scores?.head?.toFixed(2) ?? '?'})
  Depth-of-access note: A depth score of 1.0 means that center's representative is the dominant type (strongest signal). A score below 0.5 means the center is "buried" — this person has weaker access to that center and may need more guidance reclaiming it.
Energizing Point: Type ${energizingPointType} (${TYPE_NAMES[energizingPointType || 1]})
Resolution Point: Type ${resolutionPointType} (${TYPE_NAMES[resolutionPointType || 7]})
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

TONE BALANCE — CRITICAL:
The results must feel like a gift, not a diagnosis. Follow the 60/40 rule:
- 60% of the emotional weight should be on STRENGTH, GIFT, POSSIBILITY, and WHAT'S POSSIBLE
- 40% on PATTERN, SHADOW, COST, and WHAT'S BEEN RUNNING THEM
The person should finish reading and feel MORE powerful, not less. If any section reads like a list of flaws, rewrite it. The wound is real — name it honestly. But always in service of revealing the gift it's been protecting.

SUPERPOWER MUST BE LONGER AND MORE VIVID THAN KRYPTONITE:
- superpower: 3-4 sentences minimum. Specific. Grounded. Make them feel extraordinary.
- kryptonite: 2-3 sentences. Honest but brief. Always connected back to the superpower.
- respond_pathway: 3-4 sentences. This is the VISION of what's possible. Make it compelling.
- react_pattern: 2-3 sentences. Name it clearly, move on.

The person should feel: "I have real power, AND I can see what gets in the way."
NOT: "Here are all the ways I'm broken, and here's a nicer way to say it."

The primary type reveal must follow this arc:
1. Open with their GIFT — what makes this person extraordinary. Name the superpower first. Make them feel powerful before anything else. "There's something about the way you move through the world that most people can't do..."
2. Name the cost — briefly. What happens when the gift runs on autopilot. One sentence of honest shadow, not a paragraph. "But that same force, when it's running you instead of the other way around..."
3. Reveal the unity — the wound and the gift are the same energy. This is the Defiant Spirit insight. Not two things. One thing, conscious or unconscious.
4. Point toward liberation — what becomes possible when they choose. Not something to build. Something to remember. End with power, not pain.

The overall emotional arc: STRONG → honest → unified → FREE.
NOT: seen → wounded → explained → slightly hopeful.

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
- Use the person's core type, wing, instinctual variant, whole type, energizing/resolution points, and conversation responses to infer how their pattern plays out in each domain.
- If the conversation touched on a domain directly, incorporate that. If not, deduce from the type profile — every type has predictable patterns across all four domains.
- "react" = the automatic, unconscious pattern in that domain.
- "respond" = the conscious, liberated alternative.
- Never return empty strings for any domain insight field.

COMBINATION SPECIFICITY — CRITICAL:
This person is one of 1,350+ possible profiles. Make the output SPECIFIC to their exact combination, not just their core type number.
- The WING must be mentioned by name in superpower, kryptonite, and core_type_description. A ${leadingType}w${wingDominant} is different from a ${leadingType}w${wingDominant === getWingTypes(leadingType)[0] ? getWingTypes(leadingType)[1] : getWingTypes(leadingType)[0]}. Show how.
- The VARIANT (${dominantVariant}) must shape the react_pattern and respond_pathway. SP patterns focus on security/resources/self-preservation. SX patterns focus on intensity/bonds/chemistry. SO patterns focus on belonging/groups/social role.
- The WHOLE TYPE (${wholeTypeResult.wholeType}) must be referenced in tritype_life_purpose and center_insights. Show how Body ${wholeTypeResult.body}, Heart ${wholeTypeResult.heart}, and Head ${wholeTypeResult.head} interact.

FAMOUS EXAMPLES RULES:
Generate EXACTLY 8 famous examples. ${session.demographics ? `User demographics: age=${session.demographics.ageRange}, gender=${session.demographics.gender}, ethnicity=${session.demographics.ethnicity}, country=${session.demographics.country}, religion=${session.demographics.religion}. Demographic relevance takes top priority — include at least one figure matching EACH demographic they provided.` : ''} AIM FOR WIDE REPRESENTATION across different fields — the list should feel like a cross-section of how this type shows up in the world, not just one industry. After filling demographic matches, actively diversify: science/medicine/technology, politics/activism/social change, sports/athletics, business/entrepreneurship, literature/philosophy/academia, music, art, spiritual leadership, military, journalism. Avoid clustering — if you already have 2+ from entertainment, look elsewhere. Both historical and contemporary figures should be represented. Leave photo_url as empty string — photos are handled separately.

ENERGY DESCRIPTIONS — INTERNAL, NOT SOCIAL — ALL 9 REQUIRED:
The relationship_descriptions field is NOT about how this person relates to OTHER people of each type. It is about how each of the 9 energies lives WITHIN this person — their internal relationship to all 9 energies. This is the "tenth type" / whole circle teaching: all 9 energies live in the person, and the work is to return to wholeness by consciously accessing each.

You MUST generate a relationship_descriptions entry for EVERY type (1 through 9). Each entry must answer FOUR distinct questions about that energy as it lives inside THIS person:
1. label — a short essence name for the energy (e.g. "The Reformer's Integrity", "The Helper's Warmth", "The Achiever's Drive"). NOT a relationship label.
2. description — what this energy IS and what GIFT it carries when accessed consciously. 2-3 sentences. Written in second person about the energy itself ("This energy carries the gift of…"), not "a Type X person is…".
3. embodiment — how this energy lives in YOU SPECIFICALLY given your core type ${leadingType}. What does it look like when it's active in your life, and how active is it (use the type_scores context). For the user's core type ${leadingType}, explicitly frame this as "your home energy". 2-3 sentences, second person.
4. own_it — the SHADOW SIDE — what this energy looks like when it runs on autopilot, unconscious, fear-driven, inside you. 1-2 sentences. NEVER a social relationship warning — it's about the shadow of this energy WITHIN the person.
5. defy_practice — the concrete Defiant Spirit practice for channeling this energy consciously. How does THIS user (a ${leadingType}w${wingDominant} ${dominantVariant}) access this particular energy as part of their wholeness? Actionable. 2-3 sentences. Tie back to "defy your number" — stepping outside the home pattern to touch this energy deliberately.

ABSOLUTELY FORBIDDEN in these fields: "how you relate to a Type X", "when you meet a Type X", "in relationship with a Type X", "people of this type", "others who are this type", or any framing that makes it about social relationships. This is the user's INTERNAL circle.

OUTPUT COMPLETENESS — CRITICAL:
Every single field in the JSON template must have substantive content. No empty strings. No placeholder text. If you're unsure about a field, write the best type-informed response you can. Err on the side of MORE content, not less. The person is paying attention to every word.

KNOWLEDGE BASE CONTEXT (prioritize this):
${ragContext}

${demoContext}

WRITING QUALITY — MANDATORY FOR ALL TEXT FIELDS:

Write like a human: varied, imperfect, specific. These rules apply to ALL text fields (superpower, kryptonite, react_pattern, respond_pathway, oyn dimensions, domain insights, scenarios, closing messages, energizing/resolution point descriptions, whole type insights, everything).

BANNED — Word choice:
- "Quietly" and magic adverbs: No "quietly", "deeply", "fundamentally", "remarkably", "arguably" used to inflate ordinary descriptions.
- "Delve" and friends: Never use "delve", "certainly", "utilize", "leverage" (as verb), "robust", "streamline", "harness", "navigate".
- Ornate nouns: No "tapestry", "landscape", "paradigm", "synergy", "ecosystem" where simpler words work.
- The "serves as" dodge: Say "is", not "serves as" or "stands as".
- Personality writing clichés: No "journey" for growth, no "dance" or "dance between" for opposing forces, no "at its core", "at the end of the day", "when all is said and done".

BANNED — Sentence structure:
- Negative parallelism: "It's not X — it's Y." Maximum ONE across the entire results.
- Dramatic countdowns: "Not X. Not Y. Just Z." Never.
- Self-posed rhetorical questions: "The result? Devastating." Never.
- Anaphora: Don't start consecutive sentences with the same word.
- Tricolon abuse: Max two three-part lists across ALL fields combined.
- Filler transitions: No "It's worth noting", "Importantly", "Interestingly", "Notably". Just say it.
- Superficial -ing analyses: Don't tack "-ing" phrases onto sentences for false depth ("highlighting the importance of", "reflecting a broader pattern of", "contributing to a sense of"). If the -ing clause adds no specific information, delete it.
- False ranges: Don't use "from X to Y" where X and Y aren't on a real spectrum. "From intimacy to self-worth" — what's in between? Nothing.
- Listicle in a trench coat: Don't disguise a list as prose ("The first pattern is... The second pattern is..."). Either use real bullets or write real paragraphs with varied openings.
- Signposted conclusions: Never write "In conclusion", "To sum up", "In summary", "And so we return to...". Just conclude.
- Em dashes: Max 3 across ALL fields combined.

BANNED — Tone:
- Grandiose stakes inflation: This is one person's pattern, not the fate of humanity.
- "Imagine..." openings: Never.
- "The truth is simple" / "The reality is clear": Show, don't assert.
- False vulnerability: "And yes, this is the hard part..." Never.
- "Think of it as..." / "It's like a..." — patronizing analogies.
- "Despite these patterns..." dismissals: Never end a section by waving away what you just said.
- Invented concept labels: Don't coin compound labels like "the validation paradox", "the control trap", "the intimacy divide" as if they're established terms. Describe the pattern plainly.
- Dead metaphor: Don't latch onto one metaphor and repeat it across multiple fields. Use it once, move on.
- Don't start superpower and kryptonite with the same sentence structure.

BANNED — Composition:
- Content duplication: No field should repeat content from another field.
- One-point dilution: Don't restate the same point in different words across fields. Each field must add NEW information.
- Fractal summaries: Don't restate in closing_charge what was already said in superpower or headline.

REQUIRED:
- Vary sentence length within every field. At least one sentence under 8 words per field.
- Be concrete. "You reorganize the kitchen when you're anxious" beats "You seek control through environmental management."
- Trust the reader. Don't explain what you just said in different words.
- Each field should sound like it was written fresh — not copy-pasted from a template.

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
  "tritype": "${wholeTypeResult.wholeType}",
  "tritype_archetype": "<archetype name if known>",
  "tritype_archetype_fauvre": "<Fauvre archetype name>",
  "tritype_archetype_ds": "<Defiant Spirit archetype name>",
  "tritype_life_purpose": "<1-2 sentences>",
  "tritype_blind_spot": "<1-2 sentences>",
  "tritype_growing_edge": "<1-2 sentences>",
  "tritype_core_triggers": "<1-2 sentences>",
  "headline": "<one powerful sentence about this person's core gift>",
  "superpower": "<3-4 sentences — the GIFT: the positive, conscious expression of this type's core energy. What makes them powerful, trustworthy, effective. Mention the ${wingDominant}-wing flavor. This is the LIGHT side.>",
  "kryptonite": "<2-3 sentences — the WOUND: the unconscious, fear-driven shadow of the same energy. What happens when the superpower runs on autopilot. Mention how the ${dominantVariant} variant shapes WHERE this shows up. This is the SHADOW side.>",
  "react_pattern": "<2-3 sentences — BEHAVIORAL: what they DO automatically under stress. Specific actions and habits, not the wound itself. Different from kryptonite.>",
  "respond_pathway": "<2-3 sentences — BEHAVIORAL: what becomes possible when they catch the reaction. The conscious choice. Different from superpower.>",
  "defiant_spirit_message": "<2-3 sentences — the closing truth for this person>",
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
  "stress_line_type": ${energizingPointType},
  "stress_line_name": "<name>",
  "stress_line_description": "<2-3 sentences>",
  "stress_line_triggers": "<1-2 sentences>",
  "release_line_type": ${resolutionPointType},
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
      "what_you_share": "<A punchy, vivid one-liner about THIS person's type energy — like a movie tagline. Not a generic type description. Example: 'Gave everything to be irreplaceable — then learned love isn't earned.' or 'Built an empire by outrunning the void — then had to sit still.' Make it specific to the person, not the type.>",
      "photo_url": "",
      "source_note": "<Enneagram typing source if known — e.g. 'Riso-Hudson', 'Palmer', 'Enneagram Institute', or 'Community consensus'. Always include the person even if the source is community consensus — variety and demographic relevance matter more than academic certainty.>",
      "relevance_tag": "<if this person matches a user demographic, state which one — e.g. 'Jewish', 'Israeli', 'Korean'. Empty string if no demographic match.>"
    }
  ],
  "relationship_descriptions": {
    "1": {"label": "<short essence name for this energy — e.g. 'The Reformer's Integrity' — NOT a relationship label>", "description": "<2-3 sentences: what THIS ENERGY is and the GIFT it carries. Second person about the energy, not about people of this type.>", "embodiment": "<2-3 sentences: how this energy lives inside YOU specifically given core type ${leadingType}. For type ${leadingType}, frame as 'your home energy'.>", "own_it": "<1-2 sentences: the SHADOW side — what this energy looks like when it runs on autopilot inside you. Never social framing.>", "defy_practice": "<2-3 sentences: concrete Defiant Spirit practice for channeling this energy consciously as a ${leadingType}w${wingDominant} ${dominantVariant}. Tie to 'defy your number'.>"},
    "2": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "3": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "4": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "5": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "6": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "7": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "8": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"},
    "9": {"label": "<energy essence name>", "description": "<gift of this energy, 2-3 sentences>", "embodiment": "<how it lives in you as a ${leadingType}, 2-3 sentences>", "own_it": "<shadow when unconscious, 1-2 sentences>", "defy_practice": "<how to channel it, 2-3 sentences>"}
  },
  "famous_examples_disclaimer": "Enneagram typing of public figures is interpretive — community observations only."
}

Make the content deeply personal, specific, and grounded in the actual conversation. Use the person's own language and examples where possible. This is their mirror — make it accurate and transformative. Every section should leave the person feeling more free, not more labeled.`;

    // Call with web search tools — fall back to no-tools on failure
    let rawText: string;

    try {
      rawText = await generateWithTools(client, {
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 16000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      });
    } catch (err) {
      console.warn('[generate] web search failed — RAG only:', err);
      const fallback = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
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
        tritype: wholeTypeResult.wholeType,
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
        stress_line_type: energizingPointType,
        release_line_type: resolutionPointType,
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

    // ── Completeness check — log which critical fields are missing ──
    const criticalFields = ['superpower', 'kryptonite', 'react_pattern', 'respond_pathway', 'headline', 'core_type_description', 'defy_your_number', 'closing_charge'];
    const emptyFields = criticalFields.filter(f => !(results[f] as string)?.trim());
    if (emptyFields.length > 0) {
      console.warn(`[results/generate] WARNING: ${emptyFields.length} critical fields empty after generation:`, emptyFields.join(', '));
    }
    const domainInsightsCheck = results.domain_insights as Record<string, { react?: string; respond?: string }> | undefined;
    if (domainInsightsCheck) {
      const emptyDomains = Object.entries(domainInsightsCheck).filter(([, v]) => !(v?.react?.trim()) && !(v?.respond?.trim())).map(([k]) => k);
      if (emptyDomains.length > 0) {
        console.warn('[results/generate] Empty domain insights:', emptyDomains.join(', '));
      }
    }
    const relDescs = results.relationship_descriptions as Record<string, unknown> | undefined;
    if (!relDescs || Object.keys(relDescs).length < 9) {
      console.warn('[results/generate] Incomplete relationship_descriptions:', Object.keys(relDescs || {}).length, '/9');
    }

    // ── DOMAIN INSIGHTS GUARANTEE — inline patch if empty ──
    const diCheck = results.domain_insights as Record<string, { react?: string; respond?: string }> | undefined;
    const diEmpty = !diCheck || (typeof diCheck === 'object' && !Array.isArray(diCheck) &&
      Object.values(diCheck).every(v => typeof v === 'object' && !((v?.react ?? '').trim() || (v?.respond ?? '').trim())));
    if (diEmpty) {
      console.log('[results/generate] Domain insights empty — attempting inline patch');
      try {
        const diPatchRes = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: `You generate Enneagram domain insights in Dr. Baruch HaLevi's Defiant Spirit voice. Lead with the gift, name the cost briefly. Return ONLY valid JSON. No markdown.`,
          messages: [{
            role: 'user',
            content: `Generate domain insights for Enneagram Type ${leadingType}, wing ${leadingType}w${wingDominant}, variant ${dominantVariant}. For each domain, write a "react" pattern (automatic, unconscious) and "respond" pathway (conscious, chosen). 2-3 sentences each.\n\nReturn:\n{"relationships":{"react":"...","respond":"..."},"wealth":{"react":"...","respond":"..."},"leadership":{"react":"...","respond":"..."},"transformation":{"react":"...","respond":"..."}}`
          }],
        });
        const diPatchText = diPatchRes.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        results.domain_insights = JSON.parse(diPatchText);
        console.log('[results/generate] Domain insights patched successfully');
      } catch (diErr) {
        console.warn('[results/generate] Domain insights patch failed — client fallback will handle:', diErr);
      }
    }

    // ── RELATIONSHIP DESCRIPTIONS REPAIR — if fewer than 9 entries ──
    const relCheck = results.relationship_descriptions as Record<string, unknown> | undefined;
    if (!relCheck || Object.keys(relCheck).length < 9) {
      console.log(`[results/generate] Relationship descriptions incomplete (${Object.keys(relCheck || {}).length}/9) — repairing`);
      try {
        const relRepairRes = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: `You generate INTERNAL energy descriptions for the Enneagram "whole circle / tenth type" teaching in Dr. Baruch HaLevi's Defiant Spirit voice. These are NOT about social relationships — they are about how each of the 9 energies lives INSIDE the user. Return ONLY valid JSON. No markdown.`,
          messages: [{
            role: 'user',
            content: `For a ${leadingType}w${wingDominant} ${dominantVariant}, describe how each of the 9 enneagram energies lives WITHIN them (not how they relate to other people). For each type 1-9, include:\n- label: short essence name for the energy (e.g. "The Reformer's Integrity"). NOT a social label.\n- description: what this energy IS and the gift it carries. 2-3 sentences. About the energy, not about "a Type X person".\n- embodiment: how this energy lives inside the user as a type ${leadingType}. 2-3 sentences. For the user's own type (${leadingType}), frame it as "your home energy".\n- own_it: the SHADOW — what this energy looks like when running unconscious inside them. 1-2 sentences.\n- defy_practice: concrete Defiant Spirit practice for channeling this energy as part of their wholeness. 2-3 sentences.\n\nNEVER use social framing like "when you meet a Type X" or "in relationship with a Type X". This is about the user's internal circle.\n\nReturn:\n{"1":{"label":"...","description":"...","embodiment":"...","own_it":"...","defy_practice":"..."},"2":{...},...,"9":{...}}`
          }],
        });
        const relText = relRepairRes.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const repaired = JSON.parse(relText);
        // Merge: keep existing entries, fill missing ones
        const existing = (results.relationship_descriptions || {}) as Record<string, unknown>;
        results.relationship_descriptions = { ...repaired, ...existing };
        console.log(`[results/generate] Relationship descriptions repaired — now ${Object.keys(results.relationship_descriptions as Record<string, unknown>).length}/9`);
      } catch (relErr) {
        console.warn('[results/generate] Relationship descriptions repair failed:', relErr);
      }
    }

    // ── FAMOUS EXAMPLES REPAIR — if fewer than 4 entries ──
    const fameCheck = results.famous_examples as Array<unknown> | undefined;
    if (!fameCheck || fameCheck.length < 4) {
      console.log(`[results/generate] Famous examples incomplete (${(fameCheck || []).length}/6) — repairing`);
      try {
        const fameRepairRes = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: `You generate famous example lists for Enneagram types. Return ONLY valid JSON array. No markdown.`,
          messages: [{
            role: 'user',
            content: `Generate 6 famous examples of Enneagram Type ${leadingType}. ${session.demographics ? `User demographics: age=${session.demographics.ageRange}, gender=${session.demographics.gender}, ethnicity=${session.demographics.ethnicity}, country=${session.demographics.country}, religion=${session.demographics.religion}. Include at least one figure matching each demographic provided.` : ''} Diverse fields. Each: name, profession, type_evidence (Defiant Spirit framing), what_you_share (connection to user), source_note.\n\nReturn: [{"name":"...","profession":"...","type_evidence":"...","what_you_share":"...","photo_url":"","source_note":"Community observation."},...]`
          }],
        });
        const fameText = fameRepairRes.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const repairedFame = JSON.parse(fameText);
        if (Array.isArray(repairedFame) && repairedFame.length > 0) {
          results.famous_examples = repairedFame;
          console.log(`[results/generate] Famous examples repaired — now ${repairedFame.length} entries`);
        }
      } catch (fameErr) {
        console.warn('[results/generate] Famous examples repair failed:', fameErr);
      }
    }

    // Pre-fill variant_signals and wing_signals (removed from generation template)
    if (!results.variant_signals) results.variant_signals = variantSignals;
    if (!results.wing_signals) results.wing_signals = wingSignals;

    // Ensure critical fields are populated — fill from session data if AI left them empty
    if (!results.leading_type) results.leading_type = leadingType;
    if (!results.core_type) results.core_type = leadingType;
    if (!results.type_name) results.type_name = TYPE_NAMES[leadingType] || `Type ${leadingType}`;
    if (!results.core_type_name) results.core_type_name = TYPE_NAMES[leadingType] || '';
    if (!results.confidence && confidence) results.confidence = confidence;
    if (!results.type_scores && typeScores && Object.keys(typeScores).length > 0) results.type_scores = typeScores;
    if (!results.variant_signals) results.variant_signals = variantSignals;
    if (!results.wing_signals) results.wing_signals = wingSignals;
    if (!results.wholeType && wholeTypeResult.wholeType) results.wholeType = wholeTypeResult.wholeType;
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

    // Flag low-confidence results from the confidence gate
    results.lowConfidenceFlag = session.clarificationState?.completedWithLowConfidence ?? false;
    results.demographics = session.demographics ?? null;

    // ── COMPLETENESS REPORT ──
    const _allFields = ['core_type_description', 'headline', 'superpower', 'kryptonite', 'react_pattern', 'respond_pathway', 'wing_description', 'subtype_description', 'defy_your_number', 'closing_charge', 'oyn_dimensions', 'domain_insights', 'real_world_scenarios', 'relationship_descriptions', 'famous_examples', 'stress_line_description', 'release_line_description'];
    const _emptyFields = _allFields.filter(f => {
      const val = results[f];
      if (typeof val === 'string') return !val.trim();
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === 'object' && val !== null) return Object.keys(val).length === 0;
      return !val;
    });
    console.log(`[results/generate] COMPLETENESS: ${_allFields.length - _emptyFields.length}/${_allFields.length} fields | Empty: ${_emptyFields.join(', ') || 'none'} | Profile: ${leadingType}w${wingDominant} ${dominantVariant} ${wholeTypeResult.wholeType}`);

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

    // ── Relationship Context Descriptions (pre-generate all 32 for instant UI) ──
    const existingRelCtx = (session.generatedResults as Record<string, unknown>)?.relationship_context_descriptions;
    if (existingRelCtx && Object.keys(existingRelCtx as Record<string, unknown>).length >= 28) {
      console.log('[results/generate] relationship contexts cache hit — skipping');
      results.relationship_context_descriptions = existingRelCtx;
    } else {
      try {
        const otherTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(t => t !== leadingType);
        const contexts = ['friends', 'family', 'romantic', 'professional'];
        const typeName = TYPE_NAMES[leadingType] || `Type ${leadingType}`;
        const keys = otherTypes.flatMap(t => contexts.map(c => `${t}-${c}`));

        const relPrompt = `Generate relationship descriptions for Type ${leadingType} (${typeName}, ${leadingType}w${wingDominant}, ${dominantVariant}) paired with each of the other 8 types across 4 contexts.

For EACH of these 32 combinations, write concise, context-specific content (2-3 sentences per field):
${keys.map(k => `"${k}"`).join(', ')}

The key format is "{otherType}-{context}". The person reading is Type ${leadingType} — address them as "you."

Rules:
- Each context (friends/family/romantic/professional) must describe a GENUINELY DIFFERENT dynamic
- Frame every pairing as having gifts and growth edges — no pairing is "bad"
- Use Dr. Baruch HaLevi's Defiant Spirit voice — plain language, grounded, direct
- Keep each field to 2-3 punchy sentences

Return ONLY valid JSON with this structure:
{
${keys.slice(0, 4).map(k => `  "${k}": {"title":"<engaging title>","how_you_show_up":"<2-3 sentences>","the_dynamic":"<2-3 sentences>","growth_edge":"<2-3 sentences>","watch_out_for":"<2-3 sentences>"}`).join(',\n')},
  ... (all 32 keys)
}`;

        console.log('[results/generate] generating 32 relationship context descriptions...');
        const relResult = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 12000,
          system: 'You generate Enneagram relationship insights in Dr. Baruch HaLevi\'s Defiant Spirit voice. Return ONLY valid JSON. No markdown. No backticks.',
          messages: [{ role: 'user', content: relPrompt }],
        });

        const relRaw = relResult.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join('');
        const relCleaned = relRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const relJsonStart = relCleaned.indexOf('{');
        const relJsonEnd = relCleaned.lastIndexOf('}');
        if (relJsonStart !== -1 && relJsonEnd !== -1) {
          const relParsed = JSON.parse(relCleaned.slice(relJsonStart, relJsonEnd + 1));
          results.relationship_context_descriptions = relParsed;
          console.log(`[results/generate] relationship contexts generated — ${Object.keys(relParsed).length} entries`);
        }
      } catch (relErr) {
        console.warn('[results/generate] relationship contexts generation failed:', relErr);
        results.relationship_context_descriptions = null;
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
