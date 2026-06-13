import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

/**
 * BusinessVerifyConfirmDialog — confirmation surface for the
 * verify / unverify toggle. Pure presentational: receives the
 * pending {id, name, value} payload and emits confirm / cancel.
 * No Supabase, no mutation; the parent owns toggleMutation.
 */
export interface VerifyConfirmPayload {
  id: string;
  name: string;
  value: boolean;
}

interface BusinessVerifyConfirmDialogProps {
  isRTL: boolean;
  payload: VerifyConfirmPayload | null;
  onCancel: () => void;
  onConfirm: (p: VerifyConfirmPayload) => void;
}

export const BusinessVerifyConfirmDialog: React.FC<BusinessVerifyConfirmDialogProps> = ({
  isRTL, payload, onCancel, onConfirm,
}) => {
  const open = !!payload;
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-info" />
            {pickBi(isRTL, 'تأكيد التوثيق', 'Confirm Verification')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {payload?.value
              ? (isRTL
                ? `هل أنت متأكد من توثيق حساب «${payload?.name ?? ''}»؟ سيتم منحه علامة التوثيق الرسمية.`
                : `Are you sure you want to verify «${payload?.name ?? ''}»? This will grant the official verification badge.`)
              : (isRTL
                ? `هل أنت متأكد من إلغاء توثيق حساب «${payload?.name ?? ''}»؟ ستُحذف علامة التوثيق الرسمية.`
                : `Are you sure you want to unverify «${payload?.name ?? ''}»? The official verification badge will be removed.`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="rounded-xl">
              {pickBi(isRTL, 'إلغاء', 'Cancel')}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={payload?.value ? 'default' : 'destructive'}
              className="rounded-xl"
              onClick={() => { if (payload) onConfirm(payload); }}
            >
              {payload?.value
                ? (pickBi(isRTL, 'نعم، توثيق', 'Yes, Verify'))
                : (pickBi(isRTL, 'نعم، إلغاء التوثيق', 'Yes, Unverify'))}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BusinessVerifyConfirmDialog;