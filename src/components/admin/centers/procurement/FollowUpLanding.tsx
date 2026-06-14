import { Link } from 'react-router-dom';
import { Clock, Wrench, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Follow-up / SLA tab — presentational. Follow-up and SLA are tracked
 * inside Operations and the Contact SLA dashboard; this tile points to
 * those existing surfaces without duplicating any timer or SLA logic.
 */

const TILES = [
  {
    key: 'operations',
    to: '/admin/quote-operations',
    icon: Wrench,
    title: { ar: 'متابعة من العمليات', en: 'Follow-up from Operations' },
    description: {
      ar: 'إدارة المتابعة وSLA لكل طلب من شاشة العمليات.',
      en: 'Manage follow-up and SLA per request from the operations board.',
    },
  },
  {
    key: 'contact-sla',
    to: '/admin/contact-sla',
    icon: MessageSquare,
    title: { ar: 'SLA رسائل التواصل', en: 'Contact SLA Dashboard' },
    description: {
      ar: 'مؤشرات الالتزام بمستوى الخدمة على رسائل التواصل.',
      en: 'Service-level indicators for contact messages.',
    },
  },
] as const;

const FollowUpLanding = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Clock className="size-4 text-primary" />
          {isRTL ? 'المتابعة وSLA ضمن العمليات' : 'Follow-up & SLA live inside Operations'}
        </div>
        <p className="mt-1">
          {isRTL
            ? 'تتم المتابعة وقياس SLA داخل شاشة العمليات؛ هذه الروابط تأخذك مباشرةً إلى مكان الإجراء.'
            : 'Follow-up and SLA tracking happen inside Operations — these links jump you to where the action is.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.key}
              to={tile.to}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="flex flex-1 items-center justify-between gap-2 text-base">
                    <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                    <ArrowRight
                      className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {isRTL ? tile.description.ar : tile.description.en}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FollowUpLanding;