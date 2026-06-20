/**
 * KNOWLEDGE ADMIN MANAGEMENT — Phase 3.
 *
 * Read-only management surface for the unified knowledge registry.
 * - Reads exclusively from `@/modules/knowledge` (no DB/RPC/edge).
 * - No create/edit/delete in this phase. CRUD buttons are disabled
 *   stubs labelled "ستضاف لاحقًا".
 */
import React, { useMemo, useState } from 'react';
import { BookOpen, Search, ExternalLink, Bot, MessageSquare, ShieldAlert, Languages, Eye, X } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SupportRepliesPanel from '@/components/admin/knowledge/SupportRepliesPanel';
import AssistantPreviewPanel from '@/components/admin/knowledge/AssistantPreviewPanel';
import {
  knowledgeRegistry,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeItem,
  KNOWLEDGE_ADMIN_TABS,
  getKnowledgeAdminTab,
  type KnowledgeAdminTabId,
  computeKnowledgeAdminMetrics,
  applyKnowledgeAdminFilters,
  DEFAULT_KNOWLEDGE_ADMIN_FILTERS,
  KNOWLEDGE_TYPE_OPTIONS,
  KNOWLEDGE_STATUS_OPTIONS,
  KNOWLEDGE_AUDIENCE_OPTIONS,
  toKnowledgeAdminRowVM,
} from '@/modules/knowledge';

const FUTURE_HINT = 'إدارة التحرير ستضاف في مرحلة لاحقة.';

