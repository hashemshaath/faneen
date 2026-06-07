import { useLanguage } from '@/i18n/LanguageContext';
import type { TaxonomyType, TaxonomyCategory } from '../types';

/**
 * Groups raw taxonomy_types into 8 friendly buckets so the admin sees
 * "Entities / Activities / Products …" instead of 15 technical codes.
 * Unknown codes fall into "other" so adding a new type never breaks the UI.
 */
export type TaxonomyGroupKey =
  | 'all'
  | 'entities'
  | 'activities'
  | 'services'
  | 'products'
  | 'contracts'
  | 'equipment'
  | 'seo'
  | 'other';

const GROUP_CODES: Record<Exclude<TaxonomyGroupKey, 'all' | 'other'>, string[]> = {
  entities: ['business_type', 'entity_type', 'organization_type'],
  activities: ['sector', 'primary_activity', 'secondary_activity', 'industry'],
  services: ['service', 'service_category', 'sub_service'],
  products: ['product_category', 'product_type', 'material_type', 'material'],
  contracts: ['contract_type', 'payment_type', 'invoice_type'],
  equipment: ['equipment_type', 'document_type', 'certification_type'],
  seo: ['seo_group', 'search_tag', 'keyword_group'],
};

export function classifyTaxonomyType(code: string | null | undefined): TaxonomyGroupKey {
  if (!code) return 'other';
  const c = code.toLowerCase();
  for (const [k, arr] of Object.entries(GROUP_CODES) as Array<[
    Exclude<TaxonomyGroupKey, 'all' | 'other'>,
    string[]
  ]>) {
    if (arr.includes(c)) return k;
  }
  return 'other';
}

interface Props {
  value: TaxonomyGroupKey;
  onChange: (g: TaxonomyGroupKey) => void;
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
}

export const TaxonomyTypeChips: React.FC<Props> = ({ value, onChange, types, categories }) => {
  const { isRTL } = useLanguage();

  const groups: Array<{ key: TaxonomyGroupKey; ar: string; en: string }> = [
    { key: 'all', ar: 'الكل', en: 'All' },
    { key: 'entities', ar: 'أنواع الجهات', en: 'Entities' },
    { key: 'activities', ar: 'الأنشطة والقطاعات', en: 'Activities' },
    { key: 'services', ar: 'الخدمات', en: 'Services' },
    { key: 'products', ar: 'المنتجات والمواد', en: 'Products' },
    { key: 'contracts', ar: 'العقود والدفعات', en: 'Contracts' },
    { key: 'equipment', ar: 'المعدات والمستندات', en: 'Equipment' },
    { key: 'seo', ar: 'SEO والبحث', en: 'SEO' },
    { key: 'other', ar: 'أخرى', en: 'Other' },
  ];

  const typeGroup = new Map(types.map((t) => [t.id, classifyTaxonomyType(t.code)] as const));
  const counts = new Map<TaxonomyGroupKey, number>();
  categories.forEach((c) => {
    const g = typeGroup.get(c.taxonomy_type_id) ?? 'other';
    counts.set(g, (counts.get(g) ?? 0) + 1);
    counts.set('all', (counts.get('all') ?? 0) + 1);
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map((g) => {
        const n = counts.get(g.key) ?? 0;
        if (g.key !== 'all' && n === 0) return null;
        const active = value === g.key;
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onChange(g.key)}
            className={`px-3 h-8 rounded-full text-xs font-medium transition-colors border ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted/50'
            }`}
          >
            <span>{isRTL ? g.ar : g.en}</span>
            <span className={`ms-1.5 tech-content ${active ? 'opacity-90' : 'text-muted-foreground'}`}>
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
};