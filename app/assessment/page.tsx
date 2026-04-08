'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SouloAvatar, { type ActiveCenter } from '@/components/assessment/SouloAvatar';
import ProgressPanel from '@/components/assessment/ProgressPanel';
import QuestionCard from '@/components/assessment/QuestionCard';
import EnneagramLoader from '@/components/assessment/EnneagramLoader';
import EnneagramSymbol from '@/components/assessment/EnneagramSymbol';
import SouloOrb from '@/components/ui/soulo-orb';
import LoadingProgress from '@/components/assessment/LoadingProgress';
import WelcomeCard from '@/components/assessment/WelcomeCard';
import MarkdownText from '@/components/ui/MarkdownText';
import { TypingAnimation } from '@/components/ui/typing-animation';
import SouloNav from '@/components/ui/soulo-nav';

// ── Types ──

type Phase = 'welcome' | 'resuming' | 'assessing' | 'clarifying' | 'verifying' | 'revealing';

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

interface QuestionEntry {
  id: string;
  question: string;
  format: QuestionFormat;
  answerOptions?: AnswerOption[];
  isScenario?: boolean;
  answer?: string;
  isInitMessage?: boolean;
  guidanceText?: string;
  contextNote?: string;
  scaleRange?: { min: number; max: number } | null;
}

// ── Helpers (defined at file level) ──

function deriveStage(questionCount: number): number {
  if (questionCount <= 2) return 1;
  if (questionCount <= 4) return 2;
  if (questionCount <= 6) return 3;
  if (questionCount <= 8) return 4;
  if (questionCount <= 10) return 5;
  if (questionCount <= 12) return 6;
  return 7;
}

function mapCenterString(centerStr: string): ActiveCenter {
  const s = (centerStr ?? '').toLowerCase();
  if (s.includes('body') || s.includes('gut')) return 'Body';
  if (s.includes('heart') || s.includes('feeling')) return 'Heart';
  if (s.includes('head') || s.includes('thinking')) return 'Head';
  if (s.includes('multi') || s.includes('all')) return 'Multi';
  return 'Body';
}

function parseQuestionFormat(msg: string): {
  format: QuestionFormat;
  answerOptions?: AnswerOption[];
  isScenario?: boolean;
} {
  const lower = msg.toLowerCase();
  if (lower.includes('scenario')) return { format: 'scenario', isScenario: true };
  if (lower.includes('agree or disagree') || lower.includes('agree/disagree')) return { format: 'agree_disagree' };
  if (lower.includes('how often') || lower.includes('never') && lower.includes('always')) return { format: 'frequency' };
  if (lower.includes('scale') || lower.includes('rate') || lower.includes('1 to 10') || lower.includes('1-10')) return { format: 'scale' };
  if (lower.includes('which of the following') || lower.includes('option a') || lower.includes('option b')) return { format: 'paragraph_select' };
  if (lower.includes('yes or no') || lower.includes('yes/no')) return { format: 'forced_choice' };
  // Default for short questions
  if (msg.length < 120) return { format: 'forced_choice' };
  return { format: 'open' };
}

// Loading taglines — shown during the loading transition between questions.
// Plain, grounded — no negative parallelism, no aphoristic tropes.
const LOADING_TAGLINES = [
  'Listening\u2026',
  'Reading between the lines\u2026',
  'Holding what you just said\u2026',
  'Following the thread\u2026',
  'Sitting with this for a moment\u2026',
  'Looking for the pattern underneath\u2026',
  'Taking this in\u2026',
];

// ── Component ──

function AssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Phase state machine
  // Start with 'welcome' for hydration match — mount check switches to correct phase
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('welcome');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInitLoading, setIsInitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startProgress, setStartProgress] = useState(0);
  const [pendingResumeSessionId, setPendingResumeSessionId] = useState<string | null>(null);
  const [resumePasskey, setResumePasskey] = useState('');
  const [resumeEmail, setResumeEmail] = useState('');

  // Assessment state
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);

  // Loading taglines
  const [loadingTagline, setLoadingTagline] = useState('');
  const lastTaglineRef = useRef(-1);

  // Avatar
  const [avatarState, setAvatarState] = useState<'idle' | 'typing' | 'listening' | 'deep'>('idle');
  const lastCenterRef = useRef<ActiveCenter>('Body');
  const [avatarCenter, setAvatarCenter] = useState<ActiveCenter>('Body');

  // Stage tracking
  const [currentStage, setCurrentStage] = useState(1);
  const [stageQuestionCount, setStageQuestionCount] = useState(0);
  const prevStageRef = useRef(1);
  const didResumeRef = useRef(false);

  // Verifying phase
  const [themes, setThemes] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackBox, setShowFeedbackBox] = useState(false);

  // State variables for Focus and Inactivity
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showInactivityOverlay, setShowInactivityOverlay] = useState(false);
  const inactivityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  // Thin answer ref
  const thinAnswerPromptedRef = useRef(false);

  // Performance — first chunk tracking
  const hasReceivedFirstChunkRef = useRef(false);

  // Thinking display
  const [thinkingDisplay, setThinkingDisplay] = useState('');
  const prevThinkingDisplayRef = useRef('');

  // Skeleton loader
  const [showQuestionSkeleton, setShowQuestionSkeleton] = useState(false);

  // Progress saved indicator
  const [showProgressSaved, setShowProgressSaved] = useState(false);

  // Demographics
  const [showDemographics, setShowDemographics] = useState(false);
  const [demographics, setDemographics] = useState({
    ageRange: '',
    gender: '',
    ethnicity: '',
    country: '',
    religion: '',
  });

  // Inactivity interval — CRITICAL: returns cleanup to prevent leak
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase !== 'assessing') return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > 600000) { // 10 minutes
        setShowInactivityOverlay(true);
      }
    }, 15000);
    inactivityRef.current = interval;
    return () => clearInterval(interval);
  }, [phase]);

  // On mount: check sessionStorage and decide phase (runs once after hydration)
  // ONLY show 'resuming' on genuine page reload (no URL params).
  // If user navigated here from the home page (with params like userId, email, or resume),
  // those flows handle themselves — never show the resume modal.
  const mountCheckedRef = useRef(false);
  useEffect(() => {
    if (mountCheckedRef.current) return;
    mountCheckedRef.current = true;
    setMounted(true);

    const hasUrlParams = searchParams.get('userId') || searchParams.get('email') || searchParams.get('resume');
    const isFreshStart = sessionStorage.getItem('soulo_fresh_start');

    if (isFreshStart) {
      // User clicked "Begin" from home page — clear old session, start fresh
      sessionStorage.removeItem('soulo_fresh_start');
      localStorage.removeItem('soulo_active_session_id');
      localStorage.removeItem('soulo_email');
      localStorage.removeItem('soulo_user_id');
    } else if (!hasUrlParams) {
      const storedSid = localStorage.getItem('soulo_active_session_id');
      const storedEmail = localStorage.getItem('soulo_email');

      if (storedSid) {
        // Genuine page reload with active session — show resume screen
        setPendingResumeSessionId(storedSid);
        if (storedEmail) setResumeEmail(storedEmail);
        setPhase('resuming');
      }
    }
    // Otherwise phase stays 'welcome' (already set)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle resume authentication
  async function handleResume() {
    if (!pendingResumeSessionId || !resumeEmail.trim() || !resumePasskey.trim()) {
      setError('Email and save key are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify identity
      const authRes = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resumeEmail.trim(), passkey: resumePasskey.trim() }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || 'Authentication failed.');
        setIsLoading(false);
        return;
      }

      // Load progress from Supabase
      const resumeRes = await fetch(`/api/auth/resume?sessionId=${encodeURIComponent(pendingResumeSessionId)}`);
      if (resumeRes.status === 410) {
        window.location.href = `/results?sessionId=${encodeURIComponent(pendingResumeSessionId)}`;
        return;
      }
      if (!resumeRes.ok) throw new Error('Resume failed');
      const data = await resumeRes.json();

      autoStartedRef.current = true;
      setSessionId(pendingResumeSessionId);
      setUserId(authData.userId);
      setEmail(resumeEmail.trim());
      localStorage.setItem('soulo_user_id', authData.userId);

      // Rebuild questions from conversation history
      const history: Array<{ role: string; content: string }> = data.conversationHistory || [];
      const rebuilt: QuestionEntry[] = [];
      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (msg.role === 'assistant') {
          const parsed = parseQuestionFormat(msg.content);
          const entry: QuestionEntry = {
            id: crypto.randomUUID(),
            question: msg.content,
            format: parsed.format,
            answerOptions: parsed.answerOptions,
            isScenario: parsed.isScenario,
            isInitMessage: i === 0,
          };
          if (i + 1 < history.length && history[i + 1].role === 'user') {
            entry.answer = history[i + 1].content;
          }
          rebuilt.push(entry);
        }
      }

      setQuestions(rebuilt);
      setCurrentIndex(rebuilt.length - 1);
      setViewingIndex(rebuilt.length - 1);
      setCurrentStage(data.currentStage || 1);
      setStageQuestionCount(rebuilt.filter(q => !q.isInitMessage).length);
      didResumeRef.current = true;
      setPhase('assessing');
      setAvatarState('idle');
      setIsLoading(false);
    } catch {
      setError('Could not resume. Please try again.');
      setIsLoading(false);
    }
  }

  // Auto-start or resume from URL params (when coming from authenticated home page)
  // Only fires if phase is 'welcome' — never if 'resuming' (which requires passkey)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (phase === 'resuming' || !mounted) return; // Don't bypass passkey
    const paramUserId = searchParams.get('userId');
    const paramEmail = searchParams.get('email');
    const paramResume = searchParams.get('resume');

    if (paramResume && paramUserId) {
      // Resume an in-progress session
      autoStartedRef.current = true;
      setIsLoading(true);
      setStartProgress(40);
      setAvatarState('typing');
      setLoadingTagline(LOADING_TAGLINES[Math.floor(Math.random() * LOADING_TAGLINES.length)]);
      
      const progressInterval = setInterval(() => {
        setStartProgress((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
      }, 300);

      fetch(`/api/auth/resume?sessionId=${encodeURIComponent(paramResume)}`)
        .then((res) => res.json())
        .then(async (data) => {
          if (data.error) throw new Error(data.error);
          
          clearInterval(progressInterval);
          setStartProgress(100);
          
          setSessionId(paramResume);
          setUserId(paramUserId);
          if (paramEmail) setEmail(paramEmail);
          localStorage.setItem('soulo_active_session_id', paramResume);

          // Rebuild questions from conversation history
          const history: Array<{ role: string; content: string }> = data.conversationHistory || [];
          const rebuilt: QuestionEntry[] = [];
          for (let i = 0; i < history.length; i++) {
            const msg = history[i];
            if (msg.role === 'assistant') {
              const parsed = parseQuestionFormat(msg.content);
              const entry: QuestionEntry = {
                id: crypto.randomUUID(),
                question: msg.content,
                format: parsed.format,
                answerOptions: parsed.answerOptions,
                isScenario: parsed.isScenario,
                isInitMessage: i === 0,
              };
              // If next message is user, attach their answer
              if (i + 1 < history.length && history[i + 1].role === 'user') {
                entry.answer = history[i + 1].content;
              }
              rebuilt.push(entry);
            }
          }

          setQuestions(rebuilt);
          setCurrentIndex(rebuilt.length - 1);
          setViewingIndex(rebuilt.length - 1);
          setCurrentStage(data.currentStage || 1);
          
          await new Promise(r => setTimeout(r, 400));
          
          setPhase('assessing');
          setAvatarState('idle');
          setIsLoading(false);
        })
        .catch(() => {
          clearInterval(progressInterval);
          setStartProgress(0);
          // Resume failed — fall back to welcome screen
          setIsLoading(false);
          setAvatarState('idle');
        });
    } else if (paramUserId && paramEmail && !paramResume) {
      // Pre-authenticated — skip welcome, auto-start new session
      // Clear any stale session from previous assessment
      localStorage.removeItem('soulo_active_session_id');
      localStorage.removeItem('soulo_email');
      localStorage.removeItem('soulo_user_id');
      autoStartedRef.current = true;
      setEmail(paramEmail);
      setUserId(paramUserId);
      setIsLoading(true);
      setStartProgress(40);
      setAvatarState('typing');
      setLoadingTagline(LOADING_TAGLINES[Math.floor(Math.random() * LOADING_TAGLINES.length)]);
      
      const progressInterval = setInterval(() => {
        setStartProgress(p => p < 90 ? p + (90 - p) * 0.15 : p);
      }, 300);
      
      fetch('/api/chat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: paramEmail,
          userId: paramUserId,
          demographics: null,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('init failed');
          return res.json();
        })
        .then(async (data) => {
          clearInterval(progressInterval);
          setStartProgress(100);
          
          const sid = data.sessionId;
          setSessionId(sid);
          localStorage.setItem('soulo_active_session_id', sid);
          localStorage.setItem('soulo_email', paramEmail);
          const initEntry: QuestionEntry = {
            id: crypto.randomUUID(),
            question: '',
            format: 'forced_choice',
            answerOptions: [
              { label: '', text: "Yes, I'm ready" }
            ],
            isInitMessage: true,
          };
          setQuestions([initEntry]);
          setCurrentIndex(0);
          setViewingIndex(0);

          await new Promise(r => setTimeout(r, 400));

          setPhase('assessing');
          setAvatarState('idle');
          setIsLoading(false);
        })
        .catch(() => {
          clearInterval(progressInterval);
          setStartProgress(0);
          setError('We had trouble starting. Please try again.');
          setAvatarState('idle');
          setIsLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetInactivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityOverlay(false);
  }, []);

  const handleBegin = useCallback(async () => {
    if (!email.trim() || !passkey.trim()) {
      setError('Email and save key are required to begin.');
      return;
    }
    if (passkey.trim().length < 4) {
      setError('Save key must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStartProgress(10);
    setAvatarState('typing');
    // Set a loading tagline for the initial load
    const initTagIdx = Math.floor(Math.random() * LOADING_TAGLINES.length);
    lastTaglineRef.current = initTagIdx;
    setLoadingTagline(LOADING_TAGLINES[initTagIdx]);

    try {
      // Step 1: Authenticate / register user
      const authRes = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), passkey: passkey.trim(), firstName: firstName.trim(), lastName: lastName.trim() }),
      });

      const authData = await authRes.json();
      // Store first name in localStorage for personalization
      if (authData.firstName) {
        localStorage.setItem('soulo_first_name', authData.firstName);
      } else if (firstName.trim()) {
        localStorage.setItem('soulo_first_name', firstName.trim());
      }
      if (!authRes.ok) {
        setError(authData.error || 'Authentication failed.');
        setAvatarState('idle');
        setIsLoading(false);
        setStartProgress(0);
        return;
      }
      
      setStartProgress(40);
      const authenticatedUserId = authData.userId;
      setUserId(authenticatedUserId);

      const progressInterval = setInterval(() => {
        setStartProgress((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
      }, 300);

      // Step 2: Start assessment session linked to user
      const res = await fetch('/api/chat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          userId: authenticatedUserId,
          demographics: (demographics.ageRange || demographics.gender || demographics.ethnicity || demographics.country || demographics.religion) ? demographics : null,
        }),
      });

      if (!res.ok) {
        clearInterval(progressInterval);
        throw new Error('init failed');
      }
      const data = await res.json();
      
      clearInterval(progressInterval);
      setStartProgress(100);

      const sid = data.sessionId;
      setSessionId(sid);
      localStorage.setItem('soulo_active_session_id', sid);
      localStorage.setItem('soulo_email', email.trim());
      localStorage.setItem('soulo_user_id', authenticatedUserId);

      // Opening message from init is shown as the welcome card
      const initEntry: QuestionEntry = {
        id: crypto.randomUUID(),
        question: '',
        format: 'forced_choice',
        answerOptions: [
          { label: '', text: "Yes, I'm ready" }
        ],
        isInitMessage: true,
      };

      setQuestions([initEntry]);
      setCurrentIndex(0);
      setViewingIndex(0);
      
      // Delay to let the 100% progress animation finish smoothly
      await new Promise(r => setTimeout(r, 400));
      
      setPhase('assessing');
      setAvatarState('idle');
    } catch {
      setError('We had trouble starting your assessment. Please refresh the page.');
      setAvatarState('idle');
      setStartProgress(0);
    } finally {
      setIsLoading(false);
    }
  }, [email, passkey, showDemographics, demographics]);

  const sendMessage = useCallback(async (answer: string): Promise<{
    question: string;
    format: QuestionFormat;
    isComplete: boolean;
    answerOptions?: AnswerOption[];
    isScenario?: boolean;
    guidanceText?: string;
    contextNote?: string;
    progressSaved?: boolean;
    scaleRange?: { min: number; max: number } | null;
    currentStage?: number;
  } | null> => {
    if (!sessionId) return null;

    hasReceivedFirstChunkRef.current = false;
    setShowQuestionSkeleton(false);

    // Store current thinking display before clearing
    if (thinkingDisplay) {
      prevThinkingDisplayRef.current = thinkingDisplay;
    }

    // 5 second display guarantee — show skeleton if response not yet received
    const displayTimer = setTimeout(() => {
      if (!hasReceivedFirstChunkRef.current) {
        setShowQuestionSkeleton(true);
      }
    }, 5000);

    // 12 second fallback to reassure user during long generations
    const timeoutTimer = setTimeout(() => {
      if (!hasReceivedFirstChunkRef.current) {
        setThinkingDisplay('Soulo is reflecting deeply on your response. Just a few more seconds...');
      }
    }, 12000);

    // Show thinking display after 400ms (uses PREVIOUS exchange's thinking_display)
    // Only from exchange 2 onwards
    const answeredCount = questions.filter((q) => !q.isInitMessage && q.answer).length;
    let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
    if (answeredCount > 1 && prevThinkingDisplayRef.current) {
      thinkingTimer = setTimeout(() => {
        if (!hasReceivedFirstChunkRef.current) {
          setThinkingDisplay(prevThinkingDisplayRef.current);
        }
      }, 400);
    }

    const conversationMessages = questions
      .filter((q) => !q.isInitMessage)
      .flatMap((q) => {
        const msgs: Array<{ role: string; content: string }> = [
          { role: 'assistant', content: q.question },
        ];
        if (q.answer) msgs.push({ role: 'user', content: q.answer });
        return msgs;
      });

    // Add current answer
    conversationMessages.push({ role: 'user', content: answer });

    // Add init question/answer
    const initQ = questions.find((q) => q.isInitMessage);
    if (initQ) {
      conversationMessages.unshift({ role: 'assistant', content: initQ.question });
      if (initQ.answer) {
        conversationMessages.splice(1, 0, { role: 'user', content: initQ.answer });
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationMessages,
          sessionId,
          clarifying: phase === 'clarifying',
        }),
      });

      if (!res.ok) throw new Error('chat failed');

      clearTimeout(displayTimer);
      clearTimeout(timeoutTimer);
      if (thinkingTimer) clearTimeout(thinkingTimer);
      hasReceivedFirstChunkRef.current = true;
      setShowQuestionSkeleton(false);
      setThinkingDisplay('');

      const data = await res.json();

      // Store thinking display for next exchange
      if (data.thinking_display) {
        prevThinkingDisplayRef.current = data.thinking_display;
      }

      // Prefer structured response_parts from AI when available
      const rp = data.response_parts;
      if (rp?.question_text) {
        return {
          question: rp.question_text,
          guidanceText: rp.guide_text || '',
          contextNote: rp.context_note || undefined,
          format: (rp.question_format as QuestionFormat) || 'open',
          answerOptions: Array.isArray(rp.answer_options)
            ? rp.answer_options.map((opt: string, i: number) => ({
                label: String.fromCharCode(65 + i),
                text: opt,
              }))
            : undefined,
          scaleRange: rp.scale_range || null,
          isComplete: data.isComplete ?? false,
          isScenario: rp.question_format === 'scenario',
          progressSaved: data.progressSaved ?? false,
          currentStage: data.currentStage,
        };
      }

      // Fallback A: response_parts exists but question_text is empty (mirror moment or truncation)
      if (rp?.guide_text && !rp.question_text) {
        return {
          question: 'What comes to mind as you sit with that?',
          guidanceText: rp.guide_text,
          format: 'open' as QuestionFormat,
          isComplete: data.isComplete ?? false,
          progressSaved: data.progressSaved ?? false,
          currentStage: data.currentStage,
        };
      }

      // Fallback B: no response_parts at all — parse from raw text
      // CRITICAL: this path handles raw Claude output. We must NEVER let
      // reasoning content (`<thinking>` tags, "Exchange N", "candidate
      // questions", etc.) reach the user. Strip aggressively, and if the
      // result still looks like reasoning, fail to a safe placeholder.
      let msgText: string = data.message || data.response || '';

      // Strip any reasoning tag content the server might have missed
      const REASONING_TAG_RE = /<\s*(thinking|thought|thoughts|analysis|reflection|reasoning|scratchpad|chain[_-]?of[_-]?thought|cot|plan|planning|inner_monologue)\s*>[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi;
      msgText = msgText.replace(REASONING_TAG_RE, '').trim();

      // Detect reasoning leak markers — high-precision phrases that almost
      // never appear in legitimate user-facing copy
      const LEAK_MARKERS = [
        /\bexchange\s*\d+\b/i,
        /\bcandidate\s+questions?\b/i,
        /\bclosing\s+criteria\b/i,
        /\bcurrent\s+hypothesis\b/i,
        /\bdifferentiation\s+(needed|asked|question)\b/i,
        /\bdisconfirmatory\b/i,
        /\bthe\s+user\s+answered\b/i,
        /\blet\s+me\s+(think|analyze|consider|figure)/i,
        /\bi\s+need\s+to\s+(probe|differentiate|ask)/i,
        /\bstage\s+[1-7]\b.{0,40}\b(format|rule|allowed)/i,
        /\btype\s+\d\s+(at|signal|hypothesis|lean)/i,
        /\bclose_next\b|\bvariant_signals\b|\bresponse_parts\b|\binternal\s*state\b/i,
      ];
      const looksLikeLeak = LEAK_MARKERS.some((p) => p.test(msgText));

      if (looksLikeLeak || msgText.length > 600) {
        console.error('[assessment] Reasoning leak in raw message; failing to safe placeholder. First 200 chars:', msgText.slice(0, 200));
        // Surface a regenerate-style placeholder rather than rendering garbage
        return {
          question: 'Something went wrong generating that question. Please refresh to continue.',
          format: 'open' as QuestionFormat,
          isComplete: false,
          progressSaved: false,
          currentStage: data.currentStage,
        };
      }

      // Try to separate commentary from actual questions
      const allSentences = msgText.split(/(?<=[.!?])\s+/);
      const questionSentences = allSentences.filter(s => s.includes('?'));
      const commentarySentences = allSentences.filter(s => !s.includes('?'));

      if (questionSentences.length > 0) {
        return {
          question: questionSentences.join(' '),
          guidanceText: commentarySentences.length > 0 ? commentarySentences.join(' ') : '',
          format: 'open' as QuestionFormat,
          isComplete: data.isComplete ?? false,
          progressSaved: data.progressSaved ?? false,
          currentStage: data.currentStage,
        };
      }

      // Absolute last resort
      const parsed = parseQuestionFormat(msgText);
      return {
        question: msgText,
        format: parsed.format,
        isComplete: data.isComplete ?? false,
        answerOptions: parsed.answerOptions,
        isScenario: parsed.isScenario,
        progressSaved: data.progressSaved ?? false,
        currentStage: data.currentStage,
      };
    } catch {
      clearTimeout(displayTimer);
      clearTimeout(timeoutTimer);
      if (thinkingTimer) clearTimeout(thinkingTimer);
      setShowQuestionSkeleton(false);
      setThinkingDisplay('');
      return null;
    }
  }, [sessionId, questions, phase, thinkingDisplay]);

  const fetchResults = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/results/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        router.push(`/results?sessionId=${encodeURIComponent(sessionId)}`);
      }
    } catch {
      router.push('/results');
    }
  }, [sessionId, router]);

  const handleAnswer = useCallback(async (answer: string) => {
    resetInactivity();
    thinAnswerPromptedRef.current = false;

    const isInitAnswer = questions[viewingIndex]?.isInitMessage === true;

    // Update answer on the current question
    setQuestions((prev) => {
      const updated = [...prev];
      updated[viewingIndex] = { ...updated[viewingIndex], answer };
      return updated;
    });

    if (isInitAnswer) {
      // Init message → show special loading with Baruch quote (no "processing your answer")
      setCardVisible(false);
      setIsLoading(true);
      setIsInitLoading(true);
    } else {
      // Regular question → full loading transition
      setCardVisible(false);
      setTimeout(() => {
        setAvatarCenter(lastCenterRef.current);
        setAvatarState('typing');
        setIsLoading(true);
        setError(null);
        let tagIdx = Math.floor(Math.random() * LOADING_TAGLINES.length);
        if (tagIdx === lastTaglineRef.current) tagIdx = (tagIdx + 1) % LOADING_TAGLINES.length;
        lastTaglineRef.current = tagIdx;
        setLoadingTagline(LOADING_TAGLINES[tagIdx]);
      }, 300);
    }

    const result = await sendMessage(answer);

    if (!result) {
      setError('Something went wrong. Please try again.');
      setAvatarState('idle');
      setIsLoading(false);
      setIsInitLoading(false);
      setCardVisible(true);
      return;
    }

    if (result.isComplete) {
      setAvatarState('deep');
      setPhase('verifying');
      setIsLoading(false);
      setIsInitLoading(false);

      try {
        const vRes = await fetch('/api/results/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          setThemes(vData.themes ?? []);
        }
      } catch {
        // Themes are optional
      }
      return;
    }

    // Update stage tracking — prefer AI-driven stage from API
    const newStage = result.currentStage ?? currentStage;
    if (newStage !== currentStage) {
      setCurrentStage(newStage);
      setStageQuestionCount(1);
      prevStageRef.current = newStage;
    } else {
      setStageQuestionCount((c) => c + 1);
    }

    // Clear resume flag after first new question arrives
    didResumeRef.current = false;

    const newEntry: QuestionEntry = {
      id: crypto.randomUUID(),
      question: result.question,
      format: result.format,
      answerOptions: result.answerOptions,
      isScenario: result.isScenario,
      guidanceText: result.guidanceText,
      contextNote: result.contextNote,
      scaleRange: result.scaleRange,
    };

    // Update question data while card is hidden
    setQuestions((prev) => [...prev, newEntry]);
    const nextIndex = questions.length;
    setCurrentIndex(nextIndex);
    setViewingIndex(nextIndex);
    setAvatarState('idle');
    setIsLoading(false);
    setIsInitLoading(false);

    // Staged reveal: let React render new content, then fade card in
    setTimeout(() => setCardVisible(true), 50);

    // Show "Progress saved" indicator briefly
    if (result.progressSaved) {
      setShowProgressSaved(true);
      setTimeout(() => setShowProgressSaved(false), 2000);
    }
  }, [resetInactivity, viewingIndex, questions, sendMessage, sessionId]);

  const handleVerifyYes = useCallback(async () => {
    setIsVerifying(true);
    try {
      if (sessionId) {
        // Start generation and redirect — results page handles the loading UI
        fetch('/api/results/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
        // Brief delay to let the request start, then redirect
        await new Promise(r => setTimeout(r, 500));
        router.push(`/results?sessionId=${encodeURIComponent(sessionId)}`);
      }
    } catch {
      if (sessionId) router.push(`/results?sessionId=${encodeURIComponent(sessionId)}`);
    }
  }, [sessionId, router]);

  const handleVerifyNo = useCallback(() => {
    setShowFeedbackBox(true);
  }, []);

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackText.trim()) return;
    setIsLoading(true);

    try {
      // Send feedback as a message (don't block on failure)
      await sendMessage(feedbackText.trim()).catch(() => {});

      // Go to results — redirect even if generate takes time
      setPhase('clarifying');
      setShowFeedbackBox(false);

      if (sessionId) {
        // Try to generate, but redirect regardless after a timeout
        const generatePromise = fetch('/api/results/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        // Race: either generate completes or we redirect after 3s
        const timeout = new Promise(resolve => setTimeout(resolve, 3000));
        await Promise.race([generatePromise, timeout]);

        router.push(`/results?sessionId=${encodeURIComponent(sessionId)}`);
      }
    } catch {
      // Even on error, try to go to results
      if (sessionId) {
        router.push(`/results?sessionId=${encodeURIComponent(sessionId)}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [feedbackText, sendMessage, sessionId, router]);

  // Navigate back
  const handleBack = useCallback(() => {
    if (viewingIndex <= 0) return;
    setCardVisible(false);
    setTimeout(() => {
      setViewingIndex((v) => v - 1);
      setTimeout(() => setCardVisible(true), 50);
    }, 250);
  }, [viewingIndex]);

  // Navigate forward from a previous question
  const handleForward = useCallback(() => {
    if (viewingIndex >= currentIndex) return;
    setCardVisible(false);
    setTimeout(() => {
      setViewingIndex((v) => v + 1);
      setTimeout(() => setCardVisible(true), 50);
    }, 250);
  }, [viewingIndex, currentIndex]);

  const currentQ = questions[viewingIndex];

  // ── Render ──

  if (phase === 'resuming') {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      <SouloNav loggedIn={!!userId} userEmail={email || undefined} hasResults={false} showPortalTabs={false} />
      <div className="flex flex-1 items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] max-w-[420px] w-full flex flex-col gap-5 p-8">
          <div className="flex flex-col items-center gap-3">
            <SouloAvatar state="idle" activeCenter="Body" size="md" />
            <h1 className="font-serif text-[1.2rem] font-semibold text-[#2C2C2C] text-center">
              Welcome back
            </h1>
            <p className="font-sans text-sm text-[#6B6B6B] text-center leading-relaxed">
              Your assessment is in progress. Verify your identity to pick up where you left off.
            </p>
          </div>

          <div className="h-px bg-[#E8E4E0]" />

          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={resumeEmail}
              onChange={(e) => setResumeEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
            />
            <input
              type="text"
              value={resumePasskey}
              onChange={(e) => setResumePasskey(e.target.value)}
              placeholder="Save key"
              onKeyDown={(e) => { if (e.key === 'Enter') handleResume(); }}
              className="w-full rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
            />
            <button
              onClick={handleResume}
              disabled={isLoading || !resumeEmail.trim() || !resumePasskey.trim()}
              className="w-full font-serif text-white bg-[#2563EB] rounded-2xl py-[0.875rem] text-base font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Resuming…' : 'Resume Assessment'}
            </button>
          </div>

          {error && (
            <p className="font-sans text-sm text-[#DC2626] text-center">{error}</p>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('soulo_active_session_id');
              localStorage.removeItem('soulo_email');
              localStorage.removeItem('soulo_user_id');
              setPendingResumeSessionId(null);
              setPhase('welcome');
              setError(null);
            }}
            className="font-sans text-xs text-[#9B9590] hover:text-[#6B6B6B] text-center underline underline-offset-2"
          >
            Start a new assessment instead
          </button>
        </div>
      </div>
      </div>
    );
  }

  if (phase === 'welcome') {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#FAF8F5' }}>
      <SouloNav loggedIn={!!userId} userEmail={email || undefined} hasResults={false} showPortalTabs={false} />
      <div
        className="flex flex-1 items-center justify-center p-5"
        style={{
          backgroundImage: 'url(/enneagramsymbol.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeUp { animation: fadeUp 0.45s ease forwards; }
        `}</style>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.1)] max-w-[560px] w-full flex flex-col gap-6 p-8 animate-fadeUp relative overflow-hidden">
          {/* Gradient accent bar at top */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(to right, #7C3AED, #2563EB, #0EA5E9, #2563EB, #7C3AED)' }} />

          {/* SouloOrb + branding */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <SouloOrb size={100} />
            <h1 className="font-serif text-[2.5rem] font-bold tracking-tight leading-tight" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 40%, #0EA5E9 70%, #7C3AED 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Soulo
            </h1>
            <p className="font-serif italic text-[0.95rem] text-[#2563EB]/80 tracking-wide">
              Defy Your Number. Live Your Spirit.
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[#E8E4E0] to-transparent" />

          <p className="font-sans text-[0.88rem] text-[#6B6B6B] text-center">
            Enter your email and create a save key to begin.
          </p>

          {/* Name, Email & Save Key */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="flex-1 rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="flex-1 rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
            />
            <div>
              <input
                type="text"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Save key (4+ characters — your return key)"
                required
                className="w-full rounded-xl px-5 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              />
              <p className="font-sans text-[0.7rem] text-[#9B9590] mt-1 px-1">
                Create a save key to return to your results later. Use the same email and key to sign back in.
              </p>
            </div>
          </div>

          <div className="h-px bg-[#E8E4E0]" />

          {/* Personalize Your Results — visible, not collapsed */}
          <div className="flex flex-col gap-4">
            <p className="font-sans text-[0.78rem] font-semibold text-[#2C2C2C] uppercase tracking-[0.06em]">
              Personalize Your Results <span className="font-normal text-[#9B9590]">(optional)</span>
            </p>

            {/* Age range pills */}
            <div>
              <div className="font-mono text-[0.68rem] tracking-widest uppercase text-[#9B9590] mb-2">
                Age Range
              </div>
              <div className="flex flex-wrap gap-2">
                {['Under 25', '25\u201334', '35\u201344', '45\u201354', '55+'].map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setDemographics((prev) => ({ ...prev, ageRange: age }))}
                    className={`rounded-full px-4 py-1.5 text-[0.82rem] font-sans border cursor-pointer transition-colors ${
                      demographics.ageRange === age
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'bg-[#FAF8F5] border-[#E0DAD4] text-[#6B6B6B] hover:border-[#2563EB]'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender pills */}
            <div>
              <div className="font-mono text-[0.68rem] tracking-widest uppercase text-[#9B9590] mb-2">
                Gender
              </div>
              <div className="flex flex-wrap gap-2">
                {['Man', 'Woman', 'Prefer not to say'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setDemographics((prev) => ({ ...prev, gender: g }))}
                    className={`rounded-full px-4 py-1.5 text-[0.82rem] font-sans border cursor-pointer transition-colors ${
                      demographics.gender === g
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'bg-[#FAF8F5] border-[#E0DAD4] text-[#6B6B6B] hover:border-[#2563EB]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Freeform text inputs */}
            {([
              { key: 'ethnicity' as const, label: 'Ethnicity / Background', placeholder: 'e.g. Latina, South Asian, Black American' },
              { key: 'country' as const, label: 'Country', placeholder: 'e.g. Nigeria, Brazil, United States' },
              { key: 'religion' as const, label: 'Religion / Spirituality', placeholder: 'e.g. Jewish, Buddhist, Christian, etc.' },
            ] as const).map((field) => (
              <div key={field.key}>
                <div className="font-mono text-[0.68rem] tracking-widest uppercase text-[#9B9590] mb-2">
                  {field.label}
                </div>
                <input
                  type="text"
                  value={demographics[field.key]}
                  onChange={(e) => setDemographics((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl px-4 py-2.5 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
                />
              </div>
            ))}

            <p className="font-sans text-[0.7rem] text-[#9B9590] italic text-center">
              Used only to find relevant examples for your results. Never stored beyond your session.
            </p>
          </div>

          <div className="h-px bg-[#E8E4E0]" />

          {/* Begin button */}
          <button
            onClick={handleBegin}
            disabled={isLoading || !email.trim() || passkey.trim().length < 4}
            className="relative w-full overflow-hidden font-sans text-white bg-[#2563EB] rounded-2xl py-4 text-[1.05rem] font-semibold hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-all disabled:opacity-50 shadow-lg hover:shadow-[0_0_24px_rgba(37,99,235,0.3)]"
          >
            {isLoading && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#1E40AF] transition-all duration-300 ease-out"
                style={{ width: `${startProgress}%` }}
              />
            )}
            <span className="relative z-10 text-white">
              {isLoading ? (startProgress >= 100 ? 'Ready' : 'Starting…') : 'Begin Assessment'}
            </span>
          </button>

          {error && (
            <p className="font-sans text-sm text-[#1E3A8A] text-center">{error}</p>
          )}
        </div>
      </div>
      </div>
    );
  }

  if (phase === 'verifying') {
    return (
      <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      <SouloNav loggedIn={!!userId} userEmail={email || undefined} hasResults={false} showPortalTabs={false} />
      <div className="flex flex-1 items-center justify-center p-5">
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeUp { animation: fadeUp 0.45s ease forwards; }
        `}</style>
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] max-w-[520px] w-full flex flex-col gap-6 p-8 animate-fadeUp">
          <div className="flex flex-col items-center gap-4">
            <SouloAvatar state={avatarState} activeCenter={avatarCenter} size="lg" />
            <h2 className="font-serif text-[1.2rem] font-semibold text-[#2C2C2C] text-center">
              One moment before your results
            </h2>
          </div>

          <div className="h-px bg-[#E8E4E0]" />

          {themes.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-[0.85rem] text-[#6B6B6B]">
                Based on what you shared, here are the themes Soulo identified:
              </p>
              <ul className="flex flex-col gap-2">
                {themes.map((theme, i) => (
                  <li
                    key={i}
                    className="font-sans text-sm text-[#2C2C2C] bg-[#FAF8F5] rounded-xl px-4 py-2.5 border border-[#E8E4E0] animate-fadeUp"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {theme}
                  </li>
                ))}
              </ul>
              <p className="font-sans text-[0.88rem] text-[#2C2C2C] font-semibold mt-1">
                Does this feel accurate to you?
              </p>
            </div>
          )}

          {themes.length === 0 && (
            <p className="font-sans text-[0.9rem] text-[#6B6B6B] leading-relaxed text-center">
              Your assessment is complete. Ready to see your results?
            </p>
          )}

          {!showFeedbackBox ? (
            <div className="flex gap-3">
              <button
                onClick={handleVerifyYes}
                disabled={isVerifying}
                className="flex-1 font-sans text-sm rounded-xl py-3 bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {isVerifying ? 'Loading…' : 'Yes, show my results'}
              </button>
              {themes.length > 0 && (
                <button
                  onClick={handleVerifyNo}
                  className="flex-1 font-sans text-sm rounded-xl py-3 border border-[#E8E4E0] text-[#2C2C2C] hover:bg-[#FAF8F5] transition-colors"
                >
                  Not quite
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What feels off? Share a correction or add context…"
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              />
              <button
                onClick={handleFeedbackSubmit}
                disabled={!feedbackText.trim() || isLoading}
                className="w-full font-sans text-sm rounded-xl py-3 bg-[#2563EB] text-white font-semibold disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors"
              >
                {isLoading ? 'Updating…' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    );
  }

  // ── Assessing / Clarifying phase ──
  return (
    <div className={`flex flex-col h-[100dvh] transition-colors duration-[800ms] overflow-hidden ${isFocusMode ? 'bg-[#F2EFEA]' : 'bg-[#FAF8F5]'}`}>
      <SouloNav loggedIn={!!userId} userEmail={email || undefined} hasResults={false} showPortalTabs={false} />
      <div className="flex flex-1 overflow-hidden">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp { animation: fadeUp 0.45s ease forwards; }
      `}</style>
      
      {/* Floating Focus Toggle */}
      {phase === 'assessing' && (
        <button
          onClick={() => setIsFocusMode(!isFocusMode)}
          className={`fixed top-6 right-6 z-50 p-2.5 rounded-full bg-white shadow-sm border border-[#E8E4E0] text-[#9B9590] hover:text-[#2C2C2C] transition-all hover:scale-105 duration-300 ${isFocusMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
          title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
        >
          {isFocusMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          )}
        </button>
      )}

      {/* Left panel — shows during intro but at stage 0 (locked/empty) */}
      <div className={`hidden md:block transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${isFocusMode ? 'w-0 opacity-0 border-none' : 'w-[280px] lg:w-[320px] opacity-100 border-r border-[#E0DAD4]'}`}>
        <div className="w-[280px] lg:w-[320px] h-full">
          <ProgressPanel
            currentStage={currentQ?.isInitMessage ? 0 : currentStage}
            stageQuestionCount={currentQ?.isInitMessage ? 0 : stageQuestionCount}
          />
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 min-w-0 h-full transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isFocusMode ? 'max-w-3xl mx-auto' : ''}`}>

        {/* Mobile stage indicator — hidden during intro */}
        {!(currentQ?.isInitMessage) && (
        <div
          className="md:hidden flex-shrink-0 bg-[#2563EB] flex items-center px-4"
          style={{ height: '36px' }}
        >
          <span className="font-sans text-white text-xs">Stage {currentStage} of 7</span>
        </div>
        )}

        {/* Clarifying banner */}
        {phase === 'clarifying' && (
          <div className="flex-shrink-0 bg-[#E8F0E8] border-b border-[#C4E0C4] px-5 py-2.5 text-center">
            <span className="font-sans text-[0.82rem] text-[#4A7A4A]">
              Clarifying — Soulo is refining its understanding based on your feedback.
            </span>
          </div>
        )}

        {/* Two-zone assessment layout — fixed containers, no conditional mounts */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-5 py-8 gap-6">
          <style>{`
            @keyframes thinking-cursor {
              0%, 100% { opacity: 1 }
              50% { opacity: 0 }
            }
          `}</style>

          {/* ═══ LOADING STATE ═══ */}
          {isLoading && (
            isInitLoading ? (
              /* Special loading for welcome → Q1: no "processing your answer", just Baruch quote */
              <div className="flex flex-col items-center justify-center gap-8 w-full max-w-[600px]">
                <EnneagramLoader size={320} active={true} hideStatus={true} />
                <p className="font-serif italic text-[1.2rem] text-[#4B5563] leading-[1.7] text-center max-w-[460px]">
                  Between stimulus and response there is a space. In that space lies our freedom and our power to choose.
                </p>
                <LoadingProgress active={true} />
              </div>
            ) : (
              /* Regular loading between questions */
              <div className="flex flex-col items-center justify-center gap-6 w-full max-w-[600px]">
                <EnneagramLoader size={260} active={true} />
                <div className="w-full max-w-[500px] text-center px-4">
                  <p className="font-serif italic text-[1.35rem] text-[#4B5563] leading-[1.7] tracking-wide">
                    <MarkdownText>{thinkingDisplay || loadingTagline || 'Listening\u2026'}</MarkdownText>
                    <span
                      className="inline-block ml-1"
                      style={{ animation: 'thinking-cursor 1s ease-in-out infinite' }}
                    >
                      |
                    </span>
                  </p>
                </div>
                <LoadingProgress active={true} />
              </div>
            )
          )}

          {/* ═══ GUIDE ZONE — Soulo's bridge commentary (after loading, all questions except intro) ═══ */}
          {!isLoading && currentQ && !currentQ.isInitMessage && (
            <div
              className="w-full max-w-[600px] transition-opacity duration-300"
              style={{ opacity: 1 }}
            >
              <div className="flex items-start gap-4 bg-[#FAF8F5] border border-[#E8E4E0] rounded-2xl px-5 py-5 shadow-sm">
                <div className="flex-shrink-0 mt-0.5">
                  <SouloOrb size={52} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-sans text-[0.65rem] uppercase tracking-[0.08em] text-[#2563EB] font-semibold">Soulo</span>
                  {currentQ.guidanceText ? (
                    <div className="min-h-[1.7rem]">
                      <TypingAnimation
                        text={currentQ.guidanceText}
                        duration={35}
                      />
                    </div>
                  ) : (
                    <p className="font-serif italic text-[0.9rem] text-[#9B9590]">
                    {didResumeRef.current && questions.filter(q => !q.isInitMessage && !q.answer).length <= 1
                      ? "Welcome back. Let\u2019s pick up where we left off."
                      : questions.filter(q => !q.isInitMessage && q.answer).length === 0
                      ? "Let\u2019s begin. This first question helps me understand how you move through the world."
                      : "Your guide is with you."}
                  </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ EXAM ZONE ═══ */}
          {currentQ && !isLoading && (
            currentQ.isInitMessage ? (
              /* Welcome/intro screen — distinct from exam */
              <WelcomeCard
                onReady={() => handleAnswer("Yes, I'm ready")}
              />
            ) : (
              /* Regular question card */
              <div className="w-full max-w-[600px]">
                <QuestionCard
                  questionText={currentQ.question}
                  format={currentQ.format}
                  answerOptions={currentQ.answerOptions}
                  onAnswer={viewingIndex === currentIndex ? handleAnswer : (ans) => {
                    setQuestions((prev) => {
                      const updated = [...prev];
                      updated[viewingIndex] = { ...updated[viewingIndex], answer: ans };
                      return updated;
                    });
                    handleAnswer(ans);
                  }}
                  isScenario={currentQ.isScenario}
                  isInitMessage={currentQ.isInitMessage}
                  existingAnswer={currentQ.answer}
                  contextNote={currentQ.contextNote}
                  currentStage={currentStage}
                  scaleRange={currentQ.scaleRange}
                  visible={cardVisible}
                  questionNumber={viewingIndex}
                  onRegenerate={() => {
                    // Recovery path for the rare case where Claude returned a
                    // forced_choice with no usable answer_options. Reload the
                    // page — the resume flow re-fetches session state from
                    // the server, which usually re-asks Claude and lands on
                    // a properly-structured question.
                    if (typeof window !== 'undefined') window.location.reload();
                  }}
                />
              </div>
            )
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="flex items-center justify-between gap-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-5 py-3 animate-fadeUp max-w-[600px] w-full">
              <span className="font-sans text-sm text-[#1E3A8A]">{error}</span>
              <button
                onClick={() => setError(null)}
                className="font-sans text-xs text-[#1E3A8A] underline underline-offset-2 flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Progress saved indicator */}
          {showProgressSaved && (
            <div className="flex items-center gap-1.5 animate-fadeUp">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="6" fill="#7A9E7E" opacity="0.15" />
                <path d="M3.5 6L5.5 8L8.5 4.5" stroke="#7A9E7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-sans text-[0.7rem] text-[#7A9E7E]">Progress saved</span>
            </div>
          )}

          {/* Back / Forward nav */}
          {questions.length > 1 && !isLoading && (
            <div className="flex gap-3 items-center">
              {viewingIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="font-sans text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] text-[#9B9590] border border-[#E8E4E0] rounded-full hover:bg-[#E8E4E0] hover:text-[#6B6B6B] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8L10 4"/></svg>
                  Previous question
                </button>
              )}
              {viewingIndex < currentIndex && (
                <button
                  onClick={handleForward}
                  className="font-sans text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] text-[#9B9590] border border-[#E8E4E0] rounded-full hover:bg-[#E8E4E0] hover:text-[#6B6B6B] transition-colors"
                >
                  Next question
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12L10 8L6 4"/></svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inactivity overlay */}
      {showInactivityOverlay && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-5"
          onClick={resetInactivity}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-[380px] w-full text-center flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-[1.1rem] font-semibold text-[#2C2C2C]">Still there?</h3>
            <p className="font-sans text-sm text-[#6B6B6B]">
              Take your time — Soulo is here when you are ready.
            </p>
            <button
              onClick={resetInactivity}
              className="w-full font-sans text-sm rounded-xl py-3 bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
      </div>
    }>
      <AssessmentContent />
    </Suspense>
  );
}
