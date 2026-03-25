/**
 * 汇丰银行中国 实时外汇牌价
 * 来源：汇丰网银 JSON API（公开可访问，无需登录）
 *
 * API 返回格式：
 *   transferSellingRate: "0.1444101"  →  1 CNY 能换 0.1444101 USD（银行卖出外币给客户）
 *   即：客户用 CNY 买外币时，1 USD = 1/0.1444101 = 6.925 CNY
 */

const CACHE_TTL = 30 * 60 * 1000

const API_URL =
  'https://www.services.cn-banking.hsbc.com.cn/mobile/channel/digital-proxy/cnyTransfer/ratesInfo/remittanceRate'

const SUPPORTED: Record<string, boolean> = {
  USD: true, EUR: true, GBP: true, JPY: true,
  HKD: true, AUD: true, CAD: true, SGD: true,
}

let cache: { data: Record<string, number>; ts: number } | null = null

export async function getHSBCRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  const res = await fetch(API_URL, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.services.cn-banking.hsbc.com.cn/',
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`HSBC API failed: ${res.status}`)

  const json = await res.json()
  const items: Array<Record<string, string>> = json?.data?.counterForRepeatingBlock ?? []

  if (!items.length) throw new Error('HSBC API: 数据为空')

  const rates: Record<string, number> = {}

  for (const item of items) {
    const code = item.exchangeRateCurrency
    if (!SUPPORTED[code]) continue

    // transferSellingRate：银行卖出外币汇率（1 CNY = X 外币）
    // 用户购汇时关心的是"1 外币 = ? CNY"，即取倒数
    const sellingRate = parseFloat(item.transferSellingRate)
    if (!isNaN(sellingRate) && sellingRate > 0) {
      rates[code] = 1 / sellingRate
    }
  }

  if (Object.keys(rates).length === 0) throw new Error('HSBC rate parse failed')

  cache = { data: rates, ts: now }
  return rates
}
