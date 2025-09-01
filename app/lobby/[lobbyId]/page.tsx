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
  const [mode, setMode] = useState<'gate'|'ready'>('gate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [guestName, setGuestName] = useState('')
  const [msg, setMsg] = useState('')
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
    const logged = Boolean(userId)
    if (exists) setMode('ready')
    else if (logged) {
      const name = localStorage.getItem('displayName') || 'Player'
      fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ op:'join', name }) }).then(()=>setMode('ready'))
    } else {
      setMode('gate')
    }
  }, [state, lobbyId, token, userId])

  if (error) return <main className="grid place-items-center"><div className="text-sm text-red-300">{error}</div></main>
  if (!state) return <main className="grid place-items-center"><div className="text-sm text-zinc-400">Yükleniyor...</div></main>

  if (mode === 'gate') {
    const hostName = state?.participants?.[0]?.name || 'Bu kullanıcı'
    const login = async () => {
      try {
        const sb = getSupabaseClient(); if (!sb) throw new Error('Supabase env missing')
        const { data, error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        const userId = data.user?.id
        if (userId) {
          localStorage.setItem('authUserId', userId)
          const prof = await fetch('/api/profile', { headers: { 'x-user-id': userId } }).then(r=>r.json()).catch(()=>null)
          if (!prof?.user_id) {
            await fetch('/api/profile', { method:'POST', headers: { 'Content-Type':'application/json', 'x-user-id': userId }, body: JSON.stringify({ email, username: email.split('@')[0] }) })
            localStorage.setItem('displayName', email.split('@')[0])
          } else {
            localStorage.setItem('displayName', prof.username || email.split('@')[0])
          }
          const name = localStorage.getItem('displayName') || 'Player'
          await fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token, 'x-user-id': userId }, body: JSON.stringify({ op:'join', name }) })
          setMode('ready')
        }
      } catch (e:any) { setMsg(e?.message || 'Giriş başarısız') }
    }
    const signup = async () => {
      try {
        const sb = getSupabaseClient(); if (!sb) throw new Error('Supabase env missing')
        const { data, error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        setMsg('E‑posta doğrulama bağlantısı gönderildi. Lütfen e‑postanı kontrol et.')
      } catch (e:any) { setMsg(e?.message || 'Kayıt başarısız') }
    }
    const guestJoin = async () => {
      localStorage.setItem('guestName', guestName || 'Misafir')
      await fetch(`/api/lobby/${lobbyId}`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': token }, body: JSON.stringify({ op:'join', name: guestName || 'Misafir' }) })
      setMode('ready')
    }
    return (
      <main className="grid place-items-center">
        <section className="card w-full max-w-md">
          <h1 className="mb-3 text-lg font-semibold">{hostName}’nın lobisine girmek için giriş yapmalısın</h1>
          <div className="grid gap-3">
            <input className="input" placeholder="E‑posta" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input className="input" placeholder="Şifre" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={login}>Giriş Yap</button>
              <button className="btn-primary" onClick={signup}>Kaydol</button>
            </div>
            <div className="mt-2 grid gap-2">
              <input className="input" placeholder="Misafir adı" value={guestName} onChange={(e)=>setGuestName(e.target.value)} />
              <button className="btn-secondary" onClick={guestJoin}>Misafir Girişi</button>
            </div>
            {msg && <div className="text-xs text-zinc-400">{msg}</div>}
          </div>
        </section>
      </main>
    )
  }

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
