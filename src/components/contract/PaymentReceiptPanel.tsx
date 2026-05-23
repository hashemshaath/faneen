import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, RefreshCw, Trash2, ExternalLink, Download, X, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createContractAttachment } from '@/modules/contracts/services/childTables';
import { SignedAttachmentImage } from '@/components/contract/SignedAttachment';
import {
  validateAttachmentFile,
  attachmentErrorMessage,
  openAttachment as openAttachmentSigned,
  downloadAttachment as downloadAttachmentSigned,
  deleteAttachmentWithStorage,
  formatFileSize,
  type AttachmentRow,
} from '@/lib/contract-attachments';

interface Props {
  contractId: string;
  paymentId: string;
  userId: string;
  isRTL: boolean;
  /** Whether the payment has been recorded as paid. */
  isPaid: boolean;
  /** True when the contract is locked — receipts become read-only. */
  locked: boolean;
  attachments: AttachmentRow[];
  formatDate: (d?: string | null) => string;
}

const DESC_MAX = 200;

export const PaymentReceiptPanel: React.FC<Props> = ({
  contractId, paymentId, userId, isRTL, isPaid, locked, attachments, formatDate,
}) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [desc, setDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reset = () => {
    setPending(null);
    setDesc('');
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateAttachmentFile(f);
    if (err) {
      toast({ title: attachmentErrorMessage(err, isRTL), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setPending(f);
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!pending) throw new Error(isRTL ? 'لم يتم اختيار ملف' : 'No file selected');
      setUploading(true);
      setProgress(15);
      const ext = pending.name.split('.').pop() || 'bin';
      const path = `${contractId}/payments/${paymentId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('contract-attachments')
        .upload(path, pending, { contentType: pending.type || 'application/octet-stream', upsert: false });
      if (upErr) throw upErr;
      setProgress(70);
      const { data: urlData } = supabase.storage.from('contract-attachments').getPublicUrl(path);
      const { error } = await createContractAttachment({
        contract_id: contractId,
        user_id: userId,
        file_name: pending.name,
        file_type: pending.type || 'application/octet-stream',
        file_url: urlData.publicUrl,
        storage_path: path,
        file_size: pending.size,
        description: desc.trim() || null,
        visibility: 'parties',
        payment_id: paymentId,
        milestone_id: null,
        measurement_id: null,
      });
      if (error) {
        await supabase.storage.from('contract-attachments').remove([path]).catch(() => {});
        throw error;
      }
      setProgress(100);
    },
    onSuccess: () => {
      toast({ title: isRTL ? 'تم رفع الإيصال' : 'Receipt uploaded' });
      queryClient.invalidateQueries({ queryKey: ['contract-attachments', contractId] });
      reset();
      setUploading(false);
    },
    onError: (err: Error) => {
      toast({ title: err.message || (isRTL ? 'فشل الرفع' : 'Upload failed'), variant: 'destructive' });
      setUploading(false);
      setProgress(0);
    },
  });

  const del = useMutation({
    mutationFn: async (att: AttachmentRow) => {
      const r = await deleteAttachmentWithStorage(att);
      if (!r.ok) throw new Error(r.error || (isRTL ? 'فشل الحذف' : 'Delete failed'));
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-attachments', contractId] });
      setConfirmId(null);
      toast({ title: isRTL ? 'تم حذف الإيصال' : 'Receipt deleted' });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const canUpload = isPaid && !locked;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h5 className="text-[10px] font-heading font-bold flex items-center gap-1.5 text-muted-foreground">
          <ReceiptText className="w-3 h-3 text-accent" />
          {isRTL ? 'الإيصالات' : 'Receipts'} ({attachments.length})
        </h5>
        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={onPick}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-3 h-3" />{isRTL ? 'رفع إيصال' : 'Upload receipt'}
            </Button>
          </>
        )}
      </div>

      {!isPaid && (
        <p className="text-[10px] text-muted-foreground/80 font-body italic">
          {isRTL ? 'يمكن رفع الإيصال بعد تسجيل الدفعة.' : 'A receipt can be uploaded after the payment is recorded.'}
        </p>
      )}

      {pending && canUpload && (
        <div className="p-2 rounded-md bg-background border border-border space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-body text-foreground/80 truncate max-w-[180px]">
              {pending.name} · <span className="tech-content">{formatFileSize(pending.size)}</span>
            </span>
            {!uploading && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}><X className="w-3 h-3" /></Button>
            )}
          </div>
          <Textarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value.slice(0, DESC_MAX))}
            placeholder={isRTL ? 'وصف موجز (اختياري)…' : 'Short description (optional)…'}
            className="text-[10px]"
            dir="auto"
          />
          <div className="flex items-center gap-2">
            <Button variant="hero" size="sm" className="h-7 text-[10px] gap-1" disabled={uploading} onClick={() => upload.mutate()}>
              {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? `${progress}%` : (isRTL ? 'رفع' : 'Upload')}
            </Button>
            {uploading && (
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 gap-1.5">
          {attachments.map(att => {
            const isImage = (att.file_type || '').startsWith('image');
            const ext = att.file_name.split('.').pop()?.toUpperCase() || 'FILE';
            const isConfirming = confirmId === att.id;
            return (
              <div key={att.id} className="p-1.5 rounded-md bg-background border border-border">
                <div className="flex items-start gap-2">
                  {isImage ? (
                    <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-muted">
                      <SignedAttachmentImage att={att} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 font-heading font-bold text-[9px] bg-muted text-muted-foreground">
                      {ext}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-heading font-medium truncate" title={att.file_name}>{att.file_name}</p>
                    <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground font-body">
                      <span className="tech-content">{formatFileSize(att.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(att.created_at)}</span>
                    </div>
                    {att.description && (
                      <p className="text-[9px] text-muted-foreground font-body mt-0.5 line-clamp-2">{att.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAttachmentSigned(att)} title={isRTL ? 'فتح' : 'Open'}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadAttachmentSigned(att)} title={isRTL ? 'تنزيل' : 'Download'}>
                      <Download className="w-3 h-3" />
                    </Button>
                    {!locked && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmId(att.id)} title={isRTL ? 'حذف' : 'Delete'}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {isConfirming && !locked && (
                  <div className="mt-1.5 p-1.5 rounded-md border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-body text-destructive">{isRTL ? 'هل تريد حذف هذا الإيصال؟' : 'Delete this receipt?'}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => setConfirmId(null)} disabled={del.isPending}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                      <Button variant="destructive" size="sm" className="h-6 text-[9px] gap-1" onClick={() => del.mutate(att)} disabled={del.isPending}>
                        {del.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        {isRTL ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
