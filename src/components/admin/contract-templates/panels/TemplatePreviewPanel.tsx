import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  CTSection, CTClause, CTPricingRule, CTRequiredField, CTAttachment, CTMeasurementMethod,
} from '../types';

export interface TemplatePreviewPanelProps {
  sections: CTSection[];
  clauses: CTClause[];
  pricing: CTPricingRule[];
  fields: CTRequiredField[];
  attachments: CTAttachment[];
  methods: CTMeasurementMethod[];
  isRTL: boolean;
}

export const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({
  sections, clauses, pricing, fields, attachments, methods, isRTL,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-blue-50 border-blue-200 px-3 py-2 text-sm text-blue-800">
        {isRTL
          ? 'هذا استعراض إداري للقالب فقط، ولا يؤثر على العقود الحالية.'
          : 'This is an admin preview only and does not affect existing contracts.'}
      </div>
      <Card><CardContent className="p-4 space-y-4">
        <h3 className="text-base font-semibold">{isRTL ? 'الأقسام والبنود' : 'Sections & clauses'}</h3>
        {sections.map((s) => (
          <div key={s.id} className="border-s-2 border-primary/40 ps-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{isRTL ? s.title_ar : (s.title_en || s.title_ar)}</span>
              {s.is_required && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'إلزامي' : 'required'}</Badge>}
            </div>
            <ol className="list-decimal ms-5 me-5 mt-1 space-y-1 text-sm text-muted-foreground">
              {clauses.filter((c) => c.section_id === s.id).map((c) => (
                <li key={c.id} dir="auto">{isRTL ? c.body_ar : (c.body_en || c.body_ar)}</li>
              ))}
            </ol>
          </div>
        ))}
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-base font-semibold">{isRTL ? 'طرق التسعير' : 'Pricing methods'}</h3>
        <ul className="text-sm space-y-1">
          {pricing.map((r) => {
            const m = methods.find((x) => x.id === r.method);
            return (
              <li key={r.id}>
                {m ? (isRTL ? m.label_ar : m.label_en) : r.method}
                {r.is_default && <Badge className="ms-2 text-[10px]" variant="secondary">{isRTL ? 'افتراضي' : 'default'}</Badge>}
                <span className="ms-2 text-xs text-muted-foreground">VAT: {r.vat_handling}</span>
              </li>
            );
          })}
        </ul>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-base font-semibold">{isRTL ? 'الحقول المطلوبة' : 'Required fields'}</h3>
        <ul className="text-sm space-y-1">
          {fields.map((f) => (
            <li key={f.id}>
              <span className="font-medium">{isRTL ? f.label_ar : (f.label_en || f.label_ar)}</span>
              <span className="text-xs text-muted-foreground ms-2">({f.field_type} • {f.applies_to})</span>
              {f.is_required && <Badge variant="secondary" className="text-[10px] ms-2">{isRTL ? 'إلزامي' : 'required'}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-base font-semibold">{isRTL ? 'المرفقات' : 'Attachments'}</h3>
        <ul className="text-sm space-y-1">
          {attachments.map((a) => (
            <li key={a.id}>
              <span className="font-medium">{isRTL ? a.title_ar : (a.title_en || a.title_ar)}</span>
              <span className="text-xs text-muted-foreground ms-2">[{a.kind}] precedence #{a.precedence_order}</span>
              {a.is_mandatory && <Badge variant="secondary" className="text-[10px] ms-2">{isRTL ? 'إلزامي' : 'mandatory'}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
};