/**
 * ============================================================================
 *  APLIKASI CBT — BACKEND (Google Apps Script)
 *  Fungsi sebagai REST-like API di atas Google Sheets sebagai database.
 * ============================================================================
 *  CARA DEPLOY (PERTAMA KALI):
 *  1. Buat Google Sheet baru (kosong), buka Extensions > Apps Script.
 *  2. Hapus isi default, tempel seluruh isi file ini ke Code.gs.
 *  3. Jalankan fungsi `setupAwal` sekali (Run > setupAwal) untuk membuat
 *     seluruh sheet, akun guru pertama, DAN trigger flush berkala (lihat
 *     "ARSITEKTUR SKALA" di bawah — WAJIB, bukan opsional). Izinkan semua
 *     permission yang diminta (termasuk izin trigger/otomatisasi).
 *  4. Deploy > New deployment > Type: Web app.
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Salin URL Web App yang dihasilkan, tempel ke CONFIG.API_URL di app.js.
 *
 *  CARA UPDATE KODE INI DI KEMUDIAN HARI (mis. menambah kolom/fitur baru):
 *  1. Tempel/timpa seluruh isi Code.gs dengan versi baru.
 *  2. Deploy > Manage deployments > (ikon pensil) > Version: New version > Deploy.
 *  3. SELESAI untuk update kolom/fitur biasa — tidak perlu setupAwal lagi,
 *     dan TIDAK PERLU menambah kolom apa pun manual di Sheets (lihat "SKEMA
 *     OTOMATIS" di bawah).
 *
 *  ⚠️ KHUSUS UPDATE PERTAMA KALI KE VERSI INI (arsitektur cache+flush untuk
 *  skala 500+ siswa): setelah tempel & deploy versi baru, jalankan fungsi
 *  `pasangTriggerFlush_` SEKALI dari editor Apps Script (dropdown fungsi >
 *  pilih `pasangTriggerFlush_` > Run). Ini memasang trigger waktu (tiap 1
 *  menit) yang menuliskan data dari cache ke Sheets — TANPA trigger ini,
 *  jawaban/sesi siswa akan tersimpan di cache tapi TIDAK PERNAH masuk ke
 *  Sheets. Kalau lupa, cukup jalankan `setupAwal` lagi (aman, tidak
 *  menghapus data yang sudah ada) — itu juga memasang trigger yang sama.
 * ============================================================================
 *  SKEMA OTOMATIS — kolom baru tidak perlu ditambah manual di Sheets
 *  Daftar kolom tiap sheet didefinisikan SATU KALI di objek SCHEMA di bawah.
 *  Setiap ada request masuk (doGet/doPost), pastikanSkemaTerbaru_() otomatis
 *  membandingkan SCHEMA ini dengan header yang sudah ada di tiap sheet, dan
 *  menambahkan kolom yang belum ada ke ujung kanan sheet tsb (data lama tidak
 *  tersentuh/tergeser). Jadi kalau nanti mau menambah field baru:
 *    - Tambahkan nama kolomnya ke array SCHEMA sheet terkait di bawah ini.
 *    - Pakai field itu di action yang relevan (baca/tulis lewat nama kolom,
 *      seperti yang sudah dipakai di seluruh file ini — TIDAK perlu ubah
 *      readAll_/appendObj_/updateRowByFields_, semua sudah otomatis mengikuti
 *      nama kolom apa pun yang ada di header).
 *    - Redeploy ("New version"). Kolom baru otomatis muncul di Sheet saat
 *      permintaan pertama masuk — tidak perlu buka Sheets sama sekali.
 *  Pengecekan ini murah (dicache lewat properti skrip & hash isi SCHEMA), jadi
 *  aman dipanggil di setiap request tanpa membebani kuota secara berarti.
 * ============================================================================
 *  ARSITEKTUR SKALA — cache dulu, Sheets belakangan (untuk 500+ siswa bersamaan)
 *  Empat aksi yang paling sering dipanggil siswa (mulaiUjian, simpanJawaban/
 *  autosave tiap 20 detik, lapor pelanggaran, submitUjian) TIDAK LAGI langsung
 *  membaca/menulis Google Sheets satu per satu. Semuanya lewat CacheService
 *  dulu (super cepat, ~10-50ms, nyaris tidak pernah bentrok antar siswa karena
 *  tiap sesi punya kunci cache sendiri) — lihat fungsi ambilSesiState_ /
 *  simpanSesiState_ / tandaiPendingSesi_. Data yang tertunda itu baru
 *  benar-benar ditulis ke Sheets secara BERKALA & BERKELOMPOK (batch, paling
 *  banyak 2 operasi tulis per siklus, tidak peduil 5 atau 500 siswa) oleh
 *  flushSesiBerkala(), dipicu trigger waktu tiap 1 menit. Ping heartbeat
 *  (device lock) memakai pola yang sama lewat flushPingBerkala(). Hasilnya:
 *  500 siswa autosave/mulai/submit "bersamaan" tidak lagi berebut satu kunci
 *  global untuk operasi Sheets yang lambat (~0.5-2 detik) — nyaris semua
 *  request selesai dalam hitungan puluhan milidetik.
 *
 *  Konsekuensi yang perlu diketahui (trade-off yang disengaja & aman):
 *   - Ada jeda maksimal ~1 menit sebelum data "benar-benar" terlihat kalau
 *     guru membuka Google Sheets-nya langsung secara manual. Dari sisi
 *     aplikasi sendiri (rekap nilai, hasil ujian siswa) TIDAK ada jeda —
 *     semuanya membaca cache dulu (lihat actionGetHasil_), jadi tetap akurat
 *     & instan.
 *   - Kalau baru pertama kali pakai versi ini, WAJIB jalankan
 *     `pasangTriggerFlush_` sekali (lihat catatan di atas) — tanpa ini data
 *     akan menumpuk di cache dan tidak pernah masuk Sheets.
 *   - Sheet "Sesi" tetap punya baris sebanyak (jumlah siswa x jumlah ujian
 *     yang diikuti) — bukan tiap jawaban — jumlah baris tetap wajar.
 *   - Jika sekolah punya akun Google Workspace, quota eksekusi & concurrent
 *     lebih tinggi dibanding akun Gmail biasa — tetap disarankan untuk ujian
 *     skala besar, walau arsitektur ini sudah jauh mengurangi kebutuhannya.
 *   - Untuk skala JAUH lebih besar (ribuan siswa) atau butuh keandalan
 *     tingkat produksi, backend ini tetap bisa dimigrasikan ke Firebase/
 *     Supabase tanpa mengubah banyak di frontend (kontrak API sama).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// KONFIGURASI
// ----------------------------------------------------------------------------
var SHEET = {
  GURU: 'Guru',
  SISWA: 'Siswa',
  BANK_SOAL: 'BankSoal',
  UJIAN: 'Ujian',
  SESI: 'Sesi',
  LOG: 'PelanggaranLog',
  CONFIG: 'Config',
  BUKTI: 'BuktiOrek',
  SURVEI: 'Survei',
  PAKET_SURVEI: 'PaketSurvei'
};

// SATU-SATUNYA tempat mendefinisikan kolom tiap sheet. Menambah 1 nama di
// sini (lalu redeploy) = kolom itu otomatis tercipta di Sheets, tanpa perlu
// dibuka/diedit manual. Urutan array = urutan kolom untuk SHEET BARU; untuk
// sheet yang sudah ada, kolom yang belum ada akan ditambahkan di ujung kanan.
var SCHEMA = {
  Guru: ['id', 'username', 'password', 'nama', 'tema_json'],
  // 'blokir' ('ya' = akun diblokir), 'blokir_alasan' & 'blokir_sejak' dipakai fitur "Blokir Akun
  // Siswa" (hukuman bagi siswa yang tidak serius mengerjakan kuis). Selama blokir = 'ya', siswa itu
  // tidak bisa memulai/melanjutkan ujian apa pun, sementara teman sekelasnya tetap normal.
  Siswa: ['id', 'username', 'password', 'nama', 'kelas', 'device_id', 'last_ping', 'blokir', 'blokir_alasan', 'blokir_sejak', 'nisn', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir'],
  // 'tingkat_kesulitan' & 'subkategori' adalah CONTOH kolom yang ditambahkan lewat
  // mekanisme skema otomatis ini (lihat README bag. "Menambah kolom baru") — sudah
  // dipakai juga oleh index.html & app.js versi ini. 'subkategori' dipakai untuk
  // mengelompokkan soal dalam 1 kategori yang sama (mis. "Bab 1" vs "Bab 2" dalam
  // kategori "Ulangan Harian") supaya tidak tercampur saat memilih soal untuk ujian.
  // 'status' ('aktif'/'arsip') ditambahkan supaya soal yang dibuat tapi belum
  // dipakai bisa diarsipkan tanpa dihapus permanen (lihat README/UI "Kelola
  // Kategori" & tombol Arsipkan di Bank Soal). Kosong dianggap 'aktif'.
  // 'topik' (Topik/Kompetensi bebas diketik), 'audio' & 'video' (link media pendukung
  // soal, mis. untuk soal listening/video) ditambahkan lewat mekanisme skema otomatis
  // yang sama -- lihat README bag. "Menambah kolom baru" & tampilan "Kelola Soal".
  BankSoal: ['id', 'guru_id', 'kategori', 'subkategori', 'tipe', 'topik', 'pertanyaan', 'gambar', 'audio', 'video', 'opsi_json', 'kunci_json', 'bobot', 'tingkat_kesulitan', 'pembahasan', 'status', 'dibuat'],
  Ujian: ['id', 'guru_id', 'judul', 'kategori', 'subkategori', 'soal_ids', 'durasi_menit', 'token', 'mulai', 'selesai', 'toleransi_menit', 'max_pelanggaran', 'acak_soal', 'acak_opsi', 'nilai_lulus', 'status', 'instruksi_remedial', 'pesan_nilai', 'tampil_detail', 'tampil_pembahasan', 'bukti_orek', 'survei', 'survei_tampil', 'survei_butir', 'token_kelas'],
  // 'tambahan_detik' dipakai fitur "Pemantauan Ujian" (tombol "Tambah Waktu") --
  // jumlah detik ekstra yang diberikan guru ke satu sesi siswa tertentu, di luar
  // durasi_menit standar ujian. Kosong/0 berarti tidak ada tambahan.
  Sesi: ['id', 'ujian_id', 'siswa_id', 'device_id', 'mulai', 'selesai', 'status', 'pelanggaran', 'urutan_json', 'jawaban_json', 'ragu_json', 'nilai', 'lulus', 'last_ping', 'tambahan_detik'],
  PelanggaranLog: ['id', 'sesi_id', 'siswa_id', 'ujian_id', 'waktu', 'jenis', 'detail'],
  Config: ['key', 'value'],
  // Foto bukti orak-orik (coretan) jawaban siswa -- fitur opsional per ujian (kolom Ujian.bukti_orek:
  // '' = nonaktif, 'wajib' = siswa harus unggah min. 1 foto, 'opsional' = boleh dilewati).
  // 'kunci' = kode unik per foto dari klien supaya pengiriman ULANG (mis. sinyal putus) tidak membuat duplikat.
  BuktiOrek: ['id', 'sesi_id', 'siswa_id', 'ujian_id', 'kunci', 'file_id', 'url', 'nama', 'bytes', 'waktu'],
  // Jawaban Survei Karakter / Survei Lingkungan Belajar (Sulingjar) setelah ujian -- diatur per ujian lewat
  // kolom Ujian.survei ('' nonaktif | 'auto' | 'karakter' | 'sulingjar') & Ujian.survei_tampil.
  // jawaban_json = {"K01":3,...} (nomor pilihan 1-4); kualitas_json = hasil cek pengisian dari klien.
  // Indeks dimensi dihitung di klien (survei.js) dari jawaban mentah ini.
  Survei: ['id', 'sesi_id', 'siswa_id', 'ujian_id', 'jenis', 'jawaban_json', 'durasi_detik', 'kualitas_json', 'waktu'],
  // PAKET SURVEI di Bank Soal: butir Survei Karakter / Sulingjar yang menyatu dengan soal satu kategori (mis. Numerasi
  // + Survei Karakter, Literasi + Sulingjar). Disimpan sekali, dipakai berkali-kali oleh ujian berkategori sama sampai
  // dihapus. Satu baris per (guru, kategori, jenis). butir_json = {jenis, dim, butir, pasangan, petunjuk}.
  PaketSurvei: ['id', 'guru_id', 'kategori', 'jenis', 'butir_json', 'diubah']
};

var DEVICE_STALE_MINUTES = 15; // sesi dianggap "lepas" jika tidak ping selama ini (menit)
var CACHE = CacheService.getScriptCache();

// ----------------------------------------------------------------------------
// SKEMA OTOMATIS — lihat penjelasan panjang di komentar atas file.
// ----------------------------------------------------------------------------

// Dipanggil di awal setiap request (lihat route_). Sangat murah kalau tidak
// ada perubahan (1x baca properti skrip), dan hanya benar-benar menyentuh
// Sheets kalau isi SCHEMA di atas berubah sejak deploy terakhir.
function pastikanSkemaTerbaru_() {
  var props = PropertiesService.getScriptProperties();
  var versiSaatIni = hashSkema_();
  if (props.getProperty('schema_version') === versiSaatIni) return; // tidak ada perubahan skema, lewati
  terapkanSkema_();
  props.setProperty('schema_version', versiSaatIni);
}

// Hash otomatis dari isi SCHEMA — berubah sendiri begitu ada kolom/sheet baru
// ditambahkan di atas, TANPA perlu menaikkan nomor versi apa pun secara manual.
function hashSkema_() {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(SCHEMA));
  return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

// Benar-benar membuat sheet yang belum ada & menambahkan kolom yang belum ada
// di sheet yang sudah ada (append di ujung kanan, tidak mengubah data lama).
function terapkanSkema_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (nama) {
    pastikanSheetDanKolom_(ss, nama, SCHEMA[nama]);
  });
}

function pastikanSheetDanKolom_(ss, nama, headers) {
  var sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    CacheService.getScriptCache().remove('headers_' + nama);
    return;
  }
  var lastCol = sh.getLastColumn();
  var headerSaatIni = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var kolomBaru = headers.filter(function (h) { return headerSaatIni.indexOf(h) === -1; });
  if (kolomBaru.length > 0) {
    sh.getRange(1, headerSaatIni.length + 1, 1, kolomBaru.length).setValues([kolomBaru]);
    CacheService.getScriptCache().remove('headers_' + nama); // header berubah -> cache lama jadi basi
    Logger.log('Kolom baru ditambahkan ke sheet "' + nama + '": ' + kolomBaru.join(', '));
  }
  if (sh.getFrozenRows() < 1) sh.setFrozenRows(1);
}

// Jalankan fungsi ini secara MANUAL dari editor Apps Script (dropdown fungsi
// di atas > pilih "paksaSinkronSkemaSekarang" > Run) kalau ingin memaksa
// pengecekan/penambahan kolom TERJADI SAAT INI JUGA, tanpa menunggu request
// pertama dari aplikasi (mis. untuk langsung memeriksa hasilnya di Sheets).
function paksaSinkronSkemaSekarang() {
  terapkanSkema_();
  PropertiesService.getScriptProperties().setProperty('schema_version', hashSkema_());
  Logger.log('Skema disinkronkan. Semua kolom di SCHEMA sudah dipastikan ada di tiap sheet.');
}

// ----------------------------------------------------------------------------
// SETUP AWAL — jalankan sekali secara manual dari editor Apps Script
// ----------------------------------------------------------------------------
function setupAwal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  terapkanSkema_();
  PropertiesService.getScriptProperties().setProperty('schema_version', hashSkema_());

  // Buat 1 akun guru contoh jika sheet Guru masih kosong
  var guruSheet = ss.getSheetByName(SHEET.GURU);
  if (guruSheet.getLastRow() < 2) {
    guruSheet.appendRow(['G001', 'admin', 'admin123', 'Administrator', JSON.stringify(defaultTema_())]);
  }

  // WAJIB untuk skala 500+ siswa bersamaan: trigger ini yang menuliskan
  // jawaban/sesi/ping dari cache ke Sheets secara berkala (tiap 1 menit).
  // Tanpa trigger ini, data akan menumpuk di cache & TIDAK PERNAH masuk ke
  // Sheets. Aman dijalankan berulang (trigger lama otomatis diganti).
  pasangTriggerFlush_();

  Logger.log('Setup selesai. Login guru default -> username: admin / password: admin123 (SEGERA GANTI).');
}

function defaultTema_() {
  return { primary: '#e58a72', secondary: '#6f9f94', accent: '#e9b44c', bg: '#faf6f1', text: '#2d2a26' };
}

// ----------------------------------------------------------------------------
// ENTRY POINTS
// ----------------------------------------------------------------------------
function doGet(e) {
  try {
    var action = e.parameter.action;
    var data = e.parameter;
    return route_(action, data);
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    return route_(body.action, body);
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function route_(action, data) {
  pastikanSkemaTerbaru_(); // self-healing: tambahkan kolom baru dari SCHEMA jika belum ada
  var lock = LockService.getScriptLock();
  switch (action) {
    // --- AUTH ---
    case 'login': return actionLogin_(data);
    case 'logout': return actionLogout_(data);
    case 'ping': return actionPing_(data);

    // --- GURU: BANK SOAL ---
    case 'simpanSoal': return withLock_(lock, function () { return actionSimpanSoal_(data); });
    case 'importSoal': return withLock_(lock, function () { return actionImportSoal_(data); });
    case 'hapusSoal': return withLock_(lock, function () { return actionHapusSoal_(data); });
    case 'hapusSoalBanyak': return withLock_(lock, function () { return actionHapusSoalBanyak_(data); });
    case 'ubahStatusSoalBanyak': return withLock_(lock, function () { return actionUbahStatusSoalBanyak_(data); });
    case 'ubahNamaKategori': return withLock_(lock, function () { return actionUbahNamaKategori_(data); });
    case 'getBankSoal': return actionGetBankSoal_(data);

    // --- GURU: UJIAN ---
    case 'simpanUjian': return withLock_(lock, function () { return actionSimpanUjian_(data); });
    case 'hapusUjian': return withLock_(lock, function () { return actionHapusUjian_(data); });
    case 'getDaftarUjian': return actionGetDaftarUjian_(data);
    case 'getRekapNilai': return actionGetRekapNilai_(data);
    case 'hitungUlangNilaiUjian': return withLock_(lock, function () { return actionHitungUlangNilaiUjian_(data); });
    case 'getAnalisisSoal': return actionGetAnalisisSoal_(data);
    case 'getLogPelanggaran': return actionGetLogPelanggaran_(data);
    case 'resetDevice': return withLock_(lock, function () { return actionResetDevice_(data); });
    case 'resetDeviceKelas': return withLock_(lock, function () { return actionResetDeviceKelas_(data); });

    // --- GURU: PEMANTAUAN UJIAN (live monitoring) ---
    case 'getPemantauanUjian': return actionGetPemantauanUjian_(data);
    case 'pemantauanTambahWaktu': return withLock_(lock, function () { return actionPemantauanTambahWaktu_(data); });
    case 'pemantauanForceFinish': return withLock_(lock, function () { return actionPemantauanForceFinish_(data); });
    case 'pemantauanHapusPelanggaran': return withLock_(lock, function () { return actionPemantauanHapusPelanggaran_(data); });
    case 'pemantauanReset': return withLock_(lock, function () { return actionPemantauanReset_(data); });
    case 'hapusNilaiSiswa': return withLock_(lock, function () { return actionHapusNilaiSiswa_(data); });
    // Tombol "Kirim ke Spreadsheet" (opsi cadangan di sidebar guru): memaksa
    // seluruh sesi/ping yang masih tertahan di cache langsung ditulis ke
    // Sheets sekarang juga, tanpa menunggu trigger otomatis (maks. ~1 menit).
    case 'paksaFlushSesiSekarang': return actionPaksaFlushSesiSekarang_(data);

    // --- GURU: SISWA & TEMA ---
    case 'importSiswa': return withLock_(lock, function () { return actionImportSiswa_(data); });
    case 'updateSiswa': return withLock_(lock, function () { return actionUpdateSiswa_(data); });
    case 'hapusSiswa': return withLock_(lock, function () { return actionHapusSiswa_(data); });
    case 'hapusKelas': return withLock_(lock, function () { return actionHapusKelas_(data); });
    case 'getDaftarSiswa': return actionGetDaftarSiswa_(data);
    case 'blokirSiswa': return withLock_(lock, function () { return actionBlokirSiswa_(data); });
    case 'uploadBuktiOrek': return actionUploadBuktiOrek_(data); // kunci dipegang sebentar di dalam (hanya saat menulis baris)
    case 'getBuktiOrek': return actionGetBuktiOrek_(data);
    case 'setTokenKelas': return withLock_(lock, function () { return actionSetTokenKelas_(data); });
    case 'getPaketSurvei': return actionGetPaketSurvei_(data);
    case 'simpanPaketSurvei': return withLock_(lock, function () { return actionSimpanPaketSurvei_(data); });
    case 'hapusPaketSurvei': return withLock_(lock, function () { return actionHapusPaketSurvei_(data); });
    case 'getSurveiSesi': return actionGetSurveiSesi_(data);
    case 'simpanSurvei': return actionSimpanSurvei_(data);
    case 'getRekapSurvei': return actionGetRekapSurvei_(data);
    case 'hapusBuktiOrek': return withLock_(lock, function () { return actionHapusBuktiOrek_(data); });
    case 'updateAkunGuru': return withLock_(lock, function () { return actionUpdateAkunGuru_(data); });
    case 'simpanTema': return withLock_(lock, function () { return actionSimpanTema_(data); });
    case 'getTema': return actionGetTema_(data);
    case 'simpanBranding': return withLock_(lock, function () { return actionSimpanBranding_(data); });
    case 'getBranding': return actionGetBranding_(data);
    case 'uploadGambar': return actionUploadGambar_(data);
    case 'getPengaturanLock': return actionGetPengaturanLock_(data);
    case 'simpanPengaturanLock': return withLock_(lock, function () { return actionSimpanPengaturanLock_(data); });
    case 'getPengaturanTokenSiswa': return actionGetPengaturanTokenSiswa_(data);
    case 'simpanPengaturanTokenSiswa': return withLock_(lock, function () { return actionSimpanPengaturanTokenSiswa_(data); });
    case 'getTokenAktif': return actionGetTokenAktif_(data);

    // --- SISWA: UJIAN ---
    // CATATAN SKALA: mulaiUjian/simpanJawaban/lapor/submitUjian TIDAK lagi
    // dibungkus withLock_ di sini. Dulu setiap panggilan (autosave tiap 20
    // detik x 500 siswa) berebut SATU kunci global untuk baca-ubah-tulis
    // langsung ke Sheets (lambat, ~0.5-2 detik/operasi) -> gampang timeout
    // "Server sedang sibuk" saat banyak siswa bersamaan. Sekarang keempat
    // aksi ini menulis ke CacheService dulu (super cepat, hampir tidak
    // pernah bentrok karena tiap siswa punya kunci cache sendiri-sendiri),
    // lalu data itu benar-benar ditulis ke Sheets secara BERKALA & BERKELOMPOK
    // oleh flushSesiBerkala() (dipicu trigger tiap 1 menit, lihat
    // pasangTriggerFlush_ & README). Kunci global cuma dipakai sebentar sekali
    // (hitungan milidetik) untuk menjaga daftar "sesi yang perlu di-flush"
    // tetap konsisten -- lihat tandaiPendingSesi_.
    case 'cekToken': return actionCekToken_(data);
    case 'mulaiUjian': return actionMulaiUjian_(data);
    case 'simpanJawaban': return actionSimpanJawaban_(data);
    case 'lapor': return actionLapor_(data);
    case 'catatAktivitas': return actionCatatAktivitas_(data);
    case 'getLogPelanggaran': return actionGetLogPelanggaran_(data);
    case 'submitUjian': return actionSubmitUjian_(data);
    case 'getHasil': return actionGetHasil_(data);
    case 'getDetailJawaban': return actionGetDetailJawaban_(data);

    default: return jsonOut_({ ok: false, error: 'Aksi tidak dikenal: ' + action });
  }
}

function withLock_(lock, fn) {
  var got = lock.tryLock(8000);
  if (!got) return jsonOut_({ ok: false, error: 'Server sedang sibuk, silakan coba lagi.' });
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------------
// HELPERS SHEET
// ----------------------------------------------------------------------------
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sh_(name) { return ss_().getSheetByName(name); }

// kunci_json "0" (opsi A) otomatis diubah Google Sheets jadi ANGKA 0 -- jangan
// pakai `x || 'null'` (0 dianggap kosong). Selalu baca lewat helper ini.
function parseKunciJson_(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  var t = String(raw).trim();
  if (t === '') return null;
  try { return JSON.parse(t); } catch (e) { return null; }
}

function readAll_(name) {
  var sh = sh_(name);
  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function findRowIndexById_(name, id) {
  var sh = sh_(name);
  var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // 1-indexed + header
  }
  return -1;
}

// Token ujian 6 karakter tanpa angka 0, huruf O, angka 1, huruf I (sulit dibedakan).
function buatTokenAman_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var hasil = '';
  for (var i = 0; i < 6; i++) hasil += chars.charAt(Math.floor(Math.random() * chars.length));
  return hasil;
}

function genId_(prefix) {
  return prefix + '_' + Utilities.getUuid().split('-')[0] + Date.now().toString(36).slice(-4);
}

function appendObj_(name, headers, obj) {
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sh_(name).appendRow(row);
}

function updateRowByFields_(name, headers, rowIndex, fields) {
  var sh = sh_(name);
  var current = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (h, i) {
    if (fields.hasOwnProperty(h)) current[i] = fields[h];
  });
  sh.getRange(rowIndex, 1, 1, headers.length).setValues([current]);
}

function headersOf_(name) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('headers_' + name);
  if (cached) return JSON.parse(cached);
  var headers = sh_(name).getRange(1, 1, 1, sh_(name).getLastColumn()).getValues()[0];
  cache.put('headers_' + name, JSON.stringify(headers), 21600);
  return headers;
}

// ----------------------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------------------
function actionLogin_(data) {
  var role = data.role; // 'guru' | 'siswa'
  var username = String(data.username || '').trim();
  var password = String(data.password || '');
  var deviceId = String(data.deviceId || '');

  if (role === 'guru') {
    var guru = readAll_(SHEET.GURU).filter(function (g) { return g.username === username; })[0];
    if (!guru || String(guru.password) !== password) {
      return jsonOut_({ ok: false, error: 'Username atau password guru salah.' });
    }
    return jsonOut_({ ok: true, user: { id: guru.id, nama: guru.nama, username: guru.username, role: 'guru' } });
  }

  if (role === 'siswa') {
    var rows = readAll_(SHEET.SISWA);
    var idx = -1, siswa = null;
    // Toleran: abaikan huruf besar/kecil & spasi pinggir pada username (mis. keyboard HP
    // yang otomatis menulis huruf besar), username/password yang tersimpan sbg angka di
    // Sheets, dan akun dengan username ganda (dicocokkan lewat password-nya).
    var uLogin = username.toLowerCase();
    var pLogin = password.trim();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].username).trim().toLowerCase() === uLogin && String(rows[i].password).trim() === pLogin) {
        siswa = rows[i]; idx = i + 2; break;
      }
    }
    if (!siswa) {
      return jsonOut_({ ok: false, error: 'Username atau password siswa salah.' });
    }

    // --- single device session lock (bisa dinonaktifkan lewat tab Status Login) ---
    var now = new Date();
    var lastPing = siswa.last_ping ? new Date(siswa.last_ping) : null;
    var staleMs = DEVICE_STALE_MINUTES * 60 * 1000;
    var deviceLocked = deviceLockAktif_() && siswa.device_id && lastPing && (now - lastPing) < staleMs && siswa.device_id !== deviceId;
    if (deviceLocked) {
      return jsonOut_({ ok: false, error: 'Akun ini sedang aktif di perangkat lain. Tutup sesi di perangkat tersebut atau tunggu beberapa menit, lalu coba lagi.' });
    }

    var headers = headersOf_(SHEET.SISWA);
    updateRowByFields_(SHEET.SISWA, headers, idx, { device_id: deviceId, last_ping: now.toISOString() });
    // Login jarang terjadi (sekali per sesi ujian, bukan tiap 20-60 detik
    // seperti autosave/ping) jadi tulis langsung ke Sheets di sini aman &
    // tidak jadi bottleneck. Cache device_id juga di-tulis di sini supaya
    // ping berikutnya (yang cache-first) langsung konsisten, tidak perlu
    // fallback baca Sheets dulu.
    CacheService.getScriptCache().put('siswa_device_' + siswa.id, deviceId, CACHE_TTL_DETIK);

    // Akun yang diblokir TETAP boleh login (supaya siswa melihat pesan & alasannya di portal),
    // tetapi tidak bisa mengikuti ujian -- ditegakkan di cekToken & mulaiUjian.
    var blokirInfo = statusBlokirSiswa_(siswa.id);
    return jsonOut_({ ok: true, user: { id: siswa.id, nama: siswa.nama, username: siswa.username, kelas: siswa.kelas, role: 'siswa', deviceId: deviceId, blokir: blokirInfo, nisn: String(siswa.nisn || ''), jenis_kelamin: String(siswa.jenis_kelamin || ''), tempat_lahir: String(siswa.tempat_lahir || ''), tanggal_lahir: tglIso_(siswa.tanggal_lahir) } });
  }

  return jsonOut_({ ok: false, error: 'Role tidak valid.' });
}

function actionLogout_(data) {
  if (data.role === 'siswa' && data.siswaId) {
    var idx = findRowIndexById_(SHEET.SISWA, data.siswaId);
    if (idx > 0) updateRowByFields_(SHEET.SISWA, headersOf_(SHEET.SISWA), idx, { device_id: '', last_ping: '' });
    CacheService.getScriptCache().remove('siswa_device_' + data.siswaId);
  }
  return jsonOut_({ ok: true });
}

// Dipanggil berkala oleh klien siswa (heartbeat, tiap 60 detik x bisa
// ratusan siswa sekaligus) supaya device lock tetap "hidup" & guru bisa
// melihat siapa yang online. Cache-first: cek/​perbarui device_id & last_ping
// lewat CacheService (cepat, tidak membebani Sheets), baru benar-benar
// ditulis ke Sheets secara berkala oleh flushPingBerkala() (lihat di atas).
function actionPing_(data) {
  var blokirPing = null;
  if (data.role === 'siswa' && data.siswaId) {
    var cache = CacheService.getScriptCache();
    var kunciDevice = 'siswa_device_' + data.siswaId;
    var deviceTercatat = cache.get(kunciDevice);
    if (deviceTercatat === null) {
      // Belum ada di cache (mis. baru pertama kali sejak deploy/restart) ->
      // ambil sekali dari Sheets sebagai fallback, lalu simpan ke cache.
      var idx = findRowIndexById_(SHEET.SISWA, data.siswaId);
      if (idx > 0) {
        var headers = headersOf_(SHEET.SISWA);
        var row = sh_(SHEET.SISWA).getRange(idx, 1, 1, headers.length).getValues()[0];
        deviceTercatat = row[headers.indexOf('device_id')] || '';
      } else {
        deviceTercatat = '';
      }
      cache.put(kunciDevice, deviceTercatat, CACHE_TTL_DETIK);
    }
    if (deviceLockAktif_() && deviceTercatat && data.deviceId && deviceTercatat !== data.deviceId) {
      return jsonOut_({ ok: false, error: 'Sesi diambil alih oleh perangkat lain.' });
    }
    tandaiPendingPing_(data.siswaId, { device_id: deviceTercatat || data.deviceId, last_ping: new Date().toISOString() });
    // Status blokir ikut dikirim balik tiap ping (cache-first, murah) supaya portal siswa
    // langsung ikut berubah begitu guru memblokir / membuka blokir, tanpa login ulang.
    blokirPing = statusBlokirSiswa_(data.siswaId);
  }
  return jsonOut_({ ok: true, blokir: blokirPing });
}

// ----------------------------------------------------------------------------
// GURU — BANK SOAL
// ----------------------------------------------------------------------------
function actionSimpanSoal_(data) {
  var headers = headersOf_(SHEET.BANK_SOAL);
  var soal = JSON.parse(data.soal);
  if (soal.id) {
    var idx = findRowIndexById_(SHEET.BANK_SOAL, soal.id);
    if (idx > 0) {
      updateRowByFields_(SHEET.BANK_SOAL, headers, idx, soal);
      return jsonOut_({ ok: true, id: soal.id });
    }
  }
  soal.id = genId_('S');
  soal.dibuat = new Date().toISOString();
  soal.status = soal.status || 'aktif';
  appendObj_(SHEET.BANK_SOAL, headers, soal);
  return jsonOut_({ ok: true, id: soal.id });
}

// data.soalList = JSON string array of soal objects (dari import CSV/XLSX di klien)
function actionImportSoal_(data) {
  var headers = headersOf_(SHEET.BANK_SOAL);
  var list = JSON.parse(data.soalList);
  var ids = [];
  var barisBaru = [];
  var sekarang = new Date().toISOString();
  list.forEach(function (soal) {
    soal.id = genId_('S');
    soal.dibuat = sekarang;
    soal.status = soal.status || 'aktif';
    barisBaru.push(headers.map(function (h) { return soal[h] !== undefined ? soal[h] : ''; }));
    ids.push(soal.id);
  });
  // PERF: tulis SEMUA baris sekaligus (1 panggilan setValues) -- sebelumnya
  // appendRow per soal (1 panggilan Sheets per baris => 100 soal ~ puluhan detik).
  if (barisBaru.length > 0) {
    var sh = sh_(SHEET.BANK_SOAL);
    sh.getRange(sh.getLastRow() + 1, 1, barisBaru.length, headers.length).setValues(barisBaru);
  }
  return jsonOut_({ ok: true, count: ids.length, ids: ids });
}

function actionHapusSoal_(data) {
  var idx = findRowIndexById_(SHEET.BANK_SOAL, data.id);
  if (idx > 0) sh_(SHEET.BANK_SOAL).deleteRow(idx);
  return jsonOut_({ ok: true });
}

// Hapus baris-baris (nomor baris 1-indexed, boleh tidak berurutan) dari sheet:
// yang berurutan dihapus dgn satu deleteRows, dari bawah ke atas agar nomor
// baris tidak bergeser.
function hapusBarisDariBawah_(sh, baris) {
  if (!baris.length) return;
  baris.sort(function (x, y) { return x - y; });
  // Sheets menolak menghapus SEMUA baris non-header; sisakan 1 baris kosong bila perlu.
  if (sh.getMaxRows() - baris.length < 2) sh.insertRowsAfter(sh.getMaxRows(), 1);
  var i2 = baris.length - 1;
  while (i2 >= 0) {
    var akhir = baris[i2], awal = akhir;
    while (i2 > 0 && baris[i2 - 1] === awal - 1) { awal = baris[--i2]; }
    sh.deleteRows(awal, akhir - awal + 1);
    i2--;
  }
}

// PERF: hapus BANYAK soal dalam 1 permintaan. ID dibaca sekali, baris yang
// berurutan dihapus dgn satu deleteRows (dari bawah ke atas agar nomor baris
// tidak bergeser). Sebelumnya: 1 permintaan + 1 pembacaan sheet + 1 deleteRow
// PER SOAL, dan semuanya antre di kunci server.
function actionHapusSoalBanyak_(data) {
  var ids = JSON.parse(data.ids || '[]');
  var sh = sh_(SHEET.BANK_SOAL);
  var jumlah = Math.max(sh.getLastRow() - 1, 0);
  if (!ids.length || jumlah === 0) return jsonOut_({ ok: true, count: 0 });
  var target = {};
  ids.forEach(function (id) { target[String(id)] = true; });
  var kolomId = sh.getRange(2, 1, jumlah, 1).getValues();
  var baris = [];
  for (var i = 0; i < kolomId.length; i++) {
    if (target[String(kolomId[i][0])]) baris.push(i + 2);
  }
  hapusBarisDariBawah_(sh, baris);
  return jsonOut_({ ok: true, count: baris.length });
}

// PERF: ubah status (aktif/arsip) banyak soal sekaligus: baca kolom id + status
// sekali, tulis kolom status sekali.
function actionUbahStatusSoalBanyak_(data) {
  var ids = JSON.parse(data.ids || '[]');
  var status = String(data.status || 'aktif');
  var headers = headersOf_(SHEET.BANK_SOAL);
  var kolomStatus = headers.indexOf('status') + 1;
  if (kolomStatus < 1) return jsonOut_({ ok: false, error: 'Kolom status tidak ditemukan.' });
  var sh = sh_(SHEET.BANK_SOAL);
  var jumlah = Math.max(sh.getLastRow() - 1, 0);
  if (!ids.length || jumlah === 0) return jsonOut_({ ok: true, count: 0 });
  var target = {};
  ids.forEach(function (id) { target[String(id)] = true; });
  var kolomId = sh.getRange(2, 1, jumlah, 1).getValues();
  var nilaiStatus = sh.getRange(2, kolomStatus, jumlah, 1).getValues();
  var berubah = 0;
  for (var i = 0; i < kolomId.length; i++) {
    if (target[String(kolomId[i][0])]) { nilaiStatus[i][0] = status; berubah++; }
  }
  if (berubah > 0) sh.getRange(2, kolomStatus, jumlah, 1).setValues(nilaiStatus);
  return jsonOut_({ ok: true, count: berubah });
}

// Ganti nama Mapel/kategori (mis. "Literasi" -> "Literasi 1") milik satu guru: kolom kategori di Bank Soal (termasuk
// arsip), Ujian, dan PaketSurvei ikut diganti sekaligus (1 baca + 1 tulis per sheet). Judul ujian tidak diubah.
// data: { guruId, dari, ke }
function actionUbahNamaKategori_(data) {
  var dari = String(data.dari == null ? '' : data.dari).trim();
  var ke = String(data.ke == null ? '' : data.ke).trim();
  var guruId = String(data.guruId == null ? '' : data.guruId);
  if (!dari || !ke) return jsonOut_({ ok: false, error: 'Nama kategori tidak boleh kosong.' });
  if (ke.length > 60) return jsonOut_({ ok: false, error: 'Nama kategori maksimal 60 karakter.' });
  if (!samaTeks_(dari, ke)) {
    var bentrok = readAll_(SHEET.BANK_SOAL).some(function (s) {
      return (!guruId || String(s.guru_id) === guruId) && samaTeks_(s.kategori, ke);
    });
    if (bentrok) return jsonOut_({ ok: false, error: 'Sudah ada kategori bernama "' + ke + '".' });
  }
  var hasil = {
    soal: ubahKolomKategori_(SHEET.BANK_SOAL, guruId, dari, ke),
    ujian: ubahKolomKategori_(SHEET.UJIAN, guruId, dari, ke),
    paket: ubahKolomKategori_(SHEET.PAKET_SURVEI, guruId, dari, ke)
  };
  SpreadsheetApp.flush();
  return jsonOut_({ ok: true, soal: hasil.soal, ujian: hasil.ujian, paket: hasil.paket });
}

function ubahKolomKategori_(nama, guruId, dari, ke) {
  var sh = sh_(nama);
  if (!sh || sh.getLastRow() < 2) return 0;
  var headers = headersOf_(nama);
  var kKat = headers.indexOf('kategori') + 1, kGuru = headers.indexOf('guru_id') + 1;
  if (kKat < 1) return 0;
  var jumlah = sh.getLastRow() - 1;
  var kat = sh.getRange(2, kKat, jumlah, 1).getValues();
  var guru = (guruId && kGuru > 0) ? sh.getRange(2, kGuru, jumlah, 1).getValues() : null;
  var n = 0;
  for (var i = 0; i < kat.length; i++) {
    if (guru && String(guru[i][0]) !== guruId) continue;
    if (samaTeks_(kat[i][0], dari)) { kat[i][0] = ke; n++; }
  }
  if (n > 0) sh.getRange(2, kKat, jumlah, 1).setValues(kat);
  return n;
}

// Perbandingan teks yang tidak sensitif huruf besar/kecil & spasi di pinggir —
// supaya soal hasil impor (mis. kategori tertulis "Kuis" atau "KUIS" di file)
// tetap cocok dengan kode kategori baku ("kuis") yang dipakai dropdown di klien.
function samaTeks_(a, b) {
  return String(a == null ? '' : a).trim().toLowerCase() === String(b == null ? '' : b).trim().toLowerCase();
}

function actionGetBankSoal_(data) {
  var list = readAll_(SHEET.BANK_SOAL);
  if (data.guruId) list = list.filter(function (s) { return s.guru_id === data.guruId; });
  if (data.kategori) list = list.filter(function (s) { return samaTeks_(s.kategori, data.kategori); });
  if (data.subkategori) list = list.filter(function (s) { return samaTeks_(s.subkategori, data.subkategori); });
  return jsonOut_({ ok: true, data: list });
}

// ----------------------------------------------------------------------------
// GURU — UJIAN
// ----------------------------------------------------------------------------
function actionSimpanUjian_(data) {
  var headers = headersOf_(SHEET.UJIAN);
  var ujian = JSON.parse(data.ujian);
  if (ujian.id) {
    var idx = findRowIndexById_(SHEET.UJIAN, ujian.id);
    if (idx > 0) {
      updateRowByFields_(SHEET.UJIAN, headers, idx, ujian);
      return jsonOut_({ ok: true, id: ujian.id });
    }
  }
  ujian.id = genId_('U');
  if (!ujian.token) {
    // Token baru dijamin tidak sama dengan token ujian lain.
    var dipakai = {}; readAll_(SHEET.UJIAN).forEach(function (u) { dipakai[String(u.token)] = true; });
    do { ujian.token = buatTokenAman_(); } while (dipakai[ujian.token]);
  }
  ujian.status = ujian.status || 'aktif';
  appendObj_(SHEET.UJIAN, headers, ujian);
  return jsonOut_({ ok: true, id: ujian.id, token: ujian.token });
}

function actionHapusUjian_(data) {
  var idx = findRowIndexById_(SHEET.UJIAN, data.id);
  if (idx > 0) sh_(SHEET.UJIAN).deleteRow(idx);
  return jsonOut_({ ok: true });
}

function actionGetDaftarUjian_(data) {
  var list = readAll_(SHEET.UJIAN);
  if (data.guruId) list = list.filter(function (u) { return u.guru_id === data.guruId; });
  return jsonOut_({ ok: true, data: list });
}

function actionGetRekapNilai_(data) {
  // PERBAIKAN BUG: sebelumnya baris di sini dipakai APA ADANYA dari Sheets/cache
  // gabungan tanpa disegarkan lagi -- padahal begitu siswa klik "Selesai",
  // simpanSesiState_ HANYA mengubah cache (supaya cepat & tidak membebani
  // Sheets) dan baru benar-benar ditulis ke Sheets oleh trigger flush 1 menit
  // kemudian. Kalau baris siswa itu SUDAH SEMPAT tersimpan ke Sheets sebelumnya
  // (mis. saat ia pertama kali klik "Mulai Ujian", saat itu statusnya masih
  // 'berlangsung'), maka baris di Sheets akan tetap berstatus 'berlangsung'
  // sampai flush berikutnya -- sehingga filter di bawah SALAH MEMBUANG siswa
  // ini dari rekap, walau ia sebenarnya sudah selesai & sudah dapat nilai.
  // Refresh per-baris lewat ambilSesiState_ (sama seperti actionGetPemantauanUjian_)
  // memastikan status & nilai yang dipakai selalu yang terbaru dari cache.
  var sesiList = bacaSesiGabunganUntukUjian_(data.ujianId)
    .map(function (baris) { return ambilSesiState_(baris.id) || baris; })
    .filter(function (s) { return s.status !== 'berlangsung'; });
  var siswaMap = {};
  readAll_(SHEET.SISWA).forEach(function (s) { siswaMap[s.id] = s; });
  // Foto bukti orak-orik per sesi (ditampilkan di sebelah nilai pada Rekap Nilai guru)
  var buktiPerSesi = {};
  readAll_(SHEET.BUKTI).forEach(function (b) {
    if (String(b.ujian_id) !== String(data.ujianId)) return;
    (buktiPerSesi[b.sesi_id] = buktiPerSesi[b.sesi_id] || []).push(fotoBuktiKeKlien_(b));
  });
  var ujianRekap = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === data.ujianId; })[0];
  var rekap = sesiList.map(function (s) {
    var siswa = siswaMap[s.siswa_id] || {};
    return {
      sesiId: s.id, siswaId: s.siswa_id, nama: siswa.nama || '(tidak dikenal)', kelas: siswa.kelas || '-',
      nilai: s.nilai, lulus: s.lulus, pelanggaran: s.pelanggaran, mulai: s.mulai, selesai: s.selesai, status: s.status,
      bukti: buktiPerSesi[s.id] || []
    };
  });
  return jsonOut_({ ok: true, data: rekap, buktiMode: modeBuktiUjian_(ujianRekap) });
}

// Menghitung ULANG nilai SEMUA sesi (status != 'berlangsung') di satu ujian,
// memakai jawaban yang SUDAH TERSIMPAN (tidak diubah) tapi lewat logika
// penilaian TERBARU di skorSoal_()/hitungNilai_() -- dipakai tombol
// "Hitung Ulang Nilai" di Portal Guru > Rekap Nilai, terutama berguna
// setelah perbaikan bug penilaian (mis. soal dengan opsi teracak yang
// sempat salah dinilai karena posisi tampil tidak diterjemahkan dulu ke
// indeks opsi asli sebelum dibandingkan dgn kunci jawaban -- lihat
// skorSoal_()). Memakai bacaSesiGabunganUntukUjian_ + ambilSesiState_ (sama
// seperti actionGetRekapNilai_) supaya sesi yang baru selesai tapi belum
// sempat di-flush ke Sheets ikut dihitung ulang dgn data terkininya. Hanya
// menulis ulang (lewat simpanSesiState_) kalau nilai/status lulus memang
// BERUBAH -- aman dipanggil berkali-kali tanpa efek samping tambahan, dan
// TIDAK menyentuh jawaban_json/urutan_json/status/tanggal selesai sama sekali.
function actionHitungUlangNilaiUjian_(data) {
  var sesiList = bacaSesiGabunganUntukUjian_(data.ujianId)
    .map(function (baris) { return ambilSesiState_(baris.id) || baris; })
    .filter(function (s) { return s.status !== 'berlangsung'; });

  var totalBerubah = 0;
  sesiList.forEach(function (s) {
    var jawaban = {};
    try { jawaban = JSON.parse(s.jawaban_json || '{}'); } catch (e) {}
    var hasil = hitungNilai_(s, jawaban);
    if (Number(s.nilai) !== Number(hasil.nilai) || String(s.lulus) !== String(hasil.lulus)) {
      simpanSesiState_(s.id, { nilai: hasil.nilai, lulus: hasil.lulus });
      totalBerubah++;
    }
  });

  return jsonOut_({ ok: true, totalDiperiksa: sesiList.length, totalBerubah: totalBerubah });
}

// ----------------------------------------------------------------------------
// GURU — ANALISIS SOAL & JAWABAN SISWA
// ----------------------------------------------------------------------------
// Untuk 1 ujian: (a) analisis tiap BUTIR SOAL -- persentase peserta yang
// menjawab benar, dan dari situ diturunkan label "mudah/sedang/sulit" secara
// otomatis (konvensi umum analisis butir soal / p-value: >=70% mudah, 40-70%
// sedang, <40% sulit) -- dan (b) matriks JAWABAN tiap siswa per soal (benar/
// sebagian benar/salah/kosong), supaya guru bisa melihat pola kesalahan.
// Hanya sesi yang SUDAH SELESAI (status != 'berlangsung') yang dihitung --
// sama seperti actionGetRekapNilai_ -- karena jawaban yang masih dikerjakan
// belum final.
function actionGetAnalisisSoal_(data) {
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === data.ujianId; })[0];
  if (!ujian) return jsonOut_({ ok: false, error: 'Ujian tidak ditemukan.' });

  var soalIds = String(ujian.soal_ids || '').split(',').filter(Boolean);
  var soalMap = {};
  readAll_(SHEET.BANK_SOAL).forEach(function (s) { soalMap[s.id] = s; });
  var siswaMap = {};
  readAll_(SHEET.SISWA).forEach(function (s) { siswaMap[s.id] = s; });
  var sesiList = bacaSesiGabunganUntukUjian_(data.ujianId)
    .map(function (baris) { return ambilSesiState_(baris.id) || baris; }) // lihat catatan PERBAIKAN BUG di actionGetRekapNilai_
    .filter(function (s) { return s.status !== 'berlangsung'; });
  var totalPeserta = sesiList.length;

  var agregat = {}; // soalId -> {benar, sebagian, salah, kosong}
  soalIds.forEach(function (sid) { agregat[sid] = { benar: 0, sebagian: 0, salah: 0, kosong: 0 }; });

  var jawabanSiswa = sesiList.map(function (sesi) {
    var siswa = siswaMap[sesi.siswa_id] || {};
    var jawaban = {};
    try { jawaban = JSON.parse(sesi.jawaban_json || '{}'); } catch (e) {}
    var urutanSesi = {};
    try { urutanSesi = JSON.parse(sesi.urutan_json || '{}'); } catch (e) {}
    var opsiAcakMap = urutanSesi.opsiAcak || {};

    var detail = {};
    soalIds.forEach(function (sid) {
      var soal = soalMap[sid];
      if (!soal) { detail[sid] = 'na'; return; }
      var jwb = jawaban[sid];
      var kosong = (jwb === undefined || jwb === null || jwb === '' || (Array.isArray(jwb) && jwb.length === 0));
      if (kosong) {
        detail[sid] = 'kosong';
        agregat[sid].kosong++;
        return;
      }
      var bobot = Number(soal.bobot) || 0;
      var skor = skorSoal_(soal, jwb, opsiAcakMap[sid]);
      var status;
      if (bobot > 0 && skor >= bobot - 0.001) { status = 'benar'; agregat[sid].benar++; }
      else if (skor > 0) { status = 'sebagian'; agregat[sid].sebagian++; }
      else { status = 'salah'; agregat[sid].salah++; }
      detail[sid] = status;
    });

    return {
      siswaId: sesi.siswa_id, nama: siswa.nama || '(tidak dikenal)', kelas: siswa.kelas || '-',
      nilai: sesi.nilai, lulus: sesi.lulus, jawabanDetail: detail
    };
  });

  var analisisSoal = soalIds.map(function (sid, i) {
    var soal = soalMap[sid];
    var agg = agregat[sid];
    var persenBenar = totalPeserta > 0 ? Math.round((agg.benar / totalPeserta) * 1000) / 10 : 0;
    var kesulitanOtomatis;
    if (totalPeserta === 0) kesulitanOtomatis = '-';
    else if (persenBenar >= 70) kesulitanOtomatis = 'mudah';
    else if (persenBenar >= 40) kesulitanOtomatis = 'sedang';
    else kesulitanOtomatis = 'sulit';
    return {
      soalId: sid, nomor: i + 1,
      pertanyaan: soal ? soal.pertanyaan : '(soal ini sudah dihapus dari Bank Soal)',
      tipe: soal ? soal.tipe : '-',
      tingkatKesulitanGuru: soal ? (soal.tingkat_kesulitan || 'sedang') : '-',
      bobot: soal ? (Number(soal.bobot) || 0) : 0,
      jumlahBenar: agg.benar, jumlahSebagianBenar: agg.sebagian, jumlahSalah: agg.salah, jumlahKosong: agg.kosong,
      persenBenar: persenBenar, kesulitanOtomatis: kesulitanOtomatis
    };
  });

  return jsonOut_({ ok: true, totalPeserta: totalPeserta, soal: analisisSoal, siswa: jawabanSiswa });
}

function actionGetLogPelanggaran_(data) {
  var logs = readAll_(SHEET.LOG);
  if (data.ujianId) logs = logs.filter(function (l) { return l.ujian_id === data.ujianId; });
  return jsonOut_({ ok: true, data: logs });
}

function actionResetDevice_(data) {
  var idx = findRowIndexById_(SHEET.SISWA, data.siswaId);
  if (idx > 0) updateRowByFields_(SHEET.SISWA, headersOf_(SHEET.SISWA), idx, { device_id: '', last_ping: '' });
  // Penting: cache device_id juga harus dikosongkan, kalau tidak ping
  // berikutnya dari siswa itu akan tetap membaca device_id LAMA dari cache
  // (bukan dari Sheets yang baru saja direset di atas) dan lock-nya seolah
  // tidak pernah direset.
  CacheService.getScriptCache().remove('siswa_device_' + data.siswaId);
  // Hapus juga ping yang masih menunggu di-flush, supaya device_id lama tidak
  // ditulis balik ke Sheets oleh flushPingBerkala().
  CacheService.getScriptCache().remove(pingCacheKey_(data.siswaId));
  return jsonOut_({ ok: true });
}

// Lepas perangkat SEMUA siswa dalam satu kelas sekaligus (sekali klik).
// data.kelas kosong = semua kelas. Ditulis dalam satu operasi batch ke Sheets
// (bukan satu per satu) supaya cepat meski siswanya ratusan.
function actionResetDeviceKelas_(data) {
  var kelas = String(data.kelas || '').trim();
  var sh = sh_(SHEET.SISWA);
  var headers = headersOf_(SHEET.SISWA);
  var jumlahBaris = Math.max(sh.getLastRow() - 1, 0);
  if (jumlahBaris === 0) return jsonOut_({ ok: true, count: 0 });
  var rows = sh.getRange(2, 1, jumlahBaris, headers.length).getValues();
  var idCol = headers.indexOf('id');
  var kelasCol = headers.indexOf('kelas');
  var deviceCol = headers.indexOf('device_id');
  var pingCol = headers.indexOf('last_ping');
  var cache = CacheService.getScriptCache();
  var kunciCache = [];
  var count = 0;
  rows.forEach(function (row) {
    if (kelas && String(row[kelasCol]).trim() !== kelas) return;
    if (row[deviceCol]) count++;
    row[deviceCol] = '';
    row[pingCol] = '';
    var id = String(row[idCol]);
    kunciCache.push('siswa_device_' + id, pingCacheKey_(id));
  });
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  // Kosongkan cache device_id & ping tertunda (maks. 100 kunci per removeAll).
  for (var i = 0; i < kunciCache.length; i += 100) {
    cache.removeAll(kunciCache.slice(i, i + 100));
  }
  return jsonOut_({ ok: true, count: count });
}

// ----------------------------------------------------------------------------
// GURU — PEMANTAUAN UJIAN (live monitoring)
// ----------------------------------------------------------------------------
// Menampilkan daftar siswa yang sedang/​sudah mengerjakan 1 ujian tertentu,
// lengkap dengan sisa waktu, jumlah pelanggaran, dan jumlah soal yang sudah
// terjawab -- serta aksi guru: reset (ulang dari awal), tambah waktu, selesaikan
// paksa, dan hapus pelanggaran (buka blokir tanpa mengulang dari awal).
//
// Sengaja membaca state lewat ambilSesiState_ (cache-first, sama seperti jalur
// siswa) supaya angkanya benar-benar terkini untuk sesi yang sedang aktif --
// bukan menunggu hingga 1 menit flush berkala seperti kalau guru buka Sheets
// manual. readAll_(SESI) di sini hanya dipakai untuk mendapatkan DAFTAR sesi
// (baris mana saja yang ada), bukan sebagai sumber angka pelanggaran/jawaban.
function actionGetPemantauanUjian_(data) {
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === data.ujianId; })[0];
  if (!ujian) return jsonOut_({ ok: false, error: 'Ujian tidak ditemukan.' });

  var sesiList = bacaSesiGabunganUntukUjian_(data.ujianId);
  var siswaMap = {};
  readAll_(SHEET.SISWA).forEach(function (s) { siswaMap[s.id] = s; });

  var durasiMs = (Number(ujian.durasi_menit) || 0) * 60000;
  var now = new Date();

  var hasil = sesiList.map(function (baris) {
    var s = ambilSesiState_(baris.id) || baris; // ambil versi terbaru (cache-first)
    var siswa = siswaMap[s.siswa_id] || {};

    var urutan = {};
    try { urutan = JSON.parse(s.urutan_json || '{}'); } catch (e) {}
    var totalSoal = (urutan.order || []).length;

    var jawaban = {};
    try { jawaban = JSON.parse(s.jawaban_json || '{}'); } catch (e) {}
    var terjawab = Object.keys(jawaban).filter(function (k) {
      var v = jawaban[k];
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;

    var sisaDetik = null;
    if (s.status === 'berlangsung' && s.mulai) {
      var tambahanMs = (Number(s.tambahan_detik) || 0) * 1000;
      var sisaMs = durasiMs + tambahanMs - (now - new Date(s.mulai));
      sisaDetik = Math.max(Math.floor(sisaMs / 1000), 0);
    }

    return {
      sesiId: s.id, siswaId: s.siswa_id, nama: siswa.nama || '(tidak dikenal)', kelas: siswa.kelas || '-',
      status: s.status, pelanggaran: Number(s.pelanggaran) || 0,
      terjawab: terjawab, totalSoal: totalSoal, sisaDetik: sisaDetik,
      tambahanDetik: Number(s.tambahan_detik) || 0, mulai: s.mulai, selesai: s.selesai,
      nilai: s.nilai, lulus: s.lulus
    };
  });

  return jsonOut_({ ok: true, data: hasil, maxPelanggaran: Number(ujian.max_pelanggaran) || 999 });
}

// Menambah waktu ekstra untuk SATU sesi siswa (menit bisa negatif untuk mengurangi,
// tapi hasil akhir tidak dipaksa >= 0 di sini -- sisa waktu tetap dihitung normal
// oleh klien/actionMulaiUjian_, jadi kalau jadi negatif ujian otomatis dianggap habis).
function actionPemantauanTambahWaktu_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  var tambahanBaru = (Number(state.tambahan_detik) || 0) + (Number(data.menit) || 0) * 60;
  state = simpanSesiState_(data.sesiId, { tambahan_detik: tambahanBaru });
  return jsonOut_({ ok: true, tambahanDetik: tambahanBaru });
}

// Menyelesaikan sesi SEKARANG JUGA memakai jawaban yang sudah tersimpan sejauh
// ini (autosave terakhir) -- dipakai kalau guru perlu memaksa seorang siswa
// selesai (mis. waktu ujian sudah lewat tapi siswa tidak kunjung submit).
function actionPemantauanForceFinish_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (state.status === 'selesai') return jsonOut_({ ok: true, sudahSelesai: true, nilai: state.nilai, lulus: state.lulus });
  var jawaban = JSON.parse(state.jawaban_json || '{}');
  var hasil = hitungNilai_(state, jawaban);
  simpanSesiState_(data.sesiId, {
    status: 'selesai', selesai: new Date().toISOString(), nilai: hasil.nilai, lulus: hasil.lulus
  });
  return jsonOut_({ ok: true, nilai: hasil.nilai, lulus: hasil.lulus });
}

// Menghapus SEMUA pelanggaran sesi ini (kembali ke 0). Kalau sesi sedang
// "diblokir" (terkena force-submit otomatis akibat pelanggaran mencapai batas),
// sekalian dibuka kembali jadi "berlangsung" -- jawaban, urutan soal, dan waktu
// mulai TIDAK diubah, jadi begitu siswa membuka lagi (mulaiUjian), ia lanjut
// persis dari soal terakhir yang dikerjakan, TANPA perlu mengulang dari awal.
function actionPemantauanHapusPelanggaran_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  var perubahan = { pelanggaran: 0 };
  if (state.status === 'diblokir') {
    perubahan.status = 'berlangsung';
    perubahan.selesai = '';
    perubahan.nilai = '';
    perubahan.lulus = '';
  }
  state = simpanSesiState_(data.sesiId, perubahan);
  return jsonOut_({ ok: true, status: state.status });
}

// Reset TOTAL sebuah sesi (ulang dari awal): sesi dihapus sepenuhnya (cache +
// baris di Sheets), termasuk peta cache "siswa+ujian -> sesiId" -- supaya lain
// kali siswa itu membuka ujian ini, actionMulaiUjian_ menganggapnya BELUM PERNAH
// mengerjakan (soal diacak ulang, jawaban kosong, timer mulai dari 0 lagi).
// Beda dengan "Hapus Pelanggaran" di atas yang mempertahankan progres siswa.
function actionPemantauanReset_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  var cache = CacheService.getScriptCache();
  cache.remove(sesiCacheKey_(data.sesiId));
  cache.remove('map_sesi_' + state.ujian_id + '_' + state.siswa_id);
  var idx = findRowIndexById_(SHEET.SESI, data.sesiId);
  if (idx > 0) sh_(SHEET.SESI).deleteRow(idx);
  hapusSurveiUntukSesi_([data.sesiId]);
  return jsonOut_({ ok: true });
}

// Hapus NILAI siswa (= hapus sesi ujian yang sudah selesai/diblokir) untuk
// BANYAK sesi sekaligus, dari halaman Rekap Nilai. Membersihkan:
//  - state sesi di cache + peta "siswa+ujian -> sesiId" (supaya siswa dianggap
//    belum pernah mengerjakan & bisa mengikuti ujian lagi),
//  - antrean flush (supaya tidak ditulis balik ke Sheets),
//  - baris di sheet Sesi,
//  - catatan pelanggaran milik sesi tsb di sheet PelanggaranLog.
// Sheet "Rekap - <kelas>" otomatis menyesuaikan pada siklus flush berikutnya
// (maks. 1 menit) karena dibangun ulang dari sheet Sesi.
function actionHapusNilaiSiswa_(data) {
  var ids = JSON.parse(data.sesiIds || '[]');
  if (!ids.length) return jsonOut_({ ok: true, count: 0 });
  hapusBuktiUntukSesi_(ids); // foto bukti orak-orik ikut dibersihkan (siswa bisa mengulang ujian dgn bersih)
  hapusSurveiUntukSesi_(ids); // jawaban survei ikut dibersihkan
  var target = {};
  ids.forEach(function (id) { target[String(id)] = true; });
  var cache = CacheService.getScriptCache();

  // 1) cache state + peta (sesi yang baru ada di cache pun ikut dibersihkan)
  ids.forEach(function (id) {
    var raw = cache.get(sesiCacheKey_(id));
    if (raw) {
      try { var st = JSON.parse(raw); cache.remove('map_sesi_' + st.ujian_id + '_' + st.siswa_id); } catch (e) {}
    }
    cache.remove(sesiCacheKey_(id));
  });

  // 2) baris di sheet Sesi
  var sh = sh_(SHEET.SESI);
  var headers = headersOf_(SHEET.SESI);
  var iId = headers.indexOf('id'), iUjian = headers.indexOf('ujian_id'), iSiswa = headers.indexOf('siswa_id');
  var jumlah = Math.max(sh.getLastRow() - 1, 0);
  var baris = [];
  if (jumlah > 0) {
    var isi = sh.getRange(2, 1, jumlah, headers.length).getValues();
    for (var i = 0; i < isi.length; i++) {
      if (target[String(isi[i][iId])]) {
        baris.push(i + 2);
        cache.remove('map_sesi_' + isi[i][iUjian] + '_' + isi[i][iSiswa]);
      }
    }
  }
  hapusBarisDariBawah_(sh, baris);

  // 3) antrean flush: buang id yang sudah dihapus (kita sedang memegang kunci
  //    skrip yang sama dengan tandaiPendingSesi_, jadi aman diubah langsung)
  var rawPending = cache.get('pending_sesi_ids');
  if (rawPending) {
    var sisa = JSON.parse(rawPending).filter(function (id) { return !target[String(id)]; });
    if (sisa.length) cache.put('pending_sesi_ids', JSON.stringify(sisa), CACHE_TTL_DETIK);
    else cache.remove('pending_sesi_ids');
  }

  // 4) catatan pelanggaran milik sesi-sesi ini
  try {
    var shLog = sh_(SHEET.LOG);
    var hLog = headersOf_(SHEET.LOG);
    var iSesiLog = hLog.indexOf('sesi_id');
    var nLog = Math.max(shLog.getLastRow() - 1, 0);
    if (nLog > 0 && iSesiLog > -1) {
      var kolom = shLog.getRange(2, iSesiLog + 1, nLog, 1).getValues();
      var barisLog = [];
      for (var j = 0; j < kolom.length; j++) {
        if (target[String(kolom[j][0])]) barisLog.push(j + 2);
      }
      hapusBarisDariBawah_(shLog, barisLog);
    }
  } catch (e) { Logger.log('hapus log pelanggaran gagal: ' + e); }

  return jsonOut_({ ok: true, count: ids.length });
}

// ----------------------------------------------------------------------------
// GURU — SISWA & TEMA
// ----------------------------------------------------------------------------
// data.siswaList = JSON string array [{username,password,nama,kelas}]
function actionImportSiswa_(data) {
  var headers = headersOf_(SHEET.SISWA);
  var list = JSON.parse(data.siswaList);
  var ids = [];
  list.forEach(function (s) {
    s.id = genId_('SW');
    s.device_id = '';
    s.last_ping = '';
    appendObj_(SHEET.SISWA, headers, s);
    ids.push(s.id);
  });
  return jsonOut_({ ok: true, count: ids.length });
}

function actionGetDaftarSiswa_(data) {
  var list = readAll_(SHEET.SISWA).map(function (s) {
    // deviceId & lastPing disertakan (bukan cuma flag online) supaya tab "Status
    // Login" guru bisa menampilkan perangkat mana yang sedang mengunci akun ini,
    // dan sejak kapan -- tanpa keduanya, guru cuma tahu "online/tidak" tanpa detail.
    return {
      id: s.id, username: s.username, password: s.password, nama: s.nama, kelas: s.kelas,
      nisn: String(s.nisn || ''), jenis_kelamin: String(s.jenis_kelamin || ''), tempat_lahir: String(s.tempat_lahir || ''), tanggal_lahir: tglIso_(s.tanggal_lahir),
      online: !!s.device_id, deviceId: s.device_id || '', lastPing: s.last_ping || '',
      blokir: String(s.blokir || '').toLowerCase() === 'ya',
      blokirAlasan: s.blokir_alasan || '', blokirSejak: s.blokir_sejak ? String(s.blokir_sejak) : ''
    };
  });
  if (data.kelas) list = list.filter(function (s) { return s.kelas === data.kelas; });
  return jsonOut_({ ok: true, data: list });
}

// ----------------------------------------------------------------------------
// BLOKIR AKUN SISWA (hukuman: siswa tidak bisa mengikuti kuis selama diblokir)
// Blokir berlaku PER SISWA, tidak memengaruhi teman sekelasnya. Status dibaca
// cache-first (kunci 'siswa_blokir_<id>') karena dicek di setiap ping siswa.
// ----------------------------------------------------------------------------
var BLOKIR_CACHE_TTL = 600; // detik; jaga-jaga bila guru mengubah kolom 'blokir' langsung di Sheets

function statusBlokirSiswa_(siswaId) {
  var kosong = { aktif: false, alasan: '', sejak: '' };
  if (!siswaId) return kosong;
  var cache = CacheService.getScriptCache();
  var kunci = 'siswa_blokir_' + siswaId;
  var raw = cache.get(kunci);
  if (raw === null) {
    var out = { aktif: false, alasan: '', sejak: '' };
    var idx = findRowIndexById_(SHEET.SISWA, siswaId);
    if (idx > 0) {
      var headers = headersOf_(SHEET.SISWA);
      var row = sh_(SHEET.SISWA).getRange(idx, 1, 1, headers.length).getValues()[0];
      out.aktif = String(row[headers.indexOf('blokir')] || '').toLowerCase() === 'ya';
      out.alasan = String(row[headers.indexOf('blokir_alasan')] || '');
      var sj = row[headers.indexOf('blokir_sejak')];
      out.sejak = sj ? (sj instanceof Date ? sj.toISOString() : String(sj)) : '';
    }
    raw = JSON.stringify(out);
    cache.put(kunci, raw, BLOKIR_CACHE_TTL);
  }
  return JSON.parse(raw);
}

function pesanBlokir_(b) {
  return 'Akun Anda sedang diblokir oleh guru, jadi belum bisa mengikuti ujian.' +
    (b && b.alasan ? ' Alasan: ' + b.alasan + '.' : '') + ' Hubungi guru untuk membuka blokir.';
}

// data: { siswaId, aktif (true = blokir, false = buka blokir), alasan (opsional) }
function actionBlokirSiswa_(data) {
  var idx = findRowIndexById_(SHEET.SISWA, data.siswaId);
  if (idx < 0) return jsonOut_({ ok: false, error: 'Siswa tidak ditemukan.' });
  var aktif = data.aktif === true || String(data.aktif).toLowerCase() === 'true';
  var alasan = aktif ? String(data.alasan || '').trim().slice(0, 200) : '';
  var sejak = aktif ? new Date().toISOString() : '';
  updateRowByFields_(SHEET.SISWA, headersOf_(SHEET.SISWA), idx, {
    blokir: aktif ? 'ya' : '', blokir_alasan: alasan, blokir_sejak: sejak
  });
  CacheService.getScriptCache().put('siswa_blokir_' + data.siswaId,
    JSON.stringify({ aktif: aktif, alasan: alasan, sejak: sejak }), BLOKIR_CACHE_TTL);
  return jsonOut_({ ok: true, aktif: aktif });
}

// ----------------------------------------------------------------------------
// SURVEI KARAKTER & SULINGJAR (setelah ujian) -- OPSIONAL per ujian
// Urutan siswa: submitUjian (nilai tersimpan) -> [bukti orak-orik] -> survei -> nilai tampil.
// Tidak ada jawaban benar/salah; server hanya menyimpan jawaban mentah (nomor pilihan 1-4 per butir).
// Penentuan jenis survei HARUS sama dengan Survei.jenisUntukUjian() di survei.js.
// ----------------------------------------------------------------------------
function paketSurveiList_() {
  try { var sh = sh_(SHEET.PAKET_SURVEI); if (!sh || sh.getLastRow() < 2) return []; return readAll_(SHEET.PAKET_SURVEI); } catch (e) { return []; }
}
function cariPaketSurvei_(kategori, jenis, guruId) {
  var cocok = paketSurveiList_().filter(function (p) { return p.jenis === jenis && samaTeks_(p.kategori, kategori); });
  var milik = cocok.filter(function (p) { return guruId && String(p.guru_id) === String(guruId); })[0];
  return milik || cocok[0] || null;
}
function jenisSurveiUjian_(ujian) {
  if (!ujian) return '';
  var m = String(ujian.survei || '').toLowerCase();
  if (m === 'karakter' || m === 'sulingjar') return m;
  if (m === 'auto') {
    var t = (String(ujian.judul || '') + ' ' + String(ujian.kategori || '')).toLowerCase();
    if (t.indexOf('numerasi') >= 0) return 'karakter';
    if (t.indexOf('literasi') >= 0) return 'sulingjar';
    // tanpa kata kunci: bila kategori punya TEPAT satu paket survei, paket itulah yang dipakai
    var ada = {};
    paketSurveiList_().forEach(function (p) { if (samaTeks_(p.kategori, ujian.kategori) && (p.jenis === 'karakter' || p.jenis === 'sulingjar')) ada[p.jenis] = 1; });
    var k = Object.keys(ada); if (k.length === 1) return k[0];
  }
  return '';
}
// Butir yang dipakai sebuah ujian: paket Bank Soal (kategori+jenis) > butir khusus lama di ujian > '' (bawaan klien).
function setSurveiUjian_(ujian, jenis) {
  if (!ujian || !jenis) return '';
  var p = cariPaketSurvei_(ujian.kategori, jenis, ujian.guru_id);
  return p ? String(p.butir_json || '') : (ujian.survei_butir ? String(ujian.survei_butir) : '');
}

// data: { guruId? } -> { data:[{id, guru_id, kategori, jenis, butir_json, diubah}] }
function actionGetPaketSurvei_(data) {
  var list = paketSurveiList_();
  if (data.guruId) list = list.filter(function (p) { return String(p.guru_id) === String(data.guruId); });
  return jsonOut_({ ok: true, data: list });
}
// data: { guruId, kategori, jenis, butir(JSON teks) } -> upsert satu paket
function actionSimpanPaketSurvei_(data) {
  var jenis = String(data.jenis || ''), kat = String(data.kategori || '').trim();
  if (jenis !== 'karakter' && jenis !== 'sulingjar') return jsonOut_({ ok: false, error: 'Jenis survei tidak dikenali.' });
  if (!kat) return jsonOut_({ ok: false, error: 'Kategori kosong.' });
  var teks = String(data.butir || '');
  if (teks.length > 45000) return jsonOut_({ ok: false, error: 'Paket survei terlalu besar (maks. 99 butir).' });
  var c = null; try { c = JSON.parse(teks); } catch (e) { c = null; }
  if (!c || c.jenis !== jenis || !Array.isArray(c.butir) || c.butir.length < 5 || c.butir.length > 99 || !Array.isArray(c.dim)) return jsonOut_({ ok: false, error: 'Isi paket survei tidak valid.' });
  var headers = headersOf_(SHEET.PAKET_SURVEI);
  var sh = sh_(SHEET.PAKET_SURVEI);
  var baris = paketSurveiList_();
  var idx = -1;
  for (var i = 0; i < baris.length; i++) { var p = baris[i]; if (String(p.guru_id) === String(data.guruId) && p.jenis === jenis && samaTeks_(p.kategori, kat)) { idx = i; break; } }
  var obj = { id: idx >= 0 ? baris[idx].id : genId_('PS'), guru_id: data.guruId, kategori: kat, jenis: jenis, butir_json: teks, diubah: new Date().toISOString() };
  if (idx >= 0) updateRowByFields_(SHEET.PAKET_SURVEI, headers, idx + 2, obj); else appendObj_(SHEET.PAKET_SURVEI, headers, obj);
  SpreadsheetApp.flush();
  return jsonOut_({ ok: true, id: obj.id });
}
// data: { guruId, kategori, jenis? } -> hapus paket (jenis kosong = kedua jenis)
function actionHapusPaketSurvei_(data) {
  var sh = sh_(SHEET.PAKET_SURVEI);
  if (!sh || sh.getLastRow() < 2) return jsonOut_({ ok: true });
  var baris = paketSurveiList_();
  for (var i = baris.length - 1; i >= 0; i--) {
    var p = baris[i];
    if (String(p.guru_id) === String(data.guruId) && samaTeks_(p.kategori, data.kategori) && (!data.jenis || p.jenis === data.jenis)) sh.deleteRow(i + 2);
  }
  SpreadsheetApp.flush();
  return jsonOut_({ ok: true });
}

function suratSurveiAda_(sesiId) {
  var sh = sh_(SHEET.SURVEI);
  if (!sh || sh.getLastRow() < 2) return false;
  return readAll_(SHEET.SURVEI).some(function (r) { return String(r.sesi_id) === String(sesiId); });
}

function hapusSurveiUntukSesi_(sesiIds) {
  try {
    var sh = sh_(SHEET.SURVEI);
    if (!sh || sh.getLastRow() < 2) return;
    var headers = headersOf_(SHEET.SURVEI);
    var iSesi = headers.indexOf('sesi_id');
    var target = {};
    sesiIds.forEach(function (id) { target[String(id)] = true; });
    var isi = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    for (var i = isi.length - 1; i >= 0; i--) {
      if (target[String(isi[i][iSesi])]) sh.deleteRow(i + 2);
    }
  } catch (e) { /* best-effort: jangan menggagalkan penghapusan nilai */ }
}

