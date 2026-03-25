import { ChannelResult, Mode } from '@/types'

export type ChannelType = 'bank-cn' | 'bank-intl' | 'digital' | 'crypto'

export type DataSource =
  | 'official-api'    // 官方 API（Wise）
  | 'official-scrape' // 官方网站爬取（中国银行）
  | 'market-api'      // 市场行情 API（CoinGecko / Binance）
  | 'estimated'       // 基准汇率 + 公开费率估算（银行无公开 API）

interface ChannelConfig {
  name: string
  logo: string
  type: ChannelType
  dataSourceType: DataSource
  dataSourceNote: string  // 数据来源说明
  channelKey?: string     // 对应实际汇率 key
  rateMarkup: number
  feeRate: number
  feeMin: number
  feeMax: number
  feeDesc: string
  officialUrl: string
  exchangeUrl: string
}

export const CHANNELS: ChannelConfig[] = [
  // ── 国内银行 ────────────────────────────────────────────────
  {
    name: '中国银行',
    logo: '🔴',
    type: 'bank-cn',
    dataSourceType: 'official-scrape',
    dataSourceNote: '实时爬取 boc.cn 官方牌价',
    channelKey: 'boc',
    rateMarkup: 0.008,
    feeRate: 0.001,
    feeMin: 50,
    feeMax: 500,
    feeDesc: '0.1%，最低50元，最高500元',
    officialUrl: 'https://www.boc.cn/sourcedb/whpj/',
    exchangeUrl: 'https://ebsnew.boc.cn/boc_cn/login.html',
  },
  {
    name: '工商银行',
    logo: '🔵',
    type: 'bank-cn',
    dataSourceType: 'official-scrape',
    dataSourceNote: 'Playwright 无头浏览器实时爬取工行官网牌价',
    channelKey: 'icbc',
    rateMarkup: 0.008,
    feeRate: 0.001,
    feeMin: 50,
    feeMax: 500,
    feeDesc: '0.1%，最低50元，最高500元',
    officialUrl: 'https://www.icbc.com.cn/',
    exchangeUrl: 'https://mybank.icbc.com.cn/',
  },
  {
    name: '建设银行',
    logo: '🟤',
    type: 'bank-cn',
    dataSourceType: 'official-scrape',
    dataSourceNote: 'Playwright 无头浏览器实时爬取建行官网牌价',
    channelKey: 'ccb',
    rateMarkup: 0.008,
    feeRate: 0.001,
    feeMin: 50,
    feeMax: 500,
    feeDesc: '0.1%，最低50元，最高500元',
    officialUrl: 'https://www.ccb.com/',
    exchangeUrl: 'https://ibsbjstar.ccb.com.cn/',
  },
  {
    name: '农业银行',
    logo: '🟢',
    type: 'bank-cn',
    dataSourceType: 'official-scrape',
    dataSourceNote: 'Playwright 无头浏览器实时爬取农行官网牌价',
    channelKey: 'abc',
    rateMarkup: 0.0085,
    feeRate: 0.001,
    feeMin: 50,
    feeMax: 500,
    feeDesc: '0.1%，最低50元，最高500元',
    officialUrl: 'https://www.abchina.com/',
    exchangeUrl: 'https://www.abchina.com/',
  },
  {
    name: '招商银行',
    logo: '🏦',
    type: 'bank-cn',
    dataSourceType: 'official-scrape',
    dataSourceNote: 'Playwright 无头浏览器实时爬取招行官网 fx.cmbchina.com 牌价',
    channelKey: 'cmb',
    rateMarkup: 0.007,
    feeRate: 0.001,
    feeMin: 50,
    feeMax: 480,
    feeDesc: '0.1%，最低50元，最高480元',
    officialUrl: 'https://fx.cmbchina.com/Hq/',
    exchangeUrl: 'https://www.cmbchina.com/personalfinance/exchange/',
  },
  {
    name: '交通银行',
    logo: '🏦',
    type: 'bank-cn',
    dataSourceType: 'official-scrape',
    dataSourceNote: 'Playwright 无头浏览器实时爬取交行官网牌价',
    channelKey: 'bocom',
    rateMarkup: 0.008,
    feeRate: 0.001,
    feeMin: 50,
    feeMax: 500,
    feeDesc: '0.1%，最低50元，最高500元',
    officialUrl: 'https://www.bankcomm.com/',
    exchangeUrl: 'https://per.95559.com.cn/',
  },
  // ── 外资银行 ────────────────────────────────────────────────
  {
    // 汇丰中国银行：官方 JSON API 直接调用，实时数据
    name: '汇丰银行',
    logo: '🔴',
    type: 'bank-intl',
    dataSourceType: 'official-api',
    dataSourceNote: '实时调用汇丰中国网银公开 JSON API（services.cn-banking.hsbc.com.cn）',
    channelKey: 'hsbc',
    rateMarkup: 0,
    feeRate: 0,
    feeMin: 0,
    feeMax: 0,
    feeDesc: '无单独手续费，汇率已含加点',
    officialUrl: 'https://www.hsbc.com.cn/foreign-exchange/',
    exchangeUrl: 'https://www.hsbc.com.cn/foreign-exchange/',
  },
  // ── 数字渠道 ────────────────────────────────────────────────
  {
    name: 'Wise',
    logo: '💚',
    type: 'digital',
    dataSourceType: 'official-api',
    dataSourceNote: '实时调用 Wise 官方公开 API',
    channelKey: 'wise',
    rateMarkup: 0,
    feeRate: 0.005,
    feeMin: 0,
    feeMax: Infinity,
    feeDesc: '约0.5%手续费，使用真实中间汇率',
    officialUrl: 'https://wise.com/zh-cn/pricing/',
    exchangeUrl: 'https://wise.com/zh-cn/',
  },
  // ── 加密货币 ────────────────────────────────────────────────
  {
    // USDT ≈ USD（偏差 <0.1%），可直接与美元兑换结果对比
    // 汇率来源：Binance Vision BTC/USDT × Wise USD/CNY 换算
    name: 'OKX · USDT',
    logo: '₮',
    type: 'crypto',
    dataSourceType: 'market-api',
    dataSourceNote: '实时行情来自 Binance Vision (data-api.binance.vision)，USDT ≈ USD，C2C 约+0.5%溢价',
    channelKey: 'usdt',
    rateMarkup: 0,
    feeRate: 0.001,
    feeMin: 0,
    feeMax: Infinity,
    feeDesc: '约0.1%交易费 + C2C约0.5%溢价，需 OKX 账户',
    officialUrl: 'https://www.okx.com/cn/fees',
    exchangeUrl: 'https://www.okx.com/cn/buy-crypto',
  },
]

