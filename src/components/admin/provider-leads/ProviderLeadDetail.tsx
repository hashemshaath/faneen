/**
 * Inline detail panel for a single provider lead — renders right of the
 * list as a "drawer"-style column. No popups: closing the panel just
 * clears the selected id in the parent.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  GitBranch,
  GitMerge,
  Printer,
  FileDown,
  Search,
  UserCog,
  Wand2,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listProviderLeadBranches,
  updateProviderLeadStatus,
  type ProviderLeadRow,
  type ProviderLeadStatus,
} from '@/modules/providers';
import { createProviderLeadDocumentSignedUrl } from '@/modules/files/domain/providerLeadDocuments';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  computeCompleteness,
  computeLeadScore,
  computeSlaStatus,
  getAiSuggestions,
  parseLeadMeta,
  serializeLeadMeta,
} from './providerLeadHelpers';
import { CompletenessBar } from './CompletenessBar';
import { LeadScoreBadge } from './LeadScoreBadge';
import { SlaChip } from './SlaChip';
import { ProviderLeadActivity } from './ProviderLeadActivity';
import { GoogleSearchLog } from './GoogleSearchLog';
import { ProviderLeadEditForm } from './ProviderLeadEditForm';

interface Props {
  lead: ProviderLeadRow;
  duplicateIds: string[] | undefined;
  duplicateLeads: ProviderLeadRow[];
  onClose: () => void;
  onSaved: () => void;
  onEnrich: (lead: ProviderLeadRow) => void;
  onJumpTo: (id: string) => void;
  onMerge?: () => void;
  onGoogle?: () => void;
  onExportPdf?: () => void;
}

type BranchRow = { branch_name: string; city: string | null; phone: string | null };

const MISSING_LABEL: Record<string, string> = {
  name_ar: 'الاسم بالعربية',
  name_en: 'الاسم بالإنجليزية',
  contact_name: 'اسم المسؤول',
  email: 'بريد حقيقي',
  phone: 'جوال حقيقي',
  city: 'المدينة',
  main_activity: 'النشاط',
  cr_number: 'السجل التجاري',
  unified_number: 'الرقم الموحد',
  vat_number: 'الرقم الضريبي',
  website: 'الموقع الإلكتروني',
  brief: 'نبذة',
  map_link: 'رابط الخريطة',
};

export const ProviderLeadDetail: React.FC<Props> = ({
  lead,
  duplicateIds,
  duplicateLeads,
  onClose,
  onSaved,
  onEnrich,
  onJumpTo,
  onMerge,
  onGoogle,
  onExportPdf,
}) => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [status, setStatus] = useState<ProviderLeadStatus>(lead.status);
  const initialParsed = parseLeadMeta(lead.admin_notes);
  const [meta, setMeta] = useState(initialParsed.meta);
  const [notes, setNotes] = useState(initialParsed.body);
  const [crUrl, setCrUrl] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const c = computeCompleteness(lead);
  const score = computeLeadScore(lead);
  const sla = computeSlaStatus(lead, meta.slaDays ?? 7);
  const suggestions = getAiSuggestions(lead, duplicateIds?.length ?? 0);

  useEffect(() => {
    setStatus(lead.status);
    const p = parseLeadMeta(lead.admin_notes);
    setMeta(p.meta);
    setNotes(p.body);
    setCrUrl(null);
    listProviderLeadBranches(lead.id).then((r) => setBranches(r.rows as BranchRow[]));
    if (lead.cr_file_path) {
      createProviderLeadDocumentSignedUrl(lead.cr_file_path).then(({ data }) => {
        setCrUrl(data?.signedUrl ?? null);
      });
    }
  }, [lead.id, lead.status, lead.admin_notes, lead.cr_file_path]);

  const save = async (overrideStatus?: ProviderLeadStatus) => {
    const target = overrideStatus ?? status;
    setSaving(true);
    const serialized = serializeLeadMeta(meta, notes);
    const res = await updateProviderLeadStatus({
      leadId: lead.id,
      status: target,
      adminNotes: serialized,
    });
    setSaving(false);
    if (res.error) {
      toast.error(t('تعذر الحفظ', 'Save failed'));
      return;
    }
    toast.success(t('تم الحفظ', 'Saved'));
    onSaved();
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const quickActions: Array<{
    id: ProviderLeadStatus;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    label: string;
  }> = [
    { id: 'under_review', icon: ShieldCheck, tone: 'border-warning/40 text-warning hover:bg-warning/10', label: 'قيد المراجعة' },
    { id: 'needs_info', icon: AlertTriangle, tone: 'border-info/40 text-info hover:bg-info/10', label: 'يحتاج بيانات' },
    { id: 'rejected', icon: XCircle, tone: 'border-destructive/40 text-destructive hover:bg-destructive/10', label: 'رفض' },
    { id: 'approved', icon: CheckCircle2, tone: 'border-success/40 text-success hover:bg-success/10', label: 'اعتماد' },
  ];

  return (
    <Card className="sticky top-2 rounded-2xl print:static print:shadow-none" data-testid="provider-lead-detail" id="provider-lead-print-area">
      <CardContent className="space-y-5 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold">{lead.name_ar}</h2>
              <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[lead.status]}`}>
                {STATUS_LABEL[lead.status].ar}
              </Badge>
              <LeadScoreBadge score={score} showLabel />
              <SlaChip sla={sla} />
            </div>
            {lead.name_en && <p className="text-xs text-muted-foreground">{lead.name_en}</p>}
            <p className="tech-content mt-1 text-[11px] text-muted-foreground">
              {lead.reference_code} · {new Date(lead.created_at).toLocaleString()}
              {meta.ownerName && <> · <UserCog className="me-0.5 inline h-3 w-3" />{meta.ownerName}</>}
            </p>
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <Button
              variant={editing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditing((v) => !v)}
              className="h-8 rounded-lg text-[11px]"
              title="تعديل جميع البيانات"
            >
              <Pencil className="me-1 h-3.5 w-3.5" />
              {editing ? 'إيقاف التعديل' : 'تعديل'}
            </Button>
            {onExportPdf && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onExportPdf}
                className="h-8 w-8 rounded-lg"
                aria-label="Export PDF"
                title="تصدير PDF"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrint}
              className="h-8 w-8 rounded-lg"
              aria-label="Print / PDF"
              title="طباعة / PDF"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
              <Bi ar="اقتراحات ذكية" en="Smart suggestions" />
            </div>
            <ul className="space-y-1 text-[11px]">
              {suggestions.map((s) => (
                <li key={s.id} className="flex items-start gap-1.5">
                  <span
                    className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      s.tone === 'destructive' ? 'bg-destructive' : s.tone === 'warning' ? 'bg-warning' : s.tone === 'success' ? 'bg-success' : 'bg-info'
                    }`}
                  />
                  <span>{isRTL ? s.ar : s.en}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Completeness */}
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold">
              <Bi ar="اكتمال البيانات" en="Data completeness" />
            </span>
            <CompletenessBar pct={c.pct} filled={c.filled} total={c.total} />
          </div>
          {c.missing.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {c.missing.map((k) => (
                <Badge
                  key={k}
                  variant="outline"
                  className="border-warning/40 bg-warning/10 text-[10px] text-warning"
                >
                  {MISSING_LABEL[k] ?? k}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-success">
              <Bi ar="جميع الحقول الأساسية مكتملة." en="All key fields are complete." />
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const active = status === a.id;
            return (
              <Button
                key={a.id}
                variant="outline"
                size="sm"
                onClick={() => save(a.id)}
                disabled={saving}
                className={`h-8 rounded-lg text-[11px] ${a.tone} ${active ? 'ring-1 ring-primary' : ''}`}
              >
                <Icon className="me-1 h-3.5 w-3.5" aria-hidden />
                {a.label}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEnrich(lead)}
            className="ms-auto h-8 rounded-lg border-primary/40 text-primary text-[11px] hover:bg-primary/10"
          >
            <Sparkles className="me-1 h-3.5 w-3.5" aria-hidden />
            <Bi ar="إثراء من Google" en="Enrich from Google" />
          </Button>
          {onGoogle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoogle}
              className="h-8 rounded-lg text-[11px]"
              title="بحث Google"
            >
              <Search className="me-1 h-3.5 w-3.5" aria-hidden />
              <Bi ar="بحث Google" en="Google" />
            </Button>
          )}
        </div>

        {/* Duplicates */}
        {duplicateIds && duplicateIds.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] print:hidden">
            <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-700">
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              <Bi ar="مرشّحون لتكرار محتمل" en="Possible duplicates" />
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                {duplicateIds.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {duplicateLeads.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onJumpTo(d.id)}
                  className="rounded-md border bg-background px-2 py-0.5 text-[10px] hover:bg-muted"
                >
                  {d.name_ar || d.name_en} <span className="tech-content text-muted-foreground">· {d.reference_code}</span>
                </button>
              ))}
            </div>
            {onMerge && (
              <Button
                onClick={onMerge}
                size="sm"
                variant="outline"
                className="mt-2 h-8 rounded-lg border-amber-500/40 text-amber-700 text-[11px] hover:bg-amber-500/10"
              >
                <GitMerge className="me-1 h-3.5 w-3.5" aria-hidden />
                <Bi ar="دمج المكررات" en="Merge duplicates" />
              </Button>
            )}
          </div>
        )}

        {/* Tabbed: Details / Activity */}
        <Tabs defaultValue="details" className="print:hidden">
          <TabsList className="h-8 rounded-lg">
            <TabsTrigger value="details" className="rounded-md text-[11px]">
              <Bi ar="التفاصيل" en="Details" />
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-md text-[11px]">
              <Bi ar="النشاط والملاحظات" en="Activity & notes" />
            </TabsTrigger>
            <TabsTrigger value="google" className="rounded-md text-[11px]">
              <Bi ar="بحث Google" en="Google log" />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-3 space-y-4">
            {editing ? (
              <ProviderLeadEditForm
                lead={lead}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  onSaved();
                }}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="hover-lift flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/[0.04] px-3 py-2 text-[11px] text-primary hover:bg-primary/10"
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل جميع الحقول (المنشأة، العنوان، الفروع، التخصصات...)
                  </span>
                  <span className="text-[10px] opacity-70">اضغط للتعديل</span>
                </button>
                <DetailsBlock lead={lead} branches={branches} crUrl={crUrl} t={t} />
              </>
            )}
          </TabsContent>
          <TabsContent value="activity" className="mt-3">
            <ProviderLeadActivity lead={lead} onSaved={onSaved} />
          </TabsContent>
          <TabsContent value="google" className="mt-3">
            <GoogleSearchLog lead={lead} />
          </TabsContent>
        </Tabs>

        {/* Print fallback: always show details when printing */}
        <div className="hidden print:block">
          <DetailsBlock lead={lead} branches={branches} crUrl={crUrl} t={t} />
        </div>

        {/* Save / Owner / Status panel */}
        <div className="space-y-3 border-t pt-4 print:hidden">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t('الحالة', 'Status')}</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProviderLeadStatus)}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s].ar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('المسؤول', 'Owner')}</Label>
              <Input
                value={meta.ownerName ?? ''}
                onChange={(e) => setMeta({ ...meta, ownerName: e.target.value, ownerId: e.target.value })}
                placeholder={t('اسم/معرّف المسؤول', 'Owner name / id')}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label>{t('SLA (أيام)', 'SLA (days)')}</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={meta.slaDays ?? 7}
                onChange={(e) => setMeta({ ...meta, slaDays: Number(e.target.value) || 7 })}
                className="mt-1 h-10 rounded-xl tech-content"
              />
            </div>
            <div>
              <Label>{t('المنشأة المرتبطة', 'Linked business')}</Label>
              <Input
                value={lead.linked_business_id ?? ''}
                readOnly
                placeholder="—"
                className="mt-1 h-10 rounded-xl tech-content"
              />
            </div>
          </div>
          <div>
            <Label>{t('ملاحظات الإدارة', 'Admin notes')}</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
          <Button onClick={() => save()} disabled={saving} className="hover-lift rounded-xl">
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t('حفظ التغييرات', 'Save changes')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface DetailsBlockProps {
  lead: ProviderLeadRow;
  branches: BranchRow[];
  crUrl: string | null;
  t: (ar: string, en: string) => string;
}

