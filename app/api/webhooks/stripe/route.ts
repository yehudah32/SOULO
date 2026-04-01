import { NextRequest, NextResponse } from 'next/server';
import { grantAccess } from '@/lib/check-access';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const productId = session.metadata?.productId;

      if (userId && productId) {
        const success = await grantAccess(userId, productId, {
          stripeSessionId: session.id,
          stripePaymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          amount: session.amount_total ?? 0,
          status: 'completed',
        });

        if (success) {
          console.log(`[stripe-webhook] Access granted: user=${userId} product=${productId}`);
        } else {
          console.error(`[stripe-webhook] Failed to grant access: user=${userId} product=${productId}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 400 });
  }
}
