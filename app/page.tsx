'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, CURRENCY_LABELS, FOREIGN_CURRENCIES, Mode } from '@/types'
import InteractiveVisual from '@/components/InteractiveVisual'

const QUICK_AMOUNTS = [1000, 5000, 10000, 50000]

const MODE_CONFIG = {
  exchange: { label: '兑换 Exchange', placeholder: '例如：10000' },
  spend:    { label: '消费 Spend',   placeholder: '例如：500' },
}

export default function Home() {
  const router = useRouter()
  const [mode, setMode]         = useState<Mode>('exchange')
  const [amount, setAmount]     = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [error, setError]       = useState('')

  function handleSearch() {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setError('这个我没认出来，试试输入有效金额？'); return }
    setError('')
    router.push(`/compare?amount=${num}&currency=${currency}&mode=${mode}`)
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* ── Header ── */}
      <header style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--border-muted)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(var(--bg-canvas), 0.85)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>◈</span>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>汇镜</span>
          <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>/</span>
          <span style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
          }}>FxMirror</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '72px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            marginBottom: '10px',
            color: 'var(--text-primary)',
          }}>
            每一分汇率，都照得清清楚楚。
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            实时汇率对比，找到最优兑换渠道
          </p>
        </div>

        {/* Input Panel */}
        <div style={{
          width: '100%',
          maxWidth: '512px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: 'var(--bg-inset)',
            borderRadius: '9999px',
            padding: '4px',
            marginBottom: '16px',
          }}>
            {(['exchange', 'spend'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: mode === m ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  backgroundColor: mode === m ? 'var(--bg-canvas)' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: mode === m
                    ? 'var(--shadow-sm), 0 0 0 1px var(--border-muted)'
                    : 'none',
                }}
              >
                {MODE_CONFIG[m].label}
              </button>
            ))}
          </div>

          {/* Currency + Amount — single row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '10px', marginBottom: '16px' }}>
            {/* Currency selector */}
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 500,
                color: 'var(--text-secondary)', marginBottom: '6px',
              }}>
                {mode === 'exchange' ? '目标币种' : '标价币种'}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                style={{
                  width: '100%', height: '48px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '0 32px 0 12px',
                  fontSize: '14px', fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer', outline: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                  boxSizing: 'border-box',
                }}
              >
                {FOREIGN_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            {/* Amount input */}
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 500,
                color: 'var(--text-secondary)', marginBottom: '6px',
              }}>
                {mode === 'exchange' ? '人民币金额（元）' : `外币金额（${currency}）`}
              </label>
              <div style={{ position: 'relative' }}>
                {mode === 'exchange' && (
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', fontSize: '15px',
                    pointerEvents: 'none', userSelect: 'none',
                  }}>¥</span>
                )}
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={MODE_CONFIG[mode].placeholder}
                  className="rate-number"
                  style={{
                    width: '100%', height: '48px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    paddingLeft: mode === 'exchange' ? '26px' : '12px',
                    paddingRight: amount ? '36px' : '12px',
                    fontSize: '18px', fontWeight: 500,
                    color: 'var(--text-primary)',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 150ms, box-shadow 150ms',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent-emphasis)'
                    e.target.style.boxShadow = 'var(--shadow-focus)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-default)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                {amount && (
                  <button
                    onClick={() => setAmount('')}
                    style={{
                      position: 'absolute', right: '8px', top: '50%',
                      transform: 'translateY(-50%)',
                      width: '20px', height: '20px',
                      borderRadius: '50%', border: 'none',
                      backgroundColor: 'var(--border-strong)',
                      color: 'var(--bg-canvas)',
                      fontSize: '13px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--danger-fg)', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleSearch}
            style={{
              width: '100%', height: '48px',
              backgroundColor: 'var(--accent-emphasis)',
              color: 'var(--text-on-accent)',
              border: 'none', borderRadius: '6px',
              fontSize: '15px', fontWeight: 600,
              letterSpacing: '0.01em', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              transition: 'all 120ms ease',
              boxShadow: 'var(--shadow-inset)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(9,105,218,0.30)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-inset)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            查找最优汇率
          </button>
        </div>

        {/* Interactive orbital visual */}
        <div style={{ width: '100%', maxWidth: '512px', marginTop: '8px' }}>
          <InteractiveVisual currency={currency} amount={amount} mode={mode} />
        </div>

        {/* Quick amounts */}
        <div style={{ marginTop: '0px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              style={{
                fontSize: '12px', color: 'var(--text-link)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 8px',
                borderRadius: '4px', transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              ¥{v.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Trust signals */}
        <div style={{
          marginTop: '28px', marginBottom: '0',
          display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {['10 个渠道', '实时数据', '免费使用'].map((label) => (
            <span key={label} style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              ✦ {label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p style={{
        textAlign: 'center', fontSize: '11px',
        color: 'var(--text-tertiary)',
        padding: '10px 16px 20px', lineHeight: 1.7,
      }}>
        汇率数据仅供参考，以各渠道官方为准。加密货币价格波动大，请谨慎操作。
      </p>
    </main>
  )
}
