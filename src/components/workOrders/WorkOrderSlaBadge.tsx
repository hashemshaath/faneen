import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeSlaState, getSlaLabel, type SlaInput, type SlaState } from "@/modules/workOrders/lib/sla";

interface Props {
  row: SlaInput;
  isRTL: boolean;
  className?: string;
  /** When true, hides the "on_track" / "none" states (only show actionable). */
  onlyActionable?: boolean;
}

/**
 * BUSINESS-WORKFLOW-2 — Display-only SLA badge for a work order or task row.
 * No side effects; consumes already-fetched data.
 */
export function WorkOrderSlaBadge({ row, isRTL, className, onlyActionable = true }: Props) {
  const state: SlaState = computeSlaState(row);
  if (onlyActionable && (state === "on_track" || state === "none")) return null;

  const label = getSlaLabel(state, isRTL);
  if (state === "overdue") {
    return (
      <Badge
        variant="destructive"
        className={cn("text-[10px] gap-1", className)}
        data-sla-state="overdue"
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        {label}
      </Badge>
    );
  }
  if (state === "due_soon") {
    return (
      <Badge
        variant="outline"
        className={cn("text-[10px] gap-1 border-amber-500 text-amber-700 dark:text-amber-300", className)}
        data-sla-state="due_soon"
      >
        <Clock className="w-2.5 h-2.5" />
        {label}
      </Badge>
    );
  }
  if (state === "completed") {
    return (
      <Badge
        variant="secondary"
        className={cn("text-[10px] gap-1", className)}
        data-sla-state="completed"
      >
        <CheckCircle2 className="w-2.5 h-2.5" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-[10px]", className)} data-sla-state={state}>
      {label}
    </Badge>
  );
}

export default WorkOrderSlaBadge;