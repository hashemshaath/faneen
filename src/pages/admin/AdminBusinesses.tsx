import React, { useState, useCallback, useEffect, useRef, useMemo, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { pickBi } from '@/components/common/Bilingual';
import { useAuth } from '@/contexts/AuthContext';
import { invokeBlogAiTools } from '@/modules/ai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listDistinctContractBusinessIds } from '@/modules/contracts';
import type { Database } from '@/integrations/supabase/types';
import { listActiveCities } from '@/modules/locations';
import {
  updateBusinessById,
  listAdminBusinesses,
  setBusinessActive,
  setBusinessVerified,
  bulkSetBusinessesActive,
  bulkSetBusinessesVerified,
  insertBusiness,
} from '@/modules/businesses';
import { getProfileByEmail } from '@/modules/users/services/getProfileByEmail';
import { getProfileByRefId, searchProfilesByOr } from '@/modules/users';
import {
  adminCreateBusinessWithOwner,
  type AdminCreateBusinessPayload,
} from '@/modules/businesses/services/adminCreateBusinessWithOwner';
import { mapAdminCreateBizError } from '@/modules/businesses/services/adminCreateBusinessWithOwnerErrors';
import { nationalAddressLookup } from '@/modules/locations';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import { RegionCitySelector } from '@/components/forms/RegionCitySelector';
import { SA_REGIONS, findRegionByLabel, type SaRegionId } from '@/data/sa-regions';
import { NationalAddressForm, type NationalAddressValue } from '@/modules/addresses';
import { setBusinessMembershipTier, type MembershipTier } from '@/modules/memberships';
import { getProfileDisplayName } from '@/modules/profiles/utils/displayName';
import { notifyMembershipChangeForBusiness, setProviderServiceStatus } from '@/modules/providerServices';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { getProfileByUserId } from '@/modules/users/services/getProfileByUserId';
import {
  listServicesByBusiness,
  listAllBusinessServicesLite,
  listBranchesByBusiness,
  insertBusinessService,
  insertBusinessServiceReturning,
  updateBusinessServiceById,
  deleteBusinessServiceById,
  insertBusinessBranch,
  insertBusinessBranchReturning,
  updateBusinessBranchById,
  deleteBusinessBranchById,
  setMainBranch,
} from '@/modules/catalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessOperationsPanel } from '@/components/business/BusinessOperationsPanel';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import { FieldAiActions } from '@/components/blog/FieldAiActions';
import { toast } from 'sonner';
import { ReferenceTag } from '@/components/reference/ReferenceTag';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2, Search, CheckCircle, XCircle, Star, Loader2, Eye, Ban,
  Edit, Trash2, Plus, X, Globe, Phone, Mail, MapPin, Settings,
  Shield, Crown, BarChart3, Package, DollarSign, ExternalLink,
  GripVertical, ToggleLeft, ToggleRight, Save, Image, MapPinned,
  FileText, Users, Locate, Navigation, Download, LayoutGrid, List,
  TrendingUp, ArrowUpRight, Filter, RefreshCw, Copy, MoreHorizontal,
  Activity, Zap, Languages, ArrowUpDown, ChevronLeft, ChevronRight,
  CheckSquare, Square, AlertTriangle,
  FlaskConical, User, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNoIndex } from "@/hooks/useNoIndex";
import { parseMembershipLimitError } from '@/lib/membership-errors';
import { PhoneField, parsePhoneValue, toE164 } from '@/components/forms/PhoneField';
import { BusinessOwnerPanel } from '@/components/admin/BusinessOwnerPanel';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { UnifiedApprovalsCenterBanner } from '@/components/admin/UnifiedApprovalsCenterBanner';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { SavedViewsMenu } from '@/components/admin/SavedViewsMenu';
import { useAdminSavedViews } from '@/hooks/useAdminSavedViews';
import { BusinessFiltersToolbar } from '@/components/admin/businesses/BusinessFiltersToolbar';
import { BusinessBulkActionBar } from '@/components/admin/businesses/BusinessBulkActionBar';
import { SEOPreviewCard } from '@/components/seo/SEOPreviewCard';
import { BusinessTaxonomySection } from '@/modules/taxonomy';
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
  { value: 'basic', label_ar: 'أساسي', label_en: 'Basic', color: 'bg-info/10 text-info', icon: '⭐' },
  { value: 'premium', label_ar: 'مميز', label_en: 'Premium', color: 'bg-accent/20 text-accent-foreground', icon: '👑' },
  { value: 'enterprise', label_ar: 'مؤسسات', label_en: 'Enterprise', color: 'bg-secondary/10 text-secondary', icon: '🏢' },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
