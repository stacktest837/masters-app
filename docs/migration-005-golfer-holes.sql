-- Migration 005: hole-by-hole scores for best-ball computation
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS golfer_holes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golfer_id    uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  round_number smallint NOT NULL CHECK (round_number BETWEEN 1 AND 4),
  hole_number  smallint NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes      smallint,          -- null = not yet played
  score_to_par smallint,          -- null = not yet played
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (golfer_id, round_number, hole_number)
);

CREATE INDEX IF NOT EXISTS golfer_holes_golfer_round_idx ON golfer_holes (golfer_id, round_number);
