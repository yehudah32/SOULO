'use client';

import { useState, useEffect, useRef } from 'react';
import ResultsReveal from '@/components/assessment/ResultsReveal';

const TYPE_NAMES: Record<number, string> = {
  1: 'The Reformer', 2: 'The Helper', 3: 'The Achiever', 4: 'The Individualist',
  5: 'The Investigator', 6: 'The Loyalist', 7: 'The Enthusiast', 8: 'The Challenger', 9: 'The Peacemaker',
};

const CENTERS: Record<string, number[]> = {
  Body: [8, 9, 1],
  Heart: [2, 3, 4],
  Head: [5, 6, 7],
};

function getCenterOf(type: number): string {
  if ([8, 9, 1].includes(type)) return 'Body';
  if ([2, 3, 4].includes(type)) return 'Heart';
  return 'Head';
}

// Generate all valid tritypes for a given core type
function getTritypeOptions(core: number): string[] {
  const coreCenter = getCenterOf(core);
  const otherCenters = Object.entries(CENTERS).filter(([c]) => c !== coreCenter);
  const options: string[] = [];
  for (const [, types1] of [otherCenters[0]]) {
    for (const t1 of types1) {
      for (const [, types2] of [otherCenters[1]]) {
        for (const t2 of types2) {
          options.push(`${core}${t1}${t2}`);
        }
      }
    }
  }
  return options;
}

// Loading stages with estimated durations
const LOADING_STAGES = [
  { label: 'Creating synthetic session', pct: 5, est: 0.5 },
  { label: 'Building RAG context from knowledge base', pct: 15, est: 2 },
  { label: 'Querying relationship data for all 8 types', pct: 30, est: 5 },
  { label: 'Generating results with Claude (this takes a while)', pct: 50, est: 30 },
  { label: 'Parsing and validating response', pct: 85, est: 5 },
  { label: 'Caching results', pct: 95, est: 1 },
];

