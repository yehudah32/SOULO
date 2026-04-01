'use client';

import SouloOrb from '@/components/ui/soulo-orb';

interface WelcomeCardProps {
  onReady: () => void;
}

const FORMAT_TAGS = [
  'Agree or Disagree',
  'Choose One',
  'Rate on a Scale',
  'Scenario',
  'Open Response',
];

export default function WelcomeCard({ onReady }: WelcomeCardProps) {
  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* Outer container with the enneagram background image fully visible */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundImage: 'url(/enneagramsymbol.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Top area — image visible with just the heading overlaid */}
        <div className="px-8 pt-10 pb-6 text-center">
          <h1 className="font-serif text-[2rem] font-bold text-[#2C2C2C] leading-tight drop-shadow-sm">
            Soulo Enneagram
          </h1>
          <p className="font-serif italic text-sm text-[#2563EB] mt-1">
            Defy Your Number. Live Your Spirit.
          </p>
        </div>

        {/* Content card — solid white, sits on the lower portion */}
        <div className="bg-white rounded-t-2xl px-8 pt-7 pb-8 flex flex-col gap-5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">

          {/* Soulo greeting — centered orb + bold welcome */}
          <div className="flex flex-col items-center text-center mb-1">
            <SouloOrb size={56} />
            <p className="font-serif font-bold text-[1.05rem] text-[#2C2C2C] mt-3">
              Hi, I&apos;m Soulo. Welcome to the Defiant Spirit Enneagram.
            </p>
          </div>

          {/* Assessment info */}
          <p className="font-sans text-[0.92rem] text-[#2C2C2C] leading-[1.8] text-center">
            There are no right or wrong answers. The experience adapts as it learns more about you.
            Most people complete it in 15–20 minutes. Here&apos;s what to expect:
          </p>

          {/* What to expect — format tags */}
          <div>
            <p className="font-sans text-[0.68rem] uppercase tracking-widest text-[#9B9590] mb-2">
              Types of questions you&apos;ll see
            </p>
            <div className="flex flex-wrap gap-2">
              {FORMAT_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="font-sans text-[0.62rem] uppercase tracking-[0.06em] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Baruch quote */}
          <p className="font-serif italic text-[0.82rem] text-[#9B9590] leading-relaxed text-center">
            &ldquo;Between stimulus and response there is a space. In that space lies our freedom.&rdquo;
          </p>

          <div className="h-px bg-[#E8E4E0]" />

          {/* Ready button */}
          <div className="flex justify-center">
            <button
              onClick={onReady}
              className="bg-[#2563EB] text-white font-serif font-semibold text-base px-12 py-4 rounded-2xl shadow-md hover:bg-[#1D4ED8] hover:shadow-lg active:bg-[#1E40AF] transition-all duration-200"
            >
              I&apos;m Ready
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
