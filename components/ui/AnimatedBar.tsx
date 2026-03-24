'use client';

import { useState, useEffect } from 'react';

interface AnimatedBarProps {
  /** Target percentage 0-100 */
  percent: number;
  /** Bar color */
  color?: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Bar height class (default h-2) */
  height?: string;
  /** Show the percentage number */
  showNumber?: boolean;
  /** Additional class on the number */
  numberClassName?: string;
}

/**
 * AnimatedBar — a percentage bar that fills from 0 to target.
 * Uses CSS transition for smooth fill.
 */
export default function AnimatedBar({
  percent,
  color = '#2563EB',
  delay = 0,
  height = 'h-2',
  showNumber = true,
  numberClassName = '',
}: AnimatedBarProps) {
  const [currentPct, setCurrentPct] = useState(0);
  const [numberVisible, setNumberVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPct(percent);
      setTimeout(() => setNumberVisible(true), 400);
    }, delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <>
      <div className={`flex-1 ${height} rounded-full bg-[#E8E4E0] overflow-hidden`}>
        <div
          className={`${height} rounded-full`}
          style={{
            width: `${currentPct}%`,
            backgroundColor: color,
            transition: 'width 0.8s ease-out',
          }}
        />
      </div>
      {showNumber && (
        <span
          className={`font-sans text-xs w-10 text-right transition-opacity duration-300 ${numberClassName}`}
          style={{ opacity: numberVisible ? 1 : 0 }}
        >
          {currentPct}%
        </span>
      )}
    </>
  );
}
