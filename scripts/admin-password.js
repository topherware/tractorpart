import { passwordHash } from "../lib/auth.js";
import { db, one, run, transaction } from "../lib/db.js";

try {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12 ||
    password.length > 1024 ||
    /[\r\n\0]/.test(password)
  ) {
    console.error("Isi ADMIN_EMAIL dan ADMIN_PASSWORD di .env. Password 12–1024 karakter, tanpa baris baru.");
    process.exitCode = 1;
  } else {
    const hash = passwordHash(password);
    const reset = await transaction(async () => {
      const admin = await one("SELECT id FROM admins WHERE email=? AND role='admin'", email);
      if (!admin) return false;
      const result = await run("UPDATE admins SET password_hash=? WHERE id=? AND role='admin'", hash, admin.id);
      if (result.changes !== 1) throw new Error("Reset gagal.");
      await run("DELETE FROM sessions WHERE admin_id=?", admin.id);
      return true;
    });
    if (!reset) {
      console.error("Akun admin tidak ditemukan. Reset tidak membuat akun baru.");
      process.exitCode = 1;
    } else {
      console.log("Password admin diperbarui dan sesi akun tersebut dicabut. Kosongkan ADMIN_PASSWORD di .env setelah verifikasi.");
    }
  }
} catch {
  console.error("Reset password gagal. Periksa konfigurasi dan database.");
  process.exitCode = 1;
} finally {
  await db.close();
}
