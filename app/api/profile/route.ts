import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  try {
    const body = await req.json().catch(() => ({}))
    const userId = (req.headers.get('x-user-id') || body?.userId || '').toString()
    const email = (body?.email || '').toString().trim().toLowerCase()
    const username = (body?.username || '').toString().trim()
    if (!userId || !username || !email) {
      return Response.json({ error: 'userId, email, username required' }, { status: 400 })
    }
    const { data, error } = await supabase.from('profiles').upsert(
      { user_id: userId, email, username },
      { onConflict: 'user_id' }
    ).select().single()
    if (error) throw error
    return Response.json({ ok: true, profile: data })
  } catch (e: any) {
    console.error('[api/profile upsert]', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}

