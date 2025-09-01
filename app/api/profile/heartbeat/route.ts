import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || ''
    if (!userId) return Response.json({ ok: false })
    const SUPABASE_URL = process.env.SUPABASE_URL!
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await sb.from('profiles').select('balance,last_topup_at').eq('user_id', userId).single()
    if (error) return Response.json({ ok: false })
    const last = data?.last_topup_at ? new Date(data.last_topup_at as any).getTime() : 0
    if (Date.now() - last >= 60_000) {
      await sb.from('profiles').update({ balance: Number(data?.balance || 0) + 10, last_topup_at: new Date().toISOString() }).eq('user_id', userId)
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false })
  }
}

