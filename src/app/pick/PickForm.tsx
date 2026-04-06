'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
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

const TIER_META: Record<number, { label: string; description: string }> = {
  1: { label: 'Tier 1', description: 'The Favorites' },
  2: { label: 'Tier 2', description: 'The Contenders' },
  3: { label: 'Tier 3', description: 'Dark Horses' },
  4: { label: 'Tier 4', description: 'The Field' },
};

// ── Golfer card ────────────────────────────────────────────────────────────

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
      className={cn(
        'pressable select-none relative flex items-center gap-2.5 w-full p-3 rounded-xl border-2 text-left transition-all duration-150',
        selected
          ? 'bg-masters-green border-masters-gold shadow-gold'
          : 'bg-white border-gray-100 hover:border-masters-green/20 hover:shadow-sm active:bg-gray-50'
      )}
    >
      {/* Radio indicator */}
      <span
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150',
          selected ? 'border-masters-gold bg-masters-gold' : 'border-gray-300 bg-white'
        )}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-masters-green-dark block" />}
      </span>

      <span
        className={cn(
          'text-sm font-medium leading-tight',
          selected ? 'text-white' : 'text-gray-800'
        )}
      >
        {golfer.name}
      </span>

      {selected && (
        <span className="ml-auto text-masters-gold text-xs font-bold">✓</span>
      )}
    </button>
  );
}

// ── Tier section ────────────────────────────────────────────────────────────

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
  const meta = TIER_META[tier];
  const hasPick = Boolean(selected);

  return (
    <div className="mb-4 rounded-2xl overflow-hidden shadow-card animate-fade-in">
      {/* Section header */}
      <div className="bg-masters-green px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-masters-gold text-[10px] font-bold uppercase tracking-[0.2em]">
            {meta.label}
          </p>
          <p className="text-white font-serif text-base mt-0.5">{meta.description}</p>
        </div>
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
            hasPick
              ? 'bg-masters-gold text-masters-green-dark scale-110'
              : 'bg-white/10 text-white/40'
          )}
        >
          {hasPick ? '✓' : tier}
        </div>
      </div>

      {/* Golfer grid */}
      <div className="bg-white p-3">
        <div
          className={cn(
            'grid grid-cols-2 gap-2',
            scrollable ? 'max-h-60 overflow-y-auto no-scrollbar pr-0.5' : ''
          )}
        >
          {golfers.map((g) => (
            <GolferCard key={g.id} golfer={g} selected={selected === g.id} onClick={() => onSelect(g.id)} />
          ))}
        </div>
        {!hasPick && (
          <p className="text-xs text-red-400/80 mt-2 pl-1">Select one golfer</p>
        )}
      </div>
    </div>
  );
}

// ── Score formatter ─────────────────────────────────────────────────────────

function fmtScore(n: number) {
  return n < 0 ? String(n) : n === 0 ? 'E' : `+${n}`;
}

// ── Locked read-only view ────────────────────────────────────────────────────

interface LockedEntry {
  player_name: string;
  pick_tier1: Golfer;
  pick_tier2: Golfer;
  pick_tier3: Golfer;
  pick_tier4: Golfer;
  reserve: Golfer;
  tiebreaker: number;
}

