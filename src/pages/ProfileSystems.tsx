import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Layers, Search, Thermometer, Volume2, Shield,
  Eye, Ruler, Filter, Scale, X, SlidersHorizontal,
} from 'lucide-react';

const categoryOptions = [
  { value: 'all', ar: 'الكل', en: 'All' },
  { value: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { value: 'kitchen', ar: 'المطابخ', en: 'Kitchens' },
  { value: 'iron', ar: 'الحديد', en: 'Iron' },
  { value: 'glass', ar: 'الزجاج', en: 'Glass' },
  { value: 'wood', ar: 'الخشب', en: 'Wood' },
  { value: 'upvc', ar: 'UPVC', en: 'UPVC' },
];

const recommendationLabels: Record<string, { ar: string; en: string; color: string }> = {
  premium: { ar: 'احترافي', en: 'Premium', color: 'bg-gold text-primary-foreground' },
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground' },
};

const RatingBar = ({ value, max = 10, label, icon: Icon }: { value: number; max?: number; label: string; icon: React.ElementType }) => {
  const pct = (value / max) * 100;
  const getColor = () => {
    if (pct >= 80) return 'from-green-400 to-green-500';
    if (pct >= 60) return 'from-gold/70 to-gold';
    return 'from-yellow-400 to-orange-400';
  };
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-12 sm:w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-heading font-bold text-muted-foreground w-6 sm:w-8 text-end">{value}</span>
    </div>
  );
};

