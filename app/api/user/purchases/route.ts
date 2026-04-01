import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const { data, error } = await adminClient
      .from('purchases')
      .select('id, product_id, status, amount, currency, created_at')
      .eq('user_id', userId)
      .in('status', ['completed', 'promo'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }

    return NextResponse.json({ purchases: data ?? [] });
  } catch (err) {
    console.error('[user/purchases] Error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
