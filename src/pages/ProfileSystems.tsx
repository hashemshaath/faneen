import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Layers, Search, Thermometer, Volume2, Shield, ArrowLeft, ArrowRight,
  Eye, Star, Ruler, Building2, Filter,
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
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-green-100 text-green-700' },
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground' },
};

const RatingBar = ({ value, max = 10, label, icon: Icon }: { value: number; max?: number; label: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 text-xs">
    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    <span className="text-muted-foreground w-16 shrink-0">{label}</span>
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(value / max) * 100}%` }} />
    </div>
    <span className="font-mono text-muted-foreground w-6 text-end">{value}/{max}</span>
  </div>
);

const ProfileSystems = () => {
  const { isRTL, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [minInsulation, setMinInsulation] = useState(0);

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

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border/50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/"><Button variant="ghost" size="icon"><BackIcon className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
                <Layers className="w-6 h-6 text-gold" />
                {isRTL ? 'دليل القطاعات والأنظمة' : 'Profile Systems Guide'}
              </h1>
              <p className="text-sm text-muted-foreground">{isRTL ? 'استكشف القطاعات بمواصفاتها الفنية وقارن بينها' : 'Explore profile systems with technical specifications and compare'}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isRTL ? 'ابحث عن قطاع...' : 'Search profiles...'}
                className="ps-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><Filter className="w-4 h-4 me-1 shrink-0" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{language === 'ar' ? c.ar : c.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{isRTL ? 'عزل ≥' : 'Insul ≥'} {minInsulation}</span>
              <Slider value={[minInsulation]} onValueChange={v => setMinInsulation(v[0])} max={10} step={1} className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} {isRTL ? 'قطاع' : 'profiles'}</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{isRTL ? 'لا توجد قطاعات مطابقة' : 'No matching profiles'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p: any) => {
              const rec = recommendationLabels[p.recommendation_level] || recommendationLabels.standard;
              return (
                <Link key={p.id} to={`/profile-systems/${p.slug}`}>
                  <Card className="overflow-hidden border-border/50 hover:border-gold/30 transition-all hover:shadow-lg group h-full">
                    <div className="aspect-[16/10] bg-muted relative">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt={p.name_ar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Layers className="w-12 h-12 text-muted-foreground/20" /></div>
                      )}
                      <Badge className={`absolute top-2 start-2 text-[10px] ${rec.color}`}>
                        {language === 'ar' ? rec.ar : rec.en}
                      </Badge>
                      <Badge variant="outline" className="absolute top-2 end-2 text-[10px] bg-background/80 backdrop-blur-sm">
                        {categoryOptions.find(c => c.value === p.category)?.[language] || p.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        {p.logo_url && <img src={p.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-muted p-1 shrink-0" />}
                        <div>
                          <h3 className="font-heading font-bold group-hover:text-gold transition-colors">{language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)}</h3>
                          <p className="text-xs text-muted-foreground">
                            {p.profile_type === 'custom' ? (isRTL ? 'تصميم خاص' : 'Custom Design') : (isRTL ? 'قطاع سوق' : 'Market Profile')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <RatingBar value={p.thermal_insulation_rating || 0} label={isRTL ? 'حراري' : 'Thermal'} icon={Thermometer} />
                        <RatingBar value={p.sound_insulation_rating || 0} label={isRTL ? 'صوتي' : 'Sound'} icon={Volume2} />
                        <RatingBar value={p.strength_rating || 0} label={isRTL ? 'التحمل' : 'Strength'} icon={Shield} />
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {p.max_height_mm && (
                          <span className="flex items-center gap-0.5 bg-muted px-2 py-0.5 rounded-full">
                            <Ruler className="w-3 h-3" />{isRTL ? 'أقصى ارتفاع' : 'Max H'}: {p.max_height_mm}mm
                          </span>
                        )}
                        {p.available_colors?.length > 0 && (
                          <span className="bg-muted px-2 py-0.5 rounded-full">
                            {p.available_colors.length} {isRTL ? 'لون' : 'colors'}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 bg-muted px-2 py-0.5 rounded-full">
                          <Eye className="w-3 h-3" />{p.views_count}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSystems;
