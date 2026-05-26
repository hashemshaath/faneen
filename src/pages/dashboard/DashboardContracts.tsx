import React, { useState, useMemo, useCallback, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listActiveContractTemplates, notifyClientInvitation } from '@/modules/contracts';
import { getOwnerBusiness } from '@/modules/businesses';
import { getProfileByEmail } from '@/modules/users';
import { createNotification, createNotificationFireAndForget } from '@/modules/notifications/services/createNotification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mapContractLockError, mapContractCreateError } from '@/lib/contract-errors';
import { dispatchAmendmentEvent } from '@/lib/amendment-notify';
import {
  listContractsForRole,
  getContractParticipantProfiles,
} from '@/modules/contracts/services/list';
import {
  listMilestonesForContracts,
  listNotesForContracts,
  listAttachmentsForContracts,
  listInstallmentPaymentsForContracts,
  listMeasurementsForContracts,
  listWarrantiesForContracts,
  listMaintenanceRequestsForContracts,
  listAmendmentsForContracts,
  listLineItemsForContracts,
} from '@/modules/contracts/services/aggregates';
import {
  acceptContract,
  sendContractForApproval,
  cloneContractAsDraft,
  recalcContractTotal,
  setContractExecutionSite,
  linkLeadToContract,
  completeContractFromInvitation,
} from '@/modules/contracts/services/mutations';
import { updateContractById } from '@/modules/contracts/services/updateContractById';
import { createContractFromTemplate } from '@/modules/contracts/services/createContractFromTemplate';
import {
  uploadContractAttachmentFile,
  getContractAttachmentPublicUrl,
} from '@/modules/contracts/services/attachments';
import {
  createContractNote,
  createContractMeasurement,
  createContractMilestone,
  updateContractMilestone,
  createContractAttachment,
  getInstallmentPlanIdForContract,
  createInstallmentPlan,
  createInstallmentPayments,
  updateInstallmentPayment,
} from '@/modules/contracts/services/childTables';
import { approveAmendment } from '@/modules/contracts/services/amendments';
import { prepareContractPrefillFromLead } from '@/modules/contracts/services/leadRpcs';
import {
  createClientInvitation,
  resendClientInvitation,
  cancelClientInvitation,
} from '@/modules/contracts/services/invitations';
import {
  FileText, Eye, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
  Shield, DollarSign, Calendar, Users, ListChecks, StickyNote,
  Send, Phone, Mail, ChevronDown, ChevronUp, Activity,
  BookOpen, X, Layers, Hammer, Wrench, Home, Factory,
  Flame, TreePine, GlassWater, Grid3X3, PanelTop,
  Download, Search, Loader2, Copy, Sparkles, ArrowRight,
  Paperclip, TrendingUp, BarChart3, CreditCard, Receipt,
  CalendarDays, MapPin, Building2, Hash, Timer,
  CircleDot, Banknote, FileCheck, Share2,
  Ruler, ClipboardList, ShieldCheck, WrenchIcon, Upload,
  Zap, Target, PieChart, ArrowUpRight, ArrowDownRight,
  Star, Filter, LayoutGrid, List, MoreHorizontal,
  RefreshCw, Edit3, ExternalLink, CircleCheck,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ContractExportData } from '@/lib/contract-pdf-export';
import type { Database } from '@/integrations/supabase/types';
import { getContractStatusMeta, isContractLockedByStatus } from '@/lib/contract-statuses';
import {
  calculateVatBreakdown, calculateLineItemsTotal, calculateMeasurementsTotal,
  calculateLineVatBreakdown, sumLineVatBreakdowns, formatVatHandlingLabel,
} from '@/lib/contract-financials';
import { calculateLineTotal, formatPricingMethodLabel, formatUnitOfMeasure, SUPPORTED_PRICING_METHODS, type PricingMethod } from '@/lib/contract-pricing';
import {
  BOQ_GROUPS,
  groupLineItemsByBoqGroup,
  hasMixedPricing,
  listPricingMethodsUsed,
  getWorkTypeBoqPresets,
  dedupeStarterRows,
  type BoqGroupKey,
} from '@/lib/contract-boq';
import { ClientPicker, type SelectedClient, type GuestClient } from '@/components/contracts/ClientPicker';
import { LineItemFormSection } from '@/components/contracts/dashboard/create/LineItemFormSection';
import { SuggestedBOQPanel } from '@/components/contracts/dashboard/create/SuggestedBOQPanel';
import { ContractFinancialSummary, ContractLineVatBreakdown } from '@/components/contracts/dashboard/ContractBoqVatSummary';
import { ContractApprovalTimeline } from '@/components/contracts/dashboard/ContractApprovalTimeline';
import { WorkTypeSection } from '@/components/contracts/dashboard/create/WorkTypeSection';
import { TemplateSelectionSection } from '@/components/contracts/dashboard/create/TemplateSelectionSection';
import { ContractDetailsSection } from '@/components/contracts/dashboard/create/ContractDetailsSection';
import { VatSettingsSection } from '@/components/contracts/dashboard/create/VatSettingsSection';
import { SupervisorSection } from '@/components/contracts/dashboard/create/SupervisorSection';
import { ContractTermsSection } from '@/components/contracts/dashboard/create/ContractTermsSection';
import { ContractImportPanel, type ContractExtract } from '@/components/contracts/dashboard/import/ContractImportPanel';
import type { ContractForm } from '@/components/contracts/dashboard/create/contract-form-types';
import { ContractRoleTabs } from '@/components/contracts/dashboard/ContractRoleTabs';
import { ContractFilters } from '@/components/contracts/dashboard/ContractFilters';
import { ContractEmptyState } from '@/components/contracts/dashboard/ContractEmptyState';
import { ContractPageHeader } from '@/components/contracts/dashboard/ContractPageHeader';
import { ContractStatsSummary } from '@/components/contracts/dashboard/ContractStatsSummary';
import { ContractCard } from '@/components/contracts/dashboard/ContractCard';
import { ContractCompactRow } from '@/components/contracts/dashboard/ContractCompactRow';
import { ContractActiveFilters } from '@/components/contracts/dashboard/ContractActiveFilters';
import { getContractHealth } from '@/components/contracts/dashboard/contract-helpers';
import { ContractCreateStepper } from '@/components/contracts/dashboard/create/ContractCreateStepper';
import { ContractReviewSummary } from '@/components/contracts/dashboard/create/ContractReviewSummary';
import { ContractCompletenessCard } from '@/components/contracts/dashboard/create/ContractCompletenessCard';
import { calculateContractCompleteness } from '@/lib/contract-completeness';
import { ExecutionSiteSection, type ExecutionAddressSnapshot } from '@/components/contracts/dashboard/create/ExecutionSiteSection';
import { ContractDraftSaveStatus, type DraftSaveState } from '@/components/contracts/dashboard/create/ContractDraftSaveStatus';
import { FirstContractGuidanceCard } from '@/components/contracts/dashboard/create/FirstContractGuidanceCard';
import { AutosaveStatus } from '@/components/contracts/dashboard/create/AutosaveStatus';
import { useContractDraftAutosave } from '@/hooks/useContractDraftAutosave';
import {
  ContractCreateActionsBar,
  ContractCreateMobileActionBar,
} from '@/components/contracts/dashboard/create/ContractCreateActionsBar';
import {
  AcceptedInvitationsPanel,
  PendingInvitePanel,
  type AcceptedInvitationRow,
} from '@/components/contracts/dashboard/create/AcceptedInvitationsPanel';
import { getWorkType, pickTemplateForWorkType, type WorkTypeKey } from '@/lib/contract-work-types';
import { getStatusGuidance } from '@/lib/contract-status-guidance';
import { serializeDraftPayload, maskEmail as maskInviteEmail, type PendingInvite } from '@/lib/contract-invitations';
import type { Json } from '@/integrations/supabase/types';
import { templateCategoryConfig } from '@/modules/contracts/constants/templateCategories';
import { TemplateCard } from '@/modules/contracts/components/TemplateCard';
import { emptyForm } from '@/modules/contracts/constants/contractForm';

type ContractRow = Database['public']['Tables']['contracts']['Row'];
type MilestoneRow = Database['public']['Tables']['contract_milestones']['Row'];
type PaymentRow = Database['public']['Tables']['installment_payments']['Row'];
type TemplateRow = Database['public']['Tables']['contract_templates']['Row'];
type AmendmentRow = Database['public']['Tables']['contract_amendments']['Row'];
type ContractWithRole = ContractRow & { _role: string };

/* CT4 — published template version row used in the contract creation flow. */
interface PublishedTemplateOption {
  template_id: string;
  version_id: string;
  version_number: number;
  status: string;
  slug: string | null;
  category: string;
  name_ar: string;
  name_en: string | null;
  service_category_id: string | null;
  pricing_methods: string[];
  required_field_count: number;
}

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNoIndex } from "@/hooks/useNoIndex";
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';


type ViewSection = 'list' | 'create' | 'templates' | 'template-preview' | 'import';


