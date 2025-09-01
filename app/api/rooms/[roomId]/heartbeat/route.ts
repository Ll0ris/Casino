import { NextRequest } from 'next/server'
import { heartbeat } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const token = req.headers.get('x-player-token') || ''
    if (!token) return Response.json({ error: 'token required' }, { status: 400 })
    await heartbeat(roomId, token)
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}

