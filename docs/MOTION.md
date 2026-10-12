# Transisi TractorPart

Transisi mengikuti skill **transitions-dev**, dengan resep CSS dropdown, modal, panel reveal, dan page side-by-side. Token universal dan resep aslinya berada di `public/motion.css`; bagian akhir berisi penyesuaian untuk TractorPart. Orkestrasi DOM berada di `public/motion.js`, tanpa dependensi animasi tambahan.

| Elemen | Perilaku | Durasi |
| --- | --- | --- |
| Hero | Headline, deskripsi, dan CTA muncul bertahap; foto fade | 400–500 ms, offset 40 ms |
| Kartu produk, galeri, dan bagian konten | Reveal satu kali saat masuk viewport; bergerak 12 px | 400 ms, stagger maksimal 120 ms |
| Menu publik/mobile | Scale dari posisi pemicu; dismissal lebih cepat | Buka 250 ms, tutup 150 ms |
| Dropdown kategori, status, urutan, dan jumlah hasil | Scale dari pemicu, centang opsi terpilih, posisi ke atas bila ruang bawah sempit | Buka 250 ms, tutup 150 ms |
| Lightbox galeri publik | Scale 0,96 ke 1; backdrop fade | Buka 250 ms, tutup 150 ms |
| Foto lightbox berikutnya/sebelumnya | Fade dengan perpindahan 4 px | 150 ms |
| Tombol, panah, dan foto kartu | Lift/zoom ringan ketika mouse hover | Masuk 250 ms, kembali 350 ms |
| Heading halaman publik | Fade dengan perpindahan 8 px | 250 ms |
| Menu di Home | Smooth scroll ke section, penanda aktif mengikuti posisi scroll | Durasi native browser mengikuti jarak |
| Tepi atas konten publik | Blur 7 px dengan gradient mask; konten memudar di bawah header | Fade 150 ms, area 64 px desktop / 44 px mobile |
| Navigasi publik, detail, dan filter katalog | Tiga lapisan merah menyapu dari samping; saat penuh, latar merah utama dengan logo putih di tengah | 560 ms/lapisan, stagger 70 ms, tahan penuh 100 ms |

Animasi memakai transform/opacity dan blur kecil dari resep untuk reveal. Kelas reveal dan `will-change` dilepas setelah selesai agar tidak mempertahankan layer grafis pada semua kartu. Navigasi dokumen menunggu sapuan selesai sebelum membuka URL tujuan; menu antarsection tetap memakai smooth scroll.

`prefers-reduced-motion: reduce` menonaktifkan animasi, stagger, dan gerakan hover. Penutupan dialog/menu berlangsung langsung. Perubahan preferensi saat runtime juga menyelesaikan animasi yang masih berjalan. Konten server tetap terlihat ketika JavaScript dinonaktifkan.

Dialog tetap memakai elemen native `<dialog>` sehingga focus trap dipertahankan. Escape menjalankan fase tutup sebelum mengembalikan fokus. Menu yang menutup dibuat inert; menu desktop kembali aktif saat breakpoint berubah. Focus keyboard pada kartu menyelesaikan reveal langsung.

Di Home, menu Home/Products/About/Gallery/Contact menggulir ke section dengan offset header dan memperbarui hash URL. Menu mobile menutup setelah pilihan; fokus berpindah ke section tujuan. Back/Forward mengembalikan pilihan section. Tautan katalog lengkap tetap tersedia pada “Lihat Semua Produk”; tautan menu di halaman lain membuka rute terkait. Tanpa JavaScript, semua href tetap dapat digunakan.

Lapisan blur bersifat dekoratif (`aria-hidden`, `pointer-events: none`) dan tampil setelah scroll 12 px. Tinggi header diukur ulang dengan ResizeObserver. Reduced motion menonaktifkan smooth scroll, blur atas, serta transisi antarhalaman.

Transisi dokumen mengikuti konsep sapuan berlapis dari screenshot terbaru: tiga bidang penuh bergerak horizontal dengan easing `cubic-bezier(0.76, 0, 0.24, 1)`. Warna memakai merah gelap `#890811`, merah hover `#B50913`, dan merah utama `#D90B17`. Bidang utama menutup paling akhir sehingga layar penuh menjadi merah seragam. Logo asli tampil putih melalui filter CSS, tetap tepat di tengah dan mempertahankan rasio; nama halaman tidak ditampilkan. Saat membuka halaman, urutan lapisan dibalik. Token `--page-wipe-dur`, `--page-wipe-stagger`, dan `--page-wipe-hold` mengatur timing.

Lapisan dibuat hanya melalui JavaScript, diberi `aria-hidden`, dan disembunyikan setelah selesai. Tautan internal serta form filter GET mempertahankan URL dan parameter; Back/Forward membersihkan status transisi melalui `pageshow`. Klik dengan Ctrl/Cmd, target tab baru, download, tautan eksternal, dan hash lokal mengikuti perilaku browser. Pembatalan keluar dari form admin diperiksa sebelum sapuan dimulai. Form simpan admin tetap memakai alur API tanpa animasi. Reduced motion langsung berpindah tanpa lapisan; tanpa JavaScript semua tautan/form tetap native. View Transitions native dinonaktifkan agar efek tidak bertumpuk.

Verifikasi tambahan berada di `tests/browser.js`: resep dan durasi, cleanup reveal, buka–tutup–buka cepat, perubahan breakpoint, fokus lightbox, reduced motion, serta konten tanpa JavaScript. Pengukuran 4G menunggu font, animasi hero, dan sapuan halaman selesai sebelum mencatat waktu siap digunakan. Screenshot penuh menggulir halaman dahulu agar reveal tercatat.

Untuk mengubah timing, edit token `--dropdown-*`, `--modal-*`, dan `--panel-*` pada `public/motion.css`. `--motion-stagger` mengatur offset per item. Versi URL aset motion di `views/layout.ejs` perlu dinaikkan setelah perubahan agar cache browser mengambil berkas baru.

Dropdown katalog diatur oleh `public/catalog-controls.js` dan memakai resep `.t-dropdown` yang sama. Keyboard mendukung Arrow Up/Down, Home/End, pencarian melalui huruf, Enter/Space untuk memilih, serta Escape/Tab untuk menutup. Klik di luar menutup panel; panel yang menutup dibuat inert. Tanpa JavaScript, select native tetap berfungsi. `npm run test:catalog` memeriksa kontrol ini dan transisinya secara terpisah.

Login, preview, dan seluruh halaman admin tidak memuat `motion.js`. Animasi, transisi CSS, dan smooth scroll dinonaktifkan pada area admin; menu dan dialog menggunakan interaksi native langsung. Navigasi dari halaman publik menuju `/admin` juga langsung tanpa sapuan.

Seluruh dropdown admin memakai komponen katalog publik dengan penutupan langsung tanpa durasi. Desain dan kontrol keyboard sama; animasi tetap dinonaktifkan di admin.


Build produksi menggabungkan sumber ini menjadi bundle pada `public/bundles/`. Jalankan `npm run build` setelah mengubah CSS atau JavaScript agar preview dan deployment memakai perubahan terbaru.
