import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Json } from '@/integrations/supabase/types';

export interface GalleryImage {
  url: string;
  path: string;
  caption?: string | null;
  sort_order?: number;
}

interface Props {
  siteId: string;
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

const BUCKET = 'client-site-images';
const MAX = 20;

/** Inline site gallery manager — upload, preview, delete. No popups. */
export const SiteGalleryManager: React.FC<Props> = ({ siteId, images, onChange }) => {
  const { isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const persist = async (next: GalleryImage[]) => {
    const { error } = await supabase
      .from('client_sites')
      .update({ gallery_images: next as unknown as Json })
      .eq('id', siteId);
    if (error) throw error;
    onChange(next);
  };

  const handleFiles = async (files: FileList) => {
    if (images.length + files.length > MAX) {
      toast.error(isRTL ? `الحد الأقصى ${MAX} صور` : `Max ${MAX} images`);
      return;
    }
    setBusy(true);
    try {
      const next: GalleryImage[] = [...images];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: ${isRTL ? 'يتجاوز 5MB' : 'exceeds 5MB'}`);
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${siteId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type, cacheControl: '3600',
        });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage
          .from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
        if (sErr) throw sErr;
        next.push({ url: signed.signedUrl, path, sort_order: next.length });
      }
      await persist(next);
      toast.success(isRTL ? 'تم رفع الصور' : 'Images uploaded');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (img: GalleryImage) => {
    setBusy(true);
    try {
      if (img.path) {
        await supabase.storage.from(BUCKET).remove([img.path]);
      }
      const next = images.filter((i) => i.url !== img.url);
      await persist(next);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          {isRTL ? `معرض الصور (${images.length}/${MAX})` : `Gallery (${images.length}/${MAX})`}
        </div>
        <input
          ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const f = e.target.files; if (f && f.length) handleFiles(f); e.target.value = ''; }}
        />
        <Button size="sm" variant="secondary" disabled={busy || images.length >= MAX}
          onClick={() => inputRef.current?.click()} className="hover-lift">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          <span className="mx-2">{isRTL ? 'إضافة صور' : 'Add images'}</span>
        </Button>
      </div>
      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد صور بعد' : 'No images yet'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.url} className="group relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted">
              <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(img)}
                disabled={busy}
                className="absolute end-2 top-2 rounded-full bg-background/90 p-1.5 opacity-0 shadow-sm ring-1 ring-border/60 transition group-hover:opacity-100"
                aria-label={isRTL ? 'حذف' : 'Delete'}
              >
                <X className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteGalleryManager;