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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Pencil, FolderOpen, Calendar, DollarSign, Clock,
  Images, X, Search, CheckCircle2, Eye, LayoutGrid, LayoutList,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ViewMode = 'grid' | 'list';

const DashboardProjects = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [galleryProjectId, setGalleryProjectId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const emptyForm = {
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    cover_image_url: '', client_name: '', project_cost: '',
    duration_days: '', completion_date: '', status: 'published',
  };
  const [form, setForm] = useState(emptyForm);

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

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
      const { data, error } = await supabase.from('projects').select('*').eq('business_id', business!.id).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ['project-images', galleryProjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_images').select('*').eq('project_id', galleryProjectId!).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!galleryProjectId,
  });

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p: any) =>
      p.title_ar.toLowerCase().includes(q) || (p.title_en || '').toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const stats = useMemo(() => ({
    total: projects.length,
    featured: projects.filter((p: any) => p.is_featured).length,
    totalCost: projects.reduce((sum: number, p: any) => sum + (Number(p.project_cost) || 0), 0),
  }), [projects]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: business!.id, title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        cover_image_url: form.cover_image_url || null, client_name: form.client_name || null,
        project_cost: form.project_cost ? Number(form.project_cost) : null,
        duration_days: form.duration_days ? Number(form.duration_days) : null,
        completion_date: form.completion_date || null, status: form.status,
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
      toast.success(editId ? (isRTL ? 'تم تحديث المشروع بنجاح' : 'Project updated') : (isRTL ? 'تم إضافة المشروع بنجاح' : 'Project added'));
      closeForm();
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
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم حذف المشروع بنجاح' : 'Project deleted');
    },
  });

  const handleGalleryChange = async (urls: string[]) => {
    if (!galleryProjectId) return;
    await supabase.from('project_images').delete().eq('project_id', galleryProjectId);
    if (urls.length > 0) {
      const rows = urls.map((url, i) => ({ project_id: galleryProjectId, image_url: url, sort_order: i }));
      const { error } = await supabase.from('project_images').insert(rows);
      if (error) { toast.error(error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ['project-images', galleryProjectId] });
  };

  const openEdit = (p: any) => {
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', description_ar: p.description_ar || '',
      description_en: p.description_en || '', cover_image_url: p.cover_image_url || '',
      client_name: p.client_name || '', project_cost: p.project_cost?.toString() || '',
      duration_days: p.duration_days?.toString() || '', completion_date: p.completion_date || '', status: p.status,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const galleryProject = projects.find((p: any) => p.id === galleryProjectId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl">{isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'اعرض مشاريعك المنجزة مع صور ومعلومات تفصيلية' : 'Showcase your completed projects with photos and details'}
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" onClick={() => { closeForm(); setShowForm(true); }} className="shrink-0">
              <Plus className="w-4 h-4 me-2" />{isRTL ? 'إضافة مشروع' : 'Add Project'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي المشاريع' : 'Total Projects'}</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-amber-500" /></div>
                <div><p className="text-2xl font-bold">{stats.featured}</p><p className="text-xs text-muted-foreground">{isRTL ? 'مشاريع مميزة' : 'Featured'}</p></div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-500" /></div>
                <div><p className="text-2xl font-bold">{stats.totalCost > 0 ? `${(stats.totalCost / 1000).toFixed(0)}K` : '—'}</p><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي التكاليف' : 'Total Cost'}</p></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Toolbar */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isRTL ? 'ابحث في المشاريع...' : 'Search projects...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
            </div>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode('list')}><LayoutList className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {editId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editId ? (isRTL ? 'تعديل المشروع' : 'Edit Project') : (isRTL ? 'إضافة مشروع جديد' : 'Add New Project')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Titles with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'عنوان المشروع (عربي)' : 'Project Title (Arabic)'} <span className="text-destructive">*</span></Label>
                  <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} placeholder={isRTL ? 'مثال: تركيب واجهات زجاجية لمبنى تجاري' : 'e.g. Glass facade installation'} />
                  <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                    onTranslated={(v) => setForm(f => ({ ...f, title_en: v }))}
                    onImproved={(v) => setForm(f => ({ ...f, title_ar: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'عنوان المشروع (إنجليزي)' : 'Project Title (English)'}</Label>
                  <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" placeholder="e.g. Commercial building glass facade" />
                  <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL}
                    onTranslated={(v) => setForm(f => ({ ...f, title_ar: v }))}
                    onImproved={(v) => setForm(f => ({ ...f, title_en: v }))} />
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label>{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                <ImageUpload bucket="project-images" value={form.cover_image_url} onChange={(url) => setForm(f => ({ ...f, cover_image_url: url }))} onRemove={() => setForm(f => ({ ...f, cover_image_url: '' }))} aspectRatio="video" placeholder={isRTL ? 'اضغط لرفع صورة الغلاف' : 'Click to upload cover image'} />
              </div>

              {/* Descriptions with AI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} placeholder={isRTL ? 'وصف تفصيلي للمشروع...' : 'Detailed project description...'} />
                  <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                    onTranslated={(v) => setForm(f => ({ ...f, description_en: v }))}
                    onImproved={(v) => setForm(f => ({ ...f, description_ar: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                  <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} dir="ltr" placeholder="Detailed project description..." />
                  {form.description_en && (
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(f => ({ ...f, description_ar: v }))}
                      onImproved={(v) => setForm(f => ({ ...f, description_en: v }))} />
                  )}
                </div>
              </div>

              {/* Project details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{isRTL ? 'اسم العميل' : 'Client Name'}</Label>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'التكلفة (ر.س)' : 'Cost (SAR)'}</Label>
                  <Input type="number" value={form.project_cost} onChange={e => setForm(f => ({ ...f, project_cost: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{isRTL ? 'المدة (أيام)' : 'Duration (days)'}</Label>
                  <Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الإنجاز' : 'Completion Date'}</Label>
                  <Input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} dir="ltr" />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                    <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editId ? (isRTL ? 'تحديث المشروع' : 'Update Project') : (isRTL ? 'إضافة المشروع' : 'Add Project')}
                  {!saveMutation.isPending && <CheckCircle2 className="w-4 h-4 ms-2" />}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gallery Section */}
        {galleryProjectId && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Images className="w-5 h-5 text-primary" />
                  {isRTL ? 'معرض صور المشروع' : 'Project Gallery'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setGalleryProjectId(null)}><X className="w-4 h-4" /></Button>
              </div>
              {galleryProject && <p className="text-sm text-muted-foreground">{language === 'ar' ? (galleryProject as any).title_ar : ((galleryProject as any).title_en || (galleryProject as any).title_ar)}</p>}
            </CardHeader>
            <CardContent>
              <MultiImageUpload bucket="project-images" images={galleryImages.map((img: any) => img.image_url)} onChange={handleGalleryChange} folder="gallery" maxImages={20} maxSizeMB={5} />
              <p className="text-xs text-muted-foreground mt-2">
                {isRTL ? `${galleryImages.length} / 20 صورة` : `${galleryImages.length} / 20 images`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {[1,2,3,4].map(i => <Skeleton key={i} className={viewMode === 'grid' ? 'h-64 rounded-xl' : 'h-20 rounded-xl'} />)}
          </div>
        ) : projects.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FolderOpen className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد مشاريع بعد' : 'No projects yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {isRTL ? 'أضف مشاريعك المنجزة لعرضها للعملاء المحتملين' : 'Add your completed projects to showcase to potential clients'}
              </p>
              <Button variant="hero" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول مشروع' : 'Add First Project'}
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredProjects.map((p: any) => (
              <Card key={p.id} className="border-border/40 hover:border-primary/30 transition-all group">
                <CardContent className="p-3 flex items-center gap-4">
                  {p.cover_image_url && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img src={p.cover_image_url} alt={isRTL ? p.title_ar : (p.title_en || p.title_ar)} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      {p.project_cost && <span><DollarSign className="w-3 h-3 inline" />{Number(p.project_cost).toLocaleString()}</span>}
                      {p.duration_days && <span><Clock className="w-3 h-3 inline" />{p.duration_days} {isRTL ? 'يوم' : 'days'}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGalleryProjectId(p.id)}><Images className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p: any) => (
              <Card key={p.id} className="overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-md transition-all group">
                {p.cover_image_url && (
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img src={p.cover_image_url} alt={isRTL ? p.title_ar : (p.title_en || p.title_ar)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
                      <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5 me-1" />{isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white text-black shadow-lg" onClick={() => setGalleryProjectId(p.id)}>
                        <Images className="w-3.5 h-3.5 me-1" />{isRTL ? 'المعرض' : 'Gallery'}
                      </Button>
                      <Button size="sm" variant="destructive" className="shadow-lg" onClick={() => setDeleteConfirm(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-heading font-semibold">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                  {(language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                    {p.project_cost && <Badge variant="secondary" className="text-xs"><DollarSign className="w-3 h-3 me-0.5" />{Number(p.project_cost).toLocaleString()} SAR</Badge>}
                    {p.duration_days && <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 me-0.5" />{p.duration_days} {isRTL ? 'يوم' : 'days'}</Badge>}
                    {p.completion_date && <Badge variant="secondary" className="text-xs"><Calendar className="w-3 h-3 me-0.5" />{p.completion_date}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف المشروع' : 'Delete Project'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? 'هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع الصور المرتبطة به.' : 'Are you sure? All associated images will also be deleted.'}
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

export default DashboardProjects;
