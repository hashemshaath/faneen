/**
 * Phase H — ContractPartiesPanel
 *
 * Pure presentational panel that makes the contract-party model
 * explicit in the create flow, replacing the previous ambiguous
 * "اختر العميل" framing. Role-aware:
 *  - provider / business owner: First party = own business (auto, no
 *    picker), Second party = chosen client.
 *  - personal client: First party = linked provider (project-derived;
 *    surface a "link a provider" hint when missing), Second party =
 *    the signed-in user (auto-filled, no picker).
 *  - admin: both parties are explicitly labeled and chooseable.
 *
 * Pure props, no Supabase calls, no side effects.
 */
import React from 'react';
import { Users, Building2, User, ShieldCheck } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

export type ContractAccountKind = 'provider' | 'client' | 'admin';

export interface ContractPartiesPanelProps {
  isRTL: boolean;
  accountKind: ContractAccountKind;
  firstPartyName: string | null;
  firstPartyRef?: string | null;
  secondPartyName: string | null;
  linkedProviderMissing?: boolean;
}

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string | null }> = ({ icon, label, value, hint }) => (
  <div className="flex items-start gap-2 text-[11px]">
    <span className="mt-0.5 text-primary">{icon}</span>
    <div className="space-y-0.5">
      <div className="font-semibold">{label}</div>
      <div className="text-foreground/80">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  </div>
);

export const ContractPartiesPanel: React.FC<ContractPartiesPanelProps> = ({
  isRTL, accountKind, firstPartyName, firstPartyRef, secondPartyName, linkedProviderMissing,
}) => {
  const firstLabel = pickBi(isRTL, 'الطرف الأول — الجهة المنفذة', 'First party — Executing provider');
  const secondLabel = pickBi(isRTL, 'الطرف الثاني — صاحب الحساب', 'Second party — Account holder');

  let firstValue = firstPartyName ?? '—';
  let firstHint: string | null = null;
  if (accountKind === 'provider') {
    firstHint = pickBi(isRTL, 'يتم اعتماد منشأتك تلقائيًا — لا حاجة لاختيار مزود.', 'Your business is set automatically — no provider picker needed.');
    if (!firstPartyName) firstValue = pickBi(isRTL, 'منشأتك الحالية', 'Your current business');
  } else if (accountKind === 'client') {
    firstHint = linkedProviderMissing
      ? pickBi(isRTL, 'اربط المشروع بمزود خدمة قبل إنشاء العقد', 'Link a service provider to this project before creating a contract')
      : pickBi(isRTL, 'تم اعتماد المزود المرتبط بالمشروع تلقائيًا.', 'The provider linked to the project is set automatically.');
    if (!firstPartyName && !linkedProviderMissing) firstValue = pickBi(isRTL, 'المزود المرتبط بالمشروع', 'Project-linked provider');
  } else {
    firstHint = pickBi(isRTL, 'بصلاحيات الأدمن: يمكن تعيين الطرفين يدويًا.', 'Admin: both parties can be set manually.');
  }

  let secondValue = secondPartyName ?? '—';
  let secondHint: string | null = null;
  if (accountKind === 'client') {
    secondHint = pickBi(isRTL, 'تم تعبئة بياناتك تلقائيًا — لا حاجة لاختيار عميل.', 'Your details are filled automatically — no client picker needed.');
    if (!secondPartyName) secondValue = pickBi(isRTL, 'حسابك الحالي', 'Your current account');
  } else if (accountKind === 'provider') {
    secondHint = pickBi(isRTL, 'اختر العميل أدناه أو أكمل بياناته كضيف.', 'Pick the client below or fill guest details.');
  }

  return (
    <div
      data-testid="contract-create-parties-panel"
      data-account-kind={accountKind}
      className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Users className="w-4 h-4 text-primary" />
        {pickBi(isRTL, 'أطراف العقد', 'Contract parties')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row icon={<Building2 className="w-3.5 h-3.5" />} label={firstLabel} value={firstValue} hint={firstHint} />
        {accountKind !== 'client' && (
          <Row icon={accountKind === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />} label={secondLabel} value={secondValue} hint={secondHint} />
        )}
      </div>
      {firstPartyRef && (
        <div className="text-[10px] text-muted-foreground">
          {pickBi(isRTL, 'المعرّف: ', 'Ref: ')}{firstPartyRef}
        </div>
      )}
    </div>
  );
};

export default ContractPartiesPanel;