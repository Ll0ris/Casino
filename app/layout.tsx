import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Multiplayer Blackjack',
  description: 'Play blackjack with friends via HTTP polling',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body suppressHydrationWarning className="min-h-dvh text-zinc-100 antialiased">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-emerald-600 to-sky-600 text-white">♣︎</div>
              <span className="text-sm font-semibold tracking-wide text-zinc-200">Casino Blackjack</span>
            </div>
            <span className="text-xs text-zinc-500">HTTP Polling • Next.js</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
