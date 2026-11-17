/* ============================================================
   RENDERERS — halaman BELUM LIVE (angka contoh berlabel jelas)
   ============================================================ */
function wrapDummy(html, sources) { return notLiveBanner(sources) + `<div class="dummy-zone">${html}</div>`; }
function renderPartisipasi() {
  let entries = Object.entries(DATA.partisipasiByJenjang);
  if (STATE.jenjang !== 'all') entries = entries.filter(([k]) => k === STATE.jenjang);
  return `<h2 class="page-title">Partisipasi & Akses ${dummyBadge()}</h2><p class="page-subtitle">APK & APM per jenjang.</p>` + wrapDummy(`
  <div class="grid grid-2">
    <div class="card"><div class="card-title">APK ${dummyBadge()}</div>${entries.length ? barChart(entries.map(([k, v]) => ({ label: k, value: v.apk, color: v.apk >= 95 ? '#059669' : v.apk >= 80 ? '#d97706' : '#dc2626' })), { max: 110, unit: '%' }) : '<div class="empty-state">—</div>'}</div>
    <div class="card"><div class="card-title">APM ${dummyBadge()}</div>${entries.length ? barChart(entries.map(([k, v]) => ({ label: k, value: v.apm, color: '#1e40af' })), { max: 110, unit: '%' }) : '<div class="empty-state">—</div>'}</div>
  </div>
  <div class="card mt-16"><div class="card-title">Tabel Provinsi (21 provinsi contoh) ${dummyBadge()}</div><div class="table-wrap"><table><thead><tr><th>Provinsi</th><th>APK</th><th>APM</th><th>Gap</th></tr></thead><tbody>
  ${[...DATA.provinces].sort((a, b) => b.apk - a.apk).map(p => `<tr><td>${p.name}</td><td>${fmt(p.apk)}%</td><td>${fmt(p.apm)}%</td><td>${fmt(p.apk - p.apm)}</td></tr>`).join('')}
  </tbody></table></div></div>`, 'BPS (Susenas) & Dapodik');
}
function renderMutu() {
  const k = DATA.mutuKompetensi;
  const d = (x) => `<div class="donut-wrap">${donutChart([{ value: x.dasar, color: '#dc2626' }, { value: x.menengah, color: '#d97706' }, { value: x.mahir, color: '#059669' }])}<div class="donut-legend"><div class="legend-item"><div class="legend-dot" style="background:#dc2626"></div>Dasar: ${x.dasar}%</div><div class="legend-item"><div class="legend-dot" style="background:#d97706"></div>Menengah: ${x.menengah}%</div><div class="legend-item"><div class="legend-dot" style="background:#059669"></div>Mahir: ${x.mahir}%</div></div></div>`;
  return `<h2 class="page-title">Mutu Pembelajaran ${dummyBadge()}</h2><p class="page-subtitle">Hasil belajar.</p>` + wrapDummy(`<div class="grid grid-2"><div class="card"><div class="card-title">Numerasi ${dummyBadge()}</div>${d(k.numerasi)}</div><div class="card"><div class="card-title">Literasi ${dummyBadge()}</div>${d(k.literasi)}</div></div>`, 'Rapor Pendidikan / Asesmen Nasional');
}
function renderGuru() {
  const gk = DATA.guruKualifikasi;
  return `<h2 class="page-title">Guru & Tendik ${dummyBadge()}</h2><p class="page-subtitle">SDM dikdasmen.</p>` + wrapDummy(`
  <div class="grid grid-2">
    <div class="card"><div class="card-title">Kualifikasi Guru ${dummyBadge()}</div>${barChart([{ label: 'S1', value: gk.S1, color: '#059669' }, { label: 'S2', value: gk.S2, color: '#3b82f6' }, { label: 'S3', value: gk.S3, color: '#1e40af' }, { label: 'Diploma', value: gk['Diploma'], color: '#d97706' }, { label: 'SMA', value: gk.SMA, color: '#dc2626' }], { max: 100, unit: '%' })}</div>
    <div class="card"><div class="card-title">Rasio per Jenjang ${dummyBadge()}</div>${barChart([{ label: 'SD/MI', value: 15, color: '#059669' }, { label: 'SMP/MTs', value: 13, color: '#059669' }, { label: 'SMA/MA', value: 12, color: '#059669' }, { label: 'SMK', value: 11, color: '#059669' }], { max: 20 })}</div>
  </div>
  <div class="card mt-16"><div class="card-title">Rasio per Provinsi ${dummyBadge()}</div>${heatmap('rasio', { invert: true, unit: ':1' })}</div>`, 'Dapodik (data guru & tendik)');
}
function renderPendanaan() {
  const a = DATA.anggaran;
  return `<h2 class="page-title">Pendanaan & Efisiensi ${dummyBadge()}</h2><p class="page-subtitle">Anggaran vs capaian.</p>` + wrapDummy(`
  <div class="grid grid-3">
    <div class="card"><div class="kpi-label">APBN 2025 (contoh)</div><div class="kpi-value">Rp ${fmt(a.total, 1)} T</div></div>
    <div class="card"><div class="kpi-label">Anggaran/Siswa (contoh)</div><div class="kpi-value">Rp ${fmt(a.perSiswa, 1)} jt</div></div>
    <div class="card"><div class="kpi-label">Realisasi (contoh)</div><div class="kpi-value">${fmt(a.realisasi, 1)}%</div></div>
  </div>
  <div class="card mt-16"><div class="card-title">Anggaran/Siswa vs Skor AN ${dummyBadge()}</div>
    <svg viewBox="0 0 500 300" style="width:100%;height:280px"><line x1="50" y1="250" x2="480" y2="250" stroke="#cbd5e1"/><line x1="50" y1="30" x2="50" y2="250" stroke="#cbd5e1"/><text x="260" y="285" text-anchor="middle" font-size="11" fill="#64748b">Anggaran per siswa (juta Rp)</text><text x="15" y="140" text-anchor="middle" font-size="11" fill="#64748b" transform="rotate(-90 15 140)">Skor AN</text>
    ${DATA.provinces.map(p => { const x = 50 + ((p.anggaran - 8) / (20 - 8)) * 430, y = 250 - ((p.an - 55) / (80 - 55)) * 220; return `<circle cx="${x}" cy="${y}" r="5" fill="${p.an >= 67 ? '#059669' : p.an >= 63 ? '#d97706' : '#dc2626'}" opacity="0.9"><title>${p.name}</title></circle>`; }).join('')}
    </svg></div>`, 'Kemenkeu (APBN/APBD), NPD, Rapor Pendidikan');
}
function renderATS() {
  const a = DATA.ats;
  return `<h2 class="page-title">Anak Tidak Sekolah ${dummyBadge()}</h2><p class="page-subtitle">Snapshot contoh.</p>` + wrapDummy(`
  <div class="grid grid-4">${[['Total ATS', a.total], ['BPB', a.bpb], ['DO', a.do], ['LTM', a.ltm]].map(([l, v]) => kpiCard(l, fmt(v / 1e6, 2), 'contoh', 'status-bad', 'jt')).join('')}</div>
  <div class="card mt-16"><div class="card-title">Konsentrasi ATS ${dummyBadge()}</div>${heatmap('ats', { invert: true, unit: '%' })}</div>`, 'Pusdatin Kemendikdasmen (data ATS), BPS');
}
function renderPISA() {
  const p = DATA.pisa;
  return `<h2 class="page-title">Benchmark PISA ${dummyBadge()}</h2><p class="page-subtitle">Angka contoh.</p>` + wrapDummy(`
  <div class="grid grid-3">${['matematika', 'membaca', 'sains'].map(sub => `<div class="card"><div class="card-title">${sub.charAt(0).toUpperCase() + sub.slice(1)} ${dummyBadge()}</div>${barChart([{ label: 'Indonesia', value: p.indonesia[sub], color: '#dc2626' }, { label: 'OECD', value: p.oecd[sub], color: '#1e40af' }], { max: 500 })}<div class="kpi-target mt-16" style="text-align:center">Gap: ${p.oecd[sub] - p.indonesia[sub]} poin</div></div>`).join('')}</div>
  <div class="card mt-16"><div class="card-title">Tren PISA ${dummyBadge()}</div>${lineChart(p.trenIndo.matematika, ['2012', '2015', '2018', '2022', '2025'], { color: '#dc2626', yMin: 350, yMax: 410 })}</div>`, 'OECD PISA');
}

