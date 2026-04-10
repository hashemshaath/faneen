import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Eye, BookOpen, MessageCircle, Heart } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/ui/lazy-image";

const BlogSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card">
    <Skeleton className="aspect-video w-full" />
    <div className="p-4 sm:p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

export const LatestBlogSection = () => {
  const { language, isRTL } = useLanguage();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['latest-blog-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  // Combine both counts into a single query to reduce network requests
  const { data: engagementCounts = { comments: {}, bookmarks: {} } } = useQuery({
    queryKey: ['home-blog-engagement'],
    queryFn: async () => {
      const [commentsRes, bookmarksRes] = await Promise.all([
        supabase.from('blog_comments').select('post_id'),
        supabase.from('blog_bookmarks').select('post_id'),
      ]);
      const comments: Record<string, number> = {};
      commentsRes.data?.forEach((c: any) => { comments[c.post_id] = (comments[c.post_id] || 0) + 1; });
      const bookmarks: Record<string, number> = {};
      bookmarksRes.data?.forEach((b: any) => { bookmarks[b.post_id] = (bookmarks[b.post_id] || 0) + 1; });
      return { comments, bookmarks };
    },
    staleTime: 10 * 60 * 1000, // 10 min — these counts don't change often
  });

  const commentCounts = engagementCounts.comments;
  const bookmarkCounts = engagementCounts.bookmarks;

  const { ref: sectionRef, isVisible } = useScrollAnimation();
  const headerRef = useParallax<HTMLDivElement>(0.07);

  if (!isLoading && posts.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-muted/50">
      <div className="container px-4 sm:px-6">
        <div ref={headerRef} className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-body text-accent font-semibold">
              {isRTL ? 'المدونة' : 'Blog'}
            </span>
            <h2 className="font-heading font-bold text-xl sm:text-3xl md:text-4xl text-foreground mt-1 sm:mt-2">
              {isRTL ? 'أحدث المقالات' : 'Latest Articles'}
            </h2>
          </div>
          <Link to="/blog">
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm">
              {isRTL ? 'عرض الكل' : 'View All'}
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <BlogSkeleton key={i} />)
          ) : (
            posts.map((post: any, i: number) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group block h-full">
                <div
                  className={`rounded-2xl overflow-hidden border border-border bg-card transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-accent/40 h-full flex flex-col ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {post.cover_image_url ? (
                      <LazyImage
                        src={post.cover_image_url}
                        alt={post.title_ar}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        wrapperClassName="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <BookOpen className="w-10 h-10 text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110 group-hover:text-accent/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-2 sm:bottom-3 end-2 sm:end-3 bg-background/90 backdrop-blur-md rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 shadow-lg">
                      <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent" />
                      {isRTL ? 'اقرأ المقال' : 'Read Article'}
                    </div>
                    <span className="absolute top-2 sm:top-3 start-2 sm:start-3 text-[10px] font-bold text-accent-foreground bg-accent px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-lg">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                    <h3 className="font-heading font-bold text-sm sm:text-base line-clamp-2 transition-colors duration-300 group-hover:text-accent">
                      {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                    </h3>
                    {(post.excerpt_ar || post.excerpt_en) && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 flex-1">
                        {language === 'ar' ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar)}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/30 transition-colors duration-300 group-hover:border-accent/20">
                      {post.published_at && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-1.5">
                          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {new Date(post.published_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      )}
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                          <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {commentCounts[post.id] || 0}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                          <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {bookmarkCounts[post.id] || 0}
                        </span>
                        {post.views_count > 0 && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1">
                            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            {post.views_count.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
