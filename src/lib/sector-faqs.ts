import type { SectorSlug } from './sector-keywords';

export type FaqCategory =
  | 'pricing'
  | 'selection'
  | 'installation'
  | 'warranty'
  | 'maintenance'
  | 'general';

export interface SectorFaq {
  category: FaqCategory;
  q_ar: string;
  q_en: string;
  a_ar: string;
  a_en: string;
}

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, { ar: string; en: string }> = {
  pricing:      { ar: 'الأسعار والتكاليف', en: 'Pricing & costs' },
  selection:    { ar: 'الاختيار والمقارنة', en: 'Selection & comparison' },
  installation: { ar: 'التركيب والمواصفات', en: 'Installation & specs' },
  warranty:     { ar: 'الضمان والاعتماد',   en: 'Warranty & certification' },
  maintenance:  { ar: 'الصيانة والعمر',     en: 'Maintenance & lifespan' },
  general:      { ar: 'أسئلة عامة',          en: 'General questions' },
};

const ALUMINUM: SectorFaq[] = [
  {
    category: 'pricing',
    q_ar: 'كم سعر متر الألمنيوم في السعودية؟',
    q_en: 'How much does aluminum cost per square meter in Saudi Arabia?',
    a_ar: 'يتراوح سعر متر الألمنيوم بين 180 و650 ريال للمتر المربع حسب نوع البروفايل (اقتصادي، ثيرموبريك، ساكو) وسماكة الزجاج وطبيعة التركيب. اطلب 3 عروض من ورش موثّقة في قِطاعات للمقارنة.',
    a_en: 'Aluminum prices in Saudi Arabia range between SAR 180 and 650 per m² depending on profile type (economy, thermal break, premium), glazing thickness, and installation complexity. Request three quotes from verified Qitaat workshops to compare.',
  },
  {
    category: 'selection',
    q_ar: 'ما الفرق بين الألمنيوم العادي والثيرموبريك؟',
    q_en: 'What is the difference between standard aluminum and thermal break aluminum?',
    a_ar: 'الثيرموبريك يحتوي على فاصل بوليمري داخل البروفايل يقطع توصيل الحرارة، فيقلل فاتورة التكييف بنسبة قد تصل إلى 30٪ ويمنع التكاثف. مناسب لواجهات الفلل والمكاتب في المناطق الحارة.',
    a_en: 'Thermal break aluminum has a polymer insulator inside the profile that blocks heat transfer, cutting AC costs by up to 30% and preventing condensation. It is ideal for villa and office facades in hot climates.',
  },
  {
    category: 'selection',
    q_ar: 'كيف أختار أفضل ورشة ألمنيوم؟',
    q_en: 'How do I pick the best aluminum workshop?',
    a_ar: 'ابحث عن: شارة التحقق في قِطاعات، تقييم 4.5+ مع 20 مراجعة على الأقل، معرض أعمال حقيقي في نفس مدينتك، ضمان مكتوب لا يقل عن سنتين، والتزام بمواعيد التسليم.',
    a_en: 'Look for: a Qitaat verification badge, a 4.5+ rating with 20+ reviews, a real portfolio in your city, a written warranty of at least 2 years, and a track record of on-time delivery.',
  },
  {
    category: 'installation',
    q_ar: 'كم مدة تركيب نوافذ الألمنيوم؟',
    q_en: 'How long does aluminum window installation take?',
    a_ar: 'تركيب نوافذ فيلا متوسطة (15-20 نافذة) يستغرق 3-7 أيام عمل بعد جاهزية القياسات والتصنيع. التصنيع نفسه يأخذ من 10 إلى 21 يوم حسب ضغط الورشة ونوع البروفايل.',
    a_en: 'Installing 15-20 windows in a mid-sized villa takes 3-7 working days once measurements and fabrication are complete. Fabrication itself takes 10-21 days depending on workshop load and profile type.',
  },
  {
    category: 'warranty',
    q_ar: 'ما الضمان المعتاد على أعمال الألمنيوم؟',
    q_en: 'What is the typical warranty on aluminum work?',
    a_ar: 'الورش الموثّقة تقدم ضمان 2-5 سنوات على الإطار والتركيب، و10 سنوات على البروفايل من المصنع، وضمان منفصل على الإكسسوار والمحركات الكهربائية لا يقل عن سنة.',
    a_en: 'Verified workshops offer 2-5 years warranty on frames and installation, 10 years on the profile from the manufacturer, and a separate warranty of at least 1 year on hardware and motors.',
  },
  {
    category: 'maintenance',
    q_ar: 'كيف أحافظ على الألمنيوم لأطول فترة؟',
    q_en: 'How do I extend the lifespan of aluminum?',
    a_ar: 'نظّف البروفايل كل 3 أشهر بماء وصابون متعادل (تجنب المنظفات الحامضية)، تأكد من شفط فتحات التصريف، وادهن المفصلات بزيت خفيف سنوياً. يدوم الألمنيوم المعالج فوق 25 سنة.',
    a_en: 'Clean profiles every 3 months with water and neutral soap (avoid acidic cleaners), keep drainage holes clear, and lubricate hinges with light oil annually. Treated aluminum lasts over 25 years.',
  },
  {
    category: 'general',
    q_ar: 'هل يمكنني طلب عرض سعر مجاني للألمنيوم؟',
    q_en: 'Can I request a free aluminum quote?',
    a_ar: 'نعم، تواصل مع أي ورشة موثّقة في قِطاعات مباشرة عبر صفحتها للحصول على معاينة وعرض سعر مجاني وغير ملزم خلال 48 ساعة.',
    a_en: 'Yes — contact any verified workshop on Qitaat directly from its page to receive a free, no-obligation site visit and quote within 48 hours.',
  },
];

