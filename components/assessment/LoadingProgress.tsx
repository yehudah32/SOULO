'use client';

import { useEffect, useRef, useState } from 'react';

interface LoadingProgressProps {
  active: boolean;
}

/**
 * LoadingProgress — real-time progress bar driven by actual elapsed time.
 * Runs continuously while active, fills to 100% when active becomes false.
 * No text labels. Clean glowing bar with orb at the leading edge.
 */
export default function LoadingProgress({ active }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (active) {
      // Start tracking
      startTimeRef.current = performance.now();
      setProgress(0);

      function tick(now: number) {
        const elapsed = now - startTimeRef.current;
        // Linear progress: ~33% per second, so 3s = ~100%
        // But use slight ease-out so it feels natural
        const seconds = elapsed / 1000;
        const p = 1 - Math.exp(-seconds * 0.4);
        setProgress(p);
        animRef.current = requestAnimationFrame(tick);
      }

      animRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animRef.current);
    } else {
      // Response arrived — fill to 100%
      cancelAnimationFrame(animRef.current);
      setProgress(1);
    }
  }, [active]);

  const percent = Math.min(100, Math.round(progress * 100));

  return (
    <div className="w-full max-w-[320px] mx-auto">
      <style>{`
        @keyframes lp-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      <div className="w-full h-[5px] rounded-full overflow-hidden relative" style={{ background: 'rgba(37,99,235,0.08)' }}>
        {/* Filled bar */}
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #2563EB, #60A5FA, #93C5FD)',
            transition: active ? 'none' : 'width 0.35s ease-out',
          }}
        >
          {/* Leading edge glow orb */}
          {percent > 2 && percent < 100 && (
            <div
              className="absolute right-0 top-1/2"
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(96,165,250,0.9) 0%, rgba(37,99,235,0.4) 40%, transparent 70%)',
                transform: 'translate(50%, -50%)',
                filter: 'blur(3px)',
              }}
            />
          )}
        </div>

        {/* Shimmer sweep */}
        <div className="absolute inset-0 rounded-full overflow-hidden" style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'lp-shimmer 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
