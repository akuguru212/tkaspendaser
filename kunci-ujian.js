/* ============================================================================
   KUNCI UJIAN (HP & laptop) — dipasang di atas AntiCheat yang sudah ada di app.js
   1) Layar HP tetap menyala selama di halaman soal (Screen Wake Lock API)
   2) Wajib layar penuh: bila belum / keluar layar penuh, soal ditutup + tombol "Masuk Layar Penuh"
   3) Alarm sirine + getar saat siswa mencoba keluar (pindah aplikasi, layar mati, keluar layar penuh,
      tombol Kembali). Alarm berhenti hanya setelah siswa menekan "Kembali ke Ujian".
   4) Pembatas screenshot (SEBAGIAN — lihat catatan): isi soal disembunyikan saat halaman kehilangan fokus,
      tombol PrintScreen / Win+Shift+S / Cmd+Shift+3-4-5 terdeteksi & dicatat, tidak bisa cetak/simpan/seleksi.
   CATATAN JUJUR: browser/PWA TIDAK BISA memblokir screenshot tombol fisik (Power+Volume) di Android ataupun
   menahan tombol Home. Itu hanya bisa lewat aplikasi Android native (FLAG_SECURE + screen pinning).
   ============================================================================ */
(function () {
  'use strict';
  if (typeof AntiCheat === 'undefined') return;

  const K = {
    aktif: false, wake: null, alarmEl: null, alarmOn: false, pernahFs: false, getarTimer: null,
    blurTimer: null, audioSiap: false, url: null,

    // ---------- util ----------
    fsDidukung() { const e = document.documentElement; return !!(e.requestFullscreen || e.webkitRequestFullscreen); },
    adaFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    masukFs() {
      const e = document.documentElement; const r = e.requestFullscreen || e.webkitRequestFullscreen;
      if (!r) return Promise.resolve(false);
      try { return Promise.resolve(r.call(e)).then(() => true).catch(() => false); } catch (x) { return Promise.resolve(false); }
    },
    catat(j, d) { try { AntiCheat.catat(j, d || ''); } catch (e) { /* abaikan */ } },
    pesanAktif() { return !!(typeof state !== 'undefined' && state.sesiId && !state.submitting); },

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
    alarmNyala(alasan) {
      if (!K.aktif || !K.pesanAktif()) return;
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
      ov.querySelector('#kunci-judul').textContent = alarm ? 'PERINGATAN! Jangan Keluar dari Ujian' : 'Wajib Layar Penuh';
      ov.querySelector('#kunci-pesan').textContent = pesan;
      ov.classList.toggle('alarm', !!alarm);
      ov.classList.remove('hidden'); document.body.classList.add('kunci-tutup');
    },
    sembunyiPenutup() { const ov = document.getElementById('kunci-overlay'); if (ov) ov.classList.add('hidden'); document.body.classList.remove('kunci-tutup'); },
    async kembali() {
      K.bukaKunciAudio();
      if (K.fsDidukung() && !K.adaFs()) { const ok = await K.masukFs(); if (!ok && K.fsDidukung()) { /* gagal: tetap tampilkan penutup */ } }
      K.alarmMati();
      if (!K.fsDidukung() || K.adaFs()) K.sembunyiPenutup();
      K.minta();
      const w = document.getElementById('anticheat-warning');
      if (w && !w.classList.contains('hidden') && typeof Siswa !== 'undefined' && Siswa.kembaliKeUjian) Siswa.kembaliKeUjian();
    },
    periksaFs() {
      if (!K.aktif || !K.pesanAktif() || !K.fsDidukung()) return;
      if (K.adaFs()) { K.pernahFs = true; if (!K.alarmOn) K.sembunyiPenutup(); return; }
      if (K.pernahFs) K.alarmNyala('Anda keluar dari layar penuh. Tekan tombol di bawah untuk kembali ke ujian.');
      else K.tampilPenutup('Ketuk tombol di bawah untuk memulai ujian dalam layar penuh.', false);
    },

    // ---------- event ----------
    onVis() {
      if (!K.aktif) return;
      if (document.hidden) { K.sembunyiIsi(true); K.alarmNyala('Anda meninggalkan halaman ujian atau layar mati.'); }
      else { K.sembunyiIsi(false); K.lepasWake(); K.minta(); K.periksaFs(); }
    },
    onBlur() {
      if (!K.aktif) return;
      K.sembunyiIsi(true);
      clearTimeout(K.blurTimer);
      K.blurTimer = setTimeout(() => { if (K.aktif && !document.hasFocus()) K.alarmNyala('Anda keluar dari aplikasi ujian.'); }, 400);
    },
    onFokus() { clearTimeout(K.blurTimer); if (K.aktif && !document.hidden) K.sembunyiIsi(false); },
    sembunyiIsi(b) { document.body.classList.toggle('kunci-blur', !!b); },
    onFsChange() { setTimeout(K.periksaFs, 150); },
    onTap() { if (!K.aktif) return; K.bukaKunciAudio(); if (K.fsDidukung() && !K.adaFs() && !K.alarmOn) K.masukFs().then(K.periksaFs); },
    onPop() { if (!K.aktif) return; try { history.pushState({ kunci: 1 }, '', location.href); } catch (e) { /* abaikan */ } K.alarmNyala('Tombol Kembali ditekan. Anda tidak boleh keluar dari ujian.'); },

    // ---------- 4) pembatas screenshot / salin ----------
    onKey(e) {
      if (!K.aktif) return;
      const k = String(e.key || '').toLowerCase();
      const ss = k === 'printscreen' || k === 'snapshot' || (e.metaKey && e.shiftKey && ['3', '4', '5'].indexOf(k) >= 0) || (e.metaKey && e.shiftKey && (k === 's')) || (e.shiftKey && (e.metaKey || e.getModifierState && e.getModifierState('OS')) && k === 's');
      if (ss) {
        e.preventDefault(); K.sembunyiIsi(true); K.catat('screenshot', 'Percobaan screenshot (tombol ' + e.key + ')');
        try { navigator.clipboard && navigator.clipboard.writeText(' '); } catch (x) { /* abaikan */ }
        setTimeout(() => { if (!document.hidden) K.sembunyiIsi(false); }, 1500);
        K.alarmNyala('Screenshot dilarang selama ujian.');
        return;
      }
      const blok = k === 'f12' || ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].indexOf(k) >= 0) || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].indexOf(k) >= 0);
      if (blok) { e.preventDefault(); e.stopPropagation(); K.catat('tombol_terlarang', e.key); }
    },
    onKeyUp(e) { if (K.aktif && String(e.key).toLowerCase() === 'printscreen') { try { navigator.clipboard && navigator.clipboard.writeText(' '); } catch (x) { /* abaikan */ } } },
    blokir(e) { if (K.aktif) e.preventDefault(); },

    // ---------- hidup / mati ----------
    on() {
      if (K.aktif) return;
      K.aktif = true; K.pernahFs = K.adaFs();
      K.siapAudio(); K.minta();
      document.body.classList.add('kunci-aktif');
      document.addEventListener('visibilitychange', K.onVis);
      window.addEventListener('blur', K.onBlur); window.addEventListener('focus', K.onFokus); window.addEventListener('pagehide', K.onBlur);
      document.addEventListener('fullscreenchange', K.onFsChange); document.addEventListener('webkitfullscreenchange', K.onFsChange);
      document.addEventListener('pointerdown', K.onTap, true); document.addEventListener('touchstart', K.onTap, true);
      document.addEventListener('keydown', K.onKey, true); document.addEventListener('keyup', K.onKeyUp, true);
      ['dragstart', 'selectstart', 'copy', 'cut', 'contextmenu'].forEach(t => document.addEventListener(t, K.blokir, true));
      try { history.pushState({ kunci: 1 }, '', location.href); } catch (e) { /* abaikan */ }
      window.addEventListener('popstate', K.onPop);
      K.tampilPenutupAwal = setTimeout(K.periksaFs, 900);
    },
    off() {
      if (!K.aktif) return;
      K.aktif = false; clearTimeout(K.tampilPenutupAwal); clearTimeout(K.blurTimer);
      K.alarmMati(); K.sembunyiPenutup(); K.sembunyiIsi(false); K.lepasWake();
      document.body.classList.remove('kunci-aktif');
      document.removeEventListener('visibilitychange', K.onVis);
      window.removeEventListener('blur', K.onBlur); window.removeEventListener('focus', K.onFokus); window.removeEventListener('pagehide', K.onBlur);
      document.removeEventListener('fullscreenchange', K.onFsChange); document.removeEventListener('webkitfullscreenchange', K.onFsChange);
      document.removeEventListener('pointerdown', K.onTap, true); document.removeEventListener('touchstart', K.onTap, true);
      document.removeEventListener('keydown', K.onKey, true); document.removeEventListener('keyup', K.onKeyUp, true);
      ['dragstart', 'selectstart', 'copy', 'cut', 'contextmenu'].forEach(t => document.removeEventListener(t, K.blokir, true));
      window.removeEventListener('popstate', K.onPop);
      K.pernahFs = false;
    }
  };

  // Pasang di atas AntiCheat yang ada: nyala bersama ujian, mati bersama ujian.
  const aktifAsli = AntiCheat.aktifkan, matiAsli = AntiCheat.nonaktifkan;
  AntiCheat.aktifkan = function () { const r = aktifAsli.apply(this, arguments); try { K.on(); } catch (e) { console.warn('KunciUjian', e); } return r; };
  AntiCheat.nonaktifkan = function () { try { K.off(); } catch (e) { /* abaikan */ } return matiAsli.apply(this, arguments); };
  window.KunciUjian = K;
})();