const IRON: SectorFaq[] = [
  {
    category: 'pricing',
    q_ar: 'كم تكلفة الحديد المشغول للمتر؟',
    q_en: 'How much does wrought iron cost per meter?',
    a_ar: 'يتراوح متر الحديد المشغول بين 120 و550 ريال حسب التصميم (سادة، ليزر، فورجيه)، السمك (1.5 - 3 مم)، ونوع الدهان (إلكتروستاتيك أو بويه فرن).',
    a_en: 'Wrought iron costs SAR 120-550 per linear meter depending on design (plain, laser-cut, forged), thickness (1.5-3 mm), and finish (electrostatic or oven paint).',
  },
  {
    category: 'selection',
    q_ar: 'حديد ليزر أم حديد فورجيه أيهما أفضل؟',
    q_en: 'Laser-cut iron or wrought iron — which is better?',
    a_ar: 'الليزر يعطي تصاميم دقيقة وحديثة وأقل وزناً ومناسب للأبواب والشبابيك. الفورجيه أثقل وأكثر فخامة ومناسب للأدراج والبوابات الكلاسيكية. السعر متقارب لكن الفورجيه أبطأ تصنيعاً.',
    a_en: 'Laser-cut delivers precise modern designs at lower weight, ideal for doors and windows. Forged iron is heavier and more luxurious, ideal for stairs and classical gates. Pricing is similar but forging takes longer to fabricate.',
  },
  {
    category: 'installation',
    q_ar: 'هل يحتاج تركيب البوابات لأساس خرساني؟',
    q_en: 'Do iron gates require a concrete foundation?',
    a_ar: 'البوابات السحاب والمتأرجحة فوق 3 أمتار تحتاج قاعدة خرسانية بعمق 60 سم على الأقل لتثبيت القوائم ومحرك السحب، أما البوابات الصغيرة فتثبَّت مباشرة على الجدران الحاملة.',
    a_en: 'Sliding and swing gates over 3 meters need a concrete foundation at least 60 cm deep to secure posts and the motor base. Smaller gates can be anchored directly to load-bearing walls.',
  },
  {
    category: 'warranty',
    q_ar: 'كم ضمان الحديد ضد الصدأ؟',
    q_en: 'What is the rust warranty on iron?',
    a_ar: 'الورش الموثّقة تضمن الدهان الإلكتروستاتيك ضد الصدأ من 3 إلى 7 سنوات، شريطة عدم الكشط الميكانيكي وغسل السطح بانتظام. سُمك الدهان لا يقل عن 80 ميكرون.',
    a_en: 'Verified workshops warranty electrostatic paint against rust for 3-7 years, provided the surface is not mechanically scratched and is washed regularly. Coating thickness should be at least 80 microns.',
  },
  {
    category: 'maintenance',
    q_ar: 'متى أحتاج إعادة دهان الحديد؟',
    q_en: 'When does iron need repainting?',
    a_ar: 'في المدن الساحلية (جدة، الدمام) كل 5-7 سنوات. في المدن الداخلية (الرياض، بريدة) كل 8-10 سنوات. افحص نقاط الصدأ السطحي سنوياً وعالجها فوراً ببرايمر مضاد للصدأ.',
    a_en: 'In coastal cities (Jeddah, Dammam) every 5-7 years. In inland cities (Riyadh, Buraidah) every 8-10 years. Inspect surface rust spots annually and treat them immediately with a rust-inhibiting primer.',
  },
  {
    category: 'general',
    q_ar: 'هل يمكن دمج الحديد مع الخشب أو الزجاج؟',
    q_en: 'Can iron be combined with wood or glass?',
    a_ar: 'نعم، الدمج شائع في الأبواب الرئيسية (حديد + خشب)، الأدراج (حديد + زجاج سيكوريت)، والشرفات. تأكد من تنسيق الورشة مع نجار وزجاج موثّقين لضمان توافق القياسات.',
    a_en: 'Yes — combinations are common in main doors (iron + wood), staircases (iron + tempered glass), and balconies. Make sure the workshop coordinates with verified wood and glass shops for accurate measurements.',
  },
];

