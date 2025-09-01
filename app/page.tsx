"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joiningId, setJoiningId] = useState('')
  const [busy, setBusy] = useState(false)

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
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': localStorage.getItem('playerToken') || '',
        },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (data?.roomId) router.push(`/room/${data.roomId}`)
    } finally {
      setBusy(false)
    }
  }

  const onJoin = async () => {
    if (!name.trim() || !joiningId.trim()) return
    try {
      setBusy(true)
      const res = await fetch(`/api/rooms/${joiningId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': localStorage.getItem('playerToken') || '',
        },
        body: JSON.stringify({ name }),
      })
      if (res.ok) router.push(`/room/${joiningId}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid gap-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Multiplayer Blackjack</h1>
        <span className="text-sm text-zinc-400">HTTP Polling • Next.js</span>
      </header>
      <section className="grid gap-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-medium">Oda Oluştur</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="İsminiz"
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none ring-0 focus:border-zinc-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={onCreate}
            disabled={busy || !name.trim()}
            className={clsx(
              'rounded-md bg-emerald-600 px-3 py-2 font-medium text-white',
              'hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Oda Oluştur
          </button>
        </div>
      </section>

      <section className="grid gap-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-medium">Odaya Katıl</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Oda ID"
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none ring-0 focus:border-zinc-600"
            value={joiningId}
            onChange={(e) => setJoiningId(e.target.value)}
          />
          <input
            placeholder="İsminiz"
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none ring-0 focus:border-zinc-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={onJoin}
            disabled={busy || !name.trim() || !joiningId.trim()}
            className={clsx(
              'rounded-md bg-sky-600 px-3 py-2 font-medium text-white',
              'hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Katıl
          </button>
        </div>
      </section>
      <footer className="text-xs text-zinc-500">
        Vercel üzerinde WebSocket olmadan güncelleme: HTTP Polling
      </footer>
    </main>
  )
}
