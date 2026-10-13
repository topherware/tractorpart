/* Admin language is independent of the public website. Stored content stays unchanged. */
(() => {
  if (!document.body.classList.contains('admin-body')) return;
  const messages = {
    'RUANG PENGELOLA':'ADMIN WORKSPACE','Katalog & konten toko':'Catalog & store content',
    'Navigasi admin':'Admin navigation','Halaman':'Page','dari':'of','Sebelumnya':'Previous','Berikutnya':'Next',
    'Daftar produk':'Product list','Produk':'Products','Kategori':'Categories','Tentang':'About','Galeri':'Gallery','Kontak':'Contact',
    'Tambah Produk':'Add Product','+ Tambah Produk':'+ Add Product','Edit Produk':'Edit Product','Tentang Toko':'About the Store',
    'Lihat Website':'View Website','Preview Admin':'Admin Preview','Data contoh. Mode lihat saja; perubahan tidak disimpan.':'Sample data. View only; changes are not saved.',
    'Total produk':'Total products','Produk terbit':'Published products','Tersedia':'Available','Habis':'Out of stock','Foto galeri':'Gallery photos',
    'Dari produk yang diterbitkan':'From published products','Tersimpan dalam database':'Stored in the database','Terakhir diperbarui':'Recently updated',
    'Perubahan terbaru pada katalog Anda.':'Latest changes to your catalog.','Semua Produk':'All Products','KONTEN TOKO':'STORE CONTENT',
    'Informasi selalu terbaru.':'Keep information up to date.','Perbarui profil dan kontak. Website publik menggunakan sumber data yang sama.':'Update the profile and contact information. The public website uses the same data.',
    'Edit About':'Edit About','Edit Contact':'Edit Contact','KATALOG PUBLIK':'PUBLIC CATALOG','Dari admin,':'From your dashboard,','langsung ke pelanggan.':'straight to your customers.',
    'Produk Published tampil di katalog. Draft tetap tersimpan di ruang admin.':'Published products appear in the catalog. Drafts stay in the admin workspace.','Lihat Katalog':'View Catalog',
    'Cari nama barang':'Search product names','Cari nama suku cadang...':'Search spare parts...','Cari nama suku cadang\u2026':'Search spare parts...',
    'Cari produk':'Search products','Semua kategori':'All categories','Publikasi':'Publication','Semua status':'All statuses','Urutkan':'Sort by',
    'Terbaru':'Newest','Harga Terendah':'Lowest price','Harga Tertinggi':'Highest price','Reset Filter':'Reset Filters','produk':'products',
    'Harga':'Price','Ketersediaan':'Availability','Diperbarui':'Updated','Aksi':'Actions','Edit':'Edit','Hapus':'Delete','Belum dipilih':'Not selected',
    'Belum ada produk':'No products yet','Tambahkan produk pertama atau ubah filter pencarian.':'Add your first product or change the search filters.',
    'Kembali ke daftar produk':'Back to product list','Informasi produk':'Product information','Draft cukup memerlukan nama. Lengkapi semua kolom untuk menerbitkan.':'Drafts only need a name. Complete all fields to publish.',
    'Nama barang':'Product name','Harga (Rupiah)':'Price (Rupiah)','+ Tambah Kategori':'+ Add Category','Pilih kategori':'Select a category',
    'Deskripsi':'Description','Contoh: 125000':'Example: 125000','Jelaskan produk, fungsi, dan informasi yang sudah dikonfirmasi.':'Describe the product, its function, and confirmed information.',
    'Teks biasa. Baris baru akan ditampilkan pada detail produk.':'Plain text. Line breaks appear on the product detail page.',
    'Foto utama':'Main photo','Satu foto JPG, PNG, atau WebP. Maksimal 5 MB.':'One JPG, PNG, or WebP photo. Maximum 5 MB.',
    'Belum ada foto':'No photos yet','Pilih / Ganti Foto':'Choose / Replace Photo','Foto wajib sebelum produk diterbitkan.':'A photo is required before publishing.',
    'Status saat ini:':'Current status:','Simpan Perubahan':'Save Changes','Kembalikan ke Draft':'Return to Draft','Terbitkan Produk':'Publish Product','Simpan Draft':'Save Draft','Batal':'Cancel',
    'Daftar kategori':'Category list','Kategori yang dipakai produk tidak dapat dihapus.':'Categories used by products cannot be deleted.',
    'produk terkait':'related products','Simpan':'Save','Tambah kategori':'Add category','Nama unik. Slug dibuat otomatis.':'Use a unique name. The URL slug is generated automatically.',
    'Nama kategori':'Category name','Tambah Kategori':'Add Category','Belum ada kategori':'No categories yet','Buat kategori pertama di form sebelah.':'Create your first category using the form.',
    'Profil toko':'Store profile','Sumber konten profil lengkap, foto toko, dan ringkasan di Home.':'Content for the store profile, photo, and Home summary.',
    'Judul':'Title','Ringkasan Home':'Home summary','Deskripsi lengkap':'Full description','Foto toko':'Store photo','Opsional. JPG, PNG, atau WebP maksimal 5 MB.':'Optional. JPG, PNG, or WebP up to 5 MB.',
    'Pilih Foto':'Choose Photo','Tambah Foto':'Add Photo','Ganti Foto':'Replace Photo','Terbit':'Published','Tersembunyi':'Hidden','Naik':'Move Up','Turun':'Move Down',
    'Atur Foto':'Adjust Photo','Foto Utuh':'Full Photo','Isi Bingkai':'Fill Frame','Gunakan Foto':'Use Photo','Tutup editor foto':'Close photo editor',
    'Geser foto untuk mengatur posisi. Gunakan zoom atau cubit dengan dua jari.':'Drag to position the photo. Use zoom or pinch with two fingers.',
    'Pratinjau potongan foto. Gunakan tombol panah untuk menggeser.':'Photo crop preview. Use the arrow keys to move the photo.',
    'Gunakan JPG, PNG, atau WebP asli maksimal 5 MB. Foto bergerak tidak didukung.':'Use an original JPG, PNG, or WebP up to 5 MB. Animated images are not supported.',
    'Foto belum dapat diproses. Coba lagi.':'The photo could not be processed. Try again.',
    'Atur foto dan pilih Gunakan Foto sebelum menyimpan.':'Adjust the photo and choose Use Photo before saving.',
    'Informasi kontak':'Contact information','Data ini tampil di halaman utama dan footer. WhatsApp utama menjadi tujuan semua tombol Hubungi Kami dan Cek Ketersediaan.':'Shown on the homepage and footer. The primary WhatsApp number receives all Contact Us and Check Availability requests.',
    'WhatsApp utama':'Primary WhatsApp','Telepon':'Phone','Format 08, 62, atau +62.':'Use 08, 62, or +62.','Alamat toko':'Store address','Jam operasional':'Opening hours',
    'Nomor telepon':'Phone numbers','Tambah Nomor Telepon':'Add Phone Number','Hapus Nomor':'Remove Number',
    'Nomor ini menjadi tujuan tombol Hubungi Kami dan Cek Ketersediaan. Format 08, 62, atau +62.':'This number receives requests from the Contact Us and Check Availability buttons. Use 08, 62, or +62.',
    'Tambahkan nomor telepon lain untuk ditampilkan di website. Tujuan tombol WhatsApp tetap memakai WhatsApp utama.':'Add other phone numbers to display on the website. WhatsApp buttons still use the primary WhatsApp number.',
    'Isi nomor telepon Indonesia yang valid dan berbeda. Maksimal 20 nomor.':'Enter distinct valid Indonesian phone numbers. Maximum 20 numbers.',
    'Lokasi & tautan toko':'Location & store links','Tautan lokasi Maps':'Maps URL','Platform & media sosial':'Platforms & social media',
    'Tambahkan Tokopedia, Shopee, Instagram, atau platform lain. Isi nama dan URL HTTPS.':'Add Tokopedia, Shopee, Instagram, or another platform. Enter its name and HTTPS URL.',
    '+ Tambah Tautan':'+ Add Link','Nama platform':'Platform name','URL tautan':'Link URL','Contoh: Tokopedia':'Example: Tokopedia','Hapus Tautan':'Remove Link',
    'KONFIRMASI':'CONFIRMATION','Hapus item?':'Delete item?','KATEGORI BARU':'NEW CATEGORY','Simpan Kategori':'Save Category',
    'Lewati ke konten':'Skip to content','Buka menu admin':'Open admin menu','Tutup menu admin':'Close admin menu',
    'Perubahan berhasil disimpan.':'Changes saved successfully.','Item berhasil dihapus.':'Item deleted successfully.','Kategori ditambahkan dan dipilih.':'Category added and selected.',
    'Menyimpan...':'Saving...','Menyimpan\u2026':'Saving...','Coba Lagi':'Try Again',
    'Lingkungan demo: produk dan ilustrasi bertanda dummy. Ganti dengan data asli sebelum peluncuran.':'Demo environment: products and illustrations are samples. Replace them with real data before launch.'
  };
  let language='id';try{language=localStorage.getItem('tractorpart-admin-language')==='en'?'en':'id';}catch{}
  const originalTitle=document.title;
  const originals=new WeakMap();const attributes=new WeakMap();
  const translate=value=>language==='en'?(messages[value]||value.replace(/^(\d+) produk terkait$/, '$1 related products').replace(/^Telepon (\d+)$/, 'Phone $1')):value;
  function refresh() {
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(let node;node=walker.nextNode();) {
      if(node.parentElement.closest('script,style,textarea,[translate="no"],.select-value,.select-option'))continue;
      const original=originals.get(node)??node.nodeValue;originals.set(node,original);
      const trimmed=original.trim();const match=trimmed.match(/^(.*?)(\s*[*\u2190\u2191\u2193\u2197]?)$/);const base=match[1];
      const target=original.replace(trimmed,translate(base)+match[2]);if(node.nodeValue!==target)node.nodeValue=target;
    }
    document.querySelectorAll('[placeholder],[aria-label]').forEach(element=>{
      if(element.closest('[translate="no"]'))return;
      let original=attributes.get(element);if(!original){original={};for(const key of ['placeholder','aria-label'])if(element.hasAttribute(key))original[key]=element.getAttribute(key);attributes.set(element,original);}
      for(const [key,value]of Object.entries(original))element.setAttribute(key,translate(value));
    });
    document.querySelectorAll('[data-admin-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.adminLanguage===language)));
    document.documentElement.lang=language;
    document.title=translate(originalTitle.split(' · ')[0])+' · TractorPart';
    document.dispatchEvent(new CustomEvent('tractorpart:language',{detail:{language}}));
  }
  function setLanguage(next){language=next==='en'?'en':'id';try{localStorage.setItem('tractorpart-admin-language',language);}catch{}refresh();}
  window.TractorPartAdminI18n={translate,refresh,setLanguage};
  document.querySelectorAll('[data-admin-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.adminLanguage)));
  refresh();
})();
