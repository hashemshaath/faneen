import { User, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  assigneeName?: string | null;
  assigneeUserId?: string | null;
  isRTL: boolean;
  className?: string;
}

/**
 * Presentational chip — never displays raw UUIDs. When only an id is known
 * we render a generic "User" label until name resolution is added later.
 */
export function WorkOrderAssigneeChip({
  assigneeName, assigneeUserId, isRTL, className,
}: Props) {
  if (!assigneeUserId && !assigneeName) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] text-muted-foreground rounded-full border border-dashed border-border/60 px-2 py-0.5",
          className,
        )}
      >
        <UserX className="w-3 h-3" />
        {isRTL ? "غير مُسنَد" : "Unassigned"}
      </span>
    );
  }
  const display = assigneeName ? assigneeName : isRTL ? "مستخدم" : "User";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] text-foreground rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5",
        className,
      )}
    >
      <User className="w-3 h-3 text-accent" />
      <span className="truncate max-w-[140px]" dir="auto">{display}</span>
    </span>
  );
}

export default WorkOrderAssigneeChip;