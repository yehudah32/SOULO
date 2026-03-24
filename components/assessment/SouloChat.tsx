'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import SouloOrb from './SouloOrb';
import MarkdownText from '@/components/ui/MarkdownText';

interface SouloChatProps {
  results: Record<string, unknown>;
  sessionId: string;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
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

export default function SouloChat({ results, sessionId, activeSection }: SouloChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection || 'General');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeSection && activeSection !== currentSection) {
      setCurrentSection(activeSection);
      // Auto-open when a section is clicked
      if (activeSection !== 'General') {
        setIsOpen(true);
        setMessages([]);
      }
    }
  }, [activeSection, currentSection]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

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
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response || 'I couldn\'t process that.' }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }]);
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

  if (!isOpen) {
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
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-[#E8E4E0] flex flex-col overflow-hidden">
      {/* Header */}
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
        <button onClick={() => setIsOpen(false)} className="text-[#9B9590] hover:text-[#2C2C2C] text-lg px-2">&#10005;</button>
      </div>

      {/* Suggested questions — show when no messages or when section changes */}
      {messages.length === 0 && (
        <div className="px-4 py-3 border-b border-[#E8E4E0]">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-[#9B9590] mb-2">
            {currentSection !== 'General' ? `Questions about ${currentSection}` : 'Ask about your results'}
          </p>
          <div className="flex flex-col gap-1">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="text-left font-sans text-[0.8rem] text-[#2563EB] hover:bg-[#EFF6FF] rounded-xl px-3 py-2.5 transition-colors border border-transparent hover:border-[#DBEAFE]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: messages.length > 0 ? 150 : 40 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 mr-2 mt-1">
                <SouloOrb size={20} />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#FAF8F5] text-[#2C2C2C]'
            }`}>
              <p className="font-sans text-[0.85rem] leading-relaxed"><MarkdownText>{msg.content}</MarkdownText></p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 mr-2 mt-1"><SouloOrb size={20} /></div>
            <div className="bg-[#FAF8F5] rounded-2xl px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B9590] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B9590] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B9590] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#E8E4E0] px-3 py-2.5 flex gap-2 bg-[#FAFAFA]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask about your results..."
          className="flex-1 font-sans text-sm px-4 py-2 rounded-xl border border-[#E8E4E0] focus:border-[#2563EB] focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="font-sans text-sm bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#1D4ED8] disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
