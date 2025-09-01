"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<'landing'|'login'|'signup'|'guest'>('landing')
  const [guestName, setGuestName] = useState('')
  const [guestRoom, setGuestRoom] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('playerToken')) localStorage.setItem('playerToken', crypto.randomUUID())
    const uid = localStorage.getItem('authUserId')
    setAuthUserId(uid)
    if (uid) {
      fetch('/api/profile', { headers: { 'x-user-id': uid } })
        .then(r=>r.json()).then(p=> setUsername(p?.username || p?.email?.split('@')[0] || ''))
        .catch(()=>{})
    }
  }, [])

  const onCreate = async () => {
    const name = username || localStorage.getItem('guestName') || ''
    if (!name) return
    try {
      setBusy(true); setErr(null)
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken')||'', 'x-user-id': localStorage.getItem('authUserId')||'' },
        body: JSON.stringify({ name })
      })
      const data = await res.json().catch(()=>null)
      if (res.ok && data?.roomId) router.push(`/room/${data.roomId}`)
      else setErr('Oda oluşturulamadı.')
    } finally { setBusy(false) }
  }

  const isLogged = Boolean(authUserId)

  return (
    <main className="grid gap-8">
      {!isLogged ? (
        <section className="card">
          <div className="mb-4 grid place-items-center gap-2">
            <h1 className="text-2xl font-semibold">Hoş geldin</h1>
            <p className="text-sm text-zinc-400">Kaydol, giriş yap veya misafir olarak katıl.</p>
          </div>
          {mode === 'landing' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button className="btn-primary" onClick={()=>setMode('signup')}><i className="fa-solid fa-user-plus mr-2"/>Kaydol</button>
              <button className="btn-secondary" onClick={()=>setMode('login')}><i className="fa-solid fa-right-to-bracket mr-2"/>Giriş Yap</button>
              <button className="btn-secondary bg-purple-600 hover:bg-purple-500" onClick={()=>setMode('guest')}><i className="fa-solid fa-user-secret mr-2"/>Misafir Girişi</button>
            </div>
          )}
          {mode === 'signup' && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-zinc-300"><i className="fa-solid fa-user-plus"/> Yeni hesap (başlangıç: 1000$)</div>
              <input className="input" placeholder="E-posta" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
              <input className="input" placeholder="Kullanıcı adı" value={authUsername} onChange={(e)=>setAuthUsername(e.target.value)} />
              <input className="input" placeholder="Şifre" type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={()=>setMode('landing')}>Geri</button>
                <button className="btn-primary" onClick={async()=>{
                  setAuthMsg(null)
                  try {
                    const sb = getSupabaseClient(); if (!sb) throw new Error('Supabase env missing')
                    const { data, error } = await sb.auth.signUp({ email: authEmail, password: authPassword })
                    if (error) throw error
                    const userId = data.user?.id
                    if (userId) {
                      await fetch('/api/profile', { method:'POST', headers: { 'Content-Type':'application/json', 'x-user-id': userId }, body: JSON.stringify({ email: authEmail, username: authUsername || authEmail.split('@')[0] }) })
                      localStorage.setItem('authUserId', userId); setAuthUserId(userId); setUsername(authUsername || authEmail.split('@')[0]);
                      router.refresh()
                    }
                  } catch (e:any) { setAuthMsg(e?.message || 'Kayıt başarısız') }
                }}>Kaydol</button>
              </div>
              {authMsg && <div className="text-xs text-zinc-400">{authMsg}</div>}
            </div>
          )}
          {mode === 'login' && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-zinc-300"><i className="fa-solid fa-right-to-bracket"/> Giriş Yap</div>
              <input className="input" placeholder="E-posta" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
              <input className="input" placeholder="Şifre" type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={()=>setMode('landing')}>Geri</button>
                <button className="btn-primary" onClick={async()=>{
                  setAuthMsg(null)
                  try { const sb = getSupabaseClient(); if (!sb) throw new Error('Supabase env missing')
                    const { data, error } = await sb.auth.signInWithPassword({ email: authEmail, password: authPassword })
                    if (error) throw error
                    const userId = data.user?.id
                    if (userId) {
                      localStorage.setItem('authUserId', userId); setAuthUserId(userId)
                      const prof = await fetch('/api/profile', { headers: { 'x-user-id': userId } }).then(r=>r.json()).catch(()=>null)
                      if (!prof?.user_id) {
                        await fetch('/api/profile', { method:'POST', headers: { 'Content-Type':'application/json', 'x-user-id': userId }, body: JSON.stringify({ email: authEmail, username: authEmail.split('@')[0] }) })
                        setUsername(authEmail.split('@')[0])
                      } else {
                        setUsername(prof?.username || prof?.email?.split('@')[0] || '')
                      }
                      router.refresh()
                    }
                  } catch (e:any) { setAuthMsg(e?.message || 'Giriş başarısız') }
                }}>Giriş Yap</button>
              </div>
              {authMsg && <div className="text-xs text-zinc-400">{authMsg}</div>}
            </div>
          )}
          {mode === 'guest' && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-zinc-300"><i className="fa-solid fa-user-secret"/> Misafir Girişi (500$ deneme)</div>
              <input className="input" placeholder="Kullanıcı adı" value={guestName} onChange={(e)=>setGuestName(e.target.value)} />
              <input className="input" placeholder="Oda Kodu" value={guestRoom} onChange={(e)=>setGuestRoom(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={()=>setMode('landing')}>Geri</button>
                <button className="btn-primary" disabled={!guestName.trim()||!guestRoom.trim()} onClick={async()=>{
                  localStorage.setItem('guestName', guestName.trim())
                  if (!localStorage.getItem('guestBalance')) localStorage.setItem('guestBalance','500')
                  const res = await fetch(`/api/rooms/${guestRoom}/join`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken')||'' }, body: JSON.stringify({ name: guestName }) })
                  if (res.ok) router.push(`/room/${guestRoom}`)
                }}>Katıl</button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-[300px] grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {err && <div className="col-span-full mb-3 rounded border border-red-700 bg-red-900/20 p-2 text-sm text-red-300">{err}</div>}
          <GameCard label="Blackjack Oyna" emoji="🃏" onClick={onCreate} />
          <GameCard label="Joker (yakında)" emoji="🃟" disabled />
          <GameCard label="Baccarat (yakında)" emoji="🃑" disabled />
          <GameCard label="Rulet (yakında)" emoji="🎯" disabled />
          <GameCard label="Blöf (yakında)" emoji="🂠" disabled />
          <GameCard label="Slots (yakında)" emoji="🎰" disabled />
        </section>
      )}
    </main>
  )
}

function GameCard({ label, emoji, onClick, disabled }: { label: string; emoji: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`grid place-items-center gap-2 rounded-xl bg-white p-10 text-emerald-900 shadow transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div className="text-4xl">{emoji}</div>
      <div className="text-center text-lg font-semibold">{label}</div>
      {disabled && <div className="text-xs text-zinc-500">Yakında</div>}
    </button>
  )
}

