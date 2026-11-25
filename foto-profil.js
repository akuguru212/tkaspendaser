/* ============================================================================
   FOTO PROFIL SISWA
   - Siswa mengunggah / mengganti / menghapus foto profil dari menu pengguna (pojok kanan atas)
     atau dengan mengetuk avatar di Portal Siswa.
   - Editor pemangkas bulat: geser, zoom (slider, roda mouse, cubit 2 jari), putar 90°, pintasan keyboard.
   - Foto apa pun (JPG/PNG/WEBP/HEIC, resolusi tinggi) dipangkas persegi 512 px + pratinjau 128 px, dikompres di
     perangkat. Mode Server: foto penuh disimpan PRIVAT di Google Drive (folder CBT_Foto_Profil); pratinjau tampil
     sebagai avatar. Mode Lokal: hanya pratinjau, disimpan di perangkat ini.
   - Guru melihat foto di tabel Data Siswa, dapat membukanya di Drive atau menghapusnya.
   v43z20: siswa juga bisa MEMILIH KARAKTER lucu (ratusan emoji + generator wajah kawaii) dengan gerakan & latar.
   Dimuat SETELAH portal-siswa.js. Memakai BuktiFoto (app.js) untuk membaca foto (termasuk HEIC) dengan hemat memori.
   ============================================================================ */
