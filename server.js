import express from "express";
import webAssets from "./web-assets.json" with { type: "json" };
import { adminPreviewData } from "./lib/admin-preview.js";
import helmet from "helmet";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  db,
  cloud,
  dataDir,
  one,
  all,
  run,
  insert,
  update,
  transaction,
  now,
} from "./lib/db.js";
import {
  sessionMiddleware,
  startSession,
  adminOnly,
  csrfCheck,
  loginRateLimit,
  verifyPassword,
  hashToken,
  passwordHash,
} from "./lib/auth.js";
import {
  ValidationError,
  text,
  length,
  slugify,
  normalizePhone,
  validHttps,
  productInput,
} from "./lib/validation.js";
import { storePhoto, cleanupAsset, cleanupOrphans } from "./lib/media.js";
import {
  productSelect,
  publicCategories,
  catalog,
  about,
  contact,
  gallery,
  rupiah,
  whatsapp,
} from "./lib/catalog.js";
import { getPhoto } from "./lib/storage.js";
const root = path.dirname(fileURLToPath(import.meta.url));
export const app = express();
app.locals.webAssets = webAssets;
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  if (
    !process.env.BASE_URL ||
    new URL(process.env.BASE_URL).protocol !== "https:"
  )
    throw new Error("BASE_URL HTTPS wajib pada produksi.");
}
app.param("id", (req, res, next, value) => {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id) || id > 2147483647)
    return res.sendStatus(404);
  next();
});
if (process.env.VERCEL || process.env.TRUST_PROXY === "1")
  app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(root, "views"));
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "blob:", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    strictTransportSecurity:
      process.env.NODE_ENV === "production" ? undefined : false,
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use((req, res, next) => {
  res.locals.csrf = "";
  res.locals.adminEmail = "";
  res.locals.contact = {
    whatsapp: "",
    phone: "",
    email: "",
    address: "",
    opening_hours: "",
    maps_url: "",
    links: [],
  };
  res.locals.rupiah = rupiah;
  res.locals.whatsapp = whatsapp;
  res.locals.currentPath = req.path;
  res.locals.baseUrl = (
    process.env.BASE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  res.locals.demo = false;
  next();
});
app.use(sessionMiddleware);
app.use("/static", express.static(path.join(root, "public"), { maxAge: "1d" }));
app.use(async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.locals.rupiah = rupiah;
  res.locals.whatsapp = whatsapp;
  res.locals.contact = await contact();
  res.locals.currentPath = req.path;
  res.locals.baseUrl = (
    process.env.BASE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  res.locals.demo = !cloud && fs.existsSync(path.join(dataDir, "DEMO"));
  res.locals.pageUrl = (page) => {
    const q = new URLSearchParams(req.query);
    q.set("page", page);
    return req.path + "?" + q.toString();
  };
  next();
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 25, fieldSize: 12000 },
}).single("image");
const render = (req, res, page, title, data = {}) => {
  const { page: catalogPage, ...rest } = data;
  return res.render("layout", {
    page,
    title,
    catalogPage,
    description:
      data.description ||
      "Katalog suku cadang TractorPart. Lihat produk, harga dan ketersediaan, lalu hubungi toko untuk memastikan stok produk.",
    ...rest,
  });
};
app.get("/", async (req, res) =>
  render(req, res, "home", "Suku Cadang Andal untuk Mesin Anda", {
    products: (await catalog({}, false, 8)).items,
    about: await about(),
    gallery: await gallery(),
  }),
);
app.get("/products", async (req, res) =>
  render(req, res, "products", "Katalog Produk", {
    ...(await catalog(req.query)),
    categories: await publicCategories(),
  }),
);
app.get("/products/:slug", async (req, res) => {
  const product = await one(
    `${productSelect} WHERE p.slug=? AND p.publication_status='published'`,
    req.params.slug,
  );
  if (!product)
    return res.status(404).render("layout", {
      page: "error",
      title: "Produk tidak ditemukan",
      description: "Produk tidak tersedia.",
      code: 404,
      message: "Produk tidak ditemukan atau belum diterbitkan.",
    });
  render(req, res, "detail", product.name, {
    product,
    description: product.description.slice(0, 160),
    related: await all(
      `${productSelect} WHERE p.category_id=? AND p.id<>? AND p.publication_status='published' ORDER BY p.published_at DESC,p.id DESC LIMIT 4`,
      product.category_id,
      product.id,
    ),
  });
});
app.get("/about", (req, res) => res.redirect(301, "/#tentang"));
app.get("/gallery", (req, res) => res.redirect(301, "/#galeri"));
app.get("/contact", (req, res) => res.redirect(301, "/#kontak"));
app.get("/api/products", async (req, res) =>
  res.json(await catalog(req.query)),
);
app.get("/api/products/:slug", async (req, res) => {
  const p = await one(
    `${productSelect} WHERE p.slug=? AND p.publication_status='published'`,
    req.params.slug,
  );
  p ? res.json(p) : res.status(404).json({ error: "Produk tidak ditemukan." });
});
app.get("/api/categories", async (req, res) =>
  res.json(await publicCategories()),
);
app.get("/api/content", async (req, res) =>
  res.json({
    about: await about(),
    contact: await contact(),
    gallery: await gallery(),
  }),
);
app.get("/media/:id", async (req, res) => {
  const id = Number(req.params.id),
    asset = await one("SELECT * FROM media_assets WHERE id=?", id);
  const published = await one(
    "SELECT id FROM products WHERE image_asset_id=? AND publication_status='published' UNION ALL SELECT id FROM about_content WHERE image_asset_id=? UNION ALL SELECT id FROM gallery_items WHERE image_asset_id=? AND is_published=1 LIMIT 1",
    id,
    id,
    id,
  );
  if (!asset || (!published && req.session?.role !== "admin"))
    return res.sendStatus(404);
  res.type("webp").send(await getPhoto(asset.storage_key));
});
app.get("/robots.txt", (req, res) =>
  res
    .type("text/plain")
    .send(
      `User-agent: *\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${res.locals.baseUrl}/sitemap.xml\n`,
    ),
);
app.get("/sitemap.xml", async (req, res) => {
  const urls = [
    "/",
    "/products",
    ...(
      await all(
        "SELECT slug FROM products WHERE publication_status='published'",
      )
    ).map((p) => "/products/" + p.slug),
  ];
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${res.locals.baseUrl.replaceAll("&", "&amp;")}${u}</loc></url>`).join("")}</urlset>`,
    );
});
app.use((req, res, next) => {
  res.locals.adminPreview = false;
  res.locals.adminPreviewAvailable = process.env.NODE_ENV !== "production";
  res.locals.adminPath = (url) =>
    res.locals.adminPreview
      ? url.replace(/^\/admin(?=\/|$)/, "/admin/preview")
      : url;
  next();
});
app.get("/admin/login", async (req, res) => {
  if (req.session?.role === "admin") return res.redirect("/admin");
  if (!req.session) await startSession(req, res);
  render(req, res, "login", "Login Admin");
});
app.get(
  [
    "/admin/preview",
    "/admin/preview/products",
    "/admin/preview/categories",
    "/admin/preview/about",
    "/admin/preview/gallery",
    "/admin/preview/contact",
    "/admin/preview/products/new",
    "/admin/preview/products/:id/edit",
  ],
  (req, res, next) => {
    if (!res.locals.adminPreviewAvailable) return next();
    const preview = adminPreviewData(
      req.path.replace(/^\/admin\/preview\/?/, ""),
    );
    if (!preview) return next();
    res.locals.adminPreview = true;
    res.locals.adminEmail = "Mode preview";
    res.locals.adminIdentity = { name: "Preview Admin", initials: "PA" };
    res.locals.demo = false;
    render(req, res, preview.page, preview.title, preview.data);
  },
);
app.post("/api/preview/logout", async (req, res, next) => {
  if (!res.locals.adminPreviewAvailable)
    return res.status(404).json({ error: "Preview tidak tersedia." });
  const logout = async () => {
    if (req.cookieToken)
      await run(
        "DELETE FROM sessions WHERE token_hash=?",
        hashToken(req.cookieToken),
      );
    res.clearCookie("tp_session", { path: "/" });
    res.json({ redirect: "/admin/login" });
  };
  if (req.session) {
    let allowed = false;
    csrfCheck(req, res, () => {
      allowed = true;
    });
    if (!allowed) return;
  }
  await logout();
});
const dummyHash = passwordHash(randomBytes(32).toString("hex"));
app.post("/api/login", csrfCheck, loginRateLimit, async (req, res) => {
  const email = text(req.body.email).toLowerCase(),
    password = String(req.body.password || "");
  if (password.length > 1024)
    return res.status(401).json({ error: "Email atau password tidak sesuai." });
  const admin = await one("SELECT * FROM admins WHERE email=?", email);
  const valid = verifyPassword(password, admin?.password_hash || dummyHash);
  if (!valid || !admin)
    return res.status(401).json({ error: "Email atau password tidak sesuai." });
  if (admin.role !== "admin")
    return res.status(403).json({ error: "Akses Admin diperlukan." });
  await run("DELETE FROM login_attempts WHERE key=?", req.loginKey);
  await startSession(req, res, admin.id);
  res.json({ redirect: "/admin" });
});
app.use("/admin", adminOnly);
app.use("/api/admin", adminOnly);
app.use("/api/admin", (req, res, next) => {
  if (req.method === "GET") return next();
  csrfCheck(req, res, next);
});
app.post("/api/admin/logout", async (req, res) => {
  await run(
    "DELETE FROM sessions WHERE token_hash=?",
    hashToken(req.cookieToken),
  );
  res.clearCookie("tp_session", { path: "/" });
  res.json({ redirect: "/admin/login" });
});
app.get("/admin", async (req, res) => {
  const stats = {
    total: (await one("SELECT count(*) n FROM products")).n,
    published: (
      await one(
        "SELECT count(*) n FROM products WHERE publication_status='published'",
      )
    ).n,
    available: (
      await one(
        "SELECT count(*) n FROM products WHERE publication_status='published' AND availability='available'",
      )
    ).n,
    unavailable: (
      await one(
        "SELECT count(*) n FROM products WHERE publication_status='published' AND availability='unavailable'",
      )
    ).n,
    categories: (await one("SELECT count(*) n FROM categories")).n,
    gallery: (await one("SELECT count(*) n FROM gallery_items")).n,
  };
  render(req, res, "admin-dashboard", "Dashboard", {
    stats,
    products: await all(
      `${productSelect} ORDER BY p.updated_at DESC,p.id DESC LIMIT 5`,
    ),
  });
});
const adminCategories = async () =>
  await all(
    "SELECT c.*,(SELECT count(*) FROM products p WHERE p.category_id=c.id) product_count FROM categories c ORDER BY c.name",
  );
