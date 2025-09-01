import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userId = (req.headers.get('x-user-id') || '').toString()
    if (!userId) return Response.json({ balance: 0 })
    const SUPABASE_URL = process.env.SUPABASE_URL!
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data } = await sb.from('profiles').select('balance').eq('user_id', userId).single()
    return Response.json({ balance: Number(data?.balance || 0) })
  } catch {
    return Response.json({ balance: 0 })
  }
}