function LockedView({ entry }: { entry: LockedEntry }) {
  const picks = [entry.pick_tier1, entry.pick_tier2, entry.pick_tier3, entry.pick_tier4];
  return (
    <div className="animate-scale-in">
      <div className="bg-masters-green rounded-2xl px-5 py-6 mb-4 text-center">
        <p className="text-masters-gold text-[10px] uppercase tracking-widest mb-1">🔒 Picks Locked</p>
        <h2 className="font-serif text-white text-xl font-bold">
          {entry.player_name.split(' ')[0]}&apos;s Team
        </h2>
        <p className="text-white/50 text-xs mt-1">Tournament underway — good luck!</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
        {picks.map((g, i) => (
          <div
            key={g.id}
            className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0"
          >
            <div>
              <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">
                Tier {i + 1}
              </p>
              <p className="text-gray-800 font-medium text-sm mt-0.5">{g.name}</p>
            </div>
            <span className="text-xs text-white bg-masters-green/80 rounded-full px-2 py-0.5 font-semibold">
              T{i + 1}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Reserve</p>
            <p className="text-gray-600 font-medium text-sm mt-0.5">{entry.reserve.name}</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5 font-semibold">
            RSV
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">Tiebreaker guess</p>
          <p className="text-sm font-bold text-masters-green font-mono">
            {fmtScore(entry.tiebreaker)}
          </p>
        </div>
      </div>

      <a
        href="/leaderboard"
        className="flex items-center justify-center gap-2 w-full bg-masters-green text-white font-semibold py-4 rounded-2xl hover:bg-masters-green-dark transition-colors pressable"
      >
        View Live Leaderboard →
      </a>
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export default function PickForm({ tier1, tier2, tier3, tier4, isLocked }: Props) {
  const allGolfers = [...tier1, ...tier2, ...tier3, ...tier4];

  const [nameInput, setNameInput] = useState('');
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');
  const [loadedEntry, setLoadedEntry] = useState<LockedEntry | null>(null);

  const [picks, setPicks] = useState<Picks>(EMPTY_PICKS);
  const [tiebreaker, setTiebreaker] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const lookupTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reserveOptions = tier4.filter((g) => g.id !== picks.tier4);

  // Auto-lookup when name has first + last
  useEffect(() => {
    clearTimeout(lookupTimeout.current);
    const trimmed = nameInput.trim();
    if (!trimmed.includes(' ')) {
      setLookupStatus('idle');
      return;
    }
    setLookupStatus('loading');
    lookupTimeout.current = setTimeout(() => doLookup(trimmed), 600);
    return () => clearTimeout(lookupTimeout.current);
  }, [nameInput]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doLookup(name: string) {
    try {
      const res = await fetch(`/api/entries?name=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (json.entry) {
        const e = json.entry;
        setLoadedEntry(e);
        setPicks({
          tier1: e.pick_tier1_id,
          tier2: e.pick_tier2_id,
          tier3: e.pick_tier3_id,
          tier4: e.pick_tier4_id,
          reserve: e.reserve_id,
        });
        setTiebreaker(String(e.tiebreaker));
        setIsEditMode(true);
        setLookupStatus('found');
      } else {
        setLoadedEntry(null);
        setIsEditMode(false);
        setLookupStatus('not-found');
      }
    } catch {
      setLookupStatus('idle');
    }
  }

  function handlePick(tier: keyof Picks, id: string) {
    setPicks((prev) => {
      const next = { ...prev, [tier]: id };
      if (tier === 'tier4' && prev.reserve === id) next.reserve = '';
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const name = nameInput.trim();
    if (!name.includes(' ')) { setSubmitError('Enter your first and last name'); return; }
    if (!picks.tier1 || !picks.tier2 || !picks.tier3 || !picks.tier4 || !picks.reserve) {
      setSubmitError('Make all picks and choose a reserve before submitting');
      return;
    }
    if (tiebreaker === '' || isNaN(Number(tiebreaker))) {
      setSubmitError('Enter your tiebreaker guess');
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

  // ── Locked + picks found: show read-only view ──────────────────────────
  if (isLocked && lookupStatus === 'found' && loadedEntry) {
    return (
      <div>
        {/* Name input stays visible so they can switch entries */}
        <div className="mb-5">
          <NameInput
            value={nameInput}
            onChange={setNameInput}
            status={lookupStatus}
            isLocked={isLocked}
          />
        </div>
        <LockedView entry={loadedEntry} />
      </div>
    );
  }

  // ── Locked + no picks found yet ────────────────────────────────────────
  if (isLocked) {
    return (
      <div>
        <div className="bg-white rounded-2xl shadow-card p-5 mb-4 animate-fade-in">
          <div className="text-center mb-5">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="font-serif text-masters-green text-xl font-bold mb-1">
              Picks Are Locked
            </h2>
            <p className="text-gray-400 text-sm">The tournament has started.</p>
          </div>

          <p className="text-sm font-medium text-gray-700 mb-2">Look up your picks:</p>
          <NameInput
            value={nameInput}
            onChange={setNameInput}
            status={lookupStatus}
            isLocked={isLocked}
          />
          {lookupStatus === 'not-found' && (
            <p className="text-xs text-gray-400 mt-2">No entry found for that name.</p>
          )}
        </div>

        <a
          href="/leaderboard"
          className="flex items-center justify-center gap-2 w-full bg-masters-green text-white font-semibold py-4 rounded-2xl hover:bg-masters-green-dark transition-colors pressable"
        >
          View Leaderboard →
        </a>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (submitted) {
    const golferById = (id: string) => allGolfers.find((g) => g.id === id);
    const tierPicks = [picks.tier1, picks.tier2, picks.tier3, picks.tier4].map(golferById);
    const reservePick = golferById(picks.reserve);

    return (
      <div className="animate-scale-in">
        <div className="bg-masters-green rounded-2xl px-5 py-8 mb-4 text-center">
          <div className="text-4xl mb-3">⛳</div>
          <h2 className="font-serif text-masters-gold text-xl font-bold mb-1">
            {isEditMode ? 'Picks Updated!' : 'Picks Submitted!'}
          </h2>
          <p className="text-white/60 text-sm">
            Good luck, {nameInput.trim().split(' ')[0]}.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4">
          {tierPicks.map((g, i) =>
            g ? (
              <div
                key={g.id}
                className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-[10px] text-masters-gold font-bold uppercase tracking-widest">
                    Tier {i + 1}
                  </p>
                  <p className="text-gray-800 font-medium text-sm mt-0.5">{g.name}</p>
                </div>
              </div>
            ) : null
          )}
          {reservePick && (
            <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Reserve</p>
                <p className="text-gray-600 font-medium text-sm mt-0.5">{reservePick.name}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">Tiebreaker guess</p>
            <p className="text-sm font-bold text-masters-green font-mono">{fmtScore(Number(tiebreaker))}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setSubmitted(false); }}
            className="flex-1 border-2 border-masters-green text-masters-green font-semibold py-3.5 rounded-2xl hover:bg-masters-green/5 transition-colors pressable text-sm"
          >
            Edit Picks
          </button>
          <a
            href="/leaderboard"
            className="flex-1 bg-masters-green text-white font-semibold py-3.5 rounded-2xl hover:bg-masters-green-dark transition-colors text-center text-sm pressable"
          >
            Leaderboard →
          </a>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────
  const allPicksMade = picks.tier1 && picks.tier2 && picks.tier3 && picks.tier4 && picks.reserve;

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {/* Name input + welcome banner */}
      <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
        <NameInput
          value={nameInput}
          onChange={setNameInput}
          status={lookupStatus}
          isLocked={isLocked}
        />

        {lookupStatus === 'found' && (
          <div className="mt-3 flex items-start gap-2.5 bg-masters-green/8 border border-masters-green/20 rounded-xl px-3 py-2.5 animate-fade-in">
            <span className="text-masters-green text-base mt-0.5">✓</span>
            <div>
              <p className="text-masters-green text-sm font-semibold">
                Welcome back, {nameInput.trim().split(' ')[0]}!
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Your current picks are loaded below. Submit to update them.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tiers */}
      <TierSection tier={1} golfers={tier1} selected={picks.tier1} onSelect={(id) => handlePick('tier1', id)} />
      <TierSection tier={2} golfers={tier2} selected={picks.tier2} onSelect={(id) => handlePick('tier2', id)} />
      <TierSection tier={3} golfers={tier3} selected={picks.tier3} onSelect={(id) => handlePick('tier3', id)} />
      <TierSection tier={4} golfers={tier4} selected={picks.tier4} onSelect={(id) => handlePick('tier4', id)} scrollable />

      {/* Reserve */}
      <div className="rounded-2xl overflow-hidden shadow-card animate-fade-in">
        <div className="bg-masters-green-dark px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-masters-gold text-[10px] font-bold uppercase tracking-[0.2em]">Reserve</p>
            <p className="text-white font-serif text-base mt-0.5">Tier 4 Backup</p>
          </div>
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
              picks.reserve
                ? 'bg-masters-gold text-masters-green-dark scale-110'
                : 'bg-white/10 text-white/40'
            )}
          >
            {picks.reserve ? '✓' : 'R'}
          </div>
        </div>
        <div className="bg-white p-3">
          {!picks.tier4 ? (
            <p className="text-sm text-gray-400 italic py-1 px-1">
              Select your Tier 4 pick first
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
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
            <p className="text-xs text-red-400/80 mt-2 pl-1">Select a reserve</p>
          )}
          <p className="text-xs text-gray-400 mt-2 px-1">
            Replaces your Tier 4 pick if they miss the cut
          </p>
        </div>
      </div>

      {/* Tiebreaker */}
      <div className="bg-white rounded-2xl shadow-card p-4 !mt-4">
        <label className="block text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-3">
          Tiebreaker
        </label>
        <div className="flex items-center gap-3">
          <input
            id="tiebreaker"
            type="number"
            placeholder="-12"
            value={tiebreaker}
            onChange={(e) => setTiebreaker(e.target.value)}
            className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all"
          />
          <p className="text-xs text-gray-400 flex-1">
            Your guess for the winner&apos;s final score-to-par. Closest wins a tie.
          </p>
        </div>
      </div>

      {/* Error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 !mt-3 animate-fade-in">
          <p className="text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      {/* Submit */}
      <div className="!mt-5 space-y-2">
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'pressable w-full font-bold py-4 rounded-2xl transition-all duration-200 text-base shadow-md',
            allPicksMade && nameInput.trim().includes(' ')
              ? 'bg-masters-green hover:bg-masters-green-dark text-white shadow-masters-green/20'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            submitting && 'opacity-70'
          )}
        >
          {submitting ? 'Saving…' : isEditMode ? 'Update My Picks' : 'Submit Picks'}
        </button>
        <p className="text-center text-[11px] text-gray-400">
          Picks lock Thursday April 9, 8 AM ET
        </p>
      </div>
    </form>
  );
}

// ── Name input (shared) ─────────────────────────────────────────────────────

function NameInput({
  value,
  onChange,
  status,
  isLocked: _isLocked,
}: {
  value: string;
  onChange: (v: string) => void;
  status: 'idle' | 'loading' | 'found' | 'not-found';
  isLocked: boolean;
}) {
  return (
    <div>
      <label
        htmlFor="playerName"
        className="block text-[10px] text-masters-gold font-bold uppercase tracking-widest mb-2"
      >
        Your Name
      </label>
      <div className="relative">
        <input
          id="playerName"
          type="text"
          placeholder="First Last"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-masters-green focus:ring-1 focus:ring-masters-green/30 transition-all pr-8"
          autoComplete="name"
        />
        {/* Status icon */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
          {status === 'loading' && <span className="text-gray-300 animate-pulse">…</span>}
          {status === 'found' && <span className="text-masters-green">✓</span>}
          {status === 'not-found' && value.includes(' ') && (
            <span className="text-gray-300">+</span>
          )}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {status === 'not-found' && value.includes(' ')
          ? 'New entry — fill in your picks below'
          : 'First and last name required'}
      </p>
    </div>
  );
}
