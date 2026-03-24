export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

export async function POST(req: NextRequest) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return NextResponse.json({ success: false, reason: 'email_not_configured' });
    }

    const { sessionId, email } = await req.json();

    if (!sessionId || !email) {
      return NextResponse.json({ success: false, reason: 'missing_params' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, reason: 'session_not_found' });
    }

    // Use cached results or fetch them
    let results = session.generatedResults;
    if (!results) {
      try {
        const genRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/results/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          }
        );
        if (genRes.ok) {
          const genData = await genRes.json();
          results = genData.results;
        }
      } catch (genErr) {
        console.error('[results/email] Failed to generate results for email:', genErr);
        return NextResponse.json({ success: false, reason: 'generate_failed' });
      }
    }

    if (!results) {
      return NextResponse.json({ success: false, reason: 'no_results' });
    }

    // Generate PDF
    let pdfBuffer: Buffer | null = null;
    try {
      const { generateResultsPDF } = await import('@/lib/pdf-generator');
      pdfBuffer = await generateResultsPDF(results);
    } catch (pdfErr) {
      console.error('[results/email] PDF generation failed:', pdfErr);
      // Continue without PDF attachment
    }

    // Send email via Resend
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(RESEND_API_KEY);

      const typeName = (results.type_name as string) ?? `Type ${results.leading_type}`;
      const dsName = (results.defiant_spirit_type_name as string) ?? '';

      const attachments = pdfBuffer && pdfBuffer.length > 0
        ? [{
            filename: `soulo-enneagram-results.pdf`,
            content: pdfBuffer.toString('base64'),
            type: 'application/pdf',
          }]
        : [];

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject: `Your Soulo Enneagram Results — ${typeName}${dsName ? ` / ${dsName}` : ''}`,
        html: buildEmailHtml(results),
        attachments,
      });

      return NextResponse.json({ success: true });
    } catch (sendErr) {
      console.error('[results/email] Resend error:', sendErr);
      return NextResponse.json({ success: false, reason: 'send_failed' });
    }
  } catch (err) {
    console.error('[results/email] Error:', err);
    return NextResponse.json({ success: false, reason: 'unknown_error' });
  }
}

function buildEmailHtml(results: Record<string, unknown>): string {
  const leadingType = results.leading_type as number;
  const typeName = results.type_name as string ?? `Type ${leadingType}`;
  const dsName = results.defiant_spirit_type_name as string ?? '';
  const headline = results.headline as string ?? '';
  const superpower = results.superpower as string ?? '';
  const defy = results.defy_your_number as string ?? '';
  const closing = results.closing_charge as string ?? 'Defy Your Number. Live Your Spirit.';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Soulo Enneagram Results</title></head>
<body style="font-family: Georgia, serif; background: #FAF8F5; color: #2C2C2C; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #2563EB; font-size: 1.5rem; margin: 0;">Soulo Enneagram</h1>
    <p style="color: #6B6B6B; font-size: 0.85rem; margin: 4px 0 0;">Defy Your Number. Live Your Spirit.</p>
  </div>

  <div style="background: white; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
    <p style="color: #9B9590; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px;">Your Enneagram Type</p>
    <div style="display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px;">
      <span style="font-size: 4rem; font-weight: bold; color: #2563EB; line-height: 1;">${leadingType}</span>
      <div>
        <p style="font-size: 1.3rem; font-weight: bold; margin: 0; color: #2C2C2C;">${typeName}</p>
        ${dsName ? `<p style="color: #7A9E7E; font-size: 0.9rem; margin: 4px 0 0;">${dsName}</p>` : ''}
      </div>
    </div>
    ${headline ? `<p style="font-style: italic; color: #2563EB; text-align: center; border-top: 1px solid #E8E4E0; padding-top: 16px; margin: 0;">${headline}</p>` : ''}
  </div>

  ${superpower ? `
  <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
    <p style="color: #9B9590; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px;">Your Superpower</p>
    <p style="margin: 0; line-height: 1.7;">${superpower}</p>
  </div>
  ` : ''}

  ${defy ? `
  <div style="background: #3D2B1F; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
    <p style="color: #60A5FA; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px;">Defy Your Number</p>
    <p style="color: #FAF8F5; margin: 0; line-height: 1.7;">${defy}</p>
  </div>
  ` : ''}

  <div style="text-align: center; padding: 24px 0;">
    <p style="font-style: italic; color: #2563EB; font-size: 1rem;">${closing}</p>
  </div>

  ${results.tritype ? `<p style="text-align: center; color: #9B9590; font-size: 0.8rem;">Tritype: ${results.tritype}</p>` : ''}

  <div style="border-top: 1px solid #E8E4E0; padding-top: 20px; margin-top: 20px; text-align: center;">
    <p style="color: #9B9590; font-size: 0.75rem;">Your full results PDF is attached to this email.</p>
    <p style="color: #9B9590; font-size: 0.75rem;">Based on the Defiant Spirit methodology by Dr. Baruch HaLevi.</p>
  </div>
</body>
</html>`;
}
