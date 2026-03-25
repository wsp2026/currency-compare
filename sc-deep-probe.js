const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');
const https = require('https');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

// Extract all API-like URLs from JS source
function extractApiUrls(jsSource) {
  const patterns = [
    /["'`](https?:\/\/[^"'`\s]+(?:rate|fx|exchange|currency|remit|transfer)[^"'`\s]*?)["'`]/gi,
    /["'`](\/(?:api|v\d|services?|data|rest)[^"'`\s]*?)["'`]/gi,
    /url:\s*["'`]([^"'`]+)["'`]/gi,
    /endpoint:\s*["'`]([^"'`]+)["'`]/gi,
    /baseUrl[:\s=]+["'`]([^"'`]+)["'`]/gi,
    /API_URL[:\s=]+["'`]([^"'`]+)["'`]/gi,
  ];
  const found = new Set();
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(jsSource)) !== null) {
      found.add(m[1]);
    }
  }
  return [...found];
}

// Make a direct HTTPS request
function httpsGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', (e) => resolve({ status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

async function scrapeJsForApis(browser) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: Extracting API URLs from page JS bundles');
  console.log('='.repeat(70));

  const page = await browser.newPage();
  const jsUrls = [];

  page.on('response', async (response) => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';
    if (ct.includes('javascript') && url.includes('sc.com')) {
      jsUrls.push(url);
    }
  });

  await page.goto('https://www.standardchartered.com/en/rates/foreign-exchange.html', {
    waitUntil: 'networkidle',
    timeout: 40000,
  });
  await page.waitForTimeout(3000);

  // Also grab the page HTML to look for inline scripts / data
  const html = await page.content();
  console.log('\nSearching page HTML for API clues...');
  const htmlApis = extractApiUrls(html);
  if (htmlApis.length) {
    console.log('Found in HTML:', htmlApis);
  }

  // Fetch each JS bundle and scan for API endpoints
  console.log(`\nFound ${jsUrls.length} JS files from sc.com. Scanning...`);
  for (const jsUrl of jsUrls.slice(0, 10)) {
    try {
      const resp = await httpsGet(jsUrl);
      if (resp.status === 200) {
        const apis = extractApiUrls(resp.body);
        if (apis.length) {
          console.log(`\nFrom: ${jsUrl}`);
          console.log('API candidates:', apis.slice(0, 20));
        }
      }
    } catch (e) { /* ignore */ }
  }

  await page.close();
}

async function interactWithHKPage(browser) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: Deep interaction with HK overseas transfer page');
  console.log('='.repeat(70));

  const page = await browser.newPage();
  const rateRequests = [];

  page.on('request', (req) => {
    const url = req.url();
    const type = req.resourceType();
    if (type === 'xhr' || type === 'fetch') {
      console.log(`  [${type.toUpperCase()}] -> ${url}`);
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const ct = response.headers()['content-type'] || '';
    const type = response.request().resourceType();
    if ((type === 'xhr' || type === 'fetch') && status === 200 && ct.includes('json')) {
      let body = null;
      try { body = await response.json(); } catch (e) {}
      rateRequests.push({ url, status, body });
      console.log(`\n  [JSON RESPONSE] ${url}`);
      console.log(`  Body: ${JSON.stringify(body, null, 2).substring(0, 800)}`);
    }
  });

  console.log('\nNavigating to HK overseas transfer page...');
  try {
    await page.goto('https://www.sc.com/hk/transfer/overseas-transfer/', {
      waitUntil: 'networkidle',
      timeout: 40000,
    });
  } catch (e) {
    console.log(`Navigation note: ${e.message}`);
  }

  await page.waitForTimeout(5000);

  // Try to interact with any rate calculator / remittance calculator on the page
  console.log('\nLooking for interactive elements...');

  // Get all visible text to understand page structure
  const pageText = await page.evaluate(() => {
    const elements = document.querySelectorAll('input, select, button, a[href*="rate"], a[href*="transfer"]');
    return Array.from(elements).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      class: el.className?.substring(0, 80),
      text: el.innerText?.substring(0, 50),
      href: el.href,
    }));
  });
  console.log('\nInteractive elements found:');
  pageText.forEach(el => console.log('  ', JSON.stringify(el)));

  // Try clicking anything that looks like a rate calculator trigger
  const selectors = [
    'a[href*="rate"]',
    'button[class*="rate"]',
    '[data-tab*="rate"]',
    '[data-tab*="transfer"]',
    'a:has-text("Rate")',
    'a:has-text("汇率")',
    'button:has-text("Send Money")',
    '[class*="overseas"]',
    '[class*="remit"]',
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 })) {
        console.log(`\nClicking: ${sel}`);
        await el.click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {}
  }

  await page.waitForTimeout(5000);
  await page.close();
  return rateRequests;
}

async function interactWithCNFXPage(browser) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: Deep interaction with CN foreign-exchange page + full XHR log');
  console.log('='.repeat(70));

  const page = await browser.newPage();

  page.on('request', (req) => {
    const url = req.url();
    const type = req.resourceType();
    if (type === 'xhr' || type === 'fetch') {
      console.log(`  [${type.toUpperCase()}] -> ${url}`);
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const ct = response.headers()['content-type'] || '';
    const type = response.request().resourceType();
    if ((type === 'xhr' || type === 'fetch') && status === 200 && ct.includes('json')) {
      let body = null;
      try { body = await response.json(); } catch (e) {}
      console.log(`\n  [JSON] ${url}`);
      if (body) console.log(`  Body: ${JSON.stringify(body, null, 2).substring(0, 600)}`);
    }
  });

  await page.goto('https://www.sc.com/cn/foreign-exchange/', {
    waitUntil: 'networkidle',
    timeout: 40000,
  });
  await page.waitForTimeout(5000);

  // Scroll to bottom to trigger lazy loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);

  // Find all inputs and selects on the page
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, button')).map(el => ({
      tag: el.tagName, type: el.type, name: el.name, id: el.id,
      class: el.className?.substring(0, 80), text: el.innerText?.substring(0, 50)
    }));
  });
  console.log('\nInputs/buttons on CN FX page:');
  inputs.forEach(i => console.log('  ', JSON.stringify(i)));

  await page.waitForTimeout(5000);
  await page.close();
}

async function tryDirectApiEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: Direct API endpoint probing');
  console.log('='.repeat(70));

  const endpoints = [
    'https://www.sc.com/api/rates',
    'https://www.sc.com/api/fx-rates',
    'https://www.sc.com/api/exchange-rates',
    'https://www.sc.com/cn/api/rates',
    'https://www.sc.com/hk/api/rates',
    'https://av.sc.com/cn/data/rates.json',
    'https://av.sc.com/hk/data/rates.json',
    'https://av.sc.com/cn/data/fx-rates.json',
    'https://av.sc.com/hk/data/fx-rates.json',
    'https://api.sc.com/fx/rates',
    'https://api.sc.com/v1/rates',
    'https://api.sc.com/rates/fx',
    'https://www.sc.com/api/v1/fx/rates',
    'https://www.sc.com/api/v1/currency/rates',
    'https://ob.sc.com/scb-openapi-cn/v1/fx/rates',
    'https://ob.sc.com/scb-openapi/v1/fx/rates',
    // SC Open Banking API
    'https://api.sc.com/retail/v1/products/fx-rates',
    'https://api.sc.com/retail/v1/fx/rates',
  ];

  for (const url of endpoints) {
    const result = await httpsGet(url);
    const isJson = (result.headers?.['content-type'] || '').includes('json');
    if (result.status === 200) {
      console.log(`\n[200 OK] ${url}`);
      console.log(`  Content-Type: ${result.headers?.['content-type']}`);
      console.log(`  Body (first 500): ${result.body.substring(0, 500)}`);
    } else if (result.status !== 'ERROR' && result.status !== 'TIMEOUT' && result.status !== 404) {
      console.log(`[${result.status}] ${url}`);
    }
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  await scrapeJsForApis(browser);
  await interactWithHKPage(browser);
  await interactWithCNFXPage(browser);
  await browser.close();

  await tryDirectApiEndpoints();

  console.log('\n\nDone.');
})();
