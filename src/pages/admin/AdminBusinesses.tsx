import React, { useState, useCallback, useEffect, useMemo, useRef, useTransition } from 'react';
import { useAdminBusinessesUrlState } from './businesses/useAdminBusinessesUrlState';
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
  updateBusinessSensitiveFields,
  BUSINESS_SAFE_COLUMNS_SELECT,
} from '@/modules/businesses';
import {
  adminCreateBusinessWithOwner,
  type AdminCreateBusinessPayload,
} from '@/modules/businesses/services/adminCreateBusinessWithOwner';
import { mapAdminCreateBizError } from '@/modules/businesses/services/adminCreateBusinessWithOwnerErrors';
import { nationalAddressLookup } from '@/modules/locations';

import { RegionCitySelector } from '@/components/forms/RegionCitySelector';
import { SA_REGIONS, findRegionByLabel, type SaRegionId } from '@/data/sa-regions';
import { NationalAddressForm, type NationalAddressValue } from '@/modules/addresses';
import { setBusinessMembershipTier, type MembershipTier } from '@/modules/memberships';

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
import { BusinessOperationsSection } from '@/components/admin/businesses/sections/BusinessOperationsSection';
import { BusinessControlsSection } from '@/components/admin/businesses/sections/BusinessControlsSection';
import { BusinessOwnerSectionShell } from '@/components/admin/businesses/sections/BusinessOwnerSectionShell';
import { BusinessEditPanel } from '@/components/admin/businesses/sections/BusinessEditPanel';
import { BusinessServicesPanel, type AdminNewServiceFormState, type AdminServiceLite } from '@/components/admin/businesses/sections/BusinessServicesPanel';
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
import {
  Building2, XCircle, Star, Loader2, Eye, Ban,
  Edit, Trash2, Plus, X, Globe, Phone, Mail, MapPin, Settings,
  Shield, Crown, BarChart3, Package, DollarSign, ExternalLink,
  GripVertical, ToggleLeft, ToggleRight, Save, Image, MapPinned,
  FileText, Users, Locate, Navigation, Download, LayoutGrid, List,
  ArrowUpRight, Filter, RefreshCw, Copy, MoreHorizontal,
  Activity, Zap, Languages, ArrowUpDown, ChevronLeft, ChevronRight,
  CheckSquare, Square,
  FlaskConical, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNoIndex } from "@/hooks/useNoIndex";
import { parseMembershipLimitError } from '@/lib/membership-errors';
import { PhoneField, parsePhoneValue, toE164 } from '@/components/forms/PhoneField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminListPageTemplate } from '@/components/admin/AdminListPageTemplate';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { SavedViewsMenu } from '@/components/admin/SavedViewsMenu';
import { useAdminSavedViews } from '@/hooks/useAdminSavedViews';
import { BusinessFiltersToolbar } from '@/components/admin/businesses/BusinessFiltersToolbar';
import { BusinessBulkActionBar } from '@/components/admin/businesses/BusinessBulkActionBar';
import {
  BusinessDetailsDrawer,
  type BusinessDrawerRow,
} from '@/components/admin/businesses/BusinessDetailsDrawer';
import { AdminBusinessesPageShell } from '@/components/admin/businesses/AdminBusinessesPageShell';
import { BusinessHeaderActions } from '@/components/admin/businesses/BusinessHeaderActions';
import { BusinessFiltersBar } from '@/components/admin/businesses/BusinessFiltersBar';
import { BusinessTableSection } from '@/components/admin/businesses/BusinessTableSection';
import { BusinessPaginationFooter } from '@/components/admin/businesses/BusinessPaginationFooter';
import { BusinessVerifyConfirmDialog } from '@/components/admin/businesses/BusinessVerifyConfirmDialog';
import { OverviewTab as ControlCenterOverviewTab } from '@/components/admin/businesses/control-center/OverviewTab';
import { ProvidersTab as ControlCenterProvidersTab } from '@/components/admin/businesses/control-center/ProvidersTab';
import { TaxonomiesTab as ControlCenterTaxonomiesTab } from '@/components/admin/businesses/control-center/TaxonomiesTab';
import { QualityTab as ControlCenterQualityTab } from '@/components/admin/businesses/control-center/QualityTab';
import { BusinessesCommandBar, type BusinessesCommandPreset } from '@/components/admin/businesses/control-center/BusinessesCommandBar';
import type { QuickActionKey } from '@/components/admin/businesses/control-center/QuickActionsCard';
import {
  BUSINESS_ADMIN_TABS,
  DEFAULT_BUSINESS_ADMIN_TAB,
  type BusinessAdminTabId,
} from '@/modules/admin/businesses/businessAdminTabs';
import {
  BusinessPublicVisibilityCard,
  createAdminPublishPayload,
  generateBusinessUsernameCandidate,
  type PublicVisibilityProbeRow,
} from '@/components/admin/businesses/BusinessPublicVisibilityCard';
import { SEOPreviewCard } from '@/components/seo/SEOPreviewCard';
import { BusinessTaxonomySection } from '@/modules/taxonomy';
import { BusinessBasicInfoSection } from '@/components/admin/businesses/edit/BusinessBasicInfoSection';
import { BusinessContentSection } from '@/components/admin/businesses/edit/BusinessContentSection';
import { BusinessMediaSection } from '@/components/admin/businesses/edit/BusinessMediaSection';
import { BusinessSeoSection } from '@/components/admin/businesses/edit/BusinessSeoSection';
import { BusinessContactSection } from '@/components/admin/businesses/edit/BusinessContactSection';
import { BusinessEditActionsFooter } from '@/components/admin/businesses/edit/BusinessEditActionsFooter';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type {
  AdminBusinessImageColumns,
  AdminBusinessImageVariants,
  AdminBusinessCsvRow,
  AdminBusinessBranchLite,
  AdminCreateBusinessFormState,
  AdminEditBusinessFormState,
  PortfolioItemInsert,
} from './adminBusinesses.types';
import { BusinessBranchesSection } from '@/components/admin/businesses/branches/BusinessBranchesSection';
import type {
  BranchRow as AdminBranchRow,
} from '@/components/admin/businesses/branches/types';
import { getBusinessProfileHref, isReservedUsername, normalizeUsername } from '@/lib/business/profileHref';
import {
  TIERS as tiers,
  reverseGeocode,
  exportBusinessesCsv as exportCSV,
} from './businesses/_shared';
import { BusinessTableView, type BusinessTableRow } from './businesses/BusinessTableView';
import { BusinessCardView, type BusinessCardRow } from './businesses/BusinessCardView';
import { BusinessCreatePanel } from '@/components/admin/businesses/create/BusinessCreatePanel';
import { emptyCreateBusinessForm } from '@/components/admin/businesses/create/createFormDefaults';
import {
  computeBusinessStats,
  computeTierDistribution,
  computeTranslationCompleteness,
  filterAndSortBusinesses,
} from './businesses/businessListDerivations';
import {
  toSavedViewParams,
  type BizViewFilters,
} from './businesses/businessSavedViews';
import { useBranchNameTranslator } from './businesses/useBranchNameTranslator';
import { mapBranchRowToForm } from './businesses/mapBranchRowToForm';
import { buildAdminCreateBusinessMutationOptions } from './businesses/adminCreateBusinessMutation';
import { logAdminBusinessAction } from './businesses/logAdminBusinessAction';
import { useBusinessBranchFormState, buildBranchPayload } from './businesses/hooks/useBusinessBranchFormState';

type AdminBusinessRow = Partial<Database['public']['Tables']['businesses']['Row']> & {
  id: string;
  user_id: string;
  username: string | null;
  name_ar: string;
  ref_id: string | null;
  created_at: string;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  is_demo?: boolean | null;
  approval_status?: string | null;
  rating_avg: number | null;
  rating_count: number | null;
} & AdminBusinessImageColumns;