app.get("/admin/products", async (req, res) =>
  render(req, res, "admin-products", "Produk", {
    ...(await catalog(req.query, true)),
    categories: await adminCategories(),
  }),
);
app.get("/admin/products/new", async (req, res) =>
  render(req, res, "admin-product", "Tambah Produk", {
    product: {
      name: "",
      price_idr: "",
      description: "",
      availability: "available",
      publication_status: "draft",
    },
    categories: await adminCategories(),
  }),
);
app.get("/admin/products/:id/edit", async (req, res) => {
  const p = await one(`${productSelect} WHERE p.id=?`, Number(req.params.id));
  if (!p)
    return res.status(404).render("layout", {
      page: "error",
      title: "Produk tidak ditemukan",
      description: "",
      code: 404,
      message: "Produk tidak ditemukan.",
    });
  render(req, res, "admin-product", "Edit Produk", {
    product: p,
    categories: await adminCategories(),
  });
});
app.get("/admin/categories", async (req, res) =>
  render(req, res, "admin-categories", "Kategori", {
    categories: await adminCategories(),
  }),
);
app.get("/admin/about", async (req, res) =>
  render(req, res, "admin-about", "Tentang Toko", { about: await about() }),
);
app.get("/admin/gallery", async (req, res) =>
  render(req, res, "admin-gallery", "Galeri", { gallery: await gallery(true) }),
);
app.get("/admin/contact", (req, res) =>
  render(req, res, "admin-contact", "Kontak"),
);
app.get("/api/admin/products", async (req, res) =>
  res.json(await catalog(req.query, true)),
);
app.get("/api/admin/categories", async (req, res) =>
  res.json(await adminCategories()),
);
app.get("/api/admin/gallery", async (req, res) =>
  res.json(await gallery(true)),
);
async function uniqueSlug(table, name) {
  const base = slugify(name);
  let slug = base,
    n = 2;
  while (await one(`SELECT id FROM ${table} WHERE slug=?`, slug))
    slug = base + "-" + n++;
  return slug;
}
app.post("/api/admin/categories", async (req, res) => {
  const errors = {},
    name = text(req.body.name).replace(/\s+/g, " ");
  length(errors, "name", name, 2, 80, "Nama kategori");
  const normalized_name = name.toLowerCase();
  if (
    await one(
      "SELECT id FROM categories WHERE normalized_name=?",
      normalized_name,
    )
  )
    errors.name = "Nama kategori sudah digunakan.";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const id = await insert("categories", {
    name,
    normalized_name,
    slug: await uniqueSlug("categories", name),
    created_at: now(),
    updated_at: now(),
  });
  res.status(201).json(await one("SELECT * FROM categories WHERE id=?", id));
});
app.put("/api/admin/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!(await one("SELECT id FROM categories WHERE id=?", id)))
    return res.sendStatus(404);
  const errors = {},
    name = text(req.body.name).replace(/\s+/g, " ");
  length(errors, "name", name, 2, 80, "Nama kategori");
  const normalized_name = name.toLowerCase();
  if (
    await one(
      "SELECT id FROM categories WHERE normalized_name=? AND id<>?",
      normalized_name,
      id,
    )
  )
    errors.name = "Nama kategori sudah digunakan.";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  await update("categories", id, { name, normalized_name, updated_at: now() });
  res.json({ ok: true });
});
app.delete("/api/admin/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (await one("SELECT id FROM products WHERE category_id=?", id))
    return res.status(409).json({
      error:
        "Kategori masih digunakan oleh produk. Pindahkan kategori produk terlebih dahulu.",
    });
  if (!(await run("DELETE FROM categories WHERE id=?", id)).changes)
    return res.sendStatus(404);
  res.json({ ok: true });
});
async function saveProduct(req, res) {
  const id = req.params.id ? Number(req.params.id) : null,
    existing = id ? await one("SELECT * FROM products WHERE id=?", id) : null;
  if (id && !existing) return res.sendStatus(404);
  let newAsset = null;
  try {
    newAsset = await storePhoto(req.file);
    const imageId = newAsset || existing?.image_asset_id || null;
    const validCategory = await one(
      "SELECT id FROM categories WHERE id=?",
      Number(req.body.category_id) || 0,
    );
    const values = productInput(
      req.body,
      existing,
      (c) => c === validCategory?.id,
      imageId,
    );
    const published = values.publication_status === "published";
    const data = {
      ...values,
      image_asset_id: imageId,
      slug: existing?.slug || null,
      published_at: existing?.published_at || (published ? now() : null),
      updated_at: now(),
    };
    const result = await transaction(async () => {
      if (published && !data.slug) {
        if (cloud) await one("SELECT pg_advisory_xact_lock(74832102)");
        data.slug = await uniqueSlug("products", values.name);
      }
      if (id) {
        await update("products", id, data);
        return id;
      }
      return await insert("products", { ...data, created_at: now() });
    });
    if (newAsset && existing?.image_asset_id)
      await cleanupAsset(existing.image_asset_id).catch(() => {});
    res.json({
      ok: true,
      id: result,
      redirect: "/admin/products",
      slug: data.slug,
    });
  } catch (e) {
    if (newAsset) await cleanupAsset(newAsset).catch(() => {});
    throw e;
  }
}
app.post("/api/admin/products", upload, saveProduct);
app.put("/api/admin/products/:id", upload, saveProduct);
app.delete("/api/admin/products/:id", async (req, res) => {
  const p = await one(
    "SELECT * FROM products WHERE id=?",
    Number(req.params.id),
  );
  if (!p) return res.sendStatus(404);
  await run("DELETE FROM products WHERE id=?", p.id);
  await cleanupAsset(p.image_asset_id).catch(() => {});
  res.json({ ok: true });
});
app.put("/api/admin/about", upload, async (req, res) => {
  const errors = {},
    title = text(req.body.title),
    home_summary = text(req.body.home_summary),
    description = text(req.body.description),
    old = await about(),
    image_alt =
      text(req.body.image_alt) || old.image_alt || "Foto toko TractorPart";
  length(errors, "title", title, 3, 120, "Judul");
  length(errors, "home_summary", home_summary, 20, 350, "Ringkasan Home");
  length(errors, "description", description, 20, 10000, "Deskripsi");
  if ((req.file || old.image_asset_id) && !image_alt)
    errors.image_alt = "Alt text wajib jika ada foto.";
  if (image_alt.length > 300)
    errors.image_alt = "Alt text maksimal 300 karakter.";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  let asset;
  try {
    asset = await storePhoto(req.file);
    await update("about_content", 1, {
      title,
      home_summary,
      description,
      image_alt,
      image_asset_id: asset || old.image_asset_id,
      updated_at: now(),
    });
  } catch (e) {
    if (asset) await cleanupAsset(asset).catch(() => {});
    throw e;
  }
  if (asset) await cleanupAsset(old.image_asset_id).catch(() => {});
  res.json({ ok: true });
});
app.put("/api/admin/contact", async (req, res) => {
  const errors = {},
    values = {};
  for (const key of ["whatsapp", "phone"]) {
    const p = text(req.body[key]);
    values[key] = p ? normalizePhone(p) : "";
    if (p && !values[key])
      errors[key] = "Gunakan nomor Indonesia format 08, 62, atau +62.";
  }
  if (!text(req.body.whatsapp))
    errors.whatsapp = "WhatsApp wajib untuk konfigurasi toko.";
  values.email = text(req.body.email);
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Format email tidak valid.";
  for (const [key, max, label] of [
    ["address", 1000, "Alamat"],
    ["opening_hours", 500, "Jam operasional"],
  ]) {
    values[key] = text(req.body[key]);
    length(errors, key, values[key], 1, max, label);
  }
  for (const key of [
    "maps_url",
    "instagram_url",
    "facebook_url",
    "tiktok_url",
  ]) {
    values[key] = text(req.body[key]);
    if (values[key] && (!validHttps(values[key]) || values[key].length > 2048))
      errors[key] = "Masukkan URL HTTPS yang valid.";
  }
  let links;
  if (req.body.links !== undefined) {
    try {
      links = JSON.parse(req.body.links);
      if (!Array.isArray(links) || links.length > 20) throw new Error();
      links = links.map((link) => ({
        name: text(link?.name),
        url: text(link?.url),
      }));
      if (
        links.some(
          (link) =>
            !link.name ||
            link.name.length > 80 ||
            link.url.length > 2048 ||
            !validHttps(link.url),
        )
      )
        throw new Error();
    } catch {
      errors.links =
        "Isi nama platform dan URL HTTPS yang valid. Maksimal 20 tautan.";
    }
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  await transaction(async () => {
    if (links) {
      for (const key of ["instagram_url", "facebook_url", "tiktok_url"])
        values[key] = "";
      await run("DELETE FROM contact_links");
      for (const [index, link] of links.entries())
        await insert("contact_links", { ...link, sort_order: index });
    }
    await update("contact_content", 1, { ...values, updated_at: now() });
  });
  res.json({ ok: true });
});
async function saveGallery(req, res) {
  const id = req.params.id ? Number(req.params.id) : null,
    old = id ? await one("SELECT * FROM gallery_items WHERE id=?", id) : null;
  if (id && !old) return res.sendStatus(404);
  const errors = {},
    title = text(req.body.title) || old?.title || "Foto galeri",
    caption = text(req.body.caption ?? old?.caption),
    alt_text =
      text(req.body.alt_text) ||
      old?.alt_text ||
      "Foto galeri toko TractorPart";
  length(errors, "title", title, 3, 120, "Judul");
  if (caption.length > 500) errors.caption = "Caption maksimal 500 karakter.";
  length(errors, "alt_text", alt_text, 3, 300, "Alt text");
  if (!req.file && !old?.image_asset_id) errors.image = "Foto wajib diisi.";
  const publication = req.body.is_published ?? old?.is_published ?? 1;
  if (!["0", "1", 0, 1].includes(publication))
    errors.is_published = "Status publikasi tidak valid.";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  let asset = null;
  try {
    asset = await storePhoto(req.file);
    const data = {
      title,
      caption,
      alt_text,
      image_asset_id: asset || old.image_asset_id,
      is_published: Number(publication),
      updated_at: now(),
    };
    if (id) await update("gallery_items", id, data);
    else
      await insert("gallery_items", {
        ...data,
        sort_order:
          ((await one("SELECT max(sort_order) n FROM gallery_items")).n || 0) +
          1,
        created_at: now(),
      });
  } catch (e) {
    if (asset) await cleanupAsset(asset).catch(() => {});
    throw e;
  }
  if (asset && old) await cleanupAsset(old.image_asset_id).catch(() => {});
  res.json({ ok: true });
}
app.post("/api/admin/gallery", upload, saveGallery);
app.put("/api/admin/gallery/:id", upload, saveGallery);
app.post("/api/admin/gallery/:id/move", async (req, res) => {
  const id = Number(req.params.id),
    direction = req.body.direction;
  if (!["up", "down"].includes(direction))
    throw new ValidationError({ direction: "Arah tidak valid." });
  await transaction(async () => {
    const items = await all(
      "SELECT id FROM gallery_items ORDER BY sort_order,id",
    );
    const index = items.findIndex((g) => g.id === id);
    if (index < 0) return;
    const target = index + (direction === "up" ? -1 : 1);
    if (target >= 0 && target < items.length)
      [items[index], items[target]] = [items[target], items[index]];
    for (const [i, item] of items.entries())
      await update("gallery_items", item.id, {
        sort_order: i + 1,
        updated_at: now(),
      });
  });
  res.json({ ok: true });
});
app.delete("/api/admin/gallery/:id", async (req, res) => {
  const g = await one(
    "SELECT * FROM gallery_items WHERE id=?",
    Number(req.params.id),
  );
  if (!g) return res.sendStatus(404);
  await run("DELETE FROM gallery_items WHERE id=?", g.id);
  await cleanupAsset(g.image_asset_id).catch(() => {});
  res.json({ ok: true });
});
app.use((req, res) =>
  res.status(404).render("layout", {
    page: "error",
    title: "Halaman tidak ditemukan",
    description: "",
    code: 404,
    message: "Halaman yang Anda cari tidak tersedia.",
  }),
);
app.use((err, req, res, next) => {
  if (err.code === "23505")
    return res.status(422).json({
      error: "Nama atau data unik sudah digunakan. Muat ulang dan coba lagi.",
    });
  if (err.code === "23503")
    return res.status(409).json({
      error:
        "Data masih digunakan atau sudah berubah. Muat ulang dan coba lagi.",
    });
  if (err instanceof ValidationError)
    return res.status(422).json({ error: err.message, errors: err.errors });
  if (err instanceof multer.MulterError)
    return res.status(422).json({
      error: "Upload ditolak. Satu foto JPG, PNG, atau WebP maksimal 5 MB.",
      errors: { image: "Foto maksimal 5 MB. Hanya satu foto per item." },
    });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "Data terlalu besar." });
  console.error(
    JSON.stringify({
      event: "request_failed",
      method: req.method,
      path: req.path,
      code: err.code || "INTERNAL",
      time: now(),
    }),
  );
  if (req.path.startsWith("/api"))
    return res
      .status(500)
      .json({ error: "Penyimpanan gagal. Input tetap tersedia; coba lagi." });
  res.status(500).render("layout", {
    page: "error",
    title: "Terjadi kendala",
    description: "",
    code: 500,
    message: "Halaman belum dapat dimuat. Silakan coba lagi.",
  });
});
export default app;
if (
  !process.env.VERCEL &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = app.listen(Number(process.env.PORT) || 3000, () =>
    console.log(
      "TractorPart berjalan di " +
        (process.env.BASE_URL || "http://localhost:3000"),
    ),
  );
  const cleanup = setInterval(
    () => cleanupOrphans().catch(() => console.error("media_cleanup_failed")),
    3600000,
  );
  cleanup.unref();
  const backups = !cloud
    ? setInterval(
        () =>
          import("./lib/backup.js")
            .then((m) => m.createBackup())
            .catch(() => console.error("daily_backup_failed")),
        24 * 3600000,
      )
    : null;
  backups?.unref();
  const shutdown = () => {
    clearInterval(cleanup);
    if (backups) clearInterval(backups);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
