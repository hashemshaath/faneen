import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Gift, Sparkles, Coins, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { listRewards, redeemReward, listMyRedemptions, getLoyaltySummary } from '@/modules/loyalty/services';

const TYPE_ICON: Record<string, typeof Gift> = {
  discount: Coins,
  credit: Coins,
  feature: Sparkles,
  gift: Gift,
};

const DashboardLoyaltyStore: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const bi = useBi();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ['loyalty-summary', user?.id],
    queryFn: () => getLoyaltySummary(user!.id),
    enabled: !!user?.id,
  });

  const { data: rewards, isLoading } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: listRewards,
  });

  const { data: redemptions } = useQuery({
    queryKey: ['loyalty-redemptions', user?.id],
    queryFn: () => listMyRedemptions(user!.id),
    enabled: !!user?.id,
  });

  const redeemMut = useMutation({
    mutationFn: (id: string) => redeemReward(id),
    onSuccess: () => {
      toast.success(isRTL ? 'تم استبدال النقاط بنجاح' : 'Reward redeemed successfully');
      qc.invalidateQueries({ queryKey: ['loyalty-summary'] });
      qc.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      qc.invalidateQueries({ queryKey: ['loyalty-redemptions'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Error';
      const map: Record<string, { ar: string; en: string }> = {
        insufficient_points: { ar: 'نقاطك غير كافية', en: 'Insufficient points' },
        out_of_stock: { ar: 'نفدت الكمية', en: 'Out of stock' },
        reward_unavailable: { ar: 'المكافأة غير متوفرة', en: 'Reward unavailable' },
      };
      const matched = Object.keys(map).find((k) => msg.includes(k));
      toast.error(matched ? bi(map[matched].ar, map[matched].en) : msg);
    },
  });

  const balance = summary?.total_points ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              <Bi ar="متجر المكافآت" en="Reward Store" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <Bi ar="استبدل نقاطك بخصومات ومزايا" en="Redeem your points for discounts and perks" />
            </p>
          </div>
          <Card className="px-5 py-3 bg-primary/5 border-primary/20">
            <div className="text-xs text-muted-foreground"><Bi ar="رصيد النقاط" en="Points balance" /></div>
            <div className="text-2xl font-bold tech-content">{balance.toLocaleString()}</div>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : !rewards || rewards.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Bi ar="لا توجد مكافآت متاحة حالياً" en="No rewards available right now" />
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((r) => {
              const Icon = TYPE_ICON[r.reward_type] ?? Gift;
              const affordable = balance >= r.points_cost;
              const outOfStock = r.stock !== null && r.stock <= 0;
              return (
                <Card key={r.id} className="hover-lift flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="tech-content">{r.points_cost.toLocaleString()} pts</Badge>
                    </div>
                    <h3 className="font-semibold text-base">{bi(r.title_ar, r.title_en)}</h3>
                    {(r.description_ar || r.description_en) && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                        {bi(r.description_ar ?? '', r.description_en ?? '')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        {r.stock === null ? (
                          <Bi ar="متاح دائماً" en="Always available" />
                        ) : (
                          <span className="tech-content">{r.stock} <Bi ar="متبقي" en="left" /></span>
                        )}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => redeemMut.mutate(r.id)}
                        disabled={!affordable || outOfStock || redeemMut.isPending}
                        className="rounded-lg"
                      >
                        {outOfStock ? <Bi ar="نفدت" en="Out" /> : !affordable ? <Bi ar="نقاط غير كافية" en="Need more" /> : <Bi ar="استبدال" en="Redeem" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {redemptions && redemptions.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <Bi ar="سجل الاستبدالات" en="Redemption History" />
              </h3>
              <div className="space-y-2">
                {redemptions.slice(0, 10).map((rd) => (
                  <div key={rd.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                    <span className="tech-content font-mono">{rd.redemption_code ?? '—'}</span>
                    <Badge variant={rd.status === 'fulfilled' ? 'default' : 'secondary'}>{rd.status}</Badge>
                    <span className="tech-content text-muted-foreground">-{rd.points_spent.toLocaleString()} pts</span>
                    <span className="text-xs text-muted-foreground tech-content">{new Date(rd.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardLoyaltyStore;