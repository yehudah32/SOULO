# Soulo Evaluation System

Automated evaluation pipeline for the Soulo Enneagram AI assessment system. Generates synthetic personas, simulates full assessments, and produces detailed accuracy and quality reports.

## Prerequisites

- **Node.js** 18+
- **tsx** installed (`npx tsx` or `npm i -g tsx`)
- **ANTHROPIC_API_KEY** environment variable set (in `.env.local` or exported)

## Quick Start

```bash
# Run the full pipeline: generate 9 personas (1 per type), gate, evaluate, report
npx tsx --env-file=.env.local evaluation/run.ts full --count 9
```

## Commands

### Generate Personas

Creates synthetic persona JSON files for evaluation.

```bash
# 9 personas, 1 per type (Tier 1 defaults)
npx tsx --env-file=.env.local evaluation/run.ts generate --count 9

# 27 personas, all 27 subtypes (calibration tier)
npx tsx --env-file=.env.local evaluation/run.ts generate --tier calibration

# Custom count with varied parameters
npx tsx --env-file=.env.local evaluation/run.ts generate --count 18
```

**Tier 1 defaults:** health_level 5, moderate communication, moderate defensiveness, randomized age 22-65, direct Western communication.

**Calibration tier:** 27 personas (9 types x 3 instinctual variants), all at health level 5.

Output: `evaluation/personas/*.json`

### Fidelity Gate

Validates generated personas for psychological coherence using Claude. Assigns a fidelity score (1-3).

```bash
npx tsx --env-file=.env.local evaluation/run.ts gate
```

- **Score 3:** Clearly signals intended type with appropriate complexity. Ready for simulation.
- **Score 2:** Coherent but could be misread. Acceptable.
- **Score 1:** Significant issues. Needs regeneration.

Only personas with score >= 2 proceed to evaluation.

Output: Updates `evaluation/personas/*.json` with `fidelity_score` field.

### Evaluate

Runs the full evaluation pipeline on gated personas:
1. Simulates a complete assessment conversation
2. Tags each question (confirmatory, disconfirmatory, motivational, etc.)
3. Checks Defiant Spirit commandment compliance
4. Scores across 8 dimensions using the evaluation engine

```bash
npx tsx --env-file=.env.local evaluation/run.ts evaluate
```

Output: `evaluation/results/*.json`

### Report

Aggregates all evaluation results and generates a Markdown report.

```bash
npx tsx --env-file=.env.local evaluation/run.ts report
```

Output:
- `evaluation/reports/report-YYYY-MM-DD-<timestamp>.md` (human-readable)
- `evaluation/reports/summary-YYYY-MM-DD-<timestamp>.json` (machine-readable)

### Full Pipeline

Runs generate, gate, evaluate, and report in sequence.

```bash
npx tsx --env-file=.env.local evaluation/run.ts full --count 9
```

## Output Files

### Persona JSON (`evaluation/personas/`)

```json
{
  "id": "persona-4-SX-1234567890",
  "spec": {
    "core_type": 4,
    "wing": "4w5",
    "instinctual_variant": "SX",
    "health_level": 5,
    ...
  },
  "backstory": "...",
  "voice_profile": "...",
  "behavioral_rules": "...",
  "hidden_signals": ["..."],
  "mistype_traps": ["..."],
  "big_five_expected": { "O": "high", "C": "low", "E": "medium", "A": "medium", "N": "high" },
  "fidelity_score": 3
}
```

### Evaluation Result JSON (`evaluation/results/`)

```json
{
  "run_id": "eval-persona-4-SX-1234567890-9876543210",
  "persona_id": "persona-4-SX-1234567890",
  "ground_truth": { "core_type": 4, ... },
  "system_output": { "final_type": 4, "final_confidence": 0.85, ... },
  "accuracy": { "core_type_correct": true, "wing_correct": true, ... },
  "commandment_fidelity": { "score": 8, ... },
  "question_quality": { "total_questions": 12, "disconfirmatory": 3, ... },
  "efficiency": { "total_exchanges": 12, "confidence_curve": [...] },
  "improvement_actions": [...]
}
```

### Report Markdown (`evaluation/reports/`)

Includes:
- Headline metrics (accuracy, commandment fidelity, harm-weighted accuracy)
- Per-type performance table with 95% Wilson confidence intervals
- 9x9 confusion matrix
- Top mistype pairs with harm severity
- Question quality ratios vs targets
- Commandment fidelity detail with per-commandment pass rates
- Top priority fixes ranked by frequency x severity
- Go/no-go readiness assessment

## The 8 Evaluation Dimensions

1. **Core Type Accuracy** — Did the system identify the correct type?
2. **Subtype Accuracy** — Were wing and instinctual variant correct?
3. **Convergent Validity** — Does the Big Five profile align with the predicted type?
4. **Question Quality** — Were questions disconfirmatory, motivational, and liberatory?
5. **Confidence Calibration** — Was the system appropriately confident (not over/under)?
6. **Harm Severity** — If mistyped, how psychologically harmful is the error?
7. **Meta-Awareness** — Does the system acknowledge uncertainty when appropriate?
8. **Commandment Fidelity** — Does the system follow Defiant Spirit principles?

## Cost Estimates

Each evaluation run involves multiple Claude API calls:
- Persona generation: ~1 call per persona
- Fidelity gate: ~1 call per persona
- Simulation: ~25 calls per persona (12 system + 12 persona responses, average)
- Question tagging: ~1 call per run
- Commandment checking: ~1 call per run
- Evaluation engine (improvements): ~1 call per run

**Estimated cost per persona:** ~$0.50-1.50 (varies with conversation length)

| Run Type | Personas | Est. API Calls | Est. Cost |
|----------|----------|---------------|-----------|
| Tier 1 (9 types) | 9 | ~270 | $5-15 |
| Calibration (27 subtypes) | 27 | ~810 | $15-45 |
| Custom (18 personas) | 18 | ~540 | $10-30 |

## Interpreting Results

### Accuracy Threshold
The system targets **75% core type accuracy** as the minimum viable threshold. The report shows whether this is met along with 95% Wilson confidence intervals.

### Commandment Fidelity Score (CFS)
- **8-10:** Strong Defiant Spirit alignment
- **5-7:** Acceptable with room for improvement
- **0-4:** Needs significant prompt or system changes
- **Auto-zero:** Any critical violation (reducing person to a number, fusing identity with type)

### Harm-Weighted Accuracy
Accounts for the psychological severity of mistypes. A Type 1 mistyped as 7 (high harm) is worse than a Type 1 mistyped as 9 (moderate harm).

### Readiness Assessment
Go/no-go criteria:
- Core accuracy >= 75%
- Harm-weighted accuracy >= 80%
- Commandment Fidelity >= 7/10
- Zero critical violations
- Calibration ECE <= 0.10
- Liberated rate >= 80%