const DATA_SOURCE_LABELS: Record<DataSource, { label: string; color: string }> = {
  'official-api':    { label: '官方API', color: 'bg-green-100 text-green-700' },
  'official-scrape': { label: '官网实时', color: 'bg-green-100 text-green-700' },
  'market-api':      { label: '市场实时', color: 'bg-blue-100 text-blue-700' },
  'estimated':       { label: '参考估算', color: 'bg-yellow-100 text-yellow-700' },
}

export { DATA_SOURCE_LABELS }
export type { DataSource as DataSourceType }

function calcFee(cnyAmount: number, config: ChannelConfig): number {
  if (config.feeRate === 0) return 0
  const fee = cnyAmount * config.feeRate
  const capped = config.feeMax === Infinity ? fee : Math.min(fee, config.feeMax)
  return Math.max(capped, config.feeMin)
}

export function calculate(
  amount: number,
  currency: string,
  baseRate: number,
  channelRates: Record<string, number>,
  mode: Mode,
  updatedAt: string,
): ChannelResult[] {
  return CHANNELS.map((ch) => {
    const actualRate = ch.channelKey ? channelRates[ch.channelKey] : undefined
    const rate = actualRate ?? baseRate * (1 + ch.rateMarkup)
    const hasRealRate = !!actualRate
    const dsInfo = DATA_SOURCE_LABELS[ch.dataSourceType]

    let cnyAmount: number
    let result: number
    let feeAmount: number

    if (mode === 'exchange') {
      cnyAmount = amount
      feeAmount = calcFee(cnyAmount, ch)
      result = (cnyAmount - feeAmount) / rate
    } else {
      cnyAmount = amount * rate
      feeAmount = calcFee(cnyAmount, ch)
      result = cnyAmount + feeAmount
    }

    return {
      name: ch.name,
      logo: ch.logo,
      type: ch.type,
      dataSourceType: ch.dataSourceType,
      dataSourceLabel: dsInfo.label,
      dataSourceColor: dsInfo.color,
      dataSourceNote: ch.dataSourceNote,
      rate,
      feeAmount,
      feeDesc: ch.feeDesc,
      result,
      officialUrl: ch.officialUrl,
      exchangeUrl: ch.exchangeUrl,
      updatedAt,
      isFallback: !hasRealRate,
    }
  }).sort((a, b) =>
    mode === 'exchange' ? b.result - a.result : a.result - b.result
  )
}
