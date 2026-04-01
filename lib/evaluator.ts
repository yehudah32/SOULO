import Anthropic from '@anthropic-ai/sdk';
import { getSession } from './session-store';
import { adminClient } from './supabase';
import { updateQuestionYield } from './question-bank';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Whole Type archetype lookup keyed by whole type string (e.g. "125", "469")
const WHOLE_TYPE_ARCHETYPES: Record<string, { life_purpose: string; blind_spot: string; growing_edge: string; core_triggers: string[] }> = {
  '125': { life_purpose: 'The Mentor — to teach the right way with love', blind_spot: 'Perfectionism + over-giving leaving nothing for self', growing_edge: 'Accept imperfect love and receive help', core_triggers: ['incompetence', 'ingratitude', 'disorder'] },
  '126': { life_purpose: 'The Guardian — to serve and protect the community', blind_spot: 'Anxiety about being enough while giving everything', growing_edge: 'Trust self without needing external validation', core_triggers: ['betrayal', 'irresponsibility', 'abandonment'] },
  '127': { life_purpose: 'The Teacher — to inspire and uplift with joy', blind_spot: 'Avoiding painful emotional depth behind optimism', growing_edge: 'Stay with discomfort long enough to learn from it', core_triggers: ['ingratitude', 'limitation', 'negativity'] },
  '135': { life_purpose: 'The Researcher — to master and perfect the system', blind_spot: 'Emotional isolation in pursuit of flawless understanding', growing_edge: 'Share knowledge before it is perfect', core_triggers: ['incompetence', 'intrusion', 'chaos'] },
  '136': { life_purpose: 'The Taskmaster — to build reliable, excellent structures', blind_spot: 'Rigidity and anxiety masquerading as responsibility', growing_edge: 'Delegate and trust others', core_triggers: ['unreliability', 'incompetence', 'disorganization'] },
  '137': { life_purpose: 'The Systems Builder — to create efficient, inspiring systems', blind_spot: 'Image-polishing instead of depth of relationship', growing_edge: 'Value being over doing', core_triggers: ['inefficiency', 'mediocrity', 'restriction'] },
  '145': { life_purpose: 'The Iconoclast — to transform through original vision', blind_spot: 'Withdrawal and shame blocking authentic expression', growing_edge: 'Act before the vision is fully formed', core_triggers: ['inauthenticity', 'banality', 'intrusion'] },
  '146': { life_purpose: 'The Philosopher — to find the profound truth beneath the surface', blind_spot: 'Anxiety and melancholy feeding each other in isolation', growing_edge: 'Trust the process without needing certainty', core_triggers: ['inauthenticity', 'betrayal', 'abandonment'] },
  '147': { life_purpose: 'The Visionary — to inspire transformation through beauty and possibility', blind_spot: 'Escaping pain into imagination and future-planning', growing_edge: 'Commit to one vision and develop it fully', core_triggers: ['limitation', 'ordinariness', 'suffering'] },
  '258': { life_purpose: 'The Rescuer — to fight for the vulnerable with fierce love', blind_spot: 'Controlling others under the guise of protecting them', growing_edge: 'Receive as well as give — allow vulnerability', core_triggers: ['injustice', 'powerlessness', 'ingratitude'] },
  '259': { life_purpose: 'The Mediator — to create peace through empathy and service', blind_spot: 'Disappearing into others while avoiding own needs', growing_edge: 'Know and name your own desires without guilt', core_triggers: ['conflict', 'abandonment', 'invisibility'] },
  '268': { life_purpose: 'The Advocate — to champion the underdog with power and love', blind_spot: 'Pushing people away while desperately needing them', growing_edge: 'Ask for help directly — drop the armor', core_triggers: ['betrayal', 'injustice', 'powerlessness'] },
  '269': { life_purpose: 'The Good Samaritan — to serve all with loyal, gentle strength', blind_spot: 'Self-erasure through endless accommodation', growing_edge: 'Stand for your own needs and preferences', core_triggers: ['conflict', 'ingratitude', 'being overlooked'] },
  '358': { life_purpose: 'The Solution Master — to solve problems with force and vision', blind_spot: 'Ruthless efficiency bypassing human relationships', growing_edge: 'Slow down enough to feel and connect', core_triggers: ['incompetence', 'weakness', 'inefficiency'] },
  '359': { life_purpose: 'The Ambassador — to unite people through competence and calm', blind_spot: 'Avoiding conflict by merging with others\' agendas', growing_edge: 'Develop and express a strong personal position', core_triggers: ['conflict', 'incompetence', 'pressure'] },
  '368': { life_purpose: 'The Justice Fighter — to protect the tribe with fierce competence', blind_spot: 'Testing loyalty so hard you push away those you need', growing_edge: 'Trust without requiring people to prove themselves', core_triggers: ['betrayal', 'injustice', 'incompetence'] },
  '369': { life_purpose: 'The Peacemaker — to harmonize and serve with quiet strength', blind_spot: 'Avoiding authentic self-expression to keep everyone happy', growing_edge: 'Discover and express your own truth boldly', core_triggers: ['conflict', 'pressure', 'being controlled'] },
  '378': { life_purpose: 'The Mover and Shaker — to achieve greatness and transform the world', blind_spot: 'Leaving a trail of relationships sacrificed for results', growing_edge: 'Let vulnerability and connection be part of success', core_triggers: ['powerlessness', 'limitation', 'failure'] },
  '379': { life_purpose: 'The Gentle Spirit — to inspire peace, possibility, and belonging', blind_spot: 'Avoiding depth and difficult truths behind optimism', growing_edge: 'Develop and hold a position even under pressure', core_triggers: ['conflict', 'negativity', 'restriction'] },
  '458': { life_purpose: 'The Scholar — to master the deep truth and act on it powerfully', blind_spot: 'Emotional withdrawal and elitism blocking real connection', growing_edge: 'Share the work before it\'s ready — trust others', core_triggers: ['incompetence', 'shallowness', 'intrusion'] },
  '459': { life_purpose: 'The Contemplative — to find and share the hidden wisdom of existence', blind_spot: 'Disappearing inward and losing connection to the living world', growing_edge: 'Bring the inner life into active relationship with others', core_triggers: ['intrusion', 'demands', 'emptiness'] },
  '468': { life_purpose: 'The Truth Teller — to expose what is real with depth and power', blind_spot: 'Shame and rage reinforcing each other in a reactive loop', growing_edge: 'Receive feedback without it becoming an existential threat', core_triggers: ['betrayal', 'injustice', 'inauthenticity'] },
  '469': { life_purpose: 'The Seeker — to find authentic belonging through depth and loyalty', blind_spot: 'Anxiety and longing keeping the person from the present', growing_edge: 'Rest in what is, rather than what is missing', core_triggers: ['betrayal', 'abandonment', 'inauthenticity'] },
  '478': { life_purpose: 'The Messenger — to transform the world through fierce original vision', blind_spot: 'Intensity and idealism burning through people and projects', growing_edge: 'Sustain commitment through imperfection and limitation', core_triggers: ['mediocrity', 'betrayal', 'restriction'] },
  '479': { life_purpose: 'The Gentle Visionary — to awaken others to beauty, depth, and possibility', blind_spot: 'Living in imagination while avoiding the difficult present', growing_edge: 'Ground the vision in daily discipline and real relationship', core_triggers: ['pain', 'restriction', 'ordinariness'] },
};

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

