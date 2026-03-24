'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  /** Milliseconds per character (default 18) */
  speed?: number;
  /** Delay before starting (default 0) */
  delay?: number;
  className?: string;
}

/**
 * TypewriterText — reveals text character by character.
 * Resets when the `text` prop changes.
 */
export default function TypewriterText({
  text,
  speed = 18,
  delay = 0,
  className = '',
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;
    startedRef.current = false;

    const delayTimer = setTimeout(() => {
      startedRef.current = true;
      const interval = setInterval(() => {
        indexRef.current += 1;
        if (indexRef.current >= text.length) {
          setDisplayed(text);
          clearInterval(interval);
        } else {
          setDisplayed(text.slice(0, indexRef.current));
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [text, speed, delay]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-current opacity-60 ml-[1px]" style={{ animation: 'blink 0.8s step-end infinite' }} />
      )}
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </span>
  );
}
