/* ---------- Profil Sekolah (live: pencarian, paginasi, peta, detail) ---------- */
const SK = { q: '', akred: 'all', page: 1, perPage: 100, data: null, meta: null, loading: false, error: null, key: '' };
function sekolahPerPage() { return window.matchMedia('(max-width: 768px)').matches ? 20 : 100; }
function sekolahQueryKey() { return JSON.stringify([sekolahFilter(), SK.q, SK.akred, SK.page]); }
async function loadSekolahList() {
  SK.perPage = sekolahPerPage();
  const key = sekolahQueryKey();
  if (SK.key === key && (SK.data || SK.loading)) return;
  SK.key = key; SK.loading = true; SK.error = null; renderSekolahResults();
  try {
    const j = await api('sekolah' + qs({ ...sekolahFilter(), q: SK.q.length >= 2 ? SK.q : '', accreditation: SK.akred, page: SK.page, per_page: SK.perPage }));
    if (SK.key !== key) return;
    SK.data = j.data; SK.meta = j.meta; (j.data || []).forEach(noteSchoolSource);
  } catch (e) { SK.error = e; SK.data = null; }
  SK.loading = false; renderSekolahResults();
}
function renderSekolah() {
  return `<h2 class="page-title">Profil Sekolah ${liveBadge()}</h2><p class="page-subtitle">Cari sekolah berdasarkan awalan nama atau NPSN · filter wilayah/jenjang/status dari bar atas.</p>
  <div class="card">
    <div class="search-box"><input id="sk-q" placeholder="Awalan nama sekolah (min. 2 huruf) atau NPSN…" value="${esc(SK.q)}">
      <select id="sk-akred" class="btn"><option value="all">Semua akreditasi</option>${['A', 'B', 'C'].map(a => `<option value="${a}"${SK.akred === a ? ' selected' : ''}>Akreditasi ${a}</option>`).join('')}</select>
      <button class="btn btn-primary" id="sk-go">Cari</button></div>
    <div id="sk-results">${loading()}</div>
  </div>
  <div class="grid grid-2 mt-16 sk-lower">
    <div class="card sk-map-card"><div class="card-title">Peta Sekolah (halaman ini) ${liveBadge()}</div><div id="sk-map" style="height:380px;border-radius:8px"></div><div class="note">Peta © OpenStreetMap contributors. Titik dari koordinat lat/lng tiap sekolah.</div></div>
    <div class="card sk-detail-card"><div class="card-title">Detail Sekolah ${liveBadge()}</div><div id="sk-detail"><div class="empty-state">Klik sekolah pada daftar untuk melihat detail.</div></div></div>
  </div>`;
}
function bindSekolah() {
  const go = () => { SK.q = document.getElementById('sk-q').value.trim(); SK.akred = document.getElementById('sk-akred').value; SK.page = 1; loadSekolahList(); };
  document.getElementById('sk-go').onclick = go;
  document.getElementById('sk-q').onkeydown = e => { if (e.key === 'Enter') go(); };
  document.getElementById('sk-akred').onchange = go;
  initMap();
  SK.key = ''; loadSekolahList();
}
let MAP = null, MAPLAYER = null;
function initMap() {
  if (!window.L) return;
  if (MAP) { MAP.remove(); MAP = null; }
  MAP = L.map(document.getElementById('sk-map')).setView([-2.5, 118], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(MAP);
  MAPLAYER = L.layerGroup().addTo(MAP);
}
function renderSekolahResults() {
  const el = document.getElementById('sk-results'); if (!el) return;
  if (SK.loading) { el.innerHTML = loading('Memuat daftar sekolah…'); return; }
  if (SK.error) { el.innerHTML = errBox(SK.error); return; }
  if (!SK.data) { el.innerHTML = ''; return; }
  const m = SK.meta || {};
  const badge = (s) => `<span class="badge ${s.accreditation === 'A' ? 'badge-green' : s.accreditation ? 'badge-yellow' : 'badge-gray'}">${esc(s.accreditation || '—')}</span>`;
  const rows = SK.data.map(s => `<tr class="sk-row" data-npsn="${esc(s.npsn)}" style="cursor:pointer"><td>${esc(s.npsn)}</td><td>${esc(s.name)}</td><td>${esc(s.jenis)}</td><td>${esc(s.status)}</td><td>${badge(s)}</td><td class="text-sm">${esc(s.address || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">Tidak ada hasil</td></tr>';
  const cards = SK.data.map(s => `<button type="button" class="sk-card sk-row" data-npsn="${esc(s.npsn)}"><div class="sk-card-title">${esc(s.name)}</div><div class="sk-card-meta"><span>NPSN ${esc(s.npsn)}</span><span>${esc(s.jenis)}</span><span>${esc(s.status)}</span>${badge(s)}</div>${s.address ? `<div class="sk-card-addr">${esc(s.address)}</div>` : ''}</button>`).join('') || '<div class="empty-state">Tidak ada hasil</div>';
  el.innerHTML = `<div class="flex-between mb-16 text-sm sk-toolbar"><div><b>${(m.total || 0).toLocaleString('id-ID')}</b> sekolah · ${regionLabel()}${STATE.jenjang !== 'all' ? ' · ' + STATE.jenjang : ''}${STATE.status !== 'all' ? ' · ' + STATE.status : ''}</div>
    <div class="flex gap-8"><button class="btn" id="sk-prev" ${SK.page <= 1 ? 'disabled' : ''}>‹ Sebelumnya</button><span style="padding:10px 0">Hal. ${m.page || 1} / ${(m.total_pages || 1).toLocaleString('id-ID')}</span><button class="btn" id="sk-next" ${SK.page >= (m.total_pages || 1) ? 'disabled' : ''}>Berikutnya ›</button></div></div>
    <div class="table-wrap sk-table"><table><thead><tr><th>NPSN</th><th>Nama</th><th>Jenjang</th><th>Status</th><th>Akreditasi</th><th>Alamat</th></tr></thead><tbody>
    ${rows}
    </tbody></table></div>
    <div class="sk-cards">${cards}</div>${srcNote(schoolSrc())}`;
  document.getElementById('sk-prev').onclick = () => { SK.page--; loadSekolahList(); };
  document.getElementById('sk-next').onclick = () => { SK.page++; loadSekolahList(); };
  el.querySelectorAll('.sk-row').forEach(n => n.onclick = () => {
    showSchoolDetail(n.dataset.npsn);
    if (window.matchMedia('(max-width: 768px)').matches) {
      const d = document.querySelector('.sk-detail-card');
      if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  if (MAP && MAPLAYER) {
    MAPLAYER.clearLayers(); const pts = [];
    SK.data.forEach(s => { if (s.lat && s.lng) { pts.push([s.lat, s.lng]); L.circleMarker([s.lat, s.lng], { radius: 5, color: s.accreditation === 'A' ? '#059669' : '#1e40af', weight: 1, fillOpacity: 0.7 }).bindPopup(`<b>${esc(s.name)}</b><br>NPSN ${esc(s.npsn)} · ${esc(s.jenis)} ${esc(s.status)}<br>Akreditasi: ${esc(s.accreditation || '—')}`).addTo(MAPLAYER); } });
    setTimeout(() => { MAP.invalidateSize(); if (pts.length) MAP.fitBounds(pts, { padding: [20, 20], maxZoom: 13 }); }, 50);
  }
}
async function showSchoolDetail(npsn) {
  const el = document.getElementById('sk-detail'); el.innerHTML = loading('Memuat detail…');
  try {
    const j = await api('sekolah/' + encodeURIComponent(npsn)); const s = j.data || {};
    noteSchoolSource(s);
    const rows = [['NPSN', s.npsn], ['Nama', s.name], ['Jenjang', s.jenis], ['Status', s.status], ['Akreditasi', s.accreditation || '— (belum ada data)'], ['Alamat', s.address], ['Desa/Kel.', s.village_name], ['Kecamatan', s.district_name], ['Kab/Kota', s.regency_name], ['Provinsi', s.province_name], ['Kode pos', s.postal_code], ['Telepon', s.phone], ['Email', s.email], ['Website', s.website], ['Koordinat', s.lat ? `${s.lat}, ${s.lng}` : null], ['Sumber', s.source_name ? `${s.source_name}${s.source_synced_at ? ' (sinkron ' + String(s.source_synced_at).slice(0, 10) + ')' : ''}` : '(tidak dicantumkan pada record)']];
    el.innerHTML = `<table><tbody>${rows.map(([k, v]) => `<tr><td class="text-muted" style="width:120px">${k}</td><td>${esc(v ?? '-')}</td></tr>`).join('')}</tbody></table>`;
    if (MAP && s.lat) MAP.setView([s.lat, s.lng], 15);
  } catch (e) { el.innerHTML = errBox(e); }
}

/* ---------- Data Explorer (live) ---------- */
function explorerRows() {
  const fp = LIVE.fan[fanKey('prov', null)]?.rows; if (!fp) return null;
  const kp = LIVE.kampus ? kampusByProv().rows : null;
  return fp.map(r => { const k = kp?.find(x => x.id === r.id); return { kode: r.id, provinsi: r.name, sekolah: r.total, akredA: r.A, pctA: r.akredA, pt: k?.total ?? null, ptn: k?.PTN ?? null, pts: k?.PTS ?? null, pta: k?.PTA ?? null, ptk: k?.PTK ?? null }; });
}
function renderExplorer() {
  const rows = explorerRows();
  if (!rows) return `<h2 class="page-title">Data Explorer ${liveBadge()}</h2><p class="page-subtitle">Data mentah per provinsi sesuai filter.</p><div class="card">${fanControl('prov', null) || loading()}</div>`;
  const act = STATE.provinsi === 'all' ? rows : rows.filter(r => r.kode === STATE.provinsi);
  return `<h2 class="page-title">Data Explorer ${liveBadge()}</h2><p class="page-subtitle">Data mentah per provinsi · jenjang ${STATE.jenjang === 'all' ? 'semua' : STATE.jenjang} · ${STATE.status === 'all' ? 'negeri & swasta' : STATE.status}. Tombol <b>⬇ Ekspor</b> mengunduh tabel ini (CSV).</p>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Provinsi</th><th>Sekolah</th><th>Akred. A</th><th>% A</th><th>PT</th><th>PTN</th><th>PTS</th><th>PTA</th><th>PTK</th></tr></thead><tbody>
  ${act.map(r => `<tr${r.kode === STATE.provinsi ? ' class="highlighted"' : ''}><td>${r.kode}</td><td>${esc(r.provinsi)}</td><td>${r.sekolah.toLocaleString('id-ID')}</td><td>${r.akredA.toLocaleString('id-ID')}</td><td>${r.pctA === null ? '—' : fmt(r.pctA)}</td><td>${r.pt ?? '…'}</td><td>${r.ptn ?? '…'}</td><td>${r.pts ?? '…'}</td><td>${r.pta ?? '…'}</td><td>${r.ptk ?? '…'}</td></tr>`).join('')}
  </tbody></table></div>${srcNote(schoolSrc() + ' · ' + SRC.kampus + ' · ' + SRC.wilayah)}</div>`;
}
function exportCSV() {
  const rows = explorerRows();
  if (!rows) { alert('Data per provinsi belum dimuat. Buka Data Explorer dan muat data live terlebih dahulu.'); return; }
  const header = ['kode_provinsi', 'provinsi', 'jumlah_sekolah', 'akreditasi_A', 'persen_akreditasi_A', 'jumlah_pt', 'ptn', 'pts', 'pta', 'ptk'];
  const csv = [header, ...rows.map(r => [r.kode, `"${r.provinsi}"`, r.sekolah, r.akredA, r.pctA === null ? '' : r.pctA.toFixed(2), r.pt ?? '', r.ptn ?? '', r.pts ?? '', r.pta ?? '', r.ptk ?? ''])].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `edudata_live_${STATE.jenjang}_${STATE.status}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}
