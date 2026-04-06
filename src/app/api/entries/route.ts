import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const GOLFER_JOIN = `
  *,
  pick_tier1:pick_tier1_id(id, name, tier, display_order),
  pick_tier2:pick_tier2_id(id, name, tier, display_order),
  pick_tier3:pick_tier3_id(id, name, tier, display_order),
  pick_tier4:pick_tier4_id(id, name, tier, display_order),
  reserve:reserve_id(id, name, tier, display_order)
`;

// GET /api/entries — all entries, or ?name=X for single entry lookup
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const name = req.nextUrl.searchParams.get('name');

  if (name) {
    const { data, error } = await supabase
      .from('entries')
      .select(GOLFER_JOIN)
      .ilike('player_name', name.trim())
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  }

  const { data, error } = await supabase
    .from('entries')
    .select(GOLFER_JOIN)
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// POST /api/entries — upsert entry (respects lock state)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { player_name, pick_tier1_id, pick_tier2_id, pick_tier3_id, pick_tier4_id, reserve_id, tiebreaker } = body;

    if (!player_name?.trim() || !player_name.trim().includes(' ')) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 });
    }
    if (!pick_tier1_id || !pick_tier2_id || !pick_tier3_id || !pick_tier4_id || !reserve_id) {
      return NextResponse.json({ error: 'All tier picks and reserve are required' }, { status: 400 });
    }
    if (tiebreaker === undefined || tiebreaker === null || tiebreaker === '') {
      return NextResponse.json({ error: 'Tiebreaker is required' }, { status: 400 });
    }
    if (reserve_id === pick_tier4_id) {
      return NextResponse.json({ error: 'Reserve must differ from Tier 4 pick' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: config } = await supabase.from('pool_config').select('picks_locked').single();
    if (config?.picks_locked) {
      return NextResponse.json({ error: 'Picks are locked — tournament has started' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('entries')
      .upsert(
        {
          player_name: player_name.trim(),
          pick_tier1_id,
          pick_tier2_id,
          pick_tier3_id,
          pick_tier4_id,
          reserve_id,
          tiebreaker: Number(tiebreaker),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_name' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('POST /api/entries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/entries?id=X — admin delete entry
export async function DELETE(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/entries — toggle picks_locked in pool_config (admin only)
export async function PATCH(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { picks_locked, config_id } = await req.json();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('pool_config')
      .update({ picks_locked, updated_at: new Date().toISOString() })
      .eq('id', config_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  } catch (err) {
    console.error('PATCH /api/entries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
