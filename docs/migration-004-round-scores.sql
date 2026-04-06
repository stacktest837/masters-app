-- Migration 004: Per-round scores for daily payout tracking
-- Run this in Supabase SQL Editor

ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS round1_score INTEGER,
  ADD COLUMN IF NOT EXISTS round2_score INTEGER,
  ADD COLUMN IF NOT EXISTS round3_score INTEGER,
  ADD COLUMN IF NOT EXISTS round4_score INTEGER;