const exportCSV = (businesses: any[], language: string) => {
  // Phase 18f — legacy `category_id` removed from CSV. Activity classification
  // now lives in `business_taxonomy_categories` and is admin-managed inline.
  const headers = ['Ref ID', 'Name (AR)', 'Name (EN)', 'Username', 'Phone', 'Email', 'Tier', 'Verified', 'Active', 'Rating', 'Created'];
  const rows = businesses.map((b: any) => [
    b.ref_id, b.name_ar, b.name_en || '', `@${b.username}`, b.phone || '', b.email || '',
    b.membership_tier, b.is_verified ? 'Yes' : 'No', b.is_active ? 'Yes' : 'No',
    `${b.rating_avg} (${b.rating_count})`, new Date(b.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
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
        <div className="flex items-center gap-0.5 text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded-full font-medium">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

const AdminBusinesses = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const filterStatus = searchParams.get('status') || 'all';
  const filterTier = searchParams.get('tier') || 'all';
  const filterTranslation = searchParams.get('translation') || 'all'; // all|missing_en|missing_ar|complete
  const filterOrigin = searchParams.get('origin') || 'all'; // all|demo|production
  const sortBy = (searchParams.get('sort') || 'recent') as 'recent' | 'rating' | 'name' | 'tier';
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;
  const viewMode = (searchParams.get('view') || 'cards') as 'cards' | 'table';
  const PAGE_SIZE = 20;
  const updateParam = useCallback((updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') sp.delete(k);
      else sp.set(k, v);
    });
    setSearchParams(sp, { replace: false });
  }, [searchParams, setSearchParams]);
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => {
    const t = setTimeout(() => { if (searchInput !== search) updateParam({ q: searchInput || null, page: null }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  const setFilterStatus = (v: string) => updateParam({ status: v === 'all' ? null : v, page: null });
  const setFilterTier = (v: string) => updateParam({ tier: v === 'all' ? null : v, page: null });
  // Multi-tier: URL `tier` may be comma-separated (e.g. tier=basic,premium).
  const selectedTiers = React.useMemo(
    () => (filterTier === 'all' ? [] : filterTier.split(',').filter(Boolean)),
    [filterTier],
  );
  const toggleTier = (value: string) => {
    const next = new Set(selectedTiers);
    if (next.has(value)) next.delete(value); else next.add(value);
    const arr = Array.from(next);
    updateParam({ tier: arr.length === 0 ? null : arr.join(','), page: null });
  };
  const clearTiers = () => updateParam({ tier: null, page: null });
  const setFilterOrigin = (v: string) => updateParam({ origin: v === 'all' ? null : v, page: null });
  const setSortBy = (v: string) => updateParam({ sort: v === 'recent' ? null : v });
  const setViewMode = (v: 'cards' | 'table') => updateParam({ view: v === 'cards' ? null : v });
  const setSearch = (v: string) => { setSearchInput(v); };
  const setPage = (n: number) => updateParam({ page: n <= 1 ? null : String(n) });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSelected = () => setSelected(new Set());
  const [editingBiz, setEditingBiz] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  // ── Create new business (admin) ──
  const [creatingBiz, setCreatingBiz] = useState(false);
  const emptyCreateForm = () => ({
    // Owner mode: pick existing user, create a new account, or send invite
    // Default: placeholder — entity is parked under the shared placeholder
    // account (com@qitaat.com) and can be claimed by a real owner later.
    owner_mode: 'placeholder' as 'placeholder' | 'existing' | 'new' | 'invite',
    owner_email: '',
    owner_password: '',
    owner_full_name: '',
    owner_phone: '',
    owner_position: '',
    owner_query: '',                  // email OR USR-XXXXX
    resolved_user_id: '' as string,
    resolved_owner_label: '' as string,
    resolving_owner: false,
    owner_error: '' as string,
    name_ar: '',
    name_en: '',
    username: '',
    username_ok: false,
    phone_cc: '+966',
    phone_national: '',
    email: '',
    city_id: '',
    region_id: '' as SaRegionId | '',
    // Registry / official identifiers
    national_id: '',          // CR (commercial registration) number
    unified_number: '',       // 700-/national unified number
    vat_number: '',           // VAT/tax number
    // Detailed national address
    district: '',
    district_en: '',
    street_name: '',
    street_name_en: '',
    building_number: '',
    additional_number: '',
    address: '',
    address_en: '',
  });
  const [createForm, setCreateForm] = useState<any>(emptyCreateForm());
  const setCField = (k: string, v: unknown) => setCreateForm((f: any) => ({ ...f, [k]: v }));
  // Owner autocomplete (search profiles by name/email/username/ref_id)
  const [ownerResults, setOwnerResults] = useState<Array<{
    user_id: string; full_name: string | null; full_name_ar: string | null; full_name_en: string | null;
    email: string | null; username: string | null; ref_id: string | null; avatar_url: string | null;
  }>>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [servicesPanel, setServicesPanel] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newService, setNewService] = useState({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });
  const [geocoding, setGeocoding] = useState(false);
  const [branchForm, setBranchForm] = useState<any | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [verifyConfirm, setVerifyConfirm] = useState<{ id: string; name: string; value: boolean } | null>(null);

  const setField = useCallback((key: string, value: unknown) => {
    setEditForm((f) => ({ ...f, [key]: value }));
  }, []);

  // When a workflow panel (create / edit / services) is open we collapse
  // the heavy header, KPI strip, approvals banner and tier distribution
  // so the active task gets full vertical priority at the top of the page.
  const panelOpen = creatingBiz || !!editingBiz || !!servicesPanel;
  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const setServiceField = useCallback((key: string, value: string | number | boolean | null) => {
    setNewService(s => ({ ...s, [key]: value }));
  }, []);

  /* ─── Queries ─── */
  const { data: businesses = [], isLoading, refetch: refetchBusinesses } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<Database['public']['Tables']['businesses']['Row']>({
        select: '*',
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return data;
    },
  });

  /* ─── Consume ?focus=<biz_id> after businesses load → open inline edit panel ─── */
  const focusParam = searchParams.get('focus');
  useEffect(() => {
    if (!focusParam || !businesses?.length) return;
    const target = (businesses as Array<Record<string, unknown>>).find(
      (b) => b.id === focusParam || b.ref_id === focusParam,
    );
    if (target) {
      openEdit(target);
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
      setTimeout(() => {
        document.getElementById(`biz-row-${target.id as string}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusParam, businesses]);

  // Phase 5: Legacy `categories` list removed from admin UI.
  // Business classification is managed taxonomy-only via BusinessTaxonomySection.
  // `businesses.category_id` is kept in DB and types for backward reads only —
  // never written from this admin screen anymore.

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
      const { data } = await listActiveCities<Database['public']['Tables']['cities']['Row']>({ select: '*', order: null });
      return data || [];
    },
  });

  const { data: services = [], refetch: refetchServices } = useQuery({
    queryKey: ['admin-services', servicesPanel],
    queryFn: async () => {
      if (!servicesPanel) return [];
      const { data } = await listServicesByBusiness<Database['public']['Tables']['business_services']['Row']>({
        businessId: servicesPanel,
        select: '*',
        activeOnly: false,
        order: 'sort_order',
      });
      return data || [];
    },
    enabled: !!servicesPanel,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ['all-business-services'],
    queryFn: async () => {
      const { data } = await listAllBusinessServicesLite<
        Pick<Database['public']['Tables']['business_services']['Row'], 'id' | 'name_ar' | 'name_en' | 'business_id'>
      >();
      return data || [];
    },
  });

  const { data: branches = [], refetch: refetchBranches } = useQuery({
    queryKey: ['admin-branches', editingBiz?.id],
    queryFn: async () => {
      if (!editingBiz?.id) return [];
      const { data } = await listBranchesByBusiness<Database['public']['Tables']['business_branches']['Row']>({
        businessId: editingBiz.id,
        select: '*',
        order: [{ column: 'sort_order' }],
      });
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

  // Owner ref_id (USR-…) — Reference-ID Architecture: never display raw UUIDs as primary identity.
  const { data: ownerRef } = useQuery({
    queryKey: ['admin-business-owner-ref', editingBiz?.user_id],
    queryFn: async () => {
      if (!editingBiz?.user_id) return null;
      const { data } = await getProfileByUserId<{ ref_id: string | null; full_name_ar: string | null; full_name_en: string | null }>({
        userId: editingBiz.user_id,
        select: 'ref_id, full_name_ar, full_name_en',
      });
      return data;
    },
    enabled: !!editingBiz?.user_id,
  });

  const { data: contractBusinessIds = [] } = useQuery({
    queryKey: ['contract-business-ids'],
    queryFn: async () => {
      const { data } = await listDistinctContractBusinessIds();
      return [...new Set((data || []).map((c) => c.business_id).filter(Boolean))];
    },
  });

  /* ─── Mutations ─── */
  const logAction = async (action: string, entityId: string, details: Record<string, unknown>) => {
    await supabase.from('admin_activity_log').insert({
      user_id: user!.id, action, entity_type: 'business', entity_id: entityId, details,
    } as any);
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'is_active' | 'is_verified'; value: boolean }) => {
      // R4E-3: route sensitive toggles through guarded wrappers.
      if (field === 'is_active') await setBusinessActive(id, value);
      else if (field === 'is_verified') await setBusinessVerified(id, value);
      else throw new Error(`Unsupported toggle field: ${field}`);
      await logAction(`business_${field}_${value}`, id, { field, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(pickBi(isRTL, 'تم التحديث', 'Updated'));
    },
    onError: () => toast.error(pickBi(isRTL, 'فشل التحديث', 'Update failed')),
  });

  const approvalStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const payload: Record<string, unknown> = { approval_status: status };
      if (status === 'published') payload.published_at = new Date().toISOString();
      const { error } = await updateBusinessById({ id, values: payload as never });
      if (error) throw error;
      await logAction(`business_approval_status_${status}`, id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(pickBi(isRTL, 'تم تحديث الحالة', 'Status updated'));
    },
    onError: () => toast.error(pickBi(isRTL, 'فشل تحديث الحالة', 'Status update failed')),
  });

  const tierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: MembershipTier }) => {
      // R4E-2C-4-PHASE-3: route through membership-owned RPC. RPC writes
      // admin_activity_log itself, so no frontend logAction here.
      const result = await setBusinessMembershipTier(id, tier, 'AdminBusinesses single tier change');
      // R4F-4-APPLY: fail-soft admin-override email to business owner.
      try {
        const biz = businesses.find((b: { id: string }) => b.id === id) as
          | { id: string; user_id?: string | null; name_ar?: string | null; name_en?: string | null; membership_tier?: string | null }
          | undefined;
        const ownerUserId = biz?.user_id ?? null;
        if (ownerUserId && result?.subscription_id) {
          const { data: profile } = await getProfileByUserId<{ email: string | null; full_name: string | null }>({
            userId: ownerUserId,
            select: 'email, full_name',
          });
          if (profile?.email) {
            await sendTransactionalEmail({
              templateName: 'membership-tier-changed-by-admin',
              recipientEmail: profile.email as string,
              idempotencyKey: `membership-tier-admin-override-${result.subscription_id}-${tier}`,
              templateData: {
                recipientName: (profile.full_name as string | null) ?? undefined,
                businessName: biz?.name_ar || biz?.name_en || undefined,
                oldTier: biz?.membership_tier ?? undefined,
                newTier: tier,
              },
            });
          }
        }
      } catch (err) {
         
        console.warn('[AdminBusinesses] tier-change email failed', err);
      }
      // SERVICE-ACTIVATION-GOVERNANCE-4 — single summary in-app notification
      // to the provider owner if their tier change gates any services.
      try {
        await notifyMembershipChangeForBusiness(id, tier as MembershipTier);
      } catch {
        /* never block tier change */
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(pickBi(isRTL, 'تم تغيير العضوية', 'Tier updated'));
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل تغيير العضوية', 'Tier change failed'))),
  });

  const updateBizMutation = useMutation({
    mutationFn: async () => {
      const id = editingBiz.id;
      const payload: any = {
        name_ar: editForm.name_ar, name_en: editForm.name_en || null,
        short_description_ar: editForm.short_description_ar || null, short_description_en: editForm.short_description_en || null,
        description_ar: editForm.description_ar || null, description_en: editForm.description_en || null,
        phone: editForm.phone || null, email: editForm.email || null, website: editForm.website || null,
        address: editForm.address || null, national_id: editForm.national_id || null,
        additional_number: editForm.additional_number || null, region: editForm.region || null,
        district: editForm.district || null, street_name: editForm.street_name || null,
        building_number: editForm.building_number || null, latitude: editForm.latitude || null,
        longitude: editForm.longitude || null,
        // Phase 5: category_id intentionally NOT written from admin edit.
        // Classification is managed via BusinessTaxonomySection (taxonomy-only).
        country_id: editForm.country_id || null, city_id: editForm.city_id || null,
        logo_url: editForm.logo_url || null, cover_url: editForm.cover_url || null,
        // Phase 2.2 image-pipeline link columns (admin edit). Null-safe.
        logo_image_asset_id: (editForm as any).logo_image_asset_id || null,
        cover_image_asset_id: (editForm as any).cover_image_asset_id || null,
        logo_image_variants: (editForm as any).logo_image_variants || null,
        cover_image_variants: (editForm as any).cover_image_variants || null,
        seo_title_ar: editForm.seo_title_ar || null, seo_title_en: editForm.seo_title_en || null,
        seo_description_ar: editForm.seo_description_ar || null, seo_description_en: editForm.seo_description_en || null,
        seo_keywords: String(editForm.seo_keywords || '').split(',').map(k => k.trim()).filter(Boolean),
        og_image: editForm.og_image || null,
        unified_number: editForm.unified_number || null, contact_person: editForm.contact_person || null,
        mobile: editForm.mobile || null, customer_service_phone: editForm.customer_service_phone || null,
        region_en: editForm.region_en || null, district_en: editForm.district_en || null,
        street_name_en: editForm.street_name_en || null, address_en: editForm.address_en || null,
        // R4E-2C-4-PHASE-3: membership_tier no longer written from the edit
        // form. Use the row tier picker (routes through admin RPC).
        // R4E-3: is_active / is_verified are no longer bagged in the generic
        // profile payload — they flip through setBusinessActive /
        // setBusinessVerified guarded wrappers below.
      };
      const { error } = await updateBusinessById({ id, values: payload });
      if (error) throw error;
      // R4E-3: detect sensitive toggles and apply them through guarded wrappers.
      const activeChanged = typeof editForm.is_active === 'boolean'
        && editForm.is_active !== editingBiz.is_active;
      const verifiedChanged = typeof editForm.is_verified === 'boolean'
        && editForm.is_verified !== editingBiz.is_verified;
      if (activeChanged) await setBusinessActive(id, editForm.is_active);
      if (verifiedChanged) await setBusinessVerified(id, editForm.is_verified);
      const fields = Object.keys(payload);
      if (activeChanged) fields.push('is_active');
      if (verifiedChanged) fields.push('is_verified');
      await logAction('business_updated', id, { fields });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(pickBi(isRTL, 'تم حفظ التعديلات', 'Changes saved'));
      setEditingBiz(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ─── Resolve owner (email OR USR-XXXXX ref_id) → user_id ─── */
  const resolveOwner = useCallback(async () => {
    const q = (createForm.owner_query || '').trim();
    if (!q) return;
    setCreateForm((f: any) => ({ ...f, resolving_owner: true, owner_error: '', resolved_user_id: '', resolved_owner_label: '' }));
    try {
      let userId: string | null = null;
      let label = '';
      if (q.includes('@')) {
        const { data, error } = await getProfileByEmail<{ user_id: string; full_name: string | null; ref_id: string | null }>({
          email: q.toLowerCase(),
          select: 'user_id, full_name, ref_id',
        });
        if (error) throw error;
        if (data) { userId = data.user_id; label = `${data.full_name ?? ''} (${data.ref_id ?? ''})`.trim(); }
      } else {
        const ref = q.toUpperCase();
        const { data, error } = await getProfileByRefId<{
          user_id: string; full_name: string | null; ref_id: string | null; email: string | null;
        }>({ refId: ref, select: 'user_id, full_name, ref_id, email' });
        if (error) throw error;
        if (data) { userId = data.user_id as string; label = `${data.full_name ?? ''} (${data.email ?? ''})`.trim(); }
      }
      if (!userId) {
        setCreateForm((f: any) => ({ ...f, resolving_owner: false, owner_error: pickBi(isRTL, 'لم يتم العثور على المستخدم', 'User not found') }));
        return;
      }
      setCreateForm((f: any) => ({ ...f, resolving_owner: false, resolved_user_id: userId!, resolved_owner_label: label }));
    } catch (e) {
      setCreateForm((f: any) => ({
        ...f,
        resolving_owner: false,
        owner_error: e instanceof Error ? e.message : (pickBi(isRTL, 'فشل البحث', 'Lookup failed')),
      }));
    }
  }, [createForm.owner_query, isRTL]);

  /* ─── Live owner search (autocomplete) ─── */
  useEffect(() => {
    if (!creatingBiz) return;
    const q = (createForm.owner_query || '').trim();
    if (q.length < 2) { setOwnerResults([]); setOwnerSearching(false); return; }
    if (createForm.resolved_user_id) return; // already picked
    setOwnerSearching(true);
    const handle = setTimeout(async () => {
      try {
        const like = `%${q.replace(/[%,]/g, '')}%`;
        const upper = q.toUpperCase();
        const lower = q.toLowerCase();
        const orParts = [
          `full_name.ilike.${like}`,
          `full_name_ar.ilike.${like}`,
          `full_name_en.ilike.${like}`,
          `email.ilike.${like}`,
          `username.ilike.${like}`,
          `ref_id.ilike.%${upper}%`,
        ].join(',');
        const { data, error } = await searchProfilesByOr<Record<string, unknown>>({
          or: orParts,
          select: 'user_id, full_name, full_name_ar, full_name_en, email, username, ref_id, avatar_url',
          limit: 8,
        });
        if (error) throw error;
        // Promote exact email/username/ref_id match to top
        const rows = (data || []) as any[];
        rows.sort((a, b) => {
          const ax = (a.email === lower || a.username === lower || a.ref_id === upper) ? 0 : 1;
          const bx = (b.email === lower || b.username === lower || b.ref_id === upper) ? 0 : 1;
          return ax - bx;
        });
        setOwnerResults(rows);
        setOwnerOpen(true);
      } catch {
        setOwnerResults([]);
      } finally {
        setOwnerSearching(false);
      }
    }, 280);
    return () => clearTimeout(handle);
  }, [createForm.owner_query, createForm.resolved_user_id, creatingBiz]);

  /* ─── Create business mutation ─── */
  const createBizMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.username || !createForm.username_ok) {
        throw new Error(pickBi(isRTL, 'اسم المستخدم غير صالح أو محجوز', 'Username is invalid or taken'));
      }
      if (!createForm.name_ar?.trim()) {
        throw new Error(pickBi(isRTL, 'الاسم بالعربية مطلوب', 'Arabic name is required'));
      }
      const phoneE164 = createForm.phone_national
        ? toE164({ countryCode: createForm.phone_cc || '+966', national: createForm.phone_national })
        : null;
      const region = SA_REGIONS.find((r) => r.id === createForm.region_id);
      const ownerMode = (createForm.owner_mode || 'placeholder') as 'placeholder' | 'existing' | 'new' | 'invite';

      // Shared business payload used by both code paths
      const bizCore: AdminCreateBusinessPayload = {
        username: createForm.username.trim().toLowerCase(),
        name_ar: createForm.name_ar.trim(),
        name_en: createForm.name_en?.trim() || null,
        phone: phoneE164 || null,
        email: createForm.email?.trim() || null,
        // Phase 18i: legacy `category_id` column dropped. Classification is
        // managed taxonomy-only via BusinessTaxonomySection in edit view.
        city_id: createForm.city_id || null,
        region: region ? region.name_ar : null,
        region_en: region ? region.name_en : null,
        national_id: createForm.national_id?.trim() || null,
        unified_number: createForm.unified_number?.trim() || null,
        vat_number: createForm.vat_number?.trim() || null,
        district: createForm.district?.trim() || null,
        district_en: createForm.district_en?.trim() || null,
        street_name: createForm.street_name?.trim() || null,
        street_name_en: createForm.street_name_en?.trim() || null,
        building_number: createForm.building_number?.trim() || null,
        additional_number: createForm.additional_number?.trim() || null,
        address: createForm.address?.trim() || null,
        address_en: createForm.address_en?.trim() || null,
      };

      // Path A — Use the edge function for placeholder / new / invite modes.
      // Placeholder mode links the entity to the shared com@qitaat.com account
      // and flags it as transferable. The entity can later be claimed by its
      // real owner via a transfer request that an admin must approve.
      if (ownerMode === 'placeholder' || ownerMode === 'new' || ownerMode === 'invite') {
        if (ownerMode !== 'placeholder') {
        const email = (createForm.owner_email || '').trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error(pickBi(isRTL, 'بريد المسؤول غير صالح', 'Invalid manager email'));
        }
        if (ownerMode === 'new' && (createForm.owner_password || '').length < 8) {
          throw new Error(pickBi(isRTL, 'كلمة المرور يجب ألا تقل عن 8 أحرف', 'Password must be at least 8 characters'));
        }
        }
        const ownerEmail = ownerMode === 'placeholder'
          ? undefined
          : (createForm.owner_email || '').trim().toLowerCase();
        const res = await adminCreateBusinessWithOwner({
          owner: {
            mode: ownerMode,
            email: ownerEmail,
            password: ownerMode === 'new' ? createForm.owner_password : undefined,
            full_name: (createForm.owner_full_name || createForm.name_ar || '').trim(),
            phone: (createForm.owner_phone || '').trim() || undefined,
            position: (createForm.owner_position || '').trim() || undefined,
            auto_confirm: true,
          },
          business: bizCore,
          redirect_to: `${window.location.origin}/auth/reset-password`,
        });
        if (!res.success || !res.business) {
          throw new Error(res.error || (pickBi(isRTL, 'فشل الإنشاء', 'Create failed')));
        }
        return res.business as unknown as Record<string, unknown>;
      }

      // Path B — Existing user (default). An owner MUST be explicitly picked;
      // we never fall back to the current admin because super_admin / admin
      // accounts are blocked by DB trigger from owning business entities.
      const ownerId = createForm.resolved_user_id;
      if (!ownerId) {
        throw new Error('owner_id_or_ref_required');
      }
      const payload: Record<string, unknown> = {
        ...bizCore,
        user_id: ownerId,
        approval_status: 'approved',
        is_active: true,
      };
      // Mirror admin_update_business_approval: when an admin creates an
      // already-approved business with a username, auto-activate the
      // public profile (username_status + is_verified) in the same insert
      // so the /<username> page is reachable immediately.
      if (typeof payload.username === 'string' && payload.username.trim() !== '') {
        payload.username_status = 'approved';
        payload.is_verified = true;
      }
      const { data, error } = await insertBusiness({
        payload,
        select: '*',
        terminal: 'single',
      });
      if (error) throw error;
      await logAction('business_created', (data as { id?: string } | null)?.id ?? '', { username: payload.username });
      return data as Record<string, unknown>;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      const mode = createForm.owner_mode;
      toast.success(
        isRTL
          ? mode === 'placeholder'
            ? 'تم إنشاء المنشأة تحت الحساب المؤقت — قابلة للتحويل لاحقاً'
            : mode === 'invite'
            ? 'تم إنشاء المنشأة وإرسال دعوة للمسؤول'
            : mode === 'new'
            ? 'تم إنشاء المنشأة وحساب المسؤول'
            : 'تم إنشاء المنشأة'
          : mode === 'placeholder'
          ? 'Entity created under the placeholder account — transferable later'
          : mode === 'invite'
          ? 'Business created — invitation sent to manager'
          : mode === 'new'
          ? 'Business and manager account created'
          : 'Business created',
      );
      setCreatingBiz(false);
      setCreateForm(emptyCreateForm());
      if (row) openEdit(row);
    },
    onError: (err: unknown) => {
      // Map stable edge-function codes → friendly localized text. We never
      // surface raw server strings to admins; unknown codes fall back to the
      // generic bucket inside `mapAdminCreateBizError`.
      const raw = err instanceof Error ? err.message : '';
      const msg = mapAdminCreateBizError(raw, pickBi(isRTL, 'ar', 'en'));
      const isInvalidMode = raw.includes('invalid_owner_mode');
      toast.error(
        pickBi(isRTL, 'فشل إنشاء المنشأة', 'Failed to create business'),
        {
          description: msg,
          ...(isInvalidMode
            ? {
                action: {
                  label: pickBi(isRTL, 'تحويل إلى "بدون مدير"', 'Switch to "No manager"'),
                  onClick: () => {
                    setCreateForm((f) => ({ ...f, owner_mode: 'placeholder' }));
                  },
                },
                duration: 10000,
              }
            : {}),
        },
      );
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      // SERVICE-ACTIVATION-GOVERNANCE-FINAL — never write `is_active`
      // through catalog mutations. Insert with DB defaults, then route
      // any "create as paused" intent through the canonical
      // providerServices setter so provider_status + is_active stay
      // aligned.
      const { data: inserted, error } = await insertBusinessServiceReturning<{ id: string }>({
        business_id: servicesPanel!,
        name_ar: newService.name_ar,
        name_en: newService.name_en || null,
        description_ar: newService.description_ar || null,
        description_en: newService.description_en || null,
        price_from: newService.price_from ? parseFloat(newService.price_from) : null,
        price_to: newService.price_to ? parseFloat(newService.price_to) : null,
      });
      if (error) throw error;
      if (!newService.is_active && inserted?.id) {
        await setProviderServiceStatus({ serviceRowId: inserted.id, status: 'paused' });
      }
      // Keep the catalog wrapper referenced for tree-shaking visibility
      // even when no fields beyond core are routed through it here.
      void insertBusinessService;
    },
    onSuccess: () => {
      refetchServices();
      setNewService({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });
      toast.success(pickBi(isRTL, 'تمت إضافة الخدمة', 'Service added'));
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // SERVICE-ACTIVATION-GOVERNANCE-FINAL — provider activation toggle
      // must go through the canonical module (mirrors provider_status).
      await setProviderServiceStatus({
        serviceRowId: id,
        status: is_active ? 'active' : 'paused',
      });
      // Keep reference for tree-shaking parity with prior callsite.
      void updateBusinessServiceById;
    },
    onSuccess: () => refetchServices(),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteBusinessServiceById(id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchServices();
      toast.success(pickBi(isRTL, 'تم الحذف', 'Deleted'));
    },
  });

  const addPortfolioMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from('portfolio_items').insert({
        business_id: editingBiz.id, title_ar: 'صورة', media_url: url, media_type: 'image',
      } as any);
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
    branch_type: 'branch' as 'main' | 'branch' | 'warehouse' | 'admin_office' | 'regional_office' | 'head_office',
    contact_person: '', phone: '', mobile: '', unified_number: '', customer_service_phone: '',
    email: '', website: '',
    country_id: '', city_id: '', region: '', district: '', street_name: '',
    building_number: '', national_id: '', additional_number: '', address: '',
    latitude: '', longitude: '',
  });

  const saveBranchMutation = useMutation({
    mutationFn: async () => {
      if (!branchForm || !editingBiz) return;
      const wantsMain = !!branchForm.is_main;
      const payload: any = {
        business_id: editingBiz.id,
        name_ar: branchForm.name_ar, name_en: branchForm.name_en || null,
        is_active: branchForm.is_active,
        branch_type: branchForm.branch_type || 'branch',
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
      let targetBranchId = editingBranchId as string | null;
      if (editingBranchId) {
        const { error } = await updateBusinessBranchById(editingBranchId, payload);
        if (error) throw error;
      } else {
        // Insert without is_main; if wantsMain we promote via RPC below.
        const { data, error } = await insertBusinessBranchReturning(payload, 'id', 'single');
        if (error) throw error;
        targetBranchId = (data as unknown as { id: string } | null)?.id ?? null;
      }
      if (wantsMain && targetBranchId) {
        // Atomic swap: clears previous main + sets this one in a single transaction.
        const { error: mainErr } = await setMainBranch(targetBranchId);
        if (mainErr) throw mainErr;
      }
    },
    onSuccess: () => {
      refetchBranches();
      setBranchForm(null);
      setEditingBranchId(null);
      toast.success(pickBi(isRTL, 'تم حفظ الفرع', 'Branch saved'));
    },
    onError: (err: Error) => {
      const mapped = parseMembershipLimitError(err, isRTL);
      toast.error(mapped?.message ?? err.message);
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteBusinessBranchById(id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchBranches();
      toast.success(pickBi(isRTL, 'تم حذف الفرع', 'Branch deleted'));
    },
  });

  const toggleBranchMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await updateBusinessBranchById(id, { is_active });
      if (error) throw error;
    },
    onSuccess: () => refetchBranches(),
    onError: (err: Error) => {
      const mapped = parseMembershipLimitError(err, isRTL);
      toast.error(mapped?.message ?? err.message);
    },
  });

  /* ─── Realtime ─── */
  useEffect(() => {
    const ch = supabase
      .channel('admin-businesses-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  /* ─── Bulk mutation ─── */
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: { is_active?: boolean; is_verified?: boolean } }) => {
      // R4E-3: bulk sensitive toggles route through guarded wrappers only.
      if ('is_active' in patch && typeof patch.is_active === 'boolean') {
        await bulkSetBusinessesActive(ids, patch.is_active);
      } else if ('is_verified' in patch && typeof patch.is_verified === 'boolean') {
        await bulkSetBusinessesVerified(ids, patch.is_verified);
      } else {
        throw new Error('Unsupported bulk patch');
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(isRTL ? `تم تحديث ${vars.ids.length} عنصر` : `Updated ${vars.ids.length} item(s)`);
      clearSelected();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل التحديث', 'Update failed'))),
  });

  /* ─── AI auto-translate missing field (single business) ─── */
  const [autoTranslating, setAutoTranslating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Hold the latest filtered list so keyboard shortcut `e` can export the
  // current view without forcing the listener to re-bind on every change.
  const filteredRef = useRef<unknown[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingBiz(null); setServicesPanel(null);
        setCreateForm(emptyCreateForm()); setCreatingBiz(true);
        scrollToTop();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        refetchBusinesses();
        toast.success(pickBi(isRTL, 'تم التحديث', 'Refreshed'));
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        exportCSV(filteredRef.current as any[], language);
      }
      if (e.key === 'Escape') {
        if (editingBiz) setEditingBiz(null);
        else if (servicesPanel) setServicesPanel(null);
        else if (selected.size) clearSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingBiz, servicesPanel, selected.size, refetchBusinesses, isRTL, language]);
  const autoFillTranslations = useCallback(async () => {
    if (!editingBiz) return;
    setAutoTranslating(true);
    try {
      const fields: Array<{ key: string; from: 'ar' | 'en'; to: 'ar' | 'en' }> = [];
      const pairs: Array<[string, string]> = [
        ['name_ar', 'name_en'],
        ['short_description_ar', 'short_description_en'],
        ['description_ar', 'description_en'],
      ];
      for (const [ar, en] of pairs) {
        if ((editForm[ar] || '').trim() && !(editForm[en] || '').trim()) fields.push({ key: en, from: 'ar', to: 'en' });
        else if ((editForm[en] || '').trim() && !(editForm[ar] || '').trim()) fields.push({ key: ar, from: 'en', to: 'ar' });
      }
      if (fields.length === 0) { toast.info(pickBi(isRTL, 'كل الحقول مكتملة', 'All fields complete')); return; }
      let done = 0;
      for (const f of fields) {
        const sourceKey = f.to === 'en' ? f.key.replace('_en', '_ar') : f.key.replace('_ar', '_en');
        const text = editForm[sourceKey] as string;
        const { data, error } = await invokeBlogAiTools({
          action: 'translate',
          text,
          sourceLang: f.from,
          targetLang: f.to,
        });
        if (error) throw error;
        const translated = ((data as { result?: string } | null)?.result || '').trim();
        if (translated) { setField(f.key, translated); done += 1; }
      }
      toast.success(isRTL ? `تمت ترجمة ${done} حقل` : `Translated ${done} field(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشلت الترجمة التلقائية', 'Auto-translate failed')));
    } finally { setAutoTranslating(false); }
  }, [editingBiz, editForm, isRTL, setField]);

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

  // Saudi National Address — short-address autofill (central microservice)
  const [shortAddress, setShortAddress] = useState('');
  const [splBusy, setSplBusy] = useState(false);
  const handleShortAddressLookup = async () => {
    const code = shortAddress.trim();
    if (!code) return;
    setSplBusy(true);
    try {
      const { data, error } = await nationalAddressLookup({ shortAddress: code });
      if (error) throw error;
      const res = data as {
        ok: boolean; message_ar?: string; message_en?: string;
        address?: {
          region_ar: string | null; region_en: string | null;
          city_ar: string | null;   city_en: string | null;
          district_ar: string | null; district_en: string | null;
          street_ar: string | null;   street_en: string | null;
          address_ar: string | null;  address_en: string | null;
          building_number: string | null; additional_number: string | null;
          post_code: string | null;
        };
      };
      if (!res?.ok || !res.address) {
        toast.error(isRTL ? (res?.message_ar ?? 'تعذّر جلب العنوان') : (res?.message_en ?? 'Lookup failed'));
        return;
      }
      const a = res.address;
      setEditForm((prev: any) => ({
        ...prev,
        national_id: code,
        region: a.region_ar ?? prev.region,
        region_en: a.region_en ?? prev.region_en,
        district: a.district_ar ?? prev.district,
        district_en: a.district_en ?? prev.district_en,
        street_name: a.street_ar ?? prev.street_name,
        street_name_en: a.street_en ?? prev.street_name_en,
        address: a.address_ar ?? prev.address,
        address_en: a.address_en ?? prev.address_en,
        building_number: a.building_number ?? prev.building_number,
        additional_number: a.additional_number ?? prev.additional_number,
      }));
      toast.success(pickBi(isRTL, 'تم جلب العنوان وتعبئة الحقول', 'Address fetched'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل البحث', 'Lookup failed')));
    } finally {
      setSplBusy(false);
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
      address: biz.address || '',
      country_id: biz.country_id || '', city_id: biz.city_id || '',
      logo_url: biz.logo_url || '', cover_url: biz.cover_url || '',
      logo_image_asset_id: (biz as any).logo_image_asset_id || null,
      cover_image_asset_id: (biz as any).cover_image_asset_id || null,
      logo_image_variants: (biz as any).logo_image_variants || null,
      cover_image_variants: (biz as any).cover_image_variants || null,
      seo_title_ar: biz.seo_title_ar || '', seo_title_en: biz.seo_title_en || '',
      seo_description_ar: biz.seo_description_ar || '', seo_description_en: biz.seo_description_en || '',
      seo_keywords: Array.isArray(biz.seo_keywords) ? biz.seo_keywords.join(', ') : '',
      og_image: biz.og_image || '',
      national_id: biz.national_id || '', additional_number: biz.additional_number || '',
      region: biz.region || '', district: biz.district || '',
      street_name: biz.street_name || '', building_number: biz.building_number || '',
      region_en: biz.region_en || '', district_en: biz.district_en || '',
      street_name_en: biz.street_name_en || '', address_en: biz.address_en || '',
      // Derive canonical region_id from the stored Arabic/English region label
      // so the unified RegionCitySelector hydrates correctly on edit.
      region_id: (findRegionByLabel(
        (biz.region as string | null) ?? (biz.region_en as string | null),
      ) ?? '') as SaRegionId | '',
      latitude: biz.latitude || '', longitude: biz.longitude || '',
      unified_number: biz.unified_number || '', contact_person: biz.contact_person || '',
      mobile: biz.mobile || '', customer_service_phone: biz.customer_service_phone || '',
      is_active: biz.is_active, is_verified: biz.is_verified,
      membership_tier: biz.membership_tier,
    });
    setEditingBiz(biz);
    scrollToTop();
  };

  const openServices = (bizId: string) => {
    setEditingBiz(null);
    setServicesPanel(bizId);
    scrollToTop();
  };

  /* ─── Filters ─── */
  const translationCompleteness = useCallback((b: Record<string, any>) => {
    const ar = !!(b.name_ar && b.short_description_ar && b.description_ar);
    const en = !!(b.name_en && b.short_description_en && b.description_en);
    return { ar, en, full: ar && en };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = businesses.filter((b) => {
      const matchSearch = !q ||
        b.name_ar?.toLowerCase().includes(q) || b.name_en?.toLowerCase().includes(q) ||
        b.username?.toLowerCase().includes(q) || b.ref_id?.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) || b.phone?.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'verified' && b.is_verified) ||
        (filterStatus === 'unverified' && !b.is_verified) ||
        (filterStatus === 'inactive' && !b.is_active) ||
        (filterStatus === 'contract' && contractBusinessIds.includes(b.id));
      const matchTier = selectedTiers.length === 0 || selectedTiers.includes(b.membership_tier);
      const matchOrigin = filterOrigin === 'all'
        || (filterOrigin === 'demo' && b.is_demo === true)
        || (filterOrigin === 'production' && !b.is_demo);
      const tc = translationCompleteness(b);
      const matchTrans = filterTranslation === 'all'
        || (filterTranslation === 'missing_en' && !tc.en)
        || (filterTranslation === 'missing_ar' && !tc.ar)
        || (filterTranslation === 'complete' && tc.full);
      return matchSearch && matchStatus && matchTier && matchTrans && matchOrigin;
    });
    const tierRank: Record<string, number> = { enterprise: 0, premium: 1, basic: 2, free: 3 };
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return (b.rating_avg || 0) - (a.rating_avg || 0);
        case 'name': {
          const an = (language === 'ar' ? a.name_ar : (a.name_en || a.name_ar)) || '';
          const bn = (language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)) || '';
          return an.localeCompare(bn, language === 'ar' ? 'ar' : 'en');
        }
        case 'tier': return (tierRank[a.membership_tier] ?? 9) - (tierRank[b.membership_tier] ?? 9);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return arr;
  }, [businesses, search, filterStatus, selectedTiers, filterTranslation, filterOrigin, sortBy, language, contractBusinessIds, translationCompleteness]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Keep the keyboard-export ref pointed at the latest filtered list.
  useEffect(() => { filteredRef.current = filtered; }, [filtered]);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paged = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage]);
  const allPagedSelected = paged.length > 0 && paged.every(b => selected.has(b.id));
  const togglePageAll = () => {
    setSelected(s => {
      const n = new Set(s);
      if (allPagedSelected) paged.forEach(b => n.delete(b.id));
      else paged.forEach(b => n.add(b.id));
      return n;
    });
  };

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
  const editCityName = cities.find((c) => c.id === editForm.city_id);

  /* ─── Saved Views (per-admin localStorage) ─── */
  type BizViewFilters = {
    q: string; status: string; tier: string; translation: string; origin: string; sort: string;
  };
  const savedViews = useAdminSavedViews<BizViewFilters>('admin.businesses');

  if (!isAdmin) return null;

  const currentViewFilters: BizViewFilters = {
    q: search,
    status: filterStatus,
    tier: filterTier,
    translation: filterTranslation,
    origin: filterOrigin,
    sort: sortBy,
  };
  const applySavedView = (f: BizViewFilters) => {
    const sp = new URLSearchParams();
    if (f.q) sp.set('q', f.q);
    if (f.status && f.status !== 'all') sp.set('status', f.status);
    if (f.tier && f.tier !== 'all') sp.set('tier', f.tier);
    if (f.translation && f.translation !== 'all') sp.set('translation', f.translation);
    if (f.origin && f.origin !== 'all') sp.set('origin', f.origin);
    if (f.sort && f.sort !== 'recent') sp.set('sort', f.sort);
    setSearchInput(f.q || '');
    setSearchParams(sp, { replace: false });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
        <AdminPageHeader
          tone="accent"
          icon={Building2}
          eyebrow={pickBi(isRTL, 'لوحة الإدارة', 'Admin Console')}
          breadcrumbs={[
            { label: pickBi(isRTL, 'الإدارة', 'Admin'), href: '/admin' },
            { label: pickBi(isRTL, 'إدارة الأعمال', 'Business Management') },
          ]}
          title={pickBi(isRTL, 'إدارة الأعمال والمنشآت', 'Business Management')}
          subtitle={panelOpen ? undefined : (
            isRTL
              ? `${stats.total} منشأة مسجلة • تحكم كامل في الملفات والخدمات والفروع والعضويات`
              : `${stats.total} registered businesses • Full control of profiles, services, branches & memberships`
          )}
          actions={
            <>
              <div className="flex bg-muted/40 border border-border/40 rounded-xl overflow-hidden p-0.5">
                <button
                  type="button"
                  aria-label={pickBi(isRTL, 'عرض بطاقات', 'Card view')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={pickBi(isRTL, 'عرض جدول', 'Table view')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs gap-1.5 rounded-xl"
                onClick={() => { refetchBusinesses(); toast.success(pickBi(isRTL, 'تم التحديث', 'Refreshed')); }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{pickBi(isRTL, 'تحديث', 'Refresh')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs gap-1.5 rounded-xl"
                onClick={() => exportCSV(filtered, language)}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{pickBi(isRTL, 'تصدير CSV', 'Export CSV')}</span>
              </Button>
              <SavedViewsMenu
                views={savedViews.views}
                currentFilters={currentViewFilters}
                onApply={applySavedView}
                onSave={savedViews.save}
                onRemove={savedViews.remove}
              />
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 text-xs gap-1.5 rounded-xl"
              >
                <Link to="/admin/provider-review">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{pickBi(isRTL, 'مراجعة المزودين', 'Provider Review')}</span>
                </Link>
              </Button>
              <Button
                size="sm"
                className="h-10 text-xs gap-1.5 rounded-xl"
                onClick={() => { setEditingBiz(null); setServicesPanel(null); setCreateForm(emptyCreateForm()); setCreatingBiz(true); scrollToTop(); }}
              >
                <Plus className="w-3.5 h-3.5" />
                {pickBi(isRTL, 'منشأة جديدة', 'New Business')}
              </Button>
            </>
          }
          kpiSlot={panelOpen ? undefined : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <AdminKpiCard
                label={pickBi(isRTL, 'إجمالي المنشآت', 'Total Businesses')}
                value={stats.total}
                icon={Building2}
                tone="primary"
              />
              <AdminKpiCard
                label={pickBi(isRTL, 'نشطة', 'Active')}
                value={stats.active}
                icon={Activity}
                tone="success"
                trend={stats.total ? `${Math.round((stats.active / stats.total) * 100)}%` : undefined}
              />
              <AdminKpiCard
                label={pickBi(isRTL, 'موثّقة', 'Verified')}
                value={stats.verified}
                icon={Shield}
                tone="info"
              />
              <AdminKpiCard
                label={pickBi(isRTL, 'بعقود فعّالة', 'With Contracts')}
                value={stats.contracts}
                icon={FileText}
                tone="accent"
              />
              <AdminKpiCard
                label={pickBi(isRTL, 'مميّز / مؤسسات', 'Premium / Enterprise')}
                value={stats.premium}
                icon={Crown}
                tone="secondary"
              />
            </div>
          )}
        />

        {!panelOpen && <UnifiedApprovalsCenterBanner />}

        {/* ─── Filters ─── */}
        {!panelOpen && <BusinessFiltersToolbar
          searchInputRef={searchRef}
          searchInput={searchInput}
          search={search}
          onSearchInput={(v) => startTransition(() => setSearchInput(v))}
          onClearSearch={() => { setSearchInput(''); updateParam({ q: null }); }}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          selectedTiers={selectedTiers}
          onToggleTier={toggleTier}
          onClearTiers={clearTiers}
          filterTranslation={filterTranslation}
          onTranslationChange={(v) => updateParam({ translation: v === 'all' ? null : v, page: null })}
          filterOrigin={filterOrigin}
          setFilterOrigin={setFilterOrigin}
          sortBy={sortBy}
          setSortBy={setSortBy}
          tiers={tiers}
          language={language === 'ar' ? 'ar' : 'en'}
          isRTL={isRTL}
          resultsCount={filtered.length}
          onClearAll={() => { setSearchInput(''); setSearchParams(new URLSearchParams(), { replace: false }); }}
          tierDistribution={tierDistribution}
          totalCount={stats.total}
        />}

        {!panelOpen && <BusinessBulkActionBar
          count={selected.size}
          language={language === 'ar' ? 'ar' : 'en'}
          isRTL={isRTL}
          tiers={tiers}
          onSetActive={(active) => bulkMutation.mutate({ ids: [...selected], patch: { is_active: active } })}
          onSetVerified={(verified) => bulkMutation.mutate({ ids: [...selected], patch: { is_verified: verified } })}
          onChangeTier={async (v) => {
            // R4E-2C-4-PHASE-3: bulk tier change goes per-business through
            // membership-owned RPC. No batch RPC yet; use Promise.allSettled.
            const ids = [...selected];
            const results = await Promise.allSettled(
              ids.map((id) =>
                setBusinessMembershipTier(id, v as MembershipTier, 'AdminBusinesses bulk tier change'),
              ),
            );
            const ok = results.filter((r) => r.status === 'fulfilled').length;
            const fail = results.length - ok;
            queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
            if (fail === 0) {
              toast.success(isRTL ? `تم تحديث ${ok}` : `Updated ${ok}`);
            } else {
              toast.error(isRTL ? `نجح ${ok}، فشل ${fail}` : `Succeeded ${ok}, failed ${fail}`);
            }
            clearSelected();
          }}
          onClear={clearSelected}
        />}

        {/* ─── Inline Create Panel ─── */}
        {creatingBiz && (
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">{pickBi(isRTL, 'إضافة منشأة / جهة جديدة', 'Add new entity (company / organization)')}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {pickBi(isRTL, 'مخصّص للشركات والمؤسسات والجهات الحكومية والخاصة. اختر المسؤول/المالك من المستخدمين ثم أدخل البيانات الرسمية للمنشأة (السجل التجاري، الرقم الموحّد، الضريبة… تُكمل لاحقاً).', 'For companies, foundations, and public/private entities. Pick a responsible owner, then enter the entity\'s official data (CR, unified number, VAT… can be completed later).')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setCreatingBiz(false); setCreateForm(emptyCreateForm()); }} className="rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* ─── Section 1: Owner picker (existing user) ─── */}
              <div className="rounded-xl border border-info/30 bg-info/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-info" />
                  <Label className="text-xs font-semibold">
                    {pickBi(isRTL, '1) المدير / المسؤول للمنشأة', '1) Entity manager / responsible person')}
                  </Label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                    {pickBi(isRTL, 'اختياري', 'Optional')}
                  </span>
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                  {pickBi(isRTL, 'الافتراضي "بدون مدير" — تُربط المنشأة بالحساب المؤقت (com@qitaat.com) ويمكن لمالكها الحقيقي لاحقاً طلب نقل الملكية بموافقة الادمن. أو اختر مستخدماً موجوداً، أنشئ حساباً، أو أرسل دعوة بالبريد.', 'Default is "No manager" — the entity is linked to the placeholder account (com@qitaat.com); its real owner can later request a transfer that an admin approves. You can also pick an existing user, create an account, or send an email invite.')}
                </p>

                {/* Owner mode tabs (placeholder / existing / new / invite) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl border border-border/40 bg-card p-1">
                  {([
                    { id: 'placeholder', ar: 'بدون مدير', en: 'No manager' },
                    { id: 'existing', ar: 'مستخدم موجود', en: 'Existing user' },
                    { id: 'new',      ar: 'إنشاء حساب', en: 'New account' },
                    { id: 'invite',   ar: 'دعوة بالبريد', en: 'Email invite' },
                  ] as const).map((opt) => {
                    const active = (createForm.owner_mode || 'placeholder') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCField('owner_mode', opt.id)}
                        className={`h-9 rounded-lg text-[11px] font-medium transition-all ${
                          active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        {isRTL ? opt.ar : opt.en}
                      </button>
                    );
                  })}
                </div>

                {/* Mode: Placeholder (no manager — default) */}
                {(createForm.owner_mode || 'placeholder') === 'placeholder' && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-foreground/80">
                    {pickBi(isRTL, 'ستُربط المنشأة بالحساب المؤقت المشترك. عندما يطلب المالك الحقيقي تسلّم منشأته يوافق الادمن لنقل الملكية إليه.', 'The entity will be linked to the shared placeholder account. When the real owner requests it, an admin can approve to transfer ownership.')}
                  </div>
                )}

                {/* Mode: Existing user picker */}
                {createForm.owner_mode === 'existing' && (
                  createForm.resolved_user_id ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-success shrink-0" />
                      <span className="text-xs font-medium truncate">{createForm.resolved_owner_label}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg"
                      onClick={() => setCreateForm((f: any) => ({ ...f, resolved_user_id: '', resolved_owner_label: '', owner_query: '' }))}>
                      <X className="w-3 h-3 me-1" /> {pickBi(isRTL, 'تغيير', 'Change')}
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
                      <Input
                        value={createForm.owner_query}
                        onChange={(e) => { setCField('owner_query', e.target.value); setOwnerOpen(true); }}
                        onFocus={() => setOwnerOpen(true)}
                        placeholder={pickBi(isRTL, 'ابحث بالاسم / البريد / اسم المستخدم / USR-1000001', 'Search by name / email / username / USR-1000001')}
                        className="h-10 rounded-xl ps-9"
                      />
                      {ownerSearching && (
                        <Loader2 className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 end-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {ownerOpen && createForm.owner_query.trim().length >= 2 && (
                      <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
                        {ownerResults.length === 0 && !ownerSearching ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">
                            {pickBi(isRTL, 'لا توجد نتائج مطابقة', 'No matching users')}
                          </div>
                        ) : (
                          ownerResults.map((u) => {
                            // STAB-1G: admin/support row — name → username → "بدون اسم".
                            // ref_id/email remain hidden from the primary display
                            // line; they are already rendered separately below.
                            const displayName = getProfileDisplayName(u, {
                              locale: pickBi(isRTL, 'ar', 'en'),
                              emptyFallback: pickBi(isRTL, 'بدون اسم', 'No name'),
                            });
                            return (
                              <button
                                key={u.user_id}
                                type="button"
                                onClick={() => {
                                  setCreateForm((f: any) => ({
                                    ...f,
                                    resolved_user_id: u.user_id,
                                    resolved_owner_label: `${displayName}${u.ref_id ? ` (${u.ref_id})` : ''}${u.email ? ` · ${u.email}` : ''}`,
                                    owner_error: '',
                                  }));
                                  setOwnerOpen(false);
                                }}
                                className="w-full text-start px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 border-b border-border/40 last:border-0"
                              >
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 overflow-hidden">
                                  {u.avatar_url ? <img src={u.avatar_url} alt="" aria-hidden="true" className="w-full h-full object-cover" loading="lazy" decoding="async"/> : (displayName.charAt(0).toUpperCase())}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium truncate">{displayName}</div>
                                  <div className="text-[10.5px] text-muted-foreground tech-content truncate flex items-center gap-2">
                                    {u.ref_id && <span className="font-mono">{u.ref_id}</span>}
                                    {u.username && <span>· @{u.username}</span>}
                                    {u.email && <span className="truncate">· {u.email}</span>}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                    {createForm.owner_error && (
                      <p className="text-[11px] text-destructive flex items-center gap-1.5 mt-1.5">
                        <AlertTriangle className="w-3 h-3" /> {createForm.owner_error}
                      </p>
                    )}
                  </div>
                ))}

                {/* Mode: Create new account */}
                {createForm.owner_mode === 'new' && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الاسم الكامل للمسؤول', 'Manager full name')}</Label>
                      <Input value={createForm.owner_full_name} onChange={(e) => setCField('owner_full_name', e.target.value)} dir="auto" className="h-10 rounded-xl" placeholder={pickBi(isRTL, 'مثال: محمد العتيبي', 'e.g. Mohammed Al-Otaibi')} />
                    </div>
                    <div>
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'المنصب', 'Position')}</Label>
                      <Input value={createForm.owner_position} onChange={(e) => setCField('owner_position', e.target.value)} dir="auto" className="h-10 rounded-xl" placeholder={pickBi(isRTL, 'مدير عام', 'General Manager')} />
                    </div>
                    <div>
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'البريد (تسجيل الدخول)', 'Email (login)')}</Label>
                      <Input value={createForm.owner_email} onChange={(e) => setCField('owner_email', e.target.value.toLowerCase().trim())} dir="ltr" type="email" className="h-10 rounded-xl tech-content" placeholder="manager@company.com" />
                    </div>
                    <div>
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'كلمة المرور (8+ أحرف)', 'Password (8+ chars)')}</Label>
                      <Input value={createForm.owner_password} onChange={(e) => setCField('owner_password', e.target.value)} dir="ltr" type="text" className="h-10 rounded-xl tech-content" placeholder="Tmp@2026!" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الجوال (اختياري)', 'Mobile (optional)')}</Label>
                      <Input value={createForm.owner_phone} onChange={(e) => setCField('owner_phone', e.target.value)} dir="ltr" className="h-10 rounded-xl tech-content" placeholder="+9665XXXXXXXX" />
                    </div>
                    <p className="sm:col-span-2 text-[10.5px] text-info bg-info/5 border border-info/20 rounded-lg px-3 py-2">
                      {pickBi(isRTL, 'سيتم إنشاء حساب جديد فوراً ببريد وكلمة المرور المُدخلَين، وسيكون هو مالك المنشأة. شارك بيانات الدخول مع المسؤول عبر قناة آمنة.', 'A new account will be created instantly with the email and password provided, and will own this entity. Share login credentials with the manager via a secure channel.')}
                    </p>
                  </div>
                )}

                {/* Mode: Email invite */}
                {createForm.owner_mode === 'invite' && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الاسم الكامل للمسؤول', 'Manager full name')}</Label>
                      <Input value={createForm.owner_full_name} onChange={(e) => setCField('owner_full_name', e.target.value)} dir="auto" className="h-10 rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'المنصب', 'Position')}</Label>
                      <Input value={createForm.owner_position} onChange={(e) => setCField('owner_position', e.target.value)} dir="auto" className="h-10 rounded-xl" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'البريد (سيُرسل عليه رابط التفعيل)', 'Email (activation link will be sent here)')}</Label>
                      <Input value={createForm.owner_email} onChange={(e) => setCField('owner_email', e.target.value.toLowerCase().trim())} dir="ltr" type="email" className="h-10 rounded-xl tech-content" placeholder="manager@company.com" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الجوال (اختياري)', 'Mobile (optional)')}</Label>
                      <Input value={createForm.owner_phone} onChange={(e) => setCField('owner_phone', e.target.value)} dir="ltr" className="h-10 rounded-xl tech-content" placeholder="+9665XXXXXXXX" />
                    </div>
                    <p className="sm:col-span-2 text-[10.5px] text-accent bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
                      {pickBi(isRTL, 'سيتم إنشاء الحساب وإرسال رابط تعيين كلمة المرور للمسؤول على بريده ليُكمل التفعيل بنفسه.', 'The account will be created and a set-password link will be emailed to the manager so they can complete activation themselves.')}
                    </p>
                  </div>
                )}
              </div>

              {/* ─── Section 2: Business data ─── */}
              <div className="flex items-center gap-2 pt-1">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <Label className="text-xs font-semibold">
                  {pickBi(isRTL, '2) البيانات الرسمية للمنشأة', '2) Entity official data')}
                </Label>
                <span className="text-[10.5px] text-muted-foreground">
                  {pickBi(isRTL, '(الاسم التجاري، رقم التواصل الرسمي، وبريد المنشأة — وليست بيانات المالك الشخصية)', '(commercial name, official contact number, and entity email — not the owner\'s personal data)')}
                </span>
              </div>

              {/* Names + username */}
              <BilingualNameField
                value={{
                  full_name_ar: createForm.name_ar,
                  full_name_en: createForm.name_en,
                  username: createForm.username,
                }}
                onChange={(next) => {
                  setCreateForm((f: any) => ({
                    ...f,
                    name_ar: next.full_name_ar,
                    name_en: next.full_name_en,
                    username: next.username || '',
                  }));
                }}
                onUsernameValidChange={(st) => {
                  setCField('username_ok', st.isValid && st.isAvailable);
                }}
                required
                excludeUserId={null}
                subject="entity"
              />

              {/* Contact + classification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PhoneField
                  value={{ countryCode: createForm.phone_cc, national: createForm.phone_national }}
                  onChange={(next) => setCreateForm((f: any) => ({ ...f, phone_cc: next.countryCode, phone_national: next.national }))}
                  label={pickBi(isRTL, 'رقم التواصل الرسمي للمنشأة', 'Official entity contact number')}
                  optional
                />
                <div className="space-y-1.5">
                  <Label className="text-xs">{pickBi(isRTL, 'البريد الرسمي للمنشأة', 'Official entity email')}</Label>
                  <Input
                    value={createForm.email}
                    onChange={(e) => setCField('email', e.target.value)}
                    type="email"
                    placeholder="info@company.com"
                    dir="ltr"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{pickBi(isRTL, 'نشاط/قطاع المنشأة', 'Entity sector / activity')}</Label>
                  <div className="h-10 rounded-xl border border-dashed border-border bg-muted/30 px-3 flex items-center text-[11px] text-muted-foreground">
                    {pickBi(isRTL, 'غير مصنّف — يمكن إضافة التصنيف بعد الإنشاء من تبويب التحرير (التصنيفات المركزية).', 'Unclassified — taxonomy can be added after creation from the edit tab (Central Taxonomy).')}
                  </div>
                </div>
              </div>

              {/* ─── Section 3: Official registry numbers ─── */}
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <Label className="text-xs font-semibold">
                    {pickBi(isRTL, '3) بيانات السجل والأرقام الرسمية', '3) Registry & official numbers')}
                  </Label>
                  <span className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, '(اختياري — يمكن استكمالها لاحقاً)', '(optional — can be completed later)')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{pickBi(isRTL, 'رقم السجل التجاري (CR)', 'Commercial Registration (CR)')}</Label>
                    <Input value={createForm.national_id} onChange={(e) => setCField('national_id', e.target.value)} dir="ltr" placeholder="1010xxxxxx" className="h-10 rounded-xl tech-content" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{pickBi(isRTL, 'الرقم الموحّد (700)', 'Unified number (700)')}</Label>
                    <Input value={createForm.unified_number} onChange={(e) => setCField('unified_number', e.target.value)} dir="ltr" placeholder="7001234567" className="h-10 rounded-xl tech-content" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{pickBi(isRTL, 'الرقم الضريبي (VAT)', 'VAT / Tax number')}</Label>
                    <Input value={createForm.vat_number} onChange={(e) => setCField('vat_number', e.target.value)} dir="ltr" placeholder="3xxxxxxxxxxxxx3" className="h-10 rounded-xl tech-content" />
                  </div>
                </div>
              </div>

              {/* Section 4 (National address) removed — addresses are now managed
                  per-branch from the Branches tab after creating the entity. The
                  main branch (branch_type = 'main') is the source of truth for
                  the business address. */}
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p>
                  {pickBi(
                    isRTL,
                    'العنوان يُدار من تبويب "الفروع" بعد الإنشاء. أضف الفرع الرئيسي (المركز الرئيسي) ثم باقي الفروع/المستودعات/المكاتب الإدارية.',
                    'Address is managed from the "Branches" tab after creation. Add the main branch (headquarters) first, then any branches / warehouses / admin offices.',
                  )}
                </p>
              </div>

              <Separator className="my-2" />
              <div className="flex gap-2">
                <Button
                  onClick={() => createBizMutation.mutate()}
                  disabled={
                    createBizMutation.isPending
                    || !createForm.name_ar?.trim()
                    || !createForm.username
                    || !createForm.username_ok
                  }
                  className="flex-1 gap-1.5 rounded-xl"
                >
                  {createBizMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {pickBi(isRTL, 'إنشاء المنشأة وفتح بيانات السجل للتعديل', 'Create entity & open registry data')}
                </Button>
                <Button variant="outline" onClick={() => { setCreatingBiz(false); setCreateForm(emptyCreateForm()); }} className="rounded-xl">
                  {pickBi(isRTL, 'إلغاء', 'Cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Inline Edit Panel ─── */}
        {editingBiz && (
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">{pickBi(isRTL, 'تعديل العمل', 'Edit Business')}: {editingBiz.name_ar}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{editingBiz.ref_id} · @{editingBiz.username}</span>
                    {contractBusinessIds.includes(editingBiz.id) && (
                      <Badge variant="outline" className="text-[9px] gap-1"><FileText className="w-2.5 h-2.5" />{pickBi(isRTL, 'مرتبط بعقود', 'Has Contracts')}</Badge>
                    )}
                    {(() => {
                      const tc = translationCompleteness(editForm);
                      return (
                        <Badge variant="outline" className={`text-[9px] gap-1 ${tc.full ? 'border-success/40 text-success' : 'border-warning/40 text-warning'}`}>
                          <Languages className="w-2.5 h-2.5" />
                          {tc.full ? (pickBi(isRTL, 'الترجمة مكتملة', 'Bilingual ready'))
                            : (isRTL ? `ينقص: ${[!tc.ar && 'AR', !tc.en && 'EN'].filter(Boolean).join(' · ')}` : `Missing: ${[!tc.ar && 'AR', !tc.en && 'EN'].filter(Boolean).join(' · ')}`)}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl"
                  onClick={autoFillTranslations} disabled={autoTranslating}>
                  {autoTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  {pickBi(isRTL, 'ترجمة تلقائية للناقص', 'Auto-translate missing')}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditingBiz(null)} className="rounded-xl"><X className="w-4 h-4" /></Button>
              </div>
            </div>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full grid grid-cols-9 h-9 rounded-xl">
                  <TabsTrigger value="info" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المعلومات', 'Info')}</TabsTrigger>
                  <TabsTrigger value="owner" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المسؤول', 'Owner')}</TabsTrigger>
                  <TabsTrigger value="content" className="text-[10px] rounded-lg">{pickBi(isRTL, 'المحتوى', 'Content')}</TabsTrigger>
                  <TabsTrigger value="media" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الوسائط', 'Media')}</TabsTrigger>
                  <TabsTrigger value="seo" className="text-[10px] rounded-lg">SEO</TabsTrigger>
                  <TabsTrigger value="contact" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التواصل', 'Contact')}</TabsTrigger>
                  <TabsTrigger value="branches" className="text-[10px] rounded-lg">{pickBi(isRTL, 'الفروع', 'Branches')} <Badge variant="secondary" className="text-[8px] ms-0.5 h-4 px-1">{branches.length}</Badge></TabsTrigger>
                  <TabsTrigger value="controls" className="text-[10px] rounded-lg">{pickBi(isRTL, 'التحكم', 'Controls')}</TabsTrigger>
                  <TabsTrigger value="ops" className="text-[10px] rounded-lg">{pickBi(isRTL, 'العمليات', 'Ops')}</TabsTrigger>
                </TabsList>

                {/* ── Info Tab ── */}
                <TabsContent value="info" className="space-y-4 mt-3">
                  {(() => {
                    const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s || '');
                    const hasLatin = (s: string) => /[A-Za-z]/.test(s || '');
                    const arLooksEn = editForm.name_ar && hasLatin(editForm.name_ar) && !hasArabic(editForm.name_ar);
                    const enLooksAr = editForm.name_en && hasArabic(editForm.name_en) && !hasLatin(editForm.name_en);
                    if (!arLooksEn && !enLooksAr) return null;
                    return (
                      <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300/50">
                        <p className="text-[11px] text-amber-800 dark:text-amber-200">
                          {pickBi(isRTL, 'يبدو أن الاسم العربي والإنجليزي معكوسان.', 'Arabic and English names appear swapped.')}
                        </p>
                        <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] px-2"
                          onClick={() => {
                            const ar = editForm.name_ar; const en = editForm.name_en;
                            setField('name_ar', en); setField('name_en', ar);
                          }}>
                          {pickBi(isRTL, '↔ تبديل', '↔ Swap')}
                        </Button>
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{pickBi(isRTL, 'الاسم (عربي)', 'Name (AR)')} *</Label>
                      <FieldAiActions compact value={editForm.name_ar} lang="ar" isRTL={isRTL} fieldType="title"
                        onTranslated={(v) => setField('name_en', v)} onImproved={(v) => setField('name_ar', v)} />
                    </div>
                     <Input value={editForm.name_ar} onChange={e => setField('name_ar', e.target.value)} dir="auto" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">{pickBi(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}</Label>
                      <FieldAiActions compact value={editForm.name_en} lang="en" isRTL={isRTL} fieldType="title"
                        onTranslated={(v) => setField('name_ar', v)} onImproved={(v) => setField('name_en', v)} />
                    </div>
                    <Input value={editForm.name_en} onChange={e => setField('name_en', e.target.value)} dir="ltr" />
                  </div>
                  <BusinessTaxonomySection
                    businessId={editingBiz.id}
                    onSaved={() => {
                      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
                    }}
                  />
                  {/*
                    Phase 18i: Legacy `businesses.category_id` column dropped.
                    Classification is taxonomy-only via BusinessTaxonomySection above.
                  */}
                  <Separator />
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-[10px] space-y-1 text-muted-foreground font-mono">
                    {/* Primary reference — official platform identifier */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground font-semibold">{pickBi(isRTL, 'المعرف', 'Ref')}</span>
                      <ReferenceTag refId={editingBiz.ref_id} isRTL={isRTL} />
                    </div>
                    {editingBiz.legacy_ref_id && editingBiz.legacy_ref_id !== editingBiz.ref_id && (
                      <p>{pickBi(isRTL, 'المعرف السابق', 'Previously')}: {editingBiz.legacy_ref_id}</p>
                    )}
                    <p>Username: @{editingBiz.username}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span>{pickBi(isRTL, 'المالك', 'Owner')}</span>
                      {ownerRef?.ref_id
                        ? <ReferenceTag refId={ownerRef.ref_id} isRTL={isRTL} />
                        : <span className="text-muted-foreground">{pickBi(isRTL, '…تحميل', 'loading…')}</span>}
                    </div>
                    <p>Created: {new Date(editingBiz.created_at).toLocaleDateString()}</p>
                    <p className="flex items-center gap-1">
                      Rating: <Star className="w-2.5 h-2.5 text-accent" /> {editingBiz.rating_avg} ({editingBiz.rating_count} reviews)
                    </p>
                    {/* Internal-only technical UUIDs — kept collapsed; never the primary identifier */}
                    <details className="mt-1 pt-1 border-t border-border/30">
                      <summary className="cursor-pointer text-[9px] opacity-60 hover:opacity-100">{pickBi(isRTL, 'معرفات تقنية (UUID)', 'Technical (UUID)')}</summary>
                      <div className="mt-1 space-y-0.5 opacity-70">
                        <p className="break-all">business.id: {editingBiz.id}</p>
                        <p className="break-all">owner.user_id: {editingBiz.user_id}</p>
                      </div>
                    </details>
                  </div>
                </TabsContent>

                {/* ── Owner Tab (ORG-RBAC-9F) ── */}
                <TabsContent value="owner" className="space-y-4 mt-3">
                  <BusinessOwnerPanel
                    businessId={editingBiz.id}
                    businessRef={editingBiz.ref_id ?? null}
                    ownerUserId={editingBiz.user_id}
                    isRTL={isRTL}
                    onOwnerReassigned={() => setEditingBiz(null)}
                  />
                </TabsContent>

                {/* ── Address Tab ── */}
                {/* Address tab removed — addresses live on branches now.
                    See the Branches tab for the per-location address editor. */}

                {/* ── Content Tab ── */}
                <TabsContent value="content" className="space-y-4 mt-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{pickBi(isRTL, 'نبذة قصيرة (عربي)', 'Short Description (AR)')}</Label>
                      <FieldAiActions compact value={editForm.short_description_ar} lang="ar" isRTL={isRTL} fieldType="excerpt"
                        onTranslated={(v) => setField('short_description_en', v)} onImproved={(v) => setField('short_description_ar', v)} />
                    </div>
                    <Textarea value={editForm.short_description_ar} onChange={e => setField('short_description_ar', e.target.value)} rows={2}
                      placeholder={pickBi(isRTL, 'وصف مختصر للنشاط (150 حرف)', 'Short business description (150 chars)')} />
                    <span className="text-[10px] text-muted-foreground">{editForm.short_description_ar?.length || 0}/150</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{pickBi(isRTL, 'نبذة قصيرة (إنجليزي)', 'Short Description (EN)')}</Label>
                      <FieldAiActions compact value={editForm.short_description_en} lang="en" isRTL={isRTL} fieldType="excerpt"
                        onTranslated={(v) => setField('short_description_ar', v)} onImproved={(v) => setField('short_description_en', v)} />
                    </div>
                    <Textarea value={editForm.short_description_en} onChange={e => setField('short_description_en', e.target.value)} rows={2} dir="ltr" />
                    <span className="text-[10px] text-muted-foreground">{editForm.short_description_en?.length || 0}/150</span>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{pickBi(isRTL, 'الوصف التفصيلي (عربي)', 'Full Description (AR)')}</Label>
                      <FieldAiActions compact value={editForm.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setField('description_en', v)} onImproved={(v) => setField('description_ar', v)} />
                    </div>
                    <Textarea value={editForm.description_ar} onChange={e => setField('description_ar', e.target.value)} rows={5} />
                    <span className="text-[10px] text-muted-foreground">{editForm.description_ar?.length || 0} {pickBi(isRTL, 'حرف', 'chars')}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">{pickBi(isRTL, 'الوصف التفصيلي (إنجليزي)', 'Full Description (EN)')}</Label>
                      <FieldAiActions compact value={editForm.description_en} lang="en" isRTL={isRTL} fieldType="description"
                        onTranslated={(v) => setField('description_ar', v)} onImproved={(v) => setField('description_en', v)} />
                    </div>
                    <Textarea value={editForm.description_en} onChange={e => setField('description_en', e.target.value)} rows={5} dir="ltr" />
                    <span className="text-[10px] text-muted-foreground">{editForm.description_en?.length || 0} {pickBi(isRTL, 'حرف', 'chars')}</span>
                  </div>
                </TabsContent>

                {/* ── Media Tab ── */}
                <TabsContent value="media" className="space-y-4 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'الشعار', 'Logo')}</Label>
                      <ImageUpload bucket="business-assets" value={editForm.logo_url}
                        onChange={(url) => setField('logo_url', url)}
                        onRemove={() => {
                          setField('logo_url', '');
                          setField('logo_image_asset_id', null);
                          setField('logo_image_variants', null);
                        }}
                        pipeline="business"
                        businessKind="logo"
                        onUploadedMeta={(meta) => {
                          setField('logo_image_asset_id', meta.imageAssetId ?? null);
                          setField('logo_image_variants', meta.variants ?? null);
                        }}
                        aspectRatio="square" placeholder={pickBi(isRTL, 'رفع الشعار', 'Upload logo')} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'صورة الغلاف', 'Cover Image')}</Label>
                      <ImageUpload bucket="business-assets" value={editForm.cover_url}
                        onChange={(url) => setField('cover_url', url)}
                        onRemove={() => {
                          setField('cover_url', '');
                          setField('cover_image_asset_id', null);
                          setField('cover_image_variants', null);
                        }}
                        pipeline="business"
                        businessKind="cover"
                        onUploadedMeta={(meta) => {
                          setField('cover_image_asset_id', meta.imageAssetId ?? null);
                          setField('cover_image_variants', meta.variants ?? null);
                        }}
                        placeholder={pickBi(isRTL, 'رفع صورة الغلاف', 'Upload cover')} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Image className="w-3 h-3" /> {pickBi(isRTL, 'معرض صور الأعمال', 'Work Gallery')}
                      <Badge variant="secondary" className="text-[9px] ms-1">{portfolioData.length}</Badge>
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {portfolioData.map((item) => (
                        <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
                          <img src={item.media_url} alt={pickBi(isRTL, 'صورة من معرض الأعمال', 'Portfolio image')} className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                          <button type="button"
                            onClick={() => { if (confirm(pickBi(isRTL, 'حذف هذه الصورة؟', 'Delete this image?'))) deletePortfolioMutation.mutate(item.id); }}
                            className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="aspect-square">
                        <ImageUpload bucket="portfolio-images" folder="admin" aspectRatio="square"
                          onChange={(url) => addPortfolioMutation.mutate(url)} placeholder={pickBi(isRTL, 'إضافة صورة', 'Add image')} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── SEO Tab ── */}
                <TabsContent value="seo" className="space-y-4 mt-3">
                  <SEOPreviewCard
                    kind="company"
                    customTitleAr={editForm.seo_title_ar}
                    customTitleEn={editForm.seo_title_en}
                    customDescriptionAr={editForm.seo_description_ar}
                    customDescriptionEn={editForm.seo_description_en}
                    nameAr={editForm.name_ar}
                    nameEn={editForm.name_en}
                    activityAr={null}
                    activityEn={null}
                    cityAr={editCityName?.name_ar ?? null}
                    cityEn={editCityName?.name_en ?? null}
                    rawDescriptionAr={editForm.description_ar}
                    rawDescriptionEn={editForm.description_en}
                    url={editingBiz.username ? `https://qitaat.com/${editingBiz.username}` : null}
                    ogImageUrl={editForm.og_image || editForm.cover_url || editForm.logo_url || null}
                    focusKeyword={String(editForm.seo_keywords || '').split(',').map(k => k.trim()).filter(Boolean)[0] ?? null}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold">{pickBi(isRTL, 'عنوان SEO (عربي)', 'SEO Title (AR)')}</Label>
                        <FieldAiActions value={editForm.seo_title_ar || editForm.name_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_title" compact
                          onTranslated={(t) => setField('seo_title_ar', t)} onImproved={(t) => setField('seo_title_ar', t)} />
                      </div>
                      <Input value={editForm.seo_title_ar} onChange={e => setField('seo_title_ar', e.target.value)} dir="auto" className="mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold">{pickBi(isRTL, 'عنوان SEO (إنجليزي)', 'SEO Title (EN)')}</Label>
                        <FieldAiActions value={editForm.seo_title_en || editForm.name_en || ''} lang="en" isRTL={isRTL} fieldType="meta_title" compact
                          onTranslated={(t) => setField('seo_title_en', t)} onImproved={(t) => setField('seo_title_en', t)} />
                      </div>
                      <Input value={editForm.seo_title_en} onChange={e => setField('seo_title_en', e.target.value)} dir="ltr" className="mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold">{pickBi(isRTL, 'وصف SEO (عربي)', 'SEO Description (AR)')}</Label>
                        <FieldAiActions value={editForm.seo_description_ar || editForm.description_ar || editForm.short_description_ar || ''} lang="ar" isRTL={isRTL} fieldType="meta_description" compact
                          onTranslated={(t) => setField('seo_description_ar', t)} onImproved={(t) => setField('seo_description_ar', t)} />
                      </div>
                      <Textarea value={editForm.seo_description_ar} onChange={e => setField('seo_description_ar', e.target.value)} rows={2} dir="auto" className="mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold">{pickBi(isRTL, 'وصف SEO (إنجليزي)', 'SEO Description (EN)')}</Label>
                        <FieldAiActions value={editForm.seo_description_en || editForm.description_en || editForm.short_description_en || ''} lang="en" isRTL={isRTL} fieldType="meta_description" compact
                          onTranslated={(t) => setField('seo_description_en', t)} onImproved={(t) => setField('seo_description_en', t)} />
                      </div>
                      <Textarea value={editForm.seo_description_en} onChange={e => setField('seo_description_en', e.target.value)} rows={2} dir="ltr" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">{pickBi(isRTL, 'كلمات SEO', 'SEO keywords')}</Label>
                    <Input value={editForm.seo_keywords} onChange={e => setField('seo_keywords', e.target.value)} dir="auto" className="mt-1" placeholder={pickBi(isRTL, 'ألمنيوم, زجاج, تركيب', 'aluminum, glass, installation')} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-2 block">{pickBi(isRTL, 'صورة OG', 'OG image')}</Label>
                    <ImageUpload bucket="business-assets" value={editForm.og_image}
                      onChange={(url) => setField('og_image', url)} onRemove={() => setField('og_image', '')}
                      placeholder={pickBi(isRTL, 'رفع صورة المشاركة', 'Upload share image')} />
                  </div>
                </TabsContent>

                {/* ── Contact Tab ── */}
                <TabsContent value="contact" className="space-y-4 mt-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> {pickBi(isRTL, 'اسم مسؤول التواصل', 'Contact Person')}</Label>
                    <Input value={editForm.contact_person} onChange={e => setField('contact_person', e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PhoneField value={parsePhoneValue(editForm.phone)} onChange={(v) => setField('phone', toE164(v))} label={pickBi(isRTL, 'رقم الهاتف', 'Phone')} optional />
                    <PhoneField value={parsePhoneValue(editForm.mobile)} onChange={(v) => setField('mobile', toE164(v))} label={pickBi(isRTL, 'رقم الجوال', 'Mobile')} optional />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {pickBi(isRTL, 'الرقم الموحد', 'Unified Number')}</Label>
                      <Input value={editForm.unified_number} onChange={e => setField('unified_number', e.target.value)} dir="ltr" className="mt-1 tech-content" placeholder="920xxxxxxx" />
                    </div>
                    <PhoneField value={parsePhoneValue(editForm.customer_service_phone)} onChange={(v) => setField('customer_service_phone', toE164(v))} label={pickBi(isRTL, 'خدمة العملاء', 'Customer Service')} optional />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                    <Input type="email" value={editForm.email} onChange={e => setField('email', e.target.value)} dir="ltr" className="mt-1 tech-content" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {pickBi(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                    <Input type="url" value={editForm.website} onChange={e => setField('website', e.target.value)} dir="ltr" className="mt-1 tech-content" placeholder="https://" />
                  </div>
                  {editingBiz && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3" /> {pickBi(isRTL, 'الخدمات المسجلة', 'Registered Services')}
                        </Label>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => { setEditingBiz(null); openServices(editingBiz.id); }}>
                          <Settings className="w-3 h-3" /> {pickBi(isRTL, 'إدارة', 'Manage')}
                        </Button>
                      </div>
                      {allServices.filter((s) => s.business_id === editingBiz.id).length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'لا توجد خدمات مسجلة', 'No registered services')}</p>
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
                            {(() => {
                              const t = ((br as unknown as { branch_type?: string }).branch_type) ?? (br.is_main ? 'main' : 'branch');
                              const map: Record<string, { ar: string; en: string; cls: string }> = {
                                main:           { ar: 'المركز الرئيسي', en: 'Headquarters',     cls: 'bg-primary/10 text-primary' },
                                branch:         { ar: 'فرع',           en: 'Branch',           cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
                                warehouse:      { ar: 'مستودع',        en: 'Warehouse',        cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
                                admin_office:   { ar: 'مكتب إداري',    en: 'Admin office',     cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
                                regional_office:{ ar: 'إدارة إقليمية', en: 'Regional office',  cls: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
                                head_office:    { ar: 'الإدارة العامة', en: 'Head office',     cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
                              };
                              const m = map[t] ?? map.branch;
                              return <Badge className={`text-[8px] h-4 border-0 ${m.cls}`}>{pickBi(isRTL, m.ar, m.en)}</Badge>;
                            })()}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                            {br.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{br.phone}</span>}
                            {br.mobile && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{br.mobile}</span>}
                            {br.unified_number && <span>{br.unified_number}</span>}
                            {(br.address || br.district) && (
                              <span className="flex items-center gap-0.5 truncate max-w-[280px]">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{br.address || [br.district, br.street_name].filter(Boolean).join(' · ')}</span>
                              </span>
                            )}
                            {br.contact_person && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{br.contact_person}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch checked={br.is_active} onCheckedChange={v => toggleBranchMutation.mutate({ id: br.id, is_active: v })} />
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => {
                            setEditingBranchId(br.id);
                            setBranchForm({
                              name_ar: br.name_ar, name_en: br.name_en || '', is_main: br.is_main, is_active: br.is_active,
                              branch_type: ((br as unknown as { branch_type?: string }).branch_type as 'main' | 'branch' | 'warehouse' | 'admin_office' | 'regional_office' | 'head_office') ?? (br.is_main ? 'main' : 'branch'),
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
                            onClick={() => { if (confirm(pickBi(isRTL, 'حذف هذا الفرع؟', 'Delete this branch?'))) deleteBranchMutation.mutate(br.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {branches.length === 0 && !branchForm && (
                      <p className="text-center text-sm text-muted-foreground py-6">{pickBi(isRTL, 'لا توجد فروع مسجلة', 'No branches registered')}</p>
                    )}
                  </div>

                  {branchForm ? (
                    <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/[0.03]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                          {editingBranchId ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {editingBranchId ? (pickBi(isRTL, 'تعديل الفرع', 'Edit Branch')) : (pickBi(isRTL, 'إضافة فرع جديد', 'Add New Branch'))}
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setBranchForm(null); setEditingBranchId(null); }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'اسم الفرع (عربي)', 'Branch Name (AR)')} *</Label>
                        <Input value={branchForm.name_ar} onChange={e => setBranchForm((f) => ({ ...f, name_ar: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'اسم الفرع (إنجليزي)', 'Branch Name (EN)')}</Label>
                        <Input value={branchForm.name_en} onChange={e => setBranchForm((f) => ({ ...f, name_en: e.target.value }))} dir="ltr" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'نوع الموقع', 'Location type')} *</Label>
                        <Select
                          value={branchForm.branch_type || 'branch'}
                          onValueChange={(v) => {
                            const nextIsMain = v === 'main';
                            if (nextIsMain) {
                              const currentMain = branches.find((b: any) => b.is_main && b.id !== editingBranchId);
                              if (currentMain && !confirm(isRTL
                                ? `سيتم إلغاء "${currentMain.name_ar}" كمركز رئيسي وتعيين هذا الموقع بدلاً منه. متابعة؟`
                                : `"${currentMain.name_ar}" will be unset as headquarters and this location will replace it. Continue?`)) {
                                return;
                              }
                            }
                            setBranchForm((f) => ({ ...f, branch_type: v as any, is_main: nextIsMain }));
                          }}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main">{pickBi(isRTL, 'المركز الرئيسي', 'Headquarters (main)')}</SelectItem>
                            <SelectItem value="branch">{pickBi(isRTL, 'فرع', 'Branch')}</SelectItem>
                            <SelectItem value="warehouse">{pickBi(isRTL, 'مستودع', 'Warehouse')}</SelectItem>
                            <SelectItem value="admin_office">{pickBi(isRTL, 'مكتب إداري', 'Admin office')}</SelectItem>
                            <SelectItem value="regional_office">{pickBi(isRTL, 'إدارة إقليمية', 'Regional office')}</SelectItem>
                            <SelectItem value="head_office">{pickBi(isRTL, 'الإدارة العامة', 'Head office')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {pickBi(isRTL, 'المركز الرئيسي يُستخدم كعنوان المنشأة الافتراضي. مسموح بمركز رئيسي واحد فقط.', 'Headquarters is used as the default business address. Only one headquarters is allowed.')}
                        </p>
                      </div>
                      <Separator />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{pickBi(isRTL, 'بيانات التواصل', 'Contact Info')}</p>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'اسم مسؤول التواصل', 'Contact Person')}</Label>
                        <Input value={branchForm.contact_person} onChange={e => setBranchForm((f) => ({ ...f, contact_person: e.target.value }))} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <PhoneField value={parsePhoneValue(branchForm.phone)} onChange={(v) => setBranchForm((f) => ({ ...f, phone: toE164(v) }))} label={pickBi(isRTL, 'الهاتف', 'Phone')} optional />
                        <PhoneField value={parsePhoneValue(branchForm.mobile)} onChange={(v) => setBranchForm((f) => ({ ...f, mobile: toE164(v) }))} label={pickBi(isRTL, 'الجوال', 'Mobile')} optional />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{pickBi(isRTL, 'الرقم الموحد', 'Unified Number')}</Label>
                          <Input value={branchForm.unified_number} onChange={e => setBranchForm((f) => ({ ...f, unified_number: e.target.value }))} dir="ltr" className="mt-1" placeholder="920xxxxxxx" />
                        </div>
                        <PhoneField value={parsePhoneValue(branchForm.customer_service_phone)} onChange={(v) => setBranchForm((f) => ({ ...f, customer_service_phone: toE164(v) }))} label={pickBi(isRTL, 'خدمة العملاء', 'Customer Service')} optional />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                          <Input value={branchForm.email} onChange={e => setBranchForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">{pickBi(isRTL, 'الموقع الإلكتروني', 'Website')}</Label>
                          <Input value={branchForm.website} onChange={e => setBranchForm((f) => ({ ...f, website: e.target.value }))} dir="ltr" className="mt-1" />
                        </div>
                      </div>
                      <Separator />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{pickBi(isRTL, 'العنوان', 'Address')}</p>
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'الدولة', 'Country')}</Label>
                        <Select value={branchForm.country_id} onValueChange={v => setBranchForm((f) => ({ ...f, country_id: v, city_id: '' }))}>
                          <SelectTrigger className="mt-1 max-w-xs"><SelectValue placeholder={pickBi(isRTL, 'اختر', 'Select')} /></SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => <SelectItem key={c.id} value={c.id}>{language === 'ar' ? c.name_ar : c.name_en}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Unified address microservice — Region → City → District (typeable) + SPL + street/building/national-id. */}
                      <NationalAddressForm
                        isRTL={isRTL}
                        value={{
                          short_address: branchForm.short_address ?? null,
                          region: branchForm.region ?? null,
                          region_en: branchForm.region_en ?? null,
                          city_id: branchForm.city_id ?? null,
                          district: branchForm.district ?? null,
                          district_en: branchForm.district_en ?? null,
                          street_name: branchForm.street_name ?? null,
                          street_name_en: branchForm.street_name_en ?? null,
                          building_number: branchForm.building_number ?? null,
                          additional_number: branchForm.additional_number ?? null,
                          post_code: branchForm.post_code ?? null,
                          address: branchForm.address ?? null,
                          address_en: branchForm.address_en ?? null,
                          address_manual: branchForm.address_manual ?? false,
                        } as NationalAddressValue}
                        onChange={(next) => setBranchForm((f) => ({
                          ...f,
                          short_address: next.short_address ?? '',
                          region: next.region ?? '',
                          region_en: next.region_en ?? '',
                          city_id: next.city_id ?? '',
                          district: next.district ?? '',
                          district_en: next.district_en ?? '',
                          street_name: next.street_name ?? '',
                          street_name_en: next.street_name_en ?? '',
                          building_number: next.building_number ?? '',
                          additional_number: next.additional_number ?? '',
                          post_code: next.post_code ?? '',
                          address: next.address ?? '',
                          address_en: next.address_en ?? '',
                          address_manual: next.address_manual ?? false,
                          national_id: f.national_id,
                        }))}
                      />
                      <div>
                        <Label className="text-xs">{pickBi(isRTL, 'الرقم الوطني', 'National ID')}</Label>
                        <Input value={branchForm.national_id} onChange={e => setBranchForm((f) => ({ ...f, national_id: e.target.value }))} dir="ltr" className="mt-1 max-w-xs" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={branchForm.is_active} onCheckedChange={v => setBranchForm((f) => ({ ...f, is_active: v }))} />
                          <span className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</span>
                        </div>
                      </div>
                      <Button onClick={() => saveBranchMutation.mutate()} disabled={!branchForm.name_ar || saveBranchMutation.isPending}
                        className="w-full gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        {saveBranchMutation.isPending ? '...' : (pickBi(isRTL, 'حفظ الفرع', 'Save Branch'))}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-1.5" onClick={() => {
                      // First location defaults to "main" (headquarters); subsequent
                      // ones default to "branch" and admins can switch to warehouse
                      // or admin_office.
                      const isFirst = branches.length === 0;
                      setBranchForm({
                        ...emptyBranch(),
                        is_main: isFirst,
                        branch_type: isFirst ? 'main' : 'branch',
                      });
                      setEditingBranchId(null);
                    }}>
                      <Plus className="w-3.5 h-3.5" /> {pickBi(isRTL, 'إضافة موقع جديد (فرع / مستودع / مكتب)', 'Add new location (branch / warehouse / office)')}
                    </Button>
                  )}
                </TabsContent>

                {/* ── Controls Tab ── */}
                <TabsContent value="controls" className="space-y-4 mt-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{pickBi(isRTL, 'حالة التفعيل', 'Active Status')}</p>
                        <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'تفعيل أو تعطيل ظهور العمل', 'Enable or disable business visibility')}</p>
                      </div>
                      <Switch checked={editForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{pickBi(isRTL, 'التوثيق', 'Verification')}</p>
                        <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'علامة التوثيق الرسمية', 'Official verification badge')}</p>
                      </div>
                      <Switch checked={editForm.is_verified} onCheckedChange={v => setField('is_verified', v)} />
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/30">
                      <p className="text-sm font-medium mb-2">{pickBi(isRTL, 'مستوى العضوية', 'Membership Tier')}</p>
                      {(() => {
                        const cur = tiers.find(t => t.value === editForm.membership_tier) || tiers[0];
                        return (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/40">
                            <span>{cur.icon}</span>
                            <span className="text-sm font-medium">
                              {language === 'ar' ? cur.label_ar : cur.label_en}
                            </span>
                          </div>
                        );
                      })()}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {pickBi(isRTL, 'تغيير العضوية يتم من خيار العضوية في صف المنشأة.', 'Use the row tier picker to change membership.')}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Ops Tab (BUSINESS-CORE-2): internal notes + activity timeline ── */}
                <TabsContent value="ops" className="space-y-4 mt-3">
                  <BusinessOperationsPanel businessId={editingBiz.id} />
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button onClick={() => updateBizMutation.mutate()} disabled={!editForm.name_ar || updateBizMutation.isPending} className="flex-1 gap-1.5 rounded-xl">
                  <Save className="w-3.5 h-3.5" />
                  {updateBizMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (pickBi(isRTL, 'حفظ التعديلات', 'Save Changes'))}
                </Button>
                <Button variant="outline" onClick={() => setEditingBiz(null)} className="rounded-xl">{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
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
                {pickBi(isRTL, 'إدارة الخدمات', 'Manage Services')}
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
                         svc.price_from ? `${pickBi(isRTL, 'من', 'From')} ${svc.price_from} ${svc.currency_code}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={svc.is_active} onCheckedChange={v => toggleServiceMutation.mutate({ id: svc.id, is_active: v })} />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                        onClick={() => { if (confirm(pickBi(isRTL, 'حذف هذه الخدمة؟', 'Delete this service?'))) deleteServiceMutation.mutate(svc.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">{pickBi(isRTL, 'لا توجد خدمات', 'No services')}</p>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> {pickBi(isRTL, 'إضافة خدمة جديدة', 'Add New Service')}
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">{pickBi(isRTL, 'اسم الخدمة (عربي)', 'Service Name (AR)')} *</Label>
                    <FieldAiActions compact value={newService.name_ar} lang="ar" isRTL={isRTL} fieldType="title"
                      onTranslated={(v) => setServiceField('name_en', v)} onImproved={(v) => setServiceField('name_ar', v)} />
                  </div>
                  <Input value={newService.name_ar} onChange={e => setServiceField('name_ar', e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">{pickBi(isRTL, 'اسم الخدمة (إنجليزي)', 'Service Name (EN)')}</Label>
                    <FieldAiActions compact value={newService.name_en} lang="en" isRTL={isRTL} fieldType="title"
                      onTranslated={(v) => setServiceField('name_ar', v)} onImproved={(v) => setServiceField('name_en', v)} />
                  </div>
                  <Input value={newService.name_en} onChange={e => setServiceField('name_en', e.target.value)} dir="ltr" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">{pickBi(isRTL, 'الوصف (عربي)', 'Description (AR)')}</Label>
                    <FieldAiActions compact value={newService.description_ar} lang="ar" isRTL={isRTL} fieldType="description"
                      onTranslated={(v) => setServiceField('description_en', v)} onImproved={(v) => setServiceField('description_ar', v)} />
                  </div>
                  <Textarea value={newService.description_ar} onChange={e => setServiceField('description_ar', e.target.value)} rows={2} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">{pickBi(isRTL, 'الوصف (إنجليزي)', 'Description (EN)')}</Label>
                    <FieldAiActions compact value={newService.description_en} lang="en" isRTL={isRTL} fieldType="description"
                      onTranslated={(v) => setServiceField('description_ar', v)} onImproved={(v) => setServiceField('description_en', v)} />
                  </div>
                  <Textarea value={newService.description_en} onChange={e => setServiceField('description_en', e.target.value)} rows={2} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> {pickBi(isRTL, 'السعر من', 'Price From')}</Label>
                    <Input type="number" value={newService.price_from} onChange={e => setServiceField('price_from', e.target.value)} dir="ltr" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> {pickBi(isRTL, 'السعر إلى', 'Price To')}</Label>
                    <Input type="number" value={newService.price_to} onChange={e => setServiceField('price_to', e.target.value)} dir="ltr" className="mt-1" />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={newService.is_active} onCheckedChange={v => setServiceField('is_active', v)} />
                      <span className="text-xs">{pickBi(isRTL, 'مفعّل', 'Active')}</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => addServiceMutation.mutate()} disabled={!newService.name_ar || addServiceMutation.isPending}
                  className="w-full gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {addServiceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (pickBi(isRTL, 'إضافة الخدمة', 'Add Service'))}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Business List ─── */}
        {!panelOpen && (isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-accent/30" />
            </div>
            <p className="font-heading font-bold text-sm mb-1">{pickBi(isRTL, 'لا توجد نتائج', 'No results found')}</p>
            <p className="text-xs text-muted-foreground">{pickBi(isRTL, 'جرّب تعديل معايير البحث', 'Try adjusting your search criteria')}</p>
            {(search || filterStatus !== 'all' || selectedTiers.length > 0) && (
              <Button variant="outline" size="sm" className="mt-4 gap-1.5 rounded-xl"
                onClick={() => { setSearch(''); setFilterStatus('all'); clearTiers(); }}>
                <X className="w-3.5 h-3.5" /> {pickBi(isRTL, 'مسح الفلاتر', 'Clear Filters')}
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
                    <TableHead className="w-8">
                      <button onClick={togglePageAll} className="text-muted-foreground hover:text-foreground">
                        {allPagedSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'النشاط', 'Business')}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'المعرف', 'Username')}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'العضوية', 'Tier')}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'التقييم', 'Rating')}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'الترجمة', 'Trans.')}</TableHead>
                    <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'الحالة', 'Status')}</TableHead>
                    <TableHead className="text-[11px] font-semibold text-center">{pickBi(isRTL, 'إجراءات', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((biz, idx) => {
                    const tierInfo = tiers.find(t => t.value === biz.membership_tier) || tiers[0];
                    const tc = translationCompleteness(biz);
                    return (
                      <TableRow key={biz.id} className={`hover:bg-muted/30 ${!biz.is_active ? 'opacity-50' : ''}`}
                        style={{ animationDelay: `${idx * 0.02}s` }}>
                        <TableCell className="py-2.5">
                          <button onClick={() => toggleSelect(biz.id)} className="text-muted-foreground hover:text-foreground">
                            {selected.has(biz.id) ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border border-border/50">
                              <AvatarImage src={(biz as any).logo_image_variants?.thumbnail || (biz as any).logo_image_variants?.card || biz.logo_url || undefined} />
                              <AvatarFallback className="bg-primary/5 text-primary font-bold text-[10px]">{biz.name_ar?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[180px]" dir="auto">{language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] text-muted-foreground tech-content">{biz.ref_id}</p>
                                {biz.is_demo && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 border-amber-500/40 text-amber-600 dark:text-amber-400" title={pickBi(isRTL, 'بيانات تجريبية', 'Demo data')}>
                                    <FlaskConical className="w-2.5 h-2.5" />{pickBi(isRTL, 'تجريبي', 'Demo')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground tech-content">@{biz.username}</TableCell>
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
                          <Badge variant="outline" className={`text-[9px] h-5 gap-1 ${tc.full ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}`}
                            title={tc.full ? (pickBi(isRTL, 'مكتملة', 'Complete')) : (pickBi(isRTL, 'ناقصة', 'Incomplete'))}>
                            <Languages className="w-2.5 h-2.5" />
                            {tc.ar ? 'AR' : '·'} / {tc.en ? 'EN' : '·'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {biz.is_verified && <Badge className="text-[8px] h-4 bg-info/10 text-info border-0">{pickBi(isRTL, 'موثق', 'Verified')}</Badge>}
                            {!biz.is_active && <Badge variant="destructive" className="text-[8px] h-4">{pickBi(isRTL, 'معطل', 'Disabled')}</Badge>}
                            {biz.is_active && !biz.is_verified && <Badge className="text-[8px] h-4 bg-success/10 text-success border-0">{pickBi(isRTL, 'نشط', 'Active')}</Badge>}
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
            <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <button onClick={togglePageAll} className="inline-flex items-center gap-1 hover:text-foreground">
                {allPagedSelected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                {pickBi(isRTL, 'تحديد الصفحة', 'Select page')}
              </button>
              <span className="ms-auto tech-content">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
            </div>
            {paged.map((biz, idx) => {
              const tierInfo = tiers.find(t => t.value === biz.membership_tier) || tiers[0];
              const hasContract = contractBusinessIds.includes(biz.id);
              const svcCount = allServices.filter((s) => s.business_id === biz.id).length;
              const tc = translationCompleteness(biz);
              const isSel = selected.has(biz.id);
              return (
                <div key={biz.id}
                  className={`group relative rounded-2xl border bg-card transition-all duration-200 hover:shadow-md
                    ${isSel ? 'border-accent ring-2 ring-accent/30' : (!biz.is_active ? 'opacity-60 border-destructive/40' : 'border-border/30 hover:border-primary/20')}`}
                  style={{ animationDelay: `${idx * 0.03}s` }}>
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                      {/* ── Identity row ── */}
                      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                        <button onClick={() => toggleSelect(biz.id)} className="mt-1 text-muted-foreground hover:text-foreground shrink-0" aria-label="select">
                          {isSel ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                        </button>
                        <div className="relative shrink-0">
                          <Avatar className="w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-border/10">
                            <AvatarImage src={(biz as any).logo_image_variants?.thumbnail || (biz as any).logo_image_variants?.card || biz.logo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                              {biz.name_ar?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {biz.is_verified && (
                            <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-info/15 flex items-center justify-center ring-2 ring-card">
                              <CheckCircle className="w-3 h-3 text-info" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading font-bold text-sm sm:text-base leading-tight break-words min-w-0" dir="auto">
                              {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                            </h3>
                            {!biz.is_active && <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0"><Ban className="w-2.5 h-2.5" />{pickBi(isRTL, 'معطل', 'Disabled')}</Badge>}
                            {hasContract && <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0"><FileText className="w-2.5 h-2.5" />{pickBi(isRTL, 'عقود', 'Contracts')}</Badge>}
                            {biz.is_demo && (
                              <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400" title={pickBi(isRTL, 'بيانات تجريبية', 'Demo data')}>
                                <FlaskConical className="w-2.5 h-2.5" />{pickBi(isRTL, 'تجريبي', 'Demo')}
                              </Badge>
                            )}
                            {!tc.full && (
                              <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0 border-warning/40 text-warning" title={pickBi(isRTL, 'الترجمة غير مكتملة', 'Translation incomplete')}>
                                <AlertTriangle className="w-2.5 h-2.5" />{tc.ar ? 'EN' : 'AR'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-[11px] text-muted-foreground tech-content">@{biz.username}</span>
                            <span className="text-[11px] text-muted-foreground tech-content">{biz.ref_id}</span>
                            {biz.phone && <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tech-content" dir="ltr"><Phone className="w-3 h-3 shrink-0" />{biz.phone}</span>}
                            {biz.email && <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tech-content truncate max-w-[220px]" dir="ltr"><Mail className="w-3 h-3 shrink-0" />{biz.email}</span>}
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
                                <Package className="w-2.5 h-2.5" /> {svcCount} {pickBi(isRTL, 'خدمة', 'services')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {/* Quick view button — always visible top-corner */}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl shrink-0" asChild title={pickBi(isRTL, 'عرض الملف', 'View profile')}>
                          <Link to={`/${biz.username}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                      </div>

                      {/* ── Actions row ── full-width, scrolls on mobile */}
                      <div className="-mx-1 px-1 pt-2 border-t border-border/30 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1.5 min-w-max">
                          <Select value={biz.membership_tier} onValueChange={tier => tierMutation.mutate({ id: biz.id, tier: tier as MembershipTier })}>
                            <SelectTrigger className="h-8 text-xs w-28 border-dashed rounded-xl shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {tiers.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {language === 'ar' ? t.label_ar : t.label_en}</SelectItem>)}
                            </SelectContent>
                          </Select>

                          <Select
                            value={biz.approval_status || 'draft'}
                            onValueChange={(status) => approvalStatusMutation.mutate({ id: biz.id, status })}
                          >
                            <SelectTrigger
                              className="h-8 text-xs w-32 rounded-xl shrink-0"
                              title={pickBi(isRTL, 'حالة النشر', 'Publication status')}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="draft">📝 {pickBi(isRTL, 'مسودة', 'Draft')}</SelectItem>
                              <SelectItem value="submitted">📨 {pickBi(isRTL, 'مُرسلة', 'Submitted')}</SelectItem>
                              <SelectItem value="under_review">🔍 {pickBi(isRTL, 'قيد المراجعة', 'Under review')}</SelectItem>
                              <SelectItem value="approved">✅ {pickBi(isRTL, 'معتمدة', 'Approved')}</SelectItem>
                              <SelectItem value="published">🌐 {pickBi(isRTL, 'منشورة', 'Published')}</SelectItem>
                              <SelectItem value="rejected">⛔ {pickBi(isRTL, 'مرفوضة', 'Rejected')}</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant={biz.is_verified ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 text-xs gap-1.5 rounded-xl shrink-0 ${biz.is_verified ? 'bg-info text-info-foreground hover:bg-info/90' : 'text-info border-info/40'}`}
                            onClick={() => setVerifyConfirm({
                              id: biz.id,
                              name: biz.name_ar || biz.name_en || '',
                              value: !biz.is_verified,
                            })}
                            title={pickBi(isRTL, 'تبديل حالة التوثيق الرسمي', 'Toggle official verification')}
                          >
                            {biz.is_verified ? <CheckCircle className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                            <span>{biz.is_verified ? (pickBi(isRTL, 'موثّق — إلغاء', 'Verified — Unverify')) : (pickBi(isRTL, 'توثيق الحساب', 'Verify'))}</span>
                          </Button>

                          <Button variant="outline" size="sm"
                            className={`h-8 text-xs gap-1.5 rounded-xl shrink-0 ${!biz.is_active ? 'text-success border-success' : 'text-warning border-warning'}`}
                            onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_active', value: !biz.is_active })}>
                            {biz.is_active ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            <span>{biz.is_active ? (pickBi(isRTL, 'تعطيل', 'Disable')) : (pickBi(isRTL, 'تفعيل', 'Enable'))}</span>
                          </Button>

                          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl shrink-0"
                            onClick={() => openServices(biz.id)} title={pickBi(isRTL, 'خدمات', 'Services')}>
                            <Package className="w-3 h-3" /> <span className="hidden md:inline">{pickBi(isRTL, 'خدمات', 'Services')}</span>
                          </Button>

                          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-xl shrink-0" asChild title={pickBi(isRTL, 'خدمات الجهة', 'Activations')}>
                            <Link to={`/admin/service-activations?businessId=${biz.id}`}>
                              <ShieldCheck className="w-3 h-3" /><span className="hidden lg:inline">{pickBi(isRTL, 'خدمات الجهة', 'Activations')}</span>
                            </Link>
                          </Button>

                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl shrink-0 ms-auto" onClick={() => openEdit(biz)}>
                            <Edit className="w-3 h-3" /><span className="hidden md:inline">{pickBi(isRTL, 'تعديل', 'Edit')}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {!panelOpen && !isLoading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground tech-content">
              {isRTL
                ? `الصفحة ${safePage}/${totalPages} · عرض ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} من ${filtered.length} (إجمالي ${businesses.length})`
                : `Page ${safePage}/${totalPages} · ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} (total ${businesses.length})`}
            </p>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-xl" disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}>
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </Button>
                  <span className="text-[11px] text-muted-foreground tech-content min-w-[3rem] text-center">{safePage}/{totalPages}</span>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-xl" disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}>
                    {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              )}
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
        {/* ─── Verify Confirmation Dialog ─── */}
        <AlertDialog open={!!verifyConfirm} onOpenChange={(open) => { if (!open) setVerifyConfirm(null); }}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-info" />
                {pickBi(isRTL, 'تأكيد التوثيق', 'Confirm Verification')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {verifyConfirm?.value
                  ? (isRTL
                    ? `هل أنت متأكد من توثيق حساب «${verifyConfirm?.name ?? ''}»؟ سيتم منحه علامة التوثيق الرسمية.`
                    : `Are you sure you want to verify «${verifyConfirm?.name ?? ''}»? This will grant the official verification badge.`)
                  : (isRTL
                    ? `هل أنت متأكد من إلغاء توثيق حساب «${verifyConfirm?.name ?? ''}»؟ ستُحذف علامة التوثيق الرسمية.`
                    : `Are you sure you want to unverify «${verifyConfirm?.name ?? ''}»? The official verification badge will be removed.`)
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel asChild>
                <Button variant="outline" className="rounded-xl">
                  {pickBi(isRTL, 'إلغاء', 'Cancel')}
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant={verifyConfirm?.value ? 'default' : 'destructive'}
                  className="rounded-xl"
                  onClick={() => {
                    if (verifyConfirm) {
                      toggleMutation.mutate({ id: verifyConfirm.id, field: 'is_verified', value: verifyConfirm.value });
                      setVerifyConfirm(null);
                    }
                  }}
                >
                  {verifyConfirm?.value
                    ? (pickBi(isRTL, 'نعم، توثيق', 'Yes, Verify'))
                    : (pickBi(isRTL, 'نعم، إلغاء التوثيق', 'Yes, Unverify'))
                  }
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinesses;
