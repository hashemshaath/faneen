/**
 * Compress an image file using canvas before upload.
 * Re-encoding through canvas also strips EXIF/metadata (GPS, device info, etc.)
 * which is important for user-uploaded photos from mobile devices.
 * Returns a new File. Falls back to the original on failure.
 *
 * Phase 5 defaults:
 *  - maxWidth/maxHeight: 1600px
 *  - quality: 0.82
 *  - threshold: re-encode anything ≥ 200KB *or* containing potential metadata
 *    (JPEG/WebP) regardless of size, to guarantee EXIF stripping.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = options;

  // Skip non-image or SVG/GIF files
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // Types that may carry EXIF/metadata — always re-encode to strip it.
  const metadataBearing = file.type === 'image/jpeg' || file.type === 'image/webp';
  const sizeThreshold = 200 * 1024;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Skip only when the file is small, within dimensions, AND not a metadata-bearing type.
      // This guarantees JPG/WebP from cameras always get EXIF stripped.
      if (
        !metadataBearing &&
        file.size < sizeThreshold &&
        width <= maxWidth &&
        height <= maxHeight
      ) {
        resolve(file);
        return;
      }

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      // Use webp for better compression, fallback to jpeg
      const outputType = 'image/webp';

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // If compression didn't help AND the original is not metadata-bearing,
          // keep the original (smaller). For JPG/WebP we still prefer the
          // re-encoded output to ensure EXIF is stripped.
          if (blob.size >= file.size && !metadataBearing) {
            resolve(file);
            return;
          }

          const ext = 'webp';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressed = new File([blob], `${baseName}.${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });

          if (import.meta.env.DEV) {
            console.log(
              `Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% reduction)`
            );
          }

          resolve(compressed);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original on error
    };

    img.src = url;
  });
}
