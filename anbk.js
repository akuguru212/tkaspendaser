/* ============================================================================
   ANBK — alur & tampilan peserta (login -> konfirmasi data -> konfirmasi tes -> soal -> selesai),
   penyaji soal bergaya ANBK, impor data siswa sesuai Kartu Login, dan cetak Kartu Login (QR).
   Dimuat SETELAH app.js; mengganti beberapa fungsi bawaan tanpa mengubah fitur lain.
   ============================================================================ */
'use strict';
const Anbk = (function () {
  const $ = (id) => document.getElementById(id);
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));

  // ---------------- tanggal ----------------
  function parseTgl(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date && !isNaN(v)) return { d: v.getDate(), m: v.getMonth() + 1, y: v.getFullYear() };
    const s = String(v).trim();
    if (/^\d{5}(\.\d+)?$/.test(s)) { const n = Number(s); if (n > 20000 && n < 80000) { const dt = new Date(Math.round((n - 25569) * 86400000)); return { d: dt.getUTCDate(), m: dt.getUTCMonth() + 1, y: dt.getUTCFullYear() }; } }
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return { y: +m[1], m: +m[2], d: +m[3] };
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if (m) return { d: +m[1], m: +m[2], y: +m[3] };
    m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) { const i = BLN.findIndex(b => b.toLowerCase().slice(0, 3) === m[2].toLowerCase().slice(0, 3)); if (i >= 0) return { d: +m[1], m: i + 1, y: +m[3] }; }
    return null;
  }
  function isoTgl(v) { const t = parseTgl(v); return t ? t.y + '-' + pad(t.m) + '-' + pad(t.d) : String(v == null ? '' : v).trim(); }
  function tglPanjang(v) { const t = parseTgl(v); return t ? pad(t.d) + ' ' + BLN[t.m - 1] + ' ' + t.y : String(v || ''); }

  // ---------------- header / layar ----------------
  function setUser(pra) {
    const u = state.user; if (!u || u.role !== 'siswa') return;
    const teks = (u.username ? u.username + ' - ' : '') + (pra ? 'PESERTA TKA' : u.nama);
    document.querySelectorAll('.anbk-user-nama').forEach(e => { e.textContent = teks; });
  }
  const _tampilkan = UI.tampilkan;
  UI.tampilkan = function (id) {
    _tampilkan.call(UI, id);
    document.querySelectorAll('.anbk-usermenu').forEach(m => m.classList.add('hidden'));
    if (state.user && state.user.role === 'siswa') setUser(id === 'siswa-portal');
    window.scrollTo(0, 0);
  };

  function tampilKonfirmasiData() {
    const u = state.user || {};
    UI.tampilkan('siswa-portal');
    $('kd-username').textContent = u.username || '-';
    $('kd-nama1').textContent = (u.username ? u.username + ' - ' : '') + 'PESERTA TKA';
    $('kd-jk').textContent = u.jenis_kelamin === 'P' ? 'Perempuan' : (u.jenis_kelamin === 'L' ? 'Laki-Laki' : '-');
    $('kd-nama2').value = '';
    isiPilihanTanggal();
    $('input-token-ujian').value = ''; $('token-error').textContent = '';
    segarkanToken(false);
  }
  // Peserta mengetik nama & memilih tanggal lahir sendiri (konfirmasi data, seperti ANBK asli)
  function isiPilihanTanggal() {
    const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected disabled hidden' : ''}>${t}</option>`;
    let h = opt('', 'Hari', 1); for (let d = 1; d <= 31; d++) h += opt(d, d); $('kd-tgl').innerHTML = h;
    h = opt('', 'Bulan', 1); BLN.forEach((b, i) => { h += opt(i + 1, b); }); $('kd-bln').innerHTML = h;
    h = opt('', 'Tahun', 1); for (let y = new Date().getFullYear() - 5; y >= 1985; y--) h += opt(y, y); $('kd-thn').innerHTML = h;
  }
  const normNama = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function periksaKonfirmasi() {
    const u = state.user || {}; const nama = $('kd-nama2').value.trim();
    if (!nama) return 'Nama Peserta belum diisi.';
    if (normNama(nama) !== normNama(u.nama)) return 'Nama Peserta tidak sesuai dengan data peserta.';
    const t = parseTgl(u.tanggal_lahir);
    if (t) {
      if (!$('kd-tgl').value || !$('kd-bln').value || !$('kd-thn').value) return 'Tanggal Lahir belum dipilih.';
      if (+$('kd-tgl').value !== t.d || +$('kd-bln').value !== t.m || +$('kd-thn').value !== t.y) return 'Tanggal Lahir tidak sesuai dengan data peserta.';
    }
    return '';
  }
  async function segarkanToken(manual) {
    const btn = $('kd-refresh'); if (btn) btn.classList.add('is-disabled');
    try {
      const res = await api('getTokenAktif', {});
      const l = res && res.ok && res.ujian && res.ujian.length ? res.ujian[0] : null;
      $('kd-token-tampil').textContent = (l && l.token) ? l.token : '------';
      $('kd-mata').textContent = l ? l.judul : '-';
    } catch (e) { /* abaikan */ }
    if (btn) btn.classList.remove('is-disabled');
  }
  function tampilKonfirmasiTes(ujian) {
    const n = new Date();
    UI.tampilkan('tes-konfirmasi-screen');
    $('tk-nama').textContent = ujian.judul;
    $('tk-status').textContent = ujian.lanjutan ? 'Lanjutkan Tes' : 'Tes Baru';
    $('tk-waktu').textContent = pad(n.getDate()) + '/' + pad(n.getMonth() + 1) + '/' + n.getFullYear() + ', ' + pad(n.getHours()) + '.' + pad(n.getMinutes());
    $('tk-alokasi').textContent = (ujian.durasiMenit || '-') + ' Menit';
  }
  function kembaliKeKonfirmasiData() { if (!state.user) return; tampilKonfirmasiData(); }
  function menuUser(ev) {
    const box = ev.currentTarget; const m = box.querySelector('.anbk-usermenu'); if (!m) return;
    if (ev.target.closest('.anbk-usermenu button')) return;
    const adaTes = !$('tes-konfirmasi-screen').classList.contains('hidden');
    const kembali = m.querySelector('[data-aksi="kembali"]'); if (kembali) kembali.style.display = adaTes ? '' : 'none';
    const buka = m.classList.contains('hidden');
    document.querySelectorAll('.anbk-usermenu').forEach(x => x.classList.add('hidden'));
    if (buka) { m.classList.remove('hidden'); ev.stopPropagation(); }
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.anbk-user')) document.querySelectorAll('.anbk-usermenu').forEach(m => m.classList.add('hidden')); });

  function toggleSandi(btn) {
    const el = $('login-password'); const sembunyi = el.type === 'password';
    el.type = sembunyi ? 'text' : 'password';
    btn.innerHTML = '<i class="fa-solid ' + (sembunyi ? 'fa-eye-slash' : 'fa-eye') + '"></i>';
  }
  function pilihPortal(role, ev) {
    if (ev) ev.preventDefault();
    UI.pilihRole(role);
    const g = role === 'guru';
    $('login-judul').textContent = g ? 'Login Guru' : 'Selamat Datang';
    $('login-sub').textContent = g ? 'Silakan login dengan username dan password akun guru Anda' : 'Silakan login dengan menggunakan username dan password yang anda miliki';
    $('anbk-link-guru').classList.toggle('hidden', g); $('anbk-link-siswa').classList.toggle('hidden', !g);
    $('login-error').textContent = '';
    try { history.replaceState(null, '', location.pathname + location.search + (g ? '#guru' : '')); } catch (e) { /* abaikan */ }
  }

  // ---------------- modal Daftar Soal / Informasi Soal ----------------
  function bukaDaftar() { ExamEngine.renderGridSoal(); $('modal-daftar').classList.remove('hidden'); }
  function bukaInfo() {
    const s = state.soal[state.idxSoal]; if (!s) return;
    ExamEngine.renderGridSoal();
    $('inf-nomor').textContent = (state.idxSoal + 1) + ' dari ' + state.soal.length;
    $('inf-jenis').textContent = jenisTeks(s);
    const v = state.jawaban[s.id];
    const ada = v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
    $('inf-status').textContent = (ada ? 'Sudah dijawab' : 'Belum dijawab') + (state.ragu.includes(s.id) ? ' · Ragu-ragu' : '');
    $('inf-total').textContent = state.soal.length;
    $('modal-info').classList.remove('hidden');
  }
  function tutupModal(id) { $(id).classList.add('hidden'); }
  function jenisTeks(s) {
    if (s.tipe === 'checkbox') return 'Pilihan ganda kompleks (jawaban benar lebih dari satu)';
    if (s.tipe === 'pilihan_ganda') return 'Pilihan ganda';
    if (s.tipe === 'benar_salah') return 'Benar / Salah';
    if (s.tipe === 'menjodohkan') return 'Menjodohkan';
    return 'Uraian';
  }

  // ---------------- penyaji soal bergaya ANBK ----------------
  const RE_PISAH_TAG = /<(p|div)[^>]*>\s*(?:-{3,}|\[\[PISAH\]\])\s*<\/\1>/i;
  const RE_PISAH_TEKS = /(?:<br\s*\/?>\s*|\n|^)\s*(?:-{3,}|\[\[PISAH\]\])\s*(?:<br\s*\/?>|\n|$)/i;
  function pisah(raw) {
    raw = String(raw || '');
    for (const re of [RE_PISAH_TAG, RE_PISAH_TEKS]) {
      const m = re.exec(raw);
      if (m) return { stim: raw.slice(0, m.index), tanya: raw.slice(m.index + m[0].length) };
    }
    return { stim: '', tanya: raw };
  }
  const opsiObj = (o) => (o && typeof o === 'object') ? o : { teks: o || '', gambar: '' };
  const isiOpsi = (item) => kontenSoalHtml(item.teks) + (item.gambar ? tagGambarAman_(item.gambar, 'opsi-gambar-tampil', 'Gambar opsi') : '');

  function renderSoal(soal, opts) {
    const jwb = (opts && opts.jawaban) || {};
    const { stim, tanya } = pisah(soal.pertanyaan);
    let kiri = '';
    if (stim.trim()) kiri += '<div class="pertanyaan">' + kontenSoalHtml(stim) + '</div>';
    if (soal.gambar) kiri += tagGambarAman_(soal.gambar, 'gambar-soal', 'Gambar soal');
    let kanan = tanya.trim() ? '<div class="pertanyaan">' + kontenSoalHtml(tanya) + '</div>' : '';
    const id = esc(soal.id);
    if (soal.tipe === 'pilihan_ganda' || soal.tipe === 'benar_salah') {
      kanan += '<div class="anbk-opsi-list">' + (soal.opsi || []).map((o, i) =>
        `<label class="anbk-opsi${jwb[soal.id] === i ? ' selected' : ''}" data-opsi="${i}" onclick="ExamEngine.pilihJawabanTunggal('${id}', ${i})"><span class="anbk-cb radio"></span><span class="anbk-opsi-t">${isiOpsi(opsiObj(o))}</span></label>`).join('') + '</div>';
    } else if (soal.tipe === 'checkbox') {
      const dip = jwb[soal.id] || [];
      kanan += '<div class="petunjuk">Pilih semua jawaban yang benar! Jawaban benar lebih dari satu.</div>';
      kanan += '<div class="anbk-opsi-list">' + (soal.opsi || []).map((o, i) =>
        `<label class="anbk-opsi${dip.includes(i) ? ' selected' : ''}" data-opsi="${i}" onclick="ExamEngine.toggleJawabanGanda('${id}', ${i})"><span class="anbk-cb"></span><span class="anbk-opsi-t">${isiOpsi(opsiObj(o))}</span></label>`).join('') + '</div>';
    } else if (soal.tipe === 'menjodohkan') {
      const j = jwb[soal.id] || {}; const kol = (soal.opsi && soal.opsi.kanan) || [];
      const bs = kol.length === 2 && /^benar$/i.test(String(kol[0]).trim()) && /^salah$/i.test(String(kol[1]).trim());
      kanan += '<div style="overflow-x:auto"><table class="anbk-tbl"><thead><tr><th>Pernyataan</th>' +
        kol.map((k, c) => `<th class="kol-opsi">${esc(k)}${bs ? ' (' + (c + 1) + ')' : ''}</th>`).join('') + '</tr></thead><tbody>' +
        ((soal.opsi && soal.opsi.kiri) || []).map((t, r) => `<tr><td>${esc(t)}</td>` +
          kol.map((k, c) => `<td><span class="anbk-rd${String(j[r]) === String(c) ? ' on' : ''}" data-row="${r}" data-val="${c}" onclick="ExamEngine.pilihJodoh('${id}', ${r}, '${c}')"></span></td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>';
    } else {
      kanan += `<textarea rows="8" placeholder="Tulis jawaban Anda di sini..." oninput="ExamEngine.isiJawabanUraian('${id}', this.value)">${esc(jwb[soal.id] || '')}</textarea>`;
    }
    if (!kiri) return '<div class="soal-kanan">' + kanan + '</div>';
    return '<div class="soal-kiri">' + kiri + '</div><div class="soal-kanan">' + kanan + '</div>';
  }

  // ---------------- hook ke mesin ujian ----------------
  Siswa.cekToken = async function () {
    const inp = $('input-token-ujian'), err = $('token-error'), btn = $('btn-cari-ujian');
    const token = inp.value.trim().toUpperCase(); err.textContent = '';
    const salah = periksaKonfirmasi(); if (salah) { err.textContent = salah; return; }
    if (!token) { err.textContent = 'Token belum diisi.'; inp.focus(); return; }
    btn.classList.add('is-disabled'); const lama = btn.textContent; btn.textContent = 'Memeriksa...';
    try {
      const res = await api('cekToken', { token, siswaId: state.user && state.user.id });
      if (!res.ok) { err.textContent = res.error || 'Token salah.'; return; }
      state.ujian = res.ujian; tampilKonfirmasiTes(res.ujian);
    } finally { btn.classList.remove('is-disabled'); btn.textContent = lama; }
  };
  UI.kembaliKeBerandaSiswa = function () { tampilKonfirmasiData(); };

  ExamEngine.renderSoal = function () {
    const idx = state.idxSoal, soal = state.soal[idx], card = $('question-card');
    card.innerHTML = renderKontenSoal(soal, { nomor: idx + 1, total: state.soal.length, interaktif: true, jawaban: state.jawaban, pecah: true, anbk: true });
    card.classList.toggle('dua-kolom', !!card.querySelector('.soal-kiri'));
    renderMatika(card);
    $('u-nomor').textContent = 'Soal nomor ' + (idx + 1);
    $('chk-ragu').checked = state.ragu.includes(soal.id);
    $('btn-soal-prev').disabled = idx === 0;
    const terakhir = idx === state.soal.length - 1, nx = $('btn-soal-next');
    nx.classList.toggle('selesai', terakhir);
    nx.querySelector('span').textContent = terakhir ? 'Selesai' : 'Soal berikutnya';
    nx.querySelector('i').style.display = terakhir ? 'none' : '';
    SkalaSoal.terapkan(); ExamEngine.renderGridSoal();
    $('modal-daftar').classList.add('hidden'); $('modal-info').classList.add('hidden');
  };
  ExamEngine.pilihJawabanTunggal = function (id, i) {
    state.jawaban[id] = i; simpanCacheLokal();
    document.querySelectorAll('#question-card .anbk-opsi').forEach(e => e.classList.toggle('selected', +e.dataset.opsi === i));
    ExamEngine.renderGridSoal();
  };
  ExamEngine.toggleJawabanGanda = function (id, i) {
    const arr = state.jawaban[id] || []; const k = arr.indexOf(i);
    if (k === -1) arr.push(i); else arr.splice(k, 1);
    state.jawaban[id] = arr; simpanCacheLokal();
    document.querySelectorAll('#question-card .anbk-opsi').forEach(e => e.classList.toggle('selected', arr.includes(+e.dataset.opsi)));
    ExamEngine.renderGridSoal();
  };
  ExamEngine.pilihJodoh = function (id, i, val) {
    const j = state.jawaban[id] || {}; j[i] = val; state.jawaban[id] = j; simpanCacheLokal();
    document.querySelectorAll('#question-card .anbk-rd[data-row="' + i + '"]').forEach(e => e.classList.toggle('on', String(e.dataset.val) === String(val)));
    ExamEngine.renderGridSoal();
  };

  // ukuran font soal: 3 tingkat "A A A"
  Object.assign(SkalaSoal, {
    tingkat: [1, 1.2, 1.45], idx: 0,
    init() { try { const v = parseInt(localStorage.getItem('cbt_skala_anbk'), 10); if (v >= 0 && v < 3) SkalaSoal.idx = v; } catch (e) { /* abaikan */ } },
    pilih(i) { SkalaSoal.idx = i; try { localStorage.setItem('cbt_skala_anbk', String(i)); } catch (e) { /* abaikan */ } SkalaSoal.terapkan(); },
    terapkan() {
      const c = $('question-card'); if (c) c.style.setProperty('--skala', SkalaSoal.tingkat[SkalaSoal.idx]);
      ['skala-kecil', 'skala-sedang', 'skala-besar'].forEach((id, k) => { const b = $(id); if (b) b.classList.toggle('on', k === SkalaSoal.idx); });
    }
  });
  SkalaSoal.init();

  const _buka = KumpulUI.buka;
  KumpulUI.buka = function () {
    $('modal-daftar').classList.add('hidden'); $('modal-info').classList.add('hidden');
    _buka.call(KumpulUI); $('kumpul-judul').textContent = 'Konfirmasi Tes';
  };

  // ---------------- QR (byte mode, ECC M, versi 1-10) ----------------
  function qrMatrix(text) {
    const data = Array.from(new TextEncoder().encode(text));
    const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLK = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
    const raw = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; } return r; };
    let ver = 1;
    for (; ver <= 10; ver++) { if (data.length * 8 + 4 + (ver < 10 ? 8 : 16) <= (Math.floor(raw(ver) / 8) - ECC[ver] * BLK[ver]) * 8) break; }
    if (ver > 10) throw new Error('Teks QR terlalu panjang');
    const dataCw = Math.floor(raw(ver) / 8) - ECC[ver] * BLK[ver];
    const bits = []; const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    put(4, 4); put(data.length, ver < 10 ? 8 : 16); data.forEach(b => put(b, 8));
    put(0, Math.min(4, dataCw * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    for (let p = 0xEC; bits.length < dataCw * 8; p ^= 0xEC ^ 0x11) put(p, 8);
    const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
    const div = (deg) => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
    const rem = (d, dv) => { const r = dv.map(() => 0); for (const b of d) { const f = b ^ r.shift(); r.push(0); dv.forEach((c, i) => { r[i] ^= mul(c, f); }); } return r; };
    const nb = BLK[ver], el = ECC[ver], rawCw = Math.floor(raw(ver) / 8), nShort = nb - rawCw % nb, shortLen = Math.floor(rawCw / nb), dv = div(el);
    const blocks = []; for (let i = 0, k = 0; i < nb; i++) { const d = cw.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += d.length; blocks.push(d.concat(i < nShort ? [0] : [], rem(d, dv))); }
    const out = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) out.push(b[i]); });
    const size = ver * 4 + 17; const M = [], F = [];
    for (let y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    const setF = (x, y, d) => { if (x >= 0 && y >= 0 && x < size && y < size) { M[y][x] = d; F[y][x] = true; } };
    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); setF(cx + dx, cy + dy, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver >= 2) {
      const na = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2; const pos = [6];
      for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const fmt = (mask) => {
      const dat = (0 << 3) | mask; let r = dat; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((dat << 10) | r) ^ 0x5412; const g = (i) => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) setF(8, i, g(i)); setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8));
      for (let i = 9; i < 15; i++) setF(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) setF(8, size - 15 + i, g(i));
      setF(8, size - 8, true);
    };
    fmt(0);
    if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i / 3); setF(a, c, d); setF(c, a, d); } }
    let k = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!F[y][x] && k < out.length * 8) { M[y][x] = ((out[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0; k++; }
      }
    }
    const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    const apply = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && maskFn[m](x, y)) M[y][x] = !M[y][x]; };
    const penalty = () => {
      let p = 0;
      for (let y = 0; y < size; y++) { let run = 1; for (let x = 1; x < size; x++) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (let x = 0; x < size; x++) { let run = 1; for (let y = 1; y < size; y++) { if (M[y][x] === M[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      let dark = 0; M.forEach(r => r.forEach(c => { if (c) dark++; })); p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    let best = 0, bp = Infinity;
    for (let m = 0; m < 8; m++) { apply(m); fmt(m); const p = penalty(); if (p < bp) { bp = p; best = m; } apply(m); }
    apply(best); fmt(best);
    return M;
  }
  function qrSvg(text) {
    const M = qrMatrix(text), n = M.length, q = 2; let d = '';
    M.forEach((r, y) => { let x = 0; while (x < n) { if (r[x]) { let w = 1; while (x + w < n && r[x + w]) w++; d += 'M' + (x + q) + ' ' + (y + q) + 'h' + w + 'v1h-' + w + 'z'; x += w; } else x++; } });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  // ---------------- Kartu Login ----------------
  function bukaKartuLogin() {
    const semua = state.guru.daftarSiswa || [];
    if (!semua.length) { toast('Belum ada data siswa. Impor atau tambahkan siswa dulu.', 'error'); return; }
    let m = $('modal-kartu-login'); if (m) m.remove();
    const kelas = Array.from(new Set(semua.map(s => s.kelas || ''))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const pil = $('filter-kelas-siswa') ? $('filter-kelas-siswa').value : '';
    m = document.createElement('div'); m.id = 'modal-kartu-login'; m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>Cetak Kartu Login</h3>
      <p class="subtitle" style="margin-top:-.4rem">Kartu berisi logo, QR (memindai QR membuka aplikasi dengan username &amp; password terisi), nama, NISN, tempat/tanggal lahir, username dan password.</p>
      <div class="field"><label>Baris judul 1</label><input type="text" id="kl-j1" value="KARTU LOGIN  GLADI BERSIH"></div>
      <div class="field"><label>Baris judul 2</label><input type="text" id="kl-j2" value="TES KEMAMPUAN AKADEMIK  SMP/MTS"></div>
      <div class="field"><label>Baris judul 3</label><input type="text" id="kl-j3" value="TAHUN  ${new Date().getFullYear()}"></div>
      <div class="row">
        <div class="field"><label>Kelas</label><select id="kl-kelas"><option value="">Semua kelas</option>${kelas.map(k => `<option value="${esc(k)}"${k === pil ? ' selected' : ''}>${esc(k || '(tanpa kelas)')}</option>`).join('')}</select></div>
        <div class="field"><label>Ukuran kartu</label><select id="kl-ukuran"><option value="2">Ringkas: 8 kartu per halaman A4</option><option value="1">Besar: 3 kartu per halaman A4</option></select></div>
      </div>
      <div class="modal-close-row"><button class="secondary" onclick="document.getElementById('modal-kartu-login').remove()">Batal</button><button class="accent" id="kl-cetak" onclick="Anbk.cetakKartuLogin()">Cetak / Simpan PDF</button></div></div>`;
    document.body.appendChild(m);
  }
  function cetakKartuLogin() {
    const kelas = $('kl-kelas').value, kol = $('kl-ukuran').value;
    const j = [$('kl-j1').value, $('kl-j2').value, $('kl-j3').value].filter(x => x.trim());
    let daftar = (state.guru.daftarSiswa || []).filter(s => !$('kl-kelas').value || (s.kelas || '') === kelas);
    if (!daftar.length) { toast('Tidak ada siswa untuk dicetak.', 'error'); return; }
    daftar = daftar.slice().sort((a, b) => String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }) || String(a.nama || '').localeCompare(String(b.nama || ''), 'id'));
    const base = location.href.split('#')[0];
    const kartu = daftar.map(s => {
      let qr = ''; try { qr = qrSvg(base + '#u=' + encodeURIComponent(s.username) + '&p=' + encodeURIComponent(s.password)); } catch (e) { qr = ''; }
      const ttl = [s.tempat_lahir, tglPanjang(s.tanggal_lahir)].filter(Boolean).join(', ');
      const baris = [['Nama Peserta', s.nama], ['NISN', s.nisn], ['Tempat, Tanggal Lahir', ttl], ['Username', s.username, 1], ['Password', s.password, 1]];
      return `<div class="kl-card"><div class="kl-head"><img class="kl-logo" src="icons/tutwuri.png" alt=""><img class="kl-logo kl-sch" src="icons/smpn2.png" alt=""><div class="kl-judul">${j.map(esc).join('<br>')}</div><div class="kl-qr">${qr}</div></div>
        <table class="kl-tb">${baris.map(r => `<tr><td class="k">${r[0]}</td><td class="c">:</td><td class="v${r[2] ? ' b' : ''}">${esc(r[1] || '')}</td></tr>`).join('')}</table></div>`;
    }).join('');
    const html = `<div class="kl-wrap kl-k${kol}">${kartu}</div>`;
    $('modal-kartu-login').remove();
    Guru._cetakArea_(html, 'Kartu Login' + (kelas ? ' ' + kelas : '')).then(() => {});
    const a = $('cetak-area'); if (a) a.classList.add('kl-area');
  }
  async function simpanTampilToken(aktif) {
    const res = await api('simpanPengaturanTokenSiswa', { aktif });
    if (res && res.ok) toast(aktif ? 'Token tampil di layar peserta.' : 'Token disembunyikan dari layar peserta.', 'success');
    else toast('Gagal menyimpan pengaturan.', 'error');
  }
  async function muatPengaturanToken() {
    try { const r = await api('getPengaturanTokenSiswa', {}); const c = $('opt-tampil-token'); if (c && r && r.ok) c.checked = !!r.aktif; } catch (e) { /* abaikan */ }
  }

  // ---------------- impor data siswa (sesuai Kartu Login) ----------------
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const KOL = {
    nama: ['nama', 'namapeserta', 'namalengkap', 'namasiswa'], nisn: ['nisn', 'nis'], tempat: ['tempatlahir', 'tempat'],
    tgl: ['tanggallahir', 'tgllahir', 'tanggal'], ttl: ['tempattanggallahir', 'tempattgllahir', 'ttl'],
    username: ['username', 'user', 'namapengguna'], password: ['password', 'sandi', 'katasandi', 'pass'],
    kelas: ['kelas', 'rombel'], jk: ['jeniskelamin', 'jk', 'kelamin', 'lp']
  };
  function petaKolom(row) {
    const p = {}; (row || []).forEach((c, i) => { const n = norm(c); Object.keys(KOL).forEach(k => { if (p[k] === undefined && KOL[k].includes(n)) p[k] = i; }); });
    return p;
  }
  const normJk = (v) => { const s = String(v || '').trim().toLowerCase(); return /^(l|lk|laki)/.test(s) ? 'L' : (/^(p|pr|perempuan|wanita)/.test(s) ? 'P' : ''); };
  const teks = (v) => (v === null || v === undefined) ? '' : String(v).trim();

  Guru.unduhTemplateSiswa = function () {
    unduhXlsx('template-data-siswa.xlsx', ['Nama Peserta', 'NISN', 'Tempat Lahir', 'Tanggal Lahir', 'Jenis Kelamin', 'Kelas', 'Username', 'Password'], [
      ['Komang Rendi Mahardika', '0105952278', 'Banjarasem', '01 Oktober 2010', 'L', '9A', 'TP2206005700018', '187377*'],
      ['Ni Luh Ayu Sari', '0112345678', 'Seririt', '12/03/2011', 'P', '9A', '', '']
    ]);
  };
  Guru.importSiswaDariFile = function (ev) {
    const file = ev.target.files[0]; if (!file) return;
    const kelasOverride = $('siswa-import-kelas').value.trim();
    const reader = new FileReader();
    reader.onload = async (e) => {
      try { await muatPustaka_('xlsx'); } catch (err) { toast(err.message, 'error'); ev.target.value = ''; return; }
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
      let hi = rows.findIndex(r => petaKolom(r).nama !== undefined), P;
      if (hi >= 0) P = petaKolom(rows[hi]); else { hi = 0; P = { nama: 0, kelas: 1, username: 2, password: 3 }; }
      const data = rows.slice(hi + 1).filter(r => r.some(c => teks(c)) && teks(r[P.nama]));
      const ada = {}, adaNisn = {}; (state.guru.daftarSiswa || []).forEach(s => { ada[String(s.username).trim().toLowerCase()] = s; if (s.nisn) adaNisn[String(s.nisn)] = s; });
      const terpakai = Object.keys(ada); let nUser = 0, nPass = 0;
      const baru = [], ubah = [];
      data.forEach(r => {
        const nama = teks(r[P.nama]); let tempat = P.tempat !== undefined ? teks(r[P.tempat]) : '', tgl = P.tgl !== undefined ? r[P.tgl] : '';
        if (P.ttl !== undefined && teks(r[P.ttl])) { const t = teks(r[P.ttl]), k = t.indexOf(','); if (k > 0) { tempat = tempat || t.slice(0, k).trim(); tgl = tgl || t.slice(k + 1).trim(); } else tempat = tempat || t; }
        let nisn = P.nisn !== undefined ? teks(r[P.nisn]) : ''; if (/^\d{1,9}$/.test(nisn)) nisn = nisn.padStart(10, '0');
        let username = P.username !== undefined ? teks(r[P.username]) : '';
        let password = P.password !== undefined ? teks(r[P.password]) : '';
        const rec = { nama, nisn, tempat_lahir: tempat, tanggal_lahir: isoTgl(tgl), jenis_kelamin: P.jk !== undefined ? normJk(r[P.jk]) : '' };
        const kelas = kelasOverride || (P.kelas !== undefined ? teks(r[P.kelas]) : ''); if (kelas) rec.kelas = kelas;
        const lama = (username && ada[username.toLowerCase()]) || (nisn && adaNisn[nisn]) || null;
        if (lama) { if (password) rec.password = password; if (username) rec.username = username; ubah.push(Object.assign({}, rec, { id: lama.id })); return; }
        if (!username) { username = buatUsernameDariNama(nama, terpakai); nUser++; }
        terpakai.push(username.toLowerCase());
        if (!password) { password = buatPasswordAcak(); nPass++; }
        baru.push(Object.assign({ kelas: '' }, rec, { username, password }));
      });
      if (!baru.length && !ubah.length) { toast('Tidak ada baris valid. Pastikan ada kolom "Nama Peserta".', 'error'); ev.target.value = ''; return; }
      let gagal = '';
      if (baru.length) { const r = await api('importSiswa', { siswaList: JSON.stringify(baru) }); if (!r.ok) gagal = r.error; }
      for (const u of ubah) { const r = await api('updateSiswa', { siswa: JSON.stringify(u) }); if (!r.ok) gagal = r.error; }
      if (gagal) toast('Gagal impor: ' + gagal, 'error');
      else {
        let pesan = baru.length + ' siswa baru diimpor' + (ubah.length ? ', ' + ubah.length + ' siswa lama diperbarui' : '') + '.';
        if (nUser) pesan += ' ' + nUser + ' username dibuatkan otomatis.'; if (nPass) pesan += ' ' + nPass + ' password dibuatkan otomatis.';
        toast(pesan, 'success'); $('siswa-import-kelas').value = '';
      }
      Guru.muatDaftarSiswa(); ev.target.value = '';
    };
    reader.readAsBinaryString(file);
  };
  const _muatSiswa = Guru.muatDaftarSiswa;
  Guru.muatDaftarSiswa = async function () { const r = await _muatSiswa.apply(Guru, arguments); muatPengaturanToken(); return r; };

  // ---------------- awal: #guru dan #u=..&p=.. (hasil memindai QR kartu) ----------------
  window.addEventListener('DOMContentLoaded', () => {
    const h = location.hash || '';
    if (/^#guru/i.test(h)) pilihPortal('guru');
    else if (/^#u=/.test(h)) {
      const q = new URLSearchParams(h.slice(1));
      if (q.get('u')) { $('login-username').value = q.get('u'); $('login-password').value = q.get('p') || ''; }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* abaikan */ }
      setTimeout(() => { const b = $('btn-login-submit'); if (b) b.focus(); }, 50);
    }
  });

  return { setUser, isoTgl, tglPanjang, tampilKonfirmasiData, segarkanToken, tampilKonfirmasiTes, kembaliKeKonfirmasiData, menuUser, toggleSandi, pilihPortal,
    bukaDaftar, bukaInfo, tutupModal, renderSoal, qrMatrix, qrSvg, bukaKartuLogin, cetakKartuLogin, simpanTampilToken };
})();
window.Anbk = Anbk;
