import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_TONE,
  pickBi,
  type WorkOrderPriority,
} from "@/modules/workOrders";

interface Props {
  priority: WorkOrderPriority;
  isRTL: boolean;
  className?: string;
}

export function WorkOrderPriorityBadge({ priority, isRTL, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium border", WORK_ORDER_PRIORITY_TONE[priority], className)}
    >
      {pickBi(WORK_ORDER_PRIORITY_LABELS[priority], isRTL)}
    </Badge>
  );
}

export default WorkOrderPriorityBadge;