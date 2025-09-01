"use client"
import { useEffect, useState } from 'react'

export default function Scoreboard({ roomId, mySeatId, refreshKey }: { roomId: string; mySeatId: string; refreshKey: number|string }) {
  const [items, setItems] = useState<Array<{ seatId: string; name: string; balance: number }>>([])
  useEffect(()=>{
    const load = async ()=>{
      const res = await fetch(`/api/rooms/${roomId}/balances`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const arr = (data?.items||[]).sort((a:any,b:any)=> (b.balance||0)-(a.balance||0))
      setItems(arr)
    }
    load()
  },[roomId, refreshKey])
  return (
    <div className="rounded-md border border-zinc-700/60 bg-zinc-950/80 p-3 text-xs text-zinc-300 shadow-lg">
      <div className="mb-1 text-zinc-400">Skor Tablosu</div>
      {items.length === 0 ? <div>-</div> : (
        <div className="flex flex-col gap-1 min-w-40">
          {items.map((x)=> (
            <div key={x.seatId} className={x.seatId===mySeatId? 'font-semibold text-emerald-300':'text-zinc-300'}>
              {x.name}: {x.balance ?? 0}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

