import React, { useState, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, FileText, Eye, Calendar, X, Search, Tag, Globe, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { AiToolbar } from '@/components/blog/AiToolbar';
import { SeoScorePanel } from '@/components/blog/SeoScorePanel';
import { callBlogAi, parseJsonResponse, calculateReadingTime, calculateLocalSeoScore } from '@/lib/blog-ai-utils';

const blogCategories = [
  { value: 'general', ar: 'عام', en: 'General' },
  { value: 'tips', ar: 'نصائح', en: 'Tips' },
  { value: 'news', ar: 'أخبار', en: 'News' },
  { value: 'guides', ar: 'أدلة', en: 'Guides' },
  { value: 'industry', ar: 'صناعة', en: 'Industry' },
];

const defaultForm = {
  title_ar: '', title_en: '', content_ar: '', content_en: '',
  excerpt_ar: '', excerpt_en: '', cover_image_url: '',
  category: 'general', tags: '', status: 'draft', slug: '',
  meta_title_ar: '', meta_title_en: '', meta_description_ar: '', meta_description_en: '',
  focus_keyword: '', keywords: '', canonical_url: '', og_image_url: '',
};

const DashboardBlog = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const resetForm = () => { setForm({ ...defaultForm }); setEditId(null); setSeoAnalysis(null); };
  const closeForm = () => { setShowForm(false); resetForm(); };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() || `post-${Date.now()}`;

  const setField = useCallback((key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const localScore = calculateLocalSeoScore(form);

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['dashboard-blog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || generateSlug(form.title_en || form.title_ar);
      const tagsArr = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const keywordsArr = form.keywords ? form.keywords.split(',').map(t => t.trim()).filter(Boolean) : [];
      const readingTime = calculateReadingTime(form.content_ar || form.content_en || '');
      const payload: any = {
        author_id: user!.id, slug,
        title_ar: form.title_ar, title_en: form.title_en || null,
        content_ar: form.content_ar || null, content_en: form.content_en || null,
        excerpt_ar: form.excerpt_ar || null, excerpt_en: form.excerpt_en || null,
        cover_image_url: form.cover_image_url || null, category: form.category,
        tags: tagsArr, status: form.status,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
        meta_title_ar: form.meta_title_ar || null, meta_title_en: form.meta_title_en || null,
        meta_description_ar: form.meta_description_ar || null, meta_description_en: form.meta_description_en || null,
        focus_keyword: form.focus_keyword || null, keywords: keywordsArr,
        canonical_url: form.canonical_url || null, og_image_url: form.og_image_url || form.cover_image_url || null,
        seo_score: seoAnalysis?.score || localScore, reading_time_minutes: readingTime,
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

  // Delete mutation
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
      meta_title_ar: p.meta_title_ar || '', meta_title_en: p.meta_title_en || '',
      meta_description_ar: p.meta_description_ar || '', meta_description_en: p.meta_description_en || '',
      focus_keyword: p.focus_keyword || '', keywords: (p.keywords || []).join(', '),
      canonical_url: p.canonical_url || '', og_image_url: p.og_image_url || '',
    });
    setEditId(p.id);
    setSeoAnalysis(null);
    setShowForm(true);
  };

  // AI handlers
  const handleTranslate = async (dir: 'ar-en' | 'en-ar') => {
    const key = dir === 'ar-en' ? 'translate-ar-en' : 'translate-en-ar';
    setAiLoading(key);
    try {
      const [sLang, tLang] = dir === 'ar-en' ? ['ar', 'en'] : ['en', 'ar'];
      const sourceTitle = dir === 'ar-en' ? form.title_ar : form.title_en;
      const sourceContent = dir === 'ar-en' ? form.content_ar : form.content_en;
      const sourceExcerpt = dir === 'ar-en' ? form.excerpt_ar : form.excerpt_en;

      if (sourceTitle) {
        const t = await callBlogAi({ action: 'translate', text: sourceTitle, sourceLang: sLang, targetLang: tLang });
        setField(dir === 'ar-en' ? 'title_en' : 'title_ar', t.trim());
      }
      if (sourceContent) {
        const t = await callBlogAi({ action: 'translate', text: sourceContent, sourceLang: sLang, targetLang: tLang });
        setField(dir === 'ar-en' ? 'content_en' : 'content_ar', t.trim());
      }
      if (sourceExcerpt) {
        const t = await callBlogAi({ action: 'translate', text: sourceExcerpt, sourceLang: sLang, targetLang: tLang });
        setField(dir === 'ar-en' ? 'excerpt_en' : 'excerpt_ar', t.trim());
      }
      toast.success(isRTL ? 'تمت الترجمة' : 'Translation done');
    } catch {} finally { setAiLoading(null); }
  };

  const handleGenerateKeywords = async () => {
    setAiLoading('keywords');
    try {
      const raw = await callBlogAi({
        action: 'generate_keywords',
        title: form.title_ar || form.title_en,
        content: form.content_ar || form.content_en,
      });
      const parsed = parseJsonResponse(raw);
      if (Array.isArray(parsed)) {
        setField('keywords', parsed.join(', '));
        if (!form.focus_keyword && parsed[0]) setField('focus_keyword', parsed[0]);
        toast.success(isRTL ? 'تم استخراج الكلمات المفتاحية' : 'Keywords extracted');
      }
    } catch {} finally { setAiLoading(null); }
  };

  const handleGenerateMeta = async () => {
    setAiLoading('meta');
    try {
      const raw = await callBlogAi({
        action: 'generate_meta',
        title: form.title_ar,
        content: form.content_ar || form.content_en,
        keywords: form.keywords ? form.keywords.split(',').map(s => s.trim()) : [],
      });
      const parsed = parseJsonResponse(raw);
      if (parsed) {
        if (parsed.meta_title_ar) setField('meta_title_ar', parsed.meta_title_ar);
        if (parsed.meta_title_en) setField('meta_title_en', parsed.meta_title_en);
        if (parsed.meta_description_ar) setField('meta_description_ar', parsed.meta_description_ar);
        if (parsed.meta_description_en) setField('meta_description_en', parsed.meta_description_en);
        if (parsed.focus_keyword && !form.focus_keyword) setField('focus_keyword', parsed.focus_keyword);
        if (parsed.slug_suggestion && !form.slug) setField('slug', parsed.slug_suggestion);
        toast.success(isRTL ? 'تم توليد بيانات الميتا' : 'Meta generated');
      }
    } catch {} finally { setAiLoading(null); }
  };

  const handleAnalyzeSeo = async () => {
    setAiLoading('analyze');
    try {
      const raw = await callBlogAi({
        action: 'seo_analysis',
        title: form.title_ar,
        content: form.content_ar || form.content_en,
        text: form.meta_description_ar,
        keywords: [form.focus_keyword, form.cover_image_url ? 'has_image' : ''],
      });
      const parsed = parseJsonResponse(raw);
      if (parsed) setSeoAnalysis(parsed);
      toast.success(isRTL ? 'تم التحليل' : 'Analysis done');
    } catch {} finally { setAiLoading(null); }
  };

  const handleGenerateExcerpt = async (lang: 'ar' | 'en') => {
    setAiLoading(`excerpt-${lang}`);
    try {
      const raw = await callBlogAi({
        action: 'generate_excerpt',
        title: lang === 'ar' ? form.title_ar : form.title_en,
        content: lang === 'ar' ? form.content_ar : form.content_en,
        keywords: [form.focus_keyword],
      });
      setField(lang === 'ar' ? 'excerpt_ar' : 'excerpt_en', raw.trim());
      toast.success(isRTL ? 'تم توليد المقتطف' : 'Excerpt generated');
    } catch {} finally { setAiLoading(null); }
  };

  const handleImproveContent = async (lang: 'ar' | 'en') => {
    setAiLoading(`improve-${lang}`);
    try {
      const raw = await callBlogAi({
        action: 'improve_content',
        text: lang === 'ar' ? form.content_ar : form.content_en,
        keywords: [form.focus_keyword],
      });
      setField(lang === 'ar' ? 'content_ar' : 'content_en', raw.trim());
      toast.success(isRTL ? 'تم تحسين المحتوى' : 'Content improved');
    } catch {} finally { setAiLoading(null); }
  };

  // Filter posts
  const filteredPosts = posts.filter((p: any) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title_ar?.toLowerCase().includes(q) || p.title_en?.toLowerCase().includes(q) || p.slug?.includes(q);
    }
    return true;
  });

  const stats = {
    total: posts.length,
    published: posts.filter((p: any) => p.status === 'published').length,
    draft: posts.filter((p: any) => p.status === 'draft').length,
    totalViews: posts.reduce((s: number, p: any) => s + (p.views_count || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {isRTL ? 'إدارة المدونة' : 'Blog Management'}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'إنشاء وإدارة وتحسين مقالات المنصة لمحركات البحث' : 'Create, manage & optimize platform articles for SEO'}</p>
          </div>
          {!showForm && (
            <Button variant="default" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 me-1" />{isRTL ? 'مقال جديد' : 'New Article'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {!showForm && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, icon: FileText },
              { label: isRTL ? 'منشور' : 'Published', value: stats.published, icon: Globe },
              { label: isRTL ? 'مسودة' : 'Drafts', value: stats.draft, icon: Edit },
              { label: isRTL ? 'المشاهدات' : 'Views', value: stats.totalViews, icon: Eye },
            ].map((s, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><s.icon className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main form - 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="border-accent/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{editId ? (isRTL ? 'تعديل المقال' : 'Edit Article') : (isRTL ? 'مقال جديد' : 'New Article')}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Tools */}
                  <AiToolbar isRTL={isRTL} loading={aiLoading}
                    onTranslate={handleTranslate} onGenerateKeywords={handleGenerateKeywords}
                    onGenerateMeta={handleGenerateMeta} onAnalyzeSeo={handleAnalyzeSeo}
                    onGenerateExcerpt={handleGenerateExcerpt} onImproveContent={handleImproveContent} />

                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="content">{isRTL ? 'المحتوى' : 'Content'}</TabsTrigger>
                      <TabsTrigger value="seo" className="flex items-center gap-1">
                        <Search className="w-3 h-3" /> SEO
                      </TabsTrigger>
                      <TabsTrigger value="settings">{isRTL ? 'الإعدادات' : 'Settings'}</TabsTrigger>
                    </TabsList>

                    {/* Content Tab */}
                    <TabsContent value="content" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>{isRTL ? 'العنوان (عربي)' : 'Title (AR)'} *</Label>
                          <Input value={form.title_ar} onChange={e => setField('title_ar', e.target.value)} />
                          <span className="text-[10px] text-muted-foreground">{form.title_ar.length}/70</span>
                        </div>
                        <div>
                          <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label>
                          <Input value={form.title_en} onChange={e => setField('title_en', e.target.value)} dir="ltr" />
                          <span className="text-[10px] text-muted-foreground">{form.title_en.length}/70</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>{isRTL ? 'المقتطف (عربي)' : 'Excerpt (AR)'}</Label>
                          <Textarea value={form.excerpt_ar} onChange={e => setField('excerpt_ar', e.target.value)} rows={2} />
                          <span className="text-[10px] text-muted-foreground">{form.excerpt_ar.length}/200</span>
                        </div>
                        <div>
                          <Label>{isRTL ? 'المقتطف (إنجليزي)' : 'Excerpt (EN)'}</Label>
                          <Textarea value={form.excerpt_en} onChange={e => setField('excerpt_en', e.target.value)} rows={2} dir="ltr" />
                        </div>
                      </div>

                      <div>
                        <Label>{isRTL ? 'المحتوى (عربي)' : 'Content (AR)'}</Label>
                        <Textarea value={form.content_ar} onChange={e => setField('content_ar', e.target.value)} rows={8} className="font-mono text-sm" />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{form.content_ar.split(/\s+/).filter(Boolean).length} {isRTL ? 'كلمة' : 'words'}</span>
                          <span>{calculateReadingTime(form.content_ar)} {isRTL ? 'دقيقة قراءة' : 'min read'}</span>
                        </div>
                      </div>

                      <div>
                        <Label>{isRTL ? 'المحتوى (إنجليزي)' : 'Content (EN)'}</Label>
                        <Textarea value={form.content_en} onChange={e => setField('content_en', e.target.value)} rows={8} dir="ltr" className="font-mono text-sm" />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{form.content_en.split(/\s+/).filter(Boolean).length} {isRTL ? 'كلمة' : 'words'}</span>
                          <span>{calculateReadingTime(form.content_en)} {isRTL ? 'دقيقة قراءة' : 'min read'}</span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* SEO Tab */}
                    <TabsContent value="seo" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Meta Title (AR)</Label>
                          <Input value={form.meta_title_ar} onChange={e => setField('meta_title_ar', e.target.value)} />
                          <span className={`text-[10px] ${form.meta_title_ar.length > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {form.meta_title_ar.length}/60
                          </span>
                        </div>
                        <div>
                          <Label>Meta Title (EN)</Label>
                          <Input value={form.meta_title_en} onChange={e => setField('meta_title_en', e.target.value)} dir="ltr" />
                          <span className={`text-[10px] ${form.meta_title_en.length > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {form.meta_title_en.length}/60
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Meta Description (AR)</Label>
                          <Textarea value={form.meta_description_ar} onChange={e => setField('meta_description_ar', e.target.value)} rows={2} />
                          <span className={`text-[10px] ${form.meta_description_ar.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {form.meta_description_ar.length}/160
                          </span>
                        </div>
                        <div>
                          <Label>Meta Description (EN)</Label>
                          <Textarea value={form.meta_description_en} onChange={e => setField('meta_description_en', e.target.value)} rows={2} dir="ltr" />
                          <span className={`text-[10px] ${form.meta_description_en.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {form.meta_description_en.length}/160
                          </span>
                        </div>
                      </div>

                      {/* Google Preview */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-2 font-semibold">{isRTL ? 'معاينة Google' : 'Google Preview'}</p>
                        <div className="space-y-0.5" dir="ltr">
                          <p className="text-primary text-sm font-medium truncate">
                            {form.meta_title_en || form.title_en || form.meta_title_ar || form.title_ar || 'Page Title'}
                          </p>
                          <p className="text-[11px] text-green-600 truncate">
                            faneen.lovable.app/blog/{form.slug || 'your-post-slug'}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {form.meta_description_en || form.meta_description_ar || form.excerpt_en || form.excerpt_ar || 'Your meta description will appear here...'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="flex items-center gap-1"><Tag className="w-3 h-3" /> {isRTL ? 'الكلمة المفتاحية الرئيسية' : 'Focus Keyword'}</Label>
                          <Input value={form.focus_keyword} onChange={e => setField('focus_keyword', e.target.value)} placeholder={isRTL ? 'الكلمة المفتاحية الأساسية' : 'Primary keyword'} />
                        </div>
                        <div>
                          <Label>Canonical URL</Label>
                          <Input value={form.canonical_url} onChange={e => setField('canonical_url', e.target.value)} dir="ltr" placeholder="https://..." />
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-1"><Search className="w-3 h-3" /> {isRTL ? 'الكلمات المفتاحية (SEO)' : 'SEO Keywords'}</Label>
                        <Input value={form.keywords} onChange={e => setField('keywords', e.target.value)} dir="ltr" placeholder="keyword1, keyword2, keyword3" />
                        {form.keywords && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {form.keywords.split(',').map((k, i) => k.trim() && (
                              <Badge key={i} variant="secondary" className="text-[10px]">{k.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>OG Image URL</Label>
                        <Input value={form.og_image_url} onChange={e => setField('og_image_url', e.target.value)} dir="ltr" placeholder={isRTL ? 'صورة المشاركة على وسائل التواصل' : 'Social share image URL'} />
                      </div>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4 mt-4">
                      <div>
                        <Label>Slug</Label>
                        <Input value={form.slug} onChange={e => setField('slug', e.target.value)} dir="ltr" placeholder="auto-generated-from-title" />
                      </div>
                      <div>
                        <Label>{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                        <ImageUpload bucket="blog-images" value={form.cover_image_url}
                          onChange={(url) => setField('cover_image_url', url)}
                          onRemove={() => setField('cover_image_url', '')}
                          placeholder={isRTL ? 'اضغط لرفع صورة الغلاف' : 'Click to upload cover image'} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label>{isRTL ? 'التصنيف' : 'Category'}</Label>
                          <Select value={form.category} onValueChange={v => setField('category', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{blogCategories.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                          <Select value={form.status} onValueChange={v => setField('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                              <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{isRTL ? 'الوسوم' : 'Tags'}</Label>
                          <Input value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder="tag1, tag2" dir="ltr" />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} className="flex-1">
                      {saveMutation.isPending ? '...' : (editId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'نشر' : 'Publish'))}
                    </Button>
                    <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SEO Sidebar - 1 col */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {isRTL ? 'تقييم SEO' : 'SEO Score'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SeoScorePanel isRTL={isRTL} analysis={seoAnalysis} localScore={localScore} isAnalyzing={aiLoading === 'analyze'} />
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card>
                <CardContent className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'وقت القراءة' : 'Reading Time'}</span>
                    <span className="font-medium">{calculateReadingTime(form.content_ar || form.content_en)} {isRTL ? 'د' : 'min'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'كلمات AR' : 'Words AR'}</span>
                    <span className="font-medium">{form.content_ar.split(/\s+/).filter(Boolean).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'كلمات EN' : 'Words EN'}</span>
                    <span className="font-medium">{form.content_en.split(/\s+/).filter(Boolean).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'كلمات مفتاحية' : 'Keywords'}</span>
                    <span className="font-medium">{form.keywords.split(',').filter(k => k.trim()).length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Posts List */}
        {!showForm && (
          <>
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="ps-9" placeholder={isRTL ? 'بحث في المقالات...' : 'Search articles...'}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                  <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
            ) : filteredPosts.length === 0 ? (
              <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{isRTL ? 'لا توجد مقالات' : 'No articles found'}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((p: any) => (
                  <Card key={p.id} className="border-border/50 hover:border-primary/20 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      {p.cover_image_url && (
                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading font-bold truncate">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                          <Badge variant={p.status === 'published' ? 'default' : 'outline'} className="text-[10px] shrink-0">
                            {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
                          </Badge>
                          {p.seo_score > 0 && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              SEO: {p.seo_score}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views_count}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.created_at).toLocaleDateString()}</span>
                          <Badge variant="outline" className="text-[10px]">{blogCategories.find(c => c.value === p.category)?.[language] || p.category}</Badge>
                          {p.focus_keyword && (
                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{p.focus_keyword}</span>
                          )}
                          {p.reading_time_minutes > 0 && (
                            <span>{p.reading_time_minutes} {isRTL ? 'د' : 'min'}</span>
                          )}
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBlog;
