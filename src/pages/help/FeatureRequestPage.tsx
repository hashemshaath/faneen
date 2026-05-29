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
import { submitFeatureRequest } from '@/modules/helpCenter';
import { Lightbulb } from 'lucide-react';

const FeatureRequestPage: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [refId, setRefId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const r = await submitFeatureRequest({ category: category || undefined, title, description });
      setRefId(r.ref_id ?? r.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-24 max-w-2xl">
        <h1 className="text-3xl font-heading font-black mb-2">{isRTL ? 'اقتراح ميزة' : 'Request a feature'}</h1>
        <p className="text-muted-foreground mb-6 text-sm">{isRTL ? 'شاركنا فكرتك لتحسين قطاعات.' : 'Share your idea to improve Qitaat.'}</p>
        {!user ? (
          <Card className="rounded-xl"><CardContent className="p-6 text-sm text-muted-foreground">{isRTL ? 'يرجى تسجيل الدخول.' : 'Please sign in.'}</CardContent></Card>
        ) : refId ? (
          <Card className="rounded-xl"><CardContent className="p-6 text-center">
            <Lightbulb className="w-10 h-10 text-primary mx-auto mb-3" />
            <div className="font-semibold mb-1">{isRTL ? 'تم استلام اقتراحك' : 'Request received'}</div>
            <div className="text-sm text-muted-foreground">{isRTL ? 'المرجع' : 'Reference'}: <span className="tech-content font-mono">{refId}</span></div>
          </CardContent></Card>
        ) : (
          <Card className="rounded-xl"><CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label>{isRTL ? 'القسم' : 'Category'}</Label><Input dir="auto" value={category} onChange={(e) => setCategory(e.target.value)} className="h-12" /></div>
              <div><Label>{isRTL ? 'العنوان' : 'Title'}</Label><Input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className="h-12" /></div>
              <div><Label>{isRTL ? 'الوصف' : 'Description'}</Label><Textarea dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} /></div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <Button type="submit" disabled={submitting || !title.trim()} className="w-full h-12">{isRTL ? 'إرسال' : 'Submit'}</Button>
            </form>
          </CardContent></Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FeatureRequestPage;