/* ============================================================================
   LEADERBOARD SURVEI — peringkat berdasarkan NILAI SURVEI KARAKTER + SULINGJAR (Portal Guru).
   Menu TERPISAH dari Leaderboard tes: nilai survei dan nilai tes tidak saling mempengaruhi
   (data berbeda, perhitungan berbeda, tampilan & warna berbeda).
   - Peringkat per Tes 1, Tes 2, ... atau RATA-RATA SELURUH TES; per kelas atau seluruh kelas.
   - Kolom: Rank | Nama Siswa | Kelas | Survei Karakter | Sulingjar | Nilai Akhir | Kategori | Kesungguhan.
     Nilai Akhir = rata-rata nilai Survei Karakter & Sulingjar (skala 0-100, kategori Baik >= 75).
   - Survei Karakter ikut ujian Numerasi dan Sulingjar ikut ujian Literasi (pengaturan Kelola Ujian);
     keduanya dipasangkan per tes memakai nama ujian yang sama seperti Leaderboard tes.
   - Pengisian yang ditandai "perlu dicek" (terlalu cepat / seragam / bertentangan) diberi tanda
     dan bisa disembunyikan, agar jawaban asal tidak mendongkrak peringkat.
   - Hanya untuk guru. Tidak butuh perubahan Code.gs (memakai getDaftarUjian & getRekapSurvei).
   Dimuat SETELAH app.js, survei.js, dan leaderboard.js.
   ============================================================================ */
