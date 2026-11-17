/* ============================================================
   SYSTEM PROMPTS & HALAMAN ANALISIS (Puter.js di browser)
   ============================================================ */
const SYSTEM_PROMPT_ANALISIS_DATA = (context) => `Anda adalah analis kebijakan pendidikan senior untuk dashboard pendidikan Indonesia. Tugas Anda adalah membantu pengguna memahami data LIVE yang ditampilkan di dashboard (bersumber dari API Indonesia: data sekolah Kemendikbud, perguruan tinggi PDDikti, beasiswa).

ATURAN KETAT:
1. JAWAB HANYA berdasarkan DATA KONTEKS di bawah. Jangan mengarang angka, tren, atau fakta yang tidak ada dalam konteks.
2. Jika pengguna bertanya di luar cakupan data konteks (mis. APK, APM, Skor AN, PISA, ATS), katakan dengan jujur: "Data tersebut belum tersedia secara live di dashboard ini."
3. Selalu sebutkan angka spesifik dari konteks saat membuat klaim.
4. Bedakan dengan jelas antara: (a) apa yang ditunjukkan data, dan (b) interpretasi/hipotesis Anda.
5. Ingat keterbatasan data: banyak sekolah belum memiliki data akreditasi, dan sebagian PT tidak memiliki kode provinsi. Sebutkan jika memengaruhi kesimpulan.
6. Format jawaban menggunakan Markdown: heading (##, ###), bullet list (-), bold untuk angka penting, dan tabel jika membandingkan banyak wilayah. Maksimal 300 kata kecuali diminta lebih.
7. Jangan pernah menyebut bahwa Anda adalah AI atau model bahasa. Anda adalah "analis dashboard".

DATA KONTEKS:
${context}`;

const SYSTEM_PROMPT_EXTERNAL = `Anda adalah analis kebijakan pendidikan dengan pengetahuan luas tentang sistem pendidikan Indonesia dan global. Pengguna sedang menggunakan fitur "Analisis Lanjut" yang SECARA EKSPLISIT menggunakan pengetahuan Anda di luar data dashboard.

ATURAN:
1. Anda BOLEH merujuk pada kebijakan, regulasi, laporan internasional (PISA, Bank Dunia, UNESCO), dan tren global yang Anda ketahui.
2. Namun, Anda HARUS menandai dengan jelas mana yang merupakan: (a) pengetahuan umum yang mapan, (b) estimasi/rentang yang mungkin berubah, atau (c) spekulasi/hipotesis. Gunakan label seperti "[Pengetahuan umum]", "[Estimasi]", "[Hipotesis]".
3. JANGAN mengklaim angka spesifik terbaru seolah-olah Anda memiliki akses real-time. Jika angka berubah dari waktu ke waktu, sebutkan tahun atau sumber perkiraannya.
4. Selalu ingatkan pengguna bahwa analisis ini TIDAK menggunakan data dashboard dan harus diverifikasi dengan sumber primer.
5. Format jawaban menggunakan Markdown: heading (##, ###), bullet list (-), bold untuk penekanan. Maksimal 300 kata.
6. Di awal jawaban pertama, sertakan kalimat: "Catatan: analisis ini menggunakan pengetahuan umum di luar data dashboard."`;