const AdminKnowledgeCenter: React.FC = () => {
  useNoIndex();
  const [section, setSection] = useState<'library' | 'support_replies' | 'assistant_preview'>('library');
  const [tab, setTab] = useState<KnowledgeAdminTabId>('all');
  const [filters, setFilters] = useState(DEFAULT_KNOWLEDGE_ADMIN_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const metrics = useMemo(() => computeKnowledgeAdminMetrics(knowledgeRegistry), []);
  const tabItems = useMemo(
    () => getKnowledgeAdminTab(tab).select(knowledgeRegistry),
    [tab],
  );
  const visible = useMemo(
    () => applyKnowledgeAdminFilters(tabItems, filters),
    [tabItems, filters],
  );
  const selected: KnowledgeItem | null = useMemo(
    () => (selectedId ? knowledgeRegistry.find((i) => i.id === selectedId) ?? null : null),
    [selectedId],
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        <AdminPageHeader
          title="إدارة مكتبة المعرفة"
          subtitle="مركز موحد لمراجعة محتوى المساعدة، الأسئلة الشائعة، مواد المساعد الذكي، ونصوص المراسلات."
          icon={BookOpen}
          tone="accent"
          actions={
            <div className="flex items-center gap-2">
              <Button disabled variant="outline" size="sm" title={FUTURE_HINT}>إضافة مقال</Button>
              <Button disabled variant="outline" size="sm" title={FUTURE_HINT}>تعديل</Button>
            </div>
          }
        />

        <Tabs value={section} onValueChange={(v) => setSection(v as typeof section)}>
          <TabsList>
            <TabsTrigger value="library" data-testid="knowledge-admin-section-library">مكتبة المعرفة</TabsTrigger>
            <TabsTrigger value="support_replies" data-testid="knowledge-admin-section-support-replies">ردود الدعم</TabsTrigger>
              <TabsTrigger value="assistant_preview" data-testid="knowledge-admin-section-assistant-preview">اختبار المساعد</TabsTrigger>
          </TabsList>
          <TabsContent value="support_replies" className="mt-4">
            <SupportRepliesPanel />
          </TabsContent>
            <TabsContent value="assistant_preview" className="mt-4">
              <AssistantPreviewPanel />
            </TabsContent>
          <TabsContent value="library" className="mt-4 space-y-4">

        {/* KPI strip */}
        <section aria-label="Knowledge metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
          <KpiTile label="إجمالي العناصر" value={metrics.total} tone="bg-card border-border" />
          <KpiTile label="منشور" value={metrics.published} tone="bg-success/10 border-success/30 text-success" />
          <KpiTile label="داخلي" value={metrics.internal} tone="bg-muted/40 border-border text-foreground" />
          <KpiTile label="المساعد الذكي" value={metrics.assistantReady} tone="bg-info/10 border-info/30 text-info" icon={Bot} />
          <KpiTile label="المراسلات" value={metrics.messagesReady} tone="bg-accent/15 border-accent/30 text-accent-foreground" icon={MessageSquare} />
          <KpiTile label="بدون ترجمة" value={metrics.missingEnglish} tone="bg-warning/10 border-warning/30 text-warning" icon={Languages} />
          <KpiTile label="بحاجة مراجعة" value={metrics.needsReview} tone="bg-destructive/10 border-destructive/30 text-destructive" icon={ShieldAlert} />
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as KnowledgeAdminTabId)} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {KNOWLEDGE_ADMIN_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} data-testid={`knowledge-admin-tab-${t.id}`}>
                {t.labelAr}
              </TabsTrigger>
            ))}
          </TabsList>

          {KNOWLEDGE_ADMIN_TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="space-y-4">
              {/* Filters */}
              <Card className="border-border/60">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      placeholder="ابحث في العنوان، الملخص، الوسوم، المعرف…"
                      className="ps-9 h-10"
                      dir="auto"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    <FilterSelect
                      label="القسم"
                      value={filters.categoryId}
                      onChange={(v) => setFilters({ ...filters, categoryId: v as typeof filters.categoryId })}
                      options={[{ value: 'all', label: 'كل الأقسام' }, ...KNOWLEDGE_CATEGORIES.map((c) => ({ value: c.id, label: c.title.ar }))]}
                    />
                    <FilterSelect
                      label="الجمهور"
                      value={filters.audience}
                      onChange={(v) => setFilters({ ...filters, audience: v as typeof filters.audience })}
                      options={[{ value: 'all', label: 'الكل' }, ...KNOWLEDGE_AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.ar }))]}
                    />
                    <FilterSelect
                      label="النوع"
                      value={filters.type}
                      onChange={(v) => setFilters({ ...filters, type: v as typeof filters.type })}
                      options={[{ value: 'all', label: 'الكل' }, ...KNOWLEDGE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.ar }))]}
                    />
                    <FilterSelect
                      label="الحالة"
                      value={filters.status}
                      onChange={(v) => setFilters({ ...filters, status: v as typeof filters.status })}
                      options={[{ value: 'all', label: 'الكل' }, ...KNOWLEDGE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.ar }))]}
                    />
                    <FilterSelect
                      label="المساعد"
                      value={filters.usableByAssistant}
                      onChange={(v) => setFilters({ ...filters, usableByAssistant: v as typeof filters.usableByAssistant })}
                      options={[
                        { value: 'any', label: 'الكل' },
                        { value: 'yes', label: 'قابل للاستخدام' },
                        { value: 'no', label: 'غير مخصص' },
                      ]}
                    />
                    <FilterSelect
                      label="الرسائل"
                      value={filters.usableInMessages}
                      onChange={(v) => setFilters({ ...filters, usableInMessages: v as typeof filters.usableInMessages })}
                      options={[
                        { value: 'any', label: 'الكل' },
                        { value: 'yes', label: 'قابل للاستخدام' },
                        { value: 'no', label: 'غير مخصص' },
                      ]}
                    />
                    <FilterSelect
                      label="الظهور"
                      value={filters.visibility}
                      onChange={(v) => setFilters({ ...filters, visibility: v as typeof filters.visibility })}
                      options={[
                        { value: 'any', label: 'الكل' },
                        { value: 'public', label: 'عام' },
                        { value: 'internal', label: 'داخلي' },
                      ]}
                    />
                    <div className="flex items-end">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setFilters(DEFAULT_KNOWLEDGE_ADMIN_FILTERS)}
                        className="h-9 w-full"
                      >
                        مسح الفلاتر
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{FUTURE_HINT}</p>
                </CardContent>
              </Card>

              {/* List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-2" data-testid="knowledge-admin-list">
                  <p className="text-xs text-muted-foreground tabular-nums tech-content">
                    {visible.length} عنصر
                  </p>
                  {visible.length === 0 && (
                    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">لا توجد عناصر مطابقة.</CardContent></Card>
                  )}
                  {visible.map((item) => {
                    const vm = toKnowledgeAdminRowVM(item);
                    const active = vm.id === selectedId;
                    return (
                      <button
                        type="button"
                        key={vm.id}
                        onClick={() => setSelectedId(vm.id)}
                        aria-pressed={active}
                        data-testid={`knowledge-admin-row-${vm.id}`}
                        className={[
                          'w-full text-start rounded-2xl border p-3 transition-all hover-lift',
                          active ? 'border-primary/60 bg-primary/5' : 'border-border/60 bg-card',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-snug truncate">{vm.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              {vm.categoryLabel} · {vm.typeLabel} · {vm.audienceLabels.join('، ')}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 shrink-0">
                            <StatusPill label={vm.statusLabel} tone={vm.isInternal ? 'muted' : 'success'} />
                            {vm.usableByAssistant && <ChipIcon icon={Bot} label="المساعد" tone="info" />}
                            {vm.usableInMessages && <ChipIcon icon={MessageSquare} label="رسائل" tone="accent" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Preview panel */}
                <aside className="lg:sticky lg:top-20 self-start">
                  <Card className="border-border/60">
                    <CardContent className="p-4">
                      {!selected ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                          اختر عنصرًا لمعاينته.
                        </p>
                      ) : (
                        <PreviewPanel item={selected} onClose={() => setSelectedId(null)} />
                      )}
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </TabsContent>
          ))}
        </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

