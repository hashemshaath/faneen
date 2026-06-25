import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Clock, RotateCcw } from "lucide-react";
import {
  approveMilestone,
  requestMilestoneRevision,
  submitMilestoneForReview,
  hoursUntilAutoRelease,
  type MilestoneRow,
} from "@/modules/contracts/services/milestoneLifecycle";

interface Props {
  milestone: MilestoneRow;
  role: "provider" | "client" | "viewer";
  onChanged?: () => void;
}

export function MilestoneReviewPanel({ milestone, role, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const hrs = hoursUntilAutoRelease(milestone.auto_release_at);

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message ?? "فشل التنفيذ");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = role === "provider" && ["pending", "active", "in_progress", "revision_requested"].includes(milestone.status);
  const canApprove = role === "client" && milestone.status === "submitted";

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={milestone.status === "approved" ? "default" : "secondary"}>
            {labelFor(milestone.status)}
          </Badge>
          {milestone.status === "submitted" && hrs !== null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {hrs > 0
                ? `إفراج تلقائي خلال ${Math.ceil(hrs)} ساعة`
                : "تجاوز مهلة الاعتماد"}
            </span>
          )}
        </div>
      </div>

      {(canSubmit || canApprove) && (
        <Textarea
          placeholder={canApprove ? "ملاحظات الاعتماد أو سبب التعديل" : "ملاحظات للمشتري"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => guard(() => submitMilestoneForReview(milestone, notes))}
          >
            <CheckCircle2 className="ms-2 h-4 w-4" /> إرسال للمراجعة
          </Button>
        )}
        {canApprove && (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => guard(() => approveMilestone(milestone, notes))}
            >
              <CheckCircle2 className="ms-2 h-4 w-4" /> اعتماد الإنجاز
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !notes.trim()}
              onClick={() => guard(() => requestMilestoneRevision(milestone, notes))}
            >
              <RotateCcw className="ms-2 h-4 w-4" /> طلب تعديل
            </Button>
            <Button size="sm" variant="destructive" disabled title="سيتم تفعيله في المرحلة 3 (النزاعات)">
              <AlertTriangle className="ms-2 h-4 w-4" /> فتح نزاع
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function labelFor(s: MilestoneRow["status"]): string {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    active: "نشطة",
    in_progress: "قيد التنفيذ",
    submitted: "مُرسلة للمراجعة",
    approved: "معتمدة",
    revision_requested: "بانتظار التعديل",
    completed: "مكتملة",
    released: "تم الإفراج",
    disputed: "متنازع عليها",
  };
  return map[s] ?? s;
}

export default MilestoneReviewPanel;