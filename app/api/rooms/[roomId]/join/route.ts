import { NextRequest } from 'next/server'
import { ensureJoined } from '@/lib/store'
import { toClient } from '@/lib/game'
import { hashToken } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = (body?.name || '').toString().trim().slice(0, 32)
    const playerToken = req.headers.get('x-player-token') || body?.playerToken || ''
    if (!name || !playerToken) {
      return Response.json({ error: 'name and player token required' }, { status: 400 })
    }
    const { roomId } = await params
    const g = await ensureJoined(roomId, name, playerToken)
    if (!g) return Response.json({ error: 'not found' }, { status: 404 })
    const state = toClient(g, hashToken(playerToken))
    return Response.json(state)
  } catch (e: any) {
    console.error('[api/rooms join] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
