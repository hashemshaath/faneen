import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { authService, useOtpFlow } from '@/services/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  User, Building2, Phone, Check, Loader2, CheckCircle2, ArrowLeft, ArrowRight,
  AlertCircle, Mail, UserPlus, MapPin, FileText, Upload, X, Sparkles,
} from 'lucide-react';
import { track } from '@/lib/analytics-events';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectorPicker } from '@/components/onboarding/SectorPicker';
import { ONBOARDING_SECTORS, type SectorId } from '@/data/onboarding-sectors';
import { SA_REGIONS, type SaRegionId } from '@/data/sa-regions';
import { supabase } from '@/integrations/supabase/client';
import {
  uploadPrivateDocument,
  uploadPublicImage,
  getPublicImageUrl,
  BUSINESS_DOCUMENTS_BUCKET,
  BUSINESS_ASSETS_BUCKET,
} from '@/modules/files';
import { updateOnboardingProgress } from '@/modules/users';
import { UsernamePicker } from '@/components/common/UsernamePicker';
import {
  readDraft, saveDraft, clearDraft, pullRemoteDraft, syncDraftToServer,
} from '@/lib/onboarding-draft';
import { createEntityAccessRequest } from '@/modules/entities/services/access';
import {
  getOwnerBusiness, updateBusinessById, getBusinessIdByRefOrLegacyRef,
  updateBusinessSensitiveFields,
} from '@/modules/businesses';
import { EntityVerificationStatusBadge } from '@/components/entities/EntityVerificationStatusBadge';
import {
  OnboardingTaxonomyStep,
  EMPTY_ONBOARDING_TAXONOMY,
  type OnboardingTaxonomyValue,
} from '@/modules/taxonomy';
import { setBusinessTaxonomyCategoriesV2 } from '@/modules/taxonomy/business-services';
import { normalizeOnboardingTaxonomyDraft } from '@/modules/taxonomy/components/OnboardingTaxonomyStep';

// ──────────────────────────────────────────────────────────────────────────
// New simplified flow (2026-05-29):
//   intent → [business path] business-details → details → phone-verify
//          → documents → summary
//   intent → [individual]    details → phone-verify (optional) → home
// Removed steps: entity-type / entity-capabilities / business-sectors /
//   main-location / staff-invite. Sectors and region are merged into the
//   single `business-details` step; documents upload (logo + CR scan) runs
//   right after the manager account is verified, while the business is
//   already created.
// ──────────────────────────────────────────────────────────────────────────

type OnboardingStep =
  | 'intent'
  | 'account-type'
  | 'business-details'
  | 'details'
  | 'phone-verify'
  | 'documents'
  | 'summary';

const STEP_ORDER: OnboardingStep[] = [
  'intent', 'account-type', 'business-details', 'details', 'phone-verify',
  'documents', 'summary',
];