// data: { sesiId, siswaId } -> { jenis, sudah, tampilHasil }
function actionGetSurveiSesi_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (data.siswaId && String(sesi.siswa_id) !== String(data.siswaId)) return jsonOut_({ ok: false, error: 'Sesi ini bukan milik Anda.' });
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesi.ujian_id; })[0];
  var jenis = jenisSurveiUjian_(ujian);
  var tampil = !!ujian && String(ujian.survei_tampil).toLowerCase() === 'true';
  var out = { ok: true, jenis: jenis, set: setSurveiUjian_(ujian, jenis), sudah: false, tampilHasil: tampil };
  if (jenis) {
    var baris = readAll_(SHEET.SURVEI).filter(function (r) { return String(r.sesi_id) === String(sesi.id); })[0];
    out.sudah = !!baris;
    // jawaban dikembalikan ke siswa hanya jika guru mengaktifkan "tampilkan ringkasan/pembahasan survei ke siswa"
    if (baris && tampil) {
      try { out.jawaban = JSON.parse(baris.jawaban_json || '{}'); } catch (e) {}
      try { out.kualitas = JSON.parse(baris.kualitas_json || '{}'); } catch (e) {}
    }
  }
  return jsonOut_(out);
}

// data: { sesiId, siswaId, jenis, jawaban (JSON), durasiDetik, kualitas (JSON) }
function actionSimpanSurvei_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (String(sesi.siswa_id) !== String(data.siswaId)) return jsonOut_({ ok: false, error: 'Sesi ini bukan milik Anda.' });
  if (sesi.status === 'berlangsung') return jsonOut_({ ok: false, error: 'Selesaikan ujian dulu sebelum mengisi survei.' });
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesi.ujian_id; })[0];
  var jenis = jenisSurveiUjian_(ujian);
  if (!jenis) return jsonOut_({ ok: false, error: 'Survei tidak diaktifkan untuk ujian ini.' });
  var jawabanTeks = String(data.jawaban || '{}');
  if (jawabanTeks.length > 20000) return jsonOut_({ ok: false, error: 'Data survei terlalu besar.' });
  var jawaban;
  try { jawaban = JSON.parse(jawabanTeks); } catch (e) { return jsonOut_({ ok: false, error: 'Format jawaban survei tidak valid.' }); }
  // bersihkan: hanya nomor pilihan 1-4
  var bersih = {};
  Object.keys(jawaban || {}).forEach(function (k) { var v = Number(jawaban[k]); if (/^[A-Z][0-9]{2}$/.test(k) && v >= 1 && v <= 4) bersih[k] = v; });
  var baris = {
    id: genId_('SV'), sesi_id: sesi.id, siswa_id: sesi.siswa_id, ujian_id: sesi.ujian_id, jenis: jenis,
    jawaban_json: JSON.stringify(bersih), durasi_detik: Number(data.durasiDetik) || 0,
    kualitas_json: String(data.kualitas || '{}').slice(0, 2000), waktu: new Date().toISOString()
  };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return jsonOut_({ ok: false, error: 'Server sedang sibuk, silakan coba lagi.' });
  try {
    if (suratSurveiAda_(sesi.id)) return jsonOut_({ ok: true, sudah: true }); // kirim ulang (sinyal putus) tidak menggandakan
    appendObj_(SHEET.SURVEI, headersOf_(SHEET.SURVEI), baris);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

// data: { ujianId } -> { jenis, data:[{sesiId, siswaId, nama, kelas, waktu, durasi, jawaban, kualitas}], belum }
function actionGetRekapSurvei_(data) {
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === data.ujianId; })[0];
  if (!ujian) return jsonOut_({ ok: false, error: 'Ujian tidak ditemukan.' });
  var siswaMap = {};
  readAll_(SHEET.SISWA).forEach(function (x) { siswaMap[x.id] = x; });
  var sudah = {};
  var baris = readAll_(SHEET.SURVEI).filter(function (r) { return String(r.ujian_id) === String(ujian.id); }).map(function (r) {
    sudah[String(r.sesi_id)] = true;
    var sw = siswaMap[r.siswa_id] || {};
    var jw = {}, kq = {};
    try { jw = JSON.parse(r.jawaban_json || '{}'); } catch (e) {}
    try { kq = JSON.parse(r.kualitas_json || '{}'); } catch (e) {}
    return { sesiId: r.sesi_id, siswaId: r.siswa_id, nama: sw.nama || '(tidak dikenal)', kelas: sw.kelas || '-', waktu: r.waktu, durasi: Number(r.durasi_detik) || 0, jawaban: jw, kualitas: kq };
  }).sort(function (a, b) { return String(a.kelas).localeCompare(String(b.kelas)) || String(a.nama).localeCompare(String(b.nama)); });
  var belum = bacaSesiGabunganUntukUjian_(ujian.id)
    .map(function (b) { return ambilSesiState_(b.id) || b; })
    .filter(function (x) { return x.status !== 'berlangsung' && !sudah[String(x.id)]; }).length;
  var jenisR = jenisSurveiUjian_(ujian);
  return jsonOut_({ ok: true, jenis: jenisR, set: setSurveiUjian_(ujian, jenisR), data: baris, belum: belum });
}

