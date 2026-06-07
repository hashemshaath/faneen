/**
 * Centralized image optimization pipeline (Phase 2 — scope: Showcase only).
 *
 * Responsibilities:
 *  - Validate input (MIME, size) via the existing `validateImage` helper.
 *  - Generate up to 4 WebP renditions: thumbnail (256), card (640),
 *    medium (1024), hero (1920). Aspect ratio preserved; never upscale —
 *    if the source is smaller than a target dimension, that variant simply
 *    reuses the largest sensible size (we skip it).
 *  - Read original width/height so callers can persist real metadata.
 *  - Return a structured result so the caller can upload variants and
 *    record an `image_assets` row.
 *
 * TODO Phase 2.1: generalize this pipeline beyond Showcase to
 *   projects, business logos, services, products, articles.
 * TODO Phase 2.2: backfill `image_assets` for existing showcase rows
 *   (script reads `image_url`, runs pipeline server-side via edge fn).
 */
import {
  validateImage,
  compressImageStrict,
  ImageCompressionError,
} from '@/lib/imageCompression';

export type VariantKey = 'thumbnail' | 'card' | 'medium' | 'hero';

interface VariantSpec {
  key: VariantKey;
  maxDim: number;
  quality: number;
  maxSizeMB: number;
  suffix: string;
}

const VARIANT_SPECS: readonly VariantSpec[] = [
  { key: 'thumbnail', maxDim: 256,  quality: 0.72, maxSizeMB: 0.08, suffix: '-thumb' },
  { key: 'card',      maxDim: 640,  quality: 0.78, maxSizeMB: 0.25, suffix: '-card'  },
  { key: 'medium',    maxDim: 1024, quality: 0.80, maxSizeMB: 0.5,  suffix: '-medium'},
  { key: 'hero',      maxDim: 1920, quality: 0.82, maxSizeMB: 1.0,  suffix: '-hero'  },
] as const;

export interface VariantFile {
  key: VariantKey;
  file: File;
  width: number;
  height: number;
}

export interface PipelineResult {
  ok: true;
  variants: VariantFile[];
  original: {
    width: number;
    height: number;
    size: number;
    type: string;
  };
  optimizedTotalSize: number;
  format: 'image/webp';
}

export interface PipelineFailure {
  ok: false;
  message: string;
  cause?: unknown;
}

/** Read intrinsic dimensions of an image File without rendering it to DOM. */
async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  // createImageBitmap is fast and avoids ObjectURL leaks where supported.
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      const w = bmp.width;
      const h = bmp.height;
      bmp.close?.();
      return { width: w, height: h };
    } catch {
      // fall through to Image fallback
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Run the central optimization pipeline.
 *
 * Never throws; returns a discriminated union so callers can fall back
 * to a plain upload of the original file when the pipeline fails.
 */
export async function processImage(
  file: File,
): Promise<PipelineResult | PipelineFailure> {
  const v = validateImage(file);
  if (v.ok === false) {
    return { ok: false, message: v.message };
  }

  let dims: { width: number; height: number };
  try {
    dims = await readDimensions(file);
  } catch (err) {
    return {
      ok: false,
      message: 'تعذّر قراءة أبعاد الصورة',
      cause: err,
    };
  }
  if (!dims.width || !dims.height) {
    return { ok: false, message: 'الصورة غير صالحة (أبعاد صفرية)' };
  }

  const longest = Math.max(dims.width, dims.height);
  // Skip variants whose target dim would *upscale* the source; we never
  // upscale, so they would be duplicates of a smaller variant.
  const applicable = VARIANT_SPECS.filter((s, i, arr) => {
    if (s.maxDim <= longest) return true;
    // Always keep the SMALLEST upscale-candidate as the "full" rendition
    // when the source is tiny (so we still have at least one variant).
    const firstUpscale = arr.findIndex((x) => x.maxDim > longest);
    return i === firstUpscale;
  });

  const variants: VariantFile[] = [];
  let optimizedTotalSize = 0;

  try {
    // Sequential to avoid spawning 4 workers at once on low-end devices.
    for (const spec of applicable) {
      const compressed = await compressImageStrict(file, {
        maxWidthOrHeight: Math.min(spec.maxDim, longest),
        quality: spec.quality,
        maxSizeMB: spec.maxSizeMB,
        suffix: spec.suffix,
      });
      const dim = await readDimensions(compressed).catch(() => ({
        width: 0,
        height: 0,
      }));
      variants.push({
        key: spec.key,
        file: compressed,
        width: dim.width,
        height: dim.height,
      });
      optimizedTotalSize += compressed.size;
    }
  } catch (err) {
    const msg =
      err instanceof ImageCompressionError
        ? err.userMessage
        : err instanceof Error
          ? err.message
          : 'تعذّر توليد نسخ مُحسّنة من الصورة';
    return { ok: false, message: msg, cause: err };
  }

  if (variants.length === 0) {
    return { ok: false, message: 'لم يتم توليد أي نسخة مُحسّنة' };
  }

  return {
    ok: true,
    variants,
    original: {
      width: dims.width,
      height: dims.height,
      size: file.size,
      type: file.type || 'image/jpeg',
    },
    optimizedTotalSize,
    format: 'image/webp',
  };
}

/** Persisted variants map: { thumbnail?: url, card?: url, medium?: url, hero?: url } */
export type VariantUrls = Partial<Record<VariantKey, string>>;

/** Type guard for variants payload coming from DB jsonb. */
export function isVariantUrls(v: unknown): v is VariantUrls {
  if (!v || typeof v !== 'object') return false;
  return Object.entries(v as Record<string, unknown>).every(
    ([k, val]) =>
      ['thumbnail', 'card', 'medium', 'hero'].includes(k) &&
      typeof val === 'string',
  );
}