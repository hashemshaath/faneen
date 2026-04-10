import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus, Edit, Trash2, FileText, Eye, Calendar as CalendarIcon, X, Search, Tag, Globe,
  BarChart3, ArrowRight, Clock, Hash, Zap, ExternalLink, CalendarClock, History, Trophy,
  CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/image-upload';
import { AiToolbar } from '@/components/blog/AiToolbar';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { SeoScorePanel } from '@/components/blog/SeoScorePanel';
import { RichMarkdownEditor } from '@/components/blog/RichMarkdownEditor';
import { ArticlePreview } from '@/components/blog/ArticlePreview';
import { DraftVersions } from '@/components/blog/DraftVersions';
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
  scheduled_at: '',
};

/* helpers */
function countInText(text: string, keyword: string): number {
  if (!text || !keyword) return 0;
  const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (text.match(re) || []).length;
}
function analyzeContent(text: string) {
  if (!text) return { words: 0, headings: 0, images: 0, links: 0, paragraphs: 0 };
  return {
    words: text.trim().split(/\s+/).filter(Boolean).length,
    headings: (text.match(/^#{1,6}\s/gm) || []).length,
    images: (text.match(/!\[.*?\]\(.*?\)/g) || []).length + (text.match(/<img\s/gi) || []).length,
    links: (text.match(/\[.*?\]\(.*?\)/g) || []).length,
    paragraphs: text.split(/\n\s*\n/).filter(p => p.trim()).length,
  };
}

const DashboardBlog = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>('ar');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditId(null);
    setSeoAnalysis(null);
    setCompetitorAnalysis(null);
    setScheduledDate(undefined);
  };
  const closeForm = () => { setShowForm(false); resetForm(); };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() || `post-${Date.now()}`;

  const setField = useCallback((key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  /* Content stats */
  const contentStats = useMemo(() => {
    const ar = analyzeContent(form.content_ar);
    const en = analyzeContent(form.content_en);
    const totalWords = ar.words + en.words;
    const keywordCount = form.focus_keyword ? countInText(form.content_ar + ' ' + form.content_en, form.focus_keyword) : 0;
    return {
      wordCountAr: ar.words, wordCountEn: en.words,
      headingsCount: ar.headings + en.headings,
      imagesCount: ar.images + en.images,
      linksCount: ar.links + en.links,
      keywordDensity: totalWords > 0 ? (keywordCount / totalWords) * 100 : 0,
      readingTime: calculateReadingTime(form.content_ar || form.content_en),
      paragraphCount: ar.paragraphs + en.paragraphs,
    };
  }, [form.content_ar, form.content_en, form.focus_keyword]);

  const localScore = calculateLocalSeoScore(form);

  /* Auto-slug */
  const handleTitleChange = useCallback((key: string, value: string) => {
    setField(key, value);
    if (key === 'title_en' && !editId) setField('slug', generateSlug(value));
  }, [setField, editId]);

  /* ─── Auto-save draft ─── */
  useEffect(() => {
    if (!editId || !user || !form.title_ar) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const { count } = await supabase.from('blog_drafts').select('*', { count: 'exact', head: true }).eq('post_id', editId);
        const nextVersion = (count || 0) + 1;
        await supabase.from('blog_drafts').insert({
          post_id: editId, user_id: user.id,
          title_ar: form.title_ar, title_en: form.title_en || null,
          content_ar: form.content_ar || null, content_en: form.content_en || null,
          excerpt_ar: form.excerpt_ar || null, excerpt_en: form.excerpt_en || null,
          form_snapshot: form as any,
          version_number: nextVersion, auto_saved: true,
        });
        setLastAutoSave(new Date());
      } catch (e) { console.error('Auto-save failed', e); }
      setIsAutoSaving(false);
    }, 30000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form.content_ar, form.content_en, form.title_ar, editId, user]);

  /* Fetch draft versions */
  const { data: draftVersions = [] } = useQuery({
    queryKey: ['blog-drafts', editId],
    queryFn: async () => {
      if (!editId) return [];
      const { data } = await supabase.from('blog_drafts')
        .select('id, version_number, title_ar, auto_saved, created_at')
        .eq('post_id', editId).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!editId,
  });

  const handleManualSaveDraft = async () => {
    if (!editId || !user) return;
    setIsAutoSaving(true);
    try {
      const { count } = await supabase.from('blog_drafts').select('*', { count: 'exact', head: true }).eq('post_id', editId);
      await supabase.from('blog_drafts').insert({
        post_id: editId, user_id: user.id,
        title_ar: form.title_ar, title_en: form.title_en || null,
        content_ar: form.content_ar || null, content_en: form.content_en || null,
        excerpt_ar: form.excerpt_ar || null, excerpt_en: form.excerpt_en || null,
        form_snapshot: form as any,
        version_number: (count || 0) + 1, auto_saved: false,
      });
      setLastAutoSave(new Date());
      queryClient.invalidateQueries({ queryKey: ['blog-drafts', editId] });
      toast.success(isRTL ? 'تم حفظ النسخة' : 'Version saved');
    } catch {} finally { setIsAutoSaving(false); }
  };

  const handleRestoreDraft = async (draftId: string) => {
    const { data } = await supabase.from('blog_drafts').select('form_snapshot').eq('id', draftId).single();
    if (data?.form_snapshot) {
      const snapshot = data.form_snapshot as any;
      setForm({ ...defaultForm, ...snapshot });
      toast.success(isRTL ? 'تم استعادة النسخة' : 'Version restored');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    await supabase.from('blog_drafts').delete().eq('id', draftId);
    queryClient.invalidateQueries({ queryKey: ['blog-drafts', editId] });
  };

  /* Fetch posts */
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['dashboard-blog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  /* Save */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || generateSlug(form.title_en || form.title_ar);
      const tagsArr = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const keywordsArr = form.keywords ? form.keywords.split(',').map(t => t.trim()).filter(Boolean) : [];
      const readingTime = calculateReadingTime(form.content_ar || form.content_en || '');
      const isScheduled = form.status === 'scheduled' && scheduledDate;
      const payload: any = {
        author_id: user!.id, slug,
        title_ar: form.title_ar, title_en: form.title_en || null,
        content_ar: form.content_ar || null, content_en: form.content_en || null,
        excerpt_ar: form.excerpt_ar || null, excerpt_en: form.excerpt_en || null,
        cover_image_url: form.cover_image_url || null, category: form.category,
        tags: tagsArr, status: isScheduled ? 'draft' : form.status,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
        scheduled_at: isScheduled ? scheduledDate.toISOString() : null,
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

  /* Delete */
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
      scheduled_at: p.scheduled_at || '',
    });
    setEditId(p.id);
    setSeoAnalysis(null);
    setCompetitorAnalysis(null);
    if (p.scheduled_at) setScheduledDate(new Date(p.scheduled_at));
    setShowForm(true);
  };

  /* AI handlers */
  const handleTranslate = async (dir: 'ar-en' | 'en-ar') => {
    const key = dir === 'ar-en' ? 'translate-ar-en' : 'translate-en-ar';
    setAiLoading(key);
    try {
      const [sLang, tLang] = dir === 'ar-en' ? ['ar', 'en'] : ['en', 'ar'];
      const src = dir === 'ar-en' ? { t: form.title_ar, c: form.content_ar, e: form.excerpt_ar } : { t: form.title_en, c: form.content_en, e: form.excerpt_en };
      const tgt = dir === 'ar-en' ? { t: 'title_en', c: 'content_en', e: 'excerpt_en' } : { t: 'title_ar', c: 'content_ar', e: 'excerpt_ar' };
      if (src.t) { const r = await callBlogAi({ action: 'translate', text: src.t, sourceLang: sLang, targetLang: tLang }); setField(tgt.t, r.trim()); }
      if (src.c) { const r = await callBlogAi({ action: 'translate', text: src.c, sourceLang: sLang, targetLang: tLang }); setField(tgt.c, r.trim()); }
      if (src.e) { const r = await callBlogAi({ action: 'translate', text: src.e, sourceLang: sLang, targetLang: tLang }); setField(tgt.e, r.trim()); }
      toast.success(isRTL ? 'تمت الترجمة' : 'Translation done');
    } catch {} finally { setAiLoading(null); }
  };

  const handleGenerateKeywords = async () => {
    setAiLoading('keywords');
    try {
      const raw = await callBlogAi({ action: 'generate_keywords', title: form.title_ar || form.title_en, content: form.content_ar || form.content_en });
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
      const raw = await callBlogAi({ action: 'generate_meta', title: form.title_ar, content: form.content_ar || form.content_en, keywords: form.keywords ? form.keywords.split(',').map(s => s.trim()) : [] });
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
      const raw = await callBlogAi({ action: 'seo_analysis', title: form.title_ar, content: form.content_ar || form.content_en, text: form.meta_description_ar, keywords: [form.focus_keyword, form.cover_image_url ? 'has_image' : ''] });
      const parsed = parseJsonResponse(raw);
      if (parsed) setSeoAnalysis(parsed);
      toast.success(isRTL ? 'تم التحليل' : 'Analysis done');
    } catch {} finally { setAiLoading(null); }
  };

  const handleCompetitorAnalysis = async () => {
    if (!form.focus_keyword) { toast.error(isRTL ? 'أدخل الكلمة المفتاحية أولاً' : 'Enter focus keyword first'); return; }
    setAiLoading('competitor');
    try {
      const raw = await callBlogAi({
        action: 'competitor_analysis', title: form.title_ar, content: form.content_ar || form.content_en,
        text: form.meta_description_ar, keywords: [form.focus_keyword],
      });
      const parsed = parseJsonResponse(raw);
      if (parsed) setCompetitorAnalysis(parsed);
      toast.success(isRTL ? 'تم تحليل المنافسين' : 'Competitor analysis done');
    } catch {} finally { setAiLoading(null); }
  };

  const handleGenerateExcerpt = async (lang: 'ar' | 'en') => {
    setAiLoading(`excerpt-${lang}`);
    try {
      const raw = await callBlogAi({ action: 'generate_excerpt', title: lang === 'ar' ? form.title_ar : form.title_en, content: lang === 'ar' ? form.content_ar : form.content_en, keywords: [form.focus_keyword] });
      setField(lang === 'ar' ? 'excerpt_ar' : 'excerpt_en', raw.trim());
      toast.success(isRTL ? 'تم توليد المقتطف' : 'Excerpt generated');
    } catch {} finally { setAiLoading(null); }
  };

  const handleImproveContent = async (lang: 'ar' | 'en') => {
    setAiLoading(`improve-${lang}`);
    try {
      const raw = await callBlogAi({ action: 'improve_content', text: lang === 'ar' ? form.content_ar : form.content_en, keywords: [form.focus_keyword] });
      setField(lang === 'ar' ? 'content_ar' : 'content_en', raw.trim());
      toast.success(isRTL ? 'تم تحسين المحتوى' : 'Content improved');
    } catch {} finally { setAiLoading(null); }
  };

  /* Filters */
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
    scheduled: posts.filter((p: any) => p.scheduled_at && p.status === 'draft').length,
    totalViews: posts.reduce((s: number, p: any) => s + (p.views_count || 0), 0),
    avgSeo: posts.length > 0 ? Math.round(posts.reduce((s: number, p: any) => s + (p.seo_score || 0), 0) / posts.length) : 0,
  };

  const charHint = (len: number, max: number) => {
    const pct = len / max;
    if (pct > 1) return 'text-destructive';
    if (pct > 0.85) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {isRTL ? 'إدارة المدونة' : 'Blog Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isRTL ? 'إنشاء وإدارة وتحسين المقالات لمحركات البحث العالمية' : 'Create, manage & optimize articles for global search engines'}
            </p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" />{isRTL ? 'مقال جديد' : 'New Article'}
            </Button>
          )}
        </div>

        {/* Stats */}
        {!showForm && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, icon: FileText, color: 'bg-primary/10 text-primary' },
              { label: isRTL ? 'منشور' : 'Published', value: stats.published, icon: Globe, color: 'bg-green-500/10 text-green-600' },
              { label: isRTL ? 'مسودة' : 'Drafts', value: stats.draft, icon: Edit, color: 'bg-yellow-500/10 text-yellow-600' },
              { label: isRTL ? 'مجدول' : 'Scheduled', value: stats.scheduled, icon: CalendarClock, color: 'bg-blue-500/10 text-blue-600' },
              { label: isRTL ? 'المشاهدات' : 'Views', value: stats.totalViews, icon: Eye, color: 'bg-purple-500/10 text-purple-600' },
              { label: isRTL ? 'متوسط SEO' : 'Avg SEO', value: `${stats.avgSeo}%`, icon: BarChart3, color: 'bg-accent/10 text-accent-foreground' },
            ].map((s, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="p-2.5 flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${s.color}`}><s.icon className="w-3.5 h-3.5" /></div>
                  <div>
                    <p className="text-sm font-bold leading-tight">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Editor Form */}
        {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main – 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="border-primary/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {editId ? (isRTL ? 'تعديل المقال' : 'Edit Article') : (isRTL ? 'مقال جديد' : 'New Article')}
                      {form.status === 'published' && <Badge variant="default" className="text-[9px]">{isRTL ? 'منشور' : 'Published'}</Badge>}
                      {scheduledDate && <Badge variant="secondary" className="text-[9px] gap-1"><CalendarClock className="w-2.5 h-2.5" />{format(scheduledDate, 'MMM dd')}</Badge>}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Toolbar */}
                  <AiToolbar isRTL={isRTL} loading={aiLoading}
                    onTranslate={handleTranslate} onGenerateKeywords={handleGenerateKeywords}
                    onGenerateMeta={handleGenerateMeta} onAnalyzeSeo={handleAnalyzeSeo}
                    onGenerateExcerpt={handleGenerateExcerpt} onImproveContent={handleImproveContent}
                    onCompetitorAnalysis={handleCompetitorAnalysis} />

                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="w-full grid grid-cols-5 h-9">
                      <TabsTrigger value="content" className="text-xs">{isRTL ? 'المحتوى' : 'Content'}</TabsTrigger>
                      <TabsTrigger value="seo" className="text-xs gap-1"><Search className="w-3 h-3" /> SEO</TabsTrigger>
                      <TabsTrigger value="media" className="text-xs">{isRTL ? 'الوسائط' : 'Media'}</TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs gap-1"><Eye className="w-3 h-3" /> {isRTL ? 'معاينة' : 'Preview'}</TabsTrigger>
                      <TabsTrigger value="settings" className="text-xs">{isRTL ? 'الإعدادات' : 'Settings'}</TabsTrigger>
                    </TabsList>

                    {/* Content Tab */}
                    <TabsContent value="content" className="space-y-4 mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">{isRTL ? 'العنوان (عربي)' : 'Title (AR)'} *</Label>
                            <FieldAiActions value={form.title_ar} lang="ar" isRTL={isRTL} fieldType="title"
                              onTranslated={(v) => setField('title_en', v)} onImproved={(v) => setField('title_ar', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Input value={form.title_ar} onChange={e => handleTitleChange('title_ar', e.target.value)} placeholder={isRTL ? 'عنوان جذاب يتضمن الكلمة المفتاحية' : 'Compelling title with keyword'} />
                          <span className={`text-[10px] ${charHint(form.title_ar.length, 70)}`}>{form.title_ar.length}/70</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Title (EN)'}</Label>
                            <FieldAiActions value={form.title_en} lang="en" isRTL={isRTL} fieldType="title"
                              onTranslated={(v) => setField('title_ar', v)} onImproved={(v) => setField('title_en', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Input value={form.title_en} onChange={e => handleTitleChange('title_en', e.target.value)} dir="ltr" placeholder="SEO-friendly English title" />
                          <span className={`text-[10px] ${charHint(form.title_en.length, 70)}`}>{form.title_en.length}/70</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">{isRTL ? 'المقتطف (عربي)' : 'Excerpt (AR)'}</Label>
                            <FieldAiActions value={form.excerpt_ar || form.content_ar} lang="ar" isRTL={isRTL} fieldType="excerpt"
                              onTranslated={(v) => setField('excerpt_en', v)} onImproved={(v) => setField('excerpt_ar', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Textarea value={form.excerpt_ar} onChange={e => setField('excerpt_ar', e.target.value)} rows={2} />
                          <span className={`text-[10px] ${charHint(form.excerpt_ar.length, 200)}`}>{form.excerpt_ar.length}/200</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">{isRTL ? 'المقتطف (إنجليزي)' : 'Excerpt (EN)'}</Label>
                            <FieldAiActions value={form.excerpt_en || form.content_en} lang="en" isRTL={isRTL} fieldType="excerpt"
                              onTranslated={(v) => setField('excerpt_ar', v)} onImproved={(v) => setField('excerpt_en', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Textarea value={form.excerpt_en} onChange={e => setField('excerpt_en', e.target.value)} rows={2} dir="ltr" />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-semibold">{isRTL ? 'المحتوى (عربي)' : 'Content (AR)'}</Label>
                          <FieldAiActions value={form.content_ar} lang="ar" isRTL={isRTL} fieldType="content"
                            onTranslated={(v) => setField('content_en', v)} onImproved={(v) => setField('content_ar', v)} focusKeyword={form.focus_keyword} />
                        </div>
                        <RichMarkdownEditor value={form.content_ar} onChange={(v) => setField('content_ar', v)} dir="rtl" isRTL={true} minHeight="300px" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-semibold">{isRTL ? 'المحتوى (إنجليزي)' : 'Content (EN)'}</Label>
                          <FieldAiActions value={form.content_en} lang="en" isRTL={isRTL} fieldType="content"
                            onTranslated={(v) => setField('content_ar', v)} onImproved={(v) => setField('content_en', v)} focusKeyword={form.focus_keyword} />
                        </div>
                        <RichMarkdownEditor value={form.content_en} onChange={(v) => setField('content_en', v)} dir="ltr" isRTL={false} minHeight="300px" />
                      </div>
                    </TabsContent>

                    {/* SEO Tab */}
                    <TabsContent value="seo" className="space-y-4 mt-3">
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                          <Hash className="w-3.5 h-3.5 text-primary" /> {isRTL ? 'الكلمة المفتاحية الرئيسية' : 'Focus Keyword'}
                        </Label>
                        <Input value={form.focus_keyword} onChange={e => setField('focus_keyword', e.target.value)} className="bg-background"
                          placeholder={isRTL ? 'الكلمة المفتاحية الأساسية للمقال' : 'Primary keyword for this article'} />
                        {form.focus_keyword && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {isRTL ? 'الكثافة:' : 'Density:'} {contentStats.keywordDensity.toFixed(1)}% •
                            {isRTL ? ' التكرار:' : ' Count:'} {countInText(form.content_ar + ' ' + form.content_en, form.focus_keyword)}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Meta Title (AR)</Label>
                            <FieldAiActions value={form.meta_title_ar} lang="ar" isRTL={isRTL} fieldType="meta_title"
                              onTranslated={(v) => setField('meta_title_en', v)} onImproved={(v) => setField('meta_title_ar', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Input value={form.meta_title_ar} onChange={e => setField('meta_title_ar', e.target.value)} />
                          <span className={`text-[10px] ${charHint(form.meta_title_ar.length, 60)}`}>{form.meta_title_ar.length}/60</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Meta Title (EN)</Label>
                            <FieldAiActions value={form.meta_title_en} lang="en" isRTL={isRTL} fieldType="meta_title"
                              onTranslated={(v) => setField('meta_title_ar', v)} onImproved={(v) => setField('meta_title_en', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Input value={form.meta_title_en} onChange={e => setField('meta_title_en', e.target.value)} dir="ltr" />
                          <span className={`text-[10px] ${charHint(form.meta_title_en.length, 60)}`}>{form.meta_title_en.length}/60</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Meta Description (AR)</Label>
                            <FieldAiActions value={form.meta_description_ar} lang="ar" isRTL={isRTL} fieldType="meta_description"
                              onTranslated={(v) => setField('meta_description_en', v)} onImproved={(v) => setField('meta_description_ar', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Textarea value={form.meta_description_ar} onChange={e => setField('meta_description_ar', e.target.value)} rows={2} />
                          <span className={`text-[10px] ${charHint(form.meta_description_ar.length, 160)}`}>{form.meta_description_ar.length}/160</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Meta Description (EN)</Label>
                            <FieldAiActions value={form.meta_description_en} lang="en" isRTL={isRTL} fieldType="meta_description"
                              onTranslated={(v) => setField('meta_description_ar', v)} onImproved={(v) => setField('meta_description_en', v)} focusKeyword={form.focus_keyword} />
                          </div>
                          <Textarea value={form.meta_description_en} onChange={e => setField('meta_description_en', e.target.value)} rows={2} dir="ltr" />
                          <span className={`text-[10px] ${charHint(form.meta_description_en.length, 160)}`}>{form.meta_description_en.length}/160</span>
                        </div>
                      </div>

                      {/* Google Previews */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-[9px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Google AR</p>
                          <div className="space-y-0.5" dir="rtl">
                            <p className="text-primary text-sm font-medium truncate">{form.meta_title_ar || form.title_ar || 'عنوان الصفحة'}</p>
                            <p className="text-[10px] text-green-600 truncate">faneen.lovable.app/blog/{form.slug || 'your-post-slug'}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{form.meta_description_ar || form.excerpt_ar || 'سيظهر الوصف هنا...'}</p>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-[9px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Google EN</p>
                          <div className="space-y-0.5" dir="ltr">
                            <p className="text-primary text-sm font-medium truncate">{form.meta_title_en || form.title_en || 'Page Title'}</p>
                            <p className="text-[10px] text-green-600 truncate">faneen.lovable.app/blog/{form.slug || 'your-post-slug'}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{form.meta_description_en || form.excerpt_en || 'Description here...'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Keywords & Canonical */}
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> {isRTL ? 'الكلمات المفتاحية' : 'SEO Keywords'}</Label>
                        <Input value={form.keywords} onChange={e => setField('keywords', e.target.value)} dir="ltr" placeholder="keyword1, keyword2" className="mt-1" />
                        {form.keywords && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {form.keywords.split(',').map((k, i) => k.trim() && <Badge key={i} variant="secondary" className="text-[10px] gap-0.5"><Hash className="w-2.5 h-2.5" />{k.trim()}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Canonical URL</Label>
                          <Input value={form.canonical_url} onChange={e => setField('canonical_url', e.target.value)} dir="ltr" placeholder="https://..." className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">OG Image URL</Label>
                          <Input value={form.og_image_url} onChange={e => setField('og_image_url', e.target.value)} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Media Tab */}
                    <TabsContent value="media" className="space-y-4 mt-3">
                      <div>
                        <Label className="text-xs font-semibold mb-2 block">{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                        <ImageUpload bucket="blog-images" value={form.cover_image_url}
                          onChange={(url) => { setField('cover_image_url', url); if (!form.og_image_url) setField('og_image_url', url); }}
                          onRemove={() => setField('cover_image_url', '')}
                          placeholder={isRTL ? 'اضغط لرفع صورة الغلاف (1200×630 موصى)' : 'Upload cover (1200×630 recommended)'} />
                        <p className="text-[10px] text-muted-foreground mt-1">{isRTL ? 'الأبعاد المثالية: 1200×630 بكسل' : 'Ideal: 1200×630px'}</p>
                      </div>
                      {form.cover_image_url && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{isRTL ? 'معاينة بطاقة المشاركة' : 'Social Card Preview'}</p>
                          <div className="rounded-lg overflow-hidden border border-border/50 max-w-sm">
                            <img src={form.og_image_url || form.cover_image_url} alt="" className="w-full aspect-[1.91/1] object-cover" />
                            <div className="p-2 bg-background">
                              <p className="text-[10px] text-muted-foreground">faneen.lovable.app</p>
                              <p className="text-xs font-medium truncate">{form.meta_title_en || form.title_en || form.title_ar}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="mt-3">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Button variant={previewLang === 'ar' ? 'default' : 'outline'} size="sm" className="text-xs h-7"
                          onClick={() => setPreviewLang('ar')}>عربي</Button>
                        <Button variant={previewLang === 'en' ? 'default' : 'outline'} size="sm" className="text-xs h-7"
                          onClick={() => setPreviewLang('en')}>English</Button>
                      </div>
                      <div className="p-6 rounded-xl border border-border/50 bg-background min-h-[400px]">
                        <ArticlePreview
                          title={previewLang === 'ar' ? form.title_ar : form.title_en}
                          content={previewLang === 'ar' ? form.content_ar : form.content_en}
                          excerpt={previewLang === 'ar' ? form.excerpt_ar : form.excerpt_en}
                          coverImage={form.cover_image_url}
                          category={blogCategories.find(c => c.value === form.category)?.[previewLang === 'ar' ? 'ar' : 'en'] || form.category}
                          tags={form.tags}
                          focusKeyword={form.focus_keyword}
                          readingTime={contentStats.readingTime}
                          isRTL={isRTL}
                          lang={previewLang}
                        />
                      </div>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4 mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Slug (URL)</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground shrink-0">/blog/</span>
                            <Input value={form.slug} onChange={e => setField('slug', e.target.value)} dir="ltr" placeholder="auto-generated" className="flex-1" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'التصنيف' : 'Category'}</Label>
                          <Select value={form.category} onValueChange={v => setField('category', v)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{blogCategories.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'الحالة' : 'Status'}</Label>
                          <Select value={form.status} onValueChange={v => { setField('status', v); if (v !== 'scheduled') setScheduledDate(undefined); }}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                              <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                              <SelectItem value="scheduled">{isRTL ? 'مجدول' : 'Scheduled'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'الوسوم' : 'Tags'}</Label>
                          <Input value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder="tag1, tag2" dir="ltr" className="mt-1" />
                        </div>
                        {/* Schedule date picker */}
                        {form.status === 'scheduled' && (
                          <div>
                            <Label className="text-xs flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {isRTL ? 'تاريخ النشر' : 'Publish Date'}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full mt-1 justify-start text-left text-xs font-normal", !scheduledDate && "text-muted-foreground")}>
                                  <CalendarIcon className="w-3.5 h-3.5 me-1.5" />
                                  {scheduledDate ? format(scheduledDate, 'PPP') : (isRTL ? 'اختر التاريخ' : 'Pick date')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate}
                                  disabled={(date) => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>

                      {form.tags && (
                        <div className="flex flex-wrap gap-1">
                          {form.tags.split(',').map((t, i) => t.trim() && <Badge key={i} variant="outline" className="text-[10px]">{t.trim()}</Badge>)}
                        </div>
                      )}

                      {/* Schema.org */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" /> Schema.org</p>
                        <div className="text-[10px] text-muted-foreground space-y-0.5 font-mono">
                          <p>@type: "BlogPosting"</p>
                          <p>headline: "{form.meta_title_en || form.title_en || form.title_ar || '...'}"</p>
                          <p>datePublished: "{scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]}"</p>
                          <p>wordCount: {contentStats.wordCountAr + contentStats.wordCountEn}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || saveMutation.isPending} className="flex-1 gap-1.5">
                      {saveMutation.isPending ? '...' : (
                        <>
                          {form.status === 'scheduled' ? (isRTL ? 'جدولة' : 'Schedule') :
                           editId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'نشر' : 'Publish')}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              {/* SEO Score */}
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" /> {isRTL ? 'تقييم SEO' : 'SEO Score'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <SeoScorePanel isRTL={isRTL} analysis={seoAnalysis} localScore={localScore}
                    isAnalyzing={aiLoading === 'analyze'} contentStats={contentStats} focusKeyword={form.focus_keyword} />
                </CardContent>
              </Card>

              {/* Draft Versions */}
              {editId && (
                <Card>
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary" /> {isRTL ? 'النسخ الاحتياطية' : 'Versions'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <DraftVersions isRTL={isRTL} versions={draftVersions as any} onRestore={handleRestoreDraft}
                      onDelete={handleDeleteDraft} lastSaved={lastAutoSave} isSaving={isAutoSaving} onManualSave={handleManualSaveDraft} />
                  </CardContent>
                </Card>
              )}

              {/* Competitor Analysis Results */}
              {competitorAnalysis && (
                <Card>
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-primary" /> {isRTL ? 'تحليل المنافسين' : 'Competitor Analysis'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-3">
                    <div className="text-center">
                      <span className={`text-2xl font-bold ${competitorAnalysis.competitive_score >= 70 ? 'text-green-500' : competitorAnalysis.competitive_score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {competitorAnalysis.competitive_score}
                      </span>
                      <p className="text-[9px] text-muted-foreground">{isRTL ? 'نقاط التنافسية' : 'Competitive Score'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-1.5 rounded bg-muted/30 text-center">
                        <p className="font-medium">{competitorAnalysis.keyword_difficulty}</p>
                        <p className="text-muted-foreground text-[9px]">{isRTL ? 'صعوبة' : 'Difficulty'}</p>
                      </div>
                      <div className="p-1.5 rounded bg-muted/30 text-center">
                        <p className="font-medium">{competitorAnalysis.estimated_position}</p>
                        <p className="text-muted-foreground text-[9px]">{isRTL ? 'الترتيب المتوقع' : 'Est. Position'}</p>
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-green-600">{isRTL ? 'نقاط القوة' : 'Strengths'}</p>
                      {(isRTL ? competitorAnalysis.strengths_ar : competitorAnalysis.strengths_en)?.map((s: string, i: number) => (
                        <p key={i} className="text-[10px] flex items-start gap-1"><CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />{s}</p>
                      ))}
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-red-600">{isRTL ? 'نقاط الضعف' : 'Weaknesses'}</p>
                      {(isRTL ? competitorAnalysis.weaknesses_ar : competitorAnalysis.weaknesses_en)?.map((s: string, i: number) => (
                        <p key={i} className="text-[10px] flex items-start gap-1"><XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />{s}</p>
                      ))}
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-primary">{isRTL ? 'التوصيات' : 'Tips'}</p>
                      {(isRTL ? competitorAnalysis.recommendations_ar : competitorAnalysis.recommendations_en)?.map((s: string, i: number) => (
                        <p key={i} className="text-[10px] flex items-start gap-1"><AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />{s}</p>
                      ))}
                    </div>

                    {/* Content Gaps */}
                    {(isRTL ? competitorAnalysis.content_gap_ar : competitorAnalysis.content_gap_en)?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{isRTL ? 'فجوات المحتوى' : 'Content Gaps'}</p>
                        {(isRTL ? competitorAnalysis.content_gap_ar : competitorAnalysis.content_gap_en)?.map((s: string, i: number) => (
                          <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><span className="text-primary">•</span>{s}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Posts List */}
        {!showForm && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="ps-9" placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                  <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : filteredPosts.length === 0 ? (
              <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{isRTL ? 'لا توجد مقالات' : 'No articles found'}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredPosts.map((p: any) => (
                  <Card key={p.id} className="border-border/40 hover:border-primary/20 transition-all group">
                    <CardContent className="p-3 flex items-center gap-3">
                      {p.cover_image_url && (
                        <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img src={p.cover_image_url} alt={p.title_ar} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-heading font-bold text-sm truncate">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                          <Badge variant={p.status === 'published' ? 'default' : 'outline'} className="text-[9px] shrink-0">
                            {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
                          </Badge>
                          {p.scheduled_at && (
                            <Badge variant="secondary" className="text-[9px] shrink-0 gap-0.5">
                              <CalendarClock className="w-2.5 h-2.5" />{new Date(p.scheduled_at).toLocaleDateString()}
                            </Badge>
                          )}
                          {p.seo_score > 0 && (
                            <Badge variant="secondary" className={`text-[9px] shrink-0 ${p.seo_score >= 80 ? 'bg-green-500/10 text-green-600' : p.seo_score >= 50 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                              SEO {p.seo_score}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{p.views_count}</span>
                          <span className="flex items-center gap-0.5"><CalendarIcon className="w-3 h-3" />{new Date(p.created_at).toLocaleDateString()}</span>
                          {p.focus_keyword && <span className="flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{p.focus_keyword}</span>}
                          {p.reading_time_minutes > 0 && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{p.reading_time_minutes}{isRTL ? 'د' : 'm'}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-3 h-3" /></Button>
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
