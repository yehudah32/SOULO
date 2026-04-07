// ─────────────────────────────────────────────────────────────────────────
// TIEBREAKER QUESTIONS — Whole Type disambiguation via passion probing
// ─────────────────────────────────────────────────────────────────────────
//
// When two or three center winners are competitive (e.g. a 1-4-5 looks
// equally like Type 1 AND Type 4 to a passive scorer), no amount of
// additional behavior probing will disambiguate them. The fix is to ask
// ONE direct question that probes the PASSION/FIXATION of each candidate
// type — because that's where types are actually distinct, not in their
// surface behavior.
//
// This is rooted in Dr. Baruch HaLevi's framing:
//   - Each type has a CORE passion (the automatic reaction that runs first)
//   - The passion is the engine; behaviors are downstream
//   - Types with overlapping fixes look identical until you ask about engine
//
// The descriptions here use Baruch-style language: reaction patterns,
// "what kicks in before you choose," the inner experience first not the
// outward behavior. Each option is 1-2 sentences max, written as if the
// person is reading their own first-instinct experience.
//
// USAGE:
//   const tb = generateTiebreaker([1, 4, 5]); // pass competing types
//   // returns a Question with answer_options and type_weights set so
//   // the picked option strongly weights the corresponding type
//
// These questions can be:
//   1. Asked by Claude (via the system prompt's tiebreaker guidance)
//   2. Injected by vector v2 once it's promoted out of shadow mode
//   3. Used for offline testing and validation

import type { Question } from './fallback-questions';

// ── Passion descriptions (Baruch-rooted) ──
//
// Each one describes the INNER FIRST-INSTINCT experience, not the visible
// behavior. They're written as if reading them out loud — no jargon, no
// type numbers, no clinical language. The reader should feel "yes that's
// me" or "no, that's not where I start."

export const PASSION_DESCRIPTIONS: Record<number, string> = {
  1: "A sharp internal voice that's always evaluating: was that right? was that good enough? — and won't quiet down until you've fixed it. The bar is high and the critic is loud.",

  2: "An automatic pull toward what other people need from you, with your own needs sometimes invisible until they pile up. You'd rather give than receive, and being needed feels like home.",

  3: "A drive to make things happen and be seen succeeding at them — and a quiet undercurrent that says: if the doing stopped, who would I be? Image and accomplishment are tightly woven into how you know yourself.",

  4: "A weight in your chest that says something essential is missing — and other people seem to have figured out what you can't quite name. There's a longing for what isn't there, and a sense that the ordinary isn't enough.",

  5: "A pull to step back, observe, and gather information before engaging — protecting your inner space and your energy from being overwhelmed or drained by what's coming at you.",

  6: "A scanning for what could go wrong and a constant low-grade question of who or what is actually trustworthy. You play out the worst case so you can be ready for it.",

  7: "A reach toward the next exciting thing, the next plan, the next possibility — and a real discomfort with sitting in the stuck or painful place. Movement keeps the heaviness away.",

  8: "A move to take charge, push back, and protect what matters — with very little patience for being controlled, condescended to, or told what to do by anyone.",

  9: "A pull toward peace and going along, where your own preferences quietly fade so the relationship or the situation can stay smooth. Conflict feels expensive in a way it doesn't for other people.",
};

// ── Tiebreaker question generator ──

/**
 * Build a tiebreaker question that probes the passions of competing types.
 * Returns a Question with answer_options and type_weights set so the picked
 * option weights the corresponding type heavily.
 *
 * @param competingTypes - 2 or 3 types that are competing for core position
 * @param leadIn - optional custom lead-in line (defaults to a Baruch-style
 *                 framing about "first reactions under pressure")
 */
