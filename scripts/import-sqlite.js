import { DatabaseSync } from "node:sqlite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  db,
  cloud,
  one,
  run,
  insert,
  transaction,
  dataDir,
} from "../lib/db.js";
import { checkBucket, putPhoto, removePhoto } from "../lib/storage.js";

const tables = [
  "admins",
  "media_assets",
  "categories",
  "products",
  "gallery_items",
  "contact_links",
];
export async function importSqlite(sourceDir = dataDir, includeDemo = false) {
  const uploaded = [];
  let source;
  try {
    if (!cloud) throw new Error("Impor memerlukan target PostgreSQL.");
    await checkBucket();
    source = new DatabaseSync(path.join(sourceDir, "tractorpart.sqlite"), {
      readOnly: true,
    });
    if (source.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("Integritas SQLite gagal.");
    const products = source
      .prepare("SELECT * FROM products")
      .all()
      .filter((p) => includeDemo || !p.name.endsWith("[Dummy]"));
    const gallery = source.prepare("SELECT * FROM gallery_items").all();
    const about = source
      .prepare("SELECT * FROM about_content WHERE id=1")
      .get();
    const contact = source
      .prepare("SELECT * FROM contact_content WHERE id=1")
      .get();
    const references = new Set(
      [...products, ...gallery, about]
        .map((row) => row?.image_asset_id)
        .filter(Boolean),
    );
    const assets = source
      .prepare("SELECT * FROM media_assets")
      .all()
      .filter((a) => references.has(a.id));
    await transaction(async () => {
      // Serializes simultaneous imports; existing target content is never overwritten.
      await one("SELECT pg_advisory_xact_lock(74832101)");
      for (const table of tables)
        if ((await one(`SELECT count(*) n FROM ${table}`)).n)
          throw new Error("Target harus kosong. Impor dibatalkan.");
      for (const table of ["about_content", "contact_content"]) {
        const row = await one(`SELECT * FROM ${table} WHERE id=1`);
        if (
          !row ||
          (table === "about_content"
            ? !row.home_summary.startsWith("[Placeholder]") ||
              row.image_asset_id
            : !row.address.startsWith("[Placeholder]") || row.whatsapp)
        )
          throw new Error("Target sudah memiliki konten. Impor dibatalkan.");
      }
      for (const asset of assets) {
        const buffer = await fs.readFile(
          path.join(sourceDir, "uploads", asset.storage_key),
        );
        if (buffer.length !== asset.size_bytes)
          throw new Error("Ukuran foto sumber tidak sesuai.");
        await putPhoto(asset.storage_key, buffer);
        uploaded.push(asset.storage_key);
      }
      const rows = {
        admins: source.prepare("SELECT * FROM admins").all(),
        media_assets: assets,
        categories: source.prepare("SELECT * FROM categories").all(),
        products,
        gallery_items: gallery,
        contact_links: source.prepare("SELECT * FROM contact_links").all(),
      };
      for (const table of tables)
        for (const row of rows[table]) await insert(table, row);
      for (const [table, row] of [
        ["about_content", about],
        ["contact_content", contact],
      ]) {
        await run(`DELETE FROM ${table}`);
        await insert(table, row);
      }
      for (const table of tables)
        await one(
          `SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT max(id) FROM ${table}),1), EXISTS(SELECT 1 FROM ${table}))`,
        );
    });
    return { products: products.length, photos: assets.length, includeDemo };
  } catch (error) {
    for (const key of uploaded)
      await removePhoto(key).catch(() =>
        console.error("import_photo_cleanup_failed"),
      );
    throw error;
  } finally {
    source?.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (!process.argv.includes("--confirm"))
      throw new Error("Konfirmasi diperlukan.");
    const result = await importSqlite(
      dataDir,
      process.argv.includes("--include-demo"),
    );
    console.log(
      `Impor selesai: ${result.products} produk, ${result.photos} foto. Akun sumber disalin; sesi tidak disalin. Dummy ${result.includeDemo ? "disertakan" : "dikecualikan"}.`,
    );
  } catch {
    console.error(
      "Impor gagal; sumber lokal tetap utuh. Gunakan --confirm dan periksa target kosong, foto, migrasi serta env.",
    );
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
