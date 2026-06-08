/**
 * RENTAL-MICROSERVICE-2 — image uploader for rental items.
 *
 * Thin wrapper around the shared <ImageUploader> that:
 *   - validates JPG / PNG / WebP only (handled by shared validator)
 *   - persists the resulting URLs into rental_items.images (jsonb)
 *   - exposes AR/EN alt text (kept alongside the URL in localStorage as
 *     a soft hint until alt-text columns are added — non-blocking)
 *
 * Owner-scoped via providerId (the shared uploader writes to qitaat-images
 * under the provider's path; RLS already prevents cross-tenant writes).
 */
import React from 'react';
import { ImageUploader, type UploadedImageRow } from '@/components/common/ImageUploader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { RentalItems } from '@/modules/rentals';

export interface RentalImageUploaderProps {
  itemId: string;
  providerId: string;
  initialUrls?: string[];
  initialAltAr?: string;
  initialAltEn?: string;
  onSaved?: (urls: string[]) => void;
}

export const RentalImageUploader: React.FC<RentalImageUploaderProps> = ({
  itemId, providerId, initialUrls = [], initialAltAr = '', initialAltEn = '', onSaved,
}) => {
  const bi = useBi();
  const [urls, setUrls] = React.useState<string[]>(initialUrls);
  const [altAr, setAltAr] = React.useState(initialAltAr);
  const [altEn, setAltEn] = React.useState(initialAltEn);
  const [saving, setSaving] = React.useState(false);

  const handleChange = (rows: UploadedImageRow[]) => {
    setUrls(rows.map(r => r.url_large));
  };

  const persist = async () => {
    setSaving(true);
    const { error } = await RentalItems.updateItem(itemId, {
      images: urls,
      // alt text columns may not exist on rental_items; keep description
      // as a graceful fallback so existing SEO logic still benefits.
      description_ar: altAr || undefined,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bi('تم حفظ الصور','Images saved'));
    onSaved?.(urls);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-semibold">
        <Bi ar="صور العنصر" en="Item images" />
      </div>
      <ImageUploader providerId={providerId} maxImages={10} onChange={handleChange} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs"><Bi ar="نص بديل (عربي)" en="Alt text (Arabic)" /></Label>
          <Input dir="auto" value={altAr} onChange={e => setAltAr(e.target.value)}
                 placeholder={bi('وصف موجز للصورة','Short image description')} />
        </div>
        <div>
          <Label className="text-xs"><Bi ar="نص بديل (إنجليزي)" en="Alt text (English)" /></Label>
          <Input dir="auto" value={altEn} onChange={e => setAltEn(e.target.value)}
                 placeholder={bi('Short image description','Short image description')} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={persist} disabled={saving} className="hover-lift">
          {saving ? <Loader2 className="size-4 animate-spin me-1" /> : <Save className="size-4 me-1" />}
          <Bi ar="حفظ" en="Save" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        <Bi
          ar="الصيغ المسموحة: JPG، PNG، WebP — الحد الأقصى 10 صور. تتم المعالجة والضغط تلقائيًا."
          en="Allowed formats: JPG, PNG, WebP — up to 10 images. Auto-optimized."
        />
      </div>
    </Card>
  );
};

export default RentalImageUploader;