const GLASS: SectorFaq[] = [
  {
    category: 'pricing',
    q_ar: 'كم سعر متر الزجاج السيكوريت؟',
    q_en: 'How much does tempered glass cost per square meter?',
    a_ar: 'سعر متر السيكوريت 10 مم يبدأ من 220 ريال، و12 مم من 290 ريال. الزجاج المزدوج (دبل جلاس) يبدأ من 380 ريال للمتر، والزجاج الذكي (PDLC) من 950 ريال.',
    a_en: 'Tempered glass starts at SAR 220 per m² for 10 mm and SAR 290 per m² for 12 mm. Double glazing starts at SAR 380 per m², and smart PDLC glass starts at SAR 950 per m².',
  },
  {
    category: 'selection',
    q_ar: 'متى أختار الزجاج المزدوج بدل المفرد؟',
    q_en: 'When should I pick double glazing over single?',
    a_ar: 'اختر المزدوج للواجهات المعرّضة للشمس المباشرة، الواجهات البحرية، أو الغرف القريبة من الشوارع المزدحمة. يقلل الحرارة الداخلة بنسبة 50٪ والضوضاء بنسبة 35٪ مقارنة بالزجاج المفرد.',
    a_en: 'Choose double glazing for sun-facing facades, seafront properties, or rooms near busy streets. It cuts incoming heat by ~50% and noise by ~35% compared to single glazing.',
  },
  {
    category: 'installation',
    q_ar: 'هل يمكن تركيب زجاج سيكوريت بدون إطار؟',
    q_en: 'Can tempered glass be installed without a frame?',
    a_ar: 'نعم، يُسمى التركيب الفريم لس (Frameless) وهو شائع في قواطع المكاتب وكبائن الاستحمام والشرفات. يتطلب سيكوريت 12 مم على الأقل، براكيت Spider stainless، وحساب أحمال الرياح بدقة.',
    a_en: 'Yes — frameless installation is common for office partitions, shower enclosures, and balconies. It requires 12 mm tempered glass minimum, stainless spider brackets, and accurate wind-load calculations.',
  },
  {
    category: 'warranty',
    q_ar: 'ما الضمان على الزجاج المزدوج ضد التغييم الداخلي؟',
    q_en: 'What is the warranty on double glazing against internal fogging?',
    a_ar: 'الزجاج المزدوج المعتمد بشهادة IGCC يأتي بضمان 5-10 سنوات ضد كسر العزل وتسرّب الرطوبة. اطلب شهادة الدفعة (Batch Certificate) من المورد قبل التركيب.',
    a_en: 'IGCC-certified double glazing carries a 5-10 year warranty against seal failure and moisture ingress. Request the batch certificate from the supplier before installation.',
  },
  {
    category: 'maintenance',
    q_ar: 'كيف أنظف الزجاج بدون خدوش؟',
    q_en: 'How do I clean glass without scratching it?',
    a_ar: 'استخدم ماء فاتر مع خل أبيض ومسّاحة مطاطية ناعمة (Squeegee). تجنّب الإسفنج الخشن والمنظفات الحامضية القوية، فهي تخدش الطبقة الواقية من الماء (Hydrophobic coating).',
    a_en: 'Use warm water with white vinegar and a soft rubber squeegee. Avoid abrasive sponges and strong acidic cleaners — they damage the hydrophobic protective coating.',
  },
  {
    category: 'general',
    q_ar: 'هل يمكن قص الزجاج السيكوريت بعد تصنيعه؟',
    q_en: 'Can tempered glass be cut after fabrication?',
    a_ar: 'لا. السيكوريت لا يقبل القص أو الثقب بعد المعالجة الحرارية لأنه ينكسر فوراً إلى آلاف القطع الصغيرة. يجب توفير القياسات النهائية بدقة قبل إرسال الطلب للمصنع.',
    a_en: 'No — tempered glass cannot be cut or drilled after heat treatment because it instantly shatters into thousands of small pieces. Provide exact final measurements before sending the order to the factory.',
  },
];

