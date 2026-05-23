import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getOwnerBusiness } from "@/modules/businesses";
import { uploadShowcaseImage } from "@/modules/files";
import { useAuth } from "@/contexts/AuthContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import { toast } from "sonner";
import { ImagePlus, ShieldAlert, ShieldCheck, Clock, X, Trash2, Upload } from "lucide-react";

interface Business {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
}

interface Submission {
  id: string;
  business_id: string;
  kind: "logo" | "work";
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_url: string;
  link_url: string | null;
  sector_slug: string | null;
  status: "pending" | "approved" | "rejected";
  rejected_reason: string | null;
  created_at: string;
}

const SECTORS = [
  { slug: "aluminum",  ar: "ألمنيوم" },
  { slug: "iron",      ar: "حديد" },
  { slug: "wood",      ar: "خشب" },
  { slug: "glass",     ar: "زجاج" },
  { slug: "stainless", ar: "ستانلس ستيل" },
];

const StatusPill: React.FC<{ status: Submission["status"] }> = ({ status }) => {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="w-3 h-3" /> منشور
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 bg-destructive/15 text-destructive">
        <X className="w-3 h-3" /> مرفوض
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300">
      <Clock className="w-3 h-3" /> قيد المراجعة
    </span>
  );
};

const DashboardShowcase: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    kind: "work" as "logo" | "work",
    title_ar: "",
    title_en: "",
    description_ar: "",
    link_url: "",
    sector_slug: "",
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const businessQuery = useQuery({
    queryKey: ["showcase-business", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await getOwnerBusiness<Business>({
        userId: user!.id,
        select: "id, name_ar, name_en, is_verified, is_active",
        orderBy: { column: "created_at", ascending: true },
        limit: 1,
      });
      if (error) throw error;
      return data as Business | null;
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ["showcase-mine", businessQuery.data?.id],
    enabled: !!businessQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_submissions")
        .select("*")
        .eq("business_id", businessQuery.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("غير مسجّل دخول");
      if (!businessQuery.data?.id) throw new Error("لا توجد منشأة مرتبطة");
      if (!form.file) throw new Error("اختر صورة");
      if (form.file.size > 5 * 1024 * 1024) throw new Error("الحجم يجب ألا يتجاوز 5MB");
      if (!form.file.type.startsWith("image/")) throw new Error("الملف يجب أن يكون صورة");

      setUploading(true);
      try {
        const { publicUrl, error: upErr } = await uploadShowcaseImage({
          userId: user.id,
          file: form.file,
        });
        if (upErr) throw upErr;

        const { error } = await supabase.from("showcase_submissions").insert([
          {
            business_id: businessQuery.data.id,
            submitted_by: user.id,
            kind: form.kind,
            title_ar: form.title_ar || null,
            title_en: form.title_en || null,
            description_ar: form.description_ar || null,
            link_url: form.link_url || null,
            sector_slug: form.sector_slug || null,
            image_url: publicUrl,
          },
        ]);
        if (error) throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      setForm({
        kind: "work",
        title_ar: "",
        title_en: "",
        description_ar: "",
        link_url: "",
        sector_slug: "",
        file: null,
      });
      void qc.invalidateQueries({ queryKey: ["showcase-mine"] });
      toast.success("تم الإرسال — سيظهر بعد المراجعة");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "فشل الإرسال"),
  });

  const removeOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("showcase_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["showcase-mine"] });
      toast.success("تم الحذف");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "فشل الحذف"),
  });

  const business = businessQuery.data;
  const isVerified = !!business?.is_verified;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
        <header>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <ImagePlus className="w-6 h-6 text-primary" /> أعمالي وشعار منشأتي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ارفع شعارك أو أمثلة أعمال. يُراجَع المحتوى يدويًا قبل النشر، ولا يظهر علنًا إلا بعد توثيق منشأتك.
          </p>
        </header>

        {!businessQuery.isLoading && !business && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-medium">لا توجد منشأة مرتبطة بحسابك</p>
                <p className="text-muted-foreground">أنشئ منشأتك أولًا من لوحة التحكم لتتمكن من رفع شعار أو أعمال.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {business && !isVerified && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-300">منشأتك ليست موثّقة بعد</p>
                <p className="text-muted-foreground">
                  يمكنك رفع المحتوى الآن، لكنه لن يظهر للجمهور في صفحة /showcase حتى يكتمل توثيق منشأتك.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {business && isVerified && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <p className="text-emerald-700 dark:text-emerald-300">
                منشأتك موثّقة. كل عمل يحصل على موافقة المراجعة سيُعرض مباشرة في معرض /showcase.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Upload form */}
        {business && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold">إرسال جديد</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">النوع</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm((s) => ({ ...s, kind: v as "logo" | "work" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logo">شعار</SelectItem>
                      <SelectItem value="work">مثال عمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">القطاع</Label>
                  <Select value={form.sector_slug} onValueChange={(v) => setForm((s) => ({ ...s, sector_slug: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر قطاعًا" /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s.slug} value={s.slug}>{s.ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">الصورة (≤ 5MB)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((s) => ({ ...s, file: e.target.files?.[0] ?? null }))}
                  />
                </div>
              </div>
              {form.kind === "work" && (
                <>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">العنوان (عربي)</Label>
                      <Input value={form.title_ar} onChange={(e) => setForm((s) => ({ ...s, title_ar: e.target.value }))} dir="auto" />
                    </div>
                    <div>
                      <Label className="text-xs">العنوان (إنجليزي)</Label>
                      <Input value={form.title_en} onChange={(e) => setForm((s) => ({ ...s, title_en: e.target.value }))} dir="auto" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">وصف مختصر (اختياري)</Label>
                    <Textarea
                      rows={2}
                      value={form.description_ar}
                      onChange={(e) => setForm((s) => ({ ...s, description_ar: e.target.value }))}
                      dir="auto"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">رابط خارجي (اختياري)</Label>
                    <Input
                      value={form.link_url}
                      onChange={(e) => setForm((s) => ({ ...s, link_url: e.target.value }))}
                      placeholder="https://..."
                      dir="ltr"
                      className="tech-content"
                    />
                  </div>
                </>
              )}
              <Button onClick={() => submit.mutate()} disabled={uploading || submit.isPending} className="gap-2">
                <Upload className="w-4 h-4" />
                {uploading || submit.isPending ? "جارِ الرفع…" : "إرسال للمراجعة"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* My submissions */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">إرسالاتي</h2>
            {submissionsQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : (submissionsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لم ترسل أي محتوى بعد.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {submissionsQuery.data!.map((row) => (
                  <div key={row.id} className="rounded-xl border border-border/60 overflow-hidden bg-card">
                    <div className="aspect-[16/11] bg-muted/30">
                      <img src={row.image_url} alt={row.title_ar || ""} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{row.kind === "logo" ? "شعار" : "مثال عمل"}</span>
                        <StatusPill status={row.status} />
                      </div>
                      {row.title_ar && <p className="text-sm font-medium line-clamp-1" dir="auto">{row.title_ar}</p>}
                      {row.status === "rejected" && row.rejected_reason && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded p-2" dir="auto">
                          سبب الرفض: {row.rejected_reason}
                        </p>
                      )}
                      {row.status === "pending" && (
                        <p className="text-xs text-muted-foreground">بانتظار مراجعة الفريق (عادةً خلال 48 ساعة).</p>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive h-8"
                        onClick={() => {
                          if (window.confirm("حذف هذا العنصر؟")) removeOne.mutate(row.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 me-1" /> حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardShowcase;