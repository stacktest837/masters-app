'use client';

import { useState } from 'react';
import type { Golfer } from '@/types';

interface Props {
  tier1: Golfer[];
  tier2: Golfer[];
  tier3: Golfer[];
  tier4: Golfer[];
  isLocked: boolean;
}

interface Picks {
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;
  reserve: string;
}

const EMPTY_PICKS: Picks = { tier1: '', tier2: '', tier3: '', tier4: '', reserve: '' };

const TIER_LABELS: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Tier 1 — Favorites', subtitle: 'Scheffler, McIlroy, Rahm and the elite' },
  2: { title: 'Tier 2 — Contenders', subtitle: 'Former major winners and top-10 threats' },
  3: { title: 'Tier 3 — Dark Horses', subtitle: 'Capable of making a run' },
  4: { title: 'Tier 4 — The Field', subtitle: 'Long shots and sentimental picks' },
};

function GolferCard({
  golfer,
  selected,
  onClick,
}: {
  golfer: Golfer;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2.5 rounded border-2 text-sm transition-all leading-tight',
        selected
          ? 'border-masters-gold bg-masters-gold/10 font-semibold text-masters-green-dark'
          : 'border-gray-200 bg-white hover:border-masters-green/40 text-gray-700',
      ].join(' ')}
    >
      {golfer.name}
    </button>
  );
}

function TierSection({
  tier,
  golfers,
  selected,
  onSelect,
  scrollable = false,
}: {
  tier: number;
  golfers: Golfer[];
  selected: string;
  onSelect: (id: string) => void;
  scrollable?: boolean;
}) {
  const label = TIER_LABELS[tier];
  return (
    <section className="mb-5">
      <div className="bg-masters-green text-white px-4 py-2.5 rounded-t-lg">
        <h2 className="font-bold text-masters-gold text-sm uppercase tracking-wide">{label.title}</h2>
        <p className="text-green-200 text-xs mt-0.5">{label.subtitle}</p>
      </div>
      <div className="border border-masters-green/20 border-t-0 rounded-b-lg bg-white p-3">
        <div
          className={[
            'grid grid-cols-2 gap-2',
            scrollable ? 'max-h-56 overflow-y-auto pr-1' : '',
          ].join(' ')}
        >
          {golfers.map((g) => (
            <GolferCard key={g.id} golfer={g} selected={selected === g.id} onClick={() => onSelect(g.id)} />
          ))}
        </div>
        {!selected && (
          <p className="text-xs text-red-400 mt-2">Pick one golfer from this tier</p>
        )}
      </div>
    </section>
  );
}

