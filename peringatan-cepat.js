/* ============================================================================
   PERINGATAN "MENJAWAB TERLALU CEPAT" — layar ujian siswa (literasi, numerasi, dll.)
   Gaya sama seperti peringatan Survei: siswa diingatkan SATU KALI saat menekan
   SELESAI TES, lalu boleh PERIKSA KEMBALI atau TETAP KIRIM. Tidak memblokir siswa
   dan tidak mengubah nilai.

   Cara kerja:
   - Waktu yang dihabiskan di tiap soal dicatat (berhenti saat tab/aplikasi tidak
     terlihat, tersimpan di perangkat sehingga aman bila halaman dimuat ulang).
   - Saat SELESAI TES ditekan, dicek:
       a) rata-rata waktu per soal terjawab terlalu singkat,
       b) banyak soal dijawab dalam hitungan detik,
       c) seluruh tes selesai jauh lebih cepat dari durasi yang tersedia.
   - Selama mengerjakan, bila siswa menjawab beberapa soal berturut-turut dengan sangat
     cepat, muncul pengingat singkat (maks. 2 kali).

   Pengaturan opsional (di config.js), nilai bawaan di dalam kurung:
     window.CBT_CEPAT = {
       aktif: true,            // false = matikan fitur
       rataDetik: 25,          // rata-rata di bawah ini (detik/soal) dianggap terlalu cepat
       soalDetik: 10,          // satu soal dijawab di bawah ini = "kilat"
       persenKilat: 40,        // bila >= persen ini soal "kilat" -> peringatan
       pakaiPersen: 15,        // total waktu pakai < persen ini dari durasi -> peringatan
       minSoal: 5,             // minimal soal terjawab agar pengecekan berlaku
       kategori: null          // mis. /literasi|numerasi/i  (null = semua ujian)
     };
   ============================================================================ */
