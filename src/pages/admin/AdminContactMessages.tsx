import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Mail, Search, Clock, Eye, CheckCircle, Archive, X, Loader2,
  Download, MailOpen, Filter, Inbox, AlertCircle, User, MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusConfig: Record<string, { labelAr: string; labelEn: string; color: string; icon: React.ElementType }> = {
  new: { labelAr: 'جديد', labelEn: 'New', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Mail },
  read: { labelAr: 'مقروء', labelEn: 'Read', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: MailOpen },
  replied: { labelAr: 'تم الرد', labelEn: 'Replied', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
  archived: { labelAr: 'مؤرشف', labelEn: 'Archived', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
};

const AdminContactMessages = () => {
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      toast.success(isRTL ? 'تم تحديث الحالة' : 'Status updated');
    },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Update failed'),
  });

  const filtered = useMemo(() =>
    messages.filter(m => {
      const matchesSearch = !search ||
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.subject?.toLowerCase().includes(search.toLowerCase()) ||
        m.message?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [messages, search, statusFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, read: 0, replied: 0, archived: 0 };
    messages.forEach(m => { counts[m.status] = (counts[m.status] || 0) + 1; });
    return counts;
  }, [messages]);

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Subject', 'Message', 'Status', 'Date'];
    const rows = filtered.map(m => [
      m.name, m.email, m.subject || '', m.message.replace(/[\n\r]/g, ' '),
      statusConfig[m.status]?.labelEn || m.status,
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `contact-messages-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-accent" />
            </div>
            {isRTL ? 'رسائل التواصل' : 'Contact Messages'}
          </h1>
          <p className="text-muted-foreground font-body mt-1 text-sm">
            {isRTL ? 'إدارة رسائل المستخدمين من نموذج التواصل' : 'Manage user messages from the contact form'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card key={key} className="cursor-pointer hover:border-accent/30 transition-colors" onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-lg">{statusCounts[key] || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? cfg.labelAr : cfg.labelEn}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث بالاسم أو البريد أو الموضوع...' : 'Search by name, email, or subject...'} className="ps-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="w-4 h-4 me-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الرسائل' : 'All Messages'}</SelectItem>
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{isRTL ? cfg.labelAr : cfg.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportCSV} className="gap-2" disabled={!filtered.length}>
                <Download className="w-4 h-4" />{isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center text-muted-foreground">
              <Inbox className="w-12 h-12 mb-3 opacity-30" />
              <p>{isRTL ? 'لا توجد رسائل' : 'No messages found'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(msg => {
              const cfg = statusConfig[msg.status] || statusConfig.new;
              const isExpanded = expandedId === msg.id;
              const Icon = cfg.icon;

              return (
                <Card
                  key={msg.id}
                  className={`transition-all cursor-pointer hover:border-accent/20 ${isExpanded ? 'border-accent/30 bg-accent/5' : ''} ${msg.status === 'new' ? 'border-blue-500/20' : 'border-border/50'}`}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : msg.id);
                    if (msg.status === 'new') {
                      updateStatusMutation.mutate({ id: msg.id, status: 'read' });
                    }
                  }}
                >
                  <CardContent className="p-4">
                    {/* Summary row */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${msg.status === 'new' ? 'font-bold' : ''}`}>
                            {msg.name}
                          </p>
                          <Badge variant="outline" className={`text-[9px] h-4 shrink-0 ${cfg.color}`}>
                            {isRTL ? cfg.labelAr : cfg.labelEn}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {msg.subject || msg.message.substring(0, 60)}
                        </p>
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(msg.created_at), 'MM/dd HH:mm')}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3" onClick={e => e.stopPropagation()}>
                        <Separator />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{msg.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            <a href={`mailto:${msg.email}`} className="text-accent hover:underline">{msg.email}</a>
                          </div>
                        </div>
                        {msg.subject && (
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{msg.subject}</span>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {msg.status !== 'replied' && (
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'replied' })}>
                              <CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'تم الرد' : 'Mark Replied'}
                            </Button>
                          )}
                          {msg.status !== 'archived' && (
                            <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'archived' })}>
                              <Archive className="w-3.5 h-3.5" />{isRTL ? 'أرشفة' : 'Archive'}
                            </Button>
                          )}
                          {msg.status === 'archived' && (
                            <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'new' })}>
                              <Inbox className="w-3.5 h-3.5" />{isRTL ? 'استعادة' : 'Restore'}
                            </Button>
                          )}
                          <a href={`mailto:${msg.email}?subject=Re: ${msg.subject || ''}`}>
                            <Button size="sm" className="gap-1.5 text-xs h-8">
                              <Mail className="w-3.5 h-3.5" />{isRTL ? 'رد بالبريد' : 'Reply via Email'}
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminContactMessages;
