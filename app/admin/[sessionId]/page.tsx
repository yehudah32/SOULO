import { adminClient } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWingTypes } from '@/lib/enneagram-lines';

const TYPE_NAMES: Record<number, string> = {
  1: 'The Reformer', 2: 'The Helper', 3: 'The Achiever', 4: 'The Individualist',
  5: 'The Investigator', 6: 'The Loyalist', 7: 'The Enthusiast', 8: 'The Challenger', 9: 'The Peacemaker',
};

const CENTER_LABEL: Record<number, string> = {
  1: 'Body', 2: 'Heart', 3: 'Heart', 4: 'Heart',
  5: 'Head', 6: 'Head', 7: 'Head', 8: 'Body', 9: 'Body',
};

const OYN_LABELS: Record<string, string> = {
  who: 'WHO', what: 'WHAT', why: 'WHY', how: 'HOW', when: 'WHEN', where: 'WHERE',
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-[0.65rem] uppercase tracking-[0.09em] text-[#9B9590]">
      {children}
    </span>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 10);
  const color = score >= 7.5 ? '#7A9E7E' : score >= 5 ? '#D4A94A' : '#C06060';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, #F0EBE6 0deg)`,
        }}
      >
        <div className="absolute w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <span className="font-sans text-sm font-bold text-[#2C2C2C]">{score.toFixed(1)}</span>
        </div>
      </div>
      <span className="font-sans text-[0.65rem] text-[#9B9590] text-center leading-tight">{label}</span>
    </div>
  );
}

type ResultRow = {
  session_id: string;
  leading_type: number;
  confidence: number;
  type_scores: Record<string, number>;
  variant_signals: { SP: number; SO: number; SX: number };
  wing_signals: { left: number; right: number };
  tritype: string;
  tritype_confidence: number;
  tritype_archetype_fauvre: string;
  tritype_archetype_ds: string;
  defiant_spirit_type_name: string;
  whole_type_signals: { body: number; heart: number; head: number };
  oyn_dimensions: Record<string, string>;
  defiant_spirit: { react_pattern_observed: string; respond_glimpsed: string; domain_signals: string[] };
  domain_signals: string[];
  supervisor_scores: number[];
  exchange_count: number;
  current_stage: number;
  created_at: string;
};

