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

    // Capture current rank snapshot before overwriting scores
    const [{ data: entriesSnap }, { data: scoresSnap }, { data: configSnap }] = await Promise.all([
      supabase.from('entries').select('id, pick_tier1_id, pick_tier2_id, pick_tier3_id, pick_tier4_id, reserve_id, tiebreaker'),
      supabase.from('scores').select('golfer_id, score_to_par, status'),
      supabase.from('pool_config').select('id').single(),
    ]);

    // Build rank snapshot from current scores
    if (entriesSnap && scoresSnap) {
      const { calculateTeamScore, sortEntries } = await import('@/lib/scoring');
      const scoreMap = new Map<string, number>((scoresSnap as { golfer_id: string; score_to_par: number }[]).map((s) => [s.golfer_id, s.score_to_par]));

      const withScores = (entriesSnap as { id: string; pick_tier1_id: string; pick_tier2_id: string; pick_tier3_id: string; pick_tier4_id: string; reserve_id: string; tiebreaker: number }[]).map((e) => ({
        id: e.id,
        tiebreaker: e.tiebreaker,
        ...calculateTeamScore({ pickIds: [e.pick_tier1_id, e.pick_tier2_id, e.pick_tier3_id, e.pick_tier4_id], reserveId: e.reserve_id, tiebreaker: e.tiebreaker }, scoreMap),
      }));
      const sorted = sortEntries(withScores);
      const snapshot: Record<string, number> = {};
      sorted.forEach((entry, idx) => { snapshot[entry.id] = idx + 1; });

      if (configSnap) {
        await supabase.from('pool_config').update({ rank_snapshot: snapshot, updated_at: new Date().toISOString() }).eq('id', (configSnap as { id: string }).id);
      }
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
          today_score: espnScore.todayScore,
          current_hole: espnScore.currentHole,
          current_round: espnScore.currentRound,
          round1_score: espnScore.round1Score,
          round2_score: espnScore.round2Score,
          round3_score: espnScore.round3Score,
          round4_score: espnScore.round4Score,
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
