const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');
const https = require('https');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

function httpsGet(url) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://wmapp.sc.com/' },
      timeout: 20000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', e => resolve({ status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

(async () => {
  // First scan the banca loader chunk for API URLs
  console.log('=== Scanning wmapp.sc.com chunks for API endpoints ===\n');
  const chunks = [
    'https://wmapp.sc.com/assets/bancaLoader-C2oshACI.1768359303536.js',
    'https://wmapp.sc.com/assets/login-C1LGg0SS.1768359303536.js',
    'https://wmapp.sc.com/assets/landing-BIH_Vvjj.1768359303536.js',
    'https://wmapp.sc.com/assets/homePage-DJxGV_BI.1768359303536.js',
    'https://wmapp.sc.com/assets/connect-emebiOuw.1768359303536.js',
  ];

  for (const chunkUrl of chunks) {
    console.log(`\nChunk: ${chunkUrl.split('/').pop()}`);
    const r = await httpsGet(chunkUrl);
    if (r.status === 200) {
      console.log(`  Size: ${r.body.length}`);
      const urlRe = new RegExp('https?://[^\\s"\'`\\\\)},;]{10,}', 'g');
      const found = new Set();
      let m;
      while ((m = urlRe.exec(r.body)) !== null) {
        const u = m[0].replace(/[)},;'"]+$/, '');
        if (!u.includes('google') && !u.includes('adobe') && !u.includes('onetrust') &&
            !u.includes('localhost') && !u.includes('bit.ly') && !u.includes('momentjs') &&
            !u.includes('reactjs') && !u.includes('redux') && !u.includes('lodash') && !u.includes('npms')) {
          found.add(u);
        }
      }
      if (found.size > 0) {
        console.log('  URLs found:');
        [...found].forEach(u => console.log('    ' + u));
      }

      // Look for relative API paths
      const relRe = new RegExp('["\'`](/(?:api|v\\d|service|retail|fx|rate|exchange|currency)[^"\'`\\s]{3,})["\'`]', 'g');
      const relFound = new Set();
      while ((m = relRe.exec(r.body)) !== null) relFound.add(m[1]);
      if (relFound.size > 0) {
        console.log('  Relative paths:');
        [...relFound].forEach(u => console.log('    ' + u));
      }

      // Search for specific terms
      ['fxRate', 'FxRate', 'exchangeRate', 'ExchangeRate', 'GetRate', 'getRate',
       'remittance', 'transfer', 'wmapp', 'wm-api', 'banca'].forEach(term => {
        const idx = r.body.indexOf(term);
        if (idx !== -1) {
          console.log(`\n  Found "${term}" at ${idx}:`);
          console.log('  ' + r.body.substring(Math.max(0, idx-100), idx+300).replace(/\n/g, ' '));
        }
      });
    } else {
      console.log(`  Status: ${r.status}`);
    }
  }

  // Now use the browser to intercept wmapp.sc.com network calls
  console.log('\n\n=== Browsing wmapp.sc.com with full network interception ===\n');

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    if (['xhr', 'fetch'].includes(type)) {
      console.log(`[${type}] ${req.method()} ${url}`);
      if (req.postData()) console.log(`  Body: ${req.postData().substring(0, 150)}`);
    }
  });

  page.on('response', async (resp) => {
    const type = resp.request().resourceType();
    const url = resp.url();
    if (['xhr', 'fetch'].includes(type) && resp.status() === 200) {
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('json')) {
        try {
          const body = await resp.json();
          console.log(`\n[RESP JSON] ${url}`);
          console.log(JSON.stringify(body, null, 2).substring(0, 500));
        } catch (e) {}
      }
    }
  });

  try {
    await page.goto('https://wmapp.sc.com/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Loaded wmapp.sc.com, URL:', page.url());
    await page.waitForTimeout(5000);

    // Check page content
    const title = await page.title();
    console.log('Page title:', title);

    // Try to find any visible content
    const content = await page.evaluate(() => ({
      url: location.href,
      text: document.body.innerText.substring(0, 500),
      inputs: Array.from(document.querySelectorAll('input')).map(i => ({name: i.name, type: i.type, id: i.id})),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText?.substring(0, 50)),
    }));
    console.log('\nPage content:', JSON.stringify(content, null, 2));

  } catch (e) {
    console.log('Error:', e.message?.substring(0, 100));
  }

  await browser.close();
  console.log('\nDone.');
})();
