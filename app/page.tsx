"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
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

  useEffect(() => {
    // Ensure we have a persistent player token
    if (!localStorage.getItem('playerToken')) {
      const token = crypto.randomUUID()
      localStorage.setItem('playerToken', token)
    }
  }, [])

  const onCreate = async () => {
    if (!name.trim()) return
    try {
      setBusy(true)
      setErr(null)
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': localStorage.getItem('playerToken') || '',
          'x-user-id': localStorage.getItem('authUserId') || '',
        },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setErr(text || 'Oda oluşturulamadı. Sunucu hatası.')
        return
      }
      const data = await res.json().catch(() => null)
      if (data?.roomId) router.push(`/room/${data.roomId}`)
      else setErr('Oda oluşturulamadı. Geçersiz yanıt.')
    } finally {
      setBusy(false)
    }
  }

  const onJoin = async () => {
    if (!name.trim() || !joiningId.trim()) return
    try {
      setBusy(true)
      setErr(null)
      const res = await fetch(`/api/rooms/${joiningId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': localStorage.getItem('playerToken') || '',
          'x-user-id': localStorage.getItem('authUserId') || '',
        },
        body: JSON.stringify({ name }),
      })
      if (res.ok) router.push(`/room/${joiningId}`)
      else {
        const text = await res.text().catch(() => '')
        setErr(text || 'Odaya katılamadı. Sunucu hatası.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid gap-8">
      <div className="grid gap-3">
        <h1 className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
          Arkadaşlarınla Blackjack Oyna
        </h1>
        <p className="max-w-prose text-sm text-zinc-400">
          Odalar oluştur, davet linkini paylaş ve gerçek zamanlı olarak HTTP polling ile el oynayın.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl"></span>
            <h2 className="text-lg font-medium">Giri / Kaydol</h2>
          </div>
          <div className="grid gap-3">
            <input className="input" placeholder="E-posta" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
            <input className="input" placeholder="Kullanc ad" value={authUsername} onChange={(e)=>setAuthUsername(e.target.value)} />
            <input className="input" placeholder="ifre" type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={async()=>{
                setAuthMsg(null)
                try {
                  const supabase = getSupabaseClient()
                  if (!supabase) throw new Error('Supabase env missing')
                  const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
                  if (error) throw error
                  const userId = data.user?.id
                  if (userId) {
                    localStorage.setItem('authUserId', userId)
                    setAuthMsg('Giri baarl')
                  }
                } catch (e:any) {
                  setAuthMsg(e?.message || 'Giri baarsz')
                }
              }}>Giri Yap</button>
              <button className="btn-primary" onClick={async()=>{
                setAuthMsg(null)
                try {
                  const supabase = getSupabaseClient()
                  if (!supabase) throw new Error('Supabase env missing')
                  const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
                  if (error) throw error
                  const userId = data.user?.id
                  if (userId) {
                    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-user-id': userId }, body: JSON.stringify({ email: authEmail, username: authUsername }) })
                    localStorage.setItem('authUserId', userId)
                    setAuthMsg('Kayt baarl. E-posta doerulamas gerekebilir.')
                  }
                } catch (e:any) {
                  setAuthMsg(e?.message || 'Kayt baarsz')
                }
              }}>Kaydol</button>
            </div>
            {authMsg && <div className="text-xs text-zinc-400">{authMsg}</div>}
          </div>
        </section>
        <section className="card sm:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">🃏</span>
            <h2 className="text-lg font-medium">Oda Oluştur</h2>
          </div>
          {err && (
            <div className="mb-3 rounded border border-red-700 bg-red-900/20 p-2 text-sm text-red-300">{err}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              placeholder="İsminiz"
              className="input sm:col-span-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              onClick={onCreate}
              disabled={busy || !name.trim()}
              className="btn-primary"
            >
              Oda Oluştur
            </button>
          </div>
        </section>

        <section className="card sm:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <h2 className="text-lg font-medium">Odaya Katıl</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              placeholder="Oda ID"
              className="input"
              value={joiningId}
              onChange={(e) => setJoiningId(e.target.value)}
            />
            <input
              placeholder="İsminiz"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              onClick={onJoin}
              disabled={busy || !name.trim() || !joiningId.trim()}
              className="btn-secondary bg-sky-600 hover:bg-sky-500"
            >
              Katıl
            </button>
          </div>
        </section>
      </div>

      <footer className="text-xs text-zinc-500">
        Vercel üzerinde WebSocket olmadan güncelleme: HTTP Polling
      </footer>
    </main>
  )
}
