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
.sv-s4 { background: #e3f6ec; color: #1b7f4b; } .sv-s3 { background: #eaf6e3; color: #4b7f1b; } .sv-s2 { background: #fff1da; color: #b26a00; } .sv-s1 { background: #fde8e8; color: #c62828; } .sv-s0 { background: #eceff1; color: #6c757d; }
.sv-pb-saran { background: #eaf2ff; border-radius: 8px; padding: 7px 11px; font-size: .8rem; margin: 8px 0 2px; }

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
  // butir keamanan yang dijawab "Beberapa kali" / "Sering" -> ditandai agar guru bisa menindaklanjuti dengan rahasia
  const BUTIR_PERHATIAN = ['S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S18'];

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
      <div class="sv-kes-p">${guru ? 'Mengukur ketelitian mengisi (waktu baca, variasi, konsistensi), bukan benar/salah. Nilai rendah berarti nilai survei siswa ini kurang dapat dipercaya.' : 'Nilai ini mengukur ketelitian Anda mengisi, bukan benar/salah. Jawab jujur dan teliti agar hasil survei sekolah mencerminkan keadaan sebenarnya.'}</div>${q.alasan && q.alasan.length ? `<div class="sv-kes-a">${esc(q.alasan.join('; '))}</div>` : ''}</div></div>`;
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
    const nav = $('sv-nav');
    if (S.tahap === 'intro') {
      $('sv-nomor').textContent = 'Petunjuk Pengerjaan';
      box.innerHTML = `<div class="sv-pad"><div class="sv-intro"><i class="fa-solid ${J.ikon}"></i><h3>${esc(J.nama)}</h3></div>
        <p class="sv-p">Terima kasih telah menyelesaikan tes. Selanjutnya Anda diminta mengisi <b>${esc(J.nama)}</b> sebanyak <b>${total} butir</b>${adaMatriks() ? ' dalam <b>' + hl.length + ' halaman</b>' : ''}.</p>
        <ul class="sv-ul"><li><b>Tidak ada jawaban yang benar atau salah.</b> Pilihlah jawaban yang paling menggambarkan keadaan Anda yang sebenarnya, bukan jawaban yang menurut Anda &quot;paling baik&quot;.</li>
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
      nav.innerHTML = `<button type="button" class="anbk-btn anbk-btn-red" ${S.idx === 0 ? 'disabled' : ''} onclick="Survei.geser(-1)"><i class="fa-solid fa-circle-chevron-left"></i> <span>${adaMatriks() ? 'Halaman' : 'Butir'} sebelumnya</span></button>
        <label class="anbk-btn anbk-btn-yellow anbk-ragu" title="Ragu-ragu"><input type="checkbox" id="sv-chk-ragu" ${S.ragu[S.idx] ? 'checked' : ''} onchange="Survei.toggleRagu()"><span>Ragu-ragu</span></label>
        <button type="button" class="anbk-btn anbk-btn-primary" id="sv-btn-next" ${halLengkap(p) ? '' : 'disabled'} onclick="Survei.geser(1)"><span>${akhir ? 'Selesai' : (adaMatriks() ? 'Halaman' : 'Butir') + ' berikutnya'}</span> <i class="fa-solid ${akhir ? 'fa-flag-checkered' : 'fa-circle-chevron-right'}"></i></button>`;
    } else if (S.tahap === 'konfirmasi') {
      $('sv-nomor').textContent = 'Konfirmasi Survei';
      const kosong = J.butir.map((r, i) => [r[0], i]).filter(x => !S.jawaban[x[0]]);
      const raguList = Object.keys(S.ragu).map(Number).filter(i => i < hl.length).sort((a, b) => a - b);
      box.innerHTML = `<div class="sv-pad"><p class="sv-p">Terima kasih telah mengisi survei ini. Tekan tombol <mark class="anbk-mark anbk-mark-red">SELESAI SURVEI</mark> untuk mengirim jawaban, atau <mark class="anbk-mark anbk-mark-green">KEMBALI</mark> untuk memeriksa jawaban Anda.</p>
        <div class="anbk-ringkas"><span>Terjawab <b>${jml}</b></span><span>Belum dijawab <b>${kosong.length}</b></span><span>Ragu-ragu <b>${raguList.length}</b></span></div>
        ${raguList.length ? `<div class="anbk-peringatan"><p>${raguList.length} ${adaMatriks() ? 'halaman' : 'butir'} masih ditandai ragu-ragu. Anda boleh memeriksanya kembali sebelum mengirim.</p><div class="kumpul-chips">${raguList.map(i => `<button type="button" class="kumpul-chip" onclick="Survei.lompat(${i})">${i + 1}</button>`).join('')}</div></div>` : ''}
        ${kosong.length ? `<div class="anbk-peringatan"><p>Masih ada butir yang belum dijawab. Semua butir wajib dijawab.</p><div class="kumpul-chips">${kosong.map(x => `<button type="button" class="kumpul-chip" onclick="Survei.lompatButir(${x[1]})">${x[1] + 1}</button>`).join('')}</div></div>` : ''}</div>`;
      nav.innerHTML = `<button type="button" class="anbk-btn anbk-btn-green" onclick="Survei.lompat(${Math.min(S.idx, hl.length - 1)})">KEMBALI</button><span></span>
        <button type="button" class="anbk-btn anbk-btn-red" ${kosong.length ? 'disabled' : ''} id="sv-btn-kirim" onclick="Survei.kirim()">SELESAI SURVEI</button>`;
    }
    window.scrollTo(0, 0);
  }

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
    if (to >= hl.length) { catatWaktuButir(); S.tahap = 'konfirmasi'; S.tMasuk = 0; render(); return; }
    masukHalaman(to);
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
  function mulai() { masukHalaman(0); }

  function tampilPeringatan(q) {
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'sv-modal-bg';
      el.innerHTML = `<div class="sv-modal" role="alertdialog" aria-modal="true"><div class="sv-modal-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Periksa kembali jawaban Anda</h3>
        <p>Jawaban Anda terlihat kurang teliti. Perkiraan <b>Nilai Kesungguhan</b> Anda saat ini: <b style="color:${kategoriKesungguhan(q.nilai).warna}">${q.nilai}</b> (${kategoriKesungguhan(q.nilai).label}).</p><ul>${q.alasan.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
        <p>Ingat: <b>tidak ada jawaban benar atau salah</b>. Bacalah tiap pernyataan, lalu pilih yang paling menggambarkan keadaan Anda sebenarnya.</p>
        <div class="sv-modal-aksi"><button type="button" class="anbk-btn anbk-btn-green" data-a="ulang">PERIKSA KEMBALI</button><button type="button" class="anbk-btn anbk-btn-red" data-a="kirim">TETAP KIRIM</button></div></div>`;
      el.addEventListener('click', ev => { const a = ev.target.closest('[data-a]'); if (!a) return; el.remove(); res(a.dataset.a); });
      document.body.appendChild(el);
    });
  }

  async function kirim() {
    if (S.kirimBusy) return; S.kirimBusy = true;
    try {
      const J = S.set;
      const kualitas = periksaKualitas(S.jenis, S.jawaban, S.detik, S.set);
      if (!kualitas.baik && !S.diingatkan) {
        S.diingatkan = true;
        const pilihan = await tampilPeringatan(kualitas);
        if (pilihan === 'ulang') { lompat(0); return; }
      }
      const durasi = Math.round((Date.now() - S.mulai) / 1000);
      const btn = $('sv-btn-kirim'); if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }
      let res = null;
      for (let k = 1; k <= 4; k++) {
        try { res = await api('simpanSurvei', { sesiId: S.sesiId, siswaId: state.user.id, jenis: S.jenis, jawaban: JSON.stringify(S.jawaban), durasiDetik: durasi, kualitas: JSON.stringify({ baik: kualitas.baik, alasan: kualitas.alasan, rataDetik: kualitas.rataDetik, nilai: kualitas.nilai, komponen: kualitas.komponen }) }); } catch (e) { res = null; }
        if (res && res.ok) break;
        await new Promise(r => setTimeout(r, 900 * k));
      }
      if (!res || !res.ok) { toast((res && res.error) || 'Survei belum terkirim. Periksa koneksi lalu coba lagi.', 'error'); if (btn) { btn.disabled = false; btn.textContent = 'SELESAI SURVEI'; } return; }
      try { sessionStorage.removeItem('cbt_survei_' + S.sesiId); } catch (e) { }
      S.kualitasAkhir = { baik: kualitas.baik, alasan: kualitas.alasan, rataDetik: kualitas.rataDetik, nilai: kualitas.nilai, komponen: kualitas.komponen };
      S.selesai && S.selesai(res);
    } finally { S.kirimBusy = false; }
  }

  // Dipanggil sebelum layar nilai tampil. Mengembalikan Promise yang selesai setelah survei terkirim (atau tidak diperlukan).
  async function jalankanBila() {
    if (!state.user || state.user.role !== 'siswa' || !state.sesiId) return;
    let info = null;
    try { info = await api('getSurveiSesi', { sesiId: state.sesiId, siswaId: state.user.id }); } catch (e) { info = null; }
    if (!info || !info.ok || !info.jenis || info.sudah || !JENIS[info.jenis]) return;
    let simpan = null; try { simpan = JSON.parse(sessionStorage.getItem('cbt_survei_' + state.sesiId) || 'null'); } catch (e) { }
    Object.assign(S, { jenis: info.jenis, set: bangunSet(info.jenis, info.set), sesiId: state.sesiId, jawaban: (simpan && simpan.j) || {}, detik: (simpan && simpan.d) || {}, idx: 0, tahap: 'intro', mulai: Date.now(), tMasuk: 0, diingatkan: false, kirimBusy: false, dikunjungi: {}, ragu: (simpan && simpan.r) || {}, tampilHasil: !!info.tampilHasil });
    const sc = $('survei-screen'); if (!sc) return;
    try { KumpulUI.sembunyikanSemua(); } catch (e) { }
    UI.tampilkan('survei-screen');
    const anticheat = $('anticheat-warning'); if (anticheat) anticheat.classList.add('hidden');
    render();
    await new Promise(resolve => {
      S.selesai = async (res) => {
        S.selesai = null;
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
        const baris = J.dim.map(d => { const x = h.dim[d[0]]; const k = kategoriIndeks(x.indeks); return `<div class="sv-bar"><div class="sv-bar-t"><span>${esc(d[1])}</span><b style="color:${k.warna}">${x.indeks === null ? '-' : String(x.indeks).replace('.', ',')}</b></div><div class="sv-bar-b"><i style="width:${x.indeks || 0}%;background:${k.warna}"></i></div><small style="color:${k.warna}">${k.label}</small></div>`; }).join('');
        const total = S.jenis === 'karakter' ? `<div class="sv-total">Nilai Survei Karakter: <b>${String(h.total).replace('.', ',')}</b></div>` : '';
        indeks = `<p class="sv-ket">Nilai survei (0–100) ini untuk latihan agar siswa menjawab jujur dan teliti. Pada ANBK/TKA sesungguhnya, siswa tidak melihat hasil survei.</p>${total}<div class="sv-bars">${baris}</div>`;
      }
      $('sv-nomor').textContent = 'Survei Terkirim';
      $('sv-progres').textContent = 'Selesai';
      $('sv-body').innerHTML = `<div class="sv-pad"><p class="sv-p"><i class="fa-solid fa-circle-check" style="color:#1b7f4b"></i> Survei Anda sudah terkirim. Terima kasih.</p>${htmlKesungguhan(S.kualitasAkhir, false)}${indeks}</div>`;
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
    return G.data.filter(r => (!kls || r.kelas === kls) && (!q || String(r.nama).toLowerCase().indexOf(q) >= 0));
  }

  function hitungBaris(r) {
    if (!r._h) { r._h = hitung(G.jenis, r.jawaban, G.set); const q = r.kualitas || {}; r._q = { baik: q.baik !== false, alasan: Array.isArray(q.alasan) ? q.alasan : [] }; }
    return r;
  }

  function guruRender() {
    const J = G.set; const cont = $('tabel-survei'); const ring = $('ringkas-survei');
    if (!J) { cont.innerHTML = ''; ring.innerHTML = ''; return; }
    const rows = guruSaring().map(hitungBaris);
    if (!rows.length) { ring.innerHTML = ''; cont.innerHTML = '<p class="subtitle">Belum ada siswa yang mengisi survei' + (G.belum ? ' (' + G.belum + ' siswa selesai tes tetapi belum mengisi survei)' : '') + '.</p>'; return; }
    // rata-rata per dimensi
    const rata = {}; J.dim.forEach(d => { const v = rows.map(r => r._h.dim[d[0]].indeks).filter(x => x !== null); rata[d[0]] = v.length ? bulat2(v.reduce((a, b) => a + b, 0) / v.length) : null; });
    const totalKelas = bulat2(rows.map(r => r._h.total).reduce((a, b) => a + b, 0) / rows.length);
    const kartu = J.dim.map(d => { const k = kategoriIndeks(rata[d[0]]); return `<div class="sv-kartu"><div class="sv-kartu-t">${esc(d[1])}</div><div class="sv-kartu-n" style="color:${k.warna}">${fmt(rata[d[0]])}</div><div class="sv-bar-b"><i style="width:${rata[d[0]] || 0}%;background:${k.warna}"></i></div><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${k.label}</span></div>`; }).join('');
    // butir terendah (rata-rata skor 1-4 -> indeks)
    const butir = J.butir.map(b => { const v = rows.map(r => r._h.butir[b[0]]).filter(x => x !== undefined); return { b, m: v.length ? bulat2(((v.reduce((a, c) => a + c, 0) / v.length) - 1) / 3 * 100) : null }; }).filter(x => x.m !== null).sort((a, c) => a.m - c.m).slice(0, 5);
    const lemah = `<div class="sv-lemah"><b>5 butir dengan nilai terendah (bahan perbaikan)</b><ol>${butir.map(x => `<li><span>${esc(x.b[4])}</span> <em>${esc(J.dimNama[x.b[1]])}</em> <b style="color:${kategoriIndeks(x.m).warna}">${fmt(x.m)}</b></li>`).join('')}</ol></div>`;
    const perhatian = G.jenis === 'sulingjar' ? rows.filter(r => BUTIR_PERHATIAN.some(id => Number(r.jawaban[id]) >= 3)).length : 0;
    ring.innerHTML = `<div class="sv-info"><span><b>${rows.length}</b> siswa mengisi</span>${G.belum ? `<span><b>${G.belum}</b> belum mengisi</span>` : ''}<span><b>${rows.filter(r => !r._q.baik).length}</b> pengisian perlu dicek</span>${(() => { const v = rows.map(r => r.kualitas && r.kualitas.nilai).filter(x => x !== undefined && x !== null); return v.length ? `<span>Rata-rata Nilai Kesungguhan <b>${fmt(bulat2(v.reduce((a, c) => a + c, 0) / v.length))}</b></span>` : ''; })()}<span>Rata-rata nilai survei <b>${fmt(totalKelas)}</b></span>${perhatian ? `<span class="sv-warn"><i class="fa-solid fa-circle-exclamation"></i> <b>${perhatian}</b> siswa melaporkan pengalaman tidak aman (beberapa kali/sering)</span>` : ''}</div><div class="sv-kartu-wrap">${kartu}</div>${htmlEvaluasi(rows, J, rata)}${htmlPerKelas(rows, J)}${lemah}<p class="subtitle" style="margin:.4rem 0">Nilai survei skala 0–100 (makin tinggi makin baik; jawaban terbaik = skor 4). Kategori Baik ≥ 75, Sedang 50–74,99, Perlu perhatian &lt; 50 hanyalah acuan latihan.</p>`;
    const th = J.dim.map(d => `<th title="${esc(d[1])}">${esc(d[1].length > 22 ? d[1].slice(0, 20) + '…' : d[1])}</th>`).join('');
    cont.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>No</th><th>Nama</th><th>Kelas</th>${th}<th>${G.jenis === 'karakter' ? 'Nilai Survei Karakter' : 'Nilai Sulingjar'}</th><th>Waktu</th><th>Nilai Kesungguhan</th><th>Kualitas Pengisian</th>${G.jenis === 'sulingjar' ? '<th>Catatan</th>' : ''}</tr></thead><tbody>${rows.map((r, i) => {
      const sel = J.dim.map(d => { const x = r._h.dim[d[0]].indeks; const k = kategoriIndeks(x); return `<td><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(x)}</span></td>`; }).join('');
      const cat = G.jenis === 'sulingjar' ? `<td>${BUTIR_PERHATIAN.filter(id => Number(r.jawaban[id]) >= 3).length ? '<span class="badge no" title="Menjawab Beberapa kali/Sering pada butir pengalaman tidak aman. Tindak lanjuti secara rahasia.">Perlu tindak lanjut</span>' : '-'}</td>` : '';
      return `<tr><td>${i + 1}</td><td>${esc(r.nama)}</td><td>${esc(r.kelas)}</td>${sel}<td><b>${fmt(r._h.total)}</b></td><td>${r.durasi ? Math.floor(r.durasi / 60) + ' mnt ' + (r.durasi % 60) + ' dtk' : '-'}</td><td>${r.kualitas && r.kualitas.nilai !== undefined ? `<span class="sv-lencana" style="background:${kategoriKesungguhan(r.kualitas.nilai).latar};color:${kategoriKesungguhan(r.kualitas.nilai).warna}" title="${kategoriKesungguhan(r.kualitas.nilai).label}">${r.kualitas.nilai}</span>` : '-'}</td><td>${r._q.baik ? '<span class="badge ok">Baik</span>' : `<span class="badge no" title="${esc(r._q.alasan.join('; '))}">Perlu dicek</span>`}</td>${cat}</tr>`;
    }).join('')}</tbody></table></div>`;
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
    const th = J.dim.map(d => `<th title="${esc(d[1])}">${esc(d[1].length > 20 ? d[1].slice(0, 18) + '…' : d[1])}</th>`).join('');
    const baris = kelas.concat(['__semua']).map(kl => {
      const sub = kl === '__semua' ? rows : rows.filter(r => r.kelas === kl); const m = rataDim(sub, J);
      const sel = J.dim.map(d => { const k = kategoriIndeks(m[d[0]]); return `<td><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(m[d[0]])}</span></td>`; }).join('');
      const kt = kategoriIndeks(m._total);
      return `<tr${kl === '__semua' ? ' class="sv-semua"' : ''}><td>${kl === '__semua' ? '<b>Semua kelas</b>' : esc(kl)}</td><td>${sub.length}</td>${sel}<td><b style="color:${kt.warna}">${fmt(m._total)}</b></td></tr>`;
    }).join('');
    return `<div class="sv-kelas"><b>Rata-rata nilai survei per kelas</b><div class="table-wrap"><table class="data-table"><thead><tr><th>Kelas</th><th>Siswa</th>${th}<th>Nilai Survei</th></tr></thead><tbody>${baris}</tbody></table></div></div>`;
  }

  async function guruUnduh() {
    const J = G.set; if (!J) { toast('Pilih ujian dulu.', 'error'); return; }
    const rows = guruSaring().map(hitungBaris); if (!rows.length) { toast('Belum ada data untuk diunduh.', 'error'); return; }
    const head = ['No', 'Nama', 'Kelas'].concat(J.dim.map(d => 'Nilai ' + d[1])).concat(G.jenis === 'karakter' ? ['Nilai Survei Karakter'] : ['Nilai Sulingjar (rata-rata)']).concat(['Durasi (detik)', 'Nilai Kesungguhan', 'Kualitas Pengisian', 'Keterangan']).concat(J.butir.map(b => b[0]));
    const data = rows.map((r, i) => [i + 1, r.nama, r.kelas].concat(J.dim.map(d => r._h.dim[d[0]].indeks)).concat([r._h.total]).concat([r.durasi || '', (r.kualitas && r.kualitas.nilai !== undefined) ? r.kualitas.nilai : '', r._q.baik ? 'Baik' : 'Perlu dicek', r._q.alasan.join('; ')]).concat(J.butir.map(b => r.jawaban[b[0]] || '')));
    // baris rata-rata (semua & per kelas) di bagian bawah lembar
    const kolKosong = (n) => new Array(Math.max(0, n)).fill('');
    const barisRata = (label, sub) => { const m = rataDim(sub, J); return ['', label, ''].concat(J.dim.map(d => m[d[0]])).concat([m._total]).concat(kolKosong(head.length - 3 - J.dim.length - 1)); };
    data.push(kolKosong(head.length));
    data.push(barisRata('RATA-RATA SEMUA SISWA (' + rows.length + ')', rows));
    Array.from(new Set(rows.map(r => r.kelas))).sort().forEach(kl => data.push(barisRata('Rata-rata kelas ' + kl, rows.filter(r => r.kelas === kl))));
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
  function headlineSurvei(jenis, h) { return { label: jenis === 'karakter' ? 'Nilai Survei Karakter' : 'Nilai Sulingjar', nilai: h.total }; }

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
      out += `<details class="sv-pb-dim" ${k.kode !== 'baik' ? 'open' : ''}><summary><span class="sv-pb-dn">${esc(d[1])}</span><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(x.indeks)} · ${k.label}</span></summary>
        <div class="sv-bar-b"><i style="width:${x.indeks}%;background:${k.warna}"></i></div>
        <p class="sv-pb-tafsir">Nilai ${esc(d[1])} ${subjek} <b>${fmt(x.indeks)}</b> (rata-rata skor ${fmt(x.rata)} dari 4) — ${TAFSIR[k.kode]}</p>
        <ul class="sv-pb-list">${butir.map(b => {
          const sk = h.butir[b[0]]; const p = jawaban[b[0]];
          const jw = p ? SKALA[b[2]][p - 1] : '-';
          return `<li><span class="sv-pb-t">${esc(b[4])}${b[3] < 0 ? ' <em>(negatif)</em>' : ''}</span><span class="sv-pb-j">Jawaban: <b>${esc(jw)}</b></span><span class="sv-skor sv-s${sk || 0}">Skor ${sk || '-'}/4</span></li>`;
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
    data.forEach(r => { const x = peta[String(r.sesiId)]; r.survei = x ? { set, jenis: res.jenis, jawaban: x.jawaban, kualitas: x.kualitas, durasi: x.durasi } : null; });
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
    return `<span class="sv-lencana" style="background:${x.kat.latar};color:${x.kat.warna}" title="${esc(tip)}">${fmt(x.nilai)} · ${x.kat.label}</span>${x.baik ? '' : ' <span class="badge no" title="Kualitas pengisian perlu dicek">⚠ dicek</span>'}${kes}`;
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
  function unduhTemplate(jenis) {
    const a = document.createElement('a'); a.href = 'template-survei-' + jenis + '.docx'; a.download = 'Template Survei ' + (jenis === 'karakter' ? 'Karakter' : 'Sulingjar') + '.docx';
    document.body.appendChild(a); a.click(); a.remove();
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

  return { toggleRagu, jenisUntukUjian, setUntukUjian, cariPaket, muatPaket, badgePaket, renderKartuKategori, bukaKategoriKelola, imporKeKategori, hapusPaket, bukaEditor, tutupEditor, edTambah, edHapus, edGeser, edAturHalaman, edBawaan, edSimpan, mulai, pilih, pilihId, geser, lompat, lompatButir, kirim, jenisUntukUjian, bangunSet, hitung, periksaKualitas, kategoriIndeks, kategoriKesungguhan, JENIS, guruMuat, guruRender, guruUnduh,
    modeDetail, gabungKeRekap, selRekap, ringkasSurvei, setDraft, draftJson, statusForm, pakaiBawaan, unduhTemplate, htmlPembahasan };
})();
