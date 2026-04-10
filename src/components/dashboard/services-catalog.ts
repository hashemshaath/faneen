// Comprehensive service catalog for the platform
export interface ServiceItem {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
}

export interface BrandItem {
  name: string;
  origin_ar: string;
  origin_en: string;
  type: 'local' | 'international';
}

export interface ServiceGroup {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  services: ServiceItem[];
  brands?: BrandItem[];
}

export const serviceCatalog: ServiceGroup[] = [
  {
    id: 'aluminum',
    name_ar: 'الألمنيوم',
    name_en: 'Aluminum',
    icon: '🏗️',
    color: 'bg-sky-500/10 text-sky-600',
    services: [
      { name_ar: 'نوافذ ألمنيوم', name_en: 'Aluminum Windows', description_ar: 'تصنيع وتركيب نوافذ الألمنيوم بجميع الأنواع والمقاسات', description_en: 'Manufacturing and installation of aluminum windows in all types and sizes' },
      { name_ar: 'أبواب ألمنيوم', name_en: 'Aluminum Doors', description_ar: 'أبواب ألمنيوم داخلية وخارجية بتصاميم عصرية', description_en: 'Interior and exterior aluminum doors with modern designs' },
      { name_ar: 'واجهات ألمنيوم', name_en: 'Aluminum Facades', description_ar: 'تصميم وتنفيذ واجهات المباني من الألمنيوم والزجاج', description_en: 'Design and execution of building facades from aluminum and glass' },
      { name_ar: 'شترات ألمنيوم', name_en: 'Aluminum Shutters', description_ar: 'شترات رول وثابتة للحماية والعزل', description_en: 'Roll and fixed shutters for protection and insulation' },
      { name_ar: 'قواطع ألمنيوم', name_en: 'Aluminum Partitions', description_ar: 'قواطع مكتبية وتجارية من الألمنيوم', description_en: 'Office and commercial aluminum partitions' },
      { name_ar: 'كلادينج ألمنيوم', name_en: 'Aluminum Cladding', description_ar: 'تكسية المباني بألواح الكلادينج المقاومة للعوامل الجوية', description_en: 'Building cladding with weather-resistant panels' },
      { name_ar: 'درابزين ألمنيوم', name_en: 'Aluminum Railings', description_ar: 'درابزين للسلالم والبلكونات بتصاميم أنيقة', description_en: 'Railings for stairs and balconies with elegant designs' },
      { name_ar: 'مظلات ألمنيوم', name_en: 'Aluminum Canopies', description_ar: 'مظلات سيارات ومداخل من الألمنيوم', description_en: 'Car and entrance canopies from aluminum' },
      { name_ar: 'صيانة الألمنيوم', name_en: 'Aluminum Maintenance', description_ar: 'صيانة وإصلاح جميع منتجات الألمنيوم', description_en: 'Maintenance and repair of all aluminum products' },
    ],
    brands: [
      { name: 'الوميتال', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
      { name: 'الراجحي للألمنيوم', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
      { name: 'Schüco', origin_ar: 'ألمانية', origin_en: 'German', type: 'international' },
      { name: 'Reynaers', origin_ar: 'بلجيكية', origin_en: 'Belgian', type: 'international' },
      { name: 'Technal', origin_ar: 'فرنسية', origin_en: 'French', type: 'international' },
      { name: 'SAPA', origin_ar: 'نرويجية', origin_en: 'Norwegian', type: 'international' },
    ],
  },
  {
    id: 'iron',
    name_ar: 'الحديد',
    name_en: 'Iron & Steel',
    icon: '⚙️',
    color: 'bg-slate-500/10 text-slate-600',
    services: [
      { name_ar: 'أبواب حديد', name_en: 'Iron Doors', description_ar: 'أبواب حديد مشغول وأبواب أمان بتصاميم فنية', description_en: 'Wrought iron doors and security doors with artistic designs' },
      { name_ar: 'بوابات حديد', name_en: 'Iron Gates', description_ar: 'بوابات رئيسية للفلل والقصور يدوية وكهربائية', description_en: 'Main gates for villas and palaces, manual and electric' },
      { name_ar: 'أبواب ضد الحريق', name_en: 'Fire-Rated Doors', description_ar: 'أبواب مقاومة للحريق معتمدة بمعايير السلامة الدولية', description_en: 'Fire-resistant doors certified to international safety standards' },
      { name_ar: 'هناجر ومستودعات', name_en: 'Hangars & Warehouses', description_ar: 'تصميم وتنفيذ هناجر حديد ومستودعات صناعية', description_en: 'Design and construction of steel hangars and industrial warehouses' },
      { name_ar: 'مظلات حديد', name_en: 'Iron Canopies', description_ar: 'مظلات سيارات ومداخل وحدائق من الحديد المجلفن', description_en: 'Car, entrance and garden canopies from galvanized iron' },
      { name_ar: 'درابزين حديد', name_en: 'Iron Railings', description_ar: 'درابزين سلالم وبلكونات حديد مشغول', description_en: 'Wrought iron stair and balcony railings' },
      { name_ar: 'هياكل معدنية', name_en: 'Steel Structures', description_ar: 'إنشاءات وهياكل معدنية للمباني التجارية والصناعية', description_en: 'Metal structures for commercial and industrial buildings' },
      { name_ar: 'سياج حديد', name_en: 'Iron Fencing', description_ar: 'أسوار وسياجات حديدية للمنازل والمنشآت', description_en: 'Iron fences for homes and facilities' },
      { name_ar: 'أعمال حدادة فنية', name_en: 'Decorative Ironwork', description_ar: 'أعمال حدادة فنية وديكورية مخصصة', description_en: 'Custom artistic and decorative ironwork' },
      { name_ar: 'صيانة الحديد', name_en: 'Iron Maintenance', description_ar: 'صيانة ودهان ومعالجة صدأ المنتجات الحديدية', description_en: 'Maintenance, painting and rust treatment of iron products' },
    ],
  },
  {
    id: 'glass',
    name_ar: 'الزجاج',
    name_en: 'Glass',
    icon: '🪟',
    color: 'bg-cyan-500/10 text-cyan-600',
    services: [
      { name_ar: 'زجاج مزدوج عازل', name_en: 'Double Glazed Glass', description_ar: 'زجاج مزدوج للعزل الحراري والصوتي', description_en: 'Double glazed glass for thermal and sound insulation' },
      { name_ar: 'زجاج سيكوريت', name_en: 'Tempered Glass', description_ar: 'زجاج مقسّى للأبواب والواجهات والطاولات', description_en: 'Tempered glass for doors, facades and tables' },
      { name_ar: 'شاور بوكس', name_en: 'Shower Enclosures', description_ar: 'كبائن استحمام زجاجية بتصاميم عصرية', description_en: 'Glass shower enclosures with modern designs' },
      { name_ar: 'مرايا ديكورية', name_en: 'Decorative Mirrors', description_ar: 'مرايا بأحجام وتصاميم مخصصة للديكور', description_en: 'Custom size and design mirrors for decoration' },
      { name_ar: 'واجهات زجاجية', name_en: 'Glass Facades', description_ar: 'واجهات كرتن وول وزجاج هيكلي', description_en: 'Curtain wall and structural glass facades' },
      { name_ar: 'زجاج ملون ومعشق', name_en: 'Stained Glass', description_ar: 'زجاج ملون ومعشق للديكورات والمساجد', description_en: 'Stained and leaded glass for decorations and mosques' },
    ],
  },
  {
    id: 'wood',
    name_ar: 'الخشب',
    name_en: 'Wood',
    icon: '🪵',
    color: 'bg-amber-500/10 text-amber-700',
    services: [
      { name_ar: 'أبواب خشب داخلية', name_en: 'Interior Wood Doors', description_ar: 'أبواب خشبية داخلية بتشكيلة واسعة من التصاميم والأخشاب', description_en: 'Interior wooden doors with a wide variety of designs and woods' },
      { name_ar: 'أبواب خشب خارجية', name_en: 'Exterior Wood Doors', description_ar: 'أبواب خارجية مقاومة للعوامل الجوية من أجود الأخشاب', description_en: 'Weather-resistant exterior doors from finest woods' },
      { name_ar: 'شبابيك خشب', name_en: 'Wood Windows', description_ar: 'نوافذ خشبية كلاسيكية وعصرية بعزل ممتاز', description_en: 'Classic and modern wooden windows with excellent insulation' },
      { name_ar: 'دواليب ملابس خشب', name_en: 'Wood Wardrobes', description_ar: 'خزائن ودواليب ملابس خشبية مصممة حسب الطلب', description_en: 'Custom-designed wooden wardrobes and closets' },
      { name_ar: 'ديكورات خشبية', name_en: 'Wood Decorations', description_ar: 'تنفيذ ديكورات خشبية داخلية شاملة الجدران والأسقف', description_en: 'Interior wood decorations including walls and ceilings' },
      { name_ar: 'أرضيات خشبية', name_en: 'Wood Flooring', description_ar: 'باركيه وأرضيات خشبية طبيعية وصناعية', description_en: 'Natural and engineered parquet and wood flooring' },
      { name_ar: 'سلالم خشبية', name_en: 'Wood Stairs', description_ar: 'تصميم وتنفيذ سلالم خشبية بتصاميم فريدة', description_en: 'Design and execution of unique wooden staircases' },
      { name_ar: 'أسقف خشبية', name_en: 'Wood Ceilings', description_ar: 'أسقف خشبية مستعارة وتجليد أسقف', description_en: 'Wooden false ceilings and ceiling cladding' },
      { name_ar: 'صيانة الأعمال الخشبية', name_en: 'Wood Maintenance', description_ar: 'صيانة وتجديد المنتجات والديكورات الخشبية', description_en: 'Maintenance and renovation of wood products and decorations' },
    ],
  },
  {
    id: 'kitchens',
    name_ar: 'المطابخ',
    name_en: 'Kitchens',
    icon: '🍳',
    color: 'bg-orange-500/10 text-orange-600',
    services: [
      { name_ar: 'مطابخ ألمنيوم', name_en: 'Aluminum Kitchens', description_ar: 'مطابخ ألمنيوم عملية ومقاومة للرطوبة بتصاميم عصرية', description_en: 'Practical moisture-resistant aluminum kitchens with modern designs' },
      { name_ar: 'مطابخ خشب طبيعي', name_en: 'Solid Wood Kitchens', description_ar: 'مطابخ من الخشب الطبيعي الفاخر بتشطيبات راقية', description_en: 'Luxury solid wood kitchens with premium finishes' },
      { name_ar: 'مطابخ MDF', name_en: 'MDF Kitchens', description_ar: 'مطابخ MDF بألوان وتصاميم متنوعة واقتصادية', description_en: 'MDF kitchens with various colors and economical designs' },
      { name_ar: 'مطابخ إيطالية', name_en: 'Italian Kitchens', description_ar: 'مطابخ إيطالية فاخرة بتصميمات أوروبية أنيقة', description_en: 'Luxury Italian kitchens with elegant European designs' },
      { name_ar: 'مطابخ ألمانية', name_en: 'German Kitchens', description_ar: 'مطابخ ألمانية بجودة هندسية عالية وتقنيات متقدمة', description_en: 'German kitchens with high engineering quality and advanced technology' },
      { name_ar: 'مطابخ أمريكية', name_en: 'American Kitchens', description_ar: 'مطابخ أمريكية مفتوحة بأسلوب عملي وعصري', description_en: 'Open-concept American kitchens with practical modern style' },
      { name_ar: 'مطابخ PVC', name_en: 'PVC Kitchens', description_ar: 'مطابخ PVC مقاومة للماء بألوان ثابتة', description_en: 'Waterproof PVC kitchens with fade-resistant colors' },
      { name_ar: 'مطابخ أكريليك', name_en: 'Acrylic Kitchens', description_ar: 'مطابخ أكريليك لامعة بمظهر عصري وأنيق', description_en: 'Glossy acrylic kitchens with modern elegant look' },
      { name_ar: 'رخام وأسطح مطابخ', name_en: 'Kitchen Countertops', description_ar: 'أسطح مطابخ من الرخام والجرانيت والكوارتز', description_en: 'Kitchen countertops from marble, granite and quartz' },
      { name_ar: 'تصميم مطابخ', name_en: 'Kitchen Design', description_ar: 'تصميم مطابخ ثلاثي الأبعاد واستشارات متخصصة', description_en: '3D kitchen design and specialized consultations' },
      { name_ar: 'صيانة مطابخ', name_en: 'Kitchen Maintenance', description_ar: 'صيانة وتجديد المطابخ وتغيير الأبواب والأسطح', description_en: 'Kitchen maintenance, renovation and door/countertop replacement' },
    ],
    brands: [
      { name: 'IKEA', origin_ar: 'سويدية', origin_en: 'Swedish', type: 'international' },
      { name: 'Häcker', origin_ar: 'ألمانية', origin_en: 'German', type: 'international' },
      { name: 'Nobilia', origin_ar: 'ألمانية', origin_en: 'German', type: 'international' },
      { name: 'Scavolini', origin_ar: 'إيطالية', origin_en: 'Italian', type: 'international' },
      { name: 'Snaidero', origin_ar: 'إيطالية', origin_en: 'Italian', type: 'international' },
      { name: 'ALNO', origin_ar: 'ألمانية', origin_en: 'German', type: 'international' },
      { name: 'Pedini', origin_ar: 'إيطالية', origin_en: 'Italian', type: 'international' },
      { name: 'مطابخ الأمل', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
      { name: 'مطابخ النجار', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
      { name: 'مطابخ الجزيرة', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
      { name: 'مطابخ الصراج', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
      { name: 'SieMatic', origin_ar: 'ألمانية', origin_en: 'German', type: 'international' },
    ],
  },
  {
    id: 'closets',
    name_ar: 'الخزائن والدواليب',
    name_en: 'Closets & Wardrobes',
    icon: '🚪',
    color: 'bg-violet-500/10 text-violet-600',
    services: [
      { name_ar: 'خزائن ملابس مدمجة', name_en: 'Built-in Wardrobes', description_ar: 'خزائن ملابس مدمجة بتصميم مخصص حسب المساحة', description_en: 'Built-in wardrobes with custom design based on space' },
      { name_ar: 'غرف ملابس (دريسنج روم)', name_en: 'Walk-in Closets', description_ar: 'تصميم وتنفيذ غرف ملابس متكاملة فاخرة', description_en: 'Design and execution of complete luxury walk-in closets' },
      { name_ar: 'خزائن غرف النوم', name_en: 'Bedroom Wardrobes', description_ar: 'دواليب غرف نوم بتصاميم عصرية وكلاسيكية', description_en: 'Bedroom wardrobes with modern and classic designs' },
      { name_ar: 'خزائن أبواب جرارة', name_en: 'Sliding Door Wardrobes', description_ar: 'دواليب بأبواب جرارة موفرة للمساحة', description_en: 'Space-saving wardrobes with sliding doors' },
      { name_ar: 'خزائن أحذية', name_en: 'Shoe Closets', description_ar: 'خزائن أحذية مصممة لتنظيم وعرض الأحذية', description_en: 'Shoe closets designed for organizing and displaying shoes' },
      { name_ar: 'خزائن مطبخ', name_en: 'Kitchen Cabinets', description_ar: 'خزائن مطبخ علوية وسفلية بتصاميم وظيفية', description_en: 'Upper and lower kitchen cabinets with functional designs' },
      { name_ar: 'خزائن حمامات', name_en: 'Bathroom Cabinets', description_ar: 'خزائن حمامات مقاومة للرطوبة بتصاميم أنيقة', description_en: 'Moisture-resistant bathroom cabinets with elegant designs' },
      { name_ar: 'أنظمة تخزين ذكية', name_en: 'Smart Storage Systems', description_ar: 'حلول تخزين ذكية وإكسسوارات داخلية للخزائن', description_en: 'Smart storage solutions and internal wardrobe accessories' },
    ],
    brands: [
      { name: 'IKEA', origin_ar: 'سويدية', origin_en: 'Swedish', type: 'international' },
      { name: 'Poliform', origin_ar: 'إيطالية', origin_en: 'Italian', type: 'international' },
      { name: 'Molteni&C', origin_ar: 'إيطالية', origin_en: 'Italian', type: 'international' },
      { name: 'California Closets', origin_ar: 'أمريكية', origin_en: 'American', type: 'international' },
      { name: 'Elfa', origin_ar: 'سويدية', origin_en: 'Swedish', type: 'international' },
      { name: 'هوم سنتر', origin_ar: 'إماراتية', origin_en: 'UAE', type: 'local' },
      { name: 'خزائن الرياض', origin_ar: 'سعودية', origin_en: 'Saudi', type: 'local' },
    ],
  },
  {
    id: 'upvc',
    name_ar: 'UPVC',
    name_en: 'UPVC',
    icon: '🪟',
    color: 'bg-emerald-500/10 text-emerald-600',
    services: [
      { name_ar: 'نوافذ UPVC', name_en: 'UPVC Windows', description_ar: 'نوافذ UPVC بعزل حراري وصوتي عالي', description_en: 'UPVC windows with high thermal and sound insulation' },
      { name_ar: 'أبواب UPVC', name_en: 'UPVC Doors', description_ar: 'أبواب UPVC مقاومة للعوامل الجوية', description_en: 'Weather-resistant UPVC doors' },
      { name_ar: 'شتر UPVC', name_en: 'UPVC Shutters', description_ar: 'شترات UPVC بألوان متعددة ومقاومة للأشعة', description_en: 'UPVC shutters in multiple colors and UV-resistant' },
    ],
  },
];
