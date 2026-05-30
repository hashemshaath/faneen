import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ShieldCheck, UserPlus, Users, Loader2, Trash2, Power, Hash, Search, ChevronDown, ChevronUp, Settings2,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  insertBusinessStaff,
  updateBusinessStaffRole,
  setBusinessStaffActive,
  removeBusinessStaff,
} from '@/modules/businesses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { STAFF_ROLE_META, type StaffMember, type StaffRole } from './types';
import { PermissionsMatrix } from './PermissionsMatrix';
import { InvitationsPanel } from './InvitationsPanel';

interface Props {
  businessId: string;
  ownerUserId: string;
  isRTL: boolean;
  businessNameAr?: string | null;
  businessNameEn?: string | null;
  /**
   * When true, force manage-mode regardless of owner check (e.g. on the
   * Staff Center where access is gated by `staff.manage` permission).
   */
  canManageOverride?: boolean;
}

/** Authorized representatives (مفوضون) editor. Owner / admin only. */
export const RepresentativesSection: React.FC<Props> = ({
  businessId, ownerUserId, isRTL, businessNameAr = null, businessNameEn = null,
  canManageOverride = false,
}) => {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const isOwner = user?.id === ownerUserId;
  const canManage = isOwner || isAdmin || canManageOverride;

  const [refIdInput, setRefIdInput] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('viewer');
  const [adding, setAdding] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ---------- Load staff + profiles ----------
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['business-staff', businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<StaffMember[]> => {
      // Single round-trip via SECURITY DEFINER RPC: enforces owner/manager/admin
      // access and returns the minimal profile fields we need.
      const { data, error } = await supabase
        .rpc('get_business_staff_with_profiles', { _business_id: businessId });
      if (error) throw error;
      return ((data ?? []) as Array<StaffMember & {
        full_name: string | null; email: string | null; phone: string | null;
        avatar_url: string | null; ref_id: string | null;
      }>).map((row) => ({
        id: row.id,
        business_id: row.business_id,
        user_id: row.user_id,
        role: row.role,
        is_active: row.is_active,
        created_at: row.created_at,
        profile: {
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
          avatar_url: row.avatar_url,
          ref_id: row.ref_id,
        },
      }));
    },
  });

  const owners = useMemo(() => staff.filter((s) => s.role === 'owner'), [staff]);

  // ---------- Add by Ref ID ----------
  const handleAdd = async () => {
    const ref = refIdInput.trim().toUpperCase();
    if (!ref) {
      toast.error(isRTL ? 'أدخل الرقم المرجعي للمستخدم' : 'Enter the user reference ID');
      return;
    }
    setAdding(true);
    try {
      const { data: matches, error: profileError } = await supabase
        .rpc('find_user_by_ref_id', { _ref_id: ref });
      if (profileError) throw profileError;
      const profile = (matches ?? [])[0];
      if (!profile) {
        toast.error(isRTL ? 'لا يوجد مستخدم بهذا الرقم المرجعي' : 'No user found for this reference ID');
        return;
      }
      if (staff.some((s) => s.user_id === profile.user_id)) {
        toast.error(isRTL ? 'هذا المستخدم مضاف بالفعل' : 'This user is already a representative');
        return;
      }
      const { error: insertError } = await insertBusinessStaff({
        payload: {
          business_id: businessId,
          user_id: profile.user_id,
          role: newRole,
          invited_by: user?.id ?? null,
          is_active: true,
        },
      });
      if (insertError) throw insertError;
      toast.success(isRTL ? `تمت إضافة ${profile.full_name ?? profile.email ?? ref}` : `Added ${profile.full_name ?? profile.email ?? ref}`);
      setRefIdInput('');
      setNewRole('viewer');
      qc.invalidateQueries({ queryKey: ['business-staff', businessId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّرت الإضافة: ${msg}` : `Add failed: ${msg}`);
    } finally {
      setAdding(false);
    }
  };

  // ---------- Update / toggle / remove ----------
  const updateRow = async (id: string, patch: Partial<Pick<StaffMember, 'role' | 'is_active'>>) => {
    setBusyRowId(id);
    try {
      if (typeof patch.role !== 'undefined') {
        await updateBusinessStaffRole(id, patch.role);
      }
      if (typeof patch.is_active !== 'undefined') {
        await setBusinessStaffActive(id, patch.is_active);
      }
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
      qc.invalidateQueries({ queryKey: ['business-staff', businessId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّر التحديث: ${msg}` : `Update failed: ${msg}`);
    } finally {
      setBusyRowId(null);
    }
  };

  const removeRow = async (row: StaffMember) => {
    if (row.role === 'owner') {
      toast.error(isRTL ? 'لا يمكن إزالة المالك' : 'Cannot remove the owner');
      return;
    }
    setBusyRowId(row.id);
    try {
      await removeBusinessStaff(row.id);
      toast.success(isRTL ? 'تمت الإزالة' : 'Removed');
      qc.invalidateQueries({ queryKey: ['business-staff', businessId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّرت الإزالة: ${msg}` : `Remove failed: ${msg}`);
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="w-4 h-4 text-primary" />
          {isRTL ? 'المفوّضون وصلاحيات الفريق' : 'Authorized representatives & team permissions'}
          <Badge variant="outline" className="ms-2 tech-content">{staff.length}</Badge>
        </CardTitle>
        <CardDescription>
          {isRTL
            ? 'أضف مفوّضين برقمهم المرجعي وحدّد صلاحياتهم. يستطيع المالك أو المشرف فقط التعديل.'
            : 'Add representatives by their reference ID and assign roles. Only the owner or an admin can edit.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email invitations */}
        <InvitationsPanel
          businessId={businessId}
          businessNameAr={businessNameAr}
          businessNameEn={businessNameEn}
          isRTL={isRTL}
          canManage={canManage}
        />

        {/* Add new */}
        {canManage && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  <Hash className="w-3 h-3 inline me-1" />
                  {isRTL ? 'الرقم المرجعي للمستخدم (مثال: USR-1000017)' : 'User reference ID (e.g. USR-1000017)'}
                </Label>
                <Input
                  dir="ltr"
                  className="mt-1 tech-content"
                  placeholder="USR-1000017"
                  value={refIdInput}
                  onChange={(e) => setRefIdInput(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{isRTL ? 'الدور' : 'Role'}</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as StaffRole)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['manager', 'editor', 'viewer'] as StaffRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{isRTL ? STAFF_ROLE_META[r].ar : STAFF_ROLE_META[r].en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={adding} className="gap-1.5">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {isRTL ? 'إضافة' : 'Add'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {isRTL ? STAFF_ROLE_META[newRole].desc_ar : STAFF_ROLE_META[newRole].desc_en}
            </p>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin me-2" />
            {isRTL ? 'جارِ التحميل…' : 'Loading…'}
          </div>
        ) : staff.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            <Search className="w-4 h-4 inline me-1.5" />
            {isRTL ? 'لم يتم تعيين أي مفوّض بعد.' : 'No representatives assigned yet.'}
          </div>
        ) : (
          <ul className="rounded-xl border border-border divide-y divide-border bg-card">
            {staff.map((row) => {
              const meta = STAFF_ROLE_META[row.role];
              const lockedRole = row.role === 'owner' || (!canManage);
              const isOnlyOwner = row.role === 'owner' && owners.length === 1;
              return (
                <li key={row.id} className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {(row.profile?.full_name ?? row.profile?.email ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" dir="auto">
                        {row.profile?.full_name ?? (isRTL ? 'مستخدم بدون اسم' : 'Unnamed user')}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate tech-content">
                        {row.profile?.ref_id ?? '—'} · {row.profile?.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={meta.tone}>
                      <ShieldCheck className="w-3 h-3 me-1" />
                      {isRTL ? meta.ar : meta.en}
                    </Badge>
                    {!row.is_active && (
                      <Badge variant="outline" className="border-muted-foreground/30 bg-muted text-muted-foreground">
                        {isRTL ? 'موقوف' : 'Inactive'}
                      </Badge>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={row.role}
                        disabled={busyRowId === row.id || lockedRole}
                        onValueChange={(v) => updateRow(row.id, { role: v as StaffRole })}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['manager', 'editor', 'viewer'] as StaffRole[]).map((r) => (
                            <SelectItem key={r} value={r}>{isRTL ? STAFF_ROLE_META[r].ar : STAFF_ROLE_META[r].en}</SelectItem>
                          ))}
                          {row.role === 'owner' && (
                            <SelectItem value="owner" disabled>{isRTL ? STAFF_ROLE_META.owner.ar : STAFF_ROLE_META.owner.en}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={row.is_active ? (isRTL ? 'إيقاف الوصول' : 'Disable access') : (isRTL ? 'تفعيل الوصول' : 'Enable access')}
                        disabled={busyRowId === row.id || isOnlyOwner}
                        onClick={() => updateRow(row.id, { is_active: !row.is_active })}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title={isRTL ? 'إزالة المفوّض' : 'Remove representative'}
                        disabled={busyRowId === row.id || row.role === 'owner'}
                        onClick={() => removeRow(row)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={isRTL ? 'الصلاحيات التفصيلية' : 'Detailed permissions'}
                        onClick={() => setExpandedRow((cur) => (cur === row.id ? null : row.id))}
                      >
                        {expandedRow === row.id ? <ChevronUp className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
                {expandedRow === row.id && (
                  <div className="mt-3">
                    <PermissionsMatrix
                      staffId={row.id}
                      staffRole={row.role}
                      isRTL={isRTL}
                      canManage={canManage}
                    />
                  </div>
                )}
                </li>
              );
            })}
          </ul>
        )}

        {!canManage && (
          <p className="text-[11px] text-muted-foreground">
            {isRTL
              ? 'تحتاج صلاحية المالك أو المشرف لتعديل هذه القائمة.'
              : 'Only the owner or an admin can edit this list.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};