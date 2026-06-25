import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MilestoneReviewPanel } from "./MilestoneReviewPanel";
import { MilestoneEvidenceUploader } from "./MilestoneEvidenceUploader";
import type { MilestoneRow } from "@/modules/contracts/services/milestoneLifecycle";
import { Loader2 } from "lucide-react";

interface Props {
  contractId: string;
  role: "provider" | "client" | "viewer";
}

export function ContractMilestoneTimeline({ contractId, role }: Props) {
  const [items, setItems] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_milestones")
      .select("*")
      .eq("contract_id", contractId)
      .order("sort_order", { ascending: true });
    if (!error && data) setItems(data as unknown as MilestoneRow[]);
    setLoading(false);
  }, [contractId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        لا توجد مراحل لهذا العقد بعد.
      </p>
    );
  }

  const approvedCount = items.filter((m) => ["approved", "released", "completed"].includes(m.status)).length;
  const progress = Math.round((approvedCount / items.length) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>تقدّم الإنجاز</span>
          <span>{approvedCount} / {items.length} مرحلة</span>
        </div>
        <Progress value={progress} />
      </div>

      {items.map((m, idx) => (
        <Card key={m.id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>
                مرحلة {idx + 1}: {m.title_ar}
              </span>
              <span className="text-muted-foreground">
                {Number(m.amount).toLocaleString("ar-SA")} {m.percentage ? `(${m.percentage}%)` : ""}
              </span>
            </CardTitle>
            {m.due_date && (
              <p className="text-xs text-muted-foreground">الموعد المستهدف: {m.due_date}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <MilestoneReviewPanel milestone={m} role={role} onChanged={load} />
            {role === "provider" && ["pending", "active", "in_progress", "revision_requested"].includes(m.status) && (
              <MilestoneEvidenceUploader milestoneId={m.id} contractId={contractId} onUploaded={load} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ContractMilestoneTimeline;