'use client';

import { useState } from 'react';
import { ENERGIZING_POINTS, RESOLUTION_POINTS, TYPE_NAMES, CENTER_MAP, getWingTypes } from '@/lib/enneagram-lines';
import { getCelebritiesByType } from '@/lib/celebrity-data';
import AnimatedBar from '@/components/ui/AnimatedBar';
import SouloOrb from '@/components/ui/soulo-orb';

interface ResultsDashboardProps {
  results: Record<string, unknown>;
  sessionId: string | null;
}

// ── Collapsible Section Card ──
function DashCard({
  id,
  title,
  preview,
  children,
  open,
  onToggle,
  className = '',
}: {
  id: string;
  title: string;
  preview: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div
      id={`db-${id}`}
      className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden scroll-mt-16 transition-all duration-300 ${className}`}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 bg-transparent border-none cursor-pointer text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] flex-shrink-0">{title}</p>
          {!open && <div className="min-w-0">{preview}</div>}
        </div>
        <span
          className="text-[#9B9590] text-sm flex-shrink-0 ml-3 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#9662;
        </span>
      </button>
      {/* Expanded content */}
      <div
        className="overflow-hidden transition-all duration-400 ease-in-out"
        style={{ maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="px-6 pb-6 pt-0">{children}</div>
      </div>
    </div>
  );
}

export default function ResultsDashboard({ results: r, sessionId }: ResultsDashboardProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [exploreTab, setExploreTab] = useState<'famous' | 'relationships' | 'systems'>('famous');
  const [openCelebCard, setOpenCelebCard] = useState<number | null>(null);

  // Safety: ensure any value from results is a string before rendering
  const str = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
  };

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Extract all data ──
  const leadingType = (r.leading_type || r.core_type) as number || 0;
  const typeName = TYPE_NAMES[leadingType] || '';
  const dsName = str(r.defiant_spirit_type_name);
  const confidencePct = Math.round(((r.confidence as number) ?? 0) * 100);
  const wingSignals = (r.wing_signals as { left: number; right: number }) ?? { left: 0, right: 0 };
  const variantSignals = (r.variant_signals as Record<string, number>) ?? {};
  const wholeType = str(r.tritype);
  const wholeTypeConfidence = (r.tritype_confidence as number) ?? 0;
  const wholeTypeArchetype = str(r.tritype_archetype);
  const rawSp = str(r.superpower) || str(r.superpower_description);
  const rawKr = str(r.kryptonite) || str(r.kryptonite_description);
  const negPat = /inner critic|second-guess|tension|impossible standard|never quiets|cannot trust|exhausts|compuls|fear-driven|autopilot/i;
  const posPat = /self-awareness|intellectual honesty|integrity|trustworth|refusal to accept|depth|gift|conscious|chosen/i;
  const spNeg = negPat.test(rawSp) && !posPat.test(rawSp);
  const krPos = posPat.test(rawKr) && !negPat.test(rawKr);
  const swapped = spNeg && krPos;
  const superpower = swapped ? rawKr : rawSp;
  const kryptonite = swapped ? rawSp : rawKr;

  // defiant_spirit can be an object {react_pattern_observed, respond_glimpsed} or react/respond can be separate fields
  const ds = (typeof r.defiant_spirit === 'object' && r.defiant_spirit !== null) ? (r.defiant_spirit as Record<string, unknown>) : {};
  const reactPattern = str(r.react_pattern) || str(r.react_pattern_react) || str(ds.react_pattern_observed) || str(ds.react) || '';
  const respondPathway = str(r.respond_pathway) || str(r.respond_pathway_respond) || str(ds.respond_glimpsed) || str(ds.respond) || '';
  const typeScoresObj = (r.type_scores as Record<string, number>) ?? {};
  const sortedScores = Object.entries(typeScoresObj).sort(([, a], [, b]) => b - a);
  const oynDataRaw = (r.oyn_summary ?? r.oyn_dimensions ?? {}) as Record<string, unknown>;
  const oynEntries = Object.entries(oynDataRaw).filter(([, v]) => typeof v === 'string' && (v as string).trim()).map(([k, v]) => [k, v as string] as [string, string]);
  const wholeSigs = (r.whole_type_signals as Record<string, number>) ?? {};
  const energizingType = ENERGIZING_POINTS[leadingType] || 0;
  const resolutionType = RESOLUTION_POINTS[leadingType] || 0;
  const wingAdj = getWingTypes(leadingType);
  const dominantWing = (wingSignals.left ?? 0) > (wingSignals.right ?? 0) ? wingAdj[0] : wingAdj[1];
  const variantEntries = Object.entries(variantSignals).sort(([, a], [, b]) => b - a);
  const dominantVariant = variantEntries[0]?.[0] ?? '—';
  const wholeTypeDigits = wholeType.replace(/\D/g, '').split('').map(Number);
  const centerColors: Record<string, { bg: string; text: string; label: string }> = {
    Body: { bg: '#FEF3C7', text: '#92400E', label: 'Body' },
    Heart: { bg: '#FCE7F3', text: '#9D174D', label: 'Heart' },
    Head: { bg: '#DBEAFE', text: '#1E40AF', label: 'Head' },
  };
  const domainInsights: Array<{ domain: string; react: string; respond: string }> = (() => {
    const raw = r.domain_insights;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw as Record<string, { react?: string; respond?: string } | string>)
        .filter(([, v]) => {
          if (typeof v === 'string') return v.trim().length > 0;
          if (typeof v === 'object' && v) return ((v.react?.trim() || '') + (v.respond?.trim() || '')).length > 0;
          return false;
        })
        .map(([domain, v]) => ({
          domain: domain.charAt(0).toUpperCase() + domain.slice(1),
          react: typeof v === 'string' ? v : (v.react || ''),
          respond: typeof v === 'string' ? '' : (v.respond || ''),
        }));
    }
    return [];
  })();

  // Enneagram geometry helper
  const CIRCLE = [9,1,2,3,4,5,6,7,8];
  function gp(t: number) {
    const i = CIRCLE.indexOf(t);
    if (i === -1) return { x: 50, y: 50 };
    const a = (i * 40 * Math.PI) / 180;
    return { x: 50 + 38 * Math.sin(a), y: 50 - 38 * Math.cos(a) };
  }

  // Celebrity data
  const apiExamples = Array.isArray(r.famous_examples)
    ? (r.famous_examples as Array<{ name?: string; profession?: string; type_evidence?: string; what_you_share?: string; photo_url?: string; source_note?: string }>)
      .map(ex => ({
        name: (ex.name as string) || '', profession: (ex.profession as string) || '',
        hook: (ex.what_you_share as string) || '', description: (ex.type_evidence as string) || '',
        photoUrl: (ex.photo_url as string) || '', source: (ex.source_note as string) || 'Community observation', type: leadingType,
      }))
    : [];
  const curatedFallback = getCelebritiesByType(leadingType);
  const apiNames = new Set(apiExamples.map(c => c.name.toLowerCase()));
  const padding = curatedFallback.filter(c => !apiNames.has(c.name.toLowerCase()));
  const allCelebrities = [...apiExamples, ...padding].slice(0, 6);

  const navItems = [
    { id: 'scores', label: 'Scores' }, { id: 'powers', label: 'Powers' },
    { id: 'wing', label: 'Wing' }, { id: 'tritype', label: 'Whole Type' },
    { id: 'spirit', label: 'Spirit' }, { id: 'lines', label: 'Lines' },
    { id: 'domains', label: 'Domains' }, { id: 'oyn', label: 'OYN' },
    { id: 'explore', label: 'Explore' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-[960px] mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ═══ TYPE HERO ═══ */}
        <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] rounded-2xl p-8 text-white">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                <span className="font-serif text-[2.5rem] font-bold text-white leading-none">{leadingType}</span>
              </div>
              <div>
                <h1 className="font-serif text-[1.8rem] font-bold text-white leading-tight">{typeName}</h1>
                {dsName && <p className="font-sans text-[0.85rem] text-[#7A9E7E] mt-0.5">{dsName}</p>}
                <p className="font-sans text-[0.75rem] text-white/50 mt-0.5">{CENTER_MAP[leadingType]} Center</p>
              </div>
            </div>
            <div className="ml-auto flex gap-6 flex-wrap">
              {[
                { label: 'Confidence', value: `${confidencePct}%` },
                { label: 'Wing', value: `${leadingType}w${dominantWing}` },
                { label: 'Variant', value: dominantVariant },
                { label: 'Whole Type', value: wholeType },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <span className="font-sans text-[0.55rem] uppercase tracking-widest text-white/40 block">{m.label}</span>
                  <span className="font-serif text-xl font-bold text-white">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ STICKY NAV ═══ */}
        <div className="sticky top-0 z-20 bg-[#FAF8F5]/95 backdrop-blur-sm py-2 rounded-xl">
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {navItems.map(item => (
              <a key={item.id} href={`#db-${item.id}`}
                className="flex-shrink-0 font-sans text-[0.7rem] font-semibold px-3 py-1.5 rounded-full bg-white border border-[#E0DAD4] text-[#6B6B6B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all whitespace-nowrap"
              >{item.label}</a>
            ))}
          </div>
        </div>

        {/* ═══ ALWAYS EXPANDED: Type Scores ═══ */}
        {sortedScores.length > 0 && (
          <div id="db-scores" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
            <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-4">Type Scores</p>
            <div className="flex flex-col gap-2.5">
              {sortedScores.map(([type, score], idx) => {
                const pct = Math.min(100, Math.round(score * 100));
                const isLead = Number(type) === leadingType;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`font-sans text-sm w-16 ${isLead ? 'font-bold text-[#2563EB]' : 'text-[#6B6B6B]'}`}>Type {type}</span>
                    <AnimatedBar percent={pct} color={isLead ? '#2563EB' : '#93C5FD'} delay={200 + idx * 80} numberClassName={isLead ? 'font-bold text-[#2563EB]' : 'text-[#9B9590]'} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ ALWAYS EXPANDED: Superpower & Kryptonite ═══ */}
        <div id="db-powers" className="grid grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-16">
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Your Superpower</p>
            <p className="font-serif text-[0.95rem] text-[#2C2C2C] leading-[1.8]">
              {superpower || `The gift of ${typeName} — the energy that drives your greatest capacity when you choose it consciously.`}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Your Kryptonite</p>
            <p className="font-serif text-[0.95rem] text-[#2C2C2C] leading-[1.8]">
              {kryptonite || `The same energy as your superpower — but unconscious, fear-driven. The wound and the gift are one force.`}
            </p>
          </div>
        </div>

        {/* ═══ COLLAPSIBLE: Wing & Variants ═══ */}
        <DashCard
          id="wing" title="Wing & Variants" open={openSections.has('wing')} onToggle={() => toggle('wing')}
          preview={
            <div className="flex items-center gap-4">
              <span className="font-serif text-lg font-bold text-[#2C2C2C]">{leadingType}w{dominantWing}</span>
              <span className="font-sans text-xs text-[#9B9590]">Variant: {dominantVariant}</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-sans text-xs font-semibold text-[#6B6B6B] mb-2">Wing Strength</p>
              {[{ label: `Type ${wingAdj[0]}`, val: wingSignals.left ?? 0 }, { label: `Type ${wingAdj[1]}`, val: wingSignals.right ?? 0 }].map((w, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="font-sans text-xs text-[#6B6B6B] w-16">{w.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.round(w.val * 100)}%` }} /></div>
                  <span className="font-sans text-xs text-[#9B9590] w-8 text-right">{Math.round(w.val * 100)}%</span>
                </div>
              ))}
            </div>
            <div>
              <p className="font-sans text-xs font-semibold text-[#6B6B6B] mb-2">Instinctual Variants</p>
              {variantEntries.map(([vk, vv]) => (
                <div key={vk} className="flex items-center gap-2 mb-1.5">
                  <span className="font-sans text-xs font-semibold w-8 text-[#6B6B6B]">{vk}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden"><div className="h-full rounded-full bg-[#7A9E7E]" style={{ width: `${Math.round(vv * 100)}%` }} /></div>
                  <span className="font-sans text-xs text-[#9B9590] w-8 text-right">{Math.round(vv * 100)}%</span>
                </div>
              ))}
            </div>
            {(wholeSigs.body || wholeSigs.heart || wholeSigs.head) && (
              <div>
                <p className="font-sans text-xs font-semibold text-[#6B6B6B] mb-2">Center Activation</p>
                {(['body', 'heart', 'head'] as const).map(c => {
                  const pct = Math.round((wholeSigs[c] ?? 0) * 100);
                  const clrs: Record<string, string> = { body: '#2563EB', heart: '#60A5FA', head: '#7A9E7E' };
                  return (
                    <div key={c} className="flex items-center gap-2 mb-1.5">
                      <span className="font-sans text-xs font-semibold capitalize w-12 text-[#2C2C2C]">{c}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: clrs[c] }} /></div>
                      <span className="font-sans text-xs text-[#9B9590] w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashCard>

        {/* ═══ COLLAPSIBLE: Whole Type ═══ */}
        <DashCard
          id="tritype" title="Whole Type" open={openSections.has('tritype')} onToggle={() => toggle('tritype')}
          preview={
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-bold text-[#2C2C2C]">{wholeTypeDigits.join(' – ')}</span>
              {wholeTypeDigits.map((d, i) => {
                const c = CENTER_MAP[d] || 'Body';
                const cc = centerColors[c] || centerColors.Body;
                return <span key={i} className="px-2 py-0.5 rounded-md text-[0.6rem] font-bold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>;
              })}
            </div>
          }
        >
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div>
              <p className="font-serif text-[2.5rem] font-bold text-[#2C2C2C] leading-none mb-2">{wholeTypeDigits.join(' – ')}</p>
              {wholeTypeConfidence > 0 && <p className="font-sans text-xs text-[#9B9590]">{Math.round(wholeTypeConfidence * 100)}% confidence</p>}
              {wholeTypeArchetype && (
                <div className="bg-[#FAF8F5] rounded-lg px-3 py-2 mt-3 inline-block">
                  <span className="font-sans text-[0.7rem] text-[#9B9590]">Archetype: </span>
                  <span className="font-sans text-sm font-semibold text-[#2C2C2C]">{wholeTypeArchetype}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 flex-1">
              {wholeTypeDigits.map((digit, i) => {
                const center = CENTER_MAP[digit] || 'Body';
                const cc = centerColors[center] || centerColors.Body;
                return (
                  <div key={i} className="rounded-xl p-5 text-center" style={{ background: cc.bg }}>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] mb-2" style={{ color: cc.text }}>{cc.label}</p>
                    <p className="font-serif text-[2rem] font-bold" style={{ color: cc.text }}>{digit}</p>
                    <p className="font-sans text-[0.7rem] mt-1" style={{ color: cc.text, opacity: 0.7 }}>{TYPE_NAMES[digit] || ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </DashCard>

        {/* ═══ COLLAPSIBLE: Defiant Spirit Patterns ═══ */}
        {(reactPattern || respondPathway) && (
          <DashCard
            id="spirit" title="Defiant Spirit Patterns" open={openSections.has('spirit')} onToggle={() => toggle('spirit')}
            preview={<span className="font-sans text-xs text-[#6B6B6B]">React &amp; Respond patterns</span>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reactPattern && (
                <div className="p-5 rounded-xl bg-[#FEF2F2] border-l-4 border-[#DC2626]">
                  <span className="font-sans text-sm font-semibold text-[#DC2626] block mb-2">React Pattern</span>
                  <p className="font-sans text-[0.88rem] text-[#2C2C2C] leading-[1.7]">{reactPattern}</p>
                </div>
              )}
              {respondPathway && (
                <div className="p-5 rounded-xl bg-[#EFF6FF] border-l-4 border-[#2563EB]">
                  <span className="font-sans text-sm font-semibold text-[#2563EB] block mb-2">Respond Pathway</span>
                  <p className="font-sans text-[0.88rem] text-[#2C2C2C] leading-[1.7]">{respondPathway}</p>
                </div>
              )}
            </div>
          </DashCard>
        )}

        {/* ═══ COLLAPSIBLE: Lines of Movement ═══ */}
        <DashCard
          id="lines" title="Lines of Movement" open={openSections.has('lines')} onToggle={() => toggle('lines')}
          preview={
            <div className="flex items-center gap-3">
              <span className="font-sans text-xs text-[#DC2626]">Energizing Point → {energizingType}</span>
              <span className="font-sans text-xs text-[#2563EB]">Resolution Point → {resolutionType}</span>
            </div>
          }
        >
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <svg viewBox="0 0 100 100" width={180} height={180} style={{ overflow: 'visible', flexShrink: 0 }}>
              <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E4E0" strokeWidth="0.5" />
              {[[1,4],[4,2],[2,8],[8,5],[5,7],[7,1],[3,6],[6,9],[9,3]].map(([a,b]) => {
                const pa = gp(a); const pb = gp(b);
                return <line key={`l-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#E8E4E0" strokeWidth="0.3" />;
              })}
              <line x1={gp(leadingType).x} y1={gp(leadingType).y} x2={gp(energizingType).x} y2={gp(energizingType).y} stroke="#DC2626" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
              <line x1={gp(leadingType).x} y1={gp(leadingType).y} x2={gp(resolutionType).x} y2={gp(resolutionType).y} stroke="#2563EB" strokeWidth="1.2" opacity="0.7" />
              {CIRCLE.map(t => {
                const p = gp(t); const isCore = t === leadingType; const isEnergizing = t === energizingType; const isResolution = t === resolutionType;
                const color = isCore ? '#2563EB' : isEnergizing ? '#DC2626' : isResolution ? '#2563EB' : '#9B9590';
                return (<g key={`p-${t}`}><circle cx={p.x} cy={p.y} r={isCore ? 4.5 : (isEnergizing || isResolution) ? 3 : 2} fill={color} opacity={isCore ? 1 : 0.7} /><text x={p.x} y={p.y < 20 ? p.y - 6 : p.y > 75 ? p.y + 9 : p.y} dx={p.x > 70 ? 6 : p.x < 30 ? -6 : 0} textAnchor="middle" fill={color} fontSize="4" fontFamily="serif" fontWeight={isCore ? 'bold' : 'normal'}>{t}</text></g>);
              })}
            </svg>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="p-4 rounded-xl bg-[#FEF2F2] border-l-4 border-[#DC2626]">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#DC2626]">Energizing Point → {energizingType}</span>
                <p className="font-sans text-sm font-semibold text-[#2C2C2C] mt-1">{TYPE_NAMES[energizingType]}</p>
                <p className="font-sans text-xs text-[#6B6B6B] mt-2 leading-relaxed">{str(r.stress_line_description) || `Under pressure, your energy moves toward ${TYPE_NAMES[energizingType]} patterns.`}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#EFF6FF] border-l-4 border-[#2563EB]">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[#2563EB]">Resolution Point → {resolutionType}</span>
                <p className="font-sans text-sm font-semibold text-[#2C2C2C] mt-1">{TYPE_NAMES[resolutionType]}</p>
                <p className="font-sans text-xs text-[#6B6B6B] mt-2 leading-relaxed">{str(r.release_line_description) || `In growth, you access ${TYPE_NAMES[resolutionType]} qualities.`}</p>
              </div>
            </div>
          </div>
        </DashCard>

        {/* ═══ COLLAPSIBLE: Domain Insights ═══ */}
        <DashCard
          id="domains" title="Domain Insights" open={openSections.has('domains')} onToggle={() => toggle('domains')}
          preview={<span className="font-sans text-xs text-[#6B6B6B]">{domainInsights.length} domains explored</span>}
        >
          {domainInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {domainInsights.map((di, i) => (
                <div key={i} className="bg-[#FAF8F5] rounded-xl p-4">
                  <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#2563EB] mb-3">{di.domain}</p>
                  {di.react && (
                    <div className="mb-2">
                      <p className="font-sans text-[0.55rem] uppercase tracking-widest text-[#DC2626] mb-1">React</p>
                      <p className="font-sans text-[0.82rem] text-[#2C2C2C] leading-relaxed">{di.react}</p>
                    </div>
                  )}
                  {di.respond && (
                    <div>
                      <p className="font-sans text-[0.55rem] uppercase tracking-widest text-[#2563EB] mb-1">Respond</p>
                      <p className="font-sans text-[0.82rem] text-[#2C2C2C] leading-relaxed">{di.respond}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-sm text-[#9B9590]">Domain insights develop with a deeper assessment conversation.</p>
          )}
        </DashCard>

        {/* ═══ COLLAPSIBLE: OYN Dimensions ═══ */}
        {oynEntries.length > 0 && (
          <DashCard
            id="oyn" title="OYN Dimensions" open={openSections.has('oyn')} onToggle={() => toggle('oyn')}
            preview={<span className="font-sans text-xs text-[#6B6B6B]">{oynEntries.length} dimensions mapped</span>}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {oynEntries.map(([key, value]) => (
                <div key={key} className="p-4 rounded-xl bg-[#FAF8F5]">
                  <span className="font-sans text-[0.6rem] font-bold uppercase tracking-widest text-[#2563EB]">{key.toUpperCase()}</span>
                  <p className="font-sans text-[0.85rem] text-[#2C2C2C] leading-[1.7] mt-2">{value}</p>
                </div>
              ))}
            </div>
          </DashCard>
        )}

        {/* ═══ EXPLORE YOUR TYPE — always visible ═══ */}
        <div id="db-explore" className="scroll-mt-16">
          <div className="bg-gradient-to-b from-[#F0F4FF] to-[#FAF8F5] rounded-t-2xl px-6 pt-8 pb-4 text-center">
            <p className="font-mono text-[0.65rem] text-[#2563EB] uppercase tracking-[0.12em] mb-2">Discovery</p>
            <h2 className="font-serif text-[1.6rem] font-bold text-[#2C2C2C] mb-1">Explore Your Type</h2>
            <p className="font-sans text-[0.88rem] text-[#6B6B6B] max-w-md mx-auto">Go deeper into how your pattern shows up in the world.</p>
            <div className="flex justify-center gap-2 mt-5">
              {([
                { id: 'famous' as const, label: 'Famous Figures', ready: true },
                { id: 'relationships' as const, label: 'Relationships', ready: false },
                { id: 'systems' as const, label: 'Other Systems', ready: false },
              ]).map(tab => (
                <button key={tab.id} onClick={() => tab.ready && setExploreTab(tab.id)}
                  className={`font-sans text-[0.75rem] font-semibold px-4 py-2 rounded-full transition-all ${
                    exploreTab === tab.id ? 'bg-[#2563EB] text-white' : tab.ready ? 'bg-white text-[#6B6B6B] border border-[#E0DAD4] hover:border-[#2563EB] cursor-pointer' : 'bg-[#F5F3F0] text-[#B8B2AC] border border-[#E8E4E0] cursor-default'
                  }`}
                >
                  {tab.label}{!tab.ready && <span className="ml-1 text-[0.55rem] uppercase opacity-70">Soon</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#FAF8F5] rounded-b-2xl px-4 pb-6 pt-4">
            {exploreTab === 'famous' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allCelebrities.map((celeb, i) => {
                  const isOpen = openCelebCard === i;
                  const hasPhoto = celeb.photoUrl && celeb.photoUrl.length > 10;
                  return (
                    <div key={celeb.name || i} className="rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300 cursor-pointer"
                      style={{ boxShadow: isOpen ? '0 8px 28px rgba(0,0,0,0.14)' : '0 1px 8px rgba(0,0,0,0.06)' }}
                      onClick={() => setOpenCelebCard(isOpen ? null : i)}
                    >
                      <div className="relative" style={{ aspectRatio: '4/5' }}>
                        {hasPhoto ? <img src={celeb.photoUrl} alt={celeb.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                        : <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/20 to-[#60A5FA]/10 flex items-center justify-center"><span className="font-serif font-bold text-[2.5rem] text-[#2563EB]/40">{celeb.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="font-serif font-bold text-white text-[0.9rem] leading-tight drop-shadow-md">{celeb.name}</p>
                          <p className="font-sans text-[0.6rem] text-white/75 mt-0.5 uppercase tracking-wide">{celeb.profession}</p>
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <p className="font-serif italic text-[0.75rem] text-[#4B5563] leading-snug">{celeb.hook}</p>
                        <p className="font-sans text-[0.65rem] text-[#2563EB] mt-1 flex items-center gap-1">{isOpen ? 'Close' : 'Learn more'} <span className="text-[0.55rem]">{isOpen ? '\u2191' : '\u2193'}</span></p>
                      </div>
                      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isOpen ? 400 : 0 }}>
                        <div className="px-3 pb-3 border-t border-[#E8E4E0]">
                          <p className="font-mono text-[0.55rem] text-[#2563EB] uppercase tracking-widest mt-2 mb-1">{TYPE_NAMES[leadingType]} Pattern</p>
                          <p className="font-sans text-[0.8rem] text-[#2C2C2C] leading-[1.7]">{celeb.description}</p>
                          <p className="font-sans text-[0.55rem] text-[#9B9590] italic mt-2">{celeb.source}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {exploreTab === 'relationships' && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4"><span className="text-2xl">&#10084;</span></div>
                <p className="font-serif text-[1.1rem] font-semibold text-[#2C2C2C] mb-2">Relationships</p>
                <p className="font-sans text-[0.88rem] text-[#6B6B6B] max-w-sm">Coming soon — how your type connects in love, family, and friendship.</p>
              </div>
            )}
            {exploreTab === 'systems' && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4"><span className="text-2xl">&#9878;</span></div>
                <p className="font-serif text-[1.1rem] font-semibold text-[#2C2C2C] mb-2">Other Systems</p>
                <p className="font-sans text-[0.88rem] text-[#6B6B6B] max-w-sm">Coming soon — MBTI, Big Five, and more. Same you, different maps.</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CLOSING ═══ */}
        <div className="rounded-2xl p-8 text-center" style={{ background: '#1E293B' }}>
          <p className="font-serif italic text-[1.1rem] text-[#FAF8F5] leading-[1.8] mb-4">
            {str(r.closing_message) || str(r.closing_charge) || 'You are not a number. You are a defiant spirit.'}
          </p>
          <p className="font-sans text-xs text-[#9B9590]">You are not a number. You are a defiant spirit.</p>
        </div>
      </div>
    </div>
  );
}
