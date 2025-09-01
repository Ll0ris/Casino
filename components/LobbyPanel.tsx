"use client"
import { useEffect, useMemo, useState } from 'react'
import CopyButton from '@/components/CopyButton'
import { getSupabaseClient } from '@/lib/supabaseClient'

function hashToken(token: string) {
  let h = 0
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0
  return `h${(h >>> 0)}`
}

export default function LobbyPanel() {
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [state, setState] = useState<any>(null)
  const [reveal, setReveal] = useState(false)
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
    if (saved) setLobbyId(saved)
  }, [])

  useEffect(()=>{
    if (!lobbyId) return
    fetch(`/api/lobby/${lobbyId}`).then(r=>r.json()).then(setState).catch(()=>{})
    const ch = subscribe(lobbyId)
    return () => { const sb = getSupabaseClient(); if (sb && ch) sb.removeChannel(ch) }
  }, [lobbyId])

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
    // Yönlendirme: gate sayfası zorunlu
    location.href = `/lobby/${id}`
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
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/90 p-3 text-sm text-zinc-100">
        <div className="mb-2 text-center font-semibold">Lobi</div>
        {!lobbyId ? (
          <div className="grid gap-2">
            <button onClick={createLobby} className="rounded bg-emerald-600 px-3 py-2 text-xs">Lobi Kur</button>
            <button onClick={()=> joinLobby(prompt('Lobi kodu?')||'')} className="rounded bg-zinc-700 px-3 py-2 text-xs">Koda göre katıl</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {/* Code row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-emerald-800 bg-emerald-900/40 px-3 py-1.5 font-mono tracking-widest">{reveal ? lobbyId : '*******'}</div>
              <button title={reveal? 'Gizle':'Göster'} onClick={()=>setReveal(v=>!v)} className="rounded bg-zinc-700 px-2 py-1 text-xs">{reveal? '🙈':'👁️'}</button>
              <CopyButton text={lobbyId} label="Kopyala" />
            </div>
            <hr className="border-emerald-900/60" />
            {/* Participants */}
            <div className="grid gap-2 max-h-72 overflow-auto pr-1">
              {(state?.participants||[]).map((p:any, i:number)=> {
                const isHost = state?.hostTokenHash === p.tokenHash
                const iAmHost = state?.hostTokenHash === hashToken(token)
                const canKick = iAmHost && !isHost
                return (
                  <div key={i} className="flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-900/30 px-3 py-1.5">
                    <div className="flex-1">{p.name} {isHost && <span title="Kurucu">👑</span>}</div>
                    {canKick && (
                      <button title="Kov" onClick={async()=>{ await fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token }, body: JSON.stringify({ op:'kick', targetHash: p.tokenHash }) }); }} className="rounded bg-zinc-700 px-2 py-1 text-xs">✖</button>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Leave button bottom */}
            <button onClick={leaveLobby} className="mt-1 rounded bg-zinc-700 px-3 py-2 text-xs">Lobiden Ayrıl</button>
          </div>
        )}
      </div>
    </div>
  )
}
