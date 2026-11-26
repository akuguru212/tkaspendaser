/* ============================================================================
   KUNCI UJIAN (HP & laptop) — dipasang di atas AntiCheat yang sudah ada di app.js
   1) Layar HP tetap menyala selama di halaman soal (Screen Wake Lock API)
   2) Wajib layar penuh: bila belum / keluar layar penuh, soal ditutup + tombol "Masuk Layar Penuh"
   3) Alarm sirine + getar saat siswa mencoba keluar (pindah aplikasi, layar mati, keluar layar penuh,
      tombol Kembali). Alarm berhenti hanya setelah siswa menekan "Kembali ke Ujian".
   4) Pembatas screenshot (SEBAGIAN — lihat catatan): isi soal disembunyikan saat halaman kehilangan fokus,
      tombol PrintScreen / Win+Shift+S / Cmd+Shift+3-4-5 terdeteksi & dicatat, tidak bisa cetak/simpan/seleksi.
   5) Screenshot TERDETEKSI (tombol PrintScreen (keyup di Windows) / Win+Shift+S / Ctrl+Shift+S / Cmd+Shift+3-4-5) = PELANGGARAN yang dihitung
      + alarm. Kehilangan fokus layar (aplikasi melayang, panel notifikasi, jendela lain) juga dihitung pelanggaran + alarm
      (dicek lewat event blur DAN pemeriksaan fokus berkala). Bisa dimatikan lewat config.js: CBT_FOKUS_PELANGGARAN = false.
      MASA TOLERANSI: notifikasi / pesan WA / telepon / alarm yang mengganggu SESAAT (selesai sendiri dalam <= 8 detik) TIDAK dihitung
      dan TIDAK berbunyi; hanya dicatat "gangguan singkat". Lebih lama dari itu baru pelanggaran + alarm. Atur: CBT_TOLERANSI_GANGGUAN_DETIK.
   6) WATERMARK IDENTITAS: nama + kelas + jam + kode sesi siswa diulang tipis di SELURUH layar ujian, sehingga setiap
      tangkapan layar / foto layar bisa dilacak ke pemiliknya (penangkal utama untuk screenshot yang tak terdeteksi).
      Matikan: CBT_WATERMARK_IDENTITAS = false; atur kepekatan: CBT_WM_OPACITY (0.03 - 0.4, bawaan 0.06).
   JEDA SCREENSHOT (v43z43): satu kali PrtSc = satu pelanggaran. Fokus hilang / keluar layar penuh / blur akibat alat tangkap layar
   Windows setelah itu tidak dihitung lagi (atur lewat config.js: CBT_SS_JEDA_DETIK, bawaan 15 detik).
   CATATAN JUJUR: browser/PWA TIDAK PUNYA event "screenshot", jadi screenshot lewat tombol fisik (Power+Volume) atau aplikasi
   melayang yang tidak mengambil fokus TIDAK bisa dideteksi/diblokir oleh halaman web. Itu hanya bisa dicegah lewat aplikasi
   Android native (FLAG_SECURE -> hasil screenshot hitam) atau Safe Exam Browser. Watermark di atas adalah penangkalnya.
   ============================================================================ */
