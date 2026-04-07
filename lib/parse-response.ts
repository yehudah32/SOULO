export interface ResponseParts {
  guide_text: string;
  question_text: string;
  question_format: string;
  answer_options: string[] | null;
  scale_range: { min: number; max: number } | null;
  context_note: string | null;
}

// Internal reasoning markers that should NEVER appear in user-facing context_note.
// If any of these match, the context_note is the AI's processing notes leaking through.
const INTERNAL_REASONING_PATTERNS = [
  /\b(differentiat|distinguish|disambiguat)e?s?\b/i,
  /\bprobing\b/i,
  /\bsurfaces?\b.{0,40}\b(variant|type|center|subtype)\b/i,
  /\b(sp|sx|so)\s*[-]?\s*variant\b/i,
  /\b(heart|head|gut|body)\s*center\b/i,
  /\btype\s*\d+\b/i,
  /\b\d+\s*(vs\.?|or|from)\s*\d+\b/i, // "1 vs 6", "1 or 4", "1 from 6"
  /\binternal\s+critic\b/i,
  /\b(loyalty|trust)[-]based\b/i,
  /\b(reformer|helper|achiever|individualist|investigator|loyalist|enthusiast|challenger|peacemaker)\b/i,
  /\b(tritype|enneagram)\b/i,
  /\b(scans? for|monitors? for)\b.{0,30}\b(threat|failure|error)\b/i,
];

function looksLikeInternalReasoning(text: string): boolean {
  if (!text) return false;
  return INTERNAL_REASONING_PATTERNS.some(p => p.test(text));
}

// Only these formats may legitimately use a context_note (scenario setup or paragraph stem).
const FORMATS_ALLOWING_CONTEXT_NOTE = new Set(['scenario', 'paragraph_select']);

/**
 * Heuristic extraction: when Claude generates a forced_choice question and
 * embeds the options in the question text instead of populating answer_options,
 * try to recover them. The pattern we see in the wild is:
 *   "...closest to which: A, B, or C?"
 *   "...do you tend to X, Y, or Z?"
 *   "...A or B?"
 * Returns null if we can't confidently parse 2-5 sensible options.
 */
export function extractInlineOptions(questionText: string): string[] | null {
  if (!questionText) return null;
  // Strip trailing question mark for splitting
  const trimmed = questionText.trim().replace(/\?+\s*$/, '');
  // REQUIRE a colon delimiter — without one we can't distinguish the question
  // stem from the first option (e.g. "Do you tend to push back, give in, or
  // step away" would extract "Do you tend to push back" as option 1). Better
  // to fail extraction and let the format downgrade to 'open'.
  const lastColon = trimmed.lastIndexOf(':');
  if (lastColon < 0) return null;
  const candidate = trimmed.slice(lastColon + 1).trim();
  if (candidate.length < 4) return null;

  // Find the final "or" that joins the last item: ", or X" or " or X"
  // Use a non-greedy match anchored to end of string.
  const orMatch = candidate.match(/^(.+?),?\s+or\s+([^,]+)$/i);
  if (!orMatch) return null;
  const head = orMatch[1];
  const tail = orMatch[2].trim();
  const headParts = head.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  const parts = [...headParts, tail].filter((p) => p.length > 0);

  // Sanity: 2-5 options, each between 2 and 200 chars, none ending in a colon
  if (parts.length < 2 || parts.length > 5) return null;
  if (parts.some((p) => p.length < 2 || p.length > 200 || p.endsWith(':'))) return null;
  // Reject if any part itself contains "?" (means we caught the wrong segment)
  if (parts.some((p) => p.includes('?'))) return null;
  // Reject if any part looks like a question fragment ("do you ...", "is it ...")
  // — we accidentally split a question stem instead of a real option list.
  const QUESTION_FRAGMENT = /^(do you|are you|is it|was it|were you|have you|has it|can you|could you|will you|would you|when |if )/i;
  if (parts.some((p) => QUESTION_FRAGMENT.test(p))) return null;
  return parts;
}

