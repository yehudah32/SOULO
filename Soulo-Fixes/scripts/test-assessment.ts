#!/usr/bin/env ts-node
// ═══════════════════════════════════════════════════════════════
// SOULO ASSESSMENT TEST HARNESS
// ═══════════════════════════════════════════════════════════════
//
// Simulates full assessments for all 9 types and generates a
// diagnostic report. Run with:
//   npx ts-node scripts/test-assessment.ts
//
// Requires ANTHROPIC_API_KEY in .env
//
// What it tests:
// 1. Question count (should be 8-15, not 20+)
// 2. Commentary leaking into question_text
// 3. Format rotation compliance
// 4. Stage-format compliance
// 5. Closing criteria met before close
// 6. thinking_display quality
// 7. Consistency across types
// 8. INTERNAL block completeness (no truncation)

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Simulated respondents — one per type ──
// Each has a persona that should clearly signal their type
const SIMULATED_RESPONDENTS: Record<number, {
  name: string;
  description: string;
  responses: Record<string, string>; // Maps question patterns to response strategies
  defaultResponse: (question: string, format: string) => string;
}> = {
  1: {
    name: 'Type 1 — The Reformer',
    description: 'Principled, organized, critical of self and others, driven by standards',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'The first option — I tend to hold myself to high standards and get frustrated when things aren\'t done right.';
      if (format === 'agree_disagree') return 'Strongly agree';
      if (format === 'scale') return '4';
      if (format === 'frequency') return 'Often';
      return 'I have a strong internal voice that tells me what the right thing to do is. When I see something being done incorrectly, it physically bothers me. I hold myself to the same standards — probably even higher. The hardest part is that I know I\'m being too critical but I can\'t seem to turn it off.';
    },
  },
  2: {
    name: 'Type 2 — The Helper',
    description: 'Warm, giving, focuses on others\' needs, struggles to identify own needs',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'I\'d say the second — I\'m usually the one checking in on everyone else before I think about myself.';
      if (format === 'agree_disagree') return 'Agree';
      if (format === 'scale') return '4';
      if (format === 'frequency') return 'Often';
      return 'People come to me when they need support. I can sense when someone is struggling before they say anything. My friends say I give too much, but honestly it doesn\'t feel like a choice — if someone needs help, I\'m there. Asking for help myself? That\'s harder. I don\'t want to be a burden.';
    },
  },
  3: {
    name: 'Type 3 — The Achiever',
    description: 'Success-oriented, efficient, image-conscious, adapts to audiences',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'The first — I\'m goal-oriented and I adjust my approach based on what will get the best result.';
      if (format === 'agree_disagree') return 'Strongly agree';
      if (format === 'scale') return '5';
      if (format === 'frequency') return 'Always';
      return 'I set goals and I hit them. That\'s just how I operate. I read the room and figure out what\'s needed, then I deliver. My biggest fear? Being seen as mediocre or ineffective. I\'d rather work 80 hours than let someone think I\'m not capable. The quiet moments are the hardest — when there\'s nothing to achieve, I don\'t know who I am.';
    },
  },
  4: {
    name: 'Type 4 — The Individualist',
    description: 'Emotionally deep, identity-focused, feels different from others, drawn to what\'s missing',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'The second resonates more — I tend to feel things deeply and notice what others miss.';
      if (format === 'agree_disagree') return 'Agree';
      if (format === 'scale') return '4';
      if (format === 'frequency') return 'Often';
      return 'There\'s always been something different about how I experience the world. I feel things at a depth that other people don\'t seem to reach. It\'s both a gift and a burden. I\'m drawn to beauty and meaning, but I also can\'t escape this sense that something essential is missing — like everyone else got a manual for life and I\'m making it up as I go.';
    },
  },
  5: {
    name: 'Type 5 — The Investigator',
    description: 'Analytical, private, conserves energy, needs space to think',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'The first — I need to understand something fully before I act on it.';
      if (format === 'agree_disagree') return 'Agree';
      if (format === 'scale') return '3';
      if (format === 'frequency') return 'Sometimes';
      return 'I need to understand things before I engage. Social situations drain me — I\'d rather observe than participate until I\'m confident I have something worth saying. My space is important to me. When people demand more than I feel I can give, I withdraw.';
    },
  },
  6: {
    name: 'Type 6 — The Loyalist',
    description: 'Loyal, anxious, questions authority, prepares for worst case',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'It depends — honestly both could apply. But if I had to choose, the second one, because I tend to think through what could go wrong.';
      if (format === 'agree_disagree') return 'Agree';
      if (format === 'scale') return '3';
      if (format === 'frequency') return 'Often';
      return 'I\'m the one who thinks three steps ahead and plans for what could go wrong. My friends call me the "what if" person. I\'m fiercely loyal to the people I trust, but trust doesn\'t come easy. I question authority, question myself, question everything really. It\'s exhausting but I can\'t stop.';
    },
  },
  7: {
    name: 'Type 7 — The Enthusiast',
    description: 'Energetic, optimistic, avoids pain, always planning the next thing',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'Definitely the first — I\'m always looking at possibilities and what\'s next.';
      if (format === 'agree_disagree') return 'Strongly agree';
      if (format === 'scale') return '5';
      if (format === 'frequency') return 'Always';
      return 'I love having options. The worst thing in the world is feeling trapped or stuck in something painful with no exit. I\'m the person who has five plans for the weekend and three backup plans. People say I\'m scattered but I just see so many interesting possibilities. Staying with something hard or boring? That\'s my kryptonite.';
    },
  },
  8: {
    name: 'Type 8 — The Challenger',
    description: 'Direct, powerful, protective, struggles with vulnerability',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'The first. I don\'t wait for permission and I don\'t back down when I believe something is right.';
      if (format === 'agree_disagree') return 'Strongly agree';
      if (format === 'scale') return '5';
      if (format === 'frequency') return 'Always';
      return 'I take charge. When something is wrong, I say it. I protect the people who can\'t protect themselves. People either love me or they\'re intimidated by me — there\'s no middle ground. The hardest thing for me is letting someone see me uncertain or afraid. Vulnerability feels like losing control.';
    },
  },
  9: {
    name: 'Type 9 — The Peacemaker',
    description: 'Easygoing, avoids conflict, merges with others, forgets own priorities',
    responses: {},
    defaultResponse: (question, format) => {
      if (format === 'forced_choice') return 'Hmm, probably the second? I tend to go with the flow and see both sides.';
      if (format === 'agree_disagree') return 'Neutral';
      if (format === 'scale') return '3';
      if (format === 'frequency') return 'Sometimes';
      return 'I like things to be peaceful. Conflict really gets to me — I\'d rather let something go than fight about it. People say I\'m easygoing, and I am, but sometimes I wonder if I\'ve been so busy keeping everyone else comfortable that I\'ve lost track of what I actually want. When someone asks what I want for dinner, I genuinely don\'t know.';
    },
  },
};

