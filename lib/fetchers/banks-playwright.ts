/**
 * 国内各大银行外汇牌价（现汇卖出价）
 * 使用 Playwright 无头浏览器爬取 JS 渲染页面
 * 30 分钟缓存，首次加载较慢（约 5-10 秒），后续从缓存返回
 */
import { getBrowser } from './browser'

const CACHE_TTL = 30 * 60 * 1000

interface BankRateCache {
  data: Record<string, number>
  ts: number
}

const caches: Record<string, BankRateCache> = {}

// 工商银行
async function fetchICBC(): Promise<Record<string, number>> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    // 工行外汇牌价页面
    await page.goto('https://www.icbc.com.cn/column/1385461466364768256.html', {
      waitUntil: 'networkidle', timeout: 20000,
    })
    return await parseTableWithMapping(page, {
      '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP', '日元': 'JPY',
      '港币': 'HKD', '澳大利亚元': 'AUD', '加拿大元': 'CAD',
      '新加坡元': 'SGD', '韩国元': 'KRW',
    })
  } finally {
    await page.close()
  }
}

// 建设银行
async function fetchCCB(): Promise<Record<string, number>> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.goto('https://www.ccb.com/cn/home/money/index.html', {
      waitUntil: 'networkidle', timeout: 20000,
    })
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => {})
    return await parseTableWithMapping(page, {
      '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP', '日元': 'JPY',
      '港币': 'HKD', '澳大利亚元': 'AUD', '加元': 'CAD',
      '新加坡元': 'SGD', '韩元': 'KRW',
    })
  } finally {
    await page.close()
  }
}

// 农业银行
async function fetchABC(): Promise<Record<string, number>> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.goto('https://www.abchina.com/cn/PersonalBanking/GoldenDeposit/', {
      waitUntil: 'networkidle', timeout: 20000,
    })
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => {})
    return await parseTableWithMapping(page, {
      '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP', '日元': 'JPY',
      '港币': 'HKD', '澳大利亚元': 'AUD', '加拿大元': 'CAD',
      '新加坡元': 'SGD', '韩元': 'KRW',
    })
  } finally {
    await page.close()
  }
}

// 交通银行
async function fetchBOCOM(): Promise<Record<string, number>> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.goto('https://www.bankcomm.com/BankCommSite/zongshanghang/cn/finance/exchange/index.html', {
      waitUntil: 'networkidle', timeout: 20000,
    })
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => {})
    return await parseTableWithMapping(page, {
      '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP', '日元': 'JPY',
      '港币': 'HKD', '澳大利亚元': 'AUD', '加拿大元': 'CAD',
      '新加坡元': 'SGD', '韩国元': 'KRW',
    })
  } finally {
    await page.close()
  }
}

/**
 * 通用表格解析：从页面中找到包含货币名称的表格，提取现汇卖出价
 * 尝试多种常见列顺序
 */
async function parseTableWithMapping(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>['newPage']>>,
  nameMap: Record<string, string>
): Promise<Record<string, number>> {
  const rates: Record<string, number> = {}

  const allRows = await page.$$eval('table tr', (rows) =>
    rows.map((r) => Array.from(r.querySelectorAll('td,th')).map((c) => (c as HTMLElement).innerText?.trim() ?? ''))
  )

  // 找表头行，确定"现汇卖出"列索引
  let sellColIdx = -1
  let nameColIdx = 0
  for (const row of allRows) {
    const headerIdx = row.findIndex((c) =>
      c.includes('现汇卖出') || c.includes('卖出价') || c.includes('卖出汇率')
    )
    if (headerIdx !== -1) {
      sellColIdx = headerIdx
      nameColIdx = row.findIndex((c) =>
        c.includes('货币') || c.includes('币种') || c.includes('名称')
      )
      if (nameColIdx === -1) nameColIdx = 0
      break
    }
  }
  // 找不到表头时，默认用第3列（index 3）为卖出价
  if (sellColIdx === -1) sellColIdx = 3

  for (const cells of allRows) {
    if (cells.length <= sellColIdx) continue
    const name = cells[nameColIdx] ?? ''
    const code = Object.entries(nameMap).find(([label]) => name.includes(label))?.[1]
    if (!code) continue
    const val = parseFloat(cells[sellColIdx].replace(/,/g, ''))
    if (!isNaN(val) && val > 0) {
      // 日元/韩元通常以100为单位报价
      rates[code] = (code === 'JPY' || code === 'KRW') ? val / 100 : val
    }
  }

  return rates
}

// 对外接口：带缓存的各银行汇率获取
export async function getICBCRates(): Promise<Record<string, number>> {
  return getCachedRates('icbc', fetchICBC)
}

export async function getCCBRates(): Promise<Record<string, number>> {
  return getCachedRates('ccb', fetchCCB)
}

export async function getABCRates(): Promise<Record<string, number>> {
  return getCachedRates('abc', fetchABC)
}

export async function getBOCOMRates(): Promise<Record<string, number>> {
  return getCachedRates('bocom', fetchBOCOM)
}

async function getCachedRates(
  key: string,
  fetcher: () => Promise<Record<string, number>>
): Promise<Record<string, number>> {
  const now = Date.now()
  const c = caches[key]
  if (c && now - c.ts < CACHE_TTL) return c.data

  const data = await fetcher()
  if (Object.keys(data).length > 0) {
    caches[key] = { data, ts: now }
  }
  return data
}
