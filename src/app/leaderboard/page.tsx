import { createServiceClient } from '@/lib/supabase';
import type { Golfer, Score } from '@/types';
import { calculateTeamScore, sortEntries } from '@/lib/scoring';
import RefreshButton from './RefreshButton';
import LeaderboardClient from './LeaderboardClient';

export const revalidate = 60;

export type RankedEntry = {
  id: string;
  player_name: string;
  total: number | null;
  tiebreaker: number;
  reserveUsed: boolean;
  picks: { golfer: Golfer; score: number | null; status: string | undefined; replaced: boolean }[];
  reserve: Golfer | null;
  rank: number;
  tied: boolean;
};

export default async function LeaderboardPage() {
  const supabase = createServiceClient();

  const [{ data: entriesRaw }, { data: scoresRaw }] = await Promise.all([
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
  ]);

  const scores = (scoresRaw as Score[] | null) ?? [];
  const scoreMap = new Map<string, number>(scores.map((s) => [s.golfer_id, s.score_to_par]));
  const statusMap = new Map<string, string>(scores.map((s) => [s.golfer_id, s.status]));

  const entries = (entriesRaw ?? []) as Record<string, unknown>[];

  const withScores = entries.map((entry) => {
    const pickIds = [
      entry.pick_tier1_id,
      entry.pick_tier2_id,
      entry.pick_tier3_id,
      entry.pick_tier4_id,
    ] as string[];

    const result = calculateTeamScore(
      { pickIds, reserveId: entry.reserve_id as string, tiebreaker: entry.tiebreaker as number },
      scoreMap
    );

    const golfers = [entry.pick_tier1, entry.pick_tier2, entry.pick_tier3, entry.pick_tier4] as Golfer[];

    return {
      id: entry.id as string,
      player_name: entry.player_name as string,
      total: result.total,
      tiebreaker: entry.tiebreaker as number,
      reserveUsed: result.reserveUsed,
      picks: pickIds.map((id, i) => ({
        golfer: golfers[i],
        score: scoreMap.get(id) ?? null,
        status: statusMap.get(id),
        replaced: result.golferDetails[i]?.replaced ?? false,
      })),
      reserve: entry.reserve as Golfer | null,
    };
  });

  const sorted = sortEntries(withScores);

  const ranked: RankedEntry[] = sorted.map((entry, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const tied = prev?.total !== null && prev?.total === entry.total;
    const rank = tied ? (sorted.findIndex((e) => e.total === entry.total) + 1) : idx + 1;
    return { ...entry, rank, tied };
  });

  const hasScores = scores.length > 0;
  const lastUpdated = hasScores
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

      {/* Leaderboard with client-side name lookup */}
      <LeaderboardClient ranked={ranked} hasScores={hasScores} />
    </div>
  );
}
