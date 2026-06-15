import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { User, Building2, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * AUTH SIMPLIFICATION UX — `/start` is the post-login context selection
 * surface. It does NOT decide the account-type at signup; the user can
 * change context at any time later from the dashboard. No business is
 * created here, no entity_access_requests row is written. Each card is a
 * pure navigation to the existing surface that already owns that flow.
 */
const Start: React.FC = () => {
  const { user, loading } = useAuth();
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? 'ابدأ مع قِطاعات' : 'Get started with Qitaat',
    noindex: true,
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const ChevronEnd = isRTL ? ArrowLeft : ArrowRight;

  const cards: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    titleAr: string; titleEn: string;
    descAr: string;  descEn: string;
    ctaAr: string;   ctaEn: string;
    to: string;
  }> = [
    {
      id: 'individual',
      icon: User,
      titleAr: 'استخدم الحساب كفرد',
      titleEn: 'Use as an individual',
      descAr: 'أنشئ طلباتك، تابع مشاريعك، واحصل على عروض من مزودي الخدمة.',
      descEn: 'Create requests, follow your projects, and receive quotes from providers.',
      ctaAr: 'المتابعة كفرد',
      ctaEn: 'Continue as individual',
      to: '/dashboard',
    },
    {
      id: 'create-entity',
      icon: Building2,
      titleAr: 'أنشئ منشأة',
      titleEn: 'Create a business',
      descAr: 'أضف منشأتك، خدماتك، فريقك، وابدأ استقبال الطلبات بعد المراجعة.',
      descEn: 'Add your business, services, team, and start receiving requests after review.',
      ctaAr: 'إنشاء منشأة',
      ctaEn: 'Create business',
      to: '/onboarding',
    },
    {
      id: 'join-entity',
      icon: UserPlus,
      titleAr: 'انضم إلى منشأة',
      titleEn: 'Join a business',
      descAr: 'استخدم رابط الدعوة أو اطلب الانضمام لمنشأة قائمة.',
      descEn: 'Use an invitation link or request to join an existing business.',
      ctaAr: 'الانضمام إلى منشأة',
      ctaEn: 'Join a business',
      to: '/dashboard/team-access',
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-3xl space-y-8">
          <header className="text-center space-y-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              {isRTL ? 'مرحبًا بك في قِطاعات' : 'Welcome to Qitaat'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {isRTL
                ? 'اختر كيف تريد البدء. يمكنك تغيير هذا لاحقًا في أي وقت.'
                : 'Choose how you want to start. You can change this later at any time.'}
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-feature="start-context-cards">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.id}
                  to={c.to}
                  data-context={c.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary hover:shadow-md hover-lift transition-all duration-300 text-start"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-heading font-bold text-base text-foreground mb-1">
                    {isRTL ? c.titleAr : c.titleEn}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                    {isRTL ? c.descAr : c.descEn}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {isRTL ? c.ctaAr : c.ctaEn}
                    </span>
                    <ChevronEnd className="w-4 h-4 text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center space-y-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                {isRTL ? 'تخطي الآن' : 'Skip for now'}
              </Link>
            </Button>
            <p className="text-[11px] text-muted-foreground/70">
              {isRTL
                ? 'يمكنك إنشاء أو الانضمام إلى منشأة لاحقًا من لوحة التحكم.'
                : 'You can create or join a business later from the dashboard.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Start;
