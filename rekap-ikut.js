/* ============================================================================
   REKAP KEIKUTSERTAAN — siapa yang SUDAH dan BELUM mengikuti simulasi / ujian.
   Portal Guru > "Rekap Keikutsertaan".
   - Pilih simulasi (satu ujian) ATAU "Semua simulasi" (gabungan seluruh ujian).
   - Pilih kelas (satu kelas atau semua kelas = seluruh siswa).
   - Tampilkan: Belum ikut | Sudah ikut | Semua.
   - Unduh PDF (digambar langsung dengan jsPDF; bila pustaka gagal dimuat -> jendela cetak "Simpan sebagai PDF").
   ATURAN
   * "Sudah ikut" = siswa punya sesi yang SUDAH selesai pada ujian itu (status selain 'berlangsung', sama dengan Rekap Nilai).
     Siswa yang masih mengerjakan / belum menyentuh ujian = "Belum ikut".
   * Mode "Semua simulasi": siswa dianggap lengkap bila ikut SEMUA ujian; kolom "Belum ikut" memuat judul ujian yang terlewat.
   * Memakai aksi server yang sudah ada (getDaftarUjian, getDaftarSiswa, getRekapNilai) -> Code.gs tidak perlu diubah.
   Dimuat SETELAH perkembangan.js.
   ============================================================================ */
