#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────────────────
// VECTOR v2 SHADOW VALIDATION
// ─────────────────────────────────────────────────────────────────────────
//
// Reads shadow_mode_log entries written by the chat route's shadow path
// and computes how often vector v2's prediction matched Claude's. We're
// looking for two metrics:
//
//   1. CORE TYPE AGREEMENT  — vector v2 picked the same core type Claude did
//   2. CENTER AGREEMENT     — vector v2 picked the same center (Body/Heart/Head)
//
// Center agreement is the more important launch gate. If v2 reliably
// identifies the right CENTER, the per-center races inside that center
// are a separate (smaller) tuning problem. Mistyping across centers
// (e.g. calling a Type 1 a Type 4) is the failure mode we cannot tolerate.
//
// Promotion criteria:
//   - center_agreement_rate >= 0.95 over the last 50 sessions
//   - core_type_agreement_rate >= 0.90 over the last 50 sessions
//   - both rates measured at the FINAL exchange of each session (not averaged)
//
// Run with:
//   node --env-file=.env.local --experimental-strip-types scripts/validate-vector-v2.ts
//   node --env-file=.env.local --experimental-strip-types scripts/validate-vector-v2.ts --verbose
//   node --env-file=.env.local --experimental-strip-types scripts/validate-vector-v2.ts --session=<session_id>

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key);

const verbose = process.argv.includes('--verbose');
const sessionFilter = process.argv.find((a) => a.startsWith('--session='))?.split('=')[1];

interface ShadowRow {
  session_id: string;
  exchange_number: number;
  claude_top_type: number;
  claude_confidence: number;
  vector_top_type: number;
  vector_confidence: number;
  agreement: boolean;
  center_agreement: boolean;
  phase: string;
  created_at?: string;
}

function categorize(phase: string): 'v1' | 'v2' | 'legacy' {
  if (phase.startsWith('v2:')) return 'v2';
  if (phase.startsWith('v1:')) return 'v1';
  return 'legacy';
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

async function main() {
  let query = db
    .from('shadow_mode_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (sessionFilter) {
    query = query.eq('session_id', sessionFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to read shadow_mode_log:', error.message);
    process.exit(1);
  }
  const rows = (data ?? []) as ShadowRow[];

  if (rows.length === 0) {
    console.log('No shadow_mode_log entries found.');
    process.exit(0);
  }

  // Bucket by version
  const v1Rows = rows.filter((r) => categorize(r.phase) === 'v1');
  const v2Rows = rows.filter((r) => categorize(r.phase) === 'v2');
  const legacyRows = rows.filter((r) => categorize(r.phase) === 'legacy');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SHADOW MODE LOG SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total entries: ${rows.length}`);
  console.log(`  legacy (pre-v2 logging): ${legacyRows.length}`);
  console.log(`  v1 entries: ${v1Rows.length}`);
  console.log(`  v2 entries: ${v2Rows.length}`);
  console.log('');

  if (v2Rows.length === 0) {
    console.log('⚠️  No v2 entries yet — run an assessment with VECTOR_MODE=shadow.');
    process.exit(0);
  }

  // Aggregate per-session: keep only the LAST exchange per session
  const lastBySession = new Map<string, ShadowRow>();
  for (const r of v2Rows) {
    const existing = lastBySession.get(r.session_id);
    if (!existing || r.exchange_number > existing.exchange_number) {
      lastBySession.set(r.session_id, r);
    }
  }
  const finalExchanges = Array.from(lastBySession.values());

  const coreAgree = finalExchanges.filter((r) => r.agreement).length;
  const centerAgree = finalExchanges.filter((r) => r.center_agreement).length;
  const total = finalExchanges.length;

  const coreRate = coreAgree / total;
  const centerRate = centerAgree / total;

  console.log('─── VECTOR v2 vs CLAUDE — FINAL EXCHANGE PER SESSION ───');
  console.log(`Sessions analyzed: ${total}`);
  console.log(`Core type agreement:   ${coreAgree}/${total} = ${fmtPct(coreRate)}`);
  console.log(`Center agreement:      ${centerAgree}/${total} = ${fmtPct(centerRate)}`);
  console.log('');

  // Promotion gates
  const PROMOTION_CORE = 0.90;
  const PROMOTION_CENTER = 0.95;
  const MIN_SESSIONS = 50;

  console.log('─── PROMOTION CRITERIA ───');
  const enoughData = total >= MIN_SESSIONS;
  const corePass = coreRate >= PROMOTION_CORE;
  const centerPass = centerRate >= PROMOTION_CENTER;
  console.log(`  ${enoughData ? '✓' : '✗'} Sessions >= ${MIN_SESSIONS}  (have ${total})`);
  console.log(`  ${corePass ? '✓' : '✗'} Core agreement >= ${fmtPct(PROMOTION_CORE)}  (have ${fmtPct(coreRate)})`);
  console.log(`  ${centerPass ? '✓' : '✗'} Center agreement >= ${fmtPct(PROMOTION_CENTER)}  (have ${fmtPct(centerRate)})`);
  if (enoughData && corePass && centerPass) {
    console.log('\n🟢 READY TO PROMOTE: switch VECTOR_MODE to "hybrid" in chat/init/route.ts and chat/route.ts');
  } else {
    console.log('\n🔴 NOT READY: keep VECTOR_MODE = "shadow" until criteria pass.');
  }
  console.log('');

  // Per-exchange agreement (intra-session learning curve)
  if (verbose) {
    console.log('─── PER-EXCHANGE AGREEMENT (all v2 entries) ───');
    const byExchange = new Map<number, { agree: number; total: number; centerAgree: number }>();
    for (const r of v2Rows) {
      const e = byExchange.get(r.exchange_number) ?? { agree: 0, total: 0, centerAgree: 0 };
      e.total++;
      if (r.agreement) e.agree++;
      if (r.center_agreement) e.centerAgree++;
      byExchange.set(r.exchange_number, e);
    }
    for (const [ex, stats] of [...byExchange.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`  Exchange ${ex}: core ${fmtPct(stats.agree / stats.total)} | center ${fmtPct(stats.centerAgree / stats.total)} (n=${stats.total})`);
    }
    console.log('');
  }

  // Disagreement listing
  console.log('─── RECENT DISAGREEMENTS (last 10) ───');
  const disagreements = finalExchanges
    .filter((r) => !r.agreement || !r.center_agreement)
    .slice(0, 10);
  if (disagreements.length === 0) {
    console.log('  (none)');
  } else {
    for (const r of disagreements) {
      const flags = [
        r.agreement ? null : 'core',
        r.center_agreement ? null : 'center',
      ].filter(Boolean).join('+');
      console.log(`  ${r.session_id.slice(0, 8)}… ex${r.exchange_number}: Claude=T${r.claude_top_type}@${fmtPct(r.claude_confidence)} v2=T${r.vector_top_type}@${fmtPct(r.vector_confidence)} | mismatch: ${flags}`);
    }
  }
  console.log('');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
