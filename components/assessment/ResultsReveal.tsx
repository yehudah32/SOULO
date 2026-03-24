'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ShareCard from './ShareCard';
import RelationshipWheel from './RelationshipWheel';
import SouloChat from './SouloChat';
import SouloOrb from './SouloOrb';
import { STRESS_LINES, RELEASE_LINES, TYPE_NAMES, CENTER_MAP, getWingTypes, getLowestType } from '@/lib/enneagram-lines';
import { getCelebritiesByType } from '@/lib/celebrity-data';
import TypewriterText from '@/components/ui/TypewriterText';
import AnimatedBar from '@/components/ui/AnimatedBar';
import ScrollReveal from '@/components/ui/ScrollReveal';
import MarkdownText from '@/components/ui/MarkdownText';
import type { PersonalitySystemsOutput } from '@/lib/personality-analyzer';
import type { ConfidenceLevel } from '@/lib/personality-correlations';

interface ResultsRevealProps {
  results: Record<string, unknown>;
  sessionId: string;
  onComplete?: () => void;
}

// Type-specific color palettes — shared across hero card and sendoff
const TYPE_ESSENCE: Record<number, { colors: string[]; label: string; shapes: string }> = {
  1: { colors: ['#1E3A5F', '#2563EB', '#DBEAFE'], label: 'Order. Precision. Integrity.', shapes: 'lines' },
  2: { colors: ['#5B2333', '#E11D48', '#FECDD3'], label: 'Connection. Warmth. Heart.', shapes: 'circles' },
  3: { colors: ['#78350F', '#D97706', '#FEF3C7'], label: 'Drive. Mastery. Becoming.', shapes: 'rising' },
  4: { colors: ['#312E81', '#7C3AED', '#DDD6FE'], label: 'Depth. Authenticity. Beauty.', shapes: 'waves' },
  5: { colors: ['#0C4A6E', '#0891B2', '#CFFAFE'], label: 'Insight. Clarity. Knowledge.', shapes: 'constellation' },
  6: { colors: ['#3F3F46', '#6B7280', '#E5E7EB'], label: 'Loyalty. Courage. Ground.', shapes: 'hexagons' },
  7: { colors: ['#7C2D12', '#EA580C', '#FFEDD5'], label: 'Joy. Freedom. Possibility.', shapes: 'particles' },
  8: { colors: ['#450A0A', '#DC2626', '#FECACA'], label: 'Power. Truth. Protection.', shapes: 'angular' },
  9: { colors: ['#064E3B', '#059669', '#D1FAE5'], label: 'Peace. Presence. Wholeness.', shapes: 'flow' },
};

function parseCenters(tritype: string): string[] {
  const centers: string[] = [];
  const digits = tritype.replace(/\D/g, '').split('').map(Number);
  for (const d of digits) {
    if ([8, 9, 1].includes(d)) centers.push('Body');
    else if ([2, 3, 4].includes(d)) centers.push('Heart');
    else if ([5, 6, 7].includes(d)) centers.push('Head');
  }
  return [...new Set(centers)];
}

function ScrollIndicator() {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const scrollEl = document.querySelector('[data-results-scroll]') as HTMLElement;
    if (!scrollEl) return;

    function check() {
      if (!scrollEl) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      setShowScroll(scrollHeight - scrollTop - clientHeight > 120);
    }

    check();
    scrollEl.addEventListener('scroll', check, { passive: true });

    return () => {
      scrollEl.removeEventListener('scroll', check);
    };
  }, []);

  if (!showScroll) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <style>{`
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(6px); opacity: 0.9; }
        }
      `}</style>
      <div style={{ animation: 'scroll-bounce 1.5s ease-in-out infinite' }}>
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
          <path d="M2 2L12 12L22 2" stroke="#9B9590" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function SectionFade({ children, sectionIndex, activeSection }: {
  children: React.ReactNode;
  sectionIndex: number;
  activeSection: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sectionIndex !== activeSection) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [sectionIndex, activeSection]);

  if (sectionIndex !== activeSection) return null;

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}
    >
      <style>{`
        @keyframes sr-card { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .sr-card { animation: sr-card 0.5s ease-out forwards; opacity:0; }
        @keyframes domain-pulse { 0%,100% { transform:scale(1); opacity:.8; } 50% { transform:scale(1.08); opacity:1; } }
        @keyframes domain-glow-red { 0%,100% { box-shadow:0 0 20px rgba(220,38,38,.08); } 50% { box-shadow:0 0 30px rgba(220,38,38,.15); } }
        @keyframes domain-glow-blue { 0%,100% { box-shadow:0 0 20px rgba(37,99,235,.08); } 50% { box-shadow:0 0 30px rgba(37,99,235,.15); } }
        @keyframes mode-slide { from { opacity:0; transform:translateX(8px); } to { opacity:1; transform:translateX(0); } }
        .domain-active-pulse { animation: domain-pulse 2.5s ease-in-out infinite; }
        .domain-glow-react { animation: domain-glow-red 3s ease-in-out infinite; }
        .domain-glow-respond { animation: domain-glow-blue 3s ease-in-out infinite; }
        .mode-content { animation: mode-slide 0.3s ease-out forwards; }
      `}</style>
      {children}
    </div>
  );
}

