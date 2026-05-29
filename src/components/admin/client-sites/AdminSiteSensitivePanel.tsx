import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { AlertTriangle, ChevronDown, Eye, EyeOff, FileText, MapPin, MessageSquare, Phone } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface SensitiveDetail {
  id: string;
  site_ref: string;
  site_name: string | null;
  label: string;
  site_type: string;
  city_name: string | null;
  district: string | null;
  address_line1: string | null;
  address_line2: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  owner_user_id: string | null;
  client_user_id: string | null;
  business_id: string | null;
  business_name_ar: string | null;
  business_name_en: string | null;
}

interface OpsNote {
  id: string;
  admin_user_id: string;
  note: string;
  category: string;
  created_at: string;
  archived_at: string | null;
}

type Channel = 'phone' | 'whatsapp' | 'email' | 'internal_note' | 'other';
type Category =
  | 'general' | 'follow_up' | 'data_quality' | 'customer_contact'
  | 'provider_issue' | 'security_review' | 'conversion_opportunity';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<Category, { ar: string; en: string }> = {
  general:                { ar: 'عام', en: 'General' },
  follow_up:              { ar: 'متابعة', en: 'Follow-up' },
  data_quality:           { ar: 'جودة البيانات', en: 'Data quality' },
  customer_contact:       { ar: 'تواصل مع العميل', en: 'Customer contact' },
  provider_issue:         { ar: 'مشكلة مزود', en: 'Provider issue' },
  security_review:        { ar: 'مراجعة أمنية', en: 'Security review' },
  conversion_opportunity: { ar: 'فرصة تحويل', en: 'Conversion opportunity' },
};

const CHANNEL_LABELS: Record<Channel, { ar: string; en: string }> = {
  phone:         { ar: 'هاتف', en: 'Phone' },
  whatsapp:      { ar: 'واتساب', en: 'WhatsApp' },
  email:         { ar: 'بريد', en: 'Email' },
  internal_note: { ar: 'ملاحظة داخلية', en: 'Internal note' },
  other:         { ar: 'أخرى', en: 'Other' },
};

