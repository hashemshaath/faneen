/**
 * ImageUploader — drag & drop + multi-file image uploader for Qitaat.
 *
 * Pipeline per file:
 *   validateImage → generateImageSizes (3 WebP sizes) → upload to
 *   `qitaat-images` bucket → insert row in public.images.
 *
 * No popups: status and previews are inline. RTL-aware, bilingual.
 * Brand primary green (#1F9D6B) is applied via the design token `--primary`.
 */
import React from 'react';
import { Upload, Trash2, ImagePlus, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  generateImageSizes,
  validateImage,
  ImageCompressionError,
  type CompressionStage,
} from '@/lib/imageCompression';
import {
  uploadResponsiveSet,
  removeResponsiveSet,
  type UploadedImageUrls,
} from '@/lib/qitaatImagesStorage';

export interface UploadedImageRow {
  id: string;             // public.images.id
  imageId: string;        // storage UUID (used for path)
  url_thumbnail: string;
  url_medium: string;
  url_large: string;
  original_name: string;
}

export interface ImageUploaderProps {
  /** The provider/business the images belong to. Used for path & DB row. */
  providerId: string;
  /** Optional initial images to render (e.g. loaded from DB). */
  initial?: UploadedImageRow[];
  /** Called whenever the set of uploaded images changes. */
  onChange?: (images: UploadedImageRow[]) => void;
  /** Max number of images allowed (default 20). */
  maxImages?: number;
  className?: string;
}

type ItemStatus = 'queued' | 'compressing' | 'uploading' | 'done' | 'error';

