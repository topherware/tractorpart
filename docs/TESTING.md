# Verifikasi final TractorPart 1.1

Verifikasi awal dijalankan pada 12 Oktober 2026, Node.js 24 dan Chrome headless. Editor crop serta tes penerimaan backend diverifikasi ulang pada 13 Oktober 2026. Semua akun, database, foto dan backup tes dipisahkan dari data toko.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run build` | Bundle CSS/JavaScript, sintaks JavaScript, template EJS, konfigurasi JSON dan aset produksi valid |
| `npm test` | 25/25 lulus; AC01–AC15, validasi, keamanan, persistensi lokal dan backup/restore |
| `npm run test:cloud` | 9/9 lulus; mesin PostgreSQL terisolasi dan simulasi HTTP Storage |
| `npm run test:browser` | 18/18 kelompok lulus; publik, admin, mobile, bahasa, transisi dan CRUD |
| `npm run test:catalog` | Lulus; search, dropdown, pagination, ID/EN, keyboard dan tanpa JavaScript pada empat lebar layar |
| `npm run test:upload` | Lulus setelah integrasi crop; foto asli 4.809.386 byte dikirim sebagai multipart 471.465 byte, kemudian disimpan sebagai WebP persegi 800×800 px, 438.312 byte |
| `npm run test:crop` | Lulus; crop desktop/mobile, pinch/geser/keyboard, EXIF, pembatalan, galeri publik, dan aksesibilitas |
| `npm audit --omit=dev` | 0 kerentanan runtime ditemukan |
| Guard produksi | DATABASE_URL kosong dan BASE_URL HTTP ditolak; tidak ada fallback SQLite di produksi |

## Cakupan backend

AC01–AC15 mencakup navigasi publik/SEO, Home, kartu/detail produk, filter/pagination, perubahan admin langsung di publik, draft tersembunyi, kategori, editor produk/foto, About/Contact, galeri, WhatsApp, validasi upload, otorisasi/CSRF/logout, kondisi kosong/error, serta persistensi dan backup SQLite lokal. Kontak lengkap tampil di Home, `/contact` mengarah ke `/#kontak`, dan nomor WhatsApp yang disimpan admin dipakai semua CTA kontak publik.

Pengujian PostgreSQL memakai PGlite, mesin PostgreSQL dalam proses tes. Migrasi produksi dijalankan dua kali untuk memeriksa idempotensi. Tes memeriksa RLS dan pembatasan role anonim, query berparameter, harga BIGINT, pencarian ILIKE dan escape filter, transaksi/rollback, kegagalan tulis dan Storage, foto draft, galeri, tautan platform, login paralel/rate limit, serta impor SQLite dengan ID asli dan sequence yang benar. Target berisi data tidak boleh ditimpa oleh importer.

Supabase Storage disimulasikan melalui HTTP dalam suite cloud. Pada konfigurasi layanan berikutnya, `cloud:check` berhasil terhadap Supabase nyata dan 12 produk dummy beserta foto diperiksa pada website Vercel. Persistensi setelah redeploy belum diverifikasi. Editor crop diuji lokal pada database terpisah; hasil crop baru tersedia di website Vercel setelah kode terbaru dideploy. Checklist publikasi tersedia pada [DEPLOYMENT.md](DEPLOYMENT.md).

## Browser, aksesibilitas dan performa

- Lebar layar 360, 768, 1.024 dan 1.440 px: halaman publik/admin tanpa overflow horizontal.
- Audit WCAG A/AA melalui axe: 17 pemeriksaan halaman, 0 pelanggaran otomatis terdeteksi. Pemeriksaan katalog tambahan juga 0 pelanggaran.
- Menu mobile, sapuan merah vertikal, transisi halaman, riwayat browser, fokus keyboard, reduced motion dan fallback tanpa JavaScript lulus.
- Bahasa ID/EN hanya mengubah teks UI; konten admin tetap sesuai input. Tes mobile menggunakan dropdown bahasa yang tampil pada viewport tersebut.
- Upload foto besar diperiksa dari Content-Length yang diterima server, bukan ukuran file di browser saja; hasil di bawah batas request Vercel 4,5 MB.
- Editor crop: geser/zoom/keyboard desktop, pinch dan geser mobile, Foto Utuh/Isi Bingkai, orientasi EXIF, pembatalan dan pengaturan ulang, foto rusak/terlalu besar, hasil crop tersimpan persis, tambah/ganti foto galeri serta tampilan publik. Pengujian dilakukan pada database terpisah dari Supabase; dua audit axe editor tidak menemukan pelanggaran. Browser tanpa createImageBitmap, atau dengan decoder yang gagal, memakai decoder Image. Simulasi browser tanpa ekspor WebP berhasil mengunggah crop galeri dan foto kamera produk melalui JPEG; server menyimpan WebP persegi. Kegagalan encoder mempertahankan editor agar dapat dicoba ulang.
- Katalog berisi 500 produk, jaringan 4 Mbps down / 1 Mbps up / latensi 150 ms dan CPU diperlambat 4×: Home siap pakai dalam 2.791 ms; katalog dalam 2.798 ms. Ini simulasi lokal, bukan pengukuran layanan produksi.
- Screenshot Home dan menu mobile diperiksa setelah bundling. Logo publik PNG dioptimalkan dari 358.342 menjadi 57.777 byte; aset sumber tetap dipertahankan.

## Menjalankan ulang

```powershell
npm run build
npm test
npm run test:cloud
npm run test:browser
npm run test:catalog
npm run test:upload
npm run test:crop
```

Jalankan suite browser/performa secara berurutan agar pengukuran tidak dipengaruhi browser tes lain. `test-output/` dibuat ulang oleh tes, tidak masuk Git/Vercel dan dapat dibersihkan setelah laporan ditinjau. Hasil tes lama dibersihkan pada finalisasi proyek.
