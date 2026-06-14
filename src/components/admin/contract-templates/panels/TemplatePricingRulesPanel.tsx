import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { CTPricingRule, CTMeasurementMethod } from '../types';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { JsonField } from './JsonField';

export interface TemplatePricingRulesPanelProps {
  rules: CTPricingRule[];
  methods: CTMeasurementMethod[];
  isRTL: boolean;
  readOnly: boolean;
  isAdding: boolean;
  onAdd: () => void;
  onUpdate: (r: CTPricingRule) => void;
  onDelete: (id: string) => void;
}

export const TemplatePricingRulesPanel: React.FC<TemplatePricingRulesPanelProps> = ({
  rules, methods, isRTL, readOnly, isAdding, onAdd, onUpdate, onDelete,
}) => {
  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          {isRTL
            ? 'هذه الطرق سيتم فرضها على بنود العقد المرتبطة بهذا القالب. أي طريقة غير مضافة هنا لن تكون متاحة للمزود.'
            : 'These methods will be enforced on contract line items using this template. Any method not added here will not be available to the provider.'}
        </span>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          {isRTL
            ? 'تغيير طرق التسعير أو الضريبة يؤثر على العقود الجديدة فقط، ولا يغير العقود التي تم إنشاء Snapshot لها.'
            : 'Changing pricing methods or VAT only affects new contracts. Contracts with an existing snapshot are not modified.'}
        </span>
      </div>
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
        <div className="font-semibold text-foreground">{isRTL ? 'دليل معالجة الضريبة (VAT handling):' : 'VAT handling guide:'}</div>
        <div>• <strong>{isRTL ? 'شاملة' : 'Inclusive'}</strong> — {isRTL ? 'سعر البند يشمل الضريبة بالفعل.' : 'Line total already includes VAT.'}</div>
        <div>• <strong>{isRTL ? 'حصرية' : 'Exclusive'}</strong> — {isRTL ? 'سعر البند بدون ضريبة، تضاف فوقه.' : 'Line total excludes VAT — VAT added on top.'}</div>
        <div>• <strong>{isRTL ? 'معفاة' : 'Exempt'}</strong> — {isRTL ? 'لا تطبق ضريبة على هذا البند.' : 'No VAT applied to this line.'}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {isRTL
            ? `عدد طرق التسعير المسموحة: ${rules.length}`
            : `Allowed pricing methods: ${rules.length}`}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isRTL ? 'تنفيذ المعادلات المخصصة غير مفعل بعد.' : 'Custom formula execution is not enabled yet.'}
        </span>
      </div>
      {rules.length === 0 && (
        <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground text-center">
          {isRTL
            ? 'لا توجد طرق تسعير محددة. سيتم السماح بجميع الطرق الأساسية حتى يتم إضافة قواعد.'
            : 'No pricing methods defined. All standard methods will be allowed until rules are added.'}
        </div>
      )}
      {!readOnly && (
        <Button size="sm" onClick={onAdd} disabled={isAdding}>
          <Plus className="h-4 w-4" />{isRTL ? 'إضافة قاعدة تسعير' : 'Add pricing rule'}
        </Button>
      )}
      {rules.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">{isRTL ? 'طريقة القياس' : 'Measurement method'}</Label>
              <Select value={r.method} disabled={readOnly}
                onValueChange={(v) => onUpdate({ ...r, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {isRTL ? m.label_ar : m.label_en}{m.symbol ? ` (${m.symbol})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isRTL ? 'معالجة الضريبة' : 'VAT handling'}</Label>
              <Select value={r.vat_handling} disabled={readOnly}
                onValueChange={(v) => onUpdate({ ...r, vat_handling: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusive">{isRTL ? 'شاملة' : 'Inclusive'}</SelectItem>
                  <SelectItem value="exclusive">{isRTL ? 'حصرية' : 'Exclusive'}</SelectItem>
                  <SelectItem value="exempt">{isRTL ? 'معفاة' : 'Exempt'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">{isRTL ? 'صيغة الحساب (للعرض فقط)' : 'Formula (display only)'}</Label>
              <Input dir="ltr" value={r.formula || ''} disabled={readOnly}
                placeholder="e.g. width_mm * height_mm / 1000000 * unit_price"
                onChange={(e) => onUpdate({ ...r, formula: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isRTL ? 'الحقول المطلوبة (JSON)' : 'Required fields (JSON)'}</Label>
              <JsonField value={r.required_fields} disabled={readOnly}
                onChange={(v) => onUpdate({ ...r, required_fields: v })} />
            </div>
            <div>
              <Label className="text-xs">{isRTL ? 'التقريب (JSON)' : 'Rounding (JSON)'}</Label>
              <JsonField value={r.rounding} disabled={readOnly}
                onChange={(v) => onUpdate({ ...r, rounding: v })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">{isRTL ? 'إعدادات العرض في PDF (JSON)' : 'Display in PDF (JSON)'}</Label>
              <JsonField value={r.display_in_pdf} disabled={readOnly}
                onChange={(v) => onUpdate({ ...r, display_in_pdf: v })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.is_default} disabled={readOnly}
                onCheckedChange={(v) => onUpdate({ ...r, is_default: v })} />
              <span className="text-xs">{isRTL ? 'افتراضية' : 'Default'}</span>
            </div>
            {!readOnly && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => onDelete(r.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};