import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Vim-style sequential shortcuts:
 *   g+c → /dashboard/contracts        (go contracts)
 *   g+r → /admin/reports              (go reports)
 *   g+k → /admin/kpis                 (go KPIs)
 *   g+a → /admin/audit-log            (go audit log)
 *   g+l → /dashboard/loyalty          (go loyalty)
 *   g+s → /dashboard/loyalty/store    (go reward store)
 *   g+q → /dashboard/rfq              (go RFQ)
 *   g+h → /dashboard                  (home)
 *   ?   → toast list of shortcuts
 *
 * Ignored while typing in inputs/textareas/contentEditable.
 */
const MAP: Record<string, string> = {
  c: '/dashboard/contracts',
  r: '/admin/reports',
  k: '/admin/kpis',
  a: '/admin/audit-log',
  l: '/dashboard/loyalty',
  s: '/dashboard/loyalty/store',
  q: '/dashboard/rfq',
  h: '/dashboard',
};

export function useGlobalShortcuts(): void {
  const navigate = useNavigate();

  useEffect(() => {
    let armed = false;
    let armedAt = 0;

    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return node.isContentEditable === true;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(e.target)) return;

      if (e.key === '?') {
        e.preventDefault();
        toast.info('g+c contracts · g+r reports · g+k KPIs · g+a audit · g+l loyalty · g+s store · g+q RFQ · g+h home');
        return;
      }

      if (e.key === 'g') {
        armed = true;
        armedAt = Date.now();
        setTimeout(() => { armed = false; }, 1200);
        return;
      }

      if (armed && Date.now() - armedAt < 1200) {
        const target = MAP[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          armed = false;
          navigate(target);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}