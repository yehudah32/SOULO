'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import SouloNav from '@/components/ui/soulo-nav';
import SouloOrb from '@/components/ui/soulo-orb';
import EnneagramSymbol from '@/components/assessment/EnneagramSymbol';
import { User, Shield, Flame, ArrowRightLeft, MessageCircle, EyeOff } from 'lucide-react';
import TestimonialSlider from '@/components/ui/testimonial-slider';
import { AnimatedGroup } from '@/components/ui/animated-group';
import type { Variants } from 'framer-motion';

// ── Soulo Intro Section — scroll-triggered typing ──
function SouloIntroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasScrolledIn, setHasScrolledIn] = useState(false);
  const [typedHeading, setTypedHeading] = useState('');
  const [headingDone, setHeadingDone] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [typedChat, setTypedChat] = useState('');
  const [chatDone, setChatDone] = useState(false);
  const router = useRouter();

  const headingText = "Hi, I\u2019m Soulo \u2014 your guide to the Defiant Spirit Enneagram.";
  const chatText = "I\u2019m ready to begin my journey\u2026";
  const HEADING_SPEED = 30; // ms per char (faster)
  const CHAT_SPEED = 40;

  // Intersection observer — trigger once when section enters viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHasScrolledIn(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Type heading
  useEffect(() => {
    if (!hasScrolledIn || headingDone) return;
    if (typedHeading.length < headingText.length) {
      const t = setTimeout(() => setTypedHeading(headingText.slice(0, typedHeading.length + 1)), HEADING_SPEED);
      return () => clearTimeout(t);
    } else {
      setHeadingDone(true);
      setTimeout(() => setShowBody(true), 400);
    }
  }, [hasScrolledIn, typedHeading, headingDone]);

  // Type chat message after body appears
  useEffect(() => {
    if (!showBody || chatDone) return;
    const delay = typedChat.length === 0 ? 600 : 0;
    const t = setTimeout(() => {
      if (typedChat.length < chatText.length) {
        setTypedChat(chatText.slice(0, typedChat.length + 1));
      } else {
        setChatDone(true);
      }
    }, delay + CHAT_SPEED);
    return () => clearTimeout(t);
  }, [showBody, typedChat, chatDone]);

  return (
    <section ref={sectionRef} className="py-16 relative overflow-hidden bg-gradient-to-b from-[#F2EDE7] to-[#EFF2F6] min-h-[700px] md:min-h-[600px]">
      {/* Subtle background texture */}
      <div aria-hidden className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url(/landing-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <div className="relative z-10 flex items-center justify-center max-w-[1200px] mx-auto px-6">
        {/* Huge orb — vertically centered with text */}
        <div
          className="flex-shrink-0"
          style={{ opacity: hasScrolledIn ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          <div className="rounded-full overflow-hidden" style={{ width: 380, height: 380 }}>
            <SouloOrb size={380} intensity={hasScrolledIn ? 0.35 : 0.1} maxRotationSpeed={0.6} />
          </div>
        </div>

        {/* Spacer */}
        <div className="w-16 sm:w-24 flex-shrink-0" />

        {/* Text on the right — vertically centered with orb */}
        <div className="flex-1 min-w-0 max-w-lg pr-6">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2C2C2C] leading-[1.15] min-h-[8rem] sm:min-h-[7rem]">
            {typedHeading}
            {!headingDone && hasScrolledIn && (
              <span className="inline-block w-[2px] h-[1.1em] bg-[#2563EB] ml-1 align-middle animate-pulse" />
            )}
          </h2>

          <div style={{ opacity: showBody ? 1 : 0, transform: showBody ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
            <p className="font-sans text-sm text-[#6B6B6B] leading-relaxed mt-3">
              I&apos;m an AI guide trained on Dr. Baruch HaLevi&apos;s Defiant Spirit methodology.
              I hold a real conversation &mdash; listening, adapting, going deeper &mdash; to help you
              understand not just your type, but the pattern that drives everything you do.
            </p>

            {/* Chat box */}
            <div className="mt-8 max-w-sm">
              <div className="bg-white rounded-2xl border border-[#E8E4E0] shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#E8E4E0] flex items-center gap-2">
                  <SouloOrb size={18} intensity={0.2} />
                  <span className="font-sans text-xs font-semibold text-[#2C2C2C]">Soulo</span>
                </div>
                <div className="px-4 py-4">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="flex-shrink-0 mt-0.5"><SouloOrb size={14} intensity={0.15} /></div>
                    <div className="bg-[#F0F4FF] rounded-xl rounded-tl-sm px-3 py-2">
                      <p className="font-sans text-sm text-[#2C2C2C]">Whenever you&apos;re ready, just say the word.</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => router.push('/assessment')}
                      className="bg-[#2563EB] rounded-xl rounded-tr-sm px-4 py-2.5 text-left hover:bg-[#1D4ED8] transition-colors cursor-pointer group"
                    >
                      <p className="font-sans text-sm text-white min-h-[1.25rem]">
                        {typedChat}
                        {!chatDone && showBody && (
                          <span className="inline-block w-[2px] h-[0.9em] bg-white/70 ml-0.5 align-middle animate-pulse" />
                        )}
                      </p>
                      {chatDone && (
                        <p className="font-sans text-[0.6rem] text-white/60 mt-1 group-hover:text-white/80 transition-colors">
                          Click to begin &rarr;
                        </p>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── OYN Orbital Section — JS-driven positioning, cards always upright ──
const OYN_DIMENSIONS = [
  { label: 'Who', desc: 'Core identity', color: '#7C3AED', icon: User },
  { label: 'What', desc: 'Core values', color: '#059669', icon: Shield },
  { label: 'How', desc: 'How you move', color: '#2563EB', icon: ArrowRightLeft },
  { label: 'When', desc: 'Your voice', color: '#D97706', icon: MessageCircle },
  { label: 'Where', desc: 'Your blindspots', color: '#DC2626', icon: EyeOff },
];

function OYNOrbitalSection() {
  const [time, setTime] = useState(0);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Intersection observer
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    if (!visible) return;
    let raf: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime(t => t + dt);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const radius = 190;
  const speed = 0.12; // radians per second — slow orbit

  return (
    <section ref={sectionRef} className="px-6 py-14 relative bg-gradient-to-b from-[#EFE9E1] to-[#EDEBF3]">
      <div className="max-w-4xl mx-auto">
        <AnimatedGroup variants={sectionFade} triggerOnScroll className="flex flex-col items-center mb-8 text-center">
          <p className="font-mono text-[0.65rem] text-[#2563EB] uppercase tracking-[0.12em] mb-2">Own Your Number</p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2C2C] mb-4">
            Six Dimensions of Self-Knowledge
          </h2>
          <p className="font-sans text-sm text-[#6B6B6B] max-w-lg">
            Frankl taught that the deepest human drive is the search for meaning.
            Dr. HaLevi built his entire framework around that truth &mdash; the WHY sits at the center,
            and every other dimension radiates from it.
          </p>
        </AnimatedGroup>

        {/* Orbital area */}
        <div className="flex justify-center">
          <div className="relative" style={{ width: 480, height: 480 }}>
            {/* Orbit ring — subtle */}
            <div className="absolute rounded-full border border-[#E8E4E0]/60"
              style={{ top: 240 - radius, left: 240 - radius, width: radius * 2, height: radius * 2 }} />
            {/* Inner glow ring */}
            <div className="absolute rounded-full"
              style={{ top: 240 - radius + 20, left: 240 - radius + 20, width: (radius - 20) * 2, height: (radius - 20) * 2, background: 'radial-gradient(circle, rgba(37,99,235,0.03) 0%, transparent 70%)' }} />

            {/* WHY — center, tall card */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-[104px] h-[104px] rounded-2xl bg-white border border-[#E8E4E0] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 flex flex-col" style={{ transform: 'scale(1.08)' }}>
                <Flame size={20} className="text-[#0891B2]/30 mb-auto" strokeWidth={1.5} />
                <p className="font-serif text-xl font-bold text-[#0891B2]">Why</p>
                <p className="font-sans text-[0.6rem] text-[#9B9590] mt-1">Core motivation</p>
              </div>
            </div>

            {/* Orbiting cards — tall portrait, always upright */}
            {OYN_DIMENSIONS.map((d, i) => {
              const baseAngle = (i / 5) * 2 * Math.PI - Math.PI / 2;
              const angle = baseAngle + time * speed;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div
                  key={d.label}
                  className="absolute top-1/2 left-1/2 transition-opacity duration-700"
                  style={{
                    transform: `translate(calc(${x}px - 44.5px), calc(${y}px - 44.5px))`,
                    opacity: visible ? 1 : 0,
                  }}
                >
                  <div
                    className="w-[89px] h-[89px] rounded-2xl border border-[#E8E4E0] p-3 flex flex-col"
                    style={{ background: `linear-gradient(135deg, ${d.color}20, white 60%, white)`, transform: 'scale(1.08)', boxShadow: `0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)` }}
                  >
                    <d.icon size={14} className="mb-auto" style={{ color: `${d.color}40` }} strokeWidth={1.5} />
                    <p className="font-serif text-sm font-bold leading-tight" style={{ color: d.color }}>{d.label}</p>
                    <p className="font-sans text-[0.5rem] text-[#9B9590] mt-0.5">{d.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const blurIn: { container: Variants; item: Variants } = {
  container: {
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 16 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { type: 'spring', bounce: 0.25, duration: 1.4 },
    },
  },
};

const sectionFade: { container: Variants; item: Variants } = {
  container: {
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', bounce: 0.2, duration: 1.6 },
    },
  },
};

const cardStagger: { container: Variants; item: Variants } = {
  container: { visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } } },
  item: {
    hidden: { opacity: 0, filter: 'blur(8px)', y: 20 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.2, duration: 1.4 } },
  },
};

const gridPop: { container: Variants; item: Variants } = {
  container: { visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } },
  item: {
    hidden: { opacity: 0, scale: 0.95, y: 12 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.2 } },
  },
};

const chipFade: { container: Variants; item: Variants } = {
  container: { visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } },
  item: {
    hidden: { opacity: 0, filter: 'blur(6px)', y: 10 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.2, duration: 1.0 } },
  },
};

// ── Enneagram Reimagined — animated dark section ──
function EnneagramReimagined() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [typedPivot, setTypedPivot] = useState('');
  const [pivotDone, setPivotDone] = useState(false);
  const [counter, setCounter] = useState(0);
  const [showParas, setShowParas] = useState([false, false, false]);
  const para0Ref = useRef<HTMLDivElement>(null);
  const para1Ref = useRef<HTMLParagraphElement>(null);
  const para2Ref = useRef<HTMLParagraphElement>(null);
  const [rotation, setRotation] = useState(0);

  const pivotText = "The Defiant Spirit sees it differently.";

  // Intersection observer
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Slow-rotating enneagram symbol
  useEffect(() => {
    if (!visible) return;
    let raf: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setRotation(r => r + dt * 3);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // Typewriter for pivot line
  useEffect(() => {
    if (!visible || pivotDone) return;
    if (typedPivot.length === 0) {
      const t = setTimeout(() => setTypedPivot(pivotText[0]), 800);
      return () => clearTimeout(t);
    }
    if (typedPivot.length < pivotText.length) {
      const t = setTimeout(() => setTypedPivot(pivotText.slice(0, typedPivot.length + 1)), 35);
      return () => clearTimeout(t);
    }
    setPivotDone(true);
  }, [visible, typedPivot, pivotDone]);

  // Counter animation for 1,350+ — starts when 3rd paragraph becomes visible
  useEffect(() => {
    if (!showParas[2]) return;
    const target = 1350;
    const duration = 2000;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCounter(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showParas]);

  // Scroll-triggered paragraph reveals with staggered delays between each
  useEffect(() => {
    const refs = [para0Ref, para1Ref, para2Ref];
    const delays = [0, 600, 1200]; // ms delay after each enters viewport
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observers = refs.map((ref, i) => {
      const el = ref.current;
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const t = setTimeout(() => {
              setShowParas(prev => { const n = [...prev]; n[i] = true; return n; });
            }, delays[i]);
            timers.push(t);
            obs.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(el);
      return obs;
    });
    return () => {
      observers.forEach(obs => obs?.disconnect());
      timers.forEach(clearTimeout);
    };
  }, [visible]);

  return (
    <section ref={sectionRef} className="px-6 py-20 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)' }}>
      {/* Slow-rotating enneagram symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.03 }}>
        <svg viewBox="0 0 100 100" width="500" height="500" style={{ transform: `rotate(${rotation}deg)` }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.3" />
          {[9,1,2,3,4,5,6,7,8].map((t, idx) => {
            const a = (idx * 40 * Math.PI) / 180;
            return <circle key={t} cx={50 + 42 * Math.sin(a)} cy={50 - 42 * Math.cos(a)} r="1.5" fill="white" />;
          })}
        </svg>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#2563EB] text-center mb-6"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
          The Framework
        </p>

        <h2 className="font-serif text-[2.2rem] md:text-[2.8rem] font-bold text-white text-center leading-tight mb-6"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s' }}>
          The Enneagram, Reimagined
        </h2>

        <p className="font-sans text-[1rem] text-white/60 text-center leading-[1.85] max-w-2xl mx-auto mb-10"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s' }}>
          The Enneagram maps nine patterns of how people see the world, protect themselves, and chase what they need. It&apos;s not a personality quiz. It&apos;s a map of your automatic operating system — the one running underneath every decision, every relationship, every reaction you&apos;ve ever had.
        </p>

        {/* The problem — plain text, slide up */}
        <p className="font-serif text-[1.05rem] text-white/50 leading-[1.85] italic text-center max-w-2xl mx-auto mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s',
          }}>
          Most systems stop at the label. &ldquo;You&apos;re a 7. Here&apos;s your box.&rdquo; They hand you a number and call it self-knowledge.
        </p>

        {/* The Defiant Spirit pivot — typewriter */}
        <h3 className="font-serif text-[1.4rem] font-semibold text-white text-center mb-5 min-h-[2rem]">
          {typedPivot}
          {!pivotDone && visible && (
            <span className="inline-block w-[2px] h-[1.1em] bg-[#2563EB] ml-1 align-middle animate-pulse" />
          )}
        </h3>

        <div className="space-y-5 max-w-2xl mx-auto">
          {/* Frankl quote — glassmorphic card */}
          <div ref={para0Ref} className="rounded-xl px-6 py-5 text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.15)',
              opacity: showParas[0] ? 1 : 0,
              transform: showParas[0] ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}>
            <p className="font-serif italic text-[0.95rem] text-white/70 leading-[1.85]">
              Viktor Frankl wrote: &ldquo;Between stimulus and response there is a space. In that space lies our freedom and our power to choose.&rdquo;
            </p>
          </div>

          <p ref={para1Ref} className="font-sans text-[0.95rem] text-white/55 leading-[1.85] text-center"
            style={{ opacity: showParas[1] ? 1 : 0, transform: showParas[1] ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.8s ease, transform 0.8s ease' }}>
            That space is where the Defiant Spirit lives. Your type isn&apos;t your fate. It&apos;s your starting point. Every pattern has a wound and a gift — the same energy, expressed unconsciously or chosen deliberately.
          </p>

          <p ref={para2Ref} className="font-sans text-[0.95rem] text-white/55 leading-[1.85] text-center"
            style={{ opacity: showParas[2] ? 1 : 0, transform: showParas[2] ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.8s ease, transform 0.8s ease' }}>
            Soulo doesn&apos;t sort you into one of nine boxes. It maps your specific combination — type, wing, instinctual variant, tritype — across{' '}
            <span className="font-bold text-[#2563EB] text-[1.1rem] inline-block min-w-[4.5ch] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{counter > 0 ? counter.toLocaleString() + '+' : '\u00A0'}</span>
            {' '}unique profiles. Then it shows you exactly where you react on autopilot, and where you can choose to respond.
          </p>
        </div>

        <div className="flex justify-center mt-12 mb-4">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#2563EB]/40 to-transparent" />
        </div>
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/25 text-center">
          This is how it works
        </p>
      </div>
    </section>
  );
}

export default function AboutPage() {
  const auth = useAuth();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      <SouloNav loggedIn={auth.loggedIn} userEmail={auth.email} hasResults={false} />

      <main className="overflow-hidden">
        {/* Decorative radial gradient — subtle depth */}
        <div aria-hidden className="absolute inset-0 pointer-events-none isolate opacity-40 hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(30,40%,75%,.08)_0,hsla(30,30%,55%,.02)_50%,hsla(30,20%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(30,40%,75%,.06)_0,hsla(30,20%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
        </div>

        {/* Hero — warm cream */}
        <section className="relative px-6 pt-10 pb-10 text-center overflow-hidden bg-gradient-to-b from-[#FAF8F5] to-[#F5F1EC]">
          <AnimatedGroup variants={blurIn} className="relative z-10 flex flex-col items-center gap-0 max-w-2xl mx-auto">
            <div className="-mt-2 mb-1"><SouloOrb size={48} intensity={0.2} /></div>
            <p className="font-mono text-[0.65rem] text-[#2563EB] uppercase tracking-[0.14em] mb-3">The Philosophy Behind Soulo</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2C2C2C] leading-tight text-balance">
              The Enneagram is not a box.<br />It is a door.
            </h1>
            <p className="font-sans text-base text-[#6B6B6B] leading-relaxed max-w-lg mt-4">
              The type is not who you are &mdash; it is the automatic strategy you&apos;ve been using.
              Soulo helps you see that strategy so clearly you can finally choose to walk through
              that door into something freer.
            </p>
          </AnimatedGroup>
        </section>

        {/* Dr. Baruch HaLevi — warm parchment */}
        <section className="px-6 py-12 bg-gradient-to-b from-[#F5F1EC] to-[#F2EDE7]">
          <AnimatedGroup variants={sectionFade} triggerOnScroll className="max-w-3xl mx-auto">
            <div className="relative bg-white rounded-2xl border border-[#E8E4E0] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
              {/* Accent bar */}
              <div className="h-1 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#2563EB]" />
              <div className="p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  {/* Photo — circular with ring */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-[#2563EB] to-[#7C3AED]">
                      <img
                        src="/baruch.jpg"
                        alt="Dr. Baruch HaLevi"
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                      />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="font-mono text-[0.6rem] text-[#2563EB] uppercase tracking-[0.12em] mb-1">The Defiant Spirit Methodology</p>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2C2C2C]">Dr. Baruch HaLevi</h2>
                    <p className="font-sans text-sm text-[#9B9590] mt-0.5">Author, Rabbi, Enneagram Innovator</p>
                  </div>
                </div>
                <div className="space-y-4 font-sans text-[0.95rem] text-[#4B5563] leading-relaxed">
                  <p>
                    Most Enneagram systems classify you. Defiant Spirit liberates you.
                    His approach starts from a radical premise:
                    <span className="font-semibold text-[#2C2C2C]"> you are not a number. You are never a number. You are a defiant spirit.</span>
                  </p>
                  <p>
                    Every type carries a superpower &mdash; a core gift that no other type can express as naturally.
                    And every type carries a kryptonite &mdash; the shadow side of that same gift.
                    The wound and the gift are the same energy. The only variable is consciousness.
                  </p>
                  <p className="font-serif italic text-[#2563EB]">
                    &ldquo;Two people with the same number can be kings or tyrants. The variable is you.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </AnimatedGroup>
        </section>

        {/* Hi, I'm Soulo */}
        <SouloIntroSection />

        {/* ═══ THE ENNEAGRAM, REIMAGINED ═══ */}
        <EnneagramReimagined />

        {/* React vs Respond — cool back to warm */}
        <section className="px-6 py-14 relative bg-gradient-to-b from-[#EFF2F6] to-[#F5F2ED]">
          <div aria-hidden className="absolute right-0 top-0 w-64 h-64 opacity-[0.03] pointer-events-none">
            <img src="/enneagramsymbol.png" alt="" className="w-full h-full" />
          </div>
          <div className="max-w-4xl mx-auto">
            <AnimatedGroup variants={sectionFade} triggerOnScroll className="flex flex-col items-center">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2C2C] text-center mb-10">
                React vs. Respond
              </h2>
            </AnimatedGroup>
            <AnimatedGroup
              variants={cardStagger} triggerOnScroll
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="bg-gradient-to-b from-[#FEF2F2] to-white rounded-2xl p-7 border border-[#E8E4E0]">
                <div className="h-1 w-16 bg-gradient-to-r from-[#DC2626] to-[#EF4444] rounded-full mb-4" />
                <h3 className="font-sans text-lg font-semibold text-[#DC2626] mb-3">React</h3>
                <p className="font-sans text-sm text-[#4B5563] leading-relaxed">
                  The automatic pattern. The thing you do before you realize you&apos;re doing it.
                  Built for survival, running on fear, showing up in every relationship, every decision,
                  every conflict. It&apos;s not wrong &mdash; it kept you alive. But it&apos;s costing you now.
                </p>
              </div>
              <div className="bg-gradient-to-b from-[#EFF6FF] to-white rounded-2xl p-7 border border-[#E8E4E0]">
                <div className="h-1 w-16 bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full mb-4" />
                <h3 className="font-sans text-lg font-semibold text-[#2563EB] mb-3">Respond</h3>
                <p className="font-sans text-sm text-[#4B5563] leading-relaxed">
                  The conscious choice. The thing that becomes possible when you catch the reaction
                  before it runs the show. Not suppression &mdash; awareness. Not fixing &mdash; returning to what
                  was always there. The respond pathway is your superpower, used on purpose.
                </p>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* Four Domains */}
        <section className="px-6 py-14 bg-gradient-to-b from-[#F5F2ED] to-[#EFE9E1]">
          <div className="max-w-4xl mx-auto">
            <AnimatedGroup variants={sectionFade} triggerOnScroll className="flex flex-col items-center mb-10">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2C2C] text-center mb-3">
                Four Life Domains
              </h2>
              <p className="font-sans text-sm text-[#6B6B6B] text-center max-w-md">
                The Defiant Spirit methodology applies the Enneagram across the areas where your pattern matters most.
              </p>
            </AnimatedGroup>
            <AnimatedGroup
              variants={gridPop} triggerOnScroll
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {[
                { icon: '\u2764', title: 'Relationships & Intimacy', desc: 'How you love, what you fear in love, and your reactive patterns in close relationships.' },
                { icon: '\u2736', title: 'Wealth & Money', desc: 'Your money psychology, abundance vs. scarcity patterns, and your relationship to resources.' },
                { icon: '\u2691', title: 'Leadership & Work', desc: 'How you lead, achieve, and relate to authority \u2014 both giving and receiving it.' },
                { icon: '\u2728', title: 'Transformation', desc: 'Your relationship to growth, shadow, and the gap between who you are and who you want to become.' },
              ].map((d) => (
                <div key={d.title} className="bg-white rounded-2xl p-6 border border-[#E8E4E0] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <span className="text-2xl block mb-3">{d.icon}</span>
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.06em] text-[#2C2C2C] mb-2">{d.title}</h3>
                  <p className="font-sans text-sm text-[#6B6B6B] leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </AnimatedGroup>
          </div>
        </section>

        {/* OYN Framework — WHY at center, cards orbit via JS (always upright) */}
        <OYNOrbitalSection />

        {/* Testimonials */}
        <TestimonialSlider />

        {/* CTA */}
        <section className="px-6 py-16 text-center bg-gradient-to-b from-[#EDEBF3] to-[#FAF8F5] relative overflow-hidden">
          <img src="/enneagramsymbol.png" alt="" aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] opacity-[0.03] pointer-events-none" />
          <AnimatedGroup variants={blurIn} triggerOnScroll className="flex flex-col items-center">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2C2C] mb-4">
              Find Out What&apos;s Been Driving You.
            </h2>
            <p className="font-sans text-base text-[#6B6B6B] max-w-md mx-auto mb-8">
              15 minutes. One conversation.
            </p>
            <Link
              href="/assessment"
              className="inline-block bg-[#2563EB] text-white font-sans font-semibold text-base px-10 py-4 rounded-2xl shadow-sm transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-md active:bg-[#1E40AF]"
            >
              Begin Your Assessment
            </Link>
          </AnimatedGroup>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E4E0] px-6 py-4 flex items-center justify-between bg-white/40 backdrop-blur-sm">
        <p className="font-sans text-xs text-[#9B9590]">
          Based on the Defiant Spirit methodology by Dr. Baruch HaLevi
        </p>
        <Link href="/admin/login" className="font-sans text-xs text-[#D0CAC4] hover:text-[#9B9590] transition-colors">
          Admin
        </Link>
      </footer>
    </div>
  );
}
