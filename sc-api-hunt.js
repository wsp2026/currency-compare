const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');
const https = require('https');
const http = require('http');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

function httpGet(url, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 10) return resolve({ status: 'MAX_REDIRECTS', url });
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        'Origin': 'https://www.sc.com',
        'Referer': 'https://www.sc.com/',
      },
      timeout: 15000,
    }, (res) => {
      // Follow redirects
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const newUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        console.log(`  [${res.statusCode}] -> ${newUrl}`);
        res.destroy();
        return resolve(httpGet(newUrl, redirectCount + 1));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
        finalUrl: url,
      }));
    });
    req.on('error', (e) => resolve({ status: 'ERROR', error: e.message, url }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', url }); });
  });
}

async function followRedirects() {
  console.log('=== Following 301 redirects from www.sc.com/api/* ===\n');
  const urls = [
    'https://www.sc.com/api/rates',
    'https://www.sc.com/api/fx-rates',
    'https://www.sc.com/api/exchange-rates',
    'https://www.sc.com/api/v1/fx/rates',
  ];
  for (const url of urls) {
    console.log(`\nProbing: ${url}`);
    const r = await httpGet(url);
    console.log(`  Final status: ${r.status}, Final URL: ${r.finalUrl}`);
    if (r.status === 200) {
      console.log(`  Content-Type: ${r.headers?.['content-type']}`);
      console.log(`  Body (500): ${r.body?.substring(0, 500)}`);
    }
  }
}

async function probeApiScCom() {
  console.log('\n=== Probing api.sc.com endpoints with auth headers ===\n');
  // api.sc.com is likely SC's Open Banking API
  // Try with various paths
  const endpoints = [
    'https://api.sc.com/',
    'https://api.sc.com/retail/v1/',
    'https://api.sc.com/retail/v1/products/',
    'https://api.sc.com/retail/v1/fx/',
    'https://api.sc.com/retail/v1/rates/',
    'https://api.sc.com/v1/',
    'https://api.sc.com/v1/fx/',
    'https://api.sc.com/fx/',
    'https://api.sc.com/rates/',
  ];
  for (const url of endpoints) {
    const r = await httpGet(url);
    console.log(`[${r.status}] ${url}`);
    if (r.status === 200 || r.status === 400 || r.status === 401) {
      console.log(`  Content-Type: ${r.headers?.['content-type']}`);
      console.log(`  Body: ${r.body?.substring(0, 300)}`);
    }
  }
}

