# TractorPart 1.1

Website katalog suku cadang dengan admin untuk produk, kategori, profil toko, foto galeri dan informasi kontak. Semua perubahan admin tersimpan permanen dan tampil pada website publik.

## Stack

- **Node.js 24 + Express 5 + EJS:** rendering server untuk halaman publik, SEO, admin dan API dalam satu aplikasi.
- **Supabase PostgreSQL + `pg`:** data produk, konten, akun, sesi dan rate limit permanen. Transaction pooler cocok untuk function Vercel; transaksi menggunakan satu koneksi dan query berparameter.
- **Supabase Storage privat + Sharp:** foto divalidasi, dioptimalkan menjadi WebP dan disimpan permanen. Aplikasi memeriksa publikasi/hak admin sebelum melayani foto.
- **Autentikasi aplikasi:** password scrypt, cookie HttpOnly/SameSite, sesi database, CSRF, pembatasan login dan pemeriksaan role pada backend.
- **CSS dan JavaScript ringan:** desain responsif, font lokal Outfit/DM Sans, bahasa ID/EN untuk teks statis dan transisi publik yang sudah disesuaikan. Halaman admin tidak menggunakan transisi.

Produksi memerlukan Supabase; tidak memakai disk Vercel untuk database atau upload. SQLite tetap tersedia untuk pengembangan offline dan pengujian.

## Publish ke Vercel

Ikuti [panduan konfigurasi lengkap](docs/DEPLOYMENT.md). Urutannya:

1. Buat proyek Supabase.
2. Jalankan `supabase/migrations/001_tractorpart.sql` di SQL Editor; bucket `tractorpart-media` otomatis dibuat privat.
3. Ambil URI **Transaction pooler 6543**, Project URL dan secret key.
4. Isi `.env` lokal, jalankan `npm run cloud:check`.
5. Opsional: impor data lokal ke target kosong dengan `npm run data:import -- --confirm` sebelum membuat akun di target.
6. Buat admin melalui `npm run admin:create`, menggunakan konfigurasi database Supabase.
7. Push repository ke GitHub, import di Vercel dengan preset Express dan Node 24.
8. Isi env produksi, deploy, lalu periksa login, upload, publikasi dan persistensi setelah redeploy.

`vercel.json` sudah mencakup template EJS dan pemetaan `/static/*` ke aset CDN. Build menghasilkan bundle CSS/JavaScript dengan hash di `public/bundles/` dan manifest `web-assets.json`. Jalankan `npm run build` setelah mengubah sumber UI. Folder `public/` berisi aset siap deploy. Gambar referensi dan aset sumber tidak disertakan pada deployment.

## Menjalankan lokal

```powershell
cd C:\TractorPart
npm ci
Copy-Item .env.example .env
npm start
```

Buka `http://localhost:3000`; admin di `/admin/login`. Jika `.env` sudah ada, edit tanpa menimpanya. `npm run dev` menjalankan mode restart otomatis.

Untuk offline, kosongkan `DATABASE_URL`: SQLite dan foto memakai `data/`. Untuk memakai Supabase lokal, isi `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` dan `SUPABASE_STORAGE_BUCKET`, lalu jalankan `npm run cloud:check`. `NODE_ENV=development` digunakan ketika akses melalui HTTP localhost.

Produksi wajib `NODE_ENV=production`, `BASE_URL` HTTPS dan konfigurasi Supabase lengkap. Tidak ada fallback SQLite di produksi.

## Akun dan data awal

Isi `ADMIN_EMAIL` serta `ADMIN_PASSWORD` minimal 12 karakter pada `.env` lokal, kemudian:

```powershell
npm run admin:create
```

Akun dibuat pada database yang sedang dikonfigurasi. Hapus nilai `ADMIN_PASSWORD` setelah selesai. Tidak ada password default atau pendaftaran publik. Supabase Authentication tidak digunakan untuk login admin.

Preview desain admin tanpa akun tersedia pada `/admin/preview` hanya di development; semua kontrol preview nonaktif. Produksi menonaktifkan preview.

