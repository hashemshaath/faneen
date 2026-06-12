import { useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, Loader2, X, Filter, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import {
  generateImageSizes,
  ImageCompressionError,
  type CompressionStage,
  type ResponsiveImageSet,
} from '@/lib/imageCompression';
import { CompressionStatus } from '@/components/common/CompressionStatus';
import {
  QITAAT_IMAGES_BUCKET,
  LONG_CACHE_CONTROL,
  cdnUrl,
} from '@/lib/qitaatImagesStorage';
import {
  removePublicImages,
  uploadPublicImage,
} from '@/modules/files/services/public';

export type GalleryPhase = 'before' | 'during' | 'after';
export type GalleryCategory = 'aluminum' | 'glass' | 'wood' | 'steel' | 'general';

const PHASES: { id: GalleryPhase; ar: string; en: string; tone: string }[] = [
  { id: 'before', ar: 'قبل', en: 'Before', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  { id: 'during', ar: 'أثناء', en: 'During', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  { id: 'after',  ar: 'بعد',  en: 'After',  tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
];

const CATEGORIES: { id: GalleryCategory; ar: string; en: string }[] = [
  { id: 'aluminum', ar: 'ألمنيوم', en: 'Aluminum' },
  { id: 'glass',    ar: 'زجاج',    en: 'Glass' },
  { id: 'wood',     ar: 'خشب',     en: 'Wood' },
  { id: 'steel',    ar: 'حديد',    en: 'Steel' },
  { id: 'general',  ar: 'عام',     en: 'General' },
];

export interface GalleryImage {
  url: string;
  path: string;
  caption?: string | null;
  sort_order?: number;
  phase?: GalleryPhase | null;
  category?: GalleryCategory | null;
  milestone_id?: string | null;
  /** Responsive renditions generated client-side before upload. */
  sizes?: {
    thumbnail?: { url: string; path: string };
    medium?: { url: string; path: string };
    large?: { url: string; path: string };
  };
}

interface Props {
  siteId: string;
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  milestones?: { id: string; title: string }[];
}

const MAX = 40;
const INPUT_MAX_BYTES = 15 * 1024 * 1024; // hard pre-compression cap (15MB)

type RenditionKey = keyof ResponsiveImageSet;
const RENDITION_KEYS: RenditionKey[] = ['thumbnail', 'medium', 'large'];

export const SiteGalleryManager: React.FC<Props> = ({ siteId, images, onChange, milestones = [] }) => {
  const { isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uPhase, setUPhase] = useState<GalleryPhase>('during');
  const [uCat, setUCat] = useState<GalleryCategory>('general');
  const [uMs, setUMs] = useState<string>('');
  const [fPhase, setFPhase] = useState<GalleryPhase | 'all'>('all');
  const [fCat, setFCat] = useState<GalleryCategory | 'all'>('all');
  const [stage, setStage] = useState<CompressionStage | 'uploading' | 'idle'>('idle');
  const [percent, setPercent] = useState(0);
  const [counter, setCounter] = useState<string | null>(null);

  const filtered = useMemo(() => images.filter((i) =>
    (fPhase === 'all' || i.phase === fPhase) &&
    (fCat === 'all' || i.category === fCat)
  ), [images, fPhase, fCat]);

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
    setStage('validating');
    setPercent(0);
    setCounter(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error(isRTL ? 'يلزم تسجيل الدخول' : 'Sign-in required');
      const next: GalleryImage[] = [...images];
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setCounter(`${i + 1}/${list.length}`);
        if (file.size > INPUT_MAX_BYTES) {
          toast.error(`${file.name}: ${isRTL ? 'حجم الصورة كبير، الحد الأقصى 15 ميجابايت' : 'exceeds 15MB'}`);
          continue;
        }
        // 1) Compress + generate 3 responsive sizes (Web Worker).
        let renditions: ResponsiveImageSet;
        try {
          renditions = await generateImageSizes(file, {
            onProgress: (p) => { setStage(p.stage); setPercent(p.percent); },
          });
        } catch (err) {
          const msg = err instanceof ImageCompressionError
            ? err.userMessage
            : isRTL ? 'فشل تجهيز الصورة' : 'Failed to prepare image';
          toast.error(`${file.name}: ${msg}`);
          continue;
        }

        // 2) Upload all 3 renditions to qitaat-images and collect stable
        //    public CDN URLs (no signed-URL expiry).
        setStage('uploading');
        setPercent(100);
        const imageId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const uploaded: Partial<Record<RenditionKey, { url: string; path: string }>> = {};
        try {
          await Promise.all(RENDITION_KEYS.map(async (key) => {
            const f = renditions[key];
            const path = `${userId}/sites/${siteId}/${imageId}-${key}.webp`;
            const { error: upErr } = await uploadPublicImage({
              bucket: QITAAT_IMAGES_BUCKET,
              path,
              file: f,
              skipCompression: true,
              options: {
                contentType: 'image/webp',
                cacheControl: LONG_CACHE_CONTROL,
                upsert: true,
              },
            });
            if (upErr) throw upErr;
            uploaded[key] = { url: cdnUrl(path), path };
          }));
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }

        // 3) Link sizes in the gallery row (backwards-compatible: top-level
        //    url/path point to the `large` rendition).
        const large = uploaded.large!;
        next.push({
          url: large.url,
          path: large.path,
          sort_order: next.length,
          phase: uPhase, category: uCat, milestone_id: uMs || null,
          sizes: {
            thumbnail: uploaded.thumbnail,
            medium: uploaded.medium,
            large: uploaded.large,
          },
        });
      }
      await persist(next);
      toast.success(isRTL ? 'تم رفع الصور' : 'Images uploaded');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStage('idle');
      setPercent(0);
      setCounter(null);
    }
  };

  const updateImage = async (img: GalleryImage, patch: Partial<GalleryImage>) => {
    const next = images.map((i) => (i.url === img.url ? { ...i, ...patch } : i));
    await persist(next);
  };

  const handleDelete = async (img: GalleryImage) => {
    setBusy(true);
    try {
      const uniq = Array.from(new Set(
        [
          img.path,
          img.sizes?.thumbnail?.path,
          img.sizes?.medium?.path,
          img.sizes?.large?.path,
        ].filter((p): p is string => Boolean(p)),
      ));
      if (uniq.length) {
        await removePublicImages({ bucket: QITAAT_IMAGES_BUCKET, paths: uniq });
      }
      await persist(images.filter((i) => i.url !== img.url));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {isRTL ? `معرض الصور (${images.length}/${MAX})` : `Gallery (${images.length}/${MAX})`}
        </div>
        <input
          ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
          onChange={(e) => { const f = e.target.files; if (f && f.length) handleFiles(f); e.target.value = ''; }}
        />
        <Button size="sm" variant="secondary" disabled={busy || images.length >= MAX}
          onClick={() => inputRef.current?.click()} className="hover-lift">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          <span className="mx-2">{isRTL ? 'إضافة صور' : 'Add images'}</span>
        </Button>
      </div>

      {busy && (
        <CompressionStatus stage={stage} percent={percent} counter={counter} />
      )}

      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" />
          {isRTL ? 'تصنيف الصور التي سيتم رفعها:' : 'Classification for next upload:'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={uPhase} onChange={(e) => setUPhase(e.target.value as GalleryPhase)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            {PHASES.map((p) => <option key={p.id} value={p.id}>{isRTL ? p.ar : p.en}</option>)}
          </select>
          <select value={uCat} onChange={(e) => setUCat(e.target.value as GalleryCategory)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{isRTL ? c.ar : c.en}</option>)}
          </select>
          <select value={uMs} onChange={(e) => setUMs(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm" disabled={milestones.length === 0}>
            <option value="">{isRTL ? 'بدون مرحلة عقد' : 'No milestone'}</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Chip active={fPhase === 'all'} onClick={() => setFPhase('all')}>{isRTL ? 'كل المراحل' : 'All phases'}</Chip>
        {PHASES.map((p) => (
          <Chip key={p.id} active={fPhase === p.id} onClick={() => setFPhase(p.id)} tone={p.tone}>
            {isRTL ? p.ar : p.en}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <Chip active={fCat === 'all'} onClick={() => setFCat('all')}>{isRTL ? 'الكل' : 'All'}</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={fCat === c.id} onClick={() => setFCat(c.id)}>
            {isRTL ? c.ar : c.en}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
          {images.length === 0
            ? (isRTL ? 'لا توجد صور بعد' : 'No images yet')
            : (isRTL ? 'لا توجد صور بهذا التصنيف' : 'No images match this filter')}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((img) => {
            const phaseDef = PHASES.find((p) => p.id === img.phase);
            const catDef = CATEGORIES.find((c) => c.id === img.category);
            return (
              <div key={img.url} className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted">
                <div className="aspect-square">
                  <img
                    src={img.sizes?.thumbnail?.url ?? img.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button" onClick={() => handleDelete(img)} disabled={busy}
                  className="absolute end-2 top-2 rounded-full bg-background/90 p-1.5 opacity-0 shadow-sm ring-1 ring-border/60 transition group-hover:opacity-100"
                  aria-label={isRTL ? 'حذف' : 'Delete'}
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
                <div className="absolute start-2 top-2 flex flex-wrap gap-1">
                  {phaseDef && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', phaseDef.tone)}>{isRTL ? phaseDef.ar : phaseDef.en}</span>}
                  {catDef && <Badge variant="secondary" className="text-[10px] py-0">{isRTL ? catDef.ar : catDef.en}</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-1 border-t border-border/40 bg-background/95 p-1">
                  <select value={img.phase ?? ''} onChange={(e) => updateImage(img, { phase: (e.target.value || null) as GalleryPhase | null })}
                    className="h-7 rounded-md border border-input bg-background px-1 text-[10px]">
                    <option value="">{isRTL ? 'مرحلة' : 'Phase'}</option>
                    {PHASES.map((p) => <option key={p.id} value={p.id}>{isRTL ? p.ar : p.en}</option>)}
                  </select>
                  <select value={img.category ?? ''} onChange={(e) => updateImage(img, { category: (e.target.value || null) as GalleryCategory | null })}
                    className="h-7 rounded-md border border-input bg-background px-1 text-[10px]">
                    <option value="">{isRTL ? 'فئة' : 'Cat'}</option>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{isRTL ? c.ar : c.en}</option>)}
                  </select>
                  <select value={img.milestone_id ?? ''} onChange={(e) => updateImage(img, { milestone_id: e.target.value || null })}
                    className="h-7 rounded-md border border-input bg-background px-1 text-[10px]" disabled={milestones.length === 0}>
                    <option value="">{isRTL ? 'مرحلة عقد' : 'Milestone'}</option>
                    {milestones.map((m) => <option key={m.id} value={m.id}>{m.title.slice(0, 16)}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; tone?: string; children: React.ReactNode }> = ({ active, onClick, tone, children }) => (
  <button
    type="button" onClick={onClick}
    className={cn(
      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
      active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted',
      !active && tone,
    )}
  >
    {children}
  </button>
);

export default SiteGalleryManager;