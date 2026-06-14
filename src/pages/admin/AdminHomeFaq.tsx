/**
 * AdminHomeFaq — manage homepage FAQ (home_faq_items).
 * Inline forms only (no popups), per project UX rules.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  useAdminHomeFaq, createHomeFaq, updateHomeFaq, deleteHomeFaq,
  HOME_FAQ_ADMIN_KEY, HOME_FAQ_PUBLIC_KEY,
  type HomeFaqItem, type HomeFaqInput,
} from '@/modules/home';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HomeFaqStatsSection,
  HomeFaqListSection,
  HomeFaqRow,
  HomeFaqEditForm,
} from '@/components/admin/content/home';

type DraftKey = 'new' | string;

function validate(d: HomeFaqInput, bi: ReturnType<typeof useBi>) {
  if (d.question_ar.trim().length < 5 || d.question_ar.length > 180) {
    return bi('السؤال (عربي) يجب أن يكون بين 5 و180 حرف', 'Arabic question must be 5-180 chars');
  }
  if (d.answer_ar.trim().length < 10 || d.answer_ar.length > 1200) {
    return bi('الإجابة (عربي) يجب أن تكون بين 10 و1200 حرف', 'Arabic answer must be 10-1200 chars');
  }
  if (d.question_en && d.question_en.length > 180) return bi('السؤال (إنجليزي) يجب ألا يتجاوز 180 حرف', 'English question must be ≤180 chars');
  if (d.answer_en && d.answer_en.length > 1200) return bi('الإجابة (إنجليزي) يجب ألا تتجاوز 1200 حرف', 'English answer must be ≤1200 chars');
  return null;
}

const AdminHomeFaq: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const { data: items, isLoading } = useAdminHomeFaq();

  const [editing, setEditing] = useState<Record<DraftKey, HomeFaqInput>>({});

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: HOME_FAQ_ADMIN_KEY });
    qc.invalidateQueries({ queryKey: HOME_FAQ_PUBLIC_KEY });
  };

  const createMut = useMutation({
    mutationFn: (d: HomeFaqInput) => createHomeFaq(d),
    onSuccess: () => {
      toast.success(bi('تمت الإضافة', 'Created'));
      setEditing((p) => { const n = { ...p }; delete n.new; return n; });
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<HomeFaqInput> }) => updateHomeFaq(id, patch),
    onSuccess: (_d, vars) => {
      toast.success(bi('تم الحفظ', 'Saved'));
      setEditing((p) => { const n = { ...p }; delete n[vars.id]; return n; });
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHomeFaq(id),
    onSuccess: () => { toast.success(bi('تم الحذف', 'Deleted')); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const startNew = () => setEditing((p) => ({
    ...p,
    new: { sort_order: ((items?.[items.length - 1]?.sort_order ?? 0) + 10), question_ar: '', answer_ar: '', question_en: '', answer_en: '', is_enabled: true },
  }));

  const startEdit = (it: HomeFaqItem) => setEditing((p) => ({
    ...p,
    [it.id]: {
      sort_order: it.sort_order, is_enabled: it.is_enabled,
      question_ar: it.question_ar, answer_ar: it.answer_ar,
      question_en: it.question_en ?? '', answer_en: it.answer_en ?? '',
    },
  }));

  const cancelEdit = (key: DraftKey) => setEditing((p) => { const n = { ...p }; delete n[key]; return n; });

  const move = (it: HomeFaqItem, dir: -1 | 1) => {
    if (!items) return;
    const idx = items.findIndex((x) => x.id === it.id);
    const neighbor = items[idx + dir];
    if (!neighbor) return;
    updateMut.mutate({ id: it.id, patch: { sort_order: neighbor.sort_order } });
    updateMut.mutate({ id: neighbor.id, patch: { sort_order: it.sort_order } });
  };

  const enabledCount = (items ?? []).filter((i) => i.is_enabled).length;
  const hiddenCount = (items ?? []).length - enabledCount;
  const rowLabels = {
    enabled: bi('مفعّل', 'Enabled'),
    hidden: bi('مخفي', 'Hidden'),
    hide: bi('إخفاء', 'Hide'),
    show: bi('إظهار', 'Show'),
    edit: bi('تعديل', 'Edit'),
    close: bi('إغلاق', 'Close'),
    delete: bi('حذف', 'Delete'),
    moveUp: 'Move up',
    moveDown: 'Move down',
  };
  const formLabels = {
    questionAr: bi('السؤال (عربي)', 'Question (Arabic)'),
    questionEn: bi('السؤال (إنجليزي)', 'Question (English)'),
    answerAr: bi('الإجابة (عربي)', 'Answer (Arabic)'),
    answerEn: bi('الإجابة (إنجليزي)', 'Answer (English)'),
    order: bi('الترتيب', 'Order'),
    enabled: bi('مفعّل', 'Enabled'),
    cancel: bi('إلغاء', 'Cancel'),
    save: bi('حفظ', 'Save'),
  };

  const renderForm = (key: DraftKey, draft: HomeFaqInput, onSave: () => void) => (
    <HomeFaqEditForm
      draft={draft}
      isSaving={createMut.isPending || updateMut.isPending}
      onChange={(patch) => setEditing((p) => ({ ...p, [key]: { ...draft, ...patch } }))}
      onCancel={() => cancelEdit(key)}
      onSave={() => {
        const err = validate(draft, bi);
        if (err) { toast.error(err); return; }
        onSave();
      }}
      labels={formLabels}
    />
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{bi('أسئلة الصفحة الرئيسية', 'Homepage FAQ')}</h1>
            <p className="text-sm text-muted-foreground">{bi('تُعرض في قسم الأسئلة الشائعة بالصفحة الرئيسية. الترتيب تصاعدي.', 'Shown in the homepage FAQ section. Sorted ascending.')}</p>
          </div>
          <Button onClick={startNew} disabled={!!editing.new}>
            <Plus className="w-4 h-4 me-1" />{bi('إضافة سؤال', 'Add question')}
          </Button>
        </div>

        {!isLoading && items && (
          <HomeFaqStatsSection
            isRTL={isRTL}
            total={items.length}
            enabled={enabledCount}
            hidden={hiddenCount}
          />
        )}

        {editing.new && (
          <Card>
            <CardHeader><CardTitle className="text-base">{bi('سؤال جديد', 'New question')}</CardTitle></CardHeader>
            <CardContent>
              {renderForm('new', editing.new, () => createMut.mutate(editing.new))}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        )}

        {!isLoading && items && items.length === 0 && !editing.new && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            {bi('لا توجد أسئلة بعد. عند الإضافة ستظهر في الصفحة الرئيسية.', 'No FAQs yet. They will appear on the homepage once added.')}
          </CardContent></Card>
        )}

        <HomeFaqListSection>
          {items?.map((it, idx) => {
            const draft = editing[it.id];
            return (
              <HomeFaqRow
                key={it.id}
                isRTL={isRTL}
                item={it}
                canUp={idx > 0}
                canDown={!!items && idx < items.length - 1}
                isEditing={!!draft}
                onMoveUp={() => move(it, -1)}
                onMoveDown={() => move(it, 1)}
                onToggleVisible={() => updateMut.mutate({ id: it.id, patch: { is_enabled: !it.is_enabled } })}
                onEditToggle={() => (draft ? cancelEdit(it.id) : startEdit(it))}
                onDelete={() => {
                  if (confirm(bi('حذف هذا السؤال؟','Delete this question?'))) deleteMut.mutate(it.id);
                }}
                labels={rowLabels}
                editForm={draft && renderForm(it.id, draft, () => updateMut.mutate({ id: it.id, patch: draft }))}
              />
            );
          })}
        </HomeFaqListSection>
      </div>
    </DashboardLayout>
  );
};

export default AdminHomeFaq;