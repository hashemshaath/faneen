import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";
import { ReferenceBadge } from "@/components/reference/ReferenceBadge";
import { getWorkOrderSourceLabel } from "@/modules/workOrders";
import { cn } from "@/lib/utils";

interface Props {
  sourceType: string | null | undefined;
  sourceId?: string | null;
  sourceRefId?: string | null;
  isRTL: boolean;
  className?: string;
}

export function WorkOrderSourceBadge({
  sourceType, sourceRefId, isRTL, className,
}: Props) {
  const label = getWorkOrderSourceLabel(sourceType, isRTL);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Link2 className="w-2.5 h-2.5" />
        {label}
      </Badge>
      {sourceRefId && <ReferenceBadge refId={sourceRefId} />}
    </span>
  );
}

export default WorkOrderSourceBadge;