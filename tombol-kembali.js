/* ============================================================================
   TOMBOL KEMBALI HP / BROWSER — Portal Siswa (v43z52)
   Aturan (hanya untuk akun siswa di luar halaman ujian & survei):
     1) Tekan Kembali SEKALI  -> pindah ke halaman sebelumnya di dalam aplikasi (bukan keluar aplikasi).
     2) Bila sudah tidak ada halaman sebelumnya (sudah di Beranda) dan Kembali ditekan lagi
        -> muncul pop up "Yakin Anda akan keluar?" (Ya, Keluar / Tetap di Aplikasi).
        "Ya, Keluar" = keluar dari akun (Auth.logout). Tekan Kembali sekali lagi di layar login
        = keluar dari aplikasi seperti biasa.
   TIDAK BERLAKU di halaman soal ujian, halaman survei, dan langkah unggah bukti: di sana perilaku lama
   (kunci-ujian.js / BuktiUI) tetap berjalan, modul ini diam.

   Cara kerja: riwayat browser hanya diberi 2 entri — entri DASAR (kbDasar) dan entri PENJAGA (kbJaga) di
   atasnya. Aplikasi selalu berdiri di PENJAGA. Tombol Kembali menghapus penjaga -> kejadian "popstate" kita
   tangkap, kita lakukan satu tindakan, lalu penjaga dipasang lagi. Jadi berapa kali pun Kembali ditekan,
   siswa tidak pernah keluar tanpa konfirmasi, dan riwayat browser tidak menumpuk.
   Batas: pop up konfirmasi dapat diatur lewat TombolKembali.KONFIRMASI_KELUAR (true/false).
   ============================================================================ */
