/* ============================================================================
   TOMBOL KEMBALI HP / BROWSER — Portal Siswa (v43z55)
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

   v43z58 — Kembali ditekan cepat / saat pop up "Yakin Anda akan keluar?" masih tampil:
     Chrome HP menganggap entri riwayat yang dibuat TANPA sentuhan pengguna (mis. penjaga yang dipasang ulang
     di dalam peristiwa popstate) sebagai entri yang boleh DILEWATI, sehingga tekanan Kembali berikutnya
     langsung keluar aplikasi. Perbaikan: penjaga ditumpuk sampai MAKS_JAGA lapis, tiap lapis dipasang saat
     siswa MENGETUK layar (jadi sah, tidak dilewati). Beberapa tekanan Kembali beruntun tetap tertahan.
     Selain itu, Kembali saat pop up keluar masih tampil = menutup pop up dan kembali ke Beranda.
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
  const MAKS_JAGA = 4;   // jumlah lapis penjaga yang disiapkan (penyangga untuk tekanan Kembali beruntun)
  const dorong = (tanda, n) => { try { history.pushState({ [tanda]: n || 1 }, '', location.href); } catch (e) { /* abaikan */ } };
  const kedalaman = () => { const s = stateSkrg(); return (s && Number(s[T_JAGA])) || 0; };
  // Tambah satu lapis penjaga (hanya dipanggil dari ketukan/sentuhan siswa agar tidak dilewati Chrome).
  function tambahJaga() {
    if (!adaSiswa() || keluar || wilayahUjian() || !sudahDisentuh()) return;
    const s = stateSkrg(); if (!s) return;
    if (s[T_DASAR]) { dorong(T_JAGA, 1); return; }
    if (s[T_JAGA] && kedalaman() < MAKS_JAGA) dorong(T_JAGA, kedalaman() + 1);
  }

  // Chrome (HP) MELEWATI entri riwayat yang dibuat oleh halaman yang belum pernah disentuh pengguna. Jadi
  // penjaga baru dipasang setelah ada sentuhan/ketukan pertama (sesi yang dipulihkan setelah aplikasi dibuka
  // ulang belum punya sentuhan, dan tanpa penantian ini tombol Kembali pertama langsung keluar aplikasi).
  const sudahDisentuh = () => { try { return !navigator.userActivation || navigator.userActivation.hasBeenActive; } catch (e) { return true; } };
  let menunggu = false;
  const PEMICU = ['click', 'touchend', 'keyup'];
  // Di HP, selama belum ada sentuhan, tampilkan penutup "Ketuk layar untuk melanjutkan" supaya siswa pasti
  // mengetuk dulu (penjaga riwayat jadi terpasang) sebelum sempat menekan Kembali. Hanya layar sentuh.
  const layarSentuh = () => { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } };
  function tampilkanKetukLayar() {
    if (!layarSentuh() || $('kb-ketuk')) return;
    const o = document.createElement('div');
    o.id = 'kb-ketuk';
    o.setAttribute('role', 'button');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(15,23,42,.55);color:#fff;font:600 16px/1.4 system-ui,sans-serif;text-align:center;padding:24px;';
    o.innerHTML = '<div style="background:rgba(15,23,42,.85);border-radius:14px;padding:18px 22px;max-width:300px;">' +
      'Ketuk layar untuk melanjutkan</div>';
    document.body.appendChild(o);
  }
  function hilangkanKetukLayar() { const o = $('kb-ketuk'); if (o && o.parentNode) o.parentNode.removeChild(o); }
  function tungguSentuhan() {
    if (menunggu) return; menunggu = true;
    tampilkanKetukLayar();
    const cek = () => {
      if (!sudahDisentuh()) return;
      menunggu = false; PEMICU.forEach(t => document.removeEventListener(t, cek, true));
      hilangkanKetukLayar();
      pasang();
    };
    PEMICU.forEach(t => document.addEventListener(t, cek, true));
  }

  // Pastikan riwayat = [DASAR][PENJAGA] dan kita berdiri di PENJAGA. Aman dipanggil berulang.
  function pasang() {
    if (!adaSiswa() || keluar || wilayahUjian()) { hilangkanKetukLayar(); return; }
    const s = stateSkrg();
    if (s && s[T_JAGA]) { tambahJaga(); return; }
    if (!sudahDisentuh()) { tungguSentuhan(); return; }
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
    // layar lain yang tidak dikenal: arahkan ke Beranda (bukan diam), supaya tombol tidak terasa rusak
    try { PortalSiswa.kembaliBeranda(); } catch (e) { /* abaikan */ }
    return true;
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
    const popupKeluarTerbuka = popupTampil;
    if (tutupSesuatuYangTerbuka()) {
      // Kembali saat pop up "Yakin keluar?" masih tampil: tutup pop up, tetap di aplikasi, arahkan ke Beranda.
      if (popupKeluarTerbuka) { try { if (typeof PortalSiswa !== 'undefined') PortalSiswa.kembaliBeranda(); } catch (e) { /* abaikan */ } }
      return;
    }
    if (kembaliSatuHalaman()) return;
    tanyaKeluar();   // sudah di halaman paling awal (Beranda): tanyakan dulu sebelum keluar
  }

  function onPop(e) {
    if (keluar) return bereskan(e);
    if (!adaSiswa() || wilayahUjian()) return;   // bukan wilayah modul ini: perilaku lama tetap berlaku
    const s = e.state || stateSkrg();
    if (!(s && s[T_JAGA])) dorong(T_JAGA, 1);    // cadangan: penjaga dipasang lagi (bisa dilewati Chrome bila tanpa sentuhan; penyangga ketukan di bawah yang diandalkan)
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
  // Setiap ketukan siswa mengisi ulang penyangga penjaga (sampai MAKS_JAGA lapis).
  ['touchend', 'click'].forEach(t => document.addEventListener(t, () => { try { tambahJaga(); } catch (e) { /* abaikan */ } }, true));
  // Setiap kali layar siswa (non-ujian) tampil, penjaga dipastikan ada. Jalan lewat klik siswa, jadi
  // browser menerima entri riwayat tersebut (Chrome mengabaikan entri yang dibuat tanpa interaksi).
  const _tampilkan = UI.tampilkan;
  UI.tampilkan = function (id) {
    const r = _tampilkan.apply(UI, arguments);
    if (['sw-screen', 'siswa-portal', 'tes-konfirmasi-screen', 'hasil-screen', 'detail-screen'].indexOf(id) >= 0) pasang();
    return r;
  };
  // Halaman dimuat TEPAT di entri DASAR dengan sesi siswa masih ada = siswa menekan Kembali dari penjaga
  // setelah aplikasi dipulihkan browser (entri lama dimuat ulang, bukan peristiwa popstate biasa).
  // Tanyakan "Yakin keluar?" alih-alih membiarkan aplikasi seolah memuat ulang / keluar.
  const mendarat = (() => { try { const s = history.state; return !!(s && s[T_DASAR] && sessionStorage.getItem('cbt_user')); } catch (e) { return false; } })();
  if (mendarat) setTimeout(() => { if (adaSiswa() && !wilayahUjian() && !keluar && !(stateSkrg() || {})[T_JAGA]) tanyaKeluar(); }, 800);

  return { pasang, selesaiLogout, KONFIRMASI_KELUAR: true };
})();
