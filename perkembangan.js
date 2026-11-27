/* ============================================================================
   PERKEMBANGAN — grafik perkembangan skor Tes 1, Tes 2, Tes 3, ... (naik / stabil / turun).
   - Pustaka bersama (dipakai Portal Siswa lewat portal-siswa.js):
       Perkembangan.susunTes()  mengelompokkan nilai per "Tes" (Literasi / Numerasi / Rata-rata)
       Perkembangan.tren()      menghitung arah perubahan (naik / stabil / turun)
       Perkembangan.pasang()    menggambar grafik garis SVG yang responsif (tanpa pustaka luar)
   - Portal Guru: tab "Perkembangan Siswa" — rata-rata kelas per tes, siapa yang naik / turun,
     grafik tiap siswa (dibanding rata-rata kelas), unduh Excel & cetak PDF.
   ATURAN
   * Tes dikelompokkan dari judul ujian (kata Literasi/Numerasi dibuang): "Tes 1 Literasi" + "Tes 1 Numerasi"
     => "Tes 1". Urutan: menurut angka pada nama tes; bila tidak semua bernomor, menurut tanggal.
   * Nilai tes = nilai TERTINGGI bila satu ujian dikerjakan lebih dari sekali. Rata-rata = rata-rata nilai
     yang ada pada tes itu. Siswa yang diblokir tidak dihitung.
   * Tren = perubahan Rata-rata pada dua tes terakhir: >= +3 naik, <= -3 turun, selain itu stabil.
   Memakai aksi getAnalisisMateri (guru) yang sudah ada -> tidak perlu aksi server baru untuk sisi guru.
   Dimuat SETELAH analisis-materi.js.
   ============================================================================ */
'use strict';
const Perkembangan = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const bulat = (n) => Math.round(Number(n) || 0);
  const r1 = (n) => Math.round(Number(n) * 10) / 10;
  const fmt = (n) => (n == null || isNaN(n)) ? '–' : r1(n).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const fmtD = (n) => (n > 0 ? '+' : (n < 0 ? '−' : '')) + Math.abs(r1(n)).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const AMBANG_TREN = 3;
  const SERI = {
    literasi: { nama: 'Literasi', warna: '#2563eb', marker: 'circle' },
    numerasi: { nama: 'Numerasi', warna: '#ea580c', marker: 'square' },
    lainnya: { nama: 'Mapel Lain', warna: '#7c3aed', marker: 'diamond' },
    akhir: { nama: 'Rata-rata', warna: '#059669', marker: 'circle' },
    kelas: { nama: 'Rata-rata kelas', warna: '#64748b', marker: 'diamond', putus: true }
  };
  const URUT = ['literasi', 'numerasi', 'lainnya'];

  // ---------------- gaya ----------------
  (function () {
    if (document.getElementById('perkembangan-css-inline')) return;
    const st = document.createElement('style'); st.id = 'perkembangan-css-inline';
    st.textContent = `
.pg-chart { width: 100%; position: relative; }
.pg-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.pg-chart text { font-family: inherit; fill: var(--am-mute, #6c757d); }
.pg-chart .pg-grid { stroke: var(--am-line, #dee2e6); stroke-width: 1; stroke-dasharray: 3 4; }
.pg-chart .pg-axis { stroke: var(--am-line, #dee2e6); stroke-width: 1.2; }
.pg-chart .pg-yt { font-size: 11px; text-anchor: end; }
.pg-chart .pg-xt { font-size: 11.5px; text-anchor: middle; font-weight: 600; fill: var(--am-text, #212529); }
.pg-chart .pg-val { font-size: 11px; font-weight: 700; text-anchor: middle; paint-order: stroke; stroke: var(--am-surf, #fff); stroke-width: 3.5px; stroke-linejoin: round; }
.pg-chart .pg-line { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.pg-chart .pg-line.putus { stroke-dasharray: 6 5; stroke-width: 2.2; }
.pg-chart .pg-pt { cursor: default; }
.pg-chart .pg-pt .pg-halo { fill: transparent; }
.pg-chart .pg-pt:hover .pg-halo { fill: rgba(100,116,139,.14); }
.pg-chart .pg-anim { stroke-dasharray: 1; stroke-dashoffset: 1; animation: pgDraw 900ms ease-out forwards; }
.pg-chart .pg-anim-fade { opacity: 0; animation: pgFade 700ms ease-out 350ms forwards; }
@keyframes pgDraw { to { stroke-dashoffset: 0; } }
@keyframes pgFade { to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .pg-chart .pg-anim { animation: none; stroke-dashoffset: 0; } .pg-chart .pg-anim-fade { animation: none; opacity: 1; } }
.pg-legend { display: flex; flex-wrap: wrap; gap: .35rem 1rem; justify-content: center; margin: .35rem 0 0; font-size: .78rem; color: var(--am-text, #212529); }
.pg-legend span { display: inline-flex; align-items: center; gap: .35rem; font-weight: 600; }
.pg-legend svg { width: 26px; height: 12px; flex: 0 0 auto; }
.pg-kosong { text-align: center; padding: 1.6rem 1rem; color: var(--am-mute, #6c757d); font-size: .88rem; line-height: 1.55; }
.pg-kosong i { font-size: 2.2rem; display: block; margin-bottom: .5rem; opacity: .5; }
.pg-tren { display: inline-flex; align-items: center; gap: .25rem; padding: .12rem .6rem; border-radius: 999px; font-size: .74rem; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pg-tren.naik { background: color-mix(in srgb, #229a66 15%, var(--am-surf, #fff)); color: #1b7f53; }
.pg-tren.turun { background: color-mix(in srgb, #d6455d 14%, var(--am-surf, #fff)); color: #c0334a; }
.pg-tren.stabil { background: color-mix(in srgb, #dc8f12 16%, var(--am-surf, #fff)); color: #a76705; }
.pg-tren.baru { background: var(--am-hover, #f3f7fe); color: var(--am-mute, #6c757d); }
.pg-insight { margin: .6rem 0 0; padding: 0; list-style: none; display: grid; gap: .4rem; }
.pg-insight li { display: flex; gap: .55rem; align-items: flex-start; font-size: .85rem; line-height: 1.5; color: var(--am-text, #212529); padding: .5rem .75rem; border-radius: 10px; background: var(--am-hover, #f3f7fe); border: 1px solid var(--am-line, #dee2e6); }
.pg-insight li i { margin-top: .2rem; }
.pg-insight li.naik i { color: #1b7f53; } .pg-insight li.turun i { color: #c0334a; } .pg-insight li.stabil i { color: #a76705; } .pg-insight li.info i { color: var(--am-prim, #0d6efd); }
/* ---- tab guru ---- */
#tab-perkembangan .pg-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .7rem; margin: 0 0 1rem; }
#tab-perkembangan .pg-stat { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 14px; padding: .75rem .95rem; box-shadow: var(--shadow); border-top: 4px solid var(--c-line); }
#tab-perkembangan .pg-stat.naik { border-top-color: #229a66; } #tab-perkembangan .pg-stat.turun { border-top-color: #d6455d; } #tab-perkembangan .pg-stat.stabil { border-top-color: #dc8f12; }
#tab-perkembangan .pg-stat b { display: block; font-size: 1.45rem; line-height: 1.25; color: var(--c-text); }
#tab-perkembangan .pg-stat span { font-size: .72rem; font-weight: 600; letter-spacing: .03em; color: var(--c-muted); }
#tab-perkembangan .pg-card-h { display: flex; align-items: baseline; gap: .6rem; flex-wrap: wrap; margin: 0 0 .5rem; }
#tab-perkembangan .pg-card-h h3 { margin: 0; font-size: 1.02rem; }
#tab-perkembangan .pg-card-h small { color: var(--c-muted); }
#tab-perkembangan .pg-scroll { overflow: auto; max-height: 72vh; border: 1px solid var(--c-line); border-radius: 14px; }
#tab-perkembangan table.pg-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
#tab-perkembangan table.pg-table th { position: sticky; top: 0; z-index: 2; background: var(--c-surface); text-align: left; padding: .6rem .6rem; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; color: var(--c-muted); border-bottom: 2px solid var(--c-line); white-space: nowrap; }
#tab-perkembangan table.pg-table td { padding: .5rem .6rem; border-bottom: 1px solid var(--c-line); vertical-align: middle; }
#tab-perkembangan table.pg-table tbody tr:hover td { background: var(--c-hover); }
@media (max-width: 900px) {
  #tab-perkembangan table.pg-table td:nth-child(2) { position: sticky; left: 0; z-index: 1; background: var(--c-surface); box-shadow: 1px 0 0 var(--c-line); }
  #tab-perkembangan table.pg-table th:nth-child(2) { left: 0; z-index: 3; box-shadow: 1px 0 0 var(--c-line); }
  #tab-perkembangan .pg-scroll { -webkit-overflow-scrolling: touch; }
}
#tab-perkembangan .pg-nama { font-weight: 700; min-width: 150px; color: var(--c-text); }
#tab-perkembangan .pg-n { font-variant-numeric: tabular-nums; text-align: center; font-weight: 700; }
#tab-perkembangan .pg-n.rendah { color: #c0334a; } #tab-perkembangan .pg-n.tinggi { color: #1b7f53; } #tab-perkembangan .pg-n.kosong { color: var(--c-muted); font-weight: 400; }
#modal-pg-detail .modal { max-width: 860px; }
#modal-pg-detail .pg-dbody { max-height: 70vh; overflow: auto; padding-right: .2rem; }
#modal-pg-detail table.pg-dtabel { width: 100%; border-collapse: collapse; font-size: .85rem; margin-top: .8rem; }
#modal-pg-detail table.pg-dtabel th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--am-mute, #6c757d); padding: .4rem .5rem; border-bottom: 2px solid var(--am-line, #dee2e6); }
#modal-pg-detail table.pg-dtabel td { padding: .45rem .5rem; border-bottom: 1px solid var(--am-line, #dee2e6); font-variant-numeric: tabular-nums; }
@media print { #cetak-area table.pg-print { width: 100%; border-collapse: collapse; font-size: 9pt; } #cetak-area table.pg-print th { padding: 3px 5px; background: #e9edf2 !important; border: 1px solid #9aa1ab; text-align: left; } #cetak-area table.pg-print td { padding: 3px 5px; border: 1px solid #c9ced6; text-align: center; } #cetak-area table.pg-print td.pg-l { text-align: left; } #cetak-area table.pg-print thead { display: table-header-group; } #cetak-area table.pg-print tr { break-inside: avoid; } #cetak-area .pg-catatan { margin: 6px 0 0; font-size: 8.5pt; color: #444; } }`;
    document.head.appendChild(st);
  })();

  // ============================================================================================
  // PENGELOMPOKAN TES (sama dengan aturan Leaderboard)
  // ============================================================================================
  function jenisTeks(txt) {
    const t = norm(txt), a = t.indexOf('literasi'), b = t.indexOf('numerasi');
    if (a < 0 && b < 0) return '';
    if (a >= 0 && b >= 0) return a < b ? 'literasi' : 'numerasi';
    return a >= 0 ? 'literasi' : 'numerasi';
  }
  const jenisItem = (it) => jenisTeks(it.judul) || jenisTeks(it.kategori) || 'lainnya';
  function labelTes(judul) {
    let t = String(judul || '').replace(/literasi|numerasi/gi, ' ');
    t = t.replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/^[\s\-–—:|\/,_.]+|[\s\-–—:|\/,_.]+$/g, '').trim();
    return t || 'Tes';
  }
  function urutTes(list) {
    const semuaAngka = list.every(t => /\d/.test(t.label));
    const angka = (t) => { const m = String(t.label).match(/\d+/); return m ? parseFloat(m[0]) : 0; };
    return list.sort((a, b) => semuaAngka
      ? (angka(a) - angka(b)) || a.label.localeCompare(b.label, 'id', { numeric: true })
      : (a.waktu - b.waktu) || a.label.localeCompare(b.label, 'id', { numeric: true }));
  }
  const rata = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  // items: [{judul, kategori, nilai(angka), waktu(ms), rataKelas?}] -> { tes:[{key,label,waktu,nilai:{},kelas:{},akhir,kelasAkhir}], jenis:[...] }
  // `global` (opsional): daftar tes [{key,label,waktu}] agar susunan sama untuk banyak siswa.
  function susunTes(items, global) {
    const slot = {}, info = {};
    items.forEach(it => {
      if (it.nilai == null || isNaN(it.nilai)) return;
      const jenis = jenisItem(it), label = labelTes(it.judul), key = 'a:' + norm(label);
      const w = it.waktu || 0;
      if (!info[key]) info[key] = { key, label, waktu: w };
      else if (w && (!info[key].waktu || w < info[key].waktu)) info[key].waktu = w;
      const s = slot[key] = slot[key] || { nilai: {}, kelas: {}, ref: {} };
      if (s.nilai[jenis] == null || it.nilai > s.nilai[jenis]) { s.nilai[jenis] = it.nilai; s.kelas[jenis] = it.rataKelas == null ? null : it.rataKelas; s.ref[jenis] = it.ref || null; }
    });
    const daftar = global ? global.map(g => ({ key: g.key, label: g.label, waktu: g.waktu })) : urutTes(Object.keys(info).map(k => info[k]));
    const jenisAda = new Set();
    const tes = daftar.map(t => {
      const s = slot[t.key] || { nilai: {}, kelas: {}, ref: {} };
      Object.keys(s.nilai).forEach(j => jenisAda.add(j));
      const ada = Object.keys(s.nilai).map(j => s.nilai[j]);
      const adaK = Object.keys(s.nilai).map(j => s.kelas[j]).filter(v => v != null);
      return { key: t.key, label: t.label, waktu: t.waktu, nilai: s.nilai, kelas: s.kelas, ref: s.ref, akhir: rata(ada), kelasAkhir: rata(adaK) };
    });
    return { tes, jenis: URUT.filter(j => jenisAda.has(j)) };
  }
  const deret = (tes, kunci) => tes.map(t => kunci === 'akhir' ? t.akhir : (kunci === 'kelas' ? t.kelasAkhir : (t.nilai[kunci] == null ? null : t.nilai[kunci])));

  // ============================================================================================
  // TREN
  // ============================================================================================
  function tren(arr) {
    const v = []; arr.forEach((x, i) => { if (x != null && !isNaN(x)) v.push({ x, i }); });
    if (v.length < 2) return { arah: 'baru', delta: 0, total: 0, n: v.length, akhir: v.length ? v[0].x : null, sebelum: null, awal: v.length ? v[0].x : null, iAkhir: v.length ? v[0].i : -1, iSebelum: -1 };
    const a = v[v.length - 2], b = v[v.length - 1], d = b.x - a.x;
    return { arah: d >= AMBANG_TREN ? 'naik' : (d <= -AMBANG_TREN ? 'turun' : 'stabil'), delta: d, total: b.x - v[0].x, n: v.length, akhir: b.x, sebelum: a.x, awal: v[0].x, iAkhir: b.i, iSebelum: a.i };
  }
  function badgeTren(t, opsi) {
    const o = opsi || {};
    if (t.arah === 'baru') return `<span class="pg-tren baru">${o.pendek ? '–' : 'Data awal'}</span>`;
    const ikon = t.arah === 'naik' ? '▲' : (t.arah === 'turun' ? '▼' : '●');
    const teks = t.arah === 'naik' ? 'Naik' : (t.arah === 'turun' ? 'Turun' : 'Stabil');
    return `<span class="pg-tren ${t.arah}" title="Perubahan dari tes sebelumnya ke tes terakhir">${ikon} ${o.pendek ? '' : teks + ' '}${t.arah === 'stabil' ? fmtD(t.delta) : fmtD(t.delta)}</span>`;
  }
  // kalimat penjelas otomatis
  function wawasan(tesData, ops) {
    const o = ops || {}, tes = tesData.tes, out = [];
    const tambah = (kls, ikon, teks) => out.push(`<li class="${kls}"><i class="fa-solid ${ikon}"></i><span>${teks}</span></li>`);
    const kunci = ['akhir'].concat(tesData.jenis.length > 1 ? tesData.jenis : []);
    kunci.forEach(k => {
      const arr = deret(tes, k), t = tren(arr), nama = k === 'akhir' ? 'Rata-rata nilai' : SERI[k].nama;
      if (t.arah === 'baru') return;
      const dari = tes[t.iSebelum].label, ke = tes[t.iAkhir].label;
      const abs = fmt(Math.abs(t.delta));
      if (t.arah === 'naik') tambah('naik', 'fa-arrow-trend-up', `<b>${esc(nama)}</b> naik <b>${abs} poin</b> dari ${esc(dari)} ke ${esc(ke)} (${fmt(t.sebelum)} → ${fmt(t.akhir)}).`);
      else if (t.arah === 'turun') tambah('turun', 'fa-arrow-trend-down', `<b>${esc(nama)}</b> turun <b>${abs} poin</b> dari ${esc(dari)} ke ${esc(ke)} (${fmt(t.sebelum)} → ${fmt(t.akhir)}).${o.guru ? ' Perlu pendampingan.' : ' Yuk cek analisis materi untuk tahu bagian yang perlu diperkuat.'}`);
      else tambah('stabil', 'fa-minus', `<b>${esc(nama)}</b> relatif stabil dari ${esc(dari)} ke ${esc(ke)} (${fmt(t.sebelum)} → ${fmt(t.akhir)}).`);
    });
    const akh = deret(tes, 'akhir').map((v, i) => ({ v, i })).filter(x => x.v != null);
    if (akh.length >= 2) {
      const maks = akh.reduce((a, b) => b.v > a.v ? b : a), tot = tren(deret(tes, 'akhir'));
      tambah('info', 'fa-trophy', `Nilai rata-rata tertinggi: <b>${fmt(maks.v)}</b> pada ${esc(tes[maks.i].label)}.` + (akh.length >= 3 ? ` Dari awal sampai tes terakhir, perubahannya ${tot.total >= 0 ? 'naik' : 'turun'} <b>${fmt(Math.abs(tot.total))} poin</b>.` : ''));
    }
    const kl = deret(tes, 'kelas');
    const a = akh.length ? akh[akh.length - 1] : null;
    if (a && kl[a.i] != null) {
      const sel = a.v - kl[a.i];
      tambah(sel >= 0 ? 'naik' : 'turun', 'fa-people-group', `Pada ${esc(tes[a.i].label)}, nilai rata-rata ${sel >= 0 ? 'di atas' : 'di bawah'} rata-rata kelas (${fmt(kl[a.i])}) sebesar <b>${fmt(Math.abs(sel))} poin</b>.`);
    }
    return out.length ? `<ul class="pg-insight">${out.join('')}</ul>` : '';
  }

  // ============================================================================================
  // GRAFIK GARIS SVG
  // ============================================================================================
  let cacahGrad = 0;
  function penanda(tipe, x, y, warna, r) {
    const s = `fill="${warna}" stroke="#fff" stroke-width="2"`;
    if (tipe === 'square') return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="2" ${s}/>`;
    if (tipe === 'diamond') return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="1.5" transform="rotate(45 ${x} ${y})" ${s}/>`;
    return `<circle cx="${x}" cy="${y}" r="${r + 0.5}" ${s}/>`;
  }
  function potong(t, maks) { t = String(t); return t.length > maks ? t.slice(0, Math.max(1, maks - 1)) + '…' : t; }
  // o: { labels:[], seri:[{kunci,nama,warna,marker,nilai:[],putus,area,label}], lebar, tinggi, anim, judul }
  function garis(o) {
    const W = Math.max(300, Math.round(o.lebar || 640)), H = o.tinggi || (W < 480 ? 250 : 300);
    const m = { l: 36, r: 12, t: 24, b: 38 }, pw = W - m.l - m.r, ph = H - m.t - m.b, n = o.labels.length;
    const X = (i) => m.l + pw * (i + 0.5) / n, Y = (v) => m.t + ph * (1 - Math.max(0, Math.min(100, v)) / 100);
    const maksChar = Math.max(4, Math.floor((pw / n) / 6.4));
    const anim = o.anim !== false;
    let defs = '', g = '';
    [0, 25, 50, 75, 100].forEach(v => { g += `<line class="pg-grid" x1="${m.l}" y1="${Y(v)}" x2="${W - m.r}" y2="${Y(v)}"/><text class="pg-yt" x="${m.l - 7}" y="${Y(v) + 4}">${v}</text>`; });
    g += `<line class="pg-axis" x1="${m.l}" y1="${Y(0)}" x2="${W - m.r}" y2="${Y(0)}"/>`;
    o.labels.forEach((l, i) => { g += `<text class="pg-xt" x="${X(i)}" y="${H - m.b + 20}"><title>${esc(l)}</title>${esc(potong(l, maksChar))}</text>`; });
    const nSeri = o.seri.length;
    o.seri.forEach((s, si) => {
      const w = s.warna, seg = []; let cur = [];
      s.nilai.forEach((v, i) => { if (v == null || isNaN(v)) { if (cur.length) seg.push(cur); cur = []; } else cur.push(i); });
      if (cur.length) seg.push(cur);
      const tunda = si * 120;
      seg.forEach(idx => {
        if (idx.length < 2) return;
        const d = idx.map((i, k) => (k ? 'L' : 'M') + X(i) + ' ' + Y(s.nilai[i])).join(' ');
        if (s.area) {
          const id = 'pgG' + (++cacahGrad);
          defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w}" stop-opacity=".22"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></linearGradient>`;
          g += `<path class="${anim ? 'pg-anim-fade' : ''}" d="${d} L${X(idx[idx.length - 1])} ${Y(0)} L${X(idx[0])} ${Y(0)} Z" fill="url(#${id})" stroke="none"/>`;
        }
        g += `<path class="pg-line${s.putus ? ' putus' : ''}${anim && !s.putus ? ' pg-anim' : ''}" ${anim && !s.putus ? 'pathLength="1"' : ''} style="${anim && !s.putus ? 'animation-delay:' + tunda + 'ms;' : ''}" d="${d}" stroke="${w}"/>`;
      });
    });
    const labelPts = {};
    o.seri.forEach((s, si) => {
      const w = s.warna, idxAda = s.nilai.map((v, i) => (v == null || isNaN(v)) ? -1 : i).filter(i => i >= 0);
      const lastI = idxAda.length ? idxAda[idxAda.length - 1] : -1;
      idxAda.forEach(i => {
        const v = s.nilai[i], x = X(i), y = Y(v);
        const tampil = s.label === true || (s.label !== false && (nSeri <= 2 || i === lastI));
        g += `<g class="pg-pt ${anim ? 'pg-anim-fade' : ''}"><title>${esc(o.labels[i])} — ${esc(s.nama)}: ${fmt(v)}</title><circle class="pg-halo" cx="${x}" cy="${y}" r="15"/>${penanda(s.marker, x, y, w, 4.5)}</g>`;
        if (tampil) (labelPts[i] = labelPts[i] || []).push({ x, y, v, w });
      });
    });
    // letak label nilai: bila titik berdekatan, yang tertinggi di atas, terendah di bawah, sisanya di samping
    Object.keys(labelPts).forEach(k => {
      const grup = labelPts[k].sort((a, b) => a.y - b.y);
      const bentrok = grup.some((p, i) => i > 0 && p.y - grup[i - 1].y < 17);
      grup.forEach((p, i) => {
        let tx = p.x, ty = p.y - 11, anc = 'middle';
        if (bentrok && grup.length > 1) {
          if (i === grup.length - 1) ty = p.y + 19;
          else if (i > 0) { const kanan = (i % 2) === 1; tx = p.x + (kanan ? 11 : -11); ty = p.y + 4; anc = kanan ? 'start' : 'end'; }
        }
        g += `<text class="pg-val ${anim ? 'pg-anim-fade' : ''}" x="${tx}" y="${ty}" style="fill:${p.w};text-anchor:${anc}">${fmt(p.v)}</text>`;
      });
    });
    const legenda = o.seri.map(s => `<span><svg viewBox="0 0 26 12" aria-hidden="true"><line x1="1" y1="6" x2="25" y2="6" stroke="${s.warna}" stroke-width="2.4" ${s.putus ? 'stroke-dasharray="5 4"' : ''} stroke-linecap="round"/>${penanda(s.marker, 13, 6, s.warna, 3.6)}</svg>${esc(s.nama)}</span>`).join('');
    const ringkasan = o.seri.map(s => s.nama + ': ' + s.nilai.map((v, i) => o.labels[i] + ' ' + (v == null ? 'tidak ada' : fmt(v))).join(', ')).join('. ');
    return `<div class="pg-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc((o.judul || 'Grafik perkembangan nilai') + '. ' + ringkasan)}"><defs>${defs}</defs>${g}</svg><div class="pg-legend">${legenda}</div></div>`;
  }
  // gambar ke dalam wadah dan gambar ulang bila lebarnya berubah (HP diputar, jendela diubah)
  function pasang(wadah, buat) {
    if (!wadah) return;
    let pertama = true;
    const gambar = () => { wadah.innerHTML = buat(wadah.clientWidth || 640, pertama); pertama = false; };
    gambar();
    if (wadah._pgRo) { try { wadah._pgRo.disconnect(); } catch (e) { } }
    if (window.ResizeObserver) {
      let last = wadah.clientWidth;
      wadah._pgRo = new ResizeObserver(() => { const c = wadah.clientWidth; if (c && Math.abs(c - last) > 24) { last = c; gambar(); } });
      wadah._pgRo.observe(wadah);
    }
  }
  // grafik standar dari hasil susunTes
  function grafikTes(tesData, o) {
    const op = o || {};
    const seri = [];
    const pilih = op.tampil || null;
    const ada = (k) => !pilih || pilih.indexOf(k) >= 0;
    if (ada('akhir')) seri.push({ kunci: 'akhir', nama: SERI.akhir.nama, warna: SERI.akhir.warna, marker: 'circle', nilai: deret(tesData.tes, 'akhir'), area: tesData.jenis.length > 1 || op.areaSelalu, label: true });
    tesData.jenis.forEach(j => { if (ada(j)) seri.push({ kunci: j, nama: SERI[j].nama, warna: SERI[j].warna, marker: SERI[j].marker, nilai: deret(tesData.tes, j), label: op.labelSemua ? true : undefined }); });
    if (op.kelas && ada('kelas') && deret(tesData.tes, 'kelas').some(v => v != null)) seri.push({ kunci: 'kelas', nama: op.namaKelas || SERI.kelas.nama, warna: SERI.kelas.warna, marker: 'diamond', putus: true, nilai: deret(tesData.tes, 'kelas'), label: false });
    return garis({ labels: tesData.tes.map(t => t.label), seri, lebar: op.lebar, tinggi: op.tinggi, anim: op.anim, judul: op.judul });
  }

  // ============================================================================================
  // TAB GURU: PERKEMBANGAN SISWA
  // ============================================================================================
  const P = { guruId: null, siswa: [], tes: [], dimuat: false, memuat: false, waktu: 0, kelas: '', urut: 'turun', detailId: null };

  function olahGuru(res) {
    const ujian = {}; (res.ujian || []).forEach(u => { ujian[u.id] = u; });
    const per = new Map(); const itemsAll = [];
    (res.sesi || []).forEach(s => {
      const u = ujian[s.u]; if (!u) return;
      const nilai = Number(s.nl); if (s.nl === '' || s.nl == null || isNaN(nilai)) return;
      const it = { judul: u.judul, kategori: u.kategori, nilai, waktu: Date.parse(s.sl) || 0 };
      itemsAll.push(it);
      let sw = per.get(s.si); if (!sw) { sw = { id: s.si, nama: s.nm, kelas: s.kl, items: [] }; per.set(s.si, sw); }
      sw.items.push(it);
    });
    // daftar tes global (urutan sama untuk semua siswa)
    const gInfo = {};
    itemsAll.forEach(it => {
      const l = labelTes(it.judul), k = 'a:' + norm(l);
      if (!gInfo[k]) gInfo[k] = { key: k, label: l, waktu: it.waktu };
      else if (it.waktu && (!gInfo[k].waktu || it.waktu < gInfo[k].waktu)) gInfo[k].waktu = it.waktu;
    });
    const global = urutTes(Object.keys(gInfo).map(k => gInfo[k]));
    const daftar = [];
    per.forEach(sw => {
      const td = susunTes(sw.items, global);
      sw.td = td; sw.akhir = deret(td.tes, 'akhir'); sw.tren = tren(sw.akhir);
      daftar.push(sw);
    });
    daftar.sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
    return { siswa: daftar, tes: global };
  }
  async function muat(tombol) {
    if (P.memuat) return false;
    if (typeof state === 'undefined' || !state.user || state.user.role === 'siswa') return false;
    P.memuat = true;
    const btn = (tombol && tombol.classList) ? tombol : $('pg-g-segarkan');
    if (btn) { btn.classList.add('sedang'); btn.setAttribute('aria-busy', 'true'); }
    if (!P.dimuat) { const c = $('pg-g-tabel'); if (c) c.innerHTML = '<p class="subtitle">Memuat perkembangan siswa...</p>'; }
    let ok = true;
    try {
      if (P.guruId !== state.user.id) { P.guruId = state.user.id; P.siswa = []; P.tes = []; P.dimuat = false; P.kelas = ''; }
      const res = await api('getAnalisisMateri', { guruId: state.user.id });
      if (!res || !res.ok) throw new Error((res && res.error) || 'Gagal memuat data.');
      const h = olahGuru(res); P.siswa = h.siswa; P.tes = h.tes; P.dimuat = true; P.waktu = Date.now();
    } catch (e) {
      ok = false;
      if (!P.dimuat) { const c = $('pg-g-tabel'); if (c) c.innerHTML = `<p class="subtitle">${esc((e && e.message) || 'Gagal memuat.')} Untuk Mode Server, pastikan <code>Code.gs</code> terbaru sudah dipasang.</p>`; }
      else toast('Gagal memperbarui Perkembangan Siswa. Data sebelumnya tetap ditampilkan.', 'error');
    } finally {
      P.memuat = false; if (btn) { btn.classList.remove('sedang'); btn.removeAttribute('aria-busy'); }
    }
    if (P.dimuat) render();
    try { Guru.tandaiDiperbarui_('tab-perkembangan', !ok); } catch (e) { }
    return ok;
  }
  const kelasList = () => [...new Set(P.siswa.map(s => String(s.kelas || '-').trim()))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  function baris() {
    const q = norm(($('pg-g-cari') || {}).value), hanyaTurun = !!($('pg-g-turun') && $('pg-g-turun').checked);
    let r = P.siswa.filter(s => (!P.kelas || String(s.kelas || '-').trim() === P.kelas) && (!q || norm(s.nama).indexOf(q) >= 0) && (!hanyaTurun || s.tren.arah === 'turun'));
    const nilaiAkhir = (s) => s.tren.akhir == null ? -1 : s.tren.akhir;
    const urut = {
      turun: (a, b) => (a.tren.arah === 'baru') - (b.tren.arah === 'baru') || a.tren.delta - b.tren.delta || a.nama.localeCompare(b.nama, 'id'),
      naik: (a, b) => (a.tren.arah === 'baru') - (b.tren.arah === 'baru') || b.tren.delta - a.tren.delta || a.nama.localeCompare(b.nama, 'id'),
      nilai: (a, b) => nilaiAkhir(b) - nilaiAkhir(a) || a.nama.localeCompare(b.nama, 'id'),
      nama: (a, b) => a.nama.localeCompare(b.nama, 'id')
    }[P.urut] || ((a, b) => 0);
    return r.slice().sort(urut);
  }
  function rataKelasTes(rows) {
    const tes = P.tes.map((t, i) => {
      const nilai = {}, pakai = {};
      URUT.forEach(j => { const v = rows.map(s => s.td.tes[i].nilai[j]).filter(x => x != null); if (v.length) nilai[j] = rata(v); });
      const ak = rows.map(s => s.akhir[i]).filter(x => x != null);
      return { key: t.key, label: t.label, waktu: t.waktu, nilai, kelas: {}, akhir: ak.length ? rata(ak) : null, kelasAkhir: null, n: ak.length };
    });
    const jenis = URUT.filter(j => tes.some(t => t.nilai[j] != null));
    return { tes, jenis };
  }
  function chips(w, daftar, aktif, fn) {
    w.innerHTML = daftar.map(([v, t]) => `<button type="button" class="am-chip${String(aktif) === String(v) ? ' on' : ''}" data-v="${esc(v)}" onclick="Perkembangan.${fn}(this.dataset.v)">${esc(t)}</button>`).join('');
  }
  function render() {
    if (!$('pg-g-tabel')) return;
    const sc = $('tab-perkembangan'); if (sc) sc.classList.add('am-scope');
    chips($('pg-g-chips-kelas'), [['', 'Semua Kelas']].concat(kelasList().map(k => [k, k])), P.kelas, 'pilihKelas');
    const semua = P.siswa.filter(s => !P.kelas || String(s.kelas || '-').trim() === P.kelas);
    const rows = baris();
    const hitung = (a) => semua.filter(s => s.tren.arah === a).length;
    const rk = rataKelasTes(semua);
    const trK = tren(deret(rk.tes, 'akhir'));
    $('pg-g-stats').innerHTML = `<div class="pg-stats">
      <div class="pg-stat"><b>${semua.length}</b><span>Siswa dianalisis</span></div>
      <div class="pg-stat"><b>${trK.akhir == null ? '–' : fmt(trK.akhir)} ${trK.arah !== 'baru' ? badgeTren(trK, { pendek: true }) : ''}</b><span>Rata-rata tes terakhir${rk.tes.length ? ' (' + esc(rk.tes[trK.iAkhir >= 0 ? trK.iAkhir : rk.tes.length - 1].label) + ')' : ''}</span></div>
      <div class="pg-stat naik"><b>${hitung('naik')}</b><span>Siswa naik</span></div>
      <div class="pg-stat stabil"><b>${hitung('stabil')}</b><span>Siswa stabil</span></div>
      <div class="pg-stat turun"><b>${hitung('turun')}</b><span>Siswa turun</span></div>
      <div class="pg-stat"><b>${hitung('baru')}</b><span>Baru 1 tes (belum ada tren)</span></div></div>`;
    if ($('pg-g-info')) $('pg-g-info').textContent = rows.length + ' siswa';

    // grafik rata-rata kelas
    const gw = $('pg-g-grafik');
    if (!P.siswa.length || !P.tes.length) { gw.innerHTML = ''; $('pg-g-tabel').innerHTML = `<div class="pg-kosong"><i class="fa-solid fa-chart-line"></i>Belum ada hasil tes yang bisa ditampilkan. Grafik muncul setelah siswa menyelesaikan minimal satu tes.</div>`; return; }
    $('pg-g-judul').textContent = 'Rata-rata ' + (P.kelas ? 'Kelas ' + P.kelas : 'Seluruh Kelas') + ' per Tes';
    pasang(gw, (lebar, anim) => grafikTes(rk, { lebar, anim, judul: 'Rata-rata kelas per tes' }));
    $('pg-g-wawasan').innerHTML = wawasan(rk, { guru: true });

    if (!rows.length) { $('pg-g-tabel').innerHTML = '<p class="subtitle">Tidak ada siswa yang cocok dengan filter ini.</p>'; return; }
    const kelasN = (v) => v == null ? '<td class="pg-n kosong">–</td>' : `<td class="pg-n ${v < 60 ? 'rendah' : (v >= 80 ? 'tinggi' : '')}">${fmt(v)}</td>`;
    $('pg-g-tabel').innerHTML = `<div class="pg-scroll"><table class="pg-table"><thead><tr><th>#</th><th>Nama Siswa</th><th>Kelas</th>${P.tes.map(t => `<th class="pg-n" title="Rata-rata nilai pada ${esc(t.label)}">${esc(t.label)}</th>`).join('')}<th>Perubahan terakhir</th><th>Total</th><th></th></tr></thead><tbody>` +
      rows.map((s, i) => `<tr><td>${i + 1}</td><td class="pg-nama">${esc(s.nama)}</td><td>${esc(s.kelas)}</td>${s.akhir.map(kelasN).join('')}<td>${badgeTren(s.tren)}</td><td class="pg-n ${s.tren.arah === 'baru' ? 'kosong' : ''}">${s.tren.arah === 'baru' ? '–' : fmtD(s.tren.total)}</td>
        <td><button type="button" class="am-btn" data-id="${esc(s.id)}" onclick="Perkembangan.detail(this.dataset.id)"><i class="fa-solid fa-chart-line"></i> Grafik</button></td></tr>`).join('') + '</tbody></table></div>';
  }
  const pilihKelas = (v) => { P.kelas = v; render(); };
  const pilihUrut = (v) => { P.urut = v; render(); };

  function pastikanModal() {
    if ($('modal-pg-detail')) return;
    const d = document.createElement('div');
    d.id = 'modal-pg-detail'; d.className = 'modal-backdrop hidden am-scope';
    d.setAttribute('onclick', 'if(event.target===this)Perkembangan.tutupDetail()');
    d.innerHTML = `<div class="modal modal-wide">
      <h3 style="margin:0 0 .15rem" id="pg-d-nama">-</h3>
      <p class="subtitle" style="margin:0 0 .5rem" id="pg-d-sub"></p>
      <div class="pg-dbody"><div id="pg-d-grafik"></div><div id="pg-d-wawasan"></div><div id="pg-d-tabel"></div></div>
      <div class="toolbar-actions" style="justify-content:flex-end;margin-top:.7rem"><button type="button" class="secondary" onclick="Perkembangan.tutupDetail()">Tutup</button></div></div>`;
    document.body.appendChild(d);
  }
  function detail(id) {
    const sw = P.siswa.find(s => String(s.id) === String(id)); if (!sw) return;
    pastikanModal(); P.detailId = id;
    $('pg-d-nama').textContent = sw.nama;
    $('pg-d-sub').innerHTML = `Kelas ${esc(sw.kelas)} &middot; perkembangan nilai ${esc(P.tes.map(t => t.label).join(', '))} ${badgeTren(sw.tren)}`;
    // bandingkan dengan rata-rata kelas siswa itu
    const temans = P.siswa.filter(s => String(s.kelas || '-').trim() === String(sw.kelas || '-').trim());
    const rk = rataKelasTes(temans);
    const td = { tes: sw.td.tes.map((t, i) => Object.assign({}, t, { kelasAkhir: rk.tes[i].akhir })), jenis: sw.td.jenis };
    pasang($('pg-d-grafik'), (lebar, anim) => grafikTes(td, { lebar, anim, kelas: true, namaKelas: 'Rata-rata kelas ' + sw.kelas, judul: 'Perkembangan nilai ' + sw.nama }));
    $('pg-d-wawasan').innerHTML = wawasan(td, { guru: true });
    let prev = null;
    $('pg-d-tabel').innerHTML = `<table class="pg-dtabel"><thead><tr><th>Tes</th>${td.jenis.map(j => `<th>${SERI[j].nama}</th>`).join('')}<th>Rata-rata</th><th>Perubahan</th><th>Rata-rata kelas</th></tr></thead><tbody>` +
      td.tes.map(t => {
        const d = (t.akhir != null && prev != null) ? t.akhir - prev : null; if (t.akhir != null) prev = t.akhir;
        return `<tr><td><b>${esc(t.label)}</b></td>${td.jenis.map(j => `<td>${fmt(t.nilai[j])}</td>`).join('')}<td><b>${fmt(t.akhir)}</b></td><td>${d == null ? '–' : badgeTren({ arah: d >= AMBANG_TREN ? 'naik' : (d <= -AMBANG_TREN ? 'turun' : 'stabil'), delta: d })}</td><td>${fmt(t.kelasAkhir)}</td></tr>`;
      }).join('') + '</tbody></table>';
    $('modal-pg-detail').classList.remove('hidden');
  }
  function tutupDetail() { const m = $('modal-pg-detail'); if (m) m.classList.add('hidden'); }

  async function unduh() {
    const rows = baris(); if (!rows.length) { toast('Belum ada data untuk diunduh.', 'error'); return; }
    try { await muatPustaka_('xlsx'); } catch (e) { toast(e.message, 'error'); return; }
    const head = ['No', 'Nama Siswa', 'Kelas'];
    P.tes.forEach(t => { head.push(t.label + ' - Literasi', t.label + ' - Numerasi', t.label + ' - Rata-rata'); });
    head.push('Perubahan Terakhir', 'Perubahan Total', 'Tren');
    const v = (x) => x == null ? '' : r1(x);
    const data = rows.map((s, i) => {
      const b = [i + 1, s.nama, s.kelas];
      s.td.tes.forEach(t => { b.push(v(t.nilai.literasi), v(t.nilai.numerasi), v(t.akhir)); });
      b.push(s.tren.arah === 'baru' ? '' : r1(s.tren.delta), s.tren.arah === 'baru' ? '' : r1(s.tren.total), { naik: 'Naik', turun: 'Turun', stabil: 'Stabil', baru: 'Data awal' }[s.tren.arah]);
      return b;
    });
    const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
    ws['!cols'] = [5, 30, 9].concat(P.tes.flatMap(() => [14, 14, 14]), [16, 15, 11]).map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Perkembangan');
    const bersih = (t) => String(t).replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 50);
    XLSX.writeFile(wb, 'perkembangan-siswa-' + (P.kelas ? bersih(P.kelas) : 'semua-kelas') + '.xlsx');
    toast('Perkembangan ' + rows.length + ' siswa berhasil diunduh.', 'success');
  }
  function cetak() {
    const rows = baris(); if (!rows.length) { toast('Belum ada data untuk dicetak.', 'error'); return; }
    const { namaSekolah, kop } = Guru._identitasSekolah_();
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const tr = (s) => s.tren.arah === 'baru' ? 'Data awal' : ({ naik: '▲ Naik ', turun: '▼ Turun ', stabil: '● Stabil ' }[s.tren.arah] + fmtD(s.tren.delta));
    const isi = rows.map((s, i) => `<tr><td>${i + 1}</td><td class="pg-l">${esc(s.nama)}</td><td>${esc(s.kelas)}</td>${s.akhir.map(x => `<td>${fmt(x)}</td>`).join('')}<td>${tr(s)}</td></tr>`).join('');
    const html = `${kop}<h2 class="cp-judul">Perkembangan Nilai Siswa</h2>
      <table class="cp-info"><tbody><tr><th>Kelas</th><td>: ${P.kelas ? esc(P.kelas) : 'Seluruh kelas'}</td><th>Tanggal</th><td>: ${esc(waktu)}</td></tr><tr><th>Peserta</th><td>: ${rows.length} siswa</td><th>Tes</th><td>: ${esc(P.tes.map(t => t.label).join(', '))}</td></tr></tbody></table>
      <table class="pg-print"><thead><tr><th style="width:4%">No</th><th>Nama Siswa</th><th style="width:7%">Kelas</th>${P.tes.map(t => `<th>${esc(t.label)}</th>`).join('')}<th>Tren</th></tr></thead><tbody>${isi}</tbody></table>
      <p class="pg-catatan">Nilai per tes = rata-rata nilai Literasi dan Numerasi (nilai tertinggi bila dikerjakan lebih dari sekali). Tren membandingkan dua tes terakhir: naik/turun bila selisih ≥ ${AMBANG_TREN} poin.</p>
      <footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`;
    Guru._cetakArea_(html, ['Perkembangan Siswa', P.kelas || 'Semua Kelas'].join(' - '));
  }

  const buka = () => { if (!P.dimuat || Date.now() - P.waktu > 60000) muat(); else render(); };
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) { _gantiTab.call(UI, tabId); if (tabId === 'tab-perkembangan') buka(); };

  return {
    susunTes, deret, tren, badgeTren, wawasan, garis, grafikTes, pasang, fmt, fmtD, jenisItem, labelTes, SERI, AMBANG_TREN,
    olahGuru,
    buka, muat, render, pilihKelas, pilihUrut, detail, tutupDetail, unduh, cetak
  };
})();
