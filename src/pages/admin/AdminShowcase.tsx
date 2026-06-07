import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import { toast } from "sonner";
import { Check, X, ShieldCheck, ShieldAlert, ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery as useRq } from "@tanstack/react-query";
import {
  getShowcaseTaxonomyCategories,
} from "@/modules/taxonomy/showcase-services";

interface Row {
  id: string;
  business_id: string;
  kind: "logo" | "work";
  title_ar: string | null;
  title_en: string | null;
  image_url: string;
  link_url: string | null;
  sector_slug: string | null;
  taxonomy_category_id: string | null;
  status: "pending" | "approved" | "rejected";
  rejected_reason: string | null;
  created_at: string;
  business: {
    id: string;
    name_ar: string | null;
    name_en: string | null;
    is_verified: boolean | null;
    username: string | null;
  } | null;
}

type Tab = "pending" | "approved" | "rejected";

const AdminShowcase: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [reason, setReason] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["admin-showcase", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_submissions")
        .select(
          "id, business_id, kind, title_ar, title_en, image_url, link_url, sector_slug, taxonomy_category_id, status, rejected_reason, created_at, business:businesses(id, name_ar, name_en, is_verified, username)",
        )
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const taxonomyOptionsQ = useRq({
    queryKey: ["showcase-taxonomy-options"],
    queryFn: getShowcaseTaxonomyCategories,
    staleTime: 5 * 60_000,
  });
  const taxonomyOptions = taxonomyOptionsQ.data ?? [];

  const setCategory = useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string | null }) => {
      const { error } = await supabase
        .from("showcase_submissions")
        .update({
          taxonomy_category_id: categoryId,
          // Legacy `sector_slug` is intentionally NOT written from the new
          // taxonomy-only admin UI; preserved on table for backward reads.
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-showcase"] });
      toast.success("تم تحديث التصنيف");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "فشل تحديث التصنيف"),
  });

  const counts = useQuery({
    queryKey: ["admin-showcase-counts"],
    queryFn: async () => {
      const result: Record<Tab, number> = { pending: 0, approved: 0, rejected: 0 };
      for (const s of ["pending", "approved", "rejected"] as Tab[]) {
        const { count } = await supabase
          .from("showcase_submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", s);
        result[s] = count ?? 0;
      }
      return result;
    },
    refetchInterval: 30000,
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("showcase_submissions")
        .update({
          status: "approved",
          rejected_reason: null,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-showcase"] });
      void qc.invalidateQueries({ queryKey: ["admin-showcase-counts"] });
      toast.success("تم الاعتماد");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "فشل"),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const r = (reason[id] || "").trim();
      if (!r) throw new Error("اكتب سبب الرفض");
      const { error } = await supabase
        .from("showcase_submissions")
        .update({
          status: "rejected",
          rejected_reason: r,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      setReason((s) => ({ ...s, [id]: "" }));
      void qc.invalidateQueries({ queryKey: ["admin-showcase"] });
      void qc.invalidateQueries({ queryKey: ["admin-showcase-counts"] });
      toast.success("تم الرفض");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "فشل"),
  });

  const tabs: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: "pending",  label: `قيد المراجعة (${counts.data?.pending ?? 0})` },
      { id: "approved", label: `منشورة (${counts.data?.approved ?? 0})` },
      { id: "rejected", label: `مرفوضة (${counts.data?.rejected ?? 0})` },
    ],
    [counts.data],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <header className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-semibold">مراجعة الواجهة المرجعية</h1>
        </header>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} onClick={() => setTab(t.id)}>
              {t.label}
            </Button>
          ))}
        </div>

        {query.isLoading ? (
          <Skeleton className="h-40" />
        ) : (query.data ?? []).length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">لا توجد عناصر في هذا التبويب.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {query.data!.map((row) => {
              const name = row.business?.name_ar || row.business?.name_en || "—";
              const linked = row.taxonomy_category_id
                ? taxonomyOptions.find((o) => o.id === row.taxonomy_category_id) ?? null
                : null;
              const linkStatusLabel = linked ? "مرتبط بتصنيف" : "يحتاج ربط تصنيف";
              const linkStatusClass = linked
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
              return (
                <Card key={row.id}>
                  <div className="aspect-[16/11] bg-muted/30 overflow-hidden">
                    <img src={row.image_url} alt={row.title_ar || name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {row.kind === "logo" ? "شعار" : "عمل"}
                        {linked ? ` · ${linked.display_ar}` : " · غير مصنّف"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <span className={`inline-flex items-center text-[10px] rounded-full px-2 py-0.5 ${linkStatusClass}`}>{linkStatusLabel}</span>
                    {row.title_ar && <p className="text-sm font-medium line-clamp-1" dir="auto">{row.title_ar}</p>}
                    <div className="flex items-center gap-1.5 text-xs">
                      {row.business?.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5" /> منشأة موثّقة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                          <ShieldAlert className="w-3.5 h-3.5" /> غير موثّقة (لن تُعرض حتى التوثيق)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate" dir="auto">{name}{row.business?.username ? ` · @${row.business.username}` : ""}</p>

                    {/* Inline taxonomy editor — admin can re-classify without leaving the card. */}
                    {taxonomyOptions.length > 0 && (
                      <div className="space-y-1">
                        <Select
                          value={row.taxonomy_category_id ?? ""}
                          onValueChange={(v) =>
                            setCategory.mutate({ id: row.id, categoryId: v || null })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="اختر تصنيفًا مركزيًا" />
                          </SelectTrigger>
                          <SelectContent>
                            {taxonomyOptions.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.display_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!linked && row.status === "approved" && (
                          <p className="text-[10px] text-amber-700 dark:text-amber-300">
                            يفضل ربط العمل بتصنيف مركزي لتحسين الظهور والفلترة.
                          </p>
                        )}
                      </div>
                    )}

                    {row.status === "rejected" && row.rejected_reason && (
                      <p className="text-xs text-destructive bg-destructive/10 rounded p-2">سبب: {row.rejected_reason}</p>
                    )}
                    {row.status === "pending" && (
                      <>
                        <Input
                          placeholder="سبب الرفض (مطلوب للرفض)"
                          value={reason[row.id] || ""}
                          onChange={(e) => setReason((s) => ({ ...s, [row.id]: e.target.value }))}
                          className="h-8 text-xs"
                          dir="auto"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1 flex-1" onClick={() => approve.mutate(row.id)} disabled={approve.isPending}>
                            <Check className="w-3.5 h-3.5" /> اعتماد
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1 flex-1" onClick={() => reject.mutate(row.id)} disabled={reject.isPending}>
                            <X className="w-3.5 h-3.5" /> رفض
                          </Button>
                        </div>
                      </>
                    )}
                    {row.status === "approved" && (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => reject.mutate(row.id)}>
                        إعادة للمراجعة (رفض)
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminShowcase;