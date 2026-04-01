import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { productId, userId } = await req.json() as { productId?: string; userId?: string };

    if (!productId || !userId) {
      return NextResponse.json({ error: 'Missing productId or userId' }, { status: 400 });
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment system not yet configured. Please try again later.' }, { status: 503 });
    }

    // Dynamic import to avoid errors when Stripe keys aren't set
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Product price mapping (will be replaced with Stripe product IDs)
    const priceMap: Record<string, string> = {
      'core-assessment': process.env.STRIPE_PRICE_CORE || '',
      'maskulinity': process.env.STRIPE_PRICE_MASKULINITY || '',
      'mirror-man': process.env.STRIPE_PRICE_MIRROR_MAN || '',
      'shefa': process.env.STRIPE_PRICE_SHEFA || '',
      '9-lives': process.env.STRIPE_PRICE_9_LIVES || '',
      'lead-360': process.env.STRIPE_PRICE_LEAD_360 || '',
      'wealth-360': process.env.STRIPE_PRICE_WEALTH_360 || '',
    };

    const priceId = priceMap[productId];
    if (!priceId) {
      return NextResponse.json({ error: 'Product not available for purchase yet.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/results?unlocked=true`,
      cancel_url: `${req.nextUrl.origin}/results?cancelled=true`,
      metadata: { userId, productId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Error:', err);
    return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 });
  }
}