/* ──────────── Main ──────────── */
const DashboardContracts = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'provider' | 'client'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSection, setViewSection] = useState<ViewSection>('list');
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templatePreview, setTemplatePreview] = useState<any | null>(null);
  /* CT4 — Selected published template version + pricing method for new contracts. */
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedPricingMethod, setSelectedPricingMethod] = useState<string | null>(null);
  /* CT4B — Client picker + work type selection. */
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [guestClient, setGuestClient] = useState<GuestClient | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeKey>('general');
  const [workTypeTouched, setWorkTypeTouched] = useState(false);
  /* CT4C.3 — Client invitation flow state. */
  const [inviteMode, setInviteMode] = useState<'idle' | 'composing' | 'awaiting'>('idle');
  const [inviteForm, setInviteForm] = useState<{ email: string; name: string; phone: string }>({ email: '', name: '', phone: '' });
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<any | null>(null);
  const [sendConfirm, setSendConfirm] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'health'>('date');
  const [showAddMeasurement, setShowAddMeasurement] = useState<string | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState<string | null>(null);
  const [showAddAmendment, setShowAddAmendment] = useState<string | null>(null);
  const [showAddMaintenance, setShowAddMaintenance] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null);
  const [showAddLineItem, setShowAddLineItem] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [measurementForm, setMeasurementForm] = useState({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title_ar: '', amount: '', due_date: '' });
  const [amendmentForm, setAmendmentForm] = useState({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ title_ar: '', description_ar: '', priority: 'normal' as string, scheduled_date: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', due_date: '', notes: '' });
  const [lineItemForm, setLineItemForm] = useState({
    name_ar: '',
    description_ar: '',
    quantity: '1',
    unit_price: '',
    item_type: 'service',
    pricing_method: 'unit' as PricingMethod,
    length_mm: '',
    width_mm: '',
    height_mm: '',
    weight_kg: '',
    weight_ton: '',
    amount: '',
    boq_group_key: 'other' as BoqGroupKey,
  });
  const [maintenanceImages, setMaintenanceImages] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const maintenanceImageRef = React.useRef<HTMLInputElement>(null);

  /* Provider Contract UX 2 — Part A: navigable stepper section refs. */
  type StepKey = 'client' | 'site' | 'work' | 'template' | 'details' | 'pricing' | 'review';
  const stepRefs = {
    client: React.useRef<HTMLDivElement>(null),
    site: React.useRef<HTMLDivElement>(null),
    work: React.useRef<HTMLDivElement>(null),
    template: React.useRef<HTMLDivElement>(null),
    details: React.useRef<HTMLDivElement>(null),
    pricing: React.useRef<HTMLDivElement>(null),
    review: React.useRef<HTMLDivElement>(null),
  } as const;
  const stepOrder: StepKey[] = ['client', 'site', 'work', 'template', 'details', 'pricing', 'review'];
  const [activeStep, setActiveStep] = useState<StepKey>('client');
  /* Phase 5C.3 — Execution site selection (held locally for new drafts;
     persisted via set_contract_execution_site for existing drafts). */
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  /* Phase 5B.4 — Lead → Contract prefill banner state. */
  type LeadPrefill = {
    lead_id: string;
    lead_ref_id: string | null;
    business_id: string | null;
    suggested_title: string | null;
    suggested_description: string | null;
    suggested_work_type: string | null;
    suggested_template_version_id: string | null;
    suggested_currency_code: string | null;
    customer_name: string | null;
    customer_email: string | null;
    client_profile_match: { user_id: string; display_name: string | null; verified: boolean } | null;
    existing_contract_id: string | null;
  };
  const [leadPrefill, setLeadPrefill] = useState<LeadPrefill | null>(null);
  const [leadPrefillDismissed, setLeadPrefillDismissed] = useState(false);
  const [leadClientConfirmed, setLeadClientConfirmed] = useState(false);
  const appliedLeadIdsRef = React.useRef<Set<string>>(new Set());
  const goToStep = useCallback((key: StepKey) => {
    setActiveStep(key);
    const el = stepRefs[key]?.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  /* ── Data Queries ── */
  const { data: providerContracts = [], isLoading: loadingProvider } = useQuery({
    queryKey: ['dashboard-contracts', 'provider', user?.id],
    queryFn: () => listContractsForRole({ userId: user!.id, role: 'provider' }),
    enabled: !!user,
  });

  const { data: clientContracts = [], isLoading: loadingClient } = useQuery({
    queryKey: ['dashboard-contracts', 'client', user?.id],
    queryFn: () => listContractsForRole({ userId: user!.id, role: 'client' }),
    enabled: !!user,
  });

  const isLoading = loadingProvider || loadingClient;

  const contracts = useMemo(() => {
    const seen = new Set<string>();
    const result: ContractWithRole[] = [];
    providerContracts.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); result.push({ ...c, _role: 'provider' }); } });
    clientContracts.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); result.push({ ...c, _role: 'client' }); } });
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [providerContracts, clientContracts]);

  const contractIds = useMemo(() => contracts.map((c) => c.id), [contracts]);

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['dashboard-milestones', contractIds],
    queryFn: () => listMilestonesForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['dashboard-contract-notes', contractIds],
    queryFn: () => listNotesForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allAttachments = [] } = useQuery({
    queryKey: ['dashboard-contract-attachments', contractIds],
    queryFn: () => listAttachmentsForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ['dashboard-contract-payments', contractIds],
    queryFn: () => listInstallmentPaymentsForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allMeasurements = [] } = useQuery({
    queryKey: ['dashboard-contract-measurements', contractIds],
    queryFn: () => listMeasurementsForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allWarranties = [] } = useQuery({
    queryKey: ['dashboard-contract-warranties', contractIds],
    queryFn: () => listWarrantiesForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allMaintenanceRequests = [] } = useQuery({
    queryKey: ['dashboard-contract-maintenance', contractIds],
    queryFn: () => listMaintenanceRequestsForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allAmendments = [] } = useQuery({
    queryKey: ['dashboard-contract-amendments', contractIds],
    queryFn: () => listAmendmentsForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  const { data: allLineItems = [] } = useQuery({
    queryKey: ['dashboard-contract-line-items', contractIds],
    queryFn: () => listLineItemsForContracts(contractIds),
    enabled: contractIds.length > 0,
  });

  // CT5D — allowed pricing methods per active contract template version.
  const contractTemplateVersionIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of contracts) {
      const v = (c as { template_version_id?: string | null }).template_version_id;
      if (v) set.add(v);
    }
    return Array.from(set);
  }, [contracts]);

  const { data: contractPricingRules = [] } = useQuery({
    queryKey: ['dashboard-contract-pricing-rules', contractTemplateVersionIds],
    queryFn: async () => {
      if (contractTemplateVersionIds.length === 0) return [];
      const { data } = await supabase
        .from('contract_template_pricing_rules')
        .select('version_id, method, vat_handling')
        .in('version_id', contractTemplateVersionIds);
      return data ?? [];
    },
    enabled: contractTemplateVersionIds.length > 0,
  });

  /** Map of template_version_id → allowed pricing methods (empty array if no rules configured). */
  const allowedMethodsByVersion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of contractPricingRules) {
      const list = map.get(r.version_id) ?? [];
      list.push(r.method);
      map.set(r.version_id, list);
    }
    return map;
  }, [contractPricingRules]);

  /**
   * CT5G.2 — Map of template_version_id → (pricing_method → vat_handling).
   * Used to derive per-line VAT breakdown for display only. Defaults to
   * 'inherit' when no rule is configured for a given (version, method).
   */
  const vatHandlingByVersionMethod = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const r of contractPricingRules as Array<{ version_id: string; method: string; vat_handling?: string | null }>) {
      const inner = map.get(r.version_id) ?? new Map<string, string>();
      inner.set(r.method, (r.vat_handling || 'inherit'));
      map.set(r.version_id, inner);
    }
    return map;
  }, [contractPricingRules]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['contract-profiles', contractIds],
    queryFn: async () => {
      const userIds = new Set<string>();
      contracts.forEach((c) => { userIds.add(c.client_id); userIds.add(c.provider_id); });
      return getContractParticipantProfiles(Array.from(userIds));
    },
    enabled: contracts.length > 0,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data } = await listActiveContractTemplates({ select: '*', orderBy: { column: 'sort_order' } });
      return data ?? [];
    },
    enabled: !!user,
  });

  /* CT4 — Published template versions only (for contract creation selector). */
  const { data: publishedVersions = [] } = useQuery<PublishedTemplateOption[]>({
    queryKey: ['contract-template-versions', 'published'],
    queryFn: async () => {
      const { data: versions, error } = await supabase
        // CT7B: provider-facing read — must use safe public view, not the
        // base table (which is now admin-only at the RLS layer).
        .from('contract_template_versions_public')
        .select('id, version_number, status, template_id, contract_templates!inner(id, slug, category, name_ar, name_en, service_category_id, is_active)')
        .eq('status', 'published')
        .order('version_number', { ascending: false });
      if (error) throw error;
      const versionIds = (versions ?? []).map((v: any) => v.id);
      const { data: rules } = versionIds.length
        ? await supabase.from('contract_template_pricing_rules').select('version_id, method').in('version_id', versionIds)
        : { data: [] as { version_id: string; method: string }[] };
      const { data: fields } = versionIds.length
        ? await supabase.from('contract_template_required_fields').select('version_id').in('version_id', versionIds)
        : { data: [] as { version_id: string }[] };
      const rulesByVer = new Map<string, string[]>();
      (rules ?? []).forEach((r: any) => {
        const arr = rulesByVer.get(r.version_id) ?? [];
        arr.push(r.method);
        rulesByVer.set(r.version_id, arr);
      });
      const fieldsByVer = new Map<string, number>();
      (fields ?? []).forEach((f: any) => fieldsByVer.set(f.version_id, (fieldsByVer.get(f.version_id) ?? 0) + 1));
      return (versions ?? [])
        .filter((v: any) => v.contract_templates?.is_active !== false)
        .map((v: any): PublishedTemplateOption => ({
          template_id: v.template_id,
          version_id: v.id,
          version_number: v.version_number,
          status: v.status,
          slug: v.contract_templates?.slug ?? null,
          category: v.contract_templates?.category ?? 'general',
          name_ar: v.contract_templates?.name_ar ?? '',
          name_en: v.contract_templates?.name_en ?? null,
          service_category_id: v.contract_templates?.service_category_id ?? null,
          pricing_methods: rulesByVer.get(v.id) ?? [],
          required_field_count: fieldsByVer.get(v.id) ?? 0,
        }));
    },
    enabled: !!user,
  });

  /* CT4 — Default to General template when none selected. */
  const generalVersion = useMemo(
    () => publishedVersions.find(v => v.slug === 'general' || v.category === 'general') ?? publishedVersions[0] ?? null,
    [publishedVersions],
  );
  const effectiveVersion = useMemo(
    () => publishedVersions.find(v => v.version_id === selectedVersionId) ?? generalVersion,
    [publishedVersions, selectedVersionId, generalVersion],
  );

  /* CT4B — Auto-suggest published template version from selected work type
   * unless the user manually picked a different template. */
  React.useEffect(() => {
    if (publishedVersions.length === 0) return;
    if (selectedVersionId) return;
    const suggested = pickTemplateForWorkType(selectedWorkType, publishedVersions);
    if (suggested) {
      setSelectedVersionId(suggested.version_id);
      setSelectedPricingMethod(null);
    }
    // We deliberately depend only on workType + the published list. If the user
    // overrides the dropdown, `selectedVersionId` becomes truthy and we stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkType, publishedVersions]);

  const { data: businessId } = useQuery({
    queryKey: ['my-business-id-contracts', user?.id],
    queryFn: async () => {
      const { data } = await getOwnerBusiness<{ id: string }>({
        userId: user!.id,
        select: 'id',
        orderBy: { column: 'created_at', ascending: true },
        limit: 1,
      });
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  /* ── Helper: isLocked ── */
  const isContractLocked = (c: ContractRow) => isContractLockedByStatus(c.status);

  /* Phase 5B.4 — Consume ?lead= query param: call prepare_contract_prefill_from_lead
   * and apply *safe* prefill fields to the create form. We never auto-create a
   * contract, client, or execution site, never change lead status, and never
   * prefill amount/dates/terms/supervisor/items/payments/attachments. */
  React.useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId) return;
    if (!user) return;
    if (appliedLeadIdsRef.current.has(leadId)) return;
    appliedLeadIdsRef.current.add(leadId);

    let cancelled = false;
    (async () => {
      const { data, error } = await prepareContractPrefillFromLead({ _lead_id: leadId });
      // Strip ?lead= regardless of outcome to prevent re-apply on refresh.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('lead');
        return next;
      }, { replace: true });

      if (cancelled) return;

      if (error) {
        const raw = String(error.message || '');
        const code = raw.includes('LEAD_PREFILL:UNAUTHENTICATED') ? 'UNAUTHENTICATED'
          : raw.includes('LEAD_PREFILL:NOT_FOUND') ? 'NOT_FOUND'
          : raw.includes('LEAD_PREFILL:DEMO_LEAD') ? 'DEMO_LEAD'
          : raw.includes('LEAD_PREFILL:FORBIDDEN') ? 'FORBIDDEN'
          : 'GENERIC';
        const msg = isRTL
          ? ({
              UNAUTHENTICATED: 'يرجى تسجيل الدخول أولًا.',
              NOT_FOUND: 'الطلب غير موجود.',
              DEMO_LEAD: 'لا يمكن تحويل طلب تجريبي إلى عقد.',
              FORBIDDEN: 'لا تملك صلاحية الوصول إلى هذا الطلب.',
              GENERIC: 'تعذر تحضير بيانات الطلب.',
            } as const)[code]
          : ({
              UNAUTHENTICATED: 'Please sign in first.',
              NOT_FOUND: 'Lead not found.',
              DEMO_LEAD: 'Demo leads cannot be converted to contracts.',
              FORBIDDEN: 'You do not have access to this lead.',
              GENERIC: 'Could not prepare lead data.',
            } as const)[code];
        toast.error(msg);
        return;
      }

      const p = data as LeadPrefill;
      if (!p) return;
      setLeadPrefill(p);
      setLeadPrefillDismissed(false);
      setLeadClientConfirmed(false);

      // If a contract already exists for this lead, do NOT apply prefill.
      if (p.existing_contract_id) {
        setViewSection('create');
        return;
      }

      // Open the create flow.
      setEditingId(null);
      setSelectedTemplate(null);
      setTemplatePreview(null);
      setViewSection('create');

      // Safe form prefill (title/description/currency only).
      setForm((f) => ({
        ...f,
        title_ar: p.suggested_title ?? f.title_ar,
        title_en: p.suggested_title ?? f.title_en,
        description_ar: p.suggested_description ?? f.description_ar,
        currency_code: p.suggested_currency_code || f.currency_code,
        // Surface the customer email in the fallback field; provider must still
        // confirm or invite explicitly (no auto-select, no auto-invite).
        client_email: !p.client_profile_match && p.customer_email ? p.customer_email : f.client_email,
      }));

      // Work type / template suggestion.
      const wt = (p.suggested_work_type ?? 'general') as WorkTypeKey;
      setSelectedWorkType(wt);
      setWorkTypeTouched(true);
      if (p.suggested_template_version_id) {
        // Validated against publishedVersions when they load; effect below
        // keeps default fallback if the suggested version is unavailable.
        setSelectedVersionId(p.suggested_template_version_id);
        setSelectedPricingMethod(null);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user?.id]);

  /* Phase 5B.4 — If a suggested template version is no longer published, clear it
   * (auto-suggest effect will then pick a fallback). */
  React.useEffect(() => {
    if (!selectedVersionId) return;
    if (publishedVersions.length === 0) return;
    const ok = publishedVersions.some(v => v.version_id === selectedVersionId);
    if (!ok) {
      setSelectedVersionId(null);
      if (leadPrefill?.suggested_template_version_id === selectedVersionId) {
        toast.message(isRTL ? 'القالب المقترح غير متاح، تم استخدام القالب الافتراضي.' : 'Suggested template unavailable; using default.');
      }
    }
  }, [publishedVersions, selectedVersionId, leadPrefill, isRTL]);

  /* ── Mutations ── */
  const addNoteMutation = useMutation({
    mutationFn: async ({ contractId, content, noteType }: { contractId: string; content: string; noteType?: string }) => {
      const { error } = await createContractNote({ contract_id: contractId, user_id: user!.id, content, note_type: noteType || 'note' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-contract-notes'] }); setNoteText(''); toast.success(isRTL ? 'تمت إضافة الملاحظة' : 'Note added'); },
  });

  const addMeasurementMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const area = (Number(measurementForm.length_mm) * Number(measurementForm.width_mm)) / 1000000;
      const totalCost = Number(measurementForm.unit_price) * Number(measurementForm.quantity);
      const { error } = await createContractMeasurement({
        contract_id: contractId, name_ar: measurementForm.name_ar, piece_number: measurementForm.piece_number,
        floor_label: measurementForm.floor_label, location_ar: measurementForm.location_ar,
        length_mm: Number(measurementForm.length_mm), width_mm: Number(measurementForm.width_mm),
        quantity: Number(measurementForm.quantity), unit_price: Number(measurementForm.unit_price),
        area_sqm: area, total_cost: totalCost,
      });
      if (error) throw error;
      // Update contract total from measurements + line items
      // C6.4a — recompute via RPC.
      await recalcContractTotal(contractId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-measurements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setShowAddMeasurement(null);
      setMeasurementForm({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '' });
      toast.success(isRTL ? 'تمت إضافة المقاس وتحديث قيمة العقد' : 'Measurement added & contract updated');
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const existing = allMilestones.filter(m => m.contract_id === contractId);
      const { error } = await createContractMilestone({
        contract_id: contractId, title_ar: milestoneForm.title_ar,
        amount: Number(milestoneForm.amount), due_date: milestoneForm.due_date || null,
        sort_order: existing.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-milestones'] });
      setShowAddMilestone(null);
      setMilestoneForm({ title_ar: '', amount: '', due_date: '' });
      toast.success(isRTL ? 'تمت إضافة المرحلة' : 'Milestone added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addAmendmentMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const { data: inserted, error } = await supabase.from('contract_amendments').insert({
        contract_id: contractId, requested_by: user!.id,
        title_ar: amendmentForm.title_ar, description_ar: amendmentForm.description_ar || null,
        amendment_type: amendmentForm.amendment_type,
        new_amount: amendmentForm.new_amount ? Number(amendmentForm.new_amount) : null,
      }).select('id').single();
      if (error) throw error;
      return inserted?.id as string | undefined;
    },
    onSuccess: (newAmendmentId) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-amendments'] });
      setShowAddAmendment(null);
      setAmendmentForm({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
      toast.success(isRTL ? 'تم إرسال طلب التعديل' : 'Amendment request sent');
      if (newAmendmentId) dispatchAmendmentEvent(newAmendmentId, 'created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveAmendmentMutation = useMutation({
    mutationFn: async ({ amendmentId }: { amendmentId: string; contract: ContractWithRole }) => {
      return await approveAmendment(amendmentId);
    },
    onSuccess: (amId) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-amendments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تمت الموافقة على التعديل' : 'Amendment approved');
      if (amId) dispatchAmendmentEvent(amId, 'approved');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
  });

  /* ── Maintenance Request Mutation ── */
  const addMaintenanceMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const contract = contracts.find((c) => c.id === contractId);
      if (!contract) throw new Error('Contract not found');
      const { data: mainReq, error } = await supabase.from('maintenance_requests').insert({
        contract_id: contractId, client_id: contract.client_id, provider_id: contract.provider_id,
        title_ar: maintenanceForm.title_ar, description_ar: maintenanceForm.description_ar || null,
        priority: maintenanceForm.priority as Database['public']['Enums']['maintenance_priority'],
        scheduled_date: maintenanceForm.scheduled_date || null,
      }).select('id').single();
      if (error) throw error;
      // Upload maintenance images as attachments
      for (const file of maintenanceImages) {
        const ext = file.name.split('.').pop();
        const path = `maintenance/${mainReq.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await uploadContractAttachmentFile(path, file);
        if (!upErr) {
          const { data: urlData } = getContractAttachmentPublicUrl(path);
          await createContractAttachment({
            contract_id: contractId, user_id: user!.id, file_name: file.name,
            file_url: urlData.publicUrl, file_type: 'image',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-attachments'] });
      setShowAddMaintenance(null);
      setMaintenanceForm({ title_ar: '', description_ar: '', priority: 'normal', scheduled_date: '' });
      setMaintenanceImages([]);
      toast.success(isRTL ? 'تم إرسال طلب الصيانة' : 'Maintenance request submitted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Add Payment Mutation ── */
  const addPaymentMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      // Find or create installment plan
      let { data: plan } = await getInstallmentPlanIdForContract(contractId);
      if (!plan) {
        const contract = contracts.find((c) => c.id === contractId);
        const { data: newPlan, error: planErr } = await createInstallmentPlan<{ id: string }>({
          contract_id: contractId, total_amount: Number(contract?.total_amount || 0),
          installment_amount: Number(paymentForm.amount), number_of_installments: 1,
          start_date: paymentForm.due_date || new Date().toISOString().split('T')[0],
        }, 'id');
        if (planErr) throw planErr;
        plan = newPlan;
      }
      const existing = allPayments.filter((p) => p.contract_id === contractId);
      const { error } = await createInstallmentPayments({
        plan_id: plan!.id, installment_number: existing.length + 1,
        amount: Number(paymentForm.amount), due_date: paymentForm.due_date,
        notes: paymentForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-payments'] });
      setShowAddPayment(null);
      setPaymentForm({ amount: '', due_date: '', notes: '' });
      toast.success(isRTL ? 'تمت إضافة الدفعة' : 'Payment added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Mark Payment as Paid ── */
  const markPaidMutation = useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) => {
      const { error } = await updateInstallmentPayment(paymentId, { status: 'paid', paid_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-payments'] });
      toast.success(isRTL ? 'تم تسجيل الدفع' : 'Payment recorded');
    },
  });

  /* ── Add Line Item Mutation ── */
  const addLineItemMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const existing = allLineItems.filter((li) => li.contract_id === contractId);
      const fi: Record<string, number> = {};
      const setIf = (k: string, v: string) => { if (v !== '' && Number.isFinite(Number(v))) fi[k] = Number(v); };
      setIf('length_mm', lineItemForm.length_mm);
      setIf('width_mm', lineItemForm.width_mm);
      setIf('height_mm', lineItemForm.height_mm);
      setIf('weight_kg', lineItemForm.weight_kg);
      setIf('weight_ton', lineItemForm.weight_ton);
      setIf('amount', lineItemForm.amount);
      const calc = calculateLineTotal({
        pricing_method: lineItemForm.pricing_method,
        quantity: lineItemForm.quantity,
        unit_price: lineItemForm.unit_price,
        formula_inputs: fi,
      });
      if (!calc.ok) {
        throw new Error(isRTL ? 'قيم البند غير صالحة' : 'Invalid line item values');
      }
      const { error } = await supabase.from('contract_line_items').insert({
        contract_id: contractId, name_ar: lineItemForm.name_ar,
        description_ar: lineItemForm.description_ar || null,
        quantity: Number(lineItemForm.quantity || 1),
        unit_price: Number(lineItemForm.unit_price || 0),
        item_type: lineItemForm.item_type, sort_order: existing.length + 1,
        pricing_method: lineItemForm.pricing_method,
        unit_of_measure: formatUnitOfMeasure(lineItemForm.pricing_method),
        formula_inputs: fi,
        boq_group_key: lineItemForm.boq_group_key || 'other',
      });
      if (error) throw error;
      // C6.4a — recompute via RPC.
      await recalcContractTotal(contractId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setShowAddLineItem(null);
      setLineItemForm({
        name_ar: '', description_ar: '', quantity: '1', unit_price: '', item_type: 'service',
        pricing_method: 'unit', length_mm: '', width_mm: '', height_mm: '', weight_kg: '', weight_ton: '', amount: '',
        boq_group_key: 'other',
      });
      toast.success(isRTL ? 'تمت إضافة البند وتحديث قيمة العقد' : 'Item added & total updated');
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  /* ── Delete Line Item ── */
  const deleteLineItemMutation = useMutation({
    mutationFn: async ({ id, contractId }: { id: string; contractId: string }) => {
      const { error } = await supabase.from('contract_line_items').delete().eq('id', id);
      if (error) throw error;
      // C6.4a — recompute via RPC.
      await recalcContractTotal(contractId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تم حذف البند' : 'Item deleted');
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  /* ── CT5G — Bulk-insert starter BOQ rows for a work type. Idempotent. ── */
  const addStarterBoqMutation = useMutation({
    mutationFn: async ({ contractId, category }: { contractId: string; category: string | null | undefined }) => {
      const existing = allLineItems.filter((li) => li.contract_id === contractId);
      const presets = getWorkTypeBoqPresets(category);
      const allowedKey = (contracts.find(c => c.id === contractId) as { template_version_id?: string | null } | undefined)?.template_version_id;
      const allowed = allowedKey ? allowedMethodsByVersion.get(allowedKey) : undefined;
      const filtered = (allowed && allowed.length > 0)
        ? presets.filter(p => allowed.includes(p.pricing_method))
        : presets;
      const toInsert = dedupeStarterRows(filtered, existing);
      if (toInsert.length === 0) return { inserted: 0 };
      const baseSort = existing.length;
      const rows = toInsert.map((p, idx) => ({
        contract_id: contractId,
        name_ar: p.name_ar,
        name_en: p.name_en,
        description_ar: null,
        quantity: 1,
        unit_price: 0,
        total_cost: 0,
        item_type: 'material' as const,
        sort_order: baseSort + idx + 1,
        pricing_method: p.pricing_method,
        unit_of_measure: formatUnitOfMeasure(p.pricing_method),
        formula_inputs: {},
        boq_group_key: p.boq_group_key,
      }));
      const { error } = await supabase.from('contract_line_items').insert(rows);
      if (error) throw error;
      await recalcContractTotal(contractId);
      return { inserted: toInsert.length };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-line-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      const n = res?.inserted ?? 0;
      if (n === 0) {
        toast.info(isRTL ? 'تمت إضافة البنود المقترحة' : 'Suggested BOQ items already added');
      } else {
        toast.success(isRTL ? `أُضيفت ${n} بنود مقترحة` : `Added ${n} suggested items`);
      }
    },
    onError: (err: unknown) => toast.error(mapContractLockError(err, isRTL).message),
  });

  /* ── Update Milestone Status ── */
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === 'completed') update.completed_at = new Date().toISOString();
      const { error } = await updateContractMilestone(id, update);
      if (error) throw error;
      // Best-effort: notify client + email when a milestone is updated by provider.
      if (status === 'completed') {
        try {
          const ms = allMilestones.find((m) => m.id === id);
          if (ms) {
            const contract = contracts.find((c) => c.id === ms.contract_id);
            if (contract && contract.client_id && contract.client_id !== user?.id) {
              const refId = (contract as any).ref_id || contract.id;
              const titleAr = (contract as any).title_ar || '';
              const titleEn = (contract as any).title_en || titleAr;
              const msTitle = isRTL ? ((ms as any).title_ar || (ms as any).title_en || '') : ((ms as any).title_en || (ms as any).title_ar || '');
              createNotificationFireAndForget({
                user_id: contract.client_id,
                title_ar: 'تم تحديث مرحلة في عقدك',
                title_en: 'A milestone in your contract was updated',
                body_ar: msTitle ? `المرحلة: ${msTitle}` : `العقد ${refId}`,
                body_en: msTitle ? `Milestone: ${msTitle}` : `Contract ${refId}`,
                notification_type: 'contract_milestone_completed',
                reference_id: contract.id,
                reference_type: 'contract',
                action_url: `/contracts/${contract.id}`,
              }, '[DashboardContracts] milestone-completed notification failed');
              const clientProfile = profiles.find((p: any) => p.user_id === contract.client_id) as any;
              const clientEmail = clientProfile?.email;
              const clientName = clientProfile?.full_name;
              if (clientEmail) {
                void sendTransactionalEmail({
                  templateName: 'contract-milestone-completed',
                  recipientEmail: clientEmail,
                  idempotencyKey: `contract-milestone-completed-${id}`,
                  templateData: {
                    recipientName: clientName,
                    contractRefId: refId,
                    contractTitle: isRTL ? titleAr : titleEn,
                    milestoneTitle: msTitle || undefined,
                    contractId: contract.id,
                    contractUrl: `${window.location.origin}/contracts/${contract.id}`,
                  },
                }).catch(() => { /* queue retries */ });
              }
            }
          }
        } catch { /* notify is best-effort */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-milestones'] });
      toast.success(isRTL ? 'تم تحديث المرحلة' : 'Milestone updated');
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ contractId, file }: { contractId: string; file: File }) => {
      const ext = file.name.split('.').pop();
      const path = `${contractId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await uploadContractAttachmentFile(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = getContractAttachmentPublicUrl(path);
      const fileType = file.type.startsWith('image/') ? 'image' : 'document';
      const { error } = await createContractAttachment({
        contract_id: contractId, user_id: user!.id, file_name: file.name,
        file_url: urlData.publicUrl, file_type: fileType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-attachments'] });
      setUploadingContractId(null);
      toast.success(isRTL ? 'تم رفع المرفق' : 'Attachment uploaded');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      // CT4B — Prefer the picker-selected client; fall back to manual email lookup.
      let clientUserId: string | null = selectedClient?.user_id ?? null;
      if (!clientUserId && !editingId && !guestClient) {
        const email = form.client_email.trim();
        if (!email) throw new Error(isRTL ? 'يرجى اختيار العميل أولاً' : 'Please select a client first');
        const { data: cp, error: cpe } = await getProfileByEmail<{ user_id: string }>({
          email,
          select: 'user_id',
        });
        if (cpe) throw cpe;
        if (cp) clientUserId = cp.user_id;
      }

      const payload: any = {
        provider_id: user!.id, client_id: clientUserId, business_id: businessId || null,
        guest_client_name:  !clientUserId ? (guestClient?.name  ?? null) : null,
        guest_client_email: !clientUserId ? (guestClient?.email ?? form.client_email.trim() ?? null) : null,
        guest_client_phone: !clientUserId ? (guestClient?.phone ?? null) : null,
        title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        total_amount: Number(form.total_amount), currency_code: form.currency_code,
        start_date: form.start_date || null, end_date: form.end_date || null,
        terms_ar: form.terms_ar || null, terms_en: form.terms_en || null,
        supervisor_name: form.supervisor_name || null, supervisor_phone: form.supervisor_phone || null,
        supervisor_email: form.supervisor_email || null, status: 'draft',
        vat_inclusive: form.vat_inclusive, vat_rate: Number(form.vat_rate),
      };

      if (editingId) {
        const { error } = await updateContractById(editingId, payload);
        if (error) throw error;
        return { contractId: editingId, isNew: false };
      } else {
        // CT4 — Always create new contracts via the SECURITY DEFINER RPC so the
        // template snapshot is frozen atomically. Falls back to General v1.
        const versionId = effectiveVersion?.version_id ?? null;
        if (!versionId) {
          throw new Error(isRTL ? 'لا يوجد قالب عقد منشور' : 'No published contract template available');
        }
        const { data, error } = await createContractFromTemplate({
          _payload: payload,
          _template_version_id: versionId,
          _pricing_method: selectedPricingMethod,
        });
        if (error) throw error;
        const newId = (data ?? null) as string | null;
        return { contractId: newId, isNew: true };
      }
    },
    onSuccess: async (result) => {
      // Phase 5C.3 — chain execution-site linking after the row exists.
      if (result?.contractId && selectedSiteId) {
        try {
          await setContractExecutionSite(result.contractId, selectedSiteId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.warning(isRTL
            ? `تم حفظ المسودة، لكن تعذر ربط موقع التنفيذ. يمكنك إضافته لاحقًا. (${msg})`
            : `Draft saved but execution site link failed. You can add it later. (${msg})`);
        }
      }
      // Phase 5B.5 — link lead to the freshly created contract (manual save only).
      if (result?.contractId && result.isNew && leadPrefill?.lead_id && !leadPrefill.existing_contract_id) {
        try {
          const linkData = await linkLeadToContract(result.contractId, leadPrefill.lead_id);
          void linkData;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const already = msg.match(/LEAD_LINK:ALREADY_CONVERTED:([0-9a-f-]+)/i);
          if (already?.[1]) {
            toast.warning(isRTL
              ? 'هذا الطلب مرتبط بعقد آخر بالفعل. سيتم فتح العقد الموجود.'
              : 'This lead is already linked to another contract. Opening the existing contract.');
            navigate(`/contracts/${already[1]}`);
          } else {
            toast.warning(isRTL
              ? 'تم حفظ المسودة، لكن تعذر ربطها بطلب الخدمة. يمكنك فتح الطلب لاحقًا.'
              : 'Draft saved but could not be linked to the service request. You can open the request later.');
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['lead_requests'] });
      setViewSection('list'); setForm(emptyForm); setEditingId(null);
      setSelectedVersionId(null); setSelectedPricingMethod(null); setSelectedTemplate(null);
      setSelectedClient(null); setGuestClient(null); setSelectedWorkType('general'); setWorkTypeTouched(false);
      setSelectedSiteId(null);
      setLeadPrefill(null);
      setLeadPrefillDismissed(false);
      setLeadClientConfirmed(false);
      toast.success(editingId ? (isRTL ? 'تم تحديث العقد' : 'Contract updated') : (isRTL ? 'تم إنشاء العقد' : 'Contract created'));
    },
    onError: (err: Error) => {
      const mapped = mapContractCreateError(err, isRTL);
      toast.error(mapped.message);
    },
  });

  /* CT4C.3 — Client invitation mutations. */
  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      const email = inviteForm.email.trim().toLowerCase();
      if (!email) throw new Error(isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      const draft = serializeDraftPayload({
        form,
        templateVersionId: effectiveVersion?.version_id ?? null,
        workType: selectedWorkType || null,
        pricingMethod: selectedPricingMethod,
      });
      const data = await createClientInvitation({
        email,
        name: inviteForm.name.trim() || null,
        phone: inviteForm.phone.trim() || null,
        businessId: businessId || null,
        draftPayload: Object.keys(draft).length > 0 ? (JSON.parse(JSON.stringify(draft)) as Json) : null,
        templateVersionId: effectiveVersion?.version_id ?? null,
        workType: selectedWorkType || null,
      });
      const result = data as {
        already_registered: boolean;
        user_id?: string | null;
        invite_id?: string | null;
        ref_id?: string | null;
        token?: string | null;
        expires_at?: string | null;
      };
      if (result.already_registered) {
        return { alreadyRegistered: true as const };
      }
      // Dispatch invite email via dedicated edge function. Token is sent
      // server-side once — never persisted in client state.
      const { error: notifyErr } = await notifyClientInvitation({
        invite_id: result.invite_id,
        token: result.token,
        kind: 'created',
      });
      if (notifyErr) throw notifyErr;
      return {
        alreadyRegistered: false as const,
        invite: {
          id: result.invite_id!,
          ref_id: result.ref_id!,
          email_lower: email,
          expires_at: result.expires_at!,
          reminder_count: 0,
        } as PendingInvite,
      };
    },
    onSuccess: (res) => {
      if (res.alreadyRegistered) {
        toast.info(isRTL ? 'هذا البريد مسجل بالفعل. يرجى البحث عنه واختياره.' : 'This email is already registered. Please search for the client and select them.');
        setInviteMode('idle');
        return;
      }
      setPendingInvite(res.invite);
      setInviteMode('awaiting');
      toast.success(isRTL ? 'تم إرسال الدعوة بنجاح' : 'Invitation sent successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!pendingInvite) throw new Error('No pending invite');
      const data = await resendClientInvitation(pendingInvite.id);
      const result = data as { invite_id: string; ref_id: string; token: string; reminder_count: number; expires_at: string };
      const { error: notifyErr } = await notifyClientInvitation({
        invite_id: result.invite_id,
        token: result.token,
        kind: 'reminder',
      });
      if (notifyErr) throw notifyErr;
      return result;
    },
    onSuccess: (res) => {
      setPendingInvite(p => p ? { ...p, reminder_count: res.reminder_count, expires_at: res.expires_at } : p);
      toast.success(isRTL ? 'تم إرسال التذكير' : 'Reminder sent');
    },
    onError: (err: Error) => {
      const msg = String(err.message || '');
      if (msg.includes('cooldown')) toast.error(isRTL ? 'يرجى الانتظار قبل إعادة الإرسال (60 ثانية)' : 'Please wait before resending (60s cooldown)');
      else if (msg.includes('reminder_limit')) toast.error(isRTL ? 'تم الوصول للحد الأقصى من التذكيرات' : 'Reminder limit reached');
      else toast.error(msg);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async () => {
      if (!pendingInvite) throw new Error('No pending invite');
      await cancelClientInvitation(pendingInvite.id);
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إلغاء الدعوة' : 'Invitation cancelled');
      setPendingInvite(null);
      setInviteMode('idle');
      setInviteForm({ email: '', name: '', phone: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* CT4C.5 — Accepted invitations awaiting contract completion. */
  const { data: acceptedInvitations = [], refetch: refetchAcceptedInvites } = useQuery({
    queryKey: ['accepted-invitations', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_invitations')
        .select('id,ref_id,email_lower,recipient_name,work_type,template_version_id,accepted_at,status,bound_contract_id')
        .eq('status', 'accepted')
        .is('bound_contract_id', null)
        .order('accepted_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as AcceptedInvitationRow[];
    },
  });

  /* Poll the awaiting pendingInvite so the provider sees acceptance live. */
  const { data: pendingInviteStatus } = useQuery({
    queryKey: ['pending-invite-status', pendingInvite?.id],
    enabled: !!pendingInvite?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!pendingInvite?.id) return null;
      const { data, error } = await supabase
        .from('client_invitations')
        .select('id,status,accepted_at,bound_contract_id')
        .eq('id', pendingInvite.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const pendingInviteAccepted = pendingInviteStatus?.status === 'accepted' && !pendingInviteStatus?.bound_contract_id;

  const completeFromInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await completeContractFromInvitation(inviteId);
    },
    onSuccess: (contractId) => {
      toast.success(isRTL ? 'تم إنشاء العقد من الدعوة' : 'Contract created from invitation');
      queryClient.invalidateQueries({ queryKey: ['accepted-invitations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
      // Reset invite state if this was the active awaiting invite
      setPendingInvite(null);
      setInviteMode('idle');
      setInviteForm({ email: '', name: '', phone: '' });
      navigate(`/contracts/${contractId}`);
    },
    onError: (err: Error) => {
      const msg = String(err.message || '');
      if (msg.includes('forbidden')) toast.error(isRTL ? 'غير مصرح' : 'Not authorized');
      else if (msg.includes('invitation_not_accepted')) toast.error(isRTL ? 'الدعوة غير مقبولة بعد' : 'Invitation not yet accepted');
      else if (msg.includes('draft_payload_missing')) toast.error(isRTL ? 'لا توجد مسودة محفوظة لهذه الدعوة' : 'No saved draft for this invitation');
      else if (msg.includes('business_ownership_invalid')) toast.error(isRTL ? 'الصلاحية على المنشأة غير صالحة' : 'Business ownership invalid');
      else toast.error(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (contract: ContractWithRole) => {
      // C6.4a — go through SECURITY DEFINER RPC.
      await acceptContract(contract.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setApproveConfirm(null);
      toast.success(isRTL ? 'تمت الموافقة على العقد' : 'Contract approved');
    },
  });

  const sendForApprovalMutation = useMutation({
    mutationFn: async (contract: ContractWithRole) => {
      // C6.4a — go through SECURITY DEFINER RPC.
      await sendContractForApproval(contract.id);
      await createNotification({
        user_id: contract.client_id,
        title_ar: `عقد جديد بانتظار مراجعتك: ${contract.title_ar}`,
        title_en: `New contract pending review: ${contract.title_en || contract.title_ar}`,
        notification_type: 'contract', reference_id: contract.id, reference_type: 'contract',
        action_url: `/contracts/${contract.id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setSendConfirm(null);
      toast.success(isRTL ? 'تم إرسال العقد للمراجعة' : 'Contract sent for review');
    },
  });

  /* ── Helpers ── */
  /* Phase 4E.3 — Autosave for existing draft contracts only. */
  const editingContract = useMemo(
    () => (editingId ? contracts.find((c) => c.id === editingId) ?? null : null),
    [editingId, contracts]
  );
  const editingHasLineItems = useMemo(
    () => (editingId ? allLineItems.some((li) => li.contract_id === editingId) : false),
    [editingId, allLineItems]
  );
  const editingHasMeasurements = useMemo(
    () => (editingId ? allMeasurements.some((m) => m.contract_id === editingId) : false),
    [editingId, allMeasurements]
  );
  const autosave = useContractDraftAutosave({
    contractId: editingId,
    enabled:
      !!editingId &&
      viewSection === 'create' &&
      inviteMode === 'idle' &&
      editingContract?.status === 'draft',
    form,
    initialUpdatedAt: editingContract?.updated_at ?? null,
    hasLineItems: editingHasLineItems,
    hasMeasurements: editingHasMeasurements,
    isManualSavePending: createContractMutation.isPending,
    isSendForApprovalPending: sendForApprovalMutation.isPending,
    onAutosaved: () => {
      // Light cache refresh so list shows latest updated_at without disrupting form.
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
    },
  });
  const stats = useMemo(() => {
    const src = roleFilter === 'provider' ? providerContracts : roleFilter === 'client' ? clientContracts : contracts;
    const totalAmount = src.reduce((s: number, c) => s + Number(c.total_amount), 0);
    const totalPaid = allPayments.filter((p) => p.status === 'paid' && src.some((c) => c.id === p.contract_id)).reduce((s: number, p) => s + Number(p.amount), 0);
    const overduePayments = allPayments.filter((p) => p.status === 'overdue' && src.some((c) => c.id === p.contract_id));
    return {
      total: src.length,
      active: src.filter((c) => c.status === 'active').length,
      completed: src.filter((c) => c.status === 'completed').length,
      pendingApproval: src.filter((c) => c.status === 'pending_approval').length,
      draft: src.filter((c) => c.status === 'draft').length,
      cancelled: src.filter((c) => c.status === 'cancelled').length,
      totalAmount, totalPaid,
      overdueCount: overduePayments.length,
      overdueAmount: overduePayments.reduce((s: number, p) => s + Number(p.amount), 0),
      asProvider: providerContracts.length,
      asClient: clientContracts.length,
      totalMilestones: allMilestones.length,
      completedMilestones: allMilestones.filter(m => m.status === 'completed').length,
      totalAttachments: allAttachments.length,
      totalMaintenance: allMaintenanceRequests.length,
      totalMeasurements: allMeasurements.length,
    };
  }, [contracts, providerContracts, clientContracts, allPayments, allMilestones, allAttachments, allMaintenanceRequests, allMeasurements, roleFilter]);

  const filtered = useMemo(() => {
    let items = roleFilter === 'provider' ? providerContracts.map((c) => ({ ...c, _role: 'provider' })) :
      roleFilter === 'client' ? clientContracts.map((c) => ({ ...c, _role: 'client' })) : contracts;

    if (statusFilter !== 'all') items = items.filter((c) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c) =>
        c.title_ar?.toLowerCase().includes(q) || c.title_en?.toLowerCase().includes(q) ||
        c.contract_number?.toLowerCase().includes(q) ||
        profiles.some((p) => (p.full_name?.toLowerCase().includes(q)) && (p.user_id === c.client_id || p.user_id === c.provider_id))
      );
    }

    if (sortBy === 'amount') items = [...items].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    else if (sortBy === 'status') items = [...items].sort((a, b) => a.status.localeCompare(b.status));
    else if (sortBy === 'health') {
      items = [...items].sort((a, b) => {
        const hA = getContractHealth(a, allMilestones.filter(m => m.contract_id === a.id), allPayments.filter(p => p.contract_id === a.id));
        const hB = getContractHealth(b, allMilestones.filter(m => m.contract_id === b.id), allPayments.filter(p => p.contract_id === b.id));
        return hB - hA;
      });
    } else items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items;
  }, [contracts, providerContracts, clientContracts, statusFilter, searchQuery, roleFilter, profiles, sortBy, allMilestones, allPayments]);

  const formatDate = useCallback((d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, [isRTL]);

  /* ── Phase 8 — Filtered CSV export (no PII; aggregate fields only). ── */
  const handleExportCsv = useCallback(() => {
    if (filtered.length === 0) {
      toast.info(isRTL ? 'لا توجد عقود للتصدير' : 'No contracts to export');
      return;
    }
    const headers = isRTL
      ? ['الرقم', 'العنوان', 'الحالة', 'الدور', 'المبلغ', 'العملة', 'تاريخ الإنشاء', 'تاريخ البدء', 'تاريخ الانتهاء']
      : ['Number', 'Title', 'Status', 'Role', 'Amount', 'Currency', 'Created', 'Start', 'End'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((c) => [
      c.contract_number,
      isRTL ? c.title_ar : (c.title_en || c.title_ar),
      c.status,
      c._role,
      Number(c.total_amount),
      c.currency_code,
      c.created_at?.slice(0, 10) ?? '',
      c.start_date ?? '',
      c.end_date ?? '',
    ].map(escape).join(','));
    // UTF-8 BOM for Excel Arabic compatibility.
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(isRTL ? `تم تصدير ${filtered.length} عقد` : `Exported ${filtered.length} contracts`);
  }, [filtered, isRTL]);

  /* ── Phase 8 — Keyboard shortcuts: "/" focus search, "n" new contract, "Esc" close form. ── */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable
      );
      if (e.key === 'Escape' && viewSection !== 'list') {
        setViewSection('list');
        return;
      }
      if (isEditable) return;
      if (e.key === '/' && viewSection === 'list') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if ((e.key === 'n' || e.key === 'N') && viewSection === 'list' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setViewSection('create');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewSection]);

  const handleExportPDF = useCallback(async (c: ContractWithRole) => {
    setIsExporting(true);
    try {
      const clientP = profiles.find((p) => p.user_id === c.client_id);
      const providerP = profiles.find((p) => p.user_id === c.provider_id);
      const ms = allMilestones.filter((m) => m.contract_id === c.id);

      // CT6 — Pull line items, frozen template snapshot, and template meta
      // on demand. RLS gates everything; failures fall back to legacy export.
      const cAny = c as unknown as { template_version_id?: string | null; pricing_method?: string | null };
      const [liRes, snapRes, tplRes] = await Promise.all([
        supabase
          .from('contract_line_items')
          .select('name_ar, name_en, pricing_method, unit_of_measure, boq_group_key, quantity, unit_price, total_cost, formula_inputs, sort_order')
          .eq('contract_id', c.id)
          .order('sort_order'),
        supabase
          .from('contract_template_snapshots')
          .select('frozen_payload')
          .eq('contract_id', c.id)
          .maybeSingle(),
        cAny.template_version_id
          ? supabase
              // CT7B: non-admin path uses safe public view.
              .from('contract_template_versions_public')
              .select('version_number, language_precedence, contract_templates!inner(name_ar, name_en, category)')
              .eq('id', cAny.template_version_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      const lineItemsRows = (liRes.data ?? []) as Array<Record<string, unknown>>;
      const snap = (snapRes.data?.frozen_payload ?? null) as null | { sections?: unknown; attachments?: unknown };
      const tplMeta = (tplRes.data ?? null) as null | {
        version_number?: number | null;
        language_precedence?: string | null;
        contract_templates?: { name_ar?: string | null; name_en?: string | null; category?: string | null };
      };

      const data: ContractExportData = {
        contractNumber: c.contract_number, title: isRTL ? c.title_ar : (c.title_en || c.title_ar),
        totalAmount: Number(c.total_amount), currency: c.currency_code,
        startDate: c.start_date ? formatDate(c.start_date) : undefined,
        endDate: c.end_date ? formatDate(c.end_date) : undefined,
        clientName: clientP?.full_name || '-', providerName: providerP?.full_name || '-',
        supervisorName: c.supervisor_name || undefined,
        supervisorPhone: c.supervisor_phone || undefined,
        supervisorEmail: c.supervisor_email || undefined,
        terms: isRTL ? c.terms_ar : (c.terms_en || c.terms_ar),
        milestones: ms.map((m) => ({
          title: isRTL ? m.title_ar : (m.title_en || m.title_ar),
          amount: Number(m.amount),
          dueDate: m.due_date ? formatDate(m.due_date) : undefined,
          status: m.status,
        })),
        documentHash: c.document_hash || undefined,
        ...(await (async () => {
          // Phase 7: fetch unified barcodes for the contract + execution site.
          const cAny2 = c as unknown as { execution_site_id?: string | null };
          const [bc, bp] = await Promise.all([
            supabase.rpc('get_entity_barcode_code', { _entity_type: 'contract', _entity_id: c.id }),
            cAny2.execution_site_id
              ? supabase.rpc('get_entity_barcode_code', { _entity_type: 'client_site', _entity_id: cAny2.execution_site_id })
              : Promise.resolve({ data: null as string | null, error: null }),
          ]);
          const snap = (c as unknown as { execution_address_snapshot?: { label?: string | null } | null }).execution_address_snapshot;
          return {
            contractBarcodeCode: (bc.data as string | null) ?? null,
            projectBarcodeCode: (bp.data as string | null) ?? null,
            siteRefFallback: snap?.label ?? null,
          };
        })()),
        executionAddressSnapshot: (() => {
          const raw = (c as unknown as { execution_address_snapshot?: Record<string, unknown> | null }).execution_address_snapshot;
          if (!raw || typeof raw !== 'object') return null;
          return {
            label: (raw.label as string | null) ?? null,
            contact_name: (raw.contact_name as string | null) ?? null,
            contact_phone: (raw.contact_phone as string | null) ?? null,
            city_name: (raw.city_name as string | null) ?? null,
            district: (raw.district as string | null) ?? null,
            address_line1: (raw.address_line1 as string | null) ?? null,
            address_line2: (raw.address_line2 as string | null) ?? null,
            map_url: (raw.map_url as string | null) ?? null,
            latitude: raw.latitude != null ? Number(raw.latitude) : null,
            longitude: raw.longitude != null ? Number(raw.longitude) : null,
            access_notes: (raw.access_notes as string | null) ?? null,
            captured_at: (raw.captured_at as string | null) ?? null,
          };
        })(),
        template: tplMeta ? {
          nameAr: tplMeta.contract_templates?.name_ar ?? null,
          nameEn: tplMeta.contract_templates?.name_en ?? null,
          versionNumber: tplMeta.version_number ?? null,
          category: tplMeta.contract_templates?.category ?? null,
          pricingMethod: cAny.pricing_method ?? null,
          languagePrecedence: tplMeta.language_precedence ?? null,
        } : null,
        templateSnapshot: snap ? {
          sections: ((snap as { sections?: unknown }).sections ?? []) as never,
          attachments: ((snap as { attachments?: unknown }).attachments ?? []) as never,
        } : null,
        lineItems: lineItemsRows.map((li) => ({
          nameAr: (li.name_ar as string | null) ?? null,
          nameEn: (li.name_en as string | null) ?? null,
          pricingMethod: (li.pricing_method as string | null) ?? null,
          unitOfMeasure: (li.unit_of_measure as string | null) ?? null,
          boqGroupKey: (li.boq_group_key as string | null) ?? null,
          quantity: Number(li.quantity || 0),
          unitPrice: Number(li.unit_price || 0),
          totalCost: Number(li.total_cost || 0),
          formulaInputs: li.formula_inputs ?? null,
        })),
        isRTL,
      };
      const { exportContractPDF } = await import('@/lib/contract-pdf-export');
      await exportContractPDF(data);
      // PDF-QA2: log the export. Server validates auth & resolves metadata.
      try {
        const { recordContractPdfExport } = await import('@/lib/contract-pdf-history');
        await recordContractPdfExport(c.id, 'dashboard_contracts', isRTL ? 'ar' : 'en');
      } catch { /* non-blocking */ }
      toast.success(isRTL ? 'تم تصدير العقد' : 'Contract exported');
    } catch {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    } finally { setIsExporting(false); }
  }, [profiles, allMilestones, isRTL, formatDate]);

  const handleDuplicate = useCallback(async (c: ContractWithRole) => {
    const confirmMsg = isRTL
      ? 'سيتم إنشاء مسودة جديدة من بيانات هذا العقد بدون نسخ الموافقات أو السجل الرسمي. هل تريد المتابعة؟'
      : 'A new draft will be created from this contract\'s data, without copying approvals or the official record. Continue?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const data = await cloneContractAsDraft({
        sourceContractId: c.id,
        includeLineItems: true,
        includeTerms: true,
        includeSupervisor: true,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
      toast.success(isRTL ? 'تم إنشاء مسودة جديدة' : 'New draft created');
      const result = (data ?? {}) as { contract_id?: string };
      if (result.contract_id) {
        navigate(`/contracts/${result.contract_id}`);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const map: Record<string, { ar: string; en: string }> = {
        'CLONE_CONTRACT:NOT_FOUND': { ar: 'العقد المصدر غير موجود', en: 'Source contract not found' },
        'CLONE_CONTRACT:FORBIDDEN': { ar: 'لا تملك صلاحية نسخ هذا العقد', en: 'You are not allowed to clone this contract' },
        'CLONE_CONTRACT:TEMPLATE_MISSING': { ar: 'قالب العقد غير متوفر', en: 'Contract template missing' },
        'CLONE_CONTRACT:TEMPLATE_UNAVAILABLE': { ar: 'قالب العقد لم يعد منشوراً. لا يمكن النسخ بأمان.', en: 'The contract template is no longer published. Cannot clone safely.' },
        'CLONE_CONTRACT:SNAPSHOT_FAILED': { ar: 'تعذّر إنشاء نسخة القالب', en: 'Failed to snapshot template' },
        'CLONE_CONTRACT:LINE_ITEM_COPY_FAILED': { ar: 'تعذّر نسخ بنود العقد', en: 'Failed to copy line items' },
        'CLONE_CONTRACT:UNAUTHENTICATED': { ar: 'يجب تسجيل الدخول', en: 'You must be signed in' },
      };
      const key = Object.keys(map).find(k => raw.includes(k));
      const msg = key ? (isRTL ? map[key].ar : map[key].en) : (isRTL ? 'فشل النسخ' : 'Duplication failed');
      toast.error(msg);
    }
  }, [queryClient, isRTL, navigate]);

  const applyTemplate = useCallback((tmpl: TemplateRow) => {
    setForm(f => ({
      ...f,
      terms_ar: [tmpl.terms_ar, tmpl.scope_of_work_ar, tmpl.warranty_terms_ar, tmpl.payment_terms_ar, tmpl.penalties_ar, tmpl.notes_ar].filter(Boolean).join('\n\n'),
      terms_en: [tmpl.terms_en, tmpl.scope_of_work_en, tmpl.warranty_terms_en, tmpl.payment_terms_en, tmpl.penalties_en, tmpl.notes_en].filter(Boolean).join('\n\n'),
    }));
    setSelectedTemplate(tmpl);
    setViewSection('create');
    toast.success(isRTL ? 'تم تطبيق القالب' : 'Template applied');
  }, [isRTL]);

  const openEditContract = useCallback((c: ContractWithRole) => {
    setEditingId(c.id);
    // Phase 5C.3 — sync the local site selection from the contract row.
    setSelectedSiteId((c as unknown as { execution_site_id?: string | null }).execution_site_id ?? null);
    setForm({
      title_ar: c.title_ar, title_en: c.title_en || '', description_ar: c.description_ar || '',
      description_en: c.description_en || '', total_amount: c.total_amount?.toString() || '',
      currency_code: c.currency_code || 'SAR', start_date: c.start_date || '', end_date: c.end_date || '',
      terms_ar: c.terms_ar || '', terms_en: c.terms_en || '',
      supervisor_name: c.supervisor_name || '', supervisor_phone: c.supervisor_phone || '',
      supervisor_email: c.supervisor_email || '', client_email: '',
      vat_inclusive: c.vat_inclusive || false, vat_rate: c.vat_rate?.toString() || '15',
    });
    setViewSection('create');
  }, []);

  const closeForm = useCallback(() => {
    setViewSection('list'); setForm(emptyForm); setEditingId(null); setSelectedTemplate(null); setTemplatePreview(null);
    setSelectedClient(null); setGuestClient(null); setSelectedWorkType('general'); setWorkTypeTouched(false);
    setSelectedVersionId(null); setSelectedPricingMethod(null);
    setInviteMode('idle'); setInviteForm({ email: '', name: '', phone: '' }); setPendingInvite(null);
    setSelectedSiteId(null);
    setLeadPrefill(null); setLeadPrefillDismissed(false); setLeadClientConfirmed(false);
  }, []);

  const handleShareContract = useCallback(async (c: ContractWithRole) => {
    const url = `${window.location.origin}/contracts/${c.id}`;
    const title = isRTL ? c.title_ar : (c.title_en || c.title_ar);
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    }
  }, [isRTL]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <ContractPageHeader
          isRTL={isRTL}
          showListActions={viewSection === 'list'}
          templatesCount={templates.length}
          onOpenTemplates={() => setViewSection('templates')}
          onCreate={() => { closeForm(); setViewSection('create'); }}
          onBack={closeForm}
          showAnalytics={providerContracts.length > 0}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
          }}
          isRefreshing={isLoading}
          onImport={() => { closeForm(); setViewSection('import'); }}
        />

        {viewSection === 'list' && <ContractStatsSummary stats={stats} isRTL={isRTL} />}

        {/* ═══ Templates Browser ═══ */}
        {viewSection === 'templates' && (
          <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.02] to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                {isRTL ? 'قوالب العقود الاحترافية' : 'Professional Contract Templates'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tmpl: any) => (
                  <TemplateCard
                    key={tmpl.id}
                    template={tmpl}
                    isRTL={isRTL}
                    onSelect={(template) => {
                      setTemplatePreview(template);
                      setViewSection('template-preview');
                    }}
                  />
                ))}
              </div>
              {templates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">{isRTL ? 'لا توجد قوالب متاحة' : 'No templates available'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ Template Preview ═══ */}
        {viewSection === 'template-preview' && templatePreview && (
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => { const cfg = templateCategoryConfig[templatePreview.category]; const Icon = cfg?.icon || FileText; return <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg?.color || 'bg-muted'}`}><Icon className="w-5 h-5" /></div>; })()}
                  <div>
                    <CardTitle className="text-sm">{isRTL ? templatePreview.name_ar : (templatePreview.name_en || templatePreview.name_ar)}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{templateCategoryConfig[templatePreview.category]?.[isRTL ? 'ar' : 'en']}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewSection('templates')} className="gap-1 text-xs">
                  <ArrowRight className={`w-3 h-3 ${isRTL ? '' : 'rotate-180'}`} />{isRTL ? 'رجوع' : 'Back'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'terms', label: isRTL ? 'الشروط والالتزامات' : 'Terms', content: isRTL ? templatePreview.terms_ar : (templatePreview.terms_en || templatePreview.terms_ar) },
                { key: 'scope', label: isRTL ? 'نطاق العمل' : 'Scope of Work', content: isRTL ? templatePreview.scope_of_work_ar : (templatePreview.scope_of_work_en || templatePreview.scope_of_work_ar) },
                { key: 'warranty', label: isRTL ? 'شروط الضمان' : 'Warranty', content: isRTL ? templatePreview.warranty_terms_ar : (templatePreview.warranty_terms_en || templatePreview.warranty_terms_ar) },
                { key: 'payment', label: isRTL ? 'شروط الدفع' : 'Payment', content: isRTL ? templatePreview.payment_terms_ar : (templatePreview.payment_terms_en || templatePreview.payment_terms_ar) },
                { key: 'penalties', label: isRTL ? 'الغرامات' : 'Penalties', content: isRTL ? templatePreview.penalties_ar : (templatePreview.penalties_en || templatePreview.penalties_ar) },
                { key: 'notes', label: isRTL ? 'ملاحظات' : 'Notes', content: isRTL ? templatePreview.notes_ar : (templatePreview.notes_en || templatePreview.notes_ar) },
              ].filter(s => s.content).map(section => (
                <div key={section.key} className="p-3.5 rounded-xl border border-border/40 bg-muted/20">
                  <h4 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-accent" />{section.label}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
              <Button variant="hero" className="w-full gap-2 h-11 shadow-lg" onClick={() => applyTemplate(templatePreview)}>
                <Zap className="w-4 h-4" />{isRTL ? 'استخدام القالب وإنشاء عقد' : 'Use Template & Create Contract'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ Create/Edit Form ═══ */}
        {viewSection === 'create' && (
          // (rendered below)
          null
        )}
        {/* placeholder so the diff below keeps the original create block intact */}
        {false && (
          <></>
        )}
        {viewSection === 'import' && (
          <ContractImportPanel
            isRTL={isRTL}
            isSavingDraft={createContractMutation.isPending}
            onCancel={() => setViewSection('list')}
            onApplyToForm={(partial, extract) => {
              setForm(f => ({ ...f, ...partial }) as ContractForm);
              // Populate guest client from the extracted client party so the
              // create form has a usable client even before a real user account
              // exists. The user can still switch to the registered picker.
              const c = extract.client ?? {};
              if (!selectedClient && (c.name || c.email || c.phone)) {
                setGuestClient({
                  name: c.name ?? '',
                  email: c.email ?? '',
                  phone: c.phone ?? '',
                });
              }
              setViewSection('create');
              toast.success(isRTL ? 'تم تطبيق البيانات على نموذج العقد' : 'Data applied to contract form');
            }}
            onSaveDraft={(partial, extract) => {
              setForm(f => ({ ...f, ...partial }) as ContractForm);
              const c = extract.client ?? {};
              if (!selectedClient && (c.name || c.email || c.phone)) {
                setGuestClient({
                  name: c.name ?? '',
                  email: c.email ?? '',
                  phone: c.phone ?? '',
                });
              }
              // Trigger the existing create mutation on the next tick so the
              // form state above is committed first.
              setTimeout(() => createContractMutation.mutate(), 0);
            }}
          />
        )}
        {/* original create block follows */}
        {viewSection === 'create' && (
          <Card className="border-accent/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <Edit3 className="w-4 h-4 text-accent" /> : <Plus className="w-4 h-4 text-accent" />}
                {editingId ? (isRTL ? 'تعديل العقد' : 'Edit Contract') : (isRTL ? 'إنشاء عقد جديد' : 'Create New Contract')}
                {selectedTemplate && <Badge variant="secondary" className="text-[9px] gap-0.5"><Sparkles className="w-2.5 h-2.5" />{isRTL ? 'من قالب' : 'From template'}</Badge>}
              </CardTitle>
              {!editingId && contracts.length === 0 && (
                <div className="pt-2"><FirstContractGuidanceCard isRTL={isRTL} /></div>
              )}
              {!editingId && (() => {
                const steps = [
                  { key: 'client',   ar: 'العميل',       en: 'Client',   done: !!(selectedClient || guestClient || form.client_email || pendingInvite) },
                  { key: 'site',     ar: 'موقع التنفيذ', en: 'Site',     done: !!selectedSiteId },
                  { key: 'work',     ar: 'نوع العمل',    en: 'Work type', done: !!selectedWorkType && workTypeTouched },
                  { key: 'template', ar: 'القالب',       en: 'Template',  done: !!effectiveVersion },
                  { key: 'details',  ar: 'التفاصيل',     en: 'Details',   done: !!form.title_ar && !!form.total_amount && Number(form.total_amount) > 0 },
                  { key: 'pricing',  ar: 'التسعير/VAT',  en: 'Pricing/VAT', done: !!form.vat_rate },
                  { key: 'review',   ar: 'المراجعة',     en: 'Review',    done: false },
                ] as Array<{ key: StepKey; ar: string; en: string; done: boolean }>;
                return (
                  <ContractCreateStepper
                    steps={steps}
                    activeStep={activeStep}
                    onStepClick={goToStep}
                    isRTL={isRTL}
                  />
                );
              })()}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phase 5B.4 — Lead prefill banner (dismissible). */}
              {!editingId && leadPrefill && !leadPrefillDismissed && (
                <div className={`p-3 rounded-xl border ${leadPrefill.existing_contract_id ? 'border-warning/40 bg-warning/5' : 'border-info/40 bg-info/5'} flex items-start gap-3`}>
                  <Sparkles className="w-4 h-4 text-info shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    {leadPrefill.existing_contract_id ? (
                      <>
                        <p className="text-xs font-semibold">
                          {isRTL ? 'تم إنشاء عقد سابق لهذا الطلب.' : 'A contract already exists for this lead.'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] mt-1"
                          onClick={() => navigate(`/contracts/${leadPrefill.existing_contract_id}`)}
                        >
                          <ExternalLink className="w-3 h-3 me-1" />
                          {isRTL ? 'فتح العقد الحالي' : 'Open existing contract'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold">
                          {isRTL
                            ? `تم تعبئة بعض الحقول من طلب الخدمة #${leadPrefill.lead_ref_id ?? ''}. راجع البيانات قبل حفظ المسودة.`
                            : `Some fields were suggested from lead #${leadPrefill.lead_ref_id ?? ''}. Review them before saving the draft.`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isRTL ? 'لم يتم إنشاء عقد بعد.' : 'No contract has been created yet.'}
                        </p>
                      </>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setLeadPrefillDismissed(true)} aria-label={isRTL ? 'إخفاء' : 'Dismiss'}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Phase 5B.4 — Suggested registered client (requires confirmation). */}
              {!editingId && leadPrefill && !leadPrefill.existing_contract_id && leadPrefill.client_profile_match && !leadClientConfirmed && !selectedClient && (
                <div className="p-3 rounded-xl border border-success/40 bg-success/5 flex items-start gap-3">
                  <Users className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-semibold">
                      {isRTL ? 'تم العثور على عميل مسجل بهذا البريد.' : 'A registered client matches this email.'}
                    </p>
                    {leadPrefill.client_profile_match.display_name && (
                      <p className="text-[11px] text-muted-foreground truncate">{leadPrefill.client_profile_match.display_name}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] mt-1"
                      onClick={() => {
                        const m = leadPrefill.client_profile_match!;
                        setSelectedClient({
                          user_id: m.user_id,
                          full_name: m.display_name,
                          email_masked: null,
                          phone_masked: null,
                          ref_id: null,
                          source: 'lead',
                        });
                        setLeadClientConfirmed(true);
                      }}
                    >
                      <CircleCheck className="w-3 h-3 me-1" />
                      {isRTL ? 'استخدام هذا العميل' : 'Use this client'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Phase 5B.4 — Helper for unknown email (no auto-invite). */}
              {!editingId && leadPrefill && !leadPrefill.existing_contract_id && !leadPrefill.client_profile_match && leadPrefill.customer_email && (
                <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 text-[11px] text-muted-foreground">
                  {isRTL
                    ? 'يمكنك إرسال دعوة للعميل باستخدام البريد الموجود في الطلب.'
                    : 'You can invite the client using the email from this lead.'}
                </div>
              )}

              <div ref={stepRefs.client} className="space-y-4 scroll-mt-24">
              {/* CT4C.5 — Accepted invitations awaiting contract completion */}
              {!editingId && inviteMode === 'idle' && (
                <AcceptedInvitationsPanel
                  isRTL={isRTL}
                  invitations={acceptedInvitations}
                  isCompleting={completeFromInviteMutation.isPending}
                  onRefresh={() => refetchAcceptedInvites()}
                  onCompleteFromInvite={(id) => completeFromInviteMutation.mutate(id)}
                />
              )}

              {/* CT4B — Step 1: Client (search picker with email fallback) */}
              {!editingId && inviteMode === 'idle' && (
                <ClientPicker
                  isRTL={isRTL}
                  selected={selectedClient}
                  onSelect={setSelectedClient}
                  fallbackEmail={form.client_email}
                  onFallbackEmail={(v) => setForm(f => ({ ...f, client_email: v }))}
                  guest={guestClient}
                  onSelectGuest={setGuestClient}
                  prefillName={leadPrefill?.customer_name ?? null}
                  prefillEmail={leadPrefill?.customer_email ?? null}
                  prefillPhone={(leadPrefill as { customer_phone?: string | null } | null)?.customer_phone ?? null}
                  onRequestInvite={(prefill) => {
                    setInviteForm({ email: prefill.includes('@') ? prefill : '', name: '', phone: '' });
                    setInviteMode('composing');
                  }}
                />
              )}

              {/* CT4C.3 — Compose invitation */}
              {!editingId && inviteMode === 'composing' && (
                <div className="p-4 rounded-xl border-2 border-info/40 bg-info/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-info" />
                      {isRTL ? 'إرسال دعوة لعميل جديد' : 'Invite a new client'}
                    </Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => { setInviteMode('idle'); setInviteForm({ email: '', name: '', phone: '' }); }}>
                      <X className="w-3 h-3 me-1" />
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-[10px]">{isRTL ? 'البريد الإلكتروني' : 'Email'} <span className="text-destructive">*</span></Label>
                      <Input dir="ltr" type="email" className="h-9 text-xs" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{isRTL ? 'الاسم (اختياري)' : 'Name (optional)'}</Label>
                      <Input className="h-9 text-xs" value={inviteForm.name} onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{isRTL ? 'الجوال (اختياري)' : 'Phone (optional)'}</Label>
                      <Input dir="ltr" className="h-9 text-xs" value={inviteForm.phone} onChange={(e) => setInviteForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {isRTL
                      ? 'سيتم إرسال رابط آمن للعميل لإنشاء حسابه أو تسجيل الدخول. لن يتم إنشاء العقد إلا بعد قبول الدعوة.'
                      : 'A secure link will be emailed to the client to create their account or sign in. The contract is not created until the invitation is accepted.'}
                  </p>
                  <Button type="button" variant="hero" size="sm" className="h-9 gap-1.5 text-xs" disabled={!inviteForm.email.trim() || sendInviteMutation.isPending} onClick={() => sendInviteMutation.mutate()}>
                    {sendInviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {isRTL ? 'إرسال الدعوة' : 'Send invitation'}
                  </Button>
                </div>
              )}

              {/* CT4C.3 — Awaiting acceptance */}
              {!editingId && inviteMode === 'awaiting' && pendingInvite && (
                <PendingInvitePanel
                  isRTL={isRTL}
                  pendingInvite={pendingInvite}
                  pendingInviteAccepted={pendingInviteAccepted}
                  isCompleting={completeFromInviteMutation.isPending}
                  isResending={resendInviteMutation.isPending}
                  isCancelling={cancelInviteMutation.isPending}
                  onRefresh={() => {
                    queryClient.invalidateQueries({ queryKey: ['pending-invite-status', pendingInvite.id] });
                    refetchAcceptedInvites();
                  }}
                  onCompleteFromInvite={(id) => completeFromInviteMutation.mutate(id)}
                  onResend={() => resendInviteMutation.mutate()}
                  onCancel={() => cancelInviteMutation.mutate()}
                />
              )}
              </div>

              {/* Phase 5C.3 — Execution site step */}
              <div ref={stepRefs.site} className="scroll-mt-24">
                {!editingId && leadPrefill && !leadPrefill.existing_contract_id && (leadPrefill.suggested_description || leadPrefill.suggested_title) && (
                  <div className="mb-2 p-2.5 rounded-lg border border-warning/40 bg-warning/5 text-[11px] text-foreground/80 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                    <span>
                      {isRTL
                        ? 'قد يحتوي وصف الطلب على معلومات موقع. يرجى مراجعتها وإضافة موقع التنفيذ يدويًا.'
                        : 'The lead description may contain location info. Review it and add the execution site manually.'}
                    </span>
                  </div>
                )}
                <ExecutionSiteSection
                  isRTL={isRTL}
                  businessId={businessId ?? null}
                  clientUserId={
                    selectedClient?.user_id
                    ?? (editingContract as unknown as { client_id?: string | null } | null)?.client_id
                    ?? null
                  }
                  selectedSiteId={selectedSiteId}
                  snapshot={
                    (editingContract as unknown as { execution_address_snapshot?: ExecutionAddressSnapshot | null } | null)
                      ?.execution_address_snapshot ?? null
                  }
                  locked={!!editingContract && isContractLocked(editingContract)}
                  hasContract={!!editingId}
                  onSelect={(siteId) => setSelectedSiteId(siteId)}
                  onPersistSelect={async (siteId) => {
                    if (!editingId) return;
                    await setContractExecutionSite(editingId, siteId ?? undefined);
                    queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
                  }}
                />
              </div>

              {/* CT4B — Step 2: Work / service type (auto-suggests template) */}
              <div ref={stepRefs.work} className="scroll-mt-24">
              {!editingId && (
                <WorkTypeSection
                  isRTL={isRTL}
                  value={selectedWorkType}
                  touched={workTypeTouched}
                  onSelect={(v) => { setSelectedWorkType(v); setWorkTypeTouched(true); setSelectedVersionId(null); setSelectedPricingMethod(null); }}
                />
              )}
              </div>

              {/* CT4 — Template selector (new contracts only) */}
              <div ref={stepRefs.template} className="scroll-mt-24">
              {!editingId && (
                <TemplateSelectionSection
                  isRTL={isRTL}
                  publishedVersions={publishedVersions}
                  effectiveVersion={effectiveVersion}
                  selectedPricingMethod={selectedPricingMethod}
                  templateCategoryConfig={templateCategoryConfig}
                  onSelectVersion={(v) => { setSelectedVersionId(v); setSelectedPricingMethod(null); }}
                  onSelectPricingMethod={(m) => setSelectedPricingMethod(m)}
                />
              )}
              </div>

              {/* Titles + descriptions + dates + supervisor + terms = Details step */}
              <div ref={stepRefs.details} className="space-y-4 scroll-mt-24">
              <ContractDetailsSection isRTL={isRTL} form={form} setForm={setForm} />
              </div>

              {/* VAT Settings — Pricing/VAT step */}
              <div ref={stepRefs.pricing} className="space-y-4 scroll-mt-24">
              <VatSettingsSection isRTL={isRTL} form={form} setForm={setForm} />
              <SupervisorSection isRTL={isRTL} form={form} setForm={setForm} />
              <ContractTermsSection isRTL={isRTL} form={form} setForm={setForm} />
              </div>

              {/* CT4B — Review summary + status guidance before submit. */}
              <div ref={stepRefs.review} className="space-y-4 scroll-mt-24">
              {(() => {
                const completeness = !editingId
                  ? calculateContractCompleteness({
                      hasClient: !!(selectedClient || guestClient || form.client_email),
                      hasExecutionSite: !!selectedSiteId,
                      hasWorkType: !!selectedWorkType && workTypeTouched,
                      hasTemplate: !!effectiveVersion,
                      titleAr: form.title_ar,
                      titleEn: form.title_en,
                      startDate: form.start_date,
                      endDate: form.end_date,
                      vatRate: form.vat_rate,
                      totalAmount: form.total_amount,
                      termsAr: form.terms_ar,
                      termsEn: form.terms_en,
                      hasTemplateSnapshot: !!effectiveVersion,
                    })
                  : null;
                const mStatus = createContractMutation.status;
                const saveState: DraftSaveState =
                  mStatus === 'pending' ? 'saving'
                  : mStatus === 'error' ? 'error'
                  : mStatus === 'success' ? 'saved'
                  : 'not_saved';
                return (
                  <>
                    {completeness && (
                      <ContractCompletenessCard
                        isRTL={isRTL}
                        result={completeness}
                        onGoToStep={goToStep}
                      />
                    )}
                    <ContractDraftSaveStatus
                      isRTL={isRTL}
                      state={saveState}
                      score={completeness?.score}
                    />
                    {editingId && (
                      <AutosaveStatus
                        isRTL={isRTL}
                        state={autosave.state}
                        lastSavedAt={autosave.lastSavedAt}
                      />
                    )}
                  </>
                );
              })()}
              {!editingId && (() => {
                const guide = getStatusGuidance('draft');
                const w = getWorkType(selectedWorkType);
                const missing: string[] = [];
                if (!selectedClient && !guestClient && !form.client_email) missing.push(isRTL ? 'العميل' : 'Client');
                if (!form.title_ar) missing.push(isRTL ? 'عنوان العقد' : 'Title');
                if (!form.total_amount || Number(form.total_amount) <= 0) missing.push(isRTL ? 'المبلغ' : 'Amount');
                if (!effectiveVersion) missing.push(isRTL ? 'قالب عقد منشور' : 'Published template');
                const templateLabel = effectiveVersion
                  ? `${isRTL ? effectiveVersion.name_ar : (effectiveVersion.name_en || effectiveVersion.name_ar)} · v${effectiveVersion.version_number}`
                  : '—';
                return (
                  <ContractReviewSummary
                    isRTL={isRTL}
                    guide={guide}
                    clientLabel={selectedClient?.full_name || guestClient?.name || guestClient?.email || form.client_email || '—'}
                    workTypeLabel={w ? (isRTL ? w.ar : w.en) : '—'}
                    templateLabel={templateLabel}
                    pricingMethodLabel={selectedPricingMethod || (isRTL ? 'افتراضي' : 'Default')}
                    amountLabel={form.total_amount ? `${form.total_amount} ${form.currency_code}` : '—'}
                    vatLabel={form.vat_inclusive ? (isRTL ? `شاملة ${form.vat_rate}%` : `Inclusive ${form.vat_rate}%`) : (isRTL ? `تُضاف ${form.vat_rate}%` : `Added ${form.vat_rate}%`)}
                    datesLabel={(form.start_date || '—') + ' → ' + (form.end_date || '—')}
                    missing={missing}
                  />
                );
              })()}
              {!editingId && (
                <div className="text-[10px] text-muted-foreground space-y-1 px-1">
                  <p>{isRTL
                    ? 'بعد الإرسال للموافقة، لا يزال العقد غير مفعّل حتى يوافق الطرفان.'
                    : 'After sending for approval, the contract remains inactive until both parties approve.'}</p>
                  <p>{isRTL
                    ? 'بعد تفعيل العقد، التعديلات الرسمية تتم عبر ملحق.'
                    : 'Once active, formal changes must be made through an amendment.'}</p>
                </div>
              )}

              {/* Provider Contract UX 2 — Part A: Back / Next + Save Draft inline. */}
              <ContractCreateActionsBar
                isRTL={isRTL}
                editingId={editingId}
                activeStep={activeStep}
                stepOrder={stepOrder}
                isSaving={createContractMutation.isPending}
                saveDisabled={!form.title_ar || !form.total_amount || (!editingId && !selectedClient && !guestClient && !form.client_email) || createContractMutation.isPending}
                onStepNav={goToStep}
                onSave={() => createContractMutation.mutate()}
                completenessScore={!editingId ? calculateContractCompleteness({
                  hasClient: !!(selectedClient || guestClient || form.client_email),
                  hasExecutionSite: !!selectedSiteId,
                  hasWorkType: !!selectedWorkType && workTypeTouched,
                  hasTemplate: !!effectiveVersion,
                  titleAr: form.title_ar, titleEn: form.title_en,
                  startDate: form.start_date, endDate: form.end_date,
                  vatRate: form.vat_rate, totalAmount: form.total_amount,
                  termsAr: form.terms_ar, termsEn: form.terms_en,
                  hasTemplateSnapshot: !!effectiveVersion,
                }).score : undefined}
              />
              </div>

              {/* Provider Contract UX 2 — Part D: sticky mobile action bar. */}
              <ContractCreateMobileActionBar
                isRTL={isRTL}
                editingId={editingId}
                totalAmount={form.total_amount}
                currencyCode={form.currency_code}
                vatRate={form.vat_rate}
                vatInclusive={form.vat_inclusive}
                isSaving={createContractMutation.isPending}
                saveDisabled={!form.title_ar || !form.total_amount || (!editingId && !selectedClient && !guestClient && !form.client_email) || createContractMutation.isPending}
                onSave={() => createContractMutation.mutate()}
              />
            </CardContent>
          </Card>
        )}

        {/* ═══ Contracts List ═══ */}
        {viewSection === 'list' && (
          <>
            <div className="sticky top-2 z-20 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-[var(--elev-1)] p-3 space-y-3">
              <ContractRoleTabs
                value={roleFilter}
                onChange={(v) => startTransition(() => setRoleFilter(v))}
                counts={{ all: stats.total, provider: stats.asProvider, client: stats.asClient }}
                isRTL={isRTL}
              />
              <ContractFilters
                statusFilter={statusFilter}
                onStatusChange={(v) => startTransition(() => setStatusFilter(v))}
                sortBy={sortBy}
                onSortChange={(v) => setSortBy(v)}
                searchQuery={searchQuery}
                onSearchChange={(v) => startTransition(() => setSearchQuery(v))}
                counts={{
                  total: stats.total,
                  active: stats.active,
                  pendingApproval: stats.pendingApproval,
                  completed: stats.completed,
                  draft: stats.draft,
                }}
                isRTL={isRTL}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={handleExportCsv}
                searchInputRef={searchInputRef}
              />
              <ContractActiveFilters
                isRTL={isRTL}
                resultCount={filtered.length}
                totalCount={contracts.length}
                statusFilter={statusFilter}
                roleFilter={roleFilter}
                searchQuery={searchQuery}
                onClearStatus={() => setStatusFilter('all')}
                onClearRole={() => setRoleFilter('all')}
                onClearSearch={() => setSearchQuery('')}
                onClearAll={() => { setStatusFilter('all'); setRoleFilter('all'); setSearchQuery(''); }}
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <ContractEmptyState
                filtersActive={contracts.length > 0 && (statusFilter !== 'all' || roleFilter !== 'all' || !!searchQuery.trim())}
                isRTL={isRTL}
                onCreate={() => setViewSection('create')}
                onResetFilters={() => { setStatusFilter('all'); setRoleFilter('all'); setSearchQuery(''); }}
              />
            ) : viewMode === 'compact' ? (
              <div className="space-y-1.5">
                {filtered.map((c) => (
                  <ContractCompactRow
                    key={c.id + c._role}
                    c={c}
                    isRTL={isRTL}
                    onOpen={(contract) => setExpandedId(expandedId === contract.id ? null : contract.id)}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((c) => {
                  const milestones = allMilestones.filter((m) => m.contract_id === c.id);
                  const notes = allNotes.filter((n) => n.contract_id === c.id);
                  const attachments = allAttachments.filter((a) => a.contract_id === c.id);
                  const payments = allPayments.filter((p) => p.contract_id === c.id);
                  const measurements = allMeasurements.filter((m) => m.contract_id === c.id);
                  const lineItems = allLineItems.filter((li) => li.contract_id === c.id);
                  const warranties = allWarranties.filter((w) => w.contract_id === c.id);
                  const maintenance = allMaintenanceRequests.filter((r) => r.contract_id === c.id);
                  const amendments = allAmendments.filter((a) => a.contract_id === c.id);
                  const isExpanded = expandedId === c.id;
                  const locked = isContractLocked(c);
                  const isProvider = user?.id === c.provider_id;
                  // Sourced from measurements + line_items (line_items table currently empty — see C2/C3).
                  const measurementTotal = calculateMeasurementsTotal(measurements);
                  const lineItemTotal = calculateLineItemsTotal(lineItems);
                  const subtotal = measurementTotal + lineItemTotal;
                  const _vat = calculateVatBreakdown({ amount: subtotal, vatRate: c.vat_rate, vatInclusive: c.vat_inclusive });
                  const vatRate = _vat.vatRate;
                  const vatAmount = _vat.vatAmount;
                  const grandTotal = _vat.total;

                  /* ── CT5G.2 — Derived per-line VAT breakdown (display only). ── */
                  const cTpl = (c as { template_version_id?: string | null }).template_version_id ?? null;
                  const lineVatRulesMap = cTpl ? vatHandlingByVersionMethod.get(cTpl) : undefined;
                  const resolveLineVatHandling = (method: string | null | undefined): string => {
                    const m = (method || 'unit');
                    return lineVatRulesMap?.get(m) || 'inherit';
                  };
                  const lineVatRows = lineItems.map((li) => ({
                    id: li.id,
                    breakdown: calculateLineVatBreakdown({
                      amount: li.total_cost,
                      vatHandling: resolveLineVatHandling((li as { pricing_method?: string | null }).pricing_method),
                      contractVatRate: c.vat_rate,
                      contractVatInclusive: c.vat_inclusive,
                    }),
                  }));
                  const lineVatById = new Map(lineVatRows.map(r => [r.id, r.breakdown]));
                  const lineVatTotals = sumLineVatBreakdowns(lineVatRows.map(r => r.breakdown));
                  const hasAnyLineVat = lineVatTotals.vat > 0 || lineVatRows.some(r => r.breakdown.vatHandling !== 'inherit');

                  return (
                    <div key={c.id} className="space-y-0">
                      <ContractCard
                        c={c} isRTL={isRTL} user={user} milestones={milestones} notes={notes}
                        attachments={attachments} payments={payments} measurements={measurements} profiles={profiles}
                        isExpanded={isExpanded} onExpand={setExpandedId} onNavigate={navigate}
                        onExportPDF={handleExportPDF}
                        onApprove={(contract) => setApproveConfirm(contract)}
                        onSendForApproval={(contract) => setSendConfirm(contract)}
                        onDuplicate={handleDuplicate}
                        onShare={handleShareContract}
                        onEdit={openEditContract}
                      />

                      {/* ── Expanded Detail Panel ── */}
                      {isExpanded && (
                        <Card className="border-t-0 rounded-t-none border-border/40 bg-gradient-to-b from-muted/10 to-transparent">
                          <CardContent className="p-4 sm:p-5">
                            {/* Lock Banner */}
                            {locked && (
                              <div className="flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-warning/80 dark:bg-warning/20 border border-warning/60 dark:border-warning/30">
                                <Shield className="w-4 h-4 text-warning shrink-0" />
                                <p className="text-[11px] text-warning dark:text-warning">{isRTL ? 'العقد معتمد — التعديل يتطلب ملحق عقد رسمي وموافقة الطرفين' : 'Contract approved — changes require a formal amendment with both parties\' approval'}</p>
                              </div>
                            )}

                            {/* Approval Timeline (read-only, derived) */}
                            <ContractApprovalTimeline contract={c} isRTL={isRTL} className="mb-4" />

                            <Tabs defaultValue="milestones">
                              <TabsList className="w-full justify-start bg-muted/40 rounded-xl p-1 h-auto flex-wrap gap-0.5 mb-4">
                                {[
                                  { value: 'milestones', icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', count: milestones.length },
                                  { value: 'payments', icon: CreditCard, label: isRTL ? 'الدفعات' : 'Payments', count: payments.length },
                                  { value: 'measurements', icon: Ruler, label: isRTL ? 'المقاسات' : 'Sizes', count: measurements.length },
                                  { value: 'warranty', icon: ShieldCheck, label: isRTL ? 'الضمان' : 'Warranty', count: warranties.length },
                                  { value: 'maintenance', icon: WrenchIcon, label: isRTL ? 'صيانة' : 'Maint.', count: maintenance.length },
                                  { value: 'notes', icon: StickyNote, label: isRTL ? 'ملاحظات' : 'Notes', count: notes.length },
                                  { value: 'attachments', icon: Paperclip, label: isRTL ? 'مرفقات' : 'Files', count: attachments.length },
                                  { value: 'amendments', icon: FileText, label: isRTL ? 'ملاحق' : 'Amendments', count: amendments.length },
                                  { value: 'actions', icon: Zap, label: isRTL ? 'إجراءات' : 'Actions' },
                                ].map(tab => (
                                  <TabsTrigger key={tab.value} value={tab.value} className="text-[10px] px-3 py-1.5 gap-1 rounded-lg data-[state=active]:shadow-sm">
                                    <tab.icon className="w-3 h-3" />{tab.label}
                                    {tab.count !== undefined && <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">{tab.count}</Badge>}
                                  </TabsTrigger>
                                ))}
                              </TabsList>

                              {/* ═══ Milestones Tab ═══ */}
                              <TabsContent value="milestones" className="mt-0">
                                {!locked && isProvider && (
                                  <div className="mb-3">
                                    {showAddMilestone === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'إضافة مرحلة جديدة' : 'Add Milestone'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                          <Input placeholder={isRTL ? 'اسم المرحلة' : 'Title'} value={milestoneForm.title_ar} onChange={e => setMilestoneForm(f => ({ ...f, title_ar: e.target.value }))} className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'المبلغ' : 'Amount'} value={milestoneForm.amount} onChange={e => setMilestoneForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!milestoneForm.title_ar || !milestoneForm.amount || addMilestoneMutation.isPending} onClick={() => addMilestoneMutation.mutate({ contractId: c.id })}>
                                            {addMilestoneMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddMilestone(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddMilestone(c.id)}>
                                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة مرحلة' : 'Add Milestone'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {milestones.length > 0 ? (
                                  <div className="relative">
                                    <div className="absolute top-0 bottom-0 start-4 w-0.5 bg-gradient-to-b from-accent/40 via-border/40 to-transparent" />
                                    <div className="space-y-2.5">
                                      {milestones.map((m, idx) => {
                                        const mTitle = isRTL ? m.title_ar : (m.title_en || m.title_ar);
                                        const isCompleted = m.status === 'completed';
                                        const isInProgress = (m.status as string) === 'in_progress';
                                        return (
                                          <div key={m.id} className="relative ps-10">
                                            <div className={`absolute top-2 start-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold z-10 transition-all ${isCompleted ? 'bg-success text-success-foreground shadow-lg shadow-success/30' : isInProgress ? 'bg-accent text-accent-foreground ring-2 ring-accent/30 shadow-md' : 'bg-card text-muted-foreground border-2 border-border'}`}>
                                              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                                            </div>
                                            <div className={`p-3 rounded-xl border transition-all ${isCompleted ? 'border-success/50 bg-success/30 dark:border-success/20 dark:bg-success/10' : isInProgress ? 'border-accent/30 bg-accent/5' : 'border-border/40 bg-card hover:border-border'}`}>
                                              <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-semibold text-xs">{mTitle}</h4>
                                                <div className="flex items-center gap-1">
                                                  {isProvider && !isCompleted && (
                                                    <Select value={m.status} onValueChange={v => updateMilestoneMutation.mutate({ id: m.id, status: v })}>
                                                      <SelectTrigger className="h-6 text-[8px] w-20 px-1.5 border-0 bg-transparent"><SelectValue /></SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="pending" className="text-[10px]">{isRTL ? 'قادم' : 'Pending'}</SelectItem>
                                                        <SelectItem value="in_progress" className="text-[10px]">{isRTL ? 'جاري' : 'In Progress'}</SelectItem>
                                                        <SelectItem value="completed" className="text-[10px]">{isRTL ? 'مكتمل' : 'Done'}</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  )}
                                                  <Badge variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'} className="text-[8px] shrink-0">{isCompleted ? (isRTL ? 'مكتمل' : 'Done') : isInProgress ? (isRTL ? 'جاري' : 'Progress') : (isRTL ? 'قادم' : 'Pending')}</Badge>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                                <span className="font-medium text-foreground"><DollarSign className="w-3 h-3 inline text-accent" />{Number(m.amount).toLocaleString()} {c.currency_code}</span>
                                                {m.due_date && <span><Calendar className="w-3 h-3 inline" /> {formatDate(m.due_date)}</span>}
                                                {m.completed_at && <span className="text-success"><CheckCircle2 className="w-3 h-3 inline" /> {formatDate(m.completed_at)}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد مراحل بعد' : 'No milestones yet'}</p>}
                              </TabsContent>

                              {/* ═══ Payments Tab ═══ */}
                              <TabsContent value="payments" className="mt-0">
                                {isProvider && (
                                  <div className="mb-3">
                                    {showAddPayment === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'إضافة دفعة جديدة' : 'Add Payment'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                          <Input type="number" placeholder={isRTL ? 'المبلغ' : 'Amount'} value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="date" placeholder={isRTL ? 'تاريخ الاستحقاق' : 'Due Date'} value={paymentForm.due_date} onChange={e => setPaymentForm(f => ({ ...f, due_date: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input placeholder={isRTL ? 'ملاحظات' : 'Notes'} value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} className="h-9 text-xs" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!paymentForm.amount || !paymentForm.due_date || addPaymentMutation.isPending} onClick={() => addPaymentMutation.mutate({ contractId: c.id })}>
                                            {addPaymentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddPayment(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddPayment(c.id)}>
                                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة دفعة' : 'Add Payment'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {payments.length > 0 ? (
                                  <div className="space-y-2">
                                    {payments.sort((a, b) => a.installment_number - b.installment_number).map((p) => (
                                      <div key={p.id} className={`p-3 rounded-xl border transition-all ${p.status === 'paid' ? 'border-success/50 bg-success/20 dark:border-success/20 dark:bg-success/10' : p.status === 'overdue' ? 'border-destructive/50 bg-destructive/20 dark:border-destructive/20' : 'border-border/40 bg-card'}`}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold ${p.status === 'paid' ? 'bg-success text-success-foreground' : p.status === 'overdue' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                                              {p.status === 'paid' ? <CheckCircle2 className="w-4 h-4" /> : p.installment_number}
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold">{isRTL ? `الدفعة ${p.installment_number}` : `Payment #${p.installment_number}`}</p>
                                              <p className="text-[10px] text-muted-foreground">{isRTL ? 'استحقاق:' : 'Due:'} {formatDate(p.due_date)}</p>
                                              {p.paid_at && <p className="text-[9px] text-success">{isRTL ? 'دفع:' : 'Paid:'} {formatDate(p.paid_at)}</p>}
                                              {p.notes && <p className="text-[9px] text-muted-foreground mt-0.5">{p.notes}</p>}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-end">
                                              <p className="text-sm font-bold">{Number(p.amount).toLocaleString()} {c.currency_code}</p>
                                              <Badge variant={p.status === 'paid' ? 'default' : p.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[8px] mt-0.5">
                                                {p.status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : p.status === 'overdue' ? (isRTL ? 'متأخر' : 'Overdue') : (isRTL ? 'معلق' : 'Pending')}
                                              </Badge>
                                            </div>
                                            {p.status !== 'paid' && isProvider && (
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:bg-success/10 dark:hover:bg-success/20 focus-visible:ring-2 focus-visible:ring-success/40" onClick={() => markPaidMutation.mutate({ paymentId: p.id })} aria-label={isRTL ? 'تأكيد السداد' : 'Mark as paid'} title={isRTL ? 'تأكيد السداد' : 'Mark as paid'}>
                                                <Banknote className="w-4 h-4" aria-hidden="true" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {/* Payment Summary */}
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-muted-foreground">{isRTL ? 'الإجمالي المدفوع' : 'Total Paid'}</span>
                                        <span className="text-xs font-bold text-success">{payments.filter((p)=>p.status==='paid').reduce((s:number, p)=>s+Number(p.amount),0).toLocaleString()} / {Number(c.total_amount).toLocaleString()} {c.currency_code}</span>
                                      </div>
                                      <Progress value={Number(c.total_amount) > 0 ? (payments.filter((p)=>p.status==='paid').reduce((s:number, p)=>s+Number(p.amount),0) / Number(c.total_amount)) * 100 : 0} className="h-1.5 [&>div]:bg-success" aria-label={isRTL ? 'نسبة المدفوع من إجمالي العقد' : 'Paid out of contract total'} />
                                    </div>
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد دفعات' : 'No payments yet'}</p>}
                              </TabsContent>

                              {/* ═══ Measurements & Line Items Tab ═══ */}
                              <TabsContent value="measurements" className="mt-0 space-y-4">
                                {/* Measurement Form */}
                                {!locked && isProvider && (
                                  <div className="mb-3">
                                    {showAddMeasurement === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'إضافة قطعة مقاس' : 'Add Measurement'}</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                          <Input placeholder={isRTL ? 'اسم القطعة' : 'Piece Name'} value={measurementForm.name_ar} onChange={e => setMeasurementForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9 text-xs" />
                                          <Input placeholder={isRTL ? 'رقم القطعة' : 'Piece #'} value={measurementForm.piece_number} onChange={e => setMeasurementForm(f => ({ ...f, piece_number: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Select value={measurementForm.floor_label} onValueChange={v => setMeasurementForm(f => ({ ...f, floor_label: v }))}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="ground_floor">{isRTL ? 'أرضي' : 'Ground'}</SelectItem>
                                              <SelectItem value="first_floor">{isRTL ? 'أول' : '1st'}</SelectItem>
                                              <SelectItem value="second_floor">{isRTL ? 'ثاني' : '2nd'}</SelectItem>
                                              <SelectItem value="third_floor">{isRTL ? 'ثالث' : '3rd'}</SelectItem>
                                              <SelectItem value="roof">{isRTL ? 'سطح' : 'Roof'}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input placeholder={isRTL ? 'الموقع' : 'Location'} value={measurementForm.location_ar} onChange={e => setMeasurementForm(f => ({ ...f, location_ar: e.target.value }))} className="h-9 text-xs" />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                          <Input type="number" placeholder={isRTL ? 'الطول (مم)' : 'Length mm'} value={measurementForm.length_mm} onChange={e => setMeasurementForm(f => ({ ...f, length_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'العرض (مم)' : 'Width mm'} value={measurementForm.width_mm} onChange={e => setMeasurementForm(f => ({ ...f, width_mm: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'الكمية' : 'Qty'} value={measurementForm.quantity} onChange={e => setMeasurementForm(f => ({ ...f, quantity: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'سعر الوحدة' : 'Unit Price'} value={measurementForm.unit_price} onChange={e => setMeasurementForm(f => ({ ...f, unit_price: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                        </div>
                                        {measurementForm.length_mm && measurementForm.width_mm && measurementForm.unit_price && (
                                          <div className="flex items-center gap-4 text-[11px] p-2.5 bg-muted/40 rounded-lg border border-border/30">
                                            <span>{isRTL ? 'المساحة:' : 'Area:'} <strong className="text-accent">{((Number(measurementForm.length_mm) * Number(measurementForm.width_mm)) / 1000000).toFixed(2)} م²</strong></span>
                                            <span>{isRTL ? 'التكلفة:' : 'Cost:'} <strong className="text-accent">{(Number(measurementForm.unit_price) * Number(measurementForm.quantity || 1)).toLocaleString()} {c.currency_code}</strong></span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!measurementForm.name_ar || !measurementForm.piece_number || !measurementForm.length_mm || addMeasurementMutation.isPending} onClick={() => addMeasurementMutation.mutate({ contractId: c.id })}>
                                            {addMeasurementMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddMeasurement(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddMeasurement(c.id)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'مقاس' : 'Measurement'}</Button>
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddLineItem(c.id)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'بند إضافي' : 'Line Item'}</Button>
                                        {(() => {
                                          const cv = (c as { template_version_id?: string | null }).template_version_id ?? null;
                                          const cat = cv ? (publishedVersions.find(v => v.version_id === cv)?.category ?? 'general') : 'general';
                                          return (
                                            <SuggestedBOQPanel
                                              isRTL={isRTL}
                                              isPending={addStarterBoqMutation.isPending}
                                              onAdd={() => addStarterBoqMutation.mutate({ contractId: c.id, category: cat })}
                                            />
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Line Item Form */}
                                {showAddLineItem === c.id && !locked && isProvider && (
                                  (() => {
                                    const cTemplateVersion = (c as { template_version_id?: string | null }).template_version_id ?? null;
                                    const templateAllowed = cTemplateVersion ? allowedMethodsByVersion.get(cTemplateVersion) : undefined;
                                    const hasAllowList = !!templateAllowed && templateAllowed.length > 0;
                                    const methodOptions = hasAllowList
                                      ? SUPPORTED_PRICING_METHODS.filter(m => templateAllowed!.includes(m))
                                      : SUPPORTED_PRICING_METHODS;
                                    // Auto-correct selected method if it's not allowed.
                                    if (hasAllowList && methodOptions.length > 0 && !methodOptions.includes(lineItemForm.pricing_method)) {
                                      // Defer state update to next tick to avoid setState-during-render warning.
                                      queueMicrotask(() => setLineItemForm(f => ({ ...f, pricing_method: methodOptions[0] })));
                                    }
                                    return (
                                  <LineItemFormSection
                                    isRTL={isRTL}
                                    currency={c.currency_code}
                                    form={lineItemForm}
                                    setForm={setLineItemForm}
                                    methodOptions={methodOptions}
                                    hasAllowList={hasAllowList}
                                    isPending={addLineItemMutation.isPending}
                                    onAdd={() => addLineItemMutation.mutate({ contractId: c.id })}
                                    onCancel={() => setShowAddLineItem(null)}
                                  />
                                    );
                                  })()
                                )}

                                {/* Measurements List */}
                                {measurements.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Ruler className="w-3 h-3" />{isRTL ? 'المقاسات' : 'Measurements'}</h5>
                                    {measurements.map((m) => (
                                      <div key={m.id} className="p-3 rounded-xl bg-card border border-border/30 flex items-center justify-between gap-3 hover:border-accent/20 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <Badge variant="outline" className="text-[9px] shrink-0 font-mono px-2 py-0.5">{m.piece_number}</Badge>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{isRTL ? m.name_ar : (m.name_en || m.name_ar)}</p>
                                            <p className="text-[9px] text-muted-foreground">{m.floor_label} • {isRTL ? m.location_ar : (m.location_en || m.location_ar)} • {isRTL ? 'كمية:' : 'Qty:'} {m.quantity}</p>
                                          </div>
                                        </div>
                                        <div className="text-end shrink-0">
                                          <p className="text-[10px] font-mono text-muted-foreground">{m.length_mm}×{m.width_mm} mm</p>
                                          <p className="text-xs font-bold">{Number(m.total_cost || 0).toLocaleString()} {c.currency_code}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Line Items List */}
                                {lineItems.length > 0 && (
                                  <div className="space-y-2">
                                    {(() => {
                                      const typeLabels: Record<string, string> = { service: isRTL ? 'خدمة' : 'Service', material: isRTL ? 'مادة' : 'Material', installation: isRTL ? 'تركيب' : 'Install', other: isRTL ? 'أخرى' : 'Other' };
                                      const groups = groupLineItemsByBoqGroup(lineItems);
                                      const mixed = hasMixedPricing(lineItems);
                                      const methodsUsed = listPricingMethodsUsed(lineItems);
                                      return (
                                        <>
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <h5 className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                              <ClipboardList className="w-3 h-3" />{isRTL ? 'بنود إضافية' : 'Additional Items'}
                                            </h5>
                                            {mixed && (
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="outline" className="text-[9px] border-accent/40 text-accent">
                                                  {isRTL ? 'تسعير مختلط' : 'Mixed pricing'}
                                                </Badge>
                                                <span className="text-[9px] text-muted-foreground">
                                                  {methodsUsed.map(m => formatPricingMethodLabel(m, isRTL ? 'ar' : 'en')).join(' • ')}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          {groups.map((g) => (
                                            <div key={g.key} className="space-y-1.5">
                                              <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                  {isRTL ? g.label_ar : g.label_en}
                                                </span>
                                                <span className="text-[10px] font-bold text-accent">
                                                  {g.subtotal.toLocaleString()} {c.currency_code}
                                                </span>
                                              </div>
                                              {(() => {
                                                const groupVat = sumLineVatBreakdowns(
                                                  g.items.map(it => lineVatById.get(it.id)).filter((b): b is NonNullable<typeof b> => !!b)
                                                );
                                                if (groupVat.vat <= 0 && groupVat.gross <= 0) return null;
                                                return (
                                                  <div className="px-2 flex items-center justify-end gap-3 text-[9px] text-muted-foreground">
                                                    <span>{isRTL ? 'الصافي' : 'Net'}: <span className="font-mono text-foreground/80">{groupVat.net.toLocaleString()}</span></span>
                                                    <span>{isRTL ? 'الضريبة' : 'VAT'}: <span className="font-mono text-foreground/80">{groupVat.vat.toLocaleString()}</span></span>
                                                    <span>{isRTL ? 'الإجمالي' : 'Gross'}: <span className="font-mono text-accent">{groupVat.gross.toLocaleString()}</span></span>
                                                  </div>
                                                );
                                              })()}
                                              {g.items.map((li) => (
                                                <div key={li.id} className="p-3 rounded-xl bg-card border border-border/30 flex items-center justify-between gap-3 hover:border-primary/20 transition-colors">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <Badge variant="secondary" className="text-[8px] shrink-0">{typeLabels[li.item_type] || li.item_type}</Badge>
                                                    <div className="min-w-0">
                                                      <p className="text-xs font-medium truncate">{li.name_ar}</p>
                                                      {li.description_ar && <p className="text-[9px] text-muted-foreground truncate">{li.description_ar}</p>}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-end shrink-0">
                                                      <p className="text-[10px] text-muted-foreground">
                                                        {li.pricing_method && li.pricing_method !== 'unit' ? `${formatPricingMethodLabel(li.pricing_method, isRTL ? 'ar' : 'en')} • ` : ''}
                                                        {li.quantity} × {Number(li.unit_price).toLocaleString()}
                                                      </p>
                                                      <p className="text-xs font-bold">{Number(li.total_cost || 0).toLocaleString()} {c.currency_code}</p>
                                                      {(() => {
                                                        const b = lineVatById.get(li.id);
                                                        if (!b) return null;
                                                        const handlingLabel = formatVatHandlingLabel(b.vatHandling, isRTL ? 'ar' : 'en');
                                                        if (b.vatHandling === 'exempt' || b.vat <= 0) {
                                                          return <p className="text-[9px] text-muted-foreground mt-0.5">{handlingLabel}</p>;
                                                        }
                                                        return (
                                                          <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                                                            {handlingLabel} • {isRTL ? 'صافي' : 'Net'} {b.net.toLocaleString()} • {isRTL ? 'ض' : 'VAT'} {b.vat.toLocaleString()}
                                                          </p>
                                                        );
                                                      })()}
                                                    </div>
                                                    {!locked && isProvider && (
                                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40" onClick={() => deleteLineItemMutation.mutate({ id: li.id, contractId: c.id })} aria-label={isRTL ? 'حذف البند' : 'Delete line item'} title={isRTL ? 'حذف البند' : 'Delete line item'}>
                                                        <X className="w-3 h-3" aria-hidden="true" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ))}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                                {measurements.length === 0 && lineItems.length === 0 && <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد مقاسات أو بنود' : 'No measurements or items'}</p>}

                                {/* Financial Summary with VAT */}
                                {(measurements.length > 0 || lineItems.length > 0) && (
                                  <ContractFinancialSummary
                                    isRTL={isRTL}
                                    currency={c.currency_code}
                                    measurementsCount={measurements.length}
                                    measurementTotal={measurementTotal}
                                    lineItemsCount={lineItems.length}
                                    lineItemTotal={lineItemTotal}
                                    subtotal={subtotal}
                                    vatRate={vatRate}
                                    vatInclusive={c.vat_inclusive}
                                    vatAmount={vatAmount}
                                    grandTotal={grandTotal}
                                  />
                                )}

                                {/* CT5G.2 — Derived per-line/per-group VAT breakdown (display only). */}
                                {lineItems.length > 0 && (
                                  <ContractLineVatBreakdown
                                    isRTL={isRTL}
                                    currency={c.currency_code}
                                    hasAnyLineVat={hasAnyLineVat}
                                    lineVatTotals={lineVatTotals}
                                  />
                                )}
                              </TabsContent>

                              {/* ═══ Warranty Tab ═══ */}
                              <TabsContent value="warranty" className="mt-0">
                                {warranties.length > 0 ? (
                                  <div className="space-y-2.5">
                                    {warranties.map((w) => {
                                      const daysLeft = w.end_date ? Math.ceil((new Date(w.end_date).getTime() - Date.now()) / (1000*60*60*24)) : null;
                                      return (
                                        <div key={w.id} className="p-3.5 rounded-xl border border-border/40 bg-card">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-semibold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" />{isRTL ? (w.title_ar || 'شهادة الضمان') : (w.title_en || w.title_ar || 'Warranty')}</h4>
                                            {daysLeft !== null && (
                                              <Badge variant={daysLeft > 90 ? 'default' : daysLeft > 0 ? 'secondary' : 'destructive'} className="text-[9px]">
                                                {daysLeft > 0 ? (isRTL ? `${daysLeft} يوم` : `${daysLeft}d`) : (isRTL ? 'منتهي' : 'Expired')}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div><span className="text-muted-foreground">{isRTL ? 'البداية:' : 'Start:'}</span> {formatDate(w.start_date)}</div>
                                            <div><span className="text-muted-foreground">{isRTL ? 'النهاية:' : 'End:'}</span> {formatDate(w.end_date)}</div>
                                          </div>
                                          {(w as any).coverage_description_ar && <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">{isRTL ? (w as any).coverage_description_ar : ((w as any).coverage_description_en || (w as any).coverage_description_ar)}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا يوجد ضمان' : 'No warranty'}</p>}
                              </TabsContent>

                              {/* ═══ Maintenance Tab ═══ */}
                              <TabsContent value="maintenance" className="mt-0">
                                {maintenance.length > 0 ? (
                                  <div className="space-y-2">
                                    {maintenance.map((r) => (
                                      <div key={r.id} className="p-3 rounded-xl border border-border/40 bg-card">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <h4 className="text-xs font-semibold truncate">{isRTL ? r.title_ar : (r.title_en || r.title_ar)}</h4>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Badge variant={r.priority === 'urgent' ? 'destructive' : 'outline'} className="text-[8px]">{r.priority}</Badge>
                                            <Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="text-[8px]">{r.status}</Badge>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                          <span className="font-mono">{r.request_number}</span>
                                          {r.scheduled_date && <span><Calendar className="w-3 h-3 inline" /> {formatDate(r.scheduled_date)}</span>}
                                        </div>
                                        {r.description_ar && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{isRTL ? r.description_ar : (r.description_en || r.description_ar)}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد طلبات صيانة' : 'No maintenance requests'}</p>}
                              </TabsContent>

                              {/* ═══ Notes Tab ═══ */}
                              <TabsContent value="notes" className="mt-0">
                                <div className="flex gap-2 mb-3">
                                  <Input placeholder={isRTL ? 'اكتب ملاحظة...' : 'Write a note...'} value={expandedId === c.id ? noteText : ''} onChange={e => setNoteText(e.target.value)} className="text-xs h-9" />
                                  <Button variant="default" size="sm" className="h-9 gap-1.5 text-xs shrink-0" disabled={!noteText.trim() || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate({ contractId: c.id, content: noteText })}>
                                    {addNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}{isRTL ? 'إرسال' : 'Send'}
                                  </Button>
                                </div>
                                {notes.length > 0 ? (
                                  <div className="space-y-2 max-h-52 overflow-y-auto">
                                    {notes.map((n) => (
                                      <div key={n.id} className="p-3 rounded-xl bg-card border border-border/30">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-1.5">
                                            <Avatar className="w-5 h-5">
                                              <AvatarFallback className="text-[7px] bg-accent/10">{(profiles.find((p) => p.user_id === n.user_id)?.full_name || '?').charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] font-medium">{n.user_id === user?.id ? (isRTL ? 'أنت' : 'You') : (profiles.find((p) => p.user_id === n.user_id)?.full_name || '-')}</span>
                                            {n.note_type !== 'note' && <Badge variant="outline" className="text-[7px] px-1 h-3.5">{n.note_type}</Badge>}
                                          </div>
                                          <span className="text-[9px] text-muted-foreground">{formatDate(n.created_at)}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{n.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحظات' : 'No notes yet'}</p>}
                              </TabsContent>

                              {/* ═══ Attachments Tab ═══ */}
                              <TabsContent value="attachments" className="mt-0">
                                <div className="mb-3">
                                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file && uploadingContractId) uploadAttachmentMutation.mutate({ contractId: uploadingContractId, file }); e.target.value = ''; }} />
                                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={uploadAttachmentMutation.isPending} onClick={() => { setUploadingContractId(c.id); fileInputRef.current?.click(); }}>
                                    {uploadAttachmentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    {isRTL ? 'رفع مرفق' : 'Upload File'}
                                  </Button>
                                </div>
                                {attachments.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {attachments.map((a) => (
                                      <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl border border-border/40 bg-card hover:border-accent/30 hover:shadow-sm transition-all flex items-center gap-3 group">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${a.file_type === 'image' ? 'bg-info/10' : 'bg-urgent/10'}`}>
                                          {a.file_type === 'image' ? '🖼️' : '📄'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[11px] font-medium truncate group-hover:text-accent transition-colors">{a.file_name}</p>
                                          <p className="text-[9px] text-muted-foreground">{formatDate(a.created_at)}</p>
                                        </div>
                                        <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-accent transition-colors" />
                                      </a>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-8 text-muted-foreground text-xs">{isRTL ? 'لا توجد مرفقات' : 'No attachments'}</p>}
                              </TabsContent>

                              {/* ═══ Amendments Tab ═══ */}
                              <TabsContent value="amendments" className="mt-0">
                                {locked && (
                                  <div className="mb-3">
                                    {showAddAmendment === c.id ? (
                                      <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                                        <h4 className="text-xs font-semibold">{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          <Input placeholder={isRTL ? 'عنوان التعديل' : 'Amendment title'} value={amendmentForm.title_ar} onChange={e => setAmendmentForm(f => ({ ...f, title_ar: e.target.value }))} className="h-9 text-xs" />
                                          <Select value={amendmentForm.amendment_type} onValueChange={v => setAmendmentForm(f => ({ ...f, amendment_type: v }))}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="scope_change">{isRTL ? 'تعديل نطاق العمل' : 'Scope Change'}</SelectItem>
                                              <SelectItem value="financial">{isRTL ? 'تعديل مالي' : 'Financial'}</SelectItem>
                                              <SelectItem value="extension">{isRTL ? 'تمديد المدة' : 'Extension'}</SelectItem>
                                              <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Textarea placeholder={isRTL ? 'وصف التعديل المطلوب...' : 'Describe the amendment...'} value={amendmentForm.description_ar} onChange={e => setAmendmentForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} className="text-xs" />
                                        {amendmentForm.amendment_type === 'financial' && (
                                          <Input type="number" placeholder={isRTL ? 'المبلغ الجديد' : 'New Amount'} value={amendmentForm.new_amount} onChange={e => setAmendmentForm(f => ({ ...f, new_amount: e.target.value }))} dir="ltr" className="h-9 text-xs" />
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-8 text-xs gap-1" disabled={!amendmentForm.title_ar || addAmendmentMutation.isPending} onClick={() => addAmendmentMutation.mutate({ contractId: c.id })}>
                                            {addAmendmentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}{isRTL ? 'إرسال الطلب' : 'Submit'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAddAmendment(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowAddAmendment(c.id)}>
                                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {!locked && <p className="text-center py-4 text-muted-foreground text-[11px]">{isRTL ? 'العقد لم يُعتمد بعد — يمكنك تعديله مباشرة' : 'Contract not yet approved — you can edit it directly'}</p>}
                                {amendments.length > 0 ? (
                                  <div className="space-y-2">
                                    {amendments.map((a) => {
                                      const canApproveAmendment = a.status === 'pending' && (
                                        (user?.id === c.client_id && !a.client_approved_at) ||
                                        (user?.id === c.provider_id && !a.provider_approved_at)
                                      );
                                      const typeLabels: Record<string, string> = { scope_change: isRTL ? 'نطاق العمل' : 'Scope', financial: isRTL ? 'مالي' : 'Financial', extension: isRTL ? 'تمديد' : 'Extension', other: isRTL ? 'أخرى' : 'Other' };
                                      return (
                                        <div key={a.id} className={`p-3.5 rounded-xl border ${a.status === 'approved' ? 'border-success/50 bg-success/20 dark:border-success/20 dark:bg-success/10' : a.status === 'rejected' ? 'border-destructive/50 bg-destructive/20' : 'border-warning/50 bg-warning/20 dark:border-warning/20'}`}>
                                          <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <h4 className="text-xs font-semibold truncate">{a.title_ar}</h4>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Badge variant="outline" className="text-[8px]">{typeLabels[a.amendment_type] || a.amendment_type}</Badge>
                                              <Badge variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[8px]">
                                                {a.status === 'approved' ? (isRTL ? 'معتمد' : 'Approved') : a.status === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected') : (isRTL ? 'بانتظار' : 'Pending')}
                                              </Badge>
                                            </div>
                                          </div>
                                          {a.description_ar && <p className="text-[10px] text-muted-foreground mb-2">{a.description_ar}</p>}
                                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                                            {a.new_amount && <span className="font-medium">{isRTL ? 'المبلغ الجديد:' : 'New:'} {Number(a.new_amount).toLocaleString()} {c.currency_code}</span>}
                                            <span>{isRTL ? 'العميل:' : 'Client:'} {a.client_approved_at ? '✅' : '⏳'}</span>
                                            <span>{isRTL ? 'المزود:' : 'Provider:'} {a.provider_approved_at ? '✅' : '⏳'}</span>
                                            <span>{formatDate(a.created_at)}</span>
                                          </div>
                                          {canApproveAmendment && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 mt-2.5 text-success border-success hover:bg-success" onClick={() => approveAmendmentMutation.mutate({ amendmentId: a.id, contract: c })}>
                                              <CircleCheck className="w-3.5 h-3.5" />{isRTL ? 'موافقة على الملحق' : 'Approve Amendment'}
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : locked && <p className="text-center py-4 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحق بعد' : 'No amendments yet'}</p>}
                              </TabsContent>

                              {/* ═══ Actions Tab ═══ */}
                              <TabsContent value="actions" className="mt-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                  {[
                                    { icon: Download, label: isRTL ? 'تصدير PDF' : 'Export PDF', onClick: () => handleExportPDF(c), disabled: isExporting, show: true },
                                    { icon: Copy, label: isRTL ? 'نسخ العقد' : 'Duplicate', onClick: () => handleDuplicate(c), show: true },
                                    { icon: Share2, label: isRTL ? 'مشاركة' : 'Share', onClick: () => handleShareContract(c), show: true },
                                    { icon: Send, label: isRTL ? 'إرسال للمراجعة' : 'Send for Review', onClick: () => setSendConfirm(c), show: c.status === 'draft' && user?.id === c.provider_id, className: 'text-primary border-primary/30' },
                                    { icon: CircleCheck, label: isRTL ? 'موافقة' : 'Approve', onClick: () => setApproveConfirm(c), show: ((user?.id === c.client_id && !c.client_accepted_at) || (user?.id === c.provider_id && !c.provider_accepted_at)) && c.status !== 'completed' && c.status !== 'cancelled', className: 'text-success border-success' },
                                    { icon: Edit3, label: isRTL ? 'تعديل' : 'Edit', onClick: () => openEditContract(c), show: !locked && user?.id === c.provider_id },
                                    { icon: FileText, label: isRTL ? 'طلب ملحق' : 'Amendment', onClick: () => setShowAddAmendment(c.id), show: locked, className: 'text-warning border-warning' },
                                    { icon: ExternalLink, label: isRTL ? 'عرض كامل' : 'Full View', onClick: () => navigate(`/contracts/${c.id}`), show: true },
                                  ].filter(a => a.show).map((action, i) => (
                                    <Button key={i} variant="outline" size="sm" className={`gap-2 text-xs h-10 ${action.className || ''}`} onClick={action.onClick} disabled={action.disabled}>
                                      <action.icon className="w-4 h-4" />{action.label}
                                    </Button>
                                  ))}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve Confirmation */}
      <AlertDialog open={!!approveConfirm} onOpenChange={() => setApproveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'الموافقة على العقد' : 'Approve Contract'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل تريد الموافقة على هذا العقد؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Approve this contract? This action cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={() => approveConfirm && approveMutation.mutate(approveConfirm)}>
              <CircleCheck className="w-4 h-4 me-2" />{isRTL ? 'موافقة' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Confirmation */}
      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'إرسال العقد للمراجعة' : 'Send for Review'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'سيتم إرسال إشعار للعميل لمراجعة العقد والموافقة عليه.' : 'A notification will be sent to the client to review and approve.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => sendConfirm && sendForApprovalMutation.mutate(sendConfirm)}>
              <Send className="w-4 h-4 me-2" />{isRTL ? 'إرسال' : 'Send'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default DashboardContracts;