Database Supabase baru berisi placeholder profil/kontak, tanpa produk dummy. Semua informasi kontak tampil di bagian Kontak pada Home. URL lama `/contact` mengarah ke `/#kontak`. Isi **Admin / Kontak / WhatsApp utama**, lalu **Simpan Perubahan**: seluruh tombol Hubungi Kami/Cek Ketersediaan langsung membuka WhatsApp dengan nomor tersebut. Jika nomor belum diisi, tombol menuju placeholder Kontak pada Home. Impor SQLite mengecualikan produk `[Dummy]` secara default dan tidak mengubah sumber lokal. Untuk contoh offline: `npm run seed:demo`.

## Fitur admin

- Produk: draft/published, foto, harga, kategori, deskripsi, tersedia/habis. Published wajib memiliki data lengkap; draft dan fotonya disembunyikan dari publik. Slug stabil setelah edit.
- Kategori: tambah/ubah/hapus; kategori yang masih dipakai produk tidak dapat dihapus.
- Tentang toko: ringkasan dan deskripsi tampil pada Home.
- Galeri: upload foto saja, ubah foto, urutkan, sembunyikan/terbitkan atau hapus.
- Kontak: satu WhatsApp utama untuk tombol Hubungi Kami/Cek Ketersediaan, beberapa nomor telepon dengan tombol plus dan hapus, email, alamat, jam, Maps dan tautan platform. Nomor telepon tambahan tampil di Home/footer. Data lama tetap terbaca; tidak perlu migrasi Supabase.
- Bahasa antarmuka admin/publik: ID/EN; konten yang diinput admin tetap sesuai input.

Foto asli maksimal 5 MB. Browser mengoptimalkan foto besar sebelum upload untuk memenuhi batas request Vercel 4,5 MB. Server tetap memvalidasi dan mengubah foto ke WebP maksimal 1.400 px.

Upload foto produk dan galeri membuka editor crop persegi: geser, zoom, pinch mobile, Foto Utuh, dan Isi Bingkai. Pilih Gunakan Foto sebelum menyimpan. Crop dapat diatur ulang dari foto asli selama form masih terbuka. Browser yang tidak mendukung ekspor WebP memakai JPEG, lalu server menyimpannya sebagai WebP.

## Pengujian

```powershell
npm run build
npm test
npm run test:cloud
npm run test:browser
npm run test:catalog
npm run test:contact
npm run test:upload
npm run test:crop
```

Tes memakai database/foto terisolasi; tidak mengubah data toko. `test:cloud` memakai mesin PostgreSQL PGlite dengan simulasi HTTP Storage, sehingga menguji SQL PostgreSQL dan transaksi tanpa kredensial cloud. Koneksi layanan nyata diperiksa dengan `cloud:check` setelah env tersedia. Chrome terpasang digunakan untuk browser; alternatif set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Lihat [hasil dan cakupan pengujian](docs/TESTING.md), [bahasa](docs/LANGUAGE.md) dan [transisi](docs/MOTION.md).

## Perawatan dan berkas

- `server.js`, `lib/`, `views/`, `public/`: aplikasi.
- `supabase/migrations/`: skema produksi. `migrations/`: skema SQLite lokal.
- `scripts/`: provisioning, pemeriksaan cloud, impor, backup dan pengembangan.
- `tests/`: tes backend/browser.
- `assets/` dan `ref-*.png`: sumber desain; dikecualikan dari deployment. `npm run assets` membuat ulang aset publik jika sumber diubah.
- `data/`, `backups/`: data lokal; tidak masuk Git atau Vercel.

Supabase: backup database melalui Supabase/`pg_dump`, lalu `npm run media:backup` untuk foto. Backup database tidak mencakup isi Storage. Cleanup manual: `npm run media:cleanup`. Instruksi pemulihan ada di panduan deployment.

SQLite lokal: `npm run backup`; restore hanya saat server berhenti dengan `npm run restore -- PATH_BACKUP --confirm-replace`. Perintah seed, clear demo dan restore SQLite menolak koneksi Supabase.
