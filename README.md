# Dashboard Pendidikan Indonesia — Live (API Indonesia) · UCI

Versi *live* dari prototipe dashboard pendidikan (Dummy v0.6). Tampilan, menu, filter, dan teks Indonesia dipertahankan, tetapi panel yang datanya tersedia kini memakai **data asli** dari [API Indonesia](https://apiindonesia.id). Panel yang belum punya sumber live tetap ditampilkan dengan label **CONTOH / DUMMY** yang jelas.

Semuanya berjalan sebagai **satu Cloudflare Worker**:

- `GET /` menyajikan halaman dashboard (HTML statis, dibangun dari `frontend/`).
- `GET /api/v1/*` adalah proxy ke `https://use.apiindonesia.id`, hanya untuk path dan parameter yang ada di daftar izin. Kunci API ditambahkan **di server** dan tidak pernah dikirim ke browser.
- `POST /api/session` memverifikasi token Cloudflare Turnstile, lalu memberi cookie sesi bertanda tangan HMAC (berlaku 3 jam).
- `GET /api/health` menampilkan status: kunci terpasang atau belum, Turnstile aktif atau tidak, dan perkiraan jumlah panggilan upstream hari ini.

> API Indonesia adalah layanan independen, bukan API resmi pemerintah. Datanya dihimpun dari sumber resmi (Kemendikbud, PDDikti, Kemendagri, dan halaman penyelenggara beasiswa). Setiap panel live mencantumkan atribusi sumbernya.

## Panel: live vs belum live

| Halaman | Status | Endpoint API Indonesia |
| --- | --- | --- |
| Beranda (KPI sekolah, akreditasi, negeri, PT, beasiswa; peta % akreditasi A per provinsi; top/bottom 5) | **LIVE** | `/sekolah`, `/kampus`, `/beasiswa`, `/wilayah/provinsi` |
| Pemerataan (komposisi akreditasi; % A per provinsi dan per kab/kota) | **LIVE** (rasio siswa-guru: dummy) | `/sekolah`, `/wilayah/provinsi/{id}/kabupaten` |
| Pendidikan Tinggi (PTN/PTS/PTA/PTK, bentuk PT, akreditasi, jumlah PT per provinsi, daftar PT) | **LIVE** (APK PT, mahasiswa, dosen, TPT: dummy) | `/kampus` |
| Early Warning (skor prioritas provinsi + tabel beasiswa dengan status harian) | **LIVE** | `/sekolah`, `/kampus`, `/beasiswa` |
| Profil Sekolah (cari nama/NPSN, filter, paginasi, peta Leaflet, detail) | **LIVE** | `/sekolah`, `/sekolah/{npsn}` |
| Data Explorer + Ekspor CSV | **LIVE** | gabungan di atas |
| Partisipasi (APK/APM), Mutu (AN), Guru & Tendik, Pendanaan, ATS, PISA | **Belum live** (contoh/dummy) | tidak tersedia. Sumber resmi: BPS, Dapodik, Rapor Pendidikan, Kemenkeu, OECD |
| Analisis Data / Pre-defined / Analisis Lanjut | Puter.js di browser. Konteks AI diambil dari **data live** | — |

Filter di bar atas: Provinsi (38, kode Kemendagri) → Kab/Kota → Jenjang (SD, SMP, SMA, SMK, SLB) → Status (Negeri/Swasta). Filter tahun dihapus karena API hanya menyediakan data terkini (snapshot).

## Struktur

```
src/worker.js        Worker: proxy + cache + Turnstile/sesi + rate limit
src/index.html       HASIL BUILD (jangan diedit langsung)
frontend/            Sumber halaman: shell.html, style.css, extra.css, 0*.js
scripts/build.mjs    Menyusun frontend/ menjadi src/index.html
scripts/make-deploy-code.mjs  (opsional) membuat kode deploy untuk Cloudflare API/konektor
scripts/screenshots.mjs       (opsional) screenshot headless
wrangler.toml        Konfigurasi Worker (tanpa account_id dan tanpa secret)
```

## Setup dan deploy (Wrangler)

```bash
npm install
export CLOUDFLARE_ACCOUNT_ID=<id akun Cloudflare Anda>   # tidak disimpan di repo
npx wrangler login                                       # atau CLOUDFLARE_API_TOKEN

# 1) KV untuk cache. Salin id yang muncul ke wrangler.toml (kv_namespaces.id)
npx wrangler kv namespace create CACHE

# 2) Secret (diketik atau di-pipe, JANGAN ditulis ke file)
npx wrangler secret put APIINDONESIA_API_KEY      # kunci aip_live_... dari dashboard.apiindonesia.id
npx wrangler secret put TURNSTILE_SECRET          # secret widget Turnstile
openssl rand -hex 32 | npx wrangler secret put SESSION_HMAC_KEY

# 3) Atur TURNSTILE_SITEKEY dan TURNSTILE_HOSTNAMES di wrangler.toml, lalu:
npm run deploy
```

Untuk pengembangan lokal (`npm run dev`), buat `.dev.vars` (sudah di-.gitignore). Contoh dengan *test key* resmi Turnstile yang selalu lolos:

```
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
SESSION_HMAC_KEY=<acak>
```

Jalankan dengan `npx wrangler dev --var TURNSTILE_SITEKEY:1x00000000000000000000AA --var TURNSTILE_HOSTNAMES:example.com,localhost --var TURNSTILE_EXPECT_ACTION:` (test key tidak mengirim `action`). Di produksi, `TURNSTILE_EXPECT_ACTION` jangan diset. Nilai bawaannya `edudata`, jadi pemeriksaan action tetap ketat.

### Variabel

| Nama | Jenis | Keterangan |
| --- | --- | --- |
| `APIINDONESIA_API_KEY` | secret | Kunci API Indonesia. Bila kosong, Worker mencoba `cfg:apikey` di KV (fallback lama, lihat catatan) |
| `TURNSTILE_SECRET` | secret | Secret widget Turnstile |
| `SESSION_HMAC_KEY` | secret | Kunci HMAC cookie sesi. Bila kosong, kunci acak dibuat sekali dan disimpan di KV |
| `TURNSTILE_SITEKEY` | var (publik) | Site key Turnstile. **Kosongkan untuk menonaktifkan Turnstile** |
| `TURNSTILE_HOSTNAMES` | var | Hostname yang diterima dari hasil siteverify (dipisah koma) |
| `DAILY_UPSTREAM_LIMIT` | var | Batas perkiraan panggilan upstream per hari (bawaan 300 ≈ 600 kredit) |

## Cache dan hemat kredit

API Indonesia memotong **2 kredit per panggilan sukses** (bonus daftar: 3.000 kredit, tidak ada kuota gratis bulanan).

- Setiap respons upstream disimpan di **Workers KV** dengan kunci path + query yang sudah dinormalisasi (parameter diurutkan, `per_page` dibatasi). TTL: wilayah 30 hari, sekolah/kampus 7 hari, beasiswa 6 jam (status pendaftaran dihitung ulang setiap hari). Ada juga cache memori per-isolate selama 10 menit.
- Frontend memakai header `x-edudata-cache-only: 1` untuk agregasi besar: 38 provinsi × 2 panggilan untuk peta akreditasi, kab/kota untuk satu provinsi, dan 22 halaman daftar kampus. Bila data belum ter-cache, pengguna melihat tombol **"Muat data live (±N panggilan ≈ 2N kredit)"**, jadi kredit tidak terpakai diam-diam.
- Hitungan sekolah untuk filter aktif (4–5 panggilan), daftar provinsi/kab, daftar sekolah per halaman (100 baris), detail sekolah, dan beasiswa dimuat otomatis, lalu di-cache.
- `DAILY_UPSTREAM_LIMIT` menghentikan panggilan *baru* ke upstream setelah batas tercapai (HTTP 429). Data yang sudah ter-cache tetap tampil. Hitungannya perkiraan karena KV tidak atomik.
- Perkiraan biaya *cold start* untuk filter bawaan: ±105 panggilan (≈210 kredit), sekali per 7 hari.

## Keamanan

- Proxy hanya menerima GET/HEAD, path yang terdaftar, dan parameter dengan validasi regex. Path lain menghasilkan 404, parameter lain 400.
- Kunci API hanya ada di server. Pesan error upstream diringkas dan tidak diteruskan mentah.
- `/api/v1/*` wajib membawa cookie sesi `eds` (HttpOnly, Secure, SameSite=Strict, Path=/api) yang hanya diberikan setelah token Turnstile lolos siteverify (`success`, `action=edudata`, hostname cocok). Tanpa cookie, respons 403 `SESSION_REQUIRED`.
- Rate limit per IP (binding Workers Rate Limiting + penghitung lokal per isolate, 300/menit). Sifatnya *best-effort* karena penghitungnya per lokasi/isolate. Perlindungan utama tetap Turnstile, cache, dan batas harian.
- Endpoint `/__setup` hanya aktif bila var `SETUP_TOKEN_SHA256` diset. Dipakai sekali untuk memasukkan kunci API ke KV ketika `wrangler secret put` belum bisa dijalankan. Setelah itu deploy ulang tanpa var tersebut.

## Catatan kualitas data (per 17 Nov 2026)

- **Akreditasi sekolah**: 47,7% dari 93.505 sekolah tidak punya nilai akreditasi. Banyak provinsi (mis. Aceh, DIY, Jambi, Papua dan pemekarannya) tidak punya satu pun sekolah berakreditasi A di sumber, jadi kemungkinan kolomnya kosong. Wilayah seperti ini ditampilkan abu-abu ("tanpa data"), bukan 0%.
- Banyak record sekolah tidak memiliki `source_name`, `district_id`, dan `village_id`. Atribusi diambil dari record yang mencantumkannya (`kemendikbud-reference`).
- Filter jenjang API: SD, SMP, SMA, SMK, SLB. PAUD tidak tersedia.
- **Kampus**: 4.295 PT aktif. 12 record tidak punya kode provinsi. Kolom akreditasi institusi umumnya kosong. Beberapa provinsi pemekaran Papua tercatat tanpa PT.
- Respons tidak memuat jumlah siswa/guru, jadi rasio siswa-guru tidak bisa dihitung.

## Lisensi

MIT. Lihat `LICENSE`. Data milik masing-masing sumber, sesuai atribusi di setiap panel.
