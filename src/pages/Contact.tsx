import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
import { useAuth } from '@/contexts/AuthContext';
// JSON-LD types emitted via helpers below: '@type': 'BreadcrumbList', itemListElement:
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Mail, Phone, MapPin, Send, CheckCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { toast } from 'sonner';
import { track } from '@/lib/analytics-events';
import { getAttributionPayload } from '@/lib/analytics-attribution';

const Contact = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const startedRef = useRef(false);
  const [searchParams] = useSearchParams();

  // Prefill form from query string (?subject=...&message=...&name=...&email=...)
  useEffect(() => {
    const subject = searchParams.get('subject') ?? '';
    const message = searchParams.get('message') ?? '';
    const name = searchParams.get('name') ?? '';
    const email = searchParams.get('email') ?? '';
    if (subject || message || name || email) {
      setForm(f => ({
        name: name || f.name,
        email: email || f.email,
        subject: subject || f.subject,
        message: message || f.message,
      }));
    }
  }, [searchParams]);

  // Fires once when the user begins filling the contact form. We never send
  // the field values themselves — only the intent.
  const handleFormStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    track.quoteRequestStart({ contact_type: 'contact_form' });
  };

  usePageMeta({
    title: isRTL ? 'تواصل معنا | قِطاعات' : 'Contact Us | Qitaat',
    description: isRTL ? 'تواصل مع فريق قِطاعات للدعم الفني أو الاستفسارات أو الشراكات' : 'Contact Qitaat team for support, inquiries or partnerships',
    canonical: 'https://qitaat.com/contact',
    ogTitle: isRTL ? 'تواصل مع قِطاعات' : 'Contact Qitaat',
    ogDescription: isRTL ? 'تواصل مع فريق قِطاعات للدعم والشراكات والاستفسارات.' : 'Get in touch with the Qitaat team.',
    ogImage: ogImageFor('contact'),
    keywords: isRTL ? 'تواصل, قِطاعات, دعم, شراكات' : 'contact, qitaat, support, partnerships',
  });

  useMultiJsonLd(useMemo(() => {
    const crumbs = buildBreadcrumbList([
      { name: language === 'ar' ? 'تواصل معنا' : 'Contact', url: '/contact' },
    ]);
    return crumbs ? [crumbs] : null;
  }, [language]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(isRTL ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const id = crypto.randomUUID();

      // 1. Save message to database
      await supabase.from('contact_messages').insert({
        id,
        user_id: user?.id || null,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      // 2. Send confirmation email to user
      await sendTransactionalEmail({
        templateName: 'contact-confirmation',
        recipientEmail: form.email.trim().toLowerCase(),
        idempotencyKey: `contact-confirm-${id}`,
        templateData: {
          name: form.name.trim(),
          subject: form.subject.trim(),
        },
      });

      // 3. Send notification email to admin
      await sendTransactionalEmail({
        templateName: 'contact-admin-notification',
        recipientEmail: 'info@qitaat.com', // fallback; template.to overrides
        idempotencyKey: `contact-admin-${id}`,
        templateData: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
      });

      setSent(true);
      const attribution = getAttributionPayload();
      // Canonical contact event (Phase 6). `quote_request_submit` deprecated.
      track.contactFormSubmitted({ contact_type: 'contact_form', ...attribution });
      toast.success(isRTL ? 'تم إرسال رسالتك بنجاح' : 'Message sent successfully');
    } catch {
      toast.error(isRTL ? 'حدث خطأ، يرجى المحاولة لاحقاً' : 'An error occurred, please try again');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: Mail, label: isRTL ? 'البريد الإلكتروني (دعم العملاء)' : 'Email (Customer Care)', value: 'care@qitaat.com', href: 'mailto:care@qitaat.com' },
    { icon: Mail, label: isRTL ? 'البريد الرسمي (مراسلات)' : 'Official Email', value: 'info@qitaat.com', href: 'mailto:info@qitaat.com' },
    { icon: Phone, label: isRTL ? 'الهاتف' : 'Phone', value: '+966 56 922 0777', href: 'tel:+966569220777' },
    { icon: MessageCircle, label: isRTL ? 'واتساب' : 'WhatsApp', value: '+966 56 922 0777', href: 'https://wa.me/966569220777' },
    { icon: MapPin, label: isRTL ? 'العنوان' : 'Address', value: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10">
        <div className="container-app">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">
            {isRTL ? 'تواصل معنا' : 'Contact Us'}
          </h1>
        </div>
      </div>

      <div className="container-app page-shell max-w-4xl">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="md:col-span-2 space-y-4">
            {contactInfo.map((item, i) => (
              <div key={i} className="card-ds card-list">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="font-heading font-bold text-foreground hover:text-gold transition-colors">{item.value}</a>
                  ) : (
                    <p className="font-heading font-bold text-foreground">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            {sent ? (
              <div className="card-ds card-pad-lg flex flex-col items-center justify-center text-center gap-4">
                <CheckCircle className="w-16 h-16 text-secondary" />
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {isRTL ? 'تم إرسال رسالتك بنجاح!' : 'Message sent successfully!'}
                </h2>
                <p className="text-muted-foreground">
                  {isRTL ? 'سنقوم بالرد عليك في أقرب وقت. تم إرسال تأكيد إلى بريدك الإلكتروني.' : 'We\'ll get back to you soon. A confirmation has been sent to your email.'}
                </p>
                <Button variant="outline" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                  {isRTL ? 'إرسال رسالة أخرى' : 'Send another message'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} onFocusCapture={handleFormStart} className="card-ds card-pad-md space-y-5">
                <h2 className="text-lg font-heading font-bold text-foreground">
                  {isRTL ? 'أرسل لنا رسالة' : 'Send us a message'}
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الاسم *' : 'Name *'}</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={isRTL ? 'أدخل اسمك' : 'Your name'}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'البريد الإلكتروني *' : 'Email *'}</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Your email'}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? 'الموضوع' : 'Subject'}</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder={isRTL ? 'موضوع الرسالة' : 'Message subject'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? 'الرسالة *' : 'Message *'}</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={isRTL ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" size="appLg" disabled={loading} className="w-full gap-2">
                  <Send className="ic-sm" />
                  {loading
                    ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
                    : (isRTL ? 'إرسال الرسالة' : 'Send Message')
                  }
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