export default function PickForm({ tier1, tier2, tier3, tier4, isLocked }: Props) {
  const [picks, setPicks] = useState<Picks>(EMPTY_PICKS);
  const [playerName, setPlayerName] = useState('');
  const [tiebreaker, setTiebreaker] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingMsg, setExistingMsg] = useState('');

  const reserveOptions = tier4.filter((g) => g.id !== picks.tier4);

  function handlePick(tier: keyof Picks, id: string) {
    setPicks((prev) => {
      const next = { ...prev, [tier]: id };
      // clear reserve if it conflicts with new tier4 pick
      if (tier === 'tier4' && prev.reserve === id) next.reserve = '';
      return next;
    });
  }

  async function loadExistingPicks() {
    const name = playerName.trim();
    if (!name.includes(' ')) {
      setExistingMsg('Enter your first and last name first');
      return;
    }
    setLoadingExisting(true);
    setExistingMsg('');
    try {
      const res = await fetch(`/api/entries?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (json.entry) {
        const e = json.entry;
        setPicks({
          tier1: e.pick_tier1_id,
          tier2: e.pick_tier2_id,
          tier3: e.pick_tier3_id,
          tier4: e.pick_tier4_id,
          reserve: e.reserve_id,
        });
        setTiebreaker(String(e.tiebreaker));
        setExistingMsg('Existing picks loaded — submit to update');
      } else {
        setExistingMsg('No existing picks found for that name');
      }
    } catch {
      setExistingMsg('Could not load picks — try again');
    } finally {
      setLoadingExisting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const name = playerName.trim();
    if (!name.includes(' ')) {
      setSubmitError('Enter your first and last name');
      return;
    }
    if (!picks.tier1 || !picks.tier2 || !picks.tier3 || !picks.tier4 || !picks.reserve) {
      setSubmitError('Make all picks and select a reserve before submitting');
      return;
    }
    if (tiebreaker === '' || isNaN(Number(tiebreaker))) {
      setSubmitError('Enter your tiebreaker guess (any integer)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: name,
          pick_tier1_id: picks.tier1,
          pick_tier2_id: picks.tier2,
          pick_tier3_id: picks.tier3,
          pick_tier4_id: picks.tier4,
          reserve_id: picks.reserve,
          tiebreaker: Number(tiebreaker),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || 'Submission failed');
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const golferById = (id: string) =>
    [...tier1, ...tier2, ...tier3, ...tier4].find((g) => g.id === id);

  if (submitted) {
    return (
      <div className="text-center">
        <div className="bg-masters-green text-white rounded-lg px-6 py-8 mb-6">
          <div className="text-4xl mb-3">⛳</div>
          <h2 className="text-xl font-bold text-masters-gold mb-1">Picks Submitted!</h2>
          <p className="text-green-200 text-sm">Good luck, {playerName.split(' ')[0]}.</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-left mb-5 text-sm">
          <h3 className="font-bold text-masters-green mb-3 uppercase tracking-wide text-xs">Your Picks</h3>
          {(['tier1', 'tier2', 'tier3', 'tier4'] as const).map((t, i) => {
            const g = golferById(picks[t]);
            return g ? (
              <div key={t} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-500">Tier {i + 1}</span>
                <span className="font-medium text-gray-800">{g.name}</span>
              </div>
            ) : null;
          })}
          {golferById(picks.reserve) && (
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Reserve</span>
              <span className="font-medium text-gray-800">{golferById(picks.reserve)!.name}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <span className="text-gray-500">Tiebreaker</span>
            <span className="font-medium text-gray-800">
              {Number(tiebreaker) === 0 ? 'E' : Number(tiebreaker) > 0 ? `+${tiebreaker}` : tiebreaker}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setSubmitted(false); setExistingMsg(''); }}
            className="flex-1 border-2 border-masters-green text-masters-green font-semibold py-3 rounded-lg hover:bg-masters-green/5 transition-colors"
          >
            Edit My Picks
          </button>
          <a
            href="/leaderboard"
            className="flex-1 bg-masters-green text-white font-semibold py-3 rounded-lg hover:bg-masters-green-dark transition-colors text-center"
          >
            View Leaderboard
          </a>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-masters-green mb-2">Picks Are Locked</h2>
        <p className="text-gray-500 text-sm mb-6">The tournament has started. No more changes.</p>
        <a
          href="/leaderboard"
          className="inline-block bg-masters-green text-white font-semibold px-6 py-3 rounded-lg hover:bg-masters-green-dark transition-colors"
        >
          View Leaderboard →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-masters-green mb-1">Make Your Picks</h2>
        <p className="text-gray-500 text-sm">
          Pick 1 golfer from each tier. Choose a Tier 4 reserve in case your pick misses the cut.
          Lowest combined score-to-par wins.
        </p>
      </div>

      <TierSection tier={1} golfers={tier1} selected={picks.tier1} onSelect={(id) => handlePick('tier1', id)} />
      <TierSection tier={2} golfers={tier2} selected={picks.tier2} onSelect={(id) => handlePick('tier2', id)} />
      <TierSection tier={3} golfers={tier3} selected={picks.tier3} onSelect={(id) => handlePick('tier3', id)} />
      <TierSection tier={4} golfers={tier4} selected={picks.tier4} onSelect={(id) => handlePick('tier4', id)} scrollable />

      {/* Reserve */}
      <section className="mb-5">
        <div className="bg-masters-green-dark text-white px-4 py-2.5 rounded-t-lg">
          <h2 className="font-bold text-masters-gold text-sm uppercase tracking-wide">Reserve</h2>
          <p className="text-green-200 text-xs mt-0.5">
            Tier 4 only · replaces your Tier 4 pick if they miss the cut
          </p>
        </div>
        <div className="border border-masters-green/20 border-t-0 rounded-b-lg bg-white p-3">
          {!picks.tier4 ? (
            <p className="text-sm text-gray-400 italic">Select your Tier 4 pick first</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {reserveOptions.map((g) => (
                <GolferCard
                  key={g.id}
                  golfer={g}
                  selected={picks.reserve === g.id}
                  onClick={() => handlePick('reserve', g.id)}
                />
              ))}
            </div>
          )}
          {picks.tier4 && !picks.reserve && (
            <p className="text-xs text-red-400 mt-2">Pick a reserve</p>
          )}
        </div>
      </section>

      {/* Player info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <h3 className="font-bold text-masters-green text-sm uppercase tracking-wide mb-3">Your Info</h3>
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1" htmlFor="playerName">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="playerName"
              type="text"
              placeholder="First Last"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setExistingMsg(''); }}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-masters-green"
            />
            <button
              type="button"
              onClick={loadExistingPicks}
              disabled={loadingExisting}
              className="text-sm border border-masters-green text-masters-green px-3 py-2 rounded hover:bg-masters-green/5 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {loadingExisting ? '…' : 'Find My Picks'}
            </button>
          </div>
          {existingMsg && (
            <p className={`text-xs mt-1 ${existingMsg.includes('loaded') ? 'text-masters-green' : 'text-gray-500'}`}>
              {existingMsg}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1" htmlFor="tiebreaker">
            Tiebreaker — winner&apos;s score guess{' '}
            <span className="text-gray-400 font-normal">(e.g. -12 for twelve under par)</span>
          </label>
          <input
            id="tiebreaker"
            type="number"
            placeholder="-12"
            value={tiebreaker}
            onChange={(e) => setTiebreaker(e.target.value)}
            className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-masters-green"
          />
        </div>
      </div>

      {submitError && (
        <p className="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-masters-green hover:bg-masters-green-dark text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-60 text-base"
      >
        {submitting ? 'Submitting…' : 'Submit Picks'}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">
        Picks lock Thursday April 9, 8 AM ET · You can edit until then
      </p>
    </form>
  );
}
