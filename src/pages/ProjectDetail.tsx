import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  FolderOpen, Calendar, DollarSign, Clock, Building2,
  ChevronLeft, ChevronRight, ArrowRight, ArrowLeft,
  ImageIcon, X, ZoomIn, MapPin, Tag
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL, language } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, businesses(username, name_ar, name_en, logo_url, description_ar, description_en)')
        .eq('id', id!)
        .eq('status', 'published')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: projectImages = [] } = useQuery({
    queryKey: ['project-detail-images', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_images')
        .select('*')
        .eq('project_id', id!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: category } = useQuery({
    queryKey: ['category', project?.category_id],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('name_ar, name_en').eq('id', project!.category_id!).single();
      return data;
    },
    enabled: !!project?.category_id,
  });

  const { data: city } = useQuery({
    queryKey: ['city', project?.city_id],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('name_ar, name_en').eq('id', project!.city_id!).single();
      return data;
    },
    enabled: !!project?.city_id,
  });

  const allImages = project
    ? [
        ...(project.cover_image_url
          ? [{ id: 'cover', image_url: project.cover_image_url, caption_ar: null, caption_en: null }]
          : []),
        ...projectImages,
      ]
    : [];

  const openLightbox = (idx: number) => {
    setCurrentImageIndex(idx);
    setLightboxOpen(true);
  };

  const goNext = () => setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  const goPrev = () => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <div className="container py-24 space-y-6 px-4">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground text-lg">{isRTL ? 'المشروع غير موجود' : 'Project not found'}</p>
          <Link to="/projects">
            <Button variant="outline" className="mt-4">
              <BackIcon className="w-4 h-4 me-2" />
              {isRTL ? 'العودة للمشاريع' : 'Back to Projects'}
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = language === 'ar' ? project.title_ar : (project.title_en || project.title_ar);
  const description = language === 'ar' ? project.description_ar : (project.description_en || project.description_ar);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Header */}
      <div className="bg-primary pt-20 sm:pt-24 pb-5 sm:pb-8">
        <div className="container max-w-5xl px-4 sm:px-6">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-primary-foreground/60 hover:text-primary-foreground text-xs sm:text-sm mb-3 sm:mb-4 transition-colors">
            <BackIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isRTL ? 'جميع المشاريع' : 'All Projects'}
          </Link>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-primary-foreground mb-2 leading-snug">{title}</h1>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {project.is_featured && (
                  <Badge className="bg-accent text-accent-foreground text-[10px] sm:text-xs">{isRTL ? 'مميز' : 'Featured'}</Badge>
                )}
                {category && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1">
                    <Tag className="w-3 h-3" />
                    {language === 'ar' ? category.name_ar : category.name_en}
                  </Badge>
                )}
                {city && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1">
                    <MapPin className="w-3 h-3" />
                    {language === 'ar' ? city.name_ar : city.name_en}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-8 max-w-5xl">
        {/* Image Gallery */}
        {allImages.length > 0 ? (
          <div className="mb-8">
            {/* Main image */}
            <div
              className="relative rounded-xl overflow-hidden bg-muted cursor-pointer group mb-3"
              onClick={() => openLightbox(0)}
            >
              <div className="aspect-[16/9] md:aspect-[2/1]">
                <img
                  src={allImages[0].image_url}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-3">
                  <ZoomIn className="w-6 h-6" />
                </div>
              </div>
              {allImages.length > 1 && (
                <div className="absolute bottom-3 end-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <ImageIcon className="w-4 h-4" />
                  {allImages.length} {isRTL ? 'صورة' : 'photos'}
                </div>
              )}
            </div>

            {/* Thumbnail grid */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {allImages.slice(1, 7).map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => openLightbox(idx + 1)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    {idx === 5 && allImages.length > 7 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">
                        +{allImages.length - 7}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[16/9] bg-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground mb-8">
            <ImageIcon className="w-16 h-16 mb-3 opacity-30" />
            <p>{isRTL ? 'لا توجد صور لهذا المشروع' : 'No images for this project'}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {description && (
              <div>
                <h2 className="font-heading font-bold text-xl mb-3">{isRTL ? 'وصف المشروع' : 'Project Description'}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Project Info Card */}
            <div className="rounded-xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/80 p-4 sm:p-5 space-y-3 sm:space-y-4">
              <h3 className="font-heading font-bold text-base sm:text-lg">{isRTL ? 'تفاصيل المشروع' : 'Project Details'}</h3>
              <div className="space-y-3">
                {project.project_cost && (
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'تكلفة المشروع' : 'Project Cost'}</p>
                      <p className="font-semibold">{Number(project.project_cost).toLocaleString()} {project.currency_code}</p>
                    </div>
                  </div>
                )}
                {project.duration_days && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'مدة التنفيذ' : 'Duration'}</p>
                      <p className="font-semibold">{project.duration_days} {isRTL ? 'يوم' : 'days'}</p>
                    </div>
                  </div>
                )}
                {project.completion_date && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'تاريخ الإنجاز' : 'Completion Date'}</p>
                      <p className="font-semibold">{project.completion_date}</p>
                    </div>
                  </div>
                )}
                {project.client_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'العميل' : 'Client'}</p>
                      <p className="font-semibold">{project.client_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Card */}
            {project.businesses && (
              <Link
                to={`/${project.businesses.username}`}
                className="block rounded-xl border border-border/50 bg-card p-5 hover:border-accent/30 transition-all hover:shadow-md group"
              >
                <h3 className="font-heading font-bold text-lg mb-3">{isRTL ? 'مزود الخدمة' : 'Service Provider'}</h3>
                <div className="flex items-center gap-3">
                  {project.businesses.logo_url ? (
                    <img src={project.businesses.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-accent group-hover:underline">
                      {language === 'ar' ? project.businesses.name_ar : (project.businesses.name_en || project.businesses.name_ar)}
                    </p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'عرض الملف التجاري' : 'View business profile'}</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 border-none sm:rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="relative flex flex-col h-[85vh]">
            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 end-3 z-10 text-white hover:bg-white/20 rounded-full"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Main image */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
              {allImages.length > 0 && (
                <img
                  src={allImages[currentImageIndex]?.image_url}
                  alt=""
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}

              {allImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute start-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-10 h-10"
                    onClick={isRTL ? goNext : goPrev}
                  >
                    {isRTL ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-10 h-10"
                    onClick={isRTL ? goPrev : goNext}
                  >
                    {isRTL ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                  </Button>
                </>
              )}
            </div>

            {/* Caption + counter */}
            <div className="text-center pb-3 px-4">
              {allImages[currentImageIndex] &&
                (allImages[currentImageIndex].caption_ar || allImages[currentImageIndex].caption_en) && (
                  <p className="text-white/80 text-sm mb-1">
                    {language === 'ar'
                      ? allImages[currentImageIndex].caption_ar
                      : (allImages[currentImageIndex].caption_en || allImages[currentImageIndex].caption_ar)}
                  </p>
                )}
              {allImages.length > 1 && (
                <p className="text-white/50 text-xs">{currentImageIndex + 1} / {allImages.length}</p>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-4 justify-center">
                {allImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? 'border-accent ring-1 ring-accent' : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ProjectDetail;
