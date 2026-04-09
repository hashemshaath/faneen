import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Eye, ArrowLeft, ArrowRight } from 'lucide-react';

const blogCategories: Record<string, { ar: string; en: string }> = {
  general: { ar: 'عام', en: 'General' },
  tips: { ar: 'نصائح', en: 'Tips' },
  news: { ar: 'أخبار', en: 'News' },
  guides: { ar: 'أدلة', en: 'Guides' },
  industry: { ar: 'صناعة', en: 'Industry' },
};

const Blog = () => {
  const { isRTL, language } = useLanguage();

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

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon"><BackIcon className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-gold" />
              {isRTL ? 'المدونة' : 'Blog'}
            </h1>
            <p className="text-sm text-muted-foreground">{isRTL ? 'مقالات ونصائح في عالم الصناعات الاحترافية' : 'Articles and tips in the professional industries world'}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{isRTL ? 'لا توجد مقالات حالياً' : 'No articles available'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post: any) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="overflow-hidden border-border/50 hover:border-gold/30 transition-all hover:shadow-lg group">
                  <CardContent className="p-0 flex flex-col md:flex-row">
                    {post.cover_image_url && (
                      <div className="md:w-64 aspect-video md:aspect-auto bg-muted shrink-0">
                        <img src={post.cover_image_url} alt={post.title_ar} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {blogCategories[post.category]?.[language] || post.category}
                        </Badge>
                        {post.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                      <h2 className="font-heading font-bold text-lg group-hover:text-gold transition-colors">
                        {language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {language === 'ar' ? (post.excerpt_ar || post.content_ar) : (post.excerpt_en || post.content_en || post.excerpt_ar || post.content_ar)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views_count} {isRTL ? 'مشاهدة' : 'views'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