// ----------------------------------------------------------------------------
// BUKTI ORAK-ORIK JAWABAN (foto coretan siswa) -- OPSIONAL per ujian
// Alur: siswa klik Selesai -> NILAI tersimpan dulu (submitUjian) -> halaman unggah foto -> baru nilai tampil.
// Jaminan "pasti terkirim": (1) ukuran berkas di Drive harus SAMA dengan yang dikirim klien,
// (2) kirim ulang dgn 'kunci' yang sama TIDAK membuat duplikat (idempoten),
// (3) klien memeriksa ulang daftar foto ke server (getBuktiOrek) sebelum melanjutkan.
// ----------------------------------------------------------------------------
var BUKTI_MAKS_FOTO = 10;
var BUKTI_FOLDER = 'CBT_Bukti_Orek';

function modeBuktiUjian_(ujian) {
  var m = ujian ? String(ujian.bukti_orek || '').toLowerCase() : '';
  return (m === 'wajib' || m === 'opsional') ? m : '';
}

function modeBuktiDariSesi_(sesiState) {
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesiState.ujian_id; })[0];
  return modeBuktiUjian_(ujian);
}

function fotoBuktiKeKlien_(b) {
  return {
    id: b.id, nama: b.nama, bytes: Number(b.bytes) || 0, waktu: b.waktu, url: b.url,
    urlAsli: 'https://drive.google.com/file/d/' + b.file_id + '/view'
  };
}

function daftarBuktiSesi_(sesiId) {
  return readAll_(SHEET.BUKTI)
    .filter(function (b) { return String(b.sesi_id) === String(sesiId); })
    .map(fotoBuktiKeKlien_);
}

function hapusBuktiUntukSesi_(sesiIds) {
  try {
    var sh = sh_(SHEET.BUKTI);
    if (!sh || sh.getLastRow() < 2) return;
    var headers = headersOf_(SHEET.BUKTI);
    var iSesi = headers.indexOf('sesi_id'), iFile = headers.indexOf('file_id');
    var target = {};
    sesiIds.forEach(function (id) { target[String(id)] = true; });
    var isi = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    for (var i = isi.length - 1; i >= 0; i--) {
      if (target[String(isi[i][iSesi])]) {
        try { DriveApp.getFileById(isi[i][iFile]).setTrashed(true); } catch (e) {}
        sh.deleteRow(i + 2);
      }
    }
  } catch (e) { /* pembersihan best-effort: jangan menggagalkan penghapusan nilai */ }
}

// data: { sesiId, siswaId, base64, mimeType, filename, kunci }
function actionUploadBuktiOrek_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (String(sesi.siswa_id) !== String(data.siswaId)) return jsonOut_({ ok: false, error: 'Sesi ini bukan milik Anda.' });
  if (sesi.status === 'berlangsung') return jsonOut_({ ok: false, error: 'Selesaikan ujian dulu sebelum mengunggah bukti.' });
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesi.ujian_id; })[0];
  if (!modeBuktiUjian_(ujian)) return jsonOut_({ ok: false, error: 'Unggah bukti orak-orik tidak diaktifkan untuk ujian ini.' });

  var mime = String(data.mimeType || '').toLowerCase();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) return jsonOut_({ ok: false, error: 'Format gambar tidak didukung server.' });
  if (!data.base64 || String(data.base64).length > 8000000) return jsonOut_({ ok: false, error: 'Ukuran foto kosong atau terlalu besar.' });

  var kunci = String(data.kunci || '');
  var ada = readAll_(SHEET.BUKTI).filter(function (b) { return String(b.sesi_id) === String(sesi.id); });
  if (kunci) {
    var dup = ada.filter(function (b) { return String(b.kunci) === kunci; })[0];
    if (dup) { var o = fotoBuktiKeKlien_(dup); o.ok = true; o.jumlah = ada.length; o.ulang = true; return jsonOut_(o); }
  }
  if (ada.length >= BUKTI_MAKS_FOTO) return jsonOut_({ ok: false, error: 'Maksimal ' + BUKTI_MAKS_FOTO + ' foto per ujian.' });

  var bytes = Utilities.base64Decode(data.base64);
  if (!bytes.length) return jsonOut_({ ok: false, error: 'Data foto kosong.' });
  var ekstensi = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : (mime === 'image/gif' ? 'gif' : 'jpg'));
  var namaBerkas = 'bukti_' + sesi.id + '_' + (ada.length + 1) + '_' + new Date().getTime() + '.' + ekstensi;
  var file = folderGambarCepat_(BUKTI_FOLDER).createFile(Utilities.newBlob(bytes, mime, namaBerkas));

  // Verifikasi: ukuran berkas di Drive harus sama dengan yang dikirim klien.
  if (Number(file.getSize()) !== bytes.length) {
    try { file.setTrashed(true); } catch (e) {}
    return jsonOut_({ ok: false, error: 'Verifikasi berkas gagal (ukuran tidak cocok), silakan coba lagi.' });
  }

  var baris = {
    id: genId_('BO'), sesi_id: sesi.id, siswa_id: sesi.siswa_id, ujian_id: sesi.ujian_id, kunci: kunci,
    file_id: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000',
    nama: String(data.filename || namaBerkas).slice(0, 120), bytes: bytes.length, waktu: new Date().toISOString()
  };
  // Kunci HANYA saat menulis baris (upload Drive di atas sengaja di luar kunci supaya banyak siswa tidak antre).
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    try { file.setTrashed(true); } catch (e) {}
    return jsonOut_({ ok: false, error: 'Server sedang sibuk, silakan coba lagi.' });
  }
  var jumlah;
  try {
    var terkini = readAll_(SHEET.BUKTI).filter(function (b) { return String(b.sesi_id) === String(sesi.id); });
    var dup2 = kunci ? terkini.filter(function (b) { return String(b.kunci) === kunci; })[0] : null;
    if (dup2) {
      try { file.setTrashed(true); } catch (e) {}
      var o2 = fotoBuktiKeKlien_(dup2); o2.ok = true; o2.jumlah = terkini.length; o2.ulang = true;
      return jsonOut_(o2);
    }
    if (terkini.length >= BUKTI_MAKS_FOTO) {
      try { file.setTrashed(true); } catch (e) {}
      return jsonOut_({ ok: false, error: 'Maksimal ' + BUKTI_MAKS_FOTO + ' foto per ujian.' });
    }
    appendObj_(SHEET.BUKTI, headersOf_(SHEET.BUKTI), baris);
    SpreadsheetApp.flush();
    jumlah = terkini.length + 1;
  } finally {
    lock.releaseLock();
  }
  var hasil = fotoBuktiKeKlien_(baris);
  hasil.ok = true; hasil.jumlah = jumlah;
  return jsonOut_(hasil);
}

