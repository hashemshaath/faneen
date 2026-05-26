import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listActiveContractTemplates,
  listContractMeasurementMethods,
  listContractTemplateVersions,
  listContractTemplateSectionsByVersionIds,
  listContractTemplateClausesBySectionIds,
  listContractTemplateSections,
  createContractTemplateVersion,
  createContractTemplateSection,
  createContractTemplateClause,
  updateContractTemplateById,
  listContractTemplatePricingRules,
  createContractTemplatePricingRule,
  listContractTemplateRequiredFields,
  createContractTemplateRequiredField,
  listContractTemplateAttachments,
  createContractTemplateAttachment,
} from '@/modules/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Copy, Archive, Eye, ScrollText, Calculator, ListChecks, Paperclip, History, Search, Scale } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import {
  SectionsClausesPanel, PricingRulesPanel, RequiredFieldsPanel,
  AttachmentsPanel, PreviewPanel,
} from '@/components/admin/contract-templates/EditorPanels';
import { LegalReviewPanel } from '@/components/admin/contract-templates/LegalReviewPanel';
import {
  CTTemplate, CTVersion, CTMeasurementMethod,
  VERSION_STATUS_META,
} from '@/components/admin/contract-templates/types';

const AdminContractTemplates: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (!isAdmin) return <Navigate to="/forbidden" replace />;

  const templatesQ = useQuery({
    queryKey: ['ct-templates'],
    queryFn: async () => {
      const { data, error } = await listActiveContractTemplates({
        select: 'id,slug,name_ar,name_en,category,service_category_id,default_locale,current_version_id,is_active,archived_at,updated_at',
        orderBy: { column: 'updated_at', ascending: false },
        activeOnly: false,
      });
      if (error) throw error;
      return ((data as unknown) as CTTemplate[]) || [];
    },
  });

  const methodsQ = useQuery({
    queryKey: ['ct-methods'],
    queryFn: async () => {
      const { data, error } = await listContractMeasurementMethods();
      if (error) throw error;
      return ((data || []) as unknown) as CTMeasurementMethod[];
    },
  });

  const versionsQ = useQuery({
    queryKey: ['ct-versions', selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return [] as CTVersion[];
      const { data, error } = await listContractTemplateVersions(selectedTemplateId);
      if (error) throw error;
      return ((data || []) as unknown) as CTVersion[];
    },
    enabled: !!selectedTemplateId,
  });

  const sectionsCountQ = useQuery({
    queryKey: ['ct-counts', templatesQ.data?.map((t) => t.current_version_id).join(',')],
    queryFn: async () => {
      const ids = (templatesQ.data || []).map((t) => t.current_version_id).filter(Boolean) as string[];
      if (!ids.length) return { sections: {}, clauses: {} } as { sections: Record<string, number>; clauses: Record<string, number> };
      const { data: secs, error: e1 } = await listContractTemplateSectionsByVersionIds(ids);
      if (e1) throw e1;
      const sectionsByVersion: Record<string, number> = {};
      const sectionIds: string[] = [];
      const sectionToVersion: Record<string, string> = {};
      ((secs as unknown as { id: string; version_id: string }[]) || []).forEach((s) => {
        sectionsByVersion[s.version_id] = (sectionsByVersion[s.version_id] || 0) + 1;
        sectionIds.push(s.id);
        sectionToVersion[s.id] = s.version_id;
      });
      const clausesByVersion: Record<string, number> = {};
      if (sectionIds.length) {
        const { data: cls, error: e2 } = await listContractTemplateClausesBySectionIds(
          sectionIds,
          { select: 'id,section_id', orderBy: null },
        );
        if (e2) throw e2;
        ((cls as unknown as { id: string; section_id: string }[]) || []).forEach((c) => {
          const v = sectionToVersion[c.section_id];
          if (v) clausesByVersion[v] = (clausesByVersion[v] || 0) + 1;
        });
      }
      return { sections: sectionsByVersion, clauses: clausesByVersion };
    },
    enabled: !!templatesQ.data && templatesQ.data.length > 0,
  });

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = templatesQ.data || [];
    if (!q) return all;
    return all.filter((t) =>
      t.name_ar?.toLowerCase().includes(q) ||
      (t.name_en || '').toLowerCase().includes(q) ||
      (t.slug || '').toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q));
  }, [templatesQ.data, search]);

  const selectedTemplate = (templatesQ.data || []).find((t) => t.id === selectedTemplateId) || null;
  const selectedVersion = (versionsQ.data || []).find((v) => v.id === selectedVersionId) || null;

  // Auto-select latest version when template changes
  React.useEffect(() => {
    if (versionsQ.data && versionsQ.data.length && !versionsQ.data.find((v) => v.id === selectedVersionId)) {
      setSelectedVersionId(versionsQ.data[0].id);
    }
  }, [versionsQ.data, selectedVersionId]);

  // ── Mutations ──
  const cloneDraft = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error('No template');
      const versions = versionsQ.data || [];
      const maxVer = versions.reduce((m, v) => Math.max(m, v.version_number), 0);
      // Try to clone from current published, else latest
      const source =
        versions.find((v) => v.id === selectedTemplate.current_version_id) ||
        versions[0] || null;
      const { data: created, error } = await createContractTemplateVersion<{ id: string }>(
        {
          template_id: selectedTemplate.id,
          version_number: maxVer + 1,
          status: 'draft',
          language_precedence: source?.language_precedence || 'ar',
        },
        '*',
      );
      if (error) throw error;
      // Clone sections + clauses + pricing + required + attachments
      if (source) {
        const { data: secs } = await listContractTemplateSections(source.id);
        const oldToNewSection: Record<string, string> = {};
        for (const s of (secs as unknown as Array<Record<string, unknown> & { id: string }>) || []) {
          const { data: ns, error: se } = await createContractTemplateSection<{ id: string }>({
            version_id: created!.id, section_key: s.section_key, title_ar: s.title_ar,
            title_en: s.title_en, is_required: s.is_required, sort_order: s.sort_order,
          }, 'id');
          if (se) throw se;
          oldToNewSection[s.id] = ns!.id;
        }
        const oldSectionIds = Object.keys(oldToNewSection);
        if (oldSectionIds.length) {
          const { data: cls } = await listContractTemplateClausesBySectionIds(
            oldSectionIds,
            { orderBy: null },
          );
          for (const c of (cls as unknown as Array<Record<string, unknown> & { section_id: string }>) || []) {
            const newSec = oldToNewSection[c.section_id];
            if (!newSec) continue;
            await createContractTemplateClause({
              section_id: newSec, body_ar: c.body_ar, body_en: c.body_en,
              is_mandatory: c.is_mandatory, is_editable_by_provider: c.is_editable_by_provider,
              is_editable_by_client: c.is_editable_by_client, legal_reference: c.legal_reference,
              tags: c.tags, sort_order: c.sort_order,
            });
          }
        }
        const { data: pr } = await listContractTemplatePricingRules(source.id);
        for (const r of (pr as unknown as Array<Record<string, unknown>>) || []) {
          await createContractTemplatePricingRule({
            version_id: created!.id, method: r.method, is_default: r.is_default,
            required_fields: r.required_fields, formula: r.formula, rounding: r.rounding,
            vat_handling: r.vat_handling, display_in_pdf: r.display_in_pdf,
          });
        }
        const { data: rf } = await listContractTemplateRequiredFields(source.id, { orderBy: null });
        for (const f of (rf as unknown as Array<Record<string, unknown>>) || []) {
          await createContractTemplateRequiredField({
            version_id: created!.id, field_key: f.field_key, field_type: f.field_type,
            label_ar: f.label_ar, label_en: f.label_en, help_ar: f.help_ar, help_en: f.help_en,
            enum_values: f.enum_values, is_required: f.is_required, applies_to: f.applies_to,
            validation: f.validation, sort_order: f.sort_order,
          });
        }
        const { data: at } = await listContractTemplateAttachments(source.id, { orderBy: null });
        for (const a of (at as unknown as Array<Record<string, unknown>>) || []) {
          await createContractTemplateAttachment({
            version_id: created!.id, kind: a.kind, title_ar: a.title_ar, title_en: a.title_en,
            file_url: a.file_url, is_mandatory: a.is_mandatory, precedence_order: a.precedence_order,
          });
        }
      }
      return created!.id as string;
    },
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: ['ct-versions', selectedTemplateId] });
      setSelectedVersionId(newId);
      toast.success(isRTL ? 'تم إنشاء مسودة جديدة' : 'Draft version created');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  const archiveTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await updateContractTemplateById(id, {
        archived_at: new Date().toISOString(),
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ct-templates'] });
      toast.success(isRTL ? 'تم الأرشفة' : 'Archived');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  // CT7B: editable only in draft or changes_requested. All review/approval/
  // publication/archival statuses are read-only — UI mirrors the DB child-row
  // guard trigger (TEMPLATE_VERSION_LOCKED).
  const EDITABLE_STATUSES = new Set(['draft', 'changes_requested']);
  const readOnly = !!selectedVersion && !EDITABLE_STATUSES.has(selectedVersion.status);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <header className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isRTL ? 'قوالب العقود' : 'Contract Templates'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'إدارة قوالب العقود الرسمية ونسخها وأقسامها وبنودها وقواعد التسعير.'
                : 'Manage official contract templates, versions, sections, clauses, and pricing rules.'}
            </p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* ── Left: template list ── */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="ps-8" placeholder={isRTL ? 'بحث...' : 'Search...'}
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {templatesQ.isLoading && <div className="text-sm text-muted-foreground p-2">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</div>}
              {templatesQ.error && <div className="text-sm text-red-600 p-2">{isRTL ? 'تعذّر التحميل' : 'Failed to load'}</div>}
              {!templatesQ.isLoading && filteredTemplates.length === 0 && (
                <div className="text-sm text-muted-foreground p-2">{isRTL ? 'لا توجد قوالب' : 'No templates'}</div>
              )}
              <div className="max-h-[70vh] overflow-y-auto space-y-1">
                {filteredTemplates.map((tpl) => {
                  const cv = (versionsQ.data || []).find((v) => v.id === tpl.current_version_id);
                  const cvFromCount = sectionsCountQ.data;
                  const sCount = tpl.current_version_id ? (cvFromCount?.sections[tpl.current_version_id] || 0) : 0;
                  const cCount = tpl.current_version_id ? (cvFromCount?.clauses[tpl.current_version_id] || 0) : 0;
                  const isSel = selectedTemplateId === tpl.id;
                  return (
                    <button key={tpl.id} type="button"
                      onClick={() => { setSelectedTemplateId(tpl.id); setSelectedVersionId(null); }}
                      className={`w-full text-start rounded-md border px-3 py-2 hover:bg-muted/50 transition ${isSel ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{isRTL ? tpl.name_ar : (tpl.name_en || tpl.name_ar)}</span>
                        {tpl.archived_at && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'مؤرشف' : 'archived'}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span dir="ltr">{tpl.slug || '—'}</span>
                        <span>•</span>
                        <span>{tpl.category}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        {cv ? (
                          <Badge variant="outline" className={VERSION_STATUS_META[cv.status]?.cls}>
                            v{cv.version_number} · {isRTL ? VERSION_STATUS_META[cv.status]?.ar : VERSION_STATUS_META[cv.status]?.en}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{isRTL ? 'لا توجد نسخة منشورة' : 'no current'}</Badge>
                        )}
                        <span className="text-muted-foreground">{sCount}§ · {cCount}¶</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Right: detail ── */}
          <div className="space-y-3">
            {!selectedTemplate && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                {isRTL ? 'اختر قالباً من القائمة لعرض تفاصيله.' : 'Select a template from the list to view its details.'}
              </CardContent></Card>
            )}

            {selectedTemplate && (
              <>
                <Card><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">
                      {isRTL ? selectedTemplate.name_ar : (selectedTemplate.name_en || selectedTemplate.name_ar)}
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {selectedTemplate.slug} · {selectedTemplate.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => cloneDraft.mutate()} disabled={cloneDraft.isPending}>
                      <Copy className="h-4 w-4" />{isRTL ? 'إنشاء مسودة' : 'New draft'}
                    </Button>
                    {!selectedTemplate.archived_at && (
                      <Button size="sm" variant="outline" onClick={() => archiveTemplate.mutate(selectedTemplate.id)}>
                        <Archive className="h-4 w-4" />{isRTL ? 'أرشفة' : 'Archive'}
                      </Button>
                    )}
                  </div>
                </CardContent></Card>

                {/* Versions list */}
                <Card><CardContent className="p-4">
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <History className="h-4 w-4" />{isRTL ? 'النسخ' : 'Versions'}
                  </h2>
                  <div className="grid gap-1.5">
                    {(versionsQ.data || []).map((v) => {
                      const meta = VERSION_STATUS_META[v.status];
                      const isCur = selectedTemplate.current_version_id === v.id;
                      return (
                        <button key={v.id} type="button"
                          onClick={() => setSelectedVersionId(v.id)}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50 ${selectedVersionId === v.id ? 'border-primary bg-primary/5' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">v{v.version_number}</span>
                            <Badge variant="outline" className={meta?.cls}>{isRTL ? meta?.ar : meta?.en}</Badge>
                            {isCur && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'الحالية' : 'current'}</Badge>}
                          </div>
                          <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      );
                    })}
                    {versionsQ.data && versionsQ.data.length === 0 && (
                      <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد نسخ بعد.' : 'No versions yet.'}</div>
                    )}
                  </div>
                </CardContent></Card>

                {/* Legal Review (CT7) — gated workflow actions */}
                {selectedVersion && selectedTemplate && (
                  <LegalReviewPanel
                    version={selectedVersion}
                    templateId={selectedTemplate.id}
                    isRTL={isRTL}
                  />
                )}

                {/* Editor tabs */}
                {selectedVersion && (
                  <Card><CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold">
                        {isRTL ? `تحرير v${selectedVersion.version_number}` : `Editing v${selectedVersion.version_number}`}
                        {readOnly && <span className="ms-2 text-xs text-amber-700">{isRTL ? '(للقراءة فقط)' : '(read-only)'}</span>}
                      </h2>
                    </div>
                    <Tabs defaultValue="sections">
                      <TabsList className="flex flex-wrap h-auto">
                        <TabsTrigger value="sections"><ScrollText className="h-4 w-4" />{isRTL ? 'الأقسام والبنود' : 'Sections & Clauses'}</TabsTrigger>
                        <TabsTrigger value="pricing"><Calculator className="h-4 w-4" />{isRTL ? 'التسعير' : 'Pricing'}</TabsTrigger>
                        <TabsTrigger value="fields"><ListChecks className="h-4 w-4" />{isRTL ? 'حقول مطلوبة' : 'Required Fields'}</TabsTrigger>
                        <TabsTrigger value="attachments"><Paperclip className="h-4 w-4" />{isRTL ? 'المرفقات' : 'Attachments'}</TabsTrigger>
                        <TabsTrigger value="preview"><Eye className="h-4 w-4" />{isRTL ? 'استعراض' : 'Preview'}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="sections" className="mt-4">
                        <SectionsClausesPanel versionId={selectedVersion.id} isRTL={isRTL} readOnly={readOnly} />
                      </TabsContent>
                      <TabsContent value="pricing" className="mt-4">
                        <PricingRulesPanel versionId={selectedVersion.id} isRTL={isRTL} readOnly={readOnly} methods={methodsQ.data || []} />
                      </TabsContent>
                      <TabsContent value="fields" className="mt-4">
                        <RequiredFieldsPanel versionId={selectedVersion.id} isRTL={isRTL} readOnly={readOnly} />
                      </TabsContent>
                      <TabsContent value="attachments" className="mt-4">
                        <AttachmentsPanel versionId={selectedVersion.id} isRTL={isRTL} readOnly={readOnly} />
                      </TabsContent>
                      <TabsContent value="preview" className="mt-4">
                        <PreviewPanel versionId={selectedVersion.id} isRTL={isRTL} methods={methodsQ.data || []} />
                      </TabsContent>
                    </Tabs>
                  </CardContent></Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminContractTemplates;