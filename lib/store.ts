import { createClient } from '@supabase/supabase-js'
import type { Game, Player } from './types'
import { createGame, joinGame, leaveGame, playerHit, playerStand, startRound } from './game'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

export type Store = {
  get(id: string): Promise<Game | null>
  set(game: Game): Promise<void>
  remove(id: string): Promise<void>
}

// In-memory store (dev only, single process)
const mem: Record<string, Game> = (globalThis as any).__MEM_STORE__ || {}
;(globalThis as any).__MEM_STORE__ = mem

const MemoryStore: Store = {
  async get(id) {
    return mem[id] || null
  },
  async set(game) {
    mem[game.id] = game
  },
  async remove(id) {
    delete mem[id]
  },
}

// Optional Supabase store (JSON blob per room)
function makeSupabaseStore(): Store {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  return {
    async get(id) {
      const { data, error } = await supabase
        .from('rooms')
        .select('state')
        .eq('id', id)
        .single()
      if (error) return null
      return (data?.state as Game) || null
    },
    async set(game) {
      await supabase.from('rooms').upsert({ id: game.id, state: game })
    },
    async remove(id) {
      await supabase.from('rooms').delete().eq('id', id)
    },
  }
}

export function getStore(): Store {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) return makeSupabaseStore()
  return MemoryStore
}

export function hashToken(token: string): string {
  // Lightweight hash to avoid storing raw tokens; not cryptographically strong
  let h = 0
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0
  return `h${h >>> 0}`
}

export async function createRoom(name: string, playerToken: string) {
  const store = getStore()
  const id = randomId()
  const host: Player = {
    id: randomId(),
    name,
    tokenHash: hashToken(playerToken),
    cards: [],
    value: 0,
    busted: false,
    stood: false,
    isHost: true,
  }
  const game = createGame(id, host)
  await store.set(game)
  return { roomId: id }
}

export async function ensureJoined(roomId: string, name: string, playerToken: string) {
  const store = getStore()
  const g = (await store.get(roomId))
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const exists = g.players.find((p) => p.tokenHash === tokenHash)
  if (exists) return g
  const newPlayer: Player = {
    id: randomId(),
    name,
    tokenHash,
    cards: [],
    value: 0,
    busted: false,
    stood: false,
  }
  const next = joinGame(g, newPlayer)
  await store.set(next)
  return next
}

export async function leave(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const me = g.players.find((p) => p.tokenHash === tokenHash)
  if (!me) return g
  const next = leaveGame(g, me.id)
  await store.set(next)
  return next
}

export async function start(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const me = g.players.find((p) => p.tokenHash === tokenHash)
  if (!me || !me.isHost) return g
  const next = startRound(g)
  await store.set(next)
  return next
}

export async function hit(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const me = g.players.find((p) => p.tokenHash === tokenHash)
  if (!me) return g
  const next = playerHit(g, me.id)
  await store.set(next)
  return next
}

export async function stand(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const me = g.players.find((p) => p.tokenHash === tokenHash)
  if (!me) return g
  const next = playerStand(g, me.id)
  await store.set(next)
  return next
}

function randomId() {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
}

