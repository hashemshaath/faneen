/**
 * AdminHomeFaq — manage homepage FAQ (home_faq_items).
 * Inline forms only (no popups), per project UX rules.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, X } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import {
  useAdminHomeFaq, createHomeFaq, updateHomeFaq, deleteHomeFaq,
  HOME_FAQ_ADMIN_KEY, HOME_FAQ_PUBLIC_KEY,
  type HomeFaqItem, type HomeFaqInput,
} from '@/modules/home';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

  const renderForm = (key: DraftKey, draft: HomeFaqInput, onSave: () => void) => (
    <div className="space-y-3 border-t border-border/60 pt-3 mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{bi('السؤال (عربي)', 'Question (Arabic)')} *</Label>
          <Input dir="auto" value={draft.question_ar} onChange={(e) => setEditing((p) => ({ ...p, [key]: { ...draft, question_ar: e.target.value } }))} maxLength={180} />
          <div className="text-[10px] text-muted-foreground mt-1">{draft.question_ar.length}/180</div>
        </div>
        <div>
          <Label>{bi('السؤال (إنجليزي)', 'Question (English)')}</Label>
          <Input dir="auto" value={draft.question_en ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [key]: { ...draft, question_en: e.target.value } }))} maxLength={180} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{bi('الإجابة (عربي)', 'Answer (Arabic)')} *</Label>
          <Textarea dir="auto" rows={3} value={draft.answer_ar} onChange={(e) => setEditing((p) => ({ ...p, [key]: { ...draft, answer_ar: e.target.value } }))} maxLength={1200} />
          <div className="text-[10px] text-muted-foreground mt-1">{draft.answer_ar.length}/1200</div>
        </div>
        <div>
          <Label>{bi('الإجابة (إنجليزي)', 'Answer (English)')}</Label>
          <Textarea dir="auto" rows={3} value={draft.answer_en ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [key]: { ...draft, answer_en: e.target.value } }))} maxLength={1200} />
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs">{bi('الترتيب', 'Order')}</Label>
          <Input type="number" className="h-9 w-24" value={draft.sort_order ?? 0} onChange={(e) => setEditing((p) => ({ ...p, [key]: { ...draft, sort_order: Number(e.target.value) } }))} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={draft.is_enabled ?? true} onCheckedChange={(v) => setEditing((p) => ({ ...p, [key]: { ...draft, is_enabled: v } }))} />
          <span className="text-xs">{bi('مفعّل', 'Enabled')}</span>
        </div>
        <div className="ms-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => cancelEdit(key)}><X className="w-4 h-4 me-1" />{bi('إلغاء', 'Cancel')}</Button>
          <Button size="sm" onClick={() => {
            const err = validate(draft, bi);
            if (err) { toast.error(err); return; }
            onSave();
          }} disabled={createMut.isPending || updateMut.isPending}>
            {(createMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
            {bi('حفظ', 'Save')}
          </Button>
        </div>
      </div>
    </div>
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

        <div className="space-y-3">
          {items?.map((it) => {
            const draft = editing[it.id];
            return (
              <Card key={it.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(it, -1)}><ArrowUp className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(it, 1)}><ArrowDown className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{it.question_ar}</span>
                        <Badge variant="outline" className="text-[10px]">#{it.sort_order}</Badge>
                        {it.is_enabled
                          ? <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700">{bi('مفعّل', 'Enabled')}</Badge>
                          : <Badge variant="secondary" className="text-[10px]">{bi('مخفي', 'Hidden')}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.answer_ar}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title={it.is_enabled ? bi('إخفاء','Hide') : bi('إظهار','Show')}
                        onClick={() => updateMut.mutate({ id: it.id, patch: { is_enabled: !it.is_enabled } })}>
                        {it.is_enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => (draft ? cancelEdit(it.id) : startEdit(it))}>
                        {draft ? bi('إغلاق', 'Close') : bi('تعديل', 'Edit')}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                        if (confirm(bi('حذف هذا السؤال؟','Delete this question?'))) deleteMut.mutate(it.id);
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {draft && renderForm(it.id, draft, () => updateMut.mutate({ id: it.id, patch: draft }))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminHomeFaq;