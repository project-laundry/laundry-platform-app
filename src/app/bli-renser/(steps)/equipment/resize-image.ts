// Browser-only: downscale a picked photo to a small JPEG for the recognition
// server action. Two reasons this must happen client-side:
//   1. Next.js server actions reject bodies over 1 MB; phone photos are 3–12 MB.
//   2. iPhones often produce HEIC, which the Claude API doesn't accept.
// Re-encoding through a canvas solves both.

const MAX_EDGE_PX = 1024;
const JPEG_QUALITIES = [0.75, 0.5] as const;
/** Must match MAX_IMAGE_BASE64_LENGTH in lib/ai/machine-recognition.ts. */
const MAX_BASE64_LENGTH = 900_000;

export class ImageResizeError extends Error {}

/**
 * Returns raw base64 (no `data:` prefix) of a JPEG at most MAX_EDGE_PX on its
 * longest side. Throws ImageResizeError if the file can't be decoded or can't
 * be shrunk under the payload limit.
 */
export async function fileToJpegBase64(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageResizeError('decode');
  }

  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageResizeError('canvas');
    ctx.drawImage(bitmap, 0, 0, width, height);

    for (const quality of JPEG_QUALITIES) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      if (base64.length <= MAX_BASE64_LENGTH) return base64;
    }
    throw new ImageResizeError('too_large');
  } finally {
    bitmap.close();
  }
}