'use strict';
const TombolKembali = (function () {
  const T_DASAR = 'kbDasar', T_JAGA = 'kbJaga';
  const $ = (id) => document.getElementById(id);
  let keluar = false;        // sedang membereskan riwayat setelah logout
  let timerKeluar = 0;

  const adaSiswa = () => typeof state !== 'undefined' && !!state.user && state.user.role === 'siswa';
  const tampak = (id) => { const e = $(id); return !!e && !e.classList.contains('hidden'); };
  // Halaman ujian, survei, dan unggah bukti: aturan Kembali di sini TIDAK berlaku.
  function wilayahUjian() {
    return tampak('ujian-screen') || tampak('survei-screen') || tampak('bukti-screen') ||
      !!(window.KunciUjian && window.KunciUjian.aktif) ||
      !!(typeof AntiCheat !== 'undefined' && AntiCheat.modeSurvei);
  }
  const stateSkrg = () => { try { return history.state || null; } catch (e) { return null; } };
  const dorong = (tanda) => { try { history.pushState({ [tanda]: 1 }, '', location.href); } catch (e) { /* abaikan */ } };

  // Pastikan riwayat = [DASAR][PENJAGA] dan kita berdiri di PENJAGA. Aman dipanggil berulang.
  function pasang() {
    if (!adaSiswa() || keluar || wilayahUjian()) return;
    const s = stateSkrg();
    if (s && s[T_JAGA]) return;
    if (s && s[T_DASAR]) { dorong(T_JAGA); return; }
    try { history.replaceState({ [T_DASAR]: 1 }, '', location.href); } catch (e) { /* abaikan */ }
    dorong(T_JAGA);
  }

  // ---- satu tekanan Kembali = satu tindakan ----
  function tutupSesuatuYangTerbuka() {
    // 1) dialog (Dialog.konfirmasi / info): Kembali = Batal / Mengerti
    const d = typeof Dialog !== 'undefined' ? Dialog._aktif : null;
    if (d && d.isConnected) { const b = d.querySelector('.dlg-batal') || d.querySelector('.dlg-ya'); if (b) b.click(); return true; }
    // 2) menu pengguna (ikon kanan atas)
    const menu = [...document.querySelectorAll('.anbk-usermenu')].find(m => !m.classList.contains('hidden'));
    if (menu) { menu.classList.add('hidden'); return true; }
    // 3) jendela foto profil
    const fp = $('fp-tutup'); if (fp && fp.isConnected && fp.offsetParent !== null) { fp.click(); return true; }
    return false;
  }

  function kembaliSatuHalaman() {
    if (typeof PortalSiswa === 'undefined') return true;
    if (tampak('sw-screen')) return PortalSiswa.kembali();                                   // true = pindah ke halaman sebelumnya; false = sudah di Beranda
    if (tampak('siswa-portal')) { PortalSiswa.bukaTerakhir(); return true; }                 // layar token -> halaman portal terakhir
    if (tampak('tes-konfirmasi-screen')) { Anbk.kembaliKeKonfirmasiData(); return true; }    // konfirmasi tes -> layar token
    if (tampak('detail-screen')) { ExamEngine.tutupDetailJawaban(); return true; }           // detail jawaban -> hasil / riwayat
    if (tampak('hasil-screen')) { UI.kembaliKeBerandaSiswa(); return true; }                 // hasil -> Beranda
    return true;                                                                              // layar lain: tidak ada tindakan
  }

  let popupTampil = false;
  async function tanyaKeluar() {
    if (popupTampil || typeof Dialog === 'undefined') return;
    if (TombolKembali.KONFIRMASI_KELUAR === false) { Auth.logout(); return; }
    popupTampil = true;
    let ya = false;
    try {
      ya = await Dialog.konfirmasi({
        judul: 'Yakin Anda akan keluar?', tipe: 'warning', ikon: 'fa-right-from-bracket',
        pesan: 'Anda akan **keluar dari akun** dan kembali ke halaman login.\nJawaban dan nilai yang sudah tersimpan tidak hilang.',
        teksYa: 'Ya, Keluar', teksBatal: 'Tetap di Aplikasi'
      });
    } finally { popupTampil = false; }
    if (ya) Auth.logout();
  }

  function tindak() {
    if (tutupSesuatuYangTerbuka()) return;
    if (kembaliSatuHalaman()) return;
    tanyaKeluar();   // sudah di halaman paling awal (Beranda): tanyakan dulu sebelum keluar
  }

  function onPop(e) {
    if (keluar) return bereskan(e);
    if (!adaSiswa() || wilayahUjian()) return;   // bukan wilayah modul ini: perilaku lama tetap berlaku
    const s = e.state || stateSkrg();
    if (!(s && s[T_JAGA])) dorong(T_JAGA);       // penjaga dipasang lagi supaya tekanan berikutnya juga tertangkap
    tindak();
  }

  // ---- keluar akun: bersihkan riwayat sampai entri DASAR, lalu muat ulang ke layar login ----
  function bereskan(e) {
    const s = (e && e.state) || stateSkrg();
    if (s && s[T_DASAR]) { clearTimeout(timerKeluar); location.reload(); return; }
    try { history.back(); } catch (x) { location.reload(); }
  }
  function selesaiLogout() {
    const s = stateSkrg();
    if (!s || s[T_DASAR]) { location.reload(); return; }
    keluar = true;
    timerKeluar = setTimeout(() => location.reload(), 1500);   // cadangan bila riwayat tidak mau mundur
    try { history.back(); } catch (x) { location.reload(); }
  }

  // ---- pemasangan ----
  window.addEventListener('popstate', onPop);
  // Setiap kali layar siswa (non-ujian) tampil, penjaga dipastikan ada. Jalan lewat klik siswa, jadi
  // browser menerima entri riwayat tersebut (Chrome mengabaikan entri yang dibuat tanpa interaksi).
  const _tampilkan = UI.tampilkan;
  UI.tampilkan = function (id) {
    const r = _tampilkan.apply(UI, arguments);
    if (['sw-screen', 'siswa-portal', 'tes-konfirmasi-screen', 'hasil-screen', 'detail-screen'].indexOf(id) >= 0) pasang();
    return r;
  };
  // Sesi dipulihkan setelah muat ulang (belum ada klik): pasang lagi pada interaksi pertama.
  const pertama = () => { pasang(); };
  document.addEventListener('pointerdown', pertama, { once: true, capture: true });
  document.addEventListener('keydown', pertama, { once: true, capture: true });

  return { pasang, selesaiLogout, KONFIRMASI_KELUAR: true };
})();
