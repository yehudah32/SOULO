export interface ResponseParts {
  guide_text: string;
  question_text: string;
  question_format: string;
  answer_options: string[] | null;
  scale_range: { min: number; max: number } | null;
  context_note: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getResponseParts(internal: any): ResponseParts | null {
  const rp = internal?.response_parts;
  if (!rp || !rp.question_text) return null;
  return {
    guide_text: rp.guide_text || '',
    question_text: rp.question_text || '',
    question_format: rp.question_format || 'open',
    answer_options: Array.isArray(rp.answer_options) ? rp.answer_options : null,
    scale_range: rp.scale_range || null,
    context_note: rp.context_note || null,
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