async function scanJSBundle() {
  console.log('\n=== Scanning SC JS bundles for API endpoints ===\n');

  // The main JS bundle URL found earlier
  const jsBundleUrl = 'https://www.sc.com/en/content/themes/standard-chartered-corporate-affairs/build/scca-theme-aa3912df1148119407c4.js?ver=aa3912df1148119407c4';

  console.log(`Fetching: ${jsBundleUrl}`);
  const r = await httpGet(jsBundleUrl);
  if (r.status === 200) {
    const src = r.body;
    console.log(`JS bundle size: ${src.length} bytes`);

    // Search for API-related strings
    const patterns = [
      { name: 'rate/fx/exchange URLs', re: /["'`](https?:\/\/[^"'`\s]{5,}(?:rate|fx|exchange|currency|remit|transfer)[^"'`\s]*?)["'`]/gi },
      { name: '/api/ paths', re: /["'`](\/(?:api|v\d|services?|rest)\/[^"'`\s]{3,}?)["'`]/gi },
      { name: 'baseURL/endpoint vars', re: /(?:baseUrl|baseURL|apiUrl|endpoint|apiEndpoint|apiBase|API_BASE)[:\s=]+["'`](https?:\/\/[^"'`\s]+)["'`]/gi },
      { name: 'sc.com API subdomains', re: /["'`](https?:\/\/(?:api|ob|gateway|services?|rates?|fx)\.[^"'`\s]*?sc\.com[^"'`\s]*?)["'`]/gi },
    ];

    for (const { name, re } of patterns) {
      const found = new Set();
      let m;
      while ((m = re.exec(src)) !== null) {
        found.add(m[1]);
      }
      if (found.size > 0) {
        console.log(`\n[${name}]:`);
        [...found].forEach(u => console.log(`  ${u}`));
      }
    }
  } else {
    console.log(`Failed to fetch bundle: ${r.status}`);
  }
}

async function findFXPageJSBundles(browser) {
  console.log('\n=== Finding and scanning FX calculator page JS bundles ===\n');

  // The CN and HK rate calculator pages may load different bundles
  const pages = [
    'https://www.sc.com/cn/foreign-exchange/',
    'https://www.sc.com/hk/transfer/overseas-transfer/',
  ];

  for (const pageUrl of pages) {
    console.log(`\nPage: ${pageUrl}`);
    const page = await browser.newPage();
    const scriptSrcs = [];

    await page.route('**/*.js', async (route) => {
      const url = route.request().url();
      if (url.includes('sc.com') && !url.includes('google') && !url.includes('analytics')) {
        scriptSrcs.push(url);
      }
      route.continue();
    });

    try {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    } catch (e) {}

    // Also check inline scripts
    const inlineScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script:not([src])')).map(s => s.innerHTML?.substring(0, 2000));
    });

    for (const script of inlineScripts) {
      if (script && (script.includes('rate') || script.includes('fx') || script.includes('exchange') || script.includes('api'))) {
        console.log('\n[Inline script with relevant content]:');
        console.log(script.substring(0, 500));
      }
    }

    await page.close();

    // Scan the SC-specific JS files
    const scJsFiles = scriptSrcs.filter(u => u.includes('sc.com'));
    console.log(`Found ${scJsFiles.length} SC JS files. Scanning for API endpoints...`);
    for (const jsUrl of scJsFiles.slice(0, 5)) {
      const r = await httpGet(jsUrl);
      if (r.status === 200) {
        const apiPat = /["'`](https?:\/\/[^"'`\s]{10,}(?:rate|fx|exchange|currency|remit|api)[^"'`\s]*?)["'`]/gi;
        const found = new Set();
        let m;
        while ((m = apiPat.exec(r.body)) !== null) found.add(m[1]);
        if (found.size) {
          console.log(`\nFrom ${jsUrl.substring(0, 80)}...`);
          [...found].forEach(u => console.log(`  ${u}`));
        }
      }
    }
  }
}

async function tryHKRateCalculatorInteraction(browser) {
  console.log('\n=== Interactive: Try HK FX rate calculator ===\n');

  const page = await browser.newPage();
  const allXhr = [];

  page.on('request', (req) => {
    if (['xhr', 'fetch'].includes(req.resourceType())) {
      console.log(`  REQ [${req.resourceType()}]: ${req.url()}`);
      allXhr.push(req.url());
    }
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    const type = resp.request().resourceType();
    if (['xhr', 'fetch'].includes(type) && resp.status() === 200) {
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('json')) {
        let body;
        try { body = await resp.json(); } catch (e) {}
        console.log(`\n  RESP JSON: ${url}`);
        if (body) console.log(`  ${JSON.stringify(body, null, 2).substring(0, 500)}`);
      }
    }
  });

  // The HK FX rates page
  try {
    await page.goto('https://www.sc.com/hk/rates/foreign-exchange-rates/', {
      waitUntil: 'networkidle',
      timeout: 35000,
    });
    console.log('Loaded HK FX rates page');
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log(`Note: ${e.message?.substring(0, 100)}`);
  }

  // Also try the SC mobile/app API
  const mobileApiUrls = [
    'https://www.sc.com/hk/rates/foreign-exchange-rates/',
    'https://www.sc.com/hk/investments/currency-linked-investments/',
  ];
  for (const url of mobileApiUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(8000);
    } catch (e) {}
  }

  await page.close();
}

(async () => {
  await followRedirects();
  await probeApiScCom();
  await scanJSBundle();

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  await findFXPageJSBundles(browser);
  await tryHKRateCalculatorInteraction(browser);

  await browser.close();
  console.log('\nDone.');
})();
