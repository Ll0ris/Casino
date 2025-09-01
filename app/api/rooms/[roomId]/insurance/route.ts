import { NextRequest } from 'next/server'
import { hashToken, insurance } from '@/lib/store'
import { toClient } from '@/lib/game'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const body = await req.json().catch(() => ({}))
    const amount = Number(body?.amount || 0)
    const token = req.headers.get('x-player-token') || ''
    if (!token) return Response.json({ error: 'token required' }, { status: 400 })
    const g = await insurance(roomId, token, amount)
    if (!g) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json(toClient(g, hashToken(token)))
  } catch (e: any) {
    console.error('[api/rooms insurance] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}

