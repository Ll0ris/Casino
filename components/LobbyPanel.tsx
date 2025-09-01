"use client"
import { useEffect, useMemo, useState } from 'react'
import CopyButton from '@/components/CopyButton'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function LobbyPanel() {
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [state, setState] = useState<any>(null)
  const token = useMemo(()=> (typeof window!=='undefined' ? localStorage.getItem('playerToken')||'' : ''), [])
  const userId = useMemo(()=> (typeof window!=='undefined' ? localStorage.getItem('authUserId')||'' : ''), [])

  const subscribe = (id: string) => {
    const sb = getSupabaseClient()
    if (!sb) return
    const ch = sb.channel(`lobby:${id}`).on('postgres_changes', { event:'*', schema:'public', table:'rooms', filter:`id=eq.${id}`}, (payload)=>{
      const s = (payload.new as any)?.state
      if (s) setState(s)
    }).subscribe()
    return ch
  }

  useEffect(()=>{
    const saved = localStorage.getItem('lobbyId')
    if (saved) {
      setLobbyId(saved)
      fetch(`/api/lobby/${saved}`).then(r=>r.json()).then(setState).catch(()=>{})
      const ch = subscribe(saved)
      return () => { const sb = getSupabaseClient(); if (sb && ch) sb.removeChannel(ch) }
    }
  }, [])

  useEffect(()=>{
    if (state?.chosenGame === 'blackjack' && lobbyId) {
      // Go to blackjack room with same id
      location.href = `/room/${lobbyId}`
    }
  }, [state, lobbyId])

  const createLobby = async () => {
    const name = localStorage.getItem('guestName') || localStorage.getItem('displayName') || 'Player'
    const res = await fetch('/api/lobby', { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ name }) })
    const data = await res.json().catch(()=>null)
    if (data?.lobbyId) {
      localStorage.setItem('lobbyId', data.lobbyId)
      setLobbyId(data.lobbyId)
      fetch(`/api/lobby/${data.lobbyId}`).then(r=>r.json()).then(setState)
    }
  }

  const joinLobby = async (id: string) => {
    const name = localStorage.getItem('guestName') || localStorage.getItem('displayName') || 'Player'
    await fetch(`/api/lobby/${id}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ op:'join', name }) })
    localStorage.setItem('lobbyId', id)
    setLobbyId(id)
    const s = await (await fetch(`/api/lobby/${id}`)).json()
    setState(s)
  }

  const leaveLobby = async () => {
    if (!lobbyId) return
    await fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token }, body: JSON.stringify({ op:'leave' }) })
    localStorage.removeItem('lobbyId')
    setLobbyId(null)
    setState(null)
  }

  const startBlackjack = async () => {
    if (!lobbyId) return
    await fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ op:'choose', game:'blackjack' }) })
  }

  const masked = (id?: string) => id ? `${id.slice(0,2)}***${id.slice(-2)}` : ''

  return (
    <div className="fixed bottom-4 left-4 z-30 w-80 max-w-[90vw]">
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/80 p-3 text-sm text-zinc-100">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">Lobi</span>
          {!lobbyId ? (
            <button onClick={createLobby} className="rounded bg-emerald-600 px-2 py-1 text-xs">Lobi Kur</button>
          ) : (
            <button onClick={leaveLobby} className="rounded bg-zinc-700 px-2 py-1 text-xs">Lobiden Ayrıl</button>
          )}
        </div>
        {!lobbyId ? (
          <div className="text-xs text-zinc-300">Bir lobi kur veya kodla katıl.</div>
        ) : (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div>Lobi Kodu: <span className="font-mono">{masked(lobbyId)}</span></div>
              <div className="flex items-center gap-2">
                <button onClick={()=>alert(lobbyId)} className="rounded bg-zinc-700 px-2 py-1 text-xs">Gör</button>
                <CopyButton text={location.origin+`/lobby/${lobbyId}`} label="Kopyala" />
              </div>
            </div>
            <div className="max-h-60 overflow-auto rounded border border-emerald-900 bg-emerald-950/40 p-2">
              <div className="mb-1 text-xs text-zinc-400">Katılanlar</div>
              <div className="grid gap-1">
                {(state?.participants||[]).map((p:any, i:number)=> (
                  <div key={i} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/> {p.name}</div>
                ))}
              </div>
            </div>
            {state?.hostTokenHash === (token && ('h'+(Array.from(token).reduce((a,c)=> (a*31+c.charCodeAt(0))|0,0)>>>0))) && (
              <button onClick={startBlackjack} className="rounded bg-emerald-600 px-3 py-2 text-xs">Blackjack ile başlat</button>
            )}
            {state && !lobbyId && (
              <button onClick={()=> joinLobby(prompt('Lobi kodu?')||'')} className="rounded bg-zinc-700 px-2 py-1 text-xs">Koda göre katıl</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