export default function ResultsReveal({ results: initialResults, sessionId, onComplete }: ResultsRevealProps) {
  const router = useRouter();
  const [r, setR] = useState<Record<string, unknown>>(initialResults);
  const [section, setSection] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const shareOffscreenRef = useRef<HTMLDivElement>(null);
  const [openCelebCard, setOpenCelebCard] = useState<number | null>(null);
  const [exploreTab, setExploreTab] = useState<'famous' | 'relationships' | 'systems'>('famous');
  const [hoveredRelType, setHoveredRelType] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chatSection, setChatSection] = useState<string>('General');

  // Domain Insights interactive state
  const [activeDomain, setActiveDomain] = useState<number | null>(null);
  const [domainMode, setDomainMode] = useState<'react' | 'respond'>('react');
  const [domainCompareAll, setDomainCompareAll] = useState(false);

  // Personality Systems state
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const [systemsRevealed, setSystemsRevealed] = useState(false);

  // Check if key content is missing (failed generation)
  const contentMissing = !(r.superpower as string)?.trim() && !(r.core_type_description as string)?.trim();
  const autoRegenRef = useRef(false);

  // Auto-regenerate once if content is missing
  useEffect(() => {
    if (contentMissing && sessionId && !autoRegenRef.current && !isRegenerating) {
      autoRegenRef.current = true;
      console.log('[ResultsReveal] Content missing — auto-regenerating...');
      handleRegenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentMissing, sessionId]);

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      console.log('[ResultsReveal] Regenerating results for session:', sessionId);
      const res = await fetch('/api/results/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, forceRegenerate: true }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[ResultsReveal] Regeneration response:', Object.keys(data.results || {}));
        if (data.results) {
          setR(data.results);
        }
      } else {
        const errText = await res.text();
        console.error('[ResultsReveal] Regeneration failed:', res.status, errText);
      }
    } catch (err) {
      console.error('[ResultsReveal] Regeneration error:', err);
    } finally {
      setIsRegenerating(false);
    }
  }

  const totalSections = 12;

  const advance = () => {
    if (section < totalSections - 1) {
      setSection((s) => s + 1);
      if (onComplete && section === totalSections - 2) onComplete();
    }
  };

  // Lock body scroll — results uses its own internal scroll container
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = 'hidden';
    body.style.height = '100dvh';
    html.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
      html.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Scroll to top whenever section changes
  useEffect(() => {
    const el = document.querySelector('[data-results-scroll]');
    if (el) el.scrollTop = 0;
  }, [section]);

  const sendEmail = async () => {
    if (!emailInput.trim() || !sessionId) return;
    setEmailStatus('sending');
    try {
      const res = await fetch('/api/results/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: emailInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus('sent');
      } else {
        setEmailStatus(data.reason === 'email_not_configured' ? 'idle' : 'error');
        if (data.reason === 'email_not_configured') {
          console.info('[ResultsReveal] Email not configured — skipping');
        }
      }
    } catch {
      setEmailStatus('error');
    }
  };

  const leadingType = r.leading_type as number;
  const typeName = (r.type_name as string) ?? `Type ${leadingType}`;
  const dsName = (r.defiant_spirit_type_name as string) ?? '';
  const confidencePct = r.confidence_pct as number;
  const wing = (r.wing as string) ?? '';
  const variant = (r.instinctual_variant as string) ?? '';
  const tritype = (r.tritype as string) ?? '';
  const tritypeArchetype = (r.tritype_archetype as string) ?? '';
  const tritypeConfidence = (r.tritype_confidence as number) ?? 0;
  const headline = (r.headline as string) ?? '';
  // Detect if superpower/kryptonite are swapped — if "superpower" contains
  // negative language (inner critic, tension, impossible standard) it's actually
  // the kryptonite and vice versa. Fix on the client side.
  const rawSuperpower = (r.superpower as string) ?? '';
  const rawKryptonite = (r.kryptonite as string) ?? '';
  const negativePatterns = /inner critic|second-guess|tension|impossible standard|never quiets|cannot trust|exhausts|compuls|fear-driven|autopilot|won't let .* rest/i;
  const positivePatterns = /self-awareness|intellectual honesty|integrity|trustworth|refusal to accept|depth|gift|conscious|chosen|extraordinary/i;
  const superpowerLooksNegative = negativePatterns.test(rawSuperpower) && !positivePatterns.test(rawSuperpower);
  const kryptoniteLooksPositive = positivePatterns.test(rawKryptonite) && !negativePatterns.test(rawKryptonite);
  const isSwapped = superpowerLooksNegative && kryptoniteLooksPositive;
  const superpower = isSwapped ? rawKryptonite : rawSuperpower;
  const kryptonite = isSwapped ? rawSuperpower : rawKryptonite;
  if (isSwapped) console.log('[ResultsReveal] Detected swapped superpower/kryptonite — auto-corrected');
  const reactPattern = (r.react_pattern as string) ?? '';
  const respondPathway = (r.respond_pathway as string) ?? '';
  const defy = (r.defy_your_number as string) ?? '';
  const closing = (r.closing_charge as string) ?? 'Defy Your Number. Live Your Spirit.';
  const oynSummary = (r.oyn_summary as Record<string, string>) ?? {};
  const centerInsights = (r.center_insights as Record<string, string>) ?? {};
  // domain_insights can be array [{domain, insight}] or object {domain: {react, respond}}
  const rawDomainInsights = r.domain_insights;
  const domainInsights: Array<{ domain: string; react: string; respond: string }> = (() => {
    if (rawDomainInsights && typeof rawDomainInsights === 'object' && !Array.isArray(rawDomainInsights)) {
      return Object.entries(rawDomainInsights as Record<string, { react?: string; respond?: string } | string>)
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
    if (Array.isArray(rawDomainInsights)) {
      return rawDomainInsights
        .filter((d): d is { domain: string; insight?: string; react?: string; respond?: string } => d?.domain)
        .map(d => ({
          domain: d.domain,
          react: d.react || d.insight || '',
          respond: d.respond || '',
        }));
    }
    return [];
  })();
  const famousExamples = (r.famous_examples as string[]) ?? [];
  const famousDisclaimer = (r.famous_examples_disclaimer as string) ?? '';
  const variantSignals = (r.variant_signals as Record<string, number>) ?? {};
  const wingSignals = (r.wing_signals as Record<string, number>) ?? {};

  const tritypeCenters = parseCenters(tritype);
  const hasLowTritype =
    !tritype || tritypeConfidence < 0.65 || tritypeCenters.length === 0;

  const continueButton = null;

  const oynLabels: Record<string, string> = {
    who: 'WHO', what: 'WHAT', why: 'WHY', how: 'HOW', when: 'WHEN', where: 'WHERE',
  };

  // ── Personality Systems data ──
  const personalitySystems = r.personality_systems as PersonalitySystemsOutput | null | undefined;

  // ── Shared Explore Area — used in case 11 (standalone) and case 14 (embedded) ──
  const renderExploreArea = () => {
    const apiExamples = Array.isArray(r.famous_examples)
      ? (r.famous_examples as Array<{ name?: string; profession?: string; type_evidence?: string; what_you_share?: string; photo_url?: string; source_note?: string }>)
        .map(ex => ({
          name: (ex.name as string) || '',
          profession: (ex.profession as string) || '',
          hook: (ex.what_you_share as string) || '',
          description: (ex.type_evidence as string) || '',
          photoUrl: (ex.photo_url as string) || '',
          source: (ex.source_note as string) || 'Community observation',
          type: leadingType,
        }))
      : [];
    // Get curated celebrities for this type (8 per type in database)
    const curatedFallback = getCelebritiesByType(leadingType);
    // Merge: API-generated first (personalized), then curated padding. Dedupe by name.
    const apiNames = new Set(apiExamples.map(c => c.name.toLowerCase()));
    const padding = curatedFallback.filter(c => !apiNames.has(c.name.toLowerCase()));
    const allCelebrities = [...apiExamples, ...padding].slice(0, 6);

    const EXPLORE_TABS = [
      { id: 'famous' as const, label: 'Famous Figures', ready: true },
      { id: 'relationships' as const, label: 'Relationships', ready: false },
      { id: 'systems' as const, label: 'Other Systems', ready: true },
    ];

    return (
      <div className="flex flex-col gap-0 w-full">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#F0F4FF] to-[#FAF8F5] rounded-t-2xl px-6 pt-8 pb-4 text-center">
          <p className="font-mono text-[0.65rem] text-[#2563EB] uppercase tracking-[0.12em] mb-2">Discovery</p>
          <h2 className="font-serif text-[1.8rem] font-bold text-[#2C2C2C] mb-1">Explore Your Type</h2>
          <p className="font-sans text-[0.9rem] text-[#6B6B6B] leading-relaxed max-w-md mx-auto">
            Go deeper into how your pattern shows up in the world.
          </p>
          <div className="flex justify-center gap-2 mt-5">
            {EXPLORE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => tab.ready && setExploreTab(tab.id)}
                className={`relative font-sans text-[0.78rem] font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
                  exploreTab === tab.id
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : tab.ready
                    ? 'bg-white text-[#6B6B6B] border border-[#E0DAD4] hover:border-[#2563EB] cursor-pointer'
                    : 'bg-[#F5F3F0] text-[#B8B2AC] border border-[#E8E4E0] cursor-default'
                }`}
              >
                {tab.label}
                {!tab.ready && <span className="ml-1.5 text-[0.55rem] uppercase tracking-wider opacity-70">Soon</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#FAF8F5] rounded-b-2xl px-4 pb-6 pt-4">
          {exploreTab === 'famous' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allCelebrities.map((celeb, i) => {
                const isOpen = openCelebCard === i;
                const hasPhoto = celeb.photoUrl && celeb.photoUrl.length > 10;
                return (
                  <div
                    key={celeb.name || i}
                    className="rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300 cursor-pointer"
                    style={{ boxShadow: isOpen ? '0 8px 28px rgba(0,0,0,0.14)' : '0 1px 8px rgba(0,0,0,0.06)' }}
                    onClick={() => setOpenCelebCard(isOpen ? null : i)}
                  >
                    <div className="relative" style={{ aspectRatio: '4/5' }}>
                      {hasPhoto ? (
                        <img src={celeb.photoUrl} alt={celeb.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/20 to-[#60A5FA]/10 flex items-center justify-center">
                          <span className="font-serif font-bold text-[2.5rem] text-[#2563EB]/40">
                            {celeb.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="font-serif font-bold text-white text-[0.95rem] leading-tight drop-shadow-md">{celeb.name}</p>
                        <p className="font-sans text-[0.65rem] text-white/75 mt-0.5 uppercase tracking-wide">{celeb.profession}</p>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="font-serif italic text-[0.78rem] text-[#4B5563] leading-snug">{celeb.hook}</p>
                      <p className="font-sans text-[0.68rem] text-[#2563EB] mt-1.5 flex items-center gap-1">
                        {isOpen ? 'Close' : 'Learn more'} <span className="text-[0.6rem]">{isOpen ? '\u2191' : '\u2193'}</span>
                      </p>
                    </div>
                    <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: isOpen ? 400 : 0 }}>
                      <div className="px-3 pb-3 border-t border-[#E8E4E0]">
                        <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-widest mt-2.5 mb-1.5">{TYPE_NAMES[leadingType]} Pattern</p>
                        <p className="font-sans text-[0.82rem] text-[#2C2C2C] leading-[1.7]">{celeb.description}</p>
                        <p className="font-sans text-[0.6rem] text-[#9B9590] italic mt-2">{celeb.source}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {exploreTab === 'relationships' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4"><span className="text-2xl">&#10084;</span></div>
              <p className="font-serif text-[1.1rem] font-semibold text-[#2C2C2C] mb-2">Relationships</p>
              <p className="font-sans text-[0.88rem] text-[#6B6B6B] max-w-sm leading-relaxed">Coming soon — how your type connects in love, family, and friendship. What you bring, what you need, and where growth lives.</p>
            </div>
          )}
          {exploreTab === 'systems' && (() => {
            const ps = personalitySystems;

            // ── Null state ──
            if (!ps) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4"><span className="text-2xl">&#9878;</span></div>
                  <p className="font-serif text-[1.1rem] font-semibold text-[#2C2C2C] mb-2">Other Personality Systems</p>
                  <p className="font-sans text-[0.88rem] text-[#6B6B6B] max-w-sm leading-relaxed">Coming soon — see your type through the lens of MBTI, Big Five, and other frameworks. Same you, different maps.</p>
                </div>
              );
            }

            // ── Data prep ──
            const confPct: Record<string, number> = { high: 0.92, medium: 0.62, low: 0.32 };
            const scoreVal: Record<string, number> = { very_low: 0.12, low: 0.30, medium: 0.52, high: 0.76, very_high: 0.95 };
            const scoreLbl: Record<string, string> = { very_low: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' };
            const confLabel: Record<string, string> = { high: 'Research-backed', medium: 'Consensus-based', low: 'Exploratory' };

            const chips = [
              { key: 'mbti', color: '#2563EB', label: 'MBTI', icon: 'M', result: ps.mbti.primary, conf: confPct[ps.mbti.confidence] || 0.5 },
              { key: 'bigFive', color: '#7C3AED', label: 'Big Five', icon: 'O', result: 'OCEAN', conf: confPct[ps.bigFive.confidence] || 0.5 },
              { key: 'attachment', color: '#D97706', label: 'Attach.', icon: 'A', result: (ps.attachment.style || '').replace(/_/g, ' '), conf: confPct[ps.attachment.confidence] || 0.5 },
              { key: 'disc', color: '#DC2626', label: 'DISC', icon: 'D', result: ps.disc.profile || '—', conf: confPct[ps.disc.confidence] || 0.5 },
              { key: 'jungian', color: '#7A9E7E', label: 'Jungian', icon: 'J', result: ps.jungian.primaryArchetype, conf: confPct[ps.jungian.confidence] || 0.5 },
              { key: 'humanDesign', color: '#9CA3AF', label: 'HD', icon: 'H', result: ps.humanDesign.likelyType || '—', conf: 0.32 },
            ];

            // ── Radar chart math ──
            const B5 = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
            const B5L = ['O', 'C', 'E', 'A', 'N'];
            const B5Full = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
            const cx = 50, cy = 50, R = 36;
            const rp = (i: number, v: number) => {
              const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
              return { x: cx + R * v * Math.cos(a), y: cy + R * v * Math.sin(a) };
            };
            const b5Vals = B5.map(t => scoreVal[ps.bigFive[t].score] || 0.5);
            const pts = b5Vals.map((v, i) => rp(i, v));
            const shape = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
            const lblPts = B5L.map((_, i) => { const a = (i * 2 * Math.PI / 5) - Math.PI / 2; return { x: cx + (R + 11) * Math.cos(a), y: cy + (R + 11) * Math.sin(a) }; });

            // ── Sub-components ──
            const ConfDots = ({ level, color }: { level: ConfidenceLevel; color: string }) => {
              const n = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
              return (
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d <= n ? color : '#E8E4E0' }} />
                  ))}
                  <span className="font-mono text-[0.48rem] uppercase tracking-[0.08em] ml-1" style={{ color: `${color}90` }}>{confLabel[level] || 'Exploratory'}</span>
                </div>
              );
            };

            const Ev = ({ text, color }: { text: string; color: string }) => (
              <div className="mt-4 relative rounded-xl p-4 overflow-hidden" style={{ background: `${color}06` }}>
                <span className="absolute top-1 left-3 font-serif text-[2.5rem] leading-none select-none pointer-events-none" style={{ color: `${color}12` }}>&ldquo;</span>
                <div className="pl-6">
                  <p className="font-mono text-[0.52rem] uppercase tracking-[0.1em] mb-1.5" style={{ color: `${color}70` }}>From your responses</p>
                  <p className="font-sans text-[0.82rem] text-[#2C2C2C] leading-[1.75] italic">{text}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${color}30, transparent)` }} />
              </div>
            );

            const SC = ({ sysKey, color, icon, label, confidence, delay, children }: { sysKey: string; color: string; icon: string; label: string; confidence: ConfidenceLevel; delay: number; children: React.ReactNode }) => {
              const isOpen = expandedSystem === sysKey;
              return (
                <div id={`system-${sysKey}`} className="rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                  style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', border: `1px solid ${isOpen ? color + '40' : '#E8E4E0'}`, animation: systemsRevealed ? `psSlideUp 0.5s ease-out ${delay}s both` : 'none' }}>
                  <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}40)` }} />
                  <button onClick={() => setExpandedSystem(isOpen ? null : sysKey)} className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}10` }}>
                        <span className="font-serif text-sm font-bold" style={{ color }}>{icon}</span>
                      </div>
                      <div>
                        <span className="font-sans text-[0.82rem] font-semibold text-[#2C2C2C]">{label}</span>
                        <ConfDots level={confidence} color={color} />
                      </div>
                    </div>
                    <span className={`text-[#9B9590] text-base transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                    <div className="px-5 pb-5">{children}</div>
                  </div>
                </div>
              );
            };

            return (
              <div className="flex flex-col gap-0">
                {/* ═══ SECTION A — Personality Constellation ═══ */}
                <div className="px-6 pt-5 pb-3">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#9B9590] mb-3">Your personality across 6 frameworks</p>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                    {chips.map((chip, i) => (
                      <button key={chip.key} onClick={() => { setExpandedSystem(chip.key); document.getElementById(`system-${chip.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }} className="flex-shrink-0"
                        style={{ animation: systemsRevealed ? `psScaleIn 0.35s ease-out ${i * 0.07}s both` : 'none' }}>
                        <div className="rounded-2xl px-3.5 py-3 border transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5"
                          style={{ background: expandedSystem === chip.key ? `${chip.color}10` : `${chip.color}05`, borderColor: expandedSystem === chip.key ? `${chip.color}50` : `${chip.color}20`, animation: expandedSystem === chip.key ? 'pulseGlow 2.5s ease-in-out infinite' : 'none', ['--glow-color' as string]: `${chip.color}18` }}>
                          <svg width="34" height="34" viewBox="0 0 34 34" className="mx-auto mb-1.5">
                            <circle cx="17" cy="17" r="14" fill="none" stroke={`${chip.color}18`} strokeWidth="2" />
                            <circle cx="17" cy="17" r="14" fill="none" stroke={chip.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - chip.conf)} transform="rotate(-90 17 17)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                            <text x="17" y="18" textAnchor="middle" dominantBaseline="middle" fill={chip.color} fontSize="11" fontFamily="serif" fontWeight="bold">{chip.icon}</text>
                          </svg>
                          <p className="font-serif text-[0.78rem] font-bold text-center whitespace-nowrap leading-tight" style={{ color: chip.color }}>{chip.result}</p>
                          <p className="font-mono text-[0.45rem] uppercase tracking-[0.1em] text-center mt-0.5" style={{ color: `${chip.color}70` }}>{chip.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ═══ SECTION B — Big Five Radar Chart ═══ */}
                <div className="px-6 py-4" style={{ animation: systemsRevealed ? 'psSlideUp 0.5s ease-out 0.3s both' : 'none' }}>
                  <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[#7C3AED]">Big Five Profile</span>
                      </div>
                      <ConfDots level={ps.bigFive.confidence} color="#7C3AED" />
                    </div>
                    <div className="flex justify-center my-1">
                      <svg viewBox="-8 -8 116 116" width="260" height="260" className="max-w-full">
                        {[0.25, 0.5, 0.75, 1.0].map((pct, ri) => {
                          const ring = Array.from({ length: 5 }, (_, i) => rp(i, pct));
                          const d = ring.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
                          return <path key={ri} d={d} fill="none" stroke="#E8E4E0" strokeWidth="0.4" opacity={0.7} />;
                        })}
                        {Array.from({ length: 5 }, (_, i) => { const p = rp(i, 1.0); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E8E4E0" strokeWidth="0.3" />; })}
                        <path d={shape} fill="#7C3AED" fillOpacity={0.10} stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round" style={{ strokeDasharray: 600, strokeDashoffset: 0, animation: systemsRevealed ? 'radarDraw 1.5s ease-out 0.5s both' : 'none' }} />
                        {pts.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="2.5" fill="white" stroke="#7C3AED" strokeWidth="1.5" style={{ animation: systemsRevealed ? `psScaleIn 0.3s ease-out ${0.8 + i * 0.1}s both` : 'none' }} />))}
                        {lblPts.map((p, i) => (<text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#6B6B6B" fontWeight="600" fontFamily="monospace">{B5L[i]}</text>))}
                      </svg>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                      {B5.map((trait, i) => (
                        <div key={trait} className="flex items-center gap-1 bg-[#FAF8F5] rounded-full px-2.5 py-1 border border-[#E8E4E0]">
                          <span className="font-mono text-[0.5rem] uppercase tracking-[0.06em] text-[#9B9590]">{B5Full[i]}</span>
                          <span className="font-sans text-[0.65rem] font-semibold text-[#7C3AED]">{scoreLbl[ps.bigFive[trait].score] || ''}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setExpandedSystem(expandedSystem === 'bigFive' ? null : 'bigFive')} className="w-full mt-3 pt-2.5 border-t border-[#E8E4E0] flex items-center justify-center gap-1.5 text-[#9B9590] hover:text-[#7C3AED] transition-colors">
                      <span className="font-sans text-[0.72rem]">{expandedSystem === 'bigFive' ? 'Hide details' : 'Read trait descriptions'}</span>
                      <span className={`text-xs transition-transform duration-200 ${expandedSystem === 'bigFive' ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    <div className={`overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${expandedSystem === 'bigFive' ? 'max-h-[1500px] mt-3' : 'max-h-0'}`}>
                      {B5.map((trait, i) => (<div key={trait} className="mb-3.5 last:mb-0"><p className="font-sans text-[0.78rem] font-semibold text-[#2C2C2C] mb-0.5">{B5Full[i]}</p><p className="font-sans text-[0.82rem] text-[#6B6B6B] leading-[1.7]">{ps.bigFive[trait].description}</p></div>))}
                      {ps.bigFive.personalVariance && <Ev text={ps.bigFive.personalVariance} color="#7C3AED" />}
                    </div>
                  </div>
                </div>

                {/* ═══ SECTION C — System Detail Cards ═══ */}
                <div className="px-6 pb-6">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#9B9590] mb-3">Detailed analysis</p>
                  <div className="flex flex-col gap-3">
                    {/* MBTI */}
                    <SC sysKey="mbti" color="#2563EB" icon="M" label="Myers-Briggs (MBTI)" confidence={ps.mbti.confidence} delay={0.45}>
                      <div className="flex gap-2.5 flex-wrap mb-4">
                        {(ps.mbti.types || []).map((t, i) => (
                          <div key={t} className="rounded-xl px-4 py-2.5 transition-transform hover:scale-[1.02]" style={{ background: i === 0 ? '#EFF6FF' : 'rgba(37,99,235,0.04)', border: `1px solid rgba(37,99,235,${i === 0 ? 0.3 : 0.15})` }}>
                            <span className={`font-serif text-lg ${i === 0 ? 'font-bold text-[#2563EB]' : 'font-medium text-[#2563EB]/70'}`}>{t}</span>
                            <span className="font-mono text-[0.48rem] uppercase tracking-wider ml-2" style={{ color: i === 0 ? 'rgba(37,99,235,0.5)' : 'rgba(37,99,235,0.35)' }}>{i === 0 ? 'Primary' : 'Also likely'}</span>
                          </div>
                        ))}
                      </div>
                      <p className="font-sans text-[0.85rem] text-[#2C2C2C] leading-[1.7]">{ps.mbti.reasoning}</p>
                      <Ev text={ps.mbti.personalEvidence} color="#2563EB" />
                    </SC>

                    {/* Attachment + DISC grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SC sysKey="attachment" color="#D97706" icon="A" label="Attachment" confidence={ps.attachment.confidence} delay={0.55}>
                        <div className="inline-block rounded-xl px-4 py-2 mb-3" style={{ background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.2)' }}>
                          <span className="font-serif text-[1rem] font-bold text-[#D97706] capitalize">{(ps.attachment.style || '').replace(/_/g, '-')}</span>
                        </div>
                        <p className="font-sans text-[0.84rem] text-[#2C2C2C] leading-[1.7]">{ps.attachment.reasoning}</p>
                        <Ev text={ps.attachment.personalEvidence} color="#D97706" />
                        {ps.attachment.healthNote && <p className="font-sans text-[0.76rem] text-[#9B9590] leading-relaxed mt-3 italic">{ps.attachment.healthNote}</p>}
                        {ps.attachment.growthEdge && (
                          <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(122,158,126,0.06)', borderLeft: '2px solid rgba(122,158,126,0.25)' }}>
                            <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-[#7A9E7E]/70 mb-1">Growth edge</p>
                            <p className="font-sans text-[0.8rem] text-[#2C2C2C] leading-relaxed">{ps.attachment.growthEdge}</p>
                          </div>
                        )}
                      </SC>
                      <SC sysKey="disc" color="#DC2626" icon="D" label="DISC Profile" confidence={ps.disc.confidence} delay={0.6}>
                        <div className="inline-block rounded-xl px-5 py-2 mb-2" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.18)' }}>
                          <span className="font-serif text-2xl font-bold text-[#DC2626] tracking-wide">{ps.disc.profile || '—'}</span>
                        </div>
                        {ps.disc.blend && <p className="font-sans text-[0.8rem] text-[#9B9590] italic mb-2">{ps.disc.blend}</p>}
                        <p className="font-sans text-[0.84rem] text-[#2C2C2C] leading-[1.7]">{ps.disc.reasoning}</p>
                        <Ev text={ps.disc.personalEvidence} color="#DC2626" />
                      </SC>
                    </div>

                    {/* Jungian */}
                    <SC sysKey="jungian" color="#7A9E7E" icon="J" label="Jungian Archetypes" confidence={ps.jungian.confidence} delay={0.65}>
                      <div className="flex gap-2 flex-wrap mb-4">
                        <div className="rounded-xl px-4 py-2 border" style={{ background: 'rgba(122,158,126,0.08)', borderColor: 'rgba(122,158,126,0.25)' }}>
                          <span className="font-sans text-sm font-semibold text-[#7A9E7E]">{ps.jungian.primaryArchetype}</span>
                        </div>
                        {(ps.jungian.supportingArchetypes || []).map((a) => (
                          <div key={a} className="rounded-xl px-4 py-2 border transition-transform hover:scale-[1.02]" style={{ background: 'rgba(122,158,126,0.04)', borderColor: 'rgba(122,158,126,0.15)' }}>
                            <span className="font-sans text-sm font-medium text-[#7A9E7E]/75">{a}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#1E293B] rounded-xl p-5 mb-4 relative overflow-hidden">
                        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
                        <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-[#7C3AED]/55 mb-2">The Shadow</p>
                        <p className="font-serif text-xl font-bold text-[#7C3AED] mb-1.5">{ps.jungian.shadowArchetype}</p>
                        {ps.jungian.shadowNote && <p className="font-sans text-[0.82rem] text-[#94A3B8] leading-relaxed italic">{ps.jungian.shadowNote}</p>}
                      </div>
                      <p className="font-sans text-[0.85rem] text-[#2C2C2C] leading-[1.7]">{ps.jungian.reasoning}</p>
                      <Ev text={ps.jungian.personalEvidence} color="#7A9E7E" />
                    </SC>

                    {/* Human Design */}
                    <SC sysKey="humanDesign" color="#9CA3AF" icon="H" label="Human Design" confidence="low" delay={0.7}>
                      <div className="inline-block rounded-xl px-5 py-2.5 mb-3" style={{ border: '1px dashed #D1D5DB', background: '#FAFAFA' }}>
                        <span className="font-serif text-[1rem] text-[#6B6B6B] font-medium">{ps.humanDesign.likelyType || '—'}</span>
                      </div>
                      <p className="font-sans text-[0.84rem] text-[#6B6B6B] leading-[1.7] mb-4">{ps.humanDesign.reasoning}</p>
                      <div className="rounded-xl p-4 bg-gradient-to-r from-[#F5F3F0] to-[#FAF8F5] border border-[#E8E4E0]">
                        <p className="font-sans text-[0.72rem] text-[#9B9590] italic leading-relaxed">{ps.humanDesign.disclaimer}</p>
                      </div>
                    </SC>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const renderSection = (idx: number) => {
    switch (idx) {
      // ── Section 0: Your Type — Grand Reveal ──
      case 0: {
        // Enneagram geometry for background
        const ENNEA_PTS = [9,1,2,3,4,5,6,7,8];
        function ep(t: number) {
          const i = ENNEA_PTS.indexOf(t);
          if (i === -1) return { x: 50, y: 50 };
          const a = (i * 40 * Math.PI) / 180;
          return { x: 50 + 42 * Math.sin(a), y: 50 - 42 * Math.cos(a) };
        }
        const hexPairs = [[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]];
        const triPairs = [[3,6],[6,9],[9,3]];

        const essence = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];

        // Type-specific SVG ambient shapes
        function renderTypeAmbient() {
          const t = leadingType;
          const c1 = essence.colors[0];
          const c2 = essence.colors[1];
          // Each type gets unique animated SVG shapes reflecting its essence
          switch (t) {
            case 1: // Reformer — precise geometric lines, grid
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line key={`gl-${i}`} x1={i * 70} y1="0" x2={i * 70} y2="600" stroke={c2} strokeWidth="0.5" opacity="0.08"
                      strokeDasharray="600" style={{ animation: `type-reveal-line 2s ease-out ${i * 0.1}s forwards`, strokeDashoffset: 600 }} />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`hl-${i}`} x1="0" y1={i * 80} x2="800" y2={i * 80} stroke={c2} strokeWidth="0.5" opacity="0.06"
                      strokeDasharray="800" style={{ animation: `type-reveal-line 2.5s ease-out ${0.3 + i * 0.08}s forwards`, strokeDashoffset: 800 }} />
                  ))}
                  <rect x="200" y="100" width="400" height="400" rx="4" fill="none" stroke={c2} strokeWidth="0.8" opacity="0.1"
                    strokeDasharray="1600" style={{ animation: 'type-reveal-line 3s ease-out 0.5s forwards', strokeDashoffset: 1600 }} />
                </svg>
              );
            case 2: // Helper — warm concentric circles, radiating
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {[60, 120, 180, 240, 300].map((r, i) => (
                    <circle key={`c-${i}`} cx="400" cy="300" r={r} fill="none" stroke={c2} strokeWidth="0.8" opacity={0.12 - i * 0.02}
                      strokeDasharray={r * 6.28} style={{ animation: `type-reveal-line ${2 + i * 0.3}s ease-out ${0.2 + i * 0.15}s forwards`, strokeDashoffset: r * 6.28 }} />
                  ))}
                </svg>
              );
            case 3: // Achiever — rising diagonal lines, ascending
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <line key={`r-${i}`} x1={50 + i * 55} y1="600" x2={150 + i * 55} y2="0" stroke={c2} strokeWidth={0.5 + (i % 3) * 0.3} opacity={0.06 + (i % 4) * 0.02}
                      strokeDasharray="800" style={{ animation: `type-reveal-line 2s ease-out ${i * 0.08}s forwards`, strokeDashoffset: 800 }} />
                  ))}
                  <polygon points="400,80 480,280 320,280" fill="none" stroke={c2} strokeWidth="1" opacity="0.1"
                    strokeDasharray="600" style={{ animation: 'type-reveal-line 2.5s ease-out 0.5s forwards', strokeDashoffset: 600 }} />
                </svg>
              );
            case 4: // Individualist — flowing waves, organic curves
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {[150, 250, 350, 450].map((y, i) => (
                    <path key={`w-${i}`} d={`M0 ${y} Q200 ${y - 40 - i * 10} 400 ${y} T800 ${y}`} fill="none" stroke={c2} strokeWidth="0.8" opacity={0.1 - i * 0.015}
                      strokeDasharray="900" style={{ animation: `type-reveal-line ${2.5 + i * 0.2}s ease-out ${0.3 + i * 0.2}s forwards`, strokeDashoffset: 900 }} />
                  ))}
                  <circle cx="400" cy="300" r="150" fill="none" stroke={c2} strokeWidth="0.5" opacity="0.06"
                    strokeDasharray="942" style={{ animation: 'type-reveal-line 3s ease-out 0.8s forwards', strokeDashoffset: 942 }} />
                </svg>
              );
            case 5: // Investigator — constellation dots and connecting lines
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {[[120,100],[680,80],[200,500],[600,480],[400,200],[150,300],[650,350],[350,420],[500,120],[300,150],[550,400],[100,450]].map(([x, y], i) => (
                    <g key={`s-${i}`}>
                      <circle cx={x} cy={y} r="2" fill={c2} opacity="0" style={{ animation: `type-reveal-dot 0.5s ease-out ${0.5 + i * 0.1}s forwards` }} />
                      {i > 0 && (
                        <line x1={x} y1={y} x2={[[120,100],[680,80],[200,500],[600,480],[400,200],[150,300],[650,350],[350,420],[500,120],[300,150],[550,400],[100,450]][i-1][0]}
                          y2={[[120,100],[680,80],[200,500],[600,480],[400,200],[150,300],[650,350],[350,420],[500,120],[300,150],[550,400],[100,450]][i-1][1]}
                          stroke={c2} strokeWidth="0.4" opacity="0.08"
                          strokeDasharray="400" style={{ animation: `type-reveal-line 1.5s ease-out ${0.6 + i * 0.1}s forwards`, strokeDashoffset: 400 }} />
                      )}
                    </g>
                  ))}
                </svg>
              );
            case 6: // Loyalist — hexagonal patterns
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {[[400,300,100],[250,180,60],[550,180,60],[250,420,60],[550,420,60],[400,120,40],[400,480,40]].map(([cx, cy, size], i) => {
                    const pts = Array.from({ length: 6 }).map((_, j) => {
                      const a = (j * 60 - 30) * Math.PI / 180;
                      return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
                    }).join(' ');
                    return <polygon key={`hex-${i}`} points={pts} fill="none" stroke={c2} strokeWidth="0.6" opacity={0.1 - i * 0.01}
                      strokeDasharray="800" style={{ animation: `type-reveal-line 2s ease-out ${0.3 + i * 0.15}s forwards`, strokeDashoffset: 800 }} />;
                  })}
                </svg>
              );
            case 7: // Enthusiast — scattered light particles, starburst
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const x = 50 + (i * 137) % 700;
                    const y = 30 + (i * 89) % 540;
                    const r = 1 + (i % 3);
                    return <circle key={`p-${i}`} cx={x} cy={y} r={r} fill={c2} opacity="0"
                      style={{ animation: `type-reveal-dot 0.4s ease-out ${0.2 + i * 0.06}s forwards` }} />;
                  })}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const a = i * 45 * Math.PI / 180;
                    return <line key={`ray-${i}`} x1="400" y1="300" x2={400 + 300 * Math.cos(a)} y2={300 + 300 * Math.sin(a)}
                      stroke={c2} strokeWidth="0.4" opacity="0.06"
                      strokeDasharray="300" style={{ animation: `type-reveal-line 2s ease-out ${0.5 + i * 0.1}s forwards`, strokeDashoffset: 300 }} />;
                  })}
                </svg>
              );
            case 8: // Challenger — bold angular forms, mountain
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  <polygon points="400,60 700,500 100,500" fill="none" stroke={c2} strokeWidth="1.2" opacity="0.1"
                    strokeDasharray="1400" style={{ animation: 'type-reveal-line 2.5s ease-out 0.3s forwards', strokeDashoffset: 1400 }} />
                  <polygon points="400,140 600,450 200,450" fill="none" stroke={c2} strokeWidth="0.6" opacity="0.07"
                    strokeDasharray="1000" style={{ animation: 'type-reveal-line 2s ease-out 0.6s forwards', strokeDashoffset: 1000 }} />
                  {[[200,500,350,200],[350,200,500,350],[500,350,650,150],[650,150,700,500]].map(([x1,y1,x2,y2], i) => (
                    <line key={`m-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c2} strokeWidth="0.5" opacity="0.08"
                      strokeDasharray="400" style={{ animation: `type-reveal-line 1.5s ease-out ${0.8 + i * 0.15}s forwards`, strokeDashoffset: 400 }} />
                  ))}
                </svg>
              );
            default: // 9 Peacemaker — gentle flowing circles, soft curves
              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                  {[200, 260, 320].map((r, i) => (
                    <circle key={`pc-${i}`} cx="400" cy="300" r={r} fill="none" stroke={c2} strokeWidth="0.5" opacity={0.08 - i * 0.02}
                      strokeDasharray={r * 6.28} style={{ animation: `type-reveal-line ${3 + i * 0.5}s ease-out ${0.3 + i * 0.2}s forwards`, strokeDashoffset: r * 6.28 }} />
                  ))}
                  {[180, 300, 420].map((y, i) => (
                    <path key={`fw-${i}`} d={`M0 ${y} C200 ${y - 30} 400 ${y + 30} 600 ${y - 20} S800 ${y + 10} 800 ${y}`} fill="none" stroke={c2} strokeWidth="0.5" opacity="0.07"
                      strokeDasharray="900" style={{ animation: `type-reveal-line 3s ease-out ${0.5 + i * 0.3}s forwards`, strokeDashoffset: 900 }} />
                  ))}
                </svg>
              );
          }
        }

        return (
          <div className="flex flex-col items-center w-full max-w-[720px] relative">
            <style>{`
              @keyframes type-reveal-glow {
                0% { transform: scale(0.95); opacity: 0; }
                60% { transform: scale(1.02); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes type-reveal-number {
                0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                50% { transform: scale(1.1) rotate(2deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
              @keyframes type-reveal-text {
                0% { transform: translateY(20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
              }
              @keyframes type-reveal-line {
                0% { stroke-dashoffset: 200; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes type-reveal-dot {
                0% { r: 0; opacity: 0; }
                100% { opacity: 0.15; }
              }
              @keyframes type-reveal-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
              @keyframes type-reveal-shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
              @keyframes type-ambient-drift {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(10px, -8px) scale(1.02); }
                66% { transform: translate(-5px, 5px) scale(0.98); }
              }
            `}</style>

            {/* ═══ MAIN REVEAL CARD — Full viewport feel ═══ */}
            <div className="rounded-3xl w-full relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${essence.colors[0]} 0%, #1E293B 45%, #0F172A 100%)`,
                animation: 'type-reveal-glow 1s ease-out forwards',
                minHeight: 520,
              }}
            >
              {/* Ambient type-specific shapes */}
              <div className="absolute inset-0 pointer-events-none" style={{ animation: 'type-ambient-drift 20s ease-in-out infinite' }}>
                {renderTypeAmbient()}
              </div>

              {/* Radial light effects */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 40%, ${essence.colors[1]}15 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, ${essence.colors[0]}10 0%, transparent 40%)` }} />

              {/* Subtle shimmer */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'type-reveal-shimmer 4s ease-in-out infinite' }} />

              {/* Animated enneagram — subtle behind content */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <svg viewBox="0 0 100 100" width="360" height="360">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.25" opacity="0.5"
                    strokeDasharray="264" style={{ animation: 'type-reveal-line 2s ease-out 0.5s forwards', strokeDashoffset: 264 }} />
                  {hexPairs.map(([a, b], i) => {
                    const pa = ep(a); const pb = ep(b);
                    return <line key={`h-${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="white" strokeWidth="0.25" opacity="0.3"
                      strokeDasharray="100" style={{ animation: `type-reveal-line 1.5s ease-out ${0.7 + i * 0.1}s forwards`, strokeDashoffset: 100 }} />;
                  })}
                  {triPairs.map(([a, b], i) => {
                    const pa = ep(a); const pb = ep(b);
                    return <line key={`t-${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="white" strokeWidth="0.2" opacity="0.2"
                      strokeDasharray="100" style={{ animation: `type-reveal-line 1.5s ease-out ${1 + i * 0.1}s forwards`, strokeDashoffset: 100 }} />;
                  })}
                  {ENNEA_PTS.map((t, i) => {
                    const p = ep(t);
                    const isActive = t === leadingType;
                    return (
                      <circle key={`ep-${t}`} cx={p.x} cy={p.y} r={isActive ? 3.5 : 1.5} fill={isActive ? '#ffffff' : 'rgba(255,255,255,0.5)'} opacity="0"
                        style={{ animation: `type-reveal-dot 0.5s ease-out ${1.2 + i * 0.06}s forwards` }} />
                    );
                  })}
                </svg>
              </div>

              {/* ═══ CONTENT ═══ */}
              <div className="relative z-10 flex flex-col items-center text-center px-8 pt-12 pb-10 gap-5">
                {/* Label */}
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/40"
                  style={{ animation: 'type-reveal-text 0.8s ease-out 0.2s forwards', opacity: 0 }}>
                  Your Enneagram Type
                </p>

                {/* Big number */}
                <div className="relative" style={{ animation: 'type-reveal-number 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards', opacity: 0 }}>
                  <div className="absolute inset-0 rounded-full blur-3xl opacity-40" style={{ background: essence.colors[1] }} />
                  <div className="w-40 h-40 rounded-full flex items-center justify-center relative"
                    style={{ background: `linear-gradient(135deg, ${essence.colors[1]}, ${essence.colors[0]})`, boxShadow: `0 0 80px ${essence.colors[1]}50` }}>
                    <span className="font-serif text-[5.5rem] font-bold text-white leading-none drop-shadow-lg">{leadingType}</span>
                  </div>
                </div>

                {/* Type name + DS name */}
                <div style={{ animation: 'type-reveal-text 0.8s ease-out 0.8s forwards', opacity: 0 }}>
                  <h1 className="font-serif text-[2.8rem] font-bold text-white leading-tight">{typeName}</h1>
                  {dsName && <p className="font-sans text-[1.05rem] text-[#7A9E7E] mt-1">{dsName}</p>}
                </div>

                {/* Type essence tagline */}
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-white/30"
                  style={{ animation: 'type-reveal-text 0.8s ease-out 0.9s forwards', opacity: 0 }}>
                  {essence.label}
                </p>

                {/* Glassmorphic pills */}
                <div className="flex gap-2.5 flex-wrap justify-center"
                  style={{ animation: 'type-reveal-text 0.8s ease-out 1s forwards', opacity: 0 }}>
                  {wing && (
                    <span className="font-sans text-[0.75rem] bg-white/8 backdrop-blur-sm border border-white/15 rounded-full px-5 py-2 text-white/75">
                      {wing}
                    </span>
                  )}
                  {variant && (
                    <span className="font-sans text-[0.75rem] bg-white/8 backdrop-blur-sm border border-white/15 rounded-full px-5 py-2 text-white/75">
                      {variant}
                    </span>
                  )}
                  <span className="font-sans text-[0.75rem] backdrop-blur-sm border rounded-full px-5 py-2"
                    style={{ background: `${essence.colors[1]}20`, borderColor: `${essence.colors[1]}30`, color: essence.colors[2] }}>
                    {confidencePct}% confidence
                  </span>
                </div>

                {/* Divider */}
                <div className="w-20 h-px mt-2"
                  style={{ background: `linear-gradient(to right, transparent, ${essence.colors[1]}40, transparent)`, animation: 'type-reveal-text 0.8s ease-out 1.1s forwards', opacity: 0 }} />

                {/* Headline quote */}
                {headline && (
                  <div className="max-w-lg" style={{ animation: 'type-reveal-text 0.8s ease-out 1.3s forwards', opacity: 0 }}>
                    <p className="font-serif italic text-[1.2rem] leading-[1.8]" style={{ color: essence.colors[2] }}>
                      &ldquo;<TypewriterText text={headline} delay={1500} />&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ FLOATING STATS BAR ═══ */}
            <div className="w-[92%] -mt-6 relative z-20 bg-white rounded-2xl px-6 py-5"
              style={{ boxShadow: `0 8px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)`, animation: 'type-reveal-float 4s ease-in-out 2.5s infinite, type-reveal-text 0.8s ease-out 1.6s forwards', opacity: 0 }}>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Type', value: String(leadingType), color: essence.colors[1] },
                  { label: 'Wing', value: wing || '—', color: '#2C2C2C' },
                  { label: 'Variant', value: variant || '—', color: '#2C2C2C' },
                  { label: 'Tritype', value: tritype || '—', color: '#2C2C2C' },
                ].map(m => (
                  <div key={m.label}>
                    <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#9B9590] block">{m.label}</span>
                    <span className="font-serif text-[1.3rem] font-bold" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ BRAND CLOSER ═══ */}
            <div className="mt-8 text-center" style={{ animation: 'type-reveal-text 0.8s ease-out 1.9s forwards', opacity: 0 }}>
              <p className="font-serif italic text-[0.85rem] text-[#9B9590]">
                Defy Your Number. Live Your Spirit.
              </p>
            </div>

            <div className="mt-6">{continueButton}</div>
          </div>
        );
      }

      // ── Section 1: Superpower & Kryptonite ──
      case 1:
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">The Wound &amp; The Gift</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Superpower &amp; Kryptonite</h2>
            </div>
            {/* Superpower — warm gold accent */}
            <div className="rounded-2xl overflow-hidden sr-card" style={{ animationDelay: '0.15s' }}>
              <div className="h-1 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]" />
              <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#B45309] mb-3">
                  Your Superpower
                </p>
                <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]">
                  <TypewriterText text={superpower || (r.superpower_description as string) || ''} delay={300} />
                </p>
              </div>
            </div>
            {/* Kryptonite — cool slate accent */}
            <div className="rounded-2xl overflow-hidden sr-card" style={{ animationDelay: '0.4s' }}>
              <div className="h-1 bg-gradient-to-r from-[#64748B] to-[#94A3B8]" />
              <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#475569] mb-3">
                  Your Kryptonite
                </p>
                <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]">
                  <TypewriterText text={kryptonite || (r.kryptonite_description as string) || ''} delay={1500} />
                </p>
              </div>
            </div>
            {continueButton}
          </div>
        );

      // ── Section 2: React / Respond ──
      case 2:
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Defiant Spirit</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">React &amp; Respond</h2>
            </div>
            {reactPattern && (
              <div className="rounded-2xl overflow-hidden sr-card" style={{ animationDelay: '0.15s' }}>
                <div className="h-1 bg-gradient-to-r from-[#DC2626] to-[#F87171]" />
                <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#DC2626] mb-3">
                    How You React
                  </p>
                  <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]"><TypewriterText text={reactPattern} delay={300} /></p>
                </div>
              </div>
            )}
            {respondPathway && (
              <div className="rounded-2xl overflow-hidden sr-card" style={{ animationDelay: '0.4s' }}>
                <div className="h-1 bg-gradient-to-r from-[#2563EB] to-[#60A5FA]" />
                <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#2563EB] mb-3">
                    How You Respond
                  </p>
                  <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]"><TypewriterText text={respondPathway} delay={1200} /></p>
                </div>
              </div>
            )}
            {continueButton}
          </div>
        );

      // ── Section 3: OYN Dimensions ──
      case 3: {
        const oynEntries = Object.entries(oynSummary).filter(([, v]) => v?.trim());
        const oynColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center">
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Own Your Number</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">OYN Dimensions</h2>
              <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-1">How your type shows up across six life dimensions.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {oynEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className="rounded-2xl overflow-hidden sr-card flex flex-col"
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  <div className="h-1 flex-shrink-0" style={{ background: oynColors[i % oynColors.length] }} />
                  <div className="bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex-1">
                    <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.12em] mb-2"
                      style={{ color: oynColors[i % oynColors.length] }}
                    >
                      {oynLabels[key] ?? key.toUpperCase()}
                    </p>
                    <p className="font-sans text-[0.9rem] text-[#2C2C2C] leading-relaxed">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {continueButton}
          </div>
        );
      }

      // ── Section 4: Famous Examples (already shown, so show Type Scores visual) ──
      case 4: {
        const variantEntries = Object.entries(variantSignals).sort(([, a], [, b]) => b - a);
        const wingLeft = wingSignals.left ?? 0;
        const wingRight = wingSignals.right ?? 0;
        const wingAdj = getWingTypes(leadingType);
        const dominantWing = wingLeft > wingRight ? wingAdj[0] : wingAdj[1];
        const variantNames: Record<string, { full: string; desc: string }> = {
          SP: { full: 'Self-Preservation', desc: 'Your attention goes to safety, comfort, health, and material security. You focus on having enough — enough resources, enough stability, enough ground beneath your feet.' },
          SO: { full: 'Social', desc: 'Your attention goes to belonging, status, and your role in groups. You read social dynamics instinctively and care deeply about your place in the larger community.' },
          SX: { full: 'Sexual (One-to-One)', desc: 'Your attention goes to intensity, chemistry, and deep connection. You seek experiences and relationships that feel electric, transformative, and all-consuming.' },
        };
        const dominantVariantKey = variantEntries[0]?.[0] ?? '';
        const dominantVariantInfo = variantNames[dominantVariantKey];

        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Your Configuration</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Wing &amp; Variant</h2>
            </div>

            {/* Wing card */}
            <div className="rounded-2xl overflow-hidden sr-card" style={{ animationDelay: '0.1s' }}>
              <div className="h-1 bg-gradient-to-r from-[#2563EB] to-[#60A5FA]" />
              <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#2563EB] mb-2">Your Wing</p>
                <p className="font-serif text-[1.6rem] font-bold text-[#2C2C2C] mb-1 sr-card" style={{ animationDelay: '0.25s' }}>
                  {leadingType}w{dominantWing}
                </p>
                <p className="font-sans text-[0.82rem] text-[#6B6B6B] leading-relaxed mb-4">
                  Your wing is the type next to yours on the Enneagram circle that most influences how your core type expresses itself. Think of it as the flavor — you&apos;re a {leadingType}, but with a {dominantWing} lean. It shapes your style, not your motivation.
                </p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: `${TYPE_NAMES[wingAdj[0]]} (${wingAdj[0]})`, val: wingLeft },
                    { label: `${TYPE_NAMES[wingAdj[1]]} (${wingAdj[1]})`, val: wingRight },
                  ].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-sans text-xs text-[#6B6B6B] w-32 flex-shrink-0">{w.label}</span>
                      <AnimatedBar percent={Math.min(100, Math.round(w.val * 100))} color="#2563EB" delay={400 + i * 200} numberClassName="text-[#9B9590]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Variant card */}
            {variantEntries.length > 0 && (
              <div className="rounded-2xl overflow-hidden sr-card" style={{ animationDelay: '0.3s' }}>
                <div className="h-1 bg-gradient-to-r from-[#7A9E7E] to-[#A7C4AA]" />
                <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#7A9E7E] mb-2">Instinctual Variant</p>
                  <p className="font-serif text-[1.4rem] font-bold text-[#2C2C2C] mb-1">
                    {dominantVariantInfo?.full || dominantVariantKey}
                  </p>
                  {dominantVariantInfo && (
                    <p className="font-sans text-[0.82rem] text-[#6B6B6B] leading-relaxed mb-4">
                      {dominantVariantInfo.desc}
                    </p>
                  )}
                  <p className="font-sans text-[0.78rem] text-[#9B9590] leading-relaxed mb-4">
                    Everyone has all three instincts — Self-Preservation, Social, and Sexual (One-to-One) — but one drives you most automatically. It&apos;s the lens your type looks through first.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {variantEntries.map(([vk, vv], i) => (
                      <div key={vk} className="flex items-center gap-3">
                        <span className="font-sans text-xs font-semibold w-28 text-[#6B6B6B] flex-shrink-0">
                          {variantNames[vk]?.full || vk}
                        </span>
                        <AnimatedBar percent={Math.min(100, Math.round(vv * 100))} color="#7A9E7E" delay={600 + i * 200} numberClassName="text-[#9B9590]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {continueButton}
          </div>
        );
      }

      // ── Section 5: Tritype ──
      case 5: {
        // Parse tritype digits and map to centers
        const tritypeDigits = tritype.replace(/\D/g, '').split('').map(Number);
        const centerColors: Record<string, { bg: string; text: string; label: string }> = {
          Body: { bg: '#FEF3C7', text: '#92400E', label: 'Body' },
          Heart: { bg: '#FCE7F3', text: '#9D174D', label: 'Heart' },
          Head: { bg: '#DBEAFE', text: '#1E40AF', label: 'Head' },
        };

        // Top 3 overall types (separate from tritype)
        const typeScoresRaw = (r.variant_signals ? r : r) as Record<string, unknown>;
        const allTypeScores = Object.entries(
          (r as Record<string, unknown>).type_scores as Record<string, number> ?? {}
        ).map(([t, s]) => ({ type: Number(t), score: s }))
          .sort((a, b) => b.score - a.score);
        const top3Overall = allTypeScores.slice(0, 3);

        // Lowest scoring type
        const lowestType = allTypeScores.length > 0 ? allTypeScores[allTypeScores.length - 1] : null;
        const lowestOnStressLine = lowestType ? STRESS_LINES[leadingType] === lowestType.type : false;
        const lowestOnReleaseLine = lowestType ? RELEASE_LINES[leadingType] === lowestType.type : false;

        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Three Centers</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Your Tritype</h2>
            </div>
            {/* Tritype */}
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sr-card" style={{ animationDelay: '0.1s' }}>
              <p className="font-sans text-[0.75rem] text-[#6B6B6B] mb-5 leading-relaxed">
                Your dominant type in each of the three intelligence centers: Body, Heart, and Head.
              </p>
              {tritype ? (
                <>
                  {/* Hyphenated tritype display */}
                  <p className="font-serif text-[2.5rem] font-bold text-[#2C2C2C] leading-none mb-4 sr-card" style={{ animationDelay: '0.2s' }}>
                    {tritypeDigits.join(' – ')}
                  </p>
                  {tritypeConfidence > 0 && (
                    <p className="font-sans text-xs text-[#9B9590] mb-4">
                      {Math.round(tritypeConfidence * 100)}% confidence
                    </p>
                  )}
                  {tritypeArchetype && (
                    <div className="bg-[#FAF8F5] rounded-xl p-4 mb-4">
                      <p className="font-sans text-[0.7rem] text-[#9B9590] mb-1">Archetype</p>
                      <p className="font-sans text-sm font-semibold text-[#2C2C2C]">{tritypeArchetype}</p>
                    </div>
                  )}
                  {/* Center-labeled tritype cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {tritypeDigits.map((digit, i) => {
                      const center = CENTER_MAP[digit] || 'Body';
                      const colors = centerColors[center] || centerColors.Body;
                      return (
                        <div
                          key={i}
                          className="rounded-xl p-4 text-center sr-card"
                          style={{ background: colors.bg, animationDelay: `${0.35 + i * 0.15}s` }}
                        >
                          <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] mb-2"
                            style={{ color: colors.text }}
                          >
                            {colors.label}
                          </p>
                          <p className="font-serif text-[1.8rem] font-bold" style={{ color: colors.text }}>
                            {digit}
                          </p>
                          <p className="font-sans text-[0.65rem] mt-1" style={{ color: colors.text, opacity: 0.7 }}>
                            {TYPE_NAMES[digit] || ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="font-sans text-sm text-[#9B9590]">
                  Tritype data is still forming. Continue exploring with Soulo.
                </p>
              )}
            </div>

            {/* Top 3 strongest types overall */}
            {top3Overall.length > 0 && (
              <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sr-card" style={{ animationDelay: '0.6s' }}>
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#9B9590] mb-4">
                  Your Strongest Types Overall
                </p>
                <div className="flex flex-col gap-2">
                  {top3Overall.map((t, i) => (
                    <div key={t.type} className="flex items-center gap-3">
                      <span className="font-serif text-lg font-bold w-8 text-[#2C2C2C]">{t.type}</span>
                      <AnimatedBar percent={Math.min(100, Math.round(t.score * 100))} color={i === 0 ? '#2563EB' : i === 1 ? '#60A5FA' : '#93C5FD'} delay={700 + i * 150} height="h-2.5" numberClassName="text-[#9B9590]" showNumber={false} />
                      <span className="font-sans text-xs text-[#9B9590] w-16 text-right">
                        {TYPE_NAMES[t.type] || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lowest scoring type */}
            {lowestType && lowestType.type > 0 && (
              <div className="bg-[#FAF8F5] rounded-2xl p-6 sr-card" style={{ animationDelay: '0.8s' }}>
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#9B9590] mb-2">
                  Least Active Pattern
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-serif text-xl font-bold text-[#9B9590]">{lowestType.type}</span>
                  <span className="font-sans text-sm text-[#6B6B6B]">{TYPE_NAMES[lowestType.type] || ''}</span>
                </div>
                {(lowestOnStressLine || lowestOnReleaseLine) && (
                  <p className="font-sans text-xs text-[#6B6B6B] leading-relaxed">
                    {lowestOnReleaseLine && (
                      <>This is your release line — the energy you move toward in growth. Low activation here may explain difficulty accessing that state.</>
                    )}
                    {lowestOnStressLine && (
                      <>This is your stress line — the pattern you fall into under pressure. Low activation here suggests this pattern is less familiar to you.</>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Center Insights */}
            {Object.keys(centerInsights).length > 0 && (
              <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#9B9590] mb-4">
                  Center Insights
                </p>
                <div className="flex flex-col gap-4">
                  {Object.entries(centerInsights).map(([center, insight]) => (
                    <div key={center}>
                      <p className="font-sans text-xs font-semibold capitalize text-[#6B6B6B] mb-1">{center}</p>
                      <p className="font-sans text-sm text-[#2C2C2C] leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {continueButton}
          </div>
        );
      }

      // ── Section 6: Domain Insights (Interactive Domain Lens) ──
      case 6: {
        const domainIcons: Record<string, string> = { Relationships: '\u2764', Wealth: '\u2736', Leadership: '\u2691', Transformation: '\u2728' };
        const domainTeasers: Record<string, string> = {
          Relationships: 'How you connect and protect',
          Wealth: 'Your relationship with abundance',
          Leadership: 'How you lead and follow',
          Transformation: 'Your path of becoming',
        };

        const renderToggle = (mode: 'react' | 'respond', onToggle: () => void) => (
          <div className="relative h-10 rounded-full bg-[#F0EDE8] flex items-center cursor-pointer select-none"
            onClick={onToggle}>
            <div className={`absolute h-8 rounded-full transition-all duration-300 ease-out ${
              mode === 'react'
                ? 'left-1 w-[calc(50%-4px)] bg-gradient-to-r from-[#DC2626] to-[#EF4444]'
                : 'left-[calc(50%+3px)] w-[calc(50%-4px)] bg-gradient-to-r from-[#2563EB] to-[#3B82F6]'
            }`} style={{ top: '4px' }} />
            <span className={`relative z-10 flex-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors duration-300 ${
              mode === 'react' ? 'text-white font-semibold' : 'text-[#9B9590]'
            }`}>React</span>
            <span className={`relative z-10 flex-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors duration-300 ${
              mode === 'respond' ? 'text-white font-semibold' : 'text-[#9B9590]'
            }`}>Respond</span>
          </div>
        );

        const renderSpectrumBar = (mode: 'react' | 'respond') => (
          <div className="h-1 rounded-full bg-gradient-to-r from-[#DC2626] via-[#9B9590] to-[#2563EB] relative">
            <div className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-md top-1/2 -translate-y-1/2 transition-all duration-500 ${
              mode === 'react' ? 'left-[20%] bg-[#DC2626]' : 'left-[80%] bg-[#2563EB]'
            }`} />
          </div>
        );

        const renderDomainContent = (di: { domain: string; react: string; respond: string }, mode: 'react' | 'respond', keyPrefix: string) => {
          const text = mode === 'react' ? di.react : di.respond;
          return (
            <div className={`px-6 py-5 transition-colors duration-500 ${
              mode === 'react'
                ? 'bg-gradient-to-b from-[#FEF2F2] to-white'
                : 'bg-gradient-to-b from-[#EFF6FF] to-white'
            }`}>
              <p className={`font-mono text-[0.6rem] uppercase tracking-[0.12em] mb-2 ${
                mode === 'react' ? 'text-[#DC2626]' : 'text-[#2563EB]'
              }`}>
                {mode === 'react' ? 'When you react\u2026' : 'When you respond\u2026'}
              </p>
              {text?.trim() ? (
                <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8] mode-content"
                   key={`${keyPrefix}-${mode}`}>
                  {text}
                </p>
              ) : (
                <p className="font-sans text-sm text-[#9B9590] italic mode-content"
                   key={`${keyPrefix}-${mode}`}>
                  This pathway hasn&apos;t been explored yet.
                </p>
              )}
            </div>
          );
        };

        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Life Domains</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Domain Insights</h2>
              <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-1">
                {activeDomain !== null ? 'Toggle between your automatic and conscious patterns.' : 'Tap a domain to explore how your pattern shows up.'}
              </p>
            </div>

            {domainInsights.length > 0 ? (
              <>
                {domainCompareAll ? (
                  /* ── Compare All mode ── */
                  <div className="flex flex-col gap-3 sr-card" style={{ animationDelay: '0.1s' }}>
                    <div className="px-1">
                      {renderToggle(domainMode, () => setDomainMode(m => m === 'react' ? 'respond' : 'react'))}
                    </div>
                    <div className="mt-1">
                      {renderSpectrumBar(domainMode)}
                    </div>
                    {domainInsights.map((di, i) => (
                      <div key={i}
                        className={`rounded-2xl overflow-hidden transition-all duration-300 border border-[#E8E4E0] ${
                          domainMode === 'react' ? 'domain-glow-react' : 'domain-glow-respond'
                        }`}>
                        <div className="px-5 pt-4 pb-2 flex items-center gap-2 bg-white">
                          <span className="text-base">{domainIcons[di.domain] || '\u25C6'}</span>
                          <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-[#2C2C2C]">
                            {di.domain}
                          </span>
                        </div>
                        <div className={`px-5 pb-4 transition-colors duration-500 ${
                          domainMode === 'react' ? 'bg-gradient-to-b from-[#FEF2F2] to-white' : 'bg-gradient-to-b from-[#EFF6FF] to-white'
                        }`}>
                          {(() => {
                            const text = domainMode === 'react' ? di.react : di.respond;
                            return text?.trim() ? (
                              <p className="font-serif text-[0.95rem] text-[#2C2C2C] leading-[1.7] mode-content"
                                 key={`compare-${i}-${domainMode}`}>
                                {text}
                              </p>
                            ) : (
                              <p className="font-sans text-sm text-[#9B9590] italic mode-content"
                                 key={`compare-${i}-${domainMode}`}>
                                This pathway hasn&apos;t been explored yet.
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeDomain !== null ? (
                  /* ── Expanded single domain ── */
                  <div className="flex flex-col gap-3">
                    {/* Mini pills for non-active domains */}
                    <div className="flex gap-2 justify-center flex-wrap">
                      {domainInsights.map((di, i) => i !== activeDomain && (
                        <button key={i}
                          onClick={() => { setActiveDomain(i); setDomainMode('react'); }}
                          className="font-sans text-[0.65rem] uppercase tracking-[0.06em] text-[#9B9590] bg-white border border-[#E8E4E0] rounded-full px-3 py-1.5 hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
                        >
                          <span className="mr-1">{domainIcons[di.domain] || '\u25C6'}</span>
                          {di.domain}
                        </button>
                      ))}
                    </div>

                    {/* Expanded card */}
                    {(() => {
                      const di = domainInsights[activeDomain];
                      if (!di) return null;
                      return (
                        <div className={`bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${
                          domainMode === 'react' ? 'domain-glow-react' : 'domain-glow-respond'
                        }`}>
                          {/* Header */}
                          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg domain-active-pulse">{domainIcons[di.domain] || '\u25C6'}</span>
                              <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#2C2C2C]">
                                {di.domain}
                              </p>
                            </div>
                            <button onClick={() => setActiveDomain(null)}
                              className="text-[#9B9590] hover:text-[#2C2C2C] transition-colors p-1.5 rounded-full hover:bg-[#F0EBE6]">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </button>
                          </div>

                          {/* Toggle */}
                          <div className="px-6 pb-3">
                            {renderToggle(domainMode, () => setDomainMode(m => m === 'react' ? 'respond' : 'react'))}
                          </div>

                          {/* Spectrum bar */}
                          <div className="px-6 pb-2">
                            {renderSpectrumBar(domainMode)}
                          </div>

                          {/* Content */}
                          {renderDomainContent(di, domainMode, `domain-${activeDomain}`)}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* ── Default: 2x2 Compass Grid ── */
                  <div className="relative">
                    <div className="grid grid-cols-2 gap-3">
                      {domainInsights.map((di, i) => (
                        <button key={i}
                          onClick={() => { setActiveDomain(i); setDomainMode('react'); }}
                          className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-left hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:scale-[1.02] transition-all duration-200 sr-card group"
                          style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                        >
                          <span className="text-xl block mb-2 group-hover:scale-110 transition-transform inline-block">
                            {domainIcons[di.domain] || '\u25C6'}
                          </span>
                          <p className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#2C2C2C] mb-1">
                            {di.domain}
                          </p>
                          <p className="font-sans text-[0.75rem] text-[#9B9590] leading-snug">
                            {domainTeasers[di.domain] || 'Explore this domain'}
                          </p>
                          {/* Hover preview */}
                          {di.react && (
                            <p className="font-sans text-[0.7rem] text-[#6B6B6B] mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                              {di.react.slice(0, 80)}{di.react.length > 80 ? '\u2026' : ''}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                    {/* Center crosshair decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-6 h-6 border border-[#E8E4E0] rounded-full opacity-40" />
                    </div>
                  </div>
                )}

                {/* Compare All toggle */}
                <div className="flex justify-center">
                  <button
                    onClick={() => { setDomainCompareAll(!domainCompareAll); setActiveDomain(null); }}
                    className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[#9B9590] hover:text-[#2563EB] transition-colors py-2"
                  >
                    {domainCompareAll ? '\u2190 Back to Compass' : 'Compare All Domains \u2192'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-6">
                <p className="font-sans text-sm text-[#9B9590] leading-relaxed">
                  Domain insights develop as the assessment explores relationships, wealth, leadership, and transformation.
                  A longer or deeper assessment conversation will generate richer insights here.
                </p>
              </div>
            )}
            {continueButton}
          </div>
        );
      }

      // ── Section 7: React/Respond Deep Dive (already covered section 2, show OYN 2col) ──
      // Actually per spec: 11 sections 0-10. Let me use this for Wing detail already shown
      // Let me re-map to have the right 11 sections as specified in the plan brief

      // ── Section 7: Full Assessment Summary ──
      case 7: {
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sr-card" style={{ animationDelay: '0.1s' }}>
              <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#9B9590] mb-4">
                Your Full Profile
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm text-[#6B6B6B]">Type</span>
                  <span className="font-sans text-sm font-semibold text-[#2C2C2C]">{leadingType} — {typeName}</span>
                </div>
                {dsName && (
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm text-[#6B6B6B]">Defiant Spirit Name</span>
                    <span className="font-sans text-sm font-semibold text-[#7A9E7E]">{dsName}</span>
                  </div>
                )}
                {wing && (
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm text-[#6B6B6B]">Wing</span>
                    <span className="font-sans text-sm font-semibold text-[#2C2C2C]">{wing}</span>
                  </div>
                )}
                {variant && (
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm text-[#6B6B6B]">Instinctual Variant</span>
                    <span className="font-sans text-sm font-semibold text-[#2C2C2C]">{variant}</span>
                  </div>
                )}
                {tritype && (
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm text-[#6B6B6B]">Tritype</span>
                    <span className="font-sans text-sm font-semibold text-[#2C2C2C]">{tritype}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[#E8E4E0] pt-3 mt-1">
                  <span className="font-sans text-sm text-[#6B6B6B]">Confidence</span>
                  <span className="font-sans text-sm font-semibold text-[#2563EB]">{confidencePct}%</span>
                </div>
              </div>
            </div>
            {continueButton}
          </div>
        );
      }

      // ── Section 8: Email delivery ──
      // case 8: removed — email merged into combined final page (case 9)

      // ── Section 9: The Sendoff ──
      case 9: {
        const ess = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];

        return (
          <div className="flex flex-col w-full max-w-[900px] items-center gap-10">

            {/* ═══ HERO HEADLINE — sets the page purpose ═══ */}
            <div className="text-center max-w-xl sr-card" style={{ animationDelay: '0.05s' }}>
              <h1 className="font-serif text-[2.4rem] font-bold text-[#2C2C2C] leading-tight mb-4">
                Your Journey Begins Here
              </h1>
              <p className="font-serif text-[1.05rem] text-[#6B6B6B] leading-[1.85]">
                The number is not the destination. It is the starting point of the return to wholeness. You have everything you need to choose differently.
              </p>
            </div>

            {/* ═══ PERSONAL CLOSING — Baruch's message to this person ═══ */}
            {defy && (
              <div
                className="rounded-2xl w-full relative overflow-hidden sr-card"
                style={{
                  background: `linear-gradient(155deg, ${ess.colors[0]} 0%, #1E293B 50%, #0F172A 100%)`,
                  animationDelay: '0.15s',
                }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 30%, ${ess.colors[1]}10 0%, transparent 60%)` }} />
                {/* Subtle circle — wholeness */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.05 }}>
                  <svg viewBox="0 0 100 100" width="400" height="400">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.2" />
                  </svg>
                </div>
                <div className="relative z-10 px-10 py-10 text-center">
                  <p className="font-serif text-[1.1rem] text-[#FAF8F5]/85 leading-[2] max-w-lg mx-auto">
                    {defy}
                  </p>
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="w-12 h-px" style={{ background: `linear-gradient(to right, transparent, ${ess.colors[1]}40, transparent)` }} />
                    <p className="font-serif italic text-[1rem] leading-[1.8]"
                      style={{ color: ess.colors[2] }}>
                      {closing}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TWO-COLUMN: CARD + EMAIL — side by side, distinct ═══ */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

              {/* LEFT: Download your type card */}
              <div className="sr-card flex flex-col" style={{ animationDelay: '0.35s' }}>
                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center gap-5 h-full">
                  <div className="text-center">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[#9B9590] mb-1">Save &amp; Share</p>
                    <p className="font-serif text-[1.15rem] font-semibold text-[#2C2C2C]">Your Type Card</p>
                    <p className="font-sans text-[0.8rem] text-[#9B9590] mt-1">Download or share your personalized card.</p>
                  </div>
                  <div className="w-full overflow-hidden rounded-xl flex justify-center">
                    <ShareCard results={r} visible={true} />
                  </div>
                </div>
              </div>

              {/* RIGHT: Get your PDF report */}
              <div className="sr-card flex flex-col" style={{ animationDelay: '0.5s' }}>
                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col h-full">
                  <div className="text-center mb-5">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[#9B9590] mb-1">Your Full Report</p>
                    <p className="font-serif text-[1.15rem] font-semibold text-[#2C2C2C]">Get the PDF</p>
                    <p className="font-sans text-[0.8rem] text-[#9B9590] mt-1 leading-relaxed">
                      Every insight, every pattern, your path from reaction to response — delivered to your inbox.
                    </p>
                  </div>

                  {/* Preview of what's inside */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="bg-[#FAF8F5] rounded-xl p-5 mb-5">
                      <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">What&apos;s included</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Superpower & Kryptonite', 'React & Respond Patterns', 'OYN Dimensions', 'Wing & Variant Analysis', 'Stress & Release Lines', 'Domain Insights'].map((item) => (
                          <div key={item} className="flex items-start gap-2">
                            <span className="text-[#7A9E7E] text-xs mt-0.5">&#10003;</span>
                            <span className="font-sans text-[0.75rem] text-[#6B6B6B] leading-snug">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {emailStatus === 'sent' ? (
                      <div className="bg-[#E8F0E8] rounded-xl p-5 text-center">
                        <p className="font-sans text-sm text-[#7A9E7E] font-semibold">Report sent!</p>
                        <p className="font-sans text-xs text-[#9B9590] mt-1">Check your inbox.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full rounded-xl px-4 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
                        />
                        <button
                          onClick={sendEmail}
                          disabled={!emailInput.trim() || emailStatus === 'sending'}
                          className="w-full font-sans text-sm rounded-xl px-5 py-3 bg-[#2563EB] text-white font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors"
                        >
                          {emailStatus === 'sending' ? 'Sending…' : 'Send My Report'}
                        </button>
                        {emailStatus === 'error' && (
                          <p className="font-sans text-xs text-[#1E3A8A] text-center">
                            Could not send — please try again.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ CLOSING TRUTH ═══ */}
            <div className="text-center py-2 sr-card" style={{ animationDelay: '0.7s' }}>
              <p className="font-serif text-[0.95rem] text-[#9B9590] leading-relaxed">
                You are not a number. You are never a number.
              </p>
              <p className="font-serif text-[0.95rem] font-semibold mt-1" style={{ color: ess.colors[1] }}>
                You are a defiant spirit.
              </p>
            </div>
          </div>
        );
      }

      // case 10: removed — share card merged into combined final page (case 9)

      // ── Section 11: Explore Your Type — Tabbed Discovery Area (standalone) ──
      case 11: {
        return (
          <div className="flex flex-col gap-0 max-w-[780px] w-full">
            {renderExploreArea()}
            {continueButton}
          </div>
        );
      }

      // ── Section 12: Relationship Wheel ──
      case 12: {
        const relDesc = (r.relationship_descriptions as Record<string, { label: string; description: string }>) || {};
        const coreType = leadingType;
        const stressType12 = STRESS_LINES[coreType] || 4;
        const releaseType12 = RELEASE_LINES[coreType] || 7;
        const wingAdj12 = getWingTypes(coreType);
        const typeScoresMap = (r.type_scores as Record<string, number>) ?? {};
        const allScoresSorted = Object.entries(typeScoresMap).map(([t, s]) => ({ type: Number(t), score: s })).sort((a, b) => b.score - a.score);
        const lowestType12 = allScoresSorted.length > 0 ? allScoresSorted[allScoresSorted.length - 1] : null;
        const tritypeDigits12 = tritype.replace(/\D/g, '').split('').map(Number);

        function getEnergyLabel(typeNum: number): string {
          const labels: string[] = [];
          if (typeNum === coreType) return 'YOUR HOME BASE';
          if (stressType12 === typeNum) labels.push('STRESS LINE');
          if (releaseType12 === typeNum) labels.push('RELEASE LINE');
          if (wingAdj12.includes(typeNum)) labels.push('YOUR WING');
          if (tritypeDigits12.includes(typeNum) && typeNum !== coreType) labels.push(`${CENTER_MAP[typeNum]?.toUpperCase()} TRITYPE`);
          if (lowestType12 && lowestType12.type === typeNum) labels.push('LEAST ACTIVE');
          if (labels.length > 0) return labels.join(' · ');
          const key = String(typeNum);
          if (relDesc[key]?.label) return relDesc[key].label;
          return `${CENTER_MAP[typeNum]?.toUpperCase() || ''} CENTER`;
        }

        function getEnergyDescription(typeNum: number): string {
          const key = String(typeNum);
          const score = typeScoresMap[key] ?? 0;
          const pct = Math.round(score * 100);
          const parts: string[] = [];

          if (relDesc[key]?.description) {
            parts.push(relDesc[key].description);
          } else if (stressType12 === typeNum) {
            parts.push(`Under pressure, your energy moves here. This is the pattern that takes over when fear is in charge — not who you are, but where your survival strategy pulls you.`);
          } else if (releaseType12 === typeNum) {
            parts.push(`In growth, you access this energy. This is what opens when you choose to respond rather than react — the space between stimulus and response where your freedom lives.`);
          } else if (wingAdj12.includes(typeNum)) {
            const wingIdx = wingAdj12.indexOf(typeNum);
            const wingStrength = wingIdx === 0 ? (wingSignals.left ?? 0) : (wingSignals.right ?? 0);
            parts.push(`This energy flavors how your core pattern expresses itself — you carry ${Math.round(wingStrength * 100)}% of this wing's influence. It shapes your style without changing your motivation.`);
          } else {
            const center = CENTER_MAP[typeNum];
            const coreCenter = CENTER_MAP[coreType];
            if (center === coreCenter) {
              parts.push(`This type shares your ${center} center. The same intelligence drives both patterns, but expresses differently — understanding it illuminates a different face of your own energy.`);
            } else {
              parts.push(`This energy operates from the ${center} center. It offers something your ${coreCenter}-dominant pattern doesn't naturally access — and that's precisely why it matters.`);
            }
          }

          if (lowestType12 && lowestType12.type === typeNum) {
            parts.push(`This is your least active energy at ${pct}%. The qualities you access least often are often the ones that hold the most growth potential.`);
          } else if (pct > 0) {
            parts.push(`This energy is ${pct}% active within you.`);
          }

          if (tritypeDigits12.includes(typeNum) && typeNum !== coreType) {
            parts.push(`As part of your tritype, this is your representative in the ${CENTER_MAP[typeNum]} center — one of the three core lenses through which you process experience.`);
          }

          return parts.join(' ');
        }

        function getEnergyColor(typeNum: number): string {
          if (stressType12 === typeNum) return '#DC2626';
          if (releaseType12 === typeNum) return '#2563EB';
          if (typeNum === coreType) return '#2563EB';
          const center = CENTER_MAP[typeNum];
          if (center === 'Body') return '#92400E';
          if (center === 'Heart') return '#9D174D';
          return '#1E40AF';
        }

        return (
          <div className="flex flex-col gap-5 max-w-[800px] w-full">
            {/* Section header */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">The Circle Is Wholeness</p>
              <h2 className="font-serif text-[1.5rem] font-bold text-[#2C2C2C]">The Energies Within You</h2>
              <p className="font-sans text-[0.85rem] text-[#6B6B6B] mt-1 max-w-md mx-auto leading-relaxed">
                You are not a single type — you are the entire circle. Every energy lives in you at different strengths. Tap any point to explore.
              </p>
            </div>

            <div className="flex gap-6 items-start flex-wrap">
              {/* The wheel */}
              <div className="flex flex-col items-center gap-3">
                <RelationshipWheel
                  leadingType={coreType}
                  tritypeTypes={
                    tritype
                      ? (() => {
                          const digits = tritype.replace(/\D/g, '').split('').map(Number);
                          return {
                            body: digits.find(d => [8,9,1].includes(d)) || coreType,
                            heart: digits.find(d => [2,3,4].includes(d)) || 2,
                            head: digits.find(d => [5,6,7].includes(d)) || 5,
                          };
                        })()
                      : null
                  }
                  stressType={stressType12}
                  releaseType={releaseType12}
                  relationshipDescriptions={relDesc}
                  onTypeHover={setHoveredRelType}
                  hoveredType={hoveredRelType}
                  size={340}
                  typeScores={typeScoresMap}
                />
                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#DC2626]" style={{ borderTop: '2px dashed #DC2626' }} /><span className="font-sans text-[0.6rem] text-[#9B9590]">Stress</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#2563EB]" /><span className="font-sans text-[0.6rem] text-[#9B9590]">Release</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-[#9B9590] opacity-40" /><span className="font-sans text-[0.6rem] text-[#9B9590]">Score ring</span></div>
                </div>
              </div>

              {/* Energy info card */}
              <div className="flex-1 min-w-[260px] bg-white border border-[#E8E4E0] rounded-2xl p-7 min-h-[300px] flex flex-col justify-center transition-all duration-200">
                {hoveredRelType === null ? (
                  <div className="text-center">
                    <p className="font-serif text-[1.1rem] text-[#2C2C2C] mb-2">Explore the circle</p>
                    <p className="font-sans text-[0.85rem] text-[#9B9590] leading-relaxed">
                      Tap or hover any point to see how that energy lives within you. The larger the ring, the stronger the presence.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Label tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {getEnergyLabel(hoveredRelType).split(' · ').map((tag, i) => (
                        <span key={i} className="font-mono text-[0.55rem] uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{
                            color: hoveredRelType === coreType ? '#2563EB' : getEnergyColor(hoveredRelType),
                            background: hoveredRelType === coreType ? '#EFF6FF' : `${getEnergyColor(hoveredRelType)}10`,
                            border: `1px solid ${hoveredRelType === coreType ? '#DBEAFE' : getEnergyColor(hoveredRelType)}20`,
                          }}
                        >{tag}</span>
                      ))}
                    </div>
                    {/* Big number + name */}
                    <div className="flex items-end gap-3 mb-3">
                      <span className="font-serif font-bold text-[3rem] leading-none" style={{ color: getEnergyColor(hoveredRelType) }}>
                        {hoveredRelType}
                      </span>
                      <div className="pb-1">
                        <span className="font-serif text-lg text-[#2C2C2C]">{TYPE_NAMES[hoveredRelType]}</span>
                        {typeScoresMap[String(hoveredRelType)] !== undefined && (
                          <span className="font-sans text-xs text-[#9B9590] ml-2">{Math.round((typeScoresMap[String(hoveredRelType)] ?? 0) * 100)}% active</span>
                        )}
                      </div>
                    </div>
                    {/* Description */}
                    <p className="font-sans text-[0.88rem] text-[#2C2C2C] leading-[1.7]">
                      {hoveredRelType === coreType
                        ? ((r.core_type_description as string) || `This is your home base — the pattern you know most intimately. The work isn't to escape it. It's to choose it consciously.`)
                        : getEnergyDescription(hoveredRelType)
                      }
                    </p>

                    {/* Practical layer — embodiment + own it (not for core type) */}
                    {hoveredRelType !== coreType && (() => {
                      const relKey = String(hoveredRelType);
                      const relData = relDesc[relKey] as { label?: string; description?: string; embodiment?: string; own_it?: string } | undefined;
                      const embodiment = relData?.embodiment || '';
                      const ownIt = relData?.own_it || '';
                      if (!embodiment && !ownIt) return null;
                      return (
                        <>
                          <div className="w-full h-px my-3" style={{ background: `linear-gradient(to right, transparent, ${getEnergyColor(hoveredRelType)}20, transparent)` }} />
                          {embodiment && (
                            <div className="mb-2">
                              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-[#9B9590] mb-1">What This Looks Like</p>
                              <p className="font-sans text-[0.82rem] text-[#4B5563] leading-[1.7]">{embodiment}</p>
                            </div>
                          )}
                          {ownIt && (
                            <div className="rounded-lg px-4 py-3 mt-1" style={{ background: `${getEnergyColor(hoveredRelType)}08` }}>
                              <p className="font-serif italic text-[0.85rem] leading-[1.7]" style={{ color: getEnergyColor(hoveredRelType) }}>
                                {ownIt}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Integration message */}
            <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #F0F4FF, #FAF8F5)' }}>
              <p className="font-serif italic text-[0.95rem] text-[#4B5563] leading-[1.8]">
                The circle is wholeness. The work is return. You are not fixed at any single point — you are the entire wheel, learning to move through it consciously.
              </p>
            </div>

            {continueButton}
          </div>
        );
      }

      // ── Section 13: Stress & Release Lines ──
      case 13: {
        const coreType = leadingType;
        const stressType = STRESS_LINES[coreType] || 0;
        const releaseType = RELEASE_LINES[coreType] || 0;
        const stressDesc = (r.stress_line_description as string) || '';
        const stressTriggers = (r.stress_line_triggers as string) || '';
        const releaseDesc = (r.release_line_description as string) || '';
        const releaseAccess = (r.release_line_access as string) || '';

        // Check if lowest/highest types fall on stress/release lines
        const allScores = Object.entries(
          (r as Record<string, unknown>).type_scores as Record<string, number> ?? {}
        ).map(([t, s]) => ({ type: Number(t), score: s })).sort((a, b) => b.score - a.score);
        const lowestT = allScores.length > 0 ? allScores[allScores.length - 1] : null;
        const lowestIsRelease = lowestT ? lowestT.type === releaseType : false;
        const highSecondary = allScores.length > 1 ? allScores[1] : null;
        const secondaryIsStress = highSecondary ? highSecondary.type === stressType : false;

        // SVG geometry helper
        const CIRCLE_ORDER = [9, 1, 2, 3, 4, 5, 6, 7, 8];
        function getPt(typeNum: number): { x: number; y: number } {
          const idx = CIRCLE_ORDER.indexOf(typeNum);
          if (idx === -1) return { x: 50, y: 50 };
          const angle = (idx * 40 * Math.PI) / 180;
          return { x: 50 + 38 * Math.sin(angle), y: 50 - 38 * Math.cos(angle) };
        }

        const corePt = getPt(coreType);
        const stressPt = getPt(stressType);
        const releasePt = getPt(releaseType);

        return (
          <div className="flex flex-col gap-6 max-w-[600px] w-full">
            <div className="sr-card" style={{ animationDelay: '0.1s' }}>
              <h2 className="font-serif text-[1.6rem] font-bold text-[#2C2C2C] mb-1">
                Your Stress & Release Lines
              </h2>
              <p className="font-sans text-[0.85rem] text-[#6B6B6B] leading-relaxed">
                Every type has two directional lines — where you go under pressure and where you go in growth.
                These aren&apos;t flaws or goals. They&apos;re the patterns your energy follows when fear runs the show and when you choose consciously.
              </p>
            </div>

            {/* Enneagram diagram — stress/release lines highlighted */}
            <div className="flex justify-center py-4">
              <svg viewBox="0 0 100 100" width={280} height={280} style={{ overflow: 'visible' }}>
                {/* Outer circle */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E4E0" strokeWidth="0.5" />

                {/* All internal lines (faint) */}
                {/* Triangle 3-6-9 */}
                {[[3,6],[6,9],[9,3]].map(([a,b]) => {
                  const pa = getPt(a); const pb = getPt(b);
                  return <line key={`t-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#E8E4E0" strokeWidth="0.3" />;
                })}
                {/* Hexad 1-4-2-8-5-7 */}
                {[[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]].map(([a,b]) => {
                  const pa = getPt(a); const pb = getPt(b);
                  return <line key={`h-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#E8E4E0" strokeWidth="0.3" />;
                })}

                {/* Stress line — red dashed */}
                <line
                  x1={corePt.x} y1={corePt.y} x2={stressPt.x} y2={stressPt.y}
                  stroke="#DC2626" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7"
                />
                {/* Release line — blue solid */}
                <line
                  x1={corePt.x} y1={corePt.y} x2={releasePt.x} y2={releasePt.y}
                  stroke="#2563EB" strokeWidth="1.2" opacity="0.7"
                />

                {/* All 9 points */}
                {CIRCLE_ORDER.map((t) => {
                  const p = getPt(t);
                  const isCore = t === coreType;
                  const isStress = t === stressType;
                  const isRelease = t === releaseType;
                  const color = isCore ? '#2563EB' : isStress ? '#DC2626' : isRelease ? '#2563EB' : '#9B9590';
                  const radius = isCore ? 5 : (isStress || isRelease) ? 3.5 : 2.5;
                  return (
                    <g key={`pt-${t}`}>
                      <circle cx={p.x} cy={p.y} r={radius} fill={color} opacity={isCore ? 1 : 0.7} />
                      <text
                        x={p.x} y={p.y < 20 ? p.y - 7 : p.y > 75 ? p.y + 10 : p.y}
                        dx={p.x > 70 ? 7 : p.x < 30 ? -7 : 0}
                        textAnchor="middle" fill={color} fontSize="4.5" fontFamily="serif" fontWeight={isCore ? 'bold' : 'normal'}
                      >
                        {t}
                      </text>
                      {isCore && (
                        <text x={p.x} y={p.y + (p.y < 50 ? -10 : 13)} textAnchor="middle" fill="#2563EB" fontSize="3" fontFamily="sans-serif" fontWeight="bold" letterSpacing="0.1em">
                          YOU
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Labels on the lines */}
                <text x={(corePt.x + stressPt.x) / 2 + 3} y={(corePt.y + stressPt.y) / 2 - 2} fill="#DC2626" fontSize="3" fontFamily="sans-serif" opacity="0.8">
                  STRESS
                </text>
                <text x={(corePt.x + releasePt.x) / 2 + 3} y={(corePt.y + releasePt.y) / 2 - 2} fill="#2563EB" fontSize="3" fontFamily="sans-serif" opacity="0.8">
                  RELEASE
                </text>
              </svg>
            </div>

            {/* Stress Line */}
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-l-4 border-[#DC2626] sr-card" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#DC2626] font-bold">
                  Stress Line
                </span>
                <span className="font-sans text-sm text-[#6B6B6B]">
                  → Type {stressType} ({TYPE_NAMES[stressType] || ''})
                </span>
              </div>
              <p className="font-sans text-[0.92rem] text-[#2C2C2C] leading-relaxed mb-3">
                {stressDesc || `Under pressure, you take on qualities of Type ${stressType}. This is where your energy goes when the survival strategy takes over.`}
              </p>
              {stressTriggers && (
                <div className="bg-[#FEF2F2] rounded-xl p-4">
                  <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[#DC2626] mb-1">Triggers</p>
                  <p className="font-sans text-[0.85rem] text-[#6B6B6B] leading-relaxed">{stressTriggers}</p>
                </div>
              )}
              {secondaryIsStress && highSecondary && (
                <p className="font-sans text-xs text-[#DC2626] mt-3 italic">
                  Type {stressType} scored as your second-strongest type — this stress pattern may be highly active in your life right now.
                </p>
              )}
            </div>

            {/* Release Line */}
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-l-4 border-[#2563EB] sr-card" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#2563EB] font-bold">
                  Release Line
                </span>
                <span className="font-sans text-sm text-[#6B6B6B]">
                  → Type {releaseType} ({TYPE_NAMES[releaseType] || ''})
                </span>
              </div>
              <p className="font-sans text-[0.92rem] text-[#2C2C2C] leading-relaxed mb-3">
                {releaseDesc || `In growth, you access qualities of Type ${releaseType}. This is the energy that opens up when you choose to respond rather than react.`}
              </p>
              {releaseAccess && (
                <div className="bg-[#EFF6FF] rounded-xl p-4">
                  <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[#2563EB] mb-1">How to access this</p>
                  <p className="font-sans text-[0.85rem] text-[#6B6B6B] leading-relaxed">{releaseAccess}</p>
                </div>
              )}
              {lowestIsRelease && lowestT && (
                <p className="font-sans text-xs text-[#2563EB] mt-3 italic">
                  Type {releaseType} is your lowest-scoring type — this may explain difficulty accessing this state of release. The energy is there; it&apos;s the one you haven&apos;t learned to reach for yet.
                </p>
              )}
            </div>

            {continueButton}
          </div>
        );
      }

      // ── Section 14: Complete Analysis ──
      case 14: {
        const coreType = leadingType;
        const wingAdjFull = getWingTypes(coreType);
        const wingLeftVal = wingSignals.left ?? 0;
        const wingRightVal = wingSignals.right ?? 0;
        const dominantWingFull = wingLeftVal > wingRightVal ? wingAdjFull[0] : wingAdjFull[1];
        const variantEntriesFull = Object.entries(variantSignals).sort(([, a], [, b]) => b - a);
        const dominantVariantFull = variantEntriesFull[0]?.[0] ?? '—';
        const typeScoresObj = (r.type_scores as Record<string, number>) ?? {};
        const sortedScores = Object.entries(typeScoresObj).sort(([, a], [, b]) => b - a);
        const oynData = (r.oyn_summary as Record<string, string>) ?? (r.oyn_dimensions as Record<string, string>) ?? {};
        const oynEntriesFull = Object.entries(oynData).filter(([, v]) => typeof v === 'string' && v.trim());
        const reactPattern = (r.react_pattern as string) || (r.defiant_spirit as Record<string, string>)?.react_pattern_observed || '';
        const respondPathway = (r.respond_pathway as string) || (r.defiant_spirit as Record<string, string>)?.respond_glimpsed || '';
        const stressTypeFull = STRESS_LINES[coreType] || 0;
        const releaseTypeFull = RELEASE_LINES[coreType] || 0;
        const wholeSigs = (r.whole_type_signals as Record<string, number>) ?? {};

        // Clickable section header — pronounced, with hover-reveal questions
        function SectionHeader({ title, chatKey }: { title: string; chatKey: string }) {
          const qs = [
            { 'Type Scores': 'Why did I score highest here?', 'Center Activation': 'What does this mean for me?', 'Instinctual Variants': 'How does this affect my relationships?', 'Defiant Spirit Patterns': 'How do I practice the respond pathway?', 'Lines of Movement': 'How do I access my release line?', 'OYN Dimensions': 'Which dimension should I focus on?' }[chatKey] || 'Tell me more about this',
          ];
          return (
            <div className="group relative mb-4">
              <div className="flex items-center justify-between">
                <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590]">{title}</p>
                <button
                  onClick={() => setChatSection(chatKey)}
                  className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#DBEAFE] hover:border-[#93C5FD] rounded-lg px-3 py-1.5 transition-all"
                >
                  <SouloOrb size={16} />
                  <span className="font-sans text-[0.7rem] font-semibold text-[#2563EB]">Ask Soulo</span>
                </button>
              </div>
              {/* Hover-reveal quick question */}
              <div className="absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={() => { setChatSection(chatKey); }}
                  className="bg-white shadow-lg border border-[#E8E4E0] rounded-xl px-4 py-2.5 font-sans text-xs text-[#2563EB] hover:bg-[#EFF6FF] transition-colors whitespace-nowrap"
                >
                  {qs[0]}
                </button>
              </div>
            </div>
          );
        }

        // Helper: mini enneagram SVG for Lines of Movement
        const CIRCLE_ORDER = [9,1,2,3,4,5,6,7,8];
        function gp(t: number) {
          const i = CIRCLE_ORDER.indexOf(t);
          if (i === -1) return { x: 50, y: 50 };
          const a = (i * 40 * Math.PI) / 180;
          return { x: 50 + 38 * Math.sin(a), y: 50 - 38 * Math.cos(a) };
        }

        // Tritype data
        const tritypeDigits = tritype.replace(/\D/g, '').split('').map(Number);
        const centerColors: Record<string, { bg: string; text: string; label: string }> = {
          Body: { bg: '#FEF3C7', text: '#92400E', label: 'Body' },
          Heart: { bg: '#FCE7F3', text: '#9D174D', label: 'Heart' },
          Head: { bg: '#DBEAFE', text: '#1E40AF', label: 'Head' },
        };
        const allTypeScores = Object.entries(typeScoresObj).map(([t, s]) => ({ type: Number(t), score: s })).sort((a, b) => b.score - a.score);
        const top3Overall = allTypeScores.slice(0, 3);
        const lowestType = allTypeScores.length > 0 ? allTypeScores[allTypeScores.length - 1] : null;
        const lowestOnStressLine = lowestType ? STRESS_LINES[coreType] === lowestType.type : false;
        const lowestOnReleaseLine = lowestType ? RELEASE_LINES[coreType] === lowestType.type : false;
        const wingLeft = wingSignals.left ?? 0;
        const wingRight = wingSignals.right ?? 0;
        const wingAdj = getWingTypes(coreType);

        // Section nav items
        const navItems = [
          { id: 'scores', label: 'Scores' },
          { id: 'powers', label: 'Powers' },
          { id: 'wing', label: 'Wing' },
          { id: 'tritype', label: 'Tritype' },
          { id: 'spirit', label: 'Spirit' },
          { id: 'lines', label: 'Lines' },
          { id: 'domains', label: 'Domains' },
          { id: 'oyn', label: 'OYN' },
          { id: 'explore', label: 'Explore' },
        ];

        return (
          <div className="flex flex-col gap-6 w-full max-w-[960px]">

            {/* ═══ TYPE HERO — full width banner ═══ */}
            <ScrollReveal>
            <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] rounded-2xl p-8 text-white">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                    <span className="font-serif text-[2.5rem] font-bold text-white leading-none">{coreType}</span>
                  </div>
                  <div>
                    <h2 className="font-serif text-[1.8rem] font-bold text-white leading-tight">{typeName}</h2>
                    {dsName && <p className="font-sans text-[0.85rem] text-[#7A9E7E] mt-0.5">{dsName}</p>}
                    <p className="font-sans text-[0.75rem] text-white/50 mt-0.5">{CENTER_MAP[coreType]} Center</p>
                  </div>
                </div>
                <div className="ml-auto flex gap-6 flex-wrap">
                  {[
                    { label: 'Confidence', value: `${confidencePct}%` },
                    { label: 'Wing', value: `${coreType}w${dominantWingFull}` },
                    { label: 'Variant', value: dominantVariantFull },
                    { label: 'Tritype', value: tritype },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <span className="font-sans text-[0.55rem] uppercase tracking-widest text-white/40 block">{m.label}</span>
                      <span className="font-serif text-xl font-bold text-white">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* ═══ SECTION NAV — horizontal scroll pills ═══ */}
            <div className="sticky top-0 z-20 bg-[#FAF8F5]/95 backdrop-blur-sm py-2 -mx-2 px-2 rounded-xl">
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {navItems.map(item => (
                  <a
                    key={item.id}
                    href={`#ca-${item.id}`}
                    className="flex-shrink-0 font-sans text-[0.7rem] font-semibold px-3 py-1.5 rounded-full bg-white border border-[#E0DAD4] text-[#6B6B6B] hover:border-[#2563EB] hover:text-[#2563EB] transition-all whitespace-nowrap"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* ═══ TYPE SCORES ═══ */}
            {sortedScores.length > 0 && (
              <ScrollReveal>
              <div id="ca-scores" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
                <SectionHeader title="Type Scores" chatKey="Type Scores" />
                <div className="flex flex-col gap-2.5">
                  {sortedScores.map(([type, score], idx) => {
                    const pct = Math.min(100, Math.round(score * 100));
                    const isLead = Number(type) === coreType;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className={`font-sans text-sm w-16 ${isLead ? 'font-bold text-[#2563EB]' : 'text-[#6B6B6B]'}`}>Type {type}</span>
                        <AnimatedBar percent={pct} color={isLead ? '#2563EB' : '#93C5FD'} delay={200 + idx * 80} numberClassName={isLead ? 'font-bold text-[#2563EB]' : 'text-[#9B9590]'} />
                      </div>
                    );
                  })}
                </div>
              </div>
              </ScrollReveal>
            )}

            {/* ═══ SUPERPOWER & KRYPTONITE ═══ */}
            <div id="ca-powers" className="grid grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-16">
              <ScrollReveal>
              <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] h-full">
                <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Your Superpower</p>
                <p className="font-serif text-[0.95rem] text-[#2C2C2C] leading-[1.8]">
                  {superpower || (r.superpower_description as string) || ''}
                </p>
              </div>
              </ScrollReveal>
              <ScrollReveal>
              <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] h-full">
                <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Your Kryptonite</p>
                <p className="font-serif text-[0.95rem] text-[#2C2C2C] leading-[1.8]">
                  {kryptonite || (r.kryptonite_description as string) || ''}
                </p>
              </div>
              </ScrollReveal>
            </div>

            {/* ═══ WING + VARIANTS + CENTERS — side by side ═══ */}
            <div id="ca-wing" className="grid grid-cols-1 md:grid-cols-3 gap-4 scroll-mt-16">
              {/* Wing Detail */}
              <ScrollReveal>
              <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Your Wing</p>
                <p className="font-serif text-[1.4rem] font-bold text-[#2C2C2C] mb-3">{coreType}w{dominantWingFull}</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: `Type ${wingAdj[0]}`, val: wingLeft },
                    { label: `Type ${wingAdj[1]}`, val: wingRight },
                  ].map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-sans text-xs text-[#6B6B6B] w-16 flex-shrink-0">{w.label}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden">
                        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, Math.round(w.val * 100))}%` }} />
                      </div>
                      <span className="font-sans text-xs text-[#9B9590] w-8 text-right">{Math.round(w.val * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              </ScrollReveal>

              {/* Instinctual Variants */}
              {variantEntriesFull.length > 0 && (
                <ScrollReveal>
                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <SectionHeader title="Instinctual Variants" chatKey="Instinctual Variants" />
                  <div className="flex flex-col gap-2">
                    {variantEntriesFull.map(([vk, vv]) => (
                      <div key={vk} className="flex items-center gap-2">
                        <span className="font-sans text-xs font-semibold w-8 text-[#6B6B6B]">{vk}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden">
                          <div className="h-full rounded-full bg-[#7A9E7E]" style={{ width: `${Math.min(100, Math.round(vv * 100))}%` }} />
                        </div>
                        <span className="font-sans text-xs text-[#9B9590] w-8 text-right">{Math.round(vv * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                </ScrollReveal>
              )}

              {/* Center Activation */}
              {(wholeSigs.body || wholeSigs.heart || wholeSigs.head) && (
                <ScrollReveal>
                <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <SectionHeader title="Center Activation" chatKey="Center Activation" />
                  <div className="flex flex-col gap-2">
                    {(['body', 'heart', 'head'] as const).map((c) => {
                      const val = wholeSigs[c] ?? 0;
                      const pct = Math.round(val * 100);
                      const clrs: Record<string, string> = { body: '#2563EB', heart: '#60A5FA', head: '#7A9E7E' };
                      return (
                        <div key={c} className="flex items-center gap-2">
                          <span className="font-sans text-xs font-semibold capitalize text-[#2C2C2C] w-12">{c}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: clrs[c] }} />
                          </div>
                          <span className="font-sans text-xs text-[#9B9590] w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </ScrollReveal>
              )}
            </div>

            {/* ═══ TRITYPE — with colored center cards ═══ */}
            <ScrollReveal>
            <div id="ca-tritype" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
              <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-2">Your Tritype</p>
              <p className="font-sans text-[0.8rem] text-[#6B6B6B] mb-5">Your dominant type in each of the three intelligence centers: Body, Heart, and Head.</p>
              {tritype ? (
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div>
                    <p className="font-serif text-[2.5rem] font-bold text-[#2C2C2C] leading-none mb-2">{tritypeDigits.join(' – ')}</p>
                    {tritypeConfidence > 0 && <p className="font-sans text-xs text-[#9B9590]">{Math.round(tritypeConfidence * 100)}% confidence</p>}
                    {tritypeArchetype && (
                      <div className="bg-[#FAF8F5] rounded-lg px-3 py-2 mt-3 inline-block">
                        <span className="font-sans text-[0.7rem] text-[#9B9590]">Archetype: </span>
                        <span className="font-sans text-sm font-semibold text-[#2C2C2C]">{tritypeArchetype}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    {tritypeDigits.map((digit, i) => {
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
              ) : (
                <p className="font-sans text-sm text-[#9B9590]">Tritype data is still forming.</p>
              )}

              {/* Top 3 + Lowest type */}
              {top3Overall.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Strongest Types Overall</p>
                    <div className="flex flex-col gap-2">
                      {top3Overall.map((t, i) => (
                        <div key={t.type} className="flex items-center gap-3">
                          <span className="font-serif text-lg font-bold w-8 text-[#2C2C2C]">{t.type}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(t.score * 100))}%`, backgroundColor: i === 0 ? '#2563EB' : i === 1 ? '#60A5FA' : '#93C5FD' }} />
                          </div>
                          <span className="font-sans text-xs text-[#9B9590] w-20 text-right">{TYPE_NAMES[t.type] || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {lowestType && lowestType.type > 0 && (
                    <div className="bg-[#FAF8F5] rounded-xl p-5">
                      <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-2">Least Active Pattern</p>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-serif text-xl font-bold text-[#9B9590]">{lowestType.type}</span>
                        <span className="font-sans text-sm text-[#6B6B6B]">{TYPE_NAMES[lowestType.type] || ''}</span>
                      </div>
                      {(lowestOnStressLine || lowestOnReleaseLine) && (
                        <p className="font-sans text-xs text-[#6B6B6B] leading-relaxed">
                          {lowestOnReleaseLine && <>This is your release line — the energy you move toward in growth. Low activation here may explain difficulty accessing that state.</>}
                          {lowestOnStressLine && <>This is your stress line — the pattern you fall into under pressure. Low activation here suggests this pattern is less familiar to you.</>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Center Insights */}
              {Object.keys(centerInsights).length > 0 && (
                <div className="mt-5">
                  <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Center Insights</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(centerInsights).map(([center, insight]) => (
                      <div key={center} className="bg-[#FAF8F5] rounded-xl p-4">
                        <p className="font-sans text-xs font-semibold capitalize text-[#6B6B6B] mb-1">{center}</p>
                        <p className="font-sans text-sm text-[#2C2C2C] leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </ScrollReveal>

            {/* ═══ DEFIANT SPIRIT PATTERNS ═══ */}
            {(reactPattern || respondPathway) && (
              <ScrollReveal>
              <div id="ca-spirit" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
                <SectionHeader title="Defiant Spirit Patterns" chatKey="Defiant Spirit Patterns" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {reactPattern && (
                    <div className="p-6 rounded-xl bg-[#FEF2F2] border-l-4 border-[#DC2626]">
                      <span className="font-sans text-sm font-semibold text-[#DC2626] block mb-3">React Pattern</span>
                      <p className="font-sans text-[0.9rem] text-[#2C2C2C] leading-[1.7]">{reactPattern}</p>
                    </div>
                  )}
                  {respondPathway && (
                    <div className="p-6 rounded-xl bg-[#EFF6FF] border-l-4 border-[#2563EB]">
                      <span className="font-sans text-sm font-semibold text-[#2563EB] block mb-3">Respond Pathway</span>
                      <p className="font-sans text-[0.9rem] text-[#2C2C2C] leading-[1.7]">{respondPathway}</p>
                    </div>
                  )}
                </div>
              </div>
              </ScrollReveal>
            )}

            {/* ═══ LINES OF MOVEMENT ═══ */}
            <ScrollReveal>
            <div id="ca-lines" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
              <SectionHeader title="Lines of Movement" chatKey="Lines of Movement" />
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0">
                  <svg viewBox="0 0 100 100" width={200} height={200} style={{ overflow: 'visible' }}>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E4E0" strokeWidth="0.5" />
                    {[[1,4],[4,2],[2,8],[8,5],[5,7],[7,1],[3,6],[6,9],[9,3]].map(([a,b]) => {
                      const pa = gp(a); const pb = gp(b);
                      return <line key={`l-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#E8E4E0" strokeWidth="0.3" />;
                    })}
                    <line x1={gp(coreType).x} y1={gp(coreType).y} x2={gp(stressTypeFull).x} y2={gp(stressTypeFull).y} stroke="#DC2626" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
                    <line x1={gp(coreType).x} y1={gp(coreType).y} x2={gp(releaseTypeFull).x} y2={gp(releaseTypeFull).y} stroke="#2563EB" strokeWidth="1.2" opacity="0.7" />
                    {CIRCLE_ORDER.map((t) => {
                      const p = gp(t);
                      const isCore = t === coreType; const isStress = t === stressTypeFull; const isRelease = t === releaseTypeFull;
                      const color = isCore ? '#2563EB' : isStress ? '#DC2626' : isRelease ? '#2563EB' : '#9B9590';
                      return (
                        <g key={`p-${t}`}>
                          <circle cx={p.x} cy={p.y} r={isCore ? 4.5 : (isStress || isRelease) ? 3 : 2} fill={color} opacity={isCore ? 1 : 0.7} />
                          <text x={p.x} y={p.y < 20 ? p.y - 6 : p.y > 75 ? p.y + 9 : p.y} dx={p.x > 70 ? 6 : p.x < 30 ? -6 : 0} textAnchor="middle" fill={color} fontSize="4" fontFamily="serif" fontWeight={isCore ? 'bold' : 'normal'}>{t}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div className="p-5 rounded-xl bg-[#FEF2F2] border-l-4 border-[#DC2626]">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#DC2626]">Stress → {stressTypeFull}</span>
                    <p className="font-sans text-sm font-semibold text-[#2C2C2C] mt-1">{TYPE_NAMES[stressTypeFull]}</p>
                    <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-2 leading-relaxed">
                      {(r.stress_line_description as string) || `Under pressure, your energy moves toward ${TYPE_NAMES[stressTypeFull]} patterns.`}
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-[#EFF6FF] border-l-4 border-[#2563EB]">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#2563EB]">Release → {releaseTypeFull}</span>
                    <p className="font-sans text-sm font-semibold text-[#2C2C2C] mt-1">{TYPE_NAMES[releaseTypeFull]}</p>
                    <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-2 leading-relaxed">
                      {(r.release_line_description as string) || `In growth, you access ${TYPE_NAMES[releaseTypeFull]} qualities.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* ═══ DOMAIN INSIGHTS (Interactive) ═══ */}
            <ScrollReveal>
            <div id="ca-domains" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
              <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-1">Domain Insights</p>
              <p className="font-sans text-[0.8rem] text-[#6B6B6B] mb-4">How your type pattern shows up across four life domains.</p>
              {domainInsights.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Global toggle for comprehensive view */}
                  <div className="relative h-10 rounded-full bg-[#F0EDE8] flex items-center cursor-pointer select-none max-w-xs mx-auto w-full"
                    onClick={() => setDomainMode(m => m === 'react' ? 'respond' : 'react')}>
                    <div className={`absolute h-8 rounded-full transition-all duration-300 ease-out ${
                      domainMode === 'react'
                        ? 'left-1 w-[calc(50%-4px)] bg-gradient-to-r from-[#DC2626] to-[#EF4444]'
                        : 'left-[calc(50%+3px)] w-[calc(50%-4px)] bg-gradient-to-r from-[#2563EB] to-[#3B82F6]'
                    }`} style={{ top: '4px' }} />
                    <span className={`relative z-10 flex-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors duration-300 ${
                      domainMode === 'react' ? 'text-white font-semibold' : 'text-[#9B9590]'
                    }`}>React</span>
                    <span className={`relative z-10 flex-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors duration-300 ${
                      domainMode === 'respond' ? 'text-white font-semibold' : 'text-[#9B9590]'
                    }`}>Respond</span>
                  </div>
                  {/* Spectrum bar */}
                  <div className="h-1 rounded-full bg-gradient-to-r from-[#DC2626] via-[#9B9590] to-[#2563EB] relative max-w-xs mx-auto w-full">
                    <div className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-md top-1/2 -translate-y-1/2 transition-all duration-500 ${
                      domainMode === 'react' ? 'left-[20%] bg-[#DC2626]' : 'left-[80%] bg-[#2563EB]'
                    }`} />
                  </div>
                  {/* Domain grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {domainInsights.map((di, i) => {
                      const domainIcons: Record<string, string> = { Relationships: '\u2764', Wealth: '\u2736', Leadership: '\u2691', Transformation: '\u2728' };
                      const text = domainMode === 'react' ? di.react : di.respond;
                      return (
                        <div key={i} className={`rounded-xl overflow-hidden transition-all duration-300 border border-[#E8E4E0] ${
                          domainMode === 'react' ? 'domain-glow-react' : 'domain-glow-respond'
                        }`}>
                          <div className="px-5 pt-4 pb-2 bg-white flex items-center gap-2">
                            <span className="text-base">{domainIcons[di.domain] || '\u25C6'}</span>
                            <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#2563EB]">{di.domain}</p>
                          </div>
                          <div className={`px-5 pb-4 transition-colors duration-500 ${
                            domainMode === 'react' ? 'bg-gradient-to-b from-[#FEF2F2] to-white' : 'bg-gradient-to-b from-[#EFF6FF] to-white'
                          }`}>
                            <p className={`font-mono text-[0.5rem] uppercase tracking-[0.12em] mb-1.5 ${
                              domainMode === 'react' ? 'text-[#DC2626]' : 'text-[#2563EB]'
                            }`}>
                              {domainMode === 'react' ? 'When you react\u2026' : 'When you respond\u2026'}
                            </p>
                            {text?.trim() ? (
                              <p className="font-sans text-[0.82rem] text-[#2C2C2C] leading-relaxed mode-content"
                                 key={`ca-${i}-${domainMode}`}>
                                {text}
                              </p>
                            ) : (
                              <p className="font-sans text-sm text-[#9B9590] italic mode-content"
                                 key={`ca-${i}-${domainMode}`}>
                                This pathway hasn&apos;t been explored yet.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="font-sans text-sm text-[#9B9590]">Domain insights develop as the assessment explores relationships, wealth, leadership, and transformation.</p>
              )}
            </div>
            </ScrollReveal>

            {/* ═══ OYN DIMENSIONS ═══ */}
            {oynEntriesFull.length > 0 && (
              <ScrollReveal>
              <div id="ca-oyn" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
                <SectionHeader title="OYN Dimensions" chatKey="OYN Dimensions" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {oynEntriesFull.map(([key, value]) => (
                    <div key={key} className="p-5 rounded-xl bg-[#FAF8F5]">
                      <span className="font-sans text-[0.65rem] font-bold uppercase tracking-widest text-[#2563EB]">{key.toUpperCase()}</span>
                      <p className="font-sans text-[0.88rem] text-[#2C2C2C] leading-[1.7] mt-2">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              </ScrollReveal>
            )}

            {/* ═══ EXPLORE YOUR TYPE ═══ */}
            <ScrollReveal>
              <div id="ca-explore" className="scroll-mt-16">
                {renderExploreArea()}
              </div>
            </ScrollReveal>

            {/* ═══ CLOSING ═══ */}
            <ScrollReveal>
            <div className="rounded-2xl p-8 text-center" style={{ background: '#1E293B' }}>
              <p className="font-serif italic text-[1.1rem] text-[#FAF8F5] leading-[1.8] mb-4">
                {closing}
              </p>
              <p className="font-sans text-xs text-[#9B9590]">
                You are not a number. You are a defiant spirit.
              </p>
            </div>
            </ScrollReveal>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const sectionTitles = [
    'Your Type',
    'Superpower & Kryptonite',
    'React & Respond',
    'OYN Dimensions',
    'Wing & Variant',
    'Tritype',
    'Domain Insights',
    'Explore Your Type',
    'Relationship Wheel',
    'Stress & Release Lines',
    'Complete Analysis',
    'Your Journey Begins',
  ];

  // Map visual position → case number (combined final page = case 9 with defy + share + email)
  // Removed case 7 (Full Profile) — redundant with Type Hero and Complete Analysis
  const SECTION_ORDER = [0, 1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 9];
  const currentCase = SECTION_ORDER[section] ?? section;

  return (
    <div className="bg-[#FAF8F5]" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Progress breadcrumb */}
      <div style={{ flexShrink: 0 }} className="px-6 py-3 flex items-center justify-between border-b border-[#E8E4E0] bg-white z-30">
        <p className="font-serif text-[0.9rem] font-semibold text-[#2563EB]">Your Results</p>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSections }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i === section ? '#2563EB' : i < section ? '#7A9E7E' : '#D0CAC4',
              }}
            />
          ))}
        </div>
        <p className="font-sans text-[0.75rem] text-[#9B9590]">
          {sectionTitles[section] ?? ''}
        </p>
      </div>

      {/* Regenerate banner if content is missing */}
      {contentMissing && (
        <div style={{ flexShrink: 0 }} className="bg-[#FEF3C7] border-b border-[#F59E0B] px-6 py-3 flex items-center justify-between">
          <p className="font-sans text-xs text-[#92400E]">
            Some results content is incomplete. This can happen with short assessments.
          </p>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="font-sans text-xs bg-[#F59E0B] text-white px-4 py-1.5 rounded-lg hover:bg-[#D97706] disabled:opacity-50"
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate Results'}
          </button>
        </div>
      )}

      {/* Section content — scrolls internally, content hugs top */}
      <div style={{ flex: '1 1 0%', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }} data-results-scroll>
        <div className="flex flex-col items-center px-5 pt-6 pb-24">
          <SectionFade sectionIndex={section} activeSection={section}>
            {renderSection(currentCase)}
          </SectionFade>
        </div>
      </div>

      {/* Offscreen share card removed — card now rendered inline on sendoff page */}

      {/* Scroll indicator — shows only when content overflows */}
      <ScrollIndicator key={section} />

      {/* Bottom navigation — full-width gradient, centered content */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #FAF8F5 60%, rgba(250,248,245,0) 100%)' }}
      >
        <div className="max-w-[700px] mx-auto px-6 pb-5 pt-8 flex items-center justify-between pointer-events-auto">

          <button
            onClick={() => setSection((s) => Math.max(0, s - 1))}
            disabled={section === 0}
            className="font-sans text-sm text-[#9B9590] hover:text-[#2C2C2C] disabled:opacity-0 disabled:cursor-default transition-colors"
          >
            ← Back
          </button>
          <span className="font-sans text-[0.7rem] text-[#D0CAC4]">{section + 1} / {totalSections}</span>
          {section >= totalSections - 1 ? (
            <button
              onClick={() => {
                const uid = typeof window !== 'undefined' ? sessionStorage.getItem('soulo_user_id') : null;
                const params = uid ? `?userId=${encodeURIComponent(uid)}` : sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
                router.push(`/results/dashboard${params}`);
              }}
              className="font-sans text-[0.95rem] rounded-2xl px-8 py-3 bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-colors shadow-lg"
            >
              View Dashboard →
            </button>
          ) : (
            <button
              onClick={advance}
              className="font-sans text-[0.95rem] rounded-2xl px-8 py-3 bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-colors shadow-lg"
            >
              Continue →
            </button>
          )}
        </div>
      </div>

      {/* Soulo Chat — floating orb + chat panel */}
      <SouloChat
        results={r}
        sessionId={sessionId}
        activeSection={chatSection}
      />
    </div>
  );
}