const DetailsBlock: React.FC<DetailsBlockProps> = ({ lead, branches, crUrl, t }) => (
  <>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label={t('المسؤول', 'Contact')} value={lead.contact_name} />
          <Detail
            label={t('البريد', 'Email')}
            value={
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline tech-content"
                href={`mailto:${lead.email}`}
              >
                <Mail className="h-3.5 w-3.5" /> {lead.email}
              </a>
            }
          />
          <Detail
            label={t('الجوال', 'Phone')}
            value={
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline tech-content"
                href={`tel:${lead.phone}`}
              >
                <Phone className="h-3.5 w-3.5" /> {lead.phone}
              </a>
            }
          />
          <Detail label={t('التواصل المفضل', 'Channel')} value={lead.preferred_channel} />
          <Detail label={t('السجل التجاري', 'CR')} value={lead.cr_number ?? '—'} />
          <Detail label={t('الرقم الموحد', 'Unified')} value={lead.unified_number ?? '—'} />
          <Detail label={t('الرقم الضريبي', 'VAT')} value={lead.vat_number ?? '—'} />
          <Detail label={t('المدينة', 'City')} value={lead.city ?? '—'} />
          <Detail label={t('النشاط', 'Activity')} value={lead.main_activity ?? '—'} />
          <Detail label={t('عدد الفروع', 'Branches')} value={String(lead.branches_count)} />
        </div>

        {lead.specialties.length > 0 && (
          <Chips label={t('التخصصات', 'Specialties')} items={lead.specialties} variant="secondary" />
        )}
        {lead.brands.length > 0 && (
          <Chips label={t('العلامات', 'Brands')} items={lead.brands} variant="outline" />
        )}
        {lead.brief && (
          <div>
            <Label className="text-xs">{t('نبذة', 'Description')}</Label>
            <p className="mt-1 whitespace-pre-line text-sm">{lead.brief}</p>
          </div>
        )}

        {(lead.website || lead.map_link || crUrl) && (
          <div className="flex flex-wrap gap-2">
            {lead.website && (
              <LinkButton href={lead.website} label={t('الموقع', 'Website')} />
            )}
            {lead.map_link && (
              <LinkButton href={lead.map_link} label={t('الخريطة', 'Map')} />
            )}
            {crUrl && (
              <LinkButton href={crUrl} label={t('ملف السجل التجاري', 'CR file')} />
            )}
          </div>
        )}

        {branches.length > 0 && (
          <div>
            <Label className="text-xs">{t('الفروع', 'Branches')}</Label>
            <div className="mt-2 space-y-1.5">
              {branches.map((b, i) => (
                <div key={i} className="rounded-xl border bg-muted/30 p-2.5 text-xs">
                  <div className="font-semibold">{b.branch_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {[b.city, b.phone].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
  </>
);

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

const Chips: React.FC<{ label: string; items: string[]; variant: 'secondary' | 'outline' }> = ({
  label,
  items,
  variant,
}) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="mt-1 flex flex-wrap gap-1">
      {items.map((s, i) => (
        <Badge key={i} variant={variant} className="text-[10px]">
          {s}
        </Badge>
      ))}
    </div>
  </div>
);

const LinkButton: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <Button asChild size="sm" variant="outline" className="rounded-xl">
    <a href={href} target="_blank" rel="noreferrer">
      <ExternalLink className="me-1 h-3.5 w-3.5" />
      {label}
    </a>
  </Button>
);