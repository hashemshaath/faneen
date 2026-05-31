/**
 * Inline permissions matrix editor for a single `business_staff` row.
 *
 * - Reads role defaults from the workspace permissions catalog.
 * - Lets the manager toggle each permission ON/OFF and persists the
 *   resulting array to `business_staff.permissions_override` as JSONB.
 * - When all checks match the role defaults exactly, persists `null` so
 *   future role-default changes flow through automatically.
 * - UI-only hint; RLS + `has_permission` on the server remain authoritative.
 */
import React, { useMemo, useState } from 'react';
import { Check, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { pickBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  WORKSPACE_PERMISSIONS,
  getDefaultPermissionsForRole,
  type WorkspacePermission,
} from '@/modules/workspace/permissions';
import { updateBusinessStaffById } from '@/modules/businesses/services/updateBusinessStaffById';

const DOMAIN_LABELS: Record<string, { ar: string; en: string }> = {
  entity: { ar: 'الكيان', en: 'Entity' },
  staff: { ar: 'الموظفون', en: 'Staff' },
  locations: { ar: 'المواقع', en: 'Locations' },
  services: { ar: 'الخدمات', en: 'Services' },
  leads: { ar: 'الطلبات', en: 'Leads' },
  quotes: { ar: 'عروض الأسعار', en: 'Quotes' },
  contracts: { ar: 'العقود', en: 'Contracts' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  documents: { ar: 'المستندات', en: 'Documents' },
  memberships: { ar: 'العضويات', en: 'Memberships' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
};

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  view: { ar: 'عرض', en: 'View' },
  manage: { ar: 'إدارة', en: 'Manage' },
  verify: { ar: 'توثيق', en: 'Verify' },
  create: { ar: 'إنشاء', en: 'Create' },
  respond: { ar: 'رد', en: 'Respond' },
  sign: { ar: 'توقيع', en: 'Sign' },
  upload: { ar: 'رفع', en: 'Upload' },
};

function groupByDomain(perms: readonly string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [d] = p.split('.');
    (groups[d] ??= []).push(p);
  }
  return groups;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const v of b) if (!sa.has(v)) return false;
  return true;
}

function parseOverride(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  return null;
}

export interface StaffPermissionsMatrixProps {
  staffId: string;
  role: string;
  permissionsOverride: unknown;
  isPrimaryManager: boolean;
  canEdit: boolean;
  onSaved?: () => void;
}

export const StaffPermissionsMatrix: React.FC<StaffPermissionsMatrixProps> = ({
  staffId, role, permissionsOverride, isPrimaryManager, canEdit, onSaved,
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const defaults = useMemo(() => getDefaultPermissionsForRole(role) as string[], [role]);
  const override = useMemo(() => parseOverride(permissionsOverride), [permissionsOverride]);
  const initial = override ?? defaults;

  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggle = (p: string) => {
    if (!canEdit || isPrimaryManager) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const resetToRole = () => setSelected(new Set(defaults));

  const dirty = !sameSet(Array.from(selected), initial);
  const matchesDefaults = sameSet(Array.from(selected), defaults);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = matchesDefaults
        ? { permissions_override: null }
        : { permissions_override: Array.from(selected) };
      const res = await updateBusinessStaffById({ id: staffId, values: payload });
      if (res.error) throw res.error;
      toast({ title: pickBi(isRTL, 'تم حفظ الصلاحيات', 'Permissions saved') });
      onSaved?.();
    } catch (err) {
      toast({
        title: pickBi(isRTL, 'تعذّر الحفظ', 'Save failed'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => groupByDomain(WORKSPACE_PERMISSIONS), []);
  const totalSelected = selected.size;
  const totalAvailable = WORKSPACE_PERMISSIONS.length;

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground transition"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {pickBi(isRTL, 'مصفوفة الصلاحيات', 'Permissions matrix')}
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {totalSelected}/{totalAvailable}
          </Badge>
          {override && !matchesDefaults && (
            <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
              {pickBi(isRTL, 'مخصصة', 'Custom')}
            </Badge>
          )}
        </span>
        <span className="text-[10px]">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {isPrimaryManager && (
            <p className="text-[11px] text-amber-600">
              {pickBi(isRTL, 'المدير الرئيسي يملك جميع الصلاحيات تلقائيًا.', 'Primary manager has all permissions by default.')}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(grouped).map(([domain, perms]) => (
              <div key={domain} className="rounded-lg border border-border/40 p-2.5 bg-muted/20">
                <p className="text-[11px] font-semibold mb-1.5">
                  {pickBi(isRTL, DOMAIN_LABELS[domain]?.ar ?? domain, DOMAIN_LABELS[domain]?.en ?? domain)}
                </p>
                <div className="space-y-1">
                  {perms.map((p) => {
                    const action = p.split('.')[1] ?? '';
                    const isOn = selected.has(p);
                    const inDefault = defaults.includes(p);
                    const disabled = !canEdit || isPrimaryManager;
                    return (
                      <label
                        key={p}
                        className={`flex items-center gap-2 text-[11px] cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <Checkbox
                          checked={isOn}
                          disabled={disabled}
                          onCheckedChange={() => toggle(p)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="flex-1">
                          {pickBi(isRTL, ACTION_LABELS[action]?.ar ?? action, ACTION_LABELS[action]?.en ?? action)}
                        </span>
                        {inDefault && (
                          <span className="text-[9px] text-muted-foreground/70">
                            <Check className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {canEdit && !isPrimaryManager && (
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={resetToRole} variant="ghost" size="sm" disabled={saving}>
                <RotateCcw className="w-3.5 h-3.5 me-1" />
                {pickBi(isRTL, 'افتراضي الدور', 'Role defaults')}
              </Button>
              <Button onClick={handleSave} size="sm" disabled={saving || !dirty}>
                <Save className="w-3.5 h-3.5 me-1" />
                {pickBi(isRTL, 'حفظ', 'Save')}
              </Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground leading-snug">
            {pickBi(
              isRTL,
              'تظهر الشاشات والإجراءات للموظف في الشريط الجانبي بناءً على هذه الصلاحيات. سياسات الخادم تبقى المرجع الأساسي.',
              'Sidebar items and actions shown to this member are gated by these permissions. Server policies remain authoritative.',
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default StaffPermissionsMatrix;