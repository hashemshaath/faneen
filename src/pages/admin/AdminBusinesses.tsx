import React, { useState, useCallback, useEffect, useRef, useMemo, useTransition } from 'react';
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
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2, Search, CheckCircle, XCircle, Star, Loader2, Eye, Ban,
  Edit, Trash2, Plus, X, Globe, Phone, Mail, MapPin, Settings,
  Shield, Crown, BarChart3, Package, DollarSign, ExternalLink,
  GripVertical, ToggleLeft, ToggleRight, Save, Image, MapPinned,
  FileText, Users, Locate, Navigation, Download, LayoutGrid, List,
  TrendingUp, ArrowUpRight, Filter, RefreshCw, Copy, MoreHorizontal,
  Activity, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const tiers = [
  { value: 'free', label_ar: 'مجاني', label_en: 'Free', color: 'bg-muted text-muted-foreground', icon: '🆓' },
  { value: 'basic', label_ar: 'أساسي', label_en: 'Basic', color: 'bg-blue-500/10 text-blue-600', icon: '⭐' },
  { value: 'premium', label_ar: 'مميز', label_en: 'Premium', color: 'bg-accent/20 text-accent-foreground', icon: '👑' },
  { value: 'enterprise', label_ar: 'مؤسسات', label_en: 'Enterprise', color: 'bg-purple-500/10 text-purple-600', icon: '🏢' },
];

/* ─── Location Map Picker ─── */
const LocationPicker = ({ lat, lng, onPick, isRTL }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void; isRTL: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [lat || 24.7136, lng || 46.6753], zoom: lat ? 15 : 6, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        onPick(pos.lat, pos.lng);
      });
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (markerRef.current) markerRef.current.setLatLng(e.latlng);
      else {
        markerRef.current = L.marker(e.latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current!.getLatLng();
          onPick(pos.lat, pos.lng);
        });
      }
      onPick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  return <div ref={containerRef} className="w-full h-[250px] rounded-lg border border-border/50" />;
};

/* ─── Reverse Geocode ─── */
const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar&addressdetails=1`);
    const data = await res.json();
    const a = data.address || {};
    return {
      region: a.state || a.county || '',
      district: a.suburb || a.neighbourhood || a.quarter || '',
      street_name: a.road || a.pedestrian || '',
      building_number: a.house_number || '',
      address: data.display_name || '',
    };
  } catch { return null; }
};

/* ─── CSV Export ─── */
const exportCSV = (businesses: Array<Record<string, unknown>>, language: string) => {
  const headers = ['Ref ID', 'Name (AR)', 'Name (EN)', 'Username', 'Phone', 'Email', 'Category', 'Tier', 'Verified', 'Active', 'Rating', 'Created'];
  const rows = businesses.map((b) => [
    b.ref_id, b.name_ar, b.name_en || '', `@${b.username}`, b.phone || '', b.email || '',
    b.category_id || '', b.membership_tier, b.is_verified ? 'Yes' : 'No', b.is_active ? 'Yes' : 'No',
    `${b.rating_avg} (${b.rating_count})`, new Date(b.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `businesses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ─── Stat Card Component ─── */
