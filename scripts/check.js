import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
let failed = false;
for (const dir of [".", "lib", "scripts", "public", "tests"]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const r = spawnSync(process.execPath, ["--check", path.join(dir, f)], {
      encoding: "utf8",
    });
    if (r.status !== 0) {
      console.error(r.stderr);
      failed = true;
    }
  }
}
for (const f of fs.readdirSync("views"))
  if (f.endsWith(".ejs"))
    try {
      ejs.compile(fs.readFileSync(path.join("views", f), "utf8"), {
        filename: path.join("views", f),
      });
    } catch (e) {
      console.error(e.message);
      failed = true;
    }
try {
  JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  const assets = JSON.parse(fs.readFileSync("web-assets.json", "utf8"));
  for (const asset of [
    ...Object.values(assets),
    "/static/images/logo.png",
    "/static/images/tractorpart-hero.webp",
    "/static/favicon.png",
  ]) {
    if (
      !asset.startsWith("/static/") ||
      !fs.existsSync(path.join("public", asset.slice(8)))
    )
      throw new Error("Aset produksi belum tersedia: " + asset);
  }
} catch (error) {
  console.error(error.message);
  failed = true;
}
console.log(
  failed ? "Pemeriksaan gagal." : "Sintaks JavaScript dan template EJS valid.",
);
process.exitCode = failed ? 1 : 0;