const WOOD: SectorFaq[] = [
  {
    category: 'pricing',
    q_ar: 'كم سعر متر الأبواب الخشبية؟',
    q_en: 'How much do wood doors cost per square meter?',
    a_ar: 'الأبواب الخشبية الداخلية تبدأ من 950 ريال للقطعة، الأبواب الرئيسية الصلبة (HDF + قشرة) من 2,400 ريال، والأبواب المصمتة (Solid wood) من 4,500 ريال شاملة الإطار والإكسسوار.',
    a_en: 'Interior wood doors start at SAR 950 per piece, solid main doors (HDF + veneer) at SAR 2,400, and full solid wood doors at SAR 4,500 including frame and hardware.',
  },
  {
    category: 'selection',
    q_ar: 'ما أفضل نوع خشب للمناخ السعودي؟',
    q_en: 'What wood type works best for Saudi climate?',
    a_ar: 'الزان والبلوط الأوروبي معالج حرارياً يقاوم الرطوبة والحرارة. تجنّب الصنوبر اللين في المناطق الساحلية. للأثاث الخارجي اختر الساج (Teak) أو الإيبي (Ipe) لمقاومتهما الطبيعية.',
    a_en: 'Heat-treated European beech and oak resist humidity and heat. Avoid soft pine in coastal areas. For outdoor furniture pick teak or ipe for their natural durability.',
  },
  {
    category: 'installation',
    q_ar: 'كم تستغرق صناعة باب خشبي مخصص؟',
    q_en: 'How long does a custom wood door take to make?',
    a_ar: 'الأبواب القياسية (HDF) جاهزة خلال 7-14 يوم. الأبواب المخصصة بقشرة طبيعية تأخذ 21-35 يوم. أبواب الـSolid wood المنحوتة قد تأخذ 45-60 يوم بما يشمل التجفيف والصنفرة.',
    a_en: 'Standard HDF doors are ready in 7-14 days. Custom doors with natural veneer take 21-35 days. Carved solid wood doors may take 45-60 days including drying and sanding.',
  },
  {
    category: 'warranty',
    q_ar: 'هل يضمن النجار الخشب ضد التشقق والاعوجاج؟',
    q_en: 'Does the carpenter warranty wood against cracking and warping?',
    a_ar: 'النجارون الموثّقون يضمنون عدم الاعوجاج والتشقق لمدة 2-3 سنوات بشرط استخدام الباب داخلياً وعدم تعرّضه لرطوبة أعلى من 60٪. الضمان لا يشمل التغيرات اللونية الطبيعية للقشرة.',
    a_en: 'Verified carpenters warranty against warping and cracking for 2-3 years, provided the door is used indoors and not exposed to humidity above 60%. The warranty does not cover natural color changes in veneer.',
  },
  {
    category: 'maintenance',
    q_ar: 'كيف أحافظ على لمعان الخشب؟',
    q_en: 'How do I keep wood looking polished?',
    a_ar: 'امسح بقطعة قطنية جافة أسبوعياً، استخدم ملمّع خشب مرة كل شهرين، وتجنّب التعرّض المباشر للشمس. للخدوش السطحية استخدم قلم تصحيح خشب بنفس درجة اللون.',
    a_en: 'Dust weekly with a dry cotton cloth, apply wood polish every two months, and avoid direct sunlight. For surface scratches use a wood touch-up pen matching the original tone.',
  },
  {
    category: 'general',
    q_ar: 'هل النجار يقدم تركيب أم تصنيع فقط؟',
    q_en: 'Do carpenters offer installation or only fabrication?',
    a_ar: 'معظم الورش الموثّقة في قِطاعات تقدم الخدمة الكاملة: قياس، تصميم، تصنيع، تركيب، وضبط المفصلات. اطلب توضيح ذلك في عرض السعر لتجنّب أي رسوم إضافية.',
    a_en: 'Most verified Qitaat workshops offer the full service: measurement, design, fabrication, installation, and hinge tuning. Confirm this in the quote to avoid extra fees.',
  },
];

