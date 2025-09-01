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
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkfK2BEm90M8fX4YQF5GZCqCWDV5jIYwPp2YtZQm4H8Y2Yx04Ec+oZ6VA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body suppressHydrationWarning className="min-h-dvh text-zinc-100 antialiased">
        <div className="mx-auto max-w-6xl px-5 py-4">
          <SiteHeader />
          <div className="pt-6">{children}</div>
        </div>
      </body>
    </html>
  )
}
