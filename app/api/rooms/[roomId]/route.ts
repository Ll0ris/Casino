import { NextRequest } from 'next/server'
import { getStore, hashToken, start } from '@/lib/store'
import { toClient } from '@/lib/game'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const store = getStore()
    const game = await store.get(roomId)
    if (!game) return Response.json({ error: 'not found' }, { status: 404 })
    const tokenHash = hashToken(_req.headers.get('x-player-token') || '')
    const state = toClient(game, tokenHash)
    return Response.json(state, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('[api/rooms GET] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const body = await req.json().catch(() => ({}))
    const op = String(body?.op || '')
    const playerToken = req.headers.get('x-player-token') || ''
    if (op === 'start') {
      const { roomId } = await params
      const g = await start(roomId, playerToken)
      if (!g) return Response.json({ error: 'not found' }, { status: 404 })
      return Response.json({ ok: true })
    }
    return Response.json({ error: 'unsupported' }, { status: 400 })
  } catch (e: any) {
    console.error('[api/rooms POST start] error', e?.message || e)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
