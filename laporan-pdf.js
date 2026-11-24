/* ============================================================================
   LAPORAN PDF SISWA — hasil analisis yang bisa dibagikan ke siswa (Portal Guru > Analisis Materi).
   Cakupan : satu siswa | satu kelas | seluruh siswa.
   Format  : (kelas / seluruh siswa) ZIP berisi 1 PDF per siswa — siap dibagikan satu per satu
             (dikelompokkan per kelas), atau 1 file PDF gabungan (tiap siswa mulai di halaman baru).
   Isi laporan (bisa dipilih): identitas & ringkasan, grafik perkembangan nilai Tes 1/2/3 (naik/turun),
             analisis materi Literasi & Numerasi + saran belajar, hasil Survei Karakter & Sulingjar,
             dan kotak catatan guru.
   Sulingjar (penilaian siswa terhadap sekolah): saran TINDAK LANJUT SEKOLAH ikut ditampilkan di PDF siswa, dan untuk
   dimensi Iklim keamanan ditambah catatan keamanan (ceritakan ke guru BK / wali kelas).
   PDF digambar langsung dengan jsPDF (teks vektor, ukuran kecil) — bukan tangkapan layar. Pustaka dimuat saat dibutuhkan.
   Dimuat SETELAH analisis-materi.js dan perkembangan.js.
   ============================================================================ */
