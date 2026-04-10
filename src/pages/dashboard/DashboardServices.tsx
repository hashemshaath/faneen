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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Pencil, X, Search, CheckCircle2, Wrench,
  DollarSign, ChevronDown, ChevronRight, Send, Package,
  Star, Globe, MapPin, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tables } from '@/integrations/supabase/types';
import { serviceCatalog, type ServiceItem, type ServiceGroup } from '@/components/dashboard/services-catalog';

type FilterMode = 'all' | 'active' | 'inactive';

const DashboardServices = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tables<'business_services'> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showBrands, setShowBrands] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  const emptyForm = {
    name_ar: '', name_en: '', description_ar: '', description_en: '',
    price_from: '', price_to: '', is_active: true,
  };
  const [form, setForm] = useState(emptyForm);

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id, category_id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const businessId = business?.id;

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['dashboard-services', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase.from('business_services').select('*').eq('business_id', businessId).order('sort_order');
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const filteredServices = useMemo(() => {
    let result = services;
    if (filterMode === 'active') result = result.filter(s => s.is_active);
    if (filterMode === 'inactive') result = result.filter(s => !s.is_active);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name_ar.toLowerCase().includes(q) || (s.name_en || '').toLowerCase().includes(q));
    }
    return result;
  }, [services, filterMode, searchQuery]);

  const stats = useMemo(() => ({
    total: services.length,
    active: services.filter(s => s.is_active).length,
    inactive: services.filter(s => !s.is_active).length,
    withPricing: services.filter(s => s.price_from || s.price_to).length,
  }), [services]);

  // Filter catalog by search
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return serviceCatalog;
    const q = catalogSearch.toLowerCase();
    return serviceCatalog.map(group => ({
      ...group,
      services: group.services.filter(s =>
        s.name_ar.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q)
      ),
    })).filter(g => g.services.length > 0);
  }, [catalogSearch]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business found');
      const payload = {
        business_id: businessId,
        name_ar: form.name_ar,
        name_en: form.name_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        price_from: form.price_from ? Number(form.price_from) : null,
        price_to: form.price_to ? Number(form.price_to) : null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('business_services').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_services').insert({ ...payload, sort_order: services.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      closeForm();
      toast.success(editing ? (isRTL ? 'تم تحديث الخدمة بنجاح' : 'Service updated') : (isRTL ? 'تم إضافة الخدمة بنجاح' : 'Service added'));
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
      setDeleteConfirm(null);
      toast.success(isRTL ? 'تم حذف الخدمة' : 'Service deleted');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (s: Tables<'business_services'>) => {
      const { error } = await supabase.from('business_services').update({ is_active: !s.is_active }).eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-services'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (s: Tables<'business_services'>) => {
    setEditing(s);
    setForm({
      name_ar: s.name_ar, name_en: s.name_en || '', description_ar: s.description_ar || '',
      description_en: s.description_en || '', price_from: s.price_from?.toString() || '',
      price_to: s.price_to?.toString() || '', is_active: s.is_active,
    });
    setShowForm(true);
  };

  const quickAddFromCatalog = (item: ServiceItem) => {
    setForm({ ...emptyForm, name_ar: item.name_ar, name_en: item.name_en, description_ar: item.description_ar, description_en: item.description_en });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const isServiceAdded = (name_ar: string) => services.some(s => s.name_ar === name_ar);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Wrench className="w-6 h-6 text-primary" />
              {isRTL ? 'إدارة الخدمات والتخصصات' : 'Services & Specializations'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'اختر من كتالوج الخدمات المتاح أو أضف خدمات مخصصة لعملائك' : 'Select from our service catalog or add custom services for your clients'}
            </p>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRequestForm(!showRequestForm)}>
                <Send className="w-4 h-4 me-1" />{isRTL ? 'طلب إضافة' : 'Request New'}
              </Button>
              <Button variant="hero" onClick={() => { closeForm(); setShowForm(true); }}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'إضافة خدمة' : 'Add Service'}
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        {services.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'إجمالي الخدمات' : 'Total Services', value: stats.total, icon: Package, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'خدمات نشطة' : 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: isRTL ? 'خدمات معطلة' : 'Inactive', value: stats.inactive, icon: X, color: 'text-muted-foreground bg-muted' },
              { label: isRTL ? 'مع تسعير' : 'With Pricing', value: stats.withPricing, icon: DollarSign, color: 'text-amber-600 bg-amber-500/10' },
            ].map((stat, i) => (
              <Card key={i} className="border-border/40 bg-card/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}><stat.icon className="w-4 h-4" /></div>
                  <div><p className="text-xl font-bold">{stat.value}</p><p className="text-[11px] text-muted-foreground">{stat.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request form */}
        {showRequestForm && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-500" />
                  {isRTL ? 'طلب إضافة خدمة جديدة للنظام' : 'Request a new service to be added'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowRequestForm(false)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={requestText} onChange={(e) => setRequestText(e.target.value)} rows={3}
                placeholder={isRTL ? 'اكتب اسم الخدمة والتخصص المطلوب إضافته...' : 'Describe the service you want added...'} />
              <Button size="sm" variant="hero" disabled={!requestText.trim()} onClick={() => {
                toast.success(isRTL ? 'تم إرسال الطلب، سيتم مراجعته قريباً' : 'Request submitted for review');
                setRequestText(''); setShowRequestForm(false);
              }}>
                <Send className="w-4 h-4 me-1" />{isRTL ? 'إرسال الطلب' : 'Submit'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editing ? (isRTL ? 'تعديل الخدمة' : 'Edit Service') : (isRTL ? 'إضافة خدمة جديدة' : 'Add New Service')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'اسم الخدمة (عربي)' : 'Service Name (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.name_ar} lang="ar" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, name_en: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, name_ar: v }))} />
                  </div>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder={isRTL ? 'مثال: تركيب نوافذ ألمنيوم' : 'e.g. Aluminum window installation'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'اسم الخدمة (إنجليزي)' : 'Service Name (English)'}</Label>
                    <FieldAiActions value={form.name_en} lang="en" compact fieldType="title" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, name_ar: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, name_en: v }))} />
                  </div>
                  <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" placeholder="e.g. Aluminum window installation" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, description_en: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={3} placeholder={isRTL ? 'وصف مختصر...' : 'Brief description...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label>{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL}
                      onTranslated={(v) => setForm(prev => ({ ...prev, description_ar: v }))}
                      onImproved={(v) => setForm(prev => ({ ...prev, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" placeholder="Brief description..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'السعر من (ر.س)' : 'Price From (SAR)'}</Label>
                  <Input type="number" value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} dir="ltr" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isRTL ? 'السعر إلى (ر.س)' : 'Price To (SAR)'}</Label>
                  <Input type="number" value={form.price_to} onChange={(e) => setForm({ ...form, price_to: e.target.value })} dir="ltr" placeholder="0" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/40">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <div>
                  <Label className="cursor-pointer">{isRTL ? 'خدمة مفعلة' : 'Active Service'}</Label>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'الخدمات المفعلة تظهر في ملفك التجاري' : 'Active services appear on your profile'}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar || saveMutation.isPending} variant="hero" className="flex-1">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editing ? (isRTL ? 'تحديث الخدمة' : 'Update') : (isRTL ? 'إضافة الخدمة' : 'Add Service')}
                  {!saveMutation.isPending && <CheckCircle2 className="w-4 h-4 ms-2" />}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        {services.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isRTL ? 'ابحث في خدماتك...' : 'Search your services...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
            </div>
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">{isRTL ? 'الكل' : 'All'} ({stats.total})</TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">{isRTL ? 'نشطة' : 'Active'}</TabsTrigger>
                <TabsTrigger value="inactive" className="text-xs px-3">{isRTL ? 'معطلة' : 'Inactive'}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Services List */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : services.length === 0 && !showForm ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Wrench className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد خدمات بعد' : 'No services yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {isRTL ? 'اختر من كتالوج الخدمات أدناه أو أضف خدمات مخصصة' : 'Pick from the catalog below or add custom services'}
              </p>
              <Button variant="hero" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 me-2" />{isRTL ? 'أضف أول خدمة' : 'Add First Service'}
              </Button>
            </CardContent>
          </Card>
        ) : filteredServices.length === 0 && services.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" /><p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredServices.map((s) => (
              <Card key={s.id} className="border-border/40 hover:border-primary/30 transition-all group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Wrench className={`w-5 h-5 ${s.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</h3>
                      {!s.is_active && <Badge variant="secondary" className="text-xs">{isRTL ? 'معطلة' : 'Inactive'}</Badge>}
                    </div>
                    {(isRTL ? s.description_ar : (s.description_en || s.description_ar)) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{isRTL ? s.description_ar : (s.description_en || s.description_ar)}</p>
                    )}
                    {(s.price_from || s.price_to) && (
                      <p className="text-xs text-primary font-medium mt-1">
                        {s.price_from ? Number(s.price_from).toLocaleString() : ''}{s.price_from && s.price_to ? ' - ' : ''}{s.price_to ? Number(s.price_to).toLocaleString() : ''} {s.currency_code}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActiveMutation.mutate(s)}>
                      <Switch checked={s.is_active} className="pointer-events-none scale-75" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(s.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Service Catalog */}
        {!showForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {isRTL ? 'كتالوج الخدمات والتخصصات' : 'Service & Specialization Catalog'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL ? 'اضغط على أي خدمة لإضافتها مباشرة إلى ملفك التجاري' : 'Click any service to add it directly to your profile'}
                </p>
              </div>
            </div>

            {/* Catalog search */}
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isRTL ? 'ابحث في الكتالوج...' : 'Search catalog...'} value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} className="ps-9" />
            </div>

            {filteredCatalog.map((group) => {
              const isExpanded = expandedGroups.includes(group.id) || !!catalogSearch.trim();
              const addedCount = group.services.filter(s => isServiceAdded(s.name_ar)).length;

              return (
                <Card key={group.id} className="border-border/40 overflow-hidden">
                  {/* Group Header */}
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-start"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${group.color}`}>
                      {group.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold">{isRTL ? group.name_ar : group.name_en}</h3>
                        <Badge variant="outline" className="text-[10px]">{group.services.length} {isRTL ? 'خدمة' : 'services'}</Badge>
                        {addedCount > 0 && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 me-0.5" />{addedCount} {isRTL ? 'مضافة' : 'added'}
                          </Badge>
                        )}
                      </div>
                      {group.brands && group.brands.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isRTL ? `${group.brands.length} ماركة محلية وعالمية` : `${group.brands.length} local & international brands`}
                        </p>
                      )}
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" /> : (isRTL ? <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 rotate-180" /> : <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />)}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border/40">
                      {/* Services Grid */}
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {group.services.map((item, idx) => {
                          const added = isServiceAdded(item.name_ar);
                          return (
                            <button
                              key={idx}
                              disabled={added}
                              onClick={() => quickAddFromCatalog(item)}
                              className={`p-3 rounded-xl border text-start transition-all ${
                                added
                                  ? 'bg-emerald-500/5 border-emerald-500/20 cursor-default'
                                  : 'border-border/40 hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {added ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Plus className="w-4 h-4 text-primary shrink-0" />}
                                <span className="font-medium text-sm truncate">{isRTL ? item.name_ar : item.name_en}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{isRTL ? item.description_ar : item.description_en}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Brands Section */}
                      {group.brands && group.brands.length > 0 && (
                        <div className="border-t border-border/40 p-4">
                          <button
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
                            onClick={() => setShowBrands(showBrands === group.id ? null : group.id)}
                          >
                            <Star className="w-4 h-4" />
                            {isRTL ? 'أشهر الماركات والعلامات التجارية' : 'Popular Brands & Labels'}
                            {showBrands === group.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                          </button>
                          {showBrands === group.id && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                              {group.brands.map((brand, bi) => (
                                <div key={bi} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${brand.type === 'international' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                    {brand.type === 'international' ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{brand.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{isRTL ? brand.origin_ar : brand.origin_en}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف الخدمة' : 'Delete Service'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DashboardServices;
