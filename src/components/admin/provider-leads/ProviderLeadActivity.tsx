/**
 * Activity timeline + internal notes for a lead.
 * Derives events from row data and any sidecar `internalNotes` embedded
 * in `admin_notes`. Adding a note re-saves admin_notes via the same RPC
 * the detail panel uses (no new tables).
 */
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquarePlus, Clock, FileText, Activity, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { updateProviderLeadStatus, type ProviderLeadRow } from '@/modules/providers';
import { appendInternalNote, buildActivityTimeline, parseLeadMeta } from './providerLeadHelpers';

interface Props {
  lead: ProviderLeadRow;
  onSaved: () => void;
}

function renderMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[\w-]+)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 text-primary">
        <AtSign className="h-2.5 w-2.5" />{p.slice(1)}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

export const ProviderLeadActivity: React.FC<Props> = ({ lead, onSaved }) => {
  const { isRTL } = useLanguage();
  const events = useMemo(() => buildActivityTimeline(lead), [lead]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const nextNotes = appendInternalNote(lead.admin_notes, t);
    const res = await updateProviderLeadStatus({ leadId: lead.id, status: lead.status, adminNotes: nextNotes });
    setBusy(false);
    if (res.error) {
      toast.error(isRTL ? 'تعذر إضافة الملاحظة' : 'Could not add note');
      return;
    }
    setText('');
    toast.success(isRTL ? 'تمت إضافة الملاحظة' : 'Note added');
    onSaved();
  };

  const iconFor = (kind: string) => {
    if (kind === 'note') return MessageSquarePlus;
    if (kind === 'status') return Activity;
    if (kind === 'enriched') return FileText;
    return Clock;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
          <Bi ar="ملاحظة داخلية" en="Internal note" />
        </div>
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isRTL ? 'اكتب ملاحظة… استخدم @ لذكر زميل' : 'Write a note… use @ to mention'}
          className="rounded-lg text-xs"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={submit} disabled={busy || !text.trim()} className="h-8 rounded-lg text-[11px]">
            {busy ? <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" /> : null}
            <Bi ar="إضافة" en="Add" />
          </Button>
        </div>
      </div>

      <ol className="relative space-y-3 ps-4">
        <span className="absolute inset-y-0 start-1.5 w-px bg-border" aria-hidden />
        {events.map((e, i) => {
          const Icon = iconFor(e.kind);
          return (
            <li key={i} className="relative">
              <span className="absolute -start-2.5 top-1 grid h-3 w-3 place-items-center rounded-full bg-background ring-2 ring-border">
                <Icon className="h-2 w-2 text-muted-foreground" aria-hidden />
              </span>
              <div className="text-[11px] text-muted-foreground tech-content">
                {new Date(e.at).toLocaleString()}
                {e.by && <span className="ms-1 opacity-70">· {e.by}</span>}
              </div>
              <div className="text-xs">{renderMentions(isRTL ? e.ar : e.en)}</div>
            </li>
          );
        })}
        {events.length === 0 && (
          <li className="text-[11px] text-muted-foreground">
            <Bi ar="لا توجد أنشطة بعد." en="No activity yet." />
          </li>
        )}
      </ol>
    </div>
  );
};

export default ProviderLeadActivity;