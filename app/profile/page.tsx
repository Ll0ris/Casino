"use client"
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const uid = localStorage.getItem('authUserId') || ''
    if (!uid) { setLoading(false); return }
    fetch('/api/profile', { headers: { 'x-user-id': uid } })
      .then(r=>r.json()).then(setData).finally(()=>setLoading(false))
  }, [])
  if (loading) return <main className="grid place-items-center"><div className="text-sm text-zinc-400">Yükleniyor...</div></main>
  if (!data) return <main className="grid place-items-center"><div className="text-sm text-zinc-400">Giriş gerekli.</div></main>
  return (
    <main className="grid gap-6">
      <section className="card">
        <h1 className="mb-3 text-lg font-semibold">Profil</h1>
        <div className="grid gap-2 text-sm">
          <div><span className="text-zinc-400">Kullanıcı adı:</span> <span className="font-medium">{data.username}</span></div>
          <div><span className="text-zinc-400">E‑posta:</span> <span className="font-medium">{data.email}</span></div>
          <div><span className="text-zinc-400">Bakiye:</span> <span className="font-medium">{Number(data.balance||0)} $</span></div>
        </div>
      </section>
    </main>
  )
}

