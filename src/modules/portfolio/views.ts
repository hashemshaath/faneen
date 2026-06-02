import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "qitaat_portfolio_session";
const SEEN_KEY = "qitaat_portfolio_seen_v1";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

function alreadySeen(portfolioId: string, eventType: string): boolean {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
    const key = `${eventType}:${portfolioId}`;
    if (seen[key]) return true;
    seen[key] = Date.now();
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    return false;
  } catch {
    return false;
  }
}

/**
 * Record a portfolio view/share/click event. Safe to call from public pages.
 * De-duplicates per session for 'view' events to avoid double counting.
 */
export async function recordPortfolioView(
  portfolioId: string,
  eventType: "view" | "share" | "click" = "view",
): Promise<void> {
  if (!portfolioId) return;
  if (eventType === "view" && alreadySeen(portfolioId, eventType)) return;
  try {
    await supabase.rpc("record_portfolio_view", {
      _portfolio_id: portfolioId,
      _event_type: eventType,
      _session_id: getSessionId(),
      _referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
  } catch {
    // silent — tracking must never break UX
  }
}