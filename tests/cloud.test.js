import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";

// Actual PostgreSQL engine, isolated from the user's database. Storage HTTP is simulated.
process.env.DATABASE_URL = "postgresql://postgres:test@localhost:6543/postgres";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
process.env.NODE_ENV = "test";
const pg = new PGlite();
await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
const migration = await fs.readFile(
  new URL("../supabase/migrations/001_tractorpart.sql", import.meta.url),
  "utf8",
);
await pg.exec(migration);
await pg.exec(migration); // Idempotent migration.
const { db, one, all, insert, run, transaction, now, postgresSql } =
  await import("../lib/db.js");
const originalPool = db.pool;
let tail = Promise.resolve();
async function lock() {
  const previous = tail;
  let release;
  tail = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  return release;
}
const query = async (sql, params = []) => {
  const result = await pg.query(sql, params);
  return { rows: result.rows, rowCount: result.affectedRows };
};
db.pool = {
  query: async (...args) => {
    const release = await lock();
    try {
      return await query(...args);
    } finally {
      release();
    }
  },
  connect: async () => {
    const release = await lock();
    return { query, release };
  },
};
const photos = new Map();
const actualFetch = globalThis.fetch;
let storageFailure = false;
globalThis.fetch = async (url, options = {}) => {
  if (!String(url).startsWith(process.env.SUPABASE_URL))
    return actualFetch(url, options);
  assert.equal(options.headers.apikey, process.env.SUPABASE_SECRET_KEY);
  if (storageFailure) return new Response("{}", { status: 503 });
  const route = new URL(url).pathname;
  if (route.includes("/bucket/"))
    return Response.json({ id: "tractorpart-media", public: false });
  if (options.method === "DELETE") {
    for (const key of JSON.parse(options.body).prefixes) photos.delete(key);
    return Response.json({});
  }
  const key = route.split("/").at(-1);
  if (options.method === "POST") {
    if (photos.has(key)) return new Response("{}", { status: 409 });
    photos.set(key, Buffer.from(options.body));
    return Response.json({ Key: key });
  }
  return photos.has(key)
    ? new Response(photos.get(key), {
        headers: { "Content-Type": "image/webp" },
      })
    : new Response("{}", { status: 404 });
};
const { app } = await import("../server.js");
const { createAdmin } = await import("../lib/auth.js");
const { checkBucket } = await import("../lib/storage.js");
const password = randomBytes(24).toString("hex");
await createAdmin("cloud.owner@example.test", password);
await createAdmin("viewer@example.test", password, "viewer");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
process.env.BASE_URL = base;
const photo = await sharp({
  create: { width: 120, height: 90, channels: 3, background: "#d90b17" },
})
  .png()
  .toBuffer();
class Client {
  cookie = "";
  csrf = "";
  async get(url) {
    const response = await fetch(base + url, {
      headers: { Cookie: this.cookie },
      redirect: "manual",
    });
    if (response.headers.get("set-cookie"))
      this.cookie = response.headers.get("set-cookie").split(";")[0];
    const html = await response.text();
    this.csrf =
      html.match(/name="csrf-token" content="([^"]*)"/)?.[1] || this.csrf;
    return { response, html };
  }
  async mutate(url, method, body, extra = {}) {
    const form = body instanceof FormData;
    const response = await fetch(base + url, {
      method,
      headers: {
        Cookie: this.cookie,
        "X-CSRF-Token": this.csrf,
        ...(!form ? { "Content-Type": "application/json" } : {}),
        ...extra,
      },
      body: form ? body : JSON.stringify(body),
    });
    if (response.headers.get("set-cookie"))
      this.cookie = response.headers.get("set-cookie").split(";")[0];
    return { response, data: await response.json() };
  }
  async login(email = "cloud.owner@example.test", pass = password) {
    await this.get("/admin/login");
    const result = await this.mutate("/api/login", "POST", {
      email,
      password: pass,
    });
    if (result.response.ok) await this.get("/admin");
    return result;
  }
}
const admin = new Client();
assert.equal((await admin.login()).response.status, 200);
let category, product;
const form = (values, image = photo) => {
  const body = new FormData();
  for (const [key, value] of Object.entries(values))
    body.set(key, String(value ?? ""));
  if (image)
    body.set("image", new Blob([image], { type: "image/png" }), "test.png");
  return body;
};
const values = (extra = {}) => ({
  name: "Filter Cloud",
  price_idr: 999999999999,
  description: "Deskripsi lengkap produk cloud.",
  category_id: category.id,
  publication_status: "published",
  availability: "available",
  ...extra,
});
after(async () => {
  globalThis.fetch = actualFetch;
  await new Promise((resolve) => server.close(resolve));
  await originalPool.end();
  await pg.close();
});

test("Malformed media IDs return 404 and Supabase secret uses apikey header", async () => {
  for (const id of ["bad", "0", "-1", "99999999999999999"])
    assert.equal((await fetch(base + "/media/" + id)).status, 404);
  const { storageHeaders } = await import("../lib/storage.js");
  assert.equal(storageHeaders().Authorization, undefined);
});

test("PostgreSQL schema, private bucket, RLS and literal-safe parameters", async () => {
  assert.equal(
    postgresSql("SELECT '?' literal, ? value, 'it''s ?' quoted, ?"),
    "SELECT '?' literal, $1 value, 'it''s ?' quoted, $2",
  );
  await checkBucket();
  const tables = await all(
    "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'",
  );
  assert.equal(tables.length, 11);
  assert.ok(tables.every((t) => t.rowsecurity));
  await pg.exec("SET ROLE anon");
  await assert.rejects(pg.query("SELECT * FROM admins"), /permission denied/);
  await assert.rejects(pg.query("SELECT * FROM products"), /permission denied/);
  await pg.exec("RESET ROLE");
});
test("Cloud CRUD persists IDs, prices, case-insensitive search, filters and public HTML", async () => {
  let result = await admin.mutate("/api/admin/categories", "POST", {
    name: "Mesin Cloud",
  });
  assert.equal(result.response.status, 201);
  category = result.data;
  assert.equal(typeof category.id, "number");
  result = await admin.mutate("/api/admin/products", "POST", form(values()));
  assert.equal(result.response.status, 200);
  product = result.data;
  const data = await (await fetch(base + "/api/products?q=filter")).json();
  assert.equal(data.total, 1);
  assert.equal(data.items[0].price_idr, 999999999999);
  assert.equal(
    (await (await fetch(base + "/api/products?q=%25")).json()).total,
    0,
  );
  assert.equal(
    (await (await fetch(base + "/api/products?q=%5F")).json()).total,
    0,
  );
  const html = await (await fetch(base + "/products/" + product.slug)).text();
  assert.match(html, /Rp999\.999\.999\.999/);
  const row = await one("SELECT * FROM products WHERE id=?", product.id);
  const image = await fetch(base + "/media/" + row.image_asset_id);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("cache-control"), "no-store");
  assert.equal(
    (await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format,
    "webp",
  );
  for (const url of [
    "/",
    "/products",
    "/admin/products",
    "/admin/products/new",
    "/admin/products/" + product.id + "/edit",
    "/admin/categories",
    "/admin/about",
    "/admin/gallery",
    "/admin/contact",
  ])
    assert.equal((await admin.get(url)).response.status, 200, url);
  const contactRedirect = (await admin.get('/contact')).response;
  assert.equal(contactRedirect.status, 301);
  assert.equal(contactRedirect.headers.get('location'), '/#kontak');
  const other = new Client();
  await other.login();
  assert.match((await other.get("/admin/products")).html, /Filter Cloud/);
});
test("Draft authorization, publish, hide, replacement and stable product URL", async () => {
  const result = await admin.mutate(
    "/api/admin/products",
    "POST",
    form(values({ name: "Secret Cloud", publication_status: "draft" })),
  );
  const draft = await one("SELECT * FROM products WHERE id=?", result.data.id);
  assert.equal(
    (await fetch(base + "/media/" + draft.image_asset_id)).status,
    404,
  );
  assert.equal(
    (await admin.get("/media/" + draft.image_asset_id)).response.status,
    200,
  );
  assert.doesNotMatch(
    await (await fetch(base + "/sitemap.xml")).text(),
    /Secret/,
  );
  const previous = await one("SELECT * FROM products WHERE id=?", product.id);
  assert.equal(
    (
      await admin.mutate(
        "/api/admin/products/" + product.id,
        "PUT",
        form(values({ name: "Nama Baru Cloud", availability: "unavailable" })),
      )
    ).response.status,
    200,
  );
  const current = await one("SELECT * FROM products WHERE id=?", product.id);
  assert.equal(current.slug, previous.slug);
  assert.equal(current.published_at, previous.published_at);
  assert.equal(
    await one(
      "SELECT id FROM media_assets WHERE id=?",
      previous.image_asset_id,
    ),
    undefined,
  );
  assert.equal(
    (await fetch(base + "/media/" + previous.image_asset_id)).status,
    404,
  );
  assert.match(
    await (await fetch(base + "/products/" + product.slug)).text(),
    /Nama Baru Cloud/,
  );
  await admin.mutate(
    "/api/admin/products/" + product.id,
    "PUT",
    form(values({ publication_status: "draft" }), null),
  );
  assert.equal((await fetch(base + "/products/" + product.slug)).status, 404);
  await admin.mutate(
    "/api/admin/products/" + product.id,
    "PUT",
    form(values(), null),
  );
  assert.equal((await fetch(base + "/products/" + product.slug)).status, 200);
});
test("PostgreSQL transactions roll back, remain isolated and enforce published constraints", async () => {
  const before = (await one("SELECT count(*) n FROM categories")).n;
  await assert.rejects(
    transaction(async () => {
      await insert("categories", {
        name: "Rollback",
        normalized_name: "rollback",
        slug: "rollback",
        created_at: now(),
        updated_at: now(),
      });
      throw new Error("rollback test");
    }),
    /rollback test/,
  );
  assert.equal((await one("SELECT count(*) n FROM categories")).n, before);
  const row = await one("SELECT * FROM products WHERE id=?", product.id);
  await assert.rejects(
    run("UPDATE products SET price_idr=NULL WHERE id=?", row.id),
    /check constraint/,
  );
  assert.equal(
    (await one("SELECT price_idr FROM products WHERE id=?", row.id)).price_idr,
    999999999999,
  );
  const results = await Promise.all([
    transaction(async () => {
      await run("UPDATE contact_content SET phone='628111111111' WHERE id=1");
      return "A";
    }),
    transaction(async () => {
      await run("UPDATE contact_content SET phone='628222222222' WHERE id=1");
      return "B";
    }),
  ]);
  assert.deepEqual(results, ["A", "B"]);
  assert.equal(
    (await one("SELECT phone FROM contact_content")).phone,
    "628222222222",
  );
});
test("Failed database write and failed Storage preserve old content and clean new photos", async () => {
  const old = await one("SELECT * FROM products WHERE id=?", product.id),
    count = photos.size;
  await pg.exec(`CREATE FUNCTION reject_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Reject Cloud' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_write BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION reject_write();`);
  const failure = await admin.mutate(
    "/api/admin/products/" + product.id,
    "PUT",
    form(values({ name: "Reject Cloud" })),
  );
  assert.equal(failure.response.status, 500);
  assert.equal(photos.size, count);
  assert.equal(
    (await one("SELECT image_asset_id FROM products WHERE id=?", product.id))
      .image_asset_id,
    old.image_asset_id,
  );
  await pg.exec(
    "DROP TRIGGER reject_write ON products; DROP FUNCTION reject_write();",
  );
  storageFailure = true;
  try {
    assert.equal(
      (
        await admin.mutate(
          "/api/admin/products/" + product.id,
          "PUT",
          form(values()),
        )
      ).response.status,
      500,
    );
  } finally {
    storageFailure = false;
  }
  assert.equal(photos.size, count);
  assert.equal(
    (await fetch(base + "/media/" + old.image_asset_id)).status,
    200,
  );
});
test("Contact transactions, dynamic platform links, About and photo-only Gallery reach public pages", async () => {
  const contact = {
    whatsapp: "081234567890",
    phone: "",
    email: "owner@example.test",
    address: "Alamat cloud",
    opening_hours: "Senin Sabtu",
    maps_url: "",
    links: JSON.stringify([
      { name: "Tokopedia", url: "https://tokopedia.com/tractorpart" },
    ]),
  };
  assert.equal(
    (await admin.mutate("/api/admin/contact", "PUT", contact)).response.status,
    200,
  );
  assert.match(await (await fetch(base + "/contact")).text(), /Tokopedia/);
  assert.equal(
    (
      await admin.mutate("/api/admin/contact", "PUT", {
        ...contact,
        links: '[{"name":"Bad","url":"javascript:alert(1)"}]',
      })
    ).response.status,
    422,
  );
  assert.equal((await one("SELECT count(*) n FROM contact_links")).n, 1);
  const about = {
    title: "Tentang Cloud",
    home_summary: "Ringkasan toko cloud dari halaman admin.",
    description: "Deskripsi toko cloud lengkap dengan informasi terbaru.",
  };
  assert.equal(
    (await admin.mutate("/api/admin/about", "PUT", form(about))).response
      .status,
    200,
  );
  assert.match(await (await fetch(base + "/")).text(), /Tentang Cloud/);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await admin.mutate("/api/admin/gallery", "POST", form({}))).response
        .status,
      200,
    );
  const items = await all("SELECT * FROM gallery_items ORDER BY sort_order,id");
  await admin.mutate("/api/admin/gallery/" + items[1].id + "/move", "POST", {
    direction: "up",
  });
  let content = await (await fetch(base + "/api/content")).json();
  assert.equal(content.gallery[0].id, items[1].id);
  await admin.mutate(
    "/api/admin/gallery/" + items[1].id,
    "PUT",
    form({ is_published: 0 }, null),
  );
  assert.equal(
    (await fetch(base + "/media/" + items[1].image_asset_id)).status,
    404,
  );
  await admin.mutate("/api/admin/gallery/" + items[0].id, "DELETE", {});
  content = await (await fetch(base + "/api/content")).json();
  assert.equal(content.gallery.length, 0);
  assert.equal(
    (await admin.mutate("/api/admin/categories/" + category.id, "DELETE", {}))
      .response.status,
    409,
  );
});
test("Authentication, atomic rate limit, CSRF, role restrictions and logout persist in PostgreSQL", async () => {
  const unauthorized = await fetch(base + "/api/admin/products");
  assert.equal(unauthorized.status, 401);
  assert.equal(
    (
      await admin.mutate(
        "/api/admin/contact",
        "PUT",
        {},
        { "X-CSRF-Token": "invalid" },
      )
    ).response.status,
    403,
  );
  assert.equal(
    (
      await admin.mutate(
        "/api/admin/contact",
        "PUT",
        {},
        { Origin: "https://evil.test" },
      )
    ).response.status,
    403,
  );
  const viewer = new Client();
  assert.equal(
    (await viewer.login("viewer@example.test")).response.status,
    403,
  );
  const bad = new Client();
  await bad.get("/admin/login");
  const attempts = await Promise.all(
    Array.from({ length: 6 }, () =>
      bad.mutate("/api/login", "POST", {
        email: "unknown@example.test",
        password: "wrong",
      }),
    ),
  );
  assert.equal(attempts.filter((a) => a.response.status === 401).length, 5);
  assert.equal(attempts.filter((a) => a.response.status === 429).length, 1);
  const result = await admin.mutate("/api/admin/logout", "POST", {});
  assert.equal(result.response.status, 200);
  assert.equal((await admin.get("/admin/products")).response.status, 302);
});

