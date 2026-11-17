/* ---------- Loader: wilayah ---------- */
async function loadProvinces() {
  const j = await api('wilayah/provinsi?per_page=100');
  LIVE.provinces = j.data.map(p => ({ id: p.id, name: p.name || p.alt_name, lat: p.lat, lng: p.lng }));
  LIVE.provinces.forEach(p => LIVE.provMap[p.id] = p);
}
async function loadKabupaten(provId) {
  if (LIVE.kab[provId]) return LIVE.kab[provId];
  const j = await api(`wilayah/provinsi/${provId}/kabupaten?per_page=100`);
  LIVE.kab[provId] = j.data.map(k => ({ id: k.id, name: k.name, type: k.type }));
  return LIVE.kab[provId];
}

/* ---------- Hitungan sekolah untuk filter aktif (4-5 panggilan) ---------- */
async function loadCounts(f = sekolahFilter()) {
  const key = filterKey(f);
  if (LIVE.counts[key]) return LIVE.counts[key];
  const base = { ...f, per_page: 1 };
  const parts = [['total', {}], ['A', { accreditation: 'A' }], ['B', { accreditation: 'B' }], ['C', { accreditation: 'C' }]];
  if (f.status === 'all') parts.push(['Negeri', { status: 'Negeri' }]);
  const out = {};
  await Promise.all(parts.map(async ([name, extra]) => {
    const j = await api('sekolah' + qs({ ...base, ...extra }));
    out[name] = j.meta?.total ?? 0;
    if (name === 'total' && j.data?.[0]) noteSchoolSource(j.data[0]);
  }));
  if (f.status === 'Negeri') out.Negeri = out.total; else if (f.status === 'Swasta') out.Negeri = 0;
  LIVE.counts[key] = out;
  return out;
}
function noteSchoolSource(rec) {
  if (rec && rec.source_name && !LIVE.schoolSource) LIVE.schoolSource = { name: rec.source_name, url: rec.source_url, synced: rec.source_synced_at };
}

/* ---------- Fan-out per wilayah (total + akreditasi A), cache dulu ---------- */
function fanKey(level, parent) { return [level, parent || '-', STATE.jenjang, STATE.status].join('|'); }
function fanUnits(level, parent) {
  if (level === 'prov') return LIVE.provinces.map(p => ({ id: p.id, name: shortProv(p.name), f: sekolahFilter({ prov: p.id, kab: 'all' }) }));
  return (LIVE.kab[parent] || []).map(k => ({ id: k.id, name: k.name.replace(/^Kabupaten /i, 'Kab. '), f: sekolahFilter({ prov: parent, kab: k.id }) }));
}
async function loadFan(level, parent, { allowUpstream = false } = {}) {
  const key = fanKey(level, parent);
  const st = LIVE.fan[key] || (LIVE.fan[key] = { rows: null, missing: null, loading: false });
  if (st.rows || st.loading) return st;
  st.loading = true; st.error = null;
  try {
    if (level === 'kab') await loadKabupaten(parent);
    if (level === 'prov' && !LIVE.provinces.length) await loadProvinces();
    const units = fanUnits(level, parent);
    let missing = 0;
    const rows = await Promise.all(units.map(async u => {
      const r = { id: u.id, name: u.name };
      for (const [name, extra] of [['total', {}], ['A', { accreditation: 'A' }]]) {
        const j = await api('sekolah' + qs({ ...u.f, per_page: 1, ...extra }), { cacheOnly: !allowUpstream });
        if (j.__miss) { missing++; r[name] = null; } else { r[name] = j.meta?.total ?? 0; if (j.data?.[0]) noteSchoolSource(j.data[0]); }
      }
      r.akredA = r.total && r.A ? pct(r.A, r.total) : null; // A=0 → kemungkinan besar data akreditasi kosong di sumber
      return r;
    }));
    if (missing) st.missing = missing; else { st.rows = rows; st.missing = 0; }
  } catch (e) { st.error = e; }
  st.loading = false;
  return st;
}
function fanControl(level, parent) {
  const st = LIVE.fan[fanKey(level, parent)];
  if (!st || st.loading) return loading('Memuat data per wilayah…');
  if (st.error) return errBox(st.error);
  if (st.rows) return '';
  const n = st.missing;
  return `<div class="empty-state">Data per ${level === 'prov' ? 'provinsi' : 'kab/kota'} untuk filter ini belum ter-cache (±${n} panggilan ≈ ${n * 2} kredit API Indonesia, lalu di-cache 7 hari).<br><br>
    <button class="btn btn-primary" onclick="fetchFan('${level}','${parent || ''}')">Muat data live</button></div>`;
}
async function fetchFan(level, parent) {
  delete LIVE.fan[fanKey(level, parent || null)];
  const p = loadFan(level, parent || null, { allowUpstream: true });
  rerender(); await p; rerender();
}

