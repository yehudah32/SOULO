#!/usr/bin/env ts-node
// Pulls the most recent assessment and prints the full vector vs Claude
// disagreement trail from shadow_mode_log. Used to diagnose mistyping.
//
//   npx ts-node scripts/inspect-latest-session.ts
//   npx ts-node scripts/inspect-latest-session.ts <session_id>

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const db = createClient(url, key);

function fmtTypeScores(scores: Record<string, number> | null | undefined): string {
  if (!scores) return '(none)';
  return Object.entries(scores)
    .map(([t, s]) => [Number(t), Number(s)] as const)
    .filter(([t]) => t >= 1 && t <= 9)
    .sort((a, b) => b[1] - a[1])
    .map(([t, s]) => `${t}:${(s * 100).toFixed(0)}%`)
    .join(' ');
}

async function main() {
  let sessionId = process.argv[2];

  if (!sessionId) {
    const { data: latest, error } = await db
      .from('assessment_results')
      .select('session_id, created_at, leading_type, confidence, tritype, type_scores, exchange_count, user_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !latest) {
      console.error('No assessment_results found:', error?.message);
      process.exit(1);
    }
    sessionId = latest.session_id as string;
    console.log('═══════════════════════════════════════════════════════════');
    console.log('LATEST ASSESSMENT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('session_id:    ', sessionId);
    console.log('created_at:    ', latest.created_at);
    console.log('user_id:       ', latest.user_id || '(anonymous)');
    console.log('leading_type:  ', latest.leading_type);
    console.log('confidence:    ', latest.confidence);
    console.log('whole_type:    ', latest.tritype);
    console.log('exchange_count:', latest.exchange_count);
    console.log('type_scores:   ', fmtTypeScores(latest.type_scores as Record<string, number>));
    console.log('');
  }

  // Pull the full assessment row
  const { data: result } = await db
    .from('assessment_results')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (result) {
    console.log('FULL TYPE_SCORES (sorted):');
    const scores = result.type_scores as Record<string, number>;
    Object.entries(scores || {})
      .map(([t, s]) => [Number(t), Number(s)] as const)
      .filter(([t]) => t >= 1 && t <= 9)
      .sort((a, b) => b[1] - a[1])
      .forEach(([t, s], i) => {
        const marker = i === 0 ? ' ← top' : '';
        console.log(`  Type ${t}: ${(s * 100).toFixed(1)}%${marker}`);
      });
    console.log('');
    console.log('wing_signals:    ', JSON.stringify(result.wing_signals));
    console.log('variant_signals: ', JSON.stringify(result.variant_signals));
    console.log('');
  }

  // Pull progress (conversation history)
  const { data: progress } = await db
    .from('assessment_progress')
    .select('conversation_history, internal_state, exchange_count, current_stage')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (progress) {
    const history = (progress.conversation_history as Array<{ role: string; content: string }>) || [];
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`CONVERSATION (${history.length} messages)`);
    console.log('═══════════════════════════════════════════════════════════');
    history.forEach((m, i) => {
      const tag = m.role === 'user' ? 'USER ' : 'SOULO';
      const text = (m.content || '').replace(/\s+/g, ' ').slice(0, 200);
      console.log(`[${String(i + 1).padStart(2, '0')}] ${tag}: ${text}${m.content && m.content.length > 200 ? '…' : ''}`);
    });
    console.log('');
  }

  // Shadow mode log — vector vs claude disagreements
  const { data: shadowLogs } = await db
    .from('shadow_mode_log')
    .select('*')
    .eq('session_id', sessionId)
    .order('exchange_number', { ascending: true });

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`SHADOW MODE LOG (${shadowLogs?.length || 0} entries)`);
  console.log('═══════════════════════════════════════════════════════════');
  if (!shadowLogs || shadowLogs.length === 0) {
    console.log('(no shadow mode entries — assessment may not have used hybrid mode)');
  } else {
    for (const log of shadowLogs) {
      const phase = log.phase || '?';
      const ex = log.exchange_number;
      const agree = log.agreement ? '✓' : '✗';
      console.log(`\n  exchange ${ex} | phase=${phase} | agreement=${agree}`);
      console.log(`    vector: Type ${log.vector_top_type} @ ${(log.vector_confidence * 100).toFixed(0)}%`);
      console.log(`    claude: Type ${log.claude_top_type} @ ${(log.claude_confidence * 100).toFixed(0)}%`);
      if (log.vector_type_scores) {
        console.log(`    vector scores: ${fmtTypeScores(log.vector_type_scores as Record<string, number>)}`);
      }
    }
  }
  console.log('');
}

main().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
