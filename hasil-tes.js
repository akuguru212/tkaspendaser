/* ============================================================================
   HASIL LITERASI & NUMERASI (Portal Guru) — setara "Hasil Survei", tetapi untuk tes.
   Per ujian: nilai tiap siswa, penguasaan tiap MATERI (kolom Topik pada soal) -> materi yang kurang & yang sudah baik,
   serta DETAIL JAWABAN per soal (dikelompokkan per materi).
   PDF  : satu siswa (di jendela detail) | satu kelas | seluruh siswa. Dibuat lewat dialog Cetak -> "Simpan sebagai PDF"
          (sama seperti Cetak Detail Kelas di Rekap Nilai) supaya rumus & gambar soal ikut tampil.
   Data : getAnalisisMateri (ujianId) untuk status tiap soal + getDetailJawabanBanyak (banyak sesi sekaligus; bila Code.gs lama
          belum di-deploy ulang otomatis kembali ke getDetailJawaban satu per satu).
   v3   : PDF/ZIP per kelas lebih cepat (permintaan massal), ZIP satu PDF per siswa, tabel rata-rata per SUB MATERI, tombol
          "Kelompok Remedial" (daftar remedial per materi + kelompok belajar, bisa dicetak).
   Ambang: < 60% kurang, 60-79% cukup, >= 80% baik. Bila ujian dikerjakan lebih dari sekali dipakai percobaan terakhir.
   Dimuat SETELAH app.js, survei.js, analisis-materi.js.
   ============================================================================ */
