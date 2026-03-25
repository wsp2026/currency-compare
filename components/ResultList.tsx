'use client'
import { useState } from 'react'
import { ChannelResult, Currency, Mode } from '@/types'
import ChannelCard from './ChannelCard'

interface Props {
  results: ChannelResult[]
  mode: Mode
  currency: Currency
  updatedAt: string
  dataSource?: string
}

export default function ResultList({ results, mode, currency, updatedAt, dataSource }: Props) {
  const [expanded, setExpanded] = useState(false)

  const top3 = results.slice(0, 3)
  const rest = results.slice(3)

  return (
    <div className="space-y-4">
      {/* 数据说明栏 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-gray-700">
          共 {results.length} 个渠道
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {dataSource && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5">
              基准汇率：{dataSource}
            </span>
          )}
          <span>更新于 {updatedAt}</span>
        </div>
      </div>

      {/* 前3名完整卡片 */}
      <div className="space-y-5">
        {top3.map((r, i) => (
          <ChannelCard
            key={r.name}
            result={r}
            rank={i + 1}
            mode={mode}
            currency={currency}
          />
        ))}
      </div>

      {/* 折叠区：第4名及以后 */}
      {rest.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            {expanded
              ? '▲ 收起其余渠道'
              : `▼ 查看其余 ${rest.length} 个渠道`}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {rest.map((r, i) => (
                <ChannelCard
                  key={r.name}
                  result={r}
                  rank={i + 4}
                  mode={mode}
                  currency={currency}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
