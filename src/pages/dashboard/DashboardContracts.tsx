import React, { useState, useMemo, useCallback, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { useNavigate } from 'react-router-dom';
import {
  FileText, Eye, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
  Shield, DollarSign, Calendar, Users, ListChecks, StickyNote,
  Send, Phone, Mail, User, ChevronDown, ChevronUp, Activity,
  BookOpen, X, Layers, Hammer, Wrench, Home, Factory,
  Flame, TreePine, GlassWater, Grid3X3, PanelTop,
  Download, Search, Loader2, Copy, Sparkles, ArrowRight,
  Paperclip, TrendingUp, BarChart3, CreditCard, Receipt,
  CalendarDays, MapPin, Building2, Hash, Timer,
  CircleDot, Banknote, FileCheck, Share2,
  Ruler, ClipboardList, ShieldCheck, WrenchIcon,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { exportContractPDF, type ContractExportData } from '@/lib/contract-pdf-export';
import { FieldAiActions } from '@/components/blog/FieldAiActions';

/* ── Template Category Config ── */
const templateCategoryConfig: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
  aluminum_doors_windows: { ar: 'ألمنيوم أبواب وشبابيك', en: 'Aluminum Doors & Windows', icon: PanelTop, color: 'text-blue-600 bg-blue-500/10' },
  iron_doors_windows: { ar: 'حديد أبواب وشبابيك', en: 'Iron Doors & Windows', icon: Hammer, color: 'text-slate-600 bg-slate-500/10' },
  fire_doors: { ar: 'أبواب مقاومة للحريق', en: 'Fire-Rated Doors', icon: Flame, color: 'text-red-600 bg-red-500/10' },
  gates_structures: { ar: 'بوابات ومظلات وهناجر', en: 'Gates & Structures', icon: Factory, color: 'text-amber-600 bg-amber-500/10' },
  wood_doors: { ar: 'أبواب خشبية', en: 'Wood Doors', icon: TreePine, color: 'text-emerald-700 bg-emerald-500/10' },
  kitchens: { ar: 'مطابخ', en: 'Kitchens', icon: Grid3X3, color: 'text-violet-600 bg-violet-500/10' },
  facades: { ar: 'واجهات', en: 'Facades', icon: Home, color: 'text-cyan-600 bg-cyan-500/10' },
  wardrobes_closets: { ar: 'خزائن ودواليب', en: 'Wardrobes & Closets', icon: Layers, color: 'text-pink-600 bg-pink-500/10' },
  upvc: { ar: 'UPVC أبواب وشبابيك', en: 'UPVC Doors & Windows', icon: Wrench, color: 'text-teal-600 bg-teal-500/10' },
  glass_securit: { ar: 'زجاج وسيكوريت', en: 'Glass & Securit', icon: GlassWater, color: 'text-sky-600 bg-sky-500/10' },
};

/* ── Status Config ── */
const statusConfig: Record<string, { icon: React.ElementType; color: string; label_ar: string; label_en: string; ring: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground', label_ar: 'مسودة', label_en: 'Draft', ring: 'ring-muted-foreground/20' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'بانتظار الموافقة', label_en: 'Pending', ring: 'ring-amber-400/30' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'نشط', label_en: 'Active', ring: 'ring-emerald-400/30' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label_ar: 'مكتمل', label_en: 'Completed', ring: 'ring-blue-400/30' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label_ar: 'ملغي', label_en: 'Cancelled', ring: 'ring-red-400/30' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label_ar: 'متنازع', label_en: 'Disputed', ring: 'ring-orange-400/30' },
};

interface ContractForm {
  title_ar: string; title_en: string; description_ar: string; description_en: string;
  total_amount: string; currency_code: string; start_date: string; end_date: string;
  terms_ar: string; terms_en: string;
  supervisor_name: string; supervisor_phone: string; supervisor_email: string;
  client_email: string;
}

const emptyForm: ContractForm = {
  title_ar: '', title_en: '', description_ar: '', description_en: '',
  total_amount: '', currency_code: 'SAR', start_date: '', end_date: '',
  terms_ar: '', terms_en: '',
  supervisor_name: '', supervisor_phone: '', supervisor_email: '',
  client_email: '',
};

type ViewSection = 'list' | 'create' | 'templates' | 'template-preview';

/* ── Contract Health Score ── */
const getContractHealth = (contract: any, milestones: any[], payments: any[]) => {
  let score = 0;
  let max = 0;

  // Has dates
  max += 10;
  if (contract.start_date && contract.end_date) score += 10;

  // Has terms
  max += 10;
  if (contract.terms_ar) score += 10;

  // Has supervisor
  max += 10;
  if (contract.supervisor_name && contract.supervisor_phone) score += 10;

  // Both parties approved
  max += 20;
  if (contract.client_accepted_at) score += 10;
  if (contract.provider_accepted_at) score += 10;

  // Milestones progress
  max += 30;
  if (milestones.length > 0) {
    const completed = milestones.filter(m => m.status === 'completed').length;
    score += Math.round((completed / milestones.length) * 30);
  }

  // Payments progress
  max += 20;
  if (payments.length > 0) {
    const paid = payments.filter(p => p.status === 'paid').length;
    score += Math.round((paid / payments.length) * 20);
  }

  return Math.round((score / max) * 100);
};

/* ── Days Remaining ── */
const getDaysRemaining = (endDate: string | null) => {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

/* ── Contract Card ── */
const ContractCard = React.memo(({
  c, isRTL, user, milestones, notes, attachments, payments, profiles,
  onExpand, isExpanded, onNavigate, onExportPDF, onApprove, onSendForApproval, onDuplicate,
}: any) => {
  const cfg = statusConfig[c.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const clientP = profiles.find((p: any) => p.user_id === c.client_id);
  const providerP = profiles.find((p: any) => p.user_id === c.provider_id);
  const isProvider = user?.id === c.provider_id;
  const title = isRTL ? c.title_ar : (c.title_en || c.title_ar);
  const completedMs = milestones.filter((m: any) => m.status === 'completed').length;
  const totalMs = milestones.length;
  const progress = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;
  const canAccept = (user?.id === c.client_id && !c.client_accepted_at) || (user?.id === c.provider_id && !c.provider_accepted_at);
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const healthScore = getContractHealth(c, milestones, payments);
  const daysRemaining = getDaysRemaining(c.end_date);
  const paidPayments = payments.filter((p: any) => p.status === 'paid');
  const totalPaid = paidPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const paymentPercent = Number(c.total_amount) > 0 ? Math.round((totalPaid / Number(c.total_amount)) * 100) : 0;

  return (
    <Card className={`border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-accent/30 ${isExpanded ? 'ring-1 ' + cfg.ring : ''}`}>
      <CardContent className="p-0">
        {/* Top color strip */}
        <div className={`h-1 w-full ${c.status === 'active' ? 'bg-emerald-500' : c.status === 'completed' ? 'bg-blue-500' : c.status === 'pending_approval' ? 'bg-amber-500' : c.status === 'cancelled' ? 'bg-red-500' : c.status === 'disputed' ? 'bg-orange-500' : 'bg-muted-foreground/20'}`} />

        <div className="p-3 sm:p-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">{title}</h3>
                <Badge className={`${cfg.color} gap-0.5 text-[9px] sm:text-[10px] px-2 py-0.5`}>
                  <StatusIcon className="w-3 h-3" />
                  {isRTL ? cfg.label_ar : cfg.label_en}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-mono">{c.contract_number}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                  {isProvider ? (isRTL ? '🔧 مزود خدمة' : '🔧 Provider') : (isRTL ? '👤 عميل' : '👤 Client')}
                </Badge>
                {daysRemaining !== null && c.status === 'active' && (
                  <Badge variant={daysRemaining < 7 ? 'destructive' : daysRemaining < 30 ? 'secondary' : 'outline'} className="text-[9px] px-1.5 py-0 h-4 gap-0.5">
                    <Timer className="w-2.5 h-2.5" />
                    {daysRemaining > 0 ? (isRTL ? `${daysRemaining} يوم متبقي` : `${daysRemaining}d left`) : (isRTL ? 'منتهي' : 'Overdue')}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExportPDF(c)} title="PDF">
                <Download className="w-3.5 h-3.5" />
              </Button>
              {canAccept && c.status !== 'completed' && c.status !== 'cancelled' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => onApprove(c)}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              )}
              {c.status === 'draft' && user?.id === c.provider_id && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onSendForApproval(c)}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate(`/contracts/${c.id}`)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExpand(isExpanded ? null : c.id)}>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30">
              <DollarSign className="w-3.5 h-3.5 text-accent shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{isRTL ? 'المبلغ' : 'Amount'}</p>
                <p className="text-xs font-bold">{Number(c.total_amount).toLocaleString()} <span className="text-[8px] text-muted-foreground">{c.currency_code}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{isRTL ? 'المدة' : 'Duration'}</p>
                <p className="text-[10px] font-medium">{formatDate(c.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{isRTL ? 'المدفوع' : 'Paid'}</p>
                <p className="text-[10px] font-medium">{paymentPercent}% <span className="text-[8px] text-muted-foreground">({totalPaid.toLocaleString()})</span></p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground">{isRTL ? 'الصحة' : 'Health'}</p>
                <p className={`text-[10px] font-bold ${healthScore >= 70 ? 'text-emerald-600' : healthScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{healthScore}%</p>
              </div>
            </div>
          </div>

          {/* Parties Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-3">
              {[
                { label: isRTL ? 'العميل' : 'Client', p: clientP, isMe: user?.id === c.client_id },
                { label: isRTL ? 'المزود' : 'Provider', p: providerP, isMe: user?.id === c.provider_id },
              ].map(party => (
                <div key={party.label} className="flex items-center gap-1.5">
                  <Avatar className="w-6 h-6 ring-1 ring-border">
                    <AvatarImage src={party.p?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-accent/10 text-accent">{(party.p?.full_name || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-none">{party.label}</p>
                    <p className="text-[10px] font-medium leading-tight">{party.p?.full_name || '-'}
                      {party.isMe && <span className="text-accent ms-0.5 text-[8px]">({isRTL ? 'أنت' : 'You'})</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Quick badges */}
            <div className="flex items-center gap-1">
              {totalMs > 0 && <Badge variant="outline" className="text-[8px] gap-0.5 px-1 h-4"><ListChecks className="w-2.5 h-2.5" />{completedMs}/{totalMs}</Badge>}
              {notes.length > 0 && <Badge variant="outline" className="text-[8px] gap-0.5 px-1 h-4"><StickyNote className="w-2.5 h-2.5" />{notes.length}</Badge>}
              {attachments.length > 0 && <Badge variant="outline" className="text-[8px] gap-0.5 px-1 h-4"><Paperclip className="w-2.5 h-2.5" />{attachments.length}</Badge>}
            </div>
          </div>

          {/* Progress Bar */}
          {totalMs > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-[10px] font-semibold text-accent">{progress}%</span>
            </div>
          )}

          {/* Supervisor */}
          {(c.supervisor_name || c.supervisor_phone) && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/30 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{c.supervisor_name || '-'}</span>
              {c.supervisor_phone && <a href={`tel:${c.supervisor_phone}`} className="flex items-center gap-0.5 hover:text-accent transition-colors"><Phone className="w-2.5 h-2.5" />{c.supervisor_phone}</a>}
              {c.supervisor_email && <a href={`mailto:${c.supervisor_email}`} className="flex items-center gap-0.5 hover:text-accent transition-colors"><Mail className="w-2.5 h-2.5" />{c.supervisor_email}</a>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
ContractCard.displayName = 'ContractCard';

/* ──────────── Main ──────────── */
const DashboardContracts = () => {
  const { isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
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
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templatePreview, setTemplatePreview] = useState<any>(null);
  const [approveConfirm, setApproveConfirm] = useState<any>(null);
  const [sendConfirm, setSendConfirm] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [showAddMeasurement, setShowAddMeasurement] = useState<string | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState<string | null>(null);
  const [showAddAmendment, setShowAddAmendment] = useState<string | null>(null);
  const [measurementForm, setMeasurementForm] = useState({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title_ar: '', amount: '', due_date: '' });
  const [amendmentForm, setAmendmentForm] = useState({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);

  /* ── Data Queries ── */
  const { data: providerContracts = [], isLoading: loadingProvider } = useQuery({
    queryKey: ['dashboard-contracts', 'provider', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('provider_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: clientContracts = [], isLoading: loadingClient } = useQuery({
    queryKey: ['dashboard-contracts', 'client', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('client_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const isLoading = loadingProvider || loadingClient;

  const contracts = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    providerContracts.forEach((c: any) => { if (!seen.has(c.id)) { seen.add(c.id); result.push({ ...c, _role: 'provider' }); } });
    clientContracts.forEach((c: any) => { if (!seen.has(c.id)) { seen.add(c.id); result.push({ ...c, _role: 'client' }); } });
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [providerContracts, clientContracts]);

  const contractIds = useMemo(() => contracts.map((c: any) => c.id), [contracts]);

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['dashboard-milestones', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_milestones').select('*').in('contract_id', contractIds).order('sort_order');
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['dashboard-contract-notes', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_notes').select('*').in('contract_id', contractIds).order('created_at', { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allAttachments = [] } = useQuery({
    queryKey: ['dashboard-contract-attachments', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_attachments').select('*').in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ['dashboard-contract-payments', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data: plans } = await supabase.from('installment_plans').select('id, contract_id').in('contract_id', contractIds);
      if (!plans || plans.length === 0) return [];
      const planIds = plans.map(p => p.id);
      const { data: payments } = await supabase.from('installment_payments').select('*').in('plan_id', planIds);
      return (payments ?? []).map(p => ({ ...p, contract_id: plans.find(pl => pl.id === p.plan_id)?.contract_id }));
    },
    enabled: contractIds.length > 0,
  });

  const { data: allMeasurements = [] } = useQuery({
    queryKey: ['dashboard-contract-measurements', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_measurements').select('*').in('contract_id', contractIds);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allWarranties = [] } = useQuery({
    queryKey: ['dashboard-contract-warranties', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('warranties').select('*').in('contract_id', contractIds);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allMaintenanceRequests = [] } = useQuery({
    queryKey: ['dashboard-contract-maintenance', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('maintenance_requests').select('*').in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allAmendments = [] } = useQuery({
    queryKey: ['dashboard-contract-amendments', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase.from('contract_amendments').select('*').in('contract_id', contractIds).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['contract-profiles', contractIds],
    queryFn: async () => {
      const userIds = new Set<string>();
      contracts.forEach((c: any) => { userIds.add(c.client_id); userIds.add(c.provider_id); });
      if (userIds.size === 0) return [];
      const { data } = await supabase.from('profiles').select('user_id, full_name, avatar_url, phone, email').in('user_id', Array.from(userIds));
      return data ?? [];
    },
    enabled: contracts.length > 0,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('contract_templates').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: businessId } = useQuery({
    queryKey: ['my-business-id-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user!.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  /* ── Helper: isLocked ── */
  const isContractLocked = (c: any) => ['active', 'completed', 'cancelled'].includes(c.status);

  /* ── Mutations ── */
  const addNoteMutation = useMutation({
    mutationFn: async ({ contractId, content, noteType }: { contractId: string; content: string; noteType?: string }) => {
      const { error } = await supabase.from('contract_notes').insert({ contract_id: contractId, user_id: user!.id, content, note_type: noteType || 'note' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-contract-notes'] }); setNoteText(''); toast.success(isRTL ? 'تمت إضافة الملاحظة' : 'Note added'); },
  });

  const addMeasurementMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const area = (Number(measurementForm.length_mm) * Number(measurementForm.width_mm)) / 1000000;
      const totalCost = Number(measurementForm.unit_price) * Number(measurementForm.quantity);
      const { error } = await supabase.from('contract_measurements').insert({
        contract_id: contractId, name_ar: measurementForm.name_ar, piece_number: measurementForm.piece_number,
        floor_label: measurementForm.floor_label, location_ar: measurementForm.location_ar,
        length_mm: Number(measurementForm.length_mm), width_mm: Number(measurementForm.width_mm),
        quantity: Number(measurementForm.quantity), unit_price: Number(measurementForm.unit_price),
        area_sqm: area, total_cost: totalCost,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-measurements'] });
      setShowAddMeasurement(null);
      setMeasurementForm({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '' });
      toast.success(isRTL ? 'تمت إضافة المقاس' : 'Measurement added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const existing = allMilestones.filter(m => m.contract_id === contractId);
      const { error } = await supabase.from('contract_milestones').insert({
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
    onError: (err: any) => toast.error(err.message),
  });

  const addAmendmentMutation = useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      const { error } = await supabase.from('contract_amendments').insert({
        contract_id: contractId, requested_by: user!.id,
        title_ar: amendmentForm.title_ar, description_ar: amendmentForm.description_ar || null,
        amendment_type: amendmentForm.amendment_type,
        new_amount: amendmentForm.new_amount ? Number(amendmentForm.new_amount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-amendments'] });
      setShowAddAmendment(null);
      setAmendmentForm({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
      toast.success(isRTL ? 'تم إرسال طلب التعديل' : 'Amendment request sent');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveAmendmentMutation = useMutation({
    mutationFn: async ({ amendmentId, contract }: { amendmentId: string; contract: any }) => {
      const isClient = user?.id === contract.client_id;
      const field = isClient ? 'client_approved_at' : 'provider_approved_at';
      const update: any = { [field]: new Date().toISOString() };
      // Check if other party already approved
      const amendment = allAmendments.find((a: any) => a.id === amendmentId);
      const otherApproved = isClient ? amendment?.provider_approved_at : amendment?.client_approved_at;
      if (otherApproved) update.status = 'approved';
      const { error } = await supabase.from('contract_amendments').update(update).eq('id', amendmentId);
      if (error) throw error;
      // If both approved and has new_amount, update contract
      if (otherApproved && amendment?.new_amount) {
        await supabase.from('contracts').update({ total_amount: amendment.new_amount }).eq('id', contract.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-amendments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تمت الموافقة على التعديل' : 'Amendment approved');
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ contractId, file }: { contractId: string; file: File }) => {
      const ext = file.name.split('.').pop();
      const path = `${contractId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('contract-attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('contract-attachments').getPublicUrl(path);
      const fileType = file.type.startsWith('image/') ? 'image' : 'document';
      const { error } = await supabase.from('contract_attachments').insert({
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
    onError: (err: any) => toast.error(err.message),
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const { data: clientProfile, error: clientProfileError } = await supabase.from('profiles').select('user_id').eq('email', form.client_email.trim()).maybeSingle();
      if (clientProfileError) throw clientProfileError;
      if (!clientProfile) throw new Error(isRTL ? 'لم يتم العثور على العميل بهذا البريد الإلكتروني' : 'Client not found with this email');

      const payload: any = {
        provider_id: user!.id, client_id: clientProfile.user_id, business_id: businessId || null,
        title_ar: form.title_ar, title_en: form.title_en || null,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        total_amount: Number(form.total_amount), currency_code: form.currency_code,
        start_date: form.start_date || null, end_date: form.end_date || null,
        terms_ar: form.terms_ar || null, terms_en: form.terms_en || null,
        supervisor_name: form.supervisor_name || null, supervisor_phone: form.supervisor_phone || null,
        supervisor_email: form.supervisor_email || null, status: 'draft',
      };

      if (editingId) {
        const { error } = await supabase.from('contracts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contracts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setViewSection('list'); setForm(emptyForm); setEditingId(null);
      toast.success(editingId ? (isRTL ? 'تم تحديث العقد' : 'Contract updated') : (isRTL ? 'تم إنشاء العقد' : 'Contract created'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: async (contract: any) => {
      const isClient = user?.id === contract.client_id;
      const updateField = isClient ? 'client_accepted_at' : 'provider_accepted_at';
      const update: any = { [updateField]: new Date().toISOString() };
      const otherAccepted = isClient ? contract.provider_accepted_at : contract.client_accepted_at;
      if (otherAccepted) update.status = 'active';
      else if (contract.status === 'draft') update.status = 'pending_approval';
      const { error } = await supabase.from('contracts').update(update).eq('id', contract.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      setApproveConfirm(null);
      toast.success(isRTL ? 'تمت الموافقة على العقد' : 'Contract approved');
    },
  });

  const sendForApprovalMutation = useMutation({
    mutationFn: async (contract: any) => {
      const { error } = await supabase.from('contracts').update({ status: 'pending_approval' }).eq('id', contract.id);
      if (error) throw error;
      await supabase.from('notifications').insert({
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
  const stats = useMemo(() => {
    const src = roleFilter === 'provider' ? providerContracts : roleFilter === 'client' ? clientContracts : contracts;
    const totalAmount = src.reduce((s: number, c: any) => s + Number(c.total_amount), 0);
    const totalPaid = allPayments.filter((p: any) => p.status === 'paid' && src.some((c: any) => c.id === p.contract_id)).reduce((s: number, p: any) => s + Number(p.amount), 0);
    return {
      total: src.length,
      active: src.filter((c: any) => c.status === 'active').length,
      completed: src.filter((c: any) => c.status === 'completed').length,
      pendingApproval: src.filter((c: any) => c.status === 'pending_approval').length,
      draft: src.filter((c: any) => c.status === 'draft').length,
      cancelled: src.filter((c: any) => c.status === 'cancelled').length,
      totalAmount, totalPaid,
      asProvider: providerContracts.length,
      asClient: clientContracts.length,
      totalMilestones: allMilestones.length,
      completedMilestones: allMilestones.filter(m => m.status === 'completed').length,
      totalAttachments: allAttachments.length,
      totalMaintenance: allMaintenanceRequests.length,
    };
  }, [contracts, providerContracts, clientContracts, roleFilter, allPayments, allMilestones, allAttachments, allMaintenanceRequests]);

  const filtered = useMemo(() => {
    let result = roleFilter === 'provider' ? providerContracts.map((c: any) => ({ ...c, _role: 'provider' }))
      : roleFilter === 'client' ? clientContracts.map((c: any) => ({ ...c, _role: 'client' }))
        : contracts;
    if (statusFilter !== 'all') result = result.filter((c: any) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) => c.title_ar.toLowerCase().includes(q) || (c.title_en || '').toLowerCase().includes(q) || c.contract_number.toLowerCase().includes(q));
    }
    // Sort
    if (sortBy === 'amount') result = [...result].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
    else if (sortBy === 'status') result = [...result].sort((a, b) => a.status.localeCompare(b.status));
    // default date sort already applied
    return result;
  }, [contracts, providerContracts, clientContracts, roleFilter, statusFilter, searchQuery, sortBy]);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const handleExportPDF = useCallback(async (c: any) => {
    setIsExporting(true);
    try {
      const clientP = profiles.find((p: any) => p.user_id === c.client_id);
      const providerP = profiles.find((p: any) => p.user_id === c.provider_id);
      const ms = allMilestones.filter((m: any) => m.contract_id === c.id);
      const data: ContractExportData = {
        contractNumber: c.contract_number,
        title: isRTL ? c.title_ar : (c.title_en || c.title_ar),
        description: isRTL ? c.description_ar : (c.description_en || c.description_ar),
        totalAmount: Number(c.total_amount), currency: c.currency_code,
        startDate: c.start_date ? formatDate(c.start_date) : undefined,
        endDate: c.end_date ? formatDate(c.end_date) : undefined,
        clientName: clientP?.full_name || '-', providerName: providerP?.full_name || '-',
        supervisorName: c.supervisor_name || undefined,
        supervisorPhone: c.supervisor_phone || undefined,
        supervisorEmail: c.supervisor_email || undefined,
        terms: isRTL ? c.terms_ar : (c.terms_en || c.terms_ar),
        milestones: ms.map((m: any) => ({
          title: isRTL ? m.title_ar : (m.title_en || m.title_ar),
          amount: Number(m.amount),
          dueDate: m.due_date ? formatDate(m.due_date) : undefined,
          status: m.status,
        })),
        isRTL,
      };
      await exportContractPDF(data);
      toast.success(isRTL ? 'تم تصدير العقد بنجاح' : 'Contract exported');
    } catch {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    } finally { setIsExporting(false); }
  }, [profiles, allMilestones, isRTL, formatDate]);

  const handleDuplicate = useCallback(async (c: any) => {
    try {
      const { error } = await supabase.from('contracts').insert({
        provider_id: c.provider_id, client_id: c.client_id, business_id: c.business_id,
        title_ar: `${c.title_ar} (نسخة)`, title_en: c.title_en ? `${c.title_en} (Copy)` : null,
        description_ar: c.description_ar, description_en: c.description_en,
        total_amount: c.total_amount, currency_code: c.currency_code,
        start_date: null, end_date: null,
        terms_ar: c.terms_ar, terms_en: c.terms_en,
        supervisor_name: c.supervisor_name, supervisor_phone: c.supervisor_phone, supervisor_email: c.supervisor_email,
        status: 'draft',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      toast.success(isRTL ? 'تم نسخ العقد بنجاح' : 'Contract duplicated');
    } catch {
      toast.error(isRTL ? 'فشل النسخ' : 'Duplication failed');
    }
  }, [queryClient, isRTL]);

  const applyTemplate = useCallback((tmpl: any) => {
    setForm(f => ({
      ...f,
      terms_ar: [tmpl.terms_ar, tmpl.scope_of_work_ar, tmpl.warranty_terms_ar, tmpl.payment_terms_ar, tmpl.penalties_ar, tmpl.notes_ar].filter(Boolean).join('\n\n'),
      terms_en: [tmpl.terms_en, tmpl.scope_of_work_en, tmpl.warranty_terms_en, tmpl.payment_terms_en, tmpl.penalties_en, tmpl.notes_en].filter(Boolean).join('\n\n'),
    }));
    setSelectedTemplate(tmpl);
    setViewSection('create');
    toast.success(isRTL ? 'تم تطبيق القالب' : 'Template applied');
  }, [isRTL]);

  const openEditContract = useCallback((c: any) => {
    setEditingId(c.id);
    setForm({
      title_ar: c.title_ar, title_en: c.title_en || '', description_ar: c.description_ar || '',
      description_en: c.description_en || '', total_amount: c.total_amount?.toString() || '',
      currency_code: c.currency_code || 'SAR', start_date: c.start_date || '', end_date: c.end_date || '',
      terms_ar: c.terms_ar || '', terms_en: c.terms_en || '',
      supervisor_name: c.supervisor_name || '', supervisor_phone: c.supervisor_phone || '',
      supervisor_email: c.supervisor_email || '', client_email: '',
    });
    setViewSection('create');
  }, []);

  const closeForm = useCallback(() => {
    setViewSection('list'); setForm(emptyForm); setEditingId(null); setSelectedTemplate(null); setTemplatePreview(null);
  }, []);

  const handleShareContract = useCallback(async (c: any) => {
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
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'إدارة العقود' : 'Contract Management'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? 'إنشاء ومتابعة وتصدير العقود الاحترافية' : 'Create, track, and export professional contracts'}</p>
          </div>
          {viewSection === 'list' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setViewSection('templates')}>
                <BookOpen className="w-3.5 h-3.5" />
                {isRTL ? 'قوالب' : 'Templates'}
                {templates.length > 0 && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">{templates.length}</Badge>}
              </Button>
              <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => { closeForm(); setViewSection('create'); }}>
                <Plus className="w-3.5 h-3.5" />
                {isRTL ? 'عقد جديد' : 'New Contract'}
              </Button>
            </div>
          )}
          {viewSection !== 'list' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={closeForm}>
              <X className="w-3.5 h-3.5" />{isRTL ? 'رجوع' : 'Back'}
            </Button>
          )}
        </div>

        {/* ── Enhanced Stats ── */}
        {viewSection === 'list' && (
          <div className="space-y-3">
            {/* Primary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: FileText, label: isRTL ? 'إجمالي العقود' : 'Total Contracts', value: stats.total, color: 'text-primary bg-primary/10' },
                { icon: Activity, label: isRTL ? 'عقود نشطة' : 'Active', value: stats.active, color: 'text-emerald-600 bg-emerald-500/10' },
                { icon: DollarSign, label: isRTL ? 'إجمالي المبالغ' : 'Total Value', value: `${stats.totalAmount.toLocaleString()}`, color: 'text-accent bg-accent/10', sub: 'SAR' },
                { icon: Banknote, label: isRTL ? 'المحصّل' : 'Collected', value: `${stats.totalPaid.toLocaleString()}`, color: 'text-emerald-600 bg-emerald-500/10', sub: 'SAR' },
              ].map((s, i) => (
                <Card key={i} className="border-border/40 bg-card/50">
                  <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                    <div>
                      <p className="text-lg sm:text-xl font-bold">{s.value}{s.sub && <span className="text-[9px] text-muted-foreground ms-1">{s.sub}</span>}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Secondary Stats Bar */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
              {[
                { icon: CheckCircle2, label: isRTL ? 'مكتملة' : 'Completed', value: stats.completed, color: 'text-blue-600' },
                { icon: Clock, label: isRTL ? 'بانتظار' : 'Pending', value: stats.pendingApproval, color: 'text-amber-600' },
                { icon: FileText, label: isRTL ? 'مسودات' : 'Drafts', value: stats.draft, color: 'text-muted-foreground' },
                { icon: XCircle, label: isRTL ? 'ملغية' : 'Cancelled', value: stats.cancelled, color: 'text-red-600' },
                { icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', value: `${stats.completedMilestones}/${stats.totalMilestones}`, color: 'text-violet-600' },
                { icon: Paperclip, label: isRTL ? 'مرفقات' : 'Attachments', value: stats.totalAttachments, color: 'text-sky-600' },
                { icon: WrenchIcon, label: isRTL ? 'صيانة' : 'Maintenance', value: stats.totalMaintenance, color: 'text-orange-600' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px]">
                  <s.icon className={`w-3 h-3 ${s.color}`} />
                  <span className="text-muted-foreground">{s.label}:</span>
                  <span className="font-semibold">{s.value}</span>
                  {i < 6 && <span className="text-border mx-0.5">|</span>}
                </div>
              ))}
            </div>

            {/* Collection Progress */}
            {stats.totalAmount > 0 && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/5 border border-accent/10">
                <TrendingUp className="w-4 h-4 text-accent shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium">{isRTL ? 'نسبة التحصيل' : 'Collection Rate'}</span>
                    <span className="text-xs font-bold text-accent">{Math.round((stats.totalPaid / stats.totalAmount) * 100)}%</span>
                  </div>
                  <Progress value={(stats.totalPaid / stats.totalAmount) * 100} className="h-1.5" />
                </div>
                <div className="text-[9px] text-muted-foreground text-end shrink-0">
                  <p>{stats.totalPaid.toLocaleString()} / {stats.totalAmount.toLocaleString()}</p>
                  <p>{isRTL ? 'ريال سعودي' : 'SAR'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Templates Browser ═══ */}
        {viewSection === 'templates' && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {isRTL ? 'قوالب العقود الاحترافية' : 'Professional Contract Templates'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tmpl: any) => {
                  const cfg = templateCategoryConfig[tmpl.category];
                  const Icon = cfg?.icon || FileText;
                  return (
                    <Card key={tmpl.id} className="border-border/40 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group" onClick={() => { setTemplatePreview(tmpl); setViewSection('template-preview'); }}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg?.color || 'bg-muted text-muted-foreground'}`}><Icon className="w-4 h-4" /></div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading font-semibold text-xs truncate group-hover:text-primary transition-colors">{isRTL ? tmpl.name_ar : (tmpl.name_en || tmpl.name_ar)}</h4>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{cfg?.[isRTL ? 'ar' : 'en'] || tmpl.category}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[tmpl.scope_of_work_ar && (isRTL ? 'نطاق' : 'Scope'), tmpl.warranty_terms_ar && (isRTL ? 'ضمان' : 'Warranty'), tmpl.payment_terms_ar && (isRTL ? 'دفع' : 'Payment')].filter(Boolean).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[7px] px-1 py-0 h-3.5">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {templates.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{isRTL ? 'لا توجد قوالب متاحة' : 'No templates available'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ Template Preview ═══ */}
        {viewSection === 'template-preview' && templatePreview && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {(() => { const cfg = templateCategoryConfig[templatePreview.category]; const Icon = cfg?.icon || FileText; return <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg?.color || 'bg-muted'}`}><Icon className="w-4 h-4" /></div>; })()}
                  <div>
                    <CardTitle className="text-sm">{isRTL ? templatePreview.name_ar : (templatePreview.name_en || templatePreview.name_ar)}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{templateCategoryConfig[templatePreview.category]?.[isRTL ? 'ar' : 'en']}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewSection('templates')} className="gap-1 text-xs">
                  <ArrowRight className="w-3 h-3" />{isRTL ? 'رجوع' : 'Back'}
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
                <div key={section.key} className="p-3 rounded-lg border border-border/40 bg-muted/20">
                  <h4 className="font-semibold text-xs mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3 text-primary" />{section.label}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
              <Button variant="hero" className="w-full gap-1.5" onClick={() => applyTemplate(templatePreview)}>
                <CheckCircle2 className="w-4 h-4" />{isRTL ? 'استخدام هذا القالب وإنشاء عقد' : 'Use Template & Create Contract'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ Create/Edit Form ═══ */}
        {viewSection === 'create' && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <FileText className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                {editingId ? (isRTL ? 'تعديل العقد' : 'Edit Contract') : (isRTL ? 'إنشاء عقد جديد' : 'Create New Contract')}
                {selectedTemplate && <Badge variant="secondary" className="text-[9px] gap-0.5"><Sparkles className="w-2.5 h-2.5" />{isRTL ? 'من قالب' : 'From template'}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Email */}
              {!editingId && (
                <div className="p-3 rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-accent" />{isRTL ? 'بريد العميل' : 'Client Email'} <span className="text-destructive">*</span></Label>
                  <Input type="email" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} placeholder={isRTL ? 'client@email.com' : 'client@email.com'} dir="ltr" className="h-9" />
                  <p className="text-[9px] text-muted-foreground">{isRTL ? 'أدخل البريد الإلكتروني المسجل للعميل' : 'Enter the registered email of the client'}</p>
                </div>
              )}

              {/* Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'عنوان العقد (عربي)' : 'Title (Arabic)'} <span className="text-destructive">*</span></Label>
                    <FieldAiActions value={form.title_ar} lang="ar" compact fieldType="title" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, title_en: v }))} onImproved={v => setForm(f => ({ ...f, title_ar: v }))} />
                  </div>
                  <Input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'عنوان العقد (إنجليزي)' : 'Title (English)'}</Label>
                    <FieldAiActions value={form.title_en} lang="en" compact fieldType="title" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, title_ar: v }))} onImproved={v => setForm(f => ({ ...f, title_en: v }))} />
                  </div>
                  <Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} dir="ltr" className="h-9" />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                    <FieldAiActions value={form.description_ar} lang="ar" compact fieldType="description" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, description_en: v }))} onImproved={v => setForm(f => ({ ...f, description_ar: v }))} />
                  </div>
                  <Textarea value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                    <FieldAiActions value={form.description_en} lang="en" compact fieldType="description" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, description_ar: v }))} onImproved={v => setForm(f => ({ ...f, description_en: v }))} />
                  </div>
                  <Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={3} dir="ltr" />
                </div>
              </div>

              {/* Financial */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/30 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" />{isRTL ? 'المالية والتواريخ' : 'Financial & Dates'}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'إجمالي المبلغ' : 'Total Amount'} <span className="text-destructive">*</span></Label>
                    <Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} dir="ltr" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'العملة' : 'Currency'}</Label>
                    <Select value={form.currency_code} onValueChange={v => setForm({ ...form, currency_code: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['SAR', 'USD', 'EUR', 'AED'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'البداية' : 'Start'}</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} dir="ltr" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'النهاية' : 'End'}</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} dir="ltr" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Supervisor */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/30 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" />{isRTL ? 'المسؤول المتابع' : 'Supervisor'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-[10px]">{isRTL ? 'الاسم' : 'Name'}</Label><Input value={form.supervisor_name} onChange={e => setForm({ ...form, supervisor_name: e.target.value })} className="h-9" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px]">{isRTL ? 'الهاتف' : 'Phone'}</Label><Input value={form.supervisor_phone} onChange={e => setForm({ ...form, supervisor_phone: e.target.value })} dir="ltr" className="h-9" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px]">{isRTL ? 'البريد' : 'Email'}</Label><Input type="email" value={form.supervisor_email} onChange={e => setForm({ ...form, supervisor_email: e.target.value })} dir="ltr" className="h-9" /></div>
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الشروط (عربي)' : 'Terms (Arabic)'}</Label>
                    <FieldAiActions value={form.terms_ar} lang="ar" compact fieldType="description" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, terms_en: v }))} onImproved={v => setForm(f => ({ ...f, terms_ar: v }))} />
                  </div>
                  <Textarea value={form.terms_ar} onChange={e => setForm({ ...form, terms_ar: e.target.value })} rows={5} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الشروط (إنجليزي)' : 'Terms (English)'}</Label>
                    <FieldAiActions value={form.terms_en} lang="en" compact fieldType="description" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, terms_ar: v }))} onImproved={v => setForm(f => ({ ...f, terms_en: v }))} />
                  </div>
                  <Textarea value={form.terms_en} onChange={e => setForm({ ...form, terms_en: e.target.value })} rows={5} dir="ltr" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button onClick={() => createContractMutation.mutate()} disabled={!form.title_ar || !form.total_amount || (!editingId && !form.client_email) || createContractMutation.isPending} variant="hero" className="flex-1">
                  {createContractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                  {createContractMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : editingId ? (isRTL ? 'تحديث العقد' : 'Update') : (isRTL ? 'إنشاء العقد' : 'Create Contract')}
                </Button>
                <Button variant="outline" onClick={closeForm}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Contracts List ═══ */}
        {viewSection === 'list' && (
          <>
            {/* Role Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 dark:bg-muted/30 rounded-xl w-fit">
              {[
                { key: 'all' as const, label: isRTL ? 'جميع العقود' : 'All', icon: FileText, count: contracts.length },
                { key: 'provider' as const, label: isRTL ? 'كمزود خدمة' : 'As Provider', icon: Wrench, count: stats.asProvider },
                { key: 'client' as const, label: isRTL ? 'كعميل' : 'As Client', icon: User, count: stats.asClient },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { startTransition(() => { setRoleFilter(tab.key); setStatusFilter('all'); }); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${roleFilter === tab.key ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                  <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">{tab.count}</Badge>
                </button>
              ))}
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: isRTL ? 'الكل' : 'All', count: stats.total },
                  { key: 'active', label: isRTL ? 'نشط' : 'Active', count: stats.active },
                  { key: 'pending_approval', label: isRTL ? 'بانتظار' : 'Pending', count: stats.pendingApproval },
                  { key: 'completed', label: isRTL ? 'مكتمل' : 'Done', count: stats.completed },
                  { key: 'draft', label: isRTL ? 'مسودة' : 'Draft', count: stats.draft },
                ].map(f => (
                  <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm" className="text-[10px] gap-0.5 h-7 px-2" onClick={() => startTransition(() => setStatusFilter(f.key))}>
                    {f.label}<Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 ms-0.5">{f.count}</Badge>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-7 text-[10px] w-24 px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date" className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</SelectItem>
                    <SelectItem value="amount" className="text-xs">{isRTL ? 'المبلغ' : 'Amount'}</SelectItem>
                    <SelectItem value="status" className="text-xs">{isRTL ? 'الحالة' : 'Status'}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative sm:max-w-xs w-full">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => startTransition(() => setSearchQuery(e.target.value))} className="ps-8 h-8 text-xs" />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3"><FileText className="w-7 h-7 text-primary" /></div>
                  <h3 className="text-base font-semibold mb-1">{isRTL ? 'لا توجد عقود' : 'No contracts'}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{isRTL ? 'أنشئ أول عقد الآن' : 'Create your first contract'}</p>
                  <Button variant="hero" size="sm" onClick={() => setViewSection('create')}><Plus className="w-4 h-4 me-2" />{isRTL ? 'عقد جديد' : 'New Contract'}</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((c: any) => {
                  const milestones = allMilestones.filter((m: any) => m.contract_id === c.id);
                  const notes = allNotes.filter((n: any) => n.contract_id === c.id);
                  const attachments = allAttachments.filter((a: any) => a.contract_id === c.id);
                  const payments = allPayments.filter((p: any) => p.contract_id === c.id);
                  const measurements = allMeasurements.filter((m: any) => m.contract_id === c.id);
                  const warranties = allWarranties.filter((w: any) => w.contract_id === c.id);
                  const maintenance = allMaintenanceRequests.filter((r: any) => r.contract_id === c.id);
                  const amendments = allAmendments.filter((a: any) => a.contract_id === c.id);
                  const isExpanded = expandedId === c.id;
                  const locked = isContractLocked(c);
                  const isProvider = user?.id === c.provider_id;

                  return (
                    <div key={c.id}>
                      <ContractCard
                        c={c} isRTL={isRTL} user={user} milestones={milestones} notes={notes}
                        attachments={attachments} payments={payments} profiles={profiles}
                        isExpanded={isExpanded} onExpand={setExpandedId} onNavigate={navigate}
                        onExportPDF={handleExportPDF}
                        onApprove={(contract: any) => setApproveConfirm(contract)}
                        onSendForApproval={(contract: any) => setSendConfirm(contract)}
                        onDuplicate={handleDuplicate}
                      />

                      {/* ── Expanded Detail Panel ── */}
                      {isExpanded && (
                        <Card className="border-t-0 rounded-t-none border-border/40 bg-muted/10">
                          <CardContent className="p-3 sm:p-4">
                            {/* Lock Banner */}
                            {locked && (
                              <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-300">
                                <Shield className="w-4 h-4 shrink-0" />
                                <p className="text-[10px]">{isRTL ? 'العقد معتمد - التعديل يتطلب ملحق عقد وموافقة الطرفين' : 'Contract is approved - changes require an amendment with both parties\' approval'}</p>
                              </div>
                            )}

                            <Tabs defaultValue="milestones">
                              <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-0.5 h-auto flex-wrap gap-0.5 mb-3">
                                <TabsTrigger value="milestones" className="text-[10px] px-2.5 py-1 gap-0.5"><ListChecks className="w-3 h-3" />{isRTL ? 'المراحل' : 'Milestones'} ({milestones.length})</TabsTrigger>
                                <TabsTrigger value="payments" className="text-[10px] px-2.5 py-1 gap-0.5"><CreditCard className="w-3 h-3" />{isRTL ? 'الدفعات' : 'Payments'} ({payments.length})</TabsTrigger>
                                <TabsTrigger value="measurements" className="text-[10px] px-2.5 py-1 gap-0.5"><Ruler className="w-3 h-3" />{isRTL ? 'المقاسات' : 'Sizes'} ({measurements.length})</TabsTrigger>
                                <TabsTrigger value="warranty" className="text-[10px] px-2.5 py-1 gap-0.5"><ShieldCheck className="w-3 h-3" />{isRTL ? 'الضمان' : 'Warranty'} ({warranties.length})</TabsTrigger>
                                <TabsTrigger value="maintenance" className="text-[10px] px-2.5 py-1 gap-0.5"><WrenchIcon className="w-3 h-3" />{isRTL ? 'صيانة' : 'Maint.'} ({maintenance.length})</TabsTrigger>
                                <TabsTrigger value="notes" className="text-[10px] px-2.5 py-1 gap-0.5"><StickyNote className="w-3 h-3" />{isRTL ? 'ملاحظات' : 'Notes'} ({notes.length})</TabsTrigger>
                                <TabsTrigger value="attachments" className="text-[10px] px-2.5 py-1 gap-0.5"><Paperclip className="w-3 h-3" />{isRTL ? 'مرفقات' : 'Files'} ({attachments.length})</TabsTrigger>
                                <TabsTrigger value="amendments" className="text-[10px] px-2.5 py-1 gap-0.5"><FileText className="w-3 h-3" />{isRTL ? 'ملاحق' : 'Amendments'} ({amendments.length})</TabsTrigger>
                                <TabsTrigger value="actions" className="text-[10px] px-2.5 py-1 gap-0.5"><Activity className="w-3 h-3" />{isRTL ? 'إجراءات' : 'Actions'}</TabsTrigger>
                              </TabsList>

                              {/* ═══ Milestones Tab ═══ */}
                              <TabsContent value="milestones" className="mt-0">
                                {!locked && isProvider && (
                                  <div className="mb-3">
                                    {showAddMilestone === c.id ? (
                                      <div className="p-3 rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 space-y-2">
                                        <h4 className="text-[11px] font-semibold">{isRTL ? 'إضافة مرحلة جديدة' : 'Add Milestone'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                          <Input placeholder={isRTL ? 'اسم المرحلة' : 'Title'} value={milestoneForm.title_ar} onChange={e => setMilestoneForm(f => ({ ...f, title_ar: e.target.value }))} className="h-8 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'المبلغ' : 'Amount'} value={milestoneForm.amount} onChange={e => setMilestoneForm(f => ({ ...f, amount: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                          <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-[10px] gap-1" disabled={!milestoneForm.title_ar || !milestoneForm.amount || addMilestoneMutation.isPending} onClick={() => addMilestoneMutation.mutate({ contractId: c.id })}>
                                            <Plus className="w-3 h-3" />{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowAddMilestone(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowAddMilestone(c.id)}>
                                        <Plus className="w-3 h-3" />{isRTL ? 'إضافة مرحلة' : 'Add Milestone'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {milestones.length > 0 ? (
                                  <div className="relative">
                                    <div className={`absolute top-0 bottom-0 ${isRTL ? 'right-3' : 'left-3'} w-0.5 bg-border/50`} />
                                    <div className="space-y-2">
                                      {milestones.map((m: any, idx: number) => {
                                        const mTitle = isRTL ? m.title_ar : (m.title_en || m.title_ar);
                                        const isCompleted = m.status === 'completed';
                                        const isInProgress = m.status === 'in_progress';
                                        return (
                                          <div key={m.id} className={`relative ${isRTL ? 'pr-8' : 'pl-8'}`}>
                                            <div className={`absolute top-1.5 ${isRTL ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${isCompleted ? 'bg-emerald-500 text-white' : isInProgress ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' : 'bg-muted text-muted-foreground border border-border'}`}>
                                              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                                            </div>
                                            <div className={`p-2.5 rounded-lg border ${isCompleted ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-800/20 dark:bg-emerald-950/10' : 'border-border/40 bg-card'}`}>
                                              <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-semibold text-[11px]">{mTitle}</h4>
                                                <Badge variant="outline" className="text-[8px] shrink-0">{isCompleted ? (isRTL ? 'مكتمل' : 'Done') : isInProgress ? (isRTL ? 'جاري' : 'Progress') : (isRTL ? 'قادم' : 'Pending')}</Badge>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                                                <span><DollarSign className="w-2.5 h-2.5 inline" />{Number(m.amount).toLocaleString()} {c.currency_code}</span>
                                                {m.due_date && <span><Calendar className="w-2.5 h-2.5 inline" />{formatDate(m.due_date)}</span>}
                                                {m.completed_at && <span className="text-emerald-600"><CheckCircle2 className="w-2.5 h-2.5 inline" />{formatDate(m.completed_at)}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد مراحل' : 'No milestones'}</p>}
                              </TabsContent>

                              {/* ═══ Payments Tab ═══ */}
                              <TabsContent value="payments" className="mt-0">
                                {payments.length > 0 ? (
                                  <div className="space-y-2">
                                    {payments.sort((a: any, b: any) => a.installment_number - b.installment_number).map((p: any) => (
                                      <div key={p.id} className={`p-2.5 rounded-lg border ${p.status === 'paid' ? 'border-emerald-200/50 bg-emerald-50/20 dark:border-emerald-800/20 dark:bg-emerald-950/10' : p.status === 'overdue' ? 'border-red-200/50 bg-red-50/20 dark:border-red-800/20' : 'border-border/40 bg-card'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${p.status === 'paid' ? 'bg-emerald-500 text-white' : p.status === 'overdue' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                              {p.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : p.installment_number}
                                            </div>
                                            <div>
                                              <p className="text-[11px] font-semibold">{isRTL ? `الدفعة ${p.installment_number}` : `Payment #${p.installment_number}`}</p>
                                              <p className="text-[9px] text-muted-foreground">{isRTL ? 'استحقاق:' : 'Due:'} {formatDate(p.due_date)}</p>
                                            </div>
                                          </div>
                                          <div className="text-end">
                                            <p className="text-xs font-bold">{Number(p.amount).toLocaleString()} {c.currency_code}</p>
                                            <Badge variant={p.status === 'paid' ? 'default' : p.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[8px]">
                                              {p.status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : p.status === 'overdue' ? (isRTL ? 'متأخر' : 'Overdue') : (isRTL ? 'معلق' : 'Pending')}
                                            </Badge>
                                          </div>
                                        </div>
                                        {p.payment_method && <p className="text-[9px] text-muted-foreground mt-1">{isRTL ? 'طريقة الدفع:' : 'Method:'} {p.payment_method}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد دفعات' : 'No payments'}</p>}
                              </TabsContent>

                              {/* ═══ Measurements Tab ═══ */}
                              <TabsContent value="measurements" className="mt-0">
                                {!locked && isProvider && (
                                  <div className="mb-3">
                                    {showAddMeasurement === c.id ? (
                                      <div className="p-3 rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 space-y-2">
                                        <h4 className="text-[11px] font-semibold">{isRTL ? 'إضافة قطعة مقاس جديدة' : 'Add Measurement'}</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                          <Input placeholder={isRTL ? 'اسم القطعة' : 'Name'} value={measurementForm.name_ar} onChange={e => setMeasurementForm(f => ({ ...f, name_ar: e.target.value }))} className="h-8 text-xs" />
                                          <Input placeholder={isRTL ? 'رقم القطعة (W-GF-001)' : 'Piece # (W-GF-001)'} value={measurementForm.piece_number} onChange={e => setMeasurementForm(f => ({ ...f, piece_number: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                          <Select value={measurementForm.floor_label} onValueChange={v => setMeasurementForm(f => ({ ...f, floor_label: v }))}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="ground_floor">{isRTL ? 'الدور الأرضي' : 'Ground'}</SelectItem>
                                              <SelectItem value="first_floor">{isRTL ? 'الدور الأول' : '1st Floor'}</SelectItem>
                                              <SelectItem value="second_floor">{isRTL ? 'الدور الثاني' : '2nd Floor'}</SelectItem>
                                              <SelectItem value="roof">{isRTL ? 'السطح' : 'Roof'}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input placeholder={isRTL ? 'الموقع (صالة، مطبخ)' : 'Location'} value={measurementForm.location_ar} onChange={e => setMeasurementForm(f => ({ ...f, location_ar: e.target.value }))} className="h-8 text-xs" />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                          <Input type="number" placeholder={isRTL ? 'الطول (مم)' : 'Length mm'} value={measurementForm.length_mm} onChange={e => setMeasurementForm(f => ({ ...f, length_mm: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'العرض (مم)' : 'Width mm'} value={measurementForm.width_mm} onChange={e => setMeasurementForm(f => ({ ...f, width_mm: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'الكمية' : 'Qty'} value={measurementForm.quantity} onChange={e => setMeasurementForm(f => ({ ...f, quantity: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                          <Input type="number" placeholder={isRTL ? 'سعر الوحدة' : 'Unit Price'} value={measurementForm.unit_price} onChange={e => setMeasurementForm(f => ({ ...f, unit_price: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                        </div>
                                        {measurementForm.length_mm && measurementForm.width_mm && measurementForm.unit_price && (
                                          <div className="flex items-center gap-3 text-[10px] p-2 bg-muted/40 rounded-md">
                                            <span>{isRTL ? 'المساحة:' : 'Area:'} <strong>{((Number(measurementForm.length_mm) * Number(measurementForm.width_mm)) / 1000000).toFixed(2)} م²</strong></span>
                                            <span>{isRTL ? 'التكلفة:' : 'Cost:'} <strong>{(Number(measurementForm.unit_price) * Number(measurementForm.quantity || 1)).toLocaleString()} SAR</strong></span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-[10px] gap-1" disabled={!measurementForm.name_ar || !measurementForm.piece_number || !measurementForm.length_mm || addMeasurementMutation.isPending} onClick={() => addMeasurementMutation.mutate({ contractId: c.id })}>
                                            <Plus className="w-3 h-3" />{isRTL ? 'إضافة' : 'Add'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowAddMeasurement(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowAddMeasurement(c.id)}>
                                        <Plus className="w-3 h-3" />{isRTL ? 'إضافة مقاس' : 'Add Measurement'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {measurements.length > 0 ? (
                                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 gap-y-0.5 text-[8px] font-semibold text-muted-foreground px-2 pb-1 border-b border-border/30">
                                      <span>#</span><span>{isRTL ? 'القطعة' : 'Piece'}</span><span>{isRTL ? 'الأبعاد' : 'Dims'}</span><span>{isRTL ? 'التكلفة' : 'Cost'}</span>
                                    </div>
                                    {measurements.map((m: any) => (
                                      <div key={m.id} className="p-2 rounded-lg bg-card border border-border/30 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Badge variant="outline" className="text-[8px] shrink-0 font-mono">{m.piece_number}</Badge>
                                          <div className="min-w-0">
                                            <p className="text-[10px] font-medium truncate">{isRTL ? m.name_ar : (m.name_en || m.name_ar)}</p>
                                            <p className="text-[8px] text-muted-foreground">{m.floor_label} • {isRTL ? m.location_ar : (m.location_en || m.location_ar)} • {isRTL ? 'كمية:' : 'Qty:'} {m.quantity}</p>
                                          </div>
                                        </div>
                                        <div className="text-end shrink-0">
                                          <p className="text-[9px] font-mono">{m.length_mm}×{m.width_mm} mm</p>
                                          <p className="text-[9px] font-semibold">{Number(m.total_cost || 0).toLocaleString()} {m.currency_code}</p>
                                          <Badge variant={m.status === 'installed' ? 'default' : 'secondary'} className="text-[7px] mt-0.5">{m.status === 'installed' ? (isRTL ? 'مركّب' : 'Installed') : m.status === 'manufactured' ? (isRTL ? 'مصنّع' : 'Made') : (isRTL ? 'معلق' : 'Pending')}</Badge>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex items-center justify-between px-2 pt-2 border-t border-border/30 text-[10px] font-bold">
                                      <span>{isRTL ? 'الإجمالي:' : 'Total:'} {measurements.length} {isRTL ? 'قطعة' : 'pcs'}</span>
                                      <span>{measurements.reduce((s: number, m: any) => s + Number(m.total_cost || 0), 0).toLocaleString()} {c.currency_code}</span>
                                    </div>
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد مقاسات' : 'No measurements'}</p>}
                              </TabsContent>

                              {/* ═══ Warranty Tab ═══ */}
                              <TabsContent value="warranty" className="mt-0">
                                {warranties.length > 0 ? (
                                  <div className="space-y-2">
                                    {warranties.map((w: any) => {
                                      const daysLeft = w.end_date ? Math.ceil((new Date(w.end_date).getTime() - Date.now()) / (1000*60*60*24)) : null;
                                      return (
                                        <div key={w.id} className="p-3 rounded-lg border border-border/40 bg-card">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-[11px] font-semibold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />{isRTL ? (w.title_ar || 'شهادة الضمان') : (w.title_en || w.title_ar || 'Warranty')}</h4>
                                            {daysLeft !== null && (
                                              <Badge variant={daysLeft > 90 ? 'default' : daysLeft > 0 ? 'secondary' : 'destructive'} className="text-[8px]">
                                                {daysLeft > 0 ? (isRTL ? `${daysLeft} يوم` : `${daysLeft}d`) : (isRTL ? 'منتهي' : 'Expired')}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                                            <div><span className="text-muted-foreground">{isRTL ? 'البداية:' : 'Start:'}</span> {formatDate(w.start_date)}</div>
                                            <div><span className="text-muted-foreground">{isRTL ? 'النهاية:' : 'End:'}</span> {formatDate(w.end_date)}</div>
                                          </div>
                                          {w.coverage_description_ar && <p className="text-[9px] text-muted-foreground mt-1.5 line-clamp-2">{isRTL ? w.coverage_description_ar : (w.coverage_description_en || w.coverage_description_ar)}</p>}
                                          {w.exclusions_ar && (
                                            <div className="mt-1.5">
                                              <span className="text-[8px] text-destructive font-semibold">{isRTL ? 'الاستثناءات:' : 'Exclusions:'}</span>
                                              <p className="text-[9px] text-muted-foreground line-clamp-2">{isRTL ? w.exclusions_ar : (w.exclusions_en || w.exclusions_ar)}</p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا يوجد ضمان' : 'No warranty'}</p>}
                              </TabsContent>

                              {/* ═══ Maintenance Tab ═══ */}
                              <TabsContent value="maintenance" className="mt-0">
                                {maintenance.length > 0 ? (
                                  <div className="space-y-2">
                                    {maintenance.map((r: any) => (
                                      <div key={r.id} className="p-2.5 rounded-lg border border-border/40 bg-card">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <h4 className="text-[11px] font-semibold truncate">{isRTL ? r.title_ar : (r.title_en || r.title_ar)}</h4>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Badge variant={r.priority === 'urgent' ? 'destructive' : 'outline'} className="text-[8px]">{r.priority}</Badge>
                                            <Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="text-[8px]">{r.status}</Badge>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                          <span>{r.request_number}</span>
                                          {r.scheduled_date && <span><Calendar className="w-2.5 h-2.5 inline" /> {formatDate(r.scheduled_date)}</span>}
                                        </div>
                                        {r.description_ar && <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{isRTL ? r.description_ar : (r.description_en || r.description_ar)}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد طلبات صيانة' : 'No maintenance requests'}</p>}
                              </TabsContent>

                              {/* ═══ Notes Tab ═══ */}
                              <TabsContent value="notes" className="mt-0">
                                <div className="flex gap-2 mb-3">
                                  <Input placeholder={isRTL ? 'أضف ملاحظة...' : 'Add note...'} value={expandedId === c.id ? noteText : ''} onChange={e => setNoteText(e.target.value)} className="text-xs h-8" />
                                  <Button variant="default" size="sm" className="h-8 gap-1 text-[10px] shrink-0" disabled={!noteText.trim() || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate({ contractId: c.id, content: noteText })}>
                                    <Send className="w-3 h-3" />{isRTL ? 'إرسال' : 'Send'}
                                  </Button>
                                </div>
                                {notes.length > 0 ? (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {notes.map((n: any) => (
                                      <div key={n.id} className="p-2 rounded-lg bg-card border border-border/30">
                                        <div className="flex items-center justify-between mb-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-medium">{n.user_id === user?.id ? (isRTL ? 'أنت' : 'You') : (profiles.find((p: any) => p.user_id === n.user_id)?.full_name || '-')}</span>
                                            {n.note_type !== 'note' && <Badge variant="outline" className="text-[7px] px-1 h-3">{n.note_type}</Badge>}
                                          </div>
                                          <span className="text-[8px] text-muted-foreground">{formatDate(n.created_at)}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{n.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحظات' : 'No notes'}</p>}
                              </TabsContent>

                              {/* ═══ Attachments Tab ═══ */}
                              <TabsContent value="attachments" className="mt-0">
                                <div className="mb-3">
                                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file && uploadingContractId) uploadAttachmentMutation.mutate({ contractId: uploadingContractId, file }); e.target.value = ''; }} />
                                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" disabled={uploadAttachmentMutation.isPending} onClick={() => { setUploadingContractId(c.id); fileInputRef.current?.click(); }}>
                                    {uploadAttachmentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    {isRTL ? 'رفع مرفق' : 'Upload'}
                                  </Button>
                                </div>
                                {attachments.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {attachments.map((a: any) => (
                                      <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-lg border border-border/40 bg-card hover:border-accent/30 transition-colors flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.file_type === 'image' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'}`}>
                                          {a.file_type === 'image' ? '🖼️' : '📄'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[10px] font-medium truncate">{a.file_name}</p>
                                          <p className="text-[8px] text-muted-foreground">{formatDate(a.created_at)}</p>
                                        </div>
                                        <Download className="w-3 h-3 text-muted-foreground shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد مرفقات' : 'No attachments'}</p>}
                              </TabsContent>

                              {/* ═══ Amendments Tab ═══ */}
                              <TabsContent value="amendments" className="mt-0">
                                {locked && (
                                  <div className="mb-3">
                                    {showAddAmendment === c.id ? (
                                      <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 space-y-2">
                                        <h4 className="text-[11px] font-semibold">{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <Input placeholder={isRTL ? 'عنوان التعديل' : 'Amendment title'} value={amendmentForm.title_ar} onChange={e => setAmendmentForm(f => ({ ...f, title_ar: e.target.value }))} className="h-8 text-xs" />
                                          <Select value={amendmentForm.amendment_type} onValueChange={v => setAmendmentForm(f => ({ ...f, amendment_type: v }))}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                          <Input type="number" placeholder={isRTL ? 'المبلغ الجديد' : 'New Amount'} value={amendmentForm.new_amount} onChange={e => setAmendmentForm(f => ({ ...f, new_amount: e.target.value }))} dir="ltr" className="h-8 text-xs" />
                                        )}
                                        <div className="flex gap-2">
                                          <Button size="sm" className="h-7 text-[10px] gap-1" disabled={!amendmentForm.title_ar || addAmendmentMutation.isPending} onClick={() => addAmendmentMutation.mutate({ contractId: c.id })}>
                                            <Send className="w-3 h-3" />{isRTL ? 'إرسال الطلب' : 'Submit'}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowAddAmendment(null)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowAddAmendment(c.id)}>
                                        <Plus className="w-3 h-3" />{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {!locked && <p className="text-center py-3 text-muted-foreground text-[10px]">{isRTL ? 'العقد لم يُعتمد بعد - يمكنك تعديله مباشرة' : 'Contract not yet approved - you can edit it directly'}</p>}
                                {amendments.length > 0 ? (
                                  <div className="space-y-2">
                                    {amendments.map((a: any) => {
                                      const canApproveAmendment = a.status === 'pending' && (
                                        (user?.id === c.client_id && !a.client_approved_at) ||
                                        (user?.id === c.provider_id && !a.provider_approved_at)
                                      );
                                      const typeLabels: Record<string, string> = { scope_change: isRTL ? 'نطاق العمل' : 'Scope', financial: isRTL ? 'مالي' : 'Financial', extension: isRTL ? 'تمديد' : 'Extension', other: isRTL ? 'أخرى' : 'Other' };
                                      return (
                                        <div key={a.id} className={`p-3 rounded-lg border ${a.status === 'approved' ? 'border-emerald-200/50 bg-emerald-50/20 dark:border-emerald-800/20 dark:bg-emerald-950/10' : a.status === 'rejected' ? 'border-red-200/50 bg-red-50/20' : 'border-amber-200/50 bg-amber-50/20 dark:border-amber-800/20'} bg-card`}>
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                            <h4 className="text-[11px] font-semibold truncate">{a.title_ar}</h4>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <Badge variant="outline" className="text-[8px]">{typeLabels[a.amendment_type] || a.amendment_type}</Badge>
                                              <Badge variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[8px]">
                                                {a.status === 'approved' ? (isRTL ? 'معتمد' : 'Approved') : a.status === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected') : (isRTL ? 'بانتظار' : 'Pending')}
                                              </Badge>
                                            </div>
                                          </div>
                                          {a.description_ar && <p className="text-[9px] text-muted-foreground mb-1">{a.description_ar}</p>}
                                          <div className="flex items-center gap-3 text-[8px] text-muted-foreground">
                                            {a.new_amount && <span className="font-medium">{isRTL ? 'المبلغ الجديد:' : 'New:'} {Number(a.new_amount).toLocaleString()} {c.currency_code}</span>}
                                            <span>{isRTL ? 'العميل:' : 'Client:'} {a.client_approved_at ? '✅' : '⏳'}</span>
                                            <span>{isRTL ? 'المزود:' : 'Provider:'} {a.provider_approved_at ? '✅' : '⏳'}</span>
                                            <span>{formatDate(a.created_at)}</span>
                                          </div>
                                          {canApproveAmendment && (
                                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 mt-2 text-emerald-600 border-emerald-300" onClick={() => approveAmendmentMutation.mutate({ amendmentId: a.id, contract: c })}>
                                              <CheckCircle2 className="w-3 h-3" />{isRTL ? 'موافقة على الملحق' : 'Approve Amendment'}
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : locked && <p className="text-center py-3 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحق' : 'No amendments yet'}</p>}
                              </TabsContent>

                              {/* ═══ Actions Tab ═══ */}
                              <TabsContent value="actions" className="mt-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => handleExportPDF(c)} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    {isRTL ? 'تصدير PDF' : 'Export PDF'}
                                  </Button>
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => handleDuplicate(c)}>
                                    <Copy className="w-3.5 h-3.5" />{isRTL ? 'نسخ العقد' : 'Duplicate'}
                                  </Button>
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => handleShareContract(c)}>
                                    <Share2 className="w-3.5 h-3.5" />{isRTL ? 'مشاركة' : 'Share'}
                                  </Button>
                                  {c.status === 'draft' && user?.id === c.provider_id && (
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 text-primary border-primary/30" onClick={() => setSendConfirm(c)}>
                                      <Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال للمراجعة' : 'Send for Review'}
                                    </Button>
                                  )}
                                  {((user?.id === c.client_id && !c.client_accepted_at) || (user?.id === c.provider_id && !c.provider_accepted_at)) && c.status !== 'completed' && c.status !== 'cancelled' && (
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 text-emerald-600 border-emerald-300" onClick={() => setApproveConfirm(c)}>
                                      <CheckCircle2 className="w-3.5 h-3.5" />{isRTL ? 'موافقة' : 'Approve'}
                                    </Button>
                                  )}
                                  {!locked && user?.id === c.provider_id && (
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => openEditContract(c)}>
                                      <FileText className="w-3.5 h-3.5" />{isRTL ? 'تعديل' : 'Edit'}
                                    </Button>
                                  )}
                                  {locked && (
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 text-amber-600 border-amber-300" onClick={() => setShowAddAmendment(c.id)}>
                                      <FileText className="w-3.5 h-3.5" />{isRTL ? 'طلب ملحق' : 'Amendment'}
                                    </Button>
                                  )}
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => navigate(`/contracts/${c.id}`)}>
                                    <Eye className="w-3.5 h-3.5" />{isRTL ? 'عرض كامل' : 'Full View'}
                                  </Button>
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
            <AlertDialogDescription>{isRTL ? 'هل تريد الموافقة على هذا العقد؟' : 'Approve this contract?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approveConfirm && approveMutation.mutate(approveConfirm)}>
              <CheckCircle2 className="w-4 h-4 me-2" />{isRTL ? 'موافقة' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Confirmation */}
      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'إرسال العقد للمراجعة' : 'Send for Review'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'سيتم إرسال العقد للعميل لمراجعته.' : 'The contract will be sent to the client for review.'}</AlertDialogDescription>
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
