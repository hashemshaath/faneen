import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, Calendar, Eye, Search, BookOpen, Clock, Tag, TrendingUp, MessageCircle, Heart } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const blogCategories: Record<string, { ar: string; en: string; icon: string }> = {
  all: { ar: 'الكل', en: 'All', icon: '📋' },
  general: { ar: 'عام', en: 'General', icon: '📄' },
  tips: { ar: 'نصائح', en: 'Tips', icon: '💡' },
  news: { ar: 'أخبار', en: 'News', icon: '📰' },
  guides: { ar: 'أدلة', en: 'Guides', icon: '📚' },
  industry: { ar: 'صناعة', en: 'Industry', icon: '🏭' },
};

const estimateReadTime = (content: string | null): number => {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

const Blog = () => {
  const { isRTL, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();

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
      data?.forEach((c: any) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: bookmarkCounts = {} } = useQuery({
    queryKey: ['blog-bookmark-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_bookmarks').select('post_id');
      const counts: Record<string, number> = {};
      data?.forEach((b: any) => { counts[b.post_id] = (counts[b.post_id] || 0) + 1; });
      return counts;
    },
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((post: any) => {
      const matchCategory = activeCategory === 'all' || post.category === activeCategory;
      if (!searchQuery.trim()) return matchCategory;
      const q = searchQuery.toLowerCase();
      const title = (post.title_ar + ' ' + (post.title_en || '')).toLowerCase();
      const excerpt = ((post.excerpt_ar || '') + ' ' + (post.excerpt_en || '')).toLowerCase();
      return matchCategory && (title.includes(q) || excerpt.includes(q));
    });
  }, [posts, activeCategory, searchQuery]);

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const regularPosts = filteredPosts.filter((p: any) => p.id !== featuredPost?.id);
  const showFeatured = featuredPost && activeCategory === 'all' && !searchQuery && posts.length > 1;
  const displayPosts = showFeatured ? regularPosts : filteredPosts;

  const popularPosts = useMemo(() => {
    return [...posts].sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5);
  }, [posts]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p: any) => p.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).slice(0, 12);
  }, [posts]);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* ═══ Hero Header ═══ */}
      <div ref={heroRef} className="relative bg-primary pt-20 sm:pt-24 pb-8 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 start-10 w-48 sm:w-72 h-48 sm:h-72 bg-accent rounded-full blur-[100px]" />
          <div className="absolute bottom-0 end-20 w-64 sm:w-96 h-64 sm:h-96 bg-accent rounded-full blur-[120px]" />
        </div>
        <div className={`container relative z-10 px-3 sm:px-4 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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
              <Search className="absolute start-3 sm:start-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث في المقالات...' : 'Search articles...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10 sm:ps-12 h-10 sm:h-12 rounded-xl bg-background/95 backdrop-blur-md border-border/50 shadow-lg text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Category Filter ═══ */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {Object.entries(blogCategories).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                  activeCategory === key
                    ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-xs sm:text-sm">{cat.icon}</span>
                {language === 'ar' ? cat.ar : cat.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-10">
        {isLoading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs sm:text-sm text-muted-foreground">{isRTL ? 'جارِ التحميل...' : 'Loading...'}</span>
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
                  <Card className="overflow-hidden border-border/50 hover:border-accent/40 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/10 sm:hover:-translate-y-1">
                    <CardContent className="p-0">
                      <div className="relative aspect-[2/1] sm:aspect-[2/1] bg-muted overflow-hidden">
                        {featuredPost.cover_image_url ? (
                          <img src={featuredPost.cover_image_url} alt={featuredPost.title_ar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute top-3 start-3">
                          <Badge className="bg-accent text-accent-foreground shadow-lg text-[10px] sm:text-xs">
                            {isRTL ? '⭐ مميز' : '⭐ Featured'}
                          </Badge>
                        </div>
                        <div className="absolute top-3 end-3">
                          <Badge variant="outline" className="text-[9px] sm:text-[11px] border-white/30 text-white/90 bg-white/10 backdrop-blur-sm">
                            {blogCategories[featuredPost.category]?.[language] || featuredPost.category}
                          </Badge>
                        </div>
                        <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-6 text-white">
                          <h2 className="font-heading font-bold text-sm sm:text-xl md:text-2xl mb-1 sm:mb-2 group-hover:text-accent transition-colors line-clamp-2">
                            {language === 'ar' ? featuredPost.title_ar : (featuredPost.title_en || featuredPost.title_ar)}
                          </h2>
                          <p className="text-xs sm:text-sm text-white/70 line-clamp-2 mb-2 sm:mb-3 hidden sm:block">
                            {language === 'ar' ? (featuredPost.excerpt_ar || featuredPost.content_ar) : (featuredPost.excerpt_en || featuredPost.content_en || featuredPost.excerpt_ar || featuredPost.content_ar)}
                          </p>
                          <div className="flex items-center gap-2.5 sm:gap-4 text-[10px] sm:text-xs text-white/60 flex-wrap">
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

              {/* Articles Grid */}
              {displayPosts.length > 0 ? (
                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  {displayPosts.map((post: any, i: number) => (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                      <Card
                        className={`overflow-hidden h-full border-border/50 hover:border-accent/30 transition-all duration-500 sm:hover:shadow-xl sm:hover:-translate-y-1 active:scale-[0.98] ${gridVisible ? 'animate-fade-in' : 'opacity-0'}`}
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                      >
                        <CardContent className="p-0 flex flex-col h-full">
                          <div className="relative aspect-video bg-muted overflow-hidden">
                            {post.cover_image_url ? (
                              <img src={post.cover_image_url} alt={post.title_ar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/15" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="absolute top-2 sm:top-3 start-2 sm:start-3 text-[9px] sm:text-[10px] font-bold text-accent-foreground bg-accent px-2 py-0.5 sm:py-1 rounded-full shadow-lg">
                              {blogCategories[post.category]?.[language] || post.category}
                            </span>
                            <div className="absolute bottom-2 end-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {estimateReadTime(post.content_ar)} {isRTL ? 'د' : 'min'}
                            </div>
                          </div>
                          <div className="p-3 sm:p-4 flex-1 flex flex-col space-y-1.5 sm:space-y-2">
                            {post.tags?.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {post.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-[8px] sm:text-[9px] px-1.5 py-0">{tag}</Badge>
                                ))}
                              </div>
                            )}
                            <h3 className="font-heading font-bold text-xs sm:text-sm line-clamp-2 group-hover:text-accent transition-colors duration-300">
                              {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 flex-1">
                              {language === 'ar' ? (post.excerpt_ar || post.content_ar) : (post.excerpt_en || post.content_en || post.excerpt_ar || post.content_ar)}
                            </p>
                            <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-border/30 text-[10px] sm:text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{new Date(post.published_at || post.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{commentCounts[post.id] || 0}</span>
                                <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{bookmarkCounts[post.id] || 0}</span>
                                <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{post.views_count}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : !isLoading && (
                <div className="text-center py-12 sm:py-16 text-muted-foreground">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm sm:text-lg font-medium">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
                  <p className="text-xs sm:text-sm">{isRTL ? 'جرّب تغيير كلمات البحث أو التصنيف' : 'Try different search terms or category'}</p>
                </div>
              )}
            </div>

            {/* ═══ Sidebar ═══ */}
            <aside className="hidden lg:block space-y-4 sm:space-y-6">
              {/* Popular Posts */}
              <Card className="border-border/50">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-heading font-bold text-sm sm:text-base flex items-center gap-2 mb-3 sm:mb-4">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    {isRTL ? 'الأكثر قراءة' : 'Most Read'}
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    {popularPosts.map((post: any, i: number) => (
                      <Link key={post.id} to={`/blog/${post.slug}`} className="group flex items-start gap-2.5 sm:gap-3">
                        <span className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-accent/10 text-accent font-bold text-xs sm:text-sm flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors">
                            {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                          </h4>
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{post.views_count}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tags Cloud */}
              {allTags.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="font-heading font-bold text-sm sm:text-base flex items-center gap-2 mb-3 sm:mb-4">
                      <Tag className="w-4 h-4 text-accent" />
                      {isRTL ? 'الوسوم' : 'Tags'}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSearchQuery(tag)}
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted/60 text-[10px] sm:text-xs font-medium text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-4 sm:p-5 text-center space-y-2 sm:space-y-3">
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-accent mx-auto" />
                  <div>
                    <div className="font-heading font-bold text-xl sm:text-2xl text-foreground">{posts.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{isRTL ? 'مقال منشور' : 'Published Articles'}</div>
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
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
