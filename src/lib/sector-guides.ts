/**
 * Curated buyer-guide content per sector. Used by /sectors/:slug to render
 * SEO-rich "how to choose" content without depending on the blog table.
 *
 * Each guide gets HowTo JSON-LD on the page so Google can show rich results.
 */
import type { SectorSlug } from './sector-keywords';

export interface SectorGuide {
  slug: string;            // url-safe id, used as anchor
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  steps_ar: string[];      // 3-5 short steps
  steps_en: string[];
}

export const SECTOR_GUIDES: Record<SectorSlug, SectorGuide[]> = {
  aluminum: [
    {
      slug: 'choose-aluminum-windows',
      title_ar: 'كيف تختار شبابيك ألمنيوم عازلة للحرارة والضوضاء',
      title_en: 'How to choose thermal & sound-insulated aluminum windows',
      excerpt_ar: 'دليل عملي للمقارنة بين قطاعات الألمنيوم العازل (Thermal Break) وسماكة الزجاج المزدوج وأنواع الأختام المطاطية.',
      excerpt_en: 'A practical guide to comparing thermal-break aluminum profiles, double-glazing thickness, and gasket types.',
      steps_ar: [
        'حدّد جهة الواجهة وكمية التعرض للشمس لاختيار سماكة القطاع.',
        'اطلب قطاع Thermal Break ≥ 24 مم لخفض انتقال الحرارة.',
        'اختر زجاج مزدوج 6+12+6 مم مع أرغون لعزل الصوت.',
        'تحقق من شهادات الموردين (SASO، CE) قبل التوقيع.',
        'اطلب ضماناً مكتوباً لا يقل عن 5 سنوات على القطاع و3 على التركيب.',
      ],
      steps_en: [
        'Map the facade orientation and sun exposure to size the profile.',
        'Specify a thermal-break profile ≥ 24 mm for low heat transfer.',
        'Pick double glazing 6+12+6 mm with argon for acoustic insulation.',
        'Verify supplier certifications (SASO, CE) before signing.',
        'Require a written warranty: 5+ years on profile, 3+ on installation.',
      ],
    },
    {
      slug: 'aluminum-cladding-spec',
      title_ar: 'مواصفات الكلادينج الآمن: ACP، ألمنيوم صلب، PVDF',
      title_en: 'Safe cladding specs: ACP, solid aluminum & PVDF coatings',
      excerpt_ar: 'كل ما تحتاجه عن سماكة اللوح، نوع الحشو المقاوم للحريق (FR/A2)، ودرجة طلاء PVDF لمواجهات لا تبهت.',
      excerpt_en: 'Sheet thickness, fire-rated core types (FR/A2), and PVDF coating grades for facades that resist fading.',
      steps_ar: [
        'استخدم لوحاً بسماكة 4 مم وقشرة ألمنيوم 0.5 مم على الأقل.',
        'اطلب حشواً مقاوماً للحريق درجة A2 للأبراج فوق 18 متراً.',
        'اختر طلاء PVDF Kynar 500 لضمان 15 سنة ضد البهتان.',
        'تأكد من نظام التثبيت الخفي وتصريف المياه خلف اللوح.',
      ],
      steps_en: [
        'Use 4 mm panels with at least 0.5 mm aluminum skin.',
        'Specify A2 fire-rated core for buildings above 18 m.',
        'Pick PVDF Kynar 500 coating for 15-year fade warranty.',
        'Confirm concealed fixing and back-of-panel drainage path.',
      ],
    },
    {
      slug: 'pergolas-sizing',
      title_ar: 'تصميم برجولات الألمنيوم: المسافات والأحمال والتصريف',
      title_en: 'Designing aluminum pergolas: spans, loads & drainage',
      excerpt_ar: 'أساسيات حساب البحور القصوى، تصريف الأمطار، وحماية المحركات الكهربائية في البرجولات الذكية.',
      excerpt_en: 'Basics of maximum spans, rainwater drainage, and motor protection for smart aluminum pergolas.',
      steps_ar: [
        'لا تتجاوز بحراً حراً 4×6 م دون أعمدة دعم وسطية.',
        'صمّم ميلاناً 2% للريش لتصريف مياه الأمطار.',
        'اختر محركات IP65 لمقاومة الرطوبة والغبار.',
      ],
      steps_en: [
        'Do not exceed a 4×6 m clear span without mid columns.',
        'Design a 2% slope for the louvres to drain rainwater.',
        'Pick IP65 motors to resist humidity and dust.',
      ],
    },
  ],

  iron: [
    {
      slug: 'iron-doors-security',
      title_ar: 'أبواب حديد آمنة: السماكة والأقفال والمعالجات ضد الصدأ',
      title_en: 'Secure iron doors: thickness, locks & anti-rust treatments',
      excerpt_ar: 'كيف تختار سماكة الصاج، نوع القفل المعتمد، والمعالجة الجلفنة قبل الدهان.',
      excerpt_en: 'How to pick steel sheet thickness, certified lock grade, and galvanizing prep before paint.',
      steps_ar: [
        'استخدم صاجاً بسماكة 1.5–2 مم للأبواب الخارجية.',
        'اختر قفلاً متعدد النقاط (3 نقاط على الأقل) بشهادة EN 1303.',
        'اطلب جلفنة بالغمس الساخن قبل أي طبقة دهان.',
        'اختر دهان إلكتروستاتيك مفروم في فرن 200°م لمتانة أعلى.',
      ],
      steps_en: [
        'Use 1.5–2 mm steel sheet for exterior doors.',
        'Pick a multipoint lock (3+ points) with EN 1303 certification.',
        'Specify hot-dip galvanizing before any paint layer.',
        'Use electrostatic powder coating cured at 200°C for durability.',
      ],
    },
    {
      slug: 'railings-codes',
      title_ar: 'درابزينات حديد مطابقة لكود البناء السعودي',
      title_en: 'Iron railings compliant with the Saudi Building Code',
      excerpt_ar: 'الارتفاعات والمسافات بين الأعمدة وحساب الأحمال الجانبية وفق SBC 201.',
      excerpt_en: 'Heights, baluster spacing, and lateral-load calculations per SBC 201.',
      steps_ar: [
        'الحد الأدنى للارتفاع 110 سم في الأدوار العلوية.',
        'لا تتجاوز المسافة بين الأعمدة الرأسية 10 سم لمنع مرور الأطفال.',
        'صمّم لتحمّل دفع جانبي 1.5 كيلونيوتن/متر طولي.',
      ],
      steps_en: [
        'Minimum height 110 cm on upper floors.',
        'Vertical baluster spacing must not exceed 10 cm.',
        'Design for a 1.5 kN/m lateral load along the rail.',
      ],
    },
    {
      slug: 'hangars-spans',
      title_ar: 'هناجر حديد: اختيار البحور والعزل الحراري',
      title_en: 'Steel hangars: choosing spans and thermal insulation',
      excerpt_ar: 'مقارنة بين هياكل I-Beam وLight Gauge، وأنواع ألواح الساندويتش العازلة.',
      excerpt_en: 'Comparison between I-Beam and Light Gauge structures, and insulating sandwich panel types.',
      steps_ar: [
        'استخدم I-Beam للبحور > 20 م، وLight Gauge لما دونها.',
        'اختر ساندويتش بانل بكثافة فوم ≥ 40 كغ/م³ للعزل.',
        'احسب أحمال الرياح المحلية قبل اعتماد التصميم.',
      ],
      steps_en: [
        'Use I-Beams for spans > 20 m; light gauge for shorter spans.',
        'Pick sandwich panels with foam density ≥ 40 kg/m³.',
        'Compute local wind loads before approving the design.',
      ],
    },
  ],

  glass: [
    {
      slug: 'tempered-vs-laminated',
      title_ar: 'سيكوريت أم لامينيت؟ متى تستخدم كل نوع',
      title_en: 'Tempered vs laminated glass: when to use each',
      excerpt_ar: 'الفروق في السلامة والمتانة والصوت بين الزجاج المقسّى والمصفّح، وحالات الاستخدام الموصى بها.',
      excerpt_en: 'Safety, strength, and acoustic differences between tempered and laminated glass with use-case picks.',
      steps_ar: [
        'استخدم السيكوريت في الأبواب والقواطع لكسر آمن.',
        'استخدم اللامينيت في الواجهات العلوية والسكاي لايت لمنع السقوط.',
        'اطلب طبقة PVB ≥ 0.76 مم للعزل الصوتي الفعّال.',
      ],
      steps_en: [
        'Use tempered for doors and partitions — safe break pattern.',
        'Use laminated for overhead glazing & skylights to prevent falls.',
        'Specify PVB interlayer ≥ 0.76 mm for effective sound insulation.',
      ],
    },
    {
      slug: 'double-glazing-uvalue',
      title_ar: 'الزجاج العازل: قراءة قيمة U-Value و Low-E',
      title_en: 'Insulated glass: reading U-Value and Low-E ratings',
      excerpt_ar: 'كيف تقرأ مواصفات الزجاج المزدوج وتختار الطلاء العاكس للحرارة المناسب لمناخ الخليج.',
      excerpt_en: 'How to read double-glazing specs and pick the right Low-E coating for Gulf climate.',
      steps_ar: [
        'اختر U-Value ≤ 1.8 W/m²K للحد من فقد التبريد.',
        'اطلب طلاء Low-E مع غاز أرغون داخل الفجوة.',
        'تحقق من ختم Spacer Warm Edge لمنع التكثيف.',
      ],
      steps_en: [
        'Pick U-Value ≤ 1.8 W/m²K to limit cooling loss.',
        'Specify Low-E coating with argon fill in the gap.',
        'Confirm Warm Edge spacer to prevent condensation.',
      ],
    },
    {
      slug: 'shower-partitions',
      title_ar: 'حواجز زجاج الحمامات: التركيب الآمن والمنزلق',
      title_en: 'Shower glass partitions: safe sliding installations',
      excerpt_ar: 'سماكة الزجاج، أنظمة Hinges مقابل المنزلق، وطلاء مقاوم لبقع الماء.',
      excerpt_en: 'Glass thickness, hinge vs sliding systems, and water-stain-resistant coatings.',
      steps_ar: [
        'استخدم زجاج سيكوريت 8–10 مم للحواجز المرتفعة.',
        'اختر منظومة منزلقة بمنحنى Soft-Close.',
        'اطلب طلاء Easy-Clean لمنع تكلس الماء.',
      ],
      steps_en: [
        'Use 8–10 mm tempered glass for tall partitions.',
        'Pick sliding systems with soft-close mechanism.',
        'Specify Easy-Clean coating to prevent limescale.',
      ],
    },
  ],

  wood: [
    {
      slug: 'wood-doors-types',
      title_ar: 'أبواب الخشب الداخلية: HDF، MDF، خشب طبيعي',
      title_en: 'Interior wood doors: HDF, MDF & solid wood',
      excerpt_ar: 'الفروق في المتانة والصوت والتكلفة بين أنواع أبواب الخشب الشائعة.',
      excerpt_en: 'Durability, acoustics, and cost differences between common wood door types.',
      steps_ar: [
        'استخدم HDF للغرف الجافة والميزانية المحدودة.',
        'اختر خشب طبيعي للأبواب الرئيسية والمداخل.',
        'اطلب حشوة Honeycomb للعزل الصوتي بين الغرف.',
      ],
      steps_en: [
        'Use HDF for dry rooms and tighter budgets.',
        'Pick solid wood for main entrances.',
        'Specify honeycomb core for room-to-room acoustic insulation.',
      ],
    },
    {
      slug: 'parquet-flooring',
      title_ar: 'باركيه وأرضيات خشبية: معالج، طبيعي، أم لامينيت؟',
      title_en: 'Parquet & wood floors: engineered, solid, or laminate?',
      excerpt_ar: 'مقارنة بين الأنواع من حيث المتانة، تحمّل الرطوبة، وإمكانية الصنفرة وإعادة الطلاء.',
      excerpt_en: 'Comparison by durability, moisture tolerance, and refinishing potential.',
      steps_ar: [
        'الخشب الطبيعي يدوم 25+ سنة لكنه يتطلب رطوبة مستقرة.',
        'الخشب المعالج (Engineered) أنسب للمناخ الخليجي.',
        'لامينيت AC4 خيار اقتصادي مقاوم للخدش.',
      ],
      steps_en: [
        'Solid wood lasts 25+ years but needs stable humidity.',
        'Engineered wood is best suited to Gulf climate.',
        'AC4 laminate is an economical scratch-resistant option.',
      ],
    },
  ],

  cabinets: [
    {
      slug: 'kitchen-aluminum-vs-wood',
      title_ar: 'مطابخ الألمنيوم مقابل الخشب: أيهما أفضل لك؟',
      title_en: 'Aluminum vs wooden kitchens: which suits you better?',
      excerpt_ar: 'تحليل المتانة، مقاومة الرطوبة، التكلفة، وسهولة الصيانة لكل نوع.',
      excerpt_en: 'Durability, moisture resistance, cost, and maintenance analysis for each type.',
      steps_ar: [
        'الألمنيوم لا يتأثر بالرطوبة ومناسب للمطابخ المفتوحة.',
        'الخشب يعطي دفئاً جمالياً لكنه يحتاج تهوية وعزلاً جيداً.',
        'قارن الضمان: ألمنيوم 10 سنوات، خشب MDF 5 سنوات.',
      ],
      steps_en: [
        'Aluminum is unaffected by humidity — ideal for open kitchens.',
        'Wood feels warmer but needs good ventilation and sealing.',
        'Compare warranties: aluminum 10 years, MDF wood 5 years.',
      ],
    },
    {
      slug: 'countertop-quartz-corian',
      title_ar: 'أسطح المطابخ: كوارتز، كوريان، أم جرانيت؟',
      title_en: 'Kitchen countertops: quartz, Corian, or granite?',
      excerpt_ar: 'مقارنة فنية بين الأسطح من حيث المسامية، الخدش، والحرارة.',
      excerpt_en: 'Technical comparison: porosity, scratch resistance, and heat tolerance.',
      steps_ar: [
        'الكوارتز غير مسامي ومقاوم للبقع — الأفضل عملياً.',
        'الكوريان يصلح للأشكال المنحنية والوصلات اللامرئية.',
        'الجرانيت طبيعي لكن يحتاج تشميعاً دورياً.',
      ],
      steps_en: [
        'Quartz is non-porous and stain-resistant — best practical choice.',
        'Corian works for curved shapes and seamless joints.',
        'Granite is natural but needs periodic sealing.',
      ],
    },
    {
      slug: 'wardrobes-walkin',
      title_ar: 'تصميم دريسنج روم: أبعاد، إضاءة، وتقسيمات',
      title_en: 'Walk-in wardrobe design: dimensions, lighting & layout',
      excerpt_ar: 'الحدود الدنيا للممرات، إضاءة LED بدون ظلال، وتقسيمات حسب نوع الملابس.',
      excerpt_en: 'Minimum aisle widths, shadow-free LED lighting, and zoning by garment type.',
      steps_ar: [
        'احتفظ بممر داخلي لا يقل عن 90 سم بين الجانبين.',
        'استخدم شريط LED 4000K داخل كل عمود تخزين.',
        'خصّص ارتفاع 180 سم للفساتين الطويلة، 100 سم للقمصان.',
      ],
      steps_en: [
        'Keep an interior aisle of at least 90 cm between sides.',
        'Use 4000K LED strips inside each storage column.',
        'Reserve 180 cm height for long dresses, 100 cm for shirts.',
      ],
    },
  ],
};

export const getSectorGuides = (slug: SectorSlug): SectorGuide[] =>
  SECTOR_GUIDES[slug] ?? [];