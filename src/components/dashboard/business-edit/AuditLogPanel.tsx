import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History, FileEdit, Plus, Trash2, ShieldCheck, Loader2,
  Filter, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { listProfilesByUserIds } from '@/modules/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  businessId: string;
  isRTL: boolean;
}

interface AuditRow {
  id: string;
  business_id: string | null;
  actor_id: string | null;
  entity_type: 'business' | 'business_staff' | 'business_staff_permissions' | string;
  entity_id: string | null;
  action: 'insert' | 'update' | 'delete' | string;
  changes: Record<string, { old: unknown; new: unknown }> | Record<string, unknown> | null;
  created_at: string;
}

const ENTITY_META: Record<string, { ar: string; en: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  business: { ar: 'بيانات المنشأة', en: 'Business data', tone: 'border-info/30 bg-info/10 text-info', icon: FileEdit },
  business_staff: { ar: 'مفوّض', en: 'Representative', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600', icon: ShieldCheck },
  business_staff_permissions: { ar: 'صلاحيات', en: 'Permissions', tone: 'border-violet-500/30 bg-violet-500/10 text-violet-600', icon: ShieldCheck },
};

const ACTION_META: Record<string, { ar: string; en: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  insert: { ar: 'إضافة', en: 'Created', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600', icon: Plus },
  update: { ar: 'تعديل', en: 'Updated', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-600', icon: FileEdit },
  delete: { ar: 'حذف',   en: 'Deleted', tone: 'border-rose-500/30 bg-rose-500/10 text-rose-600',     icon: Trash2 },
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export const AuditLogPanel: React.FC<Props> = ({ businessId, isRTL }) => {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['business-audit-log', businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from('business_audit_log')
        .select('id, business_id, actor_id, entity_type, entity_id, action, changes, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  // Lookup actor names from profiles in one query
  const actorIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))),
    [rows],
  );

  const { data: actors = [] } = useQuery({
    queryKey: ['audit-actors', actorIds.join('|')],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await listProfilesByUserIds<{
        user_id: string;
        full_name: string | null;
        email: string | null;
        ref_id: string | null;
      }>({ userIds: actorIds, select: 'user_id, full_name, email, ref_id' });
      return data ?? [];
    },
  });

  const actorMap = useMemo(() => {
    const m = new Map<string, { name: string; ref_id: string | null }>();
    actors.forEach((a) => {
      m.set(a.user_id, { name: a.full_name ?? a.email ?? '—', ref_id: a.ref_id ?? null });
    });
    return m;
  }, [actors]);

  const filtered = useMemo(() => rows.filter((r) =>
    (entityFilter === 'all' || r.entity_type === entityFilter)
    && (actionFilter === 'all' || r.action === actionFilter),
  ), [rows, entityFilter, actionFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="w-4 h-4 text-primary" />
            {isRTL ? 'سجل التدقيق' : 'Audit log'}
            <Badge variant="outline" className="ms-2 tech-content">{filtered.length}</Badge>
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'كل تعديل على بيانات المنشأة وصلاحيات المفوّضين مع المستخدم والوقت.'
              : 'Every change to business data and representative permissions with actor and timestamp.'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 me-1 ${isFetching ? 'animate-spin' : ''}`} />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All entities'}</SelectItem>
              <SelectItem value="business">{isRTL ? 'بيانات المنشأة' : 'Business data'}</SelectItem>
              <SelectItem value="business_staff">{isRTL ? 'المفوّضون' : 'Representatives'}</SelectItem>
              <SelectItem value="business_staff_permissions">{isRTL ? 'الصلاحيات' : 'Permissions'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الإجراءات' : 'All actions'}</SelectItem>
              <SelectItem value="insert">{isRTL ? 'إضافة' : 'Created'}</SelectItem>
              <SelectItem value="update">{isRTL ? 'تعديل' : 'Updated'}</SelectItem>
              <SelectItem value="delete">{isRTL ? 'حذف' : 'Deleted'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 inline animate-spin me-1.5" />
            {isRTL ? 'تحميل…' : 'Loading…'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            {isRTL ? 'لا توجد سجلات بعد.' : 'No audit entries yet.'}
          </div>
        ) : (
          <ul className="rounded-xl border border-border divide-y divide-border bg-card">
            {filtered.map((row) => {
              const eMeta = ENTITY_META[row.entity_type] ?? { ar: row.entity_type, en: row.entity_type, tone: 'border-border bg-muted text-foreground', icon: FileEdit };
              const aMeta = ACTION_META[row.action] ?? { ar: row.action, en: row.action, tone: 'border-border bg-muted text-foreground', icon: FileEdit };
              const ActionIcon = aMeta.icon;
              const actor = row.actor_id ? actorMap.get(row.actor_id) : null;
              const isExp = expanded === row.id;
              const dt = new Date(row.created_at);
              const dateStr = dt.toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <li key={row.id} className="p-3">
                  <button
                    type="button"
                    className="w-full text-start flex items-start gap-3"
                    onClick={() => setExpanded(isExp ? null : row.id)}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${aMeta.tone}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={eMeta.tone}>
                          {isRTL ? eMeta.ar : eMeta.en}
                        </Badge>
                        <Badge variant="outline" className={aMeta.tone}>
                          {isRTL ? aMeta.ar : aMeta.en}
                        </Badge>
                        <span className="text-xs text-muted-foreground tech-content">{dateStr}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {isRTL ? 'بواسطة: ' : 'By: '}
                        <span className="text-foreground font-medium">{actor?.name ?? (isRTL ? 'مستخدم محذوف/نظام' : 'Deleted/system user')}</span>
                        {actor?.ref_id && <span className="ms-2 tech-content">({actor.ref_id})</span>}
                      </p>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExp && row.changes && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2 overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="text-start py-1 ps-1 font-medium">{isRTL ? 'الحقل' : 'Field'}</th>
                            <th className="text-start py-1 px-1 font-medium">{isRTL ? 'القيمة السابقة' : 'Old value'}</th>
                            <th className="text-start py-1 px-1 font-medium">{isRTL ? 'القيمة الجديدة' : 'New value'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {Object.entries(row.changes as Record<string, { old?: unknown; new?: unknown }>).slice(0, 50).map(([field, val]) => {
                            const isDiff = val && typeof val === 'object' && 'old' in val && 'new' in val;
                            return (
                              <tr key={field}>
                                <td className="py-1 ps-1 font-medium text-foreground tech-content">{field}</td>
                                <td className="py-1 px-1 text-rose-600 break-all">
                                  {isDiff ? formatValue(val.old) : '—'}
                                </td>
                                <td className="py-1 px-1 text-emerald-600 break-all">
                                  {isDiff ? formatValue(val.new) : formatValue(val)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
