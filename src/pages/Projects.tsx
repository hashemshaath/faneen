import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Calendar, DollarSign, Clock, ArrowLeft, ArrowRight, Building2 } from 'lucide-react';

const Projects = () => {
  const { isRTL, language } = useLanguage();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['public-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, businesses(username, name_ar, name_en, logo_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon"><BackIcon className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-gold" />
              {isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'استعرض أفضل المشاريع من مزودي الخدمة' : 'Browse the best projects from service providers'}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{isRTL ? 'لا توجد مشاريع حالياً' : 'No projects available'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p: any) => (
              <Card key={p.id} className="overflow-hidden border-border/50 hover:border-gold/30 transition-all hover:shadow-lg group">
                <div className="aspect-video bg-muted relative">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title_ar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-12 h-12 text-muted-foreground/30" /></div>
                  )}
                  {p.is_featured && (
                    <Badge className="absolute top-2 start-2 bg-gold text-primary-foreground text-[10px]">
                      {isRTL ? 'مميز' : 'Featured'}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-heading font-bold text-lg">{language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                  {(p.description_ar || p.description_en) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.project_cost && <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full"><DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR</span>}
                    {p.duration_days && <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full"><Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}</span>}
                    {p.completion_date && <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full"><Calendar className="w-3 h-3" />{p.completion_date}</span>}
                  </div>
                  {p.businesses && (
                    <Link to={`/${p.businesses.username}`} className="flex items-center gap-2 pt-2 border-t border-border/30">
                      {p.businesses.logo_url ? (
                        <img src={p.businesses.logo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-gold" /></div>
                      )}
                      <span className="text-sm font-medium text-gold">{language === 'ar' ? p.businesses.name_ar : (p.businesses.name_en || p.businesses.name_ar)}</span>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
