/* Only explicitly marked interface copy is translated. Admin content is untouched. */
(() => {
  if (!document.body.classList.contains('public-body')) return;
  const messages = {
    language: ["Bahasa", "Language"],
    searchProducts: ["Cari produk", "Search products"], resultsPerPage: ["Hasil per halaman", "Results per page"], previousPage: ["Sebelumnya", "Previous"], nextPage: ["Berikutnya", "Next"], perPage10: ["10 / halaman", "10 / page"], perPage20: ["20 / halaman", "20 / page"], perPage50: ["50 / halaman", "50 / page"], perPage100: ["100 / halaman", "100 / page"],
    breadcrumbNavigation: ["Jejak navigasi", "Breadcrumb"],
    home: ["Beranda", "Home"], products: ["Produk", "Products"], about: ["Tentang", "About"], gallery: ["Galeri", "Gallery"], contact: ["Kontak", "Contact"],
    skip: ["Lewati ke konten", "Skip to content"], openMenu: ["Buka menu navigasi", "Open navigation menu"], closeMenu: ["Tutup menu navigasi", "Close navigation menu"], navigation: ["Navigasi utama", "Main navigation"], footerNavigation: ["Navigasi footer", "Footer navigation"],
    heroEyebrow: ["SUKU CADANG · TRACTORPART", "SPARE PARTS · TRACTORPART"], heroTitle: ["Suku Cadang Andal", "Reliable Parts"], heroFor: ["untuk", "for"], heroMachine: ["Mesin Anda.", "Your Machines."],
    heroIntro: ["Temukan produk, lihat harga dan ketersediaan, lalu hubungi", "Explore products, check prices and availability, then contact"], heroIntroEnd: ["kami untuk kebutuhan suku cadang Anda.", "us for your spare parts needs."],
    viewProducts: ["Lihat Produk", "Explore Products"], contactUs: ["Hubungi Kami", "Contact Us"], caption: ["MENJAGA MESIN. MENDUKUNG PEKERJAAN.", "KEEPING MACHINES RUNNING. SUPPORTING YOUR WORK."], exploreCatalog: ["Jelajahi katalog", "Explore the catalog"],
    catalogSelection: ["PILIHAN DARI KATALOG", "FROM OUR CATALOG"], latestProducts: ["Produk terbaru", "Latest products"], allProducts: ["Lihat Semua Produk", "View All Products"],
    demoHome: ["DATA DUMMY · Contoh katalog pengembangan, bukan penawaran produk asli.", "DEMO DATA · Sample catalog for development, not actual product offers."], demoCatalog: ["DATA DUMMY · Produk dan ilustrasi contoh untuk pengembangan.", "DEMO DATA · Sample products and illustrations for development."], demoDetail: ["DATA DUMMY · Informasi produk contoh pengembangan.", "DEMO DATA · Sample product information for development."],
    catalogPending: ["Katalog sedang disiapkan", "Our catalog is being prepared"], catalogPendingBody: ["Produk akan tampil setelah diterbitkan oleh pengelola.", "Products will appear after the administrator publishes them."], contactStore: ["Hubungi Toko", "Contact the Store"],
    knowUs: ["KENALI TRACTORPART", "GET TO KNOW TRACTORPART"], aboutUs: ["Tentang Kami", "About Us"], behindUs: ["DI BALIK TRACTORPART", "BEHIND TRACTORPART"], storeGallery: ["Galeri toko", "Store gallery"], viewGallery: ["Lihat Galeri", "View Gallery"],
    availabilityTitle: ["Cek ketersediaan suku cadang", "Check spare parts availability"], availabilityBody: ["Hubungi toko untuk memastikan stok produk yang Anda butuhkan.", "Contact the store to confirm stock for the product you need."], checkAvailability: ["Cek Ketersediaan", "Check Availability"],
    footerLine1: ["Suku cadang yang tepat.", "The right spare parts."], footerLine2: ["Untuk mesin yang terus bekerja.", "For machines that keep working."], findUs: ["TEMUKAN KAMI", "FIND US"], rights: ["TractorPart. Hak cipta dilindungi.", "TractorPart. All rights reserved."], footerCatalog: ["Katalog suku cadang", "Spare parts catalog"],
    findParts: ["TEMUKAN KEBUTUHAN MESIN ANDA", "FIND WHAT YOUR MACHINE NEEDS"], chosenParts: ["Suku cadang pilihan.", "Selected spare parts."], requiredInfo: ["Informasi yang Anda perlukan.", "The information you need."], found: ["produk ditemukan", "products found"], reset: ["Reset Filter", "Reset Filters"], notFound: ["Produk tidak ditemukan", "No products found"], tryFilters: ["Coba kata kunci lain atau ubah pilihan filter Anda.", "Try another keyword or adjust your filters."],
    searchLabel: ["Cari nama barang", "Search product name"], searchPlaceholder: ["Cari nama suku cadang…", "Search spare parts…"], category: ["Kategori", "Category"], allCategories: ["Semua kategori", "All categories"], availability: ["Ketersediaan", "Availability"], allStatuses: ["Semua status", "All statuses"], available: ["Tersedia", "Available"], unavailable: ["Habis", "Out of stock"], sort: ["Urutkan", "Sort by"], newest: ["Terbaru", "Newest"], lowPrice: ["Harga Terendah", "Lowest Price"], highPrice: ["Harga Tertinggi", "Highest Price"], apply: ["Terapkan", "Apply"],
    viewDetail: ["Lihat Detail", "View Details"], view: ["Lihat", "View"], prev: ["Sebelumnya", "Previous"], next: ["Berikutnya", "Next"], page: ["Halaman", "Page"], of: ["dari", "of"], catalogPages: ["Halaman katalog", "Catalog pages"], backCatalog: ["Kembali ke katalog", "Back to catalog"],
    productDescription: ["Deskripsi produk", "Product description"], askProduct: ["Tanyakan Produk", "Ask About This Product"], askAvailability: ["Tanyakan Ketersediaan", "Ask About Availability"], disclaimer: ["Harga dan status merupakan informasi katalog. Konfirmasi pembelian dilakukan langsung dengan toko.", "Prices and availability are catalog information. Confirm purchases directly with the store."], sameCategory: ["DALAM KATEGORI YANG SAMA", "IN THE SAME CATEGORY"], related: ["Produk terkait", "Related products"],
    noStorePhoto: ["Foto toko belum tersedia", "Store photo is not available yet"], galleryIntro: ["Dokumentasi toko dan produk kami.", "Photos of our store and products."], noPhotos: ["Belum ada foto", "No photos yet"], noPhotosBody: ["Dokumentasi toko akan tampil di sini setelah diterbitkan.", "Store photos will appear here once published."], openPhoto: ["Buka foto", "Open photo"], closeGallery: ["Tutup galeri", "Close gallery"], prevPhoto: ["Foto sebelumnya", "Previous photo"], nextPhoto: ["Foto berikutnya", "Next photo"], galleryPhoto: ["Foto galeri", "Gallery photo"],
    ready: ["KAMI SIAP MEMBANTU", "WE’RE HERE TO HELP"], connect: ["Cek ketersediaan produk", "Check product availability"], contactIntro: ["Hubungi TractorPart untuk mengecek stok suku cadang yang Anda butuhkan.", "Contact TractorPart to check stock for the spare parts you need."], stockLabel: ["KETERSEDIAAN PRODUK", "PRODUCT AVAILABILITY"], stockTitleLead: ["Pastikan", "Check"], stockTitleEnd: ["stok produk.", "product stock."], whatsapp: ["Chat melalui WhatsApp", "Chat on WhatsApp"], missingWhatsApp: ["[Placeholder] Nomor WhatsApp belum diisi oleh pengelola.", "[Placeholder] The administrator has not added a WhatsApp number yet."], address: ["ALAMAT TOKO", "STORE ADDRESS"], maps: ["Buka Peta", "Open Map"], hours: ["JAM OPERASIONAL", "OPENING HOURS"], otherContact: ["KONTAK LAINNYA", "OTHER CONTACTS"], follow: ["IKUTI KAMI", "FOLLOW US"],
    openCatalog: ["Buka Katalog", "Open Catalog"], retry: ["Coba Lagi", "Try Again"]
  };
  let language = 'id';
  try { language = localStorage.getItem('tractorpart-language') === 'en' ? 'en' : 'id'; } catch {}
  const text = key => messages[key]?.[language === 'en' ? 1 : 0] || key;
  const originalTitle = document.title;
  const titles = {
    home: ['Suku Cadang Andal untuk Mesin Anda', 'Reliable Parts for Your Machines'],
    products: ['Katalog Produk', 'Product Catalog'], about: ['Tentang TractorPart', 'About TractorPart'],
    gallery: ['Galeri TractorPart', 'TractorPart Gallery'], contact: ['Hubungi TractorPart', 'Contact TractorPart']
  };
  const staticErrors = {
    'Produk tidak ditemukan': 'Product not found', 'Produk tidak ditemukan atau belum diterbitkan.': 'This product was not found or has not been published.',
    'Halaman tidak ditemukan': 'Page not found', 'Halaman yang Anda cari tidak tersedia.': 'The page you are looking for is not available.',
    'Terjadi kendala': 'Something went wrong', 'Halaman belum dapat dimuat. Silakan coba lagi.': 'The page could not be loaded. Please try again.'
  };
  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'id';
    document.documentElement.lang = language;
    try { localStorage.setItem('tractorpart-language', language); } catch {}
    document.querySelectorAll('[data-i18n]').forEach(element => {
      if (messages[element.dataset.i18n] && !element.closest('[translate="no"]')) element.textContent = text(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => element.placeholder = text(element.dataset.i18nPlaceholder));
    document.querySelectorAll('[data-i18n-aria]').forEach(element => element.setAttribute('aria-label', text(element.dataset.i18nAria)));
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    document.querySelectorAll('[data-language-select]').forEach(select => { select.value = language; });
    document.querySelector('[data-menu]')?.setAttribute('aria-label', text(document.querySelector('[data-menu]').getAttribute('aria-expanded') === 'true' ? 'closeMenu' : 'openMenu'));
    document.querySelectorAll('.product-image').forEach(link => link.setAttribute('aria-label', `${text('view')} ${link.querySelector('img').alt}`));
    document.querySelectorAll('[data-gallery]').forEach(button => button.setAttribute('aria-label', `${text('openPhoto')} ${button.dataset.title}`));
    document.querySelectorAll('[data-static-error]').forEach(element => {
      element.dataset.originalText ||= element.textContent;
      element.textContent = language === 'en' ? staticErrors[element.dataset.originalText] || element.dataset.originalText : element.dataset.originalText;
    });
    const pageTitle = titles[document.body.dataset.page];
    document.title = pageTitle ? `${pageTitle[language === 'en' ? 1 : 0]} · TractorPart` : originalTitle;
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
      link.dataset.originalHref ||= link.href;
      const url = new URL(link.dataset.originalHref);
      if (language === 'en') {
        const message = url.searchParams.get('text');
        if (link.dataset.productName) url.searchParams.set('text', `Hello TractorPart, is the product ${link.dataset.productName} available? ${link.dataset.productUrl}`);
        else if (message === 'Halo TractorPart, saya ingin mengecek ketersediaan suku cadang. Apakah produk yang saya butuhkan tersedia?') url.searchParams.set('text', 'Hello TractorPart, I would like to check spare parts availability. Is the product I need in stock?');
      }
      link.href = url.href;
    });
    document.dispatchEvent(new CustomEvent('tractorpart:language', { detail: { language } }));
  }
  window.TractorPartI18n = { text, setLanguage };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  document.querySelectorAll('[data-language-select]').forEach(select => select.addEventListener('change', () => setLanguage(select.value)));
  setLanguage(language);
})();
