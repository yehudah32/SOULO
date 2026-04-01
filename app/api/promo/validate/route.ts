import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { grantAccess } from '@/lib/check-access';

// Rate limit promo attempts
const promoAttempts = new Map<string, { count: number; resetAt: number }>();
const PROMO_LIMIT = 5;
const PROMO_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json() as { code?: string; userId?: string };

    if (!code?.trim() || !userId) {
      return NextResponse.json({ error: 'Code and userId required.' }, { status: 400 });
    }

    // Rate limit by userId
    const now = Date.now();
    const entry = promoAttempts.get(userId);
    if (entry && now < entry.resetAt && entry.count >= PROMO_LIMIT) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    if (!entry || now > (entry?.resetAt ?? 0)) {
      promoAttempts.set(userId, { count: 1, resetAt: now + PROMO_WINDOW });
    } else {
      entry.count++;
    }

    const cleanCode = code.trim().toUpperCase();

    // Look up promo code
    const { data: promo, error } = await adminClient
      .from('promo_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error || !promo) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
    }

    // Check expiry
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This code has expired.' }, { status: 400 });
    }

    // Check usage limit
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return NextResponse.json({ error: 'This code has been fully redeemed.' }, { status: 400 });
    }

    // Grant access
    const success = await grantAccess(userId, promo.product_id, { status: 'promo' });
    if (!success) {
      return NextResponse.json({ error: 'Failed to apply code. Please try again.' }, { status: 500 });
    }

    // Increment usage
    await adminClient
      .from('promo_codes')
      .update({ current_uses: promo.current_uses + 1 })
      .eq('id', promo.id);

    return NextResponse.json({ success: true, productId: promo.product_id });
  } catch (err) {
    console.error('[promo/validate] Error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