export function generateTiebreaker(
  competingTypes: number[],
  leadIn?: string,
): Question {
  if (competingTypes.length < 2 || competingTypes.length > 5) {
    throw new Error(`Tiebreaker requires 2-5 competing types, got ${competingTypes.length}`);
  }

  const validTypes = competingTypes.filter((t) => t >= 1 && t <= 9 && PASSION_DESCRIPTIONS[t]);
  if (validTypes.length < 2) {
    throw new Error(`Tiebreaker needs at least 2 valid types from 1-9`);
  }

  const intro = leadIn ?? "Three patterns can show up when something matters to you and the pressure's on. Read these slowly and pick the one that's closest to your *first instinct* — the thing that kicks in before you choose:";

  // Build options from passion descriptions
  const options = validTypes.map((t) => PASSION_DESCRIPTIONS[t]);

  // type_weights: the picked option strongly weights its type, with a small
  // secondary weight to the wing types (one above, one below) to avoid
  // over-collapsing into a single point.
  const type_weights: Record<number, Record<number, number>> = {};
  validTypes.forEach((t, idx) => {
    const weights: Record<number, number> = { [t]: 0.75 };
    // Light wing weighting (the type's adjacent neighbors)
    const left = ((t - 2 + 9) % 9) + 1;
    const right = (t % 9) + 1;
    weights[left] = 0.05;
    weights[right] = 0.05;
    type_weights[idx] = weights;
  });

  return {
    id: -100, // Reserved ID range for runtime-generated tiebreakers
    question_text: intro,
    answer_options: options,
    format: 'paragraph_select',
    stage: 6, // Tiebreakers fire late in the assessment
    oyn_dim: 'why',
    react_respond_lens: 'react',
    target_types: validTypes,
    times_used: 0,
    avg_information_yield: 0.95, // tiebreakers are high-information by design
    is_baruch_sourced: true,
    type_weights,
  };
}

/**
 * Decide whether the assessment should run a tiebreaker now.
 *
 * Logic: a tiebreaker is needed when TWO OR MORE centers each have a clear
 * winner (within-race confidence above CLEAR_WINNER_THRESHOLD). At that
 * point passive observation cannot tell us which center is the CORE — only
 * a direct probe can. The tiebreaker includes EVERY center with a clear
 * winner, so a 1-4-5 (all three centers showing) gets all three options.
 *
 * @param centerWinners - the current top type per center (Body/Heart/Head)
 * @param centerConfidences - normalized confidence within each race [0-1]
 * @param exchangeCount - how many turns the assessment has run
 * @returns null if no tiebreaker needed, or the list of competing types
 *          (one per center) to feed into generateTiebreaker()
 */
export function detectTiebreakerNeeded(
  centerWinners: { Body: number; Heart: number; Head: number },
  centerConfidences: { Body: number; Heart: number; Head: number },
  exchangeCount: number,
): number[] | null {
  // Don't fire tiebreakers too early — need data first
  if (exchangeCount < 6) return null;

  // A center has a "clear winner" when its top type stands out from its two
  // competitors by enough margin that the within-race confidence is high.
  // 0.50 means the top type is at least half of the total normalized signal
  // in its three-way race (uniform would be 0.33).
  const CLEAR_WINNER_THRESHOLD = 0.50;

  const competitors: Array<{ type: number; conf: number }> = [];
  if (centerConfidences.Body >= CLEAR_WINNER_THRESHOLD && centerWinners.Body > 0) {
    competitors.push({ type: centerWinners.Body, conf: centerConfidences.Body });
  }
  if (centerConfidences.Heart >= CLEAR_WINNER_THRESHOLD && centerWinners.Heart > 0) {
    competitors.push({ type: centerWinners.Heart, conf: centerConfidences.Heart });
  }
  if (centerConfidences.Head >= CLEAR_WINNER_THRESHOLD && centerWinners.Head > 0) {
    competitors.push({ type: centerWinners.Head, conf: centerConfidences.Head });
  }

  // No tiebreaker needed if only zero or one center has a clear winner
  if (competitors.length < 2) return null;

  // Return the competing types in original center order (Body, Heart, Head)
  // so the option list is presented consistently.
  return competitors.map((c) => c.type);
}
