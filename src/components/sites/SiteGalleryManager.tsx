import { useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, Loader2, X, Filter, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

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
}

interface Props {
  siteId: string;
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  milestones?: { id: string; title: string }[];
}

const BUCKET = 'client-site-images';
const MAX = 40;

export const SiteGalleryManager: React.FC<Props> = ({ siteId, images, onChange, milestones = [] }) => {
  const { isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uPhase, setUPhase] = useState<GalleryPhase>('during');
  const [uCat, setUCat] = useState<GalleryCategory>('general');
  const [uMs, setUMs] = useState<string>('');
  const [fPhase, setFPhase] = useState<GalleryPhase | 'all'>('all');
  const [fCat, setFCat] = useState<GalleryCategory | 'all'>('all');

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
        next.push({
          url: signed.signedUrl, path, sort_order: next.length,
          phase: uPhase, category: uCat, milestone_id: uMs || null,
        });
      }
      await persist(next);
      toast.success(isRTL ? 'تم رفع الصور' : 'Images uploaded');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const updateImage = async (img: GalleryImage, patch: Partial<GalleryImage>) => {
    const next = images.map((i) => (i.url === img.url ? { ...i, ...patch } : i));
    await persist(next);
  };

  const handleDelete = async (img: GalleryImage) => {
    setBusy(true);
    try {
      if (img.path) await supabase.storage.from(BUCKET).remove([img.path]);
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
          ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const f = e.target.files; if (f && f.length) handleFiles(f); e.target.value = ''; }}
        />
        <Button size="sm" variant="secondary" disabled={busy || images.length >= MAX}
          onClick={() => inputRef.current?.click()} className="hover-lift">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          <span className="mx-2">{isRTL ? 'إضافة صور' : 'Add images'}</span>
        </Button>
      </div>

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
                  <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
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