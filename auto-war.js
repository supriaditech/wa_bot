const clipboard = require('./clipboard-native');

process.on('uncaughtException', (err) => console.error('💥 Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('💥 Unhandled Rejection:', err));

const SESSIONS = ["SIANG"];
const DATA_PASIEN = "Khairun Nisa S. (59) - Pulpektomi ";

let lastClipboard = "";
let isProcessing = false;

function fillFirstEmptySlot(text, sesi) {
  let inSession = false;
  let filled = false;
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    const core = trimmed.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (/^(?:SESI)?(?:PAGI|SIANG)/.test(core)) {
      inSession = core.startsWith(sesi) || core.startsWith('SESI' + sesi);
      filled = false;
      return line;
    }
    if (inSession && !filled && /^\d+\.$/.test(trimmed)) {
      filled = true;
      return `${line} ${DATA_PASIEN}`;
    }
    return line;
  }).join('\n');
}

console.log("👀 Auto-War Script stand-by memantau clipboard...");

clipboard.read().then((testText) => {
  console.log(`📋 Tes baca clipboard OK (${testText.length} karakter)`);
}).catch((e) => {
  console.error("❌ Tes baca clipboard GAGAL:", e && e.message ? e.message : e);
});

setInterval(async () => {
  if (isProcessing) return;
  isProcessing = true;
  try {
    let currentClipboard = await clipboard.read();

    // 1. Bersihkan karakter gaib bawaan WA Web (HANYA yang invisible;
    //    U+200D ZWJ DIKECUALIKAN karena bagian dari emoji sequence seperti ❤️‍🔥)
    currentClipboard = currentClipboard.replace(/[\u200B-\u200C\uFEFF\u200E\u200F\u2060]/g, '');

    const upperText = currentClipboard.toUpperCase();
    const isFullFormat = upperText.includes("FULL");
    const isJadwalFormat = upperText.includes("JADWAL");
    const hasPagiSiang = upperText.includes("PAGI") && upperText.includes("SIANG");

    if (currentClipboard !== lastClipboard && (isFullFormat || isJadwalFormat || hasPagiSiang)) {
      let newText = currentClipboard;

      // 2. Proses tiap sesi: isi slot kosong pertama (1. s/d 3.)
      for (const sesi of SESSIONS) {
        newText = fillFirstEmptySlot(newText, sesi);
      }

      if (newText !== currentClipboard) {
        // 3. Tulis hasil modifikasi kembali ke clipboard
        await clipboard.write(newText);
        console.log("✅ BERHASIL! Teks termodifikasi, langsung tekan Ctrl+V di WA.");
        lastClipboard = newText;
      } else {
        lastClipboard = currentClipboard;
      }
    }
  } catch (err) {
    // Abaikan error jika yang di-copy berupa gambar/file
    console.error("⚠️ Error:", err && err.message ? err.message : err);
  } finally {
    isProcessing = false;
  }
}, 50);