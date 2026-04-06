import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/scores — manual score override (admin only)
export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { golfer_id, score_to_par, status } = await req.json();
    if (!golfer_id) return NextResponse.json({ error: 'golfer_id required' }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('scores')
      .upsert(
        {
          golfer_id,
          score_to_par: Number(score_to_par),
          status: status || 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'golfer_id' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ score: data });
  } catch (err) {
    console.error('POST /api/scores:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
