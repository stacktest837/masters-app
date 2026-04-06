import { createServiceClient } from '@/lib/supabase';
import type { Golfer, Score } from '@/types';
import { calculateTeamScore, sortEntries } from '@/lib/scoring';
import RefreshButton from './RefreshButton';

export const revalidate = 60;

function fmt(score: number | null, status?: string): string {
  if (score === null) return '—';
  if (score === 999 || status === 'cut' || status === 'wd') return 'MC';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : String(score);
}

function ScoreChip({
  score,
  status,
  replaced,
}: {
  score: number | null;
  status?: string;
  replaced?: boolean;
}) {
  const mc = score === 999 || status === 'cut' || status === 'wd';
  const display = fmt(score, status);
  return (
    <span
      className={[
        'text-xs font-mono px-1.5 py-0.5 rounded',
        mc || replaced
          ? 'line-through text-gray-400 bg-gray-100'
          : score === null
          ? 'text-gray-400 bg-gray-50'
          : score < 0
          ? 'text-red-600 bg-red-50'
          : score === 0
          ? 'text-gray-600 bg-gray-100'
          : 'text-gray-600 bg-gray-100',
      ].join(' ')}
    >
      {display}
    </span>
  );
}

export default async function LeaderboardPage() {
  const supabase = createServiceClient();

  const [{ data: entriesRaw }, { data: scoresRaw }, { data: config }] = await Promise.all([
    supabase.from('entries').select(`
      *,
      pick_tier1:pick_tier1_id(id, name, tier, display_order),
      pick_tier2:pick_tier2_id(id, name, tier, display_order),
      pick_tier3:pick_tier3_id(id, name, tier, display_order),
      pick_tier4:pick_tier4_id(id, name, tier, display_order),
      reserve:reserve_id(id, name, tier, display_order)
    `).order('created_at'),
    supabase.from('scores').select('*'),
    supabase.from('pool_config').select('*').single(),
  ]);

  const scores = (scoresRaw as Score[] | null) || [];
  const scoreMap = new Map<string, number>(scores.map((s) => [s.golfer_id, s.score_to_par]));
  const statusMap = new Map<string, string>(scores.map((s) => [s.golfer_id, s.status]));

  const entries = (entriesRaw || []) as ReturnType<typeof Object.assign>[];

  const ranked = sortEntries(
    entries.map((entry) => {
      const result = calculateTeamScore(
        {
          pickIds: [entry.pick_tier1_id, entry.pick_tier2_id, entry.pick_tier3_id, entry.pick_tier4_id],
          reserveId: entry.reserve_id,
          tiebreaker: entry.tiebreaker,
        },
        scoreMap
      );
      return { entry, ...result, total: result.total, tiebreaker: entry.tiebreaker };
    })
  );

  const hasScores = scores.length > 0;
  const lastUpdated = hasScores
    ? scores.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), scores[0].updated_at)
    : null;

  const tournamentLive = hasScores;
  const isLocked = config?.picks_locked ?? false;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-masters-green">Leaderboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {!tournamentLive
              ? isLocked
                ? 'Tournament underway — scores syncing soon'
                : `Picks open through Thu Apr 9, 8 AM ET · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
              : lastUpdated
              ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET`
              : ''}
          </p>
        </div>
        <RefreshButton />
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⛳</p>
          <p className="font-medium">No picks yet</p>
          <a href="/pick" className="text-masters-green text-sm mt-2 inline-block hover:underline">
            Be the first to pick →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map(({ entry, total, reserveUsed, golferDetails, tiebreaker }, idx) => {
            const prev = idx > 0 ? ranked[idx - 1] : null;
            const tied = prev?.total === total && total !== null;
            const rank = tied ? '' : `${idx + 1}`;

            const picks = [
              { golfer: entry.pick_tier1 as Golfer, id: entry.pick_tier1_id, tier: 1 },
              { golfer: entry.pick_tier2 as Golfer, id: entry.pick_tier2_id, tier: 2 },
              { golfer: entry.pick_tier3 as Golfer, id: entry.pick_tier3_id, tier: 3 },
              { golfer: entry.pick_tier4 as Golfer, id: entry.pick_tier4_id, tier: 4 },
            ];

            return (
              <div
                key={entry.id}
                className={[
                  'bg-white rounded-lg border overflow-hidden',
                  idx === 0 && total !== null
                    ? 'border-masters-gold shadow-sm'
                    : 'border-gray-200',
                ].join(' ')}
              >
                {/* Entry header */}
                <div
                  className={[
                    'flex items-center justify-between px-4 py-3',
                    idx === 0 && total !== null ? 'bg-masters-gold/10' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5 text-center">{rank}</span>
                    <span className="font-bold text-masters-green">{entry.player_name}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={[
                        'text-lg font-bold font-mono',
                        total === null
                          ? 'text-gray-400'
                          : total < 0
                          ? 'text-red-600'
                          : total === 0
                          ? 'text-gray-700'
                          : 'text-gray-700',
                      ].join(' ')}
                    >
                      {fmt(total)}
                    </span>
                    {reserveUsed && (
                      <span className="text-xs text-gray-400 block">reserve used</span>
                    )}
                  </div>
                </div>

                {/* Golfer breakdown */}
                <div className="px-4 pb-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5">
                    {picks.map(({ golfer, id }, i) => {
                      const detail = golferDetails[i];
                      const score = scoreMap.get(id) ?? null;
                      const status = statusMap.get(id);
                      return (
                        <div key={id} className="flex items-center justify-between gap-2">
                          <span
                            className={[
                              'text-xs truncate',
                              detail?.replaced || score === 999
                                ? 'line-through text-gray-400'
                                : 'text-gray-700',
                            ].join(' ')}
                          >
                            {golfer?.name ?? '—'}
                          </span>
                          <ScoreChip score={score} status={status} replaced={detail?.replaced} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Reserve */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-2">
                    <span>
                      Reserve:{' '}
                      <span className={reserveUsed ? 'text-masters-green font-medium' : ''}>
                        {(entry.reserve as Golfer)?.name ?? '—'}
                        {reserveUsed ? ' (in)' : ''}
                      </span>
                    </span>
                    <span>TB: {tiebreaker < 0 ? tiebreaker : tiebreaker === 0 ? 'E' : `+${tiebreaker}`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
