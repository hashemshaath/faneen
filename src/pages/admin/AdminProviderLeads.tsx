import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, ExternalLink, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  listProviderLeads,
  listProviderLeadBranches,
  updateProviderLeadStatus,
  type ProviderLeadRow,
  type ProviderLeadStatus,
} from '@/modules/providers';
import { createProviderLeadDocumentSignedUrl } from '@/modules/files/domain/providerLeadDocuments';
import { useNoIndex } from '@/hooks/useNoIndex';
import { IntakeKpiStrip, type IntakeKpiItem } from '@/components/admin/provider-intake/IntakeKpiStrip';
import { PilotContactTemplateCard } from '@/components/admin/provider-intake/PilotContactTemplateCard';

const STATUSES: ProviderLeadStatus[] = [
  'new', 'under_review', 'needs_info', 'approved', 'rejected', 'converted_to_business',
];

const STATUS_TONE: Record<ProviderLeadStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  needs_info: 'bg-info/10 text-info border-info/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  converted_to_business: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

const STATUS_LABEL: Record<ProviderLeadStatus, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  under_review: { ar: 'قيد المراجعة', en: 'Under review' },
  needs_info: { ar: 'يحتاج معلومات', en: 'Needs info' },
  approved: { ar: 'مقبول', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  converted_to_business: { ar: 'تم تحويل لمنشأة', en: 'Converted' },
};

const AdminProviderLeads: React.FC = () => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  useNoIndex();

  const [rows, setRows] = useState<ProviderLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProviderLeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await listProviderLeads({ status: filter, search });
    if (res.error) toast.error(t('تعذر تحميل الطلبات', 'Could not load requests'));
    setRows(res.rows);
    setLoading(false);
  };

  useEffect(() => { load();   }, [filter]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const kpiItems = useMemo<IntakeKpiItem[]>(() => {
    const counts: Record<ProviderLeadStatus | 'total', number> = {
      total: rows.length,
      new: 0, under_review: 0, needs_info: 0, approved: 0, rejected: 0, converted_to_business: 0,
    };
    for (const r of rows) counts[r.status] += 1;
    return [
      { id: 'total', label: t('إجمالي المرشحين', 'Total candidates'), value: counts.total, tone: 'neutral' },
      { id: 'ready-review', label: t('جاهز للمراجعة', 'Ready to review'), value: counts.new + counts.under_review, tone: 'primary' },
      { id: 'needs-data', label: t('يحتاج بيانات', 'Needs info'), value: counts.needs_info, tone: 'warning' },
      { id: 'ready-convert', label: t('جاهز للتحويل', 'Ready to convert'), value: counts.approved, tone: 'success' },
      { id: 'converted', label: t('تم التحويل', 'Converted'), value: counts.converted_to_business, tone: 'info' },
      { id: 'rejected', label: t('مرفوض', 'Rejected'), value: counts.rejected, tone: 'destructive' },
    ];
  }, [rows, isRTL]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('طلبات انضمام المزودين', 'Provider Join Requests')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('مراجعة طلبات الانضمام الجديدة وتحديث حالاتها.', 'Review new provider join requests and update their status.')}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder={t('بحث...', 'Search...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="h-10 rounded-xl w-64"
            />
            <Button variant="outline" size="icon" onClick={load} disabled={loading} className="rounded-xl" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        <IntakeKpiStrip items={kpiItems} testId="provider-leads-kpis" />

        <PilotContactTemplateCard className="mb-5" testId="provider-leads-pilot-contact-template" />

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(['all', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
              }`}
            >
              {s === 'all' ? t('الكل', 'All') : (isRTL ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en)}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* List */}
          <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pe-1">
            {loading && rows.length === 0 ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">{t('لا توجد طلبات', 'No requests')}</p>
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-start rounded-xl border p-4 hover-lift transition ${
                    selectedId === r.id ? 'border-primary bg-primary/5' : 'bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-semibold text-sm">{r.name_ar || r.name_en}</div>
                    <Badge variant="outline" className={`text-xs ${STATUS_TONE[r.status]}`}>
                      {isRTL ? STATUS_LABEL[r.status].ar : STATUS_LABEL[r.status].en}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground tech-content">{r.reference_code}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <LeadDetailPanel lead={selected} onSaved={load} />
            ) : (
              <Card className="rounded-2xl"><CardContent className="p-10 text-center text-muted-foreground">
                {t('اختر طلباً لعرض التفاصيل', 'Select a request to view details')}
              </CardContent></Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const LeadDetailPanel: React.FC<{ lead: ProviderLeadRow; onSaved: () => void }> = ({ lead, onSaved }) => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [status, setStatus] = useState<ProviderLeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.admin_notes ?? '');
  const [crUrl, setCrUrl] = useState<string | null>(null);
  const [branches, setBranches] = useState<Array<{ branch_name: string; city: string | null; phone: string | null }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(lead.status);
    setNotes(lead.admin_notes ?? '');
    setCrUrl(null);
    listProviderLeadBranches(lead.id).then((r) => setBranches(r.rows as never));
    if (lead.cr_file_path) {
      createProviderLeadDocumentSignedUrl(lead.cr_file_path).then(({ data }) => {
        setCrUrl(data?.signedUrl ?? null);
      });
    }
  }, [lead.id, lead.status, lead.admin_notes, lead.cr_file_path]);

  const save = async () => {
    setSaving(true);
    const res = await updateProviderLeadStatus({ leadId: lead.id, status, adminNotes: notes });
    setSaving(false);
    if (res.error) {
      toast.error(t('تعذر الحفظ', 'Save failed'));
      return;
    }
    toast.success(t('تم الحفظ', 'Saved'));
    onSaved();
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{lead.name_ar}</h2>
            {lead.name_en && <p className="text-sm text-muted-foreground">{lead.name_en}</p>}
            <p className="text-xs tech-content text-muted-foreground mt-1">{lead.reference_code}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <DetailRow label={t('المسؤول', 'Contact')} value={lead.contact_name} />
          <DetailRow label={t('البريد', 'Email')} value={
            <a className="text-primary hover:underline inline-flex items-center gap-1 tech-content" href={`mailto:${lead.email}`}>
              <Mail className="w-3.5 h-3.5" />{lead.email}
            </a>
          } />
          <DetailRow label={t('الجوال', 'Phone')} value={
            <a className="text-primary hover:underline inline-flex items-center gap-1 tech-content" href={`tel:${lead.phone}`}>
              <Phone className="w-3.5 h-3.5" />{lead.phone}
            </a>
          } />
          <DetailRow label={t('التواصل المفضل', 'Channel')} value={lead.preferred_channel} />
          <DetailRow label={t('السجل التجاري', 'CR')} value={lead.cr_number ?? '—'} />
          <DetailRow label={t('الرقم الموحد', 'Unified')} value={lead.unified_number ?? '—'} />
          <DetailRow label={t('الرقم الضريبي', 'VAT')} value={lead.vat_number ?? '—'} />
          <DetailRow label={t('المدينة', 'City')} value={lead.city ?? '—'} />
          <DetailRow label={t('النشاط', 'Activity')} value={lead.main_activity ?? '—'} />
          <DetailRow label={t('عدد الفروع', 'Branches')} value={String(lead.branches_count)} />
        </div>

        {lead.specialties.length > 0 && (
          <div>
            <Label className="text-xs">{t('التخصصات', 'Specialties')}</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lead.specialties.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
            </div>
          </div>
        )}
        {lead.brands.length > 0 && (
          <div>
            <Label className="text-xs">{t('العلامات التجارية', 'Brands')}</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lead.brands.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
            </div>
          </div>
        )}
        {lead.brief && (
          <div>
            <Label className="text-xs">{t('نبذة', 'Description')}</Label>
            <p className="text-sm mt-1 whitespace-pre-line">{lead.brief}</p>
          </div>
        )}

        {(lead.website || lead.map_link || crUrl) && (
          <div className="flex flex-wrap gap-2">
            {lead.website && <Button asChild size="sm" variant="outline" className="rounded-xl"><a href={lead.website} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 me-1" />{t('الموقع', 'Website')}</a></Button>}
            {lead.map_link && <Button asChild size="sm" variant="outline" className="rounded-xl"><a href={lead.map_link} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 me-1" />{t('الخريطة', 'Map')}</a></Button>}
            {crUrl && <Button asChild size="sm" variant="outline" className="rounded-xl"><a href={crUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 me-1" />{t('السجل التجاري', 'CR file')}</a></Button>}
          </div>
        )}

        {branches.length > 0 && (
          <div>
            <Label className="text-xs">{t('الفروع', 'Branches')}</Label>
            <div className="mt-2 space-y-2">
              {branches.map((b, i) => (
                <div key={i} className="text-sm border rounded-xl p-3 bg-muted/30">
                  <div className="font-medium">{b.branch_name}</div>
                  <div className="text-xs text-muted-foreground">{[b.city, b.phone].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <div>
            <Label>{t('الحالة', 'Status')}</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProviderLeadStatus)} className="h-11 w-full rounded-xl border border-input bg-background px-3 mt-1">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{isRTL ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t('ملاحظات الإدارة', 'Admin notes')}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <Button onClick={save} disabled={saving} className="rounded-xl hover-lift">
            {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
            {t('حفظ', 'Save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

export default AdminProviderLeads;