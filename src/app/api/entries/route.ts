import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Explicit column list (no SELECT * — avoids exposing internal columns)
const ENTRY_COLS = `
  id,
  player_name,
  pick_tier1_id,
  pick_tier2_id,
  pick_tier3_id,
  pick_tier4_id,
  reserve_id,
  created_at,
  updated_at,
  pick_tier1:pick_tier1_id(id, name, tier, display_order),
  pick_tier2:pick_tier2_id(id, name, tier, display_order),
  pick_tier3:pick_tier3_id(id, name, tier, display_order),
  pick_tier4:pick_tier4_id(id, name, tier, display_order),
  reserve:reserve_id(id, name, tier, display_order)
`;

// GET /api/entries            — all entries (admin use)
// GET /api/entries?name=X     — single entry lookup
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name');

  if (name) {
    const { data, error } = await supabase
      .from('entries')
      .select(ENTRY_COLS)
      .ilike('player_name', name.trim())
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  }

  const { data, error } = await supabase
    .from('entries')
    .select(ENTRY_COLS)
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// POST /api/entries — create or overwrite by name
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { player_name, pick_tier1_id, pick_tier2_id, pick_tier3_id, pick_tier4_id, reserve_id } = body;

    if (!player_name?.trim() || !player_name.trim().includes(' ')) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 });
    }
    if (!pick_tier1_id || !pick_tier2_id || !pick_tier3_id || !pick_tier4_id || !reserve_id) {
      return NextResponse.json({ error: 'All tier picks and reserve are required' }, { status: 400 });
    }
    if (reserve_id === pick_tier4_id) {
      return NextResponse.json({ error: 'Reserve must differ from Tier 4 pick' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check lock state
    const { data: config } = await supabase.from('pool_config').select('picks_locked').single();
    if (config?.picks_locked) {
      return NextResponse.json({ error: 'Picks are locked — tournament has started' }, { status: 403 });
    }

    const entryData = {
      player_name: player_name.trim(),
      pick_tier1_id,
      pick_tier2_id,
      pick_tier3_id,
      pick_tier4_id,
      reserve_id,
      updated_at: new Date().toISOString(),
    };

    // Upsert by player_name
    const { data: existing } = await supabase
      .from('entries')
      .select('id')
      .ilike('player_name', player_name.trim())
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('entries')
        .update(entryData)
        .eq('id', existing.id)
        .select(ENTRY_COLS)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ entry: data });
    } else {
      const { data, error } = await supabase
        .from('entries')
        .insert(entryData)
        .select(ENTRY_COLS)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ entry: data });
    }
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

// PATCH /api/entries — toggle picks_locked (admin only)
export async function PATCH(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { picks_locked } = await req.json();
    const supabase = createServiceClient();

    // Fetch config ID server-side — don't rely on client to send it correctly
    const { data: existing, error: fetchErr } = await supabase
      .from('pool_config')
      .select('id')
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'pool_config row not found' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('pool_config')
      .update({ picks_locked, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  } catch (err) {
    console.error('PATCH /api/entries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
