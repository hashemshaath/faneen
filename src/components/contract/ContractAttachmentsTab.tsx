import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, RefreshCw, Paperclip, Eye, Download, ExternalLink,
  Trash2, ListChecks, Ruler, CreditCard, FileText, ShieldCheck, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { createContractAttachment } from '@/modules/contracts/services/childTables';
import {
  uploadContractAttachmentFile,
  getContractAttachmentPublicUrl,
  removeContractAttachmentFiles,
} from '@/modules/contracts/services/attachments';
import { SignedAttachmentImage } from '@/components/contract/SignedAttachment';
import {
  validateAttachmentFile,
  attachmentErrorMessage,
  openAttachment as openAttachmentSigned,
  downloadAttachment as downloadAttachmentSigned,
  deleteAttachmentWithStorage,
  formatFileSize,
  visibilityLabel,
  type AttachmentRow,
  type AttachmentVisibility,
} from '@/lib/contract-attachments';

type Milestone = { id: string; title_ar: string; title_en?: string | null };
type Measurement = { id: string; piece_number?: string | null; name_ar?: string | null; name_en?: string | null; location_ar?: string | null; location_en?: string | null };
type Payment = { id: string; installment_number?: number | null; title_ar?: string | null; title_en?: string | null };

type LinkType = 'contract' | 'milestone' | 'measurement' | 'payment';

interface Props {
  contractId: string;
  userId: string;
  language: 'ar' | 'en';
  isRTL: boolean;
  isAdmin?: boolean;
  attachments: AttachmentRow[];
  milestones: Milestone[];
  measurements: Measurement[];
  payments: Payment[];
  formatDate: (d?: string | null) => string;
}

const DESC_MAX = 500;