'use strict';
const RekapIkut = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const kelasDari = (s) => String(s.kelas == null || String(s.kelas).trim() === '' ? '-' : s.kelas).trim();
  const urutKelas = (a, b) => a.localeCompare(b, 'id', { numeric: true });
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const R = { guruId: null, ujian: [], siswa: [], rekap: {}, dimuat: false, memuat: false, waktu: 0, ujianId: '', kelas: '', status: 'belum', seq: 0 };

  // ---------------- gaya ----------------
  (function () {
    if (document.getElementById('rekap-ikut-css-inline')) return;
    const st = document.createElement('style'); st.id = 'rekap-ikut-css-inline';
    st.textContent = `
#tab-rekap-ikut .ri-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .7rem; margin: 0 0 1rem; }
#tab-rekap-ikut .ri-stat { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 14px; padding: .75rem .95rem; box-shadow: var(--shadow); border-top: 4px solid var(--c-line); }
#tab-rekap-ikut .ri-stat.ok { border-top-color: #229a66; } #tab-rekap-ikut .ri-stat.bad { border-top-color: #d6455d; } #tab-rekap-ikut .ri-stat.info { border-top-color: #2563eb; }
#tab-rekap-ikut .ri-stat b { display: block; font-size: 1.45rem; line-height: 1.25; color: var(--c-text); }
#tab-rekap-ikut .ri-stat span { font-size: .72rem; font-weight: 600; letter-spacing: .03em; color: var(--c-muted); }
#tab-rekap-ikut .ri-card-h { display: flex; align-items: baseline; gap: .6rem; flex-wrap: wrap; margin: 0 0 .5rem; }
#tab-rekap-ikut .ri-card-h h3 { margin: 0; font-size: 1.02rem; } #tab-rekap-ikut .ri-card-h small { color: var(--c-muted); }
#tab-rekap-ikut .ri-scroll { overflow: auto; max-height: 72vh; border: 1px solid var(--c-line); border-radius: 14px; }
#tab-rekap-ikut table.ri-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
#tab-rekap-ikut table.ri-table th { position: sticky; top: 0; z-index: 2; background: var(--c-surface); text-align: left; padding: .6rem .6rem; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; color: var(--c-muted); border-bottom: 2px solid var(--c-line); white-space: nowrap; }
#tab-rekap-ikut table.ri-table td { padding: .5rem .6rem; border-bottom: 1px solid var(--c-line); vertical-align: top; }
#tab-rekap-ikut table.ri-table tbody tr:hover td { background: var(--c-hover); }
#tab-rekap-ikut .ri-nama { font-weight: 700; min-width: 150px; color: var(--c-text); }
#tab-rekap-ikut .ri-c { text-align: center; font-variant-numeric: tabular-nums; }
#tab-rekap-ikut .ri-badge { display: inline-block; padding: .12rem .6rem; border-radius: 999px; font-size: .74rem; font-weight: 700; white-space: nowrap; }
#tab-rekap-ikut .ri-badge.ok { background: color-mix(in srgb, #229a66 15%, var(--c-surface)); color: #1b7f53; }
#tab-rekap-ikut .ri-badge.bad { background: color-mix(in srgb, #d6455d 14%, var(--c-surface)); color: #c0334a; }
#tab-rekap-ikut .ri-belum { color: #c0334a; font-size: .82rem; line-height: 1.45; }
#tab-rekap-ikut .ri-kosong { text-align: center; padding: 1.6rem 1rem; color: var(--c-muted); }
#tab-rekap-ikut .ri-bar { height: 8px; border-radius: 99px; background: color-mix(in srgb, #d6455d 22%, var(--c-surface)); overflow: hidden; min-width: 70px; }
#tab-rekap-ikut .ri-bar i { display: block; height: 100%; background: #229a66; }`;
    document.head.appendChild(st);
  })();

  // ---------------- data ----------------
  const ujianTerpilih = () => R.ujianId === 'semua' ? R.ujian : R.ujian.filter(u => String(u.id) === String(R.ujianId));

  async function muatDasar() {
    const [ru, rs] = await Promise.all([api('getDaftarUjian', { guruId: state.user.id }), api('getDaftarSiswa', {})]);
    if (!ru || !ru.ok) throw new Error((ru && ru.error) || 'Gagal memuat daftar ujian.');
    if (!rs || !rs.ok) throw new Error((rs && rs.error) || 'Gagal memuat daftar siswa.');
    R.ujian = (ru.data || []).slice().sort((a, b) => String(a.judul || '').localeCompare(String(b.judul || ''), 'id', { numeric: true }));
    R.siswa = rs.data || [];
    if (R.ujianId !== 'semua' && !R.ujian.some(u => String(u.id) === String(R.ujianId))) R.ujianId = R.ujian.length ? String(R.ujian[0].id) : '';
  }
  // pastikan nilai tiap ujian yang dipilih sudah diambil (3 permintaan paralel)
  async function pastikanRekap(daftar, seq) {
    const butuh = daftar.filter(u => !R.rekap[u.id]);
    let selesai = 0;
    const info = $('ri-info');
    const tampil = () => { if (info && butuh.length) info.textContent = 'Memuat nilai ' + selesai + ' / ' + butuh.length + '...'; };
    tampil();
    let i = 0;
    const kerja = async () => {
      while (i < butuh.length) {
        const u = butuh[i++];
        const r = await api('getRekapNilai', { ujianId: u.id });
        if (!r || !r.ok) throw new Error((r && r.error) || ('Gagal memuat nilai ' + (u.judul || '')));
        const peta = new Map();
        (r.data || []).forEach(x => {
          const lama = peta.get(String(x.siswaId));
          const n = Number(x.nilai);
          if (!lama || (!isNaN(n) && n > Number(lama.nilai || -1))) peta.set(String(x.siswaId), { nilai: x.nilai, selesai: x.selesai, status: x.status });
        });
        R.rekap[u.id] = peta; selesai++; tampil();
        if (seq !== R.seq) return;
      }
    };
    await Promise.all([kerja(), kerja(), kerja()]);
    if (info) info.textContent = '';
  }
  async function muat(tombol, paksa) {
    if (R.memuat) return false;
    if (typeof state === 'undefined' || !state.user || state.user.role === 'siswa') return false;
    R.memuat = true;
    const btn = (tombol && tombol.classList) ? tombol : $('ri-segarkan');
    if (btn) { btn.classList.add('sedang'); btn.setAttribute('aria-busy', 'true'); }
    let ok = true;
    try {
      if (R.guruId !== state.user.id) { R.guruId = state.user.id; R.ujian = []; R.siswa = []; R.rekap = {}; R.dimuat = false; R.kelas = ''; R.ujianId = ''; }
      if (paksa !== false) R.rekap = {};
      await muatDasar();
      R.dimuat = true; R.waktu = Date.now();
      R.memuat = false;
      ok = (await render()) !== false;
    } catch (e) {
      ok = false;
      if (!R.dimuat) { const c = $('ri-tabel'); if (c) c.innerHTML = `<p class="subtitle">${esc((e && e.message) || 'Gagal memuat.')}</p>`; }
      else toast('Gagal memperbarui Rekap Keikutsertaan. Data sebelumnya tetap ditampilkan.', 'error');
    } finally {
      R.memuat = false; if (btn) { btn.classList.remove('sedang'); btn.removeAttribute('aria-busy'); }
    }
    try { Guru.tandaiDiperbarui_('tab-rekap-ikut', !ok); } catch (e) { }
    return ok;
  }

  // ---------------- hitung ----------------
  // Mengembalikan null bila nilai ujian belum dimuat.
  function hitung() {
    const daftar = ujianTerpilih();
    if (!daftar.length || daftar.some(u => !R.rekap[u.id])) return null;
    const semua = R.ujianId === 'semua';
    const q = norm(($('ri-cari') || {}).value);
    const scope = R.siswa.filter(s => (!R.kelas || kelasDari(s) === R.kelas) && (!q || norm(s.nama).indexOf(q) >= 0));
    const semuaRows = scope.map(s => {
      const ikut = [], belum = [];
      daftar.forEach(u => { (R.rekap[u.id].has(String(s.id)) ? ikut : belum).push(u); });
      const rec = (!semua && ikut.length) ? R.rekap[daftar[0].id].get(String(s.id)) : null;
      return { s, kelas: kelasDari(s), ikut, belum, rec, lengkap: belum.length === 0 };
    });
    const cmp = (a, b) => urutKelas(a.kelas, b.kelas) || String(a.s.nama || '').localeCompare(String(b.s.nama || ''), 'id');
    semuaRows.sort(cmp);
    const rows = semuaRows.filter(r => R.status === 'semua' || (R.status === 'belum' ? !r.lengkap : r.lengkap));
    const kelasMap = new Map();
    semuaRows.forEach(r => { const k = kelasMap.get(r.kelas) || { kelas: r.kelas, jml: 0, sudah: 0, nol: 0 }; k.jml++; if (r.lengkap) k.sudah++; if (!r.ikut.length) k.nol++; kelasMap.set(r.kelas, k); });
    const perKelas = [...kelasMap.values()].sort((a, b) => urutKelas(a.kelas, b.kelas));
    const total = semuaRows.length, sudah = semuaRows.filter(r => r.lengkap).length, nol = semuaRows.filter(r => !r.ikut.length).length;
    return {
      semua, daftar, rows, perKelas, total, sudah, belum: total - sudah, nol,
      judul: semua ? 'Semua simulasi (' + daftar.length + ' ujian)' : String(daftar[0].judul || ''),
      kelasLabel: R.kelas || 'Seluruh kelas',
      statusLabel: { belum: 'Belum ikut', sudah: 'Sudah ikut', semua: 'Semua siswa' }[R.status]
    };
  }
  const labelStat = (h) => h.semua
    ? { sudah: 'Ikut semua simulasi', belum: 'Belum lengkap', nol: 'Belum ikut sama sekali' }
    : { sudah: 'Sudah ikut', belum: 'Belum ikut', nol: '' };
  const tglTeks = (v) => { try { return v ? formatTanggal(v) : '-'; } catch (e) { return v ? String(v) : '-'; } };

  // ---------------- tampilan ----------------
  function chipsKelas() {
    const w = $('ri-chips-kelas'); if (!w) return;
    const ks = [...new Set(R.siswa.map(kelasDari))].sort(urutKelas);
    w.innerHTML = [['', 'Semua Kelas']].concat(ks.map(k => [k, k])).map(([v, t]) =>
      `<button type="button" class="am-chip${R.kelas === v ? ' on' : ''}" data-v="${esc(v)}" onclick="RekapIkut.pilihKelas(this.dataset.v)">${esc(t)}</button>`).join('');
  }
  function isiSelect() {
    const sel = $('ri-ujian'); if (!sel) return;
    sel.innerHTML = (R.ujian.length ? `<option value="semua">★ Semua simulasi / ujian (${R.ujian.length})</option>` : '') +
      R.ujian.map(u => `<option value="${esc(u.id)}">${esc(u.judul)}</option>`).join('');
    sel.value = R.ujianId;
  }
  async function render() {
    if (!$('ri-tabel')) return;
    const sc = $('tab-rekap-ikut'); if (sc) sc.classList.add('am-scope');
    isiSelect(); chipsKelas();
    const stSel = $('ri-status'); if (stSel) stSel.value = R.status;
    if (!R.ujian.length) { $('ri-stats').innerHTML = ''; $('ri-kelas').innerHTML = ''; $('ri-tabel').innerHTML = '<div class="ri-kosong">Belum ada ujian/simulasi. Buat dulu di menu Kelola Ujian.</div>'; return; }
    const seq = ++R.seq;
    const daftar = ujianTerpilih();
    if (daftar.some(u => !R.rekap[u.id])) {
      $('ri-tabel').innerHTML = '<div class="ri-kosong">Memuat nilai...</div>';
      try { await pastikanRekap(daftar, seq); } catch (e) { $('ri-tabel').innerHTML = `<div class="ri-kosong">${esc(e.message || 'Gagal memuat nilai.')}</div>`; return false; }
      if (seq !== R.seq) return true; // pilihan berubah saat memuat
    }
    const h = hitung(); if (!h) return;
    const L = labelStat(h);
    const kartu = (cls, n, t) => `<div class="ri-stat ${cls}"><b>${n}</b><span>${esc(t)}</span></div>`;
    $('ri-stats').innerHTML = kartu('info', h.total, 'Jumlah siswa') + kartu('ok', h.sudah, L.sudah) + kartu('bad', h.belum, L.belum) +
      (h.semua ? kartu('bad', h.nol, L.nol) : '') + kartu('info', pct(h.sudah, h.total) + '%', h.semua ? 'Lengkap' : 'Partisipasi');
    // ringkasan per kelas
    $('ri-kelas').innerHTML = h.perKelas.length > 1 ? `<div class="panel"><div class="ri-card-h"><h3>Ringkasan per Kelas</h3><small>${esc(h.judul)}</small></div>
      <div class="ri-scroll"><table class="ri-table"><thead><tr><th>Kelas</th><th class="ri-c">Siswa</th><th class="ri-c">${esc(L.sudah)}</th><th class="ri-c">${esc(L.belum)}</th><th style="width:26%">Partisipasi</th></tr></thead><tbody>${
      h.perKelas.map(k => `<tr><td class="ri-nama">${esc(k.kelas)}</td><td class="ri-c">${k.jml}</td><td class="ri-c">${k.sudah}</td><td class="ri-c">${k.jml - k.sudah}</td><td><div class="ri-bar" title="${pct(k.sudah, k.jml)}%"><i style="width:${pct(k.sudah, k.jml)}%"></i></div> <small>${pct(k.sudah, k.jml)}%</small></td></tr>`).join('')}</tbody></table></div></div>` : '';
    const info = $('ri-info-hasil'); if (info) info.textContent = h.rows.length + ' dari ' + h.total + ' siswa ditampilkan';
    if (!h.rows.length) {
      $('ri-tabel').innerHTML = `<div class="ri-kosong">${h.total ? (R.status === 'belum' ? '🎉 Semua siswa sudah ikut.' : 'Tidak ada siswa pada pilihan ini.') : 'Tidak ada siswa pada pilihan ini.'}</div>`;
      return true;
    }
    let tb;
    if (h.semua) {
      tb = `<thead><tr><th class="ri-c">No</th><th>Nama Siswa</th><th>Kelas</th><th class="ri-c">Ikut</th><th>Belum ikut (simulasi yang terlewat)</th></tr></thead><tbody>${
        h.rows.map((r, i) => `<tr><td class="ri-c">${i + 1}</td><td class="ri-nama">${esc(r.s.nama)}</td><td>${esc(r.kelas)}</td><td class="ri-c"><span class="ri-badge ${r.lengkap ? 'ok' : 'bad'}">${r.ikut.length} / ${h.daftar.length}</span></td><td class="ri-belum">${r.lengkap ? '<span class="ri-badge ok">Lengkap</span>' : esc(r.belum.map(u => u.judul).join(', '))}</td></tr>`).join('')}</tbody>`;
    } else {
      tb = `<thead><tr><th class="ri-c">No</th><th>Nama Siswa</th><th>Kelas</th><th>Status</th><th class="ri-c">Nilai</th><th>Selesai</th></tr></thead><tbody>${
        h.rows.map((r, i) => `<tr><td class="ri-c">${i + 1}</td><td class="ri-nama">${esc(r.s.nama)}</td><td>${esc(r.kelas)}</td><td><span class="ri-badge ${r.lengkap ? 'ok' : 'bad'}">${r.lengkap ? 'Sudah ikut' : 'Belum ikut'}</span></td><td class="ri-c">${r.rec && r.rec.nilai !== '' && r.rec.nilai != null ? esc(r.rec.nilai) : '–'}</td><td>${r.rec ? esc(tglTeks(r.rec.selesai)) : '–'}</td></tr>`).join('')}</tbody>`;
    }
    $('ri-tabel').innerHTML = `<div class="ri-scroll"><table class="ri-table">${tb}</table></div>`;
    return true;
  }
  function pilihUjian(v) { R.ujianId = String(v); render(); }
  function pilihKelas(v) { R.kelas = String(v || ''); render(); }
  function pilihStatus(v) { R.status = v; render(); }

  // ---------------- PDF ----------------
  const pdfTeks = (s) => String(s == null ? '' : s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '?');
  const bersih = (t) => String(t).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').trim().slice(0, 40);
  function rowsPdf(h) {
    // kembalikan {cols, baris:[{grup?, sel:[...], warna:[...]}]}
    const HIJAU = [27, 127, 83], MERAH = [192, 51, 74];
    const banyakKelas = !R.kelas && h.perKelas.length > 1;
    const cols = h.semua
      ? [{ t: 'No', w: 10, a: 'c' }, { t: 'Nama Siswa', w: 62 }, { t: 'Kelas', w: 16 }, { t: 'Ikut', w: 16, a: 'c' }, { t: 'Belum ikut (simulasi yang terlewat)', w: 78 }]
      : [{ t: 'No', w: 10, a: 'c' }, { t: 'Nama Siswa', w: 74 }, { t: 'Kelas', w: 18 }, { t: 'Status', w: 28 }, { t: 'Nilai', w: 16, a: 'c' }, { t: 'Selesai', w: 36 }];
    const baris = []; let lastK = null, no = 0;
    h.rows.forEach(r => {
      if (banyakKelas && r.kelas !== lastK) {
        const k = h.perKelas.find(x => x.kelas === r.kelas);
        baris.push({ grup: 'Kelas ' + r.kelas + '  -  ' + k.jml + ' siswa, ' + k.sudah + ' ' + (h.semua ? 'lengkap' : 'sudah ikut') + ', ' + (k.jml - k.sudah) + ' ' + (h.semua ? 'belum lengkap' : 'belum ikut') });
        lastK = r.kelas; no = 0;
      }
      no++;
      if (h.semua) baris.push({ sel: [String(no), r.s.nama, r.kelas, r.ikut.length + '/' + h.daftar.length, r.lengkap ? 'Lengkap' : r.belum.map(u => u.judul).join(', ')], warna: [null, null, null, r.lengkap ? HIJAU : MERAH, r.lengkap ? HIJAU : MERAH] });
      else baris.push({ sel: [String(no), r.s.nama, r.kelas, r.lengkap ? 'Sudah ikut' : 'Belum ikut', r.rec && r.rec.nilai !== '' && r.rec.nilai != null ? String(r.rec.nilai) : '-', r.rec ? tglTeks(r.rec.selesai) : '-'], warna: [null, null, null, r.lengkap ? HIJAU : MERAH, null, null] });
    });
    return { cols, baris, banyakKelas };
  }
  async function unduhPdf() {
    const h = hitung();
    if (!h) { toast('Data belum selesai dimuat. Tunggu sebentar lalu coba lagi.', 'error'); return; }
    if (!h.rows.length) { toast('Tidak ada siswa pada pilihan ini untuk diunduh.', 'error'); return; }
    try { await muatPustaka_('jspdf'); } catch (e) { toast('Pustaka PDF tidak dapat dimuat. Memakai jendela cetak: pilih "Simpan sebagai PDF".', 'info'); cetakCadangan(h); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210, H = 297, M = 14, ISI = W - 2 * M, LH = 4.3, PAD = 1.6;
    const { namaSekolah } = Guru._identitasSekolah_();
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const teks = (s, x, y, o) => doc.text(pdfTeks(s), x, y, o);
    let y = M;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(31, 42, 55); teks(namaSekolah, M, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(108, 117, 125); teks('Sistem Ujian Online (CBT)', M, y + 9);
    doc.setDrawColor(29, 79, 140); doc.setLineWidth(0.6); doc.line(M, y + 12, W - M, y + 12);
    y += 19;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(31, 42, 55); teks('Rekap Keikutsertaan Simulasi', M, y); y += 6;
    const info = [['Simulasi', h.judul], ['Kelas', h.kelasLabel], ['Ditampilkan', h.statusLabel + ' (' + h.rows.length + ' dari ' + h.total + ' siswa)'], ['Tanggal cetak', waktu]];
    doc.setFontSize(9);
    info.forEach(([k, v]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(31, 42, 55); teks(k, M, y);
      doc.setFont('helvetica', 'normal'); const ls = doc.splitTextToSize(pdfTeks(': ' + v), ISI - 30);
      doc.text(ls, M + 30, y); y += LH * ls.length;
    });
    y += 1.5;
    const L = labelStat(h);
    doc.setFillColor(243, 247, 253); doc.setDrawColor(222, 226, 230); doc.setLineWidth(0.2); doc.roundedRect(M, y, ISI, 9, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(31, 42, 55);
    teks('Jumlah siswa: ' + h.total + '   |   ' + L.sudah + ': ' + h.sudah + '   |   ' + L.belum + ': ' + h.belum + (h.semua ? '   |   Belum ikut sama sekali: ' + h.nol : '') + '   |   ' + pct(h.sudah, h.total) + '%', M + 3, y + 5.8);
    y += 14;

    const gambarTabel = (cols, baris, mulaiY) => {
      let yy = mulaiY;
      const kepala = () => {
        doc.setFillColor(29, 79, 140); doc.rect(M, yy, ISI, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
        let x = M; cols.forEach(c => { c.x = x; teks(c.t, c.a === 'c' ? x + c.w / 2 : x + PAD, yy + 4.7, { align: c.a === 'c' ? 'center' : 'left' }); x += c.w; });
        yy += 7;
      };
      kepala();
      baris.forEach((b, i) => {
        if (b.grup) {
          if (yy + 7 + 12 > H - 16) { doc.addPage(); yy = M; kepala(); }
          doc.setFillColor(226, 234, 246); doc.rect(M, yy, ISI, 6.4, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8); doc.setTextColor(29, 79, 140); teks(b.grup, M + PAD, yy + 4.5); yy += 6.4; return;
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lines = b.sel.map((v, ci) => doc.splitTextToSize(pdfTeks(v), cols[ci].w - 2 * PAD));
        const n = Math.max.apply(null, lines.map(l => l.length));
        const tinggi = n * LH + 2 * PAD - 0.6;
        if (yy + tinggi > H - 16) { doc.addPage(); yy = M; kepala(); }
        if (i % 2) { doc.setFillColor(249, 250, 252); doc.rect(M, yy, ISI, tinggi, 'F'); }
        doc.setDrawColor(222, 226, 230); doc.setLineWidth(0.15); doc.line(M, yy + tinggi, M + ISI, yy + tinggi);
        lines.forEach((ls, ci) => {
          const c = cols[ci], w = b.warna && b.warna[ci];
          doc.setFont('helvetica', w ? 'bold' : 'normal'); const wr = w || [31, 42, 55]; doc.setTextColor(wr[0], wr[1], wr[2]);
          ls.forEach((ln, li) => doc.text(ln, c.a === 'c' ? c.x + c.w / 2 : c.x + PAD, yy + PAD + 2.9 + li * LH, { align: c.a === 'c' ? 'center' : 'left' }));
        });
        yy += tinggi;
      });
      return yy;
    };
    const P = rowsPdf(h);
    // ringkasan per kelas (hanya bila semua kelas)
    if (!R.kelas && h.perKelas.length > 1) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(31, 42, 55); teks('Ringkasan per Kelas', M, y); y += 2.5;
      const kc = [{ t: 'Kelas', w: 40 }, { t: 'Siswa', w: 24, a: 'c' }, { t: L.sudah, w: 42, a: 'c' }, { t: L.belum, w: 42, a: 'c' }, { t: 'Partisipasi', w: 34, a: 'c' }];
      const kb = h.perKelas.map(k => ({ sel: [k.kelas, String(k.jml), String(k.sudah), String(k.jml - k.sudah), pct(k.sudah, k.jml) + '%'] }));
      y = gambarTabel(kc, kb, y) + 8;
      if (y > H - 50) { doc.addPage(); y = M; }
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(31, 42, 55); teks('Daftar Siswa - ' + h.statusLabel, M, y); y += 2.5;
    gambarTabel(P.cols, P.baris, y);
    const hal = doc.getNumberOfPages();
    for (let i = 1; i <= hal; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(108, 117, 125);
      teks('Dicetak dari ' + namaSekolah + ' - ' + waktu, M, H - 8); teks('Halaman ' + i + ' dari ' + hal, W - M, H - 8, { align: 'right' });
    }
    const nm = ['rekap', { belum: 'belum-ikut', sudah: 'sudah-ikut', semua: 'semua-siswa' }[R.status], h.semua ? 'semua-simulasi' : bersih(h.judul), R.kelas ? 'kelas-' + bersih(R.kelas) : 'semua-kelas'].join('-');
    doc.save(nm + '.pdf');
    toast('PDF rekap ' + h.rows.length + ' siswa berhasil diunduh.', 'success');
  }
  // cadangan bila jsPDF tidak bisa dimuat: jendela cetak browser (pilih "Simpan sebagai PDF")
  function cetakCadangan(h) {
    const { namaSekolah, kop } = Guru._identitasSekolah_();
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const P = rowsPdf(h);
    const kepala = '<tr>' + P.cols.map(c => `<th>${esc(c.t)}</th>`).join('') + '</tr>';
    const isi = P.baris.map(b => b.grup ? `<tr><td colspan="${P.cols.length}" class="pg-l" style="background:#e2eaf6;font-weight:bold">${esc(b.grup)}</td></tr>`
      : '<tr>' + b.sel.map((v, i) => `<td${P.cols[i].a === 'c' ? '' : ' class="pg-l"'}>${esc(v)}</td>`).join('') + '</tr>').join('');
    const html = `${kop}<h2 class="cp-judul">Rekap Keikutsertaan Simulasi</h2>
      <table class="cp-info"><tbody><tr><th>Simulasi</th><td>: ${esc(h.judul)}</td><th>Kelas</th><td>: ${esc(h.kelasLabel)}</td></tr><tr><th>Ditampilkan</th><td>: ${esc(h.statusLabel)} (${h.rows.length} dari ${h.total} siswa)</td><th>Tanggal</th><td>: ${esc(waktu)}</td></tr></tbody></table>
      <table class="pg-print"><thead>${kepala}</thead><tbody>${isi}</tbody></table>
      <footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`;
    Guru._cetakArea_(html, ['Rekap Keikutsertaan', h.semua ? 'Semua Simulasi' : h.judul, R.kelas || 'Semua Kelas'].join(' - '));
  }

  const buka = () => { if (!R.dimuat || Date.now() - R.waktu > 60000) muat(null, !R.dimuat || Date.now() - R.waktu > 60000); else render(); };
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) { _gantiTab.call(UI, tabId); if (tabId === 'tab-rekap-ikut') buka(); };

  return { buka, muat, render, pilihUjian, pilihKelas, pilihStatus, unduhPdf };
})();
