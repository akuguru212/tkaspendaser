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
        ['K01', 'bt', 'frek', 1, 'Saya melaksanakan ibadah sesuai agama atau kepercayaan saya.'],
        ['K02', 'bt', 'setuju', 1, 'Saya meminta maaf ketika berbuat salah kepada orang lain.'],
        ['K03', 'bt', 'setuju', 1, 'Saya tetap jujur walaupun tidak ada yang mengawasi.'],
        ['K04', 'bt', 'setuju', -1, 'Mengambil barang teman tanpa izin tidak apa-apa jika barang itu tidak penting.'],
        ['K05', 'bt', 'frek', 1, 'Saya menjaga kebersihan dan kelestarian lingkungan di sekitar saya.'],
        ['K06', 'bt', 'setuju', -1, 'Menyontek saat ulangan tidak masalah asalkan tidak ketahuan.'],
        ['K07', 'bk', 'setuju', 1, 'Saya senang berteman dengan teman yang berbeda agama, suku, atau budaya.'],
        ['K08', 'bk', 'setuju', 1, 'Saya menghormati teman yang cara beribadah atau adatnya berbeda dari saya.'],
        ['K09', 'bk', 'setuju', -1, 'Budaya daerah saya paling baik, sehingga budaya lain tidak perlu dipelajari.'],
        ['K10', 'bk', 'setuju', 1, 'Saya tertarik mempelajari budaya daerah lain atau bangsa lain.'],
        ['K11', 'bk', 'frek', 1, 'Saya membela teman yang diejek karena perbedaannya.'],
        ['K12', 'bk', 'setuju', -1, 'Saya lebih nyaman bergaul hanya dengan teman yang sama dengan saya.'],
        ['K13', 'gr', 'frek', 1, 'Saya ikut piket atau kerja bakti tanpa harus disuruh.'],
        ['K14', 'gr', 'setuju', 1, 'Saya bersedia membantu teman yang kesulitan memahami pelajaran.'],
        ['K15', 'gr', 'setuju', -1, 'Dalam kerja kelompok, lebih baik saya mengerjakan sendiri tanpa melibatkan anggota lain.'],
        ['K16', 'gr', 'setuju', 1, 'Saya mau menerima keputusan kelompok walaupun berbeda dengan pendapat saya.'],
        ['K17', 'gr', 'frek', 1, 'Saya berbagi alat atau bahan belajar dengan teman yang membutuhkan.'],
        ['K18', 'gr', 'frek', -1, 'Saya membiarkan teman sekelompok mengerjakan semua tugas.'],
        ['K19', 'md', 'frek', 1, 'Saya mengerjakan tugas dan PR dengan usaha sendiri.'],
        ['K20', 'md', 'setuju', 1, 'Ketika gagal, saya mencoba lagi dengan cara lain.'],
        ['K21', 'md', 'setuju', -1, 'Saya mudah menyerah jika soal terasa sulit.'],
        ['K22', 'md', 'frek', 1, 'Saya mengatur sendiri waktu belajar dan waktu istirahat saya.'],
        ['K23', 'md', 'setuju', 1, 'Saya berani bertanya kepada guru ketika belum paham.'],
        ['K24', 'md', 'setuju', -1, 'Saya baru belajar kalau disuruh orang lain.'],
        ['K25', 'bn', 'frek', 1, 'Saya mencari informasi dari sumber lain sebelum mempercayai suatu berita.'],
        ['K26', 'bn', 'setuju', 1, 'Saya meminta alasan atau bukti sebelum menyetujui pendapat orang lain.'],
        ['K27', 'bn', 'setuju', -1, 'Kalau banyak orang berkata sama, pasti benar dan tidak perlu diperiksa lagi.'],
        ['K28', 'bn', 'setuju', 1, 'Saya memikirkan akibatnya sebelum mengambil keputusan.'],
        ['K29', 'bn', 'frek', 1, 'Saya memeriksa kebenaran pesan atau berita sebelum membagikannya.'],
        ['K30', 'bn', 'frek', -1, 'Saya langsung membagikan berita yang menarik tanpa membaca isinya.'],
        ['K31', 'kr', 'setuju', 1, 'Saya suka mencari cara baru untuk menyelesaikan masalah.'],
        ['K32', 'kr', 'frek', 1, 'Saya membuat karya (tulisan, gambar, alat, musik, dan lainnya) dari ide saya sendiri.'],
        ['K33', 'kr', 'setuju', -1, 'Saya lebih suka memakai cara yang sudah ada tanpa mencoba cara lain.'],
        ['K34', 'kr', 'setuju', 1, 'Saya tidak takut ide saya ditertawakan ketika saya menyampaikannya.'],
        ['K35', 'kr', 'frek', 1, 'Saya mengembangkan ide dari hal-hal sederhana di sekitar saya.'],
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
  // Pengelompokan otomatis bawaan Sulingjar: 6 butir berurutan (skala sama) per halaman, seperti tampilan ANBK
  (function () {
    const j = JENIS.sulingjar; let hal = 0, n = 0, skala = '';
    j.butir.forEach(b => { if (b[2] !== skala || n >= 6) { hal++; n = 0; skala = b[2]; } n++; b[5] = hal; });
  })();
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
  function jenisUntukUjian(u) {
    if (!u) return '';
    const m = String(u.survei || '').toLowerCase();
    if (m === 'karakter' || m === 'sulingjar') return m;
    if (m === 'auto') {
      const t = (String(u.judul || '') + ' ' + String(u.kategori || '')).toLowerCase();
      if (t.indexOf('numerasi') >= 0) return 'karakter';
      if (t.indexOf('literasi') >= 0) return 'sulingjar';
    }
    return '';
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
      hasil[k] = { nama: d.nama, n: d.n, indeks: d.n ? bulat2(((d.jumlah / d.n) - 1) / 3 * 100) : null };
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
    return { baik: alasan.length === 0, alasan, terlaluCepat, seragam, tidakKonsisten, bertentangan, rataDetik: bulat2(total / n) };
  }

  // =====================================================================================
  //  SISWA — layar survei (satu butir per halaman, gaya ANBK)
  // =====================================================================================
  const S = { jenis: '', set: null, sesiId: '', jawaban: {}, detik: {}, idx: 0, tahap: 'intro', mulai: 0, tMasuk: 0, selesai: null, tampilHasil: false, diingatkan: false };
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
        <li>Anda dapat kembali ke ${adaMatriks() ? 'halaman' : 'butir'} sebelumnya untuk mengubah jawaban sebelum menekan <b>Selesai</b>.</li>
        <li>Jawaban Anda dipakai untuk memperbaiki lingkungan dan pembelajaran di sekolah.</li></ul></div>`;
      nav.innerHTML = `<span></span><button type="button" class="anbk-btn anbk-btn-primary" onclick="Survei.mulai()"><span>MULAI SURVEI</span> <i class="fa-solid fa-circle-chevron-right"></i></button><span></span>`;
    } else if (S.tahap === 'butir') {
      const p = hl[S.idx]; const awal = p.idx[0] + 1;
      $('sv-nomor').textContent = adaMatriks() ? 'Halaman ' + (S.idx + 1) + ' dari ' + hl.length : 'Butir nomor ' + awal;
      box.innerHTML = htmlHalaman(p);
      const akhir = S.idx === hl.length - 1;
      nav.innerHTML = `<button type="button" class="anbk-btn anbk-btn-red" ${S.idx === 0 ? 'disabled' : ''} onclick="Survei.geser(-1)"><i class="fa-solid fa-circle-chevron-left"></i> <span>${adaMatriks() ? 'Halaman' : 'Butir'} sebelumnya</span></button>
        <button type="button" class="anbk-btn anbk-btn-primary" id="sv-btn-next" ${halLengkap(p) ? '' : 'disabled'} onclick="Survei.geser(1)"><span>${akhir ? 'Selesai' : (adaMatriks() ? 'Halaman' : 'Butir') + ' berikutnya'}</span> <i class="fa-solid ${akhir ? 'fa-flag-checkered' : 'fa-circle-chevron-right'}"></i></button>`;
    } else if (S.tahap === 'konfirmasi') {
      $('sv-nomor').textContent = 'Konfirmasi Survei';
      const kosong = J.butir.map((r, i) => [r[0], i]).filter(x => !S.jawaban[x[0]]);
      box.innerHTML = `<div class="sv-pad"><p class="sv-p">Terima kasih telah mengisi survei ini. Tekan tombol <mark class="anbk-mark anbk-mark-red">SELESAI SURVEI</mark> untuk mengirim jawaban, atau <mark class="anbk-mark anbk-mark-green">KEMBALI</mark> untuk memeriksa jawaban Anda.</p>
        <div class="anbk-ringkas"><span>Terjawab <b>${jml}</b></span><span>Belum dijawab <b>${kosong.length}</b></span></div>
        ${kosong.length ? `<div class="anbk-peringatan"><p>Masih ada butir yang belum dijawab. Semua butir wajib dijawab.</p><div class="kumpul-chips">${kosong.map(x => `<button type="button" class="kumpul-chip" onclick="Survei.lompatButir(${x[1]})">${x[1] + 1}</button>`).join('')}</div></div>` : ''}</div>`;
      nav.innerHTML = `<button type="button" class="anbk-btn anbk-btn-green" onclick="Survei.lompat(${Math.min(S.idx, hl.length - 1)})">KEMBALI</button><span></span>
        <button type="button" class="anbk-btn anbk-btn-red" ${kosong.length ? 'disabled' : ''} id="sv-btn-kirim" onclick="Survei.kirim()">SELESAI SURVEI</button>`;
    }
    window.scrollTo(0, 0);
  }

  function simpanSementara() { try { sessionStorage.setItem('cbt_survei_' + S.sesiId, JSON.stringify({ j: S.jawaban, d: S.detik })); } catch (e) { } }
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
  function lompat(i) { masukHalaman(i); }
  function lompatButir(bi) { masukHalaman(halamanDariButir(bi)); }
  function mulai() { masukHalaman(0); }

  function tampilPeringatan(q) {
    return new Promise(res => {
      const el = document.createElement('div');
      el.className = 'sv-modal-bg';
      el.innerHTML = `<div class="sv-modal" role="alertdialog" aria-modal="true"><div class="sv-modal-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Periksa kembali jawaban Anda</h3>
        <p>Jawaban Anda terlihat kurang teliti:</p><ul>${q.alasan.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
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
        try { res = await api('simpanSurvei', { sesiId: S.sesiId, siswaId: state.user.id, jenis: S.jenis, jawaban: JSON.stringify(S.jawaban), durasiDetik: durasi, kualitas: JSON.stringify({ baik: kualitas.baik, alasan: kualitas.alasan, rataDetik: kualitas.rataDetik }) }); } catch (e) { res = null; }
        if (res && res.ok) break;
        await new Promise(r => setTimeout(r, 900 * k));
      }
      if (!res || !res.ok) { toast((res && res.error) || 'Survei belum terkirim. Periksa koneksi lalu coba lagi.', 'error'); if (btn) { btn.disabled = false; btn.textContent = 'SELESAI SURVEI'; } return; }
      try { sessionStorage.removeItem('cbt_survei_' + S.sesiId); } catch (e) { }
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
    Object.assign(S, { jenis: info.jenis, set: bangunSet(info.jenis, info.set), sesiId: state.sesiId, jawaban: (simpan && simpan.j) || {}, detik: (simpan && simpan.d) || {}, idx: 0, tahap: 'intro', mulai: Date.now(), tMasuk: 0, diingatkan: false, kirimBusy: false, tampilHasil: !!info.tampilHasil });
    const sc = $('survei-screen'); if (!sc) return;
    try { KumpulUI.sembunyikanSemua(); } catch (e) { }
    UI.tampilkan('survei-screen');
    const anticheat = $('anticheat-warning'); if (anticheat) anticheat.classList.add('hidden');
    render();
    await new Promise(resolve => {
      S.selesai = async (res) => {
        S.selesai = null;
        if (S.tampilHasil) await tampilRingkasanSiswa(); // ringkasan indeks (opsional, atur di Kelola Ujian)
        resolve();
      };
    });
  }

  function tampilRingkasanSiswa() {
    return new Promise(resolve => {
      const h = hitung(S.jenis, S.jawaban, S.set); const J = S.set;
      const baris = J.dim.map(d => { const x = h.dim[d[0]]; const k = kategoriIndeks(x.indeks); return `<div class="sv-bar"><div class="sv-bar-t"><span>${esc(d[1])}</span><b style="color:${k.warna}">${x.indeks === null ? '-' : String(x.indeks).replace('.', ',')}</b></div><div class="sv-bar-b"><i style="width:${x.indeks || 0}%;background:${k.warna}"></i></div><small style="color:${k.warna}">${k.label}</small></div>`; }).join('');
      const total = S.jenis === 'karakter' ? `<div class="sv-total">Indeks Karakter: <b>${String(h.total).replace('.', ',')}</b></div>` : '';
      $('sv-nomor').textContent = 'Survei Terkirim';
      $('sv-progres').textContent = 'Selesai';
      $('sv-body').innerHTML = `<div class="sv-pad"><p class="sv-p"><i class="fa-solid fa-circle-check" style="color:#1b7f4b"></i> Survei Anda sudah terkirim. Terima kasih sudah menjawab dengan jujur.</p>
        <p class="sv-ket">Ringkasan ini hanya untuk latihan. Pada ANBK/TKA sesungguhnya, siswa tidak melihat hasil survei.</p>${total}<div class="sv-bars">${baris}</div></div>`;
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
    const list = res.data.filter(u => jenisUntukUjian(u));
    sel.innerHTML = '<option value="">Pilih ujian yang memakai survei...</option>' + list.map(u => `<option value="${esc(u.id)}">${esc(u.judul)} — ${esc(JENIS[jenisUntukUjian(u)].nama)}</option>`).join('');
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
    const totalKelas = J.dim.length && G.jenis === 'karakter' ? bulat2(rows.map(r => r._h.total).reduce((a, b) => a + b, 0) / rows.length) : null;
    const kartu = J.dim.map(d => { const k = kategoriIndeks(rata[d[0]]); return `<div class="sv-kartu"><div class="sv-kartu-t">${esc(d[1])}</div><div class="sv-kartu-n" style="color:${k.warna}">${fmt(rata[d[0]])}</div><div class="sv-bar-b"><i style="width:${rata[d[0]] || 0}%;background:${k.warna}"></i></div><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${k.label}</span></div>`; }).join('');
    // butir terendah (rata-rata skor 1-4 -> indeks)
    const butir = J.butir.map(b => { const v = rows.map(r => r._h.butir[b[0]]).filter(x => x !== undefined); return { b, m: v.length ? bulat2(((v.reduce((a, c) => a + c, 0) / v.length) - 1) / 3 * 100) : null }; }).filter(x => x.m !== null).sort((a, c) => a.m - c.m).slice(0, 5);
    const lemah = `<div class="sv-lemah"><b>5 butir dengan indeks terendah (bahan perbaikan)</b><ol>${butir.map(x => `<li><span>${esc(x.b[4])}</span> <em>${esc(J.dimNama[x.b[1]])}</em> <b style="color:${kategoriIndeks(x.m).warna}">${fmt(x.m)}</b></li>`).join('')}</ol></div>`;
    const perhatian = G.jenis === 'sulingjar' ? rows.filter(r => BUTIR_PERHATIAN.some(id => Number(r.jawaban[id]) >= 3)).length : 0;
    ring.innerHTML = `<div class="sv-info"><span><b>${rows.length}</b> siswa mengisi</span>${G.belum ? `<span><b>${G.belum}</b> belum mengisi</span>` : ''}<span><b>${rows.filter(r => !r._q.baik).length}</b> pengisian perlu dicek</span>${totalKelas !== null ? `<span>Indeks Karakter rata-rata <b>${fmt(totalKelas)}</b></span>` : ''}${perhatian ? `<span class="sv-warn"><i class="fa-solid fa-circle-exclamation"></i> <b>${perhatian}</b> siswa melaporkan pengalaman tidak aman (beberapa kali/sering)</span>` : ''}</div><div class="sv-kartu-wrap">${kartu}</div>${lemah}<p class="subtitle" style="margin:.4rem 0">Skala indeks 0–100 (makin tinggi makin baik). Kategori Baik ≥ 75, Sedang 50–74,99, Perlu perhatian &lt; 50 hanyalah acuan latihan.</p>`;
    const th = J.dim.map(d => `<th title="${esc(d[1])}">${esc(d[1].length > 22 ? d[1].slice(0, 20) + '…' : d[1])}</th>`).join('');
    cont.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>No</th><th>Nama</th><th>Kelas</th>${th}${G.jenis === 'karakter' ? '<th>Indeks Karakter</th>' : ''}<th>Waktu</th><th>Kualitas Pengisian</th>${G.jenis === 'sulingjar' ? '<th>Catatan</th>' : ''}</tr></thead><tbody>${rows.map((r, i) => {
      const sel = J.dim.map(d => { const x = r._h.dim[d[0]].indeks; const k = kategoriIndeks(x); return `<td><span class="sv-lencana" style="background:${k.latar};color:${k.warna}">${fmt(x)}</span></td>`; }).join('');
      const cat = G.jenis === 'sulingjar' ? `<td>${BUTIR_PERHATIAN.filter(id => Number(r.jawaban[id]) >= 3).length ? '<span class="badge no" title="Menjawab Beberapa kali/Sering pada butir pengalaman tidak aman. Tindak lanjuti secara rahasia.">Perlu tindak lanjut</span>' : '-'}</td>` : '';
      return `<tr><td>${i + 1}</td><td>${esc(r.nama)}</td><td>${esc(r.kelas)}</td>${sel}${G.jenis === 'karakter' ? `<td><b>${fmt(r._h.total)}</b></td>` : ''}<td>${r.durasi ? Math.floor(r.durasi / 60) + ' mnt ' + (r.durasi % 60) + ' dtk' : '-'}</td><td>${r._q.baik ? '<span class="badge ok">Baik</span>' : `<span class="badge no" title="${esc(r._q.alasan.join('; '))}">Perlu dicek</span>`}</td>${cat}</tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function guruUnduh() {
    const J = G.set; if (!J) { toast('Pilih ujian dulu.', 'error'); return; }
    const rows = guruSaring().map(hitungBaris); if (!rows.length) { toast('Belum ada data untuk diunduh.', 'error'); return; }
    const head = ['No', 'Nama', 'Kelas'].concat(J.dim.map(d => 'Indeks ' + d[1])).concat(G.jenis === 'karakter' ? ['Indeks Karakter'] : []).concat(['Durasi (detik)', 'Kualitas Pengisian', 'Keterangan']).concat(J.butir.map(b => b[0]));
    const data = rows.map((r, i) => [i + 1, r.nama, r.kelas].concat(J.dim.map(d => r._h.dim[d[0]].indeks)).concat(G.jenis === 'karakter' ? [r._h.total] : []).concat([r.durasi || '', r._q.baik ? 'Baik' : 'Perlu dicek', r._q.alasan.join('; ')]).concat(J.butir.map(b => r.jawaban[b[0]] || '')));
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
  function headlineSurvei(jenis, h) { return { label: jenis === 'karakter' ? 'Indeks Karakter' : 'Rata-rata indeks', nilai: h.total }; }

  function htmlPembahasan(set, jenis, jawaban, kualitas, opsi) {
    const guru = !!(opsi && opsi.guru);
    if (!set || !jawaban) return '<div class="dj-kosong"><p>' + (guru ? 'Siswa ini belum mengisi survei.' : 'Hasil survei belum tersedia.') + '</p></div>';
    const h = hitung(jenis, jawaban, set); const subjek = guru ? 'siswa' : 'Anda';
    const hl = headlineSurvei(jenis, h); const kHl = kategoriIndeks(hl.nilai);
    const q = kualitas || {};
    let out = `<div class="sv-pb"><div class="sv-pb-top"><div><div class="sv-pb-judul">${esc(set.nama)}</div><div class="sv-pb-sub">Tidak ada jawaban benar atau salah. Indeks 0–100; skor butir 4 = kondisi paling baik (butir bernada negatif dibalik).</div></div>
      <div class="sv-pb-total"><span>${esc(hl.label)}</span><b style="color:${kHl.warna}">${fmt(hl.nilai)}</b><span class="sv-lencana" style="background:${kHl.latar};color:${kHl.warna}">${kHl.label}</span></div></div>`;
    if (q.baik === false) out += `<div class="sv-pb-kualitas"><i class="fa-solid fa-triangle-exclamation"></i> ${guru ? 'Kualitas pengisian perlu dicek' : 'Pengisian survei Anda terlihat kurang teliti'}${q.alasan && q.alasan.length ? ': ' + esc(q.alasan.join('; ')) : ''}. ${guru ? 'Hasil indeks siswa ini sebaiknya dibaca dengan hati-hati.' : 'Lain kali baca tiap pernyataan dan jawab sesuai keadaan sebenarnya.'}</div>`;
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
        <p class="sv-pb-tafsir">Indeks ${esc(d[1])} ${subjek} <b>${fmt(x.indeks)}</b> — ${TAFSIR[k.kode]}</p>
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
    return { h, nilai: h.total, kat: kategoriIndeks(h.total), baik: !(r.survei.kualitas && r.survei.kualitas.baik === false), set: r.survei.set };
  }
  function selRekap(r) {
    const x = ringkasSurvei(r);
    if (!x) return '<span class="badge warn">Belum mengisi</span>';
    const tip = x.set.dim.map(d => d[1] + ': ' + fmt(x.h.dim[d[0]].indeks)).join('\n');
    return `<span class="sv-lencana" style="background:${x.kat.latar};color:${x.kat.warna}" title="${esc(tip)}">${fmt(x.nilai)} · ${x.kat.label}</span>${x.baik ? '' : ' <span class="badge no" title="Kualitas pengisian perlu dicek">⚠ dicek</span>'}`;
  }

  // =====================================================================================
  //  BUTIR KHUSUS PER UJIAN — impor dari template Word (tabel)
  // =====================================================================================
  const F = { json: '' };
  const normT = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  function cocokDimDasar(jenis, nama) {
    const n = normT(nama); if (!n) return null;
    const dsr = JENIS[jenis].dim;
    return dsr.filter(d => { const m = normT(d[1]); return m === n || m.indexOf(n) === 0 || n.indexOf(m) === 0; })[0] || null;
  }
  async function bacaDocx(file, jenisPilihan) {
    await muatPustaka_('mammoth');
    const hasil = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) });
    const dom = new DOMParser().parseFromString(hasil.value, 'text/html');
    const teks = normT(dom.body.textContent);
    let jenis = '';
    if (teks.indexOf('sulingjar') >= 0 || teks.indexOf('lingkungan belajar') >= 0) jenis = 'sulingjar';
    else if (teks.indexOf('survei karakter') >= 0) jenis = 'karakter';
    if (!jenis) jenis = jenisPilihan || '';
    const tabel = Array.from(dom.querySelectorAll('table')).filter(t => {
      const tr = t.querySelector('tr'); if (!tr) return false;
      return Array.from(tr.querySelectorAll('th,td')).some(c => kunciHeader_(c.textContent) === 'pernyataan');
    })[0];
    const galat = [];
    if (!tabel) return { galat: ['Tabel butir survei tidak ditemukan. Gunakan template survei dan jangan mengubah baris judul kolom (No, Dimensi, Skala, Arah, Pernyataan, Pasangan).'] };
    if (!jenis) return { galat: ['Jenis survei tidak dikenali. Pilih "Survei Karakter" atau "Sulingjar" pada pilihan survei terlebih dulu, lalu impor lagi.'] };
    const trs = Array.from(tabel.querySelectorAll('tr'));
    const hk = Array.from(trs[0].querySelectorAll('th,td')).map(c => kunciHeader_(c.textContent));
    const ix = (k) => hk.findIndex(x => x === k || x.indexOf(k) === 0);
    const cNo = ix('no'), cDim = ix('dimensi'), cSk = ix('skala'), cAr = ix('arah'), cP = ix('pernyataan'), cPs = ix('pasangan'), cHal = ix('halaman'), cKode = ix('kode'), cPet = ix('petunjuk');
    if (cDim < 0 || cSk < 0 || cAr < 0 || cP < 0) return { galat: ['Kolom wajib belum lengkap: Dimensi, Skala, Arah, dan Pernyataan.'] };
    const awalan = jenis === 'karakter' ? 'K' : 'S';
    const dim = [], kodeDim = {}; const butir = []; const noKeId = {}; const rawPasang = []; const petunjuk = {};
    let urut = 0;
    trs.slice(1).forEach((tr, bi) => {
      const sel = Array.from(tr.querySelectorAll('th,td')).map(c => c.textContent.trim());
      const baris = bi + 2; const teksP = (sel[cP] || '').trim(); const nm = (sel[cDim] || '').trim();
      if (!teksP && !nm && !(sel[cSk] || '').trim()) return; // baris kosong
      if (!teksP) { galat.push('Baris ' + baris + ': kolom Pernyataan kosong.'); return; }
      if (!nm) { galat.push('Baris ' + baris + ': kolom Dimensi kosong.'); return; }
      const sk = normT(sel[cSk]); let skala = '';
      if (/^kur/.test(sk)) skala = 'kurang'; else if (/^set/.test(sk)) skala = 'setuju'; else if (/^(fre|ser)/.test(sk)) skala = 'frek'; else if (/^pen/.test(sk)) skala = 'peng';
      if (!skala) { galat.push('Baris ' + baris + ': Skala "' + (sel[cSk] || '') + '" tidak dikenali (isi: Setuju, Kurang, Frekuensi, atau Pengalaman).'); return; }
      const ar = normT(sel[cAr]); let arah = 0;
      if (/^(\+|pos)/.test(ar)) arah = 1; else if (/^(-|−|–|neg)/.test(ar)) arah = -1;
      if (!arah) { galat.push('Baris ' + baris + ': Arah "' + (sel[cAr] || '') + '" tidak dikenali (isi: Positif atau Negatif).'); return; }
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
      const hal = cHal >= 0 ? (parseInt(String(sel[cHal] || '').replace(/\D/g, ''), 10) || 0) : 0;
      const kodeTeks = cKode >= 0 ? String(sel[cKode] || '').trim().slice(0, 40) : '';
      if (hal > 0 && cPet >= 0 && (sel[cPet] || '').trim() && !petunjuk[hal]) petunjuk[hal] = String(sel[cPet]).trim().slice(0, 300);
      butir.push([id, kode, skala, arah, teksP, hal, kodeTeks]);
      noKeId[String(cNo >= 0 && sel[cNo] ? sel[cNo] : urut).replace(/\D/g, '') || urut] = id;
      if (cPs >= 0 && (sel[cPs] || '').trim()) rawPasang.push([id, String(sel[cPs]).replace(/\D/g, ''), baris]);
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
    return { jenis, galat, set: { jenis, dim, butir, pasangan, petunjuk } };
  }

  function jenisFormSaatIni() {
    const g = (id) => { const el = $(id); return el ? el.value : ''; };
    return jenisUntukUjian({ survei: g('ujian-survei'), judul: g('ujian-judul'), kategori: g('ujian-kategori') });
  }
  function statusForm() {
    const el = $('ujian-survei-status'); if (!el) return;
    const pilihan = ($('ujian-survei') || {}).value || '';
    const jenis = jenisFormSaatIni();
    let teks = '';
    if (!pilihan) teks = 'Survei nonaktif untuk ujian ini.';
    else if (pilihan === 'auto' && !jenis) teks = 'Mode Otomatis: judul/kategori ujian ini belum memuat kata "Numerasi" atau "Literasi", jadi belum ada survei.';
    else {
      const c = F.json ? bangunSet(jenis, F.json) : null;
      if (F.json && c && c.kustom) teks = `Butir khusus dari Word dipakai: ${c.butir.length} butir, ${c.dim.length} dimensi, ${c.halamanList.length} halaman (${JENIS[jenis].nama}).`;
      else if (F.json) teks = 'Butir khusus yang tersimpan tidak cocok dengan jenis survei terpilih, jadi dipakai butir bawaan (' + JENIS[jenis].butir.length + ' butir).';
      else teks = `Memakai butir bawaan ${JENIS[jenis].nama} (${JENIS[jenis].butir.length} butir, ${JENIS[jenis].halamanList.length} halaman). Impor file Word untuk mengganti butir pada latihan ini.`;
    }
    el.textContent = teks;
  }
  function setDraft(json) { F.json = json || ''; statusForm(); }
  function draftJson() { return F.json; }
  function pakaiBawaan() { F.json = ''; statusForm(); toast('Kembali memakai butir bawaan.'); }
  function unduhTemplate(jenis) {
    const a = document.createElement('a'); a.href = 'template-survei-' + jenis + '.docx'; a.download = 'Template Survei ' + (jenis === 'karakter' ? 'Karakter' : 'Sulingjar') + '.docx';
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function imporDariForm(ev) {
    const file = ev.target.files[0]; if (!file) return;
    try {
      const r = await bacaDocx(file, jenisFormSaatIni());
      if (r.galat && r.galat.length) {
        Dialog.info({ judul: 'Butir Survei Belum Bisa Diimpor', tipe: 'warning', ikon: 'fa-file-circle-exclamation', pesan: 'Perbaiki hal berikut di file Word lalu impor lagi:', daftar: r.galat.slice(0, 12) });
        return;
      }
      F.json = JSON.stringify(r.set);
      const sel = $('ujian-survei');
      if (jenisFormSaatIni() !== r.jenis) sel.value = r.jenis; // jenis di dokumen menentukan jenis survei
      else if (!sel.value) sel.value = r.jenis;
      statusForm();
      toast(`${r.set.butir.length} butir (${r.set.dim.length} dimensi) berhasil dimuat. Klik Simpan Ujian untuk menerapkan.`, 'success');
    } catch (err) {
      toast('Gagal membaca file .docx: ' + err.message, 'error');
    } finally { ev.target.value = ''; }
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

  return { mulai, pilih, pilihId, geser, lompat, lompatButir, kirim, jenisUntukUjian, bangunSet, hitung, periksaKualitas, kategoriIndeks, JENIS, guruMuat, guruRender, guruUnduh,
    modeDetail, gabungKeRekap, selRekap, ringkasSurvei, setDraft, draftJson, statusForm, pakaiBawaan, unduhTemplate, imporDariForm, htmlPembahasan };
})();
