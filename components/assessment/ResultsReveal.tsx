'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ShareCard from './ShareCard';
import RelationshipWheel from './RelationshipWheel';
import SouloChat from './SouloChat';
import SouloOrb from '@/components/ui/soulo-orb';
import SouloNav from '@/components/ui/soulo-nav';
import { ENERGIZING_POINTS, RESOLUTION_POINTS, TYPE_NAMES, CENTER_MAP, getWingTypes, getLowestType } from '@/lib/enneagram-lines';
import { getCelebritiesByType } from '@/lib/celebrity-data';
import TypewriterText from '@/components/ui/TypewriterText';
import AnimatedBar from '@/components/ui/AnimatedBar';
import ScrollReveal from '@/components/ui/ScrollReveal';
import MarkdownText from '@/components/ui/MarkdownText';
import { TypingAnimation } from '@/components/ui/typing-animation';
import type { PersonalitySystemsOutput } from '@/lib/personality-analyzer';
import type { ConfidenceLevel } from '@/lib/personality-correlations';
import { CONTEXT_META, TYPE_NAMES as REL_TYPE_NAMES, type RelationshipContext, type RelationshipDescription } from '@/lib/relationship-contexts';
import { AnimatedNavigationTabs, type NavTab } from '@/components/ui/animated-navigation-tabs';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultsRevealProps {
  results: Record<string, unknown>;
  sessionId: string;
  onComplete?: () => void;
  revealCompleted?: boolean;
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

function parseCenters(wholeType: string): string[] {
  const centers: string[] = [];
  const digits = wholeType.replace(/\D/g, '').split('').map(Number);
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
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (sectionIndex !== activeSection) {
      setVisible(false);
      setContentVisible(false);
      return;
    }
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setContentVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
      <div style={{ opacity: contentVisible ? 1 : 0.6, transition: 'opacity 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
}

export default function ResultsReveal({ results: initialResults, sessionId, onComplete, revealCompleted }: ResultsRevealProps) {
  const router = useRouter();
  const [r, setR] = useState<Record<string, unknown>>(initialResults);
  const [section, setSection] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const shareOffscreenRef = useRef<HTMLDivElement>(null);
  const [openCelebCard, setOpenCelebCard] = useState<number | null>(null);
  const [exploreTab, setExploreTab] = useState<'famous' | 'relationships' | 'systems'>('famous');
  const [hoveredRelType, setHoveredRelType] = useState<number | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chatSection, setChatSection] = useState<string>('General');
  const [sharedChatMessages, setSharedChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Portal mode state
  const [portalMode, setPortalMode] = useState(revealCompleted === true);
  const [portalTab, setPortalTab] = useState(0);
  const portalScrollRef = useRef<HTMLDivElement>(null);
  const [showSouloHint, setShowSouloHint] = useState(false);

  // Domain Insights interactive state
  const [activeDomain, setActiveDomain] = useState<number | null>(null);
  const [domainMode, setDomainMode] = useState<'react' | 'respond'>('react');
  const [domainCompareAll, setDomainCompareAll] = useState(false);

  // Personality Systems state
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
  const [systemsRevealed, setSystemsRevealed] = useState(false);
  // Relationship Explorer state
  const [relSelectedType, setRelSelectedType] = useState<number | null>(null);
  const [relHoveredType, setRelHoveredType] = useState<number | null>(null);
  const [relContext, setRelContext] = useState<RelationshipContext>('friends');
  const [relBatchData, setRelBatchData] = useState<Record<string, RelationshipDescription> | null>(null);
  const [relBatchLoading, setRelBatchLoading] = useState(false);
  const relBatchFetched = useRef(false);

  // Trigger systems entrance animations + reset to grid view
  useEffect(() => {
    if (exploreTab === 'systems') {
      setExpandedSystem(null);
      setSystemsRevealed(false);
      const t = setTimeout(() => setSystemsRevealed(true), 80);
      return () => clearTimeout(t);
    } else {
      setSystemsRevealed(false);
    }
  }, [exploreTab]);

  // Portal mode: scroll to top when tab changes
  useEffect(() => {
    if (!portalMode) return;
    if (portalScrollRef.current) {
      portalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [portalTab, portalMode]);

  // Soulo hint — show for 12 seconds on overview tab
  useEffect(() => {
    if (portalTab === 0 && portalMode) {
      setShowSouloHint(true);
      const t = setTimeout(() => setShowSouloHint(false), 12000);
      return () => clearTimeout(t);
    } else {
      setShowSouloHint(false);
    }
  }, [portalTab, portalMode]);

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

  const totalSections = 11;

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
  const wholeType = (r.tritype as string) ?? '';
  const wholeTypeArchetype = (r.tritype_archetype as string) ?? '';
  const wholeTypeConfidence = (r.tritype_confidence as number) ?? 0;
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
  const oynSummary = (r.oyn_summary as Record<string, string>) ?? (r.oyn_dimensions as Record<string, string>) ?? {};
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

  const wholeTypeCenters = parseCenters(wholeType);
  const hasLowWholeType =
    !wholeType || wholeTypeConfidence < 0.65 || wholeTypeCenters.length === 0;

  const continueButton = null;

  const oynLabels: Record<string, string> = {
    who: 'WHO', what: 'WHAT', why: 'WHY', how: 'HOW', when: 'WHEN', where: 'WHERE',
  };

  const portalTabs: NavTab[] = [
    { id: 0, tile: 'Overview' },
    { id: 1, tile: 'Powers' },
    { id: 2, tile: 'React & Respond' },
    { id: 3, tile: 'OYN' },
    { id: 4, tile: 'Wing & Variant' },
    { id: 11, tile: 'Soulo', special: true },
    { id: 5, tile: 'Whole Type' },
    { id: 6, tile: 'Domains' },
    { id: 7, tile: 'Energies' },
    { id: 8, tile: 'Lines' },
    { id: 9, tile: 'Explore' },
    { id: 10, tile: 'Takeaways' },
  ];

  // ── Personality Systems data ──
  const personalitySystems = r.personality_systems as PersonalitySystemsOutput | null | undefined;

  // ── Relationship batch-load ──
  const relPregenerated = (r.relationship_context_descriptions || {}) as Record<string, RelationshipDescription>;
  const hasPregenerated = Object.keys(relPregenerated).length > 0;
  useEffect(() => {
    if (exploreTab !== 'relationships') return;
    if (hasPregenerated || relBatchData || relBatchFetched.current) return;
    if (!leadingType) return;
    relBatchFetched.current = true;
    setRelBatchLoading(true);
    fetch('/api/results/relationships/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userType: leadingType }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.descriptions) {
          setRelBatchData(data.descriptions);
          setR(prev => ({ ...prev, relationship_context_descriptions: data.descriptions }));
        }
        setRelBatchLoading(false);
      })
      .catch(() => setRelBatchLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreTab, hasPregenerated, leadingType, sessionId]);

  // ── Shared Explore Area — used in case 11 (standalone) and case 14 (embedded) ──
  const renderExploreArea = () => {
    const apiExamples = Array.isArray(r.famous_examples)
      ? (r.famous_examples as Array<{ name?: string; profession?: string; type_evidence?: string; what_you_share?: string; photo_url?: string; source_note?: string; relevance_tag?: string }>)
        .map(ex => {
          const name = (ex.name as string) || '';
          // Always use wiki-image proxy instead of LLM-hallucinated Wikimedia URLs
          const wikiSlug = name.trim().replace(/\s+/g, '_');
          return {
            name,
            profession: (ex.profession as string) || '',
            hook: (ex.what_you_share as string) || '',
            description: (ex.type_evidence as string) || '',
            photoUrl: wikiSlug ? `/api/wiki-image?person=${encodeURIComponent(wikiSlug)}` : '',
            source: (ex.source_note as string) || 'Community observation',
            type: leadingType,
          };
        })
      : [];
    // Get curated celebrities for this type (8 per type in database)
    const curatedFallback = getCelebritiesByType(leadingType);
    // Merge: API-generated first (personalized), then curated padding. Dedupe by name.
    const apiNames = new Set(apiExamples.map(c => c.name.toLowerCase()));
    const padding = curatedFallback.filter(c => !apiNames.has(c.name.toLowerCase()));
    const allCelebrities = [...apiExamples, ...padding].slice(0, 8);

    const EXPLORE_TABS = [
      { id: 'famous' as const, label: 'Famous Figures', ready: true },
      { id: 'relationships' as const, label: 'Relationships', ready: true },
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
          {exploreTab === 'relationships' && (() => {
            const lt = leadingType as number;
            const CLOCKWISE = [9, 1, 2, 3, 4, 5, 6, 7, 8];
            const gp = (typeNum: number) => {
              const idx = CLOCKWISE.indexOf(typeNum);
              if (idx === -1) return { x: 50, y: 50 };
              const a = (idx * 40 * Math.PI) / 180;
              return { x: 50 + 42 * Math.sin(a), y: 50 - 42 * Math.cos(a) };
            };
            const ctxColor = CONTEXT_META[relContext].color;
            const allRelData = { ...relPregenerated, ...(relBatchData || {}) };
            const currentKey = relSelectedType ? `${relSelectedType}-${relContext}` : null;
            const currentRel = currentKey ? (allRelData[currentKey] || null) : null;
            const lineTarget = relSelectedType || relHoveredType;
            const userPt = gp(lt);
            const lineTgt = lineTarget ? gp(lineTarget) : null;
            const lineLen = lineTgt ? Math.sqrt((lineTgt.x - userPt.x) ** 2 + (lineTgt.y - userPt.y) ** 2) : 0;

            // Context-specific atmosphere
            const ctxAtmo: Record<RelationshipContext, { bg: string; glow: string; lineColor: string; label: string }> = {
              friends: { bg: 'linear-gradient(160deg, #EFF6FF 0%, #F5F3F0 50%, #DBEAFE 100%)', glow: 'rgba(37,99,235,0.08)', lineColor: '#93C5FD', label: 'Friendship' },
              family: { bg: 'linear-gradient(160deg, #F5F0FF 0%, #F5F3F0 50%, #EDE9FE 100%)', glow: 'rgba(124,58,237,0.08)', lineColor: '#C4B5FD', label: 'Family' },
              romantic: { bg: 'linear-gradient(160deg, #FFF1F2 0%, #F5F3F0 50%, #FCE7F3 100%)', glow: 'rgba(225,29,72,0.07)', lineColor: '#FDA4AF', label: 'Romance' },
              professional: { bg: 'linear-gradient(160deg, #FFFBEB 0%, #F5F3F0 50%, #FEF3C7 100%)', glow: 'rgba(217,119,6,0.07)', lineColor: '#FCD34D', label: 'Work' },
            };
            const atmo = ctxAtmo[relContext];

            return (
              <div className="flex flex-col items-center gap-4 rounded-2xl transition-all duration-500 -mx-4 px-4 py-6 relative overflow-hidden"
                style={{ background: atmo.bg }}>

                {/* Context-specific ambient visuals — fills the entire section */}
                <div className="absolute inset-0 pointer-events-none" style={{ animation: 'rel-ambient-drift 22s ease-in-out infinite' }}>
                  {/* Friends: scattered constellation */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: relContext === 'friends' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                    {[[40,80],[320,50],[360,320],[50,450],[180,30],[380,180],[25,250],[280,520],[100,530],[220,100],[160,400],[300,400]].map(([cx,cy], i) => (
                      <circle key={`fd-${i}`} cx={cx} cy={cy} r={1.5 + (i % 3)} fill="#93C5FD" opacity={0.15 + (i % 4) * 0.03} />
                    ))}
                    {[[40,80,320,50],[320,50,360,320],[50,450,180,30],[380,180,25,250],[280,520,220,100],[160,400,300,400]].map(([x1,y1,x2,y2], i) => (
                      <line key={`fl-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#93C5FD" strokeWidth="0.5" opacity={0.08} />
                    ))}
                  </svg>
                  {/* Family: concentric rings */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: relContext === 'family' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                    {[60, 100, 150, 200, 260].map((r, i) => (
                      <circle key={`fr-${i}`} cx="200" cy="300" r={r} fill="none" stroke="#C4B5FD" strokeWidth={0.6} opacity={0.08 - i * 0.01} />
                    ))}
                  </svg>
                  {/* Romantic: flowing curves */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: relContext === 'romantic' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                    <path d="M0 350 Q200 150 400 350" fill="none" stroke="#FDA4AF" strokeWidth="0.8" opacity="0.10" />
                    <path d="M0 400 Q200 200 400 400" fill="none" stroke="#FDA4AF" strokeWidth="0.5" opacity="0.06" />
                    <path d="M50 500 Q200 250 350 500" fill="none" stroke="#FDA4AF" strokeWidth="0.6" opacity="0.08" />
                    <path d="M0 200 Q200 350 400 200" fill="none" stroke="#FECDD3" strokeWidth="0.4" opacity="0.06" />
                  </svg>
                  {/* Professional: ascending diagonals */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"
                    style={{ opacity: relContext === 'professional' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                    {[0, 70, 140, 210, 280, 350].map((offset, i) => (
                      <line key={`pl-${i}`} x1={offset} y1="600" x2={offset + 200} y2="0" stroke="#FCD34D" strokeWidth="0.5" opacity={0.07 - i * 0.008} />
                    ))}
                  </svg>
                  {/* Positioned glows */}
                  {relContext === 'friends' && <>
                    <div className="absolute top-[5%] left-[5%] w-[40%] h-[30%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)' }} />
                    <div className="absolute bottom-[5%] right-[5%] w-[40%] h-[30%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)' }} />
                  </>}
                  {relContext === 'family' && (
                    <div className="absolute inset-[10%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', animation: 'rel-ambient-pulse 8s ease-in-out infinite' }} />
                  )}
                  {relContext === 'romantic' && <>
                    <div className="absolute top-[3%] left-[25%] w-[50%] h-[25%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.05) 0%, transparent 70%)' }} />
                    <div className="absolute bottom-[3%] left-[25%] w-[50%] h-[30%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.06) 0%, transparent 70%)' }} />
                  </>}
                  {relContext === 'professional' && (
                    <div className="absolute top-[3%] right-[3%] w-[55%] h-[35%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)' }} />
                  )}
                </div>

                {/* Context Lever */}
                <div className="flex gap-1.5 p-1 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                  {(Object.keys(CONTEXT_META) as RelationshipContext[]).map(ctx => (
                    <button key={ctx}
                      onClick={() => { setRelContext(ctx); setRelSelectedType(null); }}
                      className="px-3.5 py-2 rounded-xl font-sans text-[0.72rem] font-medium transition-all duration-300"
                      style={{
                        background: relContext === ctx ? CONTEXT_META[ctx].color : 'transparent',
                        color: relContext === ctx ? 'white' : '#6B6B6B',
                        boxShadow: relContext === ctx ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                      }}>
                      {CONTEXT_META[ctx].label}
                    </button>
                  ))}
                </div>

                {/* Enneagram Diagram */}
                <div className="relative w-full max-w-[300px] z-10" style={{ aspectRatio: '1/1' }}>
                  <svg viewBox="-5 -5 110 110" className="w-full relative">
                    {/* Outer circle — tinted by context */}
                    <circle cx="50" cy="50" r="42" fill="none" stroke={atmo.lineColor} strokeWidth="0.6" opacity={0.5} className="transition-all duration-500" />
                    {/* Triangle — tinted */}
                    {[[3,6],[6,9],[9,3]].map(([a,b]) => { const pa = gp(a), pb = gp(b); return <line key={`t-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={atmo.lineColor} strokeWidth="0.35" opacity={0.35} className="transition-all duration-500" />; })}
                    {/* Hexad — tinted */}
                    {[[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]].map(([a,b]) => { const pa = gp(a), pb = gp(b); return <line key={`h-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={atmo.lineColor} strokeWidth="0.3" opacity={0.25} className="transition-all duration-500" />; })}
                    {lineTgt && (
                      <line x1={userPt.x} y1={userPt.y} x2={lineTgt.x} y2={lineTgt.y}
                        stroke={ctxColor} strokeWidth={relSelectedType ? 1.2 : 0.8} strokeLinecap="round"
                        opacity={relSelectedType ? 0.7 : 0.35}
                        strokeDasharray={lineLen} strokeDashoffset={0}
                        style={{ animation: 'rel-line-draw 0.3s ease-out', ['--line-length' as string]: lineLen }}
                        className="transition-opacity duration-200" />
                    )}
                    {CLOCKWISE.map(typeNum => {
                      const p = gp(typeNum);
                      const isUser = typeNum === lt;
                      const isSel = typeNum === relSelectedType;
                      const isHov = typeNum === relHoveredType;
                      const ptR = isUser ? 6 : isSel ? 5.5 : isHov ? 5 : 3.5;
                      const fill = isUser ? '#2563EB' : isSel ? ctxColor : isHov ? ctxColor + 'BB' : '#9B9590';
                      return (
                        <g key={typeNum}>
                          <circle cx={p.x} cy={p.y} r={10} fill={isUser ? '#2563EB' : ctxColor}
                            opacity={(isUser || isSel || isHov) ? (isUser ? 0.10 : isSel ? 0.15 : 0.08) : 0}
                            style={{ pointerEvents: 'none' }} className="transition-all duration-200" />
                          <circle cx={p.x} cy={p.y} r={ptR} fill={fill}
                            style={{ pointerEvents: 'none' }} className="transition-all duration-200" />
                          <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize="4.5" fontFamily="sans-serif"
                            fill={isUser ? '#2563EB' : isSel ? ctxColor : isHov ? '#2C2C2C' : '#9B9590'}
                            fontWeight={isUser || isSel || isHov ? '700' : '400'}
                            style={{ pointerEvents: 'none' }} className="transition-all duration-200">
                            {typeNum}
                          </text>
                          {isUser && (
                            <text x={p.x} y={p.y + 17} textAnchor="middle" fontSize="3" fontFamily="monospace"
                              fill="#2563EB" opacity={0.6} fontWeight="600" style={{ pointerEvents: 'none' }}>YOU</text>
                          )}
                          {!isUser && (
                            <circle cx={p.x} cy={p.y} r={14} fill="rgba(0,0,0,0)"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setRelSelectedType(relSelectedType === typeNum ? null : typeNum)}
                              onMouseEnter={() => setRelHoveredType(typeNum)}
                              onMouseLeave={() => setRelHoveredType(null)}
                              onTouchStart={(e) => { e.preventDefault(); setRelSelectedType(relSelectedType === typeNum ? null : typeNum); }} />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Content area — min-height prevents layout jump on context switch */}
                <div className="min-h-[60px]">
                {relBatchLoading && (
                  <div className="flex items-center gap-2 justify-center py-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ctxColor + '40', borderTopColor: 'transparent' }} />
                    <p className="font-sans text-[0.75rem] text-[#9B9590]">Preparing relationship insights...</p>
                  </div>
                )}

                {!relSelectedType && !relHoveredType && !relBatchLoading && (
                  <p className="font-sans text-[0.82rem] text-[#9B9590] italic text-center">Tap any type to explore how you relate</p>
                )}
                {!relSelectedType && relHoveredType && (
                  <div className="w-full max-w-lg mt-2" style={{ animation: 'rel-content-fade 0.15s ease-out' }}>
                    <p className="font-serif text-[0.95rem] font-semibold text-center" style={{ color: ctxColor }}>
                      You &amp; {REL_TYPE_NAMES[relHoveredType] || 'Type ' + relHoveredType}
                    </p>
                    <p className="font-sans text-[0.72rem] text-[#9B9590] italic text-center mt-1">Tap to explore as {CONTEXT_META[relContext].label.toLowerCase()}</p>
                  </div>
                )}
                {relSelectedType && !currentRel && !relBatchLoading && (
                  <div className="w-full max-w-lg mt-2 text-center" style={{ animation: 'rel-panel-enter 0.3s ease-out' }}>
                    <p className="font-serif text-[1.05rem] font-bold text-[#2C2C2C] mb-3">
                      You &amp; {REL_TYPE_NAMES[relSelectedType] || 'Type ' + relSelectedType} as {CONTEXT_META[relContext].label}
                    </p>
                    <div className="flex items-center gap-2 justify-center py-3">
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ctxColor + '50', borderTopColor: 'transparent' }} />
                      <p className="font-sans text-[0.78rem] text-[#9B9590]">Generating insights...</p>
                    </div>
                  </div>
                )}
                {relSelectedType && currentRel && (
                  <div className="w-full max-w-lg mt-2" style={{ animation: 'rel-panel-enter 0.35s ease-out' }} key={currentKey}>
                    <p className="font-serif text-[1.05rem] font-bold text-[#2C2C2C] mb-4 text-center">{currentRel.title}</p>
                    {[
                      { label: 'How You Show Up', text: currentRel.how_you_show_up },
                      { label: 'The Dynamic', text: currentRel.the_dynamic },
                      { label: 'Growth Edge', text: currentRel.growth_edge },
                      { label: 'Watch Out For', text: currentRel.watch_out_for },
                    ].map(sec => (
                      <div key={sec.label} className="mb-4 pl-4 py-2.5" style={{ borderLeft: '3px solid ' + ctxColor + '40', animation: 'rel-content-fade 0.3s ease-out' }}>
                        <p className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: ctxColor }}>{sec.label}</p>
                        <p className="font-sans text-[0.93rem] text-[#1a1a1a] leading-[1.75]">{sec.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            );
          })()}
          {exploreTab === 'systems' && (() => {
            const ps = personalitySystems;
            if (!ps) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4"><span className="text-2xl">&#9878;</span></div>
                  <p className="font-serif text-[1.1rem] font-semibold text-[#2C2C2C] mb-2">Other Personality Systems</p>
                  <p className="font-sans text-[0.88rem] text-[#6B6B6B] max-w-sm leading-relaxed">Coming soon — see your type through the lens of MBTI, Big Five, and other frameworks.</p>
                </div>
              );
            }


            // ── Data prep ──
            const scoreVal: Record<string, number> = { very_low: 0.12, low: 0.30, medium: 0.52, high: 0.76, very_high: 0.95 };
            const scoreLbl: Record<string, string> = { very_low: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' };
            const confLabel: Record<string, string> = { high: 'Strong correlation', medium: 'Consensus-based', low: 'Exploratory' };
            const MBTI_NAMES: Record<string, string> = { INTJ: 'The Architect', INTP: 'The Logician', ENTJ: 'The Commander', ENTP: 'The Debater', INFJ: 'The Advocate', INFP: 'The Mediator', ENFJ: 'The Protagonist', ENFP: 'The Campaigner', ISTJ: 'The Logistician', ISFJ: 'The Defender', ESTJ: 'The Executive', ESFJ: 'The Consul', ISTP: 'The Virtuoso', ISFP: 'The Adventurer', ESTP: 'The Entrepreneur', ESFP: 'The Entertainer' };

            type SystemKey = 'mbti' | 'bigFive' | 'attachment' | 'disc' | 'jungian' | 'humanDesign';
            const SYSTEMS: Array<{ key: SystemKey; label: string; subtitle: string; whatIs: string; vsEnneagram: string; bg: string; glow: string; color: string; textColor: string; conf: ConfidenceLevel }> = [
              { key: 'mbti', label: 'Myers-Briggs', subtitle: 'How you process information and make decisions', whatIs: 'The world\'s most widely used personality framework. It maps four dimensions of cognitive preference — where you get energy, how you take in information, how you make decisions, and how you orient to the world.', vsEnneagram: 'MBTI maps cognitive style (how you think). The Enneagram maps core motivation (why you do what you do). Same person, completely different lens.', bg: '#243d6e', glow: '#2563EB', color: '#60A5FA', textColor: '#BFDBFE', conf: ps.mbti.confidence },
              { key: 'bigFive', label: 'Big Five / OCEAN', subtitle: 'Five core dimensions of personality', whatIs: 'The most scientifically validated personality model in psychology. Measures five trait dimensions on a continuous scale — not types, but spectrums. Used in clinical research worldwide.', vsEnneagram: 'Big Five measures trait intensity (how much of each quality). The Enneagram reveals the driving fear and desire beneath those traits.', bg: '#352368', glow: '#7C3AED', color: '#A78BFA', textColor: '#DDD6FE', conf: ps.bigFive.confidence },
              { key: 'attachment', label: 'Attachment Theory', subtitle: 'How you learned to bond and feel safe', whatIs: 'Developed from decades of research on how early relationships wire your nervous system for connection. Your attachment style shapes how you give trust, handle conflict, and experience intimacy.', vsEnneagram: 'Attachment maps relational wiring specifically. Your Enneagram type shapes HOW that attachment style expresses — a Type 2 and Type 5 with the same attachment style look very different.', bg: '#4a3518', glow: '#D97706', color: '#FBBF24', textColor: '#FDE68A', conf: ps.attachment.confidence },
              { key: 'disc', label: 'DISC Profile', subtitle: 'Your behavioral style in action', whatIs: 'A behavioral model used in professional settings. Maps four dimensions of how you take action, communicate, and work with others. Think of it as your work personality.', vsEnneagram: 'DISC captures your observable behavior at work. The Enneagram reveals what\'s driving that behavior from underneath — the motivation behind the style.', bg: '#4a1c1c', glow: '#DC2626', color: '#F87171', textColor: '#FECACA', conf: ps.disc.confidence },
              { key: 'jungian', label: 'Jungian Archetypes', subtitle: 'The mythic patterns shaping your story', whatIs: 'Carl Jung identified 12 universal character patterns that live in the collective unconscious. Your primary archetype is the role you naturally inhabit — the story you\'re living without knowing it.', vsEnneagram: 'Archetypes describe the roles you play. The Enneagram maps the survival strategy that chose those roles for you.', bg: '#1e3a28', glow: '#7A9E7E', color: '#86EFAC', textColor: '#BBF7D0', conf: ps.jungian.confidence },
              { key: 'humanDesign', label: 'Human Design', subtitle: 'An exploratory energetic blueprint', whatIs: 'A synthesis system combining astrology, the I Ching, Kabbalah, and the chakra system. Community-based with no peer-reviewed research. Included as a conversation starter, not a conclusion.', vsEnneagram: 'Human Design is exploratory. If it resonates, it may add a layer to your self-understanding. If not, leave it here.', bg: '#363640', glow: '#6B7280', color: '#9CA3AF', textColor: '#E5E7EB', conf: 'low' as ConfidenceLevel },
            ];

            const openSys = expandedSystem as SystemKey | null;

            // ── Confidence badge (light on dark) ──
            const ConfBadge = ({ level, color }: { level: ConfidenceLevel; color: string }) => {
              const n = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
              return (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">{[1,2,3].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d <= n ? color : 'rgba(255,255,255,0.2)' }} />)}</div>
                  <span className="text-[0.55rem] uppercase tracking-[0.1em]" style={{ color: `${color}CC`, fontFamily: 'monospace' }}>{confLabel[level] || 'Exploratory'}</span>
                </div>
              );
            };

            // ── Text cleaning helpers ──
            const cleanInsight = (text: string) => {
              if (!text) return '';
              const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
              let insight = sentences.slice(0, 2).join(' ').trim();
              insight = insight
                .replace(/\b(Fe|Fi|Te|Ti|Se|Si|Ne|Ni)\b-?\w*/g, '')
                .replace(/cognitive (stack|function)s?/gi, 'thinking style')
                .replace(/compound type/gi, 'your unique combination')
                .replace(/tritype \d+-\d+-\d+/gi, 'your type combination')
                .replace(/\b[A-Z]{4}\b(?!')/g, (m) => MBTI_NAMES[m] ? `${m} (${MBTI_NAMES[m]})` : m)
                .replace(/\bSX\b/gi, 'Sexual')
                .replace(/\bSP\b/gi, 'Self-preservation')
                .replace(/\bSO\b/gi, 'Social')
                .replace(/\d+w\d+/g, (m) => `Type ${m}`)
                .replace(/\s{2,}/g, ' ')
                .trim();
              return insight;
            };
            const cleanText = (text: string) => {
              if (!text) return '';
              const first = (text.match(/^[^.!?]+[.!?]/) || [text.slice(0, 140)])[0];
              return first.replace(/[''\u2018\u2019][^''\u2018\u2019]+[''\u2018\u2019]/g, '').replace(/\s+/g, ' ').trim();
            };

            // ── Render expanded content per system ──
            const renderExpanded = (sysKey: SystemKey) => {
              const sys = SYSTEMS.find(s => s.key === sysKey)!;
              switch (sysKey) {
                // ════════ MBTI ════════
                case 'mbti': {
                  const primary = ps.mbti.primary || '';
                  const letters = primary.length === 4 ? primary.split('') : [];
                  const axes = letters.length === 4 ? [
                    { left: 'Extraversion', right: 'Introversion', leftL: 'E', rightL: 'I', val: letters[0] },
                    { left: 'Sensing', right: 'Intuition', leftL: 'S', rightL: 'N', val: letters[1] },
                    { left: 'Thinking', right: 'Feeling', leftL: 'T', rightL: 'F', val: letters[2] },
                    { left: 'Judging', right: 'Perceiving', leftL: 'J', rightL: 'P', val: letters[3] },
                  ] : [];
                  const positions: Record<string, number> = { E: 25, I: 75, S: 30, N: 70, T: 35, F: 65, J: 28, P: 72 };
                  return (
                    <div className="flex flex-col lg:flex-row gap-8 p-4 pb-8 lg:p-6 lg:pb-10">
                      <div className="flex flex-col gap-3 flex-1 lg:max-w-[45%]">
                        <div>
                          <p className="text-[0.6rem] uppercase tracking-[0.3em] mb-2" style={{ color: `${sys.textColor}80`, fontFamily: 'monospace' }}>What is MBTI?</p>
                          <p className="text-[0.82rem] leading-relaxed" style={{ color: `${sys.textColor}CC` }}>{sys.whatIs}</p>
                        </div>
                        <div className="rounded-xl p-4" style={{ background: `${sys.color}15`, borderLeft: `3px solid ${sys.color}60` }}>
                          <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-1" style={{ color: `${sys.color}99`, fontFamily: 'monospace' }}>vs your Enneagram Type {leadingType}</p>
                          <p className="text-[0.78rem] leading-relaxed" style={{ color: sys.textColor }}>{sys.vsEnneagram}</p>
                        </div>
                        {ps.mbti.reasoning && (
                          <div>
                            <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-1" style={{ color: `${sys.textColor}90`, fontFamily: 'monospace' }}>Key insight</p>
                            <p className="font-serif text-[0.95rem] italic leading-relaxed" style={{ color: sys.textColor }}>{cleanInsight(ps.mbti.reasoning)}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-5 justify-center flex-1">
                        {axes.map((ax, i) => {
                          const pct = positions[ax.val] || 50;
                          return (
                            <div key={ax.leftL} style={{ animation: `darkFadeUp 0.4s ease-out ${0.2 + i * 0.12}s both` }}>
                              <div className="flex justify-between items-end mb-2">
                                <span className="font-serif text-[2.2rem] font-bold leading-none text-white">{ax.val}</span>
                                <span className="text-[0.6rem] uppercase tracking-[0.12em]" style={{ color: `${sys.textColor}90`, fontFamily: 'monospace' }}>{ax.left} vs {ax.right}</span>
                              </div>
                              <div className="h-[2px] w-[85%] mx-auto relative" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <div className="absolute w-4 h-4 rounded-full bg-white -top-[7px]" style={{ left: `${pct}%`, transform: 'translateX(-50%)', animation: 'spectrumDotGlow 3s ease-in-out infinite' }} />
                              </div>
                              <div className="flex justify-between mt-2 w-[85%] mx-auto">
                                <span className="text-[0.6rem] uppercase tracking-wider" style={{ color: `${sys.textColor}80` }}>{ax.leftL}</span>
                                <span className="text-[0.6rem] uppercase tracking-wider" style={{ color: `${sys.textColor}80` }}>{ax.rightL}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════ BIG FIVE ════════
                case 'bigFive': {
                  const B5 = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
                  const B5Full = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
                  const cx = 50, cy = 50, R = 38;
                  const rp = (i: number, v: number) => { const a = (i * 2 * Math.PI / 5) - Math.PI / 2; return { x: cx + R * v * Math.cos(a), y: cy + R * v * Math.sin(a) }; };
                  const b5Vals = B5.map(t => scoreVal[ps.bigFive[t].score] || 0.5);
                  const pts = b5Vals.map((v, i) => rp(i, v));
                  const shape = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
                  const lblPts = B5.map((_, i) => { const a = (i * 2 * Math.PI / 5) - Math.PI / 2; return { x: cx + (R + 12) * Math.cos(a), y: cy + (R + 12) * Math.sin(a) }; });
                  return (
                    <div className="flex flex-col gap-4 p-4 pb-8 lg:p-6 lg:pb-10">
                      <div className="text-center">
                        <p className="text-[0.55rem] uppercase tracking-[0.3em] mb-2" style={{ color: `${sys.textColor}80`, fontFamily: 'monospace' }}>What is the Big Five?</p>
                        <p className="text-[0.78rem] leading-relaxed max-w-lg mx-auto" style={{ color: `${sys.textColor}CC` }}>{sys.whatIs}</p>
                      </div>
                      <div className="flex flex-col lg:flex-row gap-4 items-center">
                      <div className="flex flex-col items-center justify-center flex-1">
                        <svg viewBox="-16 -16 132 132" width="440" height="440" className="max-w-full" style={{ filter: `drop-shadow(0 0 30px ${sys.color}40)` }}>
                          {[0.25, 0.5, 0.75, 1.0].map((pct, ri) => {
                            const ring = Array.from({ length: 5 }, (_, i) => rp(i, pct));
                            const d = ring.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
                            return <path key={ri} d={d} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />;
                          })}
                          {Array.from({ length: 5 }, (_, i) => { const p = rp(i, 1.0); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />; })}
                          <path d={shape} fill={`${sys.color}35`} stroke={sys.color} strokeWidth="1.5" strokeLinejoin="round" style={{ strokeDasharray: 600, strokeDashoffset: 0, animation: 'radarShapeDraw 1.5s ease-out 0.3s both' }} />
                          {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={sys.color} strokeWidth="1.5" style={{ animation: `darkDotAppear 0.3s ease-out ${0.8 + i * 0.1}s both` }} />)}
                          {lblPts.map((p, i) => <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="rgba(255,255,255,0.8)" fontWeight="700" fontFamily="monospace">{B5Full[i].slice(0, 1)}</text>)}
                        </svg>
                      </div>
                      <div className="flex flex-col gap-3 flex-1">
                        {B5.map((trait, i) => {
                          const val = scoreVal[ps.bigFive[trait].score] || 0.5;
                          const desc = ps.bigFive[trait].description || '';
                          return (
                            <div key={trait} style={{ animation: `darkFadeUp 0.4s ease-out ${0.3 + i * 0.08}s both` }}>
                              <div className="flex justify-between mb-1.5">
                                <span className="text-[0.7rem] font-semibold text-white">{B5Full[i]}</span>
                                <span className="text-[0.6rem] font-bold" style={{ color: sys.color, fontFamily: 'monospace' }}>{scoreLbl[ps.bigFive[trait].score] || ''}</span>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="h-full rounded-full" style={{ width: `${val * 100}%`, background: `linear-gradient(90deg, ${sys.color}, ${sys.textColor})`, transformOrigin: 'left', animation: `darkBarFill 0.8s ease-out ${0.4 + i * 0.08}s both`, boxShadow: `0 0 12px ${sys.color}60` }} />
                              </div>
                              <p className="text-[0.72rem] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{cleanText(desc)}</p>
                            </div>
                          );
                        })}
                        <div className="rounded-xl p-4 mt-2" style={{ background: `${sys.color}10`, borderLeft: `3px solid ${sys.color}50` }}>
                          <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-2" style={{ color: `${sys.color}99`, fontFamily: 'monospace' }}>vs your Enneagram Type {leadingType}</p>
                          <p className="text-[0.78rem] leading-relaxed" style={{ color: sys.textColor }}>{sys.vsEnneagram}</p>
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                }

                // ════════ ATTACHMENT ════════
                case 'attachment': {
                  const style = (ps.attachment.style || '').replace(/_/g, ' ');
                  // All 4 attachment styles (Bartholomew & Horowitz, 1991)
                  const zones = [
                    { name: 'Secure', desc: 'Comfortable with closeness and autonomy', color: '#059669' },
                    { name: 'Anxious-Preoccupied', desc: 'Craves closeness, fears abandonment', color: '#D97706' },
                    { name: 'Dismissive-Avoidant', desc: 'Values independence, suppresses need for connection', color: '#BE123C' },
                    { name: 'Fearful-Avoidant', desc: 'Wants closeness but fears vulnerability', color: '#9333EA' },
                  ];
                  const styleMap: Record<string, number> = { secure: 0, 'anxious preoccupied': 1, anxious: 1, 'dismissive avoidant': 2, avoidant: 2, 'fearful avoidant': 3 };
                  const activeIdx = styleMap[style.toLowerCase()] ?? -1;
                  const markerPct = styleMap[style.toLowerCase()] ?? 50;
                  return (
                    <div className="flex flex-col lg:flex-row gap-4 p-4 pb-8 lg:p-6 lg:pb-10">
                      <div className="flex flex-col gap-3 flex-1">
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <p className="text-[0.6rem] uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>What is Attachment Theory?</p>
                          <p className="text-[0.85rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{sys.whatIs}</p>
                        </div>
                        {ps.attachment.growthEdge && (
                          <div className="rounded-xl p-4" style={{ background: 'rgba(122,158,126,0.25)', border: '1px solid rgba(122,158,126,0.4)' }}>
                            <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-2" style={{ color: '#86EFACCC', fontFamily: 'monospace' }}>Growth edge</p>
                            <p className="text-[0.85rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{ps.attachment.growthEdge}</p>
                          </div>
                        )}
                        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-2" style={{ color: `${sys.color}CC`, fontFamily: 'monospace' }}>vs your Enneagram Type {leadingType}</p>
                          <p className="text-[0.82rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>{sys.vsEnneagram}</p>
                        </div>
                      </div>
                      {/* Bartholomew 2×2 attachment model diagram — right half, centered vertically */}
                      <div className="flex items-center justify-center flex-1">
                        <div className="relative w-full max-w-[300px]">
                          {/* Axis labels */}
                          <div className="text-center mb-2">
                            <span className="text-[0.5rem] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>Positive view of others &rarr;</span>
                          </div>
                          <div className="relative aspect-square">
                            {/* Background + grid lines */}
                            <div className="absolute inset-0 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                            <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                            {/* 4 quadrants: Secure(TL), Anxious(TR), Dismissive(BL), Fearful(BR) */}
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-2 gap-1.5">
                              {zones.map((z, zi) => {
                                const isActive = zi === activeIdx;
                                return (
                                  <div key={z.name} className="rounded-xl flex flex-col items-center justify-center text-center p-2 relative overflow-hidden transition-all"
                                    style={{
                                      background: isActive ? z.color : `${z.color}30`,
                                      border: isActive ? `2px solid ${z.color}` : `1px solid ${z.color}50`,
                                      boxShadow: isActive ? `0 0 24px ${z.color}50` : 'none',
                                      animation: `darkFadeUp 0.4s ease-out ${0.2 + zi * 0.1}s both`,
                                    }}>
                                    {isActive && <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${z.color} 0%, ${z.color}BB 100%)` }} />}
                                    <div className="relative">
                                      <p className="font-serif text-[0.85rem] font-bold leading-tight" style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.9)' }}>{z.name.split('-')[0]}</p>
                                      {z.name.includes('-') && <p className="font-serif text-[0.7rem] font-bold leading-tight" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)' }}>{z.name.split('-').slice(1).join('-')}</p>}
                                      <p className="text-[0.5rem] leading-snug mt-1" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)' }}>{z.desc}</p>
                                      {isActive && (
                                        <div className="mt-1.5 bg-white/25 rounded-full px-2.5 py-0.5 inline-block">
                                          <span className="text-[0.45rem] uppercase tracking-wider font-bold text-white" style={{ fontFamily: 'monospace' }}>You</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Bottom axis label */}
                          <div className="flex justify-between mt-2 px-2">
                            <span className="text-[0.45rem] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>+ View of self</span>
                            <span className="text-[0.45rem] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>− View of self</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════ DISC ════════
                case 'disc': {
                  const profile = ps.disc.profile || '—';
                  const profileLetters = profile.split('');
                  const quads = [
                    { letter: 'D', name: 'Dominance', color: '#DC2626' },
                    { letter: 'I', name: 'Influence', color: '#D97706' },
                    { letter: 'S', name: 'Steadiness', color: '#059669' },
                    { letter: 'C', name: 'Conscientiousness', color: '#2563EB' },
                  ];
                  return (
                    <div className="flex flex-col gap-4 p-4 pb-8 lg:p-6 lg:pb-10">
                      {/* What is DISC — centered top */}
                      <div className="text-center">
                        <p className="text-[0.55rem] uppercase tracking-[0.3em] mb-2" style={{ color: `${sys.textColor}80`, fontFamily: 'monospace' }}>What is DISC?</p>
                        <p className="text-[0.78rem] leading-relaxed max-w-md mx-auto" style={{ color: `${sys.textColor}CC` }}>{sys.whatIs}</p>
                      </div>
                      {/* Diagram + bars side by side */}
                      <div className="flex flex-col lg:flex-row gap-6 items-center">
                        <div className="flex items-center justify-center flex-1">
                          <div className="relative w-full max-w-[280px] aspect-square">
                            <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                              {/* Colored quadrant backgrounds */}
                              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                                {quads.map((q) => {
                                  const isActive = profileLetters.includes(q.letter);
                                  return <div key={q.letter + 'bg'} style={{ background: isActive ? `${q.color}12` : 'rgba(255,255,255,0.02)' }} />;
                                })}
                              </div>
                            </div>
                            <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                            <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-4">
                              {quads.map((q, i) => {
                                const isActive = profileLetters.includes(q.letter);
                                const isPrimary = profileLetters[0] === q.letter;
                                return (
                                  <div key={q.letter} className="flex flex-col items-center justify-center gap-1 relative" style={{ animation: `darkFadeUp 0.4s ease-out ${0.2 + i * 0.1}s both` }}>
                                    <span className="font-serif text-[3rem] font-bold transition-colors" style={{ color: isActive ? `${q.color}80` : 'rgba(255,255,255,0.1)' }}>{q.letter}</span>
                                    <span className="text-[0.55rem] font-semibold" style={{ color: isActive ? `${q.color}DD` : 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{q.name}</span>
                                    {isPrimary && (
                                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: q.color, boxShadow: `0 0 16px ${q.color}80`, border: '2px solid white' }}>
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 flex-1">
                          {quads.map((q, i) => {
                            const isActive = profileLetters.includes(q.letter);
                            const barPct = isActive ? (profileLetters[0] === q.letter ? 85 : 65) : 25;
                            return (
                              <div key={q.letter} style={{ animation: `darkFadeUp 0.3s ease-out ${0.4 + i * 0.08}s both` }}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-[0.6rem] uppercase tracking-wider" style={{ color: isActive ? `${q.color}CC` : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{q.name}</span>
                                  <span className="text-[0.55rem] font-bold" style={{ color: isActive ? q.color : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{barPct}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: isActive ? q.color : 'rgba(255,255,255,0.1)', boxShadow: isActive ? `0 0 8px ${q.color}60` : 'none', transformOrigin: 'left', animation: `darkBarFill 0.6s ease-out ${0.5 + i * 0.08}s both` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* vs Enneagram — centered bottom */}
                      <div className="rounded-xl p-4 text-center" style={{ background: `${sys.color}10`, borderLeft: `3px solid ${sys.color}50` }}>
                        <p className="text-[0.55rem] uppercase tracking-[0.2em] mb-1" style={{ color: `${sys.color}99`, fontFamily: 'monospace' }}>vs your Enneagram Type {leadingType}</p>
                        <p className="text-[0.78rem] leading-relaxed" style={{ color: sys.textColor }}>{sys.vsEnneagram}</p>
                      </div>
                    </div>
                  );
                }

                // ════════ JUNGIAN ════════
                case 'jungian': {
                  const stripThe = (s: string) => s.replace(/^the\s+/i, '').trim();
                  const userPrimary = stripThe(ps.jungian.primaryArchetype || '');
                  const userSupporting = (ps.jungian.supportingArchetypes || []).map(stripThe);
                  const shadow = stripThe(ps.jungian.shadowArchetype || '');

                  const ARCH = [
                    { name: 'Innocent', mot: 'Safety' },
                    { name: 'Sage', mot: 'Knowledge' },
                    { name: 'Explorer', mot: 'Freedom' },
                    { name: 'Outlaw', mot: 'Liberation' },
                    { name: 'Magician', mot: 'Power' },
                    { name: 'Hero', mot: 'Mastery' },
                    { name: 'Lover', mot: 'Intimacy' },
                    { name: 'Jester', mot: 'Pleasure' },
                    { name: 'Everyman', mot: 'Belonging' },
                    { name: 'Caregiver', mot: 'Service' },
                    { name: 'Ruler', mot: 'Control' },
                    { name: 'Creator', mot: 'Innovation' },
                  ];
                  const N = 12;
                  const CX = 200, CY = 200;
                  const R_OUT = 115, R_IN = 50;
                  const R_PRIMARY = 180;
                  const R_OTHERS = 148;
                  const R_MOT = 82;

                  const ptR = (r: number, idx: number) => {
                    const a = (idx * 360 / N - 90) * Math.PI / 180;
                    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
                  };
                  const midR = (r: number, idx: number) => {
                    const a = ((idx + 0.5) * 360 / N - 90) * Math.PI / 180;
                    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
                  };
                  const segArc = (r1: number, r2: number, i: number) => {
                    const a1 = (i * 360 / N - 90) * Math.PI / 180;
                    const a2 = ((i + 1) * 360 / N - 90) * Math.PI / 180;
                    const x1 = CX + r2 * Math.cos(a1), y1 = CY + r2 * Math.sin(a1);
                    const x2 = CX + r2 * Math.cos(a2), y2 = CY + r2 * Math.sin(a2);
                    const x3 = CX + r1 * Math.cos(a2), y3 = CY + r1 * Math.sin(a2);
                    const x4 = CX + r1 * Math.cos(a1), y4 = CY + r1 * Math.sin(a1);
                    return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r2},${r2} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r1},${r1} 0 0 0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`;
                  };

                  // Normalize alternate archetype names to canonical ARCH names
                  const ARCH_ALIASES: Record<string, string> = {
                    rebel: 'outlaw', outlaw: 'outlaw',
                    warrior: 'hero', guardian: 'hero',
                    hermit: 'sage', scholar: 'sage', mentor: 'sage',
                    orphan: 'everyman', regular: 'everyman', citizen: 'everyman',
                    artist: 'creator', visionary: 'creator',
                    seeker: 'explorer', wanderer: 'explorer', adventurer: 'explorer',
                    revolutionary: 'outlaw', destroyer: 'outlaw',
                    nurturer: 'caregiver', healer: 'caregiver',
                    trickster: 'jester', fool: 'jester', comedian: 'jester',
                    enchantress: 'magician', wizard: 'magician', alchemist: 'magician',
                    king: 'ruler', queen: 'ruler', sovereign: 'ruler',
                    romantic: 'lover', companion: 'lover',
                    child: 'innocent', dreamer: 'innocent',
                  };
                  const norm = (n: string) => { const l = n.toLowerCase(); return ARCH_ALIASES[l] || l; };
                  const isP = (n: string) => norm(n) === norm(userPrimary);
                  // Only the first supporting archetype gets highlighted
                  const firstSupporting = userSupporting.length > 0 ? norm(userSupporting[0]) : '';
                  const isS = (n: string) => firstSupporting !== '' && norm(n) === firstSupporting;

                  return (
                    <div className="flex flex-col gap-5 p-4 pb-8 lg:p-6 lg:pb-10">
                      <div className="text-center" style={{ animation: 'darkFadeUp 0.5s ease-out 0.1s both' }}>
                        <p className="text-[0.55rem] uppercase tracking-[0.3em] mb-2" style={{ color: `${sys.textColor}90`, fontFamily: 'monospace' }}>What are Jungian Archetypes?</p>
                        <p className="text-[0.78rem] leading-relaxed max-w-lg mx-auto" style={{ color: `${sys.textColor}DD` }}>{sys.whatIs}</p>
                      </div>

                      <div className="flex justify-center">
                        <svg viewBox="0 0 400 400" width="460" height="460" className="max-w-full" style={{ overflow: 'visible' }}>
                          {/* Circles, spokes, dots — no animation, always visible */}
                          <circle cx={CX} cy={CY} r={R_OUT} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                          <circle cx={CX} cy={CY} r={R_IN} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75" />

                          {Array.from({ length: N }, (_, i) => {
                            const p1 = ptR(R_IN, i), p2 = ptR(R_OUT, i);
                            return <line key={`sp${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />;
                          })}

                          <line x1={CX - R_IN} y1={CY} x2={CX + R_IN} y2={CY} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                          <line x1={CX} y1={CY - R_IN} x2={CX} y2={CY + R_IN} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                          {Array.from({ length: N }, (_, i) => {
                            const p = ptR(R_OUT, i);
                            return <circle key={`dt${i}`} cx={p.x} cy={p.y} r="1.5" fill="rgba(255,255,255,0.2)" />;
                          })}

                          {/* Segment highlights — AFTER big labels appear, at 1.7s */}
                          {ARCH.map((a, i) => isP(a.name) ? <path key={`hp${i}`} d={segArc(R_IN, R_OUT, i)} fill="rgba(134,239,172,0.15)" stroke="rgba(134,239,172,0.3)" strokeWidth="0.8" style={{ animation: 'archSegReveal 1.5s ease-out 1.2s both' }} /> : null)}
                          {ARCH.map((a, i) => isS(a.name) && !isP(a.name) ? <path key={`hs${i}`} d={segArc(R_IN, R_OUT, i)} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" style={{ animation: 'archSegReveal 1.5s ease-out 1.2s both' }} /> : null)}

                          {/* Quadrant labels — fade in early */}
                          {['Structure', 'Journey', 'Connection', 'Legacy'].map((q, qi) => {
                            const ox = qi === 0 ? -1 : qi === 1 ? 1 : qi === 2 ? -1 : 1;
                            const oy = qi < 2 ? -1 : 1;
                            return <text key={q} x={CX + ox * R_IN * 0.42} y={CY + oy * R_IN * 0.42} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="rgba(255,255,255,0.4)" fontWeight="500" fontFamily="serif" style={{ animation: `darkFadeUp 0.4s ease-out ${0.15 + qi * 0.06}s both` }}>{q}</text>;
                          })}

                          {/* Motivation labels — spin in clockwise */}
                          {ARCH.map((a, i) => {
                            const m = midR(R_MOT, i);
                            const deg = (i + 0.5) * 360 / N;
                            const rot = deg > 180 ? deg + 180 : deg;
                            return <text key={`mot${i}`} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={isP(a.name) ? 'rgba(134,239,172,0.6)' : 'rgba(255,255,255,0.25)'} fontWeight="400" fontFamily="serif" fontStyle="italic" transform={`rotate(${rot - 90}, ${m.x}, ${m.y})`} style={{ animation: `darkFadeUp 0.3s ease-out ${0.2 + i * 0.05}s both` }}>{a.mot}</text>;
                          })}

                          {/* ═══ PHASE 1: All 12 names spin in clockwise, same dim style ═══ */}
                          {ARCH.map((a, i) => {
                            const m = midR(R_OTHERS, i);
                            const p = isP(a.name);
                            const s = isS(a.name) && !p;
                            return (
                              <text key={`nm${i}`} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle"
                                fontSize="10" fill="rgba(255,255,255,0.3)" fontWeight="400" fontFamily="serif" letterSpacing="0.03em"
                                style={p || s
                                  ? { animationName: 'darkFadeUp, archDimOut', animationDuration: '0.3s, 0.35s', animationDelay: `${0.2 + i * 0.05}s, 0.85s`, animationTimingFunction: 'ease-out, ease-in', animationFillMode: 'both, forwards' }
                                  : { animation: `darkFadeUp 0.3s ease-out ${0.2 + i * 0.05}s both` }
                                }>
                                {a.name}
                              </text>
                            );
                          })}

                          {/* ═══ PHASE 2: Big labels fade in at 1.4s (dim text gone by 1.3s) ═══ */}
                          {ARCH.map((a, i) => {
                            const p = isP(a.name);
                            const s = isS(a.name) && !p;
                            if (!p && !s) return null;

                            if (p) {
                              const m = midR(R_PRIMARY, i);
                              return (
                                <g key={`rv${i}`} style={{ animation: 'archSegReveal 1.5s ease-out 1.2s both' }}>
                                  <circle cx={m.x} cy={m.y} r="36" fill="rgba(134,239,172,0.04)" style={{ animation: 'archPrimaryPulse 4s ease-in-out 2.2s infinite' }} />
                                  <circle cx={m.x} cy={m.y} r="28" fill="none" stroke="rgba(134,239,172,0.25)" strokeWidth="0.6" strokeDasharray="4 3" style={{ animation: 'archPrimaryRing 6s linear 2.2s infinite', transformOrigin: `${m.x}px ${m.y}px` }} />
                                  <circle cx={m.x} cy={m.y} r="22" fill="rgba(134,239,172,0.06)" stroke="rgba(134,239,172,0.15)" strokeWidth="0.4" />
                                  <text x={m.x} y={m.y - 3} textAnchor="middle" dominantBaseline="middle" fontSize="17" fill="#86EFAC" fontWeight="800" fontFamily="serif" letterSpacing="0.02em">{a.name}</text>
                                  <text x={m.x} y={m.y + 14} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="rgba(134,239,172,0.7)" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.2em">PRIMARY</text>
                                </g>
                              );
                            }

                            const m = midR(R_OTHERS, i);
                            return (
                              <g key={`rv${i}`} style={{ animation: 'archSegReveal 1.5s ease-out 1.2s both' }}>
                                <circle cx={m.x} cy={m.y} r="24" fill="rgba(255,255,255,0.03)" style={{ animation: 'archSupportGlow 3s ease-in-out 2.2s infinite' }} />
                                <circle cx={m.x} cy={m.y} r="18" fill="rgba(255,255,255,0.04)" />
                                <text x={m.x} y={m.y - 2} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="rgba(255,255,255,0.9)" fontWeight="700" fontFamily="serif" letterSpacing="0.02em">{a.name}</text>
                                <text x={m.x} y={m.y + 11} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="rgba(255,255,255,0.5)" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.18em">SUPPORTING</text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-3" style={{ animation: 'darkFadeUp 0.5s ease-out 0.3s both' }}>
                        <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <p className="text-[0.55rem] uppercase tracking-[0.15em] mb-1" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>Primary Archetype</p>
                          <p className="font-serif text-[1.3rem] font-bold text-white">{userPrimary}</p>
                          {userSupporting.length > 0 && <p className="text-[0.7rem] mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Supported by {userSupporting.join(' & ')}</p>}
                          {ps.jungian.reasoning && <p className="text-[0.75rem] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.75)' }}>{cleanInsight(ps.jungian.reasoning)}</p>}
                        </div>
                        <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                          <p className="text-[0.55rem] uppercase tracking-[0.15em] mb-1" style={{ color: '#A78BFA99', fontFamily: 'monospace' }}>The Shadow</p>
                          <p className="font-serif text-[1.3rem] font-bold text-[#A78BFA]">{shadow}</p>
                          {ps.jungian.shadowNote && <p className="text-[0.75rem] italic leading-relaxed mt-1 text-[#94A3B8]">{(() => { const s = ps.jungian.shadowNote; const sents = s.match(/[^.!?]+[.!?]+/g) || []; return sents.slice(0, 2).join(' ').trim() || s.slice(0, 200); })()}</p>}
                        </div>
                      </div>

                      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', animation: 'darkFadeUp 0.5s ease-out 0.4s both' }}>
                        <p className="text-[0.55rem] uppercase tracking-[0.15em] mb-1" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>vs your Enneagram Type {leadingType}</p>
                        <p className="text-[0.78rem] leading-relaxed" style={{ color: sys.textColor }}>{sys.vsEnneagram}</p>
                      </div>
                    </div>
                  );
                }

                // ════════ HUMAN DESIGN ════════
                case 'humanDesign': {
                  const hdType = ps.humanDesign.likelyType || '—';
                  const HD_TYPES = [
                    { name: 'Manifestor', desc: 'Initiates and impacts', color: '#DC2626', icon: '⚡' },
                    { name: 'Generator', desc: 'Responds with sustained energy', color: '#D97706', icon: '☀' },
                    { name: 'Manifesting Generator', desc: 'Multi-passionate responder', color: '#059669', icon: '✦' },
                    { name: 'Projector', desc: 'Guides and sees clearly', color: '#2563EB', icon: '◇' },
                    { name: 'Reflector', desc: 'Mirrors the environment', color: '#7C3AED', icon: '○' },
                  ];
                  const bullets = (ps.humanDesign.reasoning || '').split(/[.!?]+/).filter(s => s.trim()).slice(0, 3).map(s => s.trim() + '.');
                  return (
                    <div className="p-4 pb-8 lg:p-6 lg:pb-10">
                      <div className="max-w-2xl mx-auto flex flex-col gap-5">
                        <div className="text-center">
                          <p className="text-[0.55rem] uppercase tracking-[0.3em] mb-2" style={{ color: `${sys.textColor}80`, fontFamily: 'monospace' }}>What is Human Design?</p>
                          <p className="text-[0.78rem] leading-relaxed max-w-md mx-auto" style={{ color: `${sys.textColor}CC` }}>{sys.whatIs}</p>
                        </div>
                        {/* Type cards — each with its own accent color */}
                        <div className="flex flex-col gap-2">
                          {HD_TYPES.map((t, i) => {
                            const isUser = hdType.toLowerCase().includes(t.name.toLowerCase());
                            return (
                              <div key={t.name} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                                style={{
                                  background: isUser ? `${t.color}15` : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${isUser ? t.color + '40' : 'rgba(255,255,255,0.06)'}`,
                                  boxShadow: isUser ? `0 0 20px ${t.color}15` : 'none',
                                  animation: `darkFadeUp 0.4s ease-out ${0.15 + i * 0.08}s both`,
                                }}>
                                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
                                  style={{ background: isUser ? `${t.color}25` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${isUser ? t.color + '60' : 'rgba(255,255,255,0.08)'}`, boxShadow: isUser ? `0 0 12px ${t.color}30` : 'none' }}>
                                  <span style={{ color: isUser ? t.color : 'rgba(255,255,255,0.2)' }}>{t.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[0.75rem] font-bold" style={{ color: isUser ? t.color : 'rgba(255,255,255,0.35)' }}>{t.name}</p>
                                  <p className="text-[0.6rem] leading-snug mt-0.5" style={{ color: isUser ? `${t.color}BB` : 'rgba(255,255,255,0.2)' }}>{t.desc}</p>
                                </div>
                                {isUser && <span className="text-[0.5rem] uppercase tracking-wider flex-shrink-0 font-bold" style={{ color: t.color, fontFamily: 'monospace' }}>You</span>}
                              </div>
                            );
                          })}
                        </div>
                        {/* Reasoning as warm prose */}
                        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(217,119,6,0.06))', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <p className="font-serif text-[0.88rem] italic leading-relaxed text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {cleanInsight(ps.humanDesign.reasoning || '')}
                          </p>
                        </div>
                        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                          <p className="text-[0.6rem] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>Community-based framework · No peer-reviewed research · Take what resonates</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                default: return null;
              }
            };

            // ── Result values for collapsed cards ──
            const getResult = (key: SystemKey) => {
              switch (key) {
                case 'mbti': return ps.mbti.primary || '—';
                case 'bigFive': return 'OCEAN';
                case 'attachment': { const s = (ps.attachment.style || '').replace(/_/g, ' '); return s ? `${s} Attachment` : '—'; }
                case 'disc': return ps.disc.profile || '—';
                case 'jungian': return (ps.jungian.primaryArchetype || '—').replace(/^The\s+/i, '');
                case 'humanDesign': return ps.humanDesign.likelyType || '—';
              }
            };

            // ── Detail view — full-bleed with floating peek cards ──
            if (openSys) {
              const sysIndex = SYSTEMS.findIndex(s => s.key === openSys);
              const sys = SYSTEMS[sysIndex];
              const result = getResult(openSys);
              const mbtiName = openSys === 'mbti' ? (MBTI_NAMES[ps.mbti.primary || ''] || '') : '';
              const prevSys = SYSTEMS[(sysIndex - 1 + SYSTEMS.length) % SYSTEMS.length];
              const nextSys = SYSTEMS[(sysIndex + 1) % SYSTEMS.length];

              return (
                <div className="relative" style={{ animation: 'darkCardEnter 0.4s ease-out both', margin: '0 calc(-50vw + 50%)', width: '100vw' }}>
                  {/* Top bar: dots + All Systems — inset */}
                  <div className="flex items-center justify-between mb-3 px-6 lg:px-12">
                    <div className="flex gap-1.5 items-center">
                      {SYSTEMS.map((s, i) => (
                        <button key={s.key} onClick={() => setExpandedSystem(s.key)}
                          className="rounded-full transition-all duration-300"
                          style={{ width: i === sysIndex ? 22 : 7, height: 7, background: i === sysIndex ? s.color : `${s.color}35`, borderRadius: 4 }} />
                      ))}
                    </div>
                    <button onClick={() => setExpandedSystem(null)}
                      className="flex items-center gap-2 rounded-full px-4 py-2 transition-all hover:bg-[#2563EB]/10 active:scale-95"
                      style={{ border: '1.5px solid #2563EB', background: 'white', boxShadow: '0 2px 8px rgba(37,99,235,0.12)' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1h5v5H1zM8 1h5v5H8zM1 8h5v5H1zM8 8h5v5H8z" stroke="#2563EB" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                      <span className="font-sans text-[0.72rem] font-bold text-[#2563EB]">All Systems</span>
                    </button>
                  </div>

                  {/* 3-column layout: peek | main | peek — always loops */}
                  <div className="flex items-center gap-2 px-2 lg:px-4">
                    {/* ← Prev peek */}
                    <button onClick={() => setExpandedSystem(prevSys.key)}
                      className="flex-shrink-0 w-[18%] rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:opacity-75 hover:scale-[1.03] self-stretch"
                      style={{ opacity: 0.4, background: prevSys.bg, border: `1px solid ${prevSys.color}30`, boxShadow: `0 4px 20px ${prevSys.color}12` }}>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 30%, ${prevSys.glow}25 0%, transparent 70%)` }} />
                      <div className="relative flex flex-col items-center justify-center gap-2 p-3 h-full">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${prevSys.color}20`, border: `2px solid ${prevSys.color}40`, animation: 'peekBobLeft 2s ease-in-out infinite' }}>
                          <span className="text-white text-lg">&larr;</span>
                        </div>
                        <span className="font-serif text-[0.75rem] font-bold text-white/70 text-center leading-tight">{prevSys.label}</span>
                        <span className="font-serif text-[0.7rem] font-bold capitalize text-center" style={{ color: prevSys.color }}>{getResult(prevSys.key).replace(/\bOr\b/g, 'or')}</span>
                      </div>
                    </button>

                    {/* Current detail card — center */}
                    <div className="flex-1 min-w-0 relative z-20 rounded-2xl overflow-hidden" style={{ background: sys.bg, border: `1px solid ${sys.color}35`, boxShadow: `0 8px 40px ${sys.color}25, 0 0 60px ${sys.color}08` }}>
                      {/* Animated mesh atmosphere — three drifting orbs */}
                      <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[55%] rounded-full pointer-events-none z-0 blur-2xl" style={{ background: `radial-gradient(circle, ${sys.glow}60 0%, transparent 65%)`, animation: 'meshDrift1 8s ease-in-out infinite' }} />
                      <div className="absolute bottom-[-10%] left-[-15%] w-[50%] h-[50%] rounded-full pointer-events-none z-0 blur-3xl" style={{ background: `radial-gradient(circle, ${sys.glow}45 0%, transparent 60%)`, animation: 'meshDrift2 11s ease-in-out infinite' }} />
                      <div className="absolute top-[25%] right-[10%] w-[40%] h-[40%] rounded-full pointer-events-none z-0 blur-2xl" style={{ background: `radial-gradient(circle, ${sys.glow}35 0%, transparent 55%)`, animation: 'meshDrift3 14s ease-in-out infinite' }} />
                      <div className="relative z-10 p-4 lg:p-6 text-center">
                        <div className="flex justify-center"><ConfBadge level={sys.conf} color={sys.color} /></div>
                        <h3 className="font-serif text-[1.4rem] lg:text-[1.8rem] font-bold text-white mt-1 leading-tight" style={{ textShadow: `0 0 30px ${sys.color}40` }}>{sys.label}</h3>
                        <p className="font-serif text-[1.1rem] lg:text-[1.4rem] font-bold leading-tight capitalize mt-1 break-words" style={{ color: sys.color }}>{result.replace(/\bOr\b/g, 'or')}</p>
                        {mbtiName && <p className="text-[0.65rem] italic mt-0.5" style={{ color: `${sys.textColor}80` }}>{mbtiName}</p>}
                      </div>
                      <div className="relative z-10">
                        {renderExpanded(openSys)}
                      </div>
                    </div>

                    {/* → Next peek */}
                    <button onClick={() => setExpandedSystem(nextSys.key)}
                      className="flex-shrink-0 w-[18%] rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:opacity-75 hover:scale-[1.03] self-stretch"
                      style={{ opacity: 0.4, background: nextSys.bg, border: `1px solid ${nextSys.color}30`, boxShadow: `0 4px 20px ${nextSys.color}12` }}>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 30%, ${nextSys.glow}25 0%, transparent 70%)` }} />
                      <div className="relative flex flex-col items-center justify-center gap-2 p-3 h-full">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${nextSys.color}20`, border: `2px solid ${nextSys.color}40`, animation: 'peekBob 2s ease-in-out infinite' }}>
                          <span className="text-white text-lg">&rarr;</span>
                        </div>
                        <span className="font-serif text-[0.75rem] font-bold text-white/70 text-center leading-tight">{nextSys.label}</span>
                        <span className="font-serif text-[0.7rem] font-bold capitalize text-center" style={{ color: nextSys.color }}>{getResult(nextSys.key).replace(/\bOr\b/g, 'or')}</span>
                      </div>
                    </button>
                  </div>
                </div>
              );
            }

            // ── All systems grid (collapsed) ──
            return (
              <div className="grid grid-cols-2 gap-2.5">
                {SYSTEMS.map((sys, i) => {
                  const result = getResult(sys.key);
                  const resultIsLong = result.length > 15;
                  const discBlend = sys.key === 'disc' ? (ps.disc.blend || '').split(/[—–,]/)[0].trim() : '';
                  const mbtiName = sys.key === 'mbti' ? (MBTI_NAMES[ps.mbti.primary || ''] || '') : '';

                  return (
                    <button key={sys.key}
                      onClick={() => setExpandedSystem(sys.key)}
                      className="text-left rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: sys.bg, border: `1px solid ${sys.color}30`, boxShadow: `0 2px 16px ${sys.color}12`, animation: `darkCardEnter 0.5s ease-out ${i * 0.06}s both` }}
                    >
                      <div className="relative p-4 overflow-hidden">
                        {/* Animated mesh orbs */}
                        <div className="absolute top-[-20%] right-[-15%] w-[70%] h-[70%] rounded-full pointer-events-none blur-xl" style={{ background: `radial-gradient(circle, ${sys.glow}50 0%, transparent 65%)`, animation: 'meshDrift1 9s ease-in-out infinite' }} />
                        <div className="absolute bottom-[-15%] left-[-20%] w-[60%] h-[60%] rounded-full pointer-events-none blur-2xl" style={{ background: `radial-gradient(circle, ${sys.glow}40 0%, transparent 60%)`, animation: 'meshDrift2 12s ease-in-out infinite' }} />
                        <div className="relative">
                          <ConfBadge level={sys.conf} color={sys.color} />
                          <p className="font-serif text-[0.85rem] font-bold text-white mt-1.5 leading-tight">{sys.label}</p>
                          {resultIsLong ? (
                            <p className="font-serif text-[1.1rem] font-bold capitalize mt-2 leading-tight" style={{ color: sys.color }}>{result}</p>
                          ) : (
                            <p className="font-serif text-[1.4rem] font-bold capitalize mt-1 leading-none" style={{ color: sys.color }}>{result}</p>
                          )}
                          {mbtiName && <p className="text-[0.55rem] italic mt-0.5 truncate" style={{ color: `${sys.textColor}50` }}>{mbtiName}</p>}
                          {discBlend && <p className="text-[0.55rem] italic mt-0.5 truncate" style={{ color: `${sys.textColor}50` }}>{discBlend}</p>}
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-[0.45rem] uppercase tracking-wider" style={{ color: `${sys.textColor}35`, fontFamily: 'monospace' }}>Explore</span>
                            <span className="text-[0.6rem]" style={{ color: `${sys.textColor}35` }}>&rarr;</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
                  { label: 'Whole Type', value: wholeType || '—', color: '#2C2C2C' },
                ].map(m => (
                  <div key={m.label}>
                    <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#9B9590] block">{m.label}</span>
                    <span className="font-serif text-[1.3rem] font-bold" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ LOW CONFIDENCE NUANCE NOTE ═══ */}
            {!!(r.lowConfidenceFlag) && (
              <div className="mt-6 px-6 py-4 bg-[#F5F0EB] rounded-xl border border-[#E0D5C8]"
                style={{ animation: 'type-reveal-text 0.8s ease-out 1.7s forwards', opacity: 0 }}>
                <p className="font-serif text-[0.95rem] text-[#5A4A3A] leading-relaxed">
                  Your results suggest a strong pattern with some nuance worth exploring.
                  The types closest to yours share meaningful overlap &mdash; which is itself
                  a meaningful insight about who you are.
                </p>
              </div>
            )}

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
      case 1: {
        const ess1 = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header — type-tinted */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">The Wound &amp; The Gift</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Superpower &amp; Kryptonite</h2>
            </div>
            {/* Superpower — warm, expansive */}
            <div className="rounded-2xl overflow-hidden sr-card relative" style={{ animationDelay: '0.15s' }}>
              {/* Warm glow orb */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[200px] h-[200px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', animation: 'warmGlow 4s ease-in-out infinite' }} />
              </div>
              {/* Accent bar with entrance animation + radiating lines */}
              <div className="h-1 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] relative" style={{ transformOrigin: 'left', animation: 'accentBarEnter 0.6s ease-out both' }}>
                <svg className="absolute top-0 left-0 w-full h-8 pointer-events-none overflow-visible" viewBox="0 0 600 30">
                  <line x1="0" y1="1" x2="100" y2="28" stroke="#F59E0B" strokeWidth="0.5" opacity="0.15" strokeDasharray="40" style={{ animation: 'radiateOut 1.5s ease-out 0.6s both' }} />
                  <line x1="200" y1="1" x2="260" y2="25" stroke="#FBBF24" strokeWidth="0.4" opacity="0.12" strokeDasharray="40" style={{ animation: 'radiateOut 1.5s ease-out 0.8s both' }} />
                  <line x1="400" y1="1" x2="480" y2="22" stroke="#F59E0B" strokeWidth="0.3" opacity="0.10" strokeDasharray="40" style={{ animation: 'radiateOut 1.5s ease-out 1s both' }} />
                </svg>
              </div>
              <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative">
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#B45309] mb-3">
                  Your Superpower
                </p>
                <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]">
                  {portalMode ? (superpower || (r.superpower_description as string) || '') : <TypewriterText text={superpower || (r.superpower_description as string) || ''} delay={300} />}
                </p>
              </div>
            </div>
            {/* Kryptonite — cool, contained */}
            <div className="rounded-2xl overflow-hidden sr-card relative" style={{ animationDelay: '0.4s' }}>
              {/* Accent bar with shimmer */}
              <div className="h-1 relative" style={{ transformOrigin: 'left', animation: 'accentBarEnter 0.6s ease-out 0.4s both' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#64748B] to-[#94A3B8]" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmerSlide 6s ease-in-out infinite' }} />
              </div>
              <div className="p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative" style={{ background: 'linear-gradient(180deg, #FAFAFA, #F5F5F8)' }}>
                <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#475569] mb-3">
                  Your Kryptonite
                </p>
                <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]">
                  {portalMode ? (kryptonite || (r.kryptonite_description as string) || '') : <TypewriterText text={kryptonite || (r.kryptonite_description as string) || ''} delay={1500} />}
                </p>
              </div>
            </div>
            {continueButton}
          </div>
        );
      }

      // ── Section 2: React / Respond ──
      case 2: {
        const ess2 = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];
        const scenarios = (r.real_world_scenarios as Array<{ situation: string; react: string; respond: string }>) || [];
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header — type-tinted */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Defiant Spirit</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">React &amp; Respond</h2>
            </div>
            {/* React — tense, constrained */}
            {reactPattern && (
              <div className="rounded-2xl overflow-hidden sr-card relative" style={{ animationDelay: '0.15s' }}>
                {/* Diagonal tension lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 200">
                  <line x1="0" y1="200" x2="150" y2="0" stroke="rgba(220,38,38,0.04)" strokeWidth="1" />
                  <line x1="100" y1="200" x2="280" y2="0" stroke="rgba(220,38,38,0.03)" strokeWidth="0.8" />
                  <line x1="250" y1="200" x2="400" y2="20" stroke="rgba(220,38,38,0.035)" strokeWidth="0.6" />
                </svg>
                {/* Accent bar — fast overshoot */}
                <div className="h-1 bg-gradient-to-r from-[#DC2626] to-[#F87171] relative"
                  style={{ transformOrigin: 'left', animation: 'accentBarEnter 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                  <div className="absolute inset-0 rounded" style={{ boxShadow: '0 0 8px rgba(220,38,38,0.15)', animation: 'warmGlow 3s ease-in-out infinite' }} />
                </div>
                <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative">
                  <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#DC2626] mb-3">How You React</p>
                  <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]">{portalMode ? reactPattern : <TypewriterText text={reactPattern} delay={300} />}</p>
                </div>
              </div>
            )}
            {/* Respond — open, settled */}
            {respondPathway && (
              <div className="rounded-2xl overflow-hidden sr-card relative" style={{ animationDelay: '0.4s' }}>
                {/* Gentle arc */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 200">
                  <path d="M0 180 Q200 40 400 180" fill="none" stroke="rgba(37,99,235,0.05)" strokeWidth="1.5" />
                </svg>
                {/* Accent bar — slow exhale */}
                <div className="h-1 bg-gradient-to-r from-[#2563EB] to-[#60A5FA]"
                  style={{ transformOrigin: 'left', animation: 'accentBarEnter 0.8s ease-out 0.4s both' }} />
                <div className="bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative">
                  <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#2563EB] mb-3">How You Respond</p>
                  <p className="font-serif text-[1.05rem] text-[#2C2C2C] leading-[1.8]">{portalMode ? respondPathway : <TypewriterText text={respondPathway} delay={1200} />}</p>
                </div>
              </div>
            )}
            {/* Real-world scenarios */}
            {scenarios.length > 0 && (
              <div className="flex flex-col gap-3 sr-card" style={{ animationDelay: '0.6s' }}>
                <p className="font-mono text-[0.6rem] text-[#6B6B6B] uppercase tracking-[0.12em] px-1">How this plays out</p>
                {scenarios.map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#E8E4E0] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] sr-card"
                    style={{ animationDelay: `${0.7 + i * 0.1}s` }}>
                    <div className="px-5 py-3 bg-[#FAFAF8] border-b border-[#E8E4E0]">
                      <p className="font-serif text-[0.88rem] text-[#2C2C2C]">{s.situation}</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-[#E8E4E0]">
                      <div className="px-4 py-3">
                        <p className="font-mono text-[0.5rem] uppercase tracking-widest text-[#DC2626] mb-1.5">React</p>
                        <p className="font-sans text-[0.78rem] text-[#4B5563] leading-[1.6]">{s.react}</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-mono text-[0.5rem] uppercase tracking-widest text-[#2563EB] mb-1.5">Respond</p>
                        <p className="font-sans text-[0.78rem] text-[#4B5563] leading-[1.6]">{s.respond}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {continueButton}
          </div>
        );
      }

      // ── Section 3: OYN Dimensions ──
      case 3: {
        const oynEntries = Object.entries(oynSummary).filter(([, v]) => v?.trim());
        const oynColors = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
        const oynIcons: Record<string, string> = {
          who: 'M12 4a4 4 0 100 8 4 4 0 000-8zM6 20c0-3.3 2.7-6 6-6s6 2.7 6 6',
          what: 'M12 2L2 12l10 10 10-10L12 2zM12 6l6 6-6 6-6-6 6-6z',
          why: 'M12 4a4 4 0 00-4 4c0 2 1 3 2.5 3.5L12 14l1.5-2.5C15 10 16 9 16 8a4 4 0 00-4-4zm0 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3',
          how: 'M12 2a2 2 0 012 2v1a7 7 0 014.5 2.5l.7-.7a2 2 0 112.8 2.8l-.7.7A7 7 0 0122 12h1a2 2 0 010 4h-1a7 7 0 01-2.5 4.5l.7.7a2 2 0 11-2.8 2.8l-.7-.7A7 7 0 0112 22v1a2 2 0 01-4 0v-1a7 7 0 01-4.5-2.5l-.7.7a2 2 0 11-2.8-2.8l.7-.7A7 7 0 012 12H1a2 2 0 010-4h1a7 7 0 012.5-4.5L3.8 2.8A2 2 0 116.6.0l.7.7A7 7 0 0112 3V2z',
          when: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3v7l5 3',
          where: 'M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
        };
        const ess3 = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center">
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Own Your Number</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">OYN Dimensions</h2>
              <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-1">How your type shows up across six life dimensions.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {oynEntries.map(([key, value], i) => {
                const color = oynColors[i % oynColors.length];
                const iconPath = oynIcons[key] || oynIcons.who;
                return (
                  <div key={key} className="rounded-2xl overflow-hidden sr-card flex flex-col"
                    style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
                    <div className="h-1 flex-shrink-0" style={{ background: color, transformOrigin: 'left', animation: `accentBarEnter 0.5s ease-out ${0.1 + i * 0.15}s both` }} />
                    <div className="bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={iconPath} />
                        </svg>
                        <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
                          {oynLabels[key] ?? key.toUpperCase()}
                        </p>
                      </div>
                      {/* Decorative bar */}
                      <div className="h-[2px] rounded-full mb-3" style={{ width: `${Math.min(80, Math.max(30, (value?.length || 50) / 2))}%`, background: `${color}20`, animation: `accentBarEnter 0.5s ease-out ${0.3 + i * 0.15}s both`, transformOrigin: 'left' }} />
                      <p className="font-sans text-[0.9rem] text-[#2C2C2C] leading-relaxed">{value}</p>
                    </div>
                  </div>
                );
              })}
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

      // ── Section 5: Whole Type ──
      case 5: {
        // Parse whole type digits and map to centers
        const wholeTypeDigits = wholeType.replace(/\D/g, '').split('').map(Number);
        const centerColors: Record<string, { bg: string; text: string; label: string }> = {
          Body: { bg: '#FEF3C7', text: '#92400E', label: 'Body' },
          Heart: { bg: '#FCE7F3', text: '#9D174D', label: 'Heart' },
          Head: { bg: '#DBEAFE', text: '#1E40AF', label: 'Head' },
        };

        // Top 3 overall types (separate from whole type)
        const typeScoresRaw = (r.variant_signals ? r : r) as Record<string, unknown>;
        const allTypeScores = Object.entries(
          (r as Record<string, unknown>).type_scores as Record<string, number> ?? {}
        ).map(([t, s]) => ({ type: Number(t), score: s }))
          .sort((a, b) => b.score - a.score);
        const top3Overall = allTypeScores.slice(0, 3);

        // Lowest scoring type
        const lowestType = allTypeScores.length > 0 ? allTypeScores[allTypeScores.length - 1] : null;
        const lowestOnEnergizingPoint = lowestType ? ENERGIZING_POINTS[leadingType] === lowestType.type : false;
        const lowestOnResolutionPoint = lowestType ? RESOLUTION_POINTS[leadingType] === lowestType.type : false;

        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full">
            {/* Section header */}
            <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3 text-center sr-card" style={{ animationDelay: '0.05s' }}>
              <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Three Centers</p>
              <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Your Whole Type</h2>
            </div>
            {/* Whole Type */}
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sr-card" style={{ animationDelay: '0.1s' }}>
              <p className="font-sans text-[0.75rem] text-[#6B6B6B] mb-5 leading-relaxed">
                Your dominant type in each of the three intelligence centers: Body, Heart, and Head.
              </p>
              {wholeType ? (
                <>
                  {/* Hyphenated whole type display */}
                  <p className="font-serif text-[2.5rem] font-bold text-[#2C2C2C] leading-none mb-4 sr-card" style={{ animationDelay: '0.2s' }}>
                    {wholeTypeDigits.join(' – ')}
                  </p>
                  {wholeTypeConfidence > 0 && (
                    <p className="font-sans text-xs text-[#9B9590] mb-4">
                      {Math.round(wholeTypeConfidence * 100)}% confidence
                    </p>
                  )}
                  {wholeTypeArchetype && (
                    <div className="bg-[#FAF8F5] rounded-xl p-4 mb-4">
                      <p className="font-sans text-[0.7rem] text-[#9B9590] mb-1">Archetype</p>
                      <p className="font-sans text-sm font-semibold text-[#2C2C2C]">{wholeTypeArchetype}</p>
                    </div>
                  )}
                  {/* Center-labeled whole type cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {wholeTypeDigits.map((digit, i) => {
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
                  Whole Type data is still forming. Continue exploring with Soulo.
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
                  {(() => {
                    // Normalize scores: top score = its real share of total, shown as relative %
                    const totalScore = top3Overall.reduce((sum, t) => sum + t.score, 0);
                    const maxScore = top3Overall[0]?.score || 1;
                    return top3Overall.map((t, i) => {
                      // Show as percentage of max score (top type = ~95%, others proportional)
                      const relPct = totalScore > 0 ? Math.round((t.score / totalScore) * 100) : 0;
                      // For bar width, use relative to max
                      const barPct = maxScore > 0 ? Math.round((t.score / maxScore) * 100) : 0;
                      return (
                        <div key={t.type} className="flex items-center gap-3">
                          <span className="font-serif text-lg font-bold w-8 text-[#2C2C2C]">{t.type}</span>
                          <AnimatedBar percent={barPct} color={i === 0 ? '#2563EB' : i === 1 ? '#60A5FA' : '#93C5FD'} delay={700 + i * 150} height="h-2.5" numberClassName="text-[#9B9590]" showNumber={false} />
                          <span className="font-mono text-[0.7rem] font-semibold w-10 text-right" style={{ color: i === 0 ? '#2563EB' : '#9B9590' }}>{relPct}%</span>
                          <span className="font-sans text-xs text-[#9B9590] w-20 text-right truncate">
                            {TYPE_NAMES[t.type] || ''}
                          </span>
                        </div>
                      );
                    });
                  })()}
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
                {(lowestOnEnergizingPoint || lowestOnResolutionPoint) && (
                  <p className="font-sans text-xs text-[#6B6B6B] leading-relaxed">
                    {lowestOnResolutionPoint && (
                      <>This is your resolution point — the energy you move toward in growth. Low activation here may explain difficulty accessing that state.</>
                    )}
                    {lowestOnEnergizingPoint && (
                      <>This is your energizing point — the pattern you fall into under pressure. Low activation here suggests this pattern is less familiar to you.</>
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
        const ess7 = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];
        const profileRows = [
          { label: 'Type', value: `${leadingType} — ${typeName}`, color: ess7.colors[1], show: true },
          { label: 'Defiant Spirit Name', value: dsName, color: '#7A9E7E', show: !!dsName },
          { label: 'Wing', value: wing, color: '#2C2C2C', show: !!wing },
          { label: 'Instinctual Variant', value: variant, color: '#2C2C2C', show: !!variant },
          { label: 'Whole Type', value: wholeType, color: '#2C2C2C', show: !!wholeType },
        ].filter(r => r.show);
        return (
          <div className="flex flex-col gap-5 max-w-[600px] w-full relative">
            {/* Type atmosphere glow */}
            <div className="absolute inset-0 flex items-center justify-start pointer-events-none">
              <div className="w-[300px] h-[300px] rounded-full -translate-x-1/4" style={{ background: `radial-gradient(circle, ${ess7.colors[0]}08 0%, transparent 70%)` }} />
            </div>
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sr-card relative" style={{ animationDelay: '0.1s', borderBottom: `3px solid ${ess7.colors[1]}` }}>
              {/* Decorative enneagram symbol */}
              <div className="flex justify-center mb-4">
                <svg width="48" height="48" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E4E0" strokeWidth="1" />
                  {[9,1,2,3,4,5,6,7,8].map((t, idx) => {
                    const a = (idx * 40 * Math.PI) / 180;
                    const px = 50 + 38 * Math.sin(a);
                    const py = 50 - 38 * Math.cos(a);
                    return <circle key={t} cx={px} cy={py} r={t === leadingType ? 4 : 2} fill={t === leadingType ? ess7.colors[1] : '#E8E4E0'} />;
                  })}
                </svg>
              </div>
              <p className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#9B9590] mb-4 text-center">
                Your Full Profile
              </p>
              <div className="flex flex-col gap-3">
                {profileRows.map((row, i) => (
                  <div key={row.label} className="flex items-center justify-between sr-card" style={{ animationDelay: `${0.2 + i * 0.06}s` }}>
                    <span className="font-sans text-sm text-[#6B6B6B]">{row.label}</span>
                    <span className="font-sans text-sm font-semibold flex items-center gap-1.5" style={{ color: row.color }}>
                      {i === 0 && <span className="inline-block w-3 h-3 rounded-full" style={{ background: ess7.colors[1] }} />}
                      {row.value}
                    </span>
                  </div>
                ))}
                {/* Confidence with ring gauge */}
                <div className="flex items-center justify-between border-t border-[#E8E4E0] pt-3 mt-1 sr-card" style={{ animationDelay: `${0.2 + profileRows.length * 0.06}s` }}>
                  <span className="font-sans text-sm text-[#6B6B6B]">Confidence</span>
                  <span className="font-sans text-sm font-semibold text-[#2563EB] flex items-center gap-1.5">
                    <svg width="28" height="28" viewBox="0 0 28 28" className="inline-block">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="#E8E4E0" strokeWidth="2.5" />
                      <circle cx="14" cy="14" r="11" fill="none" stroke="#2563EB" strokeWidth="2.5"
                        strokeLinecap="round" strokeDasharray={2 * Math.PI * 11}
                        strokeDashoffset={2 * Math.PI * 11 * (1 - (confidencePct || 0) / 100)}
                        transform="rotate(-90 14 14)"
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                    </svg>
                    {confidencePct}%
                  </span>
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
          <div className="flex flex-col w-full max-w-[1150px] items-center gap-8">

            {/* ═══ Header — only in portal mode ═══ */}
            {portalMode && (
              <div className="w-full text-center sr-card" style={{ animationDelay: '0.05s' }}>
                <div className="bg-gradient-to-b from-[#F0F4FF] to-transparent rounded-2xl px-6 pt-6 pb-3">
                  <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">Your Assessment</p>
                  <h2 className="font-serif text-[1.4rem] font-bold text-[#2C2C2C]">Key Takeaways</h2>
                  <p className="font-sans text-[0.78rem] italic text-[#9B9590] mt-1">A personal note from your guide, and ways to keep your results close</p>
                </div>
              </div>
            )}

            {/* ═══ ONE CONTINUOUS DARK CARD — Baruch + Downloads ═══ */}
            <div className="w-full rounded-3xl overflow-hidden sr-card relative"
              style={{ background: `linear-gradient(165deg, ${ess.colors[0]} 0%, #1E293B 35%, #0F172A 100%)`, animationDelay: '0.05s' }}>
              {/* Ambient glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 20%, ${ess.colors[1]}15 0%, transparent 60%)` }} />
              {/* Subtle enneagram watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.03, top: -100 }}>
                <svg viewBox="0 0 100 100" width="500" height="500">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.2" />
                </svg>
              </div>

              <div className="relative z-10">
                {/* ── A note from Dr. Baruch HaLevi ── */}
                <div className="px-8 pt-14 pb-8">
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <p className="font-serif italic text-[0.8rem] text-white/40">A note from your guide</p>
                  </div>
                  {/* Photo + identity — blur-to-clarity */}
                  <motion.div
                    initial={{ opacity: 0.3, filter: 'blur(10px)', scale: 1.03 }}
                    whileInView={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                    viewport={{ once: true, margin: '-60px' }}
                    className="flex flex-col items-center mb-5"
                  >
                    <div className="relative mb-3">
                      <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 40px ${ess.colors[1]}20, 0 0 80px ${ess.colors[1]}08`, transform: 'scale(1.2)' }} />
                      <img src="/baruch.jpg" alt="Dr. Baruch HaLevi"
                        className="relative w-[88px] h-[88px] object-cover rounded-full border-[2px] border-white/15"
                        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }} />
                    </div>
                    <p className="font-serif text-[0.92rem] font-semibold text-white/90">Dr. Baruch HaLevi</p>
                    <p className="font-sans text-[0.6rem] text-white/40 mt-0.5">Creator of the Defiant Spirit Methodology</p>
                  </motion.div>

                  {/* Quote — glassmorphic, tight to photo */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
                    viewport={{ once: true, margin: '-60px' }}
                    className="max-w-[520px] mx-auto"
                  >
                    <div className="rounded-2xl px-7 py-6 relative overflow-hidden"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.12)',
                      }}>
                      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `linear-gradient(135deg, ${ess.colors[1]}08, transparent 50%)` }} />
                      <div className="relative z-10 text-center">
                        <p className="font-serif text-[0.95rem] text-[#FAF8F5]/80 leading-[1.85] italic mb-4">
                          &ldquo;The number is not the destination. It is the starting point of the return to wholeness — the moment you stop being run by a pattern and start choosing who you become.&rdquo;
                        </p>
                        {defy && (
                          <>
                            <div className="w-10 h-px mx-auto mb-4" style={{ background: `linear-gradient(to right, transparent, ${ess.colors[1]}35, transparent)` }} />
                            <p className="font-serif text-[0.88rem] text-[#FAF8F5]/55 leading-[1.85]">{defy}</p>
                          </>
                        )}
                        <p className="font-serif italic text-[0.82rem] mt-5" style={{ color: ess.colors[2] }}>{closing}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── Two white cards inside the dark card ── */}
                <div className="px-5 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                    {/* Share your card */}
                    <div className="bg-white/95 rounded-2xl p-5 flex flex-col items-center gap-2">
                      <p className="font-serif text-[0.95rem] font-semibold text-[#2C2C2C] mb-1">Share Your Results</p>
                      <p className="font-sans text-[0.72rem] text-[#9B9590] text-center mb-2">Download your personalized type card and show the world.</p>
                      <div className="w-full overflow-hidden rounded-xl flex justify-center" style={{ maxWidth: 260 }}>
                        <ShareCard results={r} visible={true} />
                      </div>
                    </div>
                    {/* Get free PDF */}
                    <div className="bg-white/95 rounded-2xl p-5">
                      <p className="font-serif text-[0.95rem] font-semibold text-[#2C2C2C] mb-0.5">Get Your Free Report</p>
                      <p className="font-sans text-[0.72rem] text-[#9B9590] leading-relaxed mb-2.5">
                        The complete Defiant Spirit assessment — delivered to your inbox.
                      </p>
                      <div className="grid grid-cols-2 gap-1 mb-2.5">
                        {['Superpower & Kryptonite', 'React & Respond', 'OYN Dimensions', 'Wing & Variant', 'Energizing & Resolution', 'Domain Insights'].map((item) => (
                          <div key={item} className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0"><circle cx="7" cy="7" r="7" fill="#7A9E7E" /><path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="font-sans text-[0.68rem] text-[#2C2C2C] leading-snug">{item}</span>
                          </div>
                        ))}
                      </div>
                      {emailStatus === 'sent' ? (
                        <div className="bg-[#E8F0E8] rounded-xl p-3 text-center">
                          <p className="font-sans text-sm text-[#7A9E7E] font-semibold">Report sent!</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="your@email.com"
                            className="w-full rounded-xl px-4 py-2.5 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors" />
                          <button onClick={sendEmail} disabled={!emailInput.trim() || emailStatus === 'sending'}
                            className="w-full font-sans text-sm rounded-xl px-5 py-2.5 bg-[#2563EB] text-white font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors">
                            {emailStatus === 'sending' ? 'Sending…' : 'Send My Free Report'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ CONTINUE — only during reveal, not in portal ═══ */}
            {!portalMode && (
              <div className="text-center py-4 sr-card" style={{ animationDelay: '0.3s' }}>
                <button
                  onClick={() => {
                    fetch('/api/results/reveal-complete', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }).catch(() => {});
                    if (typeof window !== 'undefined') localStorage.setItem('soulo_reveal_complete_' + sessionId, 'true');
                    setPortalMode(true); setPortalTab(0);
                  }}
                  className="px-10 py-3.5 rounded-full bg-[#2563EB] text-white font-sans font-semibold text-base hover:bg-[#1D4ED8] transition-all duration-300 shadow-lg hover:shadow-[0_0_24px_rgba(37,99,235,0.4)]"
                >
                  Continue to Your Full Results
                </button>
              </div>
            )}

            {/* ═══ CLOSING TRUTH ═══ */}
            <div className="text-center py-2 sr-card" style={{ animationDelay: '0.5s' }}>
              <p className="font-serif text-[0.95rem] text-[#9B9590]">You are not a number. You are never a number.</p>
              <p className="font-serif text-[0.95rem] font-semibold mt-1" style={{ color: ess.colors[1] }}>You are a defiant spirit.</p>
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
        const energizingType12 = ENERGIZING_POINTS[coreType] || 4;
        const resolutionType12 = RESOLUTION_POINTS[coreType] || 7;
        const wingAdj12 = getWingTypes(coreType);
        const typeScoresMap = (r.type_scores as Record<string, number>) ?? {};
        // Normalize scores to 0-100 range (handles any raw score scale)
        const totalTypeScore = Object.values(typeScoresMap).reduce((s, v) => s + v, 0);
        const maxTypeScore = Math.max(...Object.values(typeScoresMap), 1);
        const getNormalizedPct = (score: number) => totalTypeScore > 0 ? Math.round((score / totalTypeScore) * 100) : 0;
        const getBarPct = (score: number) => maxTypeScore > 0 ? Math.round((score / maxTypeScore) * 100) : 0;
        const allScoresSorted = Object.entries(typeScoresMap).map(([t, s]) => ({ type: Number(t), score: s })).sort((a, b) => b.score - a.score);
        const lowestType12 = allScoresSorted.length > 0 ? allScoresSorted[allScoresSorted.length - 1] : null;
        const wholeTypeDigits12 = wholeType.replace(/\D/g, '').split('').map(Number);

        function getEnergyLabel(typeNum: number): string {
          const labels: string[] = [];
          if (typeNum === coreType) return 'YOUR HOME BASE';
          if (energizingType12 === typeNum) labels.push('ENERGIZING POINT');
          if (resolutionType12 === typeNum) labels.push('RESOLUTION POINT');
          if (wingAdj12.includes(typeNum)) labels.push('YOUR WING');
          if (wholeTypeDigits12.includes(typeNum) && typeNum !== coreType) labels.push(`${CENTER_MAP[typeNum]?.toUpperCase()} WHOLE TYPE`);
          if (lowestType12 && lowestType12.type === typeNum) labels.push('LEAST ACTIVE');
          if (labels.length > 0) return labels.join(' · ');
          const key = String(typeNum);
          if (relDesc[key]?.label) return relDesc[key].label;
          return `${CENTER_MAP[typeNum]?.toUpperCase() || ''} CENTER`;
        }

        function getEnergyDescription(typeNum: number): string {
          const key = String(typeNum);
          const score = typeScoresMap[key] ?? 0;
          const pct = getNormalizedPct(score);
          const parts: string[] = [];

          if (relDesc[key]?.description) {
            parts.push(relDesc[key].description);
          } else if (energizingType12 === typeNum) {
            parts.push(`Under pressure, your energy moves here. This is the pattern that takes over when fear is in charge — not who you are, but where your survival strategy pulls you.`);
          } else if (resolutionType12 === typeNum) {
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

          if (wholeTypeDigits12.includes(typeNum) && typeNum !== coreType) {
            parts.push(`As part of your whole type, this is your representative in the ${CENTER_MAP[typeNum]} center — one of the three core lenses through which you process experience.`);
          }

          return parts.join(' ');
        }

        function getEnergyColor(typeNum: number): string {
          if (energizingType12 === typeNum) return '#DC2626';
          if (resolutionType12 === typeNum) return '#2563EB';
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
                  wholeTypeTypes={
                    wholeType
                      ? (() => {
                          const digits = wholeType.replace(/\D/g, '').split('').map(Number);
                          return {
                            body: digits.find(d => [8,9,1].includes(d)) || coreType,
                            heart: digits.find(d => [2,3,4].includes(d)) || 2,
                            head: digits.find(d => [5,6,7].includes(d)) || 5,
                          };
                        })()
                      : null
                  }
                  energizingType={energizingType12}
                  resolutionType={resolutionType12}
                  relationshipDescriptions={relDesc}
                  onTypeHover={setHoveredRelType}
                  hoveredType={selectedRelType || hoveredRelType}
                  selectedType={selectedRelType}
                  onTypeSelect={setSelectedRelType}
                  size={340}
                  typeScores={typeScoresMap}
                />
                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#DC2626]" style={{ borderTop: '2px dashed #DC2626' }} /><span className="font-sans text-[0.6rem] text-[#9B9590]">Stress</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#2563EB]" /><span className="font-sans text-[0.6rem] text-[#9B9590]">Release</span></div>
                </div>
              </div>

              {/* Energy info card */}
              <div className="flex-1 min-w-[260px] bg-white border border-[#E8E4E0] rounded-2xl p-7 min-h-[300px] flex flex-col justify-center transition-all duration-200">
                {(selectedRelType || hoveredRelType) === null ? (
                  <div className="text-center">
                    <p className="font-serif text-[1.1rem] text-[#2C2C2C] mb-2">Explore the circle</p>
                    <p className="font-sans text-[0.85rem] text-[#9B9590] leading-relaxed">
                      Tap or hover any point to see how that energy lives within you. The larger the ring, the stronger the presence.
                    </p>
                  </div>
                ) : (() => {
                  const activeType = selectedRelType || hoveredRelType;
                  if (!activeType) return null;
                  return (
                  <div>
                    {/* Label tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {getEnergyLabel(activeType).split(' · ').map((tag, i) => (
                        <span key={i} className="font-mono text-[0.55rem] uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{
                            color: activeType === coreType ? '#2563EB' : getEnergyColor(activeType),
                            background: activeType === coreType ? '#EFF6FF' : `${getEnergyColor(activeType)}10`,
                            border: `1px solid ${activeType === coreType ? '#DBEAFE' : getEnergyColor(activeType)}20`,
                          }}
                        >{tag}</span>
                      ))}
                    </div>
                    {/* Big number + name */}
                    <div className="flex items-end gap-3 mb-3">
                      <span className="font-serif font-bold text-[3rem] leading-none" style={{ color: getEnergyColor(activeType) }}>
                        {activeType}
                      </span>
                      <div className="pb-1">
                        <span className="font-serif text-lg text-[#2C2C2C]">{TYPE_NAMES[activeType]}</span>
                        {typeScoresMap[String(activeType)] !== undefined && (
                          <span className="font-sans text-xs text-[#9B9590] ml-2">{getNormalizedPct(typeScoresMap[String(activeType)] ?? 0)}% active</span>
                        )}
                      </div>
                    </div>
                    {/* Description */}
                    <p className="font-sans text-[0.88rem] text-[#2C2C2C] leading-[1.7]">
                      {activeType === coreType
                        ? ((r.core_type_description as string) || `This is your home base — the pattern you know most intimately. The work isn't to escape it. It's to choose it consciously.`)
                        : getEnergyDescription(activeType)
                      }
                    </p>

                    {/* Practical layer — embodiment + own it (not for core type) */}
                    {activeType !== coreType && (() => {
                      const relKey = String(activeType);
                      const relData = relDesc[relKey] as { label?: string; description?: string; embodiment?: string; own_it?: string } | undefined;
                      const embodiment = relData?.embodiment || '';
                      const ownIt = relData?.own_it || '';
                      if (!embodiment && !ownIt) return null;
                      return (
                        <>
                          <div className="w-full h-px my-3" style={{ background: `linear-gradient(to right, transparent, ${getEnergyColor(activeType)}20, transparent)` }} />
                          {embodiment && (
                            <div className="mb-2">
                              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-[#9B9590] mb-1">What This Looks Like</p>
                              <p className="font-sans text-[0.82rem] text-[#4B5563] leading-[1.7]">{embodiment}</p>
                            </div>
                          )}
                          {ownIt && (
                            <div className="rounded-lg px-4 py-3 mt-1" style={{ background: `${getEnergyColor(activeType)}08` }}>
                              <p className="font-serif italic text-[0.85rem] leading-[1.7]" style={{ color: getEnergyColor(activeType) }}>
                                {ownIt}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  );
                })()}
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

      // ── Section 13: Energizing & Resolution Points ──
      case 13: {
        const coreType = leadingType;
        const energizingType = ENERGIZING_POINTS[coreType] || 0;
        const resolutionType = RESOLUTION_POINTS[coreType] || 0;
        const energizingDesc = (r.stress_line_description as string) || '';
        const energizingTriggers = (r.stress_line_triggers as string) || '';
        const resolutionDesc = (r.release_line_description as string) || '';
        const resolutionAccess = (r.release_line_access as string) || '';

        // Check if lowest/highest types fall on energizing/resolution points
        const allScores = Object.entries(
          (r as Record<string, unknown>).type_scores as Record<string, number> ?? {}
        ).map(([t, s]) => ({ type: Number(t), score: s })).sort((a, b) => b.score - a.score);
        const lowestT = allScores.length > 0 ? allScores[allScores.length - 1] : null;
        const lowestIsResolution = lowestT ? lowestT.type === resolutionType : false;
        const highSecondary = allScores.length > 1 ? allScores[1] : null;
        const secondaryIsEnergizing = highSecondary ? highSecondary.type === energizingType : false;

        // SVG geometry helper
        const CIRCLE_ORDER = [9, 1, 2, 3, 4, 5, 6, 7, 8];
        function getPt(typeNum: number): { x: number; y: number } {
          const idx = CIRCLE_ORDER.indexOf(typeNum);
          if (idx === -1) return { x: 50, y: 50 };
          const angle = (idx * 40 * Math.PI) / 180;
          return { x: 50 + 38 * Math.sin(angle), y: 50 - 38 * Math.cos(angle) };
        }

        const corePt = getPt(coreType);
        const energizingPt = getPt(energizingType);
        const resolutionPt = getPt(resolutionType);

        return (
          <div className="flex flex-col gap-6 max-w-[600px] w-full">
            <div className="sr-card" style={{ animationDelay: '0.1s' }}>
              <h2 className="font-serif text-[1.6rem] font-bold text-[#2C2C2C] mb-1">
                Your Energizing & Resolution Points
              </h2>
              <p className="font-sans text-[0.85rem] text-[#6B6B6B] leading-relaxed">
                Every type has two directional points — where you go under pressure and where you go in growth.
                These aren&apos;t flaws or goals. They&apos;re the patterns your energy follows when fear runs the show and when you choose consciously.
              </p>
            </div>

            {/* Enneagram diagram — energizing/resolution points highlighted */}
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

                {/* Energizing point line — red dashed */}
                <line
                  x1={corePt.x} y1={corePt.y} x2={energizingPt.x} y2={energizingPt.y}
                  stroke="#DC2626" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7"
                />
                {/* Resolution point line — blue solid */}
                <line
                  x1={corePt.x} y1={corePt.y} x2={resolutionPt.x} y2={resolutionPt.y}
                  stroke="#2563EB" strokeWidth="1.2" opacity="0.7"
                />

                {/* All 9 points */}
                {CIRCLE_ORDER.map((t) => {
                  const p = getPt(t);
                  const isCore = t === coreType;
                  const isEnergizing = t === energizingType;
                  const isResolution = t === resolutionType;
                  const color = isCore ? '#2563EB' : isEnergizing ? '#DC2626' : isResolution ? '#2563EB' : '#9B9590';
                  const radius = isCore ? 5 : (isEnergizing || isResolution) ? 3.5 : 2.5;
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
                <text x={(corePt.x + energizingPt.x) / 2 + 3} y={(corePt.y + energizingPt.y) / 2 - 2} fill="#DC2626" fontSize="3" fontFamily="sans-serif" opacity="0.8">
                  ENERGIZING
                </text>
                <text x={(corePt.x + resolutionPt.x) / 2 + 3} y={(corePt.y + resolutionPt.y) / 2 - 2} fill="#2563EB" fontSize="3" fontFamily="sans-serif" opacity="0.8">
                  RESOLUTION
                </text>
              </svg>
            </div>

            {/* Energizing Point */}
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-l-4 border-[#DC2626] sr-card" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#DC2626] font-bold">
                  Energizing Point
                </span>
                <span className="font-sans text-sm text-[#6B6B6B]">
                  → Type {energizingType} ({TYPE_NAMES[energizingType] || ''})
                </span>
              </div>
              <p className="font-sans text-[0.92rem] text-[#2C2C2C] leading-relaxed mb-3">
                {energizingDesc || `Under pressure, you take on qualities of Type ${energizingType}. This is where your energy goes when the survival strategy takes over.`}
              </p>
              {energizingTriggers && (
                <div className="bg-[#FEF2F2] rounded-xl p-4">
                  <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[#DC2626] mb-1">Triggers</p>
                  <p className="font-sans text-[0.85rem] text-[#6B6B6B] leading-relaxed">{energizingTriggers}</p>
                </div>
              )}
              {secondaryIsEnergizing && highSecondary && (
                <p className="font-sans text-xs text-[#DC2626] mt-3 italic">
                  Type {energizingType} scored as your second-strongest type — this energizing pattern may be highly active in your life right now.
                </p>
              )}
            </div>

            {/* Resolution Point */}
            <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-l-4 border-[#2563EB] sr-card" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#2563EB] font-bold">
                  Resolution Point
                </span>
                <span className="font-sans text-sm text-[#6B6B6B]">
                  → Type {resolutionType} ({TYPE_NAMES[resolutionType] || ''})
                </span>
              </div>
              <p className="font-sans text-[0.92rem] text-[#2C2C2C] leading-relaxed mb-3">
                {resolutionDesc || `In growth, you access qualities of Type ${resolutionType}. This is the energy that opens up when you choose to respond rather than react.`}
              </p>
              {resolutionAccess && (
                <div className="bg-[#EFF6FF] rounded-xl p-4">
                  <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[#2563EB] mb-1">How to access this</p>
                  <p className="font-sans text-[0.85rem] text-[#6B6B6B] leading-relaxed">{resolutionAccess}</p>
                </div>
              )}
              {lowestIsResolution && lowestT && (
                <p className="font-sans text-xs text-[#2563EB] mt-3 italic">
                  Type {resolutionType} is your lowest-scoring type — this may explain difficulty accessing this state of resolution. The energy is there; it&apos;s the one you haven&apos;t learned to reach for yet.
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
        const energizingTypeFull = ENERGIZING_POINTS[coreType] || 0;
        const resolutionTypeFull = RESOLUTION_POINTS[coreType] || 0;
        const wholeSigs = (r.whole_type_signals as Record<string, number>) ?? {};

        // Clickable section header — pronounced, with hover-reveal questions
        function SectionHeader({ title, chatKey }: { title: string; chatKey: string }) {
          const qs = [
            { 'Type Scores': 'Why did I score highest here?', 'Center Activation': 'What does this mean for me?', 'Instinctual Variants': 'How does this affect my relationships?', 'Defiant Spirit Patterns': 'How do I practice the respond pathway?', 'Lines of Movement': 'How do I access my resolution point?', 'OYN Dimensions': 'Which dimension should I focus on?' }[chatKey] || 'Tell me more about this',
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

        // Whole Type data
        const wholeTypeDigits = wholeType.replace(/\D/g, '').split('').map(Number);
        const centerColors: Record<string, { bg: string; text: string; label: string }> = {
          Body: { bg: '#FEF3C7', text: '#92400E', label: 'Body' },
          Heart: { bg: '#FCE7F3', text: '#9D174D', label: 'Heart' },
          Head: { bg: '#DBEAFE', text: '#1E40AF', label: 'Head' },
        };
        const allTypeScores = Object.entries(typeScoresObj).map(([t, s]) => ({ type: Number(t), score: s })).sort((a, b) => b.score - a.score);
        const top3Overall = allTypeScores.slice(0, 3);
        const lowestType = allTypeScores.length > 0 ? allTypeScores[allTypeScores.length - 1] : null;
        const lowestOnEnergizingPoint = lowestType ? ENERGIZING_POINTS[coreType] === lowestType.type : false;
        const lowestOnResolutionPoint = lowestType ? RESOLUTION_POINTS[coreType] === lowestType.type : false;
        const wingLeft = wingSignals.left ?? 0;
        const wingRight = wingSignals.right ?? 0;
        const wingAdj = getWingTypes(coreType);

        // Section nav items
        const navItems = [
          { id: 'scores', label: 'Scores' },
          { id: 'powers', label: 'Powers' },
          { id: 'wing', label: 'Wing' },
          { id: 'tritype', label: 'Whole Type' },
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
                  {(() => {
                    const maxSc = Math.max(...sortedScores.map(([, s]) => s), 1);
                    return sortedScores.map(([type, score], idx) => {
                    const pct = Math.round((score / maxSc) * 100);
                    const isLead = Number(type) === coreType;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className={`font-sans text-sm w-16 ${isLead ? 'font-bold text-[#2563EB]' : 'text-[#6B6B6B]'}`}>Type {type}</span>
                        <AnimatedBar percent={pct} color={isLead ? '#2563EB' : '#93C5FD'} delay={200 + idx * 80} numberClassName={isLead ? 'font-bold text-[#2563EB]' : 'text-[#9B9590]'} />
                      </div>
                    );
                  });
                  })()}
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

            {/* ═══ WHOLE TYPE — with colored center cards ═══ */}
            <ScrollReveal>
            <div id="ca-tritype" className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] scroll-mt-16">
              <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-2">Your Whole Type</p>
              <p className="font-sans text-[0.8rem] text-[#6B6B6B] mb-5">Your dominant type in each of the three intelligence centers: Body, Heart, and Head.</p>
              {wholeType ? (
                <div className="flex flex-col md:flex-row md:items-center gap-6">
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
              ) : (
                <p className="font-sans text-sm text-[#9B9590]">Whole Type data is still forming.</p>
              )}

              {/* Top 3 + Lowest type */}
              {top3Overall.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-3">Strongest Types Overall</p>
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const maxS = top3Overall[0]?.score || 1;
                        return top3Overall.map((t, i) => (
                          <div key={t.type} className="flex items-center gap-3">
                            <span className="font-serif text-lg font-bold w-8 text-[#2C2C2C]">{t.type}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-[#E8E4E0] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.round((t.score / maxS) * 100)}%`, backgroundColor: i === 0 ? '#2563EB' : i === 1 ? '#60A5FA' : '#93C5FD' }} />
                            </div>
                            <span className="font-sans text-xs text-[#9B9590] w-20 text-right">{TYPE_NAMES[t.type] || ''}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  {lowestType && lowestType.type > 0 && (
                    <div className="bg-[#FAF8F5] rounded-xl p-5">
                      <p className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] mb-2">Least Active Pattern</p>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-serif text-xl font-bold text-[#9B9590]">{lowestType.type}</span>
                        <span className="font-sans text-sm text-[#6B6B6B]">{TYPE_NAMES[lowestType.type] || ''}</span>
                      </div>
                      {(lowestOnEnergizingPoint || lowestOnResolutionPoint) && (
                        <p className="font-sans text-xs text-[#6B6B6B] leading-relaxed">
                          {lowestOnResolutionPoint && <>This is your resolution point — the energy you move toward in growth. Low activation here may explain difficulty accessing that state.</>}
                          {lowestOnEnergizingPoint && <>This is your energizing point — the pattern you fall into under pressure. Low activation here suggests this pattern is less familiar to you.</>}
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
                    <line x1={gp(coreType).x} y1={gp(coreType).y} x2={gp(energizingTypeFull).x} y2={gp(energizingTypeFull).y} stroke="#DC2626" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
                    <line x1={gp(coreType).x} y1={gp(coreType).y} x2={gp(resolutionTypeFull).x} y2={gp(resolutionTypeFull).y} stroke="#2563EB" strokeWidth="1.2" opacity="0.7" />
                    {CIRCLE_ORDER.map((t) => {
                      const p = gp(t);
                      const isCore = t === coreType; const isEnergizing = t === energizingTypeFull; const isResolution = t === resolutionTypeFull;
                      const color = isCore ? '#2563EB' : isEnergizing ? '#DC2626' : isResolution ? '#2563EB' : '#9B9590';
                      return (
                        <g key={`p-${t}`}>
                          <circle cx={p.x} cy={p.y} r={isCore ? 4.5 : (isEnergizing || isResolution) ? 3 : 2} fill={color} opacity={isCore ? 1 : 0.7} />
                          <text x={p.x} y={p.y < 20 ? p.y - 6 : p.y > 75 ? p.y + 9 : p.y} dx={p.x > 70 ? 6 : p.x < 30 ? -6 : 0} textAnchor="middle" fill={color} fontSize="4" fontFamily="serif" fontWeight={isCore ? 'bold' : 'normal'}>{t}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div className="p-5 rounded-xl bg-[#FEF2F2] border-l-4 border-[#DC2626]">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#DC2626]">Energizing Point → {energizingTypeFull}</span>
                    <p className="font-sans text-sm font-semibold text-[#2C2C2C] mt-1">{TYPE_NAMES[energizingTypeFull]}</p>
                    <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-2 leading-relaxed">
                      {(r.stress_line_description as string) || `Under pressure, your energy moves toward ${TYPE_NAMES[energizingTypeFull]} patterns.`}
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-[#EFF6FF] border-l-4 border-[#2563EB]">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#2563EB]">Resolution Point → {resolutionTypeFull}</span>
                    <p className="font-sans text-sm font-semibold text-[#2C2C2C] mt-1">{TYPE_NAMES[resolutionTypeFull]}</p>
                    <p className="font-sans text-[0.82rem] text-[#6B6B6B] mt-2 leading-relaxed">
                      {(r.release_line_description as string) || `In growth, you access ${TYPE_NAMES[resolutionTypeFull]} qualities.`}
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
    'Whole Type',
    'Domain Insights',
    'Explore Your Type',
    'Relationship Wheel',
    'Energizing & Resolution Points',
    'Your Journey Begins',
  ];

  // Map visual position → case number (combined final page = case 9 with defy + share + email)
  // Removed case 7 (Full Profile) — redundant with Type Hero and Complete Analysis
  const SECTION_ORDER = [0, 1, 2, 3, 4, 5, 6, 11, 12, 13, 9];
  const currentCase = SECTION_ORDER[section] ?? section;

  if (!portalMode) return (
    <div className="bg-[#FAF8F5]" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Shared top nav */}
      <SouloNav
        loggedIn={true}
        userEmail={typeof window !== 'undefined' ? localStorage.getItem('soulo_email') || undefined : undefined}
        hasResults={true}
        showPortalTabs={false}
      />
      {/* Progress breadcrumb */}
      <div style={{ flexShrink: 0 }} className="px-6 py-2 flex items-center justify-between border-b border-[#E8E4E0] bg-white/80 backdrop-blur-sm z-20">
        <p className="font-sans text-[0.72rem] text-[#9B9590]">{sectionTitles[section] || 'Your Results'}</p>
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
                // Mark reveal as complete
                fetch('/api/results/reveal-complete', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId }),
                }).catch(() => {});
                if (typeof window !== 'undefined') {
                  localStorage.setItem('soulo_reveal_complete_' + sessionId, 'true');
                }
                setPortalMode(true);
                setPortalTab(0);
              }}
              className="font-sans text-[0.95rem] rounded-2xl px-8 py-3 bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-colors shadow-lg"
            >
              Enter Your Portal →
            </button>
          ) : (
            <button
              onClick={advance}
              className="font-sans text-[0.95rem] rounded-2xl px-8 py-3 bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-colors shadow-lg"
              style={{ animation: 'ctaPulse 2.5s ease-in-out infinite' }}
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

  // ═══ PORTAL MODE ═══
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      {/* Portal nav — shared with landing page */}
      <SouloNav
        loggedIn={true}
        userEmail={typeof window !== 'undefined' ? localStorage.getItem('soulo_email') || undefined : undefined}
        hasResults={true}
        showPortalTabs={true}
        portalTabs={portalTabs}
        activeTabId={portalTab}
        onTabChange={(tab) => { setPortalTab(tab.id); setChatSection(tab.tile); }}
      />

      {/* Soulo hint tooltip — appears for 12s on overview */}
      {showSouloHint && (
        <div className="flex justify-center py-2 relative z-20" style={{ animation: 'darkFadeUp 0.4s ease-out both' }}>
          <div className="flex flex-col items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#2563EB] animate-bounce">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-sans text-[0.72rem] text-[#6B6B6B] bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm border border-[#E8E4E0]">
              Meet <span className="font-semibold text-[#2563EB]">Soulo</span> — your personal guide
            </p>
          </div>
        </div>
      )}

      {/* Portal content — dark bg when Soulo guide tab is active */}
      <div className={`flex-1 overflow-y-auto ${portalTab === 11 ? 'px-0 py-0' : 'px-5 py-8'}`} data-results-scroll ref={portalScrollRef} style={portalTab === 11 ? { background: 'linear-gradient(165deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' } : undefined}>
        <div className="max-w-[960px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={portalTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              {portalTab === 0 && (() => {
                const essP = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];
                return (
                  <div className="w-full flex flex-col items-center gap-8">
                    {/* Portal Welcome Hero — bigger, more prominent */}
                    <div className="w-full max-w-[1000px] rounded-3xl overflow-hidden relative"
                      style={{ background: `linear-gradient(155deg, ${essP.colors[0]} 0%, #1E293B 45%, #0F172A 100%)` }}>
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 50% 35%, ${essP.colors[1]}18 0%, transparent 60%)` }} />
                      {/* Enneagram watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.04 }}>
                        <svg viewBox="0 0 100 100" width="400" height="400">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.3" />
                          {[9,1,2,3,4,5,6,7,8].map((t, idx) => {
                            const a = (idx * 40 * Math.PI) / 180;
                            return <circle key={t} cx={Math.round((50 + 42 * Math.sin(a)) * 1000) / 1000} cy={Math.round((50 - 42 * Math.cos(a)) * 1000) / 1000} r={t === leadingType ? 3 : 1.2} fill="white" />;
                          })}
                        </svg>
                      </div>
                      <div className="relative z-10 px-10 py-16 text-center">
                        <p className="font-mono text-[0.55rem] uppercase tracking-[0.25em] text-white/30 mb-5">Welcome back</p>
                        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${essP.colors[1]}, ${essP.colors[0]})`, boxShadow: `0 0 50px ${essP.colors[1]}35` }}>
                          <span className="font-serif text-[3rem] font-bold text-white leading-none">{leadingType}</span>
                        </div>
                        <h1 className="font-serif text-[2.2rem] font-bold text-white leading-tight mb-2">{typeName}</h1>
                        {dsName && <p className="font-sans text-[1rem] text-[#7A9E7E] mb-4">{dsName}</p>}
                        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-white/25 mb-6">{essP.label}</p>
                        <div className="flex gap-3 flex-wrap justify-center">
                          {wing && <span className="font-sans text-[0.78rem] bg-white/8 border border-white/12 rounded-full px-5 py-2 text-white/65">{wing}</span>}
                          {variant && <span className="font-sans text-[0.78rem] bg-white/8 border border-white/12 rounded-full px-5 py-2 text-white/65">{variant}</span>}
                          {wholeType && <span className="font-sans text-[0.78rem] rounded-full px-5 py-2 text-white/65" style={{ background: `${essP.colors[1]}15`, border: `1px solid ${essP.colors[1]}25` }}>{wholeType}</span>}
                        </div>
                        {headline && (
                          <p className="font-serif italic text-[1.05rem] leading-[1.8] mt-8 max-w-lg mx-auto" style={{ color: essP.colors[2] }}>
                            &ldquo;{headline}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
              {portalTab === 1 && renderSection(1)}
              {portalTab === 2 && renderSection(2)}
              {portalTab === 3 && renderSection(3)}
              {portalTab === 4 && renderSection(4)}
              {portalTab === 5 && renderSection(5)}
              {portalTab === 6 && renderSection(6)}
              {portalTab === 7 && renderSection(12)}
              {portalTab === 8 && renderSection(13)}
              {portalTab === 9 && renderSection(11)}
              {portalTab === 10 && renderSection(9)}
              {portalTab === 11 && (() => {
                const storedFirstName = typeof window !== 'undefined' ? localStorage.getItem('soulo_first_name') : null;
                const displayName = storedFirstName || '';
                return (
                  <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col items-center relative pt-8 pb-16">
                    {/* Animated background glow orbs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/[0.08] rounded-full blur-[128px]" style={{ animation: 'meshDrift1 12s ease-in-out infinite' }} />
                      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/[0.08] rounded-full blur-[128px]" style={{ animation: 'meshDrift2 15s ease-in-out infinite' }} />
                      <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-cyan-500/[0.05] rounded-full blur-[96px]" style={{ animation: 'meshDrift3 18s ease-in-out infinite' }} />
                    </div>

                    <div className="relative z-10 w-full max-w-3xl mx-auto px-4 flex flex-col items-center">
                      {/* Greeting with typewriter */}
                      <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                          <SouloOrb size={72} darkMode intensity={0.5} />
                        </div>
                        <h2 className="font-serif text-[2rem] font-bold tracking-tight text-white/90 mb-2">
                          <TypingAnimation text={displayName ? `Hey ${displayName}.` : 'Hey there.'} duration={60} className="font-serif text-[2rem] font-bold tracking-tight text-white/90" />
                        </h2>
                        <p className="font-sans text-[0.85rem] text-white/40 leading-relaxed max-w-md mx-auto">
                          I&apos;m your personal guide — here to help you integrate what you&apos;ve learned and put it to work in your life.
                        </p>
                        <div className="h-px w-32 mx-auto mt-6 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                      </div>

                      {/* Chat — glass container, wider, more room */}
                      <div className="w-full rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <SouloChat results={r} sessionId={sessionId} activeSection="General" embedded darkMode sharedMessages={sharedChatMessages} onMessagesChange={setSharedChatMessages} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* SouloChat — hidden when Soulo guide tab is active */}
      {portalTab !== 11 && <SouloChat results={r} sessionId={sessionId} activeSection={chatSection} startCollapsed={portalTab === 0} />}
    </div>
  );
}
