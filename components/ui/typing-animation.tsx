"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
}

export function TypingAnimation({
  text,
  duration = 40,
  className,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [i, setI] = useState<number>(0);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText("");
    setI(0);
  }, [text]);

  useEffect(() => {
    const typingEffect = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        setI(i + 1);
      } else {
        clearInterval(typingEffect);
      }
    }, duration);
    return () => {
      clearInterval(typingEffect);
    };
  }, [duration, i, text]);

  return (
    <span
      className={cn(
        "font-serif italic text-[1rem] text-[#4B5563] leading-[1.7]",
        className,
      )}
    >
      {displayedText ? displayedText : "\u00A0"}
    </span>
  );
}
