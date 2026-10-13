// Keep multipart requests below Vercel's 4.5 MB function payload limit.
async function decodePhotoImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode(); return image;
  } finally { URL.revokeObjectURL(url); }
}

async function encodePhotoCanvas(canvas) {
  const limit = 3 * 1024 * 1024;
  const encode = (source, type, quality) => new Promise(resolve => {
    try { source.toBlob(resolve, type, quality); } catch { resolve(null); }
  });
  const webp = await encode(canvas, 'image/webp', .84);
  if (webp?.type === 'image/webp' && webp.size > 0 && webp.size <= limit) return webp;
  // iOS/Safari may return PNG for an unsupported WebP encoder. Send JPEG
  // instead; the server validates its signature and stores permanent WebP.
  let source = canvas;
  for (let step = 0; step < 4; step++) {
    for (const quality of [.84, .7, .55]) {
      const jpeg = await encode(source, 'image/jpeg', quality);
      if (jpeg?.type === 'image/jpeg' && jpeg.size > 0 && jpeg.size <= limit) return jpeg;
    }
    const smaller = document.createElement('canvas');
    smaller.width = Math.max(1, Math.round(source.width * .8));
    smaller.height = Math.max(1, Math.round(source.height * .8));
    const context = smaller.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, smaller.width, smaller.height);
    context.drawImage(source, 0, 0, smaller.width, smaller.height);
    source = smaller;
  }
  throw new Error('photo-export');
}
const photoFilename = blob => blob.type === 'image/jpeg' ? 'photo.jpg' : 'photo.webp';

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
    bitmap = await decodePhotoImage(file);
  } catch {
    fail();
  }
  try {
    if (bitmap.width * bitmap.height > 40000000) fail();
    const ratio = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob;
    try { blob = await encodePhotoCanvas(canvas); } catch { fail(); }
    data.set("image", blob, photoFilename(blob));
  } finally {
    bitmap.close?.();
  }
}
