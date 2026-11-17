/* ============================================================
   RENDERERS — halaman LIVE
   ============================================================ */
function kpiCard(label, value, sub = '', cls = 'status-good', unit = '') {
  return `<div class="kpi"><div class="kpi-status ${cls}"></div><div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}<span style="font-size:14px;color:#64748b;font-weight:500"> ${unit}</span></div>
    <div class="kpi-target">${sub}</div></div>`;
}
function heatRows(rows, metric, { unit = '', dec = 1, invert = false, highlightId = null } = {}) {
  const vals = rows.map(r => r[metric]).filter(v => v !== null && v !== undefined);
  const min = Math.min(...vals), max = Math.max(...vals);
  return `<div class="heatmap-grid">${rows.map(p => {
    const v = p[metric], hi = highlightId && p.id === highlightId ? ' highlighted' : '';
    if (v === null || v === undefined) return `<div class="heat-cell${hi}" style="background:#94a3b8" title="${esc(p.name)}: data akreditasi tidak tersedia di sumber"><div class="heat-cell-name">${esc(p.name)}</div><div class="heat-cell-value" style="font-size:11px">tanpa data</div></div>`;
    const t = (v - min) / (max - min || 1), score = invert ? 1 - t : t;
    const r = Math.round(220 - score * 200), g = Math.round(50 + score * 130), b = Math.round(80 - score * 30);
    return `<div class="heat-cell${hi}" style="background:rgb(${r},${g},${b})" title="${esc(p.name)}: ${fmt(v, dec)}${unit}"><div class="heat-cell-name">${esc(p.name)}</div><div class="heat-cell-value">${fmt(v, dec)}${unit}</div></div>`;
  }).join('')}</div>${vals.length < rows.length ? `<div class="note">Abu-abu = tidak ada satu pun sekolah tercatat berakreditasi A di sumber (kemungkinan kolom akreditasi kosong untuk wilayah ini), bukan berarti 0%.</div>` : ''}`;
}
function akreditasiDonut(c) {
  if (!c) return loading();
  if (!c.total) return '<div class="empty-state">Tidak ada sekolah untuk filter ini</div>';
  const tt = Math.max(0, c.total - c.A - c.B - c.C);
  const seg = [{ k: 'A', v: c.A, color: '#059669' }, { k: 'B', v: c.B, color: '#3b82f6' }, { k: 'C', v: c.C, color: '#d97706' }, { k: 'Belum ada data', v: tt, color: '#cbd5e1' }];
  return `<div class="donut-wrap">${donutChart(seg.map(s => ({ value: s.v || 0.0001, color: s.color })))}<div class="donut-legend">${seg.map(s => `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${s.k}: ${s.v.toLocaleString('id-ID')} (${fmt(pct(s.v, c.total))}%)</div>`).join('')}</div></div>`;
}
function schoolSrc() {
  const s = LIVE.schoolSource;
  return s ? `${esc(s.name)} (<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>)${s.synced ? ', sinkron ' + esc(String(s.synced).slice(0, 10)) : ''} via API Indonesia` : SRC.sekolah;
}
const KEL = { PTN: 'negeri', PTS: 'swasta', PTA: 'agama', PTK: 'kedinasan' };

function renderBeranda() {
  const c = LIVE.counts[filterKey(sekolahFilter())];
  const kf = kampusFiltered();
  const open = (LIVE.beasiswa || []).filter(b => b.status_pendaftaran === 'dibuka').length;
  const soon = (LIVE.beasiswa || []).filter(b => b.status_pendaftaran === 'segera_dibuka').length;
  const tt = c ? c.total - c.A - c.B - c.C : 0;
  const cards = [
    kpiCard('Jumlah Sekolah', c ? c.total.toLocaleString('id-ID') : '…', `${regionLabel()} · ${STATE.jenjang === 'all' ? 'SD–SLB' : STATE.jenjang}`),
    kpiCard('Sekolah Akreditasi A', c ? fmt(pct(c.A, c.total)) : '…', c ? `${c.A.toLocaleString('id-ID')} sekolah` : '', c && pct(c.A, c.total) >= 30 ? 'status-good' : 'status-warn', '%'),
    kpiCard('Tanpa Data Akreditasi', c ? fmt(pct(tt, c.total)) : '…', 'kualitas data sumber', 'status-bad', '%'),
    kpiCard('Sekolah Negeri', c && c.Negeri !== undefined ? fmt(pct(c.Negeri, c.total)) : '…', c ? `${(c.Negeri || 0).toLocaleString('id-ID')} sekolah` : '', 'status-good', '%'),
    kpiCard('Perguruan Tinggi', kf ? kf.length.toLocaleString('id-ID') : '…', kf ? `PTN ${kf.filter(k => k.kelompok === 'PTN').length} · PTS ${kf.filter(k => k.kelompok === 'PTS').length}` : 'memuat…'),
    kpiCard('Beasiswa Dibuka', LIVE.beasiswa ? open : '…', LIVE.beasiswa ? `+${soon} segera dibuka · dari ${LIVE.beasiswa.length}` : '', open ? 'status-good' : 'status-warn'),
  ].join('');
  const rows = LIVE.fan[fanKey('prov', null)]?.rows;
  let heat = fanControl('prov', null), top = '', bottom = '';
  if (rows) {
    heat = heatRows(rows, 'akredA', { unit: '%', dec: 1, highlightId: STATE.provinsi === 'all' ? null : STATE.provinsi });
    const s = rows.filter(r => r.akredA !== null).sort((a, b) => b.akredA - a.akredA);
    top = barChart(s.slice(0, 5).map(p => ({ label: p.name, value: p.akredA, color: p.id === STATE.provinsi ? '#1e40af' : '#059669' })), { unit: '%' });
    bottom = barChart(s.slice(-5).reverse().map(p => ({ label: p.name, value: p.akredA, color: p.id === STATE.provinsi ? '#1e40af' : '#dc2626' })), { unit: '%', max: s[0].akredA });
  }
  const g = kf ? countBy(kf, k => k.kelompok) : null;
  return `<h2 class="page-title">Beranda ${liveBadge()}</h2><p class="page-subtitle">Ringkasan pendidikan · ${regionLabel()} · data live API Indonesia</p>
  <div class="grid grid-6 mb-16">${cards}</div>
  ${srcNote(schoolSrc())}
  <div class="grid grid-2 mt-16">
    <div class="card"><div class="card-title">Peta % Sekolah Akreditasi A per Provinsi ${liveBadge()}<span class="card-subtitle">${STATE.jenjang === 'all' ? 'semua jenjang' : STATE.jenjang}${STATE.status === 'all' ? '' : ' · ' + STATE.status}</span></div>${heat}</div>
    <div class="card"><div class="card-title">Komposisi Akreditasi ${liveBadge()}<span class="card-subtitle">${regionLabel()}</span></div>${akreditasiDonut(c)}
      <div class="note">Sebagian besar sekolah belum memiliki data akreditasi di sumber; persentase dihitung terhadap seluruh sekolah.</div></div>
  </div>
  <div class="grid grid-2 mt-16">
    <div class="card"><div class="card-title">Top 5 Provinsi (% Akreditasi A)</div>${rows ? top : '<div class="empty-state">—</div>'}</div>
    <div class="card"><div class="card-title">Bottom 5 Provinsi (% Akreditasi A)<span class="card-subtitle">hanya provinsi yang punya data akreditasi</span></div>${rows ? bottom : '<div class="empty-state">—</div>'}</div>
  </div>
  <div class="card mt-16"><div class="card-title">🎓 Sorotan Pendidikan Tinggi ${liveBadge()}<span class="card-subtitle">${regionLabel()}</span></div>
    ${g ? `<div class="grid grid-4">${['PTN', 'PTS', 'PTA', 'PTK'].map(k => kpiCard(k, (g[k] || 0).toLocaleString('id-ID'), KEL[k])).join('')}</div>${srcNote(SRC.kampus)}` : (kampusControl() || loading())}
  </div>
  <div class="card mt-16 dummy-card"><div class="card-title">Indikator belum live ${dummyBadge()}</div>
    <div class="text-sm text-muted">APK, APM, Skor AN, Rasio Siswa-Guru, Anak Tidak Sekolah, APK PT, PISA, anggaran, dan kualifikasi guru <b>tidak tersedia</b> di API Indonesia. Halaman Partisipasi, Mutu, Guru, Pendanaan, ATS, dan PISA masih menampilkan angka contoh berlabel <b>CONTOH / DUMMY</b>. Data belum live — sumber: Dapodik, Rapor Pendidikan, BPS, PDDikti, OECD.</div></div>`;
}

