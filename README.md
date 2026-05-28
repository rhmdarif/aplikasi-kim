# Aplikasi KIM — Kesenian Irama Minang

Aplikasi web sebagai alat bantu acara **Permainan KIM** (Kesenian Irama Minang),
kuis musik tradisional dari Sumatera Barat (asal Pariaman). Aplikasi ini berperan
sebagai pengganti tabung undian dan kartu fisik, sehingga MC/pendendang dapat
fokus pada dendangan dan pantun.

## Fitur Utama

- **Layar Operator**: panel kontrol, papan angka 1–N, mode undi (otomatis/manual/klik bola)
- **Layar Peserta**: window terpisah untuk proyektor/TV besar — angka raksasa + riwayat + counter
- **Sinkronisasi real-time** via `BroadcastChannel` antara operator ↔ peserta
- **Grid dinamis** (5×5, 6×7, 9×10, custom) — menentukan total angka permainan
- **5 sesi warna kupon** (Merah/Biru/Putih/Kuning/Hijau), masing-masing punya sesi terpisah
- **Generator Kupon** + cetak PDF dalam berbagai format
- **Pengaturan tema** (preset + warna custom), logo upload, nama acara, footer pesan
- **Media Library**: tayangkan gambar/video/YouTube ke layar peserta (multi-mode display)
- **Mobile-responsive**: drawer slide-in, quick action buttons, optimasi landscape

## Cara Menjalankan

### Opsi 1 — Buka langsung (offline penuh)
Klik dua kali `index.html`. Catatan: embed YouTube **tidak bekerja** via `file://`.

### Opsi 2 — Local server (direkomendasikan)
Klik dua kali `start.bat` (perlu Python terinstal) atau `start-node.bat` (perlu Node).
Browser otomatis terbuka di `http://127.0.0.1:8080/index.html`.

## Teknologi

- HTML + CSS + Vanilla JavaScript (no framework, no build step)
- `localStorage` untuk state & gambar
- `IndexedDB` untuk video lokal
- `BroadcastChannel` untuk sync antar-window

## Struktur File

```
index.html      Layout & semua halaman (game, peserta, generator, settings, media)
styles.css      Tema kayu/Minang + CSS variables untuk theming dinamis
app.js          Logika undi, render, sync, settings, media
start.bat       Helper jalankan local server (Python)
start-node.bat  Alternatif local server (Node)
concepts/       Referensi visual
```
