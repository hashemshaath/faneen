import React, { useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getContractById } from '@/modules/contracts';
import { listWarrantiesForContract } from '@/modules/catalog';
import type { Database } from '@/integrations/supabase/types';
import { verifyPdfArabic } from '@/modules/contracts/services/pdf/verifyPdfArabic';
import { getProfileForContractParty } from '@/modules/users';
import { createNotificationFireAndForget } from '@/modules/notifications/services/createNotification';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import type { ImportedMeasurement } from '@/lib/contract-pdf-export';
import type { ArabicFontDiagnostics } from '@/lib/pdf-arabic-font';
import { getContractStatusMeta, isContractLockedByStatus } from '@/lib/contract-statuses';
import { getStatusGuidance } from '@/lib/contract-status-guidance';
import { mapContractLockError } from '@/lib/contract-errors';
import { dispatchAmendmentEvent } from '@/lib/amendment-notify';
import { approveAmendment, rejectAmendment, cancelAmendment, applyAmendment } from '@/modules/contracts/services/amendments';
import { acceptContract, recalcContractTotal as recalcContractTotalService } from '@/modules/contracts/services/mutations';
import { getContractSourceLeadSummary } from '@/modules/contracts/services/leadRpcs';
import {
  listContractMilestones,
  createContractMilestone,
  listContractNotes,
  createContractNote,
  deleteContractNote,
  listContractMeasurements,
  createContractMeasurement,
  updateContractMeasurement,
  deleteContractMeasurement,
  listContractAttachments,
  listInstallmentPlansForContract,
  listInstallmentPaymentsByPlanIds,
  updateInstallmentPayment,
  updateInstallmentPaymentIfStatus,
} from '@/modules/contracts/services/childTables';
import { recordContractPdfExport } from '@/lib/contract-pdf-history';
import { ContractPdfExportHistory } from '@/components/contract/ContractPdfExportHistory';
import { ContractPdfPreviewOverlay } from '@/components/contract/ContractPdfPreviewOverlay';
import { ContractPdfAnalysisLog } from '@/components/contract/ContractPdfAnalysisLog';
import { PdfAnalysisReport } from '@/components/contract/PdfAnalysisReport';
import { calculateVatBreakdown } from '@/lib/contract-financials';
import BarcodeWidget from '@/components/barcodes/BarcodeWidget';
import { useEntityBarcode } from '@/lib/barcodes/useEntityBarcode';
import { InfoRow } from '@/modules/contracts/components/InfoRow';
import { StatCard } from '@/modules/contracts/components/StatCard';
import { ClauseSection } from '@/modules/contracts/components/ClauseSection';
import { ContractLockBanner } from '@/modules/contracts/components/ContractLockBanner';
import { ContractTabsHeader } from '@/modules/contracts/components/ContractTabsHeader';
import {
  statusConfig,
  priorityConfig,
  noteTypeConfig,
} from '@/modules/contracts/constants/statusConfigs';
import { sendTransactionalEmail }  from '@/modules/notifications/services/sendTransactionalEmail';
import { getBusinessForContract } from '@/modules/businesses';

// ─── Phase 5E.2 — Safe source-lead summary card ───
type SourceLeadSummary = {
  lead_id: string;
  lead_ref_id: string | null;
  subject: string | null;
  status: string | null;
  source: string | null;
  contact_preference: string | null;
  created_at: string | null;
  converted_at: string | null;
};

