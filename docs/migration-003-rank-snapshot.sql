-- Migration 003: Add rank snapshot to pool_config for movement arrows
-- Run this in Supabase SQL Editor

ALTER TABLE pool_config
  ADD COLUMN IF NOT EXISTS rank_snapshot JSONB NOT NULL DEFAULT '{}';
