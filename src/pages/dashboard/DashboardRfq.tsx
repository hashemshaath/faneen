import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNoIndex } from '@/hooks/useNoIndex';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listMyRfqs, createRfq } from '@/modules/rfq/services';

const INDUSTRIES = [
  { key: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { key: 'glass', ar: 'الزجاج', en: 'Glass' },
  { key: 'wood', ar: 'الأخشاب', en: 'Wood' },
  { key: 'steel', ar: 'الحديد', en: 'Steel' },
];

const DashboardRfq: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ industry: 'aluminum', title: '', description: '', budget_min: '', budget_max: '', deadline: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['my-rfqs', user?.id],
    queryFn: () => listMyRfqs(user!.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: () => createRfq({
      buyer_user_id: user!.id,
      industry: form.industry,
      title: form.title,
      description: form.description || undefined,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      deadline: form.deadline || undefined,
    }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم إنشاء الطلب' : 'RFQ created');
      setShowForm(false);
      setForm({ industry: 'aluminum', title: '', description: '', budget_min: '', budget_max: '', deadline: '' });
      qc.invalidateQueries({ queryKey: ['my-rfqs'] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {isRTL ? 'طلبات عروض الأسعار' : 'Requests for Quotes'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'أنشئ طلبات تجميعية واستقبل عروضًا من المزودين' : 'Create bulk requests and receive quotes from providers'}
            </p>
          </div>
          <Button onClick={() => setShowForm(v => !v)} className="h-12 rounded-xl">
            <Plus className="w-4 h-4 me-2" />
            {isRTL ? 'طلب جديد' : 'New RFQ'}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="h-12 rounded-xl border border-input bg-background px-3"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                >
                  {INDUSTRIES.map(i => (
                    <option key={i.key} value={i.key}>{isRTL ? i.ar : i.en}</option>
                  ))}
                </select>
                <Input
                  placeholder={isRTL ? 'عنوان الطلب' : 'RFQ title'}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="h-12 rounded-xl"
                  dir="auto"
                />
                <Input
                  type="number"
                  placeholder={isRTL ? 'الحد الأدنى للميزانية' : 'Min budget'}
                  value={form.budget_min}
                  onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                  className="h-12 rounded-xl tech-content"
                />
                <Input
                  type="number"
                  placeholder={isRTL ? 'الحد الأعلى للميزانية' : 'Max budget'}
                  value={form.budget_max}
                  onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                  className="h-12 rounded-xl tech-content"
                />
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="h-12 rounded-xl tech-content md:col-span-2"
                />
              </div>
              <Textarea
                placeholder={isRTL ? 'وصف تفصيلي' : 'Detailed description'}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                dir="auto"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)} className="h-12 rounded-xl">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  onClick={() => createMut.mutate()}
                  disabled={!form.title || createMut.isPending}
                  className="h-12 rounded-xl"
                >
                  {isRTL ? 'نشر الطلب' : 'Publish RFQ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            {isRTL ? 'لا توجد طلبات بعد' : 'No RFQs yet'}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {data.map(rfq => (
              <Card key={rfq.id} className="hover-lift">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground tech-content">{rfq.ref_id}</span>
                      <Badge variant="secondary">{rfq.industry}</Badge>
                      <Badge>{rfq.status}</Badge>
                    </div>
                    <div className="font-semibold truncate">{rfq.title}</div>
                    {rfq.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{rfq.description}</div>
                    )}
                  </div>
                  {(rfq.budget_min || rfq.budget_max) && (
                    <div className="text-sm tech-content text-right">
                      {rfq.budget_min ?? '-'} – {rfq.budget_max ?? '-'} {rfq.currency}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardRfq;