'use client'

const CURRENCIES = ['$', '¥', '€', '£', '₩', '฿', 'A$', '₣', 'Fr', 'kr']
const CHANNEL_NAMES = ['中行', '工行', '建行', '农行', '招行', '交行', '汇丰', 'Wise', 'OKX', '招行']

const TICKER_ITEMS = [
  'USD 7.2413', 'EUR 7.8921', 'JPY 0.0485', 'HKD 0.9281',
  'GBP 9.1240', 'AUD 4.6832', 'CAD 5.3201', 'SGD 5.4129',
  'KRW 0.0052', 'USD 7.2413', 'EUR 7.8921', 'JPY 0.0485',
  'HKD 0.9281', 'GBP 9.1240', 'AUD 4.6832', 'CAD 5.3201',
]

export default function BrandVisual() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: '280px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,0.85) 60%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,0.85) 60%, black 100%)',
      }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '560px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, var(--brand-glow) 0%, transparent 70%)',
          animation: 'pulse-glow 4s ease-in-out infinite',
        }}
      />

      {/* Mirror surface ellipse */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '480px',
          height: '60px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse 60% 100% at 50% 50%, var(--brand-glow), transparent)',
          opacity: 0.6,
        }}
      />

      {/* SVG rays from center bottom */}
      <svg
        viewBox="0 0 800 260"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="rayGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-from)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--brand-to)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="horizGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--border-default)" stopOpacity="0" />
            <stop offset="30%" stopColor="var(--border-default)" stopOpacity="0.5" />
            <stop offset="70%" stopColor="var(--border-default)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--border-default)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizon line */}
        <line x1="0" y1="220" x2="800" y2="220" stroke="url(#horizGrad)" strokeWidth="1" />

        {/* Light refraction lines */}
        <line x1="200" y1="0" x2="600" y2="260"
          stroke="white" strokeWidth="1" strokeOpacity="0.04" />
        <line x1="600" y1="0" x2="200" y2="260"
          stroke="white" strokeWidth="1" strokeOpacity="0.04" />

        {/* 10 rays fanning from center-bottom */}
        {CHANNEL_NAMES.map((_, i) => {
          const x2 = 60 + i * 76
          return (
            <line
              key={i}
              x1="400" y1="260"
              x2={x2} y2="30"
              stroke="url(#rayGrad)"
              strokeWidth="1"
              style={{
                opacity: 0,
                animation: `ray-appear 600ms ease forwards`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          )
        })}
      </svg>

      {/* Floating currency symbols */}
      {CURRENCIES.map((sym, i) => {
        const leftPct = 8 + i * 8.5
        const topPx = 40 + (i % 3) * 30
        const duration = 5 + (i % 4) * 1.5
        const delay = i * 0.4
        const opacity = 0.12 + (i % 3) * 0.06

        return (
          <div key={i} style={{ position: 'absolute' }}>
            {/* Original symbol */}
            <span
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPx}px`,
                fontSize: '18px',
                fontFamily: 'var(--font-geist-mono)',
                color: 'var(--text-primary)',
                opacity,
                userSelect: 'none',
                animation: `float-currency ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            >
              {sym}
            </span>
            {/* Reflection */}
            <span
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPx + 36}px`,
                fontSize: '18px',
                fontFamily: 'var(--font-geist-mono)',
                color: 'var(--text-primary)',
                opacity: opacity * 0.35,
                transform: 'scaleY(-1)',
                userSelect: 'none',
                animation: `float-currency ${duration}s ease-in-out infinite reverse`,
                animationDelay: `${delay}s`,
                filter: 'blur(0.5px)',
              }}
            >
              {sym}
            </span>
          </div>
        )
      })}

      {/* Channel labels at ray tips */}
      <div style={{ position: 'absolute', bottom: '48px', left: 0, right: 0 }}>
        {CHANNEL_NAMES.map((name, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${7.5 + i * 9.5}%`,
              transform: 'translateX(-50%)',
              fontSize: '10px',
              fontFamily: 'var(--font-geist-sans)',
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap',
              opacity: 0.7,
            }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Ticker at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: 0,
          right: 0,
          overflow: 'hidden',
          height: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '24px',
            whiteSpace: 'nowrap',
            animation: 'ticker-scroll 20s linear infinite',
            width: 'max-content',
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-geist-mono)',
                color: 'var(--text-tertiary)',
                opacity: 0.5,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
