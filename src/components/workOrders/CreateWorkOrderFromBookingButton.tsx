import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Wrench, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { createWorkOrderFromBooking } from "@/modules/workOrders/services/createWorkOrderFromBooking";
import type { WorkOrderPriority, WorkOrderRow } from "@/modules/workOrders/types";
import { useExistingWorkOrderForSource } from "@/hooks/useExistingWorkOrderForSource";

interface Props {
  bookingId: string;
  businessId: string;
  defaultTitle?: string | null;
  bookingRefId?: string | null;
  className?: string;
}

/**
 * BUSINESS-CORE-11 — Manual "Create work order from booking" affordance.
 * Inline card (no popup). On success, renders a quick link to the new WO.
 */
export function CreateWorkOrderFromBookingButton({
  bookingId, businessId, defaultTitle, bookingRefId, className,
}: Props) {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>(defaultTitle?.toString() ?? "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<WorkOrderPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<WorkOrderRow | null>(null);

  const { workOrder: existing } = useExistingWorkOrderForSource({
    sourceType: "booking",
    sourceId: bookingId,
    businessId,
    enabled: !created,
  });

  if (!created && existing?.ref_id) {
    return (
      <Button asChild size="sm" variant="outline" className={className}>
        <Link to={`/dashboard/work-orders/${existing.ref_id}`}>
          <Wrench className="w-3.5 h-3.5 me-1.5" />
          {isRTL ? "فتح أمر العمل" : "Open Work Order"}
          <span className="tech-content ms-1">({existing.ref_id})</span>
        </Link>
      </Button>
    );
  }

  if (created?.ref_id) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {isRTL ? "تم إنشاء أمر العمل" : "Work order created"}
          </p>
          <Button asChild size="sm" variant="default">
            <Link to={`/dashboard/work-orders/${created.ref_id}`}>
              <span className="tech-content">{created.ref_id}</span>
              <ArrowRight className="w-3.5 h-3.5 ms-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Wrench className="w-3.5 h-3.5 me-1.5" />
        {isRTL ? "إنشاء أمر عمل" : "Create Work Order"}
      </Button>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await createWorkOrderFromBooking({
      bookingId,
      businessId,
      title: title.trim() || (defaultTitle?.toString() ?? ""),
      description: description.trim() || undefined,
      priority,
    });
    setSubmitting(false);
    if (error || !data) {
      toast.error(
        isRTL ? "تعذّر إنشاء أمر العمل" : "Could not create work order",
      );
      return;
    }
    setCreated(data);
    toast.success(isRTL ? "تم إنشاء أمر العمل" : "Work order created");
  };

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">
          {isRTL ? "إنشاء أمر عمل من الحجز" : "Create work order from booking"}
          {bookingRefId && (
            <span className="text-xs text-muted-foreground font-normal ms-2 tech-content">
              ({bookingRefId})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="wo-booking-title" className="text-xs">
            {isRTL ? "العنوان" : "Title"}
          </Label>
          <Input
            id="wo-booking-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle?.toString() ?? ""}
            maxLength={200}
            dir="auto"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wo-booking-desc" className="text-xs">
            {isRTL ? "الوصف (اختياري)" : "Description (optional)"}
          </Label>
          <Textarea
            id="wo-booking-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            dir="auto"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {isRTL ? "الأولوية" : "Priority"}
          </Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as WorkOrderPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{isRTL ? "منخفضة" : "Low"}</SelectItem>
              <SelectItem value="medium">{isRTL ? "متوسطة" : "Medium"}</SelectItem>
              <SelectItem value="high">{isRTL ? "عالية" : "High"}</SelectItem>
              <SelectItem value="urgent">{isRTL ? "عاجلة" : "Urgent"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" size="sm" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
            {isRTL ? "إنشاء" : "Create"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreateWorkOrderFromBookingButton;
