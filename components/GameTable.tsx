"use client"
import { useEffect, useMemo, useState } from 'react'
import type { ClientGameState } from '@/lib/types'
import clsx from 'clsx'

function Card({ card }: { card: { rank: string; suit: string; hidden?: boolean } }) {
  if (card.hidden) {
    return <div className="h-16 w-12 rounded-xl border border-zinc-700/70 bg-zinc-700/70 shadow" />
  }
  const info = suitInfo(card.suit)
  const isRed = info.name === 'heart' || info.name === 'diamond'
  return (
    <div className="grid h-16 w-12 place-items-center rounded-xl border border-zinc-300 bg-white text-sm shadow-lg shadow-black/30">
      <span className={clsx('flex items-center font-semibold', isRed ? 'text-red-600' : 'text-black')}>
        {card.rank}
        <i className={clsx('ml-1 text-sm', 'fa-solid', info.icon, isRed ? 'text-red-600' : 'text-black')} />
      </span>
    </div>
  )
}

function TableActions({
  isHost,
  status,
  isMyTurn,
  canDouble,
  canSplit,
  onAction,
  onDouble,
  onSplit,
  dealerAceUp,
  meBet,
  hasInsurance,
  takeInsurance,
  turnExpiresAt,
  now,
  roomId,
}: {
  isHost: boolean
  status: ClientGameState['status']
  isMyTurn: boolean
  canDouble: boolean
  canSplit: boolean
  onAction: (action: 'hit' | 'stand' | 'start') => void
  onDouble: () => void
  onSplit: () => void
  dealerAceUp: boolean
  meBet: number
  hasInsurance?: boolean
  takeInsurance: (amount?: number) => void
  turnExpiresAt?: number | null
  now: number
  roomId: string
}) {
  const secs = status === 'in_round' && turnExpiresAt ? Math.max(0, Math.ceil((turnExpiresAt - now) / 1000)) : null
  return (
    <div className="pointer-events-none fixed left-1/2 bottom-6 z-40 -translate-x-1/2 w-[min(92vw,860px)]">
      {/* Start/Restart controls for host */}
      {isHost && (status === 'waiting' || status === 'round_over') && (
        <div className="pointer-events-auto mb-3 flex items-center justify-center gap-2">
          <button onClick={() => onAction('start')} className="btn-action btn-green">
            <i className="fa-solid fa-play mr-1" /> Eli Baslat
          </button>
          <button
            onClick={async () => {
              await fetch(`/api/rooms/${roomId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-player-token': localStorage.getItem('playerToken') || '' },
                body: JSON.stringify({ autoContinue: true }),
              })
            }}
            className="btn-action btn-slate"
            title="Oto gecis"
          >
            <i className="fa-solid fa-rotate-right mr-1" /> Oto
          </button>
        </div>
      )}

      {/* Action buttons during turn */}
      {status === 'in_round' && isMyTurn && (
        <div className="pointer-events-auto mx-auto flex items-center justify-center gap-3 rounded-2xl border border-emerald-900/50 bg-zinc-950/70 p-2 shadow-lg">
          {canDouble && (
            <button onClick={onDouble} className="btn-action btn-amber" title="Double">
              <span className="font-semibold">2x</span>
            </button>
          )}
          <button onClick={() => onAction('hit')} className="btn-action btn-green" title="Hit">
            <i className="fa-solid fa-plus" />
          </button>
          <button onClick={() => onAction('stand')} className="btn-action btn-red" title="Stand">
            <i className="fa-solid fa-minus" />
          </button>
          {canSplit && (
            <button onClick={onSplit} className="btn-action btn-slate" title="Split">
              <i className="fa-solid fa-code-compare rotate-90" />
            </button>
          )}
        </div>
      )}

      {/* Insurance prompt as separate bottom panel */}
      {status === 'in_round' && dealerAceUp && !hasInsurance && (
        <div className="pointer-events-auto mt-2 rounded-2xl border border-emerald-900/50 bg-zinc-950/70 p-3 text-sm shadow-lg">
          <div className="mb-2 text-center text-zinc-200">SIGORTA?</div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => takeInsurance()} className="btn-action btn-amber">
              <i className="fa-solid fa-shield mr-1" /> EVET
            </button>
            <button onClick={() => takeInsurance(0)} className="btn-action btn-red">
              <i className="fa-solid fa-shield mr-1" /> HAYIR
            </button>
          </div>
        </div>
      )}

      {/* Turn timer bar */}
      {status === 'in_round' && (
        <div className="pointer-events-none mt-2 h-1 w-full rounded bg-emerald-500/80">
          <div className="relative -top-2 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-emerald-500 text-center text-[11px] font-bold leading-6 text-black ring-2 ring-emerald-700">
            {secs ?? ''}
          </div>
        </div>
      )}
    </div>
  )
}
function suitInfo(suit: string) {
  // 6=spade, 3=heart, 4=diamond, 5=club (legacy CP437 mapping)
  switch (suit) {
    case '\u0003':
      return { icon: 'fa-suit-heart', name: 'heart' }
    case '\u0004':
      return { icon: 'fa-suit-diamond', name: 'diamond' }
    case '\u0005':
      return { icon: 'fa-suit-club', name: 'club' }
    case '\u0006':
    default:
      return { icon: 'fa-suit-spade', name: 'spade' }
  }
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
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="relative grid gap-4 p-0 w-[80vw] max-w-[1700px] left-1/2 -translate-x-1/2">
      {/* Header with room info removed */}

      {false && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-zinc-700/60 bg-zinc-950/40 px-2 py-1">Kalan kart: <span className="font-medium">{state.shoeRemaining}</span></div>
          <div className="rounded-md border border-zinc-700/60 bg-zinc-950/40 px-2 py-1">Deste sayısı: <span className="font-medium">{state.settings.deckCount}</span></div>
        </div>
        <div className="ml-auto" />
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
      )}

      <TableView
        roomId={roomId}
        state={state}
        mySeatId={mySeatId || ''}
        onAction={onAction}
        onDouble={onDouble}
        onSplit={onSplit}
        dealerAceUp={dealerAceUp}
        meBet={me?.bet || 0}
        takeInsurance={takeInsurance}
        now={now}
        isMyTurn={!!isMyTurn}
        canDouble={!!canDouble}
        canSplit={!!canSplit}
      />

      {false && (
      <div className="grid gap-2">
        <h2 className="text-lg font-medium">Dağıtıcı</h2>
        <Hand cards={state.dealer.cards} />
        <p className="text-xs text-zinc-400">Puan: {state.dealer.value}</p>
      </div>
      )}

      {false && (
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
      )}

      {false && (
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
      )}

      {false && state.message && (
        <div className="rounded-md border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {state.message}
        </div>
      )}

      {false && me && (state.status === 'waiting' || state.status === 'round_over') && (
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <span>Bahisin:</span>
          <input
            type="number"
            min={0}
            step={1}
            defaultValue={me?.bet ?? 0}
            onBlur={(e) => setBet(parseInt(e.target.value || '0'))}
            className="w-24 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 outline-none focus:border-zinc-600"
          />
          <span className="text-xs text-zinc-500">(Eli başlatmadan önce belirle)</span>
        </div>
      )}

      {false && me && state.status === 'in_round' && dealerAceUp && !(me?.insurance) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-amber-300">
          <span>Insurance mevcut (Dealer Ace).</span>
          <button onClick={()=>takeInsurance()} className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium hover:bg-amber-500">Yarım Bet Al</button>
          <span className="text-xs text-amber-200/80">(Max: {(me?.bet||0)/2})</span>
        </div>
      )}

      {false && state.status === 'round_over' && state.intermissionUntil && (
        <div className="text-center text-sm text-zinc-300">
          Yeni el {Math.max(0, Math.ceil((((state.intermissionUntil)||0) - now)/1000))}s içinde başlayacak
        </div>
      )}

      {/* Bottom-left my balance */}
      <MyBalance roomId={roomId} mySeatId={me?.seatId || ''} refreshKey={state.intermissionUntil || state.turnPlayerId || 0} />

      {/* Host-only settings button + modal */}
      {state.isHost && (
        <>
          <button
            onClick={() => setShowSettings(true)}
            className="fixed right-6 bottom-6 z-40 btn-secondary px-4 py-2"
          >
            Oda Ayarlari
          </button>
          {showSettings && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
              <div className="w-[min(92vw,520px)] rounded-2xl border border-zinc-700/60 bg-zinc-900/90 p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-200">Oda Ayarlari</div>
                  <button onClick={()=>setShowSettings(false)} className="btn btn-secondary px-2 py-1 text-xs">Kapat</button>
                </div>
                <div className="grid gap-4 text-sm text-zinc-300">
                  <label className="grid gap-1">
                    <span className="text-xs text-zinc-400">Deste sayisi: {state.settings.deckCount}</span>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      defaultValue={state.settings.deckCount}
                      onChange={async (e)=>{
                        const v = Number(e.target.value||'1')
                        await fetch(`/api/rooms/${roomId}/settings`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-player-token': localStorage.getItem('playerToken') || '' },
                          body: JSON.stringify({ deckCount: v, shuffleAt: 35, autoContinue: state.settings?.autoContinue ?? true })
                        })
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={(state.settings as any).autoContinue ?? true} onChange={async(e)=>{
                      await fetch(`/api/rooms/${roomId}/settings`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken') || '' }, body: JSON.stringify({ autoContinue: e.target.checked }) })
                    }} />
                    <span>Oto gecis</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TableView({
  roomId,
  state,
  mySeatId,
  onAction,
  onDouble,
  onSplit,
  dealerAceUp,
  meBet,
  takeInsurance,
  now,
  isMyTurn,
  canDouble,
  canSplit,
}: {
  roomId: string
  state: ClientGameState
  mySeatId: string
  onAction: (action: 'hit' | 'stand' | 'start') => void
  onDouble: () => void
  onSplit: () => void
  dealerAceUp: boolean
  meBet: number
  takeInsurance: (amount?: number) => void
  now: number
  isMyTurn: boolean
  canDouble: boolean
  canSplit: boolean
}) {
  const seats = useMemo(() => {
    const map: Record<string, { seatId: string; name: string }> = {}
    for (const p of state.players) {
      if (!map[p.seatId]) map[p.seatId] = { seatId: p.seatId, name: p.name }
    }
    return Object.values(map)
  }, [state.players])

  const maxSpots = 7
  const lefts = [8, 22, 36, 50, 64, 78, 92]
  const spots = Array.from({ length: maxSpots }).map((_, i) => seats[i] || null)

  const currentHand = state.players.find((p) => p.id === state.turnPlayerId) || null
  const isMyTurnLocal = Boolean(currentHand && mySeatId && currentHand.seatId === mySeatId)
  return (
    <div className="relative isolate h-[60vh] sm:h-[65vh] lg:h-[70vh] xl:h-[75vh] w-full overflow-hidden rounded-[36px] border border-teal-900/60 bg-gradient-to-b from-teal-800 to-teal-700">
      <div className="absolute inset-x-0 bottom-0 h-[320px] rounded-t-[36px] rounded-b-[240px] bg-teal-700 shadow-[inset_0_20px_60px_rgba(0,0,0,0.35)]" />

      {/* Lounge label */}
      <div className="absolute left-1/2 top-12 -translate-x-1/2 rounded-full border border-black/30 bg-teal-600/70 px-4 py-1 text-sm font-medium text-zinc-100 shadow">
        {(state.hostName || 'Player') + "'s Lounge"}
      </div>

      {/* Felt texts */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-[11px] font-semibold tracking-widest text-emerald-100/90">
        BLACKJACK PAYS 3 TO 2
      </div>
      <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-[10px] tracking-wider text-emerald-100/80">
        DEALER MUST DRAW TO 16 AND STAND ON ALL 17s
      </div>

      {/* Dealer hand in the upper center */}
      <div className="absolute left-1/2 top-20 -translate-x-1/2 text-center">
        <Hand cards={state.dealer.cards} />
        <div className="mt-1 text-xs text-zinc-100">Puan: {state.dealer.value}</div>
      </div>

      {/* Shoe on right */}
      <div className="absolute right-8 top-24 flex flex-col items-center gap-2">
        <div className="relative h-24 w-16">
          <div className="absolute left-2 top-2 h-24 w-14 rotate-3 rounded-md border border-zinc-800 bg-zinc-900" />
          <div className="absolute left-0 top-0 h-24 w-14 -rotate-3 rounded-md border border-zinc-700 bg-zinc-800" />
        </div>
        <div className="rounded-md border border-zinc-700/60 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-200">
          Kart: <span className="font-semibold">{state.shoeRemaining}</span>
        </div>
      </div>

      {/* 7 betting spots with simple on-table hands */}
      {spots.map((seat, i) => {
        const px = lefts[i]
        const hand = seat ? state.players.find((p) => p.seatId === seat.seatId) : null
        const isTurn = hand && hand.id === state.turnPlayerId && state.status === 'in_round'
        return (
          <div key={i} className="absolute -translate-x-1/2" style={{ left: `${px}%`, bottom: 36 }}>
            <div className={clsx('h-14 w-14 rounded-full border-2', isTurn ? 'border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]' : seat ? 'border-black/70' : 'border-black/40', 'bg-transparent')} />
            <div className={clsx('mt-1 w-24 -translate-x-1/2 text-center text-xs', 'relative left-1/2', seat && mySeatId === seat.seatId ? 'font-semibold text-emerald-200' : 'text-zinc-100')}>
              {seat ? seat.name : `#${i + 1}`}
            </div>
            {hand && (
              <div className="relative left-1/2 -translate-x-1/2 translate-y-[-54px]">
                <Hand cards={hand.cards} />
              </div>
            )}
          </div>
        )
      })}

      {/* Host controls */}
      {state.isHost && (
        <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs text-zinc-200">
          <div className="rounded-md border border-zinc-700/60 bg-zinc-950/40 px-2 py-1">
            Deste sayisi: <span className="font-medium">{state.settings.deckCount}</span>
          </div>
          <input
            title="Deste sayisi"
            type="range"
            min={1}
            max={6}
            defaultValue={state.settings.deckCount}
            onChange={async (e) => {
              const v = Number(e.target.value || '1')
              await fetch(`/api/rooms/${roomId}/settings`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-player-token': localStorage.getItem('playerToken') || '',
                },
                body: JSON.stringify({ deckCount: v, shuffleAt: 35, autoContinue: state.settings?.autoContinue ?? true }),
              })
            }}
          />
          <label className="ml-1 flex items-center gap-1">
            <input
              type="checkbox"
              defaultChecked={(state.settings as any).autoContinue ?? true}
              onChange={async (e) => {
                await fetch(`/api/rooms/${roomId}/settings`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-player-token': localStorage.getItem('playerToken') || '',
                  },
                  body: JSON.stringify({ autoContinue: e.target.checked }),
                })
              }}
            />
            <span>Oto gecis</span>
          </label>
        </div>
      )}
      {/* Action bar over table bottom center */}
      <TableActions
        isHost={Boolean(state.isHost)}
        status={state.status}
        isMyTurn={isMyTurnLocal}
        canDouble={canDouble}
        canSplit={canSplit}
        onAction={onAction}
        onDouble={onDouble}
        onSplit={onSplit}
        dealerAceUp={dealerAceUp}
        meBet={meBet}
        hasInsurance={Boolean((state as any).me?.insurance)}
        takeInsurance={takeInsurance}
        turnExpiresAt={(state as any).turnExpiresAt || 0}
        now={now}
        roomId={roomId}
      />
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

// Scoreboard moved to a floating panel on RoomPage
