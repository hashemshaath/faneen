import React, { useState } from 'react';
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
import { Plus, Edit, Trash2, FileText, Eye, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';

const blogCategories = [
  { value: 'general', ar: 'عام', en: 'General' },
  { value: 'tips', ar: 'نصائح', en: 'Tips' },
  { value: 'news', ar: 'أخبار', en: 'News' },
  { value: 'guides', ar: 'أدلة', en: 'Guides' },
  { value: 'industry', ar: 'صناعة', en: 'Industry' },
];

const DashboardBlog = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title_ar: '', title_en: '', content_ar: '', content_en: '',
    excerpt_ar: '', excerpt_en: '', cover_image_url: '',
    category: 'general', tags: '', status: 'draft', slug: '',
  });

  const resetForm = () => {
    setForm({ title_ar: '', title_en: '', content_ar: '', content_en: '', excerpt_ar: '', excerpt_en: '', cover_image_url: '', category: 'general', tags: '', status: 'draft', slug: '' });
    setEditId(null);
  };

  const closeForm = () => { setShowForm(false); resetForm(); };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() || `post-${Date.now()}`;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['dashboard-blog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || generateSlug(form.title_en || form.title_ar);
      const tagsArr = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const payload = {
        author_id: user!.id, slug, title_ar: form.title_ar, title_en: form.title_en || null,
        content_ar: form.content_ar || null, content_en: form.content_en || null,
        excerpt_ar: form.excerpt_ar || null, excerpt_en: form.excerpt_en || null,
        cover_image_url: form.cover_image_url || null, category: form.category, tags: tagsArr,
        status: form.status, published_at: form.status === 'published' ? new Date().toISOString() : null,
      };
      if (editId) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-blog'] });
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
      closeForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-blog'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const openEdit = (p: any) => {
    setForm({
      title_ar: p.title_ar, title_en: p.title_en || '', content_ar: p.content_ar || '',
      content_en: p.content_en || '', excerpt_ar: p.excerpt_ar || '', excerpt_en: p.excerpt_en || '',
      cover_image_url: p.cover_image_url || '', category: p.category, tags: (p.tags || []).join(', '),
      status: p.status, slug: p.slug,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-gold" />
              {isRTL ? 'إدارة المدونة' : 'Blog Management'}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'إنشاء وإدارة مقالات المنصة' : 'Create and manage platform articles'}</p>
          </div>
          {!showForm && (
            <Button variant="hero" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 me-1" />{isRTL ? 'مقال جديد' : 'New Article'}
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editId ? (isRTL ? 'تعديل المقال' : 'Edit Article') : (isRTL ? 'مقال جديد' : 'New Article')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'العنوان (عربي)' : 'Title (AR)'} *</Label><Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} /></div>
                <div><Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label><Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} dir="ltr" /></div>
              </div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} dir="ltr" placeholder="auto-generated-from-title" /></div>
              <div><Label>{isRTL ? 'المقتطف (عربي)' : 'Excerpt (AR)'}</Label><Textarea value={form.excerpt_ar} onChange={e => setForm(f => ({ ...f, excerpt_ar: e.target.value }))} rows={2} /></div>
              <div><Label>{isRTL ? 'المحتوى (عربي)' : 'Content (AR)'}</Label><Textarea value={form.content_ar} onChange={e => setForm(f => ({ ...f, content_ar: e.target.value }))} rows={6} /></div>
              <div><Label>{isRTL ? 'المحتوى (إنجليزي)' : 'Content (EN)'}</Label><Textarea value={form.content_en} onChange={e => setForm(f => ({ ...f, content_en: e.target.value }))} rows={6} dir="ltr" /></div>
              <div>
                <Label>{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                <ImageUpload bucket="blog-images" value={form.cover_image_url} onChange={(url) => setForm(f => ({ ...f, cover_image_url: url }))} onRemove={() => setForm(f => ({ ...f, cover_image_url: '' }))} placeholder={isRTL ? 'اضغط لرفع صورة الغلاف' : 'Click to upload cover image'} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>{isRTL ? 'التصنيف' : 'Category'}</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{blogCategories.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                      <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{isRTL ? 'الوسوم' : 'Tags'}</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="tag1, tag2" dir="ltr" /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? '...' : (editId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'نشر' : 'Publish'))}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : posts.length === 0 && !showForm ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isRTL ? 'لا توجد مقالات بعد' : 'No articles yet'}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {posts.map((p: any) => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  {p.cover_image_url && <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0"><img src={p.cover_image_url} alt="" className="w-full h-full object-cover" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold truncate">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                      <Badge variant={p.status === 'published' ? 'default' : 'outline'} className="text-[10px] shrink-0">
                        {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views_count}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-[10px]">{blogCategories.find(c => c.value === p.category)?.[language] || p.category}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
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

export default DashboardBlog;