/* ============================================================
   FILTER BINDING & INIT
   ============================================================ */
function updateFilterIndicator() {
  const parts = [];
  if (STATE.provinsi !== 'all') parts.push(regionLabel());
  if (STATE.jenjang !== 'all') parts.push(STATE.jenjang);
  if (STATE.status !== 'all') parts.push(STATE.status);
  const el = document.getElementById('filter-indicator');
  if (el) {
    if (!parts.length) el.style.display = 'none';
    else { el.style.display = 'inline-flex'; el.textContent = '🔍 ' + parts.join(' · '); }
  }
  const btn = document.getElementById('filter-toggle');
  if (btn) {
    btn.textContent = parts.length ? 'Filter (' + parts.length + ')' : 'Filter';
    btn.classList.toggle('is-active', parts.length > 0);
  }
}
async function fillKabupaten() {
  const sel = document.getElementById('filter-kabupaten');
  sel.innerHTML = '<option value="all">Semua Kab/Kota</option>';
  sel.disabled = true;
  if (STATE.provinsi === 'all') return;
  try { (await loadKabupaten(STATE.provinsi)).forEach(k => { const o = document.createElement('option'); o.value = k.id; o.textContent = k.name; sel.appendChild(o); }); sel.disabled = false; } catch (e) { console.warn(e); }
}
function onFilterChange() { updateFilterIndicator(); renderAllPages(true); refreshData(); }
function bindFilters() {
  const s = { provinsi: document.getElementById('filter-provinsi'), kabupaten: document.getElementById('filter-kabupaten'), jenjang: document.getElementById('filter-jenjang'), status: document.getElementById('filter-status') };
  s.provinsi.addEventListener('change', async e => { STATE.provinsi = e.target.value; STATE.kabupaten = 'all'; await fillKabupaten(); onFilterChange(); });
  s.kabupaten.addEventListener('change', e => { STATE.kabupaten = e.target.value; onFilterChange(); });
  s.jenjang.addEventListener('change', e => { STATE.jenjang = e.target.value; onFilterChange(); });
  s.status.addEventListener('change', e => { STATE.status = e.target.value; onFilterChange(); });
  document.getElementById('btn-reset').addEventListener('click', async () => {
    Object.assign(STATE, { provinsi: 'all', kabupaten: 'all', jenjang: 'all', status: 'all' });
    s.provinsi.value = 'all'; s.jenjang.value = 'all'; s.status.value = 'all'; await fillKabupaten(); onFilterChange();
  });
  document.getElementById('btn-export').addEventListener('click', exportCSV);
}
const PAGE_TITLES = { beranda: 'Beranda', partisipasi: 'Partisipasi', mutu: 'Mutu', pemerataan: 'Pemerataan', guru: 'Guru & Tendik', pendanaan: 'Pendanaan', ats: 'ATS', pisa: 'PISA', dikti: 'Pendidikan Tinggi', earlywarning: 'Early Warning', sekolah: 'Profil Sekolah', explorer: 'Data Explorer', 'analisis-data': 'Analisis Data', 'analisis-predefined': 'Pre-defined Analysis', 'analisis-lanjut': 'Analisis Lanjut' };
const RENDERERS = { beranda: renderBeranda, partisipasi: renderPartisipasi, mutu: renderMutu, pemerataan: renderPemerataan, guru: renderGuru, pendanaan: renderPendanaan, ats: renderATS, pisa: renderPISA, dikti: renderDikti, earlywarning: renderEarlyWarning, explorer: renderExplorer };
let sekolahRendered = false;
function renderAllPages(filterChanged = false) {
  Object.keys(RENDERERS).forEach(id => { const el = document.getElementById('page-' + id); if (el) { try { el.innerHTML = RENDERERS[id](); } catch (e) { el.innerHTML = errBox(e); console.error(e); } } });
  if (sekolahRendered && filterChanged) { SK.page = 1; loadSekolahList(); }
}
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id); if (page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${id}"]`); if (nav) nav.classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_TITLES[id] || id;
  if (id === 'sekolah' && !sekolahRendered) { page.innerHTML = renderSekolah(); bindSekolah(); sekolahRendered = true; }
  else if (id === 'sekolah' && MAP) setTimeout(() => MAP.invalidateSize(), 50);
  if (id === 'analisis-data' && !document.getElementById('analisis-data-chat')) renderAnalisisData();
  if (id === 'analisis-predefined' && !document.getElementById('predefined-chat')) renderPredefined();
  if (id === 'analisis-lanjut' && !document.getElementById('analisis-lanjut-chat')) renderAnalisisLanjut();
  if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
  closeNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function isMobileNav() { return window.matchMedia('(max-width: 768px)').matches; }
function closeNav() {
  document.body.classList.remove('nav-open');
  const btn = document.getElementById('nav-toggle');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  const ov = document.getElementById('nav-overlay');
  if (ov) ov.hidden = true;
}
function openNav() {
  document.body.classList.add('nav-open');
  const btn = document.getElementById('nav-toggle');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  const ov = document.getElementById('nav-overlay');
  if (ov) ov.hidden = false;
}
function toggleNav() { document.body.classList.contains('nav-open') ? closeNav() : openNav(); }
function bindMobileChrome() {
  const toggle = document.getElementById('nav-toggle');
  const closeBtn = document.getElementById('nav-close');
  const overlay = document.getElementById('nav-overlay');
  const filterBtn = document.getElementById('filter-toggle');
  if (toggle) toggle.addEventListener('click', toggleNav);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);
  if (overlay) overlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeNav(); document.body.classList.remove('filters-open'); if (filterBtn) filterBtn.setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('resize', () => { if (!isMobileNav()) closeNav(); });
  if (filterBtn) filterBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('filters-open');
    filterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.nav-item').forEach(nav => nav.addEventListener('click', () => showPage(nav.dataset.page)));
  bindMobileChrome();
  bindFilters();
  renderAllPages();
  const initial = location.hash.slice(1);
  if (initial && PAGE_TITLES[initial]) showPage(initial);
  const status = document.getElementById('live-status');
  try {
    await loadProvinces();
    const sel = document.getElementById('filter-provinsi');
    LIVE.provinces.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
    status.textContent = '● Live · API Indonesia';
  } catch (e) {
    status.textContent = '⚠️ ' + (e.message || 'gagal memuat');
    document.getElementById('page-beranda').insertAdjacentHTML('afterbegin', errBox('Gagal memuat data live: ' + e.message));
    return;
  }
  refreshData();
});