test("SQLite import preserves IDs and photos, excludes dummy data, resets sequences and rejects nonempty targets", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { importSqlite } = await import("../scripts/import-sqlite.js");
  const directory = path.resolve("test-output", "import-" + Date.now());
  await fs.mkdir(path.join(directory, "uploads"), { recursive: true });
  const source = new DatabaseSync(path.join(directory, "tractorpart.sqlite"));
  source.exec(
    await fs.readFile(
      new URL("../migrations/001.sql", import.meta.url),
      "utf8",
    ),
  );
  const key = randomUUID() + ".webp";
  const image = await sharp(photo).webp().toBuffer();
  await fs.writeFile(path.join(directory, "uploads", key), image);
  source
    .prepare("INSERT INTO categories VALUES (7,?,?,?,?,?)")
    .run("Imported", "imported", "imported", now(), now());
  source
    .prepare("INSERT INTO media_assets VALUES (9,?,?,?,?,?,?)")
    .run(key, "image/webp", image.length, 120, 90, now());
  source
    .prepare(
      "INSERT INTO products(id,name,slug,price_idr,description,category_id,image_asset_id,publication_status,published_at,created_at,updated_at) VALUES (21,?,?,?,?,?,?,'published',?,?,?)",
    )
    .run(
      "Imported Product",
      "imported-product",
      125000,
      "Deskripsi produk import lengkap.",
      7,
      9,
      now(),
      now(),
      now(),
    );
  source
    .prepare(
      "INSERT INTO products(id,name,created_at,updated_at) VALUES (22,?,?,?)",
    )
    .run("Excluded [Dummy]", now(), now());
  source
    .prepare("INSERT INTO admins VALUES (4,?,?,?,?)")
    .run("imported@example.test", "test-hash", "admin", now());
  source
    .prepare("INSERT INTO sessions VALUES (?,?,?,?)")
    .run("session-source", 4, "csrf-source", Date.now() + 10000);
  // Existing production data must not be overwritten, even when import is requested twice.
  await assert.rejects(importSqlite(directory), /Target harus kosong/);
  await pg.exec(
    "TRUNCATE admins,media_assets,categories,products,gallery_items,contact_links,about_content,contact_content,sessions,login_attempts RESTART IDENTITY CASCADE",
  );
  photos.clear();
  await pg.exec(migration);
  const result = await importSqlite(directory);
  assert.deepEqual(result, { products: 1, photos: 1, includeDemo: false });
  assert.equal((await one("SELECT id FROM products")).id, 21);
  assert.equal((await one("SELECT count(*) n FROM sessions")).n, 0);
  assert.equal(photos.size, 1);
  assert.deepEqual(photos.get(key), image);
  assert.equal(
    await insert("categories", {
      name: "Next",
      normalized_name: "next",
      slug: "next",
      created_at: now(),
      updated_at: now(),
    }),
    8,
  );
  assert.equal(
    await insert("products", {
      name: "Next Draft",
      created_at: now(),
      updated_at: now(),
    }),
    22,
  );
  assert.equal(source.prepare("SELECT count(*) n FROM products").get().n, 2);
  await assert.rejects(importSqlite(directory), /Target harus kosong/);
  assert.equal(photos.size, 1);
  source.close();
});
