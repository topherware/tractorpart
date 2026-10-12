import fs from "node:fs/promises";
import path from "node:path";
import { cloud, dataDir } from "./db.js";

const bucket = process.env.SUPABASE_STORAGE_BUCKET || "tractorpart-media";
if (cloud) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    throw new Error(
      "SUPABASE_URL dan SUPABASE_SECRET_KEY wajib untuk foto permanen.",
    );
  if (new URL(process.env.SUPABASE_URL).protocol !== "https:")
    throw new Error("SUPABASE_URL harus HTTPS.");
  if (!/^[a-z0-9-]+$/.test(bucket)) throw new Error("Nama bucket tidak valid.");
}
export function storageHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY;
  return {
    apikey: key,
    ...(key?.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
  };
}
export async function storageRequest(endpoint, options = {}) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1${endpoint}`,
    {
      ...options,
      headers: { ...storageHeaders(), ...options.headers },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) {
    const error = new Error(`Supabase Storage gagal (${response.status}).`);
    error.code = "STORAGE_ERROR";
    throw error;
  }
  return response;
}
function safeKey(key) {
  if (!/^[a-f0-9-]+\.webp$/.test(key))
    throw new Error("Kunci foto tidak valid.");
  return key;
}
export async function putPhoto(key, buffer) {
  safeKey(key);
  if (!cloud)
    return fs.writeFile(path.join(dataDir, "uploads", key), buffer, {
      flag: "wx",
    });
  await storageRequest(`/object/${bucket}/${key}`, {
    method: "POST",
    headers: { "Content-Type": "image/webp", "x-upsert": "false" },
    body: buffer,
  });
}
export async function getPhoto(key) {
  safeKey(key);
  if (!cloud) return fs.readFile(path.join(dataDir, "uploads", key));
  return Buffer.from(
    await (
      await storageRequest(`/object/authenticated/${bucket}/${key}`)
    ).arrayBuffer(),
  );
}
export async function removePhoto(key) {
  safeKey(key);
  if (!cloud)
    return fs.unlink(path.join(dataDir, "uploads", key)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  await storageRequest(`/object/${bucket}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
}
export async function checkBucket() {
  const info = await (await storageRequest(`/bucket/${bucket}`)).json();
  if (info.public)
    throw new Error("Bucket foto harus PRIVATE agar draft terlindungi.");
  return info;
}
