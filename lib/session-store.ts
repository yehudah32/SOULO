// In-memory session store for development. Replace with Redis or
// Supabase for production multi-instance deployments.

export interface SessionData {
  internalState: {
    hypothesis: {
      leading_type: number;
      confidence: number;
      type_scores: Record<string, number>;
      ruling_out: number[];
      needs_differentiation: number[];
    };
    variant_signals: { SP: number; SO: number; SX: number };
    wing_signals: { left: number; right: number };
    centers: {
      body_probed: boolean;
      heart_probed: boolean;
      head_probed: boolean;
      last_probed: string;
      next_target: string;
    };
    defiant_spirit: {
      react_pattern_observed: string;
      respond_glimpsed: string;
      domain_signals: string[];
    };
    oyn_dimensions: Record<string, string>;
    conversation: {
      phase: string;
      exchange_count: number;
      closing_criteria: Record<string, boolean>;
      ready_to_close: boolean;
      close_next: boolean;
      current_stage?: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strategy: Record<string, any>;
    current_section: string;
  } | null;
  exchangeCount: number;
  isComplete: boolean;
  domainSignals: string[];
  conversationHistory: Array<{ role: string; content: string }>;
  lastQuestionFormat: string;
  lastScaleRange: { min: number; max: number } | null;
  supervisorScores: number[];
  currentStage: number;
  defiantSpiritTypeName: string;
  tritype: string;
  tritypeConfidence: number;
  tritypeArchetypeFauvre: string;
  tritypeArchetypeDS: string;
  wholeTypeSignals: { body: number; heart: number; head: number };
  lexiconSignals: number[];
  lexiconContext: Array<{
    type: number;
    words: string[];
    questionContext: string;
    stage: number;
  }>;
  resultsData: Record<string, unknown> | null;
  email: string;
  userId: string;
  generatedResults: Record<string, unknown> | null;

  // Performance caching
  ragCache: Record<string, string>;
  supervisorCriticalFailCount: number;

  // Thinking display
  thinkingDisplay: string;

  // Demographics for celebrity personalization
  demographics: {
    ageRange: string;
    gender: string;
    ethnicity: string;
    country: string;
    religion: string;
  } | null;

  // Type score analysis
  topTypeScores: Record<number, number> | null;
  tritypeTypes: {
    body: number;
    heart: number;
    head: number;
  } | null;
  secondaryInfluences: number[];
  lowestScoringType: number | null;
  stressLineType: number | null;
  releaseLineType: number | null;

  // Confidence gate — differentiation clarification
  clarificationState: {
    active: boolean;
    pair: [number, number] | null;
    pairKey: string | null;
    questionsAsked: number;
    maxQuestions: number;
    confidenceAtEntry: number;
    completedWithLowConfidence: boolean;
  } | null;

  // Per-session question tracking for yield optimization
  allQuestionsAsked?: Array<{ exchange: number; questionId: number; questionText: string }>;

  // Vector scoring state (hybrid assessment flow)
  vectorScores: {
    typeScores: Record<number, number>;
    centerScores: Record<string, number>;
    confidence: number;
    topTypes: number[];
    phase: 'center_id' | 'type_narrowing' | 'differentiation';
  } | null;
  useVectorScoring: boolean;
  llmCallCount: number;
}

// Persist the store across Hot Module Replacement in development.
// On production, module code only runs once so this is a no-op.
const g = global as typeof global & { __sessionStore?: Map<string, SessionData> };
if (!g.__sessionStore) g.__sessionStore = new Map();
const store = g.__sessionStore;

export function initSession(id: string): void {
  store.set(id, {
    internalState: null,
    exchangeCount: 0,
    isComplete: false,
    domainSignals: [],
    conversationHistory: [],
    lastQuestionFormat: '',
    lastScaleRange: null,
    supervisorScores: [],
    currentStage: 1,
    defiantSpiritTypeName: '',
    tritype: '',
    tritypeConfidence: 0,
    tritypeArchetypeFauvre: '',
    tritypeArchetypeDS: '',
    wholeTypeSignals: { body: 0, heart: 0, head: 0 },
    lexiconSignals: [],
    lexiconContext: [],
    resultsData: null,
    email: '',
    userId: '',
    generatedResults: null,
    ragCache: {},
    supervisorCriticalFailCount: 0,
    thinkingDisplay: '',
    demographics: null,
    topTypeScores: null,
    tritypeTypes: null,
    secondaryInfluences: [],
    lowestScoringType: null,
    stressLineType: null,
    releaseLineType: null,
    clarificationState: null,
    allQuestionsAsked: [],
    vectorScores: null,
    useVectorScoring: false,
    llmCallCount: 0,
  });
}

export function getSession(id: string): SessionData | undefined {
  return store.get(id);
}

export function setSession(id: string, data: Partial<SessionData>): void {
  const existing = store.get(id);
  if (!existing) return;
  store.set(id, { ...existing, ...data });
}

export function clearSession(id: string): void {
  store.delete(id);
}

export function getLatestCompletedSession(): { sessionId: string; data: SessionData } | undefined {
  for (const [sessionId, data] of [...store.entries()].reverse()) {
    if (data.isComplete) return { sessionId, data };
  }
  return undefined;
}

export function getAllCompletedSessions(): Array<{ sessionId: string; data: SessionData }> {
  const result: Array<{ sessionId: string; data: SessionData }> = [];
  for (const [sessionId, data] of store.entries()) {
    if (data.isComplete) result.push({ sessionId, data });
  }
  return result;
}
