import React, { useMemo, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Calendar, Eye, FileText, Clock, BookOpen, List, Share2, Copy, CheckCheck } from 'lucide-react';

const blogCategories: Record<string, { ar: string; en: string }> = {
  general: { ar: 'عام', en: 'General' },
  tips: { ar: 'نصائح', en: 'Tips' },
  news: { ar: 'أخبار', en: 'News' },
  guides: { ar: 'أدلة', en: 'Guides' },
  industry: { ar: 'صناعة', en: 'Industry' },
};

const estimateReadTime = (content: string | null): number => {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
};

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const extractHeadings = (content: string): TocItem[] => {
  const lines = content.split('\n');
  const headings: TocItem[] = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Detect lines that look like headings (short, bold-ish, or starting with # or ending with :)
    if (trimmed.length > 3 && trimmed.length < 100 && (trimmed.startsWith('#') || trimmed.endsWith(':') || (trimmed.length < 60 && i > 0 && lines[i - 1]?.trim() === ''))) {
      const cleanText = trimmed.replace(/^#+\s*/, '').replace(/:$/, '');
      if (cleanText.length > 2) {
        headings.push({
          id: `heading-${i}`,
          text: cleanText,
          level: trimmed.startsWith('##') ? 2 : 1,
        });
      }
    }
  });
  return headings.slice(0, 10);
};

