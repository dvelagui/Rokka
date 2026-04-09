import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/providers/ClientProviders'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'ROKKA | Mesas',
  description: 'Plataforma musical interactiva',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className="font-[family-name:var(--font-outfit)] bg-background text-white antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
