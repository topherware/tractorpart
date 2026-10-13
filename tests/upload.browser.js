import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { chromium } from "@playwright/test";
const output = path.resolve("test-output", "upload-" + Date.now());
process.env.DATA_DIR = path.join(output, "data");
process.env.NODE_ENV = "test";
const { app } = await import("../server.js");
const { db, one, insert, now } = await import("../lib/db.js");
const { createAdmin } = await import("../lib/auth.js");
const password = randomBytes(24).toString("hex");
await createAdmin("upload@example.test", password);
insert("categories", {
  name: "Upload Test",
  normalized_name: "upload test",
  slug: "upload-test",
  created_at: now(),
  updated_at: now(),
});
const server = app.listen(0, "127.0.0.1");
let uploadBytes = 0;
server.on("request", (request) => {
  if (request.method === "POST" && request.url === "/api/admin/products")
    uploadBytes = Number(request.headers["content-length"]);
});
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
process.env.BASE_URL = base;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage();
  await page.goto(base + "/admin/login");
  await page.getByLabel("Email").fill("upload@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL(base + "/admin"),
    page.getByRole("button", { name: "Masuk", exact: true }).click(),
  ]);
  await page.goto(base + "/admin/products/new");
  const original = await sharp(randomBytes(2000 * 800 * 3), {
    raw: { width: 2000, height: 800, channels: 3 },
  })
    .png()
    .toBuffer();
  assert.ok(
    original.length > 3 * 1024 * 1024 && original.length < 5 * 1024 * 1024,
  );
  await page.locator("#name").fill("Large Photo Draft");
  await page
    .locator("[name=image]")
    .setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: original,
    });
  await page.getByRole("button", { name: "Gunakan Foto", exact: true }).click();
  await Promise.all([
    page.waitForURL(base + "/admin/products"),
    page.locator("[data-publication=draft]").click(),
  ]);
  const bytes = uploadBytes;
  assert.ok(
    bytes > 0 && bytes < 3 * 1024 * 1024,
    `Multipart ${bytes} bytes must fit Vercel limit.`,
  );
  const product = one("SELECT * FROM products WHERE name='Large Photo Draft'");
  const asset = one(
    "SELECT * FROM media_assets WHERE id=?",
    product.image_asset_id,
  );
  assert.equal(asset.mime_type, "image/webp");
  assert.equal(asset.width, 800);
  assert.equal(asset.height, 800);
  assert.equal((await fetch(base + "/media/" + asset.id)).status, 404);
  await page.goto(base + "/admin/products/new");
  await page.locator("#name").fill("Too Large");
  await page
    .locator("[name=image]")
    .setInputFiles({
      name: "oversized.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
  assert.match(
    await page.locator("[data-error=image]").textContent(),
    /maksimal 5 MB/,
  );
  assert.equal(one("SELECT count(*) n FROM products").n, 1);
  const result = {
    status: "passed",
    original_bytes: original.length,
    multipart_bytes: bytes,
    stored_bytes: asset.size_bytes,
    width: asset.width,
  };
  await fs.writeFile(
    path.join(output, "report.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    "PASS browser photo compression, Vercel payload limit, oversized input and draft privacy:",
    JSON.stringify(result),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  db.close();
}
