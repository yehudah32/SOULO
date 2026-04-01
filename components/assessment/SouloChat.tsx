'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import SouloOrb from '@/components/ui/soulo-orb';
import MarkdownText from '@/components/ui/MarkdownText';

interface SouloChatProps {
  results: Record<string, unknown>;
  sessionId: string;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  embedded?: boolean;
  darkMode?: boolean;
  sharedMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  startCollapsed?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SECTION_QUESTIONS: Record<string, string[]> = {
  'Type Scores': [
    'Why did I score highest on this type?',
    'What does my second-highest type tell me?',
    'How stable are these scores over time?',
  ],
  'Center Activation': [
    'What does my dominant center mean for daily life?',
    'How can I develop my least active center?',
    'Why is one center so much more active than the others?',
  ],
  'Instinctual Variants': [
    'How does my dominant instinct affect my relationships?',
    'What would developing my weakest instinct look like?',
    'How do SP, SO, and SX interact with my core type?',
  ],
  'Defiant Spirit Patterns': [
    'What triggers my react pattern most?',
    'How do I practice the respond pathway?',
    'Give me a real-world example of react vs respond for my type.',
  ],
  'Lines of Movement': [
    'What does my stress line look like day-to-day?',
    'How do I access my release line more often?',
    'Why do I feel stuck on my stress line?',
  ],
  'OYN Dimensions': [
    'Which dimension should I work on first?',
    'How do these six dimensions connect?',
    'What does growth look like in my weakest dimension?',
  ],
  'General': [
    'What should I focus on for growth right now?',
    'What does "defy your number" mean for me specifically?',
    'How does my wing change how my core type shows up?',
  ],
};

export default function SouloChat({ results, sessionId, activeSection, embedded = false, darkMode = false, sharedMessages, onMessagesChange, startCollapsed }: SouloChatProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messages = sharedMessages ?? localMessages;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const setMessages = useCallback((msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    const newMsgs = typeof msgs === 'function' ? msgs(messagesRef.current) : msgs;
    if (onMessagesChange) onMessagesChange(newMsgs);
    else setLocalMessages(newMsgs);
  }, [onMessagesChange]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection || 'General');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastFreshResponseIdx = useRef<number>(-1);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef</* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeSection && activeSection !== currentSection) {
      setCurrentSection(activeSection);
      // Auto-open when a section is clicked (don't clear messages — preserve chat history)
      if (activeSection !== 'General') {
        setIsOpen(true);
      }
    }
  }, [activeSection, currentSection]);

  // Collapse when told to (e.g., overview page)
  useEffect(() => {
    if (startCollapsed && !embedded) setIsOpen(false);
  }, [startCollapsed, embedded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Voice-to-text
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).SpeechRecognition || (window as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser.'); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '60px';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/results/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: msg },
          ],
          context: {
            coreType: results.leading_type || results.core_type || 0,
            typeName: results.type_name || results.core_type_name || '',
            wing: results.wing || '',
            tritype: results.tritype || '',
            variant: results.instinctual_variant || '',
            section: currentSection,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const next = [...prev, { role: 'assistant' as const, content: data.response || 'I couldn\'t process that.' }];
          lastFreshResponseIdx.current = next.length - 1;
          return next;
        });
      } else {
        setMessages((prev) => {
          const next = [...prev, { role: 'assistant' as const, content: 'I\'m having a moment — the system is busy. Give it a few seconds and try again.' }];
          lastFreshResponseIdx.current = next.length - 1;
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev, { role: 'assistant' as const, content: 'Connection error. Try again.' }];
        lastFreshResponseIdx.current = next.length - 1;
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, results, currentSection]);

  const questions = SECTION_QUESTIONS[currentSection] || SECTION_QUESTIONS.General;

  // Floating orb (collapsed)
  // Rotating invitations in Baruch's voice
  const INVITATIONS = [
    'How does your react pattern show up at work?',
    'What happens when you\u2019re under pressure?',
    'Do you know your release line?',
    'Which center runs the show for you?',
    'What\u2019s your wing doing to your relationships?',
    'Ever notice what triggers your survival strategy?',
    'How does your variant affect how you love?',
    'What does your tritype say about your blind spots?',
    'Where does your energy go when you\u2019re stressed?',
    'What would responding look like instead of reacting?',
    'Which OYN dimension needs the most work?',
    'How do you show up differently in each center?',
    'What\u2019s the difference between your type and your wing?',
    'Why does your lowest-scoring type matter?',
  ];

  const [invitationIdx, setInvitationIdx] = useState(0);

  useEffect(() => {
    if (isOpen) return;
    const timer = setInterval(() => {
      setInvitationIdx((i) => (i + 1) % INVITATIONS.length);
    }, 4000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen && !embedded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <style>{`
          @keyframes soulo-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes invite-fade {
            0% { opacity: 0; transform: translateY(4px); }
            12% { opacity: 1; transform: translateY(0); }
            88% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-4px); }
          }
        `}</style>

        {/* Invitation text — separate from orb so orb never re-renders */}
        <div className="absolute -top-10 right-0 pointer-events-none">
          <span
            key={invitationIdx}
            className="pointer-events-auto cursor-pointer whitespace-nowrap font-serif italic text-[0.75rem] text-[#4B5563] bg-white px-3 py-1.5 rounded-xl shadow-md border border-[#E8E4E0]"
            style={{ animation: 'invite-fade 4s ease-in-out forwards' }}
            onClick={() => setIsOpen(true)}
          >
            {INVITATIONS[invitationIdx]}
          </span>
        </div>

