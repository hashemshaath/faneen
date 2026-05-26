import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout as RealDashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAdminEmbedded } from '@/contexts/AdminTabsContext';
/** Phase B: when embedded inside AdminContactCenter tabs, the parent already
 *  renders DashboardLayout, so this wrapper collapses to a Fragment. */
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const embedded = useAdminEmbedded();
  return embedded ? <>{children}</> : <RealDashboardLayout>{children}</RealDashboardLayout>;
};
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { runWeeklySlaReport, triageContactMessage } from '@/modules/contact';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Mail, Search, Clock, CheckCircle, Archive, Loader2,
  Download, MailOpen, Inbox, User, Star, Flame, Copy, Trash2, Link2,
  ChevronLeft, ChevronRight, StickyNote, RefreshCw, Lock,
  Calendar, ArrowUpDown, LayoutList, Rows, Printer, Reply,
  AlertTriangle, Timer, TrendingUp, Sparkles, MailX, MoreHorizontal,
  PanelRightOpen, PanelRightClose,
  Brain, FileBarChart,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, isToday, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { maskEmail } from '@/lib/masking';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  exportContactsCSV, exportContactsPDF,
  ALL_EXPORT_FIELDS, DEFAULT_EXPORT_FIELDS,
  fieldLabel, type ContactExportField, type ContactExportRow,
} from '@/lib/contact-pdf-export';

type Status = 'new' | 'read' | 'under_review' | 'replied' | 'closed' | 'archived';
type WorkState = 'ready' | 'in_progress' | 'done' | 'blocked';
type Priority = 'low' | 'normal' | 'high' | 'urgent';
type SortKey = 'newest' | 'oldest' | 'priority' | 'unread';
type DateRange = 'all' | 'today' | '7d' | '30d';
type Density = 'comfortable' | 'compact';

interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: Status;
  priority: Priority;
  starred: boolean;
  internal_notes: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  work_state: WorkState;
  ticket_number: string | null;
  closed_at: string | null;
  ai_priority: Priority | null;
  ai_category: string | null;
  ai_summary: string | null;
  ai_suggested_reply: string | null;
  ai_processed_at: string | null;
}

interface ContactEvent {
  id: string;
  message_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
}

interface AdminAssignee {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

const statusConfig: Record<Status, { ar: string; en: string; color: string; icon: React.ElementType }> = {
  new:      { ar: 'جديد',    en: 'New',      color: 'bg-info/10 text-info border-info/30',         icon: Mail },
  read:     { ar: 'مقروء',   en: 'Read',     color: 'bg-warning/10 text-warning border-warning/30',      icon: MailOpen },
  under_review: { ar: 'تحت المراجعة', en: 'Under review', color: 'bg-secondary/10 text-secondary border-secondary/30', icon: Brain },
  replied:  { ar: 'تم الرد', en: 'Replied',  color: 'bg-success/10 text-success border-success/30', icon: CheckCircle },
  closed:   { ar: 'مغلق',    en: 'Closed',   color: 'bg-slate-500/10 text-slate-700 border-slate-500/30',      icon: Lock },
  archived: { ar: 'مؤرشف',   en: 'Archived', color: 'bg-muted text-muted-foreground border-border',             icon: Archive },
};

const workStateConfig: Record<WorkState, { ar: string; en: string; color: string }> = {
  ready:       { ar: 'جاهز',         en: 'Ready',       color: 'bg-info/10 text-info border-info/30' },
  in_progress: { ar: 'قيد المعالجة', en: 'In progress', color: 'bg-warning/10 text-warning border-warning/30' },
  done:        { ar: 'منجز',         en: 'Done',        color: 'bg-success/10 text-success border-success/30' },
  blocked:     { ar: 'متوقف',        en: 'Blocked',     color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const priorityConfig: Record<Priority, { ar: string; en: string; color: string; weight: number }> = {
  low:    { ar: 'منخفض', en: 'Low',    color: 'bg-slate-500/10 text-slate-600 border-slate-500/30',    weight: 0 },
  normal: { ar: 'عادي',  en: 'Normal', color: 'bg-info/10 text-info border-info/30',       weight: 1 },
  high:   { ar: 'مرتفع', en: 'High',   color: 'bg-urgent/10 text-urgent border-urgent/30', weight: 2 },
  urgent: { ar: 'عاجل',  en: 'Urgent', color: 'bg-destructive/10 text-destructive border-destructive/30',          weight: 3 },
};

const replyTemplates = [
  {
    id: 'received',
    labelAr: 'استلام الرسالة',
    labelEn: 'Acknowledge receipt',
    bodyAr: 'مرحباً {name}،\n\nشكراً لتواصلك مع قِطاعات. استلمنا رسالتك وسيقوم فريقنا بالرد عليك خلال 24 ساعة عمل.\n\nمع تحيات فريق قِطاعات',
    bodyEn: 'Hi {name},\n\nThanks for reaching out to Qitaat. We have received your message and a team member will respond within 24 business hours.\n\nBest regards,\nThe Qitaat Team',
  },
  {
    id: 'info',
    labelAr: 'طلب معلومات إضافية',
    labelEn: 'Request more info',
    bodyAr: 'مرحباً {name}،\n\nشكراً لرسالتك. لمساعدتك بشكل أفضل، نحتاج إلى تفاصيل إضافية حول طلبك (الموقع، الميزانية، الجدول الزمني).\n\nمع تحيات فريق قِطاعات',
    bodyEn: 'Hi {name},\n\nThanks for your message. To assist you better, we need a bit more detail (location, budget, timeline).\n\nBest regards,\nThe Qitaat Team',
  },
  {
    id: 'resolved',
    labelAr: 'تم حل الطلب',
    labelEn: 'Resolution confirmed',
    bodyAr: 'مرحباً {name}،\n\nسعدنا بمساعدتك. تم تنفيذ طلبك بنجاح. لا تتردد في التواصل معنا لأي استفسار آخر.\n\nمع تحيات فريق قِطاعات',
    bodyEn: 'Hi {name},\n\nGlad we could help. Your request has been completed. Feel free to reach out anytime.\n\nBest regards,\nThe Qitaat Team',
  },
];

const PAGE_SIZE = 25;

const AdminContactMessages = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') || 'all';
  const priorityFilter = searchParams.get('priority') || 'all';
  const assigneeFilter = searchParams.get('assignee') || 'all'; // 'all' | 'me' | 'unassigned' | <uuid>
  const workStateFilter = searchParams.get('work') || 'all';
  const search = searchParams.get('q') || '';
  const starredOnly = searchParams.get('starred') === '1';
  const dateRange = (searchParams.get('range') as DateRange) || 'all';
  const sortKey = (searchParams.get('sort') as SortKey) || 'newest';
  const quickChip = searchParams.get('chip') || ''; // unread | stale | today | urgent | notes
  const page = parseInt(searchParams.get('page') || '1', 10);
  const focusedId = searchParams.get('id');

  const [searchInput, setSearchInput] = useState(search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [splitView, setSplitView] = useState<boolean>(() => localStorage.getItem('qitaat_cm_split') === '1');
  const [density, setDensity] = useState<Density>(() => (localStorage.getItem('qitaat_cm_density') as Density) || 'comfortable');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exportFields, setExportFields] = useState<ContactExportField[]>(DEFAULT_EXPORT_FIELDS);
  const [exportScope, setExportScope] = useState<'filtered' | 'selected'>('filtered');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { localStorage.setItem('qitaat_cm_split', splitView ? '1' : '0'); }, [splitView]);
  useEffect(() => { localStorage.setItem('qitaat_cm_density', density); }, [density]);

  const updateParam = useCallback((updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') sp.delete(k);
      else sp.set(k, v);
    });
    setSearchParams(sp, { replace: false });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) updateParam({ q: searchInput || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  useEffect(() => { setSearchInput(search); }, [search]);

  const { data: messages = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ContactMessage[];
    },
  });

  // Admin assignees (for assignment + filter)
  const { data: assignees = [] } = useQuery({
    queryKey: ['admin-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_admin_assignees');
      if (error) throw error;
      return (data || []) as AdminAssignee[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const assigneeMap = useMemo(() => {
    const m = new Map<string, AdminAssignee>();
    assignees.forEach(a => m.set(a.user_id, a));
    return m;
  }, [assignees]);

  // Activity feed for focused message
  const { data: events = [] } = useQuery({
    queryKey: ['contact-message-events', focusedId],
    enabled: !!focusedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_message_events')
        .select('*')
        .eq('message_id', focusedId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as ContactEvent[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('admin-contact-messages-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_message_events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['contact-message-events'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<ContactMessage> }) => {
      // Auto-set replied_at / replied_by when transitioning to "replied"
      const finalPatch: Partial<ContactMessage> = { ...patch };
      if (patch.status === 'replied') {
        finalPatch.replied_at = new Date().toISOString();
        if (user?.id) finalPatch.replied_by = user.id;
      }
      if (patch.status === 'closed') {
        finalPatch.closed_at = new Date().toISOString();
      }
      if (patch.assigned_to !== undefined) {
        finalPatch.assigned_at = patch.assigned_to ? new Date().toISOString() : null;
      }
      const { error } = await supabase.from('contact_messages').update(finalPatch).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      toast.success(isRTL ? `تم التحديث (${vars.ids.length})` : `Updated (${vars.ids.length})`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل التحديث' : 'Update failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('contact_messages').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      setSelectedIds(new Set());
      if (focusedId && ids.includes(focusedId)) updateParam({ id: null });
      toast.success(isRTL ? `تم الحذف (${ids.length})` : `Deleted (${ids.length})`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل الحذف' : 'Delete failed')),
  });

  // Apply chip → effective filter sets
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = Date.now();
    let cutoff: Date | null = null;
    if (dateRange === 'today') cutoff = new Date(new Date().setHours(0, 0, 0, 0));
    else if (dateRange === '7d') cutoff = subDays(new Date(), 7);
    else if (dateRange === '30d') cutoff = subDays(new Date(), 30);

    const list = messages.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && m.priority !== priorityFilter) return false;
      if (workStateFilter !== 'all' && m.work_state !== workStateFilter) return false;
      if (assigneeFilter === 'me' && m.assigned_to !== user?.id) return false;
      else if (assigneeFilter === 'unassigned' && m.assigned_to) return false;
      else if (assigneeFilter !== 'all' && assigneeFilter !== 'me' && assigneeFilter !== 'unassigned' && m.assigned_to !== assigneeFilter) return false;
      if (starredOnly && !m.starred) return false;
      if (cutoff && new Date(m.created_at) < cutoff) return false;
      if (quickChip === 'unread' && m.status !== 'new') return false;
      if (quickChip === 'urgent' && m.priority !== 'urgent') return false;
      if (quickChip === 'notes' && !m.internal_notes) return false;
      if (quickChip === 'today' && !isToday(new Date(m.created_at))) return false;
      if (quickChip === 'stale') {
        // Unanswered for more than 24h
        if (m.status === 'replied' || m.status === 'archived') return false;
        if (now - new Date(m.created_at).getTime() < 24 * 60 * 60 * 1000) return false;
      }
      if (q) {
        const hay = `${m.name} ${m.email} ${m.subject || ''} ${m.message} ${m.internal_notes || ''} ${m.ticket_number || ''} ${m.ai_summary || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sort
    return [...list].sort((a, b) => {
      if (sortKey === 'oldest') return +new Date(a.created_at) - +new Date(b.created_at);
      if (sortKey === 'priority') {
        const d = priorityConfig[b.priority].weight - priorityConfig[a.priority].weight;
        if (d !== 0) return d;
        return +new Date(b.created_at) - +new Date(a.created_at);
      }
      if (sortKey === 'unread') {
        const ai = a.status === 'new' ? 0 : 1;
        const bi = b.status === 'new' ? 0 : 1;
        if (ai !== bi) return ai - bi;
        return +new Date(b.created_at) - +new Date(a.created_at);
      }
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
  }, [messages, statusFilter, priorityFilter, workStateFilter, assigneeFilter, user?.id, starredOnly, search, dateRange, quickChip, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { new: 0, read: 0, replied: 0, archived: 0 };
    messages.forEach(m => { c[m.status] = (c[m.status] || 0) + 1; });
    return c;
  }, [messages]);

  // SLA / pro KPIs
  const kpis = useMemo(() => {
    const replied = messages.filter(m => m.replied_at);
    const responseHours = replied.map(m => differenceInHours(new Date(m.replied_at!), new Date(m.created_at)));
    const avgHours = responseHours.length ? Math.round((responseHours.reduce((s, h) => s + h, 0) / responseHours.length) * 10) / 10 : null;
    const stale = messages.filter(m =>
      (m.status === 'new' || m.status === 'read') &&
      Date.now() - new Date(m.created_at).getTime() > 24 * 60 * 60 * 1000
    ).length;
    const todayCount = messages.filter(m => isToday(new Date(m.created_at))).length;
    const total = messages.length;
    const responseRate = total ? Math.round((replied.length / total) * 100) : 0;
    return { avgHours, stale, todayCount, responseRate };
  }, [messages]);

  const focused = useMemo(() => messages.find(m => m.id === focusedId) || null, [messages, focusedId]);

  useEffect(() => {
    if (focused && focused.status === 'new') {
      updateMutation.mutate({ ids: [focused.id], patch: { status: 'read' } });
    }
    if (focused) setNoteDraft(focused.internal_notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId]);

  const openMessage = (id: string) => updateParam({ id });
  const closeMessage = () => updateParam({ id: null });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (paged.every(m => selectedIds.has(m.id))) {
      setSelectedIds(prev => {
        const n = new Set(prev);
        paged.forEach(m => n.delete(m.id));
        return n;
      });
    } else {
      setSelectedIds(prev => {
        const n = new Set(prev);
        paged.forEach(m => n.add(m.id));
        return n;
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') { e.preventDefault(); document.getElementById('contact-search')?.focus(); }
      if (e.key === 'Escape' && focusedId) closeMessage();
      if (focusedId && filtered.length) {
        const idx = filtered.findIndex(m => m.id === focusedId);
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = filtered[Math.min(filtered.length - 1, idx + 1)];
          if (next) openMessage(next.id);
        }
        if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = filtered[Math.max(0, idx - 1)];
          if (prev) openMessage(prev.id);
        }
        if (e.key === 'e') updateMutation.mutate({ ids: [focusedId], patch: { status: 'archived' } });
        if (e.key === 'r') updateMutation.mutate({ ids: [focusedId], patch: { status: 'replied' } });
        if (e.key === 'u') updateMutation.mutate({ ids: [focusedId], patch: { status: 'new' } });
        if (e.key === 's') updateMutation.mutate({ ids: [focusedId], patch: { starred: !focused?.starred } });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, filtered, focused]);

  const buildExportRows = useCallback((source: ContactMessage[]): ContactExportRow[] =>
    source.map(m => ({
      ticket_number: m.ticket_number,
      name: m.name,
      email: isSuperAdmin ? m.email : maskEmail(m.email),
      subject: m.subject,
      message: m.message,
      status: m.status,
      priority: m.priority,
      work_state: m.work_state,
      assigned_to_name: m.assigned_to ? (assigneeMap.get(m.assigned_to)?.full_name || assigneeMap.get(m.assigned_to)?.email || '—') : '',
      starred: m.starred,
      internal_notes: m.internal_notes,
      created_at: format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
      replied_at: m.replied_at ? format(new Date(m.replied_at), 'yyyy-MM-dd HH:mm') : null,
      response_hours: m.replied_at ? differenceInHours(new Date(m.replied_at), new Date(m.created_at)) : null,
      ai_priority: m.ai_priority,
      ai_category: m.ai_category,
      ai_summary: m.ai_summary,
    })),
  [isSuperAdmin, assigneeMap]);

  const buildFilterSummary = useCallback(() => {
    const parts: string[] = [];
    if (statusFilter !== 'all') parts.push(`status=${statusFilter}`);
    if (priorityFilter !== 'all') parts.push(`priority=${priorityFilter}`);
    if (workStateFilter !== 'all') parts.push(`work=${workStateFilter}`);
    if (assigneeFilter !== 'all') parts.push(`assignee=${assigneeFilter}`);
    if (dateRange !== 'all') parts.push(`range=${dateRange}`);
    if (starredOnly) parts.push('starred');
    if (quickChip) parts.push(`chip=${quickChip}`);
    if (search) parts.push(`q="${search}"`);
    return parts.join(' · ');
  }, [statusFilter, priorityFilter, workStateFilter, assigneeFilter, dateRange, starredOnly, quickChip, search]);

  const runExport = async () => {
    if (!isSuperAdmin && exportFields.some(f => f === 'email' || f === 'message' || f === 'internal_notes')) {
      toast.error(isRTL
        ? 'بعض الحقول تحتوي على بيانات حساسة — Super Admin فقط.'
        : 'Some fields contain sensitive data — Super Admin only.');
      return;
    }
    if (exportFields.length === 0) {
      toast.error(isRTL ? 'اختر حقلاً واحداً على الأقل' : 'Select at least one field');
      return;
    }
    const source = exportScope === 'selected'
      ? filtered.filter(m => selectedIds.has(m.id))
      : filtered;
    if (source.length === 0) {
      toast.error(isRTL ? 'لا توجد رسائل للتصدير' : 'No messages to export');
      return;
    }
    setIsExporting(true);
    try {
      const rows = buildExportRows(source);
      if (exportFormat === 'csv') {
        exportContactsCSV(rows, exportFields, isRTL);
      } else {
        await exportContactsPDF(rows, exportFields, isRTL, {
          totalCount: messages.length,
          filterSummary: buildFilterSummary(),
        });
      }
      toast.success(isRTL ? `تم تصدير ${rows.length} رسالة` : `Exported ${rows.length} messages`);
      setShowExportPanel(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل التصدير' : 'Export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const copyDeepLink = (id: string) => {
    const url = `${window.location.origin}/admin/contact-messages?id=${id}`;
    navigator.clipboard.writeText(url);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
  };

  const printMessage = () => {
    if (!focused) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const safe = (s: string) => s.replace(/</g, '&lt;');
    w.document.write(`
      <html><head><title>${safe(focused.subject || 'Message')}</title>
      <style>body{font-family:system-ui;padding:32px;max-width:720px;margin:auto;line-height:1.6;color:#1A2230}h1{font-size:20px}.meta{color:#6B7689;font-size:13px;margin-bottom:24px}.body{white-space:pre-wrap;border-top:1px solid #E2E6EE;padding-top:16px}</style>
      </head><body>
      <h1>${safe(focused.subject || '(No subject)')}</h1>
      <div class="meta"><strong>${safe(focused.name)}</strong> · ${safe(focused.email)}<br/>${format(new Date(focused.created_at), 'yyyy-MM-dd HH:mm')}</div>
      <div class="body">${safe(focused.message)}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const useReplyTemplate = (tplId: string) => {
    if (!focused || !isSuperAdmin) return;
    const tpl = replyTemplates.find(t => t.id === tplId);
    if (!tpl) return;
    const body = (isRTL ? tpl.bodyAr : tpl.bodyEn).replace(/\{name\}/g, focused.name);
    const subject = `Re: ${focused.subject || (isRTL ? 'تواصل قِطاعات' : 'Qitaat enquiry')}`;
    const url = `mailto:${focused.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const dateLocale = isRTL ? ar : undefined;

  // Quick chips definition
  const chips: { id: string; ar: string; en: string; icon: React.ElementType; tone: string }[] = [
    { id: 'unread', ar: 'غير مقروءة',         en: 'Unread',          icon: Mail,          tone: 'bg-info/10 text-info border-info/30' },
    { id: 'today',  ar: 'اليوم',               en: 'Today',           icon: Calendar,      tone: 'bg-secondary/10 text-secondary border-secondary/30' },
    { id: 'stale',  ar: 'بدون رد > 24س',       en: 'Stale > 24h',     icon: Timer,         tone: 'bg-urgent/10 text-urgent border-urgent/30' },
    { id: 'urgent', ar: 'عاجل',                en: 'Urgent',          icon: Flame,         tone: 'bg-destructive/10 text-destructive border-destructive/30' },
    { id: 'notes',  ar: 'تحتوي ملاحظات',       en: 'Has notes',       icon: StickyNote,    tone: 'bg-warning/10 text-warning border-warning/30' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-accent" />
              </div>
              {isRTL ? 'صندوق رسائل التواصل' : 'Contact Inbox'}
              <Badge variant="outline" className="text-xs h-5">{messages.length}</Badge>
              {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-muted-foreground font-body mt-1 text-sm">
              {isRTL
                ? 'لوحة احترافية لإدارة الرسائل: مؤشرات الأداء، قوالب رد، عرض مقسوم، اختصارات لوحة المفاتيح.'
                : 'Pro inbox: SLA KPIs, reply templates, split view, keyboard shortcuts.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={splitView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSplitView(s => !s)}
              className="gap-2 hidden xl:inline-flex"
              title={isRTL ? 'عرض مقسوم' : 'Split view'}
            >
              {splitView ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              {isRTL ? 'عرض مقسوم' : 'Split'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}
              className="gap-2"
              title={isRTL ? 'كثافة العرض' : 'Density'}
            >
              {density === 'compact' ? <LayoutList className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />{isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button
              variant={showExportPanel ? 'default' : 'outline'} size="sm"
              onClick={() => setShowExportPanel(s => !s)}
              disabled={!filtered.length} className="gap-2"
            >
              <Download className="w-4 h-4" />{isRTL ? 'تصدير' : 'Export'}
            </Button>
            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={async () => {
                const t = toast.loading(isRTL ? 'جارٍ توليد التقرير...' : 'Generating report...');
                const { data, error } = await runWeeklySlaReport() as { data: { ok?: boolean } | null; error: unknown };
                toast.dismiss(t);
                if (error || !data?.ok) {
                  toast.error(isRTL ? 'فشل توليد التقرير' : 'Report failed');
                  return;
                }
                toast.success(isRTL ? 'تم إرسال التقرير الأسبوعي للإدارة' : 'Weekly SLA report sent to admins');
              }}
            >
              <FileBarChart className="w-4 h-4" />{isRTL ? 'تقرير SLA الأسبوعي' : 'Weekly SLA'}
            </Button>
            {focused && (
              <Button
                variant="default" size="sm" className="gap-2"
                onClick={async () => {
                  const t = toast.loading(isRTL ? 'يحلّل الذكاء الاصطناعي الرسالة...' : 'AI analysing...');
                  const { data, error } = await triageContactMessage({ message_id: focused.id }) as { data: { error?: string; priority?: string; category?: string } | null; error: unknown };
                  toast.dismiss(t);
                  if (error || data?.error) {
                    toast.error(data?.error || (isRTL ? 'فشل الفرز الذكي' : 'Triage failed'));
                    return;
                  }
                  queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
                  toast.success(isRTL
                    ? `الفرز: ${data.priority || ''} · ${data.category || ''}`
                    : `Triage: ${data.priority || ''} · ${data.category || ''}`);
                }}
              >
                <Brain className="w-4 h-4" />{isRTL ? 'فرز ذكي' : 'AI Triage'}
              </Button>
            )}
          </div>
        </div>

        {/* SLA / KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center"><Calendar className="w-4 h-4" /></div>
              <div>
                <p className="font-heading font-bold text-lg tech-content">{kpis.todayCount}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'رسائل اليوم' : 'Today'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`hover-lift cursor-pointer transition-all ${quickChip === 'stale' ? 'border-urgent ring-1 ring-urgent/30' : ''}`}
            onClick={() => updateParam({ chip: quickChip === 'stale' ? null : 'stale', page: null })}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-urgent/10 text-urgent flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
              <div>
                <p className="font-heading font-bold text-lg tech-content">{kpis.stale}</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'بدون رد > 24س' : 'Stale > 24h'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success/10 text-success flex items-center justify-center"><Timer className="w-4 h-4" /></div>
              <div>
                <p className="font-heading font-bold text-lg tech-content">
                  {kpis.avgHours !== null ? `${kpis.avgHours}س` : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'متوسط زمن الرد' : 'Avg response'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-info/10 text-info flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
              <div>
                <p className="font-heading font-bold text-lg tech-content">{kpis.responseRate}%</p>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'نسبة الرد' : 'Response rate'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status cards (clickable filters) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(statusConfig) as Status[]).map(key => {
            const cfg = statusConfig[key];
            const Icon = cfg.icon;
            const active = statusFilter === key;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover-lift ${active ? 'border-accent ring-1 ring-accent/30' : 'hover:border-accent/30'}`}
                onClick={() => updateParam({ status: active ? null : key, page: null })}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-lg tech-content">{statusCounts[key] || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? cfg.ar : cfg.en}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
                <Input
                  id="contact-search"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={isRTL ? 'بحث (اضغط / للتركيز)...' : 'Search (press / to focus)...'}
                  className="ps-10"
                  dir="auto"
                />
              </div>
              <Select value={priorityFilter} onValueChange={v => updateParam({ priority: v, page: null })}>
                <SelectTrigger className="w-full lg:w-40"><Flame className="w-4 h-4 me-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الأولويات' : 'All Priorities'}</SelectItem>
                  {(Object.keys(priorityConfig) as Priority[]).map(k => (
                    <SelectItem key={k} value={k}>{isRTL ? priorityConfig[k].ar : priorityConfig[k].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={v => updateParam({ range: v, page: null })}>
                <SelectTrigger className="w-full lg:w-36"><Calendar className="w-4 h-4 me-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الفترات' : 'All time'}</SelectItem>
                  <SelectItem value="today">{isRTL ? 'اليوم' : 'Today'}</SelectItem>
                  <SelectItem value="7d">{isRTL ? '٧ أيام' : 'Last 7 days'}</SelectItem>
                  <SelectItem value="30d">{isRTL ? '٣٠ يوم' : 'Last 30 days'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={v => updateParam({ sort: v === 'newest' ? null : v, page: null })}>
                <SelectTrigger className="w-full lg:w-40"><ArrowUpDown className="w-4 h-4 me-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{isRTL ? 'الأحدث أولاً' : 'Newest first'}</SelectItem>
                  <SelectItem value="oldest">{isRTL ? 'الأقدم أولاً' : 'Oldest first'}</SelectItem>
                  <SelectItem value="priority">{isRTL ? 'حسب الأولوية' : 'By priority'}</SelectItem>
                  <SelectItem value="unread">{isRTL ? 'غير المقروءة أولاً' : 'Unread first'}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={starredOnly ? 'default' : 'outline'}
                onClick={() => updateParam({ starred: starredOnly ? null : '1', page: null })}
                className="gap-2"
              >
                <Star className={`w-4 h-4 ${starredOnly ? 'fill-current' : ''}`} />
                {isRTL ? 'المهمة' : 'Starred'}
              </Button>
            </div>

            {/* Workflow filters: assignee + work state */}
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={assigneeFilter} onValueChange={v => updateParam({ assignee: v === 'all' ? null : v, page: null })}>
                <SelectTrigger className="w-full md:w-56"><User className="w-4 h-4 me-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل المسؤولين' : 'All assignees'}</SelectItem>
                  <SelectItem value="me">{isRTL ? 'مُعيَّنة لي' : 'Assigned to me'}</SelectItem>
                  <SelectItem value="unassigned">{isRTL ? 'غير مُعيَّنة' : 'Unassigned'}</SelectItem>
                  {assignees.map(a => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.full_name || a.email || a.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={workStateFilter} onValueChange={v => updateParam({ work: v === 'all' ? null : v, page: null })}>
                <SelectTrigger className="w-full md:w-44"><Timer className="w-4 h-4 me-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل حالات العمل' : 'All work states'}</SelectItem>
                  {(Object.keys(workStateConfig) as WorkState[]).map(k => (
                    <SelectItem key={k} value={k}>{isRTL ? workStateConfig[k].ar : workStateConfig[k].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inline export panel */}
            {showExportPanel && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Download className="w-4 h-4" />
                    {isRTL ? 'تصدير مخصص' : 'Custom export'}
                  </div>
                  <button
                    onClick={() => setShowExportPanel(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >×</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">{isRTL ? 'الصيغة' : 'Format'}</label>
                    <Select value={exportFormat} onValueChange={(v: 'csv' | 'pdf') => setExportFormat(v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (Excel)</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">{isRTL ? 'النطاق' : 'Scope'}</label>
                    <Select value={exportScope} onValueChange={(v: 'filtered' | 'selected') => setExportScope(v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filtered">{isRTL ? `كل المُفلترة (${filtered.length})` : `All filtered (${filtered.length})`}</SelectItem>
                        <SelectItem value="selected" disabled={selectedIds.size === 0}>
                          {isRTL ? `المحدد فقط (${selectedIds.size})` : `Selected only (${selectedIds.size})`}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      {isRTL ? `الحقول (${exportFields.length}/${ALL_EXPORT_FIELDS.length})` : `Fields (${exportFields.length}/${ALL_EXPORT_FIELDS.length})`}
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setExportFields(ALL_EXPORT_FIELDS)}
                        className="text-[10px] px-2 py-0.5 rounded border border-border hover:border-accent/40"
                      >{isRTL ? 'الكل' : 'All'}</button>
                      <button
                        type="button"
                        onClick={() => setExportFields(DEFAULT_EXPORT_FIELDS)}
                        className="text-[10px] px-2 py-0.5 rounded border border-border hover:border-accent/40"
                      >{isRTL ? 'الافتراضي' : 'Default'}</button>
                      <button
                        type="button"
                        onClick={() => setExportFields([])}
                        className="text-[10px] px-2 py-0.5 rounded border border-border hover:border-accent/40"
                      >{isRTL ? 'مسح' : 'Clear'}</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-2 rounded border border-border/50 bg-background">
                    {ALL_EXPORT_FIELDS.map(f => {
                      const sensitive = (f === 'email' || f === 'message' || f === 'internal_notes') && !isSuperAdmin;
                      const checked = exportFields.includes(f);
                      return (
                        <label
                          key={f}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-muted/40 ${sensitive ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={sensitive}
                            onCheckedChange={() => {
                              setExportFields(prev =>
                                prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f],
                              );
                            }}
                          />
                          <span className="truncate">{fieldLabel(f, isRTL)}</span>
                          {sensitive && <Lock className="w-3 h-3 ms-auto" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setShowExportPanel(false)}>
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button size="sm" onClick={runExport} disabled={isExporting || exportFields.length === 0} className="gap-2">
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isRTL ? `تصدير ${exportFormat.toUpperCase()}` : `Export ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
              </div>
            )}

            {/* Quick chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium">{isRTL ? 'فلاتر سريعة:' : 'Quick:'}</span>
              {chips.map(chip => {
                const Icon = chip.icon;
                const active = quickChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => updateParam({ chip: active ? null : chip.id, page: null })}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${active ? chip.tone + ' shadow-sm' : 'border-border/60 text-muted-foreground hover:border-accent/40 hover:text-foreground'}`}
                  >
                    <Icon className="w-3 h-3" />
                    {isRTL ? chip.ar : chip.en}
                  </button>
                );
              })}
              {(quickChip || starredOnly || statusFilter !== 'all' || priorityFilter !== 'all' || dateRange !== 'all' || search) && (
                <button
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-destructive hover:underline ms-auto"
                >
                  <MailX className="w-3 h-3" />{isRTL ? 'مسح كل الفلاتر' : 'Clear all'}
                </button>
              )}
            </div>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/5 border border-accent/20 flex-wrap">
                <span className="text-xs font-medium text-accent ms-1">
                  {isRTL ? `محدد: ${selectedIds.size}` : `${selectedIds.size} selected`}
                </span>
                <Separator orientation="vertical" className="h-5" />
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { status: 'read' } })}>
                  <MailOpen className="w-3.5 h-3.5" />{isRTL ? 'تعليم كمقروء' : 'Mark Read'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { status: 'new' } })}>
                  <Mail className="w-3.5 h-3.5" />{isRTL ? 'كغير مقروءة' : 'Mark Unread'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { status: 'replied' } })}>
                  <CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'تم الرد' : 'Replied'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { status: 'archived' } })}>
                  <Archive className="w-3.5 h-3.5" />{isRTL ? 'أرشفة' : 'Archive'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { starred: true } })}>
                  <Star className="w-3.5 h-3.5" />{isRTL ? 'تمييز ★' : 'Star'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { starred: false } })}>
                  <Star className="w-3.5 h-3.5" />{isRTL ? 'إلغاء ★' : 'Unstar'}
                </Button>
                <Select onValueChange={(v) => updateMutation.mutate({ ids: [...selectedIds], patch: { priority: v as Priority } })}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder={isRTL ? 'الأولوية' : 'Priority'} /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(priorityConfig) as Priority[]).map(k => (
                      <SelectItem key={k} value={k}>{isRTL ? priorityConfig[k].ar : priorityConfig[k].en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm" variant="ghost"
                  className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(isRTL ? `حذف ${selectedIds.size} رسالة نهائياً؟` : `Delete ${selectedIds.size} messages permanently?`)) {
                      deleteMutation.mutate([...selectedIds]);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />{isRTL ? 'حذف' : 'Delete'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs ms-auto" onClick={() => setSelectedIds(new Set())}>
                  {isRTL ? 'إلغاء التحديد' : 'Clear'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Layout: list + (optional split detail) */}
        <div className={splitView && focused ? 'grid grid-cols-1 xl:grid-cols-[1fr_minmax(420px,520px)] gap-4 items-start' : ''}>
          {/* Focused panel — when not split, show above list */}
          {focused && !splitView && (
            <FocusedMessage
              focused={focused}
              isRTL={isRTL}
              isSuperAdmin={isSuperAdmin}
              dateLocale={dateLocale}
              currentUserId={user?.id}
              assignees={assignees}
              assigneeMap={assigneeMap}
              events={events}
              noteDraft={noteDraft}
              setNoteDraft={setNoteDraft}
              editingNoteId={editingNoteId}
              setEditingNoteId={setEditingNoteId}
              updateMutation={updateMutation}
              deleteMutation={deleteMutation}
              copyDeepLink={copyDeepLink}
              closeMessage={closeMessage}
              printMessage={printMessage}
              useReplyTemplate={useReplyTemplate}
            />
          )}

          {/* List */}
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 flex flex-col items-center text-muted-foreground">
                  <Inbox className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">{isRTL ? 'لا توجد رسائل تطابق التصفية' : 'No messages match the filter'}</p>
                  <Button variant="link" size="sm" onClick={() => setSearchParams(new URLSearchParams())}>
                    {isRTL ? 'مسح كل الفلاتر' : 'Clear all filters'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-muted/20">
                    <Checkbox
                      checked={paged.length > 0 && paged.every(m => selectedIds.has(m.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isRTL
                        ? `عرض ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} من ${filtered.length}`
                        : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground ms-auto hidden md:block">
                      {isRTL ? 'اختصارات: / بحث · J/K تنقل · R رد · E أرشفة · U غير مقروء · S تمييز · Esc إغلاق' : '/ search · J/K nav · R reply · E archive · U unread · S star · Esc close'}
                    </span>
                  </div>

                  <div className="divide-y divide-border/50">
                    {paged.map(msg => {
                      const cfg = statusConfig[msg.status];
                      const Icon = cfg.icon;
                      const isFocused = focusedId === msg.id;
                      const isSelected = selectedIds.has(msg.id);
                      const ageMs = Date.now() - new Date(msg.created_at).getTime();
                      const isStale = (msg.status === 'new' || msg.status === 'read') && ageMs > 24 * 60 * 60 * 1000;
                      const padding = density === 'compact' ? 'p-2' : 'p-3';
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-center gap-3 ${padding} hover:bg-muted/30 cursor-pointer transition-colors ${isFocused ? 'bg-accent/5' : ''} ${msg.status === 'new' ? 'bg-info/[0.03]' : ''}`}
                          onClick={() => openMessage(msg.id)}
                        >
                          <div onClick={e => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(msg.id)} />
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ ids: [msg.id], patch: { starred: !msg.starred } }); }}
                            className="shrink-0"
                            aria-label="star"
                          >
                            <Star className={`w-4 h-4 ${msg.starred ? 'fill-warning text-warning' : 'text-muted-foreground/40'}`} />
                          </button>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm truncate ${msg.status === 'new' ? 'font-bold' : 'font-medium'}`}>{msg.name}</p>
                              {msg.priority !== 'normal' && (
                                <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${priorityConfig[msg.priority].color}`}>
                                  {isRTL ? priorityConfig[msg.priority].ar : priorityConfig[msg.priority].en}
                                </Badge>
                              )}
                              {isStale && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-urgent/10 text-urgent border-urgent/30">
                                  <Timer className="w-2.5 h-2.5 me-0.5" />{isRTL ? 'متأخرة' : 'Stale'}
                                </Badge>
                              )}
                              {msg.internal_notes && <StickyNote className="w-3 h-3 text-warning" />}
                            </div>
                            {density !== 'compact' && (
                              <p className="text-xs text-muted-foreground truncate">
                                {msg.subject ? <span className="font-medium">{msg.subject} · </span> : null}
                                {msg.message.substring(0, 80)}
                              </p>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0 hidden sm:flex items-center gap-1 tech-content">
                            <Clock className="w-3 h-3" />
                            {format(new Date(msg.created_at), 'MM/dd HH:mm')}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuLabel className="text-xs">{isRTL ? 'إجراءات' : 'Actions'}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ ids: [msg.id], patch: { status: msg.status === 'new' ? 'read' : 'new' } })}>
                                <Mail className="w-3.5 h-3.5 me-2" />{isRTL ? (msg.status === 'new' ? 'كمقروءة' : 'كغير مقروءة') : (msg.status === 'new' ? 'Mark read' : 'Mark unread')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ ids: [msg.id], patch: { status: 'replied' } })}>
                                <CheckCircle className="w-3.5 h-3.5 me-2" />{isRTL ? 'تم الرد' : 'Mark replied'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ ids: [msg.id], patch: { status: msg.status === 'archived' ? 'new' : 'archived' } })}>
                                <Archive className="w-3.5 h-3.5 me-2" />{isRTL ? (msg.status === 'archived' ? 'استعادة' : 'أرشفة') : (msg.status === 'archived' ? 'Restore' : 'Archive')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => copyDeepLink(msg.id)}>
                                <Link2 className="w-3.5 h-3.5 me-2" />{isRTL ? 'نسخ الرابط' : 'Copy link'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (confirm(isRTL ? 'حذف هذه الرسالة؟' : 'Delete this message?')) deleteMutation.mutate([msg.id]);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5 me-2" />{isRTL ? 'حذف' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground tech-content">
                        {safePage} / {totalPages}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-8" disabled={safePage <= 1} onClick={() => updateParam({ page: String(safePage - 1) })}>
                          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" disabled={safePage >= totalPages} onClick={() => updateParam({ page: String(safePage + 1) })}>
                          {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Focused panel — split mode (right side on xl+) */}
          {focused && splitView && (
            <div className="xl:sticky xl:top-4">
              <FocusedMessage
                focused={focused}
                isRTL={isRTL}
                isSuperAdmin={isSuperAdmin}
                dateLocale={dateLocale}
                currentUserId={user?.id}
                assignees={assignees}
                assigneeMap={assigneeMap}
                events={events}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                editingNoteId={editingNoteId}
                setEditingNoteId={setEditingNoteId}
                updateMutation={updateMutation}
                deleteMutation={deleteMutation}
                copyDeepLink={copyDeepLink}
                closeMessage={closeMessage}
                printMessage={printMessage}
                useReplyTemplate={useReplyTemplate}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  Focused message panel — extracted for split-view reuse    */
/* ─────────────────────────────────────────────────────────── */
interface FocusedProps {
  focused: ContactMessage;
  isRTL: boolean;
  isSuperAdmin: boolean;
  dateLocale: Locale | undefined;
  currentUserId: string | undefined;
  assignees: AdminAssignee[];
  assigneeMap: Map<string, AdminAssignee>;
  events: ContactEvent[];
  noteDraft: string;
  setNoteDraft: (v: string) => void;
  editingNoteId: string | null;
  setEditingNoteId: (v: string | null) => void;
  updateMutation: ReturnType<typeof useMutation<unknown, unknown, { ids: string[]; patch: Partial<ContactMessage> }>>;
  deleteMutation: ReturnType<typeof useMutation<unknown, unknown, string[]>>;
  copyDeepLink: (id: string) => void;
  closeMessage: () => void;
  printMessage: () => void;
  useReplyTemplate: (id: string) => void;
}
type Locale = typeof ar;

const FocusedMessage: React.FC<FocusedProps> = ({
  focused, isRTL, isSuperAdmin, dateLocale,
  currentUserId, assignees, assigneeMap, events,
  noteDraft, setNoteDraft, editingNoteId, setEditingNoteId,
  updateMutation, deleteMutation, copyDeepLink, closeMessage, printMessage, useReplyTemplate,
}) => {
  const responseHrs = focused.replied_at
    ? differenceInHours(new Date(focused.replied_at), new Date(focused.created_at))
    : null;

  const assignedUser = focused.assigned_to ? assigneeMap.get(focused.assigned_to) : null;
  const wsCfg = workStateConfig[focused.work_state];

  return (
    <Card className="border-accent/40 ring-1 ring-accent/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {focused.ticket_number && (
                <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-500/30 tech-content">
                  {focused.ticket_number}
                </Badge>
              )}
              <Badge variant="outline" className={statusConfig[focused.status].color}>
                {isRTL ? statusConfig[focused.status].ar : statusConfig[focused.status].en}
              </Badge>
              <Badge variant="outline" className={priorityConfig[focused.priority].color}>
                <Flame className="w-3 h-3 me-1" />
                {isRTL ? priorityConfig[focused.priority].ar : priorityConfig[focused.priority].en}
              </Badge>
              <Badge variant="outline" className={wsCfg.color}>
                <Timer className="w-3 h-3 me-1" />
                {isRTL ? wsCfg.ar : wsCfg.en}
              </Badge>
              {assignedUser && (
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                  <User className="w-3 h-3 me-1" />
                  {assignedUser.full_name || assignedUser.email}
                </Badge>
              )}
              {focused.starred && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Star className="w-3 h-3 fill-current" /></Badge>}
              {responseHrs !== null && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <Timer className="w-3 h-3 me-1" />{isRTL ? `رُدّ خلال ${responseHrs}س` : `Replied in ${responseHrs}h`}
                </Badge>
              )}
            </div>
            <h2 className="font-heading font-bold text-lg">{focused.subject || (isRTL ? '(بدون موضوع)' : '(No subject)')}</h2>
            <p className="text-xs text-muted-foreground tech-content">
              {format(new Date(focused.created_at), 'yyyy-MM-dd HH:mm')} · {formatDistanceToNow(new Date(focused.created_at), { addSuffix: true, locale: dateLocale })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyDeepLink(focused.id)} title={isRTL ? 'نسخ الرابط' : 'Copy link'}>
              <Link2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={printMessage} title={isRTL ? 'طباعة' : 'Print'}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { starred: !focused.starred } })}>
              <Star className={`w-4 h-4 ${focused.starred ? 'fill-warning text-warning' : ''}`} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={closeMessage}>×</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{focused.name}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {isSuperAdmin ? (
              <>
                <a href={`mailto:${focused.email}`} className="text-accent hover:underline tech-content truncate">{focused.email}</a>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText(focused.email); toast.success(isRTL ? 'تم النسخ' : 'Copied'); }}>
                  <Copy className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <span
                className="tech-content text-muted-foreground inline-flex items-center gap-1.5 truncate"
                title={isRTL ? 'البريد الكامل متاح فقط لمدير النظام' : 'Full email visible to Super Admins only'}
              >
                {maskEmail(focused.email)}
                <Lock className="w-3 h-3 opacity-60" />
              </span>
            )}
          </div>
        </div>

        {/* Status timeline */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 text-[11px] flex-wrap">
          <TimelineDot label={isRTL ? 'تم الاستلام' : 'Received'} time={focused.created_at} active />
          <span className="text-muted-foreground/40">→</span>
          <TimelineDot
            label={isRTL ? 'تمت القراءة' : 'Read'}
            time={focused.status !== 'new' ? focused.updated_at : null}
            active={focused.status !== 'new'}
          />
          <span className="text-muted-foreground/40">→</span>
          <TimelineDot
            label={isRTL ? 'تم الرد' : 'Replied'}
            time={focused.replied_at}
            active={!!focused.replied_at}
          />
        </div>

        <div className="p-4 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed border border-border/50 max-h-96 overflow-y-auto" dir="auto">
          {focused.message}
        </div>

        {/* Workflow controls: assignee + work state */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border/50 bg-background">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="w-3 h-3" />{isRTL ? 'المسؤول' : 'Assignee'}
            </label>
            <div className="flex gap-1.5">
              <Select
                value={focused.assigned_to || '__unassigned__'}
                onValueChange={(v) => updateMutation.mutate({
                  ids: [focused.id],
                  patch: { assigned_to: v === '__unassigned__' ? null : v },
                })}
              >
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder={isRTL ? 'غير معيَّن' : 'Unassigned'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">{isRTL ? 'غير معيَّن' : 'Unassigned'}</SelectItem>
                  {assignees.map(a => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.full_name || a.email || a.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentUserId && focused.assigned_to !== currentUserId && (
                <Button
                  size="sm" variant="outline" className="h-8 text-xs"
                  onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { assigned_to: currentUserId } })}
                >
                  {isRTL ? 'لي' : 'Me'}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Timer className="w-3 h-3" />{isRTL ? 'حالة العمل' : 'Work state'}
            </label>
            <Select
              value={focused.work_state}
              onValueChange={(v) => updateMutation.mutate({ ids: [focused.id], patch: { work_state: v as WorkState } })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(workStateConfig) as WorkState[]).map(k => (
                  <SelectItem key={k} value={k}>{isRTL ? workStateConfig[k].ar : workStateConfig[k].en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AI suggested reply */}
        {focused.ai_suggested_reply && (
          <div className="space-y-2 p-3 rounded-lg border border-secondary/30 bg-secondary/5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-medium text-secondary">
                <Brain className="w-3.5 h-3.5" />
                {isRTL ? 'رد مقترح بالذكاء الاصطناعي' : 'AI suggested reply'}
                {focused.ai_category && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-secondary/10 text-secondary border-secondary/30">
                    {focused.ai_category}
                  </Badge>
                )}
              </div>
              {focused.ai_processed_at && (
                <span className="text-[10px] text-muted-foreground tech-content">
                  {format(new Date(focused.ai_processed_at), 'MM/dd HH:mm')}
                </span>
              )}
            </div>
            {focused.ai_summary && (
              <p className="text-xs text-muted-foreground italic">{focused.ai_summary}</p>
            )}
            <div className="text-sm whitespace-pre-wrap p-3 rounded bg-background border border-border/50 max-h-48 overflow-y-auto" dir="auto">
              {focused.ai_suggested_reply}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(focused.ai_suggested_reply || '');
                  toast.success(isRTL ? 'تم نسخ الرد' : 'Reply copied');
                }}
              >
                <Copy className="w-3 h-3" />{isRTL ? 'نسخ' : 'Copy'}
              </Button>
              {isSuperAdmin && (
                <a
                  href={`mailto:${focused.email}?subject=${encodeURIComponent('Re: ' + (focused.subject || ''))}&body=${encodeURIComponent(focused.ai_suggested_reply || '')}`}
                >
                  <Button size="sm" className="h-7 gap-1.5 text-xs">
                    <Reply className="w-3 h-3" />{isRTL ? 'إرسال هذا الرد' : 'Send this reply'}
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Reply templates */}
        {isSuperAdmin && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              {isRTL ? 'قوالب رد سريعة' : 'Quick reply templates'}
            </div>
            <div className="flex flex-wrap gap-2">
              {replyTemplates.map(tpl => (
                <Button
                  key={tpl.id}
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => useReplyTemplate(tpl.id)}
                >
                  <Reply className="w-3 h-3" />
                  {isRTL ? tpl.labelAr : tpl.labelEn}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Internal notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <StickyNote className="w-3.5 h-3.5" />
            {isRTL ? 'ملاحظات داخلية (لا تظهر للمستخدم)' : 'Internal notes (private)'}
          </div>
          <Textarea
            value={editingNoteId === focused.id ? noteDraft : (focused.internal_notes || '')}
            onChange={e => { setEditingNoteId(focused.id); setNoteDraft(e.target.value); }}
            placeholder={isRTL ? 'أضف ملاحظة...' : 'Add a note...'}
            className="min-h-[80px] text-sm"
            dir="auto"
          />
          {editingNoteId === focused.id && (
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={() => {
                updateMutation.mutate({ ids: [focused.id], patch: { internal_notes: noteDraft || null } });
                setEditingNoteId(null);
              }}>{isRTL ? 'حفظ الملاحظة' : 'Save note'}</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingNoteId(null); setNoteDraft(focused.internal_notes || ''); }}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          )}
        </div>

        {/* Activity feed */}
        {events.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {isRTL ? `سجل الأحداث (${events.length})` : `Activity feed (${events.length})`}
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pe-1">
              {events.map(ev => {
                const actor = ev.actor_id ? assigneeMap.get(ev.actor_id) : null;
                const actorLabel = actor ? (actor.full_name || actor.email) : (isRTL ? 'النظام' : 'System');
                return (
                  <div key={ev.id} className="flex items-start gap-2 p-2 rounded border border-border/50 bg-background text-[11px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        <EventLabel ev={ev} isRTL={isRTL} assigneeMap={assigneeMap} />
                      </p>
                      <p className="text-muted-foreground tech-content">
                        {actorLabel} · {format(new Date(ev.created_at), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Priority + actions */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
          <Select value={focused.priority} onValueChange={(v) => updateMutation.mutate({ ids: [focused.id], patch: { priority: v as Priority } })}>
            <SelectTrigger className="h-8 w-36 text-xs"><Flame className="w-3 h-3 me-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(priorityConfig) as Priority[]).map(k => (
                <SelectItem key={k} value={k}>{isRTL ? priorityConfig[k].ar : priorityConfig[k].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={focused.status}
            onValueChange={(v) => updateMutation.mutate({ ids: [focused.id], patch: { status: v as Status } })}
          >
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(statusConfig) as Status[]).map(k => (
                <SelectItem key={k} value={k}>{isRTL ? statusConfig[k].ar : statusConfig[k].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {focused.status === 'new' || focused.status === 'read' ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { status: 'new' } })}>
              <Mail className="w-3.5 h-3.5" />{isRTL ? 'كغير مقروءة' : 'Unread'}
            </Button>
          ) : null}
          {focused.status !== 'replied' && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { status: 'replied' } })}>
              <CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'تم الرد' : 'Mark replied'}
            </Button>
          )}
          {focused.status !== 'archived' ? (
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { status: 'archived' } })}>
              <Archive className="w-3.5 h-3.5" />{isRTL ? 'أرشفة' : 'Archive'}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { status: 'new' } })}>
              <Inbox className="w-3.5 h-3.5" />{isRTL ? 'استعادة' : 'Restore'}
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(isRTL ? 'حذف هذه الرسالة نهائياً؟' : 'Delete this message permanently?')) {
                deleteMutation.mutate([focused.id]);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />{isRTL ? 'حذف' : 'Delete'}
          </Button>
          {isSuperAdmin ? (
            <a href={`mailto:${focused.email}?subject=${encodeURIComponent('Re: ' + (focused.subject || ''))}&body=${encodeURIComponent('\n\n---\n' + focused.message.split('\n').map(l => '> ' + l).join('\n'))}`} className="ms-auto">
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Mail className="w-3.5 h-3.5" />{isRTL ? 'رد بالبريد' : 'Reply via Email'}
              </Button>
            </a>
          ) : (
            <Button
              size="sm" variant="outline" disabled
              className="ms-auto h-8 gap-1.5 text-xs"
              title={isRTL ? 'الرد بالبريد متاح فقط لمدير النظام' : 'Reply available to Super Admins only'}
            >
              <Lock className="w-3.5 h-3.5" />{isRTL ? 'رد بالبريد (Super Admin فقط)' : 'Reply (Super Admin only)'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const TimelineDot: React.FC<{ label: string; time: string | null; active: boolean }> = ({ label, time, active }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-success' : 'bg-muted-foreground/30'}`} />
    <div>
      <p className={`font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      {time && <p className="text-muted-foreground tech-content text-[10px]">{format(new Date(time), 'MM/dd HH:mm')}</p>}
    </div>
  </div>
);

const EventLabel: React.FC<{ ev: ContactEvent; isRTL: boolean; assigneeMap: Map<string, AdminAssignee> }> = ({ ev, isRTL, assigneeMap }) => {
  const userLabel = (id: string | null) => {
    if (!id) return isRTL ? 'لا أحد' : 'no one';
    const u = assigneeMap.get(id);
    return u ? (u.full_name || u.email || id.slice(0, 8)) : id.slice(0, 8);
  };
  switch (ev.event_type) {
    case 'created':
      return <>{isRTL ? 'تم إنشاء التذكرة' : 'Ticket created'}</>;
    case 'status_changed':
      return <>{isRTL ? `تغيير الحالة: ${ev.from_value || '—'} → ${ev.to_value || '—'}` : `Status: ${ev.from_value || '—'} → ${ev.to_value || '—'}`}</>;
    case 'priority_changed':
      return <>{isRTL ? `تغيير الأولوية: ${ev.from_value || '—'} → ${ev.to_value || '—'}` : `Priority: ${ev.from_value || '—'} → ${ev.to_value || '—'}`}</>;
    case 'work_state_changed':
      return <>{isRTL ? `حالة العمل: ${ev.from_value || '—'} → ${ev.to_value || '—'}` : `Work state: ${ev.from_value || '—'} → ${ev.to_value || '—'}`}</>;
    case 'assigned':
      return <>{isRTL ? `تعيين إلى ${userLabel(ev.to_value)}` : `Assigned to ${userLabel(ev.to_value)}`}</>;
    case 'unassigned':
      return <>{isRTL ? `إلغاء تعيين ${userLabel(ev.from_value)}` : `Unassigned from ${userLabel(ev.from_value)}`}</>;
    case 'replied':
      return <>{isRTL ? 'تم الرد على الرسالة' : 'Message replied'}</>;
    case 'note_added':
      return <>{isRTL ? 'تمت إضافة/تحديث ملاحظة داخلية' : 'Internal note updated'}</>;
    case 'ai_triaged':
      return <>{isRTL ? `فرز ذكي: ${ev.to_value || ''}` : `AI triage: ${ev.to_value || ''}`}</>;
    default:
      return <>{ev.event_type}{ev.note ? ` — ${ev.note}` : ''}</>;
  }
};

export default AdminContactMessages;
