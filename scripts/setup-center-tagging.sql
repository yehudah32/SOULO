-- Phase 9 — Center tagging for questions
-- Run in Supabase SQL Editor.
--
-- Adds a `target_center` column to the questions table so the assessment
-- selector can balance per-center coverage and avoid the "loudest center
-- wins" mistype trap (e.g. a 1-4-5 reading as Type 4 because the bank
-- under-asked Body and Head questions early on).
--
-- Values:
--   'Body'  — probes 8/9/1 territory (control, anger, perfectionism,
--             merging, going along)
--   'Heart' — probes 2/3/4 territory (helping, image, longing, depth)
--   'Head'  — probes 5/6/7 territory (withdrawal, anxiety, options)
--   'Cross' — genuinely cross-center (e.g. "looking inward" probes 1/4/6)
--   NULL    — untagged, treated as Cross by the selector
--
-- The selector reranks candidates: questions matching the most-covered
-- center get a small penalty, Cross questions get a small bonus. This
-- steers without hard-excluding so disconfirmatory pairs are still
-- usable when types are close.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS target_center text;

CREATE INDEX IF NOT EXISTS questions_target_center_idx
  ON questions (target_center);

CREATE INDEX IF NOT EXISTS questions_target_center_stage_idx
  ON questions (target_center, stage);

-- ── KEYWORD-BASED BACKFILL ──
-- Tag questions by content keywords. These rules are derived from the
-- audit at scripts/audit-question-centers.mjs (run before this migration).
-- Reviewable by hand from the admin dashboard's question yield panel.
-- Specific tags first (Body / Heart / Head), then default the rest to Cross.

-- Body markers — types 8/9/1
UPDATE questions SET target_center = 'Body' WHERE target_center IS NULL AND (
     question_text ILIKE '%powerless%'
  OR question_text ILIKE '%in control%'
  OR question_text ILIKE '%lose control%'
  OR question_text ILIKE '%push back%'
  OR question_text ILIKE '%directly%'
  OR question_text ILIKE '%standing up%'
  OR question_text ILIKE '%fight%'
  OR question_text ILIKE '%protect%'
  OR question_text ILIKE '%fairness%'
  OR question_text ILIKE '%injustice%'
  OR question_text ILIKE '%should have%'
  OR question_text ILIKE '%right way%'
  OR question_text ILIKE '%wrong way%'
  OR question_text ILIKE '%mistake%'
  OR question_text ILIKE '%standards%'
  OR question_text ILIKE '%principle%'
  OR question_text ILIKE '%inner critic%'
  OR question_text ILIKE '%fix it%'
  OR question_text ILIKE '%looking inward%'
  OR question_text ILIKE '%looking outward%'
  OR question_text ILIKE '%go along%'
  OR question_text ILIKE '%avoid conflict%'
  OR question_text ILIKE '%peace%'
  OR question_text ILIKE '%merge%'
  OR question_text ILIKE '%easy going%'
  OR question_text ILIKE '%anger%'
  OR question_text ILIKE '%control%'
);

-- Heart markers — types 2/3/4
UPDATE questions SET target_center = 'Heart' WHERE target_center IS NULL AND (
     question_text ILIKE '%help others%'
  OR question_text ILIKE '%feelings%'
  OR question_text ILIKE '%emotions%'
  OR question_text ILIKE '%how you feel%'
  OR question_text ILIKE '%taking care%'
  OR question_text ILIKE '%people-pleasing%'
  OR question_text ILIKE '%putting others first%'
  OR question_text ILIKE '%unappreciated%'
  OR question_text ILIKE '%image%'
  OR question_text ILIKE '%achievement%'
  OR question_text ILIKE '%success%'
  OR question_text ILIKE '%productive%'
  OR question_text ILIKE '%best version%'
  OR question_text ILIKE '%admired%'
  OR question_text ILIKE '%how you come across%'
  OR question_text ILIKE '%performance%'
  OR question_text ILIKE '%missing%'
  OR question_text ILIKE '%depth%'
  OR question_text ILIKE '%longing%'
  OR question_text ILIKE '%unique%'
  OR question_text ILIKE '%authentic%'
  OR question_text ILIKE '%misunderstood%'
  OR question_text ILIKE '%envy%'
  OR question_text ILIKE '%inner world%'
  OR question_text ILIKE '%true self%'
  OR question_text ILIKE '%special%'
  OR question_text ILIKE '%loved%'
  OR question_text ILIKE '%cared for%'
  OR question_text ILIKE '%relationship%'
  OR question_text ILIKE '%connection%'
  OR question_text ILIKE '%feel closer%'
);

-- Head markers — types 5/6/7
UPDATE questions SET target_center = 'Head' WHERE target_center IS NULL AND (
     question_text ILIKE '%might go wrong%'
  OR question_text ILIKE '%what could go wrong%'
  OR question_text ILIKE '%worst case%'
  OR question_text ILIKE '%mentally prepare%'
  OR question_text ILIKE '%doubt%'
  OR question_text ILIKE '%second guess%'
  OR question_text ILIKE '%safety%'
  OR question_text ILIKE '%unsafe%'
  OR question_text ILIKE '%trust%'
  OR question_text ILIKE '%authority%'
  OR question_text ILIKE '%loyal%'
  OR question_text ILIKE '%anxiety%'
  OR question_text ILIKE '%worry%'
  OR question_text ILIKE '%vigilant%'
  OR question_text ILIKE '%step back%'
  OR question_text ILIKE '%observe%'
  OR question_text ILIKE '%analyze%'
  OR question_text ILIKE '%process it%'
  OR question_text ILIKE '%alone with%'
  OR question_text ILIKE '%private%'
  OR question_text ILIKE '%understand it%'
  OR question_text ILIKE '%figure it out%'
  OR question_text ILIKE '%detached%'
  OR question_text ILIKE '%withdraw%'
  OR question_text ILIKE '%energy reserves%'
  OR question_text ILIKE '%drained%'
  OR question_text ILIKE '%options%'
  OR question_text ILIKE '%possibilities%'
  OR question_text ILIKE '%next thing%'
  OR question_text ILIKE '%exciting%'
  OR question_text ILIKE '%plans%'
  OR question_text ILIKE '%bored%'
  OR question_text ILIKE '%restless%'
  OR question_text ILIKE '%betrayed%'
);

-- Everything else gets tagged Cross. NULL would be treated the same way
-- by the selector but explicit Cross is easier to query and audit.
UPDATE questions SET target_center = 'Cross' WHERE target_center IS NULL;

-- ── RPC update ──
-- The existing get_candidate_questions() does NOT return target_center.
-- We add it to the SELECT clause without changing the parameter list,
-- so existing TypeScript callers continue to work and the new center
-- field becomes available for the rerank logic in lib/decision-tree.ts.
-- Filtering by center happens client-side (in TypeScript) so we keep the
-- cache layer dumb and centralized.

create or replace function get_candidate_questions(
  p_leading_type int default 0,
  p_needs_differentiation text default null,
  p_stage int default 1,
  p_last_format text default '',
  p_limit int default 8
)
returns table (
  id bigint,
  question_text text,
  answer_options jsonb,
  format text,
  stage int,
  oyn_dim text,
  react_respond_lens text,
  target_types jsonb,
  target_center text,
  times_used int,
  avg_information_yield float8
)
language sql stable
as $$
  select
    q.id, q.question_text, q.answer_options, q.format,
    q.stage, q.oyn_dim, q.react_respond_lens, q.target_types,
    q.target_center,
    q.times_used, q.avg_information_yield
  from questions q
  where q.stage = p_stage
    and (p_last_format = '' or q.format != p_last_format)
    and (
      p_leading_type = 0
      or p_leading_type = any(array(select jsonb_array_elements_text(q.target_types)::int))
      or jsonb_array_length(q.target_types) = 0
    )
  order by q.avg_information_yield desc, q.times_used asc
  limit p_limit;
$$;

-- ── Verification queries ──
-- Run these manually after the migration to confirm the distribution:
--
--   SELECT target_center, COUNT(*) FROM questions GROUP BY target_center
--   ORDER BY COUNT(*) DESC;
--
--   SELECT stage, target_center, COUNT(*) FROM questions
--   GROUP BY stage, target_center ORDER BY stage, target_center;
--
-- Expected based on the audit:
--   Body  ~20  Heart ~19  Head  ~8  Cross ~46
--
-- ⚠️ NOTE: stages 1-2 currently have ZERO Head questions. Phase 9.5
-- follow-up: write 8-12 new Head questions for early stages so the
-- rerank has something to steer toward.
