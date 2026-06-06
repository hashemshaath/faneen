/**
 * LinkedBrandProductsInline — inline product browser for a single linked brand
 * on /dashboard/brands. Lazy-fetches approved `brand_products` and provides
 * a client-side search filter across Arabic/English names and model numbers.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { listApprovedBrandProducts } from '@/modules/brands';

type Loc = 'ar' | 'en';

interface Props {
  brandId: string;
  isRTL: boolean;
  locale: Loc;
}

export const LinkedBrandProductsInline: React.FC<Props> = ({ brandId, isRTL, locale }) => {
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['brand-approved-products', brandId],
    queryFn: () => listApprovedBrandProducts(brandId),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((p) =>
      (p.name_ar ?? '').toLowerCase().includes(needle) ||
      (p.name_en ?? '').toLowerCase().includes(needle) ||
      (p.model_number ?? '').toLowerCase().includes(needle),
    );
  }, [data, q]);

  if (isLoading) return <Skeleton className="h-10 w-full mt-2" />;

  return (
    <div className="mt-2 space-y-2">
      {data.length > 0 && (
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isRTL ? 'بحث في منتجات هذه العلامة…' : 'Search this brand’s products…'}
            className="h-8 ps-8 text-xs"
          />
        </div>
      )}
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'لا توجد منتجات معتمدة بعد لهذه العلامة.' : 'No approved products yet for this brand.'}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'لا نتائج مطابقة.' : 'No matching results.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {filtered.slice(0, 36).map((p) => {
              const lbl = locale === 'ar' ? p.name_ar : (p.name_en ?? p.name_ar);
              return (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 text-[11px] bg-muted/60 border rounded-full px-2 py-0.5"
                  title={p.model_number ?? undefined}
                >
                  <Package className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[10rem]">{lbl}</span>
                  {p.model_number && <code className="tech-content opacity-70">{p.model_number}</code>}
                </span>
              );
            })}
          </div>
          {filtered.length > 36 && (
            <span className="text-[11px] text-muted-foreground">
              {isRTL ? `+${filtered.length - 36} أخرى` : `+${filtered.length - 36} more`}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default LinkedBrandProductsInline;