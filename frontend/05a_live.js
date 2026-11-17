/* ============================================================
   LIVE DATA LAYER — API Indonesia via Worker proxy (/api/v1/*)
   Kunci API TIDAK pernah ada di browser; semua lewat Worker.
   ============================================================ */
const STATE = { provinsi: 'all', kabupaten: 'all', jenjang: 'all', status: 'all' };
const LIVE = {
  provinces: [], provMap: {}, kab: {},
  counts: {},
  fan: {},
  kampus: null, kampusMissing: null, kampusLoading: false,
  beasiswa: null, beasiswaMeta: null,
  schoolSource: null,
  errors: [],
};
const SRC = {
  wilayah: 'Kode & nama wilayah Kemendagri via API Indonesia (/api/v1/wilayah)',
  sekolah: 'Data sekolah (NPSN) via API Indonesia /api/v1/sekolah — sumber menurut dokumentasi: referensi.data.kemdikbud.go.id',
  kampus: 'Data perguruan tinggi via API Indonesia /api/v1/kampus — ID record berawalan "pddikti-" (PDDikti)',
};
const TURNSTILE_SITEKEY = document.querySelector('meta[name="turnstile-sitekey"]')?.content || '';

/* ---------- Sesi Turnstile ---------- */
let sessionPromise = null;
function loadTurnstileScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('Gagal memuat Turnstile'));
    document.head.appendChild(s);
  });
}
function ensureSession(force = false) {
  if (!TURNSTILE_SITEKEY) return Promise.resolve();
  if (sessionPromise && !force) return sessionPromise;
  sessionPromise = (async () => {
    await loadTurnstileScript();
    const box = document.getElementById('ts-box');
    box.style.display = 'block';
    const token = await new Promise((resolve, reject) => {
      const holder = document.getElementById('ts-widget');
      holder.innerHTML = '';
      window.turnstile.render(holder, {
        sitekey: TURNSTILE_SITEKEY, action: 'edudata', appearance: 'interaction-only',
        callback: resolve, 'error-callback': () => reject(new Error('Verifikasi Turnstile gagal')),
        'expired-callback': () => reject(new Error('Token Turnstile kedaluwarsa')),
      });
    });
    const r = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }), credentials: 'same-origin' });
    box.style.display = 'none';
    if (!r.ok) throw new Error('Sesi ditolak server (' + r.status + ')');
  })();
  sessionPromise.catch(() => { sessionPromise = null; });
  return sessionPromise;
}

/* ---------- Fetch helper dengan memo + antrean (maks 4 paralel) ---------- */
const memo = new Map();
let active = 0; const queue = [];
function schedule(fn) {
  return new Promise((resolve, reject) => {
    const run = async () => { active++; try { resolve(await fn()); } catch (e) { reject(e); } finally { active--; if (queue.length) queue.shift()(); } };
    if (active < 4) run(); else queue.push(run);
  });
}
async function api(path, { cacheOnly = false } = {}) {
  if (cacheOnly && memo.has(path)) return memo.get(path);
  const k = (cacheOnly ? 'CO:' : '') + path;
  if (memo.has(k)) return memo.get(k);
  const p = schedule(async () => {
    await ensureSession();
    const doFetch = () => fetch('/api/v1/' + path, { headers: cacheOnly ? { 'x-edudata-cache-only': '1' } : {}, credentials: 'same-origin' });
    let r = await doFetch();
    if (r.status === 403) { const j = await r.clone().json().catch(() => ({})); if (j.code === 'SESSION_REQUIRED') { await ensureSession(true); r = await doFetch(); } }
    if (r.status === 404 && cacheOnly) { memo.delete(k); return { __miss: true }; }
    const j = await r.json().catch(() => ({ success: false, error: 'Respons tidak valid' }));
    if (!r.ok || j.success === false) { const e = new Error(j.error || ('HTTP ' + r.status)); e.code = j.code; e.status = r.status; throw e; }
    if (cacheOnly) memo.set(path, Promise.resolve(j));
    return j;
  });
  memo.set(k, p);
  p.catch(() => memo.delete(k));
  return p;
}
function qs(obj) { const u = new URLSearchParams(); Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== 'all') u.set(k, v); }); const s = u.toString(); return s ? '?' + s : ''; }
function sekolahFilter({ prov = STATE.provinsi, kab = STATE.kabupaten, jenjang = STATE.jenjang, status = STATE.status } = {}) {
  return { provinsi_id: prov, kabupaten_id: kab, jenis: jenjang, status };
}
function filterKey(f) { return JSON.stringify(f); }
function provName(id) { return LIVE.provMap[id]?.name || id; }
function shortProv(n) { return String(n).replace('Daerah Khusus Ibukota ', 'DKI ').replace('Daerah Istimewa ', 'DI ').replace('Kepulauan Bangka Belitung', 'Kep. Babel').replace('Nusa Tenggara Barat', 'NTB').replace('Nusa Tenggara Timur', 'NTT'); }
function regionLabel() {
  if (STATE.provinsi === 'all') return 'Nasional';
  const p = shortProv(provName(STATE.provinsi));
  if (STATE.kabupaten !== 'all') { const k = (LIVE.kab[STATE.provinsi] || []).find(x => x.id === STATE.kabupaten); return `${k ? k.name : STATE.kabupaten}, ${p}`; }
  return p;
}
function pct(a, b) { return b ? (a / b) * 100 : 0; }
function esc(s) { return escapeHtml(s ?? ''); }

/* ---------- Badge & atribusi ---------- */
function liveBadge() { return '<span class="badge badge-green" title="Data live dari API Indonesia">● LIVE</span>'; }
function dummyBadge() { return '<span class="badge badge-red" title="Angka contoh, bukan data resmi">CONTOH / DUMMY</span>'; }
function srcNote(text) { return `<div class="src-note">Sumber: ${text}</div>`; }
function notLiveBanner(sources) {
  return `<div class="notlive-banner"><b>⚠️ Data belum live</b> — indikator di halaman ini tidak tersedia di API Indonesia. Angka di bawah adalah <b>contoh (dummy)</b> dari prototipe v0.6, bukan data resmi. Sumber yang perlu diintegrasikan: ${sources}.</div>`;
}
function loading(msg = 'Memuat data live…') { return `<div class="empty-state"><span class="spinner"></span> ${msg}</div>`; }
function errBox(e) { return `<div class="chat-error">⚠️ ${esc(e?.message || e)}</div>`; }
