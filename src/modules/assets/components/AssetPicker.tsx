/**
 * RENTAL-ASSET-INTEGRATION-2 — live asset picker for rental order creation/edit.
 * Inline (no popup). Searches by ref, name, category, status. Shows
 * availability badge, current status, and next available date per asset.
 * Calls `checkAssetRentalAvailability` per candidate when start/end provided.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, CheckCircle2 } from 'lucide-react';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { AssetsApi } from '../index';
import type { Asset, AssetStatus } from '../types';
import { AssetStatusBadge } from './AssetStatusBadge';
import {
  checkAssetRentalAvailability,
  type AssetRentalAvailability,
} from '../services/checkAssetRentalAvailability';
import { logAssignmentBlocked } from '../services/overrides';

const STATUSES: AssetStatus[] = ['available','reserved','rented','maintenance','inspection','retired'];

export interface AssetPickerProps {
  businessId: string;
  startDate: string;
  endDate: string;
  /** Existing selected asset IDs (e.g. already-assigned). */
  selectedAssetIds: string[];
  /** Optional cap; once selected.length >= requiredQuantity, picker disables further picks. */
  requiredQuantity?: number;
  onChange: (assetIds: string[]) => void;
  /** When true the picker only allows available assets (default true). */
  enforceAvailable?: boolean;
}

export const AssetPicker: React.FC<AssetPickerProps> = ({
  businessId, startDate, endDate, selectedAssetIds, requiredQuantity,
  onChange, enforceAvailable = true,
}) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [avail, setAvail] = useState<Record<string, AssetRentalAvailability>>({});

  useEffect(() => {
    (async () => {
      const { data } = await AssetsApi.listAssetsForBusiness(businessId);
      setAssets(data ?? []);
      setLoading(false);
    })();
  }, [businessId]);

  // Live availability check for visible assets when dates set
  useEffect(() => {
    if (!startDate || !endDate || assets.length === 0) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, AssetRentalAvailability> = {};
      for (const a of assets.slice(0, 50)) {
        const r = await checkAssetRentalAvailability({
          assetId: a.id, startDate, endDate,
        });
        if (cancelled) return;
        results[a.id] = r;
      }
      if (!cancelled) setAvail(results);
    })();
    return () => { cancelled = true; };
  }, [assets, startDate, endDate]);

  const filtered = useMemo(() => assets.filter(a => {
    const txt = (q || '').trim().toLowerCase();
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!txt) return true;
    return (
      a.ref_id.toLowerCase().includes(txt)
      || a.name_ar.toLowerCase().includes(txt)
      || (a.name_en ?? '').toLowerCase().includes(txt)
      || (a.serial_number ?? '').toLowerCase().includes(txt)
    );
  }), [assets, q, statusFilter]);

  const toggle = async (a: Asset) => {
    const v = avail[a.id];
    const isAvailable = !enforceAvailable || (v?.available === true);
    if (!isAvailable) {
      await logAssignmentBlocked({
        asset_ref: a.ref_id,
        reason: v?.reason ?? 'asset_not_available',
      });
      return;
    }
    const has = selectedAssetIds.includes(a.id);
    if (!has && requiredQuantity && selectedAssetIds.length >= requiredQuantity) return;
    const next = has
      ? selectedAssetIds.filter(id => id !== a.id)
      : [...selectedAssetIds, a.id];
    onChange(next);
  };

  const remaining = requiredQuantity ? Math.max(0, requiredQuantity - selectedAssetIds.length) : null;

  return (
    <Card className="p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold flex items-center gap-2">
          <Search className="size-4" />
          <Bi ar="اختيار الأصول" en="Select assets" />
        </div>
        {requiredQuantity !== undefined && (
          <div className="text-xs text-muted-foreground tech-content">
            {selectedAssetIds.length}/{requiredQuantity}
            {remaining !== null && remaining > 0 && (
              <> · <Bi ar={`متبقٍ ${remaining}`} en={`${remaining} left`} /></>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          dir="auto"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={bi('بحث: رقم، اسم، رقم تسلسلي', 'Search ref, name, serial')}
          className="sm:col-span-2"
        />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as AssetStatus | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل الحالات','All statuses')}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          <Bi ar="لا توجد أصول مطابقة." en="No assets match." />
        </div>
      ) : (
        <div className="max-h-80 overflow-auto divide-y border rounded-xl">
          {filtered.map(a => {
            const v = avail[a.id];
            const isSelected = selectedAssetIds.includes(a.id);
            const blocked = enforceAvailable && v && !v.available;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a)}
                disabled={blocked}
                className={`w-full text-start px-3 py-2 flex items-center justify-between gap-3 hover:bg-accent/40 transition ${blocked ? 'opacity-60 cursor-not-allowed' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {isRTL ? a.name_ar : (a.name_en || a.name_ar)}
                  </div>
                  <div className="text-xs text-muted-foreground tech-content truncate">
                    {a.ref_id}
                    {v && !v.available && v.conflicting_rental_ref ? ` · ⚠ ${v.conflicting_rental_ref}` : ''}
                    {v && !v.available && v.next_available_date ? ` · ↳ ${v.next_available_date}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AssetStatusBadge status={a.status} />
                  {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default AssetPicker;
