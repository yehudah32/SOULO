# Soulo Enneagram — Claude Code Onboarding

## What This Project Is
A conversational Enneagram personality assessment web app built on the
Defiant Spirit methodology by Dr. Baruch HaLevi. Users complete an
AI-driven adaptive interview that types them across 9 Enneagram types,
instinctual variants, and wings — then receives a personalized report.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Anthropic SDK — model: claude-sonnet-4-6
- Supabase (pgvector) — RAG knowledge base
- OpenAI text-embedding-3-small — embeddings only
- In-memory session store (lib/session-store.ts) — replace with Redis for production

## Project Map
- app/assessment/page.tsx — main chat UI (client component, "use client")
- app/api/chat/route.ts — per-turn API handler with RAG injection
- app/api/chat/init/route.ts — session init, fires opening message
- app/results/page.tsx — Phase 3 placeholder (not yet built)
- lib/system-prompt.ts — ENNEAGRAM_SYSTEM_PROMPT (the AI's full identity)
- lib/parse-response.ts — strips <INTERNAL> and <RESPONSE> blocks from AI output
- lib/session-store.ts — in-memory Map keyed by sessionId
- lib/rag.ts — queryKnowledgeBase() hits Supabase pgvector
- lib/supabase.ts — exports publicClient and adminClient
- scripts/ingest.ts — PDF + TXT ingestion pipeline (npm run ingest)
- scripts/test-rag.ts — RAG verification (npm run test-rag)
- scripts/seed-questions.ts — seeds 50 questions into DB (npm run seed-questions)
- pdfs/ — 59 source PDFs + tritype-fauvre-extracted.txt + enneastyle-fauvre-extracted.txt
- lib/fallback-questions.ts — 7 hardcoded questions (ids -1 to -7), one per stage
- lib/question-bank.ts — getQuestionBank() + updateQuestionYield(); uses DB RPC with fallback
- lib/supervisor.ts — supervisorCheck(); validates format compliance with 3s timeout
- lib/evaluator.ts — runPostAssessmentEvaluation(); post-session quality scoring + DB insert

## How the AI Response Format Works
Every AI response contains two blocks that must be parsed:
<INTERNAL>{ ...hypothesis JSON... }</INTERNAL>
<RESPONSE>User-facing message here</RESPONSE>
parse-response.ts handles this. INTERNAL is never sent to the client.
The INTERNAL block drives: hypothesis tracking, session state,
progress panel updates, and closing detection.

## Critical Rules
- Never stream from the Anthropic API — always get full response then parse blocks
- Never expose INTERNAL block content to the client
- Always use adminClient (not publicClient) in scripts/
- Always use publicClient in API routes unless writing to DB
- The session store resets on hot reload — this is expected in development
- Do not modify lib/system-prompt.ts behavior without understanding the
  full INTERNAL JSON schema it requires

## How to Verify Changes
- npm run dev — start dev server at localhost:3000
- npm run ingest — re-ingest PDFs + TXT files (only needed if content changes)
- npm run test-rag — verify knowledge base is returning results
- npm run seed-questions — insert 50 questions into questions table (run once)
- Check terminal for [chat] logs to verify INTERNAL block parsing
- Check for [supervisor] logs after each turn to verify format compliance
- Check for [evaluator] logs at session close

## Environment Variables Required
ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
All in .env.local (gitignored)

## What Is Not Built Yet
- app/results/page.tsx — Phase 3 full results report (placeholder only; resultsData now populated in session at close)
- Production session store (currently in-memory, needs Redis or Supabase)
- Authentication / user accounts
- Deployment configuration
- SQL schema additions — must be run manually in Supabase SQL Editor (see scripts/setup-db.sql Phase 3 ADDITIONS block)
- Question bank initial seed — run npm run seed-questions once after SQL schema is applied
- Tritype + Enneastyle RAG files — run npm run ingest after adding .txt files to /pdfs

## UI Overhaul (Phase 4) — Card-Based Assessment

### New Components
- components/assessment/SouloAvatar.tsx — Animated SVG Enneagram figure (idle/typing/listening/deep states)
- components/assessment/ProgressPanel.tsx — Stage-based sidebar (7 stages, never based on exchange count)
- components/assessment/QuestionCard.tsx — Format-aware question UI (agree_disagree uses 5 buttons NOT slider)
- components/assessment/ResultsReveal.tsx — 11-section user-controlled results reveal (NO auto-advance)
- components/assessment/ShareCard.tsx — 540×540px type card, downloads as 1080×1080px PNG via html2canvas

### New API Routes
- app/api/results/generate/route.ts — POST {sessionId} → generates and caches results JSON via Claude
- app/api/results/verify/route.ts — POST {sessionId} → returns {themes: string[]} from user messages
- app/api/results/email/route.ts — POST {sessionId, email} → sends PDF via Resend; needs RESEND_API_KEY + RESEND_FROM_EMAIL

### New Libraries
- lib/pdf-generator.ts — Server-side PDF via @react-pdf/renderer; uses React.createElement (no JSX)
- html2canvas, @react-pdf/renderer, resend added to package.json

### Modified Files
- lib/session-store.ts — Added email and generatedResults fields
- app/api/chat/route.ts — Extracted updateSessionFromParsed helper; added clarifying mode; returns response+internal fields
- app/api/chat/init/route.ts — Parses email from body; returns response+internal for new UI
- app/assessment/page.tsx — Full rebuild: phase machine (welcome/assessing/clarifying/verifying), QuestionCard, ProgressPanel, SouloAvatar
- app/results/page.tsx — Full rebuild: calls /api/results/generate, renders ResultsReveal
- scripts/seed-questions.ts — Added batches A-D (100 more questions); new batches use continueOnError=true

### Environment Variables Added
RESEND_API_KEY — Required for email delivery
RESEND_FROM_EMAIL — From address for Resend emails (e.g. results@yourdomain.com)
NEXT_PUBLIC_BASE_URL — Base URL for internal fetch calls (default: http://localhost:3000)

### Key Constraints
- agree_disagree format: 5 discrete labeled buttons, NOT a range input
- Results reveal: 11 sections, user advances manually — NO auto-timers
- Avatar center lags one question behind by design (lastCenterRef)
- Inactivity cleanup: useEffect returns () => clearInterval(interval)
- Feedback → generate: await sendMessage() THEN await fetchResults() — sequential
- pdf-generator.ts: server-only, never import in client components

## Defiant Spirit Philosophy — North Star

Every feature built in this codebase serves one
purpose: expanding the space between stimulus and
response for the person using it.

The Enneagram in this system is not a personality
classifier. It is a liberation tool. The number is
not the destination. It is the starting point of
the return to wholeness.

Before building any feature, ask:
Does this help the person feel more free or more
labeled? Does this widen the space or narrow it?
Does this speak to what is chosen or what is fixed?
The answer determines whether the feature belongs.

Core language rules for all UI copy, AI prompts,
results language, and assessment questions:
- Never reduce the person to a number
- Always speak toward choice and response capacity
- The wound and the gift are the same energy
- The type is not the fate
- The goal is the circle — wholeness, return,
  the full self reclaimed

Brand: Defy Your Number. Live Your Spirit.

Closing truth: You are not a number.
  You are never a number. You are a defiant spirit.

Source: The Commandments of the Defiant Spirit
  by Dr. Baruch HaLevi. Full document in
  project PDFs. All AI prompts and results
  language must reflect this philosophy.

## New Files Created (Phase 4 — Performance + Results)
- lib/enneagram-lines.ts — Enneagram math, stress/release lines, tritype selection algorithm, clockwise sweep order, wing type helpers
- components/assessment/RelationshipWheel.tsx — Interactive SVG wheel showing type relationships, hover/tap to explore, entry sweep animation, IntersectionObserver with cleanup

## Modified Files (Phase 4)
- lib/session-store.ts — added: ragCache, thinkingDisplay, supervisorCriticalFailCount, demographics, topTypeScores, tritypeTypes, secondaryInfluences, lowestScoringType, stressLineType, releaseLineType
- lib/system-prompt.ts — appended: Defiant Spirit philosophical operating system, thinking_display rule, scale format rule, wing validation rule, thin answer exception, format integrity rule, differentiation priority pairs
- app/api/chat/route.ts — parallel RAG+QB fetching with confidence-keyed cache, dynamic max_tokens by stage, supervisor with 3s timeout (keeps retry), thinking_display in JSON response
- app/api/chat/init/route.ts — demographics and email storage from request body
- app/api/results/generate/route.ts — Defiant Spirit results language philosophy, tritype algorithm (center-based), web search multi-turn with fallback, relationship descriptions for all 8 types, celebrity generation with demographic filtering, stress/release/lowest type fields
- app/assessment/page.tsx — thinking display state, skeleton loader (5s guarantee), demographics UI with collapsible section, updated sendMessage with timer cleanup
- components/assessment/ResultsReveal.tsx — added Section 11 (celebrity cards) and Section 12 (relationship wheel), section count updated to 13

## Personality Systems Correlations (Phase 5)

### New Files
- lib/personality-correlations.ts — Research-backed boundary data for 9 types × 6 systems (MBTI, Big Five, Attachment, DISC, Jungian, Human Design) with subtype/wing/tritype/lexicon shift tables. buildCorrelationContext() produces guardrail string for AI prompt. AI reasons FROM this — does not copy FROM this. Human Design always confidence: 'low'.
- lib/personality-analyzer.ts — Intelligent analysis engine. buildAnalyzerInput() extracts full user messages, ordered tritype, validated wing, rich lexiconContext from session. analyzePersonalitySystems() takes raw conversation as primary input, uses correlation boundaries as guardrails, returns compound analysis grounded in actual responses. Returns null on failure — never throws.

### Modified Files
- lib/session-store.ts — added lexiconContext field (richer than flat lexiconSignals: stores word + questionContext + stage per signal)
- lib/system-prompt.ts — appended enriched lexicon signal rule (AI returns structured objects with words and context)
- app/api/chat/route.ts — lexiconContext population from enriched INTERNAL block enneastyle_lexicon_signals, backward compatible with legacy flat format
- app/api/results/generate/route.ts — sequential personality analysis after main results generation, cache check prevents redundant API calls, result attached as results.personality_systems, graceful null on failure
- components/assessment/ResultsReveal.tsx — "Other Systems" tab in Explore area now renders 6 accordion cards (MBTI, Big Five, Attachment, DISC, Jungian, Human Design), one open at a time, with confidence badges, Big Five visual bars, evidence blocks, and Human Design disclaimer

### Key Constraints
- Personality analysis runs sequentially AFTER main results (not parallel) to avoid rate limit pressure
- Correlation data is research-backed boundaries, NOT definitive typing in other systems
- Systems tab only activates when personality_systems data exists (graceful degradation for older sessions)
- No new sections added — lives inside existing Explore Your Type tab structure
