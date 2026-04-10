import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Book, Mail, Smartphone, Brain, Globe, ExternalLink,
  Copy, CheckCircle2, Code2, FileText, Zap, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied!');
};

const CodeBlock = ({ code, lang = 'typescript' }: { code: string; lang?: string }) => (
  <div className="relative group">
    <pre className="bg-muted/70 rounded-lg p-4 text-xs font-mono overflow-x-auto border border-border/30" dir="ltr">
      <code>{code}</code>
    </pre>
    <button
      onClick={() => copyToClipboard(code)}
      className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded p-1.5"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  </div>
);

const apiDocs = {
  email: {
    icon: Mail,
    color: 'text-blue-500',
    title: { ar: 'خدمة البريد الإلكتروني', en: 'Email Service' },
    provider: 'SMTP / Lovable Cloud',
    endpoints: [
      {
        method: 'POST',
        path: '/send-email',
        desc: { ar: 'إرسال بريد إلكتروني', en: 'Send an email' },
        body: `{
  "to": "user@example.com",
  "subject": "Welcome",
  "html": "<h1>Hello!</h1>",
  "template": "welcome" // optional
}`,
      },
    ],
    setup: {
      ar: [
        'احصل على إعدادات SMTP من مزود البريد (Gmail, Outlook, etc.)',
        'أدخل بيانات الخادم في صفحة إعدادات API',
        'فعّل الخدمة بتشغيل المفتاح',
        'اختبر الإرسال من لوحة التحكم',
      ],
      en: [
        'Get SMTP settings from your email provider (Gmail, Outlook, etc.)',
        'Enter server credentials in the API settings page',
        'Enable the service by toggling the switch',
        'Test sending from the dashboard',
      ],
    },
    docs: 'https://support.google.com/mail/answer/7126229',
  },
  sms: {
    icon: Smartphone,
    color: 'text-green-500',
    title: { ar: 'خدمة الرسائل النصية (Twilio)', en: 'SMS Service (Twilio)' },
    provider: 'Twilio Verify',
    endpoints: [
      {
        method: 'POST',
        path: '/send-otp',
        desc: { ar: 'إرسال رمز التحقق OTP', en: 'Send OTP verification code' },
        body: `{
  "phone": "+966512345678",
  "channel": "sms" // or "whatsapp"
}`,
      },
      {
        method: 'POST',
        path: '/verify-otp',
        desc: { ar: 'التحقق من رمز OTP', en: 'Verify OTP code' },
        body: `{
  "phone": "+966512345678",
  "code": "123456"
}`,
      },
    ],
    setup: {
      ar: [
        'أنشئ حساب على twilio.com',
        'فعّل خدمة Twilio Verify',
        'أنشئ Verify Service وانسخ SID',
        'انسخ Account SID و Auth Token من الداشبورد',
        'اشترِ رقم هاتف سعودي أو دولي',
        'أدخل جميع البيانات في إعدادات API',
      ],
      en: [
        'Create an account on twilio.com',
        'Enable Twilio Verify service',
        'Create a Verify Service and copy the SID',
        'Copy Account SID and Auth Token from dashboard',
        'Purchase a Saudi or international phone number',
        'Enter all credentials in API settings',
      ],
    },
    docs: 'https://www.twilio.com/docs/verify/quickstarts',
  },
  ai: {
    icon: Brain,
    color: 'text-purple-500',
    title: { ar: 'خدمات الذكاء الاصطناعي', en: 'AI Services' },
    provider: 'OpenAI / Google AI',
    endpoints: [
      {
        method: 'POST',
        path: '/ai-chat',
        desc: { ar: 'محادثة ذكية مع AI', en: 'AI chat conversation' },
        body: `{
  "message": "What aluminum type is best for windows?",
  "model": "gpt-4o-mini",
  "context": "construction" // optional
}`,
      },
      {
        method: 'POST',
        path: '/ai-analyze',
        desc: { ar: 'تحليل صور المشاريع', en: 'Project image analysis' },
        body: `{
  "image_url": "https://...",
  "prompt": "Analyze this aluminum work"
}`,
      },
    ],
    setup: {
      ar: [
        'أنشئ حساب على platform.openai.com',
        'أنشئ مفتاح API من قسم API Keys',
        'اختر الخطة المناسبة (Pay-as-you-go)',
        'أدخل المفتاح في إعدادات API',
        'لـ Google AI: احصل على مفتاح من aistudio.google.com',
      ],
      en: [
        'Create account on platform.openai.com',
        'Generate an API key from the API Keys section',
        'Choose the appropriate plan (Pay-as-you-go)',
        'Enter the key in API settings',
        'For Google AI: get a key from aistudio.google.com',
      ],
    },
    docs: 'https://platform.openai.com/docs/api-reference',
  },
  google: {
    icon: Globe,
    color: 'text-red-500',
    title: { ar: 'منصات جوجل', en: 'Google Platforms' },
    provider: 'Google Cloud Platform',
    endpoints: [
      {
        method: 'GET',
        path: '/maps/geocode',
        desc: { ar: 'تحويل العناوين لإحداثيات', en: 'Convert addresses to coordinates' },
        body: `{
  "address": "Riyadh, Saudi Arabia"
}`,
      },
      {
        method: 'POST',
        path: '/notifications/push',
        desc: { ar: 'إرسال إشعار Push', en: 'Send push notification' },
        body: `{
  "token": "device_token",
  "title": "New Contract",
  "body": "You have a new contract"
}`,
      },
    ],
    setup: {
      ar: [
        'افتح Google Cloud Console',
        'أنشئ مشروع جديد أو استخدم مشروع موجود',
        'فعّل APIs المطلوبة (Maps, Analytics, reCAPTCHA)',
        'أنشئ مفاتيح API مع تقييدات مناسبة',
        'لـ Analytics: أنشئ property في analytics.google.com',
        'لـ FCM: فعّل Cloud Messaging في Firebase Console',
      ],
      en: [
        'Open Google Cloud Console',
        'Create a new project or use an existing one',
        'Enable required APIs (Maps, Analytics, reCAPTCHA)',
        'Create API keys with appropriate restrictions',
        'For Analytics: create a property in analytics.google.com',
        'For FCM: enable Cloud Messaging in Firebase Console',
      ],
    },
    docs: 'https://console.cloud.google.com/',
  },
};

