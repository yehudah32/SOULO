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

  const format = rp.question_format || 'open';
  let context_note: string | null = rp.context_note || null;

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
    answer_options: Array.isArray(rp.answer_options) ? rp.answer_options : null,
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
