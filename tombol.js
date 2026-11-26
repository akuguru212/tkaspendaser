/* Mengganti emoji di awal teks tombol (🗑 ✏ 👁 ↩ …) dengan ikon Font Awesome supaya
   seragam di semua perangkat. Hanya mengubah tampilan; teks & onclick tombol tetap. */
(function () {
  'use strict';
  var PETA = {
    '✏': 'fa-pen', '🗑': 'fa-trash-can', '👁': 'fa-eye', '↩': 'fa-rotate-left', '🗄': 'fa-box-archive',
    '🔓': 'fa-lock-open', '🔒': 'fa-lock', '🚫': 'fa-ban', '✅': 'fa-circle-check', '⏱': 'fa-clock',
    '⬇': 'fa-download', '⏸': 'fa-pause', '▶': 'fa-play', '🔑': 'fa-key', '🛡': 'fa-shield-halved',
    '⚠': 'fa-triangle-exclamation', '➕': 'fa-plus', '🔄': 'fa-rotate', '📥': 'fa-file-import', '📤': 'fa-file-export'
  };
  var RUANG = '#guru-portal, #detail-screen, .modal';
  var LEWATI = '.btn-salin-token, .rt-btn, .soal-grid button, [data-no-ikon]';

  function ubah(btn) {
    if (btn.dataset.ikon === '1' || btn.matches(LEWATI)) return;
    var n = btn.firstChild;
    while (n && n.nodeType === 3 && !n.nodeValue.trim()) n = n.nextSibling;
    if (!n || n.nodeType !== 3) return;
    var teks = n.nodeValue.replace(/^\s+/, '');
    var ch = teks.charAt(0), kode = teks.codePointAt(0);
    var kunci = String.fromCodePoint(kode);
    var kls = PETA[kunci];
    if (!kls) return;
    var sisa = teks.slice(kunci.length).replace(/^[\uFE0E\uFE0F]/, '').replace(/^\s+/, '');
    var i = document.createElement('i');
    i.className = 'fa-solid ' + kls; i.setAttribute('aria-hidden', 'true');
    n.nodeValue = sisa;
    btn.insertBefore(i, n);
    btn.dataset.ikon = '1';
  }

  function pindai(akar) {
    if (!akar || akar.nodeType !== 1) return;
    if (akar.matches && akar.matches('button')) { if (akar.closest(RUANG)) ubah(akar); return; }
    var daftar = akar.querySelectorAll ? akar.querySelectorAll('button') : [];
    for (var k = 0; k < daftar.length; k++) if (daftar[k].closest(RUANG)) ubah(daftar[k]);
  }

  var antre = false, baru = [];
  function jalan() {
    antre = false; var a = baru; baru = [];
    for (var k = 0; k < a.length; k++) pindai(a[k]);
  }
  function mulai() {
    pindai(document.body);
    new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        var add = muts[m].addedNodes;
        for (var j = 0; j < add.length; j++) if (add[j].nodeType === 1) baru.push(add[j]);
      }
      if (baru.length && !antre) { antre = true; requestAnimationFrame(jalan); }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
