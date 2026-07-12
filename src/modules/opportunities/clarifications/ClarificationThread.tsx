/**
 * R4 — Compact inline clarification (Q&A) thread. Used for:
 *  - Per-bid threads (bidId set): visible to RFQ owner + bid provider staff.
 *  - General RFQ thread (bidId=null): owner + every provider with a lead.
 *
 * RTL, Arabic-first. No modal — expands inline inside its parent card.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { listClarifications, postClarification } from './services';
import type { ClarificationAuthorRole, RfqClarificationRow } from './types';

interface Props {
  opportunityId: string;
  /** null = general RFQ thread, string = per-bid thread. */
  bidId?: string | null;
  authorRole: ClarificationAuthorRole;
  /** Recipient of the counter-party notification. */
  notifyUserId?: string | null;
  /** Optional heading label; defaults to a sensible Arabic label. */
  title?: string;
  /** Start collapsed by default. */
  defaultOpen?: boolean;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function authorChip(role: string): { label: string; className: string } {
  if (role === 'client') return { label: 'العميل', className: 'bg-primary/10 text-primary' };
  if (role === 'provider') return { label: 'المورّد', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
  return { label: 'الإدارة', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' };
}

export const ClarificationThread: React.FC<Props> = ({
  opportunityId,
  bidId = null,
  authorRole,
  notifyUserId = null,
  title,
  defaultOpen = false,
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [body, setBody] = useState('');

  const queryKey = ['rfq-clarifications', opportunityId, bidId ?? 'general'] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!opportunityId && open,
    queryFn: () => listClarifications(opportunityId, bidId),
  });

  const postMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('يجب تسجيل الدخول');
      return postClarification({
        opportunityId,
        bidId: bidId ?? null,
        authorRole,
        authorUserId: user.id,
        body,
        notifyUserId,
      });
    },
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['quote-request-events', opportunityId] });
      toast.success('تم إرسال الرسالة');
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر إرسال الرسالة');
    },
  });

  const rows: RfqClarificationRow[] = data ?? [];
  const heading = useMemo(
    () => title ?? (bidId ? 'محادثة توضيحات مع المورّد' : 'استفسارات عامة على الطلب'),
    [title, bidId],
  );

  return (
    <div dir="rtl" className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 text-start hover:bg-accent/40"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{heading}</span>
          {rows.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{rows.length}</Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-3">
          {isLoading ? (
            <div className="text-xs text-muted-foreground">جارٍ التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              لا توجد رسائل بعد. ابدأ المحادثة أدناه.
            </div>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {rows.map((m) => {
                const chip = authorChip(m.author_role);
                return (
                  <li key={m.id} className="rounded-lg border p-2 bg-background">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge className={`${chip.className} border-transparent`} variant="outline">
                        {chip.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tech-content">
                        {fmtTime(m.created_at)}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 4000))}
              placeholder="اكتب رسالتك..."
              rows={2}
              dir="auto"
              maxLength={4000}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground tech-content">
                {body.length}/4000
              </span>
              <Button
                size="sm"
                onClick={() => postMut.mutate()}
                disabled={postMut.isPending || !body.trim()}
                className="min-h-[36px]"
              >
                {postMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-1" />
                ) : (
                  <Send className="h-4 w-4 me-1" />
                )}
                إرسال
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClarificationThread;
