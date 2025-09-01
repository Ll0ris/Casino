import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashToken } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const body = await req.json().catch(()=>({}))
  let name = (body?.name || '').toString()
  const token = req.headers.get('x-player-token') || ''
  const userId = req.headers.get('x-user-id') || undefined
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })
  if (!name && userId) {
    const { data: prof } = await sb.from('profiles').select('username,email').eq('user_id', userId).single()
    name = (prof?.username || (prof?.email ? (prof!.email as string).split('@')[0] : '') || 'Player') as string
  }
  if (!name) name = 'Player'
  const id = (typeof crypto!=='undefined' && 'randomUUID' in crypto) ? crypto.randomUUID().slice(0,8) : Math.random().toString(36).slice(2,10)
  const state = {
    kind: 'lobby',
    lobbyId: id,
    hostTokenHash: hashToken(token),
    participants: [{ name, tokenHash: hashToken(token), userId }]
  }
  await sb.from('rooms').upsert({ id, state })
  return Response.json({ lobbyId: id })
}
