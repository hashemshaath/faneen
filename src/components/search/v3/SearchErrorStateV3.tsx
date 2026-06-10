import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBi } from '@/components/common/Bilingual';

interface Props { onRetry?: () => void }

export const SearchErrorStateV3 = ({ onRetry }: Props) => {
  const bi = useBi();
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-heading font-bold text-foreground mb-1.5">
        {bi('تعذّر تحميل النتائج', 'Failed to load results')}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-5">
        {bi(
          'حدث خطأ أثناء جلب البيانات. تحقق من الاتصال ثم حاول مرة أخرى.',
          'Something went wrong while fetching results. Check your connection and try again.',
        )}
      </p>
      {onRetry ? (
        <Button onClick={onRetry} variant="default" size="app" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          {bi('إعادة المحاولة', 'Retry')}
        </Button>
      ) : null}
    </div>
  );
};

export default SearchErrorStateV3;