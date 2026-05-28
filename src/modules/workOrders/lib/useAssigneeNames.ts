import { useEffect, useState } from "react";
import { listProfilesByUserIds } from "@/modules/users";

/**
 * BUSINESS-CORE-6 — Batch-resolve assignee display labels for a list of
 * user ids. Returns a map keyed by user_id with safe display attributes:
 *
 *   - `full_name`: profile.full_name when present
 *   - `ref_id`:    profile.ref_id (USR-*) when present
 *
 * The hook intentionally never surfaces synthetic auth identifiers or raw
 * auth emails — callers should fall back to a generic localized "User"
 * label and the official ref_id when the full name is missing.
 */
export interface AssigneeLabel {
  full_name: string | null;
  ref_id: string | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  ref_id: string | null;
}

export function useAssigneeNames(userIds: Array<string | null | undefined>): {
  map: Record<string, AssigneeLabel>;
  loading: boolean;
} {
  const [map, setMap] = useState<Record<string, AssigneeLabel>>({});
  const [loading, setLoading] = useState(false);
  const ids = Array.from(
    new Set(userIds.filter((v): v is string => typeof v === "string" && v.length > 0)),
  ).sort();
  const key = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await listProfilesByUserIds<ProfileRow>({
        userIds: ids,
        select: "user_id, full_name, ref_id",
      });
      if (cancelled) return;
      const next: Record<string, AssigneeLabel> = {};
      for (const p of data ?? []) {
        next[p.user_id] = { full_name: p.full_name, ref_id: p.ref_id };
      }
      setMap(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { map, loading };
}