function renderPemerataan() {
  const c = LIVE.counts[filterKey(sekolahFilter())];
  const fp = LIVE.fan[fanKey('prov', null)]?.rows;
  const fk = STATE.provinsi !== 'all' ? LIVE.fan[fanKey('kab', STATE.provinsi)] : null;
  let kabHtml = '';
  if (STATE.provinsi !== 'all') {
    kabHtml = `<div class="card mt-16"><div class="card-title">% Akreditasi A per Kab/Kota — ${esc(provName(STATE.provinsi))} ${liveBadge()}</div>
      ${fk?.rows ? heatRows(fk.rows, 'akredA', { unit: '%', highlightId: STATE.kabupaten === 'all' ? null : STATE.kabupaten }) +
        `<div class="table-wrap mt-16"><table><thead><tr><th>Kab/Kota</th><th>Jumlah Sekolah</th><th>Akreditasi A</th><th>% A</th></tr></thead><tbody>${[...fk.rows].sort((a, b) => (a.akredA ?? -1) - (b.akredA ?? -1)).map(r => `<tr${r.id === STATE.kabupaten ? ' class="highlighted"' : ''}><td>${esc(r.name)}</td><td>${r.total.toLocaleString('id-ID')}</td><td>${r.A.toLocaleString('id-ID')}</td><td>${r.akredA === null ? 'tanpa data' : fmt(r.akredA) + '%'}</td></tr>`).join('')}</tbody></table></div>`
        : fanControl('kab', STATE.provinsi)}${srcNote(schoolSrc())}</div>`;
  }
  return `<h2 class="page-title">Pemerataan ${liveBadge()}</h2><p class="page-subtitle">Merata atau timpang? · ${regionLabel()}</p>
  <div class="grid grid-2">
    <div class="card"><div class="card-title">Akreditasi Sekolah ${liveBadge()}</div>${akreditasiDonut(c)}${srcNote(schoolSrc())}</div>
    <div class="card"><div class="card-title">% Akreditasi A per Provinsi ${liveBadge()}</div>${fp ? heatRows(fp, 'akredA', { unit: '%', highlightId: STATE.provinsi === 'all' ? null : STATE.provinsi }) : fanControl('prov', null)}</div>
  </div>
  ${kabHtml}
  <div class="card mt-16 dummy-card"><div class="card-title">Rasio Siswa-Guru ${dummyBadge()}<span class="card-subtitle">Data belum live — sumber: Dapodik</span></div>${heatmap('rasio', { invert: true, unit: ':1' })}</div>`;
}

function renderDikti() {
  if (!LIVE.kampus) return `<h2 class="page-title">Pendidikan Tinggi ${liveBadge()}</h2><p class="page-subtitle">Perguruan tinggi aktif.</p><div class="card">${kampusControl() || loading()}</div>`;
  const kf = kampusFiltered(), g = countBy(kf, k => k.kelompok), jenis = countBy(kf, k => k.jenis), akr = countBy(kf, k => k.accreditation);
  const { rows, nullProv } = kampusByProv();
  const d = DATA.dikti;
  const list = STATE.provinsi === 'all' ? '' : `<div class="card mt-16"><div class="card-title">Daftar Perguruan Tinggi — ${regionLabel()} ${liveBadge()}<span class="card-subtitle">${kf.length} PT</span></div>
    <div class="table-wrap"><table><thead><tr><th>Nama</th><th>Singkatan</th><th>Kelompok</th><th>Bentuk</th><th>Kab/Kota</th><th>Akreditasi</th></tr></thead><tbody>
    ${[...kf].sort((a, b) => String(a.kelompok).localeCompare(b.kelompok) || a.name.localeCompare(b.name)).map(k => `<tr><td>${esc(k.name)}</td><td>${esc(k.short_name || '')}</td><td><span class="badge ${k.kelompok === 'PTN' ? 'badge-green' : 'badge-blue'}">${esc(k.kelompok)}</span></td><td>${esc(k.jenis || '')}</td><td>${esc(k.regency_name || '-')}</td><td>${esc(k.accreditation || '-')}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  return `<h2 class="page-title">Pendidikan Tinggi ${liveBadge()}</h2><p class="page-subtitle">Perguruan tinggi aktif · ${regionLabel()}</p>
  <div class="grid grid-6 mb-16">
    ${kpiCard('Total PT', kf.length.toLocaleString('id-ID'), regionLabel())}
    ${['PTN', 'PTS', 'PTA', 'PTK'].map(k => kpiCard(k, (g[k] || 0).toLocaleString('id-ID'), KEL[k])).join('')}
    ${kpiCard('Tanpa Kode Provinsi', nullProv.toLocaleString('id-ID'), `${fmt(pct(nullProv, LIVE.kampus.length))}% dari ${LIVE.kampus.length.toLocaleString('id-ID')} (nasional)`, 'status-bad')}
  </div>
  ${srcNote(SRC.kampus)}
  <div class="grid grid-2 mt-16">
    <div class="card"><div class="card-title">Bentuk PT ${liveBadge()}</div>${barChart(Object.entries(jenis).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: '#3b82f6' })), { formatter: v => fmt(v, 0) })}</div>
    <div class="card"><div class="card-title">Jumlah PT per Provinsi ${liveBadge()}<span class="card-subtitle">${nullProv} PT tanpa kode provinsi tidak terpetakan</span></div>${heatRows(rows, 'total', { unit: '', dec: 0, highlightId: STATE.provinsi === 'all' ? null : STATE.provinsi })}</div>
  </div>
  <div class="card mt-16"><div class="card-title">Akreditasi Institusi ${liveBadge()}</div>${barChart(Object.entries(akr).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: k === '(kosong)' ? '#cbd5e1' : '#059669' })), { formatter: v => fmt(v, 0) })}
    <div class="note">"(kosong)" berarti kolom akreditasi belum terisi di sumber data.</div></div>
  ${list}
  <div class="card mt-16 dummy-card"><div class="card-title">APK PT, Mahasiswa, Dosen, TPT Lulusan ${dummyBadge()}<span class="card-subtitle">Data belum live — sumber: BPS (APK PT, TPT), PDDikti (mahasiswa, dosen)</span></div>
    <div class="grid grid-4">${kpiCard('APK PT', fmt(d.apk, 2), 'contoh', 'status-bad', '%')}${kpiCard('Mahasiswa', fmt(d.mahasiswa / 1e6, 2), 'contoh', 'status-warn', 'jt')}${kpiCard('Dosen', fmt(d.dosen / 1000, 1), 'contoh', 'status-warn', 'rb')}${kpiCard('TPT Lulusan', fmt(d.tptUniversitas, 2), 'contoh', 'status-bad', '%')}</div></div>`;
}

