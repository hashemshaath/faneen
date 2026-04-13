import React, { useState, useMemo, useCallback } from 'react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Calendar, Eye, Search, BookOpen, Clock, Tag, TrendingUp,
  MessageCircle, Heart, X, SlidersHorizontal, ArrowUpDown, ChevronDown,
  ChevronUp, Sparkles,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const blogCategories: Record<string, { ar: string; en: string; icon: string }> = {
  all: { ar: 'الكل', en: 'All', icon: '📋' },
  general: { ar: 'عام', en: 'General', icon: '📄' },
  tips: { ar: 'نصائح', en: 'Tips', icon: '💡' },
  news: { ar: 'أخبار', en: 'News', icon: '📰' },
  guides: { ar: 'أدلة', en: 'Guides', icon: '📚' },
  industry: { ar: 'صناعة', en: 'Industry', icon: '🏭' },
};

type SortOption = 'newest' | 'oldest' | 'popular' | 'most_comments';

const estimateReadTime = (content: string | null): number => {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
};

const CardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card">
    <Skeleton className="aspect-[16/10] w-full" />
    <div className="p-4 space-y-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const MobileCardSkeleton = () => (
  <div className="flex gap-3 p-3 rounded-xl border border-border bg-card">
    <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2 py-0.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

const Blog = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'المدونة - مقالات ونصائح عن الألمنيوم والحديد | فنيين' : 'Blog - Aluminum & Iron Industry Articles | Faneen',
    description: language === 'ar' ? 'اقرأ أحدث المقالات والنصائح حول صناعة الألمنيوم والحديد والزجاج والخشب. أدلة مهنية وأخبار الصناعة.' : 'Read the latest articles and tips about aluminum, iron, glass and wood industries.',
    canonical: 'https://faneen.com/blog',
  });

  // Blog page JSON-LD: BreadcrumbList + CollectionPage
  useMultiJsonLd(useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
        { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'المدونة' : 'Blog', item: 'https://faneen.com/blog' },
      ],
    };
    const collection = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: language === 'ar' ? 'مدونة فنيين' : 'Faneen Blog',
      url: 'https://faneen.com/blog',
      description: language === 'ar' ? 'مقالات ونصائح حول صناعة الألمنيوم والحديد والزجاج' : 'Articles and tips about aluminum, iron and glass industries',
      publisher: { '@type': 'Organization', name: 'فنيين Faneen', url: 'https://faneen.com' },
    };
    return [breadcrumb, collection];
  }, [language]));
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['public-blog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: commentCounts = {} } = useQuery({
    queryKey: ['blog-comment-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_comments').select('post_id');
      const counts: Record<string, number> = {};
      data?.forEach((c) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: bookmarkCounts = {} } = useQuery({
    queryKey: ['blog-bookmark-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_bookmarks').select('post_id');
      const counts: Record<string, number> = {};
      data?.forEach((b) => { counts[b.post_id] = (counts[b.post_id] || 0) + 1; });
      return counts;
    },
  });

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).slice(0, 15);
  }, [posts]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategory('all');
    setSearchQuery('');
    setSelectedTags([]);
    setSortBy('newest');
  }, []);

  const hasActiveFilters = activeCategory !== 'all' || searchQuery || selectedTags.length > 0 || sortBy !== 'newest';

  const filteredPosts = useMemo(() => {
    let result = posts.filter((post) => {
      const matchCategory = activeCategory === 'all' || post.category === activeCategory;
      const matchTags = selectedTags.length === 0 || selectedTags.some(t => post.tags?.includes(t));
      if (!searchQuery.trim()) return matchCategory && matchTags;
      const q = searchQuery.toLowerCase();
      const title = (post.title_ar + ' ' + (post.title_en || '')).toLowerCase();
      const excerpt = ((post.excerpt_ar || '') + ' ' + (post.excerpt_en || '')).toLowerCase();
      return matchCategory && matchTags && (title.includes(q) || excerpt.includes(q));
    });

    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime());
        break;
      case 'popular':
        result = [...result].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'most_comments':
        result = [...result].sort((a, b) => (commentCounts[b.id] || 0) - (commentCounts[a.id] || 0));
        break;
      default:
        break;
    }
    return result;
  }, [posts, activeCategory, searchQuery, selectedTags, sortBy, commentCounts]);

  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 12;

  // Reset page on filter change
  const filterKey = `${activeCategory}-${searchQuery}-${selectedTags.join(',')}-${sortBy}`;
  const prevFilterKeyRef = React.useRef(filterKey);
  React.useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setCurrentPage(1);
    }
  }, [filterKey]);

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const regularPosts = filteredPosts.filter((p) => p.id !== featuredPost?.id);
  const showFeatured = featuredPost && activeCategory === 'all' && !searchQuery && selectedTags.length === 0 && sortBy === 'newest' && posts.length > 1;
  const allDisplayPosts = showFeatured ? regularPosts : filteredPosts;
  const totalPages = Math.ceil(allDisplayPosts.length / POSTS_PER_PAGE);
  const displayPosts = allDisplayPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  const popularPosts = useMemo(() => {
    return [...posts].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5);
  }, [posts]);

  const sortLabels: Record<SortOption, { ar: string; en: string }> = {
    newest: { ar: 'الأحدث', en: 'Newest' },
    oldest: { ar: 'الأقدم', en: 'Oldest' },
    popular: { ar: 'الأكثر مشاهدة', en: 'Most Viewed' },
    most_comments: { ar: 'الأكثر تعليقاً', en: 'Most Comments' },
  };

  const SidebarContent = () => (
    <div className="space-y-4 sm:space-y-5">
      {/* Popular Posts */}
      <Card className="border-border/50 dark:border-border/30 dark:bg-card/80">
        <CardContent className="p-4 sm:p-5">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3 sm:mb-4">
            <TrendingUp className="w-4 h-4 text-accent" />
            {isRTL ? 'الأكثر قراءة' : 'Most Read'}
          </h3>
          <div className="space-y-2.5 sm:space-y-3">
            {popularPosts.map((post, i) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group flex items-start gap-2.5 sm:gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-accent/10 dark:bg-accent/15 text-accent font-bold text-sm flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300 group-hover:scale-110">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium line-clamp-2 group-hover:text-accent transition-colors">
                    {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                  </h4>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Eye className="w-3 h-3" />{post.views_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tags Cloud */}
      {allTags.length > 0 && (
        <Card className="border-border/50 dark:border-border/30 dark:bg-card/80">
          <CardContent className="p-4 sm:p-5">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3 sm:mb-4">
              <Tag className="w-4 h-4 text-accent" />
              {isRTL ? 'الوسوم' : 'Tags'}
            </h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 ${
                    selectedTags.includes(tag)
                      ? 'bg-accent text-accent-foreground shadow-sm scale-105'
                      : 'bg-muted/60 dark:bg-muted/30 text-muted-foreground hover:bg-accent/10 hover:text-accent active:scale-95'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
        <CardContent className="p-4 sm:p-5 text-center space-y-2 sm:space-y-3">
          <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-accent mx-auto" />
          <div>
            <div className="font-heading font-bold text-xl sm:text-2xl text-foreground">{posts.length}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">{isRTL ? 'مقال منشور' : 'Published Articles'}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
            <div>
              <div className="font-bold text-base sm:text-lg text-foreground">{Object.keys(blogCategories).length - 1}</div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground">{isRTL ? 'تصنيفات' : 'Categories'}</div>
            </div>
            <div>
              <div className="font-bold text-base sm:text-lg text-foreground">{allTags.length}</div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground">{isRTL ? 'وسوم' : 'Tags'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="bg-background min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* ═══ Hero Header ═══ */}
      <div ref={heroRef} className="relative bg-primary pt-20 sm:pt-24 pb-8 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 start-10 w-48 sm:w-72 h-48 sm:h-72 bg-accent rounded-full blur-[100px]" />
          <div className="absolute bottom-0 end-20 w-64 sm:w-96 h-64 sm:h-96 bg-accent rounded-full blur-[120px]" />
        </div>
        <div className={`container relative z-10 px-4 sm:px-6 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-accent/20 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1 sm:py-1.5 mb-3 sm:mb-4">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
              <span className="text-xs sm:text-sm font-medium text-accent">{isRTL ? 'مدونة المنصة' : 'Platform Blog'}</span>
            </div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-5xl text-primary-foreground mb-2 sm:mb-3">
              {isRTL ? 'المدونة' : 'Blog'}
            </h1>
            <p className="text-primary-foreground/60 font-body text-sm sm:text-lg mb-5 sm:mb-8">
              {isRTL ? 'مقالات ونصائح في عالم الصناعات الاحترافية' : 'Articles and tips in the professional industries world'}
            </p>

            <div className="relative max-w-lg mx-auto">
              <Search className="absolute start-3.5 sm:start-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث في المقالات...' : 'Search articles...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10 sm:ps-12 pe-10 h-11 sm:h-12 rounded-xl bg-background/95 backdrop-blur-md border-border/50 shadow-lg text-foreground placeholder:text-muted-foreground text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Category Filter + Sort ═══ */}
      <div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 dark:border-border/30 shadow-sm">
        <div className="container px-4 sm:px-6 py-2.5 sm:py-3">
          {/* Categories row */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
            {Object.entries(blogCategories).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                  activeCategory === key
                    ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20 scale-[1.02]'
                    : 'bg-muted/60 dark:bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95'
                }`}
              >
                <span className="text-xs sm:text-sm">{cat.icon}</span>
                {language === 'ar' ? cat.ar : cat.en}
              </button>
            ))}
          </div>

          {/* Sort + Tags row */}
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 dark:bg-muted/30 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortLabels[sortBy][language === 'ar' ? 'ar' : 'en']}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              {showSortMenu && (
                <div className="absolute top-full mt-1 start-0 z-40 bg-card dark:bg-card/95 border border-border dark:border-border/50 rounded-xl shadow-xl p-1 min-w-[160px] animate-fade-in backdrop-blur-md">
                  {(Object.keys(sortLabels) as SortOption[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                      className={`w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        sortBy === opt ? 'bg-accent/10 dark:bg-accent/15 text-accent' : 'text-foreground hover:bg-muted dark:hover:bg-muted/50'
                      }`}
                    >
                      {sortLabels[opt][language === 'ar' ? 'ar' : 'en']}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {allTags.slice(0, 6).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-muted/40 dark:bg-muted/25 text-muted-foreground hover:bg-muted active:scale-95'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-border/30">
              <SlidersHorizontal className="w-3 h-3 text-accent shrink-0" />
              <span className="text-[11px] text-muted-foreground">{filteredPosts.length} {isRTL ? 'نتيجة' : 'results'}</span>
              <button onClick={clearFilters} className="text-[11px] text-accent font-medium hover:underline ms-auto">
                {isRTL ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showSortMenu && <div className="fixed inset-0 z-20" onClick={() => setShowSortMenu(false)} />}

      {/* ═══ Content ═══ */}
      <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            <div className="lg:col-span-2 space-y-5">
              <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
              {/* Mobile: horizontal skeletons */}
              <div className="sm:hidden space-y-3">
                {[1, 2, 3].map(i => <MobileCardSkeleton key={i} />)}
              </div>
              {/* Desktop: grid skeletons */}
              <div className="hidden sm:grid grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
              </div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 sm:py-24 text-muted-foreground">
            <FileText className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 opacity-20" />
            <p className="text-sm sm:text-lg">{isRTL ? 'لا توجد مقالات حالياً' : 'No articles available'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-5 sm:space-y-8">
              {/* Featured Post */}
              {showFeatured && featuredPost && (
                <Link to={`/blog/${featuredPost.slug}`} className="group block">
                  <Card className="overflow-hidden border-border/50 dark:border-border/30 hover:border-accent/40 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/10 active:scale-[0.99] dark:bg-card/80">
                    <CardContent className="p-0">
                      <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-muted overflow-hidden">
                        {featuredPost.cover_image_url ? (
                          <img src={featuredPost.cover_image_url} alt={featuredPost.title_ar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
                            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute top-3 start-3 flex gap-1.5">
                          <Badge className="bg-accent text-accent-foreground shadow-lg text-[10px] sm:text-xs gap-1">
                            <Sparkles className="w-3 h-3" />
                            {isRTL ? 'مميز' : 'Featured'}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] sm:text-[11px] border-white/30 text-white/90 bg-white/10 backdrop-blur-sm">
                            {blogCategories[featuredPost.category]?.[language] || featuredPost.category}
                          </Badge>
                        </div>
                        <div className="absolute bottom-0 start-0 end-0 p-4 sm:p-6 text-white">
                          <h2 className="font-heading font-bold text-base sm:text-xl md:text-2xl mb-1.5 sm:mb-2 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                            {language === 'ar' ? featuredPost.title_ar : (featuredPost.title_en || featuredPost.title_ar)}
                          </h2>
                          <p className="text-xs sm:text-sm text-white/70 line-clamp-2 mb-2.5 sm:mb-3 leading-relaxed hidden sm:block">
                            {language === 'ar' ? (featuredPost.excerpt_ar || featuredPost.content_ar) : (featuredPost.excerpt_en || featuredPost.content_en || featuredPost.excerpt_ar || featuredPost.content_ar)}
                          </p>
                          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-white/60 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{featuredPost.views_count}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{commentCounts[featuredPost.id] || 0}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{estimateReadTime(featuredPost.content_ar)} {isRTL ? 'د' : 'min'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {/* Articles */}
              {displayPosts.length > 0 ? (
                <>
                  {/* Mobile: horizontal compact cards */}
                  <div className="sm:hidden space-y-2.5">
                    {displayPosts.map((post, i) => (
                      <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                        <div
                          className="flex gap-3 p-3 rounded-xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/80 hover:border-accent/30 transition-all duration-300 hover:shadow-md active:scale-[0.98]"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {/* Thumbnail */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                            {post.cover_image_url ? (
                              <img src={post.cover_image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/5 dark:from-muted/80 dark:to-accent/10">
                                <BookOpen className="w-6 h-6 text-muted-foreground/15" />
                              </div>
                            )}
                            <span className="absolute top-1.5 start-1.5 text-[8px] font-bold text-accent-foreground bg-accent px-1.5 py-0.5 rounded-full">
                              {blogCategories[post.category]?.[language]?.slice(0, 4) || post.category}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <h3 className="font-heading font-bold text-[13px] leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                                {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                              </h3>
                              {post.excerpt_ar && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                                  {language === 'ar' ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground mt-1">
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(post.published_at || post.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{commentCounts[post.id] || 0}</span>
                              <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{bookmarkCounts[post.id] || 0}</span>
                              <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{post.views_count}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Desktop: grid cards */}
                  <div className="hidden sm:grid grid-cols-2 gap-4 sm:gap-5">
                    {displayPosts.map((post, i) => (
                      <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                        <Card
                          className="overflow-hidden h-full border-border/50 dark:border-border/30 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 dark:bg-card/80"
                          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                        >
                          <CardContent className="p-0 flex flex-col h-full">
                            <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                              {post.cover_image_url ? (
                                <img src={post.cover_image_url} alt={post.title_ar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/5 dark:from-muted/80 dark:to-accent/10">
                                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/15 group-hover:text-accent/20 transition-colors" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <span className="absolute top-2.5 start-2.5 text-[10px] sm:text-[11px] font-bold text-accent-foreground bg-accent px-2.5 py-0.5 rounded-full shadow-lg">
                                {blogCategories[post.category]?.[language] || post.category}
                              </span>
                              <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1 bg-background/85 dark:bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                                <Clock className="w-3 h-3" />
                                {estimateReadTime(post.content_ar)} {isRTL ? 'د' : 'min'}
                              </div>
                            </div>

                            <div className="p-3.5 sm:p-4 flex-1 flex flex-col gap-2">
                              {post.tags?.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {post.tags.slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 font-normal dark:bg-muted/50">#{tag}</Badge>
                                  ))}
                                </div>
                              )}

                              <h3 className="font-heading font-bold text-sm sm:text-[0.95rem] leading-snug line-clamp-2 group-hover:text-accent transition-colors duration-300">
                                {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                              </h3>

                              <p className="text-[0.8rem] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                                {language === 'ar' ? (post.excerpt_ar || post.content_ar) : (post.excerpt_en || post.content_en || post.excerpt_ar || post.content_ar)}
                              </p>

                              <div className="flex items-center justify-between pt-2.5 border-t border-border/30 dark:border-border/20 text-[11px] sm:text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(post.published_at || post.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <span className="flex items-center gap-1" title={isRTL ? 'تعليقات' : 'Comments'}><MessageCircle className="w-3 h-3" />{commentCounts[post.id] || 0}</span>
                                  <span className="flex items-center gap-1" title={isRTL ? 'حفظ' : 'Saves'}><Heart className="w-3 h-3" />{bookmarkCounts[post.id] || 0}</span>
                                  <span className="flex items-center gap-1" title={isRTL ? 'مشاهدات' : 'Views'}><Eye className="w-3 h-3" />{post.views_count}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </>
              ) : !isLoading && (
                <div className="text-center py-12 sm:py-16 text-muted-foreground">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm sm:text-lg font-medium mb-1">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
                  <p className="text-xs sm:text-sm mb-4">{isRTL ? 'جرّب تغيير كلمات البحث أو التصنيف' : 'Try different search terms or category'}</p>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5 text-xs">
                    <X className="w-3.5 h-3.5" />
                    {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
                  </Button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {isRTL ? 'السابق' : 'Previous'}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc: (number | 'ellipsis')[], p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`e${i}`} className="px-1 text-muted-foreground text-xs">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                            currentPage === item
                              ? 'bg-accent text-accent-foreground shadow-sm'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {isRTL ? 'التالي' : 'Next'}
                  </button>
                </div>
              )}
            </div>

            {/* ═══ Sidebar - Desktop ═══ */}
            <aside className="hidden lg:block">
              <SidebarContent />
            </aside>

            {/* ═══ Sidebar - Mobile toggle ═══ */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/80 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 text-accent" />
                {isRTL ? 'المزيد: الأكثر قراءة والوسوم' : 'More: Most Read & Tags'}
                {showMobileSidebar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showMobileSidebar && (
                <div className="mt-3 animate-fade-in">
                  <SidebarContent />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
