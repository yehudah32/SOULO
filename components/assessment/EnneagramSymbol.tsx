'use client';

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

const HEXAD_ORDER = [1, 4, 2, 8, 5, 7];
const TRIANGLE_ORDER = [3, 6, 9];

function buildPath(types: number[]): string {
  return types
    .map((t, i) => {
      const p = getPoint(t);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    })
    .join(' ') + ' Z';
}

interface EnneagramSymbolProps {
  size?: number;
}

export default function EnneagramSymbol({ size = 160 }: EnneagramSymbolProps) {
  const hexadPath = HEXAD_ORDER.map((typeNum, i) => {
    const nextType = HEXAD_ORDER[(i + 1) % HEXAD_ORDER.length];
    const p1 = getPoint(typeNum);
    const p2 = getPoint(nextType);
    return { typeNum, nextType, p1, p2 };
  });

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="symbol-center-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Center glow */}
      <circle cx="50" cy="50" r="30" fill="url(#symbol-center-glow)" />

      {/* Outer circle */}
      <circle
        cx="50" cy="50" r="40"
        fill="none"
        stroke="#2563EB"
        strokeWidth="0.5"
        opacity="0.25"
      />

      {/* Triangle: 3-6-9 */}
      <path
        d={buildPath(TRIANGLE_ORDER)}
        fill="none"
        stroke="#2563EB"
        strokeWidth="0.4"
        opacity="0.2"
      />

      {/* Hexad lines */}
      {hexadPath.map(({ typeNum, nextType, p1, p2 }) => (
        <line
          key={`hex-${typeNum}-${nextType}`}
          x1={p1.x} y1={p1.y}
          x2={p2.x} y2={p2.y}
          stroke="#2563EB"
          strokeWidth="0.4"
          opacity="0.2"
        />
      ))}

      {/* 9 Points */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => {
        const p = getPoint(typeNum);
        return (
          <circle
            key={`pt-${typeNum}`}
            cx={p.x} cy={p.y}
            r={1.8}
            fill="#2563EB"
            opacity="0.3"
          />
        );
      })}
    </svg>
  );
}
