/**
 * Phase 12B — Floating WhatsApp contact button for PUBLIC pages only.
 *
 * Renders nothing unless `VITE_QITAAT_WHATSAPP` (E.164 digits, no `+`) is
 * configured. We never ship a hard-coded number — per the audit policy a
 * missing config means the FAB stays hidden until ops sets the number.
 *
 * Placement:
 *   - position: fixed, bottom-start corner (RTL-aware via `start-4`).
 *   - z-index below modals (40) so it never covers admin dialogs; this
 *     component is also only mounted by the public <Footer />, never by
 *     DashboardLayout, so it does not appear in admin.
 *
 * Accessibility:
 *   - Real <a> with explicit aria-label and `rel="noopener"`.
 *   - 56×56 hit target meets WCAG 2.5.5 (target size, enhanced).
 */
import { MessageCircle } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';

/** Strip every non-digit so users can paste numbers in any format. */
function normalizeWhatsAppDigits(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  return digits.length >= 8 ? digits : null;
}

export const WhatsAppFab = () => {
  const bi = useBi();
  const configured = normalizeWhatsAppDigits(import.meta.env.VITE_QITAAT_WHATSAPP);
  if (!configured) return null;

  const label = bi('تواصل معنا على واتساب', 'Contact us on WhatsApp');
  const href = `https://wa.me/${configured}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-4 start-4 z-40 inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
    >
      <MessageCircle className="w-6 h-6" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </a>
  );
};

export default WhatsAppFab;