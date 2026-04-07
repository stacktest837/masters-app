import { createServiceClient } from '@/lib/supabase';
import type { Golfer, Score } from '@/types';
import { computeBestBallTeam, computeDailyWinners, sortEntries, computePayouts, type GolferHoleData, type BestBallTeamResult } from '@/lib/scoring';
import ScorecardClient from './ScorecardClient';

export const revalidate = 60;

export type ScorecardRow = {
  id: string;
  player_name: string;
  pickIds: string[];
  reserveId: string;
  picks: Golfer[];
  reserve: Golfer | null;
  result: BestBallTeamResult;
  rank: number;
  tied: boolean;
};

export default async function ScorecardPage() {
  const supabase = createServiceClient();

  const [{ data: entriesRaw }, { data: scoresRaw }, { data: holesRaw }] = await Promise.all([
    supabase
      .from('entries')
      .select(`
        *,
        pick_tier1:pick_tier1_id(id, name, tier, display_order),
        pick_tier2:pick_tier2_id(id, name, tier, display_order),
        pick_tier3:pick_tier3_id(id, name, tier, display_order),
        pick_tier4:pick_tier4_id(id, name, tier, display_order),
        reserve:reserve_id(id, name, tier, display_order)
      `)
      .order('created_at'),
    supabase.from('scores').select('golfer_id, status, score_to_par'),
    supabase.from('golfer_holes').select('golfer_id, round_number, hole_number, strokes, score_to_par'),
  ]);

  const scores = (scoresRaw as Pick<Score, 'golfer_id' | 'status' | 'score_to_par'>[] | null) ?? [];
  const statusMap = new Map<string, string>(scores.map((s) => [s.golfer_id, s.status]));

  const holeData: GolferHoleData[] = (
    holesRaw as { golfer_id: string; round_number: number; hole_number: number; strokes: number; score_to_par: number }[] | null ?? []
  ).map((h) => ({
    golferId: h.golfer_id,
    round: h.round_number,
    hole: h.hole_number,
    strokes: h.strokes,
    scoreToPar: h.score_to_par,
  }));

  const entries = (entriesRaw ?? []) as Record<string, unknown>[];

  const withResults = entries.map((entry) => {
    const pickIds = [
      entry.pick_tier1_id,
      entry.pick_tier2_id,
      entry.pick_tier3_id,
      entry.pick_tier4_id,
    ] as string[];
    const reserveId = entry.reserve_id as string;
    const result = computeBestBallTeam(pickIds, reserveId, holeData, statusMap);
    const picks = [entry.pick_tier1, entry.pick_tier2, entry.pick_tier3, entry.pick_tier4] as Golfer[];

    return {
      id: entry.id as string,
      player_name: entry.player_name as string,
      pickIds,
      reserveId,
      picks,
      reserve: entry.reserve as Golfer | null,
      total: result.total,
      result,
    };
  });

  const sorted = sortEntries(withResults);

  const rows: ScorecardRow[] = sorted.map((entry, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const tied = prev?.total !== null && prev?.total === entry.total;
    const rank = tied ? (sorted.findIndex((e) => e.total === entry.total) + 1) : idx + 1;
    return { ...entry, rank, tied };
  });

  // Daily winners
  const entryInputs = entries.map((e) => {
    const entry = e as Record<string, unknown>;
    return {
      id: entry.id as string,
      player_name: entry.player_name as string,
      pickIds: [entry.pick_tier1_id, entry.pick_tier2_id, entry.pick_tier3_id, entry.pick_tier4_id] as string[],
      reserveId: entry.reserve_id as string,
    };
  });

  const dailyWinners = computeDailyWinners(entryInputs, holeData, statusMap);
  const payouts = computePayouts(rows.length);
  const hasScores = holeData.length > 0;

  return (
    <ScorecardClient
      rows={rows}
      holeData={holeData}
      dailyWinners={dailyWinners}
      payouts={payouts}
      hasScores={hasScores}
      statusMap={Object.fromEntries(statusMap)}
    />
  );
}
