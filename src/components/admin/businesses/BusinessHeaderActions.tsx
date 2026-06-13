import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid, List, RefreshCw, Download, ShieldCheck, Plus,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { SavedViewsMenu } from '@/components/admin/SavedViewsMenu';

/**
 * BusinessHeaderActions — the action cluster rendered on the right of
 * AdminPageHeader for AdminBusinesses. Pure presentational. Accepts
 * the saved-views menu as a typed slot so this component does not
 * depend on the saved-views generic type. No Supabase, no mutations.
 */
interface BusinessHeaderActionsProps {
  isRTL: boolean;
  viewMode: 'cards' | 'table';
  onViewModeChange: (v: 'cards' | 'table') => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onCreate: () => void;
  /** Pre-bound SavedViewsMenu (typed at the call site). */
  savedViewsSlot?: React.ReactNode;
}

export const BusinessHeaderActions: React.FC<BusinessHeaderActionsProps> = ({
  isRTL, viewMode, onViewModeChange, onRefresh, onExportCsv, onCreate, savedViewsSlot,
}) => {
  return (
    <>
      <div className="flex bg-muted/40 border border-border/40 rounded-xl overflow-hidden p-0.5">
        <button
          type="button"
          aria-label={pickBi(isRTL, 'عرض بطاقات', 'Card view')}
          className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onViewModeChange('cards')}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label={pickBi(isRTL, 'عرض جدول', 'Table view')}
          className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onViewModeChange('table')}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-10 text-xs gap-1.5 rounded-xl"
        onClick={onRefresh}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{pickBi(isRTL, 'تحديث', 'Refresh')}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 text-xs gap-1.5 rounded-xl"
        onClick={onExportCsv}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{pickBi(isRTL, 'تصدير CSV', 'Export CSV')}</span>
      </Button>
      {savedViewsSlot}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-10 text-xs gap-1.5 rounded-xl"
      >
        <Link to="/admin/provider-review">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{pickBi(isRTL, 'مراجعة المزودين', 'Provider Review')}</span>
        </Link>
      </Button>
      <Button
        size="sm"
        className="h-10 text-xs gap-1.5 rounded-xl"
        onClick={onCreate}
      >
        <Plus className="w-3.5 h-3.5" />
        {pickBi(isRTL, 'منشأة جديدة', 'New Business')}
      </Button>
    </>
  );
};

export default BusinessHeaderActions;