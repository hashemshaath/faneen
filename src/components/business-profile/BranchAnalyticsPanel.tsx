import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Eye, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLocalizedValue } from "@/lib/direction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BranchLite {
  id: string;
  name_ar?: string | null;
  name_en?: string | null;
  slug?: string | null;
}

interface Visit {
  id: string;
  branch_id: string;
  event_type: "view" | "phone_reveal" | "whatsapp_click" | "share" | "favorite";
  created_at: string;
}

interface Props {
  businessId: string;
  branches: BranchLite[];
}

const EVENT_META = {
  view: { icon: Eye, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", ar: "مشاهدة", en: "View" },
  phone_reveal: { icon: Phone, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ar: "اتصال", en: "Call" },
  whatsapp_click: { icon: MessageCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", ar: "واتساب", en: "WhatsApp" },
  share: { icon: MapPin, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", ar: "خرائط/مشاركة", en: "Map/Share" },
  favorite: { icon: Share2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", ar: "مفضلة", en: "Favorite" },
} as const;

/**
 * Owner-only panel — aggregates `branch_visits` for the last 30 days by
 * branch + event_type and shows a recent activity timeline.
 * RLS limits reads to admin or `businesses.user_id = auth.uid()`.
 */
export function BranchAnalyticsPanel({ businessId, branches }: Props) {
  const { language, isRTL } = useLanguage();

  const { data: visits = [], isLoading } = useQuery<Visit[]>({
    queryKey: ["branch-analytics", businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("branch_visits")
        .select("id, branch_id, event_type, created_at")
        .eq("business_id", businessId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Visit[];
    },
  });

  const byBranch = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const v of visits) {
      if (!map.has(v.branch_id)) map.set(v.branch_id, {});
      const row = map.get(v.branch_id)!;
      row[v.event_type] = (row[v.event_type] ?? 0) + 1;
    }
    return map;
  }, [visits]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const v of visits) t[v.event_type] = (t[v.event_type] ?? 0) + 1;
    return t;
  }, [visits]);

  const branchName = (id: string) => {
    const b = branches.find((x) => x.id === id);
    if (!b) return id.slice(0, 6);
    return getLocalizedValue(language, b.name_ar, b.name_en);
  };

  const recent = visits.slice(0, 10);
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <Card className="mb-6 border-accent/20" dir={isRTL ? "rtl" : "ltr"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-accent" />
          {language === "ar" ? "تحليلات الفروع — آخر 30 يومًا" : "Branch analytics — last 30 days"}
          <Badge variant="outline" className="ms-auto text-[10px] font-normal text-muted-foreground">
            {language === "ar" ? "خاص بالمالك" : "Owner only"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(EVENT_META) as Array<keyof typeof EVENT_META>).map((k) => {
            const meta = EVENT_META[k];
            const Icon = meta.icon;
            return (
              <div key={k} className={cn("rounded-xl border border-border/40 p-3", meta.bg)}>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                  <span>{language === "ar" ? meta.ar : meta.en}</span>
                </div>
                <div className={cn("mt-1 text-lg font-bold tech-content", meta.color)}>
                  {(totals[k] ?? 0).toLocaleString("en-US")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Per-branch breakdown */}
        {byBranch.size > 0 && (
          <div className="overflow-hidden rounded-xl border border-border/40">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">
                    {language === "ar" ? "الفرع" : "Branch"}
                  </th>
                  {(Object.keys(EVENT_META) as Array<keyof typeof EVENT_META>).map((k) => (
                    <th key={k} className="px-2 py-2 text-center font-medium">
                      {language === "ar" ? EVENT_META[k].ar : EVENT_META[k].en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(byBranch.entries()).map(([bid, row]) => (
                  <tr key={bid} className="border-t border-border/30">
                    <td className="px-3 py-2 font-medium">{branchName(bid)}</td>
                    {(Object.keys(EVENT_META) as Array<keyof typeof EVENT_META>).map((k) => (
                      <td key={k} className="px-2 py-2 text-center tech-content">
                        {row[k] ? row[k].toLocaleString("en-US") : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent timeline */}
        {recent.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
              {language === "ar" ? "آخر الأحداث" : "Recent events"}
            </h4>
            <ul className="space-y-1.5">
              {recent.map((v) => {
                const meta = EVENT_META[v.event_type];
                const Icon = meta.icon;
                return (
                  <li key={v.id} className="flex items-center gap-2 text-xs">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
                    <span className="font-medium">{language === "ar" ? meta.ar : meta.en}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate">{branchName(v.branch_id)}</span>
                    <span className="ms-auto shrink-0 tech-content text-muted-foreground">{fmtTime(v.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!isLoading && visits.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {language === "ar" ? "لا توجد بيانات زيارات بعد." : "No visit data yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default BranchAnalyticsPanel;