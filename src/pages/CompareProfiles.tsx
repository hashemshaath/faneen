import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers, Search, Thermometer, Volume2, Shield, Plus, X, Scale,
  ArrowLeft, ArrowRight, Ruler, Eye, CheckCircle2, XCircle,
} from 'lucide-react';

const recommendationLabels: Record<string, { ar: string; en: string; color: string }> = {
  premium: { ar: 'احترافي', en: 'Premium', color: 'bg-gold text-primary-foreground' },
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-green-100 text-green-700' },
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground' },
};

const RatingCell = ({ value, max = 10 }: { value: number; max?: number }) => {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-gold' : 'bg-orange-400';
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-sm font-medium">{value}/{max}</span>
    </div>
  );
};

const CompareProfiles = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL ? 'مقارنة أنظمة القطاعات | فنيين' : 'Compare Profile Systems | Faneen',
    description: isRTL ? 'قارن بين أنظمة قطاعات الألمنيوم والحديد من حيث المواصفات والمزايا' : 'Compare aluminum and iron profile systems by specifications and features',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const selectedIds = useMemo(() => {
    const ids = searchParams.get('ids');
    return ids ? ids.split(',').filter(Boolean) : [];
  }, [searchParams]);

  // Fetch all published profiles for search
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['profiles-for-compare'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profile_systems')
        .select('id, name_ar, name_en, slug, category, cover_image_url, recommendation_level, thermal_insulation_rating')
        .eq('status', 'published')
        .order('sort_order');
      return data ?? [];
    },
  });

  // Fetch selected profiles with specs and suppliers
  const { data: selectedProfiles = [], isLoading: isLoadingSelected } = useQuery({
    queryKey: ['compare-profiles', selectedIds],
    queryFn: async () => {
      if (!selectedIds.length) return [];
      const { data } = await supabase
        .from('profile_systems')
        .select('*, profile_specifications(*), profile_suppliers(*, businesses(name_ar, name_en, logo_url, username))')
        .in('id', selectedIds);
      return data ?? [];
    },
    enabled: selectedIds.length > 0,
  });

  const addProfile = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= 4) return;
    setSearchParams({ ids: [...selectedIds, id].join(',') });
    setSearchQuery('');
  };

  const removeProfile = (id: string) => {
    setSearchParams({ ids: selectedIds.filter(x => x !== id).join(',') });
  };

  const filteredSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allProfiles
      .filter(p => !selectedIds.includes(p.id))
      .filter(p => p.name_ar.toLowerCase().includes(q) || p.name_en?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, allProfiles, selectedIds]);

  // Collect all unique spec names
  const allSpecs = useMemo(() => {
    const specsMap = new Map<string, string>();
    selectedProfiles.forEach((p) => {
      (p.profile_specifications ?? []).forEach((s) => {
        const key = s.spec_name_ar;
        if (!specsMap.has(key)) {
          specsMap.set(key, language === 'ar' ? s.spec_name_ar : (s.spec_name_en || s.spec_name_ar));
        }
      });
    });
    return Array.from(specsMap.entries());
  }, [selectedProfiles, language]);

  // Collect all unique features
  const allFeatures = useMemo(() => {
    const feats = new Set<string>();
    selectedProfiles.forEach((p) => {
      const features = language === 'ar' ? p.features_ar : (p.features_en || p.features_ar);
      (features ?? []).forEach((f: string) => feats.add(f));
    });
    return Array.from(feats);
  }, [selectedProfiles, language]);

  const getName = (p: any) => language === 'ar' ? p.name_ar : (p.name_en || p.name_ar);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <Scale className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'مقارنة القطاعات' : 'Compare Profiles'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL ? 'قارن حتى 4 قطاعات جنباً إلى جنب' : 'Compare up to 4 profiles side by side'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث عن قطاع للمقارنة...' : 'Search for a profile to compare...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            {filteredSearch.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {filteredSearch.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProfile(p.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-start"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                      {p.cover_image_url
                        ? <img src={p.cover_image_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center"><Layers className="w-5 h-5 text-muted-foreground/40" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getName(p)}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedProfiles.map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1 pe-1">
                    {getName(p)}
                    <button onClick={() => removeProfile(p.id)} className="rounded-full hover:bg-destructive/20 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedIds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Scale className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-xl font-medium">{isRTL ? 'ابدأ المقارنة' : 'Start Comparing'}</p>
              <p className="text-sm">{isRTL ? 'ابحث وأضف قطاعات للمقارنة بينها' : 'Search and add profiles to compare'}</p>
            </CardContent>
          </Card>
        ) : isLoadingSelected ? (
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex gap-4 sm:gap-6 justify-center">
                {selectedIds.map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 min-w-[160px]">
                    <Skeleton className="w-16 h-16 rounded-xl" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t border-border/30">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28 shrink-0" />
                    {selectedIds.map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-separate border-spacing-0">
              {/* Profile headers */}
              <thead>
                <tr>
                  <th className="sticky start-0 z-10 bg-card p-4 text-start min-w-[160px] border-b border-border" />
                  {selectedProfiles.map((p) => {
                    const rec = recommendationLabels[p.recommendation_level] || recommendationLabels.standard;
                    return (
                      <th key={p.id} className="p-4 min-w-[220px] border-b border-border bg-card">
                        <div className="flex flex-col items-center gap-2 relative">
                          <button onClick={() => removeProfile(p.id)} className="absolute -top-1 -end-1 p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
                            <X className="w-3 h-3" />
                          </button>
                          <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden">
                            {p.cover_image_url
                              ? <img src={p.cover_image_url} className="w-full h-full object-cover" alt="" />
                              : <div className="w-full h-full flex items-center justify-center"><Layers className="w-8 h-8 text-muted-foreground/30" /></div>}
                          </div>
                          <Link to={`/profile-systems/${p.slug}`} className="font-heading font-bold text-sm hover:text-gold transition-colors text-center">
                            {getName(p)}
                          </Link>
                          <Badge className={`text-[10px] ${rec.color}`}>
                            {language === 'ar' ? rec.ar : rec.en}
                          </Badge>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Ratings section */}
                <tr><td colSpan={selectedProfiles.length + 1} className="p-3 font-bold text-sm bg-muted/50 border-b border-border">
                  {isRTL ? '⭐ التقييمات الفنية' : '⭐ Technical Ratings'}
                </td></tr>

                {/* Thermal */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 text-sm font-medium flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-orange-500" />{isRTL ? 'العزل الحراري' : 'Thermal Insulation'}
                  </td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 border-b border-border/50"><RatingCell value={p.thermal_insulation_rating || 0} /></td>
                  ))}
                </tr>
                {/* Sound */}
                <tr className="bg-muted/20">
                  <td className="sticky start-0 bg-muted/20 p-3 text-sm font-medium flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-500" />{isRTL ? 'العزل الصوتي' : 'Sound Insulation'}
                  </td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 border-b border-border/50"><RatingCell value={p.sound_insulation_rating || 0} /></td>
                  ))}
                </tr>
                {/* Strength */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-500" />{isRTL ? 'قوة التحمل' : 'Strength'}
                  </td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 border-b border-border/50"><RatingCell value={p.strength_rating || 0} /></td>
                  ))}
                </tr>

                {/* Dimensions */}
                <tr><td colSpan={selectedProfiles.length + 1} className="p-3 font-bold text-sm bg-muted/50 border-b border-border">
                  {isRTL ? '📐 الأبعاد' : '📐 Dimensions'}
                </td></tr>
                <tr>
                  <td className="sticky start-0 bg-background p-3 text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4" />{isRTL ? 'أقصى ارتفاع' : 'Max Height'}
                  </td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm border-b border-border/50">
                      {p.max_height_mm ? <span className="font-mono">{p.max_height_mm} mm</span> : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-muted/20">
                  <td className="sticky start-0 bg-muted/20 p-3 text-sm font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4" />{isRTL ? 'أقصى عرض' : 'Max Width'}
                  </td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm border-b border-border/50">
                      {p.max_width_mm ? <span className="font-mono">{p.max_width_mm} mm</span> : '-'}
                    </td>
                  ))}
                </tr>

                {/* Colors */}
                <tr>
                  <td className="sticky start-0 bg-background p-3 text-sm font-medium">{isRTL ? 'الألوان المتاحة' : 'Available Colors'}</td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 text-center border-b border-border/50">
                      <div className="flex flex-wrap justify-center gap-1">
                        {(p.available_colors ?? []).map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Specifications */}
                {allSpecs.length > 0 && (
                  <>
                    <tr><td colSpan={selectedProfiles.length + 1} className="p-3 font-bold text-sm bg-muted/50 border-b border-border">
                      {isRTL ? '🔧 المواصفات الفنية' : '🔧 Technical Specifications'}
                    </td></tr>
                    {allSpecs.map(([specKey, specLabel], i) => (
                      <tr key={specKey} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className={`sticky start-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} p-3 text-sm font-medium`}>{specLabel}</td>
                        {selectedProfiles.map((p) => {
                          const spec = (p.profile_specifications ?? []).find((s) => s.spec_name_ar === specKey);
                          return (
                            <td key={p.id} className="p-3 text-center text-sm border-b border-border/50">
                              {spec ? (
                                <span className="font-mono">
                                  {spec.spec_value}{spec.spec_unit ? ` ${spec.spec_unit}` : ''}
                                </span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {/* Features */}
                {allFeatures.length > 0 && (
                  <>
                    <tr><td colSpan={selectedProfiles.length + 1} className="p-3 font-bold text-sm bg-muted/50 border-b border-border">
                      {isRTL ? '✅ المميزات' : '✅ Features'}
                    </td></tr>
                    {allFeatures.map((feat, i) => (
                      <tr key={feat} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className={`sticky start-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} p-3 text-sm`}>{feat}</td>
                        {selectedProfiles.map((p) => {
                          const features = language === 'ar' ? p.features_ar : (p.features_en || p.features_ar);
                          const has = (features ?? []).includes(feat);
                          return (
                            <td key={p.id} className="p-3 text-center border-b border-border/50">
                              {has
                                ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                : <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {/* Suppliers & Pricing */}
                <tr><td colSpan={selectedProfiles.length + 1} className="p-3 font-bold text-sm bg-muted/50 border-b border-border">
                  {isRTL ? '💰 الموردين والأسعار' : '💰 Suppliers & Pricing'}
                </td></tr>
                <tr>
                  <td className="sticky start-0 bg-background p-3 text-sm font-medium">{isRTL ? 'نطاق السعر' : 'Price Range'}</td>
                  {selectedProfiles.map((p) => {
                    const suppliers = p.profile_suppliers ?? [];
                    if (!suppliers.length) return <td key={p.id} className="p-3 text-center text-muted-foreground text-sm">-</td>;
                    const minPrice = Math.min(...suppliers.map((s) => s.price_range_from || Infinity));
                    const maxPrice = Math.max(...suppliers.map((s) => s.price_range_to || 0));
                    return (
                      <td key={p.id} className="p-3 text-center text-sm">
                        <span className="font-mono font-medium text-green-600">
                          {minPrice !== Infinity ? `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()} SAR` : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-muted/20">
                  <td className="sticky start-0 bg-muted/20 p-3 text-sm font-medium">{isRTL ? 'عدد الموردين' : 'Suppliers Count'}</td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm font-medium">
                      {(p.profile_suppliers ?? []).length}
                    </td>
                  ))}
                </tr>

                {/* Applications */}
                <tr><td colSpan={selectedProfiles.length + 1} className="p-3 font-bold text-sm bg-muted/50 border-b border-border">
                  {isRTL ? '🏗️ الاستخدامات' : '🏗️ Applications'}
                </td></tr>
                <tr>
                  <td className="sticky start-0 bg-background p-3 text-sm font-medium">{isRTL ? 'التطبيقات' : 'Applications'}</td>
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm">
                      {(language === 'ar' ? p.applications_ar : (p.applications_en || p.applications_ar)) || '-'}
                    </td>
                  ))}
                </tr>

                {/* View detail links */}
                <tr>
                  <td className="sticky start-0 bg-background p-4" />
                  {selectedProfiles.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <Link to={`/profile-systems/${p.slug}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {isRTL ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareProfiles;

