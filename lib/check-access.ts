import { adminClient } from '@/lib/supabase';

/**
 * Check if a user has purchased access to a specific product.
 * Returns true if the user has a completed or promo purchase.
 */
export async function hasAccess(userId: string | null | undefined, productId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await adminClient
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .in('status', ['completed', 'promo'])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[check-access] DB error:', error.message);
      // Fail open in development, fail closed in production
      return process.env.NODE_ENV === 'development';
    }

    return !!data;
  } catch (err) {
    console.error('[check-access] Unexpected error:', err);
    return process.env.NODE_ENV === 'development';
  }
}

/**
 * Grant access to a user for a product (used by webhooks and promo codes).
 */
export async function grantAccess(
  userId: string,
  productId: string,
  options: {
    stripeSessionId?: string;
    stripePaymentIntent?: string;
    amount?: number;
    status?: 'completed' | 'promo';
  } = {}
): Promise<boolean> {
  try {
    const { error } = await adminClient.from('purchases').insert({
      user_id: userId,
      product_id: productId,
      stripe_session_id: options.stripeSessionId || null,
      stripe_payment_intent: options.stripePaymentIntent || null,
      amount: options.amount || 0,
      status: options.status || 'completed',
    });

    if (error) {
      console.error('[grant-access] DB error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[grant-access] Unexpected error:', err);
    return false;
  }
}