type EvalRow = {
  overall_score: number;
  format_compliance_score: number;
  differentiation_score: number;
  closing_criteria_score: number;
  strengths: string[];
  weaknesses: string[];
  question_usefulness: Array<{ question_text_fragment: string; was_useful: boolean; reason: string }>;
  final_type_confidence: number;
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const [{ data: result }, { data: evaluation }] = await Promise.all([
    adminClient.from('assessment_results').select('*').eq('session_id', sessionId).single(),
    adminClient.from('assessment_evaluations').select('*').eq('session_id', sessionId).single(),
  ]);

  if (!result) notFound();

  const r = result as ResultRow;
  const e = evaluation as EvalRow | null;

  const leadingType = r.leading_type;
  const confPct = Math.round(r.confidence * 100);
  const typeName = TYPE_NAMES[leadingType] ?? `Type ${leadingType}`;
  const center = CENTER_LABEL[leadingType] ?? '';

  const sortedScores = Object.entries(r.type_scores ?? {}).sort(([, a], [, b]) => b - a);

  const variantEntries = Object.entries(r.variant_signals ?? {}) as [string, number][];
  const dominantVariant = [...variantEntries].sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

  const oynEntries = Object.entries(r.oyn_dimensions ?? {}).filter(([, v]) => v?.trim());

  const wingAdj = getWingTypes(leadingType);
  const wing = r.wing_signals
    ? (r.wing_signals.left > r.wing_signals.right ? `${leadingType}w${wingAdj[0]}` : `${leadingType}w${wingAdj[1]}`)
    : null;

  const supervisorAvg =
    r.supervisor_scores?.length > 0
      ? r.supervisor_scores.reduce((a: number, b: number) => a + b, 0) / r.supervisor_scores.length
      : null;

  const formattedDate = new Date(r.created_at).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">

      {/* Nav */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-[#E8E4E0]" style={{ height: '56px' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="font-sans text-sm text-[#9B9590] hover:text-[#6B6B6B] transition-colors">
            ← Dashboard
          </Link>
          <span className="text-[#D0CAC4]">/</span>
          <span className="font-sans text-sm text-[#2C2C2C]">Session Detail</span>
        </div>
        <span className="font-sans text-[0.72rem] text-[#9B9590] hidden sm:block">{formattedDate}</span>
      </nav>

      <div className="flex-1 max-w-[960px] w-full mx-auto px-5 py-8 flex flex-col gap-6">

        {/* Session meta */}
        <div className="flex items-center gap-2">
          <span className="font-sans text-[0.7rem] text-[#9B9590] font-mono">{sessionId}</span>
          <span className="text-[#D0CAC4]">·</span>
          <span className="font-sans text-[0.7rem] text-[#9B9590]">{r.exchange_count} exchanges · Stage {r.current_stage}</span>
        </div>

        {/* Type Hero */}
        <Card>
          <div className="flex flex-wrap items-end gap-6">
            {/* Type number */}
            <div className="flex items-end gap-4">
              <span className="font-serif text-[5rem] font-bold text-[#2563EB] leading-none">{leadingType}</span>
              <div className="flex flex-col gap-1 pb-2">
                <span className="font-serif text-[1.3rem] font-semibold text-[#2C2C2C] leading-tight">{typeName}</span>
                {r.defiant_spirit_type_name && (
                  <span className="font-sans text-sm text-[#7A9E7E]">{r.defiant_spirit_type_name}</span>
                )}
                <span className="font-sans text-xs text-[#9B9590]">{center} Center</span>
              </div>
            </div>

            {/* Right side stats */}
            <div className="ml-auto flex gap-6 flex-wrap pb-1">
              <div className="flex flex-col gap-0.5">
                <Label>Confidence</Label>
                <span className="font-serif text-[2rem] font-bold text-[#2C2C2C] leading-none">{confPct}%</span>
              </div>
              {wing && (
                <div className="flex flex-col gap-0.5">
                  <Label>Wing</Label>
                  <span className="font-serif text-[1.4rem] font-bold text-[#2C2C2C] leading-none">{wing}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <Label>Variant</Label>
                <span className="font-serif text-[1.4rem] font-bold text-[#2C2C2C] leading-none">{dominantVariant}</span>
                <span className="font-sans text-[0.68rem] text-[#9B9590]">
                  SP {Math.round((r.variant_signals?.SP ?? 0) * 100)}%
                  &nbsp;·&nbsp;SO {Math.round((r.variant_signals?.SO ?? 0) * 100)}%
                  &nbsp;·&nbsp;SX {Math.round((r.variant_signals?.SX ?? 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Two-column: scores + evaluation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Type Scores */}
          <Card>
            <div className="flex flex-col gap-4">
              <Label>Type Scores</Label>
              <div className="flex flex-col gap-2.5">
                {sortedScores.map(([type, score]) => {
                  const pct = Math.min(100, Math.round(score * 100));
                  const isLeading = Number(type) === leadingType;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className={`font-sans text-xs w-14 flex-shrink-0 ${isLeading ? 'font-bold text-[#2563EB]' : 'text-[#6B6B6B]'}`}>
                        Type {type}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#F0EBE6] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isLeading ? '#2563EB' : '#7A9E7E',
                            opacity: isLeading ? 1 : 0.6,
                          }}
                        />
                      </div>
                      <span className={`font-sans text-xs w-9 text-right flex-shrink-0 ${isLeading ? 'font-bold text-[#2563EB]' : 'text-[#9B9590]'}`}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Quality Evaluation */}
          <Card>
            <div className="flex flex-col gap-4">
              <Label>Quality Evaluation</Label>
              {e ? (
                <>
                  {/* Score rings */}
                  <div className="flex justify-around flex-wrap gap-4">
                    <ScoreRing score={e.overall_score} label="Overall" />
                    <ScoreRing score={e.format_compliance_score} label="Format" />
                    <ScoreRing score={e.differentiation_score} label="Differentiation" />
                    <ScoreRing score={e.closing_criteria_score} label="Closing" />
                  </div>

                  <div className="h-px bg-[#F0EBE6]" />

                  {/* Strengths */}
                  {e.strengths?.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="font-sans text-xs text-[#7A9E7E] font-semibold">Strengths</span>
                      <ul className="flex flex-col gap-1">
                        {e.strengths.map((s, i) => (
                          <li key={i} className="font-sans text-xs text-[#2C2C2C] leading-relaxed flex gap-1.5">
                            <span className="text-[#7A9E7E] flex-shrink-0">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {e.weaknesses?.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="font-sans text-xs text-[#2563EB] font-semibold">Areas for improvement</span>
                      <ul className="flex flex-col gap-1">
                        {e.weaknesses.map((w, i) => (
                          <li key={i} className="font-sans text-xs text-[#2C2C2C] leading-relaxed flex gap-1.5">
                            <span className="text-[#2563EB] flex-shrink-0">·</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-[#D0CAC4] border-t-[#2563EB] animate-spin" />
                  <p className="font-sans text-xs text-[#9B9590]">Evaluation pending…</p>
                  <p className="font-sans text-[0.65rem] text-[#B0AAA4] text-center">
                    Fires async after session close. Check back shortly.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tritype */}
        {r.tritype && (
          <Card>
            <div className="flex flex-wrap gap-6 items-start">
              <div className="flex flex-col gap-1">
                <Label>Tritype</Label>
                <span className="font-serif text-[2.5rem] font-bold text-[#2C2C2C] leading-none">{r.tritype}</span>
                {r.tritype_confidence > 0 && (
                  <span className="font-sans text-xs text-[#9B9590]">
                    {Math.round(r.tritype_confidence * 100)}% confidence
                  </span>
                )}
              </div>
              {r.tritype_archetype_fauvre && (
                <div className="flex flex-col gap-1">
                  <Label>Fauvre Archetype</Label>
                  <span className="font-sans text-sm text-[#2C2C2C]">{r.tritype_archetype_fauvre}</span>
                </div>
              )}
              {r.tritype_archetype_ds && (
                <div className="flex flex-col gap-1">
                  <Label>Defiant Spirit Archetype</Label>
                  <span className="font-sans text-sm text-[#2C2C2C]">{r.tritype_archetype_ds}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Whole-type signals + Centers */}
        <Card>
          <div className="flex flex-col gap-4">
            <Label>Whole-Type Signals (Center Activation)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['body', 'heart', 'head'] as const).map((center) => {
                const val = r.whole_type_signals?.[center] ?? 0;
                const pct = Math.round(val * 100);
                const colors: Record<string, string> = {
                  body: '#2563EB', heart: '#B5726D', head: '#7A9E7E',
                };
                return (
                  <div key={center} className="flex flex-col gap-2 p-4 rounded-xl bg-[#FAF8F5]">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs font-semibold capitalize text-[#2C2C2C]">{center} Center</span>
                      <span className="font-sans text-xs text-[#9B9590]">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E8E4E0] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: colors[center] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Defiant Spirit Patterns */}
        {(r.defiant_spirit?.react_pattern_observed || r.defiant_spirit?.respond_glimpsed) && (
          <Card>
            <div className="flex flex-col gap-4">
              <Label>Defiant Spirit Patterns</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {r.defiant_spirit.react_pattern_observed && (
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#EFF6FF]">
                    <span className="font-sans text-xs font-semibold text-[#2563EB]">React Pattern</span>
                    <p className="font-sans text-sm text-[#2C2C2C] leading-relaxed">
                      {r.defiant_spirit.react_pattern_observed}
                    </p>
                  </div>
                )}
                {r.defiant_spirit.respond_glimpsed && (
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#EFF6F0]">
                    <span className="font-sans text-xs font-semibold text-[#7A9E7E]">Respond Pathway</span>
                    <p className="font-sans text-sm text-[#2C2C2C] leading-relaxed">
                      {r.defiant_spirit.respond_glimpsed}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* OYN Dimensions */}
        {oynEntries.length > 0 && (
          <Card>
            <div className="flex flex-col gap-5">
              <Label>OYN Dimensions</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {oynEntries.map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1.5 p-4 rounded-xl bg-[#FAF8F5]">
                    <span className="font-sans text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#2563EB]">
                      {OYN_LABELS[key] ?? key.toUpperCase()}
                    </span>
                    <p className="font-sans text-sm text-[#2C2C2C] leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Domain signals + Supervisor scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {r.domain_signals?.length > 0 && (
            <Card>
              <div className="flex flex-col gap-3">
                <Label>Domains Explored</Label>
                <div className="flex flex-wrap gap-2">
                  {r.domain_signals.map((d) => (
                    <span key={d} className="font-sans text-xs text-[#7A9E7E] bg-[#7A9E7E]/10 rounded-full px-3 py-1">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {r.supervisor_scores?.length > 0 && (
            <Card>
              <div className="flex flex-col gap-3">
                <Label>Supervisor Scores (per turn)</Label>
                <div className="flex items-end gap-1 h-12">
                  {r.supervisor_scores.map((s: number, i: number) => {
                    const h = Math.max(4, Math.round((s / 10) * 40));
                    const color = s >= 7 ? '#7A9E7E' : s >= 4 ? '#D4A94A' : '#C06060';
                    return (
                      <div
                        key={i}
                        title={`Turn ${i + 1}: ${s}/10`}
                        className="flex-1 rounded-sm"
                        style={{ height: `${h}px`, backgroundColor: color }}
                      />
                    );
                  })}
                </div>
                {supervisorAvg !== null && (
                  <span className="font-sans text-xs text-[#9B9590]">
                    Average: {supervisorAvg.toFixed(1)}/10 across {r.supervisor_scores.length} turns
                  </span>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Question usefulness */}
        {e?.question_usefulness != null && e.question_usefulness.length > 0 && (
          <Card>
            <div className="flex flex-col gap-4">
              <Label>Question Usefulness ({e.question_usefulness.filter((q) => q.was_useful).length}/{e.question_usefulness.length} useful)</Label>
              <div className="flex flex-col gap-2">
                {e.question_usefulness.map((q, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-xl ${q.was_useful ? 'bg-[#EFF6F0]' : 'bg-[#EFF6FF]'}`}>
                    <span className={`flex-shrink-0 text-sm mt-0.5 ${q.was_useful ? 'text-[#7A9E7E]' : 'text-[#2563EB]'}`}>
                      {q.was_useful ? '✓' : '·'}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-sans text-xs text-[#2C2C2C] italic truncate">
                        "{q.question_text_fragment}…"
                      </span>
                      <span className="font-sans text-[0.68rem] text-[#9B9590]">{q.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-1 pb-4">
          <Link href="/admin" className="font-sans text-xs text-[#9B9590] hover:text-[#6B6B6B] transition-colors">
            ← Back to dashboard
          </Link>
          <span className="font-sans text-xs text-[#9B9590] font-mono">{sessionId}</span>
        </div>

      </div>
    </div>
  );
}
