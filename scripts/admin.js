import { createAdmin } from "../lib/auth.js";
import { db } from "../lib/db.js";
try {
  const email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error(
      "Isi ADMIN_EMAIL dan ADMIN_PASSWORD di .env lokal. Password minimal 12 karakter.",
    );
  await createAdmin(email, password);
  console.log(
    "Akun admin dibuat. Hapus ADMIN_PASSWORD dari .env setelah provisioning.",
  );
} catch (e) {
  console.error(
    e.code === "23505" || e.code?.includes("CONSTRAINT")
      ? "Email sudah terdaftar."
      : "Pembuatan admin gagal. Periksa konfigurasi dan database.",
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
