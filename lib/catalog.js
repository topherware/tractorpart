import { one, all, cloud } from "./db.js";
export const productSelect =
  "SELECT p.*,c.name category_name,c.slug category_slug,m.storage_key,m.width image_width,m.height image_height FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN media_assets m ON m.id=p.image_asset_id";
export const publicCategories = async () =>
  await all(
    "SELECT c.* FROM categories c WHERE EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id AND p.publication_status='published') ORDER BY c.name",
  );
export async function catalog(query = {}, admin = false, limit = null) {
  const requestedSize = Number(query.per_page);
  const pageSize =
    limit ??
    (admin
      ? 12
      : [10, 20, 50, 100].includes(requestedSize)
        ? requestedSize
        : 10);
  const clauses = admin ? ["1=1"] : ["p.publication_status='published'"],
    params = [];
  const q = String(query.q || "")
      .trim()
      .slice(0, 150),
    category = String(query.category || ""),
    availability = String(query.availability || ""),
    status = String(query.status || ""),
    sort = String(query.sort || "newest");
  if (q) {
    clauses.push(`p.name ${cloud ? "ILIKE" : "LIKE"} ? ESCAPE '\\'`);
    params.push("%" + q.replace(/[\\%_]/g, "\\$&") + "%");
  }
  if (category) {
    clauses.push("c.slug=?");
    params.push(category);
  }
  if (["available", "unavailable"].includes(availability)) {
    clauses.push("p.availability=?");
    params.push(availability);
  }
  if (admin && ["draft", "published"].includes(status)) {
    clauses.push("p.publication_status=?");
    params.push(status);
  }
  const where = clauses.join(" AND "),
    total = (
      await one(
        `SELECT count(*) n FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE ${where}`,
        ...params,
      )
    ).n;
  const pages = Math.max(1, Math.ceil(total / pageSize)),
    page = Math.min(pages, Math.max(1, parseInt(query.page) || 1));
  const order =
    sort === "price-low"
      ? "p.price_idr ASC,p.id ASC"
      : sort === "price-high"
        ? "p.price_idr DESC,p.id DESC"
        : admin
          ? "p.updated_at DESC,p.id DESC"
          : "p.published_at DESC,p.id DESC";
  return {
    items: await all(
      `${productSelect} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      ...params,
      pageSize,
      (page - 1) * pageSize,
    ),
    total,
    pages,
    page,
    perPage: pageSize,
    filters: { q, category, availability, status, sort },
  };
}
export const about = async () =>
  await one(
    "SELECT a.*,m.storage_key,m.width image_width,m.height image_height FROM about_content a LEFT JOIN media_assets m ON m.id=a.image_asset_id WHERE a.id=1",
  );
export const contact = async () => {
  const content = await one("SELECT * FROM contact_content WHERE id=1");
  const links = await all(
    "SELECT name,url FROM contact_links ORDER BY sort_order,id",
  );
  for (const [key, name] of [
    ["instagram_url", "Instagram"],
    ["facebook_url", "Facebook"],
    ["tiktok_url", "TikTok"],
  ])
    if (content[key] && !links.some((link) => link.url === content[key]))
      links.push({ name, url: content[key] });
  return { ...content, links };
};
export const gallery = async (admin = false) =>
  await all(
    `SELECT g.*,m.storage_key,m.width image_width,m.height image_height FROM gallery_items g JOIN media_assets m ON m.id=g.image_asset_id ${admin ? "" : "WHERE g.is_published=1"} ORDER BY g.sort_order,g.id`,
  );
export const rupiah = (v) =>
  v == null
    ? "Harga belum diisi"
    : "Rp" + new Intl.NumberFormat("id-ID").format(v);
export function whatsapp(c, product = null) {
  if (!c.whatsapp) return "/contact";
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const message = product
    ? `Halo TractorPart, apakah produk ${product.name} tersedia? ${base}/products/${product.slug}`
    : "Halo TractorPart, saya ingin mengecek ketersediaan suku cadang. Apakah produk yang saya butuhkan tersedia?";
  return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(message)}`;
}