function liveChat(userText, onChunk) {
  return callPuterAI([{ role: 'system', content: SYSTEM_PROMPT_ANALISIS_DATA(buildDataContext()) }, { role: 'user', content: userText }], { onChunk });
}
function renderAnalisisData() {
  const el = document.getElementById('page-analisis-data');
  el.innerHTML = `<h2 class="page-title">🤖 Analisis Data</h2>
    <p class="page-subtitle">Tanyakan apa pun tentang data <b>live</b> yang sedang ditampilkan (sekolah, akreditasi, perguruan tinggi, beasiswa). AI menjawab <b>hanya berdasarkan data konteks</b>.</p>
    <div id="analisis-data-chat"></div>`;
  createChatUI('analisis-data-chat', {
    placeholder: 'Contoh: Provinsi mana yang persentase sekolah berakreditasi A-nya paling rendah?',
    welcomeText: 'Halo. Saya adalah **analis dashboard**. Konteks saya adalah **data live API Indonesia** sesuai filter yang aktif.\n\nSilakan bertanya tentang **jumlah & akreditasi sekolah**, **perbandingan provinsi**, **perguruan tinggi**, atau **beasiswa yang sedang dibuka**.',
    onSend: liveChat,
  });
}
const PREDEFINED_ANALYSES = [
  { id: 'akreditasi-gap', title: 'Ketimpangan Akreditasi Antarprovinsi', desc: 'Membandingkan % sekolah berakreditasi A antarprovinsi dan mengidentifikasi wilayah tertinggal.',
    prompt: `Berdasarkan data per provinsi (jumlah sekolah dan % akreditasi A), lakukan analisis ketimpangan:
1. Sebutkan rentang (max-min) dan rata-rata sederhana % akreditasi A.
2. Identifikasi 5 provinsi terendah dan 5 tertinggi (tabel Markdown).
3. Apakah ada pola geografis (Papua, Nusa Tenggara, Jawa, dll.)?
4. Jelaskan keterbatasan data (sekolah tanpa data akreditasi).
Akhiri dengan **3 rekomendasi kebijakan** yang spesifik.` },
  { id: 'akses-pt', title: 'Akses Pendidikan Tinggi per Provinsi', desc: 'Membandingkan jumlah sekolah dengan jumlah perguruan tinggi (PTN/PTS) di tiap provinsi.',
    prompt: `Berdasarkan data jumlah sekolah, jumlah PT, dan PTN per provinsi:
1. Hitung dan urutkan rasio "sekolah per PT"; tampilkan 5 provinsi dengan rasio tertinggi (akses PT paling terbatas) dalam tabel.
2. Provinsi mana yang PTN-nya paling sedikit?
3. Sebutkan dampak PT tanpa kode provinsi terhadap analisis.
4. Berikan **3 rekomendasi** perluasan akses pendidikan tinggi.` },
  { id: 'beasiswa', title: 'Peluang Beasiswa Saat Ini', desc: 'Merangkum beasiswa yang sedang/segera dibuka dan mencocokkannya dengan wilayah yang aksesnya rendah.',
    prompt: `Berdasarkan data beasiswa (status hari ini) dan data akses PT per provinsi:
1. Daftar beasiswa yang dibuka/segera dibuka dalam tabel (nama, jenjang, lokasi studi, tanggal tutup).
2. Beasiswa mana yang paling relevan untuk lulusan SMA/SMK di provinsi dengan akses PT terbatas?
3. Usulkan **3 aksi sosialisasi** konkret untuk sekolah/pemda.` },
  { id: 'early-warning', title: 'Prioritas Intervensi (Early Warning)', desc: 'Menyusun prioritas wilayah berdasarkan akreditasi A rendah dan akses PT terbatas.',
    prompt: `Gunakan data per provinsi untuk menyusun prioritas intervensi:
1. Beri skor sederhana: akreditasi A jauh di bawah rata-rata, rasio sekolah per PT tinggi, PTN sedikit.
2. Sajikan 7 provinsi prioritas dalam tabel dengan alasan.
3. Bedakan apa yang ditunjukkan data vs hipotesis penyebabnya.
4. Berikan **3 rekomendasi** intervensi.` },
  { id: 'kualitas-data', title: 'Kelengkapan & Kualitas Data', desc: 'Menilai celah data (akreditasi kosong, PT tanpa provinsi) dan dampaknya bagi kebijakan berbasis data.',
    prompt: `Nilai kelengkapan data dalam konteks:
1. Berapa proporsi sekolah tanpa data akreditasi? Berapa PT tanpa kode provinsi?
2. Indikator apa yang belum tersedia secara live (sebutkan dari konteks)?
3. Apa risikonya bagi pengambilan keputusan?
4. Usulkan **3 langkah** perbaikan ekosistem data (DPI) pendidikan.` },
];
function renderPredefined() {
  const el = document.getElementById('page-analisis-predefined');
  el.innerHTML = `<h2 class="page-title">📋 Pre-defined Analysis</h2>
    <p class="page-subtitle">Pilih salah satu analisis di bawah. AI akan menggunakan <b>data live dashboard</b> sesuai filter aktif.</p>
    <div class="predefined-grid">${PREDEFINED_ANALYSES.map(a => `<div class="predefined-card" data-analysis-id="${a.id}"><h3>${a.title}</h3><p>${a.desc}</p></div>`).join('')}</div>
    <div id="predefined-chat" class="mt-16"></div>`;
  const chat = createChatUI('predefined-chat', {
    placeholder: 'Pilih analisis di atas, atau ketik pertanyaan lanjutan…',
    systemNote: 'Pilih salah satu kartu analisis untuk memulai. AI akan menjawab berdasarkan data konteks live.',
    onSend: liveChat,
  });
  document.querySelectorAll('.predefined-card').forEach(card => card.addEventListener('click', () => {
    document.querySelectorAll('.predefined-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const a = PREDEFINED_ANALYSES.find(x => x.id === card.dataset.analysisId);
    if (a) chat.sendMessage(`**[${a.title}]**\n\n${a.prompt}`, a.prompt);
  }));
}
function renderAnalisisLanjut() {
  const el = document.getElementById('page-analisis-lanjut');
  el.innerHTML = `<h2 class="page-title">🧠 Analisis Lanjut</h2>
    <p class="page-subtitle">Analisis yang menggunakan <b>pengetahuan umum AI di luar data dashboard</b>.</p>
    <div class="warning-box"><strong>⚠️ Perhatian:</strong> Fitur ini <b>tidak menggunakan data dashboard</b>. AI akan menjawab berdasarkan pengetahuan umum, kebijakan publik, laporan internasional, dan tren global yang dikenalinya. Angka dan klaim <b>harus diverifikasi</b> dengan sumber primer. Gunakan halaman <b>Analisis Data</b> atau <b>Pre-defined Analysis</b> jika Anda memerlukan analisis yang terikat pada data dashboard.</div>
    <div id="analisis-lanjut-chat"></div>`;
  createChatUI('analisis-lanjut-chat', {
    placeholder: 'Contoh: Bagaimana kebijakan pendidikan Finlandia dibandingkan Indonesia?',
    systemNote: 'Mode ini menggunakan pengetahuan umum di luar data dashboard. Verifikasi klaim dengan sumber primer.',
    welcomeText: 'Selamat datang di **Analisis Lanjut**. Saya dapat membahas kebijakan pendidikan dari berbagai negara, tren global, regulasi, dan literatur — tanpa terikat pada data dashboard.\n\n**Ingat**: pengetahuan saya memiliki batas waktu dan harus diverifikasi.',
    onSend: async (userText, onChunk) => callPuterAI([{ role: 'system', content: SYSTEM_PROMPT_EXTERNAL }, { role: 'user', content: userText }], { onChunk }),
  });
}