'use strict';
const HasilTes = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const bulat = (n) => Math.round(Number(n) || 0);
  const TH_KURANG = 60, TH_BAIK = 80;
  const lv = (p) => p < TH_KURANG ? 'kurang' : (p < TH_BAIK ? 'cukup' : 'baik');
  const LAB = { kurang: 'Perlu diperkuat', cukup: 'Cukup', baik: 'Sudah baik' };
  const G = { daftar: [], ujianId: '', judul: '', jenis: '', soalLabel: {}, soalSub: {}, materi: [], rows: [], subDaftar: [], cache: new Map(), memuat: false, sibuk: false, tanpaBatch: false };
  const SEP = '\u0001';
  const D = { idx: -1, daftar: [], items: [], filter: 'salah', token: 0 };

  (function () {
    if (document.getElementById('hasil-tes-css')) return;
    const st = document.createElement('style'); st.id = 'hasil-tes-css';
    st.textContent = `
#tab-hasil-tes .ht-chip, #modal-ht-detail .ht-chip, #modal-ht-remedial .ht-chip { display:inline-block; min-width:44px; text-align:center; padding:.12rem .5rem; border-radius:999px; font-size:.78rem; font-weight:700; }
#tab-hasil-tes .ht-chip.kurang, #modal-ht-detail .ht-chip.kurang, #modal-ht-remedial .ht-chip.kurang { background: color-mix(in srgb, #d6455d 16%, #fff); color:#a8283d; }
#tab-hasil-tes .ht-chip.cukup, #modal-ht-detail .ht-chip.cukup, #modal-ht-remedial .ht-chip.cukup { background: color-mix(in srgb, #dc8f12 20%, #fff); color:#8a5a00; }
#tab-hasil-tes .ht-chip.baik, #modal-ht-detail .ht-chip.baik, #modal-ht-remedial .ht-chip.baik { background: color-mix(in srgb, #229a66 16%, #fff); color:#14693d; }
#tab-hasil-tes .ht-chip.na { background:#eef0f2; color:#777; }
#modal-ht-detail .modal { max-width: 920px; }
#modal-ht-remedial .modal { max-width: 980px; }
#modal-ht-remedial .ht-isi { max-height: 62vh; overflow:auto; padding-right:.2rem; }
#modal-ht-remedial .ht-ctl { display:flex; flex-wrap:wrap; gap:.6rem 1rem; align-items:center; margin:.4rem 0 .6rem; font-size:.84rem; }
#modal-ht-remedial .ht-ctl select { width:auto; }
#modal-ht-remedial h4.ht-kelas { margin:1rem 0 .4rem; padding:.35rem .6rem; border-left:5px solid var(--c-primary,#0d6efd); background:color-mix(in srgb, var(--c-primary,#0d6efd) 7%, var(--c-surface,#fff)); border-radius:6px; font-size:.95rem; }
#modal-ht-remedial .ht-gr { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:.6rem; margin:.4rem 0; }
#modal-ht-remedial .ht-kotak { border:1px solid var(--c-line,#dee2e6); border-radius:12px; padding:.6rem .8rem; background:var(--c-surface,#fff); }
#modal-ht-remedial .ht-kotak h5 { margin:0 0 .3rem; font-size:.88rem; }
#modal-ht-remedial .ht-baris { display:flex; justify-content:space-between; gap:.6rem; align-items:center; padding:.18rem 0; font-size:.83rem; border-bottom:1px dashed var(--c-line,#dee2e6); }
#modal-ht-remedial .ht-baris:last-child { border-bottom:0; }
#modal-ht-remedial .ht-tutor { margin-top:.35rem; font-size:.78rem; color:#14693d; }
#tab-hasil-tes .ht-subtbl td, #tab-hasil-tes .ht-subtbl th { font-size:.82rem; }
#tab-hasil-tes .ht-sublemah { margin:.4rem 0 .2rem; font-size:.84rem; }
#modal-ht-detail .ht-isi { max-height: 66vh; overflow:auto; padding-right:.2rem; }
#modal-ht-detail .ht-2k { display:grid; grid-template-columns:1fr 1fr; gap:.7rem; margin:.5rem 0; }
@media (max-width:700px){ #modal-ht-detail .ht-2k { grid-template-columns:1fr; } }
#modal-ht-detail .ht-kotak { border:1px solid var(--c-line,#dee2e6); border-radius:12px; padding:.6rem .8rem; background:var(--c-surface,#fff); }
#modal-ht-detail .ht-kotak h4 { margin:0 0 .35rem; font-size:.9rem; }
#modal-ht-detail .ht-baris { display:flex; justify-content:space-between; gap:.6rem; align-items:center; padding:.2rem 0; font-size:.84rem; border-bottom:1px dashed var(--c-line,#dee2e6); }
#modal-ht-detail .ht-baris:last-child { border-bottom:0; }
#modal-ht-detail .ht-grup { margin:.9rem 0 .3rem; padding:.35rem .6rem; border-left:5px solid #999; background:color-mix(in srgb, var(--c-primary,#0d6efd) 6%, var(--c-surface,#fff)); border-radius:6px; font-weight:700; font-size:.9rem; display:flex; justify-content:space-between; gap:.5rem; }
#modal-ht-detail .ht-sub, #cetak-area .ht-sub { display:block; font-weight:500; font-size:.72rem; color:#6c757d; margin-top:1px; }
#modal-ht-detail .ht-nomor { font-size:.72rem; color:#6c757d; margin:-1px 0 3px; }
#modal-ht-detail .ht-grup.kurang { border-left-color:#d6455d; } #modal-ht-detail .ht-grup.cukup { border-left-color:#dc8f12; } #modal-ht-detail .ht-grup.baik { border-left-color:#229a66; }
@media print {
  #cetak-area .ht-tabel { width:100%; border-collapse:collapse; font-size:9pt; margin:3px 0 5px; }
  #cetak-area .ht-tabel th { padding:2px 5px; background:#e9edf2 !important; border:1px solid #9aa1ab; text-align:left; }
  #cetak-area .ht-tabel td { padding:2px 5px; border:1px solid #c9ced6; }
  #cetak-area .ht-tabel tr { break-inside:avoid; }
  #cetak-area .ht-kurang { background:#fdecec !important; color:#a8283d; font-weight:700; text-align:center; }
  #cetak-area .ht-cukup { background:#fff4dc !important; color:#8a5a00; font-weight:700; text-align:center; }
  #cetak-area .ht-baik { background:#e3f4ea !important; color:#14693d; font-weight:700; text-align:center; }
  #cetak-area .ht-ket { margin:2px 0; font-size:9pt; }
  #cetak-area .ht-grup { margin:7px 0 3px; padding:2px 6px; border-left:4px solid #1f4e79; background:#eef2f7 !important; font-weight:700; font-size:9.5pt; break-after:avoid; }
}`;
    document.head.appendChild(st);
  })();

  const jenisDari = (u) => { try { return AnalisisMateri.jenisDari(u); } catch (e) { return 'lainnya'; } };
  const NAMA = { literasi: 'Literasi', numerasi: 'Numerasi', lainnya: 'Lainnya' };

  // ---------------- daftar ujian ----------------
  async function muatDaftar() {
    const sel = $('ht-ujian'); if (!sel) return;
    const lama = sel.value;
    const res = await api('getDaftarUjian', { guruId: state.user.id });
    if (!res || !res.ok) return;
    const urut = { literasi: 0, numerasi: 1, lainnya: 2 };
    // PERBAIKAN: ujian yang memakai "Survei Setelah Ujian" (Otomatis/Karakter/Sulingjar) TETAP ditampilkan di sini.
    // Dulu ujian berjudul "Numerasi ..."/"Literasi ..." dengan survei Otomatis dianggap survei lalu disaring keluar,
    // padahal nilai tes & materinya tetap perlu dilihat. Hasil surveinya tetap ada di menu Hasil Survei.
    G.daftar = (res.data || [])
      .map(u => Object.assign({}, u, { _j: jenisDari(u) }))
      .sort((a, b) => urut[a._j] - urut[b._j] || String(a.judul).localeCompare(String(b.judul), 'id', { numeric: true }));
    sel.innerHTML = '<option value="">Pilih ujian Literasi / Numerasi...</option>' + G.daftar.map(u => `<option value="${esc(u.id)}">${esc(u.judul)} — ${esc(NAMA[u._j])}</option>`).join('');
    if (lama && G.daftar.some(u => u.id === lama)) sel.value = lama;
    if (!G.daftar.length) $('ht-tabel').innerHTML = '<p class="subtitle">Belum ada ujian.</p>';
  }

  // ---------------- olah data ----------------
  function olah(res) {
    const u = (res.ujian || [])[0];
    G.soalLabel = {}; G.soalSub = {}; G.materi = []; G.rows = [];
    if (!u) return;
    const urutMateri = [];
    u.soal.forEach(so => { const lb = so.t || so.s || '(tanpa topik)'; G.soalLabel[so.id] = lb; G.soalSub[so.id] = (so.t && so.s && so.s !== so.t) ? so.s : ''; if (urutMateri.indexOf(lb) < 0) urutMateri.push(lb); });
    G.materi = urutMateri;
    // daftar sub materi (hanya untuk materi yang punya sub materi), urut sesuai urutan soal
    G.subDaftar = [];
    const adaSub = new Set(); u.soal.forEach(so => { if (!so.x && G.soalSub[so.id]) adaSub.add(G.soalLabel[so.id]); });
    const petaSubD = new Map();
    u.soal.forEach(so => { if (so.x || !adaSub.has(G.soalLabel[so.id])) return; const sb = G.soalSub[so.id] || ''; const k = G.soalLabel[so.id] + SEP + sb; let d = petaSubD.get(k); if (!d) { d = { key: k, lb: G.soalLabel[so.id], sub: sb, nSoal: 0 }; petaSubD.set(k, d); G.subDaftar.push(d); } d.nSoal++; });
    const terbaru = new Map();
    (res.sesi || []).forEach(s => { const w = Date.parse(s.sl) || 0, p = terbaru.get(s.si); if (!p || w >= p._w) { s._w = w; terbaru.set(s.si, s); } });
    terbaru.forEach(s => {
      const per = new Map(), subAgg = new Map(); let b = 0, p = 0, sl = 0, k = 0;
      u.soal.forEach((so, ix) => {
        const c = String(s.r || '').charAt(ix);
        if (!c || c === 'n' || c === 'm' || so.x) return;
        const lb = G.soalLabel[so.id];
        let T = per.get(lb); if (!T) { T = { label: lb, got: 0, max: 0, n: 0, benar: 0 }; per.set(lb, T); }
        const w = so.w > 0 ? so.w : 1; T.max += w; T.n++;
        if (c === 'b') { T.got += w; T.benar++; b++; } else if (c === 'p') { T.got += w * .5; p++; } else if (c === 's') sl++; else if (c === 'k') k++;
        const kS = lb + SEP + (G.soalSub[so.id] || '');
        if (petaSubD.has(kS)) { let S = subAgg.get(kS); if (!S) { S = { got: 0, max: 0, n: 0, benar: 0 }; subAgg.set(kS, S); } S.max += w; S.n++; if (c === 'b') { S.got += w; S.benar++; } else if (c === 'p') S.got += w * .5; }
      });
      const top = [...per.values()].map(T => { T.persen = T.max ? T.got / T.max * 100 : 0; T.level = lv(T.persen); return T; });
      const peta = {}; top.forEach(T => { peta[T.label] = T; });
      const subPeta = {}; subAgg.forEach((S, kS) => { const pr = S.max ? S.got / S.max * 100 : 0; subPeta[kS] = { persen: pr, n: S.n, benar: S.benar, level: lv(pr) }; });
      G.rows.push({ sesiId: s.id, id: s.si, nama: s.nm, kelas: s.kl || '-', nilai: Number(s.nl) || 0, selesai: s.sl, top, peta, subPeta, benar: b, sebagian: p, salah: sl, kosong: k,
        kurang: top.filter(T => T.level === 'kurang').sort((a, c) => a.persen - c.persen), cukup: top.filter(T => T.level === 'cukup'), baik: top.filter(T => T.level === 'baik').sort((a, c) => c.persen - a.persen) });
    });
    G.rows.sort((a, c) => String(a.kelas).localeCompare(String(c.kelas), 'id', { numeric: true }) || String(a.nama).localeCompare(String(c.nama), 'id', { sensitivity: 'base' }));
  }

  async function muat() {
    const id = $('ht-ujian').value; const cont = $('ht-tabel');
    if (!id) { cont.innerHTML = 'Pilih ujian terlebih dahulu.'; $('ht-ringkas').innerHTML = ''; return false; }
    if (G.memuat) return false; G.memuat = true;
    cont.innerHTML = '<p class="subtitle">Memuat hasil...</p>';
    try {
      const res = await api('getAnalisisMateri', { guruId: state.user.id, ujianId: id });
      if (!res || !res.ok) throw new Error((res && res.error) || 'Gagal memuat.');
      G.ujianId = id; G.cache = new Map(); G.tanpaBatch = false;
      const u = G.daftar.find(x => x.id === id) || {}; G.judul = u.judul || ''; G.jenis = u._j || '';
      olah(res);
      const kl = Array.from(new Set(G.rows.map(r => r.kelas))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
      const sk = $('ht-kelas'), lama = sk.value;
      sk.innerHTML = '<option value="">Semua Kelas</option>' + kl.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
      if (kl.indexOf(lama) >= 0) sk.value = lama;
      render();
      return true;
    } catch (e) {
      cont.innerHTML = `<p class="subtitle" style="color:var(--c-danger)">${esc((e && e.message) || 'Gagal memuat.')}</p>`;
      return false;
    } finally { G.memuat = false; }
  }

  function saring(abaikanCari) {
    const kls = $('ht-kelas').value, q = abaikanCari ? '' : ($('ht-cari').value || '').toLowerCase().trim(), sr = abaikanCari ? '' : $('ht-saring').value;
    return G.rows.filter(r => (!kls || r.kelas === kls) && (!q || String(r.nama).toLowerCase().indexOf(q) >= 0) && (sr !== 'kurang' || r.kurang.length));
  }
  const rata = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const f1 = (n) => n == null ? '-' : (Math.round(n * 10) / 10).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const chipM = (T) => T ? `<span class="ht-chip ${T.level}" title="${esc(T.label)}: ${bulat(T.persen)}% (${T.benar}/${T.n} benar)">${bulat(T.persen)}%</span>` : '<span class="ht-chip na">–</span>';

  // ---------------- rata-rata per SUB MATERI ----------------
  const chipP = (p, judul) => `<span class="ht-chip ${lv(p)}" title="${esc(judul || '')}">${bulat(p)}%</span>`;
  function hitungSub(rows, kelasList) {
    return G.subDaftar.map(d => {
      const v = rows.map(r => ({ r, x: r.subPeta[d.key] })).filter(a => a.x);
      const kelas = {}; kelasList.forEach(k => { const w = v.filter(a => a.r.kelas === k).map(a => a.x.persen); kelas[k] = w.length ? rata(w) : null; });
      return { lb: d.lb, sub: d.sub, nSoal: d.nSoal, p: v.length ? rata(v.map(a => a.x.persen)) : null, kelas, n: v.length, nKurang: v.filter(a => a.x.level === 'kurang').length };
    });
  }
  function htmlSubMateri(rows, kelasList) {
    if (!G.subDaftar.length) return '';
    const data = hitungSub(rows, kelasList).filter(x => x.p !== null); if (!data.length) return '';
    const multi = kelasList.length > 1;
    const th = multi ? kelasList.map(k => `<th>${esc(k)}</th>`).join('') : '';
    const br = data.map(x => `<tr><td>${esc(x.lb)}</td><td>${esc(x.sub || '(tanpa sub materi)')}</td><td>${x.nSoal}</td><td>${chipP(x.p, x.lb + (x.sub ? ' › ' + x.sub : ''))}</td>${multi ? kelasList.map(k => `<td>${x.kelas[k] != null ? chipP(x.kelas[k]) : '–'}</td>`).join('') : ''}<td>${x.nKurang} / ${x.n}</td></tr>`).join('');
    const lemah = data.filter(x => x.p < TH_BAIK).sort((a, b) => a.p - b.p).slice(0, 5);
    const ket = lemah.length ? `<p class="ht-sublemah"><b>Sub materi yang paling perlu diperkuat:</b> ${lemah.map(x => esc(x.lb + (x.sub ? ' › ' + x.sub : '')) + ' (' + bulat(x.p) + '%)').join('; ')}.</p>` : '<p class="ht-sublemah"><b>Semua sub materi rata-rata sudah baik (≥ 80%).</b></p>';
    return `<div class="sv-kelas"><b>Rata-rata per sub materi</b><div class="table-wrap"><table class="data-table ht-subtbl"><thead><tr><th>Materi</th><th>Sub materi</th><th>Soal</th><th>Semua</th>${th}<th>Siswa kurang</th></tr></thead><tbody>${br}</tbody></table></div>${ket}</div>`;
  }

  function render() {
    const cont = $('ht-tabel'), ring = $('ht-ringkas'); if (!G.ujianId) return;
    const rows = saring();
    if (!rows.length) { ring.innerHTML = ''; cont.innerHTML = '<p class="subtitle">Belum ada siswa yang selesai mengerjakan ujian ini pada filter ini.</p>'; return; }
    const nm = rows.map(r => r.nilai);
    const stat = G.materi.map(lb => { const v = rows.map(r => r.peta[lb]).filter(Boolean); const p = rata(v.map(T => T.persen)); return { lb, p, nKurang: v.filter(T => T.level === 'kurang').length, n: v.length }; }).filter(x => x.p !== null);
    const kartu = stat.map(x => { const l = lv(x.p); const w = l === 'kurang' ? '#d6455d' : (l === 'cukup' ? '#dc8f12' : '#229a66'); return `<div class="sv-kartu"><div class="sv-kartu-t">${esc(x.lb)}</div><div class="sv-kartu-n" style="color:${w}">${bulat(x.p)}%</div><div class="sv-bar-b"><i style="width:${bulat(x.p)}%;background:${w}"></i></div><span class="sv-lencana" style="background:${w}22;color:${w}">${LAB[l]}</span><div style="font-size:.72rem;color:var(--c-muted);margin-top:.2rem">${x.nKurang} dari ${x.n} siswa kurang</div></div>`; }).join('');
    const lemah = stat.filter(x => x.p < TH_BAIK).sort((a, b) => a.p - b.p);
    const ev = lemah.length ? `<div class="sv-ev"><b>Evaluasi: ${lemah.length} materi perlu ditingkatkan</b> (urut dari terendah)<ol>${lemah.map(x => `<li><b>${esc(x.lb)}</b> — rata-rata ${bulat(x.p)}%, ${x.nKurang} siswa di bawah ${TH_KURANG}%</li>`).join('')}</ol></div>` : '<div class="sv-ev sv-ev-ok"><b>Evaluasi:</b> semua materi rata-rata sudah baik (≥ 80%).</div>';
    const kelasList = Array.from(new Set(rows.map(r => r.kelas)));
    let perKelas = '';
    if (kelasList.length > 1) {
      const th = stat.map(x => `<th title="${esc(x.lb)}">${esc(x.lb)}</th>`).join('');
      const br = kelasList.map(kl => { const sub = rows.filter(r => r.kelas === kl); return `<tr><td>${esc(kl)}</td><td>${sub.length}</td><td><b>${f1(rata(sub.map(r => r.nilai)))}</b></td>${stat.map(x => { const v = sub.map(r => r.peta[x.lb]).filter(Boolean); return `<td>${v.length ? chipM({ persen: rata(v.map(T => T.persen)), level: lv(rata(v.map(T => T.persen))), label: x.lb, benar: '-', n: '-' }) : '–'}</td>`; }).join('')}</tr>`; }).join('');
      perKelas = `<div class="sv-kelas"><b>Rata-rata per kelas</b><div class="table-wrap"><table class="data-table"><thead><tr><th>Kelas</th><th>Siswa</th><th>Nilai</th>${th}</tr></thead><tbody>${br}</tbody></table></div></div>`;
    }
    ring.innerHTML = `<div class="sv-info"><span><b>${rows.length}</b> siswa</span><span>Rata-rata nilai <b>${f1(rata(nm))}</b></span><span>Tertinggi <b>${f1(Math.max.apply(null, nm))}</b></span><span>Terendah <b>${f1(Math.min.apply(null, nm))}</b></span><span><b>${rows.filter(r => r.kurang.length).length}</b> siswa punya materi kurang</span></div><div class="sv-kartu-wrap">${kartu}</div>${ev}${perKelas}${htmlSubMateri(rows, kelasList)}<p class="subtitle" style="margin:.4rem 0">Penguasaan materi = skor diperoleh / skor maksimal soal pada materi itu. Kurang &lt; ${TH_KURANG}%, cukup ${TH_KURANG}–${TH_BAIK - 1}%, baik ≥ ${TH_BAIK}%.</p>`;
    const th = G.materi.map(lb => `<th title="${esc(lb)}">${esc(lb)}</th>`).join('');
    cont.innerHTML = `<div class="table-wrap dt-wrap"><table class="data-table dt-kartu"><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Nilai</th><th>Kategori</th><th>Benar / Salah / Kosong</th>${th}<th>Materi yang kurang</th><th>Materi yang sudah baik</th><th>Detail Jawaban</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td><a href="#" onclick="HasilTes.bukaDetail('${esc(String(r.sesiId))}');return false" title="Lihat detail jawaban">${esc(r.nama)}</a></td><td>${esc(r.kelas)}</td><td><b>${f1(r.nilai)}</b></td><td>${badgeKategori_(r.nilai)}</td><td>${r.benar} / ${r.salah + r.sebagian} / ${r.kosong}</td>${G.materi.map(lb => `<td>${chipM(r.peta[lb])}</td>`).join('')}<td>${r.kurang.length ? r.kurang.map(T => `<span class="am-tag kurang">${esc(T.label)} ${bulat(T.persen)}%</span>`).join(' ') : '–'}</td><td>${r.baik.length ? r.baik.map(T => `<span class="am-tag baik">${esc(T.label)} ${bulat(T.persen)}%</span>`).join(' ') : '–'}</td><td class="aksi"><button type="button" class="secondary small sv-aksi-btn" onclick="HasilTes.bukaDetail('${esc(String(r.sesiId))}')">🔍 Detail</button></td></tr>`).join('')}</tbody></table></div>`;
    try { const t = cont.querySelector('table.dt-kartu'); const lab = Array.from(t.querySelectorAll('thead th')).map(h => h.textContent.trim()); t.querySelectorAll('tbody tr').forEach(tr => Array.from(tr.children).forEach((td, i) => { if (lab[i] !== undefined) td.setAttribute('data-label', lab[i]); })); } catch (e) { }
  }

  // ---------------- detail jawaban ----------------
  async function ambilItems(sesiId) {
    if (G.cache.has(sesiId)) return G.cache.get(sesiId);
    const res = await api('getDetailJawaban', { sesiId, guruId: state.user ? state.user.id : '' });
    if (!res || !res.ok) throw new Error((res && res.error) || 'Gagal memuat detail jawaban.');
    const it = res.items || []; G.cache.set(sesiId, it); return it;
  }
  // Ambil detail banyak siswa sekaligus: 10 sesi per permintaan, 3 permintaan paralel. Bila Code.gs belum di-deploy ulang
  // (aksi belum dikenal) atau sebuah sesi gagal, otomatis kembali ke permintaan satu per satu.
  async function ambilBanyak(rows, info, teks) {
    const hasil = new Array(rows.length).fill(null), perlu = [];
    rows.forEach((r, i) => { if (G.cache.has(r.sesiId)) hasil[i] = G.cache.get(r.sesiId); else perlu.push(i); });
    let selesai = rows.length - perlu.length;
    const lapor = () => { if (info) info.textContent = `${teks || 'Mengambil detail jawaban'} ${selesai}/${rows.length}...`; };
    lapor();
    const potong = []; for (let i = 0; i < perlu.length; i += 10) potong.push(perlu.slice(i, i + 10));
    let giliran = 0;
    const satuan = async (i) => { try { hasil[i] = await ambilItems(rows[i].sesiId); } catch (e) { hasil[i] = null; } selesai++; lapor(); };
    const kerja = async () => {
      while (giliran < potong.length) {
        const idxs = potong[giliran++];
        if (!G.tanpaBatch) {
          let res = null;
          try { res = await api('getDetailJawabanBanyak', { guruId: state.user.id, sesiIds: JSON.stringify(idxs.map(i => String(rows[i].sesiId))) }); } catch (e) { res = null; }
          if (res && res.ok && Array.isArray(res.hasil)) {
            const peta = {}; res.hasil.forEach(h => { peta[String(h.sesiId)] = h; });
            for (const i of idxs) {
              const h = peta[String(rows[i].sesiId)];
              if (h && h.ok) { const it = h.items || []; G.cache.set(rows[i].sesiId, it); hasil[i] = it; selesai++; lapor(); } else await satuan(i);
            }
            continue;
          }
          if (res && /tidak dikenal/i.test(String(res.error || ''))) G.tanpaBatch = true;
        }
        for (const i of idxs) await satuan(i);
      }
    };
    await Promise.all([kerja(), kerja(), kerja()]);
    return hasil;
  }
  const labelItem = (it) => G.soalLabel[it.id] || '(tanpa topik)';
  const hit = (items, s) => items.filter(i => i.status === s).length;

  function pastikanModal() {
    if ($('modal-ht-detail')) return;
    const m = document.createElement('div'); m.id = 'modal-ht-detail'; m.className = 'modal-backdrop hidden';
    m.onclick = (e) => { if (e.target === m) tutup(); };
    m.innerHTML = `<div class="modal modal-wide dsw-modal am-scope"><div class="dsw-head"><div><p class="dsw-eyebrow">Detail Hasil Siswa</p><h3 id="ht-d-nama" style="margin:0">-</h3><p class="subtitle" id="ht-d-meta" style="margin:.2rem 0 0"></p></div></div>
      <div class="ht-isi" id="ht-d-isi"></div>
      <div class="modal-close-row dsw-aksi"><button type="button" class="secondary" id="ht-d-prev" onclick="HasilTes.pindah(-1)"><i class="fa-solid fa-arrow-left"></i> Sebelumnya</button><span class="dsw-posisi" id="ht-d-pos"></span><button type="button" class="secondary" id="ht-d-next" onclick="HasilTes.pindah(1)">Berikutnya <i class="fa-solid fa-arrow-right"></i></button><button type="button" class="secondary" onclick="HasilTes.cetakSatu()" title="Cetak atau simpan PDF siswa ini"><i class="fa-solid fa-file-pdf"></i> PDF Siswa Ini</button><button type="button" onclick="HasilTes.tutup()">Tutup</button></div></div>`;
    document.body.appendChild(m);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.classList.contains('hidden')) tutup(); });
  }
  function tutup() { D.token++; const m = $('modal-ht-detail'); if (m) m.classList.add('hidden'); }

  function ringkasHtml(r, items) {
    const kotak = (judul, arr, kls) => `<div class="ht-kotak"><h4>${judul}</h4>${arr.length ? arr.map(T => `<div class="ht-baris"><span>${esc(T.label)}</span><span class="ht-chip ${kls || T.level}">${bulat(T.persen)}% · ${T.benar}/${T.n}</span></div>${nomorMateri(items, T.label) ? `<div class="ht-nomor">No. soal belum benar: ${nomorMateri(items, T.label)}</div>` : ''}`).join('') : '<span class="subtitle">–</span>'}</div>`;
    const c = (n, t) => n ? `<span class="dsw-chip"><strong>${n}</strong> ${t}</span>` : '';
    return `<div class="dsw-chips" style="display:flex;flex-wrap:wrap;gap:.4rem"><span class="dsw-chip">Nilai <strong>${f1(r.nilai)}</strong></span>${badgeKategori_(r.nilai)}${c(items.length, 'soal')}${c(hit(items, 'benar'), 'benar')}${c(hit(items, 'sebagian'), 'sebagian benar')}${c(hit(items, 'salah'), 'salah')}${c(hit(items, 'kosong'), 'tidak dijawab')}${c(hit(items, 'manual'), 'perlu dikoreksi')}</div>
      <div class="ht-2k">${kotak('⚠ Materi yang kurang (&lt; 60%)', r.kurang)}${kotak('✔ Materi yang sudah baik (≥ 80%)', r.baik)}</div>${r.cukup.length ? kotak('Materi cukup (60–79%)', r.cukup) : ''}`;
  }
  function kelompok(r, items, semua) {
    const urut = r.top.slice().sort((a, b) => a.persen - b.persen).map(T => T.label);
    G.materi.forEach(l => { if (urut.indexOf(l) < 0) urut.push(l); });
    const hasil = [];
    urut.forEach(lb => {
      const li = []; items.forEach((it, i) => { if (labelItem(it) === lb && (semua || it.status !== 'benar')) li.push({ it, no: i + 1 }); });
      if (li.length) { const subs = []; li.forEach(x => { const sb = G.soalSub[x.it.id]; if (sb && subs.indexOf(sb) < 0) subs.push(sb); }); hasil.push({ lb, T: r.peta[lb], li, subs, nomor: li.map(x => x.no) }); }
    });
    return hasil;
  }
  function isiDetail() {
    const r = D.daftar[D.idx]; if (!r) return;
    $('ht-d-nama').textContent = r.nama; $('ht-d-meta').textContent = ['Kelas ' + r.kelas, G.judul, r.selesai ? 'Selesai ' + formatTanggal(r.selesai) : ''].filter(Boolean).join(' • ');
    $('ht-d-pos').textContent = (D.idx + 1) + ' / ' + D.daftar.length;
    $('ht-d-prev').disabled = D.idx <= 0; $('ht-d-next').disabled = D.idx >= D.daftar.length - 1;
    const kotak = $('ht-d-isi'); const token = ++D.token;
    kotak.innerHTML = ringkasHtml(r, D.items = []) + '<p class="subtitle">Memuat detail jawaban...</p>';
    ambilItems(r.sesiId).then(items => {
      if (token !== D.token) return; D.items = items;
      D.filter = items.some(i => i.status !== 'benar') ? 'salah' : 'semua'; gambarItems(r);
    }).catch(e => { if (token === D.token) kotak.innerHTML = ringkasHtml(r, []) + `<p class="subtitle" style="color:var(--c-danger)">${esc(e.message)}</p>`; });
  }
  function gambarItems(r) {
    const items = D.items, semua = D.filter === 'semua';
    const grup = kelompok(r, items, semua);
    const nBelum = items.filter(i => i.status !== 'benar').length;
    const tab = `<div style="display:flex;gap:.4rem;margin:.6rem 0"><button type="button" class="secondary small${!semua ? ' active' : ''}" onclick="HasilTes.ubahFilter('salah')">Yang Salah / Belum Benar (${nBelum})</button><button type="button" class="secondary small${semua ? ' active' : ''}" onclick="HasilTes.ubahFilter('semua')">Semua Soal (${items.length})</button></div>`;
    const badan = grup.length ? grup.map(g => `<div class="ht-grup ${g.T ? g.T.level : ''}"><span>${esc(g.lb)}<small class="ht-sub">${g.subs.length ? 'Sub materi: ' + esc(g.subs.join('; ')) + ' · ' : ''}No. soal: ${g.nomor.join(', ')}</small></span><span>${g.T ? bulat(g.T.persen) + '% · ' + LAB[g.T.level] : ''}</span></div>` + g.li.map(x => ExamEngine.htmlItemDetail_(x.it, x.no, { guru: true })).join('')).join('') : '<div class="dj-kosong"><p>Semua jawaban siswa ini benar. Tidak ada soal yang perlu dievaluasi.</p></div>';
    const box = $('ht-d-isi'); box.innerHTML = ringkasHtml(r, items) + tab + badan; renderMatika(box);
  }
  function ubahFilter(f) { D.filter = f; gambarItems(D.daftar[D.idx]); }
  function bukaDetail(sesiId) {
    pastikanModal();
    D.daftar = saring(); D.idx = D.daftar.findIndex(r => String(r.sesiId) === String(sesiId));
    if (D.idx < 0) { D.daftar = G.rows; D.idx = D.daftar.findIndex(r => String(r.sesiId) === String(sesiId)); }
    if (D.idx < 0) return;
    $('modal-ht-detail').classList.remove('hidden'); isiDetail();
  }
  function pindah(a) { const n = D.idx + a; if (n < 0 || n >= D.daftar.length) return; D.idx = n; isiDetail(); $('ht-d-isi').scrollTop = 0; }

  // ---------------- PDF ----------------
  const nomorMateri = (items, lb) => items.map((it, i) => (labelItem(it) === lb && it.status !== 'benar') ? i + 1 : 0).filter(Boolean).join(', ');
  function htmlLembar(r, items, semua, opsi) {
    const nomorBelum = []; items.forEach((it, i) => { if (it.status !== 'benar') nomorBelum.push(i + 1); });
    const chip = (n, t) => n ? `<span class="cp-chip"><strong>${n}</strong> ${t}</span>` : '';
    const tb = r.top.slice().sort((a, b) => a.persen - b.persen).map(T => `<tr><td>${esc(T.label)}</td><td class="ht-${T.level}">${bulat(T.persen)}%</td><td>${LAB[T.level]}</td><td style="text-align:center">${T.benar} / ${T.n}</td><td style="text-align:center">${nomorMateri(items, T.label) || '-'}</td></tr>`).join('');
    const ket = `<p class="ht-ket"><b>Perlu diperkuat:</b> ${r.kurang.length ? r.kurang.map(T => esc(T.label) + ' (' + bulat(T.persen) + '%)').join('; ') : 'tidak ada.'}</p><p class="ht-ket"><b>Sudah baik:</b> ${r.baik.length ? r.baik.map(T => esc(T.label) + ' (' + bulat(T.persen) + '%)').join('; ') : 'belum ada.'}</p>`;
    const grup = kelompok(r, items, semua);
    const soal = r.top.length && !nomorBelum.length && !semua ? '<p class="cp-kosong">Semua jawaban siswa ini benar. Tidak ada soal yang perlu dievaluasi.</p>'
      : grup.map(g => `<div class="ht-grup">${esc(g.lb)}${g.T ? ' — ' + bulat(g.T.persen) + '% (' + LAB[g.T.level] + ')' : ''}<span class="ht-sub">${g.subs.length ? 'Sub materi: ' + esc(g.subs.join('; ')) + ' · ' : ''}No. soal: ${g.nomor.join(', ')}</span></div><section class="cp-soal">${g.li.map(x => ExamEngine.htmlItemDetail_(x.it, x.no, { guru: true })).join('')}</section>`).join('');
    const badan = `<div class="cp-ringkas">${chip(items.length, 'soal')}${chip(hit(items, 'benar'), 'benar')}${chip(hit(items, 'sebagian'), 'sebagian benar')}${chip(hit(items, 'salah'), 'salah')}${chip(hit(items, 'kosong'), 'tidak dijawab')}${chip(hit(items, 'manual'), 'perlu dikoreksi')}</div>
      <table class="ht-tabel"><thead><tr><th>Materi</th><th style="width:14%">Penguasaan</th><th style="width:18%">Status</th><th style="width:14%">Benar / Soal</th><th style="width:18%">No. soal belum benar</th></tr></thead><tbody>${tb}</tbody></table>${ket}
      <h3 class="cp-sub">${semua ? 'Seluruh Soal' : 'Soal yang Perlu Dievaluasi'} (per materi)</h3>${soal}`;
    const status = `<span class="cp-status">${esc(labelKategori_(r.nilai))}</span>`;
    if (opsi && opsi.kop) {
      return `${Guru._identitasSekolah_().kop}<h2 class="cp-judul">Laporan Hasil ${esc(NAMA[G.jenis] || 'Tes')} Siswa</h2>
      <table class="cp-info"><tbody><tr><th>Nama</th><td>: ${esc(r.nama)}</td><th>Nilai</th><td>: <strong class="cp-nilai">${f1(r.nilai)}</strong> ${status}</td></tr><tr><th>Kelas</th><td>: ${esc(r.kelas)}</td><th>Selesai</th><td>: ${r.selesai ? esc(formatTanggal(r.selesai)) : '-'}</td></tr><tr><th>Ujian</th><td colspan="3">: ${esc(G.judul)}</td></tr></tbody></table>${badan}`;
    }
    return `<article class="cp-siswa"><div class="cp-banner"><div><div class="cp-banner-nama">${esc(r.nama)}</div><div class="cp-banner-sub">Kelas ${esc(r.kelas)} • ${esc(G.judul)}</div></div><div class="cp-banner-nilai"><strong class="cp-nilai">${f1(r.nilai)}</strong> ${status}</div></div>${badan}</article>`;
  }
  async function cetakSatu() {
    const r = D.daftar[D.idx]; if (!r || !D.items.length) { toast('Detail jawaban belum selesai dimuat.', 'error'); return; }
    const { namaSekolah } = Guru._identitasSekolah_(); const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const semua = D.filter === 'semua';
    await Guru._cetakArea_(htmlLembar(r, D.items, semua, { kop: true }) + `<footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`, ['Hasil', G.judul, r.nama, r.kelas].filter(Boolean).join(' - '));
  }
  // Pilih siswa untuk PDF/ZIP banyak: 'kelas' = kelas yang dipilih pada filter, 'semua' = seluruh siswa. null bila tidak valid.
  function pilihBaris(mode) {
    if (!G.ujianId || !G.rows.length) { toast('Pilih ujian dan tunggu hasilnya tampil dulu.', 'error'); return null; }
    let rows, label = 'Seluruh Kelas';
    if (mode === 'kelas') { const kl = $('ht-kelas').value; if (!kl) { toast('Pilih dulu kelasnya pada filter kelas (bukan "Semua Kelas").', 'error'); return null; } label = 'Kelas ' + kl; rows = saring(true); }
    else rows = G.rows.slice();
    if (!rows.length) { toast('Tidak ada siswa pada pilihan ini.', 'error'); return null; }
    return { rows, label };
  }
  function htmlSubCetak(rows) {
    if (!G.subDaftar.length) return '';
    const kls = Array.from(new Set(rows.map(r => r.kelas))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const data = hitungSub(rows, kls).filter(x => x.p !== null); if (!data.length) return '';
    const multi = kls.length > 1;
    return `<h3 style="margin:10px 0 4px;font-size:10.5pt">Rata-rata penguasaan per sub materi</h3><table class="cp-daftar"><thead><tr><th>Materi</th><th>Sub materi</th><th class="cp-c">Soal</th><th class="cp-c">Semua</th>${multi ? kls.map(k => `<th class="cp-c">${esc(k)}</th>`).join('') : ''}<th class="cp-c">Siswa kurang</th></tr></thead><tbody>${data.map(x => `<tr><td>${esc(x.lb)}</td><td>${esc(x.sub || '(tanpa sub materi)')}</td><td class="cp-c">${x.nSoal}</td><td class="cp-c"><b>${bulat(x.p)}%</b></td>${multi ? kls.map(k => `<td class="cp-c">${x.kelas[k] != null ? bulat(x.kelas[k]) + '%' : '-'}</td>`).join('') : ''}<td class="cp-c">${x.nKurang} / ${x.n}</td></tr>`).join('')}</tbody></table>`;
  }
  async function cetakBanyak(mode) {
    const pil = pilihBaris(mode); if (!pil) return;
    const rows = pil.rows, label = pil.label;
    if (G.sibuk) return; G.sibuk = true;
    const info = $('ht-progres'); const semua = ($('ht-isi').value === 'semua');
    try {
      const hasil = await ambilBanyak(rows, info, 'Mengambil detail jawaban');
      const ok = rows.map((r, i) => ({ r, items: hasil[i] })).filter(x => x.items);
      const gagal = rows.filter((r, i) => !hasil[i]);
      if (!ok.length) { toast('Gagal mengambil detail jawaban. Coba lagi.', 'error'); return; }
      if (info) info.textContent = 'Menyusun PDF...'; await new Promise(r => setTimeout(r, 30));
      const { namaSekolah, kop } = Guru._identitasSekolah_(); const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
      const baris = ok.map((x, n) => `<tr><td class="cp-c">${n + 1}</td><td>${esc(x.r.nama)}</td><td class="cp-c">${esc(x.r.kelas)}</td><td class="cp-c"><b>${f1(x.r.nilai)}</b></td><td class="cp-c">${esc(labelKategori_(x.r.nilai))}</td><td>${x.r.kurang.length ? esc(x.r.kurang.map(T => T.label).join('; ')) : '-'}</td><td>${x.r.baik.length ? esc(x.r.baik.map(T => T.label).join('; ')) : '-'}</td></tr>`).join('');
      const kls = Array.from(new Set(ok.map(x => x.r.kelas)));
      const thM = G.materi.map(lb => `<th class="cp-c">${esc(lb)}</th>`).join('');
      const brK = kls.concat(kls.length > 1 ? ['__semua'] : []).map(kl => { const sub = ok.filter(x => kl === '__semua' || x.r.kelas === kl).map(x => x.r); return `<tr><td>${kl === '__semua' ? '<b>Semua kelas</b>' : esc(kl)}</td><td class="cp-c">${sub.length}</td><td class="cp-c"><b>${f1(rata(sub.map(r => r.nilai)))}</b></td>${G.materi.map(lb => { const v = sub.map(r => r.peta[lb]).filter(Boolean).map(T => T.persen); return `<td class="cp-c">${v.length ? bulat(rata(v)) + '%' : '-'}</td>`; }).join('')}</tr>`; }).join('');
      const cover = `<section class="cp-cover">${kop}<h2 class="cp-judul">Hasil ${esc(NAMA[G.jenis] || 'Tes')} Siswa — ${esc(label)}</h2><p class="cp-cover-ujian">${esc(G.judul)}</p>
        <p class="cp-cover-petunjuk">Cari nama pada daftar, lalu buka halaman bernama sama: di sana tertera materi yang kurang, materi yang sudah baik, dan ${semua ? 'seluruh soal' : 'soal yang belum benar'} beserta jawaban, kunci, dan pembahasan. Urutan daftar sama dengan urutan halaman.</p>
        <table class="cp-daftar"><thead><tr><th class="cp-c">No</th><th>Nama</th><th class="cp-c">Kelas</th><th class="cp-c">Nilai</th><th class="cp-c">Kategori</th><th>Materi kurang</th><th>Materi baik</th></tr></thead><tbody>${baris}</tbody></table>
        <h3 style="margin:10px 0 4px;font-size:10.5pt">Rata-rata penguasaan per materi</h3><table class="cp-daftar"><thead><tr><th>Kelas</th><th class="cp-c">Siswa</th><th class="cp-c">Nilai</th>${thM}</tr></thead><tbody>${brK}</tbody></table>
        ${htmlSubCetak(ok.map(x => x.r))}
        ${gagal.length ? `<p class="cp-evaluasi"><strong>Detail tidak dapat dimuat:</strong> ${gagal.map(r => esc(r.nama)).join(', ')}. Coba cetak ulang.</p>` : ''}
        <div class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></div></section>`;
      await Guru._cetakArea_(cover + ok.map(x => htmlLembar(x.r, x.items, semua, { kop: false })).join(''), ['Hasil', label, G.judul].filter(Boolean).join(' - '));
    } finally { G.sibuk = false; if (info) info.textContent = ''; }
  }

  // ---------------- ZIP: satu PDF per siswa ----------------
  // PDF dibuat langsung di browser (html2pdf + JSZip dari cdnjs, dimuat saat pertama dipakai). Hasilnya berupa gambar halaman
  // (teks tidak bisa diseleksi) dan gambar soal dari server lain mungkin tidak ikut bila servernya melarang pemakaian lintas situs.
  // Untuk PDF yang teksnya bisa diseleksi dan memuat semua gambar, pakai tombol PDF Detail (dialog Cetak).
  const _skrip = {};
  function muatSkrip(url, ada) {
    if (ada()) return Promise.resolve();
    if (_skrip[url]) return _skrip[url];
    return (_skrip[url] = new Promise((ok, gagal) => { const el = document.createElement('script'); el.src = url; el.onload = () => (ada() ? ok() : gagal(new Error('Pustaka tidak termuat.'))); el.onerror = () => { delete _skrip[url]; gagal(new Error('Tidak bisa memuat ' + url)); }; document.head.appendChild(el); }));
  }
  // Aturan cetak (@media print) tidak berlaku di layar; salin yang berkaitan dengan #cetak-area sebagai aturan layar sementara.
  function pasangGayaZip() {
    let css = '';
    try {
      Array.from(document.styleSheets).forEach(sh => {
        let aturan; try { aturan = sh.cssRules; } catch (e) { return; }
        Array.from(aturan || []).forEach(m => {
          if (!m.media || String(m.media.mediaText).indexOf('print') < 0) return;
          Array.from(m.cssRules || []).forEach(r => {
            if (!r.selectorText || r.selectorText.indexOf('#cetak-area') < 0) return;
            if (r.selectorText.indexOf('> *:not') >= 0) return;
            const sel = r.selectorText.split(',').map(x => x.trim().replace(/^body\.cetak-detail-siswa\s+/, '')).join(',');
            css += sel + '{' + r.style.cssText + '}\n';
          });
        });
      });
    } catch (e) { }
    css += '#cetak-area{display:block !important;position:static !important;width:182mm !important;max-width:182mm !important;background:#fff !important;color:#111 !important;font:10pt/1.42 "Segoe UI",Arial,Helvetica,sans-serif;}';
    const st = document.createElement('style'); st.id = 'ht-gaya-zip'; st.textContent = css; document.head.appendChild(st);
    return () => { st.remove(); };
  }
  async function pdfDariHtml(html, ukuranSkala) {
    const penampung = document.createElement('div'); penampung.style.cssText = 'position:fixed;left:-10000px;top:0;width:182mm;background:#fff';
    const area = document.createElement('div'); area.id = 'cetak-area'; area.innerHTML = html; penampung.appendChild(area);
    area.querySelectorAll('.opsi-item').forEach(it => { const tag = it.querySelector('.dj-tag'), isi = it.querySelector('.opsi-konten'); if (tag && isi) it.insertBefore(tag, isi); });
    document.body.appendChild(penampung);
    try {
      renderMatika(area);
      const gambar = Array.from(area.querySelectorAll('img')).filter(im => !im.complete).map(im => new Promise(r => { im.addEventListener('load', r); im.addEventListener('error', r); }));
      await Promise.race([Promise.all(gambar), new Promise(r => setTimeout(r, 6000))]);
      const opt = { margin: [13, 14, 16, 14], image: { type: 'jpeg', quality: 0.85 }, html2canvas: { scale: ukuranSkala || 1.6, useCORS: true, backgroundColor: '#ffffff', logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['.dj-card', 'tr', '.ht-grup', '.cp-banner', '.cp-chip'] } };
      return await window.html2pdf().set(opt).from(area).outputPdf('blob');
    } finally { penampung.remove(); }
  }
  const namaBerkas = (t) => String(t || '').replace(/[\\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'siswa';
  async function unduhZip(mode) {
    const pil = pilihBaris(mode); if (!pil) return;
    if (G.sibuk) return; G.sibuk = true;
    const rows = pil.rows, info = $('ht-progres'); const semua = ($('ht-isi').value === 'semua');
    let lepasGaya = null;
    try {
      if (info) info.textContent = 'Menyiapkan pustaka PDF...';
      await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', () => !!window.JSZip);
      await muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', () => !!window.html2pdf);
      const hasil = await ambilBanyak(rows, info, 'Mengambil detail jawaban');
      const ok = rows.map((r, i) => ({ r, items: hasil[i] })).filter(x => x.items);
      if (!ok.length) { toast('Gagal mengambil detail jawaban. Coba lagi.', 'error'); return; }
      lepasGaya = pasangGayaZip();
      const { namaSekolah } = Guru._identitasSekolah_(); const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
      const zip = new window.JSZip(), dipakai = new Set(); const gagalBuat = [];
      for (let n = 0; n < ok.length; n++) {
        const x = ok[n];
        if (info) info.textContent = `Membuat PDF ${n + 1}/${ok.length}: ${x.r.nama}...`;
        await new Promise(r => setTimeout(r, 20));
        try {
          const blob = await pdfDariHtml(htmlLembar(x.r, x.items, semua, { kop: true }) + `<footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`);
          let nm = namaBerkas((x.r.kelas && x.r.kelas !== '-' ? x.r.kelas + ' - ' : '') + x.r.nama), uji = nm, k = 2; while (dipakai.has(uji.toLowerCase())) uji = nm + ' (' + (k++) + ')';
          dipakai.add(uji.toLowerCase()); zip.file(uji + '.pdf', blob);
        } catch (e) { console.error(e); gagalBuat.push(x.r.nama); }
      }
      if (!dipakai.size) { toast('PDF gagal dibuat. Coba tombol PDF Detail (dialog Cetak).', 'error'); return; }
      if (info) info.textContent = 'Menyusun berkas ZIP...';
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(zipBlob); a.download = namaBerkas(['Hasil', pil.label, G.judul].filter(Boolean).join(' - ')) + '.zip';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      toast(`ZIP berisi ${dipakai.size} PDF diunduh.` + (gagalBuat.length ? ' Gagal: ' + gagalBuat.join(', ') + '.' : ''), gagalBuat.length ? 'error' : 'success');
    } catch (e) {
      console.error(e); toast('ZIP gagal dibuat: ' + ((e && e.message) || e) + '. Cek koneksi internet, atau pakai tombol PDF Detail.', 'error');
    } finally { if (lepasGaya) lepasGaya(); G.sibuk = false; if (info) info.textContent = ''; }
  }

  // ---------------- Kelompok remedial ----------------
  const R = { ukuran: 5, tutor: true };
  // Per kelas: (1) siswa remedial per materi, (2) kelompok belajar: tiap siswa dimasukkan ke SATU kelompok sesuai materi
  // terlemahnya, lalu dibagi rata menjadi kelompok berukuran <= R.ukuran; (3) tutor sebaya = siswa di kelas yang sama dengan
  // materi itu sudah baik (>= 80%), bila diminta.
  function susunRemedial(rows) {
    const per = new Map(); rows.forEach(r => { if (!per.has(r.kelas)) per.set(r.kelas, []); per.get(r.kelas).push(r); });
    return Array.from(per.keys()).sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true })).map(kl => {
      const sub = per.get(kl), perlu = sub.filter(r => r.kurang.length);
      const perMateri = G.materi.map(lb => ({ lb, siswa: sub.filter(r => r.peta[lb] && r.peta[lb].level === 'kurang').map(r => ({ r, p: r.peta[lb].persen })).sort((a, b) => a.p - b.p) })).filter(x => x.siswa.length).sort((a, b) => b.siswa.length - a.siswa.length || G.materi.indexOf(a.lb) - G.materi.indexOf(b.lb));
      const utama = new Map(); perlu.forEach(r => { const lb = r.kurang[0].label; if (!utama.has(lb)) utama.set(lb, []); utama.get(lb).push(r); });
      const kelompok = []; let no = 1;
      Array.from(utama.entries()).sort((a, b) => b[1].length - a[1].length || G.materi.indexOf(a[0]) - G.materi.indexOf(b[0])).forEach(([lb, ang]) => {
        ang.sort((a, b) => a.peta[lb].persen - b.peta[lb].persen);
        const nKel = Math.ceil(ang.length / R.ukuran), dasar = Math.floor(ang.length / nKel), lebih = ang.length % nKel; let mulai = 0;
        const calon = R.tutor ? sub.filter(r => r.peta[lb] && r.peta[lb].level === 'baik').sort((a, b) => b.peta[lb].persen - a.peta[lb].persen) : [];
        for (let g = 0; g < nKel; g++) { const n = dasar + (g < lebih ? 1 : 0); kelompok.push({ no: no++, lb, anggota: ang.slice(mulai, mulai + n), tutor: calon.length ? calon[g % calon.length] : null }); mulai += n; }
      });
      return { kelas: kl, total: sub.length, perlu, perMateri, kelompok };
    });
  }
  const lainnya = (r, lb) => r.kurang.filter(T => T.label !== lb).map(T => T.label);
  function htmlRemedialLayar(hs) {
    if (!hs.length) return '<p class="subtitle">Tidak ada siswa pada pilihan ini.</p>';
    return hs.map(h => {
      const kepala = `<h4 class="ht-kelas">Kelas ${esc(h.kelas)} — ${h.perlu.length} dari ${h.total} siswa perlu remedial</h4>`;
      if (!h.perlu.length) return kepala + '<p class="subtitle">Tidak ada siswa dengan materi di bawah ' + TH_KURANG + '%. 🎉</p>';
      const mt = h.perMateri.map(m => `<div class="ht-kotak"><h5>${esc(m.lb)} <span class="subtitle">(${m.siswa.length} siswa)</span></h5>${m.siswa.map(x => `<div class="ht-baris"><span>${esc(x.r.nama)}</span><span class="ht-chip kurang">${bulat(x.p)}%</span></div>`).join('')}</div>`).join('');
      const kg = h.kelompok.map(g => `<div class="ht-kotak"><h5>Kelompok ${g.no} — ${esc(g.lb)}</h5>${g.anggota.map(r => `<div class="ht-baris"><span>${esc(r.nama)}${lainnya(r, g.lb).length ? `<small class="subtitle"> · juga kurang: ${esc(lainnya(r, g.lb).join(', '))}</small>` : ''}</span><span class="ht-chip kurang">${bulat(r.peta[g.lb].persen)}%</span></div>`).join('')}${g.tutor ? `<div class="ht-tutor">Tutor sebaya: <b>${esc(g.tutor.nama)}</b> (${bulat(g.tutor.peta[g.lb].persen)}%)</div>` : ''}</div>`).join('');
      return `${kepala}<p class="subtitle" style="margin:.2rem 0">Daftar remedial per materi</p><div class="ht-gr">${mt}</div><p class="subtitle" style="margin:.6rem 0 .2rem">Kelompok belajar (tiap siswa masuk satu kelompok sesuai materi terlemahnya)</p><div class="ht-gr">${kg}</div>`;
    }).join('');
  }
  function htmlRemedialCetak(hs, label) {
    const { namaSekolah, kop } = Guru._identitasSekolah_(); const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const bagian = hs.map((h, i) => {
      const awal = `<section${i ? ' style="break-before:page"' : ''}><h3 class="cp-sub">Kelas ${esc(h.kelas)} — ${h.perlu.length} dari ${h.total} siswa perlu remedial</h3>`;
      if (!h.perlu.length) return awal + '<p class="cp-kosong">Tidak ada siswa dengan materi di bawah ' + TH_KURANG + '%.</p></section>';
      const tm = `<table class="ht-tabel"><thead><tr><th style="width:26%">Materi</th><th style="width:10%">Jumlah</th><th>Siswa perlu remedial (penguasaan)</th></tr></thead><tbody>${h.perMateri.map(m => `<tr><td>${esc(m.lb)}</td><td style="text-align:center">${m.siswa.length}</td><td>${m.siswa.map(x => esc(x.r.nama) + ' (' + bulat(x.p) + '%)').join('; ')}</td></tr>`).join('')}</tbody></table>`;
      const tk = `<table class="ht-tabel"><thead><tr><th style="width:12%">Kelompok</th><th style="width:22%">Materi yang diperkuat</th><th>Anggota</th><th style="width:20%">Tutor sebaya</th><th style="width:16%">Paraf / Tanggal</th></tr></thead><tbody>${h.kelompok.map(g => `<tr><td style="text-align:center">${g.no}</td><td>${esc(g.lb)}</td><td>${g.anggota.map(r => esc(r.nama) + ' (' + bulat(r.peta[g.lb].persen) + '%)').join('; ')}</td><td>${g.tutor ? esc(g.tutor.nama) + ' (' + bulat(g.tutor.peta[g.lb].persen) + '%)' : '-'}</td><td></td></tr>`).join('')}</tbody></table>`;
      return `${awal}<h4 style="margin:6px 0 2px;font-size:10pt">A. Daftar remedial per materi</h4>${tm}<h4 style="margin:8px 0 2px;font-size:10pt">B. Kelompok belajar</h4><p class="ht-ket">Tiap siswa masuk satu kelompok sesuai materi terlemahnya; maksimal ${R.ukuran} siswa per kelompok.</p>${tk}</section>`;
    }).join('');
    return `${kop}<h2 class="cp-judul">Daftar Remedial &amp; Kelompok Belajar — ${esc(label)}</h2><p class="cp-cover-ujian" style="text-align:center">${esc(G.judul)}</p>${bagian}<footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`;
  }
  function pastikanModalRemedial() {
    if ($('modal-ht-remedial')) return;
    const m = document.createElement('div'); m.id = 'modal-ht-remedial'; m.className = 'modal-backdrop hidden';
    m.onclick = (e) => { if (e.target === m) tutupRemedial(); };
    m.innerHTML = `<div class="modal modal-wide am-scope"><h3 style="margin:0">Kelompok Remedial</h3><p class="subtitle" id="ht-r-sub" style="margin:.2rem 0 0"></p>
      <div class="ht-ctl"><label>Maks. anggota per kelompok <select id="ht-r-ukuran" onchange="HasilTes.ubahRemedial()"><option>3</option><option>4</option><option selected>5</option><option>6</option><option>8</option></select></label><label><input type="checkbox" id="ht-r-tutor" checked onchange="HasilTes.ubahRemedial()"> Sertakan tutor sebaya (siswa yang sudah baik pada materi itu)</label></div>
      <div class="ht-isi" id="ht-r-isi"></div>
      <div class="modal-close-row"><button type="button" class="secondary" onclick="HasilTes.cetakRemedial()"><i class="fa-solid fa-print"></i> Cetak / PDF</button><button type="button" onclick="HasilTes.tutupRemedial()">Tutup</button></div></div>`;
    document.body.appendChild(m);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.classList.contains('hidden')) tutupRemedial(); });
  }
  function barisRemedial() { const kl = $('ht-kelas').value; return { rows: kl ? saring(true) : G.rows.slice(), label: kl ? 'Kelas ' + kl : 'Seluruh Kelas' }; }
  function gambarRemedial() {
    R.ukuran = Number($('ht-r-ukuran').value) || 5; R.tutor = !!$('ht-r-tutor').checked;
    const { rows, label } = barisRemedial();
    $('ht-r-sub').textContent = label + ' • ' + G.judul + ' • ambang remedial: materi di bawah ' + TH_KURANG + '%';
    $('ht-r-isi').innerHTML = htmlRemedialLayar(susunRemedial(rows));
  }
  function kelompokRemedial() {
    if (!G.ujianId || !G.rows.length) { toast('Pilih ujian dan tunggu hasilnya tampil dulu.', 'error'); return; }
    pastikanModalRemedial(); gambarRemedial(); $('modal-ht-remedial').classList.remove('hidden');
  }
  function ubahRemedial() { gambarRemedial(); }
  function tutupRemedial() { const m = $('modal-ht-remedial'); if (m) m.classList.add('hidden'); }
  async function cetakRemedial() {
    const { rows, label } = barisRemedial(); const hs = susunRemedial(rows);
    if (!hs.length) { toast('Tidak ada siswa pada pilihan ini.', 'error'); return; }
    await Guru._cetakArea_(htmlRemedialCetak(hs, label), ['Remedial', label, G.judul].filter(Boolean).join(' - '));
  }

  async function unduhExcel() {
    const rows = saring(); if (!G.ujianId || !rows.length) { toast('Belum ada data untuk diunduh.', 'error'); return; }
    const head = ['No', 'Nama', 'Kelas', 'Nilai', 'Kategori', 'Benar', 'Sebagian', 'Salah', 'Kosong'].concat(G.materi.map(l => l + ' (%)')).concat(['Materi yang kurang', 'Materi yang sudah baik']);
    const data = rows.map((r, i) => [i + 1, r.nama, r.kelas, r.nilai, labelKategori_(r.nilai), r.benar, r.sebagian, r.salah, r.kosong].concat(G.materi.map(l => r.peta[l] ? bulat(r.peta[l].persen) : '')).concat([r.kurang.map(T => T.label + ' ' + bulat(T.persen) + '%').join('; '), r.baik.map(T => T.label + ' ' + bulat(T.persen) + '%').join('; ')]));
    await unduhXlsxRapi_('Hasil ' + G.judul.slice(0, 40) + '.xlsx', 'Hasil Tes', head, data, head.map((h, i) => i === 1 ? 28 : (i < 3 ? 10 : 16)));
  }

  async function buka() { if (!G.daftar.length) await muatDaftar(); if ($('ht-ujian').value && !G.ujianId) muat(); }
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) { _gantiTab.call(UI, tabId); if (tabId === 'tab-hasil-tes') buka(); };
  return { muat, render, bukaDetail, tutup, pindah, ubahFilter, cetakSatu, cetakBanyak, unduhZip, unduhExcel, kelompokRemedial, ubahRemedial, tutupRemedial, cetakRemedial };
})();