/* ---------- Kampus (gabungan semua halaman, cache dulu) ---------- */
async function loadKampus({ allowUpstream = false } = {}) {
  if (LIVE.kampus || LIVE.kampusLoading) return;
  LIVE.kampusLoading = true; LIVE.kampusError = null;
  try {
    const first = await api('kampus?per_page=200&page=1', { cacheOnly: !allowUpstream });
    if (first.__miss) { LIVE.kampusMissing = 22; LIVE.kampusLoading = false; return; }
    const pages = first.meta?.total_pages || 1;
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => api(`kampus?per_page=200&page=${i + 2}`, { cacheOnly: !allowUpstream })));
    const miss = rest.filter(r => r.__miss).length;
    if (miss) LIVE.kampusMissing = miss;
    else { LIVE.kampus = [first, ...rest].flatMap(r => r.data); LIVE.kampusMissing = 0; }
  } catch (e) { LIVE.kampusError = e; }
  LIVE.kampusLoading = false;
}
async function fetchKampus() { LIVE.kampusMissing = null; const p = loadKampus({ allowUpstream: true }); rerender(); await p; rerender(); }
function kampusControl() {
  if (LIVE.kampusLoading) return loading('Memuat data perguruan tinggi…');
  if (LIVE.kampusError) return errBox(LIVE.kampusError);
  if (LIVE.kampusMissing) return `<div class="empty-state">Daftar perguruan tinggi belum ter-cache (±${LIVE.kampusMissing} panggilan ≈ ${LIVE.kampusMissing * 2} kredit, lalu di-cache 7 hari).<br><br><button class="btn btn-primary" onclick="fetchKampus()">Muat data live</button></div>`;
  return '';
}
function kampusFiltered() {
  if (!LIVE.kampus) return null;
  return LIVE.kampus.filter(k => (STATE.provinsi === 'all' || k.province_id === STATE.provinsi) && (STATE.kabupaten === 'all' || k.regency_id === STATE.kabupaten));
}
function kampusByProv() {
  const m = {}; LIVE.provinces.forEach(p => m[p.id] = { id: p.id, name: shortProv(p.name), total: 0, PTN: 0, PTS: 0, PTA: 0, PTK: 0 });
  let nullProv = 0;
  (LIVE.kampus || []).forEach(k => { const r = m[k.province_id]; if (!r) { nullProv++; return; } r.total++; if (r[k.kelompok] !== undefined) r[k.kelompok]++; });
  return { rows: Object.values(m), nullProv };
}
function countBy(arr, f) { const m = {}; (arr || []).forEach(x => { const k = f(x) ?? '(kosong)'; m[k] = (m[k] || 0) + 1; }); return m; }

/* ---------- Beasiswa ---------- */
async function loadBeasiswa() {
  if (LIVE.beasiswa) return;
  const j = await api('beasiswa?per_page=100');
  LIVE.beasiswa = j.data; LIVE.beasiswaMeta = j.meta;
}
const BS_STATUS = { dibuka: ['Dibuka', 'badge-green'], segera_dibuka: ['Segera dibuka', 'badge-blue'], ditutup: ['Ditutup', 'badge-gray'], belum_diumumkan: ['Belum diumumkan', 'badge-yellow'] };
function bsBadge(s) { const [t, c] = BS_STATUS[s] || [s, 'badge-gray']; return `<span class="badge ${c}">${t}</span>`; }
function bsAttribution() {
  const a = LIVE.beasiswaMeta?.attribution; if (!a) return 'API Indonesia /api/v1/beasiswa';
  return `${esc(a.source)} · disusun oleh API Indonesia (<a href="${esc(a.attribution_page)}" target="_blank" rel="noopener">atribusi</a>). ${esc(a.notice || '')}`;
}
function beasiswaRelevant() {
  let list = LIVE.beasiswa || [];
  if (STATE.jenjang === 'SMA' || STATE.jenjang === 'SMK') list = list.filter(b => (b.jenjang || []).some(x => ['D3', 'D4', 'S1'].includes(x)));
  return list;
}

