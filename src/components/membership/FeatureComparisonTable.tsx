import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureRow {
  labelAr: string;
  labelEn: string;
  free: boolean | string;
  basic: boolean | string;
  premium: boolean | string;
  enterprise: boolean | string;
}

const comparisonFeatures: FeatureRow[] = [
  { labelAr: 'صفحة تعريفية', labelEn: 'Business Profile', free: false, basic: true, premium: true, enterprise: true },
  { labelAr: 'معرض أعمال', labelEn: 'Portfolio Gallery', free: false, basic: '5', premium: '20', enterprise: '∞' },
  { labelAr: 'استقبال طلبات', labelEn: 'Receive Requests', free: false, basic: true, premium: true, enterprise: true },
  { labelAr: 'عقود إلكترونية', labelEn: 'E-Contracts', free: false, basic: '3/شهر', premium: '∞', enterprise: '∞' },
  { labelAr: 'إعلانات مميزة', labelEn: 'Featured Ads', free: false, basic: false, premium: true, enterprise: true },
  { labelAr: 'تحليلات متقدمة', labelEn: 'Advanced Analytics', free: false, basic: false, premium: true, enterprise: true },
  { labelAr: 'أولوية الظهور', labelEn: 'Priority Listing', free: false, basic: false, premium: true, enterprise: true },
  { labelAr: 'دعم مخصص', labelEn: 'Dedicated Support', free: false, basic: false, premium: false, enterprise: true },
  { labelAr: 'تقارير أداء', labelEn: 'Performance Reports', free: false, basic: false, premium: false, enterprise: true },
  { labelAr: 'فروع متعددة', labelEn: 'Multiple Branches', free: false, basic: '1', premium: '3', enterprise: '∞' },
];

const tiers = ['free', 'basic', 'premium', 'enterprise'] as const;
const tierLabels = {
  free: { ar: 'مجاني', en: 'Free' },
  basic: { ar: 'أساسي', en: 'Basic' },
  premium: { ar: 'مميز', en: 'Premium' },
  enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
};

interface FeatureComparisonTableProps {
  isRTL: boolean;
}

export const FeatureComparisonTable = ({ isRTL }: FeatureComparisonTableProps) => (
  <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
    <h2 className="font-heading font-bold text-xl sm:text-2xl text-center mb-6">
      {isRTL ? 'مقارنة تفصيلية للمميزات' : 'Detailed Feature Comparison'}
    </h2>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-muted/30">
            <th className="text-start p-3 font-heading font-semibold text-muted-foreground min-w-[140px]">
              {isRTL ? 'الميزة' : 'Feature'}
            </th>
            {tiers.map(tier => (
              <th key={tier} className={cn(
                'p-3 font-heading font-semibold text-center min-w-[80px]',
                tier === 'premium' && 'bg-accent/10 text-accent'
              )}>
                {isRTL ? tierLabels[tier].ar : tierLabels[tier].en}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparisonFeatures.map((feat, idx) => (
            <tr key={idx} className="border-t border-border/50 hover:bg-muted/10 transition-colors">
              <td className="p-3 font-medium text-foreground/80">
                {isRTL ? feat.labelAr : feat.labelEn}
              </td>
              {tiers.map(tier => {
                const val = feat[tier];
                return (
                  <td key={tier} className={cn('p-3 text-center', tier === 'premium' && 'bg-accent/5')}>
                    {val === true ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : val === false ? (
                      <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                    ) : (
                      <span className="font-semibold text-foreground">{val}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
