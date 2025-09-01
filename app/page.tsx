"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joiningId, setJoiningId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [mode, setMode] = useState<'landing'|'login'|'signup'|'guest'>('landing')

  useEffect(() => {
    if (!localStorage.getItem('playerToken')) {
      localStorage.setItem('playerToken', crypto.randomUUID())
    }
    const uid = localStorage.getItem('authUserId')
    setAuthUserId(uid)
    if (uid) {
      fetch('/api/profile/balance', { headers: { 'x-user-id': uid } })
        .then(r=>r.json()).then(d=>setBalance(Number(d?.balance||0))).catch(()=>{})
    }
  }, [])

  const onCreate = async () => {
    if (!name.trim()) return
    try {
      setBusy(true); setErr(null)
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken')||'', 'x-user-id': localStorage.getItem('authUserId')||'' }, body: JSON.stringify({ name }) })
      const data = await res.json().catch(()=>null)
      if (res.ok && data?.roomId) router.push(`/room/${data.roomId}`)
      else setErr('Oda oluşturulamadı.')
    } finally { setBusy(false) }
  }

  const onJoin = async () => {
    if (!name.trim() || !joiningId.trim()) return
    try {
      setBusy(true); setErr(null)
      const res = await fetch(`/api/rooms/${joiningId}/join`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken')||'', 'x-user-id': localStorage.getItem('authUserId')||'' }, body: JSON.stringify({ name }) })
      if (res.ok) router.push(`/room/${joiningId}`)
      else setErr('Odaya katılamadı.')
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
                    const supabase = getSupabaseClient(); if (!supabase) throw new Error('Supabase env missing')
                    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
                    if (error) throw error
                    const userId = data.user?.id
                    if (userId) {
                      await fetch('/api/profile', { method:'POST', headers: { 'Content-Type':'application/json', 'x-user-id': userId }, body: JSON.stringify({ email: authEmail, username: authUsername }) })
                      localStorage.setItem('authUserId', userId); setAuthUserId(userId); router.refresh()
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
                  try { const supabase = getSupabaseClient(); if (!supabase) throw new Error('Supabase env missing')
                    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
                    if (error) throw error
                    const userId = data.user?.id
                    if (userId) { localStorage.setItem('authUserId', userId); setAuthUserId(userId); router.refresh() }
                  } catch (e:any) { setAuthMsg(e?.message || 'Giriş başarısız') }
                }}>Giriş Yap</button>
              </div>
              {authMsg && <div className="text-xs text-zinc-400">{authMsg}</div>}
            </div>
          )}
          {mode === 'guest' && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-zinc-300"><i className="fa-solid fa-user-secret"/> Misafir Girişi (500$ deneme)</div>
              <input className="input" placeholder="Kullanıcı adı" value={name} onChange={(e)=>setName(e.target.value)} />
              <input className="input" placeholder="Oda Kodu" value={joiningId} onChange={(e)=>setJoiningId(e.target.value)} />
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={()=>setMode('landing')}>Geri</button>
                <button className="btn-primary" disabled={!name.trim()||!joiningId.trim()} onClick={async()=>{
                  localStorage.setItem('guestName', name.trim())
                  if (!localStorage.getItem('guestBalance')) localStorage.setItem('guestBalance','500')
                  const res = await fetch(`/api/rooms/${joiningId}/join`, { method:'POST', headers: { 'Content-Type':'application/json', 'x-player-token': localStorage.getItem('playerToken')||'' }, body: JSON.stringify({ name }) })
                  if (res.ok) router.push(`/room/${joiningId}`)
                }}>Katıl</button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-emerald-900/50 bg-emerald-950/40 px-3 py-1.5 text-sm">Bakiye: <span className="font-semibold">{balance ?? '-'}</span> $</div>
            <button className="btn-secondary" onClick={()=>router.push('/profile')}><i className="fa-solid fa-user mr-2"/>Profil</button>
          </div>
          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <i className="fa-solid fa-cards-blank text-xl"/>
              <h2 className="text-lg font-medium">Blackjack</h2>
            </div>
            {err && <div className="mb-3 rounded border border-red-700 bg-red-900/20 p-2 text-sm text-red-300">{err}</div>}
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="input sm:col-span-2" placeholder="İsminiz" value={name} onChange={(e)=>setName(e.target.value)} />
              <button className="btn-primary" disabled={busy || !name.trim()} onClick={onCreate}><i className="fa-solid fa-plus mr-2"/>Oda Oluştur</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input className="input" placeholder="Oda Kodu" value={joiningId} onChange={(e)=>setJoiningId(e.target.value)} />
              <input className="input" placeholder="İsminiz" value={name} onChange={(e)=>setName(e.target.value)} />
              <button className="btn-secondary bg-sky-600 hover:bg-sky-500" disabled={busy || !name.trim() || !joiningId.trim()} onClick={onJoin}><i className="fa-solid fa-right-to-bracket mr-2"/>Katıl</button>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

