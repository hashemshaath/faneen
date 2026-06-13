import React from 'react';
import {
  MoreHorizontal, Eye, Pencil, ShieldCheck, Activity, Ban, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { pickBi } from '@/components/common/Bilingual';

export interface UserRowActionHandlers {
  onView?: () => void;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onManageRoles?: () => void;
  onViewActivity?: () => void;
}

export interface UserRowActionsProps extends UserRowActionHandlers {
  isRTL: boolean;
  isBanned?: boolean | null;
  canManageRoles?: boolean;
}

/**
 * Phase 6A — unified per-row action dropdown for AdminUsers.
 *
 * Replaces the cluttered inline icon-button row with a single
 * "more actions" menu. The component is presentational: it owns no
 * mutations, no Supabase calls, and renders only the handlers the
 * parent provides — undefined handlers omit the corresponding item.
 *
 * Role management is hidden unless `canManageRoles` is true so the
 * dropdown stays consistent with the existing super-admin gate the
 * parent applies (no behavior change introduced here).
 */
export const UserRowActions = React.memo(function UserRowActions({
  isRTL,
  isBanned,
  canManageRoles = false,
  onView,
  onEdit,
  onToggleActive,
  onManageRoles,
  onViewActivity,
}: UserRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          aria-label={pickBi(isRTL, 'إجراءات', 'Actions')}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="text-[11px]">
          {pickBi(isRTL, 'إجراءات المستخدم', 'User actions')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onView && (
          <DropdownMenuItem onSelect={onView} className="gap-2 text-xs">
            <Eye className="w-3.5 h-3.5" />
            {pickBi(isRTL, 'عرض', 'View')}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit} className="gap-2 text-xs">
            <Pencil className="w-3.5 h-3.5" />
            {pickBi(isRTL, 'تعديل', 'Edit')}
          </DropdownMenuItem>
        )}
        {onToggleActive && (
          <DropdownMenuItem onSelect={onToggleActive} className="gap-2 text-xs">
            {isBanned ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-success" />
                {pickBi(isRTL, 'تفعيل', 'Activate')}
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5 text-destructive" />
                {pickBi(isRTL, 'إيقاف', 'Suspend')}
              </>
            )}
          </DropdownMenuItem>
        )}
        {canManageRoles && onManageRoles && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onManageRoles} className="gap-2 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              {pickBi(isRTL, 'الصلاحيات', 'Permissions')}
            </DropdownMenuItem>
          </>
        )}
        {onViewActivity && (
          <DropdownMenuItem onSelect={onViewActivity} className="gap-2 text-xs">
            <Activity className="w-3.5 h-3.5" />
            {pickBi(isRTL, 'سجل النشاط', 'Activity log')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});