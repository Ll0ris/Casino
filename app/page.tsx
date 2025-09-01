"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joiningId, setJoiningId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card">
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

        <section className="card">
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
