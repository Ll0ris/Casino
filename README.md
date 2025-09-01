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

Schema file:

- db/supabase.sql:1 — tablo ve indeksleri içerir.
  - Supabase SQL Editor’a yapıştır veya CLI ile uygula.

RLS can stay off for a small project, or write policies to restrict updates.

Notes & Limits

- In-memory store is only for local dev; on Vercel you must enable Supabase to allow multiple users to see the same state.
- Deck draw for hits uses a fresh deck for simplicity. For full fidelity, maintain a shared shoe across a round.
- HTTP polling interval is configurable in the room UI (0.8–2s).

Vercel Deploy

- Import the repo in Vercel.
- Add env vars in Project → Settings → Environment Variables:
  - SUPABASE_URL = https://your-project.supabase.co
  - SUPABASE_ANON_KEY = <anon key>
- Apply schema from db/supabase.sql to your Supabase project.
- Redeploy. Rooms and joins will persist and be shared across serverless instances.
