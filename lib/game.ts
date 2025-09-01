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

function uid() {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
}

export function newDeck(): Card[] {
  const deck: Card[] = []
  for (const s of SUITS) {
    for (const r of RANKS) deck.push({ rank: r, suit: s })
  }
  return shuffle(deck)
}

export function newShoe(decks: number): Card[] {
  const out: Card[] = []
  const n = Math.max(1, Math.min(6, Math.floor(decks || 1)))
  for (let i = 0; i < n; i++) out.push(...newDeck())
  return shuffle(out)
}

function draw(shoe: Card[]): { card: Card; next: Card[] } {
  const card = shoe[shoe.length - 1]
  const next = shoe.slice(0, -1)
  return { card, next }
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
    turnExpiresAt: null,
    updatedAt: Date.now(),
    message: undefined,
    settings: { deckCount: 1, shuffleAt: 35, autoContinue: true },
    shoe: [],
    lastSeen: {},
    intermissionUntil: null,
  }
}

export function joinGame(game: Game, player: Player): Game {
  if (game.players.find((p) => p.id === player.id)) return game
  return { ...game, players: [...game.players, player], updatedAt: Date.now() }
}

export function leaveGame(game: Game, playerId: string): Game {
  const leaving = game.players.find((p) => p.id === playerId)
  const players = leaving
    ? game.players.filter((p) => p.seatId !== leaving.seatId)
    : game.players.filter((p) => p.id !== playerId)
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
  const needShuffle = game.shoe.length < (game.settings.shuffleAt * game.settings.deckCount)
  let shoe = needShuffle ? newShoe(game.settings.deckCount) : game.shoe
  // Collapse any split hands from previous rounds: keep one player per seatId
  const uniqueSeats: Player[] = []
  const seen = new Set<string>()
  for (const p of game.players) {
    if (!seen.has(p.seatId)) {
      seen.add(p.seatId)
      uniqueSeats.push(p)
    }
  }
  const players: Player[] = uniqueSeats.map((p) => ({
    ...p,
    cards: [] as Card[],
    value: 0,
    busted: false,
    stood: false,
    doubled: false,
    insurance: undefined,
    blackjack: false,
  })) as Player[]
  const dealer: Dealer = { cards: [], value: 0 }

  // Initial deal: two cards to each player, dealer one up, one down
  for (let i = 0; i < 2; i++) {
    for (const p of players) {
      const d1 = draw(shoe); shoe = d1.next; p.cards.push(d1.card)
      p.value = handValue(p.cards)
    }
    const d2 = draw(shoe); shoe = d2.next
    dealer.cards.push(i === 0 ? d2.card : { ...d2.card, hidden: true })
    dealer.value = handValue(dealer.cards)
  }

  // Naturals auto-stand and flagged
  for (const p of players) {
    const visible = p.cards.filter(c=>!c.hidden)
    if (visible.length === 2 && handValue(visible) === 21) {
      p.blackjack = true
      p.stood = true
    }
  }

  const first = nextTurn(players, null)
  return {
    ...game,
    players,
    dealer,
    status: 'in_round',
    turnPlayerId: first,
    turnExpiresAt: first ? Date.now() + 15000 : null,
    updatedAt: Date.now(),
    message: needShuffle ? 'Deste karıştırıldı' : undefined,
    shoe,
    intermissionUntil: null,
  }
}

export function playerHit(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  let shoe = game.shoe
  const players = game.players.map((p) => ({ ...p }))
  const me = players.find((p) => p.id === playerId)!
  const d = draw(shoe); shoe = d.next; me.cards = me.cards.concat(d.card)
  me.value = handValue(me.cards)
  me.busted = me.value > 21
  let turnPlayerId = game.turnPlayerId
  let message = game.message
  if (me.busted) {
    const next = nextTurn(players, playerId)
    if (next) {
      turnPlayerId = next
      return { ...game, players, status: game.status, turnPlayerId, turnExpiresAt: Date.now() + 15000, updatedAt: Date.now(), message, shoe }
    } else {
      // Dealer reveals and plays
      const { dealer, msg, shoe: shoeNext } = dealerFinish(game.dealer, players, shoe)
      shoe = shoeNext
      message = msg
      return { ...game, players, dealer, status: 'round_over', turnPlayerId: null, turnExpiresAt: null, intermissionUntil: Date.now() + 3000, updatedAt: Date.now(), message, shoe }
    }
  }
  return { ...game, players, status: game.status, turnPlayerId, turnExpiresAt: game.turnExpiresAt, updatedAt: Date.now(), message, shoe }
}

export function playerStand(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  let shoe = game.shoe
  const players = game.players.map((p) => ({ ...p }))
  const me = players.find((p) => p.id === playerId)!
  me.stood = true
  const next = nextTurn(players, playerId)
  if (next) {
    return { ...game, players, turnPlayerId: next, turnExpiresAt: Date.now() + 15000, updatedAt: Date.now(), shoe }
  }
  const { dealer, msg, shoe: shoeNext } = dealerFinish(game.dealer, players, shoe)
  shoe = shoeNext
  return {
    ...game,
    players,
    dealer,
    status: 'round_over',
    turnPlayerId: null,
    turnExpiresAt: null,
    intermissionUntil: Date.now() + 3000,
    updatedAt: Date.now(),
    message: msg,
    shoe,
  }
}

export function playerDoubleDown(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  let shoe = game.shoe
  const players = game.players.map((p) => ({ ...p }))
  const me = players.find((p) => p.id === playerId)!
  // Allow only on exactly two visible cards and not already doubled
  if (!me || me.doubled || me.cards.filter((c) => !c.hidden).length !== 2) return game
  const d = draw(shoe); shoe = d.next
  me.doubled = true
  me.cards = me.cards.concat(d.card)
  me.value = handValue(me.cards)
  me.stood = true
  const next = nextTurn(players, playerId)
  if (next) {
    return { ...game, players, turnPlayerId: next, turnExpiresAt: Date.now() + 15000, updatedAt: Date.now(), shoe }
  }
  const { dealer, msg, shoe: shoeNext } = dealerFinish(game.dealer, players, shoe)
  shoe = shoeNext
  return { ...game, players, dealer, status: 'round_over', turnPlayerId: null, turnExpiresAt: null, intermissionUntil: Date.now() + 3000, updatedAt: Date.now(), message: msg, shoe }
}

export function playerSplit(game: Game, playerId: string): Game {
  if (game.status !== 'in_round' || game.turnPlayerId !== playerId) return game
  const idx = game.players.findIndex((p) => p.id === playerId)
  if (idx < 0) return game
  const players = game.players.map((p) => ({ ...p }))
  const me = players[idx]
  const visible = me.cards.filter((c) => !c.hidden)
  if (visible.length !== 2) return game
  if (visible[0].rank !== visible[1].rank) return game
  const deck = newDeck()
  // Create two hands
  const first: Player = { ...me, cards: [visible[0]], doubled: false, stood: false, busted: false }
  first.cards.push(deck.pop()!)
  first.value = handValue(first.cards)
  first.busted = first.value > 21

  const second: Player = {
    ...me,
    id: uid(),
    seatId: me.seatId,
    isHost: false,
    cards: [visible[1]],
    doubled: false,
    stood: false,
    busted: false,
  }
  second.cards.push(deck.pop()!)
  second.value = handValue(second.cards)
  second.busted = second.value > 21

  players.splice(idx, 1, first, second)
  return { ...game, players, turnPlayerId: first.id, turnExpiresAt: Date.now() + 15000, updatedAt: Date.now(), intermissionUntil: null }
}

function dealerFinish(dealer: Dealer, players: Player[], shoe: Card[]) {
  const initial: Card[] = dealer.cards.map((c) => ({ ...c, hidden: false }))
  let value = handValue(initial)
  const initialBlackjack = initial.length === 2 && value === 21
  const reveal: Card[] = [...initial]
  if (!initialBlackjack) {
    // Draw until 17+
    while (value < 17) {
      const d = draw(shoe)
      shoe = d.next
      reveal.push(d.card)
      value = handValue(reveal)
    }
  }
  const finalDealer = { cards: reveal, value }
  const msg = summaryMessage(finalDealer, players)
  return { dealer: finalDealer, msg, dealerBlackjack: initialBlackjack, shoe }
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

export function computePayouts(dealer: Dealer, players: Player[], dealerBlackjack?: boolean): Array<{ playerId: string; delta: number }> {
  const results: Array<{ playerId: string; delta: number }> = []
  const dealerBust = dealer.value > 21
  for (const p of players) {
    const base = Math.max(0, p.bet || 0)
    const wager = p.doubled ? base * 2 : base
    let delta = 0
    if (dealerBlackjack) {
      // Insurance resolves
      const ins = Math.max(0, p.insurance || 0)
      delta += ins > 0 ? ins * 2 : 0
      // Main bet: push if player also has 2-card 21, else lose
      const playerBlackjack = p.cards.filter((c) => !c.hidden).length === 2 && p.value === 21
      if (!playerBlackjack) delta -= wager
    } else {
      // Normal resolution
      const ins = Math.max(0, p.insurance || 0)
      // Insurance loses when dealer doesn't have BJ
      delta -= ins
      const playerBlackjack = Boolean(p.blackjack)
      if (playerBlackjack) delta += base * 1.5
      else if (p.busted) delta += -wager
      else if (dealerBust) delta += wager
      else if (p.value > dealer.value) delta += wager
      else if (p.value < dealer.value) delta += -wager
      else delta += 0
    }
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
      seatId: p.seatId,
      name: p.name,
      cards: p.cards,
      value: p.value,
      busted: p.busted,
      stood: p.stood,
      bet: p.bet,
      doubled: p.doubled,
      insurance: p.insurance,
    })),
    dealer: { cards: dealerCards, value: handValue(dealerCards) },
    status: game.status,
    turnPlayerId: game.turnPlayerId,
    turnExpiresAt: (game as any).turnExpiresAt ?? null,
    isHost: Boolean(me?.isHost),
    me: me
      ? {
          id: me.id,
          seatId: me.seatId,
          name: me.name,
          cards: me.cards,
          value: me.value,
          busted: me.busted,
          stood: me.stood,
          bet: me.bet,
          doubled: me.doubled,
          insurance: me.insurance,
        }
      : null,
    message: game.message,
    settings: game.settings,
    shoeRemaining: game.shoe.length,
    intermissionUntil: game.intermissionUntil || null,
  }
}
