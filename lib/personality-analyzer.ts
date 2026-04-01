// Personality Systems Analyzer — Intelligent cross-system correlation engine
// Analyzes the specific person's compound type (core × subtype × wing × whole type × lexicon)
// across MBTI, Big Five, Attachment, DISC, Jungian, and Human Design

import Anthropic from '@anthropic-ai/sdk'

import {
  buildCorrelationContext,
  getImplausibleMBTI,
  type InstinctualVariant,
  type ConfidenceLevel,
} from './personality-correlations'

// ─── TYPES ────────────────────────────────────────

export interface LexiconContextEntry {
  type: number
  words: string[]
  questionContext: string
  stage: number
}

export interface PersonalitySystemsInput {
  coreType: number
  coreTypeName: string
  instinctualVariant: InstinctualVariant
  wing: string
  wingName: string
  wholeTypeOrdered: number[]
  wholeTypeBody: number
  wholeTypeHeart: number
  wholeTypeHead: number
  fullUserMessages: string
  lexiconContext: LexiconContextEntry[]
  reactPattern: string
  respondPathway: string
  superpowerName: string
  kryptoniteName: string
  recentConversation: string
}

export interface PersonalitySystemsOutput {
  mbti: {
    types: string[]
    primary: string
    reasoning: string
    personalEvidence: string
    confidence: ConfidenceLevel
  }
  bigFive: {
    openness: { score: string; description: string }
    conscientiousness: { score: string; description: string }
    extraversion: { score: string; description: string }
    agreeableness: { score: string; description: string }
    neuroticism: { score: string; description: string }
    personalVariance: string
    confidence: ConfidenceLevel
  }
  attachment: {
    style: string
    reasoning: string
    personalEvidence: string
    healthNote: string
    growthEdge: string
    confidence: ConfidenceLevel
  }
  disc: {
    profile: string
    blend: string
    reasoning: string
    personalEvidence: string
    confidence: ConfidenceLevel
  }
  jungian: {
    primaryArchetype: string
    supportingArchetypes: string[]
    shadowArchetype: string
    shadowNote: string
    reasoning: string
    personalEvidence: string
    confidence: ConfidenceLevel
  }
  humanDesign: {
    likelyType: string
    reasoning: string
    disclaimer: string
    confidence: 'low'
  }
}

// ─── INPUT BUILDER ────────────────────────────────

const CENTER_MAP: Record<number, 'Body' | 'Heart' | 'Head'> = {
  8: 'Body', 9: 'Body', 1: 'Body',
  2: 'Heart', 3: 'Heart', 4: 'Heart',
  5: 'Head', 6: 'Head', 7: 'Head',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildAnalyzerInput(session: any, generatedResults: any): PersonalitySystemsInput | null {
  const hypothesis = session.internalState?.hypothesis || {}
  const coreType = Number(hypothesis.leading_type || 0)

  if (!coreType || coreType < 1 || coreType > 9) {
    console.warn('[personality-analyzer] no valid core type')
    return null
  }

  // Extract instinctual variant
  const variantRaw = (
    generatedResults?.instinctual_variant ||
    (hypothesis.variant_signals
      ? Object.entries(hypothesis.variant_signals || {})
          .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0]?.toUpperCase() || 'SP'
      : 'SP')
  ) as string

  const instinctualVariant = (
    ['SP', 'SO', 'SX'].includes(variantRaw.slice(0, 2).toUpperCase())
      ? variantRaw.slice(0, 2).toUpperCase()
      : 'SP'
  ) as InstinctualVariant

  // Extract wing with validation
  const rawWing = generatedResults?.wing || hypothesis.wing_signals?.leading || ''
  const adjacentTypes: Record<number, number[]> = {
    1: [9, 2], 2: [1, 3], 3: [2, 4], 4: [3, 5],
    5: [4, 6], 6: [5, 7], 7: [6, 8], 8: [7, 9], 9: [8, 1],
  }
  const wingTypeNum = rawWing.includes('w') ? Number(rawWing.split('w')[1]) : 0
  const validWings = adjacentTypes[coreType] || []
  const wing = validWings.includes(wingTypeNum)
    ? rawWing
    : `${coreType}w${validWings[0] || 9}`

  // Whole Type
  const wholeTypeStr = generatedResults?.tritype || session.wholeType || ''
  const wholeTypeDigits = wholeTypeStr.toString().split('').map(Number).filter((n: number) => n >= 1 && n <= 9)
  const wholeTypeOrdered = wholeTypeDigits.length >= 3 ? wholeTypeDigits.slice(0, 3) : [coreType, 2, 5]
  const wholeTypeBody = wholeTypeDigits.find((n: number) => CENTER_MAP[n] === 'Body') || (CENTER_MAP[coreType] === 'Body' ? coreType : 1)
  const wholeTypeHeart = wholeTypeDigits.find((n: number) => CENTER_MAP[n] === 'Heart') || 2
  const wholeTypeHead = wholeTypeDigits.find((n: number) => CENTER_MAP[n] === 'Head') || 5

  // Extract ALL user messages from conversation
  const conversationHistory = session.conversationHistory || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allUserMessages = conversationHistory
    .filter((m: any) => m.role === 'user')
    .map((m: any) =>
      typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
          : ''
    )
    .filter((msg: string) => msg.trim().length > 0)
    .join('\n\n---\n\n')

  // Recent conversation for context (last 10 exchanges)
  const recentHistory = conversationHistory.slice(-10)
  const recentConversation = recentHistory
    .map((m: any) => {
      const content = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
          : ''
      return `${m.role === 'user' ? 'PERSON' : 'SOULO'}: ${content.slice(0, 300)}`
    })
    .join('\n')

  return {
    coreType,
    coreTypeName: generatedResults?.core_type_name || generatedResults?.type_name || '',
    instinctualVariant,
    wing,
    wingName: generatedResults?.wing_name || '',
    wholeTypeOrdered,
    wholeTypeBody,
    wholeTypeHeart,
    wholeTypeHead,
    fullUserMessages: allUserMessages.slice(0, 5000),
    lexiconContext: session.lexiconContext || [],
    reactPattern: generatedResults?.react_pattern || '',
    respondPathway: generatedResults?.respond_pathway || '',
    superpowerName: generatedResults?.superpower || '',
    kryptoniteName: generatedResults?.kryptonite || '',
    recentConversation: recentConversation.slice(0, 2000),
  }
}

