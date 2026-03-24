'use client';

/**
 * SouloAvatar — animated Enneagram figure SVG
 *
 * Center illumination lags one question behind by design.
 * The parent stores the center in a ref and passes it only after the user
 * answers (not when the question is received). This is intentional so the
 * avatar reflects what has been *learned*, not what is being *asked*.
 */

import { useState, useEffect } from 'react';

export type AvatarState = 'idle' | 'typing' | 'listening' | 'deep';
export type ActiveCenter = 'Body' | 'Heart' | 'Head' | 'Multi';

interface SouloAvatarProps {
  state?: AvatarState;
  activeCenter?: ActiveCenter;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 48, md: 64, lg: 96 };

// Point positions for 9 equidistant points on a circle (r=38)
const POINTS: Record<number, { x: number; y: number }> = {
  9: { x: 50, y: 12 },
  1: { x: 72, y: 19 },
  2: { x: 86, y: 38 },
  3: { x: 83, y: 60 },
  4: { x: 67, y: 76 },
  5: { x: 50, y: 82 },
  6: { x: 33, y: 76 },
  7: { x: 17, y: 60 },
  8: { x: 14, y: 38 },
};

// Center color definitions
const CENTER_COLORS: Record<ActiveCenter, { points: number[]; color: string }> = {
  Body: { points: [8, 9, 1], color: '#2563EB' },
  Heart: { points: [2, 3, 4], color: '#60A5FA' },
  Head: { points: [5, 6, 7], color: '#7A9E7E' },
  Multi: { points: [1, 2, 3, 4, 5, 6, 7, 8, 9], color: '#2563EB' },
};

export default function SouloAvatar({
  state = 'idle',
  activeCenter = 'Body',
  size = 'md',
}: SouloAvatarProps) {
  const [showRipple, setShowRipple] = useState(false);
  const px = SIZE_MAP[size];

  // Deep state triggers ripple for 1200ms, then cleans up to prevent leak
  useEffect(() => {
    if (state !== 'deep') return;
    setShowRipple(true);
    const t = setTimeout(() => setShowRipple(false), 1200);
    return () => clearTimeout(t);
  }, [state]);

  const activePoints = CENTER_COLORS[activeCenter]?.points ?? [];
  const activeColor = CENTER_COLORS[activeCenter]?.color ?? '#2563EB';
  const isMulti = activeCenter === 'Multi';

  // Animation class on the outer group
  const outerAnim =
    state === 'idle'
      ? 'soulo-breathe-idle'
      : state === 'typing'
      ? 'soulo-pulse-typing'
      : state === 'listening'
      ? 'soulo-pulse-typing'
      : '';

  return (
    <div style={{ width: px, height: px, flexShrink: 0, position: 'relative' }}>
      <style>{`
        @keyframes soulo-breathe-idle {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        @keyframes soulo-pulse-typing {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.07); }
          60% { transform: scale(0.96); }
        }
        @keyframes soulo-rotate {
          from { transform: rotate(0deg); transform-origin: 50px 50px; }
          to { transform: rotate(360deg); transform-origin: 50px 50px; }
        }
        @keyframes soulo-ripple {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .soulo-breathe-idle {
          animation: soulo-breathe-idle 3s ease-in-out infinite;
        }
        .soulo-pulse-typing {
          animation: soulo-pulse-typing 1.2s ease-in-out infinite;
        }
        .soulo-inner-rotate {
          animation: soulo-rotate 8s linear infinite;
          transform-origin: 50px 50px;
        }
        .soulo-ripple-ring {
          animation: soulo-ripple 1.2s ease-out forwards;
          transform-origin: 50px 50px;
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        className={outerAnim}
        style={{ display: 'block' }}
      >
        {/* Ripple ring (deep state) */}
        {showRipple && (
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={activeColor}
            strokeWidth="1.5"
            className="soulo-ripple-ring"
          />
        )}

        {/* Outer circle */}
        <circle cx="50" cy="50" r="38" fill="none" stroke="#E8E4E0" strokeWidth="1.2" />

        {/* Inner lines group (hexad 1-4-2-8-5-7 + inner triangle 3-6-9) */}
        <g className={state === 'typing' ? 'soulo-inner-rotate' : ''}>
          {/* Inner triangle 3-6-9 */}
          {[
            [3, 6],
            [6, 9],
            [9, 3],
          ].map(([a, b]) => (
            <line
              key={`tri-${a}-${b}`}
              x1={POINTS[a].x}
              y1={POINTS[a].y}
              x2={POINTS[b].x}
              y2={POINTS[b].y}
              stroke="#D0CAC4"
              strokeWidth="0.8"
              opacity="0.6"
            />
          ))}
          {/* Hexad 1-4-2-8-5-7 */}
          {[
            [1, 4],
            [4, 2],
            [2, 8],
            [8, 5],
            [5, 7],
            [7, 1],
          ].map(([a, b]) => (
            <line
              key={`hex-${a}-${b}`}
              x1={POINTS[a].x}
              y1={POINTS[a].y}
              x2={POINTS[b].x}
              y2={POINTS[b].y}
              stroke="#D0CAC4"
              strokeWidth="0.6"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Points */}
        {Object.entries(POINTS).map(([num, pos]) => {
          const n = Number(num);
          const isActive = activePoints.includes(n);
          const opacity = isMulti ? 0.5 : isActive ? 1 : 0.3;
          return (
            <circle
              key={n}
              cx={pos.x}
              cy={pos.y}
              r="4"
              fill={isActive ? activeColor : '#D0CAC4'}
              opacity={opacity}
              style={{
                transition: 'fill 0.4s ease, opacity 0.4s ease',
              }}
            />
          );
        })}

        {/* Center dot */}
        <circle
          cx="50"
          cy="50"
          r="3"
          fill={activeColor}
          opacity="0.7"
          style={{ transition: 'fill 0.4s ease' }}
        />
      </svg>
    </div>
  );
}
