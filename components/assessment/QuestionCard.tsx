'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MarkdownText from '@/components/ui/MarkdownText';

type QuestionFormat =
  | 'forced_choice'
  | 'agree_disagree'
  | 'scale'
  | 'frequency'
  | 'behavioral_anchor'
  | 'paragraph_select'
  | 'scenario'
  | 'open'
  | 'mirror';

interface AnswerOption {
  label: string;
  text: string;
}

interface QuestionCardProps {
  questionText: string;
  format: QuestionFormat;
  answerOptions?: AnswerOption[];
  onAnswer: (answer: string) => void;
  isScenario?: boolean;
  existingAnswer?: string;
  contextNote?: string;
  currentStage?: number;
  scaleRange?: { min: number; max: number } | null;
  visible?: boolean;
  isInitMessage?: boolean;
  questionNumber?: number;
}

export default function QuestionCard({
  questionText,
  format,
  answerOptions,
  onAnswer,
  isScenario,
  existingAnswer,
  contextNote,
  currentStage,
  scaleRange,
  visible = true,
  isInitMessage,
  questionNumber,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string>(existingAnswer ?? '');
  const [scaleValue, setScaleValue] = useState<number>(
    existingAnswer ? Number(existingAnswer) : Math.ceil(((scaleRange?.min ?? 1) + (scaleRange?.max ?? 10)) / 2)
  );
  const [hasInteracted, setHasInteracted] = useState(!!existingAnswer);
  const [textValue, setTextValue] = useState(existingAnswer ?? '');
  const [thinWarning, setThinWarning] = useState(false);
  const [isHoldingSpace, setIsHoldingSpace] = useState(false);

  // Keyboard Flow State & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (format === 'open' || isHoldingSpace || isInitMessage || !visible) return;
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;

      if (e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (format === 'agree_disagree' && index < 5) {
          const vals = ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'];
          setSelected(vals[index]);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
        } else if (answerOptions && answerOptions[index]) {
          setSelected(answerOptions[index].text);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
        }
      }
      if (e.key === 'Enter') {
        if (selected) {
           onAnswer(selected);
           if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
        } else if (format === 'mirror') {
           onAnswer('[Mirror Moment Acknowledged]');
           if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [format, answerOptions, selected, isHoldingSpace, isInitMessage, visible, onAnswer]);

  // Reset internal state when question changes
  const prevQuestionRef = useRef(questionText);
  useEffect(() => {
    if (questionText !== prevQuestionRef.current) {
      prevQuestionRef.current = questionText;
      setIsHoldingSpace(false);
      setSelected(existingAnswer ?? '');
      setScaleValue(existingAnswer ? Number(existingAnswer) : Math.ceil(((scaleRange?.min ?? 1) + (scaleRange?.max ?? 10)) / 2));
      setHasInteracted(!!existingAnswer);
      setTextValue(existingAnswer ?? '');
      setThinWarning(false);
    }
  }, [questionText, existingAnswer, scaleRange]);

  // Speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechAPI) setSpeechSupported(true);
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechAPI) return;

    const rec = new SpeechAPI();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    finalTranscriptRef.current = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const text = final || interim;
      setTextValue(text);
      if (final) finalTranscriptRef.current = final;
    };

    rec.onend = () => {
      setIsRecording(false);
      const transcript = finalTranscriptRef.current.trim() || textValue.trim();
      if (transcript) setTextValue(transcript);
      finalTranscriptRef.current = '';
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, [isRecording, textValue]);

  const handleSubmitText = () => {
    const val = textValue.trim();
    // Advisory thin-answer check — never blocks submission
    if (val.split(/\s+/).length < 5 && !thinWarning) {
      setThinWarning(true);
      return;
    }
    setThinWarning(false);
    onAnswer(val || '(no response)');
  };

  const isOpenFormat =
    format === 'open' || format === 'behavioral_anchor' || format === 'scenario';
  const isStructured = !isOpenFormat;

  const STAGE_NAMES: Record<number, string> = {
    1: 'Opening',
    2: 'Getting to Know You',
    3: 'Going Deeper',
    4: 'Understanding Your Patterns',
    5: 'The Core of It',
    6: 'Seeing Clearly',
    7: 'Coming Together',
  };

  return (
    <div
      className="rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] max-w-[600px] w-full overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Enneagram peek header with question number */}
      <div
        className="w-full flex items-center justify-center"
        style={{
          height: 48,
          backgroundImage: 'url(/enneagramsymbol.png)',
          backgroundSize: '140%',
          backgroundPosition: 'center 30%',
        }}
      >
        {questionNumber && questionNumber > 0 && (
          <span className="font-serif font-bold text-[1.1rem] text-[#2C2C2C] drop-shadow-sm" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.8)' }}>
            Question {questionNumber}
          </span>
        )}
      </div>

      {/* Card content */}
      <div className="bg-white p-7 flex flex-col gap-5">

      {/* Format category label — Brand Orange tags */}
      {(() => {
        if (isInitMessage) return null;
        const labels: Record<string, string> = {
          agree_disagree: 'Agree or Disagree',
          forced_choice: 'Choose One',
          frequency: 'Frequency',
          scale: 'Rate on a Scale',
          paragraph_select: 'Select One',
          scenario: 'Scenario',
          behavioral_anchor: 'Scenario',
          open: 'Open Response',
        };
        const text = labels[format];
        if (!text) return null;
        return (
          <div className="flex">
            <span
              className="font-sans text-[0.65rem] uppercase tracking-[0.1em] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap bg-[#FDF3F0] text-[#C4714A] border border-[#EAC4B8] shadow-sm"
            >
              {text}
            </span>
          </div>
        );
      })()}

      {/* Context note (setup text for scenarios, paragraph_select, etc.) */}
      {contextNote && (
        <p className="font-sans italic text-[0.88rem] text-[#9B9590] leading-relaxed">
          {contextNote}
        </p>
      )}

      {/* Question text — bold and prominent, preserving newlines */}
      <div className="font-serif font-semibold text-[1.25rem] text-[#2C2C2C] leading-[1.6] whitespace-pre-wrap">
        <MarkdownText>{questionText}</MarkdownText>
      </div>

      {/* ── Format-specific input ── */}
      
      {/* Active Options (Hidden during Hold Space) */}
      <div
        className={`flex flex-col gap-4 mt-2 transition-all duration-500 ease-in-out ${
          isHoldingSpace ? 'opacity-0 h-0 overflow-hidden mt-0 pointer-events-none' : 'opacity-100 h-auto'
        }`}
      >

      {/* agree_disagree: 5 discrete labeled buttons */}
      {format === 'agree_disagree' && (
        <div className="flex flex-col gap-2.5">
          {[
            { value: 'Strongly agree', label: 'Strongly agree' },
            { value: 'Agree', label: 'Agree' },
            { value: 'Neutral', label: 'Neutral' },
            { value: 'Disagree', label: 'Disagree' },
            { value: 'Strongly disagree', label: 'Strongly disagree' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSelected(opt.value);
                onAnswer(opt.value);
              }}
              className={`w-full text-left font-sans text-[0.9rem] rounded-xl px-5 py-3 border-2 transition-all duration-150 ${
                selected === opt.value
                  ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'border-[#E8E4E0] text-[#2C2C2C] hover:border-[#2563EB]/50 hover:bg-[#FAF8F5]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* forced_choice — REQUIRES at least 2 answerOptions. The server's
          getResponseParts() either rescues inline options or downgrades the
          format to 'open' before sending, so this branch should never run
          with empty options. If it does (legacy session, stale cache, etc.),
          show the question without any buttons rather than fabricating Yes/No. */}
      {format === 'forced_choice' && (!answerOptions || answerOptions.length < 2) && (
        <div className="font-sans text-sm text-[#9B9590] italic px-1">
          (No answer choices were generated for this question — please refresh.)
        </div>
      )}
      {format === 'forced_choice' && answerOptions && answerOptions.length >= 2 && (
        <div className="flex flex-col gap-2.5">
          {(answerOptions.map((o) => ({ value: o.text, label: o.label ? `${o.label}. ${o.text}` : o.text }))
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSelected(opt.value);
                onAnswer(opt.value);
              }}
              className={`w-full text-left font-sans text-[0.9rem] rounded-xl px-5 py-3 border-2 transition-all duration-150 ${
                selected === opt.value
                  ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'border-[#E8E4E0] text-[#2C2C2C] hover:border-[#2563EB]/50 hover:bg-[#FAF8F5]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* frequency: 4 pill buttons */}
      {format === 'frequency' && (
        <div className="flex gap-2 flex-wrap">
          {['Never', 'Sometimes', 'Often', 'Always'].map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setSelected(opt);
                onAnswer(opt);
              }}
              className={`font-sans text-[0.88rem] rounded-full px-5 py-2 border-2 transition-all duration-150 ${
                selected === opt
                  ? 'border-[#2563EB] bg-[#2563EB] text-white font-semibold'
                  : 'border-[#E8E4E0] text-[#2C2C2C] hover:border-[#2563EB]/50 hover:bg-[#FAF8F5]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* scale: range input, requires interaction before confirm */}
      {format === 'scale' && (() => {
        const sMin = scaleRange?.min ?? 1;
        const sMax = scaleRange?.max ?? 10;
        return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[0.75rem] text-[#9B9590]">{sMin} — Not at all</span>
            <span className="font-sans text-[1rem] font-semibold text-[#2563EB]">{scaleValue}</span>
            <span className="font-sans text-[0.75rem] text-[#9B9590]">{sMax} — Completely</span>
          </div>
          <input
            type="range"
            min={sMin}
            max={sMax}
            value={scaleValue}
            onChange={(e) => {
              setScaleValue(Number(e.target.value));
              setHasInteracted(true);
            }}
            className="w-full accent-[#2563EB] cursor-pointer"
          />
          <button
            onClick={() => {
              if (!hasInteracted) return;
              onAnswer(String(scaleValue));
            }}
            disabled={!hasInteracted}
            className="w-full font-sans text-[0.9rem] rounded-xl px-5 py-3 bg-[#2563EB] text-white font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors"
          >
            Continue →
          </button>
        </div>
        );
      })()}

      {/* paragraph_select: vertical card stack with letter labels */}
      {format === 'paragraph_select' && answerOptions && answerOptions.length >= 2 && (
        <div className="flex flex-col gap-2.5">
          {answerOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setSelected(opt.text);
                onAnswer(`${opt.label}. ${opt.text}`);
              }}
              className={`w-full text-left font-sans text-[0.88rem] rounded-xl px-5 py-4 border-2 transition-all duration-150 ${
                selected === opt.text
                  ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                  : 'border-[#E8E4E0] text-[#2C2C2C] hover:border-[#2563EB]/40 hover:-translate-y-0.5 hover:shadow-sm'
              }`}
              style={{ transition: 'border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s' }}
            >
              <span className="font-semibold mr-2 text-[#9B9590]">{opt.label}.</span>
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {/* open / behavioral_anchor / scenario: textarea + mic */}
      {isOpenFormat && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <textarea
              ref={textAreaRef}
              value={textValue}
              onChange={(e) => {
                setTextValue(e.target.value);
                setThinWarning(false);
                // auto-resize
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              placeholder={isRecording ? 'Listening…' : 'Share your thoughts…'}
              rows={3}
              className="w-full resize-none rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-[0.9rem] text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              style={{ minHeight: '80px', maxHeight: '200px' }}
            />
            {speechSupported && (
              <button
                onClick={toggleRecording}
                className={`absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-[#E05555]' : 'bg-white border border-[#2563EB] hover:bg-[#EFF6FF]'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1="9" y1="23" x2="15" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="2" width="6" height="12" rx="3" fill="#2563EB" opacity="0.2" stroke="#2563EB" strokeWidth="1.5" />
                    <path d="M5 10a7 7 0 0 0 14 0" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="12" y1="19" x2="12" y2="23" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="9" y1="23" x2="15" y2="23" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {thinWarning && (
            <p className="font-sans text-[0.8rem] text-[#1E3A8A] bg-[#EFF6FF] rounded-lg px-4 py-2">
              A little more detail helps Soulo understand you better — but you can share as-is.
            </p>
          )}
          <button
            onClick={handleSubmitText}
            disabled={!textValue.trim()}
            className="w-full font-sans text-[0.9rem] rounded-xl px-5 py-3 bg-[#2563EB] text-white font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors"
          >
            Share →
          </button>
        </div>
      )}

      </div>

      {/* Hold Space View */}
      {isHoldingSpace && (
        <div className="flex flex-col items-center justify-center py-6 gap-6 animate-fade-in text-center mt-2">
          <p className="font-serif text-[#736C67] text-[1.1rem] leading-relaxed italic">
            "Take your time. Soulo is holding space for you."
          </p>
          <button
            onClick={() => setIsHoldingSpace(false)}
            className="px-6 py-2.5 rounded-full border border-[#E8E4E0] font-sans text-sm text-[#6B6B6B] hover:bg-[#FAF8F5] hover:text-[#2C2C2C] transition-all"
          >
            I'm ready to answer
          </button>
        </div>
      )}

      {/* Trigger Button (Only show on actual questions, not init message) */}
      {!isHoldingSpace && !isInitMessage && format !== 'open' && (
        <button
          onClick={() => setIsHoldingSpace(true)}
          className="mt-4 text-center text-[#9B9590] text-[0.75rem] font-sans hover:text-[#2C2C2C] underline underline-offset-[3px] decoration-[#E8E4E0] hover:decoration-[#2C2C2C] transition-all duration-300 w-fit self-center pb-2"
        >
          I need a moment to think
        </button>
      )}

      {/* Confirm button for structured formats that need it */}
      {isStructured && format !== 'agree_disagree' && format !== 'forced_choice' &&
        format !== 'frequency' && format !== 'scale' && format !== 'paragraph_select' && format !== 'mirror' && (
        <button
          onClick={() => selected && onAnswer(selected)}
          disabled={!selected}
          className="w-full font-sans text-[0.9rem] rounded-xl px-5 py-3 bg-[#2563EB] text-white font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors"
        >
          Continue →
        </button>
      )}

      {/* Mirror Moment Intermission Continue Button */}
      {format === 'mirror' && !isHoldingSpace && (
        <button
          onClick={() => {
            onAnswer('[Mirror Moment Acknowledged]');
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
          }}
          className="w-full font-sans text-[0.95rem] rounded-xl px-5 py-3.5 bg-white border border-[#E8E4E0] text-[#2C2C2C] font-semibold hover:bg-[#FAF8F5] transition-all shadow-sm mt-4 hover:-translate-y-0.5"
        >
          Explore this further →
        </button>
      )}
      </div>
    </div>
  );
}
