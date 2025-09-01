import { NextRequest } from 'next/server'
import { getStore } from '@/lib/store'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const store = getStore()
  const g = await store.get(roomId)
  if (!g) return Response.json({ items: [] })
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const ids = g.players.map((p) => p.accountId).filter(Boolean) as string[]
  let balances: Record<string, number> = {}
  if (ids.length) {
    const { data } = await sb.from('profiles').select('user_id,balance').in('user_id', ids)
    for (const row of data || []) balances[row.user_id as string] = Number(row.balance || 0)
  }
  const items = g.players.map((p) => ({ seatId: p.seatId, name: p.name, balance: balances[p.accountId || ''] || 0 }))
  return Response.json({ items })
}

