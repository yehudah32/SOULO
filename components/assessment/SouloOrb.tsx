'use client';

import { useRef, memo, useEffect, useState } from 'react';

/**
 * SouloOrb (Siri Animation Edition)
 * An exact 1:1 port of the user's SwiftUI iOS Siri Animation snippet natively to CSS.
 * Completely bypasses WebGL/Three.js issues, guaranteeing zero black-box artifacts
 * and perfect transparent HTML layer blending.
 */
const SouloOrb = memo(function SouloOrb({
  size = 80,
  className = ''
}: {
  size?: number | string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const idRef = useRef("");

  useEffect(() => {
    idRef.current = `siri-orb-${Math.random().toString(36).slice(2, 6)}`;
    setMounted(true);
  }, []);

  // SSR hydration safeguard
  if (!mounted) return <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} />;

  const id = idRef.current;

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size }}
    >
      <style>{`
        @keyframes ${id}-blend-toggle {
          0% { mix-blend-mode: difference; }
          49.9% { mix-blend-mode: difference; }
          50% { mix-blend-mode: hard-light; }
          100% { mix-blend-mode: hard-light; }
        }

        @keyframes ${id}-blue-right {
          0% { transform: scale(0.5) rotate(420deg) rotate3d(1, 0, 15, 75deg); filter: hue-rotate(-20deg); }
          100% { transform: scale(0.5) rotate(-359deg) rotate3d(1, 0, -5, 75deg); filter: hue-rotate(20deg); }
        }
        
        @keyframes ${id}-blue-middle {
          0% { transform: scale(0.5) rotate(420deg) rotate3d(5, 0, 0, 75deg); filter: hue-rotate(15deg) blur(2.5em); }
          100% { transform: scale(0.5) rotate(-359deg) rotate3d(1, 0, 0, 75deg); filter: hue-rotate(-15deg) blur(2.5em); }
        }

        @keyframes ${id}-top-light-blue {
          0% { transform: rotate(-359deg); filter: hue-rotate(-10deg); }
          100% { transform: rotate(320deg); filter: hue-rotate(10deg); }
        }

        @keyframes ${id}-left-blue {
          0% { transform: scale(0.5) rotate(179deg); filter: hue-rotate(20deg); }
          100% { transform: scale(0.5) rotate(-359deg); filter: hue-rotate(-20deg); }
        }

        @keyframes ${id}-intersect-cyan {
          0% { transform: rotate(-420deg) rotate3d(1, 5, 1, -360deg); filter: hue-rotate(-30deg); }
          100% { transform: rotate(30deg) rotate3d(1, 5, 1, -360deg); filter: hue-rotate(15deg); }
        }

        @keyframes ${id}-right-deep-blue {
          0% { transform: scale(0.5) rotate(359deg) rotate3d(1, 1, 0, -15deg); filter: hue-rotate(10deg) blur(2.5em); }
          100% { transform: scale(0.5) rotate(-300deg) rotate3d(1, -1, 0, -15deg); filter: hue-rotate(-10deg) blur(2.5em); }
        }

        @keyframes ${id}-left-sky {
          0% { transform: scale(0.5) rotate(-358deg) rotate3d(1, 15, 0, 330deg); filter: hue-rotate(-20deg) blur(2.5em); }
          100% { transform: scale(0.5) rotate(359deg) rotate3d(1, -5, 0, 330deg); filter: hue-rotate(20deg) blur(2.5em); }
        }

        @keyframes ${id}-bottom-blue {
          0% { transform: rotate(-359deg) rotate3d(5, -45, 0, 75deg); filter: hue-rotate(15deg); }
          100% { transform: rotate(400deg) rotate3d(5, 1, 0, 75deg); filter: hue-rotate(-15deg); }
        }

        @keyframes ${id}-highlight {
          0% { transform: rotate(250deg); }
          100% { transform: rotate(359deg); }
        }

        .${id}-blob {
            position: absolute;
            inset: -20%;
            border-radius: 50%;
            pointer-events: none;
            will-change: transform, filter;
            animation-duration: 12s;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
            animation-direction: normal; 
        }
      `}</style>

      {/* Internal isolated stack forces inner mix-blend-modes (like difference) 
          to compose against each other BEFORE drawing to the transparent DOM! */}
      <div className="w-full h-full relative isolate" style={{ transform: 'scale(0.8)' }}>
        
        <div 
          className="absolute inset-0"
          style={{ animation: `${id}-blend-toggle 12s infinite` }}
        >
          {/* Base soft blue core */}
          <div className="absolute inset-0 rounded-full bg-sky-100 opacity-20 blur-md scale-50" />

          {/* blue-right */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at right, #0284C7 0%, transparent 70%)',
              mixBlendMode: 'color-burn',
              animationName: `${id}-blue-right` 
            }}
          />

          {/* blue-middle */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at center, #0369A1 0%, transparent 60%)',
              animationName: `${id}-blue-middle` 
            }}
          />

          {/* top-light-blue */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at top, #38BDF8 0%, transparent 60%)',
              animationName: `${id}-top-light-blue` 
            }}
          />

          {/* left-blue */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at left, #1D4ED8 0%, transparent 60%)',
              animationName: `${id}-left-blue` 
            }}
          />

          {/* intersect-cyan */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at 70% 70%, #06B6D4 0%, transparent 50%)',
              animationName: `${id}-intersect-cyan` 
            }}
          />

          {/* right-deep-blue */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at right, #1E3A8A 0%, transparent 60%)',
              mixBlendMode: 'color-burn',
              opacity: 0.5,
              animationName: `${id}-right-deep-blue` 
            }}
          />

          {/* left-sky */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at left, #7DD3FC 0%, transparent 60%)',
              animationName: `${id}-left-sky` 
            }}
          />

          {/* bottom-blue */}
          <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at bottom, #2563EB 0%, transparent 60%)',
              opacity: 0.4,
              mixBlendMode: 'multiply',
              animationName: `${id}-bottom-blue` 
            }}
          />
        </div>

        {/* Highlight Image layer sits outside the main blendMode toggle */}
        <div 
            className={`${id}-blob`}
            style={{ 
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, transparent 30%)',
              animationName: `${id}-highlight` 
            }}
          />
      </div>
    </div>
  );
});

export default SouloOrb;
