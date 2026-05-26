/**
 * IdentityBulkBar — Sticky toolbar shown when rows are selected.
 * Supports CSV export, enable/disable (users), and verify toggle (businesses).
 * Every mutation writes an `admin_activity_log` entry.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  X, Download, Ban, CheckCircle2, ShieldCheck, Loader2,
} from 'lucide-react';
import { updateProfilesByIds } from '@/modules/users';
import { updateBusinessesByIds, bulkSetBusinessesVerified } from '@/modules/businesses';
import { logAdminActivityBatch } from '@/modules/identity';

export type BulkKind = 'user' | 'business';

export interface BulkRow {
  kind: BulkKind;
  id: string;       // profile.id or business.id
  refId?: string | null;
  label?: string | null;
}

interface Props {
  selected: BulkRow[];
  onClear: () => void;
  onMutated: () => void;     // refetch parent queries
  isRTL: boolean;
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const IdentityBulkBar: React.FC<Props> = ({ selected, onClear, onMutated, isRTL }) => {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  if (selected.length === 0) return null;

  const users = selected.filter(s => s.kind === 'user');
  const biz   = selected.filter(s => s.kind === 'business');

  const trimmedReason = reason.trim() || undefined;

  const handleExportCsv = () => {
    const header = ['kind', 'id', 'ref_id', 'label'];
    const lines = [header.join(',')];
    selected.forEach(s => lines.push([s.kind, s.id, s.refId ?? '', s.label ?? ''].map(csvCell).join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `identity-selection-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير CSV' : 'CSV exported');
  };

  const handleToggleBan = async (isBanned: boolean) => {
    if (users.length === 0) return;
    setBusy(true);
    try {
      const ids = users.map(u => u.id);
      const { error } = await updateProfilesByIds({ ids, values: { is_banned: isBanned } });
      if (error) throw error;
      await logAdminActivityBatch(users.map(u => ({
        action: isBanned ? 'user.disable.bulk' : 'user.enable.bulk',
        entityType: 'profile',
        entityId: u.id,
        details: { ref_id: u.refId, label: u.label, count: users.length, reason: trimmedReason },
      })));
      toast.success(isRTL
        ? `${isBanned ? 'تم تعطيل' : 'تم تفعيل'} ${users.length} مستخدم`
        : `${isBanned ? 'Disabled' : 'Enabled'} ${users.length} user(s)`);
      onMutated();
      onClear();
    } catch (e) {
      toast.error((e instanceof Error ? e.message : isRTL ? 'فشلت العملية' : 'Operation failed'));
    } finally { setBusy(false); }
  };

  const handleVerifyBiz = async (isVerified: boolean) => {
    if (biz.length === 0) return;
    setBusy(true);
    try {
      const ids = biz.map(b => b.id);
      await bulkSetBusinessesVerified(ids, isVerified);
      await logAdminActivityBatch(biz.map(b => ({
        action: isVerified ? 'business.verify.bulk' : 'business.unverify.bulk',
        entityType: 'business',
        entityId: b.id,
        details: { ref_id: b.refId, label: b.label, count: biz.length, reason: trimmedReason },
      })));
      toast.success(isRTL
        ? `${isVerified ? 'تم توثيق' : 'تم إلغاء توثيق'} ${biz.length} منشأة`
        : `${isVerified ? 'Verified' : 'Unverified'} ${biz.length} business(es)`);
      onMutated();
      onClear();
    } catch (e) {
      toast.error((e instanceof Error ? e.message : isRTL ? 'فشلت العملية' : 'Operation failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="sticky top-2 z-30 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-2 flex-wrap animate-in slide-in-from-top-2 duration-150">
      <Badge className="bg-primary text-primary-foreground gap-1">
        {selected.length} {isRTL ? 'محدد' : 'selected'}
      </Badge>
      {users.length > 0 && <Badge variant="outline" className="text-info border-info/30">{users.length} {isRTL ? 'مستخدم' : 'users'}</Badge>}
      {biz.length > 0 && <Badge variant="outline" className="text-success border-success/30">{biz.length} {isRTL ? 'منشأة' : 'businesses'}</Badge>}

      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={isRTL ? 'سبب اختياري (يُسجَّل بالتدقيق)' : 'Optional reason (logged to audit)'}
        className="h-8 rounded-xl w-full sm:w-64 text-xs"
        dir="auto"
      />

      <div className="ms-auto flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={handleExportCsv} disabled={busy}>
          <Download className="w-3.5 h-3.5" />{isRTL ? 'تصدير CSV' : 'Export CSV'}
        </Button>
        {users.length > 0 && (
          <>
            <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5 text-success border-success/30 hover:bg-success/10"
              onClick={() => handleToggleBan(false)} disabled={busy}>
              <CheckCircle2 className="w-3.5 h-3.5" />{isRTL ? 'تفعيل' : 'Enable'}
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => handleToggleBan(true)} disabled={busy}>
              <Ban className="w-3.5 h-3.5" />{isRTL ? 'تعطيل' : 'Disable'}
            </Button>
          </>
        )}
        {biz.length > 0 && (
          <>
            <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5 text-success border-success/30 hover:bg-success/10"
              onClick={() => handleVerifyBiz(true)} disabled={busy}>
              <ShieldCheck className="w-3.5 h-3.5" />{isRTL ? 'توثيق' : 'Verify'}
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5"
              onClick={() => handleVerifyBiz(false)} disabled={busy}>
              {isRTL ? 'إلغاء التوثيق' : 'Unverify'}
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="rounded-xl h-8 gap-1.5" onClick={onClear} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          {isRTL ? 'إلغاء' : 'Clear'}
        </Button>
      </div>
    </div>
  );
};