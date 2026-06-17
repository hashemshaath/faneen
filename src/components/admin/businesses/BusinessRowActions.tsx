import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal, Eye, Edit, Package, ExternalLink, FileText,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { getBusinessProfileHref } from '@/lib/business/profileHref';

/**
 * BusinessRowActions — unified per-row action menu for AdminBusinesses.
 *
 * Pure presentational. Receives handlers as props; emits no Supabase
 * calls itself. Replaces the loose pile of icon-buttons that lived
 * inside the table/card row cells.
 *
 * Order is locked: View → Edit → Services → Public profile.
 * Approval / publish / sensitive-field actions are intentionally NOT
 * included here — those flows remain owned by their own panels.
 */
interface BusinessRowActionsProps {
  businessId: string;
  username?: string | null;
  isRTL: boolean;
  onView: () => void;
  onEdit: () => void;
  onOpenServices: () => void;
  hasContracts?: boolean;
  align?: 'start' | 'end';
}

export const BusinessRowActions: React.FC<BusinessRowActionsProps> = ({
  username, isRTL, onView, onEdit, onOpenServices, hasContracts, align = 'end',
}) => {
  const profileHref = getBusinessProfileHref({ username });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl"
          aria-label={pickBi(isRTL, 'إجراءات', 'Actions')}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {pickBi(isRTL, 'إجراءات', 'Actions')}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={onView} className="gap-2">
          <Eye className="w-4 h-4" />
          {pickBi(isRTL, 'عرض التفاصيل', 'View details')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit} className="gap-2">
          <Edit className="w-4 h-4" />
          {pickBi(isRTL, 'تعديل', 'Edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenServices} className="gap-2">
          <Package className="w-4 h-4" />
          {pickBi(isRTL, 'الخدمات', 'Services')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {profileHref && (
          <DropdownMenuItem asChild className="gap-2">
            <Link to={profileHref} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" />
              {pickBi(isRTL, 'الملف العام', 'Public profile')}
            </Link>
          </DropdownMenuItem>
        )}
        {hasContracts && (
          <DropdownMenuItem disabled className="gap-2 opacity-70">
            <FileText className="w-4 h-4" />
            {pickBi(isRTL, 'مرتبط بعقود', 'Has contracts')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BusinessRowActions;