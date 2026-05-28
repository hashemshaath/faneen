import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TONE,
  pickBi,
  type WorkOrderStatus,
} from "@/modules/workOrders";

interface Props {
  status: WorkOrderStatus;
  isRTL: boolean;
  className?: string;
}

export function WorkOrderStatusBadge({ status, isRTL, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium border", WORK_ORDER_STATUS_TONE[status], className)}
    >
      {pickBi(WORK_ORDER_STATUS_LABELS[status], isRTL)}
    </Badge>
  );
}

export default WorkOrderStatusBadge;