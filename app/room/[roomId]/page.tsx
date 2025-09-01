"use client"
import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientGameState, Game } from '@/lib/types'
import GameTable from '@/components/GameTable'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { toClient } from '@/lib/game'

function clientHashToken(token: string) {
  let h = 0
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0
  return `h${(h >>> 0)}`
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [state, setState] = useState<ClientGameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [playerToken, setPlayerToken] = useState('')

  useEffect(() => {
    // Ensure player token exists even on deep-link
    const existing = localStorage.getItem('playerToken')
    if (existing) {
      setPlayerToken(existing)
    } else {
      const t = crypto.randomUUID()
      localStorage.setItem('playerToken', t)
      setPlayerToken(t)
    }
  }, [])

  const poll = async () => {
    // Kept as a safety fallback to fetch latest sanitized state
    try {
      const sb = getSupabaseClient()
      const { data, error } = await sb!.from('rooms').select('state').eq('id', roomId).single()
      if (error || !data?.state) {
        setError('Oda bulunamadı veya silindi.')
        return
      }
      const tokenHash = clientHashToken(playerToken || '')
      const next = toClient(data.state as Game, tokenHash)
      setState(next)
      setError(null)
    } catch (e) {
      setError('Ağ hatası')
    }
  }

  useEffect(() => {
    // Initial fetch via Supabase
    poll()
    // Realtime subscribe to rooms row
    const sb = getSupabaseClient()
    let channel: ReturnType<NonNullable<typeof sb>['channel']> | null = null
    if (sb) {
      channel = sb
        .channel(`rooms:${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload: any) => {
          if (payload?.new?.state) {
            const game = payload.new.state as Game
            const tokenHash = clientHashToken(playerToken || '')
            const next = toClient(game, tokenHash)
            setState(next)
            setError(null)
          } else if (payload?.eventType === 'DELETE') {
            setError('Oda silindi')
          } else {
            // fallback
            poll()
          }
        })
        .subscribe()
    }
    return () => {
      if (channel && sb) sb.removeChannel(channel)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [roomId, playerToken])

  const onAction = async (action: 'hit' | 'stand' | 'start') => {
    if (action === 'start') {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': playerToken,
        },
        body: JSON.stringify({ op: 'start' }),
      })
      if (!res.ok) return
      return poll()
    }
    const res = await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': playerToken,
      },
      body: JSON.stringify({ action }),
    })
    if (res.ok) poll()
  }

  const [pendingJoinName, setPendingJoinName] = useState('')
  const [pendingJoinBet, setPendingJoinBet] = useState<number>(10)
  const onJoinDirect = async () => {
    if (!pendingJoinName.trim()) return
    const res = await fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': playerToken,
        'x-user-id': localStorage.getItem('authUserId') || '',
      },
      body: JSON.stringify({ name: pendingJoinName.trim(), bet: pendingJoinBet }),
    })
    if (res.ok) {
      setPendingJoinName('')
      poll()
    }
  }

  const onLeave = async () => {
    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': playerToken,
      },
      body: JSON.stringify({ action: 'leave' }),
    })
    router.push('/')
  }

  if (error) {
    return (
      <main className="grid gap-4">
        <h1 className="text-xl font-semibold">Oda: {roomId}</h1>
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="w-fit rounded-md bg-zinc-700 px-3 py-2 text-sm"
        >
          Ana sayfaya dön
        </button>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="grid gap-4">
        <h1 className="text-xl font-semibold">Oda: {roomId}</h1>
        <p className="text-zinc-400">Yükleniyor...</p>
      </main>
    )
  }

  return (
    <main className="grid gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Oda: {roomId}</h1>
          <p className="text-xs text-zinc-400">Durum: {state.status}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400" />
      </div>
      {!state.me && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-300">Bu odaya katıl:</span>
            <input
              placeholder="İsminiz"
              value={pendingJoinName}
              onChange={(e) => setPendingJoinName(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={pendingJoinBet}
              onChange={(e) => setPendingJoinBet(parseInt(e.target.value || '0'))}
              className="w-24 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
              placeholder="Bahis"
            />
            <button
              onClick={onJoinDirect}
              disabled={!pendingJoinName.trim() || !playerToken}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Katıl
            </button>
          </div>
        </div>
      )}
      <GameTable roomId={roomId} state={state} onAction={onAction} onLeave={onLeave} />
    </main>
  )
}
