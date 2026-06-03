import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  siteId: string;
  currentUrl: string | null;
  onUploaded: (url: string | null) => void;
}

const BUCKET = 'client-site-images';

/** Site cover image uploader — 16:9, max 5MB. Stored at {siteId}/cover/cover-{ts}.ext */
export const SiteCoverUploader: React.FC<Props> = ({ siteId, currentUrl, onUploaded }) => {
  const { isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max size 5MB');
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${siteId}/cover/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      const { error: updErr } = await supabase
        .from('client_sites')
        .update({ cover_image_url: signed.signedUrl })
        .eq('id', siteId);
      if (updErr) throw updErr;
      onUploaded(signed.signedUrl);
      toast.success(isRTL ? 'تم رفع الغلاف' : 'Cover uploaded');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
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
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
  );
};

export default SiteCoverUploader;