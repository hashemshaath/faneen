import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMembershipInviteKeys,
  listMembershipAccessKeys,
  generateInviteKey,
  revokeInviteKey,
  createAccessKey,
  revokeAccessKey,
} from '@/modules/memberships';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Key, UserPlus, Copy, Trash2, Loader2, ShieldCheck, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { MembershipKeyUsageLog } from './MembershipKeyUsageLog';

interface Props { isRTL: boolean; businessId: string }

type InviteKey = {
  id: string; code: string; role: string; max_uses: number; used_count: number;
  expires_at: string | null; status: string; created_at: string;
};
type AccessKey = {
  id: string; name: string; key_prefix: string; scopes: unknown;
  tier_at_creation: string; expires_at: string | null;
  revoked_at: string | null; last_used_at: string | null; created_at: string;
};

export const MembershipKeysManager: React.FC<Props> = ({ isRTL, businessId }) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'invite' | 'access' | 'usage'>('invite');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'manager'>('viewer');
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [accessName, setAccessName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // ---- Queries ----
  const { data: inviteKeys = [] } = useQuery({
    queryKey: ['invite-keys', businessId],
    queryFn: async () => {
      const { data } = await listMembershipInviteKeys<InviteKey>({ businessId });
      return (data ?? []) as InviteKey[];
    },
  });

  const { data: accessKeys = [] } = useQuery({
    queryKey: ['access-keys', businessId],
    queryFn: async () => {
      const { data } = await listMembershipAccessKeys<AccessKey>({ businessId });
      return (data ?? []) as AccessKey[];
    },
  });

  // ---- Mutations ----
  const generateInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await generateInviteKey({
        _business_id: businessId,
        _role: inviteRole,
        _max_uses: inviteMaxUses,
        _valid_days: null,
        _notes: null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as unknown as { id: string; code: string });
      return row as { id: string; code: string };
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['invite-keys', businessId] });
      setShowInviteForm(false);
      navigator.clipboard?.writeText(row.code).catch(() => {});
      toast.success(isRTL ? 'تم إنشاء المفتاح ونسخه' : 'Key created and copied');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await revokeInviteKey({ _key_id: id, _reason: 'manual_revoke' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite-keys', businessId] });
      toast.success(isRTL ? 'تم الإلغاء' : 'Revoked');
    },
  });

  const createAccess = useMutation({
    mutationFn: async () => {
      const { data, error } = await createAccessKey({
        _name: accessName.trim(),
        _scopes: ['read'],
        _business_id: businessId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as unknown as { id: string; raw_key: string });
      return row as { id: string; raw_key: string };
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['access-keys', businessId] });
      setShowAccessForm(false);
      setAccessName('');
      setRevealedKey(row.raw_key);
      navigator.clipboard?.writeText(row.raw_key).catch(() => {});
      toast.success(isRTL ? 'تم إنشاء المفتاح ونسخه — يظهر مرة واحدة فقط!' : 'Key created and copied — shown only once!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAccess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await revokeAccessKey({ _key_id: id, _reason: 'manual_revoke' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-keys', businessId] });
      toast.success(isRTL ? 'تم الإلغاء' : 'Revoked');
    },
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-success/10 text-success',
      revoked: 'bg-destructive/10 text-destructive',
      expired: 'bg-muted text-muted-foreground',
      exhausted: 'bg-warning/10 text-warning',
    };
    return map[s] ?? 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="max-w-4xl mx-auto mt-8 border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <h3 className="font-heading font-bold text-sm">
            {isRTL ? 'مفاتيح وروابط العضوية' : 'Membership Keys & Invites'}
          </h3>
        </div>

        <div className="flex gap-1 mb-4 border-b border-border">
          {(['invite', 'access', 'usage'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'invite'
                ? (isRTL ? `روابط الدعوة (${inviteKeys.length})` : `Invite Links (${inviteKeys.length})`)
                : t === 'access'
                ? (isRTL ? `مفاتيح API (${accessKeys.length})` : `API Keys (${accessKeys.length})`)
                : (isRTL ? 'سجل الاستخدام' : 'Usage Log')}
            </button>
          ))}
        </div>

        {tab === 'invite' && (
          <div>
            {!showInviteForm ? (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 mb-3" onClick={() => setShowInviteForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                {isRTL ? 'إنشاء رابط دعوة' : 'Create invite link'}
              </Button>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                    className="h-9 text-xs border border-input rounded-md bg-background px-2 flex-1"
                  >
                    <option value="viewer">{isRTL ? 'مشاهد' : 'Viewer'}</option>
                    <option value="editor">{isRTL ? 'محرر' : 'Editor'}</option>
                    <option value="manager">{isRTL ? 'مدير' : 'Manager'}</option>
                  </select>
                  <Input
                    type="number" min={1} max={100}
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-xs w-20 tech-content"
                    placeholder={isRTL ? 'استخدامات' : 'Uses'}
                  />
                  <Button size="sm" className="h-9 text-xs gap-1" onClick={() => generateInvite.mutate()} disabled={generateInvite.isPending}>
                    {generateInvite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isRTL ? 'إنشاء' : 'Create'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setShowInviteForm(false)}>×</Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isRTL ? 'تنتهي الصلاحية تلقائياً مع انتهاء الباقة.' : 'Auto-expires with your plan.'}
                </p>
              </div>
            )}

            {inviteKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {isRTL ? 'لا توجد روابط دعوة بعد.' : 'No invite links yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {inviteKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-card">
                    <UserPlus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <code className="text-[11px] tech-content flex-1 truncate">{k.code}</code>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{k.role}</Badge>
                    <span className="text-[10px] text-muted-foreground tech-content">{k.used_count}/{k.max_uses}</span>
                    <Badge className={`text-[9px] px-1.5 py-0 h-4 ${statusBadge(k.status)}`}>{k.status}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard?.writeText(k.code); toast.success(isRTL ? 'تم النسخ' : 'Copied'); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    {k.status === 'active' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => revokeInvite.mutate(k.id)} disabled={revokeInvite.isPending}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'access' && (
          <div>
            {revealedKey && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 mb-3">
                <p className="text-xs font-medium text-warning mb-2">
                  {isRTL ? '⚠️ احفظ هذا المفتاح الآن — لن يظهر مرة أخرى!' : '⚠️ Save this key now — it will not be shown again!'}
                </p>
                <div className="flex gap-2">
                  <code className="text-[11px] tech-content bg-background px-2 py-1.5 rounded border flex-1 break-all">{revealedKey}</code>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setRevealedKey(null)}>
                    {isRTL ? 'إخفاء' : 'Hide'}
                  </Button>
                </div>
              </div>
            )}

            {!showAccessForm ? (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 mb-3" onClick={() => setShowAccessForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                {isRTL ? 'إنشاء مفتاح API' : 'Create API key'}
              </Button>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3 flex gap-2">
                <Input
                  value={accessName}
                  onChange={(e) => setAccessName(e.target.value)}
                  placeholder={isRTL ? 'اسم المفتاح (مثل: تكامل ERP)' : 'Key name (e.g. ERP integration)'}
                  className="h-9 text-xs flex-1"
                  maxLength={64}
                />
                <Button size="sm" className="h-9 text-xs gap-1" onClick={() => createAccess.mutate()} disabled={!accessName.trim() || createAccess.isPending}>
                  {createAccess.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {isRTL ? 'إنشاء' : 'Create'}
                </Button>
                <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setShowAccessForm(false); setAccessName(''); }}>×</Button>
              </div>
            )}

            {accessKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {isRTL ? 'لا توجد مفاتيح API بعد.' : 'No API keys yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {accessKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-card">
                    <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-medium truncate flex-1">{k.name}</span>
                    <code className="text-[10px] tech-content text-muted-foreground">{k.key_prefix}…</code>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{k.tier_at_creation}</Badge>
                    <Badge className={`text-[9px] px-1.5 py-0 h-4 ${k.revoked_at ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                      {k.revoked_at ? (isRTL ? 'ملغي' : 'Revoked') : (isRTL ? 'نشط' : 'Active')}
                    </Badge>
                    {!k.revoked_at && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => revokeAccess.mutate(k.id)} disabled={revokeAccess.isPending}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'usage' && (
          <MembershipKeyUsageLog isRTL={isRTL} businessId={businessId} />
        )}
      </CardContent>
    </Card>
  );
};