// data: { sesiId, siswaId (opsional utk guru) } -> daftar foto + mode ujian
function actionGetBuktiOrek_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (data.siswaId && String(sesi.siswa_id) !== String(data.siswaId)) return jsonOut_({ ok: false, error: 'Sesi ini bukan milik Anda.' });
  return jsonOut_({ ok: true, data: daftarBuktiSesi_(sesi.id), mode: modeBuktiDariSesi_(sesi) });
}

// data: { id, sesiId, siswaId } -> hapus 1 foto (mis. siswa salah pilih foto)
function actionHapusBuktiOrek_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (data.siswaId && String(sesi.siswa_id) !== String(data.siswaId)) return jsonOut_({ ok: false, error: 'Sesi ini bukan milik Anda.' });
  var sh = sh_(SHEET.BUKTI);
  if (sh.getLastRow() < 2) return jsonOut_({ ok: true, jumlah: 0 });
  var barisFoto = readAll_(SHEET.BUKTI).filter(function (b) { return String(b.id) === String(data.id) && String(b.sesi_id) === String(sesi.id); })[0];
  if (!barisFoto) return jsonOut_({ ok: true, jumlah: daftarBuktiSesi_(sesi.id).length }); // sudah tidak ada: anggap berhasil
  var idx = findRowIndexById_(SHEET.BUKTI, barisFoto.id);
  if (idx > 0) sh.deleteRow(idx);
  try { DriveApp.getFileById(barisFoto.file_id).setTrashed(true); } catch (e) {}
  return jsonOut_({ ok: true, jumlah: daftarBuktiSesi_(sesi.id).length });
}

// data.siswa = JSON string {id, username, password, nama, kelas}
function actionUpdateSiswa_(data) {
  var headers = headersOf_(SHEET.SISWA);
  var siswa = JSON.parse(data.siswa);
  var idx = findRowIndexById_(SHEET.SISWA, siswa.id);
  if (idx < 0) return jsonOut_({ ok: false, error: 'Siswa tidak ditemukan.' });
  updateRowByFields_(SHEET.SISWA, headers, idx, siswa);
  return jsonOut_({ ok: true });
}

function actionHapusSiswa_(data) {
  var idx = findRowIndexById_(SHEET.SISWA, data.id);
  if (idx > 0) sh_(SHEET.SISWA).deleteRow(idx);
  return jsonOut_({ ok: true });
}

// Hapus semua siswa dalam satu kelas sekaligus (mis. hapus seluruh "9A").
function actionHapusKelas_(data) {
  var kelas = String(data.kelas || '');
  if (!kelas) return jsonOut_({ ok: false, error: 'Nama kelas tidak boleh kosong.' });
  var sheet = sh_(SHEET.SISWA);
  var headers = headersOf_(SHEET.SISWA);
  var kelasCol = headers.indexOf('kelas') + 1;
  var values = sheet.getDataRange().getValues();
  var dihapus = 0;
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][kelasCol - 1]) === kelas) { sheet.deleteRow(i + 1); dihapus++; }
  }
  return jsonOut_({ ok: true, count: dihapus });
}

// data: { guruId, passwordLama, username, password (opsional, kosongkan jika tidak diganti), nama }
function actionUpdateAkunGuru_(data) {
  var idx = findRowIndexById_(SHEET.GURU, data.guruId);
  if (idx < 0) return jsonOut_({ ok: false, error: 'Akun guru tidak ditemukan.' });
  var headers = headersOf_(SHEET.GURU);
  var row = sh_(SHEET.GURU).getRange(idx, 1, 1, headers.length).getValues()[0];
  var current = {};
  headers.forEach(function (h, i) { current[h] = row[i]; });

  if (String(current.password) !== String(data.passwordLama || '')) {
    return jsonOut_({ ok: false, error: 'Password saat ini salah.' });
  }

  var usernameBaru = String(data.username || '').trim();
  if (!usernameBaru) return jsonOut_({ ok: false, error: 'Username tidak boleh kosong.' });

  var dipakaiGuruLain = readAll_(SHEET.GURU).some(function (g) {
    return g.username === usernameBaru && String(g.id) !== String(data.guruId);
  });
  if (dipakaiGuruLain) return jsonOut_({ ok: false, error: 'Username sudah dipakai akun guru lain.' });

  var fields = { username: usernameBaru, nama: String(data.nama || current.nama) };
  if (data.password) fields.password = String(data.password);
  updateRowByFields_(SHEET.GURU, headers, idx, fields);

  return jsonOut_({ ok: true, user: { id: data.guruId, nama: fields.nama, role: 'guru', username: usernameBaru } });
}

function actionSimpanTema_(data) {
  var idx = findRowIndexById_(SHEET.GURU, data.guruId);
  if (idx > 0) updateRowByFields_(SHEET.GURU, headersOf_(SHEET.GURU), idx, { tema_json: data.tema });
  return jsonOut_({ ok: true });
}

function actionGetTema_(data) {
  var guru = readAll_(SHEET.GURU)[0]; // 1 sekolah = 1 tema aktif (bisa dikembangkan per-guru)
  if (data.guruId) {
    var found = readAll_(SHEET.GURU).filter(function (g) { return g.id === data.guruId; })[0];
    if (found) guru = found;
  }
  var tema = defaultTema_();
  try { if (guru && guru.tema_json) tema = JSON.parse(guru.tema_json); } catch (e) {}
  return jsonOut_({ ok: true, tema: tema });
}

// Upload gambar soal (atau logo aplikasi, dsb.) ke Google Drive (base64 dari
// klien) -> mengembalikan URL publik. data.folder opsional (default folder
// gambar soal lama) supaya file logo bisa dipisah ke foldernya sendiri tanpa
// perlu endpoint baru.
// PERF: ID folder disimpan di cache supaya tidak mencari folder di Drive
// (DriveApp.getFoldersByName) di SETIAP unggahan, dan folder dibagikan SEKALI
// (bukan setSharing per file yang sangat lambat). File baru di dalam folder
// berbagi otomatis mewarisi akses "siapa saja dengan link".
function folderGambarCepat_(namaFolder) {
  var cache = CacheService.getScriptCache();
  var kunci = 'folder_id_' + namaFolder;
  var id = cache.get(kunci);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { cache.remove(kunci); }
  }
  var folder = getOrCreateFolder_(namaFolder);
  try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  cache.put(kunci, folder.getId(), 21600);
  return folder;
}

function actionUploadGambar_(data) {
  var namaFolder = data.folder ? String(data.folder) : 'CBT_Gambar_Soal';
  var folder = folderGambarCepat_(namaFolder);
  var bytes = Utilities.base64Decode(data.base64);
  var blob = Utilities.newBlob(bytes, data.mimeType, data.filename);
  var file = folder.createFile(blob);
  // CATATAN: sejak awal 2024 Google mematikan pola lama "uc?export=view&id=..." untuk
  // hotlink <img src> lintas domain (lihat https://issuetracker.google.com/issues/319531488) --
  // pola itu sekarang tampil sebagai ikon "gambar rusak" di browser siswa/guru. Pola pengganti
  // yang masih berfungsi adalah "thumbnail?id=...&sz=...".
  var url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
  return jsonOut_({ ok: true, url: url });
}

// ----------------------------------------------------------------------------
// IDENTITAS APLIKASI (Logo & Nama CBT) — 1 sekolah = 1 identitas aktif,
// dipakai otomatis di Portal Guru maupun Portal Siswa (termasuk sebelum
// login). Disimpan di sheet "Config" (key/value) yang memang sudah ada di
// SCHEMA sejak awal tapi belum dipakai fitur apa pun -- jadi TIDAK perlu
// kolom/sheet baru maupun redeploy khusus untuk memakai fitur ini.
// ----------------------------------------------------------------------------
function getConfigValue_(key) {
  var row = readAll_(SHEET.CONFIG).filter(function (r) { return String(r.key) === String(key); })[0];
  return row ? row.value : '';
}

function setConfigValue_(key, value) {
  var headers = headersOf_(SHEET.CONFIG);
  var sh = sh_(SHEET.CONFIG);
  // Cek jumlah baris data dulu sebelum memakai findRowIndexById_ -- kalau
  // sheet Config masih kosong (cuma baris header, mis. baru pertama kali
  // dipakai lewat fitur ini), getRange(2,...) di findRowIndexById_ akan
  // error "number of rows... must be at least 1" karena tidak ada baris
  // ke-2 sama sekali. Di sini cukup anggap belum ada baris cocok (idx -1)
  // supaya langsung ditambahkan sebagai baris baru, tanpa mengubah
  // findRowIndexById_ itu sendiri (dipakai banyak fitur lain yang sudah
  // berjalan normal).
  var idx = sh.getLastRow() >= 2 ? findRowIndexById_(SHEET.CONFIG, key) : -1; // kolom pertama (key) dipakai sebagai pencocok baris
  if (idx > 0) {
    updateRowByFields_(SHEET.CONFIG, headers, idx, { value: value });
  } else {
    appendObj_(SHEET.CONFIG, headers, { key: key, value: value });
  }
}

function actionGetBranding_(data) {
  return jsonOut_({
    ok: true,
    branding: {
      namaAplikasi: getConfigValue_('nama_aplikasi') || '',
      logoUrl: getConfigValue_('logo_url') || ''
    }
  });
}

function actionSimpanBranding_(data) {
  setConfigValue_('nama_aplikasi', String(data.namaAplikasi || '').trim());
  setConfigValue_('logo_url', String(data.logoUrl || ''));
  return jsonOut_({ ok: true });
}

// ----------------------------------------------------------------------------
// PENGATURAN KUNCI PERANGKAT (device lock) — tombol Aktif/Tidak Aktif di tab
// "Status Login". Kalau Aktif (default, perilaku lama): satu akun siswa hanya
// boleh login/ping dari satu perangkat dalam satu waktu. Kalau Tidak Aktif:
// pengecekan device_id dilewati sepenuhnya di actionLogin_ & actionPing_,
// siswa boleh login dari perangkat mana pun tanpa tertolak/terputus.
// Disimpan sebagai config key/value biasa (sama seperti branding), tapi
// dicache di CacheService (bukan dibaca dari Sheets tiap kali) karena
// actionPing_ dipanggil sangat sering (tiap 60 detik x banyak siswa).
// ----------------------------------------------------------------------------
function deviceLockAktif_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('device_lock_aktif');
  if (cached !== null) return cached !== '0';
  var v = getConfigValue_('device_lock_aktif');
  var aktif = !(v === '0' || v === 'false'); // kosong/belum diatur = default Aktif
  cache.put('device_lock_aktif', aktif ? '1' : '0', 300);
  return aktif;
}

function actionGetPengaturanLock_(data) {
  return jsonOut_({ ok: true, aktif: deviceLockAktif_() });
}

function actionSimpanPengaturanLock_(data) {
  var aktif = !!data.aktif;
  setConfigValue_('device_lock_aktif', aktif ? '1' : '0');
  CacheService.getScriptCache().put('device_lock_aktif', aktif ? '1' : '0', 300);
  return jsonOut_({ ok: true, aktif: aktif });
}

// Tanggal lahir selalu dikirim ke klien sebagai teks yyyy-mm-dd (Sheets bisa mengubah sel jadi objek tanggal).
function tglIso_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'Asia/Makassar', 'yyyy-MM-dd');
  return String(v);
}

// ---- Tampilkan token di layar peserta (mode latihan, seperti simulasi TKA) ----
function tokenSiswaAktif_() {
  var v = getConfigValue_('tampil_token_siswa');
  return !(v === '0' || v === 'false'); // default Aktif
}
function actionGetPengaturanTokenSiswa_(data) { return jsonOut_({ ok: true, aktif: tokenSiswaAktif_() }); }
function actionSimpanPengaturanTokenSiswa_(data) {
  var aktif = data.aktif === true || String(data.aktif).toLowerCase() === 'true';
  setConfigValue_('tampil_token_siswa', aktif ? '1' : '0');
  return jsonOut_({ ok: true, aktif: aktif });
}
// Daftar ujian yang sedang dibuka. Token HANYA disertakan bila guru mengaktifkan opsi di atas.
function actionGetTokenAktif_(data) {
  var tampil = tokenSiswaAktif_();
  var now = new Date();
  var list = readAll_(SHEET.UJIAN).filter(function (u) {
    if (u.status !== 'aktif') return false;
    if (u.mulai && now < new Date(u.mulai)) return false;
    var batas = u.selesai ? new Date(new Date(u.selesai).getTime() + (Number(u.toleransi_menit) || 0) * 60000) : null;
    return !(batas && now > batas);
  }).filter(function (u) { return !data.siswaId || cekIzinKelas_(u, data.siswaId).ok; }) // kelas yang belum diaktifkan tidak melihat token
    .map(function (u) { return { judul: u.judul, token: tampil ? u.token : '' }; });
  return jsonOut_({ ok: true, tampil: tampil, ujian: list });
}

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

// ----------------------------------------------------------------------------
// SKALA: STATE SESI VIA CACHE + FLUSH BERKALA
// ----------------------------------------------------------------------------
// Inti perbaikan supaya tahan 500+ siswa bersamaan: baca/tulis sesi TIDAK lagi
// langsung ke Google Sheets di jalur yang sering dipanggil (autosave jawaban
// tiap 20 detik, mulai ujian, lapor pelanggaran, submit). Semua itu sekarang
// membaca/menulis ke CacheService (super cepat, ~10-50ms, dan HAMPIR TIDAK
// PERNAH bentrok antar siswa karena tiap sesi punya kuncinya sendiri:
// 'sesi_state_<id>'). Data itu baru benar-benar ditulis ke Sheets secara
// BERKALA & BERKELOMPOK (batch) oleh flushSesiBerkala(), dipicu oleh trigger
// waktu tiap 1 menit (lihat pasangTriggerFlush_). Jadi 500 siswa yang
// autosave "bersamaan" cukup 1x tulis batch ke Sheets/menit, bukan 500x
// tulis satu-satu yang berebut kunci.
//
// Konsekuensi yang perlu diketahui (trade-off yang disengaja):
//  - Ada jeda maksimal ~1 menit sebelum jawaban/skor "benar-benar" muncul di
//    Google Sheets (kalau guru buka Sheets-nya langsung). Siswa sendiri TIDAK
//    terpengaruh — getHasil/getRekapNilai membaca cache dulu, jadi tetap
//    akurat & instan dari sisi siswa maupun saat guru buka rekap di aplikasi.
//  - Cache Apps Script bertahan maksimal 6 jam. Untuk ujian yang jauh lebih
//    panjang dari itu (jarang terjadi), sebaiknya biarkan flush berjalan
//    normal (tiap 1 menit) supaya data keburu masuk Sheets sebelum cache
//    kadaluarsa -- ini otomatis terjadi selama trigger tetap aktif, tidak
//    perlu tindakan tambahan.
// ----------------------------------------------------------------------------

var CACHE_TTL_DETIK = 21600; // 6 jam — maksimum yang diizinkan CacheService

function sesiCacheKey_(sesiId) { return 'sesi_state_' + sesiId; }

// Ambil state sesi TERBARU yang diketahui sistem: dari cache kalau ada
// (paling sering, karena sesi yang sedang aktif selalu di-cache), atau dari
// Sheets sebagai fallback (mis. sesi lama yang cache-nya sudah kadaluarsa,
// atau baru saja restart) -- ini jalur DINGIN, jarang terjadi, jadi linear
// scan di findRowIndexById_ tidak masalah di sini.
function ambilSesiState_(sesiId) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(sesiCacheKey_(sesiId));
  if (cached) return JSON.parse(cached);
  var idx = findRowIndexById_(SHEET.SESI, sesiId);
  if (idx < 1) return null;
  var headers = headersOf_(SHEET.SESI);
  var row = sh_(SHEET.SESI).getRange(idx, 1, 1, headers.length).getValues()[0];
  var obj = {};
  headers.forEach(function (h, i) { obj[h] = row[i]; });
  cache.put(sesiCacheKey_(sesiId), JSON.stringify(obj), CACHE_TTL_DETIK);
  return obj;
}

// Gabungkan `perubahan` ke state sesi yang sudah ada (atau buat baru kalau
// belum ada), simpan ke cache, lalu tandai sesi ini perlu di-flush ke Sheets.
// TIDAK menyentuh Sheets sama sekali -> ini yang membuatnya cepat & tidak
// gampang bentrok walau dipanggil ratusan kali per detik dari siswa berbeda.
function simpanSesiState_(sesiId, perubahan) {
  var current = ambilSesiState_(sesiId) || { id: sesiId };
  var updated = Object.assign({}, current, perubahan, { id: sesiId });
  CacheService.getScriptCache().put(sesiCacheKey_(sesiId), JSON.stringify(updated), CACHE_TTL_DETIK);
  tandaiPendingSesi_(sesiId);
  return updated;
}

// PERBAIKAN BUG: menggabungkan baris Sesi dari Sheets dengan sesi yang BARU
// DIBUAT (siswa baru saja klik "Mulai Ujian") tapi belum sempat di-flush ke
// Sheets oleh flushSesiBerkala() (jeda hingga 1 menit, lihat tandaiPendingSesi_).
// Tanpa fungsi ini, sesi yang benar-benar baru TIDAK PUNYA baris fisik di
// Sheets sama sekali, sehingga readAll_(SHEET.SESI) tidak menemukannya --
// akibatnya Pemantauan Ujian/Rekap Nilai/Analisis Soal salah menampilkan
// "belum ada siswa yang mengerjakan/menyelesaikan" padahal sebenarnya sudah
// ada siswa yang aktif mengerjakan (datanya cuma masih di cache).
// Dipakai oleh actionGetPemantauanUjian_, actionGetRekapNilai_, dan
// actionGetAnalisisSoal_ sebagai pengganti readAll_(SHEET.SESI).filter(...).
function bacaSesiGabunganUntukUjian_(ujianId) {
  var sesiList = readAll_(SHEET.SESI).filter(function (s) { return s.ujian_id === ujianId; });
  var idSudahAda = {};
  sesiList.forEach(function (s) { idSudahAda[s.id] = true; });

  var raw = CacheService.getScriptCache().get('pending_sesi_ids');
  var pendingIds = raw ? JSON.parse(raw) : [];
  pendingIds.forEach(function (id) {
    if (idSudahAda[id]) return; // sudah punya baris (tinggal di-update, bukan baris baru) -> nanti tetap disegarkan lewat ambilSesiState_ oleh pemanggil
    var state = ambilSesiState_(id);
    if (state && state.ujian_id === ujianId) { sesiList.push(state); idSudahAda[id] = true; }
  });
  return sesiList;
}

// Menambahkan sesiId ke daftar "perlu di-flush" (daftar ID saja, bukan
// datanya -> tetap kecil walau ribuan sesi, jauh di bawah batas 100KB per
// key CacheService). Pakai kunci global, TAPI critical section-nya sangat
// singkat (cuma baca-tambah-tulis satu array kecil di cache, hitungan
// milidetik) -- beda jauh dari dulu yang menahan kunci selama baca-ubah-tulis
// ke Sheets (ratusan ms - detik). Kalau (sangat jarang) gagal dapat kunci
// dalam 5 detik, TIDAK dianggap error ke siswa: state terbarunya tetap aman
// tersimpan di cache (baris di atas), dan otomatis ikut ke-flush di
// kesempatan berikutnya begitu ada aksi lain yang berhasil menandai sesi ini
// (mis. autosave berikutnya 20 detik kemudian) -- jadi self-healing, tidak
// ada data yang hilang, cuma mungkin telat 1 siklus flush.
function tandaiPendingSesi_(sesiId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get('pending_sesi_ids');
    var ids = raw ? JSON.parse(raw) : [];
    if (ids.indexOf(sesiId) === -1) ids.push(sesiId);
    cache.put('pending_sesi_ids', JSON.stringify(ids), CACHE_TTL_DETIK);
  } finally {
    lock.releaseLock();
  }
}

// Dipanggil oleh trigger waktu tiap 1 menit (lihat pasangTriggerFlush_).
// Menulis SEMUA perubahan sesi yang tertunda ke Sheets dalam PALING BANYAK 2
// operasi tulis (satu untuk baris yang sudah ada, satu lagi untuk baris
// baru) -- tidak peduli apakah itu untuk 5 siswa atau 500 siswa sekaligus.
function flushSesiBerkala() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return; // sedang diproses siklus lain / sibuk -> coba lagi 1 menit berikutnya
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get('pending_sesi_ids');
    if (!raw) return;
    var ids = JSON.parse(raw);
    // Kosongkan antrean SEKARANG (sebelum diproses) -- perubahan baru yang
    // masuk SELAMA proses flush ini berjalan akan otomatis membuat antrean
    // baru lagi lewat tandaiPendingSesi_, jadi tidak akan pernah hilang.
    cache.remove('pending_sesi_ids');
    if (!ids || ids.length === 0) return;

    var sh = sh_(SHEET.SESI);
    var headers = headersOf_(SHEET.SESI);
    var lastRow = sh.getLastRow();
    var jumlahBaris = Math.max(lastRow - 1, 0);
    var data = jumlahBaris > 0 ? sh.getRange(2, 1, jumlahBaris, headers.length).getValues() : [];
    var idCol = headers.indexOf('id');
    var peta = {};
    data.forEach(function (row, i) { peta[String(row[idCol])] = i; });

    var barisBaru = [];
    ids.forEach(function (id) {
      var stateRaw = cache.get(sesiCacheKey_(id));
      if (!stateRaw) return; // sudah kadaluarsa dari cache, lewati (data lama di Sheets tetap dipakai)
      var obj = JSON.parse(stateRaw);
      var row = headers.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; });
      if (peta.hasOwnProperty(id)) {
        data[peta[id]] = row; // update baris yang sudah ada, di memori dulu
      } else {
        barisBaru.push(row); // sesi baru, belum pernah ada barisnya di Sheets
      }
    });

    if (data.length > 0) sh.getRange(2, 1, data.length, headers.length).setValues(data);
    if (barisBaru.length > 0) sh.getRange(2 + data.length, 1, barisBaru.length, headers.length).setValues(barisBaru);
  } finally {
    lock.releaseLock();
  }
}

// --- Heartbeat/ping siswa: pola yang sama (cache dulu, flush berkala) ---
// khusus untuk kolom device_id & last_ping di sheet Siswa, supaya ping tiap
// 60 detik x 500 siswa juga tidak membebani Sheets satu-satu.
function pingCacheKey_(siswaId) { return 'ping_state_' + siswaId; }

function tandaiPendingPing_(siswaId, perubahan) {
  var cache = CacheService.getScriptCache();
  var current = cache.get(pingCacheKey_(siswaId));
  var obj = current ? JSON.parse(current) : {};
  Object.assign(obj, perubahan);
  cache.put(pingCacheKey_(siswaId), JSON.stringify(obj), CACHE_TTL_DETIK);

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return; // best-effort, self-healing lewat ping berikutnya (60 detik lagi)
  try {
    var raw = cache.get('pending_ping_ids');
    var ids = raw ? JSON.parse(raw) : [];
    if (ids.indexOf(siswaId) === -1) ids.push(siswaId);
    cache.put('pending_ping_ids', JSON.stringify(ids), CACHE_TTL_DETIK);
  } finally {
    lock.releaseLock();
  }
}

function flushPingBerkala() {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('pending_ping_ids');
  if (!raw) return;
  var ids = JSON.parse(raw);
  cache.remove('pending_ping_ids');
  if (!ids || ids.length === 0) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    var sh = sh_(SHEET.SISWA);
    var headers = headersOf_(SHEET.SISWA);
    var lastRow = sh.getLastRow();
    var jumlahBaris = Math.max(lastRow - 1, 0);
    var data = jumlahBaris > 0 ? sh.getRange(2, 1, jumlahBaris, headers.length).getValues() : [];
    var idCol = headers.indexOf('id');
    var deviceCol = headers.indexOf('device_id');
    var pingCol = headers.indexOf('last_ping');
    var peta = {};
    data.forEach(function (row, i) { peta[String(row[idCol])] = i; });

    var berubah = false;
    ids.forEach(function (id) {
      var stateRaw = cache.get(pingCacheKey_(id));
      if (!stateRaw || !peta.hasOwnProperty(id)) return;
      var obj = JSON.parse(stateRaw);
      var i = peta[id];
      if (obj.hasOwnProperty('device_id')) { data[i][deviceCol] = obj.device_id; berubah = true; }
      if (obj.hasOwnProperty('last_ping')) { data[i][pingCol] = obj.last_ping; berubah = true; }
    });
    if (berubah) sh.getRange(2, 1, data.length, headers.length).setValues(data);
  } finally {
    lock.releaseLock();
  }
}

// Dipanggil oleh trigger waktu (tiap 1 menit) -- lihat pasangTriggerFlush_.
// Kalau salah satu gagal (mis. lock/timeout langka), yang lain tetap jalan.
function jalankanFlushBerkala() {
  try { flushSesiBerkala(); } catch (e) { Logger.log('flushSesiBerkala error: ' + e); }
  try { flushPingBerkala(); } catch (e) { Logger.log('flushPingBerkala error: ' + e); }
  try { perbaruiRekapKelas_(); } catch (e) { Logger.log('perbaruiRekapKelas_ error: ' + e); }
}

// ----------------------------------------------------------------------------
// REKAP NILAI PER KELAS (sheet terpisah otomatis, mis. "Rekap - 9A")
// ----------------------------------------------------------------------------
// Diperbarui otomatis tiap kali jalankanFlushBerkala jalan (siklus 1 menit
// yang sama dengan penulisan sheet "Sesi") -- guru tidak perlu klik apa pun,
// dan dipanggil SETELAH flushSesiBerkala supaya datanya selalu yang terbaru.
// Format: 1 baris per nilai ujian per siswa (bukan matriks), dikelompokkan
// per kelas ke sheet terpisah "Rekap - <kelas>". Sheet ini SELALU ditulis
// ulang penuh tiap siklus (bukan ditambah baris), supaya tidak ada baris
// ganda/basi kalau nilai dihitung ulang atau kelas siswa berubah -- aman,
// karena sheet ini murni turunan/read-only bagi guru; sumber aslinya tetap
// sheet "Sesi". Siswa tanpa kelas terisi masuk ke sheet "Rekap - Tanpa Kelas".
var REKAP_KELAS_PREFIX = 'Rekap - ';
var REKAP_KELAS_HEADER = ['Nama', 'Kelas', 'Ujian', 'Nilai', 'Status', 'Pelanggaran', 'Selesai', 'Durasi Pengerjaan'];

