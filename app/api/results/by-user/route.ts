import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { selectTritype, getWingTypes } from '@/lib/enneagram-lines';
import { verifyUserCookie } from '@/lib/user-session';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const sessionIdParam = req.nextUrl.searchParams.get('sessionId');

  const validUserId = userId && userId !== 'null' && userId !== 'undefined' ? userId : null;
  const validSessionId = sessionIdParam && sessionIdParam !== 'null' && sessionIdParam !== 'undefined' ? sessionIdParam : null;

  if (!validUserId && !validSessionId) {
    return NextResponse.json({ error: 'Missing userId or sessionId parameter' }, { status: 400 });
  }

  // Auth model:
  //   - Admin cookie → always allowed.
  //   - userId query mode → caller MUST hold a signed user cookie matching
  //     the requested userId. Cross-user access is forbidden.
  //   - sessionId query mode → no pre-check; the row-ownership check after
  //     the row is loaded handles it. This lets the post-assessment results
  //     page work for both anonymous rows (user_id null) and logged-in users
  //     who completed the assessment before the signed cookie existed.
  const adminOk = await isAdminAuthed(req);
  const cookieUserId = adminOk ? null : await verifyUserCookie(req);
  if (!adminOk && validUserId) {
    if (!cookieUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (validUserId !== cookieUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // List mode: return all sessions for a user (summaries only)
  const listMode = req.nextUrl.searchParams.get('list') === 'true';
  if (listMode && validUserId) {
    const { data: sessions, error: listErr } = await adminClient
      .from('assessment_results')
      .select('session_id, leading_type, confidence, tritype, exchange_count, created_at, reveal_completed')
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
    .select('session_id, user_id, leading_type, confidence, tritype, type_scores, wing_signals, variant_signals, whole_type_signals, oyn_dimensions, defiant_spirit, domain_signals, supervisor_scores, exchange_count, generated_results, created_at, reveal_completed');

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

  // Ownership check for sessionId-mode lookups: a row that already has a user_id
  // can only be read by that user (or an admin). Anonymous rows (user_id null)
  // remain accessible because they predate the user-account flow.
  if (!adminOk && validSessionId) {
    const rowUserId = (result as { user_id?: string | null }).user_id ?? null;
    if (rowUserId && rowUserId !== cookieUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // If generated results are cached, return them with corrected whole type + wing
  if (result.generated_results) {
    const cached = { ...(result.generated_results as Record<string, unknown>) };

    // Recalculate whole type from type_scores (one per center)
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
      revealCompleted: result.reveal_completed === true,
    });
  }

  // No cached results — fast 404 so the client can call /api/results/generate
  // directly with its own (longer) timeout. Triggering generation here would
  // cause a 30s hang on the client and a duplicate parallel generation.
  return NextResponse.json({
    error: 'Results not yet generated.',
    sessionId: result.session_id,
  }, { status: 404 });
}
