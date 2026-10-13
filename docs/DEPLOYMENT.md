# Publish TractorPart ke Vercel + Supabase

Stack produksi: Node.js 24, Express 5, EJS, PostgreSQL Supabase melalui transaction pooler, dan Supabase Storage privat. Halaman publik serta admin memakai database yang sama. Foto tidak ditulis ke disk Vercel. Akun admin menggunakan autentikasi aplikasi sendiri; tidak dibuat melalui menu Authentication > Users Supabase.

## 1. Buat proyek Supabase

1. Masuk ke https://supabase.com/dashboard dan pilih **New project**.
2. Beri nama proyek, tentukan password database yang kuat dan simpan, lalu pilih region terdekat dengan pengguna Indonesia, misalnya Singapore.
3. Tunggu database aktif. Jangan gunakan proyek berisi aplikasi lain untuk migrasi awal ini.
4. Buka **SQL Editor > New query**. Salin seluruh isi `supabase/migrations/001_tractorpart.sql`, lalu tekan **Run**.
5. Periksa Table Editor: tersedia `products`, `categories`, `admins`, `sessions`, `media_assets`, `about_content`, `contact_content`, `contact_links`, dan `gallery_items` serta tabel pendukung.
6. Buka **Storage**. Bucket `tractorpart-media` dibuat otomatis oleh SQL dan harus **PRIVATE**. Jangan mengaktifkan Public atau membuat policy baca anonim. Foto published dilayani melalui `/media/:id`; foto draft hanya untuk admin.

Migrasi dapat dijalankan ulang tanpa menghapus isi tabel. Konten awal memakai `[Placeholder]`; katalog dan galeri kosong.

## 2. Ambil konfigurasi Supabase

1. Tekan **Connect** di proyek Supabase, pilih **Transaction pooler**, dan salin URI PostgreSQL. Gunakan host `*.pooler.supabase.com`, port **6543**, username seperti `postgres.PROJECT_REF` dan database `postgres`.
2. Ganti placeholder password di URI dengan password database. Karakter khusus pada password harus di-URL-encode; jangan encode seluruh URI. Contoh `@` menjadi `%40`, `#` menjadi `%23`, `%` menjadi `%25`.
3. Tambahkan `?sslmode=require` jika belum ada. Driver aplikasi memverifikasi sertifikat TLS dan tidak memakai named prepared statements, sesuai transaction pooler.
4. Dari **Project Settings > API / Data API**, salin Project URL: `https://PROJECT_REF.supabase.co`.
   Gunakan URL utama proyek tanpa `/rest/v1/` dan tanpa `/storage/v1/`. Aplikasi menambahkan endpoint Storage sendiri.
5. Dari **API Keys**, ambil **secret key** (`sb_secret_...`). Alternatif: legacy key dengan role **service_role**. Jangan memakai publishable/anon key. Nama variabel aplikasi tetap `SUPABASE_SECRET_KEY` untuk kedua format.

Connection string dan secret key hanya digunakan oleh server. Jangan memasukkannya ke folder `public`, browser, Git, atau variabel berawalan `NEXT_PUBLIC_`/`VITE_`.

## 3. Hubungkan proyek lokal ke Supabase

Prasyarat: Node.js **24.x** dan npm. Dari PowerShell:

```powershell
cd C:\TractorPart
npm ci
Copy-Item .env.example .env
```

Jika `.env` sudah ada, edit file tersebut; tidak perlu menimpanya. Isi:

```dotenv
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD_ENCODED@HOST.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_GANTI_DENGAN_KEY_ANDA
SUPABASE_STORAGE_BUCKET=tractorpart-media
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Semua `PROJECT_REF`, `HOST`, password, dan key di atas merupakan placeholder. Kemudian jalankan:

```powershell
npm run cloud:check
npm start
```

`cloud:check` memeriksa koneksi database, migrasi, izin akses Storage dan status bucket privat. Buka `http://localhost:3000` untuk melihat website dengan data Supabase. Perubahan lokal pada admin akan mengubah database Supabase yang dikonfigurasi.

## 4. Pilih data awal dan buat admin

