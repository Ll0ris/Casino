import { NextRequest } from 'next/server'
import { heartbeat } from '@/lib/store'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const token = req.headers.get('x-player-token') || ''
    if (!token) return Response.json({ error: 'token required' }, { status: 400 })
    await heartbeat(roomId, token)
    // Online bonus: +$10 per minute for signed-in users
    const userId = req.headers.get('x-user-id') || ''
    if (userId) {
      const SUPABASE_URL = process.env.SUPABASE_URL!
      const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data } = await sb.from('profiles').select('balance,last_topup_at').eq('user_id', userId).single()
      if (data) {
        const last = data.last_topup_at ? new Date(data.last_topup_at).getTime() : 0
        if (Date.now() - last >= 60_000) {
          await sb.from('profiles').update({ balance: Number(data.balance || 0) + 10, last_topup_at: new Date().toISOString() }).eq('user_id', userId)
        }
      }
    }
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
