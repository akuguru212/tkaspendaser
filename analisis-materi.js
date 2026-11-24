/* ============================================================================
   ANALISIS MATERI — materi (topik) mana yang masih kurang, plus saran belajar.
   - PORTAL SISWA : menu "Analisis Materi" di dalam dashboard siswa (portal-siswa.js) dengan submenu
                    Literasi / Numerasi. Klik salah satu -> daftar materi (diurutkan dari yang paling kurang);
                    tiap materi bisa dibuka untuk melihat persentase, perkembangan antar-tes, soal yang keliru,
                    dan SARAN BELAJAR.
   - PORTAL GURU  : tab "Analisis Materi" — per SISWA (materi apa yang kurang) dan per MATERI
                    (berapa siswa yang kurang), filter Literasi/Numerasi & kelas, detail siswa,
                    unduh Excel, cetak PDF.
   CARA MENGHITUNG
   * Materi = kolom "Topik" pada soal (Bank Soal). Bila kosong dipakai "Subkategori"; bila itu juga
     kosong, soal dikelompokkan sebagai "<judul ujian> (tanpa topik)".
   * Literasi / Numerasi ditentukan dari kata di judul ujian (atau kategorinya), sama seperti Leaderboard.
   * Bila satu ujian dikerjakan lebih dari sekali, dipakai percobaan TERAKHIR yang selesai.
   * Penguasaan materi = skor yang diperoleh / skor maksimal soal-soal pada materi itu (jawaban benar
     sebagian dihitung setengah; soal kosong dihitung 0; uraian yang belum dinilai tidak ikut dihitung).
   * Ambang: < 60% "Perlu diperkuat", 60-79% "Cukup", >= 80% "Sudah baik".
   * Portal siswa tidak menampilkan ujian yang oleh guru dimatikan "Tampilkan detail jawaban".
   Butuh Code.gs terbaru (aksi getAnalisisMateri) untuk Mode Server. Dimuat SETELAH app.js & anbk.js.
   ============================================================================ */
