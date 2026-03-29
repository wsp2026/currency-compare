// Vercel Serverless 配置：给 Playwright 足够的资源
export const maxDuration = 60  // 最长60秒（Playwright 爬取需要时间）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getBaseRates } from '@/lib/fetchers/frankfurter'       // Wise API（中间汇率）
import { getSinaRates } from '@/lib/fetchers/sina'              // 新浪（备用）
import { getBOCRates } from '@/lib/fetchers/boc'               // 中国银行官网 HTML
import { getCMBRates } from '@/lib/fetchers/cmb'               // 招商银行 Playwright
import { getICBCRates, getCCBRates, getABCRates, getBOCOMRates } from '@/lib/fetchers/banks-playwright'
import { getHSBCRates } from '@/lib/fetchers/hsbc'             // 汇丰中国 JSON API
import { getCryptoPrices } from '@/lib/fetchers/crypto'         // Binance Vision + OKX
import { calculate } from '@/lib/calculators/fees'
import { Mode } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, mode } = await req.json() as {
      amount: number
      currency: string
      mode: Mode
    }
    if (!amount || !currency || !mode) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

    // 并行获取所有数据（任一失败不影响整体）
    const [wiseRes, sinaRes, bocRes, cmbRes, icbcRes, ccbRes, abcRes, bocomRes, hsbcRes, cryptoRes] =
      await Promise.allSettled([
        getBaseRates(),    // Wise 中间汇率
        getSinaRates(),    // 新浪备用
        getBOCRates(),     // 中行官网
        getCMBRates(),     // 招行 Playwright
        getICBCRates(),    // 工行 Playwright
        getCCBRates(),     // 建行 Playwright
        getABCRates(),     // 农行 Playwright
        getBOCOMRates(),   // 交行 Playwright
        getHSBCRates(),    // 汇丰 JSON API
        getCryptoPrices(), // Binance Vision + OKX
      ])

    const wise = wiseRes.status === 'fulfilled' ? wiseRes.value : null
    const sina = sinaRes.status === 'fulfilled' ? sinaRes.value : null
    const baseRates = wise ?? sina

    if (!baseRates?.[currency]) {
      return NextResponse.json({ error: '汇率获取失败，请稍后重试' }, { status: 500 })
    }

    const baseRate = baseRates[currency]

    // 整合各渠道实际汇率
    const channelRates: Record<string, number> = {
      wise: baseRate,
    }

    const pick = (res: PromiseSettledResult<Record<string, number>>, key: string) => {
      if (res.status === 'fulfilled') {
        const rate = res.value[currency]
        if (rate && rate > 0) channelRates[key] = rate
      }
    }

    pick(bocRes,   'boc')
    pick(cmbRes,   'cmb')
    pick(icbcRes,  'icbc')
    pick(ccbRes,   'ccb')
    pick(abcRes,   'abc')
    pick(bocomRes, 'bocom')
    pick(hsbcRes,  'hsbc')

    // 加密货币（仅 USD 模式）
    const crypto = cryptoRes.status === 'fulfilled' ? cryptoRes.value : null
    if (crypto && currency === 'USD') {
      channelRates['usdt_okx']    = baseRate * 1.005  // OKX C2C 约+0.5%溢价
      channelRates['usdt_binance'] = baseRate * 1.003  // Binance C2C 约+0.3%溢价
    }

    const results = calculate(amount, currency, baseRate, channelRates, mode, now)

    const sourceStatus = {
      baseRate: wise ? 'Wise API' : 'Sina',
      boc:      bocRes.status   === 'fulfilled' ? '实时' : '失败',
      cmb:      cmbRes.status   === 'fulfilled' ? '实时' : '失败',
      icbc:     icbcRes.status  === 'fulfilled' ? '实时' : '失败',
      ccb:      ccbRes.status   === 'fulfilled' ? '实时' : '失败',
      abc:      abcRes.status   === 'fulfilled' ? '实时' : '失败',
      bocom:    bocomRes.status === 'fulfilled' ? '实时' : '失败',
      hsbc:     hsbcRes.status  === 'fulfilled' ? '实时' : '失败',
      crypto:   crypto ? `${crypto.source} (OKX+Binance)` : '失败',
    }

    return NextResponse.json({ results, baseRate, sourceStatus, updatedAt: now })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务异常，请稍后重试' }, { status: 500 })
  }
}
