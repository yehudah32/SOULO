"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { AnimatedNavigationTabs, type NavTab } from "@/components/ui/animated-navigation-tabs";
import { logout } from "@/lib/auth-utils";

interface SouloNavProps {
  loggedIn?: boolean;
  userEmail?: string;
  hasResults?: boolean;
  onSignInClick?: () => void;
  showPortalTabs?: boolean;
  portalTabs?: NavTab[];
  activeTabId?: number;
  onTabChange?: (tab: NavTab) => void;
}

/* ─── Hamburger bars that morph to X ─── */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="relative w-[18px] h-[14px]">
      <span
        className="absolute left-0 w-full h-[1.5px] rounded-full bg-[#E8DFD0] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)]"
        style={{
          top: open ? "50%" : "0",
          transform: open ? "translateY(-50%) rotate(45deg)" : "none",
        }}
      />
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1.5px] rounded-full bg-[#E8DFD0] transition-all duration-300"
        style={{
          opacity: open ? 0 : 1,
          transform: open ? "translateY(-50%) scaleX(0)" : "translateY(-50%) scaleX(1)",
        }}
      />
      <span
        className="absolute left-0 w-full h-[1.5px] rounded-full bg-[#E8DFD0] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)]"
        style={{
          bottom: open ? "auto" : "0",
          top: open ? "50%" : "auto",
          transform: open ? "translateY(-50%) rotate(-45deg)" : "none",
        }}
      />
    </div>
  );
}

export default function SouloNav({
  loggedIn = false,
  userEmail,
  hasResults = false,
  onSignInClick,
  showPortalTabs = false,
  portalTabs,
  activeTabId,
  onTabChange,
}: SouloNavProps) {
  const pathname = usePathname();
  const [portalNavOpen, setPortalNavOpen] = useState(false);

  // Build nav items based on auth + portal state
  const navItems: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/about", label: "Defy Your Number" },
    { href: "/collection", label: "The Collection" },
  ];

  if (!loggedIn) {
    navItems.push({ href: "/assessment", label: "Begin Assessment" });
  } else if (!showPortalTabs) {
    navItems.push({ href: "/results", label: "My Portal" });
  }

  const showMobilePortal = loggedIn && hasResults;

  /* ─── Glass pill styles (shared) ─── */
  const glassPill = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
  };

  return (
    <div className="flex-shrink-0 sticky top-0 z-30">
      {/* Row 1 — Main nav */}
      <header
        className="px-6 md:px-10"
        style={{ background: "linear-gradient(to right, #2C2418, #1a1510)" }}
      >
        <div className="relative flex h-[4.5rem] items-center justify-between">
          {/* ─── Left: logo + mobile menu ─── */}
          <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
            {/* Mobile hamburger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="group size-8 md:hidden text-[#E8DFD0] hover:text-white hover:bg-white/10"
                  variant="ghost"
                  size="icon"
                >
                  <svg
                    className="pointer-events-none"
                    width={16} height={16} viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M4 12L20 12" className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]" />
                    <path d="M4 12H20" className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45" />
                    <path d="M4 12H20" className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]" />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-2 md:hidden bg-white/95 backdrop-blur-md border border-[#E8E4E0] rounded-xl shadow-lg">
                <nav className="flex flex-col gap-1">
                  <Link href="/" className="font-sans text-sm text-[#6B6B6B] hover:text-[#2563EB] px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">Home</Link>
                  <Link href="/about" className="font-sans text-sm text-[#6B6B6B] hover:text-[#2563EB] px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">Defy Your Number</Link>
                  <Link href="/collection" className="font-sans text-sm text-[#6B6B6B] hover:text-[#2563EB] px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">The Collection</Link>
                  <div className="h-px bg-[#E8E4E0] my-1" />
                  {!loggedIn && (
                    <Link href="/assessment" className="font-sans text-sm text-[#6B6B6B] hover:text-[#2563EB] px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">Begin Assessment</Link>
                  )}
                  {loggedIn && (
                    <>
                      {showMobilePortal && (
                        <Link href="/results" className="font-sans text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-3 py-2.5 rounded-xl text-center transition-colors">My Portal</Link>
                      )}
                      {!showPortalTabs && (
                        <Link href="/assessment" className="font-sans text-sm text-[#6B6B6B] hover:text-[#2563EB] px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">New Assessment</Link>
                      )}
                    </>
                  )}
                  {!loggedIn && (
                    <>
                      <div className="h-px bg-[#E8E4E0] my-1" />
                      {onSignInClick ? (
                        <button onClick={onSignInClick} className="font-sans text-sm text-[#2563EB] text-left px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">Sign In</button>
                      ) : (
                        <Link href="/login" className="font-sans text-sm text-[#2563EB] text-left px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">Sign In</Link>
                      )}
                    </>
                  )}
                </nav>
              </PopoverContent>
            </Popover>

            {/* Logo */}
            <Link
              href="/"
              className="font-serif text-[2.2rem] font-bold tracking-tight transition-opacity hover:opacity-80"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 40%, #0EA5E9 70%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Soulo
            </Link>
          </div>

          {/* ─── Center: nav links ─── */}
          {showPortalTabs ? (
            /* ── Portal mode: collapsible horizontal hamburger ── */
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
              <motion.div
                layout
                className="flex items-center rounded-full overflow-hidden"
                style={glassPill}
                transition={{ layout: { type: "spring", stiffness: 500, damping: 35, mass: 0.8 } }}
              >
                {/* Toggle button — hamburger morphs to X */}
                <motion.button
                  layout
                  onClick={() => setPortalNavOpen((v) => !v)}
                  className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 hover:bg-white/10 transition-colors"
                  aria-label={portalNavOpen ? "Close navigation" : "Open navigation"}
                >
                  <HamburgerIcon open={portalNavOpen} />
                </motion.button>

                {/* Links that fly out horizontally */}
                <AnimatePresence mode="popLayout">
                  {portalNavOpen && (
                    <motion.div
                      className="flex items-center gap-0.5 pr-2"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      {navItems.map((item, i) => {
                        const isActive =
                          pathname === item.href ||
                          (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                          <motion.div
                            key={item.href}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{
                              delay: i * 0.06,
                              duration: 0.25,
                              ease: [0.32, 0.72, 0, 1],
                            }}
                          >
                            <Link
                              href={item.href}
                              className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap block"
                              style={{
                                color: isActive ? "rgba(255,255,255,0.95)" : "rgba(232,223,208,0.6)",
                                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                                boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.1)" : "none",
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.color = "rgba(232,223,208,0.6)";
                                  e.currentTarget.style.background = "transparent";
                                }
                              }}
                            >
                              {item.label}
                            </Link>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            /* ── Normal mode: always-visible nav pill ── */
            <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2">
              <div
                className="flex items-center gap-0.5 rounded-full px-1.5 py-1"
                style={glassPill}
              >
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] px-4 py-2 rounded-full transition-all duration-250 whitespace-nowrap"
                      style={{
                        color: isActive ? "rgba(255,255,255,0.95)" : "rgba(232,223,208,0.6)",
                        background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                        boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.1)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = "rgba(232,223,208,0.6)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}

          {/* ─── Right: user menu / sign in ─── */}
          <div className="flex items-center gap-2 relative z-10">
            {loggedIn && userEmail ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-[#E8DFD0]/15 border border-[#E8DFD0]/25 flex items-center justify-center flex-shrink-0">
                      <span className="font-sans text-xs font-bold text-[#E8DFD0]">{userEmail[0]?.toUpperCase()}</span>
                    </div>
                    <span className="font-sans text-xs text-[#E8DFD0]/70 hidden sm:inline max-w-[120px] truncate">{userEmail}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-[#E8DFD0]/40">
                      <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2 bg-white/95 backdrop-blur-md border border-[#E8E4E0] rounded-xl shadow-lg">
                  <div className="px-3 py-2 mb-1">
                    <p className="font-sans text-xs text-[#9B9590] truncate">{userEmail}</p>
                  </div>
                  <div className="px-2 mb-2">
                    <Link href="/results" className="flex items-center justify-center gap-2 font-sans text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-2.5 rounded-xl transition-colors w-full">My Portal</Link>
                  </div>
                  <div className="h-px bg-[#E8E4E0] mb-1" />
                  <Link href="/assessment" className="flex items-center gap-2 font-sans text-sm text-[#2C2C2C] hover:text-[#2563EB] px-3 py-2 rounded-lg hover:bg-[#F0F4FF] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    New Assessment
                  </Link>
                  <div className="h-px bg-[#E8E4E0] my-1" />
                  <button onClick={logout} className="w-full flex items-center gap-2 font-sans text-sm text-[#DC2626] hover:text-[#B91C1C] px-3 py-2 rounded-lg hover:bg-[#FEF2F2] transition-colors text-left">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Log Out
                  </button>
                </PopoverContent>
              </Popover>
            ) : onSignInClick ? (
              <button
                onClick={onSignInClick}
                className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#E8DFD0]/70 hover:text-white border border-[#E8DFD0]/25 hover:border-white/40 rounded-full px-6 py-2 transition-all duration-200"
              >
                Sign In
              </button>
            ) : (
              <Link
                href="/login"
                className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#E8DFD0]/70 hover:text-white border border-[#E8DFD0]/25 hover:border-white/40 rounded-full px-6 py-2 transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Row 2 — Portal tabs */}
      {showPortalTabs && portalTabs && onTabChange && (
        <div className="w-full bg-white border-b border-[#E8E4E0] px-4 overflow-hidden">
          <AnimatedNavigationTabs
            items={portalTabs}
            activeId={activeTabId ?? 0}
            onTabChange={onTabChange}
          />
        </div>
      )}
    </div>
  );
}