const AdminBusinesses = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const {
    searchParams,
    setSearchParams,
    search,
    searchInput,
    setSearchInput,
    filterStatus,
    filterTier,
    selectedTiers,
    filterTranslation,
    filterOrigin,
    sortBy,
    page,
    viewMode,
    updateParam,
    setSearch,
    setFilterStatus,
    setFilterTier,
    toggleTier,
    clearTiers,
    setFilterOrigin,
    setSortBy,
    setViewMode,
    setPage,
    applyBusinessesPreset,
    activeBusinessesPreset,
    PAGE_SIZE,
  } = useAdminBusinessesUrlState();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSelected = () => setSelected(new Set());
  const [editingBiz, setEditingBiz] = useState<AdminBusinessRow | null>(null);
  const [editForm, setEditForm] = useState<AdminEditBusinessFormState>({});
  const [viewingBiz, setViewingBiz] = useState<BusinessDrawerRow | null>(null);
  // ── Create new business (admin) ──
  // Factory + panel were extracted in Phase 5F to
  // `src/components/admin/businesses/create/`. Form state, mutations
  // and validation continue to live in this page.
  const [creatingBiz, setCreatingBiz] = useState(false);
  const [createForm, setCreateForm] = useState<AdminCreateBusinessFormState>(emptyCreateBusinessForm());
  const [servicesPanel, setServicesPanel] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newService, setNewService] = useState({ name_ar: '', name_en: '', description_ar: '', description_en: '', price_from: '', price_to: '', is_active: true });
  const [geocoding, setGeocoding] = useState(false);
  const {
    branchForm,
    setBranchForm,
    editingBranchId,
    setEditingBranchId,
    emptyBranch,
  } = useBusinessBranchFormState();
  const { branchTranslating, translateBranchName } = useBranchNameTranslator(
    branchForm,
    setBranchForm,
  );
  const [isPending, startTransition] = useTransition();
  const [verifyConfirm, setVerifyConfirm] = useState<{ id: string; name: string; value: boolean } | null>(null);
  // Control-center tabs (Phase 1: overview + businesses are real; rest are coming-next).
  const [activeTab, setActiveTab] = useState<BusinessAdminTabId>(DEFAULT_BUSINESS_ADMIN_TAB);

  const setField = useCallback((key: string, value: unknown) =>
    setEditForm((f) => ({ ...f, [key]: value }) as AdminEditBusinessFormState), []);

  // When a workflow panel (create / edit / services) is open we collapse
  // the heavy header, KPI strip, approvals banner and tier distribution
  // so the active task gets full vertical priority at the top of the page.
  const panelOpen = creatingBiz || !!editingBiz || !!servicesPanel;
  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const setServiceField = useCallback(
    (key: string, value: string | number | boolean | null) =>
      setNewService((s) => ({ ...s, [key]: value })),
    [],
  );

  /* ─── Queries ─── */
  const { data: businesses = [], isLoading, refetch: refetchBusinesses } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<Database['public']['Tables']['businesses']['Row']>({
        // Sensitive cols (national_id, approval_notes, cr_*) excluded —
        // column-level GRANTs block them for the authenticated role.
        // Loaded on demand via getBusinessSensitiveFields when editing.
        select: BUSINESS_SAFE_COLUMNS_SELECT,
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return data;
    },
  });

  /* ─── Consume ?focus=<biz_id> after businesses load → open inline edit panel ─── */
  const focusParam = searchParams.get('focus');
  const openEditRef = useRef<(b: Record<string, unknown>) => void>(() => {});
  const lastConsumedFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusParam || !businesses?.length) return;
    if (lastConsumedFocusRef.current === focusParam) return;
    const target = (businesses as Array<Record<string, unknown>>).find(
      (b) => b.id === focusParam || b.ref_id === focusParam,
    );
    if (target) {
      lastConsumedFocusRef.current = focusParam;
      openEditRef.current(target);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('focus');
        return next;
      }, { replace: true });
      setTimeout(() => {
        document.getElementById(`biz-row-${target.id as string}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [focusParam, businesses, setSearchParams]);

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

  const normalizedEditingUsername = normalizeUsername(editingBiz?.username);
  const { data: publicVisibilityProbe = null, refetch: refetchPublicVisibilityProbe } = useQuery({
    queryKey: ['admin-business-public-visibility-probe', editingBiz?.id, normalizedEditingUsername],
    queryFn: async () => {
      if (!editingBiz?.id || !normalizedEditingUsername) return null;
      const { data } = await supabase
        .from('businesses_public')
        .select('id, username')
        .eq('username', normalizedEditingUsername)
        .maybeSingle();
      return (data ?? null) as PublicVisibilityProbeRow | null;
    },
    enabled: !!editingBiz?.id,
  });

  const { data: publicUsernameDuplicateCount = 0, refetch: refetchPublicUsernameDuplicateCount } = useQuery({
    queryKey: ['admin-business-public-username-duplicates', editingBiz?.id, normalizedEditingUsername],
    queryFn: async () => {
      if (!editingBiz?.id || !normalizedEditingUsername) return 0;
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .ilike('username', normalizedEditingUsername)
        .neq('id', editingBiz.id);
      return count ?? 0;
    },
    enabled: !!editingBiz?.id,
  });

  const { data: contractBusinessIds = [] } = useQuery({
    queryKey: ['contract-business-ids'],
    queryFn: async () => {
      const { data } = await listDistinctContractBusinessIds();
      return [...new Set((data || []).map((c) => c.business_id).filter(Boolean))];
    },
  });

  /* ─── Mutations ─── */
  const logAction = useCallback(
    (action: string, entityId: string, details: Record<string, unknown>) =>
      logAdminBusinessAction(user!.id, action, entityId, details),
    [user],
  );

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

  const publishBusinessMutation = useMutation({
    mutationFn: async (business: AdminBusinessRow) => {
      const existingUsername = normalizeUsername(business.username);
      const generatedUsername = existingUsername || generateBusinessUsernameCandidate(business);
      if (!generatedUsername) {
        throw new Error(pickBi(isRTL, 'أضف اسمًا إنجليزيًا أو رابطًا عامًا صالحًا قبل النشر.', 'Add an English name or a valid public handle before publishing.'));
      }
      if (isReservedUsername(generatedUsername)) {
        throw new Error(pickBi(isRTL, `الرابط ${generatedUsername} محجوز للنظام. اختر رابطًا آخر.`, `The handle ${generatedUsername} is reserved. Choose another handle.`));
      }
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .ilike('username', generatedUsername)
        .neq('id', business.id);
      if ((count ?? 0) > 0) {
        throw new Error(pickBi(isRTL, `الرابط ${generatedUsername} مستخدم بالفعل. اختر رابطًا آخر.`, `The handle ${generatedUsername} is already used. Choose another handle.`));
      }
      const payload = createAdminPublishPayload(generatedUsername);
      const { error } = await updateBusinessById({ id: business.id, values: payload });
      if (error) throw error;
      await logAction('business_published_for_public_profile', business.id, {
        username: generatedUsername,
        route_source: 'username',
      });
      return { username: generatedUsername };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      await Promise.all([refetchPublicVisibilityProbe(), refetchPublicUsernameDuplicateCount()]);
      setEditingBiz((prev) => prev
        ? {
            ...prev,
            username: result.username,
            approval_status: 'published',
            is_active: true,
            is_demo: false,
            username_status: 'approved',
            is_verified: true,
          }
        : prev);
      toast.success(pickBi(isRTL, 'تم نشر الجهة للعامة', 'Business published publicly'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : pickBi(isRTL, 'فشل نشر الجهة', 'Publish failed'));
    },
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
      const efImg = editForm as AdminBusinessImageColumns;
      const nextUsername = normalizeUsername(editForm.username ?? editingBiz.username);
      if (!nextUsername) {
        throw new Error(pickBi(isRTL, 'اسم الرابط العام مطلوب', 'Public handle is required'));
      }
      if (isReservedUsername(nextUsername)) {
        throw new Error(pickBi(isRTL, `الرابط ${nextUsername} محجوز للنظام. اختر رابطًا آخر.`, `The handle ${nextUsername} is reserved. Choose another handle.`));
      }
      if (nextUsername !== normalizeUsername(editingBiz.username)) {
        const { count } = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .ilike('username', nextUsername)
          .neq('id', id);
        if ((count ?? 0) > 0) {
          throw new Error(pickBi(isRTL, `الرابط ${nextUsername} مستخدم بالفعل. اختر رابطًا آخر.`, `The handle ${nextUsername} is already used. Choose another handle.`));
        }
      }
      const payload: Record<string, unknown> = {
        username: nextUsername,
        name_ar: editForm.name_ar, name_en: editForm.name_en || null,
        short_description_ar: editForm.short_description_ar || null, short_description_en: editForm.short_description_en || null,
        description_ar: editForm.description_ar || null, description_en: editForm.description_en || null,
        phone: editForm.phone || null, email: editForm.email || null, website: editForm.website || null,
        address: editForm.address || null,
        // national_id is owner+admin-only via column-level GRANT —
        // written via updateBusinessSensitiveFields RPC below.
        additional_number: editForm.additional_number || null, region: editForm.region || null,
        district: editForm.district || null, street_name: editForm.street_name || null,
        building_number: editForm.building_number || null, latitude: editForm.latitude || null,
        longitude: editForm.longitude || null,
        // Phase 5: category_id intentionally NOT written from admin edit.
        // Classification is managed via BusinessTaxonomySection (taxonomy-only).
        country_id: editForm.country_id || null, city_id: editForm.city_id || null,
        logo_url: editForm.logo_url || null, cover_url: editForm.cover_url || null,
        // Phase 2.2 image-pipeline link columns (admin edit). Null-safe.
        logo_image_asset_id: efImg.logo_image_asset_id || null,
        cover_image_asset_id: efImg.cover_image_asset_id || null,
        logo_image_variants: efImg.logo_image_variants || null,
        cover_image_variants: efImg.cover_image_variants || null,
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
      // Sensitive cols (national_id) must go through the owner+admin-only RPC.
      const { error: sensErr } = await updateBusinessSensitiveFields(id, {
        national_id: editForm.national_id || null,
      });
      if (sensErr) throw sensErr;
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
      return { username: nextUsername };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(pickBi(isRTL, 'تم حفظ التعديلات', 'Changes saved'));
      if (result?.username) {
        setEditingBiz((prev) => prev ? ({ ...prev, username: result.username }) : prev);
      }
      setEditingBiz(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ─── Create business mutation ─── */
  const createFormRef = useRef(createForm);
  createFormRef.current = createForm;
  const createBizMutation = useMutation(
    buildAdminCreateBusinessMutationOptions({
      getForm: () => createFormRef.current,
      setForm: setCreateForm,
      setCreating: setCreatingBiz,
      isRTL,
      logAction,
      openEdit: (row) => openEditRef.current(row),
      queryClient,
    }),
  );

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
      const payload: PortfolioItemInsert = {
        business_id: editingBiz.id,
        title_ar: 'صورة',
        media_url: url,
        media_type: 'image',
      };
      const { error } = await supabase.from('portfolio_items').insert(payload);
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

  const saveBranchMutation = useMutation({
    mutationFn: async () => {
      if (!branchForm || !editingBiz) return;
      const wantsMain = !!branchForm.is_main;
      const payload = buildBranchPayload(branchForm, editingBiz.id);
      let targetBranchId = editingBranchId as string | null;
      if (editingBranchId) {
        const { error } = await updateBusinessBranchById(editingBranchId, payload as never);
        if (error) throw error;
      } else {
        // Insert without is_main; if wantsMain we promote via RPC below.
        const { data, error } = await insertBusinessBranchReturning(payload as never, 'id', 'single');
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

  /** Bulk-apply working-hours from the currently-edited branch to every
   *  other branch of the SAME business. Scoped via the branches list we
   *  already loaded for this business — never crosses into other tenants. */
  const applyHoursToAllBranchesMutation = useMutation({
    mutationFn: async (hours: unknown) => {
      if (!editingBiz?.id) return { updated: 0, errors: [] as Error[] };
      const targets = (branches as Array<{ id: string }>)
        .map((b) => b.id)
        .filter((id) => id !== editingBranchId);
      const { applyHoursToAllBranches } = await import(
        '@/modules/businesses/services/workingHours'
      );
      return applyHoursToAllBranches({
        businessId: editingBiz.id,
        hours: hours as never,
        branchIds: (branches as Array<{ id: string }>).map((b) => b.id),
        excludeBranchId: editingBranchId ?? undefined,
      }).then((r) => ({ ...r, targetCount: targets.length }));
    },
    onSuccess: (result) => {
      refetchBranches();
      if (!result || result.updated === 0) {
        toast.info(
          pickBi(isRTL, 'لا توجد فروع أخرى لتطبيق الساعات عليها.', 'No other branches to apply hours to.'),
        );
        return;
      }
      toast.success(
        pickBi(
          isRTL,
          `تم تطبيق الساعات على ${result.updated} فرع/فروع.`,
          `Hours applied to ${result.updated} branch(es).`,
        ),
      );
      if (result.errors.length > 0) {
        toast.error(result.errors[0].message);
      }
    },
    onError: (err: Error) => toast.error(err.message),
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
        setCreateForm(emptyCreateBusinessForm()); setCreatingBiz(true);
        scrollToTop();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        refetchBusinesses();
        toast.success(pickBi(isRTL, 'تم التحديث', 'Refreshed'));
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        exportCSV(filteredRef.current as AdminBusinessCsvRow[], language);
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
      setEditForm((prev) => ({
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
  const openEdit = async (biz: Record<string, unknown>) => {
    setServicesPanel(null);
    // Fetch sensitive cols (national_id) via owner+admin-only RPC since
    // the bulk list no longer carries them.
    const bizId = (biz.id as string | undefined) ?? '';
    let nationalIdValue = '';
    if (bizId) {
      const { getBusinessSensitiveFields } = await import('@/modules/businesses');
      const { data: sens } = await getBusinessSensitiveFields(bizId);
      nationalIdValue = sens?.national_id ?? '';
    }
    const bizImg = biz as AdminBusinessImageColumns;
    setEditForm({
      username: (biz.username as string | null) || '',
      name_ar: biz.name_ar, name_en: biz.name_en || '',
      short_description_ar: biz.short_description_ar || '', short_description_en: biz.short_description_en || '',
      description_ar: biz.description_ar || '', description_en: biz.description_en || '',
      phone: biz.phone || '', email: biz.email || '', website: biz.website || '',
      address: biz.address || '',
      country_id: biz.country_id || '', city_id: biz.city_id || '',
      logo_url: biz.logo_url || '', cover_url: biz.cover_url || '',
      logo_image_asset_id: bizImg.logo_image_asset_id || null,
      cover_image_asset_id: bizImg.cover_image_asset_id || null,
      logo_image_variants: bizImg.logo_image_variants || null,
      cover_image_variants: bizImg.cover_image_variants || null,
      seo_title_ar: biz.seo_title_ar || '', seo_title_en: biz.seo_title_en || '',
      seo_description_ar: biz.seo_description_ar || '', seo_description_en: biz.seo_description_en || '',
      seo_keywords: Array.isArray(biz.seo_keywords) ? biz.seo_keywords.join(', ') : '',
      og_image: biz.og_image || '',
      national_id: nationalIdValue, additional_number: biz.additional_number || '',
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
    } as AdminEditBusinessFormState);
    setEditingBiz(biz as AdminBusinessRow);
    scrollToTop();
  };
  useEffect(() => { openEditRef.current = openEdit; });

  const openServices = (bizId: string) => {
    setEditingBiz(null);
    setServicesPanel(bizId);
    scrollToTop();
  };

  /* ─── Filters / derivations (pure helpers in businessListDerivations) ─── */
  const translationCompleteness = useCallback(
    (b: Parameters<typeof computeTranslationCompleteness>[0]) =>
      computeTranslationCompleteness(b),
    [],
  );

  const filtered = useMemo(
    () =>
      filterAndSortBusinesses(businesses, {
        search,
        filterStatus,
        selectedTiers,
        filterTranslation,
        filterOrigin,
        sortBy,
        language: language === 'ar' ? 'ar' : 'en',
        contractBusinessIds,
      }),
    [
      businesses,
      search,
      filterStatus,
      selectedTiers,
      filterTranslation,
      filterOrigin,
      sortBy,
      language,
      contractBusinessIds,
    ],
  );

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

  const stats = useMemo(
    () => computeBusinessStats(businesses, contractBusinessIds),
    [businesses, contractBusinessIds],
  );

  const tierDistribution = useMemo(
    () => computeTierDistribution(businesses, tiers),
    [businesses],
  );

  const filteredCities = editForm.country_id
    ? cities.filter((c) => c.country_id === editForm.country_id)
    : cities;
  const editCityName = cities.find((c) => c.id === editForm.city_id);

  /* ─── Saved Views (per-admin localStorage) ─── */
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
    const sp = toSavedViewParams(f);
    setSearchInput(f.q || '');
    setSearchParams(sp, { replace: false });
  };

  return (
    <AdminBusinessesPageShell>
        <AdminPageHeader
          tone="accent"
          icon={Building2}
          eyebrow={pickBi(isRTL, 'لوحة الإدارة', 'Admin Console')}
          breadcrumbs={[
            { label: pickBi(isRTL, 'الإدارة', 'Admin'), href: '/admin' },
            { label: pickBi(isRTL, 'إدارة الجهات والمزودين', 'Businesses & Providers') },
          ]}
          title={pickBi(isRTL, 'إدارة الجهات والمزودين', 'Businesses & Providers Control Center')}
          subtitle={panelOpen ? undefined : pickBi(
            isRTL,
            'مركز موحد لمراجعة الجهات، إدارة المزودين، متابعة الظهور العام، وجاهزية التشغيل.',
            'Unified center to review businesses, manage providers, track public visibility & pilot readiness.',
          )}
          actions={
            <BusinessHeaderActions
              isRTL={isRTL}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onRefresh={() => { refetchBusinesses(); toast.success(pickBi(isRTL, 'تم التحديث', 'Refreshed')); }}
              onExportCsv={() => exportCSV(filtered, language)}
              onCreate={() => { setEditingBiz(null); setServicesPanel(null); setCreateForm(emptyCreateBusinessForm()); setCreatingBiz(true); scrollToTop(); }}
              savedViewsSlot={
                <SavedViewsMenu
                  views={savedViews.views}
                  currentFilters={currentViewFilters}
                  onApply={applySavedView}
                  onSave={savedViews.save}
                  onRemove={savedViews.remove}
                />
              }
            />
          }
          /* Header KPI strip removed (Hard-Fix): identical counts now
             live in a single place — the Overview tab — so they no
             longer duplicate the header. */
        />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as BusinessAdminTabId)}
          className="space-y-4"
        >
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 rounded-2xl bg-muted/60">
            {BUSINESS_ADMIN_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="gap-1.5 rounded-xl text-xs md:text-sm data-[state=active]:bg-card"
                  data-testid={`business-control-center-tab-${t.id}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {pickBi(isRTL, t.labelAr, t.labelEn)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <ControlCenterOverviewTab
              businesses={businesses}
              isRTL={isRTL}
              onQuickAction={(key: QuickActionKey) => {
                setActiveTab('businesses');
                applyBusinessesPreset(
                  key === 'pilotReady' ? 'pilotReady'
                  : key === 'pendingReview' ? 'pendingReview'
                  : key === 'missingContact' ? 'missingContact'
                  : 'missingPublicLink',
                );
              }}
            />
          </TabsContent>

          <TabsContent value="providers" className="mt-0">
            <ControlCenterProvidersTab
              businesses={businesses}
              isRTL={isRTL}
              onJumpToBusiness={(b) => {
                setActiveTab('businesses');
                const q = b.ref_id || b.username || '';
                if (q) { setSearchInput(q); updateParam({ q, page: null }); }
              }}
            />
          </TabsContent>

          <TabsContent value="taxonomies" className="mt-0">
            <ControlCenterTaxonomiesTab businesses={businesses} isRTL={isRTL} />
          </TabsContent>

          <TabsContent value="quality" className="mt-0">
            <ControlCenterQualityTab
              businesses={businesses}
              isRTL={isRTL}
              onJumpToBusiness={(b) => {
                setActiveTab('businesses');
                const q = b.ref_id || b.username || '';
                if (q) { setSearchInput(q); updateParam({ q, page: null }); }
              }}
            />
          </TabsContent>

          <TabsContent value="businesses" className="mt-0 space-y-4">
            {!panelOpen && (
              <BusinessesCommandBar
                isRTL={isRTL}
                activePreset={activeBusinessesPreset}
                onPreset={applyBusinessesPreset}
                onCreate={() => {
                  setEditingBiz(null);
                  setServicesPanel(null);
                  setCreateForm(emptyCreateBusinessForm());
                  setCreatingBiz(true);
                  scrollToTop();
                }}
              />
            )}

        {/* ─── Filters + Bulk Actions ─── */}
        {!panelOpen && (
          <BusinessFiltersBar
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
            selectedCount={selected.size}
            onBulkSetActive={(active) => bulkMutation.mutate({ ids: [...selected], patch: { is_active: active } })}
            onBulkSetVerified={(verified) => bulkMutation.mutate({ ids: [...selected], patch: { is_verified: verified } })}
            onBulkChangeTier={async (v) => {
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
            onBulkClear={clearSelected}
          />
        )}

        {/* ─── Inline Create Panel ─── */}
        {creatingBiz && (
          <BusinessCreatePanel
            isRTL={isRTL}
            language={language}
            form={createForm}
            setForm={setCreateForm}
            onClose={() => { setCreatingBiz(false); setCreateForm(emptyCreateBusinessForm()); }}
            onSubmit={() => createBizMutation.mutate()}
            isSubmitting={createBizMutation.isPending}
          />
        )}

        {/* ─── Inline Edit Panel ─── */}
        {editingBiz && (
          <BusinessEditPanel
            isRTL={isRTL}
            editingBiz={editingBiz}
            contractBusinessIds={contractBusinessIds}
            translationStatus={translationCompleteness(editForm)}
            autoFillTranslations={autoFillTranslations}
            autoTranslating={autoTranslating}
            branchCount={branches.length}
            onClose={() => setEditingBiz(null)}
            infoTab={<>
              <BusinessPublicVisibilityCard
                business={editingBiz}
                publicProbe={publicVisibilityProbe}
                duplicateCount={publicUsernameDuplicateCount}
                isRTL={isRTL}
                isPublishing={publishBusinessMutation.isPending}
                onPublish={(b) => publishBusinessMutation.mutate(b as AdminBusinessRow)}
              />
              <BusinessBasicInfoSection
                editForm={editForm}
                setField={setField}
                isRTL={isRTL}
                editingBiz={editingBiz}
                ownerRef={ownerRef}
                onTaxonomySaved={() => queryClient.invalidateQueries({ queryKey: ['admin-businesses'] })}
              />
            </>}
            ownerTab={
              <BusinessOwnerSectionShell
                businessId={editingBiz.id}
                businessRef={editingBiz.ref_id ?? null}
                ownerUserId={editingBiz.user_id}
                isRTL={isRTL}
                onOwnerReassigned={() => setEditingBiz(null)}
              />
            }
            contentTab={<BusinessContentSection editForm={editForm} setField={setField} isRTL={isRTL} />}
            mediaTab={
              <BusinessMediaSection
                editForm={editForm}
                setField={setField}
                isRTL={isRTL}
                portfolioData={portfolioData}
                onAddPortfolio={(url) => addPortfolioMutation.mutate(url)}
                onDeletePortfolio={(id) => deletePortfolioMutation.mutate(id)}
              />
            }
            seoTab={
              <BusinessSeoSection
                editForm={editForm}
                setField={setField}
                isRTL={isRTL}
                editingBiz={editingBiz}
                cityName={editCityName}
              />
            }
            contactTab={
              <BusinessContactSection
                editForm={editForm}
                setField={setField}
                isRTL={isRTL}
                language={language as 'ar' | 'en'}
                editingBiz={editingBiz}
                registeredServices={allServices}
                onManageServices={() => { setEditingBiz(null); openServices(editingBiz.id); }}
              />
            }
            branchesTab={
              <BusinessBranchesSection
                isRTL={isRTL}
                language={language as 'ar' | 'en'}
                branches={branches as unknown as AdminBranchRow[]}
                branchForm={branchForm}
                setBranchForm={setBranchForm}
                editingBranchId={editingBranchId}
                setEditingBranchId={setEditingBranchId}
                branchTranslating={branchTranslating}
                onTranslate={translateBranchName}
                countries={countries}
                onToggleActive={(id, next) => toggleBranchMutation.mutate({ id, is_active: next })}
                onEdit={(br) => { setEditingBranchId(br.id); setBranchForm(mapBranchRowToForm(br)); }}
                onDelete={(id) => deleteBranchMutation.mutate(id)}
                onSave={() => saveBranchMutation.mutate()}
                saving={saveBranchMutation.isPending}
                emptyBranch={emptyBranch}
                mainContact={{
                  unified_number: editForm.unified_number ?? editingBiz.unified_number ?? null,
                  customer_service_phone:
                    editForm.customer_service_phone ?? editingBiz.customer_service_phone ?? null,
                  email: editForm.email ?? editingBiz.email ?? null,
                  website: editForm.website ?? editingBiz.website ?? null,
                }}
                onApplyHoursToAllBranches={(hours) => applyHoursToAllBranchesMutation.mutate(hours as unknown)}
                applyingHoursToAllBranches={applyHoursToAllBranchesMutation.isPending}
              />
            }
            controlsTab={
              <BusinessControlsSection
                editForm={editForm}
                setField={setField}
                isRTL={isRTL}
                language={language as 'ar' | 'en'}
                tiers={tiers}
              />
            }
            opsTab={<BusinessOperationsSection businessId={editingBiz.id} />}
            footer={
              <BusinessEditActionsFooter
                isRTL={isRTL}
                canSave={!!editForm.name_ar}
                saving={updateBizMutation.isPending}
                onSave={() => updateBizMutation.mutate()}
                onCancel={() => setEditingBiz(null)}
              />
            }
          />
        )}

        {/* ─── Inline Services Panel ─── */}
        {servicesPanel && (
          <BusinessServicesPanel
            isRTL={isRTL}
            language={language}
            services={services as unknown as ReadonlyArray<AdminServiceLite>}
            newService={newService as AdminNewServiceFormState}
            setServiceField={(key, value) => setServiceField(key as string, value)}
            isAdding={addServiceMutation.isPending}
            onClose={() => setServicesPanel(null)}
            onAdd={() => addServiceMutation.mutate()}
            onToggleActive={(id, isActive) => toggleServiceMutation.mutate({ id, is_active: isActive })}
            onDelete={(id) => deleteServiceMutation.mutate(id)}
          />
        )}

        {/* ─── Business List ─── */}
        {!panelOpen && (
          <BusinessTableSection
            isLoading={isLoading}
            filteredLength={filtered.length}
            paged={paged as unknown as ReadonlyArray<Record<string, unknown>>}
            viewMode={viewMode}
            language={language}
            isRTL={isRTL}
            selected={selected}
            allPagedSelected={allPagedSelected}
            toggleSelect={toggleSelect}
            togglePageAll={togglePageAll}
            translationCompleteness={(b) => translationCompleteness(b)}
            contractBusinessIds={contractBusinessIds}
            allServices={allServices}
            onEdit={(b) => openEdit(b as unknown as Record<string, unknown>)}
            onOpenServices={openServices}
            onView={(b) => setViewingBiz(b as unknown as BusinessDrawerRow)}
            onTierChange={(id, tier) => tierMutation.mutate({ id, tier: tier as MembershipTier })}
            onApprovalChange={(id, status) => approvalStatusMutation.mutate({ id, status })}
            onVerifyToggle={(id, name, currentVerified) => setVerifyConfirm({ id, name, value: !currentVerified })}
            onActiveToggle={(id, currentActive) => toggleMutation.mutate({ id, field: 'is_active', value: !currentActive })}
            hasActiveFilters={!!(search || filterStatus !== 'all' || selectedTiers.length > 0)}
            onClearFilters={() => { setSearch(''); setFilterStatus('all'); clearTiers(); }}
            safePage={safePage}
            pageSize={PAGE_SIZE}
          />
        )}

        {!panelOpen && !isLoading && filtered.length > 0 && (
          <BusinessPaginationFooter
            isRTL={isRTL}
            safePage={safePage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            filteredLength={filtered.length}
            totalBusinesses={businesses.length}
            activeCount={stats.active}
            verifiedCount={stats.verified}
            onPageChange={setPage}
          />
        )}
          </TabsContent>
        </Tabs>

        <BusinessVerifyConfirmDialog
          isRTL={isRTL}
          payload={verifyConfirm}
          onCancel={() => setVerifyConfirm(null)}
          onConfirm={(p) => {
            toggleMutation.mutate({ id: p.id, field: 'is_verified', value: p.value });
            setVerifyConfirm(null);
          }}
        />
        {/* ─── Read-only Details Drawer ─── */}
        <BusinessDetailsDrawer
          business={viewingBiz}
          isRTL={isRTL}
          hasContracts={!!viewingBiz && contractBusinessIds.includes(viewingBiz.id)}
          onClose={() => setViewingBiz(null)}
          onEdit={(b) => {
            setViewingBiz(null);
            openEdit(b as unknown as Record<string, unknown>);
          }}
          onOpenServices={(id) => { setViewingBiz(null); openServices(id); }}
        />
    </AdminBusinessesPageShell>
  );
};

export default AdminBusinesses;
