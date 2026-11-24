/* ============================================================================
   FOTO PROFIL SISWA
   - Siswa mengunggah / mengganti / menghapus foto profil dari menu pengguna (pojok kanan atas)
     atau dengan mengetuk avatar di Portal Siswa.
   - Editor pemangkas bulat: geser, zoom (slider, roda mouse, cubit 2 jari), putar 90°, pintasan keyboard.
   - Foto apa pun (JPG/PNG/WEBP/HEIC, resolusi tinggi) dipangkas persegi 512 px + pratinjau 128 px, dikompres di
     perangkat. Mode Server: foto penuh disimpan PRIVAT di Google Drive (folder CBT_Foto_Profil); pratinjau tampil
     sebagai avatar. Mode Lokal: hanya pratinjau, disimpan di perangkat ini.
   - Guru melihat foto di tabel Data Siswa, dapat membukanya di Drive atau menghapusnya.
   Dimuat SETELAH portal-siswa.js. Memakai BuktiFoto (app.js) untuk membaca foto (termasuk HEIC) dengan hemat memori.
   ============================================================================ */
'use strict';
const FotoProfil = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => escapeHtml_(t);
  const UKURAN_PENUH = 512, UKURAN_THUMB = 128, MAKS_BYTE_PENUH = 180 * 1024, MAKS_THUMB_CHAR = 26000, MAKS_BERKAS = 25 * 1024 * 1024;
  const ZOOM_MAKS = 4;
  const S = { buka: false, sumber: null, rot: 0, zoom: 1, ox: 0, oy: 0, sisi: 280, sibuk: false, ada: false, pemicu: null, ptr: new Map(), jarak0: 0, zoom0: 1 };

  // ---------------- gaya ----------------
  const CSS = `
.fp-av { display: inline-grid; place-items: center; overflow: hidden; border-radius: 50%; background: linear-gradient(135deg, #326698, #0d6efd); color: #fff; font-weight: 700; letter-spacing: .03em; flex: none; }
.fp-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.anbk-user-ico.fp-has { background: none; border-radius: 50%; overflow: hidden; padding: 0; box-shadow: 0 0 0 2px rgba(255,255,255,.85); }
.anbk-user-ico.fp-has img { width: 100%; height: 100%; object-fit: cover; display: block; }
#sw-screen .sw-av.fp-has { background: #e9eef6; overflow: hidden; padding: 0; }
#sw-screen .sw-av img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
.fp-av-btn { all: unset; box-sizing: border-box; position: relative; cursor: pointer; border-radius: 50%; flex: none; display: block; }
.fp-av-btn:focus-visible { outline: 3px solid #0d6efd; outline-offset: 2px; }
.fp-av-btn .fp-cam { position: absolute; right: -3px; bottom: -3px; width: 20px; height: 20px; border-radius: 50%; background: #0d6efd; color: #fff; display: grid; place-items: center; font-size: 9px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(13,60,130,.35); transition: transform .15s; }
.fp-av-btn:hover .fp-cam { transform: scale(1.12); }
#sw-screen .sw-hero .fp-hero-av { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); z-index: 2; }
#sw-screen .sw-hero .fp-hero-av .fp-av { width: 84px; height: 84px; font-size: 28px; box-shadow: 0 0 0 4px rgba(255,255,255,.9), 0 12px 26px rgba(10,30,70,.35); }
#sw-screen .sw-hero .fp-hero-av .fp-cam { width: 28px; height: 28px; font-size: 12px; right: 0; bottom: 0; }
@media (max-width: 640px) { #sw-screen .sw-hero .fp-hero-av { position: static; transform: none; margin-bottom: .7rem; } #sw-screen .sw-hero .fp-hero-av .fp-av { width: 64px; height: 64px; font-size: 22px; } }
.fp-mini { width: 38px; height: 38px; font-size: 13px; }
.fp-mini-btn { all: unset; cursor: pointer; border-radius: 50%; display: block; }
.fp-mini-btn:focus-visible { outline: 3px solid #0d6efd; outline-offset: 2px; }

.fp-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(12, 24, 48, .62); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 14px; animation: fp-fade .16s ease-out; }
.fp-dialog { width: 100%; max-width: 440px; max-height: calc(100dvh - 28px); overflow: auto; background: #fff; color: #1f2937; border-radius: 16px; box-shadow: 0 30px 70px rgba(8,20,45,.45); display: flex; flex-direction: column; animation: fp-naik .2s ease-out; font-family: 'Poppins', sans-serif; }
.fp-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 18px 20px 6px; }
.fp-head h3 { margin: 0; font-size: 17px; font-weight: 600; color: #12304f; }
.fp-head p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; }
.fp-x { all: unset; box-sizing: border-box; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #64748b; flex: none; }
.fp-x:hover { background: #eef2f7; color: #1f2937; }
.fp-x:focus-visible, .fp-btn:focus-visible, .fp-ikon:focus-visible { outline: 3px solid #0d6efd; outline-offset: 2px; }
.fp-body { padding: 8px 20px 4px; }
.fp-stage-box { display: flex; justify-content: center; }
.fp-stage { position: relative; border-radius: 14px; overflow: hidden; background: #eef2f7; touch-action: none; user-select: none; -webkit-user-select: none; }
.fp-stage canvas { display: block; width: 100%; height: 100%; cursor: grab; outline: none; }
.fp-stage canvas:active { cursor: grabbing; }
.fp-stage canvas:focus-visible { box-shadow: inset 0 0 0 3px #0d6efd; }
.fp-kosong { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 18px; color: #475569; border: 2px dashed #b6c3d4; border-radius: 14px; background: #f6f9fd; transition: background .15s, border-color .15s; }
.fp-stage.fp-seret .fp-kosong { background: #e4efff; border-color: #0d6efd; }
.fp-kosong i { font-size: 30px; color: #326698; }
.fp-kosong b { font-size: 14px; color: #12304f; font-weight: 600; }
.fp-kosong span { font-size: 12px; line-height: 1.5; }
.fp-kontrol { display: flex; align-items: center; gap: 10px; margin: 14px 0 4px; }
.fp-kontrol input[type=range] { flex: 1; accent-color: #0d6efd; min-width: 0; height: 28px; }
.fp-ikon { all: unset; box-sizing: border-box; cursor: pointer; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; color: #326698; background: #eef4ff; flex: none; font-size: 14px; }
.fp-ikon:hover { background: #dce9ff; }
.fp-ikon[disabled] { opacity: .45; cursor: not-allowed; }
.fp-pilih { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
.fp-tips { margin: 12px 0 0; padding: 10px 12px; list-style: none; background: #f4f8fd; border-radius: 10px; font-size: 12px; line-height: 1.55; color: #4b5b70; display: grid; gap: 3px; }
.fp-tips li::before { content: '✓'; color: #198754; font-weight: 700; margin-right: 7px; }
.fp-status { min-height: 22px; margin: 10px 0 0; font-size: 12.8px; line-height: 1.45; display: flex; align-items: flex-start; gap: 7px; }
.fp-status.galat { color: #b42318; } .fp-status.ok { color: #157347; } .fp-status.info { color: #475569; }
.fp-foot { display: flex; gap: 8px; align-items: center; padding: 12px 20px 18px; flex-wrap: wrap; }
.fp-foot .fp-sp { flex: 1; }
.fp-btn { all: unset; box-sizing: border-box; cursor: pointer; padding: 10px 16px; border-radius: 10px; font: 500 13.5px 'Poppins', sans-serif; display: inline-flex; align-items: center; gap: 8px; justify-content: center; border: 1px solid #cdd6e2; background: #fff; color: #1f2937; transition: background .12s, box-shadow .12s; }
.fp-btn:hover { background: #f1f5fa; }
.fp-btn.utama { background: #0d6efd; border-color: #0d6efd; color: #fff; box-shadow: 0 6px 16px -6px rgba(13,110,253,.7); }
.fp-btn.utama:hover { background: #0b5ed7; }
.fp-btn.bahaya { color: #b42318; border-color: #f3c9c5; }
.fp-btn.bahaya:hover { background: #fdf0ef; }
.fp-btn[disabled] { opacity: .5; cursor: not-allowed; box-shadow: none; }
.fp-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.45); border-top-color: #fff; animation: fp-putar .7s linear infinite; }
.fp-status .fp-spin { border-color: rgba(71,85,105,.25); border-top-color: #475569; margin-top: 2px; flex: none; }
@keyframes fp-putar { to { transform: rotate(360deg); } }
@keyframes fp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes fp-naik { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .fp-overlay, .fp-dialog, .fp-av-btn .fp-cam, .fp-spin { animation: none !important; transition: none !important; } }
@media (max-width: 480px) { .fp-foot .fp-btn { flex: 1 1 auto; } .fp-foot .fp-sp { display: none; } }
`;
  (function pasangCss() {
    if ($('foto-profil-css')) return;
    const st = document.createElement('style'); st.id = 'foto-profil-css'; st.textContent = CSS; document.head.appendChild(st);
  })();

  // ---------------- avatar ----------------
  const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
  const fotoUser = () => (state.user && state.user.role === 'siswa' && state.user.foto) ? state.user.foto : '';
  function avatarHtml(nama, foto, kelas) {
    return `<span class="fp-av ${kelas || ''}">${foto ? `<img src="${esc(foto)}" alt="" decoding="async">` : esc(inisial(nama))}</span>`;
  }

  function terapkanAvatar() {
    const u = state.user; if (!u || u.role !== 'siswa') return;
    const foto = fotoUser();
    // ikon kecil di header (portal siswa, konfirmasi, dll.)
    document.querySelectorAll('.anbk-user-ico').forEach(el => {
      if (foto) {
        if (el.dataset.fpSrc !== foto) { el.innerHTML = `<img src="${esc(foto)}" alt="Foto profil" decoding="async">`; el.dataset.fpSrc = foto; }
        el.classList.add('fp-has');
      } else if (el.classList.contains('fp-has')) {
        el.classList.remove('fp-has'); delete el.dataset.fpSrc; el.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
      }
    });
    // avatar di sisi kiri Portal Siswa -> tombol yang membuka editor
    const av = document.querySelector('#sw-side .sw-av');
    if (av && !av.closest('.fp-av-btn')) {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fp-av-btn';
      btn.setAttribute('aria-label', 'Ubah foto profil'); btn.title = 'Ubah foto profil'; btn.addEventListener('click', (e) => buka(e.currentTarget));
      av.parentNode.insertBefore(btn, av); btn.appendChild(av);
      btn.insertAdjacentHTML('beforeend', '<span class="fp-cam" aria-hidden="true"><i class="fa-solid fa-camera"></i></span>');
    }
    if (av) {
      if (foto) { if (av.dataset.fpSrc !== foto) { av.innerHTML = `<img src="${esc(foto)}" alt="Foto profil" decoding="async">`; av.dataset.fpSrc = foto; } av.classList.add('fp-has'); }
      else if (av.classList.contains('fp-has')) { av.classList.remove('fp-has'); delete av.dataset.fpSrc; av.textContent = inisial(u.nama); }
    }
    // avatar besar di banner Dashboard
    const hero = document.querySelector('#sw-isi .sw-hero');
    if (hero) {
      let h = hero.querySelector('.fp-hero-av');
      if (!h) {
        h = document.createElement('button'); h.type = 'button'; h.className = 'fp-av-btn fp-hero-av';
        h.setAttribute('aria-label', 'Ubah foto profil'); h.title = 'Ubah foto profil'; h.addEventListener('click', (e) => buka(e.currentTarget));
        hero.insertBefore(h, hero.firstChild);
      }
      const kunci = foto || ('i:' + inisial(u.nama));
      if (h.dataset.fpSrc !== kunci) { h.innerHTML = avatarHtml(u.nama, foto) + '<span class="fp-cam" aria-hidden="true"><i class="fa-solid fa-camera"></i></span>'; h.dataset.fpSrc = kunci; }
    }
  }

  function pasangMenu() {
    document.querySelectorAll('.anbk-usermenu').forEach(m => {
      if (m.querySelector('[data-aksi="foto"]')) return;
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-aksi', 'foto');
      b.innerHTML = '<i class="fa-solid fa-camera"></i> Foto Profil';
      b.addEventListener('click', (e) => { m.classList.add('hidden'); buka(e.currentTarget); });
      const keluar = [...m.querySelectorAll('button')].find(x => /Auth\.logout/.test(x.getAttribute('onclick') || ''));
      m.insertBefore(b, keluar || null);
    });
  }

  // ---------------- pemangkas ----------------
  function ukuranSisi() { return Math.max(200, Math.min(300, window.innerWidth - 72)); }
  function dimRot() { const r = S.rot % 2 === 1; return { w: r ? S.sumber.h : S.sumber.w, h: r ? S.sumber.w : S.sumber.h }; }
  function skalaDasar(sisi) { const d = dimRot(); return sisi / Math.min(d.w, d.h); }
  function jepit(sisi) {
    if (!S.sumber) return;
    const d = dimRot(), sk = skalaDasar(sisi) * S.zoom;
    const mx = Math.max(0, (d.w * sk - sisi) / 2), my = Math.max(0, (d.h * sk - sisi) / 2);
    S.ox = Math.min(mx, Math.max(-mx, S.ox)); S.oy = Math.min(my, Math.max(-my, S.oy));
  }
  // menggambar sumber (terpangkas) ke ctx berukuran 'sisi' x 'sisi'; faktor = rasio terhadap tampilan editor
  function gambarSumber(ctx, sisi, faktor) {
    const sk = skalaDasar(S.sisi) * S.zoom * faktor;
    ctx.save();
    ctx.translate(sisi / 2 + S.ox * faktor, sisi / 2 + S.oy * faktor);
    ctx.rotate(S.rot * Math.PI / 2);
    ctx.scale(sk, sk);
    ctx.drawImage(S.sumber.sumber, -S.sumber.w / 2, -S.sumber.h / 2, S.sumber.w, S.sumber.h);
    ctx.restore();
  }
  function gambar() {
    const c = $('fp-canvas'); if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.round(S.sisi * dpr);
    if (c.width !== px || c.height !== px) { c.width = px; c.height = px; } // kanvas bawaan 300x150: cek DUA sisi
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#eef2f7'; ctx.fillRect(0, 0, S.sisi, S.sisi);
    if (!S.sumber) return;
    jepit(S.sisi);
    gambarSumber(ctx, S.sisi, 1);
    // gelapkan area di luar lingkaran + cincin panduan
    ctx.save(); ctx.fillStyle = 'rgba(10,22,44,.55)'; ctx.beginPath();
    const r = S.sisi / 2 - 8, cx = S.sisi / 2;
    ctx.rect(0, 0, S.sisi, S.sisi); ctx.moveTo(cx + r, cx); ctx.arc(cx, cx, r, 0, Math.PI * 2, false); ctx.closePath(); ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S.sisi / 2, S.sisi / 2, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function aturZoom(z) {
    S.zoom = Math.min(ZOOM_MAKS, Math.max(1, z)); const r = $('fp-zoom'); if (r) r.value = String(S.zoom); gambar();
  }

  async function muatBerkas(file) {
    if (!file || S.sibuk) return;
    const heic = BuktiFoto.adalahHeic(file);
    if (!heic && !/^image\//i.test(file.type || '')) return status('Berkas harus berupa gambar (JPG, PNG, WEBP, atau HEIC).', 'galat');
    if (file.size > MAKS_BERKAS) return status('Ukuran berkas terlalu besar (maksimal 25 MB).', 'galat');
    status('Membaca foto…', 'info', true);
    try {
      let blob = file, dekode = null;
      if (heic) {
        try { dekode = await BuktiFoto._dekodeHemat(file, 1600); }
        catch (e) {
          await muatPustaka_('heic2any');
          const h = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
          blob = Array.isArray(h) ? h[0] : h;
        }
      }
      if (!dekode) dekode = await BuktiFoto._dekodeHemat(blob, 1600);
      if (S.sumber && S.sumber.tutup) S.sumber.tutup();
      if (dekode.w < 120 || dekode.h < 120) { dekode.tutup(); return status('Foto terlalu kecil. Pilih foto minimal 120 × 120 piksel.', 'galat'); }
      S.sumber = dekode; S.rot = 0; S.zoom = 1; S.ox = 0; S.oy = 0;
      tampilkanEditor(true); aturZoom(1); status('Geser dan perbesar foto sampai wajah berada di tengah lingkaran.', 'info');
    } catch (e) {
      status('Foto ini tidak bisa dibaca. Coba foto lain atau ubah ke format JPG.', 'galat');
    }
  }

  function tampilkanEditor(ada) {
    const k = $('fp-kosong'); if (k) k.style.display = ada ? 'none' : '';
    ['fp-zoom', 'fp-putar', 'fp-simpan'].forEach(id => { const e = $(id); if (e) e.disabled = !ada; });
    const sm = $('fp-zoom-min'), sp = $('fp-zoom-plus'); if (sm) sm.disabled = !ada; if (sp) sp.disabled = !ada;
    const lbl = $('fp-ganti-teks'); if (lbl) lbl.textContent = ada ? 'Ganti foto' : 'Pilih foto';
  }

  function status(teks, jenis, putar) {
    const el = $('fp-status'); if (!el) return;
    el.className = 'fp-status ' + (jenis || 'info');
    el.innerHTML = (putar ? '<span class="fp-spin" aria-hidden="true"></span>' : '') + `<span>${esc(teks)}</span>`;
  }

  // ---------------- ekspor & unggah ----------------
  function keKanvas(sisiPx) {
    const c = document.createElement('canvas'); c.width = c.height = sisiPx; const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sisiPx, sisiPx); ctx.imageSmoothingQuality = 'high';
    gambarSumber(ctx, sisiPx, sisiPx / S.sisi);
    return c;
  }
  const kanvasKeBlob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
  async function siapkanHasil() {
    jepit(S.sisi);
    const penuh = keKanvas(UKURAN_PENUH);
    let q = 0.9, blob = await kanvasKeBlob(penuh, q);
    while (blob && blob.size > MAKS_BYTE_PENUH && q > 0.55) { q -= 0.07; blob = await kanvasKeBlob(penuh, q); }
    penuh.width = penuh.height = 0;
    const kecil = keKanvas(UKURAN_THUMB);
    let qt = 0.82, thumb = kecil.toDataURL('image/jpeg', qt);
    while (thumb.length > MAKS_THUMB_CHAR && qt > 0.45) { qt -= 0.07; thumb = kecil.toDataURL('image/jpeg', qt); }
    kecil.width = kecil.height = 0;
    if (!blob || thumb.length > MAKS_THUMB_CHAR + 3000) throw new Error('Gagal memproses foto. Coba foto lain.');
    return { blob, thumb };
  }

  async function simpan() {
    if (S.sibuk || !S.sumber) return;
    kunci(true); status('Menyiapkan foto…', 'info', true);
    try {
      const { blob, thumb } = await siapkanHasil();
      const base64 = await BuktiFoto.blobKeBase64(blob);
      status('Mengunggah' + (modeServerAktif() ? ' ke Google Drive' : '') + '…', 'info', true);
      const res = await api('uploadFotoProfil', { siswaId: state.user.id, deviceId: state.deviceId, base64, mimeType: 'image/jpeg', filename: 'profil.jpg', thumb });
      if (!res || !res.ok) throw new Error((res && res.error) || 'Gagal mengunggah foto.');
      perbaruiFotoUser(res.thumb || thumb);
      status('Foto profil berhasil disimpan.', 'ok');
      toast('Foto profil diperbarui.', 'success');
      setTimeout(() => tutup(true), 650);
    } catch (e) {
      kunci(false);
      status((e && e.message) || 'Gagal menyimpan foto.', 'galat');
    }
  }

  async function hapus() {
    if (S.sibuk) return;
    const ya = await Dialog.konfirmasi({ judul: 'Hapus foto profil?', tipe: 'danger', ikon: 'fa-trash', pesan: 'Foto profil Anda akan dihapus. Anda bisa mengunggah foto baru kapan saja.', teksYa: 'Ya, Hapus' });
    if (!ya) return;
    kunci(true); status('Menghapus foto…', 'info', true);
    const res = await api('hapusFotoProfil', { siswaId: state.user.id, deviceId: state.deviceId });
    if (res && res.ok) { perbaruiFotoUser(''); toast('Foto profil dihapus.', 'success'); tutup(true); }
    else { kunci(false); status((res && res.error) || 'Gagal menghapus foto.', 'galat'); }
  }

  function perbaruiFotoUser(thumb) {
    state.user.foto = thumb || '';
    try { sessionStorage.setItem('cbt_user', JSON.stringify(state.user)); } catch (e) { /* abaikan */ }
    terapkanAvatar();
  }

  function kunci(v) {
    S.sibuk = v;
    const d = $('fp-dialog'); if (!d) return;
    d.setAttribute('aria-busy', v ? 'true' : 'false');
    d.querySelectorAll('button, input').forEach(e => { if (v) { e.dataset.fpMati = e.disabled ? '1' : ''; e.disabled = true; } else if (e.dataset.fpMati !== undefined) { e.disabled = e.dataset.fpMati === '1'; delete e.dataset.fpMati; } });
    const sp = $('fp-simpan'); if (sp) sp.innerHTML = v ? '<span class="fp-spin"></span> Memproses…' : '<i class="fa-solid fa-check"></i> Simpan foto';
    if (!v) tampilkanEditor(!!S.sumber);
  }

  // ---------------- dialog ----------------
  function buka(pemicu) {
    if (S.buka || !state.user || state.user.role !== 'siswa') return;
    S.buka = true; S.pemicu = pemicu || document.activeElement; S.sumber = null; S.rot = 0; S.zoom = 1; S.ox = 0; S.oy = 0; S.ptr.clear();
    S.sisi = ukuranSisi(); S.ada = !!fotoUser();
    const seluler = BuktiFoto.perangkatSeluler();
    const o = document.createElement('div'); o.className = 'fp-overlay'; o.id = 'fp-overlay';
    o.innerHTML = `<div class="fp-dialog" id="fp-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-judul" aria-describedby="fp-sub">
      <div class="fp-head"><div><h3 id="fp-judul">Foto Profil</h3><p id="fp-sub">${S.ada ? 'Ganti atau hapus foto profil Anda.' : 'Tambahkan foto agar akun Anda mudah dikenali.'}</p></div>
        <button type="button" class="fp-x" id="fp-tutup" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="fp-body">
        <div class="fp-stage-box"><div class="fp-stage" id="fp-stage" style="width:${S.sisi}px;height:${S.sisi}px">
          <canvas id="fp-canvas" tabindex="0" role="img" aria-label="Area pangkas foto. Panah menggeser, tanda plus dan minus memperbesar atau memperkecil, huruf R memutar."></canvas>
          <div class="fp-kosong" id="fp-kosong" aria-hidden="false">${S.ada ? `<span class="fp-av" style="width:96px;height:96px"><img src="${esc(fotoUser())}" alt="Foto profil saat ini"></span><b>Foto saat ini</b><span>Pilih foto baru untuk menggantinya,<br>atau seret foto ke sini.</span>` : `<i class="fa-regular fa-image"></i><b>Seret foto ke sini</b><span>atau pilih dari perangkat Anda.<br>JPG, PNG, WEBP, atau HEIC.</span>`}</div>
        </div></div>
        <div class="fp-kontrol">
          <button type="button" class="fp-ikon" id="fp-zoom-min" aria-label="Perkecil" disabled><i class="fa-solid fa-magnifying-glass-minus"></i></button>
          <input type="range" id="fp-zoom" min="1" max="${ZOOM_MAKS}" step="0.01" value="1" aria-label="Zoom foto" disabled>
          <button type="button" class="fp-ikon" id="fp-zoom-plus" aria-label="Perbesar" disabled><i class="fa-solid fa-magnifying-glass-plus"></i></button>
          <button type="button" class="fp-ikon" id="fp-putar" aria-label="Putar 90 derajat" title="Putar 90°" disabled><i class="fa-solid fa-rotate-right"></i></button>
        </div>
        <div class="fp-pilih">
          <button type="button" class="fp-btn" id="fp-ganti"><i class="fa-regular fa-folder-open"></i> <span id="fp-ganti-teks">Pilih foto</span></button>
          ${seluler ? '<button type="button" class="fp-btn" id="fp-kamera"><i class="fa-solid fa-camera"></i> Kamera</button>' : ''}
        </div>
        <input type="file" id="fp-file" accept="image/*,.heic,.heif" hidden>
        ${seluler ? '<input type="file" id="fp-file-kamera" accept="image/*" capture="user" hidden>' : ''}
        <ul class="fp-tips"><li>Wajah terlihat jelas dan menghadap ke depan</li><li>Cahaya cukup, latar sederhana</li><li>Foto dikompres otomatis; cukup foto biasa dari HP</li></ul>
        <div class="fp-status info" id="fp-status" role="status" aria-live="polite"><span></span></div>
      </div>
      <div class="fp-foot">
        ${S.ada ? '<button type="button" class="fp-btn bahaya" id="fp-hapus"><i class="fa-regular fa-trash-can"></i> Hapus foto</button>' : ''}
        <span class="fp-sp"></span>
        <button type="button" class="fp-btn" id="fp-batal">Batal</button>
        <button type="button" class="fp-btn utama" id="fp-simpan" disabled><i class="fa-solid fa-check"></i> Simpan foto</button>
      </div></div>`;
    document.body.appendChild(o);
    document.body.style.overflow = 'hidden';
    pasangEvent(o);
    gambar(); tampilkanEditor(false);
    setTimeout(() => { const f = $('fp-ganti'); if (f) f.focus(); }, 30);
  }

  function pasangEvent(o) {
    const klik = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
    klik('fp-tutup', () => tutup()); klik('fp-batal', () => tutup()); klik('fp-simpan', simpan); klik('fp-hapus', hapus);
    klik('fp-ganti', () => $('fp-file').click()); klik('fp-kamera', () => $('fp-file-kamera').click());
    klik('fp-putar', () => { S.rot = (S.rot + 1) % 4; S.ox = S.oy = 0; gambar(); });
    klik('fp-zoom-min', () => aturZoom(S.zoom - 0.25)); klik('fp-zoom-plus', () => aturZoom(S.zoom + 0.25));
    ['fp-file', 'fp-file-kamera'].forEach(id => { const e = $(id); if (e) e.addEventListener('change', () => { const f = e.files && e.files[0]; e.value = ''; muatBerkas(f); }); });
    $('fp-zoom').addEventListener('input', (e) => aturZoom(parseFloat(e.target.value)));
    o.addEventListener('mousedown', (e) => { if (e.target === o && !S.sibuk) tutup(); });
    o.addEventListener('keydown', kunciKeyboard);

    const st = $('fp-stage'), cv = $('fp-canvas');
    ['dragenter', 'dragover'].forEach(n => st.addEventListener(n, (e) => { e.preventDefault(); st.classList.add('fp-seret'); }));
    ['dragleave', 'drop'].forEach(n => st.addEventListener(n, (e) => { e.preventDefault(); st.classList.remove('fp-seret'); }));
    st.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) muatBerkas(f); });
    st.addEventListener('click', (e) => { if (!S.sumber && !S.sibuk && e.target.closest('#fp-kosong')) $('fp-file').click(); });
    cv.addEventListener('wheel', (e) => { if (!S.sumber) return; e.preventDefault(); aturZoom(S.zoom * (e.deltaY < 0 ? 1.08 : 0.926)); }, { passive: false });
    cv.addEventListener('pointerdown', (e) => {
      if (!S.sumber || S.sibuk) return; cv.setPointerCapture(e.pointerId); S.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (S.ptr.size === 2) { const [a, b] = [...S.ptr.values()]; S.jarak0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; S.zoom0 = S.zoom; }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = S.ptr.get(e.pointerId); if (!p || !S.sumber) return;
      if (S.ptr.size === 1) { S.ox += e.clientX - p.x; S.oy += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; gambar(); }
      else { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...S.ptr.values()]; aturZoom(S.zoom0 * (Math.hypot(a.x - b.x, a.y - b.y) / S.jarak0)); }
    });
    const lepas = (e) => { S.ptr.delete(e.pointerId); };
    cv.addEventListener('pointerup', lepas); cv.addEventListener('pointercancel', lepas);
    window.addEventListener('resize', ubahUkuran);
  }

  function ubahUkuran() {
    if (!S.buka) return; const baru = ukuranSisi(); if (baru === S.sisi) return;
    const f = baru / S.sisi; S.ox *= f; S.oy *= f; S.sisi = baru;
    const st = $('fp-stage'); if (st) { st.style.width = baru + 'px'; st.style.height = baru + 'px'; } gambar();
  }

  function kunciKeyboard(e) {
    if (e.key === 'Escape') { if (!S.sibuk) { e.preventDefault(); e.stopPropagation(); tutup(); } return; }
    if (e.key === 'Tab') { // jebakan fokus di dalam dialog
      const f = [...$('fp-dialog').querySelectorAll('button:not([disabled]), input:not([disabled]):not([type=hidden]), canvas[tabindex]')].filter(x => x.offsetParent !== null);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      return;
    }
    if (document.activeElement !== $('fp-canvas') || !S.sumber || S.sibuk) return;
    const langkah = e.shiftKey ? 24 : 8; let ubah = true;
    if (e.key === 'ArrowLeft') S.ox -= langkah; else if (e.key === 'ArrowRight') S.ox += langkah;
    else if (e.key === 'ArrowUp') S.oy -= langkah; else if (e.key === 'ArrowDown') S.oy += langkah;
    else if (e.key === '+' || e.key === '=') { aturZoom(S.zoom + 0.1); ubah = false; }
    else if (e.key === '-' || e.key === '_') { aturZoom(S.zoom - 0.1); ubah = false; }
    else if (e.key === 'r' || e.key === 'R') { S.rot = (S.rot + 1) % 4; S.ox = S.oy = 0; }
    else return;
    e.preventDefault(); if (ubah) gambar();
  }

  function tutup(paksa) {
    if (!S.buka || (S.sibuk && !paksa)) return;
    S.buka = false; S.sibuk = false;
    if (S.sumber && S.sumber.tutup) S.sumber.tutup(); S.sumber = null;
    window.removeEventListener('resize', ubahUkuran);
    const o = $('fp-overlay'); if (o) o.remove();
    document.body.style.overflow = '';
    const p = S.pemicu; S.pemicu = null;
    if (p && p.isConnected && typeof p.focus === 'function') { try { p.focus(); } catch (e) { /* abaikan */ } }
  }

  // ---------------- sisi guru: Data Siswa ----------------
  function miniGuru(s) {
    const av = avatarHtml(s.nama, s.foto, 'fp-mini');
    return s.foto
      ? `<button type="button" class="fp-mini-btn" onclick="FotoProfil.lihatGuru('${esc(s.id)}')" title="Lihat foto ${esc(s.nama)}" aria-label="Lihat foto ${esc(s.nama)}">${av}</button>`
      : `<span title="Belum ada foto">${av}</span>`;
  }
  function lihatGuru(id) {
    const s = (state.guru.daftarSiswa || []).find(x => x.id === id); if (!s || !s.foto || $('fp-overlay')) return;
    const waktu = s.fotoWaktu ? new Date(s.fotoWaktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const o = document.createElement('div'); o.className = 'fp-overlay'; o.id = 'fp-overlay';
    o.innerHTML = `<div class="fp-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-judul" style="max-width:360px">
      <div class="fp-head"><div><h3 id="fp-judul">${esc(s.nama)}</h3><p>Kelas ${esc(s.kelas || '-')}${waktu ? ' · diunggah ' + esc(waktu) : ''}</p></div>
        <button type="button" class="fp-x" id="fp-tutup" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="fp-body" style="display:grid;justify-items:center;gap:8px;padding-top:12px"><span class="fp-av" style="width:176px;height:176px"><img src="${esc(s.foto)}" alt="Foto ${esc(s.nama)}"></span>
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center">${s.fotoUrl ? 'Foto penuh tersimpan privat di Google Drive Anda (folder CBT_Foto_Profil).' : 'Mode Lokal: hanya pratinjau yang tersimpan.'}</p></div>
      <div class="fp-foot">
        <button type="button" class="fp-btn bahaya" id="fp-hapus-guru"><i class="fa-regular fa-trash-can"></i> Hapus foto</button><span class="fp-sp"></span>
        ${s.fotoUrl ? `<a class="fp-btn" href="${esc(s.fotoUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-google-drive"></i> Buka di Drive</a>` : ''}
        <button type="button" class="fp-btn utama" id="fp-tutup2">Tutup</button></div></div>`;
    const pemicu = document.activeElement;
    const tutupGuru = () => { o.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); if (pemicu && pemicu.isConnected) { try { pemicu.focus(); } catch (e) { /* abaikan */ } } };
    const esc_ = (e) => { if (e.key === 'Escape' && !document.querySelector('.dlg-backdrop')) tutupGuru(); };
    document.body.appendChild(o); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', esc_);
    o.addEventListener('mousedown', (e) => { if (e.target === o) tutupGuru(); });
    $('fp-tutup').addEventListener('click', tutupGuru); $('fp-tutup2').addEventListener('click', tutupGuru);
    $('fp-hapus-guru').addEventListener('click', async () => { if (await hapusGuru(id)) tutupGuru(); });
    setTimeout(() => $('fp-tutup2').focus(), 30);
  }
  async function hapusGuru(id) {
    const s = (state.guru.daftarSiswa || []).find(x => x.id === id); if (!s) return false;
    const ya = await Dialog.konfirmasi({ judul: 'Hapus foto siswa?', tipe: 'danger', ikon: 'fa-image', pesan: `Foto profil **${s.nama}** akan dihapus (berkas di Drive dipindah ke sampah). Siswa dapat mengunggah foto baru.`, rincian: [['Kelas', s.kelas]], teksYa: 'Ya, Hapus Foto' });
    if (!ya) return false;
    const res = await api('hapusFotoProfilGuru', { guruId: state.user.id, siswaId: id });
    if (res && res.ok) { toast('Foto siswa dihapus.', 'success'); Guru.muatDaftarSiswa(); return true; }
    toast('Gagal menghapus foto: ' + ((res && res.error) || ''), 'error'); return false;
  }

  // ---------------- pemasangan ----------------
  const _tampil = UI.tampilkan;
  UI.tampilkan = function (id) { _tampil.call(UI, id); pasangMenu(); terapkanAvatar(); };
  // Portal Siswa menggambar ulang sisi kiri & banner Dashboard setiap pindah menu -> pasang ulang avatar.
  // Hanya dua wadah itu yang diamati (bukan seluruh halaman), jadi layar ujian tidak terbebani.
  let _rafAv = 0;
  const _jadwalAv = () => { if (_rafAv) return; _rafAv = requestAnimationFrame(() => { _rafAv = 0; terapkanAvatar(); }); };
  ['sw-side', 'sw-isi'].forEach(id => { const el = $(id); if (el) new MutationObserver(_jadwalAv).observe(el, { childList: true }); });
  pasangMenu(); terapkanAvatar();

  return { buka, tutup, terapkanAvatar, miniGuru, lihatGuru, hapusGuru, avatarHtml };
})();
