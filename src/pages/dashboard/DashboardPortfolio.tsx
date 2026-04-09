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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';

const DashboardPortfolio = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    media_url: '', media_type: 'image', is_featured: false,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['dashboard-portfolio', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('business_id', user.id)
        .order('sort_order');
      return data ?? [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('portfolio_items').insert({
        business_id: user.id,
        title_ar: form.title_ar,
        title_en: form.title_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        media_url: form.media_url,
        media_type: form.media_type,
        is_featured: form.is_featured,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      setDialogOpen(false);
      setForm({ title_ar: '', title_en: '', description_ar: '', description_en: '', media_url: '', media_type: 'image', is_featured: false });
      toast.success(isRTL ? 'تم الإضافة' : 'Added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl">{isRTL ? 'معرض الأعمال' : 'Portfolio'}</h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'أضف صور وفيديوهات أعمالك' : 'Add photos and videos of your work'}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة عمل' : 'Add Work'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{isRTL ? 'إضافة عمل جديد' : 'Add New Work'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} *</Label>
                    <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'صورة العمل' : 'Work Image'} *</Label>
                  <ImageUpload
                    bucket="portfolio-images"
                    value={form.media_url}
                    onChange={(url) => setForm({ ...form, media_url: url })}
                    onRemove={() => setForm({ ...form, media_url: '' })}
                    aspectRatio="square"
                    placeholder={isRTL ? 'اضغط لرفع صورة' : 'Click to upload image'}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={2} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                  <Label>{isRTL ? 'عمل مميز' : 'Featured'}</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || !form.media_url || saveMutation.isPending} className="w-full" variant="hero">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">{isRTL ? 'لا توجد أعمال بعد' : 'No portfolio items yet'}</p>
              <p className="text-sm">{isRTL ? 'أضف أعمالك لعرضها للعملاء' : 'Add your work to showcase to clients'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden group relative border-border/50">
                <div className="aspect-square bg-muted relative">
                  <img src={item.media_url} alt={isRTL ? item.title_ar : (item.title_en || item.title_ar)} className="w-full h-full object-cover" />
                  {item.is_featured && (
                    <span className="absolute top-2 start-2 bg-gold text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />{isRTL ? 'مميز' : 'Featured'}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{isRTL ? item.title_ar : (item.title_en || item.title_ar)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPortfolio;