'use strict';
const FotoProfil = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => escapeHtml_(t);
  const UKURAN_PENUH = 512, UKURAN_THUMB = 128, MAKS_BYTE_PENUH = 180 * 1024, MAKS_THUMB_CHAR = 26000, MAKS_BERKAS = 25 * 1024 * 1024;
  const ZOOM_MAKS = 4;
  const S = { buka: false, sumber: null, rot: 0, zoom: 1, ox: 0, oy: 0, sisi: 280, sibuk: false, ada: false, pemicu: null, ptr: new Map(), jarak0: 0, zoom0: 1 };

  // ---------------- katalog karakter (v43z20) ----------------
  // Pilihan siswa disimpan sebagai teks: 'kar:E:🐱:5:2' (emoji) atau 'kar:F:0.0.1.1.5.1.1:5:2' (wajah buatan sendiri),
  // diikuti nomor latar dan nomor gerakan. Disimpan di kolom thumb sheet FotoProfil (tanpa ubah struktur sheet).
  const KAT = [
    ['🐱', 'Hewan', '🐱 🐶 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦉 🦇 🐺 🐗 🐴 🦓 🦒 🐘 🦏 🦛 🐪 🐫 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🐇 🦝 🦔 🐁 🐀 🐿️ 🦦 🦥 🦨 🦡 🦍 🐆 🐅 🐾'],
    ['🐠', 'Laut & Serangga', '🐙 🦑 🦐 🦀 🦞 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐚 🐢 🐊 🐍 🦎 🦖 🦕 🐝 🐛 🦋 🐌 🐞 🐜 🦗 🦂 🌊 💧'],
    ['🦄', 'Fantasi', '🦄 🐉 🐲 🧚 🧜 🧞 🧙 🧝 🦸 🦹 👼 🎅 🤶 🧸 👻 👽 👾 🤖 🎃 🤡 🔮 👑 🏰 👸 🤴'],
    ['😀', 'Wajah', '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤗 🤭 🤔 🤩 🥳 😎 🤓 🧐 🤠 😺 😸 😹 😻 😼 😽 🙀 😿 🥺 😴 🤤 😏'],
    ['🍓', 'Makanan', '🍓 🍒 🍑 🍍 🥝 🍉 🍊 🍋 🍌 🍎 🍏 🍐 🍇 🥥 🍅 🥑 🥕 🌽 🍄 🥐 🍞 🥨 🧀 🥞 🧇 🍔 🍟 🍕 🌭 🌮 🍣 🍙 🍡 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🍵 🍿 🥟 🍤 🍥 🍘 🥠 🍢 🍱 🍜 🍝'],
    ['🌸', 'Alam', '🌸 🌺 🌻 🌼 🌷 🌹 🥀 💐 🌱 🌿 🍀 🍃 🍁 🍂 🌾 🌵 🌴 🌳 🌲 🌈 ☀️ ⛅ ☁️ ⭐ 🌟 ✨ 💫 🌙 🌛 🌞 🌝 🔥 ❄️ ⛄ ☃️ ⚡ 🌍'],
    ['🚀', 'Hobi & Kendaraan', '🚀 🛸 🪐 🌌 🛰️ 🎈 🎀 🎁 🎵 🎶 🎨 🎮 🧩 ⚽ 🏀 🏐 🎾 🎳 🎸 🎹 🎻 🥁 🎤 🎧 📚 ✏️ 🔭 🔬 💡 🎒 🏆 🥇 🎯 🎪 🎠 🎡 🎢 🚗 🚕 🚌 🚓 🚑 🚒 🚜 🏍️ 🚲 🛵 ✈️ 🚁 ⛵ 🚂 🚢 🛶']
  ].map(k => [k[0], k[1], [...new Set(k[2].split(' '))]]);
  const BG = [0, 18, 36, 50, 65, 95, 125, 150, 170, 190, 205, 222, 245, 265, 285, 305, 325, 345].map(h => 'linear-gradient(135deg, hsl(' + h + ' 90% 91%), hsl(' + h + ' 80% 79%))')
    .concat(['linear-gradient(135deg,#ffd1a9,#ff9ecb)', 'linear-gradient(135deg,#ffd6e0,#fff3b8,#c6f1e7,#d6ccff)', 'linear-gradient(135deg,#2b2a63,#6a4fb3)', 'linear-gradient(135deg,#1f2a44,#3d5a80)', '#ffffff', 'linear-gradient(135deg,#fff3b8,#b8f0d0)']);
  const ANIM = [ // [nama, keyframes, detik]
    ['Diam', '', 0],
    ['Loncat', '0%,100%{transform:translateY(0) scaleY(1)}30%{transform:translateY(-16%) scaleY(1.06)}55%{transform:translateY(0) scaleY(.92)}', 1.2],
    ['Goyang', '0%,100%{transform:rotate(0)}20%{transform:rotate(-12deg)}40%{transform:rotate(10deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}', 1.8],
    ['Melayang', '0%,100%{transform:translateY(4%)}50%{transform:translateY(-8%)}', 3],
    ['Detak', '0%,100%{transform:scale(1)}15%{transform:scale(1.12)}30%{transform:scale(.97)}45%{transform:scale(1.08)}', 1.3],
    ['Ayun', '0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}', 2.2],
    ['Jeli', '0%,100%{transform:scale(1,1)}25%{transform:scale(1.12,.88)}50%{transform:scale(.9,1.1)}75%{transform:scale(1.05,.96)}', 1.6],
    ['Putar', '0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}', 4],
    ['Kedip', '0%,88%,100%{transform:scaleY(1)}93%{transform:scaleY(.1)}', 3],
    ['Tada', '0%,100%{transform:scale(1) rotate(0)}10%,20%{transform:scale(.9) rotate(-5deg)}30%,50%,70%{transform:scale(1.12) rotate(5deg)}40%,60%{transform:scale(1.12) rotate(-5deg)}80%{transform:scale(1) rotate(0)}', 2.4]
  ];
  const WARNA = ['#ffd9e2', '#ffe8b8', '#fff3a8', '#d9f5c5', '#c6f1e7', '#cfe8ff', '#e1d6ff', '#fbd5f1', '#ffffff', '#f3d9c0', '#c9c9d6', '#ffb8a8', '#ffc9a0', '#b8e8ff', '#d4f0a0', '#ffc2d6'];
  const GEN_N = [16, 3, 10, 8, 8, 4, 12], GEN_NAMA = ['Warna', 'Bentuk', 'Telinga', 'Mata', 'Mulut', 'Pipi', 'Aksesori'];
  const K = { kind: 'E', emo: '🐱', gen: [0, 0, 1, 1, 5, 1, 1], bg: 0, an: 0, kat: 0 };

  function wajahSvg(v) {
    const g = String(v).split('.').map((n, i) => (parseInt(n, 10) || 0) % (GEN_N[i] || 1));
    while (g.length < 7) g.push(0);
    const [w, s, t, m, mu, pi, ak] = g, c = WARNA[w], L = '#6b4f5c', E = '#3b2f3a', P = '#ffb3c6';
    const st = (w) => `stroke="${L}" stroke-width="${w || 2.2}" stroke-linejoin="round" stroke-linecap="round"`;
    const ln = (w) => `fill="none" stroke="${E}" stroke-width="${w || 3}" stroke-linecap="round"`;
    const dua = (f) => [37, 63].map(f).join('');
    const telinga = ['',
      `<path d="M22 40 L25 10 L46 28Z M78 40 L75 10 L54 28Z" fill="${c}" ${st()}/><path d="M28 32 L28 20 L38 28Z M72 32 L72 20 L62 28Z" fill="${P}"/>`,
      `<circle cx="25" cy="29" r="11" fill="${c}" ${st()}/><circle cx="75" cy="29" r="11" fill="${c}" ${st()}/><circle cx="25" cy="29" r="5" fill="${P}"/><circle cx="75" cy="29" r="5" fill="${P}"/>`,
      `<ellipse cx="36" cy="20" rx="8" ry="18" fill="${c}" ${st()}/><ellipse cx="64" cy="20" rx="8" ry="18" fill="${c}" ${st()}/><ellipse cx="36" cy="22" rx="3.5" ry="11" fill="${P}"/><ellipse cx="64" cy="22" rx="3.5" ry="11" fill="${P}"/>`,
      `<ellipse cx="20" cy="46" rx="9" ry="18" transform="rotate(18 20 46)" fill="${c}" ${st()}/><ellipse cx="80" cy="46" rx="9" ry="18" transform="rotate(-18 80 46)" fill="${c}" ${st()}/>`,
      `<circle cx="19" cy="34" r="14" fill="${c}" ${st()}/><circle cx="81" cy="34" r="14" fill="${c}" ${st()}/><circle cx="19" cy="34" r="8" fill="${P}"/><circle cx="81" cy="34" r="8" fill="${P}"/>`,
      `<path d="M30 30 Q26 14 32 8 Q40 16 42 27Z M70 30 Q74 14 68 8 Q60 16 58 27Z" fill="#ffe27a" ${st()}/>`,
      `<path d="M40 27 Q36 16 32 10 M60 27 Q64 16 68 10" fill="none" stroke="${L}" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="9" r="4.5" fill="#ff8fb1" ${st()}/><circle cx="68" cy="9" r="4.5" fill="#ff8fb1" ${st()}/>`,
      `<path d="M50 27 L50 16" stroke="${L}" stroke-width="2.4" fill="none"/><path d="M50 18 Q36 4 28 14 Q38 22 50 18Z M50 18 Q64 4 72 14 Q62 22 50 18Z" fill="#9be08a" ${st()}/>`,
      `<path d="M20 44 L22 8 L46 29Z M80 44 L78 8 L54 29Z" fill="${c}" ${st()}/><path d="M24 22 L23 12 L34 21Z M76 22 L77 12 L66 21Z" fill="${L}"/>`][t];
    const kepala = [`<circle cx="50" cy="57" r="33"`, `<ellipse cx="50" cy="58" rx="38" ry="31"`, `<rect x="17" y="26" width="66" height="62" rx="27"`][s] + ` fill="${c}" ${st()}/>`;
    const mata = [
      `<circle cx="37" cy="56" r="4.2" fill="${E}"/><circle cx="63" cy="56" r="4.2" fill="${E}"/>`,
      dua(x => `<circle cx="${x}" cy="56" r="6.5" fill="${E}"/><circle cx="${x - 2}" cy="53.5" r="2.4" fill="#fff"/><circle cx="${x + 2}" cy="58.5" r="1.1" fill="#fff"/>`),
      `<path d="M31 58 Q37 50 43 58 M57 58 Q63 50 69 58" ${ln()}/>`,
      `<path d="M31 55 Q37 61 43 55 M57 55 Q63 61 69 55" ${ln()}/>`,
      dua(x => `<path d="M${x} 47 L${x + 2} 54 L${x + 8} 56 L${x + 2} 58 L${x} 65 L${x - 2} 58 L${x - 8} 56 L${x - 2} 54Z" fill="${E}"/>`),
      dua(x => `<path d="M${x} 63 C${x - 11} 56 ${x - 8} 48 ${x - 3} 49 C${x - 1} 49 ${x} 51 ${x} 52 C${x} 51 ${x + 1} 49 ${x + 3} 49 C${x + 8} 48 ${x + 11} 56 ${x} 63Z" fill="#ff5c8a"/>`),
      `<circle cx="37" cy="56" r="4.4" fill="${E}"/><path d="M57 58 Q63 50 69 58" ${ln()}/>`,
      dua(x => `<ellipse cx="${x}" cy="57" rx="5" ry="7" fill="${E}"/><circle cx="${x - 1.5}" cy="53.5" r="2.3" fill="#fff"/><circle cx="${x + 1.8}" cy="60" r="1.2" fill="#fff"/>`)][m];
    const mulut = [
      `<path d="M44 66 Q50 72 56 66" ${ln(2.6)}/>`,
      `<path d="M42 64 Q50 78 58 64Z" fill="#7a2f45" ${st(1.6)}/><ellipse cx="50" cy="71" rx="4.5" ry="2.6" fill="#ff8fa6"/>`,
      `<path d="M44 66 Q50 71 56 66" ${ln(2.6)}/><path d="M47 68.5 Q50 78 53 68.5Z" fill="#ff8fa6" stroke="${E}" stroke-width="1.6" stroke-linejoin="round"/>`,
      `<ellipse cx="50" cy="69" rx="3.2" ry="4.2" fill="#7a2f45"/>`,
      `<circle cx="50" cy="68" r="1.9" fill="${E}"/>`,
      `<path d="M43 66 Q46.5 71 50 66 Q53.5 71 57 66" ${ln(2.4)}/>`,
      `<path d="M38 62 Q50 82 62 62Z" fill="#7a2f45" ${st(1.6)}/><ellipse cx="50" cy="73" rx="6" ry="3" fill="#ff8fa6"/>`,
      `<path d="M46 65 Q50 75 54 65Z" fill="#7a2f45"/>`][mu];
    const pipi = ['',
      `<ellipse cx="29" cy="65" rx="6.5" ry="4" fill="#ff8fa6" opacity=".6"/><ellipse cx="71" cy="65" rx="6.5" ry="4" fill="#ff8fa6" opacity=".6"/>`,
      `<path d="M24 63 L30 64 M24 67 L30 67 M76 63 L70 64 M76 67 L70 67" stroke="#ff8fa6" stroke-width="2" stroke-linecap="round"/>`,
      `<g fill="#b9856a"><circle cx="28" cy="64" r="1.2"/><circle cx="32" cy="66" r="1.2"/><circle cx="26" cy="68" r="1.2"/><circle cx="72" cy="64" r="1.2"/><circle cx="68" cy="66" r="1.2"/><circle cx="74" cy="68" r="1.2"/></g>`][pi];
    const aks = ['',
      `<path d="M68 25 L83 16 L83 34Z M68 25 L53 16 L53 34Z" fill="#ff7aa8" ${st(1.8)}/><circle cx="68" cy="25" r="4.5" fill="#ff4f8b" ${st(1.8)}/>`,
      [0, 72, 144, 216, 288].map(a => `<circle cx="${(71 + 7 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(25 + 7 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="5.2" fill="#ff9ecb" stroke="${L}" stroke-width="1.4"/>`).join('') + `<circle cx="71" cy="25" r="4" fill="#ffd84a" stroke="${L}" stroke-width="1.4"/>`,
      `<path d="M34 30 L37 13 L44 23 L50 8 L56 23 L63 13 L66 30Z" fill="#ffd23f" ${st()}/>`,
      `<g fill="rgba(255,255,255,.35)" stroke="${E}" stroke-width="2.4"><circle cx="37" cy="56" r="10"/><circle cx="63" cy="56" r="10"/></g><path d="M47 55 Q50 52 53 55" fill="none" stroke="${E}" stroke-width="2.4"/>`,
      `<path d="M50 2 L36 31 L64 31Z" fill="#7ac7ff" ${st()}/><path d="M43 17 L57 17 M40 24 L60 24" stroke="#fff" stroke-width="2.4"/><circle cx="50" cy="3" r="4" fill="#ff8fb1" ${st(1.6)}/>`,
      `<path d="M17 56 Q15 20 50 19 Q85 20 83 56" fill="none" stroke="#6c63ff" stroke-width="5" stroke-linecap="round"/><rect x="11" y="48" width="11" height="20" rx="5" fill="#6c63ff"/><rect x="78" y="48" width="11" height="20" rx="5" fill="#6c63ff"/>`,
      `<path d="M50 44 C42 38 44 31 48 32 C49.5 32 50 33.5 50 34 C50 33.5 50.5 32 52 32 C56 31 58 38 50 44Z" fill="#ff5c8a"/>`,
      `<ellipse cx="50" cy="15" rx="17" ry="4.5" fill="none" stroke="#ffd23f" stroke-width="3.2"/>`,
      `<polygon points="72,18 74.2,24 80.5,24.3 75.5,28.2 77.3,34.4 72,30.8 66.7,34.4 68.5,28.2 63.5,24.3 69.8,24" fill="#ffd23f" ${st(1.6)}/>`,
      `<path d="M18 46 Q50 4 82 46Z" fill="#ff7a59" ${st()}/><path d="M72 40 Q92 40 94 48 Q80 46 70 46Z" fill="#e8603f" ${st(1.8)}/>`,
      `<g transform="rotate(-28 70 38)"><rect x="61" y="34" width="18" height="8" rx="4" fill="#ffd9a8" ${st(1.6)}/><circle cx="68" cy="38" r=".8" fill="${L}"/><circle cx="72" cy="38" r=".8" fill="${L}"/></g>`][ak];
    return `<svg class="fp-svg" viewBox="0 0 100 100" aria-hidden="true">${telinga}${kepala}${pipi}${mata}${mulut}${aks}</svg>`;
  }
  function parseKar(spec) {
    const p = String(spec || '').split(':');
    if (p.length !== 5 || p[0] !== 'kar' || (p[1] !== 'E' && p[1] !== 'F') || !p[2]) return null;
    const bg = parseInt(p[3], 10), an = parseInt(p[4], 10);
    return { t: p[1], v: p[2], bg: bg >= 0 && bg < BG.length ? bg : 0, an: an >= 0 && an < ANIM.length ? an : 0 };
  }
  const bgKar = (i) => BG[i % BG.length];
  const isiKar = (k) => k.t === 'F' ? wajahSvg(k.v) : `<span class="fp-emo" aria-hidden="true">${esc(k.v)}</span>`;
  const karHtml = (k, kelas) => `<span class="fp-av fp-kar ${kelas || ''}" data-an="${k.an}" style="background:${bgKar(k.bg)}">${isiKar(k)}</span>`;

  function cssKar() {
    const kf = ANIM.map((a, i) => i ? `@keyframes fp-a${i}{${a[1]}}[data-an="${i}"]>.fp-emo,[data-an="${i}"]>.fp-svg{animation:fp-a${i} ${a[2]}s ease-in-out infinite;animation-play-state:paused}` : '').join('\n');
    return kf + `
[data-an]:is(.fp-live,:hover)>.fp-emo,[data-an]:is(.fp-live,:hover)>.fp-svg{animation-play-state:running!important}
.fp-svg{display:block;width:100%;height:100%;transform-origin:50% 62%}
.fp-emo{transform-origin:50% 62%}
#sw-screen .sw-av.fp-kar-av{padding:0;overflow:hidden}
@media (prefers-reduced-motion: reduce){[data-an]>.fp-emo,[data-an]>.fp-svg{animation:none!important}}
.fp-tabs{display:flex;gap:6px;padding:8px 20px 0}
.fp-tab{all:unset;box-sizing:border-box;cursor:pointer;flex:1;text-align:center;padding:9px 10px;border-radius:10px;font:600 13px 'Poppins',sans-serif;color:#475569;background:#eef2f7;display:inline-flex;gap:7px;align-items:center;justify-content:center}
.fp-tab.on{background:#0d6efd;color:#fff;box-shadow:0 6px 16px -8px rgba(13,110,253,.8)}
.fp-tab:focus-visible,.fp-chip:focus-visible,.fp-cel:focus-visible,.fp-sw1:focus-visible,.fp-step button:focus-visible{outline:3px solid #0d6efd;outline-offset:2px}
.fp-dialog [hidden]{display:none!important}
.fp-kpre-row{display:flex;align-items:center;gap:14px;margin:6px 0 10px}
#fp-kpre .fp-av{width:104px;height:104px;font-size:36px;box-shadow:0 0 0 4px #fff,0 8px 22px rgba(30,60,110,.25)}
.fp-kinfo{display:grid;gap:6px;min-width:0;justify-items:start}
.fp-kinfo b{font-size:14px;color:#12304f;font-weight:600}
.fp-kinfo span{font-size:12px;color:#64748b;line-height:1.45}
.fp-kats{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin}
.fp-chip{all:unset;box-sizing:border-box;cursor:pointer;flex:none;padding:6px 11px;border-radius:999px;font:500 12.5px 'Poppins',sans-serif;background:#f1f5fa;color:#334155;border:1px solid #dbe3ee;white-space:nowrap}
.fp-chip.on{background:#e4efff;border-color:#0d6efd;color:#0b4fb3;font-weight:600}
.fp-kgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px;max-height:196px;overflow:auto;padding:6px;border:1px solid #e2e8f0;border-radius:12px;background:#fafcff}
.fp-cel{all:unset;box-sizing:border-box;cursor:pointer;height:44px;display:grid;place-items:center;font-size:25px;border-radius:10px;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif}
.fp-cel:hover{background:#e8f0fe}.fp-cel.on{background:#dce9ff;box-shadow:inset 0 0 0 2px #0d6efd}
.fp-klabel{margin:12px 0 6px;font-size:12px;font-weight:600;color:#475569}
.fp-sw{display:flex;flex-wrap:wrap;gap:7px}
.fp-sw1{all:unset;box-sizing:border-box;cursor:pointer;width:28px;height:28px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.fp-sw1.on{box-shadow:0 0 0 2px #fff,0 0 0 4px #0d6efd}
.fp-gen{max-height:230px;overflow:auto;padding:6px 8px;border:1px solid #e2e8f0;border-radius:12px;background:#fafcff}
.fp-step{display:flex;align-items:center;gap:8px;padding:3px 0}
.fp-step span{flex:1;font-size:13px;color:#334155}
.fp-step b{min-width:46px;text-align:center;font-size:12.5px;color:#12304f;font-weight:600}
.fp-step button{all:unset;box-sizing:border-box;cursor:pointer;width:34px;height:34px;border-radius:10px;background:#eef4ff;color:#326698;display:grid;place-items:center;font-size:20px;line-height:1}
.fp-step button:hover{background:#dce9ff}
`;
  }

  // ---------------- gaya ----------------
  const CSS = `
.fp-av { display: inline-grid; place-items: center; overflow: hidden; border-radius: 50%; background: linear-gradient(135deg, #326698, #0d6efd); color: #fff; font-weight: 700; letter-spacing: .03em; flex: none; }
.fp-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fp-emo { font-size: 1.55em; line-height: 1; font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; letter-spacing: 0; user-select: none; -webkit-user-select: none; }
.fp-av.fp-kar { color: inherit; }
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
` + cssKar();
  (function pasangCss() {
    if ($('foto-profil-css')) return;
    const st = document.createElement('style'); st.id = 'foto-profil-css'; st.textContent = CSS; document.head.appendChild(st);
  })();

  // ---------------- avatar ----------------
  const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
  const adalahKar = (f) => typeof f === 'string' && f.slice(0, 4) === 'kar:';
  const fotoUser = () => (state.user && state.user.role === 'siswa' && state.user.foto && !adalahKar(state.user.foto)) ? state.user.foto : '';
  const karUser = () => (state.user && state.user.role === 'siswa' && adalahKar(state.user.foto)) ? state.user.foto : '';
  // Avatar bawaan (belum ada foto): karakter lucu (hewan, bunga, dll.) + warna pastel. Dipilih otomatis dari ID siswa,
  // jadi tiap siswa punya karakter sendiri yang SAMA di semua perangkat (tanpa perlu disimpan di server).
  const KARAKTER = ['🐱', '🐶', '🐼', '🐨', '🦊', '🐰', '🐯', '🦁', '🐸', '🐵', '🐧', '🐥', '🦄', '🐙', '🐳', '🐬', '🦋', '🐝', '🐞', '🐢', '🐹', '🐻', '🐷', '🐮', '🦉', '🦒', '🐘', '🦕', '🌸', '🌻', '🌼', '🌷', '🌺', '🍀', '🍓', '🍉', '⭐', '🌈', '🚀', '🤖'];
  function hashStr(t) { let h = 2166136261; t = String(t); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function karakter(seed) {
    const h = hashStr(seed || '?');
    return { emo: KARAKTER[h % KARAKTER.length], bg: 'linear-gradient(135deg, hsl(' + ((h >>> 8) % 360) + ' 90% 91%), hsl(' + ((h >>> 8) % 360) + ' 80% 79%))' };
  }
  const bukaSeed = (u) => String((u && (u.id || u.username || u.nama)) || '?');
  function avatarHtml(nama, foto, kelas, seed, spec) {
    if (foto) return `<span class="fp-av ${kelas || ''}"><img src="${esc(foto)}" alt="" decoding="async"></span>`;
    const kk = parseKar(spec);
    if (kk) return karHtml(kk, kelas);
    const k = karakter(seed || nama);
    return `<span class="fp-av fp-kar ${kelas || ''}" style="background:${k.bg}"><span class="fp-emo" aria-hidden="true">${k.emo}</span></span>`;
  }

  function terapkanAvatar() {
    const u = state.user; if (!u || u.role !== 'siswa') return;
    const foto = fotoUser(), spec = foto ? '' : karUser(), kar = parseKar(spec), kV = foto || (kar ? spec : '');
    // ikon kecil di header (portal siswa, konfirmasi, dll.)
    document.querySelectorAll('.anbk-user-ico').forEach(el => {
      if (kV) {
        if (el.dataset.fpSrc !== kV) {
          if (foto) { el.innerHTML = `<img src="${esc(foto)}" alt="Foto profil" decoding="async">`; el.style.background = ''; delete el.dataset.an; }
          else { el.innerHTML = isiKar(kar); el.style.background = bgKar(kar.bg); el.dataset.an = String(kar.an); }
          el.dataset.fpSrc = kV;
        }
        el.classList.add('fp-has');
      } else if (el.classList.contains('fp-has')) {
        el.classList.remove('fp-has'); delete el.dataset.fpSrc; delete el.dataset.an; el.style.background = ''; el.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
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
      if (foto) {
        if (av.dataset.fpSrc !== foto) { av.innerHTML = `<img src="${esc(foto)}" alt="Foto profil" decoding="async">`; av.dataset.fpSrc = foto; }
        av.classList.add('fp-has'); av.classList.remove('fp-kar-av', 'fp-live'); av.style.background = ''; delete av.dataset.fpKar; delete av.dataset.an;
      } else {
        if (av.classList.contains('fp-has')) { av.classList.remove('fp-has'); delete av.dataset.fpSrc; }
        const sd = kar ? spec : bukaSeed(u);
        if (av.dataset.fpKar !== sd) {
          av.style.fontSize = '22px'; av.classList.add('fp-live');
          if (kar) { av.style.background = bgKar(kar.bg); av.innerHTML = isiKar(kar); av.dataset.an = String(kar.an); av.classList.add('fp-kar-av'); }
          else { const k = karakter(sd); av.style.background = k.bg; av.innerHTML = `<span class="fp-emo" aria-hidden="true">${k.emo}</span>`; delete av.dataset.an; av.classList.remove('fp-kar-av'); }
          av.dataset.fpKar = sd;
        }
      }
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
      const kunciH = foto || (kar ? spec : ('k:' + bukaSeed(u)));
      if (h.dataset.fpSrc !== kunciH) { h.innerHTML = avatarHtml(u.nama, foto, 'fp-live', bukaSeed(u), spec) + '<span class="fp-cam" aria-hidden="true"><i class="fa-solid fa-camera"></i></span>'; h.dataset.fpSrc = kunciH; }
    }
  }

  function pasangMenu() {
    document.querySelectorAll('.anbk-usermenu').forEach(m => {
      if (m.querySelector('[data-aksi="foto"]')) return;
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-aksi', 'foto');
      b.innerHTML = '<i class="fa-solid fa-camera"></i> Foto &amp; Karakter';
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
    const ya = await Dialog.konfirmasi({ judul: S.ada ? 'Hapus foto profil?' : 'Kembalikan karakter bawaan?', tipe: 'danger', ikon: 'fa-trash', pesan: S.ada ? 'Foto profil Anda akan dihapus. Anda bisa mengunggah foto baru kapan saja.' : 'Karakter pilihan Anda akan dihapus dan diganti karakter bawaan. Anda bisa memilih lagi kapan saja.', teksYa: S.ada ? 'Ya, Hapus' : 'Ya, Kembalikan' });
    if (!ya) return;
    kunci(true); status('Menghapus foto…', 'info', true);
    const res = await api('hapusFotoProfil', { siswaId: state.user.id, deviceId: state.deviceId });
    if (res && res.ok) { perbaruiFotoUser(''); toast(S.ada ? 'Foto profil dihapus.' : 'Karakter dikembalikan ke bawaan.', 'success'); tutup(true); }
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
    const sp = $('fp-simpan'); if (sp) sp.innerHTML = v ? '<span class="fp-spin"></span> Memproses…' : '<i class="fa-solid fa-check"></i> ' + (S.tab === 'kar' ? 'Simpan karakter' : 'Simpan foto');
    if (!v) { tampilkanEditor(!!S.sumber); if (S.tab === 'kar' && sp) sp.disabled = false; }
  }

  // ---------------- dialog ----------------
  function buka(pemicu) {
    if (S.buka || !state.user || state.user.role !== 'siswa') return;
    S.buka = true; S.pemicu = pemicu || document.activeElement; S.sumber = null; S.rot = 0; S.zoom = 1; S.ox = 0; S.oy = 0; S.ptr.clear();
    S.sisi = ukuranSisi(); S.ada = !!fotoUser(); S.adaKar = !!karUser(); S.tab = (S.adaKar || !S.ada) ? 'kar' : 'foto';
    const seluler = BuktiFoto.perangkatSeluler();
    const o = document.createElement('div'); o.className = 'fp-overlay'; o.id = 'fp-overlay';
    o.innerHTML = `<div class="fp-dialog" id="fp-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-judul" aria-describedby="fp-sub">
      <div class="fp-head"><div><h3 id="fp-judul">Foto &amp; Karakter Profil</h3><p id="fp-sub">Unggah foto Anda, atau pilih karakter lucu favorit.</p></div>
        <button type="button" class="fp-x" id="fp-tutup" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="fp-tabs" role="tablist" aria-label="Jenis avatar"><button type="button" role="tab" class="fp-tab" id="fp-tab-foto" aria-selected="false"><i class="fa-solid fa-camera"></i> Foto</button><button type="button" role="tab" class="fp-tab" id="fp-tab-kar" aria-selected="false">🐱 Karakter Lucu</button></div>
      <div class="fp-body">
        <div id="fp-panel-foto"><div class="fp-stage-box"><div class="fp-stage" id="fp-stage" style="width:${S.sisi}px;height:${S.sisi}px">
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
        </div><div id="fp-panel-kar" hidden></div>
        <div class="fp-status info" id="fp-status" role="status" aria-live="polite"><span></span></div>
      </div>
      <div class="fp-foot">
        ${(S.ada || S.adaKar) ? '<button type="button" class="fp-btn bahaya" id="fp-hapus"><i class="fa-regular fa-trash-can"></i> ' + (S.ada ? 'Hapus foto' : 'Reset karakter') + '</button>' : ''}
        <span class="fp-sp"></span>
        <button type="button" class="fp-btn" id="fp-batal">Batal</button>
        <button type="button" class="fp-btn utama" id="fp-simpan" disabled><i class="fa-solid fa-check"></i> Simpan foto</button>
      </div></div>`;
    document.body.appendChild(o);
    document.body.style.overflow = 'hidden';
    pasangEvent(o);
    gambar(); tampilkanEditor(false); bangunKar(); gantiTab(S.tab);
    setTimeout(() => { const f = $(S.tab === 'kar' ? 'fp-tab-kar' : 'fp-ganti'); if (f) f.focus(); }, 30);
  }

  function pasangEvent(o) {
    const klik = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
    klik('fp-tutup', () => tutup()); klik('fp-batal', () => tutup()); klik('fp-simpan', () => S.tab === 'kar' ? simpanKar() : simpan()); klik('fp-tab-foto', () => gantiTab('foto')); klik('fp-tab-kar', () => gantiTab('kar')); klik('fp-hapus', hapus);
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

  // ---------------- pemilih karakter (v43z20) ----------------
  const RE_KAR = /^kar:[EF]:[^\s:<>"'`\\&]{1,40}:\d{1,3}:\d{1,2}$/;
  const specKar = () => 'kar:' + K.kind + ':' + (K.kind === 'E' ? K.emo : K.gen.join('.')) + ':' + K.bg + ':' + K.an;

  function acak() {
    const r = (n) => Math.floor(Math.random() * n);
    K.bg = r(BG.length); K.an = 1 + r(ANIM.length - 1);
    if (Math.random() < 0.35) { const i = r(KAT.length), l = KAT[i][2]; K.kind = 'E'; K.emo = l[r(l.length)]; K.kat = i; }
    else { K.kind = 'F'; K.gen = GEN_N.map(r); K.kat = 'buat'; }
  }

  function isiGrid() {
    const grid = $('fp-kgrid'), gen = $('fp-kgen'); if (!grid) return;
    const buat = K.kat === 'buat'; grid.hidden = buat; gen.hidden = !buat;
    if (!buat) { grid.innerHTML = KAT[K.kat][2].map(e => `<button type="button" class="fp-cel" data-emo="${esc(e)}">${esc(e)}</button>`).join(''); grid.scrollTop = 0; }
    tandai();
  }

  function tandai() {
    const p = $('fp-panel-kar'); if (!p) return;
    const set = (sel, fn) => p.querySelectorAll(sel).forEach(b => { const on = !!fn(b); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    set('[data-emo]', b => K.kind === 'E' && b.dataset.emo === K.emo);
    set('[data-bg]', b => +b.dataset.bg === K.bg);
    set('[data-anim]', b => +b.dataset.anim === K.an);
    set('[data-w]', b => K.kind === 'F' && K.gen[0] === +b.dataset.w);
    set('[data-kat]', b => String(K.kat) === b.dataset.kat);
    p.querySelectorAll('[data-gv]').forEach(b => { const j = +b.dataset.gv; b.textContent = (K.gen[j] + 1) + '/' + GEN_N[j]; });
    const pre = $('fp-kpre'); if (pre) pre.innerHTML = karHtml(parseKar(specKar()), 'fp-live');
  }

  function bangunKar() {
    const p = $('fp-panel-kar'); if (!p) return;
    const cur = parseKar(karUser());
    if (cur) { K.kind = cur.t; if (cur.t === 'E') K.emo = cur.v; else K.gen = cur.v.split('.').map((n, i) => (parseInt(n, 10) || 0) % GEN_N[i]); K.bg = cur.bg; K.an = cur.an; }
    else { const sd = bukaSeed(state.user); K.kind = 'E'; K.emo = karakter(sd).emo; K.bg = hashStr(sd) % BG.length; K.an = 0; }
    K.kat = K.kind === 'F' ? 'buat' : Math.max(0, KAT.findIndex(k => k[2].indexOf(K.emo) >= 0));
    const total = KAT.reduce((a, k) => a + k[2].length, 0), komb = GEN_N.reduce((a, b) => a * b, 1) * BG.length * (ANIM.length - 1);
    const sw = (a, v, b, lbl) => `<button type="button" class="fp-sw1" data-${a}="${v}" style="background:${b}" aria-label="${lbl} ${v + 1}"></button>`;
    p.innerHTML = `<div class="fp-kpre-row"><div id="fp-kpre"></div><div class="fp-kinfo"><b>Pilih karakter lucu</b><span>${total} karakter siap pakai, plus Buat Sendiri (${komb.toLocaleString('id-ID')} kombinasi). Tekan Acak untuk kejutan!</span><button type="button" class="fp-btn" id="fp-acak">🎲 Acak</button></div></div>
      <div class="fp-kats" id="fp-kats">${KAT.map((k, i) => `<button type="button" class="fp-chip" data-kat="${i}">${k[0]} ${esc(k[1])}</button>`).join('')}<button type="button" class="fp-chip" data-kat="buat">✨ Buat Sendiri</button></div>
      <div class="fp-kgrid" id="fp-kgrid" role="group" aria-label="Daftar karakter"></div>
      <div class="fp-gen" id="fp-kgen" role="group" aria-label="Buat karakter sendiri" hidden>
        <div class="fp-klabel" style="margin-top:2px">Warna badan</div><div class="fp-sw">${WARNA.map((c, i) => sw('w', i, c, 'Warna badan')).join('')}</div>
        ${GEN_NAMA.map((n, j) => j ? `<div class="fp-step"><span>${n}</span><button type="button" data-g="${j}:-1" aria-label="${n} sebelumnya">‹</button><b data-gv="${j}"></b><button type="button" data-g="${j}:1" aria-label="${n} berikutnya">›</button></div>` : '').join('')}
      </div>
      <div class="fp-klabel">Warna latar</div><div class="fp-sw">${BG.map((b, i) => sw('bg', i, b, 'Latar')).join('')}</div>
      <div class="fp-klabel">Gerakan</div><div class="fp-kats">${ANIM.map((a, i) => `<button type="button" class="fp-chip" data-anim="${i}">${a[0]}</button>`).join('')}</div>`;
    p.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || S.sibuk) return; const d = b.dataset;
      if (d.kat !== undefined) { K.kat = d.kat === 'buat' ? 'buat' : +d.kat; if (K.kat === 'buat') K.kind = 'F'; isiGrid(); return; }
      if (d.emo !== undefined) { K.kind = 'E'; K.emo = d.emo; }
      else if (d.bg !== undefined) K.bg = +d.bg;
      else if (d.anim !== undefined) K.an = +d.anim;
      else if (d.w !== undefined) { K.kind = 'F'; K.gen[0] = +d.w; }
      else if (d.g !== undefined) { const [j, dl] = d.g.split(':').map(Number); K.kind = 'F'; K.gen[j] = (K.gen[j] + dl + GEN_N[j]) % GEN_N[j]; }
      else if (b.id === 'fp-acak') { acak(); isiGrid(); return; }
      else return;
      tandai();
    });
    isiGrid();
  }

  function gantiTab(t) {
    S.tab = t;
    const pf = $('fp-panel-foto'), pk = $('fp-panel-kar'); if (pf) pf.hidden = t !== 'foto'; if (pk) pk.hidden = t !== 'kar';
    ['foto', 'kar'].forEach(x => { const b = $('fp-tab-' + x); if (b) { b.setAttribute('aria-selected', String(x === t)); b.classList.toggle('on', x === t); } });
    const sp = $('fp-simpan');
    if (sp) { sp.innerHTML = '<i class="fa-solid fa-check"></i> ' + (t === 'kar' ? 'Simpan karakter' : 'Simpan foto'); sp.disabled = t === 'kar' ? false : !S.sumber; }
    status('', 'info');
  }

  async function simpanKar() {
    if (S.sibuk) return;
    const spec = specKar();
    if (!RE_KAR.test(spec)) return status('Karakter tidak valid. Pilih karakter lain.', 'galat');
    kunci(true); status('Menyimpan karakter…', 'info', true);
    try {
      const res = await api('simpanKarakterProfil', { siswaId: state.user.id, deviceId: state.deviceId, karakter: spec });
      if (!res || !res.ok) throw new Error(/Aksi tidak dikenal/.test((res && res.error) || '') ? 'Server belum diperbarui. Minta guru memasang Code.gs terbaru lalu deploy ulang.' : ((res && res.error) || 'Gagal menyimpan karakter.'));
      perbaruiFotoUser(res.thumb || spec);
      status('Karakter profil berhasil disimpan.', 'ok'); toast('Karakter profil diperbarui.', 'success');
      setTimeout(() => tutup(true), 650);
    } catch (e) { kunci(false); status((e && e.message) || 'Gagal menyimpan karakter.', 'galat'); }
  }

  // ---------------- sisi guru: Data Siswa ----------------
  function miniGuru(s) {
    const kar = adalahKar(s.foto), asli = kar ? '' : s.foto;
    const av = avatarHtml(s.nama, asli, 'fp-mini', s.id || s.username || s.nama, kar ? s.foto : '');
    return asli
      ? `<button type="button" class="fp-mini-btn" onclick="FotoProfil.lihatGuru('${esc(s.id)}')" title="Lihat foto ${esc(s.nama)}" aria-label="Lihat foto ${esc(s.nama)}">${av}</button>`
      : `<span title="${kar ? 'Karakter pilihan siswa' : 'Belum ada foto (memakai karakter bawaan)'}">${av}</span>`;
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
