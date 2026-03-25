const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: false,
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  page.on('request', (req) => {
    const type = req.resourceType();
    if (['xhr', 'fetch'].includes(type)) {
      const url = req.url();
      if (!url.includes('onetrust') && !url.includes('google')) {
        console.log(`[${type}] ${req.method()} ${url}`);
      }
    }
  });

  page.on('response', async (resp) => {
    const type = resp.request().resourceType();
    const url = resp.url();
    if (['xhr', 'fetch'].includes(type) && resp.status() === 200) {
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('json') && !url.includes('onetrust') && !url.includes('google')) {
        try {
          const body = await resp.json();
          console.log(`\n[JSON] ${url}`);
          console.log(JSON.stringify(body, null, 2).substring(0, 1000));
        } catch (e) {}
      }
    }
  });

  console.log('Loading openbanking.sc.com...');
  await page.goto('https://openbanking.sc.com/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(5000);

  // Get the full page text
  const content = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.substring(0, 5000),
    links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.innerText?.trim().substring(0, 50),
      href: a.href,
    })).filter(a => a.text && !a.href.includes('onetrust')).slice(0, 50),
    navItems: Array.from(document.querySelectorAll('nav a, header a, .menu a')).map(a => a.innerText?.trim()).filter(Boolean),
  }));

  console.log('\nTitle:', content.title);
  console.log('Text:', content.text);
  console.log('\nLinks:');
  content.links.forEach(l => console.log('  ' + l.text + ' -> ' + l.href));
  console.log('\nNav items:', content.navItems);

  // Take screenshot
  await page.screenshot({ path: '/Users/wangyu/currency-compare/sc-openbanking.png' });
  console.log('\nScreenshot saved');

  // Click on "APIs" or "Products" if visible
  const apiBtn = page.locator('a:has-text("API"), a:has-text("Products"), a:has-text("FX"), a:has-text("Rates")').first();
  try {
    if (await apiBtn.isVisible({ timeout: 3000 })) {
      console.log('Clicking API/Products button...');
      await apiBtn.click();
      await page.waitForTimeout(5000);
      const afterContent = await page.evaluate(() => ({
        url: location.href,
        text: document.body.innerText.substring(0, 3000),
      }));
      console.log('\nAfter click URL:', afterContent.url);
      console.log('After click text:', afterContent.text);
      await page.screenshot({ path: '/Users/wangyu/currency-compare/sc-openbanking-api.png' });
    }
  } catch (e) {}

  await browser.close();
  console.log('\nDone.');
})();
