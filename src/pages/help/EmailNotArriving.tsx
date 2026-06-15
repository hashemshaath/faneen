import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Inbox, Search, ShieldCheck, Clock, ArrowRight, AlertTriangle } from 'lucide-react';

const EmailNotArriving = () => {
  const { isRTL } = useLanguage();

  const steps = isRTL ? [
    {
      icon: Inbox,
      title: 'تحقق من مجلد Spam / Junk',
      body: 'افتح Gmail واضغط على "Spam" من القائمة اليسرى. أحيانًا تُحوَّل رسائل التحقق إلى هناك تلقائيًا. إذا وجدتها، اضغط "Report not spam".',
    },
    {
      icon: Search,
      title: 'افحص تبويب Promotions و Updates',
      body: 'في Gmail الجديد، رسائل القطاعات قد تُصنَّف ضمن "Promotions" أو "Updates" بدل "Primary". افتح كل تبويب وابحث عن "qitaat".',
    },
    {
      icon: ShieldCheck,
      title: 'أضف noreply@qitaat.com إلى جهات الاتصال',
      body: 'هذا يضمن أن جميع رسائلنا تصل إلى البريد الرئيسي مباشرة في المستقبل.',
    },
    {
      icon: Clock,
      title: 'انتظر دقيقتين ثم أعد المحاولة',
      body: 'في أوقات الذروة قد يتأخر التسليم حتى دقيقتين. بعد ذلك، اضغط "إعادة الإرسال" من صفحة استعادة كلمة المرور.',
    },
    {
      icon: Mail,
      title: 'تأكد من البريد الإلكتروني المُسجَّل',
      body: 'تأكد من كتابة البريد الإلكتروني بشكل صحيح وأنه نفسه الذي سجلت به في قطاعات.',
    },
    {
      icon: AlertTriangle,
      title: 'لا تزال الرسالة لم تصل؟',
      body: 'تواصل مع فريق الدعم وزودنا بالبريد الإلكتروني وآخر وقت حاولت فيه. سنقوم بفحص سجل الإرسال يدويًا.',
    },
  ] : [
    { icon: Inbox, title: 'Check Spam / Junk folder', body: 'Open Gmail and click "Spam" in the left sidebar. Verification emails sometimes land there. If you find one, click "Report not spam".' },
    { icon: Search, title: 'Check Promotions and Updates tabs', body: 'In the new Gmail UI, our emails might be filed under "Promotions" or "Updates" instead of "Primary". Open each tab and search for "qitaat".' },
    { icon: ShieldCheck, title: 'Add noreply@qitaat.com to contacts', body: 'This ensures all our future emails go straight to your primary inbox.' },
    { icon: Clock, title: 'Wait 2 minutes and retry', body: 'During peak times delivery can take up to 2 minutes. After that, click "Resend" on the password reset page.' },
    { icon: Mail, title: 'Verify the registered email', body: 'Make sure the email is typed correctly and matches the one you signed up with on Qitaat.' },
    { icon: AlertTriangle, title: 'Still nothing?', body: 'Contact our support team with the email address and the time you last tried. We will inspect the send log manually.' },
  ];

  return (
    <div className="min-h-screen bg-background py-10 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{isRTL ? 'لم تصلني رسالة OTP أو استعادة كلمة المرور — قطاعات' : 'Email or OTP not arriving — Qitaat'}</title>
        <meta name="description" content={isRTL ? 'خطوات عملية إذا لم تصلك رسالة التحقق أو رابط استعادة كلمة المرور من قطاعات.' : 'Practical steps if your verification email or password reset link from Qitaat did not arrive.'} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowRight className={`h-3 w-3 ${isRTL ? '' : 'rotate-180'}`} />
            {isRTL ? 'مركز المساعدة' : 'Help Center'}
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          {isRTL ? 'لم تصلني رسالة التحقق أو استعادة كلمة المرور' : 'My verification or recovery email is not arriving'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isRTL
            ? 'في أغلب الحالات تكون الرسالة وصلت لكنها صُنِّفت في Spam أو Promotions. جرّب الخطوات التالية بالترتيب.'
            : 'In most cases the email did arrive but was filtered into Spam or Promotions. Try these steps in order.'}
        </p>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <Card key={i} className="hover-lift">
              <CardContent className="p-4 flex gap-3 items-start">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold mb-1">
                    <span className="text-muted-foreground tech-content me-2">{i + 1}.</span>{s.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium mb-1">
            {isRTL ? '💡 ملاحظة Gmail' : '💡 Gmail tip'}
          </p>
          <p className="text-muted-foreground">
            {isRTL
              ? 'إذا كنت تستخدم Gmail على الهاتف، اسحب الرسالة من Spam إلى Inbox مرة واحدة — وسيتعلم Gmail تلقائيًا أن رسائلنا آمنة.'
              : 'If you use Gmail on mobile, drag a message from Spam into Inbox once — Gmail will automatically learn that our emails are safe.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailNotArriving;