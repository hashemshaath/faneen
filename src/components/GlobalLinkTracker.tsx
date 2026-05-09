import { useEffect } from "react";
import { getDomain, track } from "@/lib/analytics-events";

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

      // Contact intents
      if (href.startsWith("tel:")) {
        track.leadContactClick({ contact_type: "phone" });
        return;
      }
      if (href.startsWith("mailto:")) {
        track.leadContactClick({ contact_type: "email" });
        return;
      }
      if (href.startsWith("sms:")) {
        track.leadContactClick({ contact_type: "sms" });
        return;
      }
      if (/wa\.me|whatsapp\.com/i.test(href)) {
        track.leadContactClick({ contact_type: "whatsapp" });
        // Fall through — also count as outbound for traffic attribution.
      }

      // Outbound (http/https only, different host)
      if (/^https?:\/\//i.test(href)) {
        const domain = getDomain(href);
        if (domain && domain !== window.location.hostname.replace(/^www\./, "")) {
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