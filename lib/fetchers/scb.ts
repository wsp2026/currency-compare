/**
 * 渣打银行香港（Standard Chartered HK）外汇即期汇率
 *
 * 来源：渣打 HK 官网外汇分析页面（静态 HTML，Bloomberg 实时 Spot 报价）
 * https://www.sc.com/hk/investment/foreign-exchange/foreign-exchange-rate/
 *
 * 表格列顺序：
 *   Currency pair | 2nd Support | 1st Support | Spot | 1st Resistance | ...
 * 共 8 列，Spot 在第 4 列（index 3）。
 *
 * 汇率换算逻辑：
 *   - USD/CNH（离岸人民币）直接作为 USD/CNY
 *   - EUR/USD、GBP/USD 等 × USD/CNH → 对应 /CNY
 *   - USD/JPY、USD/CAD 等取倒数 × USD/CNH → 对应 /CNY
 *   - HKD：用 USD/HKD（若表中有）或港币联系汇率近似值（7.78）换算
 */

const CACHE_TTL = 30 * 60 * 1000
const PAGE_URL = 'https://www.sc.com/hk/investment/foreign-exchange/foreign-exchange-rate/'

let cache: { data: Record<string, number>; ts: number } | null = null

export async function getSCBRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  const res = await fetch(PAGE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.sc.com/hk/',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`SCB HK fetch failed: ${res.status}`)

  const html = await res.text()

  // ── Parse <table> rows ──────────────────────────────────────────────────────
  const pairRates: Record<string, number> = {}
  const rowRegex  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let rowMatch
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = []
    let cellMatch
    const rowHtml = rowMatch[1]
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim())
    }
    // Need at least 4 cols; col 0 = "EUR/USD", col 3 = spot
    if (cells.length >= 4) {
      const pair  = cells[0].replace(/\s+/g, '')
      const spot  = parseFloat(cells[3].replace(/,/g, ''))
      if (pair.includes('/') && !isNaN(spot) && spot > 0) {
        pairRates[pair] = spot
      }
    }
  }

  // ── USD/CNH is the anchor for CNY conversion ────────────────────────────────
  const usdCnh = pairRates['USD/CNH']
  if (!usdCnh) throw new Error('SCB: USD/CNH not found in page')

  const rates: Record<string, number> = {}

  // USD: direct
  rates['USD'] = usdCnh

  // Pairs quoted as X/USD  →  X/CNY = rate × usdCnh
  const quotedVsUsd: [string, string][] = [
    ['EUR', 'EUR/USD'],
    ['GBP', 'GBP/USD'],
    ['AUD', 'AUD/USD'],
    ['NZD', 'NZD/USD'],
  ]
  for (const [ccy, pair] of quotedVsUsd) {
    if (pairRates[pair]) rates[ccy] = pairRates[pair] * usdCnh
  }

  // Pairs quoted as USD/X  →  X/CNY = (1 / rate) × usdCnh
  const quotedUsdPer: [string, string][] = [
    ['JPY', 'USD/JPY'],
    ['CAD', 'USD/CAD'],
    ['SGD', 'USD/SGD'],
    ['CHF', 'USD/CHF'],
    ['HKD', 'USD/HKD'],
    ['KRW', 'USD/KRW'],
  ]
  for (const [ccy, pair] of quotedUsdPer) {
    if (pairRates[pair]) rates[ccy] = (1 / pairRates[pair]) * usdCnh
  }

  // HKD fallback: HKMA currency board peg ≈ 7.78
  if (!rates['HKD']) {
    rates['HKD'] = usdCnh / 7.78
  }

  if (Object.keys(rates).length < 4) throw new Error('SCB: insufficient rates parsed')

  cache = { data: rates, ts: now }
  return rates
}
