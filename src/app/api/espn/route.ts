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

    // Capture rank snapshot BEFORE overwriting scores (uses current hole data)
    const [{ data: entriesSnap }, { data: holesSnap }, { data: scoresSnap }, { data: configSnap }] =
      await Promise.all([
        supabase.from('entries').select('id, pick_tier1_id, pick_tier2_id, pick_tier3_id, pick_tier4_id, reserve_id'),
        supabase.from('golfer_holes').select('golfer_id, round_number, hole_number, strokes, score_to_par'),
        supabase.from('scores').select('golfer_id, status'),
        supabase.from('pool_config').select('id').single(),
      ]);

    if (entriesSnap && holesSnap) {
      const { computeBestBallTeam, sortEntries } = await import('@/lib/scoring');
      const statusMap = new Map<string, string>(
        (scoresSnap ?? []).map((s: { golfer_id: string; status: string }) => [s.golfer_id, s.status])
      );
      const holeData = (holesSnap as { golfer_id: string; round_number: number; hole_number: number; strokes: number; score_to_par: number }[]).map((h) => ({
        golferId: h.golfer_id,
        round: h.round_number,
        hole: h.hole_number,
        strokes: h.strokes,
        scoreToPar: h.score_to_par,
      }));

      const withScores = (entriesSnap as { id: string; pick_tier1_id: string; pick_tier2_id: string; pick_tier3_id: string; pick_tier4_id: string; reserve_id: string }[]).map((e) => ({
        id: e.id,
        ...computeBestBallTeam(
          [e.pick_tier1_id, e.pick_tier2_id, e.pick_tier3_id, e.pick_tier4_id],
          e.reserve_id,
          holeData,
          statusMap
        ),
      }));

      const sorted = sortEntries(withScores);
      const snapshot: Record<string, number> = {};
      sorted.forEach((entry, idx) => { snapshot[entry.id] = idx + 1; });

      if (configSnap) {
        await supabase
          .from('pool_config')
          .update({ rank_snapshot: snapshot, updated_at: new Date().toISOString() })
          .eq('id', (configSnap as { id: string }).id);
      }
    }

    // Sync scores and hole data
    let synced = 0;
    const unmatched: string[] = [];
    const now = new Date().toISOString();

    for (const espnScore of espnScores) {
      const matchedName = matchGolferName(espnScore.golferName, poolNames);
      if (!matchedName) {
        unmatched.push(espnScore.golferName);
        continue;
      }
      const golfer = (golfers || []).find((g) => g.name === matchedName);
      if (!golfer) continue;

      // Upsert aggregate score row
      const { error: scoreErr } = await supabase.from('scores').upsert(
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
          updated_at: now,
        },
        { onConflict: 'golfer_id' }
      );

      // Upsert hole-by-hole data
      if (espnScore.holeScores.length > 0) {
        const holeRows = espnScore.holeScores.map((h) => ({
          golfer_id: golfer.id,
          round_number: h.round,
          hole_number: h.hole,
          strokes: h.strokes,
          score_to_par: h.scoreToPar,
          updated_at: now,
        }));

        await supabase
          .from('golfer_holes')
          .upsert(holeRows, { onConflict: 'golfer_id,round_number,hole_number' });
      }

      if (!scoreErr) synced++;
    }

    return NextResponse.json({ ok: true, synced, unmatched, status: tournamentStatus });
  } catch (err) {
    console.error('POST /api/espn:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
