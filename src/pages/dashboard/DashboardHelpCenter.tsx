/**
 * HELP-CENTER-ADMIN-2 — Provider / staff Help dashboard.
 * Shows the user's own issue reports + feature requests, plus quick
 * links to the public help center. No admin actions. Uses wrappers only.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { LifeBuoy, MessageSquare, Lightbulb, BookOpen } from 'lucide-react';
import {
  listMyIssueReports,
  listMyFeatureRequests,
  listPopularArticles,
} from '@/modules/helpCenter';

const DashboardHelpCenter: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();

  const { data: myIssues = [] } = useQuery({ queryKey: ['dash', 'help', 'my-issues'], queryFn: listMyIssueReports });
  const { data: myFeatures = [] } = useQuery({ queryKey: ['dash', 'help', 'my-features'], queryFn: listMyFeatureRequests });
  const { data: popular = [] } = useQuery({ queryKey: ['dash', 'help', 'popular'], queryFn: () => listPopularArticles(6) });

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-5xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isRTL ? 'مركز المساعدة' : 'Help Center'}</h1>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مقالاتك، بلاغاتك، وطلباتك' : 'Articles, your issues and requests'}</p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl"><Link to="/help"><BookOpen className="w-4 h-4 me-2" />{isRTL ? 'تصفّح المساعدة' : 'Browse help'}</Link></Button>
          <Button asChild variant="outline" className="rounded-xl"><Link to="/help/report-issue"><MessageSquare className="w-4 h-4 me-2" />{isRTL ? 'الإبلاغ عن مشكلة' : 'Report an issue'}</Link></Button>
          <Button asChild variant="outline" className="rounded-xl"><Link to="/help/feature-request"><Lightbulb className="w-4 h-4 me-2" />{isRTL ? 'اقتراح ميزة' : 'Request a feature'}</Link></Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{isRTL ? 'بلاغاتي' : 'My issue reports'}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myIssues.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد بلاغات' : 'No reports yet'}</div>}
              {myIssues.map((i) => (
                <div key={i.id} className="border border-border rounded-lg p-2 flex items-center gap-2">
                  <Badge variant="outline" className="tech-content">{i.ref_id ?? '—'}</Badge>
                  <span className="text-sm truncate flex-1">{i.title}</span>
                  <Badge variant="secondary">{i.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{isRTL ? 'طلباتي' : 'My feature requests'}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myFeatures.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد طلبات' : 'No requests yet'}</div>}
              {myFeatures.map((f) => (
                <div key={f.id} className="border border-border rounded-lg p-2 flex items-center gap-2">
                  <Badge variant="outline" className="tech-content">{f.ref_id ?? '—'}</Badge>
                  <span className="text-sm truncate flex-1">{f.title}</span>
                  <Badge variant="secondary">{f.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{isRTL ? 'مقالات شائعة' : 'Popular articles'}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {popular.map((a) => (
              <Link key={a.id} to={`/help/article/${a.slug}`} className="block p-2 rounded hover:bg-muted text-sm">
                {isRTL ? a.title_ar : a.title_en}
              </Link>
            ))}
            {popular.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardHelpCenter;