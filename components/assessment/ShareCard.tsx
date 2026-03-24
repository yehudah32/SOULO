'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface ShareCardProps {
  results: Record<string, unknown>;
  visible?: boolean;
}

// Type-specific color palettes — mirrors the hero card in ResultsReveal case 0
const TYPE_ESSENCE: Record<number, { colors: string[]; label: string }> = {
  1: { colors: ['#1E3A5F', '#2563EB', '#DBEAFE'], label: 'Order. Precision. Integrity.' },
  2: { colors: ['#5B2333', '#E11D48', '#FECDD3'], label: 'Connection. Warmth. Heart.' },
  3: { colors: ['#78350F', '#D97706', '#FEF3C7'], label: 'Drive. Mastery. Becoming.' },
  4: { colors: ['#312E81', '#7C3AED', '#DDD6FE'], label: 'Depth. Authenticity. Beauty.' },
  5: { colors: ['#0C4A6E', '#0891B2', '#CFFAFE'], label: 'Insight. Clarity. Knowledge.' },
  6: { colors: ['#3F3F46', '#6B7280', '#E5E7EB'], label: 'Loyalty. Courage. Ground.' },
  7: { colors: ['#7C2D12', '#EA580C', '#FFEDD5'], label: 'Joy. Freedom. Possibility.' },
  8: { colors: ['#450A0A', '#DC2626', '#FECACA'], label: 'Power. Truth. Protection.' },
  9: { colors: ['#064E3B', '#059669', '#D1FAE5'], label: 'Peace. Presence. Wholeness.' },
};

// Enneagram point positions on the circle
function enneaPoint(typeNum: number): { x: number; y: number } {
  const ORDER = [9, 1, 2, 3, 4, 5, 6, 7, 8];
  const idx = ORDER.indexOf(typeNum);
  if (idx === -1) return { x: 50, y: 50 };
  const angle = (idx * 40 * Math.PI) / 180;
  return { x: 50 + 42 * Math.sin(angle), y: 50 - 42 * Math.cos(angle) };
}

export default function ShareCard({ results, visible = true }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cardScale, setCardScale] = useState(1);

  const updateScale = useCallback(() => {
    if (!wrapperRef.current) return;
    const containerWidth = wrapperRef.current.offsetWidth;
    setCardScale(Math.min(1, containerWidth / 540));
  }, []);

  useEffect(() => {
    updateScale();
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScale]);

  const leadingType = results.leading_type as number;
  const typeName = (results.type_name as string) ?? `Type ${leadingType}`;
  const dsName = (results.defiant_spirit_type_name as string) ?? '';
  const headline = (results.headline as string) ?? '';
  const tritype = (results.tritype as string) ?? '';
  const wing = (results.wing as string) ?? '';
  const variant = (results.instinctual_variant as string) ?? '';
  const essence = TYPE_ESSENCE[leadingType] || TYPE_ESSENCE[1];

  const hexPairs: [number, number][] = [[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]];
  const triPairs: [number, number][] = [[3,6],[6,9],[9,3]];

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `soulo-type-${leadingType}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[ShareCard] Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard not available
    }
  };

  return (
    <div className={visible ? 'flex flex-col items-center gap-4 w-full' : 'contents'}>
      {/* Responsive wrapper — measures available width */}
      <div ref={wrapperRef} className="w-full" style={{ maxWidth: 540 }}>
        {/* Scaled container — preserves aspect ratio */}
        <div style={{ width: 540 * cardScale, height: 540 * cardScale, position: 'relative', margin: '0 auto' }}>
          {/* Card — 540×540px fixed for html2canvas, scaled via transform */}
          <div
            ref={cardRef}
            style={{
              width: 540,
              height: 540,
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `scale(${cardScale})`,
              transformOrigin: 'top left',
              background: `linear-gradient(145deg, ${essence.colors[0]} 0%, #1E293B 45%, #0F172A 100%)`,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 40%, ${essence.colors[1]}18 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, ${essence.colors[0]}12 0%, transparent 40%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Enneagram geometry watermark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.15,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 100 100" width="340" height="340">
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            {hexPairs.map(([a, b]) => {
              const pa = enneaPoint(a);
              const pb = enneaPoint(b);
              return <line key={`h-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="white" strokeWidth="0.25" opacity="0.4" />;
            })}
            {triPairs.map(([a, b]) => {
              const pa = enneaPoint(a);
              const pb = enneaPoint(b);
              return <line key={`t-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="white" strokeWidth="0.2" opacity="0.3" />;
            })}
            {[9, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => {
              const p = enneaPoint(t);
              const isActive = t === leadingType;
              return (
                <circle key={`p-${t}`} cx={p.x} cy={p.y} r={isActive ? 3 : 1.2} fill={isActive ? 'white' : 'rgba(255,255,255,0.5)'} />
              );
            })}
          </svg>
        </div>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          {/* Brand */}
          <p style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            SOULO ENNEAGRAM
          </p>

          {/* Type number — gradient circle matching hero */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${essence.colors[1]}, ${essence.colors[0]})`,
              boxShadow: `0 0 60px ${essence.colors[1]}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 64, fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
              {leadingType}
            </span>
          </div>

          {/* Type name */}
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 'bold', color: 'white', margin: '0 0 4px' }}>
            {typeName}
          </h2>
          {dsName && (
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#7A9E7E', margin: '0 0 8px' }}>
              {dsName}
            </p>
          )}

          {/* Type essence tagline */}
          <p style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            {essence.label}
          </p>

          {/* Details pills — glassmorphic style */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            {wing && (
              <span style={{
                fontFamily: 'Arial, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '4px 14px',
              }}>
                {wing}
              </span>
            )}
            {variant && (
              <span style={{
                fontFamily: 'Arial, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '4px 14px',
              }}>
                {variant}
              </span>
            )}
            {tritype && (
              <span style={{
                fontFamily: 'Arial, sans-serif', fontSize: 11, color: essence.colors[2],
                background: `${essence.colors[1]}18`, border: `1px solid ${essence.colors[1]}25`,
                borderRadius: 20, padding: '4px 14px',
              }}>
                {tritype}
              </span>
            )}
          </div>

          {/* Headline */}
          {headline && (
            <p style={{
              fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14,
              color: essence.colors[2], lineHeight: 1.7, maxWidth: 380, margin: '0 0 20px',
            }}>
              &ldquo;{headline}&rdquo;
            </p>
          )}

          {/* Divider */}
          <div style={{
            width: 60, height: 1, marginBottom: 16,
            background: `linear-gradient(to right, transparent, ${essence.colors[1]}50, transparent)`,
          }} />

          {/* Tagline */}
          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Defy Your Number. Live Your Spirit.
          </p>
        </div>
      </div>
      </div>
      </div>

      {/* Action buttons — outside card, not captured by html2canvas */}
      {visible && (
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="font-sans text-sm rounded-xl px-5 py-2.5 bg-[#2C2C2C] text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            {downloading ? 'Generating…' : 'Download Card'}
          </button>
          <button
            onClick={handleCopyLink}
            className="font-sans text-sm rounded-xl px-5 py-2.5 border border-[#E0DAD4] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
          >
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
    </div>
  );
}
