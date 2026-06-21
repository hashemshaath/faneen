import React from 'react';
import { Building2 } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { BusinessHeaderActions } from '@/components/admin/businesses/BusinessHeaderActions';
import { SavedViewsMenu } from '@/components/admin/SavedViewsMenu';
import type { SavedView } from '@/hooks/useAdminSavedViews';
import type { BizViewFilters } from '../businessSavedViews';

/**
 * AdminBusinessesHeader — Phase 5J extraction.
 *
 * Wraps the AdminPageHeader + action cluster + saved-views menu used
 * by the AdminBusinesses page. Pure presentational. No Supabase, no
 * mutations, no DB/RLS/RPC concerns. Behavior is identical to the
 * previous inline header block.
 */
interface SavedViewsApi {
  views: SavedView<BizViewFilters>[];
  save: (name: string, filters: BizViewFilters) => SavedView<BizViewFilters>;
  remove: (id: string) => void;
}

interface AdminBusinessesHeaderProps {
  isRTL: boolean;
  panelOpen: boolean;
  viewMode: 'cards' | 'table';
  onViewModeChange: (v: 'cards' | 'table') => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onCreate: () => void;
  savedViews: SavedViewsApi;
  currentViewFilters: BizViewFilters;
  onApplySavedView: (f: BizViewFilters) => void;
}

export const AdminBusinessesHeader: React.FC<AdminBusinessesHeaderProps> = ({
  isRTL,
  panelOpen,
  viewMode,
  onViewModeChange,
  onRefresh,
  onExportCsv,
  onCreate,
  savedViews,
  currentViewFilters,
  onApplySavedView,
}) => {
  return (
    <AdminPageHeader
      tone="accent"
      icon={Building2}
      eyebrow={pickBi(isRTL, 'لوحة الإدارة', 'Admin Console')}
      breadcrumbs={[
        { label: pickBi(isRTL, 'الإدارة', 'Admin'), href: '/admin' },
        { label: pickBi(isRTL, 'إدارة الجهات والمزودين', 'Businesses & Providers') },
      ]}
      title={pickBi(isRTL, 'إدارة الجهات والمزودين', 'Businesses & Providers Control Center')}
      subtitle={panelOpen ? undefined : pickBi(
        isRTL,
        'مركز موحد لمراجعة الجهات، إدارة المزودين، متابعة الظهور العام، وجاهزية التشغيل.',
        'Unified center to review businesses, manage providers, track public visibility & pilot readiness.',
      )}
      actions={
        <BusinessHeaderActions
          isRTL={isRTL}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onRefresh={onRefresh}
          onExportCsv={onExportCsv}
          onCreate={onCreate}
          savedViewsSlot={
            <SavedViewsMenu
              views={savedViews.views}
              currentFilters={currentViewFilters}
              onApply={onApplySavedView}
              onSave={savedViews.save}
              onRemove={savedViews.remove}
            />
          }
        />
      }
    />
  );
};