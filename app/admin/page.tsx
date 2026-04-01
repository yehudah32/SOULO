import { adminClient } from '@/lib/supabase';
import Link from 'next/link';
import SyncButton from './SyncButton';
import QuestionYieldDashboard from './QuestionYieldDashboard';

const TYPE_NAMES: Record<number, string> = {
  1: 'Reformer', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
  5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
};

const CENTER_COLOR: Record<number, string> = {
  1: '#2563EB', 2: '#B5726D', 3: '#B5726D', 4: '#B5726D',
  5: '#7A9E7E', 6: '#7A9E7E', 7: '#7A9E7E', 8: '#2563EB', 9: '#2563EB',
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="font-sans text-xs text-gray-500">—</span>;
  const color =
    score >= 7.5 ? 'bg-[#7A9E7E]/15 text-[#4A7A52]' :
    score >= 5   ? 'bg-[#F5E6B0]/60 text-[#7A6A20]' :
                   'bg-red-50 text-red-600';
  return (
    <span className={`font-sans text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

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
  const scoredRows = rows.filter((r) => r.overall_score !== null);
  const avgScore = scoredRows.length > 0
    ? scoredRows.reduce((s, r) => s + (r.overall_score ?? 0), 0) / scoredRows.length
    : null;
  const avgExchanges = total > 0
    ? Math.round(rows.reduce((s, r) => s + r.exchange_count, 0) / total)
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-white/40">

      {/* Nav */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-white/40" style={{ height: '56px' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif text-[1.1rem] font-semibold text-soulo-purple hover:opacity-80 transition-opacity">
            Soulo Enneagram
          </Link>
          <span className="text-[#D0CAC4]">/</span>
          <span className="font-sans text-sm text-gray-700">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/assessment"
            className="font-sans text-xs text-[#7A9E7E] hover:text-[#5C8060] transition-colors"
          >
            New Assessment →
          </Link>
          <Link
            href="/api/admin/logout"
            className="font-sans text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </Link>
        </div>
      </nav>

      <div className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[1.8rem] font-bold text-soulo-blue">Assessment Dashboard</h1>
            <p className="font-sans text-sm text-gray-700">All completed sessions, quality scores, and outcomes.</p>
          </div>
          <SyncButton />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  sub: 'across all sessions',
                },
                {
                  label: 'Avg Quality Score',
                  value: avgScore !== null ? avgScore.toFixed(1) : '—',
                  sub: `/ 10 · ${avgExchanges} avg exchanges`,
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
                  {['Date', 'Type', 'DS Type Name', 'Whole Type', 'Conf.', 'Exch.', 'Score', ''].map((h) => (
                    <span key={h} className="font-sans text-[0.65rem] uppercase tracking-[0.08em] text-gray-500">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#F7F4F1]">
                  {rows.map((row) => {
                    const { date, time } = formatDate(row.created_at);
                    const typeColor = CENTER_COLOR[row.leading_type] ?? '#2563EB';
                    const confPct = Math.round(row.confidence * 100);
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
                            <span className="font-sans text-xs text-gray-500">{date} · {time}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <ScoreBadge score={row.overall_score} />
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

                          {/* Score */}
                          <ScoreBadge score={row.overall_score} />

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
