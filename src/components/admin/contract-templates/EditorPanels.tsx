import React from 'react';
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
import { toast } from 'sonner';
import type {
  CTSection, CTClause, CTPricingRule, CTRequiredField,
  CTAttachment, CTMeasurementMethod,
} from './types';
import {
  TemplateSectionsClausesPanel,
  TemplatePricingRulesPanel,
  TemplateRequiredFieldsPanel,
  TemplateAttachmentsPanel,
  TemplatePreviewPanel,
} from './panels';

// ─────────────────────────────────────────────────────────────────────────────
// Sections + Clauses (container — keeps queries + mutations here)
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

  return (
    <TemplateSectionsClausesPanel
      sections={sectionsQ.data || []}
      clauses={clausesQ.data || []}
      isLoading={sectionsQ.isLoading}
      isError={!!sectionsQ.error}
      isRTL={isRTL}
      readOnly={readOnly}
      isAddingSection={addSection.isPending}
      onAddSection={() => addSection.mutate()}
      onUpdateSection={(s) => updateSection.mutate(s)}
      onDeleteSection={(id) => deleteSection.mutate(id)}
      onReorderSection={reorderSection}
      onAddClause={(sectionId) => addClause.mutate(sectionId)}
      onUpdateClause={(c) => updateClause.mutate(c)}
      onDeleteClause={(id) => deleteClause.mutate(id)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Rules (container)
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
      return ((data || []) as unknown) as CTPricingRule[];
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
    <TemplatePricingRulesPanel
      rules={rulesQ.data || []}
      methods={methods}
      isRTL={isRTL}
      readOnly={readOnly}
      isAdding={add.isPending}
      onAdd={() => add.mutate()}
      onUpdate={(r) => upd.mutate(r)}
      onDelete={(id) => del.mutate(id)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Required Fields (container)
// ─────────────────────────────────────────────────────────────────────────────
export const RequiredFieldsPanel: React.FC<{
  versionId: string; isRTL: boolean; readOnly: boolean;
}> = ({ versionId, isRTL, readOnly }) => {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['ct-required', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplateRequiredFields(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTRequiredField[];
    },
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['ct-required', versionId] });

  const add = useMutation({
    mutationFn: async () => {
      const next = q.data?.length || 0;
      const { error } = await createContractTemplateRequiredField({
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
      const { error } = await updateContractTemplateRequiredField(f.id, {
        field_key: f.field_key, field_type: f.field_type,
        label_ar: f.label_ar, label_en: f.label_en,
        help_ar: f.help_ar, help_en: f.help_en,
        enum_values: f.enum_values as never, validation: f.validation as never,
        is_required: f.is_required, applies_to: f.applies_to, sort_order: f.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => { inv(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteContractTemplateRequiredField(id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <TemplateRequiredFieldsPanel
      fields={q.data || []}
      isRTL={isRTL}
      readOnly={readOnly}
      onAdd={() => add.mutate()}
      onUpdate={(f) => upd.mutate(f)}
      onDelete={(id) => del.mutate(id)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Attachments (container)
// ─────────────────────────────────────────────────────────────────────────────
export const AttachmentsPanel: React.FC<{
  versionId: string; isRTL: boolean; readOnly: boolean;
}> = ({ versionId, isRTL, readOnly }) => {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['ct-attach', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplateAttachments(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTAttachment[];
    },
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['ct-attach', versionId] });

  const add = useMutation({
    mutationFn: async () => {
      const next = q.data?.length || 0;
      const { error } = await createContractTemplateAttachment({
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
      const { error } = await updateContractTemplateAttachment(a.id, {
        kind: a.kind, title_ar: a.title_ar, title_en: a.title_en,
        file_url: a.file_url, is_mandatory: a.is_mandatory, precedence_order: a.precedence_order,
      });
      if (error) throw error;
    },
    onSuccess: () => { inv(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteContractTemplateAttachment(id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <TemplateAttachmentsPanel
      attachments={q.data || []}
      isRTL={isRTL}
      readOnly={readOnly}
      onAdd={() => add.mutate()}
      onUpdate={(a) => upd.mutate(a)}
      onDelete={(id) => del.mutate(id)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview (container)
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
      const { data, error } = await listContractTemplatePricingRules(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTPricingRule[];
    },
  });
  const fieldsQ = useQuery({
    queryKey: ['ct-required', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplateRequiredFields(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTRequiredField[];
    },
  });
  const attachQ = useQuery({
    queryKey: ['ct-attach', versionId],
    queryFn: async () => {
      const { data, error } = await listContractTemplateAttachments(versionId);
      if (error) throw error;
      return ((data || []) as unknown) as CTAttachment[];
    },
  });

  return (
    <TemplatePreviewPanel
      sections={sectionsQ.data || []}
      clauses={clausesQ.data || []}
      pricing={pricingQ.data || []}
      fields={fieldsQ.data || []}
      attachments={attachQ.data || []}
      methods={methods}
      isRTL={isRTL}
    />
  );
};
