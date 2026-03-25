const https = require('https');

function httpsGet(url, referer) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': referer || 'https://www.sc.com/' },
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
  // Scan connect.js chunk for API setup
  console.log('=== Scanning connect chunk ===');
  const connectR = await httpsGet('https://wmapp.sc.com/assets/connect-emebiOuw.1768359303536.js', 'https://wmapp.sc.com/');
  if (connectR.status === 200) {
    const d = connectR.body;
    console.log('Size:', d.length);

    // Find all API paths
    const paths = new Set();
    const re1 = /["'`](\/[a-zA-Z][a-zA-Z0-9\-_\/]{3,})["'`]/g;
    let m;
    while ((m = re1.exec(d)) !== null) paths.add(m[1]);
    console.log('API paths:');
    [...paths].filter(p => !p.includes('assets') && !p.includes('.js') && !p.includes('.css')).forEach(u => console.log('  ' + u));

    // Look for baseURL
    const baseUrlRe = /(?:baseURL|baseUrl|base_url|BASE_URL|apiUrl|API_URL)\s*[:=]\s*["'`]([^"'`]+)["'`]/g;
    while ((m = baseUrlRe.exec(d)) !== null) console.log('Base URL:', m[1]);

    // Find the API configuration section
    const axiosIdx = d.indexOf('axios');
    if (axiosIdx !== -1) {
      console.log('\nContext around axios:');
      console.log(d.substring(Math.max(0, axiosIdx-100), axiosIdx+500));
    }
  }

  // Now check if there is FX data embedded in the CN FX page HTML itself
  console.log('\n\n=== Checking CN FX page HTML for embedded rate data ===');
  const cnFxPage = await httpsGet('https://www.sc.com/cn/foreign-exchange/', 'https://www.sc.com/cn/');
  if (cnFxPage.status === 200) {
    const html = cnFxPage.body;
    // Look for any rate data embedded in the HTML
    const rateDataPatterns = [
      /(?:rate|汇率|兑换)[^<]{0,50}(?:\d+\.\d+)[^<]{0,50}/gi,
      /(?:CNY|USD|EUR|GBP|JPY|AUD|CAD|CHF|HKD)[^<]{0,100}/g,
    ];
    for (const pat of rateDataPatterns) {
      const matches = html.match(pat) || [];
      if (matches.length > 0) {
        console.log('\nRate data in HTML:');
        matches.slice(0, 10).forEach(m => console.log('  ' + m.substring(0, 200)));
      }
    }

    // Look for any data-* attributes with rate info
    const dataAttrs = html.match(/data-[a-z\-]*rate[^>]*/gi) || [];
    if (dataAttrs.length > 0) {
      console.log('\nRate data attributes:', dataAttrs);
    }

    // Look for JSON-LD or script tags with data
    const jsonScripts = html.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    console.log('\nJSON script tags found:', jsonScripts.length);
    jsonScripts.forEach(s => console.log(s.substring(0, 300)));

    // Check for any wp-json API (it's a WordPress site)
    const wpJsonRe = /["'](\/wp-json\/[^"']+)["']/g;
    const wpPaths = new Set();
    let mm;
    while ((mm = wpJsonRe.exec(html)) !== null) wpPaths.add(mm[1]);
    if (wpPaths.size > 0) {
      console.log('\nWordPress JSON API paths:', [...wpPaths]);
    }
  }

  // Try the WordPress REST API
  console.log('\n\n=== Trying WordPress REST API ===');
  const wpApis = [
    'https://www.sc.com/cn/wp-json/',
    'https://www.sc.com/cn/wp-json/wp/v2/',
    'https://www.sc.com/cn/wp-json/wp/v2/posts/?categories=foreign-exchange',
    'https://www.sc.com/hk/wp-json/',
    'https://www.sc.com/hk/wp-json/wp/v2/',
  ];
  for (const url of wpApis) {
    const r = await httpsGet(url);
    console.log(`[${r.status}] ${url}`);
    if (r.status === 200) {
      const ct = r.headers['content-type'] || '';
      console.log(`  CT: ${ct}`);
      console.log(`  Body: ${r.body.substring(0, 400)}`);
    }
  }

  // Try sc.com REST API pattern (common for CMS sites)
  console.log('\n\n=== Trying common REST patterns ===');
  const restApis = [
    'https://www.sc.com/cn/wp-json/acf/v3/pages',
    'https://www.sc.com/cn/wp-json/acf/v3/posts',
    'https://www.sc.com/cn/wp-json/scb/v1/rates',
    'https://www.sc.com/cn/wp-json/scb/v1/fx',
    'https://www.sc.com/cn/wp-json/scb/v1/exchange-rates',
  ];
  for (const url of restApis) {
    const r = await httpsGet(url);
    console.log(`[${r.status}] ${url}`);
    if (r.status === 200) {
      console.log(`  Body: ${r.body.substring(0, 300)}`);
    }
  }

  console.log('\nDone.');
})();
