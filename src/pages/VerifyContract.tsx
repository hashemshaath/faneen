import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react';
import { verifyContractPublic } from '@/modules/contracts/services/verifyContractPublic';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';

type VerifyResult =
  | { valid: true; contract_number: string; status: string; locked_at: string | null;
      contract_barcode_code: string | null; provider_name: string | null; created_at: string | null;
      start_date: string | null; end_date: string | null; currency: string;
      hash_prefix: string | null; amendment_count: number; resolved_via?: string }
  | { valid: false; reason: 'invalid_input' | 'not_found' | 'hash_mismatch';
      contract_number?: string; status?: string };

const VerifyContract = () => {
  const { number } = useParams<{ number: string }>();
  const [params] = useSearchParams();
  const hash = params.get('h') || '';
  const code = params.get('code') || '';
  const { isRTL } = useLanguage();
  const [state, setState] = useState<{ loading: boolean; data: VerifyResult | null; error: string | null }>({
    loading: true, data: null, error: null,
  });

  useNoIndex();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await verifyContractPublic({
          _contract_number: number || '', _hash: hash, _barcode_code: code || null,
        });
        if (cancelled) return;
        if (error) {
          setState({ loading: false, data: null, error: error.message });
          return;
        }
        setState({ loading: false, data: data as unknown as VerifyResult, error: null });
      } catch (e: unknown) {
        if (cancelled) return;
        setState({ loading: false, data: null, error: e instanceof Error ? e.message : 'unknown_error' });
      }
    })();
    return () => { cancelled = true; };
  }, [number, hash]);

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-GB') : '—';

  const t = useMemo(() => isRTL ? {
    title: 'التحقق من العقد الرسمي', sub: 'تحقق عام آمن من صحة العقد',
    valid: 'هذا العقد أصلي', invalid: 'لا يمكن التحقق من هذا العقد',
    hashMismatch: 'بصمة المستند لا تطابق السجل الرسمي',
    notFound: 'العقد غير موجود أو ليس مفعّلاً',
    invalidInput: 'رابط التحقق غير صالح',
    contractCode: 'كود العقد', contractNumber: 'رقم العقد', status: 'الحالة', lockedAt: 'مفعّل في',
    provider: 'مزود الخدمة', createdAt: 'تاريخ الإصدار',
    period: 'الفترة', hashPrefix: 'بصمة المستند', amendments: 'التعديلات المطبقة',
    currency: 'العملة', loading: 'جارٍ التحقق…',
    privacyNote: 'لا يتم عرض أي بيانات شخصية أو مالية. التحقق يستند إلى بصمة المستند فقط.',
  } : {
    title: 'Official Contract Verification', sub: 'Public-safe authenticity check',
    valid: 'This contract is authentic', invalid: 'This contract cannot be verified',
    hashMismatch: 'Document hash does not match the official record',
    notFound: 'Contract not found or not active',
    invalidInput: 'Invalid verification link',
    contractCode: 'Contract Code', contractNumber: 'Contract Number', status: 'Status', lockedAt: 'Activated',
    provider: 'Provider', createdAt: 'Issued',
    period: 'Period', hashPrefix: 'Document Hash', amendments: 'Applied Amendments',
    currency: 'Currency', loading: 'Verifying…',
    privacyNote: 'No personal or financial data is shown. Verification relies solely on the document hash.',
  }, [isRTL]);

  const { loading, data, error } = state;
  const isValid = data?.valid === true;
  const reason = data && data.valid === false ? data.reason : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4 py-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.sub}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className={`p-6 flex items-center gap-4 ${
            loading ? 'bg-muted/40' :
            isValid ? 'bg-emerald-50 dark:bg-emerald-950/30' :
            'bg-amber-50 dark:bg-amber-950/30'
          }`}>
            {loading ? <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" /> :
              isValid ? <ShieldCheck className="w-10 h-10 text-emerald-600" /> :
              reason === 'hash_mismatch' ? <ShieldAlert className="w-10 h-10 text-amber-600" /> :
              <ShieldX className="w-10 h-10 text-amber-600" />}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-foreground">
                {loading ? t.loading :
                  isValid ? t.valid :
                  reason === 'hash_mismatch' ? t.hashMismatch :
                  reason === 'not_found' ? t.notFound :
                  t.invalidInput}
              </div>
              {error && <div className="text-xs text-destructive mt-1 tech-content">{error}</div>}
            </div>
          </div>

          {data && (
            <div className="p-6 space-y-3 text-sm">
              <Row label={t.contractNumber} value={data.contract_number || '—'} mono />
              {isValid && data.contract_barcode_code && (
                <Row label={t.contractCode} value={data.contract_barcode_code} mono />
              )}
              {'status' in data && data.status && (
                <Row label={t.status} value={data.status} />
              )}
              {isValid && (
                <>
                  {data.provider_name && <Row label={t.provider} value={data.provider_name} />}
                  {data.created_at && <Row label={t.createdAt} value={fmtDate(data.created_at)} />}
                  <Row label={t.lockedAt} value={fmtDate(data.locked_at)} />
                  <Row label={t.period} value={`${fmtDate(data.start_date)} → ${fmtDate(data.end_date)}`} />
                  <Row label={t.currency} value={data.currency} mono />
                  {data.hash_prefix && <Row label={t.hashPrefix} value={data.hash_prefix} mono />}
                  <Row label={t.amendments} value={String(data.amendment_count)} />
                </>
              )}
            </div>
          )}

          <div className="px-6 py-4 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {t.privacyNote}
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium text-foreground ${mono ? 'tech-content' : ''}`}>{value}</span>
  </div>
);

export default VerifyContract;