**Mulai dengan katalog kosong:** lewati impor dan langsung buat akun admin. Isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env` lokal. Password minimal 12 karakter, kemudian:

```powershell
npm run admin:create
```

Karena `DATABASE_URL` terisi, akun dibuat di Supabase, bukan SQLite. Buka `/admin/login` dan gunakan akun tersebut. Setelah berhasil, kosongkan `ADMIN_PASSWORD`. Tidak ada password bawaan atau pendaftaran publik.

**Mengganti password akun yang sudah ada:** `admin:create` tidak memperbarui akun lama. Isi `ADMIN_EMAIL` dengan email akun yang akan direset dan `ADMIN_PASSWORD` dengan password baru di `.env` lokal, lalu jalankan:

```powershell
npm run admin:reset-password
```

Gunakan tanda kutip ganda untuk password dalam `.env`, terutama jika mengandung `#`, agar tidak terbaca sebagai komentar. Reset hanya mengganti password akun admin yang dituju dan mencabut sesi akun tersebut. Setelah verifikasi, kosongkan `ADMIN_PASSWORD`. Tidak perlu redeploy Vercel jika aplikasi menggunakan database Supabase yang sama. Batas percobaan login tetap aktif.

**Pindahkan data SQLite yang sudah ada (opsional):** lakukan sebelum membuat akun di target. Target Supabase harus kosong selain placeholder bawaan. Buat backup lokal terlebih dahulu menggunakan konfigurasi SQLite (`DATABASE_URL` kosong), lalu isi kembali konfigurasi Supabase dan jalankan:

```powershell
npm run data:import -- --confirm
```

Importer membaca `DATA_DIR/tractorpart.sqlite` dan `DATA_DIR/uploads` tanpa mengubah sumber. Produk asli, kategori, profil, kontak, tautan, galeri, akun admin, serta foto terkait disalin. Produk dengan nama berakhiran `[Dummy]` dikecualikan secara default. Sesi login dan login attempt tidak disalin. Jika hanya ingin demo pada proyek percobaan, tambahkan `--include-demo`.

Importer menolak target berisi data. Jangan menjalankan admin saat impor berlangsung. Kegagalan transaksi membatalkan data dan mencoba menghapus foto yang baru diupload. Setelah impor, jalankan `cloud:check`, login dengan akun sumber jika tersedia, atau jalankan `admin:create` bila belum ada akun.

## 5. Masukkan kode ke GitHub

Buat repository **private** di GitHub, tanpa README tambahan agar push awal sederhana. Dari folder proyek:

```powershell
git init
git add .
git commit -m "Prepare TractorPart for Vercel and Supabase"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Jika repository sudah ada, gunakan remote yang ada. `.gitignore` mengecualikan `.env`, data lokal, backup, cache, dan hasil tes. Aset publik yang siap pakai **harus ikut commit**. `.vercelignore` membatasi berkas deployment; aset sumber dan gambar referensi tetap tersedia lokal.

## 6. Import ke Vercel

1. Buka https://vercel.com/new, hubungkan GitHub, dan pilih repository TractorPart.
2. Root Directory: folder berisi `package.json` dan `server.js` (root repository bila mengikuti langkah sebelumnya).
3. Framework Preset: **Express**. Node.js Version: **24.x**. Function region sudah diatur Singapore (`sin1`) agar dekat dengan database Singapore; sesuaikan region bila proyek Supabase memakai lokasi lain.
4. Install Command: `npm ci --include=dev`. Build Command: `npm run build`. Konfigurasi sudah ada pada `vercel.json`. Dependency build perlu terpasang meskipun `NODE_ENV=production`. Biarkan Output Directory memakai default framework; jangan mengisinya sebagai situs statis saja.
5. Tentukan nama proyek, misalnya `tractorpart-toko`; `BASE_URL` harus cocok dengan URL produksi yang benar, bukan placeholder.
6. Isi Environment Variables berikut untuk **Production**:

| Nama | Nilai |
| --- | --- |
| `NODE_ENV` | `production` |
| `BASE_URL` | `https://NAMA-PROYEK.vercel.app` atau domain final |
| `DATABASE_URL` | URI Transaction pooler Supabase dari langkah 2 |
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_SECRET_KEY` | Secret key atau legacy service_role |
| `SUPABASE_STORAGE_BUCKET` | `tractorpart-media` |
| `DATABASE_CA_CERT` | Isi lengkap sertifikat CA Supabase, termasuk baris BEGIN/END CERTIFICATE |
| `TRUST_PROXY` | `1` |

Untuk proyek yang sudah membutuhkan sertifikat pada pemeriksaan lokal, `DATABASE_CA_CERT` juga harus diisi di Vercel. Unduh sertifikat melalui **Database Settings > SSL Configuration > Download Certificate**. Jika berkas lokal bernama `prod-ca-2021.crt`, salin isi sertifikat ke clipboard dari PowerShell:

```powershell
Get-Content -LiteralPath C:\TractorPart\prod-ca-2021.crt -Raw | Set-Clipboard
```

Paste langsung ke Value `DATABASE_CA_CERT` di Vercel. Sertakan seluruh isi PEM dengan newline asli; jangan menambahkan tanda kutip, nama berkas, atau `DATABASE_CA_CERT=`. Driver menerima newline asli maupun literal `\n`. Untuk nilai rahasia lain, salin nilai masing-masing dari `.env`, tanpa nama variabel dan tanpa tanda kutip pembungkus. Jangan mengimpor `.env` lokal secara utuh ke Vercel karena ada pengaturan lokal serta provisioning admin.

Jangan memasukkan `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `DATA_DIR`, atau `BACKUP_DIR` ke Vercel. Akun sudah dibuat melalui CLI. `PORT` tidak diperlukan di Vercel.

