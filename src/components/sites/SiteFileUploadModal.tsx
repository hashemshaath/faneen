import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { pickBi } from '@/components/common/Bilingual';
import {
  isAllowedSiteFile,
  uploadSiteFile,
  SITE_FILE_CATEGORIES,
  SITE_FILES_ALLOWED_EXTENSIONS,
  SITE_FILES_MAX_BYTES,
  type SiteFileCategory,
} from '@/services/siteFilesService';

const CATEGORY_LABELS: Record<SiteFileCategory, { ar: string; en: string }> = {
  general:  { ar: 'عام',     en: 'General' },
  license:  { ar: 'رخصة',    en: 'License' },
  permit:   { ar: 'تصريح',   en: 'Permit' },
  contract: { ar: 'عقد',     en: 'Contract' },
  invoice:  { ar: 'فاتورة',  en: 'Invoice' },
  photo:    { ar: 'صورة',    en: 'Photo' },
  other:    { ar: 'أخرى',    en: 'Other' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  businessId?: string | null;
  isRTL: boolean;
}

export default function SiteFileUploadModal({ open, onOpenChange, siteId, businessId, isRTL }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<SiteFileCategory>('general');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setCategory('general');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!file) return;
    const guard = isAllowedSiteFile(file);
    if (!guard.ok) {
      toast.error(
        guard.reason === 'size'
          ? pickBi(isRTL, 'الملف أكبر من 10 ميجابايت', 'File exceeds 10 MB')
          : pickBi(isRTL, 'نوع الملف غير مدعوم', 'File type is not supported'),
      );
      return;
    }
    setBusy(true);
    try {
      await uploadSiteFile({
        siteId,
        file,
        category,
        description: description.trim() || null,
        businessId: businessId ?? null,
      });
      toast.success(pickBi(isRTL, 'تم رفع الملف', 'File uploaded'));
      await qc.invalidateQueries({ queryKey: ['client-site-files', siteId] });
      reset();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        msg === 'FILE_TOO_LARGE'
          ? pickBi(isRTL, 'الملف أكبر من 10 ميجابايت', 'File exceeds 10 MB')
          : msg === 'FILE_TYPE_FORBIDDEN'
            ? pickBi(isRTL, 'نوع الملف غير مدعوم', 'File type is not supported')
            : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pickBi(isRTL, 'رفع ملف للموقع', 'Upload site file')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{pickBi(isRTL, 'الملف', 'File')}</Label>
            <input
              ref={inputRef}
              type="file"
              accept={SITE_FILES_ALLOWED_EXTENSIONS.map((e) => '.' + e).join(',')}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" />
                <span className="mx-2">{pickBi(isRTL, 'اختر ملفًا', 'Choose file')}</span>
              </Button>
              <span className="text-xs text-muted-foreground truncate">
                {file ? file.name : pickBi(isRTL, 'لم يتم اختيار ملف', 'No file chosen')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {pickBi(
                isRTL,
                `الحد الأقصى ${Math.round(SITE_FILES_MAX_BYTES / 1024 / 1024)} ميجابايت. الأنواع المسموحة: PDF, JPG, PNG, WebP, DOC, DOCX, XLS, XLSX.`,
                `Max ${Math.round(SITE_FILES_MAX_BYTES / 1024 / 1024)} MB. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX, XLS, XLSX.`,
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{pickBi(isRTL, 'التصنيف', 'Category')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SiteFileCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SITE_FILE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {pickBi(isRTL, CATEGORY_LABELS[c].ar, CATEGORY_LABELS[c].en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{pickBi(isRTL, 'الوصف (اختياري)', 'Description (optional)')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              dir="auto"
              rows={3}
              placeholder={pickBi(isRTL, 'وصف موجز للملف', 'Brief description')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {pickBi(isRTL, 'إلغاء', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!file || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span className="mx-2">{pickBi(isRTL, 'رفع', 'Upload')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
