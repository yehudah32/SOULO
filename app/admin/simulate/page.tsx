'use client';

import { useState, useRef, useEffect } from 'react';

interface ShadowEntry {
  phase: string;
  vector_top_type: number;
  vector_confidence: number;
  agreement: boolean;
  center_agreement: boolean;
  vector_type_scores?: Record<string, number>;
  vector_center_scores?: Record<string, unknown>;
  exchange_number: number;
  claude_top_type: number;
  claude_confidence: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  internal?: Record<string, unknown>;
  responseParts?: {
    guide_text?: string;
    question_text?: string;
    question_format?: string;
    answer_options?: string[];
    scale_range?: { min: number; max: number };
    context_note?: string;
  };
  shadowEntries?: ShadowEntry[];
}

export default function SimulatePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInternal, setSelectedInternal] = useState<Record<string, unknown> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessionState, setSessionState] = useState<any>(null);
  const [showStateEditor, setShowStateEditor] = useState(false);
  const [stateJson, setStateJson] = useState('');
  const [stateError, setStateError] = useState('');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Roll up all shadow entries across the whole conversation, by exchange.
  const allShadowEntries: ShadowEntry[] = messages.flatMap((m) => m.shadowEntries ?? []);
  const shadowByExchange = new Map<number, { v1?: ShadowEntry; v2?: ShadowEntry }>();
  for (const e of allShadowEntries) {
    const slot = shadowByExchange.get(e.exchange_number) ?? {};
    if (e.phase?.startsWith('v1:')) slot.v1 = e;
    else if (e.phase?.startsWith('v2:')) slot.v2 = e;
    shadowByExchange.set(e.exchange_number, slot);
  }
  const tiebreakerFirings = allShadowEntries.filter((e) => /tiebreaker=/.test(e.phase || '')).length;
  const latestV2 = [...allShadowEntries].reverse().find((e) => e.phase?.startsWith('v2:'));
  const v2WholeType = latestV2?.phase?.match(/wholeType=([0-9-]+)/)?.[1] ?? null;

  async function handleNewSession() {
    setIsLoading(true);
    setMessages([]);
    setSelectedInternal(null);
    setSessionState(null);
    try {
      const res = await fetch('/api/admin/simulate/init', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSessionId(data.sessionId);
      setSessionState(data.sessionState);
      setMessages([{
        role: 'assistant',
        content: data.response,
        internal: data.internal,
        responseParts: data.response_parts,
      }]);
      setSelectedInternal(data.internal);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    if (!sessionId || !input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/simulate/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSessionState(data.sessionState);
      const msg: Message = {
        role: 'assistant',
        content: data.response,
        internal: data.internal,
        responseParts: data.response_parts,
        shadowEntries: data.shadowEntries ?? [],
      };
      setMessages((prev) => [...prev, msg]);
      setSelectedInternal(data.internal);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Generate results for the simulated session and open the user-facing
  // results page in a new tab. Calls /api/results/generate first to ensure
  // a row exists in assessment_results, then routes to the same /results
  // page real users see.
  async function handleViewResults() {
    if (!sessionId) return;
    setResultsLoading(true);
    setResultsError('');
    try {
      const genRes = await fetch('/api/results/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, forceRegenerate: true }),
      });
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        throw new Error(err.error || `Generate failed (${genRes.status})`);
      }
      // Open the real results page in a new tab — same code path as a real user
      window.open(`/results?sessionId=${encodeURIComponent(sessionId)}`, '_blank', 'noopener');
    } catch (err) {
      setResultsError(String(err));
    } finally {
      setResultsLoading(false);
    }
  }

  // Build a single text dump of everything the user might want to share
  // with us for diagnosis. Includes session id, every turn, every shadow
  // entry, current hypothesis, vector v2 state, and vector mode.
  function buildDiagnostic(): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('SOULO ASSESSMENT DIAGNOSTIC EXPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`session_id:     ${sessionId || '(none)'}`);
    lines.push(`exchanges:      ${sessionState?.exchangeCount ?? 0}`);
    lines.push(`current_stage:  ${sessionState?.currentStage ?? '?'}`);
    lines.push(`isComplete:     ${sessionState?.isComplete ?? false}`);
    lines.push('');
    const h = sessionState?.internalState?.hypothesis;
    if (h) {
      lines.push('--- CLAUDE HYPOTHESIS ---');
      lines.push(`leading_type: ${h.leading_type ?? '?'}`);
      lines.push(`confidence:   ${((h.confidence ?? 0) * 100).toFixed(0)}%`);
      if (h.type_scores) {
        lines.push('type_scores:');
        const sorted = Object.entries(h.type_scores)
          .map(([t, s]) => [Number(t), Number(s)] as const)
          .sort((a, b) => b[1] - a[1]);
        for (const [t, s] of sorted) {
          lines.push(`  ${t}: ${(s * 100).toFixed(0)}%`);
        }
      }
      lines.push('');
    }
    if (latestV2 && v2WholeType) {
      lines.push('--- VECTOR V2 (latest) ---');
      lines.push(`whole_type:   ${v2WholeType}`);
      lines.push(`core_type:    ${latestV2.vector_top_type}`);
      lines.push(`confidence:   ${(latestV2.vector_confidence * 100).toFixed(0)}%`);
      lines.push(`tiebreakers:  ${tiebreakerFirings} fired`);
      lines.push('');
    }
    lines.push('--- CONVERSATION ---');
    messages.forEach((m, i) => {
      const tag = m.role === 'user' ? 'USER ' : 'SOULO';
      const text = (m.responseParts?.question_text || m.content || '').replace(/\s+/g, ' ');
      lines.push(`[${String(i + 1).padStart(2, '0')}] ${tag}: ${text}`);
      if (m.responseParts?.question_format) {
        lines.push(`     format=${m.responseParts.question_format}${m.responseParts.answer_options ? ` options=[${m.responseParts.answer_options.join(' | ')}]` : ''}`);
      }
    });
    lines.push('');
    lines.push('--- SHADOW MODE LOG (per exchange) ---');
    const sortedExchanges = [...shadowByExchange.entries()].sort((a, b) => a[0] - b[0]);
    for (const [ex, slot] of sortedExchanges) {
      lines.push(`Exchange ${ex}:`);
      if (slot.v1) {
        lines.push(`  v1: T${slot.v1.vector_top_type} @ ${(slot.v1.vector_confidence * 100).toFixed(0)}% | claude=T${slot.v1.claude_top_type} | core ${slot.v1.agreement ? '✓' : '✗'} center ${slot.v1.center_agreement ? '✓' : '✗'}`);
      }
      if (slot.v2) {
        const tb = slot.v2.phase?.match(/tiebreaker=([0-9-]+)/)?.[1];
        const wt = slot.v2.phase?.match(/wholeType=([0-9-]+)/)?.[1];
        lines.push(`  v2: T${slot.v2.vector_top_type} @ ${(slot.v2.vector_confidence * 100).toFixed(0)}% | whole=${wt || '?'} | core ${slot.v2.agreement ? '✓' : '✗'} center ${slot.v2.center_agreement ? '✓' : '✗'}${tb ? ` | TIEBREAKER ${tb}` : ''}`);
      }
    }
    lines.push('');
    lines.push('--- RAW SESSION STATE ---');
    lines.push(JSON.stringify(sessionState, null, 2));
    return lines.join('\n');
  }

  async function handleSetState() {
    if (!sessionId) return;
    setStateError('');
    try {
      const patch = JSON.parse(stateJson);
      const res = await fetch('/api/admin/simulate/set-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, patch }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSessionState(data.sessionState);
      setShowStateEditor(false);
      setStateJson('');
    } catch (err) {
      setStateError(String(err));
    }
  }

  const hypothesis = sessionState?.internalState?.hypothesis;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="border-b border-[#E8E4E0] bg-white px-6 py-3 flex items-center gap-4">
        <a href="/admin" className="font-sans text-xs text-[#9B9590] hover:text-[#6B6B6B]">← Dashboard</a>
        <h1 className="font-serif text-lg font-semibold text-[#2C2C2C]">Simulate Assessment</h1>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleNewSession}
            disabled={isLoading}
            className="font-sans text-xs bg-[#2563EB] text-white px-4 py-1.5 rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            New Session
          </button>
          {sessionId && (
            <>
              <button
                onClick={() => { setShowStateEditor(true); setStateJson(JSON.stringify(sessionState?.internalState ?? {}, null, 2)); }}
                className="font-sans text-xs border border-[#E8E4E0] px-4 py-1.5 rounded-lg hover:bg-[#FAF8F5]"
                title="Edit the session's internal state JSON for testing edge cases"
              >
                Edit State
              </button>
              <button
                onClick={handleViewResults}
                disabled={resultsLoading || messages.length < 2}
                className="font-sans text-xs border border-[#7A9E7E] text-[#7A9E7E] px-4 py-1.5 rounded-lg hover:bg-[#7A9E7E]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Generates results for this session and opens the real /results page in a new tab"
              >
                {resultsLoading ? 'Generating…' : 'View Results →'}
              </button>
              <button
                onClick={() => setShowDiagnostic(true)}
                className="font-sans text-xs border border-[#2563EB] text-[#2563EB] px-4 py-1.5 rounded-lg hover:bg-[#2563EB]/10"
                title="Open a copyable text dump of every signal — useful for sharing diagnostic data"
              >
                Copy Diagnostic
              </button>
            </>
          )}
          {resultsError && (
            <span className="font-sans text-xs text-red-600 ml-2">{resultsError}</span>
          )}
        </div>
      </div>

      {!sessionId ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <p className="font-sans text-sm text-[#9B9590] mb-4">Click &quot;New Session&quot; to start a simulated assessment.</p>
            <div className="text-[0.7rem] text-[#9B9590] bg-[#FAF8F5] border border-[#E8E4E0] rounded-lg p-3 text-left leading-relaxed">
              <strong>This simulator is a thin proxy.</strong> Every session runs the
              EXACT same code path as a real user assessment — same system prompt
              (v2 with Whole Type Probing Strategy), same vector v2 shadow logging,
              same tiebreaker detection, same persistence to Supabase. Anything you
              do here produces real data in <code>shadow_mode_log</code> and
              <code>assessment_results</code>. Use it freely for testing.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-53px)]">
          {/* Left: Conversation */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-[#E8E4E0]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-white border border-[#E8E4E0]'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.responseParts?.guide_text && (
                      <p className="font-sans italic text-xs text-[#9B9590] mb-2 pb-2 border-b border-[#E8E4E0]">
                        {msg.responseParts.guide_text}
                      </p>
                    )}
                    <p className={`font-sans text-sm ${msg.role === 'user' ? '' : 'font-semibold text-[#2C2C2C]'}`}>
                      {msg.role === 'assistant' && msg.responseParts?.question_text
                        ? msg.responseParts.question_text
                        : msg.content}
                    </p>
                    {msg.role === 'assistant' && msg.responseParts?.question_format && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="font-mono text-[0.6rem] bg-[#FAF8F5] text-[#2563EB] px-2 py-0.5 rounded-full border border-[#E8E4E0]">
                          {msg.responseParts.question_format}
                        </span>
                        {msg.responseParts.answer_options?.map((opt, j) => (
                          <button
                            key={j}
                            onClick={() => setInput(opt)}
                            className="font-sans text-[0.65rem] bg-white text-[#6B6B6B] px-2 py-0.5 rounded-full border border-[#E8E4E0] hover:border-[#2563EB] cursor-pointer"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.internal && (
                      <button
                        onClick={() => setSelectedInternal(msg.internal!)}
                        className="mt-2 font-mono text-[0.6rem] text-[#9B9590] hover:text-[#2563EB] underline"
                      >
                        View INTERNAL
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E8E4E0] rounded-2xl px-4 py-3">
                    <span className="font-sans text-sm text-[#9B9590]">Soulo is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#E8E4E0] p-3 bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your answer..."
                className="flex-1 font-sans text-sm px-4 py-2 rounded-xl border border-[#E8E4E0] focus:border-[#2563EB] focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="font-sans text-sm bg-[#2563EB] text-white px-5 py-2 rounded-xl hover:bg-[#1D4ED8] disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>

          {/* Right: Inspector */}
          <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-white p-4 space-y-4">
            {/* ═══ VECTOR SHADOW MODE PANEL ═══ */}
            {(latestV2 || allShadowEntries.length > 0) && (
              <div className="bg-[#0F172A] text-white rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-70">Vector v2 — Shadow Mode</span>
                  <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#7A9E7E]">LIVE</span>
                </div>
                {latestV2 && (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-[2rem] font-bold leading-none">{latestV2.vector_top_type || '?'}</span>
                      <div className="flex flex-col">
                        <span className="font-sans text-base font-semibold">{(latestV2.vector_confidence * 100).toFixed(0)}%</span>
                        <span className="font-mono text-[0.55rem] opacity-60">v2 core</span>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-mono text-[0.6rem] opacity-60">whole</div>
                        <div className="font-mono text-sm font-bold">{v2WholeType || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[0.6rem] font-mono">
                      <span className={`px-2 py-0.5 rounded ${latestV2.agreement ? 'bg-[#7A9E7E]/30 text-[#A4D4A8]' : 'bg-red-900/40 text-red-300'}`}>
                        Core {latestV2.agreement ? '✓' : '✗'}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${latestV2.center_agreement ? 'bg-[#7A9E7E]/30 text-[#A4D4A8]' : 'bg-red-900/40 text-red-300'}`}>
                        Center {latestV2.center_agreement ? '✓' : '✗'}
                      </span>
                      {tiebreakerFirings > 0 && (
                        <span className="px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300">
                          ⚠ {tiebreakerFirings} tiebreaker{tiebreakerFirings > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-exchange v1 vs v2 history */}
                <details className="text-[0.65rem] font-mono">
                  <summary className="cursor-pointer opacity-70 hover:opacity-100">
                    Shadow log — {shadowByExchange.size} exchange{shadowByExchange.size === 1 ? '' : 's'}
                  </summary>
                  <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {[...shadowByExchange.entries()].sort((a, b) => a[0] - b[0]).map(([ex, slot]) => {
                      const tb = slot.v2?.phase?.match(/tiebreaker=([0-9-]+)/)?.[1];
                      return (
                        <div key={ex} className="border-t border-white/10 pt-1">
                          <div className="flex justify-between">
                            <span className="opacity-60">Ex {ex}</span>
                            {tb && <span className="text-yellow-300">tiebreak {tb}</span>}
                          </div>
                          {slot.v1 && (
                            <div className="opacity-70">v1: T{slot.v1.vector_top_type} {(slot.v1.vector_confidence * 100).toFixed(0)}% {slot.v1.agreement ? '✓' : '✗'}</div>
                          )}
                          {slot.v2 && (
                            <div className="text-[#A4D4A8]">v2: T{slot.v2.vector_top_type} {(slot.v2.vector_confidence * 100).toFixed(0)}% {slot.v2.agreement ? '✓' : '✗'}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            )}

            {/* ═══ VISUAL DASHBOARD ═══ */}
            {hypothesis && (() => {
              const conf = Math.round((hypothesis.confidence ?? 0) * 100);
              const scores = Object.entries(hypothesis.type_scores ?? {})
                .map(([t, s]) => ({ type: Number(t), score: s as number }))
                .sort((a, b) => b.score - a.score);
              const strategy = (selectedInternal?.strategy ?? {}) as Record<string, string>;
              const phase = strategy.assessment_phase || '—';
              const phaseLabels: Record<string, string> = {
                '1=center_id': 'Center ID',
                '2=within_center': 'Narrowing',
                '3=refinement': 'Refinement',
                '4=differentiation': 'Differentiation',
                '5=convergence': 'Convergence',
              };
              const phaseLabel = phaseLabels[phase] || phase;
              const needsDiff = (hypothesis.needs_differentiation as number[]) || [];

              return (
              <div className="space-y-3">
                {/* Confidence + Leading Type — hero display */}
                <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-70">Leading Type</span>
                    <span className="font-mono text-[0.6rem] uppercase tracking-widest opacity-70">{phaseLabel}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-[3rem] font-bold leading-none">{hypothesis.leading_type || '?'}</span>
                    <div className="flex flex-col">
                      <span className="font-sans text-2xl font-bold">{conf}%</span>
                      <span className="font-sans text-[0.65rem] opacity-70">confidence</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${conf}%` }} />
                  </div>
                </div>

                {/* Type Scores — visual bar chart */}
                <div className="bg-[#FAF8F5] rounded-xl p-3">
                  <div className="font-mono text-[0.6rem] uppercase tracking-widest text-[#9B9590] mb-2">Type Scores</div>
                  <div className="space-y-1.5">
                    {scores.map(({ type, score }, i) => {
                      const pct = Math.min(100, Math.round(score * 100));
                      const isLead = type === hypothesis.leading_type;
                      const isDiff = needsDiff.includes(type);
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className={`font-mono text-xs w-5 text-right ${isLead ? 'font-bold text-[#2563EB]' : isDiff ? 'text-[#DC2626]' : 'text-[#9B9590]'}`}>{type}</span>
                          <div className="flex-1 h-3 bg-[#E8E4E0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isLead ? '#2563EB' : isDiff ? '#F59E0B' : i < 3 ? '#93C5FD' : '#D0CAC4',
                              }}
                            />
                          </div>
                          <span className={`font-mono text-[0.65rem] w-8 text-right ${isLead ? 'font-bold text-[#2563EB]' : 'text-[#9B9590]'}`}>{pct}</span>
                        </div>
                      );
                    })}
                  </div>
                  {needsDiff.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span className="font-mono text-[0.55rem] text-[#9B9590]">Needs differentiation</span>
                    </div>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex gap-2 flex-wrap">
                  <span className="font-mono text-[0.6rem] bg-[#FAF8F5] text-[#9B9590] px-2 py-1 rounded">Stage {sessionState?.currentStage ?? '?'}</span>
                  <span className="font-mono text-[0.6rem] bg-[#FAF8F5] text-[#9B9590] px-2 py-1 rounded">Q{sessionState?.exchangeCount ?? 0}</span>
                  <span className="font-mono text-[0.6rem] bg-[#FAF8F5] text-[#9B9590] px-2 py-1 rounded">{sessionState?.lastQuestionFormat || '—'}</span>
                </div>

                {/* Rationale */}
                {strategy.next_question_rationale && (
                  <div className="bg-white rounded-xl p-3 border border-[#E8E4E0]">
                    <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[#9B9590] block mb-1">Question Rationale</span>
                    <p className="font-sans text-[0.7rem] text-[#2C2C2C] leading-relaxed">{strategy.next_question_rationale}</p>
                  </div>
                )}
              </div>
              );
            })()}

            {/* INTERNAL JSON */}
            {selectedInternal && (
              <details open className="group">
                <summary className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] cursor-pointer hover:text-[#2563EB]">
                  INTERNAL Block
                </summary>
                <pre className="mt-2 text-[0.65rem] font-mono text-[#2C2C2C] bg-[#FAF8F5] rounded-xl p-3 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedInternal, null, 2)}
                </pre>
              </details>
            )}

            {/* Full session state */}
            {sessionState && (
              <details>
                <summary className="font-mono text-[0.65rem] uppercase tracking-widest text-[#9B9590] cursor-pointer hover:text-[#2563EB]">
                  Full Session State
                </summary>
                <pre className="mt-2 text-[0.65rem] font-mono text-[#2C2C2C] bg-[#FAF8F5] rounded-xl p-3 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(sessionState, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Diagnostic copy modal */}
      {showDiagnostic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-6 max-w-[800px] w-full max-h-[85vh] flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-semibold text-[#2C2C2C]">Diagnostic Export</h3>
              <button onClick={() => setShowDiagnostic(false)} className="text-[#9B9590] hover:text-[#2C2C2C]">&#10005;</button>
            </div>
            <p className="font-sans text-xs text-[#9B9590]">
              Copy this entire block when reporting an issue. It contains the session id,
              every exchange, the v1+v2 shadow log per turn, current hypothesis, and full
              session state.
            </p>
            <textarea
              readOnly
              value={buildDiagnostic()}
              className="w-full flex-1 font-mono text-[0.7rem] p-3 rounded-xl border border-[#E8E4E0] bg-[#FAF8F5] resize-none focus:border-[#2563EB] focus:outline-none min-h-[400px]"
              onClick={(e) => e.currentTarget.select()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildDiagnostic()).catch(() => {});
                }}
                className="font-sans text-sm bg-[#2563EB] text-white px-4 py-2 rounded-lg hover:bg-[#1D4ED8]"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowDiagnostic(false)}
                className="font-sans text-sm px-4 py-2 rounded-lg border border-[#E8E4E0] hover:bg-[#FAF8F5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State editor modal */}
      {showStateEditor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-6 max-w-[600px] w-full max-h-[80vh] flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-semibold text-[#2C2C2C]">Edit Session State</h3>
              <button onClick={() => setShowStateEditor(false)} className="text-[#9B9590] hover:text-[#2C2C2C]">&#10005;</button>
            </div>
            <p className="font-sans text-xs text-[#9B9590]">
              Paste a JSON patch (Partial&lt;SessionData&gt;). E.g. to change leading type:
              {' {"internalState": {"hypothesis": {"leading_type": 4, "confidence": 0.8}}}'}
            </p>
            <textarea
              value={stateJson}
              onChange={(e) => setStateJson(e.target.value)}
              rows={15}
              className="w-full font-mono text-xs p-3 rounded-xl border border-[#E8E4E0] bg-[#FAF8F5] resize-none focus:border-[#2563EB] focus:outline-none"
            />
            {stateError && <p className="font-sans text-xs text-red-600">{stateError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowStateEditor(false)}
                className="font-sans text-sm px-4 py-2 rounded-lg border border-[#E8E4E0] hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSetState}
                className="font-sans text-sm bg-[#2563EB] text-white px-4 py-2 rounded-lg hover:bg-[#1D4ED8]"
              >
                Apply Patch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
