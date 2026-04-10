import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Eye, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
  Shield, DollarSign, Calendar, TrendingUp, Users, ListChecks,
  StickyNote, Paperclip, Upload, Send, MessageSquare, Phone, Mail,
  User, ChevronDown, ChevronUp, BarChart3, Activity, Filter,
  BookTemplate, Sparkles, X, Layers, Hammer, Wrench, Home, Factory,
  Flame, Car, TreePine, GlassWater, Grid3X3, PanelTop, BookOpen,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

/* ──────────────── Template Category Config ──────────────── */
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

/* ──────────────── Status Config ──────────────── */
const statusConfig: Record<string, { icon: React.ElementType; color: string; label_ar: string; label_en: string }> = {
  draft: { icon: FileText, color: 'bg-muted text-muted-foreground', label_ar: 'مسودة', label_en: 'Draft' },
  pending_approval: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'بانتظار الموافقة', label_en: 'Pending' },
  active: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'نشط', label_en: 'Active' },
  completed: { icon: Shield, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label_ar: 'مكتمل', label_en: 'Completed' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label_ar: 'ملغي', label_en: 'Cancelled' },
  disputed: { icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label_ar: 'متنازع', label_en: 'Disputed' },
};

const DashboardContracts = () => {
  const { t, isRTL, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templatePreview, setTemplatePreview] = useState<any>(null);

  /* ──────────── Data Queries ──────────── */
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['dashboard-contracts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const contractIds = contracts.map(c => c.id);

  const { data: allMilestones = [] } = useQuery({
    queryKey: ['dashboard-milestones', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase
        .from('contract_milestones')
        .select('*')
        .in('contract_id', contractIds)
        .order('sort_order');
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['dashboard-contract-notes', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];
      const { data } = await supabase
        .from('contract_notes')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
    enabled: contractIds.length > 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['contract-profiles', contracts],
    queryFn: async () => {
      const userIds = new Set<string>();
      contracts.forEach(c => { userIds.add(c.client_id); userIds.add(c.provider_id); });
      if (userIds.size === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, phone')
        .in('user_id', Array.from(userIds));
      return data ?? [];
    },
    enabled: contracts.length > 0,
  });

  const getProfile = (uid: string) => profiles.find(p => p.user_id === uid);

  /* ──────────── Add Note Mutation ──────────── */
  const addNoteMutation = useMutation({
    mutationFn: async ({ contractId, content }: { contractId: string; content: string }) => {
      const { error } = await supabase.from('contract_notes').insert({
        contract_id: contractId,
        user_id: user!.id,
        content,
        note_type: 'note',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contract-notes'] });
      setNoteText('');
      toast({ title: isRTL ? 'تمت إضافة الملاحظة' : 'Note added' });
    },
  });

  /* ──────────── Stats ──────────── */
  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active').length;
    const completed = contracts.filter(c => c.status === 'completed').length;
    const pending = contracts.filter(c => c.status === 'pending_approval' || c.status === 'draft').length;
    const totalAmount = contracts.reduce((s, c) => s + Number(c.total_amount), 0);
    const activeAmount = contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.total_amount), 0);
    return { total: contracts.length, active, completed, pending, totalAmount, activeAmount };
  }, [contracts]);

  /* ──────────── Filter ──────────── */
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return contracts;
    return contracts.filter(c => c.status === statusFilter);
  }, [contracts, statusFilter]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const getMilestonesForContract = (cId: string) => allMilestones.filter(m => m.contract_id === cId);
  const getNotesForContract = (cId: string) => allNotes.filter(n => n.contract_id === cId);

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'إدارة العقود' : 'Contract Management'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isRTL ? 'إدارة ومتابعة جميع عقودك ومراحل التنفيذ' : 'Manage and track all contracts and milestones'}
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs sm:text-sm shrink-0"
            onClick={() => navigate('/contracts')}
          >
            <Eye className="w-3.5 h-3.5" />
            {isRTL ? 'عرض الكل' : 'View All'}
          </Button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: FileText, label: isRTL ? 'إجمالي العقود' : 'Total Contracts',
              value: stats.total, color: 'text-foreground',
            },
            {
              icon: Activity, label: isRTL ? 'عقود نشطة' : 'Active',
              value: stats.active, color: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              icon: CheckCircle2, label: isRTL ? 'مكتملة' : 'Completed',
              value: stats.completed, color: 'text-blue-600 dark:text-blue-400',
            },
            {
              icon: DollarSign, label: isRTL ? 'إجمالي المبالغ' : 'Total Amount',
              value: stats.totalAmount.toLocaleString(), color: 'text-accent',
              sub: 'SAR',
            },
          ].map((s, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4 text-accent" />
                  </div>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${s.color}`}>
                  <span className="tech-content">{s.value}</span>
                  {s.sub && <span className="tech-content text-xs font-normal text-muted-foreground ms-1">{s.sub}</span>}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Status Filters ── */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: isRTL ? 'الكل' : 'All', count: contracts.length },
            { key: 'active', label: isRTL ? 'نشط' : 'Active', count: stats.active },
            { key: 'pending_approval', label: isRTL ? 'بانتظار' : 'Pending', count: stats.pending },
            { key: 'completed', label: isRTL ? 'مكتمل' : 'Completed', count: stats.completed },
            { key: 'draft', label: isRTL ? 'مسودة' : 'Draft', count: contracts.filter(c => c.status === 'draft').length },
          ].map(f => (
            <Button
              key={f.key}
              variant={statusFilter === f.key ? 'default' : 'outline'}
              size="sm"
              className="text-xs gap-1 h-8"
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
              <Badge variant="secondary" className="tech-content text-[9px] px-1.5 py-0 h-4">{f.count}</Badge>
            </Button>
          ))}
        </div>

        {/* ── Contracts List ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">{isRTL ? 'لا توجد عقود' : 'No contracts'}</p>
              <p className="text-sm">{isRTL ? 'ستظهر عقودك هنا عند إنشائها' : 'Your contracts will appear here'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const milestones = getMilestonesForContract(c.id);
              const notes = getNotesForContract(c.id);
              const completedMs = milestones.filter(m => m.status === 'completed').length;
              const totalMs = milestones.length;
              const progress = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;
              const isExpanded = expandedId === c.id;
              const cfg = statusConfig[c.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;
              const clientP = getProfile(c.client_id);
              const providerP = getProfile(c.provider_id);
              const isProvider = user?.id === c.provider_id;
              const title = isRTL ? c.title_ar : (c.title_en || c.title_ar);
              const desc = isRTL ? c.description_ar : (c.description_en || c.description_ar);

              return (
                <Card key={c.id} className="border-border/50 overflow-hidden transition-shadow hover:shadow-md">
                  {/* ── Contract Card Header ── */}
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">{title}</h3>
                          <Badge className={`${cfg.color} gap-1 text-[9px] sm:text-[10px]`}>
                            <StatusIcon className="w-3 h-3" />
                            {isRTL ? cfg.label_ar : cfg.label_en}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] gap-1">
                            {isProvider
                              ? (isRTL ? '🔧 مزود الخدمة' : '🔧 Provider')
                              : (isRTL ? '👤 عميل' : '👤 Client')}
                          </Badge>
                        </div>
                        <p className="tech-content text-[10px] text-muted-foreground">{c.contract_number}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/contracts/${c.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* ── Quick Info Row ── */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] sm:text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="w-3.5 h-3.5 text-accent" />
                        <span className="tech-content">{Number(c.total_amount).toLocaleString()} {c.currency_code}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </span>
                      {totalMs > 0 && (
                        <span className="flex items-center gap-1">
                          <ListChecks className="w-3.5 h-3.5" />
                          <span className="tech-content">{completedMs}/{totalMs}</span> {isRTL ? 'مراحل' : 'milestones'}
                        </span>
                      )}
                      {notes.length > 0 && (
                        <span className="flex items-center gap-1">
                          <StickyNote className="w-3.5 h-3.5" />
                          <span className="tech-content">{notes.length}</span> {isRTL ? 'ملاحظة' : 'notes'}
                        </span>
                      )}
                    </div>

                    {/* ── Parties ── */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      {[
                        { label: isRTL ? 'العميل' : 'Client', p: clientP, isMe: user?.id === c.client_id },
                        { label: isRTL ? 'المزود' : 'Provider', p: providerP, isMe: user?.id === c.provider_id },
                      ].map(party => (
                        <div key={party.label} className="flex items-center gap-1.5">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={party.p?.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-accent/10 text-accent">
                              {(party.p?.full_name || '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-[10px]">
                            <span className="text-muted-foreground">{party.label}: </span>
                            <span className="font-medium text-foreground">
                              {party.p?.full_name || '-'}
                              {party.isMe && <span className="text-accent ms-1">({isRTL ? 'أنت' : 'You'})</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Progress Bar ── */}
                    {totalMs > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="tech-content text-[10px] font-semibold text-accent">{progress}%</span>
                      </div>
                    )}

                    {/* ── Supervisor Info ── */}
                    {(c.supervisor_name || c.supervisor_phone) && (
                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {isRTL ? 'المسؤول:' : 'Supervisor:'} <span className="font-medium text-foreground">{c.supervisor_name || '-'}</span>
                        </span>
                        {c.supervisor_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span className="tech-content">{c.supervisor_phone}</span>
                          </span>
                        )}
                        {c.supervisor_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="tech-content">{c.supervisor_email}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>

                  {/* ── Expanded Details ── */}
                  {isExpanded && (
                    <div className="border-t border-border/40 bg-muted/20">
                      <Tabs defaultValue="milestones" className="p-4 sm:p-5">
                        <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-0.5 h-auto flex-wrap gap-0.5 mb-4">
                          <TabsTrigger value="milestones" className="rounded-md text-[10px] sm:text-xs px-3 py-1.5 gap-1 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                            <ListChecks className="w-3 h-3" />
                            {isRTL ? 'المراحل' : 'Milestones'} ({totalMs})
                          </TabsTrigger>
                          <TabsTrigger value="notes" className="rounded-md text-[10px] sm:text-xs px-3 py-1.5 gap-1 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                            <StickyNote className="w-3 h-3" />
                            {isRTL ? 'الملاحظات' : 'Notes'} ({notes.length})
                          </TabsTrigger>
                          <TabsTrigger value="details" className="rounded-md text-[10px] sm:text-xs px-3 py-1.5 gap-1 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                            <FileText className="w-3 h-3" />
                            {isRTL ? 'التفاصيل' : 'Details'}
                          </TabsTrigger>
                        </TabsList>

                        {/* ── Milestones Tab ── */}
                        <TabsContent value="milestones" className="mt-0">
                          {milestones.length > 0 ? (
                            <div className="relative">
                              {/* Timeline line */}
                              <div className={`absolute top-0 bottom-0 ${isRTL ? 'right-3.5' : 'left-3.5'} w-0.5 bg-border/50`} />
                              <div className="space-y-3">
                                {milestones.map((m, idx) => {
                                  const mTitle = isRTL ? m.title_ar : (m.title_en || m.title_ar);
                                  const mDesc = isRTL ? m.description_ar : (m.description_en || m.description_ar);
                                  const isCompleted = m.status === 'completed';
                                  const isInProgress = (m.status as string) === 'in_progress';
                                  return (
                                    <div key={m.id} className={`relative ${isRTL ? 'pr-9' : 'pl-9'}`}>
                                      {/* Timeline dot */}
                                      <div className={`absolute top-1.5 ${isRTL ? 'right-1' : 'left-1'} w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${
                                        isCompleted ? 'bg-emerald-500 text-white' :
                                        isInProgress ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
                                        'bg-muted text-muted-foreground border border-border'
                                      }`}>
                                        {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                                      </div>
                                      <div className={`p-3 rounded-lg border ${isCompleted ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-800/20 dark:bg-emerald-950/10' : isInProgress ? 'border-accent/30 bg-accent/5' : 'border-border/40 bg-card'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <h4 className="font-heading font-semibold text-xs sm:text-sm text-foreground">{mTitle}</h4>
                                            {mDesc && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{mDesc}</p>}
                                          </div>
                                          <Badge variant="outline" className={`text-[8px] sm:text-[9px] shrink-0 ${
                                            isCompleted ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' :
                                            isInProgress ? 'border-accent/50 text-accent' : ''
                                          }`}>
                                            {isCompleted ? (isRTL ? 'مكتمل' : 'Done') :
                                             isInProgress ? (isRTL ? 'قيد التنفيذ' : 'In Progress') :
                                             (isRTL ? 'قادم' : 'Pending')}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] sm:text-[10px] text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            <span className="tech-content">{Number(m.amount).toLocaleString()} {c.currency_code}</span>
                                          </span>
                                          {m.due_date && (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {formatDate(m.due_date)}
                                            </span>
                                          )}
                                          {m.completed_at && (
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                              <CheckCircle2 className="w-3 h-3" />
                                              {formatDate(m.completed_at)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-center py-6 text-muted-foreground text-xs">
                              {isRTL ? 'لا توجد مراحل بعد' : 'No milestones yet'}
                            </p>
                          )}
                        </TabsContent>

                        {/* ── Notes Tab ── */}
                        <TabsContent value="notes" className="mt-0">
                          {/* Add note form */}
                          <div className="flex gap-2 mb-3">
                            <Input
                              placeholder={isRTL ? 'أضف ملاحظة أو تحديث...' : 'Add a note or update...'}
                              value={expandedId === c.id ? noteText : ''}
                              onChange={e => setNoteText(e.target.value)}
                              className="text-xs h-8"
                            />
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 gap-1 text-[10px] shrink-0"
                              disabled={!noteText.trim() || addNoteMutation.isPending}
                              onClick={() => addNoteMutation.mutate({ contractId: c.id, content: noteText })}
                            >
                              <Send className="w-3 h-3" />
                              {isRTL ? 'إرسال' : 'Send'}
                            </Button>
                          </div>

                          {notes.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {notes.map(n => (
                                <div key={n.id} className="p-2.5 rounded-lg bg-card border border-border/30">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="w-4 h-4">
                                        <AvatarFallback className="text-[6px] bg-accent/10 text-accent">
                                          {n.user_id === user?.id ? (profile?.full_name || 'U').charAt(0) : '?'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-[9px] font-medium text-foreground">
                                        {n.user_id === user?.id ? (isRTL ? 'أنت' : 'You') : (getProfile(n.user_id)?.full_name || '-')}
                                      </span>
                                    </div>
                                    <span className="tech-content text-[8px] text-muted-foreground">
                                      {formatDate(n.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">{n.content}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center py-6 text-muted-foreground text-xs">
                              {isRTL ? 'لا توجد ملاحظات بعد' : 'No notes yet'}
                            </p>
                          )}
                        </TabsContent>

                        {/* ── Details Tab ── */}
                        <TabsContent value="details" className="mt-0">
                          <div className="space-y-3">
                            {/* Description */}
                            {desc && (
                              <div className="p-3 rounded-lg bg-card border border-border/30">
                                <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">
                                  {isRTL ? 'وصف العقد' : 'Description'}
                                </h4>
                                <p className="text-xs text-foreground leading-relaxed">{desc}</p>
                              </div>
                            )}

                            {/* Terms */}
                            {(c.terms_ar || c.terms_en) && (
                              <div className="p-3 rounded-lg bg-card border border-border/30">
                                <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">
                                  {isRTL ? 'الشروط والالتزامات' : 'Terms & Conditions'}
                                </h4>
                                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                  {isRTL ? c.terms_ar : (c.terms_en || c.terms_ar)}
                                </p>
                              </div>
                            )}

                            {/* Contract Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: isRTL ? 'تاريخ الإنشاء' : 'Created', value: formatDate(c.created_at) },
                                { label: isRTL ? 'آخر تحديث' : 'Updated', value: formatDate(c.updated_at) },
                                { label: isRTL ? 'بداية العقد' : 'Start Date', value: formatDate(c.start_date) },
                                { label: isRTL ? 'نهاية العقد' : 'End Date', value: formatDate(c.end_date) },
                                { label: isRTL ? 'موافقة العميل' : 'Client Accepted', value: c.client_accepted_at ? formatDate(c.client_accepted_at) : (isRTL ? 'لم يوافق بعد' : 'Not yet') },
                                { label: isRTL ? 'موافقة المزود' : 'Provider Accepted', value: c.provider_accepted_at ? formatDate(c.provider_accepted_at) : (isRTL ? 'لم يوافق بعد' : 'Not yet') },
                              ].map((item, i) => (
                                <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
                                  <p className="text-[9px] text-muted-foreground mb-0.5">{item.label}</p>
                                  <p className="text-[10px] sm:text-xs font-medium text-foreground">{item.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Supervisor */}
                            {(c.supervisor_name || c.supervisor_phone || c.supervisor_email) && (
                              <div className="p-3 rounded-lg bg-accent/5 border border-accent/15">
                                <h4 className="text-[10px] font-semibold text-accent mb-2 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {isRTL ? 'المسؤول المتابع' : 'Supervisor'}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  {c.supervisor_name && (
                                    <div>
                                      <span className="text-muted-foreground">{isRTL ? 'الاسم: ' : 'Name: '}</span>
                                      <span className="font-medium text-foreground">{c.supervisor_name}</span>
                                    </div>
                                  )}
                                  {c.supervisor_phone && (
                                    <div>
                                      <span className="text-muted-foreground">{isRTL ? 'الهاتف: ' : 'Phone: '}</span>
                                      <span className="tech-content font-medium text-foreground">{c.supervisor_phone}</span>
                                    </div>
                                  )}
                                  {c.supervisor_email && (
                                    <div>
                                      <span className="text-muted-foreground">{isRTL ? 'البريد: ' : 'Email: '}</span>
                                      <span className="tech-content font-medium text-foreground">{c.supervisor_email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Cancellation info */}
                            {c.cancellation_reason && (
                              <div className="p-3 rounded-lg bg-red-50/50 border border-red-200/30 dark:bg-red-950/10 dark:border-red-800/20">
                                <h4 className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  {isRTL ? 'سبب الإلغاء' : 'Cancellation Reason'}
                                </h4>
                                <p className="text-xs text-red-700 dark:text-red-300">{c.cancellation_reason}</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardContracts;
