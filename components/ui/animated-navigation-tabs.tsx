"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type NavTab = {
  id: number;
  tile: string;
  special?: boolean;
};

interface AnimatedNavigationTabsProps {
  items: NavTab[];
  activeId?: number;
  onTabChange?: (tab: NavTab) => void;
}

export function AnimatedNavigationTabs({ items, activeId, onTabChange }: AnimatedNavigationTabsProps) {
  const [active, setActive] = useState<NavTab>(items.find(i => i.id === activeId) || items[0]);
  const [isHover, setIsHover] = useState<NavTab | null>(null);

  useEffect(() => {
    if (activeId !== undefined) {
      const tab = items.find(i => i.id === activeId);
      if (tab) setActive(tab);
    }
  }, [activeId, items]);

  const handleClick = (item: NavTab) => {
    setActive(item);
    onTabChange?.(item);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="flex items-center justify-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <ul className="flex items-center">
          {items.map((item) => {
            if (item.special) {
              return (
                <button
                  key={item.id}
                  className="mx-2 flex-shrink-0 relative"
                  onClick={() => handleClick(item)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-full font-sans text-sm font-bold text-white transition-all duration-300 relative overflow-hidden",
                      active.id === item.id
                        ? "shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                        : "hover:shadow-[0_0_16px_rgba(37,99,235,0.25)]"
                    )}
                    style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 50%, #0EA5E9 100%)' }}
                  >
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmerSlide 3s ease-in-out infinite',
                    }} />
                    {/* Small orb indicator */}
                    <div className="relative w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <span className="relative">{item.tile}</span>
                  </div>
                </button>
              );
            }
            return (
              <button
                key={item.id}
                className={cn(
                  "py-2 relative duration-300 transition-colors hover:!text-[#2563EB] whitespace-nowrap flex-shrink-0",
                  active.id === item.id ? "text-[#2563EB]" : "text-[#9B9590]"
                )}
                onClick={() => handleClick(item)}
                onMouseEnter={() => setIsHover(item)}
                onMouseLeave={() => setIsHover(null)}
              >
                <div className="px-5 py-2 relative font-sans text-sm font-semibold">
                  {item.tile}
                  {isHover?.id === item.id && (
                    <motion.div
                      layoutId="hover-bg"
                      className="absolute bottom-0 left-0 right-0 w-full h-full bg-[#2563EB]/10"
                      style={{ borderRadius: 6 }}
                    />
                  )}
                </div>
                {active.id === item.id && (
                  <motion.div
                    layoutId="active"
                    className="absolute bottom-0 left-0 right-0 w-full h-0.5 bg-[#2563EB]"
                  />
                )}
                {isHover?.id === item.id && (
                  <motion.div
                    layoutId="hover"
                    className="absolute bottom-0 left-0 right-0 w-full h-0.5 bg-[#2563EB]"
                  />
                )}
              </button>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
