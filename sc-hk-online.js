// Try the SC Online Banking HK portal which might serve FX rates
// Also try to find the rate widget that's embedded in the FX page via non-headless mode
const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Target the SC online banking or mobile app API
  const page = await browser.newPage();

  // Set headers to look like a mobile app
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'X-Requested-With': 'XMLHttpRequest',
  });

  const allApiCalls = [];

  page.on('request', (req) => {
    const url = req.url();
    const type = req.resourceType();
    if (type === 'xhr' || type === 'fetch') {
      allApiCalls.push({
        url,
        method: req.method(),
        type,
        headers: req.headers(),
        postData: req.postData()?.substring(0, 200),
      });
      console.log(`[${type.toUpperCase()}] ${req.method()} ${url}`);
      if (req.postData()) console.log(`  Post: ${req.postData()?.substring(0, 100)}`);
    }
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    const type = resp.request().resourceType();
    if ((type === 'xhr' || type === 'fetch') && resp.status() === 200 && ct.includes('json')) {
      let body;
      try { body = await resp.json(); } catch (e) {}
      if (body) {
        const bodyStr = JSON.stringify(body, null, 2);
        if (bodyStr.length < 5000) {
          console.log(`\n[RESP JSON] ${url}`);
          console.log(bodyStr.substring(0, 800));
        }
      }
    }
  });

  // Try the SC mobile banking API directly
  const mobileApiUrls = [
    'https://mobilebanking.sc.com/',
    'https://mobile.sc.com/',
    'https://app.sc.com/',
    // Try the SC eBanking Singapore (they share infrastructure)
    'https://ebank.standardchartered.com/nfs/wps/portal/scb/tab1/tab',
    // SC China online banking
    'https://mybank.sc.com/',
    'https://mybank.sc.com/portal/',
    // SC HK eBanking portal
    'https://www.sc.com/hk/investments/foreign-exchange-rates/',
    'https://www.sc.com/hk/rates/foreign-exchange-rates/',
    'https://www.sc.com/hk/rates/exchange-rates/',
  ];

  for (const url of mobileApiUrls) {
    console.log(`\n--- Visiting: ${url} ---`);
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`  Final URL: ${page.url()}`);
      console.log(`  Status: ${resp?.status()}`);
      await page.waitForTimeout(5000);
    } catch (e) {
      console.log(`  Error: ${e.message?.substring(0, 80)}`);
    }
  }

  // Summary
  console.log('\n\n=== API Calls Summary ===');
  const uniqueApis = [...new Set(allApiCalls.map(c => c.url))];
  console.log(`Total unique API calls: ${uniqueApis.length}`);
  uniqueApis.forEach(url => console.log(`  ${url}`));

  await page.close();
  await browser.close();
  console.log('\nDone.');
})();