'use strict';
const LaporanPdf = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const AM = () => AnalisisMateri;
  const PG = () => Perkembangan;
  const bulat = (n) => Math.round(Number(n) || 0);
  const f1 = (n) => (n == null || isNaN(n)) ? '-' : (Math.round(Number(n) * 10) / 10).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const WARNA = { kurang: [214, 69, 93], cukup: [220, 143, 18], baik: [34, 154, 102], prim: [13, 110, 253], biru: [29, 79, 140], teks: [31, 42, 55], mute: [108, 117, 125], garis: [222, 226, 230], latar: [243, 247, 253], putih: [255, 255, 255] };
  const SERI = { akhir: [5, 150, 105], literasi: [37, 99, 235], numerasi: [234, 88, 12], lainnya: [124, 58, 237], kelas: [100, 116, 139] };
  const NAMA_SERI = { akhir: 'Rata-rata', literasi: 'Literasi', numerasi: 'Numerasi', lainnya: 'Mapel Lain', kelas: 'Rata-rata kelas' };

  // ---------------- gaya modal ----------------
  (function () {
    if (document.getElementById('laporan-pdf-css-inline')) return;
    const st = document.createElement('style'); st.id = 'laporan-pdf-css-inline';
    st.textContent = `
#modal-lap-pdf .modal { max-width: 640px; }
#modal-lap-pdf .lp-body { max-height: 72vh; overflow: auto; padding-right: .2rem; }
#modal-lap-pdf .lp-h { margin: .9rem 0 .4rem; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--am-mute, #6c757d); }
#modal-lap-pdf .lp-opsi { display: flex; gap: .7rem; align-items: flex-start; padding: .65rem .8rem; border: 1px solid var(--am-line, #dee2e6); border-radius: 12px; margin: 0 0 .5rem; background: var(--am-surf, #fff); cursor: pointer; }
#modal-lap-pdf .lp-opsi:hover { border-color: var(--am-prim, #0d6efd); }
#modal-lap-pdf .lp-opsi.on { border-color: var(--am-prim, #0d6efd); background: color-mix(in srgb, var(--am-prim, #0d6efd) 7%, var(--am-surf, #fff)); }
#modal-lap-pdf .lp-opsi input[type=radio], #modal-lap-pdf .lp-opsi input[type=checkbox] { width: auto; margin-top: .25rem; flex: 0 0 auto; }
#modal-lap-pdf .lp-opsi b { display: block; font-size: .9rem; color: var(--am-text, #212529); }
#modal-lap-pdf .lp-opsi small { display: block; color: var(--am-mute, #6c757d); font-size: .78rem; line-height: 1.45; margin-top: .1rem; }
#modal-lap-pdf .lp-opsi select { margin-top: .4rem; width: 100%; max-width: 100%; }
#modal-lap-pdf .lp-cek { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .4rem .8rem; }
#modal-lap-pdf .lp-cek label { display: flex; gap: .5rem; align-items: center; font-size: .86rem; font-weight: 500; cursor: pointer; margin: 0; }
#modal-lap-pdf .lp-cek input { width: auto; }
#modal-lap-pdf .lp-info { margin: .8rem 0 0; padding: .6rem .8rem; border-radius: 10px; font-size: .82rem; line-height: 1.5; background: var(--am-hover, #f3f7fe); border: 1px solid var(--am-line, #dee2e6); color: var(--am-text, #212529); }
#modal-lap-pdf .lp-prog { height: 8px; border-radius: 99px; background: var(--am-line, #dee2e6); overflow: hidden; margin: .7rem 0 .2rem; display: none; }
#modal-lap-pdf .lp-prog i { display: block; height: 100%; width: 0; background: var(--am-prim, #0d6efd); transition: width .15s; }
#modal-lap-pdf .lp-status { font-size: .8rem; color: var(--am-mute, #6c757d); min-height: 1.2em; }`;
    document.head.appendChild(st);
  })();

  // ============================================================================================
  // TEKS AMAN UNTUK FONT BAWAAN PDF (Helvetica / WinAnsi): karakter di luar Latin-1 diganti / dibuang
  // ============================================================================================
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', 'ⁿ': 'n' };
  function t(s) {
    return String(s == null ? '' : s).normalize('NFC')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+/g, (m) => '^' + Array.from(m).map(c => SUP[c] || '').join(''))
      .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
      .replace(/[\u2013\u2014\u2212]/g, '-').replace(/[\u2018\u2019\u201A]/g, "'").replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/\u2026/g, '...').replace(/[\u2022\u25CF\u25CB\u00B7]/g, '-')
      .replace(/\u2265/g, '>=').replace(/\u2264/g, '<=').replace(/\u2192/g, '->').replace(/\u2260/g, '!=').replace(/\u2248/g, '~')
      .replace(/\u00D7/g, 'x').replace(/\u00F7/g, ':').replace(/\u221A/g, 'akar ').replace(/\u03C0/g, 'pi').replace(/\u00A0/g, ' ')
      .replace(/[^\u0020-\u007E\u00A1-\u00FF]/g, '').replace(/\s+/g, ' ').trim();
  }
  const namaBerkas = (s) => t(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 70) || 'Siswa';

  // ============================================================================================
  // PENATA LETAK PDF
  // ============================================================================================
  function Lembar(doc, info) {
    const W = 210, H = 297, MX = 16, TOP = 14, BOT = 17, CW = W - 2 * MX;
    const L = { doc, y: TOP, info, page0: doc.getNumberOfPages() };
    const warna = (a, fn) => doc[fn || 'setTextColor'](a[0], a[1], a[2]);
    const font = (size, tebal) => { doc.setFont('helvetica', tebal ? 'bold' : 'normal'); doc.setFontSize(size); };
    const lh = (size) => size * 0.3528 * 1.38;
    L.W = W; L.CW = CW; L.MX = MX; L.font = font; L.warna = warna;

    L.halamanBaru = () => {
      doc.addPage(); L.y = TOP;
      font(7.5, false); warna(WARNA.mute); doc.text(t('Laporan Hasil Belajar - ' + info.nama + ' (' + info.kelas + ')'), MX, L.y + 3);
      doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.2); doc.line(MX, L.y + 5, W - MX, L.y + 5);
      L.y += 10;
    };
    L.ruang = (h) => { if (L.y + h > H - BOT) L.halamanBaru(); };
    L.teks = (str, o) => {
      const op = Object.assign({ size: 9, tebal: false, warna: WARNA.teks, x: MX, lebar: CW, gap: 1.2, align: 'left' }, o || {});
      font(op.size, op.tebal); warna(op.warna);
      const baris = doc.splitTextToSize(t(str), op.lebar);
      const tinggi = baris.length * lh(op.size);
      if (!op.tanpaRuang) L.ruang(tinggi);
      baris.forEach((b, i) => doc.text(b, op.align === 'right' ? op.x + op.lebar : (op.align === 'center' ? op.x + op.lebar / 2 : op.x), L.y + (i + 1) * lh(op.size) - 0.8, { align: op.align }));
      L.y += tinggi + op.gap;
      return tinggi;
    };
    L.hitungTinggi = (str, size, lebar) => { font(size, false); return doc.splitTextToSize(t(str), lebar).length * lh(size); };
    L.judul = (teks, kanan, wr) => {
      L.ruang(16);
      doc.setFillColor(...WARNA.prim); doc.roundedRect(MX, L.y, 1.6, 6.4, 0.6, 0.6, 'F');
      font(11.5, true); warna(WARNA.teks); doc.text(t(teks), MX + 4, L.y + 4.8);
      if (kanan) { font(9.5, true); warna(wr || WARNA.prim); doc.text(t(kanan), W - MX, L.y + 4.8, { align: 'right' }); }
      doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.2); doc.line(MX, L.y + 8, W - MX, L.y + 8);
      L.y += 11;
    };
    L.bar = (x, y, w, persen, rgb) => {
      doc.setFillColor(233, 236, 241); doc.roundedRect(x, y, w, 2.2, 1.1, 1.1, 'F');
      const lebar = Math.max(1.4, w * Math.max(0, Math.min(100, persen)) / 100);
      doc.setFillColor(...rgb); doc.roundedRect(x, y, lebar, 2.2, 1.1, 1.1, 'F');
    };
    L.lencana = (teks, x, y, rgb) => { // x = tepi kanan
      font(7.5, true); const w = doc.getTextWidth(t(teks)) + 4.4;
      doc.setFillColor(Math.round(rgb[0] * 0.14 + 255 * 0.86), Math.round(rgb[1] * 0.14 + 255 * 0.86), Math.round(rgb[2] * 0.14 + 255 * 0.86));
      doc.roundedRect(x - w, y - 3.6, w, 5.2, 2.6, 2.6, 'F');
      warna(rgb); doc.text(t(teks), x - w / 2, y + 0.05, { align: 'center' });
    };
    // baris: label | bar | nilai + lencana
    L.barisNilai = (label, persen, rgb, ketNilai, ketLevel, opsi) => {
      const o = opsi || {}, wl = CW * 0.5;
      const baris = (font(9, true), doc.splitTextToSize(t(label), wl));
      const h = Math.max(7.2, baris.length * lh(9) + 2.4);
      L.ruang(h + (o.tambah || 0));
      font(9, true); warna(WARNA.teks);
      baris.forEach((b, i) => doc.text(b, MX + 1, L.y + 3.6 + i * lh(9)));
      L.bar(MX + wl + 4, L.y + 2.4, CW * 0.24, persen, rgb);
      font(9.5, true); warna(rgb); doc.text(t(ketNilai), W - MX - 31, L.y + 3.6, { align: 'right' });
      L.lencana(ketLevel, W - MX, L.y + 3.3, rgb);
      L.y += h;
    };
    L.bullet = (str, o) => {
      const op = Object.assign({ size: 8.6, x: MX + 5, warna: WARNA.teks }, o || {});
      font(op.size, false);
      const baris = doc.splitTextToSize(t(str), CW - (op.x - MX) - 2);
      L.ruang(baris.length * lh(op.size) + 0.8);
      warna(op.warna); doc.setFillColor(...(op.warna)); doc.circle(op.x - 2.4, L.y + 2.2, 0.6, 'F');
      baris.forEach((b, i) => doc.text(b, op.x, L.y + (i + 1) * lh(op.size) - 0.8));
      L.y += baris.length * lh(op.size) + 0.9;
    };
    L.selesai = (namaSekolah, tanggal) => {
      const n = doc.getNumberOfPages();
      for (let p = L.page0; p <= n; p++) {
        doc.setPage(p);
        doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.2); doc.line(MX, H - 12.5, W - MX, H - 12.5);
        font(7.5, false); warna(WARNA.mute);
        doc.text(t('Dicetak dari ' + namaSekolah + ' - ' + tanggal), MX, H - 8.5);
        doc.text('Halaman ' + (p - L.page0 + 1) + ' dari ' + (n - L.page0 + 1), W - MX, H - 8.5, { align: 'right' });
      }
    };
    return L;
  }

  // ---------------- grafik garis (vektor) ----------------
  function gambarGrafik(L, labels, seri, tinggi) {
    const doc = L.doc, x0 = L.MX, w = L.CW, padL = 9, padR = 3, padT = 4, padB = 9;
    L.ruang(tinggi + 9);
    const y0 = L.y, pw = w - padL - padR, ph = tinggi - padT - padB, n = labels.length;
    const X = (i) => x0 + padL + pw * (i + 0.5) / n, Y = (v) => y0 + padT + ph * (1 - Math.max(0, Math.min(100, v)) / 100);
    doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.2);
    [0, 25, 50, 75, 100].forEach(v => {
      doc.setLineDashPattern(v === 0 ? [] : [0.8, 1.2], 0); doc.line(x0 + padL, Y(v), x0 + w - padR, Y(v));
      L.font(6.5, false); L.warna(WARNA.mute); doc.text(String(v), x0 + padL - 2, Y(v) + 0.9, { align: 'right' });
    });
    doc.setLineDashPattern([], 0);
    labels.forEach((lb, i) => { L.font(7.5, true); L.warna(WARNA.teks); const tt = t(lb); doc.text(tt.length > 16 ? tt.slice(0, 15) + '.' : tt, X(i), y0 + tinggi - 2.6, { align: 'center' }); });
    const pts = {};
    seri.forEach(s => {
      doc.setDrawColor(...s.rgb); doc.setFillColor(...s.rgb);
      doc.setLineWidth(s.tebal ? 0.75 : 0.5); doc.setLineDashPattern(s.putus ? [1.6, 1.2] : [], 0);
      let prev = null;
      s.nilai.forEach((v, i) => {
        if (v == null || isNaN(v)) { prev = null; return; }
        if (prev != null) doc.line(X(prev.i), Y(prev.v), X(i), Y(v));
        prev = { i, v };
      });
      doc.setLineDashPattern([], 0);
      s.nilai.forEach((v, i) => {
        if (v == null || isNaN(v)) return;
        doc.setFillColor(...s.rgb); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3); doc.circle(X(i), Y(v), s.putus ? 0.9 : 1.25, 'FD');
        if (s.label) (pts[i] = pts[i] || []).push({ x: X(i), y: Y(v), v, rgb: s.rgb });
      });
    });
    // letak label nilai: bila berdekatan, tertinggi di atas, terendah di bawah, sisanya di samping (tidak saling menimpa)
    Object.keys(pts).forEach(k => {
      const g = pts[k].sort((a, b) => a.y - b.y);
      const bentrok = g.some((p, i) => i > 0 && p.y - g[i - 1].y < 3.6);
      g.forEach((p, i) => {
        let tx = p.x, ty = p.y - 2.1, al = 'center';
        if (bentrok && g.length > 1) {
          if (i === g.length - 1) ty = p.y + 4.2;
          else if (i > 0) { const kanan = (i % 2) === 1; tx = p.x + (kanan ? 2.6 : -2.6); ty = p.y + 0.9; al = kanan ? 'left' : 'right'; }
        }
        L.font(6.6, true); L.warna(p.rgb); doc.text(f1(p.v), tx, ty, { align: al });
      });
    });
    // legenda
    L.y = y0 + tinggi + 1; let lx = x0 + padL;
    seri.forEach(s => {
      doc.setDrawColor(...s.rgb); doc.setLineWidth(0.6); doc.setLineDashPattern(s.putus ? [1.2, 0.9] : [], 0); doc.line(lx, L.y + 1.8, lx + 6, L.y + 1.8); doc.setLineDashPattern([], 0);
      L.font(7.5, false); L.warna(WARNA.teks); doc.text(t(s.nama), lx + 7.5, L.y + 2.6); lx += 9 + doc.getTextWidth(t(s.nama)) + 5;
    });
    L.y += 7;
  }

  // ============================================================================================
  // ISI LAPORAN SATU SISWA
  // ============================================================================================
  const tglPanjang = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  function rataKelas(sw, data) {
    const temans = [...data.prog.values()].filter(p => norm(p.kelas) === norm(sw.kelas));
    const prog = data.prog.get(String(sw.id)); if (!prog) return [];
    return prog.td.tes.map((_, i) => { const v = temans.map(p => p.akhir[i]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
  }
  function wawasanTeks(td) {
    try {
      const tpl = document.createElement('template'); tpl.innerHTML = PG().wawasan(td, {});
      return Array.from(tpl.content.querySelectorAll('li')).map(li => (li.querySelector('span') || li).textContent.replace(/\s+/g, ' ').trim());
    } catch (e) { return []; }
  }
  function kategoriSurvei(n) { try { return Survei.kategoriIndeks(n); } catch (e) { return { label: '-', kode: 'na' }; } }

  function tulisLaporan(doc, sw, data, opsi, ctx) {
    const L = Lembar(doc, { nama: sw.nama, kelas: sw.kelas });
    const prog = data.prog.get(String(sw.id)) || null;
    // ---- kepala ----
    doc.setFillColor(...WARNA.biru); doc.rect(0, 0, 210, 31, 'F');
    let tx = 16;
    if (ctx.logo) { try { doc.setFillColor(255, 255, 255); doc.roundedRect(15, 6, 19, 19, 3, 3, 'F'); const r = Math.min(15 / ctx.logo.w, 15 / ctx.logo.h); const w = ctx.logo.w * r, h = ctx.logo.h * r; doc.addImage(ctx.logo.data, 'PNG', 24.5 - w / 2, 15.5 - h / 2, w, h); tx = 38; } catch (e) { tx = 16; } }
    L.font(14.5, true); L.warna(WARNA.putih); doc.text(t(ctx.namaSekolah), tx, 14.5);
    L.font(9, false); doc.text('LAPORAN HASIL BELAJAR & SURVEI SISWA', tx, 20.5);
    L.font(8, false); doc.text(t('Tanggal laporan: ' + ctx.tanggal), tx, 25.5);
    L.y = 37;
    // ---- identitas ----
    doc.setFillColor(...WARNA.latar); doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.25); doc.roundedRect(L.MX, L.y, L.CW, 17, 2.5, 2.5, 'FD');
    L.font(14, true); L.warna(WARNA.teks); doc.text(t(sw.nama), L.MX + 5, L.y + 7.2);
    L.font(9, false); L.warna(WARNA.mute); doc.text(t('Kelas ' + sw.kelas), L.MX + 5, L.y + 13);
    if (ctx.guru) { doc.text(t('Guru: ' + ctx.guru), L.W - L.MX - 5, L.y + 13, { align: 'right' }); }
    L.y += 22;

    // ---- ringkasan ----
    const kotak = [];
    const td = prog && prog.td;
    if (opsi.progres && td && td.tes.length) {
      const ak = prog.akhir, adaIdx = ak.map((v, i) => v == null ? -1 : i).filter(i => i >= 0), last = adaIdx.length ? ak[adaIdx[adaIdx.length - 1]] : null;
      const tr = prog.tren;
      kotak.push({ judul: 'Rata-rata nilai tes terakhir', nilai: f1(last), ket: tr.arah === 'baru' ? 'Baru 1 tes' : (tr.arah === 'naik' ? 'Naik ' + f1(Math.abs(tr.delta)) + ' poin' : (tr.arah === 'turun' ? 'Turun ' + f1(Math.abs(tr.delta)) + ' poin' : 'Stabil')), rgb: tr.arah === 'turun' ? WARNA.kurang : (tr.arah === 'naik' ? WARNA.baik : WARNA.prim) });
      kotak.push({ judul: 'Tes yang diselesaikan', nilai: String(adaIdx.length), ket: 'dari ' + td.tes.length + ' tes', rgb: WARNA.prim });
    }
    ['karakter', 'sulingjar'].forEach(k => {
      if (!opsi.jenis[k] || !sw.jenis[k]) return;
      const J = sw.jenis[k], kt = kategoriSurvei(J.persen);
      kotak.push({ judul: AM().NAMA_JENIS[k], nilai: f1(J.persen), ket: kt.label, rgb: kt.kode === 'baik' ? WARNA.baik : (kt.kode === 'sedang' ? WARNA.cukup : WARNA.kurang) });
    });
    if (kotak.length) {
      const n = Math.min(4, kotak.length), gap = 3, bw = (L.CW - gap * (n - 1)) / n;
      kotak.slice(0, 4).forEach((k, i) => {
        const x = L.MX + i * (bw + gap);
        doc.setFillColor(255, 255, 255); doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.25); doc.roundedRect(x, L.y, bw, 21, 2.5, 2.5, 'FD');
        doc.setFillColor(...k.rgb); doc.roundedRect(x, L.y, bw, 1.6, 0.8, 0.8, 'F');
        L.font(7.2, true); L.warna(WARNA.mute); doc.text(doc.splitTextToSize(t(k.judul), bw - 5), x + 3, L.y + 6);
        L.font(16, true); L.warna(k.rgb); doc.text(t(k.nilai), x + 3, L.y + 14);
        L.font(7.8, true); L.warna(k.rgb); doc.text(t(k.ket), x + 3, L.y + 18.6);
      });
      L.y += 26;
    }

    // ---- perkembangan nilai ----
    if (opsi.progres && td && td.tes.length) {
      L.judul('Perkembangan Nilai Tes', prog.tren.arah === 'baru' ? 'Data awal' : (prog.tren.arah === 'naik' ? 'Naik' : (prog.tren.arah === 'turun' ? 'Turun' : 'Stabil')),
        prog.tren.arah === 'turun' ? WARNA.kurang : (prog.tren.arah === 'naik' ? WARNA.baik : WARNA.cukup));
      const seri = [{ nama: NAMA_SERI.akhir, rgb: SERI.akhir, tebal: true, label: true, nilai: prog.akhir }];
      td.jenis.forEach(j => seri.push({ nama: NAMA_SERI[j], rgb: SERI[j], label: true, nilai: td.tes.map(x => x.nilai[j] == null ? null : x.nilai[j]) }));
      const rk = rataKelas(sw, data);
      if (rk.some(v => v != null) && data.prog.size > 1) seri.push({ nama: NAMA_SERI.kelas, rgb: SERI.kelas, putus: true, nilai: rk });
      gambarGrafik(L, td.tes.map(x => x.label), seri, 56);
      // tabel
      const kolJ = td.jenis, cw = [L.CW * 0.26].concat(kolJ.map(() => L.CW * 0.14), [L.CW * 0.16, L.CW * 0.18]);
      const sisa = L.CW - cw.reduce((a, b) => a + b, 0); cw[cw.length - 1] += sisa;
      const head = ['Tes'].concat(kolJ.map(j => NAMA_SERI[j]), ['Rata-rata', 'Perubahan']);
      L.ruang(8 + 6.2 * td.tes.length);
      doc.setFillColor(...WARNA.latar); doc.rect(L.MX, L.y, L.CW, 6.4, 'F');
      let cx = L.MX; head.forEach((h, i) => { L.font(7.6, true); L.warna(WARNA.mute); doc.text(t(h), cx + (i === 0 ? 2 : cw[i] / 2), L.y + 4.4, { align: i === 0 ? 'left' : 'center' }); cx += cw[i]; });
      L.y += 6.4;
      let prev = null;
      td.tes.forEach(tes => {
        const d = (tes.akhir != null && prev != null) ? tes.akhir - prev : null; if (tes.akhir != null) prev = tes.akhir;
        cx = L.MX; const sel = [tes.label].concat(kolJ.map(j => f1(tes.nilai[j])), [f1(tes.akhir), d == null ? '-' : ((d > 0 ? '+' : '') + f1(d))]);
        sel.forEach((v, i) => {
          L.font(8.4, i === 0 || i === kolJ.length + 1); L.warna(i === sel.length - 1 && d != null ? (d >= 3 ? WARNA.baik : (d <= -3 ? WARNA.kurang : WARNA.cukup)) : WARNA.teks);
          doc.text(t(v), cx + (i === 0 ? 2 : cw[i] / 2), L.y + 4.3, { align: i === 0 ? 'left' : 'center' }); cx += cw[i];
        });
        doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.15); doc.line(L.MX, L.y + 6.2, L.MX + L.CW, L.y + 6.2);
        L.y += 6.2;
      });
      L.y += 2.5;
      wawasanTeks(td).slice(0, 4).forEach(w => L.bullet(w, { warna: WARNA.teks }));
      L.y += 3;
    }

    // ---- analisis materi tes + survei ----
    ['literasi', 'numerasi', 'lainnya', 'karakter', 'sulingjar'].forEach(k => {
      if (!opsi.jenis[k]) return;
      const J = sw.jenis[k]; if (!J) return;
      const sv = AM().adalahSurvei(k), nama = AM().NAMA_JENIS[k];
      const lvJ = AM().levelUntuk(k, J.persen);
      L.judul((sv ? 'Hasil ' : 'Analisis Materi ') + nama, (sv ? 'Nilai ' : 'Penguasaan ') + f1(J.persen) + (sv ? '' : '%'), WARNA[lvJ]);
      L.teks((sv ? 'Dihitung dari ' + J.ujian.length + ' survei: ' : 'Dihitung dari ' + J.ujian.length + ' tes: ') + J.ujian.map(u => u.judul).join(', ') + '.', { size: 8, warna: WARNA.mute, gap: 2.2 });
      if (sv) L.teks(k === 'karakter' ? 'Survei ini tidak memiliki jawaban benar atau salah. Hasilnya menggambarkan kebiasaan dan sikapmu; nilai makin tinggi berarti makin baik.' : 'Sulingjar adalah penilaianmu terhadap lingkungan belajar di sekolah, bukan penilaian terhadap dirimu.', { size: 8, warna: WARNA.mute, gap: 2.6 });
      const lemah = J.topik.filter(x => x.level !== 'baik'), baik = J.topik.filter(x => x.level === 'baik');
      if (lemah.length) {
        L.ruang(24); L.teks(sv ? 'Perlu ditingkatkan' : 'Perlu dipelajari lagi', { size: 8.4, tebal: true, warna: WARNA.mute, gap: 1.2 });
        lemah.forEach(T => {
          const rgb = WARNA[T.level];
          let saran = AM().saranPlain(T, k, k === 'sulingjar' ? 'guru' : 'siswa');
          // Sulingjar: tampilkan tindak lanjut sekolah; untuk Iklim keamanan tambahkan juga catatan keamanan bagi siswa
          if (k === 'sulingjar' && T.level !== 'baik') { const aman = (typeof Survei !== 'undefined' && Survei.saranDim) ? Survei.saranDim('sulingjar', T.kode, 'siswa') : ''; if (aman && saran.indexOf(aman) < 0) saran = saran.concat([aman]); }
          saran = saran.slice(0, T.level === 'kurang' ? 3 : 2);
          const hist = (T.hist && T.hist.length >= 2) ? 'Perkembangan: ' + T.hist.map(h => h.judul + ' ' + bulat(h.persen) + (sv ? '' : '%')).join(' -> ') : '';
          const hSaran = saran.reduce((a, s) => a + L.hitungTinggi(s, 8.6, L.CW - 9) + 1, 0) + (hist ? L.hitungTinggi(hist, 7.8, L.CW - 6) + 1 : 0) + (saran.length ? 4.5 : 0);
          L.ruang(9 + hSaran);
          L.barisNilai(T.label, T.persen, rgb, bulat(T.persen) + (sv ? '' : '%'), AM().labelLevel(k, T.level));
          if (hist) L.teks(hist, { size: 7.8, warna: WARNA.mute, x: L.MX + 1, lebar: L.CW - 2, gap: 0.8 });
          if (saran.length) {
            L.teks(sv ? (k === 'karakter' ? 'Saran:' : 'Tindak lanjut sekolah:') : 'Saran belajar:', { size: 8, tebal: true, warna: WARNA.prim, x: L.MX + 1, gap: 0.6 });
            saran.forEach(s => L.bullet(s));
          }
          L.y += 2;
        });
      } else {
        L.teks('Hebat! Semua ' + (sv ? 'dimensi' : 'materi') + ' sudah berada pada tingkat baik. Pertahankan.', { size: 9, tebal: true, warna: WARNA.baik, gap: 2 });
      }
      if (baik.length) {
        L.y += 1; L.ruang(24); L.teks('Sudah baik', { size: 8.4, tebal: true, warna: WARNA.mute, gap: 1.2 });
        baik.forEach(T => L.barisNilai(T.label, T.persen, WARNA.baik, bulat(T.persen) + (sv ? '' : '%'), AM().labelLevel(k, 'baik')));
      }
      L.y += 4;
    });

    // ---- cara membaca + catatan guru ----
    L.ruang(opsi.catatan ? 62 : 30);
    L.judul('Cara Membaca Laporan');
    const leg = [[WARNA.kurang, 'Merah', 'Tes: < 60% (perlu diperkuat). Survei: < 50 (perlu perhatian).'], [WARNA.cukup, 'Kuning', 'Tes: 60-79% (cukup). Survei: 50-74 (sedang).'], [WARNA.baik, 'Hijau', 'Tes: >= 80% (sudah baik). Survei: >= 75 (baik).']];
    leg.forEach(([rgb, nm, ket]) => { L.ruang(6); doc.setFillColor(...rgb); doc.circle(L.MX + 2, L.y + 2.2, 1.3, 'F'); L.font(8.4, true); L.warna(WARNA.teks); doc.text(nm, L.MX + 5.5, L.y + 3); L.font(8.4, false); L.warna(WARNA.mute); doc.text(t(ket), L.MX + 20, L.y + 3); L.y += 5.2; });
    L.teks('Nilai tes memakai nilai tertinggi bila satu tes dikerjakan lebih dari sekali. Tren naik/turun dihitung dari dua tes terakhir (selisih minimal 3 poin).', { size: 7.8, warna: WARNA.mute, gap: 4 });
    if (opsi.catatan) {
      L.judul('Catatan Guru');
      doc.setDrawColor(...WARNA.garis); doc.setLineWidth(0.25);
      for (let i = 0; i < 4; i++) { doc.line(L.MX, L.y + 7 * (i + 1), L.MX + L.CW, L.y + 7 * (i + 1)); }
      L.y += 30;
      L.font(8, false); L.warna(WARNA.mute);
      doc.text('Wali Kelas / Guru', L.W - L.MX - 40, L.y + 2, { align: 'center' });
      doc.line(L.W - L.MX - 70, L.y + 14, L.W - L.MX - 10, L.y + 14);
      if (ctx.guru) doc.text(t(ctx.guru), L.W - L.MX - 40, L.y + 18, { align: 'center' });
      L.y += 22;
    }
    L.selesai(ctx.namaSekolah, ctx.tanggal);
  }

  // ============================================================================================
  // LOGO SEKOLAH -> PNG (bila bisa dibaca; jika tidak, laporan dibuat tanpa logo)
  // ============================================================================================
  function ambilLogo() {
    return new Promise(res => {
      try {
        const img0 = document.querySelector('#sidebar-guru .app-logo-slot img');
        if (!img0 || !img0.src) return res(null);
        const im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res({ data: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight }); } catch (e) { res(null); } };
        im.onerror = () => res(null);
        im.src = img0.src;
      } catch (e) { res(null); }
    });
  }

  // ============================================================================================
  // DIALOG PILIHAN
  // ============================================================================================
  const D = { sid: '', cakupan: 'siswa', kelas: '', zip: true, membuat: false };
  const kelasUnik = (data) => [...new Set(data.siswa.map(s => String(s.kelas || '-').trim()))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  function pastikanModal() {
    if ($('modal-lap-pdf')) return;
    const d = document.createElement('div');
    d.id = 'modal-lap-pdf'; d.className = 'modal-backdrop hidden am-scope';
    d.setAttribute('onclick', 'if(event.target===this)LaporanPdf.tutup()');
    d.innerHTML = `<div class="modal modal-wide" role="dialog" aria-labelledby="lp-judul">
      <h3 id="lp-judul" style="margin:0 0 .15rem"><i class="fa-solid fa-file-pdf" style="color:#d6455d"></i> Laporan PDF untuk Siswa</h3>
      <p class="subtitle" style="margin:0 0 .4rem">Laporan hasil analisis yang bisa dibagikan ke siswa: nilai &amp; grafik perkembangan, materi yang kurang beserta saran belajar, dan hasil survei.</p>
      <div class="lp-body">
        <div class="lp-h">Cakupan</div>
        <label class="lp-opsi" data-c="siswa"><input type="radio" name="lp-cakupan" value="siswa"><span style="flex:1"><b>Satu siswa</b><small>Satu file PDF untuk satu siswa.</small><select id="lp-sel-siswa" onchange="LaporanPdf.ubah()"></select></span></label>
        <label class="lp-opsi" data-c="kelas"><input type="radio" name="lp-cakupan" value="kelas"><span style="flex:1"><b>Satu kelas</b><small>Semua siswa pada kelas yang dipilih.</small><select id="lp-sel-kelas" onchange="LaporanPdf.ubah()"></select></span></label>
        <label class="lp-opsi" data-c="semua"><input type="radio" name="lp-cakupan" value="semua"><span style="flex:1"><b>Seluruh siswa</b><small id="lp-n-semua">Semua kelas.</small></span></label>
        <div id="lp-format-wrap"><div class="lp-h">Format file</div>
          <label class="lp-opsi" data-f="zip"><input type="radio" name="lp-format" value="zip"><span><b>ZIP berisi satu PDF per siswa <em style="font-weight:500;color:var(--am-good,#229a66)">(disarankan)</em></b><small>Tiap siswa punya file sendiri (dikelompokkan per kelas) sehingga mudah dibagikan satu per satu.</small></span></label>
          <label class="lp-opsi" data-f="gabung"><input type="radio" name="lp-format" value="gabung"><span><b>Satu file PDF gabungan</b><small>Semua siswa dalam satu file; laporan tiap siswa dimulai di halaman baru (cocok untuk dicetak sekaligus).</small></span></label></div>
        <div class="lp-h">Isi laporan</div>
        <div class="lp-cek">
          <label><input type="checkbox" id="lp-i-progres" checked> Ringkasan &amp; grafik perkembangan nilai</label>
          <label><input type="checkbox" id="lp-i-literasi" checked> Analisis materi Literasi</label>
          <label><input type="checkbox" id="lp-i-numerasi" checked> Analisis materi Numerasi</label>
          <label><input type="checkbox" id="lp-i-karakter" checked> Survei Karakter</label>
          <label><input type="checkbox" id="lp-i-sulingjar" checked> Sulingjar</label>
          <label><input type="checkbox" id="lp-i-lainnya" checked> Mapel lain (bila ada)</label>
          <label><input type="checkbox" id="lp-i-catatan" checked> Kotak catatan guru</label>
        </div>
        <div class="lp-info" id="lp-info"></div>
        <div class="lp-prog" id="lp-prog"><i></i></div><div class="lp-status" id="lp-status" aria-live="polite"></div>
      </div>
      <div class="toolbar-actions" style="justify-content:flex-end;margin-top:.8rem">
        <button type="button" class="secondary" id="lp-tutup" onclick="LaporanPdf.tutup()">Tutup</button>
        <button type="button" id="lp-buat" onclick="LaporanPdf.buat()"><i class="fa-solid fa-download"></i> Buat PDF</button>
      </div></div>`;
    document.body.appendChild(d);
    d.querySelectorAll('input[name="lp-cakupan"]').forEach(r => r.addEventListener('change', () => { D.cakupan = r.value; segarkanTampilan(); }));
    d.querySelectorAll('input[name="lp-format"]').forEach(r => r.addEventListener('change', () => { D.zip = r.value === 'zip'; segarkanTampilan(); }));
  }
  function daftarTerpilih() {
    const data = AM().dataLaporan();
    if (D.cakupan === 'siswa') { const s = data.siswa.find(x => String(x.id) === String($('lp-sel-siswa').value)); return s ? [s] : []; }
    if (D.cakupan === 'kelas') return data.siswa.filter(x => String(x.kelas || '-').trim() === $('lp-sel-kelas').value);
    return data.siswa.slice();
  }
  function segarkanTampilan() {
    const m = $('modal-lap-pdf'); if (!m) return;
    m.querySelectorAll('.lp-opsi[data-c]').forEach(l => { const on = l.dataset.c === D.cakupan; l.classList.toggle('on', on); l.querySelector('input').checked = on; });
    m.querySelectorAll('.lp-opsi[data-f]').forEach(l => { const on = (l.dataset.f === 'zip') === D.zip; l.classList.toggle('on', on); l.querySelector('input').checked = on; });
    $('lp-format-wrap').style.display = D.cakupan === 'siswa' ? 'none' : '';
    $('lp-sel-siswa').disabled = D.cakupan !== 'siswa'; $('lp-sel-kelas').disabled = D.cakupan !== 'kelas';
    const n = daftarTerpilih().length;
    const hasil = D.cakupan === 'siswa' ? '1 file PDF' : (D.zip ? 'file ZIP berisi ' + n + ' PDF' : '1 file PDF (' + n + ' siswa)');
    $('lp-info').innerHTML = n ? `<b>${n} siswa</b> akan dibuatkan laporan &rarr; ${hasil}.` : 'Belum ada siswa dengan data pada pilihan ini.';
    $('lp-buat').disabled = !n || D.membuat;
  }
  async function buka(sid) {
    if (typeof state === 'undefined' || !state.user || state.user.role === 'siswa') return;
    pastikanModal();
    let data = AM().dataLaporan();
    if (!data.dimuat) { toast('Memuat data analisis...'); try { await AM().muatData(); } catch (e) { } data = AM().dataLaporan(); }
    if (!data.siswa.length) { toast('Belum ada data siswa untuk dibuatkan laporan.', 'error'); return; }
    const urut = data.siswa.slice().sort((a, b) => String(a.kelas).localeCompare(String(b.kelas), 'id', { numeric: true }) || String(a.nama).localeCompare(String(b.nama), 'id'));
    $('lp-sel-siswa').innerHTML = urut.map(s => `<option value="${esc(s.id)}">${esc(s.nama)} — ${esc(s.kelas)}</option>`).join('');
    const kls = kelasUnik(data);
    $('lp-sel-kelas').innerHTML = kls.map(k => `<option value="${esc(k)}">Kelas ${esc(k)} (${data.siswa.filter(s => String(s.kelas || '-').trim() === k).length} siswa)</option>`).join('');
    $('lp-n-semua').textContent = 'Semua kelas — ' + data.siswa.length + ' siswa.';
    const adaLain = data.siswa.some(s => s.jenis.lainnya);
    $('lp-i-lainnya').closest('label').style.display = adaLain ? '' : 'none';
    if (sid && typeof sid === 'string') { D.cakupan = 'siswa'; $('lp-sel-siswa').value = sid; }
    else if (data.kelas) { D.cakupan = 'kelas'; $('lp-sel-kelas').value = data.kelas; }
    else D.cakupan = 'semua';
    $('lp-prog').style.display = 'none'; $('lp-status').textContent = '';
    segarkanTampilan();
    $('modal-lap-pdf').classList.remove('hidden');
  }
  const ubah = () => segarkanTampilan();
  function tutup() { if (D.membuat) return; const m = $('modal-lap-pdf'); if (m) m.classList.add('hidden'); }

  // ============================================================================================
  // PEMBUATAN BERKAS
  // ============================================================================================
  function unduhBlob(blob, nama) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  const jeda = () => new Promise(r => setTimeout(r, 0));
  async function buat() {
    if (D.membuat) return;
    const daftar = daftarTerpilih(); if (!daftar.length) { toast('Tidak ada siswa pada pilihan ini.', 'error'); return; }
    const data = AM().dataLaporan();
    const opsi = { progres: $('lp-i-progres').checked, catatan: $('lp-i-catatan').checked, jenis: {} };
    ['literasi', 'numerasi', 'karakter', 'sulingjar', 'lainnya'].forEach(k => { opsi.jenis[k] = $('lp-i-' + k).checked; });
    if (!opsi.progres && !Object.values(opsi.jenis).some(Boolean)) { toast('Pilih minimal satu isi laporan.', 'error'); return; }
    D.membuat = true; $('lp-buat').disabled = true; $('lp-tutup').disabled = true;
    const prog = $('lp-prog'), bar = prog.querySelector('i'), st = $('lp-status');
    prog.style.display = 'block'; bar.style.width = '0'; st.textContent = 'Menyiapkan pustaka PDF...';
    try {
      await muatPustaka_('jspdf');
      const banyak = D.cakupan !== 'siswa';
      if (banyak && D.zip) await muatPustaka_('jszip');
      const { namaSekolah } = Guru._identitasSekolah_();
      const logo = await ambilLogo();
      const ctx = { namaSekolah, logo, tanggal: tglPanjang(), guru: (state.user && state.user.nama) || '' };
      const { jsPDF } = window.jspdf;
      const baru = () => { const d = new jsPDF({ unit: 'mm', format: 'a4', compress: true }); d.setProperties({ title: 'Laporan Hasil Belajar', author: namaSekolah, creator: namaSekolah }); return d; };
      const urut = daftar.slice().sort((a, b) => String(a.kelas).localeCompare(String(b.kelas), 'id', { numeric: true }) || String(a.nama).localeCompare(String(b.nama), 'id'));
      const label = D.cakupan === 'siswa' ? namaBerkas(urut[0].nama) : (D.cakupan === 'kelas' ? 'Kelas ' + namaBerkas($('lp-sel-kelas').value) : 'Seluruh Siswa');
      if (!banyak) {
        const doc = baru(); tulisLaporan(doc, urut[0], data, opsi, ctx);
        bar.style.width = '100%';
        unduhBlob(doc.output('blob'), 'Laporan - ' + label + ' (' + namaBerkas(urut[0].kelas) + ').pdf');
        st.textContent = 'Selesai.'; toast('Laporan PDF berhasil dibuat.', 'success');
      } else if (!D.zip) {
        const doc = baru();
        for (let i = 0; i < urut.length; i++) {
          if (i > 0) doc.addPage();
          tulisLaporan(doc, urut[i], data, opsi, ctx);
          bar.style.width = Math.round((i + 1) / urut.length * 100) + '%'; st.textContent = 'Membuat laporan ' + (i + 1) + ' dari ' + urut.length + '...';
          if (i % 3 === 2) await jeda();
        }
        unduhBlob(doc.output('blob'), 'Laporan - ' + label + '.pdf');
        st.textContent = 'Selesai: ' + urut.length + ' laporan dalam satu PDF.'; toast('Laporan PDF (' + urut.length + ' siswa) berhasil dibuat.', 'success');
      } else {
        const zip = new JSZip(), terpakai = new Set();
        for (let i = 0; i < urut.length; i++) {
          const sw = urut[i], doc = baru();
          tulisLaporan(doc, sw, data, opsi, ctx);
          let jalur = (D.cakupan === 'semua' ? 'Kelas ' + namaBerkas(sw.kelas) + '/' : '') + 'Laporan - ' + namaBerkas(sw.nama), n = 1;
          while (terpakai.has(jalur.toLowerCase())) jalur = jalur.replace(/ \(\d+\)$/, '') + ' (' + (++n) + ')';
          terpakai.add(jalur.toLowerCase());
          zip.file(jalur + '.pdf', doc.output('arraybuffer'));
          bar.style.width = Math.round((i + 1) / urut.length * 92) + '%'; st.textContent = 'Membuat laporan ' + (i + 1) + ' dari ' + urut.length + '...';
          if (i % 2 === 1) await jeda();
        }
        st.textContent = 'Mengemas ZIP...';
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        bar.style.width = '100%';
        unduhBlob(blob, 'Laporan Siswa - ' + label + '.zip');
        st.textContent = 'Selesai: ' + urut.length + ' PDF dalam satu ZIP.'; toast('ZIP laporan ' + urut.length + ' siswa berhasil dibuat.', 'success');
      }
    } catch (e) {
      st.textContent = 'Gagal: ' + ((e && e.message) || 'terjadi kesalahan.'); toast('Gagal membuat PDF: ' + ((e && e.message) || ''), 'error');
    } finally {
      D.membuat = false; $('lp-tutup').disabled = false; segarkanTampilan();
    }
  }

  return { buka, tutup, ubah, buat, _tulis: tulisLaporan, _t: t };
})();
