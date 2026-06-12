import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  compressImageStrict,
  ImageCompressionError,
  type CompressionStage,
} from '@/lib/imageCompression';
import { CompressionStatus } from '@/components/common/CompressionStatus';
import {
  QITAAT_IMAGES_BUCKET,
  LONG_CACHE_CONTROL,
  cdnUrl,
} from '@/lib/qitaatImagesStorage';

interface Props {
  siteId: string;
  currentUrl: string | null;
  onUploaded: (url: string | null) => void;
}

/**
 * Site cover uploader.
 *
 * Stored in the public `qitaat-images` bucket at
 * `{userId}/sites/{siteId}/cover-{ts}.webp`. The public CDN URL is
 * stable (no signed-URL expiry) and served with long-lived caching.
 */
export const SiteCoverUploader: React.FC<Props> = ({ siteId, currentUrl, onUploaded }) => {
  const { isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<CompressionStage | 'uploading' | 'idle'>('idle');
  const [percent, setPercent] = useState(0);

  const handleFile = async (file: File) => {
    setBusy(true);
    setStage('large');
    setPercent(0);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error(isRTL ? 'يلزم تسجيل الدخول' : 'Sign-in required');

      // Browser-side compression — WebP, ≤1MB, max 1920px, runs in a worker.
      const compressed = await compressImageStrict(file, {
        maxWidthOrHeight: 1920,
        quality: 0.82,
        maxSizeMB: 1,
        suffix: '-cover',
        onProgress: (p) => setPercent(p),
      });
      setStage('uploading');
      setPercent(100);
      const path = `${userId}/sites/${siteId}/cover-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from(QITAAT_IMAGES_BUCKET)
        .upload(path, compressed, {
          cacheControl: LONG_CACHE_CONTROL,
          upsert: true,
          contentType: 'image/webp',
        });
      if (upErr) throw upErr;
      const publicUrl = cdnUrl(path);
      const { error: updErr } = await supabase
        .from('client_sites')
        .update({ cover_image_url: publicUrl })
        .eq('id', siteId);
      if (updErr) throw updErr;
      onUploaded(publicUrl);
      toast.success(isRTL ? 'تم رفع الغلاف' : 'Cover uploaded');
    } catch (e: unknown) {
      const msg = e instanceof ImageCompressionError
        ? e.userMessage
        : e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
      setStage('idle');
      setPercent(0);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('client_sites')
        .update({ cover_image_url: null })
        .eq('id', siteId);
      if (error) throw error;
      onUploaded(null);
      toast.success(isRTL ? 'تم حذف الغلاف' : 'Cover removed');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="hover-lift"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        <span className="mx-2">{currentUrl ? (isRTL ? 'تغيير الغلاف' : 'Change cover') : (isRTL ? 'رفع الغلاف' : 'Upload cover')}</span>
      </Button>
      {currentUrl && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={handleRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
      </div>
      {busy && <CompressionStatus stage={stage} percent={percent} />}
    </div>
  );
};

export default SiteCoverUploader;