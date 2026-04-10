import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, ArrowRight, Calendar, Eye, FileText, Clock, BookOpen,
  List, Share2, Copy, CheckCheck, Bookmark, BookmarkCheck, ChevronUp,
  Search, X, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/github-dark.css';
import { BlogComments } from '@/components/blog/BlogComments';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang }).value; } catch {}
    }
    try { return hljs.highlightAuto(code).value; } catch {}
    return code;
  },
}));

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

interface TocItem { id: string; text: string; level: number; }

const extractHeadings = (content: string): TocItem[] => {
  const lines = content.split('\n');
  const headings: TocItem[] = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 100 && (trimmed.startsWith('#') || trimmed.endsWith(':') || (trimmed.length < 60 && i > 0 && lines[i - 1]?.trim() === ''))) {
      const cleanText = trimmed.replace(/^#+\s*/, '').replace(/:$/, '');
      if (cleanText.length > 2) {
        headings.push({ id: `heading-${i}`, text: cleanText, level: trimmed.startsWith('##') ? 2 : 1 });
      }
    }
  });
  return headings.slice(0, 10);
};

// ── Social share icons ──
const socialIcons: Record<string, { svg: string; hoverColor: string; label: string }> = {
  whatsapp: {
    svg: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
    hoverColor: 'group-hover:text-[#25D366]', label: 'WhatsApp',
  },
  x: {
    svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    hoverColor: 'group-hover:text-foreground', label: 'X',
  },
  facebook: {
    svg: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    hoverColor: 'group-hover:text-[#1877F2]', label: 'Facebook',
  },
  telegram: {
    svg: 'M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    hoverColor: 'group-hover:text-[#0088cc]', label: 'Telegram',
  },
  linkedin: {
    svg: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    hoverColor: 'group-hover:text-[#0A66C2]', label: 'LinkedIn',
  },
};

const SocialButton: React.FC<{ platform: string; onClick: () => void }> = ({ platform, onClick }) => {
  const s = socialIcons[platform];
  if (!s) return null;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent/10 active:scale-95 transition-all group" title={s.label}>
      <svg className={`w-5 h-5 text-muted-foreground ${s.hoverColor} transition-colors`} viewBox="0 0 24 24" fill="currentColor"><path d={s.svg} /></svg>
      <span className="text-[9px] text-muted-foreground">{s.label}</span>
    </button>
  );
};

