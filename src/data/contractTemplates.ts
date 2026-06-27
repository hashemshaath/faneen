/**
 * Static catalog for public contract template SEO pages.
 *
 * Extracted from `src/pages/ContractTemplates.tsx` (Audit Pass 2D —
 * Small Safe Cleanups). Content, slugs, sector routes, quote sector
 * keys, related lists and FAQ entries are preserved verbatim — no
 * route, JSON-LD, SEO or business logic change.
 */

export interface ContractTemplateInfo {
  slug: string;
  sector_ar: string;
  sector_en: string;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
  use_cases_ar: string[];
  use_cases_en: string[];
  scope_ar: string[];
  scope_en: string[];
  clauses_ar: string[];
  clauses_en: string[];
  attention_ar: string[];
  attention_en: string[];
  sector_route: string;
  related: string[];
  faq: Array<{ q_ar: string; q_en: string; a_ar: string; a_en: string }>;
  /** SEO quote sector slug consumed by `/quote?sector=` (see resolveQuoteSectorFromUrl). */
  quote_sector: 'aluminum' | 'steel' | 'wood' | 'glass' | 'stainless-steel';
}

const COMMON_FAQ: ContractTemplateInfo['faq'] = [
  {
    q_ar: 'ما فائدة قالب عقد تنفيذ الأعمال؟',
    q_en: 'What is the purpose of a work execution contract template?',
    a_ar: 'يساعد القالب الطرفين على توثيق نطاق العمل والتسليم والالتزامات بشكل واضح قبل بدء التنفيذ.',
    a_en: 'It helps both parties document the scope, deliverables and obligations clearly before execution starts.',
  },
  {
    q_ar: 'هل يمكن تعديل البنود؟',
    q_en: 'Can clauses be edited?',
    a_ar: 'نعم، البنود قابلة للتعديل أثناء إنشاء العقد الفعلي على المنصة وفق احتياج الطرفين.',
    a_en: 'Yes, clauses can be edited inside the actual contract draft on the platform to fit both parties.',
  },
  {
    q_ar: 'هل يغني القالب عن مراجعة قانونية؟',
    q_en: 'Does the template replace legal review?',
    a_ar: 'لا، القالب مرجع تعليمي عام، ويُنصح بمراجعة قانونية للعقود ذات القيمة المرتفعة.',
    a_en: 'No, the template is a general educational reference; legal review is recommended for high-value contracts.',
  },
  {
    q_ar: 'هل يمكن إنشاء عقد بعد طلب عرض سعر؟',
    q_en: 'Can a contract be created after a quote request?',
    a_ar: 'نعم، يمكن تحويل عرض السعر المقبول إلى عقد كامل عبر تدفق إنشاء العقد على المنصة.',
    a_en: 'Yes, an accepted quote can be turned into a full contract via the platform contract creation flow.',
  },
];

export const CONTRACT_TEMPLATES: ContractTemplateInfo[] = [
  {
    slug: 'aluminum-glass',
    sector_ar: 'الألمنيوم والزجاج',
    sector_en: 'Aluminum & Glass',
    title_ar: 'قالب عقد تنفيذ أعمال الألمنيوم والزجاج',
    title_en: 'Aluminum & Glass Works Contract Template',
    desc_ar: 'قالب عام لتوثيق نطاق وتسليم أعمال الألمنيوم والزجاج للمشاريع السكنية والتجارية بشكل احترافي.',
    desc_en: 'A general template to document the scope and delivery of aluminum and glass works for residential and commercial projects.',
    use_cases_ar: ['أبواب وشبابيك ألمنيوم', 'واجهات زجاجية', 'قواطع زجاج مكتبية', 'مظلات ألمنيوم'],
    use_cases_en: ['Aluminum doors & windows', 'Glass facades', 'Office glass partitions', 'Aluminum canopies'],
    scope_ar: ['المعاينة والمقاسات', 'التوريد والتصنيع', 'التركيب والاختبار', 'الضمان وما بعد التسليم'],
    scope_en: ['Site visit & measurements', 'Supply & fabrication', 'Installation & testing', 'Warranty & handover'],
    clauses_ar: ['تعريف نطاق العمل والمواصفات', 'الجدول الزمني ومراحل التسليم', 'التزامات الطرفين', 'الضمان وفترة الصيانة', 'آلية تعديل الأعمال'],
    clauses_en: ['Scope & specifications', 'Timeline & delivery phases', 'Obligations of both parties', 'Warranty & maintenance period', 'Change order mechanism'],
    attention_ar: ['اعتماد المقاسات قبل التصنيع', 'تحديد نوع الزجاج وسماكته', 'توضيح أعمال السيليكون والعزل', 'تحديد جهة استلام التسليم النهائي'],
    attention_en: ['Approve measurements before fabrication', 'Define glass type & thickness', 'Clarify silicone & sealing scope', 'Designate the final handover party'],
    sector_route: '/sectors/aluminum',
    related: ['facades', 'kitchens'],
    faq: COMMON_FAQ,
    quote_sector: 'aluminum',
  },
  {
    slug: 'steel-metal',
    sector_ar: 'الحديد والمعادن',
    sector_en: 'Steel & Metal',
    title_ar: 'قالب عقد أعمال الحديد والمعادن',
    title_en: 'Steel & Metal Works Contract Template',
    desc_ar: 'قالب عام لأعمال الحديد المشغول والهياكل المعدنية والدرابزين والأبواب الحديدية.',
    desc_en: 'A general template covering wrought iron, steel structures, railings and metal doors.',
    use_cases_ar: ['أبواب وبوابات حديد', 'درابزين وسلالم', 'هياكل ومظلات', 'حمايات شبابيك'],
    use_cases_en: ['Steel doors & gates', 'Railings & staircases', 'Structures & canopies', 'Window grilles'],
    scope_ar: ['الرسومات والاعتماد', 'التصنيع بالورشة', 'الدهان والمعالجة', 'التركيب والتسليم'],
    scope_en: ['Shop drawings & approval', 'Workshop fabrication', 'Painting & treatment', 'Installation & handover'],
    clauses_ar: ['وصف المواد والسماكات', 'الرسومات التنفيذية', 'مراحل التسليم والدفع', 'الضمان ضد الصدأ', 'مسؤولية النقل والتركيب'],
    clauses_en: ['Material & thickness specs', 'Shop drawings', 'Delivery & payment milestones', 'Anti-rust warranty', 'Transport & installation responsibility'],
    attention_ar: ['اعتماد الدهان ولون النهاية', 'تحديد جودة اللحام', 'التأكد من مطابقة الأبعاد', 'تحديد بنود السلامة'],
    attention_en: ['Approve paint & finish color', 'Define weld quality', 'Verify dimensional accuracy', 'Specify safety requirements'],
    sector_route: '/sectors/steel',
    related: ['stainless-railings', 'aluminum-glass'],
    faq: COMMON_FAQ,
    quote_sector: 'steel',
  },
  {
    slug: 'wood-works',
    sector_ar: 'الأخشاب والنجارة',
    sector_en: 'Wood & Carpentry',
    title_ar: 'قالب عقد أعمال الأخشاب والنجارة',
    title_en: 'Wood & Carpentry Works Contract Template',
    desc_ar: 'قالب عام لأعمال الأبواب الخشبية والأثاث والديكورات الداخلية.',
    desc_en: 'A general template for wooden doors, furniture and interior decoration works.',
    use_cases_ar: ['أبواب خشب', 'دواليب وغرف ملابس', 'ديكورات داخلية', 'أثاث مفصّل'],
    use_cases_en: ['Wooden doors', 'Wardrobes & closets', 'Interior decor', 'Custom furniture'],
    scope_ar: ['تصميم واعتماد', 'تجهيز المصنع', 'النقل والتركيب', 'اللمسات الأخيرة'],
    scope_en: ['Design & approval', 'Factory preparation', 'Delivery & installation', 'Final finishing'],
    clauses_ar: ['نوع الخشب والقشرة', 'الإكسسوارات والمفصلات', 'دهان وتشطيب', 'الضمان ضد التقوس', 'مدة التسليم'],
    clauses_en: ['Wood & veneer type', 'Accessories & hinges', 'Paint & finishing', 'Anti-warp warranty', 'Delivery period'],
    attention_ar: ['الالتزام بالألوان المعتمدة', 'حماية الأرضيات أثناء التركيب', 'مطابقة المقاسات للموقع', 'توثيق العيوب قبل الاستلام'],
    attention_en: ['Stick to approved colors', 'Protect flooring during installation', 'Match measurements to the site', 'Document defects before acceptance'],
    sector_route: '/sectors/wood',
    related: ['kitchens', 'aluminum-glass'],
    faq: COMMON_FAQ,
    quote_sector: 'wood',
  },
  {
    slug: 'kitchens',
    sector_ar: 'المطابخ',
    sector_en: 'Kitchens',
    title_ar: 'قالب عقد تصنيع وتركيب المطابخ',
    title_en: 'Kitchens Manufacturing & Installation Contract Template',
    desc_ar: 'قالب عام لتصنيع وتركيب المطابخ بمختلف المواد والأنماط.',
    desc_en: 'A general template for the manufacturing and installation of kitchens across materials and styles.',
    use_cases_ar: ['مطابخ ألمنيوم', 'مطابخ خشب', 'مطابخ بولي لاك', 'مطابخ كوارتز'],
    use_cases_en: ['Aluminum kitchens', 'Wood kitchens', 'Polylac kitchens', 'Quartz kitchens'],
    scope_ar: ['المعاينة والتصميم', 'تجهيز الكاونترات', 'التركيب والربط', 'التشغيل والتسليم'],
    scope_en: ['Site visit & design', 'Countertop preparation', 'Installation & hookup', 'Commissioning & handover'],
    clauses_ar: ['نوع الكاونتر والأبواب', 'الإكسسوارات المعتمدة', 'الربط الكهربائي والسباكة', 'الضمان والصيانة', 'جدول التركيب'],
    clauses_en: ['Counter & door type', 'Approved accessories', 'Electrical & plumbing hookup', 'Warranty & maintenance', 'Installation schedule'],
    attention_ar: ['اعتماد التصميم ثلاثي الأبعاد', 'مطابقة فتحات الأجهزة', 'مواقع الإنارة والكهرباء', 'حماية الكاونتر أثناء النقل'],
    attention_en: ['Approve the 3D design', 'Match appliance cut-outs', 'Lighting & electrical positions', 'Protect the counter during transport'],
    sector_route: '/sectors/wood',
    related: ['wood-works', 'aluminum-glass'],
    faq: COMMON_FAQ,
    quote_sector: 'wood',
  },
  {
    slug: 'facades',
    sector_ar: 'الواجهات',
    sector_en: 'Facades',
    title_ar: 'قالب عقد أعمال الواجهات الزجاجية والكلادينج',
    title_en: 'Glass Facades & Cladding Contract Template',
    desc_ar: 'قالب عام لأعمال الواجهات الزجاجية والكلادينج للمنشآت التجارية والمكاتب.',
    desc_en: 'A general template for glass facades and cladding for commercial buildings and offices.',
    use_cases_ar: ['واجهات سترة', 'كلادينج خارجي', 'سكاي لايت', 'واجهات سبايدر'],
    use_cases_en: ['Curtain wall', 'External cladding', 'Skylights', 'Spider facades'],
    scope_ar: ['الاستلام والمسح', 'التصنيع', 'التركيب على ارتفاع', 'اختبار التسريب'],
    scope_en: ['Survey & handover', 'Fabrication', 'High-level installation', 'Leak testing'],
    clauses_ar: ['نظام الواجهة المعتمد', 'متطلبات السلامة على ارتفاع', 'اختبارات الأداء والتسريب', 'الضمان على العزل', 'مراحل التسليم'],
    clauses_en: ['Approved facade system', 'Working-at-height safety', 'Performance & leak testing', 'Sealing warranty', 'Delivery milestones'],
    attention_ar: ['الالتزام بمعايير السلامة', 'اعتماد عينة الزجاج والألوان', 'التنسيق مع المقاول الرئيسي', 'التأكد من تصاريح الموقع'],
    attention_en: ['Comply with safety standards', 'Approve glass & color sample', 'Coordinate with main contractor', 'Confirm site permits'],
    sector_route: '/sectors/glass',
    related: ['aluminum-glass', 'steel-metal'],
    faq: COMMON_FAQ,
    quote_sector: 'glass',
  },
  {
    slug: 'stainless-railings',
    sector_ar: 'الستانلس ستيل والدرابزين',
    sector_en: 'Stainless Steel & Railings',
    title_ar: 'قالب عقد أعمال الستانلس ستيل والدرابزين',
    title_en: 'Stainless Steel & Railings Contract Template',
    desc_ar: 'قالب عام لأعمال الستانلس ستيل والدرابزين للمطاعم والفلل والمنشآت.',
    desc_en: 'A general template for stainless steel and railing works in restaurants, villas and facilities.',
    use_cases_ar: ['درابزين سلالم', 'حواجز شرفات', 'تجهيزات مطاعم', 'تجهيزات مطابخ مهنية'],
    use_cases_en: ['Stair railings', 'Balcony barriers', 'Restaurant fittings', 'Professional kitchen fittings'],
    scope_ar: ['المعاينة', 'التصنيع بالورشة', 'التركيب الموقعي', 'التلميع والتسليم'],
    scope_en: ['Site visit', 'Workshop fabrication', 'On-site installation', 'Polishing & handover'],
    clauses_ar: ['درجة الستانلس (304/316)', 'سماكة الأنابيب', 'نوع التثبيت', 'الضمان ضد التآكل', 'تشطيب اللمعان أو الساتان'],
    clauses_en: ['Stainless grade (304/316)', 'Tube thickness', 'Fixing method', 'Anti-corrosion warranty', 'Mirror/satin finish'],
    attention_ar: ['تحديد الدرجة المناسبة للبيئة', 'اعتماد عينة اللحام', 'متطلبات السلامة للدرابزين', 'تنظيف اللحامات بعد التركيب'],
    attention_en: ['Pick the right grade for the environment', 'Approve weld sample', 'Railing safety requirements', 'Clean welds after installation'],
    sector_route: '/sectors/stainless-steel',
    related: ['steel-metal', 'facades'],
    faq: COMMON_FAQ,
    quote_sector: 'stainless-steel',
  },
];