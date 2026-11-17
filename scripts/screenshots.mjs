// Ambil screenshot tiap halaman (butuh: npm i puppeteer-core, Google Chrome). Pakai: U=https://<url> node scripts/screenshots.mjs
// Catatan: bila Turnstile aktif, browser headless biasanya mendapat tantangan interaktif sehingga data tidak termuat.
import puppeteer from 'puppeteer-core';
const U = process.env.U, OUT = process.env.OUT || '/workspace/edudata-live/screenshots';
const pages = (process.env.PAGES || 'beranda,pemerataan,dikti,earlywarning,sekolah,explorer,partisipasi,analisis-data').split(',');
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: process.env.HEADFUL ? false : 'new', args: ['--no-sandbox', '--window-size=1440,1000'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const api = []; p.on('response', r => { if (r.url().includes('/api/')) api.push(r.status() + ' ' + (r.headers()['x-edudata-cache'] || '') + ' ' + r.url().split('/api/')[1].slice(0, 70)); });
await p.goto(U + '/', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise(r => setTimeout(r, 8000));
for (const id of pages) {
  await p.evaluate(i => showPage(i), id);
  await new Promise(r => setTimeout(r, id === 'sekolah' ? 9000 : 2500));
  await p.screenshot({ path: `${OUT}/${process.env.PREFIX || ''}${id}.png`, fullPage: true });
  const txt = await p.evaluate(i => document.getElementById('page-' + i).innerText.slice(0, 300).replace(/\s+/g, ' '), id);
  console.log('==', id, '::', txt);
}
console.log('API statuses:', JSON.stringify(api.reduce((m, x) => { const k = x.split(' ').slice(0, 2).join(' '); m[k] = (m[k] || 0) + 1; return m; }, {})));
console.log('errors:', errs.slice(0, 10));
await b.close();
