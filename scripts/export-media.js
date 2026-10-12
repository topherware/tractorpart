import fs from "node:fs/promises";
import path from "node:path";
import { db, all, cloud } from "../lib/db.js";
import { getPhoto, checkBucket } from "../lib/storage.js";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const root = path.resolve(process.env.BACKUP_DIR || "./backups");
const staging = path.join(root, `supabase-media-${stamp}.partial`);
const destination = staging.replace(/\.partial$/, "");
try {
  if (!cloud)
    throw new Error(
      "Perintah ini memerlukan Supabase. Gunakan npm run backup untuk SQLite lokal.",
    );
  await checkBucket();
  await fs.mkdir(staging, { recursive: true });
  const assets = await all("SELECT * FROM media_assets ORDER BY id");
  for (const asset of assets) {
    const buffer = await getPhoto(asset.storage_key);
    if (buffer.length !== asset.size_bytes)
      throw new Error("Ukuran foto tidak sesuai.");
    await fs.writeFile(path.join(staging, asset.storage_key), buffer, {
      flag: "wx",
    });
  }
  await fs.writeFile(
    path.join(staging, "manifest.json"),
    JSON.stringify(
      {
        version: 1,
        created_at: new Date().toISOString(),
        bucket: process.env.SUPABASE_STORAGE_BUCKET || "tractorpart-media",
        assets,
      },
      null,
      2,
    ),
  );
  await fs.rename(staging, destination);
  console.log(
    `Salinan ${assets.length} foto terverifikasi: ${destination}. Database wajib dibackup terpisah.`,
  );
} catch {
  console.error(
    "Backup foto gagal; folder .partial bukan backup lengkap. Periksa koneksi dan jalankan ulang saat admin tidak mengubah foto.",
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