const BlogPost = () => {
  const { slug } = useParams();
  const { isRTL, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug!).eq('status', 'published').maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch related posts by same category
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ['related-posts', post?.category, post?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .eq('category', post!.category)
        .neq('id', post!.id)
        .order('published_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!post,
  });

  // Fetch latest posts as fallback
  const { data: latestPosts = [] } = useQuery({
    queryKey: ['latest-posts-sidebar', post?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .neq('id', post!.id)
        .order('published_at', { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!post,
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const title = post ? (language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)) : '';
  const content = post ? (language === 'ar' ? (post.content_ar || '') : (post.content_en || post.content_ar || '')) : '';
  const readTime = estimateReadTime(content);
  const headings = useMemo(() => extractHeadings(content), [content]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href });
    } else {
      handleCopyLink();
    }
  };

  // Scroll progress
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center items-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
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

  const paragraphs = content.split('\n').filter((p) => p.trim());

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
        <div className="h-full bg-accent transition-all duration-150 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Cover */}
      {post.cover_image_url ? (
        <div className="w-full h-72 md:h-[28rem] bg-muted relative mt-16 overflow-hidden">
          <img src={post.cover_image_url} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      ) : (
        <div className="pt-16" />
      )}

      <div className="container mx-auto px-4 max-w-6xl" style={{ marginTop: post.cover_image_url ? '-5rem' : '2rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 relative">
          {/* Main Content */}
          <div className="relative">
            <Link to="/blog" className="inline-flex mb-4">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                <BackIcon className="w-4 h-4" />
                {isRTL ? 'المدونة' : 'Blog'}
              </Button>
            </Link>

            {/* Meta badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-accent text-accent-foreground">{blogCategories[post.category]?.[language] || post.category}</Badge>
              {post.tags?.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
            </div>

            <h1 className="font-heading font-bold text-3xl md:text-4xl lg:text-[2.5rem] leading-tight mb-4">{title}</h1>

            {/* Meta info bar */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-accent" />{new Date(post.published_at || post.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-accent" />{post.views_count} {isRTL ? 'مشاهدة' : 'views'}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-accent" />{readTime} {isRTL ? 'دقائق قراءة' : 'min read'}</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 w-8 p-0">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 w-8 p-0">
                  {copied ? <CheckCheck className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Excerpt highlight */}
            {(post.excerpt_ar || post.excerpt_en) && (
              <div className="bg-accent/5 border-s-4 border-accent rounded-e-lg p-4 mb-8 text-muted-foreground italic">
                {language === 'ar' ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar)}
              </div>
            )}

            {/* Article body */}
            <article className="prose prose-lg max-w-none dark:prose-invert mb-12 prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground/80 prose-p:leading-relaxed">
              {paragraphs.map((paragraph, i) => {
                const trimmed = paragraph.trim();
                const isHeading = trimmed.startsWith('#') || (trimmed.length < 60 && trimmed.endsWith(':'));
                const headingIndex = headings.findIndex(h => h.text === trimmed.replace(/^#+\s*/, '').replace(/:$/, ''));
                if (isHeading && headingIndex >= 0) {
                  return (
                    <h2 key={i} id={headings[headingIndex].id} className="text-xl font-bold mt-8 mb-4 scroll-mt-24">
                      {headings[headingIndex].text}
                    </h2>
                  );
                }
                return <p key={i}>{trimmed}</p>;
              })}
            </article>

            {/* Tags footer */}
            {post.tags?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap py-6 border-t border-border/50 mb-8">
                <span className="text-sm text-muted-foreground font-medium">{isRTL ? 'الوسوم:' : 'Tags:'}</span>
                {post.tags.map((tag: string) => (
                  <Link key={tag} to={`/blog`}>
                    <Badge variant="outline" className="hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer">#{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mb-12">
                <h3 className="font-heading font-bold text-xl mb-5 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  {isRTL ? 'مقالات ذات صلة' : 'Related Articles'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedPosts.map((rp: any) => (
                    <Link key={rp.id} to={`/blog/${rp.slug}`} className="group">
                      <Card className="overflow-hidden h-full border-border/50 hover:border-accent/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-400">
                        <CardContent className="p-0 flex flex-col h-full">
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            {rp.cover_image_url ? (
                              <img src={rp.cover_image_url} alt={rp.title_ar} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/5">
                                <BookOpen className="w-8 h-8 text-muted-foreground/15" />
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col">
                            <h4 className="font-heading font-bold text-sm line-clamp-2 group-hover:text-accent transition-colors mb-1">
                              {language === 'ar' ? rp.title_ar : (rp.title_en || rp.title_ar)}
                            </h4>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-auto">
                              <Calendar className="w-3 h-3" />
                              {new Date(rp.published_at || rp.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              {/* Table of Contents */}
              {headings.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3">
                      <List className="w-4 h-4 text-accent" />
                      {isRTL ? 'جدول المحتويات' : 'Table of Contents'}
                    </h3>
                    <nav className="space-y-1">
                      {headings.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                            setActiveHeading(h.id);
                          }}
                          className={`block text-xs py-1.5 px-2 rounded-md transition-colors duration-200 hover:bg-accent/10 hover:text-accent ${
                            activeHeading === h.id ? 'bg-accent/10 text-accent font-medium' : 'text-muted-foreground'
                          } ${h.level === 2 ? 'ps-5' : ''}`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              )}

              {/* Latest Posts */}
              {latestPosts.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-accent" />
                      {isRTL ? 'أحدث المقالات' : 'Latest Articles'}
                    </h3>
                    <div className="space-y-3">
                      {latestPosts.map((lp: any) => (
                        <Link key={lp.id} to={`/blog/${lp.slug}`} className="group flex items-start gap-2.5">
                          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                            {lp.cover_image_url ? (
                              <img src={lp.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground/20" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium line-clamp-2 group-hover:text-accent transition-colors">
                              {language === 'ar' ? lp.title_ar : (lp.title_en || lp.title_ar)}
                            </h4>
                            <span className="text-[10px] text-muted-foreground">{new Date(lp.published_at || lp.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Share card */}
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-4 text-center space-y-2">
                  <Share2 className="w-6 h-6 text-accent mx-auto" />
                  <p className="text-xs text-muted-foreground">{isRTL ? 'شارك هذا المقال' : 'Share this article'}</p>
                  <Button variant="outline" size="sm" onClick={handleShare} className="w-full gap-1.5 text-xs">
                    <Share2 className="w-3.5 h-3.5" />
                    {isRTL ? 'مشاركة' : 'Share'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BlogPost;
