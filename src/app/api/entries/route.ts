import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Explicit column list — never returns pin to the client
const ENTRY_COLS = `
  id,
  player_name,
  pick_tier1_id,
  pick_tier2_id,
  pick_tier3_id,
  pick_tier4_id,
  reserve_id,
  tiebreaker,
  created_at,
  updated_at,
  pick_tier1:pick_tier1_id(id, name, tier, display_order),
  pick_tier2:pick_tier2_id(id, name, tier, display_order),
  pick_tier3:pick_tier3_id(id, name, tier, display_order),
  pick_tier4:pick_tier4_id(id, name, tier, display_order),
  reserve:reserve_id(id, name, tier, display_order)
`;

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// GET /api/entries            — all entries (admin use)
// GET /api/entries?name=X     — single entry lookup (no pin returned)
// GET /api/entries?name=X&pin=Y&verify=1 — verify pin, returns { ok: boolean }
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name');
  const pin = searchParams.get('pin');
  const verify = searchParams.get('verify');

  // PIN verification request
  if (name && pin && verify) {
    const { data } = await supabase
      .from('entries')
      .select('pin')
      .ilike('player_name', name.trim())
      .maybeSingle();
    return NextResponse.json({ ok: data?.pin === pin });
  }

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

// POST /api/entries
//   New entry   → generates PIN, returns it once in response
//   Edit entry  → requires { pin } in body, returns 403 on mismatch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { player_name, pick_tier1_id, pick_tier2_id, pick_tier3_id, pick_tier4_id, reserve_id, tiebreaker, pin } = body;

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

    // Check lock state
    const { data: config } = await supabase.from('pool_config').select('picks_locked').single();
    if (config?.picks_locked) {
      return NextResponse.json({ error: 'Picks are locked — tournament has started' }, { status: 403 });
    }

    // Check for existing entry
    const { data: existing } = await supabase
      .from('entries')
      .select('id, pin')
      .ilike('player_name', player_name.trim())
      .maybeSingle();

    const entryData = {
      player_name: player_name.trim(),
      pick_tier1_id,
      pick_tier2_id,
      pick_tier3_id,
      pick_tier4_id,
      reserve_id,
      tiebreaker: Number(tiebreaker),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Editing: verify PIN
      if (!pin || pin.toString() !== existing.pin) {
        return NextResponse.json({ error: 'Incorrect PIN', requiresPin: true }, { status: 403 });
      }
      const { data, error } = await supabase
        .from('entries')
        .update(entryData)
        .eq('id', existing.id)
        .select(ENTRY_COLS)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ entry: data });
    } else {
      // New entry: generate and store PIN
      const newPin = generatePin();
      const { data, error } = await supabase
        .from('entries')
        .insert({ ...entryData, pin: newPin })
        .select(ENTRY_COLS)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Return PIN once — client must save it
      return NextResponse.json({ entry: data, pin: newPin });
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
