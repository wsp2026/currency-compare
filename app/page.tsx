'use client'
import { useState } from 'react'
import { Currency, CURRENCY_LABELS, FOREIGN_CURRENCIES, ChannelResult, Mode } from '@/types'
import ResultList from '@/components/ResultList'

export default function Home() {
  const [mode, setMode] = useState<Mode>('exchange')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [results, setResults] = useState<ChannelResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [dataSource, setDataSource] = useState('')

  async function handleCalculate() {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setError('请输入有效金额'); return }
    setError('')
    setLoading(true)
    setResults([])

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num, currency, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.results)
      setUpdatedAt(data.updatedAt)
      setDataSource(data.dataSource ?? '')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '请求失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const inputLabel = mode === 'exchange' ? '人民币金额（元）' : `外币金额（${currency}）`
  const inputPlaceholder = mode === 'exchange' ? '例如：10000' : '例如：500'

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 text-gray-900">
      <div className="mx-auto max-w-lg">

        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">换汇比价</h1>
          <p className="mt-1 text-sm text-gray-500">
            国内四大行 · 国际银行 · 数字渠道 · 加密货币，一键全比
          </p>
        </div>

        {/* 模式切换 */}
        <div className="mb-5 flex rounded-xl bg-white border border-gray-200 p-1">
          {(['exchange', 'spend'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResults([]) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'exchange' ? '💱 我要换汇' : '🛍️ 我要消费'}
            </button>
          ))}
        </div>

        {/* 输入区 */}
        <div className="mb-6 rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {mode === 'exchange' ? '目标币种' : '商品标价币种'}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FOREIGN_CURRENCIES.map((c) => (
                <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{inputLabel}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? '查询中，请稍候...' : '查看全部渠道比价'}
          </button>
        </div>

        {/* 结果 */}
        {results.length > 0 && (
          <ResultList
            results={results}
            mode={mode}
            currency={currency}
            updatedAt={updatedAt}
            dataSource={dataSource}
          />
        )}

        {/* 免责声明 */}
        <p className="mt-10 text-center text-xs text-gray-400 leading-relaxed">
          汇率数据仅供参考，以各渠道官方为准。<br />
          加密货币价格波动大，请谨慎操作。本工具不构成投资建议。
        </p>
      </div>
    </main>
  )
}
