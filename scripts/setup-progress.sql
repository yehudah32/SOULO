-- Assessment progress table for mid-session persistence
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS assessment_progress (
  session_id text PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  conversation_history jsonb NOT NULL DEFAULT '[]',
  internal_state jsonb,
  exchange_count integer DEFAULT 0,
  current_stage integer DEFAULT 1,
  last_question_format text DEFAULT '',
  is_complete boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_user_id ON assessment_progress(user_id);
