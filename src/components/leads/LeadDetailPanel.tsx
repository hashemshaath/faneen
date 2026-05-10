import React from 'react';
import { Mail, Phone, Wallet, FileText, Calendar, Building2, MessageSquare, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
}

interface Props {
  lead: LeadRow;
  pending?: boolean;
  onAction: (next: LeadStatus) => void;
  onOpenConversation?: () => void;
}

export const LeadDetailPanel: React.FC<Props> = ({ lead, pending, onAction, onOpenConversation }) => {
  const { isRTL } = useLanguage();
  const canHaveConversation = lead.user_id !== null && (lead.status === 'accepted' || lead.status === 'needs_info');
  const isGuest = lead.user_id === null;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{lead.business_name ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date(lead.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
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