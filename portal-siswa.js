/* ============================================================================
   PORTAL SISWA — beranda akun siswa dengan menu:
     Dashboard | Simulasi Selesai | Grafik Perkembangan | Riwayat Simulasi | Leaderboard | Analisis Materi
   - Menjadi halaman pertama setelah siswa login. Tombol "Mulai Simulasi" membuka layar token seperti biasa
     (alur ujian tidak berubah).
   - Data: aksi getPortalSiswa (riwayat + leaderboard TOP 10 & peringkat sendiri) dan getAnalisisMateri.
     Perlu Code.gs terbaru untuk Mode Server; Mode Lokal cukup ganti file.
   - Leaderboard hanya menampilkan 10 besar + peringkat siswa itu sendiri (nilai siswa lain tidak dikirim).
   Dimuat SETELAH analisis-materi.js dan perkembangan.js.
   ============================================================================ */
'use strict';
const PortalSiswa = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const bulat = (n) => Math.round(Number(n) || 0);
  const PG = Perkembangan;
  const fmt = PG.fmt, fmtD = PG.fmtD;
  const NAMA_JENIS = { literasi: 'Literasi', numerasi: 'Numerasi', lainnya: 'Mapel Lain' };
  const IKON_JENIS = { literasi: 'fa-book-open', numerasi: 'fa-calculator', lainnya: 'fa-layer-group' };
  const WARNA_JENIS = { literasi: '#2563eb', numerasi: '#ea580c', lainnya: '#7c3aed' };
  const MENU = [
    ['dashboard', 'Dashboard', 'fa-gauge-high'],
    ['selesai', 'Simulasi Selesai', 'fa-circle-check'],
    ['grafik', 'Grafik Perkembangan', 'fa-chart-line'],
    ['riwayat', 'Riwayat Simulasi', 'fa-clock-rotate-left'],
    ['leaderboard', 'Leaderboard', 'fa-trophy'],
    ['analisis', 'Analisis Materi', 'fa-magnifying-glass-chart']
  ];
  const JUDUL = { dashboard: 'Dashboard', selesai: 'Simulasi yang Telah Diselesaikan', grafik: 'Grafik Perkembangan Skor', riwayat: 'Riwayat Simulasi', leaderboard: 'Leaderboard', analisis: 'Analisis Materi' };

  // ---------------- gaya ----------------
  (function () {
    if (document.getElementById('portal-siswa-css-inline')) return;
    const st = document.createElement('style'); st.id = 'portal-siswa-css-inline';
    st.textContent = `
#sw-screen { --sw-blue: #0d6efd; --sw-ink: #1f2a37; --sw-soft: #f5f8fd; }
#sw-screen .sw-wrap { flex: 1 1 auto; width: 100%; max-width: 1380px; margin: -45px auto 0; padding: 0 clamp(14px, 3.1vw, 43px) 36px; position: relative; z-index: 3; display: grid; grid-template-columns: 262px minmax(0, 1fr); gap: 22px; align-items: start; }
#sw-screen .sw-card { background: #fff; border-radius: 14px; box-shadow: 0 18px 38px -16px rgba(30,55,90,.28), 0 2px 8px rgba(30,55,90,.06); border: 1px solid rgba(222,226,230,.7); }
#sw-screen .sw-side { position: sticky; top: 14px; padding: 16px 14px 16px; }
#sw-screen .sw-prof { display: flex; align-items: center; gap: .75rem; padding: .35rem .4rem 1rem; border-bottom: 1px solid #eef1f5; margin-bottom: .7rem; }
#sw-screen .sw-av { width: 46px; height: 46px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center; font-weight: 700; color: #fff; background: linear-gradient(135deg, #326698, #0d6efd); letter-spacing: .03em; }
#sw-screen .sw-prof b { display: block; font-size: .93rem; line-height: 1.25; color: var(--sw-ink); word-break: break-word; }
#sw-screen .sw-prof small { color: #6c757d; font-size: .76rem; }
#sw-screen .sw-nav { display: flex; flex-direction: column; gap: 3px; }
#sw-screen .sw-nav button { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: .7rem; padding: .62rem .75rem; border-radius: 10px; font: 500 14px/1.2 'Poppins', sans-serif; color: #44505e; -webkit-tap-highlight-color: transparent; }
#sw-screen .sw-nav button i { width: 20px; text-align: center; color: #8a96a5; font-size: .95rem; }
#sw-screen .sw-nav button:hover { background: #eef4ff; }
#sw-screen .sw-nav button.on { background: var(--sw-blue); color: #fff; font-weight: 600; box-shadow: 0 6px 14px -6px rgba(13,110,253,.6); }
#sw-screen .sw-nav button.on i { color: #fff; }
#sw-screen .sw-nav button:focus-visible, #sw-screen .sw-btn:focus-visible { outline: 3px solid rgba(13,110,253,.35); outline-offset: 2px; }
#sw-screen .sw-cta { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: .5rem; width: 100%; margin-top: .9rem; padding: .7rem 1rem; border-radius: 30px; font: 600 14px/1 'Poppins', sans-serif; color: #fff; background: linear-gradient(135deg, #198754, #20a46a); box-shadow: 0 8px 18px -8px rgba(25,135,84,.7); }
#sw-screen .sw-cta:hover { filter: brightness(1.06); }
#sw-screen .sw-main { min-width: 0; display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr); }
#sw-screen .sw-konten { grid-template-columns: minmax(0, 1fr); min-width: 0; }
#sw-screen .sw-panel, #sw-screen .sw-card { min-width: 0; }
#sw-screen .sw-head { display: flex; align-items: center; justify-content: space-between; gap: .8rem; flex-wrap: wrap; background: #fff; border-radius: 14px; padding: .85rem 1.1rem; border: 1px solid rgba(222,226,230,.7); box-shadow: 0 18px 38px -16px rgba(30,55,90,.28), 0 2px 8px rgba(30,55,90,.06); }
#sw-screen .sw-head h2 { margin: 0; font: 600 20px/1.25 'Poppins', sans-serif; color: var(--sw-ink); }
#sw-screen .sw-head p { margin: .15rem 0 0; font-size: 12.5px; line-height: 1.5; color: #6c757d; max-width: 760px; }
#sw-screen .sw-btn { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: .45rem; padding: .45rem 1rem; border-radius: 999px; font: 600 13px/1.2 'Poppins', sans-serif; color: var(--sw-blue); background: #fff; border: 1px solid var(--sw-blue); -webkit-tap-highlight-color: transparent; }
#sw-screen .sw-btn:hover { background: #eef4ff; } #sw-screen .sw-btn[disabled] { opacity: .55; cursor: not-allowed; }
#sw-screen .sw-btn.solid { background: var(--sw-blue); color: #fff; } #sw-screen .sw-btn.solid:hover { filter: brightness(1.07); }
#sw-screen .sw-btn { white-space: nowrap; }
#sw-screen table.sw-t td[data-l="Durasi"] { white-space: nowrap; }
#sw-screen .sw-btn.mini { padding: .3rem .75rem; font-size: 12px; }
#sw-screen .sw-hero { position: relative; overflow: hidden; border-radius: 16px; padding: 22px 26px; color: #fff; background: linear-gradient(120deg, #1d4f8c, #326698 55%, #2b7bd1); box-shadow: 0 18px 38px -16px rgba(30,55,90,.5); }
#sw-screen .sw-hero::after { content: ''; position: absolute; right: -50px; top: -70px; width: 250px; height: 250px; border-radius: 50%; background: rgba(255,255,255,.08); }
#sw-screen .sw-hero > * { position: relative; z-index: 1; }
#sw-screen .sw-hero small { display: block; font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
#sw-screen .sw-hero h3 { margin: .2rem 0 .25rem; font: 600 24px/1.25 'Poppins', sans-serif; color: #fff; }
#sw-screen .sw-hero p { margin: 0; font-size: 13.5px; line-height: 1.6; opacity: .95; max-width: 620px; }
#sw-screen .sw-hero .sw-acts { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: .95rem; }
#sw-screen .sw-hero .sw-btn { border-color: transparent; }
#sw-screen .sw-hero .sw-btn.ghost { background: rgba(255,255,255,.14); color: #fff; border-color: rgba(255,255,255,.55); }
#sw-screen .sw-hero .sw-btn.ghost:hover { background: rgba(255,255,255,.24); }
#sw-screen .sw-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(176px, 1fr)); gap: .8rem; }
#sw-screen .sw-kpi { display: flex; gap: .8rem; align-items: center; padding: .9rem 1rem; }
#sw-screen .sw-ki { width: 44px; height: 44px; flex: 0 0 auto; border-radius: 12px; display: grid; place-items: center; font-size: 1.1rem; color: var(--k); background: color-mix(in srgb, var(--k) 13%, #fff); }
#sw-screen .sw-kpi small { display: block; font-size: .72rem; font-weight: 600; color: #6c757d; letter-spacing: .02em; }
#sw-screen .sw-kpi b { display: block; font-size: 1.5rem; line-height: 1.2; color: var(--sw-ink); font-variant-numeric: tabular-nums; }
#sw-screen .sw-kpi em { display: block; font-style: normal; font-size: .72rem; color: #6c757d; line-height: 1.35; margin-top: .1rem; overflow: hidden; text-overflow: ellipsis; }
#sw-screen .sw-grid2 { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
#sw-screen .sw-panel { padding: 16px 18px 18px; }
#sw-screen .sw-panel > .sw-ph { display: flex; align-items: center; justify-content: space-between; gap: .6rem; flex-wrap: wrap; margin: 0 0 .7rem; }
#sw-screen .sw-panel h3 { margin: 0; font: 600 15.5px/1.3 'Poppins', sans-serif; color: var(--sw-ink); }
#sw-screen .sw-panel h3 small { font-weight: 500; color: #6c757d; font-size: .78rem; margin-left: .3rem; }
#sw-screen .sw-chips { display: flex; flex-wrap: wrap; gap: .4rem; margin: 0 0 .8rem; }
#sw-screen .sw-chip { all: unset; box-sizing: border-box; cursor: pointer; padding: .38rem .9rem; border-radius: 999px; font: 600 12.5px/1.2 'Poppins', sans-serif; color: #44505e; background: #fff; border: 1px solid #d5dbe3; -webkit-tap-highlight-color: transparent; }
#sw-screen .sw-chip:hover { border-color: var(--sw-blue); background: #eef4ff; }
#sw-screen .sw-chip.on { background: var(--sw-blue); border-color: var(--sw-blue); color: #fff; }
#sw-screen .sw-chip .sw-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: .4rem; vertical-align: -1px; background: var(--c, #999); }
#sw-screen .sw-chip.off { opacity: .55; text-decoration: line-through; }
#sw-screen .sw-list { display: grid; gap: .55rem; }
#sw-screen .sw-row { display: flex; align-items: center; gap: .75rem; padding: .65rem .8rem; border: 1px solid #e8ecf1; border-radius: 12px; background: #fff; }
#sw-screen .sw-row .sw-ri { width: 36px; height: 36px; flex: 0 0 auto; border-radius: 10px; display: grid; place-items: center; color: #fff; background: var(--c, #326698); font-size: .95rem; }
#sw-screen .sw-row .sw-rt { flex: 1 1 auto; min-width: 0; }
#sw-screen .sw-row .sw-rt b { display: block; font-size: .88rem; color: var(--sw-ink); line-height: 1.3; word-break: break-word; }
#sw-screen .sw-row .sw-rt small { color: #6c757d; font-size: .75rem; }
#sw-screen .sw-row .sw-rn { font-weight: 800; font-size: 1.15rem; font-variant-numeric: tabular-nums; color: var(--sw-ink); }
#sw-screen .sw-st { display: inline-block; padding: .1rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; white-space: nowrap; }
#sw-screen .sw-st.lulus { background: #e3f5ec; color: #1b7f53; } #sw-screen .sw-st.remedial { background: #fdeaed; color: #c0334a; } #sw-screen .sw-st.blokir { background: #eceff3; color: #5b6673; } #sw-screen .sw-st.netral { background: #eef4ff; color: #2b5fb4; }
#sw-screen .sw-nbar { display: block; height: 6px; border-radius: 99px; background: #e8ecf1; overflow: hidden; min-width: 60px; }
#sw-screen .sw-nbar i { display: block; height: 100%; border-radius: 99px; }
#sw-screen .sw-nbar i.kurang { background: #d6455d; } #sw-screen .sw-nbar i.cukup { background: #dc8f12; } #sw-screen .sw-nbar i.baik { background: #229a66; }
#sw-screen .sw-prio { display: grid; gap: .55rem; }
#sw-screen .sw-prio .sw-pi { padding: .6rem .75rem; border-radius: 10px; border: 1px solid #e8ecf1; border-left: 4px solid var(--c); background: #fff; }
#sw-screen .sw-prio .sw-pi div { display: flex; justify-content: space-between; gap: .5rem; align-items: baseline; }
#sw-screen .sw-prio .sw-pi b { font-size: .86rem; color: var(--sw-ink); line-height: 1.3; }
#sw-screen .sw-prio .sw-pi small { color: #6c757d; font-size: .72rem; }
#sw-screen .sw-rings { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; margin: 0 0 .8rem; }
#sw-screen .sw-ring { display: flex; align-items: center; gap: .6rem; padding: .55rem .7rem; border: 1px solid #e8ecf1; border-radius: 12px; }
#sw-screen .sw-ring .am-ring { width: 54px; height: 54px; } #sw-screen .sw-ring .am-ring span { width: 42px; height: 42px; font-size: .82rem; }
#sw-screen .sw-ring small { display: block; color: #6c757d; font-size: .72rem; } #sw-screen .sw-ring b { font-size: .88rem; color: var(--sw-ink); }
#sw-screen .sw-tes { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem; }
#sw-screen .sw-tc { overflow: hidden; }
#sw-screen .sw-tc-h { display: flex; justify-content: space-between; align-items: center; gap: .6rem; padding: .85rem 1rem; background: linear-gradient(120deg, #eef4ff, #f8fbff); border-bottom: 1px solid #e3eaf5; }
#sw-screen .sw-tc-h b { font-size: 1rem; color: var(--sw-ink); } #sw-screen .sw-tc-h small { display: block; color: #6c757d; font-size: .72rem; }
#sw-screen .sw-tc-h .sw-avg { text-align: right; } #sw-screen .sw-tc-h .sw-avg strong { display: block; font-size: 1.45rem; line-height: 1.1; color: var(--sw-blue); }
#sw-screen .sw-tc-b { padding: .8rem 1rem 1rem; display: grid; gap: .65rem; }
#sw-screen .sw-js { display: grid; grid-template-columns: 34px 1fr auto; gap: .2rem .7rem; align-items: center; }
#sw-screen .sw-js .sw-ri { grid-row: 1 / span 2; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: var(--c); font-size: .9rem; }
#sw-screen .sw-js b { font-size: .86rem; color: var(--sw-ink); } #sw-screen .sw-js small { color: #6c757d; font-size: .72rem; }
#sw-screen .sw-js .sw-n { grid-row: 1 / span 2; grid-column: 3; font-weight: 800; font-size: 1.3rem; text-align: right; font-variant-numeric: tabular-nums; color: var(--sw-ink); }
#sw-screen .sw-js.belum { opacity: .65; } #sw-screen .sw-js.belum .sw-ri { background: #c3ccd7; } #sw-screen .sw-js.belum .sw-n { color: #9aa5b1; font-weight: 500; font-size: .95rem; }
#sw-screen .sw-sum { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .8rem; }
#sw-screen .sw-wrapt { overflow-x: auto; }
#sw-screen table.sw-t { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
#sw-screen table.sw-t th { text-align: left; padding: .6rem .7rem; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; color: #6c757d; border-bottom: 2px solid #e3e8ef; white-space: nowrap; background: #fafcff; position: sticky; top: 0; }
#sw-screen table.sw-t td { padding: .6rem .7rem; border-bottom: 1px solid #eef1f5; vertical-align: middle; }
#sw-screen table.sw-t tbody tr:hover td { background: #f6f9ff; }
#sw-screen table.sw-t td:first-child b { white-space: nowrap; }
#sw-screen table.sw-t .sw-c { text-align: center; } #sw-screen table.sw-t .sw-num { font-variant-numeric: tabular-nums; font-weight: 700; }
#sw-screen tr.sw-me td { background: #eaf2ff !important; font-weight: 700; }
#sw-screen .sw-tag { display: inline-flex; align-items: center; gap: .35rem; padding: .1rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; color: var(--c); background: color-mix(in srgb, var(--c) 12%, #fff); }
#sw-screen .sw-kosong { text-align: center; padding: 2rem 1rem; color: #6c757d; font-size: .9rem; line-height: 1.6; }
#sw-screen .sw-kosong i { display: block; font-size: 2.4rem; margin-bottom: .6rem; opacity: .45; }
#sw-screen .sw-me-card { display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap; padding: 1rem 1.2rem; background: linear-gradient(120deg, #eaf2ff, #fff); border: 1px solid #cfe0fb; }
#sw-screen .sw-rank { width: 78px; height: 78px; border-radius: 50%; flex: 0 0 auto; display: grid; place-items: center; text-align: center; background: linear-gradient(135deg, #1d4f8c, #0d6efd); color: #fff; box-shadow: 0 10px 22px -10px rgba(13,110,253,.8); }
#sw-screen .sw-rank b { font-size: 1.7rem; line-height: 1; display: block; } #sw-screen .sw-rank small { font-size: .62rem; letter-spacing: .1em; text-transform: uppercase; opacity: .85; display: block; }
#sw-screen .sw-me-card h3 { margin: 0 0 .15rem; font-size: 1.05rem; } #sw-screen .sw-me-card p { margin: 0; font-size: .84rem; color: #5b6673; line-height: 1.55; }
#sw-screen .sw-podium { display: flex; justify-content: center; align-items: flex-end; gap: .8rem; margin: .4rem 0 1rem; }
#sw-screen .sw-pod { flex: 1 1 0; max-width: 250px; min-width: 0; text-align: center; border-radius: 16px; padding: 1rem .7rem .85rem; color: #2b2410; position: relative; box-shadow: 0 12px 26px -14px rgba(30,55,90,.5); }
#sw-screen .sw-pod[data-p="1"] { padding-top: 1.4rem; padding-bottom: 1.1rem; }
#sw-screen .sw-pod.g1 { background: linear-gradient(160deg, #fff1b8, #f4c542 70%, #e8a900); } #sw-screen .sw-pod.g2 { background: linear-gradient(160deg, #f4f6f9, #cfd6df 70%, #aab4c2); color: #1f2733; } #sw-screen .sw-pod.g3 { background: linear-gradient(160deg, #fbe3cd, #e3a672 70%, #c47c43); color: #2f1d0e; }
#sw-screen .sw-pod .sw-medal { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.18); font-weight: 800; font-size: .9rem; }
#sw-screen .sw-pod b.sw-pn { display: block; margin-top: .3rem; font-size: .9rem; line-height: 1.25; min-height: 2.3em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
#sw-screen .sw-pod small { display: block; font-size: .72rem; font-weight: 600; opacity: .8; }
#sw-screen .sw-pod strong { display: block; font-size: 1.9rem; line-height: 1.15; margin-top: .2rem; } #sw-screen .sw-pod[data-p="1"] strong { font-size: 2.2rem; }
#sw-screen .sw-pod.saya { outline: 3px solid #0d6efd; outline-offset: 2px; }
#sw-screen .sw-skel { background: linear-gradient(90deg, #eef1f5 25%, #f7f9fc 37%, #eef1f5 63%); background-size: 400% 100%; animation: swShim 1.4s ease infinite; border-radius: 12px; }
@keyframes swShim { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
#sw-screen .sw-note { font-size: .78rem; color: #6c757d; line-height: 1.55; margin: .7rem 0 0; }
#sw-screen .sw-galat { padding: 1.4rem; text-align: center; color: #6c757d; }
#sw-screen .sw-galat i { font-size: 2rem; color: #d6455d; display: block; margin-bottom: .5rem; }
#sw-screen .sw-konten { animation: swMasuk .28s ease both; }
@keyframes swMasuk { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { #sw-screen .sw-konten, #sw-screen .sw-skel { animation: none; } }
@media (max-width: 960px) {
  #sw-screen .sw-wrap { grid-template-columns: minmax(0, 1fr); margin-top: -38px; gap: 14px; }
  #sw-screen .sw-side { min-width: 0; max-width: 100%; }
  #sw-screen .sw-side { position: sticky; top: 0; z-index: 30; padding: 8px; border-radius: 14px; }
  #sw-screen .sw-prof, #sw-screen .sw-cta { display: none; }
  #sw-screen .sw-nav { flex-direction: row; overflow-x: auto; gap: 6px; scrollbar-width: none; }
  #sw-screen .sw-nav::-webkit-scrollbar { display: none; }
  #sw-screen .sw-nav button { flex: 0 0 auto; padding: .55rem .85rem; white-space: nowrap; }
  #sw-screen .sw-grid2 { grid-template-columns: minmax(0, 1fr); }
  #sw-screen .sw-head h2 { font-size: 19px; }
  #sw-screen .sw-hero { padding: 18px 18px; } #sw-screen .sw-hero h3 { font-size: 20px; }
}
@media (max-width: 680px) {
  #sw-screen .sw-podium { flex-direction: column; align-items: stretch; gap: 1.1rem; padding-top: .5rem; }
  #sw-screen .sw-pod { max-width: none; } #sw-screen .sw-pod[data-p="1"] { order: 1; } #sw-screen .sw-pod[data-p="2"] { order: 2; } #sw-screen .sw-pod[data-p="3"] { order: 3; }
  #sw-screen .sw-rings { grid-template-columns: 1fr; }
  #sw-screen table.sw-r thead { display: none; }
  #sw-screen table.sw-r, #sw-screen table.sw-r tbody, #sw-screen table.sw-r tr, #sw-screen table.sw-r td { display: block; width: 100%; }
  #sw-screen table.sw-r tr { padding: .7rem .8rem; border: 1px solid #e8ecf1; border-radius: 12px; margin-bottom: .6rem; }
  #sw-screen table.sw-r td { border: 0; padding: .15rem 0; display: flex; justify-content: space-between; gap: .8rem; text-align: right; }
  #sw-screen table.sw-r td::before { content: attr(data-l); font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; color: #8a96a5; font-weight: 700; text-align: left; flex: 0 0 auto; }
}
/* kartu "Akun Saya" di layar konfirmasi peserta */
.sw-entry { padding: 22px 26px 24px 44px; display: flex; flex-direction: column; gap: 1rem; }
.sw-entry .sw-entry-head { display: flex; align-items: center; gap: .9rem; }
.sw-entry .sw-entry-ico { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; flex: 0 0 auto; color: #0d6efd; font-size: 1.15rem; background: linear-gradient(145deg, #eaf2ff, #d6e6ff); box-shadow: inset 0 0 0 1px rgba(13,110,253,.14); }
.sw-entry h3 { margin: 0 0 2px; font: 600 16px/1.3 'Poppins', sans-serif; color: #111; }
.sw-entry p { margin: 0; font-size: 12.5px; line-height: 1.55; color: #6c757d; }
.sw-entry .sw-entry-btn { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: .6rem; width: 100%; padding: .8rem 1.1rem; border-radius: 12px; background: linear-gradient(135deg, #1a73ff, #0d5bd8); color: #fff; font: 600 14px/1.2 'Poppins', sans-serif; box-shadow: 0 6px 16px rgba(13,110,253,.28); transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
.sw-entry .sw-entry-btn i { font-size: .85rem; transition: transform .15s ease; }
.sw-entry .sw-entry-btn:hover { filter: brightness(1.06); box-shadow: 0 8px 20px rgba(13,110,253,.36); transform: translateY(-1px); }
.sw-entry .sw-entry-btn:hover i { transform: translateX(-3px); }
.sw-entry .sw-entry-btn:active { transform: translateY(0); box-shadow: 0 3px 10px rgba(13,110,253,.3); }
.sw-entry .sw-entry-btn:focus-visible { outline: 3px solid rgba(13,110,253,.35); outline-offset: 2px; }
@media (min-width: 901px) { .anbk-konf { grid-template-rows: auto 1fr; } .anbk-konf .sw-entry { grid-column: 1; grid-row: 2; align-self: start; } .anbk-konf .anbk-card-form { grid-column: 2; grid-row: 1 / span 2; } }
@media (max-width: 900px) { .sw-entry { padding: 16px 20px 18px; } }`;
    document.head.appendChild(st);
  })();

  // ---------------- status ----------------
  const PS = { view: 'dashboard', uid: null, data: null, am: null, galat: '', waktu: 0, memuat: false, ada: false, td: null, items: [], lbTes: 'semua', lbScope: 'kelas', jenisRiwayat: 'semua', cari: '', seri: { akhir: true, literasi: true, numerasi: true, lainnya: true, kelas: true }, dariDetail: false };

  const tglPendek = (v) => { const d = new Date(v); return isNaN(d) ? '–' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const jamTxt = (v) => { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'); };
  const durasi = (a, b) => { const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000); return isFinite(m) && m >= 0 ? m + ' mnt' : '–'; };
  const levelNilai = (n) => n < 60 ? 'kurang' : (n < 80 ? 'cukup' : 'baik');
  function lulusDari(r) {
    if (r.lulus === true || String(r.lulus).toLowerCase() === 'true') return true;
    if (r.lulus === false || String(r.lulus).toLowerCase() === 'false') return false;
    if (r.kkm > 0 && r.nilai != null) return r.nilai >= r.kkm;
    return null;
  }
  function badgeStatus(r) {
    if (r.status === 'diblokir') return '<span class="sw-st blokir">Diblokir</span>';
    const l = lulusDari(r);
    return l === true ? '<span class="sw-st lulus">Lulus</span>' : (l === false ? '<span class="sw-st remedial">Remedial</span>' : '<span class="sw-st netral">Selesai</span>');
  }
  const jenisR = (r) => PG.jenisItem(r);
  const namaDepan = (n) => { const s = String(n || '').trim().split(/\s+/)[0] || 'Siswa'; return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); };
  const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';

  // ---------------- data ----------------
  function turunan() {
    const rw = (PS.data && PS.data.riwayat) || [];
    PS.items = rw.filter(r => r.status === 'selesai' && r.nilai != null).map(r => ({ judul: r.judul, kategori: r.kategori, nilai: r.nilai, waktu: Date.parse(r.selesai) || 0, rataKelas: r.rataKelas, ref: r }));
    PS.td = PG.susunTes(PS.items);
    PS.ada = PS.items.length > 0;
    try { AnalisisMateri.setDataSiswa(PS.am, state.user.id); } catch (e) { }
    try { AnalisisMateri.setRiwayatSiswa(rw); } catch (e) { }
  }
  async function muat(paksa) {
    if (PS.memuat) return;
    if (!state.user || state.user.role !== 'siswa') return;
    if (PS.uid !== state.user.id) { PS.uid = state.user.id; PS.data = null; PS.am = null; PS.waktu = 0; PS.lbTes = 'semua'; PS.lbScope = 'kelas'; }
    if (!paksa && PS.data && Date.now() - PS.waktu < 30000) return;
    PS.memuat = true; PS.galat = '';
    if (!PS.data) renderView();
    try {
      const [a, b] = await Promise.all([api('getPortalSiswa', { siswaId: state.user.id }), api('getAnalisisMateri', { siswaId: state.user.id })]);
      if (!a || !a.ok) { PS.galat = (a && a.error) || 'Gagal memuat data.'; }
      else { PS.data = a; PS.am = (b && b.ok) ? b : { ujian: [], sesi: [], tersembunyi: [] }; PS.waktu = Date.now(); turunan(); }
    } catch (e) { PS.galat = 'Gagal memuat data.'; }
    PS.memuat = false;
    renderView();
  }

  // ---------------- kerangka ----------------
  function renderKerangka() {
    const u = state.user || {};
    $('sw-side').innerHTML = `<div class="sw-prof"><div class="sw-av">${esc(inisial(u.nama))}</div><div><b>${esc(u.nama || '-')}</b><small>${u.kelas ? 'Kelas ' + esc(u.kelas) + ' · ' : ''}${esc(u.username || '')}</small></div></div>
      <nav class="sw-nav" aria-label="Menu siswa">${MENU.map(m => `<button type="button" data-v="${m[0]}" class="${PS.view === m[0] ? 'on' : ''}" ${PS.view === m[0] ? 'aria-current="page"' : ''} onclick="PortalSiswa.buka('${m[0]}')"><i class="fa-solid ${m[2]}"></i>${m[1]}</button>`).join('')}</nav>
      <button type="button" class="sw-cta" onclick="PortalSiswa.mulaiSimulasi()"><i class="fa-solid fa-play"></i> Mulai Simulasi</button>`;
  }
  function judulHalaman(sub) {
    return `<div class="sw-head"><div><h2>${JUDUL[PS.view]}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button type="button" class="sw-btn" id="sw-segarkan" onclick="PortalSiswa.segarkan()"${PS.memuat ? ' disabled' : ''}><i class="fa-solid fa-rotate"></i> Segarkan</button></div>`;
  }
  const skeleton = () => `<div class="sw-konten">${judulHalaman('')}<div class="sw-skel" style="height:120px"></div><div class="sw-kpis">${'<div class="sw-skel" style="height:78px"></div>'.repeat(4)}</div><div class="sw-skel" style="height:260px"></div></div>`;

  function renderView() {
    const isi = $('sw-isi'); if (!isi) return;
    document.querySelectorAll('#sw-side .sw-nav button').forEach(b => { const on = b.dataset.v === PS.view; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (PS.galat && !PS.data) {
      isi.innerHTML = `<div class="sw-konten">${judulHalaman('')}<div class="sw-card sw-galat"><i class="fa-solid fa-triangle-exclamation"></i><b>${esc(PS.galat)}</b><p style="margin:.4rem 0 .8rem;font-size:.84rem">Pastikan koneksi internet stabil. Untuk Mode Server, pastikan <code>Code.gs</code> terbaru sudah dipasang (aksi <code>getPortalSiswa</code>).</p><button type="button" class="sw-btn solid" onclick="PortalSiswa.segarkan()">Coba lagi</button></div></div>`;
      return;
    }
    if (!PS.data) { isi.innerHTML = skeleton(); return; }
    const fn = { dashboard: vDashboard, selesai: vSelesai, grafik: vGrafik, riwayat: vRiwayat, leaderboard: vLeaderboard, analisis: vAnalisis }[PS.view];
    fn(isi);
    window.scrollTo(0, 0);
  }

  // ---------------- DASHBOARD ----------------
  function ringkasan() {
    const rw = PS.data.riwayat, selesai = rw.filter(r => r.status === 'selesai');
    const terbaik = new Map();
    selesai.forEach(r => { if (r.nilai == null) return; const p = terbaik.get(r.u); if (!p || r.nilai > p.nilai) terbaik.set(r.u, r); });
    const nilai = [...terbaik.values()];
    const tertinggi = nilai.length ? nilai.reduce((a, b) => b.nilai > a.nilai ? b : a) : null;
    const terakhir = selesai.find(r => r.nilai != null) || null;
    const lb = PS.data.lb && PS.data.lb.data && PS.data.lb.data.kelas && PS.data.lb.data.kelas.semua;
    return {
      nUjian: new Set(selesai.map(r => r.u)).size, nPercobaan: selesai.length, nTes: PS.td.tes.length,
      rata: nilai.length ? nilai.reduce((a, b) => a + b.nilai, 0) / nilai.length : null,
      tertinggi, terakhir, tren: PG.tren(PG.deret(PS.td.tes, 'akhir')), saya: lb ? lb.saya : null, total: lb ? lb.total : 0
    };
  }
  function kpi(ikon, warna, label, nilai, sub) {
    return `<div class="sw-card sw-kpi"><span class="sw-ki" style="--k:${warna}"><i class="fa-solid ${ikon}"></i></span><div><small>${label}</small><b>${nilai}</b><em>${sub || '&nbsp;'}</em></div></div>`;
  }
  function kalimatSapaan(rk) {
    if (!PS.ada) return 'Kamu belum menyelesaikan simulasi. Mulai simulasi pertamamu, lalu pantau perkembangan nilai dan materi yang perlu diperkuat di sini.';
    const t = rk.tren, tes = PS.td.tes;
    if (t.arah === 'naik') return `Kabar baik! Nilai rata-ratamu <b>naik ${fmt(Math.abs(t.delta))} poin</b> dari ${esc(tes[t.iSebelum].label)} ke ${esc(tes[t.iAkhir].label)}. Pertahankan semangat belajarmu.`;
    if (t.arah === 'turun') return `Nilai rata-ratamu <b>turun ${fmt(Math.abs(t.delta))} poin</b> dari ${esc(tes[t.iSebelum].label)} ke ${esc(tes[t.iAkhir].label)}. Tenang, cek Analisis Materi untuk tahu bagian yang perlu diperkuat.`;
    if (t.arah === 'stabil') return `Nilai rata-ratamu <b>stabil</b> dari ${esc(tes[t.iSebelum].label)} ke ${esc(tes[t.iAkhir].label)}. Coba perkuat materi yang masih kurang agar nilainya naik.`;
    return 'Simulasi pertamamu sudah tercatat. Selesaikan tes berikutnya untuk melihat apakah nilaimu naik atau turun.';
  }
  function vDashboard(isi) {
    const rk = ringkasan(), u = state.user || {};
    const am = AnalisisMateri.ringkasSiswa();
    const terbaru = PS.data.riwayat.slice(0, 4);
    isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">
      <div class="sw-hero"><small>Dashboard Siswa</small><h3>Halo, ${esc(namaDepan(u.nama))}! 👋</h3><p>${kalimatSapaan(rk)}</p>
        <div class="sw-acts"><button type="button" class="sw-btn" onclick="PortalSiswa.mulaiSimulasi()"><i class="fa-solid fa-play"></i> Mulai Simulasi</button>${PS.ada ? `<button type="button" class="sw-btn ghost" onclick="PortalSiswa.buka('grafik')"><i class="fa-solid fa-chart-line"></i> Lihat Grafik</button><button type="button" class="sw-btn ghost" onclick="PortalSiswa.buka('analisis')"><i class="fa-solid fa-magnifying-glass-chart"></i> Analisis Materi</button>` : ''}</div></div>
      <div class="sw-kpis">
        ${kpi('fa-circle-check', '#198754', 'Simulasi Selesai', rk.nUjian, `${rk.nTes} tes · ${rk.nPercobaan} percobaan`)}
        ${kpi('fa-chart-simple', '#2563eb', 'Rata-rata Nilai', rk.rata == null ? '–' : fmt(rk.rata), rk.tren.arah !== 'baru' ? PG.badgeTren(rk.tren) : 'Dari semua simulasi')}
        ${kpi('fa-flag-checkered', '#7c3aed', 'Nilai Terakhir', rk.terakhir ? fmt(rk.terakhir.nilai) : '–', rk.terakhir ? esc(rk.terakhir.judul) : 'Belum ada')}
        ${kpi('fa-medal', '#dc8f12', 'Nilai Tertinggi', rk.tertinggi ? fmt(rk.tertinggi.nilai) : '–', rk.tertinggi ? esc(rk.tertinggi.judul) : 'Belum ada')}
        ${kpi('fa-ranking-star', '#d6455d', 'Peringkat Kelas', rk.saya ? '#' + rk.saya.rank : '–', rk.saya ? `dari ${rk.total} siswa` : 'Belum ada peringkat')}
      </div>
      <div class="sw-grid2">
        <div class="sw-card sw-panel"><div class="sw-ph"><h3>Perkembangan Skor <small>nilai tiap tes</small></h3><button type="button" class="sw-btn mini" onclick="PortalSiswa.buka('grafik')">Selengkapnya</button></div><div id="sw-d-grafik"></div></div>
        <div class="sw-card sw-panel"><div class="sw-ph"><h3>Materi yang Perlu Diperkuat</h3><button type="button" class="sw-btn mini" onclick="PortalSiswa.buka('analisis')">Analisis</button></div>${htmlRingkasMateri(am)}</div>
      </div>
      <div class="sw-card sw-panel"><div class="sw-ph"><h3>Simulasi Terbaru</h3><button type="button" class="sw-btn mini" onclick="PortalSiswa.buka('riwayat')">Semua riwayat</button></div>
        ${terbaru.length ? `<div class="sw-list">${terbaru.map(r => barisSimulasi(r)).join('')}</div>` : `<div class="sw-kosong"><i class="fa-solid fa-clipboard-list"></i>Belum ada simulasi yang diselesaikan.</div>`}</div></div>`;
    if (PS.ada) PG.pasang($('sw-d-grafik'), (lebar, anim) => PG.grafikTes(PS.td, { lebar, anim, kelas: true, tinggi: lebar < 480 ? 230 : 270, judul: 'Perkembangan nilai tiap tes' }));
    else $('sw-d-grafik').innerHTML = `<div class="sw-kosong"><i class="fa-solid fa-chart-line"></i>Grafik akan muncul setelah kamu menyelesaikan simulasi.</div>`;
  }
  function htmlRingkasMateri(am) {
    if (!am) return `<div class="sw-kosong"><i class="fa-solid fa-magnifying-glass-chart"></i>Analisis materi akan muncul setelah kamu menyelesaikan simulasi (dan soal sudah diberi topik oleh guru).</div>`;
    const ring = (k) => { const J = am.jenis[k]; if (!J) return `<div class="sw-ring"><div><small>${NAMA_JENIS[k]}</small><b>Belum ada</b></div></div>`; const lv = levelNilai(J.persen); const w = lv === 'kurang' ? '#d6455d' : (lv === 'cukup' ? '#dc8f12' : '#229a66'); return `<div class="sw-ring"><div class="am-ring" style="--p:${bulat(J.persen)};--c:${w}"><span>${bulat(J.persen)}%</span></div><div><small>Penguasaan</small><b>${NAMA_JENIS[k]}</b></div></div>`; };
    const prio = am.prioritas.length
      ? `<div class="sw-prio">${am.prioritas.map(t => { const w = t.level === 'kurang' ? '#d6455d' : '#dc8f12'; return `<div class="sw-pi" style="--c:${w}"><div><b>${esc(t.label)}</b><span class="sw-st ${t.level === 'kurang' ? 'remedial' : 'netral'}">${bulat(t.persen)}%</span></div><small>${NAMA_JENIS[t.jenis]} · ${t.level === 'kurang' ? 'Perlu diperkuat' : 'Cukup'}</small><span class="sw-nbar" style="margin-top:.35rem"><i class="${t.level}" style="width:${Math.max(2, bulat(t.persen))}%"></i></span></div>`; }).join('')}</div>`
      : `<div class="sw-kosong" style="padding:1rem"><i class="fa-solid fa-circle-check" style="color:#229a66;opacity:1"></i>Hebat! Semua materi berada pada tingkat baik.</div>`;
    return `<div class="sw-rings">${ring('literasi')}${ring('numerasi')}</div>${prio}`;
  }
  function barisSimulasi(r) {
    const j = jenisR(r), w = WARNA_JENIS[j];
    return `<div class="sw-row"><span class="sw-ri" style="--c:${w}"><i class="fa-solid ${IKON_JENIS[j]}"></i></span><div class="sw-rt"><b>${esc(r.judul)}</b><small>${tglPendek(r.selesai)}, ${jamTxt(r.selesai)} · ${NAMA_JENIS[j]}</small></div>${badgeStatus(r)}<span class="sw-rn">${r.nilai == null ? '–' : fmt(r.nilai)}</span></div>`;
  }

  // ---------------- SIMULASI SELESAI ----------------
  function vSelesai(isi) {
    const rk = ringkasan(), tes = PS.td.tes, jenis = PS.td.jenis;
    const sum = `<div class="sw-sum">${kpi('fa-layer-group', '#2563eb', 'Tes Diselesaikan', rk.nTes, 'Tes 1, Tes 2, ...')}${kpi('fa-circle-check', '#198754', 'Simulasi Selesai', rk.nUjian, rk.nPercobaan + ' percobaan')}${kpi('fa-chart-simple', '#7c3aed', 'Rata-rata Nilai', rk.rata == null ? '–' : fmt(rk.rata), '')}${kpi('fa-medal', '#dc8f12', 'Nilai Tertinggi', rk.tertinggi ? fmt(rk.tertinggi.nilai) : '–', rk.tertinggi ? esc(rk.tertinggi.judul) : '')}</div>`;
    if (!PS.ada) { isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Daftar tes yang sudah kamu selesaikan beserta nilainya.')}<div class="sw-card sw-kosong"><i class="fa-solid fa-clipboard-check"></i>Belum ada simulasi yang diselesaikan.<br><br><button type="button" class="sw-btn solid" onclick="PortalSiswa.mulaiSimulasi()"><i class="fa-solid fa-play"></i> Mulai Simulasi</button></div></div>`; return; }
    const kartu = tes.map((t, i) => {
      const prev = tes.slice(0, i).reverse().find(x => x.akhir != null);
      const d = (t.akhir != null && prev) ? t.akhir - prev.akhir : null;
      const baris = jenis.map(j => {
        const n = t.nilai[j], ref = t.ref && t.ref[j];
        if (n == null) return `<div class="sw-js belum"><span class="sw-ri" style="--c:${WARNA_JENIS[j]}"><i class="fa-solid ${IKON_JENIS[j]}"></i></span><b>${NAMA_JENIS[j]}</b><small>Belum dikerjakan</small><span class="sw-n">–</span></div>`;
        return `<div class="sw-js"><span class="sw-ri" style="--c:${WARNA_JENIS[j]}"><i class="fa-solid ${IKON_JENIS[j]}"></i></span><b>${NAMA_JENIS[j]}</b><small>${ref ? tglPendek(ref.selesai) + ' · ' : ''}${ref ? badgeStatus(ref) : ''}</small><span class="sw-n">${fmt(n)}</span><span class="sw-nbar" style="grid-column:2/3"><i class="${levelNilai(n)}" style="width:${Math.max(2, bulat(n))}%"></i></span></div>`;
      }).join('');
      return `<div class="sw-card sw-tc"><div class="sw-tc-h"><div><b>${esc(t.label)}</b><small>${t.akhir == null ? 'Belum ada nilai' : 'Rata-rata nilai'}</small></div><div class="sw-avg"><strong>${t.akhir == null ? '–' : fmt(t.akhir)}</strong>${d == null ? '' : PG.badgeTren({ arah: d >= PG.AMBANG_TREN ? 'naik' : (d <= -PG.AMBANG_TREN ? 'turun' : 'stabil'), delta: d }, { pendek: true })}</div></div><div class="sw-tc-b">${baris}</div></div>`;
    }).join('');
    isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Daftar tes yang sudah kamu selesaikan beserta nilainya. Bila sebuah tes dikerjakan lebih dari sekali, nilai tertinggi yang dipakai.')}${sum}<div class="sw-tes">${kartu}</div></div>`;
  }

  // ---------------- GRAFIK PERKEMBANGAN ----------------
  function vGrafik(isi) {
    if (!PS.ada) { isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Pantau apakah nilaimu naik atau turun dari Tes 1, Tes 2, Tes 3, dan seterusnya.')}<div class="sw-card sw-kosong"><i class="fa-solid fa-chart-line"></i>Grafik akan muncul setelah kamu menyelesaikan simulasi.<br><br><button type="button" class="sw-btn solid" onclick="PortalSiswa.mulaiSimulasi()"><i class="fa-solid fa-play"></i> Mulai Simulasi</button></div></div>`; return; }
    const td = PS.td, tes = td.tes;
    const tAkhir = PG.tren(PG.deret(tes, 'akhir'));
    const ada = ['akhir'].concat(td.jenis).concat(PG.deret(tes, 'kelas').some(v => v != null) ? ['kelas'] : []);
    const chip = (k) => { const s = PG.SERI[k]; return `<button type="button" class="sw-chip${PS.seri[k] ? ' on' : ' off'}" data-k="${k}" onclick="PortalSiswa.toggleSeri('${k}')"><span class="sw-dot" style="--c:${s.warna}"></span>${s.nama}</button>`; };
    const akhirArr = PG.deret(tes, 'akhir').map((v, i) => ({ v, i })).filter(x => x.v != null);
    const maks = akhirArr.length ? akhirArr.reduce((a, b) => b.v > a.v ? b : a) : null;
    const ringkas = `<div class="sw-sum">
      <div class="sw-card sw-kpi"><span class="sw-ki" style="--k:${tAkhir.arah === 'turun' ? '#d6455d' : (tAkhir.arah === 'naik' ? '#198754' : '#dc8f12')}"><i class="fa-solid ${tAkhir.arah === 'turun' ? 'fa-arrow-trend-down' : (tAkhir.arah === 'naik' ? 'fa-arrow-trend-up' : 'fa-minus')}"></i></span><div><small>Tren Terakhir</small><b>${tAkhir.arah === 'baru' ? '–' : (tAkhir.arah === 'naik' ? 'Naik' : (tAkhir.arah === 'turun' ? 'Turun' : 'Stabil'))}</b><em>${tAkhir.arah === 'baru' ? 'Butuh minimal 2 tes' : fmtD(tAkhir.delta) + ' poin dari tes sebelumnya'}</em></div></div>
      <div class="sw-card sw-kpi"><span class="sw-ki" style="--k:#2563eb"><i class="fa-solid fa-route"></i></span><div><small>Perubahan Total</small><b>${tAkhir.arah === 'baru' ? '–' : fmtD(tAkhir.total)}</b><em>${tAkhir.arah === 'baru' ? '' : 'Dari ' + esc(tes[akhirArr[0].i].label) + ' sampai ' + esc(tes[tAkhir.iAkhir].label)}</em></div></div>
      <div class="sw-card sw-kpi"><span class="sw-ki" style="--k:#dc8f12"><i class="fa-solid fa-medal"></i></span><div><small>Nilai Rata-rata Tertinggi</small><b>${maks ? fmt(maks.v) : '–'}</b><em>${maks ? esc(tes[maks.i].label) : ''}</em></div></div></div>`;
    let prev = null;
    const tabel = `<div class="sw-wrapt"><table class="sw-t"><thead><tr><th>Tes</th>${td.jenis.map(j => `<th class="sw-c">${NAMA_JENIS[j]}</th>`).join('')}<th class="sw-c">Rata-rata</th><th class="sw-c">Perubahan</th><th class="sw-c">Rata-rata kelas</th></tr></thead><tbody>${tes.map(t => {
      const d = (t.akhir != null && prev != null) ? t.akhir - prev : null; if (t.akhir != null) prev = t.akhir;
      return `<tr><td><b>${esc(t.label)}</b></td>${td.jenis.map(j => `<td class="sw-c sw-num">${fmt(t.nilai[j])}</td>`).join('')}<td class="sw-c sw-num">${fmt(t.akhir)}</td><td class="sw-c">${d == null ? '–' : PG.badgeTren({ arah: d >= PG.AMBANG_TREN ? 'naik' : (d <= -PG.AMBANG_TREN ? 'turun' : 'stabil'), delta: d }, { pendek: true })}</td><td class="sw-c sw-num">${fmt(t.kelasAkhir)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
    isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Pantau apakah nilaimu naik atau turun dari Tes 1, Tes 2, Tes 3, dan seterusnya.')}${ringkas}
      <div class="sw-card sw-panel"><div class="sw-ph"><h3>Grafik Nilai per Tes ${tAkhir.arah !== 'baru' ? PG.badgeTren(tAkhir) : ''}</h3></div>
        <div class="sw-chips" id="sw-g-chips">${ada.map(chip).join('')}</div><div id="sw-g-grafik"></div>
        ${tes.length < 2 ? '<p class="sw-note"><i class="fa-solid fa-circle-info"></i> Selesaikan tes berikutnya untuk melihat apakah nilaimu naik atau turun.</p>' : ''}
        <div id="sw-g-wawasan">${PG.wawasan(td, {})}</div></div>
      <div class="sw-card sw-panel"><div class="sw-ph"><h3>Rincian Nilai per Tes</h3></div>${tabel}<p class="sw-note">Tren membandingkan dua tes terakhir: naik/turun bila selisihnya sedikitnya ${PG.AMBANG_TREN} poin. Rata-rata kelas dihitung dari nilai tertinggi tiap teman sekelas.</p></div></div>`;
    gambarGrafik();
  }
  function gambarGrafik() {
    const w = $('sw-g-grafik'); if (!w) return;
    const tampil = Object.keys(PS.seri).filter(k => PS.seri[k]);
    PG.pasang(w, (lebar, anim) => PG.grafikTes(PS.td, { lebar, anim, tampil, kelas: true, tinggi: lebar < 480 ? 260 : 340, labelSemua: true, judul: 'Grafik perkembangan nilai per tes' }));
  }
  function toggleSeri(k) {
    const aktif = Object.keys(PS.seri).filter(x => PS.seri[x]);
    if (PS.seri[k] && aktif.length <= 1) return;
    PS.seri[k] = !PS.seri[k];
    document.querySelectorAll('#sw-g-chips .sw-chip').forEach(b => { const on = PS.seri[b.dataset.k]; b.classList.toggle('on', on); b.classList.toggle('off', !on); });
    gambarGrafik();
  }

  // ---------------- RIWAYAT ----------------
  function vRiwayat(isi) {
    const rw = PS.data.riwayat;
    const q = norm(PS.cari);
    const adaJenis = ['semua'].concat(['literasi', 'numerasi', 'lainnya'].filter(j => rw.some(r => jenisR(r) === j)));
    let daftar = rw.filter(r => (PS.jenisRiwayat === 'semua' || jenisR(r) === PS.jenisRiwayat) && (!q || norm(r.judul).indexOf(q) >= 0));
    const chips = adaJenis.map(j => `<button type="button" class="sw-chip${PS.jenisRiwayat === j ? ' on' : ''}" onclick="PortalSiswa.filterRiwayat('${j}')">${j === 'semua' ? 'Semua' : NAMA_JENIS[j]}</button>`).join('');
    const baris = daftar.map(r => {
      const j = jenisR(r), w = WARNA_JENIS[j];
      return `<tr><td data-l="Tanggal"><b>${tglPendek(r.selesai)}</b><br><small style="color:#6c757d">${jamTxt(r.selesai)}</small></td><td data-l="Simulasi"><b>${esc(r.judul)}</b></td><td data-l="Jenis"><span class="sw-tag" style="--c:${w}"><i class="fa-solid ${IKON_JENIS[j]}"></i>${NAMA_JENIS[j]}</span></td><td data-l="Durasi">${durasi(r.mulai, r.selesai)}</td>
        <td data-l="Nilai" style="min-width:110px">${r.nilai == null ? '–' : `<span class="sw-num">${fmt(r.nilai)}</span><span class="sw-nbar" style="margin-top:3px"><i class="${levelNilai(r.nilai)}" style="width:${Math.max(2, bulat(r.nilai))}%"></i></span>`}</td><td data-l="Status">${badgeStatus(r)}</td>
        <td data-l="Aksi" class="sw-c">${r.detail && r.status === 'selesai' ? `<button type="button" class="sw-btn mini" data-id="${esc(r.id)}" onclick="PortalSiswa.detail(this.dataset.id)"><i class="fa-solid fa-magnifying-glass"></i> Detail Jawaban</button>` : '<small style="color:#8a96a5">–</small>'}</td></tr>`;
    }).join('');
    isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Catatan semua simulasi yang pernah kamu kerjakan, termasuk percobaan ulang.')}
      <div class="sw-card sw-panel"><div class="sw-chips" style="align-items:center">${chips}<input type="search" id="sw-cari" value="${esc(PS.cari)}" placeholder="🔍 Cari nama simulasi..." oninput="PortalSiswa.cariRiwayat(this.value)" autocomplete="off" style="margin-left:auto;max-width:240px;padding:.4rem .8rem;border-radius:999px;border:1px solid #d5dbe3;font:500 13px 'Poppins',sans-serif"></div>
      ${daftar.length ? `<div class="sw-wrapt"><table class="sw-t sw-r"><thead><tr><th>Tanggal</th><th>Simulasi</th><th>Jenis</th><th>Durasi</th><th>Nilai</th><th>Status</th><th class="sw-c">Aksi</th></tr></thead><tbody id="sw-r-isi">${baris}</tbody></table></div><p class="sw-note">${daftar.length} catatan. Tombol <b>Detail Jawaban</b> hanya muncul bila guru mengaktifkan pembahasan untuk simulasi tersebut.</p>` : `<div class="sw-kosong"><i class="fa-solid fa-clock-rotate-left"></i>${rw.length ? 'Tidak ada riwayat yang cocok dengan filter ini.' : 'Belum ada riwayat simulasi.'}</div>`}</div></div>`;
  }
  const filterRiwayat = (j) => { PS.jenisRiwayat = j; vRiwayat($('sw-isi')); };
  const cariRiwayat = (v) => { PS.cari = v; const el = $('sw-isi'); vRiwayat(el); const c = $('sw-cari'); if (c) { c.focus(); c.setSelectionRange(v.length, v.length); } };
  async function detail(id) {
    if (typeof ExamEngine === 'undefined') return;
    PS.dariDetail = true; ExamEngine.detailSesiId = id;
    try { await ExamEngine.bukaDetailJawaban(); } catch (e) { }
    const ds = $('detail-screen'); if (ds && ds.classList.contains('hidden')) PS.dariDetail = false;
  }

  // ---------------- LEADERBOARD ----------------
  function vLeaderboard(isi) {
    const lb = PS.data.lb || { tes: [], data: {} };
    if (!lb.tes || !lb.tes.length) { isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Peringkat berdasarkan nilai Literasi dan Numerasi.')}<div class="sw-card sw-kosong"><i class="fa-solid fa-trophy"></i>Leaderboard akan muncul setelah ada siswa yang menyelesaikan tes Literasi atau Numerasi.</div></div>`; return; }
    if (PS.lbTes !== 'semua' && !lb.tes.some(t => t.key === PS.lbTes)) PS.lbTes = 'semua';
    const blok = (lb.data[PS.lbScope] || {})[PS.lbTes] || { total: 0, saya: null, top: [] };
    const chipsTes = [['semua', 'Rata-rata Seluruh Tes']].concat(lb.tes.map(t => [t.key, t.label])).map(([k, t]) => `<button type="button" class="sw-chip${PS.lbTes === k ? ' on' : ''}" data-k="${esc(k)}" onclick="PortalSiswa.lbPilihTes(this.dataset.k)">${esc(t)}</button>`).join('');
    const chipsScope = [['kelas', 'Kelas ' + (lb.kelas || 'Saya')], ['semua', 'Seluruh Sekolah']].map(([k, t]) => `<button type="button" class="sw-chip${PS.lbScope === k ? ' on' : ''}" onclick="PortalSiswa.lbPilihScope('${k}')">${esc(t)}</button>`).join('');
    const me = blok.saya, top = blok.top;
    const persen = me && blok.total ? Math.max(1, Math.ceil(me.rank / blok.total * 100)) : null;
    const kartuSaya = me
      ? `<div class="sw-card sw-me-card"><div class="sw-rank"><div><b>#${me.rank}</b><small>Peringkat</small></div></div><div style="flex:1 1 220px"><h3>Peringkat kamu: ${me.rank} dari ${blok.total} siswa</h3><p>Nilai akhir <b>${fmt(me.akhir)}</b> (Literasi ${fmt(me.lit)}, Numerasi ${fmt(me.num)}). ${persen <= 10 ? 'Luar biasa, kamu masuk 10% teratas! 🎉' : (persen <= 50 ? `Kamu berada di ${persen}% teratas. Terus tingkatkan!` : 'Terus berlatih, peringkatmu bisa naik di tes berikutnya.')}${me.lengkap ? '' : ' <i>(Peringkat sementara: tes Literasi/Numerasi belum lengkap.)</i>'}</p></div></div>`
      : `<div class="sw-card sw-me-card"><div class="sw-rank" style="background:#c3ccd7;box-shadow:none"><div><b>–</b><small>Peringkat</small></div></div><div style="flex:1 1 220px"><h3>Kamu belum punya peringkat di sini</h3><p>Selesaikan tes ini agar namamu masuk papan peringkat.</p></div></div>`;
    const pod = (r, p) => r ? `<div class="sw-pod g${p}${r.saya ? ' saya' : ''}" data-p="${p}"><span class="sw-medal">${p}</span><b class="sw-pn">${esc(r.nama)}${r.saya ? ' (Kamu)' : ''}</b><small>${esc(r.kelas)}</small><strong>${fmt(r.akhir)}</strong><small>Nilai Akhir</small></div>` : '';
    const podium = top.length ? `<div class="sw-podium">${pod(top[1], 2)}${pod(top[0], 1)}${pod(top[2], 3)}</div>` : '';
    const rowLb = (r) => `<tr class="${r.saya ? 'sw-me' : ''}"><td class="sw-c sw-num">${r.rank}</td><td>${esc(r.nama)}${r.saya ? ' <span class="sw-st netral">Kamu</span>' : ''}${r.lengkap ? '' : ' <small style="color:#8a96a5">(belum lengkap)</small>'}</td><td class="sw-c">${esc(r.kelas)}</td><td class="sw-c sw-num">${fmt(r.lit)}</td><td class="sw-c sw-num">${fmt(r.num)}</td><td class="sw-c sw-num">${fmt(r.akhir)}</td></tr>`;
    const tampilSaya = me && !top.some(r => r.saya);
    const tabel = top.length ? `<div class="sw-wrapt"><table class="sw-t"><thead><tr><th class="sw-c">Peringkat</th><th>Nama Siswa</th><th class="sw-c">Kelas</th><th class="sw-c">Literasi</th><th class="sw-c">Numerasi</th><th class="sw-c">Nilai Akhir</th></tr></thead><tbody>${top.map(rowLb).join('')}${tampilSaya ? `<tr><td colspan="6" class="sw-c" style="color:#8a96a5">• • •</td></tr>${rowLb(me)}` : ''}</tbody></table></div>` : `<div class="sw-kosong"><i class="fa-solid fa-trophy"></i>Belum ada data peringkat untuk pilihan ini.</div>`;
    isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Peringkat 10 besar berdasarkan nilai Literasi dan Numerasi.')}
      <div class="sw-card sw-panel"><div class="sw-chips">${chipsScope}</div><div class="sw-chips" style="margin-bottom:0">${chipsTes}</div></div>
      ${kartuSaya}<div class="sw-card sw-panel">${podium}${tabel}<p class="sw-note">Nilai akhir = rata-rata nilai Literasi dan Numerasi (nilai tertinggi bila tes dikerjakan lebih dari sekali). Yang belum mengerjakan keduanya diurutkan setelah yang sudah lengkap. Nilai siswa di luar 10 besar tidak ditampilkan.</p></div></div>`;
  }
  const lbPilihTes = (k) => { PS.lbTes = k; vLeaderboard($('sw-isi')); };
  const lbPilihScope = (k) => { PS.lbScope = k; vLeaderboard($('sw-isi')); };

  // ---------------- ANALISIS MATERI ----------------
  function vAnalisis(isi) {
    isi.innerHTML = `<div class="sw-konten" style="display:grid;gap:1rem">${judulHalaman('Pilih Literasi, Numerasi, Survei Karakter, atau Sulingjar untuk melihat bagian yang masih perlu ditingkatkan. Ketuk satu materi atau dimensi untuk membaca sarannya.')}
      <div class="sw-card sw-panel"><div class="am-menu" id="am-s-menu"></div><div id="am-s-isi"></div></div></div>`;
    AnalisisMateri.renderSiswa();
  }

  // ---------------- navigasi ----------------
  function buka(v, arg) {
    if (typeof state === 'undefined' || !state.user || state.user.role !== 'siswa') return;
    if (!MENU.some(m => m[0] === v)) v = 'dashboard';
    PS.view = v;
    if (v === 'analisis') AnalisisMateri.resetJenis(arg);
    UI.tampilkan('sw-screen');
    renderKerangka();
    renderView();
    muat(false);
  }
  function segarkan() { muat(true); }
  function mulaiSimulasi() { if (_konfirmasi) _konfirmasi(); }
  function toggleMenuUser(ev) { if (typeof Anbk !== 'undefined') Anbk.menuUser(ev); }

  // ---------------- pemasangan ke aplikasi ----------------
  const _tampil = UI.tampilkan;
  UI.tampilkan = function (id) {
    _tampil.call(UI, id);
    const el = $('sw-screen'); if (el) el.classList.toggle('hidden', id !== 'sw-screen');
  };
  const _konfirmasi = (typeof Anbk !== 'undefined') ? Anbk.tampilKonfirmasiData : null;
  // setelah login (dan saat kembali ke beranda) siswa mendarat di Dashboard
  if (typeof Anbk !== 'undefined') Anbk.tampilKonfirmasiData = function () { PortalSiswa.buka('dashboard'); };
  UI.kembaliKeBerandaSiswa = function () { PS.waktu = 0; PortalSiswa.buka('dashboard'); };
  // tombol "Kembali" pada Detail Jawaban: balik ke Riwayat bila dibuka dari portal
  if (typeof ExamEngine !== 'undefined') {
    const _tutup = ExamEngine.tutupDetailJawaban;
    ExamEngine.tutupDetailJawaban = function () { if (PS.dariDetail) { PS.dariDetail = false; PortalSiswa.buka('riwayat'); } else _tutup.call(ExamEngine); };
  }
  // pintu masuk tambahan di layar konfirmasi peserta (menu pengguna & layar hasil)
  function pasangPintuMasuk() {
    ['siswa-portal', 'tes-konfirmasi-screen'].forEach(id => {
      const m = document.querySelector('#' + id + ' .anbk-usermenu'); if (!m || m.querySelector('[data-aksi="sw"]')) return;
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-aksi', 'sw'); b.setAttribute('onclick', "PortalSiswa.buka('dashboard')");
      b.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Dashboard Saya';
      m.insertBefore(b, m.firstChild);
    });
    const beranda = [...document.querySelectorAll('#hasil-screen .hasil-btn-beranda')].pop();
    if (beranda && !$('btn-dashboard-saya')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-dashboard-saya'; b.className = 'secondary hasil-btn-beranda'; b.style.marginBottom = '.6rem';
      b.innerHTML = '<i class="fa-solid fa-chart-line"></i> Lihat Perkembangan &amp; Analisis Materi';
      b.setAttribute('onclick', "PortalSiswa.bukaSegar('grafik')");
      beranda.parentNode.insertBefore(b, beranda);
    }
  }
  function bukaSegar(v) { PS.waktu = 0; buka(v); }
  pasangPintuMasuk();

  return { buka, bukaSegar, segarkan, mulaiSimulasi, toggleSeri, filterRiwayat, cariRiwayat, detail, lbPilihTes, lbPilihScope, toggleMenuUser, _PS: PS };
})();
