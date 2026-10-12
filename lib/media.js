import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { cloud, dataDir, one, all, insert, run, now } from "./db.js";
import { putPhoto, removePhoto } from "./storage.js";
import { ValidationError } from "./validation.js";
export async function storePhoto(file) {
  if (!file) return null;
  const fail = () => {
    throw new ValidationError({
      image: "Foto harus berupa JPG, PNG, atau WebP asli, maksimal 5 MB.",
    });
  };
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
  )
    fail();
  let meta, buffer;
  try {
    meta = await sharp(file.buffer, { limitInputPixels: 40000000 }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format) ||
      `image/${meta.format === "jpeg" ? "jpeg" : meta.format}` !==
        file.mimetype ||
      meta.pages > 1
    )
      fail();
    buffer = await sharp(file.buffer, { limitInputPixels: 40000000 })
      .rotate()
      .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    fail();
  }
  const out = await sharp(buffer).metadata(),
    key = `${randomUUID()}.webp`;
  await putPhoto(key, buffer);
  try {
    return await insert("media_assets", {
      storage_key: key,
      mime_type: "image/webp",
      size_bytes: buffer.length,
      width: out.width,
      height: out.height,
      created_at: now(),
    });
  } catch (e) {
    await removePhoto(key).catch(() => {});
    throw e;
  }
}
export async function used(id) {
  return await one(
    "SELECT id FROM products WHERE image_asset_id=? UNION ALL SELECT id FROM about_content WHERE image_asset_id=? UNION ALL SELECT id FROM gallery_items WHERE image_asset_id=? LIMIT 1",
    id,
    id,
    id,
  );
}
export async function cleanupAsset(id) {
  if (!id || (await used(id))) return;
  const asset = await one("SELECT * FROM media_assets WHERE id=?", id);
  if (!asset) return;
  await removePhoto(asset.storage_key);
  await run("DELETE FROM media_assets WHERE id=?", id);
}
export async function cleanupOrphans(age = 24 * 3600 * 1000) {
  for (const a of await all("SELECT * FROM media_assets"))
    if (Date.parse(a.created_at) < Date.now() - age) await cleanupAsset(a.id);
  const keys = new Set(
    (await all("SELECT storage_key FROM media_assets")).map(
      (a) => a.storage_key,
    ),
  );
  if (!cloud)
    for (const key of await fs.readdir(path.join(dataDir, "uploads"))) {
      if (!/^[a-f0-9-]+\.webp$/.test(key) || keys.has(key)) continue;
      const p = path.join(dataDir, "uploads", key);
      const s = await fs.stat(p);
      if (s.mtimeMs < Date.now() - age) await fs.unlink(p);
    }
  await run("DELETE FROM sessions WHERE expires_at<?", Date.now());
  await run("DELETE FROM login_attempts WHERE reset_at<?", Date.now());
}
