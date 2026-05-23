import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { redeemPromoCode } from '@/modules/memberships';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props { isRTL: boolean; businessId?: string | null }

export const PromoCodeRedeem: React.FC<Props> = ({ isRTL, businessId }) => {
  const [code, setCode] = useState('');
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await redeemPromoCode({
        _code: code.trim().toUpperCase(),
        _business_id: businessId ?? null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message ?? 'invalid_code');
      return row;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم تفعيل الكود بنجاح 🎉' : 'Promo code activated 🎉');
      setCode('');
      qc.invalidateQueries({ queryKey: ['my-subscription'] });
      qc.invalidateQueries({ queryKey: ['my-business-membership'] });
    },
    onError: (e: Error) => {
      const map: Record<string, { ar: string; en: string }> = {
        invalid_code: { ar: 'كود غير صالح', en: 'Invalid code' },
        inactive: { ar: 'الكود غير مفعّل', en: 'Code inactive' },
        not_started: { ar: 'لم يبدأ سريان الكود بعد', en: 'Code not started yet' },
        expired: { ar: 'انتهت صلاحية الكود', en: 'Code expired' },
        fully_redeemed: { ar: 'تم استهلاك الكود بالكامل', en: 'Code fully redeemed' },
        already_redeemed: { ar: 'استخدمت هذا الكود من قبل', en: 'Already redeemed' },
        plan_unavailable: { ar: 'الخطة غير متاحة حالياً', en: 'Plan unavailable' },
      };
      const msg = map[e.message];
      toast.error(msg ? (isRTL ? msg.ar : msg.en) : e.message);
    },
  });

  return (
    <div className="max-w-2xl mx-auto mb-6 rounded-xl border border-accent/20 bg-accent/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-accent" />
        <span className="text-xs font-medium">{isRTL ? 'لديك كود ترويجي؟' : 'Have a promo code?'}</span>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) m.mutate(); }} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={isRTL ? 'مثال: PROMO2026' : 'e.g. PROMO2026'}
          className="h-9 text-xs uppercase tech-content"
          maxLength={32}
          disabled={m.isPending}
        />
        <Button type="submit" size="sm" className="h-9 text-xs gap-1" disabled={!code.trim() || m.isPending}>
          {m.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isRTL ? 'تفعيل' : 'Redeem'}
        </Button>
      </form>
    </div>
  );
};