// Format waktu & durasi yang enak dibaca di sheet rekap.
function formatWaktuRekap_(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function formatDurasiRekap_(mulai, selesai) {
  if (!mulai || !selesai) return '-';
  var a = new Date(mulai).getTime(), b = new Date(selesai).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return '-';
  var detik = Math.round((b - a) / 1000);
  var j = Math.floor(detik / 3600), m = Math.floor((detik % 3600) / 60), d = detik % 60;
  return (j ? j + ' jam ' : '') + ((j || m) ? m + ' mnt ' : '') + d + ' dtk';
}

function perbaruiRekapKelas_() {
  var ss = ss_();
  var siswaMap = {};
  readAll_(SHEET.SISWA).forEach(function (s) { siswaMap[s.id] = s; });
  var ujianMap = {};
  readAll_(SHEET.UJIAN).forEach(function (u) { ujianMap[u.id] = u; });

  var sesiList = readAll_(SHEET.SESI).filter(function (s) { return s.status && s.status !== 'berlangsung'; });

  var perKelas = {};
  sesiList.forEach(function (s) {
    var siswa = siswaMap[s.siswa_id];
    if (!siswa) return; // siswa sudah dihapus, lewati
    var ujian = ujianMap[s.ujian_id];
    var kelas = siswa.kelas || 'Tanpa Kelas';
    if (!perKelas[kelas]) perKelas[kelas] = [];
    perKelas[kelas].push([
      siswa.nama || '(tidak dikenal)',
      kelas,
      ujian ? ujian.judul : '(ujian dihapus)',
      s.nilai,
      s.lulus === true || s.lulus === 'true' ? 'Lulus' : (s.lulus === false || s.lulus === 'false' ? 'Remedial' : '-'),
      s.pelanggaran || 0,
      s.selesai || '',                              // ISO mentah: dipakai untuk pengurutan, diformat saat ditulis
      formatDurasiRekap_(s.mulai, s.selesai)
    ]);
  });

  Object.keys(perKelas).forEach(function (kelas) {
    var rows = perKelas[kelas].sort(function (a, b) {
      if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
      return String(a[6]).localeCompare(String(b[6]));
    });
    rows = rows.map(function (r) { r[6] = formatWaktuRekap_(r[6]); return r; });
    var namaSheet = namaSheetRekapKelas_(kelas);
    var sh = ss.getSheetByName(namaSheet);
    if (!sh) sh = ss.insertSheet(namaSheet);
    sh.clearContents();
    sh.getRange(1, 1, 1, REKAP_KELAS_HEADER.length).setValues([REKAP_KELAS_HEADER]);
    if (rows.length > 0) sh.getRange(2, 1, rows.length, REKAP_KELAS_HEADER.length).setValues(rows);
    sh.setFrozenRows(1);
  });

  // Kosongkan (bukan hapus, supaya guru tidak kehilangan sheet yang mungkin
  // sudah ia format/beri komentar manual) sheet rekap kelas yang kelasnya
  // sudah tidak punya siswa lagi -- mis. kelas dihapus/diganti nama.
  ss.getSheets().forEach(function (sh) {
    var nm = sh.getName();
    if (nm.indexOf(REKAP_KELAS_PREFIX) === 0) {
      var kelas = nm.substring(REKAP_KELAS_PREFIX.length);
      if (!perKelas.hasOwnProperty(kelas)) {
        sh.clearContents();
        sh.getRange(1, 1, 1, REKAP_KELAS_HEADER.length).setValues([REKAP_KELAS_HEADER]);
      }
    }
  });
}

// Nama sheet Google Sheets maks 100 karakter & tidak boleh mengandung: [ ] * ? / \ :
function namaSheetRekapKelas_(kelas) {
  var bersih = String(kelas).replace(/[\[\]\*\?\/\\:]/g, '-').trim();
  var nama = REKAP_KELAS_PREFIX + bersih;
  return nama.length > 100 ? nama.substring(0, 100) : nama;
}

// Dipanggil dari tombol "⬆ Kirim ke Spreadsheet" di sidebar Portal Guru
// (opsi cadangan, tampil di semua halaman) -- sama persis dengan yang
// dikerjakan trigger otomatis tiap 1 menit (jalankanFlushBerkala), cuma
// dipicu manual oleh guru saat itu juga, tanpa perlu menunggu.
function actionPaksaFlushSesiSekarang_(data) {
  jalankanFlushBerkala();
  return jsonOut_({ ok: true });
}

// Pasang trigger waktu (tiap 1 menit) yang menjalankan jalankanFlushBerkala.
// AMAN dipanggil berkali-kali -- trigger lama dengan nama fungsi yang sama
// selalu dihapus dulu sebelum membuat yang baru, supaya tidak menumpuk
// trigger duplikat kalau fungsi ini dijalankan ulang.
function pasangTriggerFlush_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'jalankanFlushBerkala') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('jalankanFlushBerkala').timeBased().everyMinutes(1).create();
  Logger.log('Trigger flush berkala (tiap 1 menit) terpasang.');
}

// ----------------------------------------------------------------------------
// SISWA — ALUR UJIAN
// ----------------------------------------------------------------------------
// ---- TOKEN PER KELAS ----
// Ujian.token_kelas: '' = token aktif untuk SEMUA kelas (perilaku lama); selain itu JSON array nama kelas yang
// token-nya AKTIF (mis. ["9A","9B"]; "[]" = semua kelas dikunci). Kelas yang tidak tercantum TIDAK bisa memulai ujian
// walau tahu tokennya. Siswa yang sudah punya sesi berjalan tetap boleh melanjutkan.
function normKelas_(k) { var t = String(k == null ? '' : k).trim().toLowerCase().replace(/\s+/g, ' '); return (t === '' || t === '-') ? 'tanpa kelas' : t; }
function kelasAktifUjian_(ujian) {
  var raw = String((ujian && ujian.token_kelas) == null ? '' : ujian.token_kelas).trim();
  if (raw === '') return null; // semua kelas
  try { var a = JSON.parse(raw); if (Array.isArray(a)) return a.map(normKelas_); } catch (e) { }
  return null;
}
function kelasSiswa_(siswaId) {
  if (!siswaId) return '';
  var cache = CacheService.getScriptCache(); var kunci = 'siswa_kelas_' + siswaId;
  var c = cache.get(kunci); if (c !== null) return c;
  var kelas = '';
  var idx = findRowIndexById_(SHEET.SISWA, siswaId);
  if (idx > 0) { var h = headersOf_(SHEET.SISWA); kelas = String(sh_(SHEET.SISWA).getRange(idx, 1, 1, h.length).getValues()[0][h.indexOf('kelas')] || ''); }
  cache.put(kunci, kelas, 120);
  return kelas;
}
function cekIzinKelas_(ujian, siswaId) {
  var aktif = kelasAktifUjian_(ujian);
  if (aktif === null) return { ok: true };
  var kelas = kelasSiswa_(siswaId);
  if (aktif.indexOf(normKelas_(kelas)) >= 0) return { ok: true };
  return { ok: false, error: 'Token ujian ini belum diaktifkan untuk kelas ' + (String(kelas).trim() || 'Anda') + '. Tunggu jadwal dari guru/pengawas.' };
}
// data: { ujianId, kelas: '' (semua kelas) | JSON array nama kelas aktif }
function actionSetTokenKelas_(data) {
  var idx = findRowIndexById_(SHEET.UJIAN, data.ujianId);
  if (idx < 1) return jsonOut_({ ok: false, error: 'Ujian tidak ditemukan.' });
  var nilai = String(data.kelas == null ? '' : data.kelas).trim();
  if (nilai !== '') {
    var a = null; try { a = JSON.parse(nilai); } catch (e) { a = null; }
    if (!Array.isArray(a) || a.length > 300) return jsonOut_({ ok: false, error: 'Daftar kelas tidak valid.' });
    var unik = []; var lihat = {};
    a.forEach(function (k) { var t = String(k == null ? '' : k).trim().slice(0, 60); var n = normKelas_(t); if (t && !lihat[n]) { lihat[n] = 1; unik.push(t); } });
    nilai = JSON.stringify(unik);
  }
  updateRowByFields_(SHEET.UJIAN, headersOf_(SHEET.UJIAN), idx, { token_kelas: nilai });
  SpreadsheetApp.flush();
  return jsonOut_({ ok: true, kelas: nilai });
}

// Status ujian: 'nonaktif' | 'terjadwal' | 'selesai' | 'berlangsung' (jadwal + toleransi keterlambatan, sama dgn cek token).
function statusUjian_(u) {
  if (!u || u.status !== 'aktif') return 'nonaktif';
  var now = new Date();
  if (u.mulai && now < new Date(u.mulai)) return 'terjadwal';
  var batas = u.selesai ? new Date(new Date(u.selesai).getTime() + (Number(u.toleransi_menit) || 0) * 60000) : null;
  if (batas && now > batas) return 'selesai';
  return 'berlangsung';
}
// Bila ada beberapa ujian bertoken sama (mis. baris tersalin di Sheets), pilih yang aktif & sedang dibuka lebih dulu.
function pilihUjianByToken_(list, token) {
  var t = String(token || '').toUpperCase();
  var cocok = (list || []).filter(function (u) { return String(u.token) === t; });
  if (cocok.length < 2) return cocok[0];
  var a = cocok.filter(function (u) { return statusUjian_(u) === 'berlangsung'; })[0];
  if (a) return a;
  var b = cocok.filter(function (u) { return u.status === 'aktif'; })[0];
  return b || cocok[0];
}

function actionCekToken_(data) {
  var blokirCek = data.siswaId ? statusBlokirSiswa_(data.siswaId) : null;
  if (blokirCek && blokirCek.aktif) return jsonOut_({ ok: false, error: pesanBlokir_(blokirCek) });
  var ujian = pilihUjianByToken_(readAll_(SHEET.UJIAN), data.token);
  if (!ujian) return jsonOut_({ ok: false, error: 'Token ujian tidak ditemukan.' });
  var now = new Date();
  if (ujian.mulai && now < new Date(ujian.mulai)) return jsonOut_({ ok: false, error: 'Ujian belum dibuka.' });
  var batasTelat = ujian.selesai ? new Date(new Date(ujian.selesai).getTime() + (Number(ujian.toleransi_menit) || 0) * 60000) : null;
  if (batasTelat && now > batasTelat) return jsonOut_({ ok: false, error: 'Waktu akses ujian sudah berakhir.' });
  if (ujian.status !== 'aktif') return jsonOut_({ ok: false, error: 'Ujian ini sedang tidak aktif.' });
  var lanjutan = false;
  try {
    if (data.siswaId) lanjutan = readAll_(SHEET.SESI).some(function (s) { return s.ujian_id === ujian.id && s.siswa_id === data.siswaId && s.status !== 'selesai' && s.status !== 'diblokir'; });
  } catch (e) { lanjutan = false; }
  if (!lanjutan) { var izin = cekIzinKelas_(ujian, data.siswaId); if (!izin.ok) return jsonOut_({ ok: false, error: izin.error }); }
  return jsonOut_({ ok: true, ujian: { id: ujian.id, judul: ujian.judul, durasiMenit: ujian.durasi_menit, kategori: ujian.kategori, lanjutan: lanjutan } });
}

// Membuat / melanjutkan sesi ujian siswa. Soal diacak SEKALI per siswa dan disimpan,
// supaya urutan tetap konsisten walau reload/refresh.
function actionMulaiUjian_(data) {
  // Penegakan utama fitur Blokir Akun: siswa yang diblokir tidak bisa memulai ATAUPUN melanjutkan ujian.
  var blokirMulai = statusBlokirSiswa_(data.siswaId);
  if (blokirMulai.aktif) return jsonOut_({ ok: false, error: pesanBlokir_(blokirMulai) });
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === data.ujianId; })[0];
  if (!ujian) return jsonOut_({ ok: false, error: 'Ujian tidak ditemukan.' });

  // Cache-first: kunci "siswa+ujian -> sesiId" supaya TIDAK perlu baca ulang
  // SELURUH sheet Sesi (readAll_) setiap kali siswa membuka/reload halaman
  // ujian -- penting saat banyak siswa mulai/reload bersamaan.
  var cache = CacheService.getScriptCache();
  var kunciMap = 'map_sesi_' + data.ujianId + '_' + data.siswaId;
  var sesiId = cache.get(kunciMap);
  var existing = sesiId ? ambilSesiState_(sesiId) : null;

  if (!existing) {
    // Belum ada di cache -> baru cek Sheets (jalur dingin: hanya kejadian
    // pertama kali per siswa per ujian, atau kalau cache sempat kadaluarsa).
    var sesiList = readAll_(SHEET.SESI);
    for (var i = 0; i < sesiList.length; i++) {
      if (sesiList[i].ujian_id === data.ujianId && sesiList[i].siswa_id === data.siswaId) { existing = sesiList[i]; sesiId = existing.id; break; }
    }
    if (sesiId) cache.put(kunciMap, sesiId, CACHE_TTL_DETIK);
  }

  if (existing && existing.status === 'selesai') {
    // PEMULIHAN: bukti orak-orik WAJIB tapi belum ada satu foto pun (mis. siswa menutup halaman / HP mati
    // sebelum sempat mengunggah) -> arahkan langsung ke halaman unggah, BUKAN ke pesan "sudah selesai".
    var perluBukti = modeBuktiUjian_(ujian) === 'wajib' && daftarBuktiSesi_(sesiId).length === 0;
    var perluSurvei = !!jenisSurveiUjian_(ujian) && !suratSurveiAda_(sesiId);
    if (perluBukti || perluSurvei) {
      return jsonOut_({ ok: true, perluBukti: perluBukti, perluSurvei: perluSurvei, sesiId: sesiId, nilai: existing.nilai, lulus: existing.lulus, buktiOrek: perluBukti ? 'wajib' : '', judul: ujian.judul });
    }
    return jsonOut_({ ok: false, error: 'Anda sudah menyelesaikan ujian ini.' });
  }
  if (existing && existing.status === 'diblokir') {
    return jsonOut_({ ok: false, error: 'Sesi ujian Anda telah diblokir karena pelanggaran. Hubungi guru.' });
  }
  // Token per kelas: sesi BARU hanya boleh dibuat bila kelas siswa diaktifkan (sesi berjalan tetap boleh dilanjutkan).
  if (!existing && ujian.status !== 'aktif') return jsonOut_({ ok: false, error: 'Ujian ini sedang tidak aktif.' }); // siswa yang sudah mengerjakan tetap boleh melanjutkan
  if (!existing) { var izinK = cekIzinKelas_(ujian, data.siswaId); if (!izinK.ok) return jsonOut_({ ok: false, error: izinK.error }); }

  var soalIds = String(ujian.soal_ids || '').split(',').filter(Boolean);
  var bankSoal = readAll_(SHEET.BANK_SOAL);
  var soalMap = {}; bankSoal.forEach(function (s) { soalMap[s.id] = s; });

  var urutan, jawaban, ragu, mulai, opsiAcakMap;

  if (existing) {
    urutan = JSON.parse(existing.urutan_json || '{}');
    jawaban = JSON.parse(existing.jawaban_json || '{}');
    ragu = JSON.parse(existing.ragu_json || '[]');
    mulai = existing.mulai;
    opsiAcakMap = urutan.opsiAcak || {};
  } else {
    var order = soalIds.slice();
    if (String(ujian.acak_soal) === 'true' || ujian.acak_soal === true) {
      order = shuffleSeeded_(order, data.siswaId + data.ujianId);
    }
    opsiAcakMap = {};
    order.forEach(function (sid) {
      var soal = soalMap[sid];
      if (soal && (soal.tipe === 'pilihan_ganda' || soal.tipe === 'checkbox' || soal.tipe === 'benar_salah')) {
        var opsi = JSON.parse(soal.opsi_json || '[]');
        var idxArr = opsi.map(function (_, i) { return i; });
        if (String(ujian.acak_opsi) === 'true' || ujian.acak_opsi === true) {
          idxArr = shuffleSeeded_(idxArr, data.siswaId + data.ujianId + sid);
        }
        opsiAcakMap[sid] = idxArr;
      }
    });
    urutan = { order: order, opsiAcak: opsiAcakMap };
    jawaban = {};
    ragu = [];
    mulai = new Date().toISOString();
    sesiId = genId_('SES');
    // Ditulis ke CACHE dulu (instan, tidak perlu kunci Sheets) -- baris
    // sesungguhnya di Sheets baru dibuat oleh flushSesiBerkala() dalam <=1
    // menit. Ini yang membuat 500 siswa klik "Mulai Ujian" hampir bersamaan
    // tetap cepat & tidak saling menunggu.
    simpanSesiState_(sesiId, {
      id: sesiId, ujian_id: data.ujianId, siswa_id: data.siswaId, device_id: data.deviceId,
      mulai: mulai, selesai: '', status: 'berlangsung', pelanggaran: 0,
      urutan_json: JSON.stringify(urutan), jawaban_json: '{}', ragu_json: '[]',
      nilai: '', lulus: '', last_ping: mulai
    });
    cache.put(kunciMap, sesiId, CACHE_TTL_DETIK);
  }

  // Susun soal untuk dikirim ke klien TANPA kunci jawaban
  var soalUntukSiswa = urutan.order.map(function (sid) {
    var s = soalMap[sid];
    if (!s) return null;
    var opsi = null;
    if (s.tipe === 'pilihan_ganda' || s.tipe === 'checkbox' || s.tipe === 'benar_salah') {
      var opsiAsli = JSON.parse(s.opsi_json || '[]');
      var idxOrder = opsiAcakMap[sid] || opsiAsli.map(function (_, i) { return i; });
      opsi = idxOrder.map(function (i) { return opsiAsli[i]; });
    } else if (s.tipe === 'menjodohkan') {
      opsi = JSON.parse(s.opsi_json || '{}');
    }
    return { id: s.id, tipe: s.tipe, pertanyaan: s.pertanyaan, gambar: s.gambar, opsi: opsi, bobot: s.bobot };
  }).filter(Boolean);

  // sisa waktu dihitung dari waktu mulai sesi (bukan waktu buka halaman) -> anti reload untuk nambah waktu.
  // tambahanMs = waktu ekstra yang diberikan guru lewat tab "Pemantauan Ujian" (0 kalau belum pernah).
  var durasiMs = (Number(ujian.durasi_menit) || 0) * 60000;
  var tambahanMs = (Number(existing && existing.tambahan_detik) || 0) * 1000;
  var sisaMs = durasiMs + tambahanMs - (new Date() - new Date(mulai));

  return jsonOut_({
    ok: true,
    sesiId: sesiId,
    soal: soalUntukSiswa,
    jawabanTersimpan: jawaban,
    raguTersimpan: ragu,
    sisaDetik: Math.max(Math.floor(sisaMs / 1000), 0),
    maxPelanggaran: Number(ujian.max_pelanggaran) || 999,
    pelanggaranSaatIni: existing ? Number(existing.pelanggaran) || 0 : 0
  });
}

// shuffle deterministik berdasarkan seed string (Fisher-Yates + PRNG sederhana)
function shuffleSeeded_(arr, seedStr) {
  var seed = 0;
  for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  var a = arr.slice();
  function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (var j = a.length - 1; j > 0; j--) {
    var k = Math.floor(rand() * (j + 1));
    var tmp = a[j]; a[j] = a[k]; a[k] = tmp;
  }
  return a;
}

// Autosave berkala (throttled dari klien) — hanya update kolom jawaban_json & ragu_json
// Autosave berkala (throttled dari klien, tiap 20 detik). Dulu ini yang
// paling sering memicu error "server sedang sibuk" karena 500 siswa
// berebut satu kunci untuk tulis langsung ke Sheets. Sekarang HANYA menulis
// ke cache (lihat simpanSesiState_) -- tidak ada kunci, tidak ada Sheets,
// jadi hampir tidak mungkin gagal/lambat walau ratusan siswa autosave
// bersamaan. Ditulis ke Sheets belakangan oleh flushSesiBerkala().
function actionSimpanJawaban_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (state.status !== 'berlangsung') return jsonOut_({ ok: false, error: 'Sesi sudah tidak aktif.' });
  simpanSesiState_(data.sesiId, {
    jawaban_json: data.jawaban, ragu_json: data.ragu || '[]', last_ping: new Date().toISOString()
  });
  return jsonOut_({ ok: true });
}

// Klien melaporkan pelanggaran anti-cheat (pindah tab, keluar fullscreen, dst).
// Server menambah counter & memutuskan apakah harus force-submit.
function actionLapor_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (state.status !== 'berlangsung') return jsonOut_({ ok: true, blokir: false });

  var pelanggaranBaru = (Number(state.pelanggaran) || 0) + 1;
  state = simpanSesiState_(data.sesiId, { pelanggaran: pelanggaranBaru });

  // Log pelanggaran: frekuensinya jauh lebih rendah daripada autosave
  // (hanya saat benar-benar terdeteksi curang), jadi tulis langsung ke
  // Sheets di sini masih wajar -- tapi tetap dibuat best-effort (kalau lock
  // pendek ini kebetulan gagal didapat, pelanggaran tetap tercatat di
  // counter/cache di atas, cuma baris LOG detailnya yang mungkin terlewat).
  var lockLog = LockService.getScriptLock();
  if (lockLog.tryLock(8000)) {
    try {
      appendObj_(SHEET.LOG, headersOf_(SHEET.LOG), {
        id: genId_('LOG'), sesi_id: data.sesiId, siswa_id: state.siswa_id, ujian_id: state.ujian_id,
        waktu: new Date().toISOString(), jenis: data.jenis || 'tidak diketahui', detail: data.detail || ''
      });
    } finally {
      lockLog.releaseLock();
    }
  }

  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === state.ujian_id; })[0];
  var maxPelanggaran = ujian ? Number(ujian.max_pelanggaran) || 999 : 999;

  if (pelanggaranBaru >= maxPelanggaran) {
    // force submit otomatis
    var jawabanSaatIni = JSON.parse(data.jawaban || state.jawaban_json || '{}');
    var hasilForce = hitungNilai_(state, jawabanSaatIni);
    simpanSesiState_(data.sesiId, {
      status: 'diblokir', selesai: new Date().toISOString(),
      jawaban_json: JSON.stringify(jawabanSaatIni), nilai: hasilForce.nilai, lulus: hasilForce.lulus
    });
    return jsonOut_({ ok: true, blokir: true, pelanggaran: pelanggaranBaru, nilai: hasilForce.nilai, lulus: hasilForce.lulus });
  }
  return jsonOut_({ ok: true, blokir: false, pelanggaran: pelanggaranBaru });
}

function actionSubmitUjian_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (state.status === 'selesai') {
    return jsonOut_({ ok: true, nilai: state.nilai, lulus: state.lulus, sudahSelesai: true, buktiOrek: modeBuktiDariSesi_(state) });
  }
  var jawaban = JSON.parse(data.jawaban || '{}');
  var hasil = hitungNilai_(state, jawaban);
  simpanSesiState_(data.sesiId, {
    status: 'selesai', selesai: new Date().toISOString(),
    jawaban_json: JSON.stringify(jawaban), nilai: hasil.nilai, lulus: hasil.lulus
  });
  // Nilai SUDAH tersimpan di atas. Klien memakai buktiOrek utk memutuskan apakah perlu halaman
  // "Unggah bukti orak-orik" sebelum nilai akhir ditampilkan ke siswa.
  return jsonOut_({ ok: true, nilai: hasil.nilai, lulus: hasil.lulus, detail: hasil.detail, buktiOrek: modeBuktiDariSesi_(state) });
}

// Menghitung nilai (auto-grading, termasuk uraian dengan pencocokan kata
// kunci) dari STATE sesi (cache atau Sheets, lewat ambilSesiState_) TANPA
// menyentuh Sheets -- murni komputasi. Penandaan status
// selesai/diblokir + nilai dilakukan terpisah oleh pemanggil lewat
// simpanSesiState_, supaya baik submit normal maupun force-submit akibat
// pelanggaran memakai jalur cache yang sama (cepat, tidak berebut kunci
// walau banyak siswa submit di waktu yang berdekatan, mis. mendekati batas
// waktu ujian).
function hitungNilai_(sesiState, jawaban) {
  var urutan = JSON.parse(sesiState.urutan_json || '{}');
  var opsiAcakMap = urutan.opsiAcak || {};
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesiState.ujian_id; })[0];
  var bankSoal = readAll_(SHEET.BANK_SOAL);
  var soalMap = {}; bankSoal.forEach(function (s) { soalMap[s.id] = s; });

  var totalBobot = 0, totalDapat = 0, detail = [];
  (urutan.order || []).forEach(function (sid) {
    var soal = soalMap[sid];
    if (!soal) return;
    var bobot = Number(soal.bobot) || 0;
    totalBobot += bobot;
    var jwbSiswa = jawaban[sid];
    var skor = skorSoal_(soal, jwbSiswa, opsiAcakMap[sid]);
    totalDapat += skor;
    detail.push({ id: sid, tipe: soal.tipe, bobot: bobot, skor: skor });
  });

  var nilaiAkhir = totalBobot > 0 ? Math.round((totalDapat / totalBobot) * 10000) / 100 : 0;
  var nilaiLulus = ujian ? Number(ujian.nilai_lulus) || 0 : 0;
  var lulus = nilaiAkhir >= nilaiLulus;

  return { nilai: nilaiAkhir, lulus: lulus, detail: detail };
}

// Membandingkan pilihan siswa dengan kunci pada soal menjodohkan/kategori lewat TEKS sisi
// kanan (bukan hanya indeks), karena sisi kanan boleh memuat teks yang sama berulang
// (mis. "Benar","Salah","Benar","Salah" dari hasil impor).
function samaPilihanJodoh_(soal, jawab, kunciVal) {
  if (jawab === undefined || jawab === null || jawab === '') return false;
  if (kunciVal === undefined || kunciVal === null || kunciVal === '') return false;
  if (String(jawab) === String(kunciVal)) return true;
  var kanan = [];
  try { var o = JSON.parse(soal.opsi_json || '{}'); kanan = Array.isArray(o.kanan) ? o.kanan : []; } catch (e) { kanan = []; }
  var norm = function (v) { return String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  var a = kanan[Number(jawab)], b = kanan[Number(kunciVal)];
  if (a === undefined || b === undefined) return false;
  return norm(a) !== '' && norm(a) === norm(b);
}

function skorSoal_(soal, jwb, idxOrder) {
  var bobot = Number(soal.bobot) || 0;
  if (jwb === undefined || jwb === null || jwb === '') return 0;
  var kunci;
  kunci = parseKunciJson_(soal.kunci_json);
  if (kunci === null) return 0;

  // `idxOrder` (opsional): peta posisi-tampil -> indeks-opsi-asli, KHUSUS untuk
  // soal yang opsinya diacak per siswa (lihat opsiAcakMap di actionMulaiUjian_).
  // Siswa menjawab berdasarkan POSISI YANG TAMPIL di layarnya (sudah diacak),
  // sedangkan `kunci` selalu memakai INDEKS OPSI ASLI (urutan sebelum diacak,
  // sesuai saat guru membuat soal). Tanpa penerjemahan ini, soal dengan opsi
  // teracak akan dianggap salah setiap kali posisi jawaban yang benar bergeser
  // dari indeks aslinya -- walau kunci jawaban yang diisi guru sudah benar.
  function keIndeksAsli(posisiTampil) {
    var p = Number(posisiTampil);
    return (idxOrder && idxOrder[p] !== undefined) ? Number(idxOrder[p]) : p;
  }

  switch (soal.tipe) {
    case 'pilihan_ganda':
    case 'benar_salah':
      return keIndeksAsli(jwb) === Number(kunci) ? bobot : 0;

    case 'checkbox': {
      // DIKOTOMIS / ALL-OR-NOTHING (PGK MCMA TKA): benar penuh HANYA bila himpunan
      // pilihan siswa SAMA PERSIS dengan kunci. Selain itu skor 0.
      var benarSet = {};
      (Array.isArray(kunci) ? kunci : []).forEach(function (k) { benarSet[Number(k)] = true; });
      var benarList = Object.keys(benarSet);
      if (benarList.length === 0) return 0;
      var pilihSet = {};
      (Array.isArray(jwb) ? jwb : []).forEach(function (p) { pilihSet[keIndeksAsli(p)] = true; });
      var pilihList = Object.keys(pilihSet);
      var persis = pilihList.length === benarList.length && benarList.every(function (b) { return pilihSet[b]; });
      return persis ? bobot : 0;
    }

    case 'menjodohkan': {
      // DIKOTOMIS / ALL-OR-NOTHING (PGK Kategori TKA: Benar/Salah, Sesuai/Tidak Sesuai,
      // Tepat/Tidak Tepat per pernyataan): benar penuh HANYA bila SEMUA pernyataan sesuai kunci.
      var kunciKeys = Object.keys(kunci);
      if (kunciKeys.length === 0 || !jwb || typeof jwb !== 'object') return 0;
      var semuaCocok = kunciKeys.every(function (k) { return samaPilihanJodoh_(soal, jwb[k], kunci[k]); });
      return semuaCocok ? bobot : 0;
    }

    case 'uraian': {
      // kunci: { kataKunci: ["fotosintesis","klorofil", ...] }
      var kataKunci = (kunci.kataKunci || []).map(function (k) { return String(k).toLowerCase().trim(); }).filter(Boolean);
      if (kataKunci.length === 0) return 0; // tidak ada rubrik -> perlu koreksi manual guru di sheet
      var teks = String(jwb).toLowerCase();
      var ditemukan = kataKunci.filter(function (k) { return teks.indexOf(k) !== -1; }).length;
      return Math.round((ditemukan / kataKunci.length) * bobot * 100) / 100;
    }

    default:
      return 0;
  }
}

// Cache-first (lewat ambilSesiState_) supaya siswa yang BARU SAJA submit
// langsung melihat nilainya yang benar, walau flushSesiBerkala belum sempat
// menuliskannya ke Sheets (jeda maksimal ~1 menit, lihat catatan di atas
// ambilSesiState_).
// ----------------------------------------------------------------------------
// DETAIL JAWABAN SISWA (setelah ujian selesai)
// Mengembalikan, per soal: jawaban siswa, kunci jawaban, status benar/salah,
// dan pembahasan -- supaya siswa & guru bisa sama-sama memeriksa jika ada
// kunci yang keliru. Hanya untuk sesi milik siswa tsb yang sudah selesai, dan
// hanya jika guru tidak mematikan opsi "tampil_detail" di ujian tersebut.
// Posisi opsi dikembalikan dalam urutan TAMPIL milik siswa (sesudah diacak).
// ----------------------------------------------------------------------------
// Mencatat aktivitas mencurigakan/informatif yang TIDAK menambah hitungan pelanggaran
// (mis. percobaan salin/tempel yang sudah diblokir, atau siswa kembali ke halaman ujian
// beserta lama ia pergi). Best-effort: bila kunci tidak didapat, catatan dilewati.
function actionCatatAktivitas_(data) {
  var state = ambilSesiState_(data.sesiId);
  if (!state || state.status !== 'berlangsung') return jsonOut_({ ok: true });
  var lockLog = LockService.getScriptLock();
  if (lockLog.tryLock(5000)) {
    try {
      appendObj_(SHEET.LOG, headersOf_(SHEET.LOG), {
        id: genId_('LOG'), sesi_id: data.sesiId, siswa_id: state.siswa_id, ujian_id: state.ujian_id,
        waktu: new Date().toISOString(), jenis: String(data.jenis || 'tidak diketahui').slice(0, 40), detail: String(data.detail || '').slice(0, 120)
      });
    } finally { lockLog.releaseLock(); }
  }
  return jsonOut_({ ok: true });
}

// Daftar kejadian (pelanggaran & aktivitas) satu sesi, urut waktu, untuk layar guru.
function actionGetLogPelanggaran_(data) {
  var list = readAll_(SHEET.LOG).filter(function (l) { return String(l.sesi_id) === String(data.sesiId); });
  list.sort(function (a, b) { return new Date(a.waktu) - new Date(b.waktu); });
  return jsonOut_({ ok: true, data: list.map(function (l) { return { waktu: l.waktu, jenis: l.jenis, detail: l.detail || '' }; }) });
}

function actionGetDetailJawaban_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  if (data.siswaId && String(sesi.siswa_id) !== String(data.siswaId)) return jsonOut_({ ok: false, error: 'Sesi ini bukan milik Anda.' });
  if (sesi.status === 'berlangsung') return jsonOut_({ ok: false, error: 'Detail jawaban baru bisa dilihat setelah ujian selesai.' });
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesi.ujian_id; })[0];
  // Guru (kirim guruId yang terdaftar, tanpa siswaId) selalu boleh melihat detail jawaban siswa untuk evaluasi,
  // walau opsi "tampil_detail" dimatikan (opsi itu hanya membatasi SISWA).
  var dariGuru = !data.siswaId && !!data.guruId && readAll_(SHEET.GURU).some(function (g) { return String(g.id) === String(data.guruId); });
  if (!dariGuru && ujian && String(ujian.tampil_detail).toLowerCase() === 'false') return jsonOut_({ ok: false, error: 'Guru tidak mengaktifkan detail jawaban untuk ujian ini.' });

  // Pembahasan bisa dimatikan terpisah dari detail jawaban (mis. ulangan: detail & pembahasan mati; latihan: hidup).
  var tampilPembahasan = !(ujian && String(ujian.tampil_pembahasan).toLowerCase() === 'false');
  var urutan = {}; try { urutan = JSON.parse(sesi.urutan_json || '{}'); } catch (e) { urutan = {}; }
  var opsiAcakMap = urutan.opsiAcak || {};
  var jawaban = {}; try { jawaban = JSON.parse(sesi.jawaban_json || '{}'); } catch (e) { jawaban = {}; }
  var soalMap = {}; readAll_(SHEET.BANK_SOAL).forEach(function (s) { soalMap[s.id] = s; });

  var items = [];
  (urutan.order || []).forEach(function (sid) {
    var soal = soalMap[sid];
    if (!soal) return;
    var bobot = Number(soal.bobot) || 0;
    var idxOrder = opsiAcakMap[sid];
    var jwb = jawaban[sid];
    var skor = skorSoal_(soal, jwb, idxOrder);
    var kunci = null; kunci = parseKunciJson_(soal.kunci_json);
    var opsi = null, kunciTampil = null;
    if (soal.tipe === 'pilihan_ganda' || soal.tipe === 'checkbox' || soal.tipe === 'benar_salah') {
      var opsiAsli = JSON.parse(soal.opsi_json || '[]');
      var order = Array.isArray(idxOrder) ? idxOrder : opsiAsli.map(function (_, i) { return i; });
      opsi = order.map(function (i) { return opsiAsli[i]; });
      var daftarKunci = soal.tipe === 'checkbox' ? (Array.isArray(kunci) ? kunci : []) : ((kunci === null || kunci === undefined || kunci === '') ? [] : [kunci]);
      kunciTampil = daftarKunci.map(function (k) { return order.indexOf(Number(k)); }).filter(function (i) { return i >= 0; });
    } else if (soal.tipe === 'menjodohkan') {
      opsi = JSON.parse(soal.opsi_json || '{}');
      kunciTampil = (kunci && typeof kunci === 'object') ? kunci : {};
    } else {
      kunciTampil = { kataKunci: (kunci && Array.isArray(kunci.kataKunci)) ? kunci.kataKunci : [] };
    }
    var kosong = jwb === undefined || jwb === null || jwb === '' ||
      (Array.isArray(jwb) && jwb.length === 0) ||
      (soal.tipe === 'menjodohkan' && (typeof jwb !== 'object' || Object.keys(jwb).filter(function (k) { return jwb[k] !== '' && jwb[k] !== null && jwb[k] !== undefined; }).length === 0));
    var uraianTanpaRubrik = soal.tipe === 'uraian' && kunciTampil.kataKunci.filter(function (k) { return String(k).trim(); }).length === 0;
    var status;
    if (kosong) status = 'kosong';
    else if (uraianTanpaRubrik) status = 'manual';
    else if (bobot > 0 && skor >= bobot) status = 'benar';
    else if (skor > 0) status = 'sebagian';
    else status = 'salah';
    items.push({
      id: sid, tipe: soal.tipe, pertanyaan: soal.pertanyaan, gambar: soal.gambar || '',
      opsi: opsi, jawaban: kosong ? null : jwb, kunciTampil: kunciTampil,
      bobot: bobot, skor: skor, status: status, pembahasan: (tampilPembahasan || !data.siswaId) ? (soal.pembahasan || '') : ''
    });
  });
  return jsonOut_({ ok: true, judulUjian: ujian ? ujian.judul : '-', nilai: sesi.nilai, lulus: sesi.lulus, items: items, tampilPembahasan: tampilPembahasan });
}

function actionGetHasil_(data) {
  var sesi = ambilSesiState_(data.sesiId);
  if (!sesi) return jsonOut_({ ok: false, error: 'Sesi tidak ditemukan.' });
  var ujian = readAll_(SHEET.UJIAN).filter(function (u) { return u.id === sesi.ujian_id; })[0];
  return jsonOut_({
    ok: true,
    selesai: sesi.status !== 'berlangsung',
    nilai: sesi.nilai, lulus: sesi.lulus, pelanggaran: sesi.pelanggaran,
    judulUjian: ujian ? ujian.judul : '-',
    pesanNilai: ujian && ujian.pesan_nilai ? ujian.pesan_nilai : '',
    tampilDetail: !(ujian && String(ujian.tampil_detail).toLowerCase() === 'false'),
    instruksiRemedial: (sesi.lulus === false || sesi.lulus === 'FALSE') ? (ujian && ujian.instruksi_remedial ? ujian.instruksi_remedial : '') : ''
  });
}
