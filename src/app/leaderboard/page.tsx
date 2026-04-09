import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase';
import type { Golfer, Score } from '@/types';
import { computeBestBallTeam, computeDailyWinners, type DailyWinner, type BestBallRound, type GolferHoleData } from '@/lib/scoring';
import RefreshButton from './RefreshButton';
import LeaderboardClient from './LeaderboardClient';

export const revalidate = 60;

export type { DailyWinner, BestBallRound };

export type PickDetail = {
  golfer: Golfer;
  score: number | null;       // individual golfer's tournament score-to-par
  status: string | undefined;
  todayScore: number | null;
  currentHole: number | null;
  currentRound: number | null;
};

export type RankedEntry = {
  id: string;
  player_name: string;
  total: number | null;        // best-ball total score-to-par
  totalStrokes: number | null; // best-ball total raw strokes
  rounds: BestBallRound[];
  reserveUsed: boolean;
  picks: PickDetail[];
  reserve: Golfer | null;
  rank: number;
  tied: boolean;
  movement: number | null;
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: { preview?: string };
}) {
  const supabase = createServiceClient();

  // Guard: leaderboard is hidden until picks are locked (admin preview bypasses this)
  const isPreview = searchParams?.preview === process.env.ADMIN_PASSWORD;
  const { data: lockCheck } = await supabase.from('pool_config').select('picks_locked').single();
  if (!lockCheck?.picks_locked && !isPreview) redirect('/pick');

  const [{ data: entriesRaw }, { data: scoresRaw }, { data: holesRaw }, { data: configRaw }] =
    await Promise.all([
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
      supabase.from('scores').select('*'),
      supabase.from('golfer_holes').select('golfer_id, round_number, hole_number, strokes, score_to_par'),
      supabase.from('pool_config').select('rank_snapshot').single(),
    ]);

  const rankSnapshot: Record<string, number> =
    (configRaw as { rank_snapshot?: Record<string, number> } | null)?.rank_snapshot ?? {};

  const scores = (scoresRaw as Score[] | null) ?? [];
  const statusMap = new Map<string, string>(scores.map((s) => [s.golfer_id, s.status]));
  const scoreMap = new Map<string, number>(scores.map((s) => [s.golfer_id, s.score_to_par]));
  const todayMap = new Map<string, number | null>(scores.map((s) => [s.golfer_id, s.today_score ?? null]));
  const holeMap = new Map<string, number | null>(scores.map((s) => [s.golfer_id, s.current_hole ?? null]));
  const roundMap = new Map<string, number | null>(scores.map((s) => [s.golfer_id, s.current_round ?? null]));

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

  const withScores = entries.map((entry) => {
    const pickIds = [
      entry.pick_tier1_id,
      entry.pick_tier2_id,
      entry.pick_tier3_id,
      entry.pick_tier4_id,
    ] as string[];

    const result = computeBestBallTeam(pickIds, entry.reserve_id as string, holeData, statusMap);
    const golfers = [entry.pick_tier1, entry.pick_tier2, entry.pick_tier3, entry.pick_tier4] as Golfer[];

    // TB1: best single best-ball round score across all 4 rounds
    const roundScores = result.rounds
      .map((r) => r.scoreToPar)
      .filter((s): s is number => s !== null);
    const bestBallRound = roundScores.length > 0 ? Math.min(...roundScores) : null;

    // TB2: best individual golfer round (raw strokes)
    const allIds = [...pickIds, entry.reserve_id as string];
    const golferRoundStrokes: number[] = [];
    for (const gid of allIds) {
      for (const r of [1, 2, 3, 4]) {
        const gh = holeData.filter((h) => h.golferId === gid && h.round === r);
        if (gh.length > 0) golferRoundStrokes.push(gh.reduce((sum, h) => sum + h.strokes, 0));
      }
    }
    const bestIndividualRound = golferRoundStrokes.length > 0 ? Math.min(...golferRoundStrokes) : null;

    return {
      id: entry.id as string,
      player_name: entry.player_name as string,
      total: result.total,
      totalStrokes: result.totalStrokes,
      rounds: result.rounds,
      reserveUsed: result.reserveUsed,
      bestBallRound,
      bestIndividualRound,
      picks: pickIds.map((id, i) => ({
        golfer: golfers[i],
        score: scoreMap.get(id) ?? null,
        status: statusMap.get(id),
        todayScore: todayMap.get(id) ?? null,
        currentHole: holeMap.get(id) ?? null,
        currentRound: roundMap.get(id) ?? null,
      })),
      reserve: entry.reserve as Golfer | null,
    };
  });

  const sorted = [...withScores].sort((a, b) => {
    if (a.total === null && b.total === null) return 0;
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    if (a.total !== b.total) return a.total - b.total;
    // TB1: lowest single best-ball round
    const ab = a.bestBallRound ?? Infinity;
    const bb = b.bestBallRound ?? Infinity;
    if (ab !== bb) return ab - bb;
    // TB2: lowest individual golfer round
    const ai = a.bestIndividualRound ?? Infinity;
    const bi = b.bestIndividualRound ?? Infinity;
    return ai - bi;
    // TB3: split — stable sort preserves original order
  });

  const ranked: RankedEntry[] = sorted.map((entry, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const tied = prev?.total !== null && prev?.total === entry.total;
    const rank = tied ? (sorted.findIndex((e) => e.total === entry.total) + 1) : idx + 1;
    const prevRank = rankSnapshot[entry.id] ?? null;
    const movement = prevRank !== null ? prevRank - rank : null;
    return { ...entry, rank, tied, movement };
  });

  // Daily winners computed from best-ball hole data
  const entryInputs = entries.map((e) => {
    const entry = e as Record<string, unknown>;
    return {
      id: entry.id as string,
      player_name: entry.player_name as string,
      pickIds: [
        entry.pick_tier1_id,
        entry.pick_tier2_id,
        entry.pick_tier3_id,
        entry.pick_tier4_id,
      ] as string[],
      reserveId: entry.reserve_id as string,
    };
  });

  const dailyWinners = computeDailyWinners(entryInputs, holeData, statusMap);

  const poolGolferIds = new Set(
    entries.flatMap((e) => [
      e.pick_tier1_id, e.pick_tier2_id, e.pick_tier3_id, e.pick_tier4_id, e.reserve_id,
    ] as string[])
  );
  const hasScores = scores.some((s) => poolGolferIds.has(s.golfer_id) && s.score_to_par != null);
  const lastUpdated = scores.length > 0
    ? scores.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), scores[0].updated_at)
    : null;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">
            {hasScores ? '🟢 Live' : '⏳ Pre-Tournament'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastUpdated
              ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET`
              : `${ranked.length} ${ranked.length === 1 ? 'entry' : 'entries'} · Picks open through Thu Apr 9`}
          </p>
        </div>
        <RefreshButton />
      </div>

      <LeaderboardClient ranked={ranked} hasScores={hasScores} dailyWinners={dailyWinners} entryCount={ranked.length} />
    </div>
  );
}
