import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Calendar, Eye, FileText } from 'lucide-react';

const blogCategories: Record<string, { ar: string; en: string }> = {
  general: { ar: 'عام', en: 'General' },
  tips: { ar: 'نصائح', en: 'Tips' },
  news: { ar: 'أخبار', en: 'News' },
  guides: { ar: 'أدلة', en: 'Guides' },
  industry: { ar: 'صناعة', en: 'Industry' },
};

const BlogPost = () => {
  const { slug } = useParams();
  const { isRTL, language } = useLanguage();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug!).eq('status', 'published').maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center items-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh]">
          <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h1 className="font-heading font-bold text-xl mb-2">{isRTL ? 'المقال غير موجود' : 'Article not found'}</h1>
          <Link to="/blog"><Button variant="outline">{isRTL ? 'العودة للمدونة' : 'Back to Blog'}</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = language === 'ar' ? post.title_ar : (post.title_en || post.title_ar);
  const content = language === 'ar' ? (post.content_ar || '') : (post.content_en || post.content_ar || '');

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Cover */}
      {post.cover_image_url ? (
        <div className="w-full h-64 md:h-96 bg-muted relative mt-16">
          <img src={post.cover_image_url} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      ) : (
        <div className="pt-16" />
      )}

      <div className="container mx-auto px-4 max-w-3xl" style={{ marginTop: post.cover_image_url ? '-4rem' : '2rem' }}>
        <div className="relative">
          <Link to="/blog" className="inline-flex mb-4">
            <Button variant="ghost" size="sm"><BackIcon className="w-4 h-4 me-1" />{isRTL ? 'المدونة' : 'Blog'}</Button>
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline">{blogCategories[post.category]?.[language] || post.category}</Badge>
            {post.tags?.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
          </div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl mb-4">{title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{post.views_count} {isRTL ? 'مشاهدة' : 'views'}</span>
          </div>
          <article className="prose prose-lg max-w-none dark:prose-invert mb-16">
            {content.split('\n').map((paragraph: string, i: number) => paragraph.trim() ? <p key={i}>{paragraph}</p> : null)}
          </article>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BlogPost;
