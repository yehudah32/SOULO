export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { initSession, setSession, getSession } from '@/lib/session-store';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      coreType: number;
      wing: string;
      variant: string;
      tritype: string;
      confidence: number;
    };

    const { coreType, wing, variant, tritype, confidence } = body;

    if (!coreType) {
      return NextResponse.json({ error: 'Missing coreType' }, { status: 400 });
    }

    // Create a synthetic session with the provided type values
    const sessionId = `admin-preview-${crypto.randomUUID()}`;
    initSession(sessionId);

    // Build synthetic type scores that match the selected tritype
    // Parse tritype digits — these must score highest in their centers
    const tritypeDigits = (tritype || String(coreType)).replace(/\D/g, '').split('').map(Number);
    const tritypeSet = new Set(tritypeDigits);

    const typeScores: Record<string, number> = {};
    for (let t = 1; t <= 9; t++) {
      if (t === coreType) {
        typeScores[String(t)] = confidence;
      } else if (tritypeSet.has(t)) {
        // Tritype members score high in their center (but below core)
        typeScores[String(t)] = confidence * 0.7 + Math.random() * 0.1;
      } else {
        // Non-tritype types score low
        typeScores[String(t)] = Math.random() * 0.25;
      }
    }

    // Inject realistic internal state
    setSession(sessionId, {
      isComplete: true,
      exchangeCount: 15,
      tritype: tritype || String(coreType),
      tritypeConfidence: 0.75,
      defiantSpiritTypeName: '',
      domainSignals: ['relationships', 'leadership', 'wealth'],
      internalState: {
        hypothesis: {
          leading_type: coreType,
          confidence,
          type_scores: typeScores,
          ruling_out: [],
          needs_differentiation: [],
        },
        variant_signals: {
          SP: variant === 'SP' ? 0.8 : 0.2,
          SO: variant === 'SO' ? 0.8 : 0.2,
          SX: variant === 'SX' ? 0.8 : 0.2,
        },
        wing_signals: {
          left: wing.includes('w' + String(coreType - 1)) ? 0.7 : 0.3,
          right: wing.includes('w' + String(coreType + 1)) ? 0.7 : 0.3,
        },
        centers: {
          body_probed: true,
          heart_probed: true,
          head_probed: true,
          last_probed: 'head',
          next_target: '',
        },
        defiant_spirit: {
          react_pattern_observed: 'Automatic tightening under pressure, moving toward control.',
          respond_glimpsed: 'Moments of pausing before reacting, choosing presence over control.',
          domain_signals: ['relationships', 'leadership'],
        },
        oyn_dimensions: {
          who: 'Someone who feels deeply but guards it.',
          what: 'A pattern of seeking control to feel safe.',
          why: 'Fear of being vulnerable or unprepared.',
          how: 'Through structure, preparation, and vigilance.',
          when: 'Under stress or when trust is tested.',
          where: 'In close relationships and leadership roles.',
        },
        conversation: {
          phase: 'closed',
          exchange_count: 15,
          closing_criteria: {
            min_exchanges_met: true,
            confidence_met: true,
            all_centers_probed: true,
            differentiation_asked: true,
            variant_surfaced: true,
            react_respond_identified: true,
            oyn_dimensions_covered: true,
          },
          ready_to_close: true,
          close_next: true,
        },
        strategy: {},
        current_section: 'Complete',
      },
      conversationHistory: [
        { role: 'assistant', content: 'Welcome to Soulo.' },
        { role: 'user', content: 'I\'m ready.' },
      ],
    });

    // Call the results generation endpoint internally
    // Derive base URL from the incoming request to handle any port
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const res = await fetch(`${baseUrl}/api/results/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'Results generation failed', details: errData }, { status: 500 });
    }

    const resultsData = await res.json();

    return NextResponse.json({
      sessionId,
      results: resultsData.results,
      sessionState: getSession(sessionId),
    });
  } catch (err) {
    console.error('[admin/simulate/preview-results] Error:', err);
    return NextResponse.json({ error: 'Failed to generate preview results' }, { status: 500 });
  }
}
