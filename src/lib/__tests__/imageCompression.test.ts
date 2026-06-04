import { describe, it, expect } from 'vitest';
import { validateImage, ImageCompressionError } from '@/lib/imageCompression';

function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('validateImage', () => {
  it('accepts JPG', () => {
    const res = validateImage(makeFile('photo.jpg', 'image/jpeg', 1024));
    expect(res.ok).toBe(true);
  });

  it('accepts PNG', () => {
    const res = validateImage(makeFile('photo.png', 'image/png', 1024));
    expect(res.ok).toBe(true);
  });

  it('accepts WebP', () => {
    const res = validateImage(makeFile('photo.webp', 'image/webp', 1024));
    expect(res.ok).toBe(true);
  });

  it('accepts HEIC by extension even when MIME is empty (Safari quirk)', () => {
    const res = validateImage(makeFile('iphone.heic', '', 2048));
    expect(res.ok).toBe(true);
  });

  it('accepts HEIC by MIME', () => {
    const res = validateImage(makeFile('iphone.heic', 'image/heic', 2048));
    expect(res.ok).toBe(true);
  });

  it('rejects non-image files with Arabic message', () => {
    const res = validateImage(makeFile('doc.pdf', 'application/pdf', 1024));
    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.message).toBe('الملف يجب أن يكون صورة');
    }
  });

  it('rejects unsupported image formats (e.g. BMP) with Arabic message', () => {
    const res = validateImage(makeFile('drawing.bmp', 'image/bmp', 1024));
    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.message).toContain('صيغة غير مدعومة');
    }
  });

  it('rejects files larger than 15MB with Arabic message', () => {
    const big = makeFile('huge.jpg', 'image/jpeg', 16 * 1024 * 1024);
    const res = validateImage(big);
    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.message).toBe('حجم الصورة كبير، الحد الأقصى 15 ميجابايت');
    }
  });

  it('accepts files exactly at the 15MB boundary', () => {
    const edge = makeFile('edge.jpg', 'image/jpeg', 15 * 1024 * 1024);
    expect(validateImage(edge).ok).toBe(true);
  });
});

describe('ImageCompressionError', () => {
  it('carries an Arabic userMessage and preserves the cause', () => {
    const cause = new Error('worker timeout');
    const err = new ImageCompressionError('تعذّر ضغط الصورة', cause);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ImageCompressionError');
    expect(err.userMessage).toBe('تعذّر ضغط الصورة');
    expect(err.message).toBe('تعذّر ضغط الصورة');
    expect(err.cause).toBe(cause);
  });
});