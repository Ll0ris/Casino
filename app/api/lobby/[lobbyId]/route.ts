import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRoomWithId, hashToken } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const { data } = await sb.from('rooms').select('state').eq('id', lobbyId).single()
  return Response.json(data?.state || null)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const body = await req.json().catch(()=>({}))
  const op = String(body?.op || '')
  const token = req.headers.get('x-player-token') || ''
  const userId = req.headers.get('x-user-id') || undefined
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })
  const tokenHash = hashToken(token)
  const { data } = await sb.from('rooms').select('state').eq('id', lobbyId).single()
  let state = (data?.state || null) as any
  if (!state || state.kind !== 'lobby') return Response.json({ error: 'not_found' }, { status: 404 })

  if (op === 'join') {
    const exists = state.participants?.some((p: any) => p.tokenHash === tokenHash)
    let name = (body?.name || '').toString()
    if (!name && userId) {
      const { data: prof } = await sb.from('profiles').select('username,email').eq('user_id', userId).single()
      name = (prof?.username || (prof?.email ? (prof!.email as string).split('@')[0] : '') || 'Player') as string
    }
    if (!exists) state.participants = [...(state.participants||[]), { name: name || 'Player', tokenHash, userId }]
    await sb.from('rooms').upsert({ id: lobbyId, state })
    return Response.json(state)
  }
  if (op === 'kick') {
    // host can remove a participant by tokenHash
    if (state.hostTokenHash !== tokenHash) return Response.json({ error: 'forbidden' }, { status: 403 })
    const target = (body?.targetHash || '').toString()
    state.participants = (state.participants||[]).filter((p: any)=> p.tokenHash !== target)
    await sb.from('rooms').upsert({ id: lobbyId, state })
    return Response.json(state)
  }
  if (op === 'leave') {
    state.participants = (state.participants||[]).filter((p: any)=> p.tokenHash !== tokenHash)
    if (!state.participants.length) {
      await sb.from('rooms').delete().eq('id', lobbyId)
      return Response.json({ ok: true })
    }
    await sb.from('rooms').upsert({ id: lobbyId, state })
    return Response.json(state)
  }
  if (op === 'choose') {
    // Only host can choose
    if (state.hostTokenHash !== tokenHash) return Response.json({ error: 'forbidden' }, { status: 403 })
    state.chosenGame = 'blackjack'
    await sb.from('rooms').upsert({ id: lobbyId, state })
    // Create actual blackjack room with same id so clients can join
    const host = (state.participants||[]).find((p:any)=> p.tokenHash === tokenHash)
    await createRoomWithId(lobbyId, host?.name || 'Host', token, host?.userId, state.participants)
    return Response.json(state)
  }
  return Response.json({ error: 'unsupported' }, { status: 400 })
}
