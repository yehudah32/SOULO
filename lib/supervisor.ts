import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface SupervisorResult {
  approved: boolean;
  score: number;
  issues: string[];
  correction: string;
}

const PASS: SupervisorResult = {
  approved: true,
  score: 7,
  issues: [],
  correction: '',
};

interface SupervisorContext {
  exchangeCount: number;
  currentStage: number;
  lastFormat: string;
  leadingType: number;
  proposedFormat: string;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

export async function supervisorCheck(
  proposedResponse: string,
  context: SupervisorContext
): Promise<SupervisorResult> {
  const { currentStage, lastFormat, proposedFormat } = context;

  // Comfort arc hard-fail: stages 1-2 require forced_choice or agree_disagree
  if (currentStage <= 2) {
    const allowedEarly = ['forced_choice', 'agree_disagree'];
    if (proposedFormat && !allowedEarly.includes(proposedFormat)) {
      return {
        approved: false,
        score: 0,
        issues: [
          `Stage ${currentStage} requires forced_choice or agree_disagree format, but "${proposedFormat}" was used.`,
        ],
        correction: `Regenerate using forced_choice or agree_disagree format. Keep the same topic but reframe as a binary choice or agree/disagree statement.`,
      };
    }
  }

  // Hard-fail: answer options embedded in response text
  const lowerResponse = proposedResponse.toLowerCase();
  const embeddedOptionPatterns = [
    'strongly agree, agree, neutral, disagree',
    'strongly agree or strongly disagree',
    'agree, neutral, disagree, strongly disagree',
    'never, sometimes, often, always',
    'never / sometimes / often / always',
    'option a, option b',
    'a) ', 'b) ', 'c) ',
  ];
  for (const pattern of embeddedOptionPatterns) {
    if (lowerResponse.includes(pattern)) {
      console.error('[supervisor] HARD FAIL: Answer options embedded in question text:', pattern);
      return {
        approved: false,
        score: 0,
        issues: ['Answer options are embedded in the question text. Options must be in answer_options array, never in question text.'],
        correction: 'Remove all answer option labels from question_text. Put them in response_parts.answer_options array only.',
      };
    }
  }

  // Hard-fail: no question mark in response (commentary instead of question)
  if (!proposedResponse.includes('?')) {
    console.error('[supervisor] HARD FAIL: Response contains no question mark — commentary leaked as question');
    return {
      approved: false,
      score: 0,
      issues: ['Response contains no question mark. question_text must ask an answerable question, not provide commentary.'],
      correction: 'Regenerate with a clear, direct question that ends with a question mark. Move any commentary to guide_text.',
    };
  }

  const systemPrompt = `You are a quality supervisor for an Enneagram assessment AI.
Your job is to evaluate whether a proposed assessment response follows all required rules.
Score the response across 5 criteria (0-2 points each, max 10):

1. LENGTH (0-2): Is the response 2-3 sentences maximum? (2=yes, 1=borderline 4 sentences, 0=more than 4)
2. FORMAT COMPLIANCE (0-2): Does it use a valid question format (forced_choice/agree_disagree/scale/frequency/behavioral_anchor/paragraph_select/scenario/open)? (2=clear format, 1=ambiguous, 0=no recognizable format or violates stage rules)
3. FORMAT ROTATION (0-2): Is the format different from the last format used? (2=different, 1=unclear, 0=same format repeated)
4. SINGLE QUESTION (0-2): Does it ask exactly one question? (2=one question, 0=zero or two+ questions)
5. MOTIVATION PROBE (0-2): Does it probe motivation/why rather than just behavior/what? (2=yes, 1=partial, 0=pure behavior question)

Respond with ONLY valid JSON (no markdown fences):
{
  "score": <0-10>,
  "criteria": {
    "length": <0-2>,
    "format_compliance": <0-2>,
    "format_rotation": <0-2>,
    "single_question": <0-2>,
    "motivation_probe": <0-2>
  },
  "issues": ["issue1", "issue2"],
  "correction": "brief instruction for regeneration if score < 7"
}`;

  const userMessage = `CONTEXT:
- Current stage: ${currentStage}
- Last format used: ${lastFormat || 'none'}
- Proposed format (from INTERNAL): ${proposedFormat || 'unknown'}
- Allowed formats for this stage: ${currentStage <= 2 ? 'forced_choice, agree_disagree' : currentStage <= 4 ? 'agree_disagree, scale, frequency' : currentStage <= 6 ? 'behavioral_anchor, paragraph_select, scenario' : 'open'}

PROPOSED RESPONSE:
${proposedResponse}

Evaluate and return JSON only.`;

  const anthropicCall = client.messages
    .create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    .then((result) => {
      const raw = result.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('');
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);
      const score: number = parsed.score ?? 7;
      return {
        approved: score >= 7,
        score,
        issues: parsed.issues ?? [],
        correction: parsed.correction ?? '',
      } as SupervisorResult;
    })
    .catch((err) => {
      console.warn('[supervisor] Anthropic call error (non-fatal):', err);
      return PASS;
    });

  const timeoutPromise = new Promise<SupervisorResult>((resolve) =>
    setTimeout(() => {
      console.log('[supervisor] timeout — skipped');
      resolve(PASS);
    }, 3000)
  );

  return Promise.race([anthropicCall, timeoutPromise]);
}
