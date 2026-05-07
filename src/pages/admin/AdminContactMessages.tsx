import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Mail, Search, Clock, CheckCircle, Archive, Loader2,
  Download, MailOpen, Filter, Inbox, User, MessageSquare,
  Star, Flame, Copy, Trash2, Link2, ChevronLeft, ChevronRight,
  StickyNote, Phone, RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { maskEmail } from '@/lib/masking';
import { Lock } from 'lucide-react';

type Status = 'new' | 'read' | 'replied' | 'archived';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

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
}

const statusConfig: Record<Status, { ar: string; en: string; color: string; icon: React.ElementType }> = {
  new: { ar: 'جديد', en: 'New', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Mail },
  read: { ar: 'مقروء', en: 'Read', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: MailOpen },
  replied: { ar: 'تم الرد', en: 'Replied', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
  archived: { ar: 'مؤرشف', en: 'Archived', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
};

const priorityConfig: Record<Priority, { ar: string; en: string; color: string }> = {
  low: { ar: 'منخفض', en: 'Low', color: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  normal: { ar: 'عادي', en: 'Normal', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  high: { ar: 'مرتفع', en: 'High', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  urgent: { ar: 'عاجل', en: 'Urgent', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

const PAGE_SIZE = 25;

const AdminContactMessages = () => {
  const { isRTL } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') || 'all';
  const priorityFilter = searchParams.get('priority') || 'all';
  const search = searchParams.get('q') || '';
  const starredOnly = searchParams.get('starred') === '1';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const focusedId = searchParams.get('id');

  const [searchInput, setSearchInput] = useState(search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const updateParam = useCallback((updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') sp.delete(k);
      else sp.set(k, v);
    });
    setSearchParams(sp, { replace: false });
  }, [searchParams, setSearchParams]);

  // Debounce search input → URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) updateParam({ q: searchInput || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => { setSearchInput(search); }, [search]);

  const { data: messages = [], isLoading, refetch } = useQuery({
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

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-contact-messages-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<ContactMessage> }) => {
      const { error } = await supabase.from('contact_messages').update(patch).in('id', ids);
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
      toast.success(isRTL ? `تم الحذف (${ids.length})` : `Deleted (${ids.length})`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل الحذف' : 'Delete failed')),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return messages.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && m.priority !== priorityFilter) return false;
      if (starredOnly && !m.starred) return false;
      if (q) {
        const hay = `${m.name} ${m.email} ${m.subject || ''} ${m.message} ${m.internal_notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [messages, statusFilter, priorityFilter, starredOnly, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { new: 0, read: 0, replied: 0, archived: 0 };
    messages.forEach(m => { c[m.status] = (c[m.status] || 0) + 1; });
    return c;
  }, [messages]);

  const focused = useMemo(() => messages.find(m => m.id === focusedId) || null, [messages, focusedId]);

  // Auto mark-as-read when opening
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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, filtered]);

  const exportCSV = () => {
    if (!isSuperAdmin) {
      toast.error(isRTL
        ? 'تصدير CSV يحتوي على بيانات حساسة — متاح فقط لمدير النظام (Super Admin).'
        : 'CSV export contains sensitive data — Super Admin only.');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Subject', 'Message', 'Status', 'Priority', 'Starred', 'Notes', 'Created'];
    const rows = filtered.map(m => [
      m.id, m.name, m.email, m.subject || '', m.message.replace(/[\n\r]/g, ' '),
      m.status, m.priority, m.starred ? 'yes' : 'no', m.internal_notes || '',
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `contact-messages-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyDeepLink = (id: string) => {
    const url = `${window.location.origin}/admin/contact-messages?id=${id}`;
    navigator.clipboard.writeText(url);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
  };

  const dateLocale = isRTL ? ar : undefined;

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
              {isRTL ? 'رسائل التواصل' : 'Contact Messages'}
              <Badge variant="outline" className="text-xs h-5">{messages.length}</Badge>
            </h1>
            <p className="text-muted-foreground font-body mt-1 text-sm">
              {isRTL ? 'إدارة احترافية للرسائل مع روابط عميقة وإجراءات جماعية' : 'Professional inbox with deep links and bulk actions'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />{isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length} className="gap-2">
              <Download className="w-4 h-4" />{isRTL ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Stat cards (clickable filters) */}
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
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
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
                <SelectTrigger className="w-full lg:w-44">
                  <Flame className="w-4 h-4 me-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الأولويات' : 'All Priorities'}</SelectItem>
                  {(Object.keys(priorityConfig) as Priority[]).map(k => (
                    <SelectItem key={k} value={k}>{isRTL ? priorityConfig[k].ar : priorityConfig[k].en}</SelectItem>
                  ))}
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
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { status: 'replied' } })}>
                  <CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'تم الرد' : 'Replied'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [...selectedIds], patch: { status: 'archived' } })}>
                  <Archive className="w-3.5 h-3.5" />{isRTL ? 'أرشفة' : 'Archive'}
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

        {/* Focused message panel (deep-linked) */}
        {focused && (
          <Card className="border-accent/40 ring-1 ring-accent/20">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={statusConfig[focused.status].color}>
                      {isRTL ? statusConfig[focused.status].ar : statusConfig[focused.status].en}
                    </Badge>
                    <Badge variant="outline" className={priorityConfig[focused.priority].color}>
                      <Flame className="w-3 h-3 me-1" />
                      {isRTL ? priorityConfig[focused.priority].ar : priorityConfig[focused.priority].en}
                    </Badge>
                    {focused.starred && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Star className="w-3 h-3 fill-current" /></Badge>}
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
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { starred: !focused.starred } })}>
                    <Star className={`w-4 h-4 ${focused.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={closeMessage}>×</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{focused.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {isSuperAdmin ? (
                    <>
                      <a href={`mailto:${focused.email}`} className="text-accent hover:underline tech-content">{focused.email}</a>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(focused.email); toast.success(isRTL ? 'تم النسخ' : 'Copied'); }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <span
                      className="tech-content text-muted-foreground inline-flex items-center gap-1.5"
                      title={isRTL ? 'البريد الكامل متاح فقط لمدير النظام (Super Admin)' : 'Full email visible to Super Admins only'}
                    >
                      {maskEmail(focused.email)}
                      <Lock className="w-3 h-3 opacity-60" />
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed border border-border/50" dir="auto">
                {focused.message}
              </div>

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
                    }}>{isRTL ? 'حفظ الملاحظة' : 'Save Note'}</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingNoteId(null); setNoteDraft(focused.internal_notes || ''); }}>
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                )}
              </div>

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
                {focused.status !== 'replied' && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ ids: [focused.id], patch: { status: 'replied' } })}>
                    <CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'تم الرد' : 'Mark Replied'}
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
                {isSuperAdmin ? (
                  <a href={`mailto:${focused.email}?subject=${encodeURIComponent('Re: ' + (focused.subject || ''))}&body=${encodeURIComponent('\n\n---\n' + focused.message.split('\n').map(l => '> ' + l).join('\n'))}`} className="ms-auto">
                    <Button size="sm" className="h-8 gap-1.5 text-xs">
                      <Mail className="w-3.5 h-3.5" />{isRTL ? 'رد بالبريد' : 'Reply via Email'}
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="ms-auto h-8 gap-1.5 text-xs"
                    title={isRTL ? 'الرد بالبريد متاح فقط لمدير النظام (Super Admin)' : 'Reply by email available to Super Admins only'}
                  >
                    <Lock className="w-3.5 h-3.5" />{isRTL ? 'رد بالبريد (Super Admin فقط)' : 'Reply (Super Admin only)'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center text-muted-foreground">
              <Inbox className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">{isRTL ? 'لا توجد رسائل تطابق التصفية' : 'No messages match the filter'}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Select-all header */}
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
                  {isRTL ? 'اختصارات: / للبحث · J/K للتنقل · Esc للإغلاق' : 'Shortcuts: / search · J/K navigate · Esc close'}
                </span>
              </div>

              <div className="divide-y divide-border/50">
                {paged.map(msg => {
                  const cfg = statusConfig[msg.status];
                  const Icon = cfg.icon;
                  const isFocused = focusedId === msg.id;
                  const isSelected = selectedIds.has(msg.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors ${isFocused ? 'bg-accent/5' : ''} ${msg.status === 'new' ? 'bg-blue-500/[0.03]' : ''}`}
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
                        <Star className={`w-4 h-4 ${msg.starred ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'}`} />
                      </button>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm truncate ${msg.status === 'new' ? 'font-bold' : 'font-medium'}`}>{msg.name}</p>
                          {msg.priority !== 'normal' && (
                            <Badge variant="outline" className={`text-[9px] h-4 ${priorityConfig[msg.priority].color}`}>
                              {isRTL ? priorityConfig[msg.priority].ar : priorityConfig[msg.priority].en}
                            </Badge>
                          )}
                          {msg.internal_notes && <StickyNote className="w-3 h-3 text-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {msg.subject ? <span className="font-medium">{msg.subject} · </span> : null}
                          {msg.message.substring(0, 80)}
                        </p>
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0 hidden sm:flex items-center gap-1 tech-content">
                        <Clock className="w-3 h-3" />
                        {format(new Date(msg.created_at), 'MM/dd HH:mm')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
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
    </DashboardLayout>
  );
};

export default AdminContactMessages;
