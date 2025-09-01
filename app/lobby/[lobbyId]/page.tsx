"use client"
import { use, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import CopyButton from '@/components/CopyButton'

function hashToken(token: string) {
  let h = 0
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0
  return `h${(h >>> 0)}`
}

export default function LobbyPage({ params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = use(params)
  const [state, setState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const token = useMemo(()=> (typeof window!=='undefined' ? localStorage.getItem('playerToken')||'' : ''), [])
  const userId = useMemo(()=> (typeof window!=='undefined' ? localStorage.getItem('authUserId')||'' : ''), [])

  const load = async () => {
    const res = await fetch(`/api/lobby/${lobbyId}`)
    if (!res.ok) { setError('Lobi bulunamadı'); return }
    const data = await res.json(); setState(data)
  }

  useEffect(()=>{ load() }, [lobbyId])

  useEffect(()=>{
    const sb = getSupabaseClient(); if (!sb) return
    const ch = sb.channel(`lobby:${lobbyId}`).on('postgres_changes', { event:'*', schema:'public', table:'rooms', filter:`id=eq.${lobbyId}` }, (payload:any)=>{
      const s = (payload.new as any)?.state
      if (s) setState(s)
    }).subscribe()
    return ()=> { if (sb) sb.removeChannel(ch) }
  }, [lobbyId])

  useEffect(()=>{
    if (!state) return
    if (state?.kind !== 'lobby') {
      // Game started
      location.href = `/room/${lobbyId}`
      return
    }
    const exists = (state.participants||[]).some((p:any)=> p.tokenHash === hashToken(token))
    if (!exists) {
      const name = localStorage.getItem('guestName') || localStorage.getItem('displayName') || 'Player'
      fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ op:'join', name }) })
    }
  }, [state, lobbyId, token, userId])

  if (error) return <main className="grid place-items-center"><div className="text-sm text-red-300">{error}</div></main>
  if (!state) return <main className="grid place-items-center"><div className="text-sm text-zinc-400">Yükleniyor...</div></main>

  const isHost = state.hostTokenHash === hashToken(token)
  const start = async () => {
    await fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ op:'choose', game:'blackjack' }) })
  }

  return (
    <main className="grid gap-6">
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Lobi: {lobbyId}</div>
          <CopyButton text={`${location.origin}/lobby/${lobbyId}`} label="Kopyala" />
        </div>
        <div className="mb-3 text-sm text-zinc-300">Lobi sahibinin oyunu başlatması bekleniyor…</div>
        <div className="rounded border border-emerald-900 bg-emerald-950/40 p-3">
          <div className="mb-1 text-xs text-zinc-400">Katılanlar</div>
          <div className="grid gap-1">
            {(state.participants||[]).map((p:any, i:number)=> (
              <div key={i} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/> {p.name}</div>
            ))}
          </div>
        </div>
        {isHost && (
          <div className="mt-3">
            <button onClick={start} className="btn-primary">Blackjack ile başlat</button>
          </div>
        )}
      </section>
    </main>
  )
}

