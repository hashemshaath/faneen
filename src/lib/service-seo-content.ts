/**
 * Long-form SEO content per service slug.
 * Powers the rich body (intro, sections, real case studies, tips) on /services/:slug.
 * Bilingual (ar/en). Keep H2/H3 hierarchy semantic for search engines.
 */
import catAluminum from '@/assets/cat-aluminum.webp';
import catGlass from '@/assets/cat-glass.webp';
import catIron from '@/assets/cat-iron.webp';
import catWood from '@/assets/cat-wood.webp';
import type { SectorSlug } from './sector-keywords';

export interface ContentSection {
  h2_ar: string;
  h2_en: string;
  body_ar: string;
  body_en: string;
  subsections?: { h3_ar: string; h3_en: string; body_ar: string; body_en: string }[];
}

export interface CaseStudy {
  title_ar: string;
  title_en: string;
  city_ar: string;
  city_en: string;
  problem_ar: string;
  problem_en: string;
  solution_ar: string;
  solution_en: string;
  outcome_ar: string;
  outcome_en: string;
}

export interface ServiceContent {
  intro_ar: string;
  intro_en: string;
  sections: ContentSection[];
  cases: CaseStudy[];
  tips_ar: string[];
  tips_en: string[];
  mistakes_ar: string[];
  mistakes_en: string[];
}

export const SECTOR_HERO: Record<SectorSlug, string> = {
  aluminum: catAluminum,
  iron: catIron,
  glass: catGlass,
  wood: catWood,
  cabinets: catWood,
};

const C = (
  intro_ar: string, intro_en: string,
  sections: ContentSection[],
  cases: CaseStudy[],
  tips_ar: string[], tips_en: string[],
  mistakes_ar: string[], mistakes_en: string[],
): ServiceContent => ({ intro_ar, intro_en, sections, cases, tips_ar, tips_en, mistakes_ar, mistakes_en });

