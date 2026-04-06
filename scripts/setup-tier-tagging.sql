-- Tier tagging for questions — run in Supabase SQL Editor
-- Tiers per DYN_SYSTEM_ARCHITECTURE.md:
--   1 = Core Type + Whole Type
--   2 = Instinct + Subtype
--   3 = Wings + Lines
--   4 = Triads (no assessment questions needed)

ALTER TABLE questions ADD COLUMN IF NOT EXISTS tier int DEFAULT 1;

-- All existing questions default to Tier 1 (core type identification)
UPDATE questions SET tier = 1 WHERE tier IS NULL;

CREATE INDEX IF NOT EXISTS questions_tier_idx ON questions (tier);
CREATE INDEX IF NOT EXISTS questions_tier_stage_idx ON questions (tier, stage);
