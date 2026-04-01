'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import Link from 'next/link';
import { ArrowRight, Sparkles, Crown, BookOpen, Users, DollarSign, Compass, Heart } from 'lucide-react';
import SouloNav from '@/components/ui/soulo-nav';
import SouloOrb from '@/components/ui/soulo-orb';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { ExpandableCard } from '@/components/ui/expandable-card';
import type { Variants } from 'framer-motion';

const blurIn: { container: Variants; item: Variants } = {
  container: { visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } },
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 16 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.25, duration: 1.4 } },
  },
};

// ── SHEfa Logo Component ──
function ShefaLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-4xl' : 'text-3xl';
  return (
    <span className={`${textSize} font-serif font-bold flex items-baseline gap-0`}>
      <span className="inline-flex items-center bg-rose-300/80 rounded-xl px-3 py-1">
        <span className="text-[#1a0a1a] font-bold tracking-tight">SHE</span>
      </span>
      <span className="text-rose-300/80 ml-0.5 tracking-tight">fa</span>
    </span>
  );
}

// ── Product Data ──
const products = [
  {
    id: 'maskulinity',
    title: 'MASK-ULINITY',
    description: 'The 9 Masks of Manhood',
    hook: 'Which mask are you wearing \u2014 and what happens when you take it off?',
    bg: 'from-[#1a1a1a] via-[#2a1a0a] to-[#0d0d0d]',
    expandedBg: 'bg-gradient-to-br from-[#1a1a1a] via-[#2a1a0a] to-[#0d0d0d]',
    accent: '#D97706',
    accentLight: 'rgba(217,119,6,0.15)',
    textColor: 'text-amber-400',
    badgeColor: 'border-amber-500/30 text-amber-400',
    icon: Crown,
    tagline: 'Every man wears a mask. Most never take it off.',
    body: 'MASK-ULINITY maps the 9 archetypal masks men wear \u2014 built for survival, running on autopilot. Through the lens of the Defiant Spirit Enneagram, discover which mask you\u2019ve been hiding behind and what becomes possible when you finally set it down.',
    features: ['9 masculine archetypes mapped to the Enneagram', 'React vs. Respond patterns in masculinity', 'Guided exercises for unmasking'],
    audience: 'For men ready to stop performing and start living.',
  },
  {
    id: 'mirror-man',
    title: 'Mirror Man',
    description: 'The Guy in the Glass',
    hook: 'Six questions to see the man you were meant to be.',
    bg: 'from-[#3a3a42] via-[#52525b] to-[#27272a]',
    expandedBg: 'bg-gradient-to-br from-[#3a3a42] via-[#52525b] to-[#27272a]',
    accent: '#a1a1aa',
    accentLight: 'rgba(161,161,170,0.12)',
    textColor: 'text-zinc-300',
    badgeColor: 'border-zinc-500/40 text-zinc-300',
    icon: BookOpen,
    tagline: 'Defy your numbers. Live your Name.',
    body: 'Based on Dr. Baruch HaLevi\u2019s book "The Guy in the Glass," this experience takes you through six questions that cut through the tyranny of numbers \u2014 net worth, status, metrics \u2014 and bring you face to face with the man in the mirror. Who are you when the counting stops?',
    features: ['Six Questions framework (Who, What, Why, How, When, Where)', 'Morning Self vs. Afternoon Self exploration', 'Integration with your Enneagram type profile'],
    audience: 'For men in the second half of life who are ready to stop counting and start knowing.',
  },
  {
    id: 'shefa',
    title: 'SHEfa',
    description: 'The Divine Feminine',
    hook: 'Abundance through healing. A woman\u2019s spiritual journey through Kabbalah.',
    bg: 'from-[#1a0a1a] via-[#2a0f2a] to-[#0d050d]',
    expandedBg: 'bg-gradient-to-br from-[#1a0a1a] via-[#2a0f2a] to-[#0d050d]',
    accent: '#D4A574',
    accentLight: 'rgba(212,165,116,0.15)',
    textColor: 'text-rose-300',
    badgeColor: 'border-rose-400/30 text-rose-300',
    icon: Heart,
    customLogo: true,
    tagline: 'Shefa (\u05E9\u05E4\u05E2) means abundance. It starts within.',
    body: 'SHEfa is the Defiant Spirit Enneagram through the lens of the divine feminine \u2014 a woman\u2019s spiritual journey through healing and Kabbalistic wisdom. Discover how your type pattern shapes your relationship with abundance, intuition, boundaries, and sacred self-knowledge.',
    features: ['Enneagram through Kabbalistic feminine wisdom', 'Healing-centered type exploration', 'Abundance patterns by type'],
    audience: 'For women seeking depth, healing, and spiritual abundance.',
  },
  {
    id: '9-lives',
    title: '9 Lives',
    description: 'The Spirit of the Enneagram',
    hook: 'A comprehensive guide to the Enneagram and living a life of spirit.',
    bg: 'from-[#0f0a1a] via-[#1a0f2a] to-[#0a0515]',
    expandedBg: 'bg-gradient-to-br from-[#0f0a1a] via-[#1a0f2a] to-[#0a0515]',
    accent: '#8B5CF6',
    accentLight: 'rgba(139,92,246,0.15)',
    textColor: 'text-violet-400',
    badgeColor: 'border-violet-500/30 text-violet-400',
    icon: Compass,
    tagline: 'Nine types. Nine lives. One spirit.',
    body: '9 Lives is the definitive guide to the Enneagram and living a life of spirit \u2014 complete e-books and workbooks for every type. Go deeper than any assessment can take you with type-specific wisdom, exercises, and transformation frameworks drawn from Dr. HaLevi\u2019s decades of work.',
    features: ['Complete e-book for each of the 9 types', 'Type-specific workbook with guided exercises', 'Integration with Defiant Spirit methodology'],
    audience: 'For anyone who wants the full picture \u2014 not just the number.',
  },
  {
    id: 'lead-360',
    title: 'LEAD 360',
    description: 'Business & Leadership',
    hook: 'How your type leads, manages, and builds teams.',
    bg: 'from-[#0a0f1a] via-[#0f1a2a] to-[#050a15]',
    expandedBg: 'bg-gradient-to-br from-[#0a0f1a] via-[#0f1a2a] to-[#050a15]',
    accent: '#60A5FA',
    accentLight: 'rgba(96,165,250,0.12)',
    textColor: 'text-blue-400',
    badgeColor: 'border-blue-500/30 text-blue-400',
    icon: Users,
    tagline: 'Lead from who you are \u2014 not who you think you should be.',
    body: 'LEAD 360 applies the Defiant Spirit Enneagram to business and leadership. Discover how your type drives your leadership style, your blind spots in management, and the specific patterns that either build trust or erode it.',
    features: ['9 type-specific leadership profiles', 'React vs. Respond in professional settings', 'Team dynamics and communication patterns'],
    audience: 'For business leaders, managers, and executives.',
  },
  {
    id: 'wealth-360',
    title: 'WEALTH 360',
    description: 'Financial Psychology',
    hook: 'Your money psychology. Your scarcity pattern. Your path to abundance.',
    bg: 'from-[#0a1a0f] via-[#0f2a1a] to-[#050d0a]',
    expandedBg: 'bg-gradient-to-br from-[#0a1a0f] via-[#0f2a1a] to-[#050d0a]',
    accent: '#10B981',
    accentLight: 'rgba(16,185,129,0.12)',
    textColor: 'text-emerald-400',
    badgeColor: 'border-emerald-500/30 text-emerald-400',
    icon: DollarSign,
    tagline: 'Your type is running your finances. Time to take the wheel.',
    body: 'WEALTH 360 maps how each Enneagram type relates to money, resources, and financial decisions. Built for financial planners and wealth managers who want to understand the psychology beneath their clients\u2019 \u2014 and their own \u2014 money patterns.',
    features: ['9 type-specific wealth psychology profiles', 'Abundance vs. scarcity pattern mapping', 'Client communication guides by type'],
    audience: 'For financial professionals and anyone wanting to understand their money pattern.',
  },
];

