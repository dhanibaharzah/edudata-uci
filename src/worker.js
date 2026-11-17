// EduData UCI Live — Cloudflare Worker
// Menyajikan dashboard (HTML statis) + proxy /api/* ke API Indonesia dengan:
//  - allowlist path & parameter (GET/HEAD saja)
//  - kunci API ditambahkan di server (tidak pernah dikirim ke browser)
//  - cache KV (TTL panjang) + cache memori per-isolate
//  - pembatas jumlah panggilan upstream per hari (hemat kredit)
import HTML from './index.html';

const UPSTREAM = 'https://use.apiindonesia.id';
const DAY = 86400;

// Aturan per endpoint: regex path, parameter yang diizinkan (dengan validator), per_page maks, TTL cache
const NUM = /^\d{1,6}$/;
const CODE = /^\d{2,13}$/;
const TEXT = /^[\p{L}\p{N} .,'()\-\/&]{2,60}$/u;
const RULES = [
  { re: /^\/api\/v1\/wilayah\/provinsi$/, params: { page: NUM, per_page: NUM }, max: 100, ttl: 30 * DAY },
  { re: /^\/api\/v1\/wilayah\/provinsi\/\d{2}\/kabupaten$/, params: { page: NUM, per_page: NUM }, max: 100, ttl: 30 * DAY },
  { re: /^\/api\/v1\/sekolah$/, params: { provinsi_id: CODE, kabupaten_id: CODE, jenis: /^(SD|SMP|SMA|SMK|SLB)$/, status: /^(Negeri|Swasta)$/, accreditation: /^(A|B|C)$/, q: TEXT, page: NUM, per_page: NUM }, max: 200, ttl: 7 * DAY },
  { re: /^\/api\/v1\/sekolah\/search$/, params: { q: TEXT }, ttl: 7 * DAY, required: ['q'] },
  { re: /^\/api\/v1\/sekolah\/\d{8}$/, params: {}, ttl: 7 * DAY },
  { re: /^\/api\/v1\/kampus$/, params: { province: CODE, regency: CODE, group: /^(PTN|PTS|PTA|PTK)$/, type: /^(universitas|institut|politeknik|akademi|sekolah_tinggi)$/, q: TEXT, page: NUM, per_page: NUM }, max: 200, ttl: 7 * DAY },
  { re: /^\/api\/v1\/beasiswa$/, params: { jenjang: /^(SMA|D3|D4|S1|S2|S3|non-gelar)$/, lokasi: /^(dalam_negeri|luar_negeri)$/, status: /^(dibuka|segera_dibuka|ditutup|belum_diumumkan)$/, jenis: /^[a-z_]{3,30}$/, page: NUM, per_page: NUM }, max: 100, ttl: 6 * 3600 },
];

const mem = new Map(); // cache L1 per isolate (bukan state per-request)
const MEM_MAX = 300;

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra },
  });
}

function normalize(url) {
  const rule = RULES.find((r) => r.re.test(url.pathname));
  if (!rule) return { error: 'Path tidak diizinkan', status: 404 };
  const out = new URLSearchParams();
  const keys = [...new Set([...url.searchParams.keys()])].sort();
  for (const k of keys) {
    const v = url.searchParams.get(k).trim();
    if (v === '') continue;
    const re = rule.params[k];
    if (!re) return { error: `Parameter tidak diizinkan: ${k}`, status: 400 };
    if (!re.test(v)) return { error: `Nilai parameter tidak valid: ${k}`, status: 400 };
    if (k === 'per_page' && rule.max) out.set(k, String(Math.min(Math.max(1, +v), rule.max)));
    else out.set(k, v);
  }
  for (const r of rule.required || []) if (!out.has(r)) return { error: `Parameter wajib: ${r}`, status: 400 };
  const qs = out.toString();
  return { rule, path: url.pathname + (qs ? '?' + qs : '') };
}

async function getKey(env) {
  if (env.APIINDONESIA_API_KEY) return env.APIINDONESIA_API_KEY; // Worker secret (disarankan)
  return env.CACHE ? await env.CACHE.get('cfg:apikey') : null;    // fallback: disimpan sekali via /__setup
}

function today() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); } // tanggal WIB

