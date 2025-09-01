"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function SiteHeader() {
  const router = useRouter()
  const [username, setUsername] = useState<string>('')
  const [balance, setBalance] = useState<number | null>(null)

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
  }, [])

  const logout = async () => {
    try {
      const sb = getSupabaseClient()
      if (sb) await sb.auth.signOut()
    } catch {}
    localStorage.removeItem('authUserId')
    location.href = '/'
  }

  return (
    <header className="w-full rounded-md bg-emerald-900 px-5 py-3 text-sm shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <img src="/assets/images/logo.png" alt="logo" className="h-8 w-8 rounded" onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none' }} />
          <span className="text-base font-semibold tracking-wide">Virtual Casino</span>
        </button>
        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-md bg-emerald-950/40 px-3 py-1.5">Bakiye: <span className="font-semibold">{balance ?? '-'}</span> $</div>
          <button onClick={() => router.push('/profile')} className="btn-secondary"><i className="fa-solid fa-user mr-2"/>Profil</button>
          <button onClick={logout} className="btn-secondary"><i className="fa-solid fa-arrow-right-from-bracket mr-2"/>Çıkış</button>
        </div>
      </div>
    </header>
  )
}
