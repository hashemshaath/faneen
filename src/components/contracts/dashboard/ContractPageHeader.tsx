import { BookOpen, FileText, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ContractPageHeaderProps {
  isRTL: boolean;
  showListActions: boolean;
  templatesCount: number;
  onOpenTemplates: () => void;
  onCreate: () => void;
  onBack: () => void;
}

/**
 * Page header for /dashboard/contracts.
 * Extracted from DashboardContracts (Phase 2B) — markup unchanged.
 */
export function ContractPageHeader({
  isRTL, showListActions, templatesCount, onOpenTemplates, onCreate, onBack,
}: ContractPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/20">
            <FileText className="w-5 h-5 text-accent-foreground" aria-hidden="true" />
          </div>
          {isRTL ? 'إدارة العقود' : 'Contract Management'}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 ms-11.5">
          {isRTL ? 'إنشاء ومتابعة وتصدير العقود الاحترافية' : 'Create, track, and export professional contracts'}
        </p>
      </div>
      {showListActions ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={onOpenTemplates}>
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            {isRTL ? 'القوالب' : 'Templates'}
            {templatesCount > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">{templatesCount}</Badge>
            )}
          </Button>
          <Button variant="hero" size="sm" className="gap-1.5 text-xs h-9 shadow-lg" onClick={onCreate}>
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
  );
}