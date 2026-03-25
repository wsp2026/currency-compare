const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  });

  await context.addCookies([
    {
      name: 'OptanonAlertBoxClosed',
      value: new Date().toISOString(),
      domain: '.standardchartered.com',
      path: '/',
    },
    {
      name: 'OptanonConsent',
      value: 'isGpcEnabled=0&datestamp=' + encodeURIComponent(new Date().toISOString()) + '&version=202507.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1&geolocation=US%3BCA&AwaitingReconsent=false',
      domain: '.standardchartered.com',
      path: '/',
    },
  ]);

  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  const rateApiCalls = [];

  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    if (['xhr', 'fetch'].includes(type)) {
      if (!url.includes('onetrust') && !url.includes('google') && !url.includes('adobe') && !url.includes('demdex')) {
        console.log(`[${type}] ${req.method()} ${url}`);
        rateApiCalls.push({ url, method: req.method() });
      }
    }
  });

  page.on('response', async (resp) => {
    const type = resp.request().resourceType();
    const url = resp.url();
    if (['xhr', 'fetch'].includes(type) && resp.status() === 200) {
      const ct = resp.headers()['content-type'] || '';
      if (!url.includes('onetrust') && !url.includes('google') && !url.includes('adobe') && !url.includes('demdex')) {
        try {
          if (ct.includes('json')) {
            const body = await resp.json();
            console.log(`\n[JSON] ${url}`);
            console.log(JSON.stringify(body, null, 2).substring(0, 800));
          } else if (ct.includes('xml')) {
            const text = await resp.text();
            console.log(`\n[XML] ${url}`);
            console.log(text.substring(0, 500));
          }
        } catch (e) {}
      }
    }
  });

  // The standardchartered.com FX rates page loaded successfully in our first test
  console.log('Loading standardchartered.com FX rates page...');
  try {
    await page.goto('https://www.standardchartered.com/en/rates/foreign-exchange.html', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
  } catch (e) {
    console.log('Note:', e.message?.substring(0, 100));
  }

  await page.waitForTimeout(10000);

  // Get page content
  const content = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.substring(0, 3000),
    tables: Array.from(document.querySelectorAll('table')).map(t => ({
      headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText?.trim()),
      rows: Array.from(t.querySelectorAll('tr')).slice(0, 5).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText?.trim())
      ),
    })),
    forms: Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.substring(0, 500)),
    selects: Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name,
      options: Array.from(s.options).map(o => o.value).slice(0, 10),
    })),
    iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src).slice(0, 5),
    rateElements: Array.from(document.querySelectorAll('[class*="rate"], [id*="rate"], [class*="fx"], [id*="fx"]')).map(el => ({
      tag: el.tagName,
      class: el.className?.substring(0, 100),
      text: el.innerText?.substring(0, 100),
    })).slice(0, 10),
  }));

  console.log('\n=== Page Content ===');
  console.log('Title:', content.title);
  console.log('Text:', content.text);
  console.log('Tables:', JSON.stringify(content.tables, null, 2));
  console.log('Selects:', JSON.stringify(content.selects, null, 2));
  console.log('Iframes:', content.iframes);
  console.log('Rate elements:', JSON.stringify(content.rateElements, null, 2));

  await page.screenshot({ path: '/Users/wangyu/currency-compare/sc-standardchartered-rates.png' });
  console.log('Screenshot saved');

  await browser.close();
  console.log('\nDone. Total API calls intercepted:', rateApiCalls.length);
  rateApiCalls.forEach(c => console.log(`  ${c.method} ${c.url}`));
})();
