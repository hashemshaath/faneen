import { useEffect } from "react";
import { getDomain, track, type EventPayload, type AllowedParam } from "@/lib/analytics-events";

/**
 * Reads `data-lead-*` attributes from the closest ancestor with
 * `data-lead-context` and merges them into the analytics payload.
 * Supported keys: business-slug, membership-tier, sector, city,
 * category-slug, category-name.
 */
const LEAD_DATA_KEYS: Record<string, AllowedParam> = {
  "lead-business-slug": "business_slug",
  "lead-membership-tier": "membership_tier",
  "lead-sector": "sector",
  "lead-city": "city",
  "lead-category-slug": "category_slug",
  "lead-category-name": "category_name",
};

function readLeadContext(anchor: HTMLElement): EventPayload {
  const ctx = anchor.closest<HTMLElement>("[data-lead-context]");
  if (!ctx) return {};
  const out: EventPayload = {};
  for (const [dataKey, paramKey] of Object.entries(LEAD_DATA_KEYS)) {
    const v = ctx.dataset[toCamel(dataKey)];
    if (v) out[paramKey] = v;
  }
  return out;
}

function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/**
 * Listens for delegated link clicks anywhere in the app and pushes:
 *  - `lead_contact_click` for tel:, mailto:, sms:, wa.me / whatsapp.com links
 *  - `outbound_click`     for any external http(s) link
 *
 * Privacy: we only push `contact_type` (phone | email | whatsapp | sms) and
 * `outbound_domain` — never the actual phone number, email address, or query.
 */
export const GlobalLinkTracker = () => {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;

      const ctx = readLeadContext(anchor);
      const overrideType = anchor.getAttribute("data-contact-type") as
        | "phone"
        | "email"
        | "whatsapp"
        | "sms"
        | "website"
        | null;

      // Contact intents
      if (href.startsWith("tel:")) {
        track.leadContactClick({ contact_type: "phone", ...ctx });
        return;
      }
      if (href.startsWith("mailto:")) {
        track.leadContactClick({ contact_type: "email", ...ctx });
        return;
      }
      if (href.startsWith("sms:")) {
        track.leadContactClick({ contact_type: "sms", ...ctx });
        return;
      }
      if (/wa\.me|whatsapp\.com/i.test(href)) {
        track.leadContactClick({ contact_type: "whatsapp", ...ctx });
        // Fall through — also count as outbound for traffic attribution.
      }

      // Outbound (http/https only, different host)
      if (/^https?:\/\//i.test(href)) {
        const domain = getDomain(href);
        if (domain && domain !== window.location.hostname.replace(/^www\./, "")) {
          // If this anchor is explicitly tagged as a website lead (e.g. a
          // provider's official site on their profile), also push a
          // `lead_contact_click` so attribution dashboards can attribute it
          // to the business — in addition to the regular outbound signal.
          if (overrideType === "website") {
            track.leadContactClick({ contact_type: "website", ...ctx });
          }
          track.outboundClick({ outbound_domain: domain });
        }
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
  }, []);
  return null;
};

export default GlobalLinkTracker;