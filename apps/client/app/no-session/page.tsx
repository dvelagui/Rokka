import Link from 'next/link'

export default function NoSessionPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-8">
      {/* Brand */}
      <div className="text-center space-y-1">
        <h1 className="text-5xl font-black tracking-wider text-rokka-cyan">ROKKA</h1>
        <p className="text-white/30 text-sm">Plataforma musical interactiva</p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-5 max-w-xs w-full">
        <div className="w-20 h-20 rounded-full bg-rokka-cyan/5 border border-rokka-cyan/10 flex items-center justify-center mx-auto">
          <span className="text-4xl">📱</span>
        </div>
        <div className="space-y-2">
          <p className="text-white font-bold text-lg">Escanea el QR de tu mesa</p>
          <p className="text-white/40 text-sm leading-relaxed">
            El mesero puede mostrarte el código QR único de tu mesa para conectarte.
          </p>
        </div>

        {/* Animated ring */}
        <div className="w-24 h-24 mx-auto relative">
          <div className="absolute inset-0 rounded-full border-2 border-rokka-cyan/20" />
          <div className="absolute inset-0 rounded-full border-2 border-rokka-cyan/40 animate-ping" />
          <div className="absolute inset-3 rounded-full border-2 border-dashed border-rokka-cyan/30 flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
        </div>
      </div>

      {/* Dev shortcut */}
      <Link
        href="/join?token=tok-mesa-01"
        className="text-white/15 text-xs hover:text-white/30 transition-colors underline underline-offset-2"
      >
        [dev] conectar como Mesa 1
      </Link>
    </main>
  )
}
