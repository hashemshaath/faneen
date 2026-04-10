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
import { Slider } from '@/components/ui/slider';
import { Plus, Edit, Trash2, Layers, Thermometer, Volume2, Shield, X } from 'lucide-react';
import { toast } from 'sonner';

const categoryOptions = [
  { value: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { value: 'kitchen', ar: 'المطابخ', en: 'Kitchens' },
  { value: 'iron', ar: 'الحديد', en: 'Iron' },
  { value: 'glass', ar: 'الزجاج', en: 'Glass' },
  { value: 'wood', ar: 'الخشب', en: 'Wood' },
  { value: 'upvc', ar: 'UPVC', en: 'UPVC' },
];

const DashboardProfileSystems = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const initialForm = {
    name_ar: '', name_en: '', slug: '', description_ar: '', description_en: '',
    category: 'aluminum', profile_type: 'market', cover_image_url: '', logo_url: '',
    thermal_insulation_rating: 5, sound_insulation_rating: 5, strength_rating: 5,
    max_height_mm: '', max_width_mm: '', available_colors: '',
    features_ar: '', features_en: '', recommendation_level: 'standard',
    applications_ar: '', applications_en: '', status: 'published',
  };
  const [form, setForm] = useState(initialForm);

  const closeForm = () => { setShowForm(false); setForm(initialForm); setEditId(null); };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() || `profile-${Date.now()}`;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profile-systems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profile_systems').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || generateSlug(form.name_en || form.name_ar);
      const payload = {
        name_ar: form.name_ar, name_en: form.name_en || null, slug,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        category: form.category, profile_type: form.profile_type,
        cover_image_url: form.cover_image_url || null, logo_url: form.logo_url || null,
        thermal_insulation_rating: form.thermal_insulation_rating,
        sound_insulation_rating: form.sound_insulation_rating,
        strength_rating: form.strength_rating,
        max_height_mm: form.max_height_mm ? Number(form.max_height_mm) : null,
        max_width_mm: form.max_width_mm ? Number(form.max_width_mm) : null,
        available_colors: form.available_colors ? form.available_colors.split(',').map(s => s.trim()).filter(Boolean) : [],
        features_ar: form.features_ar ? form.features_ar.split('\n').filter(Boolean) : [],
        features_en: form.features_en ? form.features_en.split('\n').filter(Boolean) : [],
        recommendation_level: form.recommendation_level,
        applications_ar: form.applications_ar || null, applications_en: form.applications_en || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from('profile_systems').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profile_systems').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile-systems'] });
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
      closeForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profile_systems').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile-systems'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const openEdit = (p: any) => {
    setForm({
      name_ar: p.name_ar, name_en: p.name_en || '', slug: p.slug,
      description_ar: p.description_ar || '', description_en: p.description_en || '',
      category: p.category, profile_type: p.profile_type,
      cover_image_url: p.cover_image_url || '', logo_url: p.logo_url || '',
      thermal_insulation_rating: p.thermal_insulation_rating || 5,
      sound_insulation_rating: p.sound_insulation_rating || 5,
      strength_rating: p.strength_rating || 5,
      max_height_mm: p.max_height_mm?.toString() || '', max_width_mm: p.max_width_mm?.toString() || '',
      available_colors: (p.available_colors || []).join(', '),
      features_ar: (p.features_ar || []).join('\n'), features_en: (p.features_en || []).join('\n'),
      recommendation_level: p.recommendation_level, applications_ar: p.applications_ar || '',
      applications_en: p.applications_en || '', status: p.status,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const RatingSlider = ({ label, icon: Icon, value, onChange }: { label: string; icon: React.ElementType; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs"><Icon className="w-3.5 h-3.5" />{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{value}/10</span>
      </div>
      <Slider value={[value]} onValueChange={v => onChange(v[0])} max={10} step={1} />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Layers className="w-6 h-6 text-gold" />
              {isRTL ? 'إدارة القطاعات' : 'Profile Systems'}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'إضافة وإدارة قطاعات الألمنيوم والمواد' : 'Add and manage aluminum and material profiles'}</p>
          </div>
          {!showForm && (
            <Button variant="hero" size="sm" onClick={() => { closeForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة قطاع' : 'Add Profile'}
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editId ? (isRTL ? 'تعديل القطاع' : 'Edit Profile') : (isRTL ? 'إضافة قطاع جديد' : 'Add New Profile')}</CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'الاسم (عربي)' : 'Name (AR)'} *</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
                <div><Label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} dir="ltr" /></div>
              </div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} dir="ltr" placeholder="auto-generated" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>{isRTL ? 'الفئة' : 'Category'}</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isRTL ? 'النوع' : 'Type'}</Label>
                  <Select value={form.profile_type} onValueChange={v => setForm(f => ({ ...f, profile_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">{isRTL ? 'قطاع سوق' : 'Market'}</SelectItem>
                      <SelectItem value="custom">{isRTL ? 'تصميم خاص' : 'Custom'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isRTL ? 'التوصية' : 'Recommendation'}</Label>
                  <Select value={form.recommendation_level} onValueChange={v => setForm(f => ({ ...f, recommendation_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">{isRTL ? 'قياسي' : 'Standard'}</SelectItem>
                      <SelectItem value="recommended">{isRTL ? 'موصى به' : 'Recommended'}</SelectItem>
                      <SelectItem value="premium">{isRTL ? 'احترافي' : 'Premium'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} /></div>
              <div><Label>{isRTL ? 'صورة الغلاف' : 'Cover Image URL'}</Label><Input value={form.cover_image_url} onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))} dir="ltr" /></div>
              <div><Label>{isRTL ? 'الشعار' : 'Logo URL'}</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} dir="ltr" /></div>

              <div className="p-4 rounded-xl bg-muted/30 space-y-3">
                <h4 className="font-heading font-bold text-sm">{isRTL ? 'التقييمات الفنية' : 'Technical Ratings'}</h4>
                <RatingSlider label={isRTL ? 'العزل الحراري' : 'Thermal'} icon={Thermometer} value={form.thermal_insulation_rating} onChange={v => setForm(f => ({ ...f, thermal_insulation_rating: v }))} />
                <RatingSlider label={isRTL ? 'العزل الصوتي' : 'Sound'} icon={Volume2} value={form.sound_insulation_rating} onChange={v => setForm(f => ({ ...f, sound_insulation_rating: v }))} />
                <RatingSlider label={isRTL ? 'التحمل' : 'Strength'} icon={Shield} value={form.strength_rating} onChange={v => setForm(f => ({ ...f, strength_rating: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'أقصى ارتفاع (mm)' : 'Max Height (mm)'}</Label><Input type="number" value={form.max_height_mm} onChange={e => setForm(f => ({ ...f, max_height_mm: e.target.value }))} dir="ltr" /></div>
                <div><Label>{isRTL ? 'أقصى عرض (mm)' : 'Max Width (mm)'}</Label><Input type="number" value={form.max_width_mm} onChange={e => setForm(f => ({ ...f, max_width_mm: e.target.value }))} dir="ltr" /></div>
              </div>
              <div><Label>{isRTL ? 'الألوان (مفصولة بفاصلة)' : 'Colors (comma-separated)'}</Label><Input value={form.available_colors} onChange={e => setForm(f => ({ ...f, available_colors: e.target.value }))} placeholder="أبيض, رمادي, أسود, بني" /></div>
              <div><Label>{isRTL ? 'المميزات (سطر لكل ميزة)' : 'Features (one per line)'}</Label><Textarea value={form.features_ar} onChange={e => setForm(f => ({ ...f, features_ar: e.target.value }))} rows={4} placeholder={isRTL ? 'عزل حراري ممتاز\nمقاوم للتآكل\nصديق للبيئة' : ''} /></div>
              <div><Label>{isRTL ? 'الاستخدامات' : 'Applications'}</Label><Textarea value={form.applications_ar} onChange={e => setForm(f => ({ ...f, applications_ar: e.target.value }))} rows={2} /></div>

              <div className="flex gap-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? '...' : (editId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add'))}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : profiles.length === 0 && !showForm ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isRTL ? 'لا توجد قطاعات بعد' : 'No profiles yet'}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {profiles.map((p: any) => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  {p.cover_image_url ? (
                    <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0"><img src={p.cover_image_url} alt="" className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="w-20 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0"><Layers className="w-6 h-6 text-muted-foreground/30" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold truncate">{language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">{categoryOptions.find(c => c.value === p.category)?.[language] || p.category}</Badge>
                      <Badge variant={p.status === 'published' ? 'default' : 'outline'} className="text-[10px] shrink-0">
                        {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{p.thermal_insulation_rating}/10</span>
                      <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" />{p.sound_insulation_rating}/10</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{p.strength_rating}/10</span>
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

export default DashboardProfileSystems;
