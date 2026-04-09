import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";

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

  if (posts.length === 0) return null;

  return (
    <section className="py-24 bg-muted/50">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <span className="text-sm font-body text-gold font-semibold">
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
          {posts.map((post: any) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group">
              <div className="rounded-2xl overflow-hidden border border-border hover:border-gold/40 bg-card transition-all duration-300 hover:shadow-lg h-full">
                {post.cover_image_url && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={post.cover_image_url} alt={post.title_ar} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    {post.category}
                  </span>
                  <h3 className="font-heading font-bold line-clamp-2">
                    {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                  </h3>
                  {(post.excerpt_ar || post.excerpt_en) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {language === 'ar' ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar)}
                    </p>
                  )}
                  {post.published_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.published_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
