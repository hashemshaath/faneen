import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props { branchId: string; businessId: string; }

/** Inline review form. Newly submitted reviews are unverified until the business approves. */
export const BranchReviewForm: React.FC<Props> = ({ branchId, businessId }) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('AUTH');
      if (rating < 1) throw new Error('RATING');
      const { error } = await supabase.from('reviews').insert({
        branch_id: branchId,
        business_id: businessId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        content: content.trim() || null,
        is_verified: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'شكراً! ستظهر مراجعتك بعد الاعتماد.' : 'Thanks! Your review will appear once approved.');
      qc.invalidateQueries({ queryKey: ['branch-reviews', branchId] });
      qc.invalidateQueries({ queryKey: ['branch-review-stats', branchId] });
      setRating(0); setTitle(''); setContent('');
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'AUTH') {
        toast.error(isRTL ? 'يرجى تسجيل الدخول' : 'Please sign in');
        navigate('/auth');
        return;
      }
      if (err instanceof Error && err.message === 'RATING') {
        toast.error(isRTL ? 'يرجى اختيار تقييم' : 'Please pick a rating');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(isRTL ? `تعذّر الإرسال: ${msg}` : `Failed: ${msg}`);
    },
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          {isRTL ? 'أضف تقييمك لهذا الفرع' : 'Rate this branch'}
        </h3>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={isRTL ? 'النجوم' : 'Stars'}>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star className={`w-6 h-6 transition ${
                (hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
              }`} />
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="br-title" className="text-xs">{isRTL ? 'عنوان (اختياري)' : 'Title (optional)'}</Label>
            <Input id="br-title" maxLength={120} dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="br-content" className="text-xs">{isRTL ? 'تعليقك' : 'Your review'}</Label>
            <Textarea id="br-content" rows={3} maxLength={1000} dir="auto"
              value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={mutation.isPending} className="gap-2 rounded-xl">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isRTL ? 'إرسال التقييم' : 'Submit review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BranchReviewForm;