(function () {
  'use strict';
  if (typeof AntiCheat === 'undefined') return;

  const K = {
    aktif: false, wake: null, alarmEl: null, alarmOn: false, pernahFs: false, getarTimer: null,
    blurTimer: null, fsRetry: null, audioSiap: false, url: null, missFokus: 0, pernahFokus: false, fokusTimer: null, visTimer: null, hiddenT0: 0, blurT0: 0,

    // ---------- util ----------
    fsDidukung() { const e = document.documentElement; return !!(e.requestFullscreen || e.webkitRequestFullscreen); },
    adaFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    masukFs() {
      const e = document.documentElement; const r = e.requestFullscreen || e.webkitRequestFullscreen;
      if (!r) return Promise.resolve(false);
      try { return Promise.resolve(r.call(e)).then(() => true).catch(() => false); } catch (x) { return Promise.resolve(false); }
    },
    catat(j, d) { try { AntiCheat.catat(j, d || ''); } catch (e) { /* abaikan */ } },
    pesanAktif() { return !!(typeof state !== 'undefined' && state.sesiId && (!state.submitting || AntiCheat.modeSurvei)); },
    kata() { return AntiCheat.modeSurvei ? 'survei' : 'ujian'; },
    // Pelanggaran yang DIHITUNG (sama seperti keluar layar penuh). Satu kejadian = satu hitungan (dijaga AntiCheat._insiden).
    laporHitung(jenis, pesan) {
      if (jenis !== 'screenshot' && K.dalamJeda()) { K.catat('tombol_terlarang', 'Sisa kejadian screenshot (' + jenis + ') tidak dihitung lagi.'); return false; }
      try {
        if (AntiCheat && typeof AntiCheat.laporPelanggaran === 'function' && !AntiCheat._insiden) { AntiCheat.laporPelanggaran(jenis, pesan); return true; }
      } catch (e) { /* abaikan */ }
      K.catat(jenis, pesan); return false;
    },
    hitungFokus() { return window.CBT_FOKUS_PELANGGARAN !== false; },
    tol() { try { return AntiCheat.toleransiMs(); } catch (e) { return 8000; } },

    // ---------- 1) layar tetap menyala ----------
    async minta() {
      try {
        if (!('wakeLock' in navigator) || document.hidden || !K.aktif) return;
        if (K.wake) return;
        K.wake = await navigator.wakeLock.request('screen');
        K.wake.addEventListener('release', () => { K.wake = null; });
      } catch (e) { K.wake = null; }
    },
    lepasWake() { try { if (K.wake) K.wake.release(); } catch (e) { /* abaikan */ } K.wake = null; },

    // ---------- 3) alarm ----------
    // Sirine dibuat sendiri (WAV, tanpa berkas luar) dan diputar lewat <audio> agar lebih bertahan di latar belakang.
    buatWav() {
      const sr = 16000, dur = 2, n = sr * dur, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      w(36, 'data'); v.setUint32(40, n * 2, true);
      let fase = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, f = 700 + 500 * Math.sin(2 * Math.PI * 1.5 * t); // sirine naik-turun
        fase += 2 * Math.PI * f / sr;
        const s = Math.sign(Math.sin(fase)) * 0.55 + Math.sin(fase) * 0.35; // gelombang keras agar nyaring
        v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32000, true);
      }
      return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    },
    siapAudio() {
      if (K.alarmEl) return;
      try {
        K.url = K.buatWav(); const a = new Audio(K.url); a.loop = true; a.preload = 'auto'; a.volume = 1; K.alarmEl = a;
      } catch (e) { /* abaikan */ }
    },
    // Dibuka kuncinya oleh ketukan pengguna (browser mewajibkan) — dipanggil dari ketukan pertama di halaman ujian.
    bukaKunciAudio() {
      if (K.audioSiap || !K.alarmEl) return;
      const a = K.alarmEl; a.muted = true;
      const p = a.play(); if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; K.audioSiap = true; }).catch(() => { a.muted = false; });
    },
    alarmNyala(alasan, dariSS) {
      if (!K.aktif || !K.pesanAktif()) return;
      if (!dariSS && K.dalamJeda()) return; // sisa kejadian screenshot yang sama: jangan bunyikan alarm lagi
      K.tampilPenutup(alasan, true);
      if (K.alarmOn) return;
      K.alarmOn = true;
      try { if (K.alarmEl) { K.alarmEl.muted = false; K.alarmEl.currentTime = 0; const p = K.alarmEl.play(); if (p && p.catch) p.catch(() => {}); } } catch (e) { /* abaikan */ }
      const getar = () => { try { navigator.vibrate && navigator.vibrate([600, 250, 600, 250, 600]); } catch (e) { /* abaikan */ } };
      getar(); clearInterval(K.getarTimer); K.getarTimer = setInterval(getar, 2500);
      K.catat('alarm_keluar', alasan);
    },
    alarmMati() {
      K.alarmOn = false; clearInterval(K.getarTimer);
      try { if (K.alarmEl) { K.alarmEl.pause(); K.alarmEl.currentTime = 0; } } catch (e) { /* abaikan */ }
      try { navigator.vibrate && navigator.vibrate(0); } catch (e) { /* abaikan */ }
    },

    // ---------- 2) penutup wajib layar penuh / peringatan ----------
    penutup() {
      let ov = document.getElementById('kunci-overlay');
      if (ov) return ov;
      ov = document.createElement('div'); ov.id = 'kunci-overlay'; ov.className = 'hidden';
      ov.innerHTML = '<div class="kunci-kartu" role="alertdialog" aria-modal="true"><div class="kunci-ikon"><i class="fa-solid fa-triangle-exclamation"></i></div>' +
        '<h3 id="kunci-judul">Wajib Layar Penuh</h3><p id="kunci-pesan"></p>' +
        '<button type="button" id="kunci-tombol"><i class="fa-solid fa-expand"></i> <span>Kembali ke Ujian</span></button></div>';
      document.body.appendChild(ov);
      ov.querySelector('#kunci-tombol').addEventListener('click', K.kembali);
      return ov;
    },
    tampilPenutup(pesan, alarm) {
      const ov = K.penutup();
      ov.querySelector('#kunci-judul').textContent = alarm ? 'PERINGATAN! Jangan Keluar dari ' + (K.kata() === 'survei' ? 'Survei' : 'Ujian') : 'Wajib Layar Penuh';
      const tb = ov.querySelector('#kunci-tombol span'); if (tb) tb.textContent = K.kata() === 'survei' ? 'Kembali ke Survei' : 'Kembali ke Ujian';
      ov.querySelector('#kunci-pesan').textContent = pesan;
      ov.classList.toggle('alarm', !!alarm);
      ov.classList.remove('hidden'); document.body.classList.add('kunci-tutup');
    },
    sembunyiPenutup() { const ov = document.getElementById('kunci-overlay'); if (ov) ov.classList.add('hidden'); document.body.classList.remove('kunci-tutup'); },
    async kembali() {
      K.akhiriInsidenSS();
      K.bukaKunciAudio();
      if (K.fsDidukung() && !K.adaFs()) { const ok = await K.masukFs(); if (!ok && K.fsDidukung()) { /* gagal: tetap tampilkan penutup */ } }
      K.alarmMati();
      if (!document.hidden) K.sembunyiIsi(false);   // isi soal dibuka lagi setelah siswa menekan Kembali
      if (!K.fsDidukung() || K.adaFs()) K.sembunyiPenutup();
      K.minta(); K.pulihFsBerkala();
      const w = document.getElementById('anticheat-warning');
      if (w && !w.classList.contains('hidden') && typeof Siswa !== 'undefined' && Siswa.kembaliKeUjian) Siswa.kembaliKeUjian();
    },
    // Setelah "Kembali": coba masuk layar penuh lagi beberapa kali (~5 dtk). Alat tangkap layar Windows kadang melepas layar penuh
    // SESUDAH tombol ditekan; selama izin klik masih berlaku, percobaan ulang ini memulihkannya tanpa siswa harus mengetuk soal lagi.
    pulihFsBerkala() {
      if (!K.fsDidukung()) return;
      clearInterval(K.fsRetry); let n = 0;
      K.fsRetry = setInterval(() => {
        if (!K.aktif || K.alarmOn || ++n > 10) { clearInterval(K.fsRetry); return; }
        if (K.adaFs()) return;
        K.masukFs().then(ok => { if (ok) K.periksaFs(); });
      }, 500);
    },
    periksaFs() {
      if (!K.aktif || !K.pesanAktif() || !K.fsDidukung()) return;
      if (K.adaFs()) { K.pernahFs = true; if (!K.alarmOn) K.sembunyiPenutup(); return; }
      if (K.pernahFs) {
        if (K.dalamJeda() && !K.alarmOn) { // layar penuh terlepas oleh sisa alat tangkap layar: TANPA alarm & hitungan, tetapi dipulihkan (bukan dibiarkan diam)
          K.tampilPenutup('Layar penuh terlepas setelah tangkap layar. Ketuk tombol di bawah untuk melanjutkan ' + K.kata() + '.', false);
          K.pulihFsBerkala(); return;
        }
        K.alarmNyala('Anda keluar dari layar penuh. Tekan tombol di bawah untuk kembali ke ' + K.kata() + '.');
      }
      else K.tampilPenutup('Ketuk tombol di bawah untuk memulai ' + K.kata() + ' dalam layar penuh. Layar diberi watermark nama Anda, dan screenshot dicatat sebagai pelanggaran.', false);
    },

    // ---------- event ----------
    // Notifikasi / WA / telepon / alarm sesaat: isi soal disembunyikan LANGSUNG (privasi), tetapi alarm & hitungan baru berlaku
    // bila gangguan lebih lama dari masa toleransi (CBT_TOLERANSI_GANGGUAN_DETIK, bawaan 8 detik).
    onVis() {
      if (!K.aktif) return;
      const tol = K.tol();
      if (document.hidden) {
        K.curigaiSSDariBlur();
        K.sembunyiIsi(true); K.hiddenT0 = Date.now(); clearTimeout(K.visTimer);
        const nyala = () => { if (K.aktif && document.hidden && !K.dalamJeda()) K.alarmNyala('Anda meninggalkan halaman ujian atau layar mati.'); };
        if (tol <= 0) nyala(); else K.visTimer = setTimeout(nyala, tol);
      } else {
        clearTimeout(K.visTimer);
        const ms = K.hiddenT0 ? Date.now() - K.hiddenT0 : 0; K.hiddenT0 = 0;
        if (ms > tol && !K.alarmOn && !K.dalamJeda()) K.alarmNyala('Anda meninggalkan halaman ujian atau layar mati.'); // pewaktu tertahan saat layar mati
        else K.sembunyiIsi(false);
        K.lepasWake(); K.minta(); K.periksaFs();
      }
    },
    // Komputer/laptop (bukan HP/tablet): dipakai untuk deteksi fokus hilang karena keyboard.
    desktop() {
      try { return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') && !!(window.matchMedia && window.matchMedia('(hover: hover)').matches); } catch (e) { return false; }
    },
    onPtr() { K.ptrT = Date.now(); },
    // Windows 10/11: tombol PrintScreen / Win+Shift+S membuka alat tangkap layar yang MENELAN tombolnya, sehingga halaman tidak
    // menerima keydown/keyup sama sekali -- yang terlihat hanya jendela kehilangan fokus. Di komputer, fokus hilang tanpa ada
    // gerakan mouse/sentuh sesaat sebelumnya = dipicu keyboard (tangkap layar / Alt+Tab / tombol Windows) -> dihitung & alarm.
    curigaiSSDariKeyboard() {
      if (!K.aktif || !K.pesanAktif() || document.hidden || !K.desktop()) return;
      if (Date.now() - (K.ptrT || 0) < 1200) return; // ada gerakan mouse sesaat sebelumnya: bukan karena keyboard
      K.laporSS('Fokus jendela hilang lewat keyboard (kemungkinan tombol Print Screen / Win+Shift+S)');
    },
    onBlur(e) {
      if (!K.aktif) return;
      K.curigaiSSDariBlur();
      if (e && e.type === 'blur') K.curigaiSSDariKeyboard();
      K.sembunyiIsi(true);
      clearTimeout(K.blurTimer); K.blurT0 = Date.now();
      K.blurTimer = setTimeout(() => {
        if (!K.aktif || document.hasFocus() || K.dalamJeda()) return;
        if (K.hitungFokus()) K.laporHitung('keluar_aplikasi', 'Fokus layar ujian hilang lebih dari ' + Math.round(K.tol() / 1000) + ' detik (aplikasi/jendela lain di atas ujian).');
        K.alarmNyala('Anda keluar dari aplikasi ujian.');
      }, Math.max(400, K.tol()));
    },
    onFokus() {
      clearTimeout(K.blurTimer); K.pernahFokus = true; K.missFokus = 0;
      const ms = K.blurT0 ? Date.now() - K.blurT0 : 0; K.blurT0 = 0;
      if (ms > 600 && !K.alarmOn && K.aktif && K.pesanAktif()) K.catat('gangguan_singkat', 'Fokus layar terganggu ± ' + Math.max(1, Math.round(ms / 1000)) + ' detik (mis. notifikasi/pesan). Tidak dihitung pelanggaran.');
      if (K.aktif && !document.hidden) K.sembunyiIsi(false);
    },
    // Cadangan untuk event blur yang tidak terpicu (sebagian aplikasi melayang / panel sistem mengambil fokus diam-diam).
    // Syarat: halaman PERNAH berfokus, lalu kehilangan fokus >= ~2 detik berturut-turut (agar tidak sensitif).
    periksaFokus() {
      if (!K.aktif || !K.pesanAktif() || document.hidden) { K.missFokus = 0; return; }
      if (document.hasFocus()) { K.pernahFokus = true; if (K.missFokus >= 2 && !K.alarmOn) K.sembunyiIsi(false); K.missFokus = 0; return; }
      if (!K.pernahFokus) return;
      if (K.dalamJeda()) { K.missFokus = 0; return; } // fokus hilang karena alat tangkap layar yang sama: bukan pelanggaran baru
      K.missFokus++;
      if (K.missFokus === 2) K.sembunyiIsi(true);
      if (K.missFokus >= Math.max(4, Math.ceil(K.tol() / 500) + 1) && !K.alarmOn) {
        if (K.hitungFokus()) K.laporHitung('keluar_aplikasi', 'Fokus layar ujian hilang lebih dari ' + Math.round(K.tol() / 1000) + ' detik (kemungkinan aplikasi melayang / tangkapan layar / panel sistem).');
        K.alarmNyala('Fokus layar ujian hilang. Kembali ke ujian dan jangan membuka aplikasi lain.');
      }
    },
    sembunyiIsi(b) { document.body.classList.toggle('kunci-blur', !!b); },
    onFsChange() { setTimeout(K.periksaFs, 150); },
    onTap() { if (!K.aktif) return; K.bukaKunciAudio(); if (K.fsDidukung() && !K.adaFs() && !K.alarmOn) K.masukFs().then(K.periksaFs); },
    onPop() { if (!K.aktif) return; try { history.pushState({ kunci: 1 }, '', location.href); } catch (e) { /* abaikan */ } K.alarmNyala('Tombol Kembali ditekan. Anda tidak boleh keluar dari ujian.'); },

    // ---------- 4) pembatas screenshot / salin ----------
    // Cara kerja deteksi (browser TIDAK punya event "screenshot", jadi dipakai beberapa petunjuk sekaligus):
    //  a) tombol screenshot terbaca langsung: PrintScreen (Windows hanya mengirim KEYUP, bukan keydown!), Alt/Ctrl+PrintScreen,
    //     Win+Shift+S, Ctrl+Shift+S, Cmd+Shift+3/4/5/6 (dibaca lewat e.code karena e.key berubah jadi # $ % saat Shift ditekan),
    //     Chromebook Ctrl+Shift+F5;
    //  b) Win/Cmd+Shift ditekan lalu jendela langsung kehilangan fokus <= 2,5 dtk (alat tangkap layar bawaan OS sering
    //     "menelan" huruf S/angkanya sehingga halaman hanya melihat Win/Cmd+Shift lalu blur).
    // Screenshot lewat tombol fisik HP (Power+Volume / usap tiga jari) TIDAK dapat dideteksi oleh halaman web.
    ssT: 0, metaShiftT: 0, ptrT: 0,
    // JEDA SETELAH SCREENSHOT (v43z43): satu kali tekan PrtSc = SATU insiden = SATU pelanggaran. Sisa kejadiannya (alat tangkap layar
    // Windows merebut fokus, keluar layar penuh, jendela blur, pemeriksaan fokus berkala) TIDAK dihitung lagi, juga setelah siswa
    // menekan "Kembali". Atur: window.CBT_SS_JEDA_DETIK (bawaan 15, 0 - 120).
    ssAktif: false, jedaSampai: 0,
    jedaMs() { const d = Number(window.CBT_SS_JEDA_DETIK); return (isNaN(d) ? 15 : Math.max(0, Math.min(120, d))) * 1000; },
    dalamJeda() { return Date.now() < K.jedaSampai || (K.ssAktif && K.alarmOn); },
    // Siswa menekan "Kembali" (tombol penutup ATAU tombol peringatan lama): insiden selesai, sisa kejadian diberi jeda 8 detik lagi.
    akhiriInsidenSS() { if (K.ssAktif || K.dalamJeda()) { K.ssAktif = false; K.jedaSampai = Math.max(K.jedaSampai, Date.now() + 8000); K.bersihkanPewaktu(); } },
    // Batalkan semua pewaktu fokus/layar yang masih menunggu agar tidak menembak setelah insiden screenshot.
    bersihkanPewaktu() {
      clearTimeout(K.blurTimer); clearTimeout(K.visTimer); K.missFokus = 0; K.blurT0 = 0; K.metaShiftT = 0;
    },
    tombolSS(e) {
      const k = String(e.key || '').toLowerCase(), c = String(e.code || '');
      const meta = !!(e.metaKey || (e.getModifierState && e.getModifierState('OS')));
      if (k === 'printscreen' || k === 'snapshot' || c === 'PrintScreen' || e.keyCode === 44 || e.which === 44) return true;
      if (meta && e.shiftKey && (c === 'KeyS' || k === 's' || /^Digit[3-6]$/.test(c) || ['3', '4', '5', '6', '#', '$', '%', '^'].indexOf(k) >= 0)) return true;
      if (e.ctrlKey && e.shiftKey && (c === 'KeyS' || k === 's')) return true;
      if (e.ctrlKey && e.shiftKey && (c === 'F5' || k === 'f5')) return true;
      return false;
    },
    // Buka lagi isi soal ~1,5 dtk setelah screenshot bila halaman berfokus & tidak ada alarm (tanpa ini isi soal bisa tetap buram).
    pulihkanIsi() { setTimeout(() => { if (K.aktif && !document.hidden && document.hasFocus() && !K.alarmOn) K.sembunyiIsi(false); }, 1500); },
    laporSS(tombol) {
      const t = Date.now();
      if (K.dalamJeda()) { // masih insiden yang sama (atau sisa kejadiannya): catat saja, TIDAK dihitung & TIDAK berbunyi lagi
        K.sembunyiIsi(true); K.pulihkanIsi();
        if (t - K.ssT > 5000) { K.ssT = t; K.catat('tombol_terlarang', 'Screenshot lanjutan pada insiden yang sama (' + tombol + '), tidak dihitung lagi.'); }
        return;
      }
      K.ssT = t; K.ssAktif = true; K.jedaSampai = t + K.jedaMs();
      K.bersihkanPewaktu();
      K.sembunyiIsi(true); K.pulihkanIsi();
      // Timpa clipboard berulang kali: Windows menaruh gambar tangkapan ke clipboard sedikit TERLAMBAT setelah tombol ditekan,
      // jadi satu kali timpa saja sering kalah. Gagal diam-diam bila halaman sedang tidak berfokus.
      [0, 150, 500, 1200, 2500].forEach(ms => setTimeout(() => { try { navigator.clipboard && navigator.clipboard.writeText(' ').catch(() => {}); } catch (x) { /* abaikan */ } }, ms));
      K.laporHitung('screenshot', 'Screenshot terdeteksi (' + tombol + '). Ini dihitung sebagai pelanggaran.');
      K.alarmNyala('Screenshot dilarang selama ' + K.kata() + '. Percobaan ini dicatat sebagai pelanggaran.', true);
    },
    // Jendela baru saja kehilangan fokus / disembunyikan: apakah segera setelah Win/Cmd+Shift? Bila ya = alat tangkap layar OS.
    curigaiSSDariBlur() {
      if (!K.aktif || !K.pesanAktif()) return;
      if (K.metaShiftT && Date.now() - K.metaShiftT < 2500) { K.metaShiftT = 0; K.laporSS('Win/Cmd + Shift lalu jendela kehilangan fokus'); }
    },
    onKey(e) {
      if (!K.aktif) return;
      const meta = !!(e.metaKey || (e.getModifierState && e.getModifierState('OS')));
      if (meta && e.shiftKey) K.metaShiftT = Date.now();
      if (K.tombolSS(e)) {
        try { e.preventDefault(); } catch (x) { /* abaikan */ }
        K.laporSS(e.key === ' ' ? 'Spasi' : (e.key || e.code));
        return;
      }
      const k = String(e.key || '').toLowerCase();
      const blok = k === 'f12' || ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].indexOf(k) >= 0) || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].indexOf(k) >= 0);
      if (blok) { e.preventDefault(); e.stopPropagation(); K.catat('tombol_terlarang', e.key); }
    },
    // Windows: PrintScreen HANYA menghasilkan keyup -- inilah yang sebelumnya lolos tanpa alarm.
    onKeyUp(e) {
      if (!K.aktif) return;
      if (K.tombolSS(e)) { K.laporSS(e.key || e.code); return; }
    },
    blokir(e) { if (K.aktif) e.preventDefault(); },


    // ---------- 6) watermark identitas siswa (penangkal screenshot yang tidak terdeteksi) ----------
    WM: {
      el: null, timer: null, guard: null, obs: null, css: '', ulang: 0,
      aktif() { return window.CBT_WATERMARK_IDENTITAS !== false; },
      xml(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); },
      baris() {
        const u = (typeof state !== 'undefined' && state.user) || {};
        const nama = String(u.nama || 'PESERTA').toUpperCase().slice(0, 30);
        const sesi = String((typeof state !== 'undefined' && state.sesiId) || '').replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();
        const d = new Date();
        const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
        const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
        return [nama + (u.kelas ? ' \u00B7 ' + u.kelas : ''), tgl + ' ' + jam + (sesi ? ' \u00B7 ' + sesi : '')];
      },
      gambar() {
        const [a, b] = K.WM.baris(), op = Math.min(0.4, Math.max(0.03, Number(window.CBT_WM_OPACITY) || 0.06));
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><g transform="rotate(-24 170 110)" font-family="Arial,Helvetica,sans-serif" font-weight="600" fill="#64748b" fill-opacity="' + op + '" text-anchor="middle">' +
          '<text x="170" y="103" font-size="14">' + K.WM.xml(a) + '</text><text x="170" y="122" font-size="11">' + K.WM.xml(b) + '</text></g></svg>';
        return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
      },
      terapkan() {
        const W = K.WM; if (!W.el) return;
        W.css = 'position:fixed!important;inset:0!important;z-index:9450!important;pointer-events:none!important;user-select:none!important;-webkit-user-select:none!important;display:block!important;visibility:visible!important;opacity:1!important;background-repeat:repeat!important;background-image:' + W.gambar() + '!important;';
        W.el.style.cssText = W.css;
      },
      pasang() {
        const W = K.WM; if (W.el && document.body.contains(W.el)) return;
        const el = document.createElement('div'); el.id = 'wm-identitas'; el.setAttribute('aria-hidden', 'true'); W.el = el;
        W.terapkan(); document.body.appendChild(el);
      },
      lapor(d) { const t = Date.now(); if (t - K.WM.ulang > 20000) { K.WM.ulang = t; K.catat('tombol_terlarang', d); } },
      periksa() {
        const W = K.WM; if (!K.aktif) return;
        if (!W.el || !document.body.contains(W.el)) { W.lapor('Watermark identitas dihapus (dipasang ulang)'); W.el = null; W.pasang(); return; }
        if (W.el.style.cssText.indexOf('z-index') < 0 || getComputedStyle(W.el).display === 'none' || getComputedStyle(W.el).visibility === 'hidden' || Number(getComputedStyle(W.el).opacity) < 0.9) { W.lapor('Watermark identitas diubah (dipulihkan)'); W.terapkan(); }
      },
      mulai() {
        const W = K.WM; if (!W.aktif()) return;
        W.pasang();
        clearInterval(W.timer); W.timer = setInterval(() => { if (K.aktif) W.terapkan(); }, 30000);   // perbarui jam
        clearInterval(W.guard); W.guard = setInterval(W.periksa, 2500);
        try { W.obs = new MutationObserver(() => { if (K.aktif) W.periksa(); }); W.obs.observe(document.body, { childList: true }); } catch (e) { /* abaikan */ }
      },
      henti() {
        const W = K.WM; clearInterval(W.timer); clearInterval(W.guard);
        try { if (W.obs) W.obs.disconnect(); } catch (e) { /* abaikan */ } W.obs = null;
        try { if (W.el) W.el.remove(); } catch (e) { /* abaikan */ } W.el = null;
      }
    },

    // ---------- hidup / mati ----------
    on() {
      if (K.aktif) return;
      K.aktif = true; K.pernahFs = K.adaFs(); K.pernahFokus = false; K.missFokus = 0;
      K.siapAudio(); K.minta(); K.WM.mulai();
      clearInterval(K.fokusTimer); K.fokusTimer = setInterval(K.periksaFokus, 500);
      document.body.classList.add('kunci-aktif');
      document.addEventListener('visibilitychange', K.onVis);
      window.addEventListener('blur', K.onBlur); window.addEventListener('focus', K.onFokus); window.addEventListener('pagehide', K.onBlur);
      document.addEventListener('fullscreenchange', K.onFsChange); document.addEventListener('webkitfullscreenchange', K.onFsChange);
      document.addEventListener('pointerdown', K.onTap, true); document.addEventListener('touchstart', K.onTap, true);
      document.addEventListener('keydown', K.onKey, true); document.addEventListener('keyup', K.onKeyUp, true);
      K.ptrT = Date.now(); ['pointermove', 'pointerdown', 'mousemove', 'mousedown', 'wheel', 'touchstart'].forEach(t => document.addEventListener(t, K.onPtr, { capture: true, passive: true }));
      ['dragstart', 'selectstart', 'copy', 'cut', 'contextmenu'].forEach(t => document.addEventListener(t, K.blokir, true));
      try { history.pushState({ kunci: 1 }, '', location.href); } catch (e) { /* abaikan */ }
      window.addEventListener('popstate', K.onPop);
      K.tampilPenutupAwal = setTimeout(K.periksaFs, 900);
    },
    off() {
      if (!K.aktif) return;
      K.aktif = false; clearTimeout(K.tampilPenutupAwal); clearTimeout(K.blurTimer); clearTimeout(K.visTimer); clearInterval(K.fokusTimer); clearInterval(K.fsRetry); K.WM.henti();
      K.alarmMati(); K.sembunyiPenutup(); K.sembunyiIsi(false); K.lepasWake();
      document.body.classList.remove('kunci-aktif');
      document.removeEventListener('visibilitychange', K.onVis);
      window.removeEventListener('blur', K.onBlur); window.removeEventListener('focus', K.onFokus); window.removeEventListener('pagehide', K.onBlur);
      document.removeEventListener('fullscreenchange', K.onFsChange); document.removeEventListener('webkitfullscreenchange', K.onFsChange);
      document.removeEventListener('pointerdown', K.onTap, true); document.removeEventListener('touchstart', K.onTap, true);
      document.removeEventListener('keydown', K.onKey, true); document.removeEventListener('keyup', K.onKeyUp, true);
      ['pointermove', 'pointerdown', 'mousemove', 'mousedown', 'wheel', 'touchstart'].forEach(t => document.removeEventListener(t, K.onPtr, { capture: true }));
      ['dragstart', 'selectstart', 'copy', 'cut', 'contextmenu'].forEach(t => document.removeEventListener(t, K.blokir, true));
      window.removeEventListener('popstate', K.onPop);
      K.pernahFs = false; K.ssAktif = false; K.jedaSampai = 0;
    }
  };

  // Pasang di atas AntiCheat yang ada: nyala bersama ujian, mati bersama ujian.
  const aktifAsli = AntiCheat.aktifkan, matiAsli = AntiCheat.nonaktifkan;
  AntiCheat.aktifkan = function () { const r = aktifAsli.apply(this, arguments); if (!AntiCheat.aktif) return r; /* anti-curang dinonaktifkan guru untuk ujian ini */ try { K.on(); } catch (e) { console.warn('KunciUjian', e); } return r; };
  AntiCheat.nonaktifkan = function () { try { K.off(); } catch (e) { /* abaikan */ } return matiAsli.apply(this, arguments); };
  // Pintu tunggal: pelanggaran yang timbul dari sisa kejadian screenshot (pindah_tab / keluar_aplikasi / keluar_fullscreen)
  // dari app.js juga diabaikan selama jeda, jadi satu PrtSc tidak pernah dihitung lebih dari satu kali.
  const laporAsli = AntiCheat.laporPelanggaran;
  AntiCheat.laporPelanggaran = function (jenis) {
    if (K.aktif && jenis !== 'screenshot' && K.dalamJeda()) { K.catat('tombol_terlarang', 'Sisa kejadian screenshot (' + jenis + ') tidak dihitung lagi.'); return Promise.resolve(); }
    return laporAsli.apply(this, arguments);
  };
  try { // tombol "Kembali ke Ujian" di kotak peringatan lama (app.js) juga mengakhiri insiden screenshot
    if (typeof Siswa !== 'undefined' && Siswa.kembaliKeUjian && !Siswa._kjBungkus) {
      const kuAsli = Siswa.kembaliKeUjian; Siswa._kjBungkus = true;
      Siswa.kembaliKeUjian = function () { try { K.akhiriInsidenSS(); } catch (e) { /* abaikan */ } return kuAsli.apply(this, arguments); };
    }
  } catch (e) { /* abaikan */ }
  window.KunciUjian = K;
})();

