import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'ROKKA | Mesas',
  description: 'Plataforma musical interactiva — app de mesas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className="font-[family-name:var(--font-outfit)]">{children}</body>
    </html>
  )
}