const StatCard = React.memo(({ label, value, icon: Icon, trend, gradient, iconBg }: {
  label: string; value: number; icon: React.ElementType; trend?: string; gradient: string; iconBg: string;
}) => (
  <div className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br ${gradient} p-4 transition-all hover:shadow-md group`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110 shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-heading font-bold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

const AdminBusinesses = () => {
  const { isRTL, language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [editingBiz, setEditingBiz] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [servicesPanel, setServicesPanel] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newService, setNewService] = useState({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });
  const [geocoding, setGeocoding] = useState(false);
  const [branchForm, setBranchForm] = useState<Record<string, unknown> | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isPending, startTransition] = useTransition();

  const setField = useCallback((key: string, value: string | number | boolean | null) => {
    setEditForm((f) => ({ ...f, [key]: value }));
  }, []);

  const setServiceField = useCallback((key: string, value: string | number | boolean | null) => {
    setNewService(s => ({ ...s, [key]: value }));
  }, []);

  /* ─── Queries ─── */
  const { data: businesses = [], isLoading, refetch: refetchBusinesses } = useQuery({
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

  const { data: allServices = [] } = useQuery({
    queryKey: ['all-business-services'],
    queryFn: async () => {
      const { data } = await supabase.from('business_services').select('id, name_ar, name_en, business_id');
      return data || [];
    },
  });

  const { data: branches = [], refetch: refetchBranches } = useQuery({
    queryKey: ['admin-branches', editingBiz?.id],
    queryFn: async () => {
      if (!editingBiz?.id) return [];
      const { data } = await supabase.from('business_branches').select('*').eq('business_id', editingBiz.id).order('sort_order');
      return data || [];
    },
    enabled: !!editingBiz?.id,
  });

  const { data: portfolioData = [], refetch: refetchPortfolio } = useQuery({
    queryKey: ['admin-portfolio', editingBiz?.id],
    queryFn: async () => {
      if (!editingBiz?.id) return [];
      const { data } = await supabase.from('portfolio_items').select('*').eq('business_id', editingBiz.id).order('sort_order');
      return data || [];
    },
    enabled: !!editingBiz?.id,
  });

  const { data: contractBusinessIds = [] } = useQuery({
    queryKey: ['contract-business-ids'],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('business_id').not('business_id', 'is', null);
      return [...new Set((data || []).map((c) => c.business_id).filter(Boolean))];
    },
  });

  /* ─── Mutations ─── */
  const logAction = async (action: string, entityId: string, details: Record<string, unknown>) => {
    await supabase.from('admin_activity_log').insert({
      user_id: user!.id, action, entity_type: 'business', entity_id: entityId, details,
    });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from('businesses').update({ [field]: value } ).eq('id', id);
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
      const { error } = await supabase.from('businesses').update({ membership_tier: tier } ).eq('id', id);
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
      const payload: Record<string, unknown> = {
        name_ar: editForm.name_ar, name_en: editForm.name_en || null,
        short_description_ar: editForm.short_description_ar || null, short_description_en: editForm.short_description_en || null,
        description_ar: editForm.description_ar || null, description_en: editForm.description_en || null,
        phone: editForm.phone || null, email: editForm.email || null, website: editForm.website || null,
        address: editForm.address || null, national_id: editForm.national_id || null,
        additional_number: editForm.additional_number || null, region: editForm.region || null,
        district: editForm.district || null, street_name: editForm.street_name || null,
        building_number: editForm.building_number || null, latitude: editForm.latitude || null,
        longitude: editForm.longitude || null, category_id: editForm.category_id || null,
        country_id: editForm.country_id || null, city_id: editForm.city_id || null,
        logo_url: editForm.logo_url || null, cover_url: editForm.cover_url || null,
        unified_number: editForm.unified_number || null, contact_person: editForm.contact_person || null,
        mobile: editForm.mobile || null, customer_service_phone: editForm.customer_service_phone || null,
        is_active: editForm.is_active, is_verified: editForm.is_verified, membership_tier: editForm.membership_tier,
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
    onError: (err: Error) => toast.error(err.message),
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('business_services').insert({
        business_id: servicesPanel!,
        name_ar: newService.name_ar, name_en: newService.name_en || null,
        description_ar: newService.description_ar || null, description_en: newService.description_en || null,
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

  const addPortfolioMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from('portfolio_items').insert({
        business_id: editingBiz.id, title_ar: 'صورة', media_url: url, media_type: 'image',
      });
      if (error) throw error;
    },
    onSuccess: () => refetchPortfolio(),
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refetchPortfolio(),
  });

  const emptyBranch = () => ({
    name_ar: '', name_en: '', is_main: false, is_active: true,
    contact_person: '', phone: '', mobile: '', unified_number: '', customer_service_phone: '',
    email: '', website: '',
    country_id: '', city_id: '', region: '', district: '', street_name: '',
    building_number: '', national_id: '', additional_number: '', address: '',
    latitude: '', longitude: '',
  });

  const saveBranchMutation = useMutation({
    mutationFn: async () => {
      if (!branchForm || !editingBiz) return;
      const payload: Record<string, unknown> = {
        business_id: editingBiz.id,
        name_ar: branchForm.name_ar, name_en: branchForm.name_en || null,
        is_main: branchForm.is_main, is_active: branchForm.is_active,
        contact_person: branchForm.contact_person || null, phone: branchForm.phone || null,
        mobile: branchForm.mobile || null, unified_number: branchForm.unified_number || null,
        customer_service_phone: branchForm.customer_service_phone || null,
        email: branchForm.email || null, website: branchForm.website || null,
        country_id: branchForm.country_id || null, city_id: branchForm.city_id || null,
        region: branchForm.region || null, district: branchForm.district || null,
        street_name: branchForm.street_name || null, building_number: branchForm.building_number || null,
        national_id: branchForm.national_id || null, additional_number: branchForm.additional_number || null,
        address: branchForm.address || null, latitude: branchForm.latitude || null,
        longitude: branchForm.longitude || null,
      };
      if (editingBranchId) {
        const { error } = await supabase.from('business_branches').update(payload).eq('id', editingBranchId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_branches').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchBranches();
      setBranchForm(null);
      setEditingBranchId(null);
      toast.success(isRTL ? 'تم حفظ الفرع' : 'Branch saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchBranches();
      toast.success(isRTL ? 'تم حذف الفرع' : 'Branch deleted');
    },
  });

  const toggleBranchMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('business_branches').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refetchBranches(),
  });

  const handleMapPick = async (lat: number, lng: number) => {
    setField('latitude', lat);
    setField('longitude', lng);
    setGeocoding(true);
    const geo = await reverseGeocode(lat, lng);
    setGeocoding(false);
    if (geo) {
      setField('region', geo.region);
      setField('district', geo.district);
      setField('street_name', geo.street_name);
      setField('building_number', geo.building_number);
      setField('address', geo.address);
    }
  };

  /* ─── Edit Open ─── */
  const openEdit = (biz: Record<string, unknown>) => {
    setServicesPanel(null);
    setEditForm({
      name_ar: biz.name_ar, name_en: biz.name_en || '',
      short_description_ar: biz.short_description_ar || '', short_description_en: biz.short_description_en || '',
      description_ar: biz.description_ar || '', description_en: biz.description_en || '',
      phone: biz.phone || '', email: biz.email || '', website: biz.website || '',
      address: biz.address || '', category_id: biz.category_id || '',
      country_id: biz.country_id || '', city_id: biz.city_id || '',
      logo_url: biz.logo_url || '', cover_url: biz.cover_url || '',
      national_id: biz.national_id || '', additional_number: biz.additional_number || '',
      region: biz.region || '', district: biz.district || '',
      street_name: biz.street_name || '', building_number: biz.building_number || '',
      latitude: biz.latitude || '', longitude: biz.longitude || '',
      unified_number: biz.unified_number || '', contact_person: biz.contact_person || '',
      mobile: biz.mobile || '', customer_service_phone: biz.customer_service_phone || '',
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
  const filtered = useMemo(() => businesses.filter((b) => {
    const matchSearch = !search ||
      b.name_ar?.includes(search) || b.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      b.username?.includes(search) || b.ref_id?.includes(search) ||
      b.email?.includes(search) || b.phone?.includes(search);
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'verified' && b.is_verified) ||
      (filterStatus === 'unverified' && !b.is_verified) ||
      (filterStatus === 'inactive' && !b.is_active) ||
      (filterStatus === 'contract' && contractBusinessIds.includes(b.id));
    const matchTier = filterTier === 'all' || b.membership_tier === filterTier;
    return matchSearch && matchStatus && matchTier;
  }), [businesses, search, filterStatus, filterTier, contractBusinessIds]);

  const stats = useMemo(() => ({
    total: businesses.length,
    verified: businesses.filter((b) => b.is_verified).length,
    active: businesses.filter((b) => b.is_active).length,
    contracts: contractBusinessIds.length,
    premium: businesses.filter((b) => b.membership_tier === 'premium' || b.membership_tier === 'enterprise').length,
  }), [businesses, contractBusinessIds]);

  const tierDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    tiers.forEach(t => { dist[t.value] = businesses.filter((b) => b.membership_tier === t.value).length; });
    return dist;
  }, [businesses]);

  const filteredCities = editForm.country_id
    ? cities.filter((c) => c.country_id === editForm.country_id)
    : cities;

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              {isRTL ? 'إدارة الأعمال' : 'Business Management'}
            </h1>
            <p className="text-muted-foreground font-body mt-1 text-sm">
              {isRTL ? `${stats.total} نشاط تجاري مسجّل • التحكم الشامل في الأعمال والخدمات والفروع` : `${stats.total} registered businesses • Full control over businesses, services & branches`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/50 border border-border/30 rounded-xl overflow-hidden p-0.5">
              <button className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('cards')}><LayoutGrid className="w-4 h-4" /></button>
              <button className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('table')}><List className="w-4 h-4" /></button>
            </div>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => { refetchBusinesses(); toast.success(isRTL ? 'تم التحديث' : 'Refreshed'); }}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => exportCSV(filtered, language)}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
            </Button>
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label={isRTL ? 'إجمالي الأعمال' : 'Total Businesses'} value={stats.total} icon={Building2} gradient="from-primary/10 to-primary/5" iconBg="bg-primary/15 text-primary" />
          <StatCard label={isRTL ? 'نشط' : 'Active'} value={stats.active} icon={Activity} gradient="from-emerald-500/10 to-emerald-500/5" iconBg="bg-emerald-500/15 text-emerald-600"
            trend={stats.total ? `${Math.round(stats.active / stats.total * 100)}%` : undefined} />
          <StatCard label={isRTL ? 'موثق' : 'Verified'} value={stats.verified} icon={Shield} gradient="from-blue-500/10 to-blue-500/5" iconBg="bg-blue-500/15 text-blue-600" />
          <StatCard label={isRTL ? 'مرتبط بعقود' : 'With Contracts'} value={stats.contracts} icon={FileText} gradient="from-accent/10 to-accent/5" iconBg="bg-accent/15 text-accent" />
          <StatCard label={isRTL ? 'مميز / مؤسسات' : 'Premium/Enterprise'} value={stats.premium} icon={Crown} gradient="from-purple-500/10 to-purple-500/5" iconBg="bg-purple-500/15 text-purple-600" />
        </div>

        {/* ─── Tier Distribution Bar ─── */}
        {stats.total > 0 && (
          <div className="rounded-2xl border border-border/30 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                {isRTL ? 'توزيع العضويات' : 'Membership Distribution'}
              </h3>
              <div className="flex items-center gap-3">
                {tiers.map(t => (
                  <span key={t.value} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="text-xs">{t.icon}</span>
                    {language === 'ar' ? t.label_ar : t.label_en}: {tierDistribution[t.value] || 0}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
              {tiers.map(t => {
                const pct = stats.total ? (tierDistribution[t.value] || 0) / stats.total * 100 : 0;
                if (!pct) return null;
                const colorMap: Record<string, string> = {
                  free: 'bg-muted-foreground/30',
                  basic: 'bg-blue-500',
                  premium: 'bg-accent',
                  enterprise: 'bg-purple-500',
                };
                return <div key={t.value} className={`${colorMap[t.value]} transition-all`} style={{ width: `${pct}%` }} />;
              })}
            </div>
          </div>
        )}

        {/* ─── Filters ─── */}
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input value={search}
                onChange={e => { const v = e.target.value; startTransition(() => setSearch(v)); }}
                placeholder={isRTL ? 'بحث بالاسم، المعرف، الهاتف، البريد...' : 'Search by name, ID, phone, email...'}
                className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl">
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All Status'}</SelectItem>
                <SelectItem value="verified">{isRTL ? 'موثق' : 'Verified'}</SelectItem>
                <SelectItem value="unverified">{isRTL ? 'غير موثق' : 'Unverified'}</SelectItem>
                <SelectItem value="inactive">{isRTL ? 'معطل' : 'Inactive'}</SelectItem>
                <SelectItem value="contract">{isRTL ? 'مرتبط بعقود' : 'With Contracts'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? 'كل العضويات' : 'All Tiers'}</SelectItem>
                {tiers.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {language === 'ar' ? t.label_ar : t.label_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(search || filterStatus !== 'all' || filterTier !== 'all') && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
              <span className="text-[11px] text-muted-foreground">{isRTL ? 'النتائج:' : 'Results:'} {filtered.length}</span>
              {search && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setSearch('')}>"{search}" <X className="w-2.5 h-2.5" /></Badge>}
              {filterStatus !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setFilterStatus('all')}>{filterStatus} <X className="w-2.5 h-2.5" /></Badge>}
              {filterTier !== 'all' && <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setFilterTier('all')}>{filterTier} <X className="w-2.5 h-2.5" /></Badge>}
              <button className="text-[10px] text-primary hover:underline ms-auto"
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterTier('all'); }}>
                {isRTL ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}
        </div>

        {/* ─── Inline Edit Panel ─── */}
        {editingBiz && (
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">{isRTL ? 'تعديل العمل' : 'Edit Business'}: {editingBiz.name_ar}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{editingBiz.ref_id} · @{editingBiz.username}</span>
                    {contractBusinessIds.includes(editingBiz.id) && (
                      <Badge variant="outline" className="text-[9px] gap-1"><FileText className="w-2.5 h-2.5" />{isRTL ? 'مرتبط بعقود' : 'Has Contracts'}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingBiz(null)} className="rounded-xl"><X className="w-4 h-4" /></Button>
            </div>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full grid grid-cols-7 h-9 rounded-xl">
                  <TabsTrigger value="info" className="text-[10px] rounded-lg">{isRTL ? 'المعلومات' : 'Info'}</TabsTrigger>
                  <TabsTrigger value="address" className="text-[10px] rounded-lg">{isRTL ? 'العنوان' : 'Address'}</TabsTrigger>
                  <TabsTrigger value="content" className="text-[10px] rounded-lg">{isRTL ? 'المحتوى' : 'Content'}</TabsTrigger>
                  <TabsTrigger value="media" className="text-[10px] rounded-lg">{isRTL ? 'الوسائط' : 'Media'}</TabsTrigger>
                  <TabsTrigger value="contact" className="text-[10px] rounded-lg">{isRTL ? 'التواصل' : 'Contact'}</TabsTrigger>
                  <TabsTrigger value="branches" className="text-[10px] rounded-lg">{isRTL ? 'الفروع' : 'Branches'} <Badge variant="secondary" className="text-[8px] ms-0.5 h-4 px-1">{branches.length}</Badge></TabsTrigger>
                  <TabsTrigger value="controls" className="text-[10px] rounded-lg">{isRTL ? 'التحكم' : 'Controls'}</TabsTrigger>
                </TabsList>

                {/* ── Info Tab ── */}
                <TabsContent value="info" className="space-y-4 mt-3">
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
                  <div>
                    <Label className="text-xs">{isRTL ? 'التصنيف' : 'Category'}</Label>
                    <Select value={editForm.category_id} onValueChange={v => setField('category_id', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-[10px] space-y-1 text-muted-foreground font-mono">
                    <div className="flex items-center justify-between">
                      <span>ID: {editingBiz.id}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                        onClick={() => { navigator.clipboard.writeText(editingBiz.id); toast.success('Copied'); }}>
                        <Copy className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                    <p>Ref: {editingBiz.ref_id}</p>
                    <p>Username: @{editingBiz.username}</p>
                    <p>Owner: {editingBiz.user_id}</p>
                    <p>Created: {new Date(editingBiz.created_at).toLocaleDateString()}</p>
                    <p className="flex items-center gap-1">
                      Rating: <Star className="w-2.5 h-2.5 text-accent" /> {editingBiz.rating_avg} ({editingBiz.rating_count} reviews)
                    </p>
                  </div>
                </TabsContent>

                {/* ── Address Tab ── */}
                <TabsContent value="address" className="space-y-4 mt-3">
                  <div>
                    <Label className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <MapPinned className="w-3 h-3" />
                      {isRTL ? 'تحديد الموقع على الخريطة' : 'Pick Location on Map'}
                    </Label>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      {isRTL ? 'انقر على الخريطة لتحديد الموقع وتعبئة حقول العنوان تلقائياً' : 'Click on map to pick location and auto-fill address fields'}
                    </p>
                    <LocationPicker lat={parseFloat(editForm.latitude) || 0} lng={parseFloat(editForm.longitude) || 0}
                      onPick={handleMapPick} isRTL={isRTL} />
                    {geocoding && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isRTL ? 'جاري استخراج بيانات العنوان...' : 'Extracting address data...'}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label className="text-[10px]">{isRTL ? 'خط العرض' : 'Latitude'}</Label>
                        <Input value={editForm.latitude} onChange={e => setField('latitude', e.target.value)} dir="ltr" className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">{isRTL ? 'خط الطول' : 'Longitude'}</Label>
                        <Input value={editForm.longitude} onChange={e => setField('longitude', e.target.value)} dir="ltr" className="h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isRTL ? 'الرقم الوطني' : 'National ID'}</Label>
                      <Input value={editForm.national_id} onChange={e => setField('national_id', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'الرقم الإضافي' : 'Additional Number'}</Label>
                      <Input value={editForm.additional_number} onChange={e => setField('additional_number', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isRTL ? 'الدولة' : 'Country'}</Label>
                      <Select value={editForm.country_id} onValueChange={v => { setField('country_id', v); setField('city_id', ''); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'المدينة' : 'City'}</Label>
                      <Select value={editForm.city_id} onValueChange={v => setField('city_id', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {filteredCities.map((c) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isRTL ? 'المنطقة' : 'Region'}</Label>
                      <Input value={editForm.region} onChange={e => setField('region', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'الحي' : 'District'}</Label>
                      <Input value={editForm.district} onChange={e => setField('district', e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isRTL ? 'اسم الشارع' : 'Street Name'}</Label>
                      <Input value={editForm.street_name} onChange={e => setField('street_name', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">{isRTL ? 'رقم المبنى' : 'Building Number'}</Label>
                      <Input value={editForm.building_number} onChange={e => setField('building_number', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> {isRTL ? 'العنوان الكامل' : 'Full Address'}</Label>
                      <FieldAiActions compact value={editForm.address} lang="ar" isRTL={isRTL} fieldType="short_text"
                        onTranslated={() => {}} onImproved={(v) => setField('address', v)} />
                    </div>
                    <Textarea value={editForm.address} onChange={e => setField('address', e.target.value)} rows={2} />
                  </div>
                </TabsContent>

                {/* ── Content Tab ── */}
                <TabsContent value="content" className="space-y-4 mt-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{isRTL ? 'نبذة قصيرة (عربي)' : 'Short Description (AR)'}</Label>
                      <FieldAiActions compact value={editForm.short_description_ar} lang="ar" isRTL={isRTL} fieldType="excerpt"
                        onTranslated={(v) => setField('short_description_en', v)} onImproved={(v) => setField('short_description_ar', v)} />
                    </div>
                    <Textarea value={editForm.short_description_ar} onChange={e => setField('short_description_ar', e.target.value)} rows={2}
                      placeholder={isRTL ? 'وصف مختصر للنشاط (150 حرف)' : 'Short business description (150 chars)'} />
                    <span className="text-[10px] text-muted-foreground">{editForm.short_description_ar?.length || 0}/150</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{isRTL ? 'نبذة قصيرة (إنجليزي)' : 'Short Description (EN)'}</Label>
                      <FieldAiActions compact value={editForm.short_description_en} lang="en" isRTL={isRTL} fieldType="excerpt"
                        onTranslated={(v) => setField('short_description_ar', v)} onImproved={(v) => setField('short_description_en', v)} />
                    </div>
                    <Textarea value={editForm.short_description_en} onChange={e => setField('short_description_en', e.target.value)} rows={2} dir="ltr" />
                    <span className="text-[10px] text-muted-foreground">{editForm.short_description_en?.length || 0}/150</span>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{isRTL ? 'الوصف التفصيلي (عربي)' : 'Full Description (AR)'}</Label>
                      <FieldAiActions compact value={editForm.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setField('description_en', v)} onImproved={(v) => setField('description_ar', v)} />
                    </div>
                    <Textarea value={editForm.description_ar} onChange={e => setField('description_ar', e.target.value)} rows={5} />
                    <span className="text-[10px] text-muted-foreground">{editForm.description_ar?.length || 0} {isRTL ? 'حرف' : 'chars'}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{isRTL ? 'الوصف التفصيلي (إنجليزي)' : 'Full Description (EN)'}</Label>
                      <FieldAiActions compact value={editForm.description_en} lang="en" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setField('description_ar', v)} onImproved={(v) => setField('description_en', v)} />
                    </div>
                    <Textarea value={editForm.description_en} onChange={e => setField('description_en', e.target.value)} rows={5} dir="ltr" />
                    <span className="text-[10px] text-muted-foreground">{editForm.description_en?.length || 0} {isRTL ? 'حرف' : 'chars'}</span>
                  </div>
                </TabsContent>

                {/* ── Media Tab ── */}
                <TabsContent value="media" className="space-y-4 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">{isRTL ? 'الشعار' : 'Logo'}</Label>
                      <ImageUpload bucket="business-assets" value={editForm.logo_url}
                        onChange={(url) => setField('logo_url', url)} onRemove={() => setField('logo_url', '')}
                        aspectRatio="square" placeholder={isRTL ? 'رفع الشعار' : 'Upload logo'} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">{isRTL ? 'صورة الغلاف' : 'Cover Image'}</Label>
                      <ImageUpload bucket="business-assets" value={editForm.cover_url}
                        onChange={(url) => setField('cover_url', url)} onRemove={() => setField('cover_url', '')}
                        placeholder={isRTL ? 'رفع صورة الغلاف' : 'Upload cover'} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Image className="w-3 h-3" /> {isRTL ? 'معرض صور الأعمال' : 'Work Gallery'}
                      <Badge variant="secondary" className="text-[9px] ms-1">{portfolioData.length}</Badge>
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {portfolioData.map((item) => (
                        <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
                          <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                          <button type="button"
                            onClick={() => { if (confirm(isRTL ? 'حذف هذه الصورة؟' : 'Delete this image?')) deletePortfolioMutation.mutate(item.id); }}
                            className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="aspect-square">
                        <ImageUpload bucket="portfolio-images" folder="admin" aspectRatio="square"
                          onChange={(url) => addPortfolioMutation.mutate(url)} placeholder={isRTL ? 'إضافة صورة' : 'Add image'} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Contact Tab ── */}
                <TabsContent value="contact" className="space-y-4 mt-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> {isRTL ? 'اسم مسؤول التواصل' : 'Contact Person'}</Label>
                    <Input value={editForm.contact_person} onChange={e => setField('contact_person', e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {isRTL ? 'رقم الهاتف' : 'Phone'}</Label>
                      <Input value={editForm.phone} onChange={e => setField('phone', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {isRTL ? 'رقم الجوال' : 'Mobile'}</Label>
                      <Input value={editForm.mobile} onChange={e => setField('mobile', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {isRTL ? 'الرقم الموحد' : 'Unified Number'}</Label>
                      <Input value={editForm.unified_number} onChange={e => setField('unified_number', e.target.value)} dir="ltr" className="mt-1" placeholder="920xxxxxxx" />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {isRTL ? 'خدمة العملاء' : 'Customer Service'}</Label>
                      <Input value={editForm.customer_service_phone} onChange={e => setField('customer_service_phone', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input value={editForm.email} onChange={e => setField('email', e.target.value)} dir="ltr" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label>
                    <Input value={editForm.website} onChange={e => setField('website', e.target.value)} dir="ltr" className="mt-1" placeholder="https://" />
                  </div>
                  {editingBiz && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3" /> {isRTL ? 'الخدمات المسجلة' : 'Registered Services'}
                        </Label>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => { setEditingBiz(null); openServices(editingBiz.id); }}>
                          <Settings className="w-3 h-3" /> {isRTL ? 'إدارة' : 'Manage'}
                        </Button>
                      </div>
                      {allServices.filter((s) => s.business_id === editingBiz.id).length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'لا توجد خدمات مسجلة' : 'No registered services'}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {allServices.filter((s) => s.business_id === editingBiz.id).map((s) => (
                            <Badge key={s.id} variant="outline" className="text-[9px]">
                              {language === 'ar' ? s.name_ar : (s.name_en || s.name_ar)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── Branches Tab ── */}
                <TabsContent value="branches" className="space-y-4 mt-3">
                  <div className="space-y-2">
                    {branches.map((br) => (
                      <div key={br.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all ${!br.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{language === 'ar' ? br.name_ar : (br.name_en || br.name_ar)}</p>
                            {br.is_main && <Badge className="text-[8px] h-4 bg-primary/10 text-primary border-0">{isRTL ? 'رئيسي' : 'Main'}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                            {br.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{br.phone}</span>}
                            {br.mobile && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{br.mobile}</span>}
                            {br.unified_number && <span>{br.unified_number}</span>}
                            {br.district && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{br.district}</span>}
                            {br.contact_person && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{br.contact_person}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch checked={br.is_active} onCheckedChange={v => toggleBranchMutation.mutate({ id: br.id, is_active: v })} />
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => {
                            setEditingBranchId(br.id);
                            setBranchForm({
                              name_ar: br.name_ar, name_en: br.name_en || '', is_main: br.is_main, is_active: br.is_active,
                              contact_person: br.contact_person || '', phone: br.phone || '', mobile: br.mobile || '',
                              unified_number: br.unified_number || '', customer_service_phone: br.customer_service_phone || '',
                              email: br.email || '', website: br.website || '', country_id: br.country_id || '',
                              city_id: br.city_id || '', region: br.region || '', district: br.district || '',
                              street_name: br.street_name || '', building_number: br.building_number || '',
                              national_id: br.national_id || '', additional_number: br.additional_number || '',
                              address: br.address || '', latitude: br.latitude || '', longitude: br.longitude || '',
                            });
                          }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                            onClick={() => { if (confirm(isRTL ? 'حذف هذا الفرع؟' : 'Delete this branch?')) deleteBranchMutation.mutate(br.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {branches.length === 0 && !branchForm && (
                      <p className="text-center text-sm text-muted-foreground py-6">{isRTL ? 'لا توجد فروع مسجلة' : 'No branches registered'}</p>
                    )}
                  </div>

                  {branchForm ? (
                    <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/[0.03]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                          {editingBranchId ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {editingBranchId ? (isRTL ? 'تعديل الفرع' : 'Edit Branch') : (isRTL ? 'إضافة فرع جديد' : 'Add New Branch')}
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setBranchForm(null); setEditingBranchId(null); }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">{isRTL ? 'اسم الفرع (عربي)' : 'Branch Name (AR)'} *</Label>
                        <Input value={branchForm.name_ar} onChange={e => setBranchForm((f) => ({ ...f, name_ar: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{isRTL ? 'اسم الفرع (إنجليزي)' : 'Branch Name (EN)'}</Label>
                        <Input value={branchForm.name_en} onChange={e => setBranchForm((f) => ({ ...f, name_en: e.target.value }))} dir="ltr" className="mt-1" />
                      </div>
                      <Separator />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isRTL ? 'بيانات التواصل' : 'Contact Info'}</p>
                      <div>
                        <Label className="text-xs">{isRTL ? 'اسم مسؤول التواصل' : 'Contact Person'}</Label>
                        <Input value={branchForm.contact_person} onChange={e => setBranchForm((f) => ({ ...f, contact_person: e.target.value }))} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                          <Input value={branchForm.phone} onChange={e => setBranchForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'الجوال' : 'Mobile'}</Label>
                          <Input value={branchForm.mobile} onChange={e => setBranchForm((f) => ({ ...f, mobile: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'الرقم الموحد' : 'Unified Number'}</Label>
                          <Input value={branchForm.unified_number} onChange={e => setBranchForm((f) => ({ ...f, unified_number: e.target.value }))} dir="ltr" className="mt-1" placeholder="920xxxxxxx" />
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'خدمة العملاء' : 'Customer Service'}</Label>
                          <Input value={branchForm.customer_service_phone} onChange={e => setBranchForm((f) => ({ ...f, customer_service_phone: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                          <Input value={branchForm.email} onChange={e => setBranchForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'الموقع الإلكتروني' : 'Website'}</Label>
                          <Input value={branchForm.website} onChange={e => setBranchForm((f) => ({ ...f, website: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <Separator />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isRTL ? 'العنوان' : 'Address'}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'الدولة' : 'Country'}</Label>
                          <Select value={branchForm.country_id} onValueChange={v => setBranchForm((f) => ({ ...f, country_id: v, city_id: '' }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'المدينة' : 'City'}</Label>
                          <Select value={branchForm.city_id} onValueChange={v => setBranchForm((f) => ({ ...f, city_id: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر' : 'Select'} /></SelectTrigger>
                            <SelectContent>
                              {(branchForm.country_id ? cities.filter((c) => c.country_id === branchForm.country_id) : cities).map((c) => (
                                <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'المنطقة' : 'Region'}</Label>
                          <Input value={branchForm.region} onChange={e => setBranchForm((f) => ({ ...f, region: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'الحي' : 'District'}</Label>
                          <Input value={branchForm.district} onChange={e => setBranchForm((f) => ({ ...f, district: e.target.value }))} className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'اسم الشارع' : 'Street'}</Label>
                          <Input value={branchForm.street_name} onChange={e => setBranchForm((f) => ({ ...f, street_name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'رقم المبنى' : 'Building No.'}</Label>
                          <Input value={branchForm.building_number} onChange={e => setBranchForm((f) => ({ ...f, building_number: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{isRTL ? 'الرقم الوطني' : 'National ID'}</Label>
                          <Input value={branchForm.national_id} onChange={e => setBranchForm((f) => ({ ...f, national_id: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{isRTL ? 'الرقم الإضافي' : 'Additional No.'}</Label>
                          <Input value={branchForm.additional_number} onChange={e => setBranchForm((f) => ({ ...f, additional_number: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{isRTL ? 'العنوان الكامل' : 'Full Address'}</Label>
                        <Textarea value={branchForm.address} onChange={e => setBranchForm((f) => ({ ...f, address: e.target.value }))} rows={2} className="mt-1" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={branchForm.is_main} onCheckedChange={v => setBranchForm((f) => ({ ...f, is_main: v }))} />
                          <span className="text-xs">{isRTL ? 'فرع رئيسي' : 'Main Branch'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={branchForm.is_active} onCheckedChange={v => setBranchForm((f) => ({ ...f, is_active: v }))} />
                          <span className="text-xs">{isRTL ? 'مفعّل' : 'Active'}</span>
                        </div>
                      </div>
                      <Button onClick={() => saveBranchMutation.mutate()} disabled={!branchForm.name_ar || saveBranchMutation.isPending}
                        className="w-full gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        {saveBranchMutation.isPending ? '...' : (isRTL ? 'حفظ الفرع' : 'Save Branch')}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-1.5" onClick={() => { setBranchForm(emptyBranch()); setEditingBranchId(null); }}>
                      <Plus className="w-3.5 h-3.5" /> {isRTL ? 'إضافة فرع جديد' : 'Add New Branch'}
                    </Button>
                  )}
                </TabsContent>

                {/* ── Controls Tab ── */}
                <TabsContent value="controls" className="space-y-4 mt-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{isRTL ? 'حالة التفعيل' : 'Active Status'}</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'تفعيل أو تعطيل ظهور العمل' : 'Enable or disable business visibility'}</p>
                      </div>
                      <Switch checked={editForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{isRTL ? 'التوثيق' : 'Verification'}</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'علامة التوثيق الرسمية' : 'Official verification badge'}</p>
                      </div>
                      <Switch checked={editForm.is_verified} onCheckedChange={v => setField('is_verified', v)} />
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <p className="text-sm font-medium mb-2">{isRTL ? 'مستوى العضوية' : 'Membership Tier'}</p>
                      <Select value={editForm.membership_tier} onValueChange={v => setField('membership_tier', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {tiers.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="flex items-center gap-2">
                                <span>{t.icon}</span> {language === 'ar' ? t.label_ar : t.label_en}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button onClick={() => updateBizMutation.mutate()} disabled={!editForm.name_ar || updateBizMutation.isPending} className="flex-1 gap-1.5 rounded-xl">
                  <Save className="w-3.5 h-3.5" />
                  {updateBizMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}
                </Button>
                <Button variant="outline" onClick={() => setEditingBiz(null)} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
          </div>
        )}

        {/* ─── Inline Services Panel ─── */}
        {servicesPanel && (
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-base flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Package className="w-4 h-4 text-accent" />
                </div>
                {isRTL ? 'إدارة الخدمات' : 'Manage Services'}
                <Badge variant="secondary" className="text-[10px]">{services.length}</Badge>
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setServicesPanel(null)} className="rounded-xl"><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                {services.map((svc) => (
                  <div key={svc.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all ${!svc.is_active ? 'opacity-50' : ''}`}>
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
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> {isRTL ? 'إضافة خدمة جديدة' : 'Add New Service'}
                </p>
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
                  {addServiceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isRTL ? 'إضافة الخدمة' : 'Add Service')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Business List ─── */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-accent/30" />
            </div>
            <p className="font-heading font-bold text-sm mb-1">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'جرّب تعديل معايير البحث' : 'Try adjusting your search criteria'}</p>
            {(search || filterStatus !== 'all' || filterTier !== 'all') && (
              <Button variant="outline" size="sm" className="mt-4 gap-1.5 rounded-xl"
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterTier('all'); }}>
                <X className="w-3.5 h-3.5" /> {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* ─── Table View ─── */
          <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px] font-semibold">{isRTL ? 'النشاط' : 'Business'}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{isRTL ? 'المعرف' : 'Username'}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{isRTL ? 'العضوية' : 'Tier'}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{isRTL ? 'التقييم' : 'Rating'}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-[11px] font-semibold text-center">{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((biz, idx) => {
                    const tierInfo = tiers.find(t => t.value === biz.membership_tier) || tiers[0];
                    return (
                      <TableRow key={biz.id} className={`hover:bg-muted/30 ${!biz.is_active ? 'opacity-50' : ''}`}
                        style={{ animationDelay: `${idx * 0.02}s` }}>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border border-border/50">
                              <AvatarImage src={biz.logo_url || undefined} />
                              <AvatarFallback className="bg-primary/5 text-primary font-bold text-[10px]">{biz.name_ar?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[180px]">{language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}</p>
                              <p className="text-[10px] text-muted-foreground">{biz.ref_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">@{biz.username}</TableCell>
                        <TableCell>
                          <Badge className={`text-[9px] h-5 ${tierInfo.color} border-0`}>
                            {tierInfo.icon} {language === 'ar' ? tierInfo.label_ar : tierInfo.label_en}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-0.5 text-[11px]">
                            <Star className="w-3 h-3 text-accent fill-accent" /> {biz.rating_avg}
                            <span className="text-muted-foreground">({biz.rating_count})</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {biz.is_verified && <Badge className="text-[8px] h-4 bg-blue-500/10 text-blue-600 border-0">{isRTL ? 'موثق' : 'Verified'}</Badge>}
                            {!biz.is_active && <Badge variant="destructive" className="text-[8px] h-4">{isRTL ? 'معطل' : 'Disabled'}</Badge>}
                            {biz.is_active && !biz.is_verified && <Badge className="text-[8px] h-4 bg-green-500/10 text-green-600 border-0">{isRTL ? 'نشط' : 'Active'}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(biz)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => openServices(biz.id)}>
                              <Package className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                              <Link to={`/${biz.username}`}><Eye className="w-3 h-3" /></Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* ─── Cards View ─── */
          <div className="space-y-3">
            {filtered.map((biz, idx) => {
              const tierInfo = tiers.find(t => t.value === biz.membership_tier) || tiers[0];
              const hasContract = contractBusinessIds.includes(biz.id);
              const svcCount = allServices.filter((s) => s.business_id === biz.id).length;
              return (
                <div key={biz.id}
                  className={`group relative rounded-2xl border bg-card transition-all duration-200 hover:shadow-md
                    ${!biz.is_active ? 'opacity-60 border-destructive/40' : 'border-border/30 hover:border-primary/20'}`}
                  style={{ animationDelay: `${idx * 0.03}s` }}>
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="w-12 h-12 shrink-0 ring-2 ring-border/10">
                            <AvatarImage src={biz.logo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                              {biz.name_ar?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {biz.is_verified && (
                            <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center ring-2 ring-card">
                              <CheckCircle className="w-3 h-3 text-blue-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading font-bold text-sm truncate">
                              {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                            </h3>
                            {!biz.is_active && <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0"><Ban className="w-2.5 h-2.5" />{isRTL ? 'معطل' : 'Disabled'}</Badge>}
                            {hasContract && <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0"><FileText className="w-2.5 h-2.5" />{isRTL ? 'عقود' : 'Contracts'}</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            <span className="text-[11px] text-muted-foreground font-mono">@{biz.username}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{biz.ref_id}</span>
                            {biz.phone && <span className="flex items-center gap-1 text-[11px] text-muted-foreground" dir="ltr"><Phone className="w-3 h-3 shrink-0" />{biz.phone}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge className={`${tierInfo.color} text-[10px] border px-1.5 py-0`}>
                              {tierInfo.icon} {language === 'ar' ? tierInfo.label_ar : tierInfo.label_en}
                            </Badge>
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <Star className="w-3 h-3 text-accent fill-accent" />
                              {biz.rating_avg} ({biz.rating_count})
                            </span>
                            {svcCount > 0 && (
                              <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                                <Package className="w-2.5 h-2.5" /> {svcCount} {isRTL ? 'خدمة' : 'services'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                        <Select value={biz.membership_tier} onValueChange={tier => tierMutation.mutate({ id: biz.id, tier })}>
                          <SelectTrigger className="h-8 text-xs w-28 border-dashed rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {tiers.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {language === 'ar' ? t.label_ar : t.label_en}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        <Button variant={biz.is_verified ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1.5 rounded-xl"
                          onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_verified', value: !biz.is_verified })}>
                          {biz.is_verified ? <CheckCircle className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {biz.is_verified ? (isRTL ? 'موثق' : 'Verified') : (isRTL ? 'توثيق' : 'Verify')}
                        </Button>

                        <Button variant="outline" size="sm"
                          className={`h-8 text-xs gap-1.5 rounded-xl ${!biz.is_active ? 'text-emerald-600 border-emerald-200' : 'text-amber-600 border-amber-200'}`}
                          onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_active', value: !biz.is_active })}>
                          {biz.is_active ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {biz.is_active ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
                        </Button>

                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl"
                          onClick={() => openServices(biz.id)}>
                          <Package className="w-3 h-3" /> {isRTL ? 'خدمات' : 'Services'}
                        </Button>

                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl" onClick={() => openEdit(biz)}>
                          <Edit className="w-3 h-3" />{isRTL ? 'تعديل' : 'Edit'}
                        </Button>

                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" asChild>
                          <Link to={`/${biz.username}`}><Eye className="w-3 h-3" /></Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? `عرض ${filtered.length} من ${businesses.length} نشاط` : `Showing ${filtered.length} of ${businesses.length} businesses`}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <Activity className="w-3 h-3" />
                {isRTL ? `${stats.active} نشط` : `${stats.active} active`}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                <Shield className="w-3 h-3" />
                {isRTL ? `${stats.verified} موثق` : `${stats.verified} verified`}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinesses;
