/**
 * 加密货币实时价格
 *
 * 数据源：
 *   - Binance Vision (data-api.binance.vision) — Node.js 直连可用，BTC/USDT、ETH/USDT
 *   - OKX API (www.okx.com) — 备用，BTC/USDT、ETH/USDT
 *   - USDT/CNY：USDT 与 USD 偏差 <0.1%，直接用 Wise 实时 USD/CNY 汇率换算
 *
 * 注意：CoinGecko 在当前网络环境下 Node.js 无法直连（curl 走代理可访问），已移除。
 */

const CACHE_TTL = 2 * 60 * 1000

export interface CryptoPrices {
  btcUsdt: number
  ethUsdt: number
  source: string
}

let cache: { data: CryptoPrices; ts: number } | null = null

async function fetchBinanceVision(symbol: string): Promise<number> {
  const res = await fetch(
    `https://data-api.binance.vision/api/v3/ticker/price?symbol=${symbol}`,
    { signal: AbortSignal.timeout(6000) }
  )
  if (!res.ok) throw new Error(`Binance Vision ${symbol} failed`)
  const json = await res.json()
  const price = parseFloat(json.price)
  if (isNaN(price)) throw new Error(`Binance Vision invalid price for ${symbol}`)
  return price
}

async function fetchOKX(instId: string): Promise<number> {
  const res = await fetch(
    `https://www.okx.com/api/v5/market/ticker?instId=${instId}`,
    { signal: AbortSignal.timeout(6000) }
  )
  if (!res.ok) throw new Error(`OKX ${instId} failed`)
  const json = await res.json()
  const price = parseFloat(json.data?.[0]?.last)
  if (isNaN(price)) throw new Error(`OKX invalid price for ${instId}`)
  return price
}

export async function getCryptoPrices(): Promise<CryptoPrices> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  // 并行请求，Binance Vision 优先，OKX 备用
  const [btcBinance, ethBinance, btcOKX, ethOKX] = await Promise.allSettled([
    fetchBinanceVision('BTCUSDT'),
    fetchBinanceVision('ETHUSDT'),
    fetchOKX('BTC-USDT'),
    fetchOKX('ETH-USDT'),
  ])

  const btcUsdt =
    (btcBinance.status === 'fulfilled' ? btcBinance.value : null) ??
    (btcOKX.status === 'fulfilled' ? btcOKX.value : null)

  const ethUsdt =
    (ethBinance.status === 'fulfilled' ? ethBinance.value : null) ??
    (ethOKX.status === 'fulfilled' ? ethOKX.value : null)

  if (!btcUsdt || !ethUsdt) throw new Error('加密货币价格获取失败')

  const sources: string[] = []
  if (btcBinance.status === 'fulfilled') sources.push('Binance Vision')
  else if (btcOKX.status === 'fulfilled') sources.push('OKX')

  const data: CryptoPrices = { btcUsdt, ethUsdt, source: sources[0] ?? 'unknown' }
  cache = { data, ts: now }
  return data
}
