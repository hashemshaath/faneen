/**
 * SITE LICENSES TAB — read/write panel for `client_site_licenses`.
 *
 * Hard rules (mirrored in tests):
 *   - No popups/dialogs (project UX policy) — inline form only.
 *   - No upload input here — the optional file is PICKED from existing
 *     `client_site_files` rows of the same site.
 *   - No direct supabase mutations against the licenses table — all
 *     writes go through `siteLicensesService`.
 *   - No hard delete — archive only.
 */
import { memo, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  ClipboardList, Plus, Loader2, Archive, X, AlertTriangle, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { pickBi } from '@/components/common/Bilingual';
import {
  listSiteLicenses,
  createSiteLicense,
  updateSiteLicense,
  archiveSiteLicense,
  daysUntilExpiry,
  isExpiringSoon,
  SITE_LICENSE_TYPES,
  SITE_LICENSE_STATUSES,
  SITE_LICENSE_EXPIRY_SOON_DAYS,
  type SiteLicenseRow,
  type SiteLicenseType,
  type SiteLicenseStatus,
} from '@/services/siteLicensesService';
import { listSiteFiles, type SiteFileRow } from '@/services/siteFilesService';

interface Props {
  isRTL: boolean;
  siteId: string;
  canManage: boolean;
  businessId?: string | null;
}

const TYPE_LABELS: Record<SiteLicenseType, { ar: string; en: string }> = {
  license:       { ar: 'رخصة',              en: 'License' },
  permit:        { ar: 'تصريح',             en: 'Permit' },
  municipality:  { ar: 'موافقة بلدية',      en: 'Municipality approval' },
  civil_defense: { ar: 'الدفاع المدني',     en: 'Civil defense' },
  safety:        { ar: 'السلامة',           en: 'Safety' },
  insurance:     { ar: 'تأمين',             en: 'Insurance' },
  other:         { ar: 'أخرى',              en: 'Other' },
};

const STATUS_LABELS: Record<SiteLicenseStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active:   { ar: 'نشطة',         en: 'Active',   variant: 'default' },
  pending:  { ar: 'قيد المراجعة', en: 'Pending',  variant: 'secondary' },
  expired:  { ar: 'منتهية',       en: 'Expired',  variant: 'destructive' },
  rejected: { ar: 'مرفوضة',       en: 'Rejected', variant: 'destructive' },
  archived: { ar: 'مؤرشفة',       en: 'Archived', variant: 'outline' },
};

interface FormState {
  license_type: SiteLicenseType;
  title: string;
  issuer_name: string;
  license_number: string;
  issue_date: string;
  expiry_date: string;
  status: SiteLicenseStatus;
  file_id: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  license_type: 'license',
  title: '',
  issuer_name: '',
  license_number: '',
  issue_date: '',
  expiry_date: '',
  status: 'active',
  file_id: '',
  notes: '',
});

