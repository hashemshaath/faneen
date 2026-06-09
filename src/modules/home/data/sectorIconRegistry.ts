/**
 * sectorIconRegistry — whitelist of Lucide icons selectable by admins for
 * HomeSectorGrid tiles. Keeping a fixed list (vs `lucide-react/dynamic`)
 * lets the bundle tree-shake and keeps the icon picker UI small.
 *
 * To add a new option, import the icon here and append to SECTOR_ICONS.
 */
import {
  Square, Layers, Hammer, Sparkles, TreePine, ChefHat, Building2,
  MoveVertical, SunMedium, Wifi, ShieldCheck, Truck, Paintbrush, Wrench,
  Package, DraftingCompass, HardHat, PanelsTopLeft, Utensils, Zap,
  Boxes, Cpu, Cog, Factory, Lightbulb,
  type LucideIcon,
} from 'lucide-react';

export const SECTOR_ICONS: Record<string, LucideIcon> = {
  Square, Layers, Hammer, Sparkles, TreePine, ChefHat, Building2,
  MoveVertical, SunMedium, Wifi, ShieldCheck, Truck, Paintbrush, Wrench,
  Package, DraftingCompass, HardHat, PanelsTopLeft, Utensils, Zap,
  Boxes, Cpu, Cog, Factory, Lightbulb,
};

export const SECTOR_ICON_NAMES = Object.keys(SECTOR_ICONS);

export function resolveSectorIcon(name: string | null | undefined, fallback: LucideIcon): LucideIcon {
  if (!name) return fallback;
  return SECTOR_ICONS[name] ?? fallback;
}