// Membuat kode deploy untuk Cloudflare API (dipakai saat deploy lewat konektor/API, bukan wrangler).
// Hasil: .deploy/deploy_code.js (diabaikan git). Var tambahan dibaca dari env: SITEKEY, SETUP_HASH.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const worker = readFileSync('src/worker.js', 'utf8');
const html = readFileSync('src/index.html', 'utf8');
const single = worker.replace("import HTML from './index.html';", 'const HTML = ' + JSON.stringify(html) + ';');
if (single === worker) throw new Error('import HTML tidak ditemukan');
const vars = { DAILY_UPSTREAM_LIMIT: '300', TURNSTILE_HOSTNAMES: 'edudata-uci.orbitkreasiindonesia.workers.dev', TURNSTILE_SITEKEY: process.env.SITEKEY ?? '0x4AAAAAAGEmRV1LZ51Y2OEv' };
if (process.env.SETUP_HASH) vars.SETUP_TOKEN_SHA256 = process.env.SETUP_HASH;
const metadata = {
  main_module: 'worker.js',
  compatibility_date: '2026-11-17',
  keep_bindings: ['secret_text'],
  observability: { enabled: true, traces: { enabled: true } },
  bindings: [
    { type: 'kv_namespace', name: 'CACHE', namespace_id: process.env.KV_ID },
    { type: 'ratelimit', name: 'RL', namespace_id: '1001', simple: { limit: 300, period: 60 } },
    ...Object.entries(vars).map(([name, text]) => ({ type: 'plain_text', name, text })),
  ],
};
const code = `async () => {
  const code = ${JSON.stringify(single)};
  const metadata = ${JSON.stringify(metadata)};
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('worker.js', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
  const r = await cloudflare.request({ method: 'PUT', path: \`/accounts/\${accountId}/workers/scripts/edudata-uci\`, body: form });
  const sub = await cloudflare.request({ method: 'POST', path: \`/accounts/\${accountId}/workers/scripts/edudata-uci/subdomain\`, body: { enabled: true, previews_enabled: false } });
  return { ok: r.success, id: r.result && r.result.id, etag: r.result && r.result.etag, bindings: metadata.bindings.map(b => b.name), subdomain: sub.result };
}`;
mkdirSync('.deploy', { recursive: true });
writeFileSync('.deploy/deploy_code.js', code);
console.log('deploy_code.js', code.length);
