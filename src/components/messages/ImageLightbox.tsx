import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';

export interface LightboxImage {
  id: string;
  url: string;
  name?: string | null;
  createdAt?: string | null;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentId: string | null;
  isRTL: boolean;
  onClose: () => void;
  onChange: (id: string) => void;
}

/**
 * Fullscreen image viewer for chat attachments.
 *
 * Keyboard: Esc closes, ArrowLeft/Right navigates (RTL-aware swap).
 * Click outside the image also closes.
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentId, isRTL, onClose, onChange }) => {
  const index = currentId ? images.findIndex(i => i.id === currentId) : -1;
  const current = index >= 0 ? images[index] : null;

  const goPrev = useCallback(() => {
    if (index < 0 || images.length === 0) return;
    const next = (index - 1 + images.length) % images.length;
    onChange(images[next].id);
  }, [index, images, onChange]);

  const goNext = useCallback(() => {
    if (index < 0 || images.length === 0) return;
    const next = (index + 1) % images.length;
    onChange(images[next].id);
  }, [index, images, onChange]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') (isRTL ? goNext : goPrev)();
      else if (e.key === 'ArrowRight') (isRTL ? goPrev : goNext)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, goPrev, goNext, onClose, isRTL]);

  if (!current || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in-0 duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isRTL ? 'معاينة الصورة' : 'Image preview'}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/30 bg-card/40 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-foreground/80 tabular-nums shrink-0">
            {index + 1} / {images.length}
          </span>
          {current.name && (
            <span className="text-xs text-muted-foreground truncate" dir="auto">{current.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-muted/60 text-foreground/80 hover:text-foreground transition-colors"
            title={isRTL ? 'فتح في تبويب جديد' : 'Open in new tab'}
            aria-label={isRTL ? 'فتح في تبويب جديد' : 'Open in new tab'}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={current.url}
            download={current.name || undefined}
            className="p-2 rounded-lg hover:bg-muted/60 text-foreground/80 hover:text-foreground transition-colors"
            title={isRTL ? 'تنزيل' : 'Download'}
            aria-label={isRTL ? 'تنزيل' : 'Download'}
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-destructive/10 text-foreground/80 hover:text-destructive transition-colors"
            aria-label={isRTL ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image stage */}
      <div className="flex-1 flex items-center justify-center relative px-4 py-6 overflow-hidden">
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); (isRTL ? goNext : goPrev)(); }}
              className="absolute start-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-card/80 border border-border/40 backdrop-blur-sm hover:bg-card shadow-lg flex items-center justify-center text-foreground transition-all hover:scale-105"
              aria-label={isRTL ? 'التالي' : 'Previous'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); (isRTL ? goPrev : goNext)(); }}
              className="absolute end-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-card/80 border border-border/40 backdrop-blur-sm hover:bg-card shadow-lg flex items-center justify-center text-foreground transition-all hover:scale-105"
              aria-label={isRTL ? 'السابق' : 'Next'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        <img
          key={current.id}
          src={current.url}
          alt={current.name || (isRTL ? 'مرفق صورة' : 'Image attachment')}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
          loading="eager"
          decoding="async"
        />
      </div>
    </div>,
    document.body
  );
};

ImageLightbox.displayName = 'ImageLightbox';