'use strict';
const LeaderboardSurvei = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  const norm = (t) => String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ');
  const r2 = (n) => Math.round(Number(n) * 100) / 100;
  const fmt = (n) => (n == null || isNaN(n)) ? '–' : r2(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const inisial = (nama) => String(nama || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';
  const rata = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const KEY_ATUR = 'cbt_leaderboard_atur_v1'; // dibagi dengan Leaderboard tes: nomor Tes per ujian
  const NAMA = { karakter: 'Survei Karakter', sulingjar: 'Sulingjar' };

  (function () {
    if (document.getElementById('leaderboard-survei-css-inline')) return;
    const st = document.createElement('style'); st.id = 'leaderboard-survei-css-inline';
    st.textContent = `
#guru-portal #tab-lb-survei .lb-hero { background: linear-gradient(118deg, color-mix(in srgb, var(--c-secondary) 70%, #000), var(--c-secondary)); color: var(--c-on-secondary, #fff); }
#guru-portal #tab-lb-survei button.lb-chip.on, #guru-portal #tab-lb-survei button.lb-chip.on:hover { background: var(--c-secondary); border-color: var(--c-secondary); color: var(--c-on-secondary, #fff); }
#guru-portal #tab-lb-survei button.lb-chip:hover { border-color: var(--c-secondary); }
#tab-lb-survei .ls-catatan { display: flex; gap: .65rem; align-items: flex-start; margin: 0 0 1rem; padding: .7rem .95rem; border-radius: 14px; font-size: .82rem; line-height: 1.5; background: color-mix(in srgb, var(--c-secondary) 12%, var(--c-surface)); border: 1px solid color-mix(in srgb, var(--c-secondary) 38%, var(--c-line)); color: var(--c-text); }
#tab-lb-survei .ls-catatan i { color: var(--c-secondary); font-size: 1.1rem; margin-top: .1rem; }
#tab-lb-survei .ls-kes { font-size: .72rem; color: var(--c-muted); display: block; }
#tab-lb-survei .ls-kes b { font-size: .85rem; }
#tab-lb-survei .ls-cek { margin-left: .3rem; }
#tab-lb-survei .lb-stats { grid-template-columns: repeat(auto-fit, minmax(122px, 1fr)); }`;
    document.head.appendChild(st);
  })();

  const S = { guruId: null, ujian: [], data: {}, tes: 'semua', kelas: '', dimuat: false, memuat: false, waktu: 0, hasil: null, namaDim: {} };

  // ---------------- pengelompokan ujian -> Tes 1, Tes 2, ... ----------------
  function bacaAtur() { try { return JSON.parse(localStorage.getItem(KEY_ATUR + ':' + ((state.user && state.user.id) || '')) || '{}') || {}; } catch (e) { return {}; } }
  function labelBersih(judul) {
    let t = String(judul || '').replace(/literasi|numerasi/gi, ' ');
    t = t.replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+/g, ' ').trim();
    return t.replace(/^[\s\-–—:|\/,_.]+|[\s\-–—:|\/,_.]+$/g, '').trim();
  }
  function jenisUjian(u) { try { return Survei.jenisUntukUjian(u, state.guru.paketSurvei) || ''; } catch (e) { return ''; } }
  function kelompok() {
    const atur = bacaAtur(), peta = new Map();
    S.ujian.forEach(u => {
      const jenis = jenisUjian(u); if (jenis !== 'karakter' && jenis !== 'sulingjar') return;
      const ov = atur[u.id] || {};
      let key, label;
      if (ov.tes) { key = 'n:' + ov.tes; label = 'Tes ' + ov.tes; }
      else { label = labelBersih(u.judul) || 'Tes'; key = 'a:' + norm(label); }
      let t = peta.get(key);
      if (!t) { t = { key, label, karakter: [], sulingjar: [] }; peta.set(key, t); }
      t[jenis].push(u.id);
    });
    return { tesList: [...peta.values()].sort((a, b) => a.label.localeCompare(b.label, 'id', { numeric: true })) };
  }

  // ---------------- memuat data ----------------
  async function muat(tombol) {
    if (S.memuat) return false;
    if (typeof state === 'undefined' || !state.user) return false;
    S.memuat = true;
    const btn = (tombol && tombol.classList) ? tombol : $('ls-btn-segarkan');
    if (btn) { btn.classList.add('sedang'); btn.setAttribute('aria-busy', 'true'); }
    if (!S.dimuat) { const c = $('ls-tabel'); if (c) c.innerHTML = '<p class="subtitle">Memuat peringkat survei...</p>'; }
    let ok = true;
    try {
      if (S.guruId !== state.user.id) { S.guruId = state.user.id; S.data = {}; S.ujian = []; S.dimuat = false; S.tes = 'semua'; S.kelas = ''; }
      try { await Survei.muatPaket(false); } catch (e) { }
      const dl = await api('getDaftarUjian', { guruId: state.user.id });
      if (!dl || !dl.ok) throw new Error((dl && dl.error) || 'Gagal memuat daftar ujian.');
      S.ujian = dl.data || [];
      const g = kelompok();
      const ids = [...new Set(g.tesList.reduce((a, t) => a.concat(t.karakter, t.sulingjar), []))];
      const baru = {}; let gagal = 0, i = 0;
      const kerja = async () => {
        while (i < ids.length) {
          const id = ids[i++]; let r = null;
          try { r = await api('getRekapSurvei', { ujianId: id }); } catch (e) { r = null; }
          if (r && r.ok && r.jenis) {
            const set = Survei.bangunSet(r.jenis, r.set);
            if (set) S.namaDim[r.jenis] = set.dim;
            baru[id] = { jenis: r.jenis, set, rows: r.data || [] };
          } else { gagal++; if (S.data[id]) baru[id] = S.data[id]; }
        }
      };
      await Promise.all([kerja(), kerja(), kerja(), kerja()]);
      S.data = baru; S.dimuat = true; S.waktu = Date.now();
      if (gagal) { ok = false; toast(gagal + ' ujian gagal dimuat; data sebelumnya (jika ada) tetap dipakai.', 'error'); }
    } catch (e) {
      ok = false;
      if (!S.dimuat) { const c = $('ls-tabel'); if (c) c.textContent = (e && e.message) || 'Gagal memuat Leaderboard Survei.'; }
      else toast('Gagal memperbarui Leaderboard Survei. Data sebelumnya tetap ditampilkan.', 'error');
    } finally {
      S.memuat = false;
      if (btn) { btn.classList.remove('sedang'); btn.removeAttribute('aria-busy'); }
    }
    if (S.dimuat) render();
    try { Guru.tandaiDiperbarui_('tab-lb-survei', !ok); } catch (e) { }
    return ok;
  }

  // ---------------- penghitungan peringkat ----------------
  function urutkan(arr) {
    arr.sort((a, b) => (Number(b.lengkap) - Number(a.lengkap)) || (r2(b.akhir) - r2(a.akhir)) || String(a.nama).localeCompare(String(b.nama), 'id'));
    let prev = null;
    arr.forEach((x, i) => { x.rank = (prev && prev.lengkap === x.lengkap && r2(prev.akhir) === r2(x.akhir)) ? prev.rank : i + 1; prev = x; });
    return arr;
  }
  function peringkatKelas(arr) {
    const per = {};
    arr.forEach(x => {
      const k = norm(x.kelas) || '-'; const c = per[k] = per[k] || { n: 0, prev: null };
      c.n++;
      x.rankKelas = (c.prev && c.prev.lengkap === x.lengkap && r2(c.prev.akhir) === r2(x.akhir)) ? c.prev.rankKelas : c.n;
      c.prev = x;
    });
  }

  function hitung(g) {
    const peta = {};
    g.tesList.forEach(t => { t.karakter.forEach(id => { peta[id] = { tes: t.key, jenis: 'karakter' }; }); t.sulingjar.forEach(id => { peta[id] = { tes: t.key, jenis: 'sulingjar' }; }); });
    const sembunyiCek = !!($('ls-cek') && $('ls-cek').checked);
    const sw = new Map();
    Object.keys(S.data).forEach(id => {
      const m = peta[id]; if (!m) return;
      const d = S.data[id];
      (d.rows || []).forEach(r => {
        if (!r._h) { r._h = Survei.hitung(d.jenis, r.jawaban, d.set); }
        const total = r._h && r._h.total; if (total == null || isNaN(total)) return;
        const q = r.kualitas || {};
        const baik = q.baik !== false;
        if (sembunyiCek && !baik) return;
        const k = r.siswaId ? 'id:' + r.siswaId : 'nm:' + norm(r.nama) + '|' + norm(r.kelas);
        let s = sw.get(k);
        if (!s) { s = { id: k, nama: r.nama || '(tanpa nama)', kelas: r.kelas || '-', skor: {} }; sw.set(k, s); }
        const slot = (s.skor[m.tes] = s.skor[m.tes] || {});
        if (!slot[m.jenis] || total > slot[m.jenis].nilai) slot[m.jenis] = { nilai: total, kes: (q.nilai === undefined || q.nilai === null) ? null : Number(q.nilai), baik, dim: r._h.dim };
      });
    });
    const semuaMode = S.tes === 'semua';
    const kunciTes = g.tesList.map(t => t.key);
    let daftar = [];
    sw.forEach(s => {
      let kar = null, sul = null, jml = 0; const kes = []; let perluCek = false; let dimK = null, dimS = null;
      if (semuaMode) {
        const K = [], L = [];
        kunciTes.forEach(k => {
          const x = s.skor[k]; if (!x) return; let ada = false;
          if (x.karakter) { K.push(x.karakter.nilai); ada = true; if (x.karakter.kes != null) kes.push(x.karakter.kes); if (!x.karakter.baik) perluCek = true; }
          if (x.sulingjar) { L.push(x.sulingjar.nilai); ada = true; if (x.sulingjar.kes != null) kes.push(x.sulingjar.kes); if (!x.sulingjar.baik) perluCek = true; }
          if (ada) jml++;
        });
        kar = rata(K); sul = rata(L);
      } else {
        const x = s.skor[S.tes] || {};
        if (x.karakter) { kar = x.karakter.nilai; dimK = x.karakter.dim; if (x.karakter.kes != null) kes.push(x.karakter.kes); if (!x.karakter.baik) perluCek = true; }
        if (x.sulingjar) { sul = x.sulingjar.nilai; dimS = x.sulingjar.dim; if (x.sulingjar.kes != null) kes.push(x.sulingjar.kes); if (!x.sulingjar.baik) perluCek = true; }
        jml = (kar != null || sul != null) ? 1 : 0;
      }
      if (kar == null && sul == null) return;
      const lengkap = kar != null && sul != null;
      daftar.push({ id: s.id, nama: s.nama, kelas: s.kelas, kar, sul, lengkap, akhir: lengkap ? (kar + sul) / 2 : (kar != null ? kar : sul), jml, kes: rata(kes), perluCek, dimK, dimS, skor: s.skor });
    });
    const kelasList = kelasUnikDari_(daftar);
    if (S.kelas && !kelasList.includes(S.kelas)) S.kelas = '';
    if (S.kelas) daftar = daftar.filter(x => String(x.kelas || '').trim() === S.kelas);
    if ($('ls-lengkap') && $('ls-lengkap').checked) daftar = daftar.filter(x => x.lengkap);
    urutkan(daftar);
    if (!S.kelas) peringkatKelas(daftar);
    const labelTes = semuaMode ? 'Rata-rata Seluruh Tes' : ((g.tesList.find(t => t.key === S.tes) || {}).label || 'Tes');
    return {
      g, rows: daftar, kelasList, labelTes, semuaMode, nLengkap: daftar.filter(x => x.lengkap).length,
      nCek: daftar.filter(x => x.perluCek).length,
      tertinggi: daftar.length ? Math.max(...daftar.map(x => x.akhir)) : null, rataAkhir: rata(daftar.map(x => x.akhir)),
      rataKar: rata(daftar.filter(x => x.kar != null).map(x => x.kar)), rataSul: rata(daftar.filter(x => x.sul != null).map(x => x.sul)),
      rataKes: rata(daftar.filter(x => x.kes != null).map(x => x.kes))
    };
  }

  // ---------------- tampilan ----------------
  function pilihTes(i) { S.tes = (i === 'semua') ? 'semua' : ((kelompok().tesList[i] || {}).key || 'semua'); render(); }
  function pilihKelas(i) { S.kelas = (i < 0) ? '' : ((S.hasil && S.hasil.kelasList[i]) || ''); render(); }
  const kat = (n) => Survei.kategoriIndeks(n);
  const kelasRk = (r) => r <= 1 ? 'k1' : (r === 2 ? 'k2' : (r === 3 ? 'k3' : ''));
  const htmlBar = (n) => n == null ? '' : `<span class="lb-bar"><i style="width:${Math.max(0, Math.min(100, n))}%;background:${kat(n).warna}"></i></span>`;
  const badgeKat = (n) => { const k = kat(n); return `<span class="badge" style="background:${k.latar};color:${k.warna};border:1px solid ${k.warna}">${esc(k.label)}</span>`; };
  function tipDim(dim, jenis) {
    const nama = S.namaDim[jenis]; if (!dim || !nama) return '';
    return nama.map(d => d[1] + ': ' + fmt(dim[d[0]] && dim[d[0]].indeks)).join('\n');
  }

  function htmlPodium(rows) {
    const top = rows.slice(0, 3); if (!top.length) return '';
    const urutTampil = top.length === 3 ? [top[1], top[0], top[2]] : (top.length === 2 ? [top[1], top[0]] : [top[0]]);
    return `<div class="lb-podium">` + urutTampil.map(r => {
      const p = top.indexOf(r) + 1;
      const g = r.rank <= 1 ? 'g1' : (r.rank === 2 ? 'g2' : 'g3');
      return `<div class="lb-pod ${g}" data-p="${p}">
        <div class="lb-pod-medal"><i class="fa-solid ${r.rank <= 1 ? 'fa-crown' : 'fa-medal'}"></i></div>
        <div class="lb-pod-av">${esc(inisial(r.nama))}</div>
        <div class="lb-pod-nama" title="${esc(r.nama)}">${esc(r.nama)}</div>
        <span class="lb-pod-kelas">Peringkat ${r.rank} • ${esc(r.kelas)}</span>
        <div class="lb-pod-nilai">${fmt(r.akhir)}<small>Nilai Akhir Survei</small></div>
        <div class="lb-pod-mini"><span>Karakter<b>${fmt(r.kar)}</b></span><span>Sulingjar<b>${fmt(r.sul)}</b></span></div>
      </div>`;
    }).join('') + '</div>';
  }

  function htmlTabel(h, rows) {
    const semuaKelas = !S.kelas, tampilBelum = h.nLengkap > 0;
    const sel = (n, tip) => n == null ? '<span class="lb-kosong">–</span>' : `<span class="lb-ang"${tip ? ` title="${esc(tip)}"` : ''}>${fmt(n)}</span>${htmlBar(n)}`;
    const ket = h.semuaMode ? '<small>rata-rata tes</small>' : '';
    const kepala = `<tr><th class="lb-c" style="width:64px">Rank</th><th>Nama Siswa</th><th>Kelas</th><th style="min-width:92px">Survei Karakter${ket}</th><th style="min-width:92px">Sulingjar${ket}</th><th style="min-width:88px">Nilai Akhir<small>rata-rata</small></th><th>Kategori</th><th class="lb-c" title="Nilai Kesungguhan mengisi survei (0-100): ketelitian, bukan baik/buruknya jawaban">Kesungguhan</th>${semuaKelas ? '<th class="lb-c" title="Peringkat di dalam kelasnya">Rank Kelas</th>' : ''}${h.semuaMode ? '<th class="lb-c" title="Jumlah tes yang diikuti">Jml Tes</th>' : ''}</tr>`;
    const baris = rows.map(r => {
      const belum = tampilBelum && !r.lengkap;
      const cls = (r.rank <= 3 ? 'lb-r' + r.rank : '') + (belum ? ' lb-belum' : '');
      const kk = r.kes == null ? null : Survei.kategoriKesungguhan(Math.round(r.kes));
      return `<tr class="${cls.trim()}">
        <td class="lb-c"><span class="lb-rk ${kelasRk(r.rank)}">${r.rank}</span></td>
        <td class="lb-nama">${esc(r.nama)}${r.perluCek ? ' <span class="badge no" title="Kualitas pengisian survei perlu dicek (terlalu cepat / jawaban seragam / bertentangan)">⚠ dicek</span>' : ''}</td>
        <td>${esc(r.kelas)}</td>
        <td>${sel(r.kar, tipDim(r.dimK, 'karakter'))}</td><td>${sel(r.sul, tipDim(r.dimS, 'sulingjar'))}</td>
        <td><span class="lb-akhir">${fmt(r.akhir)}</span>${belum ? '' : htmlBar(r.akhir)}</td>
        <td>${belum ? '<span class="badge warn" title="Belum mengisi salah satu survei (Karakter atau Sulingjar)">Belum lengkap</span>' : badgeKat(r.akhir)}</td>
        <td class="lb-c">${kk ? `<b style="color:${kk.warna}">${Math.round(r.kes)}</b><span class="ls-kes">${esc(kk.label)}</span>` : '<span class="lb-kosong">–</span>'}</td>
        ${semuaKelas ? `<td class="lb-c">${r.rankKelas || '–'}</td>` : ''}
        ${h.semuaMode ? `<td class="lb-c">${r.jml}</td>` : ''}
      </tr>`;
    }).join('');
    return `<div class="lb-scroll"><table class="lb-table"><thead>${kepala}</thead><tbody>${baris}</tbody></table></div>`;
  }

  function render() {
    const hero = $('ls-hero'), stats = $('ls-stats'), pod = $('ls-podium'), tab = $('ls-tabel');
    if (!tab) return;
    const g = kelompok();
    if (S.tes !== 'semua' && !g.tesList.some(t => t.key === S.tes)) S.tes = 'semua';
    const chipsTes = $('ls-chips-tes'), chipsKelas = $('ls-chips-kelas');
    if (!g.tesList.length) {
      S.hasil = null; chipsTes.innerHTML = ''; chipsKelas.innerHTML = ''; hero.innerHTML = ''; stats.innerHTML = ''; pod.innerHTML = '';
      tab.innerHTML = `<div class="lb-kosongan"><i class="fa-solid fa-ranking-star"></i><strong>Belum ada ujian yang memakai survei.</strong><br>Aktifkan di <strong>Kelola Ujian &gt; Survei Setelah Ujian</strong> (ujian Numerasi → Survei Karakter, ujian Literasi → Sulingjar). Setelah siswa mengisi survei, peringkatnya muncul di sini.</div>`;
      $('ls-info-filter').textContent = '';
      return;
    }
    const h = S.hasil = hitung(g);
    chipsTes.innerHTML = g.tesList.map((t, i) => `<button type="button" class="lb-chip${S.tes === t.key ? ' on' : ''}" onclick="LeaderboardSurvei.pilihTes(${i})">${esc(t.label)}</button>`).join('') +
      `<button type="button" class="lb-chip${S.tes === 'semua' ? ' on' : ''}" onclick="LeaderboardSurvei.pilihTes('semua')"><i class="fa-solid fa-chart-line"></i> Rata-rata Seluruh Tes</button>`;
    chipsKelas.innerHTML = `<button type="button" class="lb-chip${!S.kelas ? ' on' : ''}" onclick="LeaderboardSurvei.pilihKelas(-1)">Semua Kelas</button>` +
      h.kelasList.map((k, i) => `<button type="button" class="lb-chip${S.kelas === k ? ' on' : ''}" onclick="LeaderboardSurvei.pilihKelas(${i})">${esc(k)}</button>`).join('');
    const waktu = S.waktu ? new Date(S.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    hero.innerHTML = `<div class="lb-hero"><i class="fa-solid fa-ranking-star lb-hero-ico"></i>
      <p class="lb-eyebrow">Leaderboard Survei Karakter &amp; Sulingjar</p><h3>${esc(h.labelTes)}</h3>
      <p class="lb-sub">${S.kelas ? 'Kelas ' + esc(S.kelas) : 'Seluruh kelas'} • ${h.rows.length} siswa • ${g.tesList.length} tes dengan survei${waktu ? ' • data per ' + waktu : ''}</p></div>`;
    if (!h.rows.length) {
      stats.innerHTML = ''; pod.innerHTML = '';
      tab.innerHTML = `<div class="lb-kosongan"><i class="fa-solid fa-users-slash"></i>Belum ada siswa yang mengisi survei pada pilihan ini${S.kelas ? ' (kelas ' + esc(S.kelas) + ')' : ''}.</div>`;
      $('ls-info-filter').textContent = ''; return;
    }
    stats.innerHTML = `<div class="lb-stats">
      <div class="lb-stat"><b>${h.rows.length}</b><span>Siswa di peringkat</span></div>
      <div class="lb-stat"><b>${h.nLengkap}</b><span>Sudah lengkap (K + S)</span></div>
      <div class="lb-stat"><b>${fmt(h.tertinggi)}</b><span>Nilai akhir tertinggi</span></div>
      <div class="lb-stat"><b>${fmt(h.rataAkhir)}</b><span>Rata-rata nilai akhir</span></div>
      <div class="lb-stat"><b>${fmt(h.rataKar)}</b><span>Rata-rata Karakter</span></div>
      <div class="lb-stat"><b>${fmt(h.rataSul)}</b><span>Rata-rata Sulingjar</span></div>
      <div class="lb-stat"><b>${fmt(h.rataKes)}</b><span>Rata-rata Kesungguhan</span></div>
      <div class="lb-stat"><b>${h.nCek}</b><span>Pengisian perlu dicek</span></div></div>`;
    const q = norm($('ls-cari') ? $('ls-cari').value : '');
    const tampil = q ? h.rows.filter(r => norm(r.nama + ' ' + r.kelas).includes(q)) : h.rows;
    pod.innerHTML = q ? '' : htmlPodium(h.rows);
    $('ls-info-filter').textContent = q ? `Menampilkan ${tampil.length} dari ${h.rows.length} siswa` : '';
    tab.innerHTML = tampil.length ? htmlTabel(h, tampil) : '<p class="subtitle">Tidak ada siswa yang cocok dengan pencarian.</p>';
  }

  // ---------------- unduh Excel ----------------
  async function unduh() {
    const h = S.hasil;
    if (!h || !h.rows.length) { toast('Belum ada data Leaderboard Survei untuk diunduh.', 'error'); return; }
    try { await muatPustaka_('xlsx'); } catch (e) { toast(e.message, 'error'); return; }
    const tesList = h.g.tesList;
    const bersih = (t) => String(t).replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 50);
    const dimK = S.namaDim.karakter || [], dimS = S.namaDim.sulingjar || [];
    const buat = (rows, denganRankKelas) => {
      const head = ['Peringkat', 'Nama Siswa', 'Kelas', 'Nilai Survei Karakter', 'Nilai Sulingjar', 'Nilai Akhir Survei', 'Kategori', 'Nilai Kesungguhan', 'Keterangan'];
      if (denganRankKelas) head.push('Peringkat Kelas');
      if (h.semuaMode) { head.push('Tes Diikuti'); tesList.forEach(t => head.push(t.label + ' - Karakter', t.label + ' - Sulingjar')); }
      else { dimK.forEach(d => head.push('Karakter: ' + d[1])); dimS.forEach(d => head.push('Sulingjar: ' + d[1])); }
      const nilai = (n) => n == null ? '' : r2(n);
      const data = rows.map(r => {
        const ket = [r.lengkap ? 'Lengkap' : 'Belum lengkap'].concat(r.perluCek ? ['Pengisian perlu dicek'] : []).join('; ');
        const b = [r.rank, r.nama, r.kelas, nilai(r.kar), nilai(r.sul), r2(r.akhir), h.nLengkap && !r.lengkap ? '-' : kat(r.akhir).label, r.kes == null ? '' : Math.round(r.kes), ket];
        if (denganRankKelas) b.push(r.rankKelas || '');
        if (h.semuaMode) { b.push(r.jml); tesList.forEach(t => { const x = r.skor[t.key] || {}; b.push(nilai(x.karakter && x.karakter.nilai), nilai(x.sulingjar && x.sulingjar.nilai)); }); }
        else { dimK.forEach(d => b.push(r.dimK && r.dimK[d[0]] ? nilai(r.dimK[d[0]].indeks) : '')); dimS.forEach(d => b.push(r.dimS && r.dimS[d[0]] ? nilai(r.dimS[d[0]].indeks) : '')); }
        return b;
      });
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws['!cols'] = head.map((_, i) => ({ wch: i === 1 ? 32 : (i === 8 ? 26 : 15) }));
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
    XLSX.writeFile(wb, 'leaderboard-survei-' + bersih(h.labelTes) + '-' + (S.kelas ? bersih(S.kelas) : 'semua-kelas') + '.xlsx');
    toast('Leaderboard Survei ' + h.rows.length + ' siswa berhasil diunduh.', 'success');
  }

  // ---------------- cetak / PDF ----------------
  function cetak() {
    const h = S.hasil;
    if (!h || !h.rows.length) { toast('Belum ada data Leaderboard Survei untuk dicetak.', 'error'); return; }
    const { namaSekolah, kop } = Guru._identitasSekolah_();
    const tampilBelum = h.nLengkap > 0;
    const waktu = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const baris = h.rows.map(r => {
      const belum = tampilBelum && !r.lengkap;
      return `<tr class="${r.rank <= 3 ? 'lb-top' : ''}${belum ? ' lb-belum' : ''}"><td class="lb-n">${r.rank}</td><td>${esc(r.nama)}${r.perluCek ? ' (dicek)' : ''}</td><td class="lb-n">${esc(r.kelas)}</td><td class="lb-n">${fmt(r.kar)}</td><td class="lb-n">${fmt(r.sul)}</td><td class="lb-n"><strong>${fmt(r.akhir)}</strong></td><td class="lb-n">${belum ? 'Belum lengkap' : esc(kat(r.akhir).label)}</td><td class="lb-n">${r.kes == null ? '–' : Math.round(r.kes)}</td></tr>`;
    }).join('');
    const html = `${kop}
      <h2 class="cp-judul">Leaderboard Survei Karakter &amp; Sulingjar</h2>
      <table class="cp-info"><tbody>
        <tr><th>Peringkat</th><td>: ${esc(h.labelTes)}</td><th>Kelas</th><td>: ${S.kelas ? esc(S.kelas) : 'Seluruh kelas'}</td></tr>
        <tr><th>Peserta</th><td>: ${h.rows.length} siswa (${h.nLengkap} lengkap)</td><th>Tanggal</th><td>: ${esc(waktu)}</td></tr>
      </tbody></table>
      <table class="lb-print"><thead><tr><th class="lb-n" style="width:8%">Rank</th><th>Nama Siswa</th><th class="lb-n" style="width:8%">Kelas</th><th class="lb-n" style="width:12%">Survei Karakter</th><th class="lb-n" style="width:11%">Sulingjar</th><th class="lb-n" style="width:11%">Nilai Akhir</th><th class="lb-n" style="width:13%">Kategori</th><th class="lb-n" style="width:11%">Kesungguhan</th></tr></thead><tbody>${baris}</tbody></table>
      <p class="lb-catatan">Nilai survei 0–100 dihitung dari jawaban survei (bukan benar/salah) dan terpisah dari nilai tes. Nilai Akhir = rata-rata Survei Karakter dan Sulingjar. Kategori: Baik ≥ 75, Sedang 50–74,99, Perlu perhatian &lt; 50 (acuan latihan). Kesungguhan menilai ketelitian mengisi. Dokumen untuk guru, bukan untuk dibagikan ke siswa.</p>
      <footer class="cp-foot"><span>Dicetak dari ${esc(namaSekolah)}</span><span>${esc(waktu)}</span></footer>`;
    Guru._cetakArea_(html, ['Leaderboard Survei', h.labelTes, S.kelas || 'Semua Kelas'].join(' - '));
  }

  // ---------------- pemasangan ----------------
  function atur() { if (typeof Leaderboard !== 'undefined' && Leaderboard.bukaAtur) Leaderboard.bukaAtur(); else toast('Modul Leaderboard belum dimuat.', 'error'); }
  function tandaiBasi() { S.waktu = 0; }
  function buka() { if (!S.dimuat || Date.now() - S.waktu > 60000) muat(); else render(); }
  const _gantiTab = UI.gantiTabGuru;
  UI.gantiTabGuru = function (tabId) { _gantiTab.call(UI, tabId); if (tabId === 'tab-lb-survei') buka(); };
  // Pengaturan nomor Tes (Atur Tes) dibagi dengan Leaderboard tes: setelah disimpan, data survei ikut dimuat ulang.
  if (typeof Leaderboard !== 'undefined' && Leaderboard.simpanAtur) {
    const _simpan = Leaderboard.simpanAtur;
    Leaderboard.simpanAtur = function () { _simpan.apply(Leaderboard, arguments); S.tes = 'semua'; S.kelas = ''; tandaiBasi(); };
  }

  return { buka, muat, render, pilihTes, pilihKelas, unduh, cetak, atur, tandaiBasi, _S: S };
})();
