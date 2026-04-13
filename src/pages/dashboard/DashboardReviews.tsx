import React, { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Star, MessageCircle, Search, TrendingUp, TrendingDown,
  ThumbsUp, ThumbsDown, BarChart3, ArrowUpDown, X,
  Clock, ChevronDown, ChevronUp,
  Sparkles, LayoutGrid, LayoutList, FolderOpen, User,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ReviewWithRelations {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
  is_verified: boolean;
  project_id: string | null;
  // joined
  reviewer_name: string | null;
  reviewer_avatar: string | null;
  project_title_ar: string | null;
  project_title_en: string | null;
}

type FilterMode = 'all' | '5' | '4' | '3' | '2' | '1' | 'project' | 'general';
type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';
type ViewMode = 'cards' | 'compact';

const RatingStars = React.memo(({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => {
  const w = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${w} ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
});
RatingStars.displayName = 'RatingStars';

function getTimeAgo(dateStr: string, isRTL: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return isRTL ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isRTL ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return isRTL ? `منذ ${days} ي` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return isRTL ? `منذ ${months} ش` : `${months}mo ago`;
}

const ReviewCard = React.memo(({
  review, isRTL, language, viewMode, onToggleExpand, isExpanded,
}: {
  review: ReviewWithRelations; isRTL: boolean; language: string; viewMode: ViewMode;
  onToggleExpand: (id: string) => void; isExpanded: boolean;
}) => {
  const dateStr = new Date(review.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const timeAgo = getTimeAgo(review.created_at, isRTL);
  const sentiment = review.rating >= 4 ? 'positive' : review.rating >= 3 ? 'neutral' : 'negative';
  const sentimentColor = sentiment === 'positive' ? 'text-emerald-500' : sentiment === 'neutral' ? 'text-amber-500' : 'text-rose-500';
  const sentimentBg = sentiment === 'positive' ? 'bg-emerald-500/10' : sentiment === 'neutral' ? 'bg-amber-500/10' : 'bg-rose-500/10';

  const displayName = review.reviewer_name || (isRTL ? 'مستخدم' : 'User');
  const initials = displayName.slice(0, 2).toUpperCase();
  const projectTitle = review.project_id
    ? (language === 'ar' ? review.project_title_ar : (review.project_title_en || review.project_title_ar))
    : null;

  if (viewMode === 'compact') {
    return (
      <Card className="border-border/40 hover:border-primary/20 transition-all">
        <CardContent className="p-2.5 sm:p-3 flex items-center gap-3">
          <Avatar className="w-8 h-8 shrink-0">
            {review.reviewer_avatar && <AvatarImage src={review.reviewer_avatar} alt={displayName} />}
            <AvatarFallback className={`text-[10px] font-bold ${sentimentBg} ${sentimentColor}`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold">{displayName}</span>
              <RatingStars rating={review.rating} />
              {review.project_id && (
                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary">
                  <FolderOpen className="w-2.5 h-2.5" />
                  {isRTL ? 'مشروع' : 'Project'}
                </Badge>
              )}
              {review.is_verified && (
                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-emerald-500/10 text-emerald-600">
                  ✓ {isRTL ? 'موثق' : 'Verified'}
                </Badge>
              )}
            </div>
            {review.content && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{review.content}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border-0 ${sentimentBg} ${sentimentColor}`}>
              {sentiment === 'positive' ? (isRTL ? 'إيجابي' : '+') : sentiment === 'neutral' ? (isRTL ? 'محايد' : '~') : (isRTL ? 'سلبي' : '-')}
            </Badge>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 hover:border-primary/20 hover:shadow-sm transition-all group">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 shrink-0 mt-0.5">
            {review.reviewer_avatar && <AvatarImage src={review.reviewer_avatar} alt={displayName} />}
            <AvatarFallback className={`text-xs font-bold ${sentimentBg} ${sentimentColor}`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{displayName}</span>
                <RatingStars rating={review.rating} />
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border-0 ${sentimentBg} ${sentimentColor}`}>
                  {review.rating}/5
                </Badge>
                {review.is_verified && (
                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-emerald-500/10 text-emerald-600">
                    ✓ {isRTL ? 'موثق' : 'Verified'}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            </div>

            {/* Project Badge */}
            {review.project_id && projectTitle && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-default">
                  <FolderOpen className="w-3 h-3" />
                  {isRTL ? 'مشروع:' : 'Project:'} {projectTitle}
                </Badge>
              </div>
            )}
            {!review.project_id && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  {isRTL ? 'تقييم عام' : 'General Review'}
                </Badge>
              </div>
            )}

            {review.title && <h4 className="text-sm font-semibold mb-1">{review.title}</h4>}
            {review.content && (
              <div>
                <p className={`text-xs sm:text-sm text-muted-foreground leading-relaxed ${!isExpanded && review.content.length > 150 ? 'line-clamp-2' : ''}`}>
                  {review.content}
                </p>
                {review.content.length > 150 && (
                  <button onClick={() => onToggleExpand(review.id)} className="text-[11px] text-primary hover:underline mt-1 flex items-center gap-0.5">
                    {isExpanded ? <><ChevronUp className="w-3 h-3" />{isRTL ? 'أقل' : 'Less'}</> : <><ChevronDown className="w-3 h-3" />{isRTL ? 'المزيد' : 'More'}</>}
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{dateStr}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
ReviewCard.displayName = 'ReviewCard';

const DashboardReviews = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: business } = useQuery({
    queryKey: ['my-business-for-reviews', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['dashboard-reviews', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (!reviewsData?.length) return [];

      // Get unique user IDs and project IDs
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const projectIds = [...new Set(reviewsData.filter(r => r.project_id).map(r => r.project_id!))];

      // Fetch profiles and projects in parallel
      const [profilesRes, projectsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        projectIds.length > 0
          ? supabase.from('projects').select('id, title_ar, title_en').in('id', projectIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, p]));
      const projectsMap = new Map((projectsRes.data ?? []).map(p => [p.id, p]));

      return reviewsData.map(r => {
        const profile = profilesMap.get(r.user_id);
        const project = r.project_id ? projectsMap.get(r.project_id) : null;
        return {
          ...r,
          project_id: r.project_id ?? null,
          reviewer_name: profile?.full_name || null,
          reviewer_avatar: profile?.avatar_url || null,
          project_title_ar: project?.title_ar || null,
          project_title_en: project?.title_en || null,
        } as ReviewWithRelations;
      });
    },
    enabled: !!business?.id,
  });

  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0], positive: 0, negative: 0, trend: 0, projectCount: 0, generalCount: 0 };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    reviews.forEach(r => { dist[r.rating - 1]++; sum += r.rating; });
    const avg = sum / reviews.length;
    const positive = reviews.filter(r => r.rating >= 4).length;
    const negative = reviews.filter(r => r.rating <= 2).length;
    const projectCount = reviews.filter(r => r.project_id).length;
    const generalCount = reviews.filter(r => !r.project_id).length;
    const now = Date.now();
    const d30 = 30 * 86400000;
    const recent = reviews.filter(r => now - new Date(r.created_at).getTime() < d30);
    const older = reviews.filter(r => { const d = now - new Date(r.created_at).getTime(); return d >= d30 && d < d30 * 2; });
    const recentAvg = recent.length > 0 ? recent.reduce((s, r) => s + r.rating, 0) / recent.length : 0;
    const olderAvg = older.length > 0 ? older.reduce((s, r) => s + r.rating, 0) / older.length : 0;
    const trend = older.length > 0 ? recentAvg - olderAvg : 0;
    return { avg, total: reviews.length, distribution: dist.reverse(), positive, negative, trend, projectCount, generalCount };
  }, [reviews]);

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (filterMode === 'project') result = result.filter(r => r.project_id);
    else if (filterMode === 'general') result = result.filter(r => !r.project_id);
    else if (filterMode !== 'all') result = result.filter(r => r.rating === parseInt(filterMode));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.reviewer_name || '').toLowerCase().includes(q) ||
        (r.project_title_ar || '').toLowerCase().includes(q) ||
        (r.project_title_en || '').toLowerCase().includes(q)
      );
    }
    switch (sortMode) {
      case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'highest': result.sort((a, b) => b.rating - a.rating); break;
      case 'lowest': result.sort((a, b) => a.rating - b.rating); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [reviews, filterMode, sortMode, searchQuery]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            {isRTL ? 'التقييمات والمراجعات' : 'Reviews & Ratings'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isRTL ? 'تابع تقييمات عملائك المرتبطة بالمشاريع والتقييمات العامة' : 'Track project-linked and general customer reviews'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            {
              label: isRTL ? 'متوسط التقييم' : 'Avg Rating', value: stats.avg.toFixed(1),
              icon: Star, color: 'text-amber-500 bg-amber-500/10',
              extra: stats.trend !== 0 ? (
                <span className={`text-[9px] flex items-center gap-0.5 ${stats.trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {Math.abs(stats.trend).toFixed(1)}
                </span>
              ) : null,
            },
            { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, icon: MessageCircle, color: 'text-blue-500 bg-blue-500/10' },
            { label: isRTL ? 'إيجابية' : 'Positive', value: stats.positive, icon: ThumbsUp, color: 'text-emerald-500 bg-emerald-500/10' },
            { label: isRTL ? 'سلبية' : 'Negative', value: stats.negative, icon: ThumbsDown, color: 'text-rose-500 bg-rose-500/10' },
            { label: isRTL ? 'مرتبطة بمشروع' : 'Project', value: stats.projectCount, icon: FolderOpen, color: 'text-primary bg-primary/10' },
            { label: isRTL ? 'تقييم عام' : 'General', value: stats.generalCount, icon: User, color: 'text-muted-foreground bg-muted' },
          ].map((s, i) => (
            <Card key={i} className="border-border/40 bg-card/50">
              <CardContent className="p-2.5 sm:p-3 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold">{s.value}</p>
                    {s.extra}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rating Distribution */}
        {reviews.length > 0 && (
          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-primary" />
                {isRTL ? 'توزيع التقييمات' : 'Rating Distribution'}
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution[5 - star];
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <button key={star} onClick={() => setFilterMode(filterMode === String(star) ? 'all' : String(star) as FilterMode)}
                      className={`flex items-center gap-2 w-full group/bar rounded-md px-1.5 py-0.5 transition-colors ${filterMode === String(star) ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <span className="text-xs font-medium w-6 text-end">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-end">{count}</span>
                      <span className="text-[10px] text-muted-foreground w-10 text-end">{pct.toFixed(0)}%</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        {reviews.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={isRTL ? 'ابحث بالاسم أو المحتوى أو المشروع...' : 'Search by name, content, or project...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9 h-9" />
              </div>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="w-auto h-9 text-xs gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{isRTL ? 'الأحدث' : 'Newest'}</SelectItem>
                  <SelectItem value="oldest">{isRTL ? 'الأقدم' : 'Oldest'}</SelectItem>
                  <SelectItem value="highest">{isRTL ? 'الأعلى تقييماً' : 'Highest'}</SelectItem>
                  <SelectItem value="lowest">{isRTL ? 'الأقل تقييماً' : 'Lowest'}</SelectItem>
                </SelectContent>
              </Select>
              {/* Type filter */}
              <Select value={filterMode === 'project' || filterMode === 'general' ? filterMode : 'all-types'} onValueChange={(v) => setFilterMode(v === 'all-types' ? 'all' : v as FilterMode)}>
                <SelectTrigger className="w-auto h-9 text-xs gap-1">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">{isRTL ? 'الكل' : 'All Types'}</SelectItem>
                  <SelectItem value="project">{isRTL ? 'مرتبطة بمشروع' : 'Project Reviews'}</SelectItem>
                  <SelectItem value="general">{isRTL ? 'تقييمات عامة' : 'General Reviews'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {filterMode !== 'all' && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilterMode('all')}>
                  <X className="w-3 h-3 me-1" />{isRTL ? 'مسح الفلتر' : 'Clear'}
                </Button>
              )}
              <div className="flex border border-border/40 rounded-lg overflow-hidden">
                <button className={`p-1.5 ${viewMode === 'cards' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('cards')}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button className={`p-1.5 ${viewMode === 'compact' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setViewMode('compact')}>
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : reviews.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {isRTL ? 'ستظهر تقييمات العملاء هنا مرتبطة بحساباتهم ومشاريعهم' : 'Customer reviews linked to their accounts and projects will appear here'}
              </p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mb-2" />
              <p className="font-medium">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? `عرض ${filtered.length} من ${reviews.length} تقييم` : `Showing ${filtered.length} of ${reviews.length} reviews`}
            </p>
            {filtered.map(review => (
              <ReviewCard key={review.id} review={review} isRTL={isRTL} language={language} viewMode={viewMode}
                onToggleExpand={toggleExpand} isExpanded={expandedIds.has(review.id)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardReviews;