export default function CollectionPage() {
  const auth = useAuth();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <SouloNav loggedIn={auth.loggedIn} userEmail={auth.email} hasResults={false} />

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#2563EB]/5 blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <AnimatedGroup variants={blurIn} className="flex flex-col items-center">
            <SouloOrb size={100} intensity={0.5} darkMode />
            <p className="font-mono text-[0.65rem] text-[#2563EB] uppercase tracking-[0.2em] mt-8 mb-4">Beyond the Assessment</p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] text-balance">The Collection</h1>
            <p className="font-sans text-lg text-white/50 mt-6 max-w-xl leading-relaxed">
              The Defiant Spirit Enneagram is just the beginning. Each of these experiences
              takes you deeper into the pattern &mdash; through a different lens, for a different journey.
            </p>
          </AnimatedGroup>
        </div>
      </section>

      {/* Product Grid */}
      <section className="px-6 pb-20">
        <AnimatedGroup variants={blurIn} triggerOnScroll className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const Icon = p.icon;
            const isLight = false;

            return (
              <ExpandableCard
                key={p.id}
                title={p.title}
                description={p.description}
                expandedBg={p.expandedBg}
                lightMode={isLight}
                cardFace={
                  <div
                    className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${p.bg} h-[380px] flex flex-col justify-between p-8 border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
                      isLight ? 'border-zinc-300/50' : 'border-white/10'
                    }`}
                    style={{ boxShadow: `0 4px 30px ${p.accentLight}` }}
                  >
                    {/* Decorative glow */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20" style={{ background: p.accent }} />
                    {/* Icon watermark */}
                    <div className="absolute top-6 right-6 opacity-10">
                      <Icon size={48} className={isLight ? 'text-zinc-400' : 'text-white'} strokeWidth={1} />
                    </div>

                    <div>
                      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wider backdrop-blur-sm mb-6 ${p.badgeColor}`}>
                        <Sparkles size={10} />
                        Coming Soon
                      </div>
                      {p.customLogo ? <ShefaLogo /> : (
                        <h3 className={`text-3xl font-serif font-bold mb-1 ${isLight ? 'text-zinc-800' : 'text-white'}`}>{p.title}</h3>
                      )}
                      <p className={`text-sm font-sans font-medium mb-4 ${isLight ? 'text-zinc-500' : 'text-white/50'}`}>{p.description}</p>
                    </div>

                    <div>
                      <p className={`font-serif text-base leading-relaxed mb-4 ${isLight ? 'text-zinc-600' : 'text-white/70'}`}>{p.hook}</p>
                      {p.id === 'mirror-man' && (
                        <p className="text-xs font-serif italic mb-4 text-zinc-400">Based on the book by Dr. Baruch HaLevi</p>
                      )}
                      <div className={`flex items-center gap-2 text-sm font-medium ${p.textColor} group-hover:gap-3 transition-all duration-300`}>
                        <span>Explore</span>
                        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                }
              >
                {/* Expanded content */}
                <div className="mt-2">
                  {/* Icon + badge */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${p.accent}20` }}>
                      <Icon size={24} style={{ color: p.accent }} strokeWidth={1.5} />
                    </div>
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wider ${p.badgeColor}`}>
                      <Sparkles size={10} />
                      Coming Soon
                    </div>
                  </div>

                  {/* Name (with custom logo for SHEfa) */}
                  {p.customLogo && <div className="mb-4"><ShefaLogo size="lg" /></div>}

                  {/* Tagline */}
                  <p className={`font-serif italic text-xl leading-relaxed mb-6 ${isLight ? 'text-zinc-600' : 'text-white/80'}`}>
                    &ldquo;{p.tagline}&rdquo;
                  </p>

                  {/* Divider */}
                  <div className="h-px w-full mb-6" style={{ background: `${p.accent}30` }} />

                  {/* Body */}
                  <p className={`font-sans text-base leading-relaxed mb-8 ${isLight ? 'text-zinc-600' : 'text-white/60'}`}>{p.body}</p>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    <p className={`font-sans text-xs uppercase tracking-widest font-medium mb-3 ${isLight ? 'text-zinc-400' : 'text-white/30'}`}>What&apos;s included</p>
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: p.accent }} />
                        <p className={`font-sans text-sm ${isLight ? 'text-zinc-600' : 'text-white/60'}`}>{f}</p>
                      </div>
                    ))}
                  </div>

                  {/* Audience */}
                  <div className={`rounded-2xl p-5 ${isLight ? 'bg-zinc-200/50' : 'bg-white/5'}`}>
                    <p className={`font-sans text-sm italic ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>{p.audience}</p>
                  </div>
                </div>
              </ExpandableCard>
            );
          })}
        </AnimatedGroup>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0f0a1a] to-[#0a0a0a]" />
        <div className="relative z-10">
          <AnimatedGroup variants={blurIn} triggerOnScroll className="flex flex-col items-center">
            <p className="font-serif text-2xl sm:text-3xl font-bold text-white mb-4">The assessment is just the beginning.</p>
            <p className="font-sans text-base text-white/40 mb-8">Start with the Defiant Spirit Enneagram. Everything else builds on it.</p>
            <Link href="/assessment" className="group inline-flex items-center gap-3 bg-white text-[#0a0a0a] font-sans font-semibold text-base px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              Begin Your Assessment
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </AnimatedGroup>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <p className="font-sans text-xs text-white/20">Based on the Defiant Spirit methodology by Dr. Baruch HaLevi</p>
        <Link href="/admin/login" className="font-sans text-xs text-white/10 hover:text-white/30 transition-colors">Admin</Link>
      </footer>
    </div>
  );
}
