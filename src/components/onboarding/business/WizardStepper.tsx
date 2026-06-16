/**
 * Professional 3-step progress header used at the top of the business
 * onboarding path:
 *   1. بيانات المنشأة   (business-details)
 *   2. مدير الحساب     (details + phone-verify)
 *   3. مستندات التوثيق  (documents)
 *
 * Presentational only. Each step displays an icon, bilingual label, and
 * its completion state (done | active | upcoming). Includes a soft
 * animated connector line and is fully RTL-aware via logical CSS.
 */
import React from 'react';
import { Building2, User, FileText, Check } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { cn } from '@/lib/utils';

export type WizardStage = 'business' | 'manager' | 'documents';

interface Props {
  current: WizardStage;
  /** Optional override for which stages are marked complete. */
  completed?: Partial<Record<WizardStage, boolean>>;
}

export const WizardStepper: React.FC<Props> = ({ current, completed = {} }) => {
  const bi = useBi();
  const order: WizardStage[] = ['business', 'manager', 'documents'];
  const meta: Record<WizardStage, { icon: typeof Building2; ar: string; en: string }> = {
    business: { icon: Building2, ar: 'بيانات المنشأة', en: 'Business' },
    manager: { icon: User, ar: 'مدير الحساب', en: 'Manager' },
    documents: { icon: FileText, ar: 'المستندات', en: 'Documents' },
  };
  const currentIdx = order.indexOf(current);

  return (
    <div className="relative">
      <ol className="grid grid-cols-3 gap-2 relative">
        {/* Connector */}
        <div
          aria-hidden
          className="absolute top-5 start-[16.66%] end-[16.66%] h-0.5 bg-muted overflow-hidden rounded-full"
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-gold transition-all duration-500"
            style={{ width: `${(currentIdx / (order.length - 1)) * 100}%` }}
          />
        </div>
        {order.map((stage, i) => {
          const { icon: Icon, ar, en } = meta[stage];
          const isDone = completed[stage] || i < currentIdx;
          const isActive = i === currentIdx;
          return (
            <li key={stage} className="relative flex flex-col items-center gap-1.5 z-10">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-background',
                  isDone
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isActive
                      ? 'border-gold bg-gold/10 text-gold scale-110 shadow-md shadow-gold/20'
                      : 'border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium text-center leading-tight',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {bi(ar, en)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default WizardStepper;