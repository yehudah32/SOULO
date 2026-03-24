'use client';

import { useState, useRef, useEffect } from 'react';

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      };
      setMessages((prev) => [...prev, msg]);
      setSelectedInternal(data.internal);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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

  async function handleJumpToStage(targetStage: number) {
    if (!sessionId) return;
    const exchangeMap: Record<number, number> = { 1: 0, 2: 3, 3: 6, 4: 9, 5: 12, 6: 14, 7: 16 };
    const patch = { exchangeCount: exchangeMap[targetStage] ?? 0, currentStage: targetStage };
    const res = await fetch('/api/admin/simulate/set-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, patch }),
    });
    const data = await res.json();
    if (!data.error) setSessionState(data.sessionState);
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
              >
                Set State
              </button>
              <select
                onChange={(e) => handleJumpToStage(Number(e.target.value))}
                value={sessionState?.currentStage ?? 1}
                className="font-sans text-xs border border-[#E8E4E0] px-2 py-1.5 rounded-lg bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                  <option key={s} value={s}>Stage {s}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {!sessionId ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <p className="font-sans text-sm text-[#9B9590] mb-4">Click &quot;New Session&quot; to start a simulated assessment.</p>
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
