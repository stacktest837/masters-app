# Masters Pool ⛳

A golf pick'em web app for the 2026 Masters Tournament. Pick 1 golfer from each tier, lowest combined strokes wins.

## Status
🟡 In Development — Phase 1

## Overview
Masters Pool lets a group of friends compete in a tiered golf pick'em during the Masters. Each player selects one golfer from four tiers plus a reserve, and scores auto-update from ESPN throughout the tournament. No accounts needed — just open the link, pick your team, and watch the leaderboard.

Built as a Stack Industries project.

## Tech Stack
- Next.js 14 (App Router, TypeScript)
- Supabase (Postgres)
- Tailwind CSS
- Vercel (hosting)
- ESPN public API (live scoring)

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (free tier)
- Vercel account (for deploy)

### Installation
```bash
git clone <repo-url>
cd masters-pool
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
```

### Database Setup
```bash
# Run the schema in your Supabase SQL editor
# Located at: docs/supabase-schema.sql

# Seed golfer data
npx tsx scripts/seed-golfers.ts
```

### Running
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Project Structure
See CLAUDE.md for full directory layout and conventions.

## Contributing
Personal project built by Gary Stack with Claude Code. See CLAUDE.md for coding standards.

## License
MIT
