import { useBi } from '@/components/common/Bilingual';
import imgProviders from '@/assets/home/audience-providers.webp';
import { AudienceBlock, ROUTES } from './_shared';

const ForProvidersSection = () => {
  const bi = useBi();
  return (
    <AudienceBlock
      image={imgProviders}
      imageAlt={bi('ورشة تصنيع ألمنيوم وحديد منظمة بإضاءة طبيعية', 'Organized aluminum and steel fabrication workshop with natural light')}
      badge={bi('لمزودي الخدمة', 'For service providers')}
      title={bi('اجعل منشأتك أسهل في الوصول', 'Make your business easier to find')}
      body={bi(
        'إذا كنت صاحب ورشة، مصنع، معرض، أو فريق تنفيذ، أنشئ ملفك في قطاعات ليعرف العملاء ماذا تقدم، أين تعمل، وكيف يمكنهم طلب خدماتك.',
        'Workshop, factory, showroom or install team — create your profile so clients know what you offer, where, and how to reach you.',
      )}
      bullets={[
        bi('ملف واضح لمنشأتك', 'A clear profile for your business'),
        bi('عرض الخدمات والصور', 'Show services and images'),
        bi('ظهور للعملاء والمقاولين', 'Visibility to clients and contractors'),
        bi('استقبال طلبات أكثر تنظيمًا', 'Receive more organized requests'),
      ]}
      cta={{ to: '/for-providers', label: bi('تعرف على ميزات المزودين', 'See provider features') }}
      small={bi('من يبحث عن خدماتك يجب أن يجدك بسهولة.', 'People looking for your services should find you easily.')}
      tone="accent"
    />
  );
};

export { ForProvidersSection };
export default ForProvidersSection;