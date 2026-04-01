'use client';

import { Lock } from 'lucide-react';

interface LockedSectionProps {
  label: string;
  onUnlock?: () => void;
}

/**
 * Frosted overlay for locked results sections.
 * Shows a blurred placeholder with a lock icon and unlock prompt.
 * The actual content data is NOT in the DOM — this is just visual.
 */
export default function LockedSection({ label, onUnlock }: LockedSectionProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden my-4">
      {/* Placeholder shapes to suggest content exists */}
      <div className="p-8 space-y-4">
        <div className="h-4 w-32 rounded-full bg-[#E8E4E0]/60" />
        <div className="h-6 w-48 rounded-full bg-[#E8E4E0]/40" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-[#E8E4E0]/30" />
          <div className="h-3 w-4/5 rounded-full bg-[#E8E4E0]/30" />
          <div className="h-3 w-3/5 rounded-full bg-[#E8E4E0]/30" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="h-20 rounded-xl bg-[#E8E4E0]/20" />
          <div className="h-20 rounded-xl bg-[#E8E4E0]/20" />
        </div>
      </div>

      {/* Frosted overlay */}
      <div className="absolute inset-0 backdrop-blur-[6px] bg-white/60 flex flex-col items-center justify-center rounded-2xl border border-[#E8E4E0]">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
            <Lock size={18} className="text-[#2563EB]" />
          </div>
          <p className="font-serif text-sm font-semibold text-[#2C2C2C]">{label}</p>
          {onUnlock && (
            <button
              onClick={onUnlock}
              className="font-sans text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
            >
              Unlock Full Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
