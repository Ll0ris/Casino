"use client"
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState('')
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
          {!editing ? (
            <div className="flex items-center gap-3">
              <div><span className="text-zinc-400">Kullanıcı adı:</span> <span className="font-medium">{data.username}</span></div>
              <button className="btn-secondary" onClick={()=>{ setUsername(data.username||''); setEditing(true) }}>Düzenle</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} />
              <button className="btn-primary" onClick={async()=>{
                const uid = localStorage.getItem('authUserId')||''
                const res = await fetch('/api/profile', { method:'POST', headers: { 'Content-Type':'application/json', 'x-user-id': uid }, body: JSON.stringify({ username }) })
                if (res.ok) {
                  const p = await res.json()
                  setData(p.profile || p)
                  localStorage.setItem('displayName', username)
                  window.dispatchEvent(new Event('auth-changed'))
                  setEditing(false)
                  setMsg('Kullanıcı adı güncellendi')
                } else {
                  setMsg('Güncelleme başarısız')
                }
              }}>Kaydet</button>
              <button className="btn-secondary" onClick={()=>setEditing(false)}>İptal</button>
            </div>
          )}
          <div><span className="text-zinc-400">E‑posta:</span> <span className="font-medium">{data.email}</span></div>
          <div><span className="text-zinc-400">Bakiye:</span> <span className="font-medium">{Number(data.balance||0)} $</span></div>
          {msg && <div className="text-xs text-zinc-400">{msg}</div>}
        </div>
      </section>
    </main>
  )
}
