/**
 * PDF-QA2 — Contract PDF export history (read-only).
 *
 * Renders the audit trail of PDF exports for a single contract. RLS on
 * `contract_pdf_exports` already restricts visibility to admins,
 * super_admins, and the contract's provider/client — this component does not
 * perform additional gating beyond that.
 *
 * Privacy guard: we never display IP/UA hashes, raw exporter IDs, or full
 * document hashes — only first-16-char prefixes, masked exporter IDs, and
 * coarse counts.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileClock, Download } from 'lucide-react';

interface Row {
  id: string;
  exported_at: string;
  exported_by: string;
  source: string;
  contract_version: number | null;
  template_version_number: number | null;
  template_name_ar: string | null;
  template_name_en: string | null;
  document_hash_prefix: string | null;
  amendment_count: number;
  line_item_count: number;
  boq_group_count: number;
  export_locale: string | null;
}

const SOURCE_LABEL: Record<string, { ar: string; en: string }> = {
  contract_detail:     { ar: 'صفحة العقد',   en: 'Contract page' },
  dashboard_contracts: { ar: 'لوحة العقود',  en: 'Contracts dashboard' },
  admin:               { ar: 'الإدارة',       en: 'Admin' },
  unknown:             { ar: 'غير محدد',     en: 'Unknown' },
};

interface Props {
  contractId: string;
  isRTL: boolean;
}

export const ContractPdfExportHistory: React.FC<Props> = ({ contractId, isRTL }) => {
  const q = useQuery({
    queryKey: ['contract-pdf-exports', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_pdf_exports')
        .select(
          'id, exported_at, exported_by, source, contract_version, template_version_number, template_name_ar, template_name_en, document_hash_prefix, amendment_count, line_item_count, boq_group_count, export_locale',
        )
        .eq('contract_id', contractId)
        .order('exported_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileClock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            {isRTL ? 'سجل تصدير ملف العقد' : 'PDF Export History'}
          </h2>
        </div>

        {q.isLoading && (
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
          </p>
        )}

        {q.data && q.data.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لم يتم تصدير ملف PDF لهذا العقد بعد.' : 'No PDF exports recorded for this contract yet.'}
          </p>
        )}

        <ol className="space-y-1.5">
          {(q.data || []).map((r) => {
            const src = SOURCE_LABEL[r.source] || SOURCE_LABEL.unknown;
            const tplName = isRTL ? (r.template_name_ar || r.template_name_en) : (r.template_name_en || r.template_name_ar);
            return (
              <li key={r.id} className="rounded-md border px-2.5 py-2 text-xs flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Download className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{isRTL ? src.ar : src.en}</Badge>
                    {r.contract_version != null && (
                      <span className="text-[10px] text-muted-foreground" dir="ltr">v{r.contract_version}</span>
                    )}
                    {tplName && (
                      <Badge variant="outline" className="text-[10px]">
                        {tplName}{r.template_version_number != null ? ` · v${r.template_version_number}` : ''}
                      </Badge>
                    )}
                    {r.document_hash_prefix && (
                      <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                        #{r.document_hash_prefix}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span>{isRTL ? `بنود: ${r.line_item_count}` : `${r.line_item_count} items`}</span>
                    <span>{isRTL ? `مجموعات BOQ: ${r.boq_group_count}` : `${r.boq_group_count} BOQ groups`}</span>
                    <span>{isRTL ? `ملاحق: ${r.amendment_count}` : `${r.amendment_count} amendments`}</span>
                    {r.export_locale && <span dir="ltr">{r.export_locale.toUpperCase()}</span>}
                    <span className="font-mono" dir="ltr" title={isRTL ? 'معرّف المُصدِّر مقنّع' : 'Exporter ID masked'}>
                      {r.exported_by.slice(0, 8)}…
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0" dir="ltr">
                  {new Date(r.exported_at).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
};

export default ContractPdfExportHistory;