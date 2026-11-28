/* ============================================================================
   TOKEN SISWA TERPILIH (Kelola Ujian > tombol "Token Siswa")
   Mengaktifkan token ujian hanya untuk siswa yang dicentang -- mis. siswa A terlambat/susulan karena sakit.
   - Siswa tercentang boleh memasukkan token & mengerjakan walau jadwal ujian sudah lewat (atau belum dibuka)
     dan walau kelasnya tidak aktif di "Token Kelas". Token-nya juga tampil di layar siswa itu saja.
   - Opsi "Nonaktifkan token semua kelas": siswa lain langsung ditolak (token kelas dikunci); hanya yang tercentang bisa.
   - Ujian harus berstatus AKTIF. Siswa yang sudah mulai mengerjakan tetap bisa melanjutkan.
   Penegakan ada di server (Code.gs: siswaDiaktifkanKhusus_) dan Mode Lokal (app.js). Dimuat SETELAH app.js.
   ============================================================================ */
'use strict';
const TokenSiswa = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml_(String(s == null ? '' : s));
  let T = null; // { id, judul, token, pilih:Set, daftar:[siswa], sibuk }

  function gaya() {
    if ($('ts-style')) return;
    const st = document.createElement('style'); st.id = 'ts-style';
    st.textContent = `
      #modal-token-siswa .ts-kunci { display: flex; gap: .55rem; align-items: flex-start; margin: .5rem 0; padding: .55rem .7rem; border: 1px solid var(--c-line); border-radius: 10px; background: var(--c-surface); font-size: .86rem; cursor: pointer; font-weight: 400; }
      #modal-token-siswa .ts-kunci input { width: 18px; height: 18px; flex: none; margin: .1rem 0 0; }
      #modal-token-siswa .ts-tools { display: flex; gap: .4rem; flex-wrap: wrap; align-items: center; margin: .3rem 0 .5rem; }
      #modal-token-siswa .ts-tools input[type=search] { flex: 1 1 150px; min-width: 0; }
      #modal-token-siswa .ts-tools select { flex: 0 1 140px; min-width: 0; }
      #modal-token-siswa .ts-tools button { padding: .35rem .7rem; font-size: .82rem; }
      #modal-token-siswa .ts-list { max-height: 44vh; overflow-y: auto; border: 1px solid var(--c-line); border-radius: 10px; background: var(--c-surface); }
      #modal-token-siswa .ts-item { display: flex; align-items: center; gap: .6rem; padding: .5rem .7rem; min-height: 42px; border-bottom: 1px solid var(--c-line); cursor: pointer; margin: 0; font-weight: 400; }
      #modal-token-siswa .ts-item:last-child { border-bottom: 0; }
      #modal-token-siswa .ts-item:hover { background: var(--c-hover); }
      #modal-token-siswa .ts-item.on { background: var(--c-ok-bg); }
      #modal-token-siswa .ts-item input { width: 18px; height: 18px; flex: none; margin: 0; }
      #modal-token-siswa .ts-item .n { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      #modal-token-siswa .ts-item .m { font-size: .76rem; color: var(--c-muted); white-space: nowrap; }
      #modal-token-siswa .ts-info { font-size: .85rem; color: var(--c-muted); margin: .45rem 0 0; }
      #modal-token-siswa .ts-kosong { padding: 1rem; text-align: center; color: var(--c-muted); font-size: .88rem; }`;
    document.head.appendChild(st);
  }

  async function buka(ujianId) {
    const u = (state.guru.ujianList || []).find(x => x.id === ujianId); if (!u) return;
    if (!(state.guru.daftarSiswa || []).length) {
      const r = await api('getDaftarSiswa', {});
      if (r && r.ok) state.guru.daftarSiswa = r.data;
    }
    const daftar = (state.guru.daftarSiswa || []).filter(s => s && s.id);
    if (!daftar.length) { toast('Belum ada data siswa. Impor atau tambahkan siswa dulu.', 'error'); return; }
    gaya();
    const lama = $('modal-token-siswa'); if (lama) lama.remove();
    daftar.sort((a, b) => String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }) || String(a.nama || '').localeCompare(String(b.nama || ''), 'id'));
    const ada = new Set(daftar.map(s => String(s.id)));
    T = { id: u.id, judul: u.judul, token: u.token, daftar, sibuk: false, pilih: new Set(siswaKhususUjian_(u).filter(id => ada.has(id))) };
    const kelas = Array.from(new Set(daftar.map(s => s.kelas || ''))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const m = document.createElement('div'); m.id = 'modal-token-siswa'; m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal" style="max-width:600px"><h3>👤 Token Siswa Terpilih</h3>
      <p class="subtitle" style="margin:0">${esc(u.judul)} — token <strong>${esc(u.token)}</strong></p>
      <p class="subtitle" style="margin:.4rem 0">Centang siswa yang token-nya <strong>diaktifkan khusus</strong> (mis. siswa susulan karena sakit). Siswa tercentang boleh memasukkan token dan mengerjakan walau <strong>jadwal ujian sudah lewat</strong> dan walau kelasnya tidak aktif; tokennya juga tampil di layar siswa itu. Ujian harus berstatus <strong>aktif</strong>. Siswa yang sudah mulai mengerjakan tetap bisa melanjutkan.</p>
      <label class="ts-kunci"><input type="checkbox" id="ts-kunci" checked><span><strong>Nonaktifkan token semua kelas</strong> — siswa lain ditolak, hanya siswa yang dicentang yang bisa mengerjakan.<br><span style="color:var(--c-muted)">Saat ini: <span id="ts-kelas-kini"></span>. Untuk membuka kelas lagi nanti, pakai tombol Token Kelas.</span></span></label>
      <div class="ts-tools">
        <input type="search" id="ts-cari" placeholder="Cari nama / NISN..." autocomplete="off">
        <select id="ts-kelas"><option value="">Semua kelas</option>${kelas.map(k => `<option value="${esc(k)}">${esc(k || '(tanpa kelas)')}</option>`).join('')}</select>
        <button type="button" class="secondary" id="ts-semua">Pilih semua</button>
        <button type="button" class="secondary" id="ts-kosong">Kosongkan</button>
      </div>
      <div class="ts-list" id="ts-list"></div>
      <p class="ts-info" id="ts-info"></p>
      <div class="modal-close-row"><button type="button" class="secondary" onclick="TokenSiswa.tutup()">Batal</button><button type="button" class="accent" id="ts-simpan" onclick="TokenSiswa.simpan()">Simpan</button></div></div>`;
    document.body.appendChild(m);
    $('ts-kelas-kini').innerHTML = ringkasTokenKelasSaja_(u);

    const tampil = () => {
      const k = $('ts-kelas').value, q = $('ts-cari').value.trim().toLowerCase();
      return T.daftar.filter(s => (!k || (s.kelas || '') === k) && (!q || String(s.nama || '').toLowerCase().includes(q) || String(s.nisn || '').toLowerCase().includes(q)));
    };
    const ringkas = () => {
      const n = T.pilih.size;
      $('ts-info').textContent = n ? n + ' siswa dipilih — token aktif khusus untuk mereka.' : 'Belum ada siswa dipilih (tidak ada token khusus).';
      $('ts-simpan').textContent = n ? 'Simpan (' + n + ' siswa)' : 'Simpan';
    };
    const gambar = () => {
      const t = tampil();
      $('ts-list').innerHTML = t.length ? t.map(s => `<label class="ts-item${T.pilih.has(String(s.id)) ? ' on' : ''}"><input type="checkbox" data-id="${esc(s.id)}"${T.pilih.has(String(s.id)) ? ' checked' : ''}><span class="n">${esc(s.nama || '(tanpa nama)')}</span><span class="m">${esc(s.kelas || '')}${s.nisn ? ' · ' + esc(s.nisn) : ''}</span></label>`).join('')
        : '<div class="ts-kosong">Tidak ada siswa yang cocok.</div>';
      ringkas();
    };
    $('ts-kelas').addEventListener('change', gambar);
    $('ts-cari').addEventListener('input', gambar);
    $('ts-semua').addEventListener('click', () => { tampil().forEach(s => T.pilih.add(String(s.id))); gambar(); });
    $('ts-kosong').addEventListener('click', () => { T.pilih = new Set(); gambar(); });
    $('ts-list').addEventListener('change', (e) => {
      const c = e.target; if (!c || c.type !== 'checkbox') return;
      const id = c.getAttribute('data-id'); if (c.checked) T.pilih.add(id); else T.pilih.delete(id);
      const baris = c.closest('.ts-item'); if (baris) baris.classList.toggle('on', c.checked);
      ringkas();
    });
    gambar();
  }

  function tutup() { const m = $('modal-token-siswa'); if (m) m.remove(); T = null; }

  async function simpan() {
    if (!T || T.sibuk) return;
    const kunci = !!$('ts-kunci').checked, ids = Array.from(T.pilih);
    if (kunci && !ids.length) {
      const ya = await Dialog.konfirmasi({
        judul: 'Tidak ada siswa dipilih', tipe: 'warning', ikon: 'fa-user-lock',
        pesan: `Tidak ada siswa yang dicentang, sedangkan token **semua kelas akan dinonaktifkan**. Akibatnya tidak ada siswa yang bisa mengerjakan **${T.judul}**.\n\nLanjutkan?`,
        teksYa: 'Ya, Lanjutkan'
      });
      if (!ya) return;
    }
    T.sibuk = true; const btn = $('ts-simpan'); if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    const res = await api('setTokenSiswa', { ujianId: T.id, siswa: JSON.stringify(ids), kunciKelas: kunci });
    if (!res || !res.ok) {
      T.sibuk = false; if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
      toast((res && res.error) || 'Gagal menyimpan token siswa.', 'error'); return;
    }
    const u = (state.guru.ujianList || []).find(x => x.id === T.id);
    if (u) {
      u.token_siswa = res.siswa !== undefined ? res.siswa : (ids.length ? JSON.stringify(ids) : '');
      if (kunci) u.token_kelas = res.kelas !== undefined ? res.kelas : '[]';
      const el = $('tk-ringkas-' + T.id); if (el) el.innerHTML = ringkasTokenKelas_(u);
    }
    const judul = T.judul; tutup();
    toast(ids.length ? `Token "${judul}" diaktifkan untuk ${ids.length} siswa terpilih${kunci ? '; kelas lain dinonaktifkan' : ''}.` : `Token siswa terpilih untuk "${judul}" dikosongkan${kunci ? '; token semua kelas dinonaktifkan' : ''}.`, 'success');
  }

  return { buka, tutup, simpan };
})();
window.TokenSiswa = TokenSiswa;
