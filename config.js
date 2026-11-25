// ============================================================================
// KONFIGURASI SERVER — FILE INI TERPISAH DARI app.js SUPAYA TIDAK TERTIMPA
// saat app.js diganti/diperbarui.
//
// Isi sekali saja dengan URL Web App Google Apps Script Anda, lalu JANGAN ikut
// diganti saat memperbarui file lain. Contoh:
//   window.CBT_API_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
//
// Kosong = Mode Lokal (data hanya di perangkat masing-masing -> siswa di HP lain
// TIDAK akan bisa login memakai akun yang dibuat guru).
// ============================================================================
window.CBT_API_URL = 'https://script.google.com/macros/s/AKfycbwYGCTFwSJ6w9qvdV_6G1sRS6UERGdfNJx71UsoUS2MEr3ZxqzTAi_T7nBwu6MlX6V_/exec';

// ----------------------------------------------------------------------------
// OPSI KEAMANAN UJIAN (opsional; hapus tanda // untuk mengubah)
//   Watermark identitas (nama + kelas + jam + kode sesi, diulang tipis di seluruh layar ujian):
//     window.CBT_WATERMARK_IDENTITAS = false;   // matikan
//     window.CBT_WM_OPACITY = 0.06;              // kepekatan 0.03 - 0.4 (bawaan 0.06 = samar)
//   MASA TOLERANSI GANGGUAN: notifikasi / pesan WA / telepon / alarm yang mengganggu sesaat (selesai sendiri dalam beberapa detik)
//   TIDAK dihitung pelanggaran dan tidak berbunyi (hanya dicatat "gangguan singkat"). Lebih lama dari itu = pelanggaran + alarm.
//     window.CBT_TOLERANSI_GANGGUAN_DETIK = 8;   // 0 - 60 detik (0 = langsung dihitung)
//   Kehilangan fokus layar yang lebih lama dari masa toleransi (aplikasi melayang, panel notifikasi, jendela lain) dihitung PELANGGARAN.
//   Bila di perangkat tertentu terlalu sensitif, jadikan hanya alarm (tanpa hitungan):
//     window.CBT_FOKUS_PELANGGARAN = false;
//   Anti-nyontek yang sama (layar penuh, alarm, screenshot, watermark, blokir salin) juga aktif di halaman SURVEI Karakter & Sulingjar.
//   Kejadiannya dicatat ke Detail Pelanggaran guru dengan awalan "[Survei]" (tidak menambah hitungan pelanggaran ujian). Matikan:
//     window.CBT_ANTICHEAT_SURVEI = false;
// ----------------------------------------------------------------------------
