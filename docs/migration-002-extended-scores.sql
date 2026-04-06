-- Migration 002: Add hole-by-hole tracking columns to scores table
-- Run this in Supabase SQL Editor before next ESPN sync

ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS today_score  INTEGER,
  ADD COLUMN IF NOT EXISTS current_hole INTEGER,  -- 0-18; 18 = finished round
  ADD COLUMN IF NOT EXISTS current_round INTEGER; -- 1-4
