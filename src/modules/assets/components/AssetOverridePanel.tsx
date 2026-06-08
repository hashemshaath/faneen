/**
 * RENTAL-ASSET-INTEGRATION-2 — inline admin override form.
 * Requires reason + note (>= 5 chars) before submit. No popup.
 */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bi, useBi } from '@/components/common/Bilingual';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  applyAssetOverride, OVERRIDE_REASONS, type OverrideReason,
} from '../services/overrides';
import type { AssetStatus } from '../types';

const STATUSES: AssetStatus[] = ['available','reserved','rented','maintenance','inspection','retired'];

export const AssetOverridePanel: React.FC<{
  assetId: string;
  currentStatus: AssetStatus;
  onApplied?: () => void;
}> = ({ assetId, currentStatus, onApplied }) => {
  const bi = useBi();
  const [reason, setReason] = useState<OverrideReason>('manual_correction');
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState<AssetStatus>(currentStatus);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (note.trim().length < 5) {
      toast.error(bi('الملاحظة مطلوبة (5 أحرف على الأقل)', 'Note required (min 5 chars)'));
      return;
    }
    setBusy(true);
    const r = await applyAssetOverride({
      asset_id: assetId, reason, note,
      new_asset_status: newStatus !== currentStatus ? newStatus : undefined,
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error || bi('فشل التجاوز', 'Override failed'));
      return;
    }
    toast.success(bi(`تم: ${r.override_ref}`, `Applied: ${r.override_ref}`));
    setNote('');
    onApplied?.();
  };

  return (
    <Card className="p-3 space-y-3 border-dashed border-rose-300/50">
      <div className="font-semibold flex items-center gap-2 text-rose-700 dark:text-rose-300">
        <ShieldAlert className="size-4" />
        <Bi ar="تجاوز إداري موثَّق" en="Audited admin override" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={reason} onValueChange={v => setReason(v as OverrideReason)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OVERRIDE_REASONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{bi(r.ar, r.en)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={newStatus} onValueChange={v => setNewStatus(v as AssetStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        dir="auto"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={bi('سبب التجاوز (إلزامي، ≥ 5 أحرف)', 'Override note (required, ≥ 5 chars)')}
        rows={2}
      />
      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy} variant="destructive" size="sm">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Bi ar="تطبيق التجاوز" en="Apply override" />}
        </Button>
      </div>
    </Card>
  );
};

// dummy to satisfy unused import in some builds
export const _StatusInput = Input;
