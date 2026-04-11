import React, { useState, useMemo, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Eye, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
  Shield, DollarSign, Calendar, Users, ListChecks, StickyNote,
  Send, Phone, Mail, User, ChevronDown, ChevronUp, Activity,
  BookOpen, X, Layers, Hammer, Wrench, Home, Factory,
  Flame, TreePine, GlassWater, Grid3X3, PanelTop,
  Download, Search, Loader2, Copy, Sparkles, ArrowRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
const statusConfig: Record<string, { icon: React.ElementType; color: string; label_ar: string; label_en: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground', label_ar: 'مسودة', label_en: 'Draft' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'بانتظار الموافقة', label_en: 'Pending' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'نشط', label_en: 'Active' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label_ar: 'مكتمل', label_en: 'Completed' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label_ar: 'ملغي', label_en: 'Cancelled' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label_ar: 'متنازع', label_en: 'Disputed' },
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

/* ── Contract Card (memo) ── */
const ContractCard = React.memo(({ c, isRTL, user, milestones, notes, profiles, onExpand, isExpanded, onNavigate, onExportPDF, onApprove, onSendForApproval }: any) => {
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

  return (
    <Card className="border-border/50 overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground truncate">{title}</h3>
              <Badge className={`${cfg.color} gap-0.5 text-[8px] sm:text-[9px] px-1.5 py-0 h-4`}>
                <StatusIcon className="w-2.5 h-2.5" />
                {isRTL ? cfg.label_ar : cfg.label_en}
              </Badge>
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">
                {isProvider ? (isRTL ? '🔧 مزود' : '🔧 Provider') : (isRTL ? '👤 عميل' : '👤 Client')}
              </Badge>
            </div>
            <p className="text-[9px] text-muted-foreground">{c.contract_number}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Export PDF */}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExportPDF(c)} title={isRTL ? 'تصدير PDF' : 'Export PDF'}>
              <Download className="w-3.5 h-3.5" />
            </Button>
            {/* Approve */}
            {canAccept && c.status !== 'completed' && c.status !== 'cancelled' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => onApprove(c)} title={isRTL ? 'موافقة' : 'Approve'}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {/* Send for approval */}
            {c.status === 'draft' && user?.id === c.provider_id && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onSendForApproval(c)} title={isRTL ? 'إرسال للمراجعة' : 'Send for Review'}>
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

        {/* Quick Info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] sm:text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-0.5 font-semibold text-foreground">
            <DollarSign className="w-3 h-3 text-accent" />
            {Number(c.total_amount).toLocaleString()} {c.currency_code}
          </span>
          <span className="flex items-center gap-0.5">
            <Calendar className="w-3 h-3" />
            {formatDate(c.start_date)} → {formatDate(c.end_date)}
          </span>
          {totalMs > 0 && <span className="flex items-center gap-0.5"><ListChecks className="w-3 h-3" />{completedMs}/{totalMs}</span>}
          {notes.length > 0 && <span className="flex items-center gap-0.5"><StickyNote className="w-3 h-3" />{notes.length}</span>}
        </div>

        {/* Parties */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {[
            { label: isRTL ? 'العميل' : 'Client', p: clientP, isMe: user?.id === c.client_id },
            { label: isRTL ? 'المزود' : 'Provider', p: providerP, isMe: user?.id === c.provider_id },
          ].map(party => (
            <div key={party.label} className="flex items-center gap-1">
              <Avatar className="w-5 h-5">
                <AvatarImage src={party.p?.avatar_url || undefined} />
                <AvatarFallback className="text-[7px] bg-accent/10 text-accent">{(party.p?.full_name || '?').charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-[9px]">
                <span className="text-muted-foreground">{party.label}: </span>
                <span className="font-medium">{party.p?.full_name || '-'}</span>
                {party.isMe && <span className="text-accent ms-0.5">({isRTL ? 'أنت' : 'You'})</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Progress */}
        {totalMs > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[9px] font-semibold text-accent">{progress}%</span>
          </div>
        )}

        {/* Supervisor */}
        {(c.supervisor_name || c.supervisor_phone) && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/30 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{c.supervisor_name || '-'}</span>
            {c.supervisor_phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.supervisor_phone}</span>}
            {c.supervisor_email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{c.supervisor_email}</span>}
          </div>
        )}
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

  const [statusFilter, setStatusFilter] = useState('all');
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

  /* ── Data ── */
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['dashboard-contracts', 'provider', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('provider_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const contractIds = useMemo(() => contracts.map((c: any) => c.id), [contracts]);

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['dashboard-milestones', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data, error } = await supabase.from('contract_milestones').select('*').in('contract_id', contractIds).order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['dashboard-contract-notes', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data, error } = await supabase.from('contract_notes').select('*').in('contract_id', contractIds).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['contract-profiles', contractIds],
    queryFn: async () => {
      const userIds = new Set<string>();
      contracts.forEach((c: any) => {
        userIds.add(c.client_id);
        userIds.add(c.provider_id);
      });
      if (userIds.size === 0) return [];
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, avatar_url, phone').in('user_id', Array.from(userIds));
      if (error) throw error;
      return data ?? [];
    },
    enabled: contracts.length > 0,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_templates').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: businessId } = useQuery({
    queryKey: ['my-business-id-contracts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  /* ── Mutations ── */
  const addNoteMutation = useMutation({
    mutationFn: async ({ contractId, content }: { contractId: string; content: string }) => {
      const { error } = await supabase.from('contract_notes').insert({ contract_id: contractId, user_id: user!.id, content, note_type: 'note' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboard-contract-notes'] }); setNoteText(''); toast.success(isRTL ? 'تمت إضافة الملاحظة' : 'Note added'); },
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const { data: clientProfile, error: clientProfileError } = await supabase.from('profiles').select('user_id').eq('email', form.client_email.trim()).maybeSingle();
      if (clientProfileError) throw clientProfileError;
      if (!clientProfile) throw new Error(isRTL ? 'لم يتم العثور على العميل بهذا البريد الإلكتروني' : 'Client not found with this email');

      const payload: any = {
        provider_id: user!.id,
        client_id: clientProfile.user_id,
        business_id: businessId || null,
        title_ar: form.title_ar,
        title_en: form.title_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        total_amount: Number(form.total_amount),
        currency_code: form.currency_code,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        terms_ar: form.terms_ar || null,
        terms_en: form.terms_en || null,
        supervisor_name: form.supervisor_name || null,
        supervisor_phone: form.supervisor_phone || null,
        supervisor_email: form.supervisor_email || null,
        status: 'draft',
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
      setViewSection('list');
      setForm(emptyForm);
      setEditingId(null);
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
        notification_type: 'contract',
        reference_id: contract.id,
        reference_type: 'contract',
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
  const stats = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter((c: any) => c.status === 'active').length,
    completed: contracts.filter((c: any) => c.status === 'completed').length,
    pendingApproval: contracts.filter((c: any) => c.status === 'pending_approval').length,
    draft: contracts.filter((c: any) => c.status === 'draft').length,
    totalAmount: contracts.reduce((s: number, c: any) => s + Number(c.total_amount), 0),
  }), [contracts]);

  const filtered = useMemo(() => {
    let result = contracts;
    if (statusFilter !== 'all') result = result.filter((c: any) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) => c.title_ar.toLowerCase().includes(q) || (c.title_en || '').toLowerCase().includes(q) || c.contract_number.toLowerCase().includes(q));
    }
    return result;
  }, [contracts, statusFilter, searchQuery]);

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
        totalAmount: Number(c.total_amount),
        currency: c.currency_code,
        startDate: c.start_date ? formatDate(c.start_date) : undefined,
        endDate: c.end_date ? formatDate(c.end_date) : undefined,
        clientName: clientP?.full_name || '-',
        providerName: providerP?.full_name || '-',
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
    } catch (e) {
      toast.error(isRTL ? 'فشل التصدير' : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [profiles, allMilestones, isRTL, formatDate]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const closeForm = useCallback(() => {
    setViewSection('list');
    setForm(emptyForm);
    setEditingId(null);
    setSelectedTemplate(null);
    setTemplatePreview(null);
  }, []);

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
            <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? 'إنشاء ومتابعة وتصدير العقود' : 'Create, track, and export contracts'}</p>
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
              <X className="w-3.5 h-3.5" />
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
          )}
        </div>

        {/* ── Stats ── */}
        {viewSection === 'list' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: FileText, label: isRTL ? 'إجمالي' : 'Total', value: stats.total, color: 'text-primary bg-primary/10' },
              { icon: Activity, label: isRTL ? 'نشطة' : 'Active', value: stats.active, color: 'text-emerald-600 bg-emerald-500/10' },
              { icon: CheckCircle2, label: isRTL ? 'مكتملة' : 'Completed', value: stats.completed, color: 'text-blue-600 bg-blue-500/10' },
              { icon: DollarSign, label: isRTL ? 'المبالغ' : 'Amount', value: `${stats.totalAmount.toLocaleString()}`, color: 'text-accent bg-accent/10', sub: 'SAR' },
            ].map((s, i) => (
              <Card key={i} className="border-border/40 bg-card/50">
                <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold">{s.value}{s.sub && <span className="text-[9px] text-muted-foreground ms-1">{s.sub}</span>}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ═══ Templates Browser (inline) ═══ */}
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
                              {[
                                tmpl.scope_of_work_ar && (isRTL ? 'نطاق' : 'Scope'),
                                tmpl.warranty_terms_ar && (isRTL ? 'ضمان' : 'Warranty'),
                                tmpl.payment_terms_ar && (isRTL ? 'دفع' : 'Payment'),
                              ].filter(Boolean).map((tag, i) => (
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

        {/* ═══ Template Preview (inline) ═══ */}
        {viewSection === 'template-preview' && templatePreview && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {(() => { const cfg = templateCategoryConfig[templatePreview.category]; const Icon = cfg?.icon || FileText; return (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg?.color || 'bg-muted'}`}><Icon className="w-4 h-4" /></div>
                  ); })()}
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
                <CheckCircle2 className="w-4 h-4" />
                {isRTL ? 'استخدام هذا القالب وإنشاء عقد' : 'Use Template & Create Contract'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ Create/Edit Contract Form (inline) ═══ */}
        {viewSection === 'create' && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <FileText className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                {editingId ? (isRTL ? 'تعديل العقد' : 'Edit Contract') : (isRTL ? 'إنشاء عقد جديد' : 'Create New Contract')}
                {selectedTemplate && (
                  <Badge variant="secondary" className="text-[9px] gap-1"><Sparkles className="w-2.5 h-2.5" />{isRTL ? 'من قالب' : 'From template'}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Email */}
              {!editingId && (
                <div className="p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Users className="w-3.5 h-3.5 text-accent" />{isRTL ? 'البريد الإلكتروني للعميل' : 'Client Email'} <span className="text-destructive">*</span></Label>
                  <Input type="email" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} placeholder={isRTL ? 'example@email.com' : 'example@email.com'} dir="ltr" className="h-9" />
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
                    <Label className="text-xs">{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
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

              {/* Supervisor / Contact */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/30 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" />{isRTL ? 'المسؤول المتابع' : 'Supervisor'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'الاسم' : 'Name'}</Label>
                    <Input value={form.supervisor_name} onChange={e => setForm({ ...form, supervisor_name: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                    <Input value={form.supervisor_phone} onChange={e => setForm({ ...form, supervisor_phone: e.target.value })} dir="ltr" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">{isRTL ? 'البريد' : 'Email'}</Label>
                    <Input type="email" value={form.supervisor_email} onChange={e => setForm({ ...form, supervisor_email: e.target.value })} dir="ltr" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الشروط (عربي)' : 'Terms (Arabic)'}</Label>
                    <FieldAiActions value={form.terms_ar} lang="ar" compact fieldType="description" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, terms_en: v }))} onImproved={v => setForm(f => ({ ...f, terms_ar: v }))} />
                  </div>
                  <Textarea value={form.terms_ar} onChange={e => setForm({ ...form, terms_ar: e.target.value })} rows={5} placeholder={isRTL ? 'الشروط والأحكام...' : 'Terms...'} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs">{isRTL ? 'الشروط (إنجليزي)' : 'Terms (English)'}</Label>
                    <FieldAiActions value={form.terms_en} lang="en" compact fieldType="description" isRTL={isRTL} onTranslated={v => setForm(f => ({ ...f, terms_ar: v }))} onImproved={v => setForm(f => ({ ...f, terms_en: v }))} />
                  </div>
                  <Textarea value={form.terms_en} onChange={e => setForm({ ...form, terms_en: e.target.value })} rows={5} dir="ltr" placeholder="Terms..." />
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
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: isRTL ? 'الكل' : 'All', count: stats.total },
                  { key: 'active', label: isRTL ? 'نشط' : 'Active', count: stats.active },
                  { key: 'pending_approval', label: isRTL ? 'بانتظار' : 'Pending', count: stats.pendingApproval },
                  { key: 'completed', label: isRTL ? 'مكتمل' : 'Completed', count: stats.completed },
                  { key: 'draft', label: isRTL ? 'مسودة' : 'Draft', count: stats.draft },
                ].map(f => (
                  <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm" className="text-[10px] gap-0.5 h-7 px-2" onClick={() => setStatusFilter(f.key)}>
                    {f.label}<Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 ms-0.5">{f.count}</Badge>
                  </Button>
                ))}
              </div>
              <div className="relative sm:max-w-xs w-full">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="ps-8 h-8 text-xs" />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
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
                  const isExpanded = expandedId === c.id;

                  return (
                    <div key={c.id}>
                      <ContractCard
                        c={c} isRTL={isRTL} user={user} milestones={milestones} notes={notes} profiles={profiles}
                        isExpanded={isExpanded} onExpand={setExpandedId} onNavigate={navigate}
                        onExportPDF={handleExportPDF}
                        onApprove={(contract: any) => setApproveConfirm(contract)}
                        onSendForApproval={(contract: any) => setSendConfirm(contract)}
                      />

                      {/* Expanded */}
                      {isExpanded && (
                        <Card className="border-t-0 rounded-t-none border-border/40 bg-muted/20">
                          <CardContent className="p-3 sm:p-4">
                            <Tabs defaultValue="milestones">
                              <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-0.5 h-auto flex-wrap gap-0.5 mb-3">
                                <TabsTrigger value="milestones" className="text-[10px] px-2.5 py-1 gap-0.5"><ListChecks className="w-3 h-3" />{isRTL ? 'المراحل' : 'Milestones'} ({milestones.length})</TabsTrigger>
                                <TabsTrigger value="notes" className="text-[10px] px-2.5 py-1 gap-0.5"><StickyNote className="w-3 h-3" />{isRTL ? 'ملاحظات' : 'Notes'} ({notes.length})</TabsTrigger>
                                <TabsTrigger value="details" className="text-[10px] px-2.5 py-1 gap-0.5"><FileText className="w-3 h-3" />{isRTL ? 'التفاصيل' : 'Details'}</TabsTrigger>
                                <TabsTrigger value="actions" className="text-[10px] px-2.5 py-1 gap-0.5"><Activity className="w-3 h-3" />{isRTL ? 'إجراءات' : 'Actions'}</TabsTrigger>
                              </TabsList>

                              {/* Milestones */}
                              <TabsContent value="milestones" className="mt-0">
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
                                                <Badge variant="outline" className="text-[8px] shrink-0">{isCompleted ? (isRTL ? 'مكتمل' : 'Done') : isInProgress ? (isRTL ? 'جاري' : 'In Progress') : (isRTL ? 'قادم' : 'Pending')}</Badge>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                                                <span><DollarSign className="w-2.5 h-2.5 inline" />{Number(m.amount).toLocaleString()} {c.currency_code}</span>
                                                {m.due_date && <span><Calendar className="w-2.5 h-2.5 inline" />{formatDate(m.due_date)}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد مراحل' : 'No milestones'}</p>}
                              </TabsContent>

                              {/* Notes */}
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
                                          <span className="text-[9px] font-medium">{n.user_id === user?.id ? (isRTL ? 'أنت' : 'You') : (profiles.find((p: any) => p.user_id === n.user_id)?.full_name || '-')}</span>
                                          <span className="text-[8px] text-muted-foreground">{formatDate(n.created_at)}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{n.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-center py-5 text-muted-foreground text-xs">{isRTL ? 'لا توجد ملاحظات' : 'No notes'}</p>}
                              </TabsContent>

                              {/* Details */}
                              <TabsContent value="details" className="mt-0 space-y-3">
                                {(isRTL ? c.description_ar : (c.description_en || c.description_ar)) && (
                                  <div className="p-2.5 rounded-lg border border-border/30">
                                    <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">{isRTL ? 'الوصف' : 'Description'}</h4>
                                    <p className="text-[11px] leading-relaxed">{isRTL ? c.description_ar : (c.description_en || c.description_ar)}</p>
                                  </div>
                                )}
                                {(c.terms_ar || c.terms_en) && (
                                  <div className="p-2.5 rounded-lg border border-border/30">
                                    <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">{isRTL ? 'الشروط' : 'Terms'}</h4>
                                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{isRTL ? c.terms_ar : (c.terms_en || c.terms_ar)}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { label: isRTL ? 'تاريخ الإنشاء' : 'Created', value: formatDate(c.created_at) },
                                    { label: isRTL ? 'آخر تحديث' : 'Updated', value: formatDate(c.updated_at) },
                                    { label: isRTL ? 'موافقة العميل' : 'Client Approved', value: c.client_accepted_at ? formatDate(c.client_accepted_at) : (isRTL ? 'لم يوافق' : 'Not yet') },
                                    { label: isRTL ? 'موافقة المزود' : 'Provider Approved', value: c.provider_accepted_at ? formatDate(c.provider_accepted_at) : (isRTL ? 'لم يوافق' : 'Not yet') },
                                  ].map((item, i) => (
                                    <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/20">
                                      <p className="text-[8px] text-muted-foreground">{item.label}</p>
                                      <p className="text-[10px] font-medium">{item.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>

                              {/* Actions */}
                              <TabsContent value="actions" className="mt-0">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => handleExportPDF(c)} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    {isRTL ? 'تصدير PDF' : 'Export PDF'}
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
                                  {(c.status === 'draft' || c.status === 'pending_approval') && user?.id === c.provider_id && (
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => openEditContract(c)}>
                                      <FileText className="w-3.5 h-3.5" />{isRTL ? 'تعديل' : 'Edit'}
                                    </Button>
                                  )}
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => navigate(`/contracts/${c.id}`)}>
                                    <Eye className="w-3.5 h-3.5" />{isRTL ? 'عرض كامل' : 'Full View'}
                                  </Button>
                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => {
                                    const link = `${window.location.origin}/contracts/${c.id}`;
                                    navigator.clipboard.writeText(link);
                                    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
                                  }}>
                                    <Copy className="w-3.5 h-3.5" />{isRTL ? 'نسخ الرابط' : 'Copy Link'}
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
            <AlertDialogDescription>{isRTL ? 'هل تريد الموافقة على هذا العقد؟ لا يمكن التراجع عن هذا الإجراء.' : 'Approve this contract? This action cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approveConfirm && approveMutation.mutate(approveConfirm)}>
              <CheckCircle2 className="w-4 h-4 me-2" />{isRTL ? 'موافقة' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send for Review Confirmation */}
      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'إرسال العقد للمراجعة' : 'Send for Review'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'سيتم إرسال العقد للعميل لمراجعته والموافقة عليه.' : 'The contract will be sent to the client for review and approval.'}</AlertDialogDescription>
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
