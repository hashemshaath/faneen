import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, ChevronRight, Filter, Search, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BranchInquiryForm } from './BranchInquiryForm';

interface ServiceCard {
  id: string;
  name_ar: string;
  name_en: string | null;
  price_from: number | null;
  currency_code: string;
  category_id: string | null;
}

interface CategoryRow { id: string; name_ar: string; name_en: string | null; }

interface Props {
  branchId: string;
  businessId: string;
  services: ServiceCard[];
}

export const BranchServicesSection: React.FC<Props> = ({ branchId, businessId, services }) => {
  const { isRTL } = useLanguage();
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [quoteFor, setQuoteFor] = useState<ServiceCard | null>(null);

  const catIds = useMemo(
    () => Array.from(new Set(services.map(s => s.category_id).filter((x): x is string => !!x))),
    [services],
  );

  const { data: categories = [] } = useQuery({
    queryKey: ['branch-service-categories', catIds.join('|')],
    enabled: catIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_ar, name_en')
        .in('id', catIds);
      return (data ?? []) as CategoryRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter(s => {
      if (category !== 'all' && s.category_id !== category) return false;
      if (!q) return true;
      const hay = `${s.name_ar} ${s.name_en ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [services, category, query]);

  if (services.length === 0) return null;

  return (
    <Card id="services" className="scroll-mt-32">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            {isRTL ? 'المنتجات والخدمات' : 'Products & Services'}
            <Badge variant="outline" className="text-[10px] tech-content">{services.length}</Badge>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRTL ? 'بحث في الخدمات...' : 'Search services...'}
              className="h-9 ps-9 rounded-xl text-sm"
              dir="auto"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-48 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All categories'}</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {isRTL ? c.name_ar : (c.name_en || c.name_ar)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-6">
            {isRTL ? 'لا توجد خدمات مطابقة.' : 'No matching services.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(s => {
              const name = isRTL ? s.name_ar : (s.name_en || s.name_ar);
              const isOpen = quoteFor?.id === s.id;
              return (
                <div key={s.id} className="rounded-xl border border-border/60 hover:border-primary/40 transition flex flex-col">
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug" dir="auto">{name}</p>
                      <Badge variant="outline" className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        {isRTL ? 'متوفّر' : 'Available'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 gap-2 flex-wrap">
                      {s.price_from != null ? (
                        <p className="text-sm text-primary font-semibold tech-content">
                          {isRTL ? 'من' : 'From'} {s.price_from} <span className="text-xs text-muted-foreground">{s.currency_code}</span>
                        </p>
                      ) : <span className="text-xs text-muted-foreground">{isRTL ? 'السعر عند الطلب' : 'Price on request'}</span>}
                      <Button
                        size="sm"
                        variant={isOpen ? 'secondary' : 'outline'}
                        className="gap-1 rounded-lg h-8 text-xs"
                        onClick={() => setQuoteFor(isOpen ? null : s)}
                        aria-expanded={isOpen}
                      >
                        <Send className="w-3 h-3" />
                        {isOpen ? (isRTL ? 'إخفاء' : 'Hide')
                                : (isRTL ? 'طلب عرض سعر' : 'Request quote')}
                        {!isOpen && <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />}
                      </Button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-border/60 p-3 bg-muted/20">
                      <BranchInquiryForm
                        branchId={branchId}
                        businessId={businessId}
                        serviceId={s.id}
                        serviceName={name}
                        compact
                        onSubmitted={() => setQuoteFor(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchServicesSection;