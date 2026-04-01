# Soulo System Diagnostic Report

## Executive Summary

After a full audit of the codebase, there are **5 root causes** behind the bugs, inconsistencies, and frustrations you're experiencing. None of them are unfixable. But they require structural changes, not more patches.

---

## Root Cause #1: The System Prompt Is Too Long (1,220 lines)

**The Problem:**
Claude's instruction-following degrades significantly when system prompts exceed ~600 lines. At 1,220 lines with overlapping rules, competing priorities, and philosophical framing mixed with structural requirements, the model is constantly making silent tradeoffs. It follows the rules it "understands" most readily and drops the ones buried deeper in the prompt.

**Evidence in your codebase:**
- You've had to build a 3-pass enforcer in `chat/route.ts` (lines 352-436) to strip reflections from `question_text` — this exists because Claude keeps putting them there despite being told not to
- The `LOADING_TAGLINES` fallback array exists because `thinking_display` is frequently empty — the INTERNAL block is so large Claude sometimes truncates it
- The supervisor check (`lib/supervisor.ts`) runs as a separate API call to catch format violations — another bandaid for prompt non-compliance

**The Fix:**
Split the system prompt into 3 layers:
1. **Core prompt** (~400 lines): Only structural rules, INTERNAL schema, format rules, response structure. Things Claude MUST do on every turn.
2. **RAG-injected context**: The philosophical framework, Defiant Spirit methodology, type descriptions, lexicon — retrieved contextually per turn, not loaded every turn.
3. **Stage-specific injection**: Format constraints, question strategy for the CURRENT stage only — not all 7 stages described every turn.

---

## Root Cause #2: The Assessment Can't Be Efficient By Design

**The Problem:**
The minimum closing criteria require 12 exchanges AND all 8 gates satisfied. Even with a person who clearly presents as a strong Type 8 from their first answer, the system is structurally incapable of closing before exchange 12. The phased question strategy reinforces this by allocating fixed exchange ranges to each phase.

**Your frustration:** "It asked 20 questions when it should have asked 5-6."

**Evidence:**
- `deriveStage()` maps exchange count to stages mechanically: exchanges 1-2 = stage 1, 3-5 = stage 2, etc.
- Closing criteria in the system prompt: "At least 12 exchanges completed" is a hard gate
- The AI stage override in `chat/route.ts` (line 251) prevents stage skipping: `aiStage <= prevStage + 1`

**The Fix:**
Replace the exchange-count-based system with a confidence-based system:
- Allow closing at **any** exchange count when confidence ≥ 0.85 AND top 2 types are differentiated AND at least 2 centers probed
- Remove the "12 exchange minimum" — replace with "8 exchange minimum" and add a fast-track path for high-signal respondents
- Let the AI advance multiple stages in a single turn if the answer was highly informative
- The stage progression should be driven by INFORMATION GAINED, not questions asked

---

## Root Cause #3: Commentary Leaks Into Questions Despite Multiple Safeguards

**The Problem:**
You've built `guide_text` (Soulo's bridge commentary, shown above the card) and `question_text` (the exam question, shown on the card). The system prompt explains this separation in 60+ lines of detailed instruction with good/bad examples. There's also a 3-pass server-side enforcer. And yet commentary still leaks into questions.

**Why it keeps happening:**
The system prompt tells Claude to be "warm, direct, grounded" and to use the OARS framework (Open questions, Affirmations, Reflections, Summarizing). It also tells Claude that `guide_text` is a "BRIDGE message" that should "take something SPECIFIC from the previous answer and PIVOT FORWARD." These are inherently reflective behaviors — Claude has to reflect on what was said in order to bridge forward. The conflict between "be reflective and warm" and "never put reflections in question_text" creates a constant tension that Claude resolves inconsistently.

**The Fix:**
1. Remove OARS from the system prompt. It's a therapy framework, not an assessment framework. The system prompt already says "this is NOT a therapy session."
2. Simplify the guide_text instruction to ONE line: "guide_text: 1 sentence connecting the previous answer to this question. Optional — empty string is fine."
3. Simplify the question_text instruction to ONE line: "question_text: The question. Nothing else. Must contain '?'."
4. Keep the server-side enforcer as a safety net, but it should rarely trigger.

---

## Root Cause #4: The INTERNAL Block Is Too Complex (~80 fields)

**The Problem:**
Every turn, Claude must output a massive JSON object inside `<INTERNAL>` tags with ~80 fields across hypothesis, variant_signals, wing_signals, centers, triads, defiant_spirit, oyn_dimensions, conversation, strategy, response_parts, and thinking_display. This is:
- Expensive (burns tokens on every turn)
- Error-prone (Claude often truncates it, especially on longer conversations)
- Conflicting (some fields overlap — `conversation.last_question_format` vs `strategy.question_format_last_used`)
- Distracting (Claude spends cognitive effort filling schema fields instead of asking good questions)

**Evidence:**
- `parseAIResponse()` has fallback handling for truncated INTERNAL blocks (lines 43-55)
- The chat route has duplicate field extraction logic to handle both `conversation.last_question_format` AND `strategy.question_format_last_used` (line 67)
- The 2048 max_tokens limit (line 22 of chat/route.ts) is set identically for ALL stages — because the INTERNAL block alone needs ~1500 tokens

**The Fix:**
Cut the INTERNAL block to ~25 essential fields:

```json
{
  "hypothesis": {
    "leading_type": 0,
    "confidence": 0.0,
    "type_scores": {"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},
    "needs_diff": [],
    "wing": "",
    "variant": "",
    "tritype": ""
  },
  "centers_probed": {"body": false, "heart": false, "head": false},
  "stage": 1,
  "format_used": "",
  "close_next": false,
  "thinking_display": "",
  "response_parts": {
    "guide_text": "",
    "question_text": "",
    "question_format": "",
    "answer_options": null,
    "scale_range": null
  },
  "rationale": ""
}
```

Everything else (OYN dimensions, defiant spirit signals, domain signals, lexicon, triads) can be tracked server-side by analyzing the conversation history post-hoc — not on every turn.

---

## Root Cause #5: The Supervisor Runs Too Late and Can't Fix Anything

**The Problem:**
The supervisor check (`lib/supervisor.ts`) makes an API call AFTER the response has already been sent to the user (line 467 of chat/route.ts: "Fire-and-forget: Supervisor check (non-blocking)"). It scores the response, logs the score, but never actually blocks or regenerates a bad response. It's purely diagnostic.

**Evidence:**
- Line 467: `Promise.resolve().then(async () => {` — this runs after the `NextResponse.json()` is already returned
- The supervisor has a 3-second timeout (line 148-153) and defaults to PASS on timeout
- Even if it detects a score < 5, it only increments `supervisorCriticalFailCount` — it doesn't retry

**The Fix:**
Move the supervisor BEFORE the response is sent. But don't use another Claude API call (too slow). Instead, implement a **rule-based validator** in code:

```typescript
function validateResponse(response: string, responseParts: any, stage: number, lastFormat: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Rule 1: question_text must contain '?'
  if (responseParts?.question_text && !responseParts.question_text.includes('?'))
    issues.push('question_text has no question mark');
  
  // Rule 2: Format rotation
  if (responseParts?.question_format === lastFormat)
    issues.push('Same format as last question');
  
  // Rule 3: Stage-format compliance
  const allowed = getStageFormats(stage);
  if (responseParts?.question_format && !allowed.includes(responseParts.question_format))
    issues.push(`Format ${responseParts.question_format} not allowed at stage ${stage}`);
  
  // Rule 4: No reflection patterns in question_text
  if (startsWithReflection(responseParts?.question_text))
    issues.push('Reflection detected in question_text');
  
  // Rule 5: Response length (sentence count)
  const sentences = response.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 4)
    issues.push('Response exceeds 3 sentence max');
  
  return { valid: issues.length === 0, issues };
}
```

If validation fails, retry ONCE with a corrective injection. If it fails twice, use the best of the two attempts.

---

## Additional Issues Found

### 6. Conversation History Windowing Loses Context
`chat/route.ts` line 264: `MAX_HISTORY_MESSAGES = 10`. On longer assessments, Claude only sees the last 10 messages. Combined with the system prompt being 1,220 lines, Claude has very little context about what it already asked. This causes question repetition.

**Fix:** Instead of raw windowing, send a compressed summary of earlier exchanges + the last 6 messages. The summary should include: what types were discussed, what centers were probed, key signals detected.

### 7. The `deriveStage` Function Is Duplicated
It exists in both `app/assessment/page.tsx` (line 50) and `app/api/chat/route.ts` (line 24) with identical logic. Any change to one must be manually synced to the other.

**Fix:** Move to a shared utility.

### 8. Web Search Tool Is Attached But Never Useful During Assessment
`chat/route.ts` line 335: `tools: [{ type: 'web_search_20250305', name: 'web_search' }]`. Web search is included on every assessment API call. The system prompt says "Never search during the live assessment conversation." But including the tool definition burns tokens and sometimes causes Claude to consider searching instead of answering.

**Fix:** Remove the web search tool from assessment API calls. Only include it in results generation.

### 9. The RAG Cache Key Is Too Coarse
`chat/route.ts` line 280: `ragCacheKey = rag-${leadingType}-${stage}-${Math.floor(currentConfidence * 10)}`. This means the same RAG content is returned for every question at the same confidence level. If confidence doesn't change (common in early exchanges), the same context is injected repeatedly.

**Fix:** Include the user's last answer in the RAG query (already done) but also vary the cache key to include exchange count.

---

## Priority Order of Fixes

1. **Restructure system prompt** (Root Cause #1) — highest leverage, fixes multiple downstream issues
2. **Simplify INTERNAL block** (Root Cause #4) — reduces truncation, improves compliance
3. **Confidence-based closing** (Root Cause #2) — fixes the "20 questions" problem
4. **Rule-based validator before response** (Root Cause #5) — catches issues before user sees them
5. **Compressed history summaries** (Issue #6) — prevents question repetition
6. **Remove web search from assessment** (Issue #8) — easy win, reduces token waste
