/**
 * 共享 Playwright 浏览器实例
 * 本地开发：使用系统 Chromium
 * Vercel 生产：使用 @sparticuz/chromium（专为 Serverless 优化的轻量版）
 */
import { chromium as playwrightChromium, Browser } from 'playwright-core'

let browser: Browser | null = null
let launchPromise: Promise<Browser> | null = null

async function getLaunchOptions() {
  const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME

  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default
    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }
  }

  return {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  }
}

export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser
  if (launchPromise) return launchPromise

  launchPromise = getLaunchOptions().then((opts) =>
    playwrightChromium.launch(opts)
  ).then((b) => {
    browser = b
    launchPromise = null
    b.on('disconnected', () => { browser = null })
    return b
  })

  return launchPromise
}