// ─── ANALYZER ─────────────────────────────────────

export async function analyzePersonalitySystems(
  input: PersonalitySystemsInput,
  anthropicClient: Anthropic
): Promise<PersonalitySystemsOutput | null> {

  const correlationContext = buildCorrelationContext(
    input.coreType,
    input.instinctualVariant,
    input.wing,
    input.wholeTypeBody,
    input.wholeTypeHeart,
    input.wholeTypeHead,
    input.lexiconContext
  )

  const implausibleMBTI = getImplausibleMBTI(input.coreType)

  const lexiconSummary = input.lexiconContext.length > 0
    ? input.lexiconContext.map(lc =>
        `Stage ${lc.stage}, responding to "${lc.questionContext}": used Type ${lc.type} vocabulary${lc.words.length > 0 ? ` (${lc.words.slice(0, 5).join(', ')})` : ''}`
      ).join('\n')
    : 'No secondary type vocabulary detected'

  const systemPrompt = `You are a clinical-level expert in personality psychology with deep mastery of:
- Enneagram (Riso-Hudson, Naranjo, Fauvre, Baruch HaLevi Defiant Spirit system)
- Myers-Briggs and Jungian cognitive functions (Berens, Thomson, Nardi, Haas)
- Big Five OCEAN model (Costa & McCrae, Furnham, Gurven, Mooradian)
- Attachment Theory (Bowlby, Main, Levine, Heller, Caligor)
- DISC behavioral model (Marston, Daniels, Price)
- Jungian Archetypes (Jung, Pearson, Johnson)
- Human Design (community framework — not peer-reviewed)

YOUR TASK: Analyze this specific person's personality patterns across all six systems. You are NOT doing generic type-to-type table lookups. You are doing the work a skilled clinician does — reading the whole person from the data they gave you.

PRIMARY DATA SOURCE: Their actual responses (fullUserMessages). This is your ground truth.
SECONDARY DATA: Defiant Spirit analysis, lexicon signals, wholeType structure.
CORRELATION BOUNDARIES: Research guardrails. Trust the data over the boundaries if evidence is compelling.

WHAT MAKES ANALYSIS GOOD:
1. Every claim grounded in specific evidence from their actual words
2. The compound type (core × subtype × wing × wholeType × lexicon) reasoned as unified whole
3. Shows how THIS person differs from the average of their type
4. Human Design always clearly marked exploratory

WRITING QUALITY — ALL TEXT FIELDS:

Write like a clinical psychologist who also writes well, not like an AI summarizer. These rules apply to ALL fields (reasoning, personalEvidence, descriptions, shadowNote, growthEdge, healthNote, personalVariance, blend).

BANNED — Word choice:
- "Quietly" and magic adverbs: No "quietly", "deeply", "fundamentally", "remarkably" to inflate descriptions.
- "Delve" and friends: Never "delve", "utilize", "leverage" (as verb), "robust", "streamline", "harness", "navigate".
- Ornate nouns: No "tapestry", "landscape", "paradigm", "ecosystem" where simpler words work.
- The "serves as" dodge: Say "is", not "serves as" or "stands as".
- Personality clichés: No "journey" for growth, no "dance between" for opposing forces, no "at its core".
- "Think of it as..." / "It's like a..." — don't patronize with analogies.

BANNED — Sentence structure:
- Negative parallelism: "It's not X — it's Y." Never across any system.
- Dramatic countdowns: "Not X. Not Y. Just Z." Never.
- Self-posed rhetorical questions: "The result? A pattern of..." Never.
- Anaphora: Don't start consecutive sentences with the same word.
- Tricolon abuse: Max one three-part list across all six systems combined.
- Filler: No "Importantly", "Notably", "Interestingly", "It's worth noting".
- Superficial -ing analyses: Cut "-ing" phrases that add no specific information.
- Listicle in a trench coat: Don't write "The first observation... The second observation..." Write real prose with varied openings.
- Em dashes: Max two per system.
- No repeating the same sentence structure across systems.

BANNED — Tone:
- Grandiose stakes inflation: These are observations about one person, not declarations about human nature.
- "Imagine..." openings: Never.
- "The truth is simple" / "The reality is clear": Show, don't assert.
- False vulnerability: "And yes, this is the hard part..." Never.
- "Despite these patterns..." dismissals: Never.
- Invented concept labels: Don't coin "the validation paradox", "the intimacy trap" as if they're established terms. Describe the pattern plainly.
- Dead metaphor: Don't repeat the same metaphor across systems.

BANNED — Composition:
- Content duplication: If MBTI reasoning already covered a point, Attachment cannot repeat it.
- One-point dilution: Each sentence must add new information.
- Signposted conclusions: No "In summary", "To conclude", "In short".

REQUIRED:
- Vary sentence openings across systems.
- Be specific to the person's pattern, not generic to the type.
- One short punchy sentence (under 8 words) per field minimum.
- Trust the reader's intelligence.

Return ONLY valid JSON with double quotes. No markdown. No backticks. No preamble.`

  const userPrompt = `Analyze this specific person across six personality systems.

THE COMPOUND TYPE
Core Type: ${input.coreType} (${input.coreTypeName})
Instinctual Subtype: ${input.instinctualVariant}
Wing: ${input.wing} (${input.wingName})
Whole Type: ${input.wholeTypeOrdered.join('-')}
  Body: Type ${input.wholeTypeBody} | Heart: Type ${input.wholeTypeHeart} | Head: Type ${input.wholeTypeHead}

DEFIANT SPIRIT PATTERNS
Superpower: ${input.superpowerName}
Kryptonite: ${input.kryptoniteName}
React pattern: ${input.reactPattern}
Respond pathway: ${input.respondPathway}

LEXICON SIGNALS
${lexiconSummary}

THEIR ACTUAL RESPONSES (primary data source)
${input.fullUserMessages}

RECENT CONVERSATION CONTEXT
${input.recentConversation}

CORRELATION BOUNDARIES (guardrails)
${correlationContext}

IMPLAUSIBLE MBTI for Type ${input.coreType}: ${implausibleMBTI.join(', ')}
Only suggest these with specific compelling evidence.

Return this exact JSON structure. Every field required.

CRITICAL — rules for ALL text fields (personalEvidence, reasoning, growthEdge, shadowNote, personalVariance, blend, description):
- Do NOT quote or paraphrase the user's actual assessment responses
- Do NOT use phrases like "you said", "your words", "you mentioned", "in your responses", "her literal words"
- NEVER reference specific people the user mentioned (boyfriend, mother, boss, friend, etc.)
- NEVER reference specific situations they described
- Instead, describe the PATTERN you observed — the behavioral tendency, not the specific thing they said
- Write about patterns, not episodes
- Write as an insight about who they ARE, not an analysis of what they TYPED
- Example BAD: "Her literal words 'I ask 10 people' show Fe+Si processing"
- Example GOOD: "The instinct to seek external consensus before trusting your own judgment is a hallmark of Fe-dominant processing"

{
  "mbti": {
    "types": ["PRIMARY_TYPE", "SECONDARY_IF_APPLICABLE"],
    "primary": "SINGLE_MOST_LIKELY_TYPE",
    "reasoning": "Compound reasoning with cognitive functions.",
    "personalEvidence": "Behavioral pattern observed — do NOT quote their words.",
    "confidence": "high|medium|low"
  },
  "bigFive": {
    "openness": { "score": "very_low|low|medium|high|very_high", "description": "How this compound type affects Openness." },
    "conscientiousness": { "score": "very_low|low|medium|high|very_high", "description": "Specific to their compound type." },
    "extraversion": { "score": "very_low|low|medium|high|very_high", "description": "How subtype and wing shift the base." },
    "agreeableness": { "score": "very_low|low|medium|high|very_high", "description": "Reference lexicon and wholeType." },
    "neuroticism": { "score": "very_low|low|medium|high|very_high", "description": "Reference health level from React pattern." },
    "personalVariance": "How does this person differ from average Type ${input.coreType} on Big Five?",
    "confidence": "high|medium|low"
  },
  "attachment": {
    "style": "secure|anxious|avoidant|fearful_avoidant",
    "reasoning": "How does the compound type produce this attachment pattern?",
    "personalEvidence": "Relational pattern observed — do NOT quote their words.",
    "healthNote": "Where on the health spectrum based on React pattern?",
    "growthEdge": "What would shifting look like? Ground in Respond pathway.",
    "confidence": "high|medium|low"
  },
  "disc": {
    "profile": "Letter combination e.g. CD",
    "blend": "Name and brief description",
    "reasoning": "How does this compound type present in behavioral contexts?",
    "personalEvidence": "Behavioral tendency observed — do NOT quote their words.",
    "confidence": "high|medium|low"
  },
  "jungian": {
    "primaryArchetype": "The dominant active archetype",
    "supportingArchetypes": ["second", "third"],
    "shadowArchetype": "Most suppressed archetype",
    "shadowNote": "How does their shadow manifest? Ground in kryptonite and React pattern.",
    "reasoning": "Compound Jungian reasoning.",
    "personalEvidence": "Archetypal pattern observed — do NOT quote their words.",
    "confidence": "high|medium|low"
  },
  "humanDesign": {
    "likelyType": "Most plausible HD type (one of: Generator, Manifesting Generator, Projector, Manifestor, Reflector)",
    "reasoning": "Write 2-3 SHORT, digestible sentences. NO jargon like 'defined Sacral center' or 'Sacral defined energy'. Instead, translate HD concepts into plain language: 'You seem to thrive when responding to what life brings you rather than forcing things to happen' instead of 'defined Sacral center that responds'. Keep it warm, intuitive, accessible. This is exploratory — write like a wise friend, not a textbook.",
    "disclaimer": "Human Design is a community-based framework without peer-reviewed research. These observations are exploratory — take what resonates and leave the rest.",
    "confidence": "low"
  }
}`

  try {
    console.log(`[personality-analyzer] running analysis for Type ${input.coreType} ${input.instinctualVariant} ${input.wing}`)

    const result = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found in response')
    const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1)
    const parsed = JSON.parse(jsonStr)

    // Validate required fields
    for (const field of ['mbti', 'bigFive', 'attachment', 'disc', 'jungian', 'humanDesign']) {
      if (!parsed[field]) throw new Error(`Missing required field: ${field}`)
    }

    // Validate Big Five scores
    const validScores = ['very_low', 'low', 'medium', 'high', 'very_high']
    for (const trait of ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']) {
      if (!validScores.includes(parsed.bigFive[trait]?.score)) {
        console.warn(`[personality-analyzer] invalid score for ${trait}: ${parsed.bigFive[trait]?.score}`)
        if (parsed.bigFive[trait]) parsed.bigFive[trait].score = 'medium'
      }
    }

    // Validate attachment style
    const validStyles = ['secure', 'anxious', 'avoidant', 'fearful_avoidant']
    if (!validStyles.includes(parsed.attachment?.style)) {
      console.warn('[personality-analyzer] invalid attachment:', parsed.attachment?.style)
      if (parsed.attachment) parsed.attachment.style = 'avoidant'
    }

    // Force Human Design confidence to low
    parsed.humanDesign.confidence = 'low'
    if (!parsed.humanDesign.disclaimer || parsed.humanDesign.disclaimer.length < 20) {
      parsed.humanDesign.disclaimer =
        'Human Design has no peer-reviewed research base. These correlations come from community observation only and should be treated as speculative and exploratory.'
    }

    console.log(`[personality-analyzer] complete — MBTI primary: ${parsed.mbti.primary}`)
    return parsed as PersonalitySystemsOutput
  } catch (err) {
    console.error('[personality-analyzer] failed:', err)
    return null
  }
}
