/* ============================================================================
   SERVICE WORKER — TKA SPENDASER (PWA)
   - Membuat aplikasi bisa DIINSTAL di HP (Chrome/Edge/Samsung Internet).
   - Strategi: JARINGAN DULU, cache sebagai cadangan. Jadi saat online, siswa
     selalu mendapat file terbaru (tidak ada versi lama yang "nyangkut");
     saat sinyal putus, tampilan aplikasi tetap bisa dibuka dari cache.
   - Permintaan ke server data (Google Apps Script) TIDAK PERNAH di-cache,
     supaya soal, nilai, dan jawaban ujian selalu langsung dari server.
   Setelah mengganti file aplikasi, naikkan angka VERSI di bawah ini.
   ============================================================================ */
const VERSI = 'spendaser-v2-hp22';
const CACHE_APP = VERSI + '-app';
const CACHE_CDN = VERSI + '-cdn';

const SHELL = [
  './', 'index.html', 'manifest.json', 'config.js',
  'style.css', 'anbk.css', 'mobile.css', 'tombol.css',
  'app.js', 'anbk.js', 'survei.js', 'kunci-ujian.js', 'leaderboard.js', 'leaderboard-survei.js',
  'analisis-materi.js', 'perkembangan.js', 'rekap-ikut.js', 'laporan-pdf.js', 'portal-siswa.js',
  'foto-profil.js', 'tombol.js', 'pwa.js',
  'icons/tutwuri.png', 'icons/smpn2.png', 'icons/favicon.ico',
  'icons/logo-test-192.png', 'icons/logo-test-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_APP).then((c) =>
      // satu per satu: bila ada berkas yang tidak ada, instalasi tetap berhasil
      Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSI)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Host CDN yang boleh di-cache (font, ikon, KaTeX, dll.)
const CDN_OK = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

async function jaringanDulu(req, namaCache) {
  const cache = await caches.open(namaCache);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const beranda = (await cache.match('index.html')) || (await cache.match('./'));
      if (beranda) return beranda;
    }
    throw err;
  }
}

async function cacheDulu(req, namaCache) {
  const cache = await caches.open(namaCache);
  const hit = await cache.match(req);
  const ambil = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await ambil) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke server data: biarkan lewat
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;          // jangan cache SW itu sendiri
    e.respondWith(jaringanDulu(req, CACHE_APP));
    return;
  }
  if (CDN_OK.includes(url.hostname)) {
    e.respondWith(cacheDulu(req, CACHE_CDN));
    return;
  }
  // selain itu (mis. script.google.com / API data): tidak disentuh, selalu ke jaringan
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
