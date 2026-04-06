-- Tier tagging for questions — run in Supabase SQL Editor
-- Tiers per DYN_SYSTEM_ARCHITECTURE.md:
--   1 = Core Type + Whole Type
--   2 = Instinct + Subtype
--   3 = Wings + Lines
--   4 = Triads (no assessment questions needed)

ALTER TABLE questions ADD COLUMN IF NOT EXISTS tier int DEFAULT 1;

-- Default: all existing questions are Tier 1 (core type identification)
UPDATE questions SET tier = 1 WHERE tier IS NULL;

-- Tag instinct questions as Tier 2 (match by content keywords)
UPDATE questions SET tier = 2 WHERE
  question_text ILIKE '%instinct%'
  OR question_text ILIKE '%self-preservation%'
  OR question_text ILIKE '%one-to-one%'
  OR question_text ILIKE '%sexual%bonding%'
  OR question_text ILIKE '%social%belonging%'
  OR question_text ILIKE '%physical security%'
  OR question_text ILIKE '%group dynamics%'
  OR question_text ILIKE '%intimate conversation%'
  OR question_text ILIKE '%community standing%'
  OR question_text ILIKE '%mental bandwidth%physical%'
  OR question_text ILIKE '%deep%transformative relationship%'
  OR question_text ILIKE '%magnetic connection%'
  OR question_text ILIKE '%social role%'
  OR question_text ILIKE '%neglect%physical%practical%'
  OR question_text ILIKE '%neglect%one-to-one%'
  OR question_text ILIKE '%neglect%social belonging%'
  OR question_text ILIKE '%rank these three%safety%bonds%belonging%';

CREATE INDEX IF NOT EXISTS questions_tier_idx ON questions (tier);
CREATE INDEX IF NOT EXISTS questions_tier_stage_idx ON questions (tier, stage);