const AdminApiDocs = () => {
  const { isRTL, language } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Book className="w-6 h-6 text-gold" />
            {isRTL ? 'توثيق API والتكاملات' : 'API Documentation & Integrations'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? 'دليل شامل لربط الخدمات الخارجية واستخدام واجهات API'
              : 'Comprehensive guide for connecting external services and using API endpoints'}
          </p>
        </div>

        {/* Quick overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(apiDocs) as Array<keyof typeof apiDocs>).map((key) => {
            const doc = apiDocs[key];
            const Icon = doc.icon;
            return (
              <Card key={key} className="border-border/50 hover:border-accent/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${key === 'email' ? 'bg-blue-500/10' : key === 'sms' ? 'bg-green-500/10' : key === 'ai' ? 'bg-purple-500/10' : 'bg-red-500/10'} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${doc.color}`} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm">{doc.title[language]}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.provider}</p>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {doc.endpoints.length} {isRTL ? 'نقطة وصول' : 'endpoints'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed docs */}
        <Tabs defaultValue="email">
          <TabsList className="bg-muted/50 rounded-xl p-1 flex-wrap h-auto">
            {(Object.keys(apiDocs) as Array<keyof typeof apiDocs>).map((key) => {
              const doc = apiDocs[key];
              const Icon = doc.icon;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 gap-1.5 text-xs"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {key === 'email' ? (isRTL ? 'البريد' : 'Email') : key === 'sms' ? 'SMS' : key === 'ai' ? 'AI' : 'Google'}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(apiDocs) as Array<keyof typeof apiDocs>).map((key) => {
            const doc = apiDocs[key];

            return (
              <TabsContent key={key} value={key} className="space-y-4">
                {/* Setup guide */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-gold" />
                      {isRTL ? 'دليل الإعداد' : 'Setup Guide'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'اتبع الخطوات التالية لربط الخدمة' : 'Follow these steps to connect the service'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {doc.setup[language].map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-gold/10 text-gold text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <a
                      href={doc.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline mt-4"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {isRTL ? 'التوثيق الرسمي' : 'Official Documentation'}
                    </a>
                  </CardContent>
                </Card>

                {/* Endpoints */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-gold" />
                      {isRTL ? 'نقاط الوصول (Endpoints)' : 'API Endpoints'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {doc.endpoints.map((endpoint, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded" dir="ltr">
                            {endpoint.path}
                          </code>
                        </div>
                        <p className="text-sm text-muted-foreground">{endpoint.desc[language]}</p>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                            {isRTL ? 'جسم الطلب (Request Body):' : 'Request Body:'}
                          </p>
                          <CodeBlock code={endpoint.body} lang="json" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Security notes */}
                <Card className="border-border/50 border-gold/20 bg-gold/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-heading font-bold text-sm mb-1">
                          {isRTL ? 'ملاحظات أمنية' : 'Security Notes'}
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                          <li>• {isRTL ? 'جميع المفاتيح مشفرة ومخزنة بأمان' : 'All keys are encrypted and stored securely'}</li>
                          <li>• {isRTL ? 'لا تشارك مفاتيح API مع أي شخص' : 'Never share API keys with anyone'}</li>
                          <li>• {isRTL ? 'استخدم قيود المفاتيح (Key Restrictions) حيثما أمكن' : 'Use key restrictions wherever possible'}</li>
                          <li>• {isRTL ? 'قم بتدوير المفاتيح بانتظام' : 'Rotate keys regularly'}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminApiDocs;
