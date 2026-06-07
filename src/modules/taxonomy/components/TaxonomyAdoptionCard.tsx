import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Activity, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTaxonomySection } from './BusinessTaxonomySection';

interface AdoptionData {
  total: number;
  linked: number;
  missing: number;
  percent: number;
  recentMissing: Array<{ id: string; name_ar: string | null; name_en: string | null; created_at: string }>;
}

async function fetchAdoption(): Promise<AdoptionData> {
  const { count: total } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true });

  const { data: linkedRows } = await supabase
    .from('business_taxonomy_categories')
    .select('business_id');
  const linkedSet = new Set((linkedRows ?? []).map((r) => r.business_id));
  const linked = linkedSet.size;
  const totalNum = total ?? 0;
  const missing = Math.max(0, totalNum - linked);
  const percent = totalNum > 0 ? Math.round((linked / totalNum) * 100) : 0;

  let recentMissing: AdoptionData['recentMissing'] = [];
  if (missing > 0) {
    const { data: recent } = await supabase
      .from('businesses')
      .select('id, name_ar, name_en, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    recentMissing = (recent ?? [])
      .filter((b) => !linkedSet.has(b.id))
      .slice(0, 10);
  }

  return { total: totalNum, linked, missing, percent, recentMissing };
}

export const TaxonomyAdoptionCard: React.FC = () => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['taxonomy', 'adoption'],
    queryFn: fetchAdoption,
    staleTime: 60_000,
  });

  const fullyAdopted = data ? data.missing === 0 && data.total > 0 : false;

  const handleSaved = async (id: string) => {
    setExpandedId(null);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['taxonomy', 'adoption'] }),
      qc.invalidateQueries({ queryKey: ['taxonomy', 'inventory'] }),
      qc.invalidateQueries({ queryKey: ['tx:business-links', id] }),
    ]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {isRTL ? 'اعتماد التصنيفات الحديثة' : 'Modern taxonomy adoption'}
          </span>
          {data && (
            fullyAdopted ? (
              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3" />
                {isRTL ? 'جاهز للمراقبة' : 'Ready for monitoring'}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
                <AlertTriangle className="w-3 h-3" />
                {isRTL ? 'توجد منشآت تحتاج تصنيف' : 'Businesses need taxonomy'}
              </Badge>
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-xl border border-border/60 bg-card/95 p-3">
                <div className="text-[11px] text-muted-foreground">{isRTL ? 'إجمالي المنشآت' : 'Total businesses'}</div>
                <div className="text-lg font-bold tech-content">{data.total}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/95 p-3">
                <div className="text-[11px] text-muted-foreground">{isRTL ? 'لديها تصنيف' : 'With taxonomy'}</div>
                <div className="text-lg font-bold tech-content text-emerald-600">{data.linked}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/95 p-3">
                <div className="text-[11px] text-muted-foreground">{isRTL ? 'بدون تصنيف' : 'Without taxonomy'}</div>
                <div className={`text-lg font-bold tech-content ${data.missing > 0 ? 'text-amber-600' : ''}`}>{data.missing}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/95 p-3">
                <div className="text-[11px] text-muted-foreground">{isRTL ? 'نسبة الاعتماد' : 'Adoption rate'}</div>
                <div className="text-lg font-bold tech-content">{data.percent}%</div>
              </div>
            </div>

            <Progress value={data.percent} />

            {data.recentMissing.length > 0 && (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="px-3 py-2 text-[11px] text-muted-foreground bg-muted/40">
                  {isRTL
                    ? `آخر ${data.recentMissing.length} منشأة بدون تصنيف`
                    : `Latest ${data.recentMissing.length} businesses without taxonomy`}
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-[12px]">
                    <thead className="text-muted-foreground sticky top-0 bg-card">
                      <tr className="border-b border-border/60">
                        <th className="text-start py-1.5 px-2">{isRTL ? 'الاسم' : 'Name'}</th>
                        <th className="text-start py-1.5 px-2">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentMissing.map((b) => (
                        <>
                          <tr key={b.id} className="border-b border-border/40">
                            <td className="py-1 px-2">
                              {(isRTL ? b.name_ar : b.name_en) ?? b.name_ar ?? b.name_en ?? b.id}
                            </td>
                            <td className="py-1 px-2 tech-content text-muted-foreground">
                              {new Date(b.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                            </td>
                            <td className="py-1 px-2 text-end">
                              <Button
                                type="button"
                                size="sm"
                                variant={expandedId === b.id ? 'outline' : 'secondary'}
                                className="h-7 gap-1 text-[11px]"
                                onClick={() =>
                                  setExpandedId((prev) => (prev === b.id ? null : b.id))
                                }
                              >
                                {expandedId === b.id ? (
                                  <>
                                    <X className="w-3 h-3" />
                                    {isRTL ? 'إغلاق' : 'Close'}
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    {isRTL ? 'إضافة تصنيف' : 'Add taxonomy'}
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                          {expandedId === b.id && (
                            <tr key={`${b.id}-editor`} className="border-b border-border/40 bg-muted/20">
                              <td colSpan={3} className="p-3">
                                <BusinessTaxonomySection
                                  businessId={b.id}
                                  onSaved={() => handleSaved(b.id)}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxonomyAdoptionCard;