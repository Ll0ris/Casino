import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const userId = req.headers.get('x-user-id') || ''
  if (!userId) return Response.json({})
  const { data } = await supabase
    .from('profiles')
    .select('user_id,email,username,balance')
    .eq('user_id', userId)
    .single()
  return Response.json(data || {})
}

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  try {
    const body = await req.json().catch(() => ({}))
    const userId = (req.headers.get('x-user-id') || body?.userId || '').toString()
    const email = (body?.email || '').toString().trim().toLowerCase()
    const username = (body?.username || '').toString().trim()
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })
    // Check if profile exists
    const { data: exist } = await supabase.from('profiles').select('user_id').eq('user_id', userId).single()
    if (!exist) {
      if (!email || !username) return Response.json({ error: 'email and username required to create profile' }, { status: 400 })
      const { data, error } = await supabase.from('profiles').insert({ user_id: userId, email, username, balance: 1000 }).select().single()
      if (error) throw error
      return Response.json({ ok: true, profile: data })
    }
    // Partial update allowed
    const patch: any = {}
    if (email) patch.email = email
    if (username) patch.username = username
    if (Object.keys(patch).length === 0) {
      const { data } = await supabase.from('profiles').select('user_id,email,username,balance').eq('user_id', userId).single()
      return Response.json({ ok: true, profile: data })
    }
    const { data, error } = await supabase.from('profiles').update(patch).eq('user_id', userId).select().single()
    if (error) throw error
    return Response.json({ ok: true, profile: data })
  } catch (e: any) {
    console.error('[api/profile upsert]', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
