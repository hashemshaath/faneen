import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Contact = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  usePageMeta({
    title: isRTL ? 'تواصل معنا | فنيين' : 'Contact Us | Faneen',
    description: isRTL ? 'تواصل مع فريق فنيين للدعم الفني أو الاستفسارات أو الشراكات' : 'Contact Faneen team for support, inquiries or partnerships',
    canonical: 'https://faneen.com/contact',
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
      { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'تواصل معنا' : 'Contact', item: 'https://faneen.com/contact' },
    ],
  }), [language]));

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
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-confirmation',
          recipientEmail: form.email.trim().toLowerCase(),
          idempotencyKey: `contact-confirm-${id}`,
          templateData: {
            name: form.name.trim(),
            subject: form.subject.trim(),
          },
        },
      });

      // 3. Send notification email to admin
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-admin-notification',
          recipientEmail: 'info@faneen.com', // fallback; template.to overrides
          idempotencyKey: `contact-admin-${id}`,
          templateData: {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            subject: form.subject.trim(),
            message: form.message.trim(),
          },
        },
      });

      setSent(true);
      toast.success(isRTL ? 'تم إرسال رسالتك بنجاح' : 'Message sent successfully');
    } catch {
      toast.error(isRTL ? 'حدث خطأ، يرجى المحاولة لاحقاً' : 'An error occurred, please try again');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: Mail, label: isRTL ? 'البريد الإلكتروني' : 'Email', value: 'info@faneen.com', href: 'mailto:info@faneen.com' },
    { icon: Phone, label: isRTL ? 'الهاتف' : 'Phone', value: '+966 50 000 0000', href: 'tel:+966500000000' },
    { icon: MapPin, label: isRTL ? 'العنوان' : 'Address', value: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10">
        <div className="container px-4">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">
            {isRTL ? 'تواصل معنا' : 'Contact Us'}
          </h1>
        </div>
      </div>

      <div className="container py-10 px-4 max-w-4xl">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="md:col-span-2 space-y-4">
            {contactInfo.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-card">
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
              <div className="flex flex-col items-center justify-center p-10 rounded-xl border border-border/50 bg-card text-center gap-4">
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
              <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-border/50 bg-card space-y-5">
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

                <Button type="submit" disabled={loading} className="w-full gap-2">
                  <Send className="w-4 h-4" />
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
