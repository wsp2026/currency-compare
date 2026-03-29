'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Currency, ChannelResult, Mode } from '@/types'
import ResultRow from '@/components/ResultRow'

const LOADING_MESSAGES = [
  '正在拨开汇率的迷雾…',
  '镜子正在抛光，马上照清楚',
  '跑遍了十几家银行，快回来了',
  '汇率有点调皮，稍等我抓住它',
  '正在剥开那层手续费…',
]

function SkeletonRow({ index }: { index: number }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-canvas)',
      border: '1px solid var(--border-muted)',
      borderRadius: '8px',
      padding: '14px 16px',
      animationDelay: `${index * 100}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="skeleton" style={{ width: '22px', height: '14px' }} />
        <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '120px', height: '14px', marginBottom: '6px' }} />
          <div className="skeleton" style={{ width: '80px', height: '11px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="skeleton" style={{ width: '100px', height: '18px', marginBottom: '4px' }} />
          <div className="skeleton" style={{ width: '50px', height: '11px', marginLeft: 'auto' }} />
        </div>
      </div>
    </div>
  )
}

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const amount   = parseFloat(searchParams.get('amount') ?? '0')
  const currency = (searchParams.get('currency') ?? 'USD') as Currency
  const mode     = (searchParams.get('mode') ?? 'exchange') as Mode

  const [results, setResults]   = useState<ChannelResult[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [dataSource, setDataSource] = useState('')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])

  const fetchResults = useCallback(async () => {
    if (!amount || amount <= 0) return
    setLoading(true)
    setError('')
    setResults([])

    // Cycle loading messages
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[msgIdx])
    }, 2000)

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.results)
      setUpdatedAt(data.updatedAt)
      setDataSource(data.dataSource ?? '')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '镜子暂时起雾了，检查一下网络？')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }, [amount, currency, mode])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const bestResult = results[0]?.result ?? 0
  const modeLabel = mode === 'exchange' ? '兑换' : '消费'
  const fromLabel = mode === 'exchange' ? `¥${amount.toLocaleString()}` : `${amount} ${currency}`
  const toLabel   = mode === 'exchange' ? currency : 'CNY'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      {/* Header */}
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
        gap: '12px',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none',
            color: 'var(--text-link)', cursor: 'pointer',
            fontSize: '13px', padding: '4px 8px',
            borderRadius: '6px', transition: 'background 120ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-muted)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          ← 返回
        </button>
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-muted)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>◈</span>
          <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>汇镜</span>
        </div>
      </header>

      {/* Query recap bar */}
      <div style={{
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '12px',
        borderBottom: '1px solid var(--border-muted)',
        backgroundColor: 'var(--bg-subtle)',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {fromLabel}
          <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>→</span>
          {toLabel}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-inset)',
          border: '1px solid var(--border-muted)',
          borderRadius: '4px',
          padding: '2px 7px',
        }}>
          {modeLabel}模式
        </span>
        <a
          href="/"
          style={{
            marginLeft: 'auto',
            fontSize: '12px',
            color: 'var(--text-link)',
            textDecoration: 'none',
          }}
        >
          修改
        </a>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 48px' }}>

        {/* Results header */}
        {!loading && results.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                找到 {results.length} 个渠道
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                · 按最优汇率排序
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {dataSource && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                }}>
                  基准：{dataSource}
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {updatedAt}
              </span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'var(--warning-muted)',
            border: '1px solid var(--warning-fg)',
            borderRadius: '6px',
            padding: '10px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--warning-fg)',
          }}>
            <span>⚠ {error}</span>
            <button
              onClick={fetchResults}
              style={{
                background: 'none', border: 'none',
                color: 'var(--warning-fg)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
              }}
            >
              再试一次 →
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '20px 0 24px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              {loadingMsg}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Results list */}
        {!loading && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {results.map((r, i) => (
              <ResultRow
                key={r.name}
                result={r}
                rank={i + 1}
                mode={mode}
                currency={currency}
                rowIndex={i}
                bestResult={bestResult}
              />
            ))}
          </div>
        )}

        {/* Already compared success line */}
        {!loading && results.length > 0 && (
          <p style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            marginTop: '20px',
          }}>
            已比对 {results.length} 个渠道 · {updatedAt}
          </p>
        )}

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          marginTop: '24px',
          lineHeight: 1.7,
        }}>
          汇率数据仅供参考，以各渠道官方为准。加密货币价格波动大，请谨慎操作。本工具不构成投资建议。
        </p>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas)', color: 'var(--text-secondary)',
        fontSize: '13px',
      }}>
        镜子正在抛光，马上照清楚…
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
