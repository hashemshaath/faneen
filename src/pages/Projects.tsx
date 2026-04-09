import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, Calendar, DollarSign, Clock, Building2, X, ImageIcon, Search, MapPin, Tag } from 'lucide-react';

const Projects = () => {
  const { isRTL, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar, name_en').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en').eq('is_active', true);
      return data || [];
    },
  });

  const { data: allProjects = [], isLoading } = useQuery({
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

  const projects = useMemo(() => {
    return allProjects.filter((p: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = p.title_ar?.toLowerCase().includes(q) ||
          p.title_en?.toLowerCase().includes(q) ||
          p.description_ar?.toLowerCase().includes(q) ||
          p.description_en?.toLowerCase().includes(q) ||
          p.client_name?.toLowerCase().includes(q) ||
          p.businesses?.name_ar?.toLowerCase().includes(q) ||
          p.businesses?.name_en?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (selectedCity !== 'all' && p.city_id !== selectedCity) return false;
      return true;
    });
  }, [allProjects, searchQuery, selectedCategory, selectedCity]);

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedCity !== 'all';
  const clearFilters = () => { setSearchQuery(''); setSelectedCategory('all'); setSelectedCity('all'); };

  const { data: projectImages = [] } = useQuery({
    queryKey: ['project-images', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject) return [];
      const { data, error } = await supabase
        .from('project_images')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProject,
  });

  // Combine cover image + gallery images
  const allImages = selectedProject
    ? [
        ...(selectedProject.cover_image_url
          ? [{ id: 'cover', image_url: selectedProject.cover_image_url, caption_ar: null, caption_en: null }]
          : []),
        ...projectImages,
      ]
    : [];

  const openGallery = (project: any) => {
    setSelectedProject(project);
    setCurrentImageIndex(0);
  };

  const goNext = () => {
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  };

  const goPrev = () => {
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <FolderOpen className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'المشاريع المنجزة' : 'Completed Projects'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL ? 'استعرض أفضل المشاريع من مزودي الخدمة' : 'Browse the best projects from service providers'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث عن مشروع...' : 'Search projects...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder={isRTL ? 'الفئة' : 'Category'} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {language === 'ar' ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder={isRTL ? 'المدينة' : 'City'} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع المدن' : 'All Cities'}</SelectItem>
                {cities.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {language === 'ar' ? c.name_ar : c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isRTL ? `${projects.length} نتيجة` : `${projects.length} results`}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="w-3 h-3 me-1" />
                {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{isRTL ? 'لا توجد مشاريع حالياً' : 'No projects available'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p: any) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block"
              >
              <Card
                className="overflow-hidden border-border/50 hover:border-accent/30 transition-all hover:shadow-lg group cursor-pointer h-full"
              >
                <div className="aspect-video bg-muted relative">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title_ar} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {p.is_featured && (
                    <Badge className="absolute top-2 start-2 bg-accent text-accent-foreground text-[10px]">
                      {isRTL ? 'مميز' : 'Featured'}
                    </Badge>
                  )}
                  {/* Gallery indicator */}
                  <div className="absolute bottom-2 end-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {isRTL ? 'عرض الصور' : 'View Gallery'}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-heading font-bold text-lg">
                    {language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)}
                  </h3>
                  {(p.description_ar || p.description_en) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {language === 'ar' ? p.description_ar : (p.description_en || p.description_ar)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.project_cost && (
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                        <DollarSign className="w-3 h-3" />{Number(p.project_cost).toLocaleString()} SAR
                      </span>
                    )}
                    {p.duration_days && (
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />{p.duration_days} {isRTL ? 'يوم' : 'days'}
                      </span>
                    )}
                    {p.completion_date && (
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                        <Calendar className="w-3 h-3" />{p.completion_date}
                      </span>
                    )}
                  </div>
                  {p.businesses && (
                    <div
                      className="flex items-center gap-2 pt-2 border-t border-border/30"
                    >
                      {p.businesses.logo_url ? (
                        <img src={p.businesses.logo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-accent" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-accent">
                        {language === 'ar' ? p.businesses.name_ar : (p.businesses.name_en || p.businesses.name_ar)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Project Gallery Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={open => { if (!open) setSelectedProject(null); }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="font-heading text-lg">
              {selectedProject && (language === 'ar' ? selectedProject.title_ar : (selectedProject.title_en || selectedProject.title_ar))}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4 space-y-4">
            {/* Main Image Viewer */}
            {allImages.length > 0 ? (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <div className="aspect-video relative flex items-center justify-center">
                  <img
                    src={allImages[currentImageIndex]?.image_url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />

                  {/* Navigation arrows */}
                  {allImages.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute start-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
                        onClick={isRTL ? goNext : goPrev}
                      >
                        {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
                        onClick={isRTL ? goPrev : goNext}
                      >
                        {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </Button>
                    </>
                  )}

                  {/* Counter */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  )}
                </div>

                {/* Caption */}
                {allImages[currentImageIndex] && (allImages[currentImageIndex].caption_ar || allImages[currentImageIndex].caption_en) && (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {language === 'ar'
                      ? allImages[currentImageIndex].caption_ar
                      : (allImages[currentImageIndex].caption_en || allImages[currentImageIndex].caption_ar)}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                <p>{isRTL ? 'لا توجد صور لهذا المشروع' : 'No images for this project'}</p>
              </div>
            )}

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Project Details */}
            {selectedProject && (
              <div className="space-y-3 border-t border-border/50 pt-3">
                {(selectedProject.description_ar || selectedProject.description_en) && (
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? selectedProject.description_ar : (selectedProject.description_en || selectedProject.description_ar)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {selectedProject.project_cost && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                      <DollarSign className="w-3 h-3" />{Number(selectedProject.project_cost).toLocaleString()} SAR
                    </span>
                  )}
                  {selectedProject.duration_days && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />{selectedProject.duration_days} {isRTL ? 'يوم' : 'days'}
                    </span>
                  )}
                  {selectedProject.completion_date && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                      <Calendar className="w-3 h-3" />{selectedProject.completion_date}
                    </span>
                  )}
                  {selectedProject.client_name && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
                      <Building2 className="w-3 h-3" />{selectedProject.client_name}
                    </span>
                  )}
                </div>
                {selectedProject.businesses && (
                  <Link
                    to={`/${selectedProject.businesses.username}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                    onClick={() => setSelectedProject(null)}
                  >
                    {selectedProject.businesses.logo_url ? (
                      <img src={selectedProject.businesses.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-accent" />
                      </div>
                    )}
                    {language === 'ar' ? selectedProject.businesses.name_ar : (selectedProject.businesses.name_en || selectedProject.businesses.name_ar)}
                  </Link>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Projects;
