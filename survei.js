/* ============================================================================
   SURVEI KARAKTER & SURVEI LINGKUNGAN BELAJAR (SULINGJAR) — latihan gaya ANBK.
   - Siswa: setelah ujian Numerasi -> Survei Karakter; setelah Literasi -> Sulingjar
     (diatur per ujian di Kelola Ujian > "Survei Setelah Ujian").
   - Seperti ANBK asli: TIDAK ADA jawaban benar/salah. Hasil berupa INDEKS 0-100 per dimensi.
   - Pelatihan "tidak asal jawab": semua butir wajib dijawab, waktu & pola jawaban dicek
     (terlalu cepat, seragam, bertentangan) lalu siswa diingatkan satu kali sebelum kirim.
   Dimuat SETELAH app.js & anbk.js.

   CATATAN: butir di bawah adalah butir LATIHAN buatan sendiri yang mengikuti dimensi
   Survei Karakter & Sulingjar ANBK; BUKAN salinan butir resmi Pusmendik. Guru dapat
   mengubah teks butir langsung di blok BUTIR_ di bawah (id butir jangan diganti).
   ============================================================================ */
'use strict';
const Survei = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const normT = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Gaya survei disisipkan langsung dari sini agar tetap tampil walau survei.css tidak ikut terunggah / tersimpan di cache.
  (function () { if (document.getElementById('survei-css-inline')) return; const st = document.createElement('style'); st.id = 'survei-css-inline'; st.textContent = `/* Survei Karakter & Sulingjar — layar siswa (gaya ANBK) + halaman hasil guru */
#survei-screen .anbk-soalbox { min-height: 300px; }
#survei-screen .anbk-nav .anbk-btn[disabled] { opacity: .45; cursor: not-allowed; filter: grayscale(.4); }
#survei-screen .anbk-nav .anbk-btn { width: auto; min-width: 170px; }
.sv-pad { padding: 20px 26px 24px; }
.sv-dim { display: inline-block; font: 600 11.5px 'Poppins', sans-serif; letter-spacing: .3px; text-transform: uppercase; color: #0d6efd; background: #e7f0ff; padding: 3px 10px; border-radius: 20px; margin-bottom: 14px; }
.sv-q { font: 400 19px/1.55 'Poppins', sans-serif; margin: 0 0 6px; color: #212529; }
.sv-ket { font-size: 12.5px; color: #6c757d; margin: 0 0 16px; }
.sv-opsi { display: flex; flex-direction: column; gap: 9px; max-width: 520px; }
.sv-o { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 1.5px solid #ced4da; border-radius: 8px; background: #fff; cursor: pointer; font: 400 15px 'Poppins', sans-serif; color: #212529; transition: border-color .12s, background .12s; -webkit-tap-highlight-color: transparent; }
.sv-o:hover { border-color: #0d6efd; }
.sv-o input { position: absolute; opacity: 0; pointer-events: none; }
.sv-r { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #8a94a0; flex: none; display: grid; place-items: center; }
.sv-o.on { border-color: #0d6efd; background: #eaf2ff; }
.sv-o.on .sv-r { border-color: #0d6efd; } .sv-o.on .sv-r::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #0d6efd; }
.sv-o:focus-within { outline: 3px solid rgba(13,110,253,.3); outline-offset: 2px; }
.sv-intro { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
.sv-intro i { font-size: 34px; color: #0d6efd; } .sv-intro h3 { margin: 0; font: 600 20px 'Poppins', sans-serif; }
.sv-p { font-size: 15.5px; line-height: 1.6; margin: 0 0 14px; color: #212529; }
.sv-ul { font-size: 14.5px; line-height: 1.6; padding-left: 20px; margin: 0; color: #212529; } .sv-ul li { margin-bottom: 7px; }
.sv-bars { display: grid; gap: 12px; max-width: 560px; margin-top: 10px; }
.sv-bar-t { display: flex; justify-content: space-between; gap: 10px; font-size: 13.5px; } .sv-bar small { font-size: 11.5px; font-weight: 600; }
.sv-bar-b { height: 8px; border-radius: 6px; background: #e9ecef; overflow: hidden; margin: 5px 0 3px; } .sv-bar-b i { display: block; height: 100%; border-radius: 6px; }
.sv-total { font-size: 16px; margin: 6px 0 10px; } .sv-total b { font-size: 22px; color: #0d6efd; }
.sv-modal-bg { position: fixed; inset: 0; z-index: 900; background: rgba(15,30,55,.55); display: grid; place-items: center; padding: 16px; }
.sv-modal { --a-blue: #0d6efd; --a-red: #dc3545; --a-yellow: #ffc107; --a-green: #198754; background: #fff; border-radius: 12px; max-width: 460px; width: 100%; padding: 22px 22px 18px; font-family: 'Poppins', sans-serif; box-shadow: 0 18px 50px rgba(0,0,0,.3); }
.sv-modal h3 { margin: 6px 0 8px; font-size: 18px; } .sv-modal p, .sv-modal li { font-size: 13.5px; line-height: 1.55; color: #343a40; } .sv-modal ul { margin: 0 0 10px; padding-left: 20px; }
.sv-modal-ico { width: 44px; height: 44px; border-radius: 50%; background: #fff3cd; color: #b26a00; display: grid; place-items: center; font-size: 20px; }
.sv-modal-aksi { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; } .sv-modal-aksi .anbk-btn { height: 34px; padding: 0 16px; font-size: 12.5px; flex: 1 1 140px; }
@media (max-width: 640px) { .sv-pad { padding: 14px 12px 18px; } .sv-q { font-size: 16.5px; } .sv-o { font-size: 14px; padding: 10px 12px; } #survei-screen .anbk-nav .anbk-btn { min-width: 0; } }

/* guru */
.sv-info { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: .85rem; margin: .2rem 0 .8rem; color: var(--c-muted); } .sv-info b { color: var(--c-text); }
.sv-warn { color: #c62828; }
.sv-kartu-wrap { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; margin-bottom: 12px; }
.sv-kartu { border: 1px solid rgba(128,128,128,.25); border-radius: 12px; padding: 12px 14px; background: var(--c-surface, rgba(255,255,255,.6)); }
.sv-kartu-t { font-size: .78rem; color: var(--c-muted); min-height: 2.4em; } .sv-kartu-n { font-size: 1.7rem; font-weight: 700; line-height: 1.2; margin: 2px 0; }
.sv-lencana { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: .75rem; font-weight: 600; white-space: nowrap; }
.sv-lemah { border: 1px dashed rgba(128,128,128,.4); border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; font-size: .84rem; }
.sv-lemah ol { margin: .4rem 0 0; padding-left: 20px; } .sv-lemah li { margin-bottom: .3rem; } .sv-lemah em { color: var(--c-muted); font-style: normal; font-size: .76rem; margin-left: 4px; }

/* pembahasan survei (detail jawaban) */
.sv-pb { font-family: inherit; }
.sv-pb-top { display: flex; flex-wrap: wrap; gap: 10px 18px; justify-content: space-between; align-items: flex-start; margin: .2rem 0 .8rem; }
.sv-pb-judul { font-weight: 700; font-size: 1.02rem; } .sv-pb-sub { font-size: .78rem; color: #6c757d; max-width: 420px; margin-top: 2px; }
.sv-pb-total { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: .8rem; color: #6c757d; } .sv-pb-total b { font-size: 1.7rem; line-height: 1; }
.sv-pb-kualitas { background: #fff3cd; color: #7a5500; border-radius: 8px; padding: 8px 12px; font-size: .82rem; margin-bottom: .7rem; }
.sv-pb-dim { border: 1px solid rgba(128,128,128,.28); border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; background: rgba(255,255,255,.55); }
.sv-pb-dim > summary { cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-weight: 600; font-size: .9rem; list-style: none; }
.sv-pb-dim > summary::-webkit-details-marker { display: none; }
.sv-pb-tafsir { font-size: .84rem; margin: .1rem 0 .4rem; }
.sv-pb-list { list-style: none; padding: 0; margin: 0; }
.sv-pb-list li { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 7px 0; border-top: 1px solid rgba(128,128,128,.18); font-size: .82rem; align-items: start; }
.sv-pb-list li em { color: #8a94a0; font-size: .72rem; font-style: normal; }
.sv-pb-j { grid-column: 1; color: #495057; } .sv-skor { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-weight: 700; font-size: .75rem; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
.sv-s4 { background: #d9f2e4; color: #14693d; } .sv-s3 { background: #e3f6ec; color: #1b7f4b; } .sv-s2 { background: #fff1cc; color: #8a5a00; } .sv-s1 { background: #fde1e1; color: #b3261e; }
.sv-pb-list li.sv-l4, .sv-pb-list li.sv-l3 { border-left: 4px solid #2e9e63; background: rgba(46,158,99,.07); padding-left: 8px; }
.sv-pb-list li.sv-l2 { border-left: 4px solid #e0a100; background: rgba(255,193,7,.16); padding-left: 8px; }
.sv-pb-list li.sv-l1 { border-left: 4px solid #d93025; background: rgba(217,48,37,.10); padding-left: 8px; }
.sv-pb-list li.sv-l4 .sv-pb-j b, .sv-pb-list li.sv-l3 .sv-pb-j b { color: #14693d; } .sv-pb-list li.sv-l2 .sv-pb-j b { color: #8a5a00; } .sv-pb-list li.sv-l1 .sv-pb-j b { color: #b3261e; }
.sv-legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .76rem; margin: 0 0 .6rem; color: #6c757d; } .sv-legenda i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; } .sv-s0 { background: #eceff1; color: #6c757d; }
.sv-pb-saran { background: #eaf2ff; border-radius: 8px; padding: 7px 11px; font-size: .8rem; margin: 8px 0 2px; }
/* ringkasan untuk guru BK (detail jawaban survei per siswa) */
.sv-bk { border: 1px solid rgba(128,128,128,.3); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; background: rgba(255,255,255,.55); font-size: .84rem; }
.sv-bk-h { font-weight: 700; font-size: .95rem; margin-bottom: 6px; }
.sv-bk-sec { margin-top: 8px; } .sv-bk-sec > b { display: block; margin-bottom: 3px; }
.sv-bk-alarm { background: #fde8e8; color: #8f1d1d; border-radius: 8px; padding: 8px 12px; margin-top: 8px; }
.sv-bk-alarm ul, .sv-bk-sec ul { margin: .25rem 0 0; padding-left: 18px; } .sv-bk-alarm li, .sv-bk-sec li { margin-bottom: .25rem; }
.sv-bk-ok { background: #e3f6ec; color: #1b7f4b; border-radius: 8px; padding: 8px 12px; margin-top: 8px; }
.sv-bk-rahasia { font-size: .76rem; color: #6c757d; margin-top: 8px; }
.sv-bk-chip { display: inline-block; margin: 2px 6px 2px 0; }

/* ---- Tata letak detail jawaban survei (guru BK) — v29b ---- */
.sv-bk { padding: 16px 18px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.05); font-size: .86rem; line-height: 1.45; }
.sv-bk-h { font-size: 1rem; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 2px solid rgba(13,110,253,.25); letter-spacing: .01em; }
.sv-legenda { gap: 8px; margin: 0 0 12px; } .sv-legenda span { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; background: #f3f5f7; font-size: .74rem; color: #495057; }
.sv-bk-sec { margin-top: 16px; }
.sv-bk-sec > b { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; margin: 0 0 8px; padding-bottom: 5px; border-bottom: 1px solid rgba(128,128,128,.22); font-size: .88rem; color: #212529; }
.sv-hit { font-size: .7rem; font-weight: 600; padding: 1px 8px; border-radius: 99px; background: #e9ecef; color: #495057; }
.sv-bk-chip { padding: 4px 12px !important; margin: 3px 6px 3px 0 !important; font-size: .78rem !important; }
.sv-bk-alarm { margin-top: 12px; padding: 12px 14px; border: 1px solid #f1b0b0; border-left: 5px solid #d93025; background: #fdf0f0; color: #7a1b1b; border-radius: 10px; }
.sv-bk-at { font-weight: 700; font-size: .92rem; display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; } .sv-bk-at .sv-hit { background: #f7caca; color: #8f1d1d; }
.sv-bk-an { font-size: .78rem; margin: 2px 0 6px; color: #8f3a3a; }
.sv-rows { list-style: none !important; margin: 4px 0 0 !important; padding: 0 !important; display: flex; flex-direction: column; gap: 6px; }
.sv-rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 16px; align-items: center; margin: 0 !important; padding: 9px 12px; border-radius: 8px; border-left: 4px solid #adb5bd; background: #f6f7f9; color: #212529; break-inside: avoid; }
.sv-rows li.sv-l3, .sv-rows li.sv-l4 { border-left-color: #2e9e63; background: rgba(46,158,99,.08); }
.sv-rows li.sv-l2 { border-left-color: #e0a100; background: rgba(255,193,7,.16); }
.sv-rows li.sv-l1 { border-left-color: #d93025; background: rgba(217,48,37,.09); }
.sv-bk-alarm .sv-rows li { background: #fff; }
.sv-r-t { font-size: .86rem; line-height: 1.4; overflow-wrap: anywhere; }
.sv-r-d { display: block; margin-top: 2px; font-size: .72rem; color: #6c757d; }
.sv-r-j { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; font-size: .78rem; font-weight: 700; text-align: right; max-width: 150px; }
.sv-rows li.sv-l1 .sv-r-j > span:first-child { color: #b3261e; } .sv-rows li.sv-l2 .sv-r-j > span:first-child { color: #8a5a00; } .sv-rows li.sv-l3 .sv-r-j > span:first-child, .sv-rows li.sv-l4 .sv-r-j > span:first-child { color: #14693d; }
.sv-bk-rahasia { margin-top: 14px; padding: 8px 12px; border-radius: 8px; background: #f3f5f7; font-size: .75rem; color: #6c757d; }
.sv-bk-ok, .sv-pb-kualitas { border-radius: 8px; }
.sv-pb { margin-top: 4px; }
.sv-pb-top { padding: 12px 14px; border: 1px solid rgba(128,128,128,.25); border-radius: 12px; background: #f8fafc; margin: 0 0 12px; }
.sv-pb-dim { padding: 10px 14px; border-radius: 12px; margin-bottom: 10px; }
.sv-pb-dim > summary { padding-bottom: 4px; }
.sv-pb-tafsir { color: #495057; margin: 2px 0 8px; }
.sv-pb-list li { grid-template-columns: minmax(0, 1fr) auto; padding: 9px 10px; margin-bottom: 4px; border-top: 0; border-radius: 8px; align-items: center; }
.sv-pb-list li.sv-l4, .sv-pb-list li.sv-l3, .sv-pb-list li.sv-l2, .sv-pb-list li.sv-l1 { padding-left: 10px; }
.sv-pb-t { font-size: .85rem; line-height: 1.4; overflow-wrap: anywhere; } .sv-pb-j { font-size: .78rem; }
.sv-pb-saran { border-left: 4px solid #0d6efd; border-radius: 0 8px 8px 0; margin-top: 10px; }
.sv-no { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 22px; padding: 0 6px; margin-right: 8px; border-radius: 6px; background: #1f4e79; color: #fff; font-weight: 700; font-size: .72rem; vertical-align: 1px; font-variant-numeric: tabular-nums; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sv-r-ind { margin-left: 32px; } .sv-neg { color: #8a94a0; font-size: .72rem; font-style: normal; }
.sv-pb-dn .sv-hit { margin-left: 6px; vertical-align: 1px; }
.sv-sub { margin: 4px 0 10px; padding: 8px 12px; border-radius: 10px; background: #f6f8fb; border: 1px solid rgba(128,128,128,.2); }
.sv-sub-h { font-size: .72rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #6c757d; margin-bottom: 4px; }
.sv-sub-r { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(60px, 1fr) auto; gap: 10px; align-items: center; padding: 4px 0; font-size: .82rem; }
.sv-sub-n small { display: block; font-size: .68rem; color: #8a94a0; }
.sv-sub-b { height: 8px; border-radius: 6px; background: #e3e7ec; overflow: hidden; } .sv-sub-b i { display: block; height: 100%; border-radius: 6px; }
.sv-sub-ket { margin: 4px 0 6px; font-size: .78rem; color: #6c757d; } .sv-sub-dimrow td { border-top: 2px solid rgba(128,128,128,.25); }
@media print { .sv-sub-r { break-inside: avoid; } .sv-sub-b { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
@media (max-width: 560px) { .sv-rows li, .sv-pb-list li { grid-template-columns: 1fr; } .sv-r-j { flex-direction: row; align-items: center; justify-content: space-between; max-width: none; text-align: left; } .sv-pb-list li .sv-skor { grid-column: 1; grid-row: auto; justify-self: start; } }
@media print { .sv-bk, .sv-pb-dim, .sv-bk-alarm { break-inside: auto; } .sv-pb-list li, .sv-rows li { break-inside: avoid; } .sv-pb-top { break-after: avoid; } .sv-bk-sec > b { break-after: avoid; } }
.sv-aksi-btn { white-space: nowrap; }

/* ---- tabel hasil survei (guru): rapi, bisa digeser di dalam kotaknya, kolom No & Nama menempel, jadi kartu di HP ---- */
.table-wrap { overflow: auto; max-width: 100%; max-height: 74vh; border: 1px solid var(--c-line, #dee2e6); border-radius: 14px; background: var(--c-surface, #fff); -webkit-overflow-scrolling: touch; margin: .4rem 0 .9rem; }
.table-wrap table.data-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
.table-wrap .data-table th { position: sticky; top: 0; z-index: 2; background: var(--c-surface, #fff); padding: .6rem .55rem; font-size: .76rem; font-weight: 700; line-height: 1.25; color: var(--c-muted, #6c757d); text-align: center; vertical-align: bottom; border-bottom: 2px solid var(--c-line, #dee2e6); min-width: 78px; }
.table-wrap .data-table td { padding: .5rem .55rem; text-align: center; vertical-align: middle; white-space: nowrap; border-bottom: 1px solid var(--c-line, #dee2e6); }
.table-wrap .data-table tbody tr:last-child td { border-bottom: 0; }
.table-wrap .data-table tbody tr:hover td { background: var(--c-hover, #f3f6fb); }
.table-wrap .data-table .badge { white-space: nowrap; }
.table-wrap .data-table .sv-kes-mini { white-space: normal; min-width: 112px; font-size: .7rem; margin-top: 3px; line-height: 1.25; }
.table-wrap .data-table td.aksi { min-width: 132px; }
.table-wrap .data-table td.aksi .badge { margin-bottom: .35rem; }
.table-wrap .data-table tr.sv-semua td { font-weight: 700; }
@media (min-width: 641px) {
  .table-wrap .data-table.dt-kartu th:nth-child(1), .table-wrap .data-table.dt-kartu td:nth-child(1) { position: sticky; left: 0; width: 44px; min-width: 44px; background: var(--c-surface, #fff); }
  .table-wrap .data-table.dt-kartu th:nth-child(2), .table-wrap .data-table.dt-kartu td:nth-child(2) { position: sticky; left: 44px; min-width: 168px; max-width: 230px; text-align: left; white-space: normal; font-weight: 600; background: var(--c-surface, #fff); box-shadow: 1px 0 0 var(--c-line, #dee2e6); }
  .table-wrap .data-table.dt-kartu td:nth-child(1), .table-wrap .data-table.dt-kartu td:nth-child(2) { z-index: 1; }
  .table-wrap .data-table.dt-kartu th:nth-child(1), .table-wrap .data-table.dt-kartu th:nth-child(2) { z-index: 3; }
  .table-wrap .data-table.dt-kartu tbody tr:hover td:nth-child(1), .table-wrap .data-table.dt-kartu tbody tr:hover td:nth-child(2) { background: var(--c-hover, #f3f6fb); }
}
@media (max-width: 640px) {
  .table-wrap.dt-wrap { overflow: visible; max-height: none; border: 0; border-radius: 0; background: transparent; margin: .4rem 0; }
  .table-wrap.dt-wrap .data-table.dt-kartu, .table-wrap.dt-wrap .data-table.dt-kartu tbody { display: block; width: 100%; min-width: 0; }
  .table-wrap.dt-wrap .data-table.dt-kartu thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .table-wrap.dt-wrap .data-table.dt-kartu tr { display: block; background: var(--c-surface, #fff); border: 1px solid var(--c-line, #dee2e6); border-radius: 14px; padding: .4rem .95rem .6rem; margin-bottom: .75rem; box-shadow: 0 1px 4px rgba(28,35,51,.06); }
  .table-wrap.dt-wrap .data-table.dt-kartu tbody tr:hover td { background: transparent; }
  .table-wrap.dt-wrap .data-table.dt-kartu td { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .15rem .8rem; text-align: right; padding: .42rem 0; border: 0; border-bottom: 1px dashed var(--c-line, #dee2e6); white-space: normal; min-width: 0; }
  .table-wrap.dt-wrap .data-table.dt-kartu td[data-label]::before { content: attr(data-label); flex: 1 1 42%; text-align: left; font-size: .72rem; font-weight: 700; color: var(--c-muted, #6c757d); }
  .table-wrap.dt-wrap .data-table.dt-kartu td:nth-child(1) { display: none; }
  .table-wrap.dt-wrap .data-table.dt-kartu td:nth-child(2) { display: block; text-align: left; font-size: 1rem; font-weight: 700; padding: .55rem 0 .5rem; border-bottom: 1px solid var(--c-line, #dee2e6); white-space: normal; }
  .table-wrap.dt-wrap .data-table.dt-kartu td:nth-child(2)::before { display: none; }
  .table-wrap.dt-wrap .data-table.dt-kartu .sv-kes-mini { min-width: 0; flex: 1 0 100%; text-align: right; margin: 0; }
  .table-wrap.dt-wrap .data-table.dt-kartu td.aksi { justify-content: flex-start; gap: .5rem; border-bottom: 0; padding-top: .7rem; min-width: 0; }
  .table-wrap.dt-wrap .data-table.dt-kartu td.aksi::before { display: none; }
  .table-wrap.dt-wrap .data-table.dt-kartu td.aksi .badge { margin: 0; }
  .table-wrap.dt-wrap .data-table.dt-kartu td.aksi br { display: none; }
}

/* tampilan matriks (beberapa pernyataan per halaman, gaya ANBK) */
.sv-kode { color: #8a94a0; font-size: .62em; font-style: italic; white-space: nowrap; }
.sv-ket-m { font-size: 13px; color: #343a40; margin-bottom: 10px; }
.sv-mx-wrap { overflow-x: auto; border: 1px solid #dee2e6; border-radius: 4px; background: #fff; }
.sv-mx { width: 100%; border-collapse: collapse; font-family: 'Poppins', sans-serif; font-size: 13.5px; }
.sv-mx thead th { font-weight: 700; font-size: 12.5px; text-align: center; padding: 10px 8px; border-bottom: 1px solid #dee2e6; width: 110px; vertical-align: bottom; }
.sv-mx thead th.sv-mx-t { text-align: left; width: auto; padding-left: 12px; }
.sv-mx tbody tr { border-top: 1px solid #e9ecef; } .sv-mx tbody tr:nth-child(odd) { background: #f4f6f8; } .sv-mx tbody tr.done { background: #eaf2ff; }
.sv-mx td { padding: 11px 8px; text-align: center; } .sv-mx td.sv-mx-t { text-align: left; padding-left: 12px; line-height: 1.5; color: #212529; }
.sv-mx-c label { display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; min-width: 36px; min-height: 36px; }
.sv-mx-c input { position: absolute; opacity: 0; pointer-events: none; }
.sv-mx-c input:checked + .sv-r { border-color: #0d6efd; } .sv-mx-c input:checked + .sv-r::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #0d6efd; }
.sv-mx-c input:focus-visible + .sv-r { outline: 3px solid rgba(13,110,253,.35); outline-offset: 2px; }
.sv-mx-l { display: none; }
@media (max-width: 700px) {
  .sv-mx thead { display: none; } .sv-mx, .sv-mx tbody, .sv-mx tr, .sv-mx td { display: block; width: 100%; }
  .sv-mx td.sv-mx-t { padding: 12px 12px 4px; font-weight: 500; }
  .sv-mx td.sv-mx-c { text-align: left; padding: 0 12px; } .sv-mx-c label { width: 100%; justify-content: flex-start; min-height: 38px; }
  .sv-mx-l { display: inline; font-size: 13.5px; } .sv-mx tr { padding-bottom: 8px; }
}

/* panel Halaman Kuesioner */
.sv-layout { display: grid; grid-template-columns: 260px 1fr; gap: 0; align-items: start; }
.sv-panel { padding: 14px 12px 14px 14px; }
.sv-panel-t { background: #1e88e5; color: #fff; font: 600 14px 'Poppins', sans-serif; padding: 10px 12px; border-radius: 4px; text-align: center; margin-bottom: 12px; }
.sv-panel-g { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 8px; max-height: 420px; overflow-y: auto; padding: 2px; }
.sv-pn { border: 0; border-radius: 4px; color: #fff; font: 600 13px 'Poppins', sans-serif; min-height: 32px; cursor: pointer; background: #8a94a0; }
.sv-pn.ok { background: #28a745; } .sv-pn.kosong { background: #dc3545; } .sv-pn.baru { background: #8a94a0; }
.sv-pn.ragu { background: #ffc107; color: #212529; }
/* Editor butir survei (Kelola Soal) */
#modal-survei-edit .modal { max-width: 1180px; width: 96vw; max-height: 92vh; display: flex; flex-direction: column; }
#sv-ed-scroll { overflow: auto; flex: 1; border: 1px solid rgba(128,128,128,.3); border-radius: 8px; margin: .6rem 0; }
#sv-ed-table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
#sv-ed-table th { position: sticky; top: 0; background: var(--c-surface, #f3f4f6); z-index: 1; text-align: left; padding: 6px; font-weight: 600; white-space: nowrap; }
#sv-ed-table td { padding: 4px; vertical-align: top; border-top: 1px solid rgba(128,128,128,.2); }
#sv-ed-table input, #sv-ed-table select, #sv-ed-table textarea { font-size: 12.5px; padding: 4px 6px; margin: 0; width: 100%; box-sizing: border-box; }
.sv-ed-no { font-weight: 700; text-align: center; min-width: 28px; }
.sv-ed-aksi { white-space: nowrap; }
.sv-ed-aksi button { margin-right: 2px; }
.paket-survei-card .aksi-card-aksi-row { flex-wrap: wrap; }
.sv-pn.now { outline: 3px solid #0d6efd; outline-offset: 1px; }
.sv-kes { display: flex; gap: 14px; align-items: center; border: 2px solid; border-radius: 12px; padding: 12px 16px; margin: 6px 0 14px; background: #fff; max-width: 640px; }
.sv-kes-n { font: 700 40px/1 'Poppins', sans-serif; min-width: 66px; text-align: center; }
.sv-kes-t { font-weight: 600; font-size: 14px; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.sv-kes-k { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12.5px; color: #495057; margin: 5px 0 3px; }
.sv-ev { border: 1px solid #f0c36d; background: #fff8e8; border-radius: 10px; padding: 10px 14px; margin: 8px 0; font-size: .86rem; }
.sv-ev-ok { border-color: #8fd0aa; background: #effaf3; }
.sv-ev ol { margin: .5rem 0 0; padding-left: 20px; } .sv-ev li { margin-bottom: .7rem; }
.sv-ev-h { display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; }
.sv-ev-b { font-size: .8rem; color: #6c757d; margin: 3px 0; } .sv-ev-s { font-size: .82rem; background: #fff; border-radius: 8px; padding: 6px 10px; }
.sv-kelas { margin: 10px 0; } .sv-kelas tr.sv-semua td { background: rgba(128,128,128,.1); }
.sv-kes-mini { font-size: 11.5px; color: #6c757d; margin-top: 3px; white-space: nowrap; }
.sv-kes-p { font-size: 12px; color: #6c757d; } .sv-kes-a { font-size: 12px; color: #b26a00; margin-top: 3px; }
@media (max-width: 760px) { .sv-layout { grid-template-columns: 1fr; } .sv-panel { padding: 10px 12px 0; } .sv-panel-g { max-height: 120px; grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); } .sv-panel-t { padding: 7px; font-size: 13px; margin-bottom: 8px; } }
`; document.head.appendChild(st); })();

  // ---------------- skala jawaban (4 pilihan, tanpa pilihan tengah) ----------------
  const SKALA = {
    setuju: ['Sangat tidak setuju', 'Tidak setuju', 'Setuju', 'Sangat setuju'],
    frek: ['Tidak pernah', 'Kadang-kadang', 'Sering', 'Selalu'],
    peng: ['Tidak pernah', 'Sekali', 'Beberapa kali', 'Sering'],
    kurang: ['Tidak setuju', 'Kurang setuju', 'Setuju', 'Sangat setuju']
  };
  const PETUNJUK_DEF = {
    setuju: 'Pilihlah satu jawaban yang paling sesuai dengan pendapat Anda.',
    kurang: 'Pilihlah satu jawaban yang paling sesuai dengan pendapat Anda.',
    frek: 'Pilihlah satu jawaban yang paling sesuai dengan kebiasaan atau keadaan Anda.',
    peng: 'Pilihlah satu jawaban yang paling sesuai dengan pengalaman Anda.'
  };

  // ---------------- butir: [id, dimensi, skala, arah(+1 positif / -1 negatif), teks] ----------------
  const JENIS = {
    karakter: {
      nama: 'Survei Karakter',
      ikon: 'fa-hand-holding-heart',
      dim: [
        ['bt', 'Beriman, bertakwa kepada Tuhan YME, dan berakhlak mulia'],
        ['bk', 'Berkebinekaan global'],
        ['gr', 'Gotong royong'],
        ['md', 'Mandiri'],
        ['bn', 'Bernalar kritis'],
        ['kr', 'Kreatif']
      ],
      butir: [
        ['K01', 'bt', 'setuju', 1, 'Saya melaksanakan ibadah sesuai agama atau kepercayaan saya.'],
        ['K02', 'bt', 'setuju', 1, 'Saya meminta maaf ketika berbuat salah kepada orang lain.'],
        ['K03', 'bt', 'setuju', 1, 'Saya tetap jujur walaupun tidak ada yang mengawasi.'],
        ['K04', 'bt', 'setuju', -1, 'Mengambil barang teman tanpa izin tidak apa-apa jika barang itu tidak penting.'],
        ['K05', 'bt', 'setuju', 1, 'Saya menjaga kebersihan dan kelestarian lingkungan di sekitar saya.'],
        ['K06', 'bt', 'setuju', -1, 'Menyontek saat ulangan tidak masalah asalkan tidak ketahuan.'],
        ['K07', 'bk', 'setuju', 1, 'Saya senang berteman dengan teman yang berbeda agama, suku, atau budaya.'],
        ['K08', 'bk', 'setuju', 1, 'Saya menghormati teman yang cara beribadah atau adatnya berbeda dari saya.'],
        ['K09', 'bk', 'setuju', -1, 'Budaya daerah saya paling baik, sehingga budaya lain tidak perlu dipelajari.'],
        ['K10', 'bk', 'setuju', 1, 'Saya tertarik mempelajari budaya daerah lain atau bangsa lain.'],
        ['K11', 'bk', 'setuju', 1, 'Saya membela teman yang diejek karena perbedaannya.'],
        ['K12', 'bk', 'setuju', -1, 'Saya lebih nyaman bergaul hanya dengan teman yang sama dengan saya.'],
        ['K13', 'gr', 'setuju', 1, 'Saya ikut piket atau kerja bakti tanpa harus disuruh.'],
        ['K14', 'gr', 'setuju', 1, 'Saya bersedia membantu teman yang kesulitan memahami pelajaran.'],
        ['K15', 'gr', 'setuju', -1, 'Dalam kerja kelompok, lebih baik saya mengerjakan sendiri tanpa melibatkan anggota lain.'],
        ['K16', 'gr', 'setuju', 1, 'Saya mau menerima keputusan kelompok walaupun berbeda dengan pendapat saya.'],
        ['K17', 'gr', 'setuju', 1, 'Saya berbagi alat atau bahan belajar dengan teman yang membutuhkan.'],
        ['K18', 'gr', 'setuju', -1, 'Saya membiarkan teman sekelompok mengerjakan semua tugas.'],
        ['K19', 'md', 'setuju', 1, 'Saya mengerjakan tugas dan PR dengan usaha sendiri.'],
        ['K20', 'md', 'setuju', 1, 'Ketika gagal, saya mencoba lagi dengan cara lain.'],
        ['K21', 'md', 'setuju', -1, 'Saya mudah menyerah jika soal terasa sulit.'],
        ['K22', 'md', 'setuju', 1, 'Saya mengatur sendiri waktu belajar dan waktu istirahat saya.'],
        ['K23', 'md', 'setuju', 1, 'Saya berani bertanya kepada guru ketika belum paham.'],
        ['K24', 'md', 'setuju', -1, 'Saya baru belajar kalau disuruh orang lain.'],
        ['K25', 'bn', 'setuju', 1, 'Saya mencari informasi dari sumber lain sebelum mempercayai suatu berita.'],
        ['K26', 'bn', 'setuju', 1, 'Saya meminta alasan atau bukti sebelum menyetujui pendapat orang lain.'],
        ['K27', 'bn', 'setuju', -1, 'Kalau banyak orang berkata sama, pasti benar dan tidak perlu diperiksa lagi.'],
        ['K28', 'bn', 'setuju', 1, 'Saya memikirkan akibatnya sebelum mengambil keputusan.'],
        ['K29', 'bn', 'setuju', 1, 'Saya memeriksa kebenaran pesan atau berita sebelum membagikannya.'],
        ['K30', 'bn', 'setuju', -1, 'Saya langsung membagikan berita yang menarik tanpa membaca isinya.'],
        ['K31', 'kr', 'setuju', 1, 'Saya suka mencari cara baru untuk menyelesaikan masalah.'],
        ['K32', 'kr', 'setuju', 1, 'Saya membuat karya (tulisan, gambar, alat, musik, dan lainnya) dari ide saya sendiri.'],
        ['K33', 'kr', 'setuju', -1, 'Saya lebih suka memakai cara yang sudah ada tanpa mencoba cara lain.'],
        ['K34', 'kr', 'setuju', 1, 'Saya tidak takut ide saya ditertawakan ketika saya menyampaikannya.'],
        ['K35', 'kr', 'setuju', 1, 'Saya mengembangkan ide dari hal-hal sederhana di sekitar saya.'],
        ['K36', 'kr', 'setuju', -1, 'Saya merasa tidak punya ide apa pun yang layak dicoba.']
      ],
      // pasangan butir yang maknanya berlawanan (positif, negatif) -> dipakai cek konsistensi jawaban
      pasangan: [['K03', 'K06'], ['K07', 'K12'], ['K20', 'K21'], ['K22', 'K24'], ['K29', 'K30'], ['K31', 'K36']]
    },
    sulingjar: {
      nama: 'Survei Lingkungan Belajar (Sulingjar)',
      ikon: 'fa-school',
      dim: [
        ['kp', 'Kualitas pembelajaran'],
        ['ik', 'Iklim keamanan satuan pendidikan'],
        ['kb', 'Iklim kebinekaan'],
        ['in', 'Iklim inklusivitas'],
        ['kg', 'Iklim kesetaraan gender']
      ],
      butir: [
        ['S01', 'kp', 'frek', 1, 'Guru menjelaskan tujuan pembelajaran di awal pelajaran.'],
        ['S02', 'kp', 'frek', 1, 'Guru memberi contoh yang berkaitan dengan kehidupan sehari-hari.'],
        ['S03', 'kp', 'frek', 1, 'Guru memberi kesempatan kepada siswa untuk bertanya dan berpendapat.'],
        ['S04', 'kp', 'frek', 1, 'Guru memberi masukan yang membantu saya memperbaiki hasil belajar.'],
        ['S05', 'kp', 'kurang', 1, 'Guru bersikap adil kepada semua siswa di kelas.'],
        ['S06', 'kp', 'kurang', 1, 'Saya bersemangat mengikuti pelajaran di kelas.'],
        ['S07', 'kp', 'frek', -1, 'Guru memarahi atau mempermalukan siswa yang salah menjawab.'],
        ['S08', 'kp', 'frek', 1, 'Guru meminta kami berdiskusi dan bekerja sama dalam kelompok.'],
        ['S09', 'kp', 'frek', 1, 'Guru memeriksa apakah kami sudah paham sebelum pindah ke materi berikutnya.'],
        ['S10', 'kp', 'kurang', 1, 'Tugas dan ulangan saya dikembalikan disertai penjelasan tentang kesalahan saya.'],
        ['S11', 'ik', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya diejek atau dipanggil dengan sebutan yang menyakitkan oleh teman.'],
        ['S12', 'ik', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya sengaja dikucilkan atau tidak diajak bermain atau berkelompok.'],
        ['S13', 'ik', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya dipukul, didorong, atau disakiti secara fisik oleh teman.'],
        ['S14', 'ik', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, barang saya diambil, dirusak, atau disembunyikan dengan sengaja oleh teman.'],
        ['S15', 'ik', 'peng', -1, 'Dalam setahun terakhir, saya diancam atau ditakut-takuti lewat pesan atau media sosial oleh teman sekolah.'],
        ['S16', 'ik', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya dipukul, dijewer, atau dicubit oleh guru sebagai hukuman.'],
        ['S17', 'ik', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya dihukum dengan cara dipermalukan di depan orang lain.'],
        ['S18', 'ik', 'peng', -1, 'Dalam setahun terakhir di lingkungan sekolah, saya mengalami ucapan atau perlakuan bernuansa seksual yang membuat saya tidak nyaman.'],
        ['S19', 'ik', 'kurang', 1, 'Saya merasa aman berada di lingkungan sekolah.'],
        ['S20', 'ik', 'kurang', 1, 'Saya tahu kepada siapa harus melapor jika mengalami atau melihat kekerasan di sekolah.'],
        ['S21', 'ik', 'peng', -1, 'Dalam setahun terakhir, saya melihat orang merokok, memakai vape, atau menggunakan zat terlarang di lingkungan sekolah.'],
        ['S22', 'ik', 'kurang', 1, 'Sekolah menanggapi dengan serius laporan tentang perundungan.'],
        ['S23', 'kb', 'kurang', 1, 'Guru memperlakukan siswa dari berbagai agama, suku, dan latar belakang dengan sama baiknya.'],
        ['S24', 'kb', 'kurang', 1, 'Di sekolah, kami diajarkan untuk menghormati perbedaan agama dan budaya.'],
        ['S25', 'kb', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya melihat guru atau teman menghina agama, suku, atau budaya tertentu.'],
        ['S26', 'kb', 'kurang', 1, 'Saya merasa dihargai di sekolah apa pun agama atau suku saya.'],
        ['S27', 'kb', 'frek', 1, 'Guru mendorong kami bekerja sama dengan teman yang berbeda latar belakang.'],
        ['S28', 'kb', 'kurang', 1, 'Hari besar agama dan budaya yang berbeda dihormati di sekolah.'],
        ['S29', 'in', 'kurang', 1, 'Teman yang memiliki disabilitas atau kebutuhan khusus mendapat bantuan yang dibutuhkan di sekolah.'],
        ['S30', 'in', 'kurang', 1, 'Jalan, ruang kelas, dan toilet di sekolah mudah dipakai oleh siswa penyandang disabilitas.'],
        ['S31', 'in', 'kurang', 1, 'Guru memberi perhatian kepada siswa yang membutuhkan waktu lebih lama untuk belajar.'],
        ['S32', 'in', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya melihat teman berkebutuhan khusus diejek atau dijauhi.'],
        ['S33', 'in', 'kurang', 1, 'Siswa yang berbakat atau berprestasi diberi kesempatan mengembangkan kemampuannya.'],
        ['S34', 'kg', 'kurang', 1, 'Siswa laki-laki dan perempuan mendapat kesempatan yang sama untuk berpendapat di kelas.'],
        ['S35', 'kg', 'kurang', 1, 'Siswa laki-laki dan perempuan mendapat kesempatan yang sama memimpin kegiatan di sekolah.'],
        ['S36', 'kg', 'peng', -1, 'Dalam setahun terakhir di sekolah ini, saya melihat siswa diejek karena dianggap tidak sesuai dengan peran laki-laki atau perempuan.']
      ],
      pasangan: []
    }
  };
  // ---------------- SUB-INDIKATOR per butir (set bawaan) ----------------
  // Nama sub-indikator dipakai hanya bila butir pada set yang dipakai masih sama dengan butir bawaan (id DAN teks sama).
  // Untuk set khusus hasil impor Word, sub-indikator diambil dari kolom kode butir (bila diisi).
  const SUBIND = {
    K01: 'Ibadah dan keyakinan', K02: 'Akhlak terhadap sesama', K03: 'Kejujuran', K04: 'Kejujuran', K05: 'Peduli lingkungan', K06: 'Kejujuran',
    K07: 'Pertemanan lintas budaya', K08: 'Toleransi', K09: 'Keterbukaan terhadap budaya lain', K10: 'Keterbukaan terhadap budaya lain', K11: 'Toleransi', K12: 'Pertemanan lintas budaya',
    K13: 'Kerja bakti dan piket', K14: 'Kepedulian dan berbagi', K15: 'Kerja sama kelompok', K16: 'Musyawarah', K17: 'Kepedulian dan berbagi', K18: 'Kerja sama kelompok',
    K19: 'Tanggung jawab tugas', K20: 'Ketekunan', K21: 'Ketekunan', K22: 'Pengaturan diri', K23: 'Keberanian bertanya', K24: 'Pengaturan diri',
    K25: 'Menggali informasi', K26: 'Menalar dan meminta bukti', K27: 'Menalar dan meminta bukti', K28: 'Mengambil keputusan', K29: 'Literasi digital', K30: 'Literasi digital',
    K31: 'Mencari cara baru', K32: 'Berkarya', K33: 'Mencari cara baru', K34: 'Percaya diri menyampaikan ide', K35: 'Mengembangkan ide', K36: 'Mengembangkan ide',
    S01: 'Kejelasan tujuan pembelajaran', S02: 'Keterkaitan materi dengan kehidupan', S03: 'Partisipasi siswa', S04: 'Umpan balik', S05: 'Keadilan guru', S06: 'Semangat belajar', S07: 'Sikap guru terhadap kesalahan siswa', S08: 'Diskusi dan kerja sama', S09: 'Pemeriksaan pemahaman', S10: 'Umpan balik',
    S11: 'Perundungan', S12: 'Perundungan', S13: 'Kekerasan fisik', S14: 'Perundungan', S15: 'Perundungan', S16: 'Hukuman oleh guru', S17: 'Hukuman oleh guru', S18: 'Kekerasan seksual', S19: 'Rasa aman dan pelaporan', S20: 'Rasa aman dan pelaporan', S21: 'Rokok dan zat terlarang', S22: 'Rasa aman dan pelaporan',
    S23: 'Perlakuan adil', S24: 'Penghormatan perbedaan', S25: 'Penghormatan perbedaan', S26: 'Rasa dihargai', S27: 'Kerja sama lintas latar belakang', S28: 'Penghormatan perbedaan',
    S29: 'Dukungan bagi disabilitas', S30: 'Aksesibilitas sarana', S31: 'Dukungan belajar', S32: 'Dukungan bagi disabilitas', S33: 'Pengembangan bakat',
    S34: 'Kesempatan berpendapat', S35: 'Kesempatan memimpin', S36: 'Stereotip gender'
  };
  const TEKS_BAWAAN = {}; Object.keys(JENIS).forEach(k => JENIS[k].butir.forEach(b => { TEKS_BAWAAN[b[0]] = b[4]; }));
  const subDari = (b) => (SUBIND[b[0]] && TEKS_BAWAAN[b[0]] === b[4]) ? SUBIND[b[0]] : (b[6] || '');
  // daftar sub-indikator suatu set: [{ dim, dimNama, nama, ids }] (urut dimensi, lalu kemunculan pertama)
  function subList(set) {
    const out = [], peta = {};
    set.dim.forEach(d => set.butir.filter(b => b[1] === d[0]).forEach(b => {
      const nm = subDari(b); if (!nm) return;
      const k = d[0] + '|' + nm; let x = peta[k];
      if (!x) { x = peta[k] = { dim: d[0], dimNama: d[1], nama: nm, ids: [] }; out.push(x); }
      x.ids.push(b[0]);
    }));
    return out;
  }
  // indeks 0-100 satu sub-indikator dari kumpulan skor butir (1-4)
  const indeksSub = (vals) => vals.length ? bulat2(((vals.reduce((a, c) => a + c, 0) / vals.length) - 1) / 3 * 100) : null;
  // butir keamanan yang dijawab "Beberapa kali" / "Sering" -> ditandai agar guru bisa menindaklanjuti dengan rahasia
  const BUTIR_PERHATIAN = ['S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S18'];
  // Daftar butir "pengalaman tidak aman" diambil dari SET yang dipakai (skala Pengalaman + arah negatif),
  // sehingga ikut benar untuk set khusus hasil impor Word yang nomor butirnya berbeda dari bawaan.
  function butirPerhatian(J) { return J ? J.butir.filter(b => b[2] === 'peng' && b[3] < 0).map(b => b[0]) : []; }
  function dijawabPerhatian(r, J) { return butirPerhatian(J).filter(id => Number(r.jawaban[id]) >= 3); }

  // indeks bantu per set butir (bawaan maupun khusus hasil impor Word)
  // Halaman: butir berurutan dengan nomor halaman sama (>0) dan skala sama tampil bersama dalam satu tabel matriks;
  // butir tanpa nomor halaman tampil satu per halaman.
  function bangunHalaman(j) {
    const hl = [];
    j.butir.forEach((b, i) => {
      const hal = Number(b[5]) || 0; const akhir = hl[hl.length - 1];
      if (hal > 0 && akhir && akhir.hal === hal && akhir.skala === b[2]) akhir.idx.push(i);
      else hl.push({ hal, skala: b[2], idx: [i] });
    });
    j.halamanList = hl; return hl;
  }
  function indeksSet(j) {
    j.map = {}; j.butir.forEach(b => { j.map[b[0]] = { id: b[0], dim: b[1], skala: b[2], arah: b[3], teks: b[4], hal: Number(b[5]) || 0, kode: b[6] || '' }; });
    j.dimNama = {}; j.dim.forEach(d => { j.dimNama[d[0]] = d[1]; });
    j.petunjuk = j.petunjuk || {};
    bangunHalaman(j);
    return j;
  }
  // Pengelompokan otomatis butir bawaan: satu halaman = satu dimensi (indikator), skala sama, maksimal 6 pernyataan (gaya ANBK)
  Object.keys(JENIS).forEach(k => {
    const j = JENIS[k]; let hal = 0, n = 0, skala = '', dim = '';
    j.butir.forEach(b => { if (b[2] !== skala || b[1] !== dim || n >= 6) { hal++; n = 0; skala = b[2]; dim = b[1]; } n++; b[5] = hal; });
  });
  Object.keys(JENIS).forEach(k => { JENIS[k].jenis = k; indeksSet(JENIS[k]); });

  // Saran tindak lanjut per dimensi bawaan (dipakai di Pembahasan Survei bila indeks belum Baik)
  const SARAN = {
    bt: 'Biasakan jujur pada hal kecil, mengerjakan ulangan tanpa menyontek, dan meminta maaf saat berbuat salah.',
    bk: 'Cari kesempatan berteman dan berkelompok dengan teman yang berbeda latar belakang, dan berani membela teman yang diejek.',
    gr: 'Ambil bagian nyata dalam piket dan kerja kelompok, bagi tugas secara adil, dan bantu anggota yang kesulitan.',
    md: 'Susun jadwal belajar sendiri, kerjakan PR dengan usaha sendiri, dan coba cara lain saat gagal sebelum menyerah.',
    bn: 'Periksa sumber sebelum percaya atau membagikan berita; biasakan bertanya "apa buktinya?" dan "apa akibatnya?".',
    kr: 'Coba satu cara baru untuk satu masalah setiap minggu dan tuangkan ide ke dalam karya kecil.',
    kp: 'Perkuat praktik mengajar: sampaikan tujuan pembelajaran, beri contoh kontekstual, ruang bertanya, dan umpan balik yang jelas pada tugas.',
    ik: 'Tinjau tata tertib antiperundungan, jalur lapor yang aman dan rahasia, pendampingan korban oleh guru BK, serta hentikan hukuman fisik dan mempermalukan.',
    kb: 'Perbanyak kegiatan lintas agama dan budaya, perlakukan siswa secara adil, dan tindak tegas ujaran yang merendahkan suku, agama, atau budaya.',
    'in': 'Pastikan akses fisik dan pendampingan bagi siswa berkebutuhan khusus, serta bangun sikap saling menerima antarsiswa.',
    kg: 'Beri kesempatan setara berpendapat dan memimpin bagi siswa laki-laki dan perempuan, dan tangani ejekan berbasis stereotip gender.'
  };

  // Saran PEMBIASAAN DI KELAS untuk guru (Survei Karakter); Sulingjar memakai SARAN di atas (berorientasi sekolah)
  const SARAN_KELAS = {
    bt: 'Biasakan doa bersama di awal dan akhir pelajaran, budaya jujur (ulangan tanpa menyontek dan memberi apresiasi pada kejujuran, kotak barang temuan), serta kebiasaan meminta maaf, mengucap terima kasih, dan 5S (senyum, salam, sapa, sopan, santun).',
    bk: 'Susun kelompok belajar lintas latar belakang secara bergilir, beri ruang siswa memperkenalkan tradisi daerah atau agama masing-masing lewat presentasi singkat, dan tegaskan aturan kelas: tidak mengejek perbedaan.',
    gr: 'Terapkan piket kelas bergilir dengan pembagian tugas tertulis, kerja kelompok dengan peran yang jelas dan penilaian kontribusi tiap anggota, serta program tutor sebaya.',
    md: 'Biasakan siswa menulis target belajar mingguan dan jurnal belajar singkat, mengerjakan tugas tanpa pengingat berulang, dan mencoba sendiri dulu sebelum dibantu.',
    bn: 'Latih pertanyaan "apa buktinya?" dan "apa akibatnya?" pada setiap materi, sediakan 5 menit cek hoaks tiap pekan, dan minta siswa menyebut alasan serta sumber saat berpendapat.',
    kr: 'Beri tugas terbuka dengan banyak kemungkinan jawaban, proyek karya sederhana secara rutin, dan apresiasi ide baru walau belum sempurna.'
  };

  // Bangun set butir aktif: butir khusus (JSON dari ujian.survei_butir) bila valid & sejenis, jika tidak pakai bawaan.
  function bangunSet(jenis, json) {
    const dasar = JENIS[jenis]; if (!dasar) return null;
    let c = null;
    if (json) { try { c = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { c = null; } }
    if (!c || c.jenis !== jenis || !Array.isArray(c.butir) || !Array.isArray(c.dim)) return dasar;
    const dim = c.dim.filter(d => Array.isArray(d) && d[0] && d[1]).map(d => [String(d[0]), String(d[1])]);
    const kode = new Set(dim.map(d => d[0]));
    const butir = c.butir.filter(b => Array.isArray(b) && /^[A-Z][0-9]{2}$/.test(b[0]) && kode.has(b[1]) && SKALA[b[2]] && b[4])
      .map(b => [String(b[0]), String(b[1]), String(b[2]), Number(b[3]) < 0 ? -1 : 1, String(b[4]), Number(b[5]) || 0, b[6] ? String(b[6]) : '']);
    if (butir.length < 5) return dasar;
    return indeksSet({ nama: dasar.nama, ikon: dasar.ikon, jenis, kustom: true, dim, butir, pasangan: Array.isArray(c.pasangan) ? c.pasangan : [], petunjuk: (c.petunjuk && typeof c.petunjuk === 'object') ? c.petunjuk : {} });
  }

  // ---------------- penentuan jenis survei dari pengaturan ujian ----------------
  // ujian.survei: '' (nonaktif) | 'auto' | 'karakter' | 'sulingjar'
  // PAKET SURVEI (Bank Soal): tiap kategori/mapel boleh punya paket Survei Karakter dan/atau Sulingjar
  // (daftar paket = [{kategori, jenis, butir_json, guru_id, diubah}]). Mode 'auto': kata \"Numerasi\" ->
  // karakter, \"Literasi\" -> sulingjar; bila judul/kategori tidak memuat keduanya dan kategori punya TEPAT
  // satu paket, paket itulah yang dipakai.
  const samaKat = (a, b) => normT(a) === normT(b);
  function cariPaket(paket, kategori, jenis, guruId) {
    const cocok = (paket || []).filter(p => p && p.jenis === jenis && samaKat(p.kategori, kategori));
    return cocok.filter(p => guruId && String(p.guru_id) === String(guruId))[0] || cocok[0] || null;
  }
  function jenisUntukUjian(u, paket) {
    if (!u) return '';
    const m = String(u.survei || '').toLowerCase();
    if (m === 'karakter' || m === 'sulingjar') return m;
    if (m === 'auto') {
      const t = (String(u.judul || '') + ' ' + String(u.kategori || '')).toLowerCase();
      if (t.indexOf('numerasi') >= 0) return 'karakter';
      if (t.indexOf('literasi') >= 0) return 'sulingjar';
      const ada = {}; (paket || []).forEach(p => { if (p && samaKat(p.kategori, u.kategori) && (p.jenis === 'karakter' || p.jenis === 'sulingjar')) ada[p.jenis] = 1; });
      const k = Object.keys(ada); if (k.length === 1) return k[0];
    }
    return '';
  }
  // Jenis + butir (JSON) yang dipakai sebuah ujian: paket Bank Soal > butir khusus lama di ujian > bawaan ('').
  function setUntukUjian(u, paket) {
    const jenis = jenisUntukUjian(u, paket); if (!jenis) return { jenis: '', set: '' };
    const p = cariPaket(paket, u.kategori, jenis, u.guru_id);
    return { jenis, set: p ? String(p.butir_json || '') : String((u && u.survei_butir) || '') };
  }

  // ---------------- penskoran ----------------
  // skor butir = nomor pilihan (1-4); butir negatif dibalik (5 - nomor). Indeks dimensi = (rata-rata - 1) / 3 x 100.
  const bulat2 = (x) => Math.round(x * 100) / 100;
  function skorButir(b, pilihan) { const p = Number(pilihan); if (!(p >= 1 && p <= 4)) return null; return b.arah < 0 ? 5 - p : p; }
  function hitung(jenis, jawaban, set) {
    const J = set || JENIS[jenis]; if (!J) return null;
    const dim = {}; J.dim.forEach(d => { dim[d[0]] = { nama: d[1], jumlah: 0, n: 0 }; });
    const butir = {};
    J.butir.forEach(row => {
      const b = J.map[row[0]]; const s = skorButir(b, (jawaban || {})[b.id]);
      if (s === null) return;
      butir[b.id] = s; dim[b.dim].jumlah += s; dim[b.dim].n++;
    });
    const hasil = {}; let jml = 0, n = 0;
    Object.keys(dim).forEach(k => {
      const d = dim[k];
      hasil[k] = { nama: d.nama, n: d.n, rata: d.n ? bulat2(d.jumlah / d.n) : null, indeks: d.n ? bulat2(((d.jumlah / d.n) - 1) / 3 * 100) : null };
      if (hasil[k].indeks !== null) { jml += hasil[k].indeks; n++; }
    });
    return { dim: hasil, butir, total: n ? bulat2(jml / n) : null };
  }
  // Acuan kategori indeks (untuk latihan, bukan ambang resmi Pusmendik)
  function kategoriIndeks(x) {
    if (x === null || x === undefined || isNaN(x)) return { label: '-', warna: '#6c757d', latar: '#eceff1', kode: 'na' };
    if (x >= 75) return { label: 'Baik', warna: '#1b7f4b', latar: '#e3f6ec', kode: 'baik' };
    if (x >= 50) return { label: 'Sedang', warna: '#b26a00', latar: '#fff1da', kode: 'sedang' };
    return { label: 'Perlu perhatian', warna: '#c62828', latar: '#fde8e8', kode: 'kurang' };
  }

  // ---------------- kualitas pengisian (anti asal jawab) ----------------
  // detik: { idButir: detikTotalDiButirItu }
  function periksaKualitas(jenis, jawaban, detik, set) {
    const J = set || JENIS[jenis]; const alasan = []; const n = J.butir.length;
    const ids = J.butir.map(r => r[0]);
    // 1) terlalu cepat: rata-rata < 3 dtk/butir, atau >= 40% butir dijawab < 1,5 dtk
    const waktu = ids.map(id => Number((detik || {})[id]) || 0);
    const total = waktu.reduce((a, b) => a + b, 0);
    const cepat = waktu.filter(w => w < 1.5).length;
    const terlaluCepat = (total / n) < 3 || (cepat / n) >= 0.4;
    if (terlaluCepat) alasan.push('Terlalu cepat (rata-rata ' + (total / n).toFixed(1).replace('.', ',') + ' detik per butir)');
    // 2) seragam: >= 85% butir dijawab dengan nomor pilihan yang sama padahal ada butir positif & negatif
    const hit = {}; ids.forEach(id => { const p = (jawaban || {})[id]; if (p) hit[p] = (hit[p] || 0) + 1; });
    const maks = Math.max.apply(null, Object.keys(hit).map(k => hit[k]).concat([0]));
    const seragam = maks / n >= 0.85;
    if (seragam) alasan.push('Jawaban hampir seragam (' + Math.round(maks / n * 100) + '% memilih nomor pilihan yang sama)');
    // 3) bertentangan: pasangan butir berlawanan yang skornya berbeda >= 3 (mis. "Sangat setuju" untuk kedua pernyataan yang berlawanan)
    const bertentangan = [];
    (J.pasangan || []).forEach(p => {
      const a = skorButir(J.map[p[0]], (jawaban || {})[p[0]]), b = skorButir(J.map[p[1]], (jawaban || {})[p[1]]);
      if (a !== null && b !== null && Math.abs(a - b) >= 3) bertentangan.push(p);
    });
    const tidakKonsisten = bertentangan.length >= 2;
    if (tidakKonsisten) alasan.push(bertentangan.length + ' pasang pernyataan berlawanan dijawab saling bertentangan');
    // ---- NILAI KESUNGGUHAN (0-100): mengukur ketelitian mengisi, BUKAN seberapa "baik" jawabannya.
    // Siswa yang jujur namun hasil indeksnya rendah tetap bisa bernilai kesungguhan tinggi.
    const klamp = (x) => Math.max(0, Math.min(1, x));
    const adaPasangan = (J.pasangan || []).length > 0;
    const bW = adaPasangan ? 45 : 60, bV = adaPasangan ? 25 : 40, bK = adaPasangan ? 30 : 0;
    const rata = total / n, bagi = maks / n;
    const pW = bW * klamp((rata - 1) / 3);                       // rata-rata <= 1 dtk/butir = 0; >= 4 dtk = penuh
    const pV = bV * klamp((0.90 - bagi) / (0.90 - 0.55));        // >= 90% pilihan sama = 0; <= 55% = penuh
    const pK = adaPasangan ? bK * klamp(1 - bertentangan.length / Math.max(1, Math.min(3, J.pasangan.length))) : 0; // 3 pasang bertentangan = 0
    const nilai = Math.round(pW + pV + pK);
    if (nilai < 60 && alasan.length === 0) alasan.push('Nilai kesungguhan rendah');
    return { baik: alasan.length === 0, alasan, terlaluCepat, seragam, tidakKonsisten, bertentangan, rataDetik: bulat2(total / n), nilai,
      komponen: { waktu: [Math.round(pW), bW], variasi: [Math.round(pV), bV], konsistensi: adaPasangan ? [Math.round(pK), bK] : null } };
  }

  function kategoriKesungguhan(x) {
    if (x === null || x === undefined || isNaN(x)) return { label: '-', warna: '#6c757d', latar: '#eceff1', kode: 'na' };
    if (x >= 80) return { label: 'Sangat teliti', warna: '#1b7f4b', latar: '#e3f6ec', kode: 'baik' };
    if (x >= 60) return { label: 'Cukup teliti', warna: '#b26a00', latar: '#fff1da', kode: 'sedang' };
    return { label: 'Asal-asalan', warna: '#c62828', latar: '#fde8e8', kode: 'kurang' };
  }
  function htmlKesungguhan(q, guru) {
    if (!q || q.nilai === undefined || q.nilai === null) return '';
    const k = kategoriKesungguhan(q.nilai); const c = q.komponen || {};
    const baris = [['Waktu membaca', c.waktu], ['Variasi jawaban', c.variasi], ['Konsistensi jawaban', c.konsistensi]].filter(x => x[1]).map(x => `<span>${x[0]}: <b>${x[1][0]}</b>/${x[1][1]}</span>`).join('');
    return `<div class="sv-kes" style="border-color:${k.warna}"><div class="sv-kes-n" style="color:${k.warna}">${q.nilai}</div><div class="sv-kes-i"><div class="sv-kes-t">Nilai Kesungguhan Mengisi Survei <span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${k.label}</span></div><div class="sv-kes-k">${baris}</div>
      <div class="sv-kes-p">${guru ? 'Mengukur ketelitian mengisi (waktu baca, variasi, konsistensi), bukan benar/salah. Nilai rendah berarti nilai survei siswa ini kurang dapat dipercaya.' : 'Nilai ini mengukur ketelitian dan kesungguhan Anda dalam mengisi. Jawab jujur dan teliti agar hasil survei sekolah mencerminkan keadaan sebenarnya.'}</div>${q.alasan && q.alasan.length ? `<div class="sv-kes-a">${esc(q.alasan.join('; '))}</div>` : ''}</div></div>`;
  }

  // =====================================================================================
  //  SISWA — layar survei (satu butir per halaman, gaya ANBK)
  // =====================================================================================
  const S = { jenis: '', set: null, sesiId: '', jawaban: {}, detik: {}, idx: 0, tahap: 'intro', mulai: 0, tMasuk: 0, selesai: null, tampilHasil: false, diingatkan: false, dikunjungi: {}, ragu: {} };
  // S.idx = nomor HALAMAN (bukan butir). Satu halaman bisa memuat beberapa butir (tampilan matriks seperti ANBK).
  const hlm = () => S.set.halamanList;
  const halLengkap = (p) => p.idx.every(i => S.jawaban[S.set.butir[i][0]]);
  const adaMatriks = () => hlm().some(p => p.idx.length > 1);

  function catatWaktuButir() {
    if (!S.set || S.tahap !== 'butir' || !S.tMasuk) return;
    const p = hlm()[S.idx]; const dt = (Date.now() - S.tMasuk) / 1000 / p.idx.length; // waktu halaman dibagi rata ke butirnya
    p.idx.forEach(i => { const id = S.set.butir[i][0]; S.detik[id] = bulat2((S.detik[id] || 0) + dt); });
    S.tMasuk = 0;
  }
  function masukHalaman(i) { catatWaktuButir(); S.idx = i; S.tahap = 'butir'; S.tMasuk = Date.now(); render(); }
  const halamanDariButir = (bi) => Math.max(0, hlm().findIndex(p => p.idx.indexOf(bi) >= 0));

  function htmlHalaman(p) {
    const J = S.set; const sk = SKALA[p.skala];
    const petunjuk = (p.hal && J.petunjuk[p.hal]) || PETUNJUK_DEF[p.skala] || '';
    if (p.idx.length === 1) {
      const b = J.butir[p.idx[0]]; const id = b[0]; const terpilih = S.jawaban[id];
      return `<div class="sv-pad"><div class="sv-dim">${esc(J.dimNama[b[1]])}</div>
        <p class="sv-q">${esc(b[4])}${b[6] ? ` <small class="sv-kode">(${esc(b[6])})</small>` : ''}</p><p class="sv-ket">${esc(petunjuk)}</p>
        <div class="sv-opsi" role="radiogroup">${sk.map((t, k) => `<label class="sv-o${terpilih === k + 1 ? ' on' : ''}"><input type="radio" name="sv-o" value="${k + 1}" ${terpilih === k + 1 ? 'checked' : ''} onchange="Survei.pilih(${k + 1})"><span class="sv-r"></span><span>${esc(t)}</span></label>`).join('')}</div></div>`;
    }
    const baris = p.idx.map(i => {
      const b = J.butir[i]; const id = b[0]; const terpilih = S.jawaban[id];
      return `<tr class="${terpilih ? 'done' : ''}" id="sv-row-${id}"><td class="sv-mx-t">${esc(b[4])}${b[6] ? ` <small class="sv-kode">(${esc(b[6])})</small>` : ''}</td>${sk.map((t, k) => `<td class="sv-mx-c"><label><input type="radio" name="m-${id}" value="${k + 1}" ${terpilih === k + 1 ? 'checked' : ''} onchange="Survei.pilihId('${id}',${k + 1})"><span class="sv-r"></span><span class="sv-mx-l">${esc(t)}</span></label></td>`).join('')}</tr>`;
    }).join('');
    return `<div class="sv-pad"><p class="sv-ket sv-ket-m"><b>${esc(petunjuk)}</b></p>
      <div class="sv-mx-wrap"><table class="sv-mx"><thead><tr><th class="sv-mx-t">Pernyataan</th>${sk.map(t => `<th>${esc(t)}</th>`).join('')}</tr></thead><tbody>${baris}</tbody></table></div></div>`;
  }

  function render() {
    const J = S.set; const box = $('sv-body'); if (!J || !box) return;
    const total = J.butir.length; const hl = hlm();
    const jml = Object.keys(S.jawaban).length;
    $('sv-judul').textContent = J.nama;
    $('sv-progres').textContent = jml + ' / ' + total + ' terjawab';
    const nav = $('sv-nav'); nav.setAttribute('data-tahap', S.tahap);
    if (S.tahap === 'intro') {
      $('sv-nomor').textContent = 'Petunjuk Pengerjaan';
      box.innerHTML = `<div class="sv-pad"><div class="sv-intro"><i class="fa-solid ${J.ikon}"></i><h3>${esc(J.nama)}</h3></div>
        <p class="sv-p">Terima kasih telah menyelesaikan tes. Selanjutnya Anda diminta mengisi <b>${esc(J.nama)}</b> sebanyak <b>${total} butir</b>${adaMatriks() ? ' dalam <b>' + hl.length + ' halaman</b>' : ''}.</p>
        <ul class="sv-ul"><li><b>Jawaban jujur Anda sangat berarti bagi sekolah.</b> Pilihlah jawaban yang paling menggambarkan keadaan Anda yang sebenarnya, bukan jawaban yang menurut Anda &quot;paling baik&quot;.</li>
        ${S.durasiMenit > 0 ? `<li>Waktu pengerjaan survei: <b>${S.durasiMenit} menit</b>, dihitung sejak Anda menekan <b>MULAI SURVEI</b>. Bila waktu habis, jawaban yang sudah diisi terkirim otomatis.</li>` : ''}
        <li>Semua butir <b>wajib dijawab</b>. Bacalah setiap pernyataan dengan teliti.</li>
        <li>Anda akan mendapat <b>Nilai Kesungguhan</b> (0–100). Mengisi terlalu cepat, memilih pola jawaban yang sama terus-menerus, atau menjawab pernyataan yang berlawanan secara bertentangan <b>menurunkan nilai</b> dan membuat hasil survei Anda tidak dapat dipercaya.</li>
        <li>Anda dapat kembali ke ${adaMatriks() ? 'halaman' : 'butir'} sebelumnya untuk mengubah jawaban sebelum menekan <b>Selesai</b>.</li>
        <li>Jawaban Anda dipakai untuk memperbaiki lingkungan dan pembelajaran di sekolah.</li></ul></div>`;
      nav.innerHTML = `<span></span><button type="button" class="anbk-btn anbk-btn-primary" onclick="Survei.mulai()"><span>MULAI SURVEI</span> <i class="fa-solid fa-circle-chevron-right"></i></button><span></span>`;
    } else if (S.tahap === 'butir') {
      const p = hl[S.idx]; const awal = p.idx[0] + 1;
      $('sv-nomor').textContent = adaMatriks() ? 'Halaman ' + (S.idx + 1) + ' dari ' + hl.length : 'Butir nomor ' + awal;
      box.innerHTML = `<div class="sv-layout"><aside class="sv-panel"><div class="sv-panel-t">Halaman Kuesioner</div><div class="sv-panel-g">${hl.map((h, i) => {
        const lengkap = halLengkap(h); const cls = S.ragu[i] ? 'ragu' : (lengkap ? 'ok' : (S.dikunjungi[i] || i < S.idx ? 'kosong' : 'baru'));
        return `<button type="button" class="sv-pn ${cls}${i === S.idx ? ' now' : ''}" onclick="Survei.lompat(${i})" title="Halaman ${i + 1}">${i + 1}</button>`;
      }).join('')}</div></aside><div class="sv-main">${htmlHalaman(p)}</div></div>`;
      S.dikunjungi[S.idx] = true;
      const akhir = S.idx === hl.length - 1;
      nav.innerHTML = `<button type="button" id="sv-btn-prev" class="anbk-btn anbk-btn-red" ${S.idx === 0 ? 'disabled' : ''} onclick="Survei.geser(-1)"><i class="fa-solid fa-circle-chevron-left"></i> <span>${adaMatriks() ? 'Halaman' : 'Butir'} sebelumnya</span></button>
        <label class="anbk-btn anbk-btn-yellow anbk-ragu" title="Ragu-ragu"><input type="checkbox" id="sv-chk-ragu" ${S.ragu[S.idx] ? 'checked' : ''} onchange="Survei.toggleRagu()"><span>Ragu-ragu</span></label>
        <button type="button" class="anbk-btn anbk-btn-primary" id="sv-btn-next" ${halLengkap(p) ? '' : 'disabled'} onclick="Survei.geser(1)"><span>${akhir ? 'Selesai' : (adaMatriks() ? 'Halaman' : 'Butir') + ' berikutnya'}</span> <i class="fa-solid ${akhir ? 'fa-flag-checkered' : 'fa-circle-chevron-right'}"></i></button>`;
    } else if (S.tahap === 'konfirmasi') {
      $('sv-nomor').textContent = 'Konfirmasi Survei';
      const kosong = J.butir.map((r, i) => [r[0], i]).filter(x => !S.jawaban[x[0]]);
      const raguList = Object.keys(S.ragu).map(Number).filter(i => i < hl.length).sort((a, b) => a - b);
      box.innerHTML = `<div class="sv-pad">${S.waktuHabis ? '<div class="anbk-peringatan"><p><b>Waktu pengerjaan survei habis.</b> Jawaban yang sudah diisi sedang dikirim. Bila gagal, tekan SELESAI SURVEI untuk mengirim ulang.</p></div>' : ''}<p class="sv-p">Terima kasih telah mengisi survei ini. Tekan tombol <mark class="anbk-mark anbk-mark-red">SELESAI SURVEI</mark> untuk mengirim jawaban, atau <mark class="anbk-mark anbk-mark-green">KEMBALI</mark> untuk memeriksa jawaban Anda.</p>
        <div class="anbk-ringkas"><span>Terjawab <b>${jml}</b></span><span>Belum dijawab <b>${kosong.length}</b></span><span>Ragu-ragu <b>${raguList.length}</b></span></div>
        ${raguList.length ? `<div class="anbk-peringatan"><p>${raguList.length} ${adaMatriks() ? 'halaman' : 'butir'} masih ditandai ragu-ragu. Anda boleh memeriksanya kembali sebelum mengirim.</p><div class="kumpul-chips">${raguList.map(i => `<button type="button" class="kumpul-chip" onclick="Survei.lompat(${i})">${i + 1}</button>`).join('')}</div></div>` : ''}
        ${kosong.length ? `<div class="anbk-peringatan"><p>Masih ada butir yang belum dijawab. Semua butir wajib dijawab.</p><div class="kumpul-chips">${kosong.map(x => `<button type="button" class="kumpul-chip" onclick="Survei.lompatButir(${x[1]})">${x[1] + 1}</button>`).join('')}</div></div>` : ''}</div>`;
      nav.innerHTML = `<button type="button" id="sv-btn-kembali" class="anbk-btn anbk-btn-green" onclick="Survei.lompat(${Math.min(S.idx, hl.length - 1)})">KEMBALI</button><span></span>
        <button type="button" class="anbk-btn anbk-btn-red" ${kosong.length && !S.waktuHabis ? 'disabled' : ''} id="sv-btn-kirim" onclick="Survei.kirim()">SELESAI SURVEI</button>`;
    }
    terapkanSkala();
    window.scrollTo(0, 0);
  }

  // ---- ukuran font survei: 3 tingkat "A A A" (seperti halaman tes) ----
  const SKALA_SV = [1, 1.2, 1.45]; let skalaIdx = 0;
  try { const q = parseInt(localStorage.getItem('cbt_skala_survei'), 10); if (q >= 0 && q < 3) skalaIdx = q; } catch (e) { /* abaikan */ }
  function terapkanSkala() {
    const sc = $('survei-screen'); if (!sc) return;
    const s = SKALA_SV[skalaIdx];
    sc.style.setProperty('--sv-skala', s);
    sc.style.setProperty('--sv-skala-h', 1 + (s - 1) * 0.4); // header kolom tabel naik lebih sedikit agar tidak berdesakan
    [0, 1, 2].forEach(k => { const b = $('sv-skala-' + k); if (b) { b.classList.toggle('on', k === skalaIdx); b.setAttribute('aria-pressed', k === skalaIdx ? 'true' : 'false'); } });
  }
  function skala(i) { skalaIdx = i; try { localStorage.setItem('cbt_skala_survei', String(i)); } catch (e) { /* abaikan */ } terapkanSkala(); }

  function simpanSementara() { try { sessionStorage.setItem('cbt_survei_' + S.sesiId, JSON.stringify({ j: S.jawaban, d: S.detik, r: S.ragu })); } catch (e) { } }
  function pilihId(id, n) {
    S.jawaban[id] = n;
    const p = hlm()[S.idx];
    const nx = $('sv-btn-next'); if (nx) nx.disabled = !halLengkap(p);
    const row = $('sv-row-' + id); if (row) row.classList.add('done');
    $('sv-progres').textContent = Object.keys(S.jawaban).length + ' / ' + S.set.butir.length + ' terjawab';
    simpanSementara();
  }
  function pilih(n) { // halaman satu butir
    const id = S.set.butir[hlm()[S.idx].idx[0]][0];
    pilihId(id, n);
    document.querySelectorAll('#sv-body .sv-o').forEach((el, k) => el.classList.toggle('on', k + 1 === n));
  }
  function geser(arah) {
    const hl = hlm(); const to = S.idx + arah;
    if (arah > 0 && !halLengkap(hl[S.idx])) return;
    if (to < 0) return;
    // pengingat saat mengisi: halaman ini ditinggalkan < 3 detik per butir, tiga kali berturut-turut -> pop up (maks. 2 kali)
    let ingatkan = false;
    if (arah > 0 && S.tahap === 'butir' && S.tMasuk) {
      const n = hl[S.idx].idx.length; const dt = (Date.now() - S.tMasuk) / 1000 / n;
      S.cepatBeruntun = dt < 3 ? (S.cepatBeruntun || 0) + 1 : 0;
      if (S.cepatBeruntun >= 3 && (S.pengingat || 0) < 2) { S.pengingat = (S.pengingat || 0) + 1; S.cepatBeruntun = 0; ingatkan = true; }
    }
    if (to >= hl.length) { catatWaktuButir(); S.tahap = 'konfirmasi'; S.tMasuk = 0; render(); return; }
    masukHalaman(to);
    if (ingatkan) setTimeout(tampilPengingat, 0);
  }

  // Pop up pengingat saat mengisi. Waktu selama pop up terbuka tidak dihitung sebagai waktu membaca.
  function tampilPengingat() {
    if (S.tahap !== 'butir' || document.querySelector('.wr-bg')) return;
    catatWaktuButir();
    const el = document.createElement('div');
    el.className = 'wr-bg';
    el.innerHTML = `<div class="wr-box" role="alertdialog" aria-modal="true"><div class="wr-head"><div class="wr-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div><div class="wr-lbl">Peringatan!</div><h3 class="wr-title">Anda mengisi terlalu cepat</h3></div></div>
      <div class="wr-body"><p class="wr-tegas">Anda terdeteksi mengisi asal-asalan.</p><p>Pelan-pelan saja. Bacalah setiap pernyataan dengan teliti dan jawablah dengan baik.</p></div>
      <div class="wr-aksi"><button type="button" class="wr-btn wr-btn-merah" data-a="lanjut">Lanjutkan Mengerjakan</button></div></div>`;
    el.addEventListener('click', ev => { if (!ev.target.closest('[data-a]')) return; el.remove(); if (S.tahap === 'butir') S.tMasuk = Date.now(); });
    document.body.appendChild(el);
  }
  function toggleRagu() {
    const el = $('sv-chk-ragu'); if (!el || S.tahap !== 'butir') return;
    if (el.checked) S.ragu[S.idx] = 1; else delete S.ragu[S.idx];
    const tomb = document.querySelectorAll('#sv-body .sv-pn')[S.idx];
    if (tomb) {
      const p = hlm()[S.idx];
      tomb.classList.remove('ok', 'kosong', 'baru', 'ragu');
      tomb.classList.add(S.ragu[S.idx] ? 'ragu' : (halLengkap(p) ? 'ok' : 'kosong'));
    }
    simpanSementara();
  }
  function lompat(i) { masukHalaman(i); }
  function lompatButir(bi) { masukHalaman(halamanDariButir(bi)); }
  function mulai() { mulaiWaktu(); masukHalaman(0); }

  // ---- Waktu pengerjaan survei (diatur guru di Kelola Ujian; 0 = tanpa batas) ----
  const KUNCI_WAKTU = () => 'cbt_survei_t_' + S.sesiId;
  function formatSisa(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000)); const p = (n) => String(n).padStart(2, '0');
    return p(Math.floor(t / 3600)) + ':' + p(Math.floor((t % 3600) / 60)) + ':' + p(t % 60);
  }
  function hentikanWaktu() {
    if (S.timerId) { clearInterval(S.timerId); S.timerId = null; }
    const el = $('sv-timer'); if (el) el.classList.add('hidden');
  }
  // Sebelum survei dimulai: tampilkan lama waktu. Sesudah dimulai: hitung mundur "Sisa Waktu".
  function tampilWaktu() {
    const el = $('sv-timer'); if (!el || !(S.durasiMenit > 0)) return;
    el.classList.remove('hidden');
    if (!S.batasWaktu) { el.innerHTML = 'Waktu Pengerjaan : <b>' + S.durasiMenit + ' menit</b>'; return; }
    const sisa = S.batasWaktu - Date.now();
    el.innerHTML = 'Sisa Waktu : <b>' + formatSisa(sisa) + '</b>';
    const b = el.querySelector('b'); if (b) b.classList.toggle('low', sisa <= 60000);
    if (sisa <= 0) waktuHabis();
  }
  function mulaiWaktu() {
    if (!(S.durasiMenit > 0) || S.timerId) return;
    if (!S.tMulaiWaktu) { S.tMulaiWaktu = Date.now(); try { sessionStorage.setItem(KUNCI_WAKTU(), String(S.tMulaiWaktu)); } catch (e) { /* abaikan */ } }
    S.batasWaktu = S.tMulaiWaktu + S.durasiMenit * 60000;
    tampilWaktu();
    S.timerId = setInterval(tampilWaktu, 1000);
  }
  function waktuHabis() {
    if (S.waktuHabis || !S.set) return;
    S.waktuHabis = true;
    if (S.timerId) { clearInterval(S.timerId); S.timerId = null; }
    // Pop up pengingat ditutup; bila pop up peringatan sebelum kirim sedang terbuka, lanjutkan kirim lewat tombolnya.
    const tk = document.querySelector('.wr-bg [data-a="kirim"]');
    document.querySelectorAll('.wr-bg').forEach(e => { if (!e.contains(tk)) e.remove(); });
    if (tk) { tk.click(); return; }
    if (S.kirimBusy) return;
    catatWaktuButir();
    S.tahap = 'konfirmasi'; S.tMasuk = 0; S.diingatkan = true;
    render();
    kirim();
  }

  function tampilPeringatan(q) {
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'wr-bg';
      const cepat = q.terlaluCepat || q.seragam;
      el.innerHTML = `<div class="wr-box" role="alertdialog" aria-modal="true"><div class="wr-head"><div class="wr-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div><div class="wr-lbl">Peringatan! ${cepat ? 'Terdeteksi asal-asalan' : 'Pengisian kurang teliti'}</div><h3 class="wr-title">${cepat ? 'Anda terdeteksi mengisi terlalu cepat' : 'Periksa kembali jawaban Anda'}</h3></div></div>
        <div class="wr-body">
        <p class="wr-tegas">${cepat ? 'Anda terdeteksi mengisi terlalu cepat, asal-asalan, atau asal klik.' : 'Jawaban Anda terlihat kurang teliti.'}</p>
        <p>Perkiraan <b>Nilai Kesungguhan</b> Anda saat ini: <b style="color:${kategoriKesungguhan(q.nilai).warna}">${q.nilai}</b> (${kategoriKesungguhan(q.nilai).label}).</p><ul>${q.alasan.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
        <p>Ingat: <b>jawaban jujur Anda sangat berarti bagi sekolah</b> dalam meningkatkan layanan dan lingkungan belajar. Bacalah tiap pernyataan, lalu pilih yang paling menggambarkan keadaan Anda sebenarnya.</p></div>
        <div class="wr-aksi"><button type="button" class="wr-btn wr-btn-hijau" data-a="ulang">Periksa Kembali</button><button type="button" class="wr-btn wr-btn-merah" data-a="kirim">Tetap Kirim</button></div></div>`;
      el.addEventListener('click', ev => { const a = ev.target.closest('[data-a]'); if (!a) return; el.remove(); res(a.dataset.a); });
      document.body.appendChild(el);
    });
  }

  // ---- Pop up "Mengirim survei..." (memakai layar #overlay-kirim yang sama dengan pengiriman jawaban ujian) ----
  const elK = (id) => document.getElementById(id);
  function namaJenisKirim() { try { return (JENIS && JENIS[S.jenis] && JENIS[S.jenis].nama) || 'survei'; } catch (e) { return 'survei'; } }
  function tampilKirimSurvei() {
    const o = elK('overlay-kirim'); if (!o) return;
    try { if (typeof KumpulUI !== 'undefined') KumpulUI.tutup(); } catch (e) { /* abaikan */ }
    const sp = elK('kirim-spinner'); if (sp) { sp.className = 'kumpul-spinner'; sp.innerHTML = ''; }
    const j = elK('kirim-judul'); if (j) j.textContent = 'Mengirim ' + namaJenisKirim() + '...';
    const t = elK('kirim-sub'); if (t) t.textContent = 'Mohon tunggu dan jangan menutup halaman ini.';
    o.classList.remove('hidden');
  }
  function gagalKirimSurvei(percobaanBerikut) {
    const sp = elK('kirim-spinner'); if (sp) sp.className = 'kumpul-spinner err';
    const j = elK('kirim-judul'); if (j) j.textContent = 'Koneksi bermasalah';
    const t = elK('kirim-sub'); if (t) t.textContent = 'Jawaban Anda aman di perangkat ini. Mencoba mengirim ulang otomatis (percobaan ke-' + percobaanBerikut + ')...';
    setTimeout(() => { const s2 = elK('kirim-spinner'); if (s2 && s2.className.indexOf('err') >= 0) s2.className = 'kumpul-spinner'; }, 800);
  }
  async function suksesKirimSurvei() {
    const sp = elK('kirim-spinner'); if (sp) { sp.className = 'kumpul-spinner ok'; sp.innerHTML = '<i class="fa-solid fa-check" style="font-size:1.6rem;line-height:44px;color:var(--c-success)"></i>'; }
    const j = elK('kirim-judul'); if (j) j.textContent = namaJenisKirim().replace(/^./, (h) => h.toUpperCase()) + ' Terkirim';
    const t = elK('kirim-sub'); if (t) t.textContent = 'Terima kasih. Menyiapkan halaman berikutnya...';
    await new Promise((r) => setTimeout(r, 700));
  }
  function sembunyikanKirimSurvei() {
    const o = elK('overlay-kirim'); if (o) o.classList.add('hidden');
    const sp = elK('kirim-spinner'); if (sp) { sp.innerHTML = ''; sp.className = 'kumpul-spinner'; }
  }

  async function kirim() {
    if (S.kirimBusy) return; S.kirimBusy = true;
    let overlayTampil = false;
    try {
      const J = S.set;
      const kualitas = periksaKualitas(S.jenis, S.jawaban, S.detik, S.set);
      if (!kualitas.baik && !S.diingatkan) {
        S.diingatkan = true;
        const pilihan = await tampilPeringatan(kualitas);
        if (pilihan === 'ulang') { lompat(0); return; }
      }
      if (S.waktuHabis) { // waktu habis: tidak ada peringatan tambahan; guru diberi tanda di Hasil Survei
        kualitas.baik = false;
        kualitas.alasan = (kualitas.alasan || []).concat(['Waktu pengerjaan survei habis (' + Object.keys(S.jawaban).length + ' dari ' + S.set.butir.length + ' butir terjawab).']);
      }
      const durasi = Math.round((Date.now() - S.mulai) / 1000);
      const btn = $('sv-btn-kirim'); if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }
      tampilKirimSurvei(); overlayTampil = true;
      let res = null;
      for (let k = 1; k <= 4; k++) {
        try { res = await api('simpanSurvei', { sesiId: S.sesiId, siswaId: state.user.id, jenis: S.jenis, jawaban: JSON.stringify(S.jawaban), durasiDetik: durasi, kualitas: JSON.stringify({ baik: kualitas.baik, alasan: kualitas.alasan, rataDetik: kualitas.rataDetik, nilai: kualitas.nilai, komponen: kualitas.komponen }) }); } catch (e) { res = null; }
        if (res && res.ok) break;
        if (k < 4) gagalKirimSurvei(k + 1);
        await new Promise(r => setTimeout(r, 900 * k));
      }
      if (!res || !res.ok) { sembunyikanKirimSurvei(); overlayTampil = false; toast((res && res.error) || 'Survei belum terkirim. Periksa koneksi lalu coba lagi.', 'error'); if (btn) { btn.disabled = false; btn.textContent = 'SELESAI SURVEI'; } return; }
      try { sessionStorage.removeItem('cbt_survei_' + S.sesiId); sessionStorage.removeItem(KUNCI_WAKTU()); } catch (e) { }
      hentikanWaktu();
      S.kualitasAkhir = { baik: kualitas.baik, alasan: kualitas.alasan, rataDetik: kualitas.rataDetik, nilai: kualitas.nilai, komponen: kualitas.komponen };
      await suksesKirimSurvei(); sembunyikanKirimSurvei(); overlayTampil = false;
      S.selesai && S.selesai(res);
    } finally { if (overlayTampil) sembunyikanKirimSurvei(); S.kirimBusy = false; }
  }

  // Dipanggil sebelum layar nilai tampil. Mengembalikan Promise yang selesai setelah survei terkirim (atau tidak diperlukan).
  async function jalankanBila() {
    if (!state.user || state.user.role !== 'siswa' || !state.sesiId) return;
    let info = null;
    try { info = await api('getSurveiSesi', { sesiId: state.sesiId, siswaId: state.user.id }); } catch (e) { info = null; }
    if (!info || !info.ok || !info.jenis || info.sudah || !JENIS[info.jenis]) return;
    let simpan = null; try { simpan = JSON.parse(sessionStorage.getItem('cbt_survei_' + state.sesiId) || 'null'); } catch (e) { }
    hentikanWaktu();
    let tMulaiSimpan = 0; try { tMulaiSimpan = parseInt(sessionStorage.getItem('cbt_survei_t_' + state.sesiId), 10) || 0; } catch (e) { }
    Object.assign(S, { durasiMenit: Math.max(0, Math.floor(Number(info.durasiMenit)) || 0), tMulaiWaktu: tMulaiSimpan, batasWaktu: 0, timerId: null, waktuHabis: false, jenis: info.jenis, set: bangunSet(info.jenis, info.set), sesiId: state.sesiId, jawaban: (simpan && simpan.j) || {}, detik: (simpan && simpan.d) || {}, idx: 0, tahap: 'intro', mulai: Date.now(), tMasuk: 0, diingatkan: false, cepatBeruntun: 0, pengingat: 0, kirimBusy: false, dikunjungi: {}, ragu: (simpan && simpan.r) || {}, tampilHasil: !!info.tampilHasil });
    const sc = $('survei-screen'); if (!sc) return;
    try { KumpulUI.sembunyikanSemua(); } catch (e) { }
    UI.tampilkan('survei-screen');
    const anticheat = $('anticheat-warning'); if (anticheat) anticheat.classList.add('hidden');
    render();
    setTimeout(() => { if (S.durasiMenit > 0) { if (S.tMulaiWaktu) mulaiWaktu(); else tampilWaktu(); } }, 0); // tampilkan waktu; lanjutkan hitung mundur bila halaman dimuat ulang
    // Anti-nyontek yang sama dengan halaman soal (layar penuh, alarm, screenshot, watermark, blokir salin) aktif selama survei.
    // Kejadian dicatat ke log guru dengan awalan "[Survei]" dan TIDAK menambah hitungan pelanggaran ujian / tidak memblokir.
    // Matikan lewat config.js: window.CBT_ANTICHEAT_SURVEI = false;
    const kunciSurvei = window.CBT_ANTICHEAT_SURVEI !== false && typeof AntiCheat !== 'undefined' && !(AntiCheat.dimatikan && AntiCheat.dimatikan()); // ikut pengaturan anti-curang ujian
    const akhiriKunci = () => {
      if (!kunciSurvei || !AntiCheat.modeSurvei) return;
      try { AntiCheat.nonaktifkan(); } catch (e) { /* abaikan */ }
      AntiCheat.modeSurvei = false;
      const w = $('anticheat-warning'); if (w) w.classList.add('hidden');
    };
    if (kunciSurvei) { try { AntiCheat.modeSurvei = true; AntiCheat.aktifkan(); } catch (e) { AntiCheat.modeSurvei = false; } }
    await new Promise(resolve => {
      S.selesai = async (res) => {
        S.selesai = null;
        akhiriKunci();
        await tampilRingkasanSiswa(); // Nilai Kesungguhan selalu tampil; indeks per dimensi hanya bila diaktifkan di Kelola Ujian
        resolve();
      };
    });
  }

  function tampilRingkasanSiswa() {
    return new Promise(resolve => {
      const h = hitung(S.jenis, S.jawaban, S.set); const J = S.set;
      let indeks = '';
      if (S.tampilHasil) {
        const baris = J.dim.map(d => { const x = h.dim[d[0]]; const k = kategoriIndeks(x.indeks); return `<div class="sv-bar"><div class="sv-bar-t"><span>${esc(d[1])}</span><b style="color:${k.warna}">${x.indeks === null ? '-' : String(x.indeks).replace('.', ',')}</b></div><div class="sv-bar-b"><i style="width:${x.indeks || 0}%;background:${k.warna}"></i></div><small class="sv-bar-s" style="color:${k.warna};background:${k.latar}">${k.label}</small></div>`; }).join('');
        const total = S.jenis === 'karakter' ? `<div class="sv-total"><span>Nilai Survei Karakter</span><b>${String(h.total).replace('.', ',')}</b></div>` : '';
        indeks = `<p class="sv-ket sv-ket-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>Nilai survei (0–100) ini untuk latihan agar siswa menjawab jujur dan teliti. Pada ANBK/TKA sesungguhnya, siswa tidak melihat hasil survei.</span></p>${total}<div class="sv-bars">${baris}</div>`;
      }
      $('sv-nomor').textContent = 'Survei Terkirim';
      $('sv-progres').textContent = 'Selesai';
      $('sv-body').innerHTML = `<div class="sv-pad sv-hasil"><p class="sv-p sv-sukses"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Survei Anda sudah terkirim. Terima kasih.</p>${htmlKesungguhan(S.kualitasAkhir, false)}${indeks}</div>`;
      $('sv-nav').innerHTML = `<span></span><button type="button" class="anbk-btn anbk-btn-primary" id="sv-btn-lanjut"><span>LIHAT HASIL TES</span> <i class="fa-solid fa-circle-chevron-right"></i></button><span></span>`;
      $('sv-btn-lanjut').onclick = () => resolve();
      window.scrollTo(0, 0);
    });
  }

  // =====================================================================================
  //  GURU — Hasil Survei
  // =====================================================================================
  const G = { data: [], jenis: '', set: null, ujianId: '' };
  const fmt = (x) => (x === null || x === undefined || isNaN(x)) ? '-' : String(x).replace('.', ',');

  async function guruMuatPilihan() {
    const sel = $('pilih-ujian-survei'); if (!sel) return;
    const lama = sel.value;
    const res = await api('getDaftarUjian', { guruId: state.user.id });
    if (!res.ok) return;
    await muatPaket(false);
    const list = res.data.filter(u => jenisUntukUjian(u, daftarPaket()));
    sel.innerHTML = '<option value="">Pilih ujian yang memakai survei...</option>' + list.map(u => `<option value="${esc(u.id)}">${esc(u.judul)} — ${esc(JENIS[jenisUntukUjian(u, daftarPaket())].nama)}</option>`).join('');
    if (lama && list.some(u => u.id === lama)) sel.value = lama;
    if (!list.length) $('tabel-survei').innerHTML = '<p class="subtitle">Belum ada ujian dengan survei. Buka <b>Kelola Ujian</b> lalu atur <b>Survei Setelah Ujian</b>.</p>';
  }

  async function guruMuat() {
    const ujianId = $('pilih-ujian-survei').value; const cont = $('tabel-survei');
    if (!ujianId) { cont.innerHTML = 'Pilih ujian terlebih dahulu.'; $('ringkas-survei').innerHTML = ''; return false; }
    const res = await api('getRekapSurvei', { ujianId });
    if (!res.ok) { cont.innerHTML = '<p class="subtitle" style="color:var(--c-danger)">' + esc(res.error || 'Gagal memuat.') + '</p>'; return false; }
    G.data = res.data || []; G.jenis = res.jenis || ''; G.set = bangunSet(G.jenis, res.set); G.ujianId = ujianId; G.belum = res.belum || 0;
    const kelas = Array.from(new Set(G.data.map(r => r.kelas))).sort();
    const sk = $('kelas-survei'); const lama = sk.value;
    sk.innerHTML = '<option value="">Semua Kelas</option>' + kelas.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
    if (kelas.indexOf(lama) >= 0) sk.value = lama;
    guruRender();
    return true;
  }

  function guruSaring() {
    const kls = $('kelas-survei').value; const q = ($('cari-survei').value || '').toLowerCase().trim();
    const sar = ($('saring-survei') || {}).value || '';
    return G.data.filter(r => (!kls || r.kelas === kls) && (!q || String(r.nama).toLowerCase().indexOf(q) >= 0) && (sar !== 'perhatian' || analisisBK(hitungBaris(r)).perlu));
  }

  // Opsi "Abaikan pengisian perlu dicek" (Hasil Survei): rata-rata kelas/dimensi/sub-indikator tidak ikut menghitung pengisian yang
  // ditandai terlalu cepat/seragam/bertentangan. Daftar siswa tetap menampilkan semuanya (dengan tanda), dan halaman detail tidak berubah.
  const abaikanDicek = () => !!(($('abaikan-dicek-survei') || {}).checked);
  function untukRata(rows) {
    if (!abaikanDicek()) return { rows, diabaikan: 0, semua: false };
    const baik = rows.filter(r => r._q && r._q.baik);
    if (!baik.length) return { rows, diabaikan: 0, semua: rows.length > 0 };
    return { rows: baik, diabaikan: rows.length - baik.length, semua: false };
  }
  const catatRata = (rt, total) => rt.diabaikan ? `Rata-rata dihitung dari ${rt.rows.length} dari ${total} pengisian (${rt.diabaikan} pengisian perlu dicek diabaikan).` : (rt.semua ? 'Semua pengisian ditandai perlu dicek, sehingga rata-rata tetap memakai seluruh pengisian.' : '');

  // Konfirmasi kerahasiaan sebelum dokumen/ekspor berisi jawaban survei per siswa dibuat.
  async function konfirmasiRahasia(apa) {
    return await Dialog.konfirmasi({
      judul: 'Dokumen Rahasia', tipe: 'warning', ikon: 'fa-user-shield',
      pesan: apa + ' berisi jawaban survei **per siswa**, termasuk laporan pengalaman tidak aman (mis. perundungan atau kekerasan).\n\nDokumen ini **RAHASIA dan hanya untuk guru BK / wali kelas**. Jangan dibagikan ke grup WhatsApp atau ke siswa lain, dan simpan di tempat yang aman.',
      teksYa: 'Saya Mengerti, Lanjutkan', teksBatal: 'Batal'
    });
  }

  // Analisis cepat satu siswa untuk guru BK: dimensi rendah, butir dengan skor rendah, dan (Sulingjar) pengalaman tidak aman.
  function analisisBK(r) {
    const J = G.set; const h = r._h;
    if (!J || !h) return { perlu: false, dimKurang: [], dimSedang: [], aman: [], butirRendah: [] };
    const dimKurang = J.dim.filter(d => h.dim[d[0]] && h.dim[d[0]].indeks !== null && h.dim[d[0]].indeks < 50);
    const dimSedang = J.dim.filter(d => h.dim[d[0]] && h.dim[d[0]].indeks !== null && h.dim[d[0]].indeks >= 50 && h.dim[d[0]].indeks < 75);
    const aman = G.jenis === 'sulingjar' ? dijawabPerhatian(r, J) : [];
    const butirRendah = J.butir.filter(b => h.butir[b[0]] !== undefined && h.butir[b[0]] <= 2 && aman.indexOf(b[0]) < 0)
      .sort((a, c) => h.butir[a[0]] - h.butir[c[0]]);
    return { perlu: dimKurang.length > 0 || aman.length > 0, dimKurang, dimSedang, aman, butirRendah };
  }

  // Ringkasan kejadian anti-nyontek saat survei (dari log "[Survei]"). TERPISAH dari hitungan pelanggaran ujian.
  function lgSurvei(x) { x = x || {}; return { pelanggaran: Number(x.pelanggaran) || 0, percobaan: Number(x.percobaan) || 0, gangguan: Number(x.gangguan) || 0, total: Number(x.total) || 0 }; }
  function selLgSurvei(lg) {
    lg = lgSurvei(lg);
    const rinci = [lg.percobaan ? lg.percobaan + ' percobaan diblokir' : '', lg.gangguan ? lg.gangguan + ' gangguan singkat' : ''].filter(Boolean).join(', ');
    const tip = 'Pelanggaran survei (keluar layar penuh/pindah tab/aplikasi/screenshot): ' + lg.pelanggaran + (rinci ? '. Selain itu: ' + rinci : '') + '. Tidak menambah hitungan pelanggaran ujian.';
    return `<span class="badge ${lg.pelanggaran ? 'no' : 'ok'}" title="${esc(tip)}">${lg.pelanggaran}</span>${rinci ? `<div class="sv-kes-mini" title="${esc(tip)}">${esc(rinci)}</div>` : ''}`;
  }

  function hitungBaris(r) {
    if (!r._h) { r._h = hitung(G.jenis, r.jawaban, G.set); const q = r.kualitas || {}; r._q = { baik: q.baik !== false, alasan: Array.isArray(q.alasan) ? q.alasan : [] }; r._lg = lgSurvei(r.logSurvei); }
    return r;
  }

  function guruRender() {
    const J = G.set; const cont = $('tabel-survei'); const ring = $('ringkas-survei');
    if (!J) { cont.innerHTML = ''; ring.innerHTML = ''; return; }
    const rows = guruSaring().map(hitungBaris);
    const rt = untukRata(rows), rr = rt.rows;
    if (!rows.length) { ring.innerHTML = ''; cont.innerHTML = '<p class="subtitle">Belum ada siswa yang mengisi survei' + (G.belum ? ' (' + G.belum + ' siswa selesai tes tetapi belum mengisi survei)' : '') + '.</p>'; return; }
    // rata-rata per dimensi
    const rata = {}; J.dim.forEach(d => { const v = rr.map(r => r._h.dim[d[0]].indeks).filter(x => x !== null); rata[d[0]] = v.length ? bulat2(v.reduce((a, b) => a + b, 0) / v.length) : null; });
    const totalKelas = bulat2(rr.map(r => r._h.total).reduce((a, b) => a + b, 0) / rr.length);
    const kartu = J.dim.map(d => { const k = kategoriIndeks(rata[d[0]]); return `<div class="sv-kartu"><div class="sv-kartu-t">${esc(d[1])}</div><div class="sv-kartu-n" style="color:${k.warna}">${fmt(rata[d[0]])}</div><div class="sv-bar-b"><i style="width:${rata[d[0]] || 0}%;background:${k.warna}"></i></div><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${k.label}</span></div>`; }).join('');
    // butir terendah (rata-rata skor 1-4 -> indeks)
    const butir = J.butir.map(b => { const v = rr.map(r => r._h.butir[b[0]]).filter(x => x !== undefined); return { b, m: v.length ? bulat2(((v.reduce((a, c) => a + c, 0) / v.length) - 1) / 3 * 100) : null }; }).filter(x => x.m !== null).sort((a, c) => a.m - c.m).slice(0, 5);
    const lemah = `<div class="sv-lemah"><b>5 butir dengan nilai terendah (bahan perbaikan)</b><ol>${butir.map(x => `<li><span>${esc(x.b[4])}</span> <em>${esc(J.dimNama[x.b[1]])}</em> <b style="color:${kategoriIndeks(x.m).warna}">${fmt(x.m)}</b></li>`).join('')}</ol></div>`;
    const perhatian = G.jenis === 'sulingjar' ? rows.filter(r => dijawabPerhatian(r, J).length).length : 0;
    ring.innerHTML = `<div class="sv-info"><span><b>${rows.length}</b> siswa mengisi</span>${G.belum ? `<span><b>${G.belum}</b> belum mengisi</span>` : ''}<span><b>${rows.filter(r => !r._q.baik).length}</b> pengisian perlu dicek</span><span title="Siswa yang keluar layar penuh/pindah tab/aplikasi/screenshot saat mengisi survei"><b>${rows.filter(r => r._lg.pelanggaran > 0).length}</b> siswa ada pelanggaran survei</span>${(() => { const v = rows.map(r => r.kualitas && r.kualitas.nilai).filter(x => x !== undefined && x !== null); return v.length ? `<span>Rata-rata Nilai Kesungguhan <b>${fmt(bulat2(v.reduce((a, c) => a + c, 0) / v.length))}</b></span>` : ''; })()}<span>Rata-rata nilai survei <b>${fmt(totalKelas)}</b></span>${catatRata(rt, rows.length) ? `<span class="sv-warn" title="Opsi Abaikan pengisian perlu dicek"><i class="fa-solid fa-filter"></i> ${esc(catatRata(rt, rows.length))}</span>` : ''}${perhatian ? `<span class="sv-warn"><i class="fa-solid fa-circle-exclamation"></i> <b>${perhatian}</b> siswa melaporkan pengalaman tidak aman (beberapa kali/sering)</span>` : ''}</div><div class="sv-kartu-wrap">${kartu}</div>${htmlEvaluasi(rr, J, rata)}${htmlPerKelas(rr, J)}${htmlSubKelas(rr, J)}${lemah}<p class="subtitle" style="margin:.4rem 0">Nilai survei skala 0–100 (makin tinggi makin baik; jawaban terbaik = skor 4). Kategori Baik ≥ 75, Sedang 50–74,99, Perlu perhatian &lt; 50 hanyalah acuan latihan.</p>`;
    const th = J.dim.map(d => `<th title="${esc(d[1])}">${esc(d[1])}</th>`).join('');
    cont.innerHTML = `<div class="table-wrap dt-wrap"><table class="data-table dt-kartu"><thead><tr><th>No</th><th>Nama</th><th>Kelas</th>${th}<th>${G.jenis === 'karakter' ? 'Nilai Survei Karakter' : 'Nilai Sulingjar'}</th><th>Waktu</th><th>Nilai Kesungguhan</th><th>Kualitas Pengisian</th><th title="Kejadian anti-nyontek saat survei (tidak menambah pelanggaran ujian)">Pelanggaran Survei</th>${G.jenis === 'sulingjar' ? '<th>Catatan</th>' : ''}<th title="Lihat jawaban siswa ini per dimensi dan per butir">Detail Jawaban</th></tr></thead><tbody>${rows.map((r, i) => {
      const sel = J.dim.map(d => { const x = r._h.dim[d[0]].indeks; const k = kategoriIndeks(x); return `<td><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(x)}</span></td>`; }).join('');
      const cat = G.jenis === 'sulingjar' ? `<td>${dijawabPerhatian(r, J).length ? '<span class="badge no" title="Menjawab Beberapa kali/Sering pada butir pengalaman tidak aman. Tindak lanjuti secara rahasia.">Perlu tindak lanjut</span>' : '-'}</td>` : '';
      return `<tr><td>${i + 1}</td><td><a href="#" onclick="Survei.bukaDetail('${esc(String(r.sesiId))}');return false" title="Lihat detail jawaban survei">${esc(r.nama)}</a></td><td>${esc(r.kelas)}</td>${sel}<td><b>${fmt(r._h.total)}</b></td><td>${r.durasi ? Math.floor(r.durasi / 60) + ' mnt ' + (r.durasi % 60) + ' dtk' : '-'}</td><td>${r.kualitas && r.kualitas.nilai !== undefined ? `<span class="sv-lencana" style="background:${kategoriKesungguhan(r.kualitas.nilai).latar};color:${kategoriKesungguhan(r.kualitas.nilai).warna}" title="${kategoriKesungguhan(r.kualitas.nilai).label}">${r.kualitas.nilai}</span>` : '-'}</td><td>${r._q.baik ? '<span class="badge ok">Baik</span>' : `<span class="badge no" title="${esc(r._q.alasan.join('; '))}">Perlu dicek</span>`}</td><td>${selLgSurvei(r._lg)}</td>${cat}<td class="aksi">${(() => { const bk = analisisBK(r); return bk.perlu ? '<span class="badge no" title="Ada dimensi bernilai rendah atau pengalaman tidak aman. Layak ditindaklanjuti guru BK.">⚠ Perhatian BK</span><br>' : ''; })()}<button type="button" class="secondary small sv-aksi-btn" onclick="Survei.bukaDetail('${esc(String(r.sesiId))}')">🔍 Detail</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
    labeliTabel(cont);
  }
  // label tiap sel (dipakai tampilan kartu di HP): diambil dari judul kolom
  function labeliTabel(wadah) {
    const t = wadah.querySelector('table.dt-kartu'); if (!t) return;
    const lab = Array.from(t.querySelectorAll('thead th')).map(h => h.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(tr => Array.from(tr.children).forEach((td, i) => { if (lab[i] !== undefined) td.setAttribute('data-label', lab[i]); }));
  }

  function rataDim(rows, J) {
    const o = {}; J.dim.forEach(d => { const v = rows.map(r => r._h.dim[d[0]].indeks).filter(x => x !== null); o[d[0]] = v.length ? bulat2(v.reduce((a, b) => a + b, 0) / v.length) : null; });
    const t = rows.map(r => r._h.total).filter(x => x !== null);
    o._total = t.length ? bulat2(t.reduce((a, b) => a + b, 0) / t.length) : null;
    return o;
  }
  // Panel evaluasi: dimensi di bawah 75 diurutkan dari yang paling rendah + saran pembiasaan
  function htmlEvaluasi(rows, J, rata) {
    const kurang = J.dim.filter(d => rata[d[0]] !== null && rata[d[0]] < 75).sort((a, b) => rata[a[0]] - rata[b[0]]);
    if (!kurang.length) return '<div class="sv-ev sv-ev-ok"><b>Evaluasi:</b> semua dimensi sudah berkategori Baik (nilai ≥ 75). Pertahankan pembiasaan yang sudah berjalan.</div>';
    const items = kurang.map(d => {
      const k = kategoriIndeks(rata[d[0]]);
      const low = J.butir.filter(b => b[1] === d[0]).map(b => { const v = rows.map(r => r._h.butir[b[0]]).filter(x => x !== undefined); return { b, m: v.length ? bulat2(((v.reduce((a, c) => a + c, 0) / v.length) - 1) / 3 * 100) : null }; }).filter(x => x.m !== null).sort((a, c) => a.m - c.m).slice(0, 2);
      const saran = (G.jenis === 'karakter' ? SARAN_KELAS[d[0]] : SARAN[d[0]]) || '';
      return `<li><div class="sv-ev-h"><b>${esc(d[1])}</b><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(rata[d[0]])} · ${k.label}</span></div>
        <div class="sv-ev-b">Butir paling rendah: ${low.map(x => `“${esc(x.b[4])}” (${fmt(x.m)})`).join('; ')}</div>
        ${saran ? `<div class="sv-ev-s"><b>${G.jenis === 'karakter' ? 'Pembiasaan di kelas' : 'Tindak lanjut sekolah'}:</b> ${esc(saran)}</div>` : ''}</li>`;
    }).join('');
    return `<div class="sv-ev"><b>Evaluasi: ${kurang.length} dimensi perlu ditingkatkan</b> (urut dari nilai terendah)<ol>${items}</ol></div>`;
  }
  function htmlPerKelas(rows, J) {
    const kelas = Array.from(new Set(rows.map(r => r.kelas))).sort();
    if (kelas.length < 2) return '';
    const th = J.dim.map(d => `<th title="${esc(d[1])}">${esc(d[1])}</th>`).join('');
    const baris = kelas.concat(['__semua']).map(kl => {
      const sub = kl === '__semua' ? rows : rows.filter(r => r.kelas === kl); const m = rataDim(sub, J);
      const sel = J.dim.map(d => { const k = kategoriIndeks(m[d[0]]); return `<td><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(m[d[0]])}</span></td>`; }).join('');
      const kt = kategoriIndeks(m._total);
      return `<tr${kl === '__semua' ? ' class="sv-semua"' : ''}><td>${kl === '__semua' ? '<b>Semua kelas</b>' : esc(kl)}</td><td>${sub.length}</td>${sel}<td><b style="color:${kt.warna}">${fmt(m._total)}</b></td></tr>`;
    }).join('');
    return `<div class="sv-kelas"><b>Rata-rata nilai survei per kelas</b><div class="table-wrap"><table class="data-table"><thead><tr><th>Kelas</th><th>Siswa</th>${th}<th>Nilai Survei</th></tr></thead><tbody>${baris}</tbody></table></div></div>`;
  }

  // =====================================================================================
  //  DETAIL JAWABAN SURVEI PER SISWA (untuk wali kelas / guru BK)
  // =====================================================================================
  const DT = { rows: [], idx: -1 };

  // nomor urut butir pada set (1..n), dan keterangan sub: kode butir, dimensi, indikator (kolom kode bila diisi)
  const noButir = (set, id) => set.butir.findIndex(x => x[0] === id) + 1;
  const subButir = (set, b) => esc(b[0]) + ' · ' + esc(set.dimNama[b[1]]) + (subDari(b) ? ' · ' + esc(subDari(b)) : '');
  // rata-rata per sub-indikator pada satu siswa (h = hasil hitung siswa)
  const subSiswa = (set, h) => subList(set).map(x => Object.assign({}, x, { indeks: indeksSub(x.ids.map(id => h.butir[id]).filter(v => v !== undefined)) })).filter(x => x.indeks !== null);
  const nomorSub = (set, x) => x.ids.map(id => noButir(set, id)).join(', ');
  // rata-rata per sub-indikator untuk sekumpulan siswa (bobot sama per butir)
  const subKumpulan = (set, rows) => subList(set).map(x => { const v = []; rows.forEach(r => x.ids.forEach(id => { const q = r._h.butir[id]; if (q !== undefined) v.push(q); })); return Object.assign({}, x, { indeks: indeksSub(v) }); });
  function htmlRingkasBK(r) {
    const J = G.set; const h = r._h; const bk = analisisBK(r);
    const jw = (b) => { const p = Number(r.jawaban[b[0]]); return p >= 1 && p <= 4 ? SKALA[b[2]][p - 1] : '-'; };
    let out = '<div class="sv-bk"><div class="sv-bk-h">Ringkasan untuk Guru BK</div><div class="sv-legenda"><span><i style="background:#2e9e63"></i>Baik (skor 3–4)</span><span><i style="background:#e0a100"></i>Perlu perhatian (skor 2)</span><span><i style="background:#d93025"></i>Sangat perlu perhatian (skor 1)</span></div>';
    const baris = (b, ket) => { const sk = h.butir[b[0]]; return `<li class="sv-l${sk || 0}"><div class="sv-r-t"><span class="sv-no">${noButir(J, b[0])}</span>${esc(b[4])}<span class="sv-r-d sv-r-ind">${subButir(J, b)}</span></div><div class="sv-r-j"><span>${esc(jw(b))}</span><span class="sv-skor sv-s${sk || 0}">Skor ${sk || '-'}/4</span></div></li>`; };
    if (bk.aman.length) {
      out += `<div class="sv-bk-alarm"><div class="sv-bk-at"><i class="fa-solid fa-triangle-exclamation"></i> Pengalaman tidak aman yang dilaporkan siswa <span class="sv-hit">${bk.aman.length} butir</span></div><div class="sv-bk-an">Tindak lanjuti secara rahasia dan hati-hati.</div><ul class="sv-rows">${bk.aman.map(id => { const row = J.butir.filter(x => x[0] === id)[0]; return row ? baris(row) : ''; }).join('')}</ul></div>`;
    }
    if (bk.dimKurang.length) {
      out += `<div class="sv-bk-sec"><b>Dimensi yang perlu perhatian (nilai &lt; 50)<span class="sv-hit">${bk.dimKurang.length} dimensi</span></b>${bk.dimKurang.map(d => { const k = kategoriIndeks(h.dim[d[0]].indeks); return `<span class="sv-lencana sv-bk-chip" style="background:${k.latar};color:${k.warna}">${esc(d[1])}: ${fmt(h.dim[d[0]].indeks)}</span>`; }).join('')}</div>`;
    }
    if (bk.dimSedang.length) {
      out += `<div class="sv-bk-sec"><b>Dimensi kategori sedang (50–74,99)<span class="sv-hit">${bk.dimSedang.length} dimensi</span></b>${bk.dimSedang.map(d => { const k = kategoriIndeks(h.dim[d[0]].indeks); return `<span class="sv-lencana sv-bk-chip" style="background:${k.latar};color:${k.warna}">${esc(d[1])}: ${fmt(h.dim[d[0]].indeks)}</span>`; }).join('')}</div>`;
    }
    const subRendah = subSiswa(J, h).filter(x => x.indeks < 75).sort((a, c) => a.indeks - c.indeks);
    if (subRendah.length) {
      out += `<div class="sv-bk-sec"><b>Sub-indikator yang perlu ditingkatkan (nilai &lt; 75)<span class="sv-hit">${subRendah.length} sub-indikator</span></b>${subRendah.map(x => { const k = kategoriIndeks(x.indeks); return `<span class="sv-lencana sv-bk-chip" style="background:${k.latar};color:${k.warna}" title="${esc(x.dimNama)} · No. ${esc(nomorSub(J, x))}">${esc(x.nama)}: ${fmt(x.indeks)}</span>`; }).join('')}</div>`;
    }
    if (bk.butirRendah.length) {
      const tampil = bk.butirRendah.slice(0, 12);
      out += `<div class="sv-bk-sec"><b>Butir dengan skor rendah (skor 1–2 dari 4)<span class="sv-hit">${bk.butirRendah.length > tampil.length ? tampil.length + ' terendah dari ' + bk.butirRendah.length : bk.butirRendah.length + ' butir'}</span></b><ul class="sv-rows">${tampil.map(b => baris(b)).join('')}</ul></div>`;
    }
    if (!bk.aman.length && !bk.dimKurang.length && !bk.dimSedang.length && !bk.butirRendah.length) {
      out += '<div class="sv-bk-ok">Tidak ada indikator yang menonjol pada jawaban siswa ini.</div>';
    }
    const q = r._q;
    if (!q.baik) out += `<div class="sv-bk-sec"><b>Catatan kualitas pengisian</b>Pengisian ditandai <em>perlu dicek</em>${q.alasan.length ? ': ' + esc(q.alasan.join('; ')) : ''}. Baca hasil dengan hati-hati dan konfirmasi langsung ke siswa bila perlu.</div>`;
    out += '<div class="sv-bk-rahasia">Data survei bersifat rahasia. Hasil ini adalah indikator awal, bukan diagnosis; gunakan sebagai bahan percakapan dan pendampingan, bukan untuk menghakimi siswa.</div></div>';
    return out;
  }

  function isiDetail() {
    const r = DT.rows[DT.idx]; if (!r) return;
    hitungBaris(r);
    $('dsv-nama').textContent = r.nama || '-';
    const dur = r.durasi ? Math.floor(r.durasi / 60) + ' mnt ' + (r.durasi % 60) + ' dtk' : '-';
    const wkt = r.waktu ? new Date(r.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    $('dsv-meta').textContent = 'Kelas ' + (r.kelas || '-') + ' · ' + (G.jenis === 'karakter' ? 'Survei Karakter' : 'Survei Lingkungan Belajar (Sulingjar)') + ' · diisi ' + wkt + ' · durasi ' + dur;
    $('dsv-isi').innerHTML = htmlRingkasBK(r) + htmlPembahasan(G.set, G.jenis, r.jawaban, r.kualitas, { guru: true });
    $('dsv-posisi').textContent = (DT.idx + 1) + ' / ' + DT.rows.length;
    $('dsv-prev').disabled = DT.idx <= 0; $('dsv-next').disabled = DT.idx >= DT.rows.length - 1;
    $('dsv-isi').scrollTop = 0;
  }
  function bukaDetail(sesiId) {
    DT.rows = guruSaring().map(hitungBaris);
    DT.idx = DT.rows.findIndex(r => String(r.sesiId) === String(sesiId));
    if (DT.idx < 0) { DT.rows = G.data.map(hitungBaris); DT.idx = DT.rows.findIndex(r => String(r.sesiId) === String(sesiId)); }
    if (DT.idx < 0) { toast('Data survei siswa tidak ditemukan.', 'error'); return; }
    isiDetail();
    $('modal-detail-survei').classList.remove('hidden');
    if (!bukaDetail._esc) { bukaDetail._esc = true; document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('modal-detail-survei').classList.contains('hidden')) tutupDetail(); }); }
  }
  function tutupDetail() { $('modal-detail-survei').classList.add('hidden'); }
  function pindahDetail(arah) { const n = DT.idx + arah; if (n < 0 || n >= DT.rows.length) return; DT.idx = n; isiDetail(); }
  async function cetakDetail() {
    const r = DT.rows[DT.idx]; if (!r) return;
    if (!(await konfirmasiRahasia('PDF ini'))) return;
    const { namaSekolah } = Guru._identitasSekolah_();
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const html = `<div class="cp-wrap"><h2 style="margin:0">Detail Jawaban Survei — ${esc(r.nama)}</h2><p style="margin:.2rem 0 .8rem">${esc($('dsv-meta').textContent)}</p>` +
      (htmlRingkasBK(r) + htmlPembahasan(G.set, G.jenis, r.jawaban, r.kualitas, { guru: true })).replace(/<details class="sv-pb-dim"/g, '<details open class="sv-pb-dim"') +
      `</div><footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)} · RAHASIA (untuk guru BK)</span><span>${esc(waktu)}</span></footer>`;
    Guru._cetakArea_(html, ['Survei', r.nama, r.kelas].filter(Boolean).join(' - '));
  }

  // ---------------------------------------------------------------------------------------------
  //  PDF DETAIL SURVEI BANYAK SISWA (per kelas / seluruh siswa) — untuk wali kelas & guru BK
  //  mode 'kelas' = kelas yang dipilih pada filter Kelas; mode 'semua' = seluruh siswa yang sudah mengisi.
  //  Mengabaikan kotak cari dan filter "Perlu perhatian BK" supaya hasilnya lengkap.
  //  Isi: halaman 1 daftar nama + nilai + penanda BK + rata-rata dimensi; lalu tiap siswa mulai di halaman baru
  //  (ringkasan guru BK + jawaban per dimensi & butir). Dibuat lewat dialog Cetak -> "Simpan sebagai PDF".
  // ---------------------------------------------------------------------------------------------
  let sedangCetakBanyak = false;
  async function cetakDetailBanyak(mode) {
    const J = G.set;
    if (!J || !G.data.length) { toast('Pilih ujian survei dan tunggu datanya tampil dulu.', 'error'); return; }
    let rows = G.data.slice(); let labelKelas = 'Seluruh Kelas';
    if (mode === 'kelas') {
      const kl = $('kelas-survei').value;
      if (!kl) { toast('Pilih dulu kelasnya pada filter kelas di atas (bukan "Semua Kelas").', 'error'); return; }
      rows = rows.filter(r => r.kelas === kl); labelKelas = 'Kelas ' + kl;
    }
    if (!rows.length) { toast('Belum ada siswa yang mengisi survei pada pilihan ini.', 'error'); return; }
    if (sedangCetakBanyak) return;
    if (!(await konfirmasiRahasia('PDF detail survei ' + (mode === 'kelas' ? labelKelas : 'seluruh siswa') + ' (' + rows.length + ' siswa)'))) return;
    sedangCetakBanyak = true;
    try {
      rows = rows.map(hitungBaris).sort((a, b) => String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }) || String(a.nama || '').localeCompare(String(b.nama || ''), 'id', { sensitivity: 'base' }));
      if (rows.length > 60) toast('Menyiapkan ' + rows.length + ' lembar survei... mohon tunggu sebentar.');
      await new Promise(r => setTimeout(r, 30));
      const sel = $('pilih-ujian-survei'); const judulUjian = ((sel.options[sel.selectedIndex] || {}).text || '').split(' — ')[0];
      const namaJenis = G.jenis === 'karakter' ? 'Survei Karakter' : 'Survei Lingkungan Belajar (Sulingjar)';
      const { namaSekolah, kop } = Guru._identitasSekolah_();
      const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
      const mnt = (d) => d ? Math.floor(d / 60) + ' mnt ' + (d % 60) + ' dtk' : '-';
      const baris = rows.map((r, i) => {
        const k = kategoriIndeks(r._h.total); const bk = analisisBK(r);
        return `<tr><td class="cp-c">${i + 1}</td><td>${esc(r.nama)}</td><td class="cp-c">${esc(r.kelas)}</td><td class="cp-c"><b>${fmt(r._h.total)}</b></td><td class="cp-c">${esc(k.label)}</td><td class="cp-c">${r._q.baik ? 'Baik' : 'Perlu dicek'}</td><td class="cp-c">${bk.aman.length ? 'Tidak aman ⚠' : (bk.dimKurang.length ? bk.dimKurang.length + ' dimensi &lt; 50' : '-')}</td></tr>`;
      }).join('');
      const rtP = untukRata(rows), rowsR = rtP.rows;
      const catatP = catatRata(rtP, rows.length);
      const kelasUrut = Array.from(new Set(rows.map(r => r.kelas)));
      const thDim = J.dim.map(d => `<th class="cp-c">${esc(d[1])}</th>`).join('');
      const barisKelas = kelasUrut.concat(kelasUrut.length > 1 ? ['__semua'] : []).map(kl => {
        const sub = kl === '__semua' ? rowsR : rowsR.filter(r => r.kelas === kl); const m = rataDim(sub, J);
        return `<tr><td>${kl === '__semua' ? '<b>Semua kelas</b>' : esc(kl)}</td><td class="cp-c">${sub.length}</td>${J.dim.map(d => `<td class="cp-c">${fmt(m[d[0]])}</td>`).join('')}<td class="cp-c"><b>${fmt(m._total)}</b></td></tr>`;
      }).join('');
      const cover = `<section class="cp-cover">${kop}
        <h2 class="cp-judul">Detail Jawaban ${esc(namaJenis)} — ${esc(labelKelas)}</h2>
        <p class="cp-cover-ujian">${esc(judulUjian)}</p>
        <p class="cp-cover-petunjuk">Daftar berurutan sama dengan urutan halaman. Setiap siswa mulai di halaman baru berisi ringkasan untuk guru BK dan jawaban per dimensi serta per butir (hijau = baik, kuning = perlu perhatian, merah = sangat perlu perhatian). <b>Dokumen ini RAHASIA</b> — hanya untuk wali kelas / guru BK.</p>
        <table class="cp-daftar"><thead><tr><th class="cp-c">No</th><th>Nama</th><th class="cp-c">Kelas</th><th class="cp-c">Nilai</th><th class="cp-c">Kategori</th><th class="cp-c">Kualitas</th><th class="cp-c">Catatan BK</th></tr></thead><tbody>${baris}</tbody></table>
        <h3 style="margin:10px 0 4px;font-size:10.5pt">Rata-rata per kelas</h3>${catatP ? `<p class="cp-evaluasi">${esc(catatP)}</p>` : ''}
        <table class="cp-daftar"><thead><tr><th>Kelas</th><th class="cp-c">Siswa</th>${thDim}<th class="cp-c">Nilai</th></tr></thead><tbody>${barisKelas}</tbody></table>
        ${(() => { const sk = subKumpulan(J, rowsR).filter(x => x.indeks !== null); if (!sk.length) return ''; const pk = kelasUrut.length > 1 ? kelasUrut.map(kl => subKumpulan(J, rowsR.filter(r => r.kelas === kl))) : []; return `<h3 style="margin:10px 0 4px;font-size:10.5pt">Rata-rata per sub-indikator</h3><table class="cp-daftar"><thead><tr><th>Dimensi</th><th>Sub-indikator</th><th class="cp-c">No. butir</th><th class="cp-c">Semua</th>${pk.length ? kelasUrut.map(kl => `<th class="cp-c">${esc(kl)}</th>`).join('') : ''}</tr></thead><tbody>${sk.map(x => { const ix = subList(J).findIndex(y => y.dim === x.dim && y.nama === x.nama); return `<tr><td>${esc(x.dimNama)}</td><td>${esc(x.nama)}</td><td class="cp-c">${esc(nomorSub(J, x))}</td><td class="cp-c"><b>${fmt(x.indeks)}</b></td>${pk.map(a => `<td class="cp-c">${a[ix] && a[ix].indeks !== null ? fmt(a[ix].indeks) : '-'}</td>`).join('')}</tr>`; }).join('')}</tbody></table>`; })()}
        <div class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)} · RAHASIA (untuk guru BK)</span><span>${esc(waktu)}</span></div></section>`;
      const bagian = rows.map(r => {
        const k = kategoriIndeks(r._h.total);
        const isi = (htmlRingkasBK(r) + htmlPembahasan(G.set, G.jenis, r.jawaban, r.kualitas, { guru: true })).replace(/<details class="sv-pb-dim"/g, '<details open class="sv-pb-dim"');
        return `<article class="cp-siswa"><div class="cp-banner"><div><div class="cp-banner-nama">${esc(r.nama)}</div><div class="cp-banner-sub">Kelas ${esc(r.kelas || '-')} · ${esc(namaJenis)} · durasi ${esc(mnt(r.durasi))}</div></div><div class="cp-banner-nilai"><strong class="cp-nilai">${fmt(r._h.total)}</strong> <span class="cp-status">${esc(k.label)}</span></div></div>${isi}</article>`;
      }).join('');
      await Guru._cetakArea_(cover + bagian, ['Detail Survei', labelKelas, judulUjian].filter(Boolean).join(' - '));
    } finally { sedangCetakBanyak = false; }
  }

  async function guruUnduh() {
    const J = G.set; if (!J) { toast('Pilih ujian dulu.', 'error'); return; }
    const rows = guruSaring().map(hitungBaris); if (!rows.length) { toast('Belum ada data untuk diunduh.', 'error'); return; }
    if (G.jenis === 'sulingjar' && !(await konfirmasiRahasia('File Excel ini'))) return;
    const rt = untukRata(rows);
    const SL = subList(J);
    const head = ['No', 'Nama', 'Kelas'].concat(J.dim.map(d => 'Nilai ' + d[1])).concat(G.jenis === 'karakter' ? ['Nilai Survei Karakter'] : ['Nilai Sulingjar (rata-rata)']).concat(['Durasi (detik)', 'Nilai Kesungguhan', 'Kualitas Pengisian', 'Keterangan', 'Pelanggaran Survei', 'Percobaan Diblokir (Survei)', 'Gangguan Singkat (Survei)']).concat(J.butir.map(b => b[0])).concat(SL.map(x => 'Sub: ' + x.dimNama + ' - ' + x.nama));
    const data = rows.map((r, i) => [i + 1, r.nama, r.kelas].concat(J.dim.map(d => r._h.dim[d[0]].indeks)).concat([r._h.total]).concat([r.durasi || '', (r.kualitas && r.kualitas.nilai !== undefined) ? r.kualitas.nilai : '', r._q.baik ? 'Baik' : 'Perlu dicek', r._q.alasan.join('; '), r._lg.pelanggaran, r._lg.percobaan, r._lg.gangguan]).concat(J.butir.map(b => r.jawaban[b[0]] || '')).concat(SL.map(x => indeksSub(x.ids.map(id => r._h.butir[id]).filter(v => v !== undefined)))));
    // baris rata-rata (semua & per kelas) di bagian bawah lembar
    const kolKosong = (n) => new Array(Math.max(0, n)).fill('');
    const barisRata = (label, sub) => { const m = rataDim(sub, J); const sk = subKumpulan(J, sub); const baris = ['', label, ''].concat(J.dim.map(d => m[d[0]])).concat([m._total]).concat(kolKosong(head.length - 3 - J.dim.length - 1)); sk.forEach((x, i) => { baris[head.length - SL.length + i] = x.indeks; }); return baris; };
    data.push(kolKosong(head.length));
    data.push(barisRata('RATA-RATA SEMUA SISWA (' + rt.rows.length + (rt.diabaikan ? ' dari ' + rows.length + '; pengisian perlu dicek diabaikan' : '') + ')', rt.rows));
    Array.from(new Set(rows.map(r => r.kelas))).sort().forEach(kl => data.push(barisRata('Rata-rata kelas ' + kl, rt.rows.filter(r => r.kelas === kl))));
    const sel = $('pilih-ujian-survei'); const nama = (sel.options[sel.selectedIndex] || {}).text || 'survei';
    await unduhXlsxRapi_('Hasil ' + (G.jenis === 'karakter' ? 'Survei Karakter' : 'Sulingjar') + ' - ' + nama.split(' — ')[0].slice(0, 40) + '.xlsx', 'Hasil Survei', head, data, head.map((h, i) => i === 1 ? 28 : (i < 3 ? 10 : 14)));
  }

  // =====================================================================================
  //  PEMBAHASAN SURVEI (dipakai di detail jawaban guru & siswa)
  // =====================================================================================
  const TAFSIR = {
    baik: 'sudah baik. Pertahankan.',
    sedang: 'cukup baik, tetapi masih ada butir yang perlu ditingkatkan.',
    kurang: 'masih rendah dan perlu mendapat perhatian.'
  };
  // Saran per dimensi untuk laporan (Analisis Materi & PDF).
  // untuk: 'siswa' (bahasa untuk siswa), 'guru' (tindak lanjut), 'kelas' (pembiasaan di kelas / tindak lanjut sekolah).
  // Sulingjar adalah penilaian siswa terhadap SEKOLAH, jadi saran sekolah tidak diberikan ke siswa (hanya catatan keamanan).
  function saranDim(jenis, kode, untuk) {
    const dasar = JENIS[jenis] && JENIS[jenis].dim.some(d => d[0] === kode);
    if (!dasar) return '';
    if (untuk === 'kelas') return (jenis === 'karakter' ? SARAN_KELAS[kode] : SARAN[kode]) || '';
    if (untuk === 'guru') return SARAN[kode] || '';
    if (jenis === 'karakter') return SARAN[kode] || '';
    if (kode === 'ik') return 'Jika kamu pernah mengalami atau melihat hal yang tidak nyaman, ceritakan kepada guru BK, wali kelas, atau orang dewasa yang kamu percaya.';
    return '';
  }
  function headlineSurvei(jenis, h) { return { label: jenis === 'karakter' ? 'Nilai Survei Karakter' : 'Nilai Sulingjar', nilai: h.total }; }

  // tabel kecil: rata-rata tiap sub-indikator pada satu dimensi (satu siswa)
  function htmlSubDim(set, h, dimKode) {
    const subs = subSiswa(set, h).filter(x => x.dim === dimKode); if (!subs.length) return '';
    return `<div class="sv-sub"><div class="sv-sub-h">Nilai per sub-indikator</div>${subs.map(x => { const k = kategoriIndeks(x.indeks); return `<div class="sv-sub-r"><span class="sv-sub-n">${esc(x.nama)}<small>No. ${esc(nomorSub(set, x))}</small></span><span class="sv-sub-b"><i style="width:${x.indeks}%;background:${k.warna}"></i></span><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(x.indeks)}</span></div>`; }).join('')}</div>`;
  }
  // panel kelas: rata-rata per sub-indikator (semua siswa yang tampil + tiap kelas)
  function htmlSubKelas(rows, J) {
    const kelas = Array.from(new Set(rows.map(r => r.kelas))).sort();
    const semua = subKumpulan(J, rows).filter(x => x.indeks !== null); if (!semua.length) return '';
    const perKelas = kelas.length > 1 ? kelas.map(kl => subKumpulan(J, rows.filter(r => r.kelas === kl))) : [];
    const thK = kelas.length > 1 ? kelas.map(kl => `<th>${esc(kl)}</th>`).join('') : '';
    const sel = (v) => { const k = kategoriIndeks(v); return v === null ? '<td>-</td>' : `<td><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(v)}</span></td>`; };
    let dimLast = '';
    const baris = semua.map((x, i) => { const baru = x.dim !== dimLast; dimLast = x.dim; const k = kategoriIndeks(x.indeks); const idx = subList(J).findIndex(y => y.dim === x.dim && y.nama === x.nama);
      return `<tr${baru ? ' class="sv-sub-dimrow"' : ''}><td>${baru ? esc(x.dimNama) : ''}</td><td><b>${esc(x.nama)}</b></td><td>${esc(nomorSub(J, x))}</td>${sel(x.indeks)}<td>${esc(k.label)}</td>${perKelas.map(pk => sel(pk[idx] ? pk[idx].indeks : null)).join('')}</tr>`; }).join('');
    const rendah = semua.filter(x => x.indeks < 75).sort((a, c) => a.indeks - c.indeks).slice(0, 5);
    return `<div class="sv-kelas"><b>Rata-rata per sub-indikator</b>${rendah.length ? `<p class="sv-sub-ket">Terendah: ${rendah.map(x => `${esc(x.nama)} (${fmt(x.indeks)})`).join('; ')}</p>` : ''}<div class="table-wrap"><table class="data-table"><thead><tr><th>Dimensi</th><th>Sub-indikator</th><th>No. butir</th><th>Semua siswa</th><th>Kategori</th>${thK}</tr></thead><tbody>${baris}</tbody></table></div></div>`;
  }
  function htmlPembahasan(set, jenis, jawaban, kualitas, opsi) {
    const guru = !!(opsi && opsi.guru);
    if (!set || !jawaban) return '<div class="dj-kosong"><p>' + (guru ? 'Siswa ini belum mengisi survei.' : 'Hasil survei belum tersedia.') + '</p></div>';
    const h = hitung(jenis, jawaban, set); const subjek = guru ? 'siswa' : 'Anda';
    const hl = headlineSurvei(jenis, h); const kHl = kategoriIndeks(hl.nilai);
    const q = kualitas || {};
    let out = `<div class="sv-pb"><div class="sv-pb-top"><div><div class="sv-pb-judul">${esc(set.nama)}</div><div class="sv-pb-sub">Tidak ada jawaban benar atau salah. Jawaban terbaik = skor 4 (Sangat setuju/Selalu untuk pernyataan positif; Tidak pernah untuk pernyataan negatif). Nilai = skor rata-rata diubah ke skala 0–100.</div></div>
      <div class="sv-pb-total"><span>${esc(hl.label)}</span><b style="color:${kHl.warna}">${fmt(hl.nilai)}</b><span class="sv-lencana" style="background:${kHl.latar};color:${kHl.warna}">${kHl.label}</span></div></div>`;
    out += htmlKesungguhan(q, guru);
    if (q.baik === false && !(q.alasan && q.alasan.length)) out += `<div class="sv-pb-kualitas"><i class="fa-solid fa-triangle-exclamation"></i> ${guru ? 'Kualitas pengisian perlu dicek' : 'Pengisian survei Anda terlihat kurang teliti'}${q.alasan && q.alasan.length ? ': ' + esc(q.alasan.join('; ')) : ''}. ${guru ? 'Hasil indeks siswa ini sebaiknya dibaca dengan hati-hati.' : 'Lain kali baca tiap pernyataan dan jawab sesuai keadaan sebenarnya.'}</div>`;
    set.dim.forEach(d => {
      const x = h.dim[d[0]]; if (!x || x.indeks === null) return;
      const k = kategoriIndeks(x.indeks);
      const butir = set.butir.filter(b => b[1] === d[0]);
      let saran = '';
      if (k.kode !== 'baik') {
        if (SARAN[d[0]] && JENIS[jenis].dim.some(dd => dd[0] === d[0]) && (jenis === 'karakter' || guru)) saran = `<p class="sv-pb-saran"><b>${guru ? 'Saran tindak lanjut' : 'Saran untuk Anda'}:</b> ${esc(SARAN[d[0]])}</p>`;
        else if (!guru && d[0] === 'ik') saran = '<p class="sv-pb-saran"><b>Catatan:</b> Jika Anda pernah mengalami atau melihat hal yang tidak nyaman, ceritakan kepada guru BK, wali kelas, atau orang dewasa yang Anda percaya.</p>';
      }
      out += `<details class="sv-pb-dim" ${k.kode !== 'baik' ? 'open' : ''}><summary><span class="sv-pb-dn">${esc(d[1])} <span class="sv-hit">${(() => { const n = butir.map(b => noButir(set, b[0])); return butir.length ? 'No. ' + Math.min.apply(null, n) + (butir.length > 1 ? '–' + Math.max.apply(null, n) : '') + ' · ' + butir.length + ' butir' : ''; })()}</span></span><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(x.indeks)} · ${k.label}</span></summary>
        <div class="sv-bar-b"><i style="width:${x.indeks}%;background:${k.warna}"></i></div>
        ${htmlSubDim(set, h, d[0])}
        <p class="sv-pb-tafsir">Nilai ${esc(d[1])} ${subjek} <b>${fmt(x.indeks)}</b> (rata-rata skor ${fmt(x.rata)} dari 4) — ${TAFSIR[k.kode]}</p>
        <ul class="sv-pb-list">${butir.map(b => {
          const sk = h.butir[b[0]]; const p = jawaban[b[0]];
          const jw = p ? SKALA[b[2]][p - 1] : '-';
          return `<li class="sv-l${sk || 0}"><span class="sv-pb-t"><span class="sv-no">${noButir(set, b[0])}</span>${esc(b[4])}${b[3] < 0 ? ' <em class="sv-neg">(pernyataan negatif)</em>' : ''}<em class="sv-r-d sv-r-ind">${subButir(set, b)}</em></span><span class="sv-pb-j">Jawaban: <b>${esc(jw)}</b></span><span class="sv-skor sv-s${sk || 0}">Skor ${sk || '-'}/4</span></li>`;
        }).join('')}</ul>${saran}</details>`;
    });
    return out + '</div>';
  }

  // Tab "Pembahasan Soal | Pembahasan Survei" pada detail jawaban (guru: modal; siswa: layar detail)
  const DD = { guru: null, siswa: null };
  function modeDetail(who, mode) {
    const g = who === 'guru'; const pre = g ? 'dsw' : 'detail';
    const a = $(pre + '-mode-soal'), b = $(pre + '-mode-survei'); if (!a || !b) return;
    a.classList.toggle('active', mode === 'soal'); b.classList.toggle('active', mode === 'survei');
    (g ? ['dsw-chips', 'dsw-evaluasi', 'dsw-tabs-soal', 'dsw-list'] : ['detail-ringkas-p', 'detail-info-p', 'detail-tabs-soal', 'detail-list']).forEach(id => { const el = $(id); if (el) el.classList.toggle('hidden', mode === 'survei'); });
    const box = $(pre + '-survei'); if (!box) return;
    box.classList.toggle('hidden', mode !== 'survei');
    if (mode === 'survei') { const d = DD[who]; box.innerHTML = htmlPembahasan(d && d.set, d && d.jenis, d && d.jawaban, d && d.kualitas, { guru: g }); }
    const kontainer = g ? document.querySelector('#modal-detail-siswa .modal') : null; if (kontainer) kontainer.scrollTop = 0;
  }
  function siapkanDetailGuru(sesiId) {
    const rk = (state.guru._rekapAktif || []).find(x => String(x.sesiId) === String(sesiId));
    const aktif = !!state.guru._rekapSurveiJenis;
    DD.guru = rk && rk.survei ? rk.survei : null;
    const bar = $('dsw-mode'); if (bar) bar.classList.toggle('hidden', !aktif || !rk);
    modeDetail('guru', 'soal');
  }
  async function siapkanDetailSiswa() {
    DD.siswa = null; const bar = $('detail-mode'); if (bar) bar.classList.add('hidden');
    modeDetail('siswa', 'soal');
    let info = null;
    try { info = await api('getSurveiSesi', { sesiId: ExamEngine.detailSesiId || state.sesiId, siswaId: state.user.id }); } catch (e) { info = null; }
    if (info && info.ok && info.jenis && info.sudah && info.tampilHasil && info.jawaban) {
      DD.siswa = { set: bangunSet(info.jenis, info.set), jenis: info.jenis, jawaban: info.jawaban, kualitas: info.kualitas };
      if (bar) bar.classList.remove('hidden');
    }
  }

  // =====================================================================================
  //  REKAP NILAI — hasil survei di samping hasil tes
  // =====================================================================================
  async function gabungKeRekap(ujianId, data) {
    state.guru._rekapSurveiJenis = ''; state.guru._rekapSurveiSet = null;
    let res = null; try { res = await api('getRekapSurvei', { ujianId }); } catch (e) { res = null; }
    if (!res || !res.ok || !res.jenis) return '';
    const set = bangunSet(res.jenis, res.set); const peta = {};
    (res.data || []).forEach(x => { peta[String(x.sesiId)] = x; });
    data.forEach(r => { const x = peta[String(r.sesiId)]; r.survei = x ? { set, jenis: res.jenis, jawaban: x.jawaban, kualitas: x.kualitas, durasi: x.durasi, logSurvei: x.logSurvei } : null; });
    state.guru._rekapSurveiJenis = res.jenis; state.guru._rekapSurveiSet = set;
    return res.jenis;
  }
  function ringkasSurvei(r) {
    if (!r || !r.survei) return null;
    const h = hitung(r.survei.jenis, r.survei.jawaban, r.survei.set);
    return { h, kes: (r.survei.kualitas && r.survei.kualitas.nilai !== undefined) ? r.survei.kualitas.nilai : null, nilai: h.total, kat: kategoriIndeks(h.total), baik: !(r.survei.kualitas && r.survei.kualitas.baik === false), set: r.survei.set };
  }
  function selRekap(r) {
    const x = ringkasSurvei(r);
    if (!x) return '<span class="badge warn">Belum mengisi</span>';
    const tip = x.set.dim.map(d => d[1] + ': ' + fmt(x.h.dim[d[0]].indeks)).join('\n');
    const q = r.survei.kualitas || {}; const kk = kategoriKesungguhan(q.nilai);
    const kes = (q.nilai === undefined || q.nilai === null) ? '' : `<div class="sv-kes-mini" title="Nilai Kesungguhan mengisi survei (0-100)">Kesungguhan <b style="color:${kk.warna}">${q.nilai}</b> · ${kk.label}</div>`;
    const lg = lgSurvei(r.survei.logSurvei);
    const lgTxt = lg.pelanggaran ? `<div class="sv-kes-mini" title="Kejadian anti-nyontek saat survei (tidak menambah pelanggaran ujian)">Pelanggaran survei <b style="color:#b42318">${lg.pelanggaran}</b></div>` : '';
    return `<span class="sv-lencana" style="background:${x.kat.latar};color:${x.kat.warna}" title="${esc(tip)}">${fmt(x.nilai)} · ${x.kat.label}</span>${x.baik ? '' : ' <span class="badge no" title="Kualitas pengisian perlu dicek">⚠ dicek</span>'}${kes}${lgTxt}`;
  }

  // =====================================================================================
  //  BUTIR KHUSUS PER UJIAN — impor dari template Word (tabel)
  // =====================================================================================
  const F = { json: '' };
  function cocokDimDasar(jenis, nama) {
    const n = normT(nama); if (!n) return null;
    const dsr = JENIS[jenis].dim;
    return dsr.filter(d => { const m = normT(d[1]); return m === n || m.indexOf(n) === 0 || n.indexOf(m) === 0; })[0] || null;
  }
  // Inti: susun set butir dari baris mentah. Dipakai impor Word DAN editor butir di Kelola Soal.
  // baris: [{ baris, no, nm, sk, ar, teks, hal, kode, pas, pet }] (semua teks mentah, mis. "Frekuensi", "Positif")
  function susunSet(jenis, baris) {
    const galat = [];
    const awalan = jenis === 'karakter' ? 'K' : 'S';
    const dim = [], kodeDim = {}; const butir = []; const noKeId = {}; const rawPasang = []; const petunjuk = {};
    let urut = 0;
    baris.forEach((r, bi) => {
      const nb = r.baris || (bi + 1); const teksP = String(r.teks || '').trim(); const nm = String(r.nm || '').trim();
      if (!teksP && !nm && !String(r.sk || '').trim()) return; // baris kosong
      if (!teksP) { galat.push('Baris ' + nb + ': kolom Pernyataan kosong.'); return; }
      if (!nm) { galat.push('Baris ' + nb + ': kolom Dimensi kosong.'); return; }
      const sk = normT(r.sk); let skala = '';
      if (/^kur/.test(sk)) skala = 'kurang'; else if (/^set/.test(sk)) skala = 'setuju'; else if (/^(fre|ser)/.test(sk)) skala = 'frek'; else if (/^pen/.test(sk)) skala = 'peng';
      if (!skala) { galat.push('Baris ' + nb + ': Skala "' + (r.sk || '') + '" tidak dikenali (isi: Setuju, Kurang, Frekuensi, atau Pengalaman).'); return; }
      const ar = normT(r.ar); let arah = 0;
      if (/^(\+|pos)/.test(ar)) arah = 1; else if (/^(-|−|–|neg)/.test(ar)) arah = -1;
      if (!arah) { galat.push('Baris ' + nb + ': Arah "' + (r.ar || '') + '" tidak dikenali (isi: Positif atau Negatif).'); return; }
      urut++;
      if (urut > 99) { galat.push('Maksimal 99 butir.'); return; }
      const id = awalan + String(urut).padStart(2, '0');
      const kunciNama = normT(nm); let kode = kodeDim[kunciNama];
      if (!kode) {
        const dsr = cocokDimDasar(jenis, nm);
        kode = dsr ? dsr[0] : 'd' + (dim.length + 1);
        if (dim.some(d => d[0] === kode)) kode = 'd' + (dim.length + 1);
        kodeDim[kunciNama] = kode; dim.push([kode, dsr ? dsr[1] : nm]);
      }
      const hal = parseInt(String(r.hal == null ? '' : r.hal).replace(/\D/g, ''), 10) || 0;
      const kodeTeks = String(r.kode || '').trim().slice(0, 40);
      if (hal > 0 && String(r.pet || '').trim() && !petunjuk[hal]) petunjuk[hal] = String(r.pet).trim().slice(0, 300);
      butir.push([id, kode, skala, arah, teksP, hal, kodeTeks]);
      noKeId[String(r.no == null || r.no === '' ? urut : r.no).replace(/\D/g, '') || urut] = id;
      if (String(r.pas || '').trim()) rawPasang.push([id, String(r.pas).replace(/\D/g, ''), nb]);
    });
    if (butir.length < 5) galat.push('Minimal 5 butir yang valid (terbaca ' + butir.length + ').');
    const sklHal = {}; butir.forEach(b => { if (b[5] > 0) (sklHal[b[5]] = sklHal[b[5]] || {})[b[2]] = 1; });
    Object.keys(sklHal).forEach(h => { if (Object.keys(sklHal[h]).length > 1) galat.push('Halaman ' + h + ': semua butir di halaman yang sama harus memakai Skala yang sama.'); });
    const pasangan = []; const peta = {}; butir.forEach(b => { peta[b[0]] = b; });
    rawPasang.forEach(rp => {
      const lawan = noKeId[rp[1]]; if (!lawan || lawan === rp[0]) { galat.push('Baris ' + rp[2] + ': Pasangan (No ' + rp[1] + ') tidak ditemukan.'); return; }
      const a = peta[rp[0]], b = peta[lawan];
      if (a[3] === b[3]) { galat.push('Baris ' + rp[2] + ': Pasangan harus berarah berlawanan (satu Positif, satu Negatif).'); return; }
      const pr = a[3] > 0 ? [a[0], b[0]] : [b[0], a[0]];
      if (!pasangan.some(x => x[0] === pr[0] && x[1] === pr[1])) pasangan.push(pr);
    });
    return { galat, set: { jenis, dim, butir, pasangan, petunjuk } };
  }

  // jenisPilihan: jenis yang dipilih guru; paksa = true (impor dari kartu di Kelola Soal): jenis TIDAK boleh berbeda dari isi dokumen.
  async function bacaDocx(file, jenisPilihan, paksa) {
    await muatPustaka_('mammoth');
    const hasil = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) });
    const dom = new DOMParser().parseFromString(hasil.value, 'text/html');
    const teks = normT(dom.body.textContent);
    let jenis = '';
    if (teks.indexOf('sulingjar') >= 0 || teks.indexOf('lingkungan belajar') >= 0) jenis = 'sulingjar';
    else if (teks.indexOf('survei karakter') >= 0) jenis = 'karakter';
    if (paksa && jenisPilihan) {
      if (jenis && jenis !== jenisPilihan) return { galat: ['File ini tampaknya template ' + JENIS[jenis].nama + ', bukan ' + JENIS[jenisPilihan].nama + '. Unggah lewat kartu ' + JENIS[jenis].nama + ', atau gunakan template yang sesuai.'] };
      jenis = jenisPilihan;
    }
    if (!jenis) jenis = jenisPilihan || '';
    const tabel = Array.from(dom.querySelectorAll('table')).filter(t => {
      const tr = t.querySelector('tr'); if (!tr) return false;
      return Array.from(tr.querySelectorAll('th,td')).some(c => kunciHeader_(c.textContent) === 'pernyataan');
    })[0];
    if (!tabel) return { galat: ['Tabel butir survei tidak ditemukan. Gunakan template survei dan jangan mengubah baris judul kolom (No, Dimensi, Skala, Arah, Pernyataan, Pasangan).'] };
    if (!jenis) return { galat: ['Jenis survei tidak dikenali. Pilih "Survei Karakter" atau "Sulingjar" pada pilihan survei terlebih dulu, lalu impor lagi.'] };
    const trs = Array.from(tabel.querySelectorAll('tr'));
    const hk = Array.from(trs[0].querySelectorAll('th,td')).map(c => kunciHeader_(c.textContent));
    const ix = (k) => hk.findIndex(x => x === k || x.indexOf(k) === 0);
    const cNo = ix('no'), cDim = ix('dimensi'), cSk = ix('skala'), cAr = ix('arah'), cP = ix('pernyataan'), cPs = ix('pasangan'), cHal = ix('halaman'), cKode = ix('kode'), cPet = ix('petunjuk');
    if (cDim < 0 || cSk < 0 || cAr < 0 || cP < 0) return { galat: ['Kolom wajib belum lengkap: Dimensi, Skala, Arah, dan Pernyataan.'] };
    const baris = trs.slice(1).map((tr, bi) => {
      const sel = Array.from(tr.querySelectorAll('th,td')).map(c => c.textContent.trim());
      const v = (c) => (c >= 0 ? (sel[c] || '') : '');
      return { baris: bi + 2, no: v(cNo), nm: v(cDim), sk: v(cSk), ar: v(cAr), teks: v(cP), hal: v(cHal), kode: v(cKode), pas: v(cPs), pet: v(cPet) };
    });
    const r = susunSet(jenis, baris);
    return { jenis, galat: r.galat, set: r.set };
  }

  // =====================================================================================
  //  PAKET SURVEI di BANK SOAL / KELOLA SOAL (menyatu dengan soal kategori)
  // =====================================================================================
  const daftarPaket = () => ((typeof state !== 'undefined' && state.guru && state.guru.paketSurvei) || []);
  async function muatPaket(paksa) {
    if (typeof state === 'undefined' || !state.user || state.user.role !== 'guru') return;
    if (state.guru.paketSurvei && !paksa) return;
    let res = null; try { res = await api('getPaketSurvei', { guruId: state.user.id }); } catch (e) { res = null; }
    if (res && res.ok) state.guru.paketSurvei = res.data || []; else if (!state.guru.paketSurvei) state.guru.paketSurvei = [];
  }
  const paketKategori = (kategori, jenis) => cariPaket(daftarPaket(), kategori, jenis, state.user && state.user.id);
  function ringkasPaket(p, jenis) {
    let c = null; try { c = JSON.parse(p.butir_json); } catch (e) { c = null; }
    if (!c || c.jenis !== jenis) return null;
    const set = bangunSet(jenis, c); if (!set || !set.kustom) return null;
    return { butir: set.butir.length, dim: set.dim.length, hal: set.halamanList.length };
  }
  const tglPendek = (iso) => { try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  const IKON_PAKET = { karakter: '🌟', sulingjar: '🏫' };
  const SUBJUDUL = { karakter: 'paket Numerasi', sulingjar: 'paket Literasi' };

  function badgePaket(kategori) {
    return ['karakter', 'sulingjar'].filter(j => paketKategori(kategori, j) && ringkasPaket(paketKategori(kategori, j), j))
      .map(j => `<span class="badge umum" title="Paket survei tersimpan di Bank Soal kategori ini">${j === 'karakter' ? '＋ Survei Karakter' : '＋ Sulingjar'}</span>`).join('');
  }

  // Dua kartu di halaman Kelola Soal (di samping Tambah Manual / Import Excel / Import Word)
  function renderKartuKategori() {
    const box = $('paket-survei-cards'); if (!box || typeof state === 'undefined') return;
    const kat = state.guru.kategoriKelola || '';
    box.innerHTML = ['karakter', 'sulingjar'].map(j => {
      const p = paketKategori(kat, j); const r = p ? ringkasPaket(p, j) : null;
      const status = r
        ? `<span style="color:var(--c-success,#198754);font-weight:600">✔ Tersimpan</span> — ${r.butir} butir · ${r.dim} dimensi · ${r.hal} halaman${p.diubah ? ' · diubah ' + esc(tglPendek(p.diubah)) : ''}. Ikut otomatis saat ujian kategori ini.`
        : `Belum ada paket — latihan memakai butir bawaan (${JENIS[j].butir.length} butir). Upload Word atau klik Edit untuk menyesuaikan.`;
      return `<div class="aksi-card paket-survei-card" onclick="document.getElementById('paket-file-${j}').click()">
        <div class="aksi-card-ico">${IKON_PAKET[j]}</div>
        <div class="aksi-card-judul">${esc(JENIS[j].nama)} <small style="font-weight:500">(${SUBJUDUL[j]})</small></div>
        <div class="aksi-card-desc">${status}</div>
        <div class="aksi-card-aksi-row">
          <button type="button" class="secondary small" onclick="event.stopPropagation();Survei.unduhTemplate('${j}')">⬇ Unduh Template</button>
          <button type="button" class="secondary small" onclick="event.stopPropagation();Survei.bukaEditor('${j}')">✏ Edit Butir</button>
          ${r ? `<button type="button" class="danger small" onclick="event.stopPropagation();Survei.hapusPaket('${j}')">🗑 Hapus</button>` : ''}
        </div>
        <input type="file" id="paket-file-${j}" accept=".docx" class="hidden" onchange="Survei.imporKeKategori(event,'${j}')">
      </div>`;
    }).join('');
  }
  async function bukaKategoriKelola() { await muatPaket(false); renderKartuKategori(); }

  async function simpanPaket(kategori, jenis, set) {
    const res = await api('simpanPaketSurvei', { guruId: state.user.id, kategori, jenis, butir: JSON.stringify(set) });
    if (!res || !res.ok) { toast((res && res.error) || 'Paket survei gagal disimpan.', 'error'); return false; }
    await muatPaket(true); renderKartuKategori(); try { Guru.renderMapelGrid(); } catch (e) { }
    return true;
  }
  async function imporKeKategori(ev, jenis) {
    const file = ev.target.files[0]; if (!file) return;
    const kat = state.guru.kategoriKelola || '';
    try {
      const r = await bacaDocx(file, jenis, true);
      if (r.galat && r.galat.length) { Dialog.info({ judul: 'Butir Survei Belum Bisa Diimpor', tipe: 'warning', ikon: 'fa-file-circle-exclamation', pesan: 'Perbaiki hal berikut di file Word lalu upload lagi:', daftar: r.galat.slice(0, 12) }); return; }
      if (paketKategori(kat, jenis) && !(await Dialog.konfirmasi({ judul: 'Ganti Paket Survei?', tipe: 'warning', ikon: 'fa-clone', pesan: `Paket **${JENIS[jenis].nama}** untuk **${kat}** sudah ada. Isinya akan diganti dengan ${r.set.butir.length} butir dari file ini.`, teksYa: 'Ya, Ganti' }))) return;
      if (await simpanPaket(kat, jenis, r.set)) toast(`${JENIS[jenis].nama}: ${r.set.butir.length} butir (${r.set.dim.length} dimensi) tersimpan di Bank Soal.`, 'success');
    } catch (err) { toast('Gagal membaca file .docx: ' + err.message, 'error'); } finally { ev.target.value = ''; }
  }
  async function hapusPaket(jenis) {
    const kat = state.guru.kategoriKelola || '';
    if (!(await Dialog.konfirmasi({ judul: 'Hapus Paket Survei?', tipe: 'warning', ikon: 'fa-trash', pesan: `Paket **${JENIS[jenis].nama}** untuk **${kat}** dihapus. Ujian berikutnya kembali memakai butir bawaan sampai Anda mengunggah paket baru.`, teksYa: 'Ya, Hapus' }))) return;
    const res = await api('hapusPaketSurvei', { guruId: state.user.id, kategori: kat, jenis });
    if (!res || !res.ok) { toast((res && res.error) || 'Gagal menghapus.', 'error'); return; }
    await muatPaket(true); renderKartuKategori(); try { Guru.renderMapelGrid(); } catch (e) { }
    toast('Paket survei dihapus.', 'success');
  }

  // ---------------- EDITOR BUTIR (modal) ----------------
  const E = { jenis: '', kategori: '', rows: [], uid: 0 };
  const SK_LABEL = { setuju: 'Setuju', kurang: 'Kurang', frek: 'Frekuensi', peng: 'Pengalaman' };
  function setKeRows(set) {
    const baris = set.butir.map(b => ({ uid: ++E.uid, hal: b[5] || '', dim: set.dimNama ? set.dimNama[b[1]] : (set.dim.filter(d => d[0] === b[1])[0] || [0, b[1]])[1], sk: b[2], ar: b[3], teks: b[4], kode: b[6] || '', pasUid: null, pet: '' }));
    const sudah = {};
    baris.forEach(r => { if (r.hal && !sudah[r.hal] && set.petunjuk && set.petunjuk[r.hal]) { r.pet = set.petunjuk[r.hal]; } if (r.hal) sudah[r.hal] = true; });
    const idKe = {}; set.butir.forEach((b, i) => { idKe[b[0]] = i; });
    (set.pasangan || []).forEach(pr => { const x = idKe[pr[0]], y = idKe[pr[1]]; if (x >= 0 && y >= 0) { baris[x].pasUid = baris[y].uid; baris[y].pasUid = baris[x].uid; } });
    return baris;
  }
  function bukaEditor(jenis) {
    E.jenis = jenis; E.kategori = state.guru.kategoriKelola || '';
    const p = paketKategori(E.kategori, jenis);
    const set = bangunSet(jenis, p ? p.butir_json : '');
    E.rows = setKeRows(set);
    $('sv-ed-judul').textContent = JENIS[jenis].nama + ' — ' + E.kategori;
    $('sv-ed-info').textContent = (p && ringkasPaket(p, jenis)) ? 'Mengedit paket yang tersimpan di Bank Soal.' : 'Paket belum ada: editor berisi butir bawaan. Ubah seperlunya lalu Simpan sebagai paket kategori ini.';
    renderEditor(); $('modal-survei-edit').classList.remove('hidden');
  }
  function tutupEditor() { $('modal-survei-edit').classList.add('hidden'); }
  const noDariUid = (uid) => { const i = E.rows.findIndex(r => r.uid === uid); return i >= 0 ? String(i + 1) : ''; };
  function renderEditor() {
    const dimList = Array.from(new Set(JENIS[E.jenis].dim.map(d => d[1]).concat(E.rows.map(r => r.dim).filter(Boolean))));
    $('sv-ed-dim').innerHTML = dimList.map(d => `<option value="${esc(d)}">`).join('');
    $('sv-ed-n').textContent = E.rows.length + ' butir';
    $('sv-ed-body').innerHTML = E.rows.map((r, i) => `<tr>
      <td class="sv-ed-no">${i + 1}</td>
      <td><input type="number" min="0" data-i="${i}" data-f="hal" value="${esc(r.hal)}" style="width:56px"></td>
      <td><input type="text" list="sv-ed-dim" data-i="${i}" data-f="dim" value="${esc(r.dim)}" style="min-width:150px"></td>
      <td><select data-i="${i}" data-f="sk">${Object.keys(SK_LABEL).map(k => `<option value="${k}" ${r.sk === k ? 'selected' : ''}>${SK_LABEL[k]}</option>`).join('')}</select></td>
      <td><select data-i="${i}" data-f="ar"><option value="1" ${r.ar > 0 ? 'selected' : ''}>Positif</option><option value="-1" ${r.ar < 0 ? 'selected' : ''}>Negatif</option></select></td>
      <td><textarea rows="2" data-i="${i}" data-f="teks" style="min-width:260px">${esc(r.teks)}</textarea></td>
      <td><input type="text" data-i="${i}" data-f="kode" value="${esc(r.kode)}" style="width:70px"></td>
      <td><input type="number" min="1" data-i="${i}" data-f="pas" value="${esc(r.pasUid ? noDariUid(r.pasUid) : '')}" style="width:62px" placeholder="No"></td>
      <td><input type="text" data-i="${i}" data-f="pet" value="${esc(r.pet)}" style="min-width:150px" placeholder="(baris pertama halaman)"></td>
      <td class="sv-ed-aksi"><button type="button" class="secondary small icon" title="Naik" onclick="Survei.edGeser(${i},-1)">↑</button><button type="button" class="secondary small icon" title="Turun" onclick="Survei.edGeser(${i},1)">↓</button><button type="button" class="danger small icon" title="Hapus butir" onclick="Survei.edHapus(${i})">🗑</button></td>
    </tr>`).join('');
  }
  function edUbah(ev) {
    const el = ev.target; const i = Number(el.dataset.i), f = el.dataset.f; if (!(i >= 0) || !f) return; const r = E.rows[i]; if (!r) return;
    if (f === 'ar') r.ar = Number(el.value) < 0 ? -1 : 1;
    else if (f === 'pas') {
      if (r.pasUid) { const lama = E.rows.find(x => x.uid === r.pasUid); if (lama && lama.pasUid === r.uid) lama.pasUid = null; }
      const t = E.rows[Number(el.value) - 1];
      if (t && t !== r) { if (t.pasUid) { const o = E.rows.find(x => x.uid === t.pasUid); if (o && o.pasUid === t.uid) o.pasUid = null; } r.pasUid = t.uid; t.pasUid = r.uid; } else r.pasUid = null;
      if (ev.type === 'change') renderEditor();
    } else r[f] = el.value;
  }
  function edTambah() {
    const a = E.rows[E.rows.length - 1];
    if (E.rows.length >= 99) { toast('Maksimal 99 butir.', 'error'); return; }
    E.rows.push({ uid: ++E.uid, hal: a ? a.hal : '', dim: a ? a.dim : JENIS[E.jenis].dim[0][1], sk: a ? a.sk : 'frek', ar: 1, teks: '', kode: '', pasUid: null, pet: '' });
    renderEditor(); const box = $('sv-ed-scroll'); if (box) box.scrollTop = box.scrollHeight;
  }
  function edHapus(i) { const r = E.rows[i]; E.rows.splice(i, 1); E.rows.forEach(x => { if (x.pasUid === r.uid) x.pasUid = null; }); renderEditor(); }
  function edGeser(i, d) { const j = i + d; if (j < 0 || j >= E.rows.length) return; const t = E.rows[i]; E.rows[i] = E.rows[j]; E.rows[j] = t; renderEditor(); }
  function edAturHalaman() {
    let hal = 0, n = 0, sk = '', dim = '';
    E.rows.forEach(r => { if (r.sk !== sk || normT(r.dim) !== dim || n >= 6) { hal++; n = 0; sk = r.sk; dim = normT(r.dim); } n++; r.hal = hal; });
    renderEditor(); toast('Halaman diatur otomatis: satu dimensi dan skala sama per halaman, maksimal 6 pernyataan.', 'success');
  }
  async function edBawaan() {
    if (!(await Dialog.konfirmasi({ judul: 'Muat Butir Bawaan?', tipe: 'warning', ikon: 'fa-rotate-left', pesan: 'Semua perubahan di editor diganti dengan butir bawaan aplikasi (belum disimpan sampai Anda menekan Simpan).', teksYa: 'Ya, Muat Bawaan' }))) return;
    E.rows = setKeRows(JENIS[E.jenis]); renderEditor();
  }
  async function edSimpan() {
    const baris = E.rows.map((r, i) => ({ baris: i + 1, no: i + 1, nm: r.dim, sk: SK_LABEL[r.sk], ar: r.ar < 0 ? 'Negatif' : 'Positif', teks: r.teks, hal: r.hal, kode: r.kode, pas: r.pasUid ? noDariUid(r.pasUid) : '', pet: r.pet }));
    const r = susunSet(E.jenis, baris);
    if (r.galat.length) { Dialog.info({ judul: 'Butir Survei Belum Bisa Disimpan', tipe: 'warning', ikon: 'fa-file-circle-exclamation', pesan: 'Perbaiki hal berikut lalu simpan lagi:', daftar: r.galat.slice(0, 12) }); return; }
    if (await simpanPaket(E.kategori, E.jenis, r.set)) { tutupEditor(); toast(`${JENIS[E.jenis].nama}: ${r.set.butir.length} butir tersimpan di Bank Soal.`, 'success'); }
  }
  document.addEventListener('input', (ev) => { if (ev.target && ev.target.closest && ev.target.closest('#sv-ed-body') && ev.target.dataset.f !== 'pas') edUbah(ev); });
  document.addEventListener('change', (ev) => { if (ev.target && ev.target.closest && ev.target.closest('#sv-ed-body')) edUbah(ev); });

  // ---------------- form Kelola Ujian (hanya pilihan jenis + status; butir dikelola di Bank Soal) ----------------
  function jenisFormSaatIni() {
    const g = (id) => { const el = $(id); return el ? el.value : ''; };
    return jenisUntukUjian({ survei: g('ujian-survei'), judul: g('ujian-judul'), kategori: g('ujian-kategori'), guru_id: state.user && state.user.id }, daftarPaket());
  }
  function statusForm() {
    const el = $('ujian-survei-status'); if (!el) return;
    const pilihan = ($('ujian-survei') || {}).value || '';
    { const wb = $('ujian-survei-waktu-box'); if (wb) wb.style.display = pilihan ? '' : 'none'; } // waktu pengerjaan hanya relevan bila survei aktif
    const jenis = jenisFormSaatIni(); const kat = ($('ujian-kategori') || {}).value || '';
    let teks = '';
    if (!pilihan) teks = 'Survei nonaktif untuk ujian ini.';
    else if (pilihan === 'auto' && !jenis) teks = 'Mode Otomatis: judul/kategori ujian ini belum memuat kata "Numerasi" atau "Literasi" dan kategorinya belum punya paket survei, jadi belum ada survei.';
    else {
      const p = paketKategori(kat, jenis); const r = p ? ringkasPaket(p, jenis) : null;
      const c = F.json ? bangunSet(jenis, F.json) : null;
      if (r) teks = `Memakai paket ${JENIS[jenis].nama} dari Bank Soal › ${kat}: ${r.butir} butir, ${r.dim} dimensi, ${r.hal} halaman. Ubah lewat Bank Soal › Kelola Soal.`;
      else if (F.json && c && c.kustom) teks = `Memakai butir khusus lama yang tersimpan di ujian ini (${c.butir.length} butir). Buat paket di Bank Soal › Kelola Soal untuk menggantinya.`;
      else teks = `Memakai butir bawaan ${JENIS[jenis].nama} (${JENIS[jenis].butir.length} butir). Upload paket survei di Bank Soal › Kelola Soal kategori "${kat || '…'}" agar menyatu dengan soalnya.`;
    }
    el.textContent = teks;
  }
  function setDraft(json) { F.json = json || ''; statusForm(); }
  function draftJson() { return F.json; }
  function pakaiBawaan() { F.json = ''; statusForm(); toast('Butir khusus lama dilepas dari ujian ini.'); }
  // Template Word dibuat LANGSUNG di browser (tidak bergantung pada berkas .docx di GitHub): tabel kolom
  // No | Halaman | Dimensi | Skala | Arah | Pernyataan | Kode | Pasangan | Petunjuk, berisi butir bawaan sebagai contoh isian.
  function unduhTemplate(jenis) {
    try {
      const J = JENIS[jenis]; if (!J) return;
      if (typeof unduhDocx_ !== 'function') { toast('Fitur unduh template belum siap. Muat ulang halaman (Ctrl+F5).', 'error'); return; }
      const baris = setKeRows(J);
      const noUid = {}; baris.forEach((r, i) => { noUid[r.uid] = String(i + 1); });
      const rows = baris.map((r, i) => [
        String(i + 1), String(r.hal || ''), r.dim, SK_LABEL[r.sk] || '', r.ar < 0 ? 'Negatif' : 'Positif', r.teks, r.kode || '',
        r.pasUid ? (noUid[r.pasUid] || '') : '', r.pet || ''
      ]);
      const items = [
        { text: 'TEMPLATE ' + J.nama.toUpperCase() + ' — CBT Online', heading: true },
        { text: 'Isi tabel di bawah: SATU BARIS = SATU BUTIR PERNYATAAN. Jangan mengubah baris judul kolom. Butir yang tertulis adalah contoh bawaan; ubah, hapus, atau tambah baris sesuai kebutuhan (minimal 5, maksimal 99 butir).' },
        { text: 'Dimensi: nama kelompok butir. Skala: Setuju, Kurang, Frekuensi, atau Pengalaman (semua butir pada Halaman yang sama harus memakai Skala yang sama). Arah: Positif bila jawaban tertinggi berarti kondisi baik, Negatif bila berarti kondisi buruk (skor dibalik). Halaman: angka yang sama = butir tampil bersama sebagai tabel matriks (kosongkan/0 bila satu butir per layar). Pasangan: isi No butir lain yang maknanya berlawanan (satu Positif, satu Negatif). Kode dan Petunjuk boleh kosong; Petunjuk dibaca dari baris pertama pada tiap Halaman.' },
        { text: 'Cara memasukkan: di portal guru buka Bank Soal › Kelola Soal (kategori yang sesuai) › kartu ' + J.nama + ' › "Upload Word". Butir tersimpan di Bank Soal bersama soal kategori itu dan dipakai berulang tanpa upload ulang; bisa diubah kapan saja lewat "Edit Butir".' },
        { table: { headers: ['No', 'Halaman', 'Dimensi', 'Skala', 'Arah', 'Pernyataan', 'Kode', 'Pasangan', 'Petunjuk'], rows, widths: [480, 680, 2100, 1050, 860, 6300, 650, 780, 2138] } }
      ];
      unduhDocx_('Template ' + (jenis === 'karakter' ? 'Survei Karakter' : 'Survei Sulingjar') + '.docx', items);
      toast('Template ' + J.nama + ' berhasil diunduh.', 'success');
    } catch (e) { toast('Gagal membuat template: ' + e.message, 'error'); }
  }

  // ---------------- pemasangan ke aplikasi ----------------
  // 1) layar nilai baru tampil setelah survei (urutan: tes -> bukti orak-orik -> survei -> nilai)
  const _tampilHasil = ExamEngine.tampilkanHasil;
  ExamEngine.tampilkanHasil = async function (nilai, lulus, judul) {
    try { await jalankanBila(); } catch (e) { console.error('Survei:', e); }
    return _tampilHasil.call(ExamEngine, nilai, lulus, judul);
  };
  // 2) tab guru "Hasil Survei"
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) {
    _gantiTab.call(UI, tabId);
    if (tabId === 'tab-survei') guruMuatPilihan();
  };

  // 3) detail jawaban guru & siswa: tab Pembahasan Soal | Pembahasan Survei
  const _bukaDetailGuru = Guru.bukaDetailSiswa;
  Guru.bukaDetailSiswa = function (sesiId) { siapkanDetailGuru(sesiId); return _bukaDetailGuru.call(Guru, sesiId); };
  const _bukaDetailSiswa = ExamEngine.bukaDetailJawaban;
  ExamEngine.bukaDetailJawaban = async function () { await _bukaDetailSiswa.call(ExamEngine); try { await siapkanDetailSiswa(); } catch (e) { } };

  return { saranDim, toggleRagu, jenisUntukUjian, setUntukUjian, cariPaket, muatPaket, badgePaket, renderKartuKategori, bukaKategoriKelola, imporKeKategori, hapusPaket, bukaEditor, tutupEditor, edTambah, edHapus, edGeser, edAturHalaman, edBawaan, edSimpan, mulai, skala, pilih, pilihId, geser, lompat, lompatButir, kirim, jenisUntukUjian, bangunSet, hitung, periksaKualitas, kategoriIndeks, kategoriKesungguhan, JENIS, guruMuat, guruRender, guruUnduh,
    modeDetail, gabungKeRekap, selRekap, ringkasSurvei, setDraft, draftJson, statusForm, pakaiBawaan, unduhTemplate, htmlPembahasan, bukaDetail, tutupDetail, pindahDetail, cetakDetail, cetakDetailBanyak };
})();

// v43s: berkas ini adalah versi dengan paket survei (muatPaket, badgePaket, editor butir).
