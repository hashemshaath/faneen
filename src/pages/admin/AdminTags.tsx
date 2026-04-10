import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tags, Plus, Pencil, Trash2, Loader2, Search, X, AlertTriangle } from 'lucide-react';

interface TagForm {
  name_ar: string; name_en: string; slug: string; tag_group: string;
  icon: string; color: string; is_active: boolean; sort_order: number;
}

const emptyForm: TagForm = { name_ar: '', name_en: '', slug: '', tag_group: 'general', icon: '', color: '', is_active: true, sort_order: 0 };

const tagGroups = [
  { value: 'general', ar: 'عام', en: 'General' },
  { value: 'products', ar: 'منتجات', en: 'Products' },
  { value: 'materials', ar: 'مواد', en: 'Materials' },
  { value: 'services', ar: 'خدمات', en: 'Services' },
  { value: 'features', ar: 'مميزات', en: 'Features' },
  { value: 'certifications', ar: 'شهادات', en: 'Certifications' },
];

const AdminTags = () => {
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TagForm>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('tag_group').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar.trim(), name_en: form.name_en.trim(),
        slug: form.slug.trim() || form.name_en.trim().toLowerCase().replace(/\s+/g, '-'),
        tag_group: form.tag_group, icon: form.icon || null, color: form.color || null,
        is_active: form.is_active, sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from('tags').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tags').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      closeForm();
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    },
    onError: () => toast.error(isRTL ? 'فشل الحفظ' : 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      setDeletingId(null);
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
    onError: () => toast.error(isRTL ? 'فشل الحذف' : 'Delete failed'),
  });

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const openEdit = (tag: any) => {
    setEditingId(tag.id);
    setForm({ name_ar: tag.name_ar, name_en: tag.name_en, slug: tag.slug, tag_group: tag.tag_group, icon: tag.icon || '', color: tag.color || '', is_active: tag.is_active, sort_order: tag.sort_order });
    setShowForm(true);
    setDeletingId(null);
  };

  const filtered = tags.filter(t =>
    (!search || t.name_ar.includes(search) || t.name_en.toLowerCase().includes(search.toLowerCase())) &&
    (filterGroup === 'all' || t.tag_group === filterGroup)
  );
  const groupCounts = tags.reduce((acc, t) => { acc[t.tag_group] = (acc[t.tag_group] || 0) + 1; return acc; }, {} as Record<string, number>);

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Tags className="w-5 h-5 text-accent" /></div>
              {isRTL ? 'إدارة الوسوم' : 'Tags Management'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{isRTL ? `${tags.length} وسم في ${Object.keys(groupCounts).length} مجموعة` : `${tags.length} tags in ${Object.keys(groupCounts).length} groups`}</p>
          </div>
          {!showForm && (
            <Button onClick={() => { closeForm(); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />{isRTL ? 'وسم جديد' : 'New Tag'}
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editingId ? (isRTL ? 'تعديل الوسم' : 'Edit Tag') : (isRTL ? 'وسم جديد' : 'New Tag')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
                <div><Label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></div>
                <div>
                  <Label>{isRTL ? 'المجموعة' : 'Group'}</Label>
                  <Select value={form.tag_group} onValueChange={v => setForm(f => ({ ...f, tag_group: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tagGroups.map(g => <SelectItem key={g.value} value={g.value}>{isRTL ? g.ar : g.en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>{isRTL ? 'الأيقونة' : 'Icon'}</Label><Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏷️" /></div>
                <div><Label>{isRTL ? 'اللون' : 'Color'}</Label><Input type="color" value={form.color || '#3b82f6'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9" /></div>
                <div><Label>{isRTL ? 'الترتيب' : 'Order'}</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>{isRTL ? 'مفعّل' : 'Active'}</Label></div>
              <div className="flex gap-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar.trim() || !form.name_en.trim() || saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}{isRTL ? 'حفظ' : 'Save'}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inline Delete Confirmation */}
        {deletingId && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'هل أنت متأكد من حذف هذا الوسم؟ لا يمكن التراجع.' : 'Are you sure you want to delete this tag? This cannot be undone.'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(deletingId)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin me-1" />}
                  {isRTL ? 'حذف' : 'Delete'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث...' : 'Search...'} className="ps-10" />
            </div>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع المجموعات' : 'All Groups'}</SelectItem>
                {tagGroups.map(g => <SelectItem key={g.value} value={g.value}>{isRTL ? g.ar : g.en} ({groupCounts[g.value] || 0})</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map(tag => {
              const group = tagGroups.find(g => g.value === tag.tag_group);
              return (
                <Card key={tag.id} className={`transition-colors ${!tag.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {tag.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
                      {tag.icon && <span className="text-sm">{tag.icon}</span>}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{isRTL ? tag.name_ar : tag.name_en}</p>
                        <p className="text-[10px] text-muted-foreground">{group ? (isRTL ? group.ar : group.en) : tag.tag_group}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tag)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(tag.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && <Card className="col-span-full"><CardContent className="p-12 text-center text-muted-foreground">{isRTL ? 'لا توجد وسوم' : 'No tags'}</CardContent></Card>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminTags;
