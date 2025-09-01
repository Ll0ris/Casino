import { createClient } from '@supabase/supabase-js'
import type { Game, Player } from './types'
import { createGame, joinGame, leaveGame, playerHit, playerStand, startRound, playerDoubleDown, computePayouts, playerSplit } from './game'
import type { LobbyParticipant } from './types'

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
      if (error) {
        console.error('[supabase:get] rooms', id, error.message)
        return null
      }
      return (data?.state as Game) || null
    },
    async set(game) {
      const { error } = await supabase.from('rooms').upsert({ id: game.id, state: game })
      if (error) {
        console.error('[supabase:set] rooms', game.id, error.message)
        throw error
      }
    },
    async remove(id) {
      const { error } = await supabase.from('rooms').delete().eq('id', id)
      if (error) {
        console.error('[supabase:remove] rooms', id, error.message)
        throw error
      }
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

export async function createRoom(name: string, playerToken: string, accountId?: string) {
  const store = getStore()
  const id = randomId()
  const host: Player = {
    id: randomId(),
    seatId: randomId(),
    name,
    tokenHash: hashToken(playerToken),
    accountId,
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

export async function createRoomWithId(roomId: string, hostName: string, playerToken: string, accountId?: string, others?: LobbyParticipant[]) {
  const store = getStore()
  const host: Player = {
    id: randomId(),
    seatId: randomId(),
    name: hostName,
    tokenHash: hashToken(playerToken),
    accountId,
    cards: [],
    value: 0,
    busted: false,
    stood: false,
    isHost: true,
  }
  let game = createGame(roomId, host)
  if (others && others.length) {
    for (const p of others) {
      if (p.tokenHash === host.tokenHash) continue
      const newP: Player = {
        id: randomId(),
        seatId: randomId(),
        name: p.name,
        tokenHash: p.tokenHash,
        accountId: undefined,
        cards: [],
        value: 0,
        busted: false,
        stood: false,
      }
      game = joinGame(game, newP)
    }
  }
  await store.set(game)
  return { roomId }
}

export async function ensureJoined(roomId: string, name: string, playerToken: string, accountId?: string, bet?: number) {
  const store = getStore()
  const gAny = (await store.get(roomId)) as any
  if (!gAny) return null
  // If this is a lobby record (no players), do not handle here
  if (!('players' in gAny) || !Array.isArray(gAny.players)) return null
  const g = gAny as Game
  const tokenHash = hashToken(playerToken)
  g.lastSeen = g.lastSeen || {}
  g.lastSeen[tokenHash] = Date.now()
  const exists = g.players.find((p) => p.tokenHash === tokenHash)
  if (exists) return g
  const newPlayer: Player = {
    id: randomId(),
    seatId: randomId(),
    name,
    tokenHash,
    accountId,
    cards: [],
    value: 0,
    busted: false,
    stood: false,
    bet: Math.max(0, Number(bet || 0)),
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
  if (next.players.length === 0) {
    await store.remove(roomId)
    return null
  }
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
  const currentId = g.turnPlayerId
  const me = g.players.find((p) => p.id === currentId)
  if (!me || me.tokenHash !== tokenHash) return g
  const next = playerHit(g, currentId!)
  await store.set(next)
  if (next.status === 'round_over') await settleBalances(next)
  return next
}

export async function stand(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const currentId = g.turnPlayerId
  const me = g.players.find((p) => p.id === currentId)
  if (!me || me.tokenHash !== tokenHash) return g
  const next = playerStand(g, currentId!)
  await store.set(next)
  if (next.status === 'round_over') await settleBalances(next)
  return next
}

export async function doubleDown(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const currentId = g.turnPlayerId
  const me = g.players.find((p) => p.id === currentId)
  if (!me || me.tokenHash !== tokenHash) return g
  const next = playerDoubleDown(g, currentId!)
  await store.set(next)
  if (next.status === 'round_over') await settleBalances(next)
  return next
}

export async function split(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const currentId = g.turnPlayerId
  const me = g.players.find((p) => p.id === currentId)
  if (!me || me.tokenHash !== tokenHash) return g
  const next = playerSplit(g, currentId!)
  await store.set(next)
  return next
}

export async function setBet(roomId: string, playerToken: string, bet: number) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const players = g.players.map((p) => (p.tokenHash === tokenHash ? { ...p, bet: Math.max(0, Number(bet || 0)) } : p))
  const next = { ...g, players, updatedAt: Date.now() }
  await store.set(next)
  return next
}

async function settleBalances(game: Game) {
  try {
    if (!(SUPABASE_URL && SUPABASE_ANON_KEY)) return
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const dealerBJ = game.dealer.cards.length === 2 && game.dealer.value === 21
    const results = computePayouts(game.dealer, game.players, dealerBJ)
    for (const r of results) {
      const p = game.players.find((x) => x.id === r.playerId)
      if (!p?.accountId) continue
      // Read then write (simple and clear for prototype)
      const { data: prof } = await supabase.from('profiles').select('balance').eq('user_id', p.accountId).single()
      const current = Number(prof?.balance || 0)
      const next = current + Number(r.delta || 0)
      if (prof) {
        await supabase.from('profiles').update({ balance: next }).eq('user_id', p.accountId)
      }
    }
  } catch (e: any) {
    console.error('[settleBalances]', e?.message || e)
  }
}

export async function insurance(roomId: string, playerToken: string, amount: number) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const players = g.players.map((p) => {
    if (p.tokenHash === tokenHash) {
      const cap = Math.max(0, (p.bet || 0) / 2)
      const val = Math.max(0, Math.min(Number(amount || 0), cap))
      return { ...p, insurance: val }
    }
    return p
  })
  const next = { ...g, players, updatedAt: Date.now() }
  await store.set(next)
  return next
}

function purgeStalePlayers(g: Game, now = Date.now()): Game | null {
  const lastSeen = g.lastSeen || {}
  const threshold = 25000
  const alive = g.players.filter((p) => (lastSeen[p.tokenHash] || 0) > now - threshold)
  if (alive.length === g.players.length) return g
  const removedCurrent = g.turnPlayerId && !alive.find((p) => p.id === g.turnPlayerId)
  let turnPlayerId = g.turnPlayerId
  if (removedCurrent) turnPlayerId = nextTurnId(alive, null)
  const next: Game = { ...g, players: alive, turnPlayerId, updatedAt: now }
  return alive.length === 0 ? null : next
}

function nextTurnId(players: Player[], currentId: string | null): string | null {
  const idx = currentId ? players.findIndex((p) => p.id === currentId) : -1
  for (let i = idx + 1; i < players.length; i++) {
    const p = players[i]
    if (!p.busted && !p.stood) return p.id
  }
  return null
}

export async function heartbeat(roomId: string, playerToken: string) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const lastSeen = { ...(g.lastSeen || {}), [tokenHash]: Date.now() }
  const next = { ...g, lastSeen, updatedAt: Date.now() }
  await store.set(next)
  return next
}

export async function forceTimeout(roomId: string) {
  const store = getStore()
  let g = await store.get(roomId)
  if (!g) return null
  // purge stale players
  const purged = purgeStalePlayers(g)
  if (purged === null) {
    await store.remove(roomId)
    return null
  }
  if (purged !== g) {
    g = purged
    await store.set(g)
  }
  if (g.status !== 'in_round' || !g.turnPlayerId || (g as any).turnExpiresAt && Date.now() <= (g as any).turnExpiresAt) return g
  const next = playerStand(g, g.turnPlayerId)
  await store.set(next)
  if (next.status === 'round_over') await settleBalances(next)
  return next
}

export async function updateSettings(roomId: string, playerToken: string, deckCount?: number, shuffleAt?: number, autoContinue?: boolean) {
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return null
  const tokenHash = hashToken(playerToken)
  const me = g.players.find((p) => p.tokenHash === tokenHash)
  if (!me || !me.isHost) return g
  const dc = deckCount ? Math.max(1, Math.min(6, Math.floor(deckCount))) : g.settings.deckCount
  const sa = typeof shuffleAt === 'number' ? Math.max(1, Math.floor(shuffleAt)) : g.settings.shuffleAt
  const ac = typeof autoContinue === 'boolean' ? autoContinue : (g.settings.autoContinue ?? true)
  const next: Game = { ...g, settings: { deckCount: dc, shuffleAt: sa, autoContinue: ac }, updatedAt: Date.now() }
  await store.set(next)
  return next
}

function randomId() {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
}
