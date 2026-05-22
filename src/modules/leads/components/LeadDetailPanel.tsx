import React, { useState } from 'react';
import { Mail, Phone, Wallet, FileText, Calendar, Building2, MessageSquare, UserX, ReceiptText, Send, Loader2, FilePlus2, ExternalLink, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/i18n/LanguageContext';
import { LeadStatusBadge, type LeadStatus } from './LeadStatusBadge';
import { LeadActionsBar } from './LeadActionsBar';

export interface LeadRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  business_name?: string | null;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  budget_range: string | null;
  project_scope: string | null;
  contact_preference: string | null;
  status: string;
  priority: string;
  source: string | null;
  created_at: string;
  conversation_id?: string | null;
  quoted_at?: string | null;
  quote_amount?: number | string | null;
  quote_currency?: string | null;
  quote_note?: string | null;
  quote_valid_until?: string | null;
  converted_contract_id?: string | null;
  is_demo?: boolean | null;
}

interface Props {
  lead: LeadRow;
  pending?: boolean;
  onAction: (next: LeadStatus) => void;
  onOpenConversation?: () => void;
  onSendQuote?: (input: { amount: number; currency: 'SAR'; note: string | null; valid_until: string | null }) => void;
}

export const LeadDetailPanel: React.FC<Props> = ({ lead, pending, onAction, onOpenConversation, onSendQuote }) => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const canHaveConversation = lead.user_id !== null && (lead.status === 'accepted' || lead.status === 'needs_info');
  const isGuest = lead.user_id === null;
  const canQuote = (lead.status === 'accepted' || lead.status === 'needs_info') && !!onSendQuote;
  const contractEligibleStatuses = ['new', 'viewed', 'accepted', 'quoted', 'needs_info'];
  const canCreateContract = contractEligibleStatuses.includes(lead.status);
  const alreadyConverted = !!lead.converted_contract_id;
  const isDemo = !!lead.is_demo;
  const [showQuote, setShowQuote] = useState(false);
  const [amount, setAmount] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [note, setNote] = useState('');
  const [errs, setErrs] = useState<{ amount?: string; valid_until?: string }>({});
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmitQuote = () => {
    const n = Number(amount);
    const next: typeof errs = {};
    if (!Number.isFinite(n) || n <= 0) {
      next.amount = isRTL ? 'أدخل قيمة صحيحة أكبر من صفر' : 'Enter a valid amount greater than 0';
    }
    if (validUntil && validUntil < today) {
      next.valid_until = isRTL ? 'يجب أن يكون اليوم أو بعده' : 'Must be today or later';
    }
    setErrs(next);
    if (Object.keys(next).length > 0) return;
    onSendQuote?.({
      amount: n,
      currency: 'SAR',
      note: note.trim() ? note.trim() : null,
      valid_until: validUntil || null,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground tech-content">{lead.ref_id ?? '—'}</span>
          <LeadStatusBadge status={lead.status} />
        </div>
        <LeadActionsBar status={lead.status} pending={pending} onAction={onAction} />
      </div>

      {lead.subject && (
        <h3 className="font-heading font-semibold text-base">{lead.subject}</h3>
      )}

      <p className="text-sm leading-7 whitespace-pre-wrap text-foreground/90">{lead.message}</p>

      {/* 5B.3 — Create Contract from Lead */}
      {(canCreateContract || alreadyConverted) && (
        <div className="rounded-xl border border-border bg-background p-3 sm:p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {alreadyConverted ? (
              <>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => navigate(`/contracts/${lead.converted_contract_id}`)}
                >
                  <ExternalLink />
                  <span>{isRTL ? 'فتح العقد الحالي' : 'Open existing contract'}</span>
                </Button>
                <span className="text-xs text-muted-foreground">
                  {isRTL ? 'تم إنشاء عقد لهذا الطلب' : 'A contract has been created for this lead'}
                </span>
              </>
            ) : (
              <Button
                variant="default"
                className="min-h-[44px]"
                disabled={pending || isDemo}
                onClick={() => navigate(`/dashboard/contracts?lead=${encodeURIComponent(lead.id)}`)}
                aria-label={isRTL ? 'إنشاء عقد من الطلب' : 'Create Contract from Lead'}
              >
                <FilePlus2 />
                <span>{isRTL ? 'إنشاء عقد من الطلب' : 'Create Contract from Lead'}</span>
              </Button>
            )}
          </div>
          {!alreadyConverted && (
            <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground leading-5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {isDemo
                  ? (isRTL
                      ? 'هذا طلب تجريبي ولا يمكن تحويله إلى عقد.'
                      : 'This is a demo lead and cannot be converted into a contract.')
                  : (isRTL
                      ? 'سيتم تعبئة بعض الحقول من الطلب، ويمكنك مراجعتها قبل حفظ المسودة.'
                      : 'Some fields will be suggested from the lead. You can review them before saving the draft.')}
              </span>
            </p>
          )}
        </div>
      )}

      {canHaveConversation && (
        <div className="flex flex-wrap gap-2 pt-1">
          {lead.conversation_id ? (
            <Button asChild variant="default" className="min-h-[44px]">
              <Link to={`/dashboard/messages?conversation=${lead.conversation_id}`}>
                <MessageSquare />
                <span>{isRTL ? 'فتح المحادثة' : 'Open conversation'}</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="default"
              className="min-h-[44px]"
              disabled={pending || !onOpenConversation}
              onClick={onOpenConversation}
            >
              <MessageSquare />
              <span>{isRTL ? 'بدء المحادثة' : 'Start conversation'}</span>
            </Button>
          )}
          {canQuote && (
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setShowQuote((v) => !v)}
              disabled={pending}
              aria-expanded={showQuote}
            >
              <ReceiptText />
              <span>{isRTL ? 'إرسال عرض سعر' : 'Send a quote'}</span>
            </Button>
          )}
        </div>
      )}
      {isGuest && (lead.status === 'accepted' || lead.status === 'needs_info') && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <UserX className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {isRTL
              ? 'هذا الطلب من زائر غير مسجل. يمكن التواصل معه عبر بيانات التواصل المتاحة أدناه.'
              : 'This request is from a guest. Use the contact details below to reach out.'}
          </span>
        </div>
      )}

      {/* SR-3B: Inline quote form (no popup). */}
      {canQuote && showQuote && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">{isRTL ? 'تفاصيل عرض السعر' : 'Quote details'}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`quote-amount-${lead.id}`}>
                {isRTL ? 'القيمة (ريال سعودي)' : 'Amount (SAR)'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`quote-amount-${lead.id}`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tech-content"
                aria-invalid={!!errs.amount}
                aria-describedby={errs.amount ? `quote-amount-err-${lead.id}` : undefined}
              />
              {errs.amount && (
                <p id={`quote-amount-err-${lead.id}`} className="text-xs text-destructive">{errs.amount}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`quote-valid-${lead.id}`}>
                {isRTL ? 'صالح حتى (اختياري)' : 'Valid until (optional)'}
              </Label>
              <Input
                id={`quote-valid-${lead.id}`}
                type="date"
                min={today}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="tech-content"
                aria-invalid={!!errs.valid_until}
                aria-describedby={errs.valid_until ? `quote-valid-err-${lead.id}` : undefined}
              />
              {errs.valid_until && (
                <p id={`quote-valid-err-${lead.id}`} className="text-xs text-destructive">{errs.valid_until}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`quote-note-${lead.id}`}>
              {isRTL ? 'ملاحظة (اختياري)' : 'Note (optional)'}
            </Label>
            <Textarea
              id={`quote-note-${lead.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              dir="auto"
              placeholder={isRTL ? 'تفاصيل أو شروط العرض' : 'Quote details or conditions'}
            />
            <p className="text-[11px] text-muted-foreground">{note.length}/1000</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmitQuote} disabled={pending} className="min-h-[44px]">
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              <span>{isRTL ? 'إرسال العرض' : 'Send quote'}</span>
            </Button>
            <Button variant="ghost" onClick={() => setShowQuote(false)} disabled={pending} className="min-h-[44px]">
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Quote summary card after status = quoted */}
      {lead.status === 'quoted' && lead.quote_amount != null && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">{isRTL ? 'عرض السعر المرسل' : 'Quote sent'}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="tech-content font-medium">
                {Number(lead.quote_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} {lead.quote_currency ?? 'SAR'}
              </span>
            </div>
            {lead.quote_valid_until && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="tech-content">
                  {isRTL ? 'صالح حتى: ' : 'Valid until: '}{lead.quote_valid_until}
                </span>
              </div>
            )}
            {lead.quoted_at && (
              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span className="tech-content">{new Date(lead.quoted_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</span>
              </div>
            )}
            {lead.quote_note && (
              <div className="sm:col-span-2 flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="leading-6 whitespace-pre-wrap text-foreground/90">{lead.quote_note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{lead.business_name ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date(lead.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${lead.email}`} className="tech-content hover:underline">{lead.email}</a>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${lead.phone}`} className="tech-content hover:underline">{lead.phone}</a>
          </div>
        )}
        {lead.budget_range && (
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" />
            <span>{lead.budget_range}</span>
          </div>
        )}
        {lead.project_scope && (
          <div className="flex items-start gap-2 sm:col-span-2"><FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="leading-6">{lead.project_scope}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetailPanel;