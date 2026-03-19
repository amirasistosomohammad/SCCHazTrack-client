/**
 * Lightweight client-side image compression to avoid server upload limits.
 *
 * Works by drawing the image to a canvas and re-encoding as JPEG.
 */
export async function compressImageFile(file, { maxSizeBytes, maxDimension = 1600 }) {
  if (!file) throw new Error("Missing file");
  if (!maxSizeBytes || typeof maxSizeBytes !== "number") throw new Error("Missing maxSizeBytes");

  // Already small enough.
  if (file.size <= maxSizeBytes) return file;

  const imageBitmapUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(imageBitmapUrl);

    // Resize while keeping aspect ratio.
    const { width, height } = getScaledDimensions(img.width, img.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D canvas context");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Try a few quality levels until we fit under the size limit.
    const baseName = String(file.name || "image").replace(/\.[^.]+$/, "");
    const tryQualities = [0.85, 0.75, 0.65, 0.55, 0.45];

    for (const quality of tryQualities) {
      const blob = await canvasToBlob(canvas, { type: "image/jpeg", quality });
      if (!blob) continue;
      if (blob.size <= maxSizeBytes) {
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      }
    }

    // Return the smallest one we managed (first re-encode result).
    const blob = await canvasToBlob(canvas, { type: "image/jpeg", quality: 0.45 });
    if (!blob) return file;
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(imageBitmapUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = src;
  });
}

function getScaledDimensions(originalWidth, originalHeight, maxDimension) {
  const w = Number(originalWidth) || 0;
  const h = Number(originalHeight) || 0;
  if (!w || !h) return { width: maxDimension, height: maxDimension };

  const maxSide = Math.max(w, h);
  const scale = Math.min(1, maxDimension / maxSide);
  return { width: w * scale, height: h * scale };
}

function canvasToBlob(canvas, { type, quality }) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob || null),
      type,
      quality
    );
  });
}

