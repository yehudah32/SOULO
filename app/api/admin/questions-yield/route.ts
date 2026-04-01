export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await adminClient
      .from('questions')
      .select('id, question_text, stage, target_types, times_used, avg_information_yield, is_baruch_sourced')
      .order('avg_information_yield', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ questions: [] });
    }

    return NextResponse.json({ questions: data || [] });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
