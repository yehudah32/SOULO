// Soulo Evaluation System — Core Type Definitions

export type EnneagramType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type BigFiveLevel = 'low' | 'low-moderate' | 'moderate' | 'moderate-high' | 'high' | 'variable';
export type BigFiveRange = [BigFiveLevel, BigFiveLevel] | BigFiveLevel;

export interface PersonaSpec {
  core_type: number; // 1-9
  wing: string; // e.g., "6w7"
  instinctual_variant: 'SP' | 'SO' | 'SX';
  tritype: number[]; // e.g., [6, 1, 2]
  health_level: number; // 1-9 Riso-Hudson
  countertype: boolean;
  communication_style: 'verbose' | 'moderate' | 'terse' | 'intellectual' | 'emotional' | 'concrete';
  self_awareness: 'high' | 'medium' | 'low';
  defensiveness: 'low' | 'moderate' | 'high';
  social_desirability_bias: 'low' | 'medium' | 'high';
  rapport_trajectory: 'warms_up' | 'consistent' | 'cools_down';
  age: number;
  gender_expression: string;
  cultural_comm_style: string;
  spiritual_orientation: 'secular' | 'spiritual_not_religious' | 'religious' | 'mystical';
  growth_readiness: 'resistant' | 'curious' | 'actively_seeking';
}

export interface Persona {
  id: string;
  spec: PersonaSpec;
  backstory: string;
  voice_profile: string;
  behavioral_rules: string;
  hidden_signals: string[];
  mistype_traps: string[];
  big_five_expected: { O: string; C: string; E: string; A: string; N: string };
  fidelity_score: number | null;
}

export interface TranscriptTurn {
  turn: number;
  role: 'system' | 'persona';
  content: string;
  internal_block: Record<string, unknown> | null; // system turns only
  question_tag: string | null; // system turns only
  signals_detected: string[] | null; // persona turns only
  commandment_violations: string[];
}

export interface SimulationResult {
  transcript: TranscriptTurn[];
  final_internal: Record<string, unknown> | null;
  status: 'complete' | 'timeout' | 'premature_typing' | 'persona_break';
  total_turns: number;
  total_questions: number;
}

export type QuestionType =
  | 'exploratory'
  | 'confirmatory'
  | 'disconfirmatory'
  | 'motivational'
  | 'behavioral'
  | 'liberatory'
  | 'redundant'
  | 'leading';

export interface QuestionTag {
  turn: number;
  is_question: boolean;
  question_type: QuestionType;
  information_gain: 'low' | 'medium' | 'high';
  commandment_violations: string[];
  notes: string;
}

export interface CommandmentViolation {
  pattern: string;
  severity: 'critical' | 'warning';
  commandment: string;
  turn: number;
}

export interface CommandmentCheckResult {
  violations: CommandmentViolation[];
  approved_language_used: string[];
  per_commandment: Record<string, 'pass' | 'partial' | 'fail'>;
  score: number; // 0-10, automatic 0 if any critical violation
  labeled_or_liberated: 'liberated' | 'mixed' | 'labeled';
}

export interface TypeConsidered {
  type: number;
  peak_confidence: number;
  first_at_q: number;
}

export interface ImprovementAction {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  action: string;
  evidence: string;
  source_level: 'L1' | 'L2' | 'L3';
  commandment_alignment: string | null;
  estimated_impact: string;
}

export interface EvaluationResult {
  run_id: string;
  timestamp: string;
  tier: string;
  persona_id: string;
  ground_truth: PersonaSpec;

  system_output: {
    final_type: number;
    final_wing: string | null;
    final_confidence: number;
    types_considered: TypeConsidered[];
  };

  accuracy: {
    core_type_correct: boolean;
    wing_correct: boolean | null;
    instinctual_variant_correct: boolean | null;
    mistype_as: number | null;
    mistype_harm_severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    big_five_aligned: boolean;
  };

  commandment_fidelity: {
    score: number;
    critical_violations: string[];
    per_commandment: Record<string, 'pass' | 'partial' | 'fail'>;
    labeled_or_liberated: 'liberated' | 'mixed' | 'labeled';
  };

  question_quality: {
    total_questions: number;
    exploratory: number;
    confirmatory: number;
    disconfirmatory: number;
    motivational: number;
    behavioral: number;
    liberatory: number;
    redundant: number;
    leading: number;
  };

  efficiency: {
    total_exchanges: number;
    correct_type_first_considered_at: number | null;
    confidence_curve: Array<{ exchange: number; top_type: number; confidence: number }>;
  };

  improvement_actions: ImprovementAction[];
  transcript: TranscriptTurn[];
}

export interface PerTypeAccuracy {
  accuracy: number;
  n: number;
  ci_95: [number, number];
  wing_accuracy: number;
  instinctual_variant_accuracy: number;
  countertype_accuracy: number | null;
  commandment_fidelity_avg: number;
}

export interface MistypePair {
  true_type: number;
  mistyped_as: number;
  count: number;
  harm_severity: string;
}

export interface BatchSummary {
  batch_id: string;
  tier: string;
  total_runs: number;
  timestamp: string;

  headline_metrics: {
    overall_accuracy: number;
    meets_75_threshold: boolean;
    convergent_validity_alignment: number;
    harm_weighted_accuracy: number;
    confidence_calibration_ece: number;
    commandment_fidelity_avg: number;
    commandment_critical_violations: number;
    labeled_or_liberated_rate: number;
  };

  per_type_accuracy: Record<number, PerTypeAccuracy>;
  confusion_matrix: number[][];
  top_mistype_pairs: MistypePair[];

  question_quality_aggregate: {
    avg_disconfirmatory_ratio: number;
    avg_motivational_ratio: number;
    avg_liberatory_ratio: number;
    leading_question_incidents: number;
  };

  commandment_fidelity_aggregate: {
    average_cfs: number;
    per_commandment_pass_rates: Record<string, number>;
    weakest_commandments: string[];
    critical_violation_details: Array<{ run_id: string; violation: string }>;
  };

  priority_fixes: ImprovementAction[];
}

export interface FidelityResult {
  top_three: Array<{
    type: number;
    confidence: 'high' | 'moderate' | 'low';
    evidence: string[];
    subtype: string | null;
  }>;
  types_ruled_out: Array<{ type: number; reason: string }>;
  health_level_estimate: number;
  red_flags: string[];
  fidelity_score: 1 | 2 | 3;
}
