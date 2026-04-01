import { NextResponse } from 'next/server';
import { getAllCompletedSessions } from '@/lib/session-store';
import { adminClient } from '@/lib/supabase';

export async function POST() {
  const sessions = getAllCompletedSessions();

  if (sessions.length === 0) {
    return NextResponse.json({ saved: 0, skipped: 0, total: 0, message: 'No completed sessions in memory' });
  }

  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { sessionId, data } of sessions) {
    // Skip if already persisted
    const { data: existing } = await adminClient
      .from('assessment_results')
      .select('session_id')
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const internal = data.internalState;
    const { error } = await adminClient.from('assessment_results').upsert({
      session_id: sessionId,
      leading_type: internal?.hypothesis?.leading_type ?? 0,
      confidence: internal?.hypothesis?.confidence ?? 0,
      type_scores: internal?.hypothesis?.type_scores ?? {},
      variant_signals: internal?.variant_signals ?? {},
      wing_signals: internal?.wing_signals ?? {},
      tritype: data.wholeType ?? '',
      tritype_confidence: data.wholeTypeConfidence ?? 0,
      tritype_archetype_fauvre: data.wholeTypeArchetypeFauvre ?? '',
      tritype_archetype_ds: data.wholeTypeArchetypeDS ?? '',
      defiant_spirit_type_name: data.defiantSpiritTypeName ?? '',
      whole_type_signals: data.wholeTypeSignals ?? {},
      oyn_dimensions: internal?.oyn_dimensions ?? {},
      defiant_spirit: internal?.defiant_spirit ?? {},
      domain_signals: data.domainSignals ?? [],
      supervisor_scores: data.supervisorScores ?? [],
      exchange_count: data.exchangeCount,
      current_stage: data.currentStage,
    });

    if (error) {
      console.error('[backfill] Error saving session:', sessionId, error.message);
      errors.push(`${sessionId.slice(0, 8)}: ${error.message}`);
    } else {
      saved++;
      console.log('[backfill] Saved session:', sessionId);
    }
  }

  return NextResponse.json({
    saved,
    skipped,
    total: sessions.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `${saved} saved, ${skipped} already existed`,
  });
}
