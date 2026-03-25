const https = require('https');

function httpsGet(url, headers = {}) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        ...headers,
      },
      timeout: 15000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', e => resolve({ status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

(async () => {
  // Fetch openbanking.sc.com and look for JS files with API spec
  const ob = await httpsGet('https://openbanking.sc.com/');
  if (ob.status === 200) {
    console.log('openbanking.sc.com loaded');
    // Find JS files
    const jsRe = /src=["']([^"']+\.js[^"']*)["']/g;
    let m;
    const jsFiles = [];
    while ((m = jsRe.exec(ob.body)) !== null) jsFiles.push(m[1]);
    console.log('JS files:', jsFiles);

    // Find any API spec links
    const apiLinks = ob.body.match(/["'](\/api[^"']+)["']/g) || [];
    console.log('API links in HTML:', apiLinks.slice(0, 20));
  }

  // Try SC Open Banking API v3.1 (UK Open Banking standard)
  console.log('\n=== Trying Open Banking v3.1 endpoints ===');
  const obEndpoints = [
    'https://openbanking.sc.com/open-banking/v3.1/products',
    'https://openbanking.sc.com/open-banking/v3.1/atms',
    'https://openbanking.sc.com/open-banking/v3.1/branches',
    'https://openbanking.sc.com/api/products',
    'https://openbanking.sc.com/api/rates',
    'https://openbanking.sc.com/api/fx-rates',
    'https://openbanking.sc.com/v1/fx-rates',
    'https://openbanking.sc.com/v1/rates',
  ];

  for (const url of obEndpoints) {
    const r = await httpsGet(url);
    console.log(`[${r.status}] ${url}`);
    if (r.status === 200) {
      console.log(`  CT: ${r.headers['content-type']}`);
      console.log(`  Body: ${r.body.substring(0, 400)}`);
    }
  }

  // Check if there's a Swagger/OpenAPI spec
  console.log('\n=== Checking for API documentation/spec files ===');
  const specUrls = [
    'https://openbanking.sc.com/swagger.json',
    'https://openbanking.sc.com/openapi.json',
    'https://openbanking.sc.com/api-docs',
    'https://openbanking.sc.com/v2/api-docs',
    'https://api.sc.com/swagger.json',
    'https://api.sc.com/openapi.json',
    'https://api.sc.com/v1/swagger.json',
    'https://api.sc.com/retail/v1/swagger.json',
  ];

  for (const url of specUrls) {
    const r = await httpsGet(url);
    if (r.status !== 'ERROR' && r.status !== 'TIMEOUT') {
      console.log(`[${r.status}] ${url}`);
      if (r.status === 200) {
        console.log(`  CT: ${r.headers['content-type']}`);
        console.log(`  Body: ${r.body.substring(0, 500)}`);
      }
    }
  }

  // Try the SC Nexus/retail API
  console.log('\n=== Checking retail.sc.com ===');
  const retailR = await httpsGet('https://retail.sc.com/');
  console.log(`retail.sc.com: [${retailR.status}]`);
  if (retailR.status === 200) {
    console.log(retailR.body.substring(0, 300));
    // Find script files
    const scripts = (retailR.body.match(/src=["']([^"']+\.js[^"']*)["']/g) || []).map(m => m.replace(/src=["']/,'').replace(/["']$/,''));
    console.log('Scripts:', scripts.slice(0, 10));
  }

  // Try SC mobile API endpoints (used by mobile app)
  console.log('\n=== Checking SC mobile/retail API ===');
  const mobileApis = [
    'https://retail.sc.com/api/v1/rates/fx',
    'https://retail.sc.com/api/v1/fx-rates',
    'https://retail.sc.com/api/products/fx',
    'https://retail.sc.com/api/rates',
    'https://scb-api.sc.com/fx/rates',
    'https://scb-api.sc.com/v1/fx/rates',
  ];
  for (const url of mobileApis) {
    const r = await httpsGet(url);
    if (r.status !== 'ERROR' && r.status !== 'TIMEOUT') {
      console.log(`[${r.status}] ${url}`);
      if (r.status === 200) console.log(`  Body: ${r.body.substring(0, 300)}`);
    }
  }

  console.log('\nDone.');
})();
