import { adminClient } from '@/lib/supabase';

const TYPE_NAMES: Record<number, string> = {
  0: 'Unknown', 1: 'Reformer', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
  5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
};

// Must match the constant in app/api/chat/route.ts and chat/init/route.ts.
// This is read-only on the dashboard — change requires a code deploy.
const CURRENT_VECTOR_MODE: 'off' | 'shadow' | 'hybrid' = 'shadow';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

// Categorize a phase tag into v1, v2, checkpoint, or legacy.
// v2 entries look like "v2:wholeType=1-4-5" or "v2:wholeType=1-4-5:tiebreaker=1-4-6"
// v1 entries look like "v1:differentiation" etc.
// checkpoint entries are bare "checkpoint" or start with "checkpoint_failed:"
type Bucket = 'v1' | 'v2' | 'checkpoint' | 'checkpoint_failed' | 'legacy';
function categorize(phase: string | null | undefined): Bucket {
  if (!phase) return 'legacy';
  if (phase.startsWith('v2:')) return 'v2';
  if (phase.startsWith('v1:')) return 'v1';
  if (phase.startsWith('checkpoint_failed')) return 'checkpoint_failed';
  if (phase === 'checkpoint') return 'checkpoint';
  return 'legacy';
}

function extractWholeType(phase: string | null | undefined): string | null {
  if (!phase) return null;
  const m = phase.match(/wholeType=([0-9-]+)/);
  return m ? m[1] : null;
}

function extractTiebreaker(phase: string | null | undefined): string | null {
  if (!phase) return null;
  const m = phase.match(/tiebreaker=([0-9-]+)/);
  return m ? m[1] : null;
}

export const dynamic = 'force-dynamic';

interface ShadowRow {
  id: number;
  session_id: string;
  exchange_number: number;
  claude_top_type: number;
  claude_confidence: number;
  vector_top_type: number;
  vector_confidence: number;
  agreement: boolean;
  center_agreement: boolean;
  phase: string | null;
  created_at: string;
}

