# Header dan pilihan bahasa

Header publik mengikuti komposisi referensi: menu di kiri, logo TractorPart tepat di tengah viewport, dan pilihan ID/EN beserta tombol Hubungi Kami di kanan. Header menyatu dengan latar putih, tanpa kotak, bingkai, bayangan, underline menu, atau pill bahasa. Menu dan pilihan bahasa memakai teks 14 px tebal; menu dan bahasa aktif berwarna merah. Pada lebar di bawah 900 px, menu menjadi hamburger di kiri; posisi tengah logo tetap dipertahankan. Pada lebar di bawah 768 px, pilihan bahasa dan tombol kontak berada pada baris kedua header agar tidak bertumpuk dengan logo.

Bahasa awal adalah Indonesia. Tombol English mengubah teks antarmuka publik tanpa reload. Pilihan disimpan pada `localStorage` dengan kunci `tractorpart-language` dan digunakan kembali setelah refresh maupun perpindahan halaman. Halaman admin memakai bahasa Indonesia.

Yang diterjemahkan adalah teks statis yang diberi penanda eksplisit: menu, headline Home, CTA, label filter, opsi sorting/ketersediaan, breadcrumb, pagination, teks kosong, disclaimer, footer, label aksesibilitas, dan judul tab Home/katalog. Pesan WhatsApp menggunakan bahasa pilihan; nama produk dan URL produk tetap dipertahankan. Harga tetap dalam Rupiah.

Nama/deskripsi produk, nama kategori, judul/ringkasan/deskripsi profil, alt text foto admin, judul/caption galeri, alamat, jam operasional, serta nomor kontak tetap persis dari database. Toggle tidak menulis database, tidak memanggil layanan terjemahan, dan tidak mengubah input pencarian maupun nilai filter. Detail produk mempertahankan nama admin sebagai judul tab.

Kamus berada di `public/i18n.js`. Teks yang dapat diterjemahkan memakai `data-i18n`, `data-i18n-placeholder`, atau `data-i18n-aria`; konten admin diberi `translate="no"`. Terjemahan teks memakai `textContent`. Data admin tidak dipindai atau dicocokkan dengan kamus.

Gaya header berada di `public/header.css`. Toggle merupakan dua tombol berlabel Bahasa Indonesia/English dengan `aria-pressed`; dapat digunakan lewat keyboard. Reduced motion tetap berlaku untuk hover, navigasi section, blur scroll, dan transisi halaman. Menu yang terbuka menggunakan label aksesibilitas sesuai bahasa pilihan.

Pengujian browser memeriksa posisi pusat logo pada 360/768/1024/1440 px, persistensi bahasa, menu/filter/detail berbahasa Inggris, isi admin yang tidak berubah, lightbox, serta aksesibilitas halaman detail Inggris. Hasil tersedia di `docs/TESTING.md`.

About dan Gallery tersedia sebagai section Home. Menu dan footer mengarah ke `/#tentang` dan `/#galeri`; rute lama dialihkan ke section tersebut. Deskripsi lengkap dan foto profil admin serta seluruh foto galeri yang diterbitkan tampil di Home.

Ajakan layanan memakai Cek Ketersediaan / Check Availability. Pesan WhatsApp umum dan produk meminta konfirmasi stok; tidak menawarkan layanan konsultasi.

Admin memakai `public/admin-i18n.js` dan kunci `tractorpart-admin-language`, terpisah dari bahasa publik. Default ID; pilihan EN tersimpan. Nama produk/kategori, isi textarea/input, identitas akun, dan nama platform tidak diterjemahkan. Toggle tersedia di sidebar.


Build produksi menggabungkan sumber ini menjadi bundle pada `public/bundles/`. Jalankan `npm run build` setelah mengubah CSS atau JavaScript agar preview dan deployment memakai perubahan terbaru.