export async function runPostAssessmentEvaluation(sessionId: string): Promise<void> {
  try {
    const session = getSession(sessionId);
    if (!session || session.exchangeCount < 8) {
      console.log('[evaluator] Skipping — session missing or too short:', sessionId);
      return;
    }

    const transcript = session.conversationHistory
      .map((msg, i) => `[${i + 1}] ${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    const systemPrompt = `You are a quality evaluator for an Enneagram assessment AI system.
Your job is to analyze a completed assessment transcript and provide structured quality scores.
Respond with ONLY valid JSON (no markdown fences).`;

    const userMessage = `Analyze this Enneagram assessment transcript and return a quality evaluation.

TRANSCRIPT:
${transcript}

Return this exact JSON structure with no markdown:
{
  "overall_score": <0-10 float>,
  "format_compliance_score": <0-10 float, how well question formats varied and followed stage rules>,
  "differentiation_score": <0-10 float, how well the AI differentiated between close type candidates>,
  "closing_criteria_score": <0-10 float, how well closing criteria were met before ending>,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "question_usefulness": [
    { "question_text_fragment": "<first 50 chars>", "was_useful": true, "reason": "..." }
  ],
  "final_type_confidence": <0.0-1.0 float from last INTERNAL block>
}`;

    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = result.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    let evaluation: {
      overall_score: number;
      format_compliance_score: number;
      differentiation_score: number;
      closing_criteria_score: number;
      strengths: string[];
      weaknesses: string[];
      question_usefulness: Array<{ question_text_fragment: string; was_useful: boolean; reason: string }>;
      final_type_confidence: number;
    };

    try {
      evaluation = JSON.parse(stripCodeFences(rawText));
    } catch {
      console.error('[evaluator] Failed to parse evaluation JSON:', rawText.slice(0, 200));
      return;
    }

    // Insert into assessment_evaluations
    const { error: evalInsertError } = await adminClient.from('assessment_evaluations').upsert({
      session_id: sessionId,
      overall_score: evaluation.overall_score ?? 5,
      format_compliance_score: evaluation.format_compliance_score ?? 5,
      differentiation_score: evaluation.differentiation_score ?? 5,
      closing_criteria_score: evaluation.closing_criteria_score ?? 5,
      strengths: evaluation.strengths ?? [],
      weaknesses: evaluation.weaknesses ?? [],
      question_usefulness: evaluation.question_usefulness ?? [],
      final_type_confidence: evaluation.final_type_confidence ?? 0,
      exchange_count: session.exchangeCount,
    });
    if (evalInsertError) {
      console.error('[evaluator] assessment_evaluations insert error:', evalInsertError.message);
    }

    // ── Per-question contribution measurement ──
    // Walk through ALL questions asked (not just the last one) and measure contribution
    const allQs = session.allQuestionsAsked || [];
    const finalType = (session.internalState as Record<string, unknown>)?.hypothesis
      ? ((session.internalState as Record<string, unknown>).hypothesis as Record<string, unknown>)?.leading_type as number
      : 0;
    const typeScores = ((session.internalState as Record<string, unknown>)?.hypothesis as Record<string, unknown>)?.type_scores as Record<string, number> ?? {};

    if (allQs.length > 0 && finalType > 0) {
      // Get top 3 types (final + top 2 competitors) for relevance scoring
      const sortedTypes = Object.entries(typeScores)
        .map(([t, s]) => ({ type: Number(t), score: s }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(t => t.type);

      // Fetch target_types for all questions asked
      const qIds = allQs.map(q => q.questionId).filter(id => id > 0);
      let questionTargets: Record<number, number[]> = {};
      if (qIds.length > 0) {
        try {
          const { data } = await adminClient
            .from('questions')
            .select('id, target_types')
            .in('id', qIds);
          if (data) {
            for (const row of data) {
              questionTargets[row.id] = (row.target_types as number[]) || [];
            }
          }
        } catch { /* non-fatal */ }
      }

      // Score each question's contribution
      const yieldPromises = allQs.map(async (q) => {
        if (q.questionId <= 0) return;
        const targets = questionTargets[q.questionId] || [];
        let contributionScore: number;
        let reason: string;

        if (targets.length === 0) {
          // General question (no specific target types) — neutral
          contributionScore = 0.5;
          reason = `general question, no target types, final type ${finalType}`;
        } else if (targets.some(t => sortedTypes.includes(t))) {
          // Question targeted the final type or its top competitors — helpful
          contributionScore = 0.8;
          reason = `targets [${targets.join(',')}] overlap with top types [${sortedTypes.join(',')}]`;
        } else {
          // Question targeted unrelated types — didn't help differentiate
          contributionScore = 0.2;
          reason = `targets [${targets.join(',')}] miss top types [${sortedTypes.join(',')}]`;
        }

        await updateQuestionYield(q.questionId, contributionScore, sessionId, reason);
      });

      // Run all yield updates in parallel, non-blocking
      Promise.all(yieldPromises).catch(err => {
        console.warn('[evaluator] yield update batch error (non-fatal):', err);
      });

      console.log(`[evaluator] yield updates queued for ${allQs.length} questions, final type ${finalType}`);
    }

    // If score is low, record the top weakness as a learning
    const overallScore = evaluation.overall_score ?? 7;
    if (overallScore < 6 && evaluation.weaknesses?.length) {
      const topWeakness = evaluation.weaknesses[0];
      const { error: learningInsertError } = await adminClient.from('assessment_learnings').insert({
        session_id: sessionId,
        learning_type: 'low_quality_session',
        description: topWeakness,
        severity: overallScore < 4 ? 3 : 2,
      });
      if (learningInsertError) {
        console.error('[evaluator] assessment_learnings insert error:', learningInsertError.message);
      }
    }

    // Populate whole type archetype in resultsData if whole type is known
    const wholeType = session.wholeType;
    if (wholeType && WHOLE_TYPE_ARCHETYPES[wholeType]) {
      const archetype = WHOLE_TYPE_ARCHETYPES[wholeType];
      await adminClient.from('assessment_evaluations')
        .update({ })
        .eq('session_id', sessionId);
      // Log for now — resultsData is set in chat route
      console.log('[evaluator] Whole Type archetype resolved:', wholeType, '->', archetype.life_purpose);
    }

    console.log(`[evaluator] complete — session: ${sessionId}, score: ${overallScore}`);
  } catch (err) {
    // Never propagate — evaluation is best-effort
    console.error('[evaluator] Non-fatal error:', err);
  }
}
