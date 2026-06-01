import {
  CheckCircle2, Image as ImageIcon, ShieldCheck, Activity, FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBi } from '@/components/common/Bilingual';
import { Section, SectionHead } from './_shared';

const TrustSection = () => {
  const bi = useBi();
  const badges = [
    { icon: CheckCircle2, titleAr: 'بيانات مكتملة', titleEn: 'Complete profile',
      bodyAr: 'المزود أضاف معلوماته الأساسية وخدماته.', bodyEn: 'The provider added core info and services.' },
    { icon: ImageIcon, titleAr: 'صور أعمال مضافة', titleEn: 'Work samples added',
      bodyAr: 'المزود أضاف نماذج من أعماله.', bodyEn: 'The provider uploaded samples of past work.' },
    { icon: ShieldCheck, titleAr: 'تمت مراجعة البيانات', titleEn: 'Reviewed details',
      bodyAr: 'تمت مراجعة اكتمال ووضوح البيانات.', bodyEn: 'Profile completeness and clarity were reviewed.' },
    { icon: Activity, titleAr: 'مزود نشط', titleEn: 'Active provider',
      bodyAr: 'المزود يتابع حسابه وطلباته.', bodyEn: 'The provider keeps their account and requests up to date.' },
  ];
  return (
    <Section id="trust" ariaLabelledBy="trust-heading" className="bg-card/40">
      <SectionHead
        headingId="trust-heading"
        title={bi('معلومات أوضح. قرار أسهل.', 'Clearer info. Easier decisions.')}
        sub={bi(
          'نساعد على عرض بيانات مزودي الخدمة بطريقة منظمة، حتى يعرف العميل نوع النشاط، الخدمات، المدينة، نطاق العمل، وصور الأعمال قبل التواصل.',
          'We present provider details in an organized way, so clients see the activity, services, city, scope and work samples before reaching out.',
        )}
      />
      <p className="text-center text-xs sm:text-sm text-muted-foreground -mt-6 mb-8 max-w-2xl mx-auto">
        {bi(
          'نراجع البيانات قبل النشر، ولا نضمن نتائج التنفيذ.',
          'We review provider details before publishing, but do not guarantee execution results.',
        )}{' '}
        <Link to="/about#trust" className="text-primary hover:underline underline-offset-4">
          {bi('كيف نتحقق', 'How verification works')}
        </Link>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {badges.map(({ icon: Icon, titleAr, titleEn, bodyAr, bodyEn }) => (
          <div key={titleEn} className="rounded-xl border border-border/60 bg-background p-5 hover-lift">
            <Icon className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-heading font-semibold text-sm text-foreground mb-1.5">{bi(titleAr, titleEn)}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 max-w-3xl mx-auto rounded-xl border border-border/60 bg-background p-5 sm:p-6 flex items-start gap-3">
        <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-foreground leading-relaxed">
          {bi(
            'قطاعات تساعدك على البحث والمقارنة وطلب عروض الأسعار. الاتفاق النهائي وجودة التنفيذ يتمان بين العميل ومزود الخدمة.',
            'Qitaat helps with search, comparison and quote requests. The final agreement and execution quality are between the client and the provider.',
          )}
        </p>
      </div>
    </Section>
  );
};

export { TrustSection };
export default TrustSection;