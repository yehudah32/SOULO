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
