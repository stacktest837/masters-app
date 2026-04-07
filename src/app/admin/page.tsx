'use client';

import { useState } from 'react';
import type { Golfer, PoolConfig } from '@/types';

interface EntryRow {
  id: string;
  player_name: string;
  pick_tier1: { name: string } | null;
  pick_tier2: { name: string } | null;
  pick_tier3: { name: string } | null;
  pick_tier4: { name: string } | null;
  reserve: { name: string } | null;
  tiebreaker: number;
}

function fmtTB(n: number) {
  return n < 0 ? String(n) : n === 0 ? 'E' : `+${n}`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [config, setConfig] = useState<PoolConfig | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [golfers, setGolfers] = useState<Golfer[]>([]);

  const [lockLoading, setLockLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [scoreForm, setScoreForm] = useState({ golfer_id: '', score_to_par: '', status: 'active' });
  const [scoreMsg, setScoreMsg] = useState('');
  const [scoreLoading, setScoreLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      // Verify password
      const verifyRes = await fetch('/api/espn', {
        headers: { 'x-admin-password': password },
      });
      if (verifyRes.status === 401) {
        setAuthError('Wrong password');
        return;
      }

      // Load all admin data in parallel
      const [entriesJson, golfersJson, configJson] = await Promise.all([
        fetch('/api/entries').then((r) => r.json()),
        fetch('/api/golfers').then((r) => r.json()),
        fetch('/api/config').then((r) => r.json()),
      ]);

      setEntries(entriesJson.entries || []);
      setGolfers(golfersJson.golfers || []);
      setConfig(configJson.config || null);
      setAuthenticated(true);
    } catch {
      setAuthError('Connection error — try again');
    } finally {
      setAuthLoading(false);
    }
  }

  async function reloadEntries() {
    const json = await fetch('/api/entries').then((r) => r.json());
    setEntries(json.entries || []);
  }

  async function toggleLock() {
    if (!config) return;
    setLockLoading(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ picks_locked: !config.picks_locked }),
      });
      const json = await res.json();
      if (json.error) {
        alert(`Lock toggle failed: ${json.error}`);
      } else if (json.config) {
        setConfig(json.config);
      }
    } catch (err) {
      alert(`Lock toggle failed: ${String(err)}`);
    } finally {
      setLockLoading(false);
    }
  }

  async function syncESPN() {
    setSyncLoading(true);
    setSyncResult('');
    const res = await fetch('/api/espn', {
      method: 'POST',
      headers: { 'x-admin-password': password },
    });
    const json = await res.json();
    if (json.error) {
      setSyncResult(`Error: ${json.error}`);
    } else if (json.message) {
      setSyncResult(json.message);
    } else {
      const unmatched = json.unmatched?.length ? ` Unmatched: ${json.unmatched.join(', ')}` : '';
      setSyncResult(`Synced ${json.synced} golfers.${unmatched}`);
    }
    setSyncLoading(false);
  }

  async function submitScoreOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!scoreForm.golfer_id) { setScoreMsg('Select a golfer'); return; }
    setScoreLoading(true);
    setScoreMsg('');
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(scoreForm),
    });
    const json = await res.json();
    setScoreMsg(json.error ? `Error: ${json.error}` : 'Score saved ✓');
    setScoreLoading(false);
  }

  async function deleteEntry(id: string, name: string) {
    if (!confirm(`Delete ${name}'s entry?`)) return;
    await fetch(`/api/entries?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password },
    });
    await reloadEntries();
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-xs mx-auto pt-10">
        <h2 className="text-xl font-bold text-masters-green mb-6 text-center">Admin Panel</h2>
        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-sm text-gray-600 mb-1" htmlFor="pw">
            Password
          </label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-masters-green"
            autoFocus
          />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-masters-green text-white font-semibold py-2.5 rounded hover:bg-masters-green-dark transition-colors disabled:opacity-60"
          >
            {authLoading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  // ── Admin dashboard ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-masters-green">Admin Panel</h2>
        <span className="text-xs text-gray-400">{entries.length} entries</span>
      </div>

      {/* Lock toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-xs text-gray-500 mb-3 uppercase tracking-wide">Pick Status</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">
              Picks are{' '}
              <span className={config?.picks_locked ? 'text-red-600 font-bold' : 'text-masters-green font-bold'}>
                {config?.picks_locked ? 'LOCKED' : 'OPEN'}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {config?.picks_locked
                ? 'No new submissions or edits allowed'
                : 'Players can submit and edit picks'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/leaderboard?preview=${password}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded font-semibold text-sm border border-masters-green text-masters-green hover:bg-masters-green/5 transition-colors"
            >
              Preview
            </a>
            <button
              onClick={toggleLock}
              disabled={lockLoading || !config}
              className={[
                'px-4 py-2 rounded font-semibold text-sm transition-colors disabled:opacity-50',
                config?.picks_locked
                  ? 'bg-masters-green text-white hover:bg-masters-green-dark'
                  : 'bg-red-600 text-white hover:bg-red-700',
              ].join(' ')}
            >
              {lockLoading ? '…' : config?.picks_locked ? 'Unlock Picks' : 'Lock Picks'}
            </button>
          </div>
        </div>
      </div>

      {/* ESPN sync */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-xs text-gray-500 mb-3 uppercase tracking-wide">ESPN Score Sync</h3>
        <button
          onClick={syncESPN}
          disabled={syncLoading}
          className="bg-masters-green text-white px-4 py-2 rounded text-sm font-semibold hover:bg-masters-green-dark transition-colors disabled:opacity-60"
        >
          {syncLoading ? 'Syncing…' : 'Sync Now'}
        </button>
        {syncResult && (
          <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded px-3 py-2">{syncResult}</p>
        )}
      </div>

      {/* Manual score override */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-xs text-gray-500 mb-3 uppercase tracking-wide">
          Manual Score Override
        </h3>
        <form onSubmit={submitScoreOverride} className="space-y-3">
          <select
            value={scoreForm.golfer_id}
            onChange={(e) => setScoreForm((f) => ({ ...f, golfer_id: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-masters-green"
          >
            <option value="">Select golfer…</option>
            {[1, 2, 3, 4].map((tier) => (
              <optgroup key={tier} label={`Tier ${tier}`}>
                {golfers
                  .filter((g) => g.tier === tier)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Score (e.g. -8)"
              value={scoreForm.score_to_par}
              onChange={(e) => setScoreForm((f) => ({ ...f, score_to_par: e.target.value }))}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-masters-green"
            />
            <select
              value={scoreForm.status}
              onChange={(e) => setScoreForm((f) => ({ ...f, status: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-masters-green"
            >
              <option value="active">Active</option>
              <option value="cut">Cut (MC)</option>
              <option value="wd">WD</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={scoreLoading}
            className="bg-masters-green text-white px-4 py-2 rounded text-sm font-semibold hover:bg-masters-green-dark transition-colors disabled:opacity-60"
          >
            {scoreLoading ? 'Saving…' : 'Save Score'}
          </button>
          {scoreMsg && (
            <p className={`text-xs ${scoreMsg.includes('Error') ? 'text-red-500' : 'text-masters-green'}`}>
              {scoreMsg}
            </p>
          )}
        </form>
      </div>

      {/* Entries */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-xs text-gray-500 mb-3 uppercase tracking-wide">
          Entries ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No entries yet</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-800">{entry.player_name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[entry.pick_tier1?.name, entry.pick_tier2?.name, entry.pick_tier3?.name, entry.pick_tier4?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-gray-400">
                    Reserve: {entry.reserve?.name ?? '—'} · TB: {fmtTB(entry.tiebreaker)}
                  </p>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id, entry.player_name)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0 mt-0.5"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
