// 使用 Wise 公开接口获取中间市场汇率（对国内网络友好）
const CACHE_TTL = 15 * 60 * 1000 // 15分钟
let cache: { data: Record<string, number>; ts: number } | null = null

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'HKD', 'AUD', 'CAD', 'SGD', 'KRW']

// 返回各外币兑 CNY 的汇率（1外币 = X人民币）
export async function getBaseRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  // 并行请求所有币种
  const results = await Promise.allSettled(
    CURRENCIES.map((cur) =>
      fetch(`https://wise.com/rates/live?source=CNY&target=${cur}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      }).then((r) => r.json() as Promise<{ source: string; target: string; value: number }>)
    )
  )

  const rates: Record<string, number> = {}
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value?.value > 0) {
      // wise 返回 1CNY = X外币，转换为 1外币 = X CNY
      rates[CURRENCIES[i]] = 1 / result.value.value
    }
  })

  if (Object.keys(rates).length === 0) throw new Error('所有汇率源均不可用')

  cache = { data: rates, ts: now }
  return rates
}
