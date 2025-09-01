import { NextRequest } from 'next/server'
import { createRoom, hashToken } from '@/lib/store'
import { toClient } from '@/lib/game'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = (body?.name || '').toString().trim().slice(0, 32)
    const playerToken = req.headers.get('x-player-token') || (await req.cookies.get('playerToken')?.value) || body?.playerToken || ''
    if (!name || !playerToken) {
      return Response.json({ error: 'name and player token required' }, { status: 400 })
    }
    const { roomId } = await createRoom(name, playerToken)
    const store = getStore()
    const game = await store.get(roomId)
    const state = game ? toClient(game, hashToken(playerToken)) : null
    return Response.json({ roomId, state }, { status: 201 })
  } catch (e: any) {
    console.error('[api/rooms POST] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
