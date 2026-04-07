import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/holes — public read of all hole-by-hole scores
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('golfer_holes')
    .select('golfer_id, round_number, hole_number, strokes, score_to_par');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holes: data ?? [] });
}
