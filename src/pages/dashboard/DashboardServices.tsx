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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

const DashboardServices = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<'business_services'> | null>(null);

  const [form, setForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    price_from: '', price_to: '', is_active: true,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['dashboard-services', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('business_services')
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
      const payload = {
        business_id: user.id,
        name_ar: form.name_ar,
        name_en: form.name_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        price_from: form.price_from ? Number(form.price_from) : null,
        price_to: form.price_to ? Number(form.price_to) : null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase
          .from('business_services')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_services')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      setDialogOpen(false);
      resetForm();
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const resetForm = () => {
    setForm({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });
    setEditing(null);
  };

  const openEdit = (s: Tables<'business_services'>) => {
    setEditing(s);
    setForm({
      name_ar: s.name_ar, name_en: s.name_en || '', description_ar: s.description_ar || '',
      description_en: s.description_en || '', price_from: s.price_from?.toString() || '',
      price_to: s.price_to?.toString() || '', is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl">{isRTL ? 'إدارة الخدمات' : 'Manage Services'}</h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'أضف وعدّل خدماتك المقدمة' : 'Add and edit your offered services'}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4 me-1" />{isRTL ? 'خدمة جديدة' : 'New Service'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? (isRTL ? 'تعديل الخدمة' : 'Edit Service') : (isRTL ? 'خدمة جديدة' : 'New Service')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
                    <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} />
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'السعر من' : 'Price From'}</Label>
                    <Input type="number" value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'السعر إلى' : 'Price To'}</Label>
                    <Input type="number" value={form.price_to} onChange={(e) => setForm({ ...form, price_to: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>{isRTL ? 'خدمة مفعلة' : 'Active Service'}</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar || saveMutation.isPending} className="w-full" variant="hero">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">{isRTL ? 'لا توجد خدمات بعد' : 'No services yet'}</p>
              <p className="text-sm">{isRTL ? 'أضف خدماتك ليراها العملاء' : 'Add your services for clients to see'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</h3>
                      {!s.is_active && <span className="text-xs bg-muted px-2 py-0.5 rounded">{isRTL ? 'معطلة' : 'Inactive'}</span>}
                    </div>
                    {(s.price_from || s.price_to) && (
                      <p className="text-sm text-muted-foreground">
                        {s.price_from && `${s.price_from}`}{s.price_from && s.price_to && ' - '}{s.price_to && `${s.price_to}`} {s.currency_code}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
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

export default DashboardServices;
