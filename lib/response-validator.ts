// ═══════════════════════════════════════════════════════════════
// RESPONSE VALIDATOR — Runs BEFORE sending response to client
// ═══════════════════════════════════════════════════════════════
//
// Replaces the fire-and-forget supervisor with a synchronous,
// rule-based check that actually blocks bad responses.
//
// Usage in chat/route.ts:
//   const validation = validateAssessmentResponse(responseParts, stage, lastFormat, exchangeCount);
//   if (!validation.valid) {
//     // Either fix automatically or retry
//   }

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-10
  issues: ValidationIssue[];
  autoFixed: boolean;
  fixedParts?: {
    guide_text?: string;
    question_text?: string;
  };
}

export interface ValidationIssue {
  rule: string;
  severity: 'critical' | 'warning';
  message: string;
}

// Reflection patterns that should NEVER appear in question_text
const REFLECTION_PATTERNS = [
  /^that('s| is) (interesting|telling|revealing|significant|notable|important)/i,
  /^i notice/i,
  /^i can (see|hear|feel|sense|tell)/i,
  /^(interesting|notable|telling|revealing)\b/i,
  /^(the way|what) you (described|said|shared|mentioned|expressed)/i,
  /^you (said|mentioned|described|shared|noted|expressed)/i,
  /^that (impulse|pull|drive|instinct|pattern|tension|gap|space|hesitation|resistance)/i,
  /^(something|there's something) (in|about) (you|that|what|the way)/i,
  /^(building|based) on (what|that)/i,
  /^that tells me/i,
  /^(owning|carrying|holding|bearing) .{3,30} — that/i,
  /^the fact that you/i,
  /^(so|and|but) you/i,
  /^it (sounds|seems|feels|looks) like/i,
  /^what you (just |)(described|shared|said)/i,
  /^that's (not |)(a |)(preference|reflex|pattern|habit|strategy)/i,
];

// Embedded option patterns that should NEVER appear in question_text
const EMBEDDED_OPTION_PATTERNS = [
  'strongly agree, agree, neutral, disagree',
  'strongly agree or strongly disagree',
  'agree, neutral, disagree, strongly disagree',
  'never, sometimes, often, always',
  'never / sometimes / often / always',
  'option a, option b',
  'on a scale of 1',
  'on a scale from 1',
  'rate from 1',
  'rate it from',
];

// Stage → allowed formats mapping
// CUMULATIVE: later stages add formats, not replace. forced_choice is always valid.
const STAGE_FORMATS: Record<number, string[]> = {
  1: ['forced_choice', 'agree_disagree'],
  2: ['forced_choice', 'agree_disagree'],
  3: ['forced_choice', 'agree_disagree', 'scale', 'frequency'],
  4: ['forced_choice', 'agree_disagree', 'scale', 'frequency'],
  5: ['forced_choice', 'agree_disagree', 'scale', 'frequency', 'behavioral_anchor', 'paragraph_select', 'scenario'],
  6: ['forced_choice', 'agree_disagree', 'scale', 'frequency', 'behavioral_anchor', 'paragraph_select', 'scenario'],
  7: ['forced_choice', 'agree_disagree', 'scale', 'frequency', 'behavioral_anchor', 'paragraph_select', 'scenario', 'open'],
};

function getStageFormats(stage: number): string[] {
  return STAGE_FORMATS[Math.min(stage, 7)] || STAGE_FORMATS[7];
}

function startsWithReflection(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return REFLECTION_PATTERNS.some(p => p.test(trimmed));
}

function hasEmbeddedOptions(text: string | undefined | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return EMBEDDED_OPTION_PATTERNS.some(p => lower.includes(p));
}

function countSentences(text: string): number {
  if (!text) return 0;
  // Split on sentence-ending punctuation followed by space or end
  return text.split(/[.!?]+\s*/g).filter(s => s.trim().length > 3).length;
}

/**
 * Auto-fix: Move reflection preamble from question_text to guide_text.
 * Returns the fixed parts, or null if no fix was needed/possible.
 */
function autoFixReflectionLeak(
  guideText: string,
  questionText: string
): { guide_text: string; question_text: string } | null {
  if (!questionText || !startsWithReflection(questionText)) return null;

  const trimmed = questionText.trim();

  // Strategy 1: Split on sentence boundaries — move pre-question sentences to guide
  const sentences = trimmed.split(/(?<=[.!])\s+/);
  if (sentences.length > 1) {
    const firstQuestionIdx = sentences.findIndex(s => s.includes('?'));
    if (firstQuestionIdx > 0) {
      const bridgePart = sentences.slice(0, firstQuestionIdx).join(' ');
      const questionPart = sentences.slice(firstQuestionIdx).join(' ');
      return {
        guide_text: ((guideText || '') + ' ' + bridgePart).trim(),
        question_text: questionPart,
      };
    }
  }

  // Strategy 2: Split on em dash
  const dashSplit = trimmed.split(/\s*[—–]\s*/);
  if (dashSplit.length >= 2) {
    const lastPart = dashSplit[dashSplit.length - 1];
    if (lastPart.includes('?')) {
      const reflPart = dashSplit.slice(0, -1).join(' — ');
      return {
        guide_text: ((guideText || '') + ' ' + reflPart).trim(),
        question_text: lastPart.charAt(0).toUpperCase() + lastPart.slice(1),
      };
    }
  }

  return null; // Can't auto-fix
}

/**
 * Main validation function. Call BEFORE sending response to client.
 */
export function validateAssessmentResponse(
  responseParts: {
    guide_text?: string;
    question_text?: string;
    question_format?: string;
    answer_options?: string[] | null;
    scale_range?: { min: number; max: number } | null;
  } | null,
  fullResponseText: string,
  stage: number,
  lastFormat: string,
  exchangeCount: number,
  isClosing: boolean = false
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let score = 10;
  let autoFixed = false;
  let fixedParts: { guide_text?: string; question_text?: string } | undefined;

  // If closing, skip question validation
  if (isClosing) {
    return { valid: true, score: 10, issues: [], autoFixed: false };
  }

  const qt = responseParts?.question_text?.trim() || '';
  const gt = responseParts?.guide_text?.trim() || '';
  const format = responseParts?.question_format || '';

  // ═══ CRITICAL RULES (score -= 3 each) ═══

  // Rule 1: question_text must contain a question mark
  if (qt && !qt.includes('?')) {
    issues.push({
      rule: 'question_mark_required',
      severity: 'critical',
      message: `question_text has no question mark: "${qt.substring(0, 60)}..."`,
    });
    score -= 3;
  }

  // Rule 2: No reflection patterns in question_text
  if (startsWithReflection(qt)) {
    // Try auto-fix first
    const fix = autoFixReflectionLeak(gt, qt);
    if (fix) {
      fixedParts = fix;
      autoFixed = true;
      issues.push({
        rule: 'reflection_in_question',
        severity: 'warning',
        message: `Reflection auto-fixed from question_text: "${qt.substring(0, 40)}..."`,
      });
      score -= 1; // Reduced penalty because we auto-fixed
    } else {
      issues.push({
        rule: 'reflection_in_question',
        severity: 'critical',
        message: `Reflection detected in question_text (could not auto-fix): "${qt.substring(0, 60)}..."`,
      });
      score -= 3;
    }
  }

  // Rule 3: No embedded answer options in question_text
  if (hasEmbeddedOptions(qt)) {
    issues.push({
      rule: 'embedded_options',
      severity: 'critical',
      message: 'Answer options are embedded in question_text. They must be in answer_options array.',
    });
    score -= 3;
  }

  // Rule 4: Stage-format compliance
  if (format) {
    const allowed = getStageFormats(stage);
    if (!allowed.includes(format)) {
      issues.push({
        rule: 'stage_format_violation',
        severity: 'critical',
        message: `Format "${format}" not allowed at stage ${stage}. Allowed: ${allowed.join(', ')}`,
      });
      score -= 3;
    }
  }

  // ═══ WARNING RULES (score -= 1 each) ═══

  // Rule 5: Format rotation — don't repeat last format
  if (format && format === lastFormat && exchangeCount > 1) {
    issues.push({
      rule: 'format_repeat',
      severity: 'warning',
      message: `Same format "${format}" used consecutively.`,
    });
    score -= 1;
  }

  // Rule 6: Response length — 2-3 sentences max for the full response
  const totalText = (gt + ' ' + qt).trim();
  const sentenceCount = countSentences(totalText);
  if (sentenceCount > 5) {
    issues.push({
      rule: 'response_too_long',
      severity: 'warning',
      message: `Response has ~${sentenceCount} sentences (max 4-5 including guide).`,
    });
    score -= 1;
  }

  // Rule 7: Format requires answer_options but none provided
  const formatsRequiringOptions = ['forced_choice', 'agree_disagree', 'frequency', 'paragraph_select'];
  if (formatsRequiringOptions.includes(format) && (!responseParts?.answer_options || responseParts.answer_options.length === 0)) {
    issues.push({
      rule: 'missing_answer_options',
      severity: 'warning',
      message: `Format "${format}" requires answer_options but none provided.`,
    });
    score -= 1;
  }

  // Rule 8: Scale format requires scale_range
  if (format === 'scale' && !responseParts?.scale_range) {
    issues.push({
      rule: 'missing_scale_range',
      severity: 'warning',
      message: 'Scale format used but scale_range not declared.',
    });
    score -= 1;
  }

  // Rule 9: Empty question_text (not closing)
  if (!qt) {
    issues.push({
      rule: 'empty_question',
      severity: 'critical',
      message: 'question_text is empty.',
    });
    score -= 3;
  }

  // Rule 10: Format/intent mismatch — open-ended "or" choice questions must NOT use Likert/frequency/scale
  // Examples: "do you tend to feel X, or more like Y?" cannot pair with Strongly Agree → Strongly Disagree
  if (qt && format) {
    const likertLikeFormats = ['agree_disagree', 'frequency', 'scale'];
    if (likertLikeFormats.includes(format)) {
      // Detect "or" choice pattern: "..., or X?" or "X or Y?" near the end of the question
      const orChoicePattern = /\b(more|tend(s|ing)? to|feel|like|do)\b[^?]{3,80}\bor\b[^?]{2,80}\?/i;
      const startsWithQuestionWord = /^(when|how|do|does|what|why|which|are|is|would|could|should)\b/i.test(qt);
      const hasOrChoice = orChoicePattern.test(qt) || /,\s*or\s+(more |like |something )?[^?]{2,60}\?/i.test(qt);

      if (hasOrChoice) {
        issues.push({
          rule: 'format_intent_mismatch_or_choice',
          severity: 'critical',
          message: `Open "or" choice question paired with ${format} scale. Must use forced_choice or open format.`,
        });
        score -= 3;
      } else if (format === 'agree_disagree' && startsWithQuestionWord) {
        // agree_disagree should be a STATEMENT (e.g. "I tend to..."), not a question (e.g. "When you...?")
        issues.push({
          rule: 'agree_disagree_should_be_statement',
          severity: 'critical',
          message: 'agree_disagree format requires a statement, not a "When/How/Do you" question.',
        });
        score -= 3;
      }
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(10, score));

  return {
    valid: score >= 7,
    score,
    issues,
    autoFixed,
    fixedParts: autoFixed ? fixedParts : undefined,
  };
}

/**
 * Sanitize thinking_display (the per-turn reflection shown during loading).
 * Strips AI tropes, meta-quoting reflections, and aphoristic garbage.
 * Returns the cleaned text, or empty string if it should be hidden entirely.
 */
const THINKING_DISPLAY_TROPE_PATTERNS: RegExp[] = [
  // Negative parallelism: "Not X. Not Y. Z..."
  /\bnot\s+\w+ing[.,]\s*not\s+\w+ing/i,
  // Aphoristic "X is internal — not borrowed" / "X — not Y" reframes
  /—\s*not\s+(borrowed|inherited|copied|imitated)\b/i,
  // Meta-quoting: "the X-part landed clearly", "X really came through"
  /\bthe\s+[^.]{4,40}-part\b/i,
  /\b(landed|came through|stood out|registered)\s+(clearly|hard|loud)\b/i,
  // Generic Frankl-esque aphorisms
  /\bbetween\s+stimulus\s+and\s+response\b/i,
  /\breturning\s+to\s+what\s+was\s+(always|already)\s+there\b/i,
  // Quote-and-reframe formula: starts with quoted answer, then dramatic statement
  /^["'].{2,40}["']\s*[—–-]/,
  // Numerical callback: "A 4 out of 5 — that's..."
  /^a?\s*\d+\s*(out\s+of|\/)\s*\d+\s*[—–-]/i,
  // "That gap matters", "That tells me", etc.
  /\bthat\s+(gap|tension|hesitation|space)\s+(matters|is|tells|says)\b/i,
];

export function sanitizeThinkingDisplay(text: string | null | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  // If any trope pattern matches, drop the whole thing — fallback will be used
  if (THINKING_DISPLAY_TROPE_PATTERNS.some(p => p.test(trimmed))) {
    return '';
  }
  return trimmed;
}

/**
 * Quick check for the supervisor to run BEFORE response is sent.
 * Returns true if response is good enough to send.
 * If false, the caller should retry or fix.
 */
export function isResponseSendable(
  responseParts: Parameters<typeof validateAssessmentResponse>[0],
  fullResponseText: string,
  stage: number,
  lastFormat: string,
  exchangeCount: number,
  isClosing: boolean
): boolean {
  const result = validateAssessmentResponse(
    responseParts, fullResponseText, stage, lastFormat, exchangeCount, isClosing
  );
  return result.valid;
}
