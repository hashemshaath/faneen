import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Mail, Send, Loader2, Copy, Trash2, Clock, CheckCircle2, XCircle, RotateCw,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { STAFF_ROLE_META, type StaffRole } from './types';

interface InvitationRow {
  id: string;
  email: string;
  role: StaffRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

interface Props {
  businessId: string;
  businessNameAr: string | null;
  businessNameEn: string | null;
  isRTL: boolean;
  canManage: boolean;
}

const generateToken = (): string => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
};

const STATUS_TONE: Record<string, string> = {
  pending: 'border-info/30 bg-info/10 text-info',
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  revoked: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  expired: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export const InvitationsPanel: React.FC<Props> = ({
  businessId, businessNameAr, businessNameEn, isRTL, canManage,
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('viewer');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['business-invitations', businessId],
    enabled: !!businessId && canManage,
    queryFn: async (): Promise<InvitationRow[]> => {
      const { data, error } = await supabase
        .from('business_staff_invitations')
        .select('id, email, role, status, token, expires_at, created_at, accepted_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvitationRow[];
    },
  });

  const acceptUrlFor = (token: string) => `${window.location.origin}/staff-invite/${token}`;

  const sendInvitation = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(isRTL ? 'أدخل بريدًا إلكترونيًا صحيحًا' : 'Enter a valid email address');
      return;
    }
    if (!user) return;
    setSending(true);
    try {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inserted, error: insertError } = await supabase
        .from('business_staff_invitations')
        .insert({
          business_id: businessId,
          email: trimmed,
          role,
          token,
          invited_by: user.id,
          expires_at: expiresAt,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      // Resolve inviter name from profile (best-effort)
      let inviterName: string | undefined;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.full_name) inviterName = profile.full_name;

      const { error: emailError } = await sendTransactionalEmail({
        templateName: 'business-staff-invitation',
        recipientEmail: trimmed,
        idempotencyKey: `staff-invite-${inserted?.id ?? token}`,
        templateData: {
          recipientEmail: trimmed,
          businessName: isRTL ? (businessNameAr ?? businessNameEn ?? '') : (businessNameEn ?? businessNameAr ?? ''),
          inviterName,
          roleAr: STAFF_ROLE_META[role].ar,
          roleEn: STAFF_ROLE_META[role].en,
          acceptUrl: acceptUrlFor(token),
          expiryDate: expiresAt.slice(0, 10),
        },
      });
      if (emailError) throw emailError;

      toast.success(isRTL ? 'تم إرسال الدعوة بالبريد الإلكتروني' : 'Invitation email sent');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['business-invitations', businessId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّر الإرسال: ${msg}` : `Failed to send: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  const revokeInvitation = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from('business_staff_invitations')
        .update({ status: 'revoked' })
        .eq('id', id);
      if (error) throw error;
      toast.success(isRTL ? 'تم إلغاء الدعوة' : 'Invitation revoked');
      qc.invalidateQueries({ queryKey: ['business-invitations', businessId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّر الإلغاء: ${msg}` : `Revoke failed: ${msg}`);
    } finally {
      setBusyId(null);
    }
  };

  const resendInvitation = async (row: InvitationRow) => {
    setBusyId(row.id);
    try {
      const { error: emailError } = await sendTransactionalEmail({
        templateName: 'business-staff-invitation',
        recipientEmail: row.email,
        idempotencyKey: `staff-invite-resend-${row.id}-${Date.now()}`,
        templateData: {
          recipientEmail: row.email,
          businessName: isRTL ? (businessNameAr ?? businessNameEn ?? '') : (businessNameEn ?? businessNameAr ?? ''),
          roleAr: STAFF_ROLE_META[row.role].ar,
          roleEn: STAFF_ROLE_META[row.role].en,
          acceptUrl: acceptUrlFor(row.token),
          expiryDate: row.expires_at.slice(0, 10),
        },
      });
      if (emailError) throw emailError;
      toast.success(isRTL ? 'تم إعادة إرسال الدعوة' : 'Invitation resent');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّر الإرسال: ${msg}` : `Resend failed: ${msg}`);
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(acceptUrlFor(token));
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  if (!canManage) return null;

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Mail className="w-4 h-4 text-primary" />
        {isRTL ? 'دعوة عبر البريد الإلكتروني' : 'Invite via email'}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">
            {isRTL ? 'البريد الإلكتروني للمفوّض' : "Representative's email"}
          </Label>
          <Input
            dir="ltr"
            type="email"
            className="mt-1"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{isRTL ? 'الدور' : 'Role'}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['manager', 'editor', 'viewer'] as StaffRole[]).map((r) => (
                <SelectItem key={r} value={r}>{isRTL ? STAFF_ROLE_META[r].ar : STAFF_ROLE_META[r].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={sendInvitation} disabled={sending} className="gap-1.5">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isRTL ? 'إرسال' : 'Send'}
        </Button>
      </div>

      {/* Invitation list */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          {isRTL ? 'جارِ التحميل…' : 'Loading invitations…'}
        </div>
      ) : invitations.length > 0 && (
        <ul className="rounded-lg border border-border divide-y divide-border bg-card">
          {invitations.map((inv) => (
            <li key={inv.id} className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium tech-content truncate">{inv.email}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{isRTL ? STAFF_ROLE_META[inv.role].ar : STAFF_ROLE_META[inv.role].en}</span>
                  <span>·</span>
                  <Clock className="w-3 h-3 inline" />
                  <span className="tech-content">{new Date(inv.expires_at).toLocaleDateString()}</span>
                </p>
              </div>
              <Badge variant="outline" className={STATUS_TONE[inv.status]}>
                {inv.status === 'accepted' && <CheckCircle2 className="w-3 h-3 me-1" />}
                {inv.status === 'revoked' && <XCircle className="w-3 h-3 me-1" />}
                {inv.status === 'expired' && <Clock className="w-3 h-3 me-1" />}
                {inv.status}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  title={isRTL ? 'نسخ الرابط' : 'Copy link'}
                  onClick={() => copyLink(inv.token)}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                {inv.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title={isRTL ? 'إعادة إرسال' : 'Resend'}
                      disabled={busyId === inv.id}
                      onClick={() => resendInvitation(inv)}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      title={isRTL ? 'إلغاء' : 'Revoke'}
                      disabled={busyId === inv.id}
                      onClick={() => revokeInvitation(inv.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};