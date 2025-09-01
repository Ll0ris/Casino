import { NextRequest } from 'next/server'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const kind = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? 'supabase' : 'memory'
  return Response.json({
    store: kind,
    env: {
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasSupabaseAnon: Boolean(process.env.SUPABASE_ANON_KEY),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

