import { FileText, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContractEmptyStateProps {
  filtersActive: boolean;
  isRTL: boolean;
  onCreate: () => void;
  onResetFilters: () => void;
}

/**
 * Empty state for the contracts list, distinguishing
 * "no contracts at all" from "filters yield nothing".
 * Extracted from DashboardContracts (Phase 2A) — behavior unchanged.
 */
export function ContractEmptyState({ filtersActive, isRTL, onCreate, onResetFilters }: ContractEmptyStateProps) {
  return (
    <Card className="border-dashed border-2 bg-gradient-to-br from-muted/20 to-transparent" role="status" aria-live="polite">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 shadow-inner">
          <FileText className="w-8 h-8 text-accent" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-heading font-bold mb-2">
          {filtersActive
            ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results')
            : (isRTL ? 'لا توجد عقود' : 'No contracts yet')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {filtersActive
            ? (isRTL ? 'جرّب تعديل البحث أو إعادة ضبط عوامل التصفية' : 'Try adjusting your search or clearing the filters')
            : (isRTL ? 'ابدأ بإنشاء أول عقد احترافي لإدارة أعمالك' : 'Start by creating your first professional contract')}
        </p>
        {filtersActive ? (
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={onResetFilters}
            aria-label={isRTL ? 'إعادة ضبط عوامل التصفية' : 'Reset filters'}
          >
            {isRTL ? 'إعادة ضبط عوامل التصفية' : 'Reset filters'}
          </Button>
        ) : (
          <Button variant="hero" size="lg" className="gap-2 shadow-lg" onClick={onCreate}>
            <Plus className="w-5 h-5" aria-hidden="true" />{isRTL ? 'إنشاء عقد جديد' : 'Create New Contract'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}