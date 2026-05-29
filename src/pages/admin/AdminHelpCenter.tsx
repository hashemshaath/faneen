/**
 * HELP-CENTER-ADMIN-2 — Admin Help management.
 * Tabs: Articles | Categories | Issue Reports | Feature Requests | Metrics.
 * Uses helpCenter wrappers only (no direct supabase.from calls).
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LifeBuoy, BookOpen, FolderTree, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import {
  listHelpArticles,
  publishHelpArticle,
  unpublishHelpArticle,
  adminListAllCategories,
  updateHelpCategory,
  listHelpIssueReports,
  updateHelpIssueReportStatus,
  listHelpFeatureRequests,
  updateHelpFeatureRequestStatus,
  computeHelpMetrics,
  computeHelpIntelligenceMetrics,
  computeContentGaps,
  computeArticleQuality,
  adminListSearchLogs,
  adminListContentGaps,
  updateContentGapStatus,
  createDraftArticleFromGap,
  type HelpContentGapRow,
  type HelpContentGapStatus,
  type HelpArticle,
  type HelpCategory,
  type HelpIssueReport,
  type HelpFeatureRequest,
  type HelpIssueStatus,
  type HelpFeatureStatus,
} from '@/modules/helpCenter';

const ISSUE_STATUSES: HelpIssueStatus[] = ['open', 'reviewing', 'planned', 'resolved', 'closed'];
const FEATURE_STATUSES: HelpFeatureStatus[] = ['new', 'reviewing', 'planned', 'in_progress', 'completed', 'rejected'];
const GAP_STATUSES: HelpContentGapStatus[] = ['new', 'reviewing', 'article_planned', 'article_created', 'ignored'];

const AdminHelpCenter: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data: articles = [] } = useQuery({ queryKey: ['admin', 'help', 'articles'], queryFn: listHelpArticles });
  const { data: categories = [] } = useQuery({ queryKey: ['admin', 'help', 'categories'], queryFn: adminListAllCategories });
  const { data: issues = [] } = useQuery({ queryKey: ['admin', 'help', 'issues'], queryFn: () => listHelpIssueReports({}) });
  const { data: features = [] } = useQuery({ queryKey: ['admin', 'help', 'features'], queryFn: () => listHelpFeatureRequests({}) });
  const { data: searchLogs = [] } = useQuery({ queryKey: ['admin', 'help', 'search-logs'], queryFn: () => adminListSearchLogs(1000) });
  const { data: contentGaps = [] } = useQuery({ queryKey: ['admin', 'help', 'content-gaps'], queryFn: () => adminListContentGaps(200) });

  const invalidate = (k: string) => qc.invalidateQueries({ queryKey: ['admin', 'help', k] });

  const publishM = useMutation({ mutationFn: ({ id, publish }: { id: string; publish: boolean }) => (publish ? publishHelpArticle(id) : unpublishHelpArticle(id)), onSuccess: () => invalidate('articles') });
  const catM = useMutation({ mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateHelpCategory(id, { is_active }), onSuccess: () => invalidate('categories') });
  const issueM = useMutation({ mutationFn: ({ id, status }: { id: string; status: HelpIssueStatus }) => updateHelpIssueReportStatus(id, status), onSuccess: () => invalidate('issues') });
  const featM = useMutation({ mutationFn: ({ id, status }: { id: string; status: HelpFeatureStatus }) => updateHelpFeatureRequestStatus(id, status), onSuccess: () => invalidate('features') });
  const gapStatusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HelpContentGapStatus }) => updateContentGapStatus(id, status),
    onSuccess: () => invalidate('content-gaps'),
  });
  const gapDraftM = useMutation({
    mutationFn: (gap: HelpContentGapRow) => createDraftArticleFromGap(gap),
    onSuccess: () => {
      invalidate('content-gaps');
      invalidate('articles');
    },
  });

  const metrics = useMemo(() => computeHelpMetrics(articles, issues, features), [articles, issues, features]);
  const intel = useMemo(() => computeHelpIntelligenceMetrics(articles, issues, features, searchLogs), [articles, issues, features, searchLogs]);
  const gaps = useMemo(() => computeContentGaps(searchLogs), [searchLogs]);
  const qualityList = useMemo(
    () => articles.map((a) => ({ a, q: computeArticleQuality(a) })).sort((x, y) => x.q.score - y.q.score),
    [articles],
  );

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [audience, setAudience] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  const filteredArticles = articles.filter((a) => {
    if (status !== 'all' && a.status !== status) return false;
    if (audience !== 'all' && a.audience !== audience) return false;
    if (catFilter !== 'all' && a.category_id !== catFilter) return false;
    if (q && !`${a.title_ar} ${a.title_en} ${a.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const [issueStatusFilter, setIssueStatusFilter] = useState<string>('all');
  const filteredIssues = issues.filter((i) => issueStatusFilter === 'all' || i.status === issueStatusFilter);

  const [featStatusFilter, setFeatStatusFilter] = useState<string>('all');
  const filteredFeatures = features.filter((f) => featStatusFilter === 'all' || f.status === featStatusFilter);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isRTL ? 'مركز المساعدة (إدارة)' : 'Help Center (Admin)'}</h1>
            <p className="text-xs text-muted-foreground">{isRTL ? 'المقالات، الفئات، البلاغات، والطلبات' : 'Articles, categories, issues, requests'}</p>
          </div>
        </header>

        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="articles" className="gap-1.5"><BookOpen className="size-3.5" />{isRTL ? 'المقالات' : 'Articles'}</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><FolderTree className="size-3.5" />{isRTL ? 'الفئات' : 'Categories'}</TabsTrigger>
            <TabsTrigger value="issues" className="gap-1.5"><AlertTriangle className="size-3.5" />{isRTL ? 'البلاغات' : 'Issues'}</TabsTrigger>
            <TabsTrigger value="features" className="gap-1.5"><Lightbulb className="size-3.5" />{isRTL ? 'الطلبات' : 'Requests'}</TabsTrigger>
            <TabsTrigger value="gaps" className="gap-1.5"><Lightbulb className="size-3.5" />{isRTL ? 'فجوات المحتوى' : 'Content Gaps'}</TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5"><BarChart3 className="size-3.5" />{isRTL ? 'المقاييس' : 'Metrics'}</TabsTrigger>
          </TabsList>

          {/* Articles */}
          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isRTL ? 'إدارة المقالات' : 'Manage articles'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isRTL ? 'بحث…' : 'Search…'} />
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل الجماهير' : 'All audiences'}</SelectItem>
                      <SelectItem value="general">general</SelectItem>
                      <SelectItem value="provider">provider</SelectItem>
                      <SelectItem value="customer">customer</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={catFilter} onValueChange={setCatFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل الفئات' : 'All categories'}</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{isRTL ? c.title_ar : c.title_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {filteredArticles.map((a: HelpArticle) => (
                    <div key={a.id} className="border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="tech-content">{a.ref_id ?? a.slug}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{isRTL ? a.title_ar : a.title_en}</div>
                        <div className="text-xs text-muted-foreground tech-content">/{a.slug} · {a.audience}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.views_count} {isRTL ? 'مشاهدة' : 'views'} · 👍 {a.helpful_count} / 👎 {a.not_helpful_count}
                      </div>
                      <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>{a.status}</Badge>
                      <Badge variant="outline" className="tech-content">Q {computeArticleQuality(a).score}</Badge>
                      <Button size="sm" variant="outline" onClick={() => publishM.mutate({ id: a.id, publish: a.status !== 'published' })} disabled={publishM.isPending}>
                        {a.status === 'published' ? (isRTL ? 'إلغاء النشر' : 'Unpublish') : (isRTL ? 'نشر' : 'Publish')}
                      </Button>
                    </div>
                  ))}
                  {filteredArticles.length === 0 && <div className="text-sm text-muted-foreground p-3">{isRTL ? 'لا نتائج' : 'No results'}</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories">
            <Card>
              <CardHeader><CardTitle className="text-base">{isRTL ? 'الفئات' : 'Categories'}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {categories.map((c: HelpCategory) => (
                  <div key={c.id} className="border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="tech-content">{c.ref_id ?? c.slug}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{isRTL ? c.title_ar : c.title_en}</div>
                      <div className="text-xs text-muted-foreground tech-content">/{c.slug} · {c.audience} · sort {c.sort_order}</div>
                    </div>
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? (isRTL ? 'فعّال' : 'Active') : (isRTL ? 'متوقف' : 'Inactive')}</Badge>
                    <Button size="sm" variant="outline" onClick={() => catM.mutate({ id: c.id, is_active: !c.is_active })} disabled={catM.isPending}>
                      {c.is_active ? (isRTL ? 'تعطيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues */}
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isRTL ? 'البلاغات' : 'Issue Reports'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={issueStatusFilter} onValueChange={setIssueStatusFilter}>
                  <SelectTrigger className="w-full md:w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
                    {ISSUE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  {filteredIssues.map((i: HelpIssueReport) => (
                    <div key={i.id} className="border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="tech-content">{i.ref_id ?? '—'}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{i.title}</div>
                        <div className="text-xs text-muted-foreground tech-content">{i.page_key} · {i.issue_type} · {i.priority}</div>
                      </div>
                      <Select value={i.status} onValueChange={(v) => issueM.mutate({ id: i.id, status: v as HelpIssueStatus })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ISSUE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {filteredIssues.length === 0 && <div className="text-sm text-muted-foreground p-3">{isRTL ? 'لا بلاغات' : 'No issues'}</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature requests */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isRTL ? 'طلبات الميزات' : 'Feature Requests'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={featStatusFilter} onValueChange={setFeatStatusFilter}>
                  <SelectTrigger className="w-full md:w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
                    {FEATURE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  {filteredFeatures.map((f: HelpFeatureRequest) => (
                    <div key={f.id} className="border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="tech-content">{f.ref_id ?? '—'}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{f.title}</div>
                        <div className="text-xs text-muted-foreground tech-content">{f.category ?? '—'} · 👍 {f.votes_count}</div>
                      </div>
                      <Select value={f.status} onValueChange={(v) => featM.mutate({ id: f.id, status: v as HelpFeatureStatus })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FEATURE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {filteredFeatures.length === 0 && <div className="text-sm text-muted-foreground p-3">{isRTL ? 'لا طلبات' : 'No requests'}</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics */}
          <TabsContent value="metrics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label={isRTL ? 'مقالات' : 'Articles'} value={metrics.totalArticles} />
              <MetricCard label={isRTL ? 'مشاهدات' : 'Views'} value={metrics.totalViews} />
              <MetricCard label={isRTL ? 'نسبة الإفادة' : 'Helpful ratio'} value={`${Math.round(metrics.helpfulRatio * 100)}%`} />
              <MetricCard label={isRTL ? 'بلاغات مفتوحة' : 'Open issues'} value={metrics.openIssues} />
              <MetricCard label={isRTL ? 'بلاغات محلولة' : 'Resolved'} value={metrics.resolvedIssues} />
              <MetricCard label={isRTL ? 'طلبات الميزات' : 'Feature requests'} value={metrics.totalFeatureRequests} />
            </div>
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">{isRTL ? 'الأكثر مشاهدة' : 'Top viewed'}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {metrics.topViewed.map((a) => (
                  <div key={a.slug} className="flex items-center justify-between text-sm">
                    <span className="truncate">{isRTL ? a.title_ar : a.title_en}</span>
                    <span className="tech-content text-muted-foreground">{a.views_count}</span>
                  </div>
                ))}
                {metrics.topViewed.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{isRTL ? 'الأكثر بحثًا' : 'Top searched'}</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {intel.topSearched.map((t) => (
                    <div key={t.term} className="flex items-center justify-between text-sm">
                      <span className="truncate" dir="auto">{t.term}</span>
                      <span className="tech-content text-muted-foreground">{t.count}</span>
                    </div>
                  ))}
                  {intel.topSearched.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{isRTL ? 'بحث بدون نتائج' : 'Zero-result searches'}</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {intel.zeroResultSearches.map((t) => (
                    <div key={t.term} className="flex items-center justify-between text-sm">
                      <span className="truncate" dir="auto">{t.term}</span>
                      <span className="tech-content text-muted-foreground">{t.count}</span>
                    </div>
                  ))}
                  {intel.zeroResultSearches.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{isRTL ? 'الأكثر إفادة' : 'Top helpful'}</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {intel.topHelpfulArticles.map((a) => (
                    <div key={a.slug} className="flex items-center justify-between text-sm">
                      <span className="truncate">{isRTL ? a.title_ar : a.title_en}</span>
                      <span className="tech-content text-muted-foreground">{Math.round(a.ratio * 100)}% · {a.votes}</span>
                    </div>
                  ))}
                  {intel.topHelpfulArticles.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{isRTL ? 'الأقل إفادة' : 'Least helpful'}</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {intel.leastHelpfulArticles.map((a) => (
                    <div key={a.slug} className="flex items-center justify-between text-sm">
                      <span className="truncate">{isRTL ? a.title_ar : a.title_en}</span>
                      <span className="tech-content text-muted-foreground">{Math.round(a.ratio * 100)}% · {a.votes}</span>
                    </div>
                  ))}
                  {intel.leastHelpfulArticles.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{isRTL ? 'فجوات المحتوى المقترحة' : 'Content gaps'}</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {gaps.map((g) => (
                    <div key={g.term} className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate" dir="auto">{g.suggestedTitle}</span>
                      <span className="tech-content text-muted-foreground">×{g.frequency}</span>
                    </div>
                  ))}
                  {gaps.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا فجوات حتى الآن' : 'No gaps yet'}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{isRTL ? 'مقالات تحتاج تحسينًا' : 'Articles needing improvement'}</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {qualityList.slice(0, 10).map(({ a, q }) => (
                    <div key={a.slug} className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate">{isRTL ? a.title_ar : a.title_en}</span>
                      <span className="tech-content text-muted-foreground">{q.score}/100</span>
                    </div>
                  ))}
                  {qualityList.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

const MetricCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tech-content">{value}</div>
    </CardContent>
  </Card>
);

export default AdminHelpCenter;