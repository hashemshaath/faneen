import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarRange, ClipboardList, DollarSign, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TechnicalText } from "@/components/ui/technical-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBi } from "@/components/common/Bilingual";

interface RfqTabProps {
  businessId: string;
  businessName: string;
  /** Sector slug or label used by `quote_requests.sector` (required). */
  sector: string;
  /** City name used by `quote_requests.city` (required). */
  city: string;
}

type ContactMethod = "whatsapp" | "call" | "email";
type Timeline = "urgent" | "1_month" | "1_3_months" | "3_6_months" | "flexible";
type ServiceLocation = "project_site" | "provider_location" | "not_sure";

interface RfqFormState {
  name: string;
  email: string;
  phone: string;
  title: string;
  description: string;
  budget_min: string;
  budget_max: string;
  deadline: string;
  contact_method: ContactMethod;
  timeline: Timeline;
  service_location: ServiceLocation;
}

const INITIAL_FORM: RfqFormState = {
  name: "",
  email: "",
  phone: "",
  title: "",
  description: "",
  budget_min: "",
  budget_max: "",
  deadline: "",
  contact_method: "whatsapp",
  timeline: "1_3_months",
  service_location: "project_site",
};

export const RfqTab = ({ businessId, businessName, sector, city }: RfqTabProps) => {
  const bi = useBi();
  const { user } = useAuth();
  const [form, setForm] = useState<RfqFormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setSubmitted(false);
    setForm(INITIAL_FORM);
  };

  const update = (k: keyof RfqFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = useMutation({
    mutationFn: async () => {
      const name = (user?.user_metadata?.full_name as string | undefined) || form.name.trim();
      const email = user?.email || form.email.trim();
      const phone = form.phone.trim();
      if (!name) throw new Error("name_required");
      if (!phone) throw new Error("phone_required");
      if (form.title.trim().length < 4) throw new Error("title_required");
      if (form.description.trim().length < 15) throw new Error("desc_required");
      if (!sector) throw new Error("sector_missing");
      if (!city) throw new Error("city_missing");

      const description = `${form.title.trim()}\n\n${form.description.trim()}`;
      const budgetMax = form.budget_max ? Number(form.budget_max) : null;
      const budgetMin = form.budget_min ? Number(form.budget_min) : null;
      const hasBudget = budgetMin !== null || budgetMax !== null;

      const { error } = await supabase.from("quote_requests").insert({
        user_id: user?.id ?? null,
        target_entity_id: businessId,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        customer_type: "individual",
        preferred_contact_method: form.contact_method,
        sector,
        city,
        service_location_type: form.service_location,
        project_description: description,
        execution_timeline: form.timeline,
        has_budget: hasBudget,
        budget_amount: budgetMax ?? budgetMin,
        budget_note: budgetMin && budgetMax ? `${budgetMin} - ${budgetMax}` : null,
        source: "business_profile_rfq",
        metadata: {
          title: form.title.trim(),
          budget_min: budgetMin,
          budget_max: budgetMax,
          deadline: form.deadline || null,
        },
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
        phone_required: ["رقم الجوال مطلوب", "Phone is required"],
        title_required: ["عنوان الطلب قصير جداً", "Title is too short"],
        desc_required: ["الوصف قصير جداً (15 حرفاً على الأقل)", "Description is too short (min 15 chars)"],
        sector_missing: ["تعذّر تحديد القطاع", "Could not determine sector"],
        city_missing: ["تعذّر تحديد المدينة", "Could not determine city"],
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
        <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
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
              <Input type="email" value={form.email} onChange={update("email")} dir="ltr" maxLength={120} className="h-11 rounded-xl tech-content" />
            </div>
          </>
        )}
        <div>
          <Label className="text-xs">{bi("الجوال", "Phone")} *</Label>
          <Input type="tel" value={form.phone} onChange={update("phone")} dir="ltr" className="h-11 rounded-xl tech-content" maxLength={30} />
        </div>
        <div>
          <Label className="text-xs">{bi("طريقة التواصل المفضّلة", "Preferred contact")}</Label>
          <Select
            value={form.contact_method}
            onValueChange={(v) => setForm((p) => ({ ...p, contact_method: v as typeof p.contact_method }))}
          >
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">{bi("واتساب", "WhatsApp")}</SelectItem>
              <SelectItem value="call">{bi("اتصال", "Call")}</SelectItem>
              <SelectItem value="email">{bi("بريد إلكتروني", "Email")}</SelectItem>
            </SelectContent>
          </Select>
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
          <Label className="text-xs">{bi("الإطار الزمني للتنفيذ", "Execution timeline")}</Label>
          <Select
            value={form.timeline}
            onValueChange={(v) => setForm((p) => ({ ...p, timeline: v as typeof p.timeline }))}
          >
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">{bi("عاجل", "Urgent")}</SelectItem>
              <SelectItem value="1_month">{bi("خلال شهر", "Within a month")}</SelectItem>
              <SelectItem value="1_3_months" textValue={bi("1–3 أشهر", "1–3 months")}>
                <TechnicalText mono={false}>{bi("1–3 أشهر", "1–3 months")}</TechnicalText>
              </SelectItem>
              <SelectItem value="3_6_months" textValue={bi("3–6 أشهر", "3–6 months")}>
                <TechnicalText mono={false}>{bi("3–6 أشهر", "3–6 months")}</TechnicalText>
              </SelectItem>
              <SelectItem value="flexible">{bi("مرن", "Flexible")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{bi("موقع الخدمة", "Service location")}</Label>
          <Select
            value={form.service_location}
            onValueChange={(v) => setForm((p) => ({ ...p, service_location: v as typeof p.service_location }))}
          >
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="project_site">{bi("في موقع المشروع", "Project site")}</SelectItem>
              <SelectItem value="provider_location">{bi("في مقر الجهة", "Provider location")}</SelectItem>
              <SelectItem value="not_sure">{bi("غير محدد", "Not sure")}</SelectItem>
            </SelectContent>
          </Select>
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