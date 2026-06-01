import { useBi } from '@/components/common/Bilingual';
import imgContractors from '@/assets/home/audience-contractors.webp';
import { AudienceBlock, ROUTES } from './_shared';

const ForContractorsSection = () => {
  const bi = useBi();
  return (
    <AudienceBlock
      reverse
      image={imgContractors}
      imageAlt={bi('مخططات وعينات مقاطع ألمنيوم وخوذة على طاولة عمل', 'Plans, aluminum profile samples and a hard hat on a workbench')}
      badge={bi('للمقاولين والمكاتب الهندسية', 'For contractors & firms')}
      title={bi('وسّع شبكة مزوديك', 'Expand your provider network')}
      body={bi(
        'قطاعات تساعد المقاولين والمكاتب الهندسية على الوصول إلى ورش ومصانع ومزودي تنفيذ في قطاعات متعددة، لتسهيل البحث والمقارنة قبل اختيار الشريك المناسب للمشروع.',
        'Reach workshops, factories and execution partners across multiple sectors — to compare before picking the right partner.',
      )}
      bullets={[
        bi('مزودون حسب القطاع', 'Providers by sector'),
        bi('بحث حسب المدينة', 'Search by city'),
        bi('مناسب للمشاريع المتكررة', 'Works for recurring projects'),
        bi('بداية منظمة قبل التواصل', 'An organized start before outreach'),
      ]}
      cta={{ to: ROUTES.search, label: bi('ابحث عن مزودين', 'Find providers') }}
      tone="secondary"
    />
  );
};

export { ForContractorsSection };
export default ForContractorsSection;