interface QueueItem {
  key: string;
  file: File;
  status: ItemStatus;
  stage: CompressionStage | 'uploading' | 'idle';
  percent: number;
  error?: string;
  result?: UploadedImageRow;
  previewUrl?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  providerId,
  initial = [],
  onChange,
  maxImages = 20,
  className,
}) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [uploaded, setUploaded] = React.useState<UploadedImageRow[]>(initial);
  const [topError, setTopError] = React.useState<string | null>(null);

  const emitChange = React.useCallback(
    (next: UploadedImageRow[]) => {
      setUploaded(next);
      onChange?.(next);
    },
    [onChange],
  );

  const updateItem = (key: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const processFile = React.useCallback(
    async (item: QueueItem, userId: string) => {
      try {
        updateItem(item.key, { status: 'compressing', stage: 'validating', percent: 1 });
        const set = await generateImageSizes(item.file, {
          onProgress: (p) => updateItem(item.key, { stage: p.stage, percent: p.percent }),
        });

        // Read intrinsic width/height of the large rendition.
        const dims = await readImageDims(set.large);

        updateItem(item.key, { status: 'uploading', stage: 'uploading', percent: 0 });
        const imageId = crypto.randomUUID();
        const urls: UploadedImageUrls = await uploadResponsiveSet({
          userId,
          providerId,
          imageId,
          set,
          onProgress: (p) => updateItem(item.key, { percent: p }),
        });

        const { data: row, error } = await supabase
          .from('images')
          .insert({
            owner_id: userId,
            provider_id: providerId,
            url_thumbnail: urls.thumbnail,
            url_medium: urls.medium,
            url_large: urls.large,
            original_name: item.file.name,
            width: dims.width,
            height: dims.height,
          })
          .select('id')
          .single();

        if (error) throw error;

        const result: UploadedImageRow = {
          id: (row as { id: string }).id,
          imageId,
          url_thumbnail: urls.thumbnail,
          url_medium: urls.medium,
          url_large: urls.large,
          original_name: item.file.name,
        };
        updateItem(item.key, { status: 'done', percent: 100, result });
        setUploaded((prev) => {
          const next = [...prev, result];
          onChange?.(next);
          return next;
        });
      } catch (err: unknown) {
        const msg =
          err instanceof ImageCompressionError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : bi('فشل غير معروف أثناء المعالجة', 'Unknown processing error');
        updateItem(item.key, { status: 'error', error: msg });
      }
    },
    [providerId, onChange, bi],
  );

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      setTopError(null);
      const arr = Array.from(files);
      if (uploaded.length + queue.filter((q) => q.status !== 'error').length + arr.length > maxImages) {
        setTopError(
          bi(
            `لا يمكن رفع أكثر من ${maxImages} صورة.`,
            `You can upload at most ${maxImages} images.`,
          ),
        );
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setTopError(bi('يجب تسجيل الدخول لرفع الصور.', 'You must be signed in to upload images.'));
        return;
      }

      const newItems: QueueItem[] = arr.map((file) => {
        const v = validateImage(file);
        const base: QueueItem = {
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          status: 'queued',
          stage: 'idle',
          percent: 0,
          previewUrl: URL.createObjectURL(file),
        };
        if (v.ok === false) return { ...base, status: 'error', error: v.message };
        return base;
      });

      setQueue((q) => [...q, ...newItems]);

      // Kick off processing for valid items (small concurrency: 2 at a time).
      const valid = newItems.filter((i) => i.status === 'queued');
      const POOL = 2;
      for (let i = 0; i < valid.length; i += POOL) {
        const slice = valid.slice(i, i + POOL);
        await Promise.all(slice.map((it) => processFile(it, userId)));
      }
    },
    [bi, maxImages, processFile, queue, uploaded.length],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  };

  const removeUploaded = async (img: UploadedImageRow) => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    // Delete DB row first (RLS scoped to owner), then storage.
    const { error } = await supabase.from('images').delete().eq('id', img.id);
    if (error) {
      setTopError(error.message);
      return;
    }
    await removeResponsiveSet(userId, providerId, img.imageId);
    const next = uploaded.filter((x) => x.id !== img.id);
    emitChange(next);
  };

  const removeQueued = (key: string) =>
    setQueue((q) => q.filter((it) => it.key !== key));

  return (
    <div className={['flex flex-col gap-4', className ?? ''].join(' ')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed',
          'h-40 w-full px-4 text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border/70 bg-muted/30 hover:border-primary/60 hover:bg-primary/5',
        ].join(' ')}
        aria-label={bi('منطقة سحب وإفلات الصور', 'Image drop zone')}
      >
        <Upload className="h-7 w-7 text-primary" />
        <div className="text-sm font-medium text-foreground">
          {bi('اسحب وأفلت الصور هنا', 'Drag & drop images here')}
        </div>
        <div className="text-xs text-muted-foreground">
          {bi('أو انقر للاختيار من جهازك — JPG / PNG / WebP / HEIC، حتى 15MB',
              'or click to browse — JPG / PNG / WebP / HEIC, up to 15MB')}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </button>

      {topError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{topError}</span>
        </div>
      )}

      {/* Queue items (compressing/uploading/error) */}
      {queue.length > 0 && (
        <div className="flex flex-col gap-2">
          {queue.map((it) => (
            <QueueRow key={it.key} item={it} onRemove={() => removeQueued(it.key)} />
          ))}
          {queue.some((i) => i.status === 'done' || i.status === 'error') && (
            <button
              type="button"
              onClick={() => setQueue((q) => q.filter((i) => i.status !== 'done' && i.status !== 'error'))}
              className="self-end text-xs text-muted-foreground hover:text-foreground"
            >
              {bi('مسح القائمة', 'Clear list')}
            </button>
          )}
        </div>
      )}

      {/* Uploaded thumbnails grid */}
      {uploaded.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {uploaded.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/30"
            >
              <img
                src={img.url_thumbnail}
                alt={img.original_name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => removeUploaded(img)}
                className="absolute end-2 top-2 rounded-full bg-background/90 p-1.5 text-destructive opacity-0 shadow transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                aria-label={bi('حذف الصورة', 'Delete image')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
            aria-label={bi('إضافة المزيد', 'Add more')}
          >
            <ImagePlus className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
};

/* ----------------------------- internals ----------------------------- */

const QueueRow: React.FC<{ item: QueueItem; onRemove: () => void }> = ({ item, onRemove }) => {
  const bi = useBi();
  const stageLabel = (() => {
    switch (item.stage) {
      case 'validating':       return bi('جاري التحقق…', 'Validating…');
      case 'converting-heic':  return bi('تحويل HEIC…', 'Converting HEIC…');
      case 'thumbnail':        return bi('تجهيز المصغّرة…', 'Preparing thumbnail…');
      case 'medium':           return bi('تجهيز المتوسطة…', 'Preparing medium…');
      case 'large':            return bi('تجهيز الكبيرة…', 'Preparing large…');
      case 'uploading':        return bi('جارٍ الرفع…', 'Uploading…');
      case 'done':             return bi('اكتمل', 'Done');
      default:                 return bi('بانتظار البدء…', 'Queued…');
    }
  })();

  const Icon = item.status === 'done'
    ? CheckCircle2
    : item.status === 'error'
      ? AlertCircle
      : Loader2;

  const pct = Math.max(0, Math.min(100, Math.round(item.percent)));

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-2.5">
      {item.previewUrl && (
        <img
          src={item.previewUrl}
          alt=""
          className="h-12 w-12 flex-none rounded-lg object-cover"
        loading="lazy" decoding="async"/>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-xs font-medium text-foreground">{item.file.name}</div>
          <div className="tech-content tabular-nums text-[11px] text-muted-foreground">{pct}%</div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <Icon
            className={[
              'h-3.5 w-3.5',
              item.status === 'error'
                ? 'text-destructive'
                : item.status === 'done'
                  ? 'text-emerald-600'
                  : 'animate-spin text-primary',
            ].join(' ')}
          />
          <span className={item.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
            {item.status === 'error' ? item.error : stageLabel}
          </span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border/50">
          <div
            className={[
              'h-full rounded-full transition-[width] duration-300',
              item.status === 'error' ? 'bg-destructive' : 'bg-primary',
            ].join(' ')}
            style={{ width: `${item.status === 'error' ? 100 : pct}%` }}
          />
        </div>
      </div>
      {(item.status === 'error' || item.status === 'done') && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={bi('إزالة', 'Remove')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

function readImageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

export default ImageUploader;