7. Tekan **Deploy**. Bila URL yang diberikan berbeda dari `BASE_URL`, perbarui variabel ke URL yang benar lalu **Redeploy**.
8. Untuk Preview deployments, gunakan proyek Supabase terpisah dan variabel Preview tersendiri. Jika Preview diarahkan ke database produksi, setiap perubahan admin di Preview juga mengubah toko produksi. Preview desain admin tanpa akun memang dinonaktifkan pada produksi.

`vercel.json` mengekspor Express sebagai satu function, menyertakan template EJS, dan memetakan `/static/*` ke aset CDN dari `public`. Aplikasi tidak menjalankan listener, timer backup, atau menulis foto/SQLite ketika berjalan di Vercel.

## 7. Domain dan pemeriksaan publikasi

1. Jika menggunakan domain sendiri, buka **Vercel > Project > Settings > Domains**, tambahkan domain dan ikuti DNS yang ditampilkan Vercel.
2. Setelah HTTPS aktif, ubah `BASE_URL` menjadi origin final (contoh `https://tractorpart.co.id`) dan Redeploy. Login dan perubahan admin harus dilakukan dari origin yang sama.
3. Buka `/admin/login` pada domain final. Login, tambah kategori, lalu buat produk draft dengan foto.
4. Salin URL foto draft `/media/ID` ke jendela incognito: harus **404**.
5. Terbitkan produk dengan harga, deskripsi, kategori dan foto. Periksa Home, katalog, detail serta foto melalui incognito.
6. Ganti harga/foto/status dari admin; refresh publik dan pastikan perubahan tampil. Kembalikan ke draft; detail dan foto harus hilang dari publik.
7. Isi profil, WhatsApp, alamat, jam operasional dan tautan platform asli. Upload foto galeri. Cek publik serta tombol WhatsApp.
8. Logout, login ulang dari perangkat lain, dan periksa data. Jalankan Redeploy sekali dan pastikan produk serta foto tetap ada.
9. Periksa logo, hero, favicon, bahasa, menu mobile, pencarian, dropdown dan pagination. Buka `/robots.txt` dan `/sitemap.xml`.

Foto asli maksimal **5 MB**. Untuk upload browser di atas 3 MB, aplikasi mengecilkan foto menjadi WebP sebelum mengirim, sehingga multipart berada di bawah batas request Vercel 4,5 MB. Server tetap memeriksa foto sebelum menyimpan. Klien API eksternal harus mengirim multipart di bawah batas Vercel juga.

