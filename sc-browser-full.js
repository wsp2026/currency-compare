// Launch a full browser session with JS enabled and intercept ALL network calls
// The CN FX page runs a React/Angular SPA that loads rates dynamically
// We need to let the full JS execute and catch those XHR calls

const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: false, // Run with visible browser to bypass bot detection
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const allCalls = [];

  // Override navigator.webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    if (['xhr', 'fetch'].includes(type)) {
      allCalls.push({ type, method: req.method(), url, postData: req.postData() });
      if (url.includes('sc.com') || /rate|fx|exchange|currency|remit/i.test(url)) {
        console.log(`[REQ ${type}] ${req.method()} ${url}`);
        if (req.postData()) console.log(`  POST: ${req.postData().substring(0, 200)}`);
      }
    }
  });

  page.on('response', async (resp) => {
    const type = resp.request().resourceType();
    const url = resp.url();
    const status = resp.status();
    const ct = resp.headers()['content-type'] || '';
    if (['xhr', 'fetch'].includes(type) && status === 200 && ct.includes('json')) {
      try {
        const body = await resp.json();
        const bodyStr = JSON.stringify(body, null, 2);
        if (bodyStr.length < 10000) {
          console.log(`\n[RESP JSON] ${url}`);
          console.log(bodyStr.substring(0, 800));
        }
      } catch (e) {}
    }
  });

  // Visit the CN FX page
  console.log('Loading CN FX page...');
  try {
    await page.goto('https://www.sc.com/cn/foreign-exchange/', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
  } catch (e) {
    console.log('Note:', e.message?.substring(0, 100));
  }

  await page.waitForTimeout(10000);

  // Scroll down to trigger lazy loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(3000);

  // Check page content after JS execution
  const content = await page.evaluate(() => {
    const text = document.body.innerText.substring(0, 2000);
    const forms = Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.substring(0, 500));
    const selects = Array.from(document.querySelectorAll('select')).map(s => s.outerHTML.substring(0, 200));
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({name:i.name, type:i.type, id:i.id}));
    const tables = Array.from(document.querySelectorAll('table')).map(t => t.outerHTML.substring(0, 1000));
    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
    return { text, forms, selects, inputs, tables, iframes };
  });

  console.log('\n=== Page Content after JS execution ===');
  console.log('Text:', content.text);
  console.log('Forms:', content.forms);
  console.log('Selects:', content.selects);
  console.log('Inputs:', content.inputs);
  console.log('Tables:', content.tables.length, 'found');
  content.tables.forEach(t => console.log(t.substring(0, 500)));
  console.log('Iframes:', content.iframes);

  // Take a screenshot to see what's rendered
  await page.screenshot({ path: '/Users/wangyu/currency-compare/sc-cn-fx-page.png' });
  console.log('\nScreenshot saved to sc-cn-fx-page.png');

  console.log('\n=== Summary of all XHR/Fetch calls to sc.com ===');
  const scCalls = allCalls.filter(c => c.url.includes('sc.com'));
  scCalls.forEach(c => console.log(`  [${c.type}] ${c.method} ${c.url}`));

  await browser.close();
  console.log('\nDone.');
})();
