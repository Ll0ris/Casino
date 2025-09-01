"use client"
import { useState } from 'react'

export default function CopyButton({ text, label = 'Kopyala' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch {}
  }
  return (
    <button
      onClick={onCopy}
      className="rounded-md bg-zinc-700 px-2.5 py-1.5 text-xs hover:bg-zinc-600"
      title={text}
    >
      {ok ? 'Kopyalandı' : label}
    </button>
  )
}

