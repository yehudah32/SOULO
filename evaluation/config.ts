// Soulo Evaluation System — Configuration

export type CommandmentId = string;

export const CONFIG = {
  MAX_TURNS: 40,
  MODEL: 'claude-sonnet-4-6' as const,

  THRESHOLDS: {
    accuracy_target: 0.75,
    commandment_fidelity_target: 8.0,
    confidence_calibration_ece_target: 0.10,
    disconfirmatory_ratio_target: 0.20,
    motivational_ratio_target: 0.40,
    liberatory_ratio_target: 0.25,
    fidelity_pass_score: 2, // minimum fidelity score to enter pipeline
    fidelity_pass_rate_target: 0.80,
    high_fidelity_rate_target: 0.60,
  },

  TIERS: {
    quick: { name: 'Quick Test', personas_per_type: 1, total: 9 },
    calibration: { name: 'Calibration', personas_per_type: 3, total: 27 },
    tier_1: { name: 'Tier 1 Baseline', personas_per_type: 35, total: 315 },
  },

  // Default persona settings for Tier 1
  DEFAULT_PERSONA: {
    health_level: 5,
    communication_style: 'moderate' as const,
    defensiveness: 'moderate' as const,
    social_desirability_bias: 'medium' as const,
    cultural_comm_style: 'direct_western',
    spiritual_orientation: 'secular' as const,
    growth_readiness: 'curious' as const,
  },

  // Harm severity score weights for harm-weighted accuracy
  HARM_WEIGHTS: {
    none: 1.0,
    low: 0.3,
    medium: 0.15,
    high: 0.05,
    critical: 0.0,
  },
} as const;