const SiteLicensesTab = memo(function SiteLicensesTab({
  isRTL, siteId, canManage, businessId,
}: Props) {
  const qc = useQueryClient();

  const { data: licenses = [], isLoading, isError } = useQuery({
    queryKey: ['site-licenses', siteId],
    enabled: Boolean(siteId),
    staleTime: 30_000,
    queryFn: () => listSiteLicenses(siteId),
  });

  // Files of the same site — used to pick an optional linked file.
  const { data: siteFiles = [] } = useQuery({
    queryKey: ['client-site-files', siteId],
    enabled: Boolean(siteId),
    staleTime: 30_000,
    queryFn: () => listSiteFiles(siteId),
  });
  const filesById = useMemo(() => {
    const map = new Map<string, SiteFileRow>();
    for (const f of siteFiles) map.set(f.id, f);
    return map;
  }, [siteFiles]);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (row: SiteLicenseRow) => {
    setEditId(row.id);
    setForm({
      license_type: row.license_type,
      title: row.title,
      issuer_name: row.issuer_name ?? '',
      license_number: row.license_number ?? '',
      issue_date: row.issue_date ?? '',
      expiry_date: row.expiry_date ?? '',
      status: row.status,
      file_id: row.file_id ?? '',
      notes: row.notes ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(pickBi(isRTL, 'العنوان مطلوب', 'Title is required'));
      return;
    }
    if (form.issue_date && form.expiry_date && form.expiry_date < form.issue_date) {
      toast.error(pickBi(isRTL, 'تاريخ الانتهاء قبل تاريخ الإصدار', 'Expiry date is before issue date'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        license_type: form.license_type,
        title: form.title.trim(),
        issuer_name: form.issuer_name.trim() || null,
        license_number: form.license_number.trim() || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        status: form.status,
        file_id: form.file_id || null,
        notes: form.notes.trim() || null,
      };
      if (editId) {
        await updateSiteLicense(editId, payload);
        toast.success(pickBi(isRTL, 'تم تحديث الرخصة', 'License updated'));
      } else {
        await createSiteLicense({ siteId, businessId, ...payload });
        toast.success(pickBi(isRTL, 'تمت إضافة الرخصة', 'License added'));
      }
      await qc.invalidateQueries({ queryKey: ['site-licenses', siteId] });
      closeForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (row: SiteLicenseRow) => {
    try {
      await archiveSiteLicense(row.id);
      toast.success(pickBi(isRTL, 'تمت أرشفة الرخصة', 'License archived'));
      await qc.invalidateQueries({ queryKey: ['site-licenses', siteId] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4" data-testid="site-licenses-tab-root">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">
            {pickBi(isRTL, 'الرخص والتصاريح', 'Licenses & permits')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {pickBi(
              isRTL,
              'الرخص النظامية، التصاريح، وموافقات الجهات لهذا الموقع',
              'Statutory licenses, permits and authority approvals for this site',
            )}
          </p>
        </div>
        {canManage && !formOpen && (
          <Button size="sm" onClick={openCreate} data-testid="site-licenses-add-toggle">
            <Plus className="h-4 w-4" />
            <span className="mx-1.5">{pickBi(isRTL, 'إضافة رخصة أو تصريح', 'Add license or permit')}</span>
          </Button>
        )}
      </div>

      {canManage && formOpen && (
        <Card data-testid="site-licenses-form">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {editId
                  ? pickBi(isRTL, 'تعديل الرخصة', 'Edit license')
                  : pickBi(isRTL, 'إضافة رخصة أو تصريح جديد', 'Add a new license or permit')}
              </Label>
              <Button size="icon" variant="ghost" onClick={closeForm} disabled={saving} aria-label={pickBi(isRTL, 'إغلاق', 'Close')}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{pickBi(isRTL, 'نوع المستند', 'Type')}</Label>
                <Select value={form.license_type} onValueChange={(v) => setForm((f) => ({ ...f, license_type: v as SiteLicenseType }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SITE_LICENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{pickBi(isRTL, TYPE_LABELS[t].ar, TYPE_LABELS[t].en)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pickBi(isRTL, 'الحالة', 'Status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as SiteLicenseStatus }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SITE_LICENSE_STATUSES.filter((s) => s !== 'archived').map((s) => (
                      <SelectItem key={s} value={s}>{pickBi(isRTL, STATUS_LABELS[s].ar, STATUS_LABELS[s].en)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">{pickBi(isRTL, 'العنوان', 'Title')}</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 200) }))} dir="auto" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pickBi(isRTL, 'الجهة المصدرة', 'Issuer')}</Label>
                <Input value={form.issuer_name} onChange={(e) => setForm((f) => ({ ...f, issuer_name: e.target.value.slice(0, 160) }))} dir="auto" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pickBi(isRTL, 'رقم الرخصة/التصريح', 'License / permit number')}</Label>
                <Input className="tech-content" value={form.license_number} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value.slice(0, 80) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pickBi(isRTL, 'تاريخ الإصدار', 'Issue date')}</Label>
                <Input type="date" className="tech-content" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pickBi(isRTL, 'تاريخ الانتهاء', 'Expiry date')}</Label>
                <Input type="date" className="tech-content" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">{pickBi(isRTL, 'ملف مرتبط (من ملفات الموقع)', 'Linked file (from site files)')}</Label>
                <Select value={form.file_id || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, file_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-10" data-testid="site-licenses-file-picker"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{pickBi(isRTL, 'بدون ملف', 'No file')}</SelectItem>
                    {siteFiles.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.file_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {pickBi(
                    isRTL,
                    'لرفع ملف جديد، انتقل إلى تبويب «الملفات».',
                    'To upload a new file, go to the “Files” tab.',
                  )}
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">{pickBi(isRTL, 'ملاحظات (اختياري)', 'Notes (optional)')}</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 2000) }))} dir="auto" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={closeForm} disabled={saving}>
                {pickBi(isRTL, 'إلغاء', 'Cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} data-testid="site-licenses-form-submit">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span className="mx-1.5">{pickBi(isRTL, 'حفظ', 'Save')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="p-5 space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-3/4 rounded-xl" />
        </CardContent></Card>
      ) : isError ? (
        <Card data-testid="site-licenses-error"><CardContent className="p-6 text-center text-sm text-destructive">
          {pickBi(isRTL, 'تعذّر تحميل الرخص', 'Failed to load licenses')}
        </CardContent></Card>
      ) : licenses.length === 0 ? (
        <Card data-testid="site-licenses-empty"><CardContent className="p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            {pickBi(isRTL, 'لا توجد رخص أو تصاريح مرتبطة بهذا الموقع', 'No licenses or permits linked to this site')}
          </p>
        </CardContent></Card>
      ) : (
        <Card data-testid="site-licenses-list"><CardContent className="p-3">
          <ul className="divide-y divide-border/40">
            {licenses.map((row) => {
              const daysLeft = daysUntilExpiry(row.expiry_date);
              const soon = isExpiringSoon(row.expiry_date) && row.status === 'active';
              const status = STATUS_LABELS[row.status];
              const linkedFile = row.file_id ? filesById.get(row.file_id) : null;
              return (
                <li key={row.id} className="flex items-start gap-3 p-3" data-testid="site-licenses-row">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium truncate">{row.title}</span>
                      <Badge variant={status.variant} className="text-[10px]" data-testid={`site-licenses-status-${row.status}`}>
                        {pickBi(isRTL, status.ar, status.en)}
                      </Badge>
                      {soon && (
                        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600" data-testid="site-licenses-expiring-soon">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="mx-1">
                            {pickBi(
                              isRTL,
                              `ينتهي خلال ${daysLeft} يوم`,
                              `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
                            )}
                          </span>
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{pickBi(isRTL, TYPE_LABELS[row.license_type].ar, TYPE_LABELS[row.license_type].en)}</span>
                      {row.issuer_name && <span dir="auto">{row.issuer_name}</span>}
                      {row.license_number && <span className="tech-content">#{row.license_number}</span>}
                      {row.issue_date && (
                        <span className="tech-content">
                          {pickBi(isRTL, 'إصدار', 'Issued')}: {row.issue_date}
                        </span>
                      )}
                      {row.expiry_date && (
                        <span className="tech-content">
                          {pickBi(isRTL, 'انتهاء', 'Expires')}: {row.expiry_date}
                        </span>
                      )}
                      {linkedFile && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {linkedFile.file_name}
                        </span>
                      )}
                    </div>
                    {row.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2" dir="auto">{row.notes}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)} data-testid="site-licenses-edit">
                        {pickBi(isRTL, 'تعديل', 'Edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleArchive(row)} aria-label={pickBi(isRTL, 'أرشفة', 'Archive')} data-testid="site-licenses-archive">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="px-3 pt-3 text-[11px] text-muted-foreground">
            {pickBi(
              isRTL,
              `يتم تنبيهك تلقائيًا قبل انتهاء أي رخصة بـ ${SITE_LICENSE_EXPIRY_SOON_DAYS} يومًا`,
              `You are warned ${SITE_LICENSE_EXPIRY_SOON_DAYS} days before any expiry`,
            )}
          </p>
        </CardContent></Card>
      )}
    </div>
  );
});

export default SiteLicensesTab;