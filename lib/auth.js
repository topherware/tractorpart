import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { one, run, now, insert } from "./db.js";
export const hashToken = (t) => createHash("sha256").update(t).digest("hex");
export function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, encoded) {
  const [salt, hash] = encoded.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function createAdmin(email, password, role = "admin") {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12)
    throw new Error("Email valid dan password minimal 12 karakter diperlukan.");
  return insert("admins", {
    email: email.trim().toLowerCase(),
    password_hash: passwordHash(password),
    role,
    created_at: now(),
  });
}
export function adminIdentity(email) {
  const parts = String(email || "")
    .split("@")[0]
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const name =
    parts.map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") ||
    "Administrator";
  const initials =
    parts.length > 1
      ? parts[0][0] + parts.at(-1)[0]
      : [...(parts[0] || "Admin")].slice(0, 2).join("");
  return { name, initials: initials.toUpperCase() };
}
export async function sessionMiddleware(req, res, next) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("tp_session="))
    ?.slice(11);
  req.session = cookie
    ? await one(
        "SELECT s.*, a.email, a.role FROM sessions s LEFT JOIN admins a ON a.id=s.admin_id WHERE token_hash=? AND expires_at>?",
        hashToken(cookie),
        Date.now(),
      )
    : null;
  req.cookieToken = cookie;
  res.locals.csrf = req.session?.csrf || "";
  res.locals.adminEmail = req.session?.email || "";
  res.locals.adminIdentity = adminIdentity(req.session?.email);
  next();
}
export async function startSession(req, res, adminId = null) {
  if (req.cookieToken)
    await run(
      "DELETE FROM sessions WHERE token_hash=?",
      hashToken(req.cookieToken),
    );
  const token = randomBytes(32).toString("hex"),
    csrf = randomBytes(32).toString("hex");
  await run(
    "INSERT INTO sessions VALUES (?,?,?,?)",
    hashToken(token),
    adminId,
    csrf,
    Date.now() + 8 * 3600 * 1000,
  );
  res.cookie("tp_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 3600 * 1000,
    path: "/",
  });
  req.session = { admin_id: adminId, csrf };
  res.locals.csrf = csrf;
}
export function adminOnly(req, res, next) {
  if (!req.session?.admin_id)
    return req.originalUrl.startsWith("/api/")
      ? res.status(401).json({ error: "Sesi berakhir. Silakan login kembali." })
      : res.redirect("/admin/login");
  if (req.session.role !== "admin")
    return req.originalUrl.startsWith("/api/")
      ? res.status(403).json({ error: "Akses Admin diperlukan." })
      : res.status(403).send("Akses Admin diperlukan.");
  next();
}
export function csrfCheck(req, res, next) {
  if (!req.session || req.get("X-CSRF-Token") !== req.session.csrf)
    return res
      .status(403)
      .json({
        error: "Sesi atau token keamanan tidak valid. Muat ulang halaman.",
      });
  const origin = req.get("Origin");
  const origins = [
    new URL(process.env.BASE_URL || "http://localhost:3000").origin,
  ];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (origin && !origins.includes(origin))
    return res.status(403).json({ error: "Asal permintaan tidak diizinkan." });
  next();
}
export async function loginRateLimit(req, res, next) {
  const key = hashToken(
      `${req.ip}:${String(req.body.email).trim().toLowerCase()}`,
    ),
    t = Date.now();
  const attempt = await one(
    "INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN login_attempts.reset_at<? THEN 1 ELSE login_attempts.count+1 END, reset_at=CASE WHEN login_attempts.reset_at<? THEN excluded.reset_at ELSE login_attempts.reset_at END RETURNING count",
    key,
    t + 900000,
    t,
    t,
  );
  if (attempt.count > 5) {
    res.set("Retry-After", "900");
    return res
      .status(429)
      .json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
  }
  req.loginKey = key;
  next();
}
