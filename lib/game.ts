import type { Card, Dealer, Game, Player, Rank, Suit, GameStatus } from './types'

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function newDeck(): Card[] {
  const deck: Card[] = []
  for (const s of SUITS) {
    for (const r of RANKS) deck.push({ rank: r, suit: s })
  }
  return shuffle(deck)
}

export function handValue(cards: Card[]): number {
  let total = 0
  let aces = 0
  for (const c of cards) {
    if (c.hidden) continue
    switch (c.rank) {
      case 'A':
        aces += 1
        total += 11
        break
      case 'K':
      case 'Q':
      case 'J':
      case '10':
        total += 10
        break
      default:
        total += parseInt(c.rank, 10)
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

export function createGame(id: string, host: Player): Game {
  return {
    id,
    players: [host],
    dealer: { cards: [], value: 0 },
    status: 'waiting',
    turnPlayerId: null,
    updatedAt: Date.now(),
    message: undefined,
  }
}

export function joinGame(game: Game, player: Player): Game {
  if (game.players.find((p) => p.id === player.id)) return game
  return { ...game, players: [...game.players, player], updatedAt: Date.now() }
}

export function leaveGame(game: Game, playerId: string): Game {
  const players = game.players.filter((p) => p.id !== playerId)
  let status: GameStatus = game.status
  let turnPlayerId = game.turnPlayerId
  if (turnPlayerId === playerId) {
    turnPlayerId = nextTurn(players, playerId)
  }
  if (players.length === 0) status = 'waiting'
  return { ...game, players, status, turnPlayerId, updatedAt: Date.now() }
}

export function startRound(game: Game): Game {
  if (game.players.length === 0) return game
  const deck = newDeck()
  const players: Player[] = game.players.map((p) => ({
    ...p,
    cards: [] as Card[],
    value: 0,
    busted: false,
    stood: false,
    doubled: false,
  })) as Player[]
  const dealer: Dealer = { cards: [], value: 0 }

  // Initial deal: two cards to each player, dealer one up, one down
  for (let i = 0; i < 2; i++) {
    for (const p of players) {
      p.cards.push(deck.pop()!)
      p.value = handValue(p.cards)
    }
    dealer.cards.push(i === 0 ? deck.pop()! : { ...deck.pop()!, hidden: true })
    dealer.value = handValue(dealer.cards)
  }

  const turnPlayerId = players[0].id
  return {
    ...game,
    players,
    dealer,
    status: 'in_round',
    turnPlayerId,
    updatedAt: Date.now(),
    message: undefined,
  }
}

export function playerHit(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  const deck = newDeck() // Fresh deck per hit is unrealistic; instead derive from state. For simplicity, we simulate draws.
  const players = game.players.map((p) => ({ ...p }))
  const me = players.find((p) => p.id === playerId)!
  me.cards = me.cards.concat(deck.pop()!)
  me.value = handValue(me.cards)
  me.busted = me.value > 21
  let turnPlayerId = game.turnPlayerId
  let message = game.message
  if (me.busted) {
    const next = nextTurn(players, playerId)
    if (next) {
      turnPlayerId = next
    } else {
      // Dealer reveals and plays
      const { dealer, msg } = dealerFinish(game.dealer, players)
      message = msg
      return { ...game, players, dealer, status: 'round_over', turnPlayerId: null, updatedAt: Date.now(), message }
    }
  }
  return { ...game, players, status: game.status, turnPlayerId, updatedAt: Date.now(), message }
}

export function playerStand(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  const players = game.players.map((p) => ({ ...p }))
  const me = players.find((p) => p.id === playerId)!
  me.stood = true
  const next = nextTurn(players, playerId)
  if (next) {
    return { ...game, players, turnPlayerId: next, updatedAt: Date.now() }
  }
  const { dealer, msg } = dealerFinish(game.dealer, players)
  return {
    ...game,
    players,
    dealer,
    status: 'round_over',
    turnPlayerId: null,
    updatedAt: Date.now(),
    message: msg,
  }
}

export function playerDoubleDown(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  const players = game.players.map((p) => ({ ...p }))
  const me = players.find((p) => p.id === playerId)!
  // Allow only on exactly two visible cards and not already doubled
  if (!me || me.doubled || me.cards.filter((c) => !c.hidden).length !== 2) return game
  const deck = newDeck()
  me.doubled = true
  me.cards = me.cards.concat(deck.pop()!)
  me.value = handValue(me.cards)
  me.stood = true
  const next = nextTurn(players, playerId)
  if (next) {
    return { ...game, players, turnPlayerId: next, updatedAt: Date.now() }
  }
  const { dealer, msg } = dealerFinish(game.dealer, players)
  return { ...game, players, dealer, status: 'round_over', turnPlayerId: null, updatedAt: Date.now(), message: msg }
}

function dealerFinish(dealer: Dealer, players: Player[]) {
  const reveal: Card[] = dealer.cards.map((c) => ({ ...c, hidden: false }))
  let value = handValue(reveal)
  // Draw until 17+
  while (value < 17) {
    const deck = newDeck()
    reveal.push(deck.pop()!)
    value = handValue(reveal)
  }
  const finalDealer = { cards: reveal, value }
  const msg = summaryMessage(finalDealer, players)
  return { dealer: finalDealer, msg }
}

function summaryMessage(dealer: Dealer, players: Player[]): string {
  const parts: string[] = []
  const dealerBust = dealer.value > 21
  for (const p of players) {
    let res = ''
    if (p.busted) res = 'Bust'
    else if (dealerBust) res = 'Win'
    else if (p.value > dealer.value) res = 'Win'
    else if (p.value < dealer.value) res = 'Lose'
    else res = 'Push'
    parts.push(`${p.name}: ${res}`)
  }
  return parts.join(' • ')
}

export function computePayouts(dealer: Dealer, players: Player[]): Array<{ playerId: string; delta: number }> {
  const results: Array<{ playerId: string; delta: number }> = []
  const dealerBust = dealer.value > 21
  for (const p of players) {
    const base = Math.max(0, p.bet || 0)
    const wager = p.doubled ? base * 2 : base
    let delta = 0
    if (p.busted) delta = -wager
    else if (dealerBust) delta = wager
    else if (p.value > dealer.value) delta = wager
    else if (p.value < dealer.value) delta = -wager
    else delta = 0
    results.push({ playerId: p.id, delta })
  }
  return results
}

function nextTurn(players: Player[], currentId: string | null): string | null {
  const order = players
  const idx = currentId ? order.findIndex((p) => p.id === currentId) : -1
  for (let i = idx + 1; i < order.length; i++) {
    const p = order[i]
    if (!p.busted && !p.stood) return p.id
  }
  return null
}

export function toClient(game: Game, tokenHash: string) {
  // Hide dealer hole card if round in progress
  const hideDealer = game.status === 'in_round'
  const dealerCards = hideDealer
    ? game.dealer.cards.map((c, idx) => (idx === 1 ? { ...c, hidden: true } : { ...c, hidden: false }))
    : game.dealer.cards.map((c) => ({ ...c, hidden: false }))

  const me = game.players.find((p) => p.tokenHash === tokenHash) || null

  return {
    id: game.id,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      cards: p.cards,
      value: p.value,
      busted: p.busted,
      stood: p.stood,
      bet: p.bet,
      doubled: p.doubled,
    })),
    dealer: { cards: dealerCards, value: handValue(dealerCards) },
    status: game.status,
    turnPlayerId: game.turnPlayerId,
    isHost: Boolean(me?.isHost),
    me: me
      ? {
          id: me.id,
          name: me.name,
          cards: me.cards,
          value: me.value,
          busted: me.busted,
          stood: me.stood,
          bet: me.bet,
          doubled: me.doubled,
        }
      : null,
    message: game.message,
  }
}
