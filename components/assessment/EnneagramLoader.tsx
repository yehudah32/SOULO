'use client';

import { useEffect, useRef, useState } from 'react';

interface EnneagramLoaderProps {
  size?: number;
  active?: boolean;
  hideStatus?: boolean;
}

// Mathematically precise: 9 points, 40° apart, point 9 at top
// viewBox 0 0 100 100, center 50 50, radius 40
function getPoint(typeNum: number): { x: number; y: number } {
  const order = [9, 1, 2, 3, 4, 5, 6, 7, 8];
  const idx = order.indexOf(typeNum);
  if (idx === -1) return { x: 50, y: 50 };
  const angleDeg = idx * 40;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + 40 * Math.sin(angleRad),
    y: 50 - 40 * Math.cos(angleRad),
  };
}

// Hexad path: 1 → 4 → 2 → 8 → 5 → 7 → 1
const HEXAD_ORDER = [1, 4, 2, 8, 5, 7];
// Triangle: 3 → 6 → 9 → 3
const TRIANGLE_ORDER = [3, 6, 9];

function buildPath(types: number[]): string {
  return types
    .map((t, i) => {
      const p = getPoint(t);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    })
    .join(' ') + ' Z';
}

const STATUS_PHRASES = [
  'Reflecting on what you shared\u2026',
  'Your guide is listening\u2026',
  'Sitting in the space between\u2026',
  'Honoring what came through\u2026',
  'Letting your words breathe\u2026',
];

export default function EnneagramLoader({ size = 280, active = true, hideStatus = false }: EnneagramLoaderProps) {
  const [orbIndex, setOrbIndex] = useState(0);
  const [orbProgress, setOrbProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * STATUS_PHRASES.length));
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  // Rotate phrases every 4s
  useEffect(() => {
    if (!active) return;
    setPhraseIndex(Math.floor(Math.random() * STATUS_PHRASES.length));
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % STATUS_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [active]);

  // Animate the orb along the hexad path
  useEffect(() => {
    if (!active) return;
    const SEGMENT_DURATION = 900;
    startTimeRef.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const totalCycle = SEGMENT_DURATION * HEXAD_ORDER.length;
      const cyclePos = (elapsed % totalCycle) / totalCycle;
      const segmentFloat = cyclePos * HEXAD_ORDER.length;
      const segIdx = Math.floor(segmentFloat) % HEXAD_ORDER.length;
      const segProgress = segmentFloat - Math.floor(segmentFloat);
      setOrbIndex(segIdx);
      setOrbProgress(segProgress);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);


  // Current orb position — ease-in-out between two hexad points
  const fromType = HEXAD_ORDER[orbIndex];
  const toType = HEXAD_ORDER[(orbIndex + 1) % HEXAD_ORDER.length];
  const from = getPoint(fromType);
  const to = getPoint(toType);
  const t = orbProgress < 0.5
    ? 2 * orbProgress * orbProgress
    : 1 - Math.pow(-2 * orbProgress + 2, 2) / 2;
  const orbX = from.x + (to.x - from.x) * t;
  const orbY = from.y + (to.y - from.y) * t;

  const activeFrom = fromType;
  const activeTo = toType;
  const trianglePath = buildPath(TRIANGLE_ORDER);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <style>{`
        @keyframes ennea-breathe {
          0%, 100% { opacity: 0.18; }
          50% { opacity: 0.3; }
        }
        @keyframes ennea-center-glow {
          0%, 100% { opacity: 0.06; transform: scale(1); }
          50% { opacity: 0.14; transform: scale(1.05); }
        }
        @keyframes ennea-orb-pulse {
          0%, 100% { r: 2; opacity: 0.9; }
          50% { r: 2.5; opacity: 1; }
        }
        @keyframes ennea-orb-aura {
          0%, 100% { r: 5; opacity: 0.3; }
          50% { r: 7; opacity: 0.15; }
        }
        @keyframes ennea-phrase-fade {
          0% { opacity: 0; transform: translateY(4px); }
          12% { opacity: 1; transform: translateY(0); }
          88% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="ennea-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
            <stop offset="40%" stopColor="#60A5FA" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ennea-orb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </radialGradient>
          <filter id="ennea-soft-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="ennea-orb-bloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Center glow — breathing */}
        <circle
          cx="50" cy="50" r="30"
          fill="url(#ennea-center-glow)"
          style={{ animation: active ? 'ennea-center-glow 5s ease-in-out infinite' : 'none', transformOrigin: '50px 50px' }}
        />

        {/* Outer circle */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="#2563EB"
          strokeWidth="0.4"
          opacity="0.2"
          style={{ animation: active ? 'ennea-breathe 4s ease-in-out infinite' : 'none' }}
        />

        {/* Triangle: 3-6-9 */}
        <path
          d={trianglePath}
          fill="none"
          stroke="#2563EB"
          strokeWidth="0.35"
          opacity="0.15"
        />

        {/* Hexad segments with glow */}
        {HEXAD_ORDER.map((typeNum, i) => {
          const nextType = HEXAD_ORDER[(i + 1) % HEXAD_ORDER.length];
          const p1 = getPoint(typeNum);
          const p2 = getPoint(nextType);
          const isActive = activeFrom === typeNum && activeTo === nextType;
          return (
            <line
              key={`hex-${typeNum}-${nextType}`}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="#2563EB"
              strokeWidth={isActive ? '0.7' : '0.35'}
              opacity={isActive ? 0.55 : 0.15}
              style={{ transition: 'opacity 0.5s ease, stroke-width 0.5s ease' }}
            />
          );
        })}

        {/* 9 Points — no type numbers, just dots */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => {
          const p = getPoint(typeNum);
          const isNearOrb = typeNum === fromType || typeNum === toType;
          return (
            <circle
              key={`pt-${typeNum}`}
              cx={p.x} cy={p.y}
              r={isNearOrb ? 2 : 1.5}
              fill="#2563EB"
              opacity={isNearOrb ? 0.55 : 0.2}
              style={{ transition: 'r 0.4s ease, opacity 0.4s ease' }}
            />
          );
        })}

        {/* Orb — outer ethereal aura */}
        <circle
          cx={orbX} cy={orbY}
          r="6"
          fill="url(#ennea-orb-glow)"
          filter="url(#ennea-orb-bloom)"
          style={{ animation: active ? 'ennea-orb-aura 2s ease-in-out infinite' : 'none' }}
        />

        {/* Orb — middle glow */}
        <circle
          cx={orbX} cy={orbY}
          r="3.5"
          fill="url(#ennea-orb-glow)"
          filter="url(#ennea-soft-blur)"
        />

        {/* Orb — bright core */}
        <circle
          cx={orbX} cy={orbY}
          r="1.8"
          fill="#2563EB"
          opacity="0.9"
          style={{ animation: active ? 'ennea-orb-pulse 1.5s ease-in-out infinite' : 'none' }}
        />
      </svg>

      {/* Loading phrase below enneagram */}
      {!hideStatus && (
        <p
          key={phraseIndex}
          style={{
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontSize: '0.9rem',
            color: '#6B7A99',
            letterSpacing: '0.02em',
            textAlign: 'center',
            margin: 0,
            maxWidth: 360,
            lineHeight: 1.6,
            opacity: 0,
            animation: 'ennea-phrase-fade 4s ease-in-out forwards',
          }}
        >
          {STATUS_PHRASES[phraseIndex]}
        </p>
      )}
    </div>
  );
}