async function proxy(request, env, ctx, url) {
  const n = normalize(url);
  if (n.error) return json({ success: false, error: n.error }, n.status);
  const cacheKey = 'c:' + n.path;

  const m = mem.get(cacheKey);
  if (m && m.exp > Date.now()) return new Response(m.body, { headers: hdr(n.rule.ttl, 'MEM', m.status) });

  let cached = { value: null };
  try { cached = await env.CACHE.getWithMetadata(cacheKey); } catch (e) { console.log(JSON.stringify({ evt: 'kv_read_fail' })); }
  if (cached.value !== null) {
    remember(cacheKey, cached.value, 200);
    return new Response(cached.value, { headers: hdr(n.rule.ttl, 'KV', 200) });
  }
  // Mode "cache-only": dipakai frontend untuk mengecek apakah data sudah ter-cache tanpa memakai kredit
  if (request.headers.get('x-edudata-cache-only') === '1') {
    return json({ success: false, error: 'Belum ter-cache', code: 'CACHE_MISS' }, 404, { 'x-edudata-cache': 'MISS-ONLY' });
  }

  // batas harian panggilan upstream: tiap isolate menulis hitungannya sendiri (tanpa tabrakan tulis),
  // total = jumlah semua isolate (dibaca lewat list + metadata). Perkiraan, cukup untuk rem kredit.
  const limit = +(env.DAILY_UPSTREAM_LIMIT || 300);
  const used = await usedToday(env);
  if (used >= limit) {
    return json({ success: false, error: 'Kuota harian panggilan API Indonesia untuk dashboard ini sudah habis. Data yang sudah ter-cache tetap tampil; coba lagi besok.', code: 'DAILY_BUDGET' }, 429);
  }

  const key = await getKey(env);
  if (!key) return json({ success: false, error: 'Kunci API belum dikonfigurasi di server.' }, 503);

  let res;
  try {
    res = await fetch(UPSTREAM + n.path, { headers: { 'x-api-key': key, accept: 'application/json', 'user-agent': 'edudata-uci-worker/1.0' } });
  } catch (e) {
    return json({ success: false, error: 'Gagal menghubungi API Indonesia' }, 502);
  }
  const body = await res.text();
  if (!res.ok) {
    console.log(JSON.stringify({ evt: 'upstream_error', status: res.status, path: n.path }));
    // jangan teruskan detail upstream mentah; cukup status + pesan singkat
    let msg = 'Upstream error';
    try { const j = JSON.parse(body); msg = j?.error?.message || j?.message || msg; } catch {}
    return json({ success: false, error: String(msg).slice(0, 200), upstream_status: res.status }, res.status === 404 ? 404 : res.status === 429 ? 429 : 502);
  }
  ctx.waitUntil((async () => {
    try { await env.CACHE.put(cacheKey, body, { expirationTtl: n.rule.ttl, metadata: { t: Date.now() } }); } catch (e) { console.log(JSON.stringify({ evt: 'kv_put_fail', path: n.path })); }
    await bumpBudget(env);
  })());
  console.log(JSON.stringify({ evt: 'upstream_call', path: n.path, used: used + 1 }));
  remember(cacheKey, body, 200);
  return new Response(body, { headers: hdr(n.rule.ttl, 'MISS', 200) });
}

const isoCount = {}; // tanggal -> jumlah panggilan upstream oleh isolate ini
// Hitungan harian disimpan di SATU key KV per hari (1 read per panggilan, 1 write per upstream call).
// Semua akses KV dibungkus try/catch: bila kuota KV harian habis, dashboard tetap jalan (fail-open ke hitungan isolate).
async function usedToday(env) {
  const local = isoCount[today()] || 0;
  try {
    const v = await env.CACHE.get('budget:' + today());
    return Math.max(+(v || 0), local);
  } catch (e) {
    console.log(JSON.stringify({ evt: 'kv_budget_read_fail', msg: String(e).slice(0, 120) }));
    return local;
  }
}
async function bumpBudget(env) {
  const d = today();
  isoCount[d] = (isoCount[d] || 0) + 1;
  try {
    const cur = +((await env.CACHE.get('budget:' + d)) || 0);
    await env.CACHE.put('budget:' + d, String(Math.max(cur, isoCount[d] - 1) + 1), { expirationTtl: 3 * DAY });
  } catch {}
}

function remember(k, body, status) {
  if (mem.size >= MEM_MAX) mem.delete(mem.keys().next().value);
  mem.set(k, { body, status, exp: Date.now() + 10 * 60e3 });
}

function hdr(ttl, src, status) {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=${Math.min(ttl, 3600)}`,
    'x-edudata-cache': src,
    'x-content-type-options': 'nosniff',
    'access-control-allow-origin': '*',
  };
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Endpoint satu kali untuk menyimpan kunci API ke KV bila Worker secret belum bisa dipasang.
// Hanya aktif bila var SETUP_TOKEN_SHA256 diset; setelah dipakai, deploy ulang tanpa var tsb.
async function setup(request, env) {
  if (!env.SETUP_TOKEN_SHA256 || request.method !== 'POST') return new Response('Not found', { status: 404 });
  const tok = request.headers.get('x-setup-token') || '';
  const a = new TextEncoder().encode(await sha256hex(tok));
  const b = new TextEncoder().encode(env.SETUP_TOKEN_SHA256);
  if (a.byteLength !== b.byteLength || !crypto.subtle.timingSafeEqual(a, b)) return new Response('Forbidden', { status: 403 });
  const key = (await request.text()).trim();
  if (!/^aip_[A-Za-z0-9_\-]{10,200}$/.test(key)) return json({ ok: false, error: 'format kunci tidak dikenal' }, 400);
  await env.CACHE.put('cfg:apikey', key);
  return json({ ok: true });
}

// ---------- Turnstile + sesi bertanda tangan (HMAC) ----------
const SESSION_COOKIE = 'eds';
const SESSION_TTL = 3 * 3600; // detik

function turnstileOn(env) { return !!(env.TURNSTILE_SITEKEY && env.TURNSTILE_SECRET); }

async function hmacKey(env) {
  let raw = env.SESSION_HMAC_KEY;
  if (!raw) {
    raw = await env.CACHE.get('cfg:hmac');
    if (!raw) {
      const b = crypto.getRandomValues(new Uint8Array(32));
      raw = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      await env.CACHE.put('cfg:hmac', raw);
    }
  }
  return crypto.subtle.importKey('raw', new TextEncoder().encode(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

async function signSession(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = `v1.${exp}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(payload));
  return `${payload}.${b64u(sig)}`;
}
async function validSession(request, env) {
  const c = request.headers.get('cookie') || '';
  const m = c.match(/(?:^|;\s*)eds=([^;]+)/);
  if (!m) return false;
  const parts = m[1].split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const exp = +parts[1];
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(env), unb64u(parts[2]), new TextEncoder().encode(`v1.${exp}`));
  } catch { return false; }
}

