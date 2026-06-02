import { useState } from "react";
import { Lock, ShieldCheck, Eye, EyeOff, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LEVEL_LABELS,
  PROFILE_SECTIONS,
  SECTION_LABELS,
  useBusinessVisibility,
  useUpdateVisibility,
  type ProfileSectionKey,
  type VisibilityLevel,
} from "./business-profile.visibility";

const LEVEL_ICONS: Record<VisibilityLevel, React.ElementType> = {
  public: Eye,
  members_only: Users,
  after_request: MessageSquare,
  hidden: EyeOff,
};

const LEVEL_COLOR: Record<VisibilityLevel, string> = {
  public: "text-emerald-600 dark:text-emerald-400",
  members_only: "text-blue-600 dark:text-blue-400",
  after_request: "text-amber-600 dark:text-amber-400",
  hidden: "text-rose-600 dark:text-rose-400",
};

interface Props {
  businessId: string;
  /** When true the editor allows toggling the admin-lock per section and editing admin notes. */
  isAdmin?: boolean;
}

/**
 * Inline (no-popup) editor — renders a row per profile section with a level
 * selector. Admins additionally see a "Lock" toggle and a note field per row.
 */
export const BusinessVisibilityEditor = ({ businessId, isAdmin = false }: Props) => {
  const { language, isRTL } = useLanguage();
  const { data, isLoading } = useBusinessVisibility(businessId);
  const update = useUpdateVisibility(businessId);
  const [savingKey, setSavingKey] = useState<ProfileSectionKey | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const handleChange = async (
    section: ProfileSectionKey,
    level: VisibilityLevel,
    extra: { lockedByAdmin?: boolean; adminNote?: string | null } = {},
  ) => {
    setSavingKey(section);
    try {
      await update.mutateAsync({ section, level, ...extra });
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `فشل الحفظ: ${msg}` : `Failed to save: ${msg}`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-2" dir={isRTL ? "rtl" : "ltr"}>
      {PROFILE_SECTIONS.map((section) => {
        const level = data.levels[section];
        const locked = !!data.locks[section];
        const Icon = LEVEL_ICONS[level];
        const editable = isAdmin || !locked;
        return (
          <div
            key={section}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-3 hover-lift dark:bg-card/30"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className={`h-4 w-4 ${LEVEL_COLOR[level]}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {language === "ar" ? SECTION_LABELS[section].ar : SECTION_LABELS[section].en}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {language === "ar" ? LEVEL_LABELS[level].ar : LEVEL_LABELS[level].en}
                </p>
              </div>
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <Lock className="h-3 w-3" />
                  {language === "ar" ? "مقفول" : "Locked"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                disabled={!editable || savingKey === section}
                value={level}
                onChange={(e) => handleChange(section, e.target.value as VisibilityLevel)}
                className="h-9 rounded-lg border border-border/60 bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              >
                {(Object.keys(LEVEL_LABELS) as VisibilityLevel[]).map((lv) => (
                  <option key={lv} value={lv}>
                    {language === "ar" ? LEVEL_LABELS[lv].ar : LEVEL_LABELS[lv].en}
                  </option>
                ))}
              </select>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    handleChange(section, level, { lockedByAdmin: !locked })
                  }
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                    locked
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                  title={language === "ar" ? "قفل من قبل الأدمن" : "Admin lock"}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  {language === "ar" ? (locked ? "مقفول" : "قفل") : locked ? "Locked" : "Lock"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BusinessVisibilityEditor;