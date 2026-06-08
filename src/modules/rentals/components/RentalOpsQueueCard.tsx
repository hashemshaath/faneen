/**
 * RENTAL-MICROSERVICE-2 — Operations Center queue card.
 *
 * Displays rental ops signals (active, expiring, expired, overdue, pending
 * extensions, items missing data) and exposes a manual "Run expiry scan"
 * admin trigger that calls the rental-expiry-scan edge function.
 * No bulk publish, no destructive controls.
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, CalendarClock, AlertTriangle, ImageOff, Tag, Search } from 'lucide-react';
import { Bi, useBi } from '@/components/common/Bilingual';
import { RentalOps } from '@/modules/rentals';
import type { RentalOpsCounts } from '@/modules/rentals/services/operationsHub';
import { toast } from 'sonner';

export const RentalOpsQueueCard: React.FC = () => {
  const bi = useBi();
  const [counts, setCounts] = React.useState<RentalOpsCounts | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const c = await RentalOps.getRentalOpsCounts();
    setCounts(c);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    const res = await RentalOps.triggerExpiryScan();
    setScanning(false);
    if (!res.ok) { toast.error(bi('فشل فحص الانتهاء','Expiry scan failed')); return; }
    toast.success(bi('اكتمل فحص الانتهاء','Expiry scan completed'));
    await load();
  };

  const tiles: Array<{ icon: React.ComponentType<{ className?: string }>; key: keyof RentalOpsCounts; ar: string; en: string; tone: string }> = [
    { icon: CalendarClock, key: 'active', ar: 'نشطة', en: 'Active', tone: 'emerald' },
    { icon: CalendarClock, key: 'expiring_soon', ar: 'قريبة الانتهاء', en: 'Expiring', tone: 'amber' },
    { icon: AlertTriangle, key: 'expired', ar: 'منتهية', en: 'Expired', tone: 'red' },
    { icon: AlertTriangle, key: 'overdue', ar: 'متجاوزة', en: 'Overdue', tone: 'red' },
    { icon: AlertTriangle, key: 'pending_extensions', ar: 'تمديدات معلّقة', en: 'Pending ext.', tone: 'amber' },
    { icon: ImageOff, key: 'items_missing_images', ar: 'بدون صور', en: 'No images', tone: 'muted' },
    { icon: Tag, key: 'items_missing_category', ar: 'بدون تصنيف', en: 'No category', tone: 'muted' },
    { icon: Search, key: 'items_low_seo', ar: 'SEO ضعيف', en: 'Low SEO', tone: 'muted' },
  ];
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    red: 'bg-red-500/10 text-red-700 dark:text-red-300',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          <Bi ar="طابور التأجير" en="Rentals queue" />
        </div>
        <Button size="sm" variant="outline" onClick={runScan} disabled={scanning} className="hover-lift">
          {scanning ? <Loader2 className="size-4 animate-spin me-1" /> : <Play className="size-4 me-1" />}
          <Bi ar="تشغيل فحص الانتهاء" en="Run expiry scan" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map(t => (
          <div key={t.key} className={`rounded-xl p-3 ${tones[t.tone]}`}>
            <div className="flex items-center gap-2 text-xs">
              <t.icon className="size-4" /><Bi ar={t.ar} en={t.en} />
            </div>
            <div className="text-2xl font-semibold tech-content mt-1">
              {loading ? '—' : (counts?.[t.key] ?? 0)}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        <Bi
          ar="يتم تدوير الحالات تلقائيًا يوميًا. هذا الفحص يدوي وآمن (idempotent)."
          en="Statuses roll daily. This manual scan is safe to re-run (idempotent)."
        />
      </div>
    </Card>
  );
};

export default RentalOpsQueueCard;