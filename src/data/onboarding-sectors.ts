/**
 * Industrial sectors catalog for the supplier onboarding picker.
 * Each sector has bilingual labels, an emoji/icon, and sub-services.
 * Kept in /data so it can be reused by admin classification, search filters,
 * and the onboarding wizard without coupling to UI.
 */

export type SectorId =
  | 'aluminum'
  | 'steel'
  | 'wood'
  | 'kitchens'
  | 'glass'
  | 'stainless_steel'
  | 'gypsum_decoration'
  | 'facades'
  | 'fire_doors'
  | 'site_factory_prep'
  | 'design_services'
  | 'measurement_services'
  | 'maintenance_services';

export interface SubService {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface OnboardingSector {
  id: SectorId;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  /** Lucide icon name (resolved via dynamic lookup in the picker). */
  icon: 'Building2' | 'Wrench' | 'TreePine' | 'ChefHat' | 'Square' | 'ShieldCheck'
      | 'PaintBucket' | 'LayoutGrid' | 'Flame' | 'HardHat' | 'PencilRuler'
      | 'Ruler' | 'Settings2';
  subServices: SubService[];
}

export const ONBOARDING_SECTORS: OnboardingSector[] = [
  {
    id: 'aluminum',
    name_ar: 'الألمنيوم',
    name_en: 'Aluminum',
    desc_ar: 'نوافذ، أبواب، واجهات، كلادينج',
    desc_en: 'Windows, doors, facades, cladding',
    icon: 'Building2',
    subServices: [
      { id: 'al_windows', name_ar: 'نوافذ', name_en: 'Windows' },
      { id: 'al_doors', name_ar: 'أبواب', name_en: 'Doors' },
      { id: 'al_facades', name_ar: 'واجهات', name_en: 'Facades' },
      { id: 'al_kitchens', name_ar: 'مطابخ ألمنيوم', name_en: 'Aluminum Kitchens' },
      { id: 'al_cladding', name_ar: 'كلادينج', name_en: 'Cladding' },
      { id: 'al_skylights', name_ar: 'سكاي لايت', name_en: 'Skylights' },
    ],
  },
  {
    id: 'steel',
    name_ar: 'الحديد والصاج',
    name_en: 'Steel & Iron Works',
    desc_ar: 'بوابات، درابزين، حماية، سلالم',
    desc_en: 'Gates, railings, protection, stairs',
    icon: 'Wrench',
    subServices: [
      { id: 'st_gates', name_ar: 'بوابات', name_en: 'Gates' },
      { id: 'st_railings', name_ar: 'درابزين', name_en: 'Railings' },
      { id: 'st_protection', name_ar: 'شبابيك حماية', name_en: 'Protection Windows' },
      { id: 'st_stairs', name_ar: 'سلالم', name_en: 'Stairs' },
      { id: 'st_light_struct', name_ar: 'هياكل خفيفة', name_en: 'Light Structures' },
    ],
  },
  {
    id: 'wood',
    name_ar: 'الخشب',
    name_en: 'Wood',
    desc_ar: 'أبواب، مطابخ، خزائن، ديكور خشبي',
    desc_en: 'Doors, kitchens, cabinets, interior',
    icon: 'TreePine',
    subServices: [
      { id: 'wd_doors', name_ar: 'أبواب', name_en: 'Doors' },
      { id: 'wd_kitchens', name_ar: 'مطابخ', name_en: 'Kitchens' },
      { id: 'wd_cabinets', name_ar: 'خزائن', name_en: 'Cabinets' },
      { id: 'wd_interior', name_ar: 'أعمال داخلية', name_en: 'Interior Works' },
      { id: 'wd_decor', name_ar: 'أعمال ديكور', name_en: 'Decorative Works' },
    ],
  },
  {
    id: 'kitchens',
    name_ar: 'المطابخ',
    name_en: 'Kitchens',
    desc_ar: 'تصنيع وتركيب مطابخ بكافة الخامات',
    desc_en: 'Custom kitchens — all materials',
    icon: 'ChefHat',
    subServices: [
      { id: 'kt_classic', name_ar: 'كلاسيك', name_en: 'Classic' },
      { id: 'kt_modern', name_ar: 'مودرن', name_en: 'Modern' },
      { id: 'kt_polylac', name_ar: 'بولي لاك', name_en: 'Polylac' },
      { id: 'kt_acrylic', name_ar: 'أكريليك', name_en: 'Acrylic' },
      { id: 'kt_hpl', name_ar: 'HPL', name_en: 'HPL' },
    ],
  },
  {
    id: 'glass',
    name_ar: 'الزجاج',
    name_en: 'Glass',
    desc_ar: 'سكوريت، دبل جلاس، قواطع، مرايا',
    desc_en: 'Tempered, double-glazed, mirrors',
    icon: 'Square',
    subServices: [
      { id: 'gl_tempered', name_ar: 'سكوريت', name_en: 'Tempered' },
      { id: 'gl_double', name_ar: 'دبل جلاس', name_en: 'Double Glazed' },
      { id: 'gl_partitions', name_ar: 'قواطع', name_en: 'Partitions' },
      { id: 'gl_mirrors', name_ar: 'مرايا', name_en: 'Mirrors' },
      { id: 'gl_shower', name_ar: 'كبائن دش', name_en: 'Shower Cabins' },
    ],
  },
  {
    id: 'stainless_steel',
    name_ar: 'الستانلس ستيل',
    name_en: 'Stainless Steel',
    desc_ar: 'درابزين، أعمال مطابخ، تشطيبات',
    desc_en: 'Railings, kitchens, finishes',
    icon: 'ShieldCheck',
    subServices: [
      { id: 'ss_railings', name_ar: 'درابزين', name_en: 'Railings' },
      { id: 'ss_kitchen', name_ar: 'مطابخ ستانلس', name_en: 'Stainless Kitchens' },
      { id: 'ss_finishes', name_ar: 'تشطيبات', name_en: 'Finishes' },
    ],
  },
  {
    id: 'gypsum_decoration',
    name_ar: 'الجبس والديكور',
    name_en: 'Gypsum & Decoration',
    desc_ar: 'أسقف، فواصل، ديكورات داخلية',
    desc_en: 'Ceilings, partitions, interior',
    icon: 'PaintBucket',
    subServices: [
      { id: 'gd_ceilings', name_ar: 'أسقف معلقة', name_en: 'Suspended Ceilings' },
      { id: 'gd_partitions', name_ar: 'فواصل جبس', name_en: 'Gypsum Partitions' },
      { id: 'gd_decor', name_ar: 'ديكورات', name_en: 'Decorations' },
    ],
  },
  {
    id: 'facades',
    name_ar: 'الواجهات',
    name_en: 'Facades',
    desc_ar: 'كلادينج، HPL، GRC، حجر',
    desc_en: 'Cladding, HPL, GRC, stone',
    icon: 'LayoutGrid',
    subServices: [
      { id: 'fc_cladding', name_ar: 'كلادينج', name_en: 'Cladding' },
      { id: 'fc_hpl', name_ar: 'HPL', name_en: 'HPL' },
      { id: 'fc_grc', name_ar: 'GRC', name_en: 'GRC' },
      { id: 'fc_stone', name_ar: 'حجر طبيعي', name_en: 'Natural Stone' },
    ],
  },
  {
    id: 'fire_doors',
    name_ar: 'أبواب مقاومة للحريق',
    name_en: 'Fire-rated Doors',
    desc_ar: 'أبواب طوارئ معتمدة',
    desc_en: 'Certified emergency doors',
    icon: 'Flame',
    subServices: [
      { id: 'fd_60', name_ar: '60 دقيقة', name_en: '60-min rating' },
      { id: 'fd_90', name_ar: '90 دقيقة', name_en: '90-min rating' },
      { id: 'fd_120', name_ar: '120 دقيقة', name_en: '120-min rating' },
    ],
  },
  {
    id: 'site_factory_prep',
    name_ar: 'تجهيز المواقع والمصانع',
    name_en: 'Site & Factory Preparation',
    desc_ar: 'بنية تحتية، مكائن، خطوط إنتاج',
    desc_en: 'Infrastructure, machinery, lines',
    icon: 'HardHat',
    subServices: [
      { id: 'sp_infra', name_ar: 'بنية تحتية', name_en: 'Infrastructure' },
      { id: 'sp_machines', name_ar: 'مكائن', name_en: 'Machinery' },
      { id: 'sp_lines', name_ar: 'خطوط إنتاج', name_en: 'Production Lines' },
    ],
  },
  {
    id: 'design_services',
    name_ar: 'خدمات التصميم',
    name_en: 'Design Services',
    desc_ar: 'تصميم 2D / 3D، شوب درون',
    desc_en: '2D / 3D design, shop drawings',
    icon: 'PencilRuler',
    subServices: [
      { id: 'ds_2d', name_ar: 'تصميم 2D', name_en: '2D Design' },
      { id: 'ds_3d', name_ar: 'تصميم 3D', name_en: '3D Design' },
      { id: 'ds_shop', name_ar: 'شوب درون', name_en: 'Shop Drawings' },
    ],
  },
  {
    id: 'measurement_services',
    name_ar: 'خدمات المقاسات',
    name_en: 'Measurement Services',
    desc_ar: 'مقاسات معتمدة في الموقع',
    desc_en: 'Certified on-site measurements',
    icon: 'Ruler',
    subServices: [
      { id: 'ms_onsite', name_ar: 'مقاسات موقع', name_en: 'On-site' },
      { id: 'ms_laser', name_ar: 'مقاسات ليزر', name_en: 'Laser Measurements' },
    ],
  },
  {
    id: 'maintenance_services',
    name_ar: 'خدمات الصيانة',
    name_en: 'Maintenance',
    desc_ar: 'صيانة دورية وعقود سنوية',
    desc_en: 'Periodic and annual contracts',
    icon: 'Settings2',
    subServices: [
      { id: 'mt_periodic', name_ar: 'صيانة دورية', name_en: 'Periodic' },
      { id: 'mt_emergency', name_ar: 'صيانة طارئة', name_en: 'Emergency' },
      { id: 'mt_annual', name_ar: 'عقد سنوي', name_en: 'Annual Contract' },
    ],
  },
];

export function getSectorById(id: SectorId): OnboardingSector | undefined {
  return ONBOARDING_SECTORS.find((s) => s.id === id);
}

export interface SubServiceWithSector extends SubService {
  sector_id: SectorId;
  sector_name_ar: string;
  sector_name_en: string;
}

export function findSubServiceById(id: string): SubServiceWithSector | undefined {
  for (const sector of ONBOARDING_SECTORS) {
    const sub = sector.subServices.find((s) => s.id === id);
    if (sub) {
      return {
        ...sub,
        sector_id: sector.id,
        sector_name_ar: sector.name_ar,
        sector_name_en: sector.name_en,
      };
    }
  }
  return undefined;
}