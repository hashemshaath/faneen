import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageCircle } from 'lucide-react';

const DashboardReviews = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  // First get user's business
  const { data: business } = useQuery({
    queryKey: ['my-business-for-reviews', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['dashboard-reviews', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!business?.id,
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">{isRTL ? 'التقييمات' : 'Reviews'}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? 'تقييمات العملاء على خدماتك' : 'Customer reviews of your services'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="w-8 h-8 text-gold fill-gold" />
              <div>
                <p className="text-2xl font-bold">{avgRating}</p>
                <p className="text-sm text-muted-foreground">{isRTL ? 'متوسط التقييم' : 'Average Rating'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي التقييمات' : 'Total Reviews'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : reviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-gold fill-gold' : 'text-muted'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                  {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
                  {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardReviews;
