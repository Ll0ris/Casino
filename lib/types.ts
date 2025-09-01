export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type Card = { rank: Rank; suit: Suit; hidden?: boolean }

export type Player = {
  id: string
  name: string
  tokenHash: string
  accountId?: string
  cards: Card[]
  value: number
  busted: boolean
  stood: boolean
  isHost?: boolean
  bet?: number
  doubled?: boolean
}

export type Dealer = {
  cards: Card[]
  value: number
}

export type GameStatus = 'waiting' | 'in_round' | 'round_over'

export type Game = {
  id: string
  players: Player[]
  dealer: Dealer
  status: GameStatus
  turnPlayerId: string | null
  updatedAt: number
  message?: string
}

export type ClientPlayer = Pick<Player, 'id' | 'name' | 'cards' | 'value' | 'busted' | 'stood' | 'bet' | 'doubled'>
export type ClientDealer = Pick<Dealer, 'cards' | 'value'>

export type ClientGameState = {
  id: string
  players: ClientPlayer[]
  dealer: ClientDealer
  status: GameStatus
  turnPlayerId: string | null
  isHost: boolean
  me: ClientPlayer | null
  message?: string
}
