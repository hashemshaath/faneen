/**
 * Template category configuration for the contract creation flow.
 * Maps category key → display labels, icon, and badge color.
 */
import {
  PanelTop,
  Hammer,
  Flame,
  Factory,
  TreePine,
  Grid3X3,
  Home,
  Layers,
  Wrench,
  GlassWater,
} from 'lucide-react';
import type React from 'react';

export interface TemplateCategoryConfig {
  ar: string;
  en: string;
  icon: React.ElementType;
  color: string;
}

export const templateCategoryConfig: Record<string, TemplateCategoryConfig> = {
  aluminum_doors_windows: { ar: 'ألمنيوم أبواب وشبابيك', en: 'Aluminum Doors & Windows', icon: PanelTop, color: 'text-info bg-info/10' },
  iron_doors_windows: { ar: 'حديد أبواب وشبابيك', en: 'Iron Doors & Windows', icon: Hammer, color: 'text-slate-600 bg-slate-500/10' },
  fire_doors: { ar: 'أبواب مقاومة للحريق', en: 'Fire-Rated Doors', icon: Flame, color: 'text-destructive bg-destructive/10' },
  gates_structures: { ar: 'بوابات ومظلات وهناجر', en: 'Gates & Structures', icon: Factory, color: 'text-warning bg-warning/10' },
  wood_doors: { ar: 'أبواب خشبية', en: 'Wood Doors', icon: TreePine, color: 'text-success bg-success/10' },
  kitchens: { ar: 'مطابخ', en: 'Kitchens', icon: Grid3X3, color: 'text-secondary bg-secondary/10' },
  facades: { ar: 'واجهات', en: 'Facades', icon: Home, color: 'text-info bg-info/10' },
  wardrobes_closets: { ar: 'خزائن ودواليب', en: 'Wardrobes & Closets', icon: Layers, color: 'text-destructive bg-destructive/10' },
  upvc: { ar: 'UPVC أبواب وشبابيك', en: 'UPVC Doors & Windows', icon: Wrench, color: 'text-success bg-success/10' },
  glass_securit: { ar: 'زجاج وسيكوريت', en: 'Glass & Securit', icon: GlassWater, color: 'text-info bg-info/10' },
};
