/**
 * Phase-5B — read-only admin panel that drafts a support reply from the
 * unified knowledge registry. No sending, no saving, no external API.
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquareReply, Sparkles, ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  buildSupportReplyDraft,
  type SupportReplyChannel,
  type SupportReplyDraft,
  type SupportReplyTone,
} from '@/modules/knowledge';
import type { KnowledgeAudience, KnowledgeLocale } from '@/modules/knowledge';

const AUDIENCES: { value: KnowledgeAudience; label: string }[] = [
  { value: 'visitor', label: 'زائر' },
  { value: 'customer', label: 'عميل' },
  { value: 'provider', label: 'مزود' },
  { value: 'business_owner', label: 'صاحب عمل' },
  { value: 'admin', label: 'أدمن' },
  { value: 'operations', label: 'تشغيل' },
];

const CHANNELS: { value: SupportReplyChannel; label: string }[] = [
  { value: 'email', label: 'بريد إلكتروني' },
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'ticket', label: 'تذكرة' },
  { value: 'in_app', label: 'داخل النظام' },
];

const TONES: { value: SupportReplyTone; label: string }[] = [
  { value: 'neutral', label: 'حيادي' },
  { value: 'friendly', label: 'ودود' },
  { value: 'formal', label: 'رسمي' },
];

const SupportRepliesPanel: React.FC = () => {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<KnowledgeAudience>('customer');
  const [channel, setChannel] = useState<SupportReplyChannel>('email');
  const [tone, setTone] = useState<SupportReplyTone>('neutral');
  const [locale] = useState<KnowledgeLocale>('ar');
  const [draft, setDraft] = useState<SupportReplyDraft | null>(null);

  const generate = () => {
    setDraft(buildSupportReplyDraft({ message, audience, channel, locale, tone }));
  };

  return (
    <div className="space-y-4" data-testid="knowledge-admin-support-replies">
      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareReply className="h-4 w-4 text-primary" />
            <h2 className="font-heading font-bold text-sm">توليد مسودة رد دعم</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            هذه الواجهة قراءة فقط: لا تُرسل أي رسالة ولا تُحفظ أي مسودة. تستخدم مكتبة المعرفة الموحدة كمصدر وحيد.
          </p>
          <Input
            data-testid="support-reply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب شكوى أو سؤال المستخدم للتجربة…"
            className="h-10"
            dir="auto"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Field label="الجمهور">
              <Select value={audience} onValueChange={(v) => setAudience(v as KnowledgeAudience)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="القناة">
              <Select value={channel} onValueChange={(v) => setChannel(v as SupportReplyChannel)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="النبرة">
              <Select value={tone} onValueChange={(v) => setTone(v as SupportReplyTone)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button
            type="button"
            onClick={generate}
            size="sm"
            disabled={message.trim().length === 0}
            data-testid="support-reply-generate"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            توليد مسودة
          </Button>
        </CardContent>
      </Card>

      {draft && (
        <Card className="border-border/60" data-testid="support-reply-draft">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">النية: {draft.intent}</Badge>
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 ${draft.canAnswer ? 'text-success border-success/40' : 'text-warning border-warning/40'}`}
                data-testid="support-reply-can-answer"
              >
                {draft.canAnswer ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {draft.canAnswer ? 'يمكن الرد' : 'لا يمكن الرد'}
              </Badge>
              <Badge variant="outline" className="text-[10px]" data-testid="support-reply-escalation">
                {draft.escalationRecommended ? 'يوصى بالتصعيد' : 'بدون تصعيد'}
              </Badge>
              <Badge variant="outline" className="text-[10px] tabular-nums tech-content">ثقة: {Math.round(draft.confidence * 100)}%</Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">المسودة</p>
              <p className="text-sm leading-relaxed mt-1 whitespace-pre-line" data-testid="support-reply-text">{draft.reply}</p>
            </div>
            {draft.missingInformation.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">معلومات ناقصة</p>
                <ul className="text-xs list-disc ps-5 space-y-0.5">
                  {draft.missingInformation.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}
            {draft.sources.length > 0 && (
              <div data-testid="support-reply-sources">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">المصادر</p>
                <ul className="text-xs space-y-0.5">
                  {draft.sources.map((s) => <li key={s} className="tech-content">{s}</li>)}
                </ul>
              </div>
            )}
            {draft.relatedRoutes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">مسارات ذات صلة</p>
                <ul className="text-xs space-y-0.5">
                  {draft.relatedRoutes.map((r) => <li key={r} className="tech-content">{r}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    {children}
  </div>
);

export default SupportRepliesPanel;