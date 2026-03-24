-- User identity table for Soulo assessment persistence
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  passkey text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Link assessment results to users (nullable for backward compat)
ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

-- Add generated_results column to persist results across server restarts
ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS generated_results jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);