// ── Floating actions (mobile) ──
const FloatingActions: React.FC<{
  onShare: () => void; onBookmark: () => void; isBookmarked: boolean; bookmarkPending: boolean; showUser: boolean;
}> = ({ onShare, onBookmark, isBookmarked, bookmarkPending, showUser }) => {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const handler = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="fixed bottom-4 end-4 z-40 flex flex-col gap-2 lg:hidden">
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-accent active:scale-95 transition-all animate-fade-in">
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      <button onClick={onShare}
        className="w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-accent active:scale-95 transition-all">
        <Share2 className="w-4 h-4" />
      </button>
      {showUser && (
        <button onClick={onBookmark} disabled={bookmarkPending}
          className={`w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center active:scale-95 transition-all ${isBookmarked ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}>
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

// ══════════ Main Component ══════════

const BlogPost = () => {
  const { slug } = useParams();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');
  const [tocOpen, setTocOpen] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug!).eq('status', 'published').maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ['related-posts', post?.category, post?.id],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('status', 'published').eq('category', post!.category).neq('id', post!.id).order('published_at', { ascending: false }).limit(3);
      return data || [];
    },
    enabled: !!post,
  });

  const { data: latestPosts = [] } = useQuery({
    queryKey: ['latest-posts-sidebar', post?.id],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('status', 'published').neq('id', post!.id).order('published_at', { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!post,
  });

  const { data: isBookmarked = false } = useQuery({
    queryKey: ['blog-bookmark', post?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('blog_bookmarks').select('id').eq('user_id', user!.id).eq('post_id', post!.id).maybeSingle();
      return !!data;
    },
    enabled: !!post && !!user,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!user || !post) return;
      if (isBookmarked) {
        await supabase.from('blog_bookmarks').delete().eq('user_id', user.id).eq('post_id', post.id);
      } else {
        await supabase.from('blog_bookmarks').insert({ user_id: user.id, post_id: post.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-bookmark', post?.id, user?.id] });
      toast.success(isBookmarked ? (isRTL ? 'تمت إزالة المقال من المحفوظات' : 'Removed from bookmarks') : (isRTL ? 'تم حفظ المقال' : 'Article bookmarked'));
    },
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const title = post ? (language === 'ar' ? post.title_ar : (post.title_en || post.title_ar)) : '';
  const content = post ? (language === 'ar' ? (post.content_ar || '') : (post.content_en || post.content_ar || '')) : '';
  const readTime = estimateReadTime(content);
  const headings = useMemo(() => extractHeadings(content), [content]);

  const articleRef = useRef<HTMLDivElement>(null);

  const renderedHTML = useMemo(() => {
    if (!content) return '';
    marked.setOptions({ breaks: true, gfm: true });
    const renderer = new marked.Renderer();
    let hIdx = 0;
    renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
      const h = headings[hIdx];
      const id = h?.id || `heading-auto-${hIdx}`;
      hIdx++;
      return `<h${depth} id="${id}" class="scroll-mt-20">${text}</h${depth}>`;
    };
    try {
      return marked.parse(content, { renderer }) as string;
    } catch {
      return content.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
    }
  }, [content, headings]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url: window.location.href }); } catch {}
    } else {
      handleCopyLink();
    }
  };

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      x: `https://x.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
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

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <div className="pt-24 flex justify-center items-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!post) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] px-4">
          <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h1 className="font-heading font-bold text-xl mb-2">{isRTL ? 'المقال غير موجود' : 'Article not found'}</h1>
          <Link to="/blog"><Button variant="outline">{isRTL ? 'العودة للمدونة' : 'Back to Blog'}</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* ═══ Reading Progress Bar ═══ */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 sm:h-1 bg-transparent">
        <div className="h-full bg-accent transition-all duration-150 ease-out rounded-full" style={{ width: `${progress}%` }} />
      </div>

      {/* ═══ Cover ═══ */}
      {post.cover_image_url ? (
        <div className="w-full h-48 sm:h-72 md:h-[28rem] bg-muted relative mt-14 sm:mt-16 overflow-hidden">
          <img src={post.cover_image_url} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      ) : (
        <div className="pt-14 sm:pt-16" />
      )}

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl" style={{ marginTop: post.cover_image_url ? '-4rem' : '1.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8 relative">

          {/* ═══════════ Main Content ═══════════ */}
          <div className="relative min-w-0">
            <Link to="/blog" className="inline-flex mb-3 sm:mb-4">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9">
                <BackIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isRTL ? 'المدونة' : 'Blog'}
              </Button>
            </Link>

            {/* Meta badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
              <Badge className="bg-accent text-accent-foreground text-[10px] sm:text-xs">{blogCategories[post.category]?.[language] || post.category}</Badge>
              {post.tags?.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[9px] sm:text-[10px]">{tag}</Badge>)}
            </div>

            <h1 className="font-heading font-bold text-[1.4rem] sm:text-3xl md:text-4xl lg:text-[2.5rem] leading-[1.4] sm:leading-tight mb-4 sm:mb-5 text-foreground">{title}</h1>

            {/* Meta info bar */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />{new Date(post.published_at || post.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />{post.views_count}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />{readTime} {isRTL ? 'د' : 'min'}</span>
            </div>

            {/* ── Mobile: inline share bar ── */}
            <div className="flex items-center gap-1 mb-4 sm:mb-6 overflow-x-auto no-scrollbar lg:hidden">
              {Object.keys(socialIcons).map(p => (
                <SocialButton key={p} platform={p} onClick={() => shareToSocial(p)} />
              ))}
              <div className="w-px h-6 bg-border mx-1 shrink-0" />
              <button onClick={handleCopyLink} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent/10 active:scale-95 transition-all group shrink-0">
                {copied ? <CheckCheck className="w-5 h-5 text-accent" /> : <Copy className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />}
                <span className="text-[9px] text-muted-foreground">{copied ? '✓' : (isRTL ? 'نسخ' : 'Copy')}</span>
              </button>
              {user && (
                <>
                  <div className="w-px h-6 bg-border mx-1 shrink-0" />
                  <button onClick={() => toggleBookmark.mutate()} disabled={toggleBookmark.isPending}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent/10 active:scale-95 transition-all shrink-0 ${isBookmarked ? 'text-accent' : 'text-muted-foreground'}`}>
                    {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    <span className="text-[9px]">{isRTL ? 'حفظ' : 'Save'}</span>
                  </button>
                </>
              )}
            </div>

            {/* ── Desktop: inline share icons ── */}
            <div className="hidden lg:flex items-center gap-1 mb-6">
              {Object.keys(socialIcons).map(p => (
                <Button key={p} variant="ghost" size="sm" onClick={() => shareToSocial(p)} className="h-8 w-8 p-0 text-muted-foreground hover:text-accent">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d={socialIcons[p].svg} /></svg>
                </Button>
              ))}
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 w-8 p-0 text-muted-foreground hover:text-accent">
                {copied ? <CheckCheck className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </Button>
              {user && (
                <>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button variant="ghost" size="sm" onClick={() => toggleBookmark.mutate()} disabled={toggleBookmark.isPending}
                    className={`h-8 w-8 p-0 ${isBookmarked ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}>
                    {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </Button>
                </>
              )}
            </div>

            {/* ── Mobile TOC (collapsible) ── */}
            {headings.length > 0 && (
              <div className="lg:hidden mb-5 sm:mb-6 rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setTocOpen(!tocOpen)} className="flex items-center justify-between w-full p-3 sm:p-4 text-start">
                  <span className="font-heading font-bold text-xs sm:text-sm flex items-center gap-2">
                    <List className="w-4 h-4 text-accent" />
                    {isRTL ? 'جدول المحتويات' : 'Table of Contents'}
                  </span>
                  <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${tocOpen ? '' : 'rotate-180'}`} />
                </button>
                {tocOpen && (
                  <nav className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-0.5 animate-fade-in">
                    {headings.map((h) => (
                      <a key={h.id} href={`#${h.id}`}
                        onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); setActiveHeading(h.id); setTocOpen(false); }}
                        className={`block text-xs py-1.5 px-2 rounded-md transition-colors hover:bg-accent/10 hover:text-accent ${
                          activeHeading === h.id ? 'bg-accent/10 text-accent font-medium' : 'text-muted-foreground'
                        } ${h.level === 2 ? 'ps-5' : ''}`}>
                        {h.text}
                      </a>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {/* Excerpt */}
            {(post.excerpt_ar || post.excerpt_en) && (
              <div className="bg-accent/5 border-s-4 border-accent rounded-e-xl p-4 sm:p-5 mb-7 sm:mb-8 text-[0.9rem] sm:text-base text-muted-foreground italic font-body leading-[1.8]">
                {language === 'ar' ? post.excerpt_ar : (post.excerpt_en || post.excerpt_ar)}
              </div>
            )}

            {/* ═══ Article body ═══ */}
            <article className="prose prose-base lg:prose-lg max-w-none dark:prose-invert mb-10 sm:mb-12
              prose-headings:font-heading prose-headings:text-foreground prose-headings:scroll-mt-20
              prose-h2:text-lg prose-h2:sm:text-xl prose-h2:lg:text-2xl prose-h2:mt-8 prose-h2:sm:mt-10 prose-h2:mb-4
              prose-h3:text-base prose-h3:sm:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-foreground/85 prose-p:leading-[1.85] prose-p:sm:leading-[1.8] prose-p:font-body prose-p:text-[0.925rem] prose-p:sm:text-base prose-p:mb-5
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-a:font-medium
              prose-strong:text-foreground prose-strong:font-semibold
              prose-blockquote:border-accent prose-blockquote:bg-accent/5 prose-blockquote:rounded-e-xl prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:my-6
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[0.8rem] prose-code:sm:text-sm
              prose-pre:bg-muted prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto
              prose-img:rounded-xl prose-img:shadow-lg prose-img:my-6
              prose-li:text-foreground/85 prose-li:text-[0.925rem] prose-li:sm:text-base prose-li:leading-[1.8] prose-li:my-1
              prose-ul:my-4 prose-ol:my-4
              prose-table:border-border prose-th:bg-muted prose-th:p-2.5 prose-td:p-2.5 prose-td:border-border
              prose-hr:border-border/50 prose-hr:my-8
              ">
              <div dangerouslySetInnerHTML={{ __html: renderedHTML }} />
            </article>

            {/* Tags footer */}
            {post.tags?.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap py-4 sm:py-6 border-t border-border/50 mb-6 sm:mb-8">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">{isRTL ? 'الوسوم:' : 'Tags:'}</span>
                {post.tags.map((tag: string) => (
                  <Link key={tag} to="/blog">
                    <Badge variant="outline" className="hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer text-[10px] sm:text-xs">#{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* ── Related Posts ── */}
            {relatedPosts.length > 0 && (
              <div className="mb-8 sm:mb-12">
                <h3 className="font-heading font-bold text-base sm:text-xl mb-4 sm:mb-5 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  {isRTL ? 'مقالات ذات صلة' : 'Related Articles'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {relatedPosts.map((rp: any) => (
                    <Link key={rp.id} to={`/blog/${rp.slug}`} className="group">
                      <Card className="overflow-hidden h-full border-border/50 hover:border-accent/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-400 active:scale-[0.98]">
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
                            <h4 className="font-heading font-bold text-xs sm:text-sm line-clamp-2 group-hover:text-accent transition-colors mb-1">
                              {language === 'ar' ? rp.title_ar : (rp.title_en || rp.title_ar)}
                            </h4>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1 mt-auto">
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

            {/* Comments */}
            {post && <BlogComments postId={post.id} />}
          </div>

          {/* ═══════════ Desktop Sidebar ═══════════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              {/* TOC */}
              {headings.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3">
                      <List className="w-4 h-4 text-accent" />
                      {isRTL ? 'جدول المحتويات' : 'Table of Contents'}
                    </h3>
                    <nav className="space-y-1">
                      {headings.map((h) => (
                        <a key={h.id} href={`#${h.id}`}
                          onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); setActiveHeading(h.id); }}
                          className={`block text-xs py-1.5 px-2 rounded-md transition-colors duration-200 hover:bg-accent/10 hover:text-accent ${
                            activeHeading === h.id ? 'bg-accent/10 text-accent font-medium' : 'text-muted-foreground'
                          } ${h.level === 2 ? 'ps-5' : ''}`}>
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
                            <h4 className="text-xs font-medium line-clamp-2 group-hover:text-accent transition-colors">{language === 'ar' ? lp.title_ar : (lp.title_en || lp.title_ar)}</h4>
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
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2 justify-center">
                    <Share2 className="w-4 h-4 text-accent" />
                    {isRTL ? 'شارك هذا المقال' : 'Share this article'}
                  </h3>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Object.keys(socialIcons).map(p => (
                      <SocialButton key={p} platform={p} onClick={() => shareToSocial(p)} />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-full gap-1.5 text-xs">
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ الرابط' : 'Copy Link')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ Floating mobile actions ═══ */}
      <FloatingActions
        onShare={handleShare}
        onBookmark={() => toggleBookmark.mutate()}
        isBookmarked={isBookmarked}
        bookmarkPending={toggleBookmark.isPending}
        showUser={!!user}
      />

      <Footer />
    </div>
  );
};

export default BlogPost;
