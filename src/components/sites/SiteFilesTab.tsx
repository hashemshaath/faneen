/**
 * SITE FILES TAB — two sections:
 *
 *   1. "Site files" — first-class rows from `client_site_files`, owned
 *      by the site itself. Authorized users may upload via the inline
 *      form (no popups, per project UX policy) and archive entries.
 *      All Supabase/Storage calls live in `siteFilesService.ts`.
 *
 *   2. "Linked files" — read-only inventory aggregated from the site's
 *      child contracts (`contract_attachments`) and projects
 *      (`project_images`). Listed for context only — no mutations here.
 *
 * Hard rules:
 *   - No `Dialog`/popup — inline collapsible form (project policy).
 *   - No direct `supabase.storage` call in this file for site files;
 *     uploads go through `siteFilesService`.
 *   - Bucket is private — downloads use short-lived signed URLs.
 *   - No hard delete; archive only.
 */
import { memo, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Image as ImageIcon, ExternalLink, Plus, Upload, Loader2,
  Archive, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { pickBi } from '@/components/common/Bilingual';
import {
  listSiteFiles,
  uploadSiteFile,
  archiveSiteFile,
  getSiteFileSignedUrl,
  isAllowedSiteFile,
  SITE_FILE_CATEGORIES,
  SITE_FILES_ALLOWED_EXTENSIONS,
  SITE_FILES_MAX_BYTES,
  type SiteFileCategory,
  type SiteFileRow,
} from '@/services/siteFilesService';

type FileSource = 'contract' | 'project';

interface FileRow {
  key: string;
  name: string;
  type: string | null;
  url: string | null;
  source: FileSource;
  createdAt: string | null;
}

interface Props {
  isRTL: boolean;
  siteId: string;
  canManage: boolean;
  businessId?: string | null;
  contractIds: string[];
  projectIds: string[];
}

const CATEGORY_LABELS: Record<SiteFileCategory, { ar: string; en: string }> = {
  general:  { ar: 'عام',     en: 'General' },
  license:  { ar: 'رخصة',    en: 'License' },
  permit:   { ar: 'تصريح',   en: 'Permit' },
  contract: { ar: 'عقد',     en: 'Contract' },
  invoice:  { ar: 'فاتورة',  en: 'Invoice' },
  photo:    { ar: 'صورة',    en: 'Photo' },
  other:    { ar: 'أخرى',    en: 'Other' },
};

const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const SiteFilesTab = memo(function SiteFilesTab({
  isRTL, siteId, canManage, businessId, contractIds, projectIds,
}: Props) {
  const qc = useQueryClient();
  const contractKey = contractIds.join(',');
  const projectKey = projectIds.join(',');

  // --- Section 1: Site files ---
  const { data: siteFiles = [], isLoading: sLoading, isError: sError } = useQuery({
    queryKey: ['client-site-files', siteId],
    enabled: Boolean(siteId),
    staleTime: 30_000,
    queryFn: () => listSiteFiles(siteId),
  });

  const [formOpen, setFormOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<SiteFileCategory>('general');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setFile(null);
    setCategory('general');
    setDescription('');
  };

  const handleUpload = async () => {
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
    setUploading(true);
    try {
      await uploadSiteFile({ siteId, file, category, description: description.trim() || null, businessId });
      toast.success(pickBi(isRTL, 'تم رفع الملف', 'File uploaded'));
      await qc.invalidateQueries({ queryKey: ['client-site-files', siteId] });
      resetForm();
      setFormOpen(false);
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
      setUploading(false);
    }
  };

  const handleOpenSiteFile = async (row: SiteFileRow) => {
    try {
      const url = await getSiteFileSignedUrl(row);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  };

  const handleArchive = async (row: SiteFileRow) => {
    try {
      await archiveSiteFile(row.id);
      toast.success(pickBi(isRTL, 'تمت أرشفة الملف', 'File archived'));
      await qc.invalidateQueries({ queryKey: ['client-site-files', siteId] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  };

  const { data: contractFiles = [], isLoading: cLoading } = useQuery({
    queryKey: ['site-files-contracts', contractKey],
    enabled: contractIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_attachments')
        .select('id, file_name, file_type, file_url, created_at')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projectFiles = [], isLoading: pLoading } = useQuery({
    queryKey: ['site-files-projects', projectKey],
    enabled: projectIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_images')
        .select('id, image_url, caption_ar, caption_en, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows: FileRow[] = useMemo(() => {
    const out: FileRow[] = [];
    for (const f of contractFiles) {
      out.push({
        key: `c:${f.id}`,
        name: f.file_name || (isRTL ? 'مرفق عقد' : 'Contract attachment'),
        type: f.file_type ?? null,
        url: f.file_url ?? null,
        source: 'contract',
        createdAt: f.created_at ?? null,
      });
    }
    for (const img of projectFiles) {
      out.push({
        key: `p:${img.id}`,
        name:
          (isRTL ? img.caption_ar : img.caption_en) ||
          (isRTL ? 'صورة مشروع' : 'Project image'),
        type: 'image',
        url: img.image_url ?? null,
        source: 'project',
        createdAt: img.created_at ?? null,
      });
    }
    return out.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [contractFiles, projectFiles, isRTL]);

  const linkedLoading = cLoading || pLoading;

  return (
    <div className="space-y-6" data-testid="site-files-tab-root">
      {/* ----- Section 1: Site Files ----- */}
      <section data-testid="site-files-own-section" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">
              {pickBi(isRTL, 'ملفات الموقع', 'Site files')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {pickBi(isRTL, 'ملفات مرفوعة مباشرة لهذا الموقع', 'Files uploaded directly to this site')}
            </p>
          </div>
          {canManage && !formOpen && (
            <Button size="sm" onClick={() => setFormOpen(true)} data-testid="site-files-upload-toggle">
              <Plus className="h-4 w-4" />
              <span className="mx-1.5">{pickBi(isRTL, 'رفع ملف', 'Upload file')}</span>
            </Button>
          )}
        </div>

        {canManage && formOpen && (
          <Card data-testid="site-files-upload-form">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {pickBi(isRTL, 'رفع ملف جديد', 'Upload new file')}
                </Label>
                <Button size="icon" variant="ghost" onClick={() => { setFormOpen(false); resetForm(); }} disabled={uploading} aria-label={pickBi(isRTL, 'إغلاق', 'Close')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{pickBi(isRTL, 'الملف', 'File')}</Label>
                <input
                  ref={inputRef}
                  type="file"
                  accept={SITE_FILES_ALLOWED_EXTENSIONS.map((e) => '.' + e).join(',')}
                  className="hidden"
                  data-testid="site-files-upload-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4" />
                    <span className="mx-1.5">{pickBi(isRTL, 'اختر ملفًا', 'Choose file')}</span>
                  </Button>
                  <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {file ? `${file.name} · ${formatBytes(file.size)}` : pickBi(isRTL, 'لم يتم اختيار ملف', 'No file chosen')}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{pickBi(isRTL, 'التصنيف', 'Category')}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as SiteFileCategory)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SITE_FILE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {pickBi(isRTL, CATEGORY_LABELS[c].ar, CATEGORY_LABELS[c].en)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{pickBi(isRTL, 'الوصف (اختياري)', 'Description (optional)')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  dir="auto"
                  rows={2}
                  placeholder={pickBi(isRTL, 'وصف موجز للملف', 'Brief description')}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => { setFormOpen(false); resetForm(); }} disabled={uploading}>
                  {pickBi(isRTL, 'إلغاء', 'Cancel')}
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={!file || uploading} data-testid="site-files-upload-submit">
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span className="mx-1.5">{pickBi(isRTL, 'رفع', 'Upload')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {sLoading ? (
          <Card><CardContent className="p-5 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
          </CardContent></Card>
        ) : sError ? (
          <Card data-testid="site-files-own-error"><CardContent className="p-6 text-center text-sm text-destructive">
            {pickBi(isRTL, 'تعذّر تحميل ملفات الموقع', 'Failed to load site files')}
          </CardContent></Card>
        ) : siteFiles.length === 0 ? (
          <Card data-testid="site-files-own-empty"><CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              {pickBi(isRTL, 'لا توجد ملفات مرفوعة لهذا الموقع بعد', 'No files uploaded to this site yet')}
            </p>
          </CardContent></Card>
        ) : (
          <Card data-testid="site-files-own-list"><CardContent className="p-3">
            <ul className="divide-y divide-border/40">
              {siteFiles.map((row) => (
                <li key={row.id} className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleOpenSiteFile(row)}
                      className="truncate text-sm font-medium text-start hover:text-primary block w-full"
                    >
                      {row.file_name}
                    </button>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {pickBi(isRTL, CATEGORY_LABELS[row.file_category].ar, CATEGORY_LABELS[row.file_category].en)}
                      </Badge>
                      {row.file_size_bytes != null && (
                        <span className="tech-content">{formatBytes(row.file_size_bytes)}</span>
                      )}
                      <span className="tech-content">{new Date(row.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchive(row)}
                      aria-label={pickBi(isRTL, 'أرشفة', 'Archive')}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent></Card>
        )}
      </section>

      {/* ----- Section 2: Linked files (read-only) ----- */}
      <section data-testid="site-files-linked-section" className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">
            {pickBi(isRTL, 'ملفات مرتبطة', 'Linked files')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {pickBi(
              isRTL,
              'ملفات مستخرجة من عقود ومشاريع الموقع — للعرض فقط',
              'Files surfaced from the site\u2019s contracts and projects — read-only',
            )}
          </p>
        </div>

        {linkedLoading ? (
          <Card><CardContent className="p-5 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
          </CardContent></Card>
        ) : rows.length === 0 ? (
          <Card data-testid="site-files-linked-empty"><CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              {pickBi(isRTL, 'لا توجد ملفات مرتبطة من العقود أو المشاريع', 'No files linked from contracts or projects')}
            </p>
          </CardContent></Card>
        ) : (
          <Card data-testid="site-files-linked-list"><CardContent className="p-3">
            <ul className="divide-y divide-border/40">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                    {r.source === 'project' ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {r.source === 'project'
                          ? pickBi(isRTL, 'مشروع', 'Project')
                          : pickBi(isRTL, 'عقد', 'Contract')}
                      </Badge>
                      {r.type && <span className="tech-content">{r.type}</span>}
                      {r.createdAt && (
                        <span className="tech-content">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                      aria-label={pickBi(isRTL, 'فتح الملف', 'Open file')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {pickBi(isRTL, 'عرض', 'Open')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardContent></Card>
        )}
      </section>
    </div>
  );
});

export default SiteFilesTab;