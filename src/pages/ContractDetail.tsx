import React, { useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { exportContractPDF, exportMeasurementsPDF, exportMeasurementsExcel, printMeasurements, parseMeasurementsFromCSV, type ImportedMeasurement } from '@/lib/contract-pdf-export';
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
  Ruler, Grid3X3, Layers, ArrowRight, MessageSquare,
  Upload, Search, Filter, MoreVertical, ExternalLink,
  Star, Share2, Flag, RefreshCw, ArrowUpDown,
} from 'lucide-react';

/* ─── Status config ─── */
const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label_ar: string; label_en: string }> = {
  draft: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted text-muted-foreground', label_ar: 'مسودة', label_en: 'Draft' },
  pending_approval: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'بانتظار الموافقة', label_en: 'Pending' },
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'معلق', label_en: 'Pending' },
  active: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'نشط', label_en: 'Active' },
  in_progress: { icon: Timer, color: 'text-blue-600', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label_ar: 'قيد التنفيذ', label_en: 'In Progress' },
  completed: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label_ar: 'مكتمل', label_en: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label_ar: 'ملغي', label_en: 'Cancelled' },
  disputed: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label_ar: 'نزاع', label_en: 'Disputed' },
  paid: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'مسدد', label_en: 'Paid' },
  overdue: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label_ar: 'متأخر', label_en: 'Overdue' },
  submitted: { icon: Send, color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label_ar: 'مرسل', label_en: 'Submitted' },
  expired: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label_ar: 'منتهي', label_en: 'Expired' },
  installed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label_ar: 'مركّب', label_en: 'Installed' },
};

const priorityConfig: Record<string, { bg: string; label_ar: string; label_en: string }> = {
  low: { bg: 'bg-muted text-muted-foreground', label_ar: 'منخفض', label_en: 'Low' },
  medium: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label_ar: 'متوسط', label_en: 'Medium' },
  high: { bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label_ar: 'عالي', label_en: 'High' },
  urgent: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label_ar: 'عاجل', label_en: 'Urgent' },
};

const noteTypeConfig: Record<string, { label_ar: string; label_en: string; color: string; icon: React.ElementType }> = {
  general: { label_ar: 'ملاحظة عامة', label_en: 'General', color: 'border-border', icon: StickyNote },
  note: { label_ar: 'ملاحظة', label_en: 'Note', color: 'border-border', icon: StickyNote },
  amendment: { label_ar: 'طلب تعديل', label_en: 'Amendment', color: 'border-amber-200 dark:border-amber-800/30', icon: PenTool },
  technical_issue: { label_ar: 'ملاحظة فنية', label_en: 'Technical Issue', color: 'border-red-200 dark:border-red-800/30', icon: AlertTriangle },
  issue: { label_ar: 'مشكلة', label_en: 'Issue', color: 'border-red-200 dark:border-red-800/30', icon: AlertTriangle },
  delivery_report: { label_ar: 'محضر تسليم', label_en: 'Delivery Report', color: 'border-emerald-200 dark:border-emerald-800/30', icon: ListChecks },
  delivery: { label_ar: 'تسليم', label_en: 'Delivery', color: 'border-emerald-200 dark:border-emerald-800/30', icon: ListChecks },
};

/* ─── InfoRow helper ─── */
const InfoRow = ({ icon: Icon, label, value, dir, href }: { icon: React.ElementType; label: string; value?: string | null; dir?: string; href?: string }) => {
  if (!value) return null;
  const content = (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] text-muted-foreground font-body block">{label}</span>
        <span className={`text-xs font-heading font-medium ${href ? 'text-accent hover:underline' : 'text-foreground'}`} dir={dir}>{value}</span>
      </div>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  return content;
};

