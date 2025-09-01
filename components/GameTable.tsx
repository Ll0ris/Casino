"use client"
import { useEffect, useState } from 'react'
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
  const [now, setNow] = useState(Date.now())
  useEffect(()=>{
    const t = setInterval(()=>setNow(Date.now()), 300)
    return ()=>clearInterval(t)
  },[])
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-zinc-700/60 bg-zinc-950/40 px-2 py-1">Kalan kart: <span className="font-medium">{state.shoeRemaining}</span></div>
          <div className="rounded-md border border-zinc-700/60 bg-zinc-950/40 px-2 py-1">Deste sayısı: <span className="font-medium">{state.settings.deckCount}</span></div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Scoreboard */}
          <Scoreboard roomId={roomId} mySeatId={me?.seatId || ''} refreshKey={state.intermissionUntil || state.turnPlayerId || 0} />
        </div>
        {state.isHost && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Deste</span>
            <input
              type="range"
              min={1}
              max={6}
              defaultValue={state.settings.deckCount}
              onChange={async (e)=>{
                const v = parseInt(e.target.value)
                await fetch(`/api/rooms/${roomId}/settings`, {
                  method: 'POST',
                  headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken') || '' },
                  body: JSON.stringify({ deckCount: v, shuffleAt: 35, autoContinue: state.settings?.autoContinue ?? true })
                })
              }}
            />
            <label className="ml-2 flex items-center gap-1">
              <input type="checkbox" defaultChecked={(state.settings as any).autoContinue ?? true} onChange={async(e)=>{
                await fetch(`/api/rooms/${roomId}/settings`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken') || '' }, body: JSON.stringify({ autoContinue: e.target.checked }) })
              }} />
              <span>Oto geçiş</span>
            </label>
          </div>
        )}
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
                {seat.hands.map((h, idx) => {
                  const isTurn = h.id === state.turnPlayerId && state.status === 'in_round'
                  const secs = isTurn && state.turnExpiresAt ? Math.max(0, Math.ceil((state.turnExpiresAt - now)/1000)) : null
                  return (
                  <div key={h.id} className={clsx('rounded-md border border-zinc-700/60 p-2', h.id === state.turnPlayerId && state.status === 'in_round' ? 'outline outline-2 outline-amber-400/60 bg-amber-400/10' : 'bg-zinc-950/40')}>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                      <span>El {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span>Bet: {h.bet ?? 0}</span>
                        {h.insurance ? <span>Ins: {h.insurance}</span> : null}
                        <span>Puan: {h.value}</span>
                        {secs !== null && <span className="text-amber-300">Süre: {secs}s</span>}
                      </div>
                    </div>
                    <Hand cards={h.cards} />
                    <div className="mt-1 text-[11px]">
                      {h.busted && <span className="rounded bg-red-600/20 px-1.5 py-0.5 text-red-300">Bust</span>}
                      {!h.busted && h.stood && <span className="rounded bg-sky-600/20 px-1.5 py-0.5 text-sky-300">Stand</span>}
                    </div>
                  </div>
                )})}
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

      {state.status === 'round_over' && state.intermissionUntil && (
        <div className="text-center text-sm text-zinc-300">
          Yeni el {Math.max(0, Math.ceil((state.intermissionUntil - now)/1000))}s içinde başlayacak
        </div>
      )}

      {/* Bottom-left my balance */}
      <MyBalance roomId={roomId} mySeatId={me?.seatId || ''} refreshKey={state.intermissionUntil || state.turnPlayerId || 0} />
    </div>
  )
}

function MyBalance({ roomId, mySeatId, refreshKey }: { roomId: string; mySeatId: string; refreshKey: number|string }) {
  const [bal, setBal] = useState<number | null>(null)
  useEffect(()=>{
    const load = async ()=>{
      const res = await fetch(`/api/rooms/${roomId}/balances`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const me = (data?.items||[]).find((x:any)=>x.seatId === mySeatId)
      setBal(me?.balance ?? null)
    }
    load()
  },[roomId, mySeatId, refreshKey])
  return (
    <div className="fixed left-4 bottom-4 rounded-md border border-zinc-700/60 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-200">
      Bakiye: <span className="font-semibold">{bal ?? '-'}</span>
    </div>
  )
}

function Scoreboard({ roomId, mySeatId, refreshKey }: { roomId: string; mySeatId: string; refreshKey: number|string }) {
  const [items, setItems] = useState<Array<{ seatId: string; name: string; balance: number }>>([])
  useEffect(()=>{
    const load = async ()=>{
      const res = await fetch(`/api/rooms/${roomId}/balances`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const arr = (data?.items||[]).sort((a:any,b:any)=> (b.balance||0)-(a.balance||0))
      setItems(arr)
    }
    load()
  },[roomId, refreshKey])
  const top = items[0]
  return (
    <div className="rounded-md border border-zinc-700/60 bg-zinc-950/70 p-2 text-xs text-zinc-300">
      <div className="mb-1 text-zinc-400">Skor Tablosu</div>
      {items.length === 0 ? <div>—</div> : (
        <div className="flex items-center gap-3">
          {items.map((x)=> (
            <div key={x.seatId} className={x.seatId===mySeatId? 'font-semibold text-emerald-300':'text-zinc-300'}>
              {x.name}: {x.balance ?? 0}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
