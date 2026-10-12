// Isolated sample data for the read-only design preview. No store data is read.
export function adminPreviewData(section) {
  const categories = [
    { id: 1, name: 'Filter', slug: 'filter', product_count: 2 },
    { id: 2, name: 'Mesin', slug: 'mesin', product_count: 1 },
    { id: 3, name: 'Hidrolik', slug: 'hidrolik', product_count: 1 }
  ];
  const products = [
    { id: 1, name: '[Contoh] Filter Oli', category_id: 1, price_idr: 125000, availability: 'available', publication_status: 'published' },
    { id: 2, name: '[Contoh] Filter Udara', category_id: 1, price_idr: 185000, availability: 'unavailable', publication_status: 'published' },
    { id: 3, name: '[Contoh] V-Belt Mesin', category_id: 2, price_idr: 95000, availability: 'available', publication_status: 'published' },
    { id: 4, name: '[Contoh] Selang Hidrolik', category_id: 3, price_idr: 250000, availability: 'available', publication_status: 'draft' }
  ].map(p => ({ ...p, category_name: categories.find(c => c.id === p.category_id).name,
    description: 'Data contoh untuk melihat tampilan pengelolaan produk TractorPart.',
    image_asset_id: null, updated_at: '2026-10-12T08:00:00Z' }));
  const contact = { whatsapp: '', phone: '', email: 'contoh@example.com',
    address: '[Contoh] Alamat toko TractorPart', opening_hours: '[Contoh] Senin - Sabtu, 08.00 - 17.00',
    maps_url: '', instagram_url: '', facebook_url: '', tiktok_url: '', links: [] };
  const about = { title: '[Contoh] Tentang TractorPart',
    home_summary: 'TractorPart menyediakan suku cadang untuk kebutuhan mesin Anda.',
    description: 'Ini adalah konten contoh untuk preview desain halaman admin. Data toko dapat dikelola setelah masuk dengan akun admin.',
    image_asset_id: null, image_alt: '' };
  const screens = {
    '': ['admin-dashboard', 'Dashboard'], products: ['admin-products', 'Produk'],
    categories: ['admin-categories', 'Kategori'], about: ['admin-about', 'Tentang Toko'],
    gallery: ['admin-gallery', 'Galeri'], contact: ['admin-contact', 'Kontak'],
    'products/new': ['admin-product', 'Tambah Produk']
  };
  const edit = /^products\/(\d+)\/edit$/.exec(section);
  const screen = edit ? ['admin-product', 'Edit Produk'] : screens[section];
  const product = edit ? products.find(p => p.id === Number(edit[1])) : {
    name: '', price_idr: '', description: '', availability: 'available', publication_status: 'draft'
  };
  if (!screen || (edit && !product)) return null;
  return { page: screen[0], title: screen[1], data: { categories, products, items: products, product,
    contact, about, gallery: [], total: products.length, pages: 1, page: 1,
    filters: { q: '', category: '', status: '', availability: '', sort: 'newest' },
    stats: { total: 4, published: 3, available: 2, unavailable: 1, categories: 3, gallery: 0 } } };
}
