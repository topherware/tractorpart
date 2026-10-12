import { db, cloud, one } from "../lib/db.js";
import { checkBucket } from "../lib/storage.js";
try {
  if (!cloud)
    throw new Error(
      "Isi DATABASE_URL, SUPABASE_URL dan SUPABASE_SECRET_KEY terlebih dahulu.",
    );
  const version = await one(
    "SELECT version FROM schema_migrations WHERE version=1",
  );
  if (!version) throw new Error("Jalankan migrasi Supabase dahulu.");
  await one("SELECT count(*) n FROM products");
  await one("SELECT count(*) n FROM sessions");
  await checkBucket();
  console.log(
    "PostgreSQL terhubung, skema tersedia, Storage terhubung dan bucket PRIVATE.",
  );
} catch (error) {
  console.error(
    error.code === "STORAGE_ERROR"
      ? error.message
      : "Pemeriksaan gagal. Periksa env, TLS, migrasi dan bucket sesuai docs/DEPLOYMENT.md.",
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
