-- Migration 001: Add edit PIN to entries
-- Run this in Supabase SQL Editor

ALTER TABLE entries ADD COLUMN IF NOT EXISTS pin TEXT NOT NULL DEFAULT '0000';

-- Existing entries get '0000' as their pin. Ask those players to
-- re-submit their picks so they get a real PIN, or delete them via
-- the admin panel and have them re-enter.
