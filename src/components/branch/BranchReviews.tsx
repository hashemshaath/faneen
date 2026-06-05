import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Filter, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

interface BranchReviewRow {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
  service_id: string | null;
  is_verified: boolean;
}

interface ServiceLite {
  id: string;
  name_ar: string;
  name_en: string | null;
}

interface BranchReviewsProps {
  branchId: string;
  businessId: string;
}

export const BranchReviews: React.FC<BranchReviewsProps> = ({ branchId, businessId }) => {
  const { isRTL } = useLanguage();
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const { data: reviews = [] } = useQuery({
    queryKey: ['branch-reviews', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, title, content, created_at, service_id, is_verified')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data ?? []) as BranchReviewRow[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['branch-reviews-services', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_services')
        .select('id, name_ar, name_en')
        .eq('business_id', businessId)
        .eq('is_active', true);
      return (data ?? []) as ServiceLite[];
    },
  });

  const filtered = useMemo(
    () => (serviceFilter === 'all' ? reviews : reviews.filter(r => r.service_id === serviceFilter)),
    [reviews, serviceFilter],
  );

  const stats = useMemo(() => {
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { count, avg };
  }, [reviews]);

  const usedServiceIds = useMemo(
    () => new Set(reviews.map(r => r.service_id).filter((id): id is string => !!id)),
    [reviews],
  );
  const filterableServices = services.filter(s => usedServiceIds.has(s.id));

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {isRTL ? 'تقييمات الفرع' : 'Branch reviews'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(stats.avg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
                />
              ))}
              <span className="ms-2 text-sm font-semibold tech-content">{stats.avg.toFixed(1)}</span>
            </div>
            <Badge variant="outline" className="text-[11px]">
              {stats.count} {isRTL ? 'مراجعة' : 'reviews'}
            </Badge>
          </div>
        </div>

        {filterableServices.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="h-9 w-56 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? 'كل الخدمات' : 'All services'}</SelectItem>
                {filterableServices.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {isRTL ? s.name_ar : (s.name_en || s.name_ar)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isRTL ? 'لا توجد مراجعات بعد لهذا الفرع.' : 'No reviews yet for this branch.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map(r => (
              <li key={r.id} className="rounded-xl border border-border/40 p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground tech-content">
                    {new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
                {r.title && <p className="font-medium text-sm" dir="auto">{r.title}</p>}
                {r.content && <p className="text-sm text-muted-foreground mt-1" dir="auto">{r.content}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchReviews;