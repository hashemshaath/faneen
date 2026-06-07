import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { searchAdminBusinessesLite } from "@/modules/businesses/services/searchAdminBusinessesLite";
import { BusinessVisibilityEditor } from "@/components/business-profile/BusinessVisibilityEditor";
import { usePageMeta } from "@/hooks/usePageMeta";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminFiltersBar } from "@/components/admin/AdminFiltersBar";

interface BusinessLite {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  ref_id: string | null;
}

/** Admin-only inline editor with section locking. Used by Approvals Center & direct route. */
const AdminBusinessVisibility = () => {
  const { language, isRTL } = useLanguage();
  usePageMeta({ title: "Admin · Profile visibility", noindex: true });

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BusinessLite[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await searchAdminBusinessesLite({ query, limit: 50 });
      if (cancelled) return;
      setRows((data ?? []) as BusinessLite[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const selected = useMemo(
    () => rows?.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  return (
    <div className="container-app py-6 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <AdminPageHeader
        icon={ShieldAlert}
        tone="warning"
        title={isRTL ? "إعدادات ظهور البروفايلات" : "Profile visibility"}
        subtitle={
          isRTL
            ? "تعديل وقفل أي قسم في أي بروفايل جهة. الأقسام المقفلة لا يستطيع المالك تعديلها."
            : "Override and lock any section of any business profile. Locked sections cannot be edited by owners."
        }
        eyebrow={isRTL ? "أدمن" : "Admin"}
      />

      <div className="grid gap-5 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-3">
          <AdminFiltersBar
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder={isRTL ? "ابحث بالاسم أو المعرف" : "Search by name or ref"}
          />
          <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-3xl border border-border/60 bg-card/60 p-2 dark:bg-card/30">
            {!rows && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            {rows?.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {isRTL ? "لا توجد نتائج" : "No results"}
              </p>
            )}
            {rows?.map((b) => {
              const active = b.id === selectedId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-start transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="truncate text-sm font-medium">
                    {language === "ar"
                      ? b.name_ar || b.name_en || b.username
                      : b.name_en || b.name_ar || b.username}
                  </span>
                  <span className="tech-content text-[10px] text-muted-foreground">
                    {b.ref_id || b.username || b.id.slice(0, 8)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          {!selected ? (
            <div className="rounded-3xl border border-dashed border-border/60 bg-card/30 p-12 text-center text-sm text-muted-foreground">
              {isRTL ? "اختر جهة من القائمة" : "Pick a business from the list"}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-card/60 p-4 dark:bg-card/30 shadow-sm">
                <h2 className="text-base font-semibold">
                  {language === "ar"
                    ? selected.name_ar || selected.name_en || selected.username
                    : selected.name_en || selected.name_ar || selected.username}
                </h2>
                <p className="tech-content text-xs text-muted-foreground">
                  {selected.ref_id || selected.username}
                </p>
              </div>
              <BusinessVisibilityEditor businessId={selected.id} isAdmin />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminBusinessVisibility;