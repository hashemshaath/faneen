import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight } from 'lucide-react';
import { templateCategoryConfig } from '@/modules/contracts/constants/templateCategories';
import type { ContractTemplateGalleryItem } from '@/modules/contracts/types/templates';

interface TemplateCardProps {
  template: ContractTemplateGalleryItem;
  isRTL: boolean;
  onSelect: (template: ContractTemplateGalleryItem) => void;
}

/**
 * R2B.3b — Presentational template gallery card.
 * Pure UI: no queries, mutations, or side effects.
 * Markup preserved verbatim from DashboardContracts inline card.
 */
export function TemplateCard({ template, isRTL, onSelect }: TemplateCardProps) {
  const cfg = templateCategoryConfig[template.category];
  const Icon = cfg?.icon || FileText;
  const tags = [
    template.scope_of_work_ar && (isRTL ? 'نطاق' : 'Scope'),
    template.warranty_terms_ar && (isRTL ? 'ضمان' : 'Warranty'),
    template.payment_terms_ar && (isRTL ? 'دفع' : 'Payment'),
  ].filter(Boolean);

  return (
    <Card
      className="border-border/40 hover:border-accent/30 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onSelect(template)}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg?.color || 'bg-muted text-muted-foreground'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-heading font-semibold text-xs truncate group-hover:text-accent transition-colors">
              {isRTL ? template.name_ar : (template.name_en || template.name_ar)}
            </h4>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {cfg?.[isRTL ? 'ar' : 'en'] || template.category}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-[7px] px-1.5 py-0 h-4">{tag}</Badge>
              ))}
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1 ${isRTL ? 'rotate-180' : ''}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default TemplateCard;