# Migration Guide: System Prompt V1 → V2

## Overview

This guide shows the exact changes needed to integrate the restructured system prompt
and response validator into your existing codebase. Changes are ordered by priority.

---

## Step 1: Replace System Prompt Import (chat/route.ts)

```diff
- import { ENNEAGRAM_SYSTEM_PROMPT } from '@/lib/system-prompt';
+ import { ENNEAGRAM_SYSTEM_PROMPT_V2, STAGE_FORMAT_RULES, DEFIANT_SPIRIT_RAG_CONTEXT } from '@/lib/system-prompt-v2';
+ import { validateAssessmentResponse } from '@/lib/response-validator';
```

## Step 2: Inject Stage-Specific Rules Instead of All Rules (chat/route.ts)

In the `POST` function, replace the system prompt construction:

```diff
- let systemPrompt =
-   ENNEAGRAM_SYSTEM_PROMPT +
-   (ragResults ? `\n\nRELEVANT DEFIANT SPIRIT...` : '') +
-   candidateQsBlock;
+ // Build system prompt with stage-specific format rules
+ const stageRule = STAGE_FORMAT_RULES[stage] || STAGE_FORMAT_RULES[7];
+
+ let systemPrompt =
+   ENNEAGRAM_SYSTEM_PROMPT_V2 +
+   '\n\n' + stageRule +
+   (ragResults
+     ? `\n\nRELEVANT DEFIANT SPIRIT KNOWLEDGE BASE CONTEXT:\n${ragResults}\n\nUse Baruch's voice and framing from this content.`
+     : `\n\n${DEFIANT_SPIRIT_RAG_CONTEXT}`) +
+   candidateQsBlock;
```

## Step 3: Add Response Validator BEFORE Sending (chat/route.ts)

After parsing the AI response, BEFORE returning to the client:

```typescript
// After: const { internal, response } = parseAIResponse(rawText);
// Add:

const rp = (internal as any)?.response_parts;
const isClosing = internal?.close_next === true;

const validation = validateAssessmentResponse(
  rp,
  response,
  stage,
  lastFormat,
  session.exchangeCount,
  isClosing
);

// Auto-fix if possible
if (validation.autoFixed && validation.fixedParts) {
  if (validation.fixedParts.guide_text !== undefined) {
    rp.guide_text = validation.fixedParts.guide_text;
  }
  if (validation.fixedParts.question_text !== undefined) {
    rp.question_text = validation.fixedParts.question_text;
  }
  console.log('[validator] Auto-fixed response:', validation.issues.map(i => i.rule).join(', '));
}

// Log all issues
if (validation.issues.length > 0) {
  console.warn('[validator] Issues:', validation.issues.map(i => `${i.severity}:${i.rule}`).join(', '));
}

// If critical failure AND not auto-fixed, retry ONCE
if (!validation.valid && !validation.autoFixed) {
  console.error('[validator] Response failed validation (score:', validation.score, ')— retrying');
  
  // Add corrective instruction and retry
  const retryMessages = [
    ...anthropicMessages,
    { role: 'assistant', content: rawText },
    { role: 'user', content: `SYSTEM: Your previous response had issues: ${validation.issues.map(i => i.message).join('; ')}. Please regenerate with these fixes applied.` }
  ];
  
  // Retry call (simplified — in production, handle this more robustly)
  const retryResult = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: getMaxTokens(stage),
    system: systemPrompt,
    messages: retryMessages as Anthropic.MessageParam[],
  });
  
  // Use retry result... (parse and validate again)
}
```

## Step 3b: Replace Raw History Windowing with Compressor (chat/route.ts)

The current code (line 264) does raw windowing: `MAX_HISTORY_MESSAGES = 10`.
This loses context from early exchanges, causing question repetition.

Replace the windowing block with:

```diff
- const MAX_HISTORY_MESSAGES = 10;
- let anthropicMessages: Anthropic.MessageParam[];
- if (messages.length <= MAX_HISTORY_MESSAGES) {
-   anthropicMessages = messages as Anthropic.MessageParam[];
- } else {
-   const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
-   if (recentMessages[0].role === 'assistant') {
-     recentMessages.shift();
-   }
-   anthropicMessages = recentMessages as Anthropic.MessageParam[];
- }
+ import { compressHistory } from '@/lib/history-compressor';
+ 
+ const { messages: compressedMessages, summaryInjected } = compressHistory(
+   messages,
+   session.internalState
+ );
+ const anthropicMessages = compressedMessages as Anthropic.MessageParam[];
+ if (summaryInjected) {
+   console.log('[chat] History compressed:', messages.length, '→', compressedMessages.length, 'messages');
+ }
```

## Step 4: Remove Web Search Tool from Assessment Calls (chat/route.ts)

```diff
  const result = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: getMaxTokens(stage, session.lastQuestionFormat ?? undefined),
    system: systemPrompt,
