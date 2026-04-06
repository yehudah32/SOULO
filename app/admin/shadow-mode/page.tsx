import { adminClient } from '@/lib/supabase';

const TYPE_NAMES: Record<number, string> = {
  0: 'Unknown', 1: 'Reformer', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
  5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const dynamic = 'force-dynamic';

export default async function ShadowModeDashboard() {
  // Fetch all shadow mode logs
  const { data: logs, error } = await adminClient
    .from('shadow_mode_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return <div className="p-8 text-red-600">Error loading shadow mode data: {error.message}</div>;
  }

  const allLogs = (logs ?? []) as Array<{
    id: number;
    session_id: string;
    exchange_number: number;
    claude_top_type: number;
    claude_confidence: number;
    vector_top_type: number;
    vector_confidence: number;
    agreement: boolean;
    center_agreement: boolean;
    phase: string;
    created_at: string;
  }>;

  // Separate checkpoint logs from shadow logs
  const checkpoints = allLogs.filter(l => l.phase === 'checkpoint');
  const shadowLogs = allLogs.filter(l => l.phase !== 'checkpoint');

  // Calculate stats
  const totalCheckpoints = checkpoints.length;
  const checkpointAgreements = checkpoints.filter(l => l.agreement).length;
  const checkpointRate = totalCheckpoints > 0 ? (checkpointAgreements / totalCheckpoints * 100).toFixed(1) : '—';

  const totalShadow = shadowLogs.length;
  const shadowAgreements = shadowLogs.filter(l => l.agreement).length;
  const shadowCenterAgreements = shadowLogs.filter(l => l.center_agreement).length;
  const shadowTypeRate = totalShadow > 0 ? (shadowAgreements / totalShadow * 100).toFixed(1) : '—';
  const shadowCenterRate = totalShadow > 0 ? (shadowCenterAgreements / totalShadow * 100).toFixed(1) : '—';

  // Unique sessions
  const uniqueSessions = new Set(allLogs.map(l => l.session_id)).size;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#2C2C2C]">Shadow Mode Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Vector system vs Claude comparison data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total Assessments</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{uniqueSessions}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Checkpoints</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{totalCheckpoints}</div>
          <div className="text-sm text-gray-500 mt-1">{checkpointRate}% agreement</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Shadow Logs</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{totalShadow}</div>
          <div className="text-sm text-gray-500 mt-1">{shadowTypeRate}% type agree</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Center Agreement</div>
          <div className="text-3xl font-bold text-[#2C2C2C] mt-1">{shadowCenterRate}%</div>
          <div className="text-sm text-gray-500 mt-1">Body/Heart/Head match</div>
        </div>
      </div>

      {/* Status */}
      <div className={`p-4 rounded-lg ${totalCheckpoints >= 50 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        {totalCheckpoints >= 50 ? (
          <p className="text-green-800 text-sm">
            <strong>Ready for analysis.</strong> {totalCheckpoints} checkpoints collected.
            {Number(checkpointRate) >= 85 ? ' Agreement rate ≥85% — safe to drop Claude checkpoint.' : ' Agreement rate below 85% — keep checkpoint active.'}
          </p>
        ) : (
          <p className="text-yellow-800 text-sm">
            <strong>Collecting data.</strong> {totalCheckpoints}/50 checkpoints needed before analysis.
            Need {50 - totalCheckpoints} more real assessments.
          </p>
        )}
      </div>

      {/* Checkpoint Logs (Reverse Shadow Mode) */}
      {checkpoints.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-3">Reverse Shadow Checkpoints</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Session</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Vector</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Claude</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Match</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map(log => (
                  <tr key={log.id} className="border-t border-gray-50">
                    <td className="p-3 text-gray-600">{formatDate(log.created_at)}</td>
                    <td className="p-3 font-mono text-xs text-gray-400">{log.session_id.substring(0, 8)}...</td>
                    <td className="p-3 text-center">
                      <span className="font-semibold">Type {log.vector_top_type}</span>
                      <span className="text-gray-400 ml-1 text-xs">{TYPE_NAMES[log.vector_top_type]}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold">Type {log.claude_top_type}</span>
                      <span className="text-gray-400 ml-1 text-xs">{TYPE_NAMES[log.claude_top_type]}</span>
                    </td>
                    <td className="p-3 text-center">
                      {log.agreement
                        ? <span className="text-green-600 font-semibold">✓</span>
                        : <span className="text-red-600 font-semibold">✗</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shadow Mode Logs (per-turn comparison) */}
      {shadowLogs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-3">Per-Turn Shadow Logs (latest 50)</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-gray-500 font-medium">Date</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Exchange</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Vector</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Claude</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Type</th>
                  <th className="text-center p-3 text-gray-500 font-medium">Center</th>
                </tr>
              </thead>
              <tbody>
                {shadowLogs.slice(0, 50).map(log => (
                  <tr key={log.id} className="border-t border-gray-50">
                    <td className="p-3 text-gray-600">{formatDate(log.created_at)}</td>
                    <td className="p-3 text-center text-gray-500">Q{log.exchange_number}</td>
                    <td className="p-3 text-center font-semibold">
                      {log.vector_top_type > 0 ? `Type ${log.vector_top_type}` : '—'}
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {log.claude_top_type > 0 ? `Type ${log.claude_top_type}` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      {log.agreement
                        ? <span className="text-green-600">✓</span>
                        : <span className="text-red-600">✗</span>
                      }
                    </td>
                    <td className="p-3 text-center">
                      {log.center_agreement
                        ? <span className="text-green-600">✓</span>
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

      {allLogs.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-lg">No shadow mode data yet.</p>
          <p className="text-gray-400 text-sm mt-2">Data will appear here once real users take assessments.</p>
        </div>
      )}
    </div>
  );
}
