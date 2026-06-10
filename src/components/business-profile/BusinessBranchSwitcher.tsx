import { useNavigate } from "react-router-dom";
import { GitBranch, MapPin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue } from "@/lib/direction";
import { cn } from "@/lib/utils";

/**
 * Compact branch switcher rendered above the profile tabs. Lets the visitor
 * jump between the main business view (`/{username}`) and any specific
 * branch (`/{username}/{slug}`) without leaving the profile context.
 *
 * Pure presentation — receives the already-fetched branches list from the
 * parent so we don't trigger an extra query.
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
  username: string;
  branches: BusinessBranchSwitcherBranch[];
  currentBranchSlug?: string;
}

export const BusinessBranchSwitcher = ({ username, branches, currentBranchSlug }: Props) => {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Only render when there's at least one navigable branch.
  const navigable = branches.filter((b) => !!b.slug);
  if (navigable.length === 0) return null;

  const labelMain = isRTL ? "المركز الرئيسي" : "Head office";
  const labelFor = (b: BusinessBranchSwitcherBranch) => {
    const name = getLocalizedValue(language, b.name_ar, b.name_en);
    if (b.is_main) return isRTL ? `المركز الرئيسي · ${name}` : `Head office · ${name}`;
    return isRTL ? `${b.region ? `${b.region} — ` : ""}فرع ${name}` : `${b.region ? `${b.region} — ` : ""}${name} branch`;
  };

  const go = (slug?: string) => {
    navigate(slug ? `/${username}/${slug}` : `/${username}`);
  };

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
          onClick={() => go(undefined)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors sm:text-xs",
            !currentBranchSlug
              ? "border-accent bg-accent/10 text-accent"
              : "border-border/40 text-muted-foreground hover:border-accent/30",
          )}
        >
          <MapPin className="h-3 w-3" />
          {labelMain}
        </button>
        {navigable.map((b) => {
          const active = currentBranchSlug === b.slug;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => go(b.slug || undefined)}
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