const Onboarding = () => {
  const { t: _t, language: _lang, isRTL } = useLanguage();
  const bi = useBi();
  usePageMeta({ title: bi('إعداد الحساب', 'Account Setup'), noindex: true });
  const navigate = useNavigate();
  const { user, profile, refreshProfile, isAdmin, isSuperAdmin } = useAuth();
  const { getTargetRoute } = useRoleRedirect();

  const [step, setStep] = useState<OnboardingStep>('intent');
  const [inviteToken, setInviteToken] = useState('');
  const [requestAccessQuery, setRequestAccessQuery] = useState('');
  const [requestAccessMessage, setRequestAccessMessage] = useState('');
  const [requestAccessSubmitting, setRequestAccessSubmitting] = useState(false);
  const [requestAccessSubmittedRef, setRequestAccessSubmittedRef] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');

  // Business identity
  const [businessName, setBusinessName] = useState('');         // name_ar (CR name)
  const [businessNameEn, setBusinessNameEn] = useState('');     // name_en
  const [username, setUsername] = useState('');
  const [usernameOk, setUsernameOk] = useState(false);
  const [businessEmail, setBusinessEmail] = useState('');
  const [unifiedNumber, setUnifiedNumber] = useState('');       // 10 digits, starts with 7
  const [crNumber, setCrNumber] = useState('');                 // optional
  const [regionId, setRegionId] = useState<SaRegionId | ''>('');
  const [sectors, setSectors] = useState<SectorId[]>([]);
  const [subServices, setSubServices] = useState<string[]>([]);

  // Phase 11 — central taxonomy selections (collected before business exists,
  // persisted via RPC after creation; non-blocking on failure).
  const [taxonomy, setTaxonomy] = useState<OnboardingTaxonomyValue>(EMPTY_ONBOARDING_TAXONOMY);
  // Phase 13.c — taxonomy load status drives whether the legacy SectorPicker
  // is shown inline (fallback) or collapsed under a "legacy classification"
  // disclosure. Default to 'loading' so legacy stays visible until we know.
  const [taxonomyStatus, setTaxonomyStatus] =
    useState<'loading' | 'ok' | 'error'>('loading');

  // Documents
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [crDocPath, setCrDocPath] = useState<string>('');
  const [crDocName, setCrDocName] = useState<string>('');
  const [crUploading, setCrUploading] = useState(false);
  const crInputRef = useRef<HTMLInputElement>(null);

  // Created entity tracking
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);
  const [createdEntityStatus, setCreatedEntityStatus] = useState<{
    approvalStatus?: string | null; isVerified?: boolean | null;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Persist draft on every relevant change
  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft({
      step, accountType, fullName, phone, countryCode,
      businessName, username, description: '',
      sectors, subServices,
      taxonomy,
    });
    if (user?.id) void syncDraftToServer(user.id);
  }, [step, accountType, fullName, phone, countryCode, businessName, username,
      sectors, subServices, taxonomy, draftLoaded, user?.id]);

  // Track step views + persist progress
  useEffect(() => {
    if (!draftLoaded) return;
    const idx = STEP_ORDER.indexOf(step);
    track.onboardingStepViewed({ onboarding_step: step, account_type: accountType });
    if (user?.id) {
      void updateOnboardingProgress({
        userId: user.id,
        values: {
          onboarding_step: idx,
          onboarding_started_at: new Date().toISOString(),
        },
      });
    }
  }, [step, draftLoaded, accountType, user?.id]);

  const otp = useOtpFlow({
    isRTL,
    onSendOtp: () => authService.sendOtp(phone, countryCode),
    onVerifyOtp: async (code) => {
      const data = await authService.verifyOtp(phone, countryCode, code);
      if (!data?.verified) throw new Error(data?.error || 'Verification failed');
      toast.success(bi('تم التحقق من رقم الجوال بنجاح', 'Phone verified successfully'));
      await refreshProfile();
      if (accountType === 'business') {
        await completeOnboarding();
        setStep('documents');
      } else {
        await completeOnboarding();
      }
    },
  });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin || isSuperAdmin) { navigate(getTargetRoute(), { replace: true }); return; }
    // Allow user to stay on documents / summary even after is_onboarded flips true.
    if (profile?.is_onboarded && step !== 'summary' && step !== 'documents') {
      navigate(getTargetRoute()); return;
    }
    let cancelled = false;
    (async () => {
      const draft = await pullRemoteDraft(user.id);
      const local = readDraft();
      const d = { ...local, ...draft };
      if (cancelled) return;
      if (profile?.full_name) setFullName(profile.full_name);
      else if (d.fullName) setFullName(d.fullName);
      else if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);

      const effectiveAccountType: 'individual' | 'business' =
        (profile?.account_type as 'individual' | 'business' | undefined) ??
        (d.accountType as 'individual' | 'business' | undefined) ?? 'individual';
      setAccountType(effectiveAccountType);

      const profileCountry = profile?.country_code || '+966';
      if (profile?.phone) {
        const localPart = profile.phone.startsWith(profileCountry)
          ? profile.phone.slice(profileCountry.length)
          : profile.phone.replace(/^\+/, '');
        setPhone(localPart);
        setCountryCode(profileCountry);
      } else {
        if (d.phone) setPhone(d.phone);
        if (d.countryCode) setCountryCode(d.countryCode);
      }
      if (!businessEmail && user.email) setBusinessEmail(user.email);
      if (d.businessName) setBusinessName(d.businessName);
      if (d.username) setUsername(d.username);
      if (d.sectors?.length) setSectors(d.sectors as SectorId[]);
      if (d.subServices?.length) setSubServices(d.subServices);
      if (d.taxonomy && typeof d.taxonomy === 'object') {
        // Safe Batch 2 — back-compat shim: old drafts may carry
        // `primaryActivityCategoryId` (single). Normalize to array form.
        setTaxonomy(normalizeOnboardingTaxonomyDraft(d.taxonomy));
      }
      if (d.step && STEP_ORDER.includes(d.step as OnboardingStep)) {
        const draftStep = d.step as OnboardingStep;
        const isBusinessOnly = draftStep === 'business-details' || draftStep === 'documents';
        if (effectiveAccountType === 'individual' && isBusinessOnly) {
          clearDraft(); setStep('details');
        } else {
          setStep(draftStep);
        }
      } else {
        try {
          const pending = localStorage.getItem('qitaat_pending_intent');
          if (pending === 'create-entity' || pending === 'individual'
              || pending === 'join-invite' || pending === 'request-access') {
            if (pending === 'create-entity') setAccountType('business');
            else setAccountType('individual');
            setStep(pending === 'create-entity' ? 'business-details' : 'details');
            localStorage.removeItem('qitaat_pending_intent');
          }
        } catch { /* noop */ }
      }
      setDraftLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, isAdmin, isSuperAdmin, getTargetRoute, navigate]);

  const selectedRegion = useMemo(
    () => SA_REGIONS.find((r) => r.id === regionId) ?? null,
    [regionId],
  );

  // Header progress
  const completionPct = useMemo(() => {
    let total = 2; // account type, full name
    let done = 1;
    if (fullName.trim()) done++;
    if (accountType === 'business') {
      total += 6; // name, username, email, unified, region, sectors
      if (businessName.trim()) done++;
      if (username.length >= 3) done++;
      if (businessEmail.includes('@')) done++;
      if (/^7[0-9]{9}$/.test(unifiedNumber)) done++;
      if (regionId) done++;
      if (sectors.length > 0) done++;
    }
    if (phone && phone.length >= 7) { total += 1; done += 1; }
    return Math.min(100, Math.round((done / total) * 100));
  }, [fullName, accountType, businessName, username, businessEmail, unifiedNumber, regionId, sectors, phone]);

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await authService.updateProfile(user!.id, {
        full_name: fullName,
        account_type: accountType,
        is_onboarded: true,
        ...(phone && !profile?.phone_verified
          ? { phone: `${countryCode}${phone}`, country_code: countryCode } : {}),
      });

      if (accountType === 'business' && businessName && username) {
        // Phase 2.1-b — Onboarding is taxonomy-only. Legacy `sectors` /
        // `sub_services` are NO LONGER written when creating a business.
        // The legacy state (and draft fields) are retained for reading old
        // drafts only — they must not be passed to createBusiness here.
        await authService.createBusiness(user!.id, businessName, username, {
          recipientEmail: user?.email || undefined,
          entity_type: 'company',
          capabilities: {
            can_provide_services: true,
            can_request_services: true,
            can_manage_contracts: true,
            can_issue_quotes: true,
            can_receive_quotes: true,
          },
          national_id: crNumber || undefined,
          unified_number: unifiedNumber || undefined,
          name_en: businessNameEn || undefined,
          email: businessEmail || undefined,
          region: selectedRegion?.name_ar || undefined,
          region_en: selectedRegion?.name_en || undefined,
        });

        try {
          const { data: bizRow } = await getOwnerBusiness<{
            id: string; approval_status: string | null; is_verified: boolean | null;
          }>({
            userId: user!.id,
            select: 'id, approval_status, is_verified',
            orderBy: { column: 'created_at', ascending: false },
            limit: 1,
          });
          const businessId = (bizRow as { id?: string } | null)?.id ?? null;
          if (businessId) setCreatedBusinessId(businessId);
          if (bizRow) {
            setCreatedEntityStatus({
              approvalStatus: (bizRow as { approval_status?: string | null }).approval_status ?? null,
              isVerified: (bizRow as { is_verified?: boolean | null }).is_verified ?? null,
            });
          }

          // Phase 11 — persist central taxonomy selections (non-blocking).
          // Failure here must NOT fail the onboarding flow; the user can
          // update the classification later from the dashboard.
          if (businessId && (
            taxonomy.entityTypeCategoryId ||
            taxonomy.primaryActivityCategoryIds.length > 0 ||
            taxonomy.secondaryActivityCategoryIds.length > 0
          )) {
            try {
              await setBusinessTaxonomyCategoriesV2(businessId, {
                entityTypeCategoryId: taxonomy.entityTypeCategoryId,
                primaryActivityCategoryIds: taxonomy.primaryActivityCategoryIds,
                secondaryActivityCategoryIds: taxonomy.secondaryActivityCategoryIds,
              });
            } catch (taxErr) {
              if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.warn('[onboarding] taxonomy persist failed', taxErr);
              }
              toast.warning(
                bi('تم إنشاء المنشأة، لكن تعذر حفظ التصنيف. يمكنك تحديثه لاحقًا من صفحة تعديل المنشأة.', 'Business created, but the classification could not be saved. You can update it later from the business edit page.'),
              );
            }
          } else if (businessId && taxonomyStatus !== 'ok') {
            // Phase 2.1-b — Taxonomy never loaded; we no longer fall back to
            // writing legacy `sectors`/`sub_services`. Let the user know they
            // can classify later from the dashboard.
            toast.info(
              bi('تم إنشاء المنشأة، ويمكن تحديث التصنيف لاحقًا من لوحة التحكم.', 'Business created. You can update the classification later from your dashboard.'),
            );
          }
        } catch { /* non-blocking */ }
      }

      await refreshProfile();
      clearDraft();
      if (accountType === 'business') {
        track.providerSignupSubmit({});
      }
      track.onboardingCompleted({ account_type: accountType });
      toast.success(bi('تم حفظ بياناتك', 'Your profile is saved'));

      if (accountType !== 'business') navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error && err.message
        ? err.message
        : (bi('تعذّر إكمال التسجيل', 'Could not complete registration')));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPhone = async () => {
    if (accountType === 'business') {
      // Phone is required for business path — bring them back.
      toast.error(bi('رقم جوال مدير الحساب مطلوب', 'Account manager phone is required'));
      return;
    }
    await completeOnboarding();
  };

  const handlePhoneSend = async () => {
    if (!phone || phone.length < 7) {
      toast.error(bi('يرجى إدخال رقم جوال صحيح', 'Please enter a valid phone number'));
      return;
    }
    const ok = await otp.sendOtp();
    if (ok) toast.success(bi('تم إرسال رمز التحقق', 'Verification code sent'));
    else if (otp.error) toast.error(otp.error);
  };

  const handlePhoneVerify = async () => {
    const ok = await otp.verifyOtp();
    if (!ok && otp.error) toast.error(otp.error);
  };

  // ─── CR document upload (private bucket: business-documents) ───
  const handleCrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdBusinessId) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error(bi('الصيغة المسموحة: JPEG، PNG، PDF', 'Allowed: JPEG, PNG, PDF'));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error(bi('حد أقصى 4 ميجا للملف', 'Max 4 MB per file'));
      return;
    }
    setCrUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = `cr/${createdBusinessId}/cr-${Date.now()}.${ext}`;
      const { error: upErr } = await uploadPrivateDocument({
        bucket: BUSINESS_DOCUMENTS_BUCKET,
        path,
        file,
        options: { upsert: true, contentType: file.type },
      });
      if (upErr) throw upErr;
      setCrDocPath(path);
      setCrDocName(file.name);
      toast.success(bi('تم رفع السجل التجاري', 'CR document uploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message
        : (bi('فشل رفع الملف', 'Upload failed')));
    } finally {
      setCrUploading(false);
      if (crInputRef.current) crInputRef.current.value = '';
    }
  };

  // ─── Logo upload (public bucket: business-assets) ───
  // Strict: JPEG/PNG only, max 4 MB per file.
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdBusinessId) return;
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error(bi('الصيغة المسموحة للشعار: JPEG، PNG', 'Allowed logo formats: JPEG, PNG'));
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error(bi('حد أقصى 4 ميجا للملف', 'Max 4 MB per file'));
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${createdBusinessId}/logo-${Date.now()}.${ext}`;
      const { compressImage } = await import('@/lib/image-compress');
      const toUpload = await compressImage(file);
      const finalPath = path.replace(/\.(png|jpg|jpeg)$/i, '.webp');
      const { error: upErr } = await uploadPublicImage({
        bucket: BUSINESS_ASSETS_BUCKET,
        path: finalPath,
        file: toUpload,
        options: { upsert: true, contentType: toUpload.type || 'image/webp' },
      });
      if (upErr) throw upErr;
      const { data: pub } = getPublicImageUrl({ bucket: BUSINESS_ASSETS_BUCKET, path: finalPath });
      setLogoUrl(pub.publicUrl);
      toast.success(bi('تم رفع الشعار', 'Logo uploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message
        : (bi('فشل رفع الشعار', 'Logo upload failed')));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const finalizeDocuments = async (opts: { skip?: boolean } = {}) => {
    setLoading(true);
    try {
      if (createdBusinessId && (logoUrl || crDocPath)) {
        const values: Record<string, unknown> = {};
        if (logoUrl) values.logo_url = logoUrl;
        if (crDocPath) {
          values.cr_document_uploaded_at = new Date().toISOString();
        }
        if (Object.keys(values).length > 0) {
          await updateBusinessById({ id: createdBusinessId, values });
        }
        if (crDocPath) {
          // cr_document_url is owner+admin-only (column-level GRANT) —
          // route through the SECURITY DEFINER RPC.
          const { error: sensErr } = await updateBusinessSensitiveFields(createdBusinessId, {
            cr_document_url: crDocPath,
          });
          if (sensErr) throw sensErr;
        }
      }
      if (!opts.skip) toast.success(bi('تم حفظ المستندات', 'Documents saved'));
      setStep('summary');
    } catch (err) {
      toast.error(err instanceof Error ? err.message
        : (bi('تعذّر حفظ المستندات', 'Could not save documents')));
    } finally { setLoading(false); }
  };

  if (isAdmin || isSuperAdmin) return <Navigate to={getTargetRoute()} replace />;

  // ───────────────────────────── INTENT ─────────────────────────────
  if (step === 'intent') {
    const intents = [
      { id: 'individual' as const, icon: User,
        titleAr: 'المتابعة كفرد', titleEn: 'Continue as individual',
        descAr: 'استخدم قطاعات كفرد، اطلب عروض الأسعار، وأنشئ منشأة لاحقاً.',
        descEn: 'Use Qitaat as an individual, request quotes, and create an entity later.' },
      { id: 'create-entity' as const, icon: Building2,
        titleAr: 'إنشاء منشأة أو شركة', titleEn: 'Create a business/entity',
        descAr: 'سجّل بيانات المنشأة أولاً، ثم بيانات مدير الحساب.',
        descEn: 'Register the business data first, then the account manager.' },
      { id: 'join-invite' as const, icon: Mail,
        titleAr: 'الانضمام بدعوة', titleEn: 'Join by invitation',
        descAr: 'لديّ رمز دعوة من منشأة قائمة', descEn: 'I have an invitation token' },
      { id: 'request-access' as const, icon: UserPlus,
        titleAr: 'طلب الانضمام لمنشأة قائمة', titleEn: 'Request access to an existing entity',
        descAr: 'ابحث بالاسم أو معرّف ENT- / BIZ-', descEn: 'Search by name or ENT- / BIZ- reference' },
    ];
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {bi('كيف تريد البدء؟', 'How would you like to start?')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {bi('اختر المسار الأنسب لك — يمكنك إضافة منشأة لاحقاً.', 'Pick the path that fits you — you can add an entity later.')}
            </p>
          </div>
          {/* AUTH-14E · Duplicate-entity guidance (UX-only; no DB lookup) */}
          <div
            data-testid="onboarding-duplicate-warning"
            className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" aria-hidden />
            <div className="space-y-1 text-xs leading-relaxed text-foreground/90">
              <p>
                {bi(
                  'إذا كانت منشأتك مسجلة مسبقًا في قطاعات، اطلب الانضمام بدل إنشاء منشأة جديدة.',
                  'If your business is already registered on Qitaat, request to join it instead of creating a new entity.',
                )}
              </p>
              <p className="text-muted-foreground">
                {bi(
                  'لدي دعوة أو أريد الانضمام لمنشأة — استخدم الخيارات أدناه.',
                  'I have an invitation or want to join an entity — use the options below.',
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {intents.map(({ id, icon: Icon, titleAr, titleEn, descAr, descEn }) => (
              <button key={id} data-intent={id}
                onClick={() => {
                  if (id === 'individual') {
                    setAccountType('individual');
                    if (profile?.full_name && profile?.phone) void completeOnboarding();
                    else setStep('details');
                  } else if (id === 'create-entity') {
                    setAccountType('business');
                    setStep('business-details');
                  }
                }}
                className="p-4 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-start group flex items-start gap-3"
                aria-label={bi(titleAr, titleEn)}>
                <div className="rounded-lg bg-gold/10 p-2 shrink-0">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base text-foreground">{bi(titleAr, titleEn)}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{bi(descAr, descEn)}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
            <Label className="text-xs">{bi('لديك رمز دعوة؟', 'Have an invitation token?')}</Label>
            <div className="flex gap-2">
              <Input value={inviteToken} onChange={(e) => setInviteToken(e.target.value.trim())}
                placeholder={bi('الصق رمز الدعوة', 'Paste invitation token')} dir="auto" />
              <Button variant="outline" disabled={inviteToken.length < 6}
                onClick={() => navigate(`/invite/${encodeURIComponent(inviteToken)}`)}>
                {bi('متابعة', 'Continue')}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-2" data-feature="request-access">
            <Label className="text-xs">{bi('طلب الانضمام لمنشأة قائمة', 'Request access to an existing entity')}</Label>
            <p
              data-testid="request-access-clarification"
              className="text-[11px] text-muted-foreground leading-relaxed"
            >
              {bi(
                'طلب الانضمام للمنشأة يحتاج مراجعة من مسؤول المنشأة. إذا لديك دعوة، استخدم رابط الدعوة المرسل لك.',
                'Joining an existing entity requires approval from its administrator. If you have an invitation, use the invitation link sent to you.',
              )}
            </p>
            {requestAccessSubmittedRef ? (
              <div className="rounded-md bg-success/10 border border-success/30 p-2 text-xs text-success-foreground">
                {bi(`تم إرسال طلبك (${requestAccessSubmittedRef}).`, `Your request was sent (${requestAccessSubmittedRef}).`)}
              </div>
            ) : (
              <>
                <Input value={requestAccessQuery} onChange={(e) => setRequestAccessQuery(e.target.value)}
                  placeholder={bi('اسم المنشأة أو معرّفها', 'Entity name or reference')} dir="auto" />
                <Textarea value={requestAccessMessage}
                  onChange={(e) => setRequestAccessMessage(e.target.value.slice(0, 500))}
                  placeholder={bi('رسالة قصيرة (اختياري)', 'Short message (optional)')} rows={2} dir="auto" />
                <div className="flex items-center justify-end">
                  <Button size="sm" variant="outline"
                    disabled={!user || requestAccessQuery.trim().length < 2 || requestAccessSubmitting}
                    onClick={async () => {
                      if (!user) return;
                      setRequestAccessSubmitting(true);
                      try {
                        const q = requestAccessQuery.trim();
                        const looksLikeRef = /^(ENT|BIZ)-/i.test(q);
                        let targetBusinessId: string | null = null;
                        if (looksLikeRef) {
                          const { data } = await getBusinessIdByRefOrLegacyRef({ reference: q });
                          targetBusinessId = (data as { id?: string } | null)?.id ?? null;
                        }
                        const { data, error } = await createEntityAccessRequest({
                          requesterUserId: user.id, targetBusinessId,
                          targetRef: targetBusinessId ? null : q,
                          message: requestAccessMessage.trim() || null,
                        });
                        if (error) throw error;
                        if (data?.ref_id) {
                          setRequestAccessSubmittedRef(data.ref_id);
                          toast.success(bi('تم إرسال طلب الانضمام', 'Access request sent'));
                        }
                      } catch (err) {
                        toast.error(err instanceof Error && err.message ? err.message
                          : (bi('تعذّر إرسال الطلب', 'Could not send the request')));
                      } finally { setRequestAccessSubmitting(false); }
                    }}>
                    {requestAccessSubmitting ? <Loader2 className="w-3 h-3 animate-spin" />
                      : (bi('إرسال الطلب', 'Send request'))}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ──────────────────────── ACCOUNT-TYPE (legacy) ────────────────────────
  if (step === 'account-type') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl text-foreground">{bi('مرحباً بك في قِطاعات', 'Welcome to Qitaat')}</h2>
            <p className="text-sm text-muted-foreground">{bi('اختر نوع حسابك للمتابعة', 'Choose your account type to continue')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => { setAccountType('individual'); setStep('details'); }}
              className="p-6 rounded-xl border-2 border-border hover:border-gold/50 transition-all text-center group">
              <User className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">{bi('مستخدم عادي', 'Regular User')}</h3>
            </button>
            <button onClick={() => { setAccountType('business'); setStep('business-details'); }}
              className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 hover:border-gold transition-all text-center group">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gold group-hover:scale-110 transition-transform" />
              <h3 className="font-heading font-bold text-lg">{bi('منشأة / شركة', 'Business / Entity')}</h3>
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ─────────────────────────── BUSINESS DETAILS (NEW) ───────────────────────────
  if (step === 'business-details') {
    const crValid = !crNumber || /^[0-9]{10}$/.test(crNumber);
    const unifiedValid = /^7[0-9]{9}$/.test(unifiedNumber);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail);
    const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
    const allValid =
      !!businessName.trim() && !!businessNameEn.trim() && !!usernameOk &&
      unifiedValid && emailValid && !!regionId && crValid &&
      // Phase 13.c — taxonomy is primary when loaded; legacy sectors are
      // accepted as a fallback (or when taxonomy failed/still loading) so
      // we never harden users out of registration.
      // Phase 2.1 — Taxonomy-only UI. When taxonomy is loaded, require
      // entity type + primary activity. When taxonomy is loading/failed we
      // never block the user (legacy SectorPicker is no longer shown).
      (taxonomyStatus === 'ok'
        ? (!!taxonomy.entityTypeCategoryId && taxonomy.primaryActivityCategoryIds.length > 0)
        : true);

    const onContinue = () => {
      if (!allValid) {
        toast.error(bi('يرجى إكمال الحقول المطلوبة بشكل صحيح', 'Please complete required fields correctly'));
        return;
      }
      setStep('details');
    };

    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-gold/10 border border-emerald-500/20">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {bi('بيانات المنشأة', 'Business Information')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {bi('الخطوة 1 من 3 — سجّل بيانات منشأتك قبل تسجيل مدير الحساب', 'Step 1 of 3 — register business data before the account manager')}
            </p>
            <Progress value={completionPct} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1" data-testid="onboarding-review-note">
              {bi('بعد إكمال البيانات، يراجع فريق قطاعات المنشأة قبل الظهور العام.', 'After completing the details, the Qitaat team reviews the business before public visibility.')}
            </p>
          </div>

          <div className="space-y-5">
            {/* Name AR/EN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {bi('الاسم كما في السجل التجاري (عربي)', 'Name as in CR (Arabic)')}
                  <span className="text-destructive ms-1">*</span>
                </Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  dir="rtl" lang="ar" placeholder="مثال: شركة الواجهات الحديثة" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {bi('الاسم كما في السجل التجاري (إنجليزي)', 'Name as in CR (English)')}
                  <span className="text-destructive ms-1">*</span>
                </Label>
                <Input value={businessNameEn} onChange={(e) => setBusinessNameEn(e.target.value)}
                  dir="ltr" lang="en" placeholder="e.g. Modern Facades Co." />
              </div>
            </div>

            <UsernamePicker isRTL={isRTL} required
              label={bi('اسم المستخدم (رابط الملف العام)', 'Username (public profile URL)')}
              value={username} onChange={setUsername}
              onValidChange={(s) => setUsernameOk(s.isValid && s.isAvailable)}
              excludeUserId={user?.id ?? null} placeholder="my-business" />

            {/* Unified number + email + region grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {bi('الرقم الموحد للمنشأة (700)', 'Unified Entity Number (700)')}
                  <span className="text-destructive ms-1">*</span>
                </Label>
                <Input value={unifiedNumber}
                  onChange={(e) => setUnifiedNumber(onlyDigits(e.target.value, 10))}
                  inputMode="numeric" pattern="[0-9]*" placeholder="7XXXXXXXXX" dir="ltr" maxLength={10}
                  className={`tech-content ${unifiedNumber && !unifiedValid ? 'border-destructive' : ''}`} />
                <p className={`text-[11px] ${unifiedNumber && !unifiedValid ? 'text-destructive' : 'text-muted-foreground'} tech-content`}>
                  {bi('10 أرقام تبدأ بـ 7', '10 digits starting with 7')} ({unifiedNumber.length}/10)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {bi('البريد الإلكتروني للمنشأة', 'Business Email')}
                  <span className="text-destructive ms-1">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
                  <Input value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)}
                    type="email" dir="ltr" placeholder="info@company.com" style={{ paddingInlineStart: '40px' }}
                    className={businessEmail && !emailValid ? 'border-destructive' : ''} />
                </div>
              </div>
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                {bi('المنطقة', 'Region')} <span className="text-destructive ms-1">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute top-3 text-muted-foreground w-4 h-4 pointer-events-none z-10" style={{ insetInlineStart: '12px' }} />
                <select value={regionId} onChange={(e) => setRegionId(e.target.value as SaRegionId)}
                  className="flex h-12 w-full rounded-xl border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ paddingInlineStart: '40px', paddingInlineEnd: '12px' }}>
                  <option value="">{bi('— اختر المنطقة —', '— Select region —')}</option>
                  {SA_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>{bi(r.name_ar, r.name_en)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CR number (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                {bi('رقم السجل التجاري', 'Commercial Registration (CR)')}
                <span className="text-muted-foreground ms-1">({bi('اختياري', 'optional')})</span>
              </Label>
              <Input value={crNumber} onChange={(e) => setCrNumber(onlyDigits(e.target.value, 10))}
                inputMode="numeric" pattern="[0-9]*" placeholder="1010XXXXXX" dir="ltr" maxLength={10}
                className={`tech-content ${crNumber && !crValid ? 'border-destructive' : ''}`} />
              <p className={`text-[11px] ${crNumber && !crValid ? 'text-destructive' : 'text-muted-foreground'} tech-content`}>
                {bi('10 أرقام — أرقام فقط', '10 digits — numbers only')} ({crNumber.length}/10)
              </p>
            </div>

            {/* Phase 13.c — central taxonomy is the primary classification UI. */}
            <OnboardingTaxonomyStep
              value={taxonomy}
              onChange={setTaxonomy}
              onLoadStatusChange={setTaxonomyStatus}
            />

            {/* Phase 2.1 — Taxonomy-only UI. Legacy SectorPicker is no longer
                shown to users in either branch. If the taxonomy fails to load,
                we show a soft notice and let the user continue and update later.
                The legacy `sectors` / `subServices` state is preserved as an
                internal fallback (draft restore, non-blocking persistence). */}
            {taxonomyStatus !== 'ok' && taxonomyStatus !== 'loading' && (
              <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">
                  {bi('تعذّر تحميل التصنيفات الحديثة. يمكنك إكمال التسجيل وتحديث التصنيف لاحقًا من لوحة التحكم.', 'Could not load the latest classifications. You can complete registration and update them later from your dashboard.')}
                </p>
              </div>
            )}

            <Button onClick={onContinue} disabled={!allValid || loading}
              className="w-full" variant="hero">
              {bi('متابعة لتسجيل مدير الحساب', 'Continue to account manager')}
              <ArrowRight className={`w-4 h-4 ms-1 ${bi('rotate-180', '')}`} />
            </Button>
          </div>

          <button onClick={() => setStep('intent')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {bi('→', '←')} {bi('رجوع', 'Back')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ─────────────────────── DETAILS (account manager) ───────────────────────
  if (step === 'details') {
    const onNext = () => {
      if (!fullName.trim()) {
        toast.error(bi('يرجى إدخال اسم مدير الحساب', 'Please enter the account manager name'));
        return;
      }
      if (accountType === 'business' && (!phone || phone.length < 7)) {
        toast.error(bi('رقم جوال مدير الحساب مطلوب', 'Account manager phone is required'));
        return;
      }
      if (phone && phone.length >= 7) setStep('phone-verify');
      else void completeOnboarding();
    };
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/10 to-emerald-500/10 border border-gold/20">
              <User className="w-6 h-6 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {accountType === 'business'
                ? (bi('مدير الحساب', 'Account Manager'))
                : (bi('أكمل بياناتك', 'Complete your profile'))}
            </h2>
            {accountType === 'business' && (
              <p className="text-xs text-muted-foreground">
                {bi('الخطوة 2 من 3 — مسؤول المنشأة الرئيسي', 'Step 2 of 3 — primary entity manager')}
              </p>
            )}
            <Progress value={completionPct} className="h-1.5" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{bi('الاسم الكامل', 'Full Name')} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder={bi('أدخل اسمك الكامل', 'Enter your full name')}
                  style={{ paddingInlineStart: '40px' }} />
              </div>
            </div>
            <PhoneInput phone={phone} countryCode={countryCode}
              onPhoneChange={setPhone} onCountryCodeChange={setCountryCode}
              isRTL={isRTL} optional={accountType !== 'business'} />
            <Button onClick={onNext} disabled={!fullName.trim() || loading}
              className="w-full" variant="hero">
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {bi('متابعة', 'Continue')}
            </Button>
          </div>
          <button onClick={() => setStep(accountType === 'business' ? 'business-details' : 'intent')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {bi('→', '←')} {bi('رجوع', 'Back')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ────────────────────────── PHONE VERIFY ──────────────────────────
  if (step === 'phone-verify') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
              <Phone className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {bi('التحقق من رقم الجوال', 'Verify Phone Number')}
            </h2>
            <p className="text-sm text-muted-foreground tech-content">
              {bi(`سنرسل رمز تحقق إلى ${countryCode}${phone}`, `We'll send a verification code to ${countryCode}${phone}`)}
            </p>
          </div>
          {!otp.otpStep ? (
            <div className="space-y-4">
              <Button onClick={handlePhoneSend} disabled={otp.loading} className="w-full" variant="hero">
                {otp.loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {bi('إرسال رمز التحقق', 'Send Verification Code')}
              </Button>
              {accountType !== 'business' && (
                <Button onClick={handleSkipPhone} variant="ghost" className="w-full text-muted-foreground">
                  {bi('تخطي التحقق الآن', 'Skip verification for now')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {otp.demoOtp && (
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{bi('رمز تجريبي', 'Demo code')}</p>
                  <p className="font-mono text-2xl font-bold text-gold tracking-widest">{otp.demoOtp}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>{bi('رمز التحقق', 'Verification Code')}</Label>
                <Input value={otp.otpCode} onChange={(e) => otp.setCode(e.target.value)}
                  placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono"
                  dir="ltr" maxLength={6} />
              </div>
              <Button onClick={handlePhoneVerify} disabled={otp.loading || otp.otpCode.length !== 6}
                className="w-full" variant="hero">
                {otp.loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Check className="w-4 h-4 me-2" />}
                {bi('تحقق', 'Verify')}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button onClick={handlePhoneSend} disabled={otp.cooldown > 0 || otp.loading}
                  className="text-gold hover:underline disabled:text-muted-foreground">
                  {otp.cooldown > 0
                    ? `${bi('إعادة الإرسال بعد', 'Resend in')} ${otp.cooldown}${bi(' ثانية', 's')}`
                    : (bi('إعادة إرسال الرمز', 'Resend code'))}
                </button>
              </div>
            </div>
          )}
          <button onClick={() => { setStep('details'); otp.resetOtp(); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {bi('→', '←')} {bi('رجوع', 'Back')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ─────────────────────────── DOCUMENTS (NEW) ───────────────────────────
  if (step === 'documents') {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-gold/10 border border-emerald-500/20">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {bi('مستندات التوثيق', 'Verification Documents')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {bi('الخطوة 3 من 3 — يمكنك تخطي هذه الخطوة وإضافة المستندات لاحقاً', 'Step 3 of 3 — you can skip and add documents later')}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {bi('رفع المستندات يزيد ثقة العملاء ويسرّع اعتماد منشأتك من فريق المراجعة.', 'Uploading documents builds client trust and speeds up the review team approval.')}
            </p>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              {bi('لوجو / شعار المنشأة', 'Business Logo')}
              <span className="text-muted-foreground ms-1">({bi('اختياري', 'optional')})</span>
            </Label>
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png"
              onChange={handleLogoFileChange} className="hidden" />
            {logoUrl ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={logoUrl} alt="logo"
                    className="w-14 h-14 rounded-lg object-cover border border-border/60 shrink-0" loading="lazy" decoding="async"/>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {bi('تم رفع الشعار', 'Logo uploaded')}
                    </p>
                    <button type="button" onClick={() => logoInputRef.current?.click()}
                      className="text-[11px] text-emerald-600 hover:underline">
                      {bi('تغيير الصورة', 'Change image')}
                    </button>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setLogoUrl('')}
                  aria-label={bi('حذف', 'Remove')}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading || !createdBusinessId}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 transition-all p-6 flex flex-col items-center justify-center gap-2 disabled:opacity-50">
                {logoUploading
                  ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  : <Upload className="w-6 h-6 text-muted-foreground" />}
                <p className="text-sm font-medium text-foreground">
                  {logoUploading ? (bi('جاري الرفع...', 'Uploading…'))
                                : (bi('اضغط لرفع الشعار', 'Click to upload logo'))}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {bi('JPEG / PNG — حد أقصى 4 ميجا', 'JPEG / PNG — max 4 MB')}
                </p>
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">
              {bi('الصيغ المسموحة: JPEG، PNG — حد أقصى 4 ميجا.', 'Allowed formats: JPEG, PNG — max 4 MB.')}
            </p>
          </div>

          {/* CR document upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              {bi('صورة السجل التجاري', 'Commercial Registration Scan')}
              <span className="text-muted-foreground ms-1">({bi('اختياري', 'optional')})</span>
            </Label>
            <input ref={crInputRef} type="file" accept="image/jpeg,image/png,application/pdf"
              onChange={handleCrFileChange} className="hidden" />
            {crDocPath ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{crDocName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {bi('تم الرفع بنجاح', 'Uploaded successfully')}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost"
                  onClick={() => { setCrDocPath(''); setCrDocName(''); }}
                  aria-label={bi('حذف', 'Remove')}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => crInputRef.current?.click()}
                disabled={crUploading || !createdBusinessId}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 transition-all p-6 flex flex-col items-center justify-center gap-2 disabled:opacity-50">
                {crUploading
                  ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  : <Upload className="w-6 h-6 text-muted-foreground" />}
                <p className="text-sm font-medium text-foreground">
                  {crUploading ? (bi('جاري الرفع...', 'Uploading…'))
                              : (bi('اضغط لرفع الملف', 'Click to upload'))}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {bi('JPEG / PNG / PDF — حد أقصى 4 ميجا', 'JPEG / PNG / PDF — max 4 MB')}
                </p>
              </button>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => finalizeDocuments({ skip: true })}
              disabled={loading} className="text-muted-foreground">
              {bi('تخطي الآن', 'Skip for now')}
            </Button>
            <Button variant="hero" onClick={() => finalizeDocuments()}
              disabled={loading} className="sm:w-64">
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {bi('حفظ ومتابعة', 'Save and continue')}
              <ArrowRight className={`w-4 h-4 ms-1 ${bi('rotate-180', '')}`} />
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ─────────────────────────── SUMMARY ───────────────────────────
  if (step === 'summary') {
    const missing: { ar: string; en: string }[] = [];
    if (sectors.length === 0) missing.push({ ar: 'القطاعات', en: 'Sectors' });
    if (!phone) missing.push({ ar: 'رقم التواصل', en: 'Phone' });
    if (!logoUrl) missing.push({ ar: 'الشعار', en: 'Logo' });
    if (!crDocPath) missing.push({ ar: 'السجل التجاري', en: 'CR scan' });
    const readyToSubmit = completionPct >= 60 && missing.length <= 2;
    const Arrow = bi(ArrowLeft, ArrowRight);

    return (
      <AuthLayout>
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground">
              {bi('تم حفظ بيانات منشأتك', 'Your business profile is saved')}
            </h2>
            {accountType === 'business' && (
              <div className="flex justify-center" data-feature="entity-verification-badge">
                <EntityVerificationStatusBadge
                  approvalStatus={createdEntityStatus?.approvalStatus ?? 'draft'}
                  isVerified={createdEntityStatus?.isVerified ?? false} />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {bi('يمكنك إكمال أي بيانات ناقصة من لوحة التحكم ثم إرسال الملف للمراجعة.', 'You can complete remaining fields from the dashboard and submit your profile for review.')}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{bi('نسبة الإكمال', 'Completion')}</span>
              <span className="tech-content font-bold text-foreground">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2" />
            {missing.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {bi('بيانات يُنصح بإكمالها:', 'Recommended to complete:')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((m) => (
                    <span key={m.en} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[11px]">
                      <AlertCircle className="w-3 h-3 text-warning" />{bi(m.ar, m.en)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => navigate('/dashboard/business-edit')} className="text-sm">
              {bi('إكمال البيانات الآن', 'Complete fields now')}
            </Button>
            <Button variant="hero" className="sm:w-72"
              onClick={() => navigate(readyToSubmit ? '/dashboard#provider-readiness' : '/dashboard')}>
              {readyToSubmit ? (bi('الانتقال للمراجعة', 'Go to review'))
                             : (bi('الذهاب إلى لوحة التحكم', 'Go to dashboard'))}
              <Arrow className="w-4 h-4 ms-1" />
            </Button>
          </div>

          {/* SERVICE-ACTIVATION-GOVERNANCE-4 — services handoff copy */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs text-foreground/80 flex-1">
              {bi('يمكنك إدارة خدماتك لاحقًا من صفحة إدارة الخدمات، وتفعيل أو إيقاف الخدمات حسب عضويتك وحالة المراجعة.', 'You can manage your services later from the Services page, activating or pausing each one based on your membership and review status.')}
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/services')}>
              {bi('إدارة الخدمات', 'Manage services')}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return null;
};

export default Onboarding;