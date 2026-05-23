import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { pingSearchEngines } from '@/modules/seo';
import { invokeBlogAiTools } from '@/modules/ai';
import {
  fetchLandingContent,
  fetchLandingFeatures,
  fetchLandingFaq,
  fetchLandingTestimonials,
  fetchLandingSettings,
  fetchLandingMetrics,
} from '@/services/providerLandingService';
import { Loader2, Save, Trash2, Plus, ExternalLink, BarChart3, Eye, MousePointerClick, UserPlus, TrendingUp, Sparkles } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/* Brand-aligned chart palette — sourced from central design tokens.
   No purple/cyan/pink/neon. */
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--muted-foreground))',
];

const AdminProviderLanding = () => {
  useNoIndex();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('content');

  const { data: content = [] } = useQuery({ queryKey: ['plp_content'], queryFn: fetchLandingContent });
  const { data: features = [] } = useQuery({ queryKey: ['plp_features'], queryFn: fetchLandingFeatures });
  const { data: faq = [] } = useQuery({ queryKey: ['plp_faq'], queryFn: fetchLandingFaq });
  const { data: testimonials = [] } = useQuery({ queryKey: ['plp_testimonials'], queryFn: fetchLandingTestimonials });
  const { data: settings } = useQuery({ queryKey: ['plp_settings'], queryFn: fetchLandingSettings });
  const { data: metrics } = useQuery({ queryKey: ['plp_metrics'], queryFn: () => fetchLandingMetrics(30) });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['plp_content'] });
    qc.invalidateQueries({ queryKey: ['plp_features'] });
    qc.invalidateQueries({ queryKey: ['plp_faq'] });
    qc.invalidateQueries({ queryKey: ['plp_testimonials'] });
    qc.invalidateQueries({ queryKey: ['plp_settings'] });
    qc.invalidateQueries({ queryKey: ['plp_metrics'] });
  };

  const handleErr = (e: unknown) => {
    const msg = e instanceof Error ? e.message : 'حدث خطأ';
    toast({ title: 'خطأ', description: msg, variant: 'destructive' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">صفحة هبوط المزودين</h1>
            <p className="text-sm text-muted-foreground mt-1">تحرير محتوى /for-providers، التحليلات، وتكاملات SEO</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/for-providers" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 me-2" /> معاينة الصفحة
            </a>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="content">المحتوى</TabsTrigger>
            <TabsTrigger value="features">الميزات</TabsTrigger>
            <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
            <TabsTrigger value="testimonials">الشهادات</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="analytics">التحليلات</TabsTrigger>
            <TabsTrigger value="integrations">التكاملات</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
          </TabsList>

          {/* CONTENT */}
          <TabsContent value="content" className="space-y-4 mt-4">
            {content.map((c) => (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{c.section_key}</Badge>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={async (v) => {
                        try {
                          const { error } = await supabase.from('provider_landing_content').update({ is_active: v }).eq('id', c.id);
                          if (error) throw error;
                          refreshAll();
                        } catch (e) { handleErr(e); }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">{c.is_active ? 'مفعل' : 'معطل'}</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">العنوان (عربي)</Label>
                    <Input defaultValue={c.title_ar ?? ''} dir="auto" id={`t-ar-${c.id}`} />
                  </div>
                  <div>
                    <Label className="text-xs">Title (English)</Label>
                    <Input defaultValue={c.title_en ?? ''} dir="auto" id={`t-en-${c.id}`} />
                  </div>
                  <div>
                    <Label className="text-xs">العنوان الفرعي (عربي)</Label>
                    <Textarea defaultValue={c.subtitle_ar ?? ''} dir="auto" id={`s-ar-${c.id}`} rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">Subtitle (English)</Label>
                    <Textarea defaultValue={c.subtitle_en ?? ''} dir="auto" id={`s-en-${c.id}`} rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">زر رئيسي (عربي)</Label>
                    <Input defaultValue={c.cta_primary_label_ar ?? ''} id={`cta1-ar-${c.id}`} />
                  </div>
                  <div>
                    <Label className="text-xs">Primary CTA (English)</Label>
                    <Input defaultValue={c.cta_primary_label_en ?? ''} id={`cta1-en-${c.id}`} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">رابط الزر الرئيسي</Label>
                    <Input defaultValue={c.cta_primary_href ?? ''} id={`cta1-href-${c.id}`} dir="ltr" className="tech-content" />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? null;
                      const { error } = await supabase.from('provider_landing_content').update({
                        title_ar: get(`t-ar-${c.id}`),
                        title_en: get(`t-en-${c.id}`),
                        subtitle_ar: get(`s-ar-${c.id}`),
                        subtitle_en: get(`s-en-${c.id}`),
                        cta_primary_label_ar: get(`cta1-ar-${c.id}`),
                        cta_primary_label_en: get(`cta1-en-${c.id}`),
                        cta_primary_href: get(`cta1-href-${c.id}`),
                      }).eq('id', c.id);
                      if (error) throw error;
                      toast({ title: 'تم الحفظ' });
                      refreshAll();
                    } catch (e) { handleErr(e); }
                  }}
                >
                  <Save className="w-4 h-4 me-2" /> حفظ
                </Button>
              </Card>
            ))}
          </TabsContent>

          {/* FEATURES */}
          <TabsContent value="features" className="space-y-3 mt-4">
            <Card className="p-4">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const max = Math.max(0, ...features.map(f => f.sort_order));
                    const { error } = await supabase.from('provider_landing_features').insert([{
                      icon_name: 'Sparkles',
                      title_ar: 'ميزة جديدة',
                      title_en: 'New Feature',
                      desc_ar: 'الوصف بالعربية',
                      desc_en: 'Description',
                      sort_order: max + 1,
                    }]);
                    if (error) throw error;
                    refreshAll();
                  } catch (e) { handleErr(e); }
                }}
              >
                <Plus className="w-4 h-4 me-2" /> إضافة ميزة
              </Button>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((f) => (
                <Card key={f.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input defaultValue={f.icon_name} className="w-32 h-8 text-xs" id={`fi-${f.id}`} placeholder="Icon" />
                    <Switch
                      checked={f.is_active}
                      onCheckedChange={async (v) => {
                        await supabase.from('provider_landing_features').update({ is_active: v }).eq('id', f.id);
                        refreshAll();
                      }}
                    />
                  </div>
                  <Input defaultValue={f.title_ar} dir="auto" id={`ft-ar-${f.id}`} placeholder="عنوان عربي" />
                  <Input defaultValue={f.title_en ?? ''} dir="auto" id={`ft-en-${f.id}`} placeholder="Title EN" />
                  <Textarea defaultValue={f.desc_ar} dir="auto" id={`fd-ar-${f.id}`} rows={2} placeholder="وصف عربي" />
                  <Textarea defaultValue={f.desc_en ?? ''} dir="auto" id={`fd-en-${f.id}`} rows={2} placeholder="Description EN" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value;
                        try {
                          const { error } = await supabase.from('provider_landing_features').update({
                            icon_name: get(`fi-${f.id}`),
                            title_ar: get(`ft-ar-${f.id}`),
                            title_en: get(`ft-en-${f.id}`),
                            desc_ar: get(`fd-ar-${f.id}`),
                            desc_en: get(`fd-en-${f.id}`),
                          }).eq('id', f.id);
                          if (error) throw error;
                          toast({ title: 'تم الحفظ' });
                          refreshAll();
                        } catch (e) { handleErr(e); }
                      }}
                    >
                      <Save className="w-3.5 h-3.5 me-1" /> حفظ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!confirm('حذف هذه الميزة؟')) return;
                        await supabase.from('provider_landing_features').delete().eq('id', f.id);
                        refreshAll();
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-3 mt-4">
            <Card className="p-4">
              <Button
                size="sm"
                onClick={async () => {
                  const max = Math.max(0, ...faq.map(f => f.sort_order));
                  await supabase.from('provider_landing_faq').insert([{
                    question_ar: 'سؤال جديد', question_en: 'New question',
                    answer_ar: 'إجابة', answer_en: 'Answer',
                    sort_order: max + 1,
                  }]);
                  refreshAll();
                }}
              >
                <Plus className="w-4 h-4 me-2" /> إضافة سؤال
              </Button>
            </Card>
            {faq.map((q) => (
              <Card key={q.id} className="p-3 space-y-2">
                <Input defaultValue={q.question_ar} dir="auto" id={`qa-${q.id}`} placeholder="السؤال (عربي)" />
                <Input defaultValue={q.question_en ?? ''} dir="auto" id={`qe-${q.id}`} placeholder="Question (EN)" />
                <Textarea defaultValue={q.answer_ar} dir="auto" id={`aa-${q.id}`} rows={3} placeholder="الإجابة (عربي)" />
                <Textarea defaultValue={q.answer_en ?? ''} dir="auto" id={`ae-${q.id}`} rows={3} placeholder="Answer (EN)" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value;
                      try {
                        const { error } = await supabase.from('provider_landing_faq').update({
                          question_ar: get(`qa-${q.id}`),
                          question_en: get(`qe-${q.id}`),
                          answer_ar: get(`aa-${q.id}`),
                          answer_en: get(`ae-${q.id}`),
                        }).eq('id', q.id);
                        if (error) throw error;
                        toast({ title: 'تم الحفظ' });
                        refreshAll();
                      } catch (e) { handleErr(e); }
                    }}
                  >
                    <Save className="w-3.5 h-3.5 me-1" /> حفظ
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!confirm('حذف؟')) return;
                    await supabase.from('provider_landing_faq').delete().eq('id', q.id);
                    refreshAll();
                  }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  <Switch checked={q.is_active} onCheckedChange={async (v) => {
                    await supabase.from('provider_landing_faq').update({ is_active: v }).eq('id', q.id);
                    refreshAll();
                  }} />
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* TESTIMONIALS */}
          <TabsContent value="testimonials" className="space-y-3 mt-4">
            <Card className="p-4">
              <Button size="sm" onClick={async () => {
                const max = Math.max(0, ...testimonials.map(t => t.sort_order));
                await supabase.from('provider_landing_testimonials').insert([{
                  author_name: 'اسم', quote_ar: 'اقتباس', quote_en: 'Quote', rating: 5,
                  sort_order: max + 1,
                }]);
                refreshAll();
              }}>
                <Plus className="w-4 h-4 me-2" /> إضافة شهادة
              </Button>
            </Card>
            <div className="grid md:grid-cols-2 gap-3">
              {testimonials.map((t) => (
                <Card key={t.id} className="p-3 space-y-2">
                  <Input defaultValue={t.author_name} id={`tn-${t.id}`} placeholder="الاسم" />
                  <Input defaultValue={t.author_role_ar ?? ''} id={`tra-${t.id}`} placeholder="الدور (عربي)" />
                  <Input defaultValue={t.author_role_en ?? ''} id={`tre-${t.id}`} placeholder="Role (EN)" />
                  <Textarea defaultValue={t.quote_ar} id={`tqa-${t.id}`} rows={2} placeholder="اقتباس عربي" />
                  <Textarea defaultValue={t.quote_en ?? ''} id={`tqe-${t.id}`} rows={2} placeholder="Quote EN" />
                  <Input defaultValue={t.avatar_url ?? ''} id={`tav-${t.id}`} placeholder="صورة URL" dir="ltr" className="tech-content" />
                  <Input type="number" min="1" max="5" step="0.5" defaultValue={t.rating ?? 5} id={`trt-${t.id}`} placeholder="تقييم" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => {
                      const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value;
                      try {
                        const { error } = await supabase.from('provider_landing_testimonials').update({
                          author_name: get(`tn-${t.id}`),
                          author_role_ar: get(`tra-${t.id}`),
                          author_role_en: get(`tre-${t.id}`),
                          quote_ar: get(`tqa-${t.id}`),
                          quote_en: get(`tqe-${t.id}`),
                          avatar_url: get(`tav-${t.id}`) || null,
                          rating: Number(get(`trt-${t.id}`)) || 5,
                        }).eq('id', t.id);
                        if (error) throw error;
                        toast({ title: 'تم الحفظ' });
                        refreshAll();
                      } catch (e) { handleErr(e); }
                    }}><Save className="w-3.5 h-3.5 me-1" />حفظ</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (!confirm('حذف؟')) return;
                      await supabase.from('provider_landing_testimonials').delete().eq('id', t.id);
                      refreshAll();
                    }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    <Switch checked={t.is_active} onCheckedChange={async (v) => {
                      await supabase.from('provider_landing_testimonials').update({ is_active: v }).eq('id', t.id);
                      refreshAll();
                    }} />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo" className="space-y-3 mt-4">
            <SettingsForm settings={settings as unknown as Record<string, unknown> | null} keys={['seo_title_ar', 'seo_title_en', 'seo_desc_ar', 'seo_desc_en', 'keywords', 'og_image_url']} onSaved={refreshAll} />
          </TabsContent>

          {/* ANALYTICS */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={Eye} label="مشاهدات" value={metrics?.totalViews ?? 0} color="text-info" />
              <KpiCard icon={UserPlus} label="جلسات فريدة" value={metrics?.uniqueSessions ?? 0} color="text-success" />
              <KpiCard icon={MousePointerClick} label="نقرات CTA" value={metrics?.ctaClicks ?? 0} color="text-warning" />
              <KpiCard icon={TrendingUp} label="معدل التحويل" value={`${metrics?.conversionRate ?? 0}%`} color="text-destructive" />
            </div>
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">الأحداث اليومية (آخر 30 يوم)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={metrics?.byDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" name="مشاهدات" />
                  <Line type="monotone" dataKey="clicks" stroke="hsl(var(--accent))" name="نقرات" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">أعلى المصادر (UTM)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics?.bySource ?? []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">التفاعل حسب القسم</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={metrics?.bySection ?? []} dataKey="count" nameKey="section" outerRadius={80} label>
                      {(metrics?.bySection ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* INTEGRATIONS */}
          <TabsContent value="integrations" className="space-y-3 mt-4">
            <SettingsForm settings={settings as unknown as Record<string, unknown> | null} keys={['ga4_measurement_id', 'gtm_container_id', 'gsc_verification', 'bing_verification', 'yandex_verification', 'indexnow_key']} onSaved={refreshAll} />
            <Card className="p-4">
              <h3 className="font-semibold mb-2">إجراءات سريعة</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    const { error } = await pingSearchEngines({ url: 'https://qitaat.com/for-providers' });
                    if (error) throw error;
                    toast({ title: 'تم إرسال طلب الفهرسة' });
                  } catch (e) { handleErr(e); }
                }}>إخطار محركات البحث</Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    Google Search Console <ExternalLink className="w-3.5 h-3.5 ms-1" />
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">
                    Google Analytics 4 <ExternalLink className="w-3.5 h-3.5 ms-1" />
                  </a>
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* AI */}
          <TabsContent value="ai" className="space-y-3 mt-4">
            <AiAssistantPanel onSaved={refreshAll} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const KpiCard = ({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </div>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
  </Card>
);

const SettingsForm = ({ settings, keys, onSaved }: { settings: Record<string, unknown> | null | undefined; keys: string[]; onSaved: () => void }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const labels: Record<string, string> = {
    seo_title_ar: 'عنوان SEO (عربي)',
    seo_title_en: 'SEO Title (EN)',
    seo_desc_ar: 'وصف SEO (عربي)',
    seo_desc_en: 'SEO Description (EN)',
    keywords: 'الكلمات المفتاحية',
    og_image_url: 'صورة OG (URL)',
    ga4_measurement_id: 'GA4 Measurement ID (G-XXXXXX)',
    gtm_container_id: 'GTM Container ID (GTM-XXXX)',
    gsc_verification: 'Google Search Console Verification',
    bing_verification: 'Bing Verification',
    yandex_verification: 'Yandex Verification',
    indexnow_key: 'IndexNow Key',
  };
  return (
    <Card className="p-4 space-y-3">
      {keys.map((k) => {
        const isLong = k.includes('desc') || k === 'keywords';
        return (
          <div key={k}>
            <Label className="text-xs">{labels[k] ?? k}</Label>
            {isLong ? (
              <Textarea id={`s-${k}`} defaultValue={(settings?.[k] as string) ?? ''} dir="auto" rows={2} />
            ) : (
              <Input id={`s-${k}`} defaultValue={(settings?.[k] as string) ?? ''} dir={k.includes('id') || k.includes('key') || k.includes('url') || k.includes('verification') ? 'ltr' : 'auto'} className={k.includes('id') ? 'tech-content' : ''} />
            )}
          </div>
        );
      })}
      <Button
        size="sm"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            const update: Record<string, string | null> = {};
            for (const k of keys) {
              const el = document.getElementById(`s-${k}`) as HTMLInputElement | HTMLTextAreaElement | null;
              update[k] = el?.value || null;
            }
            const { error } = await supabase.from('provider_landing_settings').update(update as never).eq('id', 1);
            if (error) throw error;
            toast({ title: 'تم حفظ الإعدادات' });
            onSaved();
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'خطأ';
            toast({ title: 'خطأ', description: msg, variant: 'destructive' });
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />} حفظ الإعدادات
      </Button>
    </Card>
  );
};

