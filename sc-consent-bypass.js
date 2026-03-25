const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,800'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    viewport: { width: 1280, height: 800 },
  });

  // Pre-set cookies to bypass consent dialog
  await context.addCookies([
    {
      name: 'OptanonAlertBoxClosed',
      value: new Date().toISOString(),
      domain: '.sc.com',
      path: '/',
    },
    {
      name: 'OptanonConsent',
      value: 'isGpcEnabled=0&datestamp=' + encodeURIComponent(new Date().toISOString()) + '&version=202212.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1&geolocation=US%3BCA&AwaitingReconsent=false',
      domain: '.sc.com',
      path: '/',
    },
  ]);

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const apiCalls = [];

  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    if (['xhr', 'fetch'].includes(type)) {
      apiCalls.push({ type, method: req.method(), url });
      if (!url.includes('onetrust') && !url.includes('google') && !url.includes('adobe') && !url.includes('demdex')) {
        console.log(`[${type}] ${req.method()} ${url}`);
      }
    }
  });

  page.on('response', async (resp) => {
    const type = resp.request().resourceType();
    const url = resp.url();
    const status = resp.status();
    const ct = resp.headers()['content-type'] || '';
    if (['xhr', 'fetch'].includes(type) && status === 200 && ct.includes('json')) {
      // Skip known noise
      if (url.includes('onetrust') || url.includes('google') || url.includes('adobe') || url.includes('demdex')) return;
      try {
        const body = await resp.json();
        const bodyStr = JSON.stringify(body, null, 2);
        if (bodyStr.length < 20000) {
          console.log(`\n[JSON RESP] ${url}`);
          console.log(bodyStr.substring(0, 1000));
        }
      } catch (e) {}
    }
  });

  // Visit the CN FX page
  console.log('Loading CN FX page with consent cookies...');
  try {
    await page.goto('https://www.sc.com/cn/foreign-exchange/', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
  } catch (e) {
    console.log('Note:', e.message?.substring(0, 100));
  }

  // Click "agree to all" if consent dialog still appears
  try {
    const agreeBtn = page.locator('#accept-recommended-btn-handler, button:has-text("同意全部"), button:has-text("Accept All"), .onetrust-accept-btn-handler');
    if (await agreeBtn.isVisible({ timeout: 3000 })) {
      console.log('Clicking consent button...');
      await agreeBtn.first().click();
      await page.waitForTimeout(3000);
    }
  } catch (e) {}

  await page.waitForTimeout(10000);

  // Scroll to trigger lazy loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(3000);

  // Get rendered content
  const content = await page.evaluate(() => {
    return {
      title: document.title,
      text: document.body.innerText.substring(0, 3000),
      html: document.body.innerHTML.substring(0, 5000),
      iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src),
      scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).filter(s => s.includes('sc.com')),
      tables: Array.from(document.querySelectorAll('table')).map(t => t.outerHTML.substring(0, 1000)),
    };
  });

  console.log('\n=== Page Content ===');
  console.log('Title:', content.title);
  console.log('Text:', content.text);
  console.log('Iframes:', content.iframes);
  console.log('SC scripts:', content.scripts);
  if (content.tables.length > 0) {
    console.log('Tables:', content.tables);
  }

  await page.screenshot({ path: '/Users/wangyu/currency-compare/sc-cn-fx-after-consent.png' });
  console.log('\nScreenshot saved');

  // Now also try the HK page
  console.log('\n\n=== Loading HK FX page ===');
  const page2 = await context.newPage();
  page2.on('request', (req) => {
    if (['xhr', 'fetch'].includes(req.resourceType())) {
      const url = req.url();
      if (!url.includes('onetrust') && !url.includes('google') && !url.includes('adobe') && !url.includes('demdex')) {
        console.log(`[HK ${req.resourceType()}] ${req.method()} ${url}`);
      }
    }
  });
  page2.on('response', async (resp) => {
    const type = resp.request().resourceType();
    const url = resp.url();
    if (['xhr', 'fetch'].includes(type) && resp.status() === 200) {
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('json') && !url.includes('onetrust') && !url.includes('google') && !url.includes('adobe') && !url.includes('demdex')) {
        try {
          const body = await resp.json();
          console.log(`\n[HK JSON] ${url}`);
          console.log(JSON.stringify(body, null, 2).substring(0, 500));
        } catch (e) {}
      }
    }
  });

  try {
    await page2.goto('https://www.sc.com/hk/banking/foreign-currency/', {
      waitUntil: 'networkidle',
      timeout: 45000,
    });
  } catch (e) {
    console.log('Note:', e.message?.substring(0, 100));
  }
  await page2.waitForTimeout(10000);

  const hkContent = await page2.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.substring(0, 2000),
    iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({src: f.src, id: f.id})),
  }));
  console.log('HK page title:', hkContent.title);
  console.log('HK text:', hkContent.text);
  console.log('HK iframes:', hkContent.iframes);

  await browser.close();
  console.log('\nDone.');
})();