const ProfileSystems = () => {
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [minInsulation, setMinInsulation] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleCompare = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  }, []);

  const goCompare = useCallback(() => {
    if (compareIds.length >= 2) {
      navigate(`/compare-profiles?ids=${compareIds.join(',')}`);
    }
  }, [compareIds, navigate]);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['public-profile-systems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_systems')
        .select('*')
        .eq('status', 'published')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const filtered = profiles.filter((p: any) => {
    if (category !== 'all' && p.category !== category) return false;
    if (minInsulation > 0 && (p.thermal_insulation_rating || 0) < minInsulation) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name_ar?.toLowerCase().includes(q) || p.name_en?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeFilters = (category !== 'all' ? 1 : 0) + (minInsulation > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* ═══ Hero with search ═══ */}
      <div className="bg-primary pt-20 sm:pt-24 pb-6 sm:pb-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          <div className="text-center mb-4 sm:mb-6">
            <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-2 sm:mb-3" />
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground mb-1 sm:mb-2">
              {isRTL ? 'دليل القطاعات والأنظمة' : 'Profile Systems Guide'}
            </h1>
            <p className="text-primary-foreground/60 font-body text-sm sm:text-base">
              {isRTL ? 'استكشف القطاعات بمواصفاتها الفنية وقارن بينها' : 'Explore profile systems with technical specifications and compare'}
            </p>
            <Link to="/compare-profiles" className="inline-block mt-2 sm:mt-3">
              <Button variant="hero" size="sm" className="gap-1 text-xs sm:text-sm h-8 sm:h-9">
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isRTL ? 'مقارنة القطاعات' : 'Compare'}
              </Button>
            </Link>
          </div>

          {/* Search + filter toggle (mobile) */}
          <div className="flex gap-2 mb-2 sm:mb-0">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'ابحث عن قطاع...' : 'Search profiles...'} className="ps-10 bg-card h-10 text-sm" />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden bg-card h-10 w-10 shrink-0 relative"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilters > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] flex items-center justify-center font-bold">{activeFilters}</span>
              )}
            </Button>
          </div>

          {/* Filters - collapsible on mobile */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 bg-primary-foreground/5 p-3 sm:p-4 rounded-xl mt-2 transition-all ${showFilters ? 'block' : 'hidden sm:grid'}`}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-card h-10 text-sm"><Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 me-1 shrink-0" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Thermometer className="w-4 h-4 text-primary-foreground/60 shrink-0" />
              <span className="text-xs text-primary-foreground/60 whitespace-nowrap">{isRTL ? 'عزل ≥' : 'Insul ≥'} {minInsulation}</span>
              <Slider value={[minInsulation]} onValueChange={v => setMinInsulation(v[0])} max={10} step={1} className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Category chips (mobile horizontal scroll) ═══ */}
      <div className="border-b border-border/50 bg-card/50 sm:hidden">
        <div className="overflow-x-auto no-scrollbar px-3 py-2.5">
          <div className="flex gap-1.5 w-max">
            {categoryOptions.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  category === c.value
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {language === 'ar' ? c.ar : c.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Results ═══ */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          {filtered.length} {isRTL ? 'قطاع' : 'profiles'}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 sm:py-20 text-muted-foreground">
            <Layers className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30" />
            <p className="font-heading font-bold text-sm sm:text-base mb-1">{isRTL ? 'لا توجد قطاعات مطابقة' : 'No matching profiles'}</p>
            <p className="text-xs sm:text-sm">{isRTL ? 'جرّب تغيير معايير البحث' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filtered.map((p: any) => {
              const rec = recommendationLabels[p.recommendation_level] || recommendationLabels.standard;
              const isSelected = compareIds.includes(p.id);
              return (
                <Link key={p.id} to={`/profile-systems/${p.slug}`}>
                  <Card className={`overflow-hidden border-border/50 transition-all group h-full active:scale-[0.98] sm:hover:border-gold/30 sm:hover:shadow-lg ${isSelected ? 'ring-2 ring-accent' : ''}`}>
                    {/* Image */}
                    <div className="aspect-[16/10] bg-muted relative">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt={p.name_ar} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20" />
                        </div>
                      )}
                      <Badge className={`absolute top-2 start-2 text-[9px] sm:text-[10px] ${rec.color}`}>
                        {language === 'ar' ? rec.ar : rec.en}
                      </Badge>
                      <Badge variant="outline" className="absolute top-2 end-2 text-[9px] sm:text-[10px] bg-background/80 backdrop-blur-sm">
                        {categoryOptions.find(c => c.value === p.category)?.[language] || p.category}
                      </Badge>
                    </div>

                    <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                      {/* Title row */}
                      <div className="flex items-start gap-2">
                        {p.logo_url && <img src={p.logo_url} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain bg-muted p-1 shrink-0" />}
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-sm sm:text-base group-hover:text-accent transition-colors truncate">
                            {language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {p.profile_type === 'custom' ? (isRTL ? 'تصميم خاص' : 'Custom') : (isRTL ? 'قطاع سوق' : 'Market')}
                          </p>
                        </div>
                      </div>

                      {/* Rating bars */}
                      <div className="space-y-1 sm:space-y-1.5">
                        <RatingBar value={p.thermal_insulation_rating || 0} label={isRTL ? 'حراري' : 'Thermal'} icon={Thermometer} />
                        <RatingBar value={p.sound_insulation_rating || 0} label={isRTL ? 'صوتي' : 'Sound'} icon={Volume2} />
                        <RatingBar value={p.strength_rating || 0} label={isRTL ? 'التحمل' : 'Strength'} icon={Shield} />
                      </div>

                      {/* Meta tags */}
                      <div className="flex flex-wrap gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground">
                        {p.max_height_mm && (
                          <span className="flex items-center gap-0.5 bg-muted px-1.5 sm:px-2 py-0.5 rounded-full">
                            <Ruler className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{p.max_height_mm}mm
                          </span>
                        )}
                        {p.available_colors?.length > 0 && (
                          <span className="bg-muted px-1.5 sm:px-2 py-0.5 rounded-full">
                            {p.available_colors.length} {isRTL ? 'لون' : 'colors'}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 bg-muted px-1.5 sm:px-2 py-0.5 rounded-full">
                          <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{p.views_count}
                        </span>
                      </div>

                      {/* Compare button */}
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full text-[10px] sm:text-xs h-8 sm:h-9"
                        onClick={(e) => toggleCompare(p.id, e)}
                      >
                        <Scale className="w-3 h-3 me-1" />
                        {isSelected ? (isRTL ? 'تم الاختيار ✓' : 'Selected ✓') : (isRTL ? 'أضف للمقارنة' : 'Compare')}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Floating compare bar */}
        {compareIds.length >= 2 && (
          <div className="fixed bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 sm:px-6 py-3 rounded-2xl sm:rounded-full shadow-lg flex items-center justify-between sm:justify-center gap-2 sm:gap-3 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-xs sm:text-sm">
                {compareIds.length} {isRTL ? 'قطاعات' : 'selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="hero" onClick={goCompare} className="text-xs h-8 sm:h-9">
                {isRTL ? 'قارن الآن' : 'Compare'}
              </Button>
              <button onClick={() => setCompareIds([])} className="text-primary-foreground/60 hover:text-primary-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProfileSystems;
