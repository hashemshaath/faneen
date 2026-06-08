import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Bi } from '@/components/common/Bilingual';
import { Loader2, Boxes, Trash2 } from 'lucide-react';
import {
  listAssignmentsForOrder,
  setAssignmentStatus,
  deleteAssignment,
  type AssetRentalAssignment,
} from '../services/rentalAssignments';

/**
 * Inline panel for rental order detail — shows linked assets, their status,
 * lets provider/admin cancel an assignment (which releases the asset).
 * No popup. Inline only.
 */
export const RentalOrderAssetLinks: React.FC<{
  rentalOrderId: string;
  canManage?: boolean;
}> = ({ rentalOrderId, canManage = false }) => {
  const [items, setItems] = useState<AssetRentalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await listAssignmentsForOrder(rentalOrderId);
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [rentalOrderId]);

  const onCancel = async (id: string) => {
    setBusy(id);
    await setAssignmentStatus(id, 'cancelled');
    await load();
    setBusy(null);
  };
  const onRemove = async (id: string) => {
    setBusy(id);
    await deleteAssignment(id);
    await load();
    setBusy(null);
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="font-semibold flex items-center gap-2">
        <Boxes className="size-4" />
        <Bi ar="الأصول المرتبطة" en="Linked assets" />
        <span className="text-xs text-muted-foreground tech-content">({items.length})</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          <Bi ar="لا توجد أصول مرتبطة بهذا العقد." en="No assets linked to this order yet." />
        </div>
      ) : (
        <div className="divide-y">
          {items.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <div className="font-medium tech-content">{a.ref_id}</div>
                <div className="text-xs text-muted-foreground tech-content">
                  {a.start_date} → {a.end_date} · {a.status}
                  {a.post_rental_inspection_required ? ' · inspect-after' : ''}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  {a.status !== 'cancelled' && a.status !== 'returned' && (
                    <button
                      type="button"
                      onClick={() => onCancel(a.id)}
                      disabled={busy === a.id}
                      className="text-xs text-amber-700 hover:underline"
                    >
                      <Bi ar="إلغاء" en="Cancel" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    disabled={busy === a.id}
                    className="text-xs text-rose-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    <Bi ar="حذف" en="Remove" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default RentalOrderAssetLinks;
