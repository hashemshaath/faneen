import React, { useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryById } from '@/modules/categories';
import { getCityById } from '@/modules/locations';
import { useLanguage } from '@/i18n/LanguageContext';
import { useContentTracking } from '@/hooks/useContentTracking';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProjectImageGallery } from '@/components/project/ProjectImageGallery';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { RelatedProjects } from '@/components/project/RelatedProjects';
import {
  FolderOpen, ArrowRight, ArrowLeft, Tag, MapPin, Building2, Share2, Bookmark
} from 'lucide-react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
import { track } from '@/lib/analytics-events';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isRTL, language } = useLanguage();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, businesses(username, name_ar, name_en, logo_url, description_ar, description_en, short_description_ar, short_description_en, phone, email, website, is_verified)')
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

  // Unified tracking
  const { trackView, trackShare } = useContentTracking('project', project?.id);
  useEffect(() => { if (project?.id) trackView(); }, [project?.id, trackView]);
  useEffect(() => {
    if (!project?.id) return;
    track.projectView({
      project_slug: (project as { slug?: string }).slug || String(project.id),
      business_slug: project.businesses?.username,
    });
  }, [project?.id, project?.businesses?.username]);

  const { data: category } = useQuery<{ name_ar: string; name_en: string } | null>({
    queryKey: ['category', project?.category_id],
    queryFn: async () => {
      const { data } = await getCategoryById<{ name_ar: string; name_en: string }>(project!.category_id!);
      return data;
    },
    enabled: !!project?.category_id,
  });

  const projectTitle = project ? (language === 'ar' ? project.title_ar : (project.title_en || project.title_ar)) : '';
  const projectDesc = project ? (language === 'ar' ? project.description_ar : (project.description_en || project.description_ar)) : '';

  usePageMeta({
    title: projectTitle || (isRTL ? 'تفاصيل المشروع' : 'Project Details'),
    description: projectDesc?.slice(0, 160) || '',
    ogImage:
      project?.cover_image_url ||
      ogImageFor(id ? `project-${id}` : 'project', {
        type: 'project',
        title: projectTitle,
        subtitle: projectDesc?.slice(0, 160) || undefined,
      }),
    ogType: 'article',
    canonical: id ? `https://qitaat.com/projects/${id}` : undefined,
    ogTitle: projectTitle || undefined,
    ogDescription: projectDesc?.slice(0, 160) || undefined,
  });

  const projectJsonLd = useMemo(() => {
    if (!project) return null;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: projectTitle,
        description: projectDesc?.slice(0, 300),
        image: project.cover_image_url,
        url: `https://qitaat.com/projects/${id}`,
        ...(project.businesses?.username
          ? {
              creator: {
                '@type': 'Organization',
                name: project.businesses.name_ar || project.businesses.name_en,
                url: `https://qitaat.com/${project.businesses.username}`,
              },
            }
          : {}),
      },
      buildBreadcrumbList([
        { name: isRTL ? 'المشاريع' : 'Projects', url: '/projects' },
        { name: projectTitle, url: `/projects/${id}` },
      ])!,
    ];
  }, [project, projectTitle, projectDesc, id]);
  useMultiJsonLd(projectJsonLd);

  const { data: city } = useQuery<{ name_ar: string; name_en: string } | null>({
    queryKey: ['city', project?.city_id],
    queryFn: async () => {
      const { data } = await getCityById<{ name_ar: string; name_en: string }>(project!.city_id!);
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

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <div className="container py-24 space-y-6 px-4 max-w-6xl">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-6 w-1/2 rounded-lg" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
          </div>
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
  const bizName = project.businesses
    ? (language === 'ar' ? project.businesses.name_ar : (project.businesses.name_en || project.businesses.name_ar))
    : null;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Header with logo */}
      <div className="bg-primary pt-20 sm:pt-24 pb-5 sm:pb-8">
        <div className="container max-w-6xl px-4 sm:px-6">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-primary-foreground/60 hover:text-primary-foreground text-xs sm:text-sm mb-3 sm:mb-4 transition-colors">
            <BackIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isRTL ? 'جميع المشاريع' : 'All Projects'}
          </Link>

          <div className="flex items-start gap-4">
            {/* Business Logo */}
            {project.businesses?.logo_url ? (
              <Link to={`/${project.businesses.username}`} className="shrink-0 hidden sm:block">
                <img
                  src={project.businesses.logo_url}
                  alt={bizName || ''}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover border-2 border-primary-foreground/20 hover:border-primary-foreground/40 transition-colors"
                />
              </Link>
            ) : project.businesses ? (
              <Link to={`/${project.businesses.username}`} className="shrink-0 hidden sm:block">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center border-2 border-primary-foreground/20">
                  <Building2 className="w-7 h-7 text-primary-foreground/60" />
                </div>
              </Link>
            ) : null}

            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-primary-foreground mb-1.5 leading-snug">{title}</h1>

              {/* Provider name on mobile */}
              {bizName && (
                <Link to={`/${project.businesses!.username}`} className="text-primary-foreground/70 hover:text-primary-foreground text-xs sm:text-sm transition-colors mb-2 inline-block">
                  {isRTL ? 'بواسطة' : 'by'} <span className="font-semibold">{bizName}</span>
                </Link>
              )}

              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
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

            {/* Action buttons */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-full">
                <Bookmark className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-full" onClick={() => { navigator.share?.({ title, url: window.location.href }).catch(() => {}); trackShare(); }}>
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-8 max-w-6xl">
        {/* Image Gallery */}
        <ProjectImageGallery images={allImages} title={title} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {description && (
              <div>
                <h2 className="font-heading font-bold text-lg sm:text-xl mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 rounded-full bg-accent shrink-0" />
                  {isRTL ? 'وصف المشروع' : 'Project Description'}
                </h2>
                <div className="bg-card rounded-xl border border-border/50 dark:border-border/30 p-4 sm:p-6">
                  <p className="text-muted-foreground leading-[1.85] whitespace-pre-line text-sm sm:text-base">{description}</p>
                </div>
              </div>
            )}

            {/* Project highlights */}
            {(project.project_cost || project.duration_days || project.completion_date) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:hidden">
                {project.project_cost && (
                  <div className="bg-card rounded-xl border border-border/50 dark:border-border/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'التكلفة' : 'Cost'}</p>
                    <p className="font-bold text-accent text-sm">{Number(project.project_cost).toLocaleString()} {project.currency_code}</p>
                  </div>
                )}
                {project.duration_days && (
                  <div className="bg-card rounded-xl border border-border/50 dark:border-border/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'المدة' : 'Duration'}</p>
                    <p className="font-bold text-sm">{project.duration_days} {isRTL ? 'يوم' : 'days'}</p>
                  </div>
                )}
                {project.completion_date && (
                  <div className="bg-card rounded-xl border border-border/50 dark:border-border/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'الإنجاز' : 'Completed'}</p>
                    <p className="font-bold text-sm">{project.completion_date}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <ProjectSidebar project={project} category={category} city={city} />
        </div>

        {/* Related Projects */}
        <RelatedProjects
          projectId={id!}
          businessId={project.business_id}
          categoryId={project.category_id}
          cityId={project.city_id}
        />

        {/* Explore more — hub/spoke depth (SEO-7). Static, public-safe. */}
        <nav
          aria-label={isRTL ? 'استكشف المزيد' : 'Explore more'}
          className="mt-8"
        >
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="font-heading text-base font-bold mb-3">
              {isRTL ? 'روابط مفيدة' : 'Useful links'}
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                >
                  {isRTL ? 'كل المشاريع' : 'All projects'}
                </Link>
              </li>
              <li>
                <Link
                  to="/showcase"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                >
                  {isRTL ? 'أعمال المزودين' : 'Provider showcase'}
                </Link>
              </li>
              <li>
                <Link
                  to="/sectors"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                >
                  {isRTL ? 'القطاعات الصناعية' : 'Industrial sectors'}
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                >
                  {isRTL ? 'الخدمات' : 'Services'}
                </Link>
              </li>
              <li>
                <Link
                  to="/brands"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary"
                >
                  {isRTL ? 'العلامات التجارية' : 'Brands'}
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <Footer />
    </div>
  );
};

export default ProjectDetail;
