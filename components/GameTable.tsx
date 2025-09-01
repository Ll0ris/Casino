"use client"
import type { ClientGameState } from '@/lib/types'
import clsx from 'clsx'

function Card({ card }: { card: { rank: string; suit: string; hidden?: boolean } }) {
  if (card.hidden) {
    return (
      <div className="h-14 w-10 rounded-md border border-zinc-800 bg-zinc-800" />
    )
  }
  return (
    <div className="grid h-14 w-10 place-items-center rounded-md border border-zinc-800 bg-zinc-900 text-sm">
      <span>
        {card.rank}
        <span className="ml-0.5 text-xs opacity-70">{card.suit}</span>
      </span>
    </div>
  )
}

function Hand({ cards }: { cards: Array<{ rank: string; suit: string; hidden?: boolean }> }) {
  return (
    <div className="flex gap-1">
      {cards.map((c, i) => (
        <Card key={i} card={c} />
      ))}
    </div>
  )
}

import CopyButton from './CopyButton'

export default function GameTable({
  roomId,
  state,
  onAction,
  onLeave,
}: {
  roomId: string
  state: ClientGameState
  onAction: (action: 'hit' | 'stand' | 'start') => void
  onLeave: () => void
}) {
  const me = state.me
  const mySeatId = me?.seatId
  const currentHand = state.players.find((p) => p.id === state.turnPlayerId) || null
  const isMyTurn = Boolean(currentHand && mySeatId && currentHand.seatId === mySeatId)
  const canDouble = state.status === 'in_round' && isMyTurn && currentHand && (currentHand.cards.filter((c)=>!c.hidden).length === 2) && !currentHand.doubled
  const canSplit = state.status === 'in_round' && isMyTurn && currentHand && (currentHand.cards.filter((c)=>!c.hidden).length === 2) && (currentHand.cards?.[0]?.rank === currentHand.cards?.[1]?.rank)
  const dealerAceUp = state.dealer.cards[0] && !state.dealer.cards[0].hidden && state.dealer.cards[0].rank === 'A'
  const takeInsurance = async (amount?: number) => {
    const val = amount ?? Math.max(0, (me?.bet || 0) / 2)
    await fetch(`/api/rooms/${roomId}/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': localStorage.getItem('playerToken') || '',
      },
      body: JSON.stringify({ amount: val })
    })
  }
  const setBet = async (bet: number) => {
    await fetch(`/api/rooms/${roomId}/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': localStorage.getItem('playerToken') || '',
      },
      body: JSON.stringify({ bet })
    })
  }
  const onDouble = async () => {
    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': localStorage.getItem('playerToken') || '',
      },
      body: JSON.stringify({ action: 'double' })
    })
  }
  const onSplit = async () => {
    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': localStorage.getItem('playerToken') || '',
      },
      body: JSON.stringify({ action: 'split' })
    })
  }

  return (
    <div className="grid gap-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Oda ID: {state.id}</span>
          <span>Oyuncular: {state.players.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={`${location.origin}/room/${roomId}`} label="Davet Linki" />
        </div>
      </div>
      <div className="grid gap-2">
        <h2 className="text-lg font-medium">Dağıtıcı</h2>
        <Hand cards={state.dealer.cards} />
        <p className="text-xs text-zinc-400">Puan: {state.dealer.value}</p>
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-medium">Oyuncular</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.values(
            state.players.reduce((acc: Record<string, { name: string; seatId: string; hands: typeof state.players }>, p) => {
              const key = p.seatId
              if (!acc[key]) acc[key] = { name: p.name, seatId: p.seatId, hands: [] as any }
              acc[key].hands.push(p)
              return acc
            }, {})
          ).map((seat) => (
            <div key={seat.seatId} className={clsx('rounded-lg border p-3', seat.seatId === mySeatId ? 'border-emerald-700 bg-emerald-900/10' : 'border-zinc-800 bg-zinc-900')}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{seat.name}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {seat.hands.map((h, idx) => (
                  <div key={h.id} className={clsx('rounded-md border border-zinc-700/60 p-2', h.id === state.turnPlayerId && state.status === 'in_round' ? 'outline outline-2 outline-amber-400/60 bg-amber-400/10' : 'bg-zinc-950/40')}>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                      <span>El {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span>Bet: {h.bet ?? 0}</span>
                        {h.insurance ? <span>Ins: {h.insurance}</span> : null}
                        <span>Puan: {h.value}</span>
                      </div>
                    </div>
                    <Hand cards={h.cards} />
                    <div className="mt-1 text-[11px]">
                      {h.busted && <span className="rounded bg-red-600/20 px-1.5 py-0.5 text-red-300">Bust</span>}
                      {!h.busted && h.stood && <span className="rounded bg-sky-600/20 px-1.5 py-0.5 text-sky-300">Stand</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state.isHost && state.status === 'waiting' && (
          <button
            onClick={() => onAction('start')}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Eli Başlat
          </button>
        )}
        {state.isHost && state.status === 'round_over' && (
          <button
            onClick={() => onAction('start')}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Tekrar Oyna
          </button>
        )}
        {state.status === 'in_round' && isMyTurn && (
          <>
            <button
              onClick={() => onAction('hit')}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              Hit
            </button>
            <button
              onClick={() => onAction('stand')}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500"
            >
              Stand
            </button>
            {canDouble && (
              <button
                onClick={onDouble}
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium hover:bg-amber-500"
              >
                Double Down
              </button>
            )}
            {canSplit && (
              <button
                onClick={onSplit}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium hover:bg-purple-500"
              >
                Split
              </button>
            )}
          </>
        )}
        <button
          onClick={onLeave}
          className="rounded-md bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600"
        >
          Odadan Ayrıl
        </button>
      </div>

      {state.message && (
        <div className="rounded-md border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {state.message}
        </div>
      )}

      {me && (state.status === 'waiting' || state.status === 'round_over') && (
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <span>Bahisin:</span>
          <input
            type="number"
            min={0}
            step={1}
            defaultValue={me.bet ?? 0}
            onBlur={(e) => setBet(parseInt(e.target.value || '0'))}
            className="w-24 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 outline-none focus:border-zinc-600"
          />
          <span className="text-xs text-zinc-500">(Eli başlatmadan önce belirle)</span>
        </div>
      )}

      {me && state.status === 'in_round' && dealerAceUp && !me.insurance && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-amber-300">
          <span>Insurance mevcut (Dealer Ace).</span>
          <button onClick={()=>takeInsurance()} className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium hover:bg-amber-500">Yarım Bet Al</button>
          <span className="text-xs text-amber-200/80">(Max: {(me.bet||0)/2})</span>
        </div>
      )}
    </div>
  )
}
