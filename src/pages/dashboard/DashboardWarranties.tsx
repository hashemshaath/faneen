import React, { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, Plus, Pencil, Trash2, X, Calendar, CheckCircle2, Clock, AlertTriangle, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<string, { color: string; label_ar: string; label_en: string; icon: React.ElementType }> = {
  active: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'ساري', label_en: 'Active', icon: CheckCircle2 },
  expired: { color: 'bg-muted text-muted-foreground', label_ar: 'منتهي', label_en: 'Expired', icon: Clock },
  claimed: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'مُطالب به', label_en: 'Claimed', icon: AlertTriangle },
  void: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label_ar: 'ملغي', label_en: 'Void', icon: X },
};

const DashboardWarranties = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyForm = {
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    coverage_ar: '', coverage_en: '', warranty_type: 'standard' as string,
    start_date: '', end_date: '', contract_id: '',
  };
  const [form, setForm] = useState(emptyForm);

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  // Get contracts where user is provider
  const { data: contracts = [] } = useQuery({
    queryKey: ['provider-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('id, title_ar, title_en, contract_number')
        .eq('provider_id', user!.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const contractIds = contracts.map(c => c.id);

  const { data: warranties = [], isLoading } = useQuery({
    queryKey: ['dashboard-warranties', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('warranties').select('*')
        .in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return warranties;
    const q = searchQuery.toLowerCase();
    return warranties.filter((w) =>
      w.title_ar.toLowerCase().includes(q) || (w.title_en || '').toLowerCase().includes(q)
    );
  }, [warranties, searchQuery]);

  const stats = useMemo(() => ({
    total: warranties.length,
    active: warranties.filter((w) => w.status === 'active').length,
    expired: warranties.filter((w) => w.status === 'expired').length,
  }), [warranties]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        contract_id: form.contract_id,
        warranty_type: form.warranty_type as any,
        title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        coverage_ar: form.coverage_ar || null, coverage_en: form.coverage_en || null,
        start_date: form.start_date, end_date: form.end_date,
      };
      if (editId) {
        const { error } = await supabase.from('warranties').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('warranties').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-warranties'] });
      toast.success(editId ? (isRTL ? 'تم تحديث الضمان' : 'Warranty updated') : (isRTL ? 'تم إضافة الضمان' : 'Warranty added'));
      closeForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('warranties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-warranties'] });
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم حذف الضمان' : 'Warranty deleted');
    },
  });

  const openEdit = (w) => {
    setForm({
      title_ar: w.title_ar, title_en: w.title_en || '', description_ar: w.description_ar || '',
      description_en: w.description_en || '', coverage_ar: w.coverage_ar || '', coverage_en: w.coverage_en || '',
      warranty_type: w.warranty_type, start_date: w.start_date, end_date: w.end_date, contract_id: w.contract_id,
    });
    setEditId(w.id);
    setShowForm(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              {isRTL ? 'إدارة الضمانات' : 'Warranty Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'إدارة ومتابعة ضمانات العقود والخدمات' : 'Manage and track contract and service warranties'}
            </p>
          </div>
          {!showForm && (
            <Button variant="default" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-2" />{isRTL ? 'إضافة ضمان' : 'Add Warranty'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {warranties.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي الضمانات' : 'Total'}</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">{isRTL ? 'ساري' : 'Active'}</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Clock className="w-5 h-5 text-muted-foreground" /></div>
                <div><p className="text-2xl font-bold">{stats.expired}</p><p className="text-xs text-muted-foreground">{isRTL ? 'منتهي' : 'Expired'}</p></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        {warranties.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={isRTL ? 'ابحث في الضمانات...' : 'Search warranties...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {editId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editId ? (isRTL ? 'تعديل الضمان' : 'Edit Warranty') : (isRTL ? 'إضافة ضمان جديد' : 'Add New Warranty')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Contract & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'العقد' : 'Contract'} <span className="text-destructive">*</span></Label>
                  <Select value={form.contract_id} onValueChange={(v) => setForm(f => ({ ...f, contract_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر العقد' : 'Select contract'} /></SelectTrigger>
                    <SelectContent>
                      {contracts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {isRTL ? c.title_ar : (c.title_en || c.title_ar)} ({c.contract_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'نوع الضمان' : 'Warranty Type'}</Label>
                  <Select value={form.warranty_type} onValueChange={(v) => setForm(f => ({ ...f, warranty_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">{isRTL ? 'قياسي' : 'Standard'}</SelectItem>
                      <SelectItem value="extended">{isRTL ? 'ممتد' : 'Extended'}</SelectItem>
                      <SelectItem value="limited">{isRTL ? 'محدود' : 'Limited'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title fields with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'عنوان الضمان (عربي)' : 'Warranty Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_ar: v }))} />
                  </div>
                  <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} placeholder={isRTL ? 'مثال: ضمان تركيب النوافذ' : 'e.g. Window installation warranty'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'عنوان الضمان (إنجليزي)' : 'Warranty Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, title_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, title_en: v }))} />
                  </div>
                  <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" placeholder="e.g. Window installation warranty" />
                </div>
              </div>

              {/* Description with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} placeholder={isRTL ? 'وصف تفصيلي للضمان...' : 'Detailed warranty description...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} dir="ltr" placeholder="Detailed warranty description..." />
                </div>
              </div>

              {/* Coverage with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'نطاق التغطية (عربي)' : 'Coverage (Arabic)'}</Label>
                    <FieldAiActions value={form.coverage_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, coverage_en: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, coverage_ar: v }))} />
                  </div>
                  <Textarea value={form.coverage_ar} onChange={e => setForm(f => ({ ...f, coverage_ar: e.target.value }))} rows={2} placeholder={isRTL ? 'ما يشمله الضمان...' : 'What the warranty covers...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'نطاق التغطية (إنجليزي)' : 'Coverage (English)'}</Label>
                    <FieldAiActions value={form.coverage_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, coverage_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, coverage_en: v }))} />
                  </div>
                  <Textarea value={form.coverage_en} onChange={e => setForm(f => ({ ...f, coverage_en: e.target.value }))} rows={2} dir="ltr" placeholder="What the warranty covers..." />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ البداية' : 'Start Date'} <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الانتهاء' : 'End Date'} <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} dir="ltr" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || !form.contract_id || !form.start_date || !form.end_date || saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editId ? (isRTL ? 'تحديث الضمان' : 'Update Warranty') : (isRTL ? 'إضافة الضمان' : 'Add Warranty')}
                  {!saveMutation.isPending && <CheckCircle2 className="w-4 h-4 ms-2" />}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warranties List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : warranties.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد ضمانات بعد' : 'No warranties yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {isRTL ? 'أضف ضمانات لعقودك لتعزيز الثقة مع العملاء' : 'Add warranties to your contracts to build client trust'}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول ضمان' : 'Add First Warranty'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((w) => {
              const cfg = statusConfig[w.status] || statusConfig.active;
              const StatusIcon = cfg.icon;
              const contractData = contracts.find(c => c.id === w.contract_id);
              return (
                <Card key={w.id} className="border-border/40 hover:border-primary/30 transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-semibold text-sm">{isRTL ? w.title_ar : (w.title_en || w.title_ar)}</h3>
                          <Badge className={`${cfg.color} gap-1 text-[9px]`}>
                            <StatusIcon className="w-3 h-3" />
                            {isRTL ? cfg.label_ar : cfg.label_en}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">
                            {(w.warranty_type as string) === 'standard' ? (isRTL ? 'قياسي' : 'Standard') :
                             w.warranty_type === 'extended' ? (isRTL ? 'ممتد' : 'Extended') : (isRTL ? 'محدود' : 'Limited')}
                          </Badge>
                        </div>
                        {(isRTL ? w.description_ar : (w.description_en || w.description_ar)) && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {isRTL ? w.description_ar : (w.description_en || w.description_ar)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(w.start_date)} → {formatDate(w.end_date)}
                          </span>
                          {contractData && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {isRTL ? contractData.title_ar : (contractData.title_en || contractData.title_ar)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(w)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(w.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف الضمان' : 'Delete Warranty'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? 'هل أنت متأكد من حذف هذا الضمان؟' : 'Are you sure you want to delete this warranty?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DashboardWarranties;
