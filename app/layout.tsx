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
          {children}
        </div>
      </body>
    </html>
  )
}
