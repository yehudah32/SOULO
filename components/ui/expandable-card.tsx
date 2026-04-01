"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ExpandableCardProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
  cardFace?: React.ReactNode;
  expandedBg?: string;
  lightMode?: boolean;
}

export function ExpandableCard({
  title,
  description,
  children,
  className,
  cardFace,
  expandedBg,
  lightMode = false,
}: ExpandableCardProps) {
  const [active, setActive] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(false);
    };
    if (active) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [active]);

  const textColor = lightMode ? "text-zinc-800" : "text-white";
  const subtextColor = lightMode ? "text-zinc-500" : "text-white/60";

  // Portal the modal to document.body so it escapes all stacking contexts
  const modal = (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[3px]"
            style={{ zIndex: 9998 }}
            onClick={() => setActive(false)}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 sm:p-8 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              className={cn(
                "w-full max-w-[650px] max-h-[85vh] overflow-y-auto rounded-3xl relative pointer-events-auto",
                "[scrollbar-width:none] [-ms-overflow-style:none]",
                expandedBg || "bg-[#0a0a0a]",
              )}
            >
              <button
                onClick={() => setActive(false)}
                className={cn(
                  "absolute top-5 right-5 z-10 p-2 rounded-full transition-colors",
                  lightMode ? "bg-zinc-200/80 hover:bg-zinc-300 text-zinc-600" : "bg-white/10 hover:bg-white/20 text-white"
                )}
              >
                <X size={18} />
              </button>

              <div className="p-8 sm:p-10">
                <p className={cn("text-sm font-medium mb-1", subtextColor)}>{description}</p>
                <h3 className={cn("font-serif font-bold text-3xl sm:text-4xl mb-6", textColor)}>{title}</h3>
                <div className={subtextColor}>
                  {children}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {mounted && createPortal(modal, document.body)}

      <div
        onClick={() => setActive(true)}
        className={cn("cursor-pointer h-full", className)}
      >
        {cardFace}
      </div>
    </>
  );
}
