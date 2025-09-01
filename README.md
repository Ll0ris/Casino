Multiplayer Blackjack (HTTP Polling)

Overview

- Next.js (App Router) + Tailwind CSS + TypeScript
- Real-time via HTTP polling (Vercel-compatible, no WebSocket)
- Serverless API routes for room, join, actions
- Optional Supabase persistence; falls back to in-memory in dev

Quick Start

1) Install deps

   npm install

2) Run dev server

   npm run dev

3) Open in browser: http://localhost:3000

How It Works

- Create Room: POST /api/rooms
- Join Room: POST /api/rooms/:roomId/join
- Poll State: GET /api/rooms/:roomId (client polls every ~1s)
- Actions: POST /api/rooms/:roomId/action with { action: 'hit' | 'stand' | 'leave' }

Client stores a `playerToken` in localStorage and sends it in `x-player-token` for authorization. Host (room creator) can start rounds.

Supabase (Optional)

Provide environment variables to enable persistence:

- SUPABASE_URL
- SUPABASE_ANON_KEY

Create a table:

  create table if not exists public.rooms (
    id text primary key,
    state jsonb not null,
    updated_at timestamp with time zone default now()
  );

RLS can stay off for a small project, or write policies to restrict updates.

Notes & Limits

- In-memory store is only for local dev; use Supabase on Vercel.
- Deck draw for hits uses a fresh deck for simplicity. For full fidelity, maintain a shared shoe across a round.
- HTTP polling interval is configurable in the room UI (0.8–2s).