const SourceLeadSummaryCard: React.FC<{
  contractId: string;
  isRTL: boolean;
  canOpenLead: boolean;
}> = ({ contractId, isRTL, canOpenLead }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['contract-source-lead-summary', contractId],
    queryFn: async () => {
      const { data, error } = await getContractSourceLeadSummary({
        _contract_id: contractId,
      });
      if (error) return null;
      return (data as unknown as SourceLeadSummary | null) ?? null;
    },
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;

  const fmtDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return null; }
  };

  const createdAt = fmtDate(data.created_at);
  const convertedAt = fmtDate(data.converted_at);

  return (
    <div
      className="rounded-xl border border-info/30 bg-info/5 p-3 sm:p-4 mb-5 sm:mb-6"
      role="note"
      aria-label={isRTL ? 'مصدر العقد' : 'Contract source'}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-info">
          <Inbox className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {isRTL ? 'مصدر العقد: طلب خدمة' : 'Contract source: Service request'}
            </p>
            {data.lead_ref_id && (
              <span className="tech-content inline-flex items-center text-[11px] font-mono rounded-md border border-border bg-card px-2 py-0.5 text-muted-foreground">
                {data.lead_ref_id}
              </span>
            )}
          </div>
          {data.subject && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
              {data.subject}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.status && (
              <span className="inline-flex items-center text-[11px] rounded-md border border-border bg-card px-2 py-0.5 text-muted-foreground">
                {isRTL ? 'الحالة: ' : 'Status: '}{data.status}
              </span>
            )}
            {createdAt && (
              <span className="inline-flex items-center text-[11px] rounded-md border border-border bg-card px-2 py-0.5 text-muted-foreground">
                {isRTL ? 'أُنشئ: ' : 'Created: '}{createdAt}
              </span>
            )}
            {convertedAt && (
              <span className="inline-flex items-center text-[11px] rounded-md border border-border bg-card px-2 py-0.5 text-muted-foreground">
                {isRTL ? 'حُوِّل: ' : 'Converted: '}{convertedAt}
              </span>
            )}
          </div>
          {canOpenLead && (
            <div className="mt-3">
              <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Link to="/dashboard/leads" aria-label={isRTL ? 'فتح الطلب' : 'Open lead'}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {isRTL ? 'فتح الطلب' : 'Open lead'}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import { PaymentScheduleGenerator } from '@/components/contract/PaymentScheduleGenerator';
import { ContractFinancialCoverage } from '@/components/contract/ContractFinancialCoverage';
import { SignedAttachmentImage } from '@/components/contract/SignedAttachment';
import { ContractAttachmentsTab } from '@/components/contract/ContractAttachmentsTab';
import { MeasurementAttachmentsPanel } from '@/components/contract/MeasurementAttachmentsPanel';
import { PaymentReceiptPanel } from '@/components/contract/PaymentReceiptPanel';
import { AmendmentHistoryPanel } from '@/components/contract/AmendmentHistoryPanel';
import {
  openAttachment as openAttachmentSigned,
  type AttachmentRow,
} from '@/lib/contract-attachments';
import {
  FileText, Shield, Wrench, CheckCircle2, Clock,
  Calendar, DollarSign, AlertTriangle, XCircle, ListChecks, Plus, Send,
  Building2, User, Download, Copy, Hash, Banknote,
  CalendarDays, ChevronLeft, ChevronRight, Home, Printer,
  Mail, Phone, MapPin, IdCard, Globe, Paperclip,
  Eye, Scale, Handshake, BookOpen, CircleAlert,
  PenTool, StickyNote, Trash2, FileImage, ShieldCheck, ShieldX,
  Package, CircleDot, Timer, BadgeCheck, ReceiptText,
  ChevronDown, ChevronUp, Info, Percent, CreditCard,
  Ruler, Grid3X3, Layers, ArrowRight, MessageSquare, Inbox,
  Upload, Search, Filter, MoreVertical, ExternalLink,
  Star, Share2, Flag, RefreshCw, ArrowUpDown,
} from 'lucide-react';

/* ─── Status config ───
 * Contract-level statuses are sourced from `@/lib/contract-statuses` (single
 * source of truth). The extra entries below (pending, in_progress, paid,
 * overdue, submitted, expired, installed) are NOT contract enum values —
 * they belong to milestones, payments, and measurements which are rendered
 * from this same file. They live here for now and will move to
 * `getSecondaryStatusMeta()` in a future cleanup pass.
 */
const mapAmendmentError = (err: unknown, isRTL: boolean): string => {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const arMap: Record<string, string> = {
    requester_cannot_self_approve: 'لا يمكن للمنشئ الموافقة على طلبه',
    not_contract_party: 'لست طرفاً في هذا العقد',
    invalid_status: 'حالة غير صالحة لهذا الإجراء',
    already_terminal: 'تم إنهاء هذا الطلب مسبقاً',
    missing_rejection_reason: 'سبب الرفض مطلوب',
    contract_not_found: 'العقد غير موجود',
    amendment_not_found: 'طلب التعديل غير موجود',
    overpaid_refund_required: 'لا يمكن تطبيق التعديل لأن المبلغ الجديد أقل من إجمالي الدفعات المدفوعة',
    amendment_not_approved: 'لا يمكن التطبيق — التعديل غير معتمد',
    not_authorized: 'لا تملك صلاحية تنفيذ هذا الإجراء',
    invalid_new_amount: 'قيمة العقد الجديدة غير صالحة',
    missing_new_amount: 'قيمة العقد الجديدة غير محددة',
  };
  const enMap: Record<string, string> = {
    requester_cannot_self_approve: 'Requester cannot approve their own request',
    not_contract_party: 'You are not a party to this contract',
    invalid_status: 'Invalid status for this action',
    already_terminal: 'Request has already been finalized',
    missing_rejection_reason: 'Rejection reason is required',
    contract_not_found: 'Contract not found',
    amendment_not_found: 'Amendment not found',
    overpaid_refund_required: 'Cannot apply — new total is below total paid amount',
    amendment_not_approved: 'Cannot apply — amendment is not approved',
    not_authorized: 'You are not authorized for this action',
    invalid_new_amount: 'New contract amount is invalid',
    missing_new_amount: 'New contract amount is missing',
  };
  const map = isRTL ? arMap : enMap;
  for (const key of Object.keys(map)) if (msg.includes(key)) return map[key];
  return msg || (isRTL ? 'حدث خطأ غير متوقع' : 'Unexpected error');
};

const ContractDetail = () => {
  // C5C: friendly Arabic/English mapping for amendment RPC error codes.
  // Defined inside component so it can capture isRTL via closure-style call.
  const { id } = useParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: contractBarcodeCode } = useEntityBarcode('contract', id);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  // PDF-UX1: inline fullscreen preview state.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('contract.pdf');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfDiagnostics, setPdfDiagnostics] = useState<ArabicFontDiagnostics | null>(null);
  const [pdfBackendReport, setPdfBackendReport] = useState<string | null>(null);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const pdfDebugEnabled = (import.meta.env.DEV || import.meta.env.VITE_ENABLE_PDF_DEBUG === 'true') && isAdmin;
  const navigate = useNavigate();

  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintPriority, setMaintPriority] = useState<string>('medium');
  const [maintWarrantyId, setMaintWarrantyId] = useState<string>('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [activeTab, setActiveTab] = useState('milestones');
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [expandedMaint, setExpandedMaint] = useState<string | null>(null);
  const [measurementFilter, setMeasurementFilter] = useState<string>('all');
  const [expandedMeasurementAttId, setExpandedMeasurementAttId] = useState<string | null>(null);
  // Measurement CRUD
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<any>(null);
  const [mForm, setMForm] = useState({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '', notes: '' });
  // Milestone CRUD
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msForm, setMsForm] = useState({ title_ar: '', amount: '', due_date: '', description_ar: '' });
  // Amendment
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amForm, setAmForm] = useState({
    title_ar: '', title_en: '',
    description_ar: '', description_en: '',
    reason: '',
    amendment_type: 'scope_change',
    new_amount: '',
    new_end_date: '',
  });
  // Import measurements
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importedMeasurements, setImportedMeasurements] = useState<ImportedMeasurement[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [editingImportIdx, setEditingImportIdx] = useState<number | null>(null);
  // C3D — Manual payment confirmation (no gateway, no auto-status)
  const [confirmingPayId, setConfirmingPayId] = useState<string | null>(null);
  const [payConfirmForm, setPayConfirmForm] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    notes: '',
  });
  const [confirmingPayBusy, setConfirmingPayBusy] = useState(false);

  /* ─── Queries ─── */
  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data, error } = await getContractById({ id: id!, select: '*' });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: business } = useQuery({
    queryKey: ['contract-business', contract?.business_id],
    queryFn: async () => {
      const { data } = await getBusinessForContract<{
        name_ar: string;
        name_en: string | null;
        logo_url: string | null;
        username: string | null;
        address: string | null;
        district: string | null;
        street_name: string | null;
        building_number: string | null;
        additional_number: string | null;
        region: string | null;
        categories: { name_ar: string | null; name_en: string | null } | null;
        [key: string]: unknown;
      }>(contract!.business_id!);
      return data;
    },
    enabled: !!contract?.business_id,
  });

  // Phase 7: project (client_site) barcode for the PDF identifiers block.
  // Defaults to siteRefFallback rendering when not provisioned.
  const _executionSiteId = (contract as unknown as { execution_site_id?: string | null } | null)?.execution_site_id ?? null;
  const { data: projectBarcodeCode } = useEntityBarcode('client_site', _executionSiteId || undefined);

  const { data: milestones } = useQuery({
    queryKey: ['milestones', id],
    queryFn: async () => {
      const { data } = await listContractMilestones(id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: warranties } = useQuery({
    queryKey: ['warranties', id],
    queryFn: async () => {
      const { data } = await listWarrantiesForContract<
        Database['public']['Tables']['warranties']['Row']
      >({ contractId: id!, select: '*' });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: maintenanceReqs } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: async () => {
      const { data } = await supabase.from('maintenance_requests').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['profile', contract?.client_id],
    queryFn: async () => {
      const { data } = await getProfileForContractParty({ userId: contract!.client_id });
      return data;
    },
    enabled: !!contract,
  });

  const { data: providerProfile } = useQuery({
    queryKey: ['profile', contract?.provider_id],
    queryFn: async () => {
      const { data } = await getProfileForContractParty({ userId: contract!.provider_id });
      return data;
    },
    enabled: !!contract,
  });

  const { data: notes } = useQuery({
    queryKey: ['contract-notes', id],
    queryFn: async () => {
      const { data } = await listContractNotes(id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: attachments } = useQuery({
    queryKey: ['contract-attachments', id],
    queryFn: async () => {
      const { data } = await listContractAttachments(id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: installmentPlans } = useQuery({
    queryKey: ['installment-plans', id],
    queryFn: async () => {
      const { data } = await listInstallmentPlansForContract(id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: installmentPayments } = useQuery({
    queryKey: ['installment-payments', installmentPlans?.[0]?.id],
    queryFn: async () => {
      const planIds = installmentPlans!.map(p => p.id);
      const { data } = await listInstallmentPaymentsByPlanIds(planIds);
      return data ?? [];
    },
    enabled: !!installmentPlans && installmentPlans.length > 0,
  });

  const { data: measurements } = useQuery({
    queryKey: ['contract-measurements', id],
    queryFn: async () => {
      const { data } = await listContractMeasurements(id!);
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  // CT6 — Line items (BOQ) for PDF.
  const { data: lineItems } = useQuery({
    queryKey: ['contract-line-items', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contract_line_items')
        .select('id, name_ar, name_en, pricing_method, unit_of_measure, boq_group_key, quantity, unit_price, total_cost, formula_inputs, sort_order')
        .eq('contract_id', id!)
        .order('sort_order');
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  // CT6 — Frozen template snapshot for PDF clauses + precedence.
  const { data: templateSnapshot } = useQuery({
    queryKey: ['contract-template-snapshot', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contract_template_snapshots')
        .select('frozen_payload')
        .eq('contract_id', id!)
        .maybeSingle();
      return (data?.frozen_payload ?? null) as null | {
        sections?: unknown;
        attachments?: unknown;
      };
    },
    enabled: !!id && !!user,
  });

  const { data: amendments } = useQuery({
    queryKey: ['contract-amendments', id],
    queryFn: async () => {
      const { data } = await supabase.from('contract_amendments').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  /* CT4 — Fetch template metadata for display (only if contract has a template). */
  const contractAny = contract as unknown as {
    template_version_id?: string | null;
    pricing_method?: string | null;
    service_category_id?: string | null;
  } | null | undefined;
  const templateVersionId = contractAny?.template_version_id ?? null;
  const { data: templateMeta } = useQuery({
    queryKey: ['contract-template-meta', templateVersionId],
    queryFn: async () => {
      const { data } = await supabase
        // CT7B: non-admin reads must NOT touch base table — use the safe public view.
        .from('contract_template_versions_public')
        .select('id, version_number, language_precedence, contract_templates!inner(name_ar, name_en, category, slug)')
        .eq('id', templateVersionId!)
        .maybeSingle();
      return data;
    },
    enabled: !!templateVersionId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      // C6.4a — go through SECURITY DEFINER RPC instead of direct table update.
      const updated = await acceptContract(id!);
      const update = (updated ?? {}) as { status?: string };

      // When both parties have accepted → contract becomes active = signed.
      // Send a bilingual signature confirmation to both client and provider.
      if (update.status === 'active' && contract) {
        const clientEmail = (clientProfile as any)?.email;
        const providerEmail = (providerProfile as any)?.email;
        const clientName = (clientProfile as any)?.full_name;
        const providerName = (providerProfile as any)?.full_name;
        const businessName = (business as any)?.name_ar || (business as any)?.name_en || providerName;
        const refId = (contract as any).ref_id || (contract as any).id;
        const title = (contract as any).title_ar || (contract as any).title || (contract as any).title_en;
        const total = (contract as any).total_amount;
        const currency = (contract as any).currency || 'SAR';
        const url = `${window.location.origin}/contracts/${id}`;

        const sendTo = (to?: string, name?: string, counterparty?: string) => {
          if (!to) return;
          void sendTransactionalEmail({
            templateName: 'contract-signed',
            recipientEmail: to,
            idempotencyKey: `contract-signed-${id}-${to}`,
            templateData: {
              recipientName: name,
              contractRefId: refId,
              contractTitle: title,
              counterpartyName: counterparty,
              totalAmount: total ? Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 }) : undefined,
              currency,
              contractUrl: url,
            },
          }).catch(() => { /* queue retries */ });
        };
        sendTo(clientEmail, clientName, businessName);
        sendTo(providerEmail, providerName, clientName);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      toast({ title: isRTL ? 'تم قبول العقد بنجاح' : 'Contract accepted successfully' });
    },
    onError: (err: unknown) => toast({ title: mapContractLockError(err, isRTL).message, variant: 'destructive' }),
  });

  const submitMaintenance = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('maintenance_requests').insert({
        contract_id: id!,
        client_id: user!.id,
        provider_id: contract!.provider_id,
        title_ar: maintTitle,
        description_ar: maintDesc,
        priority: maintPriority as 'low' | 'medium' | 'high' | 'urgent',
        warranty_id: maintWarrantyId || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setShowMaintForm(false);
      setMaintTitle('');
      setMaintDesc('');
      setMaintWarrantyId('');
      toast({ title: isRTL ? 'تم إرسال طلب الصيانة بنجاح' : 'Maintenance request submitted' });
    },
  });

  const submitNote = useMutation({
    mutationFn: async () => {
      const { error } = await createContractNote({
        contract_id: id!,
        user_id: user!.id,
        content: noteContent,
        note_type: noteType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-notes', id] });
      setShowNoteForm(false);
      setNoteContent('');
      toast({ title: isRTL ? 'تم إضافة الملاحظة' : 'Note added' });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      await deleteContractNote(noteId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-notes', id] }),
  });

  /* ─── Measurement CRUD ─── */
  const resetMForm = () => { setMForm({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '', notes: '' }); setEditingMeasurement(null); setShowMeasurementForm(false); };

  type MeasurementPayload = {
    contract_id: string;
    name_ar: string;
    piece_number: string;
    floor_label: string;
    location_ar: string;
    length_mm: number;
    width_mm: number;
    quantity: number;
    unit_price: number;
    area_sqm: number;
    total_cost: number;
    notes: string | null;
    sort_order: number;
  };

  const lockedMsg = () => isRTL
    ? 'لا يمكن تعديل المقاسات بعد قفل العقد.'
    : 'Measurements cannot be modified after the contract is locked.';

  const safeNum = (v: string | number): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const validateMeasurementNumbers = (m: { length_mm: number; width_mm: number; quantity: number; unit_price: number; }): string | null => {
    const fields: Array<[string, number, boolean]> = [
      // [label, value, allowZero]
      [isRTL ? 'الطول' : 'Length', m.length_mm, false],
      [isRTL ? 'العرض' : 'Width', m.width_mm, false],
      [isRTL ? 'الكمية' : 'Quantity', m.quantity, false],
      [isRTL ? 'سعر الوحدة' : 'Unit price', m.unit_price, true],
    ];
    for (const [label, value, allowZero] of fields) {
      if (!Number.isFinite(value)) return `${label}: ${isRTL ? 'قيمة غير صالحة' : 'invalid value'}`;
      if (value < 0) return `${label}: ${isRTL ? 'لا يمكن أن تكون سالبة' : 'cannot be negative'}`;
      if (!allowZero && value <= 0) return `${label}: ${isRTL ? 'يجب أن تكون أكبر من صفر' : 'must be greater than 0'}`;
    }
    return null;
  };

  const recalcContractTotal = async (): Promise<void> => {
    if (!id) return;
    // C6.4a — recompute via SECURITY DEFINER RPC (sums measurements + line items).
    await recalcContractTotalService(id);
    await queryClient.invalidateQueries({ queryKey: ['contract', id] });
  };

  const addMeasurementMutation = useMutation({
    mutationFn: async () => {
      if (isContractLocked) throw new Error(lockedMsg());
      const length_mm = safeNum(mForm.length_mm);
      const width_mm = safeNum(mForm.width_mm);
      const quantity = safeNum(mForm.quantity);
      const unit_price = safeNum(mForm.unit_price);
      const vErr = validateMeasurementNumbers({ length_mm, width_mm, quantity, unit_price });
      if (vErr) throw new Error(vErr);
      const area = (length_mm * width_mm) / 1_000_000;
      const totalCost = unit_price * quantity;
      const payload: MeasurementPayload = {
        contract_id: id!, name_ar: mForm.name_ar, piece_number: mForm.piece_number,
        floor_label: mForm.floor_label, location_ar: mForm.location_ar,
        length_mm, width_mm, quantity, unit_price,
        area_sqm: area, total_cost: totalCost, notes: mForm.notes || null,
        sort_order: (measurements?.length || 0) + 1,
      };
      if (editingMeasurement) {
        const { error } = await updateContractMeasurement(editingMeasurement.id, payload);
        if (error) throw error;
      } else {
        const { error } = await createContractMeasurement(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contract-measurements', id] });
      resetMForm();
      toast({ title: isRTL ? (editingMeasurement ? 'تم تحديث المقاس' : 'تم إضافة المقاس') : (editingMeasurement ? 'Measurement updated' : 'Measurement added') });
      await recalcContractTotal();
    },
    onError: (err: unknown) => toast({ title: mapContractLockError(err, isRTL).message, variant: 'destructive' }),
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      if (isContractLocked) throw new Error(lockedMsg());
      const { error } = await deleteContractMeasurement(measurementId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contract-measurements', id] });
      toast({ title: isRTL ? 'تم حذف المقاس' : 'Measurement deleted' });
      await recalcContractTotal();
    },
    onError: (err: unknown) => toast({ title: mapContractLockError(err, isRTL).message, variant: 'destructive' }),
  });

  const startEditMeasurement = (m: {
    name_ar?: string | null; piece_number?: string | null; floor_label?: string | null;
    location_ar?: string | null; length_mm?: number | string | null; width_mm?: number | string | null;
    quantity?: number | string | null; unit_price?: number | string | null; notes?: string | null;
  } & { id: string }) => {
    if (isContractLocked) {
      toast({ title: lockedMsg(), variant: 'destructive' });
      return;
    }
    setMForm({
      name_ar: m.name_ar || '', piece_number: m.piece_number || '', floor_label: m.floor_label || 'ground_floor',
      location_ar: m.location_ar || '', length_mm: String(m.length_mm || ''), width_mm: String(m.width_mm || ''),
      quantity: String(m.quantity || 1), unit_price: String(m.unit_price || ''), notes: m.notes || '',
    });
    setEditingMeasurement(m as typeof editingMeasurement);
    setShowMeasurementForm(true);
  };

  /* ─── Milestone Add ─── */
  const addMilestoneMutation = useMutation({
    mutationFn: async () => {
      const { error } = await createContractMilestone({
        contract_id: id!, title_ar: msForm.title_ar,
        amount: Number(msForm.amount), due_date: msForm.due_date || null,
        description_ar: msForm.description_ar || null,
        sort_order: (milestones?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      setShowMilestoneForm(false);
      setMsForm({ title_ar: '', amount: '', due_date: '', description_ar: '' });
      toast({ title: isRTL ? 'تم إضافة المرحلة' : 'Milestone added' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  /* ─── Amendment ─── */
  const addAmendmentMutation = useMutation({
    mutationFn: async () => {
      // Client-side validation
      if (!amForm.title_ar.trim()) throw new Error(isRTL ? 'العنوان بالعربية مطلوب' : 'Arabic title required');
      if (!amForm.description_ar.trim()) throw new Error(isRTL ? 'الوصف مطلوب' : 'Description required');
      if (!amForm.reason.trim()) throw new Error(isRTL ? 'سبب التعديل مطلوب' : 'Reason required');
      let newAmount: number | null = null;
      if (amForm.amendment_type === 'amount_change') {
        const n = Number(amForm.new_amount);
        if (!isFinite(n) || n <= 0) throw new Error(isRTL ? 'المبلغ الجديد يجب أن يكون رقماً موجباً' : 'New amount must be a positive number');
        newAmount = n;
      }
      let newEndDate: string | null = null;
      if (amForm.amendment_type === 'date_change') {
        if (!amForm.new_end_date) throw new Error(isRTL ? 'تاريخ الانتهاء الجديد مطلوب' : 'New end date required');
        newEndDate = amForm.new_end_date;
      }
      const oldTotal = contract?.total_amount != null ? Number(contract.total_amount) : null;
      const { data: inserted, error } = await supabase.from('contract_amendments').insert({
        contract_id: id!,
        requested_by: user!.id,
        amendment_type: amForm.amendment_type,
        title_ar: amForm.title_ar.trim(),
        title_en: amForm.title_en.trim() || null,
        description_ar: amForm.description_ar.trim(),
        description_en: amForm.description_en.trim() || null,
        reason: amForm.reason.trim(),
        new_amount: newAmount,
        new_end_date: newEndDate,
        old_total: oldTotal,
        amount_delta: newAmount != null && oldTotal != null ? newAmount - oldTotal : null,
        status: 'pending',
      }).select('id').single();
      if (error) throw error;
      return inserted?.id as string | undefined;
    },
    onSuccess: (newAmendmentId) => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      setShowAmendmentForm(false);
      setAmForm({ title_ar: '', title_en: '', description_ar: '', description_en: '', reason: '', amendment_type: 'scope_change', new_amount: '', new_end_date: '' });
      toast({ title: isRTL ? 'تم إرسال طلب الملحق' : 'Amendment request sent' });
      if (newAmendmentId) dispatchAmendmentEvent(newAmendmentId, 'created');
    },
    onError: (err: unknown) => toast({ title: err instanceof Error ? err.message : 'Error', variant: 'destructive' }),
  });

  const approveAmendmentMutation = useMutation({
    mutationFn: async (amendment: { id: string }) => {
      return await approveAmendment(amendment.id);
    },
    onSuccess: (amId) => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['amendment-audit'] });
      toast({ title: isRTL ? 'تمت الموافقة على الملحق' : 'Amendment approved' });
      if (amId) dispatchAmendmentEvent(amId, 'approved');
    },
    onError: (err: unknown) => toast({ title: mapAmendmentError(err, isRTL), variant: 'destructive' }),
  });

  const rejectAmendmentMutation = useMutation({
    mutationFn: async ({ id: amId, reason }: { id: string; reason: string }) => {
      return await rejectAmendment(amId, reason);
    },
    onSuccess: (amId) => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      queryClient.invalidateQueries({ queryKey: ['amendment-audit'] });
      toast({ title: isRTL ? 'تم رفض طلب التعديل' : 'Amendment rejected' });
      if (amId) dispatchAmendmentEvent(amId, 'rejected');
    },
    onError: (err: unknown) => toast({ title: mapAmendmentError(err, isRTL), variant: 'destructive' }),
  });

  const cancelAmendmentMutation = useMutation({
    mutationFn: async (amId: string) => {
      return await cancelAmendment(amId);
    },
    onSuccess: (amId) => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      queryClient.invalidateQueries({ queryKey: ['amendment-audit'] });
      toast({ title: isRTL ? 'تم إلغاء طلب التعديل' : 'Amendment cancelled' });
      if (amId) dispatchAmendmentEvent(amId, 'cancelled');
    },
    onError: (err: unknown) => toast({ title: mapAmendmentError(err, isRTL), variant: 'destructive' }),
  });

  const applyAmendmentMutation = useMutation({
    mutationFn: async (args: { amId: string; scheduleAdjustedHint?: boolean }) => {
      await applyAmendment(args.amId);
      return args;
    },
    onSuccess: (args) => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['amendment-audit'] });
      queryClient.invalidateQueries({ queryKey: ['installment-payments'] });
      queryClient.invalidateQueries({ queryKey: ['installment-plans', id] });
      queryClient.invalidateQueries({ queryKey: ['contract-coverage', id] });
      toast({
        title: isRTL ? 'تم تطبيق التعديل وتحديث العقد بنجاح.' : 'Amendment applied and contract updated successfully.',
        description: args?.scheduleAdjustedHint
          ? (isRTL ? 'تم تحديث الدفعات المعلقة وفق القيمة الجديدة.' : 'Pending payments were updated to reflect the new amount.')
          : undefined,
      });
      if (args?.amId) dispatchAmendmentEvent(args.amId, 'applied');
    },
    onError: (err: unknown) => toast({ title: mapAmendmentError(err, isRTL), variant: 'destructive' }),
  });

  /* ─── Derived ─── */
  const title = contract ? (language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar)) : '';
  const desc = contract ? (language === 'ar' ? contract.description_ar : (contract.description_en || contract.description_ar)) : '';
  const terms = contract ? (language === 'ar' ? contract.terms_ar : (contract.terms_en || contract.terms_ar)) : '';
  const cfg = statusConfig[contract?.status ?? 'draft'] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const isClient = user?.id === contract?.client_id;
  const isProvider = user?.id === contract?.provider_id;
  const isContractLocked = contract ? isContractLockedByStatus(contract.status) : false;
  const canAccept = contract && ((isClient && !contract.client_accepted_at) || (isProvider && !contract.provider_accepted_at));
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;
  const milestonePaid = milestones?.filter(m => m.status === 'completed').reduce((s, m) => s + Number(m.amount), 0) || 0;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const totalAmount = Number(contract?.total_amount || 0);
  const _contractVat = calculateVatBreakdown({ amount: totalAmount, vatRate: contract?.vat_rate, vatInclusive: contract?.vat_inclusive });
  const vatRate = _contractVat.vatRate;
  const vatInclusive = _contractVat.vatInclusive;
  const vatAmount = _contractVat.vatAmount;
  const subtotalBeforeVat = _contractVat.subtotal;
  const grandTotalWithVat = _contractVat.total;
  const bizName = business ? (language === 'ar' ? business.name_ar : (business.name_en || business.name_ar)) : '';

  const copyContractNumber = () => {
    if (contract?.contract_number) {
      navigator.clipboard.writeText(contract.contract_number);
      toast({ title: isRTL ? 'تم نسخ رقم العقد' : 'Contract number copied' });
    }
  };

  const getProfileName = (p: any) => p?.full_name || '-';
  const getCountryName = (p: any) => p?.countries ? (language === 'ar' ? p.countries.name_ar : p.countries.name_en) : null;
  const getCityName = (p: any) => p?.cities ? (language === 'ar' ? p.cities.name_ar : p.cities.name_en) : null;

  const getWarrantyDuration = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const rem = months % 12;
      return isRTL
        ? `${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتان' : 'سنوات'}${rem > 0 ? ` و ${rem} أشهر` : ''}`
        : `${years} year${years > 1 ? 's' : ''}${rem > 0 ? ` ${rem} mo` : ''}`;
    }
    return isRTL ? `${months} أشهر` : `${months} months`;
  };

  const getWarrantyRemaining = (end: string) => {
    const days = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return isRTL ? 'منتهي' : 'Expired';
    if (days > 365) return isRTL ? `${Math.floor(days / 365)} سنة و ${days % 365} يوم` : `${Math.floor(days / 365)}y ${days % 365}d`;
    return isRTL ? `${days} يوم متبقي` : `${days} days left`;
  };

  const getWarrantyProgress = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = Date.now();
    if (now >= e) return 100;
    if (now <= s) return 0;
    return Math.round(((now - s) / (e - s)) * 100);
  };

  // Measurements grouped by floor
  const measurementsByFloor = useMemo(() => {
    if (!measurements) return {};
    const groups: Record<string, typeof measurements> = {};
    measurements.forEach(m => {
      const floor = m.floor_label || (isRTL ? 'غير محدد' : 'Unspecified');
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(m);
    });
    return groups;
  }, [measurements, isRTL]);

  const filteredMeasurements = useMemo(() => {
    if (!measurements) return [];
    if (measurementFilter === 'all') return measurements;
    return measurements.filter(m => m.floor_label === measurementFilter);
  }, [measurements, measurementFilter]);

  const measurementsTotals = useMemo(() => {
    const list = filteredMeasurements;
    if (list.length === 0) return { totalArea: 0, totalCost: 0, count: 0, installed: 0 };
    return {
      totalArea: Math.round(list.reduce((s, m) => s + Number(m.area_sqm || 0), 0) * 1000) / 1000,
      totalCost: Math.round(list.reduce((s, m) => s + Number(m.total_cost || 0), 0) * 100) / 100,
      count: list.length,
      installed: list.filter(m => m.status === 'installed' || m.status === 'completed').length,
    };
  }, [filteredMeasurements]);

  // VAT breakdown for the measurements subtotal — single source via helper.
  // Note: measurements are currently the practical source of contract value
  // when contract_line_items is empty. DB `total_amount` may differ until
  // C3/C5 introduce auto-recalc triggers.
  const measurementsVat = useMemo(
    () => calculateVatBreakdown({
      amount: measurementsTotals.totalCost,
      vatRate: contract?.vat_rate,
      vatInclusive: contract?.vat_inclusive,
    }),
    [measurementsTotals.totalCost, contract?.vat_rate, contract?.vat_inclusive],
  );

  const floors = useMemo(() => Object.keys(measurementsByFloor), [measurementsByFloor]);

  // Group attachments by measurement_id once to avoid N+1 queries.
  const attachmentsByMeasurement = useMemo(() => {
    const map = new Map<string, AttachmentRow[]>();
    for (const a of (attachments || []) as AttachmentRow[]) {
      if (a.measurement_id) {
        const arr = map.get(a.measurement_id) || [];
        arr.push(a);
        map.set(a.measurement_id, arr);
      }
    }
    return map;
  }, [attachments]);

  // Group attachments by payment_id once to avoid N+1 queries.
  const attachmentsByPayment = useMemo(() => {
    const map = new Map<string, AttachmentRow[]>();
    for (const a of (attachments || []) as AttachmentRow[]) {
      if (a.payment_id) {
        const arr = map.get(a.payment_id) || [];
        arr.push(a);
        map.set(a.payment_id, arr);
      }
    }
    return map;
  }, [attachments]);

  // Installment payment totals
  const paymentsTotals = useMemo(() => {
    if (!installmentPayments) return { paid: 0, total: 0, paidCount: 0, totalCount: 0 };
    return {
      paid: installmentPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
      total: installmentPayments.reduce((s, p) => s + Number(p.amount), 0),
      paidCount: installmentPayments.filter(p => p.status === 'paid').length,
      totalCount: installmentPayments.length,
    };
  }, [installmentPayments]);

  // PDF-UX1: extracted payload builder — reused by both Download and Preview
  // so the two flows render the exact same document with no duplication.
  const buildPdfPayload = () => {
    if (!contract) return null;
    return {
      contractNumber: contract.contract_number,
      title,
      description: desc || undefined,
      totalAmount,
      currency: contract.currency_code,
      startDate: contract.start_date || undefined,
      endDate: contract.end_date || undefined,
      clientName: getProfileName(clientProfile),
      providerName: bizName || getProfileName(providerProfile),
      supervisorName: contract.supervisor_name || undefined,
      supervisorPhone: contract.supervisor_phone || undefined,
      supervisorEmail: contract.supervisor_email || undefined,
      terms: terms || undefined,
      vatRate,
      vatInclusive,
      businessName: bizName || undefined,
      documentHash: contract.document_hash || undefined,
      contractBarcodeCode: contractBarcodeCode || null,
      projectBarcodeCode: projectBarcodeCode || null,
      siteRefFallback: (() => {
        const raw = (contract as unknown as { execution_address_snapshot?: { label?: string | null } | null }).execution_address_snapshot;
        return raw?.label || null;
      })(),
      executionAddressSnapshot: (() => {
        const raw = (contract as unknown as { execution_address_snapshot?: Record<string, unknown> | null }).execution_address_snapshot;
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
      template: templateMeta ? {
        nameAr: (templateMeta as any).contract_templates?.name_ar ?? null,
        nameEn: (templateMeta as any).contract_templates?.name_en ?? null,
        versionNumber: (templateMeta as any).version_number ?? null,
        category: (templateMeta as any).contract_templates?.category ?? null,
        pricingMethod: contractAny?.pricing_method ?? null,
        languagePrecedence: (templateMeta as any).language_precedence ?? null,
      } : null,
      templateSnapshot: templateSnapshot
        ? {
            sections: ((templateSnapshot as any).sections ?? []) as any,
            attachments: ((templateSnapshot as any).attachments ?? []) as any,
          }
        : null,
      lineItems: (lineItems || []).map((li: any) => ({
        nameAr: li.name_ar ?? null,
        nameEn: li.name_en ?? null,
        pricingMethod: li.pricing_method ?? null,
        unitOfMeasure: li.unit_of_measure ?? null,
        boqGroupKey: li.boq_group_key ?? null,
        quantity: Number(li.quantity || 0),
        unitPrice: Number(li.unit_price || 0),
        totalCost: Number(li.total_cost || 0),
        formulaInputs: li.formula_inputs ?? null,
      })),
      milestones: (milestones || []).map(m => ({
        id: m.id,
        title: language === 'ar' ? m.title_ar : (m.title_en || m.title_ar),
        amount: Number(m.amount),
        dueDate: m.due_date || undefined,
        status: m.status,
      })),
      payments: (installmentPayments || []).map(p => {
        const linkedMs = p.milestone_id ? (milestones || []).find(m => m.id === p.milestone_id) : null;
        return {
          installmentNumber: p.installment_number,
          amount: Number(p.amount),
          dueDate: p.due_date || undefined,
          status: p.status,
          milestoneTitle: linkedMs ? (language === 'ar' ? linkedMs.title_ar : (linkedMs.title_en || linkedMs.title_ar)) : undefined,
          paidAt: p.paid_at ? new Date(p.paid_at).toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US') : undefined,
        };
      }),
      measurements: (measurements || []).map(m => ({
        pieceNumber: m.piece_number, name: language === 'ar' ? m.name_ar : (m.name_en || m.name_ar),
        location: (language === 'ar' ? m.location_ar : (m.location_en || m.location_ar)) || '',
        floor: m.floor_label || '', lengthMm: Number(m.length_mm), widthMm: Number(m.width_mm),
        areaSqm: Number(m.area_sqm), unitPrice: Number(m.unit_price), quantity: Number(m.quantity),
        totalCost: Number(m.total_cost), status: m.status,
      })),
      attachments: (attachments || []).map(a => {
        // Resolve "linked to" label without exposing IDs/URLs.
        let linkedTo = isRTL ? 'العقد' : 'Contract';
        if (a.measurement_id) {
          const m = (measurements || []).find(x => x.id === a.measurement_id);
          const label = m
            ? `${m.piece_number ? `#${m.piece_number} ` : ''}${(language === 'ar' ? m.name_ar : (m.name_en || m.name_ar)) || ''}`.trim()
            : '';
          linkedTo = `${isRTL ? 'مقاس: ' : 'Measurement: '}${label || '—'}`;
        } else if (a.payment_id) {
          const p = (installmentPayments || []).find(x => x.id === a.payment_id);
          const label = p ? `#${p.installment_number}` : '—';
          linkedTo = `${isRTL ? 'دفعة: ' : 'Payment: '}${label}`;
        } else if (a.milestone_id) {
          const m = (milestones || []).find(x => x.id === a.milestone_id);
          const label = m ? ((language === 'ar' ? m.title_ar : (m.title_en || m.title_ar)) || '') : '';
          linkedTo = `${isRTL ? 'مرحلة: ' : 'Milestone: '}${label || '—'}`;
        } else if (a.amendment_id) {
          const am = (amendments || []).find(x => x.id === a.amendment_id);
          const label = am ? ((language === 'ar' ? am.title_ar : (am.title_en || am.title_ar)) || '') : '';
          linkedTo = `${isRTL ? 'ملحق: ' : 'Amendment: '}${label || '—'}`;
        }
        return {
          fileName: a.file_name,
          fileType: a.file_type,
          fileSize: a.file_size ?? null,
          linkedTo,
          description: a.description ?? null,
          uploadedAt: a.created_at ?? null,
        };
      }),
      amendments: (amendments || []).slice().reverse().map((a, idx) => {
        const oldTotal = a.applied_at && a.amount_delta != null && a.new_amount != null
          ? Number(a.new_amount) - Number(a.amount_delta)
          : null;
        return {
          number: idx + 1,
          createdAt: a.created_at,
          type: a.amendment_type,
          status: a.status,
          title: language === 'ar' ? a.title_ar : (a.title_en || a.title_ar),
          reason: a.reason ?? null,
          oldTotal,
          newAmount: a.new_amount != null ? Number(a.new_amount) : null,
          amountDelta: a.amount_delta != null ? Number(a.amount_delta) : null,
          newEndDate: a.new_end_date ?? null,
          clientApprovedAt: a.client_approved_at ?? null,
          providerApprovedAt: a.provider_approved_at ?? null,
          appliedAt: a.applied_at ?? null,
        };
      }),
      isRTL,
    };
  };

  const handleExportPDF = async () => {
    if (!contract || isExportingPDF) return;
    const data = buildPdfPayload();
    if (!data) return;
    setIsExportingPDF(true);
    try {
      const { exportContractPDF } = await import('@/lib/contract-pdf-export');
      await exportContractPDF(data);
      const { getArabicFontDiagnostics } = await import('@/lib/pdf-arabic-font');
      setPdfDiagnostics(getArabicFontDiagnostics());
      // Fire-and-forget export history log (PDF-QA2). Server validates auth.
      void recordContractPdfExport(contract.id, 'contract_detail', language)
        .then(() => queryClient.invalidateQueries({ queryKey: ['contract-pdf-exports', contract.id] }));
    } catch (err: unknown) {
      const isArabicFontError = err instanceof Error && err.name === 'ArabicPdfFontError';
      toast({
        title: isRTL ? 'فشل التصدير' : 'Export failed',
        description: isArabicFontError
          ? (isRTL ? 'تعذر تضمين الخط العربي. قد لا يعمل البحث أو النسخ داخل ملف PDF بشكل صحيح.' : 'Arabic font could not be embedded. Copy/search may not work correctly.')
          : (isRTL ? 'تعذر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.' : 'Could not generate the PDF. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // PDF-UX1: client-side preview via Blob URL. Object URL is revoked on
  // close/refresh/unmount. Preview is intentionally NOT logged in the
  // export history — only confirmed downloads are.
  const generatePreview = async () => {
    const data = buildPdfPayload();
    if (!data || previewLoading) return;
    setPreviewError(null);
    setPreviewLoading(true);
    // Revoke any previous URL before regenerating.
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* noop */ }
    }
    try {
      const { previewContractPDF } = await import('@/lib/contract-pdf-export');
      const { url, fileName } = await previewContractPDF(data);
      const { getArabicFontDiagnostics } = await import('@/lib/pdf-arabic-font');
      setPreviewUrl(url);
      setPreviewFileName(fileName);
      setPdfDiagnostics(getArabicFontDiagnostics());
    } catch (err: unknown) {
      const isArabicFontError = err instanceof Error && err.name === 'ArabicPdfFontError';
      setPreviewUrl(null);
      setPreviewError(isArabicFontError
        ? (isRTL ? 'تعذر تضمين الخط العربي. قد لا يعمل البحث أو النسخ داخل ملف PDF بشكل صحيح.' : 'Arabic font could not be embedded. Copy/search may not work correctly.')
        : (isRTL ? 'تعذر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.' : 'Could not generate the PDF. Please try again.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!contract) return;
    setPreviewOpen(true);
    if (!previewUrl) await generatePreview();
  };

  const handleArabicFontTestPDF = async () => {
    try {
      const [{ exportArabicFontTestPDF }, { getArabicFontDiagnostics }] = await Promise.all([
        import('@/lib/contract-pdf-export'),
        import('@/lib/pdf-arabic-font'),
      ]);
      await exportArabicFontTestPDF();
      setPdfDiagnostics(getArabicFontDiagnostics());
      toast({ title: isRTL ? 'تم إنشاء اختبار الخط العربي' : 'Arabic font test generated' });
    } catch {
      toast({
        title: isRTL ? 'تعذر إنشاء اختبار الخط' : 'Font test failed',
        description: isRTL ? 'تعذر تضمين الخط العربي. قد لا يعمل البحث أو النسخ داخل ملف PDF بشكل صحيح.' : 'Arabic font could not be embedded. Copy/search may not work correctly.',
        variant: 'destructive',
      });
    }
  };

  // PDF-AR3: Single-button "Export + Analyze" flow.
  // 1) Builds the contract PDF (same export pipeline as the user-facing
  //    Download button) and triggers a local download.
  // 2) Uploads the bytes to the `verify-pdf-arabic` edge function which
  //    runs a server-side mojibake scan and returns a pdftotext-style
  //    report.
  // 3) Displays the backend report inline in the diagnostics panel.
  const handleExportAndAnalyzePDF = async () => {
    if (!contract || isAnalyzingPdf) return;
    const data = buildPdfPayload();
    if (!data) return;
    setIsAnalyzingPdf(true);
    setPdfBackendReport(null);
    try {
      const [{ buildContractPdfForAnalysis }, fontMod] = await Promise.all([
        import('@/lib/contract-pdf-export'),
        import('@/lib/pdf-arabic-font'),
      ]);
      const {
        getArabicFontDiagnostics,
        setBackendVerification,
        computePdfSignature,
        getCachedAnalysis,
        setCachedAnalysis,
      } = fontMod;
      const { bytes, blob, fileName } = await buildContractPdfForAnalysis(data);

      // PDF-AR4: trigger the local download in parallel with the
      // verification round-trip so the user gets the file immediately.
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl; a.download = fileName; document.body.appendChild(a); a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(dlUrl); } catch { /* noop */ } }, 1000);

      // PDF-AR4: cache identical exports per build version. Repeated clicks
      // on the same artifact reuse the prior PASS without a network call.
      const signature = computePdfSignature(bytes);
      const cached = getCachedAnalysis(signature);

      let backendStatus: 'PASS' | 'FAIL';
      let backendReport: string;
      let mojibakeDetected = false;
      let mojibakeCount = 0;
      let sample = '';
      let verifiedAt = new Date().toISOString();
      let source: 'backend' | 'cache' = 'backend';

      if (cached) {
        backendStatus = cached.status;
        backendReport = cached.report ?? `status: ${cached.status}\ncached: true\nsignature: ${signature}`;
        mojibakeDetected = cached.mojibakeDetected;
        mojibakeCount = cached.mojibakeCount;
        sample = cached.sample;
        verifiedAt = cached.verifiedAt;
        source = 'cache';
      } else {
        // Encode bytes → base64 in chunks (avoid call-stack overflow).
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
        }
        const pdfBase64 = btoa(binary);
        const { data, error } = await verifyPdfArabic({ pdfBase64, fileName });
        if (error) throw error;
        const backend = data as {
          status?: string;
          mojibakeDetected?: boolean;
          mojibakeCount?: number;
          sample?: string;
          verifiedAt?: string;
          report?: string;
        } | null;
        backendStatus = backend?.status === 'PASS' ? 'PASS' : 'FAIL';
        mojibakeDetected = !!backend?.mojibakeDetected;
        mojibakeCount = Number(backend?.mojibakeCount ?? 0);
        sample = String(backend?.sample ?? '');
        verifiedAt = String(backend?.verifiedAt ?? verifiedAt);
        backendReport = typeof backend?.report === 'string' ? backend.report : JSON.stringify(backend, null, 2);
        setCachedAnalysis(signature, {
          status: backendStatus, mojibakeDetected, mojibakeCount, sample, verifiedAt, source: 'backend', report: backendReport,
        });
      }

      setBackendVerification({
        status: backendStatus, mojibakeDetected, mojibakeCount, sample, verifiedAt,
        source: source === 'cache' ? 'client' : 'backend',
        report: backendReport,
      });
      setPdfBackendReport(backendReport);
      setPdfDiagnostics(getArabicFontDiagnostics());

      // Persist run for the per-contract analysis log tab. Failures here
      // are non-fatal (e.g. anonymous QA on staging) — we still surface
      // the result inline.
      try {
        if (user?.id) {
          await supabase.from('contract_pdf_analysis_log').insert({
            contract_id: contract.id,
            status: backendStatus,
            mojibake_detected: mojibakeDetected,
            mojibake_count: mojibakeCount,
            byte_length: bytes.length,
            file_name: fileName,
            build_version: getArabicFontDiagnostics().buildVersion,
            source,
            sample: sample.slice(0, 240),
            report: backendReport.slice(0, 8000),
            created_by: user.id,
          });
          queryClient.invalidateQueries({ queryKey: ['contract_pdf_analysis_log', contract.id] });
        }
      } catch {
        /* non-fatal */
      }

      toast({
        title: backendStatus === 'PASS'
          ? (isRTL ? 'تحليل الـ PDF: ناجح' : 'PDF analysis: PASS')
          : (isRTL ? 'تحليل الـ PDF: فشل' : 'PDF analysis: FAIL'),
        description: backendStatus === 'PASS'
          ? (isRTL
              ? `لم يُكتشف نص مشوّش${source === 'cache' ? ' (نتيجة مخزنة لهذا الإصدار)' : ''}.`
              : `No mojibake detected${source === 'cache' ? ' (cached result for this build)' : ''}.`)
          : (isRTL ? 'تم اكتشاف نص مشوّش (mojibake) في طبقة النص.' : 'Mojibake detected in the text layer.'),
        variant: backendStatus === 'PASS' ? 'default' : 'destructive',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setPdfBackendReport(`status: FAIL\nerror: ${message}`);
      toast({
        title: isRTL ? 'تعذّر تحليل الـ PDF' : 'PDF analysis failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzingPdf(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* noop */ }
      setPreviewUrl(null);
    }
    setPreviewError(null);
  };

  // Revoke any lingering Object URL on unmount.
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch { /* noop */ }
      }
    };
    // We intentionally only revoke the URL captured at unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportMeasurementsPDF = async () => {
    if (!contract || !measurements || measurements.length === 0) return;
    const { exportMeasurementsPDF } = await import('@/lib/contract-pdf-export');
    exportMeasurementsPDF({
      contractNumber: contract.contract_number, businessName: bizName, currency: contract.currency_code,
      vatRate, vatInclusive,
      measurements: measurements.map(m => ({
        pieceNumber: m.piece_number, name: language === 'ar' ? m.name_ar : (m.name_en || m.name_ar),
        location: (language === 'ar' ? m.location_ar : (m.location_en || m.location_ar)) || '',
        floor: m.floor_label || '', lengthMm: Number(m.length_mm), widthMm: Number(m.width_mm),
        areaSqm: Number(m.area_sqm), unitPrice: Number(m.unit_price), quantity: Number(m.quantity),
        totalCost: Number(m.total_cost), status: m.status,
      })),
      isRTL,
    });
  };

  const handleExportMeasurementsExcel = async () => {
    if (!contract || !measurements || measurements.length === 0) return;
    const { exportMeasurementsExcel } = await import('@/lib/contract-pdf-export');
    exportMeasurementsExcel({
      contractNumber: contract.contract_number, currency: contract.currency_code,
      vatRate, vatInclusive,
      measurements: measurements.map(m => ({
        pieceNumber: m.piece_number, name: language === 'ar' ? m.name_ar : (m.name_en || m.name_ar),
        location: (language === 'ar' ? m.location_ar : (m.location_en || m.location_ar)) || '',
        floor: m.floor_label || '', lengthMm: Number(m.length_mm), widthMm: Number(m.width_mm),
        areaSqm: Number(m.area_sqm), unitPrice: Number(m.unit_price), quantity: Number(m.quantity),
        totalCost: Number(m.total_cost), status: m.status,
      })),
      isRTL,
    });
  };

  const handlePrintMeasurements = async () => {
    if (!contract || !measurements || measurements.length === 0) return;
    const { printMeasurements } = await import('@/lib/contract-pdf-export');
    printMeasurements({
      contractNumber: contract.contract_number, businessName: bizName, currency: contract.currency_code,
      vatRate, vatInclusive,
      measurements: measurements.map(m => ({
        pieceNumber: m.piece_number, name: language === 'ar' ? m.name_ar : (m.name_en || m.name_ar),
        location: (language === 'ar' ? m.location_ar : (m.location_en || m.location_ar)) || '',
        floor: m.floor_label || '', lengthMm: Number(m.length_mm), widthMm: Number(m.width_mm),
        areaSqm: Number(m.area_sqm), unitPrice: Number(m.unit_price), quantity: Number(m.quantity),
        totalCost: Number(m.total_cost), status: m.status,
      })),
      isRTL,
    });
  };

  const handleImportMeasurements = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const { parseMeasurementsFromCSV } = await import('@/lib/contract-pdf-export');
      const parsed = parseMeasurementsFromCSV(text);
      if (parsed.length === 0) {
        toast({ title: isRTL ? 'لم يتم العثور على بيانات صالحة' : 'No valid data found', variant: 'destructive' });
        return;
      }
      setImportedMeasurements(parsed);
      setShowImportPreview(true);
    };
    reader.readAsText(file);
  };

  const confirmImportMeasurements = async () => {
    if (!id || importedMeasurements.length === 0) return;
    if (isContractLocked) {
      toast({ title: lockedMsg(), variant: 'destructive' });
      return;
    }
    const startOrder = (measurements?.length || 0) + 1;
    const records: MeasurementPayload[] = [];
    for (let i = 0; i < importedMeasurements.length; i++) {
      const m = importedMeasurements[i];
      const length_mm = safeNum(m.length_mm);
      const width_mm = safeNum(m.width_mm);
      const quantity = safeNum(m.quantity);
      const unit_price = safeNum(m.unit_price);
      const vErr = validateMeasurementNumbers({ length_mm, width_mm, quantity, unit_price });
      if (vErr) {
        toast({
          title: `${isRTL ? 'صف' : 'Row'} ${i + 1}: ${vErr}`,
          variant: 'destructive',
        });
        return;
      }
      const area = (length_mm * width_mm) / 1_000_000;
      records.push({
        contract_id: id, name_ar: m.name_ar, piece_number: m.piece_number,
        floor_label: m.floor_label, location_ar: m.location_ar,
        length_mm, width_mm, quantity, unit_price,
        area_sqm: area, total_cost: unit_price * quantity,
        notes: m.notes || null, sort_order: startOrder + i,
      });
    }
    const { error } = await createContractMeasurement(records);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['contract-measurements', id] });
    setShowImportPreview(false);
    setImportedMeasurements([]);
    toast({ title: isRTL ? `تم استيراد ${records.length} مقاس بنجاح` : `${records.length} measurements imported` });
    await recalcContractTotal();
  };

  const updateImportedRow = (idx: number, field: keyof ImportedMeasurement, value: string | number) => {
    setImportedMeasurements(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const removeImportedRow = (idx: number) => {
    setImportedMeasurements(prev => prev.filter((_, i) => i !== idx));
  };

  const shareContract = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: title || 'Contract', url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: isRTL ? 'تم نسخ رابط العقد' : 'Contract link copied' });
    }
  };

  const openMessages = () => navigate('/dashboard/messages');

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 sm:py-28 space-y-4 sm:space-y-6 px-4 sm:px-6 max-w-5xl mx-auto">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-10 sm:h-12 w-3/4 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 sm:h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center space-y-4 px-4">
          <FileText className="w-14 h-14 mx-auto text-muted-foreground/30" />
          <p className="font-body text-muted-foreground">{isRTL ? 'العقد غير موجود' : 'Contract not found'}</p>
          <Link to="/contracts"><Button variant="hero">{isRTL ? 'العودة للعقود' : 'Back to Contracts'}</Button></Link>
        </div>
      </div>
    );
  }

  /* ─── Party Card ─── */
  const PartyCard = ({ profile, partyLabel, partyIcon: PIcon, biz, acceptedAt, isBiz }: {
    profile: any; partyLabel: string; partyIcon: React.ElementType; biz?: any; acceptedAt?: string | null; isBiz?: boolean;
  }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-muted/30 dark:bg-muted/10 px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center"><PIcon className="w-3.5 h-3.5 text-accent" /></div>
          <span className="font-heading font-bold text-xs">{partyLabel}</span>
        </div>
        {acceptedAt && <Badge className="bg-success text-success dark:bg-success/30 dark:text-success text-[9px] gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{isRTL ? 'موافق' : 'Accepted'}</Badge>}
      </div>
      <div className="p-4 space-y-0.5">
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={getProfileName(profile)} className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
           : isBiz && biz?.logo_url ? <img src={biz.logo_url} alt={bizName || ''} className="w-12 h-12 rounded-xl object-cover border-2 border-border shrink-0" />
           : <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0"><PIcon className="w-6 h-6 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-sm truncate">{getProfileName(profile)}</p>
            {isBiz && biz && <Link to={`/${biz.username}`} className="text-[10px] text-accent font-body truncate block hover:underline">{bizName}</Link>}
            {profile?.ref_id && <p className="text-[10px] text-muted-foreground font-body" dir="ltr">#{profile.ref_id}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={openMessages} title={isRTL ? 'إرسال رسالة' : 'Send message'} aria-label={isRTL ? 'إرسال رسالة' : 'Send message'}>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        <Separator className="my-2" />
        <InfoRow icon={Phone} label={isRTL ? 'رقم الجوال' : 'Mobile'} value={profile?.phone} dir="ltr" href={profile?.phone ? `tel:${profile.phone}` : undefined} />
        <InfoRow icon={Mail} label={isRTL ? 'البريد الإلكتروني' : 'Email'} value={profile?.email} dir="ltr" href={profile?.email ? `mailto:${profile.email}` : undefined} />
        {(getCountryName(profile) || getCityName(profile)) && (
          <>
            <Separator className="my-2" />
            <InfoRow icon={Globe} label={isRTL ? 'الدولة' : 'Country'} value={getCountryName(profile)} />
            <InfoRow icon={MapPin} label={isRTL ? 'المدينة' : 'City'} value={getCityName(profile)} />
          </>
        )}
        {isBiz && biz && (
          <>
            <Separator className="my-2" />
            <InfoRow icon={IdCard} label={isRTL ? 'الرقم الموحد' : 'Unified No.'} value={biz.unified_number} dir="ltr" />
            <InfoRow icon={Hash} label={isRTL ? 'السجل التجاري' : 'CR'} value={biz.national_id} dir="ltr" />
            <InfoRow icon={Phone} label={isRTL ? 'هاتف المنشأة' : 'Business Phone'} value={biz.phone} dir="ltr" href={biz.phone ? `tel:${biz.phone}` : undefined} />
            <InfoRow icon={Phone} label={isRTL ? 'خدمة العملاء' : 'Customer Service'} value={biz.customer_service_phone} dir="ltr" href={biz.customer_service_phone ? `tel:${biz.customer_service_phone}` : undefined} />
            <InfoRow icon={User} label={isRTL ? 'مسؤول التواصل' : 'Contact Person'} value={biz.contact_person} />
            <InfoRow icon={Mail} label={isRTL ? 'البريد' : 'Email'} value={biz.email} dir="ltr" href={biz.email ? `mailto:${biz.email}` : undefined} />
            <InfoRow icon={Globe} label={isRTL ? 'الموقع' : 'Website'} value={biz.website} dir="ltr" href={biz.website?.startsWith('http') ? biz.website : biz.website ? `https://${biz.website}` : undefined} />
            <Separator className="my-2" />
            <InfoRow icon={MapPin} label={isRTL ? 'المنطقة' : 'Region'} value={biz.region} />
            <InfoRow icon={MapPin} label={isRTL ? 'الحي' : 'District'} value={biz.district} />
            <InfoRow icon={MapPin} label={isRTL ? 'الشارع' : 'Street'} value={biz.street_name} />
            <InfoRow icon={Building2} label={isRTL ? 'رقم المبنى' : 'Bldg No.'} value={biz.building_number} dir="ltr" />
            {biz.address && <InfoRow icon={MapPin} label={isRTL ? 'العنوان' : 'Address'} value={biz.address} />}
          </>
        )}
        {acceptedAt && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-1.5 text-[10px] text-success dark:text-success font-body">
              <PenTool className="w-3 h-3" />{isRTL ? 'تاريخ التوقيع:' : 'Signed:'} {formatDate(acceptedAt)}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero ─── */}
      <div className="bg-primary pt-20 sm:pt-24 pb-6 sm:pb-8">
        <div className="container px-4 sm:px-6 max-w-5xl mx-auto">
          <nav className="flex items-center gap-1.5 text-primary-foreground/50 text-[11px] sm:text-xs font-body mb-3 sm:mb-4 flex-wrap">
            <Link to="/" className="hover:text-primary-foreground/80 transition-colors flex items-center gap-1"><Home className="w-3 h-3" />{isRTL ? 'الرئيسية' : 'Home'}</Link>
            <span>/</span>
            <Link to="/dashboard/contracts" className="hover:text-primary-foreground/80 transition-colors">{isRTL ? 'العقود' : 'Contracts'}</Link>
            <span>/</span>
            <span className="text-primary-foreground/80" dir="ltr">{contract.contract_number}</span>
          </nav>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {business?.logo_url ? (
                <Link to={`/${business.username}`}>
                  <img src={business.logo_url} alt={bizName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-primary-foreground/20 shrink-0 hover:border-primary-foreground/40 transition-colors" />
                </Link>
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-foreground/10 border-2 border-primary-foreground/20 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground/60" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-lg sm:text-2xl text-primary-foreground truncate">{title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={copyContractNumber} className="flex items-center gap-1 text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors text-[10px] sm:text-xs font-body" dir="ltr">
                    <Hash className="w-3 h-3" />{contract.contract_number}<Copy className="w-2.5 h-2.5" />
                  </button>
                  {business && (
                    <Link to={`/${business.username}`} className="flex items-center gap-1 text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors text-[10px] sm:text-xs font-body">
                      <Building2 className="w-3 h-3" />{bizName}
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canAccept && contract.status !== 'completed' && contract.status !== 'cancelled' && (
                <Button variant="hero" size="sm" className="text-xs sm:text-sm gap-1.5" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
                  <CheckCircle2 className="w-3.5 h-3.5" />{isRTL ? 'قبول العقد' : 'Accept'}
                </Button>
              )}
              <Button variant="heroOutline" size="sm" disabled={previewLoading} className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={handlePreviewPDF}>
                <Eye className="w-3.5 h-3.5" />{isRTL ? 'معاينة PDF' : 'Preview PDF'}
              </Button>
              <Button variant="heroOutline" size="sm" disabled={isExportingPDF} className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={handleExportPDF}>
                <Download className="w-3.5 h-3.5" />{isExportingPDF ? '…' : (isRTL ? 'تحميل PDF' : 'Download PDF')}
              </Button>
              {pdfDebugEnabled && (
                <Button variant="heroOutline" size="sm" className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={handleArabicFontTestPDF}>
                  <BookOpen className="w-3.5 h-3.5" />{isRTL ? 'اختبار الخط العربي في PDF' : 'Test Arabic PDF Font'}
                </Button>
              )}
              {pdfDebugEnabled && (
                <Button variant="heroOutline" size="sm" disabled={isAnalyzingPdf} className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={handleExportAndAnalyzePDF}>
                  <ShieldCheck className="w-3.5 h-3.5" />{isAnalyzingPdf ? '…' : (isRTL ? 'تصدير + تحليل' : 'Export + Analyze')}
                </Button>
              )}
              <Button variant="heroOutline" size="sm" className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" />{isRTL ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="heroOutline" size="sm" className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={shareContract}>
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="heroOutline" size="sm" className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={openMessages}>
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5 sm:py-8 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Phase 6 — Permanent Contract Code (barcode_code → /q/:code). Renders only when active barcode exists. */}
        {contractBarcodeCode && (
          <div className="mb-5 sm:mb-6">
            <BarcodeWidget
              barcodeCode={contractBarcodeCode}
              entityType="contract"
              title={isRTL ? 'كود العقد' : 'Contract Code'}
              subtitle={contract.contract_number}
              size="sm"
            />
          </div>
        )}
        {/* ─── Phase 5E.1 — Status Guidance (read-only) ─── */}
        {(() => {
          const guidance = getStatusGuidance(contract.status);
          const status = contract.status ?? 'draft';
          const tone =
            status === 'active' || status === 'completed'
              ? { box: 'border-success/30 bg-success/5', icon: 'text-success' }
              : status === 'pending_approval' || status === 'disputed'
              ? { box: 'border-warning/30 bg-warning/5', icon: 'text-warning' }
              : status === 'cancelled'
              ? { box: 'border-destructive/30 bg-destructive/5', icon: 'text-destructive' }
              : { box: 'border-info/30 bg-info/5', icon: 'text-info' };
          const StatusIcon = cfg.icon;
          const meaning = isRTL ? guidance.meaning_ar : guidance.meaning_en;
          const nextActions = isRTL ? guidance.next_actions_ar : guidance.next_actions_en;
          const lockNotice = guidance.locked
            ? (isRTL ? guidance.lock_notice_ar : guidance.lock_notice_en)
            : null;
          return (
            <div
              className={`rounded-xl border ${tone.box} p-3 sm:p-4 mb-5 sm:mb-6`}
              role="note"
              aria-label={isRTL ? 'إرشاد حالة العقد' : 'Contract status guidance'}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 mt-0.5 ${tone.icon}`}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {isRTL ? cfg.label_ar : cfg.label_en}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    {meaning}
                  </p>
                  {nextActions.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {nextActions.map((a, i) => (
                        <li
                          key={i}
                          className="inline-flex items-center text-[11px] rounded-md border border-border bg-card px-2 py-0.5 text-muted-foreground"
                        >
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                  {lockNotice && (
                    <p className="text-[11px] text-warning mt-2 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {lockNotice}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {/* ─── Phase 5E.2 — Source Lead context (read-only, safe summary only) ─── */}
        {contract.source_lead_id && (
          <SourceLeadSummaryCard
            contractId={contract.id}
            isRTL={isRTL}
            canOpenLead={user?.id === contract.provider_id}
          />
        )}
        {pdfDebugEnabled && pdfDiagnostics && (
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4 mb-5 sm:mb-6 text-xs">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <ShieldCheck className="w-4 h-4 text-success" />
              {isRTL ? 'تشخيص الخط العربي للـ PDF' : 'Arabic PDF font diagnostics'}
              {pdfDiagnostics.lastVerification && (
                <span className={`ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold ${pdfDiagnostics.lastVerification.status === 'PASS' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                  {pdfDiagnostics.lastVerification.status} · {pdfDiagnostics.lastVerification.source}
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-muted-foreground">
              <span>build: {pdfDiagnostics.buildVersion}</span>
              <span className="lg:col-span-2 truncate" title={pdfDiagnostics.exportPath}>export: {pdfDiagnostics.exportPath}</span>
              <span>font: {pdfDiagnostics.registeredFontName}</span>
              <span>source: {pdfDiagnostics.fontSource}</span>
              <span>content-type: {pdfDiagnostics.contentType}</span>
              <span>magic: {pdfDiagnostics.magicBytes}</span>
              <span>TTF/OTF: {String(pdfDiagnostics.isTrueType)}</span>
              <span className={pdfDiagnostics.fallbackFontUsed ? 'text-destructive font-semibold' : ''}>
                fallback: {String(pdfDiagnostics.fallbackFontUsed)}
              </span>
              <span>normalization: {String(pdfDiagnostics.normalizationRan)}</span>
              <span>loaded: {pdfDiagnostics.loadedAt ?? '-'}</span>
              <span>generated: {pdfDiagnostics.lastGeneratedPdfAt ?? '-'}</span>
              {pdfDiagnostics.lastVerification && (
                <>
                  <span>verified: {pdfDiagnostics.lastVerification.verifiedAt}</span>
                  <span>mojibake: {pdfDiagnostics.lastVerification.mojibakeCount}</span>
                  <span className="lg:col-span-3 truncate" title={pdfDiagnostics.lastVerification.sample}>
                    sample: {pdfDiagnostics.lastVerification.sample || '-'}
                  </span>
                </>
              )}
            </div>
            {pdfBackendReport && (
              <div className="mt-3">
                <PdfAnalysisReport report={pdfBackendReport} isRTL={isRTL} />
              </div>
            )}
          </div>
        )}
        {/* ─── Quick Stats ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 sm:mb-6">
          <StatCard icon={StatusIcon} label={isRTL ? 'الحالة' : 'Status'} value={isRTL ? cfg.label_ar : cfg.label_en} />
          <StatCard icon={Banknote} label={isRTL ? 'قيمة العقد' : 'Total Value'} value={`${grandTotalWithVat.toLocaleString()} ${contract.currency_code}`} accent sub={vatInclusive ? (isRTL ? 'شامل الضريبة' : 'VAT inclusive') : (isRTL ? `+ ${vatRate}% ضريبة` : `+ ${vatRate}% VAT`)} />
          <StatCard icon={ListChecks} label={isRTL ? 'المراحل' : 'Milestones'} value={`${completedMilestones}/${totalMilestones}`} sub={`${progressPct}% ${isRTL ? 'مكتمل' : 'complete'}`} />
          <StatCard icon={CreditCard} label={isRTL ? 'المسدد' : 'Paid'} value={`${paymentsTotals.paid.toLocaleString()}`} sub={`${paymentsTotals.paidCount}/${paymentsTotals.totalCount} ${isRTL ? 'دفعات' : 'payments'}`} />
        </div>

        {/* CT4 — Template metadata (display only) */}
        {templateMeta && (
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4 mb-5 sm:mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <FileText className="w-3.5 h-3.5 text-accent" />
              {isRTL ? 'القالب الرسمي' : 'Official Template'}
            </div>
            <span className="text-muted-foreground">
              {isRTL ? (templateMeta as any).contract_templates?.name_ar : ((templateMeta as any).contract_templates?.name_en || (templateMeta as any).contract_templates?.name_ar)}
            </span>
            <Badge variant="secondary" className="text-[10px]">v{(templateMeta as any).version_number}</Badge>
            {(templateMeta as any).contract_templates?.category && (
              <Badge variant="outline" className="text-[10px]">{(templateMeta as any).contract_templates.category}</Badge>
            )}
            {contractAny?.pricing_method && (
              <Badge variant="outline" className="text-[10px] gap-1"><Hash className="w-2.5 h-2.5" />{contractAny.pricing_method}</Badge>
            )}
          </div>
        )}

        {/* ─── Milestone Pipeline ─── */}
        {milestones && milestones.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
            <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><ListChecks className="w-4 h-4 text-accent" />{isRTL ? 'مسار المراحل' : 'Milestone Pipeline'}</h3>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {milestones.map((m, idx) => {
                const isComp = m.status === 'completed';
                const isActive = (m.status as string) === 'in_progress';
                const pct = totalAmount > 0 ? Math.round((Number(m.amount) / totalAmount) * 100) : 0;
                return (
                  <React.Fragment key={m.id}>
                    <button
                      onClick={() => { setActiveTab('milestones'); setExpandedMilestone(m.id); }}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[80px] hover:bg-muted/50 ${isComp ? '' : isActive ? 'bg-info/50 dark:bg-info/20' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isComp ? 'bg-success text-success dark:bg-success/40 dark:text-success' : isActive ? 'bg-info text-info dark:bg-info/40 dark:text-info ring-2 ring-info dark:ring-info' : 'bg-muted text-muted-foreground'}`}>
                        {isComp ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="text-[9px] font-body text-muted-foreground text-center whitespace-nowrap">{(language === 'ar' ? m.title_ar : (m.title_en || m.title_ar)).slice(0, 20)}</span>
                      <Badge variant="outline" className="text-[8px] px-1.5">{pct}%</Badge>
                    </button>
                    {idx < milestones.length - 1 && (
                      <div className={`w-6 h-0.5 shrink-0 ${isComp ? 'bg-success dark:bg-success' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <Progress value={progressPct} className="h-1.5 mt-3" aria-label={isRTL ? `تقدم المراحل ${progressPct}٪` : `Milestones progress ${progressPct}%`} />
          </div>
        )}

        {/* ─── Site / Building Address ─── */}
        {(business?.address || business?.district || business?.street_name || business?.building_number) && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Home className="w-4 h-4 text-accent" /></div>
              <div>
                <h3 className="font-heading font-bold text-sm">{isRTL ? 'موقع المشروع / عنوان المبنى' : 'Project Site / Building Address'}</h3>
                <p className="text-[10px] text-muted-foreground font-body">{isRTL ? 'العنوان التفصيلي للموقع المعني بالخدمة' : 'Detailed service location address'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
              <InfoRow icon={Globe} label={isRTL ? 'الدولة' : 'Country'} value={getCountryName(providerProfile)} />
              <InfoRow icon={MapPin} label={isRTL ? 'المنطقة' : 'Region'} value={business?.region} />
              <InfoRow icon={MapPin} label={isRTL ? 'المدينة' : 'City'} value={getCityName(providerProfile)} />
              <InfoRow icon={MapPin} label={isRTL ? 'الحي' : 'District'} value={business?.district} />
              <InfoRow icon={MapPin} label={isRTL ? 'اسم الشارع' : 'Street'} value={business?.street_name} />
              <InfoRow icon={Building2} label={isRTL ? 'رقم المبنى' : 'Building No.'} value={business?.building_number} dir="ltr" />
              <InfoRow icon={Hash} label={isRTL ? 'الرقم الإضافي' : 'Additional No.'} value={business?.additional_number} dir="ltr" />
              <InfoRow icon={MapPin} label={isRTL ? 'العنوان الوطني المختصر' : 'National Address'} value={business?.address} />
            </div>
          </div>
        )}

        {/* ─── Parties ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5 sm:mb-6">
          <PartyCard profile={clientProfile} partyLabel={isRTL ? 'الطرف الأول (العميل)' : 'First Party (Client)'} partyIcon={User} acceptedAt={contract.client_accepted_at} />
          <PartyCard profile={providerProfile} partyLabel={isRTL ? 'الطرف الثاني (مزود الخدمة)' : 'Second Party (Provider)'} partyIcon={Building2} biz={business} acceptedAt={contract.provider_accepted_at} isBiz />
        </div>

        {/* ─── Supervisor ─── */}
        {(contract.supervisor_name || contract.supervisor_phone || contract.supervisor_email) && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><IdCard className="w-4 h-4 text-accent" /></div>
              <span className="font-heading font-bold text-sm">{isRTL ? 'المفوض بالتوقيع / المشرف' : 'Authorized Signatory'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <InfoRow icon={User} label={isRTL ? 'الاسم' : 'Name'} value={contract.supervisor_name} />
              <InfoRow icon={Phone} label={isRTL ? 'الجوال' : 'Mobile'} value={contract.supervisor_phone} dir="ltr" href={contract.supervisor_phone ? `tel:${contract.supervisor_phone}` : undefined} />
              <InfoRow icon={Mail} label={isRTL ? 'البريد' : 'Email'} value={contract.supervisor_email} dir="ltr" href={contract.supervisor_email ? `mailto:${contract.supervisor_email}` : undefined} />
            </div>
          </div>
        )}

        {/* ─── Execution Site (Phase 5E) — read-only, safe snapshot fields only ─── */}
        {(() => {
          const snap = (contract as unknown as { execution_address_snapshot?: Record<string, unknown> | null }).execution_address_snapshot;
          if (!snap || typeof snap !== 'object') return null;
          const s = snap as Record<string, string | number | null | undefined>;
          const label = (s.label as string) || null;
          const contactName = (s.contact_name as string) || null;
          const contactPhone = (s.contact_phone as string) || null;
          const city = (s.city_name as string) || null;
          const district = (s.district as string) || null;
          const line1 = (s.address_line1 as string) || null;
          const line2 = (s.address_line2 as string) || null;
          const mapUrl = (s.map_url as string) || null;
          const accessNotes = (s.access_notes as string) || null;
          const fullAddress = [line1, line2, district, city].filter(Boolean).join('، ');
          if (!fullAddress && !label && !contactName && !contactPhone && !mapUrl) return null;
          return (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-accent" /></div>
                <span className="font-heading font-bold text-sm">{isRTL ? 'موقع التنفيذ' : 'Execution Site'}</span>
                {label && <Badge variant="secondary" className="text-[10px] ms-auto">{label}</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fullAddress && (
                  <InfoRow icon={MapPin} label={isRTL ? 'العنوان' : 'Address'} value={fullAddress} />
                )}
                {contactName && (
                  <InfoRow icon={User} label={isRTL ? 'مسؤول الموقع' : 'Site Contact'} value={contactName} />
                )}
                {contactPhone && (
                  <InfoRow icon={Phone} label={isRTL ? 'جوال الموقع' : 'Site Mobile'} value={contactPhone} dir="ltr" href={`tel:${contactPhone}`} />
                )}
                {mapUrl && (
                  <InfoRow icon={Globe} label={isRTL ? 'رابط الخريطة' : 'Map Link'} value={isRTL ? 'فتح في الخريطة' : 'Open in Map'} dir="ltr" href={mapUrl} />
                )}
                {accessNotes && (
                  <div className="sm:col-span-2 text-[11px] text-muted-foreground leading-5 whitespace-pre-wrap">
                    <span className="font-semibold text-foreground/80">{isRTL ? 'ملاحظات الوصول: ' : 'Access notes: '}</span>{accessNotes}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── Timeline & Financial ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5 sm:mb-6">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-accent" /></div>
              <span className="font-heading font-bold text-sm">{isRTL ? 'الجدول الزمني' : 'Timeline'}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'بدء سريان العقد' : 'Start'}</span><span className="text-xs font-heading font-semibold">{formatDate(contract.start_date)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'تاريخ الانتهاء' : 'End'}</span><span className="text-xs font-heading font-semibold">{formatDate(contract.end_date)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</span><span className="text-xs font-heading font-semibold">{formatDate(contract.created_at)}</span></div>
              {contract.completed_at && <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'تاريخ الإكمال' : 'Completed'}</span><span className="text-xs font-heading font-semibold text-success dark:text-success">{formatDate(contract.completed_at)}</span></div>}
              {contract.start_date && contract.end_date && (() => {
                const pct = Math.min(100, Math.max(0, Math.round(((Date.now() - new Date(contract.start_date!).getTime()) / (new Date(contract.end_date!).getTime() - new Date(contract.start_date!).getTime())) * 100)));
                return (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'التقدم الزمني' : 'Progress'}</span>
                      <span className="text-[10px] font-heading font-semibold text-accent">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" aria-label={isRTL ? `التقدم الزمني ${pct}٪` : `Time progress ${pct}%`} />
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Banknote className="w-4 h-4 text-accent" /></div>
              <span className="font-heading font-bold text-sm">{isRTL ? 'الملخص المالي' : 'Financial Summary'}</span>
              {vatInclusive && (
                <Badge className="bg-success text-success dark:bg-success/30 dark:text-success text-[9px] ms-auto">
                  <Percent className="w-3 h-3 me-1" />{isRTL ? 'شامل الضريبة' : 'VAT Inclusive'}
                </Badge>
              )}
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المبلغ قبل الضريبة' : 'Subtotal (excl. VAT)'}</span>
                <span className="text-xs font-heading font-semibold">{subtotalBeforeVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {contract.currency_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  {isRTL ? `ضريبة القيمة المضافة (${vatRate}%)` : `VAT (${vatRate}%)`}
                </span>
                <span className="text-xs font-heading font-semibold text-warning dark:text-warning">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {contract.currency_code}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-body font-semibold text-foreground">{isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total (incl. VAT)'}</span>
                <span className="text-sm font-heading font-bold text-accent">{grandTotalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {contract.currency_code}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المسدد' : 'Paid'}</span>
                <span className="text-xs font-heading font-semibold text-success dark:text-success">{paymentsTotals.paid.toLocaleString()} {contract.currency_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المتبقي' : 'Remaining'}</span>
                <span className="text-xs font-heading font-semibold">{(grandTotalWithVat - paymentsTotals.paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {contract.currency_code}</span>
              </div>
              {grandTotalWithVat > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'نسبة السداد' : 'Payment Progress'}</span>
                    <span className="text-[10px] font-heading font-semibold text-accent">{Math.round((paymentsTotals.paid / grandTotalWithVat) * 100)}%</span>
                  </div>
                  <Progress value={(paymentsTotals.paid / grandTotalWithVat) * 100} className="h-1.5" aria-label={isRTL ? `نسبة السداد ${Math.round((paymentsTotals.paid / grandTotalWithVat) * 100)}٪` : `Payment progress ${Math.round((paymentsTotals.paid / grandTotalWithVat) * 100)}%`} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Financial Coverage Summary (C3C) ─── */}
        {contract && (
          <ContractFinancialCoverage
            contract={contract}
            payments={installmentPayments || []}
            milestones={(milestones || []) as any}
          />
        )}

        {/* ─── Payment Schedule Generator (C3B) ─── */}
        {contract && (
          <PaymentScheduleGenerator
            contractId={contract.id}
            totalAmount={Number(contract.total_amount) || 0}
            currency={contract.currency_code || 'SAR'}
            milestones={(milestones || []).map((m: any) => ({ id: m.id, title_ar: m.title_ar, title_en: m.title_en, status: m.status }))}
            hasExistingPlan={!!installmentPlans && installmentPlans.length > 0}
            isProvider={user?.id === contract.provider_id}
            isLocked={isContractLocked}
          />
        )}

        {/* ─── Installment Payments ─── */}
        {installmentPlans && installmentPlans.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><ReceiptText className="w-4 h-4 text-accent" />{isRTL ? 'مسار الدفعات' : 'Payment Schedule'}</h3>
            </div>
            {installmentPlans.map(plan => {
              const planPayments = installmentPayments?.filter(p => p.plan_id === plan.id) || [];
              const paidAmt = planPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
              return (
                <div key={plan.id}>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {plan.ref_id && <Badge variant="outline" className="text-[10px]" dir="ltr">{plan.ref_id}</Badge>}
                    <Badge className={(statusConfig[plan.status]?.bg || 'bg-muted text-muted-foreground') + ' text-[10px]'}>
                      {isRTL ? (statusConfig[plan.status]?.label_ar || plan.status) : (statusConfig[plan.status]?.label_en || plan.status)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-body">
                      {plan.number_of_installments} {isRTL ? 'دفعات' : 'installments'} · {isRTL ? 'المسدد' : 'Paid'}: {paidAmt.toLocaleString()} / {Number(plan.total_amount).toLocaleString()} {plan.currency_code}
                    </span>
                  </div>

                  {/* Payment cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    {planPayments.map(pay => {
                      const ratio = Number(plan.total_amount) > 0 ? Math.round((Number(pay.amount) / Number(plan.total_amount)) * 100) : 0;
                      const isPaid = pay.status === 'paid';
                      const isOverdue = !isPaid && new Date(pay.due_date) < new Date();
                      return (
                        <div key={pay.id} className={`rounded-xl border p-4 transition-all ${isPaid ? 'border-success dark:border-success/30 bg-success/50 dark:bg-success/10' : isOverdue ? 'border-destructive dark:border-destructive/30 bg-destructive/50 dark:bg-destructive/10' : 'border-border bg-card'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPaid ? 'bg-success text-success dark:bg-success/40 dark:text-success' : isOverdue ? 'bg-destructive text-destructive dark:bg-destructive/40 dark:text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                {isPaid ? <CheckCircle2 className="w-4 h-4" /> : pay.installment_number}
                              </div>
                              <div>
                                <p className="font-heading font-bold text-xs">{isRTL ? `الدفعة ${pay.installment_number}` : `Payment ${pay.installment_number}`}</p>
                                <p className="text-[9px] text-muted-foreground font-body">{ratio}% {isRTL ? 'من الإجمالي' : 'of total'}</p>
                              </div>
                            </div>
                            <Badge className={`text-[9px] ${isPaid ? 'bg-success text-success dark:bg-success/30 dark:text-success' : isOverdue ? 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive' : 'bg-muted text-muted-foreground'}`}>
                              {isPaid ? (isRTL ? 'مسدد' : 'Paid') : isOverdue ? (isRTL ? 'متأخر' : 'Overdue') : (isRTL ? 'معلق' : 'Pending')}
                            </Badge>
                          </div>
                          <p className="font-heading font-bold text-lg text-foreground">{Number(pay.amount).toLocaleString()} <span className="text-xs text-muted-foreground">{plan.currency_code}</span></p>
                          <div className="mt-2 space-y-1 text-[10px] text-muted-foreground font-body">
                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{isRTL ? 'الاستحقاق:' : 'Due:'} {formatDate(pay.due_date)}</div>
                            {isPaid && pay.paid_at && <div className="flex items-center gap-1 text-success dark:text-success"><CheckCircle2 className="w-3 h-3" />{isRTL ? 'تم السداد:' : 'Paid:'} {formatDate(pay.paid_at)}</div>}
                            {pay.payment_method && <div className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{pay.payment_method === 'bank_transfer' ? (isRTL ? 'تحويل بنكي' : 'Bank Transfer') : pay.payment_method}</div>}
                          </div>
                          {pay.notes && <p className="mt-2 text-[10px] text-muted-foreground/80 font-body border-t border-border pt-2">{pay.notes}</p>}
                          <Progress value={isPaid ? 100 : 0} className="h-1 mt-2" aria-label={isPaid ? (isRTL ? 'مسدد' : 'Paid') : (isRTL ? 'غير مسدد' : 'Unpaid')} />
                          {/* C3B: milestone link — editable for provider, read-only for others */}
                          {(() => {
                            const linked = pay.milestone_id ? milestones?.find(m => m.id === pay.milestone_id) : null;
                            if (isProvider && !isContractLocked) {
                              return (
                                <div className="mt-2">
                                  <Select
                                    value={pay.milestone_id || '__none__'}
                                    onValueChange={async (v) => {
                                      const newVal = v === '__none__' ? null : v;
                                      const { error } = await updateInstallmentPayment(pay.id, { milestone_id: newVal });
                                      if (error) {
                                        toast({ title: isRTL ? 'تعذّر الحفظ' : 'Could not save', description: error.message, variant: 'destructive' });
                                      } else {
                                        queryClient.invalidateQueries({ queryKey: ['installment-payments'] });
                                      }
                                    }}
                                    disabled={!milestones || milestones.length === 0}
                                  >
                                    <SelectTrigger className="h-7 text-[10px]">
                                      <SelectValue placeholder={isRTL ? 'ربط بمرحلة' : 'Link milestone'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">{isRTL ? 'غير مرتبط' : 'Unlinked'}</SelectItem>
                                      {(milestones || []).map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {(isRTL ? m.title_ar : (m.title_en || m.title_ar)) || (isRTL ? 'مرحلة' : 'Milestone')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {(!milestones || milestones.length === 0) && (
                                    <p className="text-[9px] text-muted-foreground/80 font-body italic mt-1">
                                      {isRTL ? 'أضف مراحل العمل أولاً لربطها بالدفعات.' : 'Add milestones first to link them.'}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="mt-2 text-[10px] font-body flex items-center gap-1 text-muted-foreground">
                                {linked ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    <span className="truncate">{isRTL ? 'مرتبط بمرحلة:' : 'Linked milestone:'} <span className="text-foreground font-medium">{isRTL ? linked.title_ar : (linked.title_en || linked.title_ar)}</span></span>
                                  </>
                                ) : (
                                  <span className="opacity-70">{isRTL ? 'غير مرتبط بمرحلة' : 'Unlinked'}</span>
                                )}
                              </div>
                            );
                          })()}
                          {/* C3D — Manual payment confirmation (provider only, contract not locked, status=pending) */}
                          {isProvider && !isContractLocked && pay.status === 'pending' && (
                            <div className="mt-3">
                              {confirmingPayId !== pay.id ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-8 text-[11px]"
                                  onClick={() => {
                                    setPayConfirmForm({
                                      paid_at: new Date().toISOString().slice(0, 10),
                                      payment_method: pay.payment_method || 'bank_transfer',
                                      notes: '',
                                    });
                                    setConfirmingPayId(pay.id);
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {isRTL ? 'تسجيل دفعة' : 'Record payment'}
                                </Button>
                              ) : (
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                  <p className="text-[11px] font-heading font-bold">
                                    {isRTL ? 'تأكيد تسجيل الدفعة' : 'Confirm payment'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-body">
                                    {isRTL
                                      ? 'تأكد من صحة المبلغ وتاريخ الدفع قبل الحفظ.'
                                      : 'Verify the amount and date before saving.'}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-muted-foreground font-body block mb-1">
                                        {isRTL ? 'المبلغ' : 'Amount'}
                                      </label>
                                      <div className="h-8 px-2 rounded-md border border-input bg-muted/40 flex items-center text-[11px] tech-content" dir="ltr">
                                        {Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {plan.currency_code}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground font-body block mb-1">
                                        {isRTL ? 'تاريخ الدفع' : 'Payment date'}
                                      </label>
                                      <Input
                                        type="date"
                                        value={payConfirmForm.paid_at}
                                        onChange={(e) => setPayConfirmForm(f => ({ ...f, paid_at: e.target.value }))}
                                        className="h-8 text-[11px]"
                                        dir="ltr"
                                        max={new Date().toISOString().slice(0, 10)}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                                      {isRTL ? 'طريقة الدفع' : 'Payment method'}
                                    </label>
                                    <Select
                                      value={payConfirmForm.payment_method}
                                      onValueChange={(v) => setPayConfirmForm(f => ({ ...f, payment_method: v }))}
                                    >
                                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank transfer'}</SelectItem>
                                        <SelectItem value="cash">{isRTL ? 'نقداً' : 'Cash'}</SelectItem>
                                        <SelectItem value="cheque">{isRTL ? 'شيك' : 'Cheque'}</SelectItem>
                                        <SelectItem value="card">{isRTL ? 'بطاقة' : 'Card'}</SelectItem>
                                        <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground font-body block mb-1">
                                      {isRTL ? 'ملاحظة (اختياري)' : 'Note (optional)'}
                                    </label>
                                    <Input
                                      value={payConfirmForm.notes}
                                      onChange={(e) => setPayConfirmForm(f => ({ ...f, notes: e.target.value.slice(0, 200) }))}
                                      className="h-8 text-[11px]"
                                      maxLength={200}
                                      placeholder={isRTL ? 'مرجع، رقم تحويل، إلخ' : 'Reference, transfer #, etc.'}
                                    />
                                  </div>
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-[11px]"
                                      disabled={confirmingPayBusy}
                                      onClick={() => setConfirmingPayId(null)}
                                    >
                                      {isRTL ? 'إلغاء' : 'Cancel'}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 text-[11px]"
                                      disabled={confirmingPayBusy || !payConfirmForm.paid_at}
                                      onClick={async () => {
                                        // Safety: re-verify status client-side; RLS still enforces server-side.
                                        if (pay.status !== 'pending') {
                                          toast({ title: isRTL ? 'لا يمكن التعديل' : 'Cannot modify', description: isRTL ? 'الدفعة ليست في حالة معلق' : 'Payment is not pending', variant: 'destructive' });
                                          return;
                                        }
                                        setConfirmingPayBusy(true);
                                        try {
                                          const updates: {
                                            status: 'paid';
                                            paid_at: string;
                                            payment_method: string;
                                            notes?: string;
                                          } = {
                                            status: 'paid',
                                            paid_at: new Date(payConfirmForm.paid_at).toISOString(),
                                            payment_method: payConfirmForm.payment_method,
                                          };
                                          const trimmedNote = payConfirmForm.notes.trim();
                                          if (trimmedNote) {
                                            const prior = pay.notes ? `${pay.notes}\n` : '';
                                            updates.notes = `${prior}${trimmedNote}`.slice(0, 1000);
                                          }
                                          // Guard against double-confirm with eq('status','pending')
                                          const { data: updated, error } = await updateInstallmentPaymentIfStatus(pay.id, updates, 'pending');
                                          if (error) throw error;
                                          if (!updated) {
                                            toast({ title: isRTL ? 'تعذّر تسجيل الدفعة' : 'Could not record payment', description: isRTL ? 'قد تكون قد سُجلت من جهة أخرى' : 'May have been recorded elsewhere', variant: 'destructive' });
                                          } else {
                                            // Best-effort audit note (non-fatal if RLS blocks)
                                            try {
                                              if (user?.id && contract?.id) {
                                                await createContractNote({
                                                  contract_id: contract.id,
                                                  user_id: user.id,
                                                  note_type: 'note',
                                                  content: (isRTL ? 'تسجيل دفعة #' : 'Payment recorded #') + pay.installment_number + ' — ' + Number(pay.amount).toFixed(2) + ' ' + plan.currency_code + ' (' + payConfirmForm.payment_method + ')',
                                                });
                                              }
                                            } catch { /* audit is best-effort */ }
                                            toast({ title: isRTL ? 'تم تسجيل الدفعة' : 'Payment recorded' });
                                            queryClient.invalidateQueries({ queryKey: ['installment-payments'] });
                                            queryClient.invalidateQueries({ queryKey: ['contract-notes', id] });
                                            setConfirmingPayId(null);
                                            // Best-effort: notify client in-app + email. Never block payment update.
                                            try {
                                              if (contract?.client_id) {
                                                const refId = (contract as any).ref_id || contract.id;
                                                const titleAr = (contract as any).title_ar || (contract as any).title || '';
                                                const titleEn = (contract as any).title_en || (contract as any).title || titleAr;
                                                createNotificationFireAndForget({
                                                  user_id: contract.client_id,
                                                  title_ar: 'تم تسجيل دفعة على عقدك',
                                                  title_en: 'A payment was recorded on your contract',
                                                  body_ar: `تم تسجيل دفعة #${pay.installment_number} على العقد ${refId}.`,
                                                  body_en: `Payment #${pay.installment_number} was recorded on contract ${refId}.`,
                                                  notification_type: 'contract_payment_recorded',
                                                  reference_id: contract.id,
                                                  reference_type: 'contract',
                                                  action_url: `/contracts/${contract.id}`,
                                                }, '[ContractDetail] payment-recorded notification failed');
                                                const clientEmail = (clientProfile as any)?.email;
                                                const clientName = (clientProfile as any)?.full_name;
                                                if (clientEmail) {
                                                  void sendTransactionalEmail({
                                                    templateName: 'contract-payment-recorded',
                                                    recipientEmail: clientEmail,
                                                    idempotencyKey: `contract-payment-recorded-${pay.id}`,
                                                    templateData: {
                                                      recipientName: clientName,
                                                      contractRefId: refId,
                                                      contractTitle: isRTL ? titleAr : titleEn,
                                                      installmentNumber: pay.installment_number,
                                                      amount: Number(pay.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
                                                      currency: plan.currency_code,
                                                      contractId: contract.id,
                                                      contractUrl: `${window.location.origin}/contracts/${contract.id}`,
                                                    },
                                                  }).catch(() => { /* queue retries */ });
                                                }
                                              }
                                            } catch { /* notify is best-effort */ }
                                          }
                                        } catch (e: unknown) {
                                          const msg = e instanceof Error ? e.message : (isRTL ? 'حدث خطأ' : 'Unknown error');
                                          toast({ title: isRTL ? 'فشل الحفظ' : 'Save failed', description: msg, variant: 'destructive' });
                                        } finally {
                                          setConfirmingPayBusy(false);
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {confirmingPayBusy ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (isRTL ? 'تسجيل الدفعة' : 'Record payment')}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {/* C4B.4 — Payment receipts */}
                          {id && user && (
                            <PaymentReceiptPanel
                              contractId={id}
                              paymentId={pay.id}
                              userId={user.id}
                              isRTL={isRTL}
                              isPaid={isPaid}
                              locked={isContractLocked}
                              attachments={attachmentsByPayment.get(pay.id) || []}
                              formatDate={formatDate}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Contract Clauses ─── */}
        {(desc || terms) && (
          <div className="mb-5 sm:mb-6 space-y-3">
            <h2 className="font-heading font-bold text-base flex items-center gap-2"><BookOpen className="w-5 h-5 text-accent" />{isRTL ? 'بنود العقد' : 'Contract Clauses'}</h2>
            {desc && <ClauseSection icon={BookOpen} number={1} title={isRTL ? 'التمهيد والمقدمة' : 'Preamble'} defaultOpen><p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{desc}</p></ClauseSection>}
            <ClauseSection icon={User} number={2} title={isRTL ? 'التزامات الطرف الأول (العميل)' : 'Client Obligations'}>
              <ul className="space-y-2 text-xs text-muted-foreground font-body list-disc list-inside">
                <li>{isRTL ? 'سداد المستحقات المالية وفقاً لجدول الدفعات المتفق عليه' : 'Pay dues per schedule'}</li>
                <li>{isRTL ? 'تجهيز الموقع وتوفير المتطلبات اللازمة' : 'Prepare site and requirements'}</li>
                <li>{isRTL ? 'تقديم الملاحظات والتعديلات خلال الفترة المحددة' : 'Submit feedback within timeframe'}</li>
                <li>{isRTL ? 'استلام الأعمال وتوقيع محاضر التسليم' : 'Accept work and sign handover reports'}</li>
              </ul>
            </ClauseSection>
            <ClauseSection icon={Building2} number={3} title={isRTL ? 'التزامات الطرف الثاني (المزود)' : 'Provider Obligations'}>
              <ul className="space-y-2 text-xs text-muted-foreground font-body list-disc list-inside">
                <li>{isRTL ? 'تنفيذ الأعمال وفقاً للمواصفات بجودة عالية' : 'Execute per specs with quality'}</li>
                <li>{isRTL ? 'الالتزام بالجدول الزمني لكل مرحلة' : 'Meet milestone deadlines'}</li>
                <li>{isRTL ? 'توفير ضمان شامل على الأعمال' : 'Provide warranty'}</li>
                <li>{isRTL ? 'معالجة العيوب فوراً خلال فترة الضمان' : 'Fix defects during warranty'}</li>
              </ul>
            </ClauseSection>
            {terms && <ClauseSection icon={Scale} number={4} title={isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}><p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{terms}</p></ClauseSection>}
            <ClauseSection icon={AlertTriangle} number={5} title={isRTL ? 'التأخير والجزاءات' : 'Delays & Penalties'}>
              <ul className="space-y-2 text-xs text-muted-foreground font-body list-disc list-inside">
                <li>{isRTL ? 'تأخر العميل: يحق للمزود تمديد الجدول بما يعادل فترة التأخير' : 'Client delay: Provider may extend timeline'}</li>
                <li>{isRTL ? 'تأخر المزود: يحق للعميل المطالبة بالتعويض' : 'Provider delay: Client may claim compensation'}</li>
                <li>{isRTL ? 'التأخير بسبب جاهزية المكان: يتحمل العميل المسؤولية' : 'Site readiness: Client responsibility'}</li>
              </ul>
            </ClauseSection>
            <ClauseSection icon={Scale} number={6} title={isRTL ? 'التحكيم وفض النزاعات' : 'Arbitration'}>
              <ol className="space-y-2 text-xs text-muted-foreground font-body list-decimal list-inside">
                <li>{isRTL ? 'حل ودي خلال 15 يوم عمل' : 'Amicable resolution within 15 days'}</li>
                <li>{isRTL ? 'لجنة تحكيم مستقلة' : 'Independent arbitration'}</li>
                <li>{isRTL ? 'الجهات القضائية المختصة' : 'Competent courts'}</li>
              </ol>
            </ClauseSection>
            <ClauseSection icon={Handshake} number={7} title={isRTL ? 'الخاتمة والتوقيع الإلكتروني' : 'E-Signatures'}>
              <div className="text-xs text-muted-foreground font-body space-y-3">
                <p>{isRTL ? 'حُرر هذا العقد وتم التوقيع عليه إلكترونياً من قبل الطرفين بنفس الحجية القانونية.' : 'Electronically signed by both parties with full legal validity.'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  {[
                    { label: isRTL ? 'الطرف الأول (العميل)' : 'Client', name: getProfileName(clientProfile), accepted: contract.client_accepted_at },
                    { label: isRTL ? 'الطرف الثاني (المزود)' : 'Provider', name: bizName || getProfileName(providerProfile), accepted: contract.provider_accepted_at },
                  ].map((party, i) => (
                    <div key={i} className="text-center space-y-2 p-3 rounded-lg bg-muted/20">
                      <p className="font-heading font-bold text-foreground text-xs">{party.label}</p>
                      <p className="text-xs">{party.name}</p>
                      {party.accepted
                        ? <div className="flex items-center justify-center gap-1 text-success dark:text-success"><PenTool className="w-3 h-3" /><span className="text-[10px]">{isRTL ? 'تم التوقيع' : 'Signed'} · {formatDate(party.accepted)}</span></div>
                        : <span className="text-[10px] text-muted-foreground/50">{isRTL ? 'لم يتم التوقيع' : 'Not signed'}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </ClauseSection>
          </div>
        )}

        {/* ─── Lock Banner ─── */}
        {isContractLocked && <ContractLockBanner isRTL={isRTL} />}

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ContractTabsHeader
            isRTL={isRTL}
            counts={{
              milestones: totalMilestones,
              measurements: measurements?.length || 0,
              warranty: warranties?.length || 0,
              maintenance: maintenanceReqs?.length || 0,
              notes: notes?.length || 0,
              attachments: attachments?.length || 0,
              amendments: amendments?.length || 0,
              exports: 0,
              pdfAnalysis: 0,
            }}
          />

          {/* ── Milestones ── */}
          <TabsContent value="milestones">
            {/* Add Milestone Form */}
            {!isContractLocked && (isProvider || isClient) && (
              <div className="mb-4">
                {showMilestoneForm ? (
                  <div className="p-4 rounded-xl bg-card border-2 border-dashed border-accent/30 space-y-3">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-accent" />{isRTL ? 'إضافة مرحلة جديدة' : 'Add Milestone'}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder={isRTL ? 'اسم المرحلة *' : 'Title *'} value={msForm.title_ar} onChange={e => setMsForm(f => ({ ...f, title_ar: e.target.value }))} className="text-sm" />
                      <Input type="number" placeholder={isRTL ? 'المبلغ *' : 'Amount *'} value={msForm.amount} onChange={e => setMsForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="text-sm" />
                      <Input type="date" value={msForm.due_date} onChange={e => setMsForm(f => ({ ...f, due_date: e.target.value }))} dir="ltr" className="text-sm" />
                      <Input placeholder={isRTL ? 'وصف المرحلة' : 'Description'} value={msForm.description_ar} onChange={e => setMsForm(f => ({ ...f, description_ar: e.target.value }))} className="text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="gap-1.5 text-xs" disabled={!msForm.title_ar || !msForm.amount || addMilestoneMutation.isPending} onClick={() => addMilestoneMutation.mutate()}>
                        <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة' : 'Add'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowMilestoneForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowMilestoneForm(true)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة مرحلة' : 'Add Milestone'}</Button>
                )}
              </div>
            )}
            {isContractLocked && (
              <div className="text-[10px] text-warning dark:text-warning mb-3 flex items-center gap-1"><Shield className="w-3 h-3" />{isRTL ? 'المراحل مقفلة - استخدم ملحق العقد للتعديل' : 'Milestones locked - use amendments to modify'}</div>
            )}
            <div className="space-y-2 sm:space-y-3">
              {milestones?.map((m, idx) => {
                const mTitle = language === 'ar' ? m.title_ar : (m.title_en || m.title_ar);
                const mDesc = language === 'ar' ? m.description_ar : (m.description_en || m.description_ar);
                const mCfg = statusConfig[m.status] || statusConfig.draft;
                const isComp = m.status === 'completed';
                const pct = totalAmount > 0 ? Math.round((Number(m.amount) / totalAmount) * 100) : 0;
                const milestoneAtts = attachments?.filter(a => a.milestone_id === m.id) || [];
                const isExpanded = expandedMilestone === m.id;
                return (
                  <div key={m.id} className={`rounded-xl border transition-all ${isComp ? 'bg-success/50 dark:bg-success/10 border-success/50 dark:border-success/30' : 'bg-card border-border'} ${isExpanded ? 'ring-1 ring-accent/30' : ''}`}>
                    <button onClick={() => setExpandedMilestone(isExpanded ? null : m.id)} className="w-full p-3 sm:p-5 text-start">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isComp ? 'bg-success text-success dark:bg-success/40 dark:text-success' : 'bg-muted text-muted-foreground'}`}>
                            {isComp ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading font-semibold text-sm text-foreground">{mTitle}</h4>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] sm:text-xs text-muted-foreground font-body flex-wrap">
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{Number(m.amount).toLocaleString()} {contract.currency_code}</span>
                              <Badge variant="outline" className="text-[9px] gap-0.5"><Percent className="w-2.5 h-2.5" />{pct}%</Badge>
                              {m.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(m.due_date)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={`${mCfg.bg} text-[9px] sm:text-xs`}>{isRTL ? mCfg.label_ar : mCfg.label_en}</Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 sm:px-5 pb-4 pt-0 border-t border-border">
                        {mDesc && <p className="text-xs text-muted-foreground font-body mt-3 leading-relaxed">{mDesc}</p>}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-muted-foreground font-body">{isRTL ? 'المبلغ' : 'Amount'}</p>
                            <p className="font-heading font-bold text-sm text-accent">{Number(m.amount).toLocaleString()}</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-muted-foreground font-body">{isRTL ? 'النسبة' : 'Ratio'}</p>
                            <p className="font-heading font-bold text-sm">{pct}%</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-muted-foreground font-body">{isRTL ? 'الاستحقاق' : 'Due'}</p>
                            <p className="font-heading font-bold text-xs">{formatDate(m.due_date)}</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-muted-foreground font-body">{isRTL ? 'الإنجاز' : 'Completed'}</p>
                            <p className="font-heading font-bold text-xs">{m.completed_at ? formatDate(m.completed_at) : '-'}</p>
                          </div>
                        </div>
                        {milestoneAtts.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[10px] font-heading font-semibold mb-1.5">{isRTL ? 'المرفقات' : 'Attachments'}</p>
                            <div className="flex flex-wrap gap-2">
                              {milestoneAtts.map(a => (
                                <button key={a.id} type="button" onClick={async () => { const ok = await openAttachmentSigned(a as AttachmentRow); if (!ok) toast({ title: isRTL ? 'تعذر فتح المرفق' : 'Could not open attachment', variant: 'destructive' }); }} className="flex items-center gap-1.5 text-[10px] text-accent hover:underline font-body bg-accent/5 rounded-lg px-3 py-1.5 border border-accent/10">
                                  <Paperclip className="w-3 h-3" />{a.file_name}<ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {(!milestones || milestones.length === 0) && (
                <div className="text-center py-12"><ListChecks className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" /><p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا توجد مراحل' : 'No milestones'}</p></div>
              )}
            </div>
          </TabsContent>

          {/* ── Measurements ── */}
          <TabsContent value="measurements">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {!isContractLocked && (isProvider || isClient) && (
                <>
                  <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowMeasurementForm(true)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة قطعة' : 'Add'}</Button>
                  <input ref={importFileRef} type="file" className="hidden" onChange={handleImportMeasurements} accept=".csv,.txt,.xlsx" />
                  <Button variant="outline" className="gap-1.5 text-xs" onClick={() => importFileRef.current?.click()}><Upload className="w-3.5 h-3.5" />{isRTL ? 'استيراد من ملف' : 'Import CSV'}</Button>
                </>
              )}
              {measurements && measurements.length > 0 && (
                <>
                  <div className="ms-auto" />
                  <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8" onClick={handleExportMeasurementsExcel}><Download className="w-3 h-3" />{isRTL ? 'تصدير Excel' : 'Export CSV'}</Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8" onClick={handleExportMeasurementsPDF}><Download className="w-3 h-3" />{isRTL ? 'تصدير PDF' : 'Export PDF'}</Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8" onClick={handlePrintMeasurements}><Printer className="w-3 h-3" />{isRTL ? 'طباعة' : 'Print'}</Button>
                </>
              )}
            </div>

            {/* Import Preview */}
            {showImportPreview && importedMeasurements.length > 0 && (
              <div className="mb-4 p-4 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-accent" />
                    {isRTL ? `معاينة الاستيراد (${importedMeasurements.length} قطعة)` : `Import Preview (${importedMeasurements.length} items)`}
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => { setShowImportPreview(false); setImportedMeasurements([]); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
                <p className="text-[10px] text-muted-foreground font-body">{isRTL ? 'راجع البيانات وعدّلها قبل التأكيد' : 'Review and edit data before confirming'}</p>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-start font-heading font-semibold">#</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'الاسم' : 'Name'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'رقم القطعة' : 'Piece #'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'الطول' : 'L (mm)'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'العرض' : 'W (mm)'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'السعر' : 'Price'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'التكلفة' : 'Cost'}</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedMeasurements.map((m, idx) => (
                          <tr key={idx} className="border-t border-border hover:bg-muted/20">
                            <td className="p-2 text-muted-foreground">{idx + 1}</td>
                            <td className="p-2">
                              {editingImportIdx === idx ? (
                                <Input className="h-7 text-xs" value={m.name_ar} onChange={e => updateImportedRow(idx, 'name_ar', e.target.value)} />
                              ) : (
                                <button onClick={() => setEditingImportIdx(idx)} className="text-start hover:text-accent">{m.name_ar}</button>
                              )}
                            </td>
                            <td className="p-2 font-heading" dir="ltr">{m.piece_number}</td>
                            <td className="p-2" dir="ltr">
                              {editingImportIdx === idx ? (
                                <Input type="number" className="h-7 text-xs w-20" value={m.length_mm} onChange={e => updateImportedRow(idx, 'length_mm', Number(e.target.value))} />
                              ) : m.length_mm}
                            </td>
                            <td className="p-2" dir="ltr">
                              {editingImportIdx === idx ? (
                                <Input type="number" className="h-7 text-xs w-20" value={m.width_mm} onChange={e => updateImportedRow(idx, 'width_mm', Number(e.target.value))} />
                              ) : m.width_mm}
                            </td>
                            <td className="p-2" dir="ltr">
                              {editingImportIdx === idx ? (
                                <Input type="number" className="h-7 text-xs w-24" value={m.unit_price} onChange={e => updateImportedRow(idx, 'unit_price', Number(e.target.value))} />
                              ) : m.unit_price.toLocaleString()}
                            </td>
                            <td className="p-2 font-heading font-bold text-accent" dir="ltr">{(m.unit_price * m.quantity).toLocaleString()}</td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingImportIdx(editingImportIdx === idx ? null : idx)} aria-label={isRTL ? 'تعديل' : 'Edit'} title={isRTL ? 'تعديل' : 'Edit'}>
                                   <PenTool className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeImportedRow(idx)} aria-label={isRTL ? 'حذف' : 'Delete'} title={isRTL ? 'حذف' : 'Delete'}>
                                   <Trash2 className="w-3 h-3 text-destructive" aria-hidden="true" />
                                 </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={confirmImportMeasurements}>
                    <CheckCircle2 className="w-3.5 h-3.5" />{isRTL ? 'تأكيد الاستيراد' : 'Confirm Import'}
                  </Button>
                  <span className="text-[10px] text-muted-foreground font-body">
                    {isRTL ? `إجمالي: ${importedMeasurements.reduce((s, m) => s + m.unit_price * m.quantity, 0).toLocaleString()} ${contract.currency_code}` 
                      : `Total: ${importedMeasurements.reduce((s, m) => s + m.unit_price * m.quantity, 0).toLocaleString()} ${contract.currency_code}`}
                  </span>
                </div>
              </div>
            )}

            {/* Add/Edit Form */}
            {!isContractLocked && (isProvider || isClient) && showMeasurementForm && (
              <div className="mb-4">
                <div className="p-4 rounded-xl bg-card border-2 border-dashed border-accent/30 space-y-3">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-accent" />
                      {editingMeasurement ? (isRTL ? 'تعديل المقاس' : 'Edit Measurement') : (isRTL ? 'إضافة قطعة جديدة' : 'Add Measurement')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input placeholder={isRTL ? 'اسم القطعة *' : 'Name *'} value={mForm.name_ar} onChange={e => setMForm(f => ({ ...f, name_ar: e.target.value }))} className="text-sm" />
                      <Input placeholder={isRTL ? 'رقم القطعة (W-GF-001)' : 'Piece # (W-GF-001)'} value={mForm.piece_number} onChange={e => setMForm(f => ({ ...f, piece_number: e.target.value }))} dir="ltr" className="text-sm" />
                      <Select value={mForm.floor_label} onValueChange={v => setMForm(f => ({ ...f, floor_label: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ground_floor">{isRTL ? 'الدور الأرضي' : 'Ground Floor'}</SelectItem>
                          <SelectItem value="first_floor">{isRTL ? 'الدور الأول' : '1st Floor'}</SelectItem>
                          <SelectItem value="second_floor">{isRTL ? 'الدور الثاني' : '2nd Floor'}</SelectItem>
                          <SelectItem value="roof">{isRTL ? 'السطح' : 'Roof'}</SelectItem>
                          <SelectItem value="basement">{isRTL ? 'القبو' : 'Basement'}</SelectItem>
                          <SelectItem value="external">{isRTL ? 'خارجي' : 'External'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder={isRTL ? 'المكان (مطبخ، حمام...)' : 'Location (kitchen...)'} value={mForm.location_ar} onChange={e => setMForm(f => ({ ...f, location_ar: e.target.value }))} className="text-sm" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input type="number" placeholder={isRTL ? 'الطول (مم) *' : 'Length (mm) *'} value={mForm.length_mm} onChange={e => setMForm(f => ({ ...f, length_mm: e.target.value }))} dir="ltr" className="text-sm" />
                      <Input type="number" placeholder={isRTL ? 'العرض (مم) *' : 'Width (mm) *'} value={mForm.width_mm} onChange={e => setMForm(f => ({ ...f, width_mm: e.target.value }))} dir="ltr" className="text-sm" />
                      <Input type="number" placeholder={isRTL ? 'الكمية' : 'Qty'} value={mForm.quantity} onChange={e => setMForm(f => ({ ...f, quantity: e.target.value }))} dir="ltr" className="text-sm" />
                      <Input type="number" placeholder={isRTL ? 'سعر الوحدة *' : 'Unit price *'} value={mForm.unit_price} onChange={e => setMForm(f => ({ ...f, unit_price: e.target.value }))} dir="ltr" className="text-sm" />
                    </div>
                    {mForm.length_mm && mForm.width_mm && mForm.unit_price && (
                      <div className="flex items-center gap-4 p-2.5 rounded-lg bg-accent/5 border border-accent/10 text-xs font-heading">
                        <span>{isRTL ? 'المساحة:' : 'Area:'} <strong>{((Number(mForm.length_mm) * Number(mForm.width_mm)) / 1000000).toFixed(3)} م²</strong></span>
                        <span>{isRTL ? 'التكلفة:' : 'Cost:'} <strong className="text-accent">{(Number(mForm.unit_price) * Number(mForm.quantity || 1)).toLocaleString()} {contract.currency_code}</strong></span>
                      </div>
                    )}
                    <Input placeholder={isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'} value={mForm.notes} onChange={e => setMForm(f => ({ ...f, notes: e.target.value }))} className="text-sm" />
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="gap-1.5 text-xs" disabled={!mForm.name_ar || !mForm.length_mm || !mForm.width_mm || !mForm.unit_price || addMeasurementMutation.isPending} onClick={() => addMeasurementMutation.mutate()}>
                        <Plus className="w-3.5 h-3.5" />{editingMeasurement ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={resetMForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                </div>
              </div>
            )}
            {isContractLocked && (
              <div className="text-[10px] text-warning dark:text-warning mb-3 flex items-center gap-1"><Shield className="w-3 h-3" />{isRTL ? 'المقاسات مقفلة - المجموع النهائي يحدد قيمة العقد' : 'Measurements locked - total determines contract value'}</div>
            )}

            {/* Info banner: total = contract value */}
            {measurements && measurements.length > 0 && (
              <div className="p-3 mb-4 rounded-xl bg-accent/5 border border-accent/10 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent shrink-0" />
                  <p className="text-[10px] font-body text-muted-foreground">{isRTL ? 'المجموع النهائي للمقاسات يحدد تلقائياً قيمة العقد الإجمالية' : 'The final measurements total automatically determines the contract total value'}</p>
                  <span className="font-heading font-bold text-sm text-accent ms-auto">{measurementsTotals.totalCost.toLocaleString()} {contract.currency_code}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[10px] font-body text-muted-foreground border-t border-accent/10 pt-2">
                  <span>{isRTL ? 'المبلغ قبل الضريبة:' : 'Before VAT:'} <strong className="text-foreground">{measurementsVat.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
                  <span>{isRTL ? `ضريبة ${vatRate}%:` : `VAT ${vatRate}%:`} <strong className="text-warning dark:text-warning">{measurementsVat.vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
                  <span>{isRTL ? 'الإجمالي شامل الضريبة:' : 'Total incl. VAT:'} <strong className="text-accent">{measurementsVat.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> {contract.currency_code}</span>
                </div>
              </div>
            )}

            {measurements && measurements.length > 0 ? (
              <div className="space-y-4">
                {floors.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <button onClick={() => setMeasurementFilter('all')} className={`text-[10px] px-3 py-1.5 rounded-lg font-body transition-all ${measurementFilter === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {isRTL ? 'الكل' : 'All'} ({measurements.length})
                    </button>
                    {floors.map(f => (
                      <button key={f} onClick={() => setMeasurementFilter(f)} className={`text-[10px] px-3 py-1.5 rounded-lg font-body transition-all ${measurementFilter === f ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        {f} ({measurementsByFloor[f].length})
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={Grid3X3} label={isRTL ? 'عدد القطع' : 'Pieces'} value={measurementsTotals.count} />
                  <StatCard icon={Ruler} label={isRTL ? 'إجمالي المساحة' : 'Total Area'} value={`${measurementsTotals.totalArea} م²`} />
                  <StatCard icon={Banknote} label={isRTL ? 'إجمالي التكلفة' : 'Total Cost'} value={measurementsTotals.totalCost.toLocaleString()} accent sub={contract.currency_code} />
                  <StatCard icon={CheckCircle2} label={isRTL ? 'المركّب' : 'Installed'} value={`${measurementsTotals.installed}/${measurementsTotals.count}`} />
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">#</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'القطعة' : 'Piece'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'الموقع' : 'Location'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'الدور' : 'Floor'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'الأبعاد' : 'Dimensions'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'المساحة م²' : 'Area m²'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'سعر/م²' : '$/m²'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'التكلفة' : 'Cost'}</th>
                          <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'الحالة' : 'Status'}</th>
                          {!isContractLocked && <th className="p-2.5 text-start font-heading font-semibold whitespace-nowrap">{isRTL ? 'إجراء' : 'Action'}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMeasurements.map(m => {
                          const mName = language === 'ar' ? m.name_ar : (m.name_en || m.name_ar);
                          const mLoc = language === 'ar' ? m.location_ar : (m.location_en || m.location_ar);
                          const sCfg = statusConfig[m.status] || statusConfig.draft;
                          const mAtts = attachmentsByMeasurement.get(m.id) || [];
                          const isExpanded = expandedMeasurementAttId === m.id;
                          const colCount = !isContractLocked ? 10 : 9;
                          return (
                          <React.Fragment key={m.id}>
                            <tr key={m.id} className="border-t border-border hover:bg-muted/20 transition-colors group">
                              <td className="p-2.5 font-heading font-bold text-accent" dir="ltr">{m.piece_number}</td>
                              <td className="p-2.5">
                                <p className="font-heading font-medium">{mName}</p>
                                {m.notes && <p className="text-[9px] text-muted-foreground font-body mt-0.5 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">{m.notes}</p>}
                              </td>
                              <td className="p-2.5 text-muted-foreground font-body">{mLoc || '-'}</td>
                              <td className="p-2.5"><Badge variant="outline" className="text-[9px]">{m.floor_label || '-'}</Badge></td>
                              <td className="p-2.5 font-heading font-semibold whitespace-nowrap" dir="ltr">{Number(m.length_mm)} × {Number(m.width_mm)}</td>
                              <td className="p-2.5 font-heading font-bold" dir="ltr">{Number(m.area_sqm).toFixed(3)}</td>
                              <td className="p-2.5 font-heading font-semibold" dir="ltr">{Number(m.unit_price).toLocaleString()}</td>
                              <td className="p-2.5 font-heading font-bold text-accent" dir="ltr">{Number(m.total_cost).toLocaleString()}</td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className={`${sCfg.bg} text-[9px]`}>{isRTL ? sCfg.label_ar : sCfg.label_en}</Badge>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedMeasurementAttId(isExpanded ? null : m.id)}
                                    title={isRTL ? 'مرفقات المقاس' : 'Measurement attachments'}
                                    className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[9px] font-body border transition-colors ${isExpanded ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'}`}
                                  >
                                    <Paperclip className="w-2.5 h-2.5" />
                                    <span className="tech-content">{mAtts.length}</span>
                                  </button>
                                </div>
                              </td>
                              {!isContractLocked && (
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditMeasurement(m)} title={isRTL ? 'تعديل' : 'Edit'} aria-label={isRTL ? 'تعديل القياس' : 'Edit measurement'}>
                                      <PenTool className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMeasurementMutation.mutate(m.id)} title={isRTL ? 'حذف' : 'Delete'} aria-label={isRTL ? 'حذف القياس' : 'Delete measurement'}>
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                            {isExpanded && id && user && (
                              <tr className="border-t border-border bg-muted/10">
                                <td colSpan={colCount} className="p-3">
                                  <MeasurementAttachmentsPanel
                                    contractId={id}
                                    measurementId={m.id}
                                    userId={user.id}
                                    isRTL={isRTL}
                                    locked={isContractLocked}
                                    attachments={mAtts}
                                    formatDate={formatDate}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30 font-heading font-bold text-xs">
                          <td colSpan={5} className="p-2.5">{isRTL ? 'المجموع الفرعي' : 'Subtotal'} ({measurementsTotals.count} {isRTL ? 'قطعة' : 'pcs'})</td>
                          <td className="p-2.5" dir="ltr">{measurementsTotals.totalArea.toFixed(3)}</td>
                          <td className="p-2.5"></td>
                          <td className="p-2.5" dir="ltr">{measurementsTotals.totalCost.toLocaleString()}</td>
                          <td className="p-2.5"></td>
                          {!isContractLocked && <td className="p-2.5"></td>}
                        </tr>
                        <tr className="border-t border-border bg-warning/50 dark:bg-warning/10 font-heading text-xs">
                          <td colSpan={5} className="p-2.5 flex items-center gap-1">
                            <Percent className="w-3 h-3 text-warning dark:text-warning" />
                            <span className="text-warning dark:text-warning">{isRTL ? `ضريبة القيمة المضافة (${vatRate}%)` : `VAT (${vatRate}%)`}</span>
                            {vatInclusive && <Badge className="bg-success text-success dark:bg-success/30 dark:text-success text-[8px] ms-1">{isRTL ? 'مشمولة' : 'Included'}</Badge>}
                          </td>
                          <td className="p-2.5" dir="ltr"></td>
                          <td className="p-2.5"></td>
                          <td className="p-2.5 text-warning dark:text-warning font-semibold" dir="ltr">
                            {measurementsVat.vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5"></td>
                          {!isContractLocked && <td className="p-2.5"></td>}
                        </tr>
                        <tr className="border-t border-border bg-accent/5 font-heading font-bold text-xs">
                          <td colSpan={5} className="p-2.5 text-accent">{isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total (incl. VAT)'}</td>
                          <td className="p-2.5" dir="ltr"></td>
                          <td className="p-2.5"></td>
                          <td className="p-2.5 text-accent text-sm" dir="ltr">
                            {measurementsVat.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5"></td>
                          {!isContractLocked && <td className="p-2.5"></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Ruler className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-body text-sm mb-2">{isRTL ? 'لا توجد مقاسات بعد' : 'No measurements yet'}</p>
                {!isContractLocked && <p className="text-[10px] text-muted-foreground">{isRTL ? 'أضف المقاسات لتحديد قيمة العقد النهائية' : 'Add measurements to determine the final contract value'}</p>}
              </div>
            )}
          </TabsContent>

          {/* ── Warranty ── */}
          <TabsContent value="warranty">
            {warranties && warranties.length > 0 ? (
              <div className="space-y-4">
                {warranties.map(w => {
                  const wTitle = language === 'ar' ? w.title_ar : (w.title_en || w.title_ar);
                  const wDesc = language === 'ar' ? w.description_ar : (w.description_en || w.description_ar);
                  const wCoverage = language === 'ar' ? w.coverage_ar : (w.coverage_en || w.coverage_ar);
                  const duration = getWarrantyDuration(w.start_date, w.end_date);
                  const remaining = getWarrantyRemaining(w.end_date);
                  const wProg = getWarrantyProgress(w.start_date, w.end_date);
                  const isExpired = new Date(w.end_date) < new Date();
                  const isActive = w.status === 'active' && !isExpired;
                  const relatedMaint = maintenanceReqs?.filter(r => r.warranty_id === w.id) || [];

                  return (
                    <div key={w.id} className="rounded-xl bg-card border border-border overflow-hidden">
                      <div className={`px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between ${isActive ? 'bg-success/50 dark:bg-success/10' : isExpired ? 'bg-destructive/30 dark:bg-destructive/10' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-success dark:bg-success/30' : 'bg-muted'}`}>
                            {isActive ? <ShieldCheck className="w-5 h-5 text-success dark:text-success" /> : <ShieldX className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-sm">{wTitle}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className="text-[9px]">{w.warranty_type === 'comprehensive' ? (isRTL ? 'شامل' : 'Comprehensive') : w.warranty_type}</Badge>
                              {w.ref_id && <span className="text-[9px] text-muted-foreground font-body" dir="ltr">#{w.ref_id}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${isActive ? 'bg-success text-success dark:bg-success/30 dark:text-success' : 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive'}`}>
                          {isExpired ? (isRTL ? 'منتهي' : 'Expired') : (isRTL ? 'ساري' : 'Active')}
                        </Badge>
                      </div>

                      <div className="p-4 sm:p-6 space-y-4">
                        {wDesc && <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed">{wDesc}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-muted/30 rounded-lg p-3 text-center"><Timer className="w-4 h-4 text-accent mx-auto mb-1" /><p className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المدة' : 'Duration'}</p><p className="font-heading font-bold text-xs">{duration}</p></div>
                          <div className="bg-muted/30 rounded-lg p-3 text-center"><Calendar className="w-4 h-4 text-accent mx-auto mb-1" /><p className="text-[10px] text-muted-foreground font-body">{isRTL ? 'الفترة' : 'Period'}</p><p className="font-heading font-bold text-xs">{formatDate(w.start_date)} — {formatDate(w.end_date)}</p></div>
                          <div className="bg-muted/30 rounded-lg p-3 text-center"><CircleDot className="w-4 h-4 text-accent mx-auto mb-1" /><p className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المتبقي' : 'Remaining'}</p><p className={`font-heading font-bold text-xs ${isExpired ? 'text-destructive' : ''}`}>{remaining}</p></div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المستهلك' : 'Used'}</span><span className="text-[10px] font-heading font-semibold">{wProg}%</span></div>
                          <Progress value={wProg} className="h-2" aria-label={isRTL ? `المستهلك من الضمان ${wProg}٪` : `Warranty used ${wProg}%`} />
                        </div>
                        {wCoverage && (
                          <div className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 mb-2"><ShieldCheck className="w-3.5 h-3.5 text-accent" /><span className="font-heading font-bold text-xs">{isRTL ? 'ما يشمله الضمان' : 'Coverage'}</span></div>
                            <p className="text-xs text-muted-foreground font-body whitespace-pre-wrap leading-relaxed">{wCoverage}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 mb-2"><Package className="w-3.5 h-3.5 text-accent" /><span className="font-heading font-bold text-xs">{isRTL ? 'المشمول' : 'Covered'}</span></div>
                            <ul className="text-[10px] text-muted-foreground font-body space-y-1 list-disc list-inside">
                              <li>{isRTL ? 'عيوب التصنيع والمواد الخام' : 'Manufacturing defects'}</li>
                              <li>{isRTL ? 'خلل في التركيب' : 'Installation defects'}</li>
                              <li>{isRTL ? 'الأجزاء الميكانيكية والمتحركة' : 'Mechanical parts'}</li>
                              <li>{isRTL ? 'الملحقات الأساسية' : 'Essential accessories'}</li>
                            </ul>
                          </div>
                          <div className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 mb-2"><CircleAlert className="w-3.5 h-3.5 text-destructive" /><span className="font-heading font-bold text-xs">{isRTL ? 'الاستثناءات' : 'Exclusions'}</span></div>
                            <ul className="text-[10px] text-muted-foreground font-body space-y-1 list-disc list-inside">
                              <li>{isRTL ? 'سوء الاستخدام' : 'Misuse'}</li>
                              <li>{isRTL ? 'الاستهلاك الطبيعي' : 'Normal wear'}</li>
                              <li>{isRTL ? 'تعديل غير معتمد' : 'Unauthorized mods'}</li>
                              <li>{isRTL ? 'أضرار خارجية' : 'External damage'}</li>
                            </ul>
                          </div>
                        </div>
                        {relatedMaint.length > 0 && (
                          <div className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 mb-2"><Wrench className="w-3.5 h-3.5 text-accent" /><span className="font-heading font-bold text-xs">{isRTL ? 'طلبات الصيانة المرتبطة' : 'Related Maintenance'} ({relatedMaint.length})</span></div>
                            <div className="space-y-1.5">
                              {relatedMaint.map(r => (
                                <button key={r.id} onClick={() => { setActiveTab('maintenance'); setExpandedMaint(r.id); }} className="w-full flex items-center justify-between text-start p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${(statusConfig[r.status]?.bg || 'bg-muted')} text-[8px]`}>{isRTL ? (statusConfig[r.status]?.label_ar || r.status) : (statusConfig[r.status]?.label_en || r.status)}</Badge>
                                    <span className="text-[10px] font-body">{language === 'ar' ? r.title_ar : (r.title_en || r.title_ar)}</span>
                                  </div>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground rtl:rotate-180" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12"><Shield className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" /><p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا يوجد ضمان' : 'No warranty'}</p></div>
            )}
          </TabsContent>

          {/* ── Maintenance ── */}
          <TabsContent value="maintenance">
            {isClient && (
              <div className="mb-4 sm:mb-6">
                {showMaintForm ? (
                  <div className="p-4 sm:p-6 rounded-xl bg-card border border-border space-y-3 sm:space-y-4">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-accent" />{isRTL ? 'طلب صيانة جديد' : 'New Maintenance Request'}</h3>
                    <Input placeholder={isRTL ? 'عنوان الطلب *' : 'Request title *'} value={maintTitle} onChange={e => setMaintTitle(e.target.value)} className="text-sm" />
                    <Textarea placeholder={isRTL ? 'وصف المشكلة بالتفصيل *' : 'Describe the issue *'} value={maintDesc} onChange={e => setMaintDesc(e.target.value)} rows={4} className="text-sm" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={maintPriority} onValueChange={setMaintPriority}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder={isRTL ? 'الأولوية' : 'Priority'} /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityConfig).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{isRTL ? v.label_ar : v.label_en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {warranties && warranties.length > 0 && (
                        <Select value={maintWarrantyId} onValueChange={setMaintWarrantyId}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder={isRTL ? 'ربط بالضمان (اختياري)' : 'Link to warranty (optional)'} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{isRTL ? 'بدون ضمان' : 'No warranty'}</SelectItem>
                            {warranties.map(w => (
                              <SelectItem key={w.id} value={w.id}>{language === 'ar' ? w.title_ar : (w.title_en || w.title_ar)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => submitMaintenance.mutate()} disabled={!maintTitle.trim() || submitMaintenance.isPending}><Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال الطلب' : 'Submit'}</Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowMaintForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowMaintForm(true)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'طلب صيانة جديد' : 'New Request'}</Button>
                )}
              </div>
            )}
            {maintenanceReqs && maintenanceReqs.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {maintenanceReqs.map(req => {
                  const rTitle = language === 'ar' ? req.title_ar : (req.title_en || req.title_ar);
                  const rDesc = language === 'ar' ? req.description_ar : (req.description_en || req.description_ar);
                  const rCfg = statusConfig[req.status] || statusConfig.draft;
                  const pCfg = priorityConfig[req.priority] || priorityConfig.medium;
                  const linkedWarranty = warranties?.find(w => w.id === req.warranty_id);
                  const isExp = expandedMaint === req.id;
                  return (
                    <div key={req.id} className={`rounded-xl bg-card border border-border overflow-hidden transition-all ${isExp ? 'ring-1 ring-accent/30' : ''}`}>
                      <button onClick={() => setExpandedMaint(isExp ? null : req.id)} className="w-full p-3 sm:p-5 text-start">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-muted-foreground font-body" dir="ltr">{req.request_number}</span>
                              {linkedWarranty && <Badge className="bg-success text-success dark:bg-success/30 dark:text-success text-[8px] gap-0.5"><Shield className="w-2.5 h-2.5" />{isRTL ? 'ضمان' : 'Warranty'}</Badge>}
                            </div>
                            <h4 className="font-heading font-semibold text-sm">{rTitle}</h4>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-body flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(req.created_at)}</span>
                              {req.scheduled_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(req.scheduled_date)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className={`${pCfg.bg} text-[9px]`}>{isRTL ? pCfg.label_ar : pCfg.label_en}</Badge>
                            <Badge className={`${rCfg.bg} text-[9px]`}>{isRTL ? rCfg.label_ar : rCfg.label_en}</Badge>
                            {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </button>
                      {isExp && (
                        <div className="px-3 sm:px-5 pb-4 pt-0 border-t border-border space-y-3">
                          {rDesc && <p className="text-xs text-muted-foreground font-body mt-3 leading-relaxed">{rDesc}</p>}
                          {req.resolution_notes && (
                            <div className="bg-success/50 dark:bg-success/10 rounded-lg p-3 border border-success/50 dark:border-success/30">
                              <p className="text-[10px] font-heading font-semibold text-success dark:text-success mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{isRTL ? 'ملاحظات الحل' : 'Resolution'}</p>
                              <p className="text-xs text-muted-foreground font-body leading-relaxed">{req.resolution_notes}</p>
                            </div>
                          )}
                          {req.completed_at && (
                            <div className="flex items-center gap-1.5 text-[10px] text-success dark:text-success font-body">
                              <CheckCircle2 className="w-3 h-3" />{isRTL ? 'تم الإنجاز:' : 'Completed:'} {formatDate(req.completed_at)}
                            </div>
                          )}
                          {linkedWarranty && (
                            <button onClick={() => { setActiveTab('warranty'); }} className="flex items-center gap-2 text-[10px] text-accent font-body hover:underline">
                              <Shield className="w-3 h-3" />{isRTL ? 'عرض الضمان المرتبط:' : 'View warranty:'} {language === 'ar' ? linkedWarranty.title_ar : (linkedWarranty.title_en || linkedWarranty.title_ar)}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12"><Wrench className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" /><p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا توجد طلبات صيانة' : 'No maintenance requests'}</p></div>
            )}
          </TabsContent>

          {/* ── Notes ── */}
          <TabsContent value="notes">
            <div className="mb-4">
              {showNoteForm ? (
                <div className="p-4 sm:p-5 rounded-xl bg-card border border-border space-y-3">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-accent" />{isRTL ? 'إضافة ملاحظة' : 'Add Note'}</h3>
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(noteTypeConfig).filter(([k]) => !['note', 'issue', 'delivery'].includes(k)).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{isRTL ? v.label_ar : v.label_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder={isRTL ? 'اكتب ملاحظتك...' : 'Write your note...'} value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={4} className="text-sm" />
                  <div className="flex gap-2">
                    <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => submitNote.mutate()} disabled={!noteContent.trim() || submitNote.isPending}><Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال' : 'Submit'}</Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowNoteForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowNoteForm(true)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة ملاحظة' : 'Add Note'}</Button>
              )}
            </div>
            {notes && notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map(n => {
                  const nCfg = noteTypeConfig[n.note_type] || noteTypeConfig.general;
                  const NIcon = nCfg.icon;
                  const isOwn = n.user_id === user?.id;
                  const authorName = n.user_id === contract?.client_id ? getProfileName(clientProfile) : n.user_id === contract?.provider_id ? (bizName || getProfileName(providerProfile)) : '';
                  return (
                    <div key={n.id} className={`p-3 sm:p-4 rounded-xl bg-card border ${nCfg.color} transition-all hover:shadow-sm`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center"><NIcon className="w-3 h-3 text-muted-foreground" /></div>
                          <Badge variant="outline" className="text-[9px]">{isRTL ? nCfg.label_ar : nCfg.label_en}</Badge>
                          <span className="text-[10px] text-muted-foreground font-body">{formatDate(n.created_at)}</span>
                          {authorName && <span className="text-[10px] text-accent font-body">— {authorName}</span>}
                        </div>
                        {isOwn && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteNote.mutate(n.id)} aria-label={isRTL ? 'حذف الملاحظة' : 'Delete note'} title={isRTL ? 'حذف الملاحظة' : 'Delete note'}>
                            <Trash2 className="w-3 h-3 text-destructive" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-body whitespace-pre-wrap leading-relaxed">{n.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12"><StickyNote className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" /><p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا توجد ملاحظات' : 'No notes'}</p></div>
            )}
          </TabsContent>

          {/* ── Attachments ── */}
          <TabsContent value="attachments">
            {id && user && (
              <ContractAttachmentsTab
                contractId={id}
                userId={user.id}
                language={language as 'ar' | 'en'}
                isRTL={isRTL}
                attachments={(attachments || []) as Parameters<typeof ContractAttachmentsTab>[0]['attachments']}
                milestones={(milestones || []) as Parameters<typeof ContractAttachmentsTab>[0]['milestones']}
                measurements={(measurements || []) as Parameters<typeof ContractAttachmentsTab>[0]['measurements']}
                payments={(installmentPayments || []) as Parameters<typeof ContractAttachmentsTab>[0]['payments']}
                formatDate={formatDate}
              />
            )}
          </TabsContent>

          {/* ── Amendments ── */}
          <TabsContent value="amendments">
            {(isProvider || isClient) && (
              <div className="mb-4">
                {isContractLocked && (
                  <p className="text-[11px] text-warning mb-2">
                    {isRTL
                      ? 'لا يمكن تعديل العقد مباشرة بعد الاعتماد. يمكنك تقديم طلب تعديل عبر ملحق.'
                      : 'Active contracts cannot be edited directly. Submit an amendment request instead.'}
                  </p>
                )}
                {showAmendmentForm ? (
                  <div className="p-4 rounded-xl bg-card border-2 border-dashed border-primary/30 space-y-3">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-accent" />{isRTL ? 'طلب تعديل على العقد' : 'Request Contract Amendment'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder={isRTL ? 'العنوان بالعربية *' : 'Title (Arabic) *'}
                        value={amForm.title_ar} dir="auto"
                        onChange={e => setAmForm(f => ({ ...f, title_ar: e.target.value }))}
                        maxLength={150} className="text-sm"
                      />
                      <Input
                        placeholder={isRTL ? 'العنوان بالإنجليزية (اختياري)' : 'Title (English, optional)'}
                        value={amForm.title_en} dir="auto"
                        onChange={e => setAmForm(f => ({ ...f, title_en: e.target.value }))}
                        maxLength={150} className="text-sm"
                      />
                      <Select value={amForm.amendment_type} onValueChange={v => setAmForm(f => ({ ...f, amendment_type: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scope_change">{isRTL ? 'تغيير نطاق العمل' : 'Scope change'}</SelectItem>
                          <SelectItem value="amount_change">{isRTL ? 'تغيير قيمة العقد' : 'Amount change'}</SelectItem>
                          <SelectItem value="date_change">{isRTL ? 'تغيير تاريخ الانتهاء' : 'End-date change'}</SelectItem>
                          <SelectItem value="measurement_change">{isRTL ? 'تغيير المقاسات' : 'Measurement change'}</SelectItem>
                          <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
                        </SelectContent>
                      </Select>
                      {amForm.amendment_type === 'amount_change' && (
                        <Input
                          type="number" min="0" step="0.01" inputMode="decimal" dir="ltr"
                          placeholder={isRTL ? 'المبلغ الجديد *' : 'New amount *'}
                          value={amForm.new_amount}
                          onChange={e => setAmForm(f => ({ ...f, new_amount: e.target.value }))}
                          className="text-sm tech-content"
                        />
                      )}
                      {amForm.amendment_type === 'date_change' && (
                        <Input
                          type="date" dir="ltr"
                          value={amForm.new_end_date}
                          onChange={e => setAmForm(f => ({ ...f, new_end_date: e.target.value }))}
                          className="text-sm tech-content"
                        />
                      )}
                    </div>
                    <Textarea
                      placeholder={isRTL ? 'وصف التعديل المطلوب *' : 'Describe the requested amendment *'}
                      value={amForm.description_ar} dir="auto"
                      onChange={e => setAmForm(f => ({ ...f, description_ar: e.target.value }))}
                      rows={3} maxLength={2000} className="text-sm"
                    />
                    <Textarea
                      placeholder={isRTL ? 'الوصف بالإنجليزية (اختياري)' : 'Description (English, optional)'}
                      value={amForm.description_en} dir="auto"
                      onChange={e => setAmForm(f => ({ ...f, description_en: e.target.value }))}
                      rows={2} maxLength={2000} className="text-sm"
                    />
                    <Textarea
                      placeholder={isRTL ? 'سبب التعديل *' : 'Reason for the amendment *'}
                      value={amForm.reason} dir="auto"
                      onChange={e => setAmForm(f => ({ ...f, reason: e.target.value }))}
                      rows={2} maxLength={1000} className="text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {isRTL ? 'سيتم إرسال الطلب للطرف الآخر للمراجعة. لن يتم تعديل العقد إلا بعد موافقة الطرفين.' : 'The other party will review this request. The contract is not changed until both parties approve.'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="hero" size="sm" className="gap-1.5 text-xs"
                        disabled={addAmendmentMutation.isPending}
                        onClick={() => addAmendmentMutation.mutate()}
                      >
                        <Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال طلب التعديل' : 'Submit amendment request'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAmendmentForm(false)}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowAmendmentForm(true)}>
                    <Plus className="w-3.5 h-3.5" />{isRTL ? 'طلب تعديل على العقد' : 'Request Amendment'}
                  </Button>
                )}
              </div>
            )}
            <AmendmentHistoryPanel
              amendments={amendments ?? []}
              currencyCode={contract.currency_code}
              isRTL={isRTL}
              isClient={isClient}
              isProvider={isProvider}
              isContractLocked={isContractLocked}
              currentUserId={user?.id ?? null}
              isAdmin={isAdmin}
              onApprove={(a) => approveAmendmentMutation.mutate(a)}
              approving={approveAmendmentMutation.isPending}
              onReject={(amId, reason) => rejectAmendmentMutation.mutate({ id: amId, reason })}
              rejecting={rejectAmendmentMutation.isPending}
              onCancel={(amId) => cancelAmendmentMutation.mutate(amId)}
              cancelling={cancelAmendmentMutation.isPending}
              onApply={(amId, scheduleAdjustedHint) => applyAmendmentMutation.mutate({ amId, scheduleAdjustedHint })}
              applying={applyAmendmentMutation.isPending}
              contract={contract}
              installmentPayments={installmentPayments ?? []}
            />
          </TabsContent>

          {/* ── PDF Export History (PDF-QA2) ── */}
          <TabsContent value="exports">
            <ContractPdfExportHistory contractId={contract.id} isRTL={isRTL} />
          </TabsContent>

          {/* ── PDF Analysis Log (PDF-AR4) ── */}
          <TabsContent value="pdf-analysis">
            <ContractPdfAnalysisLog contractId={contract.id} isRTL={isRTL} />
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
      {previewOpen && (
        <ContractPdfPreviewOverlay
          isRTL={isRTL}
          url={previewUrl}
          fileName={previewFileName}
          loading={previewLoading}
          error={previewError}
          onClose={handleClosePreview}
          onDownload={handleExportPDF}
          onRefresh={generatePreview}
        />
      )}
    </div>
  );
};

export default ContractDetail;