export const SERVICE_CONTENT: Record<string, ServiceContent> = {
  'aluminum-windows': C(
    'تركيب شبابيك الألمنيوم في السعودية اليوم لم يعد رفاهية بل ضرورة لتقليل فاتورة الكهرباء وتحسين العزل الصوتي والحراري. يختلف سعر متر شباك الألمنيوم بحسب نوع القطاع (عادي أو حراري ثيرموبريك)، نوع الزجاج (مفرد، مزدوج، مصفّح)، وكفاءة التركيب. هذا الدليل يشرح ما تحتاج معرفته قبل طلب عرض سعر من ورشة الألمنيوم.',
    'Installing aluminum windows in Saudi Arabia is no longer a luxury — it cuts power bills and improves thermal & acoustic insulation. Prices per m² vary by profile (standard vs thermal-break), glazing type (single, double, laminated), and installation quality. This guide explains what to check before requesting a quote.',
    [
      {
        h2_ar: 'أنواع قطاعات الألمنيوم وفروقها',
        h2_en: 'Aluminum profile types and differences',
        body_ar: 'القطاع هو الهيكل المعدني الذي يحمل الزجاج. تختلف القطاعات في السماكة (1.4–2.0مم)، الطول الانسيابي، وقدرة العزل الحراري.',
        body_en: 'The profile is the metal frame holding the glass. Profiles vary by thickness (1.4–2.0 mm), span, and thermal performance.',
        subsections: [
          { h3_ar: 'القطاع العادي', h3_en: 'Standard profile',
            body_ar: 'مناسب للمستودعات والملاحق؛ تكلفته أقل بـ25–40% لكنه يسمح بتسرّب الحرارة.',
            body_en: 'Suited for storage and annexes; 25–40% cheaper but transfers heat.' },
          { h3_ar: 'القطاع الحراري (ثيرموبريك)', h3_en: 'Thermal-break (ThermoBreak)',
            body_ar: 'يحتوي شريط بولي أميد يفصل الجزء الداخلي عن الخارجي ويقلل انتقال الحرارة حتى 35%.',
            body_en: 'Contains a polyamide strip separating inner/outer aluminum, cutting heat transfer by up to 35%.' },
        ],
      },
      {
        h2_ar: 'أنواع الزجاج المناسب للشبابيك',
        h2_en: 'Glazing options for windows',
        body_ar: 'اختيار الزجاج لا يقل أهمية عن القطاع نفسه؛ الزجاج المزدوج Low-E يقلل دخول الحرارة الشمسية ويحسّن العزل الصوتي.',
        body_en: 'Glass choice matters as much as the profile; double Low-E glass cuts solar gain and boosts sound insulation.',
      },
      {
        h2_ar: 'احتساب السعر التقديري للمتر المربع',
        h2_en: 'Estimating price per square meter',
        body_ar: 'احسب المساحة بالعرض × الارتفاع، وأضف 10–15% للتركيب والإكسسوار. نطاق السوق الحالي 380–950 ريال للمتر شاملاً الزجاج المزدوج.',
        body_en: 'Compute area as width × height, add 10–15% for installation & accessories. Current market range: SAR 380–950/m² incl. double glazing.',
      },
    ],
    [
      {
        title_ar: 'فيلا سكنية — حي الياسمين، الرياض',
        title_en: 'Residential villa — Al Yasmeen, Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'استهلاك تكييف مرتفع صيفاً وضوضاء من الشارع الرئيسي.',
        problem_en: 'High summer cooling load and noise from the main street.',
        solution_ar: 'استبدال 24 شباكاً بقطاع حراري وزجاج مزدوج 6+12+6 مع شريط أرجوان.',
        solution_en: 'Replaced 24 windows with thermal-break profiles and 6+12+6 double glazing with argon spacer.',
        outcome_ar: 'انخفاض فاتورة الكهرباء 28% وخفض الضوضاء 12 ديسيبل.',
        outcome_en: '28% lower electricity bill and 12 dB noise reduction.',
      },
      {
        title_ar: 'مكتب إداري — الخبر',
        title_en: 'Office floor — Khobar',
        city_ar: 'الخبر', city_en: 'Khobar',
        problem_ar: 'تكثّف بخار الماء على الزجاج صباحاً وتسرّب هواء.',
        problem_en: 'Morning condensation on glass and air leakage.',
        solution_ar: 'إعادة تركيب 18 شباكاً مع جوانات EPDM جديدة وزجاج Low-E.',
        solution_en: 'Reinstalled 18 windows with new EPDM gaskets and Low-E glass.',
        outcome_ar: 'اختفاء التكثّف وتحسّن مؤشر راحة الموظفين بنسبة 22%.',
        outcome_en: 'Condensation eliminated; staff comfort index up 22%.',
      },
      {
        title_ar: 'شقة فندقية — جدة', title_en: 'Hotel apartment — Jeddah',
        city_ar: 'جدة', city_en: 'Jeddah',
        problem_ar: 'هواء بحري مالح يُتلف الإطارات في 3 سنوات.',
        problem_en: 'Salty sea air corroding frames within 3 years.',
        solution_ar: 'قطاع ألمنيوم مطلي بالباودر كوتنغ بمواصفات ساحلية.',
        solution_en: 'Powder-coated marine-grade aluminum profile.',
        outcome_ar: 'ضمان 7 سنوات ضد التآكل وحفاظ على المظهر.',
        outcome_en: '7-year corrosion warranty with retained finish.',
      },
    ],
    [
      'اطلب عيّنة من القطاع لمعاينة سماكة الجدار قبل الطلب.',
      'تحقّق أن الزجاج يحمل ختم المصنع (Saint-Gobain، Guardian، أو ما يماثلها).',
      'اطلب جوانات EPDM وليس مطاطاً عادياً يتشقق بعد سنتين.',
      'اشترط ضماناً مكتوباً 5+ سنوات ضد عيوب التصنيع.',
    ],
    [
      'Request a profile sample to inspect wall thickness before ordering.',
      'Verify glass carries the manufacturer stamp (Saint-Gobain, Guardian, etc.).',
      'Insist on EPDM gaskets, not generic rubber that cracks within 2 years.',
      'Require a written 5+ year warranty against manufacturing defects.',
    ],
    [
      'الاكتفاء بالقطاع الأرخص دون فحص ضمان الطلاء.',
      'إهمال قياس عمق الفتحة الفعلي قبل التصنيع.',
      'تركيب زجاج مفرد في غرف نوم تطل على شارع.',
      'القبول بدون فاتورة ضريبية أو شهادة ضمان.',
    ],
    [
      'Choosing the cheapest profile without checking coating warranty.',
      'Skipping accurate opening-depth measurement before fabrication.',
      'Single-glazing bedrooms that face a busy street.',
      'Accepting no VAT invoice or warranty certificate.',
    ],
  ),

  'aluminum-cladding': C(
    'كلادينج الواجهات أصبح المعيار في الواجهات التجارية والإدارية بالسعودية لخفّته ومرونته في التشكيل وتعدد الألوان. يختلف سعر متر الكلادينج بحسب سماكة لوح ACP (3 أو 4مم)، نوع الحشو (PE أو A2 المقاوم للحريق)، وجودة طلاء PVDF.',
    'Aluminum composite cladding has become the standard for commercial facades in Saudi Arabia thanks to its light weight, formability, and color range. Price per m² depends on ACP thickness (3 or 4 mm), core type (PE or A2 fire-rated), and PVDF coating quality.',
    [
      { h2_ar: 'ACP وANP والفرق بينهما', h2_en: 'ACP vs ANP — key differences',
        body_ar: 'ACP يستخدم حشواً بلاستيكياً (PE) أو معدنياً (A2)، أما ANP فهو ألمنيوم صلب بطبقة طلاء فقط ويُستخدم في الواجهات الحرجة فوق 18 متراً.',
        body_en: 'ACP uses a plastic (PE) or mineral (A2) core; ANP is solid aluminum with coating only, mandated above 18 m height.' },
      { h2_ar: 'طلاء PVDF و Kynar 500', h2_en: 'PVDF and Kynar 500 coatings',
        body_ar: 'طلاء Kynar 500 يضمن ثبات اللون 15 سنة في مناخ الخليج، بفارق سعر 12–18% عن الطلاء العادي.',
        body_en: 'Kynar 500 holds color 15 years in Gulf climate at 12–18% premium over standard coatings.' },
      { h2_ar: 'اللوائح والاشتراطات الحريقية', h2_en: 'Fire regulations & code',
        body_ar: 'الكود السعودي للوقاية من الحريق يلزم بحشو A2 لأي مبنى أعلى من 18 متراً، مع شهادات اختبار من جهات معتمدة.',
        body_en: 'Saudi fire code mandates A2 cores for buildings above 18 m, with certified test reports.' },
    ],
    [
      { title_ar: 'مجمع تجاري — الرياض', title_en: 'Retail complex — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'بهتان لون الواجهة بعد 4 سنوات من التركيب.',
        problem_en: 'Facade color faded after 4 years.',
        solution_ar: 'استبدال الواجهة بكلادينج Kynar 500 بضمان 15 سنة.',
        solution_en: 'Replaced facade with Kynar 500 cladding under a 15-year warranty.',
        outcome_ar: 'مظهر ثابت مع توفير 18% من تكاليف الصيانة.',
        outcome_en: 'Stable appearance with 18% lower maintenance cost.' },
      { title_ar: 'برج إداري 22 طابقاً — جدة', title_en: '22-storey office tower — Jeddah',
        city_ar: 'جدة', city_en: 'Jeddah',
        problem_ar: 'متطلبات الكود تستلزم حشو مقاوم للحريق.',
        problem_en: 'Code required fire-rated cores.',
        solution_ar: 'تنفيذ كلادينج A2 سماكة 4مم مع تثبيت ميكانيكي.',
        solution_en: 'Installed 4 mm A2 cladding with mechanical fixing system.',
        outcome_ar: 'اعتماد الدفاع المدني من المرة الأولى.',
        outcome_en: 'Civil defense approval on first inspection.' },
      { title_ar: 'فرع بنك — الدمام', title_en: 'Bank branch — Dammam',
        city_ar: 'الدمام', city_en: 'Dammam',
        problem_ar: 'الحاجة لتجديد الهوية البصرية خلال 10 أيام.',
        problem_en: 'Brand refresh required within 10 days.',
        solution_ar: 'كلادينج بألوان مخصّصة بطلب RAL مع تركيب ليلي.',
        solution_en: 'Custom RAL color cladding with overnight installation.',
        outcome_ar: 'افتتاح في الموعد دون توقف الفرع.',
        outcome_en: 'On-time opening without branch downtime.' },
    ],
    [
      'اشترط شهادة المنشأ والحشو لكل دفعة توريد.',
      'افحص سماكة طبقة الألمنيوم (0.4مم على الأقل لكل وجه).',
      'تأكّد من نظام التثبيت الميكانيكي للمباني العالية.',
      'احصل على عيّنة لون قبل التصنيع الكامل.',
    ],
    [
      'Require origin & core certificates for every batch.',
      'Check aluminum skin thickness (≥ 0.4 mm each face).',
      'Confirm mechanical fixing system for tall buildings.',
      'Approve a physical color sample before full fabrication.',
    ],
    [
      'استخدام حشو PE في مبانٍ تتجاوز 18 متراً.',
      'الاكتفاء بطلاء بوليستر بدلاً من PVDF.',
      'تركيب بدون فاصل تمدد حراري كافٍ.',
      'الاعتماد على لاصق فقط دون تثبيت ميكانيكي.',
    ],
    [
      'Using PE cores on buildings above 18 m.',
      'Settling for polyester coating instead of PVDF.',
      'Installing without sufficient thermal expansion joints.',
      'Relying on adhesive only without mechanical fixing.',
    ],
  ),

  'aluminum-pergolas': C(
    'برجولات الألمنيوم انتشرت بقوة في الحدائق المنزلية والمقاهي السعودية لخفّتها وقدرتها على تحمّل المناخ. الأسعار تختلف بين البرجولا الثابتة، الريش المتحركة يدوياً، والذكية بالتحكم عن بعد ومستشعرات المطر.',
    'Aluminum pergolas have surged in Saudi gardens and cafés due to their light weight and weather resistance. Prices vary across fixed, manually louvered, and smart motorized models with rain sensors.',
    [
      { h2_ar: 'أنواع البرجولات', h2_en: 'Pergola types',
        body_ar: 'تنقسم إلى ثابتة، ريش يدوية، وذكية بمحرك IP65 يتحكم بزاوية الريش وتصريف المطر.',
        body_en: 'Split into fixed, manual louvered, and smart IP65-motorized models that control louvre angle and drain rain.' },
      { h2_ar: 'البحور والأحمال', h2_en: 'Spans and structural loads',
        body_ar: 'البحر النموذجي 4×6م؛ تجاوز ذلك يستلزم أعمدة وسطية أو قطاعات أكبر لتحمل أحمال الرياح.',
        body_en: 'Typical span: 4×6 m; beyond requires intermediate columns or heavier sections to handle wind loads.' },
    ],
    [
      { title_ar: 'مقهى — جدة', title_en: 'Coffee shop — Jeddah',
        city_ar: 'جدة', city_en: 'Jeddah',
        problem_ar: 'فقدان عملاء الجلسات الخارجية في فترات المطر والشمس.',
        problem_en: 'Losing outdoor customers during rain and direct sun.',
        solution_ar: 'برجولا ذكية 8×5م بريش متحركة ومستشعر مطر.',
        solution_en: '8×5 m smart pergola with louvres and rain sensor.',
        outcome_ar: 'زيادة ساعات تشغيل الجلسة الخارجية 35%.',
        outcome_en: '35% more outdoor seating hours.' },
      { title_ar: 'حديقة منزلية — الرياض', title_en: 'Home garden — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'حرارة شديدة تمنع استخدام الحديقة صيفاً.',
        problem_en: 'Extreme heat blocking summer use of the garden.',
        solution_ar: 'برجولا ثابتة 5×4م مع رذاذ تبريد متكامل.',
        solution_en: 'Fixed 5×4 m pergola with integrated misting system.',
        outcome_ar: 'انخفاض الحرارة المحسوسة 8 درجات.',
        outcome_en: '8 °C lower perceived temperature.' },
    ],
    [
      'تأكد أن المحرك بمواصفات IP65 لتحمّل الغبار والمطر.',
      'اطلب اختباراً للريش بالحمل 80 كجم/م².',
      'اشترط طلاء PVDF لمنع البهتان في 5 سنوات.',
    ],
    [
      'Confirm motor is rated IP65 against dust and rain.',
      'Request a louvre load test of 80 kg/m².',
      'Insist on PVDF coating to prevent fading within 5 years.',
    ],
    [
      'استخدام محركات داخلية في بيئة مكشوفة.',
      'تثبيت بدون قواعد خرسانية كافية.',
      'إغفال نظام تصريف المياه من الريش.',
    ],
    [
      'Using indoor-rated motors in exposed environments.',
      'Installing without sufficient concrete bases.',
      'Skipping the louvre water-drainage system.',
    ],
  ),

  'steel-canopies': C(
    'مظلات السيارات الحديدية الخيار الأشهر في السعودية لحماية المركبات من حرارة الشمس والأمطار. تختلف الأنواع بين الهرمية والريشة والمستوية، ويعتمد السعر على نوع الحديد، سماكة الأقمشة (PVC)، ومدة الضمان ضد الصدأ.',
    'Steel car canopies are Saudi Arabia’s most common solution to shield vehicles from sun and rain. Types include pyramid, wave, and flat — pricing depends on steel quality, PVC fabric weight, and rust warranty.',
    [
      { h2_ar: 'أنواع المظلات', h2_en: 'Canopy types',
        body_ar: 'الهرمية الأكثر شعبية لمظهرها وكفاءتها في تصريف المطر؛ الريشة أنيقة وغالية؛ المستوية الأرخص لكن تجمع المياه.',
        body_en: 'Pyramid is the most popular for looks and rain drainage; wave is elegant but pricier; flat is cheapest but pools water.' },
      { h2_ar: 'أقمشة PVC المعتمدة', h2_en: 'Approved PVC fabrics',
        body_ar: 'PVC ألماني/كوري 650–900 جم/م² يقاوم الشمس 7+ سنوات؛ تجنّب الأقمشة الصينية الخفيفة 450 جم/م² التي تتشقق سريعاً.',
        body_en: 'German/Korean PVC 650–900 g/m² lasts 7+ years; avoid lightweight Chinese 450 g/m² fabrics that crack quickly.' },
    ],
    [
      { title_ar: 'مدرسة أهلية — الرياض', title_en: 'Private school — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'حرارة باصات وسيارات أولياء الأمور صيفاً.',
        problem_en: 'Excess heat on parents’ cars and school buses in summer.',
        solution_ar: 'مظلات هرمية 600م² بحديد مجلفن وأقمشة 800جم.',
        solution_en: '600 m² pyramid canopies with galvanized steel and 800 g fabric.',
        outcome_ar: 'تقليل حرارة المركبات حتى 18 درجة وضمان 7 سنوات.',
        outcome_en: 'Cabin temperatures dropped 18 °C with 7-year warranty.' },
      { title_ar: 'فيلا — الخبر', title_en: 'Villa — Khobar',
        city_ar: 'الخبر', city_en: 'Khobar',
        problem_ar: 'صدأ سريع للحديد بسبب رطوبة البحر.',
        problem_en: 'Rapid steel rust from coastal humidity.',
        solution_ar: 'حديد مجلفن بالغمس الساخن مع طلاء فرن.',
        solution_en: 'Hot-dip galvanized steel with oven-cured paint.',
        outcome_ar: 'لا صدأ بعد 4 سنوات.', outcome_en: 'No rust after 4 years.' },
    ],
    [
      'تأكد من جلفنة الحديد بالغمس الساخن وليس الباردة فقط.',
      'اطلب شهادة منشأ للقماش وختم المصنع.',
      'احرص على ميل المظلة 5–10° لتصريف الأمطار.',
    ],
    [
      'Insist on hot-dip galvanizing rather than cold-dip only.',
      'Request fabric origin certificate and factory stamp.',
      'Ensure 5–10° canopy slope for rain drainage.',
    ],
    [
      'استخدام أقمشة 450جم/م² للحصول على سعر منخفض.',
      'تثبيت أعمدة بدون قواعد خرسانية كافية.',
      'إهمال طلاء الفرن النهائي على الحديد.',
    ],
    [
      'Using 450 g/m² fabric to chase a low price.',
      'Anchoring posts without sufficient concrete bases.',
      'Skipping the final oven coating on steel.',
    ],
  ),

  'iron-gates': C(
    'البوابات الحديدية بقص الليزر تجمع بين الفخامة والأمان، وأصبحت توقيعاً بصرياً للفلل الحديثة. السعر يتأثر بسماكة الحديد، تعقيد التصميم، نوع الدهان، وإضافة المحركات الكهربائية.',
    'Laser-cut iron gates combine luxury and security and have become a signature for modern villas. Price depends on steel thickness, design complexity, finish type, and electric motor add-ons.',
    [
      { h2_ar: 'تقنيات قص الليزر', h2_en: 'Laser cutting technologies',
        body_ar: 'قص الليزر CNC يحقق دقة 0.1مم ويسمح بزخارف هندسية وإسلامية معقّدة دون لحام مرئي.',
        body_en: 'CNC laser cutting achieves 0.1 mm precision and enables complex geometric/Islamic patterns without visible welds.' },
      { h2_ar: 'أنظمة الدهان', h2_en: 'Coating systems',
        body_ar: 'دهان الفرن (باودر كوتنغ) يدوم 7–10 سنوات؛ تجنّب الدهانات اليدوية التي تتقشّر خلال سنتين.',
        body_en: 'Oven powder-coating lasts 7–10 years; avoid hand-applied paints that peel within 2 years.' },
    ],
    [
      { title_ar: 'فيلا فاخرة — الرياض', title_en: 'Luxury villa — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'حاجة لبوابة بزخرفة هندسية مميّزة وأمان عالٍ.',
        problem_en: 'Need for distinctive geometric pattern and high security.',
        solution_ar: 'بوابة قص ليزر 4مم بدهان فرن وتصميم مخصّص.',
        solution_en: '4 mm laser-cut gate with oven coating and custom design.',
        outcome_ar: 'هوية بصرية مميّزة مع محرك كهربائي.',
        outcome_en: 'Distinctive look with integrated electric motor.' },
    ],
    [
      'اطلب رسومات CAD للتصميم قبل القص.',
      'تأكّد من سماكة الحديد 3–4مم للأبواب الكبيرة.',
      'اشترط دهان فرن وليس رش يدوي.',
    ],
    [
      'Request CAD drawings before laser cutting.',
      'Confirm 3–4 mm steel thickness for large gates.',
      'Insist on oven coating, not hand-spray.',
    ],
    [
      'الاعتماد على تصميم نموذجي دون تخصيص.',
      'تركيب محرك بدون مفصلات معزّزة.',
    ],
    [
      'Using a stock design without customization.',
      'Installing a motor without reinforced hinges.',
    ],
  ),

  'glass-shopfronts': C(
    'واجهات المحلات الزجاجية تعكس هوية العلامة التجارية وتجذب المارة. تختلف الأسعار بحسب نوع الزجاج (مقسّى أو مصفّح)، السماكة (10–12مم)، نوع الباب (سحاب أوتوماتيكي أو مفصلي)، وطبقات العزل الحراري.',
    'Storefront glass facades convey brand identity and attract foot traffic. Prices vary by glass type (tempered or laminated), thickness (10–12 mm), door type (automatic sliding or hinged), and thermal insulation layers.',
    [
      { h2_ar: 'مقسّى أم مصفّح؟', h2_en: 'Tempered vs laminated',
        body_ar: 'المقسّى أقوى 5 أضعاف ويتفتت لقطع غير حادة، أما المصفّح فيلتصق على شريحة PVB ولا يتساقط — مطلوب فوق ارتفاع 2.5م.',
        body_en: 'Tempered is 5× stronger and shatters into blunt pieces; laminated stays bonded to a PVB layer and doesn’t fall — required above 2.5 m height.' },
    ],
    [
      { title_ar: 'فرع مطعم — الدمام', title_en: 'Restaurant branch — Dammam',
        city_ar: 'الدمام', city_en: 'Dammam',
        problem_ar: 'استهلاك تكييف عالٍ بسبب التعرض الشمسي.',
        problem_en: 'High AC load from solar exposure.',
        solution_ar: 'زجاج مزدوج Low-E بإطار حراري دقيق.',
        solution_en: 'Double Low-E glass with slim thermal frame.',
        outcome_ar: 'انخفاض استهلاك التكييف 24%.',
        outcome_en: 'AC consumption down 24%.' },
    ],
    [
      'استخدم زجاج مصفّح لأي ارتفاع يتجاوز 2.5م.',
      'اطلب اختبار باب الانزلاق 250,000 دورة على الأقل.',
    ],
    [
      'Use laminated glass above 2.5 m heights.',
      'Require a sliding-door endurance test of ≥ 250,000 cycles.',
    ],
    [
      'استخدام زجاج مفرد 8مم في واجهات تعرّض مباشر.',
      'تركيب باب أوتوماتيكي بدون مستشعر طوارئ.',
    ],
    [
      'Single 8 mm glass on directly exposed facades.',
      'Automatic door without an emergency sensor.',
    ],
  ),

  'glass-shower-cabins': C(
    'كبائن الاستحمام الزجاجية تمنح الحمام لمسة عصرية وتسهّل التنظيف. السعر يعتمد على سماكة الزجاج (8 أو 10مم)، نوع الإكسسوار (كروم أو أسود مطفي)، وطلاء النانو المقاوم للترسبات.',
    'Glass shower cabins give bathrooms a modern look and simplify cleaning. Price depends on glass thickness (8 or 10 mm), hardware finish (chrome or matte black), and nano anti-scale coating.',
    [
      { h2_ar: 'سماكة الزجاج وأمانه', h2_en: 'Glass thickness and safety',
        body_ar: '10مم يوصى به للأبواب الزجاجية الكبيرة، و8مم كافٍ للكبائن العادية. الزجاج يجب أن يكون مقسّى ومختوماً.',
        body_en: '10 mm is recommended for large glass doors; 8 mm suffices for standard cabins. Glass must be tempered and stamped.' },
    ],
    [
      { title_ar: 'شقة سكنية — الرياض', title_en: 'Apartment — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'ترسّب الجير على الزجاج وصعوبة التنظيف.',
        problem_en: 'Limescale buildup and cleaning difficulty.',
        solution_ar: 'كبينة 10مم بطلاء نانو مع إكسسوار كروم.',
        solution_en: '10 mm cabin with nano coating and chrome hardware.',
        outcome_ar: 'تنظيف أسبوعي بدلاً من يومي.',
        outcome_en: 'Weekly cleaning instead of daily.' },
    ],
    [
      'تحقّق من ختم Tempered على كل لوح.',
      'استخدم سيليكون مقاوم للعفن.',
    ],
    [
      'Check the Tempered stamp on every panel.',
      'Use anti-mold silicone sealant.',
    ],
    [
      'استخدام زجاج عادي بدلاً من المقسّى.',
      'إهمال ميل أرضية الكبينة 2% للتصريف.',
    ],
    [
      'Using ordinary instead of tempered glass.',
      'Skipping the 2% floor slope for drainage.',
    ],
  ),

  'wood-doors': C(
    'الأبواب الخشبية الداخلية تُحدث فرقاً في إحساس البيت وأناقته. الفرق الجوهري بين MDF و HDF يكمن في الكثافة ومقاومة الرطوبة، إضافة لاختلاف القشرة الطبيعية عن الميلامين في الجمال والمتانة.',
    'Interior wood doors transform a home’s feel and elegance. The core difference between MDF and HDF is density and humidity resistance, plus natural veneer vs melamine for looks and durability.',
    [
      { h2_ar: 'MDF أم HDF', h2_en: 'MDF vs HDF',
        body_ar: 'الـHDF أكثف بـ20% ويناسب الحمامات؛ الـMDF أرخص للغرف الجافة.',
        body_en: 'HDF is 20% denser, suited for bathrooms; MDF is cheaper for dry rooms.' },
      { h2_ar: 'قشرة طبيعية أم ميلامين', h2_en: 'Natural veneer vs melamine',
        body_ar: 'القشرة الطبيعية أجمل ويعاد صقلها؛ الميلامين أكثر مقاومة للخدش وأرخص بنسبة 30%.',
        body_en: 'Natural veneer is more beautiful and refinishable; melamine is more scratch-resistant and 30% cheaper.' },
    ],
    [
      { title_ar: 'فيلا — الرياض', title_en: 'Villa — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'انتفاخ أبواب الحمامات بعد سنة.',
        problem_en: 'Bathroom doors swelling after one year.',
        solution_ar: 'استبدال بأبواب HDF مع طلاء مقاوم للرطوبة.',
        solution_en: 'Replaced with HDF doors and humidity-resistant finish.',
        outcome_ar: 'لا انتفاخ بعد 3 سنوات.',
        outcome_en: 'No swelling after 3 years.' },
    ],
    [
      'استخدم HDF في الحمامات والمطابخ.',
      'اشترط مفصلات صامتة (Soft-close) أوروبية.',
    ],
    [
      'Use HDF in bathrooms and kitchens.',
      'Specify European soft-close hinges.',
    ],
    [
      'تركيب MDF عادي في حمامات رطبة.',
      'استخدام مفصلات رخيصة تتآكل بسرعة.',
    ],
    [
      'Installing standard MDF in humid bathrooms.',
      'Using cheap hinges that wear quickly.',
    ],
  ),

  'wood-flooring': C(
    'أرضيات الباركيه HDF و SPC من أكثر الخيارات شيوعاً في السعودية لمزيجها بين السعر والجمال. الفرق الرئيسي أن SPC مقاوم للماء 100% بينما HDF أدفأ تحت القدم.',
    'HDF and SPC parquet flooring lead the Saudi market for their balance of price and beauty. Key difference: SPC is 100% waterproof while HDF feels warmer underfoot.',
    [
      { h2_ar: 'تصنيفات مقاومة الخدش AC', h2_en: 'AC scratch ratings',
        body_ar: 'AC4 للمنازل عالية الاستخدام؛ AC5 للمحلات التجارية. التصنيف الأقل من AC3 لا يصلح لغرف المعيشة.',
        body_en: 'AC4 for high-traffic homes; AC5 for retail. Below AC3 isn’t suitable for living rooms.' },
    ],
    [
      { title_ar: 'مكتب — الرياض', title_en: 'Office — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'خدش الباركيه السريع من كراسي العمل.',
        problem_en: 'Rapid parquet scratching from office chairs.',
        solution_ar: 'استبدال بـSPC تصنيف AC5 مع طبقة UV.',
        solution_en: 'Replaced with SPC AC5 and UV layer.',
        outcome_ar: 'لا خدش ملحوظ بعد سنتين.',
        outcome_en: 'No noticeable scratches after 2 years.' },
    ],
    [
      'اختر AC4 على الأقل للمنزل وAC5 للمكاتب.',
      'اطلب طبقة فلين تحت الباركيه لعزل الصوت.',
    ],
    [
      'Choose at least AC4 for homes and AC5 for offices.',
      'Request a cork underlay for acoustic insulation.',
    ],
    [
      'تركيب HDF في مطابخ مفتوحة.',
      'إهمال فاصل التمدد 8مم عند الجدران.',
    ],
    [
      'Installing HDF in open kitchens.',
      'Skipping the 8 mm expansion gap at walls.',
    ],
  ),

  'kitchen-cabinets': C(
    'المطبخ هو قلب البيت؛ اختياره الصحيح يوفّر آلاف الريالات على المدى البعيد. تختلف أسعار المطابخ بحسب نوع الأبواب (PVC، أكريليك، خشب طبيعي)، المسطح (كوريان، كوارتز، غرانيت)، ونوع المفصلات والإكسسوار.',
    'The kitchen is the heart of the home; the right choice saves thousands long-term. Prices vary by door type (PVC, acrylic, solid wood), countertop (corian, quartz, granite), and hinge/hardware quality.',
    [
      { h2_ar: 'أنواع أبواب المطابخ', h2_en: 'Kitchen door types',
        body_ar: 'PVC الأرخص ويتقشّر بالحرارة؛ أكريليك لامع وعصري؛ الخشب الطبيعي الأفخم وأطول عمراً.',
        body_en: 'PVC is cheapest but peels under heat; acrylic is glossy & modern; solid wood is most premium and longest-lasting.' },
      { h2_ar: 'مسطحات المطابخ', h2_en: 'Countertop materials',
        body_ar: 'الكوريان متين وقابل للإصلاح؛ الكوارتز الأقوى ضد الخدش؛ الغرانيت الأفخر طبيعياً.',
        body_en: 'Corian is durable and repairable; quartz is hardest against scratch; granite has the most natural luxury feel.' },
      { h2_ar: 'الإكسسوار والمفصلات', h2_en: 'Hardware and hinges',
        body_ar: 'مفصلات Blum أو Hettich الألمانية تضمن 50,000 دورة فتح وإغلاق.',
        body_en: 'German Blum or Hettich hinges guarantee 50,000 open/close cycles.' },
    ],
    [
      { title_ar: 'فيلا عائلية — الرياض', title_en: 'Family villa — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'مساحة محدودة وحاجة لتخزين كبير.',
        problem_en: 'Limited space and need for large storage.',
        solution_ar: 'مطبخ U بطول 9م مع كبائن سقف وأدراج عميقة.',
        solution_en: 'U-shaped 9 m kitchen with ceiling cabinets and deep drawers.',
        outcome_ar: 'مضاعفة سعة التخزين وتحسين سير العمل.',
        outcome_en: 'Doubled storage capacity and improved workflow.' },
      { title_ar: 'مطعم منزلي — جدة', title_en: 'Home restaurant — Jeddah',
        city_ar: 'جدة', city_en: 'Jeddah',
        problem_ar: 'حاجة لمسطح يتحمل الاستخدام المكثّف.',
        problem_en: 'Need for a counter that withstands intensive use.',
        solution_ar: 'كوارتز سماكة 30مم بإكسسوار صناعي.',
        solution_en: '30 mm quartz with commercial-grade hardware.',
        outcome_ar: 'أداء بدون خدش بعد سنة من التشغيل.',
        outcome_en: 'No scratches after a year of heavy use.' },
    ],
    [
      'اشترط مفصلات Blum أو Hettich مع كرت ضمان.',
      'تأكد من تركيب أرجل قابلة للضبط للتسوية.',
      'اطلب رسماً ثلاثي الأبعاد قبل الموافقة.',
    ],
    [
      'Insist on Blum or Hettich hinges with warranty card.',
      'Confirm adjustable legs for leveling.',
      'Request a 3D rendering before approval.',
    ],
    [
      'استخدام PVC قرب الفرن أو موقد الغاز.',
      'إغفال شفّاط هواء بقدرة كافية.',
      'القبول بدون قياس نهائي بعد التشطيبات.',
    ],
    [
      'Using PVC near the oven or gas hob.',
      'Skipping a properly sized hood.',
      'Accepting without a final measurement after finishes.',
    ],
  ),

  'wardrobes': C(
    'الدواليب المفصّلة تستثمر كل سنتيمتر من غرفة النوم. تختلف الأسعار بين السحاب والمفصلي، وتعتمد على عمق الدولاب وعدد الأقسام والإضاءة الداخلية والتنظيم.',
    'Custom wardrobes maximize every centimeter in the bedroom. Prices vary between sliding and hinged, depending on depth, partitions, internal lighting and organization.',
    [
      { h2_ar: 'سحاب أم مفصلي', h2_en: 'Sliding vs hinged',
        body_ar: 'السحاب يوفّر مساحة فتح الباب لكنه أغلى بـ20%؛ المفصلي يفتح كاملاً ويسهل الوصول.',
        body_en: 'Sliding saves swing space but costs ~20% more; hinged opens fully for easier access.' },
    ],
    [
      { title_ar: 'غرفة نوم رئيسية — الرياض', title_en: 'Master bedroom — Riyadh',
        city_ar: 'الرياض', city_en: 'Riyadh',
        problem_ar: 'فوضى ملابس وعدم استغلال الارتفاع.',
        problem_en: 'Cluttered clothes and unused vertical space.',
        solution_ar: 'دولاب سحاب 4م حتى السقف بأقسام داخلية وLED.',
        solution_en: '4 m sliding wardrobe to ceiling with internal partitions and LED lighting.',
        outcome_ar: 'تنظيم كامل وزيادة سعة التخزين 60%.',
        outcome_en: 'Full organization and 60% more storage.' },
    ],
    [
      'اختر سحّابات سككها معدنية ثلاثية لمتانة أعلى.',
      'اطلب إضاءة LED مع مستشعر حركة.',
    ],
    [
      'Choose wardrobes with triple metal-track sliders for durability.',
      'Request LED lighting with motion sensors.',
    ],
    [
      'استخدام سكك بلاستيكية للسحاب.',
      'إهمال قياس عمق 60سم اللازم للهانجر.',
    ],
    [
      'Using plastic tracks for sliding doors.',
      'Skipping the 60 cm depth needed for hangers.',
    ],
  ),
};

export function getServiceContent(slug: string): ServiceContent | null {
  return SERVICE_CONTENT[slug] ?? null;
}