export const ContractAttachmentsTab: React.FC<Props> = ({
  contractId, userId, language, isRTL, isAdmin = false,
  attachments, milestones, measurements, payments, formatDate,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [description, setDescription] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('contract');
  const [linkId, setLinkId] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setPendingFile(null);
    setDescription('');
    setLinkType('contract');
    setLinkId('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const vErr = validateAttachmentFile(f);
    if (vErr) {
      toast({ title: attachmentErrorMessage(vErr, isRTL), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setPendingFile(f);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!pendingFile) throw new Error(isRTL ? 'لم يتم اختيار ملف' : 'No file selected');
      if (description.length > DESC_MAX) {
        throw new Error(isRTL ? `الوصف يجب أن لا يتجاوز ${DESC_MAX} حرفًا` : `Description max ${DESC_MAX} chars`);
      }
      if (linkType !== 'contract' && !linkId) {
        throw new Error(isRTL ? 'يرجى اختيار العنصر المرتبط' : 'Please select the linked entity');
      }
      setUploading(true);
      setProgress(10);

      const ext = pendingFile.name.split('.').pop() || 'bin';
      let prefix = `${contractId}`;
      if (linkType === 'measurement') prefix = `${contractId}/measurements/${linkId}`;
      else if (linkType === 'payment') prefix = `${contractId}/payments/${linkId}`;
      const path = `${prefix}/${Date.now()}.${ext}`;

      const { error: upErr } = await uploadContractAttachmentFile(
        path,
        pendingFile,
        { contentType: pendingFile.type || 'application/octet-stream', upsert: false },
      );
      if (upErr) throw upErr;
      setProgress(70);

      // Keep file_url populated for backward compatibility (private bucket;
      // actual access uses signed URLs via storage_path).
      const { data: urlData } = getContractAttachmentPublicUrl(path);

              const insertPayload = {
        contract_id: contractId,
        user_id: userId,
        file_name: pendingFile.name,
        file_type: pendingFile.type || 'application/octet-stream',
        file_url: urlData.publicUrl,
        storage_path: path,
        file_size: pendingFile.size,
        description: description.trim() || null,
        // C4B.2 Safety Patch: visibility is not yet RLS-enforced.
        // Force every new upload to 'parties' until visibility-aware RLS lands.
        visibility: 'parties' as AttachmentVisibility,
        milestone_id:   linkType === 'milestone'   ? linkId : null,
        measurement_id: linkType === 'measurement' ? linkId : null,
        payment_id:     linkType === 'payment'     ? linkId : null,
      };

      const { error } = await createContractAttachment(insertPayload);
      if (error) {
        // Best-effort cleanup of orphaned storage object
        await removeContractAttachmentFiles([path]).catch(() => {});
        throw error;
      }
      setProgress(100);
    },
    onSuccess: () => {
      toast({ title: isRTL ? 'تم رفع المرفق بنجاح' : 'Attachment uploaded' });
      queryClient.invalidateQueries({ queryKey: ['contract-attachments', contractId] });
      resetForm();
      setUploading(false);
    },
    onError: (err: Error) => {
      toast({ title: err.message || (isRTL ? 'فشل رفع الملف' : 'Upload failed'), variant: 'destructive' });
      setUploading(false);
      setProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (att: AttachmentRow) => {
      const r = await deleteAttachmentWithStorage(att);
      if (!r.ok) throw new Error(r.error || (isRTL ? 'فشل حذف المرفق' : 'Delete failed'));
      return r;
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['contract-attachments', contractId] });
      setConfirmDeleteId(null);
      if (r.storageRemoved) {
        toast({ title: isRTL ? 'تم حذف المرفق' : 'Attachment deleted' });
      } else {
        toast({
          title: isRTL ? 'تم حذف السجل، لكن لم يتم حذف الملف من المخزن' : 'Row deleted, but storage object was not removed',
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // Group attachments by linkage
  const groups = useMemo(() => {
    const g: { contract: AttachmentRow[]; milestone: AttachmentRow[]; measurement: AttachmentRow[]; payment: AttachmentRow[] } = {
      contract: [], milestone: [], measurement: [], payment: [],
    };
    for (const a of attachments) {
      if (a.measurement_id) g.measurement.push(a);
      else if (a.payment_id) g.payment.push(a);
      else if (a.milestone_id) g.milestone.push(a);
      else g.contract.push(a);
    }
    return g;
  }, [attachments]);

  const linkedChip = (a: AttachmentRow) => {
    if (a.measurement_id) {
      const m = measurements.find(x => x.id === a.measurement_id);
      const label = m ? `${m.piece_number ? `#${m.piece_number} ` : ''}${(language === 'ar' ? m.name_ar : (m.name_en || m.name_ar)) || ''}`.trim() : '—';
      return <Badge variant="outline" className="text-[8px] gap-0.5"><Ruler className="w-2.5 h-2.5" />{label.slice(0, 24) || (isRTL ? 'مقاس' : 'Measurement')}</Badge>;
    }
    if (a.payment_id) {
      const p = payments.find(x => x.id === a.payment_id);
      const label = p ? `${p.installment_number ? `#${p.installment_number} ` : ''}${(language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)) || ''}`.trim() : '—';
      return <Badge variant="outline" className="text-[8px] gap-0.5"><CreditCard className="w-2.5 h-2.5" />{label.slice(0, 24) || (isRTL ? 'دفعة' : 'Payment')}</Badge>;
    }
    if (a.milestone_id) {
      const m = milestones.find(x => x.id === a.milestone_id);
      const label = m ? ((language === 'ar' ? m.title_ar : (m.title_en || m.title_ar)) || '') : '—';
      return <Badge variant="outline" className="text-[8px] gap-0.5"><ListChecks className="w-2.5 h-2.5" />{label.slice(0, 24) || (isRTL ? 'مرحلة' : 'Milestone')}</Badge>;
    }
    return <Badge variant="outline" className="text-[8px] gap-0.5"><FileText className="w-2.5 h-2.5" />{isRTL ? 'العقد' : 'Contract'}</Badge>;
  };

  const renderCard = (att: AttachmentRow) => {
    const isImage = (att.file_type || '').startsWith('image');
    const ext = att.file_name.split('.').pop()?.toUpperCase() || 'FILE';
    const isConfirming = confirmDeleteId === att.id;
    return (
      <div key={att.id} className="p-3 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {isImage ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
              <SignedAttachmentImage att={att} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 font-heading font-bold text-[10px] bg-muted text-muted-foreground">
              {ext}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-heading font-medium text-xs truncate" title={att.file_name}>{att.file_name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-body">
              <span className="tech-content">{formatFileSize(att.file_size)}</span>
              <span>•</span>
              <span>{formatDate(att.created_at)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {linkedChip(att)}
              <Badge
                variant="outline"
                className="text-[8px] gap-0.5"
                title={
                  att.visibility && att.visibility !== 'parties'
                    ? (isRTL ? 'لم يتم تفعيل قيود العرض المتقدمة بعد.' : 'Advanced visibility restrictions are not enforced yet.')
                    : undefined
                }
              >
                <ShieldCheck className="w-2.5 h-2.5" />{visibilityLabel(att.visibility, isRTL)}
              </Badge>
            </div>
            {att.description && (
              <p className="text-[10px] text-muted-foreground font-body mt-1.5 line-clamp-2">{att.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAttachmentSigned(att)} title={isRTL ? 'فتح' : 'Open'}><ExternalLink className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadAttachmentSigned(att)} title={isRTL ? 'تنزيل' : 'Download'}><Download className="w-3.5 h-3.5" /></Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setConfirmDeleteId(att.id)}
                title={isRTL ? 'حذف' : 'Delete'}
              ><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        {isConfirming && (
          <div className="mt-3 p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-body text-destructive">{isRTL ? 'هل تريد حذف هذا المرفق؟' : 'Delete this attachment?'}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setConfirmDeleteId(null)} disabled={deleteMutation.isPending}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              <Button variant="destructive" size="sm" className="h-7 text-[10px] gap-1" onClick={() => deleteMutation.mutate(att)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {isRTL ? 'حذف المرفق' : 'Delete attachment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Section: React.FC<{ title: string; icon: React.ElementType; items: AttachmentRow[] }> = ({ title, icon: Icon, items }) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className="font-heading font-bold text-xs mb-2 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-accent" />{title} ({items.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {items.map(renderCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFilePicked}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <Button variant="outline" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-3.5 h-3.5" />{isRTL ? 'اختر ملفًا' : 'Choose file'}
          </Button>
          {pendingFile && (
            <span className="text-[11px] font-body text-foreground/80 truncate max-w-[260px]">
              {pendingFile.name} · <span className="tech-content">{formatFileSize(pendingFile.size)}</span>
            </span>
          )}
          {pendingFile && !uploading && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetForm} title={isRTL ? 'إلغاء' : 'Clear'}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {pendingFile && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-heading font-semibold text-muted-foreground">{isRTL ? 'الارتباط' : 'Link to'}</label>
                <Select value={linkType} onValueChange={(v) => { setLinkType(v as LinkType); setLinkId(''); }}>
                  <SelectTrigger className="text-xs h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">{isRTL ? 'العقد (عام)' : 'Contract (general)'}</SelectItem>
                    {milestones.length > 0 && <SelectItem value="milestone">{isRTL ? 'مرحلة' : 'Milestone'}</SelectItem>}
                    {measurements.length > 0 && <SelectItem value="measurement">{isRTL ? 'مقاس' : 'Measurement'}</SelectItem>}
                    {payments.length > 0 && <SelectItem value="payment">{isRTL ? 'دفعة' : 'Payment'}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {linkType !== 'contract' && (
                <div>
                  <label className="text-[10px] font-heading font-semibold text-muted-foreground">{isRTL ? 'العنصر المرتبط' : 'Linked item'}</label>
                  <Select value={linkId} onValueChange={setLinkId}>
                    <SelectTrigger className="text-xs h-9 mt-1"><SelectValue placeholder={isRTL ? 'اختر…' : 'Select…'} /></SelectTrigger>
                    <SelectContent>
                      {linkType === 'milestone' && milestones.map(m => (
                        <SelectItem key={m.id} value={m.id}>{(language === 'ar' ? m.title_ar : (m.title_en || m.title_ar)) || m.id.slice(0, 8)}</SelectItem>
                      ))}
                      {linkType === 'measurement' && measurements.map(m => (
                        <SelectItem key={m.id} value={m.id}>{`${m.piece_number ? `#${m.piece_number} ` : ''}${(language === 'ar' ? m.name_ar : (m.name_en || m.name_ar)) || m.id.slice(0, 8)}`}</SelectItem>
                      ))}
                      {linkType === 'payment' && payments.map(p => (
                        <SelectItem key={p.id} value={p.id}>{`${p.installment_number ? `#${p.installment_number} ` : ''}${(language === 'ar' ? p.title_ar : (p.title_en || p.title_ar)) || p.id.slice(0, 8)}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-heading font-semibold text-muted-foreground">{isRTL ? 'الظهور' : 'Visibility'}</label>
                {/* C4B.2 Safety Patch: only 'parties' is enforced today. */}
                <Select value="parties" disabled>
                  <SelectTrigger className="text-xs h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parties">{visibilityLabel('parties', isRTL)}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground/80 font-body mt-1 leading-relaxed">
                  {isRTL
                    ? 'خصوصية المرفقات المتقدمة ستتوفر لاحقًا. حالياً تظهر المرفقات لأطراف العقد المصرح لهم.'
                    : 'Advanced attachment visibility will be available later. For now, attachments are visible to authorized contract parties.'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-heading font-semibold text-muted-foreground">{isRTL ? 'وصف (اختياري)' : 'Description (optional)'}</label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                  className="text-xs mt-1"
                  dir="auto"
                  placeholder={isRTL ? 'وصف موجز للمرفق…' : 'Short description…'}
                />
                <div className="text-[9px] text-muted-foreground text-end mt-0.5 tech-content">{description.length}/{DESC_MAX}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="hero" size="sm" className="gap-1.5 text-xs" disabled={uploading} onClick={() => uploadMutation.mutate()}>
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? (isRTL ? `جاري الرفع… ${progress}%` : `Uploading… ${progress}%`) : (isRTL ? 'رفع المرفق' : 'Upload')}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={resetForm} disabled={uploading}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              {uploading && (
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <Paperclip className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-muted-foreground font-body text-sm mb-1">{isRTL ? 'لا توجد مرفقات لهذا العقد بعد.' : 'No attachments for this contract yet.'}</p>
          <p className="text-[10px] text-muted-foreground/60 font-body">{isRTL ? 'ارفع الصور والمستندات المتعلقة بالعقد' : 'Upload photos and documents related to the contract'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Section title={isRTL ? 'مرفقات العقد' : 'Contract attachments'}     icon={FileText}    items={groups.contract} />
          <Section title={isRTL ? 'مرفقات المراحل' : 'Milestone attachments'}   icon={ListChecks}  items={groups.milestone} />
          <Section title={isRTL ? 'مرفقات المقاسات' : 'Measurement attachments'} icon={Ruler}       items={groups.measurement} />
          <Section title={isRTL ? 'مرفقات الدفعات' : 'Payment attachments'}     icon={CreditCard}  items={groups.payment} />
        </div>
      )}
    </div>
  );
};