/* ─── Collapsible Clause ─── */
const ClauseSection = ({ icon: Icon, number, title, children, defaultOpen = false }: { icon: React.ElementType; number: number; title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-start">
        <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <span className="text-xs text-muted-foreground font-body shrink-0">({number})</span>
        <span className="font-heading font-bold text-sm flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: boolean }) => (
  <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-accent" /></div>
      <span className="text-[10px] text-muted-foreground font-body">{label}</span>
    </div>
    <p className={`font-heading font-bold text-lg sm:text-xl ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground font-body mt-0.5">{sub}</p>}
  </div>
);

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [uploading, setUploading] = useState(false);
  // Measurement CRUD
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Record<string, unknown> | null>(null);
  const [mForm, setMForm] = useState({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '', notes: '' });
  // Milestone CRUD
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msForm, setMsForm] = useState({ title_ar: '', amount: '', due_date: '', description_ar: '' });
  // Amendment
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amForm, setAmForm] = useState({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
  // Import measurements
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importedMeasurements, setImportedMeasurements] = useState<ImportedMeasurement[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [editingImportIdx, setEditingImportIdx] = useState<number | null>(null);

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

  const { data: installmentPlans } = useQuery({
    queryKey: ['installment-plans', id],
    queryFn: async () => {
      const { data } = await supabase.from('installment_plans').select('*').eq('contract_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!user,
  });

  const { data: installmentPayments } = useQuery({
    queryKey: ['installment-payments', installmentPlans?.[0]?.id],
    queryFn: async () => {
      const planIds = installmentPlans!.map(p => p.id);
      const { data } = await supabase.from('installment_payments').select('*').in('plan_id', planIds).order('installment_number');
      return data ?? [];
    },
    enabled: !!installmentPlans && installmentPlans.length > 0,
  });

  const { data: measurements } = useQuery({
    queryKey: ['contract-measurements', id],
    queryFn: async () => {
      const { data } = await supabase.from('contract_measurements').select('*').eq('contract_id', id!).order('sort_order');
      return data ?? [];
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
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const isClientUser = user?.id === contract?.client_id;
      const updateField = isClientUser ? 'client_accepted_at' : 'provider_accepted_at';
      const update: Record<string, unknown> = { [updateField]: new Date().toISOString() };
      const otherAccepted = isClientUser ? contract?.provider_accepted_at : contract?.client_accepted_at;
      if (otherAccepted) update.status = 'active';
      else if (contract?.status === 'draft') update.status = 'pending_approval';
      await supabase.from('contracts').update(update).eq('id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      toast({ title: isRTL ? 'تم قبول العقد بنجاح' : 'Contract accepted successfully' });
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
        priority: maintPriority as 'low' | 'normal' | 'high' | 'urgent',
        warranty_id: maintWarrantyId || null,
      });
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

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('contract-attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('contract-attachments').getPublicUrl(path);
      const fileType = file.type.startsWith('image/') ? 'image/jpeg' : file.type || 'application/pdf';
      const { error } = await supabase.from('contract_attachments').insert({
        contract_id: id!,
        user_id: user!.id,
        file_name: file.name,
        file_type: fileType,
        file_url: urlData.publicUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ['contract-attachments', id] });
      toast({ title: isRTL ? 'تم رفع المرفق بنجاح' : 'Attachment uploaded' });
    },
    onError: () => {
      setUploading(false);
      toast({ title: isRTL ? 'فشل رفع الملف' : 'Upload failed', variant: 'destructive' });
    },
  });

  /* ─── Measurement CRUD ─── */
  const resetMForm = () => { setMForm({ name_ar: '', piece_number: '', floor_label: 'ground_floor', location_ar: '', length_mm: '', width_mm: '', quantity: '1', unit_price: '', notes: '' }); setEditingMeasurement(null); setShowMeasurementForm(false); };

  const addMeasurementMutation = useMutation({
    mutationFn: async () => {
      const area = (Number(mForm.length_mm) * Number(mForm.width_mm)) / 1000000;
      const totalCost = Number(mForm.unit_price) * Number(mForm.quantity);
      const payload: Record<string, unknown> = {
        contract_id: id!, name_ar: mForm.name_ar, piece_number: mForm.piece_number,
        floor_label: mForm.floor_label, location_ar: mForm.location_ar,
        length_mm: Number(mForm.length_mm), width_mm: Number(mForm.width_mm),
        quantity: Number(mForm.quantity), unit_price: Number(mForm.unit_price),
        area_sqm: area, total_cost: totalCost, notes: mForm.notes || null,
        sort_order: (measurements?.length || 0) + 1,
      };
      if (editingMeasurement) {
        const { error } = await supabase.from('contract_measurements').update(payload).eq('id', editingMeasurement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contract_measurements').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contract-measurements', id] });
      resetMForm();
      toast({ title: isRTL ? (editingMeasurement ? 'تم تحديث المقاس' : 'تم إضافة المقاس') : (editingMeasurement ? 'Measurement updated' : 'Measurement added') });
      // Auto-update contract total from measurements
      setTimeout(() => updateContractTotalFromMeasurements(), 500);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      const { error } = await supabase.from('contract_measurements').delete().eq('id', measurementId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contract-measurements', id] });
      toast({ title: isRTL ? 'تم حذف المقاس' : 'Measurement deleted' });
      setTimeout(() => updateContractTotalFromMeasurements(), 500);
    },
  });

  const updateContractTotalFromMeasurements = async () => {
    const { data: freshMeasurements } = await supabase.from('contract_measurements').select('total_cost').eq('contract_id', id!);
    if (freshMeasurements && freshMeasurements.length > 0) {
      const newTotal = freshMeasurements.reduce((s, m) => s + Number(m.total_cost || 0), 0);
      if (newTotal > 0) {
        await supabase.from('contracts').update({ total_amount: newTotal }).eq('id', id!);
        queryClient.invalidateQueries({ queryKey: ['contract', id] });
      }
    }
  };

  const startEditMeasurement = (m: Record<string, unknown>) => {
    setMForm({
      name_ar: m.name_ar || '', piece_number: m.piece_number || '', floor_label: m.floor_label || 'ground_floor',
      location_ar: m.location_ar || '', length_mm: String(m.length_mm || ''), width_mm: String(m.width_mm || ''),
      quantity: String(m.quantity || 1), unit_price: String(m.unit_price || ''), notes: m.notes || '',
    });
    setEditingMeasurement(m);
    setShowMeasurementForm(true);
  };

  /* ─── Milestone Add ─── */
  const addMilestoneMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contract_milestones').insert({
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
      const { error } = await supabase.from('contract_amendments').insert({
        contract_id: id!, requested_by: user!.id,
        title_ar: amForm.title_ar, description_ar: amForm.description_ar || null,
        amendment_type: amForm.amendment_type,
        new_amount: amForm.new_amount ? Number(amForm.new_amount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      setShowAmendmentForm(false);
      setAmForm({ title_ar: '', description_ar: '', amendment_type: 'scope_change', new_amount: '' });
      toast({ title: isRTL ? 'تم إرسال طلب الملحق' : 'Amendment request sent' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const approveAmendmentMutation = useMutation({
    mutationFn: async (amendment: Record<string, unknown>) => {
      const isClientUser = user?.id === contract?.client_id;
      const field = isClientUser ? 'client_approved_at' : 'provider_approved_at';
      const update: Record<string, unknown> = { [field]: new Date().toISOString() };
      const otherApproved = isClientUser ? amendment.provider_approved_at : amendment.client_approved_at;
      if (otherApproved) update.status = 'approved';
      const { error } = await supabase.from('contract_amendments').update(update).eq('id', amendment.id);
      if (error) throw error;
      if (otherApproved && amendment.new_amount) {
        await supabase.from('contracts').update({ total_amount: amendment.new_amount }).eq('id', contract!.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', id] });
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      toast({ title: isRTL ? 'تمت الموافقة على الملحق' : 'Amendment approved' });
    },
  });

  /* ─── Derived ─── */
  const title = contract ? (language === 'ar' ? contract.title_ar : (contract.title_en || contract.title_ar)) : '';
  const desc = contract ? (language === 'ar' ? contract.description_ar : (contract.description_en || contract.description_ar)) : '';
  const terms = contract ? (language === 'ar' ? contract.terms_ar : (contract.terms_en || contract.terms_ar)) : '';
  const cfg = statusConfig[contract?.status ?? 'draft'] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const isClient = user?.id === contract?.client_id;
  const isProvider = user?.id === contract?.provider_id;
  const isContractLocked = contract ? ['active', 'completed', 'cancelled'].includes(contract.status) : false;
  const canAccept = contract && ((isClient && !contract.client_accepted_at) || (isProvider && !contract.provider_accepted_at));
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;
  const milestonePaid = milestones?.filter(m => m.status === 'completed').reduce((s, m) => s + Number(m.amount), 0) || 0;
  const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const totalAmount = Number(contract?.total_amount || 0);
  const vatRate = Number(contract?.vat_rate || 15);
  const vatInclusive = contract?.vat_inclusive ?? false;
  const vatAmount = vatInclusive
    ? (totalAmount * vatRate) / (100 + vatRate)
    : (totalAmount * vatRate) / 100;
  const subtotalBeforeVat = vatInclusive ? totalAmount - vatAmount : totalAmount;
  const grandTotalWithVat = vatInclusive ? totalAmount : totalAmount + vatAmount;
  const bizName = business ? (language === 'ar' ? business.name_ar : (business.name_en || business.name_ar)) : '';

  const copyContractNumber = () => {
    if (contract?.contract_number) {
      navigator.clipboard.writeText(contract.contract_number);
      toast({ title: isRTL ? 'تم نسخ رقم العقد' : 'Contract number copied' });
    }
  };

  const getProfileName = (p: Record<string, unknown> | null) => p?.full_name || '-';
  const getCountryName = (p: Record<string, unknown> | null) => p?.countries ? (language === 'ar' ? p.countries.name_ar : p.countries.name_en) : null;
  const getCityName = (p: Record<string, unknown> | null) => p?.cities ? (language === 'ar' ? p.cities.name_ar : p.cities.name_en) : null;

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

  const floors = useMemo(() => Object.keys(measurementsByFloor), [measurementsByFloor]);

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

  const handleExportPDF = () => {
    if (!contract) return;
    exportContractPDF({
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
      milestones: (milestones || []).map(m => ({
        title: language === 'ar' ? m.title_ar : (m.title_en || m.title_ar),
        amount: Number(m.amount),
        dueDate: m.due_date || undefined,
        status: m.status,
      })),
      measurements: (measurements || []).map(m => ({
        pieceNumber: m.piece_number, name: language === 'ar' ? m.name_ar : (m.name_en || m.name_ar),
        location: (language === 'ar' ? m.location_ar : (m.location_en || m.location_ar)) || '',
        floor: m.floor_label || '', lengthMm: Number(m.length_mm), widthMm: Number(m.width_mm),
        areaSqm: Number(m.area_sqm), unitPrice: Number(m.unit_price), quantity: Number(m.quantity),
        totalCost: Number(m.total_cost), status: m.status,
      })),
      isRTL,
    });
  };

  const handleExportMeasurementsPDF = () => {
    if (!contract || !measurements || measurements.length === 0) return;
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

  const handleExportMeasurementsExcel = () => {
    if (!contract || !measurements || measurements.length === 0) return;
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

  const handlePrintMeasurements = () => {
    if (!contract || !measurements || measurements.length === 0) return;
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
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
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
    const startOrder = (measurements?.length || 0) + 1;
    const records = importedMeasurements.map((m, i) => {
      const area = (m.length_mm * m.width_mm) / 1000000;
      return {
        contract_id: id, name_ar: m.name_ar, piece_number: m.piece_number,
        floor_label: m.floor_label, location_ar: m.location_ar,
        length_mm: m.length_mm, width_mm: m.width_mm,
        quantity: m.quantity, unit_price: m.unit_price,
        area_sqm: area, total_cost: m.unit_price * m.quantity,
        notes: m.notes || null, sort_order: startOrder + i,
      };
    });
    const { error } = await supabase.from('contract_measurements').insert(records);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['contract-measurements', id] });
    setShowImportPreview(false);
    setImportedMeasurements([]);
    toast({ title: isRTL ? `تم استيراد ${records.length} مقاس بنجاح` : `${records.length} measurements imported` });
    setTimeout(() => updateContractTotalFromMeasurements(), 500);
  };

  const updateImportedRow = (idx: number, field: keyof ImportedMeasurement, value: string | number) => {
    setImportedMeasurements(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const removeImportedRow = (idx: number) => {
    setImportedMeasurements(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate(file);
    e.target.value = '';
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
    profile: Record<string, unknown> | null; partyLabel: string; partyIcon: React.ElementType; biz?: Record<string, unknown> | null; acceptedAt?: string | null; isBiz?: boolean;
  }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-muted/30 dark:bg-muted/10 px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center"><PIcon className="w-3.5 h-3.5 text-accent" /></div>
          <span className="font-heading font-bold text-xs">{partyLabel}</span>
        </div>
        {acceptedAt && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{isRTL ? 'موافق' : 'Accepted'}</Badge>}
      </div>
      <div className="p-4 space-y-0.5">
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
           : isBiz && biz?.logo_url ? <img src={biz.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-border shrink-0" />
           : <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0"><PIcon className="w-6 h-6 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-sm truncate">{getProfileName(profile)}</p>
            {isBiz && biz && <Link to={`/${biz.username}`} className="text-[10px] text-accent font-body truncate block hover:underline">{bizName}</Link>}
            {profile?.ref_id && <p className="text-[10px] text-muted-foreground font-body" dir="ltr">#{profile.ref_id}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={openMessages} title={isRTL ? 'إرسال رسالة' : 'Send message'}>
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
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-body">
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
              <Button variant="heroOutline" size="sm" className="text-xs border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={handleExportPDF}>
                <Download className="w-3.5 h-3.5" />PDF
              </Button>
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
        {/* ─── Quick Stats ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 sm:mb-6">
          <StatCard icon={StatusIcon} label={isRTL ? 'الحالة' : 'Status'} value={isRTL ? cfg.label_ar : cfg.label_en} />
          <StatCard icon={Banknote} label={isRTL ? 'قيمة العقد' : 'Total Value'} value={`${grandTotalWithVat.toLocaleString()} ${contract.currency_code}`} accent sub={vatInclusive ? (isRTL ? 'شامل الضريبة' : 'VAT inclusive') : (isRTL ? `+ ${vatRate}% ضريبة` : `+ ${vatRate}% VAT`)} />
          <StatCard icon={ListChecks} label={isRTL ? 'المراحل' : 'Milestones'} value={`${completedMilestones}/${totalMilestones}`} sub={`${progressPct}% ${isRTL ? 'مكتمل' : 'complete'}`} />
          <StatCard icon={CreditCard} label={isRTL ? 'المسدد' : 'Paid'} value={`${paymentsTotals.paid.toLocaleString()}`} sub={`${paymentsTotals.paidCount}/${paymentsTotals.totalCount} ${isRTL ? 'دفعات' : 'payments'}`} />
        </div>

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
                      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[80px] hover:bg-muted/50 ${isComp ? '' : isActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isComp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-300 dark:ring-blue-700' : 'bg-muted text-muted-foreground'}`}>
                        {isComp ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="text-[9px] font-body text-muted-foreground text-center whitespace-nowrap">{(language === 'ar' ? m.title_ar : (m.title_en || m.title_ar)).slice(0, 20)}</span>
                      <Badge variant="outline" className="text-[8px] px-1.5">{pct}%</Badge>
                    </button>
                    {idx < milestones.length - 1 && (
                      <div className={`w-6 h-0.5 shrink-0 ${isComp ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <Progress value={progressPct} className="h-1.5 mt-3" />
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
              {contract.completed_at && <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'تاريخ الإكمال' : 'Completed'}</span><span className="text-xs font-heading font-semibold text-emerald-600 dark:text-emerald-400">{formatDate(contract.completed_at)}</span></div>}
              {contract.start_date && contract.end_date && (() => {
                const pct = Math.min(100, Math.max(0, Math.round(((Date.now() - new Date(contract.start_date!).getTime()) / (new Date(contract.end_date!).getTime() - new Date(contract.start_date!).getTime())) * 100)));
                return (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'التقدم الزمني' : 'Progress'}</span>
                      <span className="text-[10px] font-heading font-semibold text-accent">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
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
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] ms-auto">
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
                <span className="text-xs font-heading font-semibold text-amber-600 dark:text-amber-400">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {contract.currency_code}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-body font-semibold text-foreground">{isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total (incl. VAT)'}</span>
                <span className="text-sm font-heading font-bold text-accent">{grandTotalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {contract.currency_code}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-body">{isRTL ? 'المسدد' : 'Paid'}</span>
                <span className="text-xs font-heading font-semibold text-emerald-600 dark:text-emerald-400">{paymentsTotals.paid.toLocaleString()} {contract.currency_code}</span>
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
                  <Progress value={(paymentsTotals.paid / grandTotalWithVat) * 100} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </div>

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
                        <div key={pay.id} className={`rounded-xl border p-4 transition-all ${isPaid ? 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/10' : isOverdue ? 'border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10' : 'border-border bg-card'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                                {isPaid ? <CheckCircle2 className="w-4 h-4" /> : pay.installment_number}
                              </div>
                              <div>
                                <p className="font-heading font-bold text-xs">{isRTL ? `الدفعة ${pay.installment_number}` : `Payment ${pay.installment_number}`}</p>
                                <p className="text-[9px] text-muted-foreground font-body">{ratio}% {isRTL ? 'من الإجمالي' : 'of total'}</p>
                              </div>
                            </div>
                            <Badge className={`text-[9px] ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                              {isPaid ? (isRTL ? 'مسدد' : 'Paid') : isOverdue ? (isRTL ? 'متأخر' : 'Overdue') : (isRTL ? 'معلق' : 'Pending')}
                            </Badge>
                          </div>
                          <p className="font-heading font-bold text-lg text-foreground">{Number(pay.amount).toLocaleString()} <span className="text-xs text-muted-foreground">{plan.currency_code}</span></p>
                          <div className="mt-2 space-y-1 text-[10px] text-muted-foreground font-body">
                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{isRTL ? 'الاستحقاق:' : 'Due:'} {formatDate(pay.due_date)}</div>
                            {isPaid && pay.paid_at && <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />{isRTL ? 'تم السداد:' : 'Paid:'} {formatDate(pay.paid_at)}</div>}
                            {pay.payment_method && <div className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{pay.payment_method === 'bank_transfer' ? (isRTL ? 'تحويل بنكي' : 'Bank Transfer') : pay.payment_method}</div>}
                          </div>
                          {pay.notes && <p className="mt-2 text-[10px] text-muted-foreground/80 font-body border-t border-border pt-2">{pay.notes}</p>}
                          <Progress value={isPaid ? 100 : 0} className="h-1 mt-2" />
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
                        ? <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400"><PenTool className="w-3 h-3" /><span className="text-[10px]">{isRTL ? 'تم التوقيع' : 'Signed'} · {formatDate(party.accepted)}</span></div>
                        : <span className="text-[10px] text-muted-foreground/50">{isRTL ? 'لم يتم التوقيع' : 'Not signed'}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </ClauseSection>
          </div>
        )}

        {/* ─── Lock Banner ─── */}
        {isContractLocked && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-300">
            <Shield className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-heading font-bold text-xs">{isRTL ? 'العقد معتمد ومقفل' : 'Contract Approved & Locked'}</p>
              <p className="text-[10px] font-body">{isRTL ? 'أي تعديل يتطلب ملحق عقد وموافقة الطرفين' : 'Any changes require an amendment approved by both parties'}</p>
            </div>
          </div>
        )}

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap mb-4 sm:mb-6 gap-1">
            {[
              { value: 'milestones', icon: ListChecks, label: isRTL ? 'المراحل' : 'Milestones', count: totalMilestones },
              { value: 'measurements', icon: Ruler, label: isRTL ? 'المقاسات' : 'Measurements', count: measurements?.length || 0 },
              { value: 'warranty', icon: Shield, label: isRTL ? 'الضمان' : 'Warranty', count: warranties?.length || 0 },
              { value: 'maintenance', icon: Wrench, label: isRTL ? 'الصيانة' : 'Maintenance', count: maintenanceReqs?.length || 0 },
              { value: 'notes', icon: StickyNote, label: isRTL ? 'الملاحظات' : 'Notes', count: notes?.length || 0 },
              { value: 'attachments', icon: Paperclip, label: isRTL ? 'المرفقات' : 'Attachments', count: attachments?.length || 0 },
              { value: 'amendments', icon: FileText, label: isRTL ? 'الملاحق' : 'Amendments', count: amendments?.length || 0 },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-4 py-2 gap-1.5 text-xs sm:text-sm">
                <tab.icon className="w-3.5 h-3.5" />{tab.label} ({tab.count})
              </TabsTrigger>
            ))}
          </TabsList>

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
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1"><Shield className="w-3 h-3" />{isRTL ? 'المراحل مقفلة - استخدم ملحق العقد للتعديل' : 'Milestones locked - use amendments to modify'}</div>
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
                  <div key={m.id} className={`rounded-xl border transition-all ${isComp ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-card border-border'} ${isExpanded ? 'ring-1 ring-accent/30' : ''}`}>
                    <button onClick={() => setExpandedMilestone(isExpanded ? null : m.id)} className="w-full p-3 sm:p-5 text-start">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isComp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
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
                                <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-accent hover:underline font-body bg-accent/5 rounded-lg px-3 py-1.5 border border-accent/10">
                                  <Paperclip className="w-3 h-3" />{a.file_name}<ExternalLink className="w-2.5 h-2.5" />
                                </a>
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
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingImportIdx(editingImportIdx === idx ? null : idx)}>
                                  <PenTool className="w-3 h-3 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeImportedRow(idx)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
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
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1"><Shield className="w-3 h-3" />{isRTL ? 'المقاسات مقفلة - المجموع النهائي يحدد قيمة العقد' : 'Measurements locked - total determines contract value'}</div>
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
                  <span>{isRTL ? 'المبلغ قبل الضريبة:' : 'Before VAT:'} <strong className="text-foreground">{(vatInclusive ? measurementsTotals.totalCost - (measurementsTotals.totalCost * vatRate / (100 + vatRate)) : measurementsTotals.totalCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
                  <span>{isRTL ? `ضريبة ${vatRate}%:` : `VAT ${vatRate}%:`} <strong className="text-amber-600 dark:text-amber-400">{(vatInclusive ? measurementsTotals.totalCost * vatRate / (100 + vatRate) : measurementsTotals.totalCost * vatRate / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
                  <span>{isRTL ? 'الإجمالي شامل الضريبة:' : 'Total incl. VAT:'} <strong className="text-accent">{(vatInclusive ? measurementsTotals.totalCost : measurementsTotals.totalCost + measurementsTotals.totalCost * vatRate / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> {contract.currency_code}</span>
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
                          return (
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
                              <td className="p-2.5"><Badge className={`${sCfg.bg} text-[9px]`}>{isRTL ? sCfg.label_ar : sCfg.label_en}</Badge></td>
                              {!isContractLocked && (
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditMeasurement(m)} title={isRTL ? 'تعديل' : 'Edit'}>
                                      <PenTool className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMeasurementMutation.mutate(m.id)} title={isRTL ? 'حذف' : 'Delete'}>
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
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
                        <tr className="border-t border-border bg-amber-50/50 dark:bg-amber-950/10 font-heading text-xs">
                          <td colSpan={5} className="p-2.5 flex items-center gap-1">
                            <Percent className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-700 dark:text-amber-400">{isRTL ? `ضريبة القيمة المضافة (${vatRate}%)` : `VAT (${vatRate}%)`}</span>
                            {vatInclusive && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] ms-1">{isRTL ? 'مشمولة' : 'Included'}</Badge>}
                          </td>
                          <td className="p-2.5" dir="ltr"></td>
                          <td className="p-2.5"></td>
                          <td className="p-2.5 text-amber-600 dark:text-amber-400 font-semibold" dir="ltr">
                            {(vatInclusive ? measurementsTotals.totalCost * vatRate / (100 + vatRate) : measurementsTotals.totalCost * vatRate / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5"></td>
                          {!isContractLocked && <td className="p-2.5"></td>}
                        </tr>
                        <tr className="border-t border-border bg-accent/5 font-heading font-bold text-xs">
                          <td colSpan={5} className="p-2.5 text-accent">{isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total (incl. VAT)'}</td>
                          <td className="p-2.5" dir="ltr"></td>
                          <td className="p-2.5"></td>
                          <td className="p-2.5 text-accent text-sm" dir="ltr">
                            {(vatInclusive ? measurementsTotals.totalCost : measurementsTotals.totalCost + measurementsTotals.totalCost * vatRate / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                      <div className={`px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between ${isActive ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : isExpired ? 'bg-red-50/30 dark:bg-red-950/10' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'}`}>
                            {isActive ? <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <ShieldX className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-sm">{wTitle}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className="text-[9px]">{w.warranty_type === 'comprehensive' ? (isRTL ? 'شامل' : 'Comprehensive') : w.warranty_type}</Badge>
                              {w.ref_id && <span className="text-[9px] text-muted-foreground font-body" dir="ltr">#{w.ref_id}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
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
                          <Progress value={wProg} className="h-2" />
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
                              {linkedWarranty && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] gap-0.5"><Shield className="w-2.5 h-2.5" />{isRTL ? 'ضمان' : 'Warranty'}</Badge>}
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
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-800/30">
                              <p className="text-[10px] font-heading font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{isRTL ? 'ملاحظات الحل' : 'Resolution'}</p>
                              <p className="text-xs text-muted-foreground font-body leading-relaxed">{req.resolution_notes}</p>
                            </div>
                          )}
                          {req.completed_at && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-body">
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
                        {isOwn && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteNote.mutate(n.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
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
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" multiple />
              <Button variant="outline" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? (isRTL ? 'جاري الرفع...' : 'Uploading...') : (isRTL ? 'رفع مرفق' : 'Upload File')}
              </Button>
              {attachments && attachments.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-body ms-auto">
                  {attachments.length} {isRTL ? 'ملف' : 'files'} — {attachments.filter(a => a.file_type.startsWith('image')).length} {isRTL ? 'صور' : 'images'}, {attachments.filter(a => !a.file_type.startsWith('image')).length} {isRTL ? 'مستندات' : 'docs'}
                </span>
              )}
            </div>
            {attachments && attachments.length > 0 ? (
              <div className="space-y-5">
                {/* Image gallery */}
                {attachments.filter(a => a.file_type.startsWith('image')).length > 0 && (
                  <div>
                    <h3 className="font-heading font-bold text-xs mb-3 flex items-center gap-1.5">
                      <FileImage className="w-3.5 h-3.5 text-accent" />
                      {isRTL ? 'معرض الصور' : 'Photo Gallery'} ({attachments.filter(a => a.file_type.startsWith('image')).length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {attachments.filter(a => a.file_type.startsWith('image')).map(att => (
                        <div key={att.id} className="group relative rounded-xl overflow-hidden border border-border bg-muted hover:border-accent/50 hover:shadow-md transition-all">
                          <div className="aspect-[4/3]">
                            <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2">
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Eye className="w-4 h-4" /></Button>
                            </a>
                            <a href={att.file_url} download={att.file_name}>
                              <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Download className="w-4 h-4" /></Button>
                            </a>
                          </div>
                          <div className="p-2 bg-card border-t border-border">
                            <p className="font-heading font-medium text-[10px] truncate">{att.file_name}</p>
                            <p className="text-[9px] text-muted-foreground font-body">{formatDate(att.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Document list */}
                {attachments.filter(a => !a.file_type.startsWith('image')).length > 0 && (
                  <div>
                    <h3 className="font-heading font-bold text-xs mb-3 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-accent" />{isRTL ? 'المستندات والملفات' : 'Documents & Files'} ({attachments.filter(a => !a.file_type.startsWith('image')).length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.filter(a => !a.file_type.startsWith('image')).map(att => {
                        const linkedMilestone = milestones?.find(m => m.id === att.milestone_id);
                        const ext = att.file_name.split('.').pop()?.toUpperCase() || 'FILE';
                        const extColors: Record<string, string> = { PDF: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', DOC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', DOCX: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', XLS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', XLSX: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                        return (
                          <div key={att.id} className="p-3.5 rounded-xl bg-card border border-border flex items-center gap-3 hover:border-accent/30 hover:shadow-sm transition-all group">
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 font-heading font-bold text-[10px] ${extColors[ext] || 'bg-muted text-muted-foreground'}`}>
                              {ext}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-heading font-medium text-xs truncate">{att.file_name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-body mt-0.5">
                                <span>{formatDate(att.created_at)}</span>
                                {linkedMilestone && (
                                  <Badge variant="outline" className="text-[8px] gap-0.5">
                                    <ListChecks className="w-2.5 h-2.5" />{(language === 'ar' ? linkedMilestone.title_ar : (linkedMilestone.title_en || linkedMilestone.title_ar)).slice(0, 20)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-3.5 h-3.5" /></Button></a>
                            <a href={att.file_url} download={att.file_name}><Button variant="outline" size="icon" className="h-8 w-8"><Download className="w-3.5 h-3.5" /></Button></a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl border border-dashed border-border">
                <Paperclip className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-body text-sm mb-1">{isRTL ? 'لا توجد مرفقات بعد' : 'No attachments yet'}</p>
                <p className="text-[10px] text-muted-foreground/60 font-body">{isRTL ? 'ارفع الصور والمستندات المتعلقة بالعقد' : 'Upload photos and documents related to the contract'}</p>
              </div>
            )}
          </TabsContent>

          {/* ── Amendments ── */}
          <TabsContent value="amendments">
            {isContractLocked && (isProvider || isClient) && (
              <div className="mb-4">
                {showAmendmentForm ? (
                  <div className="p-4 rounded-xl bg-card border-2 border-dashed border-primary/30 space-y-3">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-accent" />{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder={isRTL ? 'عنوان التعديل *' : 'Amendment title *'} value={amForm.title_ar} onChange={e => setAmForm(f => ({ ...f, title_ar: e.target.value }))} className="text-sm" />
                      <Select value={amForm.amendment_type} onValueChange={v => setAmForm(f => ({ ...f, amendment_type: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scope_change">{isRTL ? 'تعديل نطاق العمل' : 'Scope Change'}</SelectItem>
                          <SelectItem value="financial">{isRTL ? 'تعديل مالي' : 'Financial'}</SelectItem>
                          <SelectItem value="extension">{isRTL ? 'تمديد المدة' : 'Extension'}</SelectItem>
                          <SelectItem value="other">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea placeholder={isRTL ? 'وصف التعديل المطلوب...' : 'Describe the amendment...'} value={amForm.description_ar} onChange={e => setAmForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} className="text-sm" />
                    {amForm.amendment_type === 'financial' && (
                      <Input type="number" placeholder={isRTL ? 'المبلغ الجديد' : 'New Amount'} value={amForm.new_amount} onChange={e => setAmForm(f => ({ ...f, new_amount: e.target.value }))} dir="ltr" className="text-sm" />
                    )}
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" className="gap-1.5 text-xs" disabled={!amForm.title_ar || addAmendmentMutation.isPending} onClick={() => addAmendmentMutation.mutate()}>
                        <Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال الطلب' : 'Submit'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAmendmentForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="gap-1.5 text-xs" onClick={() => setShowAmendmentForm(true)}><Plus className="w-3.5 h-3.5" />{isRTL ? 'طلب ملحق عقد' : 'Request Amendment'}</Button>
                )}
              </div>
            )}
            {!isContractLocked && <p className="text-center py-4 text-muted-foreground text-xs">{isRTL ? 'العقد لم يُعتمد بعد - يمكنك تعديله مباشرة من الأقسام الأخرى' : 'Contract not yet approved - you can edit it directly'}</p>}
            {amendments && amendments.length > 0 ? (
              <div className="space-y-3">
                {amendments.map((a) => {
                  const canApprove = a.status === 'pending' && ((isClient && !a.client_approved_at) || (isProvider && !a.provider_approved_at));
                  const typeLabels: Record<string, string> = { scope_change: isRTL ? 'نطاق العمل' : 'Scope', financial: isRTL ? 'مالي' : 'Financial', extension: isRTL ? 'تمديد' : 'Extension', other: isRTL ? 'أخرى' : 'Other' };
                  return (
                    <div key={a.id} className={`p-4 rounded-xl border ${a.status === 'approved' ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-800/20 dark:bg-emerald-950/10' : a.status === 'rejected' ? 'border-red-200/50 bg-red-50/30' : 'border-amber-200/50 bg-amber-50/30 dark:border-amber-800/20 dark:bg-amber-950/10'}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-heading font-bold text-sm">{a.title_ar}</h4>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px]">{typeLabels[a.amendment_type] || a.amendment_type}</Badge>
                          <Badge variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {a.status === 'approved' ? (isRTL ? 'معتمد' : 'Approved') : a.status === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected') : (isRTL ? 'بانتظار الموافقة' : 'Pending')}
                          </Badge>
                        </div>
                      </div>
                      {a.description_ar && <p className="text-xs text-muted-foreground font-body mb-2">{a.description_ar}</p>}
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-body">
                        {a.new_amount && <span className="font-medium">{isRTL ? 'المبلغ الجديد:' : 'New amount:'} <strong className="text-accent">{Number(a.new_amount).toLocaleString()} {contract.currency_code}</strong></span>}
                        <span>{isRTL ? 'العميل:' : 'Client:'} {a.client_approved_at ? '✅' : '⏳'}</span>
                        <span>{isRTL ? 'المزود:' : 'Provider:'} {a.provider_approved_at ? '✅' : '⏳'}</span>
                        <span>{formatDate(a.created_at)}</span>
                      </div>
                      {canApprove && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 mt-3 text-emerald-600 border-emerald-300" onClick={() => approveAmendmentMutation.mutate(a)}>
                          <CheckCircle2 className="w-3 h-3" />{isRTL ? 'موافقة على الملحق' : 'Approve Amendment'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : isContractLocked ? (
              <div className="text-center py-8"><FileText className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" /><p className="text-muted-foreground font-body text-sm">{isRTL ? 'لا توجد ملاحق بعد' : 'No amendments yet'}</p></div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default ContractDetail;