        {/* Orb — stable, never re-renders */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Chat with Soulo"
          style={{ animation: 'soulo-float 3s ease-in-out infinite' }}
        >
          <SouloOrb size={60} />
        </button>
      </div>
    );
  }

  // Chat panel (expanded)
  const dk = darkMode && embedded;
  return (
    <div className={
      dk ? "w-full flex flex-col overflow-hidden min-h-[450px]"
      : embedded ? "w-full bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#E8E4E0] flex flex-col overflow-hidden min-h-[500px]"
      : "fixed bottom-6 right-6 z-50 w-[400px] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-[#E8E4E0] flex flex-col overflow-hidden"
    }>
      {/* Header */}
      {!dk && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E4E0] bg-gradient-to-r from-[#FAF8F5] to-white">
          <div className="flex items-center gap-3">
            <SouloOrb size={32} />
            <div>
              <p className="font-serif text-sm font-semibold text-[#2C2C2C]">Ask Soulo</p>
              {currentSection !== 'General' && (
                <p className="font-sans text-[0.6rem] text-[#2563EB]">{currentSection}</p>
              )}
            </div>
          </div>
          {!embedded && <button onClick={() => setIsOpen(false)} className="text-[#9B9590] hover:text-[#2C2C2C] text-lg px-2">&#10005;</button>}
        </div>
      )}

      {/* Suggested questions — show when no messages */}
      {messages.length === 0 && (
        <div className={dk ? "px-4 py-4" : "px-4 py-3 border-b border-[#E8E4E0]"} style={dk ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : undefined}>
          <p className={`font-sans text-[0.6rem] uppercase tracking-widest mb-2 ${dk ? 'text-white/30' : 'text-[#9B9590]'}`}>
            {currentSection !== 'General' ? `Questions about ${currentSection}` : 'Ask about your results'}
          </p>
          <div className="flex flex-col gap-1">
            {questions.map((q, i) => (
              <button key={i} onClick={() => handleSend(q)}
                className={dk
                  ? "text-left font-sans text-[0.8rem] text-white/60 hover:text-white/90 hover:bg-white/[0.05] rounded-xl px-3 py-2.5 transition-colors"
                  : "text-left font-sans text-[0.8rem] text-[#2563EB] hover:bg-[#EFF6FF] rounded-xl px-3 py-2.5 transition-colors border border-transparent hover:border-[#DBEAFE]"
                } style={dk ? { border: '1px solid transparent' } : undefined}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: messages.length > 0 ? 200 : 40 }}>
        {messages.map((msg, i) => {
          const isFreshResponse = msg.role === 'assistant' && i === lastFreshResponseIdx.current;
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mr-2 mt-1"><SouloOrb size={20} /></div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? dk ? 'text-white' : 'bg-[#2563EB] text-white'
                  : dk ? 'text-white/90' : 'bg-[#FAF8F5] text-[#2C2C2C]'
              }`} style={msg.role === 'user' && dk ? { background: 'linear-gradient(135deg, #2563EB, #7C3AED)' } : msg.role === 'assistant' && dk ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}>
                {isFreshResponse ? (
                  <TypewriterMsg text={msg.content} dk={dk} />
                ) : (
                  <p className="font-sans text-[0.85rem] leading-relaxed"><MarkdownText>{msg.content}</MarkdownText></p>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 mr-2 mt-1"><SouloOrb size={20} /></div>
            <div className={dk ? "rounded-2xl px-4 py-2.5" : "bg-[#FAF8F5] rounded-2xl px-4 py-2.5"} style={dk ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
              <div className="flex gap-1">
                <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms] ${dk ? 'bg-white/60' : 'bg-[#9B9590]'}`} />
                <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms] ${dk ? 'bg-white/60' : 'bg-[#9B9590]'}`} />
                <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms] ${dk ? 'bg-white/60' : 'bg-[#9B9590]'}`} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input — textarea for dark mode, regular input otherwise */}
      <div className={dk
        ? "px-4 py-3 flex items-end gap-2"
        : "border-t border-[#E8E4E0] px-3 py-2.5 flex gap-2 bg-[#FAFAFA]"
      } style={dk ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : undefined}>
        {dk ? (
          <>
            <textarea
              ref={textareaRef}
              data-soulo-input
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextareaHeight(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); if (textareaRef.current) textareaRef.current.style.height = '60px'; } }}
              placeholder="Ask anything about your results..."
              className="flex-1 font-sans text-sm px-4 py-3 rounded-xl bg-white/[0.04] text-white/90 placeholder-white/25 border border-white/[0.08] focus:border-white/20 focus:outline-none resize-none transition-colors"
              style={{ minHeight: 60, maxHeight: 200 }}
            />
            {/* Voice button */}
            <button onClick={toggleVoice} className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${isListening ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.05]'}`} title={isListening ? 'Stop listening' : 'Voice input'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            </button>
            {/* Send button */}
            <button onClick={() => { handleSend(); if (textareaRef.current) textareaRef.current.style.height = '60px'; }}
              disabled={isLoading || !input.trim()}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all flex-shrink-0 ${input.trim() ? 'bg-white text-[#0F172A] shadow-lg shadow-white/10' : 'bg-white/[0.05] text-white/30'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              Send
            </button>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              data-soulo-input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about your results..."
              className="flex-1 font-sans text-sm px-4 py-2 rounded-xl border border-[#E8E4E0] focus:border-[#2563EB] focus:outline-none"
            />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
              className="font-sans text-sm bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#1D4ED8] disabled:opacity-40">
              Ask
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Typewriter effect for the latest assistant message
function TypewriterMsg({ text, dk }: { text: string; dk: boolean }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed('');
    setDone(false);
    const interval = setInterval(() => {
      idxRef.current++;
      if (idxRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, idxRef.current));
      }
    }, 18);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <p className="font-sans text-[0.85rem] leading-relaxed">
      {done ? <MarkdownText>{text}</MarkdownText> : (
        <>
          {displayed}
          <span className={`inline-block w-[2px] h-[0.9em] ml-0.5 align-middle animate-pulse ${dk ? 'bg-white/50' : 'bg-[#2563EB]'}`} />
        </>
      )}
    </p>
  );
}
