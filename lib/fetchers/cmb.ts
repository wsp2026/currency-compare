/**
 * 招商银行实时外汇牌价
 * 页面为 UmiJS SPA，需 Playwright 无头浏览器渲染后抓取
 * 来源：https://fx.cmbchina.com/Hq/
 */
import { getBrowser } from './browser'

const CACHE_TTL = 30 * 60 * 1000

const NAME_MAP: Record<string, string> = {
  '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP',
  '日元': 'JPY', '港币': 'HKD', '澳大利亚元': 'AUD',
  '加拿大元': 'CAD', '新加坡元': 'SGD', '韩元': 'KRW',
}

let cache: { data: Record<string, number>; ts: number } | null = null

export async function getCMBRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.goto('https://fx.cmbchina.com/Hq/', {
      waitUntil: 'networkidle',
      timeout: 20000,
    })

    // 等待汇率表格渲染
    await page.waitForSelector('table', { timeout: 10000 })

    const rates: Record<string, number> = {}

    const rows = await page.$$eval('table tr', (trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()))
    )

    for (const cells of rows) {
      if (cells.length < 5) continue
      const code = NAME_MAP[cells[0]]
      if (!code) continue
      // 招行现汇卖出价：通常在第4或第5列（现汇卖出）
      // 列顺序：货币名称, 现汇买入, 现钞买入, 现汇卖出, 现钞卖出, 参考价, 挂牌时间
      const sellRate = parseFloat(cells[3])
      if (!isNaN(sellRate) && sellRate > 0) {
        // 招行报价单位：所有币种均为人民币/100外币，需除以100
        rates[code] = sellRate / 100
      }
    }

    if (Object.keys(rates).length === 0) throw new Error('CMB table parse failed')

    cache = { data: rates, ts: now }
    return rates
  } finally {
    await page.close()
  }
}
