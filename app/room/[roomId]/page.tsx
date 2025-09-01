"use client"
import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientGameState } from '@/lib/types'
import GameTable from '@/components/GameTable'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [state, setState] = useState<ClientGameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intervalMs, setIntervalMs] = useState(1200)
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
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        headers: { 'x-player-token': playerToken },
        cache: 'no-store',
      })
      if (res.status === 404) {
        setError('Oda bulunamadı veya silindi.')
        return
      }
      const data = (await res.json()) as ClientGameState
      setState(data)
      setError(null)
    } catch (e) {
      setError('Ağ hatası, tekrar denenecek...')
    }
  }

  useEffect(() => {
    // Start with one fetch for initial state
    poll()
    // Fallback polling (in case Realtime is unavailable)
    timerRef.current = setInterval(poll, intervalMs)

    // Supabase Realtime: listen table changes and refetch sanitized state
    const sb = getSupabaseClient()
    let channel: ReturnType<NonNullable<typeof sb>['channel']> | null = null
    if (sb) {
      channel = sb
        .channel(`rooms:${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => {
          // Use server API to hide dealer hole card
          poll()
        })
        .subscribe()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (channel && sb) sb.removeChannel(channel)
    }
    // Recreate when deps change
  }, [roomId, intervalMs, playerToken])

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
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Güncelleme aralığı</span>
          <select
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1"
            value={intervalMs}
            onChange={(e) => setIntervalMs(parseInt(e.target.value))}
          >
            <option value={800}>0.8s</option>
            <option value={1200}>1.2s</option>
            <option value={2000}>2s</option>
          </select>
        </div>
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