(function () {
  'use strict';
  if (typeof ExamEngine === 'undefined' || typeof KumpulUI === 'undefined' || typeof state === 'undefined') return;

  const DEF = { aktif: true, rataDetik: 25, soalDetik: 10, persenKilat: 40, pakaiPersen: 15, minSoal: 5, kategori: null };
  const cfg = () => Object.assign({}, DEF, window.CBT_CEPAT || {});
  const $ = (id) => document.getElementById(id);
  const KUNCI = (sid) => 'cbt_waktu_' + sid;

  // ---------------- pencatatan waktu per soal ----------------
  const T = { sesiId: '', detik: {}, cur: null, t0: 0, beruntun: 0, pengingat: 0, diingatkan: false, popupTunda: false };

  function muat(sesiId) {
    if (T.sesiId === sesiId) return;
    T.sesiId = sesiId; T.detik = {}; T.cur = null; T.t0 = 0; T.beruntun = 0; T.pengingat = 0; T.diingatkan = false; T.popupTunda = false;
    try {
      const v = JSON.parse(localStorage.getItem(KUNCI(sesiId)) || '{}');
      if (v && v.d) { T.detik = v.d; T.diingatkan = !!v.w; }
    } catch (e) { /* abaikan */ }
  }
  function simpan() {
    if (!T.sesiId) return;
    try { localStorage.setItem(KUNCI(T.sesiId), JSON.stringify({ d: T.detik, w: T.diingatkan })); } catch (e) { /* abaikan */ }
  }
  const dijawab = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

  // Tutup hitungan soal yang sedang tampil: tambahkan lama tampil ke soal itu.
  function tutupSoal() {
    if (!T.cur || !T.t0) return;
    const dt = (Date.now() - T.t0) / 1000;
    T.detik[T.cur] = Math.round(((T.detik[T.cur] || 0) + dt) * 10) / 10;
    T.t0 = 0;
    return dt;
  }

  function pengingatBeruntun(idSebelumnya, dt) {
    const c = cfg();
    if (dt === undefined || !idSebelumnya) return;
    const cepat = dijawab(state.jawaban[idSebelumnya]) && (T.detik[idSebelumnya] || 0) < Math.max(3, c.soalDetik / 2);
    T.beruntun = cepat ? T.beruntun + 1 : 0;
    if (T.beruntun >= 4 && T.pengingat < 2) {
      T.pengingat++; T.beruntun = 0;
      T.popupTunda = true; // popup ditampilkan setelah soal berikutnya selesai dirender (lihat ExamEngine.renderSoal)
    }
  }

  // Pengingat saat mengerjakan: popup di tengah layar dengan tombol LANJUTKAN MENGERJAKAN.
  // Waktu selama popup terbuka tidak dihitung sebagai waktu membaca soal.
  function tampilPengingat() {
    if (document.querySelector('.cj-bg')) return;
    pasangCss();
    tutupSoal(); simpan();
    const el = document.createElement('div');
    el.className = 'cj-bg';
    el.innerHTML = `<div class="cj-box" role="alertdialog" aria-modal="true"><div class="cj-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3>Anda menjawab terlalu cepat</h3>
      <p>Pelan-pelan saja. Bacalah soal dengan teliti sebelum memilih jawaban.</p>
      <div class="cj-aksi"><button type="button" class="anbk-btn anbk-btn-primary" data-a="lanjut">LANJUTKAN MENGERJAKAN</button></div></div>`;
    el.addEventListener('click', (ev) => {
      if (!ev.target.closest('[data-a]')) return;
      el.remove();
      if (T.cur && !document.hidden && !state.submitting) T.t0 = Date.now();
    });
    document.body.appendChild(el);
  }

  function aktifUntukUjian() {
    const c = cfg();
    if (!c.aktif) return false;
    if (c.kategori) {
      try { return new RegExp(c.kategori.source || c.kategori, 'i').test(String((state.ujian && (state.ujian.kategori + ' ' + state.ujian.judul)) || '')); } catch (e) { return true; }
    }
    return true;
  }

  // ---------------- pasang ke ExamEngine.renderSoal ----------------
  const _render = ExamEngine.renderSoal;
  ExamEngine.renderSoal = function () {
    if (state.sesiId) {
      muat(state.sesiId);
      const sebelum = T.cur;
      const dt = tutupSoal();
      if (aktifUntukUjian()) pengingatBeruntun(sebelum, dt);
      simpan();
      const s = state.soal && state.soal[state.idxSoal];
      T.cur = s ? s.id : null;
      T.t0 = (T.cur && !document.hidden) ? Date.now() : 0;
    }
    const hasilRender = _render.apply(this, arguments);
    if (T.popupTunda) { T.popupTunda = false; setTimeout(tampilPengingat, 0); }
    return hasilRender;
  };

  // jangan hitung waktu saat tab/aplikasi tidak terlihat
  document.addEventListener('visibilitychange', function () {
    if (!T.cur) return;
    if (document.hidden) { tutupSoal(); simpan(); } else if (!T.t0 && state.sesiId && !state.submitting) T.t0 = Date.now();
  });

  // ---------------- penilaian kecepatan ----------------
  function periksa() {
    const c = cfg();
    tutupSoal(); if (T.cur && !document.hidden) T.t0 = Date.now(); simpan();
    const soal = state.soal || [];
    const terjawab = soal.map((s, i) => ({ i, id: s.id, d: T.detik[s.id] || 0 })).filter(x => dijawab(state.jawaban[x.id]));
    const n = terjawab.length;
    const hasil = { perlu: false, alasan: [], kilat: [], rata: 0, n, pakaiMenit: 0, durasiMenit: 0 };
    if (n === 0) return hasil;
    const total = terjawab.reduce((a, x) => a + x.d, 0);
    hasil.rata = total / n;
    hasil.kilat = terjawab.filter(x => x.d < c.soalDetik).map(x => x.i);
    if (n < c.minSoal) return hasil; // terlalu sedikit soal terjawab: dicatat, tetapi tidak dinilai
    const fmt = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
    if (hasil.rata < c.rataDetik) hasil.alasan.push('Rata-rata hanya ' + fmt(hasil.rata) + ' detik per soal.');
    if (hasil.kilat.length / n * 100 >= c.persenKilat) hasil.alasan.push(hasil.kilat.length + ' dari ' + n + ' soal dijawab kurang dari ' + c.soalDetik + ' detik.');
    const durMenit = Number(state.ujian && state.ujian.durasiMenit) || 0;
    hasil.durasiMenit = durMenit;
    if (durMenit > 0 && Number.isFinite(state.sisaDetik)) {
      const pakai = durMenit * 60 - state.sisaDetik;
      hasil.pakaiMenit = Math.max(0, Math.round(pakai / 6) / 10);
      if (pakai > 0 && pakai / (durMenit * 60) * 100 < c.pakaiPersen) {
        hasil.alasan.push('Tes selesai dalam ' + Math.max(1, Math.round(pakai / 60)) + ' menit dari ' + durMenit + ' menit yang tersedia.');
      }
    }
    hasil.perlu = hasil.alasan.length > 0;
    return hasil;
  }

  // ---------------- tampilan peringatan ----------------
  function pasangCss() {
    if ($('cj-css')) return;
    const st = document.createElement('style'); st.id = 'cj-css';
    st.textContent = `
.cj-bg{position:fixed;inset:0;z-index:99990;background:rgba(15,30,55,.55);display:grid;place-items:center;padding:16px}
.cj-box{background:#fff;border-radius:12px;max-width:480px;width:100%;max-height:92vh;overflow:auto;padding:22px 22px 18px;font-family:'Poppins',sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.3)}
.cj-ico{width:44px;height:44px;border-radius:50%;background:#fff3cd;color:#b26a00;display:grid;place-items:center;font-size:20px}
.cj-box h3{margin:6px 0 8px;font-size:18px;color:#212529}
.cj-box p,.cj-box li{font-size:13.5px;line-height:1.55;color:#343a40}
.cj-box ul{margin:0 0 10px;padding-left:20px}
.cj-chips{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 10px}
.cj-chips button{all:unset;box-sizing:border-box;cursor:pointer;min-width:28px;height:26px;padding:0 6px;display:inline-grid;place-items:center;border:1px solid #d39e00;border-radius:3px;background:#ffc107;font:500 12px 'Poppins',sans-serif;color:#212529}
.cj-aksi{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.cj-aksi .anbk-btn{height:34px;padding:0 16px;font-size:12.5px;flex:1 1 140px}`;
    document.head.appendChild(st);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  function tampilPeringatan(h) {
    pasangCss();
    return new Promise((res) => {
      const el = document.createElement('div');
      el.className = 'cj-bg';
      const chips = h.kilat.slice(0, 60).map((i) => `<button type="button" data-no="${i}">${i + 1}</button>`).join('');
      el.innerHTML = `<div class="cj-box" role="alertdialog" aria-modal="true"><div class="cj-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Anda terdeteksi mengerjakan terlalu cepat</h3>
        <p>Anda terdeteksi mengerjakan terlalu cepat, asal-asalan, atau asal klik, sehingga jawaban bisa kurang teliti.</p>
        <ul>${h.alasan.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
        ${chips ? `<p>Soal yang dijawab sangat cepat (ketuk nomor untuk memeriksa kembali):</p><div class="cj-chips">${chips}</div>` : ''}
        <p>Soal literasi dan numerasi perlu dibaca dengan saksama. Mengerjakan asal klik tidak mencerminkan kemampuan Anda sebenarnya. Silakan <b>periksa kembali</b> selagi waktu masih ada, atau pilih <b>tetap kirim</b> bila Anda yakin dengan jawaban Anda.</p>
        <div class="cj-aksi"><button type="button" class="anbk-btn anbk-btn-green" data-a="ulang">PERIKSA KEMBALI</button><button type="button" class="anbk-btn anbk-btn-red" data-a="kirim">TETAP KIRIM</button></div></div>`;
      el.addEventListener('click', (ev) => {
        const no = ev.target.closest('[data-no]');
        if (no) { el.remove(); res({ a: 'ulang', no: Number(no.dataset.no) }); return; }
        const a = ev.target.closest('[data-a]');
        if (a) { el.remove(); res({ a: a.dataset.a }); }
      });
      document.body.appendChild(el);
    });
  }

  // ---------------- pasang ke tombol SELESAI TES ----------------
  const _kirim = KumpulUI.kirim;
  KumpulUI.kirim = async function () {
    const btn = KumpulUI._el('kumpul-btn-ya');
    if (btn && btn.disabled) return;
    if (!T.diingatkan && aktifUntukUjian() && !state.submitting) {
      const h = periksa();
      if (h.perlu) {
        T.diingatkan = true; simpan(); // diingatkan satu kali saja
        const p = await tampilPeringatan(h);
        if (p.a === 'ulang') {
          KumpulUI.tutup();
          const tujuan = p.no !== undefined ? p.no : (h.kilat.length ? h.kilat[0] : 0);
          Siswa.lompatKeSoal(tujuan);
          return;
        }
      }
    }
    return _kirim.apply(this, arguments);
  };

  // bersihkan catatan waktu setelah jawaban terkirim
  const _submit = ExamEngine.submitUjian;
  ExamEngine.submitUjian = async function () {
    const sid = state.sesiId;
    const r = await _submit.apply(this, arguments);
    try { if (sid && state.submitting) localStorage.removeItem(KUNCI(sid)); } catch (e) { /* abaikan */ }
    return r;
  };

  // Ringkasan untuk GURU -- dikirim bersama jawaban saat tes dikumpulkan (JSON string, '' bila fitur nonaktif).
  //  w = sempat diperingatkan (1/0), t = saat dikumpulkan masih tergolong terlalu cepat (1/0),
  //  r = rata-rata detik/soal, n = soal terjawab, k = jumlah soal "kilat", m = menit terpakai, d = durasi ujian (menit),
  //  a = alasan, no = nomor soal yang dijawab sangat cepat (berurutan, 1-based)
  function ringkas() {
    try {
      if (!aktifUntukUjian()) return '';
      const h = periksa();
      if (!h.n) return '';
      return JSON.stringify({
        v: 1, w: T.diingatkan ? 1 : 0, t: h.perlu ? 1 : 0,
        r: Math.round(h.rata * 10) / 10, n: h.n, k: h.kilat.length, m: h.pakaiMenit, d: h.durasiMenit,
        a: h.alasan.slice(0, 4), no: h.kilat.slice(0, 60).map((i) => i + 1)
      });
    } catch (e) { return ''; }
  }

  window.PeringatanCepat = { periksa, ringkas, data: () => Object.assign({}, T.detik) };
})();