Foto produk dan galeri membuka editor **Atur Foto** setelah dipilih. Geser untuk mengatur posisi, gunakan slider zoom, scroll mouse, tombol panah/+/−, atau gesture pinch dua jari di mobile. **Isi Bingkai** memenuhi kotak persegi; **Foto Utuh** menampilkan seluruh foto dengan ruang putih bila proporsi berbeda. Tekan **Gunakan Foto**, lalu simpan form agar foto diunggah. Tombol **Atur Foto** di samping input membuka kembali foto asli untuk mengubah crop selama halaman belum ditinggalkan. **Batal** atau Escape mempertahankan crop yang terakhir disetujui. Foto yang disimpan berbentuk persegi, maksimal 1.400 px per sisi, tanpa memperbesar sumber kecil. Foto toko pada halaman Tentang tetap menggunakan upload biasa.

## 8. Backup dan perawatan

Backup database Supabase **tidak mencakup isi berkas Storage**. Cadangkan keduanya pada waktu admin tidak mengubah konten:

1. Aktifkan/cek backup database pada **Supabase > Database > Backups**; kemampuan dan retensi tergantung paket. Untuk salinan mandiri, gunakan PostgreSQL client `pg_dump` dengan **Session pooler port 5432** atau direct connection yang kompatibel jaringan, bukan transaction pooler.
2. Contoh PowerShell setelah menyimpan URI Session pooler pada variabel `BACKUP_DATABASE_URL` di sesi terminal lokal:

```powershell
New-Item -ItemType Directory -Force backups
pg_dump --dbname=$env:BACKUP_DATABASE_URL --format=custom --file=backups/tractorpart-postgres.dump
npm run media:backup
```

`media:backup` memakai konfigurasi Supabase di `.env`, menyalin seluruh foto yang tercatat di database serta manifest dengan ID dan kunci berkas, lalu memeriksa ukuran. Folder `.partial` berarti backup belum lengkap. Jalankan ulang jika foto diubah bersamaan. Simpan dump dan folder foto pada lokasi lain yang aman; keduanya bisa memuat data sensitif.

3. Pemulihan: hentikan perubahan admin, pulihkan dump ke proyek target kosong dengan `pg_restore`/prosedur Supabase, buat bucket privat yang sama, lalu upload kembali berkas WebP dengan **nama storage_key asli** dari manifest. Jangan mengganti nama foto. Konfigurasi env proyek target, jalankan `cloud:check`, cek seluruh foto dan login ulang. Cadangkan target sebelum mengganti isinya. Perintah `npm run restore` hanya untuk SQLite lokal, bukan Supabase.
4. Cleanup sesi lama/foto orphan yang tercatat: jalankan `npm run media:cleanup` dari komputer/job terjadwal dengan env Supabase. Vercel tidak menjalankan timer per jam. Berkas Storage yang tidak pernah berhasil tercatat di database setelah kegagalan jaringan perlu diperiksa di dashboard sebelum dihapus.
5. Update kode: push perubahan ke `main`; Vercel deploy otomatis. Perubahan env memerlukan Redeploy. Migrasi skema berikutnya dijalankan terpisah dan dicadangkan dahulu.

## Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| Function gagal karena konfigurasi | Isi semua env produksi. Tidak ada fallback SQLite di produksi. |
| Database tidak terhubung | URI Transaction pooler, password ter-encode, project aktif dan username lengkap. |
| TLS certificate error | Ambil sertifikat CA proyek Supabase bila diperlukan dan isi `DATABASE_CA_CERT` dengan PEM; newline dapat ditulis `\n`. Jangan mematikan verifikasi TLS. |
| Relation/table tidak ada | Jalankan seluruh SQL migrasi pada proyek yang sama dengan `DATABASE_URL`. |
| Storage 401/403 | Gunakan secret/service_role dari proyek yang sama, bukan anon/publishable. |
| CSS, logo atau font 404 | Pastikan `public/**` ikut Git dan konfigurasi rewrite dari `vercel.json` dipakai. |
| Login ditolak karena origin | `BASE_URL` harus tepat: HTTPS, domain, dan www/non-www sesuai halaman. Redeploy setelah mengubahnya. |
| Upload terlalu besar | Gunakan form admin dengan JavaScript aktif; klien eksternal harus menjaga total request di bawah 4,5 MB. |
| Login 429 | Tunggu 15 menit setelah lima percobaan; jangan menghapus rate limit hanya untuk mencoba password. |

Referensi resmi: [Express di Vercel](https://vercel.com/docs/frameworks/backend/express), [koneksi PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
