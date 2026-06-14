import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, Search as SearchIcon } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { ALL_SECTORS, getSectorMeta, type SectorSlug } from '@/lib/sector-keywords';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  SectorSeoMetaPreviewCard,
  SectorSeoTableSection,
  type SectorSeoSnapshotRow,
} from '@/components/admin/content/seo';

type Snapshot = SectorSeoSnapshotRow & {
  tagline: string | null;
};

const AdminSectorSeo: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeLang, setActiveLang] = useState<'ar' | 'en'>('ar');
  const [activeSector, setActiveSector] = useState<SectorSlug>('aluminum');
  const [note, setNote] = useState('');

  usePageMeta({
    title: isRTL ? 'سيو القطاعات | لوحة المشرف' : 'Sector SEO | Admin',
    noindex: true,
  });

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['sector-seo-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sector_seo_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
  });

  const captureAll = useMutation({
    mutationFn: async () => {
      const rows = ALL_SECTORS.flatMap((s) => {
        const langs: Array<'ar' | 'en'> = ['ar', 'en'];
        return langs.map((lang) => {
          const meta = getSectorMeta(s.slug, lang === 'ar');
          return {
            sector_slug: s.slug,
            title: meta.title,
            description: meta.description,
            keywords: meta.keywords,
            tagline: meta.tagline,
            language: lang,
            title_length: meta.title.length,
            description_length: meta.description.length,
            keywords_count: meta.keywords.split(',').filter(Boolean).length,
            captured_by: user?.id ?? null,
            note: note.trim() || null,
          };
        });
      });
      const { error } = await supabase.from('sector_seo_snapshots').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم التقاط لقطة لكل القطاعات' : 'Snapshot captured for all sectors');
      setNote('');
      qc.invalidateQueries({ queryKey: ['sector-seo-snapshots'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sector_seo_snapshots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['sector-seo-snapshots'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sectorMeta = useMemo(() => getSectorMeta(activeSector, activeLang === 'ar'), [activeSector, activeLang]);
  const sectorHistory = useMemo(
    () => snapshots.filter((s) => s.sector_slug === activeSector && s.language === activeLang),
    [snapshots, activeSector, activeLang],
  );
  const lastSnapshot = sectorHistory[0] ?? null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + capture */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <SearchIcon className="w-6 h-6 text-gold" />
              {isRTL ? 'سيو القطاعات' : 'Sector SEO Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'عاين عناوين ووصف وكلمات ميتا كل قطاع، والتقط لقطات لقياس الفروق بعد كل تحديث.'
                : 'Preview meta title/description/keywords per sector and capture snapshots to track diffs.'}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isRTL ? 'ملاحظة (اختياري)' : 'Note (optional)'}
              className="sm:w-56"
            />
            <Button onClick={() => captureAll.mutate()} disabled={captureAll.isPending} className="gap-2 shrink-0">
              <Camera className="w-4 h-4" />
              {captureAll.isPending
                ? (isRTL ? 'جاري…' : 'Capturing…')
                : (isRTL ? 'التقاط لقطة' : 'Capture Snapshot')}
            </Button>
          </div>
        </div>

        {/* Language tabs */}
        <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as 'ar' | 'en')}>
          <TabsList>
            <TabsTrigger value="ar">العربية</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>

          <TabsContent value={activeLang} className="mt-4 space-y-4">
            {/* Sector picker */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ALL_SECTORS.map((s) => {
                const isActive = s.slug === activeSector;
                return (
                  <button
                    key={s.slug}
                    onClick={() => setActiveSector(s.slug)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gold/10 border-gold/50 text-gold'
                        : 'bg-card border-border hover:border-gold/30'
                    }`}
                  >
                    {activeLang === 'ar' ? s.name_ar : s.name_en}
                  </button>
                );
              })}
            </div>

            {/* Live meta preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="w-4 h-4 text-gold" />
                  {isRTL ? 'الميتا الحالية (مباشر من الكود)' : 'Current Meta (live from code)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />
                      {isRTL ? 'العنوان' : 'Title'}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{sectorMeta.title.length} / 60</span>
                      <ScoreBadge status={titleScore(sectorMeta.title.length)} isRTL={isRTL} />
                      <Delta current={sectorMeta.title.length} previous={lastSnapshot?.title_length ?? null} />
                    </div>
                  </div>
                  <p className="p-2.5 rounded-lg bg-muted/50 text-sm font-medium" dir="auto">{sectorMeta.title}</p>
                </div>
                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {isRTL ? 'الوصف' : 'Description'}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{sectorMeta.description.length} / 160</span>
                      <ScoreBadge status={descScore(sectorMeta.description.length)} isRTL={isRTL} />
                      <Delta current={sectorMeta.description.length} previous={lastSnapshot?.description_length ?? null} />
                    </div>
                  </div>
                  <p className="p-2.5 rounded-lg bg-muted/50 text-sm" dir="auto">{sectorMeta.description}</p>
                </div>
                {/* Keywords */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Tags className="w-3.5 h-3.5" />
                      {isRTL ? 'الكلمات المفتاحية' : 'Keywords'}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {sectorMeta.keywords.split(',').filter(Boolean).length} {isRTL ? 'كلمة' : 'kw'}
                      </span>
                      <ScoreBadge
                        status={kwScore(sectorMeta.keywords.split(',').filter(Boolean).length)}
                        isRTL={isRTL}
                      />
                      <Delta
                        current={sectorMeta.keywords.split(',').filter(Boolean).length}
                        previous={lastSnapshot?.keywords_count ?? null}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-muted/50">
                    {sectorMeta.keywords.split(',').map((k, i) => (
                      <Badge key={`${k}-${i}`} variant="secondary" className="text-xs font-normal" dir="auto">
                        {k.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Tagline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{isRTL ? 'الوسم' : 'Tagline'}</label>
                  <p className="p-2.5 rounded-lg bg-muted/50 text-sm italic" dir="auto">{sectorMeta.tagline}</p>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-gold" />
                  {isRTL ? `سجل اللقطات (${sectorHistory.length})` : `Snapshots history (${sectorHistory.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
                ) : sectorHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {isRTL
                      ? 'لا توجد لقطات بعد. اضغط «التقاط لقطة» لبدء تتبع التغييرات.'
                      : 'No snapshots yet. Click "Capture Snapshot" to start tracking changes.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sectorHistory.map((snap, idx) => {
                      const prev = sectorHistory[idx + 1] ?? null;
                      return (
                        <div key={snap.id} className="border rounded-lg p-3 space-y-2 hover:border-gold/30 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {new Date(snap.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                              </Badge>
                              {snap.note && <Badge variant="secondary" className="text-xs">{snap.note}</Badge>}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSnapshot.mutate(snap.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Type className="w-3 h-3 text-muted-foreground" />
                              <span className="font-mono">{snap.title_length}</span>
                              <Delta current={snap.title_length} previous={prev?.title_length ?? null} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span className="font-mono">{snap.description_length}</span>
                              <Delta current={snap.description_length} previous={prev?.description_length ?? null} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Tags className="w-3 h-3 text-muted-foreground" />
                              <span className="font-mono">{snap.keywords_count}</span>
                              <Delta current={snap.keywords_count} previous={prev?.keywords_count ?? null} />
                            </div>
                          </div>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              {isRTL ? 'عرض التفاصيل' : 'View details'}
                            </summary>
                            <div className="mt-2 space-y-1.5 pt-2 border-t">
                              <p dir="auto"><strong>{isRTL ? 'العنوان:' : 'Title:'}</strong> {snap.title}</p>
                              <p dir="auto"><strong>{isRTL ? 'الوصف:' : 'Desc:'}</strong> {snap.description}</p>
                              <p dir="auto" className="line-clamp-2"><strong>{isRTL ? 'الكلمات:' : 'Keywords:'}</strong> {snap.keywords}</p>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSectorSeo;
