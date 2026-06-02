import { useEffect, useState } from "react";
import { Eye, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { listOwnerBusinesses } from "@/modules/businesses/services/listOwnerBusinesses";
import { BusinessVisibilityEditor } from "@/components/business-profile/BusinessVisibilityEditor";

interface OwnedBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
}

/** Owner-facing inline editor for profile section visibility. */
const DashboardBusinessVisibility = () => {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [businesses, setBusinesses] = useState<OwnedBusiness[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await listOwnerBusinesses<OwnedBusiness>({
        userId: user.id,
        select: "id, name_ar, name_en, username",
        orderBy: { column: "created_at", ascending: false },
      });
      if (cancelled) return;
      const list = (data ?? []) as OwnedBusiness[];
      setBusinesses(list);
      setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!businesses) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {isRTL
            ? "لا توجد جهات مرتبطة بحسابك. أضف جهة أولاً."
            : "No businesses linked to your account. Create one first."}
        </p>
      </div>
    );
  }

  const selected = businesses.find((b) => b.id === selectedId) ?? businesses[0];

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4 dark:bg-card/30">
        <h2 className="mb-1 text-base font-semibold text-foreground">
          {isRTL ? "إعدادات ظهور أقسام البروفايل" : "Profile section visibility"}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {isRTL
            ? "تحكم بمن يستطيع رؤية كل قسم من بروفايلك العام. الأقسام المقفلة من قبل الأدمن لا يمكن تعديلها."
            : "Control who can see each section of your public profile. Sections locked by admin cannot be edited."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {businesses.length > 1 && (
            <select
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-10 rounded-lg border border-border/60 bg-background px-3 text-sm"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {language === "ar" ? b.name_ar || b.name_en || b.username : b.name_en || b.name_ar || b.username}
                </option>
              ))}
            </select>
          )}
          {selected.username && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/${selected.username}`} target="_blank" rel="noreferrer" className="gap-1.5">
                <Eye className="h-4 w-4" />
                {isRTL ? "معاينة البروفايل" : "Preview profile"}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <BusinessVisibilityEditor businessId={selected.id} />
    </div>
  );
};

export default DashboardBusinessVisibility;