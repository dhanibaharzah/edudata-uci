/* ============================================================
   DATA CONTOH / DUMMY (dari prototipe v0.6) — HANYA untuk panel yang belum live.
   Semua panel yang memakai DATA ini diberi label "CONTOH / DUMMY".
   ============================================================ */
const DATA = {
  kpi: {
    apk:    { label: 'APK (Dikdasmen)',       value: 97.8, unit: '%',  target: 99.0, trend: [96.5, 97.0, 97.3, 97.6, 97.8], higherBetter: true },
    apm:    { label: 'APM (Dikdasmen)',       value: 84.2, unit: '%',  target: 90.0, trend: [82.1, 82.8, 83.4, 83.9, 84.2], higherBetter: true },
    skorAN: { label: 'Skor AN (rata-rata)',   value: 67.2, unit: '',   target: 75.0, trend: [64.1, 65.0, 66.2, 66.8, 67.2], higherBetter: true },
    rasio:  { label: 'Rasio Siswa-Guru',      value: 13.5, unit: ':1', target: 16.0, trend: [14.2, 14.0, 13.8, 13.6, 13.5], higherBetter: false },
    ats:    { label: 'Anak Tidak Sekolah',    value: 4.15, unit: 'jt', target: 2.00, trend: [4.50, 4.30, 4.20, 4.10, 4.15], higherBetter: false },
    akredA: { label: 'Sekolah Akreditasi A',  value: 19.7, unit: '%',  target: 60.0, trend: [17.2, 17.9, 18.5, 19.1, 19.7], higherBetter: true },
  },
  provinces: [
    { name: 'DKI Jakarta',        apk: 102.1, apm: 96.2, an: 76.8, rasio: 12.5, ats: 0.9, akredA: 48.2, anggaran: 18.5, apkPT: 40.5 },
    { name: 'DI Yogyakarta',      apk: 100.5, apm: 95.1, an: 73.5, rasio: 11.8, ats: 1.2, akredA: 42.5, anggaran: 12.1, apkPT: 74.7 },
    { name: 'Bali',               apk: 99.8,  apm: 93.2, an: 71.2, rasio: 12.2, ats: 1.5, akredA: 38.1, anggaran: 11.8, apkPT: 40.7 },
    { name: 'Kalimantan Timur',   apk: 99.1,  apm: 91.5, an: 69.5, rasio: 13.1, ats: 2.1, akredA: 32.5, anggaran: 16.2, apkPT: 40.4 },
    { name: 'Jawa Timur',         apk: 98.9,  apm: 89.8, an: 68.2, rasio: 13.8, ats: 3.0, akredA: 24.5, anggaran: 10.5, apkPT: 35.2 },
    { name: 'Jawa Tengah',        apk: 98.5,  apm: 88.9, an: 67.5, rasio: 13.5, ats: 3.2, akredA: 23.8, anggaran: 10.2, apkPT: 34.8 },
    { name: 'Sulawesi Utara',     apk: 98.2,  apm: 89.1, an: 68.1, rasio: 13.6, ats: 2.8, akredA: 24.1, anggaran: 11.5, apkPT: 38.5 },
    { name: 'Sumatera Barat',     apk: 97.9,  apm: 88.2, an: 67.1, rasio: 13.4, ats: 3.3, akredA: 22.5, anggaran: 10.8, apkPT: 42.3 },
    { name: 'Sulawesi Selatan',   apk: 97.5,  apm: 87.5, an: 66.8, rasio: 14.1, ats: 3.8, akredA: 21.2, anggaran: 11.2, apkPT: 34.1 },
    { name: 'Sumatera Selatan',   apk: 97.2,  apm: 86.8, an: 66.2, rasio: 14.5, ats: 4.0, akredA: 20.5, anggaran: 10.1, apkPT: 32.5 },
    { name: 'Kalimantan Selatan', apk: 96.9,  apm: 86.5, an: 66.0, rasio: 14.2, ats: 4.1, akredA: 19.8, anggaran: 12.5, apkPT: 31.8 },
    { name: 'Sumatera Utara',     apk: 96.8,  apm: 85.9, an: 65.5, rasio: 15.2, ats: 4.3, akredA: 18.9, anggaran: 9.8,  apkPT: 31.2 },
    { name: 'Lampung',            apk: 96.5,  apm: 85.2, an: 65.1, rasio: 15.8, ats: 4.6, akredA: 17.5, anggaran: 9.2,  apkPT: 30.5 },
    { name: 'Riau',               apk: 96.2,  apm: 84.8, an: 64.8, rasio: 15.5, ats: 4.8, akredA: 17.1, anggaran: 11.0, apkPT: 30.1 },
    { name: 'Banten',             apk: 95.8,  apm: 84.1, an: 64.2, rasio: 16.8, ats: 5.4, akredA: 16.2, anggaran: 9.5,  apkPT: 29.8 },
    { name: 'Kalimantan Barat',   apk: 95.2,  apm: 83.5, an: 63.5, rasio: 16.5, ats: 5.9, akredA: 15.5, anggaran: 10.8, apkPT: 28.5 },
    { name: 'NTB',                apk: 94.8,  apm: 82.8, an: 63.0, rasio: 17.2, ats: 6.3, akredA: 14.8, anggaran: 9.6,  apkPT: 27.2 },
    { name: 'Maluku',             apk: 94.2,  apm: 81.9, an: 62.1, rasio: 17.8, ats: 6.9, akredA: 13.5, anggaran: 11.5, apkPT: 42.9 },
    { name: 'NTT',                apk: 93.5,  apm: 81.2, an: 61.5, rasio: 18.2, ats: 7.8, akredA: 12.8, anggaran: 9.8,  apkPT: 25.8 },
    { name: 'Papua Barat',        apk: 91.8,  apm: 79.5, an: 59.2, rasio: 19.5, ats: 8.8, akredA: 10.5, anggaran: 14.2, apkPT: 22.5 },
    { name: 'Papua',              apk: 90.5,  apm: 78.2, an: 58.0, rasio: 20.2, ats: 9.6, akredA: 9.2,  anggaran: 15.5, apkPT: 18.2 },
  ],
  partisipasiByJenjang: { PAUD: { apk: 72.1, apm: 38.5 }, SD: { apk: 99.1, apm: 97.0 }, SMP: { apk: 98.2, apm: 80.7 }, SMA: { apk: 89.5, apm: 67.4 }, SMK: { apk: 65.8, apm: 52.1 } },
  mutuKompetensi: { numerasi: { dasar: 42, menengah: 41, mahir: 17 }, literasi: { dasar: 38, menengah: 45, mahir: 17 } },
  akreditasi: { A: 19.7, B: 36.9, C: 41.1, TT: 2.3 },
  guruKualifikasi: { S1: 78.2, S2: 12.4, S3: 0.4, 'Diploma': 7.5, 'SMA': 1.5 },
  pisa: { indonesia: { matematika: 364, membaca: 365, sains: 389 }, oecd: { matematika: 463, membaca: 461, sains: 482 }, trenIndo: { matematika: [386, 386, 379, 366, 364], membaca: [397, 397, 371, 359, 365], sains: [403, 403, 383, 383, 389] } },
  ats: { total: 4149742, bpb: 1968958, do: 1061041, ltm: 1119743 },
  anggaran: { total: 724.3, perSiswa: 15.7, realisasi: 10.6 },
  schools: [
    { npsn: '20101001', name: 'SMA Negeri 1 Jakarta', jenjang: 'SMA', status: 'Negeri', akreditasi: 'A', siswa: 1080, guru: 72 },
    { npsn: '20201002', name: 'SMP Negeri 5 Bandung', jenjang: 'SMP', status: 'Negeri', akreditasi: 'A', siswa: 920, guru: 68 },
    { npsn: '20301003', name: 'SD Negeri 3 Yogyakarta', jenjang: 'SD', status: 'Negeri', akreditasi: 'A', siswa: 420, guru: 26 },
    { npsn: '20401004', name: 'SMK Negeri 2 Surabaya', jenjang: 'SMK', status: 'Negeri', akreditasi: 'A', siswa: 1440, guru: 118 },
    { npsn: '20501005', name: 'SMA Swasta Harapan Bangsa', jenjang: 'SMA', status: 'Swasta', akreditasi: 'B', siswa: 380, guru: 30 },
    { npsn: '20601006', name: 'SD Swasta Tunas Harapan', jenjang: 'SD', status: 'Swasta', akreditasi: 'B', siswa: 320, guru: 18 },
    { npsn: '20701007', name: 'SMP Swasta Cendekia', jenjang: 'SMP', status: 'Swasta', akreditasi: 'B', siswa: 410, guru: 28 },
  ],
  dikti: {
    apk: 32.89, apkL: 29.88, apkP: 35.98, mahasiswa: 10754154, dosen: 351205, rasio: 33,
    pt: { total: 4303, ptn: 127, pts: 2713, pta: 1318, ptk: 145 },
    akreditasi: { unggul: 149, baikSekali: 442, baik: 2574, A: 12, B: 417, C: 3, tidakAda: 819 },
    lulusanS1: 1260000, tptUniversitas: 5.39, tptNasional: 4.76, pengangguranPT: 904440,
    provinsi: [
      { name: 'DI Yogyakarta', apkPT: 74.70 }, { name: 'Maluku', apkPT: 42.89 }, { name: 'Sumatera Barat', apkPT: 42.32 }, { name: 'Bali', apkPT: 40.69 }, { name: 'Kalimantan Timur', apkPT: 40.44 }, { name: 'DKI Jakarta', apkPT: 40.50 }, { name: 'Sulawesi Utara', apkPT: 38.50 }, { name: 'Jawa Timur', apkPT: 35.20 }, { name: 'Jawa Tengah', apkPT: 34.80 }, { name: 'Sulawesi Selatan', apkPT: 34.10 }, { name: 'Sumatera Selatan', apkPT: 32.50 }, { name: 'Kalimantan Selatan', apkPT: 31.80 }, { name: 'Sumatera Utara', apkPT: 31.20 }, { name: 'Lampung', apkPT: 30.50 }, { name: 'Riau', apkPT: 30.10 }, { name: 'Banten', apkPT: 29.80 }, { name: 'Kalimantan Barat', apkPT: 28.50 }, { name: 'NTB', apkPT: 27.20 }, { name: 'NTT', apkPT: 25.80 }, { name: 'Papua Barat', apkPT: 22.50 }, { name: 'Papua', apkPT: 18.20 },
    ]
  }
};
