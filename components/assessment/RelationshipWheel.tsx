'use client';

import { useRef, useEffect } from 'react';
import {
  CLOCKWISE_ORDER,
  STRESS_LINES,
  RELEASE_LINES,
  CENTER_MAP,
  TYPE_NAMES,
  getSweepOrder,
  getWingTypes,
} from '@/lib/enneagram-lines';

interface RelationshipWheelProps {
  leadingType: number;
  tritypeTypes?: { body: number; heart: number; head: number } | null;
  stressType: number;
  releaseType: number;
  relationshipDescriptions: Record<string, { label: string; description: string }>;
  onTypeHover: (type: number | null) => void;
  hoveredType: number | null;
  selectedType?: number | null;
  onTypeSelect?: (type: number | null) => void;
  size?: number;
  typeScores?: Record<string, number>;
}

function getPointPosition(typeNumber: number): { x: number; y: number } {
  const idx = CLOCKWISE_ORDER.indexOf(typeNumber);
  if (idx === -1) return { x: 50, y: 50 };
  const angleDeg = idx * 40;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + 42 * Math.sin(angleRad),
    y: 50 - 42 * Math.cos(angleRad),
  };
}

export default function RelationshipWheel({
  leadingType,
  tritypeTypes,
  stressType,
  releaseType,
  relationshipDescriptions,
  onTypeHover,
  hoveredType,
  selectedType = null,
  onTypeSelect,
  size = 360,
  typeScores = {},
}: RelationshipWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sweepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const wingTypes = getWingTypes(leadingType);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      sweepTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          runSweepAnimation();
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (svgRef.current) {
      observerRef.current.observe(svgRef.current);
    }
    return () => {
      observerRef.current?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadingType]);

  function runSweepAnimation() {
    sweepTimersRef.current.forEach(clearTimeout);
    sweepTimersRef.current = [];

    const order = getSweepOrder(leadingType);
    // Slower, more elegant sweep — each type lingers 500ms with smooth transitions
    order.forEach((type, i) => {
      const t1 = setTimeout(() => {
        onTypeHover(type);
      }, i * 600);
      sweepTimersRef.current.push(t1);
    });
    // Clear hover after the full sweep
    const clearTimer = setTimeout(() => {
      onTypeHover(null);
    }, order.length * 600 + 400);
    sweepTimersRef.current.push(clearTimer);
  }

  function getLineColor(targetType: number): string {
    if (!hoveredType || hoveredType !== targetType) return 'rgba(0,0,0,0.06)';
    if (STRESS_LINES[leadingType] === targetType) return 'rgba(220,38,38,0.7)';
    if (RELEASE_LINES[leadingType] === targetType) return 'rgba(74,118,200,0.7)';
    if (wingTypes.includes(targetType)) return 'rgba(196,113,74,0.7)';
    if (tritypeTypes && Object.values(tritypeTypes).includes(targetType)) {
      const center = CENTER_MAP[targetType];
      if (center === 'Body') return '#2563EB';
      if (center === 'Heart') return '#60A5FA';
      return '#7A9E7E';
    }
    return 'rgba(0,0,0,0.15)';
  }

  function isLineDashed(targetType: number): boolean {
    if (!hoveredType) return false;
    return STRESS_LINES[leadingType] === targetType || RELEASE_LINES[leadingType] === targetType;
  }

  function getPointColor(typeNum: number): string {
    if (typeNum === leadingType) return '#2563EB';
    if (typeNum === hoveredType) return '#4A76C8';
    if (tritypeTypes && Object.values(tritypeTypes).includes(typeNum)) {
      const center = CENTER_MAP[typeNum];
      if (center === 'Body') return '#2563EB';
      if (center === 'Heart') return '#60A5FA';
      return '#7A9E7E';
    }
    return 'rgba(0,0,0,0.2)';
  }

  function getPointRadius(typeNum: number): number {
    if (typeNum === leadingType) return 6;
    if (typeNum === hoveredType) return 5;
    if (tritypeTypes && Object.values(tritypeTypes).includes(typeNum)) return 4;
    return 3;
  }

  // Inner triangle: 3 -> 6 -> 9 -> 3
  const trianglePath = [3, 6, 9]
    .map(getPointPosition)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  // Inner hexad: 1 -> 4 -> 2 -> 8 -> 5 -> 7 -> 1
  const hexadPath = [1, 4, 2, 8, 5, 7]
    .map(getPointPosition)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  return (
    <div style={{ width: size, height: size }}>
      <style>{`
        @keyframes dash-flow {
          to { stroke-dashoffset: -10; }
        }
      `}</style>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
        onMouseLeave={() => { if (selectedType === null) onTypeHover(null); }}
      >
        {/* Outer circle */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />

        {/* Inner triangle */}
        <path d={trianglePath} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.3" />

        {/* Inner hexad */}
        <path d={hexadPath} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.3" />

        {/* Highlighted line to hovered type */}
        {hoveredType && hoveredType !== leadingType && (() => {
          const from = getPointPosition(leadingType);
          const to = getPointPosition(hoveredType);
          const color = getLineColor(hoveredType);
          const dashed = isLineDashed(hoveredType);
          return (
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={color}
              strokeWidth={0.8}
              strokeDasharray={dashed ? '3 2' : 'none'}
              style={dashed ? { animation: 'dash-flow 0.8s linear infinite' } : {}}
            />
          );
        })()}

        {/* Type points */}
        {CLOCKWISE_ORDER.map((typeNum) => {
          const pos = getPointPosition(typeNum);
          const r = getPointRadius(typeNum);
          const color = getPointColor(typeNum);
          const isLeading = typeNum === leadingType;

          return (
            <g key={typeNum}>
              {/* Touch/hover/click target */}
              <circle
                cx={pos.x} cy={pos.y} r={12}
                fill="transparent"
                style={{ cursor: isLeading ? 'default' : 'pointer', touchAction: 'manipulation' }}
                onMouseEnter={() => { if (!isLeading && selectedType !== typeNum) onTypeHover(typeNum); }}
                onMouseLeave={() => { if (selectedType === null) onTypeHover(null); }}
                onClick={() => {
                  if (isLeading) return;
                  if (onTypeSelect) {
                    onTypeSelect(selectedType === typeNum ? null : typeNum);
                    onTypeHover(selectedType === typeNum ? null : typeNum);
                  } else {
                    onTypeHover(hoveredType === typeNum ? null : typeNum);
                  }
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (isLeading) return;
                  if (onTypeSelect) {
                    onTypeSelect(selectedType === typeNum ? null : typeNum);
                    onTypeHover(selectedType === typeNum ? null : typeNum);
                  } else {
                    onTypeHover(hoveredType === typeNum ? null : typeNum);
                  }
                }}
              />

              {/* Score ring removed — was creating messy overlapping circles */}

              {/* Visible point */}
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={color}
                style={{
                  transition: 'fill 200ms ease, r 200ms ease',
                  filter: isLeading
                    ? 'drop-shadow(0 0 4px #2563EB)'
                    : typeNum === hoveredType
                    ? 'drop-shadow(0 0 6px #4A76C8)'
                    : 'none',
                  pointerEvents: 'none',
                }}
              />

              {/* Type number label */}
              <text
                x={pos.x} y={pos.y + r + 5}
                textAnchor="middle"
                fill={isLeading ? '#2563EB' : 'rgba(0,0,0,0.4)'}
                fontSize="5"
                fontFamily="monospace"
                style={{ pointerEvents: 'none' }}
              >
                {typeNum}
              </text>

              {/* "YOU" label */}
              {isLeading && (
                <text
                  x={pos.x} y={pos.y + r + 10}
                  textAnchor="middle"
                  fill="rgba(196,113,74,0.6)"
                  fontSize="4"
                  fontFamily="monospace"
                  letterSpacing="0.1em"
                  style={{ pointerEvents: 'none' }}
                >
                  YOU
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
