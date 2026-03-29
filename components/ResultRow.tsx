'use client'
import { useState } from 'react'
import { ChannelResult, Currency, Mode } from '@/types'
import ChannelLogo from './ChannelLogo'

interface Props {
  result: ChannelResult
  rank: number
  mode: Mode
  currency: Currency
  rowIndex: number
  bestResult: number
}

const TYPE_LABELS: Record<string, string> = {
  'bank-cn':   '国有银行',
  'bank-intl': '外资银行',
  'digital':   '数字渠道',
  'crypto':    '加密货币',
}

export default function ResultRow({ result, rank, mode, currency, rowIndex, bestResult }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isRank1 = rank === 1

  const resultLabel = mode === 'exchange'
    ? `${result.result.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} ${currency}`
    : `¥${result.result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`

  // Compute delta vs best
  const delta = isRank1 ? null : (() => {
    if (mode === 'exchange') {
      const pct = ((result.result - bestResult) / bestResult * 100)
      return pct.toFixed(2) + '%'
    } else {
      const pct = ((result.result - bestResult) / bestResult * 100)
      return '+' + pct.toFixed(2) + '%'
    }
  })()

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        backgroundColor: isRank1 ? 'var(--rank1-bg)' : 'var(--bg-canvas)',
        border: isRank1
          ? '1.5px solid var(--rank1-border)'
          : '1px solid var(--border-muted)',
        borderRadius: '8px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 150ms, box-shadow 150ms',
        boxShadow: isRank1 ? 'var(--shadow-rank1)' : 'none',
        animation: `row-enter 200ms ease forwards`,
        animationDelay: `${rowIndex * 40}ms`,
        opacity: 0,
      }}
      onMouseEnter={(e) => {
        if (!isRank1) {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isRank1) {
          e.currentTarget.style.borderColor = 'var(--border-muted)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Rank */}
        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: isRank1 ? '13px' : '11px',
          fontWeight: 700,
          color: isRank1 ? 'var(--rank1-text)' : 'var(--text-tertiary)',
          width: '22px',
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {isRank1 ? '🏆' : `#${rank}`}
        </span>

        {/* Logo */}
        <ChannelLogo domain={result.logo} name={result.name} size={32} />

        {/* Name + type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '14px', fontWeight: 600,
              color: isRank1 ? 'var(--rank1-text)' : 'var(--text-primary)',
            }}>
              {result.name}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-muted)',
              borderRadius: '3px',
              padding: '1px 5px',
            }}>
              {TYPE_LABELS[result.type]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              汇率{' '}
              <span className="rate-number" style={{ color: 'var(--text-secondary)' }}>
                {result.rate.toFixed(4)}
              </span>
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-muted)',
              borderRadius: '3px',
              padding: '1px 4px',
            }}>
              {result.dataSourceLabel}
            </span>
          </div>
        </div>

        {/* Result + delta */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="rate-number" style={{
            fontSize: isRank1 ? '20px' : '18px',
            fontWeight: 700,
            color: isRank1 ? 'var(--rank1-text)' : 'var(--success-fg)',
            lineHeight: 1.2,
          }}>
            {resultLabel}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
            {isRank1 && (
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: 'var(--rank1-badge-fg)',
                backgroundColor: 'var(--rank1-badge-bg)',
                borderRadius: '4px', padding: '1px 6px',
              }}>
                最优 ✦
              </span>
            )}
            {delta && (
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: 'var(--danger-fg)',
                backgroundColor: 'var(--danger-muted)',
                borderRadius: '4px', padding: '1px 5px',
              }}>
                {delta}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <span style={{
          fontSize: '12px', color: 'var(--text-tertiary)',
          marginLeft: '4px', flexShrink: 0,
          transition: 'transform 200ms',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </div>

      {/* Fee summary (always visible) */}
      <div style={{
        marginTop: '8px', marginLeft: '64px',
        display: 'flex', gap: '16px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          手续费：{result.feeAmount > 0 ? `¥${result.feeAmount.toFixed(0)}` : '免费'}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {mode === 'exchange' ? '到手外币' : '花费人民币'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            marginLeft: '64px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-muted)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fee detail grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
            backgroundColor: 'var(--border-muted)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}>
            {[
              { label: '手续费金额', value: result.feeAmount > 0 ? `¥${result.feeAmount.toFixed(2)}` : '免费' },
              { label: '费率说明', value: result.feeDesc || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ backgroundColor: 'var(--bg-subtle)', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Data source note */}
          {result.dataSourceNote && (
            <p style={{
              fontSize: '12px', color: 'var(--text-secondary)',
              lineHeight: 1.5, marginBottom: '12px',
            }}>
              {result.dataSourceNote}
            </p>
          )}

          {/* Action button */}
          <a
            href={result.exchangeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              backgroundColor: isRank1 ? 'var(--rank1-badge-bg)' : 'var(--accent-emphasis)',
              color: isRank1 ? 'var(--rank1-badge-fg)' : 'var(--text-on-accent)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            前往兑换 →
          </a>
          <a
            href={result.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center',
              height: '36px', padding: '0 12px',
              marginLeft: '8px',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            官方费率
          </a>
        </div>
      )}
    </div>
  )
}
