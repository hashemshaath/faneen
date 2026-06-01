import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Search, ShieldAlert, Loader2, Lock } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listSystemModules,
  listAuditLog,
  superAdminSetBusinessModuleOverride,
  type SystemModule,
  type SystemModuleAuditEntry,
} from '@/modules/systemAccess';
import { useBusinessAccessInvalidation } from '@/hooks/useBusinessAccessInvalidation';

interface BusinessLite {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  ref_id: string | null;
}

/**
 * MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2-UI — Super-admin only panel that
 * activates/deactivates a module for one business via the
 * super_admin_set_business_module_override RPC (mandatory reason).
 */
const SuperAdminBusinessOverridePanel: React.FC = () => {
  const { isRTL } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const invalidateAccess = useBusinessAccessInvalidation();

  const [bizSearch, setBizSearch] = useState('');
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const modulesQuery = useQuery({
    queryKey: ['system-modules'],
    queryFn: listSystemModules,
    enabled: isSuperAdmin,
  });

  const bizQuery = useQuery({
    queryKey: ['super-admin-override-businesses'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en, ref_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BusinessLite[];
    },
  });

  const auditQuery = useQuery({
    queryKey: ['system-module-audit-recent'],
    enabled: isSuperAdmin,
    queryFn: () => listAuditLog(20),
  });

  const businesses = bizQuery.data ?? [];
  const filteredBiz = useMemo(() => {
    if (!bizSearch) return businesses.slice(0, 30);
    const s = bizSearch.toLowerCase();
    return businesses.filter(
      (b) =>
        (b.name_ar ?? '').toLowerCase().includes(s) ||
        (b.name_en ?? '').toLowerCase().includes(s) ||
        (b.ref_id ?? '').toLowerCase().includes(s),
    ).slice(0, 30);
  }, [businesses, bizSearch]);

  const selectedModule: SystemModule | undefined =
    modulesQuery.data?.find((m) => m.key === selectedModuleKey);

  const canSubmit =
    !!selectedBizId && !!selectedModule && reason.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!isSuperAdmin) {
      toast.error(isRTL ? 'يتطلب صلاحية المدير العام' : 'Super Admin required');
      return;
    }
    if (!selectedBizId || !selectedModule) return;
    if (selectedModule.is_core && !enabled) {
      toast.error(isRTL ? 'لا يمكن تعطيل النظام الأساسي' : 'Core module cannot be disabled');
      return;
    }
    if (!reason.trim()) {
      toast.error(isRTL ? 'السبب مطلوب' : 'Reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await superAdminSetBusinessModuleOverride({
        businessId: selectedBizId,
        moduleKey: selectedModule.key,
        enabled,
        reason: reason.trim(),
      });
      toast.success(isRTL ? 'تم تطبيق الاستثناء' : 'Override applied');
      setReason('');
      await qc.invalidateQueries({ queryKey: ['system-module-overrides'] });
      await qc.invalidateQueries({ queryKey: ['system-module-audit-recent'] });
      invalidateAccess({ businessId: selectedBizId, includeAudit: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Override failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          {isRTL
            ? 'هذا القسم متاح للمدير العام فقط.'
            : 'This section is available to Super Admin only.'}
        </div>
      </div>
    );
  }

  const selectedBiz = businesses.find((b) => b.id === selectedBizId);

  return (
    <div className="space-y-4" data-testid="super-admin-business-override-panel">
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold">
            {isRTL ? 'استثناءات الجهات' : 'Business Module Overrides'}
          </div>
          <div className="text-muted-foreground mt-0.5">
            {isRTL
              ? 'هذا الاستثناء يتجاوز العضوية الحالية للجهة، ويتم تسجيله في سجل العمليات.'
              : 'This override bypasses the current membership for the selected business and is recorded in the audit log.'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Business selector */}
        <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {isRTL ? 'الجهة' : 'Business'}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
            <Input
              value={bizSearch}
              onChange={(e) => setBizSearch(e.target.value)}
              placeholder={isRTL ? 'ابحث بالاسم أو المعرّف…' : 'Search by name or ref id…'}
              className="ps-9"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {bizQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : filteredBiz.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                {isRTL ? 'لا توجد نتائج.' : 'No results.'}
              </div>
            ) : (
              filteredBiz.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBizId(b.id)}
                  className={`w-full text-start p-2 rounded-lg text-sm transition ${
                    selectedBizId === b.id
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">
                    {isRTL ? (b.name_ar ?? b.name_en) : (b.name_en ?? b.name_ar)}
                  </div>
                  {b.ref_id && (
                    <div className="text-xs text-muted-foreground tech-content">{b.ref_id}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Module + action */}
        <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
          <label className="text-sm font-semibold">
            {isRTL ? 'النظام' : 'Module'}
          </label>
          <select
            value={selectedModuleKey ?? ''}
            onChange={(e) => setSelectedModuleKey(e.target.value || null)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{isRTL ? 'اختر نظاماً…' : 'Select a module…'}</option>
            {(modulesQuery.data ?? []).map((m) => (
              <option key={m.key} value={m.key}>
                {(isRTL ? m.label_ar : m.label_en)}{m.is_core ? ' • core' : ''}
              </option>
            ))}
          </select>

          {selectedModule && (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-sm">
                {isRTL ? 'الحالة' : 'State'}
              </span>
              <div className="flex items-center gap-2">
                {selectedModule.is_core && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {isRTL ? 'أساسي' : 'Core'}
                  </Badge>
                )}
                <Switch
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  disabled={selectedModule.is_core}
                />
                <span className="text-sm font-medium">
                  {enabled ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                </span>
              </div>
            </div>
          )}

          <label className="text-sm font-semibold">
            {isRTL ? 'السبب (إلزامي)' : 'Reason (required)'}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isRTL ? 'وضّح سبب الاستثناء…' : 'Explain why this override is needed…'}
            rows={3}
          />

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {isRTL ? 'تطبيق الاستثناء' : 'Apply Override'}
          </Button>

          {selectedBiz && selectedModule && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'للجهة: ' : 'Business: '}
              <strong>{isRTL ? (selectedBiz.name_ar ?? selectedBiz.name_en) : (selectedBiz.name_en ?? selectedBiz.name_ar)}</strong>
              {' · '}
              <span className="tech-content">{selectedModule.key}</span>
            </p>
          )}
        </div>
      </div>

      {/* Recent audit */}
      <div className="rounded-2xl border border-border/30 bg-card p-4">
        <div className="font-semibold text-sm mb-3">
          {isRTL ? 'آخر تعديلات سجل التدقيق' : 'Recent audit entries'}
        </div>
        {auditQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (auditQuery.data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {isRTL ? 'لا توجد تعديلات بعد.' : 'No entries yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {(auditQuery.data ?? []).slice(0, 10).map((a: SystemModuleAuditEntry) => (
              <li key={a.id} className="py-2 text-xs flex flex-wrap items-center gap-2">
                <Badge variant="outline">{a.action}</Badge>
                <span className="tech-content">{a.module_key}</span>
                <span className="text-muted-foreground">
                  · {a.scope_type}{a.scope_value ? ` / ${a.scope_value}` : ''}
                </span>
                <span className="text-muted-foreground">
                  · {a.previous_enabled === null ? '∅' : a.previous_enabled ? 'on' : 'off'} →{' '}
                  {a.new_enabled === null ? '∅' : a.new_enabled ? 'on' : 'off'}
                </span>
                {a.reason && <span className="text-muted-foreground">· {a.reason}</span>}
                <span className="text-muted-foreground ms-auto tech-content">
                  {new Date(a.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBusinessOverridePanel;