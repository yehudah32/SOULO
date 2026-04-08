import { adminClient } from '@/lib/supabase';
import Link from 'next/link';
import SyncButton from './SyncButton';
import QuestionYieldDashboard from './QuestionYieldDashboard';
import {
  questionsToFreeTierConfidence,
  aggregateFreeTierStats,
  FREE_TIER_CONFIDENCE_THRESHOLD,
} from '@/lib/confidence-metrics';

// Must match VECTOR_MODE in app/api/chat/route.ts and chat/init/route.ts.
// Read-only on the dashboard — change requires a code deploy.
const CURRENT_VECTOR_MODE: 'off' | 'shadow' | 'hybrid' = 'shadow';

const TYPE_NAMES: Record<number, string> = {
  1: 'Reformer', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
  5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
};

const CENTER_COLOR: Record<number, string> = {
  1: '#2563EB', 2: '#B5726D', 3: '#B5726D', 4: '#B5726D',
  5: '#7A9E7E', 6: '#7A9E7E', 7: '#7A9E7E', 8: '#2563EB', 9: '#2563EB',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

type SummaryRow = {
  session_id: string;
  leading_type: number;
  confidence: number;
  tritype: string | null;
  tritype_archetype_fauvre: string | null;
  defiant_spirit_type_name: string | null;
  exchange_count: number;
  domain_signals: string[] | null;
  created_at: string;
  overall_score: number | null;
  format_compliance_score: number | null;
  differentiation_score: number | null;
  closing_criteria_score: number | null;
};

export default async function AdminDashboard() {
  let rows: SummaryRow[] = [];
  let fetchError: string | null = null;

  try {
    const { data, error } = await adminClient
      .from('admin_session_summary')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // View may not exist yet — fall back to direct table query
      const { data: fallback, error: fallbackError } = await adminClient
        .from('assessment_results')
        .select('session_id, leading_type, confidence, tritype, tritype_archetype_fauvre, defiant_spirit_type_name, exchange_count, domain_signals, created_at')
        .order('created_at', { ascending: false });

      if (fallbackError) {
        fetchError = fallbackError.message;
      } else {
        rows = (fallback ?? []).map((r) => ({ ...r, overall_score: null, format_compliance_score: null, differentiation_score: null, closing_criteria_score: null }));
      }
    } else {
      rows = data ?? [];
    }
  } catch (err) {
    fetchError = String(err);
  }

  // Pull live shadow data for v2 stats AND the questions-to-confidence metric.
  // Single query, two derived stats.
  let v2Sessions = 0;
  let v2CoreAgreementPct: number | null = null;
  let v2TiebreakerCount = 0;
  // Per-session map: session_id → exchanges to first crossing of free-tier threshold
  const questionsToConfidenceBySession = new Map<string, number | null>();
  try {
    const { data: shadowRows } = await adminClient
      .from('shadow_mode_log')
      .select('session_id, exchange_number, agreement, phase, claude_top_type, claude_confidence')
      .order('created_at', { ascending: false })
      .limit(5000);

    // Group all rows by session
    const rowsBySession = new Map<string, Array<{
      exchange_number: number;
      agreement: boolean;
      phase: string;
      claude_top_type: number;
      claude_confidence: number;
    }>>();
    for (const r of shadowRows ?? []) {
      const list = rowsBySession.get(r.session_id) ?? [];
      list.push(r as {
        exchange_number: number;
        agreement: boolean;
        phase: string;
        claude_top_type: number;
        claude_confidence: number;
      });
      rowsBySession.set(r.session_id, list);
    }

    // For each session compute (a) latest v2 entry for agreement stats,
    // (b) questions-to-confidence metric.
    const lastV2BySession = new Map<string, { agreement: boolean }>();
    for (const [sessionId, sessionRows] of rowsBySession) {
      // v2 final exchange for agreement
      const v2Rows = sessionRows.filter((r) => r.phase?.startsWith('v2:'));
      if (v2Rows.length > 0) {
        const latest = v2Rows.reduce((acc, r) => r.exchange_number > acc.exchange_number ? r : acc);
        lastV2BySession.set(sessionId, { agreement: latest.agreement });
      }
      for (const r of v2Rows) {
        if (/tiebreaker=/.test(r.phase || '')) v2TiebreakerCount++;
      }

      // Questions-to-confidence (uses Claude's confidence regardless of v1/v2)
      questionsToConfidenceBySession.set(sessionId, questionsToFreeTierConfidence(sessionRows));
    }

    v2Sessions = lastV2BySession.size;
    if (v2Sessions > 0) {
      const agreed = [...lastV2BySession.values()].filter((r) => r.agreement).length;
      v2CoreAgreementPct = Math.round((agreed / v2Sessions) * 100);
    }
  } catch { /* non-fatal — leave shadow stats empty */ }

  // Aggregate free-tier confidence stats across all sessions that have any
  // shadow data (which is most sessions since we started logging).
  const freeTierStats = aggregateFreeTierStats([...questionsToConfidenceBySession.values()]);

  // Stats
  const total = rows.length;
  const avgConf = total > 0
    ? Math.round((rows.reduce((s, r) => s + r.confidence, 0) / total) * 100)
    : 0;
  const typeCounts = rows.reduce<Record<number, number>>((acc, r) => {
    acc[r.leading_type] = (acc[r.leading_type] ?? 0) + 1;
    return acc;
  }, {});
  const mostCommonType = total > 0
    ? Number(Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0])
    : null;
  const avgExchanges = total > 0
    ? Math.round(rows.reduce((s, r) => s + r.exchange_count, 0) / total)
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-white/40">

      {/* Top nav lives in app/admin/layout.tsx — do not duplicate here */}

      <div className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[1.8rem] font-bold text-soulo-blue">Assessment Dashboard</h1>
            <p className="font-sans text-sm text-gray-700">All completed sessions, quality scores, and outcomes.</p>
          </div>
          <SyncButton />
        </div>

        {/* Vector mode banner — surfaces the current scoring deployment posture */}
        <div className={`rounded-2xl border p-4 ${
          CURRENT_VECTOR_MODE === 'shadow' ? 'bg-blue-50 border-blue-200' :
          CURRENT_VECTOR_MODE === 'hybrid' ? 'bg-green-50 border-green-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-[0.65rem] uppercase tracking-[0.08em] text-gray-500">Vector mode</span>
              <span className="font-serif text-base font-semibold text-[#2C2C2C]">{CURRENT_VECTOR_MODE.toUpperCase()}</span>
            </div>
            <div className="text-xs text-gray-600 max-w-md text-right">
              {CURRENT_VECTOR_MODE === 'shadow' && (
                <>Claude scores assessments. Vector v2 runs in the background and logs predictions for validation. <Link href="/admin/shadow-mode" className="underline hover:text-[#2563EB]">View shadow data →</Link></>
              )}
              {CURRENT_VECTOR_MODE === 'hybrid' && (
                <>Vector v2 in front, Claude for differentiation. Validated for promotion. <Link href="/admin/shadow-mode" className="underline hover:text-[#2563EB]">View metrics →</Link></>
              )}
              {CURRENT_VECTOR_MODE === 'off' && (
                <>Pure Claude. No vector logging.</>
              )}
            </div>
          </div>
        </div>

        {fetchError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="font-sans text-sm font-semibold text-red-700 mb-1">Database error</p>
            <p className="font-sans text-xs text-red-600">{fetchError}</p>
            <p className="font-sans text-xs text-red-500 mt-3">
              Make sure you ran the Phase 3 Part 2 SQL additions in Supabase SQL Editor.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Total Sessions',
                  value: total.toString(),
                  sub: total === 1 ? 'assessment completed' : 'assessments completed',
                },
                {
                  label: 'Most Common Type',
                  value: mostCommonType ? `Type ${mostCommonType}` : '—',
                  sub: mostCommonType
                    ? `${TYPE_NAMES[mostCommonType]} · ${Math.round(((typeCounts[mostCommonType] ?? 0) / total) * 100)}% of sessions`
                    : 'no data yet',
                },
                {
                  label: 'Avg Confidence',
                  value: total > 0 ? `${avgConf}%` : '—',
                  sub: `${avgExchanges} avg exchanges`,
                },
                {
                  label: `Q's to Free-Tier`,
                  value: freeTierStats.avgQuestions !== null
                    ? freeTierStats.avgQuestions.toString()
                    : '—',
                  sub: freeTierStats.reached > 0
                    ? `avg · median ${freeTierStats.medianQuestions} · range ${freeTierStats.minQuestions}-${freeTierStats.maxQuestions}`
                    : `${Math.round(FREE_TIER_CONFIDENCE_THRESHOLD * 100)}% threshold not yet reached`,
                },
                {
                  label: 'Vector v2 Agreement',
                  value: v2CoreAgreementPct !== null ? `${v2CoreAgreementPct}%` : '—',
                  sub: v2Sessions > 0
                    ? `${v2Sessions} v2 session${v2Sessions === 1 ? '' : 's'} · ${v2TiebreakerCount} tiebreaker${v2TiebreakerCount === 1 ? '' : 's'}`
                    : 'no shadow data yet',
                },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-1">
                  <span className="font-sans text-[0.68rem] uppercase tracking-[0.08em] text-gray-500">{label}</span>
                  <span className="font-serif text-[1.6rem] font-bold text-soulo-blue leading-none">{value}</span>
                  <span className="font-sans text-[0.72rem] text-gray-500 leading-snug">{sub}</span>
                </div>
              ))}
            </div>

            {/* Sessions table */}
            {rows.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="font-serif text-[1rem] text-soulo-blue">No sessions yet</p>
                <p className="font-sans text-sm text-gray-700 max-w-[320px] leading-relaxed">
                  Complete an assessment and the results will appear here.
                </p>
                <Link
                  href="/assessment"
                  className="mt-2 font-serif text-white bg-soulo-purple rounded-2xl px-6 py-2.5 text-sm hover:opacity-90 transition-colors"
                >
                  Start Assessment
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">

                {/* Table header */}
                <div className="hidden md:grid grid-cols-[160px_140px_180px_90px_70px_60px_70px_32px] gap-4 items-center px-5 py-3 border-b border-[#F0EBE6]">
                  {['Date', 'Type', 'DS Type Name', 'Whole Type', 'Conf.', 'Exch.', 'Q→75%', ''].map((h) => (
                    <span key={h} className="font-sans text-[0.65rem] uppercase tracking-[0.08em] text-gray-500">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#F7F4F1]">
                  {rows.map((row) => {
                    const { date, time } = formatDate(row.created_at);
                    const typeColor = CENTER_COLOR[row.leading_type] ?? '#2563EB';
                    const confPct = Math.round(row.confidence * 100);
                    const qToConf = questionsToConfidenceBySession.get(row.session_id) ?? null;
                    return (
                      <Link
                        key={row.session_id}
                        href={`/admin/${row.session_id}`}
                        className="group block hover:bg-white/40 transition-colors"
                      >
                        {/* Mobile layout */}
                        <div className="md:hidden flex items-center justify-between gap-3 px-5 py-4">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-serif text-lg font-bold leading-none"
                                style={{ color: typeColor }}
                              >
                                {row.leading_type}
                              </span>
                              <span className="font-sans text-sm text-soulo-blue truncate">
                                {TYPE_NAMES[row.leading_type]}
                              </span>
                              {row.tritype && (
                                <span className="font-sans text-xs text-gray-500">{row.tritype}</span>
                              )}
                            </div>
                            <span className="font-sans text-xs text-gray-500">
                              {date} · {time}{qToConf !== null ? ` · ${qToConf} q's to free-tier` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[#D0CAC4] group-hover:text-soulo-purple transition-colors">→</span>
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden md:grid grid-cols-[160px_140px_180px_90px_70px_60px_70px_32px] gap-4 items-center px-5 py-4">
                          {/* Date */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-sans text-sm text-soulo-blue">{date}</span>
                            <span className="font-sans text-xs text-gray-500">{time}</span>
                          </div>

                          {/* Type */}
                          <div className="flex items-center gap-2">
                            <span
                              className="font-serif text-xl font-bold leading-none w-6"
                              style={{ color: typeColor }}
                            >
                              {row.leading_type}
                            </span>
                            <span className="font-sans text-sm text-soulo-blue">
                              {TYPE_NAMES[row.leading_type]}
                            </span>
                          </div>

                          {/* DS Type Name */}
                          <span className="font-sans text-sm text-gray-700 truncate">
                            {row.defiant_spirit_type_name || '—'}
                          </span>

                          {/* Whole Type */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-sans text-sm text-soulo-blue">{row.tritype || '—'}</span>
                            {row.tritype_archetype_fauvre && (
                              <span className="font-sans text-[0.68rem] text-gray-500 truncate">
                                {row.tritype_archetype_fauvre}
                              </span>
                            )}
                          </div>

                          {/* Confidence */}
                          <span className="font-sans text-sm text-soulo-blue font-semibold">
                            {confPct}%
                          </span>

                          {/* Exchanges */}
                          <span className="font-sans text-sm text-gray-700">
                            {row.exchange_count}
                          </span>

                          {/* Q's to Free-Tier confidence */}
                          <span
                            className={`font-mono text-sm ${qToConf !== null ? 'text-[#2563EB] font-semibold' : 'text-[#9B9590]'}`}
                            title={qToConf !== null
                              ? `Reached ${Math.round(FREE_TIER_CONFIDENCE_THRESHOLD * 100)}% confidence at exchange ${qToConf}`
                              : `Never reached ${Math.round(FREE_TIER_CONFIDENCE_THRESHOLD * 100)}% confidence`}
                          >
                            {qToConf !== null ? qToConf : '—'}
                          </span>

                          {/* Arrow */}
                          <span className="text-[#D0CAC4] group-hover:text-soulo-purple transition-colors text-sm">→</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Type distribution */}
            {total > 0 && (
              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
                <span className="font-sans text-[0.68rem] uppercase tracking-[0.08em] text-gray-500">
                  Type Distribution
                </span>
                <div className="mt-4 flex flex-col gap-2.5">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((t) => {
                    const count = typeCounts[t] ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const color = CENTER_COLOR[t] ?? '#2563EB';
                    return (
                      <div key={t} className="flex items-center gap-3">
                        <span
                          className="font-sans text-xs font-semibold w-16 flex-shrink-0"
                          style={{ color: count > 0 ? color : '#D0CAC4' }}
                        >
                          Type {t}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-[#F0EBE6] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color, opacity: count > 0 ? 1 : 0.2 }}
                          />
                        </div>
                        <span className="font-sans text-xs text-gray-500 w-16 text-right flex-shrink-0">
                          {count > 0 ? `${count} · ${pct}%` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Question Yield Dashboard */}
        <QuestionYieldDashboard />
      </div>
    </div>
  );
}

// QuestionYieldDashboard is imported from ./QuestionYieldDashboard.tsx (client component)
// Inline version removed — was causing useState errors in server component context
void 0; // EOF marker — do not add code below this line
