import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Eye, BookOpen } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const LatestBlogSection = () => {
  const { language, isRTL } = useLanguage();
  const { data: posts = [] } = useQuery({
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

  const { ref: sectionRef, isVisible } = useScrollAnimation();

  if (posts.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-24 bg-muted/50">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <span className="text-sm font-body text-accent font-semibold">
              {isRTL ? 'المدونة' : 'Blog'}
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-2">
              {isRTL ? 'أحدث المقالات' : 'Latest Articles'}
            </h2>
          </div>
          <Link to="/blog">
            <Button variant="outline" size="sm" className="gap-1">
              {isRTL ? 'عرض الكل' : 'View All'}
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post: any, i: number) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group block h-full">
              <div
                className={`rounded-2xl overflow-hidden border border-border bg-card transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-2 hover:border-accent/40 h-full flex flex-col ${isVisible ? 'animate-card-slide-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
              >
                {/* Image container */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title_ar}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <BookOpen className="w-10 h-10 text-muted-foreground/20 transition-transform duration-500 group-hover:scale-110 group-hover:text-accent/30" />
                    </div>
                  )}
                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {/* Read more overlay badge */}
                  <div className="absolute bottom-3 end-3 bg-background/90 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 shadow-lg">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    {isRTL ? 'اقرأ المقال' : 'Read Article'}
                  </div>
                  {/* Category badge */}
                  <span className="absolute top-3 start-3 text-[10px] font-bold text-accent-foreground bg-accent px-2.5 py-1 rounded-full shadow-lg">
                    {post.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                  <h3 className="font-heading font-bold text-base line-clamp-2 transition-colors duration-300 group-hover:text-accent">
                    {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                  </h3>
                  {(post.excerpt_ar || post.excerpt_en) && (
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                      {language === 'ar' ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar)}
                    </p>
                  )}
                  {/* Footer meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/30 transition-colors duration-300 group-hover:border-accent/20">
                    {post.published_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(post.published_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    )}
                    {post.views_count > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {post.views_count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};