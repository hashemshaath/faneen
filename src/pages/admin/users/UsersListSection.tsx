import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Ban, UserCheck, Check, ChevronLeft, ChevronRight, Download, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { pickBi } from '@/components/common/Bilingual';
import { isSyntheticPhoneEmail } from '@/lib/auth-email';
import { UserListRow } from './UserListRow';
import type { BusinessLink, StaffRole } from './_shared';
import type { Profile, UserRole } from './userConfigs';
import type { Density } from './_shared';

/**
 * Phase 6C — page-scoped composition of the Users tab body. Owns no
 * state and no mutations; the parent `AdminUsers` page wires every
 * callback and supplies the rendered inline panels via `panelsSlot`.
 *
 * Responsibilities:
 *   - bulk actions bar (export selected, bulk disable/enable, clear)
 *   - inline panels slot (create / edit / password / delete dialog)
 *   - loading + empty states
 *   - paginated list of `<UserListRow>`
 *   - pagination controls
 */
export interface UsersListSectionProps {
  isRTL: boolean;
  language: string;
  currentUserId: string;
  isSuperAdmin: boolean;
  // data
  paginated: Profile[];
  sorted: Profile[];
  roleMap: Map<string, UserRole[]>;
  businessLinksMap: Map<string, BusinessLink[]>;
  loading: boolean;
  // selection + ui
  selected: Set<string>;
  expanded: Set<string>;
  density: Density;
  // pagination
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  // row callbacks
  onToggleSelect: (profileId: string) => void;
  onToggleExpand: (profileId: string) => void;
  onEdit: (p: Profile) => void;
  onView: (p: Profile) => void;
  onPassword: (p: Profile) => void;
  onToggleBan: (p: Profile) => void;
  onDelete: (p: Profile) => void;
  onAddRole: (userId: string, role: string) => void;
  onRemoveRole: (id: string) => void;
  onChangeStaffRole: (link: BusinessLink, role: StaffRole) => void;
  onRemoveStaff: (link: BusinessLink) => void;
  // bulk
  onClearSelection: () => void;
  onBulkBan: (ids: string[], isBanned: boolean) => void;
  bulkBanPending: boolean;
  // inline forms / dialogs prepared by parent
  panelsSlot?: React.ReactNode;
}

export function UsersListSection(props: UsersListSectionProps) {
  const {
    isRTL, language, currentUserId, isSuperAdmin,
    paginated, sorted, roleMap, businessLinksMap, loading,
    selected, expanded, density,
    page, totalPages, onPageChange,
    onToggleSelect, onToggleExpand,
    onEdit, onView, onPassword, onToggleBan, onDelete,
    onAddRole, onRemoveRole, onChangeStaffRole, onRemoveStaff,
    onClearSelection, onBulkBan, bulkBanPending,
    panelsSlot,
  } = props;

  const handleExportSelected = () => {
    const selectedProfiles = sorted.filter(p => selected.has(p.id));
    const rows = selectedProfiles.map(p => {
      const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
      const created = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '';
      const emailCell = p.email && !isSyntheticPhoneEmail(p.email) ? p.email : '';
      return [p.ref_id, p.full_name || '', emailCell, p.phone || '', p.account_type, p.membership_tier, roles, p.is_banned ? 'Yes' : 'No', created]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + ['Ref,Name,Email,Phone,Type,Tier,Roles,Banned,Created', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_selected_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? `تم تصدير ${selectedProfiles.length}` : `Exported ${selectedProfiles.length}`);
  };

  const handleBulkDisable = () => {
    const safeIds = sorted.filter(p => {
      if (!selected.has(p.id)) return false;
      if (p.user_id === currentUserId) return false;
      const r = roleMap.get(p.user_id) || [];
      return !r.some(x => x.role === 'super_admin' || x.role === 'admin');
    }).map(p => p.id);
    const skipped = selected.size - safeIds.length;
    if (safeIds.length === 0) {
      toast.error(pickBi(isRTL, 'لا يمكن تعطيل حسابك أو حسابات المشرفين', 'Cannot disable your own account or admin accounts'));
      return;
    }
    if (skipped > 0) toast.warning(isRTL ? `تم تجاهل ${skipped} حساب محمي` : `Skipped ${skipped} protected account(s)`);
    onBulkBan(safeIds, true);
  };

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-1">
          <Badge className="bg-accent text-accent-foreground gap-1"><Check className="w-3 h-3" />{selected.size}</Badge>
          <span className="text-xs text-foreground">{pickBi(isRTL, 'محدد', 'selected')}</span>
          <div className="ms-auto flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8" onClick={handleExportSelected}>
              <Download className="w-3.5 h-3.5" />{pickBi(isRTL, 'تصدير المحدد', 'Export')}
            </Button>
            {isSuperAdmin && (
              <>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-warning border-warning"
                  onClick={handleBulkDisable}
                  disabled={bulkBanPending}>
                  <Ban className="w-3.5 h-3.5" />{pickBi(isRTL, 'تعطيل', 'Disable')}
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-success border-success"
                  onClick={() => onBulkBan(Array.from(selected), false)}
                  disabled={bulkBanPending}>
                  <UserCheck className="w-3.5 h-3.5" />{pickBi(isRTL, 'تفعيل', 'Enable')}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="rounded-xl h-8" onClick={onClearSelection}>
              <X className="w-3.5 h-3.5" />{pickBi(isRTL, 'إلغاء', 'Clear')}
            </Button>
          </div>
        </div>
      )}

      {panelsSlot}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-accent/30" />
          </div>
          <p className="font-heading font-bold text-sm mb-1">{pickBi(isRTL, 'لا توجد نتائج', 'No results')}</p>
          <p className="text-xs text-muted-foreground">{pickBi(isRTL, 'جرّب تغيير الفلاتر', 'Try changing filters')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(profile => {
              const roles = roleMap.get(profile.user_id) || [];
              const isCurrentUser = profile.user_id === currentUserId;
              const targetIsSuperAdmin = roles.some(r => r.role === 'super_admin');
              const targetIsAdmin = roles.some(r => r.role === 'admin' || r.role === 'super_admin');
              const canManageUser = !isCurrentUser && (isSuperAdmin || (!targetIsSuperAdmin && !targetIsAdmin));
              return (
                <UserListRow
                  key={profile.id}
                  profile={profile}
                  roles={roles}
                  businessLinks={businessLinksMap.get(profile.user_id) || []}
                  isCurrentUser={isCurrentUser}
                  canManageUser={canManageUser}
                  isSuperAdmin={isSuperAdmin}
                  isRTL={isRTL}
                  language={language}
                  selected={selected.has(profile.id)}
                  expanded={expanded.has(profile.id)}
                  density={density}
                  onToggleSelect={() => onToggleSelect(profile.id)}
                  onToggleExpand={() => onToggleExpand(profile.id)}
                  onEdit={onEdit}
                  onView={onView}
                  onPassword={onPassword}
                  onToggleBan={onToggleBan}
                  onDelete={onDelete}
                  onAddRole={onAddRole}
                  onRemoveRole={onRemoveRole}
                  onChangeStaffRole={onChangeStaffRole}
                  onRemoveStaff={onRemoveStaff}
                />
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {pickBi(isRTL, 'السابق', 'Prev')}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let n = i + 1;
                  if (totalPages > 7) {
                    if (page > 4) n = page - 3 + i;
                    if (n > totalPages - 6) n = totalPages - 6 + i;
                  }
                  return (
                    <button key={n} onClick={() => onPageChange(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors tech-content
                        ${n === page ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                      {n}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
                {pickBi(isRTL, 'التالي', 'Next')}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UsersListSection;