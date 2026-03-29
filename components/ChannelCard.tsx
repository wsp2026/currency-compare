'use client'
import { useState } from 'react'
import { ChannelResult, Currency, Mode } from '@/types'
import ChannelLogo from './ChannelLogo'

interface Props {
  result: ChannelResult
  rank: number
  mode: Mode
  currency: Currency
  compact?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  'bank-cn': '国内银行',
  'bank-intl': '外资银行',
  'digital': '数字渠道',
  'crypto': '加密货币',
}

export default function ChannelCard({ result, rank, mode, currency, compact = false }: Props) {
  const [showNote, setShowNote] = useState(false)
  const isBest = rank === 1

  const resultLabel = mode === 'exchange'
    ? `${result.result.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} ${currency}`
    : `¥${result.result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`

  // 折叠态
  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-5 text-center text-xs text-gray-400">{rank}</span>
          <ChannelLogo domain={result.logo} name={result.name} size={22} />
          <span className="font-medium text-gray-800">{result.name}</span>
          {/* 数据来源标签 */}
          <button
            onClick={() => setShowNote(!showNote)}
            className={`rounded-full px-2 py-0.5 text-xs ${result.dataSourceColor} cursor-help`}
            title={result.dataSourceNote}
          >
            {result.dataSourceLabel}
          </button>
        </div>
        <div className="text-right text-sm">
          <span className="font-semibold text-gray-900">{resultLabel}</span>
          {result.feeAmount > 0 && (
            <span className="ml-2 text-xs text-gray-400">费¥{result.feeAmount.toFixed(0)}</span>
          )}
        </div>
        {showNote && (
          <div className="absolute z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600 shadow-lg">
            {result.dataSourceNote}
          </div>
        )}
      </div>
    )
  }

  // 完整卡片（前3名）
  return (
    <div className={`relative rounded-2xl border p-5 transition-all ${
      isBest
        ? 'border-green-400 bg-green-50 shadow-md shadow-green-100'
        : 'border-gray-200 bg-white'
    }`}>
      {/* 顶部徽章行 */}
      <div className="absolute -top-3 left-4 flex items-center gap-1.5">
        {isBest && (
          <span className="rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white shadow">
            最划算 🏆
          </span>
        )}
        {!isBest && (
          <span className="rounded-full bg-gray-400 px-2.5 py-0.5 text-xs font-semibold text-white">
            第{rank}名
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {TYPE_LABELS[result.type]}
        </span>
      </div>

      {/* 渠道信息 + 结果 */}
      <div className="flex items-start justify-between gap-4 mt-1">
        <div className="flex items-center gap-2">
          <ChannelLogo domain={result.logo} name={result.name} size={36} />
          <div>
            <div className="font-semibold text-gray-900">{result.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400">汇率 {result.rate.toFixed(4)}</span>
              {/* 数据来源标签，可点击查看说明 */}
              <button
                onClick={() => setShowNote(!showNote)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${result.dataSourceColor} hover:opacity-80`}
              >
                {result.dataSourceLabel} ℹ️
              </button>
            </div>
            {/* 数据来源说明展开 */}
            {showNote && (
              <div className="mt-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 leading-relaxed max-w-xs">
                {result.dataSourceNote}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-xl font-bold ${isBest ? 'text-green-600' : 'text-gray-800'}`}>
            {resultLabel}
          </div>
          <div className="text-xs text-gray-400">
            {mode === 'exchange' ? '到手外币' : '花费人民币'}
          </div>
        </div>
      </div>

      {/* 费用栏 */}
      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 border border-gray-100">
        <div className="flex justify-between">
          <span>手续费</span>
          <span className="font-medium text-gray-700">
            {result.feeAmount > 0 ? `¥${result.feeAmount.toFixed(2)}` : '免费'}
          </span>
        </div>
        <div className="mt-0.5 text-gray-400">{result.feeDesc}</div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-3 flex gap-2">
        <a
          href={result.exchangeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
            isBest
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          立即前往 →
        </a>
        <a
          href={result.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          官方费率
        </a>
      </div>
    </div>
  )
}
