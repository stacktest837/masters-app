import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchMastersScores, matchGolferName } from '@/lib/espn';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

// GET /api/espn — verify admin password
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true });
}

// POST /api/espn — fetch ESPN scores and sync to Supabase
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = createServiceClient();

    const { data: golfers, error: golfersErr } = await supabase
      .from('golfers')
      .select('id, name');
    if (golfersErr) throw new Error(golfersErr.message);

    const poolNames = (golfers || []).map((g) => g.name);
    const { scores: espnScores, status: tournamentStatus } = await fetchMastersScores();

    if (tournamentStatus === 'not_found' || tournamentStatus === 'pre') {
      return NextResponse.json({
        ok: true,
        synced: 0,
        unmatched: [],
        status: tournamentStatus,
        message: tournamentStatus === 'pre' ? 'Masters not yet started' : 'Masters not found on ESPN',
      });
    }

    let synced = 0;
    const unmatched: string[] = [];

    for (const espnScore of espnScores) {
      const matchedName = matchGolferName(espnScore.golferName, poolNames);
      if (!matchedName) {
        unmatched.push(espnScore.golferName);
        continue;
      }
      const golfer = (golfers || []).find((g) => g.name === matchedName);
      if (!golfer) continue;

      const { error } = await supabase.from('scores').upsert(
        {
          golfer_id: golfer.id,
          score_to_par: espnScore.scoreToPar,
          status: espnScore.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'golfer_id' }
      );
      if (!error) synced++;
    }

    return NextResponse.json({ ok: true, synced, unmatched, status: tournamentStatus });
  } catch (err) {
    console.error('POST /api/espn:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
