import { useBi } from '@/components/common/Bilingual';
import imgClients from '@/assets/home/audience-clients.webp';
import { AudienceBlock, ROUTES } from './_shared';

const ForClientsSection = () => {
  const bi = useBi();
  return (
    <AudienceBlock
      image={imgClients}
      imageAlt={bi('منزل عصري بأبواب زجاجية ألمنيوم وخزائن خشبية', 'Modern home with aluminum glass doors and wooden cabinetry')}
      badge={bi('للعملاء', 'For clients')}
      title={bi('لديك مشروع وتحتاج مزود خدمة؟', 'Have a project and need a provider?')}
      body={bi(
        'اكتب ما تحتاجه بوضوح، وأرسل طلبك لمزودين مناسبين حسب القطاع والمدينة. بدل أن تبدأ من الصفر، ابدأ من مكان يجمع لك الخيارات.',
        'Describe what you need, then send it to providers by sector and city. Start from a place that gathers your options.',
      )}
      bullets={[
        bi('مناسب للأفراد والشركات', 'For individuals and companies'),
        bi('طلبات أوضح للمزودين', 'Clearer requests for providers'),
        bi('خيارات متعددة للمقارنة', 'Multiple options to compare'),
        bi('توفير وقت البحث', 'Less time spent searching'),
      ]}
      cta={{ to: ROUTES.quote, label: bi('اطلب عرض سعر الآن', 'Request a quote') }}
      tone="primary"
    />
  );
};

export { ForClientsSection };
export default ForClientsSection;