/* ──────────────────────────── building blocks ──────────────────────────── */

const KpiTile: React.FC<{
  label: string;
  value: number;
  tone: string;
  icon?: React.ElementType;
}> = ({ label, value, tone, icon: Icon }) => (
  <div className={`rounded-2xl border p-3 ${tone}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wide opacity-80">{label}</span>
      {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
    </div>
    <p className="mt-1 text-xl font-bold tabular-nums tech-content">{value}</p>
  </div>
);

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}> = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const StatusPill: React.FC<{ label: string; tone: 'success' | 'muted' }> = ({ label, tone }) => (
  <span className={[
    'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold',
    tone === 'success' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
  ].join(' ')}>{label}</span>
);

const ChipIcon: React.FC<{ icon: React.ElementType; label: string; tone: 'info' | 'accent' }> = ({ icon: Icon, label, tone }) => (
  <span className={[
    'inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold',
    tone === 'info' ? 'bg-info/15 text-info' : 'bg-accent/15 text-accent-foreground',
  ].join(' ')}>
    <Icon className="h-3 w-3" />
    {label}
  </span>
);

const PreviewPanel: React.FC<{ item: KnowledgeItem; onClose: () => void }> = ({ item, onClose }) => {
  const vm = toKnowledgeAdminRowVM(item);
  return (
    <div className="space-y-3" data-testid="knowledge-admin-preview">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{vm.categoryLabel} · {vm.typeLabel}</p>
          <h2 className="font-heading font-bold text-base leading-snug mt-1">{item.title.ar}</h2>
          {item.title.en && <p className="text-xs text-muted-foreground mt-0.5">{item.title.en}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق المعاينة"><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill label={vm.statusLabel} tone={vm.isInternal ? 'muted' : 'success'} />
        {vm.usableByAssistant && <ChipIcon icon={Bot} label="المساعد" tone="info" />}
        {vm.usableInMessages && <ChipIcon icon={MessageSquare} label="رسائل" tone="accent" />}
        {vm.audienceLabels.map((a) => (
          <Badge key={a} variant="outline" className="text-[10px] h-5">{a}</Badge>
        ))}
      </div>
      {item.summary?.ar && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">الملخص</p>
          <p className="text-sm leading-relaxed mt-1">{item.summary.ar}</p>
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">النص</p>
        <p className="text-sm leading-relaxed mt-1 whitespace-pre-line">{item.body.ar}</p>
      </div>
      {item.tags.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">الوسوم</p>
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
          </div>
        </div>
      )}
      <div className="text-xs space-y-1 pt-2 border-t border-border/60">
        <p><span className="text-muted-foreground">المعرف: </span><span className="tech-content">{item.id}</span></p>
        <p data-testid="knowledge-admin-preview-source"><span className="text-muted-foreground">المصدر: </span><span className="tech-content">{item.source}</span></p>
        {vm.relatedRoutes.length > 0 && (
          <div data-testid="knowledge-admin-preview-routes">
            <p className="text-muted-foreground mb-1">مسارات ذات صلة:</p>
            <ul className="space-y-0.5">
              {vm.relatedRoutes.map((r) => (
                <li key={r} className="flex items-center gap-1.5">
                  <ExternalLink className="h-3 w-3 opacity-70" />
                  <span className="tech-content">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {vm.updatedAt && <p><span className="text-muted-foreground">آخر تحديث: </span><span className="tech-content">{vm.updatedAt}</span></p>}
      </div>
      <div className="pt-3 border-t border-border/60 flex items-center gap-2">
        <Button disabled size="sm" variant="outline" title={FUTURE_HINT}><Eye className="h-3.5 w-3.5 me-1" />تعديل</Button>
        <p className="text-[11px] text-muted-foreground">{FUTURE_HINT}</p>
      </div>
    </div>
  );
};

export default AdminKnowledgeCenter;