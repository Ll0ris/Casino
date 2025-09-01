import './globals.css'
import type { ReactNode } from 'react'
import SiteHeader from '@/components/SiteHeader'

export const metadata = {
  title: 'Multiplayer Blackjack',
  description: 'Play blackjack with friends via HTTP polling',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
      </head>
      <body suppressHydrationWarning className="min-h-dvh text-zinc-100 antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 pt-24 pb-8">{children}</main>
      </body>
    </html>
  )
}