export default async function ShadowModeDashboard() {
  const { data: logs, error } = await adminClient
    .from('shadow_mode_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return <div className="p-8 text-red-600">Error loading shadow mode data: {error.message}</div>;
  }

  const allLogs = (logs ?? []) as ShadowRow[];

  // Bucket
  const v1Logs = allLogs.filter((l) => categorize(l.phase) === 'v1');
  const v2Logs = allLogs.filter((l) => categorize(l.phase) === 'v2');
  const checkpointLogs = allLogs.filter((l) => categorize(l.phase) === 'checkpoint');
  const checkpointFailures = allLogs.filter((l) => categorize(l.phase) === 'checkpoint_failed');
  const legacyLogs = allLogs.filter((l) => categorize(l.phase) === 'legacy');

  // Per-session final exchange — used for promotion criteria
  function lastBySession(rows: ShadowRow[]): ShadowRow[] {
    const map = new Map<string, ShadowRow>();
    for (const r of rows) {
      const ex = map.get(r.session_id);
      if (!ex || r.exchange_number > ex.exchange_number) map.set(r.session_id, r);
    }
    return Array.from(map.values());
  }

  // v2 stats
  const v2FinalPerSession = lastBySession(v2Logs);
  const v2Sessions = v2FinalPerSession.length;
  const v2CoreAgree = v2FinalPerSession.filter((l) => l.agreement).length;
  const v2CenterAgree = v2FinalPerSession.filter((l) => l.center_agreement).length;
  const v2CoreRate = v2Sessions > 0 ? v2CoreAgree / v2Sessions : 0;
  const v2CenterRate = v2Sessions > 0 ? v2CenterAgree / v2Sessions : 0;
  const v2TiebreakerHits = v2Logs.filter((l) => extractTiebreaker(l.phase) !== null).length;

  // v1 stats
  const v1FinalPerSession = lastBySession(v1Logs);
  const v1Sessions = v1FinalPerSession.length;
  const v1CoreAgree = v1FinalPerSession.filter((l) => l.agreement).length;
  const v1CenterAgree = v1FinalPerSession.filter((l) => l.center_agreement).length;
  const v1CoreRate = v1Sessions > 0 ? v1CoreAgree / v1Sessions : 0;
  const v1CenterRate = v1Sessions > 0 ? v1CenterAgree / v1Sessions : 0;

  // Checkpoint stats
  const checkpointAgreementRate = checkpointLogs.length > 0
    ? checkpointLogs.filter((l) => l.agreement).length / checkpointLogs.length
    : 0;

  // Promotion gates for v2
  const PROMO_MIN_SESSIONS = 50;
  const PROMO_CORE = 0.90;
  const PROMO_CENTER = 0.95;
  const v2EnoughData = v2Sessions >= PROMO_MIN_SESSIONS;
  const v2CorePass = v2CoreRate >= PROMO_CORE;
  const v2CenterPass = v2CenterRate >= PROMO_CENTER;
  const v2ReadyToPromote = v2EnoughData && v2CorePass && v2CenterPass;

  const uniqueSessions = new Set(allLogs.map((l) => l.session_id)).size;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#2C2C2C]">Shadow Mode Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Vector scoring system observability + Claude agreement</p>
      </div>

      {/* Current mode banner */}
      <div className={`p-4 rounded-lg border ${
        CURRENT_VECTOR_MODE === 'shadow' ? 'bg-blue-50 border-blue-200' :
        CURRENT_VECTOR_MODE === 'hybrid' ? 'bg-green-50 border-green-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Current vector mode</span>
            <div className="text-lg font-semibold text-[#2C2C2C]">{CURRENT_VECTOR_MODE.toUpperCase()}</div>
          </div>
          <div className="text-xs text-gray-600 max-w-md text-right">
            {CURRENT_VECTOR_MODE === 'shadow' && (
              <>Claude is the primary scorer. Vector v2 runs after each turn and logs predictions for validation. Zero impact on user-facing accuracy.</>
            )}
            {CURRENT_VECTOR_MODE === 'hybrid' && (
              <>Vector v2 is in front of Claude on early phases. Validated for promotion.</>
            )}
            {CURRENT_VECTOR_MODE === 'off' && (
              <>Pure Claude. No vector logging.</>
            )}
          </div>
        </div>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total Sessions Logged</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{uniqueSessions}</div>
          <div className="text-xs text-gray-500 mt-1">{allLogs.length} total log rows</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Vector v2 Sessions</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{v2Sessions}</div>
          <div className="text-xs text-gray-500 mt-1">final-exchange snapshots</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">v2 Core Agreement</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{v2Sessions > 0 ? pct(v2CoreRate) : '—'}</div>
          <div className="text-xs text-gray-500 mt-1">{v2CoreAgree}/{v2Sessions} sessions</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">v2 Center Agreement</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{v2Sessions > 0 ? pct(v2CenterRate) : '—'}</div>
          <div className="text-xs text-gray-500 mt-1">Body/Heart/Head match</div>
        </div>
      </div>

      {/* Promotion gate */}
      <div className={`p-5 rounded-lg border ${v2ReadyToPromote ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="font-semibold text-[#2C2C2C] mb-3">
          {v2ReadyToPromote ? '🟢 Vector v2 ready to promote' : '🟡 Vector v2 not ready'}
        </div>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>{v2EnoughData ? '✓' : '✗'} ≥ {PROMO_MIN_SESSIONS} sessions ({v2Sessions} so far)</li>
          <li>{v2CorePass ? '✓' : '✗'} ≥ {pct(PROMO_CORE)} core agreement ({pct(v2CoreRate)})</li>
          <li>{v2CenterPass ? '✓' : '✗'} ≥ {pct(PROMO_CENTER)} center agreement ({pct(v2CenterRate)})</li>
        </ul>
        {v2ReadyToPromote && (
          <p className="mt-3 text-sm text-green-800">
            Switch <code>VECTOR_MODE</code> to <code>&apos;hybrid&apos;</code> in <code>app/api/chat/route.ts</code> and <code>app/api/chat/init/route.ts</code>.
          </p>
        )}
        {!v2ReadyToPromote && v2TiebreakerHits > 0 && (
          <p className="mt-3 text-sm text-yellow-800">
            <strong>{v2TiebreakerHits}</strong> tiebreaker conditions detected so far.
            These are sessions where two centers had a clear winner — vector v2 cannot
            resolve them passively and would inject a tiebreaker question if promoted.
          </p>
        )}
      </div>

      {/* v1 vs v2 comparison */}
      {(v1Sessions > 0 || v2Sessions > 0) && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-[#2C2C2C] mb-3 uppercase tracking-wide">v1 (legacy) vs v2 (multi-signal)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2"></th>
                <th className="py-2 text-center">Sessions</th>
                <th className="py-2 text-center">Core agreement</th>
                <th className="py-2 text-center">Center agreement</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-2 font-semibold text-gray-700">v1 (single hypothesis)</td>
                <td className="py-2 text-center">{v1Sessions}</td>
                <td className="py-2 text-center">{v1Sessions > 0 ? pct(v1CoreRate) : '—'}</td>
                <td className="py-2 text-center">{v1Sessions > 0 ? pct(v1CenterRate) : '—'}</td>
              </tr>
              <tr className="border-t border-gray-100 bg-blue-50">
                <td className="py-2 font-semibold text-gray-700">v2 (per-center races)</td>
                <td className="py-2 text-center">{v2Sessions}</td>
                <td className="py-2 text-center">{v2Sessions > 0 ? pct(v2CoreRate) : '—'}</td>
                <td className="py-2 text-center">{v2Sessions > 0 ? pct(v2CenterRate) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Checkpoint health */}
      {(checkpointLogs.length > 0 || checkpointFailures.length > 0) && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-[#2C2C2C] mb-3 uppercase tracking-wide">Reverse shadow checkpoints</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total runs</div>
              <div className="text-xl font-bold">{checkpointLogs.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Agreement rate</div>
              <div className="text-xl font-bold">{checkpointLogs.length > 0 ? pct(checkpointAgreementRate) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Failures</div>
              <div className="text-xl font-bold text-red-600">{checkpointFailures.length}</div>
            </div>
          </div>
          {checkpointFailures.length > 0 && (
            <div className="mt-3 text-xs text-red-600">
              Recent failures: {checkpointFailures.slice(0, 5).map((f) => f.phase?.replace('checkpoint_failed:', '')).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Recent v2 entries */}
      {v2Logs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-3">Recent vector v2 entries</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Session</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Ex</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Claude</th>
                  <th className="text-center p-3 text-gray-500 font-medium">v2 Core</th>
                  <th className="text-left p-3 text-gray-500 font-medium">v2 Whole Type</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Tiebreaker?</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Agree</th>
                </tr>
              </thead>
              <tbody>
                {v2Logs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="border-t border-gray-50">
                    <td className="p-3 text-gray-600">{formatDate(log.created_at)}</td>
                    <td className="p-3 font-mono text-xs text-gray-400">{log.session_id.substring(0, 8)}</td>
                    <td className="p-3 text-center text-gray-500">{log.exchange_number}</td>
                    <td className="p-3 text-center">
                      {log.claude_top_type > 0 ? (
                        <span><span className="font-semibold">T{log.claude_top_type}</span> <span className="text-gray-400 text-xs">{TYPE_NAMES[log.claude_top_type]}</span></span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-center">
                      {log.vector_top_type > 0 ? (
                        <span><span className="font-semibold">T{log.vector_top_type}</span> <span className="text-gray-400 text-xs">{TYPE_NAMES[log.vector_top_type]}</span></span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-gray-700">{extractWholeType(log.phase) ?? '—'}</td>
                    <td className="p-3 text-xs text-yellow-700">{extractTiebreaker(log.phase) ?? ''}</td>
                    <td className="p-3 text-center">
                      {log.agreement
                        ? <span className="text-green-600 font-semibold">core ✓</span>
                        : log.center_agreement
                          ? <span className="text-yellow-600">center ✓</span>
                          : <span className="text-red-600">✗</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy entries (pre-v2 logging) */}
      {legacyLogs.length > 0 && (
        <details className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <summary className="cursor-pointer text-sm text-gray-600 font-medium">
            {legacyLogs.length} legacy log entries (pre-v2 schema) — click to expand
          </summary>
          <p className="mt-2 text-xs text-gray-500">
            These are entries written before the v1/v2 phase tagging was added.
            They are kept for historical reference but are not counted in the
            promotion gates above.
          </p>
        </details>
      )}

      {allLogs.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-lg">No shadow mode data yet.</p>
          <p className="text-gray-400 text-sm mt-2">Run an assessment (real or via the simulator) to start collecting data.</p>
        </div>
      )}
    </div>
  );
}