// ── INTERNAL block parser ──
interface ParsedResponse {
  internal: Record<string, unknown> | null;
  response: string;
  responseParts: {
    guide_text: string;
    question_text: string;
    question_format: string;
    answer_options: string[] | null;
  } | null;
  thinkingDisplay: string;
  truncated: boolean;
}

function parseResponse(rawText: string): ParsedResponse {
  let internal: Record<string, unknown> | null = null;
  let truncated = false;

  const internalMatch = rawText.match(/<INTERNAL>([\s\S]*?)<\/INTERNAL>/);
  if (internalMatch) {
    try {
      internal = JSON.parse(internalMatch[1].trim());
    } catch {
      truncated = true;
    }
  } else if (rawText.includes('<INTERNAL>')) {
    truncated = true; // Started but never closed
  }

  const responseMatch = rawText.match(/<RESPONSE>\s*([\s\S]*?)(?:<\/RESPONSE>|$)/i);
  const response = responseMatch
    ? responseMatch[1].trim()
    : rawText.replace(/<INTERNAL>[\s\S]*?<\/INTERNAL>/g, '').replace(/<INTERNAL>[\s\S]*/g, '').trim();

  const rp = (internal as Record<string, unknown>)?.response_parts as Record<string, unknown> | undefined;

  return {
    internal,
    response,
    responseParts: rp ? {
      guide_text: (rp.guide_text as string) || '',
      question_text: (rp.question_text as string) || '',
      question_format: (rp.question_format as string) || '',
      answer_options: rp.answer_options as string[] | null,
    } : null,
    thinkingDisplay: ((internal as Record<string, unknown>)?.thinking_display as string) || '',
    truncated,
  };
}

