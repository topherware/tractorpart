// Keep multipart requests below Vercel's 4.5 MB function payload limit.
async function preparePhotoUpload(data) {
  const file = data.get("image");
  if (!(file instanceof File) || !file.size) return;
  const fail = () => {
    const error = new Error("Gunakan JPG, PNG, atau WebP asli maksimal 5 MB.");
    error.errors = { image: error.message };
    throw error;
  };
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    fail();
  if (file.size <= 3 * 1024 * 1024) return;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = head[0] === 255 && head[1] === 216 && head[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => head[i] === v);
  const webp =
    String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...head.slice(8, 12)) === "WEBP";
  if (
    !(file.type === "image/jpeg"
      ? jpeg
      : file.type === "image/png"
        ? png
        : webp)
  )
    fail();
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    fail();
  }
  try {
    if (bitmap.width * bitmap.height > 40000000) fail();
    const ratio = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.84),
    );
    if (!blob || blob.type !== "image/webp" || blob.size > 3 * 1024 * 1024)
      fail();
    data.set("image", blob, "photo.webp");
  } finally {
    bitmap.close();
  }
}
