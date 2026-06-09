import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { ChevronLeft, ChevronRight, Plus, Edit, Sparkles, Tag, FolderTree, Search } from 'lucide-react';
import { getTaxonomyIcon } from '../icon-map';
import type { TaxonomyCategory, TaxonomyType } from '../types';

/**
 * Industrial Sectors Hub — the heart of the new taxonomy center.
 *
 * Renders a beautiful card grid for the 11 core industrial sectors
 * (Aluminum, Glass, Iron & Steel, Stainless, Wood, Kitchens, UPVC,
 * Facades, Fire Doors, Gates/Hangars, Wardrobes), each with its own
 * brand color, Lucide icon, bilingual descriptions, child sub-sectors,
 * SEO completeness signal and one-click drill-in to manage its tree.
 *
 * Reads directly from the `sector` taxonomy type. No popups: drill-in
 * is a fullscreen inline panel.
 */

interface Props {
  types: TaxonomyType[];
  categories: TaxonomyCategory[];
  onEdit: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onNewRoot: () => void;
}

function completeness(c: TaxonomyCategory): number {
  let score = 0;
  if (c.description_ar) score += 25;
  if (c.description_en) score += 15;
  if (c.seo_title_ar && c.seo_description_ar) score += 25;
  if ((c.keywords_ar?.length ?? 0) >= 5) score += 20;
  if (c.icon && c.color) score += 15;
  return Math.min(100, score);
}

export const IndustrialSectorsHub: React.FC<Props> = ({ types, categories, onEdit, onAddChild, onNewRoot }) => {
  const { isRTL } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const sectorType = types.find((t) => t.code === 'sector');

  const roots = useMemo(() => {
    if (!sectorType) return [];
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => c.taxonomy_type_id === sectorType.id && !c.parent_id && !c.is_archived)
      .filter((c) => !q || c.name_ar.toLowerCase().includes(q) || (c.name_en ?? '').toLowerCase().includes(q) || c.slug.includes(q))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [categories, sectorType, query]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, TaxonomyCategory[]>();
    categories.forEach((c) => {
      if (!c.parent_id) return;
      const arr = m.get(c.parent_id) ?? [];
      arr.push(c);
      m.set(c.parent_id, arr);
    });
    m.forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return m;
  }, [categories]);

  const opened = openId ? roots.find((r) => r.id === openId) ?? categories.find((c) => c.id === openId) ?? null : null;

  if (opened) {
    const Icon = getTaxonomyIcon(opened.icon);
    const children = childrenByParent.get(opened.id) ?? [];
    const color = opened.color ?? '#3B82F6';
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {isRTL ? 'العودة لجميع القطاعات' : 'Back to all sectors'}
        </button>

        <header
          className="rounded-2xl border border-border p-6 flex flex-wrap items-start gap-5"
          style={{ background: `linear-gradient(135deg, ${color}14, transparent 60%)` }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: color + '22', color }}
          >
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-extrabold text-2xl" dir="auto">
                {isRTL ? opened.name_ar : opened.name_en ?? opened.name_ar}
              </h2>
              <Badge variant="outline" className="tech-content text-[10px]">{opened.slug}</Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl" dir="auto">
              {isRTL ? opened.description_ar : opened.description_en ?? opened.description_ar}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(isRTL ? opened.keywords_ar : opened.keywords_en)?.slice(0, 10).map((k) => (
                <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">{k}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" className="h-9 rounded-xl gap-1.5" onClick={() => onAddChild(opened.id)}>
              <Plus className="w-4 h-4" />
              {isRTL ? 'تخصص فرعي' : 'Sub-specialty'}
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5" onClick={() => onEdit(opened.id)}>
              <Edit className="w-4 h-4" />
              {isRTL ? 'تحرير المحتوى' : 'Edit content'}
            </Button>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="font-heading font-bold text-sm flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              {isRTL ? `التخصصات الفرعية (${children.length})` : `Sub-specialties (${children.length})`}
            </div>
          </div>
          {children.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {isRTL ? 'لا توجد تخصصات فرعية بعد. أضف أول تخصص.' : 'No sub-specialties yet. Add the first one.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {children.map((ch) => {
                const Ci = getTaxonomyIcon(ch.icon);
                const cColor = ch.color ?? color;
                return (
                  <li
                    key={ch.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: cColor + '1A', color: cColor }}
                    >
                      <Ci className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" dir="auto">{isRTL ? ch.name_ar : ch.name_en ?? ch.name_ar}</div>
                      <div className="text-xs text-muted-foreground truncate" dir="auto">
                        {(isRTL ? ch.short_description_ar : ch.short_description_en) ?? ch.slug}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => onEdit(ch.id)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading font-extrabold text-xl">
            {isRTL ? 'القطاعات الصناعية' : 'Industrial sectors'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'كل قطاع مستقل بمحتواه وتخصصاته الفرعية وماركاته — اضغط على البطاقة لإدارة شجرة القطاع.'
              : 'Each sector is independent — its own content, sub-specialties and brands. Tap a card to manage its tree.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث عن قطاع…' : 'Search sector…'}
              className="h-10 rounded-xl border border-border bg-card px-9 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir="auto"
            />
          </div>
          <Button className="h-10 rounded-xl gap-1.5" onClick={onNewRoot}>
            <Plus className="w-4 h-4" />
            {isRTL ? 'قطاع جديد' : 'New sector'}
          </Button>
        </div>
      </header>

      {roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد قطاعات بعد.' : 'No sectors yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {roots.map((s) => {
            const Icon = getTaxonomyIcon(s.icon);
            const color = s.color ?? '#3B82F6';
            const children = childrenByParent.get(s.id) ?? [];
            const score = completeness(s);
            return (
              <article
                key={s.id}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover-lift focus-within:ring-2 focus-within:ring-primary/30 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  className="w-full text-start p-5 space-y-3"
                  aria-label={isRTL ? `إدارة قطاع ${s.name_ar}` : `Manage ${s.name_en ?? s.name_ar} sector`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: color + '1F', color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading font-bold text-base leading-tight truncate" dir="auto">
                        {isRTL ? s.name_ar : s.name_en ?? s.name_ar}
                      </div>
                      <div className="text-[11px] text-muted-foreground tech-content">{s.slug}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] tech-content">
                      {children.length} {isRTL ? 'تخصص' : 'subs'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]" dir="auto">
                    {(isRTL ? s.short_description_ar : s.short_description_en) ?? ''}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Sparkles className="w-3 h-3" style={{ color }} />
                      <span>{isRTL ? 'اكتمال المحتوى' : 'Content score'}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, background: color }}
                        />
                      </div>
                      <span className="tech-content text-[11px] font-bold" style={{ color }}>{score}%</span>
                    </div>
                  </div>
                </button>
                <div className="px-5 pb-4 flex items-center gap-2 border-t border-border/50 pt-3">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg flex-1 gap-1.5" onClick={() => onAddChild(s.id)}>
                    <Plus className="w-3.5 h-3.5" />
                    {isRTL ? 'تخصص' : 'Add sub'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1.5" onClick={() => onEdit(s.id)}>
                    <Edit className="w-3.5 h-3.5" />
                    {isRTL ? 'تحرير' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1" onClick={() => setOpenId(s.id)} aria-label="open">
                    <Tag className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IndustrialSectorsHub;