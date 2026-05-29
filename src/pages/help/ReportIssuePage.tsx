import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNoIndex } from '@/hooks/useNoIndex';
import { submitIssueReport, type HelpIssuePriority, type HelpIssueType } from '@/modules/helpCenter';
import { CheckCircle2 } from 'lucide-react';

const TYPES: HelpIssueType[] = ['bug', 'ui', 'performance', 'data', 'security', 'content', 'other'];
const PRIORITIES: HelpIssuePriority[] = ['low', 'medium', 'high', 'critical'];

const ReportIssuePage: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [type, setType] = useState<HelpIssueType>('bug');
  const [priority, setPriority] = useState<HelpIssuePriority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageKey = typeof window !== 'undefined' ? window.location.pathname : '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const r = await submitIssueReport({ page_key: pageKey, issue_type: type, priority, title, description, screenshot_url: screenshot || undefined });
      setRefId(r.ref_id ?? r.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-24 max-w-2xl">
        <h1 className="text-3xl font-heading font-black mb-2">{isRTL ? 'الإبلاغ عن مشكلة' : 'Report an issue'}</h1>
        <p className="text-muted-foreground mb-6 text-sm">{isRTL ? 'ساعدنا في تحسين قطاعات.' : 'Help us improve Qitaat.'}</p>
        {!user ? (
          <Card className="rounded-xl"><CardContent className="p-6 text-sm text-muted-foreground">{isRTL ? 'يرجى تسجيل الدخول للإبلاغ عن مشكلة.' : 'Please sign in to report an issue.'}</CardContent></Card>
        ) : refId ? (
          <Card className="rounded-xl"><CardContent className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
            <div className="font-semibold mb-1">{isRTL ? 'تم استلام بلاغك' : 'Issue received'}</div>
            <div className="text-sm text-muted-foreground">{isRTL ? 'المرجع' : 'Reference'}: <span className="tech-content font-mono">{refId}</span></div>
          </CardContent></Card>
        ) : (
          <Card className="rounded-xl"><CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>{isRTL ? 'نوع المشكلة' : 'Issue type'}</Label>
                  <select value={type} onChange={(e) => setType(e.target.value as HelpIssueType)} className="h-12 w-full rounded-xl border border-input bg-background px-3">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>{isRTL ? 'الأولوية' : 'Priority'}</Label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as HelpIssuePriority)} className="h-12 w-full rounded-xl border border-input bg-background px-3">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>{isRTL ? 'الصفحة الحالية' : 'Current page'}</Label><Input value={pageKey} readOnly className="h-12 tech-content" /></div>
              <div><Label>{isRTL ? 'العنوان' : 'Title'}</Label><Input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className="h-12" /></div>
              <div><Label>{isRTL ? 'الوصف' : 'Description'}</Label><Textarea dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} /></div>
              <div><Label>{isRTL ? 'رابط لقطة شاشة (اختياري)' : 'Screenshot URL (optional)'}</Label><Input value={screenshot} onChange={(e) => setScreenshot(e.target.value)} className="h-12 tech-content" /></div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <Button type="submit" disabled={submitting || !title.trim()} className="w-full h-12">{isRTL ? 'إرسال البلاغ' : 'Submit report'}</Button>
            </form>
          </CardContent></Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ReportIssuePage;