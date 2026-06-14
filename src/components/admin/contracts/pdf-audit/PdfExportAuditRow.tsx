import React from 'react';
import { Badge } from '@/components/ui/badge';
import { User2 } from 'lucide-react';
import { PDF_AUDIT_SOURCE_LABEL, safePdfAuditText, type PdfExportAuditRow as Row } from './types';

export interface PdfExportAuditRowProps {
  row: Row;
  isRTL: boolean;
}

export const PdfExportAuditRow: React.FC<PdfExportAuditRowProps> = ({ row: r, isRTL }) => {
  const src = PDF_AUDIT_SOURCE_LABEL[r.source] || PDF_AUDIT_SOURCE_LABEL.unknown;
  const tplName = isRTL
    ? safePdfAuditText(r.template_name_ar || r.template_name_en)
    : safePdfAuditText(r.template_name_en || r.template_name_ar);
  const exporterLabel = safePdfAuditText(r.exporter_display_name)
    || (isRTL ? 'مستخدم قِطاعات' : 'Qitaat user');

  return (
    <li className="py-2 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
      <div className="md:col-span-3 flex items-center gap-1.5 min-w-0 flex-wrap">
        <Badge variant="outline" className="text-[10px]">{isRTL ? src.ar : src.en}</Badge>
        <span className="font-mono truncate" dir="ltr">{safePdfAuditText(r.contract_number) || '—'}</span>
        {r.contract_status && (
          <Badge variant="secondary" className="text-[10px]">{r.contract_status}</Badge>
        )}
      </div>
      <div className="md:col-span-3 min-w-0 flex items-center gap-1.5 flex-wrap">
        {tplName && (
          <Badge variant="outline" className="text-[10px]">
            {tplName}{r.template_version_number != null ? ` · v${r.template_version_number}` : ''}
          </Badge>
        )}
        {r.contract_version != null && (
          <span className="text-[10px] text-muted-foreground" dir="ltr">v{r.contract_version}</span>
        )}
        {r.document_hash_prefix && (
          <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">#{r.document_hash_prefix}</span>
        )}
      </div>
      <div className="md:col-span-3 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1"><User2 className="h-3 w-3" />{exporterLabel}</span>
        <span>{isRTL ? `بنود: ${r.line_item_count}` : `${r.line_item_count} items`}</span>
        <span>{isRTL ? `BOQ: ${r.boq_group_count}` : `${r.boq_group_count} BOQ`}</span>
        <span>{isRTL ? `ملاحق: ${r.amendment_count}` : `${r.amendment_count} amend.`}</span>
        {r.export_locale && <span dir="ltr">{r.export_locale.toUpperCase()}</span>}
      </div>
      <div className="md:col-span-3 text-[10px] text-muted-foreground md:text-end" dir="ltr">
        {new Date(r.exported_at).toLocaleString()}
      </div>
    </li>
  );
};