/* ============================================================================
   LAYAR TETAP MENYALA — halaman soal (#ujian-screen) DAN halaman survei (#survei-screen)
   Berjalan sendiri (tidak bergantung AntiCheat), jadi aktif otomatis begitu salah satu halaman itu tampil
   dan mati otomatis begitu halamannya ditutup.
   - Utama   : Screen Wake Lock API (Chrome/Edge/Samsung Internet/Safari 16.4+), diminta ulang bila dilepas sistem
               atau saat siswa kembali ke halaman.
   - Cadangan: video senyap tak terlihat yang terus berputar (cara "NoSleep") untuk browser tanpa Wake Lock,
               atau bila Wake Lock ditolak (mis. mode hemat baterai). Perlu satu ketukan layar agar boleh diputar.
   ============================================================================ */
(function () {
  'use strict';
  const IDS = ['ujian-screen', 'survei-screen'];
  const LM = { lock: null, video: null, canvas: null, timer: null, memintaWake: false, adaGestur: false };

  const perlu = () => IDS.some(id => { const e = document.getElementById(id); return e && !e.classList.contains('hidden') && e.offsetParent !== null; }) && !document.hidden;

  async function wake() {
    if (LM.lock || LM.memintaWake || !('wakeLock' in navigator)) return !!LM.lock;
    LM.memintaWake = true;
    try {
      LM.lock = await navigator.wakeLock.request('screen');
      LM.lock.addEventListener('release', () => { LM.lock = null; if (perlu()) setTimeout(nyalakan, 400); });
      return true;
    } catch (e) { LM.lock = null; return false; } finally { LM.memintaWake = false; }
  }

  // Cadangan: video dari <canvas> yang terus berubah, diputar tanpa suara & tak terlihat.
  function siapVideo() {
    if (LM.video) return true;
    try {
      const c = document.createElement('canvas'); c.width = 16; c.height = 16; LM.canvas = c;
      if (!c.captureStream) return false;
      const ctx = c.getContext('2d'); let n = 0;
      const gambar = () => { ctx.fillStyle = (n++ % 2) ? '#000' : '#010101'; ctx.fillRect(0, 0, 16, 16); };
      gambar(); LM.gambarTimer = setInterval(gambar, 1000);
      const v = document.createElement('video');
      v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.muted = true; v.loop = true; v.setAttribute('aria-hidden', 'true');
      v.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;pointer-events:none;z-index:-1';
      v.srcObject = c.captureStream(2);
      document.body.appendChild(v); LM.video = v; return true;
    } catch (e) { return false; }
  }
  function putarVideo() {
    if (!siapVideo()) return;
    const p = LM.video.play(); if (p && p.catch) p.catch(() => { /* butuh ketukan pengguna: dicoba lagi saat ketukan berikutnya */ });
  }

  async function nyalakan() {
    if (!perlu()) return;
    const ok = await wake();
    if (!ok) putarVideo(); // Wake Lock tidak ada/ditolak -> pakai cadangan
  }
  function matikan() {
    try { if (LM.lock) LM.lock.release(); } catch (e) { /* abaikan */ } LM.lock = null;
    if (LM.video) { try { LM.video.pause(); LM.video.remove(); } catch (e) { /* abaikan */ } LM.video = null; clearInterval(LM.gambarTimer); LM.canvas = null; }
  }
  function tick() {
    if (perlu()) { if (!LM.lock && !(LM.video && !LM.video.paused)) nyalakan(); }
    else if (LM.lock || LM.video) matikan();
  }
  function gestur() {
    if (!perlu()) return;
    if (!LM.lock) { if (LM.video && LM.video.paused) putarVideo(); else if (!LM.video) nyalakan(); }
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) { LM.lock = null; } else { setTimeout(() => { matikan(); nyalakan(); }, 200); } });
  ['pointerdown', 'touchstart', 'click'].forEach(t => document.addEventListener(t, gestur, true));
  window.addEventListener('pageshow', () => setTimeout(tick, 200));
  LM.timer = setInterval(tick, 2000);
  window.LayarMenyala = LM;
})();
