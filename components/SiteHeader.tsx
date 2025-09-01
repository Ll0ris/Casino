"use client"
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function SiteHeader() {
  const router = useRouter()
  const [username, setUsername] = useState<string>('')
  const [balance, setBalance] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('authUserId')
    if (!uid) return
    const load = async () => {
      const [profRes, balRes] = await Promise.all([
        fetch('/api/profile', { headers: { 'x-user-id': uid } }),
        fetch('/api/profile/balance', { headers: { 'x-user-id': uid } }),
      ])
      const prof = await profRes.json().catch(() => ({}))
      setUsername(prof?.username || prof?.email || '')
      const bal = await balRes.json().catch(() => ({}))
      setBalance(Number(bal?.balance || 0))
    }
    load()
    const t = setInterval(load, 10000)
    const hb = setInterval(() => {
      fetch('/api/profile/heartbeat', { method: 'POST', headers: { 'x-user-id': uid } })
    }, 60000)
    return () => clearInterval(t)
  }, [])

  const logout = async () => {
    try {
      const sb = getSupabaseClient()
      if (sb) await sb.auth.signOut()
    } catch {}
    localStorage.removeItem('authUserId')
    location.href = '/'
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="fixed left-0 right-0 top-0 z-40 w-full bg-emerald-900 py-5 text-sm shadow-sm">
      <div className="flex w-full items-center justify-between px-5">
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <img src="/assets/images/logo.png" alt="logo" className="h-10 w-10 rounded" onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none' }} />
          <span className="text-base font-semibold tracking-wide">Virtual Casino</span>
        </button>
        <div className="relative flex items-center gap-3 text-sm" ref={ref}>
          <div className="rounded-md bg-emerald-950/40 px-3 py-1.5">Bakiye: <span className="font-semibold">{balance ?? '-'}</span> $</div>
          <button onClick={()=>setOpen(v=>!v)} className="btn-secondary"><i className="fa-solid fa-user mr-2"/>{username || 'Kullanıcı'}</button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-44 rounded-md border border-emerald-800 bg-emerald-950/95 p-1 shadow-lg">
              <button onClick={()=>{ setOpen(false); router.push('/profile') }} className="block w-full rounded px-3 py-2 text-left hover:bg-emerald-900">Profile git</button>
              <button onClick={()=>{ setOpen(false); router.push('/settings') }} className="block w-full rounded px-3 py-2 text-left hover:bg-emerald-900">Ayarlar</button>
              <button onClick={()=>{ setOpen(false); logout() }} className="block w-full rounded px-3 py-2 text-left hover:bg-emerald-900 text-red-300">Çıkış yap</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