export default function PreviewResultsPage() {
  const [coreType, setCoreType] = useState(4);
  const [wing, setWing] = useState('4w5');
  const [variant, setVariant] = useState('SP');
  const [tritype, setTritype] = useState('468');
  const [confidence, setConfidence] = useState(0.85);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Loading progress state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const loadingStartRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tritype options based on core type
  const tritypeOptions = getTritypeOptions(coreType);

  // Wing options with correct wrapping
  const wingOptions = [
    `${coreType}w${coreType === 1 ? 9 : coreType - 1}`,
    `${coreType}w${coreType === 9 ? 1 : coreType + 1}`,
  ];

  // Update tritype when core type changes
  function handleCoreTypeChange(t: number) {
    setCoreType(t);
    setWing(`${t}w${t === 1 ? 9 : t - 1}`);
    const opts = getTritypeOptions(t);
    if (opts.length > 0) setTritype(opts[0]);
  }

  // Loading progress simulation based on elapsed time
  useEffect(() => {
    if (!isLoading) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    loadingStartRef.current = Date.now();
    setLoadingProgress(0);
    setElapsedSeconds(0);
    setLoadingStage(LOADING_STAGES[0].label);

    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - loadingStartRef.current) / 1000;
      setElapsedSeconds(Math.floor(elapsed));

      // Map elapsed time to progress stages
      // Results generation typically takes 30-120s
      if (elapsed < 1) {
        setLoadingProgress(5);
        setLoadingStage(LOADING_STAGES[0].label);
      } else if (elapsed < 5) {
        setLoadingProgress(5 + (elapsed / 5) * 10);
        setLoadingStage(LOADING_STAGES[1].label);
      } else if (elapsed < 15) {
        setLoadingProgress(15 + ((elapsed - 5) / 10) * 15);
        setLoadingStage(LOADING_STAGES[2].label);
      } else if (elapsed < 90) {
        // Main Claude generation — slow progress
        setLoadingProgress(30 + ((elapsed - 15) / 75) * 55);
        setLoadingStage(LOADING_STAGES[3].label);
      } else if (elapsed < 110) {
        setLoadingProgress(85 + ((elapsed - 90) / 20) * 10);
        setLoadingStage(LOADING_STAGES[4].label);
      } else {
        setLoadingProgress(95);
        setLoadingStage(LOADING_STAGES[5].label);
      }
    }, 200);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isLoading]);

  async function handleGenerate() {
    setIsLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/admin/simulate/preview-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreType, wing, variant, tritype, confidence }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      setLoadingProgress(100);
      setLoadingStage('Complete');
      setResults(data.results);
      setSessionId(data.sessionId);
    } catch (err) {
      setError(String(err));
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="border-b border-[#E8E4E0] bg-white px-6 py-3 flex items-center gap-4">
        <a href="/admin" className="font-sans text-xs text-[#9B9590] hover:text-[#6B6B6B]">← Dashboard</a>
        <h1 className="font-serif text-lg font-semibold text-[#2C2C2C]">Preview Results</h1>
      </div>

      <div className="flex h-[calc(100vh-53px)]">
        {/* Left: Controls */}
        <div className="w-[300px] flex-shrink-0 border-r border-[#E8E4E0] bg-white p-5 space-y-5 overflow-y-auto">
          {/* Core Type */}
          <div>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] block mb-2">
              Core Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                <button
                  key={t}
                  onClick={() => handleCoreTypeChange(t)}
                  className={`font-sans text-sm py-1.5 rounded-lg border transition-colors ${
                    coreType === t
                      ? 'bg-[#2563EB] border-[#2563EB] text-white font-semibold'
                      : 'border-[#E8E4E0] text-[#6B6B6B] hover:border-[#2563EB]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="font-sans text-xs text-[#9B9590] mt-1">{TYPE_NAMES[coreType]}</p>
          </div>

          {/* Wing */}
          <div>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] block mb-2">
              Wing
            </label>
            <div className="flex gap-2">
              {wingOptions.map((w) => (
                <button
                  key={w}
                  onClick={() => setWing(w)}
                  className={`flex-1 font-sans text-sm py-1.5 rounded-lg border transition-colors ${
                    wing === w
                      ? 'bg-[#2563EB] border-[#2563EB] text-white font-semibold'
                      : 'border-[#E8E4E0] text-[#6B6B6B] hover:border-[#2563EB]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Variant */}
          <div>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] block mb-2">
              Instinctual Variant
            </label>
            <div className="flex gap-2">
              {['SP', 'SO', 'SX'].map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={`flex-1 font-sans text-sm py-1.5 rounded-lg border transition-colors ${
                    variant === v
                      ? 'bg-[#7A9E7E] border-[#7A9E7E] text-white font-semibold'
                      : 'border-[#E8E4E0] text-[#6B6B6B] hover:border-[#7A9E7E]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Tritype — dropdown based on core type */}
          <div>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] block mb-2">
              Tritype ({getCenterOf(coreType)}: {coreType})
            </label>
            <select
              value={tritype}
              onChange={(e) => setTritype(e.target.value)}
              className="w-full font-sans text-sm px-3 py-2 rounded-lg border border-[#E8E4E0] focus:border-[#2563EB] focus:outline-none bg-white"
            >
              {tritypeOptions.map((opt) => {
                const digits = opt.split('').map(Number);
                const labels = digits.map((d) => `${getCenterOf(d)[0]}:${d}`).join(' · ');
                return (
                  <option key={opt} value={opt}>
                    {digits.join('-')} ({labels})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Confidence */}
          <div>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] block mb-2">
              Confidence: {Math.round(confidence * 100)}%
            </label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-[#2563EB]"
            />
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full font-sans text-sm bg-[#2563EB] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Preview'}
          </button>

          {error && (
            <p className="font-sans text-xs text-red-600 break-words">{error}</p>
          )}

          {/* Raw JSON toggle */}
          {results && (
            <details>
              <summary className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] cursor-pointer hover:text-[#2563EB]">
                Raw JSON
              </summary>
              <pre className="mt-2 text-[0.55rem] font-mono text-[#2C2C2C] bg-[#FAF8F5] rounded-xl p-3 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Right: Results render or loading */}
        <div className="flex-1 overflow-y-auto">
          {!results && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <p className="font-sans text-sm text-[#9B9590]">
                Set type values and click &quot;Generate Preview&quot; to see results.
              </p>
            </div>
          )}

          {/* Loading progress */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="w-full max-w-[420px] flex flex-col items-center gap-6 px-6">
                {/* Elapsed time */}
                <p className="font-mono text-[0.75rem] text-[#9B9590]">
                  {formatTime(elapsedSeconds)} elapsed
                </p>

                {/* Progress bar */}
                <div className="w-full">
                  <div className="w-full h-3 bg-[#E8E4E0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${Math.round(loadingProgress)}%`,
                        background: loadingProgress >= 100
                          ? '#7A9E7E'
                          : 'linear-gradient(90deg, #2563EB, #60A5FA)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[0.6rem] text-[#9B9590]">
                      {Math.round(loadingProgress)}%
                    </span>
                  </div>
                </div>

                {/* Current stage */}
                <p className="font-sans text-sm text-[#6B6B6B] text-center">
                  {loadingStage}
                </p>

                {/* Stage checklist */}
                <div className="w-full space-y-2">
                  {LOADING_STAGES.map((stage, i) => {
                    const isDone = loadingProgress >= stage.pct;
                    const isCurrent = loadingStage === stage.label;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDone ? 'bg-[#7A9E7E]' : isCurrent ? 'bg-[#2563EB]' : 'bg-[#E8E4E0]'
                        }`}>
                          {isDone && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2.5 5L4.5 7L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {isCurrent && !isDone && (
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          )}
                        </div>
                        <span className={`font-sans text-xs ${
                          isDone ? 'text-[#7A9E7E]' : isCurrent ? 'text-[#2563EB] font-semibold' : 'text-[#9B9590]'
                        }`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {results && sessionId && (
            <ResultsReveal results={results} sessionId={sessionId} />
          )}
        </div>
      </div>
    </div>
  );
}
