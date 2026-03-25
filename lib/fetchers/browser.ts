/**
 * 共享 Playwright 浏览器实例
 * 单例模式，避免每次请求都重新启动浏览器（启动约需 2-3 秒）
 */
import { chromium, Browser } from 'playwright-core'

let browser: Browser | null = null
let launchPromise: Promise<Browser> | null = null

export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser

  if (launchPromise) return launchPromise

  launchPromise = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  }).then((b) => {
    browser = b
    launchPromise = null
    b.on('disconnected', () => { browser = null })
    return b
  })

  return launchPromise
}