const AiAssistantPanel = ({ onSaved }: { onSaved: () => void }) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = [
    { label: 'اقترح عناوين SEO بديلة', prompt: 'اقترح 5 عناوين SEO احترافية بالعربية لصفحة هبوط مزودي خدمات صناعات الألمنيوم والحديد والزجاج، أقل من 60 حرف، تتضمن كلمات مفتاحية قوية' },
    { label: 'اقترح كلمات مفتاحية', prompt: 'اقترح 20 كلمة مفتاحية عربية وإنجليزية لصفحة تستهدف ورش الألمنيوم والحديد والزجاج للتسجيل في دليل أعمال صناعي' },
    { label: 'اكتب وصف Meta', prompt: 'اكتب 3 أوصاف Meta احترافية بالعربية، أقل من 160 حرف، لصفحة هبوط لاستقطاب أصحاب ورش الصناعات الخفيفة' },
    { label: 'أسئلة شائعة جديدة', prompt: 'اقترح 5 أسئلة شائعة جديدة بإجاباتها بالعربية والإنجليزية لصفحة هبوط مزودي خدمات الصناعات الخفيفة' },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="w-4 h-4 text-primary" /> مساعد AI لتحسين المحتوى
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button key={p.label} size="sm" variant="outline" onClick={() => setPrompt(p.prompt)}>
            {p.label}
          </Button>
        ))}
      </div>
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} dir="auto" rows={3} placeholder="اكتب طلبك للذكاء الاصطناعي..." />
      <Button
        size="sm"
        disabled={loading || !prompt.trim()}
        onClick={async () => {
          setLoading(true);
          setOutput('');
          try {
            const { data, error } = await invokeBlogAiTools({
              action: 'generate',
              prompt,
              model: 'google/gemini-2.5-flash',
            });
            if (error) throw error;
            const text = (data as { text?: string; content?: string })?.text || (data as { content?: string })?.content || JSON.stringify(data);
            setOutput(text);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'خطأ';
            toast({ title: 'خطأ', description: msg, variant: 'destructive' });
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />} توليد
      </Button>
      {output && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed" dir="auto">
          {output}
        </div>
      )}
    </Card>
  );
};

export default AdminProviderLanding;
