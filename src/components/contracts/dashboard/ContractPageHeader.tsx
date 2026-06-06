import { BookOpen, FileText, Plus, X, BarChart3, RefreshCw, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface ContractPageHeaderProps {
  isRTL: boolean;
  showListActions: boolean;
  templatesCount: number;
  onOpenTemplates: () => void;
  onCreate: () => void;
  onBack: () => void;
  /** Provider-only — renders Analytics shortcut when true. */
  showAnalytics?: boolean;
  /** Optional refresh handler — shows refresh icon button when provided. */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Optional — opens the "Import & digitize contract" panel. */
  onImport?: () => void;
}

/**
 * Page header for /dashboard/contracts.
 * Extracted from DashboardContracts (Phase 2B) — markup unchanged.
 */
export function ContractPageHeader({
  isRTL, showListActions, templatesCount, onOpenTemplates, onCreate, onBack,
  showAnalytics, onRefresh, isRefreshing, onImport,
}: ContractPageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-accent/[0.04] shadow-[var(--elev-1)]">
      <div className="pointer-events-none absolute -top-16 -end-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-end gap-2 p-3 sm:p-4">
        {showListActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-muted"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label={isRTL ? 'تحديث' : 'Refresh'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>
            )}
            {showAnalytics && (
              <Link to="/dashboard/contract-analytics">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 hover-lift">
                  <BarChart3 className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  {isRTL ? 'التحليلات' : 'Analytics'}
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 hover-lift" onClick={onOpenTemplates}>
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              {isRTL ? 'القوالب' : 'Templates'}
              {templatesCount > 0 && (
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">{templatesCount}</Badge>
              )}
            </Button>
            {onImport && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 hover-lift" onClick={onImport}>
                <FileSearch className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                {isRTL ? 'استيراد عقد' : 'Import contract'}
              </Button>
            )}
            <Button variant="hero" size="sm" className="gap-1.5 text-xs h-9 shadow-lg shadow-accent/20 hover-lift" onClick={onCreate}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              {isRTL ? 'عقد جديد' : 'New Contract'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={onBack}>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
        )}
      </div>
    </div>
  );
}