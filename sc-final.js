// Final targeted probe: check the form/calculator app bundles found in OtAutoBlock.js
const https = require('https');

function httpsGet(url) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.sc.com/',
        'Origin': 'https://www.sc.com',
      },
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

function extractApiUrls(src, label) {
  const found = new Set();
  const patterns = [
    /["'`](https?:\/\/[^"'`\s]{10,}?)["'`]/g,
    /["'`](\/(?:api|v\d|rates?|fx|exchange)[^"'`\s]{3,}?)["'`]/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(src)) !== null) {
      const u = m[1];
      if (!u.includes('google') && !u.includes('facebook') && !u.includes('adobe') &&
          !u.includes('onetrust') && !u.includes('.png') && !u.includes('.jpg') &&
          !u.includes('analytics') && u.length < 200) {
        found.add(u);
      }
    }
  }
  if (found.size > 0) {
    console.log(`\nURLs found in [${label}]:`);
    [...found].sort().forEach(u => console.log(`  ${u}`));
  }
  return [...found];
}

(async () => {
  // These were found in the OtAutoBlock.js as blocked URLs
  const appUrls = [
    'https://www.sc.com/global/av/forms/d1/assets/app.js',
    'https://www.sc.com/global/av/forms/d0/assets/app.js',
    'https://wmapp.sc.com/hwt/hwt.js',
    'https://wmapp.sc.com/hwt/',
    'https://wmapp.sc.com/',
  ];

  console.log('=== Checking SC app JS files found in OtAutoBlock.js ===\n');
  for (const url of appUrls) {
    console.log(`\nChecking: ${url}`);
    const r = await httpsGet(url);
    console.log(`  Status: ${r.status}`);
    if (r.status === 200) {
      console.log(`  Size: ${r.body.length} bytes`);
      console.log(`  Content-Type: ${r.headers['content-type']}`);
      extractApiUrls(r.body, url);
    }
  }

  // Also check the head.min.js which contained /data/campaign-parameter path pattern
  // to understand what other data paths might be available
  console.log('\n\n=== Checking head.min.js for full path patterns ===');
  const headJs = await httpsGet('https://av.sc.com/assets/global/js/head.min.js?ver=9f6fdd0');
  if (headJs.status === 200) {
    // Look for /data/ paths specifically
    const dataPaths = headJs.body.match(/["'`](\/[a-z][a-zA-Z0-9\-\/]*(?:data|rate|fx|exchange|json)[^"'`\s]*?)["'`]/g) || [];
    console.log('Data paths found:', dataPaths.slice(0, 20));
    // Look for API calls pattern
    const apiCalls = headJs.body.match(/fetch\(["'`]([^"'`]+)["'`]/g) || [];
    console.log('Fetch calls:', apiCalls.slice(0, 10));
    const ajaxCalls = headJs.body.match(/\$.(?:ajax|get|post)\(["'`]([^"'`]+)["'`]/g) || [];
    console.log('AJAX calls:', ajaxCalls.slice(0, 10));
    const xhrOpen = headJs.body.match(/\.open\(["'`][A-Z]+["'`],\s*["'`]([^"'`]+)["'`]/g) || [];
    console.log('XHR open:', xhrOpen.slice(0, 10));
  }

  // Check the SC Singapore online banking for the remittance calculator
  // It's known to have an overseas transfer calculator at a specific URL
  console.log('\n\n=== Checking SC Singapore/India remittance pages ===');
  const remittanceUrls = [
    'https://www.sc.com/sg/remit/',
    'https://www.sc.com/sg/transfer/overseas/',
    'https://www.sc.com/in/transfers/overseas-transfer/',
    'https://www.sc.com/sg/online-banking/features/transfers/',
    'https://www.sc.com/sg/foreign-exchange/',
  ];
  for (const url of remittanceUrls) {
    const r = await httpsGet(url);
    console.log(`[${r.status}] ${url}`);
    if (r.status === 200) {
      // Look for API URLs in the HTML
      extractApiUrls(r.body, url);
    }
  }

  // Check the SC Open Banking portal source for API spec
  console.log('\n\n=== Scanning openbanking.sc.com for API documentation ===');
  const obPage = await httpsGet('https://openbanking.sc.com/');
  if (obPage.status === 200) {
    // Find script sources
    const scripts = obPage.body.match(/src=["'](https?:\/\/[^"']+\.js[^"']*)["']/g) || [];
    console.log('Scripts on openbanking.sc.com:', scripts.slice(0, 10));
    extractApiUrls(obPage.body, 'openbanking.sc.com');
  }

  console.log('\n\nDone.');
})();
