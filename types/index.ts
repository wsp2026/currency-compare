export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD' | 'AUD' | 'CAD' | 'SGD' | 'KRW'

export const CURRENCY_LABELS: Record<Currency, string> = {
  CNY: '人民币 CNY',
  USD: '美元 USD',
  EUR: '欧元 EUR',
  GBP: '英镑 GBP',
  JPY: '日元 JPY',
  HKD: '港币 HKD',
  AUD: '澳元 AUD',
  CAD: '加元 CAD',
  SGD: '新加坡元 SGD',
  KRW: '韩元 KRW',
}

export const FOREIGN_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'HKD', 'AUD', 'CAD', 'SGD', 'KRW']

export type ChannelType = 'bank-cn' | 'bank-intl' | 'digital' | 'crypto'
export type DataSourceType = 'official-api' | 'official-scrape' | 'market-api' | 'estimated'

export interface ChannelResult {
  name: string
  logo: string
  type: ChannelType
  dataSourceType: DataSourceType
  dataSourceLabel: string   // e.g. '官方API' / '官网实时' / '参考估算'
  dataSourceColor: string   // Tailwind classes
  dataSourceNote: string    // 详细说明
  rate: number
  feeAmount: number
  feeDesc: string
  result: number
  officialUrl: string
  exchangeUrl: string
  updatedAt: string
  isFallback?: boolean
}

export type Mode = 'exchange' | 'spend'