function earlyWarningRows() {
  const fp = LIVE.fan[fanKey('prov', null)]?.rows;
  if (!fp || !LIVE.kampus) return null;
  const { rows: kp } = kampusByProv();
  const withA = fp.filter(r => r.akredA !== null);
  const totS = fp.reduce((s, r) => s + r.total, 0), totPT = kp.reduce((s, r) => s + r.total, 0);
  const natA = pct(withA.reduce((s, r) => s + r.A, 0), withA.reduce((s, r) => s + r.total, 0)), natRatio = totS / (totPT || 1);
  return fp.map(r => {
    const k = kp.find(x => x.id === r.id) || { total: 0, PTN: 0 };
    const ratio = k.total ? r.total / k.total : Infinity;
    let score = 0; const flags = [];
    if (r.akredA === null) { score += 1; flags.push('Data akreditasi kosong'); }
    else if (r.akredA < natA * 0.5) { score += 3; flags.push('Akreditasi A sangat rendah'); } else if (r.akredA < natA * 0.8) { score += 2; flags.push('Akreditasi A rendah'); }
    if (ratio > natRatio * 2) { score += 3; flags.push('Akses PT sangat terbatas'); } else if (ratio > natRatio * 1.3) { score += 2; flags.push('Akses PT terbatas'); }
    if (k.PTN === 0) { score += 2; flags.push('Tanpa PTN'); }
    if (k.total < 15) { score += 1; flags.push('PT < 15'); }
    return { ...r, pt: k.total, ptn: k.PTN, ratio, score, flags };
  }).sort((a, b) => b.score - a.score || (a.akredA ?? 999) - (b.akredA ?? 999));
}
function renderEarlyWarning() {
  const rows = earlyWarningRows();
  let table;
  if (!rows) table = fanControl('prov', null) || kampusControl() || loading();
  else {
    const filtered = STATE.provinsi === 'all' ? rows : rows.filter(p => p.id === STATE.provinsi);
    table = `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Provinsi</th><th>Skor</th><th>% Akred. A</th><th>Sekolah / PT</th><th>PTN</th><th>Indikator</th></tr></thead><tbody>
    ${filtered.map(p => `<tr${p.id === STATE.provinsi ? ' class="highlighted"' : ''}><td><b>${rows.indexOf(p) + 1}</b></td><td>${esc(p.name)}</td><td><span class="badge ${p.score >= 6 ? 'badge-red' : p.score >= 3 ? 'badge-yellow' : 'badge-green'}">${p.score}</span></td><td>${p.akredA === null ? '<span class="text-muted">tanpa data</span>' : fmt(p.akredA) + '%'}</td><td>${Number.isFinite(p.ratio) ? fmt(p.ratio, 0) : '∞'}</td><td>${p.ptn}</td><td>${p.flags.map(f => `<span class="badge badge-red" style="margin-right:4px">${f}</span>`).join('') || '<span class="badge badge-green">-</span>'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="note">Skor dihitung dari data live: % akreditasi A dibanding rata-rata nasional, rasio sekolah per perguruan tinggi, keberadaan PTN, dan jumlah PT. Indikator APK/APM/Skor AN/ATS belum dipakai karena belum tersedia live.${STATE.jenjang !== 'all' || STATE.status !== 'all' ? ' Filter jenjang/status ikut memengaruhi data sekolah.' : ''}</div>`;
  }
  const bs = beasiswaRelevant().filter(b => ['dibuka', 'segera_dibuka'].includes(b.status_pendaftaran));
  const bsAll = LIVE.beasiswa || [];
  const bsTable = LIVE.beasiswaError ? errBox(LIVE.beasiswaError) : !LIVE.beasiswa ? loading() : `
    <div class="table-wrap"><table><thead><tr><th>Program</th><th>Penyelenggara</th><th>Jenjang</th><th>Lokasi</th><th>Status</th><th>Periode</th></tr></thead><tbody>
    ${[...bs, ...bsAll.filter(b => !bs.includes(b))].map(b => `<tr><td><a href="${esc(b.url_resmi)}" target="_blank" rel="noopener">${esc(b.nama)}</a></td><td class="text-sm">${esc(b.penyelenggara)}</td><td>${esc((b.jenjang || []).join(', '))}</td><td>${esc((b.lokasi_studi || '').replace('_', ' '))}</td><td>${bsBadge(b.status_pendaftaran)}</td><td class="text-sm">${b.periode_aktif ? `${esc(b.periode_aktif.buka)} → ${esc(b.periode_aktif.tutup)}` : '<span class="text-muted">belum ada jadwal</span>'}</td></tr>`).join('')}
    </tbody></table></div>${srcNote(bsAttribution())}`;
  return `<h2 class="page-title">Early Warning ${liveBadge()}</h2><p class="page-subtitle">Prioritas intervensi berbasis data live + aksi beasiswa.</p>
  <div class="card"><div class="card-title">Prioritas Provinsi ${liveBadge()}</div>${table}${srcNote(schoolSrc() + ' · ' + SRC.kampus)}</div>
  <div class="card mt-16"><div class="card-title">🎯 Aksi: Beasiswa ${liveBadge()}<span class="card-subtitle">${bs.length} dibuka/segera dibuka${STATE.jenjang === 'SMA' || STATE.jenjang === 'SMK' ? ' untuk lulusan SMA/SMK (D3–S1)' : ''} · status dihitung harian (WIB)</span></div>${bsTable}</div>`;
}
