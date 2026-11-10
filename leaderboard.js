/* ============================================================================
   LEADERBOARD — peringkat siswa berdasarkan nilai LITERASI + NUMERASI (Portal Guru).
   - Peringkat per "Tes 1", "Tes 2", ... atau RATA-RATA SELURUH TES.
   - Per kelas atau seluruh kelas (di mode seluruh kelas ada kolom Peringkat Kelas).
   - Kolom: Peringkat | Nama Siswa | Kelas | Literasi | Numerasi | Nilai Akhir | Kategori.
     Nilai Akhir = rata-rata Literasi & Numerasi. Siswa yang baru mengerjakan salah satu
     ditaruh di bawah siswa yang sudah lengkap (diberi tanda "Belum lengkap").
   - Podium Top 3, kartu ringkasan, unduh Excel (1 sheet gabungan + 1 sheet per kelas), cetak PDF.
   - Tidak butuh perubahan Code.gs: memakai aksi yang sudah ada (getDaftarUjian, getRekapNilai).

   CARA MENGELOMPOKKAN UJIAN (otomatis): ujian dengan kata "Literasi" / "Numerasi" di judul
   (atau kategori) dianggap tes Literasi / Numerasi. Judul setelah kata itu dibuang, sisanya
   jadi nama tes: "Tes 1 - Literasi" + "Tes 1 - Numerasi" => "Tes 1". Bila penamaan ujian
   berbeda, atur manual lewat tombol "Atur Tes" (tersimpan di browser ini).
   Dimuat SETELAH app.js, anbk.js, dan survei.js.
   ============================================================================ */
'use strict';
const Leaderboard = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const r2 = (n) => Math.round(Number(n) * 100) / 100;
  const fmt = (n) => (n == null || isNaN(n)) ? '–' : r2(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const inisial = (nama) => String(nama || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';
  const rata = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const KEY_ATUR = 'cbt_leaderboard_atur_v1';

  // Gaya disisipkan dari sini (bukan file .css terpisah) supaya tetap tampil walau berkas CSS tidak ikut terunggah.
  (function () {
    if (document.getElementById('leaderboard-css-inline')) return;
    const st = document.createElement('style'); st.id = 'leaderboard-css-inline';
    st.textContent = `
#guru-portal .lb-root .lb-hero { position: relative; overflow: hidden; border-radius: var(--radius-lg, 20px); padding: 22px 26px; margin: 0 0 1rem; color: var(--c-on-primary, #fff); background: linear-gradient(118deg, var(--c-primary-dark, #1f4e79), var(--c-primary, #2f6fb3)); box-shadow: var(--shadow); }
#guru-portal .lb-root .lb-hero::after { content: ''; position: absolute; right: -40px; top: -60px; width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,.09); }
#guru-portal .lb-root .lb-hero-ico { position: absolute; right: 26px; bottom: -22px; font-size: 118px; opacity: .16; z-index: 0; }
#guru-portal .lb-root .lb-hero > * { position: relative; z-index: 1; }
#guru-portal .lb-root .lb-eyebrow { font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .85; margin: 0 0 .15rem; }
#guru-portal .lb-root .lb-hero h3 { margin: 0; font-size: 1.45rem; line-height: 1.25; color: inherit; }
#guru-portal .lb-root .lb-hero p.lb-sub { margin: .3rem 0 0; font-size: .88rem; opacity: .92; }
#guru-portal .lb-root .lb-filter-label { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--c-muted); margin: .35rem 0 .35rem; }
#guru-portal .lb-root .lb-chips { display: flex; flex-wrap: wrap; gap: .4rem; margin: 0 0 .7rem; }
#guru-portal .lb-root button.lb-chip { background: var(--c-surface); color: var(--c-text); border: 1px solid var(--c-line); padding: .4rem .95rem; border-radius: 999px; font-size: .8rem; font-weight: 600; box-shadow: none; filter: none; transform: none; }
#guru-portal .lb-root button.lb-chip:hover { background: var(--c-hover); border-color: var(--c-primary); filter: none; transform: none; box-shadow: none; }
#guru-portal .lb-root button.lb-chip.on, #guru-portal .lb-root button.lb-chip.on:hover { background: var(--c-primary); border-color: var(--c-primary); color: var(--c-on-primary, #fff); }
#guru-portal .lb-root .lb-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: .7rem; margin: 0 0 1rem; }
#guru-portal .lb-root .lb-stat { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 14px; padding: .75rem .95rem; box-shadow: var(--shadow); }
#guru-portal .lb-root .lb-stat b { display: block; font-size: 1.4rem; line-height: 1.2; color: var(--c-text); }
#guru-portal .lb-root .lb-stat span { font-size: .72rem; font-weight: 600; letter-spacing: .03em; color: var(--c-muted); }
#guru-portal .lb-root .lb-podium { display: flex; justify-content: center; align-items: flex-end; gap: .9rem; margin: 0 0 1.1rem; }
#guru-portal .lb-root .lb-pod { flex: 1 1 0; max-width: 300px; min-width: 0; text-align: center; border-radius: 18px; padding: 1.05rem .8rem .9rem; color: #2b2410; box-shadow: var(--shadow); position: relative; }
#guru-portal .lb-root .lb-pod[data-p="1"] { padding-top: 1.5rem; padding-bottom: 1.2rem; }
#guru-portal .lb-root .lb-pod.g1 { background: linear-gradient(160deg, #fff1b8, #f4c542 70%, #e8a900); }
#guru-portal .lb-root .lb-pod.g2 { background: linear-gradient(160deg, #f4f6f9, #cfd6df 70%, #aab4c2); color: #1f2733; }
#guru-portal .lb-root .lb-pod.g3 { background: linear-gradient(160deg, #fbe3cd, #e3a672 70%, #c47c43); color: #2f1d0e; }
#guru-portal .lb-root .lb-pod-medal { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.18); font-size: 15px; }
#guru-portal .lb-root .g1 .lb-pod-medal { color: #d99a00; } #guru-portal .lb-root .g2 .lb-pod-medal { color: #7d8999; } #guru-portal .lb-root .g3 .lb-pod-medal { color: #b9723a; }
#guru-portal .lb-root .lb-pod-av { width: 52px; height: 52px; margin: .35rem auto .45rem; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 1.05rem; background: rgba(255,255,255,.62); border: 2px solid rgba(255,255,255,.9); }
#guru-portal .lb-root .lb-pod[data-p="1"] .lb-pod-av { width: 62px; height: 62px; font-size: 1.25rem; }
#guru-portal .lb-root .lb-pod-nama { font-weight: 800; font-size: .95rem; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 2.4em; }
#guru-portal .lb-root .lb-pod-kelas { display: inline-block; margin: .3rem 0 .15rem; padding: .08rem .6rem; border-radius: 999px; background: rgba(255,255,255,.55); font-size: .72rem; font-weight: 700; }
#guru-portal .lb-root .lb-pod-nilai { font-size: 2rem; font-weight: 800; line-height: 1.1; }
#guru-portal .lb-root .lb-pod[data-p="1"] .lb-pod-nilai { font-size: 2.35rem; }
#guru-portal .lb-root .lb-pod-nilai small { display: block; font-size: .64rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .75; }
#guru-portal .lb-root .lb-pod-mini { display: flex; gap: .4rem; margin-top: .55rem; }
#guru-portal .lb-root .lb-pod-mini span { flex: 1; background: rgba(255,255,255,.5); border-radius: 10px; padding: .25rem .2rem; font-size: .68rem; font-weight: 600; line-height: 1.25; }
#guru-portal .lb-root .lb-pod-mini b { display: block; font-size: .95rem; }
#guru-portal .lb-root .lb-scroll { overflow: auto; max-height: 72vh; border: 1px solid var(--c-line); border-radius: 14px; }
#guru-portal .lb-root table.lb-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .87rem; }
#guru-portal .lb-root table.lb-table th { position: sticky; top: 0; z-index: 2; background: var(--c-surface); text-align: left; padding: .6rem .5rem; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; color: var(--c-muted); border-bottom: 2px solid var(--c-line); white-space: nowrap; }
#guru-portal .lb-root table.lb-table th small { display: block; text-transform: none; letter-spacing: 0; font-weight: 500; }
#guru-portal .lb-root table.lb-table td { padding: .5rem .5rem; border-bottom: 1px solid var(--c-line); vertical-align: middle; }
#guru-portal .lb-root table.lb-table tbody tr:last-child td { border-bottom: 0; }
#guru-portal .lb-root table.lb-table tbody tr:hover td { background: var(--c-hover); }
#guru-portal .lb-root .lb-c { text-align: center !important; }
#guru-portal .lb-root tr.lb-r1 td { background: color-mix(in srgb, #f4c542 17%, var(--c-surface)); }
#guru-portal .lb-root tr.lb-r2 td { background: color-mix(in srgb, #aab4c2 17%, var(--c-surface)); }
#guru-portal .lb-root tr.lb-r3 td { background: color-mix(in srgb, #d98f55 15%, var(--c-surface)); }
#guru-portal .lb-root tr.lb-belum td { color: var(--c-muted); }
#guru-portal .lb-root .lb-rk { display: inline-grid; place-items: center; min-width: 30px; height: 30px; padding: 0 .3rem; border-radius: 999px; font-weight: 800; font-size: .85rem; color: var(--c-text); background: var(--c-hover); border: 1px solid var(--c-line); }
#guru-portal .lb-root .lb-rk.k1 { background: linear-gradient(145deg, #ffe58a, #f0b400); border-color: #e0a500; color: #4a3600; }
#guru-portal .lb-root .lb-rk.k2 { background: linear-gradient(145deg, #f5f7fa, #bfc8d4); border-color: #a9b4c3; color: #2b3542; }
#guru-portal .lb-root .lb-rk.k3 { background: linear-gradient(145deg, #f6d3b4, #cf8b4f); border-color: #bd7a3f; color: #3a2210; }
#guru-portal .lb-root .lb-nama { font-weight: 700; color: var(--c-text); min-width: 150px; }
#guru-portal .lb-root .lb-ang { font-weight: 700; font-variant-numeric: tabular-nums; }
#guru-portal .lb-root .lb-akhir { font-weight: 800; font-size: 1rem; font-variant-numeric: tabular-nums; color: var(--c-text); }
#guru-portal .lb-root .lb-kosong { color: var(--c-muted); }
#guru-portal .lb-root .lb-bar { display: block; width: 100%; min-width: 56px; height: 5px; margin-top: 4px; border-radius: 99px; background: var(--c-line); overflow: hidden; }
#guru-portal .lb-root .lb-bar i { display: block; height: 100%; border-radius: 99px; }
#guru-portal .lb-root .lb-kosongan { text-align: center; padding: 1.6rem 1rem; color: var(--c-muted); }
#guru-portal .lb-root .lb-kosongan i { font-size: 2.2rem; display: block; margin-bottom: .5rem; opacity: .5; }
#modal-lb-atur table.lb-atur { width: 100%; border-collapse: collapse; font-size: .85rem; }
#modal-lb-atur table.lb-atur th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--c-muted); padding: .4rem .5rem; border-bottom: 2px solid var(--c-line); }
#modal-lb-atur table.lb-atur td { padding: .45rem .5rem; border-bottom: 1px solid var(--c-line); vertical-align: middle; }
#modal-lb-atur table.lb-atur select { padding: .4rem .5rem; font-size: .82rem; }
#modal-lb-atur .lb-atur-scroll { max-height: 52vh; overflow: auto; margin: .6rem 0; }
@media (max-width: 680px) {
  #guru-portal .lb-root .lb-podium { flex-direction: column; align-items: stretch; gap: 1.1rem; padding-top: .5rem; }
  #guru-portal .lb-root .lb-pod { max-width: none; }
  #guru-portal .lb-root .lb-pod[data-p="1"] { order: 1; } #guru-portal .lb-root .lb-pod[data-p="2"] { order: 2; } #guru-portal .lb-root .lb-pod[data-p="3"] { order: 3; }
  #guru-portal .lb-root .lb-hero { padding: 18px 18px; } #guru-portal .lb-root .lb-hero h3 { font-size: 1.2rem; }
}
@media print {
  #cetak-area table.lb-print { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  #cetak-area table.lb-print th { padding: 3px 5px; background: #e9edf2 !important; border: 1px solid #9aa1ab; font-size: 9pt; text-align: left; }
  #cetak-area table.lb-print td { padding: 2px 5px; border: 1px solid #c9ced6; }
  #cetak-area table.lb-print thead { display: table-header-group; }
  #cetak-area table.lb-print tr { break-inside: avoid; }
  #cetak-area table.lb-print .lb-n { text-align: center; }
  #cetak-area table.lb-print tr.lb-top td { font-weight: 700; background: #fff6d6 !important; }
  #cetak-area table.lb-print tr.lb-belum td { color: #666; }
  #cetak-area .lb-catatan { margin: 6px 0 0; font-size: 8.5pt; color: #444; }
}`;
    document.head.appendChild(st);
  })();

  const S = { guruId: null, ujian: [], rekap: {}, tes: 'semua', kelas: '', dimuat: false, memuat: false, waktu: 0, hasil: null };

  // ---------------- pengaturan manual (tersimpan di browser ini) ----------------
  const kunciSimpan = () => KEY_ATUR + ':' + ((typeof state !== 'undefined' && state.user && state.user.id) || '');
  function bacaAtur() { try { return JSON.parse(localStorage.getItem(kunciSimpan()) || '{}') || {}; } catch (e) { return {}; } }
  function tulisAtur(o) { try { localStorage.setItem(kunciSimpan(), JSON.stringify(o)); return true; } catch (e) { return false; } }

  // ---------------- pengelompokan ujian -> Tes 1, Tes 2, ... ----------------
  function jenisDari(teks) {
    const t = norm(teks), a = t.indexOf('literasi'), b = t.indexOf('numerasi');
    if (a < 0 && b < 0) return '';
    if (a >= 0 && b >= 0) return a < b ? 'literasi' : 'numerasi';
    return a >= 0 ? 'literasi' : 'numerasi';
  }
  const jenisOtomatis = (u) => jenisDari(u.judul) || jenisDari(u.kategori);
  function labelBersih(judul) {
    let t = String(judul || '').replace(/literasi|numerasi/gi, ' ');
    t = t.replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+/g, ' ').trim();
    return t.replace(/^[\s\-–—:|\/,_.]+|[\s\-–—:|\/,_.]+$/g, '').trim();
  }
  function kelompok() {
    const atur = bacaAtur();
    const peta = new Map();
    S.ujian.forEach(u => {
      const ov = atur[u.id] || {};
      if (ov.jenis === 'abaikan') return;
      const jenis = ov.jenis || jenisOtomatis(u);
      if (!jenis) return;
      let key, label;
      if (ov.tes) { key = 'n:' + ov.tes; label = 'Tes ' + ov.tes; }
      else { label = labelBersih(u.judul) || 'Tes'; key = 'a:' + norm(label); }
      let t = peta.get(key);
      if (!t) { t = { key, label, literasi: [], numerasi: [] }; peta.set(key, t); }
      t[jenis].push(u.id);
    });
    const tesList = [...peta.values()].sort((a, b) => a.label.localeCompare(b.label, 'id', { numeric: true }));
    return { tesList };
  }

  // ---------------- memuat data ----------------
  async function muat(tombol) {
    if (S.memuat) return false;
    if (typeof state === 'undefined' || !state.user) return false;
    S.memuat = true;
    const btn = (tombol && tombol.classList) ? tombol : $('lb-btn-segarkan');
    if (btn) { btn.classList.add('sedang'); btn.setAttribute('aria-busy', 'true'); }
    if (!S.dimuat) { const c = $('lb-tabel'); if (c) c.innerHTML = '<p class="subtitle">Memuat peringkat...</p>'; }
    let ok = true;
    try {
      if (S.guruId !== state.user.id) { S.guruId = state.user.id; S.rekap = {}; S.ujian = []; S.dimuat = false; S.tes = 'semua'; S.kelas = ''; }
      const dl = await api('getDaftarUjian', { guruId: state.user.id });
      if (!dl || !dl.ok) throw new Error((dl && dl.error) || 'Gagal memuat daftar ujian.');
      S.ujian = dl.data || [];
      const g = kelompok();
      const ids = [...new Set(g.tesList.reduce((a, t) => a.concat(t.literasi, t.numerasi), []))];
      const baru = {};
      let gagal = 0, i = 0;
      const kerja = async () => {
        while (i < ids.length) {
          const id = ids[i++]; let r = null;
          try { r = await api('getRekapNilai', { ujianId: id }); } catch (e) { r = null; }
          if (r && r.ok) baru[id] = r.data || [];
          else { gagal++; if (S.rekap[id]) baru[id] = S.rekap[id]; }
        }
      };
      await Promise.all([kerja(), kerja(), kerja(), kerja()]);
      S.rekap = baru; S.dimuat = true; S.waktu = Date.now();
      if (gagal) { ok = false; toast(gagal + ' ujian gagal dimuat; data sebelumnya (jika ada) tetap dipakai.', 'error'); }
    } catch (e) {
      ok = false;
      if (!S.dimuat) { const c = $('lb-tabel'); if (c) c.textContent = (e && e.message) || 'Gagal memuat Leaderboard.'; }
      else toast('Gagal memperbarui Leaderboard. Data sebelumnya tetap ditampilkan.', 'error');
    } finally {
      S.memuat = false;
      if (btn) { btn.classList.remove('sedang'); btn.removeAttribute('aria-busy'); }
    }
    if (S.dimuat) render();
    try { Guru.tandaiDiperbarui_('tab-leaderboard', !ok); } catch (e) { }
    return ok;
  }

  // ---------------- penghitungan peringkat ----------------
  function urutkan(arr) {
    arr.sort((a, b) => (Number(b.lengkap) - Number(a.lengkap)) || (r2(b.akhir) - r2(a.akhir)) || String(a.nama).localeCompare(String(b.nama), 'id'));
    let prev = null;
    arr.forEach((x, i) => {
      x.rank = (prev && prev.lengkap === x.lengkap && r2(prev.akhir) === r2(x.akhir)) ? prev.rank : i + 1;
      prev = x;
    });
    return arr;
  }
  function peringkatKelas(arr) {
    const per = {};
    arr.forEach(x => {
      const k = norm(x.kelas) || '-';
      const c = per[k] = per[k] || { n: 0, prev: null };
      c.n++;
      x.rankKelas = (c.prev && c.prev.lengkap === x.lengkap && r2(c.prev.akhir) === r2(x.akhir)) ? c.prev.rankKelas : c.n;
      c.prev = x;
    });
  }

  function hitung(g) {
    const peta = {};
    g.tesList.forEach(t => {
      t.literasi.forEach(id => { peta[id] = { tes: t.key, jenis: 'literasi' }; });
      t.numerasi.forEach(id => { peta[id] = { tes: t.key, jenis: 'numerasi' }; });
    });
    const dgBlokir = !!($('lb-blokir') && $('lb-blokir').checked);
    const sw = new Map();
    Object.keys(S.rekap).forEach(id => {
      const m = peta[id]; if (!m) return;
      (S.rekap[id] || []).forEach(r => {
        if (!dgBlokir && r.status === 'diblokir') return;
        if (r.nilai === '' || r.nilai == null) return;
        const n = Number(r.nilai); if (isNaN(n)) return;
        const k = r.siswaId ? 'id:' + r.siswaId : 'nm:' + norm(r.nama) + '|' + norm(r.kelas);
        let s = sw.get(k);
        if (!s) { s = { id: k, nama: r.nama || '(tanpa nama)', kelas: r.kelas || '-', skor: {} }; sw.set(k, s); }
        const slot = (s.skor[m.tes] = s.skor[m.tes] || {});
        if (slot[m.jenis] == null || n > slot[m.jenis]) slot[m.jenis] = n; // bila ada beberapa percobaan, ambil yang tertinggi
      });
    });
    const semuaMode = S.tes === 'semua';
    const kunciTes = g.tesList.map(t => t.key);
    let daftar = [];
    sw.forEach(s => {
      let lit = null, num = null, jml = 0;
      if (semuaMode) {
        const L = [], N = [];
        kunciTes.forEach(k => {
          const x = s.skor[k]; if (!x) return;
          let ada = false;
          if (x.literasi != null) { L.push(x.literasi); ada = true; }
          if (x.numerasi != null) { N.push(x.numerasi); ada = true; }
          if (ada) jml++;
        });
        lit = rata(L); num = rata(N);
      } else {
        const x = s.skor[S.tes] || {};
        lit = x.literasi != null ? x.literasi : null; num = x.numerasi != null ? x.numerasi : null;
        jml = (lit != null || num != null) ? 1 : 0;
      }
      if (lit == null && num == null) return;
      const lengkap = lit != null && num != null;
      daftar.push({ id: s.id, nama: s.nama, kelas: s.kelas, lit, num, lengkap, akhir: lengkap ? (lit + num) / 2 : (lit != null ? lit : num), jml, skor: s.skor });
    });
    const kelasList = kelasUnikDari_(daftar);
    if (S.kelas && !kelasList.includes(S.kelas)) S.kelas = '';
    if (S.kelas) daftar = daftar.filter(x => String(x.kelas || '').trim() === S.kelas);
    if ($('lb-lengkap') && $('lb-lengkap').checked) daftar = daftar.filter(x => x.lengkap);
    urutkan(daftar);
    if (!S.kelas) peringkatKelas(daftar);
    const nLengkap = daftar.filter(x => x.lengkap).length;
    const lits = daftar.filter(x => x.lit != null).map(x => x.lit), nums = daftar.filter(x => x.num != null).map(x => x.num);
    const labelTes = semuaMode ? 'Rata-rata Seluruh Tes' : ((g.tesList.find(t => t.key === S.tes) || {}).label || 'Tes');
    return {
      g, rows: daftar, kelasList, nLengkap, labelTes, semuaMode,
      tertinggi: daftar.length ? Math.max(...daftar.map(x => x.akhir)) : null,
      rataAkhir: rata(daftar.map(x => x.akhir)), rataLit: rata(lits), rataNum: rata(nums)
    };
  }

  // ---------------- tampilan ----------------
  function pilihTes(i) { S.tes = (i === 'semua') ? 'semua' : ((kelompok().tesList[i] || {}).key || 'semua'); render(); }
  function pilihKelas(i) { S.kelas = (i < 0) ? '' : ((S.hasil && S.hasil.kelasList[i]) || ''); render(); }

  function htmlBar(n) {
    if (n == null) return '';
    const p = Math.max(0, Math.min(100, n));
    return `<span class="lb-bar"><i style="width:${p}%;background:${kategoriNilai_(n).warna}"></i></span>`;
  }
  const kelasRk = (r) => r <= 1 ? 'k1' : (r === 2 ? 'k2' : (r === 3 ? 'k3' : ''));

  function htmlPodium(rows) {
    const top = rows.slice(0, 3);
    if (!top.length) return '';
    const urutTampil = top.length === 3 ? [top[1], top[0], top[2]] : (top.length === 2 ? [top[1], top[0]] : [top[0]]);
    const kartu = urutTampil.map(r => {
      const p = top.indexOf(r) + 1;
      const g = r.rank <= 1 ? 'g1' : (r.rank === 2 ? 'g2' : 'g3');
      const ikon = r.rank <= 1 ? 'fa-crown' : 'fa-medal';
      return `<div class="lb-pod ${g}" data-p="${p}">
        <div class="lb-pod-medal"><i class="fa-solid ${ikon}"></i></div>
        <div class="lb-pod-av">${esc(inisial(r.nama))}</div>
        <div class="lb-pod-nama" title="${esc(r.nama)}">${esc(r.nama)}</div>
        <span class="lb-pod-kelas">Peringkat ${r.rank} • ${esc(r.kelas)}</span>
        <div class="lb-pod-nilai">${fmt(r.akhir)}<small>Nilai Akhir</small></div>
        <div class="lb-pod-mini"><span>Literasi<b>${fmt(r.lit)}</b></span><span>Numerasi<b>${fmt(r.num)}</b></span></div>
      </div>`;
    }).join('');
    return `<div class="lb-podium">${kartu}</div>`;
  }

  function htmlTabel(h, rows) {
    const semuaKelas = !S.kelas, tampilBelum = h.nLengkap > 0;
    const sel = (n) => n == null ? '<span class="lb-kosong">–</span>' : `<span class="lb-ang">${fmt(n)}</span>${htmlBar(n)}`;
    const ketLit = h.semuaMode ? '<small>rata-rata tes</small>' : '';
    const kepala = `<tr><th class="lb-c" style="width:64px">Rank</th><th>Nama Siswa</th><th>Kelas</th><th style="min-width:84px">Literasi${ketLit}</th><th style="min-width:84px">Numerasi${ketLit}</th><th style="min-width:88px">Nilai Akhir<small>rata-rata</small></th><th>Kategori</th>${semuaKelas ? '<th class="lb-c" title="Peringkat di dalam kelasnya">Rank Kelas</th>' : ''}${h.semuaMode ? '<th class="lb-c" title="Jumlah tes yang diikuti">Jml Tes</th>' : ''}</tr>`;
    const baris = rows.map(r => {
      const belum = tampilBelum && !r.lengkap;
      const cls = (r.rank <= 3 ? 'lb-r' + r.rank : '') + (belum ? ' lb-belum' : '');
      return `<tr class="${cls.trim()}">
        <td class="lb-c"><span class="lb-rk ${kelasRk(r.rank)}">${r.rank}</span></td>
        <td class="lb-nama">${esc(r.nama)}</td>
        <td>${esc(r.kelas)}</td>
        <td>${sel(r.lit)}</td><td>${sel(r.num)}</td>
        <td><span class="lb-akhir">${fmt(r.akhir)}</span>${belum ? '' : htmlBar(r.akhir)}</td>
        <td>${belum ? '<span class="badge warn" title="Belum mengerjakan salah satu tes (Literasi atau Numerasi)">Belum lengkap</span>' : badgeKategori_(r.akhir)}</td>
        ${semuaKelas ? `<td class="lb-c">${r.rankKelas || '–'}</td>` : ''}
        ${h.semuaMode ? `<td class="lb-c">${r.jml}</td>` : ''}
      </tr>`;
    }).join('');
    return `<div class="lb-scroll"><table class="lb-table"><thead>${kepala}</thead><tbody>${baris}</tbody></table></div>`;
  }

  function render() {
    const hero = $('lb-hero'), stats = $('lb-stats'), pod = $('lb-podium'), tab = $('lb-tabel');
    if (!tab) return;
    const g = kelompok();
    if (S.tes !== 'semua' && !g.tesList.some(t => t.key === S.tes)) S.tes = 'semua';
    const chipsTes = $('lb-chips-tes'), chipsKelas = $('lb-chips-kelas');

    if (!g.tesList.length) {
      S.hasil = null;
      chipsTes.innerHTML = ''; chipsKelas.innerHTML = '';
      hero.innerHTML = ''; stats.innerHTML = ''; pod.innerHTML = '';
      tab.innerHTML = `<div class="lb-kosongan"><i class="fa-solid fa-trophy"></i><strong>Belum ada ujian Literasi / Numerasi yang terdeteksi.</strong><br>Beri judul ujian yang memuat kata <em>Literasi</em> atau <em>Numerasi</em> (mis. <em>Tes 1 – Literasi</em> dan <em>Tes 1 – Numerasi</em>), atau klik <strong>Atur Tes</strong> untuk mengelompokkan ujian secara manual.</div>`;
      $('lb-info-filter').textContent = '';
      return;
    }

    const h = S.hasil = hitung(g);
    chipsTes.innerHTML = g.tesList.map((t, i) => `<button type="button" class="lb-chip${S.tes === t.key ? ' on' : ''}" onclick="Leaderboard.pilihTes(${i})">${esc(t.label)}</button>`).join('') +
      `<button type="button" class="lb-chip${S.tes === 'semua' ? ' on' : ''}" onclick="Leaderboard.pilihTes('semua')"><i class="fa-solid fa-chart-line"></i> Rata-rata Seluruh Tes</button>`;
    chipsKelas.innerHTML = `<button type="button" class="lb-chip${!S.kelas ? ' on' : ''}" onclick="Leaderboard.pilihKelas(-1)">Semua Kelas</button>` +
      h.kelasList.map((k, i) => `<button type="button" class="lb-chip${S.kelas === k ? ' on' : ''}" onclick="Leaderboard.pilihKelas(${i})">${esc(k)}</button>`).join('');

    const waktu = S.waktu ? new Date(S.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    hero.innerHTML = `<div class="lb-hero"><i class="fa-solid fa-trophy lb-hero-ico"></i>
      <p class="lb-eyebrow">Leaderboard Literasi &amp; Numerasi</p>
      <h3>${esc(h.labelTes)}</h3>
      <p class="lb-sub">${S.kelas ? 'Kelas ' + esc(S.kelas) : 'Seluruh kelas'} • ${h.rows.length} siswa • ${g.tesList.length} tes terdeteksi${waktu ? ' • data per ' + waktu : ''}</p></div>`;

    if (!h.rows.length) {
      stats.innerHTML = ''; pod.innerHTML = '';
      tab.innerHTML = `<div class="lb-kosongan"><i class="fa-solid fa-users-slash"></i>Belum ada siswa yang menyelesaikan tes ini${S.kelas ? ' di kelas ' + esc(S.kelas) : ''}.</div>`;
      $('lb-info-filter').textContent = '';
      return;
    }

    stats.innerHTML = `<div class="lb-stats">
      <div class="lb-stat"><b>${h.rows.length}</b><span>Siswa di peringkat</span></div>
      <div class="lb-stat"><b>${h.nLengkap}</b><span>Sudah lengkap (L + N)</span></div>
      <div class="lb-stat"><b>${fmt(h.tertinggi)}</b><span>Nilai akhir tertinggi</span></div>
      <div class="lb-stat"><b>${fmt(h.rataAkhir)}</b><span>Rata-rata nilai akhir</span></div>
      <div class="lb-stat"><b>${fmt(h.rataLit)}</b><span>Rata-rata Literasi</span></div>
      <div class="lb-stat"><b>${fmt(h.rataNum)}</b><span>Rata-rata Numerasi</span></div></div>`;

    const q = norm($('lb-cari') ? $('lb-cari').value : '');
    const tampil = q ? h.rows.filter(r => norm(r.nama + ' ' + r.kelas).includes(q)) : h.rows;
    pod.innerHTML = q ? '' : htmlPodium(h.rows);
    $('lb-info-filter').textContent = q ? `Menampilkan ${tampil.length} dari ${h.rows.length} siswa` : '';
    tab.innerHTML = tampil.length ? htmlTabel(h, tampil) : '<p class="subtitle">Tidak ada siswa yang cocok dengan pencarian.</p>';
  }

  // ---------------- unduh Excel ----------------
  async function unduh() {
    const h = S.hasil;
    if (!h || !h.rows.length) { toast('Belum ada data Leaderboard untuk diunduh.', 'error'); return; }
    try { await muatPustaka_('xlsx'); } catch (e) { toast(e.message, 'error'); return; }
    const tesList = h.g.tesList;
    const bersih = (t) => String(t).replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 50);
    const buat = (rows, denganRankKelas) => {
      const head = ['Peringkat', 'Nama Siswa', 'Kelas', 'Nilai Literasi', 'Nilai Numerasi', 'Nilai Akhir', 'Kategori', 'Keterangan'];
      if (denganRankKelas) head.push('Peringkat Kelas');
      if (h.semuaMode) { head.push('Tes Diikuti'); tesList.forEach(t => head.push(t.label + ' - Literasi', t.label + ' - Numerasi')); }
      const nilai = (n) => n == null ? '' : r2(n);
      const data = rows.map(r => {
        const baris = [r.rank, r.nama, r.kelas, nilai(r.lit), nilai(r.num), r2(r.akhir), h.nLengkap && !r.lengkap ? '-' : labelKategori_(r.akhir), r.lengkap ? 'Lengkap' : 'Belum lengkap'];
        if (denganRankKelas) baris.push(r.rankKelas || '');
        if (h.semuaMode) { baris.push(r.jml); tesList.forEach(t => { const x = r.skor[t.key] || {}; baris.push(nilai(x.literasi), nilai(x.numerasi)); }); }
        return baris;
      });
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws['!cols'] = [10, 32, 10, 14, 14, 12, 12, 15].concat(denganRankKelas ? [15] : [], h.semuaMode ? [12].concat(tesList.flatMap(() => [16, 16])) : []).map(w => ({ wch: w }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(data.length, 1), c: head.length - 1 } }) };
      return ws;
    };
    const wb = XLSX.utils.book_new(), terpakai = new Set();
    XLSX.utils.book_append_sheet(wb, buat(h.rows, !S.kelas), namaSheetUnik_(S.kelas ? 'Kelas ' + S.kelas : 'Seluruh Kelas', terpakai));
    if (!S.kelas) {
      h.kelasList.forEach(k => {
        const sub = h.rows.filter(r => String(r.kelas || '').trim() === k).map(r => Object.assign({}, r));
        if (!sub.length) return;
        urutkan(sub);
        XLSX.utils.book_append_sheet(wb, buat(sub, false), namaSheetUnik_('Kelas ' + k, terpakai));
      });
    }
    XLSX.writeFile(wb, 'leaderboard-' + bersih(h.labelTes) + '-' + (S.kelas ? bersih(S.kelas) : 'semua-kelas') + '.xlsx');
    toast('Leaderboard ' + h.rows.length + ' siswa berhasil diunduh.', 'success');
  }

  // ---------------- cetak / PDF ----------------
  function cetak() {
    const h = S.hasil;
    if (!h || !h.rows.length) { toast('Belum ada data Leaderboard untuk dicetak.', 'error'); return; }
    const { namaSekolah, kop } = Guru._identitasSekolah_();
    const tampilBelum = h.nLengkap > 0;
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const baris = h.rows.map(r => {
      const belum = tampilBelum && !r.lengkap;
      return `<tr class="${r.rank <= 3 ? 'lb-top' : ''}${belum ? ' lb-belum' : ''}"><td class="lb-n">${r.rank}</td><td>${esc(r.nama)}</td><td class="lb-n">${esc(r.kelas)}</td><td class="lb-n">${fmt(r.lit)}</td><td class="lb-n">${fmt(r.num)}</td><td class="lb-n"><strong>${fmt(r.akhir)}</strong></td><td class="lb-n">${belum ? 'Belum lengkap' : labelKategori_(r.akhir)}</td></tr>`;
    }).join('');
    const html = `${kop}
      <h2 class="cp-judul">Leaderboard Literasi &amp; Numerasi</h2>
      <table class="cp-info"><tbody>
        <tr><th>Peringkat</th><td>: ${esc(h.labelTes)}</td><th>Kelas</th><td>: ${S.kelas ? esc(S.kelas) : 'Seluruh kelas'}</td></tr>
        <tr><th>Peserta</th><td>: ${h.rows.length} siswa (${h.nLengkap} lengkap)</td><th>Tanggal</th><td>: ${esc(waktu)}</td></tr>
      </tbody></table>
      <table class="lb-print"><thead><tr><th class="lb-n" style="width:9%">Peringkat</th><th>Nama Siswa</th><th class="lb-n" style="width:9%">Kelas</th><th class="lb-n" style="width:12%">Literasi</th><th class="lb-n" style="width:12%">Numerasi</th><th class="lb-n" style="width:12%">Nilai Akhir</th><th class="lb-n" style="width:14%">Kategori</th></tr></thead><tbody>${baris}</tbody></table>
      <p class="lb-catatan">Nilai Akhir = rata-rata nilai Literasi dan Numerasi${h.semuaMode ? ' (masing-masing dirata-ratakan dari seluruh tes yang diikuti)' : ''}. Siswa yang belum mengerjakan salah satu tes diurutkan setelah siswa yang sudah lengkap. Nilai sama = peringkat sama.</p>
      <footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`;
    Guru._cetakArea_(html, ['Leaderboard', h.labelTes, S.kelas || 'Semua Kelas'].join(' - '));
  }

  // ---------------- Atur Tes (pengelompokan manual) ----------------
  function pastikanModal() {
    if ($('modal-lb-atur')) return;
    const d = document.createElement('div');
    d.id = 'modal-lb-atur'; d.className = 'modal-backdrop hidden';
    d.setAttribute('onclick', 'if(event.target===this)Leaderboard.tutupAtur()');
    d.innerHTML = `<div class="modal modal-wide">
      <h3 style="margin:0 0 .3rem">Atur Tes untuk Leaderboard</h3>
      <p class="subtitle" style="margin:0">Biasanya tidak perlu diubah: ujian yang judulnya memuat <strong>Literasi</strong> / <strong>Numerasi</strong> dikelompokkan otomatis menurut nama tesnya. Gunakan ini bila penamaan ujian berbeda. Bila mengatur manual nomor tes, atur semua ujian yang dipakai agar berpasangan. Pengaturan tersimpan di browser ini.</p>
      <div class="lb-atur-scroll" id="lb-atur-isi"></div>
      <div class="toolbar-actions" style="justify-content:flex-end">
        <button type="button" class="secondary" onclick="Leaderboard.resetAtur()">Kembalikan ke Otomatis</button>
        <button type="button" class="secondary" onclick="Leaderboard.tutupAtur()">Batal</button>
        <button type="button" onclick="Leaderboard.simpanAtur()">Simpan</button>
      </div></div>`;
    document.body.appendChild(d);
  }
  function isiAtur() {
    const atur = bacaAtur();
    const cap = (j) => j ? j.charAt(0).toUpperCase() + j.slice(1) : '';
    const daftar = [...S.ujian].sort((a, b) => String(a.judul || '').localeCompare(String(b.judul || ''), 'id', { numeric: true }));
    const opsiTes = (v) => `<option value="">Otomatis</option>` + Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}"${String(v) === String(i + 1) ? ' selected' : ''}>Tes ${i + 1}</option>`).join('');
    $('lb-atur-isi').innerHTML = daftar.length ? `<table class="lb-atur"><thead><tr><th>Ujian</th><th>Jenis</th><th>Masuk ke</th></tr></thead><tbody>` + daftar.map(u => {
      const ov = atur[u.id] || {}, oto = jenisOtomatis(u);
      return `<tr data-u="${esc(u.id)}"><td>${esc(u.judul)}${u.kategori ? `<br><small style="color:var(--c-muted)">${esc(u.kategori)}</small>` : ''}</td>
        <td><select data-f="jenis"><option value="">Otomatis (${oto ? cap(oto) : 'tidak dikenali'})</option><option value="literasi"${ov.jenis === 'literasi' ? ' selected' : ''}>Literasi</option><option value="numerasi"${ov.jenis === 'numerasi' ? ' selected' : ''}>Numerasi</option><option value="abaikan"${ov.jenis === 'abaikan' ? ' selected' : ''}>Abaikan (bukan tes ini)</option></select></td>
        <td><select data-f="tes">${opsiTes(ov.tes)}</select></td></tr>`;
    }).join('') + '</tbody></table>' : '<p class="subtitle">Belum ada ujian.</p>';
  }
  async function bukaAtur() {
    pastikanModal();
    if (!S.ujian.length) await muat();
    isiAtur();
    $('modal-lb-atur').classList.remove('hidden');
  }
  function tutupAtur() { const m = $('modal-lb-atur'); if (m) m.classList.add('hidden'); }
  function simpanAtur() {
    const o = {};
    document.querySelectorAll('#lb-atur-isi tr[data-u]').forEach(tr => {
      const jenis = tr.querySelector('[data-f="jenis"]').value, tes = tr.querySelector('[data-f="tes"]').value;
      if (jenis || tes) o[tr.dataset.u] = { jenis, tes };
    });
    if (!tulisAtur(o)) { toast('Browser tidak mengizinkan menyimpan pengaturan.', 'error'); return; }
    tutupAtur(); S.tes = 'semua'; S.kelas = '';
    muat();
    toast('Pengaturan tes disimpan.', 'success');
  }
  function resetAtur() { tulisAtur({}); isiAtur(); toast('Dikembalikan ke pengelompokan otomatis. Klik Simpan untuk menerapkan.', 'info'); }

  // ---------------- pemasangan ke aplikasi ----------------
  function buka() { if (!S.dimuat || Date.now() - S.waktu > 60000) muat(); else render(); }
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) {
    _gantiTab.call(UI, tabId);
    if (tabId === 'tab-leaderboard') buka();
  };

  return { buka, muat, render, pilihTes, pilihKelas, unduh, cetak, bukaAtur, tutupAtur, simpanAtur, resetAtur, _hitung: hitung, _kelompok: kelompok, _S: S };
})();
