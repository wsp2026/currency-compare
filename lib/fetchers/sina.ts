// 新浪财经外汇中间价（用作基准参考，国内稳定可用）
// 格式：var hq_str_fx_susdcny="bid,ask,last,..."

const CACHE_TTL = 10 * 60 * 1000 // 10分钟
let cache: { data: Record<string, number>; ts: number } | null = null

const SINA_CODES: Record<string, string> = {
  USD: 'fx_susdcny',
  EUR: 'fx_seurcny',
  GBP: 'fx_sgbpcny',
  JPY: 'fx_sjpycny',
  HKD: 'fx_shldcny',
  AUD: 'fx_saudcny',
  CAD: 'fx_scadcny',
  SGD: 'fx_ssgdcny',
  KRW: 'fx_skrwcny',
}

// 返回 1外币 = X人民币（买卖中间价）
export async function getSinaRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  const symbols = Object.values(SINA_CODES).join(',')
  const res = await fetch(`https://hq.sinajs.cn/list=${symbols}`, {
    headers: {
      'Referer': 'https://finance.sina.com.cn',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error('Sina fetch failed')

  const text = await res.text()
  const rates: Record<string, number> = {}

  for (const [currency, sinaCode] of Object.entries(SINA_CODES)) {
    // 匹配 var hq_str_fx_susdcny="6.8908,6.8934,..."
    const match = text.match(new RegExp(`hq_str_${sinaCode}="([^"]+)"`))
    if (match) {
      const parts = match[1].split(',')
      const bid = parseFloat(parts[0])
      const ask = parseFloat(parts[1])
      if (!isNaN(bid) && !isNaN(ask) && bid > 0) {
        rates[currency] = (bid + ask) / 2 // 取买卖中间价
      }
    }
  }

  if (Object.keys(rates).length === 0) throw new Error('Sina parse failed')

  cache = { data: rates, ts: now }
  return rates
}
