import { NextRequest } from 'next/server'
import { forceTimeout } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  await forceTimeout(roomId)
  return Response.json({ ok: true })
}

