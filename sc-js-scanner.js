// Deep scan the JS files loaded on the CN FX page specifically
// The CN FX page (www.sc.com/cn/foreign-exchange/) may use a React/Vue SPA
// that has its own JS bundle with the API endpoint hardcoded

const { chromium } = require('/Users/wangyu/currency-compare/node_modules/playwright-core');
const https = require('https');

const CHROMIUM_PATH = '/Users/wangyu/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

function httpsGet(url) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': 'https://www.sc.com/' },
      timeout: 20000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });

  // Collect ALL resources loaded by the CN FX page
  const page = await browser.newPage();
  const jsFiles = [];
  const allResources = [];

  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    allResources.push({ url, status: resp.status(), ct });

    if (ct.includes('javascript') && (url.includes('sc.com') || url.includes('scb'))) {
      try {
        const body = await resp.text();
        jsFiles.push({ url, body });
      } catch (e) {}
    }
  });

  console.log('Loading CN FX page...');
  try {
    await page.goto('https://www.sc.com/cn/foreign-exchange/', {
      waitUntil: 'networkidle',
      timeout: 40000,
    });
  } catch (e) {}
  await page.waitForTimeout(3000);

  // Print ALL loaded resources to see if we're missing anything
  console.log('\nAll resources loaded from sc.com domains:');
  allResources.filter(r => r.url.includes('sc.com')).forEach(r => {
    console.log(`  [${r.status}] ${r.ct.substring(0,30)} | ${r.url.substring(0,120)}`);
  });

  await page.close();
  await browser.close();

  // Now scan each JS file
  console.log(`\n\nScanning ${jsFiles.length} JS files...`);
  for (const { url, body } of jsFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FILE: ${url.substring(0, 100)}`);
    console.log(`SIZE: ${body.length} bytes`);

    // Look for any URL patterns
    const urlPattern = /["'`]((?:https?:\/\/|\/)[^"'`\s\]]{10,}?)["'`]/g;
    const found = new Set();
    let m;
    while ((m = urlPattern.exec(body)) !== null) {
      const u = m[1];
      if (!u.includes('google') && !u.includes('facebook') && !u.includes('adobe') &&
          !u.includes('onetrust') && !u.includes('.png') && !u.includes('.jpg') &&
          !u.includes('.css') && !u.includes('.woff') && u.length < 200) {
        found.add(u);
      }
    }

    // Filter to interesting ones
    const interesting = [...found].filter(u =>
      /api|rate|fx|exchange|currency|remit|transfer|service|data|json|v\d/i.test(u)
    );

    if (interesting.length > 0) {
      console.log('INTERESTING URLs:');
      interesting.forEach(u => console.log(`  ${u}`));
    } else {
      console.log('No API-looking URLs found.');
      // Show all non-trivial URLs anyway
      const all = [...found].filter(u => !u.startsWith('http') || u.includes('sc.com'));
      if (all.length > 0) {
        console.log('SC-related URLs:');
        all.slice(0, 15).forEach(u => console.log(`  ${u}`));
      }
    }
  }

  // Also manually fetch the av.sc.com vendor bundle mentioned in the inline script
  console.log('\n\nFetching av.sc.com vendor bundle...');
  const vendorBundleUrl = 'https://av.sc.com/assets/global/js/vendor/bundle.min.js?ver=9f6fdd0';
  const r = await httpsGet(vendorBundleUrl);
  if (r.status === 200) {
    console.log(`Got vendor bundle: ${r.body.length} bytes`);
    // Search for SC-specific API URLs
    const patterns = [
      /["'`](https?:\/\/[^"'`\s]{5,}sc\.com[^"'`\s]*?)["'`]/g,
      /["'`](https?:\/\/[^"'`\s]{5,}(?:rate|fx|exchange|remit|currency)[^"'`\s]*)["'`]/gi,
      /(?:apiUrl|apiBase|baseUrl|endpoint|apiEndpoint)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi,
    ];
    const found = new Set();
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(r.body)) !== null) {
        found.add(m[1]);
      }
    }
    if (found.size > 0) {
      console.log('Found in vendor bundle:');
      [...found].forEach(u => console.log(`  ${u}`));
    } else {
      console.log('No relevant URLs found in vendor bundle');
    }
  }

  console.log('\nDone.');
})();
