import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { CheckCircle2, Info, Languages, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const MIGRATION_FLAG = 'qitaat_migration_v1_done';
const SWEEP_FLAG = 'qitaat_migration_v1_sweep_done';

/**
 * Tiny in-page indicator that confirms whether localStorage migration
 * (faneen_* → qitaat_*) succeeded on this device. Shows per-key status
 * for language and search history.
 */
export const MigrationStatusCard = () => {
  const { isRTL } = useLanguage();

  const status = useMemo(() => {
    if (typeof window === 'undefined') {
      return { migrated: false, hasLang: false, hasHistory: false, hasLegacyResidue: false };
    }
    const migrated = localStorage.getItem(MIGRATION_FLAG) === '1'
      && localStorage.getItem(SWEEP_FLAG) === '1';
    const hasLang = localStorage.getItem('qitaat_lang') !== null;
    const hasHistory = localStorage.getItem('qitaat_search_history') !== null;
    const hasLegacyResidue =
      localStorage.getItem('faneen_lang') !== null ||
      localStorage.getItem('faneen_search_history') !== null;
    return { migrated, hasLang, hasHistory, hasLegacyResidue };
  }, []);

  if (!status.migrated && !status.hasLegacyResidue) {
    // Migration hasn't run yet (truly first visit) — nothing useful to show
    return null;
  }

  const ok = status.migrated && !status.hasLegacyResidue;

  return (
    <Card className={cn(
      'border',
      ok
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-amber-500/20 bg-amber-500/5'
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          )}>
            {ok ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-heading font-bold text-sm">
              {ok
                ? (isRTL ? 'تم ترحيل بياناتك بنجاح' : 'Your data was migrated successfully')
                : (isRTL ? 'الترحيل قيد المعالجة' : 'Migration in progress')}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ok
                ? (isRTL
                    ? 'تم نقل تفضيلاتك من النظام السابق إلى قِطاعات على هذا الجهاز.'
                    : 'Your preferences were transferred from the previous system to qitaat on this device.')
                : (isRTL
                    ? 'سيتم إكمال نقل بياناتك تلقائياً عند تحديث الصفحة.'
                    : 'Your data transfer will complete automatically on next page reload.')}
            </p>

            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs',
                status.hasLang ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}>
                <Languages className="w-3 h-3 shrink-0" />
                <span className="font-medium truncate">
                  {isRTL ? 'اللغة' : 'Language'}
                </span>
                {status.hasLang && <CheckCircle2 className="w-3 h-3 ms-auto shrink-0" />}
              </div>
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs',
                status.hasHistory ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}>
                <History className="w-3 h-3 shrink-0" />
                <span className="font-medium truncate">
                  {isRTL ? 'سجل البحث' : 'Search history'}
                </span>
                {status.hasHistory && <CheckCircle2 className="w-3 h-3 ms-auto shrink-0" />}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
