import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { transform } from "esbuild";

const styles = [
  "style.css",
  "motion.css",
  "header.css",
  "mobile-menu.css",
  "status.css",
  "sections.css",
  "catalog-controls.css",
  "photo-crop.css",
  "interaction.css",
];
const scripts = {
  public: ["interaction.js", "i18n.js", "motion.js", "app.js", "catalog-controls.js"],
  admin: [
    "interaction.js",
    "i18n.js",
    "admin-i18n.js",
    "photo-upload.js",
    "photo-crop.js",
    "app.js",
    "catalog-controls.js",
  ],
  login: ["interaction.js", "i18n.js", "app.js", "catalog-controls.js"],
};
const output = new URL("../public/bundles/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const assets = {};
async function compile(name, files, loader) {
  const sources = await Promise.all(
    files.map((file) =>
      fs.readFile(new URL("../public/" + file, import.meta.url), "utf8"),
    ),
  );
  // Motion code reads millisecond custom properties; preserve their units in CSS.
  const result = await transform(
    sources.join(loader === "js" ? "\n;\n" : "\n"),
    {
      loader,
      minifyWhitespace: true,
      minifySyntax: loader === "js",
      minifyIdentifiers: loader === "js",
      target: "es2022",
      legalComments: "none",
    },
  );
  const hash = createHash("sha256")
    .update(result.code)
    .digest("hex")
    .slice(0, 12);
  const filename = `${name}.${hash}.${loader}`;
  await fs.writeFile(new URL(filename, output), result.code);
  return `/static/bundles/${filename}`;
}
assets.css = await compile("site", styles, "css");
for (const [name, files] of Object.entries(scripts))
  assets[name] = await compile(`site-${name}`, files, "js");
await fs.writeFile(
  new URL("../web-assets.json", import.meta.url),
  JSON.stringify(assets, null, 2) + "\n",
);
// Only obsolete generated bundles in this script-owned directory are removed.
const keep = new Set(Object.values(assets).map((url) => url.split("/").at(-1)));
for (const file of await fs.readdir(output))
  if (
    /^site(?:-(?:public|admin|login))?\.[a-f0-9]{12}\.(?:css|js)$/.test(file) &&
    !keep.has(file)
  )
    await fs.unlink(new URL(file, output));
console.log(
  "CSS dan JavaScript siap: satu stylesheet dan satu script per halaman, dengan hash untuk cache.",
);