-   tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
    messages: anthropicMessages,
  });
```

## Step 5: Update INTERNAL Block Parsing (parse-response.ts)

The V2 INTERNAL schema is now **backward-compatible** with V1. It uses the same
field names (`hypothesis`, `variant_signals`, `wing_signals`, `oyn_dimensions`,
`defiant_spirit`, `conversation`, `strategy`, `current_section`, `selected_question_id`,
`thinking_display`, `response_parts`) — just with fewer sub-fields.

**No changes required to parse-response.ts.** The existing parser will work as-is.

The key simplifications in V2:
- `conversation` has fewer sub-fields (removed `ready_to_close`, `allowed_formats_this_stage`)
- `strategy` has 3 fields instead of 7
- `hypothesis` dropped `tritype_archetype_fauvre`, `tritype_archetype_ds`, `ruling_out`
- `conversation.close_next` moved inside `conversation` (same path as V1)
- `triads` section removed entirely (low-value, never used downstream)
- `centers` retains the same field name and sub-field names (`body_probed`, `heart_probed`, `head_probed`, `last_probed`, `next_target`) — fully V1-compatible

The session store reads these fields via `finalInternal?.conversation?.close_next`,
`finalInternal?.hypothesis?.type_scores`, etc. — all these paths still work.

## Step 6: Update Session Store (session-store.ts)

No changes required — the V2 parser normalizes to V1-compatible shape.
This allows a gradual migration without breaking the session store.

## Step 7: Update Closing Criteria in deriveStage (chat/route.ts)

```diff
  function deriveStage(exchangeCount: number): number {
-   if (exchangeCount <= 2) return 1;
-   if (exchangeCount <= 5) return 2;
-   if (exchangeCount <= 8) return 3;
-   if (exchangeCount <= 11) return 4;
-   if (exchangeCount <= 13) return 5;
-   if (exchangeCount <= 15) return 6;
-   return 7;
+   // V2: Stages advance faster based on exchange count
+   // The AI controls actual progression via its stage field
+   if (exchangeCount <= 2) return 1;
+   if (exchangeCount <= 4) return 2;
+   if (exchangeCount <= 6) return 3;
+   if (exchangeCount <= 8) return 4;
+   if (exchangeCount <= 10) return 5;
+   if (exchangeCount <= 12) return 6;
+   return 7;
  }
```

## Step 8: Remove the 3-Pass Enforcer (chat/route.ts)

The response validator replaces the 3-pass enforcer. Remove lines 352-436
(the "ABSOLUTE RULE: No reflections in question_text" section) since the
validator handles this with auto-fix capability.

## Step 9: Make Supervisor Non-Blocking (Optional)

Keep the existing supervisor as a logging/analytics tool but remove it
from the critical path. It already runs fire-and-forget, so this is just
about being explicit:

```typescript
// Keep this as-is — it's already non-blocking
// But add a note that validation happens in the validator, not here
```

---

## Testing the Migration

1. Run the test harness: `npx ts-node scripts/test-assessment.ts`
2. Test a single type first: `npx ts-node scripts/test-assessment.ts 8`
3. Compare V1 vs V2 results side by side
4. Check the validator logs for auto-fix frequency

## Rollback Plan

If V2 causes issues, simply change the import back:
```typescript
import { ENNEAGRAM_SYSTEM_PROMPT } from '@/lib/system-prompt';
```
The session store is backward-compatible.
