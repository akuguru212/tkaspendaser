/* ============================================================================
   PWA — TKA SPENDASER
   1) Mendaftarkan service worker (syarat agar bisa diinstal di HP).
   2) Menampilkan tombol "Pasang Aplikasi" di layar login (Android/Chrome),
      atau petunjuk "Tambahkan ke Layar Utama" untuk iPhone/iPad (Safari).
   Catatan: PWA hanya aktif lewat HTTPS (mis. GitHub Pages / Netlify /
   Cloudflare Pages) atau localhost — bukan dari file:// atau http:// biasa.
   ============================================================================ */
(function () {
  'use strict';

  // ---- 1) Service worker ----
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) { console.warn('SW gagal didaftarkan:', err); });
    });
  }

  // ---- 2) Ajakan instal ----
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return;                                   // sudah terpasang / dibuka dari ikon

  var KUNCI = 'pwa-ajakan-ditutup';
  function sudahDitutup() { try { return localStorage.getItem(KUNCI) === '1'; } catch (e) { return false; } }
  function tandaiDitutup() { try { localStorage.setItem(KUNCI, '1'); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
    '#pwa-ajakan{position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));z-index:9999;' +
    'width:calc(100% - 24px);max-width:420px;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;' +
    'background:#fff;color:#1f2d3d;box-shadow:0 6px 24px rgba(0,0,0,.25);font:400 13px/1.35 Poppins,Arial,sans-serif}' +
    '#pwa-ajakan img{width:40px;height:40px;border-radius:9px;flex:none}' +
    '#pwa-ajakan .pa-t{flex:1;min-width:0}#pwa-ajakan .pa-t b{display:block;font-weight:600;font-size:13.5px}' +
    '#pwa-ajakan button{border:0;cursor:pointer;font:inherit}' +
    '#pwa-ajakan .pa-ya{background:#326698;color:#fff;padding:8px 14px;border-radius:8px;font-weight:600;flex:none}' +
    '#pwa-ajakan .pa-x{background:transparent;color:#7a8794;font-size:20px;line-height:1;padding:2px 4px;flex:none}';
  document.head.appendChild(css);

  var kotak = null, promptTertunda = null;

  function tutup(permanen) {
    if (kotak) { kotak.remove(); kotak = null; }
    if (permanen) tandaiDitutup();
  }

  function tampilkan(teks, labelTombol, aksi) {
    if (kotak || sudahDitutup()) return;
    var login = document.getElementById('login-screen');
    if (login && login.classList.contains('hidden')) return;   // hanya di layar login
    kotak = document.createElement('div');
    kotak.id = 'pwa-ajakan';
    kotak.setAttribute('role', 'dialog');
    kotak.innerHTML =
      '<img src="icons/logo-test-192.png?v=5" alt="">' +
      '<div class="pa-t"><b>Pasang aplikasi TKA SPENDASER</b>' + teks + '</div>' +
      (labelTombol ? '<button type="button" class="pa-ya">' + labelTombol + '</button>' : '') +
      '<button type="button" class="pa-x" aria-label="Tutup">&times;</button>';
    document.body.appendChild(kotak);
    kotak.querySelector('.pa-x').addEventListener('click', function () { tutup(true); });
    var ya = kotak.querySelector('.pa-ya');
    if (ya) ya.addEventListener('click', aksi);
    // hilang otomatis begitu siswa/guru berpindah dari layar login
    if (login && 'MutationObserver' in window) {
      var mo = new MutationObserver(function () { if (login.classList.contains('hidden')) { tutup(false); mo.disconnect(); } });
      mo.observe(login, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // Android / Chrome / Edge: tombol instal sungguhan
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptTertunda = e;
    tampilkan('Buka lebih cepat dari layar utama HP.', 'Pasang', function () {
      if (!promptTertunda) return;
      promptTertunda.prompt();
      promptTertunda.userChoice.finally(function () { promptTertunda = null; tutup(true); });
    });
  });
  window.addEventListener('appinstalled', function () { promptTertunda = null; tutup(true); });

  // iPhone / iPad (Safari): tidak ada prompt otomatis, tampilkan petunjuk
  var ua = navigator.userAgent || '';
  var iOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  if (iOS && safari) {
    window.addEventListener('load', function () {
      setTimeout(function () { tampilkan('Ketuk tombol <b>Bagikan</b> lalu pilih <b>Tambahkan ke Layar Utama</b>.', '', null); }, 1500);
    });
  }
})();
