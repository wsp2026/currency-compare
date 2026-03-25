const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');
const https = require('https');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

function httpsGet(url, extraHeaders = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh-HK;q=0.7',
        ...extraHeaders,
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', (e) => resolve({ status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

// Step 1: Check what the CN FX page actually contains (iframes, data attributes, embedded config)
async function analyzePageStructure(browser) {
  console.log('=== Analyzing CN FX page structure for embedded API config ===\n');

  const page = await browser.newPage();
  const networkLog = [];

  page.on('request', (req) => {
    const t = req.resourceType();
    const url = req.url();
    if (['xhr', 'fetch'].includes(t)) {
      networkLog.push({ type: t, url, method: req.method(), postData: req.postData()?.substring(0, 200) });
    }
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    const t = resp.request().resourceType();
    if (['xhr', 'fetch'].includes(t)) {
      const ct = resp.headers()['content-type'] || '';
      const status = resp.status();
      if (ct.includes('json') && status === 200) {
        let body;
        try { body = await resp.json(); } catch (e) {}
        if (body) {
          console.log(`[JSON] ${url}`);
          console.log(JSON.stringify(body, null, 2).substring(0, 300));
          console.log();
        }
      }
    }
  });

  try {
    await page.goto('https://www.sc.com/cn/foreign-exchange/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  } catch (e) {}

  await page.waitForTimeout(3000);

  // Extract all iframes
  const iframes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('iframe')).map(f => ({
      src: f.src, id: f.id, name: f.name, class: f.className
    }))
  );
  console.log('\nIframes found:', iframes);

  // Extract all script tags with data attributes or config
  const scriptData = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts
      .map(s => s.innerHTML?.trim())
      .filter(s => s && s.length > 50 && s.length < 5000)
      .filter(s => /api|url|endpoint|rate|fx|exchange|currency|config/i.test(s));
  });
  console.log('\nRelevant inline scripts:');
  scriptData.forEach(s => { console.log(s.substring(0, 500)); console.log('---'); });

  // Look for data-* attributes with API config
  const dataAttrs = await page.evaluate(() => {
    const all = document.querySelectorAll('[data-api], [data-url], [data-endpoint], [data-config]');
    return Array.from(all).map(el => ({
      tag: el.tagName,
      dataset: JSON.stringify(el.dataset).substring(0, 200),
    }));
  });
  console.log('\nData attribute elements:', dataAttrs);

  // Check window object for API config
  const windowConfig = await page.evaluate(() => {
    const keys = Object.keys(window).filter(k =>
      /api|rate|fx|exchange|currency|config|endpoint/i.test(k) &&
      !['onmessage', 'onfocus', 'onblur'].includes(k)
    );
    const result = {};
    for (const k of keys.slice(0, 30)) {
      try {
        const val = window[k];
        if (typeof val !== 'function' && typeof val !== 'undefined') {
          result[k] = JSON.stringify(val)?.substring(0, 200);
        }
      } catch (e) {}
    }
    return result;
  });
  console.log('\nWindow config keys:', JSON.stringify(windowConfig, null, 2));

  await page.close();
}

// Step 2: Check the SC developer portal / open banking docs
async function checkDeveloperPortal() {
  console.log('\n=== Checking SC Developer / Open Banking Portal ===\n');

  const urls = [
    'https://developer.sc.com/',
    'https://developer.sc.com/api/',
    'https://developer.sc.com/api/retail/',
    'https://openbanking.sc.com/',
    'https://ob.sc.com/',
    'https://ob.sc.com/open-banking/v3.1/products',
    'https://api.sc.com/retail/',
    'https://api.sc.com/retail/v1/products/personal-current-accounts',
  ];

  for (const url of urls) {
    const r = await httpsGet(url);
    console.log(`[${r.status}] ${url}`);
    if (r.status === 200 || (r.status >= 400 && r.status < 500)) {
      const ct = r.headers?.['content-type'] || '';
      console.log(`  CT: ${ct}`);
      if (r.body.length > 0) console.log(`  Body: ${r.body.substring(0, 300)}`);
    }
  }
}

