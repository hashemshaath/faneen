/**
 * Inline side-by-side merge view for possible duplicate provider leads.
 * Shown inside the detail column (no popup). The operator picks a
 * "winner" lead — the losers are bulk-rejected with an `admin_notes`
 * stamp pointing to the winner's reference. Field-by-field comparison
 * highlights which row has each value so the admin can update the
 * winner manually before approval if needed.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitMerge, X, Crown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateProviderLeadStatus,
  type ProviderLeadRow,
} from '@/modules/providers';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  computeCompleteness,
  computeLeadScore,
  parseLeadMeta,
  serializeLeadMeta,
} from './providerLeadHelpers';

interface Props {
  primary: ProviderLeadRow;
  duplicates: ProviderLeadRow[];
  onClose: () => void;
  onMerged: () => void;
}

const FIELDS: Array<{ key: keyof ProviderLeadRow; ar: string }> = [
  { key: 'name_ar', ar: 'الاسم بالعربية' },
  { key: 'name_en', ar: 'الاسم بالإنجليزية' },
  { key: 'contact_name', ar: 'المسؤول' },
  { key: 'email', ar: 'البريد' },
  { key: 'phone', ar: 'الجوال' },
  { key: 'city', ar: 'المدينة' },
  { key: 'main_activity', ar: 'النشاط' },
  { key: 'cr_number', ar: 'السجل التجاري' },
  { key: 'unified_number', ar: 'الرقم الموحّد' },
  { key: 'vat_number', ar: 'الرقم الضريبي' },
  { key: 'website', ar: 'الموقع' },
  { key: 'map_link', ar: 'الخريطة' },
];

export const LeadMergeView: React.FC<Props> = ({ primary, duplicates, onClose, onMerged }) => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const allLeads = useMemo(() => [primary, ...duplicates], [primary, duplicates]);
  // Default winner = highest lead score
  const defaultWinner = useMemo(
    () => allLeads.reduce((a, b) => (computeLeadScore(b) > computeLeadScore(a) ? b : a)).id,
    [allLeads],
  );
  const [winnerId, setWinnerId] = useState<string>(defaultWinner);
  const [busy, setBusy] = useState(false);

  const winner = allLeads.find((l) => l.id === winnerId) ?? primary;
  const losers = allLeads.filter((l) => l.id !== winnerId);

  const fieldOwner = (key: keyof ProviderLeadRow): string | null => {
    for (const l of allLeads) {
      const v = l[key];
      if (typeof v === 'string' && v.trim()) return l.id;
    }
    return null;
  };

  const confirmMerge = async () => {
    setBusy(true);
    const stamp = `Merged into ${winner.reference_code} · ${new Date().toISOString()}`;
    let ok = 0;
    let fail = 0;
    for (const loser of losers) {
      const { meta, body } = parseLeadMeta(loser.admin_notes);
      const notes = serializeLeadMeta(meta, `${stamp}\n${body ?? ''}`.trim());
      const res = await updateProviderLeadStatus({
        leadId: loser.id,
        status: 'rejected',
        adminNotes: notes,
      });
      if (res.error) fail += 1;
      else ok += 1;
    }
    setBusy(false);
    if (ok > 0) toast.success(t(`تم دمج ${ok} سجل`, `${ok} merged`));
    if (fail > 0) toast.error(t(`فشل دمج ${fail}`, `${fail} failed`));
    onMerged();
    onClose();
  };

  return (
    <Card className="sticky top-2 rounded-2xl">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-base font-bold">
                <Bi ar="دمج المكررات" en="Merge duplicates" />
              </h2>
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700">
                {allLeads.length}
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              <Bi
                ar="اختر السجل الفائز — يتم رفض الباقي مع توثيق الدمج في الملاحظات."
                en="Pick a winner — the rest are rejected with a merge note."
              />
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Winner picker */}
        <div className="space-y-2">
          {allLeads.map((l) => {
            const sel = l.id === winnerId;
            const score = computeLeadScore(l);
            const c = computeCompleteness(l);
            return (
              <button
                key={l.id}
                onClick={() => setWinnerId(l.id)}
                className={`w-full rounded-xl border p-3 text-start transition ${
                  sel ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {sel && <Crown className="h-3.5 w-3.5 text-primary" aria-hidden />}
                  <span className="truncate text-sm font-semibold">{l.name_ar || l.name_en}</span>
                  <span className="tech-content ms-auto text-[10px] text-muted-foreground">{l.reference_code}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{t('النتيجة', 'Score')}: <strong>{score}</strong></span>
                  <span>· {t('الاكتمال', 'Complete')}: <strong>{c.pct}%</strong></span>
                  {l.city && <span>· {l.city}</span>}
                  {l.cr_number && <span className="tech-content">· CR {l.cr_number}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Field comparison */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[420px] text-[11px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1.5 text-start font-medium">{t('الحقل', 'Field')}</th>
                {allLeads.map((l) => (
                  <th key={l.id} className="px-2 py-1.5 text-start font-medium">
                    <span className="tech-content text-[10px]">{l.reference_code}</span>
                    {l.id === winnerId && <Crown className="ms-1 inline h-3 w-3 text-primary" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => {
                const owner = fieldOwner(f.key);
                return (
                  <tr key={String(f.key)} className="border-t">
                    <td className="bg-muted/20 px-2 py-1.5 font-medium text-muted-foreground">{f.ar}</td>
                    {allLeads.map((l) => {
                      const v = l[f.key];
                      const has = typeof v === 'string' && v.trim();
                      const isOwner = owner === l.id && has;
                      return (
                        <td
                          key={l.id}
                          className={`px-2 py-1.5 ${isOwner ? 'bg-success/5 text-foreground' : 'text-muted-foreground'}`}
                        >
                          {has ? String(v) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-[11px] text-warning">
          <AlertTriangle className="me-1 inline h-3.5 w-3.5" aria-hidden />
          <Bi
            ar="ملاحظة: يتم رفض السجلات الخاسرة فقط — لا يتم نسخ الحقول تلقائيًا. حدّث الفائز يدويًا إن لزم."
            en="Note: losers are rejected only — fields aren't auto-copied. Edit the winner manually if needed."
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy} className="h-9 rounded-xl">
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button onClick={confirmMerge} disabled={busy || losers.length === 0} size="sm" className="hover-lift h-9 rounded-xl">
            {busy ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <GitMerge className="me-1.5 h-4 w-4" />}
            {t(`دمج ${losers.length}`, `Merge ${losers.length}`)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};