/* ---------- Orkestrasi muat data sesuai filter ---------- */
let renderTimer = null;
function rerender() { clearTimeout(renderTimer); renderTimer = setTimeout(() => renderAllPages(), 60); }
async function refreshData() {
  const tasks = [
    loadCounts().catch(e => LIVE.errors.push(e)),
    loadBeasiswa().catch(e => { LIVE.beasiswaError = e; }),
    loadKampus().catch(() => {}),
    loadFan('prov', null),
  ];
  if (STATE.provinsi !== 'all') tasks.push(loadFan('kab', STATE.provinsi));
  rerender();
  await Promise.all(tasks.map(t => t.then(rerender)));
  rerender();
}

/* ---------- Konteks data untuk AI (dari data LIVE) ---------- */
function buildDataContext() {
  const L = [];
  L.push('KONTEKS DATA DASHBOARD PENDIDIKAN INDONESIA — DATA LIVE API INDONESIA');
  L.push(`Wilayah: ${regionLabel()} | Jenjang: ${STATE.jenjang === 'all' ? 'Semua (SD/SMP/SMA/SMK/SLB)' : STATE.jenjang} | Status: ${STATE.status === 'all' ? 'Negeri & Swasta' : STATE.status} | Diambil: ${new Date().toLocaleDateString('id-ID')}`);
  L.push('Catatan: indikator APK, APM, Skor AN, ATS, PISA, rasio guru, anggaran, kualifikasi guru TIDAK tersedia di data live ini.');
  const c = LIVE.counts[filterKey(sekolahFilter())];
  if (c) {
    const tt = c.total - c.A - c.B - c.C;
    L.push('', '=== SEKOLAH (filter aktif) ===');
    L.push(`Total sekolah: ${c.total}; Akreditasi A: ${c.A} (${fmt(pct(c.A, c.total))}%), B: ${c.B} (${fmt(pct(c.B, c.total))}%), C: ${c.C} (${fmt(pct(c.C, c.total))}%), tanpa data akreditasi: ${tt} (${fmt(pct(tt, c.total))}%); Negeri: ${c.Negeri ?? '-'}`);
  }
  const fp = LIVE.fan[fanKey('prov', null)]?.rows;
  const kp = LIVE.kampus ? kampusByProv() : null;
  if (fp) {
    L.push('', '=== PER PROVINSI (jumlah sekolah, % akreditasi A' + (kp ? ', jumlah PT, PTN' : '') + ') ===');
    fp.forEach(r => { const k = kp?.rows.find(x => x.id === r.id); L.push(`${r.name}: sekolah ${r.total}, akreditasi A ${r.akredA === null ? 'tidak ada data (0 sekolah tercatat A)' : fmt(r.akredA) + '%'}${k ? `, PT ${k.total}, PTN ${k.PTN}, sekolah per PT ${k.total ? fmt(r.total / k.total) : '-'}` : ''}`); });
  }
  const fk = STATE.provinsi !== 'all' ? LIVE.fan[fanKey('kab', STATE.provinsi)]?.rows : null;
  if (fk) { L.push('', `=== PER KAB/KOTA di ${provName(STATE.provinsi)} ===`); fk.forEach(r => L.push(`${r.name}: sekolah ${r.total}, akreditasi A ${r.akredA === null ? 'tidak ada data' : fmt(r.akredA) + '%'}`)); }
  if (LIVE.kampus) {
    const g = countBy(LIVE.kampus, k => k.kelompok);
    L.push('', '=== PENDIDIKAN TINGGI (nasional) ===');
    L.push(`Total PT aktif: ${LIVE.kampus.length}; ${Object.entries(g).map(([k, v]) => `${k} ${v}`).join(', ')}; tanpa kode provinsi: ${kp.nullProv}`);
  }
  if (LIVE.beasiswa) {
    L.push('', '=== BEASISWA (status per hari ini, WIB) ===');
    LIVE.beasiswa.filter(b => ['dibuka', 'segera_dibuka'].includes(b.status_pendaftaran)).forEach(b => L.push(`${b.nama} — ${b.status_pendaftaran}, jenjang ${(b.jenjang || []).join('/')}, ${b.lokasi_studi}, tutup ${b.periode_aktif?.tutup || '-'}`));
    const sc = countBy(LIVE.beasiswa, b => b.status_pendaftaran);
    L.push(`Ringkasan status ${LIVE.beasiswa.length} program: ${Object.entries(sc).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
  return L.join('\n');
}
