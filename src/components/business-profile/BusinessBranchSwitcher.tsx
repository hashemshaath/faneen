import { GitBranch, MapPin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue } from "@/lib/direction";
import { cn } from "@/lib/utils";

/**
 * Compact branch switcher rendered above the profile tabs. It only changes
 * the selected branch in local page state — no navigation, route mutation or
 * hard reload — so `/{username}` remains the stable profile URL.
 */
export interface BusinessBranchSwitcherBranch {
  id: string;
  slug?: string | null;
  name_ar: string;
  name_en?: string | null;
  region?: string | null;
  is_main?: boolean | null;
}

interface Props {
  branches: BusinessBranchSwitcherBranch[];
  currentBranchId?: string | null;
  onSelect: (branch: BusinessBranchSwitcherBranch | null) => void;
}

export const BusinessBranchSwitcher = ({ branches, currentBranchId, onSelect }: Props) => {
  const { language, isRTL } = useLanguage();

  if (branches.length === 0) return null;

  const labelMain = isRTL ? "المركز الرئيسي" : "Head office";
  const labelFor = (b: BusinessBranchSwitcherBranch) => {
    const name = getLocalizedValue(language, b.name_ar, b.name_en);
    if (b.is_main) return isRTL ? `المركز الرئيسي · ${name}` : `Head office · ${name}`;
    return isRTL ? `${b.region ? `${b.region} — ` : ""}فرع ${name}` : `${b.region ? `${b.region} — ` : ""}${name} branch`;
  };

  const go = (b: BusinessBranchSwitcherBranch | null) => onSelect(b);

  return (
    <nav
      aria-label={isRTL ? "اختر الفرع" : "Choose branch"}
      className="mb-3 sm:mb-4 -mx-1.5 sm:-mx-3 overflow-x-auto no-scrollbar"
    >
      <div className="flex items-center gap-1.5 px-1.5 sm:px-3 py-1">
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
          <GitBranch className="h-3.5 w-3.5 text-accent" />
          {isRTL ? "الفروع:" : "Branches:"}
        </span>
        <button
          type="button"
          onClick={() => go(null)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors sm:text-xs",
            !currentBranchId
              ? "border-accent bg-accent/10 text-accent"
              : "border-border/40 text-muted-foreground hover:border-accent/30",
          )}
        >
          <MapPin className="h-3 w-3" />
          {labelMain}
        </button>
        {branches.map((b) => {
          const active = currentBranchId === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => go(b)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors sm:text-xs",
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border/40 text-muted-foreground hover:border-accent/30",
              )}
            >
              <MapPin className="h-3 w-3" />
              <span dir="auto">{labelFor(b)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BusinessBranchSwitcher;