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

type Snapshot = SectorSeoSnapshotRow & { tagline: string | null };

const AdminSectorSeo: React.FC = () => {
  useNoIndex();
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
              {captureAll.isPending ? (isRTL ? 'جاري…' : 'Capturing…') : (isRTL ? 'التقاط لقطة' : 'Capture Snapshot')}
            </Button>
          </div>
        </div>

        <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as 'ar' | 'en')}>
          <TabsList>
            <TabsTrigger value="ar">العربية</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>

          <TabsContent value={activeLang} className="mt-4 space-y-4">
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

            <SectorSeoMetaPreviewCard
              title={sectorMeta.title}
              description={sectorMeta.description}
              keywords={sectorMeta.keywords}
              tagline={sectorMeta.tagline}
              previousTitleLen={lastSnapshot?.title_length ?? null}
              previousDescLen={lastSnapshot?.description_length ?? null}
              previousKeywordsCount={lastSnapshot?.keywords_count ?? null}
              isRTL={isRTL}
            />

            <SectorSeoTableSection
              isLoading={isLoading}
              rows={sectorHistory}
              onDelete={(id) => deleteSnapshot.mutate(id)}
              isRTL={isRTL}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSectorSeo;