'use strict';
const AnalisisMateri = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const bulat = (n) => Math.round(Number(n) || 0);
  const TH_KURANG = 60, TH_BAIK = 80;
  const URUT_JENIS = ['literasi', 'numerasi', 'karakter', 'sulingjar', 'lainnya'];
  const NAMA_JENIS = { literasi: 'Literasi', numerasi: 'Numerasi', karakter: 'Survei Karakter', sulingjar: 'Sulingjar', lainnya: 'Mapel Lain' };
  const HURUF_JENIS = { literasi: 'L', numerasi: 'N', karakter: 'K', sulingjar: 'S', lainnya: 'M' };
  const IKON_JENIS = { literasi: 'fa-book-open', numerasi: 'fa-calculator', karakter: 'fa-hand-holding-heart', sulingjar: 'fa-school', lainnya: 'fa-layer-group' };
  const LABEL_LEVEL = { kurang: 'Perlu diperkuat', cukup: 'Cukup', baik: 'Sudah baik' };
  const levelDari = (p) => p < TH_KURANG ? 'kurang' : (p < TH_BAIK ? 'cukup' : 'baik');
  // Survei (Karakter & Sulingjar) memakai acuan kategori survei: >= 75 Baik, 50-74 Sedang, < 50 Perlu perhatian
  const LABEL_LEVEL_SV = { kurang: 'Perlu perhatian', cukup: 'Sedang', baik: 'Baik' };
  const levelSurvei = (p) => p < 50 ? 'kurang' : (p < 75 ? 'cukup' : 'baik');
  const adalahSurvei = (k) => k === 'karakter' || k === 'sulingjar';
  const levelUntuk = (k, p) => adalahSurvei(k) ? levelSurvei(p) : levelDari(p);
  const labelLevel = (k, lv) => (adalahSurvei(k) ? LABEL_LEVEL_SV : LABEL_LEVEL)[lv];
  const fmt1 = (n) => (n == null || isNaN(n)) ? '–' : (Math.round(Number(n) * 10) / 10).toLocaleString('id-ID', { maximumFractionDigits: 1 });

  // ---------------- gaya (disisipkan dari sini supaya tetap tampil walau berkas CSS tidak ikut terunggah) ----------------
  (function () {
    if (document.getElementById('analisis-materi-css-inline')) return;
    const st = document.createElement('style'); st.id = 'analisis-materi-css-inline';
    st.textContent = `
.am-scope { --am-surf: var(--c-surface, #fff); --am-line: var(--c-line, #dee2e6); --am-text: var(--c-text, #212529); --am-mute: var(--c-muted, #6c757d); --am-prim: var(--c-primary, #0d6efd); --am-hover: var(--c-hover, #f3f7fe); --am-bad: #d6455d; --am-mid: #dc8f12; --am-good: #229a66; }
.am-scope .am-chips { display: flex; flex-wrap: wrap; gap: .4rem; margin: 0 0 .7rem; }
.am-scope .am-chip { all: unset; box-sizing: border-box; cursor: pointer; padding: .4rem .95rem; border-radius: 999px; font-size: .8rem; font-weight: 600; line-height: 1.2; font-family: inherit; color: var(--am-text); background: var(--am-surf); border: 1px solid var(--am-line); -webkit-tap-highlight-color: transparent; }
.am-scope .am-chip:hover { background: var(--am-hover); border-color: var(--am-prim); }
.am-scope .am-chip.on, .am-scope .am-chip.on:hover { background: var(--am-prim); border-color: var(--am-prim); color: #fff; }
.am-scope .am-chip:focus-visible, .am-scope .am-mbtn:focus-visible, .am-scope .am-btn:focus-visible { outline: 3px solid rgba(13,110,253,.35); outline-offset: 2px; }
.am-scope .am-label { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--am-mute); margin: .35rem 0 .35rem; }
.am-scope .am-btn { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: .4rem; padding: .45rem 1rem; border-radius: 999px; font-size: .82rem; font-weight: 600; line-height: 1.2; font-family: inherit; color: var(--am-prim); background: var(--am-surf); border: 1px solid var(--am-prim); }
.am-scope .am-btn:hover { background: var(--am-hover); }
.am-scope .am-btn[disabled] { opacity: .55; cursor: not-allowed; }
.am-scope .am-muted { color: var(--am-mute); }
.am-scope .am-menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .8rem; margin: .4rem 0 1.1rem; }
.am-scope .am-mbtn { all: unset; box-sizing: border-box; cursor: pointer; display: grid; grid-template-columns: 46px 1fr; grid-template-rows: auto auto; column-gap: .75rem; align-items: center; padding: .85rem 1rem; border-radius: 14px; background: var(--am-surf); border: 2px solid var(--am-line); -webkit-tap-highlight-color: transparent; }
.am-scope .am-mbtn:hover { border-color: var(--am-prim); background: var(--am-hover); }
.am-scope .am-mbtn.on { border-color: var(--am-prim); background: color-mix(in srgb, var(--am-prim) 9%, var(--am-surf)); }
.am-scope .am-mbtn .am-mi { grid-row: 1 / span 2; width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font-size: 1.25rem; color: #fff; background: var(--am-prim); }
.am-scope .am-mbtn b { font-size: 1.02rem; color: var(--am-text); line-height: 1.25; }
.am-scope .am-mbtn small { font-size: .76rem; color: var(--am-mute); line-height: 1.3; }
.am-scope .am-mbtn small.bad { color: var(--am-bad); font-weight: 600; } .am-scope .am-mbtn small.ok { color: var(--am-good); font-weight: 600; }
.am-scope .am-ring-box { display: flex; align-items: center; gap: 1rem; padding: .9rem 1rem; margin: 0 0 1rem; border: 1px solid var(--am-line); border-radius: 14px; background: var(--am-surf); flex-wrap: wrap; }
.am-scope .am-ring { --p: 0; --c: var(--am-prim); width: 78px; height: 78px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--am-line) 0); }
.am-scope .am-ring span { width: 60px; height: 60px; border-radius: 50%; background: var(--am-surf); display: grid; place-items: center; font-weight: 800; font-size: 1.1rem; color: var(--am-text); }
.am-scope .am-ring-box h3 { margin: 0 0 .15rem; font-size: 1.05rem; color: var(--am-text); }
.am-scope .am-ring-box p { margin: 0; font-size: .82rem; color: var(--am-mute); line-height: 1.5; }
.am-scope .am-tally { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .45rem; }
.am-scope .am-tag { display: inline-block; padding: .12rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 700; white-space: nowrap; }
.am-scope .am-tag.kurang { background: color-mix(in srgb, var(--am-bad) 14%, var(--am-surf)); color: var(--am-bad); }
.am-scope .am-tag.cukup { background: color-mix(in srgb, var(--am-mid) 16%, var(--am-surf)); color: #a76705; }
.am-scope .am-tag.baik { background: color-mix(in srgb, var(--am-good) 14%, var(--am-surf)); color: var(--am-good); }
.am-scope .am-h { margin: 1.05rem 0 .5rem; font-size: .95rem; font-weight: 700; color: var(--am-text); display: flex; align-items: center; gap: .5rem; }
.am-scope .am-h small { font-weight: 500; color: var(--am-mute); font-size: .78rem; }
.am-scope .am-prior { margin: 0 0 1rem; padding: .75rem 1rem; border-radius: 14px; border: 1px dashed color-mix(in srgb, var(--am-bad) 45%, var(--am-line)); background: color-mix(in srgb, var(--am-bad) 5%, var(--am-surf)); font-size: .85rem; line-height: 1.55; color: var(--am-text); }
.am-scope .am-prior ol { margin: .3rem 0 0; padding-left: 1.2rem; }
.am-scope details.am-topik { border: 1px solid var(--am-line); border-left: 5px solid var(--am-line); border-radius: 12px; background: var(--am-surf); margin: 0 0 .55rem; overflow: hidden; }
.am-scope details.am-topik.kurang { border-left-color: var(--am-bad); } .am-scope details.am-topik.cukup { border-left-color: var(--am-mid); } .am-scope details.am-topik.baik { border-left-color: var(--am-good); }
.am-scope details.am-topik > summary { list-style: none; cursor: pointer; display: grid; grid-template-columns: 1fr auto 18px; gap: .2rem .7rem; align-items: center; padding: .7rem .9rem; }
.am-scope details.am-topik > summary::-webkit-details-marker { display: none; }
.am-scope details.am-topik > summary::after { content: '\\25BE'; grid-column: 3; grid-row: 1; color: var(--am-mute); transition: transform .15s; }
.am-scope details.am-topik[open] > summary::after { transform: rotate(180deg); }
.am-scope .am-tl { font-weight: 700; font-size: .92rem; color: var(--am-text); line-height: 1.35; word-break: break-word; }
.am-scope .am-pill { justify-self: end; white-space: nowrap; }
.am-scope .am-bar { grid-column: 1 / span 3; display: block; height: 6px; border-radius: 99px; background: var(--am-line); overflow: hidden; }
.am-scope .am-bar i { display: block; height: 100%; border-radius: 99px; }
.am-scope .am-bar i.kurang { background: var(--am-bad); } .am-scope .am-bar i.cukup { background: var(--am-mid); } .am-scope .am-bar i.baik { background: var(--am-good); }
.am-scope .am-body { padding: .1rem .95rem .85rem; font-size: .85rem; line-height: 1.55; color: var(--am-text); }
.am-scope .am-body .am-fakta { margin: .1rem 0 .5rem; color: var(--am-mute); }
.am-scope .am-body .am-fakta b { color: var(--am-text); }
.am-scope .am-saran { margin-top: .45rem; padding: .6rem .8rem; border-radius: 10px; background: color-mix(in srgb, var(--am-prim) 7%, var(--am-surf)); border: 1px solid color-mix(in srgb, var(--am-prim) 22%, var(--am-line)); }
.am-scope .am-saran > b { display: flex; gap: .4rem; align-items: center; margin-bottom: .2rem; }
.am-scope .am-saran ul { margin: 0; padding-left: 1.15rem; }
.am-scope .am-saran li { margin: .15rem 0; }
.am-scope .am-kosongan { text-align: center; padding: 1.6rem 1rem; color: var(--am-mute); }
.am-scope .am-kosongan i { font-size: 2.2rem; display: block; margin-bottom: .5rem; opacity: .5; }
.am-scope .am-info { margin: 0 0 .9rem; padding: .6rem .85rem; border-radius: 10px; font-size: .8rem; line-height: 1.5; background: color-mix(in srgb, var(--am-mid) 12%, var(--am-surf)); border: 1px solid color-mix(in srgb, var(--am-mid) 40%, var(--am-line)); color: var(--am-text); }
/* ---- portal guru ---- */
#tab-analisis-materi .am-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .7rem; margin: 0 0 1rem; }
#tab-analisis-materi .am-stat { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 14px; padding: .75rem .95rem; box-shadow: var(--shadow); }
#tab-analisis-materi .am-stat b { display: block; font-size: 1.35rem; line-height: 1.25; color: var(--c-text); }
#tab-analisis-materi .am-stat span { font-size: .72rem; font-weight: 600; letter-spacing: .03em; color: var(--c-muted); }
#tab-analisis-materi .am-scroll { overflow: auto; max-height: 74vh; border: 1px solid var(--c-line); border-radius: 14px; }
#tab-analisis-materi table.am-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
#tab-analisis-materi table.am-table th { position: sticky; top: 0; z-index: 2; background: var(--c-surface); text-align: left; padding: .6rem .6rem; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; color: var(--c-muted); border-bottom: 2px solid var(--c-line); white-space: nowrap; }
#tab-analisis-materi table.am-table td { padding: .5rem .6rem; border-bottom: 1px solid var(--c-line); vertical-align: top; }
#tab-analisis-materi table.am-table tbody tr:hover td { background: var(--c-hover); }
#tab-analisis-materi .am-nama { font-weight: 700; min-width: 150px; color: var(--c-text); }
#tab-analisis-materi .am-sk { min-width: 80px; font-weight: 700; font-variant-numeric: tabular-nums; }
#tab-analisis-materi .am-sk .am-bar { margin-top: 4px; }
#tab-analisis-materi .am-kurang { display: flex; flex-wrap: wrap; gap: .3rem; min-width: 230px; }
#tab-analisis-materi .am-kurang .am-tag { font-weight: 600; max-width: 100%; white-space: normal; }
#tab-analisis-materi details.am-sis summary { cursor: pointer; font-size: .8rem; color: var(--c-primary); font-weight: 600; }
#tab-analisis-materi details.am-sis div { margin-top: .3rem; font-size: .8rem; line-height: 1.55; color: var(--c-text); }
#modal-am-detail .modal { max-width: 860px; }
#modal-am-detail .am-dbody { max-height: 68vh; overflow: auto; padding-right: .2rem; }
@media print { #cetak-area table.am-print { width: 100%; border-collapse: collapse; font-size: 9.5pt; } #cetak-area table.am-print th { padding: 3px 5px; background: #e9edf2 !important; border: 1px solid #9aa1ab; text-align: left; } #cetak-area table.am-print td { padding: 3px 5px; border: 1px solid #c9ced6; vertical-align: top; } #cetak-area table.am-print thead { display: table-header-group; } #cetak-area table.am-print tr { break-inside: avoid; } #cetak-area .am-catatan { margin: 6px 0 0; font-size: 8.5pt; color: #444; } }`;
    document.head.appendChild(st);
  })();

  // ============================================================================================
  // INTI: mengolah data mentah (aksi getAnalisisMateri) menjadi analisis per siswa -> jenis -> materi
  // ============================================================================================
  function jenisDari(u) {
    const cari = (t) => {
      const x = norm(t), a = x.indexOf('literasi'), b = x.indexOf('numerasi');
      if (a < 0 && b < 0) return '';
      if (a >= 0 && b >= 0) return a < b ? 'literasi' : 'numerasi';
      return a >= 0 ? 'literasi' : 'numerasi';
    };
    return cari(u.judul) || cari(u.kategori) || 'lainnya';
  }

  function olah(res) {
    const ujianPeta = {};
    (res.ujian || []).forEach(u => { u.jenis = jenisDari(u); ujianPeta[u.id] = u; });
    // bila satu ujian dikerjakan beberapa kali -> pakai percobaan terakhir yang selesai
    const terbaru = new Map();
    (res.sesi || []).forEach(s => {
      const k = s.si + '|' + s.u, w = Date.parse(s.sl) || 0, p = terbaru.get(k);
      if (!p || w >= p._w) { s._w = w; terbaru.set(k, s); }
    });
    const siswa = new Map();
    terbaru.forEach(s => {
      const u = ujianPeta[s.u]; if (!u) return;
      let sw = siswa.get(s.si);
      if (!sw) { sw = { id: s.si, nama: s.nm, kelas: s.kl, jenis: {} }; siswa.set(s.si, sw); }
      const J = sw.jenis[u.jenis] = sw.jenis[u.jenis] || { key: u.jenis, nama: NAMA_JENIS[u.jenis], map: new Map(), ujian: [] };
      J.ujian.push({ id: u.id, judul: u.judul, nilai: s.nl });
      const nomor = {}; (s.o || []).forEach((ix, pos) => { nomor[ix] = pos + 1; });
      u.soal.forEach((so, ix) => {
        const c = String(s.r || '').charAt(ix);
        if (!c || c === 'n' || c === 'm' || so.x) return;
        const label = so.t || so.s || (u.judul + ' (tanpa topik)');
        const kunci = norm(label);
        let T = J.map.get(kunci);
        if (!T) { T = { key: kunci, label, got: 0, max: 0, n: 0, benar: 0, sebagian: 0, salah: 0, kosong: 0, refs: [], tanpaTopik: !(so.t || so.s), per: {} }; J.map.set(kunci, T); }
        const w = so.w > 0 ? so.w : 1;
        const P1 = T.per[u.id] = T.per[u.id] || { judul: u.judul, waktu: s._w || 0, got: 0, max: 0 };
        P1.max += w;
        T.max += w; T.n++;
        if (c === 'b') { T.got += w; P1.got += w; T.benar++; }
        else {
          if (c === 'p') { T.got += w * 0.5; P1.got += w * 0.5; T.sebagian++; } else if (c === 's') T.salah++; else if (c === 'k') T.kosong++;
          T.refs.push({ judul: u.judul, no: nomor[ix] || null, kode: c });
        }
      });
    });
    const daftar = [];
    siswa.forEach(sw => {
      Object.keys(sw.jenis).forEach(k => {
        const J = sw.jenis[k];
        J.topik = [...J.map.values()].map(T => {
          T.persen = T.max ? (T.got / T.max) * 100 : 0; T.level = levelDari(T.persen);
          T.hist = Object.keys(T.per).map(k => ({ judul: T.per[k].judul, waktu: T.per[k].waktu, persen: T.per[k].max ? (T.per[k].got / T.per[k].max) * 100 : 0 })).sort((a, b) => a.waktu - b.waktu);
          delete T.per; return T;
        })
          .sort((a, b) => a.persen - b.persen || a.label.localeCompare(b.label, 'id'));
        delete J.map;
        const got = J.topik.reduce((a, t) => a + t.got, 0), max = J.topik.reduce((a, t) => a + t.max, 0);
        J.persen = max ? (got / max) * 100 : 0;
        J.nKurang = J.topik.filter(t => t.level === 'kurang').length;
        J.nCukup = J.topik.filter(t => t.level === 'cukup').length;
        J.nBaik = J.topik.filter(t => t.level === 'baik').length;
        if (!J.topik.length) delete sw.jenis[k];
      });
      if (Object.keys(sw.jenis).length) daftar.push(sw);
    });
    daftar.sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
    return daftar;
  }

  // ============================================================================================
  // SARAN BELAJAR (berbasis aturan: menurut kata kunci nama materi + tingkat penguasaan)
  // ============================================================================================
  const BANK_SARAN = {
    literasi: [
      { k: ['ide pokok', 'gagasan', 'pokok pikiran', 'kalimat utama', 'topik'], s: ['Cari kalimat utama di tiap paragraf (biasanya di awal atau akhir), lalu tulis ide pokoknya dengan kata-katamu sendiri.', 'Latihan: baca satu teks pendek, buat ringkasan satu kalimat untuk setiap paragraf.'] },
      { k: ['informasi', 'tersurat', 'menemukan', 'mengakses', 'mencari'], s: ['Baca teks sambil menggarisbawahi fakta penting (siapa, apa, kapan, di mana, mengapa, bagaimana).', 'Cocokkan setiap pilihan jawaban dengan kalimat di teks; jawaban yang benar selalu punya "bukti" di bacaan.'] },
      { k: ['simpul', 'inferensi', 'tersirat', 'menafsir', 'interpretasi', 'menyimpulkan'], s: ['Bedakan yang tertulis jelas dengan yang harus disimpulkan; cari petunjuk (kata kunci, sebab-akibat) sebelum menyimpulkan.', 'Setelah memilih jawaban, tanyakan: "Bagian mana di teks yang mendukung kesimpulan ini?"'] },
      { k: ['kosakata', 'makna kata', 'diksi', 'istilah', 'arti kata', 'majas'], s: ['Tebak makna kata dari konteks kalimatnya, lalu cek di kamus.', 'Buat daftar kata baru beserta contoh kalimatnya, ulangi tiap beberapa hari.'] },
      { k: ['sastra', 'puisi', 'cerpen', 'cerita', 'fiksi', 'novel', 'unsur intrinsik', 'tema', 'amanat', 'tokoh', 'latar', 'alur', 'drama'], s: ['Baca ulang cerita dan tandai tokoh, latar, alur, serta pesan yang ingin disampaikan.', 'Ringkas tiap bagian cerita dalam satu kalimat, lalu tentukan amanatnya.'] },
      { k: ['fakta', 'opini', 'evaluasi', 'menilai', 'argumen', 'refleksi', 'persuasi', 'pendapat'], s: ['Latih membedakan fakta (bisa dibuktikan) dan opini (pendapat penulis).', 'Periksa alasan dan bukti yang dipakai penulis: apakah cukup kuat untuk mendukung pendapatnya?'] },
      { k: ['struktur', 'kebahasaan', 'ejaan', 'kalimat', 'paragraf', 'tata bahasa', 'imbuhan', 'tanda baca'], s: ['Pelajari lagi aturan kebahasaan pada materi ini dan tulis contoh benar-salahnya.', 'Latihan: perbaiki 5 kalimat yang keliru lalu cocokkan dengan pembahasan.'] },
      { k: ['grafik', 'tabel', 'infografik', 'diagram', 'gambar', 'nonlinear', 'visual'], s: ['Sebelum membaca isi, perhatikan dulu judul, keterangan, dan satuan pada grafik/tabel.', 'Latih menceritakan kembali isi infografik dengan kalimatmu sendiri.'] }
    ],
    numerasi: [
      { k: ['bilangan', 'operasi hitung', 'pecahan', 'desimal', 'persen', 'rasio', 'perbandingan', 'skala', 'bulat'], s: ['Ulangi konsep dasar operasi dan urutan pengerjaan; tulis langkah hitung satu per satu, jangan dilompati.', 'Latihan: kerjakan 10 soal cerita sederhana, lalu periksa kembali hasilnya dengan perkiraan kasar.'] },
      { k: ['aljabar', 'persamaan', 'pertidaksamaan', 'variabel', 'fungsi', 'pola', 'barisan', 'deret'], s: ['Ubah soal cerita menjadi model (persamaan atau pola) lebih dulu, baru selesaikan.', 'Cek jawaban dengan memasukkannya kembali ke persamaan.'] },
      { k: ['geometri', 'bangun', 'luas', 'keliling', 'volume', 'sudut', 'pengukuran', 'satuan', 'transformasi', 'ruang', 'datar'], s: ['Gambar sketsa bangunnya, tulis ukuran yang diketahui, lalu pilih rumus yang sesuai.', 'Hafalkan rumus penting dengan kartu rumus dan perhatikan satuannya.'] },
      { k: ['data', 'statistik', 'peluang', 'diagram', 'grafik', 'rata-rata', 'mean', 'median', 'modus', 'tabel'], s: ['Baca judul, label sumbu, dan satuan grafik/tabel sebelum menghitung.', 'Latih mencari rata-rata, median, dan modus dari data kecil, lalu naik ke data yang lebih banyak.'] },
      { k: ['masalah', 'cerita', 'konteks', 'penalaran', 'logika'], s: ['Tandai apa yang diketahui dan apa yang ditanyakan sebelum menghitung.', 'Buat tabel atau gambar sederhana untuk membantu memahami soal cerita.'] }
    ],
    lainnya: []
  };
  const SARAN_UMUM = {
    literasi: 'Biasakan membaca teks berbagai jenis (berita, cerita, artikel) sedikitnya 15 menit sehari, lalu ceritakan ulang isinya.',
    numerasi: 'Latihan rutin 10–15 menit tiap hari lebih efektif daripada belajar lama sekali seminggu.',
    lainnya: 'Ulangi materi dari catatan atau buku, lalu kerjakan soal latihan yang sejenis.'
  };
  function saranUntuk(T, jenis) {
    const hasil = [], lab = esc(T.label);
    if (T.level === 'kurang') {
      hasil.push(`Mulai dari dasar: baca kembali ringkasan materi <b>${lab}</b> dan catat konsep/rumus pentingnya dengan bahasamu sendiri.`);
    } else if (T.level === 'cukup') {
      hasil.push(`Kamu sudah cukup paham <b>${lab}</b>; tinggal dimantapkan dengan latihan soal yang bervariasi.`);
    } else {
      hasil.push(`Pertahankan penguasaan <b>${lab}</b>. Coba soal yang lebih menantang atau bantu temanmu memahaminya.`);
    }
    if (T.level !== 'baik') {
      const nx = norm(T.label), bank = BANK_SARAN[jenis] || [];
      const cocok = bank.find(b => b.k.some(k => nx.indexOf(k) >= 0));
      if (cocok) cocok.s.forEach(x => hasil.push(esc(x)));
      else if (SARAN_UMUM[jenis]) hasil.push(esc(SARAN_UMUM[jenis]));
      if (T.level === 'kurang') hasil.push('Buka <b>Detail Jawaban</b> pada tes yang sudah kamu kerjakan, baca pembahasan soal yang salah, lalu kerjakan ulang tanpa melihat jawaban.');
      else hasil.push('Periksa kesalahanmu: apakah karena salah konsep atau kurang teliti? Catat polanya agar tidak terulang.');
      if (T.kosong > 0) hasil.push('Ada soal yang belum dijawab: latih mengatur waktu — kerjakan soal yang mudah dulu, beri tanda <i>ragu-ragu</i> pada soal sulit, lalu kembali lagi.');
      if (T.level === 'kurang') hasil.push('Bila masih bingung, tanyakan ke guru atau teman yang sudah paham sebelum materinya menumpuk.');
    }
    return hasil.slice(0, 5);
  }

  // Saran dalam teks polos (untuk laporan PDF). untuk: 'siswa' | 'guru'
  function saranPlain(T, jenis, untuk) {
    if (adalahSurvei(jenis)) {
      const x = (typeof Survei !== 'undefined' && Survei.saranDim && T.level !== 'baik') ? Survei.saranDim(jenis, T.kode, untuk || 'siswa') : '';
      return x ? [x] : [];
    }
    return saranUntuk(T, jenis).map(h => bersihkanHtml_(h));
  }
  // ============================================================================================
  // RENDER BERSAMA (dipakai portal siswa & modal detail guru)
  // ============================================================================================
  function teksRef(T) {
    const per = new Map();
    T.refs.forEach(r => { if (!r.no) return; if (!per.has(r.judul)) per.set(r.judul, []); per.get(r.judul).push(r.no); });
    if (!per.size) return '';
    return [...per.entries()].map(([j, arr]) => `${esc(j)}: no. ${arr.sort((a, b) => a - b).join(', ')}`).join(' &middot; ');
  }
  function htmlHist(T) {
    if (!T.hist || T.hist.length < 2) return '';
    const a = T.hist[0], b = T.hist[T.hist.length - 1], d = b.persen - a.persen;
    const arah = d >= 5 ? ['naik', '▲ membaik'] : (d <= -5 ? ['turun', '▼ menurun'] : ['stabil', '● stabil']);
    const rangkai = T.hist.map(h => `${esc(h.judul)} <b>${bulat(h.persen)}${T.survei ? '' : '%'}</b>`).join(' → ');
    return `<div class="am-fakta">Perkembangan materi ini: ${rangkai} <span class="am-tag ${arah[0] === 'naik' ? 'baik' : (arah[0] === 'turun' ? 'kurang' : 'cukup')}">${arah[1]}</span></div>`;
  }
  function htmlTopik(T, jenis, terbuka) {
    const sv = adalahSurvei(jenis);
    const bar = `<summary><span class="am-tl">${esc(T.label)}</span><span class="am-tag am-pill ${T.level}">${bulat(T.persen)}${sv ? '' : '%'} &middot; ${labelLevel(jenis, T.level)}</span><span class="am-bar"><i class="${T.level}" style="width:${Math.max(2, bulat(T.persen))}%"></i></span></summary>`;
    if (sv) {
      const saran = (typeof Survei !== 'undefined' && Survei.saranDim && T.level !== 'baik') ? Survei.saranDim(jenis, T.kode, 'guru') : '';
      const jud = jenis === 'karakter' ? 'Saran pembiasaan untuk siswa' : 'Tindak lanjut sekolah';
      return `<details class="am-topik ${T.level}"${terbuka ? ' open' : ''}>${bar}
        <div class="am-body"><div class="am-fakta">Nilai dimensi <b>${bulat(T.persen)}</b> dari 100 &middot; rata-rata skor <b>${fmt1(T.rata)}</b> dari 4 (${T.nButir} butir)</div>
        ${htmlHist(T)}
        ${saran ? `<div class="am-saran"><b><i class="fa-solid fa-lightbulb"></i> ${jud}</b><ul><li>${esc(saran)}</li></ul></div>` : ''}</div></details>`;
    }
    const fakta = [`Benar <b>${T.benar}</b> dari <b>${T.n}</b> soal`];
    if (T.sebagian) fakta.push(`${T.sebagian} benar sebagian`);
    if (T.salah) fakta.push(`${T.salah} salah`);
    if (T.kosong) fakta.push(`${T.kosong} kosong`);
    const ref = teksRef(T);
    return `<details class="am-topik ${T.level}"${terbuka ? ' open' : ''}>${bar}
      <div class="am-body">
        <div class="am-fakta">${fakta.join(' &middot; ')}</div>
        ${ref && T.level !== 'baik' ? `<div class="am-fakta">Soal yang keliru — ${ref}</div>` : ''}
        ${htmlHist(T)}
        <div class="am-saran"><b><i class="fa-solid fa-lightbulb"></i> Saran belajar</b><ul>${saranUntuk(T, jenis).map(x => `<li>${x}</li>`).join('')}</ul></div>
      </div></details>`;
  }
  function htmlJenis(J) {
    const sv = !!J.survei;
    const lv = levelUntuk(J.key, J.persen);
    const lemah = J.topik.filter(t => t.level !== 'baik');
    const baik = J.topik.filter(t => t.level === 'baik');
    const prior = J.topik.filter(t => t.level === 'kurang').slice(0, 3);
    const warna = lv === 'kurang' ? 'var(--am-bad)' : (lv === 'cukup' ? 'var(--am-mid)' : 'var(--am-good)');
    const L = sv ? ['perlu perhatian', 'sedang', 'baik'] : ['perlu diperkuat', 'cukup', 'sudah baik'];
    const bagian = sv ? 'dimensi' : 'materi';
    let h = `<div class="am-ring-box"><div class="am-ring" style="--p:${bulat(J.persen)};--c:${warna}"><span>${bulat(J.persen)}${sv ? '' : '%'}</span></div>
      <div style="flex:1 1 220px"><h3>${sv ? 'Nilai' : 'Penguasaan'} ${esc(J.nama)}</h3>
      <p>Dihitung dari ${J.ujian.length} ${sv ? 'survei' : 'tes'}: ${J.ujian.map(u => esc(u.judul)).join(', ')}.</p>
      <div class="am-tally"><span class="am-tag kurang">${J.nKurang} ${L[0]}</span><span class="am-tag cukup">${J.nCukup} ${L[1]}</span><span class="am-tag baik">${J.nBaik} ${L[2]}</span></div></div></div>`;
    if (prior.length) {
      h += `<div class="am-prior"><b><i class="fa-solid fa-bullseye"></i> Prioritas ${sv ? 'peningkatan' : 'belajar'}</b><ol>${prior.map(t => `<li><b>${esc(t.label)}</b> (${bulat(t.persen)}${sv ? '' : '%'})</li>`).join('')}</ol></div>`;
    }
    if (lemah.length) {
      h += `<div class="am-h"><i class="fa-solid fa-list-check"></i> ${sv ? 'Dimensi yang perlu ditingkatkan' : 'Materi yang perlu dipelajari lagi'} <small>(${lemah.length} ${bagian} — ketuk untuk melihat saran)</small></div>`;
      h += lemah.map((t, i) => htmlTopik(t, J.key, i === 0)).join('');
    } else {
      h += `<div class="am-kosongan" style="padding:1rem"><i class="fa-solid fa-circle-check" style="color:var(--am-good);opacity:1"></i><b>Hebat!</b> Semua ${bagian} ${esc(J.nama)} sudah berada pada tingkat baik. Pertahankan ya.</div>`;
    }
    if (baik.length) {
      h += `<div class="am-h"><i class="fa-solid fa-circle-check" style="color:var(--am-good)"></i> ${sv ? 'Dimensi' : 'Materi'} yang sudah baik <small>(${baik.length} ${bagian})</small></div>`;
      h += baik.map(t => htmlTopik(t, J.key, false)).join('');
    }
    if (J.topik.some(t => t.tanpaTopik)) {
      h += `<div class="am-info" style="margin-top:.8rem"><i class="fa-solid fa-circle-info"></i> Sebagian soal belum diberi <b>Topik</b> oleh guru, sehingga dikelompokkan menurut judul tes. Analisis akan lebih rinci setelah topik pada soal diisi.</div>`;
    }
    if (sv && J.perluCek) {
      h += `<div class="am-info" style="margin-top:.8rem"><i class="fa-solid fa-triangle-exclamation"></i> ${J.perluCek} pengisian survei ditandai <b>perlu dicek</b> (terlalu cepat / seragam / bertentangan), sehingga hasilnya perlu ditafsirkan hati-hati.</div>`;
    }
    return h;
  }

  // ============================================================================================
  // PORTAL SISWA
  // ============================================================================================
  const SS = { data: null, jenis: '', tersembunyi: [] };

  function ringkasMenu(J) {
    if (!J) return '<small>Belum ada hasil tes</small>';
    if (J.nKurang) return `<small class="bad">${J.nKurang} materi perlu diperkuat</small>`;
    if (J.nCukup) return `<small>${J.nCukup} materi cukup — tinggal dimantapkan</small>`;
    return '<small class="ok">Semua materi sudah baik</small>';
  }
  function renderMenuSiswa(wadah, aktif) {
    const sw = SS.data;
    const daftar = ['literasi', 'numerasi'].concat(sw && sw.jenis.lainnya ? ['lainnya'] : []);
    wadah.innerHTML = daftar.map(k => {
      const J = sw ? sw.jenis[k] : null;
      return `<button type="button" class="am-mbtn${aktif === k ? ' on' : ''}" data-j="${k}" onclick="AnalisisMateri.pilihJenis('${k}')"><span class="am-mi"><i class="fa-solid ${IKON_JENIS[k]}"></i></span><b>${NAMA_JENIS[k]}</b>${ringkasMenu(J)}</button>`;
    }).join('');
  }
  // dipanggil Portal Siswa (menu Analisis Materi): gambar menu Literasi/Numerasi + isi analisisnya
  function renderSiswa() {
    const menu = $('am-s-menu'), isi = $('am-s-isi'); if (!menu || !isi) return;
    const sw = SS.data;
    if (!SS.jenis) {
      const pertama = sw ? URUT_JENIS.find(k => sw.jenis[k] && sw.jenis[k].nKurang) || URUT_JENIS.find(k => sw.jenis[k]) : '';
      SS.jenis = pertama || 'literasi';
    }
    renderMenuSiswa(menu, SS.jenis);
    let catatan = '';
    const sembunyi = SS.tersembunyi.filter(u => jenisDari(u) === SS.jenis).length;
    if (sembunyi) catatan = `<div class="am-info"><i class="fa-solid fa-circle-info"></i> ${sembunyi} tes ${esc(NAMA_JENIS[SS.jenis])} tidak ikut dianalisis karena guru tidak mengaktifkan tampilan detail jawaban untuk tes tersebut.</div>`;
    if (!sw) {
      isi.innerHTML = catatan + `<div class="am-kosongan"><i class="fa-solid fa-chart-column"></i>Belum ada hasil tes yang bisa dianalisis. Selesaikan tes Literasi atau Numerasi terlebih dahulu, lalu buka halaman ini lagi.</div>`;
      return;
    }
    const J = sw.jenis[SS.jenis];
    if (!J) {
      isi.innerHTML = catatan + `<div class="am-kosongan"><i class="fa-solid fa-hourglass-half"></i>Kamu belum mengerjakan tes <b>${NAMA_JENIS[SS.jenis]}</b>, jadi belum ada analisis materinya.</div>`;
      return;
    }
    isi.innerHTML = catatan + htmlJenis(J);
  }
  // data mentah getAnalisisMateri (mode siswa) -> analisis siswa ini
  function setDataSiswa(res, siswaId) {
    const daftar = olah(res || {});
    SS.data = daftar.find(x => String(x.id) === String(siswaId)) || null;
    SS.tersembunyi = Array.isArray(res && res.tersembunyi) ? res.tersembunyi : [];
    return SS.data;
  }
  // ringkasan untuk Dashboard: prioritas materi paling lemah dari semua jenis
  function ringkasSiswa() {
    const sw = SS.data; if (!sw) return null;
    const semua = [];
    Object.keys(sw.jenis).forEach(k => sw.jenis[k].topik.forEach(t => semua.push({ label: t.label, persen: t.persen, level: t.level, jenis: k })));
    semua.sort((a, b) => a.persen - b.persen);
    return { jenis: sw.jenis, prioritas: semua.filter(t => t.level !== 'baik').slice(0, 5), nKurang: semua.filter(t => t.level === 'kurang').length, nBaik: semua.filter(t => t.level === 'baik').length, nTotal: semua.length };
  }
  function pilihJenis(k) { SS.jenis = k; renderSiswa(); }
  function resetJenis(k) { SS.jenis = (k === 'literasi' || k === 'numerasi') ? k : ''; }
  function bukaSiswa(jenis) { if (typeof PortalSiswa !== 'undefined') PortalSiswa.buka('analisis', jenis); }
  function kembali() { if (typeof PortalSiswa !== 'undefined') PortalSiswa.buka('dashboard'); }

  // ============================================================================================
  // PORTAL GURU
  // ============================================================================================
  const G = { guruId: null, siswa: [], prog: new Map(), tesGlobal: [], surveiGalat: false, dimuat: false, memuat: false, waktu: 0, jenis: 'semua', kelas: '', tampil: 'siswa', detailId: null };

  async function muat(tombol) {
    if (G.memuat) return false;
    if (typeof state === 'undefined' || !state.user || state.user.role === 'siswa') return false;
    G.memuat = true;
    const btn = (tombol && tombol.classList) ? tombol : $('am-g-segarkan');
    if (btn) { btn.classList.add('sedang'); btn.setAttribute('aria-busy', 'true'); }
    if (!G.dimuat) { const c = $('am-g-tabel'); if (c) c.innerHTML = '<p class="subtitle">Memuat analisis materi...</p>'; }
    let ok = true;
    try {
      if (G.guruId !== state.user.id) { G.guruId = state.user.id; G.siswa = []; G.dimuat = false; G.jenis = 'semua'; G.kelas = ''; }
      const res = await api('getAnalisisMateri', { guruId: state.user.id });
      if (!res || !res.ok) throw new Error((res && res.error) || 'Gagal memuat analisis materi.');
      G.siswa = olah(res);
      try { const pg = Perkembangan.olahGuru(res); G.prog = new Map(pg.siswa.map(x => [String(x.id), x])); G.tesGlobal = pg.tes; } catch (e) { G.prog = new Map(); G.tesGlobal = []; }
      G.surveiGalat = false;
      try { gabungSurvei(G.siswa, await muatSurvei()); } catch (e) { G.surveiGalat = true; }
      G.siswa.sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
      G.dimuat = true; G.waktu = Date.now();
    } catch (e) {
      ok = false;
      if (!G.dimuat) { const c = $('am-g-tabel'); if (c) c.innerHTML = `<p class="subtitle">${esc((e && e.message) || 'Gagal memuat analisis materi.')} Untuk Mode Server, pastikan <code>Code.gs</code> terbaru sudah dipasang.</p>`; }
      else toast('Gagal memperbarui Analisis Materi. Data sebelumnya tetap ditampilkan.', 'error');
    } finally {
      G.memuat = false;
      if (btn) { btn.classList.remove('sedang'); btn.removeAttribute('aria-busy'); }
    }
    if (G.dimuat) render();
    try { Guru.tandaiDiperbarui_('tab-analisis-materi', !ok); } catch (e) { }
    return ok;
  }

  // ---------------- Survei Karakter & Sulingjar ----------------
  // Hasil survei diambil dari data yang sama dengan menu Hasil Survei / Leaderboard Survei (getDaftarUjian + getRekapSurvei).
  // "Materi" pada survei = DIMENSI (mis. Gotong royong, Iklim keamanan). Nilai dimensi 0-100, kategori: >= 75 Baik,
  // 50-74 Sedang, < 50 Perlu perhatian. Bila beberapa survei diisi, tiap dimensi dirata-ratakan (nilai tertinggi tiap survei).
  async function muatSurvei() {
    if (typeof Survei === 'undefined') return {};
    try { await Survei.muatPaket(false); } catch (e) { }
    const dl = await api('getDaftarUjian', { guruId: state.user.id });
    if (!dl || !dl.ok) throw new Error('Gagal memuat daftar ujian.');
    const paket = (state.guru && state.guru.paketSurvei) || [];
    const daftar = (dl.data || []).filter(u => { let j = ''; try { j = Survei.jenisUntukUjian(u, paket); } catch (e) { } return j === 'karakter' || j === 'sulingjar'; });
    const hasil = {}; let i = 0, gagal = 0;
    const kerja = async () => {
      while (i < daftar.length) {
        const u = daftar[i++]; let r = null;
        try { r = await api('getRekapSurvei', { ujianId: u.id }); } catch (e) { r = null; }
        if (r && r.ok && r.jenis) { const set = Survei.bangunSet(r.jenis, r.set); if (set) hasil[u.id] = { u, jenis: r.jenis, set, rows: r.data || [] }; } else gagal++;
      }
    };
    await Promise.all([kerja(), kerja(), kerja(), kerja()]);
    if (gagal) throw new Error(gagal + ' survei gagal dimuat.');
    return hasil;
  }
  function gabungSurvei(daftar, data) {
    const peta = new Map(daftar.map(s => [String(s.id), s]));
    const per = new Map();
    Object.keys(data || {}).forEach(uid => {
      const d = data[uid];
      (d.rows || []).forEach(r => {
        const h = Survei.hitung(d.jenis, r.jawaban, d.set); if (!h || h.total == null || isNaN(h.total)) return;
        const sid = String(r.siswaId || ('nm:' + norm(r.nama) + '|' + norm(r.kelas)));
        let v = per.get(sid); if (!v) { v = { nama: r.nama || '(tanpa nama)', kelas: r.kelas || '-', jenis: {} }; per.set(sid, v); }
        const slot = v.jenis[d.jenis] = v.jenis[d.jenis] || new Map();
        const b = slot.get(d.u.id);
        if (!b || h.total > b.h.total) slot.set(d.u.id, { h, r, d });
      });
    });
    const rataArr = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    per.forEach((v, sid) => {
      let sw = peta.get(sid);
      if (!sw) { sw = { id: sid, nama: v.nama, kelas: v.kelas, jenis: {} }; peta.set(sid, sw); daftar.push(sw); }
      ['karakter', 'sulingjar'].forEach(jn => {
        const slot = v.jenis[jn]; if (!slot || !slot.size) return;
        const items = [...slot.values()], dim = new Map();
        items.forEach(it => {
          const nama = {}; it.d.set.dim.forEach(x => { nama[x[0]] = x[1]; });
          Object.keys(it.h.dim).forEach(k => {
            const x = it.h.dim[k]; if (x.indeks == null) return;
            let e = dim.get(k); if (!e) { e = { kode: k, label: nama[k] || x.nama || k, vals: [], rata: [], n: 0, hist: [] }; dim.set(k, e); }
            e.vals.push(x.indeks); e.rata.push(x.rata); e.n += x.n;
            e.hist.push({ judul: it.d.u.judul, waktu: Date.parse(it.r.waktu) || 0, persen: x.indeks });
          });
        });
        const topik = [...dim.values()].map(e => {
          const persen = rataArr(e.vals);
          return { key: norm(e.kode + e.label), kode: e.kode, label: e.label, persen, level: levelSurvei(persen), rata: rataArr(e.rata), nButir: e.n, got: 0, max: 0, n: e.n, benar: 0, sebagian: 0, salah: 0, kosong: 0, refs: [], tanpaTopik: false, survei: true, hist: e.hist.sort((a, b) => a.waktu - b.waktu) };
        }).sort((a, b) => a.persen - b.persen || a.label.localeCompare(b.label, 'id'));
        if (!topik.length) return;
        sw.jenis[jn] = {
          key: jn, nama: NAMA_JENIS[jn], survei: true, topik, persen: rataArr(items.map(it => it.h.total)),
          ujian: items.map(it => ({ id: it.d.u.id, judul: it.d.u.judul, nilai: it.h.total })),
          perluCek: items.filter(it => it.r.kualitas && it.r.kualitas.baik === false).length,
          nKurang: topik.filter(t => t.level === 'kurang').length, nCukup: topik.filter(t => t.level === 'cukup').length, nBaik: topik.filter(t => t.level === 'baik').length
        };
      });
    });
    return daftar;
  }
  // kolom jenis pada tabel / ekspor sesuai filter Jenis
  const kolomJenis = () => G.jenis === 'semua' ? ['literasi', 'numerasi', 'karakter', 'sulingjar'].concat(G.siswa.some(s => s.jenis.lainnya) ? ['lainnya'] : []) : [G.jenis];

  const jenisAktif = () => G.jenis === 'semua' ? URUT_JENIS : [G.jenis];
  const kelasList = () => [...new Set(G.siswa.map(s => String(s.kelas || '-').trim()))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  function barisSiswa() {
    const q = norm(($('am-g-cari') || {}).value);
    const hanyaKurang = !!($('am-g-hanya') && $('am-g-hanya').checked);
    const js = jenisAktif();
    const rows = [];
    G.siswa.forEach(sw => {
      if (G.kelas && String(sw.kelas || '-').trim() !== G.kelas) return;
      if (q && norm(sw.nama).indexOf(q) < 0) return;
      const ada = js.filter(k => sw.jenis[k]);
      if (!ada.length) return;
      const kurang = [];
      ada.forEach(k => sw.jenis[k].topik.forEach(t => { if (t.level === 'kurang') kurang.push({ t, k }); }));
      kurang.sort((a, b) => a.t.persen - b.t.persen);
      if (hanyaKurang && !kurang.length) return;
      rows.push({ sw, kurang });
    });
    rows.sort((a, b) => b.kurang.length - a.kurang.length || String(a.sw.nama).localeCompare(String(b.sw.nama), 'id'));
    return rows;
  }
  function barisMateri() {
    const q = norm(($('am-g-cari') || {}).value);
    const js = jenisAktif(), peta = new Map();
    G.siswa.forEach(sw => {
      if (G.kelas && String(sw.kelas || '-').trim() !== G.kelas) return;
      js.forEach(k => {
        const J = sw.jenis[k]; if (!J) return;
        J.topik.forEach(t => {
          const kk = k + '|' + t.key;
          let m = peta.get(kk);
          if (!m) { m = { key: kk, label: t.label, jenis: k, kode: t.kode, siswa: [] }; peta.set(kk, m); }
          m.siswa.push({ nama: sw.nama, kelas: sw.kelas, persen: t.persen, level: t.level });
        });
      });
    });
    const rows = [...peta.values()].map(m => {
      m.n = m.siswa.length;
      m.rata = m.siswa.reduce((a, s) => a + s.persen, 0) / m.n;
      m.kurang = m.siswa.filter(s => s.level === 'kurang').sort((a, b) => a.persen - b.persen);
      m.level = levelUntuk(m.jenis, m.rata);
      return m;
    }).filter(m => !q || norm(m.label).indexOf(q) >= 0);
    rows.sort((a, b) => a.rata - b.rata || a.label.localeCompare(b.label, 'id'));
    return rows;
  }

  function chips(wadah, daftar, aktif, fnName) {
    wadah.innerHTML = daftar.map(([v, t]) => `<button type="button" class="am-chip${String(aktif) === String(v) ? ' on' : ''}" data-v="${esc(v)}" onclick="AnalisisMateri.${fnName}(this.dataset.v)">${esc(t)}</button>`).join('');
  }
  function sel(persen, jenis) {
    const lv = levelUntuk(jenis, persen), sv = adalahSurvei(jenis);
    return `<td class="am-sk">${bulat(persen)}${sv ? '' : '%'}<span class="am-bar"><i class="${lv}" style="width:${Math.max(2, bulat(persen))}%"></i></span></td>`;
  }

  function render() {
    if (!$('am-g-tabel')) return;
    const scope = $('tab-analisis-materi');
    if (scope) scope.classList.add('am-scope');
    const adaLain = G.siswa.some(s => s.jenis.lainnya);
    chips($('am-g-chips-jenis'), [['semua', 'Semua'], ['literasi', 'Literasi'], ['numerasi', 'Numerasi'], ['karakter', 'Survei Karakter'], ['sulingjar', 'Sulingjar']].concat(adaLain ? [['lainnya', 'Mapel Lain']] : []), G.jenis, 'pilihJenisGuru');
    chips($('am-g-chips-kelas'), [['', 'Semua Kelas']].concat(kelasList().map(k => [k, k])), G.kelas, 'pilihKelas');
    chips($('am-g-chips-tampil'), [['siswa', 'Per Siswa'], ['materi', 'Per Materi']], G.tampil, 'pilihTampil');

    const rows = barisSiswa(), materi = barisMateri();
    const nAnalisis = rows.length, nKurang = rows.filter(r => r.kurang.length).length;
    let sumP = 0, cnt = 0;
    rows.forEach(r => jenisAktif().forEach(k => { const J = r.sw.jenis[k]; if (J) { sumP += J.persen; cnt++; } }));
    const lemah = materi[0];
    $('am-g-stats').innerHTML = `<div class="am-stats">
      <div class="am-stat"><b>${nAnalisis}</b><span>Siswa dianalisis</span></div>
      <div class="am-stat"><b>${cnt ? bulat(sumP / cnt) + '%' : '–'}</b><span>Rata-rata penguasaan</span></div>
      <div class="am-stat"><b>${nKurang}${nAnalisis ? ` <small style="font-size:.8rem;font-weight:600;color:var(--c-muted)">(${bulat(nKurang / nAnalisis * 100)}%)</small>` : ''}</b><span>Siswa dengan materi kurang</span></div>
      <div class="am-stat"><b style="font-size:1rem;line-height:1.35">${lemah ? esc(lemah.label) : '–'}</b><span>${lemah ? 'Materi paling lemah (' + bulat(lemah.rata) + '%)' : 'Materi paling lemah'}</span></div></div>`;
    if ($('am-g-info')) $('am-g-info').textContent = G.tampil === 'siswa' ? rows.length + ' siswa' : materi.length + ' materi';

    if (!G.siswa.length) {
      $('am-g-tabel').innerHTML = `<div class="am-kosongan"><i class="fa-solid fa-chart-column"></i>Belum ada hasil tes atau survei siswa yang bisa dianalisis. Analisis tes muncul setelah siswa menyelesaikan ujian yang soal-soalnya sudah diberi <b>Topik</b>; Survei Karakter dan Sulingjar muncul setelah siswa mengisi survei.</div>`;
      return;
    }
    if (G.tampil === 'materi') {
      if (!materi.length) { $('am-g-tabel').innerHTML = '<p class="subtitle">Tidak ada materi yang cocok dengan filter ini.</p>'; return; }
      $('am-g-tabel').innerHTML = `<div class="am-scroll"><table class="am-table"><thead><tr><th>#</th><th>Materi</th><th>Jenis</th><th>Rata-rata</th><th>Siswa kurang</th><th>Tindak lanjut</th></tr></thead><tbody>` +
        materi.map((m, i) => {
          const frak = m.kurang.length / m.n;
          let tl = !m.kurang.length ? 'Aman, pertahankan.' : (frak >= 0.4 ? 'Banyak siswa kurang: pertimbangkan membahas ulang secara klasikal.' : 'Remedial kelompok kecil untuk siswa yang kurang.');
          if (adalahSurvei(m.jenis)) {
            tl = !m.kurang.length ? 'Aman, pertahankan.' : (frak >= 0.4 ? 'Banyak siswa perlu perhatian pada dimensi ini.' : 'Pendampingan untuk siswa yang bersangkutan.');
            const sr = (typeof Survei !== 'undefined' && Survei.saranDim && m.kurang.length) ? Survei.saranDim(m.jenis, m.kode, 'kelas') : '';
            if (sr) tl += '<br><span class="am-muted">' + esc(sr) + '</span>';
          }
          return `<tr><td>${i + 1}</td><td class="am-nama">${esc(m.label)}</td><td>${esc(NAMA_JENIS[m.jenis])}</td>${sel(m.rata, m.jenis)}
            <td>${m.kurang.length ? `<details class="am-sis"><summary>${m.kurang.length} dari ${m.n} siswa</summary><div>${m.kurang.map(s => `${esc(s.nama)} (${esc(s.kelas)}) — ${bulat(s.persen)}%`).join('<br>')}</div></details>` : `0 dari ${m.n} siswa`}</td>
            <td style="min-width:200px;font-size:.82rem">${tl}</td></tr>`;
        }).join('') + `</tbody></table></div>`;
      return;
    }
    if (!rows.length) { $('am-g-tabel').innerHTML = '<p class="subtitle">Tidak ada siswa yang cocok dengan filter ini.</p>'; return; }
    const kol = kolomJenis();
    const kep = (k) => G.jenis === 'semua' ? `<b>${HURUF_JENIS[k]}</b> ` : '';
    $('am-g-tabel').innerHTML = `<div class="am-scroll"><table class="am-table"><thead><tr><th>#</th><th>Nama Siswa</th><th>Kelas</th>${kol.map(k => `<th>${esc(NAMA_JENIS[k])}</th>`).join('')}<th>Materi yang kurang</th><th></th></tr></thead><tbody>` +
      rows.map((r, i) => {
        const J = r.sw.jenis;
        const sk = (k) => J[k] ? sel(J[k].persen, k) : '<td class="am-sk am-muted">–</td>';
        const chipKurang = r.kurang.length
          ? `<div class="am-kurang">` + r.kurang.slice(0, 4).map(x => `<span class="am-tag kurang" title="${esc(NAMA_JENIS[x.k])}: ${bulat(x.t.persen)}${adalahSurvei(x.k) ? '' : '%'}">${kep(x.k)}${esc(x.t.label)} ${bulat(x.t.persen)}${adalahSurvei(x.k) ? '' : '%'}</span>`).join('') + (r.kurang.length > 4 ? `<span class="am-tag cukup">+${r.kurang.length - 4} lagi</span>` : '') + `</div>`
          : '<span class="am-tag baik">Tidak ada</span>';
        return `<tr><td>${i + 1}</td><td class="am-nama">${esc(r.sw.nama)}</td><td>${esc(r.sw.kelas)}</td>${kol.map(sk).join('')}<td>${chipKurang}</td>
          <td style="white-space:nowrap"><button type="button" class="am-btn" data-id="${esc(r.sw.id)}" onclick="AnalisisMateri.detail(this.dataset.id)"><i class="fa-solid fa-magnifying-glass-chart"></i> Detail</button> <button type="button" class="am-btn" title="Unduh laporan PDF siswa ini" data-id="${esc(r.sw.id)}" onclick="LaporanPdf.buka(this.dataset.id)"><i class="fa-solid fa-file-pdf"></i> PDF</button></td></tr>`;
      }).join('') + `</tbody></table></div>${G.surveiGalat ? '<p class="subtitle" style="margin-top:.6rem">⚠ Sebagian data survei gagal dimuat; klik Segarkan untuk mencoba lagi.</p>' : ''}`;
  }
  const pilihJenisGuru = (v) => { G.jenis = v; render(); };
  const pilihKelas = (v) => { G.kelas = v; render(); };
  const pilihTampil = (v) => { G.tampil = v; render(); };

  // ---------------- detail satu siswa (modal) ----------------
  function pastikanModal() {
    if ($('modal-am-detail')) return;
    const d = document.createElement('div');
    d.id = 'modal-am-detail'; d.className = 'modal-backdrop hidden am-scope';
    d.setAttribute('onclick', 'if(event.target===this)AnalisisMateri.tutupDetail()');
    d.innerHTML = `<div class="modal modal-wide">
      <h3 style="margin:0 0 .15rem" id="am-d-nama">-</h3>
      <p class="subtitle" style="margin:0 0 .6rem" id="am-d-sub"></p>
      <div class="am-chips" id="am-d-chips"></div>
      <div class="am-dbody" id="am-d-isi"></div>
      <div class="toolbar-actions" style="justify-content:flex-end;margin-top:.7rem"><button type="button" class="secondary" onclick="LaporanPdf.buka(AnalisisMateri.idDetail())"><i class="fa-solid fa-file-pdf"></i> Unduh PDF</button><button type="button" class="secondary" onclick="AnalisisMateri.tutupDetail()">Tutup</button></div></div>`;
    document.body.appendChild(d);
  }
  let detailJenis = '';
  function detail(id) {
    const sw = G.siswa.find(s => String(s.id) === String(id)); if (!sw) return;
    pastikanModal();
    G.detailId = id;
    $('am-d-nama').textContent = sw.nama;
    $('am-d-sub').textContent = 'Kelas ' + sw.kelas + ' — materi yang kurang beserta saran belajar untuk siswa ini.';
    const ada = URUT_JENIS.filter(k => sw.jenis[k]);
    detailJenis = ada.includes(G.jenis) ? G.jenis : (ada.find(k => sw.jenis[k].nKurang) || ada[0] || '');
    renderDetail();
    $('modal-am-detail').classList.remove('hidden');
  }
  function renderDetail() {
    const sw = G.siswa.find(s => String(s.id) === String(G.detailId)); if (!sw) return;
    const ada = URUT_JENIS.filter(k => sw.jenis[k]);
    $('am-d-chips').innerHTML = ada.map(k => `<button type="button" class="am-chip${detailJenis === k ? ' on' : ''}" onclick="AnalisisMateri.pilihDetailJenis('${k}')">${NAMA_JENIS[k]} (${bulat(sw.jenis[k].persen)}%)</button>`).join('');
    $('am-d-isi').innerHTML = detailJenis && sw.jenis[detailJenis] ? htmlJenis(sw.jenis[detailJenis]) : '<p class="subtitle">Belum ada data.</p>';
  }
  const pilihDetailJenis = (k) => { detailJenis = k; renderDetail(); };
  function tutupDetail() { const m = $('modal-am-detail'); if (m) m.classList.add('hidden'); }

  // ---------------- unduh Excel ----------------
  const labelTingkat = (jenis, lv) => labelLevel(jenis, lv);
  async function unduh() {
    const rows = barisSiswa(), materi = barisMateri();
    if (!rows.length) { toast('Belum ada data Analisis Materi untuk diunduh.', 'error'); return; }
    try { await muatPustaka_('xlsx'); } catch (e) { toast(e.message, 'error'); return; }
    const kol = kolomJenis();
    const wb = XLSX.utils.book_new(), terpakai = new Set();
    const lebar = (ws, arr) => { ws['!cols'] = arr.map(w => ({ wch: w })); return ws; };
    const nilai = (J) => J ? Math.round(J.persen * 10) / 10 : '';
    const ringkas = (r, k) => r.kurang.filter(x => x.k === k).map(x => `${x.t.label} (${bulat(x.t.persen)}${adalahSurvei(k) ? '' : '%'})`).join('; ');
    const head1 = ['No', 'Nama Siswa', 'Kelas'].concat(kol.map(k => NAMA_JENIS[k] + (adalahSurvei(k) ? ' (nilai)' : ' (%)')), ['Jumlah Materi Kurang'], kol.map(k => 'Kurang - ' + NAMA_JENIS[k]));
    const d1 = rows.map((r, i) => [i + 1, r.sw.nama, r.sw.kelas].concat(kol.map(k => nilai(r.sw.jenis[k])), [r.kurang.length], kol.map(k => ringkas(r, k))));
    XLSX.utils.book_append_sheet(wb, lebar(XLSX.utils.aoa_to_sheet([head1, ...d1]), [5, 30, 9].concat(kol.map(() => 14), [14], kol.map(() => 50))), namaSheetUnik_('Per Siswa', terpakai));
    const d2 = materi.map((m, i) => [i + 1, m.label, NAMA_JENIS[m.jenis], Math.round(m.rata * 10) / 10, m.n, m.kurang.length, m.kurang.map(s => `${s.nama} (${s.kelas}) ${bulat(s.persen)}${adalahSurvei(m.jenis) ? '' : '%'}`).join('; ')]);
    XLSX.utils.book_append_sheet(wb, lebar(XLSX.utils.aoa_to_sheet([['No', 'Materi / Dimensi', 'Jenis', 'Rata-rata', 'Jumlah Siswa', 'Siswa Kurang', 'Daftar Siswa Kurang'], ...d2]), [5, 45, 16, 12, 13, 13, 90]), namaSheetUnik_('Per Materi', terpakai));
    const d3 = [];
    rows.forEach(r => kol.forEach(k => { const J = r.sw.jenis[k]; if (!J) return; J.topik.forEach(t => d3.push([r.sw.nama, r.sw.kelas, NAMA_JENIS[k], t.label, adalahSurvei(k) ? '' : t.benar, adalahSurvei(k) ? '' : t.n, Math.round(t.persen * 10) / 10, labelTingkat(k, t.level)])); }));
    XLSX.utils.book_append_sheet(wb, lebar(XLSX.utils.aoa_to_sheet([['Nama Siswa', 'Kelas', 'Jenis', 'Materi / Dimensi', 'Soal Benar', 'Jumlah Soal', 'Penguasaan / Nilai', 'Tingkat'], ...d3]), [30, 9, 16, 45, 11, 12, 18, 16]), namaSheetUnik_('Detail Materi', terpakai));
    const bersih = (t) => String(t).replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 50);
    XLSX.writeFile(wb, 'analisis-materi-' + (G.jenis === 'semua' ? 'semua' : G.jenis) + '-' + (G.kelas ? bersih(G.kelas) : 'semua-kelas') + '.xlsx');
    toast('Analisis Materi ' + rows.length + ' siswa berhasil diunduh.', 'success');
  }

  // ---------------- cetak / PDF (daftar ringkas tampilan saat ini; laporan per siswa ada di LaporanPdf) ----------------
  function cetak() {
    const rows = barisSiswa(), materi = barisMateri();
    if (!rows.length) { toast('Belum ada data Analisis Materi untuk dicetak.', 'error'); return; }
    const { namaSekolah, kop } = Guru._identitasSekolah_();
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const kol = kolomJenis();
    const pj = (r, k) => r.sw.jenis[k] ? bulat(r.sw.jenis[k].persen) + (adalahSurvei(k) ? '' : '%') : '–';
    const perSiswa = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.sw.nama)}</td><td>${esc(r.sw.kelas)}</td>${kol.map(k => `<td>${pj(r, k)}</td>`).join('')}<td>${r.kurang.length ? r.kurang.map(x => esc(x.t.label) + ' (' + bulat(x.t.persen) + (adalahSurvei(x.k) ? '' : '%') + ')').join('; ') : '-'}</td></tr>`).join('');
    const perMateri = materi.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.label)}</td><td>${esc(NAMA_JENIS[m.jenis])}</td><td>${bulat(m.rata)}${adalahSurvei(m.jenis) ? '' : '%'}</td><td>${m.kurang.length} / ${m.n}</td></tr>`).join('');
    const html = `${kop}
      <h2 class="cp-judul">Analisis Materi Siswa</h2>
      <table class="cp-info"><tbody>
        <tr><th>Jenis</th><td>: ${G.jenis === 'semua' ? 'Semua' : esc(NAMA_JENIS[G.jenis])}</td><th>Kelas</th><td>: ${G.kelas ? esc(G.kelas) : 'Seluruh kelas'}</td></tr>
        <tr><th>Peserta</th><td>: ${rows.length} siswa</td><th>Tanggal</th><td>: ${esc(waktu)}</td></tr></tbody></table>
      <table class="am-print"><thead><tr><th style="width:5%">No</th><th style="width:20%">Nama Siswa</th><th style="width:7%">Kelas</th>${kol.map(k => `<th>${esc(NAMA_JENIS[k])}</th>`).join('')}<th>Materi yang kurang</th></tr></thead><tbody>${perSiswa}</tbody></table>
      <h3 style="margin:14px 0 4px">Rekap per Materi / Dimensi</h3>
      <table class="am-print"><thead><tr><th style="width:5%">No</th><th>Materi / Dimensi</th><th style="width:14%">Jenis</th><th style="width:11%">Rata-rata</th><th style="width:14%">Siswa kurang</th></tr></thead><tbody>${perMateri}</tbody></table>
      <p class="am-catatan">Tes: penguasaan = skor diperoleh / skor maksimal soal pada materi (kurang &lt; ${TH_KURANG}%, cukup ${TH_KURANG}–${TH_BAIK - 1}%, baik ≥ ${TH_BAIK}%). Survei Karakter &amp; Sulingjar: nilai dimensi 0–100 (perlu perhatian &lt; 50, sedang 50–74, baik ≥ 75). Bila satu tes dikerjakan lebih dari sekali, dipakai percobaan terakhir.</p>
      <footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`;
    Guru._cetakArea_(html, ['Analisis Materi', G.jenis === 'semua' ? 'Semua' : NAMA_JENIS[G.jenis], G.kelas || 'Semua Kelas'].join(' - '));
  }

  // ============================================================================================
  // PEMASANGAN KE APLIKASI
  // ============================================================================================
  function buka() { if (!G.dimuat || Date.now() - G.waktu > 60000) muat(); else render(); }
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) {
    _gantiTab.call(UI, tabId);
    if (tabId === 'tab-analisis-materi') buka();
  };
  return { bukaSiswa, pilihJenis, resetJenis, kembali, setDataSiswa, renderSiswa, ringkasSiswa, jenisDari, htmlJenis, NAMA_JENIS, URUT_JENIS, LABEL_LEVEL, LABEL_LEVEL_SV, labelLevel, levelUntuk, adalahSurvei, kelasList, saranPlain, idDetail: () => G.detailId, dataLaporan: () => ({ siswa: G.siswa, prog: G.prog, tes: G.tesGlobal, kelas: G.kelas, jenis: G.jenis, dimuat: G.dimuat }), muatData: (t) => muat(t), buka, muat, render, pilihJenisGuru, pilihKelas, pilihTampil, detail, pilihDetailJenis, tutupDetail, unduh, cetak, _olah: olah, _saran: saranUntuk };
})();