const CABINETS: SectorFaq[] = [
  {
    category: 'pricing',
    q_ar: 'كم تكلفة مطبخ كامل في السعودية؟',
    q_en: 'How much does a full kitchen cost in Saudi Arabia?',
    a_ar: 'مطبخ متوسط 6 أمتار طولي يبدأ من 14,000 ريال (PVC)، 22,000 ريال (HPL/أكريليك)، و45,000 ريال (لاكيه أو خشب طبيعي) شاملاً الأبواب والكوارتز ولا يشمل الأجهزة.',
    a_en: 'A mid-size 6-meter kitchen starts at SAR 14,000 (PVC), SAR 22,000 (HPL/acrylic), and SAR 45,000 (lacquer or solid wood) including doors and quartz counters but excluding appliances.',
  },
  {
    category: 'selection',
    q_ar: 'PVC أم أكريليك أم لاكيه أيهما أفضل للمطبخ؟',
    q_en: 'PVC, acrylic, or lacquer — which is best for kitchens?',
    a_ar: 'PVC اقتصادي ومقاوم للماء لكنه يصفّر بالحرارة بعد سنوات. الأكريليك يعطي لمعان عالٍ وثبات لوني ممتاز. اللاكيه أفخم ويُرمم بسهولة لكنه أعلى سعراً وأطول تصنيعاً.',
    a_en: 'PVC is economical and waterproof but yellows over time. Acrylic delivers high gloss and excellent color stability. Lacquer is more luxurious and easy to refinish but costlier and slower to fabricate.',
  },
  {
    category: 'installation',
    q_ar: 'كم يستغرق تركيب المطبخ بعد التصنيع؟',
    q_en: 'How long does kitchen installation take after fabrication?',
    a_ar: 'تركيب المطبخ المتوسط يستغرق 2-4 أيام عمل: يوم لتركيب الكابينت السفلي والعلوي، يوم لتركيب الكوارتز، ويوم لربط الكهرباء والسباكة وضبط الأبواب.',
    a_en: 'Installing a mid-size kitchen takes 2-4 working days: one day for upper and lower cabinets, one day for quartz countertops, and one day for plumbing/electrical hookup and door alignment.',
  },
  {
    category: 'warranty',
    q_ar: 'ما ضمان الخزائن والمطابخ؟',
    q_en: 'What warranty applies to cabinets and kitchens?',
    a_ar: 'الورش الموثّقة تضمن الكابينت ضد التقشّر والاعوجاج لمدة 5 سنوات، المفصلات الهيدروليكية (Blum/Hettich) لمدى الحياة، وأسطح الكوارتز لمدة 10-15 سنة من الشركة المصنّعة.',
    a_en: 'Verified workshops warranty cabinets against peeling and warping for 5 years, hydraulic hinges (Blum/Hettich) for lifetime, and quartz surfaces for 10-15 years from the manufacturer.',
  },
  {
    category: 'maintenance',
    q_ar: 'كيف أنظّف خزائن الأكريليك بدون خدش؟',
    q_en: 'How do I clean acrylic cabinets without scratching?',
    a_ar: 'استخدم قطعة ميكروفايبر مبللة بماء وصابون أطباق متعادل. تجنّب الكلور، المذيبات، والإسفنج الخشن. للبقع الدهنية استخدم بخاخ منظف أكريليك مخصص.',
    a_en: 'Use a microfiber cloth dampened with water and neutral dish soap. Avoid chlorine, solvents, and abrasive sponges. For grease stains, use a dedicated acrylic cleaner spray.',
  },
  {
    category: 'general',
    q_ar: 'هل يمكنني تخصيص تصميم المطبخ بنفسي؟',
    q_en: 'Can I customize the kitchen design myself?',
    a_ar: 'نعم، الورش الموثّقة في قِطاعات تقدم خدمة تصميم 3D مجانية بعد المعاينة الأولى. يمكنك اختيار التخطيط، الألوان، الإكسسوار، ونوع الكوارتز قبل اعتماد العقد.',
    a_en: 'Yes — verified Qitaat workshops offer free 3D design after the initial visit. You can pick the layout, colors, hardware, and quartz type before signing the contract.',
  },
];

export const SECTOR_FAQS: Record<SectorSlug, SectorFaq[]> = {
  aluminum: ALUMINUM,
  iron: IRON,
  glass: GLASS,
  wood: WOOD,
  cabinets: CABINETS,
};

export function getSectorFaqs(slug: SectorSlug): SectorFaq[] {
  return SECTOR_FAQS[slug] ?? [];
}
