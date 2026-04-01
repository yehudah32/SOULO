-- ════════════════════════════════════════════════════
-- QUESTION YIELD TRACKING MIGRATIONS
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════

-- 1. Create question_yield_log table
CREATE TABLE IF NOT EXISTS question_yield_log (
  id bigserial PRIMARY KEY,
  question_id bigint NOT NULL,
  session_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'down', 'neutral', 'skipped')),
  old_yield float8 NOT NULL,
  new_yield float8 NOT NULL,
  contribution_score float8,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yield_log_question ON question_yield_log(question_id);
CREATE INDEX IF NOT EXISTS idx_yield_log_session ON question_yield_log(session_id);
CREATE INDEX IF NOT EXISTS idx_yield_log_created ON question_yield_log(created_at DESC);

-- 2. Add is_baruch_sourced column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_baruch_sourced boolean DEFAULT false;

-- 3. Verify get_candidate_questions RPC uses avg_information_yield
-- (It should already order by avg_information_yield DESC based on setup-db.sql)
-- To check: SELECT prosrc FROM pg_proc WHERE proname = 'get_candidate_questions';