// Step 3: Specifically target the SC CN FX rate API by looking at the page's JS files
async function scanCNFXPageJSFiles(browser) {
  console.log('\n=== Scanning all JS loaded on CN FX page ===\n');

  const page = await browser.newPage();
  const jsFiles = [];

  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('javascript') && url.includes('sc.com')) {
      try {
        const body = await resp.text();
        jsFiles.push({ url, body });
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://www.sc.com/cn/foreign-exchange/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  } catch (e) {}

  await page.close();

  console.log(`Captured ${jsFiles.length} SC JS files`);

  for (const { url, body } of jsFiles) {
    // Look for API-related strings specifically
    const patterns = [
      /(?:fetch|axios|XMLHttpRequest|ajax)\s*\(?["'`](https?:\/\/[^"'`]+)["'`]/g,
      /(?:fetch|axios|XMLHttpRequest|ajax)\s*\(?["'`](\/[^"'`\s]{5,})["'`]/g,
      /url:\s*["'`](https?:\/\/[^"'`]+)["'`]/g,
      /url:\s*["'`](\/[a-zA-Z][^"'`\s]{4,})["'`]/g,
      /["'`](https?:\/\/[^"'`\s]*(?:rate|fx|exchange|currency|remit)[^"'`\s]*)["'`]/gi,
      /["'`](https?:\/\/[^"'`\s]*api[^"'`\s]*)["'`]/gi,
    ];

    const found = new Set();
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(body)) !== null) {
        const u = m[1];
        if (!u.includes('google') && !u.includes('facebook') && !u.includes('adobe') && !u.includes('onetrust')) {
          found.add(u);
        }
      }
    }

    if (found.size > 0) {
      console.log(`\nFrom: ${url.substring(0, 100)}`);
      [...found].forEach(u => console.log(`  ${u}`));
    }
  }
}

// Step 4: Try the SC retail banking API with common FX paths
async function tryRetailApiPaths() {
  console.log('\n=== Trying SC retail/FX API paths ===\n');

  // Based on known patterns from SC's Open Banking API
  const paths = [
    '/retail/v1/products/fx-rates',
    '/retail/v1/fx/rates',
    '/retail/v1/exchange-rates',
    '/retail/v1/currency/rates',
    '/scb-openapi/v1/fx/rates',
    '/scb-openapi-cn/v1/fx/rates',
    '/scb-openapi-hk/v1/fx/rates',
    '/open-banking/v3.1/products',
    '/v1/fx-rates',
    '/v2/fx-rates',
  ];

  const baseUrls = ['https://api.sc.com', 'https://ob.sc.com'];

  for (const base of baseUrls) {
    for (const path of paths) {
      const url = base + path;
      const r = await httpsGet(url);
      if (r.status !== 'ERROR' && r.status !== 'TIMEOUT') {
        console.log(`[${r.status}] ${url}`);
        if (r.status === 200 || r.status === 400 || r.status === 401) {
          console.log(`  Body: ${r.body?.substring(0, 300)}`);
        }
      }
    }
  }
}

// Step 5: Check if there's a dedicated remittance calculator embedded app/iframe
async function findRemittanceCalculator(browser) {
  console.log('\n=== Looking for remittance calculator embedded app ===\n');

  const page = await browser.newPage();
  const allRequests = [];

  // Log ALL requests to find any calculator-related endpoints
  page.on('request', (req) => {
    allRequests.push(req.url());
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if (resp.status() === 200 && ct.includes('json')) {
      const t = resp.request().resourceType();
      if (['xhr', 'fetch', 'document'].includes(t)) {
        let body;
        try { body = await resp.json(); } catch (e) {}
        if (body && JSON.stringify(body).length < 5000) {
          console.log(`[JSON ${t}] ${url}`);
          console.log(JSON.stringify(body, null, 2).substring(0, 400));
          console.log();
        }
      }
    }
  });

  // Try URLs that might have a rate calculator
  const calcUrls = [
    'https://www.sc.com/cn/investments/foreign-exchange/',
    'https://www.sc.com/hk/banking/foreign-currency/',
    'https://www.sc.com/hk/rates/',
    'https://www.sc.com/hk/investments/foreign-exchange/',
    'https://online.sc.com/cn/#/exchange-rates',
    'https://ibank.standardchartered.com',
  ];

  for (const url of calcUrls) {
    console.log(`\nVisiting: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(5000);

      // Check iframes
      const iframes = await page.evaluate(() =>
        Array.from(document.querySelectorAll('iframe')).map(f => f.src)
      );
      if (iframes.length > 0) console.log('  Iframes:', iframes);

    } catch (e) {
      console.log(`  Error: ${e.message?.substring(0, 80)}`);
    }
  }

  // Print any interesting requests seen
  const interesting = allRequests.filter(u =>
    u.includes('rate') || u.includes('fx') || u.includes('exchange') || u.includes('currency') || u.includes('remit')
  );
  if (interesting.length > 0) {
    console.log('\nInteresting URLs seen:');
    interesting.forEach(u => console.log('  ' + u));
  }

  await page.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  await analyzePageStructure(browser);
  await scanCNFXPageJSFiles(browser);
  await browser.close();

  await checkDeveloperPortal();
  await tryRetailApiPaths();

  const browser2 = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  await findRemittanceCalculator(browser2);
  await browser2.close();

  console.log('\nDone.');
})();
