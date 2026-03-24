import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { selectTritype, getWingTypes } from '@/lib/enneagram-lines';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const sessionIdParam = req.nextUrl.searchParams.get('sessionId');

  const validUserId = userId && userId !== 'null' && userId !== 'undefined' ? userId : null;
  const validSessionId = sessionIdParam && sessionIdParam !== 'null' && sessionIdParam !== 'undefined' ? sessionIdParam : null;

  if (!validUserId && !validSessionId) {
    return NextResponse.json({ error: 'Missing userId or sessionId parameter' }, { status: 400 });
  }

  // List mode: return all sessions for a user (summaries only)
  const listMode = req.nextUrl.searchParams.get('list') === 'true';
  if (listMode && validUserId) {
    const { data: sessions, error: listErr } = await adminClient
      .from('assessment_results')
      .select('session_id, leading_type, confidence, tritype, exchange_count, created_at')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });

    if (listErr) {
      return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  }

  // Get the assessment — by userId (latest) or by specific sessionId
  let query = adminClient
    .from('assessment_results')
    .select('session_id, leading_type, confidence, tritype, type_scores, wing_signals, variant_signals, whole_type_signals, oyn_dimensions, defiant_spirit, domain_signals, supervisor_scores, exchange_count, generated_results, created_at');

  if (validSessionId) {
    query = query.eq('session_id', validSessionId);
  } else {
    query = query.eq('user_id', validUserId!);
  }

  const { data: result, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[results/by-user] Error:', error.message);
    return NextResponse.json({ error: 'Failed to load results' }, { status: 500 });
  }

  if (!result) {
    return NextResponse.json({ error: 'No completed assessments found' }, { status: 404 });
  }

  // If generated results are cached, return them with corrected tritype + wing
  if (result.generated_results) {
    const cached = { ...(result.generated_results as Record<string, unknown>) };

    // Recalculate tritype from type_scores (one per center)
    if (result.type_scores && typeof result.type_scores === 'object') {
      const numericScores: Record<number, number> = {};
      for (const [k, v] of Object.entries(result.type_scores as Record<string, number>)) {
        numericScores[Number(k)] = v;
      }
      if (Object.keys(numericScores).length >= 3) {
        const corrected = selectTritype(numericScores);
        cached.tritype = corrected.tritype;
      }
    }

    // Recalculate wing with correct wrapping
    const lt = result.leading_type as number;
    if (lt > 0 && result.wing_signals && typeof result.wing_signals === 'object') {
      const ws = result.wing_signals as Record<string, number>;
      const adj = getWingTypes(lt);
      const wingDom = (ws.left ?? 0) > (ws.right ?? 0) ? adj[0] : adj[1];
      cached.wing = `${lt}w${wingDom}`;
    }

    // Merge raw assessment data that's NOT in the generated results
    if (result.type_scores) cached.type_scores = result.type_scores;
    if (result.whole_type_signals) cached.whole_type_signals = result.whole_type_signals;
    if (result.variant_signals && !cached.variant_signals) cached.variant_signals = result.variant_signals;
    if (result.wing_signals && !cached.wing_signals) cached.wing_signals = result.wing_signals;
    if (result.oyn_dimensions) cached.oyn_dimensions = result.oyn_dimensions;
    if (result.defiant_spirit) cached.defiant_spirit = result.defiant_spirit;
    if (result.domain_signals) cached.domain_signals = result.domain_signals;
    if (result.exchange_count) cached.exchange_count = result.exchange_count;

    return NextResponse.json({
      sessionId: result.session_id,
      results: cached,
    });
  }

  // Otherwise, trigger generation via the generate endpoint
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/results/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: result.session_id }),
  });

  if (!res.ok) {
    return NextResponse.json({
      error: 'Results not yet generated. Please complete the assessment first.',
      sessionId: result.session_id,
    }, { status: 404 });
  }

  const data = await res.json();
  return NextResponse.json({
    sessionId: result.session_id,
    results: data.results,
  });
}
