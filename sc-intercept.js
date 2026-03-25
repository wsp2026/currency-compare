const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');
const path = require('path');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const RATE_KEYWORDS = ['rate', 'fx', 'exchange', 'currency', 'transfer', 'remit', 'forex'];

const URLS_TO_VISIT = [
  'https://www.sc.com/cn/foreign-exchange/',
  'https://www.sc.com/cn/send-money/',
  'https://www.standardchartered.com/en/rates/foreign-exchange.html',
  'https://www.sc.com/hk/transfer/overseas-transfer/',
];

const PUBLIC_APIS = [
  'https://api.sc.com/',
  'https://www.sc.com/api/',
  'https://rmt.sc.com/',
];

function isRateUrl(url) {
  const lower = url.toLowerCase();
  return RATE_KEYWORDS.some(kw => lower.includes(kw));
}

async function tryPublicApi(browser, url) {
  console.log(`\n--- Probing public API: ${url} ---`);
  const page = await browser.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = resp ? resp.status() : 'N/A';
    let body = '';
    try { body = await page.content(); } catch (e) { body = '(could not get content)'; }
    console.log(`  Status: ${status}`);
    if (status === 200) {
      console.log(`  Body (first 500 chars): ${body.substring(0, 500)}`);
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  } finally {
    await page.close();
  }
}

async function visitAndIntercept(browser, url) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Visiting: ${url}`);
  console.log('='.repeat(70));

  const page = await browser.newPage();
  const captured = [];

  // Intercept all requests
  await page.route('**/*', async (route) => {
    const request = route.request();
    const reqUrl = request.url();
    const resourceType = request.resourceType();

    // We only care about XHR/fetch for API detection, but let everything through
    route.continue();
  });

  // Listen to responses
  page.on('response', async (response) => {
    const reqUrl = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    if (status === 200 && isRateUrl(reqUrl)) {
      const isJson = contentType.includes('application/json') || contentType.includes('text/json');
      let body = null;
      if (isJson) {
        try { body = await response.json(); } catch (e) { body = null; }
      }
      captured.push({ url: reqUrl, status, contentType, body });
      console.log(`\n[RATE-RELATED REQUEST FOUND]`);
      console.log(`  URL: ${reqUrl}`);
      console.log(`  Status: ${status}`);
      console.log(`  Content-Type: ${contentType}`);
      if (body) {
        console.log(`  JSON Body: ${JSON.stringify(body, null, 2).substring(0, 2000)}`);
      }
    }

    // Also capture ALL XHR/fetch JSON responses for broader coverage
    const isXhrFetch = ['xhr', 'fetch'].includes(response.request().resourceType());
    if (isXhrFetch && status === 200 && contentType.includes('json')) {
      const alreadyCaptured = captured.some(c => c.url === reqUrl);
      if (!alreadyCaptured) {
        let body = null;
        try { body = await response.json(); } catch (e) { }
        if (body) {
          console.log(`\n[XHR/FETCH JSON (non-rate)]: ${reqUrl}`);
          console.log(`  Body (first 300 chars): ${JSON.stringify(body).substring(0, 300)}`);
        }
      }
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log(`  Navigation error: ${e.message}`);
  }

  // Wait for lazy-loaded API calls
  console.log('  Waiting 10 seconds for lazy-loaded requests...');
  await page.waitForTimeout(10000);

  // Try interacting with the page: look for dropdowns, buttons related to rates/FX
  try {
    // Try clicking any visible "查询" (query), "Calculate", "Get Rate" or similar buttons
    const clickTargets = [
      'button:has-text("查询")',
      'button:has-text("Calculate")',
      'button:has-text("Get Rate")',
      'button:has-text("Exchange Rate")',
      'button:has-text("汇率")',
      '[class*="rate"]',
      '[id*="rate"]',
      '[class*="calculator"]',
    ];
    for (const selector of clickTargets) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 1000 })) {
          console.log(`  Clicking: ${selector}`);
          await el.click();
          await page.waitForTimeout(2000);
        }
      } catch (e) { /* ignore */ }
    }

    // Try selecting currency dropdowns
    const selectTargets = [
      'select[name*="currency"]',
      'select[id*="currency"]',
      'select[name*="from"]',
      'select[name*="to"]',
    ];
    for (const selector of selectTargets) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 1000 })) {
          console.log(`  Interacting with select: ${selector}`);
          await el.selectOption({ index: 1 });
          await page.waitForTimeout(2000);
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.log(`  Interaction error: ${e.message}`);
  }

  // Wait another 3 seconds after interactions
  await page.waitForTimeout(3000);

  console.log(`\n  Total rate-related requests captured for ${url}: ${captured.length}`);
  await page.close();
  return captured;
}

(async () => {
  console.log('Launching headless Chromium...');
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const allCaptures = [];

  // Visit each URL
  for (const url of URLS_TO_VISIT) {
    const captures = await visitAndIntercept(browser, url);
    allCaptures.push(...captures);
  }

  // Probe public APIs
  for (const apiUrl of PUBLIC_APIS) {
    await tryPublicApi(browser, apiUrl);
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('SUMMARY: All rate-related API endpoints found:');
  console.log('='.repeat(70));
  if (allCaptures.length === 0) {
    console.log('No rate-related API endpoints found with keyword matching.');
  } else {
    allCaptures.forEach((c, i) => {
      console.log(`\n[${i + 1}] ${c.url}`);
      console.log(`    Status: ${c.status}, Content-Type: ${c.contentType}`);
      if (c.body) {
        console.log(`    Response: ${JSON.stringify(c.body, null, 2).substring(0, 1000)}`);
      }
    });
  }

  await browser.close();
  console.log('\nDone.');
})();
