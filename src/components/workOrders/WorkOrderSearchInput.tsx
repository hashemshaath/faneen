import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReferenceBadge } from "@/components/reference/ReferenceBadge";
import {
  searchWorkOrders,
  type WorkOrderRow,
} from "@/modules/workOrders";

interface Props {
  businessId: string;
  isRTL: boolean;
  className?: string;
  /** Optional row click handler; defaults to navigation via <Link>. */
  onPick?: (wo: WorkOrderRow) => void;
}

/**
 * BUSINESS-CORE-5 — Composable unified search primitive for work orders.
 * Debounced (220ms), results capped at 8 visible. Uses the module wrapper
 * `searchWorkOrders` — never touches `work_orders` directly. Mobile-first.
 */
export function WorkOrderSearchInput({ businessId, isRTL, className, onPick }: Props) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const tx = useMemo(
    () => ({
      placeholder: isRTL ? "ابحث برقم المرجع أو العنوان أو العميل…" : "Search by ref, title or customer…",
      empty: isRTL ? "لا توجد نتائج." : "No results.",
      clear: isRTL ? "مسح" : "Clear",
    }),
    [isRTL],
  );

  useEffect(() => {
    if (!businessId) return;
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      const { data } = await searchWorkOrders({ businessId, query: trimmed, limit: 8 });
      if (cancelled) return;
      setResults(data ?? []);
      setLoading(false);
      setOpen(true);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, businessId]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const clear = useCallback(() => {
    setValue("");
    setResults([]);
    setOpen(false);
  }, []);

  return (
    <div ref={boxRef} className={`relative w-full ${className ?? ""}`}>
      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
        <Input
          dir="auto"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={tx.placeholder}
          aria-label={tx.placeholder}
          className="ps-9 pe-9 h-11 rounded-xl"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clear}
            aria-label={tx.clear}
            className="absolute top-1/2 -translate-y-1/2 end-1 h-8 w-8"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>

      {open && value.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border border-border/60 bg-popover shadow-lg max-h-80 overflow-y-auto"
        >
          {results.length === 0 && !loading ? (
            <p className="p-3 text-xs text-muted-foreground">{tx.empty}</p>
          ) : (
            <ul className="py-1">
              {results.map((wo) => {
                const inner = (
                  <div className="flex items-start gap-2 px-3 py-2 hover:bg-muted/50 transition rounded-lg">
                    <ReferenceBadge refId={wo.ref_id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate" dir="auto">
                        {wo.title}
                      </p>
                      {wo.customer_name && (
                        <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                          {wo.customer_name}
                        </p>
                      )}
                    </div>
                  </div>
                );
                return (
                  <li key={wo.id} role="option" aria-selected="false">
                    {onPick ? (
                      <button
                        type="button"
                        onClick={() => { onPick(wo); setOpen(false); }}
                        className="w-full text-start"
                      >
                        {inner}
                      </button>
                    ) : (
                      <Link
                        to={`/dashboard/work-orders/${wo.ref_id}`}
                        onClick={() => setOpen(false)}
                        className="block"
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkOrderSearchInput;