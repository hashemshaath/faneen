import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { ImageIcon, ZoomIn, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ResponsiveImage } from '@/modules/files/components/ResponsiveImage';

export interface GalleryImage {
  id: string;
  image_url: string;
  caption_ar: string | null;
  caption_en: string | null;
  /** Optional variants map from `image_assets.variants` (Phase 2.1). */
  variants?: unknown;
}

interface Props {
  images: GalleryImage[];
  title: string;
}

export const ProjectImageGallery = ({ images, title }: Props) => {
  const { isRTL, language } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const goNext = () => setCurrentImageIndex(prev => (prev + 1) % images.length);
  const goPrev = () => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);

  const openLightbox = (idx: number) => {
    setCurrentImageIndex(idx);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return (
      <div className="media-16-9 bg-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground mb-8">
        <ImageIcon className="w-16 h-16 mb-3 opacity-30" />
        <p>{isRTL ? 'لا توجد صور لهذا المشروع' : 'No images for this project'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div
          className="relative rounded-xl overflow-hidden bg-muted cursor-pointer group mb-3"
          onClick={() => openLightbox(0)}
        >
          <div className="media-16-9 md:aspect-[2/1]">
          <ResponsiveImage
            originalUrl={images[0].image_url}
            variants={images[0].variants}
            alt={title || 'Project image'}
            sizes="(max-width: 768px) 100vw, 66vw"
            priority
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-3">
              <ZoomIn className="w-6 h-6" />
            </div>
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-3 end-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium">
              <ImageIcon className="w-4 h-4" />
              {images.length} {isRTL ? 'صورة' : 'photos'}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {images.slice(1, 7).map((img, idx) => (
              <button key={img.id} onClick={() => openLightbox(idx + 1)} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <ResponsiveImage
                  originalUrl={img.image_url}
                  variants={img.variants}
                  alt={`${title} - ${idx + 2}`}
                  sizes="(max-width: 640px) 25vw, 16vw"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                {idx === 5 && images.length > 7 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">+{images.length - 7}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 end-3 z-10 text-white hover:bg-white/20 rounded-full"
            onClick={() => setLightboxOpen(false)}
            aria-label={isRTL ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <ResponsiveImage
              originalUrl={images[currentImageIndex]?.image_url}
              variants={images[currentImageIndex]?.variants}
              alt={images[currentImageIndex]?.caption_ar || images[currentImageIndex]?.caption_en || `${title} - ${currentImageIndex + 1}`}
              sizes="100vw"
              priority
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute start-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-10 h-10"
                  onClick={isRTL ? goNext : goPrev}
                  aria-label={isRTL ? 'التالية' : 'Previous image'}
                >
                  {isRTL ? <ChevronRight className="w-6 h-6" aria-hidden="true" /> : <ChevronLeft className="w-6 h-6" aria-hidden="true" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-10 h-10"
                  onClick={isRTL ? goPrev : goNext}
                  aria-label={isRTL ? 'السابقة' : 'Next image'}
                >
                  {isRTL ? <ChevronLeft className="w-6 h-6" aria-hidden="true" /> : <ChevronRight className="w-6 h-6" aria-hidden="true" />}
                </Button>
              </>
            )}
          </div>
          <div className="text-center pb-3 px-4">
            {images[currentImageIndex] && (images[currentImageIndex].caption_ar || images[currentImageIndex].caption_en) && (
              <p className="text-white/80 text-sm mb-1">
                {language === 'ar' ? images[currentImageIndex].caption_ar : (images[currentImageIndex].caption_en || images[currentImageIndex].caption_ar)}
              </p>
            )}
            {images.length > 1 && <p className="text-white/50 text-xs">{currentImageIndex + 1} / {images.length}</p>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-4 justify-center">
              {images.map((img, idx) => (
                <button key={img.id} onClick={() => setCurrentImageIndex(idx)} className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-accent ring-1 ring-accent' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                  <ResponsiveImage
                    originalUrl={img.image_url}
                    variants={img.variants}
                    alt={img.caption_ar || img.caption_en || `${title} - ${idx + 1}`}
                    sizes="56px"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