// ── Test runner ──
interface ExchangeLog {
  exchangeNumber: number;
  questionText: string;
  guideText: string;
  format: string;
  answer: string;
  thinkingDisplay: string;
  confidence: number;
  leadingType: number;
  stage: number;
  truncated: boolean;
  issues: string[];
}

interface TestResult {
  type: number;
  typeName: string;
  exchanges: ExchangeLog[];
  totalExchanges: number;
  finalType: number;
  finalConfidence: number;
  correctType: boolean;
  issues: {
    commentaryInQuestion: number;
    formatRepeat: number;
    stageFormatViolation: number;
    truncatedInternal: number;
    emptyThinkingDisplay: number;
    embeddedOptions: number;
    noQuestionMark: number;
  };
  score: number; // 0-100
}

async function runAssessment(targetType: number): Promise<TestResult> {
  const respondent = SIMULATED_RESPONDENTS[targetType];
  const exchanges: ExchangeLog[] = [];
  const issues = {
    commentaryInQuestion: 0,
    formatRepeat: 0,
    stageFormatViolation: 0,
    truncatedInternal: 0,
    emptyThinkingDisplay: 0,
    embeddedOptions: 0,
    noQuestionMark: 0,
  };

  // Simplified system prompt for testing
  const { ENNEAGRAM_SYSTEM_PROMPT_V2, STAGE_FORMAT_RULES } = await import('../lib/system-prompt-v2');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let lastFormat = '';
  let isComplete = false;
  let finalType = 0;
  let finalConfidence = 0;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Testing: ${respondent.name}`);
  console.log(`${'═'.repeat(60)}`);

  for (let i = 0; i < 25; i++) { // Max 25 exchanges safety limit
    const exchangeNum = i + 1;
    const stage = Math.min(7, Math.ceil(exchangeNum / 2));
    const stageRule = STAGE_FORMAT_RULES[stage] || '';

    // Build system prompt with stage-specific rules
    const systemPrompt = ENNEAGRAM_SYSTEM_PROMPT_V2 + '\n\n' + stageRule;

    // First exchange: user says they're ready
    if (i === 0) {
      messages.push({ role: 'user', content: "Yes, I'm ready" });
    }

    try {
      const result = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      });

      const rawText = result.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('\n');

      const parsed = parseResponse(rawText);
      const exchangeIssues: string[] = [];

      // Extract data
      const hypothesis = (parsed.internal as Record<string, unknown>)?.hypothesis as Record<string, unknown> | undefined;
      const confidence = (hypothesis?.confidence as number) ?? 0;
      const leadingType = (hypothesis?.leading_type as number) ?? 0;
      const conversation = (parsed.internal as Record<string, unknown>)?.conversation as Record<string, unknown> | undefined;
      const closeNext = (conversation?.close_next as boolean) ?? false;
      const currentStage = (conversation?.current_stage as number) ?? stage;

      const qt = parsed.responseParts?.question_text || '';
      const gt = parsed.responseParts?.guide_text || '';
      const fmt = parsed.responseParts?.question_format || '';

      // ── Run checks ──

      // Check 1: Truncated INTERNAL
      if (parsed.truncated) {
        issues.truncatedInternal++;
        exchangeIssues.push('TRUNCATED_INTERNAL');
      }

      // Check 2: Commentary in question_text
      const REFLECTION_PATTERNS = [
        /^that('s| is) (interesting|telling|revealing)/i,
        /^i notice/i,
        /^(the way|what) you (described|said|shared)/i,
        /^you (said|mentioned|described)/i,
        /^that (impulse|pull|drive|instinct|pattern)/i,
        /^(building|based) on (what|that)/i,
        /^it (sounds|seems|feels) like/i,
      ];
      if (qt && REFLECTION_PATTERNS.some(p => p.test(qt.trim()))) {
        issues.commentaryInQuestion++;
        exchangeIssues.push('COMMENTARY_IN_QUESTION');
      }

      // Check 3: Format rotation
      if (fmt && fmt === lastFormat && exchangeNum > 1) {
        issues.formatRepeat++;
        exchangeIssues.push(`FORMAT_REPEAT(${fmt})`);
      }

      // Check 4: Stage-format compliance
      const STAGE_FORMATS: Record<number, string[]> = {
        1: ['forced_choice', 'agree_disagree'],
        2: ['forced_choice', 'agree_disagree'],
        3: ['forced_choice', 'agree_disagree', 'scale', 'frequency'],
        4: ['forced_choice', 'agree_disagree', 'scale', 'frequency'],
        5: ['forced_choice', 'agree_disagree', 'scale', 'frequency', 'behavioral_anchor', 'paragraph_select', 'scenario'],
        6: ['forced_choice', 'agree_disagree', 'scale', 'frequency', 'behavioral_anchor', 'paragraph_select', 'scenario'],
        7: ['forced_choice', 'agree_disagree', 'scale', 'frequency', 'behavioral_anchor', 'paragraph_select', 'scenario', 'open'],
      };
      const allowed = STAGE_FORMATS[Math.min(currentStage, 7)] || [];
      if (fmt && !allowed.includes(fmt)) {
        issues.stageFormatViolation++;
        exchangeIssues.push(`STAGE_FORMAT(${fmt} at stage ${currentStage})`);
      }

      // Check 5: Empty thinking_display
      if (!parsed.thinkingDisplay && exchangeNum > 1) {
        issues.emptyThinkingDisplay++;
        exchangeIssues.push('EMPTY_THINKING_DISPLAY');
      }

      // Check 6: Embedded options
      const lower = qt.toLowerCase();
      if (lower.includes('strongly agree') || lower.includes('never, sometimes') || lower.includes('option a')) {
        issues.embeddedOptions++;
        exchangeIssues.push('EMBEDDED_OPTIONS');
      }

      // Check 7: No question mark
      if (qt && !qt.includes('?') && !closeNext) {
        issues.noQuestionMark++;
        exchangeIssues.push('NO_QUESTION_MARK');
      }

      // Log
      const statusEmoji = exchangeIssues.length === 0 ? '✅' : '⚠️';
      console.log(`  ${statusEmoji} Q${exchangeNum}: [${fmt}] ${qt.substring(0, 70)}${qt.length > 70 ? '...' : ''}`);
      if (exchangeIssues.length > 0) {
        console.log(`     Issues: ${exchangeIssues.join(', ')}`);
      }
      console.log(`     Confidence: ${(confidence * 100).toFixed(0)}% → Type ${leadingType} | Stage: ${currentStage}`);

      exchanges.push({
        exchangeNumber: exchangeNum,
        questionText: qt,
        guideText: gt,
        format: fmt,
        answer: '',
        thinkingDisplay: parsed.thinkingDisplay,
        confidence,
        leadingType,
        stage: currentStage,
        truncated: parsed.truncated,
        issues: exchangeIssues,
      });

      // Check if complete
      if (closeNext) {
        finalType = leadingType;
        finalConfidence = confidence;
        isComplete = true;
        console.log(`  🏁 Assessment closed at exchange ${exchangeNum}`);
        break;
      }

      // Add assistant message to history
      messages.push({ role: 'assistant', content: parsed.response });

      // Generate simulated response
      lastFormat = fmt;
      const answer = respondent.defaultResponse(qt, fmt);
      messages.push({ role: 'user', content: answer });

      exchanges[exchanges.length - 1].answer = answer;

    } catch (err) {
      console.error(`  ❌ Error at exchange ${exchangeNum}:`, err);
      break;
    }
  }

  if (!isComplete) {
    console.log(`  ⚠️ Assessment did not close within 25 exchanges`);
    const lastExchange = exchanges[exchanges.length - 1];
    finalType = lastExchange?.leadingType || 0;
    finalConfidence = lastExchange?.confidence || 0;
  }

  // Calculate score
  const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0);
  const correctType = finalType === targetType;
  let score = 100;
  score -= totalIssues * 3; // -3 per issue
  score -= Math.max(0, exchanges.length - 15) * 5; // -5 per excess exchange
  if (!correctType) score -= 20; // -20 for wrong type
  if (!isComplete) score -= 15; // -15 for not closing
  score = Math.max(0, Math.min(100, score));

  return {
    type: targetType,
    typeName: respondent.name,
    exchanges,
    totalExchanges: exchanges.length,
    finalType,
    finalConfidence,
    correctType,
    issues,
    score,
  };
}

// ── Main ──
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       SOULO ASSESSMENT TEST HARNESS                    ║');
  console.log('║       Testing all 9 types with simulated respondents   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const typesToTest = process.argv[2]
    ? process.argv[2].split(',').map(Number)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const results: TestResult[] = [];

  for (const type of typesToTest) {
    const result = await runAssessment(type);
    results.push(result);
  }

  // ── Summary Report ──
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY REPORT                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  console.log('\n┌─────────┬───────────┬────────────┬──────────┬───────┐');
  console.log('│ Type    │ Exchanges │ Correct?   │ Confid.  │ Score │');
  console.log('├─────────┼───────────┼────────────┼──────────┼───────┤');

  for (const r of results) {
    const typeCol = `Type ${r.type}`.padEnd(7);
    const exchCol = String(r.totalExchanges).padStart(5).padEnd(9);
    const correctCol = (r.correctType ? '✅ Yes' : `❌ Got ${r.finalType}`).padEnd(10);
    const confCol = `${(r.finalConfidence * 100).toFixed(0)}%`.padStart(5).padEnd(8);
    const scoreCol = `${r.score}`.padStart(3).padEnd(5);
    console.log(`│ ${typeCol} │ ${exchCol} │ ${correctCol} │ ${confCol} │ ${scoreCol} │`);
  }

  console.log('└─────────┴───────────┴────────────┴──────────┴───────┘');

  // Aggregate issues
  console.log('\n── ISSUE BREAKDOWN ──');
  const totals = {
    commentaryInQuestion: 0,
    formatRepeat: 0,
    stageFormatViolation: 0,
    truncatedInternal: 0,
    emptyThinkingDisplay: 0,
    embeddedOptions: 0,
    noQuestionMark: 0,
  };

  for (const r of results) {
    for (const [key, val] of Object.entries(r.issues)) {
      totals[key as keyof typeof totals] += val;
    }
  }

  for (const [key, val] of Object.entries(totals)) {
    const emoji = val === 0 ? '✅' : val <= 3 ? '⚠️' : '❌';
    console.log(`  ${emoji} ${key}: ${val} occurrences across ${results.length} assessments`);
  }

  // Average score
  const avgScore = results.reduce((a, b) => a + b.score, 0) / results.length;
  console.log(`\n── AVERAGE SCORE: ${avgScore.toFixed(0)}/100 ──`);

  if (avgScore >= 80) console.log('🟢 System is performing well');
  else if (avgScore >= 60) console.log('🟡 System needs improvement');
  else console.log('🔴 System has critical issues');
}

main().catch(console.error);
