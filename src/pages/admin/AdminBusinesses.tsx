import React, { useState, useCallback } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { toast } from 'sonner';
import {
  Building2, Search, CheckCircle, XCircle, Star, Loader2, Eye, Ban,
  Edit, Trash2, Plus, X, Globe, Phone, Mail, MapPin, Settings,
  Shield, Crown, BarChart3, Package, DollarSign, ExternalLink,
  GripVertical, ToggleLeft, ToggleRight, Save,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
  { value: 'free', label_ar: 'مجاني', label_en: 'Free', color: 'bg-muted text-muted-foreground' },
  { value: 'basic', label_ar: 'أساسي', label_en: 'Basic', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'premium', label_ar: 'مميز', label_en: 'Premium', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'enterprise', label_ar: 'مؤسسات', label_en: 'Enterprise', color: 'bg-purple-500/10 text-purple-600' },
];

const AdminBusinesses = () => {
  const { isRTL, language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [editingBiz, setEditingBiz] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [servicesPanel, setServicesPanel] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });

  const setField = useCallback((key: string, value: any) => {
    setEditForm((f: any) => ({ ...f, [key]: value }));
  }, []);

  const setServiceField = useCallback((key: string, value: any) => {
    setNewService(s => ({ ...s, [key]: value }));
  }, []);

  /* ─── Queries ─── */
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await supabase.from('countries').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: services = [], refetch: refetchServices } = useQuery({
    queryKey: ['admin-services', servicesPanel],
    queryFn: async () => {
      if (!servicesPanel) return [];
      const { data } = await supabase.from('business_services').select('*').eq('business_id', servicesPanel).order('sort_order');
      return data || [];
    },
    enabled: !!servicesPanel,
  });

  /* ─── Mutations ─── */
  const logAction = async (action: string, entityId: string, details: any) => {
    await supabase.from('admin_activity_log').insert({
      user_id: user!.id, action, entity_type: 'business', entity_id: entityId, details,
    });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from('businesses').update({ [field]: value } as any).eq('id', id);
      if (error) throw error;
      await logAction(`business_${field}_${value}`, id, { field, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Update failed'),
  });

  const tierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      const { error } = await supabase.from('businesses').update({ membership_tier: tier } as any).eq('id', id);
      if (error) throw error;
      await logAction('business_tier_change', id, { new_tier: tier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(isRTL ? 'تم تغيير العضوية' : 'Tier updated');
    },
  });

  const updateBizMutation = useMutation({
    mutationFn: async () => {
      const id = editingBiz.id;
      const payload: any = {
        name_ar: editForm.name_ar,
        name_en: editForm.name_en || null,
        description_ar: editForm.description_ar || null,
        description_en: editForm.description_en || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        website: editForm.website || null,
        address: editForm.address || null,
        category_id: editForm.category_id || null,
        country_id: editForm.country_id || null,
        city_id: editForm.city_id || null,
        logo_url: editForm.logo_url || null,
        cover_url: editForm.cover_url || null,
        is_active: editForm.is_active,
        is_verified: editForm.is_verified,
        membership_tier: editForm.membership_tier,
      };
      const { error } = await supabase.from('businesses').update(payload).eq('id', id);
      if (error) throw error;
      await logAction('business_updated', id, { fields: Object.keys(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(isRTL ? 'تم حفظ التعديلات' : 'Changes saved');
      setEditingBiz(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('business_services').insert({
        business_id: servicesPanel!,
        name_ar: newService.name_ar,
        name_en: newService.name_en || null,
        description_ar: newService.description_ar || null,
        description_en: newService.description_en || null,
        price_from: newService.price_from ? parseFloat(newService.price_from) : null,
        price_to: newService.price_to ? parseFloat(newService.price_to) : null,
        is_active: newService.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchServices();
      setNewService({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });
      toast.success(isRTL ? 'تمت إضافة الخدمة' : 'Service added');
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('business_services').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refetchServices(),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchServices();
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  /* ─── Edit Open ─── */
  const openEdit = (biz: any) => {
    setServicesPanel(null);
    setEditForm({
      name_ar: biz.name_ar, name_en: biz.name_en || '',
      description_ar: biz.description_ar || '', description_en: biz.description_en || '',
      phone: biz.phone || '', email: biz.email || '', website: biz.website || '',
      address: biz.address || '', category_id: biz.category_id || '',
      country_id: biz.country_id || '', city_id: biz.city_id || '',
      logo_url: biz.logo_url || '', cover_url: biz.cover_url || '',
      is_active: biz.is_active, is_verified: biz.is_verified,
      membership_tier: biz.membership_tier,
    });
    setEditingBiz(biz);
  };

  const openServices = (bizId: string) => {
    setEditingBiz(null);
    setServicesPanel(bizId);
  };

  /* ─── Filters ─── */
  const filtered = businesses.filter((b: any) => {
    const matchSearch = !search ||
      b.name_ar?.includes(search) || b.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      b.username?.includes(search) || b.ref_id?.includes(search) ||
      b.email?.includes(search) || b.phone?.includes(search);
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'verified' && b.is_verified) ||
      (filterStatus === 'unverified' && !b.is_verified) ||
      (filterStatus === 'inactive' && !b.is_active);
    const matchTier = filterTier === 'all' || b.membership_tier === filterTier;
    return matchSearch && matchStatus && matchTier;
  });

  const stats = {
    total: businesses.length,
    verified: businesses.filter((b: any) => b.is_verified).length,
    active: businesses.filter((b: any) => b.is_active).length,
    premium: businesses.filter((b: any) => b.membership_tier !== 'free').length,
  };

  const filteredCities = editForm.country_id
    ? cities.filter((c: any) => c.country_id === editForm.country_id)
    : cities;

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              {isRTL ? 'إدارة الأعمال' : 'Business Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isRTL ? 'التحكم الشامل في الأعمال والخدمات والمحتوى' : 'Full control over businesses, services & content'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, icon: Building2, color: 'bg-primary/10 text-primary' },
            { label: isRTL ? 'نشط' : 'Active', value: stats.active, icon: CheckCircle, color: 'bg-green-500/10 text-green-600' },
            { label: isRTL ? 'موثق' : 'Verified', value: stats.verified, icon: Shield, color: 'bg-blue-500/10 text-blue-600' },
            { label: isRTL ? 'مدفوع' : 'Paid', value: stats.premium, icon: Crown, color: 'bg-yellow-500/10 text-yellow-600' },
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

        {/* Filters */}
        <Card>
          <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث بالاسم، المعرف، الهاتف، البريد...' : 'Search by name, ID, phone, email...'}
                className="ps-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All Status'}</SelectItem>
                <SelectItem value="verified">{isRTL ? 'موثق' : 'Verified'}</SelectItem>
                <SelectItem value="unverified">{isRTL ? 'غير موثق' : 'Unverified'}</SelectItem>
                <SelectItem value="inactive">{isRTL ? 'معطل' : 'Inactive'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل العضويات' : 'All Tiers'}</SelectItem>
                {tiers.map(t => <SelectItem key={t.value} value={t.value}>{language === 'ar' ? t.label_ar : t.label_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ─── Inline Edit Panel ─── */}
        {editingBiz && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="w-4 h-4 text-primary" />
                  {isRTL ? 'تعديل العمل' : 'Edit Business'}: {editingBiz.name_ar}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setEditingBiz(null)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-9">
                  <TabsTrigger value="info" className="text-xs">{isRTL ? 'المعلومات' : 'Info'}</TabsTrigger>
                  <TabsTrigger value="content" className="text-xs">{isRTL ? 'المحتوى' : 'Content'}</TabsTrigger>
                  <TabsTrigger value="media" className="text-xs">{isRTL ? 'الوسائط' : 'Media'}</TabsTrigger>
                  <TabsTrigger value="controls" className="text-xs">{isRTL ? 'التحكم' : 'Controls'}</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="space-y-4 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">{isRTL ? 'الاسم (عربي)' : 'Name (AR)'} *</Label>
                        <FieldAiActions compact value={editForm.name_ar} lang="ar" isRTL={isRTL} fieldType="title"
                          onTranslated={(v) => setField('name_en', v)} onImproved={(v) => setField('name_ar', v)} />
                      </div>
                      <Input value={editForm.name_ar} onChange={e => setField('name_ar', e.target.value)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">{isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
                        <FieldAiActions compact value={editForm.name_en} lang="en" isRTL={isRTL} fieldType="title"
                          onTranslated={(v) => setField('name_ar', v)} onImproved={(v) => setField('name_en', v)} />
                      </div>
                      <Input value={editForm.name_en} onChange={e => setField('name_en', e.target.value)} dir="ltr" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {isRTL ? 'الهاتف' : 'Phone'}</Label>
                      <Input value={editForm.phone} onChange={e => setField('phone', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {isRTL ? 'البريد' : 'Email'}</Label>
                      <Input value={editForm.email} onChange={e => setField('email', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {isRTL ? 'الموقع' : 'Website'}</Label>
                      <Input value={editForm.website} onChange={e => setField('website', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{isRTL ? 'التصنيف' : 'Category'}</Label>
                      <Select value={editForm.category_id} onValueChange={v => setField('category_id', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'الدولة' : 'Country'}</Label>
                      <Select value={editForm.country_id} onValueChange={v => { setField('country_id', v); setField('city_id', ''); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'المدينة' : 'City'}</Label>
                      <Select value={editForm.city_id} onValueChange={v => setField('city_id', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {filteredCities.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> {isRTL ? 'العنوان' : 'Address'}</Label>
                      <FieldAiActions compact value={editForm.address} lang="ar" isRTL={isRTL} fieldType="short_text"
                        onTranslated={() => {}} onImproved={(v) => setField('address', v)} />
                    </div>
                    <Input value={editForm.address} onChange={e => setField('address', e.target.value)} />
                  </div>
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 mt-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label>
                      <FieldAiActions compact value={editForm.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setField('description_en', v)} onImproved={(v) => setField('description_ar', v)} />
                    </div>
                    <Textarea value={editForm.description_ar} onChange={e => setField('description_ar', e.target.value)} rows={4} />
                    <span className="text-[10px] text-muted-foreground">{editForm.description_ar?.length || 0} {isRTL ? 'حرف' : 'chars'}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label>
                      <FieldAiActions compact value={editForm.description_en} lang="en" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setField('description_ar', v)} onImproved={(v) => setField('description_en', v)} />
                    </div>
                    <Textarea value={editForm.description_en} onChange={e => setField('description_en', e.target.value)} rows={4} dir="ltr" />
                    <span className="text-[10px] text-muted-foreground">{editForm.description_en?.length || 0} {isRTL ? 'حرف' : 'chars'}</span>
                  </div>
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="space-y-4 mt-3">
                  <div>
                    <Label className="text-xs font-semibold mb-2 block">{isRTL ? 'الشعار' : 'Logo'}</Label>
                    <ImageUpload bucket="business-assets" value={editForm.logo_url}
                      onChange={(url) => setField('logo_url', url)}
                      onRemove={() => setField('logo_url', '')}
                      placeholder={isRTL ? 'رفع الشعار' : 'Upload logo'} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-2 block">{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                    <ImageUpload bucket="business-assets" value={editForm.cover_url}
                      onChange={(url) => setField('cover_url', url)}
                      onRemove={() => setField('cover_url', '')}
                      placeholder={isRTL ? 'رفع صورة الغلاف (1200×400 موصى)' : 'Upload cover (1200×400 recommended)'} />
                  </div>
                </TabsContent>

                {/* Controls Tab */}
                <TabsContent value="controls" className="space-y-4 mt-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{isRTL ? 'حالة التفعيل' : 'Active Status'}</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'تفعيل أو تعطيل ظهور العمل' : 'Enable or disable business visibility'}</p>
                      </div>
                      <Switch checked={editForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{isRTL ? 'التوثيق' : 'Verification'}</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'علامة التوثيق الرسمية' : 'Official verification badge'}</p>
                      </div>
                      <Switch checked={editForm.is_verified} onCheckedChange={v => setField('is_verified', v)} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-sm font-medium mb-2">{isRTL ? 'مستوى العضوية' : 'Membership Tier'}</p>
                      <Select value={editForm.membership_tier} onValueChange={v => setField('membership_tier', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {tiers.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="flex items-center gap-2">
                                <Crown className="w-3 h-3" /> {language === 'ar' ? t.label_ar : t.label_en}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-[10px] space-y-1 text-muted-foreground font-mono">
                    <p>ID: {editingBiz.id}</p>
                    <p>Ref: {editingBiz.ref_id}</p>
                    <p>Username: @{editingBiz.username}</p>
                    <p>Owner: {editingBiz.user_id}</p>
                    <p>Created: {new Date(editingBiz.created_at).toLocaleDateString()}</p>
                    <p>Rating: {editingBiz.rating_avg} ({editingBiz.rating_count} reviews)</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-3 border-t mt-4">
                <Button onClick={() => updateBizMutation.mutate()} disabled={!editForm.name_ar || updateBizMutation.isPending} className="flex-1 gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  {updateBizMutation.isPending ? '...' : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}
                </Button>
                <Button variant="outline" onClick={() => setEditingBiz(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Inline Services Panel ─── */}
        {servicesPanel && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  {isRTL ? 'إدارة الخدمات' : 'Manage Services'}
                  <Badge variant="secondary" className="text-[10px]">{services.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setServicesPanel(null)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Services */}
              <div className="space-y-2">
                {services.map((svc: any) => (
                  <div key={svc.id} className={`flex items-center gap-3 p-2.5 rounded-lg border border-border/40 ${!svc.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{language === 'ar' ? svc.name_ar : (svc.name_en || svc.name_ar)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {svc.price_from && svc.price_to ? `${svc.price_from} - ${svc.price_to} ${svc.currency_code}` :
                         svc.price_from ? `${isRTL ? 'من' : 'From'} ${svc.price_from} ${svc.currency_code}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={svc.is_active} onCheckedChange={v => toggleServiceMutation.mutate({ id: svc.id, is_active: v })} />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                        onClick={() => { if (confirm(isRTL ? 'حذف هذه الخدمة؟' : 'Delete this service?')) deleteServiceMutation.mutate(svc.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">{isRTL ? 'لا توجد خدمات' : 'No services'}</p>
                )}
              </div>

              <Separator />

              {/* Add New Service */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> {isRTL ? 'إضافة خدمة جديدة' : 'Add New Service'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{isRTL ? 'اسم الخدمة (عربي)' : 'Service Name (AR)'} *</Label>
                      <FieldAiActions compact value={newService.name_ar} lang="ar" isRTL={isRTL} fieldType="title"
                        onTranslated={(v) => setServiceField('name_en', v)} onImproved={(v) => setServiceField('name_ar', v)} />
                    </div>
                    <Input value={newService.name_ar} onChange={e => setServiceField('name_ar', e.target.value)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{isRTL ? 'اسم الخدمة (إنجليزي)' : 'Service Name (EN)'}</Label>
                      <FieldAiActions compact value={newService.name_en} lang="en" isRTL={isRTL} fieldType="title"
                        onTranslated={(v) => setServiceField('name_ar', v)} onImproved={(v) => setServiceField('name_en', v)} />
                    </div>
                    <Input value={newService.name_en} onChange={e => setServiceField('name_en', e.target.value)} dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label>
                      <FieldAiActions compact value={newService.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setServiceField('description_en', v)} onImproved={(v) => setServiceField('description_ar', v)} />
                    </div>
                    <Textarea value={newService.description_ar} onChange={e => setServiceField('description_ar', e.target.value)} rows={2} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label>
                      <FieldAiActions compact value={newService.description_en} lang="en" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setServiceField('description_ar', v)} onImproved={(v) => setServiceField('description_en', v)} />
                    </div>
                    <Textarea value={newService.description_en} onChange={e => setServiceField('description_en', e.target.value)} rows={2} dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> {isRTL ? 'السعر من' : 'Price From'}</Label>
                    <Input type="number" value={newService.price_from} onChange={e => setServiceField('price_from', e.target.value)} dir="ltr" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> {isRTL ? 'السعر إلى' : 'Price To'}</Label>
                    <Input type="number" value={newService.price_to} onChange={e => setServiceField('price_to', e.target.value)} dir="ltr" className="mt-1" />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={newService.is_active} onCheckedChange={v => setServiceField('is_active', v)} />
                      <span className="text-xs">{isRTL ? 'مفعّل' : 'Active'}</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => addServiceMutation.mutate()} disabled={!newService.name_ar || addServiceMutation.isPending}
                  className="w-full gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {addServiceMutation.isPending ? '...' : (isRTL ? 'إضافة الخدمة' : 'Add Service')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Business List ─── */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((biz: any) => {
              const tierInfo = tiers.find(t => t.value === biz.membership_tier) || tiers[0];
              return (
                <Card key={biz.id} className={`border-border/40 hover:border-primary/20 transition-all group ${!biz.is_active ? 'opacity-60 border-destructive/20' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-11 h-11 shrink-0 border border-border/50">
                          <AvatarImage src={biz.logo_url || undefined} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold text-sm">
                            {biz.name_ar?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-heading font-bold text-sm truncate">
                              {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                            </h3>
                            {biz.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            {!biz.is_active && <Badge variant="destructive" className="text-[8px] h-4">{isRTL ? 'معطل' : 'Disabled'}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            <span>@{biz.username}</span>
                            <Badge variant="outline" className="text-[9px] h-4">{biz.ref_id}</Badge>
                            <Badge className={`text-[9px] h-4 ${tierInfo.color} border-0`}>
                              {language === 'ar' ? tierInfo.label_ar : tierInfo.label_en}
                            </Badge>
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {biz.rating_avg} ({biz.rating_count})
                            </span>
                            {biz.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{biz.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <Select value={biz.membership_tier} onValueChange={tier => tierMutation.mutate({ id: biz.id, tier })}>
                          <SelectTrigger className="h-7 text-[10px] w-24 border-dashed"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {tiers.map(t => <SelectItem key={t.value} value={t.value}>{language === 'ar' ? t.label_ar : t.label_en}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        <Button variant={biz.is_verified ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] gap-1 px-2"
                          onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_verified', value: !biz.is_verified })}>
                          {biz.is_verified ? <CheckCircle className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {biz.is_verified ? (isRTL ? 'موثق' : 'Verified') : (isRTL ? 'توثيق' : 'Verify')}
                        </Button>

                        <Button variant={biz.is_active ? 'outline' : 'destructive'} size="sm" className="h-7 text-[10px] gap-1 px-2"
                          onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_active', value: !biz.is_active })}>
                          {biz.is_active ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {biz.is_active ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
                        </Button>

                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2"
                          onClick={() => openServices(biz.id)}>
                          <Package className="w-3 h-3" />
                          {isRTL ? 'خدمات' : 'Services'}
                        </Button>

                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(biz)}>
                          <Edit className="w-3 h-3" />
                        </Button>

                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <Link to={`/${biz.username}`}><Eye className="w-3 h-3" /></Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            {isRTL ? `عرض ${filtered.length} من ${businesses.length}` : `Showing ${filtered.length} of ${businesses.length}`}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinesses;