async function createSession(request, env, url) {
  if (!turnstileOn(env)) return json({ ok: true, turnstile: false });
  let token = '';
  try { token = String((await request.json())?.token || ''); } catch {}
  if (!token || token.length > 2048) return json({ ok: false, error: 'Token Turnstile kosong' }, 400);
  const allowed = new Set(String(env.TURNSTILE_HOSTNAMES || url.hostname).split(',').map((h) => h.trim()).filter(Boolean));
  let result;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get('cf-connecting-ip') || undefined, idempotency_key: crypto.randomUUID() }),
    });
    if (!r.ok) throw new Error('siteverify ' + r.status);
    result = await r.json();
  } catch (e) {
    return json({ ok: false, error: 'Verifikasi Turnstile gagal (jaringan)' }, 502); // fail closed
  }
  const expectAction = env.TURNSTILE_EXPECT_ACTION ?? 'edudata'; // default ketat; hanya dikosongkan untuk uji lokal dgn test key
  if (!result.success || (expectAction && result.action !== expectAction) || !allowed.has(result.hostname)) {
    console.log(JSON.stringify({ evt: 'turnstile_reject', codes: result['error-codes'], action: result.action, hostname: result.hostname }));
    return json({ ok: false, error: 'Verifikasi Turnstile ditolak' }, 403);
  }
  const val = await signSession(env);
  return json({ ok: true, expires_in: SESSION_TTL }, 200, {
    'set-cookie': `${SESSION_COOKIE}=${val}; Path=/api; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Strict`,
  });
}

// Pembatas per-IP lokal (per isolate) sebagai lapisan tambahan di samping binding Rate Limiting.
const RL_LOCAL = new Map();
const RL_MAX = 300, RL_WINDOW = 60e3;
function localLimit(ip) {
  const now = Date.now();
  let e = RL_LOCAL.get(ip);
  if (!e || now - e.t > RL_WINDOW) { e = { t: now, n: 0 }; if (RL_LOCAL.size > 5000) RL_LOCAL.clear(); RL_LOCAL.set(ip, e); }
  return ++e.n <= RL_MAX;
}

export default {
  async fetch(request, env, ctx) {
    try { return await handle(request, env, ctx); }
    catch (e) {
      console.log(JSON.stringify({ evt: 'unhandled', msg: String(e?.message || e).slice(0, 200) }));
      return json({ success: false, error: 'Kesalahan server sementara. Coba lagi sebentar.', code: 'SERVER_ERROR' }, 500);
    }
  },
};

async function handle(request, env, ctx) {
  {
    const url = new URL(request.url);
    if (url.pathname === '/__setup') return setup(request, env);
    if (url.pathname.startsWith('/api/')) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      let ok = localLimit(ip);
      if (ok && env.RL) ({ success: ok } = await env.RL.limit({ key: ip }));
      if (!ok) return json({ success: false, error: 'Terlalu banyak permintaan, coba lagi sebentar.', code: 'RATE_LIMIT' }, 429, { 'retry-after': '60' });
    }
    if (url.pathname === '/api/session' && request.method === 'POST') return createSession(request, env, url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ success: false, error: 'Method not allowed' }, 405, { allow: 'GET, HEAD' });
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const page = HTML.replace('__TURNSTILE_SITEKEY__', turnstileOn(env) ? env.TURNSTILE_SITEKEY : '');
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
    }
    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=86400' } });
    if (url.pathname === '/api/health') {
      const used = await usedToday(env);
      return json({ ok: true, key_configured: !!(await getKey(env)), turnstile: turnstileOn(env), upstream_calls_today: used, daily_limit: +(env.DAILY_UPSTREAM_LIMIT || 300) });
    }
    if (url.pathname.startsWith('/api/v1/')) {
      if (turnstileOn(env) && !(await validSession(request, env))) {
        return json({ success: false, error: 'Sesi tidak valid. Muat ulang halaman untuk verifikasi Turnstile.', code: 'SESSION_REQUIRED' }, 403);
      }
      return proxy(request, env, ctx, url);
    }
    return new Response('Not found', { status: 404 });
  }
}
