// 中国银行官网实时外汇牌价
// 报价单位：每100外币对应的人民币，需除以100转为1外币价格

const CACHE_TTL = 20 * 60 * 1000 // 20分钟
let cache: { data: Record<string, number>; ts: number } | null = null

const NAME_MAP: Record<string, string> = {
  '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP',
  '日元': 'JPY', '港币': 'HKD', '澳大利亚元': 'AUD',
  '加拿大元': 'CAD', '新加坡元': 'SGD', '韩国元': 'KRW',
}

// 返回 1外币 = X人民币（现汇卖出价，即用户购汇时的价格）
export async function getBOCRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  const res = await fetch('https://www.boc.cn/sourcedb/whpj/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.boc.cn/',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error('BOC fetch failed')

  const html = await res.text()
  const rates: Record<string, number> = {}

  // 匹配表格行：<td>货币名称</td><td>现汇买入</td><td>现钞买入</td><td>现汇卖出</td>...
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let rowMatch
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = []
    let cellMatch
    const rowHtml = rowMatch[1]
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim())
    }
    if (cells.length >= 4 && NAME_MAP[cells[0]]) {
      const code = NAME_MAP[cells[0]]
      const sellRate = parseFloat(cells[3]) // 现汇卖出价（index 3）
      if (!isNaN(sellRate) && sellRate > 0) {
        rates[code] = sellRate / 100 // BOC报价为每100外币，转为每1外币
      }
    }
  }

  if (Object.keys(rates).length === 0) throw new Error('BOC parse failed')

  cache = { data: rates, ts: now }
  return rates
}
