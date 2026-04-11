import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { exportContractPDF } from '@/lib/contract-pdf-export';
import {
  ArrowRight, ArrowLeft, FileText, Shield, Wrench, CheckCircle2, Clock,
  Calendar, DollarSign, AlertTriangle, XCircle, ListChecks, Plus, Send,
  Building2, User, Download, Copy, ExternalLink, Hash, Banknote,
  CalendarDays, CircleDot, ChevronLeft, ChevronRight, Home, Printer,
  Mail, Phone, MapPin, IdCard, Globe, MessageSquare, Paperclip,
  Image, Eye, Pen, Scale, Handshake, ClipboardList, BookOpen,
  PenTool, StickyNote, Upload, Trash2, FileImage, FilePlus,
} from 'lucide-react';

/* ─── Status config ─── */
const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  draft: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted text-muted-foreground' },
  pending_approval: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  active: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { icon: Shield, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  disputed: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/* ─── InfoRow helper ─── */
const InfoRow = ({ icon: Icon, label, value, dir }: { icon: React.ElementType; label: string; value?: string | null; dir?: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] text-muted-foreground font-body block">{label}</span>
        <span className="text-xs font-heading font-medium text-foreground" dir={dir}>{value}</span>
      </div>
    </div>
  );
};

/* ─── Contract Clause Section ─── */
const ClauseSection = ({ icon: Icon, number, title, children, defaultOpen = false }: { icon: React.ElementType; number: number; title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-start"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <span className="text-xs text-muted-foreground font-body shrink-0">({number})</span>
        <span className="font-heading font-bold text-sm flex-1">{title}</span>
        <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${open ? '-rotate-90' : 'rotate-0'} rtl:rotate-180 rtl:data-[open=true]:-rotate-90`} style={{ transform: open ? 'rotate(-90deg)' : undefined }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <Separator className="mb-3" />
          {children}
        </div>
      )}
    </div>
  );
};

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintPriority, setMaintPriority] = useState<string>('medium');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('note');

  /* ─── Queries ─── */
  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: business } = useQuery({
    queryKey: ['contract-business', contract?.business_id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('*, categories(name_ar, name_en)').eq('id', contract!.business_id!).maybeSingle();
      return data;
    },
    enabled: !!contract?.business_id,
  });

  const { data: milestones } = useQuery({
    queryKey: ['milestones', id],
    queryFn: async () => {
      const { data } = await supabase.from('contract_milestones').select('*').eq('contract_id', id!).order('sort_order');
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: warranties } = useQuery({
    queryKey: ['warranties', id],
    queryFn: async () => {
      const { data } = await supabase.from('warranties').select('*').eq('contract_id', id!);
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
      const { data } = await supabase.from('profiles').select('*, countries(name_ar, name_en, currency_code), cities(name_ar, name_en)').eq('user_id', contract!.client_id).maybeSingle();
      return data;
    },
    enabled: !!contract,
  });

  const { data: providerProfile } = useQuery({
    queryKey: ['profile', contract?.provider_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*, countries(name_ar, name_en, currency_code), cities(name_ar, name_en)').eq('user_id', contract!.provider_id).maybeSingle();
      return data;
    },
    enabled: !!contract,
  });

  const { data: notes } = useQuery({
    queryKey: ['contract-notes', id],
    queryFn: async () => {
      const { data } = await supabase.from('contract_notes').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: attachments } = useQuery({
    queryKey: ['contract-attachments', id],
    queryFn: async () => {
      const { data } = await supabase.from('contract_attachments').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  /* ─── Mutations ─── */
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const isClientUser = user?.id === contract?.client_id;
      const updateField = isClientUser ? 'client_accepted_at' : 'provider_accepted_at';
      const update: any = { [updateField]: new Date().toISOString() };
      const otherAccepted = isClientUser ? contract?.provider_accepted_at : contract?.client_accepted_at;
      if (otherAccepted) update.status = 'active';
      else if (contract?.status === 'draft') update.status = 'pending_approval';
      await supabase.from('contracts').update(update).eq('id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      toast({ title: t('contracts.accept') });
    },
  });

  const submitMaintenance = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('maintenance_requests').insert({
        contract_id: id!,
        client_id: user!.id,
        provider_id: contract!.provider_id,
        title_ar: maintTitle,
        description_ar: maintDesc,
        priority: maintPriority as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setShowMaintForm(false);
      setMaintTitle('');
      setMaintDesc('');
      toast({ title: t('maintenance.submit') });
    },
  });

  const submitNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contract_notes').insert({
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
      await supabase.from('contract_notes').delete().eq('id', noteId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-notes', id] }),
  });

  /* ─── Derived ─── */
  const title = contract ? (language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar)) : '';
  const desc = contract ? (language === 'ar' ? contract.description_ar : (contract.description_en || contract.description_ar)) : '';
  const terms = contract ? (language === 'ar' ? contract.terms_ar : (contract.terms_en || contract.terms_ar)) : '';
  const cfg = statusConfig[contract?.status ?? 'draft'] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const isClient = user?.id === contract?.client_id;
  const isProvider = user?.id === contract?.provider_id;
  const canAccept = contract && ((isClient && !contract.client_accepted_at) || (isProvider && !contract.provider_accepted_at));
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;
  const milestonePaid = milestones?.filter(m => m.status === 'completed').reduce((s, m) => s + Number(m.amount), 0) || 0;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const bizName = business ? (language === 'ar' ? business.name_ar : (business.name_en || business.name_ar)) : '';

  const copyContractNumber = () => {
    if (contract?.contract_number) {
      navigator.clipboard.writeText(contract.contract_number);
      toast({ title: isRTL ? 'تم نسخ رقم العقد' : 'Contract number copied' });
    }
  };

  const getProfileName = (p: any) => p?.full_name || '-';
  const getCountryName = (p: any) => {
    if (!p?.countries) return null;
    return language === 'ar' ? p.countries.name_ar : p.countries.name_en;
  };
  const getCityName = (p: any) => {
    if (!p?.cities) return null;
    return language === 'ar' ? p.cities.name_ar : p.cities.name_en;
  };

  // Build full address from business
  const buildAddress = (b: any) => {
    if (!b) return null;
    const parts = [b.district, b.street_name, b.building_number ? `${isRTL ? 'مبنى' : 'Bldg'} ${b.building_number}` : null].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : b.address;
  };

  const handleExportPDF = () => {
    if (!contract) return;
    exportContractPDF({
      contractNumber: contract.contract_number,
      title: title,
      description: desc || undefined,
      totalAmount: Number(contract.total_amount),
      currency: contract.currency_code,
      startDate: contract.start_date || undefined,
      endDate: contract.end_date || undefined,
      clientName: getProfileName(clientProfile),
      providerName: bizName || getProfileName(providerProfile),
      supervisorName: contract.supervisor_name || undefined,
      supervisorPhone: contract.supervisor_phone || undefined,
      supervisorEmail: contract.supervisor_email || undefined,
      terms: terms || undefined,
      milestones: (milestones || []).map(m => ({
        title: language === 'ar' ? m.title_ar : (m.title_en || m.title_ar),
        amount: Number(m.amount),
        dueDate: m.due_date || undefined,
        status: m.status,
      })),
      isRTL,
    });
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 sm:py-28 space-y-4 sm:space-y-6 px-4 sm:px-6 max-w-5xl mx-auto">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-10 sm:h-12 w-3/4 rounded-xl" />
          <Skeleton className="h-48 sm:h-64 w-full rounded-xl" />
          <Skeleton className="h-32 sm:h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center space-y-4 px-4">
          <FileText className="w-14 h-14 sm:w-16 sm:h-16 mx-auto text-muted-foreground/30" />
          <p className="font-body text-muted-foreground">{t('profile.not_found')}</p>
          <Link to="/contracts"><Button variant="hero">{t('profile.back_home')}</Button></Link>
        </div>
      </div>
    );
  }

  /* ─── Party Detail Card ─── */
  const PartyDetailCard = ({ profile, partyLabel, partyIcon: PIcon, business: biz, acceptedAt, isBizParty }: {
    profile: any; partyLabel: string; partyIcon: React.ElementType; business?: any; acceptedAt?: string | null; isBizParty?: boolean;
  }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 dark:bg-muted/10 px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center">
            <PIcon className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="font-heading font-bold text-xs">{partyLabel}</span>
        </div>
        {acceptedAt && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {isRTL ? 'موافق' : 'Accepted'}
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-0.5">
        {/* Identity */}
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
          ) : isBizParty && biz?.logo_url ? (
            <img src={biz.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-border shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <PIcon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm truncate">{getProfileName(profile)}</p>
            {isBizParty && biz && <p className="text-[10px] text-accent font-body truncate">{bizName}</p>}
            {profile?.ref_id && <p className="text-[10px] text-muted-foreground font-body" dir="ltr">#{profile.ref_id}</p>}
          </div>
        </div>

        <Separator className="my-2" />

        {/* Contact Info */}
        <div className="space-y-0">
          <InfoRow icon={Phone} label={isRTL ? 'رقم الجوال' : 'Mobile'} value={profile?.phone} dir="ltr" />
          <InfoRow icon={Mail} label={isRTL ? 'البريد الإلكتروني' : 'Email'} value={profile?.email} dir="ltr" />
        </div>

        {/* Address */}
        {(getCountryName(profile) || getCityName(profile)) && (
          <>
            <Separator className="my-2" />
            <div className="space-y-0">
              <InfoRow icon={Globe} label={isRTL ? 'الدولة' : 'Country'} value={getCountryName(profile)} />
              <InfoRow icon={MapPin} label={isRTL ? 'المدينة' : 'City'} value={getCityName(profile)} />
            </div>
          </>
        )}

        {/* Business-specific details */}
        {isBizParty && biz && (
          <>
            <Separator className="my-2" />
            <div className="space-y-0">
              <InfoRow icon={IdCard} label={isRTL ? 'الرقم الموحد' : 'Unified Number'} value={biz.unified_number} dir="ltr" />
              <InfoRow icon={Hash} label={isRTL ? 'السجل التجاري' : 'Commercial Reg.'} value={biz.national_id} dir="ltr" />
              <InfoRow icon={Phone} label={isRTL ? 'هاتف المنشأة' : 'Business Phone'} value={biz.phone} dir="ltr" />
              <InfoRow icon={Phone} label={isRTL ? 'جوال المنشأة' : 'Business Mobile'} value={biz.mobile} dir="ltr" />
              <InfoRow icon={Phone} label={isRTL ? 'خدمة العملاء' : 'Customer Service'} value={biz.customer_service_phone} dir="ltr" />
              <InfoRow icon={User} label={isRTL ? 'مسؤول التواصل' : 'Contact Person'} value={biz.contact_person} />
              <InfoRow icon={Mail} label={isRTL ? 'البريد' : 'Email'} value={biz.email} dir="ltr" />
              <InfoRow icon={Globe} label={isRTL ? 'الموقع الإلكتروني' : 'Website'} value={biz.website} dir="ltr" />
              <InfoRow icon={MapPin} label={isRTL ? 'المنطقة' : 'Region'} value={biz.region} />
              <InfoRow icon={MapPin} label={isRTL ? 'الحي' : 'District'} value={biz.district} />
              <InfoRow icon={MapPin} label={isRTL ? 'الشارع' : 'Street'} value={biz.street_name} />
              <InfoRow icon={Building2} label={isRTL ? 'رقم المبنى' : 'Building No.'} value={biz.building_number} dir="ltr" />
              <InfoRow icon={Hash} label={isRTL ? 'الرقم الإضافي' : 'Additional No.'} value={biz.additional_number} dir="ltr" />
              {biz.address && <InfoRow icon={MapPin} label={isRTL ? 'العنوان' : 'Address'} value={biz.address} />}
            </div>
          </>
        )}

        {/* Acceptance timestamp */}
        {acceptedAt && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-body">
              <CheckCircle2 className="w-3 h-3" />
              {isRTL ? 'تاريخ الموافقة:' : 'Accepted on:'} {formatDate(acceptedAt)}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero Cover ─── */}
      <div className="bg-primary pt-20 sm:pt-24 pb-6 sm:pb-8">
        <div className="container px-4 sm:px-6 max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-primary-foreground/50 text-[11px] sm:text-xs font-body mb-3 sm:mb-4">
            <Link to="/" className="hover:text-primary-foreground/80 transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" />
              {isRTL ? 'الرئيسية' : 'Home'}
            </Link>
            <span>/</span>
            <Link to="/dashboard/contracts" className="hover:text-primary-foreground/80 transition-colors">
              {isRTL ? 'العقود' : 'Contracts'}
            </Link>
            <span>/</span>
            <span className="text-primary-foreground/80" dir="ltr">{contract.contract_number}</span>
          </nav>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {business?.logo_url ? (
                <img src={business.logo_url} alt={bizName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-primary-foreground/20 shrink-0" />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-foreground/10 border-2 border-primary-foreground/20 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground/60" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-lg sm:text-2xl text-primary-foreground truncate">{title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={copyContractNumber} className="flex items-center gap-1 text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors text-[10px] sm:text-xs font-body" dir="ltr">
                    <Hash className="w-3 h-3" />
                    {contract.contract_number}
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canAccept && contract.status !== 'completed' && contract.status !== 'cancelled' && (
                <Button variant="hero" size="sm" className="text-xs sm:text-sm shrink-0" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
                  <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />
                  {t('contracts.accept')}
                </Button>
              )}
              <Button variant="heroOutline" size="sm" className="text-xs shrink-0 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={handleExportPDF}>
                <Download className="w-3.5 h-3.5 me-1" />
                PDF
              </Button>
              <Button variant="heroOutline" size="sm" className="text-xs shrink-0 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 me-1" />
                {isRTL ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5 sm:py-8 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* ─── Status & Amount Bar ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${cfg.bg} gap-1.5 text-xs sm:text-sm px-3 py-1.5`}>
              <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t(`status.${contract.status}` as any)}
            </Badge>
            {business && (
              <Link to={`/${business.username}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors font-body">
                <Building2 className="w-3.5 h-3.5" />
                {bizName}
                {business.is_verified && <CheckCircle2 className="w-3 h-3 text-accent" />}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-accent" />
            <span className="font-heading font-bold text-xl sm:text-2xl text-accent">
              {Number(contract.total_amount).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-body">{contract.currency_code}</span>
          </div>
        </div>

        {/* ─── Parties Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5 sm:mb-6">
          <PartyDetailCard
            profile={clientProfile}
            partyLabel={isRTL ? 'الطرف الأول (العميل)' : 'First Party (Client)'}
            partyIcon={User}
            acceptedAt={contract.client_accepted_at}
          />
          <PartyDetailCard
            profile={providerProfile}
            partyLabel={isRTL ? 'الطرف الثاني (مزود الخدمة)' : 'Second Party (Provider)'}
            partyIcon={Building2}
            business={business}
            acceptedAt={contract.provider_accepted_at}
            isBizParty
          />
        </div>

        {/* ─── Supervisor Card ─── */}
        {(contract.supervisor_name || contract.supervisor_phone || contract.supervisor_email) && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center">
                <IdCard className="w-4 h-4 text-accent" />
              </div>
              <span className="font-heading font-bold text-sm">{isRTL ? 'المفوض بالتوقيع / المشرف' : 'Authorized Signatory / Supervisor'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <InfoRow icon={User} label={isRTL ? 'الاسم' : 'Name'} value={contract.supervisor_name} />
              <InfoRow icon={Phone} label={isRTL ? 'الجوال' : 'Mobile'} value={contract.supervisor_phone} dir="ltr" />
              <InfoRow icon={Mail} label={isRTL ? 'البريد' : 'Email'} value={contract.supervisor_email} dir="ltr" />
            </div>
          </div>
        )}

        {/* ─── Timeline & Financial Summary ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5 sm:mb-6">
          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-accent" />
              </div>
              <span className="font-heading font-bold text-sm">{isRTL ? 'الجدول الزمني' : 'Timeline'}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'بدء سريان العقد' : 'Contract Start'}</span>
                <span className="text-xs font-heading font-semibold">{formatDate(contract.start_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</span>
                <span className="text-xs font-heading font-semibold">{formatDate(contract.end_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</span>
                <span className="text-xs font-heading font-semibold">{formatDate(contract.created_at)}</span>
              </div>
              {contract.start_date && contract.end_date && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'التقدم الزمني' : 'Time Progress'}</span>
                    <span className="text-[10px] font-heading font-semibold text-accent">
                      {Math.min(100, Math.max(0, Math.round(((Date.now() - new Date(contract.start_date).getTime()) / (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime())) * 100)))}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent/70 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, Math.round(((Date.now() - new Date(contract.start_date).getTime()) / (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime())) * 100)))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-accent" />
              </div>
              <span className="font-heading font-bold text-sm">{isRTL ? 'الملخص المالي' : 'Financial Summary'}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'إجمالي قيمة العقد' : 'Total Contract Value'}</span>
                <span className="text-xs font-heading font-bold text-accent">{Number(contract.total_amount).toLocaleString()} {contract.currency_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المبالغ المسددة' : 'Amount Paid'}</span>
                <span className="text-xs font-heading font-semibold text-emerald-600 dark:text-emerald-400">{milestonePaid.toLocaleString()} {contract.currency_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المبلغ المتبقي' : 'Remaining'}</span>
                <span className="text-xs font-heading font-semibold">{(Number(contract.total_amount) - milestonePaid).toLocaleString()} {contract.currency_code}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'العملة' : 'Currency'}</span>
                <span className="text-xs font-heading font-semibold">{contract.currency_code}</span>
              </div>
              {totalMilestones > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'نسبة الإنجاز المالي' : 'Financial Progress'}</span>
                  <span className="text-xs font-heading font-bold text-accent">{Math.round((milestonePaid / Number(contract.total_amount)) * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Milestone Progress ─── */}
        {totalMilestones > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-5 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center">
                  <ListChecks className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'تقدم المراحل' : 'Milestone Progress'}</h3>
                  <p className="text-[10px] text-muted-foreground font-body">{completedMilestones}/{totalMilestones} {t('contracts.milestones')}</p>
                </div>
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground font-body">0%</span>
              <span className="text-[10px] font-heading font-bold text-accent">{progressPct}%</span>
              <span className="text-[10px] text-muted-foreground font-body">100%</span>
            </div>
          </div>
        )}

        {/* ─── Contract Clauses (Structured) ─── */}
        {(desc || terms) && (
          <div className="mb-5 sm:mb-6 space-y-3">
            <h2 className="font-heading font-bold text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              {isRTL ? 'بنود العقد' : 'Contract Clauses'}
            </h2>

            {desc && (
              <ClauseSection icon={BookOpen} number={1} title={isRTL ? 'التمهيد والمقدمة' : 'Preamble & Introduction'} defaultOpen>
                <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{desc}</p>
              </ClauseSection>
            )}

            <ClauseSection icon={User} number={2} title={isRTL ? 'التزامات الطرف الأول (العميل)' : 'First Party Obligations (Client)'}>
              <ul className="space-y-2 text-xs text-muted-foreground font-body list-disc list-inside">
                <li>{isRTL ? 'سداد المستحقات المالية وفقاً لجدول الدفعات المتفق عليه' : 'Pay financial dues according to the agreed payment schedule'}</li>
                <li>{isRTL ? 'تجهيز الموقع وتوفير المتطلبات اللازمة لبدء التنفيذ' : 'Prepare the site and provide the necessary requirements to start execution'}</li>
                <li>{isRTL ? 'الالتزام بقرارات التحكيم والفصل في النزاعات' : 'Comply with arbitration and dispute resolution decisions'}</li>
                <li>{isRTL ? 'تقديم الملاحظات والتعديلات خلال الفترة المحددة' : 'Submit feedback and modifications within the specified period'}</li>
              </ul>
            </ClauseSection>

            <ClauseSection icon={Building2} number={3} title={isRTL ? 'التزامات الطرف الثاني (المزود)' : 'Second Party Obligations (Provider)'}>
              <ul className="space-y-2 text-xs text-muted-foreground font-body list-disc list-inside">
                <li>{isRTL ? 'تنفيذ الأعمال وفقاً للمواصفات والمعايير المتفق عليها' : 'Execute work according to agreed specifications and standards'}</li>
                <li>{isRTL ? 'الالتزام بالجدول الزمني المحدد للتسليم' : 'Adhere to the specified delivery timeline'}</li>
                <li>{isRTL ? 'توفير ضمان على الأعمال المنفذة حسب الاتفاق' : 'Provide warranty on executed work as per agreement'}</li>
                <li>{isRTL ? 'معالجة الملاحظات والعيوب خلال فترة الضمان' : 'Address defects and issues during the warranty period'}</li>
              </ul>
            </ClauseSection>

            {terms && (
              <ClauseSection icon={Scale} number={4} title={isRTL ? 'الشروط والأحكام العامة' : 'General Terms & Conditions'}>
                <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">{terms}</p>
              </ClauseSection>
            )}

            <ClauseSection icon={Banknote} number={5} title={isRTL ? 'المبالغ والدفعات' : 'Payments & Installments'}>
              <div className="space-y-2 text-xs text-muted-foreground font-body">
                <p>{isRTL ? `إجمالي قيمة العقد: ${Number(contract.total_amount).toLocaleString()} ${contract.currency_code}` : `Total contract value: ${Number(contract.total_amount).toLocaleString()} ${contract.currency_code}`}</p>
                {milestones && milestones.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden mt-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'المرحلة' : 'Milestone'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'المبلغ' : 'Amount'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                          <th className="p-2 text-start font-heading font-semibold">{isRTL ? 'الحالة' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milestones.map(m => (
                          <tr key={m.id} className="border-t border-border">
                            <td className="p-2">{language === 'ar' ? m.title_ar : (m.title_en || m.title_ar)}</td>
                            <td className="p-2 font-heading font-semibold">{Number(m.amount).toLocaleString()} {contract.currency_code}</td>
                            <td className="p-2">{formatDate(m.due_date)}</td>
                            <td className="p-2"><Badge className={`${(statusConfig[m.status] || statusConfig.draft).bg} text-[9px]`}>{t(`milestone.${m.status}` as any)}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground/60">{isRTL ? 'لم يتم تحديد دفعات بعد' : 'No payment schedule defined yet'}</p>
                )}
              </div>
            </ClauseSection>

            <ClauseSection icon={ListChecks} number={6} title={isRTL ? 'التسليم والمراحل' : 'Delivery & Milestones'}>
              <div className="text-xs text-muted-foreground font-body space-y-2">
                <p>{isRTL ? 'يتم التسليم على مراحل وفقاً للجدول الزمني المحدد، ويتم توثيق كل مرحلة بمحضر تسليم موقع من الطرفين.' : 'Delivery occurs in stages per the specified timeline, with each stage documented in a signed delivery report.'}</p>
                {contract.start_date && <p>{isRTL ? `تاريخ بدء العمل: ${formatDate(contract.start_date)}` : `Work start date: ${formatDate(contract.start_date)}`}</p>}
                {contract.end_date && <p>{isRTL ? `تاريخ التسليم النهائي: ${formatDate(contract.end_date)}` : `Final delivery date: ${formatDate(contract.end_date)}`}</p>}
              </div>
            </ClauseSection>

            <ClauseSection icon={AlertTriangle} number={7} title={isRTL ? 'التأخير والجزاءات' : 'Delays & Penalties'}>
              <div className="text-xs text-muted-foreground font-body space-y-2">
                <p>{isRTL ? 'في حال تأخر أحد الطرفين عن التزاماته، يحق للطرف الآخر المطالبة بالتعويض وفقاً للشروط المتفق عليها.' : 'If either party delays their obligations, the other party may claim compensation per the agreed terms.'}</p>
                <p>{isRTL ? 'يتم احتساب التأخير من تاريخ الاستحقاق المحدد لكل مرحلة.' : 'Delays are calculated from the due date specified for each milestone.'}</p>
              </div>
            </ClauseSection>

            <ClauseSection icon={Scale} number={8} title={isRTL ? 'التحكيم وفض النزاعات' : 'Arbitration & Dispute Resolution'}>
              <div className="text-xs text-muted-foreground font-body space-y-2">
                <p>{isRTL ? 'في حال نشوء أي خلاف يتعلق بتفسير أو تنفيذ هذا العقد، يسعى الطرفان لحله ودياً.' : 'In case of any dispute relating to interpretation or execution of this contract, both parties shall seek amicable resolution.'}</p>
                <p>{isRTL ? 'إذا تعذر الحل الودي، يُحال النزاع إلى الجهات القضائية المختصة.' : 'If amicable resolution fails, the dispute shall be referred to the competent judicial authorities.'}</p>
              </div>
            </ClauseSection>

            <ClauseSection icon={Handshake} number={9} title={isRTL ? 'الخاتمة والتوقيع الإلكتروني' : 'Conclusion & Electronic Signatures'}>
              <div className="text-xs text-muted-foreground font-body space-y-3">
                <p>{isRTL ? 'حُرر هذا العقد وتم التوقيع عليه إلكترونياً من قبل الطرفين، ويُعد التوقيع الإلكتروني بمثابة التوقيع الخطي ويحمل نفس الحجية القانونية.' : 'This contract was drafted and electronically signed by both parties. Electronic signatures are considered equivalent to handwritten signatures and hold the same legal validity.'}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  {/* Client signature */}
                  <div className="text-center space-y-2">
                    <p className="font-heading font-bold text-foreground text-xs">{isRTL ? 'الطرف الأول (العميل)' : 'First Party (Client)'}</p>
                    <p className="text-xs">{getProfileName(clientProfile)}</p>
                    {contract.client_accepted_at ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <PenTool className="w-3 h-3" />
                        <span className="text-[10px]">{isRTL ? 'تم التوقيع' : 'Signed'} · {formatDate(contract.client_accepted_at)}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">{isRTL ? 'لم يتم التوقيع بعد' : 'Not signed yet'}</span>
                    )}
                  </div>
                  {/* Provider signature */}
                  <div className="text-center space-y-2">
                    <p className="font-heading font-bold text-foreground text-xs">{isRTL ? 'الطرف الثاني (المزود)' : 'Second Party (Provider)'}</p>
                    <p className="text-xs">{bizName || getProfileName(providerProfile)}</p>
                    {contract.provider_accepted_at ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <PenTool className="w-3 h-3" />
                        <span className="text-[10px]">{isRTL ? 'تم التوقيع' : 'Signed'} · {formatDate(contract.provider_accepted_at)}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">{isRTL ? 'لم يتم التوقيع بعد' : 'Not signed yet'}</span>
                    )}
                  </div>
                </div>
              </div>
            </ClauseSection>
          </div>
        )}

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="milestones">
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap mb-4 sm:mb-6 gap-1">
            <TabsTrigger value="milestones" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('contracts.milestones')} ({totalMilestones})
            </TabsTrigger>
            <TabsTrigger value="warranty" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('contracts.warranty')}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('contracts.maintenance')} ({maintenanceReqs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="notes" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <StickyNote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isRTL ? 'الملاحظات' : 'Notes'} ({notes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attachments" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 sm:py-2.5 gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isRTL ? 'المرفقات' : 'Attachments'} ({attachments?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* ── Milestones ── */}
          <TabsContent value="milestones">
            <div className="space-y-2 sm:space-y-3">
              {milestones?.map((m, idx) => {
                const mTitle = language === 'ar' ? m.title_ar : (m.title_en || m.title_ar);
                const mDesc = language === 'ar' ? m.description_ar : (m.description_en || m.description_ar);
                const mCfg = statusConfig[m.status] || statusConfig.draft;
                const isCompleted = m.status === 'completed';
                return (
                  <div key={m.id} className={`p-3 sm:p-5 rounded-xl border transition-colors ${isCompleted ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-card border-border'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-heading font-semibold text-sm sm:text-base text-foreground truncate">{mTitle}</h4>
                          {mDesc && <p className="text-[10px] sm:text-sm text-muted-foreground font-body mt-0.5 sm:mt-1 line-clamp-2">{mDesc}</p>}
                          <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground font-body flex-wrap">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{Number(m.amount).toLocaleString()} {contract.currency_code}</span>
                            {m.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(m.due_date)}</span>}
                            {m.completed_at && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />{formatDate(m.completed_at)}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${mCfg.bg} text-[9px] sm:text-xs shrink-0`}>{t(`milestone.${m.status}` as any)}</Badge>
                    </div>
                  </div>
                );
              })}
              {(!milestones || milestones.length === 0) && (
                <div className="text-center py-12 sm:py-16">
                  <ListChecks className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground font-body text-sm">{t('common.no_results')}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Warranty ── */}
          <TabsContent value="warranty">
            {warranties && warranties.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {warranties.map(w => {
                  const wTitle = language === 'ar' ? w.title_ar : (w.title_en || w.title_ar);
                  const wDesc = language === 'ar' ? w.description_ar : (w.description_en || w.description_ar);
                  const wCoverage = language === 'ar' ? w.coverage_ar : (w.coverage_en || w.coverage_ar);
                  return (
                    <div key={w.id} className="p-4 sm:p-6 rounded-xl bg-card border border-border">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">{wTitle}</h3>
                            <Badge className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs">{t(`warranty.${w.warranty_type}` as any)}</Badge>
                          </div>
                        </div>
                        <Badge className={`text-[10px] sm:text-xs shrink-0 ${w.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {t(`warranty.${w.status}` as any)}
                        </Badge>
                      </div>
                      {wDesc && <p className="text-xs sm:text-sm text-muted-foreground font-body mb-2 sm:mb-3">{wDesc}</p>}
                      {wCoverage && (
                        <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 dark:bg-muted/30">
                          <p className="text-[10px] sm:text-xs font-heading font-semibold text-foreground mb-0.5 sm:mb-1">{t('warranty.coverage')}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground font-body">{wCoverage}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(w.start_date)} - {formatDate(w.end_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-body text-sm">{t('warranty.no_warranty')}</p>
              </div>
            )}
          </TabsContent>

          {/* ── Maintenance ── */}
          <TabsContent value="maintenance">
            {isClient && (
              <div className="mb-4 sm:mb-6">
                {showMaintForm ? (
                  <div className="p-4 sm:p-6 rounded-xl bg-card border border-border space-y-3 sm:space-y-4">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">{t('maintenance.new')}</h3>
                    <Input placeholder={isRTL ? 'عنوان الطلب' : 'Request title'} value={maintTitle} onChange={e => setMaintTitle(e.target.value)} className="text-sm" />
                    <Textarea placeholder={isRTL ? 'وصف المشكلة' : 'Describe the issue'} value={maintDesc} onChange={e => setMaintDesc(e.target.value)} rows={3} className="text-sm" />
                    <Select value={maintPriority} onValueChange={setMaintPriority}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{isRTL ? 'منخفض' : 'Low'}</SelectItem>
                        <SelectItem value="medium">{isRTL ? 'متوسط' : 'Medium'}</SelectItem>
                        <SelectItem value="high">{isRTL ? 'عالي' : 'High'}</SelectItem>
                        <SelectItem value="urgent">{isRTL ? 'عاجل' : 'Urgent'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => submitMaintenance.mutate()} disabled={!maintTitle.trim() || submitMaintenance.isPending}>
                        <Send className="w-3.5 h-3.5" />{t('maintenance.submit')}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setShowMaintForm(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={() => setShowMaintForm(true)}>
                    <Plus className="w-3.5 h-3.5" />{t('maintenance.new')}
                  </Button>
                )}
              </div>
            )}

            {maintenanceReqs && maintenanceReqs.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {maintenanceReqs.map(req => {
                  const rTitle = language === 'ar' ? req.title_ar : (req.title_en || req.title_ar);
                  const rDesc = language === 'ar' ? req.description_ar : (req.description_en || req.description_ar);
                  const rCfg = statusConfig[req.status] || statusConfig.draft;
                  return (
                    <div key={req.id} className="p-3 sm:p-5 rounded-xl bg-card border border-border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-heading font-semibold text-xs sm:text-base text-foreground truncate">{rTitle}</h4>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-body mt-0.5" dir="ltr">{req.request_number}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={`${priorityColors[req.priority] || ''} text-[9px] sm:text-xs`}>{req.priority}</Badge>
                          <Badge className={`${rCfg.bg} text-[9px] sm:text-xs`}>{t(`maintenance.${req.status}` as any)}</Badge>
                        </div>
                      </div>
                      {rDesc && <p className="text-[10px] sm:text-sm text-muted-foreground font-body line-clamp-2">{rDesc}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(req.created_at)}</span>
                        {req.scheduled_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(req.scheduled_date)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <Wrench className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-body text-sm">{t('common.no_results')}</p>
              </div>
            )}
          </TabsContent>

          {/* ── Notes ── */}
          <TabsContent value="notes">
            <div className="mb-4">
              {showNoteForm ? (
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'إضافة ملاحظة' : 'Add Note'}</h3>
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">{isRTL ? 'ملاحظة عامة' : 'General Note'}</SelectItem>
                      <SelectItem value="amendment">{isRTL ? 'طلب تعديل' : 'Amendment Request'}</SelectItem>
                      <SelectItem value="issue">{isRTL ? 'ملاحظة فنية' : 'Technical Issue'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder={isRTL ? 'اكتب ملاحظتك...' : 'Write your note...'} value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} className="text-sm" />
                  <div className="flex gap-2">
                    <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={() => submitNote.mutate()} disabled={!noteContent.trim() || submitNote.isPending}>
                      <Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال' : 'Submit'}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowNoteForm(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowNoteForm(true)}>
                  <Plus className="w-3.5 h-3.5" />{isRTL ? 'إضافة ملاحظة' : 'Add Note'}
                </Button>
              )}
            </div>

            {notes && notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map(n => {
                  const noteTypeLabel: Record<string, string> = {
                    note: isRTL ? 'ملاحظة' : 'Note',
                    amendment: isRTL ? 'طلب تعديل' : 'Amendment',
                    issue: isRTL ? 'ملاحظة فنية' : 'Issue',
                  };
                  return (
                    <div key={n.id} className="p-3 sm:p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{noteTypeLabel[n.note_type] || n.note_type}</Badge>
                          <span className="text-[10px] text-muted-foreground font-body">{formatDate(n.created_at)}</span>
                        </div>
                        {n.user_id === user?.id && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteNote.mutate(n.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-body whitespace-pre-wrap">{n.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <StickyNote className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا توجد ملاحظات' : 'No notes yet'}</p>
              </div>
            )}
          </TabsContent>

          {/* ── Attachments ── */}
          <TabsContent value="attachments">
            {attachments && attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map(att => (
                  <div key={att.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {att.file_type === 'image' ? <FileImage className="w-5 h-5 text-muted-foreground" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-medium text-xs truncate">{att.file_name}</p>
                      <p className="text-[10px] text-muted-foreground font-body">{formatDate(att.created_at)}</p>
                    </div>
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Paperclip className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا توجد مرفقات' : 'No attachments yet'}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default ContractDetail;
