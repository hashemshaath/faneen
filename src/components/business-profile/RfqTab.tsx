import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarRange, ClipboardList, DollarSign, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBi } from "@/components/common/Bilingual";

interface RfqTabProps {
  businessId: string;
  businessName: string;
}

export const RfqTab = ({ businessId, businessName }: RfqTabProps) => {
  const bi = useBi();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    description: "",
    budget_min: "",
    budget_max: "",
    deadline: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = useMutation({
    mutationFn: async () => {
      const name = (user?.user_metadata?.full_name as string | undefined) || form.name.trim();
      const email = user?.email || form.email.trim();
      if (!name) throw new Error("name_required");
      if (form.title.trim().length < 4) throw new Error("title_required");
      if (form.description.trim().length < 15) throw new Error("desc_required");

      const { error } = await supabase.from("business_rfqs").insert({
        business_id: businessId,
        requester_user_id: user?.id ?? null,
        requester_name: name,
        requester_email: email || null,
        requester_phone: form.phone.trim() || null,
        title: form.title.trim(),
        description: form.description.trim(),
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        deadline: form.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success(bi("تم إرسال طلب عرض السعر", "Your RFQ has been sent"));
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "unknown";
      const map: Record<string, [string, string]> = {
        name_required: ["الاسم مطلوب", "Name is required"],
        title_required: ["عنوان الطلب قصير جداً", "Title is too short"],
        desc_required: ["الوصف قصير جداً (15 حرفاً على الأقل)", "Description is too short (min 15 chars)"],
      };
      const [ar, en] = map[msg] ?? ["تعذّر إرسال الطلب", "Could not send request"];
      toast.error(bi(ar, en));
    },
  });

  if (submitted) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center sm:p-10">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
          <ClipboardList className="h-7 w-7 text-success" />
        </div>
        <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
          {bi(`تم استلام طلبك إلى ${businessName}`, `Your RFQ to ${businessName} was received`)}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {bi(
            "ستتواصل الجهة معك خلال 24–48 ساعة عمل.",
            "The provider will reach out within 24–48 business hours.",
          )}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", title: "", description: "", budget_min: "", budget_max: "", deadline: "" }); }}>
          {bi("إرسال طلب آخر", "Send another RFQ")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 dark:border-border/20 sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-accent" />
        <div>
          <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
            {bi("اطلب عرض سعر", "Request a quote")}
          </h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            {bi("أرسل تفاصيل مشروعك مباشرة إلى الجهة.", "Send your project details directly to the provider.")}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!user && (
          <>
            <div className="sm:col-span-1">
              <Label className="text-xs">{bi("الاسم", "Name")} *</Label>
              <Input value={form.name} onChange={update("name")} dir="auto" maxLength={80} className="h-11 rounded-xl" />
            </div>
            <div className="sm:col-span-1">
              <Label className="text-xs">{bi("البريد الإلكتروني", "Email")}</Label>
              <Input type="email" value={form.email} onChange={update("email")} dir="auto" maxLength={120} className="h-11 rounded-xl" />
            </div>
          </>
        )}
        <div>
          <Label className="text-xs">{bi("الجوال", "Phone")}</Label>
          <Input type="tel" value={form.phone} onChange={update("phone")} className="h-11 rounded-xl tech-content" maxLength={30} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">{bi("عنوان الطلب", "Title")} *</Label>
          <Input value={form.title} onChange={update("title")} dir="auto" maxLength={120} className="h-11 rounded-xl" placeholder={bi("مثال: تركيب واجهات ألمنيوم", "e.g. Aluminum facade installation")} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">{bi("الوصف التفصيلي", "Detailed description")} *</Label>
          <Textarea value={form.description} onChange={update("description")} dir="auto" maxLength={2000} className="min-h-[120px] rounded-xl" placeholder={bi("المواصفات، الكميات، الموقع، أي ملاحظات...", "Specs, quantities, location, notes...")} />
        </div>
        <div>
          <Label className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            {bi("الميزانية من", "Budget from")}
          </Label>
          <Input type="number" inputMode="numeric" value={form.budget_min} onChange={update("budget_min")} className="h-11 rounded-xl tech-content" />
        </div>
        <div>
          <Label className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            {bi("الميزانية إلى", "Budget to")}
          </Label>
          <Input type="number" inputMode="numeric" value={form.budget_max} onChange={update("budget_max")} className="h-11 rounded-xl tech-content" />
        </div>
        <div className="sm:col-span-2">
          <Label className="flex items-center gap-1 text-xs">
            <CalendarRange className="h-3 w-3" />
            {bi("الموعد المطلوب", "Required by")}
          </Label>
          <Input type="date" value={form.deadline} onChange={update("deadline")} className="h-11 rounded-xl tech-content" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="hero" size="app" className="gap-2" onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {bi("إرسال الطلب", "Send request")}
        </Button>
      </div>
    </div>
  );
};

export default RfqTab;