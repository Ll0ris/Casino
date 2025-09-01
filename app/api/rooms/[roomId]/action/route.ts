import { NextRequest } from 'next/server'
import { hashToken, hit, leave, stand } from '@/lib/store'
import { toClient } from '@/lib/game'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ error: 'method not allowed' }, { status: 405 })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '')
    const playerToken = req.headers.get('x-player-token') || ''
    if (!playerToken) return Response.json({ error: 'token required' }, { status: 400 })
    const { roomId } = await params
    if (action === 'hit') {
      const g = await hit(roomId, playerToken)
      if (!g) return Response.json({ error: 'not found' }, { status: 404 })
      return Response.json(toClient(g, hashToken(playerToken)))
    }
    if (action === 'stand') {
      const g = await stand(roomId, playerToken)
      if (!g) return Response.json({ error: 'not found' }, { status: 404 })
      return Response.json(toClient(g, hashToken(playerToken)))
    }
    if (action === 'leave') {
      const g = await leave(roomId, playerToken)
      if (!g) return Response.json({ error: 'not found' }, { status: 404 })
      return Response.json({ ok: true })
    }
    return Response.json({ error: 'unsupported' }, { status: 400 })
  } catch (e: any) {
    console.error('[api/rooms action] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