const fmtDate = (iso: string, isRTL: boolean): string => {
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/* ------------------------------------------------------------------ */
/* Panel                                                              */
/* ------------------------------------------------------------------ */

interface Props { siteId: string }

const AdminSiteSensitivePanel: React.FC<Props> = ({ siteId }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState<SensitiveDetail | null>(null);

  // ---- Reveal mutation
  const revealMut = useMutation({
    mutationFn: async (): Promise<SensitiveDetail> => {
      const { data, error } = await supabase.rpc('admin_get_client_site_sensitive_detail', {
        _site_id: siteId,
        _reason: reason.trim(),
      });
      if (error) throw error;
      return data as unknown as SensitiveDetail;
    },
    onSuccess: (data) => {
      setDetail(data);
      toast({
        title: bi('تم استعراض البيانات', 'Sensitive data revealed'),
        description: bi('تم تسجيل عملية الاستعراض.', 'Reveal has been logged.'),
      });
    },
    onError: (e) => toast({
      title: bi('تعذّر الاستعراض', 'Reveal failed'),
      description: errMsg(e),
      variant: 'destructive',
    }),
  });

  // ---- Notes
  const notesQ = useQuery({
    queryKey: ['admin-site-ops-notes', siteId],
    queryFn: async (): Promise<OpsNote[]> => {
      const { data, error } = await supabase.rpc('admin_list_client_site_operations_notes', { _site_id: siteId });
      if (error) throw error;
      return (data as unknown as OpsNote[]) ?? [];
    },
  });

  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<Category>('general');
  const addNoteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_add_client_site_operations_note', {
        _site_id: siteId, _category: noteCategory, _note: noteText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText('');
      toast({ title: bi('تمت إضافة الملاحظة', 'Note added') });
      qc.invalidateQueries({ queryKey: ['admin-site-ops-notes', siteId] });
    },
    onError: (e) => toast({ title: bi('تعذّر الإضافة', 'Add failed'), description: errMsg(e), variant: 'destructive' }),
  });

  // ---- Contact action
  const [channel, setChannel] = useState<Channel>('phone');
  const [purpose, setPurpose] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const contactMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_log_client_site_contact_action', {
        _site_id: siteId, _channel: channel, _purpose: purpose.trim(),
        _notes: contactNotes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPurpose(''); setContactNotes('');
      toast({ title: bi('تم تسجيل الإجراء', 'Contact action logged') });
    },
    onError: (e) => toast({ title: bi('تعذّر التسجيل', 'Log failed'), description: errMsg(e), variant: 'destructive' }),
  });

  const canReveal = reason.trim().length >= 5 && !revealMut.isPending;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full rounded-lg border border-warning/40 bg-warning/5 p-3 text-start flex items-center gap-2 hover:bg-warning/10 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-sm font-semibold flex-1">
            {bi('بيانات حساسة للمراجعة التشغيلية', 'Sensitive operational details')}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4">
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
          {bi(
            'هذه البيانات خاصة وتستخدم فقط للمتابعة التشغيلية وتحسين الخدمة والتواصل عند الحاجة. سيتم تسجيل عملية الاستعراض.',
            'This information is private and should only be used for operational follow-up, service improvement, or necessary communication. This reveal will be logged.',
          )}
        </div>

        {!detail && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <Label htmlFor="reveal-reason" className="text-xs">
                {bi('سبب الاستعراض (5 أحرف على الأقل)', 'Reason for reveal (min 5 chars)')}
              </Label>
              <Textarea
                id="reveal-reason"
                dir="auto"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={bi('مثال: متابعة طلب وصول معلّق', 'e.g. follow-up on pending access request')}
                className="text-sm"
              />
              <Button size="sm" onClick={() => revealMut.mutate()} disabled={!canReveal} className="w-full">
                <Eye className="h-4 w-4 me-2" />
                {revealMut.isPending ? bi('جارٍ…', 'Working…') : bi('عرض البيانات الحساسة', 'Reveal sensitive data')}
              </Button>
            </CardContent>
          </Card>
        )}

        {detail && (
          <Card className="border-warning/40">
            <CardContent className="p-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{bi('تم الاستعراض وسُجِّل', 'Revealed & logged')}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>
                  <EyeOff className="h-4 w-4 me-1" /> {bi('إخفاء', 'Hide')}
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{bi('العنوان', 'Address')}</p>
                <p className="tech-content">{detail.address_line1 || '—'}{detail.address_line2 ? ` · ${detail.address_line2}` : ''}</p>
                <p className="text-xs text-muted-foreground tech-content">
                  {[detail.city_name, detail.district].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              {(detail.contact_name || detail.contact_phone) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{bi('جهة الاتصال', 'Contact')}</p>
                  {detail.contact_name && <p>{detail.contact_name}</p>}
                  {detail.contact_phone && (
                    <div className="flex items-center gap-2">
                      <span className="tech-content">{detail.contact_phone}</span>
                      <CopyButton value={detail.contact_phone} label={bi('هاتف', 'Phone')} />
                      <Button asChild size="sm" variant="outline" className="h-7">
                        <a href={`tel:${detail.contact_phone}`}><Phone className="h-3 w-3 me-1" />{bi('اتصال', 'Call')}</a>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(detail.map_url || (detail.latitude && detail.longitude)) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{bi('الموقع', 'Location')}</p>
                  {detail.map_url ? (
                    <Button asChild size="sm" variant="outline" className="h-7">
                      <a href={detail.map_url} target="_blank" rel="noopener noreferrer">
                        <MapPin className="h-3 w-3 me-1" />{bi('فتح الخريطة', 'Open map')}
                      </a>
                    </Button>
                  ) : null}
                  {detail.latitude != null && detail.longitude != null && (
                    <p className="text-xs text-muted-foreground tech-content">
                      {detail.latitude}, {detail.longitude}
                    </p>
                  )}
                </div>
              )}

              {detail.access_notes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{bi('ملاحظات الوصول', 'Access notes')}</p>
                  <p className="whitespace-pre-wrap">{detail.access_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Operations notes */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">{bi('ملاحظات تشغيلية', 'Operations notes')}</h4>
              {notesQ.data && <Badge variant="outline" className="text-xs">{notesQ.data.length}</Badge>}
            </div>

            <div className="space-y-2">
              <Select value={noteCategory} onValueChange={(v) => setNoteCategory(v as Category)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                    <SelectItem key={c} value={c}>{bi(CATEGORY_LABELS[c].ar, CATEGORY_LABELS[c].en)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                dir="auto"
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={bi('اكتب ملاحظة تشغيلية…', 'Write an operations note…')}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => addNoteMut.mutate()}
                disabled={!noteText.trim() || addNoteMut.isPending}
                className="w-full"
              >
                {addNoteMut.isPending ? bi('جارٍ…', 'Working…') : bi('إضافة ملاحظة', 'Add note')}
              </Button>
            </div>

            {notesQ.isLoading ? (
              <Skeleton className="h-16 rounded-md" />
            ) : notesQ.data && notesQ.data.length > 0 ? (
              <ul className="space-y-1.5">
                {notesQ.data.map((n) => (
                  <li key={n.id} className="rounded border p-2 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {bi(
                          CATEGORY_LABELS[n.category as Category]?.ar ?? n.category,
                          CATEGORY_LABELS[n.category as Category]?.en ?? n.category,
                        )}
                      </Badge>
                      <span className="ms-auto tech-content text-muted-foreground">{fmtDate(n.created_at, isRTL)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{n.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{bi('لا توجد ملاحظات بعد.', 'No notes yet.')}</p>
            )}
          </CardContent>
        </Card>

        {/* Contact action log */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">{bi('تسجيل إجراء تواصل', 'Log contact action')}</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {bi(
                'هذا التسجيل لا يرسل رسالة فعلية، فقط يوثّق أن الإدارة بدأت إجراء تواصل.',
                'This log does not send any message; it only records that the admin initiated a contact action.',
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
                    <SelectItem key={c} value={c}>{bi(CHANNEL_LABELS[c].ar, CHANNEL_LABELS[c].en)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                dir="auto"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={bi('الغرض (3 أحرف على الأقل)', 'Purpose (min 3 chars)')}
                className="h-10"
              />
            </div>
            <Textarea
              dir="auto"
              rows={2}
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder={bi('ملاحظات اختيارية', 'Optional notes')}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={() => contactMut.mutate()}
              disabled={purpose.trim().length < 3 || contactMut.isPending}
              className="w-full"
            >
              {contactMut.isPending ? bi('جارٍ…', 'Working…') : bi('تسجيل الإجراء', 'Log action')}
            </Button>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminSiteSensitivePanel;