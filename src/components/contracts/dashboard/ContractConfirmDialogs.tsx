/**
 * ContractConfirmDialogs — extracted Approve + Send-for-Review
 * AlertDialogs from DashboardContracts.tsx. Pure presentational
 * wrappers: identical markup, identical data-testids, identical
 * behaviour. No Supabase calls, no lifecycle changes.
 */
import React from 'react';
import { CircleCheck, Send } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { pickBi } from '@/components/common/Bilingual';
import { buildContractSummary } from '@/modules/contracts/services/contractSummary';

export interface SendEligibilityResult { isEligible: boolean; missing: readonly string[]; }
export interface LineItemLite { contract_id: string }
export interface ContractLite { id: string }

export interface ContractConfirmDialogsProps<T extends ContractLite> {
  isRTL: boolean;
  approveConfirm: T | null;
  onApproveOpenChange: (open: boolean) => void;
  onApprove: (c: T) => void;
  sendConfirm: T | null;
  onSendOpenChange: (open: boolean) => void;
  onSend: (c: T) => void;
  sendPending: boolean;
  computeSendEligibility: (c: T) => SendEligibilityResult;
  allLineItems: ReadonlyArray<LineItemLite>;
}

export function ContractConfirmDialogs<T extends ContractLite>({
  isRTL, approveConfirm, onApproveOpenChange, onApprove,
  sendConfirm, onSendOpenChange, onSend, sendPending,
  computeSendEligibility, allLineItems,
}: ContractConfirmDialogsProps<T>) {
  return (
    <>
      <AlertDialog open={!!approveConfirm} onOpenChange={onApproveOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pickBi(isRTL, 'الموافقة على العقد', 'Approve Contract')}</AlertDialogTitle>
            <AlertDialogDescription>{pickBi(isRTL, 'هل تريد الموافقة على هذا العقد؟ هذا الإجراء لا يمكن التراجع عنه.', 'Approve this contract? This action cannot be undone.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{pickBi(isRTL, 'إلغاء', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-success text-success-foreground hover:bg-success/90" onClick={() => approveConfirm && onApprove(approveConfirm)}>
              <CircleCheck className="w-4 h-4 me-2" />{pickBi(isRTL, 'موافقة', 'Approve')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sendConfirm} onOpenChange={onSendOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pickBi(isRTL, 'إرسال العقد للمراجعة', 'Send for Review')}</AlertDialogTitle>
            <AlertDialogDescription>{pickBi(isRTL, 'سيتم إرسال إشعار للعميل لمراجعة العقد والموافقة عليه.', 'A notification will be sent to the client to review and approve.')}</AlertDialogDescription>
          </AlertDialogHeader>
          {sendConfirm && (() => {
            const e = computeSendEligibility(sendConfirm);
            const n = buildContractSummary({ lineItemsCount: allLineItems.filter((li) => li.contract_id === sendConfirm.id).length }).lineItemsCount;
            return (
              <div data-testid="send-review-summary" className="text-xs space-y-1 border rounded p-2 my-2">
                <div>{pickBi(isRTL, 'الحالة الحالية: مسودة', 'Current status: draft')}</div>
                <div>{pickBi(isRTL, 'الحالة التالية: مرسل للمراجعة', 'Next status: sent for review')}</div>
                <div>{pickBi(isRTL, `عدد البنود: ${n}`, `Line items: ${n}`)}</div>
                {!e.isEligible && (<ul className="text-destructive list-disc pe-5" data-testid="send-review-missing">{e.missing.map((m, i) => (<li key={i}>{m}</li>))}</ul>)}
              </div>
            );
          })()}
          <AlertDialogFooter>
            <AlertDialogCancel>{pickBi(isRTL, 'إلغاء', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction data-testid="send-review-confirm" disabled={sendPending || !sendConfirm || !computeSendEligibility(sendConfirm).isEligible} onClick={() => sendConfirm && onSend(sendConfirm)}>
              <Send className="w-4 h-4 me-2" />{pickBi(isRTL, 'إرسال', 'Send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ContractConfirmDialogs;