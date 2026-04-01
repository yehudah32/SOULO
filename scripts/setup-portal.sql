-- ════════════════════════════════════════════════════
-- PORTAL MODE MIGRATION
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════

-- Add reveal_completed column to track which users have finished the guided reveal
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS reveal_completed boolean DEFAULT false;
