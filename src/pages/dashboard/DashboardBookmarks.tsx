import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bookmark, BookmarkX, Calendar, Eye, BookOpen, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const categoryLabels: Record<string, { ar: string; en: string }> = {
  general: { ar: 'عام', en: 'General' },
  tips: { ar: 'نصائح', en: 'Tips' },
  news: { ar: 'أخبار', en: 'News' },
  guides: { ar: 'أدلة', en: 'Guides' },
  industry: { ar: 'صناعة', en: 'Industry' },
};

const DashboardBookmarks = () => {
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['dashboard-bookmarks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_bookmarks')
        .select('id, created_at, post_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const postIds = data.map(b => b.post_id);
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('id, title_ar, title_en, slug, category, cover_image_url, published_at, created_at, views_count, excerpt_ar, excerpt_en')
        .in('id', postIds);

      const postMap = new Map((posts || []).map(p => [p.id, p]));
      return data.map(b => ({ bookmark: b, post: postMap.get(b.post_id) })).filter(item => item.post);
    },
    enabled: !!user,
  });

  const removeBookmark = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase.from('blog_bookmarks').delete().eq('id', bookmarkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-bookmarks'] });
      toast.success(isRTL ? 'تمت إزالة المقال من المحفوظات' : 'Removed from bookmarks');
    },
  });

  const availableCategories = useMemo(() => {
    const cats = new Set(bookmarks.map(b => b.post?.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [bookmarks]);

  const filtered = useMemo(() => {
    return bookmarks.filter(({ post }) => {
      if (!post) return false;
      const matchCat = activeCategory === 'all' || post.category === activeCategory;
      if (!searchQuery.trim()) return matchCat;
      const q = searchQuery.toLowerCase();
      const text = `${post.title_ar} ${post.title_en || ''} ${post.excerpt_ar || ''} ${post.excerpt_en || ''}`.toLowerCase();
      return matchCat && text.includes(q);
    });
  }, [bookmarks, activeCategory, searchQuery]);

  const hasFilters = searchQuery.trim() || activeCategory !== 'all';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-accent" />
              {isRTL ? 'المقالات المحفوظة' : 'Saved Articles'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? `${bookmarks.length} مقال محفوظ` : `${bookmarks.length} saved articles`}
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {bookmarks.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'ابحث في المحفوظات...' : 'Search bookmarks...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-10 h-10"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                onClick={() => setActiveCategory('all')}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeCategory === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
              >
                {isRTL ? 'الكل' : 'All'}
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-accent text-accent-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
                >
                  {language === 'ar' ? categoryLabels[cat]?.ar : categoryLabels[cat]?.en || cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0 flex h-36">
                  <div className="w-36 bg-muted shrink-0" />
                  <div className="p-4 flex-1 space-y-3">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                    <div className="h-3 w-1/3 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">
                {isRTL ? 'لا توجد مقالات محفوظة' : 'No saved articles'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isRTL ? 'احفظ المقالات التي تهمك من المدونة للعودة إليها لاحقاً' : 'Save articles from the blog to read later'}
              </p>
              <Button asChild variant="outline">
                <Link to="/blog">{isRTL ? 'تصفح المدونة' : 'Browse Blog'}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'جرّب تغيير كلمات البحث أو التصنيف' : 'Try different search terms or category'}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {hasFilters && (
              <p className="text-xs text-muted-foreground">
                {isRTL ? `${filtered.length} نتيجة` : `${filtered.length} results`}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(({ bookmark, post }) => {
                const title = language === 'ar' ? post!.title_ar : (post!.title_en || post!.title_ar);
                const excerpt = language === 'ar' ? post!.excerpt_ar : (post!.excerpt_en || post!.excerpt_ar);
                const cat = categoryLabels[post!.category] || categoryLabels.general;

                return (
                  <Card key={bookmark.id} className="group overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0 flex h-36">
                      <Link to={`/blog/${post!.slug}`} className="w-36 shrink-0 overflow-hidden relative">
                        {post!.cover_image_url ? (
                          <img src={post!.cover_image_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-accent/5 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground/20" />
                          </div>
                        )}
                      </Link>
                      <div className="p-4 flex-1 flex flex-col min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {language === 'ar' ? cat.ar : cat.en}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeBookmark.mutate(bookmark.id)}
                            disabled={removeBookmark.isPending}
                            title={isRTL ? 'إزالة من المحفوظات' : 'Remove'}
                          >
                            <BookmarkX className="w-4 h-4" />
                          </Button>
                        </div>
                        <Link to={`/blog/${post!.slug}`} className="mt-1">
                          <h3 className="font-heading font-bold text-sm line-clamp-2 group-hover:text-accent transition-colors">
                            {title}
                          </h3>
                        </Link>
                        {excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{excerpt}</p>
                        )}
                        <div className="mt-auto flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post!.published_at || post!.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {post!.views_count}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBookmarks;
