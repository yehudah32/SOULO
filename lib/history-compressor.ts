// ═══════════════════════════════════════════════════════════════
// CONVERSATION HISTORY COMPRESSOR
// ═══════════════════════════════════════════════════════════════
//
// Replaces the raw message windowing (last 10 messages) with
// intelligent compression that preserves assessment context.
//
// Usage in chat/route.ts:
//   import { compressHistory } from '@/lib/history-compressor';
//   const anthropicMessages = compressHistory(messages, session.internalState);

export interface CompressedHistory {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  summaryInjected: boolean;
}

/**
 * Compress conversation history for the Claude API call.
 * 
 * Strategy:
 * - If ≤ 12 messages: send all (no compression needed)
 * - If > 12 messages: send a structured summary of early exchanges
 *   + the last 8 raw messages
 * 
 * The summary preserves WHAT WAS ASKED and WHAT WAS LEARNED,
 * so Claude doesn't repeat questions or lose track of hypotheses.
 */
export function compressHistory(
  messages: Array<{ role: string; content: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internalState: any | null
): CompressedHistory {
  const MAX_RAW_MESSAGES = 12;

  if (messages.length <= MAX_RAW_MESSAGES) {
    return {
      messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      summaryInjected: false,
    };
  }

  // Build a structured summary of early exchanges
  const earlyMessages = messages.slice(0, messages.length - 8);
  const recentMessages = messages.slice(-8);

  // Ensure first message is from user (Anthropic requirement)
  if (recentMessages[0]?.role === 'assistant') {
    recentMessages.shift();
  }

  // Extract key information from early exchanges
  const earlyExchanges: string[] = [];
  for (let i = 0; i < earlyMessages.length; i += 2) {
    const assistantMsg = earlyMessages[i];
    const userMsg = earlyMessages[i + 1];
    if (assistantMsg?.role === 'assistant' && userMsg?.role === 'user') {
      // Truncate long messages to key content
      const qSummary = assistantMsg.content.length > 100
        ? assistantMsg.content.substring(0, 100) + '...'
        : assistantMsg.content;
      const aSummary = userMsg.content.length > 150
        ? userMsg.content.substring(0, 150) + '...'
        : userMsg.content;
      earlyExchanges.push(`Q: ${qSummary}\nA: ${aSummary}`);
    }
  }

  // Build summary with hypothesis state
  const hypothesis = internalState?.hypothesis;
  const centersProbed = internalState?.centers || {};
  const variantSignals = internalState?.variant_signals || {};

  const summaryParts: string[] = [
    `EARLIER EXCHANGES SUMMARY (${earlyExchanges.length} exchanges):`,
  ];

  // Add each exchange as a condensed line
  earlyExchanges.forEach((ex, i) => {
    summaryParts.push(`[Exchange ${i + 1}] ${ex}`);
  });

  // Add current hypothesis state
  if (hypothesis) {
    summaryParts.push('');
    summaryParts.push('CURRENT HYPOTHESIS STATE:');
    summaryParts.push(`Leading type: ${hypothesis.leading_type || 'undetermined'} (confidence: ${((hypothesis.confidence || 0) * 100).toFixed(0)}%)`);

    const topTypes = Object.entries(hypothesis.type_scores || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([type, score]) => `Type ${type}: ${((score as number) * 100).toFixed(0)}%`);
    if (topTypes.length > 0) {
      summaryParts.push(`Top candidates: ${topTypes.join(', ')}`);
    }

    const needsDiff = hypothesis.needs_differentiation || [];
    if (needsDiff.length > 0) {
      summaryParts.push(`Needs differentiation: ${needsDiff.join(' vs ')}`);
    }
  }

  // Add what centers have been probed
  const probedCenters: string[] = [];
  if (centersProbed.body_probed) probedCenters.push('Body');
  if (centersProbed.heart_probed) probedCenters.push('Heart');
  if (centersProbed.head_probed) probedCenters.push('Head');
  if (probedCenters.length > 0) {
    summaryParts.push(`Centers probed: ${probedCenters.join(', ')}`);
  }

  // Variant signals
  const topVariant = Object.entries(variantSignals)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];
  if (topVariant && (topVariant[1] as number) > 0) {
    summaryParts.push(`Dominant variant signal: ${topVariant[0]} (${((topVariant[1] as number) * 100).toFixed(0)}%)`);
  }

  // Add what formats have been used (to prevent repetition)
  const formatsUsed = new Set<string>();
  for (const msg of earlyMessages) {
    if (msg.role === 'assistant') {
      // Try to detect format from message content
      if (msg.content.includes('agree or disagree') || msg.content.includes('Strongly agree')) formatsUsed.add('agree_disagree');
      if (msg.content.includes('which of these') || msg.content.includes('which is more')) formatsUsed.add('forced_choice');
      if (msg.content.includes('scale of')) formatsUsed.add('scale');
      if (msg.content.includes('how often')) formatsUsed.add('frequency');
    }
  }
  if (formatsUsed.size > 0) {
    summaryParts.push(`Formats used in earlier exchanges: ${[...formatsUsed].join(', ')}`);
  }

  summaryParts.push('');
  summaryParts.push('DO NOT repeat questions about topics already covered above. Focus on what has NOT been probed yet.');

  const summaryMessage = summaryParts.join('\n');

  // Inject summary as first user message, then append recent messages
  const compressedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: summaryMessage },
    ...recentMessages as Array<{ role: 'user' | 'assistant'; content: string }>,
  ];

  return {
    messages: compressedMessages,
    summaryInjected: true,
  };
}
