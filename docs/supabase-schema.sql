-- Masters Pool Database Schema
-- Run this in Supabase SQL Editor

-- Golfers table (seeded via script)
CREATE TABLE golfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries table (player picks)
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  pick_tier1_id UUID NOT NULL REFERENCES golfers(id),
  pick_tier2_id UUID NOT NULL REFERENCES golfers(id),
  pick_tier3_id UUID NOT NULL REFERENCES golfers(id),
  pick_tier4_id UUID NOT NULL REFERENCES golfers(id),
  reserve_id UUID NOT NULL REFERENCES golfers(id),
  tiebreaker INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_player UNIQUE (player_name)
);

-- Scores table (updated by ESPN sync)
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  golfer_id UUID NOT NULL REFERENCES golfers(id) UNIQUE,
  score_to_par INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cut', 'wd')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pool config (lock state, etc.)
CREATE TABLE pool_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  picks_locked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config row
INSERT INTO pool_config (picks_locked) VALUES (FALSE);

-- RLS policies: allow public read, restrict writes to service role
ALTER TABLE golfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_config ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read golfers" ON golfers FOR SELECT USING (true);
CREATE POLICY "Public read entries" ON entries FOR SELECT USING (true);
CREATE POLICY "Public read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Public read config" ON pool_config FOR SELECT USING (true);

-- Public insert/update for entries (controlled by app logic + lock state)
CREATE POLICY "Public insert entries" ON entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update entries" ON entries FOR UPDATE USING (true);

-- Scores and config only writable via service role (API routes)
-- No public write policies needed — use service role key in API routes

-- Index for fast entry lookups by name
CREATE INDEX idx_entries_player_name ON entries (LOWER(player_name));

-- Index for score lookups by golfer
CREATE INDEX idx_scores_golfer_id ON scores (golfer_id);
