import { useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { searchAdminBusinessesLite } from "@/modules/businesses/services/searchAdminBusinessesLite";
import { BusinessVisibilityEditor } from "@/components/business-profile/BusinessVisibilityEditor";
import { usePageMeta } from "@/hooks/usePageMeta";

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
    <div className="container-app py-6" dir={isRTL ? "rtl" : "ltr"}>
      <header className="mb-5 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isRTL ? "إعدادات ظهور البروفايلات (أدمن)" : "Profile visibility (Admin)"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "تعديل وقفل أي قسم في أي بروفايل جهة. الأقسام المقفلة لا يستطيع المالك تعديلها."
              : "Override and lock any section of any business profile. Locked sections cannot be edited by owners."}
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-border/40 bg-card/60 p-3 dark:bg-card/30">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRTL ? "ابحث بالاسم أو المعرف" : "Search by name or ref"}
              className="h-10 w-full rounded-lg border border-border/60 bg-background pe-3 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              dir="auto"
            />
          </div>

          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
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
                  className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-start transition-colors ${
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
            <div className="rounded-2xl border border-dashed border-border/40 bg-card/30 p-12 text-center text-sm text-muted-foreground">
              {isRTL ? "اختر جهة من القائمة" : "Pick a business from the list"}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 bg-card/60 p-4 dark:bg-card/30">
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