'use client'

// ── Contact constants ─────────────────────────────────────────────────────────
// Update these to match actual ROKKA support details.
const SUPPORT_WA_NUMBER = '573200000000'       // digits only, for wa.me URL
const SUPPORT_PHONE_DISPLAY = '+57 320 000 0000'
const SUPPORT_EMAIL = 'soporte@rokka.app'

// ── HelpTab ───────────────────────────────────────────────────────────────────

export default function HelpTab() {
  return (
    <div className="flex flex-col items-center pt-4 pb-8">
      {/* Hero card */}
      <div className="bg-card border border-[#1e1e1e] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-3 mb-4">
        <span className="text-5xl leading-none">🎧</span>
        <div>
          <p className="text-[15px] font-bold text-white">Soporte ROKKA</p>
          <p className="text-[11px] text-white/40 mt-1">
            Estamos aquí para ayudarte con cualquier problema
          </p>
        </div>
      </div>

      {/* Channels */}
      <div className="w-full max-w-sm space-y-2">
        <ContactCard
          emoji="💬"
          title="Chat en vivo"
          subtitle="9am – 10pm"
          badge="En línea"
          badgeColor="text-rokka-cyan"
          borderColor="border-rokka-cyan/30"
          href={`https://wa.me/${SUPPORT_WA_NUMBER}`}
        />

        <ContactCard
          emoji="📧"
          title={SUPPORT_EMAIL}
          subtitle="Respuesta en menos de 2h"
          badge="< 2h"
          badgeColor="text-rokka-purple"
          borderColor="border-rokka-purple/30"
          href={`mailto:${SUPPORT_EMAIL}`}
        />

        <ContactCard
          emoji="📱"
          title={SUPPORT_PHONE_DISPLAY}
          subtitle="Urgencias técnicas 24/7"
          badge="Urgencias"
          badgeColor="text-[#25D366]"
          borderColor="border-[#25D366]/30"
          href={`https://wa.me/${SUPPORT_WA_NUMBER}`}
        />
      </div>

      <p className="text-[10px] text-white/20 text-center mt-8 px-4">
        ROKKA Admin v1.0 · Todos los derechos reservados
      </p>
    </div>
  )
}

// ── ContactCard ───────────────────────────────────────────────────────────────

function ContactCard({
  emoji,
  title,
  subtitle,
  badge,
  badgeColor,
  borderColor,
  href,
}: {
  emoji: string
  title: string
  subtitle: string
  badge: string
  badgeColor: string
  borderColor: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 bg-card border ${borderColor} rounded-xl p-4 hover:brightness-110 transition-all active:scale-[0.98]`}
    >
      <span className="text-2xl leading-none shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white truncate">{title}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>
      </div>
      <span className={`text-[10px] font-bold shrink-0 ${badgeColor}`}>{badge}</span>
    </a>
  )
}
