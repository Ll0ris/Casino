import { NextRequest } from 'next/server'
import { setBet, hashToken, getStore } from '@/lib/store'
import { toClient } from '@/lib/game'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const body = await req.json().catch(() => ({}))
    const bet = Number(body?.bet || 0)
    const token = req.headers.get('x-player-token') || ''
    if (!token) return Response.json({ error: 'token required' }, { status: 400 })
    const g = await setBet(roomId, token, bet)
    if (!g) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json(toClient(g, hashToken(token)))
  } catch (e: any) {
    console.error('[api/rooms bet] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}

