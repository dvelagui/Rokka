'use client'

const CYAN = '#00e5ff'
const PURPLE = '#d500f9'

interface Props {
  keepVotes: number
  skipVotes: number
}

// ── VotingOverlay ─────────────────────────────────────────────────────────────
// Barra de votación en vivo, centrada en la parte superior de la pantalla.

export function VotingOverlay({ keepVotes, skipVotes }: Props) {
  const totalVotes = keepVotes + skipVotes || 1
  const keepPct = (keepVotes / totalVotes) * 100
  const skipPct = (skipVotes / totalVotes) * 100

  return (
    <div
      className="absolute z-20 flex items-center pointer-events-none"
      style={{
        top: 'clamp(10px, 1.5vh, 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        gap: 'clamp(6px, 0.8vw, 12px)',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '999px',
        padding: 'clamp(5px, 0.7vh, 9px) clamp(12px, 1.5vw, 20px)',
      }}
    >
      <span
        style={{
          fontSize: '8px',
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase' as const,
          letterSpacing: '2px',
          fontWeight: 700,
        }}
      >
        Votación
      </span>
      <div
        style={{
          width: 'clamp(50px, 6vw, 90px)',
          height: 'clamp(4px, 0.5vh, 7px)',
          borderRadius: '999px',
          overflow: 'hidden',
          display: 'flex',
          background: 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            width: `${keepPct}%`,
            background: CYAN,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        <div
          style={{
            width: `${skipPct}%`,
            background: PURPLE,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 'clamp(6px, 0.8vw, 12px)',
          fontSize: 'clamp(9px, 1.1vw, 14px)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: CYAN }}>👍 {keepVotes}</span>
        <span style={{ color: PURPLE }}>⏭ {skipVotes}</span>
      </div>
    </div>
  )
}
