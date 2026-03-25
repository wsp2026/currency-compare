const https = require('https');
const chunks = [];
https.get('https://wmapp.sc.com/assets/index.1768359303536.js', {
  headers: {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://wmapp.sc.com/'}
}, res => {
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const d = Buffer.concat(chunks).toString('utf8');

    // Find all https:// URLs in the file
    const urlRe = new RegExp('https?://[^\\s"\'`\\\\)},;]{10,}', 'g');
    const found = new Set();
    let m;
    while ((m = urlRe.exec(d)) !== null) {
      const u = m[0].replace(/[)},;'"]+$/, '');
      if (!u.includes('google') && !u.includes('adobe') && !u.includes('onetrust') &&
          !u.includes('localhost') && !u.includes('cdn') && !u.includes('jquery')) {
        found.add(u);
      }
    }
    console.log('All non-trivial https:// URLs found (' + found.size + '):');
    [...found].sort().forEach(u => console.log('  ' + u));

    // Find asset links (other JS chunks)
    const assets = d.match(/["']assets\/[^"']+\.js[^"']*["']/g) || [];
    console.log('\nChunked JS assets:', [...new Set(assets)].slice(0, 20));

    // Context around exchange
    const exchIdx = d.indexOf('exchange');
    if (exchIdx !== -1) {
      console.log('\nContext around "exchange":');
      console.log(d.substring(Math.max(0, exchIdx-100), exchIdx+300));
    }

    // Context around rate (first occurrence with more context)
    const rateIdx = d.indexOf('rate');
    if (rateIdx !== -1) {
      console.log('\nContext around "rate":');
      console.log(d.substring(Math.max(0, rateIdx-100), rateIdx+300));
    }
  });
}).on('error', e => console.error('ERR:', e.message));
