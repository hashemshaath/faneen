import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, ShieldAlert, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  BUSINESS_MODULES, PERMISSION_ACTIONS,
  type BusinessModule, type ModulePermission, type StaffRole,
} from './types';

interface Props {
  staffId: string;
  staffRole: StaffRole;
  isRTL: boolean;
  canManage: boolean;
}

type ActionKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

/** Returns role-based defaults when no explicit row exists for a module. */
function defaultsForRole(role: StaffRole): Pick<ModulePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'> {
  if (role === 'owner' || role === 'manager') {
    return { can_view: true, can_create: true, can_edit: true, can_delete: true };
  }
  if (role === 'editor') {
    return { can_view: true, can_create: true, can_edit: true, can_delete: false };
  }
  return { can_view: true, can_create: false, can_edit: false, can_delete: false };
}

export const PermissionsMatrix: React.FC<Props> = ({ staffId, staffRole, isRTL, canManage }) => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<BusinessModule, Pick<ModulePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>>>(
    () => Object.fromEntries(BUSINESS_MODULES.map((m) => [m.key, defaultsForRole(staffRole)])) as Record<BusinessModule, ReturnType<typeof defaultsForRole>>,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const roleLocked = staffRole === 'owner' || staffRole === 'manager';

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['staff-permissions', staffId],
    enabled: !!staffId && !roleLocked,
    queryFn: async (): Promise<ModulePermission[]> => {
      const { data, error } = await supabase
        .from('business_staff_permissions')
        .select('id, business_staff_id, module, can_view, can_create, can_edit, can_delete')
        .eq('business_staff_id', staffId);
      if (error) throw error;
      return (data ?? []) as ModulePermission[];
    },
  });

  useEffect(() => {
    if (roleLocked) return;
    const next = Object.fromEntries(
      BUSINESS_MODULES.map((m) => [m.key, defaultsForRole(staffRole)]),
    ) as Record<BusinessModule, ReturnType<typeof defaultsForRole>>;
    rows.forEach((r) => {
      next[r.module as BusinessModule] = {
        can_view: r.can_view, can_create: r.can_create,
        can_edit: r.can_edit, can_delete: r.can_delete,
      };
    });
    setDraft(next);
    setDirty(false);
  }, [rows, staffRole, roleLocked]);

  const toggle = (module: BusinessModule, action: ActionKey, value: boolean) => {
    setDraft((prev) => ({ ...prev, [module]: { ...prev[module], [action]: value } }));
    setDirty(true);
  };

  const reset = () => {
    const next = Object.fromEntries(
      BUSINESS_MODULES.map((m) => [m.key, defaultsForRole(staffRole)]),
    ) as Record<BusinessModule, ReturnType<typeof defaultsForRole>>;
    setDraft(next);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing then insert: keeps the row count == module count.
      const { error: delErr } = await supabase
        .from('business_staff_permissions')
        .delete()
        .eq('business_staff_id', staffId);
      if (delErr) throw delErr;

      const payload = BUSINESS_MODULES.map((m) => ({
        business_staff_id: staffId,
        module: m.key,
        ...draft[m.key],
      }));
      const { error: insErr } = await supabase
        .from('business_staff_permissions')
        .insert(payload);
      if (insErr) throw insErr;

      toast.success(isRTL ? 'تم حفظ الصلاحيات' : 'Permissions saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['staff-permissions', staffId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّر الحفظ: ${msg}` : `Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (roleLocked) {
    return (
      <div className="rounded-xl border border-info/20 bg-info/5 px-3 py-3 text-xs text-info">
        <ShieldAlert className="w-3.5 h-3.5 inline me-1.5" />
        {isRTL
          ? 'هذا الدور يحصل على صلاحيات كاملة افتراضيًا ولا يمكن تقييده عبر هذه المصفوفة.'
          : 'This role has full permissions by default and cannot be limited via this matrix.'}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">
          {isRTL ? 'صلاحيات تفصيلية لكل وحدة' : 'Per-module granular permissions'}
        </p>
        {canManage && (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
              <RotateCcw className="w-3 h-3 me-1" />
              {isRTL ? 'افتراضي' : 'Defaults'}
            </Button>
            <Button size="sm" className="h-7 text-xs" disabled={!dirty || saving} onClick={handleSave}>
              {saving ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : <Save className="w-3 h-3 me-1" />}
              {isRTL ? 'حفظ' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-xs text-muted-foreground py-4">
          <Loader2 className="w-3.5 h-3.5 inline animate-spin me-1.5" />
          {isRTL ? 'تحميل…' : 'Loading…'}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-start py-1.5 ps-1 font-medium">{isRTL ? 'الوحدة' : 'Module'}</th>
                {PERMISSION_ACTIONS.map((a) => (
                  <th key={a.key} className="text-center px-1 font-medium">{isRTL ? a.ar : a.en}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {BUSINESS_MODULES.map((m) => (
                <tr key={m.key}>
                  <td className="py-1.5 ps-1 text-foreground">
                    <span className="font-medium">{isRTL ? m.ar : m.en}</span>
                  </td>
                  {PERMISSION_ACTIONS.map((a) => (
                    <td key={a.key} className="text-center px-1">
                      <Switch
                        checked={draft[m.key]?.[a.key] ?? false}
                        disabled={!canManage}
                        onCheckedChange={(v) => toggle(m.key, a.key, v)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dirty && canManage && (
        <Badge variant="outline" className="mt-2 border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]">
          {isRTL ? 'تغييرات غير محفوظة' : 'Unsaved changes'}
        </Badge>
      )}
    </div>
  );
};