// Neutral fallback bridges if Claude leaves guide_text empty.
// These appear above the question as Soulo's voice. They are forward-looking
// and never reference the prior answer (that's thinking_display's job).
const FALLBACK_GUIDE_BRIDGES = [
  "Let's keep going.",
  "Here's the next one.",
  "One more for you.",
  "Next angle.",
  "Different territory now.",
  "Let's try this one.",
  "Here's another piece.",
];

function pickFallbackBridge(): string {
  return FALLBACK_GUIDE_BRIDGES[Math.floor(Math.random() * FALLBACK_GUIDE_BRIDGES.length)];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getResponseParts(internal: any): ResponseParts | null {
  const rp = internal?.response_parts;
  if (!rp || !rp.question_text) return null;

  let format = rp.question_format || 'open';
  let context_note: string | null = rp.context_note || null;
  let answer_options: string[] | null = Array.isArray(rp.answer_options) ? rp.answer_options : null;

  // Forced-choice / paragraph_select rescue: Claude sometimes embeds the
  // options inside question_text and leaves answer_options empty. The frontend
  // would then fall back to Yes/No, which produces nonsense like
  //   "Choose one: A, B, or C?"  →  [Yes] [No]
  // Try to recover the options from the prose; if we can't, downgrade the
  // format to 'open' so the user types a free response rather than picking
  // from fabricated buttons.
  if ((format === 'forced_choice' || format === 'paragraph_select') && (!answer_options || answer_options.length < 2)) {
    const recovered = extractInlineOptions(rp.question_text);
    if (recovered && recovered.length >= 2) {
      answer_options = recovered;
      console.warn('[parse-response] Recovered inline options for forced_choice:', recovered);
    } else {
      console.warn('[parse-response] forced_choice with no usable options — downgrading to open. Question:', String(rp.question_text).slice(0, 100));
      format = 'open';
    }
  }

  // Strip context_note if:
  //   1. The format doesn't legitimately need one, OR
  //   2. It contains internal reasoning markers (AI processing leak)
  if (context_note) {
    if (!FORMATS_ALLOWING_CONTEXT_NOTE.has(format) || looksLikeInternalReasoning(context_note)) {
      context_note = null;
    }
  }

  // guide_text safety net: if Claude left it empty, fall back to a neutral bridge
  // so the Soulo Guide Zone always shows something.
  const guide_text = (rp.guide_text && rp.guide_text.trim()) || pickFallbackBridge();

  return {
    guide_text,
    question_text: rp.question_text || '',
    question_format: format,
    answer_options,
    scale_range: rp.scale_range || null,
    context_note,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAIResponse(rawText: string): { internal: any | null; response: string } {
  let internal = null;
  let response = rawText;

  // Extract INTERNAL block
  const internalMatch = rawText.match(/<INTERNAL>([\s\S]*?)<\/INTERNAL>/);
  if (internalMatch) {
    try {
      internal = JSON.parse(internalMatch[1].trim());
    } catch {
      console.warn('[parseAIResponse] Failed to parse INTERNAL block as JSON');
    }
  }

  // Extract RESPONSE block
  const responseMatch = rawText.match(/<RESPONSE>\s*([\s\S]*?)(?:<\/RESPONSE>|$)/i);
  if (responseMatch) {
    response = responseMatch[1].trim();
  } else {
    // Fallback: strip INTERNAL block if present (including unclosed/truncated ones)
    response = rawText
      .replace(/<INTERNAL>[\s\S]*?<\/INTERNAL>/g, '')  // closed blocks
      .replace(/<INTERNAL>[\s\S]*/g, '')                // truncated/unclosed blocks
      .replace(/<RESPONSE>\s*/i, '')                    // open response tags
      .trim();
    if (!response) {
      // If stripping left nothing, the entire response was an INTERNAL block
      // that got truncated — return a safe fallback, never the raw INTERNAL content
      console.warn('[parseAIResponse] Response was entirely INTERNAL block (likely truncated)');
      response = '';
    }
  }

  return { internal, response };
}
