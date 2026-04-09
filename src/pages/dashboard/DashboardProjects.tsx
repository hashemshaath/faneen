import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FolderOpen, Calendar, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';

const DashboardProjects = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    cover_image_url: '', client_name: '', project_cost: '',
    duration_days: '', completion_date: '', status: 'published',
  });

  const resetForm = () => {
    setForm({ title_ar: '', title_en: '', description_ar: '', description_en: '', cover_image_url: '', client_name: '', project_cost: '', duration_days: '', completion_date: '', status: 'published' });
    setEditId(null);
  };

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['dashboard-projects', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('business_id', business!.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: business!.id,
        title_ar: form.title_ar,
        title_en: form.title_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        cover_image_url: form.cover_image_url || null,
        client_name: form.client_name || null,
        project_cost: form.project_cost ? Number(form.project_cost) : null,
        duration_days: form.duration_days ? Number(form.duration_days) : null,
        completion_date: form.completion_date || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const openEdit = (p: any) => {
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', cover_image_url: p.cover_image_url || '',
      client_name: p.client_name || '', project_cost: p.project_cost?.toString() || '',
      duration_days: p.duration_days?.toString() || '', completion_date: p.completion_date || '',
      status: p.status,
    });
    setEditId(p.id);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-gold" />
              {isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'اعرض مشاريعك المنجزة للعملاء' : 'Showcase your completed projects'}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة مشروع' : 'Add Project'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? (isRTL ? 'تعديل المشروع' : 'Edit Project') : (isRTL ? 'إضافة مشروع جديد' : 'Add New Project')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? 'العنوان (عربي)' : 'Title (AR)'} *</Label><Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} /></div>
                  <div><Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label><Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" /></div>
                </div>
                <div><Label>{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} /></div>
                <div><Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label><Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} dir="ltr" /></div>
                <div>
                  <Label>{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                  <ImageUpload
                    bucket="project-images"
                    value={form.cover_image_url}
                    onChange={(url) => setForm(f => ({ ...f, cover_image_url: url }))}
                    onRemove={() => setForm(f => ({ ...f, cover_image_url: '' }))}
                    placeholder={isRTL ? 'اضغط لرفع صورة الغلاف' : 'Click to upload cover image'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? 'اسم العميل' : 'Client Name'}</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} /></div>
                  <div><Label>{isRTL ? 'التكلفة (ر.س)' : 'Cost (SAR)'}</Label><Input type="number" value={form.project_cost} onChange={e => setForm(f => ({ ...f, project_cost: e.target.value }))} dir="ltr" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? 'المدة (أيام)' : 'Duration (days)'}</Label><Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} dir="ltr" /></div>
                  <div><Label>{isRTL ? 'تاريخ الإنجاز' : 'Completion Date'}</Label><Input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} dir="ltr" /></div>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} className="w-full" variant="hero">
                  {saveMutation.isPending ? '...' : (editId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add'))}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isRTL ? 'لا توجد مشاريع بعد' : 'No projects yet'}</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
              <Card key={p.id} className="overflow-hidden border-border/50 hover:border-gold/30 transition-colors">
                {p.cover_image_url && (
                  <div className="aspect-video bg-muted">
                    <img src={p.cover_image_url} alt={p.title_ar} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-heading font-bold">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.project_cost && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR</span>}
                    {p.duration_days && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}</span>}
                    {p.completion_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.completion_date}</span>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardProjects;
