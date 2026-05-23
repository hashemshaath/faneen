import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listContractTemplateSections,
  listContractTemplateClausesBySectionIds,
  createContractTemplateSection,
  updateContractTemplateSection,
  deleteContractTemplateSection,
  createContractTemplateClause,
  updateContractTemplateClause,
  deleteContractTemplateClause,
  listContractTemplatePricingRules,
  createContractTemplatePricingRule,
  updateContractTemplatePricingRule,
  deleteContractTemplatePricingRule,
  listContractTemplateRequiredFields,
  createContractTemplateRequiredField,
  updateContractTemplateRequiredField,
  deleteContractTemplateRequiredField,
  listContractTemplateAttachments,
  createContractTemplateAttachment,
  updateContractTemplateAttachment,
  deleteContractTemplateAttachment,
} from '@/modules/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle, Lock } from 'lucide-react';
import type {
  CTSection, CTClause, CTPricingRule, CTRequiredField,
  CTAttachment, CTMeasurementMethod,
} from './types';

const ReadOnlyNotice: React.FC<{ isRTL: boolean }> = ({ isRTL }) => (
  <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 mb-3">
    <Lock className="h-4 w-4" />
    <span>
      {isRTL
        ? 'هذه النسخة قيد المراجعة أو معتمدة، ولا يمكن تعديلها إلا بعد إعادتها إلى مسودة.'
        : 'This version is under review or approved, and cannot be edited until it is reverted to draft.'}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sections + Clauses
// ─────────────────────────────────────────────────────────────────────────────
export const SectionsClausesPanel: React.FC<{
  versionId: string; isRTL: boolean; readOnly: boolean;
}> = ({ versionId, isRTL, readOnly }) => {
  const qc = useQueryClient();

  const sectionsQ = useQuery({
    queryKey: ['ct-sections', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplateSections(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTSection[];
    },
  });

  const clausesQ = useQuery({
    queryKey: ['ct-clauses', versionId],
    queryFn: async () => {
      const ids = (sectionsQ.data || []).map((s) => s.id);
      if (ids.length === 0) return [] as CTClause[];
      const { data, error } = await listContractTemplateClausesBySectionIds(ids);
      if (error) throw error;
      return ((data || []) as unknown) as CTClause[];
    },
    enabled: !!sectionsQ.data,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['ct-sections', versionId] });
    qc.invalidateQueries({ queryKey: ['ct-clauses', versionId] });
  };

  const addSection = useMutation({
    mutationFn: async () => {
      const next = (sectionsQ.data?.length || 0);
      const { error } = await createContractTemplateSection({
        version_id: versionId,
        section_key: `section_${next + 1}`,
        title_ar: 'قسم جديد',
        title_en: 'New section',
        is_required: false,
        sort_order: next,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success(isRTL ? 'تمت إضافة القسم' : 'Section added'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const updateSection = useMutation({
    mutationFn: async (s: CTSection) => {
      const { error } = await updateContractTemplateSection(s.id, {
        section_key: s.section_key, title_ar: s.title_ar, title_en: s.title_en,
        is_required: s.is_required, sort_order: s.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteContractTemplateSection(id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const addClause = useMutation({
    mutationFn: async (sectionId: string) => {
      const sectionClauses = (clausesQ.data || []).filter((c) => c.section_id === sectionId);
      const { error } = await createContractTemplateClause({
        section_id: sectionId, body_ar: 'بند جديد', body_en: 'New clause',
        is_mandatory: true, is_editable_by_provider: false, is_editable_by_client: false,
        sort_order: sectionClauses.length, tags: [], legal_reference: null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success(isRTL ? 'تمت إضافة البند' : 'Clause added'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const updateClause = useMutation({
    mutationFn: async (c: CTClause) => {
      const { error } = await updateContractTemplateClause(c.id, {
        body_ar: c.body_ar, body_en: c.body_en, is_mandatory: c.is_mandatory,
        is_editable_by_provider: c.is_editable_by_provider,
        is_editable_by_client: c.is_editable_by_client,
        legal_reference: c.legal_reference, sort_order: c.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const deleteClause = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteContractTemplateClause(id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const reorderSection = (s: CTSection, direction: -1 | 1) => {
    const arr = [...(sectionsQ.data || [])];
    const idx = arr.findIndex((x) => x.id === s.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    const a = arr[idx], b = arr[swapIdx];
    updateSection.mutate({ ...a, sort_order: b.sort_order });
    updateSection.mutate({ ...b, sort_order: a.sort_order });
  };

  if (sectionsQ.isLoading) return <div className="text-sm text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</div>;
  if (sectionsQ.error) return <div className="text-sm text-red-600">{isRTL ? 'تعذّر تحميل الأقسام' : 'Failed to load sections'}</div>;

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      {!readOnly && (
        <Button size="sm" onClick={() => addSection.mutate()} disabled={addSection.isPending}>
          <Plus className="h-4 w-4" />{isRTL ? 'إضافة قسم' : 'Add section'}
        </Button>
      )}
      {(sectionsQ.data || []).length === 0 && (
        <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد أقسام بعد.' : 'No sections yet.'}</div>
      )}
      {(sectionsQ.data || []).map((s) => {
        const sectionClauses = (clausesQ.data || []).filter((c) => c.section_id === s.id);
        return (
          <Card key={s.id} className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">{isRTL ? 'مفتاح القسم' : 'Section key'}</Label>
                  <Input dir="ltr" value={s.section_key} disabled={readOnly}
                    onChange={(e) => updateSection.mutate({ ...s, section_key: e.target.value })}
                    onBlur={(e) => !readOnly && updateSection.mutate({ ...s, section_key: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Title (AR)'}</Label>
                  <Input dir="auto" value={s.title_ar} disabled={readOnly}
                    onChange={(e) => updateSection.mutate({ ...s, title_ar: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label>
                  <Input dir="ltr" value={s.title_en || ''} disabled={readOnly}
                    onChange={(e) => updateSection.mutate({ ...s, title_en: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.is_required} disabled={readOnly}
                    onCheckedChange={(v) => updateSection.mutate({ ...s, is_required: v })} />
                  <span className="text-xs">{isRTL ? 'إلزامي' : 'Required'}</span>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => reorderSection(s, -1)}><ChevronUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => reorderSection(s, 1)}><ChevronDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => deleteSection.mutate(s.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pl-3 border-l-2 border-muted">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {isRTL ? `البنود (${sectionClauses.length})` : `Clauses (${sectionClauses.length})`}
                  </span>
                  {!readOnly && (
                    <Button size="sm" variant="outline" onClick={() => addClause.mutate(s.id)}>
                      <Plus className="h-3 w-3" />{isRTL ? 'إضافة بند' : 'Add clause'}
                    </Button>
                  )}
                </div>
                {sectionClauses.map((c) => (
                  <div key={c.id} className="rounded-md border p-2 space-y-2 bg-muted/20">
                    <Textarea dir="auto" value={c.body_ar} disabled={readOnly} rows={2}
                      placeholder={isRTL ? 'نص البند (عربي)' : 'Clause body (AR)'}
                      onChange={(e) => updateClause.mutate({ ...c, body_ar: e.target.value })} />
                    <Textarea dir="ltr" value={c.body_en || ''} disabled={readOnly} rows={2}
                      placeholder="Clause body (EN)"
                      onChange={(e) => updateClause.mutate({ ...c, body_en: e.target.value })} />
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        <Switch checked={c.is_mandatory} disabled={readOnly}
                          onCheckedChange={(v) => updateClause.mutate({ ...c, is_mandatory: v })} />
                        {isRTL ? 'إلزامي' : 'Mandatory'}
                      </label>
                      <label className="flex items-center gap-1">
                        <Switch checked={c.is_editable_by_provider} disabled={readOnly}
                          onCheckedChange={(v) => updateClause.mutate({ ...c, is_editable_by_provider: v })} />
                        {isRTL ? 'يحرّره المزود' : 'Provider-editable'}
                      </label>
                      <label className="flex items-center gap-1">
                        <Switch checked={c.is_editable_by_client} disabled={readOnly}
                          onCheckedChange={(v) => updateClause.mutate({ ...c, is_editable_by_client: v })} />
                        {isRTL ? 'يحرّره العميل' : 'Client-editable'}
                      </label>
                      <Input dir="auto" className="h-8 max-w-[220px]" placeholder={isRTL ? 'مرجع قانوني' : 'Legal reference'}
                        value={c.legal_reference || ''} disabled={readOnly}
                        onChange={(e) => updateClause.mutate({ ...c, legal_reference: e.target.value })} />
                      {!readOnly && (
                        <Button size="sm" variant="outline" onClick={() => deleteClause.mutate(c.id)}>
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Rules
// ─────────────────────────────────────────────────────────────────────────────
export const PricingRulesPanel: React.FC<{
  versionId: string; isRTL: boolean; readOnly: boolean; methods: CTMeasurementMethod[];
}> = ({ versionId, isRTL, readOnly, methods }) => {
  const qc = useQueryClient();
  const rulesQ = useQuery({
    queryKey: ['ct-pricing', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplatePricingRules(versionId);
      if (error) throw error;
      return (data || []) as CTPricingRule[];
    },
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['ct-pricing', versionId] });
  const add = useMutation({
    mutationFn: async () => {
      const method = methods[0]?.id || 'unit';
      const { error } = await createContractTemplatePricingRule({
        version_id: versionId, method, is_default: (rulesQ.data?.length || 0) === 0,
        required_fields: [], formula: null, rounding: { mode: 'round', decimals: 2 },
        vat_handling: 'inclusive', display_in_pdf: { show_method: true },
      });
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تمت الإضافة' : 'Added'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const upd = useMutation({
    mutationFn: async (r: CTPricingRule) => {
      const { error } = await updateContractTemplatePricingRule(r.id, {
        method: r.method, is_default: r.is_default,
        required_fields: r.required_fields as never, formula: r.formula,
        rounding: r.rounding as never, vat_handling: r.vat_handling,
        display_in_pdf: r.display_in_pdf as never,
      });
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteContractTemplatePricingRule(id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

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
            ? `عدد طرق التسعير المسموحة: ${(rulesQ.data || []).length}`
            : `Allowed pricing methods: ${(rulesQ.data || []).length}`}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isRTL ? 'تنفيذ المعادلات المخصصة غير مفعل بعد.' : 'Custom formula execution is not enabled yet.'}
        </span>
      </div>
      {(rulesQ.data || []).length === 0 && (
        <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground text-center">
          {isRTL
            ? 'لا توجد طرق تسعير محددة. سيتم السماح بجميع الطرق الأساسية حتى يتم إضافة قواعد.'
            : 'No pricing methods defined. All standard methods will be allowed until rules are added.'}
        </div>
      )}
      {!readOnly && (
        <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="h-4 w-4" />{isRTL ? 'إضافة قاعدة تسعير' : 'Add pricing rule'}
        </Button>
      )}
      {(rulesQ.data || []).map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">{isRTL ? 'طريقة القياس' : 'Measurement method'}</Label>
              <Select value={r.method} disabled={readOnly}
                onValueChange={(v) => upd.mutate({ ...r, method: v })}>
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
                onValueChange={(v) => upd.mutate({ ...r, vat_handling: v })}>
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
                onChange={(e) => upd.mutate({ ...r, formula: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isRTL ? 'الحقول المطلوبة (JSON)' : 'Required fields (JSON)'}</Label>
              <JsonField value={r.required_fields} disabled={readOnly}
                onChange={(v) => upd.mutate({ ...r, required_fields: v })} />
            </div>
            <div>
              <Label className="text-xs">{isRTL ? 'التقريب (JSON)' : 'Rounding (JSON)'}</Label>
              <JsonField value={r.rounding} disabled={readOnly}
                onChange={(v) => upd.mutate({ ...r, rounding: v })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">{isRTL ? 'إعدادات العرض في PDF (JSON)' : 'Display in PDF (JSON)'}</Label>
              <JsonField value={r.display_in_pdf} disabled={readOnly}
                onChange={(v) => upd.mutate({ ...r, display_in_pdf: v })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.is_default} disabled={readOnly}
                onCheckedChange={(v) => upd.mutate({ ...r, is_default: v })} />
              <span className="text-xs">{isRTL ? 'افتراضية' : 'Default'}</span>
            </div>
            {!readOnly && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => del.mutate(r.id)}>
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

const JsonField: React.FC<{ value: unknown; disabled?: boolean; onChange: (v: unknown) => void }> = ({ value, disabled, onChange }) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 0));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Textarea dir="ltr" rows={2} disabled={disabled} value={text}
        onChange={(e) => {
          setText(e.target.value);
          try { const parsed = JSON.parse(e.target.value); setErr(null); onChange(parsed); }
          catch { setErr('Invalid JSON'); }
        }} />
      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Required Fields
// ─────────────────────────────────────────────────────────────────────────────
export const RequiredFieldsPanel: React.FC<{
  versionId: string; isRTL: boolean; readOnly: boolean;
}> = ({ versionId, isRTL, readOnly }) => {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['ct-required', versionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_template_required_fields')
        .select('*').eq('version_id', versionId).order('sort_order');
      if (error) throw error;
      return (data || []) as CTRequiredField[];
    },
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['ct-required', versionId] });

  const add = useMutation({
    mutationFn: async () => {
      const next = q.data?.length || 0;
      const { error } = await supabase.from('contract_template_required_fields').insert({
        version_id: versionId, field_key: `field_${next + 1}`, field_type: 'text',
        label_ar: 'حقل جديد', label_en: 'New field', is_required: false,
        applies_to: 'contract', enum_values: [], validation: {}, sort_order: next,
      });
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تمت الإضافة' : 'Added'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const upd = useMutation({
    mutationFn: async (f: CTRequiredField) => {
      const { error } = await supabase.from('contract_template_required_fields').update({
        field_key: f.field_key, field_type: f.field_type,
        label_ar: f.label_ar, label_en: f.label_en,
        help_ar: f.help_ar, help_en: f.help_en,
        enum_values: f.enum_values as never, validation: f.validation as never,
        is_required: f.is_required, applies_to: f.applies_to, sort_order: f.sort_order,
      }).eq('id', f.id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_template_required_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="space-y-3">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      {!readOnly && <Button size="sm" onClick={() => add.mutate()}><Plus className="h-4 w-4" />{isRTL ? 'إضافة حقل' : 'Add field'}</Button>}
      {(q.data || []).map((f) => (
        <Card key={f.id}><CardContent className="p-3 grid gap-2 md:grid-cols-3">
          <div>
            <Label className="text-xs">{isRTL ? 'مفتاح الحقل' : 'Field key'}</Label>
            <Input dir="ltr" value={f.field_key} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...f, field_key: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'النوع' : 'Type'}</Label>
            <Select value={f.field_type} disabled={readOnly}
              onValueChange={(v) => upd.mutate({ ...f, field_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['text','number','date','enum','boolean','json'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'يطبّق على' : 'Applies to'}</Label>
            <Select value={f.applies_to} disabled={readOnly}
              onValueChange={(v) => upd.mutate({ ...f, applies_to: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['contract','line_item','milestone','site'].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Label (AR)'}</Label>
            <Input dir="auto" value={f.label_ar} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...f, label_ar: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Label (EN)'}</Label>
            <Input dir="ltr" value={f.label_en || ''} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...f, label_en: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={f.is_required} disabled={readOnly}
              onCheckedChange={(v) => upd.mutate({ ...f, is_required: v })} />
            <span className="text-xs">{isRTL ? 'إلزامي' : 'Required'}</span>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'مساعدة (عربي)' : 'Help (AR)'}</Label>
            <Input dir="auto" value={f.help_ar || ''} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...f, help_ar: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'مساعدة (إنجليزي)' : 'Help (EN)'}</Label>
            <Input dir="ltr" value={f.help_en || ''} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...f, help_en: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">enum_values JSON</Label>
            <JsonField value={f.enum_values} disabled={readOnly}
              onChange={(v) => upd.mutate({ ...f, enum_values: v })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">validation JSON</Label>
            <JsonField value={f.validation} disabled={readOnly}
              onChange={(v) => upd.mutate({ ...f, validation: v })} />
          </div>
          {!readOnly && (
            <div className="flex justify-end items-end">
              <Button size="sm" variant="outline" onClick={() => del.mutate(f.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </CardContent></Card>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Attachments
// ─────────────────────────────────────────────────────────────────────────────
export const AttachmentsPanel: React.FC<{
  versionId: string; isRTL: boolean; readOnly: boolean;
}> = ({ versionId, isRTL, readOnly }) => {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['ct-attach', versionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_template_attachments')
        .select('*').eq('version_id', versionId).order('precedence_order');
      if (error) throw error;
      return (data || []) as CTAttachment[];
    },
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['ct-attach', versionId] });

  const add = useMutation({
    mutationFn: async () => {
      const next = q.data?.length || 0;
      const { error } = await supabase.from('contract_template_attachments').insert({
        version_id: versionId, kind: 'reference', title_ar: 'مرفق جديد', title_en: 'New attachment',
        file_url: null, is_mandatory: false, precedence_order: next,
      });
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تمت الإضافة' : 'Added'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const upd = useMutation({
    mutationFn: async (a: CTAttachment) => {
      const { error } = await supabase.from('contract_template_attachments').update({
        kind: a.kind, title_ar: a.title_ar, title_en: a.title_en,
        file_url: a.file_url, is_mandatory: a.is_mandatory, precedence_order: a.precedence_order,
      }).eq('id', a.id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_template_attachments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="space-y-3">
      {readOnly && <ReadOnlyNotice isRTL={isRTL} />}
      {!readOnly && <Button size="sm" onClick={() => add.mutate()}><Plus className="h-4 w-4" />{isRTL ? 'إضافة مرفق' : 'Add attachment'}</Button>}
      {(q.data || []).map((a) => (
        <Card key={a.id}><CardContent className="p-3 grid gap-2 md:grid-cols-3">
          <div>
            <Label className="text-xs">{isRTL ? 'النوع (kind)' : 'Kind'}</Label>
            <Input dir="ltr" value={a.kind} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...a, kind: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Title (AR)'}</Label>
            <Input dir="auto" value={a.title_ar} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...a, title_ar: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label>
            <Input dir="ltr" value={a.title_en || ''} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...a, title_en: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">{isRTL ? 'رابط الملف (URL)' : 'File URL'}</Label>
            <Input dir="ltr" value={a.file_url || ''} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...a, file_url: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'ترتيب الأولوية' : 'Precedence order'}</Label>
            <Input type="number" value={a.precedence_order} disabled={readOnly}
              onChange={(e) => upd.mutate({ ...a, precedence_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch checked={a.is_mandatory} disabled={readOnly}
              onCheckedChange={(v) => upd.mutate({ ...a, is_mandatory: v })} />
            <span className="text-xs">{isRTL ? 'إلزامي' : 'Mandatory'}</span>
          </div>
          {!readOnly && (
            <div className="flex justify-end items-end md:col-span-2">
              <Button size="sm" variant="outline" onClick={() => del.mutate(a.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </CardContent></Card>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview
// ─────────────────────────────────────────────────────────────────────────────
export const PreviewPanel: React.FC<{
  versionId: string; isRTL: boolean; methods: CTMeasurementMethod[];
}> = ({ versionId, isRTL, methods }) => {
  const sectionsQ = useQuery({
    queryKey: ['ct-sections', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplateSections(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTSection[];
    },
  });
  const clausesQ = useQuery({
    queryKey: ['ct-clauses', versionId],
    queryFn: async () => {
      const ids = (sectionsQ.data || []).map((s) => s.id);
      if (!ids.length) return [] as CTClause[];
      const { data, error } = await listContractTemplateClausesBySectionIds(ids);
      if (error) throw error;
      return ((data || []) as unknown) as CTClause[];
    },
    enabled: !!sectionsQ.data,
  });
  const pricingQ = useQuery({
    queryKey: ['ct-pricing', versionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_template_pricing_rules')
        .select('*').eq('version_id', versionId);
      if (error) throw error;
      return (data || []) as CTPricingRule[];
    },
  });
  const fieldsQ = useQuery({
    queryKey: ['ct-required', versionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_template_required_fields')
        .select('*').eq('version_id', versionId).order('sort_order');
      if (error) throw error;
      return (data || []) as CTRequiredField[];
    },
  });
  const attachQ = useQuery({
    queryKey: ['ct-attach', versionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_template_attachments')
        .select('*').eq('version_id', versionId).order('precedence_order');
      if (error) throw error;
      return (data || []) as CTAttachment[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-blue-50 border-blue-200 px-3 py-2 text-sm text-blue-800">
        {isRTL
          ? 'هذا استعراض إداري للقالب فقط، ولا يؤثر على العقود الحالية.'
          : 'This is an admin preview only and does not affect existing contracts.'}
      </div>
      <Card><CardContent className="p-4 space-y-4">
        <h3 className="text-base font-semibold">{isRTL ? 'الأقسام والبنود' : 'Sections & clauses'}</h3>
        {(sectionsQ.data || []).map((s) => (
          <div key={s.id} className="border-l-2 border-primary/40 pl-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{isRTL ? s.title_ar : (s.title_en || s.title_ar)}</span>
              {s.is_required && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'إلزامي' : 'required'}</Badge>}
            </div>
            <ol className="list-decimal mr-5 ml-5 mt-1 space-y-1 text-sm text-muted-foreground">
              {(clausesQ.data || []).filter((c) => c.section_id === s.id).map((c) => (
                <li key={c.id} dir="auto">{isRTL ? c.body_ar : (c.body_en || c.body_ar)}</li>
              ))}
            </ol>
          </div>
        ))}
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-base font-semibold">{isRTL ? 'طرق التسعير' : 'Pricing methods'}</h3>
        <ul className="text-sm space-y-1">
          {(pricingQ.data || []).map((r) => {
            const m = methods.find((x) => x.id === r.method);
            return (
              <li key={r.id}>
                {m ? (isRTL ? m.label_ar : m.label_en) : r.method}
                {r.is_default && <Badge className="ml-2 text-[10px]" variant="secondary">{isRTL ? 'افتراضي' : 'default'}</Badge>}
                <span className="ml-2 text-xs text-muted-foreground">VAT: {r.vat_handling}</span>
              </li>
            );
          })}
        </ul>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-base font-semibold">{isRTL ? 'الحقول المطلوبة' : 'Required fields'}</h3>
        <ul className="text-sm space-y-1">
          {(fieldsQ.data || []).map((f) => (
            <li key={f.id}>
              <span className="font-medium">{isRTL ? f.label_ar : (f.label_en || f.label_ar)}</span>
              <span className="text-xs text-muted-foreground ml-2">({f.field_type} • {f.applies_to})</span>
              {f.is_required && <Badge variant="secondary" className="text-[10px] ml-2">{isRTL ? 'إلزامي' : 'required'}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-base font-semibold">{isRTL ? 'المرفقات' : 'Attachments'}</h3>
        <ul className="text-sm space-y-1">
          {(attachQ.data || []).map((a) => (
            <li key={a.id}>
              <span className="font-medium">{isRTL ? a.title_ar : (a.title_en || a.title_ar)}</span>
              <span className="text-xs text-muted-foreground ml-2">[{a.kind}] precedence #{a.precedence_order}</span>
              {a.is_mandatory && <Badge variant="secondary" className="text-[10px] ml-2">{isRTL ? 'إلزامي' : 'mandatory'}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
};